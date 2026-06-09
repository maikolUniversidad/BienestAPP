'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const ROLES = ['AFFILIATE', 'CALLCENTER_OPERATOR', 'PSYCHOLOGIST', 'PHYSICIAN', 'EPS_ADMIN', 'AUDITOR'];
const ROLE_LABEL: Record<string, string> = {
  AFFILIATE: 'Afiliado', CALLCENTER_OPERATOR: 'Operador', PSYCHOLOGIST: 'Psicólogo',
  PHYSICIAN: 'Médico', EPS_ADMIN: 'Admin', AUDITOR: 'Auditor', SUPERADMIN: 'Superadmin',
};

export default function Usuarios() {
  const [tab, setTab] = useState<'lista' | 'crear' | 'masivo'>('lista');
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  // crear individual
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 'AFFILIATE' });
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  // masivo
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<any[] | null>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);

  async function load() { setUsers(await api.adminUsers(q || undefined).catch(() => [])); }
  useEffect(() => { load(); }, []);

  async function createUser() {
    const r: any = await api.adminCreateUser(form).catch(() => ({ ok: false, error: 'Error' }));
    setCreateMsg(r.ok ? `✓ Creado ${form.email} (contraseña: Bienestar123)` : `✕ ${r.error}`);
    if (r.ok) { setForm({ email: '', firstName: '', lastName: '', role: 'AFFILIATE' }); load(); }
    setTimeout(() => setCreateMsg(null), 4000);
  }

  function parseCsv() {
    // Formato: email,nombre,apellido,rol  (una fila por usuario; encabezado opcional)
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    const rows = lines
      .filter((l) => !/^email\s*,/i.test(l))
      .map((l) => {
        const [email, firstName, lastName, role] = l.split(',').map((x) => (x ?? '').trim());
        const valid = /.+@.+\..+/.test(email || '');
        return { email, firstName, lastName, role: ROLES.includes(role) ? role : 'AFFILIATE', valid };
      });
    setPreview(rows);
  }
  async function confirmBulk() {
    if (!preview) return;
    const res = await api.adminBulkUsers(preview.filter((r) => r.valid).map(({ email, firstName, lastName, role }) => ({ email, firstName, lastName, role })));
    setBulkResult(res); setPreview(null); setCsv(''); load();
  }

  return (
    <>
      <div className="page-head"><h2>Gestión de usuarios</h2><p>Crea usuarios individualmente o por cargue masivo.</p></div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['lista', 'crear', 'masivo'] as const).map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>
            {t === 'lista' ? 'Usuarios' : t === 'crear' ? 'Crear' : 'Cargue masivo'}
          </button>
        ))}
      </div>

      {tab === 'lista' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input className="field" style={{ marginTop: 0, maxWidth: 320 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo" />
            <button className="btn btn-primary btn-sm" onClick={load}>Buscar</button>
          </div>
          <div className="table-card">
            <table>
              <thead><tr><th>Nombre</th><th>Correo</th><th>Roles</th><th>Estado</th><th>Alta</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.name}</b></td>
                    <td className="muted">{u.email}</td>
                    <td>{u.roles.map((r: string) => <span key={r} className="badge-soft badge" style={{ marginRight: 4 }}>{ROLE_LABEL[r] ?? r}</span>)}</td>
                    <td><span className="status">{u.status}</span></td>
                    <td className="muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={5}><div className="empty">Sin usuarios.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'crear' && (
        <div className="card" style={{ maxWidth: 520 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Crear usuario</h3>
          <input className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Correo" />
          <div className="grid grid-2">
            <input className="field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Nombre" />
            <input className="field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Apellido" />
          </div>
          <label className="muted" style={{ fontSize: 12, display: 'block', marginTop: 10 }}>Rol</label>
          <div className="chips">{ROLES.map((r) => <button key={r} className="chip" style={form.role === r ? { background: 'var(--coral)', color: '#fff' } : {}} onClick={() => setForm({ ...form, role: r })}>{ROLE_LABEL[r]}</button>)}</div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={createUser} disabled={!form.email || !form.firstName}>Crear (contraseña: Bienestar123)</button>
          {createMsg && <p style={{ marginTop: 10, color: createMsg.startsWith('✓') ? 'var(--salvia-deep)' : 'var(--sos)' }}>{createMsg}</p>}
        </div>
      )}

      {tab === 'masivo' && (
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 6 }}>Cargue masivo</h3>
          <p className="muted" style={{ marginBottom: 10 }}>Pega una fila por usuario: <code>correo,nombre,apellido,rol</code> (rol: AFFILIATE, PSYCHOLOGIST, …). Contraseña inicial: Bienestar123.</p>
          <textarea className="field" style={{ marginTop: 0, minHeight: 140, fontFamily: 'monospace' }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'ana@correo.co,Ana,Lopez,AFFILIATE\njuan@correo.co,Juan,Ruiz,PSYCHOLOGIST'} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={parseCsv} disabled={!csv.trim()}>Previsualizar</button>
            {preview && <button className="btn btn-primary btn-sm" onClick={confirmBulk}>Confirmar carga ({preview.filter((r) => r.valid).length} válidos)</button>}
          </div>

          {preview && (
            <div className="table-card" style={{ marginTop: 14 }}>
              <table>
                <thead><tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Validez</th></tr></thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td>{r.email || '—'}</td><td>{r.firstName} {r.lastName}</td><td>{ROLE_LABEL[r.role] ?? r.role}</td>
                      <td>{r.valid ? <span className="badge LOW">OK</span> : <span className="badge CRITICAL">Correo inválido</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {bulkResult && (
            <div style={{ marginTop: 14, background: 'var(--durazno)', borderRadius: 12, padding: 14 }}>
              <b>Resultado:</b> {bulkResult.created} de {bulkResult.total} creados.
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                {bulkResult.results.filter((r: any) => !r.ok).map((r: any, i: number) => <div key={i}>✕ {r.email}: {r.error}</div>)}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
