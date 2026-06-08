# BienestAPP — SuperApp de Bienestar Corporativo y Salud Preventiva (Nueva EPS)

Plataforma multiplataforma (iOS, Android, Web) de bienestar, salud mental, hábitos
saludables, acompañamiento preventivo, asistencia con IA segura y conexión con call center.

> ⚠️ **Aviso clínico:** Esta aplicación NO reemplaza la atención médica, psicológica ni
> los servicios de emergencia profesionales. Las funciones de IA son orientativas y de
> acompañamiento, nunca diagnósticas ni prescriptivas.

## Entornos desplegados

| Servicio | URL |
|----------|-----|
| API backend (Vercel) | https://bienest-app.vercel.app/api/v1 |
| Swagger (docs API) | https://bienest-app.vercel.app/docs |
| Base de datos | Supabase (PostgreSQL) |
| IA | DeepSeek (`deepseek-chat`) |

Auto-deploy: cada push a `main` despliega el backend (Root Directory = `backend`).

## Usuarios de prueba

Todos con contraseña **`Bienestar123`** (crear/actualizar con `npm run seed:users`):

| Correo | Rol |
|--------|-----|
| afiliado@demo.co | Afiliado |
| operador@demo.co | Operador call center |
| psicologo@demo.co | Psicólogo |
| medico@demo.co | Médico |
| admin@demo.co | Administrador EPS |
| superadmin@demo.co | Superadministrador |
| auditor@demo.co | Auditor |

- **Panel web** (call center / admin): inicia sesión con `operador@demo.co` o `admin@demo.co`.
- **App móvil** (afiliado): inicia sesión con `afiliado@demo.co`.

---

## Monorepo

```
BienestAPP/
├── docs/                 # Arquitectura, modelo de datos, APIs, flujos, IA segura, roadmap
├── backend/              # API NestJS + Prisma (PostgreSQL) + Redis  ← núcleo funcional
├── web-admin/            # Panel admin + call center (Next.js)
├── mobile/               # App afiliado (React Native / Expo)
└── infra/                # Docker Compose, despliegue
```

## Stack

| Capa | Tecnología |
|------|-----------|
| Móvil | React Native (Expo) + TypeScript |
| Web admin / call center | Next.js (App Router) + TypeScript |
| Backend | NestJS + TypeScript |
| ORM / DB | Prisma + PostgreSQL |
| Cache / colas | Redis (BullMQ) |
| Almacenamiento | S3 compatible (MinIO en dev) |
| IA | AI Orchestrator propio (LLM provider-agnóstico) con guardrails |
| Auth | JWT + OAuth2 + MFA opcional |
| Interoperabilidad | FHIR/HL7 (preparado, fase 3) |
| Infra | Docker / Kubernetes / Cloud Run |
| Observabilidad | Logs estructurados, métricas, auditoría, alertas |

## Documentación

- [Arquitectura técnica](docs/ARCHITECTURE.md)
- [Modelo de base de datos](docs/DATABASE.md)
- [APIs REST principales](docs/API.md)
- [Flujos de usuario y emergencia](docs/FLOWS.md)
- [Reglas de IA segura](docs/AI_SAFETY.md)
- [Diseño UI/UX](docs/UIUX.md)
- [Roadmap MVP / v2 / v3](docs/ROADMAP.md)

## Quick start (dev)

```bash
# 1. Infra local (Postgres + Redis + MinIO)
docker compose -f infra/docker-compose.yml up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run start:dev          # http://localhost:3000 (Swagger en /docs)

# 3. Web admin
cd ../web-admin
npm install && npm run dev # http://localhost:3001

# 4. Móvil
cd ../mobile
npm install && npx expo start
```

## Cumplimiento

Habeas Data (Ley 1581 de 2012 — Colombia), consentimiento informado, cifrado en tránsito
y reposo, control de acceso por roles, auditoría de accesos, anonimización para reportes,
separación de datos clínicos / emocionales / operativos. Ver [AI_SAFETY.md](docs/AI_SAFETY.md)
y [ARCHITECTURE.md](docs/ARCHITECTURE.md#seguridad-y-cumplimiento).
