'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { SignDocument, SignTarget } from '../../../components/sign-document';

export default function Documentos() {
  const [data, setData] = useState<any>(null);
  const [target, setTarget] = useState<SignTarget | null>(null);
  const [result, setResult] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  async function load() { setData(await api.docsMine().catch(() => ({ signed: [], pending: [], pendingAttendance: [] }))); }
  useEffect(() => { load(); }, []);

  function onDone(r: any) { setResult(r); setTarget(null); load(); setTimeout(() => setResult(null), 6000); }

  const pendingTotal = (data?.pending?.length ?? 0) + (data?.pendingAttendance?.length ?? 0);

  return (
    <>
      <div className="page-head"><h2>Mis documentos</h2><p>Firma digital de tus documentos y constancias. Cada firma queda registrada con un sello de integridad (hash), fecha, hora y dispositivo.</p></div>

      {result && (
        <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>
          ✅ Documento firmado. Sello: <code style={{ fontSize: 11 }}>{result.hash?.slice(0, 24)}…</code>
          {result.identityMatch === true && ' · Identidad verificada ✓'}
          {result.identityMatch === false && ' · ⚠ La foto no coincide con tu perfil (queda en revisión)'}
        </div>
      )}

      {target && <div style={{ marginBottom: 18 }}><SignDocument target={target} onDone={onDone} onCancel={() => setTarget(null)} /></div>}

      {/* Pendientes */}
      {pendingTotal > 0 && !target && (
        <div className="card" style={{ marginBottom: 18, borderLeft: '4px solid var(--coral)' }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Tienes {pendingTotal} pendiente(s) por firmar</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {(data.pending ?? []).map((d: any) => (
              <Row key={d.id} icon="✍️" title={d.title} sub="Documento asignado" action={() => setTarget({ signedDocumentId: d.id, title: d.title, contentSnapshot: d.contentSnapshot, requiresPhoto: false })} />
            ))}
            {(data.pendingAttendance ?? []).map((a: any) => (
              <Row key={a.appointmentId} icon="🎥" title={a.title} sub={`Cita del ${new Date(a.scheduledAt).toLocaleDateString('es-CO')}`} action={() => setTarget({ appointmentId: a.appointmentId, title: a.title, requiresPhoto: true })} />
            ))}
          </div>
        </div>
      )}

      {/* Firmados */}
      <div className="card">
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Documentos firmados</h3>
        {(data?.signed ?? []).length === 0 && <p className="muted">Aún no has firmado documentos.</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {(data?.signed ?? []).map((d: any) => (
            <div key={d.id} style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>✅ {d.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{d.signedAt ? new Date(d.signedAt).toLocaleString('es-CO') : ''}
                    {d.identityMatch === true && ' · identidad verificada'}
                    {d.identityConfidence != null && ` (${Math.round(d.identityConfidence * 100)}%)`}
                  </div>
                </div>
                <button className="link" onClick={async () => setDetail(await api.getSignedDoc(d.id).catch(() => null))}>Ver sello</button>
              </div>
              {detail?.id === d.id && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <div className="muted" style={{ fontSize: 12 }}>Hash de integridad (SHA-256):</div>
                  <code style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--tinta)' }}>{detail.hash}</code>
                  {detail.photoUrl && <img src={detail.photoUrl} alt="" style={{ width: 90, borderRadius: 10, marginTop: 8, display: 'block' }} />}
                  <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Evidencia: {detail.evidence?.platform} · {detail.evidence?.timezone} · {detail.evidence?.signedAtIso}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Row({ icon, title, sub, action }: { icon: string; title: string; sub: string; action: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{title}</div>
        <div className="muted" style={{ fontSize: 12 }}>{sub}</div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={action}>Firmar</button>
    </div>
  );
}
