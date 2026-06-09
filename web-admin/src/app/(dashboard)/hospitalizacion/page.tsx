'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const WARDS = [{ k: 'hospitalizacion', l: 'Hospitalización' }, { k: 'uci', l: 'UCI' }, { k: 'urgencias', l: 'Urgencias' }];
const BED_COLOR: Record<string, string> = { available: 'var(--salvia)', occupied: 'var(--sos)', cleaning: 'var(--ambar)', maintenance: 'var(--gris)' };
const TRIAGE_COLOR: Record<number, string> = { 1: '#C8453B', 2: '#E0913A', 3: '#E0C13A', 4: '#5E9B7E', 5: '#5B7FB9' };

export default function Hospitalizacion() {
  const [tab, setTab] = useState<'censo' | 'triage'>('censo');
  const [censo, setCenso] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [bed, setBed] = useState({ code: '', ward: 'hospitalizacion' });
  const [admit, setAdmit] = useState({ userId: '', bedId: '', reason: '' });
  const [tri, setTri] = useState({ userId: '', level: '3', reason: '' });
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  async function load() {
    setCenso(await api.hospCenso().catch(() => null));
    setQueue(await api.hospTriageQueue().catch(() => []));
  }
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  async function createBed() { if (!bed.code.trim()) return flash('Código de cama requerido.'); await api.hospCreateBed(bed).catch(() => undefined); setBed({ code: '', ward: bed.ward }); flash('Cama creada ✓'); load(); }
  async function doAdmit() { if (!admit.userId.trim() || !admit.bedId) return flash('userId y cama requeridos.'); const r = await api.hospAdmit(admit).catch(() => null); flash(r ? 'Paciente admitido ✓' : 'No se pudo admitir (¿cama ocupada?).'); setAdmit({ userId: '', bedId: '', reason: '' }); load(); }
  async function discharge(id: string) { if (!confirm('¿Dar egreso y liberar la cama?')) return; await api.hospDischarge(id).catch(() => undefined); flash('Egreso registrado ✓'); load(); }
  async function bedStatus(id: string, status: string) { await api.hospBedStatus(id, status).catch(() => undefined); load(); }
  async function addTriage() { if (!tri.userId.trim()) return flash('userId requerido.'); await api.hospTriage({ userId: tri.userId, level: Number(tri.level), reason: tri.reason }).catch(() => undefined); setTri({ userId: '', level: '3', reason: '' }); flash('Triage registrado ✓'); load(); }
  async function attend(id: string) { await api.hospTriageAttend(id).catch(() => undefined); flash('Marcado como atendido ✓'); load(); }

  const freeBeds = (censo?.beds ?? []).filter((b: any) => b.status === 'available');

  return (
    <>
      <div className="page-head"><h2>Hospitalización y Urgencias</h2><p>Censo de camas, admisión y egreso, y clasificación de triage de urgencias (Res. 5596).</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'censo' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('censo')}>Camas y censo</button>
        <button className={`btn btn-sm ${tab === 'triage' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('triage')}>Triage urgencias {queue.length ? `(${queue.length})` : ''}</button>
      </div>

      {tab === 'censo' && (
        <>
          {censo?.byWard && (
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              {WARDS.map((w) => { const s = censo.byWard[w.k] || { total: 0, occupied: 0 }; return (
                <div className="card stat" key={w.k}><div className="lbl">{w.l}</div><div className="val">{s.occupied}/{s.total}</div><div className="muted" style={{ fontSize: 11 }}>ocupación</div></div>
              ); })}
              <div className="card stat"><div className="lbl">Disponibles</div><div className="val" style={{ color: 'var(--salvia-deep)' }}>{freeBeds.length}</div></div>
            </div>
          )}

          <div className="grid grid-2">
            <div className="card">
              <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Camas</h3>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <input className="field" style={{ marginTop: 0, width: 110 }} value={bed.code} onChange={(e) => setBed({ ...bed, code: e.target.value })} placeholder="Código" />
                <select className="field" style={{ marginTop: 0, width: 'auto' }} value={bed.ward} onChange={(e) => setBed({ ...bed, ward: e.target.value })}>{WARDS.map((w) => <option key={w.k} value={w.k}>{w.l}</option>)}</select>
                <button className="btn btn-primary btn-sm" onClick={createBed}>＋ Cama</button>
              </div>
              <div style={{ display: 'grid', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
                {(censo?.beds ?? []).map((b: any) => (
                  <div key={b.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg)', borderRadius: 10, padding: 10, flexWrap: 'wrap' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: BED_COLOR[b.status] }} />
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{b.code} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {b.ward}</span></div>
                      <div className="muted" style={{ fontSize: 12 }}>{b.status}{b.patientName ? ` · ${b.patientName}` : ''}</div>
                    </div>
                    {b.status === 'occupied'
                      ? <button className="btn btn-ghost btn-sm" onClick={() => discharge(b.id)}>Egreso</button>
                      : b.status === 'cleaning'
                        ? <button className="btn btn-ghost btn-sm" onClick={() => bedStatus(b.id, 'available')}>Disponibilizar</button>
                        : <span className="muted" style={{ fontSize: 12 }}>libre</span>}
                  </div>
                ))}
                {(censo?.beds ?? []).length === 0 && <p className="muted">Sin camas. Crea la primera.</p>}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Admitir paciente</h3>
              <input className="field" value={admit.userId} onChange={(e) => setAdmit({ ...admit, userId: e.target.value })} placeholder="userId del paciente" />
              <select className="field" value={admit.bedId} onChange={(e) => setAdmit({ ...admit, bedId: e.target.value })}>
                <option value="">Cama disponible…</option>
                {freeBeds.map((b: any) => <option key={b.id} value={b.id}>{b.code} ({b.ward})</option>)}
              </select>
              <input className="field" value={admit.reason} onChange={(e) => setAdmit({ ...admit, reason: e.target.value })} placeholder="Motivo de ingreso" />
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={doAdmit}>Admitir</button>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Se crea el encuentro del servicio y la cama queda ocupada. El egreso cierra el encuentro y deja la cama en limpieza.</p>
            </div>
          </div>
        </>
      )}

      {tab === 'triage' && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Clasificar triage</h3>
            <input className="field" value={tri.userId} onChange={(e) => setTri({ ...tri, userId: e.target.value })} placeholder="userId del paciente" />
            <select className="field" value={tri.level} onChange={(e) => setTri({ ...tri, level: e.target.value })}>
              <option value="1">Nivel 1 — Atención inmediata</option>
              <option value="2">Nivel 2 — Muy urgente</option>
              <option value="3">Nivel 3 — Urgente</option>
              <option value="4">Nivel 4 — Menos urgente</option>
              <option value="5">Nivel 5 — No urgente</option>
            </select>
            <input className="field" value={tri.reason} onChange={(e) => setTri({ ...tri, reason: e.target.value })} placeholder="Motivo de consulta" />
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={addTriage}>Registrar triage</button>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Cola de triage ({queue.length})</h3>
            <div style={{ display: 'grid', gap: 6 }}>
              {queue.map((t) => (
                <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg)', borderRadius: 10, padding: 10 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: TRIAGE_COLOR[t.level], color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800 }}>{t.level}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{t.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{t.reason || 'Sin motivo'} · espera {t.waitMin} min</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => attend(t.id)}>Atender</button>
                </div>
              ))}
              {queue.length === 0 && <p className="muted">Sin pacientes en espera.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
