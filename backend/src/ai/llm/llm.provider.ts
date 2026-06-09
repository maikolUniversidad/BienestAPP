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
  private readonly visionModel = process.env.AI_VISION_MODEL ?? this.model;
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

  /** Estimación nutricional aproximada a partir de una descripción de la comida. */
  async estimateNutrition(description: string): Promise<{
    items: { name: string; confidence: number }[];
    calories: number | null;
    macros: { protein: number; carbs: number; fat: number } | null;
  }> {
    if (this.provider === 'mock' || !this.apiKey) {
      return { items: [{ name: 'comida', confidence: 0.4 }], calories: 500, macros: { protein: 20, carbs: 60, fat: 18 } };
    }
    try {
      const out = await this.completion(
        [
          {
            role: 'system',
            content:
              'Eres un estimador nutricional APROXIMADO (no diagnóstico). Dada la descripción de una ' +
              'comida, responde EXCLUSIVAMENTE con JSON válido: ' +
              '{"items":[{"name":string,"confidence":number}],"calories":number,"macros":{"protein":number,"carbs":number,"fat":number}}. ' +
              'Calorías en kcal y macros en gramos, valores aproximados.',
          },
          { role: 'user', content: description },
        ],
        { temperature: 0.2, maxTokens: 300, timeoutMs: this.CHAT_TIMEOUT_MS, json: true },
      );
      const j = JSON.parse(out);
      return {
        items: Array.isArray(j.items) ? j.items.slice(0, 12) : [],
        calories: typeof j.calories === 'number' ? Math.round(j.calories) : null,
        macros: j.macros ?? null,
      };
    } catch {
      return { items: [], calories: null, macros: null };
    }
  }

  /**
   * Estima nutrición a partir de una FOTO de la comida (modelo de visión, OpenAI-compatible).
   * Si el proveedor/modelo no soporta visión o falla, degrada a una estimación heurística por tipo de comida.
   */
  async estimateNutritionFromImage(imageUrl: string, hint?: { mealType?: string; note?: string }): Promise<{
    items: { name: string; confidence: number }[];
    calories: number | null;
    macros: { protein: number; carbs: number; fat: number } | null;
    mealTypeGuess?: string;
    vision: boolean;
  }> {
    if (this.provider === 'mock' || !this.apiKey) return { ...this.heuristicNutrition(hint?.mealType), vision: false };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.CHAT_TIMEOUT_MS);
    try {
      const sys =
        'Eres un estimador nutricional APROXIMADO (no diagnóstico) que analiza una FOTO de comida. ' +
        'Identifica los alimentos visibles y estima porciones. Responde EXCLUSIVAMENTE con JSON válido: ' +
        '{"items":[{"name":string,"confidence":number}],"calories":number,"macros":{"protein":number,"carbs":number,"fat":number},"mealTypeGuess":"desayuno|merienda|almuerzo|onces|cena|espontanea"}. ' +
        'Calorías en kcal y macros en gramos, valores aproximados.';
      const userContent: any[] = [
        { type: 'text', text: hint?.note ? `Contexto del usuario: ${hint.note}` : 'Analiza esta comida.' },
        { type: 'image_url', image_url: { url: imageUrl } },
      ];
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.visionModel,
          messages: [{ role: 'system', content: sys }, { role: 'user', content: userContent }],
          temperature: 0.2, max_tokens: 400, stream: false, response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const j = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
      return {
        items: Array.isArray(j.items) ? j.items.slice(0, 12) : [],
        calories: typeof j.calories === 'number' ? Math.round(j.calories) : null,
        macros: j.macros ?? null,
        mealTypeGuess: typeof j.mealTypeGuess === 'string' ? j.mealTypeGuess : undefined,
        vision: true,
      };
    } catch (e) {
      this.logger.warn(`Visión nutricional no disponible (${(e as Error).message}); usando estimación heurística.`);
      return { ...this.heuristicNutrition(hint?.mealType), vision: false };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Compara dos fotos (perfil vs foto en vivo) para verificar identidad. Modelo de visión.
   * Si no hay visión disponible, devuelve match=null (requiere revisión manual).
   */
  async verifyIdentity(profileUrl: string, liveUrl: string): Promise<{ match: boolean | null; confidence: number | null; reason?: string }> {
    if (this.provider === 'mock' || !this.apiKey) return { match: null, confidence: null, reason: 'sin_vision' };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.CHAT_TIMEOUT_MS);
    try {
      const sys =
        'Eres un verificador de identidad. Te doy dos fotos: la primera es la foto de perfil registrada, ' +
        'la segunda es una foto tomada en el momento. Indica si parecen ser la MISMA persona. ' +
        'Responde EXCLUSIVAMENTE con JSON: {"match":boolean,"confidence":number,"reason":string}. confidence 0..1.';
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.visionModel,
          messages: [
            { role: 'system', content: sys },
            { role: 'user', content: [
              { type: 'text', text: 'Foto de perfil:' }, { type: 'image_url', image_url: { url: profileUrl } },
              { type: 'text', text: 'Foto en el momento:' }, { type: 'image_url', image_url: { url: liveUrl } },
            ] },
          ],
          temperature: 0, max_tokens: 120, stream: false, response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const j = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
      return {
        match: typeof j.match === 'boolean' ? j.match : null,
        confidence: typeof j.confidence === 'number' ? Math.max(0, Math.min(1, j.confidence)) : null,
        reason: typeof j.reason === 'string' ? j.reason.slice(0, 200) : undefined,
      };
    } catch (e) {
      this.logger.warn(`Verificación de identidad no disponible (${(e as Error).message}).`);
      return { match: null, confidence: null, reason: 'error_vision' };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Estimación de respaldo por tipo de comida cuando no hay visión disponible. */
  private heuristicNutrition(mealType?: string) {
    const KCAL: Record<string, number> = { desayuno: 420, merienda: 200, almuerzo: 650, onces: 230, cena: 500, espontanea: 300 };
    const calories = KCAL[mealType ?? ''] ?? 400;
    const macros = { protein: Math.round(calories * 0.2 / 4), carbs: Math.round(calories * 0.5 / 4), fat: Math.round(calories * 0.3 / 9) };
    return { items: [{ name: 'comida (estimación aproximada)', confidence: 0.3 }], calories, macros, mealTypeGuess: mealType };
  }

  /** Resumen breve y empático de un conjunto de textos (diario, semana). */
  async summarize(systemPrompt: string, text: string): Promise<string> {
    if (this.provider === 'mock' || !this.apiKey) {
      return 'Resumen no disponible en modo demo.';
    }
    try {
      return (
        await this.completion(
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          { temperature: 0.5, maxTokens: 350, timeoutMs: this.CHAT_TIMEOUT_MS },
        )
      ).trim();
    } catch {
      return '';
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
