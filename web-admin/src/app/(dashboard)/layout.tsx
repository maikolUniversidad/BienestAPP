'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getRoles, logout } from '../../lib/api';
import { Hilo, Ico } from '../../components/brand';
import { NotificationsBell } from '../../components/notifications-bell';

const NAV = [
  { href: '/overview', label: 'Resumen', ic: 'dashboard', roles: ['EPS_ADMIN', 'SUPERADMIN', 'AUDITOR'] },
  { href: '/director', label: 'Dirección', ic: 'progreso', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/clinico', label: 'Clínico', ic: 'user', roles: ['PSYCHOLOGIST', 'PHYSICIAN', 'NUTRITIONIST', 'NURSE', 'SOCIAL_WORKER', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/callcenter', label: 'Call Center', ic: 'call', roles: ['CALLCENTER_OPERATOR', 'PSYCHOLOGIST', 'PHYSICIAN', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/medicamentos', label: 'Medicación', ic: 'med', roles: ['PSYCHOLOGIST', 'PHYSICIAN', 'NURSE', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/nutricion', label: 'Nutrición', ic: 'food', roles: ['NUTRITIONIST', 'PSYCHOLOGIST', 'PHYSICIAN', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/alerts', label: 'Alertas de riesgo', ic: 'alerts', roles: ['EPS_ADMIN', 'PSYCHOLOGIST', 'PHYSICIAN', 'SUPERADMIN'] },
  { href: '/usuarios', label: 'Usuarios', ic: 'users', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/encuestas', label: 'Encuestas', ic: 'tests', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/comunidad-admin', label: 'Comunidad', ic: 'comunidad', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/pqrs-gestion', label: 'PQRS', ic: 'pqrs', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/audit', label: 'Auditoría', ic: 'audit', roles: ['AUDITOR', 'SUPERADMIN'] },
  { href: '/admin-ti', label: 'Admin TI', ic: 'gear', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
];

const TITLES: Record<string, string> = {
  '/overview': 'Resumen general',
  '/director': 'Tablero de dirección',
  '/clinico': 'Tablero clínico',
  '/encuestas': 'Encuestas y quices',
  '/comunidad-admin': 'Comunidad',
  '/admin-ti': 'Administración TI',
  '/callcenter': 'Call Center',
  '/medicamentos': 'Medicación de pacientes',
  '/nutricion': 'Nutrición',
  '/usuarios': 'Gestión de usuarios',
  '/pqrs-gestion': 'Gestión de PQRS',
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
          <Hilo size={34} sprout="#9FD8B0" />
          <b>Bienest<span>APP</span></b>
        </div>
        <div className="nav-group-label">Operación</div>
        <nav style={{ display: 'grid', gap: 4 }}>
          {visible.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-item ${pathname.startsWith(n.href) ? 'active' : ''}`}>
              <span className="ic"><Ico k={n.ic} /></span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NotificationsBell />
            <button className="icon-btn" onClick={logout}>Salir</button>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>

      {/* Menú inferior (móvil) */}
      <nav className="bottom-nav">
        {visible.map((n) => (
          <Link key={n.href} href={n.href} className={pathname.startsWith(n.href) ? 'active' : ''}>
            <span className="ic"><Ico k={n.ic} /></span>
            <span>{n.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
