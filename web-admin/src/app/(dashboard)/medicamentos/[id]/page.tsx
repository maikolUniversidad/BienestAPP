'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';

const TIMES = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];
const adhColor = (p: number) => (p >= 80 ? 'var(--salvia)' : p >= 60 ? 'var(--ambar)' : 'var(--sos)');

export default function PatientMeds() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [sched, setSched] = useState<string[]>(['08:00', '20:00']);
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setD(await api.medProPatient(id)); } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); api.medCatalog().then(setCatalog).catch(() => undefined); }, [id]);

  async function assign() {
    if (!name.trim() || !dose.trim() || sched.length === 0) return;
    await api.medProAssign(id, { name: name.trim(), dose: dose.trim(), schedule: sched, instructions: instructions.trim() || undefined });
    setName(''); setDose(''); setSched(['08:00', '20:00']); setInstructions(''); setOpen(false); load();
  }
  async function remove(itemId: string) { await api.medProRemove(itemId); load(); }
  const toggleTime = (t: string) => setSched((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t].sort()));

  if (error) return <p className="error">Error: {error}</p>;
  if (!d) return <p className="muted">Cargando…</p>;

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span className="link" onClick={() => router.push('/medicamentos')}>← Pacientes</span>
          <h2 style={{ marginTop: 6 }}>{d.name}</h2>
          <p>Adherencia 7 días: <b style={{ color: adhColor(d.adherence.percent) }}>{d.adherence.percent}%</b> ({d.adherence.taken}/{d.adherence.expected}) · {d.today.taken}/{d.today.total} hoy</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}>＋ Asignar medicamento</button>
      </div>

      {open && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Asignar medicamento</h3>
          <div className="grid grid-2">
            <input className="field" style={{ marginTop: 0 }} list="cat" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
            <datalist id="cat">{catalog.map((c) => <option key={c.name} value={c.name} />)}</datalist>
            <input className="field" style={{ marginTop: 0 }} value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dosis (ej. 50 mg)" />
          </div>
          <label className="muted" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>Horarios</label>
          <div className="chips">{TIMES.map((t) => <button key={t} className="chip" style={sched.includes(t) ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => toggleTime(t)}>{t}</button>)}</div>
          <input className="field" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Indicaciones (opcional)" />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={assign} disabled={!name.trim() || !dose.trim()}>Asignar</button>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Medicamentos activos</h3>
          {d.items.length === 0 && <p className="muted">Sin medicamentos asignados.</p>}
          <div style={{ display: 'grid', gap: 8 }}>
            {d.items.map((it: any) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div><b>💊 {it.name}</b> <span className="muted">· {it.dose} · {(it.schedule ?? []).join(', ')}</span>{it.instructions && <div className="muted" style={{ fontSize: 12 }}>{it.instructions}</div>}</div>
                <button className="link" onClick={() => remove(it.id)}>Quitar</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Historial reciente</h3>
          {(d.history ?? []).length === 0 && <p className="muted">Sin tomas registradas.</p>}
          {(d.history ?? []).slice(0, 12).map((h: any) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{h.name} <span className="muted">· {h.dose}</span></span>
              <span className="muted">{new Date(h.scheduledFor).toLocaleString()} · {h.status === 'LATE' ? 'tarde' : 'tomada'}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
