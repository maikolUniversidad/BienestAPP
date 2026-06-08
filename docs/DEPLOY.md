# Despliegue — BienestAPP

## Arquitectura de despliegue

| Componente | Dónde | Notas |
|-----------|-------|-------|
| Backend API (NestJS) | **Vercel** (serverless / Fluid Compute) | proyecto `prj_W7Kg…` · Root Directory = `backend` |
| Base de datos | **Supabase** (PostgreSQL) | conexión pooled (6543) en runtime, directa (5432) para migraciones |
| Panel web (Next.js) | Vercel (proyecto aparte, futuro) | carpeta `web-admin` |
| App móvil (Expo) | Tiendas / build web | carpeta `mobile` — no va a Vercel |
| IA (LLM) | **DeepSeek** API | `deepseek-chat` vía capa AI Orchestrator |

## Backend en Vercel (NestJS serverless)

El backend se despliega como función serverless mediante [`backend/api/index.ts`](../backend/api/index.ts),
que cachea la app Nest entre invocaciones. [`backend/vercel.json`](../backend/vercel.json) reescribe
todas las rutas a la función.

### Configuración del proyecto Vercel
1. **Root Directory:** `backend`
2. **Build Command:** automático (`vercel-build` → `prisma generate`).
3. **Install Command:** automático (`npm install`; el `postinstall` regenera el cliente Prisma).
4. **Node.js Version:** 20 o superior.

### Variables de entorno (Vercel → Settings → Environment Variables)

```
DATABASE_URL      postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL        postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
API_PREFIX        api/v1
JWT_ACCESS_SECRET   <secreto fuerte aleatorio>
JWT_REFRESH_SECRET  <secreto fuerte aleatorio>
JWT_ACCESS_TTL    900
JWT_REFRESH_TTL   2592000
DATA_ENCRYPTION_KEY <clave de cifrado>
AI_PROVIDER       deepseek
AI_API_KEY        <DeepSeek API key>
AI_MODEL          deepseek-chat
AI_BASE_URL       https://api.deepseek.com
SUPABASE_PUBLISHABLE_KEY  <sb_publishable_...>
SUPABASE_SECRET_KEY       <sb_secret_...>   (solo backend, nunca cliente)
EMERGENCY_LINE_GENERAL        123
EMERGENCY_LINE_MENTAL_HEALTH  106
```

> ⚠️ Nunca pongas `SUPABASE_SECRET_KEY` ni `AI_API_KEY` en el frontend ni en variables `NEXT_PUBLIC_*`.

## Base de datos (Supabase)

Las migraciones NO corren en cada build de Vercel (evita problemas con entornos preview y
conexiones pooled). Se ejecutan de forma controlada una vez:

```bash
cd backend
# .env local con DATABASE_URL + DIRECT_URL de Supabase
npx prisma migrate deploy   # crea todas las tablas
npm run seed                # roles, permisos, cartas, biblioteca, test, usuarios demo
```

La cadena de conexión se obtiene en: **Supabase Dashboard → Connect → ORMs → Prisma**.

## Seguridad post-despliegue (Habeas Data)

- Rotar credenciales que se hayan compartido fuera del gestor de secretos.
- Habilitar RLS en Supabase si se expone alguna tabla vía Data API (este backend usa Prisma
  con conexión de servicio, no el Data API público).
- Revisar [AI_SAFETY.md](AI_SAFETY.md) y validar el protocolo de crisis con profesionales.
