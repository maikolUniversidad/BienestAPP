'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { EncounterHCE } from '../../../components/encounter-hce';

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

const ENC_TYPES = ['consulta_externa', 'urgencias', 'hospitalizacion', 'uci', 'domiciliaria', 'pyp', 'laboratorio', 'imagenologia', 'cirugia'];

export default function GestionSalud() {
  const [tab, setTab] = useState<'pacientes' | 'contratos'>('pacientes');
  const [msg, setMsg] = useState<string | null>(null);
  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(null), 3000); }

  // Pacientes
  const [q, setQ] = useState('');
  const [patients, setPatients] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [record, setRecord] = useState<any>({});
  const [encs, setEncs] = useState<any[]>([]);
  const [enc, setEnc] = useState({ type: 'consulta_externa', reason: '', cie10: '', diagnosis: '' });
  const [openEnc, setOpenEnc] = useState<string | null>(null);
  const [fhir, setFhir] = useState<any>(null);

  // Contratos
  const [contracts, setContracts] = useState<any[]>([]);
  const [cForm, setCForm] = useState<any>({ id: null, insurerName: '', epsCode: '', contractNumber: '', modality: 'evento', startDate: '', endDate: '', ceilingValue: '', status: 'active', notes: '' });

  async function loadPatients() { setPatients(await api.gestionPatients(q || undefined).catch(() => [])); }
  async function loadContracts() { setContracts(await api.gestionContracts().catch(() => [])); }
  useEffect(() => { loadPatients(); loadContracts(); /* eslint-disable-next-line */ }, []);

  async function openPatient(p: any) {
    setFhir(null);
    const d = await api.gestionPatient(p.userId).catch(() => null);
    setSel(d);
    setRecord(d?.record ?? {});
    setOpenEnc(null);
    setEncs(await api.gestionEncounters(p.userId).catch(() => []));
  }
  async function saveRecord() {
    if (!sel) return;
    await api.gestionUpsertRecord(sel.user.id, record).catch(() => undefined);
    flash('Ficha del paciente guardada ✓'); openPatient({ userId: sel.user.id });
  }
  async function addEncounter() {
    if (!sel || !enc.type) return;
    await api.gestionCreateEncounter(sel.user.id, enc).catch(() => undefined);
    setEnc({ type: 'consulta_externa', reason: '', cie10: '', diagnosis: '' }); flash('Encuentro registrado ✓');
    setEncs(await api.gestionEncounters(sel.user.id).catch(() => []));
  }
  async function viewFhir() {
    if (!sel) return;
    const b = await api.gestionFhir(sel.user.id).catch(() => null);
    setFhir(b);
  }
  async function dlFhir() { if (!sel) return; const b = await api.gestionFhir(sel.user.id); download(`fhir-${sel.user.id}.json`, JSON.stringify(b, null, 2), 'application/json'); }
  async function dlHl7() { if (!sel) return; const t = await api.gestionHl7(sel.user.id); download(`hl7-${sel.user.id}.hl7`, t, 'text/plain'); }

  async function saveContract() {
    if (!cForm.insurerName.trim()) return flash('Nombre de la aseguradora requerido.');
    const body = { ...cForm, ceilingValue: cForm.ceilingValue ? Number(cForm.ceilingValue) : undefined };
    await api.gestionSaveContract(cForm.id, body).catch(() => undefined);
    setCForm({ id: null, insurerName: '', epsCode: '', contractNumber: '', modality: 'evento', startDate: '', endDate: '', ceilingValue: '', status: 'active', notes: '' });
    flash('Contrato guardado ✓'); loadContracts();
  }

  return (
    <>
      <div className="page-head"><h2>Gestión Salud</h2><p>Software para IPS, clínicas y hospitales: registro de pacientes, historia clínica, contratos con EPS e interoperabilidad FHIR/HL7.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'pacientes' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('pacientes')}>Pacientes y HCE</button>
        <button className={`btn btn-sm ${tab === 'contratos' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('contratos')}>Contratos EPS</button>
      </div>

      {tab === 'pacientes' && (
        <div className="grid grid-2">
          <div className="card">
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input className="field" style={{ marginTop: 0 }} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadPatients()} placeholder="Buscar por nombre o documento…" />
              <button className="btn btn-ghost btn-sm" onClick={loadPatients}>Buscar</button>
            </div>
            <div style={{ display: 'grid', gap: 6, maxHeight: 460, overflowY: 'auto' }}>
              {patients.map((p) => (
                <div key={p.userId} onClick={() => openPatient(p)} className="chat-thread" style={{ background: sel?.user?.id === p.userId ? 'var(--durazno)' : undefined }}>
                  <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--niebla)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--tinta)' }}>{p.name.slice(0, 1)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{p.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{p.document || 's/doc'} · {p.mrn ? 'HC ' + p.mrn : 'sin HC'} · {p.regimen || '—'}</div>
                  </div>
                </div>
              ))}
              {patients.length === 0 && <p className="muted">Sin pacientes.</p>}
            </div>
          </div>

          <div className="card">
            {!sel ? <p className="muted">Selecciona un paciente para ver su ficha, HCE e interoperabilidad.</p> : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>{sel.user.profile ? `${sel.user.profile.firstName} ${sel.user.profile.lastName}` : sel.user.email}</h3>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={viewFhir}>Ver FHIR</button>
                    <button className="btn btn-ghost btn-sm" onClick={dlFhir}>⬇ FHIR</button>
                    <button className="btn btn-ghost btn-sm" onClick={dlHl7}>⬇ HL7</button>
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  EPS: {sel.epsName || '—'} · Encuentros: {sel.counts.encounters} · Medicación: {sel.counts.meds} · Riesgos: {sel.counts.risks} · Docs: {sel.counts.docs}
                </div>

                <div className="grid grid-2">
                  <input className="field" value={record.mrn ?? ''} onChange={(e) => setRecord({ ...record, mrn: e.target.value })} placeholder="N° Historia clínica" />
                  <select className="field" value={record.regimen ?? ''} onChange={(e) => setRecord({ ...record, regimen: e.target.value })}><option value="">Régimen…</option><option value="contributivo">Contributivo</option><option value="subsidiado">Subsidiado</option></select>
                  <input className="field" value={record.eapb ?? ''} onChange={(e) => setRecord({ ...record, eapb: e.target.value })} placeholder="EAPB / EPS" />
                  <input className="field" value={record.bloodType ?? ''} onChange={(e) => setRecord({ ...record, bloodType: e.target.value })} placeholder="Grupo sanguíneo (ej: O+)" />
                </div>
                <input className="field" value={record.allergies ?? ''} onChange={(e) => setRecord({ ...record, allergies: e.target.value })} placeholder="Alergias" />
                <input className="field" value={record.chronicConditions ?? ''} onChange={(e) => setRecord({ ...record, chronicConditions: e.target.value })} placeholder="Condiciones crónicas (CIE-10 o texto)" />
                <input className="field" value={record.personalHistory ?? ''} onChange={(e) => setRecord({ ...record, personalHistory: e.target.value })} placeholder="Antecedentes personales" />
                <input className="field" value={record.familyHistory ?? ''} onChange={(e) => setRecord({ ...record, familyHistory: e.target.value })} placeholder="Antecedentes familiares" />
                <input className="field" value={record.surgicalHistory ?? ''} onChange={(e) => setRecord({ ...record, surgicalHistory: e.target.value })} placeholder="Antecedentes quirúrgicos" />
                <textarea className="field" style={{ minHeight: 60 }} value={record.emergencyNotes ?? ''} onChange={(e) => setRecord({ ...record, emergencyNotes: e.target.value })} placeholder="Notas para urgencias" />
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={saveRecord}>Guardar ficha</button>

                <h4 style={{ margin: '18px 0 8px', color: 'var(--tinta)', fontFamily: 'Fraunces' }}>Encuentros (admisiones / atención)</h4>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <select className="field" style={{ marginTop: 0, width: 'auto' }} value={enc.type} onChange={(e) => setEnc({ ...enc, type: e.target.value })}>{ENC_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select>
                  <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 120 }} value={enc.reason} onChange={(e) => setEnc({ ...enc, reason: e.target.value })} placeholder="Motivo" />
                  <input className="field" style={{ marginTop: 0, width: 100 }} value={enc.cie10} onChange={(e) => setEnc({ ...enc, cie10: e.target.value })} placeholder="CIE-10" />
                  <button className="btn btn-primary btn-sm" onClick={addEncounter}>＋</button>
                </div>
                <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                  {encs.map((e) => (
                    <div key={e.id} onClick={() => setOpenEnc(openEnc === e.id ? null : e.id)} style={{ fontSize: 13, borderBottom: '1px solid var(--line)', padding: '6px 4px', cursor: 'pointer', borderRadius: 8, background: openEnc === e.id ? 'var(--durazno)' : undefined }}>
                      {openEnc === e.id ? '▾ ' : '▸ '}{e.type.replace('_', ' ')} · {e.cie10 || ''} {e.reason || ''} <span className="muted">{new Date(e.startedAt).toLocaleDateString('es-CO')} · {e.status}</span>
                    </div>
                  ))}
                  {encs.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Sin encuentros. Crea uno arriba para abrir su HCE.</p>}
                </div>
                {openEnc && <EncounterHCE encounterId={openEnc} onChanged={async () => setEncs(await api.gestionEncounters(sel.user.id).catch(() => []))} />}

                {fhir && (
                  <div style={{ marginTop: 14 }}>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Bundle FHIR R4 ({fhir.total} recursos):</div>
                    <pre style={{ background: 'var(--bg)', borderRadius: 10, padding: 12, fontSize: 11, maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(fhir, null, 2).slice(0, 4000)}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'contratos' && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>{cForm.id ? 'Editar contrato' : 'Nuevo contrato'}</h3>
            <input className="field" value={cForm.insurerName} onChange={(e) => setCForm({ ...cForm, insurerName: e.target.value })} placeholder="EPS / Aseguradora" />
            <div className="grid grid-2">
              <input className="field" value={cForm.contractNumber} onChange={(e) => setCForm({ ...cForm, contractNumber: e.target.value })} placeholder="N° de contrato" />
              <select className="field" value={cForm.modality} onChange={(e) => setCForm({ ...cForm, modality: e.target.value })}><option value="evento">Evento</option><option value="capitacion">Capitación</option><option value="pgp">PGP</option><option value="subsidiado">Subsidiado</option></select>
              <input className="field" type="date" value={cForm.startDate} onChange={(e) => setCForm({ ...cForm, startDate: e.target.value })} />
              <input className="field" type="date" value={cForm.endDate} onChange={(e) => setCForm({ ...cForm, endDate: e.target.value })} />
              <input className="field" type="number" value={cForm.ceilingValue} onChange={(e) => setCForm({ ...cForm, ceilingValue: e.target.value })} placeholder="Techo / valor" />
              <select className="field" value={cForm.status} onChange={(e) => setCForm({ ...cForm, status: e.target.value })}><option value="active">Activo</option><option value="suspended">Suspendido</option><option value="ended">Terminado</option></select>
            </div>
            <textarea className="field" style={{ minHeight: 50 }} value={cForm.notes} onChange={(e) => setCForm({ ...cForm, notes: e.target.value })} placeholder="Notas" />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={saveContract}>Guardar</button>
              {cForm.id && <button className="btn btn-ghost" onClick={() => setCForm({ id: null, insurerName: '', epsCode: '', contractNumber: '', modality: 'evento', startDate: '', endDate: '', ceilingValue: '', status: 'active', notes: '' })}>Cancelar</button>}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Contratos ({contracts.length})</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {contracts.map((c) => (
                <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg)', borderRadius: 12, padding: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{c.insurerName} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>· {c.modality}</span></div>
                    <div className="muted" style={{ fontSize: 12 }}>{c.contractNumber || 's/n'} · {c.status}{c.ceilingValue ? ` · $${c.ceilingValue.toLocaleString('es-CO')}` : ''}</div>
                  </div>
                  <button className="link" onClick={() => setCForm({ id: c.id, insurerName: c.insurerName, epsCode: c.epsCode ?? '', contractNumber: c.contractNumber ?? '', modality: c.modality ?? 'evento', startDate: c.startDate?.slice(0, 10) ?? '', endDate: c.endDate?.slice(0, 10) ?? '', ceilingValue: c.ceilingValue ?? '', status: c.status, notes: c.notes ?? '' })}>Editar</button>
                  <button className="link" onClick={async () => { if (confirm('¿Eliminar?')) { await api.gestionDeleteContract(c.id); loadContracts(); } }} style={{ color: 'var(--sos)' }}>✕</button>
                </div>
              ))}
              {contracts.length === 0 && <p className="muted">Sin contratos.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
