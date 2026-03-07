// IMPORTANTE: hash-guard.ts DEBE importarse antes que cualquier otra cosa
// para que capture window.location.hash lo más temprano posible.
import { consumePendingPublicRoute } from "./hash-guard";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { LoginPage } from "./pages/auth";
import { AdminDashboard, ServiceNew, ServiceDetail } from "./pages/admin";
import { CaregiverView } from "./pages/caregiver";
import { FamilyView } from "./pages/family";
import { Loader2 } from "lucide-react";

// Wrappers que leen el token de los params de React Router
function CaregiverPage() {
  const { token } = useParams<{ token: string }>();
  return <CaregiverView token={token!} />;
}

function FamilyPage() {
  const { token } = useParams<{ token: string }>();
  return <FamilyView token={token!} />;
}

/**
 * Redirect seguro para "/" y "*".
 *
 * En lugar de usar <Navigate to="/login"> (que se ejecuta síncronamente
 * durante el render), usamos un componente con useEffect que:
 *   1. Comprueba si hay una ruta pública pendiente (hash-guard)
 *   2. Si la hay, navega ahí en lugar de /login
 *   3. Si no, navega a /login
 */
function SafeRedirectToLogin() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const pendingRoute = consumePendingPublicRoute();
    if (pendingRoute) {
      // Redirigir a la ruta pública que se perdió
      navigate(pendingRoute, { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
    setChecked(true);
  }, [navigate]);

  if (checked) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
    </div>
  );
}

// Definición de rutas para createHashRouter.
// Las rutas públicas van PRIMERO para que tengan prioridad en el matching.
export const routeDefinitions = [
  // ── Rutas públicas (sin autenticación) ────────────────────────────────
  { path: "/shifts/:token",  Component: CaregiverPage  },
  { path: "/patient/:token", Component: FamilyPage     },
  // ── Auth ──────────────────────────────────────────────────────────────
  { path: "/login",          Component: LoginPage       },
  // ── Admin (auth guard en AdminLayout) ─────────────────────────────────
  { path: "/dashboard",      Component: AdminDashboard  },
  { path: "/service/new",    Component: ServiceNew      },
  { path: "/service/:id",    Component: ServiceDetail   },
  // ── Root y catch-all ──────────────────────────────────────────────────
  { path: "/",               Component: SafeRedirectToLogin },
  { path: "*",               Component: SafeRedirectToLogin },
];
