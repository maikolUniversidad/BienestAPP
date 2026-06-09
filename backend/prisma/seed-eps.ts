/**
 * Seed de EPS prestadoras + base de conocimiento RAG de Nueva EPS.
 * Ejecutar: npx ts-node prisma/seed-eps.ts
 *
 * Arrancamos solo con Nueva EPS activa; el resto queda estructurado (inactive=false→true
 * cuando se carguen sus bases de conocimiento).
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';
import { chunkText } from '../src/knowledge/chunk.util';

const prisma = new PrismaClient();

// Principales EPS de Colombia (régimen contributivo/subsidiado). Nueva EPS activa de inicio.
const EPS_LIST: { code: string; name: string; nit?: string; active: boolean; brandHex?: string }[] = [
  { code: 'nueva_eps', name: 'Nueva EPS', nit: '900.156.264-2', active: true, brandHex: '#00A0E3' },
  { code: 'sura', name: 'EPS SURA', active: false },
  { code: 'sanitas', name: 'EPS Sanitas', active: false },
  { code: 'salud_total', name: 'Salud Total EPS', active: false },
  { code: 'compensar', name: 'Compensar EPS', active: false },
  { code: 'famisanar', name: 'Famisanar EPS', active: false },
  { code: 'coosalud', name: 'Coosalud EPS', active: false },
  { code: 'mutual_ser', name: 'Mutual Ser EPS', active: false },
  { code: 'aliansalud', name: 'Aliansalud EPS', active: false },
  { code: 'cajacopi', name: 'Cajacopi EPS', active: false },
  { code: 'asmet_salud', name: 'Asmet Salud EPS', active: false },
  { code: 'emssanar', name: 'Emssanar EPS', active: false },
  { code: 'savia_salud', name: 'Savia Salud EPS', active: false },
  { code: 'capital_salud', name: 'Capital Salud EPS', active: false },
  { code: 'comfenalco_valle', name: 'Comfenalco Valle EPS', active: false },
  { code: 'servicio_occidental', name: 'SOS — Servicio Occidental de Salud', active: false },
  { code: 'capresoca', name: 'Capresoca EPS', active: false },
  { code: 'otra', name: 'Otra / No estoy seguro', active: true },
];

async function main() {
  // 1) Catálogo de EPS
  for (const e of EPS_LIST) {
    await prisma.eps.upsert({
      where: { code: e.code },
      update: { name: e.name, nit: e.nit, active: e.active, brandHex: e.brandHex },
      create: e,
    });
  }
  console.log(`EPS upsertadas: ${EPS_LIST.length}`);

  // 2) Base de conocimiento de Nueva EPS (documento accionable)
  const md = readFileSync(join(__dirname, 'knowledge', 'nueva-eps.md'), 'utf8');
  const title = 'Catálogo de Servicios de Nueva EPS (canales, trámites y reglas)';

  // Reemplaza la fuente si ya existía (idempotente).
  const existing = await prisma.knowledgeSource.findFirst({ where: { scope: 'eps', epsCode: 'nueva_eps', title } });
  if (existing) await prisma.knowledgeSource.delete({ where: { id: existing.id } });

  const source = await prisma.knowledgeSource.create({
    data: { scope: 'eps', epsCode: 'nueva_eps', title, type: 'text', status: 'processing' },
  });
  const pieces = chunkText(md);
  await prisma.knowledgeChunk.createMany({
    data: pieces.map((content, ord) => ({ sourceId: source.id, scope: 'eps', epsCode: 'nueva_eps', ord, content })),
  });
  await prisma.knowledgeSource.update({ where: { id: source.id }, data: { status: 'ready', chunkCount: pieces.length } });
  console.log(`Nueva EPS: ${pieces.length} fragmentos indexados.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
