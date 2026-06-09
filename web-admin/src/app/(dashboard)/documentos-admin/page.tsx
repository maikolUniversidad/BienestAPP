'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { uploadDocPhoto } from '../../../lib/storage';

const KINDS = [{ k: 'attendance', l: 'Asistencia' }, { k: 'consent', l: 'Consentimiento' }, { k: 'authorization', l: 'Autorización' }, { k: 'generic', l: 'General' }];
const SAMPLE = { nombre: 'María Gómez', documento: '52123456', fecha: 'hoy', ips: 'IPS Bienestar' };
const render = (t: string, v: Record<string, string>) => (t || '').replace(/\{\{?\s*([\w.]+)\s*\}?\}/g, (_m, k) => (v[k] != null ? v[k] : `{{${k}}}`));

export default function DocumentosAdmin() {
  const [ips, setIps] = useState<any[]>([]);
  const [tpls, setTpls] = useState<any[]>([]);
  const [signed, setSigned] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [ipsForm, setIpsForm] = useState<any>({ id: null, name: '', nit: '', epsCode: '', address: '', phone: '', logoPath: '' });
  const [tpl, setTpl] = useState<any>({ id: null, name: '', kind: 'attendance', description: '', htmlBody: '', ipsId: '', requiresPhoto: true });
  const [assign, setAssign] = useState({ templateId: '', userId: '' });

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }
  async function load() {
    setIps(await api.docIpsList().catch(() => []));
    setTpls(await api.docTemplates().catch(() => []));
    setSigned(await api.docSignedList().catch(() => []));
  }
  useEffect(() => { load(); }, []);

  async function saveIps() {
    if (!ipsForm.name.trim()) return flash('Nombre de IPS requerido.');
    await api.docIpsSave(ipsForm.id, ipsForm).catch(() => undefined);
    setIpsForm({ id: null, name: '', nit: '', epsCode: '', address: '', phone: '', logoPath: '' }); flash('IPS guardada ✓'); load();
  }
  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    try { const { path } = await uploadDocPhoto(f, (f.name.split('.').pop() || 'png').toLowerCase()); setIpsForm({ ...ipsForm, logoPath: path }); flash('Logo subido ✓'); } catch { flash('No se pudo subir el logo.'); }
    e.target.value = '';
  }
  async function saveTpl() {
    if (!tpl.name.trim() || !tpl.htmlBody.trim()) return flash('Nombre y cuerpo requeridos.');
    await api.docTemplateSave(tpl.id, { ...tpl, ipsId: tpl.ipsId || undefined }).catch(() => undefined);
    setTpl({ id: null, name: '', kind: 'attendance', description: '', htmlBody: '', ipsId: '', requiresPhoto: true }); flash('Plantilla guardada ✓'); load();
  }
  async function doAssign() {
    if (!assign.templateId || !assign.userId.trim()) return flash('Elige plantilla y userId.');
    const r = await api.docAssign(assign.templateId, assign.userId.trim()).catch(() => null);
    flash(r ? 'Documento asignado al afiliado ✓' : 'No se pudo asignar.'); setAssign({ templateId: '', userId: '' });
  }

  return (
    <>
      <div className="page-head"><h2>Gestión documental</h2><p>Administra las IPS (logo y datos), las plantillas de documentos firmables y consulta el control de firmas con su sello de integridad.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {/* IPS */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>IPS prestadoras</h3>
        <div className="grid grid-2">
          <div>
            <div className="grid grid-2">
              <input className="field" value={ipsForm.name} onChange={(e) => setIpsForm({ ...ipsForm, name: e.target.value })} placeholder="Nombre IPS" />
              <input className="field" value={ipsForm.nit} onChange={(e) => setIpsForm({ ...ipsForm, nit: e.target.value })} placeholder="NIT" />
              <input className="field" value={ipsForm.phone} onChange={(e) => setIpsForm({ ...ipsForm, phone: e.target.value })} placeholder="Teléfono" />
              <input className="field" value={ipsForm.epsCode} onChange={(e) => setIpsForm({ ...ipsForm, epsCode: e.target.value })} placeholder="EPS (código)" />
            </div>
            <input className="field" value={ipsForm.address} onChange={(e) => setIpsForm({ ...ipsForm, address: e.target.value })} placeholder="Dirección" />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
              <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>🖼️ Subir logo<input type="file" accept="image/*" hidden onChange={onLogo} /></label>
              {ipsForm.logoPath && <span className="muted" style={{ fontSize: 12 }}>logo listo ✓</span>}
              <button className="btn btn-primary btn-sm" onClick={saveIps} style={{ marginLeft: 'auto' }}>{ipsForm.id ? 'Actualizar' : 'Crear IPS'}</button>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {ips.map((i) => (
              <div key={i.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg)', borderRadius: 12, padding: 10 }}>
                {i.logoUrl ? <img src={i.logoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: '#fff' }} /> : <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--durazno)', display: 'grid', placeItems: 'center' }}>🏥</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{i.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{i.nit || '—'} · {i.phone || ''}</div>
                </div>
                <button className="link" onClick={() => setIpsForm({ id: i.id, name: i.name, nit: i.nit ?? '', epsCode: i.epsCode ?? '', address: i.address ?? '', phone: i.phone ?? '', logoPath: i.logoPath ?? '' })}>Editar</button>
              </div>
            ))}
            {ips.length === 0 && <p className="muted">Sin IPS registradas.</p>}
          </div>
        </div>
      </div>

      {/* Plantillas */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Tipos de documento</h3>
        <div className="grid grid-2">
          <div>
            <div className="grid grid-2">
              <input className="field" value={tpl.name} onChange={(e) => setTpl({ ...tpl, name: e.target.value })} placeholder="Nombre del documento" />
              <select className="field" value={tpl.kind} onChange={(e) => setTpl({ ...tpl, kind: e.target.value })}>{KINDS.map((k) => <option key={k.k} value={k.k}>{k.l}</option>)}</select>
              <select className="field" value={tpl.ipsId} onChange={(e) => setTpl({ ...tpl, ipsId: e.target.value })}><option value="">IPS (opcional)…</option>{ips.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}><input type="checkbox" checked={tpl.requiresPhoto} onChange={(e) => setTpl({ ...tpl, requiresPhoto: e.target.checked })} /> Requiere foto (identidad)</label>
            </div>
            <textarea className="field" style={{ minHeight: 150, fontFamily: 'monospace', fontSize: 13 }} value={tpl.htmlBody} onChange={(e) => setTpl({ ...tpl, htmlBody: e.target.value })} placeholder="<h2>Título</h2><p>Yo {{nombre}} ({{documento}})… {{fecha}} {{ips}}</p>" />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={saveTpl}>{tpl.id ? 'Actualizar' : 'Crear plantilla'}</button>
              {tpl.id && <button className="btn btn-ghost" onClick={() => setTpl({ id: null, name: '', kind: 'attendance', description: '', htmlBody: '', ipsId: '', requiresPhoto: true })}>Cancelar</button>}
            </div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Vista previa</div>
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, background: '#fff', minHeight: 120, color: '#111' }} dangerouslySetInnerHTML={{ __html: render(tpl.htmlBody, SAMPLE) || '<span style="color:#999">El documento aparecerá aquí…</span>' }} />
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              {tpls.map((t) => (
                <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{t.requiresPhoto ? '📷 ' : '📄 '}{t.name} <span className="muted">· {t.kind}</span></span>
                  <button className="link" onClick={() => setTpl({ id: t.id, name: t.name, kind: t.kind, description: t.description ?? '', htmlBody: t.htmlBody, ipsId: t.ipsId ?? '', requiresPhoto: t.requiresPhoto })}>Editar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Asignar + Control */}
      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Asignar documento a un afiliado</h3>
          <select className="field" value={assign.templateId} onChange={(e) => setAssign({ ...assign, templateId: e.target.value })}><option value="">Plantilla…</option>{tpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input className="field" value={assign.userId} onChange={(e) => setAssign({ ...assign, userId: e.target.value })} placeholder="userId del afiliado" />
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={doAssign}>Asignar (queda pendiente de firma)</button>
        </div>
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Control de firmas ({signed.length})</h3>
          <div style={{ display: 'grid', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {signed.map((d) => (
              <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 600, color: 'var(--tinta)', fontSize: 14 }}>{d.status === 'signed' ? '✅' : '⏳'} {d.title}</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {d.signedAt ? new Date(d.signedAt).toLocaleString('es-CO') : 'pendiente'}
                  {d.identityMatch === true && ' · identidad ✓'} {d.identityMatch === false && ' · identidad ✗'}
                </div>
                {d.hash && <code style={{ fontSize: 10, color: 'var(--muted)', wordBreak: 'break-all' }}>{d.hash.slice(0, 40)}…</code>}
              </div>
            ))}
            {signed.length === 0 && <p className="muted">Sin firmas registradas.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
