import { Body, Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { NotificationType, RoleName } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';

// Profesionales que pueden agendar/atender (incluye explícitamente el rol médico PHYSICIAN).
const PRO_ROLES = [
  RoleName.PHYSICIAN, RoleName.PSYCHOLOGIST, RoleName.NUTRITIONIST, RoleName.NURSE,
  RoleName.SOCIAL_WORKER, RoleName.CALLCENTER_OPERATOR, RoleName.EPS_ADMIN, RoleName.SUPERADMIN,
];
const STAFF = new Set<string>(PRO_ROLES.map(String));
const KINDS = ['medical', 'psychology', 'nutrition', 'callcenter', 'nursing', 'social'];
const MODALITIES = ['video', 'phone', 'in_person'];

// Dominio Jitsi (sin claves; salas efímeras por roomId). Configurable por env.
const JITSI_DOMAIN = process.env.JITSI_DOMAIN ?? 'meet.jit.si';

class CreateAppointmentDto {
  @IsString() affiliateId: string;
  @IsOptional() @IsString() professionalId?: string;
  @IsOptional() @IsString() caseId?: string;
  @IsIn(KINDS) kind: string;
  @IsIn(MODALITIES) modality: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsInt() @Min(10) @Max(180) durationMin?: number;
  @IsOptional() @IsString() reason?: string;
}
class StatusDto {
  @IsIn(['scheduled', 'active', 'completed', 'cancelled', 'no_show']) status: string;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(creatorId: string, dto: CreateAppointmentDto) {
    const appt = await this.prisma.appointment.create({
      data: {
        affiliateId: dto.affiliateId,
        professionalId: dto.professionalId ?? creatorId,
        caseId: dto.caseId,
        kind: dto.kind, modality: dto.modality,
        scheduledAt: new Date(dto.scheduledAt),
        durationMin: dto.durationMin ?? 30,
        reason: dto.reason,
        roomId: randomUUID(),
        createdBy: creatorId,
      },
    });
    const when = new Date(appt.scheduledAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
    const modalidad = appt.modality === 'video' ? 'videollamada' : appt.modality === 'phone' ? 'llamada' : 'cita presencial';
    // Notifica al afiliado (aparece en su campana y lo lleva a sus citas/actividad).
    await this.notifications.notify({
      userId: appt.affiliateId,
      type: NotificationType.REMINDER,
      title: 'Tienes una cita agendada',
      body: `Tu ${modalidad} está programada para el ${when}.`,
      data: { kind: 'appointment', appointmentId: appt.id, scheduledAt: appt.scheduledAt, modality: appt.modality },
    });
    if (appt.professionalId && appt.professionalId !== creatorId) {
      await this.notifications.notify({
        userId: appt.professionalId, type: NotificationType.SYSTEM,
        title: 'Cita asignada', body: `Tienes una ${modalidad} el ${when}.`,
        data: { kind: 'appointment', appointmentId: appt.id },
      });
    }
    return appt;
  }

  async forStaff(user: AuthUser, scope?: string) {
    const isAdmin = user.roles.some((r) => r === 'EPS_ADMIN' || r === 'SUPERADMIN');
    const where: any = {};
    if (!(scope === 'all' && isAdmin)) where.professionalId = user.id;
    if (scope === 'upcoming') where.scheduledAt = { gte: new Date() };
    const appts = await this.prisma.appointment.findMany({ where, orderBy: { scheduledAt: 'asc' }, take: 100 });
    return this.withNames(appts);
  }

  async forAffiliate(affiliateId: string) {
    const appts = await this.prisma.appointment.findMany({
      where: { affiliateId, status: { in: ['scheduled', 'active'] } },
      orderBy: { scheduledAt: 'asc' }, take: 50,
    });
    return this.withNames(appts);
  }

  /** Adjunta nombres legibles de afiliado y profesional. */
  private async withNames(appts: any[]) {
    const ids = Array.from(new Set(appts.flatMap((a) => [a.affiliateId, a.professionalId].filter(Boolean))));
    const profiles = await this.prisma.affiliateProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, firstName: true, lastName: true } });
    const nameOf = (id?: string | null) => {
      const p = profiles.find((x) => x.userId === id);
      return p ? `${p.firstName} ${p.lastName}` : null;
    };
    return appts.map((a) => ({ ...a, affiliateName: nameOf(a.affiliateId), professionalName: nameOf(a.professionalId) }));
  }

  async get(id: string, user: AuthUser) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException();
    this.assertAccess(appt, user);
    const [withName] = await this.withNames([appt]);
    return withName;
  }

  /** Datos de la sala de video para el participante (afiliado o profesional). */
  async room(id: string, user: AuthUser) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException();
    this.assertAccess(appt, user);
    const profile = await this.prisma.affiliateProfile.findUnique({ where: { userId: user.id }, select: { firstName: true, lastName: true } });
    const isPro = appt.professionalId === user.id || STAFF.has(user.roles.find((r) => STAFF.has(r)) ?? '');
    return {
      domain: JITSI_DOMAIN,
      room: `BienestAPP-${appt.roomId}`,
      displayName: profile ? `${profile.firstName} ${profile.lastName}` : (isPro ? 'Profesional' : 'Afiliado'),
      moderator: appt.professionalId === user.id,
      appointment: appt,
    };
  }

  async setStatus(id: string, user: AuthUser, status: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new NotFoundException();
    this.assertAccess(appt, user);
    const data: any = { status };
    if (status === 'active' && !appt.startedAt) data.startedAt = new Date();
    if ((status === 'completed' || status === 'cancelled' || status === 'no_show') && !appt.endedAt) data.endedAt = new Date();
    return this.prisma.appointment.update({ where: { id }, data });
  }

  private assertAccess(appt: any, user: AuthUser) {
    const isParticipant = appt.affiliateId === user.id || appt.professionalId === user.id;
    const isStaff = user.roles.some((r) => STAFF.has(r));
    if (!isParticipant && !isStaff) throw new ForbiddenException('Sin acceso a esta cita');
  }
}

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Roles(...PRO_ROLES)
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateAppointmentDto) {
    return this.svc.create(userId, dto);
  }

  @Roles(...PRO_ROLES)
  @Get()
  forStaff(@CurrentUser() user: AuthUser, @Query('scope') scope?: string) {
    return this.svc.forStaff(user, scope);
  }

  // Afiliado: sus próximas citas (también alimenta notificaciones/actividad).
  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.svc.forAffiliate(userId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.get(id, user);
  }

  @Get(':id/room')
  room(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.svc.room(id, user);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: StatusDto) {
    return this.svc.setStatus(id, user, dto.status);
  }
}

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
