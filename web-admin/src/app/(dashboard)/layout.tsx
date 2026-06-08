'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getRoles, logout } from '../../lib/api';

const NAV = [
  { href: '/overview', label: 'Resumen', ic: '📊', roles: ['EPS_ADMIN', 'SUPERADMIN', 'AUDITOR'] },
  { href: '/callcenter', label: 'Call Center', ic: '📞', roles: ['CALLCENTER_OPERATOR', 'PSYCHOLOGIST', 'PHYSICIAN', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/alerts', label: 'Alertas de riesgo', ic: '🚨', roles: ['EPS_ADMIN', 'PSYCHOLOGIST', 'PHYSICIAN', 'SUPERADMIN'] },
  { href: '/audit', label: 'Auditoría', ic: '🗂️', roles: ['AUDITOR', 'SUPERADMIN'] },
];

const TITLES: Record<string, string> = {
  '/overview': 'Resumen general',
  '/callcenter': 'Call Center',
  '/alerts': 'Alertas de riesgo',
  '/audit': 'Auditoría',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    setRoles(getRoles());
    if (!window.localStorage.getItem('accessToken')) window.location.href = '/';
  }, []);

  const visible = NAV.filter((n) => n.roles.some((r) => roles.includes(r)));
  const title = Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1] ?? 'Panel';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo-ai.png" alt="" />
          <b>Bienest<span>APP</span></b>
        </div>
        <div className="nav-group-label">Operación</div>
        <nav style={{ display: 'grid', gap: 4 }}>
          {visible.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-item ${pathname.startsWith(n.href) ? 'active' : ''}`}>
              <span className="ic">{n.ic}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="foot">
          <div className="who">{roles.join(' · ') || '—'}</div>
          <button className="logout" onClick={logout}>Cerrar sesión</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <a className="link" href="https://bienest-landing.vercel.app" target="_blank" rel="noreferrer">Ver landing ↗</a>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
