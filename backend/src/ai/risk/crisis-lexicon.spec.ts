import { scanCrisisLexicon } from './crisis-lexicon';

describe('crisis-lexicon (red de seguridad determinística)', () => {
  it('detecta ideación suicida con plan como CRITICAL', () => {
    const m = scanCrisisLexicon('ya no quiero vivir y me quiero morir');
    expect(m.some((x) => x.level === 'CRITICAL')).toBe(true);
  });

  it('detecta violencia/abuso como HIGH o superior', () => {
    const m = scanCrisisLexicon('mi pareja me golpea en casa');
    expect(m.length).toBeGreaterThan(0);
    expect(['HIGH', 'CRITICAL']).toContain(m[0].level);
  });

  it('detecta emergencia médica', () => {
    const m = scanCrisisLexicon('no puedo respirar');
    expect(m.some((x) => x.category === 'medical_emergency')).toBe(true);
  });

  it('no marca texto neutral', () => {
    const m = scanCrisisLexicon('hoy fui a caminar y me sentí bien');
    expect(m.length).toBe(0);
  });

  // Seguridad: ante mención de autolesión, escalamos aunque haya negación.
  // Preferimos un falso positivo (revisable por humano) a un falso negativo.
  it('escala ante mención de autolesión incluso con negación (safety-first)', () => {
    const m = scanCrisisLexicon('no quiero matarme, solo estoy cansada');
    expect(m.some((x) => x.level === 'CRITICAL')).toBe(true);
  });
});
