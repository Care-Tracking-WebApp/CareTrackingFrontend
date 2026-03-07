# CareTracker — Frontend

Proyecto demo desarrollado para **No Country** — Simulación **S02-26**, Equipo 10 (Web App Development).

CareTracker es una aplicación web para la gestión y seguimiento de servicios de cuidado domiciliario. Permite a un administrador crear servicios, asignar cuidadores y generar links compartibles para que cuidadores registren sus guardias y familiares consulten informes.

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel (CDN)                       │
│               Frontend — React SPA (hash)               │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTPS + Bearer token (anon key)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 Supabase Edge Function                   │
│         API REST (Hono) — Deno runtime serverless        │
│                                                         │
│  /admin/login    /services    /shifts    /caregiver/:t  │
│  /family/:t      /upload-evidence                       │
└────────┬──────────────────────────────┬─────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐         ┌────────────────────┐
│  Supabase DB     │         │  Supabase Storage  │
│  (PostgreSQL)    │         │  (bucket privado)  │
│                  │         │                    │
│  kv_store table  │         │  Evidencia foto-   │
│  (key → JSONB)   │         │  gráfica de        │
│                  │         │  guardias           │
└──────────────────┘         └────────────────────┘
```

La aplicación sigue una arquitectura **serverless** con separación clara entre frontend y backend:

- **Frontend (SPA)** — Aplicación React de una sola página desplegada como archivos estáticos en Vercel. Usa `HashRouter` para la navegación del lado del cliente. Toda la lógica de UI vive aquí; no hay server-side rendering.
- **Backend (Edge Function)** — Una única Supabase Edge Function escrita con Hono (framework HTTP para Deno). Expone una API REST que maneja autenticación del admin, CRUD de servicios, registro de guardias y subida de evidencia. Corre en el edge runtime de Supabase (Deno Deploy).
- **Base de datos** — PostgreSQL gestionado por Supabase. Se utiliza una tabla `kv_store` como almacén clave-valor genérico (key TEXT → value JSONB) para servicios, turnos y sesiones.
- **Almacenamiento** — Supabase Storage con un bucket privado para las fotos de evidencia subidas por los cuidadores. Se generan URLs firmadas temporales para visualización.
- **Autenticación** — Sistema simple basado en tokens. El admin se autentica con email/contraseña, recibe un token UUID que se almacena en localStorage y se envía como header `X-Admin-Token`. Los cuidadores y familiares acceden sin login mediante tokens únicos en la URL.

## Stack tecnológico

- **React 18** + **TypeScript**
- **Vite** como bundler
- **Tailwind CSS v4** para estilos
- **React Router v7** para navegación (hash-based)
- **Supabase** como backend (Edge Functions + Storage + KV Store)
- **Vercel** para el despliegue del frontend

## Requisitos previos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Variables de entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto en Supabase (Project Settings > General) |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anon de Supabase (Project Settings > API) |
| `VITE_SUPABASE_FUNCTION_SLUG` | Slug de la Edge Function (segmento después de `/functions/v1/`) |
| `VITE_SITE_URL` | URL pública del frontend para generar links compartibles |

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:5173` |
| `npm run build` | Genera la build de producción en `dist/` |
| `npm run lint` | Ejecuta ESLint sobre el proyecto |

## Estructura del proyecto

```
src/
├── main.tsx              # Punto de entrada
├── app/
│   ├── App.tsx           # Componente raíz con router
│   ├── api.ts            # Cliente HTTP hacia Supabase Edge Functions
│   ├── routes.tsx         # Definición de rutas
│   └── pages/
│       ├── admin.tsx      # Dashboard, crear servicio y detalle (admin)
│       ├── auth.tsx       # Login del administrador
│       ├── caregiver.tsx  # Vista del cuidador (registro de guardias)
│       └── family.tsx     # Vista del familiar (consulta de informes)
├── styles/               # CSS global y tema
utils/
└── supabase/
    └── info.tsx          # Configuración de Supabase (lee de .env)
supabase/
└── functions/server/
    ├── index.tsx         # Edge Function principal (API REST)
    └── kv_store.tsx      # Interfaz KV sobre tabla de Supabase
```

## Roles de usuario

- **Administrador** — Inicia sesión, crea/elimina servicios, genera links y consulta guardias.
- **Cuidador** — Accede por link compartido. Registra guardias con fecha, horas, reporte y evidencia fotográfica.
- **Familiar/Paciente** — Accede por link compartido. Consulta el historial de guardias y reportes.
