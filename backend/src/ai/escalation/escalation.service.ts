import { Injectable } from '@nestjs/common';
import {
  EmergencyType,
  NotificationType,
  RiskLevel,
  RiskSource,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';

export interface CrisisProtocol {
  active: boolean;
  containmentMessage: string;
  emergencyLines: { label: string; number: string }[];
  actions: string[];
  callCenterCaseId?: string;
}

const CONTAINMENT_FALLBACK =
  'Lamento que estés pasando por esto. No estás solo/a, y lo que sientes importa. ' +
  'Mereces apoyo de una persona ahora mismo. Puedo conectarte con nuestro equipo de ' +
  'acompañamiento, o puedes llamar a la Línea 106 / 123. ¿Quieres que te conecte?';

/**
 * Materializa el protocolo de crisis: crea evaluación de riesgo, ticket de emergencia,
 * caso de call center priorizado, notifica según consentimiento y deja trazabilidad.
 */
@Injectable()
export class EscalationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private emergencyLines() {
    return [
      { label: 'Emergencias', number: process.env.EMERGENCY_LINE_GENERAL ?? '123' },
      {
        label: 'Línea de salud mental',
        number: process.env.EMERGENCY_LINE_MENTAL_HEALTH ?? '106',
      },
    ];
  }

  /**
   * Activa el protocolo de crisis para un usuario.
   * @param containment Mensaje de contención (del LLM validado) o fallback.
   */
  async activateCrisis(params: {
    userId: string;
    level: RiskLevel;
    source: RiskSource;
    ruleMatches: string[];
    containment?: string;
    journalEntryId?: string;
  }): Promise<CrisisProtocol> {
    const priority = params.level === RiskLevel.CRITICAL ? 100 : 70;

    // 1) Evaluación de riesgo (registro clínico separado)
    await this.prisma.riskAssessment.create({
      data: {
        userId: params.userId,
        source: params.source,
        level: params.level,
        ruleMatches: params.ruleMatches,
        journalEntryId: params.journalEntryId,
        summary: `Protocolo de crisis activado desde ${params.source}`,
      },
    });

    // 2) Ticket de emergencia + caso de call center
    const ticket = await this.prisma.emergencyTicket.create({
      data: {
        userId: params.userId,
        type: EmergencyType.EMOTIONAL_CRISIS,
        riskLevel: params.level,
        note: 'Generado automáticamente por detección de riesgo',
        case: {
          create: { priority, status: 'NEW' },
        },
      },
      include: { case: true },
    });

    // 3) Notificación según consentimiento a contactos de emergencia
    await this.notifyEmergencyContactsIfConsented(params.userId);

    // 4) Trazabilidad
    await this.audit.log({
      actorId: params.userId,
      action: 'crisis.protocol.activated',
      resource: `EmergencyTicket:${ticket.id}`,
      metadata: { level: params.level, source: params.source },
    });

    return {
      active: true,
      containmentMessage: params.containment?.trim() || CONTAINMENT_FALLBACK,
      emergencyLines: this.emergencyLines(),
      actions: ['CALL_EMERGENCY', 'CONNECT_CALLCENTER', 'BREATHING_EXERCISE'],
      callCenterCaseId: ticket.case?.id,
    };
  }

  private async notifyEmergencyContactsIfConsented(userId: string) {
    const consent = await this.prisma.consent.findFirst({
      where: {
        userId,
        type: 'EMERGENCY_CONTACT_NOTIFY',
        granted: true,
        revokedAt: null,
      },
    });
    if (!consent) return; // sin consentimiento explícito, no se notifica

    const contacts = await this.prisma.emergencyContact.findMany({
      where: { userId, notifyOnCrisis: true },
    });
    // Encolar notificaciones reales (SMS/push) en v2. Aquí registramos intención.
    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.RISK_ALERT,
        title: 'Protocolo de acompañamiento activado',
        body: `Se notificará a ${contacts.length} contacto(s) de emergencia autorizado(s).`,
      },
    });
  }
}
