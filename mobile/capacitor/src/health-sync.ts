/**
 * Puente de salud nativo → BienestAPP.
 *
 * Lee métricas de Apple HealthKit (iOS) o Android Health Connect y las empuja al
 * endpoint universal de ingesta `POST /api/v1/health/metrics`, el MISMO que usa la PWA
 * con Web Bluetooth. Así Apple Watch / Apple Salud y Google Fit / Health Connect quedan
 * sincronizados y la IA los interpreta en /salud.
 *
 * Inyéctalo en la PWA cargada por Capacitor (window) o ejecútalo desde un BackgroundRunner.
 */
import { Capacitor } from '@capacitor/core';

const API_BASE = 'https://bienest-app.vercel.app/api/v1';

// Tipos de métrica admitidos por el backend (ver backend/src/health/health.module.ts).
type MetricType = 'heart_rate' | 'steps' | 'sleep' | 'calories' | 'distance' | 'active_minutes' | 'hrv' | 'spo2' | 'weight';
interface Metric { type: MetricType; value: number; unit: string; recordedAt?: string }

/** El token JWT del afiliado se comparte desde la PWA (localStorage) hacia el wrapper. */
function getToken(): string | null {
  try { return window.localStorage.getItem('accessToken'); } catch { return null; }
}

async function pushMetrics(source: 'apple_health' | 'health_connect', metrics: Metric[], deviceName?: string) {
  const token = getToken();
  if (!token || !metrics.length) return;
  await fetch(`${API_BASE}/health/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ source, metrics, deviceName }),
  });
}

// ---------------- iOS: Apple HealthKit ----------------
async function syncHealthKit() {
  const { CapacitorHealthkit } = await import('@perfood/capacitor-healthkit');
  const read = ['steps', 'heart-rate', 'calories', 'distance', 'sleep-analysis'];
  await CapacitorHealthkit.requestAuthorization({ all: [], read, write: [] });

  const start = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const end = new Date().toISOString();
  const out: Metric[] = [];

  const q = async (sampleName: string, type: MetricType, unit: string) => {
    try {
      const r: any = await CapacitorHealthkit.queryHKitSampleType({ sampleName, startDate: start, endDate: end, limit: 0 });
      for (const s of r?.resultData ?? []) {
        out.push({ type, value: Number(s.value) || 0, unit, recordedAt: s.endDate || s.startDate });
      }
    } catch { /* permiso no concedido para este tipo */ }
  };
  await q('stepCount', 'steps', 'count');
  await q('heartRate', 'heart_rate', 'lpm');
  await q('activeEnergyBurned', 'calories', 'kcal');
  await q('distanceWalkingRunning', 'distance', 'km');
  await pushMetrics('apple_health', out, 'Apple Salud');
}

// ------------- Android: Health Connect -------------
async function syncHealthConnect() {
  const { HealthConnect } = await import('capacitor-health-connect');
  const recordTypes = ['Steps', 'HeartRate', 'TotalCaloriesBurned', 'Distance', 'SleepSession', 'OxygenSaturation'];
  await HealthConnect.requestHealthPermissions({ read: recordTypes, write: [] });

  const timeRangeFilter = {
    type: 'between' as const,
    startTime: new Date(Date.now() - 24 * 3600 * 1000),
    endTime: new Date(),
  };
  const out: Metric[] = [];
  const read = async (recordType: string, map: (r: any) => Metric | null) => {
    try {
      const res: any = await HealthConnect.readRecords({ type: recordType, timeRangeFilter });
      for (const rec of res?.records ?? []) { const m = map(rec); if (m) out.push(m); }
    } catch { /* permiso no concedido */ }
  };
  await read('Steps', (r) => ({ type: 'steps', value: Number(r.count) || 0, unit: 'count', recordedAt: r.endTime }));
  await read('HeartRate', (r) => {
    const bpm = r.samples?.[0]?.beatsPerMinute; return bpm ? { type: 'heart_rate', value: Number(bpm), unit: 'lpm', recordedAt: r.endTime } : null;
  });
  await read('TotalCaloriesBurned', (r) => ({ type: 'calories', value: Number(r.energy?.inKilocalories) || 0, unit: 'kcal', recordedAt: r.endTime }));
  await read('Distance', (r) => ({ type: 'distance', value: Number(r.distance?.inKilometers) || 0, unit: 'km', recordedAt: r.endTime }));
  await read('OxygenSaturation', (r) => ({ type: 'spo2', value: Number(r.percentage) || 0, unit: '%', recordedAt: r.time }));
  await pushMetrics('health_connect', out, 'Health Connect');
}

/** Punto de entrada: sincroniza según la plataforma nativa actual. */
export async function syncHealth(): Promise<void> {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') await syncHealthKit();
  else if (platform === 'android') await syncHealthConnect();
  // En web no hay puente nativo: la PWA usa Web Bluetooth (ver web-admin /salud).
}

// Expuesto para que la PWA lo invoque (p. ej. botón "Sincronizar Apple Salud").
if (typeof window !== 'undefined') (window as any).bienestappSyncHealth = syncHealth;
