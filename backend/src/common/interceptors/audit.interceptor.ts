import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Audita automáticamente accesos a recursos sensibles.
 * Solo registra rutas marcadas como auditables (call center, admin, alerts, riesgo)
 * para no inflar el log con tráfico trivial. Append-only.
 */
const AUDITED_PREFIXES = ['/callcenter', '/admin', '/emergency', '/journal'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const path: string = req.route?.path ?? req.url ?? '';
    const method: string = req.method;

    const shouldAudit =
      AUDITED_PREFIXES.some((p) => path.includes(p)) && method !== 'GET'
        ? true
        : AUDITED_PREFIXES.some((p) => path.includes(p)) && path.includes('cases');

    return next.handle().pipe(
      tap(() => {
        if (!shouldAudit) return;
        const actorId: string | undefined = req.user?.id;
        // Fire-and-forget; nunca debe romper la respuesta.
        this.prisma.auditLog
          .create({
            data: {
              actorId,
              action: `${method} ${path}`,
              resource: req.params?.id ? `${path}:${req.params.id}` : path,
              ip: req.ip,
              userAgent: req.headers?.['user-agent'],
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}
