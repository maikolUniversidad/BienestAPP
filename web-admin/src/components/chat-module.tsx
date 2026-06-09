'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { uploadChatP2P } from '../lib/storage';
import { FilePicker } from './file-picker';

interface Att { type: 'image' | 'audio' | 'document'; path: string; name?: string; url?: string; previewUrl?: string; }
interface Msg { id: string; mine: boolean; senderName: string; senderRole?: string; body?: string; createdAt: string; attachments?: Att[]; }

/** Chat persona-a-persona entre roles. Lista de conversaciones + conversación activa,
 *  con adjuntos (foto/cámara/archivo), nota de voz con transcripción y polling en vivo. */
export function ChatModule() {
  const [threads, setThreads] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<Att[]>([]);
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [recording, setRecording] = useState(false);

  const activeRef = useRef<string | null>(null);
  const sinceRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const recogRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function loadThreads() { setThreads(await api.chatThreads().catch(() => [])); }
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 15000); return () => clearInterval(t); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Polling de la conversación activa.
  useEffect(() => {
    const t = setInterval(async () => {
      const id = activeRef.current; if (!id || !sinceRef.current) return;
      const nuevos = await api.chatMessages(id, sinceRef.current).catch(() => []);
      if (nuevos.length) {
        sinceRef.current = nuevos[nuevos.length - 1].createdAt;
        setMsgs((m) => [...m, ...nuevos.filter((n: Msg) => !m.some((x) => x.id === n.id))]);
        loadThreads();
      }
    }, 4000);
    return () => clearInterval(t);
  }, []);

  async function openThread(t: any) {
    setActive(t); activeRef.current = t.id; setShowNew(false); setPending([]); setInput('');
    const m = await api.chatMessages(t.id).catch(() => []);
    setMsgs(m);
    sinceRef.current = m.length ? m[m.length - 1].createdAt : new Date(0).toISOString();
    loadThreads();
  }

  async function openNew() {
    setShowNew(true); setActive(null); activeRef.current = null;
    setContacts(await api.chatContacts().catch(() => []));
  }
  async function searchContacts(term: string) { setQ(term); setContacts(await api.chatContacts(term).catch(() => [])); }
  async function startWith(c: any) {
    const { id } = await api.chatOpenDirect(c.id).catch(() => ({ id: '' as string }));
    if (!id) return;
    await loadThreads();
    openThread({ id, title: c.name, others: [c], kind: 'direct' });
  }

  async function addAttachment(file: File, kind: 'image' | 'document') {
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || (kind === 'image' ? 'jpg' : 'pdf')).toLowerCase();
      const a = await uploadChatP2P(file, kind, ext);
      setPending((p) => [...p, { type: kind, path: a.path, name: file.name, previewUrl: kind === 'image' ? URL.createObjectURL(file) : undefined }]);
    } catch { /* noop */ } finally { setBusy(false); }
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try { const a = await uploadChatP2P(blob, 'audio', 'webm'); setPending((p) => [...p, { type: 'audio', path: a.path, previewUrl: URL.createObjectURL(blob) }]); } catch { /* noop */ }
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      rec.start(); recRef.current = rec;
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) { const r = new SR(); r.lang = 'es-CO'; r.continuous = true; r.interimResults = true; r.onresult = (e: any) => { let tx = ''; for (let i = 0; i < e.results.length; i++) tx += e.results[i][0].transcript; setInput(tx); }; r.start(); recogRef.current = r; }
      setRecording(true);
    } catch { /* mic denied */ }
  }
  function stopRec() { recRef.current?.stop(); recogRef.current?.stop(); setRecording(false); }

  async function send() {
    const text = input.trim();
    if ((!text && pending.length === 0) || !active || busy) return;
    setBusy(true); setInput('');
    const atts = pending.map(({ type, path, name }) => ({ type, path, name })); setPending([]);
    try {
      const m = await api.chatSend(active.id, text, atts);
      setMsgs((xs) => [...xs, m]); sinceRef.current = m.createdAt; loadThreads();
    } catch { /* noop */ } finally { setBusy(false); }
  }

  const SRsupported = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="chat-shell">
      {/* Lista de conversaciones */}
      <aside className={`chat-list ${active || showNew ? 'hide-mobile' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <b style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>Conversaciones</b>
          <button className="btn btn-primary btn-sm" onClick={openNew}>＋ Nueva</button>
        </div>
        {threads.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Sin conversaciones. Inicia una nueva.</p>}
        <div style={{ display: 'grid', gap: 6 }}>
          {threads.map((t) => (
            <div key={t.id} onClick={() => openThread(t)} className={`chat-thread ${active?.id === t.id ? 'active' : ''}`}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--durazno)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--coral-deep)', flexShrink: 0 }}>
                {(t.title || '?').slice(0, 1).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontWeight: 700, color: 'var(--tinta)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                  {t.unread > 0 && <span className="badge" style={{ background: 'var(--coral)', color: '#fff', fontSize: 10 }}>{t.unread}</span>}
                </div>
                <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.others?.[0]?.roleLabel ? `${t.others[0].roleLabel} · ` : ''}{t.preview || 'Sin mensajes'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Panel principal */}
      <section className={`chat-main ${!active && !showNew ? 'hide-mobile' : ''}`}>
        {showNew ? (
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <button className="btn btn-ghost btn-sm hide-desktop" onClick={() => setShowNew(false)}>←</button>
              <b style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>Nueva conversación</b>
            </div>
            <input className="field" style={{ marginTop: 0 }} value={q} onChange={(e) => searchContacts(e.target.value)} placeholder="Buscar persona…" />
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              {contacts.map((c) => (
                <div key={c.id} onClick={() => startWith(c)} className="chat-thread">
                  <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--niebla)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--tinta)' }}>{c.name.slice(0, 1)}</div>
                  <div><div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{c.name}</div><div className="muted" style={{ fontSize: 12 }}>{c.roleLabel}</div></div>
                </div>
              ))}
              {contacts.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Escribe para buscar o no hay contactos disponibles aún.</p>}
            </div>
          </div>
        ) : active ? (
          <div className="card chat-conv">
            <div className="chat-conv-head">
              <button className="btn btn-ghost btn-sm hide-desktop" onClick={() => { setActive(null); activeRef.current = null; }}>←</button>
              <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--durazno)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--coral-deep)' }}>{(active.title || '?').slice(0, 1).toUpperCase()}</div>
              <div><div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{active.title}</div><div className="muted" style={{ fontSize: 12 }}>{active.others?.map((o: any) => o.roleLabel).filter(Boolean).join(', ')}</div></div>
            </div>

            <div className="chat-conv-msgs">
              {msgs.length === 0 && <p className="muted" style={{ textAlign: 'center', marginTop: 20 }}>Escribe el primer mensaje 💬</p>}
              {msgs.map((m) => (
                <div key={m.id} className={`bubble ${m.mine ? 'user' : 'assistant'}`} style={{ maxWidth: '80%' }}>
                  {!m.mine && active.kind === 'group' && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--coral-deep)' }}>{m.senderName}</div>}
                  {m.attachments?.map((a, j) => (
                    <div key={j} style={{ marginBottom: m.body ? 6 : 0 }}>
                      {a.type === 'image' ? <img src={a.url} alt="" style={{ maxWidth: 200, borderRadius: 10, display: 'block' }} />
                        : a.type === 'audio' ? <audio src={a.url} controls style={{ height: 34 }} />
                          : <a href={a.url} target="_blank" rel="noreferrer" className="badge" style={{ background: 'var(--niebla)', color: 'var(--tinta)' }}>📎 {a.name || 'documento'}</a>}
                    </div>
                  ))}
                  {m.body}
                  <div style={{ fontSize: 10, opacity: .7, marginTop: 3, textAlign: 'right' }}>{new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {pending.length > 0 && (
              <div style={{ display: 'flex', gap: 8, padding: '8px 4px', flexWrap: 'wrap', borderTop: '1px solid var(--line)' }}>
                {pending.map((a, i) => (
                  a.type === 'image' ? <img key={i} src={a.previewUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8 }} />
                    : a.type === 'audio' ? <audio key={i} src={a.previewUrl} controls style={{ height: 32 }} />
                      : <span key={i} className="badge" style={{ background: 'var(--niebla)', color: 'var(--tinta)' }}>📎 {a.name}</span>
                ))}
              </div>
            )}

            <div className="chat-conv-input">
              <FilePicker onFile={(f) => addAttachment(f, 'image')} accept="image/*" cameraLabel="📷" fileLabel="🖼️" disabled={busy} />
              <FilePicker onFile={(f) => addAttachment(f, 'document')} accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv" camera={false} fileLabel="📎" disabled={busy} />
              {!recording
                ? <button className="btn btn-ghost btn-sm" onClick={startRec} title="Nota de voz">🎙️</button>
                : <button className="btn btn-danger btn-sm" onClick={stopRec}>⏹️</button>}
              <input className="field" style={{ marginTop: 0, flex: 1 }} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={recording ? 'Escuchando…' : 'Mensaje…'} />
              <button className="btn btn-primary" onClick={send} disabled={busy}>Enviar</button>
            </div>
            {!SRsupported && <p className="muted" style={{ fontSize: 11, padding: '0 4px' }}>La transcripción funciona mejor en Chrome/Android.</p>}
          </div>
        ) : (
          <div className="card" style={{ display: 'grid', placeItems: 'center', height: 300, textAlign: 'center' }}>
            <div><div style={{ fontSize: 40 }}>💬</div><p className="muted">Elige una conversación o inicia una nueva.</p></div>
          </div>
        )}
      </section>
    </div>
  );
}
