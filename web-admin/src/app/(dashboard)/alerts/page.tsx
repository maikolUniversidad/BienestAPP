'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.alerts().then(setAlerts).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">Error: {error}</p>;

  return (
    <>
      <div className="page-head">
        <h2>Alertas de riesgo</h2>
        <p>Acceso restringido. Solo metadatos de riesgo — sin contenido del diario.</p>
      </div>
      <div className="table-card">
        <table>
          <thead><tr><th>Nivel</th><th>Origen</th><th>Fecha</th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td><span className={`badge ${a.level}`}>{a.level}</span></td>
                <td>{a.source}</td>
                <td className="muted">{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {alerts.length === 0 && <tr><td colSpan={3}><div className="empty">Sin alertas pendientes de revisión.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
