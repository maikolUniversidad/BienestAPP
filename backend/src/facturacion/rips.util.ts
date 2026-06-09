/**
 * Generador de RIPS en JSON según la Resolución 2275 de 2023 (estructura por factura).
 * Construye numFactura + usuarios[] con servicios{consultas, procedimientos, medicamentos, otrosServicios}.
 * Nota: para la radicación oficial deben validarse catálogos (CUPS/CUM/CIE-10) y campos obligatorios
 * con la malla del MinSalud; aquí se arma la estructura con los datos disponibles.
 */

const NIT_OBLIGADO = process.env.RIPS_NIT ?? '900000000';
const COD_PRESTADOR = process.env.RIPS_COD_PRESTADOR ?? '0000000000';

function docType(t?: string): string {
  const map: Record<string, string> = { 'CC': 'CC', 'TI': 'TI', 'CE': 'CE', 'PA': 'PA', 'RC': 'RC', 'PE': 'PE' };
  return map[(t || '').toUpperCase()] || 'CC';
}
function fecha(d: any): string { return d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : ''; }

export function buildRips2275(params: {
  invoice: { number: string; issueDate?: any };
  patient: { documentType?: string; documentNumber?: string; birthDate?: any; sex?: string };
  diagnosisPrincipal?: string;
  lines: { kind: string; code?: string; description: string; quantity: number; unitValue: number; total: number; cie10?: string }[];
}) {
  const { invoice, patient, lines } = params;
  let consec = 0;
  const consultas: any[] = [];
  const procedimientos: any[] = [];
  const medicamentos: any[] = [];
  const otrosServicios: any[] = [];

  for (const l of lines) {
    consec++;
    const base = {
      codPrestador: COD_PRESTADOR,
      fechaInicioAtencion: fecha(invoice.issueDate),
      numAutorizacion: null,
      consecutivo: consec,
      vrServicio: Math.round(l.total),
      valorPagoModerador: 0,
      conceptoRecaudo: '05',
      tipoDocumentoIdentificacion: docType(patient.documentType),
      numDocumentoIdentificacion: patient.documentNumber || '',
    };
    if (l.kind === 'consulta') {
      consultas.push({ ...base, codConsulta: l.code || '890201', modalidadGrupoServicioTecSal: '01', grupoServicios: '01', codServicio: 1, finalidadTecnologiaSalud: '10', causaMotivoAtencion: '38', codDiagnosticoPrincipal: l.cie10 || params.diagnosisPrincipal || '', codDiagnosticoRelacionado1: null, tipoDiagnosticoPrincipal: '01', tipoDocumentoIdentificacion: docType(patient.documentType) });
    } else if (l.kind === 'medicamento') {
      medicamentos.push({ ...base, codTecnologiaSalud: l.code || '', nomTecnologiaSalud: l.description, tipoMedicamento: '01', cantidadMedicamento: l.quantity, vrUnitMedicamento: Math.round(l.unitValue) });
    } else if (l.kind === 'procedimiento') {
      procedimientos.push({ ...base, codProcedimiento: l.code || '', viaIngresoServicioSalud: '01', modalidadGrupoServicioTecSal: '01', grupoServicios: '02', codServicio: 2, finalidadTecnologiaSalud: '44', codDiagnosticoPrincipal: l.cie10 || params.diagnosisPrincipal || '' });
    } else {
      otrosServicios.push({ ...base, codTecnologiaSalud: l.code || '', nomTecnologiaSalud: l.description, cantidadOS: l.quantity, vrUnitOS: Math.round(l.unitValue) });
    }
  }

  return {
    numDocumentoIdObligado: NIT_OBLIGADO,
    numFactura: invoice.number,
    tipoNota: null,
    numNota: null,
    usuarios: [
      {
        tipoDocumentoIdentificacion: docType(patient.documentType),
        numDocumentoIdentificacion: patient.documentNumber || '',
        tipoUsuario: '01',
        fechaNacimiento: patient.birthDate ? new Date(patient.birthDate).toISOString().slice(0, 10) : '',
        codSexo: (patient.sex || 'M').toUpperCase().slice(0, 1) === 'F' ? 'F' : 'M',
        codPaisResidencia: '170',
        codMunicipioResidencia: '',
        incapacidad: 'NO',
        consecutivo: 1,
        servicios: {
          ...(consultas.length ? { consultas } : {}),
          ...(procedimientos.length ? { procedimientos } : {}),
          ...(medicamentos.length ? { medicamentos } : {}),
          ...(otrosServicios.length ? { otrosServicios } : {}),
        },
      },
    ],
  };
}
