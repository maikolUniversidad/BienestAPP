'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const TYPES: [string, string][] = [
  ['peticion', '📝 Petición'], ['queja', '😟 Queja'], ['reclamo', '⚠️ Reclamo'], ['sugerencia', '💡 Sugerencia'],
];
const STATUS_LABEL: Record<string, string> = { new: 'Recibida', in_progress: 'En proceso', resolved: 'Resuelta' };

export default function Pqrs() {
  const [type, setType] = useState('peticion');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [mine, setMine] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() { setMine(await api.myPqrs().catch(() => [])); }
  useEffect(() => { load(); }, []);

  async function send() {
    if (!subject.trim() || !body.trim()) return;
    await api.createPqrs({ type, subject: subject.trim(), body: body.trim() });
    setSubject(''); setBody(''); setMsg('Tu solicitud fue enviada ✓'); setTimeout(() => setMsg(null), 3000); load();
  }

  return (
    <>
      <div className="page-head"><h2>Tu voz es importante</h2><p>Envía una petición, queja, reclamo o sugerencia (PQRS). Te responderemos.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Nueva solicitud</h3>
          <div className="chips">{TYPES.map(([k, l]) => <button key={k} className="chip" style={type === k ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => setType(k)}>{l}</button>)}</div>
          <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto" />
          <textarea className="field" style={{ minHeight: 120 }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Cuéntanos con detalle…" />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={send} disabled={!subject.trim() || !body.trim()}>Enviar</button>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Mis solicitudes</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {mine.map((p) => (
              <div key={p.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b style={{ color: 'var(--tinta)' }}>{p.subject}</b>
                  <span className="badge" style={{ background: p.status === 'resolved' ? 'var(--salvia)' : p.status === 'in_progress' ? 'var(--azul)' : 'var(--ambar)' }}>{STATUS_LABEL[p.status]}</span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                {p.response && <div style={{ marginTop: 6, background: 'var(--bg)', borderRadius: 10, padding: 10, fontSize: 14 }}>💬 {p.response}</div>}
              </div>
            ))}
            {mine.length === 0 && <p className="muted">Aún no has enviado solicitudes.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
