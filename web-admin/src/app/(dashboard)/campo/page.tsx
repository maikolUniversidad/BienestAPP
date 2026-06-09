'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { HealthMap, statusColor, MapMarker } from '../../../components/health-map';

const STATUSES = [{ k: 'available', l: 'Disponible' }, { k: 'en_route', l: 'En ruta' }, { k: 'attending', l: 'Atendiendo' }, { k: 'offline', l: 'Fuera de turno' }];

export default function Campo() {
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  async function load() { setMe(await api.campoMe().catch(() => null)); }
  useEffect(() => { load(); }, []);

  async function setStatus(status: string) {
    // intenta enviar ubicación real del dispositivo
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => { await api.campoSetStatus({ status, lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(() => undefined); flash('Estado actualizado ✓'); load(); },
        async () => { await api.campoSetStatus({ status }).catch(() => undefined); flash('Estado actualizado (sin ubicación) ✓'); load(); },
        { timeout: 5000 },
      );
    } else { await api.campoSetStatus({ status }).catch(() => undefined); flash('Estado actualizado ✓'); load(); }
  }
  async function attend(id: string) { await api.campoAttend(id, notes[id]).catch(() => undefined); flash('Atención registrada ✓'); load(); }

  const a = me?.agent;
  const pending = (me?.visits ?? []).filter((v: any) => v.status === 'scheduled');
  const markers: MapMarker[] = a ? [{ id: 'me', lat: a.lat, lng: a.lng, label: 'Tú', sub: a.zone, color: statusColor(a.status) }] : [];

  return (
    <>
      <div className="page-head"><h2>Mi atención de campo</h2><p>Tu estado, ubicación y visitas domiciliarias asignadas. Marca tu disponibilidad y registra la atención al llegar.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {a && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div className="muted" style={{ fontSize: 12 }}>Estado actual</div>
            <div style={{ fontFamily: 'Fraunces', fontSize: 22, color: statusColor(a.status) }}>● {STATUSES.find((s) => s.k === a.status)?.l}</div>
            <div className="muted" style={{ fontSize: 12 }}>{a.zone} · turno {a.shiftStart}–{a.shiftEnd} · {a.specialty}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
            {STATUSES.map((s) => (
              <button key={s.k} className={`btn btn-sm ${a.status === s.k ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setStatus(s.k)}>{s.l}</button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 8 }}>
          <HealthMap markers={markers} center={a ? [a.lat, a.lng] : undefined} zoom={14} height="56vh" />
        </div>
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Visitas asignadas ({pending.length})</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {pending.map((v: any) => (
              <div key={v.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{v.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(v.scheduledAt).toLocaleString('es-CO')}{v.address ? ` · ${v.address}` : ''}{v.reason ? ` · ${v.reason}` : ''}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input className="field" style={{ marginTop: 0, flex: 1, fontSize: 13 }} value={notes[v.id] ?? ''} onChange={(e) => setNotes({ ...notes, [v.id]: e.target.value })} placeholder="Notas de la atención" />
                  <button className="btn btn-primary btn-sm" onClick={() => attend(v.id)}>Llegué / Atender</button>
                </div>
              </div>
            ))}
            {pending.length === 0 && <p className="muted">No tienes visitas pendientes.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
