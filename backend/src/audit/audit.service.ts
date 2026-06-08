import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registro explícito de auditoría desde la capa de servicio. */
  async log(params: {
    actorId?: string;
    action: string;
    resource: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        resource: params.resource,
        metadata: params.metadata as object,
      },
    });
  }

  async query(filters: { actorId?: string; action?: string; take?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        actorId: filters.actorId,
        action: filters.action ? { contains: filters.action } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.take ?? 100, 500),
    });
  }
}
