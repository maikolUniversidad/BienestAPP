'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function Clinico() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    setAlerts(await api.clinicalAlerts().catch(() => []));
    setPatients(await api.clinicalPatients().catch((e) => { setError(e.message); return []; }));
  }
  useEffect(() => { load(); }, []);

  async function review(id: string) { await api.reviewAlert(id); load(); }

  if (error) return <p className="error">Error: {error}</p>;
  const pending = alerts.filter((a) => !a.reviewed);

  return (
    <>
      <div className="page-head"><h2>Tablero clínico</h2><p>Alertas de riesgo y seguimiento de pacientes. Acceso restringido y auditado.</p></div>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="ic">⚠️</div><div className="lbl">Alertas pendientes</div><div className="val">{pending.length}</div></div>
        <div className="card stat"><div className="ic">👥</div><div className="lbl">Pacientes</div><div className="val">{patients.length}</div></div>
        <div className="card stat"><div className="ic">🔴</div><div className="lbl">Riesgo crítico (pend.)</div><div className="val">{pending.filter((a) => a.level === 'CRITICAL').length}</div></div>
      </div>

      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Alertas de riesgo</h3>
      <div className="table-card" style={{ marginBottom: 24 }}>
        <table>
          <thead><tr><th>Nivel</th><th>Paciente</th><th>Origen</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td><span className={`badge ${a.level}`}>{a.level}</span></td>
                <td><b>{a.name}</b></td>
                <td className="muted">{a.source}</td>
                <td className="muted">{new Date(a.createdAt).toLocaleString()}</td>
                <td>{a.reviewed ? <span className="status">Revisada</span> : <span className="badge" style={{ background: 'var(--ambar)' }}>Pendiente</span>}</td>
                <td>
                  <span style={{ display: 'flex', gap: 10 }}>
                    <span className="link" onClick={() => router.push(`/clinico/${a.userId}`)}>Ver paciente</span>
                    {!a.reviewed && <span className="link" onClick={() => review(a.id)}>Marcar revisada</span>}
                  </span>
                </td>
              </tr>
            ))}
            {alerts.length === 0 && <tr><td colSpan={6}><div className="empty">Sin alertas de riesgo. 🌱</div></td></tr>}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '6px 0 12px' }}>Pacientes</h3>
      <div className="table-card">
        <table>
          <thead><tr><th>Paciente</th><th>Alertas abiertas</th><th>Último riesgo</th><th>Último ánimo</th><th></th></tr></thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.userId} style={{ cursor: 'pointer' }} onClick={() => router.push(`/clinico/${p.userId}`)}>
                <td><b>{p.name}</b></td>
                <td>{p.openAlerts > 0 ? <span className="badge" style={{ background: 'var(--sos)' }}>{p.openAlerts}</span> : <span className="muted">0</span>}</td>
                <td><span className={`badge ${p.lastRisk}`}>{p.lastRisk}</span></td>
                <td className="muted">{p.lastMood ?? '—'}</td>
                <td><span className="link">Abrir →</span></td>
              </tr>
            ))}
            {patients.length === 0 && <tr><td colSpan={5}><div className="empty">Sin pacientes.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
