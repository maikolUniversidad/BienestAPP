'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const TABS = ['Comunidad', 'Biblioteca', 'Voz', 'Tendencias', 'Galería'] as const;
type Tab = (typeof TABS)[number];
const SECTION: Record<string, string> = { Biblioteca: 'biblioteca', Voz: 'voz', Tendencias: 'tendencia', Galería: 'galeria' };
const SECTION_ICON: Record<string, string> = { biblioteca: '📚', voz: '🎧', tendencia: '🎬', galeria: '🖼️', articulo: '📄' };

export default function Comunidad() {
  const [tab, setTab] = useState<Tab>('Comunidad');
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [anon, setAnon] = useState(false);

  async function loadPosts() { setPosts(await api.communityPosts().catch(() => [])); }
  async function loadContent(section: string) { setContent(await api.communityContent(section).catch(() => [])); }

  useEffect(() => {
    if (tab === 'Comunidad') loadPosts();
    else loadContent(SECTION[tab]);
  }, [tab]);

  async function post() {
    if (!text.trim()) return;
    await api.createCommunityPost({ body: text.trim(), anonymous: anon });
    setText(''); loadPosts();
  }
  async function like(p: any) {
    const r = await api.likePost(p.id).catch(() => null);
    if (r) setPosts((xs) => xs.map((x) => x.id === p.id ? { ...x, likes: r.likes, likedByMe: r.liked } : x));
  }

  return (
    <>
      <div className="page-head"><h2>Nuestra comunidad</h2><p>No estás solo en esto. Un espacio seguro, anónimo si quieres, y moderado.</p></div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Comunidad' ? (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <textarea className="field" style={{ marginTop: 0, minHeight: 80 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Comparte algo con la comunidad…" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: 'var(--muted)' }}>
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Publicar como anónimo
              </label>
              <button className="btn btn-primary btn-sm" onClick={post} disabled={!text.trim()}>Publicar</button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {posts.map((p) => (
              <div key={p.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <b style={{ color: 'var(--tinta)' }}>{p.author}</b>
                  <span className="muted" style={{ fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ color: 'var(--tinta)', margin: '8px 0' }}>{p.body}</p>
                <button className="link" onClick={() => like(p)} style={{ color: p.likedByMe ? 'var(--coral-deep)' : 'var(--muted)' }}>
                  {p.likedByMe ? '❤️' : '🤍'} {p.likes}
                </button>
              </div>
            ))}
            {posts.length === 0 && <p className="muted">Sé el primero en compartir algo. 🌱</p>}
          </div>
        </>
      ) : (
        <div className="grid grid-3">
          {content.map((c) => (
            <div key={c.id} className="card hover">
              <div style={{ height: 80, borderRadius: 12, background: 'linear-gradient(135deg, var(--tinta), var(--indigo-700))', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 28, marginBottom: 10 }}>
                {SECTION_ICON[c.section] ?? '🧩'}
              </div>
              <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', fontSize: 16 }}>{c.title}</h3>
              <p className="muted" style={{ fontSize: 14, marginTop: 4 }}>{c.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                {c.author && <span className="muted" style={{ fontSize: 12 }}>{c.author}</span>}
                {c.durationLabel && <span className="badge-soft badge">{c.durationLabel}</span>}
              </div>
              {c.mediaUrl && <a className="link" href={c.mediaUrl} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: 'inline-block' }}>Abrir →</a>}
            </div>
          ))}
          {content.length === 0 && <p className="muted">Contenido en preparación para esta sección.</p>}
        </div>
      )}
    </>
  );
}
