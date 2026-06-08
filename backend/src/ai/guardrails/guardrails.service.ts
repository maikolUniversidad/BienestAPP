import { Injectable } from '@nestjs/common';

/**
 * Pre-guardrails (entrada) y utilidades de sanitización.
 * - Mitiga prompt injection básico.
 * - Limita longitud.
 * - Provee scrubbing de PII para logs (no se loguea texto sensible en claro).
 */
@Injectable()
export class GuardrailsService {
  private readonly MAX_INPUT = 4000;

  sanitizeInput(text: string): string {
    let t = text.slice(0, this.MAX_INPUT);
    // Neutraliza intentos comunes de inyección de instrucciones al sistema.
    t = t.replace(/ignore (all|previous) instructions/gi, '[filtrado]');
    t = t.replace(/system\s*:/gi, 'usuario:');
    return t.trim();
  }

  /** Hash estable para trazabilidad sin almacenar texto en claro en el log. */
  hashForLog(text: string): string {
    // import diferido para mantener el servicio liviano
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex').slice(0, 32);
  }

  /** Enmascara PII evidente (correos, teléfonos, documentos) en textos de log. */
  scrubPii(text: string): string {
    return text
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
      .replace(/\b\d{7,12}\b/g, '[num]');
  }
}
