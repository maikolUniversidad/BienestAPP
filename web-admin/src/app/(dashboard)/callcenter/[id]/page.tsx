'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<any>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setC(await api.getCase(id)); } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, [id]);

  async function act(fn: () => Promise<unknown>) {
    try { await fn(); await load(); } catch (e: any) { setError(e.message); }
  }

  if (error) return <p className="error">Error: {error}</p>;
  if (!c) return <p className="muted">Cargando…</p>;

  const prof = c.ticket?.user?.profile;
  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span className="link" onClick={() => router.push('/callcenter')}>← Cola</span>
          <h2 style={{ marginTop: 6 }}>
            Caso #{c.id.slice(-6)}{' '}
            <span className={`badge ${c.ticket?.riskLevel}`}>{c.ticket?.riskLevel}</span>{' '}
            <span className="status">{c.status}</span>
          </h2>
          <p>{c.ticket?.type} · prioridad {c.priority} · {prof ? `${prof.firstName} ${prof.lastName}` : 'Afiliado'}</p>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: 14, color: 'var(--ink-2)' }}>Acciones</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => act(() => api.setCaseStatus(id, 'IN_PROGRESS'))}>Tomar caso</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.escalate(id, 'psychologist'))}>Escalar a psicólogo</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.escalate(id, 'physician'))}>Escalar a médico</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.logCall(id, 0, 'Llamada registrada'))}>Registrar llamada</button>
            <button className="btn btn-danger btn-sm" onClick={() => act(() => api.setCaseStatus(id, 'CLOSED'))}>Cerrar caso</button>
          </div>

          <h3 style={{ margin: '22px 0 12px', color: 'var(--ink-2)' }}>Notas internas</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" style={{ marginTop: 0 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar nota…" />
            <button className="btn btn-primary btn-sm" onClick={() => act(async () => { await api.addNote(id, note); setNote(''); })}>Guardar</button>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {(c.notes ?? []).map((n: any) => (
              <div key={n.id} style={{ background: '#FAFCFB', borderRadius: 10, padding: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString()}</div>
                {n.body}
              </div>
            ))}
            {(c.notes ?? []).length === 0 && <p className="muted">Sin notas.</p>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 14, color: 'var(--ink-2)' }}>Registro de llamadas</h3>
          {(c.callLogs ?? []).map((l: any) => (
            <div key={l.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="muted">{new Date(l.createdAt).toLocaleString()}</span> — {l.outcome ?? '—'} ({l.durationSec ?? 0}s)
            </div>
          ))}
          {(c.callLogs ?? []).length === 0 && <p className="muted">Sin llamadas registradas.</p>}
          {c.escalatedTo && <p style={{ marginTop: 14 }}>Escalado a: <b>{c.escalatedTo}</b></p>}
        </div>
      </div>
    </>
  );
}
