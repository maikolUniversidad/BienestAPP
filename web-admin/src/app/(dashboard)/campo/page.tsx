'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { HealthMap, statusColor, MapMarker } from '../../../components/health-map';

const STATUSES = [{ k: 'available', l: 'Disponible' }, { k: 'en_route', l: 'En ruta' }, { k: 'attending', l: 'Atendiendo' }, { k: 'offline', l: 'Fuera de turno' }];

export default function Campo() {
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [openVisit, setOpenVisit] = useState<string | null>(null);
  const [form, setForm] = useState<{ hr: string; spo2: string; temp: string; weight: string; diagnosis: string; cie10: string; notes: string }>({ hr: '', spo2: '', temp: '', weight: '', diagnosis: '', cie10: '', notes: '' });
  const [live, setLive] = useState(false);
  const watchRef = useRef<number | null>(null);
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3500); }

  async function load() { setMe(await api.campoMe().catch(() => null)); }
  useEffect(() => { load(); return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); }; }, []);

  const statusRef = useRef('available');
  useEffect(() => { statusRef.current = me?.agent?.status ?? 'available'; }, [me]);

  async function setStatus(status: string, lat?: number, lng?: number) {
    await api.campoSetStatus({ status, lat, lng }).catch(() => undefined);
  }
  function pickStatus(status: string) {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      async (p) => { await setStatus(status, p.coords.latitude, p.coords.longitude); flash('Estado actualizado ✓'); load(); },
      async () => { await setStatus(status); flash('Estado actualizado ✓'); load(); }, { timeout: 5000 });
    else { setStatus(status).then(() => { flash('Estado actualizado ✓'); load(); }); }
  }

  function toggleLive() {
    if (live) { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; setLive(false); flash('Ubicación en vivo detenida'); return; }
    if (!navigator.geolocation) return flash('Tu dispositivo no soporta geolocalización.');
    watchRef.current = navigator.geolocation.watchPosition(
      (p) => { setStatus(statusRef.current, p.coords.latitude, p.coords.longitude); },
      () => flash('No se pudo obtener la ubicación (revisa permisos).'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
    setLive(true); flash('Compartiendo ubicación en vivo 📍');
  }

  async function attend(id: string) {
    const vitals: any = {};
    (['hr', 'spo2', 'temp', 'weight'] as const).forEach((k) => { if (String(form[k]).trim()) vitals[k] = form[k]; });
    await api.campoAttend({ visitId: id, notes: form.notes, diagnosis: form.diagnosis, cie10: form.cie10, vitals }).catch(() => undefined);
    setOpenVisit(null); setForm({ hr: '', spo2: '', temp: '', weight: '', diagnosis: '', cie10: '', notes: '' });
    flash('Atención registrada ✓ (encuentro y vitales guardados)'); load();
  }
  async function escalate(id: string, type: string) {
    const note = prompt(type === 'ambulance' ? 'Motivo de la ambulancia:' : 'Motivo del escalamiento a atención mayor:') || '';
    await api.campoEscalate(id, type, note).catch(() => undefined);
    flash(type === 'ambulance' ? '🚑 Ambulancia solicitada y caso enviado al call center' : '⚠️ Caso escalado al call center'); load();
  }

  const a = me?.agent;
  const pending = (me?.visits ?? []).filter((v: any) => v.status === 'scheduled');
  const markers: MapMarker[] = a ? [{ id: 'me', lat: a.lat, lng: a.lng, label: 'Tú', sub: a.zone, color: statusColor(a.status) }] : [];

  return (
    <>
      <div className="page-head"><h2>Mi atención de campo</h2><p>Tu estado, ubicación en vivo y visitas domiciliarias. Registra la atención al llegar y escala si necesitas ambulancia o atención mayor.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {a && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Estado actual</div>
            <div style={{ fontFamily: 'Fraunces', fontSize: 22, color: statusColor(a.status) }}>● {STATUSES.find((s) => s.k === a.status)?.l}</div>
            <div className="muted" style={{ fontSize: 12 }}>{a.zone} · turno {a.shiftStart}–{a.shiftEnd} · {a.specialty}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto', alignItems: 'center' }}>
            {STATUSES.map((s) => (
              <button key={s.k} className={`btn btn-sm ${a.status === s.k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => pickStatus(s.k)}>{s.l}</button>
            ))}
            <button className={`btn btn-sm ${live ? 'btn-danger' : 'btn-ghost'}`} onClick={toggleLive}>{live ? '📍 En vivo · detener' : '📍 Ubicación en vivo'}</button>
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 8 }}>
          <HealthMap markers={markers} center={a ? [a.lat, a.lng] : undefined} zoom={14} height="56vh" />
        </div>
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Visitas asignadas ({pending.length})</h3>
          <div style={{ display: 'grid', gap: 8, maxHeight: '56vh', overflowY: 'auto' }}>
            {pending.map((v: any) => (
              <div key={v.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{v.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(v.scheduledAt).toLocaleString('es-CO')}{v.address ? ` · ${v.address}` : ''}</div>
                {v.reason && <div className="muted" style={{ fontSize: 12 }}>Motivo: {v.reason}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setOpenVisit(openVisit === v.id ? null : v.id)}>{openVisit === v.id ? 'Cerrar' : 'Atender'}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => escalate(v.id, 'ambulance')}>🚑 Ambulancia</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => escalate(v.id, 'urgent_care')}>⚠️ Atención mayor</button>
                </div>

                {openVisit === v.id && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Signos vitales</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <input className="field" style={{ marginTop: 0, width: 70 }} value={form.hr} onChange={(e) => setForm({ ...form, hr: e.target.value })} placeholder="FC" />
                      <input className="field" style={{ marginTop: 0, width: 70 }} value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} placeholder="SpO₂" />
                      <input className="field" style={{ marginTop: 0, width: 70 }} value={form.temp} onChange={(e) => setForm({ ...form, temp: e.target.value })} placeholder="T °C" />
                      <input className="field" style={{ marginTop: 0, width: 70 }} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="Peso" />
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input className="field" style={{ marginTop: 0, flex: 1 }} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="Diagnóstico / hallazgos" />
                      <input className="field" style={{ marginTop: 0, width: 90 }} value={form.cie10} onChange={(e) => setForm({ ...form, cie10: e.target.value.toUpperCase() })} placeholder="CIE-10" />
                    </div>
                    <textarea className="field" style={{ minHeight: 56 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas / plan de manejo" />
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 6 }} onClick={() => attend(v.id)}>Registrar atención</button>
                  </div>
                )}
              </div>
            ))}
            {pending.length === 0 && <p className="muted">No tienes visitas pendientes.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
