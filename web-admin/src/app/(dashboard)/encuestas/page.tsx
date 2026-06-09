'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

interface Opt { label: string; value: number; }
interface Q { id: string; text: string; options: Opt[]; }

export default function Encuestas() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('bienestar');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Q[]>([{ id: 'q1', text: '', options: [{ label: 'Nunca', value: 0 }, { label: 'A veces', value: 1 }, { label: 'Frecuente', value: 2 }] }]);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() { setList(await api.adminTests().catch(() => [])); }
  useEffect(() => { load(); }, []);

  function addQuestion() { setQuestions((qs) => [...qs, { id: `q${qs.length + 1}`, text: '', options: [{ label: 'Nunca', value: 0 }, { label: 'A veces', value: 1 }, { label: 'Frecuente', value: 2 }] }]); }
  function setQText(i: number, text: string) { setQuestions((qs) => qs.map((q, j) => j === i ? { ...q, text } : q)); }
  function setOpt(i: number, oi: number, field: 'label' | 'value', v: string) {
    setQuestions((qs) => qs.map((q, j) => j === i ? { ...q, options: q.options.map((o, k) => k === oi ? { ...o, [field]: field === 'value' ? Number(v) || 0 : v } : o) } : q));
  }
  function removeQ(i: number) { setQuestions((qs) => qs.filter((_, j) => j !== i)); }

  async function save() {
    const valid = title.trim() && questions.every((q) => q.text.trim());
    if (!valid) { setMsg('Completa el título y el texto de cada pregunta.'); return; }
    await api.createTest({ title: title.trim(), category, description: description.trim(), questions });
    setMsg('Encuesta creada ✓'); setOpen(false); setTitle(''); setDescription('');
    setQuestions([{ id: 'q1', text: '', options: [{ label: 'Nunca', value: 0 }, { label: 'A veces', value: 1 }, { label: 'Frecuente', value: 2 }] }]);
    setTimeout(() => setMsg(null), 3000); load();
  }
  async function toggle(t: any) { await api.toggleTest(t.id, !t.active); load(); }

  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div><h2>Encuestas y quices</h2><p>Crea instrumentos orientativos (no diagnósticos) para los afiliados.</p></div>
        <button className="btn btn-primary" onClick={() => setOpen((o) => !o)}>＋ Nueva encuesta</button>
      </div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {open && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Constructor</h3>
          <div className="grid grid-2">
            <input className="field" style={{ marginTop: 0 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ej. Chequeo de estrés)" />
            <input className="field" style={{ marginTop: 0 }} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoría (estrés/sueño/ánimo…)" />
          </div>
          <input className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción breve (opcional)" />

          <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ background: 'var(--bg)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="field" style={{ marginTop: 0, flex: 1 }} value={q.text} onChange={(e) => setQText(i, e.target.value)} placeholder={`Pregunta ${i + 1}`} />
                  {questions.length > 1 && <button className="link" onClick={() => removeQ(i)}>🗑️</button>}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {q.options.map((o, oi) => (
                    <span key={oi} style={{ display: 'flex', gap: 4, alignItems: 'center', background: '#fff', borderRadius: 8, padding: '4px 6px', border: '1px solid var(--line)' }}>
                      <input style={{ width: 90, border: 0, outline: 'none' }} value={o.label} onChange={(e) => setOpt(i, oi, 'label', e.target.value)} />
                      <input style={{ width: 36, border: 0, outline: 'none', color: 'var(--muted)' }} type="number" value={o.value} onChange={(e) => setOpt(i, oi, 'value', e.target.value)} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={addQuestion}>＋ Pregunta</button>
            <button className="btn btn-primary btn-sm" onClick={save}>Guardar encuesta</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>La puntuación (estable/atención/cuidado) se calcula automáticamente según los valores de las opciones.</p>
        </div>
      )}

      <div className="table-card">
        <table>
          <thead><tr><th>Título</th><th>Categoría</th><th>Preguntas</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id}>
                <td><b>{t.title}</b></td>
                <td className="muted">{t.category}</td>
                <td>{(t.questions ?? []).length}</td>
                <td><span className="badge" style={{ background: t.active ? 'var(--salvia)' : 'var(--gris)' }}>{t.active ? 'Activa' : 'Inactiva'}</span></td>
                <td><button className="link" onClick={() => toggle(t)}>{t.active ? 'Desactivar' : 'Activar'}</button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5}><div className="empty">Sin encuestas. Crea la primera.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
