'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';

const TABS = ['Resumen', 'Alertas', 'Hábitos', 'Metas', 'Notas'] as const;
type Tab = (typeof TABS)[number];

const MOOD: Record<string, string> = {
  ANXIETY: 'Ansiedad', SADNESS: 'Tristeza', STRESS: 'Estrés', ANGER: 'Enojo', TIREDNESS: 'Cansancio',
  GRATITUDE: 'Gratitud', MOTIVATION: 'Motivación', JOY: 'Alegría', CALM: 'Calma',
};

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('Resumen');
  const [note, setNote] = useState('');
  const [cat, setCat] = useState('seguimiento');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { setD(await api.clinicalPatient(id)); } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, [id]);

  async function addNote() {
    if (!note.trim()) return;
    await api.addClinicalNote(id, note.trim(), cat); setNote(''); load();
  }

  if (error) return <p className="error">Error: {error}</p>;
  if (!d) return <p className="muted">Cargando…</p>;

  return (
    <>
      <div className="page-head">
        <span className="link" onClick={() => router.push('/clinico')}>← Tablero clínico</span>
        <h2 style={{ marginTop: 6 }}>{d.name}</h2>
        <p>{d.journalCount} entradas de diario · racha {d.bestStreak} días · {d.activeMeds} medicamento(s) activo(s)</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>{t}</button>
        ))}
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/medicamentos/${id}`)}>💊 Medicación</button>
      </div>

      {tab === 'Resumen' && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Ánimo reciente</h3>
            {d.moods.length === 0 && <p className="muted">Sin registros de ánimo.</p>}
            {d.moods.map((m: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{MOOD[m.label] ?? m.label} · {m.intensity}/5</span>
                <span className="muted">{new Date(m.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Riesgo</h3>
            {d.risks.length === 0 ? <p className="muted">Sin evaluaciones de riesgo.</p> : (
              <>
                <p>Última: <span className={`badge ${d.risks[0].level}`}>{d.risks[0].level}</span> <span className="muted">({d.risks[0].source})</span></p>
                <p className="muted" style={{ marginTop: 6 }}>Pendientes de revisión: {d.risks.filter((r: any) => !r.reviewedByHuman).length}</p>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'Alertas' && (
        <div className="table-card">
          <table>
            <thead><tr><th>Nivel</th><th>Origen</th><th>Fecha</th><th>Revisada</th></tr></thead>
            <tbody>
              {d.risks.map((r: any) => (
                <tr key={r.id}>
                  <td><span className={`badge ${r.level}`}>{r.level}</span></td>
                  <td className="muted">{r.source}</td>
                  <td className="muted">{new Date(r.createdAt).toLocaleString()}</td>
                  <td>{r.reviewedByHuman ? '✓' : '—'}</td>
                </tr>
              ))}
              {d.risks.length === 0 && <tr><td colSpan={4}><div className="empty">Sin alertas.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Hábitos' && (
        <div className="grid grid-3">
          {d.habits.map((h: any) => (
            <div key={h.name} className="card"><b style={{ color: 'var(--tinta)' }}>{h.name}</b><p className="muted">Racha: {h.streak} 🔥</p></div>
          ))}
          {d.habits.length === 0 && <p className="muted">Sin hábitos activos.</p>}
        </div>
      )}

      {tab === 'Metas' && (
        <div className="grid grid-2">
          {d.goals.map((g: any) => (
            <div key={g.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ color: 'var(--tinta)' }}>{g.title}</b><span className={`badge ${g.status === 'completed' ? 'LOW' : 'MEDIUM'}`}>{g.status}</span></div>
              <div style={{ height: 8, background: 'var(--niebla)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${g.progress}%`, background: 'var(--coral)' }} />
              </div>
            </div>
          ))}
          {d.goals.length === 0 && <p className="muted">Sin metas.</p>}
        </div>
      )}

      {tab === 'Notas' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Nueva nota de seguimiento</h3>
            <div className="chips" style={{ marginBottom: 8 }}>
              {['seguimiento', 'evaluacion', 'observacion'].map((c) => (
                <button key={c} className="chip" style={cat === c ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>
            <textarea className="field" style={{ marginTop: 0, minHeight: 90 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escribe la nota clínica…" />
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={addNote} disabled={!note.trim()}>Guardar nota</button>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {d.notes.map((n: any) => (
              <div key={n.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span className="badge-soft badge">{n.category}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ color: 'var(--tinta)' }}>{n.body}</p>
              </div>
            ))}
            {d.notes.length === 0 && <p className="muted">Sin notas registradas.</p>}
          </div>
        </>
      )}
    </>
  );
}
