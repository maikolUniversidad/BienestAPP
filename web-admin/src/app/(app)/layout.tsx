'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout, api } from '../../lib/api';

const NAV = [
  { href: '/app', label: 'Inicio', ic: '🏠' },
  { href: '/diario', label: 'Diario y ánimo', ic: '📔' },
  { href: '/asistente', label: 'Asistente IA', ic: '💬' },
  { href: '/habitos', label: 'Hábitos', ic: '🔥' },
  { href: '/alimentacion', label: 'Alimentación', ic: '🍎' },
  { href: '/biblioteca', label: 'Biblioteca', ic: '🧘' },
];

const SOS_TYPES: [string, string][] = [
  ['MEDICAL', 'Emergencia médica'],
  ['EMOTIONAL_CRISIS', 'Crisis emocional'],
  ['ACCIDENT', 'Accidente'],
  ['VIOLENCE', 'Violencia'],
  ['OTHER', 'Otro'],
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [sos, setSos] = useState(false);
  const [sent, setSent] = useState<any>(null);

  useEffect(() => {
    if (!window.localStorage.getItem('accessToken')) window.location.href = '/';
  }, []);

  async function trigger(type: string) {
    try { setSent(await api.sos(type)); } catch { setSent({ error: true }); }
  }

  return (
    <div className="shell affiliate">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-ai.png" alt="" />
          <b>Bienest<span style={{ color: '#11302B' }}>APP</span></b>
        </div>
        <div className="nav-group-label" style={{ color: 'rgba(255,255,255,.6)' }}>Mi bienestar</div>
        <nav style={{ display: 'grid', gap: 4 }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-item ${pathname === n.href ? 'active' : ''}`}>
              <span className="ic">{n.ic}</span>{n.label}
            </Link>
          ))}
        </nav>
        <div className="foot">
          <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }} onClick={() => { setSent(null); setSos(true); }}>
            🆘 Botón SOS
          </button>
          <button className="logout" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h1>Hola 👋</h1>
          <a className="link" href="https://bienest-landing.vercel.app" target="_blank" rel="noreferrer">Ver landing ↗</a>
        </header>
        <div className="content">{children}</div>
      </div>

      {sos && (
        <div style={overlay} onClick={() => setSos(false)}>
          <div className="card" style={{ width: 420, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
            {!sent ? (
              <>
                <h3 style={{ color: 'var(--ink-2)', marginBottom: 12 }}>¿Qué tipo de emergencia?</h3>
                <div style={{ display: 'grid', gap: 8 }}>
                  {SOS_TYPES.map(([k, l]) => (
                    <button key={k} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => trigger(k)}>{l}</button>
                  ))}
                </div>
                <button className="link" style={{ marginTop: 12 }} onClick={() => setSos(false)}>Cancelar</button>
              </>
            ) : (
              <>
                <h3 style={{ color: 'var(--ink-2)' }}>Estamos contigo</h3>
                <p className="muted" style={{ margin: '8px 0 12px' }}>Tu solicitud fue registrada y un operador te atenderá. Si es vital, llama ya:</p>
                <div className="crisis-banner" style={{ margin: 0 }}>
                  <div className="lines">
                    <span className="pill-line">Emergencias 123</span>
                    <span className="pill-line">Salud mental 106</span>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setSos(false)}>Cerrar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(14,37,33,.55)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 20,
};
