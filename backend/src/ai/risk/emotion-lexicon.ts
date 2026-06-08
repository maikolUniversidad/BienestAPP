/**
 * Detección ligera del tema emocional predominante en un texto (es-CO).
 * Determinística (sin costo de LLM). Orientativa, NO diagnóstica.
 * Se usa para etiquetar la conversación y personalizar el acompañamiento.
 */
export type EmotionTheme =
  | 'ANXIETY' | 'SADNESS' | 'STRESS' | 'ANGER' | 'TIREDNESS'
  | 'GRATITUDE' | 'MOTIVATION' | 'JOY' | 'CALM' | 'NEUTRAL';

const PATTERNS: { theme: EmotionTheme; rx: RegExp }[] = [
  { theme: 'ANXIETY', rx: /\b(ansiedad|ansios|nervios|preocupad|angustia|inquiet|miedo|p[aá]nico|agobiad)/i },
  { theme: 'SADNESS', rx: /\b(triste|tristeza|deprimid|vac[ií]o|llor|solo|sola|desanimad|sin ganas|desesperanz)/i },
  { theme: 'STRESS', rx: /\b(estr[eé]s|estresad|presi[oó]n|saturad|abrumad|no doy m[aá]s|colapsad)/i },
  { theme: 'ANGER', rx: /\b(rabia|enojad|molest|furi|ira|bronca|impotencia|frustrad)/i },
  { theme: 'TIREDNESS', rx: /\b(cansad|agotad|fatiga|sin energ[ií]a|exhaust|no descans)/i },
  { theme: 'GRATITUDE', rx: /\b(gracias|agradecid|agradezco|bendecid|afortunad)/i },
  { theme: 'MOTIVATION', rx: /\b(motivad|con ganas|lo logr[eé]|orgullos|avanc|mejorand|me esfuerzo)/i },
  { theme: 'JOY', rx: /\b(feliz|alegr|content|disfrut|genial|emocionad)/i },
  { theme: 'CALM', rx: /\b(tranquil|en paz|calm|relajad|sereno|estable)/i },
];

export function detectEmotionTheme(text: string): EmotionTheme {
  const scores: Record<string, number> = {};
  const t = text.normalize('NFC');
  for (const { theme, rx } of PATTERNS) {
    const m = t.match(new RegExp(rx, 'gi'));
    if (m) scores[theme] = (scores[theme] ?? 0) + m.length;
  }
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return (entries[0]?.[0] as EmotionTheme) ?? 'NEUTRAL';
}

export const THEME_LABEL: Record<EmotionTheme, string> = {
  ANXIETY: 'Ansiedad', SADNESS: 'Tristeza', STRESS: 'Estrés', ANGER: 'Enojo',
  TIREDNESS: 'Cansancio', GRATITUDE: 'Gratitud', MOTIVATION: 'Motivación',
  JOY: 'Alegría', CALM: 'Calma', NEUTRAL: 'Neutral',
};
