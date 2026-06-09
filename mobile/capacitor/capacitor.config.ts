import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Wrapper nativo de BienestAPP (iOS/Android) con Capacitor.
 * Estrategia: la app nativa carga la PWA ya desplegada y añade los puentes nativos
 * que el navegador no permite: Apple HealthKit y Android Health Connect.
 *
 * Para empaquetar la PWA dentro del binario (offline), reemplaza `server.url` por un
 * `webDir` apuntando al export estático de web-admin.
 */
const config: CapacitorConfig = {
  appId: 'co.bienestapp.app',
  appName: 'BienestAPP',
  webDir: 'www',
  server: {
    // Carga la PWA en producción. Comenta esta línea para usar el bundle local (webDir).
    url: 'https://bienest-admin.vercel.app',
    cleartext: false,
  },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
