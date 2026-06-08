import { Injectable, Logger } from '@nestjs/common';
import { RiskLevel } from '@prisma/client';
import { scanCrisisLexicon } from '../risk/crisis-lexicon';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRiskAssessment {
  level: RiskLevel;
  confidence: number;
}

/**
 * Capa provider-agnóstica para LLMs. En producción enrutar a través de un AI Gateway
 * con Zero Data Retention y fallback de modelos. Aquí se incluye un proveedor MOCK
 * determinístico para desarrollo y pruebas sin clave de API.
 *
 * Configurar con AI_PROVIDER en .env (mock | anthropic | gateway).
 */
@Injectable()
export class LlmProvider {
  private readonly logger = new Logger(LlmProvider.name);
  private readonly provider = process.env.AI_PROVIDER ?? 'mock';
  private readonly model = process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001';

  get modelName(): string {
    return this.model;
  }

  async chat(messages: LlmMessage[]): Promise<string> {
    if (this.provider === 'mock') return this.mockChat(messages);
    // TODO: integrar proveedor real (Anthropic / AI Gateway) respetando ZDR.
    // Mantener el system prompt de seguridad y límites de tokens.
    this.logger.warn(`Proveedor '${this.provider}' no implementado; usando mock.`);
    return this.mockChat(messages);
  }

  async classifyRisk(text: string): Promise<LlmRiskAssessment> {
    if (this.provider === 'mock') return this.mockClassify(text);
    this.logger.warn(`Proveedor '${this.provider}' no implementado; usando mock.`);
    return this.mockClassify(text);
  }

  // ─────────────── Mock determinístico (dev) ───────────────

  private mockChat(messages: LlmMessage[]): string {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    const text = last?.content ?? '';
    if (scanCrisisLexicon(text).length > 0) {
      // Aunque el orquestador corta antes en crisis, devolvemos contención segura.
      return 'Lamento que estés pasando por esto. No estás solo/a y mereces apoyo de una persona ahora. ¿Quieres que te conecte con nuestro equipo de acompañamiento?';
    }
    return (
      'Gracias por compartir cómo te sientes. Recuerda que estoy aquí para acompañarte en tu ' +
      'bienestar, no para reemplazar a un profesional. ¿Te gustaría intentar un breve ejercicio ' +
      'de respiración o escribir un poco en tu diario?'
    );
  }

  private mockClassify(text: string): LlmRiskAssessment {
    const matches = scanCrisisLexicon(text);
    if (matches.some((m) => m.level === 'CRITICAL')) {
      return { level: RiskLevel.CRITICAL, confidence: 0.9 };
    }
    if (matches.some((m) => m.level === 'HIGH')) {
      return { level: RiskLevel.HIGH, confidence: 0.8 };
    }
    const lowered = text.toLowerCase();
    if (/\b(triste|estr[eé]s|ansiedad|cansad|abrumad)\b/.test(lowered)) {
      return { level: RiskLevel.MEDIUM, confidence: 0.5 };
    }
    return { level: RiskLevel.NONE, confidence: 0.6 };
  }
}
