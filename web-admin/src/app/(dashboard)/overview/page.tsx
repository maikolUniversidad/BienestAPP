'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

function Stat({ ic, label, value }: { ic: string; label: string; value: number | string }) {
  return (
    <div className="card hover stat">
      <div className="ic">{ic}</div>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </div>
  );
}

export default function Overview() {
  const [m, setM] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.metrics().then(setM).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">Error: {error}</p>;
  if (!m) return <p className="muted">Cargando…</p>;

  return (
    <>
      <div className="page-head">
        <h2>Indicadores de bienestar</h2>
        <p>Datos agregados y anónimos — sin información personal identificable.</p>
      </div>
      <div className="grid grid-3">
        <Stat ic="👥" label="Usuarios activos" value={m.users} />
        <Stat ic="📞" label="Casos call center abiertos" value={m.callCenter?.openCases ?? 0} />
        <Stat ic="🔥" label="Hábitos activos" value={m.moduleUsage?.habits ?? 0} />
        <Stat ic="😊" label="Registros de ánimo" value={m.moduleUsage?.mood ?? 0} />
        <Stat ic="📔" label="Entradas de diario" value={m.moduleUsage?.journal ?? 0} />
        <Stat ic="💬" label="Conversaciones IA" value={m.moduleUsage?.aiChat ?? 0} />
      </div>
    </>
  );
}
