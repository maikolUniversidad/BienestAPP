# Flujos de usuario y emergencia — BienestAPP

## 1. Onboarding / registro

```
Descarga → Registro (datos básicos) → Verificación → Consentimiento informado (versionado)
   → Preferencias de bienestar → Contactos de emergencia (opcional) → Permisos (ubicación,
   notificaciones, IA) → Dashboard
```
Gating: funciones de IA y SOS-con-ubicación solo se habilitan tras consentimiento explícito.

## 2. Uso diario (afiliado)

```
Login → Dashboard
   ├─ Registrar ánimo del día (MoodEntry)
   ├─ Escribir en el diario (JournalEntry → análisis async de sentimiento + riesgo)
   ├─ Marcar hábitos (HabitLog → racha → evolución mascota → cartas/logros)
   ├─ Foto de comida (FoodLog → estimación IA)
   ├─ Actividad física / agua / sueño (ExerciseLog)
   ├─ Biblioteca: respiración, meditación, pausas activas
   └─ Chat con asistente IA (con guardrails)
```

## 3. Chat IA con guardrails (flujo normal)

```
Usuario escribe → Pre-guardrails → RiskClassifier (A: reglas, B: LLM)
   ├─ riesgo NONE/LOW/MEDIUM → prompt seguro → LLM → ResponseValidator → respuesta + log
   └─ riesgo HIGH/CRITICAL → PROTOCOLO DE CRISIS (ver §5)
```

## 4. Diario → detección de riesgo

```
JournalEntry creada → cola (BullMQ) → análisis de sentimiento + RiskClassifier
   → si HIGH/CRITICAL: crear RiskAssessment + notificar protocolo en próxima apertura +
     (según permisos) crear CallCenterCase de seguimiento → marcar para revisión humana
   → si LOW/MEDIUM: recomendaciones de autocuidado
```

## 5. Flujo de emergencia — Protocolo de crisis (CRÍTICO)

```
Disparador (chat IA, diario, test o botón SOS detecta riesgo alto)
        │
        ▼
[1] Mostrar mensaje de contención breve y empático (sin diagnóstico)
[2] Mostrar líneas de emergencia destacadas (Colombia: 123 / Línea 106)
[3] Botón "Conectar con call center" (1 toque)
[4] Crear EmergencyTicket + CallCenterCase (prioridad = nivel de riesgo)
[5] Crear RiskAssessment + AiDecisionLog (action = ESCALATED)
[6] Notificar a contactos de emergencia / equipo autorizado  (SOLO si hay consentimiento)
[7] Marcar caso para revisión humana obligatoria
        │
        ▼
Operador recibe el caso en la cola priorizada (ver §6)
```
**Degradación segura:** si el LLM está caído, la capa determinística de reglas igual activa
el protocolo y se usa el mensaje de contención de respaldo.

## 6. Flujo del botón SOS

```
Botón SOS (visible en toda la app) → Seleccionar tipo:
   [Emergencia médica] [Crisis emocional] [Accidente] [Violencia] [Otro]
        │
        ▼
¿Autorizó ubicación? → sí: adjuntar coordenadas / no: continuar sin ubicación
        │
        ▼
POST /emergency/sos → EmergencyTicket (hora, usuario, tipo, estado=NEW)
        │              + CallCenterCase (prioridad según tipo)
        ▼
Confirmación al usuario + opción "conectar ahora"  → seguimiento por operador
```

## 7. Flujo del operador de call center

```
Login operador → Cola priorizada por riesgo (CRITICAL arriba)
   → Tomar caso (status: NEW → IN_PROGRESS)
   → Ver historial del afiliado AUTORIZADO (acceso auditado)
   → Registrar llamada (call-log) + notas internas
   → Resolver:
        ├─ Escalar a psicólogo / médico / línea de emergencia (status: ESCALATED)
        └─ Cerrar caso (status: CLOSED) con desenlace
   → Toda acción queda en AuditLog
```

## 8. Flujo administrativo (Nueva EPS)

```
Login admin → Dashboard agregado (anónimo) → Indicadores de uso por módulo
   → Alertas de riesgo (solo personal autorizado, acceso auditado)
   → Gestión de contenidos / campañas / operadores
   → Reportes anónimos y agregados (sin PII)
Auditor → consulta independiente de AuditLog (solo lectura)
```
