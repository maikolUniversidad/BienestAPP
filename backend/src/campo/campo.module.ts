import { Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationType, RoleName } from '@prisma/client';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
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

  /** El médico de campo registra la atención al llegar (cierra visita + crea encuentro domiciliario). */
  async attend(userId: string, dto: AttendDto) {
    const visit = await this.prisma.homeVisit.findUnique({ where: { id: dto.visitId } });
    if (!visit) throw new NotFoundException();
    await this.prisma.homeVisit.update({ where: { id: dto.visitId }, data: { status: 'done', notes: dto.notes } });
    await this.prisma.encounter.create({ data: { userId: visit.userId, professionalId: userId, type: 'domiciliaria', reason: visit.reason, status: 'closed', endedAt: new Date() } }).catch(() => undefined);
    await this.prisma.fieldAgent.update({ where: { userId }, data: { status: 'available', activeServices: { increment: 1 }, lastUpdate: new Date() } }).catch(() => undefined);
    await this.notifications.notify({ userId: visit.userId, type: NotificationType.SYSTEM, category: 'appointment', title: '🏠 Atención domiciliaria realizada', body: 'Tu médico registró la atención en casa.', href: '/citas' }).catch(() => undefined);
    return { success: true };
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
}

@Module({
  controllers: [CampoController],
  providers: [CampoService],
  exports: [CampoService],
})
export class CampoModule {}
