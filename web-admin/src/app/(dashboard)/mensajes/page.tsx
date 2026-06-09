'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';

const CHANNELS = [
  { key: 'email', label: '✉️ Correo' },
  { key: 'whatsapp', label: '🟢 WhatsApp' },
  { key: 'sms', label: '💬 SMS' },
];

const SAMPLE: Record<string, string> = { nombre: 'María', apellido: 'Gómez', fecha: '15 de junio, 10:00 a.m.', eps: 'Nueva EPS' };

function render(text: string, vars: Record<string, string>) {
  return (text || '').replace(/\{\{?\s*([\w.]+)\s*\}?\}/g, (_m, k) => (vars[k] != null ? vars[k] : `{{${k}}}`));
}

const BLANK = { id: '', channel: 'email', name: '', subject: '', htmlBody: '', variables: '' as string };

export default function Mensajes() {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState<any>({ ...BLANK });
  const [msg, setMsg] = useState<string | null>(null);

  async function load() { setList(await api.crmTemplates(filter || undefined).catch(() => [])); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 2500); }

  function edit(t: any) {
    setForm({ id: t.id, channel: t.channel, name: t.name, subject: t.subject ?? '', htmlBody: t.htmlBody, variables: (t.variables ?? []).join(', ') });
  }
  function reset() { setForm({ ...BLANK }); }

  async function save() {
    if (!form.name.trim() || !form.htmlBody.trim()) return flash('Nombre y cuerpo son obligatorios.');
    const body = {
      channel: form.channel, name: form.name.trim(), subject: form.subject || undefined,
      htmlBody: form.htmlBody,
      variables: form.variables.split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    if (form.id) await api.crmUpdateTemplate(form.id, body); else await api.crmCreateTemplate(body);
    flash('Plantilla guardada ✓'); reset(); load();
  }
  async function remove(id: string) { if (!confirm('¿Eliminar plantilla?')) return; await api.crmDeleteTemplate(id); load(); }

  const vars = useMemo(() => ({ ...SAMPLE }), []);
  const previewSubject = render(form.subject, vars);
  const previewBody = render(form.htmlBody, vars);

  return (
    <>
      <div className="page-head">
        <h2>Plantillas de mensajes</h2>
        <p>Crea plantillas de correo, WhatsApp y SMS con HTML y variables {'{{nombre}}'}. Previsualiza cómo se verán antes de enviarlas desde un caso.</p>
      </div>
      {msg && <div className="disclaimer-bar" style={{ background: 'var(--durazno)', color: 'var(--coral-deep)' }}>{msg}</div>}

      <div className="grid grid-2">
        {/* Editor */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>{form.id ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
          <div className="grid grid-2">
            <div>
              <label className="muted" style={{ fontSize: 12 }}>Canal</label>
              <select className="field" style={{ marginTop: 4 }} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="muted" style={{ fontSize: 12 }}>Nombre</label>
              <input className="field" style={{ marginTop: 4 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Recordatorio de cita" />
            </div>
          </div>
          {form.channel === 'email' && (
            <input className="field" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Asunto del correo" />
          )}
          <textarea className="field" style={{ minHeight: 180, fontFamily: 'monospace', fontSize: 13 }} value={form.htmlBody} onChange={(e) => setForm({ ...form, htmlBody: e.target.value })}
            placeholder={form.channel === 'email' ? '<h1>Hola {{nombre}}</h1><p>Tu cita es el {{fecha}}.</p>' : 'Hola {{nombre}}, tu cita es el {{fecha}}.'} />
          <input className="field" value={form.variables} onChange={(e) => setForm({ ...form, variables: e.target.value })} placeholder="Variables separadas por coma: nombre, fecha" />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={save}>Guardar plantilla</button>
            {form.id && <button className="btn btn-ghost" onClick={reset}>Cancelar</button>}
          </div>
        </div>

        {/* Preview */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Vista previa</h3>
          {form.channel === 'email' ? (
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: 'var(--bg)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <div className="muted" style={{ fontSize: 12 }}>Asunto</div>
                <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{previewSubject || '(sin asunto)'}</div>
              </div>
              <iframe title="preview" style={{ width: '100%', height: 320, border: 0, background: '#fff' }} srcDoc={previewBody || '<p style="color:#999;font-family:sans-serif;padding:16px">El cuerpo HTML aparecerá aquí…</p>'} />
            </div>
          ) : (
            <div style={{ background: '#E5DDD5', borderRadius: 12, padding: 18, minHeight: 200 }}>
              <div style={{ background: '#DCF8C6', borderRadius: 12, padding: 12, maxWidth: '85%', marginLeft: 'auto', whiteSpace: 'pre-wrap', color: '#111', boxShadow: '0 1px 1px rgba(0,0,0,.1)' }}>
                {previewBody || 'Tu mensaje aparecerá aquí…'}
              </div>
            </div>
          )}
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Valores de ejemplo: {Object.entries(SAMPLE).map(([k, v]) => `${k}=${v}`).join(' · ')}</p>
        </div>
      </div>

      {/* Lista */}
      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>Plantillas ({list.length})</h3>
          <select className="field" style={{ marginTop: 0, width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos los canales</option>
            {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {list.length === 0 && <p className="muted">Aún no hay plantillas. Crea la primera arriba.</p>}
          {list.map((t) => (
            <div key={t.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)', borderRadius: 12, padding: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18 }}>{CHANNELS.find((c) => c.key === t.channel)?.label.split(' ')[0] ?? '✉️'}</span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{t.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{t.subject || t.htmlBody.replace(/<[^>]+>/g, ' ').slice(0, 60)}…</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => edit(t)}>Editar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(t.id)} style={{ color: 'var(--sos)' }}>Eliminar</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
