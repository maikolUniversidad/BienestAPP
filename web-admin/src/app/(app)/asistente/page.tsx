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
  const [cid, setCid] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
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

  useEffect(() => { api.startConversation().then((c) => setCid(c.id)).catch(() => undefined); }, []);
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
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
    if ((!text && pending.length === 0) || !cid || busy) return;
    setInput(''); setBusy(true);
    const sentAtts = pending; setPending([]);
    setMsgs((m) => [...m, { role: 'user', content: text, atts: sentAtts }]);
    try {
      const res = await api.sendMessage(cid, text, sentAtts.map(({ type, path }) => ({ type, path })));
      setMsgs((m) => [...m, { role: 'assistant', content: res.message.content, theme: res.emotionalTheme }]);
      if (res.crisisProtocol?.active) setCrisis(res.crisisProtocol);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'No pude responder ahora. ¿Intentamos de nuevo?' }]);
    } finally { setBusy(false); }
  }

  const SRsupported = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <>
      <div className="page-head"><h2>Asistente de bienestar</h2><p>Escribe, comparte una foto o una nota de voz. Te acompaño con IA segura.</p></div>
      <div className="disclaimer-bar">Acompañamiento de bienestar · No reemplaza atención médica ni psicológica profesional.</div>

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

        {pending.length > 0 && (
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
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }} title="Foto">
            📷<input type="file" accept="image/*" hidden onChange={onPhoto} />
          </label>
          {!recording
            ? <button className="btn btn-ghost btn-sm" onClick={startRec} title="Grabar audio">🎙️</button>
            : <button className="btn btn-danger btn-sm" onClick={stopRec}>⏹️</button>}
          <input className="field" style={{ marginTop: 0 }} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={recording ? 'Escuchando…' : 'Escribe un mensaje…'} />
          <button className="btn btn-primary" onClick={send} disabled={busy || uploading || recording}>{busy ? '…' : 'Enviar'}</button>
        </div>
        {!SRsupported && <p className="muted" style={{ fontSize: 11, padding: '0 14px 8px' }}>La transcripción en vivo funciona mejor en Chrome/Android; el audio se envía igualmente.</p>}
      </div>
    </>
  );
}
