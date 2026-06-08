'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Habitos() {
  const [habits, setHabits] = useState<any[]>([]);
  const [name, setName] = useState('');

  async function load() { setHabits(await api.habits().catch(() => [])); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    await api.createHabit(name.trim(), '⭐'); setName(''); load();
  }
  async function complete(id: string) { await api.logHabit(id); load(); }

  return (
    <>
      <div className="page-head"><h2>Mis hábitos</h2><p>Marca tus hábitos para subir tu racha y hacer evolucionar a Compi.</p></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="field" style={{ marginTop: 0, maxWidth: 320 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo hábito (ej. Tomar agua)" />
        <button className="btn btn-primary btn-sm" onClick={add}>Agregar</button>
      </div>
      <div className="grid grid-3">
        {habits.map((h) => (
          <div key={h.id} className="card hover">
            <div style={{ fontSize: 30 }}>{h.icon ?? '⭐'}</div>
            <h3 style={{ color: 'var(--ink-2)', margin: '8px 0 4px' }}>{h.name}</h3>
            <p className="muted">Racha: <b>{h.streak}</b> 🔥</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => complete(h.id)}>Marcar hecho hoy</button>
          </div>
        ))}
        {habits.length === 0 && <p className="muted">Aún no tienes hábitos. Agrega el primero.</p>}
      </div>
    </>
  );
}
