'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function RolesAcceso() {
  const [catalog, setCatalog] = useState<{ modules: any[]; roles: any[] }>({ modules: [], roles: [] });
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [role, setRole] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 2000); }

  async function load() {
    const c = await api.rbacCatalog().catch(() => ({ modules: [], roles: [] }));
    setCatalog(c); if (!role && c.roles[0]) setRole(c.roles[0].name);
    setMatrix(await api.rbacMatrix().catch(() => ({})));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const disabledSet = new Set(matrix[role] ?? []);
  const isEnabled = (key: string) => !disabledSet.has(key);

  async function toggle(key: string, enabled: boolean) {
    // optimista
    setMatrix((m) => {
      const cur = new Set(m[role] ?? []);
      if (enabled) cur.delete(key); else cur.add(key);
      return { ...m, [role]: Array.from(cur) };
    });
    await api.rbacToggle(role, key, enabled).catch(() => undefined);
    flash('Acceso actualizado ✓');
  }

  const groups = Array.from(new Set(catalog.modules.map((m) => m.group)));

  return (
    <>
      <div className="page-head"><h2>Roles y accesos</h2><p>Activa o desactiva los módulos y submódulos que puede ver cada rol. Los cambios afectan el menú de ese rol.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Roles */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Roles del sistema</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {catalog.roles.map((r) => {
              const off = (matrix[r.name] ?? []).filter((k) => !k.includes('.')).length;
              return (
                <div key={r.name} onClick={() => setRole(r.name)} className="chat-thread" style={{ background: role === r.name ? 'var(--durazno)' : undefined }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{r.label}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.name}{off ? ` · ${off} módulo(s) ocultos` : ' · acceso completo'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Módulos del rol seleccionado */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 4 }}>Módulos de: {catalog.roles.find((r) => r.name === role)?.label ?? '—'}</h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Marca lo que el rol puede ver. Despliega un módulo para sus submódulos.</p>
          <div style={{ display: 'grid', gap: 12, maxHeight: '66vh', overflowY: 'auto' }}>
            {groups.map((g) => (
              <div key={g}>
                <div className="nav-group-label" style={{ color: 'var(--coral-deep)', padding: '4px 0' }}>{g}</div>
                <div style={{ display: 'grid', gap: 4 }}>
                  {catalog.modules.filter((m) => m.group === g).map((m) => (
                    <div key={m.key} style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer' }}>
                          <input type="checkbox" checked={isEnabled(m.key)} onChange={(e) => toggle(m.key, e.target.checked)} />
                          <span style={{ fontWeight: 700, color: 'var(--tinta)' }}>{m.label}</span>
                        </label>
                        {m.subs.length > 0 && <button className="link" onClick={() => setExpanded({ ...expanded, [m.key]: !expanded[m.key] })}>{expanded[m.key] ? '▾' : '▸'} {m.subs.length}</button>}
                      </div>
                      {expanded[m.key] && m.subs.length > 0 && (
                        <div style={{ display: 'grid', gap: 4, marginTop: 6, paddingLeft: 24 }}>
                          {m.subs.map((s: string, i: number) => {
                            const subKey = `${m.key}.${i}`;
                            return (
                              <label key={subKey} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: isEnabled(m.key) ? 1 : .5, cursor: 'pointer' }}>
                                <input type="checkbox" disabled={!isEnabled(m.key)} checked={isEnabled(subKey)} onChange={(e) => toggle(subKey, e.target.checked)} />
                                <span>{s}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
