'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const TYPES: [string, string][] = [
  ['habit', '🔁 Hábito'], ['emotional', '💛 Emocional'], ['physical', '🏃 Física'],
  ['sleep', '😴 Sueño'], ['nutrition', '🍎 Nutrición'], ['other', '✨ Otra'],
];
const FREQS: [string, string][] = [['daily', 'Diaria'], ['weekly', 'Semanal'], ['once', 'Una vez']];

export default function Metas() {
  const [goals, setGoals] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('habit');
  const [frequency, setFrequency] = useState('daily');

  async function load() { setGoals(await api.goals().catch(() => [])); }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!title.trim()) return;
    await api.createGoal({ title: title.trim(), type, frequency });
    setTitle(''); setOpen(false); load();
  }
  async function bump(g: any, delta: number) {
    const progress = Math.max(0, Math.min(100, (g.progress ?? 0) + delta));
    await api.updateGoal(g.id, { progress }); load();
  }
  async function remove(id: string) { await api.deleteGoal(id); load(); }

  const active = goals.filter((g) => g.status === 'active');
  const done = goals.filter((g) => g.status === 'completed');
  const typeEmoji = (t: string) => (TYPES.find((x) => x[0] === t)?.[1] ?? '✨').split(' ')[0];

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div><h2>Mis metas</h2><p>Pequeños objetivos que construyen tu proceso, a tu ritmo.</p></div>
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}>＋ Nueva meta</button>
      </div>

      {open && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Crear meta</h3>
          <input className="field" style={{ marginTop: 0 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Caminar 15 minutos al día" />
          <div className="grid grid-2" style={{ marginTop: 10 }}>
            <div>
              <label className="muted" style={{ fontSize: 12 }}>Tipo</label>
              <div className="chips">{TYPES.map(([k, l]) => <button key={k} className="chip" style={type === k ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => setType(k)}>{l}</button>)}</div>
            </div>
            <div>
              <label className="muted" style={{ fontSize: 12 }}>Frecuencia</label>
              <div className="chips">{FREQS.map(([k, l]) => <button key={k} className="chip" style={frequency === k ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => setFrequency(k)}>{l}</button>)}</div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={create} disabled={!title.trim()}>Guardar meta</button>
        </div>
      )}

      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Activas ({active.length})</h3>
      <div className="grid grid-2">
        {active.map((g) => (
          <div key={g.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{typeEmoji(g.type)} {g.title}</div>
              <button className="link" onClick={() => remove(g.id)} title="Archivar">🗑️</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0 6px' }}>
              <span className="muted" style={{ fontSize: 12 }}>{FREQS.find((f) => f[0] === g.frequency)?.[1]}</span>
              <span style={{ fontWeight: 700, color: 'var(--coral-deep)' }}>{g.progress}%</span>
            </div>
            <div style={{ height: 10, background: 'var(--niebla)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${g.progress}%`, background: 'var(--coral)', borderRadius: 999, transition: '.3s' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => bump(g, -10)}>−10%</button>
              <button className="btn btn-ghost btn-sm" onClick={() => bump(g, 10)}>+10%</button>
              <button className="btn btn-primary btn-sm" onClick={() => api.updateGoal(g.id, { progress: 100 }).then(load)}>Completar ✓</button>
            </div>
          </div>
        ))}
        {active.length === 0 && <p className="muted">Aún no tienes metas activas. Crea la primera 🌱</p>}
      </div>

      {done.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '22px 0 12px' }}>Completadas ({done.length})</h3>
          <div className="grid grid-3">
            {done.map((g) => (
              <div key={g.id} className="card" style={{ opacity: .8 }}>
                <div style={{ fontWeight: 700, color: 'var(--salvia-deep)' }}>✓ {typeEmoji(g.type)} {g.title}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>¡Logro alcanzado! 🎉</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
