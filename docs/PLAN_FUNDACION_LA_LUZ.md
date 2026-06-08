# Plan de desarrollo — Fundación La Luz

> Análisis de las **80 vistas** (export UXPilot) y plan de todo lo que falta para llevar el
> proyecto actual al producto completo de **Fundación La Luz** (rehabilitación, adicciones y
> salud mental). Documento de planeación; las decisiones marcadas con ⚠️ requieren tu confirmación.

## 0. Hallazgo importante (decisión de marca/alcance)

Las 80 vistas son de **"Fundación La Luz"**, NO de "BienestAPP / Nueva EPS". Difieren en:
- **Marca/identidad:** logo "sol" en gradiente **índigo `#6366F1` → violeta `#8B5CF6`** (acento rosa `#EC4899`), tipografías **Inter + Poppins** (Playfair/serif + dorado solo en Comunidad). Es distinta a "El Hilo" (índigo/coral/salvia, Fraunces) que aplicamos.
- **Dominio:** centro de rehabilitación con **"internos"** (pacientes en proceso), **acompañantes/buddy**, **gestión de medicación y adherencia**, **comunidad**, **PQRS**, todo enmarcado en una fundación con sedes.

👉 **Decisión requerida (ver §7):** ¿pivotamos este proyecto a *Fundación La Luz* (nueva marca + dominio rehab), conservamos *El Hilo* tomando solo la estructura/funcionalidad de estas vistas, o es un producto separado?

---

## 1. El producto objetivo

### Roles
| Rol | Plataforma | Resumen |
|-----|-----------|---------|
| **Afiliado / Interno** | Móvil (principal) + web | Paciente en proceso. Diario, check-in, hábitos, metas, medicación, comunidad, IA "Lito", SOS. |
| **Acompañante / Buddy** | Móvil | Par que sigue a un grupo de internos: casos, alertas, perfil del interno, medicación. |
| **Psicólogo / Profesional** | Web | Dashboard clínico, alertas de riesgo, seguimiento, nutrición. |
| **Director / Fundación** | Web | KPIs institucionales, sedes, adherencia, reportes, gestión. |
| **Admin TI** | Web | Roles/permisos, módulos, logs, seguridad, configuración. |

### Módulos (con su nº de vistas)
Onboarding/Auth (3) · Dashboard afiliado (móvil+web) · Check-in emocional (2) · Diario + reflexión IA (3) · Hábitos: **Sueño, Hidratación, Actividad** (3) · Nutrición (2) · Metas (2) · Progreso/Bienestar (4) · Logros/gamificación · Chat IA "Lito" + mensajería (4) · Compañero/mascota · **Emergencia/SOS** (2) · **Medicación/Adherencia (15)** · Seguimiento clínico/Buddy (10) · Gestión de usuarios + cargue masivo (7) · Dashboards institucionales (2) · **Comunidad editorial (6)** · Encuestas/Quices + interpretación IA (5) · PQRS (2) · Auditoría · Admin TI · Configuración.

---

## 2. Estado actual (reutilizable)

Ya construido y desplegado (BienestAPP / El Hilo):
- ✅ **Backend NestJS + Prisma + Supabase + DeepSeek**, desplegado en Vercel con auto-deploy.
- ✅ **Auth + RBAC** (7 roles), auditoría, **AI Orchestrator** con guardrails, clasificación de riesgo, **protocolo de crisis** y registro de decisiones.
- ✅ **SOS + call center** (cola priorizada, casos, escalamiento).
- ✅ **Diario** (texto/foto/audio+transcripción, análisis de sentimiento/riesgo, mensaje motivacional IA).
- ✅ **Asistente IA** multimodal y contextual, con **tema emocional**, **historial** y **conversaciones temporales**.
- ✅ **Mood, hábitos (rachas), mascota, logros, dashboard, food (IA), exercise, tests, content (biblioteca), storage (Supabase, URLs firmadas)**.
- ✅ Panel web (staff + entorno afiliado) y landing, responsive con menú inferior.

**Mapa de reutilización hacia La Luz:**
| La Luz necesita | Tenemos | Acción |
|---|---|---|
| Check-in emocional | Mood | Renombrar/UX dedicada |
| Diario + reflexión IA | Journal + IA | ✓ casi listo |
| Chat IA "Lito" | Asistente IA | Renombrar a Lito + onboarding compañero |
| SOS / contención | Emergency + crisis | ✓ |
| Hábitos genéricos | Habits/Exercise | Especializar Sueño/Hidratación/Actividad |
| Biblioteca | Content | Ampliar a Comunidad editorial |
| Tests | WellnessTest/TestResult | Ampliar a constructor de encuestas/quices |
| Dashboard | Dashboard | Adaptar a "interno" + versión clínica |
| Gestión usuarios/auditoría | Admin/Audit | Ampliar (cargue masivo, detalle) |

---

## 3. Análisis de brecha — qué falta (net-new)

### 3.1 Modelo de datos nuevo (Prisma)
- **Organization/Sede** (multi-sede de la fundación) + relación de usuarios a sede.
- **Roles nuevos:** `INMATE` (interno) / reusar AFFILIATE, `BUDDY` (acompañante), `DIRECTOR`, `IT_ADMIN`. Asignación **Buddy ↔ grupo de internos**.
- **Goal** (metas: título, tipo, frecuencia, plazo, progreso, estado).
- **Medication** (catálogo) · **MedicationPlan** (interno) · **MedicationItem** (dosis, vía, horarios) · **MedicationIntake** (toma: tomada/omitida/tarde) · cálculo de **adherencia** · **MedicationAlert**.
- **CommunityContent** (tipo: artículo/biblioteca/audio/voz/galería/video-tendencia/post) · interacciones (like/comentario) — con moderación.
- **Survey/Quiz** (constructor: secciones, preguntas tipadas) · **SurveyResponse** · **Interpretation** (reglas IA) — evolución de WellnessTest.
- **Pqrs** (tipo P/Q/R/S, estado, asignación, respuesta).
- **Hábitos especializados:** SleepLog, HydrationLog (extensión de ExerciseLog o tablas propias).
- **ClinicalNote / FollowUp** (notas de seguimiento del buddy/psicólogo) · **Alert** (riesgo) ya parcialmente cubierto por RiskAssessment.

### 3.2 Backend (módulos/endpoints nuevos)
goals · medications (catálogo, plan, intake, adherencia, alertas) · community · surveys (builder + responder + interpret) · pqrs · sedes/organizations · users (cargue masivo CSV + validación + detalle) · buddy (casos, perfil interno, notas) · director-metrics · sleep/hydration.

### 3.3 Frontend
- **App móvil del afiliado/interno completa** (hoy es web; las vistas son móviles): onboarding, dashboard, check-in, diario, hábitos (sueño/hidratación/actividad), metas, progreso, logros, medicación, chat Lito, comunidad, perfil, SOS. → Decidir **Expo (nativo)** vs **web móvil (PWA)**.
- **App móvil del Buddy:** casos, perfil del interno por pestañas, alertas, medicación.
- **Web psicólogo:** dashboard clínico, nutrición, seguimiento, detalle de alerta.
- **Web director/admin:** dashboards institucionales por sede, gestión usuarios (individual+masivo), encuestas/quices builder, interpretación, PQRS, auditoría, config institucional, Admin TI (roles/permisos/módulos).
- **Comunidad editorial** (sub-marca serif + dorado): biblioteca, audio/voz, galería, tendencias, feed.

### 3.4 Sistema de diseño objetivo (tokens La Luz)
```
primary #6366F1 · secondary #8B5CF6 · accent #EC4899 · calm #A5B4FC
soft #C7D2FE · light #E0E7FF · bg #F8FAFC · text #334155
estados: crisis #DC2626 · alerta #F59E0B · éxito #10B981
fuentes: Inter (UI) + Poppins (títulos)
Comunidad (sub-marca): deep-blue #1a365d · gold #d4af37 · serif (Playfair)
radios: 2xl/3xl · botón CTA gradiente primary→secondary, rounded-full
logo: sol en círculo gradiente índigo→violeta + wordmark "La Luz"
```

---

## 4. Roadmap por fases

**Fase 0 — Fundamentos (1)** *(rápida, desbloquea todo)*
- Consolidar **design system La Luz** (tokens + Inter/Poppins + logo sol) en landing y panel.
- Roles nuevos (BUDDY, DIRECTOR, IT_ADMIN) + entidad Sede + usuarios demo por rol.

**Fase 1 — Afiliado/Interno core (móvil)**
- Onboarding (bienvenida + elegir compañero "Lito"), dashboard interno, check-in emocional, diario (ya), metas, progreso, logros, hábitos (sueño/hidratación/actividad), perfil, SOS. Renombrar asistente → **Lito**.

**Fase 2 — Medicación y adherencia** *(el módulo más grande)*
- Catálogo, plan por interno, tomas/recordatorios (afiliado), asignar/editar (profesional), adherencia, alertas, historial, config.

**Fase 3 — Clínico / Buddy**
- App buddy (casos, perfil del interno por pestañas, alertas, medicación). Web psicólogo (dashboard clínico, nutrición, seguimiento, detalle de alerta, dashboard interpretado con IA).

**Fase 4 — Institucional / Admin**
- Dashboards director por sede + reportes. Gestión usuarios (individual + **cargue masivo** con previsualización). PQRS (crear + gestionar). Auditoría. Admin TI (roles/permisos/módulos). Config institucional.

**Fase 5 — Encuestas / Quices**
- Constructor de encuestas y quices, responder, **interpretación con IA**, integración al dashboard interpretado.

**Fase 6 — Comunidad editorial**
- Biblioteca terapéutica, acompañamiento en voz, galería "Momentos de Luz", "En Tendencia" (video), feed comunidad, "Escucha y Contesta". Sub-marca editorial + moderación.

---

## 5. Decisiones de plataforma
- ⚠️ **Móvil del afiliado:** ¿**Expo (nativo, tiendas)** o **PWA/web móvil**? Las vistas son móviles; hoy el afiliado vive en web. Recomiendo **PWA** primero (rápido, un solo código con el panel) y Expo después.
- ⚠️ **Comunidad:** ¿sub-marca editorial (serif/dorado) o unificar a La Luz?
- ⚠️ **Variantes duplicadas** (medicación/historial tienen 2 versiones): elegir la definitiva al implementar.

---

## 6. Esfuerzo aproximado
Producto completo (80 vistas, 5 roles, ~25 módulos) = trabajo grande, por fases. Cada fase es entregable y desplegable de forma incremental con el auto-deploy ya montado.

## 7. Lo que necesito confirmar para arrancar
1. **Marca/alcance** (la decisión clave — §0).
2. **Plataforma móvil** del afiliado (PWA vs Expo).
3. **Por dónde empezar** (recomiendo Fase 0 + Fase 1).
