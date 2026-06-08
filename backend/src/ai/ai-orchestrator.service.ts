import { Injectable } from '@nestjs/common';
import { AiAction, RiskLevel, RiskSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GuardrailsService } from './guardrails/guardrails.service';
import { ResponseValidatorService } from './guardrails/response-validator.service';
import { RiskClassifierService } from './risk/risk-classifier.service';
import { PromptRegistry } from './prompts/prompt-registry';
import { LlmProvider, LlmMessage } from './llm/llm.provider';
import { EscalationService, CrisisProtocol } from './escalation/escalation.service';

export interface OrchestratorReply {
  content: string;
  riskLevel: RiskLevel;
  crisisProtocol?: CrisisProtocol;
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

  /** Procesa un mensaje del afiliado en una conversación de acompañamiento. */
  async handleChatMessage(params: {
    userId: string;
    conversationId: string;
    history: LlmMessage[];
    userText: string;
  }): Promise<OrchestratorReply> {
    const started = Date.now();

    // [1] Pre-guardrails
    const clean = this.guardrails.sanitizeInput(params.userText);
    const inputHash = this.guardrails.hashForLog(clean);

    // [2] Clasificación de riesgo (A determinístico + B LLM)
    const risk = await this.classifier.classify(clean);

    // [2'] Corte por crisis (HIGH / CRITICAL)
    if (this.classifier.isCrisis(risk.level)) {
      // Mensaje de contención breve, validado.
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
        conversationId: params.conversationId,
        inputHash,
        risk,
        promptVersion: promptSpec.version,
        outputSummary: 'CRISIS_CONTAINMENT',
        action: AiAction.ESCALATED,
        validatorResult: validated.result,
        latencyMs: Date.now() - started,
      });

      await this.persistMessages(params.conversationId, clean, protocol.containmentMessage, risk.level);

      return {
        content: protocol.containmentMessage,
        riskLevel: risk.level,
        crisisProtocol: protocol,
      };
    }

    // [3] Prompt seguro + [4] LLM
    const promptSpec = this.prompts.get('psych_companion');
    const messages: LlmMessage[] = [
      { role: 'system', content: promptSpec.system },
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
      action = AiAction.NORMAL;
    }

    // [5] Validación de salida
    const validated = this.validator.validate(raw);
    if (validated.result === 'BLOCKED') action = AiAction.BLOCKED;

    // [6] Registro + persistencia
    await this.logDecision({
      conversationId: params.conversationId,
      inputHash,
      risk,
      promptVersion: promptSpec.version,
      outputSummary: this.guardrails.scrubPii(validated.content).slice(0, 120),
      action,
      validatorResult: validated.result,
      latencyMs: Date.now() - started,
    });

    await this.persistMessages(params.conversationId, clean, validated.content, risk.level);

    return { content: validated.content, riskLevel: risk.level };
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
  ) {
    await this.prisma.aIMessage.createMany({
      data: [
        { conversationId, role: 'user', content: userText, riskLevel },
        { conversationId, role: 'assistant', content: assistantText, riskLevel },
      ],
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
