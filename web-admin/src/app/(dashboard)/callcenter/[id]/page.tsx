'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';

const RISK_COLOR: Record<string, string> = {
  CRITICAL: '#D64545',
  HIGH: '#ED9E3B',
  MEDIUM: '#3B6EA5',
  LOW: '#1E9E8A',
  NONE: '#888',
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<any>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setC(await api.getCase(id));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (error) return <div style={{ padding: 24, color: '#D64545' }}>Error: {error}</div>;
  if (!c) return <div style={{ padding: 24 }}>Cargando…</div>;

  const prof = c.ticket?.user?.profile;
  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <button onClick={() => router.push('/callcenter')} style={B.link}>
        ← Volver a la cola
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <h1 style={{ margin: 0 }}>Caso #{c.id.slice(-6)}</h1>
        <span style={{ ...B.badge, background: RISK_COLOR[c.ticket?.riskLevel] ?? '#888' }}>
          {c.ticket?.riskLevel}
        </span>
        <span style={B.status}>{c.status}</span>
      </div>
      <p style={{ color: '#555' }}>
        {c.ticket?.type} · prioridad {c.priority} ·{' '}
        {prof ? `${prof.firstName} ${prof.lastName}` : 'Afiliado'}
      </p>

      {/* Acciones */}
      <div style={B.card}>
        <h3>Acciones</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={B.btn} onClick={() => act(() => api.setCaseStatus(id, 'IN_PROGRESS'))}>
            Tomar (En atención)
          </button>
          <button style={B.btn} onClick={() => act(() => api.escalate(id, 'psychologist'))}>
            Escalar a psicólogo
          </button>
          <button style={B.btn} onClick={() => act(() => api.escalate(id, 'physician'))}>
            Escalar a médico
          </button>
          <button style={B.btn} onClick={() => act(() => api.escalate(id, 'emergency_line'))}>
            Escalar a línea
          </button>
          <button style={B.btnDanger} onClick={() => act(() => api.setCaseStatus(id, 'CLOSED'))}>
            Cerrar caso
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <button style={B.btnGhost} onClick={() => act(() => api.logCall(id, 0, 'Llamada registrada'))}>
            + Registrar llamada
          </button>
        </div>
      </div>

      {/* Notas */}
      <div style={B.card}>
        <h3>Notas internas</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={B.input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Agregar nota interna…"
          />
          <button
            style={B.btn}
            onClick={() =>
              act(async () => {
                await api.addNote(id, note);
                setNote('');
              })
            }
          >
            Guardar
          </button>
        </div>
        <ul style={{ marginTop: 12 }}>
          {(c.notes ?? []).map((n: any) => (
            <li key={n.id} style={{ marginBottom: 6 }}>
              <span style={{ color: '#888', fontSize: 12 }}>
                {new Date(n.createdAt).toLocaleString()}:{' '}
              </span>
              {n.body}
            </li>
          ))}
          {(c.notes ?? []).length === 0 && <li style={{ color: '#888' }}>Sin notas.</li>}
        </ul>
      </div>

      {/* Registro de llamadas */}
      <div style={B.card}>
        <h3>Registro de llamadas</h3>
        <ul>
          {(c.callLogs ?? []).map((l: any) => (
            <li key={l.id}>
              {new Date(l.createdAt).toLocaleString()} — {l.outcome ?? '—'} ({l.durationSec ?? 0}s)
            </li>
          ))}
          {(c.callLogs ?? []).length === 0 && <li style={{ color: '#888' }}>Sin llamadas.</li>}
        </ul>
      </div>
    </div>
  );
}

const B: Record<string, React.CSSProperties> = {
  link: { background: 'none', border: 0, color: '#3B6EA5', cursor: 'pointer', padding: 0 },
  badge: { color: 'white', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 },
  status: { background: '#E2E8E6', padding: '3px 10px', borderRadius: 8, fontSize: 12 },
  card: { background: 'white', borderRadius: 14, padding: 18, marginTop: 16 },
  btn: { background: '#1E9E8A', color: 'white', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  btnDanger: { background: '#D64545', color: 'white', border: 0, borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  btnGhost: { background: 'transparent', color: '#3B6EA5', border: '1px solid #cdd', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' },
  input: { flex: 1, padding: 10, border: '1px solid #ccc', borderRadius: 8 },
};
