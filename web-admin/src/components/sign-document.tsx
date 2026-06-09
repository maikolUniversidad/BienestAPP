'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { uploadDocPhoto } from '../lib/storage';

export interface SignTarget {
  signedDocumentId?: string;
  templateId?: string;
  appointmentId?: string;
  title: string;
  contentSnapshot?: string;
  requiresPhoto?: boolean;
}

/** Recoge la evidencia del dispositivo (no PII de salud) para el hash de firma. */
function deviceEvidence(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  return {
    userAgent: navigator.userAgent,
    platform: (navigator as any).platform ?? '',
    language: navigator.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: new Date().toString(),
  };
}

export function SignDocument({ target, onDone, onCancel }: { target: SignTarget; onDone: (r: any) => void; onCancel: () => void }) {
  const needPhoto = target.requiresPhoto || !!target.appointmentId;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  useEffect(() => () => stopCam(), []);

  async function startCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamOn(true);
    } catch { setErr('No se pudo acceder a la cámara. Permite el acceso para verificar tu identidad.'); }
  }
  function stopCam() { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setCamOn(false); }

  async function capture() {
    const v = videoRef.current; if (!v) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 480; canvas.height = v.videoHeight || 360;
    canvas.getContext('2d')!.drawImage(v, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.85)!);
    setBusy(true);
    try {
      const { path } = await uploadDocPhoto(blob, 'jpg');
      setPhoto({ path, preview: URL.createObjectURL(blob) });
      stopCam();
    } catch { setErr('No se pudo subir la foto.'); } finally { setBusy(false); }
  }

  async function sign() {
    if (needPhoto && !photo) return setErr('Toma una foto para verificar tu identidad.');
    if (!agree) return setErr('Debes aceptar para firmar.');
    setBusy(true); setErr(null);
    try {
      const r = await api.signDocument({
        signedDocumentId: target.signedDocumentId,
        templateId: target.templateId,
        appointmentId: target.appointmentId,
        photoPath: photo?.path,
        evidence: deviceEvidence(),
      });
      onDone(r);
    } catch { setErr('No se pudo firmar. Intenta de nuevo.'); } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ border: '2px solid var(--coral)' }}>
      <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>{target.title}</h3>
      {target.contentSnapshot
        ? <div className="md-content" style={{ background: 'var(--bg)', borderRadius: 12, padding: 14, maxHeight: 220, overflowY: 'auto', fontSize: 14 }} dangerouslySetInnerHTML={{ __html: target.contentSnapshot }} />
        : <p className="muted">Confirmo mi asistencia a la videoconsulta y la veracidad de mis datos.</p>}

      {needPhoto && (
        <div style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Verificación de identidad — toma una foto. La compararemos con la de tu perfil.</div>
          {photo ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <img src={photo.preview} alt="" style={{ width: 120, borderRadius: 12 }} />
              <button className="btn btn-ghost btn-sm" onClick={() => { setPhoto(null); startCam(); }}>Repetir</button>
            </div>
          ) : camOn ? (
            <div>
              <video ref={videoRef} playsInline muted style={{ width: '100%', maxWidth: 320, borderRadius: 12, background: '#000' }} />
              <div><button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={capture} disabled={busy}>📸 Capturar</button></div>
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={startCam}>📷 Activar cámara</button>
          )}
        </div>
      )}

      <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 14, fontSize: 14 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
        <span>Declaro que la información es veraz y firmo digitalmente este documento. Se registrará la fecha, hora y datos de mi dispositivo con un hash de integridad.</span>
      </label>

      {err && <p className="error" style={{ marginTop: 8 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn btn-primary" onClick={sign} disabled={busy}>{busy ? 'Firmando…' : '✍️ Firmar'}</button>
        <button className="btn btn-ghost" onClick={() => { stopCam(); onCancel(); }}>Cancelar</button>
      </div>
    </div>
  );
}
