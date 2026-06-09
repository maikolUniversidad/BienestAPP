'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const SECTIONS: [string, string][] = [
  ['biblioteca', '📚 Biblioteca'], ['voz', '🎧 Voz'], ['tendencia', '🎬 Tendencias'], ['galeria', '🖼️ Galería'], ['articulo', '📄 Artículo'],
];

export default function ComunidadAdmin() {
  const [tab, setTab] = useState<'contenido' | 'moderacion'>('contenido');
  const [content, setContent] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [form, setForm] = useState({ section: 'biblioteca', title: '', description: '', mediaUrl: '', author: '', durationLabel: '' });
  const [msg, setMsg] = useState<string | null>(null);

  async function loadContent() { setContent(await api.communityContent().catch(() => [])); }
  async function loadPosts() { setPosts(await api.adminCommunityPosts().catch(() => [])); }
  useEffect(() => { loadContent(); loadPosts(); }, []);

  async function create() {
    if (!form.title.trim()) return;
    await api.adminCreateContent(form);
    setForm({ section: form.section, title: '', description: '', mediaUrl: '', author: '', durationLabel: '' });
    setMsg('Contenido publicado ✓'); setTimeout(() => setMsg(null), 2500); loadContent();
  }
  async function removeContent(id: string) { await api.adminRemoveContent(id); loadContent(); }
  async function moderate(id: string, status: string) { await api.moderatePost(id, status); loadPosts(); }

  return (
    <>
      <div className="page-head"><h2>Comunidad</h2><p>Publica contenido editorial y modera el feed.</p></div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'contenido' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('contenido')}>Contenido</button>
        <button className={`btn btn-sm ${tab === 'moderacion' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('moderacion')}>Moderación del feed</button>
      </div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {tab === 'contenido' ? (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Nuevo contenido</h3>
            <div className="chips" style={{ marginBottom: 10 }}>
              {SECTIONS.map(([k, l]) => <button key={k} className="chip" style={form.section === k ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => setForm({ ...form, section: k })}>{l}</button>)}
            </div>
            <input className="field" style={{ marginTop: 0 }} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" />
            <input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" />
            <div className="grid grid-3">
              <input className="field" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Autor (opcional)" />
              <input className="field" value={form.durationLabel} onChange={(e) => setForm({ ...form, durationLabel: e.target.value })} placeholder="Duración (ej. 5 min)" />
              <input className="field" value={form.mediaUrl} onChange={(e) => setForm({ ...form, mediaUrl: e.target.value })} placeholder="URL de media (opcional)" />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={create} disabled={!form.title.trim()}>Publicar</button>
          </div>
          <div className="table-card">
            <table>
              <thead><tr><th>Sección</th><th>Título</th><th>Autor</th><th></th></tr></thead>
              <tbody>
                {content.map((c) => (
                  <tr key={c.id}>
                    <td><span className="badge-soft badge">{c.section}</span></td>
                    <td><b>{c.title}</b></td>
                    <td className="muted">{c.author || '—'}</td>
                    <td><button className="link" onClick={() => removeContent(c.id)}>Quitar</button></td>
                  </tr>
                ))}
                {content.length === 0 && <tr><td colSpan={4}><div className="empty">Sin contenido aún.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="table-card">
          <table>
            <thead><tr><th>Autor</th><th>Contenido</th><th>Estado</th><th>❤️</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.anonymous ? 'Anónimo' : p.author}</td>
                  <td style={{ maxWidth: 360 }}>{p.body}</td>
                  <td><span className="badge" style={{ background: p.status === 'approved' ? 'var(--salvia)' : 'var(--sos)' }}>{p.status}</span></td>
                  <td>{p.likes}</td>
                  <td>{p.status === 'approved'
                    ? <button className="link" onClick={() => moderate(p.id, 'hidden')}>Ocultar</button>
                    : <button className="link" onClick={() => moderate(p.id, 'approved')}>Aprobar</button>}</td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={5}><div className="empty">Sin publicaciones.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
