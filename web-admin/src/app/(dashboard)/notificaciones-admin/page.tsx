'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const LEVELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Alta / crítica', color: 'var(--sos)' },
  2: { label: 'Normal', color: 'var(--azul-deep)' },
  3: { label: 'Informativa', color: 'var(--salvia-deep)' },
};
const TYPES = ['REMINDER', 'ACHIEVEMENT', 'RISK_ALERT', 'CALLCENTER', 'SYSTEM'];

export default function NotificacionesAdmin() {
  const [data, setData] = useState<any>(null);
  const [eps, setEps] = useState<{ code: string; name: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [bc, setBc] = useState({ category: 'broadcast', type: 'SYSTEM', title: '', body: '', href: '', audience: 'all', epsCode: '' });
  const [nc, setNc] = useState({ key: '', label: '', type: 'SYSTEM', level: 2, icon: '', href: '' });

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }
  async function load() { setData(await api.notifOverview().catch(() => null)); }
  useEffect(() => { load(); api.listEps().then(setEps).catch(() => setEps([])); }, []);

  async function patch(key: string, body: any) { await api.updateNotifCategory(key, body).catch(() => undefined); load(); }
  async function createCat() {
    if (!nc.key.trim() || !nc.label.trim()) return flash('Clave y nombre son obligatorios.');
    await api.createNotifCategory({ ...nc, key: nc.key.trim().toLowerCase().replace(/\s+/g, '_') }).catch(() => undefined);
    setNc({ key: '', label: '', type: 'SYSTEM', level: 2, icon: '', href: '' }); flash('Categoría creada ✓'); load();
  }
  async function broadcast() {
    if (!bc.title.trim() || !bc.body.trim()) return flash('Título y mensaje son obligatorios.');
    const r = await api.broadcastNotif(bc).catch(() => null);
    flash(r ? `Enviado a ${r.sent} afiliado(s) ✓` : 'No se pudo enviar.');
    setBc({ ...bc, title: '', body: '' }); load();
  }

  const cats: any[] = data?.categories ?? [];
  const counts = data?.counts7d ?? {};
  const broadcastable = cats.filter((c) => c.broadcastable);

  return (
    <>
      <div className="page-head"><h2>Centro de notificaciones</h2><p>Jerarquía y clasificación de las notificaciones. Activa o silencia categorías, ajusta su prioridad, crea nuevas y envía comunicados.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {/* Resumen */}
      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="lbl">Categorías</div><div className="val">{cats.length}</div></div>
        <div className="card stat"><div className="lbl">Activas</div><div className="val">{cats.filter((c) => c.enabled).length}</div></div>
        <div className="card stat"><div className="lbl">Sin leer (global)</div><div className="val">{data?.totalUnread ?? 0}</div></div>
        <div className="card stat"><div className="lbl">Emitidas 7 días</div><div className="val">{Object.values(counts).reduce((s: number, n: any) => s + n, 0)}</div></div>
      </div>

      {/* Categorías por jerarquía */}
      {[1, 2, 3].map((level) => {
        const group = cats.filter((c) => c.level === level);
        if (!group.length) return null;
        return (
          <div className="card" style={{ marginBottom: 14 }} key={level}>
            <h3 style={{ fontFamily: 'Fraunces', color: LEVELS[level].color, marginBottom: 10 }}>Prioridad {LEVELS[level].label}</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {group.map((c) => (
                <div key={c.key} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)', borderRadius: 12, padding: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 20 }}>{c.icon ?? '🔔'}</span>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{c.label} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {c.key}</span></div>
                    <div className="muted" style={{ fontSize: 12 }}>{c.description ?? c.type} · {counts[c.key] ?? 0} en 7 días{c.broadcastable ? ' · emitible' : ''}</div>
                  </div>
                  <select className="field" style={{ marginTop: 0, width: 'auto' }} value={c.level} onChange={(e) => patch(c.key, { level: Number(e.target.value) })}>
                    <option value={1}>Alta</option><option value={2}>Normal</option><option value={3}>Info</option>
                  </select>
                  <button className="badge" onClick={() => patch(c.key, { enabled: !c.enabled })} style={{ background: c.enabled ? 'var(--salvia)' : 'var(--gris)', color: '#fff', border: 0, cursor: 'pointer', padding: '6px 12px' }}>
                    {c.enabled ? 'Activa ✓' : 'Silenciada'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="grid grid-2">
        {/* Crear categoría */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Nueva categoría</h3>
          <div className="grid grid-2">
            <input className="field" value={nc.key} onChange={(e) => setNc({ ...nc, key: e.target.value })} placeholder="clave (ej: vacunacion)" />
            <input className="field" value={nc.label} onChange={(e) => setNc({ ...nc, label: e.target.value })} placeholder="Nombre visible" />
            <input className="field" value={nc.icon} onChange={(e) => setNc({ ...nc, icon: e.target.value })} placeholder="Emoji (ej: 💉)" />
            <input className="field" value={nc.href} onChange={(e) => setNc({ ...nc, href: e.target.value })} placeholder="Ruta (ej: /citas)" />
            <select className="field" value={nc.type} onChange={(e) => setNc({ ...nc, type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <select className="field" value={nc.level} onChange={(e) => setNc({ ...nc, level: Number(e.target.value) })}>
              <option value={1}>Alta</option><option value={2}>Normal</option><option value={3}>Info</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={createCat}>Crear categoría</button>
        </div>

        {/* Enviar comunicado */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Enviar comunicado</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="field" style={{ marginTop: 0 }} value={bc.category} onChange={(e) => setBc({ ...bc, category: e.target.value })}>
              {broadcastable.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              {broadcastable.length === 0 && <option value="broadcast">Comunicados</option>}
            </select>
            <select className="field" style={{ marginTop: 0 }} value={bc.type} onChange={(e) => setBc({ ...bc, type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <input className="field" value={bc.title} onChange={(e) => setBc({ ...bc, title: e.target.value })} placeholder="Título" />
          <textarea className="field" style={{ minHeight: 80 }} value={bc.body} onChange={(e) => setBc({ ...bc, body: e.target.value })} placeholder="Mensaje" />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" style={{ flex: 1 }} value={bc.href} onChange={(e) => setBc({ ...bc, href: e.target.value })} placeholder="Ruta destino (opcional, ej: /citas)" />
            <select className="field" style={{ width: 'auto' }} value={bc.audience} onChange={(e) => setBc({ ...bc, audience: e.target.value })}>
              <option value="all">Todos</option><option value="eps">Por EPS</option>
            </select>
          </div>
          {bc.audience === 'eps' && (
            <select className="field" value={bc.epsCode} onChange={(e) => setBc({ ...bc, epsCode: e.target.value })}>
              <option value="">Selecciona EPS…</option>
              {eps.map((e) => <option key={e.code} value={e.code}>{e.name}</option>)}
            </select>
          )}
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={broadcast}>Enviar a afiliados</button>
        </div>
      </div>

      {/* Recientes */}
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Notificaciones recientes</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {(data?.recent ?? []).map((n: any) => (
            <div key={n.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 16 }}>{n.read ? '○' : '●'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, color: 'var(--tinta)' }}>{n.title}</span>
                <span className="muted" style={{ fontSize: 12 }}> · {n.category ?? n.type}</span>
                <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
              </div>
              <span className="muted" style={{ fontSize: 11 }}>{new Date(n.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          ))}
          {(data?.recent ?? []).length === 0 && <p className="muted">Sin notificaciones recientes.</p>}
        </div>
      </div>
    </>
  );
}
