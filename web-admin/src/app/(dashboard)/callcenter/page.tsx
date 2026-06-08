'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function CallCenterQueue() {
  const [cases, setCases] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function load() {
    try {
      setCases(await api.queue());
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, []);

  if (error) return <p className="error">Error: {error}</p>;

  return (
    <>
      <div className="page-head">
        <h2>Cola de casos</h2>
        <p>Priorizada por riesgo · se actualiza cada 10s.</p>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Prioridad</th><th>Riesgo</th><th>Tipo</th><th>Afiliado</th><th>Estado</th><th>Creado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/callcenter/${c.id}`)}>
                <td><b>{c.priority}</b></td>
                <td><span className={`badge ${c.ticket?.riskLevel}`}>{c.ticket?.riskLevel}</span></td>
                <td>{c.ticket?.type}</td>
                <td>{c.ticket?.user?.profile ? `${c.ticket.user.profile.firstName} ${c.ticket.user.profile.lastName}` : '—'}</td>
                <td><span className="status">{c.status}</span></td>
                <td className="muted">{new Date(c.ticket?.createdAt).toLocaleString()}</td>
                <td><span className="link">Abrir →</span></td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr><td colSpan={7}><div className="empty">No hay casos abiertos. 🎉</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
