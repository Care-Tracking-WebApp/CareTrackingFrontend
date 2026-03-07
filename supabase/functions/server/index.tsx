// @ts-nocheck — Deno Edge Function; npm: specifiers and Deno globals are resolved at deploy time.
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const EVIDENCE_BUCKET = "make-14216ce3-evidence";

// Idempotently create evidence bucket on startup
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === EVIDENCE_BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(EVIDENCE_BUCKET, { public: false });
      console.log(`Bucket ${EVIDENCE_BUCKET} creado`);
    }
  } catch (e) {
    console.log("Error creando bucket:", e);
  }
})();

const app = new Hono();
app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-Admin-Token"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const ADMIN_EMAIL = "marcus@care-tracker-nocountry.vercel.app";
const ADMIN_PASSWORD = "admin123";

async function verifyAdmin(c: any): Promise<boolean> {
  const token = c.req.header("X-Admin-Token");
  if (!token) return false;
  try {
    const session = await kv.get(`session:${token}`);
    if (!session) return false;
    return Date.now() < (session as any).expires;
  } catch {
    return false;
  }
}

// Helper: extract serviceId safely from stored value (object or string fallback)
function extractServiceId(val: any): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (typeof val === "object" && val.serviceId) return val.serviceId;
  return null;
}

// Helper: generate signed URLs for shifts with evidence
async function enrichShiftsWithSignedUrls(shifts: any[]): Promise<any[]> {
  return Promise.all(shifts.map(async (shift: any) => {
    if (!shift.evidencePath) return shift;
    try {
      const { data } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .createSignedUrl(shift.evidencePath, 3600); // 1 hour
      return { ...shift, evidenceUrl: data?.signedUrl || "" };
    } catch {
      return shift;
    }
  }));
}

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/make-server-14216ce3/health", (c) => c.json({ status: "ok" }));

// ─── Admin login ─────────────────────────────────────────────────────────────
app.post("/make-server-14216ce3/admin/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return c.json({ error: "Credenciales inválidas" }, 401);
    }
    const token = crypto.randomUUID();
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await kv.set(`session:${token}`, { token, expires });
    return c.json({ token, name: "Marcus Milton", email: ADMIN_EMAIL });
  } catch (e) {
    console.log("Error en login:", e);
    return c.json({ error: `Error al iniciar sesión: ${e}` }, 500);
  }
});

// ─── List services (admin) ───────────────────────────────────────────────────
app.get("/make-server-14216ce3/services", async (c) => {
  if (!(await verifyAdmin(c))) {
    return c.json({ error: "No autorizado" }, 401);
  }
  try {
    const allEntries = await kv.getByPrefix("service:");
    const services = allEntries
      .filter((s: any) => s && s.id && s.patientName)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const servicesWithStats = await Promise.all(services.map(async (service: any) => {
      const shifts = await kv.getByPrefix(`shift:${service.id}:`);
      const valid = shifts.filter((s: any) => s && s.id);
      const totalHours = valid.reduce((sum: number, s: any) => sum + Number(s.hours || 0), 0);
      return { ...service, shiftCount: valid.length, totalHours };
    }));

    return c.json(servicesWithStats);
  } catch (e) {
    console.log("Error listando servicios:", e);
    return c.json({ error: `Error al listar servicios: ${e}` }, 500);
  }
});

// ─── Create service (admin) ──────────────────────────────────────────────────
app.post("/make-server-14216ce3/services", async (c) => {
  if (!(await verifyAdmin(c))) {
    return c.json({ error: "No autorizado" }, 401);
  }
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const caregiverToken = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    const familyToken = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

    const service = {
      id,
      patientName: body.patientName,
      district: body.district,
      address: body.address || "",
      patientPhone: body.patientPhone || "",
      caregiverName: body.caregiverName,
      caregiverPhone: body.caregiverPhone || "",
      startDate: body.startDate,
      endDate: body.endDate,
      days: body.days || "",
      schedule: body.schedule || "",
      caregiverToken,
      familyToken,
      createdAt: new Date().toISOString(),
    };

    // Store the service object
    await kv.set(`service:${id}`, service);

    // Store token → serviceId mappings as objects (safe JSON serialization)
    await kv.set(`caregiver_token:${caregiverToken}`, { serviceId: id });
    await kv.set(`family_token:${familyToken}`, { serviceId: id });

    console.log(`Servicio creado: ${id}, caregiverToken: ${caregiverToken}, familyToken: ${familyToken}`);
    return c.json(service, 201);
  } catch (e) {
    console.log("Error creando servicio:", e);
    return c.json({ error: `Error al crear servicio: ${e}` }, 500);
  }
});

// ─── Delete service (admin) ──────────────────────────────────────────────────
app.delete("/make-server-14216ce3/services/:id", async (c) => {
  if (!(await verifyAdmin(c))) {
    return c.json({ error: "No autorizado" }, 401);
  }
  try {
    const id = c.req.param("id");
    const service = await kv.get(`service:${id}`) as any;
    if (!service) return c.json({ error: "Servicio no encontrado" }, 404);

    // Delete token mappings
    if (service.caregiverToken) await kv.del(`caregiver_token:${service.caregiverToken}`);
    if (service.familyToken)    await kv.del(`family_token:${service.familyToken}`);

    // Delete all shifts for this service
    const shifts = await kv.getByPrefix(`shift:${id}:`);
    await Promise.all(shifts.map((s: any) => s?.id ? kv.del(`shift:${id}:${s.id}`) : null));

    // Delete the service itself
    await kv.del(`service:${id}`);
    console.log(`Servicio eliminado: ${id}`);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error eliminando servicio:", e);
    return c.json({ error: `Error al eliminar servicio: ${e}` }, 500);
  }
});

// ─── Get service detail (admin) ──────────────────────────────────────────────
app.get("/make-server-14216ce3/services/:id", async (c) => {
  if (!(await verifyAdmin(c))) {
    return c.json({ error: "No autorizado" }, 401);
  }
  try {
    const id = c.req.param("id");
    const service = await kv.get(`service:${id}`);
    if (!service) return c.json({ error: "Servicio no encontrado" }, 404);

    const shifts = await kv.getByPrefix(`shift:${id}:`);
    const validShifts = shifts
      .filter((s: any) => s && s.id)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const enrichedShifts = await enrichShiftsWithSignedUrls(validShifts);
    return c.json({ ...(service as object), shifts: enrichedShifts });
  } catch (e) {
    console.log("Error obteniendo servicio:", e);
    return c.json({ error: `Error al obtener servicio: ${e}` }, 500);
  }
});

// ─── Caregiver view (public, token-based) ────────────────────────────────────
app.get("/make-server-14216ce3/caregiver/:token", async (c) => {
  try {
    const token = c.req.param("token");
    console.log(`Buscando caregiver_token:${token}`);

    const tokenData = await kv.get(`caregiver_token:${token}`);
    console.log(`tokenData:`, JSON.stringify(tokenData));

    const serviceId = extractServiceId(tokenData);
    if (!serviceId) return c.json({ error: "Link inválido o expirado" }, 404);

    const service = await kv.get(`service:${serviceId}`);
    if (!service) return c.json({ error: "Servicio no encontrado" }, 404);

    const shifts = await kv.getByPrefix(`shift:${serviceId}:`);
    const validShifts = shifts
      .filter((s: any) => s && s.id)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const { patientName, caregiverName, startDate, endDate, days, schedule, address, district, patientPhone } = service as any;
    const enrichedShifts = await enrichShiftsWithSignedUrls(validShifts);
    return c.json({ serviceId, patientName, caregiverName, startDate, endDate, days, schedule, address, district, patientPhone, shifts: enrichedShifts });
  } catch (e) {
    console.log("Error info cuidador:", e);
    return c.json({ error: `Error al obtener información del cuidador: ${e}` }, 500);
  }
});

// ─── Upload evidence file (caregiver, token-based) ───────────────────────────
app.post("/make-server-14216ce3/upload-evidence", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const caregiverToken = formData.get("caregiverToken") as string | null;

    if (!file || !caregiverToken) {
      return c.json({ error: "Faltan archivo o token" }, 400);
    }

    // Verify token
    const tokenData = await kv.get(`caregiver_token:${caregiverToken}`);
    const serviceId = extractServiceId(tokenData);
    if (!serviceId) return c.json({ error: "Link inválido o expirado" }, 404);

    // Generate unique path
    const ext = file.name.split(".").pop() || "bin";
    const filePath = `${serviceId}/${crypto.randomUUID()}.${ext}`;

    // Read file as ArrayBuffer and upload
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.log("Error subiendo archivo:", uploadError);
      return c.json({ error: `Error al subir archivo: ${uploadError.message}` }, 500);
    }

    console.log(`Evidencia subida: ${filePath}`);
    return c.json({ filePath, fileName: file.name, fileType: file.type });
  } catch (e) {
    console.log("Error en upload-evidence:", e);
    return c.json({ error: `Error al subir evidencia: ${e}` }, 500);
  }
});

// ─── Register shift (caregiver, token-based) ─────────────────────────────────
app.post("/make-server-14216ce3/shifts", async (c) => {
  try {
    const body = await c.req.json();
    const { caregiverToken, date, hours, report, evidencePath, evidenceFileName, evidenceFileType } = body;

    if (!caregiverToken || !date || !hours) {
      return c.json({ error: "Faltan campos requeridos: fecha, horas" }, 400);
    }

    const tokenData = await kv.get(`caregiver_token:${caregiverToken}`);
    const serviceId = extractServiceId(tokenData);
    if (!serviceId) return c.json({ error: "Link inválido o expirado" }, 404);

    const shiftId = crypto.randomUUID();
    const shift = {
      id: shiftId,
      serviceId,
      date,
      hours: Number(hours),
      report: report || "",
      evidencePath: evidencePath || "",
      evidenceFileName: evidenceFileName || "",
      evidenceFileType: evidenceFileType || "",
      createdAt: new Date().toISOString(),
    };

    await kv.set(`shift:${serviceId}:${shiftId}`, shift);
    console.log(`Guardia registrada: shift:${serviceId}:${shiftId}`);
    return c.json(shift, 201);
  } catch (e) {
    console.log("Error registrando guardia:", e);
    return c.json({ error: `Error al registrar guardia: ${e}` }, 500);
  }
});

// ─── Family view (public, token-based) ───────────────────────────────────────
app.get("/make-server-14216ce3/family/:token", async (c) => {
  try {
    const token = c.req.param("token");
    console.log(`Buscando family_token:${token}`);

    const tokenData = await kv.get(`family_token:${token}`);
    console.log(`tokenData:`, JSON.stringify(tokenData));

    const serviceId = extractServiceId(tokenData);
    if (!serviceId) return c.json({ error: "Link inválido o expirado" }, 404);

    const service = await kv.get(`service:${serviceId}`);
    if (!service) return c.json({ error: "Servicio no encontrado" }, 404);

    const shifts = await kv.getByPrefix(`shift:${serviceId}:`);
    const validShifts = shifts
      .filter((s: any) => s && s.id)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const { patientName, caregiverName, startDate, endDate, district, address, caregiverPhone } = service as any;
    const enrichedShifts = await enrichShiftsWithSignedUrls(validShifts);
    return c.json({ patientName, caregiverName, startDate, endDate, district, address, caregiverPhone, shifts: enrichedShifts });
  } catch (e) {
    console.log("Error info familiar:", e);
    return c.json({ error: `Error al obtener información del familiar: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);