'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const TYPE_LABEL: Record<string, string> = { peticion: 'Petición', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia' };
const STATUS_LABEL: Record<string, string> = { new: 'Nuevo', in_progress: 'En proceso', resolved: 'Resuelto' };

export default function PqrsGestion() {
  const [items, setItems] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() { setItems(await api.adminPqrs().catch((e) => { setError(e.message); return []; })); }
  useEffect(() => { load(); }, []);

  async function update(status: string) {
    if (!sel) return;
    await api.managePqrs(sel.id, { status, response: response.trim() || undefined });
    setSel(null); setResponse(''); load();
  }

  if (error) return <p className="error">Error: {error}</p>;

  return (
    <>
      <div className="page-head"><h2>Gestión de PQRS</h2><p>Peticiones, quejas, reclamos y sugerencias de los usuarios.</p></div>

      <div className="grid" style={{ gridTemplateColumns: sel ? '1fr 1fr' : '1fr', gap: 16 }}>
        <div className="table-card" style={{ alignSelf: 'start' }}>
          <table>
            <thead><tr><th>Tipo</th><th>Asunto</th><th>Usuario</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer', background: sel?.id === p.id ? 'var(--durazno)' : '' }} onClick={() => { setSel(p); setResponse(p.response ?? ''); }}>
                  <td><span className="badge-soft badge">{TYPE_LABEL[p.type] ?? p.type}</span></td>
                  <td><b>{p.subject}</b></td>
                  <td className="muted">{p.name}</td>
                  <td><span className="badge" style={{ background: p.status === 'resolved' ? 'var(--salvia)' : p.status === 'in_progress' ? 'var(--azul)' : 'var(--ambar)' }}>{STATUS_LABEL[p.status]}</span></td>
                  <td className="muted">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5}><div className="empty">No hay PQRS.</div></td></tr>}
            </tbody>
          </table>
        </div>

        {sel && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>{sel.subject}</h3>
              <button className="link" onClick={() => setSel(null)}>Cerrar ✕</button>
            </div>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 10px' }}>{TYPE_LABEL[sel.type]} · {sel.name} · {new Date(sel.createdAt).toLocaleString()}</p>
            <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, marginBottom: 12 }}>{sel.body}</div>
            <label className="muted" style={{ fontSize: 12 }}>Respuesta</label>
            <textarea className="field" style={{ marginTop: 4, minHeight: 90 }} value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Escribe la respuesta al usuario…" />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => update('in_progress')}>En proceso</button>
              <button className="btn btn-primary btn-sm" onClick={() => update('resolved')}>Resolver y responder</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
