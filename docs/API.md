# APIs REST principales — BienestAPP

Base URL (dev): `http://localhost:3000/api/v1` · Documentación viva: Swagger en `/docs`.
Auth: `Authorization: Bearer <JWT>`. Errores: formato problem+json. Versionado por URL.

## Autenticación
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/auth/register` | público | Registro de afiliado |
| POST | `/auth/login` | público | Login → access + refresh token |
| POST | `/auth/refresh` | público | Renovar access token |
| POST | `/auth/mfa/enable` | afiliado | Activar MFA (TOTP) |
| POST | `/auth/mfa/verify` | público | Verificar código MFA |
| POST | `/auth/logout` | autenticado | Revocar sesión |

## Perfil y consentimiento
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/PUT | `/profile` | Ver/editar perfil del afiliado |
| GET/PUT | `/profile/preferences` | Preferencias de bienestar |
| GET | `/profile/activity` | Historial de actividad en la app |
| GET/POST | `/consents` | Listar / otorgar consentimiento (versionado) |
| DELETE | `/consents/:id` | Revocar consentimiento |
| GET/POST/PUT/DELETE | `/emergency-contacts` | CRUD contactos de emergencia |
| GET | `/privacy/export` | Exportar mis datos (Habeas Data) |
| DELETE | `/privacy/account` | Solicitar eliminación de cuenta |

## Dashboard y bienestar
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | Resumen: ánimo, rachas, alimentación, actividad, logros, recomendaciones, alertas |

## Diario emocional
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/mood` | Listar / registrar estado emocional del día |
| GET/POST | `/journal` | Listar / crear entrada de diario (privada) |
| GET | `/journal/:id` | Detalle de entrada |
| GET | `/journal/summary/weekly` | Resumen semanal (IA) |
| POST | `/journal/:id/analyze` | Disparar análisis de sentimiento + riesgo (async) |

## Asistente IA seguro
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/ai/conversations` | Iniciar conversación |
| GET | `/ai/conversations/:id` | Historial de conversación |
| POST | `/ai/conversations/:id/messages` | Enviar mensaje → respuesta con guardrails. Puede devolver `crisisProtocol` |

**Respuesta con protocolo de crisis (ejemplo):**
```json
{
  "message": { "role": "assistant", "content": "…mensaje de contención…" },
  "riskLevel": "CRITICAL",
  "crisisProtocol": {
    "active": true,
    "containmentMessage": "…",
    "emergencyLines": [{ "label": "Emergencias", "number": "123" }],
    "actions": ["CALL_EMERGENCY", "CONNECT_CALLCENTER"],
    "callCenterCaseId": "case_…"
  }
}
```

## Botón SOS / Emergencia
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/emergency/sos` | Crear evento SOS. Body: `type`, `location?`, `note?` → crea `EmergencyTicket` + `CallCenterCase` |
| GET | `/emergency/tickets/:id` | Estado y seguimiento del ticket |

## Call center (operadores / profesionales)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/callcenter/queue` | operador+ | Cola priorizada por riesgo |
| GET | `/callcenter/cases/:id` | operador+ | Detalle (historial autorizado) |
| PATCH | `/callcenter/cases/:id/status` | operador+ | nuevo→en atención→escalado→cerrado |
| POST | `/callcenter/cases/:id/notes` | operador+ | Nota interna |
| POST | `/callcenter/cases/:id/escalate` | operador+ | Escalar a médico/psicólogo/línea |
| POST | `/callcenter/cases/:id/call-log` | operador+ | Registrar llamada |

## Alimentación, ejercicio, hábitos
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/food/analyze` | Subir foto → estimación IA (async). Devuelve `jobId` |
| GET/POST | `/food` | Historial / registro manual |
| GET/POST | `/exercise` | Actividad, sueño, agua, pausas |
| GET/POST/PUT/DELETE | `/habits` | CRUD hábitos |
| POST | `/habits/:id/log` | Marcar cumplimiento (racha) |

## Mascota, logros, tests, biblioteca
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/pet` | Ver/crear mascota; evoluciona con hábitos |
| GET | `/achievements` | Cartas/insignias del usuario |
| GET | `/tests` · `/tests/:id` | Catálogo y detalle de tests |
| POST | `/tests/:id/submit` | Enviar respuestas → resultado orientativo (+escalamiento si riesgo) |
| GET | `/content` | Biblioteca de actividades (filtros) |

## Panel administrativo (Nueva EPS)
| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/admin/metrics` | EPS_ADMIN | Indicadores agregados y anónimos |
| GET | `/admin/users` | EPS_ADMIN | Usuarios (sin datos clínicos sin permiso) |
| GET | `/admin/alerts` | autorizado | Alertas de riesgo (acceso restringido) |
| GET/POST | `/admin/content` | EPS_ADMIN | Gestión de contenidos |
| GET/POST | `/admin/campaigns` | EPS_ADMIN | Campañas de bienestar |
| GET/POST | `/admin/operators` | EPS_ADMIN | Gestión de operadores |
| GET | `/admin/audit` | AUDITOR | Consulta de auditoría |
