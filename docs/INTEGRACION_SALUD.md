# Integración de Salud y Wearables — BienestAPP

Permite conectar relojes, pulseras y apps de salud, traer los datos a BienestAPP y que
la IA los **interprete y gestione** (sin diagnosticar). Cubre Apple Watch / Apple Salud,
Google Fit, Health Connect y pulseras Bluetooth genéricas.

## Arquitectura

```
Apple Salud / Google Fit / Health Connect  ──(app nativa)──┐
Pulsera/Reloj BLE estándar  ──(Web Bluetooth, navegador)───┤
Ingreso manual  ─────────────────────────────────────────┤
                                                           ▼
                                  POST /health/metrics  (ingesta universal)
                                                           ▼
                            HealthMetric  +  HealthConnection (Supabase/Postgres)
                                                           ▼
                       GET /health/summary  ·  GET /health/interpret (IA DeepSeek)
                                                           ▼
                              PWA  /salud  (tablero, en vivo, interpretación)
```

Un solo punto de entrada de datos: **cualquier** fuente empuja al mismo endpoint, así el
resto de la app (resumen, IA, progreso) no depende del origen.

## 1) Web Bluetooth (ya funcional en la PWA)

La página `/salud` conecta en vivo a cualquier banda/reloj que exponga el servicio
estándar **Heart Rate (0x180D)** mediante la Web Bluetooth API:

- `navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] })`
- característica `heart_rate_measurement` con `startNotifications()`
- parseo: byte de flags → HR en uint8 o uint16 (bit 0).
- las lecturas se envían en lote cada 20 s a `POST /health/metrics` (`source: wearable_ble`).

Requisitos: **HTTPS**, Chrome/Edge en Android o escritorio. **No** funciona en iOS/Safari
(Apple no expone Web Bluetooth). Para iPhone/Apple Watch → puente nativo (sección 3).

## 2) API de salud (backend NestJS)

Todos los endpoints requieren JWT de afiliado. Base: `/api/v1/health`.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/health/metrics` | Ingesta en lote `{ source, metrics:[{type,value,unit,recordedAt?}], deviceName? }`. Marca la conexión como `connected` y actualiza `lastSync`. |
| GET | `/health/summary` | Resumen del día: HR/SpO2/HRV/peso (último) + pasos/calorías/min activos/distancia (suma de hoy) + sueño. |
| GET | `/health/metrics?type=heart_rate` | Histórico (últimas 100 muestras del tipo). |
| GET | `/health/connections` | Lista de conexiones del usuario. |
| POST | `/health/connect` | `{ provider, deviceName? }` → marca proveedor conectado. |
| POST | `/health/disconnect` | `{ provider }` → marca desconectado. |
| GET | `/health/interpret` | Resumen + lectura empática generada por IA (DeepSeek, validada, no diagnóstica). |

**Tipos de métrica:** `heart_rate, steps, sleep, calories, distance, active_minutes, hrv, spo2, weight`.
**Proveedores:** `apple_health, google_fit, health_connect, wearable_ble, manual`.

Modelos Prisma: `HealthMetric` (índice `[userId, type, recordedAt]`) y `HealthConnection`
(único `[userId, provider]`).

## 3) Puente nativo (Apple HealthKit / Google Fit / Health Connect)

Apple Watch/Apple Salud y Google Fit/Health Connect **solo** se leen desde una app nativa
con permisos del SO. La PWA marca la preferencia; una app contenedora ligera empuja los
datos al mismo endpoint `POST /health/metrics`. Opciones de implementación:

### Opción A — Capacitor (recomendada: reusa la PWA)
Envuelve la PWA existente y usa plugins de salud:

```bash
npm i @capacitor/core @capacitor/ios @capacitor/android
# Salud:
npm i @perfood/capacitor-healthkit        # iOS HealthKit
npm i capacitor-health-connect            # Android Health Connect
```

Flujo: pedir permisos → leer muestras (HR, pasos, sueño, SpO2…) → mapear al DTO →
`POST /health/metrics` con `source: apple_health | health_connect`. Programar sync en
background (BackgroundRunner / WorkManager).

iOS `Info.plist`:
```
NSHealthShareUsageDescription = BienestAPP usa tus datos de salud para acompañar tu bienestar.
NSHealthUpdateUsageDescription = Permite registrar tu actividad en BienestAPP.
```
Android `AndroidManifest.xml`: permisos `android.permission.health.READ_*` + declarar uso
de Health Connect.

### Opción B — React Native / Expo (app nativa dedicada)
`react-native-health` (HealthKit) y `react-native-health-connect` (Android). Mismo destino:
`POST /health/metrics`.

### Mapeo de unidades sugerido
`heart_rate→lpm`, `steps→count`, `sleep→h`, `calories→kcal`, `distance→km`,
`active_minutes→min`, `hrv→ms`, `spo2→%`, `weight→kg`.

## 4) Privacidad y seguridad

- Datos por usuario, aislados por `userId` (JWT). RLS recomendada en Supabase para `HealthMetric`/`HealthConnection`.
- La IA recibe **solo un resumen agregado** (no histórico crudo) y devuelve texto validado, **no diagnóstico**; ante valores muy fuera de rango sugiere consultar a un profesional.
- Consentimiento explícito antes de activar cualquier conexión (reusa el módulo de consentimiento existente).
