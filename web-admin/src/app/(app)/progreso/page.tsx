'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

const MOOD: Record<string, string> = {
  ANXIETY: '😰 Ansiedad', SADNESS: '😢 Tristeza', STRESS: '😣 Estrés', ANGER: '😠 Enojo',
  TIREDNESS: '😴 Cansancio', GRATITUDE: '🙏 Gratitud', MOTIVATION: '✨ Motivación',
  JOY: '😄 Alegría', CALM: '😌 Calma',
};

export default function Progreso() {
  const [d, setD] = useState<any>(null);
  const [moods, setMoods] = useState<any[]>([]);
  const [weekly, setWeekly] = useState<any>(null);
  const [goals, setGoals] = useState<{ active: number; completed: number } | null>(null);

  useEffect(() => {
    api.dashboard().then(setD).catch(() => undefined);
    api.moodList().then(setMoods).catch(() => undefined);
    api.journalWeekly().then(setWeekly).catch(() => undefined);
    api.goalStats().then(setGoals).catch(() => undefined);
  }, []);

  // Emociones predominantes (últimos 30 registros).
  const counts: Record<string, number> = {};
  moods.forEach((m) => { counts[m.label] = (counts[m.label] ?? 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const totalMoods = moods.length || 1;

  const act = d?.activityToday ?? [];
  const sumType = (t: string) => act.filter((a: any) => a.type === t).reduce((s: number, a: any) => s + a.value, 0);

  return (
    <>
      <div className="page-head"><h2>Mi progreso</h2><p>Una mirada serena a tu camino. No es una calificación, es tu proceso.</p></div>

      {/* Resumen */}
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <Card ic="🔥" label="Racha de hábitos" value={`${d?.habitStreak ?? 0}`} />
        <Card ic="💛" label="Bienestar" value={`${d?.wellbeingIndex ?? 0}/10`} />
        <Card ic="🎯" label="Metas activas" value={`${goals?.active ?? 0}`} />
        <Card ic="🏅" label="Logros" value={`${d?.achievementsCount ?? 0}`} />
      </div>

      <div className="grid grid-2">
        {/* Emociones */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Emociones predominantes</h3>
          {top.length === 0 && <p className="muted">Registra tu ánimo en el diario para ver tus tendencias.</p>}
          <div style={{ display: 'grid', gap: 12 }}>
            {top.map(([label, n]) => {
              const pct = Math.round((n / totalMoods) * 100);
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{MOOD[label] ?? label}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--niebla)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--azul)', borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hábitos del día */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Tu día en hábitos</h3>
          <div className="grid grid-2">
            <Mini ic="🚶" label="Pasos / caminata" value={sumType('walk') || '—'} />
            <Mini ic="💧" label="Agua" value={sumType('water') || '—'} />
            <Mini ic="😴" label="Sueño (h)" value={sumType('sleep') || '—'} />
            <Mini ic="🤸" label="Actividad (min)" value={(sumType('activity') + sumType('active_break')) || '—'} />
          </div>
          <Link className="btn btn-ghost btn-sm" href="/habitos" style={{ marginTop: 14 }}>Registrar hábitos →</Link>
        </div>
      </div>

      {/* Diario semanal */}
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 6 }}>Tu semana en el diario</h3>
        <p className="muted">
          {weekly
            ? `${weekly.entries} entrada(s) · sentimiento promedio: ${weekly.avgSentiment != null ? weekly.avgSentiment.toFixed(2) : 'n/d'} (de -1 a 1)`
            : 'Cargando…'}
        </p>
        {goals && goals.completed > 0 && (
          <div style={{ marginTop: 12, background: 'var(--durazno)', borderRadius: 14, padding: 14, color: 'var(--tinta)' }}>
            🎉 Has completado <b>{goals.completed}</b> meta(s). Cada paso cuenta.
          </div>
        )}
      </div>
    </>
  );
}

function Card({ ic, label, value }: { ic: string; label: string; value: string }) {
  return (
    <div className="card stat"><div className="ic">{ic}</div><div className="lbl">{label}</div><div className="val">{value}</div></div>
  );
}
function Mini({ ic, label, value }: { ic: string; label: string; value: any }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 20 }}>{ic}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{value}</div>
    </div>
  );
}
