'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getRoles, logout, api } from '../../lib/api';
import { Hilo, Ico } from '../../components/brand';
import { NotificationsBell } from '../../components/notifications-bell';
import { ThemeToggle } from '../../components/theme-toggle';

const NAV = [
  { href: '/overview', label: 'Resumen', ic: 'dashboard', group: 'Panel', roles: ['EPS_ADMIN', 'SUPERADMIN', 'AUDITOR'] },
  { href: '/director', label: 'Dirección', ic: 'progreso', group: 'Panel', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/mapa-salud', label: 'Mapa de salud', ic: 'mapa', group: 'Panel', roles: ['EPS_ADMIN', 'SUPERADMIN'] },

  { href: '/clinico', label: 'Clínico', ic: 'user', group: 'Asistencial', roles: ['PSYCHOLOGIST', 'PHYSICIAN', 'NUTRITIONIST', 'NURSE', 'SOCIAL_WORKER', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/gestion-salud', label: 'Gestión Salud (HIS)', ic: 'his', group: 'Asistencial', roles: ['PHYSICIAN', 'PSYCHOLOGIST', 'NURSE', 'NUTRITIONIST', 'SOCIAL_WORKER', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/hospitalizacion', label: 'Hospitalización y Urgencias', ic: 'cama', group: 'Asistencial', roles: ['PHYSICIAN', 'NURSE', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/asistencial', label: 'Diagnósticos y domiciliaria', ic: 'dx', group: 'Asistencial', roles: ['PHYSICIAN', 'NURSE', 'NUTRITIONIST', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/campo', label: 'Mi atención de campo', ic: 'mapa', group: 'Asistencial', roles: ['FIELD_DOCTOR'] },
  { href: '/medicamentos', label: 'Medicación', ic: 'med', group: 'Asistencial', roles: ['PSYCHOLOGIST', 'PHYSICIAN', 'NURSE', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/nutricion', label: 'Nutrición', ic: 'food', group: 'Asistencial', roles: ['NUTRITIONIST', 'PSYCHOLOGIST', 'PHYSICIAN', 'EPS_ADMIN', 'SUPERADMIN'] },

  { href: '/facturacion', label: 'Facturación y RIPS', ic: 'factura', group: 'Administrativo', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/inventario', label: 'Inventario', ic: 'inventario', group: 'Administrativo', roles: ['EPS_ADMIN', 'SUPERADMIN', 'NURSE', 'PHYSICIAN'] },
  { href: '/reportes', label: 'Reportes', ic: 'reportes', group: 'Administrativo', roles: ['EPS_ADMIN', 'SUPERADMIN', 'AUDITOR'] },

  { href: '/callcenter', label: 'Call Center', ic: 'call', group: 'Atención', roles: ['CALLCENTER_OPERATOR', 'PSYCHOLOGIST', 'PHYSICIAN', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/agenda', label: 'Agenda y videollamadas', ic: 'cita', group: 'Atención', roles: ['PHYSICIAN', 'PSYCHOLOGIST', 'NUTRITIONIST', 'NURSE', 'SOCIAL_WORKER', 'CALLCENTER_OPERATOR', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/chat', label: 'Chat del equipo', ic: 'chat', group: 'Atención', roles: ['CALLCENTER_OPERATOR', 'PSYCHOLOGIST', 'PHYSICIAN', 'NUTRITIONIST', 'NURSE', 'SOCIAL_WORKER', 'FIELD_DOCTOR', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/mensajes', label: 'Mensajería (CRM)', ic: 'mail', group: 'Atención', roles: ['CALLCENTER_OPERATOR', 'PSYCHOLOGIST', 'PHYSICIAN', 'NUTRITIONIST', 'NURSE', 'SOCIAL_WORKER', 'EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/alerts', label: 'Alertas de riesgo', ic: 'alerts', group: 'Atención', roles: ['EPS_ADMIN', 'PSYCHOLOGIST', 'PHYSICIAN', 'SUPERADMIN'] },

  { href: '/usuarios', label: 'Usuarios', ic: 'users', group: 'Gestión', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/roles-acceso', label: 'Roles y accesos', ic: 'gear', group: 'Gestión', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/encuestas', label: 'Encuestas', ic: 'tests', group: 'Gestión', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/comunidad-admin', label: 'Comunidad', ic: 'comunidad', group: 'Gestión', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/pqrs-gestion', label: 'PQRS', ic: 'pqrs', group: 'Gestión', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/conocimiento', label: 'Base de conocimiento IA', ic: 'kb', group: 'Gestión', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/notificaciones-admin', label: 'Notificaciones', ic: 'bell', group: 'Gestión', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
  { href: '/documentos-admin', label: 'Gestión documental', ic: 'firma', group: 'Gestión', roles: ['EPS_ADMIN', 'SUPERADMIN'] },

  { href: '/audit', label: 'Auditoría', ic: 'audit', group: 'Sistema', roles: ['AUDITOR', 'SUPERADMIN'] },
  { href: '/admin-ti', label: 'Admin TI', ic: 'gear', group: 'Sistema', roles: ['EPS_ADMIN', 'SUPERADMIN'] },
];
const GROUPS = ['Panel', 'Asistencial', 'Administrativo', 'Atención', 'Gestión', 'Sistema'];

const TITLES: Record<string, string> = {
  '/overview': 'Resumen general',
  '/director': 'Tablero de dirección',
  '/clinico': 'Tablero clínico',
  '/encuestas': 'Encuestas y quices',
  '/comunidad-admin': 'Comunidad',
  '/admin-ti': 'Administración TI',
  '/conocimiento': 'Base de conocimiento IA',
  '/agenda': 'Agenda y videollamadas',
  '/chat': 'Chat del equipo',
  '/gestion-salud': 'Gestión Salud (HIS)',
  '/hospitalizacion': 'Hospitalización y Urgencias',
  '/asistencial': 'Diagnósticos y domiciliaria',
  '/facturacion': 'Facturación y RIPS',
  '/inventario': 'Inventario',
  '/reportes': 'Reportes',
  '/mensajes': 'Mensajería (CRM)',
  '/notificaciones-admin': 'Centro de notificaciones',
  '/documentos-admin': 'Gestión documental',
  '/callcenter': 'Call Center',
  '/medicamentos': 'Medicación de pacientes',
  '/nutricion': 'Nutrición',
  '/usuarios': 'Gestión de usuarios',
  '/pqrs-gestion': 'Gestión de PQRS',
  '/alerts': 'Alertas de riesgo',
  '/audit': 'Auditoría',
  '/mapa-salud': 'Mapa de salud',
  '/campo': 'Mi atención de campo',
  '/roles-acceso': 'Roles y accesos',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const [roles, setRoles] = useState<string[]>([]);
  const [disabled, setDisabled] = useState<string[]>([]);

  useEffect(() => {
    setRoles(getRoles());
    if (!window.localStorage.getItem('accessToken')) window.location.href = '/';
    api.rbacMyDisabled().then((r) => setDisabled(r.disabled ?? [])).catch(() => setDisabled([]));
  }, []);

  const visible = NAV.filter((n) => n.roles.some((r) => roles.includes(r)) && !disabled.includes(n.href.slice(1)));
  const title = Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1] ?? 'Panel';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Hilo size={34} sprout="#9FD8B0" />
          <b>Bienest<span>APP</span></b>
        </div>
        <nav className="nav-scroll">
          {GROUPS.map((g) => {
            const items = visible.filter((n) => n.group === g);
            if (!items.length) return null;
            return (
              <div key={g}>
                <div className="nav-group-label">{g}</div>
                <div style={{ display: 'grid', gap: 3 }}>
                  {items.map((n) => (
                    <Link key={n.href} href={n.href} className={`nav-item ${pathname.startsWith(n.href) ? 'active' : ''}`}>
                      <span className="ic"><Ico k={n.ic} /></span>
                      {n.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
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
            <ThemeToggle />
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
