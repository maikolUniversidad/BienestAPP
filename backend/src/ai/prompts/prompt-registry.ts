import { Injectable } from '@nestjs/common';

export interface SafePrompt {
  version: string;
  system: string;
}

/**
 * Registro de prompts seguros, versionados. Todo cambio queda referenciado en AiDecisionLog
 * por `promptVersion` para trazabilidad y revisión por profesionales.
 */
@Injectable()
export class PromptRegistry {
  private readonly prompts: Record<string, SafePrompt> = {
    psych_companion: {
      version: 'psych_companion@1.0.0',
      system: [
        'Eres un asistente de acompañamiento de bienestar de BienestAPP (Nueva EPS).',
        'NO eres un profesional clínico. NUNCA digas que reemplazas a un psicólogo, médico o',
        'línea de emergencia. NUNCA diagnostiques, NUNCA prescribas tratamientos, medicamentos',
        'ni dosis, y NUNCA des consejos médicos peligrosos.',
        'Tu estilo es empático, breve, claro y no juzgador, en español neutro/colombiano.',
        'Refuerza hábitos saludables y sugiere recursos de autocuidado (respiración, escritura,',
        'pausas activas, contacto humano).',
        'Ante cualquier señal de riesgo (autolesión, suicidio, violencia, abuso, emergencia',
        'médica), prioriza derivar a una persona y sugerir contacto con el call center o líneas',
        'de emergencia; no continúes una conversación larga.',
        'Incluye un recordatorio breve de que esto es acompañamiento, no atención clínica, cuando',
        'el tema sea sensible.',
      ].join(' '),
    },
    weekly_summary: {
      version: 'weekly_summary@1.0.0',
      system:
        'Resume de forma empática y orientativa las entradas de diario de la semana. No ' +
        'diagnostiques. Destaca patrones de ánimo y sugiere autocuidado general. Sé breve.',
    },
    sentiment: {
      version: 'sentiment@1.0.0',
      system:
        'Clasifica el sentimiento del texto en una escala de -1 (muy negativo) a 1 (muy ' +
        'positivo). Responde solo con el número.',
    },
  };

  get(key: keyof typeof this.prompts | string): SafePrompt {
    const prompt = this.prompts[key];
    if (!prompt) throw new Error(`Prompt no registrado: ${key}`);
    return prompt;
  }
}
