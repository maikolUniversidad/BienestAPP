'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { uploadChatFile } from '../../../lib/storage';

interface Att { type: 'image' | 'audio'; path: string; previewUrl: string; }
interface Msg { role: 'user' | 'assistant'; content: string; theme?: string; atts?: Att[]; }

const THEME_LABEL: Record<string, string> = {
  ANXIETY: '😰 Ansiedad', SADNESS: '😢 Tristeza', STRESS: '😣 Estrés', ANGER: '😠 Enojo',
  TIREDNESS: '😴 Cansancio', GRATITUDE: '🙏 Gratitud', MOTIVATION: '✨ Motivación',
  JOY: '😄 Alegría', CALM: '😌 Calma', NEUTRAL: '💬',
};

export default function Asistente() {
  const [mode, setMode] = useState<'persistent' | 'ephemeral'>('persistent');
  const [cid, setCid] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [convos, setConvos] = useState<any[]>([]);
  const [showHist, setShowHist] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<Att[]>([]);
  const [crisis, setCrisis] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const ephemeral = mode === 'ephemeral';

  async function loadConvos() { setConvos(await api.listConversations().catch(() => [])); }

  // Nueva conversación: no se crea en el servidor hasta el primer mensaje (evita vacías).
  function newConversation() {
    setMode('persistent'); setCid(null); setMsgs([]); setCrisis(null); setShowHist(false); setPending([]);
  }
  function startEphemeral() {
    setMode('ephemeral'); setCid(null); setMsgs([]); setCrisis(null); setShowHist(false); setPending([]);
  }
  async function openConversation(id: string) {
    try {
      const c = await api.getConversation(id);
      setMode('persistent'); setCid(id); setCrisis(null); setShowHist(false);
      setMsgs((c.messages ?? []).map((m: any) => ({
        role: m.role,
        content: m.content,
        theme: m.emotionalTheme,
        atts: (m.attachments ?? []).filter((a: any) => a.url).map((a: any) => ({ type: a.type, path: a.path, previewUrl: a.url })),
      })));
    } catch { /* noop */ }
  }
  async function removeConv(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await api.deleteConversation(id).catch(() => undefined);
    if (id === cid) newConversation(); else loadConvos();
  }

  useEffect(() => { loadConvos(); /* empieza en una conversación nueva sin crearla aún */ }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, crisis]);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const a = await uploadChatFile(file, 'image', ext);
      setPending((p) => [...p, { ...a, previewUrl: URL.createObjectURL(file) }]);
    } catch { /* noop */ } finally { setUploading(false); e.target.value = ''; }
  }

  async function startRec() {
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      // En modo temporal: solo transcripción (sin subir ni guardar audio).
      if (!ephemeral) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream; chunksRef.current = [];
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
        rec.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setUploading(true);
          try {
            const a = await uploadChatFile(blob, 'audio', 'webm');
            setPending((p) => [...p, { ...a, previewUrl: URL.createObjectURL(blob) }]);
          } catch { /* noop */ } finally { setUploading(false); }
          streamRef.current?.getTracks().forEach((t) => t.stop());
        };
        rec.start(); recRef.current = rec;
      }
      if (SR) {
        const recog = new SR(); recog.lang = 'es-CO'; recog.continuous = true; recog.interimResults = true;
        recog.onresult = (e: any) => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setInput(t); };
        recog.start(); recogRef.current = recog;
      }
      setRecording(true);
    } catch { /* mic denied */ }
  }
  function stopRec() { recRef.current?.stop(); recogRef.current?.stop(); setRecording(false); }

  async function send() {
    const text = input.trim();
    if ((!text && pending.length === 0) || busy) return;
    setInput(''); setBusy(true);
    const sentAtts = pending; setPending([]);
    const next = [...msgs, { role: 'user' as const, content: text, atts: sentAtts }];
    setMsgs(next);
    try {
      let res;
      if (ephemeral) {
        res = await api.sendEphemeral(text, msgs.map((m) => ({ role: m.role, content: m.content })));
      } else {
        // Crea la conversación de forma diferida en el primer mensaje.
        let id = cid;
        if (!id) { const c = await api.startConversation(); id = c.id; setCid(id); }
        res = await api.sendMessage(id, text, sentAtts.map(({ type, path }) => ({ type, path })));
        loadConvos(); // refresca títulos/orden del historial
      }
      setMsgs((m) => [...m, { role: 'assistant', content: res.message.content, theme: res.emotionalTheme }]);
      if (res.crisisProtocol?.active) setCrisis(res.crisisProtocol);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'No pude responder ahora. ¿Intentamos de nuevo?' }]);
    } finally { setBusy(false); }
  }

  const SRsupported = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>Asistente de bienestar</h2>
          <p>Escribe, comparte una foto o una nota de voz. Te acompaño con IA segura.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { loadConvos(); setShowHist((s) => !s); }}>🕘 Historial</button>
          <button className="btn btn-ghost btn-sm" onClick={newConversation}>＋ Nueva</button>
          <button className={`btn btn-sm ${ephemeral ? 'btn-primary' : 'btn-ghost'}`} onClick={startEphemeral} title="No se guarda; desaparece al salir">🕶️ Temporal</button>
        </div>
      </div>

      {showHist && (
        <div className="card" style={{ marginBottom: 14, maxHeight: 260, overflowY: 'auto' }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Conversaciones guardadas</div>
          {convos.length === 0 && <p className="muted">Aún no tienes conversaciones guardadas.</p>}
          {convos.map((c) => (
            <div key={c.id} onClick={() => openConversation(c.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 8px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: c.id === cid ? 'var(--durazno)' : 'transparent', borderRadius: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--tinta)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || 'Conversación'}</div>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(c.lastMessageAt).toLocaleDateString()} · {c.messageCount} mensajes</div>
              </div>
              <button className="link" onClick={(e) => removeConv(c.id, e)} title="Eliminar" style={{ flexShrink: 0 }}>🗑️</button>
            </div>
          ))}
        </div>
      )}

      {ephemeral ? (
        <div className="disclaimer-bar" style={{ background: '#EAEFF7', color: 'var(--azul-deep)' }}>
          🕶️ Conversación temporal · anónima — <b>no se guarda</b> y desaparece cuando sales o inicias otra.
        </div>
      ) : (
        <div className="disclaimer-bar">Acompañamiento de bienestar · No reemplaza atención médica ni psicológica profesional.</div>
      )}

      <div className="chat-box">
        <div className="chat-msgs">
          {msgs.length === 0 && <p className="muted" style={{ textAlign: 'center', marginTop: 30 }}>Cuéntame cómo te sientes hoy 💬</p>}
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>
              {m.atts?.map((a, j) => (
                <div key={j} style={{ marginBottom: 6 }}>
                  {a.type === 'image'
                    ? <img src={a.previewUrl} alt="" style={{ maxWidth: 180, borderRadius: 10, display: 'block' }} />
                    : <audio src={a.previewUrl} controls style={{ height: 34 }} />}
                </div>
              ))}
              {m.content}
              {m.role === 'assistant' && m.theme && m.theme !== 'NEUTRAL' && (
                <div style={{ marginTop: 6, fontSize: 11, opacity: .8 }}>Tema detectado: {THEME_LABEL[m.theme] ?? m.theme}</div>
              )}
            </div>
          ))}
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

        {pending.length > 0 && !ephemeral && (
          <div style={{ display: 'flex', gap: 8, padding: '8px 14px', flexWrap: 'wrap', borderTop: '1px solid var(--line)' }}>
            {pending.map((a, i) => (
              a.type === 'image'
                ? <img key={i} src={a.previewUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                : <audio key={i} src={a.previewUrl} controls style={{ height: 34 }} />
            ))}
            <span className="muted" style={{ alignSelf: 'center', fontSize: 12 }}>adjunto listo</span>
          </div>
        )}

        <div className="chat-input">
          {!ephemeral && (
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }} title="Foto">
              📷<input type="file" accept="image/*" hidden onChange={onPhoto} />
            </label>
          )}
          {!recording
            ? <button className="btn btn-ghost btn-sm" onClick={startRec} title="Grabar audio">🎙️</button>
            : <button className="btn btn-danger btn-sm" onClick={stopRec}>⏹️</button>}
          <input className="field" style={{ marginTop: 0 }} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={recording ? 'Escuchando…' : 'Escribe un mensaje…'} />
          <button className="btn btn-primary" onClick={send} disabled={busy || uploading || recording}>{busy ? '…' : 'Enviar'}</button>
        </div>
        {!SRsupported && <p className="muted" style={{ fontSize: 11, padding: '0 14px 8px' }}>La transcripción en vivo funciona mejor en Chrome/Android.</p>}
      </div>
    </>
  );
}
