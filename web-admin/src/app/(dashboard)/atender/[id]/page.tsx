'use client';

import { useParams, useRouter } from 'next/navigation';
import { VideoRoom } from '../../../../components/video-room';

export default function StaffVideoCall() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Videollamada de atención</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Volver</button>
      </div>
      <VideoRoom appointmentId={id} onLeave={() => router.back()} />
    </>
  );
}
