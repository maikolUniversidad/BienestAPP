'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const MOODS: [string, string][] = [
  ['GRATITUDE', '🙏 Gratitud'], ['MOTIVATION', '✨ Motivación'], ['CALM', '😌 Calma'],
  ['TIREDNESS', '😴 Cansancio'], ['STRESS', '😣 Estrés'], ['ANXIETY', '😰 Ansiedad'],
  ['SADNESS', '😢 Tristeza'], ['ANGER', '😠 Enojo'], ['JOY', '😄 Alegría'],
];

export default function Diario() {
  const [mood, setMood] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [body, setBody] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

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
  async function saveJournal() {
    if (!body.trim()) return;
    await api.createJournal(body, mood ? [mood] : []);
    setBody(''); setMsg('Entrada guardada — se analiza en segundo plano ✓');
    setTimeout(() => setMsg(null), 3000);
    load();
  }

  return (
    <>
      <div className="page-head"><h2>Diario y estado de ánimo</h2><p>Privado. La IA analiza el sentimiento y el riesgo en segundo plano.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--primary)' }}>{msg}</div>}

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
          <h3 style={{ color: 'var(--ink-2)', marginBottom: 12 }}>Escribe en tu diario</h3>
          <textarea className="field" style={{ marginTop: 0, minHeight: 120, resize: 'vertical' }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="¿Qué pasó hoy? ¿Cómo te sentiste?" />
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={saveJournal} disabled={!body.trim()}>Guardar entrada</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ color: 'var(--ink-2)', marginBottom: 6 }}>Resumen semanal</h3>
        <p className="muted">{weekly ? `${weekly.entries} entradas · sentimiento promedio: ${weekly.avgSentiment != null ? weekly.avgSentiment.toFixed(2) : 'n/d'}` : 'Cargando…'}</p>
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {entries.slice(0, 8).map((e) => (
            <div key={e.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>{new Date(e.createdAt).toLocaleDateString()}</span>
              {' '}{(e.tags ?? []).map((t: string) => <span key={t} className="badge-soft badge" style={{ marginLeft: 4 }}>{t}</span>)}
            </div>
          ))}
          {entries.length === 0 && <p className="muted">Aún no tienes entradas.</p>}
        </div>
      </div>
    </>
  );
}
