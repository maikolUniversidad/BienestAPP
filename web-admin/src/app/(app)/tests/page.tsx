'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';

const BAND: Record<string, { l: string; c: string }> = {
  estable: { l: 'Estable', c: 'var(--salvia)' },
  'atención': { l: 'Atención', c: 'var(--ambar)' },
  cuidado: { l: 'Cuidado', c: 'var(--sos)' },
};

export default function Tests() {
  const [list, setList] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null); // test abierto
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);

  function loadMine() { api.myTestResults().then(setMine).catch(() => setMine([])); }
  useEffect(() => { api.tests().then(setList).catch(() => setList([])); loadMine(); }, []);

  async function openTest(id: string) {
    setResult(null); setAnswers({});
    const t = await api.test(id).catch(() => null); setActive(t);
  }
  async function submit() {
    if (!active) return;
    const r = await api.submitTest(active.id, answers); setResult(r);
  }

  const questions = (active?.questions ?? []) as any[];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  if (result) {
    const band = BAND[result.band] ?? { l: result.band, c: 'var(--azul)' };
    return (
      <>
        <div className="page-head"><h2>{active?.title}</h2></div>
        <div className="card" style={{ maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🌱</div>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '8px 0' }}>Resultado orientativo</h3>
          <span className="badge" style={{ background: band.c, fontSize: 14 }}>{band.l}</span>
          {result.interpretation && (
            <div style={{ margin: '14px 0', background: 'var(--durazno)', borderRadius: 12, padding: 14, textAlign: 'left' }}>
              <div className="muted" style={{ fontSize: 12 }}>💡 Interpretación</div>
              <p style={{ color: 'var(--tinta)', marginTop: 4 }}>{result.interpretation}</p>
            </div>
          )}
          <p className="muted" style={{ margin: '14px 0' }}>{result.message}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {(result.recommendations ?? []).map((r: string, i: number) => <span key={i} className="chip" style={{ cursor: 'default' }}>{r}</span>)}
          </div>
          {result.crisisProtocol?.active && (
            <div className="crisis-banner" style={{ marginTop: 14 }}>
              <h4>Estamos contigo</h4><p>{result.crisisProtocol.containmentMessage}</p>
              <div className="lines">{result.crisisProtocol.emergencyLines?.map((l: any) => <a key={l.number} className="pill-line" href={`tel:${l.number}`}>{l.label} {l.number}</a>)}</div>
            </div>
          )}
          <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => { setActive(null); setResult(null); loadMine(); }}>Volver a tests</button>
        </div>
      </>
    );
  }

  if (active) {
    return (
      <>
        <div className="page-head"><span className="link" onClick={() => setActive(null)}>← Tests</span><h2 style={{ marginTop: 6 }}>{active.title}</h2><p>{active.description}</p></div>
        <div className="card" style={{ maxWidth: 620 }}>
          {questions.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 600, color: 'var(--tinta)', marginBottom: 8 }}>{i + 1}. {q.text}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(q.options ?? []).map((o: any) => (
                  <button key={o.label} className="chip" style={answers[q.id] === o.value ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}>{o.label}</button>
                ))}
              </div>
            </div>
          ))}
          <button className="btn btn-primary" onClick={submit} disabled={!allAnswered}>Ver mi resultado</button>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Orientativo · no reemplaza una valoración profesional.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-head"><h2>Tests y evaluaciones</h2><p>Chequeos breves y orientativos de tu bienestar.</p></div>
      <div className="grid grid-3">
        {list.map((t) => (
          <button key={t.id} className="card hover" style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--line)' }} onClick={() => openTest(t.id)}>
            <div style={{ fontSize: 28 }}>📋</div>
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '8px 0 4px' }}>{t.title}</h3>
            <p className="muted" style={{ fontSize: 14 }}>{t.description || t.category}</p>
          </button>
        ))}
        {list.length === 0 && <p className="muted">No hay tests disponibles por ahora.</p>}
      </div>

      {mine.length > 0 && (
        <>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '24px 0 12px' }}>Mis resultados</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {mine.map((r) => {
              const band = BAND[r.band] ?? { l: r.band, c: 'var(--azul)' };
              return (
                <div key={r.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <b style={{ color: 'var(--tinta)' }}>{r.title}</b>
                    <span className="badge" style={{ background: band.c }}>{band.l}</span>
                  </div>
                  {r.interpretation && <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>💡 {r.interpretation}</p>}
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
