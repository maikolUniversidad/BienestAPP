'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { uploadKnowledgeFile } from '../../../lib/storage';

type SourceType = 'link' | 'text' | 'pdf' | 'doc';

const TYPE_LABEL: Record<string, string> = { link: '🔗 Enlace', text: '📝 Texto', pdf: '📄 PDF', doc: '📑 Documento' };
const STATUS_COLOR: Record<string, string> = { ready: 'var(--salvia)', processing: 'var(--ambar)', error: 'var(--sos)', pending: 'var(--gris)' };

export default function Conocimiento() {
  const [eps, setEps] = useState<{ code: string; name: string }[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ scope: string; epsCode: string }>({ scope: '', epsCode: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulario de nueva fuente
  const [scope, setScope] = useState<'global' | 'eps'>('eps');
  const [epsCode, setEpsCode] = useState('nueva_eps');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SourceType>('link');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  async function load() {
    const list = await api.knowledgeSources(filter.scope || undefined, filter.epsCode || undefined).catch(() => []);
    setSources(list);
  }
  useEffect(() => { api.listEps().then(setEps).catch(() => setEps([])); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter.scope, filter.epsCode]);

  async function submit() {
    if (!title.trim()) return flash('Ponle un título a la fuente.');
    setBusy(true);
    try {
      const body: any = { scope, title: title.trim(), type };
      if (scope === 'eps') body.epsCode = epsCode;
      if (type === 'link') {
        if (!url.trim()) { setBusy(false); return flash('Falta la URL del enlace.'); }
        body.url = url.trim();
      } else if (type === 'text') {
        if (!content.trim()) { setBusy(false); return flash('Pega el texto a indexar.'); }
        body.content = content;
      } else {
        if (!file) { setBusy(false); return flash('Selecciona el archivo a subir.'); }
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        const { path } = await uploadKnowledgeFile(file, ext);
        body.storagePath = path;
      }
      const res = await api.createKnowledgeSource(body);
      if (res?.status === 'error') flash('Se creó pero falló la indexación: ' + (res.error || ''));
      else flash(`Fuente indexada (${res?.chunkCount ?? 0} fragmentos) ✓`);
      setTitle(''); setUrl(''); setContent(''); setFile(null);
      load();
    } catch (e: any) {
      flash('No se pudo crear la fuente. ' + (e?.message || ''));
    } finally { setBusy(false); }
  }

  async function reindex(id: string) { await api.reindexKnowledgeSource(id).catch(() => undefined); flash('Reindexado.'); load(); }
  async function remove(id: string) { if (!confirm('¿Eliminar esta fuente y sus fragmentos?')) return; await api.deleteKnowledgeSource(id).catch(() => undefined); load(); }

  const epsName = (code?: string | null) => eps.find((e) => e.code === code)?.name ?? code;

  return (
    <>
      <div className="page-head">
        <h2>Base de conocimiento del asistente IA</h2>
        <p>Carga enlaces, PDF, documentos o texto. El asistente los usa (RAG) para responder con información oficial. El conocimiento <b>global</b> aplica a todos; el de una <b>EPS</b> solo a sus afiliados.</p>
      </div>
      {msg && <div className="disclaimer-bar" style={{ background: 'var(--durazno)', color: 'var(--coral-deep)' }}>{msg}</div>}

      {/* Alta de fuente */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Agregar fuente</h3>
        <div className="grid grid-2">
          <div>
            <label className="muted" style={{ fontSize: 12 }}>Alcance</label>
            <select className="field" style={{ marginTop: 4 }} value={scope} onChange={(e) => setScope(e.target.value as any)}>
              <option value="eps">Una EPS específica</option>
              <option value="global">Global (todos los afiliados)</option>
            </select>
          </div>
          {scope === 'eps' && (
            <div>
              <label className="muted" style={{ fontSize: 12 }}>EPS</label>
              <select className="field" style={{ marginTop: 4 }} value={epsCode} onChange={(e) => setEpsCode(e.target.value)}>
                {eps.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="muted" style={{ fontSize: 12 }}>Título</label>
            <input className="field" style={{ marginTop: 4 }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Catálogo de servicios de Nueva EPS" />
          </div>
          <div>
            <label className="muted" style={{ fontSize: 12 }}>Tipo</label>
            <select className="field" style={{ marginTop: 4 }} value={type} onChange={(e) => setType(e.target.value as SourceType)}>
              <option value="link">Enlace (URL / PDF en web)</option>
              <option value="text">Texto pegado</option>
              <option value="pdf">PDF (subir archivo)</option>
              <option value="doc">Documento (.txt / .md)</option>
            </select>
          </div>
        </div>

        {type === 'link' && (
          <input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.nuevaeps.com.co/..." />
        )}
        {type === 'text' && (
          <textarea className="field" style={{ minHeight: 140 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Pega aquí el contenido a indexar…" />
        )}
        {(type === 'pdf' || type === 'doc') && (
          <input className="field" type="file" accept={type === 'pdf' ? '.pdf' : '.txt,.md,.markdown'} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        )}

        <button className="btn btn-primary" onClick={submit} disabled={busy} style={{ marginTop: 12 }}>
          {busy ? 'Procesando…' : 'Agregar e indexar'}
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 13 }}>Filtrar:</span>
        <select className="field" style={{ marginTop: 0, width: 'auto' }} value={filter.scope} onChange={(e) => setFilter({ ...filter, scope: e.target.value })}>
          <option value="">Todos los alcances</option>
          <option value="global">Global</option>
          <option value="eps">Por EPS</option>
        </select>
        <select className="field" style={{ marginTop: 0, width: 'auto' }} value={filter.epsCode} onChange={(e) => setFilter({ ...filter, epsCode: e.target.value })}>
          <option value="">Todas las EPS</option>
          {eps.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}
        </select>
      </div>

      {/* Lista de fuentes */}
      <div className="card">
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Fuentes indexadas ({sources.length})</h3>
        {sources.length === 0 && <p className="muted">No hay fuentes con este filtro. Agrega la primera arriba.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {sources.map((s) => (
            <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)', borderRadius: 12, padding: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{s.title}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {TYPE_LABEL[s.type] ?? s.type} · {s.scope === 'global' ? 'Global' : `EPS: ${epsName(s.epsCode)}`} · {s.chunkCount} fragmento(s)
                  {s.url && <> · <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--azul-deep)' }}>ver enlace</a></>}
                </div>
                {s.status === 'error' && s.error && <div style={{ color: 'var(--sos)', fontSize: 12, marginTop: 2 }}>⚠ {s.error}</div>}
              </div>
              <span className="badge" style={{ background: STATUS_COLOR[s.status] ?? 'var(--gris)', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>{s.status}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => reindex(s.id)}>Reindexar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(s.id)} style={{ color: 'var(--sos)' }}>Eliminar</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
