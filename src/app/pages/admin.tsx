import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import {
  Heart, LogOut, Plus, ArrowLeft, Copy, MessageCircle, ExternalLink,
  Clock, ClipboardList, Calendar, MapPin, User, Check, Search,
  ChevronRight, Zap, AlertCircle, Loader2, Trash2, Phone, FileText
} from 'lucide-react';
import { apiRequest, getAdminToken, clearAdminToken } from '../api';
import { toast } from 'sonner';

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return `${day} ${MONTHS_ES[m - 1]} ${y}`;
}
function fmtDateShort(d: string) {
  if (!d) return '—';
  const [, m, day] = d.split('-').map(Number);
  return `${day} ${MONTHS_ES[m - 1]}`;
}

/** Parse schedule like "8:00 - 14:00" and return hours per day */
function parseHoursPerDay(schedule: string): number | null {
  if (!schedule) return null;
  // "8:00 - 14:00", "08:00–14:00", "8:30 - 16:30"
  const withMinutes = schedule.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (withMinutes) {
    const start = parseInt(withMinutes[1]) + parseInt(withMinutes[2]) / 60;
    const end = parseInt(withMinutes[3]) + parseInt(withMinutes[4]) / 60;
    return end > start ? end - start : 24 - start + end;
  }
  // "8 - 14", "08-14"
  const hoursOnly = schedule.match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})/);
  if (hoursOnly) {
    const start = parseInt(hoursOnly[1]);
    const end = parseInt(hoursOnly[2]);
    return end > start ? end - start : 24 - start + end;
  }
  return null;
}

/** Map Spanish day names to JS getDay() values (0=Sun..6=Sat) */
const DAY_MAP: Record<string, number> = {
  domingo: 0, dom: 0, do: 0, d: 0,
  lunes: 1, lun: 1, lu: 1, l: 1,
  martes: 2, mar: 2, ma: 2, m: 2,
  'miércoles': 3, miercoles: 3, 'mié': 3, mie: 3, mi: 3, x: 3,
  jueves: 4, jue: 4, ju: 4, j: 4,
  viernes: 5, vie: 5, vi: 5, v: 5,
  'sábado': 6, sabado: 6, 'sáb': 6, sab: 6, s: 6,
};

const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

function dayRange(from: number, to: number): number[] {
  const result: number[] = [];
  let d = from;
  for (;;) {
    result.push(d);
    if (d === to) break;
    d = (d + 1) % 7;
  }
  return result;
}

/** Parse natural-language days string into JS getDay() values */
function parseWorkDays(days: string): number[] | null {
  if (!days) return null;
  const lower = days.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // "todos los dias", "todos los días", "diario", "7 dias"
  if (/todos\s+los\s+dias|diario|7\s*dias|cada\s+dia/.test(lower)) return ALL_WEEK;
  // "entre semana", "dias de semana", "dias habiles", "dias laborales"
  if (/entre\s+semana|dias?\s+de\s+semana|dias?\s+habiles|dias?\s+laborales/.test(lower)) return WEEKDAYS;
  // "fines de semana", "fin de semana"
  if (/fines?\s+de\s+semana/.test(lower)) return WEEKENDS;

  // Range: "lunes a viernes", "de lunes a viernes", "L a V", "L-V"
  const rangeMatch = lower.match(/^(?:de\s+)?([a-z]+)\s*(?:a|-|–|—)\s*([a-z]+)$/);
  if (rangeMatch) {
    const from = DAY_MAP[rangeMatch[1]];
    const to = DAY_MAP[rangeMatch[2]];
    if (from != null && to != null) return dayRange(from, to);
  }

  // List: "lunes, miercoles, viernes" or "lunes, miercoles y viernes"
  const parts = lower.split(/[,;]+|\s+y\s+/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 0) {
    const mapped = parts.map(p => DAY_MAP[p]);
    if (mapped.every(v => v != null)) return mapped as number[];
  }

  return null;
}

/** Calculate total assigned hours based on schedule, days, and date range */
function calcAssignedHours(startDate: string, endDate: string, schedule: string, days: string): number | null {
  const hpd = parseHoursPerDay(schedule);
  const workDays = parseWorkDays(days);
  if (hpd == null || workDays == null || !startDate || !endDate) return null;

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (workDays.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.round(count * hpd * 10) / 10;
}

// ─── Admin Layout ────────────────────────────────────────────────────────────

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getAdminToken()) navigate('/login', { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    clearAdminToken();
    navigate('/login', { replace: true });
  };

  if (!getAdminToken()) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="CareTracker" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-slate-900 text-sm">CareTracker</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="bg-teal-100 text-teal-700 text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
              <span className="text-sm font-medium text-slate-700">Marcus Milton</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

interface Service {
  id: string;
  patientName: string;
  caregiverName: string;
  startDate: string;
  endDate: string;
  district: string;
  days: string;
  schedule: string;
  shiftCount: number;
  totalHours: number;
  createdAt: string;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'remaining'>('all');

  const filteredServices = services.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches = s.patientName.toLowerCase().includes(q)
        || s.caregiverName.toLowerCase().includes(q)
        || s.district?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filter !== 'all') {
      const assigned = calcAssignedHours(s.startDate, s.endDate, s.schedule, s.days);
      if (assigned == null) return filter === 'remaining';
      const remaining = Math.max(0, assigned - s.totalHours);
      if (filter === 'completed') return remaining <= 0;
      if (filter === 'remaining') return remaining > 0;
    }
    return true;
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/services', {}, getAdminToken()!) as Service[];
      setServices(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este servicio? Se borrarán también todas sus guardias.')) return;
    setDeletingId(id);
    try {
      await apiRequest(`/services/${id}`, { method: 'DELETE' }, getAdminToken()!);
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('Servicio eliminado');
    } catch (err) {
      toast.error(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestiona todos tus servicios de cuidado</p>
        </div>
        <button
          onClick={() => navigate('/service/new')}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo servicio</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Services list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 space-y-3">
          <h2 className="font-semibold text-slate-800">Servicios registrados</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por paciente, cuidador o distrito..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todos
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${filter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => setFilter('completed')}
            >
              Completados
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${filter === 'remaining' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => setFilter('remaining')}
            >
              Faltantes
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 px-6 py-8 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-slate-400" />
            </div>
            <p className="font-medium text-slate-600 mb-1">Sin servicios aún</p>
            <p className="text-slate-400 text-sm mb-6">Crea el primer servicio para comenzar</p>
            <button
              onClick={() => navigate('/service/new')}
              className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Crear servicio
            </button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No se encontraron servicios con ese filtro</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredServices.map(s => (
              <div
                key={s.id}
                onClick={() => navigate(`/service/${s.id}`)}
                className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{s.patientName}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">
                    Cuidador: {s.caregiverName} · {fmtDateShort(s.startDate)} – {fmtDateShort(s.endDate)}
                  </p>
                  {(() => {
                    const assigned = calcAssignedHours(s.startDate, s.endDate, s.schedule, s.days);
                    if (assigned == null) return null;
                    const remaining = Math.max(0, Math.round((assigned - s.totalHours) * 10) / 10);
                    return (
                      <p className="text-xs mt-0.5 text-slate-400">
                        Tiene <span className="font-medium text-slate-600">{assigned}h</span> asignadas
                        {remaining > 0
                          ? <> · faltan <span className="font-medium text-amber-600">{remaining}h</span></>
                          : <> · <span className="font-medium text-emerald-600">completadas</span></>}
                      </p>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800">{s.totalHours}h</p>
                    <p className="text-xs text-slate-400">{s.shiftCount} guardia{s.shiftCount !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    disabled={deletingId === s.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Eliminar servicio"
                  >
                    {deletingId === s.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
    </AdminLayout>
  );
}


// ─── New Service ─────────────────────────────────────────────────────────────

export function ServiceNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    patientName: '', district: '', address: '', patientPhone: '',
    caregiverName: '', caregiverPhone: '', startDate: '', endDate: '',
    days: '', schedule: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const autofill = () => {
    setForm({
      patientName: 'Carlos Reyes',
      district: 'Surco',
      address: 'Av. Caminos del Inca 350',
      patientPhone: '+51 888 888 888',
      caregiverName: 'Victor Stone',
      caregiverPhone: '+51 999 999 999',
      startDate: '2026-03-10',
      endDate: '2026-03-31',
      days: 'Lunes a Viernes',
      schedule: '8:00 - 14:00',
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const service = await apiRequest('/services', {
        method: 'POST',
        body: JSON.stringify(form),
      }, getAdminToken()!) as { id: string };
      navigate(`/service/${service.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Back */}
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Nuevo servicio</h1>
        <button
          type="button"
          onClick={autofill}
          className="flex items-center gap-1.5 text-sm border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Datos de prueba
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient info */}
        <FormSection title="Información del paciente o familiar">
          <FormField label="Nombre del paciente o familiar" required>
            <input value={form.patientName} onChange={e => set('patientName', e.target.value)}
              placeholder="Carlos Reyes" className={inputCls} required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Distrito" required>
              <input value={form.district} onChange={e => set('district', e.target.value)}
                placeholder="Surco" className={inputCls} required />
            </FormField>
            <FormField label="Dirección">
              <input value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="Av. Caminos del Inca" className={inputCls} />
            </FormField>
          </div>
          <FormField label="Celular del paciente o familiar">
            <input value={form.patientPhone} onChange={e => set('patientPhone', e.target.value)}
              placeholder="+51 888 888 888" className={inputCls} type="tel" />
          </FormField>
        </FormSection>

        {/* Caregiver info */}
        <FormSection title="Cuidador asignado">
          <FormField label="Nombre del cuidador" required>
            <input value={form.caregiverName} onChange={e => set('caregiverName', e.target.value)}
              placeholder="Victor Stone" className={inputCls} required />
          </FormField>
          <FormField label="Celular del cuidador">
            <input value={form.caregiverPhone} onChange={e => set('caregiverPhone', e.target.value)}
              placeholder="+51 999 999 999" className={inputCls} type="tel" />
          </FormField>
        </FormSection>

        {/* Schedule */}
        <FormSection title="Horario del servicio">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fecha inicio" required>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                className={inputCls} required />
            </FormField>
            <FormField label="Fecha fin" required>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)}
                className={inputCls} required />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Días de trabajo">
              <input value={form.days} onChange={e => set('days', e.target.value)}
                placeholder="Lunes a Viernes" className={inputCls} />
            </FormField>
            <FormField label="Horario">
              <input value={form.schedule} onChange={e => set('schedule', e.target.value)}
                placeholder="8:00 - 14:00" className={inputCls} />
            </FormField>
          </div>
        </FormSection>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium py-3 px-4 rounded-xl transition-colors cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {loading ? 'Creando servicio...' : 'Crear servicio'}
        </button>
      </form>
    </main>
    </AdminLayout>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm";

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Service Detail ──────────────────────────────────────────────────────────

interface Shift {
  id: string;
  date: string;
  hours: number;
  report: string;
  createdAt: string;
  evidenceUrl?: string;
  evidenceFileName?: string;
  evidenceFileType?: string;
}

interface ServiceDetail extends Service {
  address: string;
  caregiverToken: string;
  familyToken: string;
  days: string;
  schedule: string;
  shifts: Shift[];
  caregiverPhone: string;
  patientPhone: string;
}

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiRequest(`/services/${id}`, {}, getAdminToken()!) as ServiceDetail;
        setService(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const origin = (import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin;

  const copy = (text: string, key: string) => {
    try {
      // Fallback for environments where Clipboard API is blocked
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(key);
      toast.success('¡Copiado al portapapeles!');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('No se pudo copiar. Selecciona el link manualmente.');
    }
  };

  const shareWhatsApp = (phone: string, text: string) => {
    const digits = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return (
    <AdminLayout>
    <main className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-center min-h-[300px]">
      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
    </main>
    </AdminLayout>
  );

  if (error || !service) return (
    <AdminLayout>
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
        {error || 'Servicio no encontrado'}
      </div>
    </main>
    </AdminLayout>
  );

  const caregiverLink = `${origin}/#/shifts/${service.caregiverToken}`;
  const familyLink = `${origin}/#/patient/${service.familyToken}`;
  const totalHours = service.shifts.reduce((s, sh) => s + sh.hours, 0);
  const assignedHours = calcAssignedHours(service.startDate, service.endDate, service.schedule, service.days);

  return (
    <AdminLayout>
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al dashboard
      </Link>

      {/* Service info */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{service.patientName}</h1>
            <p className="text-slate-500 text-sm mt-0.5">Servicio de cuidado</p>
          </div>
          {assignedHours != null && (
            <p className="text-xs text-slate-500">
              Tiene <span className="font-semibold text-slate-700">{assignedHours}h</span> asignadas
              {(() => {
                const remaining = Math.max(0, Math.round((assignedHours - totalHours) * 10) / 10);
                return remaining > 0
                  ? <> · faltan <span className="font-semibold text-amber-600">{remaining}h</span></>
                  : <> · <span className="font-semibold text-emerald-600">completadas</span></>;
              })()}
            </p>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <InfoItem icon={<User className="w-4 h-4" />} label="Cuidador" value={service.caregiverName} />
            <InfoItem icon={<Phone className="w-4 h-4" />} label="Cel. cuidador" value={service.caregiverPhone || '—'} />
            <InfoItem icon={<Phone className="w-4 h-4" />} label="Cel. paciente" value={service.patientPhone || '—'} />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <InfoItem icon={<Calendar className="w-4 h-4" />} label="Inicio" value={fmtDate(service.startDate)} />
            <InfoItem icon={<Calendar className="w-4 h-4" />} label="Fin" value={fmtDate(service.endDate)} />
            <InfoItem icon={<Clock className="w-4 h-4" />} label="Horas asignadas" value={assignedHours != null ? `${assignedHours}h` : '—'} />
          </div>
          {(service.days || service.schedule || service.address) && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              {service.days && <InfoItem icon={<ClipboardList className="w-4 h-4" />} label="Días" value={service.days} />}
              {service.schedule && <InfoItem icon={<Clock className="w-4 h-4" />} label="Horario" value={service.schedule} />}
              {service.address && <InfoItem icon={<MapPin className="w-4 h-4" />} label="Dirección" value={`${service.address}${service.district ? `, ${service.district}` : ''}`} />}
            </div>
          )}
        </div>
      </div>

      {/* Generated links */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Links generados</h2>
        <p className="text-slate-500 text-sm mb-5">Comparte estos links por WhatsApp con el cuidador y el familiar</p>
        <div className="space-y-4">
          <LinkRow
            label="Link del cuidador"
            sublabel="Para que el cuidador registre sus guardias"
            color="teal"
            link={caregiverLink}
            isCopied={copied === 'caregiver'}
            onCopy={() => copy(caregiverLink, 'caregiver')}
            onView={() => window.open(`/#/shifts/${service.caregiverToken}`, '_blank')}
            onWhatsApp={() => shareWhatsApp(service.caregiverPhone, `Hola! Usa este link para registrar tus guardias:\n${caregiverLink}`)}
          />
          <LinkRow
            label="Link del familiar o paciente"
            sublabel="Para que el familiar o paciente vea los informes"
            color="violet"
            link={familyLink}
            isCopied={copied === 'family'}
            onCopy={() => copy(familyLink, 'family')}
            onView={() => window.open(`/#/patient/${service.familyToken}`, '_blank')}
            onWhatsApp={() => shareWhatsApp(service.patientPhone, `Hola! Usa este link para ver los informes de cuidado:\n${familyLink}`)}
          />
        </div>
      </div>

      {/* Shifts summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            Guardias registradas
            <span className="ml-2 text-slate-400 font-normal text-sm">({service.shifts.length})</span>
          </h2>
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            {totalHours}h totales
          </div>
        </div>

        {service.shifts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Aún no se han registrado guardias
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {service.shifts.map(shift => (
              <div key={shift.id} className="px-6 py-4 flex items-start gap-4">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{fmtDate(shift.date)}</span>
                    <span className="bg-teal-50 text-teal-700 border border-teal-100 text-xs px-2 py-0.5 rounded-full">
                      {shift.hours}h
                    </span>
                  </div>
                  {shift.report && <p className="text-slate-600 text-sm mt-1">{shift.report}</p>}
                  {shift.evidenceUrl && (
                    <div className="mt-2">
                      {shift.evidenceFileType?.startsWith('image/') ? (
                        <a href={shift.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                          <img
                            src={shift.evidenceUrl}
                            alt={shift.evidenceFileName || 'Evidencia'}
                            className="max-h-40 rounded-lg border border-slate-200 object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={shift.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 hover:bg-teal-100 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {shift.evidenceFileName || 'Ver archivo'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
    </AdminLayout>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-0.5">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function LinkRow({ label, sublabel, color, link, isCopied, onCopy, onView, onWhatsApp }: {
  label: string; sublabel: string; color: 'teal' | 'violet';
  link: string; isCopied: boolean; onCopy: () => void; onView: () => void; onWhatsApp: () => void;
}) {
  const bg = color === 'teal' ? 'bg-teal-50' : 'bg-violet-50';
  const text = color === 'teal' ? 'text-teal-700' : 'text-violet-700';
  const border = color === 'teal' ? 'border-teal-200' : 'border-violet-200';
  return (
    <div className={`${bg} rounded-xl border ${border} p-4`}>
      <p className={`font-medium text-sm ${text}`}>{label}</p>
      <p className="text-slate-500 text-xs mt-0.5 mb-3">{sublabel}</p>
      <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2 mb-3">
        <span className="text-xs text-slate-600 truncate flex-1 font-mono">{link}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
        >
          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {isCopied ? 'Copiado' : 'Copiar'}
        </button>
        <button
          onClick={onView}
          className="flex items-center gap-1.5 text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Ver formulario
        </button>
        <button
          onClick={onWhatsApp}
          className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
        >
          <MessageCircle className="w-3.5 h-3.5" /> Enviar por WhatsApp
        </button>
      </div>
    </div>
  );
}