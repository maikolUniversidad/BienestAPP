import { Injectable } from '@nestjs/common';
import { RiskLevel } from '@prisma/client';
import { LexiconMatch, scanCrisisLexicon } from './crisis-lexicon';
import { LlmProvider } from '../llm/llm.provider';

export interface RiskResult {
  level: RiskLevel;
  ruleMatches: string[];
  categories: string[];
  llmConfidence?: number;
  source: 'rules' | 'rules+llm';
}

/**
 * Clasificador de riesgo de dos capas:
 *  A) reglas determinísticas (léxico de crisis) — autoridad final al alza, nunca depende del LLM.
 *  B) clasificador LLM — solo puede ELEVAR el nivel, nunca bajarlo por debajo de la capa A.
 *
 * Filosofía: ante la duda, escalar. Preferimos un falso positivo a un falso negativo.
 */
@Injectable()
export class RiskClassifierService {
  constructor(private readonly llm: LlmProvider) {}

  async classify(text: string): Promise<RiskResult> {
    // --- Capa A: determinística (siempre corre) ---
    const matches = scanCrisisLexicon(text);
    const ruleLevel = this.levelFromMatches(matches);

    // --- Capa B: LLM (best-effort, solo eleva) ---
    let llmLevel: RiskLevel = RiskLevel.NONE;
    let llmConfidence: number | undefined;
    let source: RiskResult['source'] = 'rules';

    try {
      const assessment = await this.llm.classifyRisk(text);
      llmLevel = assessment.level;
      llmConfidence = assessment.confidence;
      source = 'rules+llm';
    } catch {
      // Degradación segura: si el LLM falla, vale la capa A.
    }

    const level = this.maxLevel(ruleLevel, llmLevel);

    return {
      level,
      ruleMatches: matches.map((m) => `${m.category}:${m.pattern}`),
      categories: [...new Set(matches.map((m) => m.category))],
      llmConfidence,
      source,
    };
  }

  /** Riesgo alto si hay protocolo de crisis (HIGH/CRITICAL). */
  isCrisis(level: RiskLevel): boolean {
    return level === RiskLevel.HIGH || level === RiskLevel.CRITICAL;
  }

  private levelFromMatches(matches: LexiconMatch[]): RiskLevel {
    if (matches.some((m) => m.level === 'CRITICAL')) return RiskLevel.CRITICAL;
    if (matches.some((m) => m.level === 'HIGH')) return RiskLevel.HIGH;
    return RiskLevel.NONE;
  }

  private maxLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
    const order: RiskLevel[] = [
      RiskLevel.NONE,
      RiskLevel.LOW,
      RiskLevel.MEDIUM,
      RiskLevel.HIGH,
      RiskLevel.CRITICAL,
    ];
    return order.indexOf(a) >= order.indexOf(b) ? a : b;
  }
}
