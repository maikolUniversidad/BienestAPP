'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 13, color: '#6B7A80' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#11302B' }}>{value}</div>
    </div>
  );
}

export default function Overview() {
  const [m, setM] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.metrics().then(setM).catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ padding: 24, color: '#D64545' }}>Error: {error}</div>;
  if (!m) return <div style={{ padding: 24 }}>Cargando…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Resumen — indicadores agregados</h1>
      <p style={{ color: '#6B7A80' }}>Datos anónimos y agregados (sin información personal).</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 16 }}>
        <Metric label="Usuarios activos" value={m.users} />
        <Metric label="Casos call center abiertos" value={m.callCenter?.openCases ?? 0} />
        <Metric label="Hábitos activos" value={m.moduleUsage?.habits ?? 0} />
        <Metric label="Registros de ánimo" value={m.moduleUsage?.mood ?? 0} />
        <Metric label="Entradas de diario" value={m.moduleUsage?.journal ?? 0} />
        <Metric label="Conversaciones IA" value={m.moduleUsage?.aiChat ?? 0} />
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: 'white', borderRadius: 14, padding: 18 };
