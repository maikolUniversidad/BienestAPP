'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

const KIND: Record<string, string> = { medical: 'Médica', psychology: 'Psicología', nutrition: 'Nutrición', nursing: 'Enfermería', callcenter: 'Seguimiento', social: 'Trabajo social' };

export default function Agenda() {
  const router = useRouter();
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() { setAppts(await api.appointmentsStaff('upcoming').catch(() => [])); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) { await api.setAppointmentStatus(id, status).catch(() => undefined); load(); }

  return (
    <>
      <div className="page-head"><h2>Mi agenda</h2><p>Tus próximas citas y videoconsultas. Inicia la videollamada cuando el afiliado esté listo.</p></div>

      {loading && <p className="muted">Cargando…</p>}
      {!loading && appts.length === 0 && <div className="card"><p className="muted">No tienes citas próximas. Agéndalas desde un caso del call center o desde el panel clínico.</p></div>}

      <div style={{ display: 'grid', gap: 12 }}>
        {appts.map((a) => (
          <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--durazno)', display: 'grid', placeItems: 'center', fontSize: 22 }}>
              {a.modality === 'video' ? '🎥' : a.modality === 'phone' ? '📞' : '🏥'}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{a.affiliateName ?? 'Afiliado'} · {KIND[a.kind] ?? a.kind}</div>
              <div className="muted" style={{ fontSize: 13 }}>{new Date(a.scheduledAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })} · {a.status}</div>
              {a.reason && <div className="muted" style={{ fontSize: 12 }}>{a.reason}</div>}
            </div>
            {a.modality === 'video' && a.status !== 'completed' && a.status !== 'cancelled' && (
              <button className="btn btn-primary btn-sm" onClick={() => router.push(`/atender/${a.id}`)}>Iniciar</button>
            )}
            {a.status !== 'completed' && a.status !== 'cancelled' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a.id, 'completed')}>Completar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a.id, 'cancelled')} style={{ color: 'var(--sos)' }}>Cancelar</button>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
