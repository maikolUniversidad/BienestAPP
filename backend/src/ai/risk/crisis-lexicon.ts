/**
 * Léxico de crisis — capa determinística (A) del clasificador de riesgo.
 * Es la RED DE SEGURIDAD: corre siempre, incluso si el LLM está caído.
 * Español neutro + modismos colombianos. Mantener revisado por profesionales.
 *
 * IMPORTANTE: esto NO es un diagnóstico. Solo detecta lenguaje que requiere
 * activar el protocolo de contención y derivación humana.
 */

export interface LexiconRule {
  level: 'HIGH' | 'CRITICAL';
  category: string;
  patterns: RegExp[];
}

export const CRISIS_RULES: LexiconRule[] = [
  {
    level: 'CRITICAL',
    category: 'suicidal_ideation_plan',
    patterns: [
      /\b(me\s+quiero\s+(morir|matar)|quiero\s+matarme|voy\s+a\s+matarme)\b/i,
      /\b(me\s+voy\s+a\s+(suicidar|quitar\s+la\s+vida)|pienso\s+suicidarme)\b/i,
      /\b(tengo\s+un\s+plan\s+para\s+(morir|matarme))\b/i,
      /\b(ya\s+no\s+quiero\s+(vivir|existir|estar\s+aqu[ií]))\b/i,
      /\b(prefiero\s+estar\s+muerto)\b/i,
    ],
  },
  {
    level: 'CRITICAL',
    category: 'self_harm_active',
    patterns: [
      /\b(me\s+estoy\s+(cortando|haciendo\s+da[ñn]o)|me\s+acabo\s+de\s+cortar)\b/i,
      /\b(me\s+tom[eé]\s+(las\s+)?pastillas)\b/i,
    ],
  },
  {
    level: 'CRITICAL',
    category: 'imminent_violence',
    patterns: [
      /\b(voy\s+a\s+(matar|hacerle\s+da[ñn]o)\s+a)\b/i,
      /\b(me\s+van\s+a\s+matar|mi\s+vida\s+corre\s+peligro\s+ahora)\b/i,
    ],
  },
  {
    level: 'CRITICAL',
    category: 'medical_emergency',
    patterns: [
      /\b(no\s+puedo\s+respirar|me\s+est[aá]\s+dando\s+un\s+(infarto|derrame))\b/i,
      /\b(dolor\s+en\s+el\s+pecho\s+y\s+brazo|me\s+voy\s+a\s+desmayar\s+ya)\b/i,
    ],
  },
  {
    level: 'HIGH',
    category: 'suicidal_ideation_passive',
    patterns: [
      /\b(no\s+le\s+veo\s+sentido\s+a\s+(la\s+vida|nada))\b/i,
      /\b(estar[ií]an\s+mejor\s+sin\s+m[ií]|ser[ií]a\s+mejor\s+no\s+estar)\b/i,
      /\b(pensamientos\s+de\s+(muerte|hacerme\s+da[ñn]o))\b/i,
    ],
  },
  {
    level: 'HIGH',
    category: 'abuse_violence',
    patterns: [
      /\b(me\s+(pega|golpea|maltrata|abusa)|me\s+est[aá]n\s+abusando)\b/i,
      /\b(violencia\s+(en\s+casa|de\s+pareja|intrafamiliar))\b/i,
    ],
  },
  {
    level: 'HIGH',
    category: 'severe_panic',
    patterns: [
      /\b(ataque\s+de\s+p[aá]nico|crisis\s+de\s+ansiedad\s+severa)\b/i,
      /\b(siento\s+que\s+me\s+(muero|vuelvo\s+loco)\s+ya)\b/i,
    ],
  },
];

export interface LexiconMatch {
  level: 'HIGH' | 'CRITICAL';
  category: string;
  pattern: string;
}

/**
 * Evalúa el texto contra el léxico determinístico. Retorna los matches.
 *
 * Decisión de seguridad deliberada: NO suprimimos por negaciones ("no quiero matarme",
 * "no puedo respirar"). En una red de seguridad de salud mental, un falso negativo
 * (no detectar una crisis real) es mucho más grave que un falso positivo. La capa B (LLM)
 * y la revisión humana posterior refinan; la capa A siempre escala ante la duda.
 */
export function scanCrisisLexicon(text: string): LexiconMatch[] {
  const matches: LexiconMatch[] = [];
  const normalized = text.normalize('NFC');
  for (const rule of CRISIS_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) {
        matches.push({ level: rule.level, category: rule.category, pattern: pattern.source });
      }
    }
  }
  return matches;
}
