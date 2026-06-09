# BienestAPP — Wrapper nativo (Capacitor) + puente de salud

App nativa iOS/Android que **reutiliza la PWA** de `web-admin` y añade los puentes que el
navegador no permite: **Apple HealthKit** y **Android Health Connect**. La sincronización
empuja al mismo endpoint universal `POST /api/v1/health/metrics` que usa la PWA con Web
Bluetooth, de modo que Apple Watch / Apple Salud y Google Fit / Health Connect quedan
integrados y la IA los interpreta en `/salud`.

> Nota: este wrapper reemplaza el scaffold Expo histórico de `mobile/` (la experiencia del
> afiliado se decidió como PWA). Úsalo para distribuir en las tiendas con acceso a salud.

## Puesta en marcha

```bash
cd mobile/capacitor
npm install
npx cap add ios        # requiere macOS + Xcode
npx cap add android    # requiere Android Studio
npx cap sync
npx cap open ios       # / open android
```

`capacitor.config.ts` carga la PWA desde `https://bienest-admin.vercel.app` (`server.url`).
Para empaquetarla offline, exporta `web-admin` a estático y apunta `webDir` al export,
quitando `server.url`.

## Permisos nativos

**iOS — `Info.plist`:**
```
NSHealthShareUsageDescription  = BienestAPP usa tus datos de salud para acompañar tu bienestar.
NSHealthUpdateUsageDescription = Permite registrar tu actividad en BienestAPP.
```
Habilita la *capability* **HealthKit** en el target de Xcode.

**Android — `AndroidManifest.xml`:** declara permisos `android.permission.health.READ_STEPS`,
`READ_HEART_RATE`, `READ_TOTAL_CALORIES_BURNED`, `READ_DISTANCE`, `READ_SLEEP`,
`READ_OXYGEN_SATURATION` y el intent de privacidad de Health Connect. Requiere Health
Connect instalado (Android 14+ lo trae integrado).

## Sincronización

`src/health-sync.ts` expone `syncHealth()` y la registra en `window.bienestappSyncHealth`.
La PWA puede invocarla (p. ej. un botón "Sincronizar Apple Salud" en `/salud` cuando corre
dentro del wrapper). Para sincronización periódica en segundo plano, prográmala con
`@capacitor/background-runner` (iOS BGTaskScheduler / Android WorkManager).

El token JWT del afiliado se comparte vía `localStorage` (lo escribe la PWA al iniciar
sesión); el puente lo lee para autenticar la ingesta. No se almacenan secretos en el wrapper.

## Mapeo de métricas

| Fuente | Tipo backend | Unidad |
|---|---|---|
| Steps | `steps` | count |
| HeartRate | `heart_rate` | lpm |
| Active/Total Calories | `calories` | kcal |
| Distance | `distance` | km |
| Sleep | `sleep` | h |
| OxygenSaturation | `spo2` | % |
