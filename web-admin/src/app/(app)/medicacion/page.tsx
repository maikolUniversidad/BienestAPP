'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const TIMES = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];

function Ring({ pct }: { pct: number }) {
  const r = 30, c = 2 * Math.PI * r;
  const color = pct >= 80 ? 'var(--salvia)' : pct >= 50 ? 'var(--ambar)' : 'var(--sos)';
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--niebla)" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 40 40)" style={{ transition: '.4s' }} />
      <text x="40" y="45" textAnchor="middle" fontWeight="700" fontSize="17" fill="var(--tinta)">{pct}%</text>
    </svg>
  );
}

export default function Medicacion() {
  const [today, setToday] = useState<any>({ doses: [], taken: 0, total: 0 });
  const [items, setItems] = useState<any[]>([]);
  const [adh, setAdh] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [sched, setSched] = useState<string[]>(['08:00', '20:00']);
  const [instructions, setInstructions] = useState('');

  async function load() {
    setToday(await api.medToday().catch(() => ({ doses: [], taken: 0, total: 0 })));
    setItems(await api.medItems().catch(() => []));
    setAdh(await api.medAdherence().catch(() => null));
    setHistory(await api.medHistory().catch(() => []));
  }
  useEffect(() => { load(); api.medCatalog().then(setCatalog).catch(() => undefined); }, []);

  async function add() {
    if (!name.trim() || !dose.trim() || sched.length === 0) return;
    await api.addMed({ name: name.trim(), dose: dose.trim(), schedule: sched, instructions: instructions.trim() || undefined });
    setName(''); setDose(''); setSched(['08:00', '20:00']); setInstructions(''); setOpen(false); load();
  }
  async function take(itemId: string, time: string) { await api.markIntake(itemId, time); load(); }
  async function remove(id: string) { await api.removeMed(id); load(); }
  const toggleTime = (t: string) => setSched((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t].sort()));

  const STATUS: Record<string, { l: string; c: string }> = {
    TAKEN: { l: 'Tomada ✓', c: 'var(--salvia)' },
    LATE: { l: 'Tomada (tarde)', c: 'var(--ambar)' },
    PENDING: { l: 'Pendiente', c: 'var(--azul)' },
    PENDING_LATE: { l: 'Atrasada', c: 'var(--sos)' },
  };

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div><h2>Mi medicación</h2><p>Tu plan de hoy y tu adherencia. Te ayudamos a no olvidarla.</p></div>
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}>＋ Agregar</button>
      </div>

      {/* Adherencia + resumen */}
      <div className="grid stack-mobile" style={{ gridTemplateColumns: '220px 1fr', marginBottom: 18 }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Ring pct={adh?.percent ?? 0} />
          <div><div className="muted" style={{ fontSize: 12 }}>Adherencia (7 días)</div><div style={{ fontFamily: 'Fraunces', fontSize: 18, color: 'var(--tinta)' }}>{adh?.taken ?? 0}/{adh?.expected ?? 0} dosis</div></div>
        </div>
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 4 }}>Hoy</h3>
          <p className="muted">{today.taken} de {today.total} dosis tomadas</p>
          <div style={{ height: 10, background: 'var(--niebla)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ height: '100%', width: `${today.total ? (today.taken / today.total) * 100 : 0}%`, background: 'var(--coral)', borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {/* Form agregar */}
      {open && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Agregar medicamento</h3>
          <div className="grid grid-2">
            <input className="field" style={{ marginTop: 0 }} list="medcat" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (ej. Sertralina)" />
            <datalist id="medcat">{catalog.map((c) => <option key={c.name} value={c.name} />)}</datalist>
            <input className="field" style={{ marginTop: 0 }} value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dosis (ej. 1 tableta · 50 mg)" />
          </div>
          <label className="muted" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>Horarios</label>
          <div className="chips">{TIMES.map((t) => <button key={t} className="chip" style={sched.includes(t) ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => toggleTime(t)}>{t}</button>)}</div>
          <input className="field" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Indicaciones (opcional, ej. con alimentos)" />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={add} disabled={!name.trim() || !dose.trim()}>Guardar medicamento</button>
        </div>
      )}

      {/* Plan de hoy */}
      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Plan de hoy</h3>
      <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
        {today.doses.map((d: any, i: number) => {
          const st = STATUS[d.status] ?? STATUS.PENDING;
          const done = d.status === 'TAKEN' || d.status === 'LATE';
          return (
            <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 50, textAlign: 'center', fontWeight: 700, color: 'var(--tinta)', fontFamily: 'Fraunces' }}>{d.time}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>💊 {d.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{d.dose}{d.instructions ? ` · ${d.instructions}` : ''}</div>
                </div>
              </div>
              {done
                ? <span className="badge" style={{ background: st.c }}>{st.l}</span>
                : <button className="btn btn-primary btn-sm" onClick={() => take(d.itemId, d.time)}>Tomé</button>}
            </div>
          );
        })}
        {today.doses.length === 0 && <p className="muted">No tienes medicación registrada. Agrégala con el botón de arriba.</p>}
      </div>

      {/* Mis medicamentos */}
      {items.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Mis medicamentos</h3>
          <div className="grid grid-3" style={{ marginBottom: 22 }}>
            {items.map((it) => (
              <div key={it.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b style={{ color: 'var(--tinta)' }}>💊 {it.name}</b>
                  <button className="link" onClick={() => remove(it.id)}>🗑️</button>
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{it.dose} · {(it.schedule ?? []).join(', ')}</div>
                {it.instructions && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{it.instructions}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Historial */}
      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Historial de tomas</h3>
      <div className="card">
        {history.slice(0, 12).map((h) => (
          <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span>{h.name} <span className="muted">· {h.dose}</span></span>
            <span className="muted">{new Date(h.scheduledFor).toLocaleString()} · {h.status === 'LATE' ? 'tarde' : 'tomada'}</span>
          </div>
        ))}
        {history.length === 0 && <p className="muted">Aún no hay tomas registradas.</p>}
      </div>
    </>
  );
}
