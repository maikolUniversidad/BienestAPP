/** Sugerencias de navegación: convierte la intención del mensaje en botones que llevan
 *  al módulo correcto de la app, complementando la respuesta de la IA. */

export interface ChatAction {
  label: string;
  href: string;
  icon?: string;
}

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Cada regla: si algún término aparece, sugiere ese módulo. El orden define prioridad.
const RULES: { terms: string[]; action: ChatAction }[] = [
  { terms: ['cita', 'agenda', 'autorizacion', 'autorizar', 'tramite', 'eps', 'cita medica', 'videollamada', 'teleconsulta'], action: { label: 'Mis citas', href: '/citas', icon: 'cita' } },
  { terms: ['medicament', 'medicina', 'pastilla', 'dosis', 'formula', 'tratamiento'], action: { label: 'Medicación', href: '/medicacion', icon: 'med' } },
  { terms: ['comida', 'aliment', 'nutricion', 'dieta', 'comer', 'peso', 'calorias'], action: { label: 'Alimentación', href: '/alimentacion', icon: 'food' } },
  { terms: ['dormir', 'sueno', 'insomnio', 'descansar', 'pasos', 'corazon', 'ritmo', 'reloj', 'pulsera', 'ejercicio', 'actividad fisica'], action: { label: 'Salud y wearables', href: '/salud', icon: 'salud' } },
  { terms: ['triste', 'tristeza', 'animo', 'emocion', 'siento', 'sentir', 'llorar', 'diario', 'escribir'], action: { label: 'Diario y ánimo', href: '/diario', icon: 'diario' } },
  { terms: ['ansiedad', 'ansioso', 'estres', 'estresado', 'respira', 'calma', 'panico', 'nervios', 'pausa'], action: { label: 'Pausas y hábitos', href: '/habitos', icon: 'habits' } },
  { terms: ['meditar', 'meditacion', 'relajar', 'ejercicio de respiracion', 'biblioteca', 'recurso', 'leer', 'aprender'], action: { label: 'Biblioteca', href: '/biblioteca', icon: 'biblioteca' } },
  { terms: ['meta', 'objetivo', 'proposito', 'lograr', 'habito nuevo'], action: { label: 'Metas', href: '/metas', icon: 'metas' } },
  { terms: ['test', 'evaluacion', 'cuestionario', 'quiz', 'medir'], action: { label: 'Tests', href: '/tests', icon: 'tests' } },
  { terms: ['solo', 'soledad', 'apoyo', 'comunidad', 'compartir', 'otros', 'grupo'], action: { label: 'Comunidad', href: '/comunidad', icon: 'comunidad' } },
  { terms: ['queja', 'reclamo', 'peticion', 'pqrs', 'inconform'], action: { label: 'PQRS', href: '/pqrs', icon: 'pqrs' } },
  { terms: ['progreso', 'avance', 'racha', 'como voy', 'estadistica'], action: { label: 'Progreso', href: '/progreso', icon: 'progreso' } },
];

// Mapa de tema emocional → módulo de apoyo (refuerza la sugerencia).
const THEME_ACTION: Record<string, ChatAction> = {
  ANXIETY: { label: 'Pausa de respiración', href: '/habitos', icon: 'habits' },
  STRESS: { label: 'Pausa de respiración', href: '/habitos', icon: 'habits' },
  SADNESS: { label: 'Diario y ánimo', href: '/diario', icon: 'diario' },
  TIREDNESS: { label: 'Salud y descanso', href: '/salud', icon: 'salud' },
  ANGER: { label: 'Diario y ánimo', href: '/diario', icon: 'diario' },
};

/** Devuelve hasta 3 acciones relevantes (sin duplicar por href). */
export function suggestActions(userText: string, theme?: string): ChatAction[] {
  const t = norm(userText);
  const out: ChatAction[] = [];
  const seen = new Set<string>();
  const add = (a?: ChatAction) => { if (a && !seen.has(a.href)) { seen.add(a.href); out.push(a); } };

  if (theme && THEME_ACTION[theme]) add(THEME_ACTION[theme]);
  for (const r of RULES) {
    if (r.terms.some((term) => t.includes(term))) add(r.action);
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}
