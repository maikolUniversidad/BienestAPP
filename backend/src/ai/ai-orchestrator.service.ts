import { Injectable } from '@nestjs/common';
import { AiAction, RiskLevel, RiskSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GuardrailsService } from './guardrails/guardrails.service';
import { ResponseValidatorService } from './guardrails/response-validator.service';
import { RiskClassifierService } from './risk/risk-classifier.service';
import { scanCrisisLexicon } from './risk/crisis-lexicon';
import { detectEmotionTheme } from './risk/emotion-lexicon';
import { PromptRegistry } from './prompts/prompt-registry';
import { LlmProvider, LlmMessage } from './llm/llm.provider';
import { EscalationService, CrisisProtocol } from './escalation/escalation.service';

export interface OrchestratorReply {
  content: string;
  riskLevel: RiskLevel;
  emotionalTheme: string;
  crisisProtocol?: CrisisProtocol;
}

export interface Attachment {
  type: 'image' | 'audio';
  path: string;
}

/**
 * AI Orchestrator — ÚNICO punto de contacto con el LLM.
 * Ejecuta el pipeline de seguridad completo (ver docs/AI_SAFETY.md §2):
 * pre-guardrails → clasificación de riesgo → [corte por crisis] → prompt seguro →
 * LLM → validación de salida → registro de decisión.
 */
@Injectable()
export class AiOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guardrails: GuardrailsService,
    private readonly classifier: RiskClassifierService,
    private readonly prompts: PromptRegistry,
    private readonly validator: ResponseValidatorService,
    private readonly llm: LlmProvider,
    private readonly escalation: EscalationService,
  ) {}

  /**
   * Procesa un mensaje del afiliado en una conversación de acompañamiento.
   * Si `conversationId` es null → conversación TEMPORAL/ANÓNIMA: no se persiste el contenido
   * (no se guardan AIMessage), pero la seguridad sigue intacta: clasificación de riesgo,
   * protocolo de crisis y registro de decisión (con hash, sin contenido) siempre se ejecutan.
   */
  async handleChatMessage(params: {
    userId: string;
    conversationId: string | null;
    history: LlmMessage[];
    userText: string;
    attachments?: Attachment[];
  }): Promise<OrchestratorReply> {
    const started = Date.now();

    // [1] Pre-guardrails
    let clean = this.guardrails.sanitizeInput(params.userText);
    // Si solo hay adjuntos sin texto, lo reflejamos para que la IA lo reconozca.
    const att = params.attachments ?? [];
    if (!clean && att.length) clean = `(El usuario compartió ${att.map((a) => (a.type === 'image' ? 'una foto' : 'una nota de voz')).join(' y ')}.)`;
    const inputHash = this.guardrails.hashForLog(clean);

    // [2] Clasificación de riesgo + tema emocional
    const risk = await this.classifier.classify(clean);
    const theme = detectEmotionTheme(clean);

    // [2'] Corte por crisis (HIGH / CRITICAL) → activa líneas de ayuda
    if (this.classifier.isCrisis(risk.level)) {
      const promptSpec = this.prompts.get('psych_companion');
      let containment = '';
      try {
        containment = await this.llm.chat([
          { role: 'system', content: promptSpec.system },
          { role: 'user', content: clean },
        ]);
      } catch {
        /* degradación segura → fallback en EscalationService */
      }
      const validated = this.validator.validate(containment, { crisisMode: true });

      const protocol = await this.escalation.activateCrisis({
        userId: params.userId,
        level: risk.level,
        source: RiskSource.AI_CHAT,
        ruleMatches: risk.ruleMatches,
        containment: validated.content,
      });

      await this.logDecision({
        conversationId: params.conversationId ?? undefined,
        inputHash,
        risk,
        promptVersion: promptSpec.version,
        outputSummary: 'CRISIS_CONTAINMENT',
        action: AiAction.ESCALATED,
        validatorResult: validated.result,
        latencyMs: Date.now() - started,
      });

      if (params.conversationId) {
        await this.persistMessages(params.conversationId, clean, protocol.containmentMessage, risk.level, theme, att);
      }

      return { content: protocol.containmentMessage, riskLevel: risk.level, emotionalTheme: theme, crisisProtocol: protocol };
    }

    // [3] Prompt seguro + contexto del usuario (integra toda la app) + [4] LLM
    const promptSpec = this.prompts.get('psych_companion');
    const context = await this.buildUserContext(params.userId);
    const system = `${promptSpec.system}\n\nContexto del usuario (úsalo con tacto para personalizar, no lo recites literal):\n${context}`;
    const messages: LlmMessage[] = [
      { role: 'system', content: system },
      ...params.history,
      { role: 'user', content: clean },
    ];

    let raw = '';
    let action: AiAction = AiAction.NORMAL;
    try {
      raw = await this.llm.chat(messages);
    } catch {
      raw =
        'En este momento no puedo responder, pero quiero acompañarte. Puedes intentar un ' +
        'ejercicio de respiración o, si lo necesitas, conectar con nuestro equipo.';
    }

    // [5] Validación de salida
    const validated = this.validator.validate(raw);
    if (validated.result === 'BLOCKED') action = AiAction.BLOCKED;

    // [6] Registro + persistencia
    await this.logDecision({
      conversationId: params.conversationId ?? undefined,
      inputHash,
      risk,
      promptVersion: promptSpec.version,
      outputSummary: this.guardrails.scrubPii(validated.content).slice(0, 120),
      action,
      validatorResult: validated.result,
      latencyMs: Date.now() - started,
    });

    if (params.conversationId) {
      await this.persistMessages(params.conversationId, clean, validated.content, risk.level, theme, att);
    }

    return { content: validated.content, riskLevel: risk.level, emotionalTheme: theme };
  }

  /** Resumen compacto del estado del usuario para personalizar el acompañamiento. */
  private async buildUserContext(userId: string): Promise<string> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [mood, habits, pet, lastJournal, recentFood] = await Promise.all([
      this.prisma.moodEntry.findFirst({ where: { userId, createdAt: { gte: todayStart } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.habit.findMany({ where: { userId, active: true }, select: { name: true, streak: true } }),
      this.prisma.virtualPet.findUnique({ where: { userId }, select: { name: true, level: true } }),
      this.prisma.journalEntry.findFirst({ where: { userId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { sentimentScore: true, tags: true } }),
      this.prisma.foodLog.findFirst({ where: { userId, createdAt: { gte: todayStart } }, orderBy: { createdAt: 'desc' }, select: { calories: true } }),
    ]);
    const bestStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0);
    const lines = [
      mood ? `- Ánimo de hoy: ${mood.label} (intensidad ${mood.intensity}/5).` : '- Aún no registró su ánimo hoy.',
      `- Mejor racha de hábitos: ${bestStreak} día(s). Hábitos activos: ${habits.map((h) => h.name).join(', ') || 'ninguno'}.`,
      pet ? `- Mascota: ${pet.name}, nivel ${pet.level}.` : '',
      lastJournal?.sentimentScore != null ? `- Sentimiento del último diario: ${lastJournal.sentimentScore.toFixed(2)} (-1 a 1).` : '',
      recentFood?.calories ? `- Registró comida hoy (~${recentFood.calories} kcal).` : '',
    ].filter(Boolean);
    return lines.join('\n');
  }

  /** Análisis de una entrada de diario (usado por la cola async). Devuelve nivel de riesgo. */
  async analyzeJournal(params: { userId: string; journalEntryId: string; text: string }) {
    const clean = this.guardrails.sanitizeInput(params.text);
    const risk = await this.classifier.classify(clean);
    let sentiment: number | null = null;
    try {
      const promptSpec = this.prompts.get('sentiment');
      const out = await this.llm.chat([
        { role: 'system', content: promptSpec.system },
        { role: 'user', content: clean },
      ]);
      const parsed = parseFloat(out);
      sentiment = Number.isFinite(parsed) ? Math.max(-1, Math.min(1, parsed)) : null;
    } catch {
      /* opcional */
    }

    await this.prisma.journalEntry.update({
      where: { id: params.journalEntryId },
      data: { analyzed: true, sentimentScore: sentiment ?? undefined },
    });

    if (this.classifier.isCrisis(risk.level)) {
      await this.escalation.activateCrisis({
        userId: params.userId,
        level: risk.level,
        source: RiskSource.JOURNAL,
        ruleMatches: risk.ruleMatches,
        journalEntryId: params.journalEntryId,
      });
    }
    return { riskLevel: risk.level, sentiment };
  }

  /** Estimación nutricional aproximada (registro de decisión incluido). */
  async estimateNutrition(description: string) {
    const clean = this.guardrails.sanitizeInput(description);
    const result = await this.llm.estimateNutrition(clean);
    await this.prisma.aiDecisionLog.create({
      data: {
        inputHash: this.guardrails.hashForLog(clean),
        riskLevel: RiskLevel.NONE,
        ruleMatches: [],
        promptVersion: 'nutrition@1.0.0',
        model: this.llm.modelName,
        outputSummary: `~${result.calories ?? '?'} kcal`,
        action: AiAction.NORMAL,
        validatorResult: 'PASS',
      },
    });
    return result;
  }

  /**
   * Mensaje breve, cálido y motivador basado en lo que la persona escribió en el diario.
   * Pasa por validación de salida. NO se envía en modo crisis (eso lo maneja analyzeJournal).
   */
  async motivationalMessage(text: string): Promise<string> {
    const clean = this.guardrails.sanitizeInput(text);
    // En crisis no damos un mensaje motivacional alegre: el protocolo de crisis se encarga.
    if (scanCrisisLexicon(clean).length > 0) return '';
    let raw = '';
    try {
      raw = await this.llm.chat([
        {
          role: 'system',
          content:
            'Eres un acompañante de bienestar de BienestAPP. A partir de lo que la persona escribió ' +
            'en su diario, responde con UN mensaje muy breve (1–2 frases), cálido, empático y ' +
            'motivador, que valide lo que siente y refuerce un hábito saludable o un pequeño paso. ' +
            'NO diagnostiques, NO des consejos médicos, NO uses clichés vacíos. Español cercano.',
        },
        { role: 'user', content: clean },
      ]);
    } catch {
      return 'Gracias por escribir hoy. Reconocer cómo te sientes ya es un paso valioso. 🌱';
    }
    const validated = this.validator.validate(raw);
    return validated.content;
  }

  /**
   * Interpretación responsable (NO diagnóstica) del resultado de una encuesta/quiz.
   * Pasa por validación de salida. En riesgo alto usa un mensaje de derivación seguro.
   */
  async interpretTest(params: { title: string; band: string; riskLevel: RiskLevel }): Promise<string> {
    if (this.classifier.isCrisis(params.riskLevel)) {
      return 'Tu resultado sugiere que sería muy valioso hablar pronto con un profesional. No estás solo/a, y dar este paso es un acto de cuidado.';
    }
    let raw = '';
    try {
      raw = await this.llm.chat([
        {
          role: 'system',
          content:
            'Eres un acompañante de bienestar. Interpreta de forma BREVE (2–3 frases), empática y ' +
            'responsable el resultado orientativo de una encuesta de autocuidado. NUNCA diagnostiques ' +
            'ni uses términos clínicos; no es una evaluación médica. Sugiere un pequeño paso de ' +
            'autocuidado acorde a la banda. Español cercano.',
        },
        { role: 'user', content: `Encuesta: "${params.title}". Banda orientativa del resultado: ${params.band}.` },
      ]);
    } catch {
      return 'Gracias por completar la encuesta. Es un resultado orientativo que te ayuda a conocerte; recuerda que no reemplaza una valoración profesional.';
    }
    return this.validator.validate(raw).content;
  }

  /** Resumen empático de los textos de diario de la semana. */
  async summarizeWeek(text: string) {
    if (!text.trim()) return '';
    const promptSpec = this.prompts.get('weekly_summary');
    return this.llm.summarize(promptSpec.system, text);
  }

  private async persistMessages(
    conversationId: string,
    userText: string,
    assistantText: string,
    riskLevel: RiskLevel,
    emotionalTheme?: string,
    attachments?: Attachment[],
  ) {
    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: userText,
        riskLevel,
        emotionalTheme,
        attachments: (attachments as object) ?? undefined,
      },
    });
    await this.prisma.aIMessage.create({
      data: { conversationId, role: 'assistant', content: assistantText, riskLevel },
    });
  }

  private async logDecision(params: {
    conversationId?: string;
    inputHash: string;
    risk: { level: RiskLevel; ruleMatches: string[]; llmConfidence?: number };
    promptVersion: string;
    outputSummary: string;
    action: AiAction;
    validatorResult: string;
    latencyMs: number;
  }) {
    await this.prisma.aiDecisionLog.create({
      data: {
        conversationId: params.conversationId,
        inputHash: params.inputHash,
        riskLevel: params.risk.level,
        ruleMatches: params.risk.ruleMatches,
        promptVersion: params.promptVersion,
        model: this.llm.modelName,
        outputSummary: params.outputSummary,
        action: params.action,
        validatorResult: params.validatorResult,
        latencyMs: params.latencyMs,
        reviewedByHuman: false,
      },
    });
  }
}
