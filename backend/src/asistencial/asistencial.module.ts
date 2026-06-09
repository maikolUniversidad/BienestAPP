import { Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationType, RoleName } from '@prisma/client';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';

const ROLES = [RoleName.PHYSICIAN, RoleName.NURSE, RoleName.NUTRITIONIST, RoleName.EPS_ADMIN, RoleName.SUPERADMIN];

class ResultDto {
  @IsString() result: string;
  @IsOptional() @IsIn(['requested', 'in_progress', 'done', 'cancelled']) status?: string;
}
class VisitDto {
  @IsString() userId: string;
  @IsString() scheduledAt: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() reason?: string;
}
class VisitRegisterDto {
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() vitals?: Record<string, any>;
  @IsOptional() @IsIn(['scheduled', 'done', 'cancelled']) status?: string;
}

@Injectable()
export class AsistencialService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  private async withNames<T extends { userId: string }>(rows: T[]): Promise<(T & { name: string })[]> {
    const profs = await this.prisma.affiliateProfile.findMany({ where: { userId: { in: rows.map((r) => r.userId) } }, select: { userId: true, firstName: true, lastName: true } });
    const m = new Map(profs.map((p) => [p.userId, `${p.firstName} ${p.lastName}`]));
    return rows.map((r) => ({ ...r, name: m.get(r.userId) ?? r.userId }));
  }

  // ───────── Ayudas diagnósticas (laboratorio e imagenología) ─────────
  async worklist(type?: string, status?: string) {
    const where: any = { type: type ? type : { in: ['lab', 'imaging'] } };
    if (status) where.status = status;
    const orders = await this.prisma.clinicalOrder.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
    return this.withNames(orders);
  }
  async setResult(orderId: string, dto: ResultDto) {
    const o = await this.prisma.clinicalOrder.findUnique({ where: { id: orderId } });
    if (!o) throw new NotFoundException();
    return this.prisma.clinicalOrder.update({ where: { id: orderId }, data: { result: dto.result, status: dto.status || 'done' } });
  }

  // ───────── Atención domiciliaria ─────────
  async scheduleVisit(by: string, dto: VisitDto) {
    const v = await this.prisma.homeVisit.create({ data: { userId: dto.userId, professionalId: by, scheduledAt: new Date(dto.scheduledAt), address: dto.address, reason: dto.reason, createdBy: by } });
    await this.notifications.notify({ userId: dto.userId, type: NotificationType.REMINDER, category: 'appointment', title: '🏠 Visita domiciliaria programada', body: `Tu atención en casa está programada para el ${new Date(v.scheduledAt).toLocaleString('es-CO')}.`, href: '/citas', data: { kind: 'homevisit', visitId: v.id } }).catch(() => undefined);
    return v;
  }
  async visits(status?: string) {
    const where: any = {};
    if (status) where.status = status;
    const rows = await this.prisma.homeVisit.findMany({ where, orderBy: { scheduledAt: 'asc' }, take: 100 });
    return this.withNames(rows);
  }
  async registerVisit(id: string, dto: VisitRegisterDto) {
    const visit = await this.prisma.homeVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException();
    const updated = await this.prisma.homeVisit.update({ where: { id }, data: { notes: dto.notes, vitals: (dto.vitals as object) ?? undefined, status: dto.status || 'done' } });
    if ((dto.status || 'done') === 'done') {
      // Crea encuentro domiciliario y registra vitales como métricas.
      await this.prisma.encounter.create({ data: { userId: visit.userId, professionalId: visit.professionalId, type: 'domiciliaria', reason: visit.reason, status: 'closed', endedAt: new Date() } }).catch(() => undefined);
      const v = dto.vitals || {};
      const map: [string, string][] = [['weight', 'kg'], ['hr', 'lpm'], ['spo2', '%']];
      const rows = map.filter(([k]) => Number.isFinite(Number(v[k]))).map(([k, unit]) => ({ userId: visit.userId, type: k === 'hr' ? 'heart_rate' : k, value: Number(v[k]), unit, source: 'manual' }));
      if (rows.length) await this.prisma.healthMetric.createMany({ data: rows }).catch(() => undefined);
    }
    return updated;
  }
}

@ApiTags('asistencial')
@Controller('asistencial')
@Roles(...ROLES)
export class AsistencialController {
  constructor(private readonly svc: AsistencialService) {}

  @Get('diagnosticos')
  worklist(@Query('type') type?: string, @Query('status') status?: string) { return this.svc.worklist(type, status); }
  @Patch('diagnosticos/:id/result')
  setResult(@Param('id') id: string, @Body() dto: ResultDto) { return this.svc.setResult(id, dto); }

  @Post('domiciliaria')
  schedule(@CurrentUser('id') by: string, @Body() dto: VisitDto) { return this.svc.scheduleVisit(by, dto); }
  @Get('domiciliaria')
  visits(@Query('status') status?: string) { return this.svc.visits(status); }
  @Patch('domiciliaria/:id/register')
  register(@Param('id') id: string, @Body() dto: VisitRegisterDto) { return this.svc.registerVisit(id, dto); }
}

@Module({
  controllers: [AsistencialController],
  providers: [AsistencialService],
  exports: [AsistencialService],
})
export class AsistencialModule {}
