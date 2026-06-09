import { Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationType, RoleName } from '@prisma/client';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';

const HOSP_ROLES = [RoleName.PHYSICIAN, RoleName.NURSE, RoleName.EPS_ADMIN, RoleName.SUPERADMIN];
const WARDS = ['hospitalizacion', 'uci', 'urgencias'];

class BedDto {
  @IsString() code: string;
  @IsIn(WARDS) ward: string;
  @IsOptional() @IsString() notes?: string;
}
class BedStatusDto { @IsIn(['available', 'occupied', 'cleaning', 'maintenance']) status: string; }
class AdmitDto {
  @IsString() userId: string;
  @IsString() bedId: string;
  @IsOptional() @IsString() reason?: string;
}
class TriageDto {
  @IsString() userId: string;
  @IsInt() @Min(1) @Max(5) level: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsObject() vitals?: Record<string, any>;
}

@Injectable()
export class HospitalizacionService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  // ───────── Camas ─────────
  beds(ward?: string) {
    return this.prisma.bed.findMany({ where: ward ? { ward } : {}, orderBy: [{ ward: 'asc' }, { code: 'asc' }] });
  }
  createBed(dto: BedDto) { return this.prisma.bed.create({ data: { code: dto.code, ward: dto.ward, notes: dto.notes } }); }
  setBedStatus(id: string, status: string) { return this.prisma.bed.update({ where: { id }, data: { status } }); }

  /** Censo: camas ocupadas con su paciente y encuentro. */
  async censo() {
    const beds = await this.prisma.bed.findMany({ orderBy: [{ ward: 'asc' }, { code: 'asc' }] });
    const ids = beds.map((b) => b.currentUserId).filter(Boolean) as string[];
    const profs = await this.prisma.affiliateProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, firstName: true, lastName: true } });
    const nameMap = new Map(profs.map((p) => [p.userId, `${p.firstName} ${p.lastName}`]));
    const byWard: Record<string, { total: number; occupied: number }> = {};
    for (const b of beds) { byWard[b.ward] = byWard[b.ward] || { total: 0, occupied: 0 }; byWard[b.ward].total++; if (b.status === 'occupied') byWard[b.ward].occupied++; }
    return {
      beds: beds.map((b) => ({ ...b, patientName: b.currentUserId ? nameMap.get(b.currentUserId) ?? b.currentUserId : null })),
      byWard,
    };
  }

  /** Admite un paciente a una cama: crea encuentro del servicio y ocupa la cama. */
  async admit(by: string, dto: AdmitDto) {
    const bed = await this.prisma.bed.findUnique({ where: { id: dto.bedId } });
    if (!bed) throw new NotFoundException('Cama no encontrada');
    if (bed.status === 'occupied') throw new NotFoundException('La cama ya está ocupada');
    const enc = await this.prisma.encounter.create({ data: { userId: dto.userId, professionalId: by, type: bed.ward, reason: dto.reason, status: 'in_progress' } });
    const updated = await this.prisma.bed.update({ where: { id: dto.bedId }, data: { status: 'occupied', currentUserId: dto.userId, currentEncounterId: enc.id } });
    await this.notifications.notify({ userId: dto.userId, type: NotificationType.SYSTEM, category: 'document', title: '🏥 Admisión registrada', body: `Fuiste admitido en ${bed.ward} (cama ${bed.code}).`, href: '/' }).catch(() => undefined);
    return { bed: updated, encounterId: enc.id };
  }

  /** Egreso: cierra el encuentro y libera la cama (queda en limpieza). */
  async discharge(bedId: string) {
    const bed = await this.prisma.bed.findUnique({ where: { id: bedId } });
    if (!bed) throw new NotFoundException();
    if (bed.currentEncounterId) await this.prisma.encounter.update({ where: { id: bed.currentEncounterId }, data: { status: 'closed', endedAt: new Date() } }).catch(() => undefined);
    return this.prisma.bed.update({ where: { id: bedId }, data: { status: 'cleaning', currentUserId: null, currentEncounterId: null } });
  }

  // ───────── Triage de urgencias ─────────
  async triageCreate(by: string, dto: TriageDto) {
    const enc = await this.prisma.encounter.create({ data: { userId: dto.userId, professionalId: by, type: 'urgencias', reason: dto.reason, status: 'open' } });
    return this.prisma.triage.create({ data: { userId: dto.userId, encounterId: enc.id, level: dto.level, reason: dto.reason, vitals: (dto.vitals as object) ?? undefined, professionalId: by } });
  }

  /** Cola de triage: en espera, ordenada por nivel (1 más urgente) y luego antigüedad. */
  async triageQueue() {
    const rows = await this.prisma.triage.findMany({ where: { status: 'waiting' }, orderBy: [{ level: 'asc' }, { createdAt: 'asc' }], take: 100 });
    const profs = await this.prisma.affiliateProfile.findMany({ where: { userId: { in: rows.map((r) => r.userId) } }, select: { userId: true, firstName: true, lastName: true } });
    const nameMap = new Map(profs.map((p) => [p.userId, `${p.firstName} ${p.lastName}`]));
    return rows.map((r) => ({ ...r, name: nameMap.get(r.userId) ?? r.userId, waitMin: Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60000) }));
  }
  triageAttend(id: string) { return this.prisma.triage.update({ where: { id }, data: { status: 'attended' } }); }
}

@ApiTags('hospitalizacion')
@Controller('hospitalizacion')
@Roles(...HOSP_ROLES)
export class HospitalizacionController {
  constructor(private readonly svc: HospitalizacionService) {}

  @Get('beds')
  beds(@Query('ward') ward?: string) { return this.svc.beds(ward); }
  @Post('beds')
  createBed(@Body() dto: BedDto) { return this.svc.createBed(dto); }
  @Patch('beds/:id/status')
  setBedStatus(@Param('id') id: string, @Body() dto: BedStatusDto) { return this.svc.setBedStatus(id, dto.status); }
  @Get('censo')
  censo() { return this.svc.censo(); }
  @Post('admit')
  admit(@CurrentUser('id') by: string, @Body() dto: AdmitDto) { return this.svc.admit(by, dto); }
  @Post('beds/:id/discharge')
  discharge(@Param('id') id: string) { return this.svc.discharge(id); }

  @Post('triage')
  triage(@CurrentUser('id') by: string, @Body() dto: TriageDto) { return this.svc.triageCreate(by, dto); }
  @Get('triage')
  triageQueue() { return this.svc.triageQueue(); }
  @Patch('triage/:id/attend')
  attend(@Param('id') id: string) { return this.svc.triageAttend(id); }
}

@Module({
  controllers: [HospitalizacionController],
  providers: [HospitalizacionService],
  exports: [HospitalizacionService],
})
export class HospitalizacionModule {}
