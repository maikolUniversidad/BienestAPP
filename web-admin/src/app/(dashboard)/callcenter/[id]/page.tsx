'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';

const MOOD: Record<string, string> = { ANXIETY: 'Ansiedad', STRESS: 'Estrés', SADNESS: 'Tristeza', MOTIVATION: 'Motivación', TIREDNESS: 'Cansancio', GRATITUDE: 'Gratitud', CALM: 'Calma', ANGER: 'Enojo', JOY: 'Alegría' };

function render(text: string, vars: Record<string, string>) {
  return (text || '').replace(/\{\{?\s*([\w.]+)\s*\}?\}/g, (_m, k) => (vars[k] != null ? vars[k] : `{{${k}}}`));
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [c, setC] = useState<any>(null);
  const [p360, setP360] = useState<any>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Mensajería
  const [templates, setTemplates] = useState<any[]>([]);
  const [channel, setChannel] = useState('email');
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');

  // Despacho
  const [dispatchAddr, setDispatchAddr] = useState('');
  const [dispatches, setDispatches] = useState<any[]>([]);

  // Cita / videollamada
  const [apptKind, setApptKind] = useState('medical');
  const [apptWhen, setApptWhen] = useState('');

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  async function load() {
    try {
      setC(await api.getCase(id));
      setP360(await api.caseProfile360(id).catch(() => null));
      setDispatches(await api.caseDispatches(id).catch(() => []));
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); api.crmTemplates().then(setTemplates).catch(() => setTemplates([])); /* eslint-disable-next-line */ }, [id]);

  async function act(fn: () => Promise<unknown>) {
    try { await fn(); await load(); } catch (e: any) { setError(e.message); }
  }

  const vars = useMemo(() => ({
    nombre: p360?.profile?.firstName ?? '', apellido: p360?.profile?.lastName ?? '',
    eps: p360?.epsName ?? '', fecha: apptWhen ? new Date(apptWhen).toLocaleString('es-CO') : '',
  }), [p360, apptWhen]);

  function pickTemplate(tid: string) {
    setTemplateId(tid);
    const t = templates.find((x) => x.id === tid);
    if (t) { setChannel(t.channel); setSubject(t.subject ?? ''); setBodyText(t.htmlBody); }
  }

  async function sendMessage() {
    const affiliateId = p360?.userId ?? c?.ticket?.user?.id;
    if (!affiliateId) return flash('No se pudo resolver el afiliado.');
    try {
      const res = await api.crmSend({ channel, toUserId: affiliateId, templateId: templateId || undefined, subject, body: bodyText, caseId: id });
      flash(res?.status === 'sent' ? 'Mensaje enviado ✓' : res?.status === 'simulated' ? 'Mensaje registrado (proveedor sin credenciales — modo simulado)' : `Estado: ${res?.status}`);
    } catch { flash('No se pudo enviar.'); }
  }

  async function dispatch(type: string) {
    await act(async () => { await api.caseDispatch(id, { type, address: dispatchAddr || undefined }); flash('Asistencia despachada ✓'); });
  }

  async function startVideo() {
    const affiliateId = p360?.userId ?? c?.ticket?.user?.id;
    if (!affiliateId) return flash('No se pudo resolver el afiliado.');
    try {
      const appt = await api.createAppointment({ affiliateId, caseId: id, kind: apptKind, modality: 'video', scheduledAt: new Date().toISOString() });
      router.push(`/atender/${appt.id}`);
    } catch { flash('No se pudo iniciar la videollamada.'); }
  }
  async function scheduleAppt() {
    const affiliateId = p360?.userId ?? c?.ticket?.user?.id;
    if (!affiliateId || !apptWhen) return flash('Elige fecha y hora.');
    await act(async () => { await api.createAppointment({ affiliateId, caseId: id, kind: apptKind, modality: 'video', scheduledAt: new Date(apptWhen).toISOString() }); setApptWhen(''); flash('Cita agendada y notificada al afiliado ✓'); });
  }

  if (error) return <p className="error">Error: {error}</p>;
  if (!c) return <p className="muted">Cargando…</p>;

  const prof = c.ticket?.user?.profile;
  const h = p360?.health;
  return (
    <>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <span className="link" onClick={() => router.push('/callcenter')}>← Cola</span>
          <h2 style={{ marginTop: 6 }}>
            Caso #{c.id.slice(-6)}{' '}
            <span className={`badge ${c.ticket?.riskLevel}`}>{c.ticket?.riskLevel}</span>{' '}
            <span className="status">{c.status}</span>
          </h2>
          <p>{c.ticket?.type} · prioridad {c.priority} · {prof ? `${prof.firstName} ${prof.lastName}` : 'Afiliado'}</p>
        </div>
        <button className="btn btn-primary" onClick={startVideo}>🎥 Iniciar videollamada</button>
      </div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      {/* Perfil 360° */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Perfil 360° del afiliado</h3>
        {!p360 ? <p className="muted">Cargando perfil…</p> : (
          <>
            <div className="grid grid-4" style={{ marginBottom: 14 }}>
              <Mini label="EPS" value={p360.epsName ?? '—'} />
              <Mini label="Documento" value={p360.profile?.documentNumber ?? '—'} />
              <Mini label="Teléfono" value={p360.profile?.phone ?? '—'} />
              <Mini label="Riesgo reciente" value={p360.lastRisk?.level ?? 'NONE'} />
            </div>
            <div className="grid grid-4" style={{ marginBottom: 14 }}>
              <Mini label="❤️ Ritmo" value={h?.heartRate ? `${h.heartRate} lpm` : '—'} />
              <Mini label="🫁 SpO₂" value={h?.spo2 ? `${h.spo2}%` : '—'} />
              <Mini label="👟 Pasos hoy" value={h?.stepsToday || '—'} />
              <Mini label="Ánimo último" value={p360.moods?.[0] ? `${MOOD[p360.moods[0].label] ?? p360.moods[0].label} (${p360.moods[0].intensity}/5)` : '—'} />
            </div>
            <div className="grid grid-2">
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Medicación activa</div>
                {(p360.medications ?? []).length ? p360.medications.map((m: any, i: number) => (
                  <div key={i} style={{ fontSize: 14 }}>• {m.name} <span className="muted">{m.dose}</span></div>
                )) : <p className="muted" style={{ fontSize: 13 }}>Sin medicación registrada.</p>}
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Contactos de emergencia</div>
                {(p360.emergencyContacts ?? []).length ? p360.emergencyContacts.map((e: any, i: number) => (
                  <div key={i} style={{ fontSize: 14 }}>• {e.name} <span className="muted">{e.relationship || ''} · {e.phone}</span></div>
                )) : <p className="muted" style={{ fontSize: 13 }}>Sin contactos.</p>}
              </div>
            </div>
            {p360.lastRisk?.summary && <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Última alerta: {p360.lastRisk.summary}</p>}
          </>
        )}
      </div>

      <div className="grid grid-2">
        {/* Acciones + notas */}
        <div className="card">
          <h3 style={{ marginBottom: 14, color: 'var(--ink-2)' }}>Acciones</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => act(() => api.setCaseStatus(id, 'IN_PROGRESS'))}>Tomar caso</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.escalate(id, 'psychologist'))}>Escalar a psicólogo</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.escalate(id, 'physician'))}>Escalar a médico</button>
            <button className="btn btn-ghost btn-sm" onClick={() => act(() => api.logCall(id, 0, 'Llamada registrada'))}>Registrar llamada</button>
            <button className="btn btn-danger btn-sm" onClick={() => act(() => api.setCaseStatus(id, 'CLOSED'))}>Cerrar caso</button>
          </div>

          <h3 style={{ margin: '22px 0 12px', color: 'var(--ink-2)' }}>Notas internas</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" style={{ marginTop: 0 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agregar nota…" />
            <button className="btn btn-primary btn-sm" onClick={() => act(async () => { await api.addNote(id, note); setNote(''); })}>Guardar</button>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {(c.notes ?? []).map((n: any) => (
              <div key={n.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString()}</div>
                {n.body}
              </div>
            ))}
            {(c.notes ?? []).length === 0 && <p className="muted">Sin notas.</p>}
          </div>
        </div>

        {/* Despacho + cita */}
        <div className="card">
          <h3 style={{ marginBottom: 12, color: 'var(--ink-2)' }}>Asistencia y telemetría</h3>
          <input className="field" style={{ marginTop: 0 }} value={dispatchAddr} onChange={(e) => setDispatchAddr(e.target.value)} placeholder="Dirección (opcional)" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button className="btn btn-danger btn-sm" onClick={() => dispatch('ambulance')}>🚑 Enviar ambulancia</button>
            <button className="btn btn-ghost btn-sm" onClick={() => dispatch('home_visit')}>🏠 Visita domiciliaria</button>
            <button className="btn btn-ghost btn-sm" onClick={() => dispatch('telemetry')}>📡 Seguimiento telemetría</button>
          </div>
          {dispatches.length > 0 && (
            <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
              {dispatches.map((d) => (
                <div key={d.id} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{d.type === 'ambulance' ? '🚑' : d.type === 'home_visit' ? '🏠' : '📡'} {d.type} · <span className="muted">{new Date(d.createdAt).toLocaleString()}</span></span>
                  <span className="badge" style={{ background: 'var(--niebla)', color: 'var(--tinta)' }}>{d.status}</span>
                </div>
              ))}
            </div>
          )}

          <h3 style={{ margin: '20px 0 10px', color: 'var(--ink-2)' }}>Agendar cita</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="field" style={{ marginTop: 0, width: 'auto' }} value={apptKind} onChange={(e) => setApptKind(e.target.value)}>
              <option value="medical">Médica</option>
              <option value="psychology">Psicología</option>
              <option value="nutrition">Nutrición</option>
              <option value="nursing">Enfermería</option>
              <option value="callcenter">Seguimiento</option>
            </select>
            <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 160 }} type="datetime-local" value={apptWhen} onChange={(e) => setApptWhen(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={scheduleAppt}>Agendar</button>
          </div>
        </div>
      </div>

      {/* Mensajería CRM */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Enviar mensaje al afiliado</h3>
        <div className="grid grid-2">
          <div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="field" style={{ marginTop: 0, width: 'auto' }} value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="email">✉️ Correo</option>
                <option value="whatsapp">🟢 WhatsApp</option>
                <option value="sms">💬 SMS</option>
              </select>
              <select className="field" style={{ marginTop: 0, flex: 1 }} value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
                <option value="">Plantilla (opcional)…</option>
                {templates.filter((t) => t.channel === channel).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {channel === 'email' && <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto" />}
            <textarea className="field" style={{ minHeight: 140, fontFamily: channel === 'email' ? 'monospace' : 'inherit', fontSize: 13 }} value={bodyText} onChange={(e) => setBodyText(e.target.value)} placeholder={channel === 'email' ? '<p>Hola {{nombre}}…</p>' : 'Hola {{nombre}}…'} />
            <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={sendMessage}>Enviar {channel === 'email' ? 'correo' : channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}</button>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Vista previa (con datos del afiliado)</div>
            {channel === 'email' ? (
              <div style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: 'var(--bg)', padding: '8px 12px', borderBottom: '1px solid var(--line)', fontWeight: 700, color: 'var(--tinta)' }}>{render(subject, vars) || '(sin asunto)'}</div>
                <iframe title="preview" style={{ width: '100%', height: 240, border: 0, background: '#fff' }} srcDoc={render(bodyText, vars) || '<p style="color:#999;font-family:sans-serif;padding:16px">Vista previa…</p>'} />
              </div>
            ) : (
              <div style={{ background: '#E5DDD5', borderRadius: 12, padding: 16, minHeight: 160 }}>
                <div style={{ background: '#DCF8C6', borderRadius: 12, padding: 12, maxWidth: '85%', marginLeft: 'auto', whiteSpace: 'pre-wrap', color: '#111' }}>{render(bodyText, vars) || 'Vista previa…'}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Llamadas */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 14, color: 'var(--ink-2)' }}>Registro de llamadas</h3>
        {(c.callLogs ?? []).map((l: any) => (
          <div key={l.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="muted">{new Date(l.createdAt).toLocaleString()}</span> — {l.outcome ?? '—'} ({l.durationSec ?? 0}s)
          </div>
        ))}
        {(c.callLogs ?? []).length === 0 && <p className="muted">Sin llamadas registradas.</p>}
        {c.escalatedTo && <p style={{ marginTop: 14 }}>Escalado a: <b>{c.escalatedTo}</b></p>}
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--tinta)', marginTop: 2 }}>{value}</div>
    </div>
  );
}
