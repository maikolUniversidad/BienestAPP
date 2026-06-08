'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLogs(await api.audit(filter || undefined));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  if (error) return <div style={{ padding: 24, color: '#D64545' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Auditoría</h1>
      <p style={{ color: '#6B7A80' }}>Registro append-only de accesos y acciones (solo lectura).</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={{ padding: 8, border: '1px solid #ccc', borderRadius: 8 }}
          placeholder="Filtrar por acción (ej. callcenter)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button onClick={load} style={{ background: '#1E9E8A', color: 'white', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
          Buscar
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 12 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
            <th style={c}>Acción</th>
            <th style={c}>Recurso</th>
            <th style={c}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={c}>{l.action}</td>
              <td style={c}>{l.resource}</td>
              <td style={c}>{new Date(l.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {logs.length === 0 && <tr><td style={c} colSpan={3}>Sin registros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

const c: React.CSSProperties = { padding: 12 };
