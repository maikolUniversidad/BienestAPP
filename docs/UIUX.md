# Diseño UI/UX — BienestAPP

## Principios

- **Calma y confianza.** Estética serena, espaciado amplio, sin patrones oscuros ni
  manipulación emocional (incluida la mascota).
- **Accesible.** WCAG AA: contraste, tamaños táctiles ≥44px, soporte de lector de pantalla,
  texto escalable, modo claro/oscuro.
- **Seguridad visible.** Botón SOS siempre accesible; lenguaje responsable en todo lo que
  toque salud mental; disclaimers claros (no diagnóstico).
- **Carga cognitiva baja.** Un foco por pantalla; microinteracciones que refuerzan hábitos.

## Sistema de diseño (tokens)

| Token | Valor sugerido |
|-------|----------------|
| Color primario | Verde/teal salud (#1E9E8A) |
| Secundario | Azul calma (#3B6EA5) |
| Alerta / SOS | Rojo accesible (#D64545) |
| Éxito | #2E7D32 · Advertencia #ED9E3B |
| Tipografía | Inter / system; escala 12–28 |
| Radios | 12–20px (tarjetas suaves) |
| Sombras | suaves, baja opacidad |

Definidos como design tokens compartibles (`mobile/src/theme`, `web-admin` Tailwind config).

## App móvil (afiliado)

**Navegación:** Tab bar inferior — `Inicio · Diario · Hábitos · Mascota · Perfil`.
**Botón SOS:** FAB rojo persistente (esquina inferior, sobre el tab bar).

Pantallas clave:
- **Dashboard:** tarjeta de ánimo del día, racha de hábitos, resumen alimentación/actividad,
  logros recientes, recomendaciones, alertas preventivas.
- **Diario:** lista cronológica + editor con selector de emociones (chips: ansiedad, estrés,
  tristeza, motivación, cansancio, gratitud) + resumen semanal.
- **Chat IA:** burbujas, indicador de "acompañamiento, no reemplaza atención profesional",
  estado de crisis con UI especial (mensaje de contención + botones de acción grandes).
- **Hábitos:** anillos de progreso, recordatorios, retos.
- **Mascota:** avatar evolutivo, mensajes motivacionales medidos, accesorios desbloqueables.
- **Logros:** galería de cartas coleccionables e insignias; niveles de bienestar.
- **Perfil:** datos, preferencias, consentimientos, contactos de emergencia, privacidad.

### UI de crisis (especial)
- Fondo sobrio, sin gamificación.
- Mensaje de contención breve.
- Botones grandes: **Llamar 123** · **Conectar con call center** · **Ver respiración guiada**.
- Sin elementos que distraigan.

## Web admin / call center

- **Layout:** sidebar de navegación + topbar con rol y alertas.
- **Cola de casos (call center):** tabla priorizada (CRITICAL→LOW), badges de riesgo, SLA,
  filtros por estado. Detalle lateral con historial autorizado, notas, registro de llamada,
  acciones de escalamiento.
- **Dashboard admin:** KPIs agregados y anónimos (usuarios activos, uso por módulo,
  tendencias de bienestar), gráficos; panel de alertas restringido.
- **Gestión:** contenidos, campañas, operadores, auditoría (vista de solo lectura).

## Componentes principales (compartidos en intención)

`MoodSelector`, `HabitRing`, `StreakBadge`, `AchievementCard`, `PetAvatar`, `SosButton`,
`CrisisBanner`, `ChatBubble`, `Disclaimer`, `RiskBadge`, `CaseQueueTable`, `CaseDetailPanel`,
`MetricCard`, `ConsentToggle`.
