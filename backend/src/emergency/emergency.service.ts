import { Injectable, NotFoundException } from '@nestjs/common';
import { EmergencyType, RiskLevel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SosDto } from './dto/sos.dto';

/** Prioridad del caso según el tipo de emergencia. */
const PRIORITY: Record<EmergencyType, number> = {
  MEDICAL: 100,
  VIOLENCE: 95,
  EMOTIONAL_CRISIS: 90,
  ACCIDENT: 85,
  OTHER: 50,
};

const RISK: Record<EmergencyType, RiskLevel> = {
  MEDICAL: RiskLevel.CRITICAL,
  VIOLENCE: RiskLevel.CRITICAL,
  EMOTIONAL_CRISIS: RiskLevel.HIGH,
  ACCIDENT: RiskLevel.HIGH,
  OTHER: RiskLevel.MEDIUM,
};

@Injectable()
export class EmergencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Botón SOS → crea ticket + caso de call center priorizado. */
  async sos(userId: string, dto: SosDto) {
    const ticket = await this.prisma.emergencyTicket.create({
      data: {
        userId,
        type: dto.type,
        riskLevel: RISK[dto.type],
        latitude: dto.latitude,
        longitude: dto.longitude,
        note: dto.note,
        case: {
          create: { priority: PRIORITY[dto.type], status: 'NEW' },
        },
      },
      include: { case: true },
    });

    await this.audit.log({
      actorId: userId,
      action: 'emergency.sos.created',
      resource: `EmergencyTicket:${ticket.id}`,
      metadata: { type: dto.type, hasLocation: dto.latitude != null },
    });

    return {
      ticketId: ticket.id,
      caseId: ticket.case?.id,
      status: ticket.status,
      emergencyLines: [
        { label: 'Emergencias', number: process.env.EMERGENCY_LINE_GENERAL ?? '123' },
        {
          label: 'Línea de salud mental',
          number: process.env.EMERGENCY_LINE_MENTAL_HEALTH ?? '106',
        },
      ],
    };
  }

  async getTicket(userId: string, id: string) {
    const ticket = await this.prisma.emergencyTicket.findFirst({
      where: { id, userId },
      include: { case: { select: { id: true, status: true, priority: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket no encontrado');
    return ticket;
  }
}
