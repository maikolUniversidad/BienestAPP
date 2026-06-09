'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const BLANK = { id: null as string | null, kind: 'medicamento', code: '', name: '', unit: 'unidad', stock: '', reorderLevel: '', lot: '', expiryDate: '', location: '' };

export default function Inventario() {
  const [items, setItems] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any>(null);
  const [filter, setFilter] = useState({ kind: '', q: '' });
  const [form, setForm] = useState<any>({ ...BLANK });
  const [mov, setMov] = useState<Record<string, { type: string; quantity: string }>>({});
  const [msg, setMsg] = useState<string | null>(null);
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 2500); }

  async function load() {
    setItems(await api.invItems(filter.kind || undefined, filter.q || undefined).catch(() => []));
    setAlerts(await api.invAlerts().catch(() => null));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter.kind]);

  async function save() {
    if (!form.name.trim()) return flash('Nombre requerido.');
    const body = { ...form, stock: Number(form.stock) || 0, reorderLevel: Number(form.reorderLevel) || 0, expiryDate: form.expiryDate || undefined };
    await api.invSave(form.id, body).catch(() => undefined);
    setForm({ ...BLANK }); flash('Ítem guardado ✓'); load();
  }
  async function doMov(id: string) {
    const m = mov[id]; if (!m || !Number(m.quantity)) return flash('Cantidad inválida.');
    await api.invMovement(id, { type: m.type, quantity: Number(m.quantity) }).catch(() => undefined);
    setMov({ ...mov, [id]: { type: 'in', quantity: '' } }); flash('Movimiento aplicado ✓'); load();
  }

  return (
    <>
      <div className="page-head"><h2>Inventario</h2><p>Medicamentos e insumos con stock, lotes, vencimientos y movimientos (entradas/salidas/ajustes).</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {alerts && (alerts.lowStock.length || alerts.nearExpiry.length || alerts.expired.length) ? (
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <div className="card stat"><div className="lbl">Bajo stock</div><div className="val" style={{ color: 'var(--ambar)' }}>{alerts.lowStock.length}</div></div>
          <div className="card stat"><div className="lbl">Próx. a vencer</div><div className="val" style={{ color: 'var(--ambar)' }}>{alerts.nearExpiry.length}</div></div>
          <div className="card stat"><div className="lbl">Vencidos</div><div className="val" style={{ color: 'var(--sos)' }}>{alerts.expired.length}</div></div>
          <div className="card stat"><div className="lbl">Ítems</div><div className="val">{items.length}</div></div>
        </div>
      ) : null}

      <div className="grid grid-2">
        {/* Alta/edición */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>{form.id ? 'Editar ítem' : 'Nuevo ítem'}</h3>
          <div className="grid grid-2">
            <select className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="medicamento">Medicamento</option><option value="insumo">Insumo</option></select>
            <input className="field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CUM / CUPS" />
            <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" />
            <input className="field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unidad" />
            <input className="field" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Stock inicial" />
            <input className="field" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} placeholder="Nivel de reorden" />
            <input className="field" value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} placeholder="Lote" />
            <input className="field" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </div>
          <input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ubicación" />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={save}>{form.id ? 'Actualizar' : 'Crear ítem'}</button>
            {form.id && <button className="btn btn-ghost" onClick={() => setForm({ ...BLANK })}>Cancelar</button>}
          </div>
        </div>

        {/* Lista */}
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 120 }} value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Buscar…" />
            <select className="field" style={{ marginTop: 0, width: 'auto' }} value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })}><option value="">Todos</option><option value="medicamento">Medicamentos</option><option value="insumo">Insumos</option></select>
          </div>
          <div style={{ display: 'grid', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
            {items.map((i) => (
              <div key={i.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{i.name} {i.lowStock && <span style={{ color: 'var(--ambar)' }}>· bajo</span>} {i.expired ? <span style={{ color: 'var(--sos)' }}>· vencido</span> : i.nearExpiry && <span style={{ color: 'var(--ambar)' }}>· por vencer</span>}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{i.kind} · {i.code || 's/c'} · stock {i.stock} {i.unit} · reorden {i.reorderLevel}{i.lot ? ` · lote ${i.lot}` : ''}{i.expiryDate ? ` · vence ${new Date(i.expiryDate).toLocaleDateString('es-CO')}` : ''}</div>
                  </div>
                  <button className="link" onClick={() => setForm({ id: i.id, kind: i.kind, code: i.code ?? '', name: i.name, unit: i.unit ?? '', stock: i.stock, reorderLevel: i.reorderLevel, lot: i.lot ?? '', expiryDate: i.expiryDate?.slice(0, 10) ?? '', location: i.location ?? '' })}>Editar</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select className="field" style={{ marginTop: 0, width: 'auto', fontSize: 12 }} value={mov[i.id]?.type ?? 'in'} onChange={(e) => setMov({ ...mov, [i.id]: { type: e.target.value, quantity: mov[i.id]?.quantity ?? '' } })}>
                    <option value="in">Entrada</option><option value="out">Salida</option><option value="adjust">Ajuste</option>
                  </select>
                  <input className="field" style={{ marginTop: 0, width: 80, fontSize: 12 }} type="number" value={mov[i.id]?.quantity ?? ''} onChange={(e) => setMov({ ...mov, [i.id]: { type: mov[i.id]?.type ?? 'in', quantity: e.target.value } })} placeholder="Cant." />
                  <button className="btn btn-ghost btn-sm" onClick={() => doMov(i.id)}>Aplicar</button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="muted">Sin ítems. Crea el primero.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
