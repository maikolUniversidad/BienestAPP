# Arquitectura técnica — BienestAPP

## 1. Visión general

Arquitectura modular en capas, orientada a un **backend monolítico modular** (NestJS) que
puede evolucionar a microservicios. Clientes multiplataforma consumen una API REST/JSON.
Toda interacción con LLMs pasa **obligatoriamente** por el **AI Orchestrator**, que aplica
guardrails, clasificación de riesgo y trazabilidad antes y después de llamar al modelo.

```
┌──────────────┐   ┌──────────────┐   ┌───────────────────┐
│  App Móvil   │   │  Web Admin   │   │ Panel Call Center │
│ (Expo / RN)  │   │  (Next.js)   │   │   (Next.js)       │
└──────┬───────┘   └──────┬───────┘   └─────────┬─────────┘
       │ HTTPS/JWT        │                     │
       └──────────────────┼─────────────────────┘
                          ▼
              ┌────────────────────────┐
              │     API Gateway        │  (Nginx / Cloud LB + WAF + rate limit)
              └───────────┬────────────┘
                          ▼
        ┌─────────────────────────────────────┐
        │        Backend NestJS               │
        │  Auth · RBAC · Audit interceptor    │
        │ ┌─────────────────────────────────┐ │
        │ │ Módulos de dominio              │ │
        │ │ users · profile · consent ·     │ │
        │ │ mood · journal · habits · pet · │ │
        │ │ achievements · tests · content  │ │
        │ │ emergency(SOS) · callcenter ·   │ │
        │ │ admin · notifications · audit   │ │
        │ └─────────────────────────────────┘ │
        │ ┌─────────────────────────────────┐ │
        │ │   AI Orchestrator (capa única)  │ │
        │ │  guardrails · risk classifier · │ │
        │ │  prompt registry · validators · │ │
        │ │  escalation · decision log      │ │
        │ └───────────────┬─────────────────┘ │
        └─────────┬───────┼───────────┬───────┘
                  ▼       ▼           ▼
        ┌──────────┐ ┌─────────┐ ┌──────────────┐
        │PostgreSQL│ │  Redis  │ │ Object Store │
        │ (Prisma) │ │ BullMQ  │ │ (S3 / MinIO) │
        └──────────┘ └─────────┘ └──────────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  LLM Provider(s) │  (vía AI Gateway, ZDR, fallback)
                 └──────────────────┘
```

## 2. Principios

1. **Seguridad primero en salud mental.** Ningún flujo de IA esquiva el orquestador.
2. **Separación de datos.** Esquemas/columnas separados para datos clínicos, emocionales y operativos.
3. **Privacidad por diseño.** Minimización, consentimiento granular, anonimización para reportes.
4. **Trazabilidad total.** Toda decisión de IA y todo acceso sensible quedan auditados.
5. **Degradación segura.** Si el LLM falla, los flujos críticos (SOS, detección de riesgo) usan reglas determinísticas de respaldo.

## 3. Backend (NestJS)

- **Patrón:** módulos por dominio, cada uno con `controller / service / dto / entity (Prisma)`.
- **Transversal (`common/`):** guards (JWT, Roles), interceptors (Audit, Logging), filters de excepción, pipes de validación (`class-validator`), decoradores (`@CurrentUser`, `@Roles`, `@Public`).
- **AI module:** `AiOrchestratorService` es el único punto de contacto con el proveedor LLM. Subcomponentes: `GuardrailsService`, `RiskClassifierService`, `PromptRegistry`, `ResponseValidatorService`, `EscalationService`, `AiDecisionLogService`.
- **Colas (BullMQ/Redis):** procesamiento asíncrono de análisis de sentimiento, análisis de comida por imagen, resúmenes semanales, notificaciones, escalamientos.

## 4. Clientes

- **Móvil (Expo/RN):** navegación por tabs (Dashboard, Diario, Hábitos, Mascota, Perfil) + botón SOS flotante global. State con Zustand + React Query. Almacenamiento seguro con `expo-secure-store`.
- **Web admin / call center (Next.js):** App Router, RSC para listados, componentes cliente para tiempo real. Cola de casos del call center con priorización por riesgo (polling/WebSocket).

## 5. Seguridad y cumplimiento

| Requisito | Implementación |
|-----------|----------------|
| Cifrado en tránsito | TLS 1.2+ obligatorio en gateway |
| Cifrado en reposo | Cifrado a nivel de disco + cifrado de columnas sensibles (pgcrypto / envelope encryption) |
| Consentimiento informado | Entidad `Consent` versionada; gating de funciones por consentimiento |
| RBAC | `@Roles()` + `RolesGuard`; permisos finos en `Permission` |
| Auditoría | `AuditInterceptor` → `AuditLog` para todo acceso a datos sensibles |
| Anonimización | Vistas/reportes agregados; sin PII en analítica |
| Habeas Data (Co.) | Derechos ARCO, finalidad declarada, autorización explícita para IA |
| No entrenar con datos sensibles | Flag `allowModelTraining=false` por defecto; ZDR con el proveedor |
| Separación de datos | Esquemas `clinical`, `emotional`, `operational` (lógicos en MVP, físicos en v3) |
| FHIR/HL7 | Capa de mapeo `interop/` aislada (fase 3) |

## 6. Roles (RBAC)

`AFFILIATE`, `CALLCENTER_OPERATOR`, `PSYCHOLOGIST`, `PHYSICIAN`, `EPS_ADMIN`,
`SUPERADMIN`, `AUDITOR`. La matriz de permisos vive en seed (`Role` ↔ `Permission`).

## 7. Observabilidad

- Logs estructurados JSON (pino) con `requestId` y `userId` (hasheado en logs).
- Métricas (Prometheus): latencia, tasa de escalamientos, casos SOS abiertos, errores LLM.
- Alertas: pico de eventos de riesgo, cola de call center saturada, fallo de LLM.
- Auditoría inmutable (append-only) de accesos a historiales.

## 8. Despliegue

- Dev: `docker-compose` (Postgres, Redis, MinIO, backend, web).
- Prod: contenedores en Kubernetes / Cloud Run. Migraciones Prisma en pipeline CI/CD.
- Secretos en gestor dedicado (no en repos). Variables por entorno.
