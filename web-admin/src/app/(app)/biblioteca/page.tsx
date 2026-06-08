'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const ICONS: Record<string, string> = {
  breathing: '🌬️', meditation: '🧘', active_break: '🤸', gratitude: '🙏', education: '📚', video: '🎬', writing: '✍️', routine: '🏃',
};

export default function Biblioteca() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { api.content().then(setItems).catch(() => setItems([])); }, []);

  return (
    <>
      <div className="page-head"><h2>Biblioteca de actividades</h2><p>Respiración, meditación, pausas activas y educación en salud mental.</p></div>
      <div className="grid grid-3">
        {items.map((c) => (
          <div key={c.id} className="card hover">
            <div style={{ fontSize: 30 }}>{ICONS[c.type] ?? '🧩'}</div>
            <h3 style={{ color: 'var(--ink-2)', margin: '8px 0 4px' }}>{c.title}</h3>
            <p className="muted">{c.description}</p>
            {c.durationMin && <span className="badge-soft badge" style={{ marginTop: 10, display: 'inline-block' }}>{c.durationMin} min</span>}
          </div>
        ))}
        {items.length === 0 && <p className="muted">Biblioteca vacía.</p>}
      </div>
    </>
  );
}
