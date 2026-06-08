import { Injectable } from '@nestjs/common';

export interface ValidationResult {
  result: 'PASS' | 'REWRITTEN' | 'BLOCKED';
  content: string;
}

/**
 * Validación de la SALIDA del LLM (capa [5] del pipeline).
 * Bloquea/reescribe respuestas que violen las reglas de IA segura.
 */
@Injectable()
export class ResponseValidatorService {
  // Frases que indican que la IA se presenta como reemplazo clínico o diagnostica.
  private readonly FORBIDDEN: RegExp[] = [
    /\b(te\s+diagnostico|tienes\s+(depresi[oó]n|ansiedad\s+cl[ií]nica|trastorno))\b/i,
    /\b(reemplazo|sustituyo)\s+(a\s+)?(un|tu)\s+(psic[oó]logo|m[eé]dico|terapeuta)\b/i,
    /\b(deber[ií]as\s+tomar|te\s+receto|la\s+dosis\s+(es|recomendada))\b/i,
    /\b(no\s+necesitas\s+(ayuda\s+profesional|un\s+m[eé]dico|un\s+psic[oó]logo))\b/i,
  ];

  private readonly SAFE_FALLBACK =
    'Gracias por compartir esto conmigo. Quiero acompañarte, y al mismo tiempo es importante ' +
    'que sepas que no reemplazo a un profesional de salud. Si lo deseas, puedo conectarte con ' +
    'nuestro equipo de acompañamiento o sugerirte un ejercicio breve de bienestar.';

  validate(content: string, opts?: { crisisMode?: boolean }): ValidationResult {
    for (const rx of this.FORBIDDEN) {
      if (rx.test(content)) {
        return { result: 'BLOCKED', content: this.SAFE_FALLBACK };
      }
    }

    // En modo crisis las respuestas deben ser breves.
    if (opts?.crisisMode && content.length > 400) {
      return { result: 'REWRITTEN', content: content.slice(0, 380).trim() + '…' };
    }

    return { result: 'PASS', content };
  }
}
