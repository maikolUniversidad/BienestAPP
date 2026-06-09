'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const ROLE_LABEL: Record<string, string> = {
  AFFILIATE: 'Afiliado', CALLCENTER_OPERATOR: 'Operador call center', PSYCHOLOGIST: 'Psicólogo',
  PHYSICIAN: 'Médico', EPS_ADMIN: 'Administrador EPS', AUDITOR: 'Auditor', SUPERADMIN: 'Superadministrador',
};

export default function AdminTI() {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.rbac().then(setD).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">Error: {error}</p>;
  if (!d) return <p className="muted">Cargando…</p>;

  return (
    <>
      <div className="page-head"><h2>Administración TI</h2><p>Roles, permisos y módulos del sistema.</p></div>

      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Roles y permisos</h3>
      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {d.roles.map((r: any) => (
          <div key={r.name} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ color: 'var(--tinta)' }}>{ROLE_LABEL[r.name] ?? r.name}</b>
              <span className="badge-soft badge">{r.userCount} usuario(s)</span>
            </div>
            <div style={{ marginTop: 8 }}>
              {r.permissions.length === 0 ? <span className="muted" style={{ fontSize: 13 }}>Permisos por rol (RBAC base)</span>
                : r.permissions.map((p: string) => <span key={p} className="badge-soft badge" style={{ marginRight: 4, marginBottom: 4, display: 'inline-block' }}>{p}</span>)}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Módulos del sistema</h3>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {d.modules.map((m: string) => (
            <span key={m} className="chip" style={{ cursor: 'default' }}>🟢 {m}</span>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Todos los módulos activos. La gestión de roles por usuario se realiza en «Usuarios».</p>
      </div>
    </>
  );
}
