'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { uploadJournalFile } from '../../../lib/storage';

const MOODS: [string, string][] = [
  ['GRATITUDE', '🙏 Gratitud'], ['MOTIVATION', '✨ Motivación'], ['CALM', '😌 Calma'],
  ['TIREDNESS', '😴 Cansancio'], ['STRESS', '😣 Estrés'], ['ANXIETY', '😰 Ansiedad'],
  ['SADNESS', '😢 Tristeza'], ['ANGER', '😠 Enojo'], ['JOY', '😄 Alegría'],
];

interface Att { type: 'image' | 'audio'; path: string; previewUrl: string; }

export default function Diario() {
  const [mood, setMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [body, setBody] = useState('');
  const [transcript, setTranscript] = useState('');
  const [atts, setAtts] = useState<Att[]>([]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recogRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function load() {
    setEntries(await api.journalList().catch(() => []));
    setWeekly(await api.journalWeekly().catch(() => null));
  }
  useEffect(() => { load(); }, []);

  async function saveMood() {
    if (!mood) return;
    await api.logMood(mood, intensity);
    setMsg('Ánimo registrado ✓'); setMood(null);
    setTimeout(() => setMsg(null), 2500);
  }

  // ---------- Fotos ----------
  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const a = await uploadJournalFile(file, 'image', ext);
      setAtts((p) => [...p, { ...a, previewUrl: URL.createObjectURL(file) }]);
    } catch { setMsg('No se pudo subir la foto'); } finally { setUploading(false); e.target.value = ''; }
  }

  // ---------- Audio ----------
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (ev) => ev.data.size && chunksRef.current.push(ev.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setUploading(true);
        try {
          const a = await uploadJournalFile(blob, 'audio', 'webm');
          setAtts((p) => [...p, { ...a, previewUrl: URL.createObjectURL(blob) }]);
        } catch { setMsg('No se pudo subir el audio'); } finally { setUploading(false); }
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;

      // Transcripción en vivo (si el navegador lo soporta).
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const recog = new SR();
        recog.lang = 'es-CO'; recog.continuous = true; recog.interimResults = true;
        recog.onresult = (e: any) => {
          let txt = '';
          for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
          setTranscript(txt);
        };
        recog.start();
        recogRef.current = recog;
      }
      setRecording(true);
    } catch {
      setMsg('No se pudo acceder al micrófono');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recogRef.current?.stop();
    setRecording(false);
  }

  // ---------- Guardar ----------
  async function save() {
    const text = body.trim() || transcript.trim();
    if (!text && atts.length === 0) return;
    setSaving(true); setMotivation(null);
    try {
      const res = await api.createJournal({
        body: text,
        tags: mood ? [mood] : [],
        attachments: atts.map(({ type, path }) => ({ type, path })),
        transcription: transcript.trim() || undefined,
      });
      setBody(''); setTranscript(''); setAtts([]); setMood(null);
      if (res.motivation) setMotivation(res.motivation);
      setMsg('Entrada guardada — se analiza en segundo plano ✓');
      setTimeout(() => setMsg(null), 3500);
      load();
    } catch { setMsg('No se pudo guardar'); } finally { setSaving(false); }
  }

  const SRsupported = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <>
      <div className="page-head"><h2>Diario y estado de ánimo</h2><p>Escribe, sube fotos o graba un audio. La IA te acompaña.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--primary)' }}>{msg}</div>}
      {motivation && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--primary)' }}>
          <div className="muted" style={{ fontSize: 12 }}>💚 Mensaje para ti</div>
          <p style={{ color: 'var(--ink-2)', marginTop: 4 }}>{motivation}</p>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ color: 'var(--ink-2)', marginBottom: 12 }}>¿Cómo te sientes hoy?</h3>
          <div className="mood-grid">
            {MOODS.map(([k, l]) => (
              <button key={k} className={`mood-btn ${mood === k ? 'sel' : ''}`} onClick={() => setMood(k)}>{l}</button>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <label className="muted">Intensidad: {intensity}/5</label>
            <input type="range" min={1} max={5} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={saveMood} disabled={!mood}>Registrar ánimo</button>
        </div>

        <div className="card">
          <h3 style={{ color: 'var(--ink-2)', marginBottom: 12 }}>Escribe o graba tu día</h3>
          <textarea className="field" style={{ marginTop: 0, minHeight: 90, resize: 'vertical' }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="¿Qué pasó hoy? ¿Cómo te sentiste?" />

          {/* Acciones de adjuntos */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
              📷 Foto
              <input type="file" accept="image/*" hidden onChange={onPhoto} />
            </label>
            {!recording ? (
              <button className="btn btn-ghost btn-sm" onClick={startRecording}>🎙️ Grabar audio</button>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={stopRecording}>⏹️ Detener ({transcript ? 'transcribiendo…' : 'grabando…'})</button>
            )}
            {uploading && <span className="muted" style={{ alignSelf: 'center' }}>Subiendo…</span>}
          </div>
          {!SRsupported && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Tu navegador no transcribe en vivo; el audio se guardará igualmente.</p>}

          {transcript && (
            <div style={{ marginTop: 12 }}>
              <label className="muted" style={{ fontSize: 12 }}>📝 Transcripción del audio (editable)</label>
              <textarea className="field" style={{ marginTop: 4, minHeight: 60 }} value={transcript} onChange={(e) => setTranscript(e.target.value)} />
            </div>
          )}

          {/* Previews */}
          {atts.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {atts.map((a, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {a.type === 'image'
                    ? <img src={a.previewUrl} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} />
                    : <audio src={a.previewUrl} controls style={{ height: 40 }} />}
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save} disabled={saving || recording || uploading}>
            {saving ? 'Guardando…' : 'Guardar entrada'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ color: 'var(--ink-2)', marginBottom: 6 }}>Resumen semanal</h3>
        <p className="muted">{weekly ? `${weekly.entries} entradas · sentimiento promedio: ${weekly.avgSentiment != null ? weekly.avgSentiment.toFixed(2) : 'n/d'}` : 'Cargando…'}</p>
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {entries.slice(0, 8).map((e) => (
            <div key={e.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <span className="muted" style={{ fontSize: 12 }}>{new Date(e.createdAt).toLocaleDateString()}</span>
              {' '}{(e.tags ?? []).map((t: string) => <span key={t} className="badge-soft badge" style={{ marginLeft: 4 }}>{t}</span>)}
              {(e.attachments ?? []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {e.attachments.map((a: any, i: number) => a.url && (
                    a.type === 'image'
                      ? <img key={i} src={a.url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                      : <audio key={i} src={a.url} controls style={{ height: 36 }} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {entries.length === 0 && <p className="muted">Aún no tienes entradas.</p>}
        </div>
      </div>
    </>
  );
}
