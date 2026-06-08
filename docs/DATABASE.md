# Modelo de base de datos — BienestAPP

PostgreSQL gestionado con Prisma. Separación lógica en tres dominios de datos
(operativo, emocional, clínico) — ver columna *Dominio*. El esquema completo y ejecutable
está en [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).

## Diagrama de relaciones (resumen)

```
Organization ──< User ──1:1── AffiliateProfile
                  │             ├──< EmergencyContact
                  │             ├──< Consent
                  │             ├──< MoodEntry
                  │             ├──< JournalEntry ──1:1── RiskAssessment
                  │             ├──< AIConversation ──< AIMessage
                  │             │                   └──< AiDecisionLog
                  │             ├──< FoodLog
                  │             ├──< ExerciseLog
                  │             ├──< Habit ──< HabitLog
                  │             ├──< VirtualPet
                  │             ├──< UserAchievementCard >── AchievementCard
                  │             ├──< TestResult >── WellnessTest
                  │             └──< Notification
                  │
                  ├──< EmergencyTicket ──1:1── CallCenterCase ──< CaseNote
                  ├──< RiskAssessment
                  └──< AuditLog

User >──< Role >──< Permission   (RBAC, tablas puente)
ContentActivity   (catálogo de biblioteca)
```

## Entidades

| Entidad | Dominio | Descripción |
|---------|---------|-------------|
| `Organization` | operativo | Empresa/EPS y sus afiliados; retos grupales |
| `User` | operativo | Cuenta, credenciales, rol, estado, MFA |
| `Role` / `Permission` | operativo | RBAC (puente `RolePermission`, `UserRole`) |
| `AffiliateProfile` | operativo | Datos del afiliado, preferencias de bienestar |
| `Consent` | operativo | Consentimientos versionados (informado, IA, notificaciones, ubicación) |
| `EmergencyContact` | operativo | Contactos de emergencia del afiliado |
| `MoodEntry` | emocional | Estado emocional diario |
| `JournalEntry` | emocional | Diario privado + etiquetas + análisis de sentimiento |
| `AIConversation` / `AIMessage` | emocional | Chat con asistente IA |
| `RiskAssessment` | clínico | Evaluación de riesgo (origen: journal/chat/test/SOS) |
| `EmergencyTicket` | operativo | Ticket SOS |
| `CallCenterCase` / `CaseNote` | operativo | Caso de call center + notas internas |
| `FoodLog` | emocional/operativo | Registro de comida (IA por foto) |
| `ExerciseLog` | operativo | Actividad física, sueño, agua, pausas |
| `Habit` / `HabitLog` | operativo | Hábitos y rachas |
| `AchievementCard` / `UserAchievementCard` | operativo | Cartas/gamificación |
| `VirtualPet` | operativo | Mascota virtual y evolución |
| `WellnessTest` / `TestResult` | emocional | Tests orientativos y resultados |
| `ContentActivity` | operativo | Biblioteca de actividades |
| `Notification` | operativo | Notificaciones al usuario |
| `AuditLog` | operativo | Auditoría append-only de accesos/acciones |
| `AiDecisionLog` | clínico | Trazabilidad de decisiones de IA |

## Notas de diseño

- **Datos sensibles cifrados a nivel columna** (`JournalEntry.body`, `MoodEntry.note`,
  `AIMessage.content`): se marcan en el esquema y se cifran en la capa de servicio
  (envelope encryption) — no en texto plano.
- **Soft delete + retención**: `deletedAt` en entidades de datos personales; políticas de
  retención por dominio.
- **Anonimización**: reportes agregados consumen vistas materializadas sin PII.
- **Enums** para estados (`CaseStatus`, `RiskLevel`, `EmergencyType`, etc.) garantizan
  consistencia y facilitan auditoría.
- **`RiskAssessment` separado** del contenido emocional para permitir acceso clínico sin
  exponer el diario completo (control de acceso fino).
