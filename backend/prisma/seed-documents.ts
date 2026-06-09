/** Seed de gestión documental: una IPS demo + plantillas de documento.
 *  Ejecutar: npx ts-node prisma/seed-documents.ts */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ips = await prisma.ips.upsert({
    where: { id: 'ips_demo' },
    update: { name: 'IPS Bienestar Nueva EPS', nit: '900.000.000-1', epsCode: 'nueva_eps', address: 'Cra 85K No. 46A-66, Bogotá', phone: '(601) 419 3000', active: true },
    create: { id: 'ips_demo', name: 'IPS Bienestar Nueva EPS', nit: '900.000.000-1', epsCode: 'nueva_eps', address: 'Cra 85K No. 46A-66, Bogotá', phone: '(601) 419 3000', active: true },
  });

  const templates = [
    {
      id: 'tpl_attendance',
      name: 'Constancia de asistencia a videoconsulta',
      kind: 'attendance',
      description: 'Firma de asistencia a una cita virtual con verificación por foto.',
      requiresPhoto: true,
      htmlBody: '<h2>Constancia de asistencia</h2><p>Yo, <b>{{nombre}}</b> (documento {{documento}}), confirmo mi asistencia a la videoconsulta atendida por {{ips}} el {{fecha}}.</p><p>Declaro que la información es veraz y autorizo el registro de esta firma digital.</p>',
    },
    {
      id: 'tpl_consent',
      name: 'Consentimiento informado de teleconsulta',
      kind: 'consent',
      description: 'Consentimiento para atención por telemedicina.',
      requiresPhoto: false,
      htmlBody: '<h2>Consentimiento informado</h2><p>Yo, <b>{{nombre}}</b>, autorizo la atención por telemedicina con {{ips}}, comprendiendo sus alcances y limitaciones. Fecha: {{fecha}}.</p>',
    },
  ];
  for (const t of templates) {
    await prisma.documentTemplate.upsert({
      where: { id: t.id },
      update: { ...t, ipsId: ips.id, scope: 'global', active: true },
      create: { ...t, ipsId: ips.id, scope: 'global', active: true },
    });
  }
  console.log(`IPS y ${templates.length} plantillas de documento sembradas.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
