'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';

// Catálogo de conexiones. Apple Salud / Google Fit / Health Connect requieren el
// puente nativo (ver docs/INTEGRACION_SALUD.md); la pulsera/reloj BLE conecta en vivo
// desde el navegador con Web Bluetooth (HTTPS, Chrome/Edge — no iOS Safari).
const PROVIDERS = [
  { key: 'apple_health', name: 'Apple Salud', ic: '🍎', note: 'iPhone / Apple Watch · requiere la app nativa', kind: 'native' },
  { key: 'google_fit', name: 'Google Fit', ic: '🟢', note: 'Android · requiere la app nativa', kind: 'native' },
  { key: 'health_connect', name: 'Health Connect', ic: '➕', note: 'Android 14+ · centraliza tus apps de salud', kind: 'native' },
  { key: 'wearable_ble', name: 'Reloj / Pulsera Bluetooth', ic: '⌚', note: 'Conexión en vivo desde este navegador', kind: 'ble' },
] as const;

const METRIC_META: Record<string, { ic: string; label: string; unit: string }> = {
  heart_rate: { ic: '❤️', label: 'Ritmo cardíaco', unit: 'lpm' },
  steps: { ic: '👟', label: 'Pasos hoy', unit: '' },
  active_minutes: { ic: '🤸', label: 'Min. activos', unit: 'min' },
  calories: { ic: '🔥', label: 'Calorías', unit: 'kcal' },
  distanceKm: { ic: '📍', label: 'Distancia', unit: 'km' },
  sleepHours: { ic: '😴', label: 'Sueño', unit: 'h' },
  spo2: { ic: '🫁', label: 'SpO₂', unit: '%' },
  hrv: { ic: '📈', label: 'Variabilidad', unit: 'ms' },
  weight: { ic: '⚖️', label: 'Peso', unit: 'kg' },
};

export default function Salud() {
  const [summary, setSummary] = useState<any>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [interpretation, setInterpretation] = useState<string>('');
  const [interpreting, setInterpreting] = useState(false);

  // Estado de la sesión Web Bluetooth en vivo.
  const [bleSupported, setBleSupported] = useState(true);
  const [bleStatus, setBleStatus] = useState<'idle' | 'connecting' | 'live' | 'error'>('idle');
  const [liveHr, setLiveHr] = useState<number | null>(null);
  const [bleDevice, setBleDevice] = useState<string>('');
  const bufferRef = useRef<{ value: number; recordedAt: string }[]>([]);
  const flushTimer = useRef<any>(null);
  const deviceRef = useRef<any>(null);

  const reload = () => {
    api.healthSummary().then(setSummary).catch(() => undefined);
    api.healthConnections().then(setConnections).catch(() => setConnections([]));
  };
  useEffect(() => {
    reload();
    setBleSupported(typeof navigator !== 'undefined' && !!(navigator as any).bluetooth);
    return () => { if (flushTimer.current) clearInterval(flushTimer.current); };
  }, []);

  const connOf = (key: string) => connections.find((c) => c.provider === key);

  async function interpret() {
    setInterpreting(true);
    try {
      const r = await api.healthInterpret();
      setSummary(r.summary);
      setInterpretation(r.interpretation);
    } catch { setInterpretation('No fue posible interpretar ahora. Intenta más tarde.'); }
    setInterpreting(false);
  }

  // --- Web Bluetooth: pulso cardíaco en vivo (servicio estándar 0x180D) ---
  async function connectBle() {
    try {
      setBleStatus('connecting');
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service'],
      });
      deviceRef.current = device;
      setBleDevice(device.name || 'Dispositivo BLE');
      device.addEventListener('gattserverdisconnected', () => setBleStatus('idle'));
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const ch = await service.getCharacteristic('heart_rate_measurement');
      await ch.startNotifications();
      ch.addEventListener('characteristicvaluechanged', (e: any) => {
        const v: DataView = e.target.value;
        const flags = v.getUint8(0);
        const hr = flags & 0x01 ? v.getUint16(1, true) : v.getUint8(1);
        if (hr > 0 && hr < 250) {
          setLiveHr(hr);
          bufferRef.current.push({ value: hr, recordedAt: new Date().toISOString() });
        }
      });
      setBleStatus('live');
      await api.healthConnect('wearable_ble', device.name || 'Dispositivo BLE').catch(() => undefined);
      // Envía las lecturas en lote cada 20 s (1 muestra/lote para no saturar).
      flushTimer.current = setInterval(flushBle, 20000);
      reload();
    } catch {
      setBleStatus('error');
    }
  }
  async function flushBle() {
    const buf = bufferRef.current;
    if (!buf.length) return;
    // Toma la última muestra de la ventana como representativa.
    const last = buf[buf.length - 1];
    bufferRef.current = [];
    await api.ingestHealth('wearable_ble', [{ type: 'heart_rate', value: last.value, unit: 'lpm', recordedAt: last.recordedAt }], bleDevice).catch(() => undefined);
    reload();
  }
  function disconnectBle() {
    try { deviceRef.current?.gatt?.disconnect(); } catch { /* noop */ }
    if (flushTimer.current) clearInterval(flushTimer.current);
    flushBle();
    setBleStatus('idle');
    setLiveHr(null);
  }

  async function toggleNative(key: string) {
    const c = connOf(key);
    if (c && c.status === 'connected') await api.healthDisconnect(key).catch(() => undefined);
    else await api.healthConnect(key).catch(() => undefined);
    reload();
  }

  const cards = summary
    ? [
        { k: 'heart_rate', v: summary.heartRate?.value },
        { k: 'steps', v: summary.steps },
        { k: 'active_minutes', v: summary.activeMinutes },
        { k: 'calories', v: summary.calories },
        { k: 'distanceKm', v: summary.distanceKm },
        { k: 'sleepHours', v: summary.sleepHours },
        { k: 'spo2', v: summary.spo2 },
        { k: 'hrv', v: summary.hrv },
      ]
    : [];

  return (
    <>
      <div className="page-head">
        <h2>Salud y wearables</h2>
        <p>Conecta tu reloj, pulsera o app de salud. Tus datos llegan aquí y BienestAPP los interpreta y acompaña, sin diagnosticar.</p>
      </div>

      {/* En vivo */}
      <div className="card" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 40 }} className={bleStatus === 'live' ? 'float' : ''}>❤️</div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div className="muted" style={{ fontSize: 13 }}>Ritmo cardíaco en vivo</div>
          <div style={{ fontFamily: 'Fraunces', fontSize: 32, color: 'var(--tinta)' }}>
            {liveHr ? `${liveHr} lpm` : '— lpm'}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {bleStatus === 'live' ? `Conectado a ${bleDevice}` : bleStatus === 'connecting' ? 'Conectando…' : bleStatus === 'error' ? 'No se pudo conectar' : 'Sin conexión activa'}
          </div>
        </div>
        {bleStatus === 'live'
          ? <button className="btn btn-ghost" onClick={disconnectBle}>Desconectar</button>
          : <button className="btn btn-primary" onClick={connectBle} disabled={!bleSupported || bleStatus === 'connecting'}>Conectar pulsera/reloj</button>}
      </div>
      {!bleSupported && (
        <div className="card" style={{ marginBottom: 18, background: 'var(--durazno)', color: 'var(--tinta)' }}>
          Tu navegador no admite Bluetooth web. Úsalo en Chrome/Edge en Android o computador. En iPhone/Apple Watch usa la app nativa (Apple Salud).
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        {cards.map(({ k, v }) => {
          const m = METRIC_META[k];
          return (
            <div className="card stat" key={k}>
              <div className="ic">{m.ic}</div>
              <div className="lbl">{m.label}</div>
              <div className="val">{v != null && v !== 0 ? `${v}${m.unit ? ' ' + m.unit : ''}` : '—'}</div>
            </div>
          );
        })}
      </div>

      {/* Interpretación IA */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>Lectura de tu bienestar</h3>
          <button className="btn btn-ghost btn-sm" onClick={interpret} disabled={interpreting}>{interpreting ? 'Interpretando…' : 'Interpretar con IA'}</button>
        </div>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          {interpretation || 'Pulsa “Interpretar con IA” para una lectura cercana de tus datos. Recuerda: es acompañamiento, no diagnóstico.'}
        </p>
      </div>

      {/* Conexiones */}
      <div className="card">
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Tus conexiones de salud</h3>
        <div className="grid grid-2">
          {PROVIDERS.map((p) => {
            const c = connOf(p.key);
            const live = p.key === 'wearable_ble' && bleStatus === 'live';
            const connected = live || c?.status === 'connected';
            return (
              <div key={p.key} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 28 }}>{p.ic}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.note}</div>
                  {connected && c?.lastSync && (
                    <div className="muted" style={{ fontSize: 11 }}>Última sync: {new Date(c.lastSync).toLocaleString('es-CO')}</div>
                  )}
                </div>
                <span className="badge" style={{ background: connected ? 'var(--salvia)' : 'var(--niebla)', color: connected ? '#fff' : 'var(--muted)', fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>
                  {connected ? 'Conectado' : 'Sin conectar'}
                </span>
                {p.kind === 'ble'
                  ? <button className="btn btn-sm btn-ghost" onClick={live ? disconnectBle : connectBle} disabled={!bleSupported}>{live ? 'Desconectar' : 'Conectar'}</button>
                  : <button className="btn btn-sm btn-ghost" onClick={() => toggleNative(p.key)}>{connected ? 'Quitar' : 'Activar'}</button>}
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          Apple Salud, Google Fit y Health Connect sincronizan a través de la app nativa de BienestAPP en tu teléfono. Aquí marcas tu preferencia; la app móvil empuja los datos automáticamente.
        </p>
      </div>
    </>
  );
}
