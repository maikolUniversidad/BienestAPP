import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // ── Roles ──
  const roleNames = Object.values(RoleName);
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: name },
    });
  }

  // ── Permisos base ──
  const permissions = [
    'callcenter.case.read',
    'callcenter.case.write',
    'admin.metrics.read',
    'admin.alerts.read',
    'audit.read',
  ];
  for (const key of permissions) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }

  // ── Cartas de logro ──
  const cards = [
    { code: 'STREAK_7', name: 'Constancia 7', description: '7 días de hábitos seguidos', rarity: 'common' },
    { code: 'STREAK_30', name: 'Constancia 30', description: '30 días de hábitos', rarity: 'rare' },
    { code: 'STREAK_100', name: 'Constancia 100', description: '100 días de hábitos', rarity: 'epic' },
    { code: 'FIRST_JOURNAL', name: 'Primera página', description: 'Primera entrada de diario', rarity: 'common' },
    { code: 'BREATHE_10', name: 'Respira', description: '10 ejercicios de respiración', rarity: 'common' },
  ];
  for (const c of cards) {
    await prisma.achievementCard.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // ── Biblioteca de actividades ──
  const activities = [
    { type: 'breathing', title: 'Respiración 4-7-8', description: 'Calma en 3 minutos', durationMin: 3, tags: ['ansiedad', 'calma'] },
    { type: 'meditation', title: 'Meditación guiada', description: 'Atención plena básica', durationMin: 10, tags: ['estrés'] },
    { type: 'active_break', title: 'Pausa activa', description: 'Estiramientos de escritorio', durationMin: 5, tags: ['cuerpo'] },
    { type: 'gratitude', title: 'Diario de gratitud', description: 'Tres cosas buenas de hoy', durationMin: 5, tags: ['ánimo'] },
    { type: 'education', title: '¿Qué es la ansiedad?', description: 'Psicoeducación básica', durationMin: 6, tags: ['educación'] },
  ];
  for (const a of activities) {
    const exists = await prisma.contentActivity.findFirst({ where: { title: a.title } });
    if (!exists) await prisma.contentActivity.create({ data: a });
  }

  // ── Test de bienestar orientativo ──
  const testExists = await prisma.wellnessTest.findUnique({ where: { code: 'WELLBEING_BASIC' } });
  if (!testExists) {
    await prisma.wellnessTest.create({
      data: {
        code: 'WELLBEING_BASIC',
        title: 'Chequeo rápido de bienestar',
        description: 'Orientativo, no diagnóstico.',
        category: 'wellbeing',
        questions: [
          { id: 'q1', text: '¿Cómo describirías tu ánimo esta semana?', options: [{ label: 'Bien', value: 0 }, { label: 'Regular', value: 1 }, { label: 'Bajo', value: 2 }] },
          { id: 'q2', text: '¿Has dormido bien?', options: [{ label: 'Sí', value: 0 }, { label: 'A veces', value: 1 }, { label: 'No', value: 2 }] },
        ],
        scoring: { bands: [{ max: 1, band: 'estable' }, { max: 3, band: 'atención' }, { max: 4, band: 'cuidado' }] },
      },
    });
  }

  // ── Organización demo + usuarios demo ──
  const org = await prisma.organization.upsert({
    where: { nit: '900000000-0' },
    update: {},
    create: { name: 'Nueva EPS (demo)', nit: '900000000-0' },
  });

  const affiliateRole = await prisma.role.findUnique({ where: { name: RoleName.AFFILIATE } });
  const operatorRole = await prisma.role.findUnique({ where: { name: RoleName.CALLCENTER_OPERATOR } });

  const pwd = await bcrypt.hash('Bienestar123', 12);

  const affiliate = await prisma.user.upsert({
    where: { email: 'afiliado@demo.co' },
    update: {},
    create: {
      email: 'afiliado@demo.co',
      passwordHash: pwd,
      organizationId: org.id,
      roles: { create: { roleId: affiliateRole!.id } },
      profile: { create: { firstName: 'Ana', lastName: 'Pérez' } },
      pet: { create: { name: 'Compi' } },
    },
  });

  await prisma.user.upsert({
    where: { email: 'operador@demo.co' },
    update: {},
    create: {
      email: 'operador@demo.co',
      passwordHash: pwd,
      organizationId: org.id,
      roles: { create: { roleId: operatorRole!.id } },
    },
  });

  // Hábitos demo
  const habitCount = await prisma.habit.count({ where: { userId: affiliate.id } });
  if (habitCount === 0) {
    await prisma.habit.createMany({
      data: [
        { userId: affiliate.id, name: 'Tomar agua', icon: '💧', target: 8 },
        { userId: affiliate.id, name: 'Caminar', icon: '🚶', target: 1 },
        { userId: affiliate.id, name: 'Respiración', icon: '🌬️', target: 1 },
      ],
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed completado. Usuarios demo: afiliado@demo.co / operador@demo.co (pass: Bienestar123)');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
