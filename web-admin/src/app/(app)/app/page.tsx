'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

export default function AffiliateHome() {
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    api.dashboard().then(setD).catch(() => undefined);
  }, []);

  return (
    <>
      <div className="page-head">
        <h2>Tu bienestar de hoy</h2>
        <p>Un vistazo a tu ánimo, hábitos y recomendaciones.</p>
      </div>

      {d?.alerts?.length > 0 && (
        <div className="crisis-banner">
          <h4>⚠️ Acompañamiento en curso</h4>
          <p className="muted">{d.alerts[0].message}</p>
        </div>
      )}

      <div className="grid grid-4">
        <div className="card stat"><div className="ic">😊</div><div className="lbl">Ánimo de hoy</div><div className="val" style={{ fontSize: 20 }}>{d?.moodToday ? `${d.moodToday.label}` : 'Sin registro'}</div></div>
        <div className="card stat"><div className="ic">🔥</div><div className="lbl">Racha de hábitos</div><div className="val">{d?.habitStreak ?? 0}</div></div>
        <div className="card stat"><div className="ic">🐾</div><div className="lbl">{d?.pet?.name ?? 'Compi'}</div><div className="val" style={{ fontSize: 20 }}>Nv {d?.pet?.level ?? 1} · 😊{d?.pet?.happiness ?? 50}</div></div>
        <div className="card stat"><div className="ic">🏅</div><div className="lbl">Logros</div><div className="val">{d?.achievementsCount ?? 0}</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h3 style={{ color: 'var(--ink-2)', marginBottom: 12 }}>Recomendado para ti</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(d?.recommendations ?? []).map((r: string, i: number) => (
              <span key={i} className="chip" style={{ cursor: 'default' }}>{r}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary btn-sm" href="/diario">Registrar mi día</Link>
            <Link className="btn btn-ghost btn-sm" href="/asistente">Hablar con el asistente</Link>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/mascota.png" alt="Compi" style={{ width: 110 }} />
          <div>
            <h3 style={{ color: 'var(--ink-2)' }}>{d?.pet?.name ?? 'Compi'} te acompaña</h3>
            <p className="muted">Cumple hábitos saludables para que evolucione contigo. Sin presión, a tu ritmo.</p>
          </div>
        </div>
      </div>
    </>
  );
}
