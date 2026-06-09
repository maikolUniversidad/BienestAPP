'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

export default function Nutricion() {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => { api.foodProSummary().then(setD).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">Error: {error}</p>;
  if (!d) return <p className="muted">Cargando…</p>;

  return (
    <>
      <div className="page-head"><h2>Nutrición</h2><p>Seguimiento del registro de alimentación de los pacientes (últimos 7 días).</p></div>

      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <div className="card stat"><div className="ic">🍎</div><div className="lbl">Pacientes activos</div><div className="val">{d.activePatients}</div></div>
        <div className="card stat"><div className="ic">📝</div><div className="lbl">Registros (7d)</div><div className="val">{d.totalEntries}</div></div>
        <div className="card stat"><div className="ic">🔥</div><div className="lbl">Prom. registros/paciente</div><div className="val">{d.activePatients ? Math.round(d.totalEntries / d.activePatients) : 0}</div></div>
      </div>

      <div className="table-card">
        <table>
          <thead><tr><th>Paciente</th><th>Registros (7d)</th><th>Calorías promedio</th><th></th></tr></thead>
          <tbody>
            {d.patients.map((p: any) => (
              <tr key={p.userId} style={{ cursor: 'pointer' }} onClick={() => router.push(`/clinico/${p.userId}`)}>
                <td><b>{p.name}</b></td>
                <td>{p.entries}</td>
                <td className="muted">~{p.avgCalories} kcal</td>
                <td><span className="link">Ver paciente →</span></td>
              </tr>
            ))}
            {d.patients.length === 0 && <tr><td colSpan={4}><div className="empty">Ningún paciente con registro de alimentación esta semana.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
