'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const ICON: Record<string, string> = {
  ACHIEVEMENT: '🏅', REMINDER: '💊', RISK_ALERT: '⚠️', CALLCENTER: '📞', SYSTEM: 'ℹ️',
};

export function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  async function refreshCount() {
    try { setCount((await api.unreadCount()).count); } catch { /* noop */ }
  }
  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  async function toggle() {
    const next = !open; setOpen(next);
    if (next) { try { setItems(await api.notifications()); } catch { /* noop */ } }
  }
  async function readOne(n: any) {
    if (!n.read) { await api.markNotifRead(n.id).catch(() => undefined); setItems((xs) => xs.map((x) => x.id === n.id ? { ...x, read: true } : x)); refreshCount(); }
  }
  async function readAll() {
    await api.markAllNotifRead().catch(() => undefined);
    setItems((xs) => xs.map((x) => ({ ...x, read: true }))); setCount(0);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={toggle} aria-label="Notificaciones" style={btn}>
        🔔
        {count > 0 && <span className="bell-badge" style={badge}>{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <b style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>Notificaciones</b>
            {items.some((i) => !i.read) && <button className="link" onClick={readAll}>Marcar todas</button>}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {items.length === 0 && <div className="empty" style={{ padding: 24 }}>Sin notificaciones.</div>}
            {items.map((n) => (
              <div key={n.id} onClick={() => readOne(n)} style={{ display: 'flex', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: n.read ? '#fff' : 'var(--durazno)' }}>
                <div style={{ fontSize: 18 }}>{ICON[n.type] ?? 'ℹ️'}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--tinta)', fontSize: 14 }}>{n.title}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{n.body}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = { position: 'relative', background: 'var(--niebla)', border: '1px solid var(--line)', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', fontSize: 16 };
const badge: React.CSSProperties = { position: 'absolute', top: -6, right: -6, background: 'var(--sos)', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, display: 'grid', placeItems: 'center', padding: '0 4px' };
const panel: React.CSSProperties = { position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, maxWidth: '90vw', background: '#fff', border: '1px solid var(--line)', borderRadius: 16, boxShadow: 'var(--shadow)', zIndex: 200, overflow: 'hidden' };
