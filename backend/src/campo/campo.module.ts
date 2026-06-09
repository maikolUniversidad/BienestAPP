import { Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CaseStatus, EmergencyType, NotificationType, RiskLevel, RoleName, TicketStatus } from '@prisma/client';
import { IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';

const ADMIN = [RoleName.EPS_ADMIN, RoleName.SUPERADMIN];
const ALL = [RoleName.FIELD_DOCTOR, RoleName.EPS_ADMIN, RoleName.SUPERADMIN];

class StatusDto {
  @IsIn(['available', 'en_route', 'attending', 'offline']) status: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
}
class AttendDto {
  @IsString() visitId: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() cie10?: string;
  @IsOptional() @IsObject() vitals?: Record<string, any>;
}
class EscalateDto {
  @IsString() visitId: string;
  @IsIn(['ambulance', 'urgent_care']) type: string;
  @IsOptional() @IsString() note?: string;
}

@Injectable()
export class CampoService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private async withNames(rows: any[], key = 'userId') {
    const profs = await this.prisma.affiliateProfile.findMany({ where: { userId: { in: rows.map((r) => r[key]) } }, select: { userId: true, firstName: true, lastName: true } });
    const m = new Map(profs.map((p) => [p.userId, `${p.firstName} ${p.lastName}`]));
    return rows.map((r) => ({ ...r, name: m.get(r[key]) ?? r[key] }));
  }

  /** Todos los agentes de campo con ubicación, estado, turno y servicios activos (vista admin/mapa). */
  async agents() {
    const agents = await this.prisma.fieldAgent.findMany({ orderBy: { zone: 'asc' } });
    const withName = await this.withNames(agents);
    // servicios activos = visitas domiciliarias programadas asignadas
    for (const a of withName) {
      a.pendingVisits = await this.prisma.homeVisit.count({ where: { professionalId: a.userId, status: 'scheduled' } });
    }
    return withName;
  }

  /** Vista del propio médico de campo: su agente + visitas asignadas. */
  async me(userId: string) {
    const agent = await this.prisma.fieldAgent.findUnique({ where: { userId } });
    const visits = await this.prisma.homeVisit.findMany({ where: { professionalId: userId, status: { in: ['scheduled', 'done'] } }, orderBy: { scheduledAt: 'asc' }, take: 30 });
    return { agent, visits: await this.withNames(visits) };
  }

  /** Actualiza estado y ubicación del médico de campo (o crea su agente si no existe). */
  async setStatus(userId: string, dto: StatusDto) {
    const existing = await this.prisma.fieldAgent.findUnique({ where: { userId } });
    const data: any = { status: dto.status, lastUpdate: new Date() };
    if (dto.lat != null) data.lat = dto.lat;
    if (dto.lng != null) data.lng = dto.lng;
    if (existing) return this.prisma.fieldAgent.update({ where: { userId }, data });
    return this.prisma.fieldAgent.create({ data: { userId, lat: dto.lat ?? 4.65, lng: dto.lng ?? -74.1, status: dto.status } });
  }

  /** El médico de campo registra la atención al llegar: cierra la visita, crea el encuentro
   *  domiciliario con diagnóstico y guarda los signos vitales como métricas de salud. */
  async attend(userId: string, dto: AttendDto) {
    const visit = await this.prisma.homeVisit.findUnique({ where: { id: dto.visitId } });
    if (!visit) throw new NotFoundException();
    await this.prisma.homeVisit.update({ where: { id: dto.visitId }, data: { status: 'done', notes: dto.notes, vitals: (dto.vitals as object) ?? undefined } });
    const enc = await this.prisma.encounter.create({ data: { userId: visit.userId, professionalId: userId, type: 'domiciliaria', reason: visit.reason, diagnosis: dto.diagnosis, cie10: dto.cie10, status: 'closed', endedAt: new Date() } });
    // Evolución con los hallazgos + vitales como métricas.
    await this.prisma.clinicalEvolution.create({ data: { encounterId: enc.id, userId: visit.userId, authorId: userId, subjective: visit.reason, plan: dto.notes, assessment: dto.diagnosis, vitals: (dto.vitals as object) ?? undefined } }).catch(() => undefined);
    const v = dto.vitals || {};
    const map: [string, string][] = [['hr', 'lpm'], ['spo2', '%'], ['weight', 'kg'], ['temp', '°C']];
    const rows = map.filter(([k]) => Number.isFinite(Number(v[k]))).map(([k, unit]) => ({ userId: visit.userId, type: k === 'hr' ? 'heart_rate' : k === 'temp' ? 'body_temperature' : k, value: Number(v[k]), unit, source: 'manual' }));
    if (rows.length) await this.prisma.healthMetric.createMany({ data: rows }).catch(() => undefined);
    await this.prisma.fieldAgent.update({ where: { userId }, data: { status: 'available', activeServices: { increment: 1 }, lastUpdate: new Date() } }).catch(() => undefined);
    await this.notifications.notify({ userId: visit.userId, type: NotificationType.SYSTEM, category: 'appointment', title: '🏠 Atención domiciliaria realizada', body: 'Tu médico registró la atención en casa.', href: '/citas' }).catch(() => undefined);
    return { success: true, encounterId: enc.id };
  }

  /** Escala una visita: solicita ambulancia o eleva a atención mayor (entra al call center). */
  async escalate(userId: string, dto: EscalateDto) {
    const visit = await this.prisma.homeVisit.findUnique({ where: { id: dto.visitId } });
    if (!visit) throw new NotFoundException();
    const agent = await this.prisma.fieldAgent.findUnique({ where: { userId }, select: { lat: true, lng: true } });

    // Instantánea de telemetría del paciente.
    const metrics = await this.prisma.healthMetric.findMany({ where: { userId: visit.userId, type: { in: ['heart_rate', 'spo2'] } }, orderBy: { recordedAt: 'desc' }, take: 6, select: { type: true, value: true, unit: true, recordedAt: true } });

    if (dto.type === 'ambulance') {
      await this.prisma.emergencyDispatch.create({ data: { userId: visit.userId, type: 'ambulance', status: 'requested', latitude: agent?.lat, longitude: agent?.lng, address: visit.address, notes: dto.note || 'Solicitada por médico out-door', telemetry: metrics as any, dispatchedBy: userId } });
    }
    // Crea ticket de urgencia + caso en el call center (atención mayor).
    await this.prisma.emergencyTicket.create({
      data: {
        userId: visit.userId, type: EmergencyType.MEDICAL, status: TicketStatus.NEW, riskLevel: RiskLevel.HIGH,
        latitude: agent?.lat, longitude: agent?.lng, note: `Escalado por médico out-door: ${dto.note || dto.type}`,
        case: { create: { status: CaseStatus.NEW, priority: dto.type === 'ambulance' ? 100 : 85 } },
      },
    }).catch(() => undefined);

    await this.prisma.homeVisit.update({ where: { id: dto.visitId }, data: { status: 'escalated', notes: dto.note } }).catch(() => undefined);
    await this.prisma.fieldAgent.update({ where: { userId }, data: { status: 'attending', lastUpdate: new Date() } }).catch(() => undefined);
    await this.notifications.notify({ userId: visit.userId, type: NotificationType.CALLCENTER, category: 'dispatch', title: dto.type === 'ambulance' ? '🚑 Ambulancia solicitada' : '⚠️ Caso escalado', body: dto.type === 'ambulance' ? 'Tu médico solicitó una ambulancia. Mantente en el lugar.' : 'Tu caso fue escalado para atención mayor.', href: '/' }).catch(() => undefined);
    return { success: true, escalated: dto.type };
  }

  /** Histórico de atención de un agente (para el administrador). */
  async history(agentUserId: string) {
    const [visits, encounters, agent] = await Promise.all([
      this.prisma.homeVisit.findMany({ where: { professionalId: agentUserId }, orderBy: { scheduledAt: 'desc' }, take: 50 }),
      this.prisma.encounter.count({ where: { professionalId: agentUserId, type: 'domiciliaria' } }),
      this.prisma.fieldAgent.findUnique({ where: { userId: agentUserId } }),
    ]);
    return { agent, totalDomiciliarias: encounters, visits: await this.withNames(visits) };
  }
}

@ApiTags('campo')
@Controller('campo')
export class CampoController {
  constructor(private readonly svc: CampoService) {}

  @Roles(...ADMIN)
  @Get('agents')
  agents() { return this.svc.agents(); }
  @Roles(...ADMIN)
  @Get('agents/:userId/history')
  history(@Param('userId') userId: string) { return this.svc.history(userId); }

  @Roles(...ALL)
  @Get('me')
  me(@CurrentUser('id') userId: string) { return this.svc.me(userId); }
  @Roles(...ALL)
  @Patch('me/status')
  setStatus(@CurrentUser('id') userId: string, @Body() dto: StatusDto) { return this.svc.setStatus(userId, dto); }
  @Roles(...ALL)
  @Post('attend')
  attend(@CurrentUser('id') userId: string, @Body() dto: AttendDto) { return this.svc.attend(userId, dto); }
  @Roles(...ALL)
  @Post('escalate')
  escalate(@CurrentUser('id') userId: string, @Body() dto: EscalateDto) { return this.svc.escalate(userId, dto); }
}

@Module({
  controllers: [CampoController],
  providers: [CampoService],
  exports: [CampoService],
})
export class CampoModule {}
