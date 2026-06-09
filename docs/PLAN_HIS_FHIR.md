# Plan por fases — HIS (Gestión Salud) + Interoperabilidad FHIR/HL7

Software para la gestión de IPS, clínicas y hospitales sobre BienestAPP. Este documento es
el roadmap completo y detallado. Marca lo ya entregado y lo pendiente por fase.

Leyenda: ✅ hecho · 🟡 parcial/base · ⬜ pendiente.

---

## Fase 0 — Fundación e interoperabilidad (ENTREGADA en este incremento)

- ✅ **Registro de pacientes** (`PatientRecord`: MRN, régimen, EAPB, grupo sanguíneo, alergias, crónicos, notas de urgencias) + buscador en `Gestión Salud`.
- ✅ **Administración de contratos con EPS/aseguradoras** (`EpsContract`: modalidad capitación/evento/PGP/subsidiado, vigencias, techo, estado) con CRUD.
- ✅ **Encuentros / admisiones** (`Encounter`: consulta externa, urgencias, hospitalización, UCI, domiciliaria, PYP, laboratorio, imagenología, cirugía) con registro y CIE-10.
- ✅ **Interoperabilidad FHIR R4**: bundle `$everything` por paciente (Patient, Observation [signos/ánimo], Condition [riesgo/crónicos], Encounter, MedicationStatement, DocumentReference) — visualizable y descargable.
- ✅ **HL7 v2 ADT^A04** por paciente (MSH/EVN/PID/PV1) descargable.
- ✅ **Cierre de chat**: presencia "en línea" (heartbeat) en el chat entre roles.

> Base existente reutilizada: usuarios/roles (RBAC), perfiles, EPS, métricas de salud,
> ánimo, medicación, citas/telemedicina, firma documental, notificaciones, auditoría.

---

## Fase 1 — Asistencial: Historia Clínica Electrónica (HCE)

- 🟡 **HCE** núcleo (ya hay notas clínicas, riesgos, medicación, encuentros). Pendiente:
  - ⬜ Evoluciones por encuentro (SOAP), antecedentes, signos vitales estructurados.
  - ⬜ Órdenes médicas (medicamentos, laboratorio, imágenes, procedimientos).
  - ⬜ Diagnósticos CIE-10 con catálogo y diagnóstico principal/relacionados.
  - ⬜ Adjuntos clínicos por encuentro (reusa Storage + firma).
- ⬜ **Consulta externa por especialidad** (plantillas por especialidad).
- ⬜ **Consulta de urgencias** (triage Resolución 5596/2015, escalas).
- ⬜ **Atención domiciliaria** (hospitalización en casa) — agenda + seguimiento.
- ⬜ **Cuidado crítico UCI** (registros de monitoreo, balance, escalas).
- ⬜ **Ayudas diagnósticas**: laboratorio e imagenología (órdenes → resultados → FHIR DiagnosticReport/Observation).
- 🟡 **Promoción y Prevención (PYP) – RIAS Res. 3280/2018** (ya hay base de PYP en la app; falta estructurar rutas por curso de vida y tamizajes).
- 🟡 **Administración de medicamentos** (existe plan/medicación; falta MAR hospitalario: administración por horario y registro).
- ⬜ **Procedimientos quirúrgicos** (programación, lista de chequeo OMS, notas quirúrgicas).

## Fase 2 — Base operativa y administrativa

- 🟡 **Agenda médica y control de citas** (ya hay citas/telemedicina; falta agenda por profesional/consultorio, cupos, recordatorios masivos).
- ⬜ **ChatBot de citas** (agendar/cancelar por el asistente IA + base de conocimiento).
- ⬜ **Hospitalización** (camas, censo diario, traslados, alta).
- ✅ **Admisiones de pacientes** (base con `Encounter`; falta flujo de ingreso/egreso y autorizaciones).
- ✅ **Administración de contratos con EPS/aseguradoras** (Fase 0).
- 🟡 **Facturación electrónica de servicios de salud** (cuenta por encuentro con líneas valorizadas y estados; pendiente: emisión DIAN + CUFE + anexo técnico salud, tarifarios ISS/SOAT).
- 🟡 **Generación RIPS JSON – Resolución 2275/2023** (estructura numFactura+usuarios+servicios{consultas/procedimientos/medicamentos} generada y descargable; pendiente: validación de catálogos CUPS/CUM/CIE-10 y malla del MinSalud).
- ✅ **Administración de cuentas** (armado de cuenta por encuentro: consulta + órdenes → líneas, total, estados borrador/emitida/radicada/pagada).
- ✅ **Gestión de glosas** (registro por factura, valor, ciclo abierta/respondida/aceptada/conciliada). Pendiente: catálogo oficial de códigos.
- ⬜ **Gestión de inventarios** (medicamentos e insumos, lotes, vencimientos, kardex).
- 🟡 **Cartera (CxC)** (resumen pendiente por estado/aseguradora y glosas abiertas; pendiente: edades de cartera, pagos parciales, conciliación).

## Fase 3 — Reportes asistenciales y regulatorios (Colombia)

- ⬜ **Resolución 202/2021** (reporte de PYP / protección específica y detección temprana).
- ⬜ **Radicación de cuentas – Resolución 2284/2023** (proceso y soportes electrónicos).
- ⬜ **Información al SISMED** (precios y reporte de medicamentos).
- ⬜ **Resolución 256/2016** (SIC – indicadores de calidad).
- ⬜ **Resolución 1552/2016** (agendamiento/asignación de citas — tiempos de oportunidad).
- ⬜ **Circular Externa 016** (Supersalud — flujo de recursos / reportes).
- ⬜ **Circular 030/2013** (Supersalud — reportes financieros y de calidad).
- ⬜ **Informes de producción por especialista**.
- ⬜ **Informes de reingresos** (readmisiones < 72h / 15-30 días).

## Fase 4 — Interoperabilidad avanzada y certificación

- 🟡 **FHIR R4** (bundle por paciente entregado). Pendiente:
  - ⬜ Servidor FHIR RESTful (`GET /fhir/{Resource}/{id}`, búsqueda con parámetros, `$everything` oficial).
  - ⬜ Perfiles colombianos (IPS-CORE / guías MinSalud) y terminologías (CIE-10, CUPS, CUM).
  - ⬜ Suscripciones/eventos y exportación masiva (`$export`).
- 🟡 **HL7 v2** (ADT^A04 entregado). Pendiente ORM/ORU (órdenes y resultados) y canal MLLP.
- ⬜ **Seguridad/cumplimiento**: consentimiento (ya existe), pistas de auditoría por acceso a HCE, cifrado de campos sensibles, retención.

---

## Arquitectura técnica

- Backend NestJS + Prisma/PostgreSQL (Supabase). Cada módulo = un Nest module con RBAC.
- Interoperabilidad: capa `gestion/fhir.util.ts` (constructores FHIR/HL7) desacoplada del transporte.
- Frontend Next.js (panel por roles). Storage Supabase para soportes/adjuntos.
- Reportes regulatorios: generadores (JSON/XML/TXT) + validadores por resolución, con job de exportación.

## Orden recomendado de ejecución

1. HCE completa (Fase 1) — es el corazón clínico y alimenta todo lo demás.
2. RIPS 2275 + Facturación + Cuentas + Glosas + Cartera (Fase 2) — ciclo de ingresos.
3. Reportes regulatorios (Fase 3) — cumplimiento.
4. Servidor FHIR RESTful + HL7 ORM/ORU + certificación (Fase 4).

Cada fase se entrega como incremento desplegado y verificado (mismo flujo de este proyecto).
