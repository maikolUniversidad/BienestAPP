import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Crea un usuario de prueba por cada rol del sistema (idempotente).
 * Contraseña única para todos: Bienestar123
 * Ejecutar: npm run seed:users
 */
const TEST_USERS: { email: string; role: RoleName; firstName: string; lastName: string }[] = [
  { email: 'afiliado@demo.co', role: RoleName.AFFILIATE, firstName: 'Ana', lastName: 'Pérez' },
  { email: 'operador@demo.co', role: RoleName.CALLCENTER_OPERATOR, firstName: 'Oscar', lastName: 'Ríos' },
  { email: 'psicologo@demo.co', role: RoleName.PSYCHOLOGIST, firstName: 'Paula', lastName: 'Soto' },
  { email: 'medico@demo.co', role: RoleName.PHYSICIAN, firstName: 'Mario', lastName: 'Díaz' },
  { email: 'nutricionista@demo.co', role: RoleName.NUTRITIONIST, firstName: 'Nadia', lastName: 'Nieto' },
  { email: 'enfermeria@demo.co', role: RoleName.NURSE, firstName: 'Nelson', lastName: 'Ruiz' },
  { email: 'social@demo.co', role: RoleName.SOCIAL_WORKER, firstName: 'Sofía', lastName: 'Vega' },
  { email: 'admin@demo.co', role: RoleName.EPS_ADMIN, firstName: 'Elena', lastName: 'Admin' },
  { email: 'superadmin@demo.co', role: RoleName.SUPERADMIN, firstName: 'Sara', lastName: 'Super' },
  { email: 'auditor@demo.co', role: RoleName.AUDITOR, firstName: 'Aldo', lastName: 'Auditor' },
];

async function main() {
  const password = await bcrypt.hash('Bienestar123', 12);

  for (const u of TEST_USERS) {
    const role = await prisma.role.upsert({
      where: { name: u.role },
      update: {},
      create: { name: u.role, description: u.role },
    });

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: password,
        profile: { create: { firstName: u.firstName, lastName: u.lastName } },
        // Mascota solo tiene sentido para afiliados, pero no estorba en otros roles de prueba.
        ...(u.role === RoleName.AFFILIATE ? { pet: { create: { name: 'Compi' } } } : {}),
      },
    });

    // Asegura el vínculo de rol (idempotente).
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    console.log(`  ✓ ${u.email.padEnd(22)} [${u.role}]`);
  }

  console.log('\nTodos los usuarios de prueba usan la contraseña: Bienestar123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
