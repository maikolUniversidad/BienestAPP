'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

function csv(name: string, rows: any[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const body = [headers.join(','), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export default function Reportes() {
  const [ov, setOv] = useState<any>(null);
  const [prod, setProd] = useState<any>(null);
  const [rein, setRein] = useState<any>(null);
  const [opo, setOpo] = useState<any>(null);
  const [pyp, setPyp] = useState<any>(null);
  const [range, setRange] = useState({ from: '', to: '' });

  async function load() {
    setOv(await api.repOverview().catch(() => null));
    const f = range.from || undefined, t = range.to || undefined;
    setProd(await api.repProduccion(f, t).catch(() => null));
    setRein(await api.repReingresos(f, t).catch(() => null));
    setOpo(await api.repOportunidad(f, t).catch(() => null));
    setPyp(await api.repPyp(f, t).catch(() => null));
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <div className="page-head"><h2>Reportes</h2><p>Producción por especialista, reingresos, oportunidad de citas (Res. 1552) y promoción y prevención (Res. 202).</p></div>

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div><label className="muted" style={{ fontSize: 12 }}>Desde</label><input className="field" style={{ marginTop: 2 }} type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
        <div><label className="muted" style={{ fontSize: 12 }}>Hasta</label><input className="field" style={{ marginTop: 2 }} type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
        <button className="btn btn-primary btn-sm" onClick={load}>Aplicar</button>
      </div>

      {ov && (
        <div className="grid grid-4" style={{ marginBottom: 16 }}>
          <div className="card stat"><div className="lbl">Encuentros</div><div className="val">{ov.produccion.totalEncuentros}</div></div>
          <div className="card stat"><div className="lbl">Citas atendidas</div><div className="val">{ov.produccion.totalCitas}</div></div>
          <div className="card stat"><div className="lbl">Reingresos &lt;72h</div><div className="val">{ov.reingresos.r72}</div></div>
          <div className="card stat"><div className="lbl">Actividades PYP</div><div className="val">{ov.pyp.actividadesPyp}</div></div>
        </div>
      )}

      <div className="grid grid-2">
        {/* Producción */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>Producción por especialista</h3>
            <button className="link" onClick={() => csv('produccion.csv', prod?.rows ?? [])}>⬇ CSV</button>
          </div>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr><th>Profesional</th><th>Enc.</th><th>Citas</th><th>Total</th></tr></thead>
            <tbody>{(prod?.rows ?? []).map((r: any) => <tr key={r.professionalId}><td>{r.name}</td><td>{r.encuentros}</td><td>{r.citas}</td><td><b>{r.total}</b></td></tr>)}</tbody>
          </table>
          {(prod?.rows ?? []).length === 0 && <p className="muted">Sin datos en el rango.</p>}
        </div>

        {/* Oportunidad */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 8 }}>Oportunidad de citas (Res. 1552)</h3>
          <table style={{ width: '100%', fontSize: 13 }}>
            <thead><tr><th>Tipo</th><th>Citas</th><th>Días prom.</th></tr></thead>
            <tbody>{(opo?.rows ?? []).map((r: any) => <tr key={r.kind}><td>{r.kind}</td><td>{r.citas}</td><td><b>{r.diasPromedio}</b></td></tr>)}</tbody>
          </table>
          {(opo?.rows ?? []).length === 0 && <p className="muted">Sin datos.</p>}
        </div>

        {/* Reingresos */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 8 }}>Reingresos</h3>
          <div className="grid grid-2">
            <div className="card stat"><div className="lbl">&lt; 72 horas</div><div className="val">{rein?.reingresos72h ?? 0}</div></div>
            <div className="card stat"><div className="lbl">&lt; 30 días</div><div className="val">{rein?.reingresos30d ?? 0}</div></div>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Pacientes con encuentro: {rein?.totalPacientes ?? 0}</p>
        </div>

        {/* PYP */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 8 }}>Promoción y Prevención (Res. 202)</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Actividades PYP</span><b>{pyp?.actividadesPyp ?? 0}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Consultas preventivas</span><b>{pyp?.consultasPreventivas ?? 0}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tamizajes aplicados</span><b>{pyp?.tamizajesAplicados ?? 0}</b></div>
          </div>
        </div>
      </div>
    </>
  );
}
