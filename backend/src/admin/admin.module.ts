import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Indicadores AGREGADOS y ANÓNIMOS (sin PII). */
  async metrics() {
    const [users, activeHabits, moodEntries, journalEntries, conversations, openCases] =
      await Promise.all([
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.habit.count({ where: { active: true } }),
        this.prisma.moodEntry.count(),
        this.prisma.journalEntry.count({ where: { deletedAt: null } }),
        this.prisma.aIConversation.count(),
        this.prisma.callCenterCase.count({
          where: { status: { in: ['NEW', 'IN_PROGRESS', 'ESCALATED'] } },
        }),
      ]);
    return {
      users,
      moduleUsage: {
        habits: activeHabits,
        mood: moodEntries,
        journal: journalEntries,
        aiChat: conversations,
      },
      callCenter: { openCases },
    };
  }

  /** Alertas de riesgo pendientes de revisión humana (acceso restringido). */
  async riskAlerts() {
    return this.prisma.riskAssessment.findMany({
      where: { level: { in: ['HIGH', 'CRITICAL'] }, reviewedByHuman: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      // No exponemos el contenido del diario; solo metadatos de riesgo.
      select: {
        id: true,
        level: true,
        source: true,
        createdAt: true,
        userId: true,
      },
    });
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
}

@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
