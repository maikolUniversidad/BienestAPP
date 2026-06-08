import { Injectable, NotFoundException } from '@nestjs/common';
import { CaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CallcenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
}
