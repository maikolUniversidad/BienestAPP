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
 * Capa provider-agnóstica para LLMs.
 * Soporta:
 *   - 'deepseek'  → API de DeepSeek (compatible con OpenAI). Modelos: deepseek-chat, deepseek-reasoner.
 *   - 'mock'      → proveedor determinístico para dev/CI sin clave de API.
 *
 * Config por entorno: AI_PROVIDER, AI_API_KEY, AI_MODEL, AI_BASE_URL.
 * Toda llamada tiene timeout para garantizar degradación segura (el protocolo de
 * crisis nunca debe quedar bloqueado esperando al LLM).
 */
@Injectable()
export class LlmProvider {
  private readonly logger = new Logger(LlmProvider.name);
  private readonly provider = process.env.AI_PROVIDER ?? 'mock';
  private readonly model = process.env.AI_MODEL ?? 'deepseek-chat';
  private readonly baseUrl = process.env.AI_BASE_URL ?? 'https://api.deepseek.com';
  private readonly apiKey = process.env.AI_API_KEY ?? '';

  private readonly CHAT_TIMEOUT_MS = 15_000;
  private readonly CLASSIFY_TIMEOUT_MS = 8_000;

  get modelName(): string {
    return this.provider === 'mock' ? 'mock' : this.model;
  }

  async chat(messages: LlmMessage[]): Promise<string> {
    if (this.provider === 'mock' || !this.apiKey) return this.mockChat(messages);
    try {
      const res = await this.completion(messages, {
        temperature: 0.6,
        maxTokens: 600,
        timeoutMs: this.CHAT_TIMEOUT_MS,
      });
      return res?.trim() || this.mockChat(messages);
    } catch (e) {
      this.logger.warn(`LLM chat falló (${(e as Error).message}); usando respaldo seguro.`);
      return this.mockChat(messages);
    }
  }

  async classifyRisk(text: string): Promise<LlmRiskAssessment> {
    if (this.provider === 'mock' || !this.apiKey) return this.mockClassify(text);
    try {
      const out = await this.completion(
        [
          {
            role: 'system',
            content:
              'Eres un clasificador de riesgo en salud mental. Clasifica el mensaje del usuario ' +
              'en uno de estos niveles: NONE, LOW, MEDIUM, HIGH, CRITICAL. ' +
              'CRITICAL = ideación suicida con plan/intención, autolesión en curso, violencia ' +
              'inminente o emergencia médica grave. HIGH = ideación pasiva, abuso, pánico severo. ' +
              'Ante la duda, sube el nivel (prioriza la seguridad). ' +
              'Responde EXCLUSIVAMENTE con JSON válido: {"level":"<NIVEL>","confidence":<0..1>}.',
          },
          { role: 'user', content: text },
        ],
        { temperature: 0, maxTokens: 40, timeoutMs: this.CLASSIFY_TIMEOUT_MS, json: true },
      );
      return this.parseRisk(out);
    } catch (e) {
      this.logger.warn(`LLM classify falló (${(e as Error).message}); usando reglas.`);
      return this.mockClassify(text);
    }
  }

  // ─────────────── Llamada HTTP (OpenAI-compatible) ───────────────

  private async completion(
    messages: LlmMessage[],
    opts: { temperature: number; maxTokens: number; timeoutMs: number; json?: boolean },
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: opts.temperature,
          max_tokens: opts.maxTokens,
          stream: false,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`);
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? '';
    } finally {
      clearTimeout(timer);
    }
  }

  private parseRisk(raw: string): LlmRiskAssessment {
    try {
      const json = JSON.parse(raw) as { level?: string; confidence?: number };
      const level = (json.level ?? '').toUpperCase();
      const valid: RiskLevel[] = [
        RiskLevel.NONE,
        RiskLevel.LOW,
        RiskLevel.MEDIUM,
        RiskLevel.HIGH,
        RiskLevel.CRITICAL,
      ];
      const matched = valid.find((v) => v === level) ?? RiskLevel.NONE;
      const confidence =
        typeof json.confidence === 'number' ? Math.max(0, Math.min(1, json.confidence)) : 0.5;
      return { level: matched, confidence };
    } catch {
      return { level: RiskLevel.NONE, confidence: 0 };
    }
  }

  // ─────────────── Mock determinístico (dev / fallback) ───────────────

  private mockChat(messages: LlmMessage[]): string {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    const text = last?.content ?? '';
    if (scanCrisisLexicon(text).length > 0) {
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
