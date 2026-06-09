'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const ROLE_LABEL: Record<string, string> = {
  AFFILIATE: 'Afiliados', CALLCENTER_OPERATOR: 'Operadores', PSYCHOLOGIST: 'Psicólogos',
  PHYSICIAN: 'Médicos', EPS_ADMIN: 'Admins', AUDITOR: 'Auditores', SUPERADMIN: 'Superadmins',
};
const RISK_COLOR: Record<string, string> = { CRITICAL: '#C8453B', HIGH: '#E0913A', MEDIUM: '#5B7FB9', LOW: '#5E9B7E', NONE: '#8A8275' };

export default function Director() {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.director().then(setD).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">Error: {error}</p>;
  if (!d) return <p className="muted">Cargando…</p>;

  const totalRisk = d.riskDistribution.reduce((s: number, r: any) => s + r.count, 0) || 1;

  return (
    <>
      <div className="page-head"><h2>Tablero de dirección</h2><p>Indicadores institucionales agregados y anónimos.</p></div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <Stat ic="👥" label="Usuarios activos" value={d.users} />
        <Stat ic="⚠️" label="Alertas por revisar" value={d.pendingReview} />
        <Stat ic="📞" label="Casos abiertos" value={d.callCenter?.openCases ?? 0} />
        <Stat ic="📨" label="PQRS abiertas" value={d.pqrs?.open ?? 0} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Distribución de riesgo</h3>
          <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
            {d.riskDistribution.map((r: any) => r.count > 0 && (
              <div key={r.level} style={{ width: `${(r.count / totalRisk) * 100}%`, background: RISK_COLOR[r.level] }} title={`${r.level}: ${r.count}`} />
            ))}
          </div>
          {d.riskDistribution.map((r: any) => (
            <div key={r.level} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: RISK_COLOR[r.level], marginRight: 8 }} />{r.level}</span>
              <b>{r.count}</b>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Usuarios por rol</h3>
          {d.usersByRole.map((r: any) => (
            <div key={r.role} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{ROLE_LABEL[r.role] ?? r.role}</span><b>{r.count}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginTop: 18 }}>
        <Stat ic="📔" label="Entradas de diario" value={d.moduleUsage?.journal ?? 0} />
        <Stat ic="😊" label="Registros de ánimo" value={d.moduleUsage?.mood ?? 0} />
        <Stat ic="💬" label="Conversaciones IA" value={d.moduleUsage?.aiChat ?? 0} />
        <Stat ic="💊" label="Medicamentos activos" value={d.medications?.active ?? 0} />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>PQRS por estado</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          {d.pqrsByStatus.map((p: any) => (
            <div key={p.status}><div className="muted" style={{ fontSize: 13 }}>{p.status}</div><div style={{ fontFamily: 'Fraunces', fontSize: 22, color: 'var(--tinta)' }}>{p.count}</div></div>
          ))}
        </div>
      </div>
    </>
  );
}
function Stat({ ic, label, value }: { ic: string; label: string; value: number }) {
  return <div className="card stat"><div className="ic">{ic}</div><div className="lbl">{label}</div><div className="val">{value}</div></div>;
}
