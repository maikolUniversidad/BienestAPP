/**
 * Construcción de recursos FHIR R4 y mensajes HL7 v2 para interoperabilidad clínica.
 * Permite "transitar" los datos del paciente (demografía, observaciones, condiciones,
 * encuentros, medicación, documentos) hacia otros sistemas de salud.
 */

const LOINC: Record<string, { code: string; display: string; unit?: string }> = {
  heart_rate: { code: '8867-4', display: 'Heart rate', unit: '/min' },
  weight: { code: '29463-7', display: 'Body weight', unit: 'kg' },
  spo2: { code: '59408-5', display: 'Oxygen saturation', unit: '%' },
  steps: { code: '41950-7', display: 'Number of steps', unit: 'steps' },
  bmi: { code: '39156-5', display: 'Body mass index', unit: 'kg/m2' },
  waist: { code: '8280-0', display: 'Waist circumference', unit: 'cm' },
  body_fat: { code: '41982-0', display: 'Percentage body fat', unit: '%' },
};

const ENCOUNTER_CLASS: Record<string, { code: string; display: string }> = {
  consulta_externa: { code: 'AMB', display: 'ambulatory' },
  urgencias: { code: 'EMER', display: 'emergency' },
  hospitalizacion: { code: 'IMP', display: 'inpatient encounter' },
  uci: { code: 'IMP', display: 'inpatient encounter' },
  domiciliaria: { code: 'HH', display: 'home health' },
  pyp: { code: 'AMB', display: 'ambulatory' },
};

function iso(d: any): string | undefined { return d ? new Date(d).toISOString() : undefined; }

export function patientResource(p: { userId: string; documentType?: string; documentNumber?: string; firstName?: string; lastName?: string; birthDate?: any; phone?: string; email?: string; mrn?: string; regimen?: string; eapb?: string }) {
  return {
    resourceType: 'Patient',
    id: p.userId,
    identifier: [
      ...(p.documentNumber ? [{ system: `urn:oid:2.16.170.1.100${p.documentType ? '' : ''}`, value: p.documentNumber, type: { text: p.documentType || 'Documento' } }] : []),
      ...(p.mrn ? [{ system: 'urn:bienestapp:mrn', value: p.mrn, type: { text: 'Historia clínica' } }] : []),
    ],
    name: [{ use: 'official', family: p.lastName || '', given: [p.firstName || ''] }],
    telecom: [
      ...(p.phone ? [{ system: 'phone', value: p.phone, use: 'mobile' }] : []),
      ...(p.email ? [{ system: 'email', value: p.email }] : []),
    ],
    birthDate: p.birthDate ? new Date(p.birthDate).toISOString().slice(0, 10) : undefined,
    extension: [
      ...(p.regimen ? [{ url: 'urn:bienestapp:regimen', valueString: p.regimen }] : []),
      ...(p.eapb ? [{ url: 'urn:bienestapp:eapb', valueString: p.eapb }] : []),
    ],
  };
}

export function observationFromMetric(patientId: string, m: { id: string; type: string; value: number; unit: string; recordedAt: any }) {
  const l = LOINC[m.type];
  return {
    resourceType: 'Observation', id: `metric-${m.id}`, status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
    code: l ? { coding: [{ system: 'http://loinc.org', code: l.code, display: l.display }], text: l.display } : { text: m.type },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: iso(m.recordedAt),
    valueQuantity: { value: m.value, unit: m.unit || l?.unit },
  };
}

export function observationFromMood(patientId: string, mo: { id: string; label: string; intensity: number; createdAt: any }) {
  return {
    resourceType: 'Observation', id: `mood-${mo.id}`, status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey' }] }],
    code: { text: 'Estado de ánimo' },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: iso(mo.createdAt),
    valueString: `${mo.label} (intensidad ${mo.intensity}/5)`,
  };
}

export function conditionResource(patientId: string, c: { id: string; text: string; clinicalStatus?: string; date?: any; cie10?: string }) {
  return {
    resourceType: 'Condition', id: c.id,
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: c.clinicalStatus || 'active' }] },
    code: c.cie10 ? { coding: [{ system: 'urn:oid:2.16.170.1.103', code: c.cie10 }], text: c.text } : { text: c.text },
    subject: { reference: `Patient/${patientId}` },
    recordedDate: iso(c.date),
  };
}

export function encounterResource(patientId: string, e: { id: string; type: string; status?: string; reason?: string; cie10?: string; startedAt?: any; endedAt?: any }) {
  const cls = ENCOUNTER_CLASS[e.type] || ENCOUNTER_CLASS.consulta_externa;
  return {
    resourceType: 'Encounter', id: e.id,
    status: e.status === 'closed' ? 'finished' : e.status === 'in_progress' ? 'in-progress' : 'planned',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: cls.code, display: cls.display },
    type: [{ text: e.type }],
    subject: { reference: `Patient/${patientId}` },
    reasonCode: e.reason ? [{ text: e.reason }] : undefined,
    diagnosis: e.cie10 ? [{ condition: { display: e.cie10 } }] : undefined,
    period: { start: iso(e.startedAt), end: iso(e.endedAt) },
  };
}

export function medicationStatementResource(patientId: string, m: { id: string; name: string; dose?: string; schedule?: string[]; active?: boolean }) {
  return {
    resourceType: 'MedicationStatement', id: `med-${m.id}`,
    status: m.active === false ? 'stopped' : 'active',
    medicationCodeableConcept: { text: m.name },
    subject: { reference: `Patient/${patientId}` },
    dosage: m.dose ? [{ text: `${m.dose}${m.schedule?.length ? ' · ' + m.schedule.join(', ') : ''}` }] : undefined,
  };
}

export function documentReferenceResource(patientId: string, d: { id: string; title: string; status?: string; hash?: string; signedAt?: any }) {
  return {
    resourceType: 'DocumentReference', id: `doc-${d.id}`,
    status: 'current',
    docStatus: d.status === 'signed' ? 'final' : 'preliminary',
    type: { text: d.title },
    subject: { reference: `Patient/${patientId}` },
    date: iso(d.signedAt),
    content: [{ attachment: { title: d.title, hash: d.hash } }],
  };
}

export function serviceRequestResource(patientId: string, o: { id: string; type: string; description: string; code?: string; status?: string; date?: any }) {
  // medication → MedicationRequest; el resto → ServiceRequest.
  if (o.type === 'medication') {
    return {
      resourceType: 'MedicationRequest', id: `order-${o.id}`,
      status: o.status === 'done' ? 'completed' : o.status === 'cancelled' ? 'cancelled' : 'active',
      intent: 'order', medicationCodeableConcept: o.code ? { coding: [{ system: 'urn:oid:2.16.170.1.105', code: o.code }], text: o.description } : { text: o.description },
      subject: { reference: `Patient/${patientId}` }, authoredOn: iso(o.date),
    };
  }
  const CAT: Record<string, string> = { lab: 'Laboratory procedure', imaging: 'Imaging', procedure: 'Procedure', referral: 'Referral' };
  return {
    resourceType: 'ServiceRequest', id: `order-${o.id}`,
    status: o.status === 'done' ? 'completed' : o.status === 'cancelled' ? 'revoked' : o.status === 'in_progress' ? 'active' : 'draft',
    intent: 'order',
    category: [{ text: CAT[o.type] || o.type }],
    code: o.code ? { coding: [{ system: 'urn:oid:2.16.170.1.103', code: o.code }], text: o.description } : { text: o.description },
    subject: { reference: `Patient/${patientId}` }, authoredOn: iso(o.date),
  };
}

export function clinicalImpressionResource(patientId: string, e: { id: string; encounterId: string; assessment?: string; plan?: string; date?: any }) {
  return {
    resourceType: 'ClinicalImpression', id: `evo-${e.id}`, status: 'completed',
    subject: { reference: `Patient/${patientId}` }, encounter: { reference: `Encounter/enc-${e.encounterId}` },
    date: iso(e.date), summary: [e.assessment, e.plan].filter(Boolean).join(' · ') || undefined,
  };
}

export function bundle(entries: any[]) {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: undefined as any, // se estampa al serializar en el servicio
    total: entries.length,
    entry: entries.filter(Boolean).map((r) => ({ resource: r, fullUrl: `urn:uuid:${r.resourceType}-${r.id}` })),
  };
}

/** Mensaje HL7 v2 ADT^A04 (registro de paciente) — segmentos MSH, EVN, PID, PV1. */
export function hl7Adt(p: { documentNumber?: string; firstName?: string; lastName?: string; birthDate?: any; phone?: string; mrn?: string; nowStamp: string }): string {
  const ts = p.nowStamp;
  const dob = p.birthDate ? new Date(p.birthDate).toISOString().slice(0, 10).replace(/-/g, '') : '';
  const seg = [
    `MSH|^~\\&|BIENESTAPP|IPS|RECEPTOR|EPS|${ts}||ADT^A04|${ts}|P|2.5`,
    `EVN|A04|${ts}`,
    `PID|1||${p.mrn || p.documentNumber || ''}^^^BIENESTAPP^MR||${p.lastName || ''}^${p.firstName || ''}||${dob}|||||||${p.phone || ''}`,
    `PV1|1|O`,
  ];
  return seg.join('\r');
}
