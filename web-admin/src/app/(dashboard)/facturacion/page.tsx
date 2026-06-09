'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
const money = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-CO');
const STATUS = ['draft', 'issued', 'radicada', 'partial', 'paid', 'rejected'];
const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', issued: 'Emitida', radicada: 'Radicada', partial: 'Pago parcial', paid: 'Pagada', rejected: 'Rechazada' };

export default function Facturacion() {
  const [cartera, setCartera] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState({ status: '', q: '' });
  const [inv, setInv] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [glosa, setGlosa] = useState({ code: '', description: '', value: '' });
  const [msg, setMsg] = useState<string | null>(null);
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  async function loadList() { setList(await api.facInvoices(filter.status || undefined, filter.q || undefined).catch(() => [])); }
  async function loadCartera() { setCartera(await api.facCartera().catch(() => null)); }
  useEffect(() => { loadCartera(); }, []);
  useEffect(() => { loadList(); /* eslint-disable-next-line */ }, [filter.status]);

  async function open(id: string) {
    const d = await api.facInvoice(id).catch(() => null);
    setInv(d); setLines(d?.lines ?? []);
  }
  function setLine(i: number, key: string, val: any) {
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [key]: val } : l));
  }
  async function saveLines() {
    if (!inv) return;
    const body = lines.map((l) => ({ kind: l.kind, code: l.code, description: l.description, quantity: Number(l.quantity) || 1, unitValue: Number(l.unitValue) || 0, cie10: l.cie10 }));
    await api.facUpdateLines(inv.id, body).catch(() => undefined);
    flash('Valores guardados ✓'); open(inv.id); loadList(); loadCartera();
  }
  async function setStatus(s: string) { if (!inv) return; await api.facSetStatus(inv.id, s).catch(() => undefined); flash('Estado: ' + (STATUS_LABEL[s] || s)); open(inv.id); loadList(); loadCartera(); }
  async function dlRips() { if (!inv) return; const r = await api.facRips(inv.id); download(`RIPS-${inv.number}.json`, JSON.stringify(r, null, 2), 'application/json'); }
  async function addGlosa() {
    if (!inv || !glosa.code.trim() || !glosa.description.trim()) return flash('Código y descripción de glosa requeridos.');
    await api.facAddGlosa(inv.id, { code: glosa.code, description: glosa.description, value: Number(glosa.value) || 0 }).catch(() => undefined);
    setGlosa({ code: '', description: '', value: '' }); flash('Glosa registrada ✓'); open(inv.id); loadCartera();
  }
  async function glosaStatus(id: string, status: string) { await api.facUpdateGlosa(id, { status }).catch(() => undefined); open(inv.id); loadCartera(); }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 1) * (Number(l.unitValue) || 0), 0);

  return (
    <>
      <div className="page-head"><h2>Facturación y RIPS</h2><p>Cuentas de servicios de salud, RIPS JSON (Res. 2275), gestión de glosas y cartera.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {/* Cartera */}
      {cartera && (
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <div className="card stat"><div className="lbl">Cartera pendiente</div><div className="val">{money(cartera.pendiente)}</div></div>
          <div className="card stat"><div className="lbl">Radicadas</div><div className="val">{money(cartera.byStatus?.radicada?.total || 0)}</div></div>
          <div className="card stat"><div className="lbl">Pagadas</div><div className="val">{money(cartera.byStatus?.paid?.total || 0)}</div></div>
          <div className="card stat"><div className="lbl">Glosas abiertas</div><div className="val">{money(cartera.glosasAbiertas?.value || 0)}</div></div>
        </div>
      )}

      <div className="grid grid-2">
        {/* Lista */}
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 120 }} value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && loadList()} placeholder="N° factura / paciente / EPS…" />
            <select className="field" style={{ marginTop: 0, width: 'auto' }} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
              <option value="">Todas</option>{STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gap: 6, maxHeight: 480, overflowY: 'auto' }}>
            {list.map((i) => (
              <div key={i.id} onClick={() => open(i.id)} className="chat-thread" style={{ background: inv?.id === i.id ? 'var(--durazno)' : undefined }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{i.number} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {money(i.total)}</span></div>
                  <div className="muted" style={{ fontSize: 12 }}>{i.patientName} · {STATUS_LABEL[i.status] || i.status}{i.glosaCount ? ` · ${i.glosaCount} glosa(s)` : ''}</div>
                </div>
              </div>
            ))}
            {list.length === 0 && <p className="muted">Sin facturas. Genera una desde la HCE de un encuentro.</p>}
          </div>
        </div>

        {/* Detalle */}
        <div className="card">
          {!inv ? <p className="muted">Selecciona una factura.</p> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>{inv.number} <span className="status">{STATUS_LABEL[inv.status] || inv.status}</span></h3>
                <button className="btn btn-ghost btn-sm" onClick={dlRips}>⬇ RIPS 2275</button>
              </div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{inv.patientName} · doc {inv.patientDocument || '—'} · {inv.insurerName || 'Sin aseguradora'}</div>

              {/* Líneas */}
              <div style={{ display: 'grid', gap: 6 }}>
                {lines.map((l, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ background: 'var(--niebla)', color: 'var(--tinta)', fontSize: 10 }}>{l.kind}</span>
                    <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 120, fontSize: 13 }} value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} />
                    <input className="field" style={{ marginTop: 0, width: 60, fontSize: 13 }} value={l.code ?? ''} onChange={(e) => setLine(i, 'code', e.target.value)} placeholder="CUPS" />
                    <input className="field" style={{ marginTop: 0, width: 48, fontSize: 13 }} type="number" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
                    <input className="field" style={{ marginTop: 0, width: 90, fontSize: 13 }} type="number" value={l.unitValue} onChange={(e) => setLine(i, 'unitValue', e.target.value)} placeholder="V/unit" />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <b style={{ color: 'var(--tinta)' }}>Total: {money(total)}</b>
                <button className="btn btn-primary btn-sm" onClick={saveLines}>Guardar valores</button>
              </div>

              {/* Estado */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus('issued')}>Emitir</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus('radicada')}>Radicar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus('paid')}>Marcar pagada</button>
              </div>

              {/* Glosas */}
              <h4 style={{ margin: '16px 0 8px', color: 'var(--tinta)', fontFamily: 'Fraunces' }}>Glosas</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <input className="field" style={{ marginTop: 0, width: 80 }} value={glosa.code} onChange={(e) => setGlosa({ ...glosa, code: e.target.value })} placeholder="Código" />
                <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 120 }} value={glosa.description} onChange={(e) => setGlosa({ ...glosa, description: e.target.value })} placeholder="Motivo de glosa" />
                <input className="field" style={{ marginTop: 0, width: 90 }} type="number" value={glosa.value} onChange={(e) => setGlosa({ ...glosa, value: e.target.value })} placeholder="Valor" />
                <button className="btn btn-primary btn-sm" onClick={addGlosa}>＋</button>
              </div>
              <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                {(inv.glosas ?? []).map((g: any) => (
                  <div key={g.id} style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid var(--line)', padding: '4px 0' }}>
                    <span style={{ flex: 1, minWidth: 120 }}><b>{g.code}</b> {g.description} <span className="muted">{money(g.value)}</span></span>
                    <select className="field" style={{ marginTop: 0, width: 'auto', fontSize: 12 }} value={g.status} onChange={(e) => glosaStatus(g.id, e.target.value)}>
                      <option value="open">Abierta</option><option value="answered">Respondida</option><option value="accepted">Aceptada</option><option value="conciliated">Conciliada</option>
                    </select>
                  </div>
                ))}
                {(inv.glosas ?? []).length === 0 && <p className="muted" style={{ fontSize: 13 }}>Sin glosas.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
