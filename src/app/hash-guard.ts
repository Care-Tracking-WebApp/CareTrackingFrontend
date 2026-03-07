/**
 * hash-guard.ts
 *
 * Captura el hash original de la URL en el momento más temprano posible
 * (evaluación del módulo) y lo persiste en sessionStorage.
 *
 * Esto soluciona un problema con el hosting de Figma Sites: en la primera
 * visita, algún mecanismo (redirect HTTP, service worker o script propio
 * del hosting) puede limpiar o modificar window.location.hash ANTES de que
 * React y el router monten, causando que el catch-all redirija a /login.
 *
 * Flujo:
 *  1. Al evaluarse este módulo, se guarda el hash en sessionStorage.
 *  2. Cuando SafeRedirectToLogin o LoginPage montan, llaman a
 *     consumePendingPublicRoute() para recuperar la ruta original.
 *  3. Si era una ruta pública (/shifts/:token o /patient/:token),
 *     se navega ahí en lugar de al login.
 *  4. El valor se consume (elimina) para no redirigir en bucle.
 */

const SESSION_KEY = '__caretracker_initial_hash';
const PUBLIC_ROUTE_RE = /^\/(shifts|patient)\/.+/;

// ── Captura inmediata al evaluar el módulo ──────────────────────────────
const capturedHash = window.location.hash.replace(/^#/, '') || '/';

if (PUBLIC_ROUTE_RE.test(capturedHash)) {
  try {
    sessionStorage.setItem(SESSION_KEY, capturedHash);
  } catch {
    // sessionStorage no disponible (modo privado en algunos browsers)
  }
}

/**
 * Devuelve la ruta pública pendiente (si la hay) y la consume.
 * Llamar solo una vez por ciclo de montaje.
 */
export function consumePendingPublicRoute(): string | null {
  // 1. Revisar el hash actual (puede que el router no lo haya leído)
  const currentHash = window.location.hash.replace(/^#/, '') || '/';
  if (PUBLIC_ROUTE_RE.test(currentHash)) {
    clearSaved();
    return currentHash;
  }

  // 2. Revisar el hash capturado al importar el módulo
  if (PUBLIC_ROUTE_RE.test(capturedHash)) {
    clearSaved();
    return capturedHash;
  }

  // 3. Revisar sessionStorage (persiste entre micro-navigaciones)
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && PUBLIC_ROUTE_RE.test(saved)) {
      clearSaved();
      return saved;
    }
  } catch {
    // ignorar
  }

  return null;
}

function clearSaved() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignorar
  }
}
