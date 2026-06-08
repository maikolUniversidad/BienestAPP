'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

const EMOTIONS: { k: string; e: string; l: string }[] = [
  { k: 'JOY', e: '😄', l: 'Alegría' }, { k: 'CALM', e: '😌', l: 'Calma' }, { k: 'GRATITUDE', e: '🙏', l: 'Gratitud' },
  { k: 'MOTIVATION', e: '✨', l: 'Motivación' }, { k: 'TIREDNESS', e: '😴', l: 'Cansancio' }, { k: 'STRESS', e: '😣', l: 'Estrés' },
  { k: 'ANXIETY', e: '😰', l: 'Ansiedad' }, { k: 'SADNESS', e: '😢', l: 'Tristeza' }, { k: 'ANGER', e: '😠', l: 'Enojo' },
];

const NEXT_STEP: Record<string, { msg: string; cta: string; href: string }> = {
  ANXIETY: { msg: 'Probemos una respiración guiada para bajar el ritmo.', cta: 'Ver respiración', href: '/biblioteca' },
  STRESS: { msg: 'Una pausa activa puede ayudarte ahora mismo.', cta: 'Ver biblioteca', href: '/biblioteca' },
  SADNESS: { msg: 'Si quieres, escribe un poco en tu diario o habla con el asistente.', cta: 'Hablar con el asistente', href: '/asistente' },
  ANGER: { msg: 'Tomarte un momento para escribir puede ayudarte a procesarlo.', cta: 'Escribir en el diario', href: '/diario' },
  TIREDNESS: { msg: 'Cuida tu descanso. Revisa tus hábitos de sueño.', cta: 'Ver hábitos', href: '/habitos' },
  _: { msg: 'Gracias por registrarte hoy. ¿Quieres escribir en tu diario?', cta: 'Abrir diario', href: '/diario' },
};

export default function CheckIn() {
  const router = useRouter();
  const [emotion, setEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!emotion || busy) return;
    setBusy(true);
    try { await api.logMood(emotion, intensity, note.trim() || undefined); setSaved(true); }
    catch { /* noop */ } finally { setBusy(false); }
  }

  const step = saved ? NEXT_STEP[emotion!] ?? NEXT_STEP._ : null;
  const sel = EMOTIONS.find((e) => e.k === emotion);

  return (
    <>
      <div className="page-head"><h2>¿Cómo te sientes hoy?</h2><p>Tómate un momento. No hay respuestas correctas o incorrectas.</p></div>

      {!saved ? (
        <div className="card" style={{ maxWidth: 620 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {EMOTIONS.map((em) => (
              <button key={em.k} onClick={() => setEmotion(em.k)} className="mood-btn" style={emotion === em.k ? { background: 'var(--coral)', color: '#fff', borderColor: 'var(--coral)' } : {}}>
                <div style={{ fontSize: 30 }}>{em.e}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{em.l}</div>
              </button>
            ))}
          </div>

          {emotion && (
            <div style={{ marginTop: 20 }}>
              <label className="muted" style={{ fontSize: 13 }}>¿Con qué intensidad? <b style={{ color: 'var(--coral-deep)' }}>{intensity}/5</b></label>
              <input type="range" min={1} max={5} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--coral)' }} />
              <textarea className="field" style={{ marginTop: 10, minHeight: 80 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="¿Quieres contar algo más? (opcional)" />
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Registrar mi check-in'}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>{sel?.e}</div>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '8px 0' }}>Gracias por registrarte hoy 💛</h3>
          <p className="muted" style={{ marginBottom: 16 }}>{step?.msg}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" href={step?.href ?? '/diario'}>{step?.cta}</Link>
            <button className="btn btn-ghost" onClick={() => router.push('/app')}>Volver al inicio</button>
          </div>
        </div>
      )}
    </>
  );
}
