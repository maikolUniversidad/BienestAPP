'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { uploadFoodPhoto } from '../../../lib/storage';

const MEALS = [
  { key: 'desayuno', label: 'Desayuno', ic: '🌅' },
  { key: 'merienda', label: 'Merienda', ic: '🍎' },
  { key: 'almuerzo', label: 'Almuerzo', ic: '🍽️' },
  { key: 'onces', label: 'Onces', ic: '☕' },
  { key: 'cena', label: 'Cena', ic: '🌙' },
  { key: 'espontanea', label: 'Espontánea', ic: '🍫' },
];
const MEASURES = [
  { type: 'weight', label: 'Peso', unit: 'kg' },
  { type: 'waist', label: 'Cintura', unit: 'cm' },
  { type: 'hip', label: 'Cadera', unit: 'cm' },
  { type: 'chest', label: 'Pecho', unit: 'cm' },
  { type: 'arm', label: 'Brazo', unit: 'cm' },
  { type: 'thigh', label: 'Muslo', unit: 'cm' },
  { type: 'body_fat', label: 'Grasa', unit: '%' },
];

export default function Alimentacion() {
  const [summary, setSummary] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [body, setBody] = useState<any>(null);
  const [meal, setMeal] = useState('almuerzo');
  const [desc, setDesc] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [measure, setMeasure] = useState({ type: 'weight', value: '' });
  const [targets, setTargets] = useState({ calories: '', weight: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }
  async function load() {
    setSummary(await api.foodDailySummary().catch(() => null));
    setLogs(await api.foodList().catch(() => []));
    const b = await api.healthBody().catch(() => null);
    setBody(b);
    const t = (b?.targets ?? []) as any[];
    setTargets({
      calories: String(t.find((x) => x.type === 'calories_daily')?.target ?? ''),
      weight: String(t.find((x) => x.type === 'weight')?.target ?? ''),
    });
  }
  useEffect(() => { load(); }, []);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setResult(null);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const { path } = await uploadFoodPhoto(file, ext);
      const r = await api.analyzeFoodPhoto(path, meal, desc || undefined);
      setResult(r);
      flash(r.vision ? 'Comida analizada por IA ✓' : 'Estimación registrada (IA de visión no disponible)');
      setDesc(''); load();
    } catch { flash('No se pudo analizar la foto.'); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function analyzeText() {
    if (!desc.trim()) return flash('Describe la comida o toma una foto.');
    setBusy(true); setResult(null);
    try {
      const r = await api.analyzeFood(desc.trim(), meal, desc.trim());
      setResult(r); flash('Comida registrada ✓'); setDesc(''); load();
    } catch { flash('No se pudo registrar.'); } finally { setBusy(false); }
  }

  async function saveMeasure() {
    const v = parseFloat(measure.value);
    if (!Number.isFinite(v)) return flash('Ingresa un valor válido.');
    const unit = MEASURES.find((m) => m.type === measure.type)?.unit ?? '';
    await api.ingestHealth('manual', [{ type: measure.type, value: v, unit }]).catch(() => undefined);
    setMeasure({ ...measure, value: '' }); flash('Medida guardada ✓'); load();
  }
  async function saveTarget(type: 'calories_daily' | 'weight', raw: string) {
    const v = parseFloat(raw);
    if (!Number.isFinite(v)) return;
    await api.setHealthTarget({ type, target: v, unit: type === 'weight' ? 'kg' : 'kcal' }).catch(() => undefined);
    flash('Meta actualizada ✓'); load();
  }

  const goalPct = summary?.goal ? Math.min(100, Math.round((summary.total / summary.goal) * 100)) : 0;

  return (
    <>
      <div className="page-head"><h2>Alimentación inteligente</h2><p>Toma una foto a tu comida y la IA estima las calorías y la clasifica. Lleva el control de tu día, tu peso y tus medidas.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {/* Resumen del día */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>Resumen de hoy</h3>
          <div style={{ fontFamily: 'Fraunces', fontSize: 26, color: 'var(--tinta)' }}>{summary?.total ?? 0} <span style={{ fontSize: 14 }} className="muted">kcal{summary?.goal ? ` / ${summary.goal}` : ''}</span></div>
        </div>
        {summary?.goal ? (
          <div style={{ height: 12, background: 'var(--niebla)', borderRadius: 999, overflow: 'hidden', margin: '8px 0' }}>
            <div style={{ height: '100%', width: `${goalPct}%`, background: goalPct > 100 ? 'var(--sos)' : 'var(--salvia)', borderRadius: 999, transition: 'width .4s' }} />
          </div>
        ) : <p className="muted" style={{ fontSize: 13 }}>Define tu meta de calorías abajo para ver tu progreso diario.</p>}
        <div className="scroll-x-mobile" style={{ display: 'flex', gap: 8, margin: '10px 0', flexWrap: 'wrap' }}>
          {(summary?.byMeal ?? []).filter((m: any) => m.count > 0).map((m: any) => (
            <span key={m.key} className="badge" style={{ background: 'var(--durazno)', color: 'var(--coral-deep)' }}>{m.label}: {m.calories} kcal</span>
          ))}
        </div>
        {summary?.motivator && <div style={{ background: 'var(--durazno)', borderRadius: 12, padding: 12, color: 'var(--tinta)', fontWeight: 600 }}>💛 {summary.motivator}</div>}
      </div>

      {/* Registrar comida */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Registrar comida</h3>
        <div className="scroll-x-mobile" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {MEALS.map((m) => (
            <button key={m.key} className="mood-btn" onClick={() => setMeal(m.key)} style={{ borderColor: meal === m.key ? 'var(--coral)' : 'var(--arena)', background: meal === m.key ? 'var(--durazno)' : 'var(--card)' }}>
              {m.ic} {m.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            📷 Tomar/Subir foto
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} disabled={busy} />
          </label>
          <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 180 }} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="…o describe la comida (ej: arroz con pollo y ensalada)" />
          <button className="btn btn-ghost" onClick={analyzeText} disabled={busy}>{busy ? 'Analizando…' : 'Analizar texto'}</button>
        </div>

        {result && (
          <div style={{ marginTop: 14, background: 'var(--bg)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <b style={{ color: 'var(--tinta)' }}>{result.calories ?? '—'} kcal</b>
              <span className="muted" style={{ fontSize: 13 }}>{MEALS.find((m) => m.key === (result.mealType ?? meal))?.label}</span>
            </div>
            {result.detectedItems?.length > 0 && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Detectado: {result.detectedItems.map((i: any) => i.name).join(', ')}</div>}
            {result.macros && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>P {result.macros.protein}g · C {result.macros.carbs}g · G {result.macros.fat}g</div>}
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{result.disclaimer}</div>
          </div>
        )}
      </div>

      {/* Peso y medidas + metas */}
      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Peso y medidas</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="field" style={{ marginTop: 0, width: 'auto' }} value={measure.type} onChange={(e) => setMeasure({ ...measure, type: e.target.value })}>
              {MEASURES.map((m) => <option key={m.type} value={m.type}>{m.label} ({m.unit})</option>)}
            </select>
            <input className="field" style={{ marginTop: 0, flex: 1 }} type="number" inputMode="decimal" value={measure.value} onChange={(e) => setMeasure({ ...measure, value: e.target.value })} placeholder="Valor" />
            <button className="btn btn-primary btn-sm" onClick={saveMeasure}>Guardar</button>
          </div>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            {MEASURES.filter((m) => body?.latest?.[m.type]).map((m) => {
              const l = body.latest[m.type];
              const series = (body.series?.[m.type] ?? []) as any[];
              const first = series[0]?.value, last = series[series.length - 1]?.value;
              const delta = first != null && last != null ? +(last - first).toFixed(1) : 0;
              return (
                <div key={m.type} style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
                  <div className="muted" style={{ fontSize: 12 }}>{m.label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{l.value} {l.unit}</div>
                  {delta !== 0 && <div style={{ fontSize: 11, color: delta < 0 ? 'var(--salvia-deep)' : 'var(--ambar)' }}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)} {l.unit}</div>}
                </div>
              );
            })}
            {(!body?.latest || Object.keys(body.latest).length === 0) && <p className="muted" style={{ fontSize: 13 }}>Aún no registras medidas.</p>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Mis metas</h3>
          <label className="muted" style={{ fontSize: 12 }}>Meta de calorías diarias (kcal)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="field" style={{ marginTop: 4 }} type="number" inputMode="numeric" value={targets.calories} onChange={(e) => setTargets({ ...targets, calories: e.target.value })} placeholder="ej: 2000" />
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => saveTarget('calories_daily', targets.calories)}>Guardar</button>
          </div>
          <label className="muted" style={{ fontSize: 12 }}>Meta de peso (kg)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" style={{ marginTop: 4 }} type="number" inputMode="decimal" value={targets.weight} onChange={(e) => setTargets({ ...targets, weight: e.target.value })} placeholder="ej: 70" />
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => saveTarget('weight', targets.weight)}>Guardar</button>
          </div>
          {body?.latest?.weight && targets.weight && (
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Actual {body.latest.weight.value} kg · meta {targets.weight} kg ({(body.latest.weight.value - parseFloat(targets.weight)).toFixed(1)} kg de diferencia)
            </p>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="card">
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Tus registros recientes</h3>
        {logs.length === 0 && <p className="muted">Aún no has registrado comidas.</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {logs.map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)', borderRadius: 12, padding: 10 }}>
              {l.imageSignedUrl
                ? <img src={l.imageSignedUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 10 }} />
                : <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--durazno)', display: 'grid', placeItems: 'center', fontSize: 22 }}>{MEALS.find((m) => m.key === l.mealType)?.ic ?? '🍽️'}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{MEALS.find((m) => m.key === l.mealType)?.label ?? 'Comida'} · {l.calories ?? '—'} kcal</div>
                <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(l.detectedItems ?? []).map((i: any) => i.name).join(', ') || l.note || '—'}
                </div>
              </div>
              <span className="muted" style={{ fontSize: 11 }}>{new Date(l.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
