'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

function Ring({ value, goal, color }: { value: number; goal: number; color: string }) {
  const pct = Math.min(100, (value / goal) * 100);
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="var(--niebla)" strokeWidth="7" />
      <circle cx="35" cy="35" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 35 35)" style={{ transition: '.4s' }} />
    </svg>
  );
}

export default function Habitos() {
  const [today, setToday] = useState<any>({ steps: 0, activeMinutes: 0, sleepHours: 0, water: 0 });
  const [habits, setHabits] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [sleep, setSleep] = useState('7');

  async function load() {
    setToday(await api.exerciseToday().catch(() => ({ steps: 0, activeMinutes: 0, sleepHours: 0, water: 0 })));
    setHabits(await api.habits().catch(() => []));
  }
  useEffect(() => { load(); }, []);

  async function addWater() { await api.logExercise('water', 1, 'vaso'); load(); }
  async function addActivity(min: number) { await api.logExercise('activity', min, 'min'); load(); }
  async function logSleep() { const h = parseFloat(sleep); if (h > 0) { await api.logExercise('sleep', h, 'horas'); load(); } }
  async function addHabit() { if (!name.trim()) return; await api.createHabit(name.trim(), '⭐'); setName(''); load(); }
  async function completeHabit(id: string) { await api.logHabit(id); load(); }

  return (
    <>
      <div className="page-head"><h2>Hábitos de hoy</h2><p>Pequeñas acciones que construyen grandes cambios. A tu ritmo.</p></div>

      {/* Trackers especializados */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {/* Hidratación */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>💧 Hidratación</h3><p className="muted" style={{ fontSize: 13 }}>{today.water} / 8 vasos</p></div>
            <Ring value={today.water} goal={8} color="var(--azul)" />
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={addWater}>＋ Un vaso de agua</button>
        </div>

        {/* Actividad */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>🤸 Actividad</h3><p className="muted" style={{ fontSize: 13 }}>{today.activeMinutes} / 30 min</p></div>
            <Ring value={today.activeMinutes} goal={30} color="var(--salvia)" />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            {[10, 20, 30].map((m) => <button key={m} className="btn btn-ghost btn-sm" onClick={() => addActivity(m)}>+{m}m</button>)}
          </div>
        </div>

        {/* Sueño */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>😴 Sueño</h3><p className="muted" style={{ fontSize: 13 }}>{today.sleepHours} / 8 horas</p></div>
            <Ring value={today.sleepHours} goal={8} color="var(--coral)" />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input className="field" style={{ marginTop: 0, width: 70 }} type="number" min={0} max={14} step={0.5} value={sleep} onChange={(e) => setSleep(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={logSleep}>Registrar</button>
          </div>
        </div>
      </div>

      {/* Hábitos personalizados */}
      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Mis hábitos</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input className="field" style={{ marginTop: 0, maxWidth: 320 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo hábito (ej. Meditar)" />
        <button className="btn btn-primary btn-sm" onClick={addHabit}>Agregar</button>
      </div>
      <div className="grid grid-3">
        {habits.map((h) => (
          <div key={h.id} className="card hover">
            <div style={{ fontSize: 28 }}>{h.icon ?? '⭐'}</div>
            <h4 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '8px 0 4px' }}>{h.name}</h4>
            <p className="muted">Racha: <b>{h.streak}</b> 🔥</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => completeHabit(h.id)}>Marcar hecho hoy</button>
          </div>
        ))}
        {habits.length === 0 && <p className="muted">Agrega tu primer hábito personalizado.</p>}
      </div>
    </>
  );
}
