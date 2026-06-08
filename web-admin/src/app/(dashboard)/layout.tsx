'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getRoles, logout } from '../../lib/api';

const NAV = [
  { href: '/overview', label: 'Resumen', roles: ['EPS_ADMIN', 'SUPERADMIN', 'AUDITOR'] },
  {
    href: '/callcenter',
    label: 'Call Center',
    roles: ['CALLCENTER_OPERATOR', 'PSYCHOLOGIST', 'PHYSICIAN', 'EPS_ADMIN', 'SUPERADMIN'],
  },
  {
    href: '/alerts',
    label: 'Alertas de riesgo',
    roles: ['EPS_ADMIN', 'PSYCHOLOGIST', 'PHYSICIAN', 'SUPERADMIN'],
  },
  { href: '/audit', label: 'Auditoría', roles: ['AUDITOR', 'SUPERADMIN'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const r = getRoles();
    setRoles(r);
    if (!window.localStorage.getItem('accessToken')) window.location.href = '/';
  }, []);

  const visible = NAV.filter((n) => n.roles.some((r) => roles.includes(r)));

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={S.sidebar}>
        <div style={S.brand}>BienestAPP</div>
        <div style={S.brandSub}>Nueva EPS</div>
        <nav style={{ marginTop: 24, display: 'grid', gap: 4 }}>
          {visible.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              style={{
                ...S.navItem,
                ...(pathname?.startsWith(n.href) ? S.navItemActive : {}),
              }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} style={S.logout}>
          Cerrar sesión
        </button>
        <div style={S.roles}>{roles.join(' · ') || '—'}</div>
      </aside>
      <main style={{ flex: 1, background: '#F5F7F8' }}>{children}</main>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 240,
    background: '#11302B',
    color: 'white',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  brand: { fontSize: 22, fontWeight: 800, color: '#5FE3C9' },
  brandSub: { fontSize: 12, color: '#9FC5BC' },
  navItem: {
    color: '#CFE6E0',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 15,
  },
  navItemActive: { background: '#1E9E8A', color: 'white', fontWeight: 600 },
  logout: {
    marginTop: 'auto',
    background: 'transparent',
    color: '#9FC5BC',
    border: '1px solid #2A4D46',
    borderRadius: 8,
    padding: 10,
    cursor: 'pointer',
  },
  roles: { fontSize: 11, color: '#6E938B', marginTop: 12 },
};
