/** Seed de 10 visitas domiciliarias de prueba asignadas a médicos out-door.
 *  Ejecutar: npx ts-node prisma/seed-visits.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const CASES = [
  { reason: 'Control de hipertensión', address: 'Cra 7 # 116-20, Usaquén', lat: 4.6960, lng: -74.0310 },
  { reason: 'Curación de herida', address: 'Cl 134 # 9-50, Usaquén', lat: 4.7040, lng: -74.0300 },
  { reason: 'Toma de muestras', address: 'Cra 15 # 127-30', lat: 4.7120, lng: -74.0340 },
  { reason: 'Seguimiento posquirúrgico', address: 'Cl 140 # 11-10', lat: 4.7180, lng: -74.0280 },
  { reason: 'Aplicación de medicamento', address: 'Cra 19 # 120-45', lat: 4.7000, lng: -74.0450 },
  { reason: 'Valoración de adulto mayor', address: 'Cl 109 # 18-30', lat: 4.6900, lng: -74.0400 },
  { reason: 'Control de diabetes', address: 'Cra 11 # 119-15', lat: 4.7080, lng: -74.0500 },
  { reason: 'Fiebre y malestar', address: 'Cl 127 # 7-80', lat: 4.7200, lng: -74.0380 },
  { reason: 'Terapia respiratoria', address: 'Cra 9 # 131-22', lat: 4.7260, lng: -74.0300 },
  { reason: 'Control prenatal', address: 'Cl 116 # 15-40', lat: 4.6850, lng: -74.0480 },
];

async function main() {
  const doctor = await prisma.user.findUnique({ where: { email: 'outdoor1@demo.co' }, select: { id: true } });
  const patient = await prisma.user.findUnique({ where: { email: 'afiliado@demo.co' }, select: { id: true } });
  if (!doctor || !patient) throw new Error('Faltan usuarios de prueba (outdoor1 / afiliado). Corre seed-field y seed-test-users primero.');

  // limpia visitas demo previas de este médico para no duplicar
  await prisma.homeVisit.deleteMany({ where: { professionalId: doctor.id, status: 'scheduled' } });

  const now = Date.now();
  for (let i = 0; i < CASES.length; i++) {
    await prisma.homeVisit.create({
      data: {
        userId: patient.id, professionalId: doctor.id, status: 'scheduled',
        scheduledAt: new Date(now + i * 45 * 60 * 1000), // cada 45 min
        address: CASES[i].address, lat: CASES[i].lat, lng: CASES[i].lng, reason: CASES[i].reason, createdBy: doctor.id,
      },
    });
  }
  console.log(`Visitas de prueba creadas para outdoor1@demo.co: ${CASES.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
