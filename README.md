# CareTracker — Frontend

Proyecto demo desarrollado para **No Country** — Simulación **S02-26**, Equipo 10 (Web App Development).

CareTracker es una aplicación web para la gestión y seguimiento de servicios de cuidado domiciliario. Permite a un administrador crear servicios, asignar cuidadores y generar links compartibles para que cuidadores registren sus guardias y familiares consulten informes.

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
