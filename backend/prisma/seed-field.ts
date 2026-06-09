/** Seed de 10 médicos out-door (atención domiciliaria) distribuidos por Bogotá.
 *  Ejecutar: npx ts-node prisma/seed-field.ts */
import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const ZONES = [
  { zone: 'Usaquén', lat: 4.7030, lng: -74.0300, first: 'Carlos', last: 'Rincón' },
  { zone: 'Chapinero', lat: 4.6450, lng: -74.0630, first: 'Laura', last: 'Mejía' },
  { zone: 'Suba', lat: 4.7450, lng: -74.0830, first: 'Andrés', last: 'Vargas' },
  { zone: 'Engativá', lat: 4.7100, lng: -74.1150, first: 'Diana', last: 'Castro' },
  { zone: 'Kennedy', lat: 4.6280, lng: -74.1550, first: 'Jorge', last: 'Patiño' },
  { zone: 'Bosa', lat: 4.6180, lng: -74.1900, first: 'Marcela', last: 'Ruiz' },
  { zone: 'Fontibón', lat: 4.6740, lng: -74.1460, first: 'Felipe', last: 'Acosta' },
  { zone: 'Centro', lat: 4.5980, lng: -74.0760, first: 'Paola', last: 'Gómez' },
  { zone: 'Teusaquillo', lat: 4.6310, lng: -74.0840, first: 'Iván', last: 'Sánchez' },
  { zone: 'Ciudad Bolívar', lat: 4.5680, lng: -74.1610, first: 'Sara', last: 'Quintero' },
];

async function main() {
  const role = await prisma.role.upsert({ where: { name: RoleName.FIELD_DOCTOR }, update: {}, create: { name: RoleName.FIELD_DOCTOR, description: 'Médico de atención domiciliaria (out-door)' } });
  const password = await bcrypt.hash('Bienestar123', 12);
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i];
    const email = `outdoor${i + 1}@demo.co`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email, passwordHash: password, status: 'ACTIVE',
        roles: { create: { roleId: role.id } },
        profile: { create: { firstName: z.first, lastName: z.last, phone: `30${i}0000000` } },
      },
    });
    await prisma.fieldAgent.upsert({
      where: { userId: user.id },
      update: { zone: z.zone, lat: z.lat, lng: z.lng, specialty: 'Medicina general', shiftStart: '07:00', shiftEnd: '19:00', status: i % 3 === 0 ? 'available' : i % 3 === 1 ? 'en_route' : 'attending' },
      create: { userId: user.id, zone: z.zone, lat: z.lat, lng: z.lng, specialty: 'Medicina general', shiftStart: '07:00', shiftEnd: '19:00', phone: `30${i}0000000`, status: i % 3 === 0 ? 'available' : i % 3 === 1 ? 'en_route' : 'attending' },
    });
  }
  console.log(`Médicos out-door sembrados: ${ZONES.length} (outdoor1..${ZONES.length}@demo.co / Bienestar123)`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
