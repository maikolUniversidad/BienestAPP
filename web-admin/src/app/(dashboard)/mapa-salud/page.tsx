'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { HealthMap, statusColor, MapMarker } from '../../../components/health-map';

const STATUS_LABEL: Record<string, string> = { available: 'Disponible', en_route: 'En ruta', attending: 'Atendiendo', offline: 'Fuera de turno' };

export default function MapaSalud() {
  const [agents, setAgents] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);

  async function load() { setAgents(await api.campoAgents().catch(() => [])); }
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  async function openAgent(userId: string) {
    const a = agents.find((x) => x.userId === userId);
    setSel(a); setHistory(null);
    setHistory(await api.campoAgentHistory(userId).catch(() => null));
  }

  const markers: MapMarker[] = agents.map((a) => ({ id: a.userId, lat: a.lat, lng: a.lng, label: `${a.name} · ${a.zone || ''}`, sub: `${STATUS_LABEL[a.status]} · turno ${a.shiftStart}-${a.shiftEnd} · ${a.pendingVisits ?? 0} visita(s)`, color: statusColor(a.status) }));
  const counts = agents.reduce((acc: any, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  return (
    <>
      <div className="page-head"><h2>Mapa de salud — médicos out-door</h2><p>Ubicación, estado y turno de los médicos de atención domiciliaria. Toca un marcador para ver su histórico.</p></div>

      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        {(['available', 'en_route', 'attending', 'offline'] as const).map((s) => (
          <div className="card stat" key={s}><div className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 999, background: statusColor(s) }} />{STATUS_LABEL[s]}</div><div className="val">{counts[s] || 0}</div></div>
        ))}
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ padding: 8 }}>
          <HealthMap markers={markers} onSelect={openAgent} height="68vh" />
        </div>
        <div className="card">
          {!sel ? (
            <>
              <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Equipo en campo ({agents.length})</h3>
              <div style={{ display: 'grid', gap: 6, maxHeight: '60vh', overflowY: 'auto' }}>
                {agents.map((a) => (
                  <div key={a.userId} onClick={() => openAgent(a.userId)} className="chat-thread">
                    <span style={{ width: 12, height: 12, borderRadius: 999, background: statusColor(a.status), flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{a.name} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {a.zone}</span></div>
                      <div className="muted" style={{ fontSize: 12 }}>{STATUS_LABEL[a.status]} · {a.shiftStart}-{a.shiftEnd} · {a.pendingVisits ?? 0} pendiente(s)</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>{sel.name}</h3>
                <button className="link" onClick={() => { setSel(null); setHistory(null); }}>← Volver</button>
              </div>
              <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: statusColor(sel.status), fontWeight: 700 }}>● {STATUS_LABEL[sel.status]}</span> · {sel.zone} · {sel.specialty}<br />
                Turno {sel.shiftStart}–{sel.shiftEnd} · Tel {sel.phone || '—'} · Última actualización {new Date(sel.lastUpdate).toLocaleString('es-CO')}
              </div>
              <div className="grid grid-2" style={{ marginBottom: 10 }}>
                <div className="card stat"><div className="lbl">Domiciliarias</div><div className="val">{history?.totalDomiciliarias ?? '…'}</div></div>
                <div className="card stat"><div className="lbl">Servicios totales</div><div className="val">{sel.activeServices ?? 0}</div></div>
              </div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Histórico de visitas</div>
              <div style={{ display: 'grid', gap: 4, maxHeight: '38vh', overflowY: 'auto' }}>
                {(history?.visits ?? []).map((v: any) => (
                  <div key={v.id} style={{ fontSize: 13, borderBottom: '1px solid var(--line)', padding: '4px 0' }}>{v.name} · {v.status} <span className="muted">{new Date(v.scheduledAt).toLocaleString('es-CO')}</span></div>
                ))}
                {history && (history.visits ?? []).length === 0 && <p className="muted" style={{ fontSize: 13 }}>Sin visitas registradas.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
