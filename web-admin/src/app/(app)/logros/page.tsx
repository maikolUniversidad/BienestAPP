'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const RARITY: Record<string, string> = { common: 'var(--azul)', rare: 'var(--salvia)', epic: 'var(--coral)' };

export default function Logros() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.achievements().then(setData).catch(() => undefined); }, []);

  return (
    <>
      <div className="page-head"><h2>Mis logros</h2><p>Cada carta es un paso que diste por tu bienestar. 🌱</p></div>

      <div className="card" style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 70, height: 70, borderRadius: 18, background: 'linear-gradient(135deg, var(--tinta), var(--indigo-700))', color: '#fff', display: 'grid', placeItems: 'center', fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700 }}>
          {data?.level ?? 1}
        </div>
        <div>
          <div className="muted" style={{ fontSize: 13 }}>Nivel de bienestar</div>
          <div style={{ fontFamily: 'Fraunces', fontSize: 22, color: 'var(--tinta)' }}>Nivel {data?.level ?? 1}</div>
          <div className="muted" style={{ fontSize: 13 }}>Cartas: {data?.progress ?? '0/0'}</div>
        </div>
      </div>

      <div className="grid grid-3">
        {(data?.earned ?? []).map((c: any) => (
          <div key={c.id} className="card hover" style={{ borderTop: `4px solid ${RARITY[c.rarity] ?? 'var(--azul)'}` }}>
            <div style={{ fontSize: 30 }}>🏅</div>
            <h4 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '8px 0 4px' }}>{c.name}</h4>
            <p className="muted" style={{ fontSize: 13 }}>{c.description}</p>
            <span className="badge-soft badge" style={{ marginTop: 8, display: 'inline-block' }}>{c.rarity}</span>
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{c.earnedAt ? new Date(c.earnedAt).toLocaleDateString() : ''}</div>
          </div>
        ))}
        {(data?.earned ?? []).length === 0 && (
          <div className="card"><p className="muted">Aún no tienes cartas. Completa hábitos, escribe en tu diario o haz ejercicios para desbloquearlas. 🌟</p></div>
        )}
      </div>
    </>
  );
}
