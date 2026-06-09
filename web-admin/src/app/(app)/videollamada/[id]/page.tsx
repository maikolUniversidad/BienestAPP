'use client';

import { useParams, useRouter } from 'next/navigation';
import { VideoRoom } from '../../../../components/video-room';

export default function AffiliateVideoCall() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tu videoconsulta</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/citas')}>← Mis citas</button>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>Estás en una sesión segura con tu profesional de salud. Tus datos están protegidos.</p>
      <VideoRoom appointmentId={id} onLeave={() => router.push('/citas')} />
    </>
  );
}
