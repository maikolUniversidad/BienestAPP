'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const RISK_COLOR: Record<string, string> = {
  CRITICAL: '#D64545',
  HIGH: '#ED9E3B',
  MEDIUM: '#3B6EA5',
  LOW: '#1E9E8A',
  NONE: '#888',
};

export default function CallCenterQueue() {
  const [cases, setCases] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setCases(await api.queue());
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000); // refresco de la cola (WebSocket en v2)
    return () => clearInterval(t);
  }, []);

  if (error) return <p style={{ color: '#D64545' }}>Error: {error}</p>;

  return (
    <main style={{ padding: 24 }}>
      <h1>Cola de casos — Call Center</h1>
      <p style={{ color: '#666' }}>Priorizada por riesgo. Casos abiertos.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
            <th>Prioridad</th>
            <th>Riesgo</th>
            <th>Tipo</th>
            <th>Afiliado</th>
            <th>Estado</th>
            <th>Creado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td>{c.priority}</td>
              <td>
                <span
                  style={{
                    background: RISK_COLOR[c.ticket?.riskLevel] ?? '#888',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  {c.ticket?.riskLevel}
                </span>
              </td>
              <td>{c.ticket?.type}</td>
              <td>
                {c.ticket?.user?.profile
                  ? `${c.ticket.user.profile.firstName} ${c.ticket.user.profile.lastName}`
                  : '—'}
              </td>
              <td>{c.status}</td>
              <td>{new Date(c.ticket?.createdAt).toLocaleString()}</td>
              <td>
                <a href={`/callcenter/${c.id}`}>Abrir</a>
              </td>
            </tr>
          ))}
          {cases.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: 16, color: '#888' }}>
                No hay casos abiertos.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
