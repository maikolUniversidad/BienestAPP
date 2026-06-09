'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

const adhColor = (p: number) => (p >= 80 ? 'var(--salvia)' : p >= 60 ? 'var(--ambar)' : 'var(--sos)');

export default function Medicamentos() {
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.medProPatients().then(setPatients).catch((e) => setError(e.message));
    api.medProAlerts().then(setAlerts).catch(() => undefined);
  }, []);

  if (error) return <p className="error">Error: {error}</p>;

  return (
    <>
      <div className="page-head"><h2>Medicación de pacientes</h2><p>Adherencia y alertas. Ordenado por menor adherencia primero.</p></div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--sos)' }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--sos)', marginBottom: 8 }}>⚠️ Alertas de no-adherencia ({alerts.length})</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {alerts.map((a) => (
              <button key={a.userId} className="chip" style={{ background: '#FBEAE8', color: 'var(--sos)' }} onClick={() => router.push(`/medicamentos/${a.userId}`)}>
                {a.name} · {a.percent}%{a.lateToday > 0 ? ` · ${a.lateToday} atrasada(s)` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead><tr><th>Paciente</th><th>Adherencia (7d)</th><th>Medicamentos</th><th>Dosis</th><th></th></tr></thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.userId} style={{ cursor: 'pointer' }} onClick={() => router.push(`/medicamentos/${p.userId}`)}>
                <td><b>{p.name}</b></td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 60, height: 8, background: 'var(--niebla)', borderRadius: 999, overflow: 'hidden', display: 'inline-block' }}>
                      <span style={{ display: 'block', height: '100%', width: `${p.percent}%`, background: adhColor(p.percent) }} />
                    </span>
                    <b style={{ color: adhColor(p.percent) }}>{p.percent}%</b>
                  </span>
                </td>
                <td>{p.activeItems}</td>
                <td className="muted">{p.taken}/{p.expected}</td>
                <td><span className="link">Ver →</span></td>
              </tr>
            ))}
            {patients.length === 0 && <tr><td colSpan={5}><div className="empty">Aún no hay pacientes con medicación registrada.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
