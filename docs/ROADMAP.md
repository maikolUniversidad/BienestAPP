# Roadmap — BienestAPP

## MVP (Fase 1) — fundamentos seguros

Objetivo: producto usable con el flujo de seguridad completo.

- [x] Estructura de monorepo + documentación
- [x] Esquema de base de datos (Prisma) con todas las entidades
- [x] Backend NestJS: auth (JWT + refresh), RBAC, auditoría
- [x] AI Orchestrator: guardrails, RiskClassifier determinístico + LLM, protocolo de crisis, decision log
- [x] Módulos: perfil, consentimiento, contactos de emergencia
- [x] Diario emocional + estado de ánimo + análisis de riesgo
- [x] Chat IA seguro con guardrails
- [x] Botón SOS + EmergencyTicket
- [x] Panel básico de call center (cola priorizada, casos, notas, escalamiento)
- [x] Hábitos + rachas, mascota virtual simple, logros básicos
- [x] Dashboard de bienestar
- [x] Panel administrativo básico (métricas agregadas)
- [ ] App móvil (Expo) — pantallas MVP
- [ ] Web admin (Next.js) — pantallas MVP
- [ ] Cifrado de columnas sensibles en producción
- [ ] CI/CD + despliegue (Docker → Cloud Run/K8s)
- [ ] Validación clínica del protocolo de crisis con profesionales

## Versión 2 — riqueza funcional

- Alimentación con IA por foto (visión) end-to-end + historial nutricional
- Análisis de sentimiento avanzado y resúmenes semanales con tendencias
- Tests y evaluaciones completos (estrés, sueño, hábitos) con escalamiento
- Biblioteca de actividades con video (respiración, meditación, pausas activas)
- Gamificación avanzada: cartas coleccionables, niveles, retos grupales por empresa
- Integración con Google Fit / Apple Health / wearables
- Notificaciones push y recordatorios inteligentes
- MFA obligatorio para roles sensibles
- WebSocket en tiempo real para la cola de call center
- Reportes y dashboards administrativos avanzados (anónimos)

## Versión 3 — interoperabilidad y escala

- Interoperabilidad clínica FHIR/HL7 (módulo `interop/`)
- Separación física de esquemas clínico/emocional/operativo + cifrado por dominio
- Modelo de riesgo entrenado/calibrado (con autorización explícita y gobierno de datos)
- Multi-tenant para varias EPS/empresas
- Migración a microservicios donde la carga lo justifique
- Programa formal de auditoría y cumplimiento Habeas Data + certificaciones de salud
- Telemedicina / agenda con profesionales autorizados
- Analítica poblacional de salud preventiva (anonimizada y agregada)
```
