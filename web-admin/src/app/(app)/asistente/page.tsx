'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';

interface Msg { role: 'user' | 'assistant'; content: string; }

export default function Asistente() {
  const [cid, setCid] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [crisis, setCrisis] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.startConversation().then((c) => setCid(c.id)).catch(() => undefined);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, crisis]);

  async function send() {
    if (!input.trim() || !cid || busy) return;
    const text = input.trim();
    setInput(''); setBusy(true);
    setMsgs((m) => [...m, { role: 'user', content: text }]);
    try {
      const res = await api.sendMessage(cid, text);
      setMsgs((m) => [...m, { role: 'assistant', content: res.message.content }]);
      if (res.crisisProtocol?.active) setCrisis(res.crisisProtocol);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'No pude responder ahora. ¿Intentamos de nuevo?' }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><h2>Asistente de bienestar</h2><p>Acompañamiento con IA segura.</p></div>
      <div className="disclaimer-bar">Acompañamiento de bienestar · No reemplaza atención médica ni psicológica profesional.</div>

      <div className="chat-box">
        <div className="chat-msgs">
          {msgs.length === 0 && <p className="muted" style={{ textAlign: 'center', marginTop: 30 }}>Cuéntame cómo te sientes hoy 💬</p>}
          {msgs.map((m, i) => (<div key={i} className={`bubble ${m.role}`}>{m.content}</div>))}
          {crisis && (
            <div className="crisis-banner">
              <h4>Estoy aquí contigo</h4>
              <p>{crisis.containmentMessage}</p>
              <div className="lines">
                {crisis.emergencyLines?.map((l: any) => (
                  <a key={l.number} className="pill-line" href={`tel:${l.number}`}>{l.label} {l.number}</a>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="chat-input">
          <input className="field" style={{ marginTop: 0 }} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Escribe un mensaje…" />
          <button className="btn btn-primary" onClick={send} disabled={busy}>{busy ? '…' : 'Enviar'}</button>
        </div>
      </div>
    </>
  );
}
