'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ORDER_TYPES = [{ k: 'lab', l: '🧪 Laboratorio' }, { k: 'imaging', l: '🩻 Imágenes' }, { k: 'medication', l: '💊 Medicamento' }, { k: 'procedure', l: '🔧 Procedimiento' }, { k: 'referral', l: '↗️ Remisión' }];
const ORDER_STATUS = ['requested', 'in_progress', 'done', 'cancelled'];

/** Espacio de Historia Clínica Electrónica para un encuentro: SOAP + signos vitales,
 *  diagnósticos CIE-10 y órdenes médicas. */
export function EncounterHCE({ encounterId, onChanged }: { encounterId: string; onChanged?: () => void }) {
  const [d, setD] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [v, setV] = useState<any>({ hr: '', bp: '', temp: '', rr: '', spo2: '', weight: '', height: '' });
  const [dx, setDx] = useState({ cie10: '', description: '', kind: 'principal' });
  const [ord, setOrd] = useState({ type: 'lab', description: '', code: '' });

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 2500); }
  async function load() { setD(await api.gestionEncounter(encounterId).catch(() => null)); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [encounterId]);

  async function saveEvolution() {
    const vitals: any = {};
    Object.entries(v).forEach(([k, val]) => { if (String(val).trim()) vitals[k] = val; });
    await api.gestionAddEvolution(encounterId, { ...soap, vitals }).catch(() => undefined);
    setSoap({ subjective: '', objective: '', assessment: '', plan: '' }); setV({ hr: '', bp: '', temp: '', rr: '', spo2: '', weight: '', height: '' });
    flash('Evolución guardada ✓'); load(); onChanged?.();
  }
  async function addDx() {
    if (!dx.cie10.trim()) return flash('Ingresa el código CIE-10.');
    await api.gestionAddDiagnosis(encounterId, dx).catch(() => undefined);
    setDx({ cie10: '', description: '', kind: 'relacionado' }); flash('Diagnóstico agregado ✓'); load(); onChanged?.();
  }
  async function addOrder() {
    if (!ord.description.trim()) return flash('Describe la orden.');
    await api.gestionAddOrder(encounterId, ord).catch(() => undefined);
    setOrd({ type: 'lab', description: '', code: '' }); flash('Orden creada ✓'); load();
  }
  async function setOrderStatus(id: string, status: string) { await api.gestionUpdateOrder(id, { status }).catch(() => undefined); load(); }
  async function close() { await api.gestionSetEncounterStatus(encounterId, 'closed').catch(() => undefined); flash('Encuentro cerrado ✓'); load(); onChanged?.(); }
  async function invoice() {
    if (!d) return;
    const inv = await api.facCreateInvoice({ userId: d.encounter.userId, encounterId }).catch(() => null);
    flash(inv ? `Factura ${inv.number} generada (ve a Facturación para valorarla) ✓` : 'No se pudo generar la factura.');
  }

  if (!d) return <div className="card" style={{ marginTop: 12 }}><p className="muted">Cargando encuentro…</p></div>;
  const e = d.encounter;

  return (
    <div className="card" style={{ marginTop: 12, borderLeft: '4px solid var(--azul)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>HCE · {e.type.replace('_', ' ')} <span className="status">{e.status}</span></h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={invoice}>🧾 Generar factura</button>
          {e.status !== 'closed' && <button className="btn btn-ghost btn-sm" onClick={close}>Cerrar encuentro</button>}
        </div>
      </div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)', marginTop: 8 }}>{msg}</div>}

      {/* SOAP + vitales */}
      <h4 style={{ margin: '14px 0 6px', color: 'var(--tinta)', fontFamily: 'Fraunces' }}>Nueva evolución (SOAP)</h4>
      <div className="grid grid-2">
        <textarea className="field" style={{ minHeight: 60 }} value={soap.subjective} onChange={(ev) => setSoap({ ...soap, subjective: ev.target.value })} placeholder="S — Subjetivo (motivo, síntomas)" />
        <textarea className="field" style={{ minHeight: 60 }} value={soap.objective} onChange={(ev) => setSoap({ ...soap, objective: ev.target.value })} placeholder="O — Objetivo (examen físico)" />
        <textarea className="field" style={{ minHeight: 60 }} value={soap.assessment} onChange={(ev) => setSoap({ ...soap, assessment: ev.target.value })} placeholder="A — Análisis / impresión diagnóstica" />
        <textarea className="field" style={{ minHeight: 60 }} value={soap.plan} onChange={(ev) => setSoap({ ...soap, plan: ev.target.value })} placeholder="P — Plan de manejo" />
      </div>
      <div className="muted" style={{ fontSize: 12, margin: '8px 0 4px' }}>Signos vitales</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[['hr', 'FC lpm'], ['bp', 'TA mmHg'], ['temp', 'T °C'], ['rr', 'FR rpm'], ['spo2', 'SpO₂ %'], ['weight', 'Peso kg'], ['height', 'Talla cm']].map(([k, label]) => (
          <input key={k} className="field" style={{ marginTop: 0, width: 92 }} value={v[k]} onChange={(ev) => setV({ ...v, [k]: ev.target.value })} placeholder={label} />
        ))}
      </div>
      <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={saveEvolution}>Guardar evolución</button>

      {(d.evolutions ?? []).length > 0 && (
        <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
          {d.evolutions.map((ev: any) => (
            <div key={ev.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: 10, fontSize: 13 }}>
              <div className="muted" style={{ fontSize: 11 }}>{new Date(ev.createdAt).toLocaleString('es-CO')}</div>
              {ev.subjective && <div><b>S:</b> {ev.subjective}</div>}
              {ev.objective && <div><b>O:</b> {ev.objective}</div>}
              {ev.assessment && <div><b>A:</b> {ev.assessment}</div>}
              {ev.plan && <div><b>P:</b> {ev.plan}</div>}
              {ev.vitals && Object.keys(ev.vitals).length > 0 && <div className="muted" style={{ fontSize: 12 }}>Vitales: {Object.entries(ev.vitals).map(([k, val]) => `${k} ${val}`).join(' · ')}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Diagnósticos */}
      <h4 style={{ margin: '18px 0 6px', color: 'var(--tinta)', fontFamily: 'Fraunces' }}>Diagnósticos (CIE-10)</h4>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <input className="field" style={{ marginTop: 0, width: 110 }} value={dx.cie10} onChange={(e2) => setDx({ ...dx, cie10: e2.target.value.toUpperCase() })} placeholder="CIE-10" />
        <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 140 }} value={dx.description} onChange={(e2) => setDx({ ...dx, description: e2.target.value })} placeholder="Descripción" />
        <select className="field" style={{ marginTop: 0, width: 'auto' }} value={dx.kind} onChange={(e2) => setDx({ ...dx, kind: e2.target.value })}><option value="principal">Principal</option><option value="relacionado">Relacionado</option></select>
        <button className="btn btn-primary btn-sm" onClick={addDx}>＋</button>
      </div>
      <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
        {(d.diagnoses ?? []).map((x: any) => <div key={x.id} style={{ fontSize: 13 }}><b>{x.cie10}</b> {x.description} <span className="muted">· {x.kind}</span></div>)}
        {(d.diagnoses ?? []).length === 0 && <p className="muted" style={{ fontSize: 13 }}>Sin diagnósticos.</p>}
      </div>

      {/* Órdenes */}
      <h4 style={{ margin: '18px 0 6px', color: 'var(--tinta)', fontFamily: 'Fraunces' }}>Órdenes médicas</h4>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select className="field" style={{ marginTop: 0, width: 'auto' }} value={ord.type} onChange={(e2) => setOrd({ ...ord, type: e2.target.value })}>{ORDER_TYPES.map((o) => <option key={o.k} value={o.k}>{o.l}</option>)}</select>
        <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 140 }} value={ord.description} onChange={(e2) => setOrd({ ...ord, description: e2.target.value })} placeholder="Descripción de la orden" />
        <input className="field" style={{ marginTop: 0, width: 100 }} value={ord.code} onChange={(e2) => setOrd({ ...ord, code: e2.target.value })} placeholder="CUPS/CUM" />
        <button className="btn btn-primary btn-sm" onClick={addOrder}>＋</button>
      </div>
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {(d.orders ?? []).map((o: any) => (
          <div key={o.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, borderBottom: '1px solid var(--line)', padding: '4px 0', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 140 }}>{ORDER_TYPES.find((t) => t.k === o.type)?.l ?? o.type} · {o.description} {o.code ? <span className="muted">({o.code})</span> : null}</span>
            <select className="field" style={{ marginTop: 0, width: 'auto', fontSize: 12 }} value={o.status} onChange={(e2) => setOrderStatus(o.id, e2.target.value)}>{ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
        ))}
        {(d.orders ?? []).length === 0 && <p className="muted" style={{ fontSize: 13 }}>Sin órdenes.</p>}
      </div>
    </div>
  );
}
