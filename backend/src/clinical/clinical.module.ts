import { Body, Controller, Get, Injectable, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

class NoteDto {
  @IsString() @MaxLength(2000) body: string;
  @IsOptional() @IsIn(['seguimiento', 'evaluacion', 'observacion']) category?: string;
}

@Injectable()
export class ClinicalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private name(u: any) {
    return u?.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u?.email ?? 'Paciente';
  }

  /** Lista de pacientes (afiliados) con resumen clínico. */
  async patients() {
    const affiliates = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', roles: { some: { role: { name: RoleName.AFFILIATE } } } },
      select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
      take: 300,
    });
    const out: any[] = [];
    for (const a of affiliates) {
      const [openAlerts, lastMood, lastRisk] = await Promise.all([
        this.prisma.riskAssessment.count({ where: { userId: a.id, level: { in: ['HIGH', 'CRITICAL'] }, reviewedByHuman: false } }),
        this.prisma.moodEntry.findFirst({ where: { userId: a.id }, orderBy: { createdAt: 'desc' } }),
        this.prisma.riskAssessment.findFirst({ where: { userId: a.id }, orderBy: { createdAt: 'desc' } }),
      ]);
      out.push({
        userId: a.id, name: this.name(a),
        openAlerts,
        lastRisk: lastRisk?.level ?? 'NONE',
        lastMood: lastMood?.label ?? null,
      });
    }
    // Pacientes con alertas abiertas primero, luego por último riesgo.
    const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];
    return out.sort((x, y) => (y.openAlerts - x.openAlerts) || (order.indexOf(x.lastRisk) - order.indexOf(y.lastRisk)));
  }

  async overview(userId: string, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, createdAt: true, profile: true },
    });
    const [moods, habits, goals, risks, journalCount, notes, meds, testResults] = await Promise.all([
      this.prisma.moodEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 7 }),
      this.prisma.habit.findMany({ where: { userId, active: true }, select: { name: true, streak: true } }),
      this.prisma.goal.findMany({ where: { userId, status: { not: 'archived' } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.riskAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 15 }),
      this.prisma.journalEntry.count({ where: { userId, deletedAt: null } }),
      this.prisma.clinicalNote.findMany({ where: { patientId: userId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      this.prisma.medicationItem.count({ where: { userId, active: true } }),
      this.prisma.testResult.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10, include: { test: { select: { title: true } } } }),
    ]);
    await this.audit.log({ actorId, action: 'clinical.patient.view', resource: `User:${userId}` });
    return {
      userId,
      name: this.name(user),
      bestStreak: habits.reduce((m, h) => Math.max(m, h.streak), 0),
      moods: moods.map((m) => ({ label: m.label, intensity: m.intensity, createdAt: m.createdAt })),
      habits,
      goals,
      risks,
      journalCount,
      activeMeds: meds,
      notes,
      testResults: testResults.map((t) => ({ id: t.id, title: t.test.title, band: t.band, score: t.score, riskLevel: t.riskLevel, interpretation: t.interpretation, createdAt: t.createdAt })),
    };
  }

  /** Alertas de riesgo (pendientes primero). Sin exponer el contenido del diario. */
  async alerts() {
    const risks = await this.prisma.riskAssessment.findMany({
      where: { level: { in: ['HIGH', 'CRITICAL'] } },
      orderBy: [{ reviewedByHuman: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(risks.map((r) => r.userId))] } },
      select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
    });
    const byId = Object.fromEntries(users.map((u) => [u.id, this.name(u)]));
    return risks.map((r) => ({
      id: r.id, userId: r.userId, name: byId[r.userId] ?? 'Paciente',
      level: r.level, source: r.source, summary: r.summary,
      reviewed: r.reviewedByHuman, createdAt: r.createdAt,
    }));
  }

  async reviewAlert(id: string, reviewerId: string) {
    await this.prisma.riskAssessment.update({
      where: { id },
      data: { reviewedByHuman: true, reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    await this.audit.log({ actorId: reviewerId, action: 'clinical.alert.reviewed', resource: `RiskAssessment:${id}` });
    return { success: true };
  }

  async addNote(patientId: string, authorId: string, dto: NoteDto) {
    const note = await this.prisma.clinicalNote.create({
      data: { patientId, authorId, body: dto.body, category: dto.category ?? 'seguimiento' },
    });
    await this.audit.log({ actorId: authorId, action: 'clinical.note.created', resource: `ClinicalNote:${note.id}`, metadata: { patient: patientId } });
    return note;
  }
}

@ApiTags('clinical')
@Controller('clinical')
@Roles(RoleName.PSYCHOLOGIST, RoleName.PHYSICIAN, RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
export class ClinicalController {
  constructor(private readonly clinical: ClinicalService) {}

  @Get('patients')
  patients() {
    return this.clinical.patients();
  }
  @Get('alerts')
  alerts() {
    return this.clinical.alerts();
  }
  @Patch('alerts/:id/review')
  review(@CurrentUser('id') reviewerId: string, @Param('id') id: string) {
    return this.clinical.reviewAlert(id, reviewerId);
  }
  @Get('patients/:userId')
  overview(@CurrentUser('id') actorId: string, @Param('userId') userId: string) {
    return this.clinical.overview(userId, actorId);
  }
  @Post('patients/:userId/notes')
  addNote(@CurrentUser('id') authorId: string, @Param('userId') userId: string, @Body() dto: NoteDto) {
    return this.clinical.addNote(userId, authorId, dto);
  }
}

@Module({
  controllers: [ClinicalController],
  providers: [ClinicalService],
})
export class ClinicalModule {}
