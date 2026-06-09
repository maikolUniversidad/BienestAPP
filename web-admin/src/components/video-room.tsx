'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

/**
 * Sala de videollamada embebida con Jitsi Meet (sin claves; sala efímera por appointment).
 * La usan tanto el afiliado como el profesional (operador/médico/psicólogo).
 */
export function VideoRoom({ appointmentId, onLeave }: { appointmentId: string; onLeave?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const room = await api.appointmentRoom(appointmentId);
        if (cancelled) return;
        setInfo(room);
        await loadScript(`https://${room.domain}/external_api.js`);
        if (cancelled || !ref.current) return;
        // @ts-expect-error API global inyectada por external_api.js
        const JitsiMeetExternalAPI = window.JitsiMeetExternalAPI;
        if (!JitsiMeetExternalAPI) { setError('No se pudo cargar el motor de video.'); return; }
        apiRef.current = new JitsiMeetExternalAPI(room.domain, {
          roomName: room.room,
          parentNode: ref.current,
          userInfo: { displayName: room.displayName },
          configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true, startWithAudioMuted: false },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
          width: '100%', height: '100%',
        });
        apiRef.current.addListener('readyToClose', () => { onLeave?.(); });
        // Marca la cita como activa cuando el profesional entra.
        if (room.moderator) api.setAppointmentStatus(appointmentId, 'active').catch(() => undefined);
      } catch (e: any) {
        if (!cancelled) setError(e?.message === 'API 403' ? 'No tienes acceso a esta cita.' : 'No se pudo abrir la videollamada.');
      }
    }
    start();
    return () => { cancelled = true; try { apiRef.current?.dispose(); } catch { /* noop */ } };
  }, [appointmentId]);

  if (error) return <div className="card" style={{ color: 'var(--sos)' }}>{error}</div>;
  return (
    <div>
      {info?.appointment && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
          {info.appointment.modality === 'video' ? 'Videollamada' : 'Sesión'} · {new Date(info.appointment.scheduledAt).toLocaleString('es-CO')}
        </p>
      )}
      <div ref={ref} style={{ width: '100%', height: '72vh', borderRadius: 16, overflow: 'hidden', background: '#000' }} />
    </div>
  );
}

const loaded = new Set<string>();
function loadScript(src: string): Promise<void> {
  if (loaded.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => { loaded.add(src); resolve(); };
    s.onerror = () => reject(new Error('script load failed'));
    document.head.appendChild(s);
  });
}
