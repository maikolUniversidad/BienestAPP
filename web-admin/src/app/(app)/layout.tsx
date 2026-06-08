'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout, api } from '../../lib/api';
import { Hilo, Ico } from '../../components/brand';

const NAV = [
  { href: '/app', label: 'Inicio', ic: 'inicio' },
  { href: '/diario', label: 'Diario y ánimo', ic: 'diario' },
  { href: '/asistente', label: 'Asistente IA', ic: 'ia' },
  { href: '/habitos', label: 'Hábitos', ic: 'habits' },
  { href: '/alimentacion', label: 'Alimentación', ic: 'food' },
  { href: '/biblioteca', label: 'Biblioteca', ic: 'biblioteca' },
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
          <Hilo size={34} sprout="#9FD8B0" />
          <b>Bienest<span>APP</span></b>
        </div>
        <div className="nav-group-label">Mi bienestar</div>
        <nav style={{ display: 'grid', gap: 4 }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-item ${pathname === n.href ? 'active' : ''}`}>
              <span className="ic"><Ico k={n.ic} /></span>{n.label}
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
          <a className="link desktop-only" href="https://bienest-landing.vercel.app" target="_blank" rel="noreferrer">Ver landing ↗</a>
          <button className="icon-btn mobile-only" onClick={logout}>Salir</button>
        </header>
        <div className="content">{children}</div>
      </div>

      {/* Menú inferior (móvil) */}
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={pathname === n.href ? 'active' : ''}>
            <span className="ic"><Ico k={n.ic} /></span>
            <span>{n.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>

      {/* Botón SOS flotante (móvil) */}
      <button className="sos-fab" onClick={() => { setSent(null); setSos(true); }} aria-label="Botón SOS">SOS</button>

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
