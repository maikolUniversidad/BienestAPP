# Reglas de IA segura — AI Orchestrator

> Documento normativo. Todo cambio en prompts, umbrales de riesgo o protocolos de
> escalamiento requiere revisión de un profesional de salud mental autorizado.

## 1. Principios inviolables

La IA **NUNCA** debe:
- Decir o insinuar que reemplaza a un psicólogo, médico o línea de emergencia.
- Diagnosticar (ni "tienes depresión", ni "esto es un ataque de pánico clínico").
- Prescribir tratamientos, medicamentos, dosis o terapias clínicas.
- Dar consejos médicos peligrosos o instrucciones de autolesión/daño.
- Prometer confidencialidad absoluta cuando hay riesgo vital (debe explicar el protocolo).

La IA **SIEMPRE** debe:
- Usar lenguaje empático, breve, claro y no juzgador.
- Recomendar contacto humano profesional cuando hay señales de riesgo.
- Activar el protocolo de crisis ante señales de riesgo alto.
- Dejar trazabilidad de cada decisión (entrada clasificada, salida, nivel de riesgo, acción).
- Permitir revisión humana posterior.

## 2. Pipeline del orquestador

Toda llamada de IA atraviesa este pipeline **en orden**:

```
entrada del usuario
   │
   ▼
[1] Pre-guardrails        → sanitización, anti prompt-injection, PII scrubbing en logs
   │
   ▼
[2] Clasificación de riesgo (RiskClassifier)
   │   - capa A: reglas determinísticas (léxico de crisis, regex)  ← NUNCA depende del LLM
   │   - capa B: clasificador LLM (confirma/ajusta nivel)
   │   → niveles: NONE | LOW | MEDIUM | HIGH | CRITICAL
   │
   ├── HIGH / CRITICAL ──► PROTOCOLO DE CRISIS (ver §4) — corta el flujo normal
   │
   ▼
[3] Selección de prompt seguro (PromptRegistry, versionado)
   │
   ▼
[4] Llamada al LLM (con system prompt de seguridad + límites de tokens)
   │
   ▼
[5] Validación de respuesta (ResponseValidator)
   │   - bloquea diagnósticos/prescripciones/lenguaje prohibido
   │   - verifica disclaimers obligatorios
   │   - re-genera o usa respuesta segura de respaldo si falla
   │
   ▼
[6] Registro de decisión (AiDecisionLog) + entrega al usuario
```

## 3. Niveles de riesgo y léxico (capa determinística A)

| Nivel | Señales (ejemplos) | Acción |
|-------|--------------------|--------|
| CRITICAL | ideación suicida con plan/intención, autolesión en curso, violencia inminente, emergencia médica grave | Protocolo de crisis inmediato + oferta de call center + (según permisos) notificación |
| HIGH | ideación suicida sin plan, autolesión pasada reciente, abuso, pánico severo | Mensaje de contención + recomendación profesional + botón call center |
| MEDIUM | desesperanza marcada, ansiedad alta sostenida | Recomendación de autocuidado + sugerir profesional |
| LOW | estrés, tristeza, cansancio | Acompañamiento + ejercicios de la biblioteca |
| NONE | conversación neutra/positiva | Flujo normal |

El léxico de crisis y los regex viven en `backend/src/ai/risk/crisis-lexicon.ts` (es,
incluye variantes y modismos colombianos). La capa A **siempre** corre aunque el LLM esté
caído — es la red de seguridad determinística.

## 4. Protocolo de crisis (HIGH / CRITICAL)

Cuando se activa:
1. **Mensaje de contención** breve, empático, validante (≤ 3 frases). Sin diagnóstico.
2. **No** continuar conversación tipo chatbot extensa. Priorizar conexión humana.
3. **Sugerir llamar a emergencias:** línea nacional (Colombia) **Línea 106 / 123**, y
   línea de salud mental local. Mostrar números de forma destacada.
4. **Botón "Conectar con call center"** — crea `EmergencyTicket` + `CallCenterCase` con
   prioridad por nivel.
5. **Notificación según permisos:** a contactos de emergencia y/o equipo autorizado, solo
   si el usuario lo consintió previamente.
6. **Trazabilidad:** `RiskAssessment` + `AiDecisionLog` + evento de auditoría. Marcado para
   **revisión humana** obligatoria.

Mensaje de contención de respaldo (si el LLM no está disponible):
> "Lamento que estés pasando por esto. No estás solo/a. Esto es importante y mereces apoyo
> de una persona ahora mismo. Puedo conectarte con nuestro equipo de acompañamiento, o
> puedes llamar a la Línea 106 / 123. ¿Quieres que te conecte?"

## 5. System prompt base (resumen)

El asistente psicológico opera con un system prompt que incluye:
- Rol: acompañante de bienestar, **no** profesional clínico.
- Prohibiciones explícitas (§1).
- Estilo: empático, breve, en español neutro/colombiano.
- Instrucción de derivar a humano ante cualquier duda de seguridad.
- Disclaimer recurrente cuando el tema roza lo clínico.

Prompts versionados en `PromptRegistry`; cambios auditados.

## 6. Datos y entrenamiento

- `allowModelTraining = false` por defecto. No se envían datos sensibles a entrenamiento.
- Uso de proveedor con **Zero Data Retention** cuando sea posible.
- PII removida/seudonimizada antes de logs y antes de prompts cuando no es necesaria.
- Consentimiento explícito y separado para cualquier uso secundario de datos.

## 7. Validación de respuesta (capa de salida)

`ResponseValidator` rechaza/reescribe respuestas que:
- Contengan diagnóstico clínico o nombres de medicamentos con dosis.
- Afirmen reemplazar atención profesional.
- Omitan el disclaimer en temas sensibles.
- Excedan longitud máxima en modo crisis.

## 8. Registro de decisiones de IA (`AiDecisionLog`)

Cada decisión guarda: `conversationId`, `inputHash`, `riskLevel`, `ruleMatches`,
`promptVersion`, `model`, `outputSummary`, `action` (NORMAL | CONTAINMENT | ESCALATED),
`validatorResult`, `latencyMs`, `reviewedByHuman`. Append-only.
