'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const RISK_COLOR: Record<string, string> = { CRITICAL: '#D64545', HIGH: '#ED9E3B' };

export default function Alerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.alerts().then(setAlerts).catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 24, color: '#D64545' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Alertas de riesgo</h1>
      <p style={{ color: '#6B7A80' }}>
        Acceso restringido a personal autorizado. Solo metadatos de riesgo (sin contenido del diario).
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, background: 'white', borderRadius: 12 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
            <th style={th}>Nivel</th>
            <th style={th}>Origen</th>
            <th style={th}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={td}>
                <span style={{ background: RISK_COLOR[a.level] ?? '#888', color: 'white', padding: '2px 8px', borderRadius: 8, fontSize: 12 }}>
                  {a.level}
                </span>
              </td>
              <td style={td}>{a.source}</td>
              <td style={td}>{new Date(a.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {alerts.length === 0 && (
            <tr><td style={td} colSpan={3}>No hay alertas pendientes de revisión.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { padding: 12 };
const td: React.CSSProperties = { padding: 12 };
