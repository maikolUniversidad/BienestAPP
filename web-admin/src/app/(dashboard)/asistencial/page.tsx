'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

const DX_LABEL: Record<string, string> = { lab: '🧪 Laboratorio', imaging: '🩻 Imagenología' };

export default function Asistencial() {
  const [tab, setTab] = useState<'dx' | 'domiciliaria'>('dx');
  const [msg, setMsg] = useState<string | null>(null);
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  // Diagnósticos
  const [orders, setOrders] = useState<any[]>([]);
  const [dxFilter, setDxFilter] = useState({ type: '', status: '' });
  const [result, setResult] = useState<Record<string, string>>({});

  // Domiciliaria
  const [visits, setVisits] = useState<any[]>([]);
  const [vForm, setVForm] = useState({ userId: '', scheduledAt: '', address: '', reason: '' });
  const [reg, setReg] = useState<Record<string, { notes: string; hr: string; spo2: string }>>({});

  async function loadDx() { setOrders(await api.dxWorklist(dxFilter.type || undefined, dxFilter.status || undefined).catch(() => [])); }
  async function loadVisits() { setVisits(await api.homeVisits().catch(() => [])); }
  useEffect(() => { loadDx(); loadVisits(); /* eslint-disable-next-line */ }, [dxFilter.type, dxFilter.status]);

  async function saveResult(id: string) {
    const r = result[id]; if (!r?.trim()) return flash('Escribe el resultado.');
    await api.dxSetResult(id, { result: r, status: 'done' }).catch(() => undefined);
    flash('Resultado registrado ✓ (reflejado en FHIR)'); loadDx();
  }
  async function schedule() {
    if (!vForm.userId.trim() || !vForm.scheduledAt) return flash('userId y fecha requeridos.');
    await api.homeSchedule({ ...vForm, scheduledAt: new Date(vForm.scheduledAt).toISOString() }).catch(() => undefined);
    setVForm({ userId: '', scheduledAt: '', address: '', reason: '' }); flash('Visita programada y notificada ✓'); loadVisits();
  }
  async function registerVisit(id: string) {
    const r = reg[id] || { notes: '', hr: '', spo2: '' };
    const vitals: any = {}; if (Number(r.hr)) vitals.hr = Number(r.hr); if (Number(r.spo2)) vitals.spo2 = Number(r.spo2);
    await api.homeRegister(id, { notes: r.notes, vitals, status: 'done' }).catch(() => undefined);
    flash('Visita registrada ✓'); loadVisits();
  }

  return (
    <>
      <div className="page-head"><h2>Atención asistencial</h2><p>Ayudas diagnósticas (laboratorio e imagenología) y atención domiciliaria (hospitalización en casa).</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'dx' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('dx')}>Ayudas diagnósticas</button>
        <button className={`btn btn-sm ${tab === 'domiciliaria' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('domiciliaria')}>Atención domiciliaria</button>
      </div>

      {tab === 'dx' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <select className="field" style={{ marginTop: 0, width: 'auto' }} value={dxFilter.type} onChange={(e) => setDxFilter({ ...dxFilter, type: e.target.value })}><option value="">Todas</option><option value="lab">Laboratorio</option><option value="imaging">Imagenología</option></select>
            <select className="field" style={{ marginTop: 0, width: 'auto' }} value={dxFilter.status} onChange={(e) => setDxFilter({ ...dxFilter, status: e.target.value })}><option value="">Todos los estados</option><option value="requested">Solicitadas</option><option value="done">Con resultado</option></select>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {orders.map((o) => (
              <div key={o.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{DX_LABEL[o.type] ?? o.type} · {o.description} {o.code ? <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>({o.code})</span> : null}</div>
                <div className="muted" style={{ fontSize: 12 }}>{o.name} · {o.status} · {new Date(o.createdAt).toLocaleDateString('es-CO')}</div>
                {o.result ? <div style={{ fontSize: 13, marginTop: 6, color: 'var(--salvia-deep)' }}>Resultado: {o.result}</div> : (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input className="field" style={{ marginTop: 0, flex: 1 }} value={result[o.id] ?? ''} onChange={(e) => setResult({ ...result, [o.id]: e.target.value })} placeholder="Resultado / hallazgos" />
                    <button className="btn btn-primary btn-sm" onClick={() => saveResult(o.id)}>Guardar</button>
                  </div>
                )}
              </div>
            ))}
            {orders.length === 0 && <p className="muted">Sin órdenes diagnósticas. Se generan desde las órdenes de la HCE.</p>}
          </div>
        </div>
      )}

      {tab === 'domiciliaria' && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Programar visita</h3>
            <input className="field" value={vForm.userId} onChange={(e) => setVForm({ ...vForm, userId: e.target.value })} placeholder="userId del paciente" />
            <input className="field" type="datetime-local" value={vForm.scheduledAt} onChange={(e) => setVForm({ ...vForm, scheduledAt: e.target.value })} />
            <input className="field" value={vForm.address} onChange={(e) => setVForm({ ...vForm, address: e.target.value })} placeholder="Dirección" />
            <input className="field" value={vForm.reason} onChange={(e) => setVForm({ ...vForm, reason: e.target.value })} placeholder="Motivo" />
            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={schedule}>Programar y notificar</button>
          </div>
          <div className="card">
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Visitas</h3>
            <div style={{ display: 'grid', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
              {visits.map((v) => (
                <div key={v.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{v.name} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {v.status}</span></div>
                  <div className="muted" style={{ fontSize: 12 }}>{new Date(v.scheduledAt).toLocaleString('es-CO')}{v.address ? ` · ${v.address}` : ''}{v.reason ? ` · ${v.reason}` : ''}</div>
                  {v.status === 'scheduled' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <input className="field" style={{ marginTop: 0, width: 60, fontSize: 12 }} value={reg[v.id]?.hr ?? ''} onChange={(e) => setReg({ ...reg, [v.id]: { ...(reg[v.id] || { notes: '', hr: '', spo2: '' }), hr: e.target.value } })} placeholder="FC" />
                      <input className="field" style={{ marginTop: 0, width: 60, fontSize: 12 }} value={reg[v.id]?.spo2 ?? ''} onChange={(e) => setReg({ ...reg, [v.id]: { ...(reg[v.id] || { notes: '', hr: '', spo2: '' }), spo2: e.target.value } })} placeholder="SpO₂" />
                      <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 100, fontSize: 12 }} value={reg[v.id]?.notes ?? ''} onChange={(e) => setReg({ ...reg, [v.id]: { ...(reg[v.id] || { notes: '', hr: '', spo2: '' }), notes: e.target.value } })} placeholder="Notas de la visita" />
                      <button className="btn btn-primary btn-sm" onClick={() => registerVisit(v.id)}>Registrar</button>
                    </div>
                  )}
                  {v.notes && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>📝 {v.notes}</div>}
                </div>
              ))}
              {visits.length === 0 && <p className="muted">Sin visitas programadas.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
