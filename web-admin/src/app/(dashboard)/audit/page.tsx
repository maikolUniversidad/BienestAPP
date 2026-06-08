'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setLogs(await api.audit(filter || undefined)); } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  if (error) return <p className="error">Error: {error}</p>;

  return (
    <>
      <div className="page-head">
        <h2>Auditoría</h2>
        <p>Registro append-only de accesos y acciones (solo lectura).</p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input className="field" style={{ marginTop: 0, maxWidth: 320 }} placeholder="Filtrar por acción (ej. callcenter)" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={load}>Buscar</button>
      </div>
      <div className="table-card">
        <table>
          <thead><tr><th>Acción</th><th>Recurso</th><th>Fecha</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td><span className="badge-soft badge">{l.action}</span></td>
                <td className="muted">{l.resource}</td>
                <td className="muted">{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={3}><div className="empty">Sin registros.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
