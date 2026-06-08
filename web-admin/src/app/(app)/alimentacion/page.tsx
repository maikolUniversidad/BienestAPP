'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function Alimentacion() {
  const [desc, setDesc] = useState('');
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() { setLogs(await api.foodList().catch(() => [])); }
  useEffect(() => { load(); }, []);

  async function analyze() {
    if (!desc.trim() || busy) return;
    setBusy(true); setResult(null);
    try {
      const r = await api.analyzeFood(desc.trim());
      setResult(r); setDesc(''); load();
    } catch { setResult({ error: true }); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="page-head"><h2>Alimentación con IA</h2><p>Describe tu comida y la IA estima calorías y macros (aproximado).</p></div>

      <div className="card">
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="field" style={{ marginTop: 0 }} value={desc} onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()} placeholder="Ej: arroz con pollo, ensalada y jugo de naranja" />
          <button className="btn btn-primary" onClick={analyze} disabled={busy}>{busy ? 'Analizando…' : 'Analizar'}</button>
        </div>
        {result && !result.error && (
          <div style={{ marginTop: 16 }}>
            <div className="grid grid-4">
              <div className="card stat"><div className="lbl">Calorías (aprox.)</div><div className="val">{result.calories ?? '?'}</div></div>
              <div className="card stat"><div className="lbl">Proteína</div><div className="val" style={{ fontSize: 22 }}>{result.macros?.protein ?? '?'}g</div></div>
              <div className="card stat"><div className="lbl">Carbohidratos</div><div className="val" style={{ fontSize: 22 }}>{result.macros?.carbs ?? '?'}g</div></div>
              <div className="card stat"><div className="lbl">Grasa</div><div className="val" style={{ fontSize: 22 }}>{result.macros?.fat ?? '?'}g</div></div>
            </div>
            <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>{result.disclaimer}</p>
          </div>
        )}
        {result?.error && <p className="error" style={{ marginTop: 12 }}>No se pudo analizar. Intenta de nuevo.</p>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ color: 'var(--ink-2)', marginBottom: 10 }}>Historial reciente</h3>
        {logs.map((l) => (
          <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="muted">{new Date(l.createdAt).toLocaleString()}</span>
            <b>{l.calories ?? '?'} kcal</b>
          </div>
        ))}
        {logs.length === 0 && <p className="muted">Sin registros aún.</p>}
      </div>
    </>
  );
}
