'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { api } from '../../../lib/api';

const KIND: Record<string, string> = { medical: 'Médica', psychology: 'Psicología', nutrition: 'Nutrición', nursing: 'Enfermería', callcenter: 'Seguimiento', social: 'Trabajo social' };
const MOD: Record<string, string> = { video: '🎥 Videollamada', phone: '📞 Llamada', in_person: '🏥 Presencial' };

export default function Citas() {
  const [appts, setAppts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.myAppointments().then(setAppts).catch(() => setAppts([])).finally(() => setLoading(false)); }, []);

  // Permite unirse 10 min antes y durante la cita.
  const canJoin = (a: any) => a.modality === 'video' && (a.status === 'active' || Math.abs(new Date(a.scheduledAt).getTime() - Date.now()) < 30 * 60 * 1000 || new Date(a.scheduledAt).getTime() <= Date.now());

  return (
    <>
      <div className="page-head"><h2>Mis citas</h2><p>Tus consultas y videollamadas con el equipo de salud. Te avisamos antes de cada una.</p></div>

      {loading && <p className="muted">Cargando…</p>}
      {!loading && appts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40 }}>🗓️</div>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginTop: 8 }}>No tienes citas programadas</h3>
          <p className="muted">Cuando el equipo de salud agende una cita contigo, aparecerá aquí y te llegará una notificación.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {appts.map((a) => {
          const when = new Date(a.scheduledAt);
          const soon = when.getTime() - Date.now() < 24 * 3600 * 1000 && when.getTime() > Date.now();
          return (
            <div key={a.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--durazno)', display: 'grid', placeItems: 'center', fontSize: 24 }}>
                {a.modality === 'video' ? '🎥' : a.modality === 'phone' ? '📞' : '🏥'}
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>Consulta {KIND[a.kind] ?? a.kind}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {when.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}
                  {a.professionalName ? ` · con ${a.professionalName}` : ''}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{MOD[a.modality] ?? a.modality} · {a.status === 'active' ? 'en curso' : soon ? 'próximamente' : 'programada'}</div>
              </div>
              {canJoin(a)
                ? <Link className="btn btn-primary btn-sm" href={`/videollamada/${a.id}`}>Unirme</Link>
                : <span className="badge" style={{ background: 'var(--niebla)', color: 'var(--tinta)' }}>{a.status === 'completed' ? 'Finalizada' : 'Programada'}</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}
