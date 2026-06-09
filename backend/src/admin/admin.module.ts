import { Body, Controller, Get, Injectable, Module, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { IsArray, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const ASSIGNABLE_ROLES = Object.values(RoleName);

class CreateUserDto {
  @IsEmail() email: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsIn(ASSIGNABLE_ROLES) role: RoleName;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}
class BulkUserDto {
  @IsArray() users: { email: string; firstName: string; lastName: string; role: string }[];
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics() {
    const [users, activeHabits, moodEntries, journalEntries, conversations, openCases, openPqrs, meds] =
      await Promise.all([
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.habit.count({ where: { active: true } }),
        this.prisma.moodEntry.count(),
        this.prisma.journalEntry.count({ where: { deletedAt: null } }),
        this.prisma.aIConversation.count(),
        this.prisma.callCenterCase.count({ where: { status: { in: ['NEW', 'IN_PROGRESS', 'ESCALATED'] } } }),
        this.prisma.pqrs.count({ where: { status: { not: 'resolved' } } }),
        this.prisma.medicationItem.count({ where: { active: true } }),
      ]);
    return {
      users,
      moduleUsage: { habits: activeHabits, mood: moodEntries, journal: journalEntries, aiChat: conversations },
      callCenter: { openCases },
      pqrs: { open: openPqrs },
      medications: { active: meds },
    };
  }

  async riskAlerts() {
    return this.prisma.riskAssessment.findMany({
      where: { level: { in: ['HIGH', 'CRITICAL'] }, reviewedByHuman: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, level: true, source: true, createdAt: true, userId: true },
    });
  }

  // ─────────────── Gestión de usuarios ───────────────

  async listUsers(q?: string) {
    const users = await this.prisma.user.findMany({
      where: q ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { profile: { OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }] } }] } : {},
      select: { id: true, email: true, status: true, createdAt: true, profile: { select: { firstName: true, lastName: true } }, roles: { select: { role: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return users.map((u) => ({
      id: u.id, email: u.email, status: u.status, createdAt: u.createdAt,
      name: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : '—',
      roles: u.roles.map((r) => r.role.name),
    }));
  }

  async createUser(dto: { email: string; firstName: string; lastName: string; role: string; password?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) return { ok: false, email: dto.email, error: 'Correo ya registrado' };
    const role = await this.prisma.role.upsert({
      where: { name: dto.role as RoleName },
      update: {},
      create: { name: dto.role as RoleName, description: dto.role },
    });
    const passwordHash = await bcrypt.hash(dto.password ?? 'Bienestar123', 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        roles: { create: { roleId: role.id } },
        profile: { create: { firstName: dto.firstName, lastName: dto.lastName } },
        ...(dto.role === RoleName.AFFILIATE ? { pet: { create: { name: 'Compi' } } } : {}),
      },
    });
    return { ok: true, email: dto.email, id: user.id };
  }

  async bulkCreate(users: { email: string; firstName: string; lastName: string; role: string }[]) {
    const valid = Object.values(RoleName) as string[];
    const results: any[] = [];
    for (const u of users.slice(0, 500)) {
      if (!u.email || !/.+@.+\..+/.test(u.email)) { results.push({ ok: false, email: u.email || '(vacío)', error: 'Correo inválido' }); continue; }
      const role = valid.includes(u.role) ? u.role : RoleName.AFFILIATE;
      results.push(await this.createUser({ ...u, role }));
    }
    return { total: users.length, created: results.filter((r) => r.ok).length, results };
  }
}

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get('metrics')
  @Roles(RoleName.EPS_ADMIN, RoleName.SUPERADMIN, RoleName.AUDITOR)
  metrics() {
    return this.admin.metrics();
  }

  @Get('alerts')
  @Roles(RoleName.EPS_ADMIN, RoleName.PSYCHOLOGIST, RoleName.PHYSICIAN, RoleName.SUPERADMIN)
  alerts() {
    return this.admin.riskAlerts();
  }

  @Get('audit')
  @Roles(RoleName.AUDITOR, RoleName.SUPERADMIN)
  auditLog(@Query('action') action?: string) {
    return this.audit.query({ action });
  }

  @Get('users')
  @Roles(RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
  users(@Query('q') q?: string) {
    return this.admin.listUsers(q);
  }

  @Post('users')
  @Roles(RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
  async createUser(@Body() dto: CreateUserDto) {
    const res = await this.admin.createUser(dto);
    await this.audit.log({ action: 'admin.user.created', resource: `User:${dto.email}` });
    return res;
  }

  @Post('users/bulk')
  @Roles(RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
  async bulk(@Body() dto: BulkUserDto) {
    const res = await this.admin.bulkCreate(dto.users ?? []);
    await this.audit.log({ action: 'admin.user.bulk', resource: `users:${res.created}` });
    return res;
  }
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
