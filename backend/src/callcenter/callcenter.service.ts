import { Injectable, NotFoundException } from '@nestjs/common';
import { CaseStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.module';

@Injectable()
export class CallcenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Cola priorizada por riesgo (mayor prioridad primero), casos abiertos. */
  async queue() {
    return this.prisma.callCenterCase.findMany({
      where: { status: { in: [CaseStatus.NEW, CaseStatus.IN_PROGRESS, CaseStatus.ESCALATED] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: {
        ticket: {
          select: {
            id: true,
            type: true,
            riskLevel: true,
            createdAt: true,
            user: { select: { id: true, profile: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });
  }

  /** Detalle del caso con historial autorizado del afiliado (acceso auditado). */
  async getCase(operatorId: string, id: string) {
    const c = await this.prisma.callCenterCase.findUnique({
      where: { id },
      include: {
        ticket: { include: { user: { include: { profile: true } } } },
        notes: { orderBy: { createdAt: 'desc' } },
        callLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!c) throw new NotFoundException('Caso no encontrado');

    await this.audit.log({
      actorId: operatorId,
      action: 'callcenter.case.view',
      resource: `CallCenterCase:${id}`,
    });
    return c;
  }

  async setStatus(operatorId: string, id: string, status: CaseStatus) {
    const c = await this.prisma.callCenterCase.update({
      where: { id },
      data: {
        status,
        assignedTo: status === CaseStatus.IN_PROGRESS ? operatorId : undefined,
      },
    });
    await this.prisma.emergencyTicket.update({
      where: { id: c.ticketId },
      data: { status: status as any },
    });
    await this.audit.log({
      actorId: operatorId,
      action: 'callcenter.case.status',
      resource: `CallCenterCase:${id}`,
      metadata: { status },
    });
    return c;
  }

  async addNote(operatorId: string, id: string, body: string) {
    return this.prisma.caseNote.create({
      data: { caseId: id, authorId: operatorId, body },
    });
  }

  async escalate(operatorId: string, id: string, target: string) {
    const c = await this.prisma.callCenterCase.update({
      where: { id },
      data: { status: CaseStatus.ESCALATED, escalatedTo: target },
    });
    await this.audit.log({
      actorId: operatorId,
      action: 'callcenter.case.escalate',
      resource: `CallCenterCase:${id}`,
      metadata: { target },
    });
    return c;
  }

  async logCall(operatorId: string, id: string, durationSec?: number, outcome?: string) {
    return this.prisma.callLog.create({
      data: { caseId: id, operatorId, durationSec, outcome },
    });
  }

  /** Resuelve el afiliado dueño del caso. */
  private async affiliateOfCase(caseId: string): Promise<string> {
    const c = await this.prisma.callCenterCase.findUnique({ where: { id: caseId }, include: { ticket: { select: { userId: true } } } });
    if (!c) throw new NotFoundException('Caso no encontrado');
    return c.ticket.userId;
  }

  /** Vista 360°: todo el perfil y bases del afiliado para una mejor asistencia (acceso auditado). */
  async profile360(operatorId: string, caseId: string) {
    const userId = await this.affiliateOfCase(caseId);
    await this.audit.log({ actorId: operatorId, action: 'callcenter.profile360.view', resource: `User:${userId}`, metadata: { caseId } });

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [user, moods, lastRisk, habits, meds, contacts, lastJournal, hr, spo2, stepsAgg, appts, dispatches] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
      this.prisma.moodEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5, select: { label: true, intensity: true, createdAt: true } }),
      this.prisma.riskAssessment.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { level: true, source: true, summary: true, createdAt: true } }),
      this.prisma.habit.findMany({ where: { userId, active: true }, select: { name: true, streak: true } }),
      this.prisma.medicationItem.findMany({ where: { userId, active: true }, select: { name: true, dose: true, schedule: true } }),
      this.prisma.emergencyContact.findMany({ where: { userId }, select: { name: true, phone: true, relationship: true } }),
      this.prisma.journalEntry.findFirst({ where: { userId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { sentimentScore: true, createdAt: true } }),
      this.prisma.healthMetric.findFirst({ where: { userId, type: 'heart_rate' }, orderBy: { recordedAt: 'desc' }, select: { value: true, recordedAt: true } }),
      this.prisma.healthMetric.findFirst({ where: { userId, type: 'spo2' }, orderBy: { recordedAt: 'desc' }, select: { value: true } }),
      this.prisma.healthMetric.findMany({ where: { userId, type: 'steps', recordedAt: { gte: todayStart } }, select: { value: true } }),
      this.prisma.appointment.findMany({ where: { affiliateId: userId, status: { in: ['scheduled', 'active'] } }, orderBy: { scheduledAt: 'asc' }, take: 5 }),
      this.prisma.emergencyDispatch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);
    const eps = user?.epsCode ? await this.prisma.eps.findUnique({ where: { code: user.epsCode }, select: { name: true } }) : null;

    return {
      userId,
      email: user?.email,
      epsCode: user?.epsCode ?? null,
      epsName: eps?.name ?? null,
      profile: user?.profile ?? null,
      moods,
      lastRisk: lastRisk ?? null,
      habits,
      medications: meds,
      emergencyContacts: contacts,
      lastJournalSentiment: lastJournal?.sentimentScore ?? null,
      health: {
        heartRate: hr ? Math.round(hr.value) : null,
        heartRateAt: hr?.recordedAt ?? null,
        spo2: spo2 ? Math.round(spo2.value) : null,
        stepsToday: Math.round(stepsAgg.reduce((s, r) => s + r.value, 0)),
      },
      appointments: appts,
      dispatches,
    };
  }

  /** Despacha ambulancia / visita domiciliaria / telemetría; adjunta instantánea de salud. */
  async dispatch(operatorId: string, caseId: string, dto: { type: string; address?: string; latitude?: number; longitude?: number; notes?: string }) {
    const c = await this.prisma.callCenterCase.findUnique({ where: { id: caseId }, include: { ticket: { select: { userId: true, latitude: true, longitude: true } } } });
    if (!c) throw new NotFoundException('Caso no encontrado');
    const userId = c.ticket.userId;

    // Instantánea de telemetría: últimas métricas relevantes.
    const metrics = await this.prisma.healthMetric.findMany({
      where: { userId, type: { in: ['heart_rate', 'spo2', 'steps'] } },
      orderBy: { recordedAt: 'desc' }, take: 10,
      select: { type: true, value: true, unit: true, recordedAt: true },
    });

    const dispatch = await this.prisma.emergencyDispatch.create({
      data: {
        userId, caseId, type: dto.type,
        latitude: dto.latitude ?? c.ticket.latitude ?? undefined,
        longitude: dto.longitude ?? c.ticket.longitude ?? undefined,
        address: dto.address, notes: dto.notes,
        telemetry: metrics as any, dispatchedBy: operatorId,
      },
    });
    await this.audit.log({ actorId: operatorId, action: 'callcenter.dispatch.create', resource: `EmergencyDispatch:${dispatch.id}`, metadata: { caseId, type: dto.type } });
    const label = dto.type === 'ambulance' ? 'Una ambulancia va en camino' : dto.type === 'home_visit' ? 'Se programó una visita domiciliaria' : 'Activamos seguimiento por telemetría';
    await this.notifications.notify({
      userId, type: NotificationType.CALLCENTER, category: 'dispatch', title: 'Asistencia en camino',
      body: `${label}. Mantén tu teléfono disponible.`, href: '/', data: { kind: 'dispatch', dispatchId: dispatch.id, type: dto.type },
    });
    return dispatch;
  }

  listDispatches(caseId: string) {
    return this.prisma.emergencyDispatch.findMany({ where: { caseId }, orderBy: { createdAt: 'desc' } });
  }

  async setDispatchStatus(operatorId: string, id: string, status: string) {
    const d = await this.prisma.emergencyDispatch.update({ where: { id }, data: { status } });
    await this.audit.log({ actorId: operatorId, action: 'callcenter.dispatch.status', resource: `EmergencyDispatch:${id}`, metadata: { status } });
    return d;
  }
}
