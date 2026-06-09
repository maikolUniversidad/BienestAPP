/** Utilidades de troceado y normalización para la base de conocimiento RAG. */

const DIACRITICS = /[̀-ͯ]/g;

/** Quita acentos y baja a minúsculas para comparación léxica robusta en español. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Convierte HTML crudo en texto legible (para fuentes tipo enlace). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Trocea texto en fragmentos de ~maxLen caracteres respetando límites de párrafo/oración.
 * Devuelve fragmentos no vacíos, listos para indexar.
 */
export function chunkText(text: string, maxLen = 900): string[] {
  const clean = (text || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) return [];
  const blocks = clean.split(/\n\s*\n/); // por párrafos
  const chunks: string[] = [];
  let buf = '';
  const flush = () => { if (buf.trim()) chunks.push(buf.trim()); buf = ''; };

  for (const block of blocks) {
    const b = block.trim();
    if (!b) continue;
    if (b.length > maxLen) {
      // Párrafo largo → cortar por oraciones.
      flush();
      const sentences = b.split(/(?<=[.!?])\s+/);
      for (const s of sentences) {
        if ((buf + ' ' + s).length > maxLen) flush();
        buf = buf ? `${buf} ${s}` : s;
      }
      flush();
    } else if ((buf + '\n\n' + b).length > maxLen) {
      flush();
      buf = b;
    } else {
      buf = buf ? `${buf}\n\n${b}` : b;
    }
  }
  flush();
  return chunks;
}
