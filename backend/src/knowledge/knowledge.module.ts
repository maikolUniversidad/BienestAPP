import { Body, Controller, Delete, Get, Injectable, Module, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { chunkText, htmlToText, normalize } from './chunk.util';

const ADMIN_ROLES = [RoleName.EPS_ADMIN, RoleName.SUPERADMIN];

class CreateSourceDto {
  @IsIn(['global', 'eps']) scope: 'global' | 'eps';
  @IsOptional() @IsString() epsCode?: string;
  @IsString() title: string;
  @IsIn(['link', 'pdf', 'doc', 'text']) type: 'link' | 'pdf' | 'doc' | 'text';
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() storagePath?: string;
}
class UploadUrlDto {
  @IsString() ext: string;
}

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ---------- Catálogo de EPS ----------
  listEps(activeOnly = true) {
    return this.prisma.eps.findMany({ where: activeOnly ? { active: true } : {}, orderBy: { name: 'asc' } });
  }

  // ---------- Gestión de fuentes ----------
  listSources(scope?: string, epsCode?: string) {
    const where: any = {};
    if (scope) where.scope = scope;
    if (epsCode) where.epsCode = epsCode;
    return this.prisma.knowledgeSource.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(userId: string, dto: CreateSourceDto) {
    const epsCode = dto.scope === 'eps' ? (dto.epsCode || null) : null;
    const source = await this.prisma.knowledgeSource.create({
      data: {
        scope: dto.scope, epsCode, title: dto.title, type: dto.type,
        url: dto.url, storagePath: dto.storagePath, status: 'processing', createdBy: userId,
      },
    });
    // Ingesta (extrae texto + trocea + indexa). Cualquier fallo deja la fuente en estado 'error'.
    try {
      const text = await this.extractText(dto);
      const count = await this.indexChunks(source.id, dto.scope, epsCode, text);
      return this.prisma.knowledgeSource.update({
        where: { id: source.id }, data: { status: 'ready', chunkCount: count, error: null },
      });
    } catch (e: any) {
      return this.prisma.knowledgeSource.update({
        where: { id: source.id }, data: { status: 'error', error: String(e?.message || e).slice(0, 300) },
      });
    }
  }

  async remove(id: string) {
    await this.prisma.knowledgeSource.delete({ where: { id } }); // cascade borra los chunks
    return { success: true };
  }

  uploadUrl(userId: string, ext: string) {
    return this.storage.signDocUpload(userId, ext);
  }

  async reindex(id: string) {
    const src = await this.prisma.knowledgeSource.findUnique({ where: { id } });
    if (!src) return { success: false };
    await this.prisma.knowledgeChunk.deleteMany({ where: { sourceId: id } });
    try {
      const text = await this.extractText({ type: src.type as any, url: src.url || undefined, storagePath: src.storagePath || undefined });
      const count = await this.indexChunks(id, src.scope, src.epsCode, text);
      return this.prisma.knowledgeSource.update({ where: { id }, data: { status: 'ready', chunkCount: count, error: null } });
    } catch (e: any) {
      return this.prisma.knowledgeSource.update({ where: { id }, data: { status: 'error', error: String(e?.message || e).slice(0, 300) } });
    }
  }

  // ---------- Extracción de texto por tipo ----------
  private async extractText(dto: { type: string; content?: string; url?: string; storagePath?: string }): Promise<string> {
    if (dto.content && dto.content.trim()) return dto.content;
    if (dto.type === 'link') {
      if (!dto.url) throw new Error('Falta la URL');
      const res = await fetch(dto.url, { headers: { 'User-Agent': 'BienestAPP-KnowledgeBot/1.0' } });
      if (!res.ok) throw new Error(`No se pudo leer el enlace (HTTP ${res.status})`);
      const ct = res.headers.get('content-type') || '';
      const body = ct.includes('application/pdf') ? await this.parsePdf(Buffer.from(await res.arrayBuffer())) : htmlToText(await res.text());
      if (!body.trim()) throw new Error('El enlace no devolvió texto legible');
      return body;
    }
    if ((dto.type === 'pdf' || dto.type === 'doc') && dto.storagePath) {
      const buf = await this.storage.downloadBuffer(dto.storagePath);
      if (!buf) throw new Error('No se pudo descargar el archivo');
      if (dto.type === 'pdf') return this.parsePdf(buf);
      return buf.toString('utf8');
    }
    throw new Error('Sin contenido para indexar (pega el texto, o sube/enlaza un documento legible)');
  }

  /** Extrae texto de un PDF con pdf-parse (import dinámico para no romper el bundle si falta). */
  private async parsePdf(buf: Buffer): Promise<string> {
    try {
      const mod: any = await import('pdf-parse');
      const pdf = mod.default || mod;
      const data = await pdf(buf);
      const text = (data?.text || '').trim();
      if (!text) throw new Error('PDF sin texto extraíble (¿escaneado?)');
      return text;
    } catch (e: any) {
      throw new Error('No se pudo extraer el PDF: ' + String(e?.message || e).slice(0, 120) + '. Sugerencia: pega el texto manualmente.');
    }
  }

  private async indexChunks(sourceId: string, scope: string, epsCode: string | null, text: string): Promise<number> {
    const pieces = chunkText(text);
    if (!pieces.length) throw new Error('No se generaron fragmentos de texto');
    await this.prisma.knowledgeChunk.createMany({
      data: pieces.map((content, ord) => ({ sourceId, scope, epsCode, ord, content })),
    });
    return pieces.length;
  }

  // ---------- Recuperación (RAG léxico) usada por el asistente IA ----------
  /**
   * Devuelve los fragmentos más relevantes a la consulta: conocimiento global +
   * el de la EPS del afiliado. Puntuación por frecuencia de términos (sin embeddings,
   * compatible con DeepSeek/Supabase).
   */
  async retrieve(query: string, epsCode?: string | null, limit = 5): Promise<{ title: string; content: string }[]> {
    const terms = Array.from(new Set(normalize(query).split(' ').filter((t) => t.length >= 4)));
    if (!terms.length) return [];

    const where: any = { OR: [{ scope: 'global' }] };
    if (epsCode) where.OR.push({ scope: 'eps', epsCode });
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where, take: 800,
      select: { content: true, source: { select: { title: true } } },
    });

    const scored = chunks
      .map((c) => {
        const hay = normalize(c.content);
        let score = 0;
        for (const t of terms) {
          let idx = hay.indexOf(t), hits = 0;
          while (idx !== -1 && hits < 8) { hits++; idx = hay.indexOf(t, idx + t.length); }
          score += hits;
        }
        return { score, title: c.source?.title || 'Conocimiento', content: c.content };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ title, content }) => ({ title, content }));
  }

  /** Bloque de contexto listo para inyectar en el prompt del asistente. */
  async contextBlock(query: string, epsCode?: string | null): Promise<string> {
    const hits = await this.retrieve(query, epsCode);
    if (!hits.length) return '';
    const body = hits.map((h, i) => `[Fuente ${i + 1}: ${h.title}]\n${h.content}`).join('\n\n');
    return `Base de conocimiento institucional (úsala SOLO si es pertinente a la consulta; cita datos concretos como líneas, canales o pasos; si no aplica, ignórala):\n${body}`;
  }
}

@ApiTags('knowledge')
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly kb: KnowledgeService) {}

  /** Público: el formulario de registro lista las EPS disponibles. */
  @Public()
  @Get('eps')
  eps() {
    return this.kb.listEps(true);
  }

  @Roles(...ADMIN_ROLES)
  @Get('sources')
  sources(@Query('scope') scope?: string, @Query('epsCode') epsCode?: string) {
    return this.kb.listSources(scope, epsCode);
  }

  @Roles(...ADMIN_ROLES)
  @Post('sources')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSourceDto) {
    return this.kb.create(userId, dto);
  }

  @Roles(...ADMIN_ROLES)
  @Post('upload-url')
  uploadUrl(@CurrentUser('id') userId: string, @Body() dto: UploadUrlDto) {
    return this.kb.uploadUrl(userId, dto.ext);
  }

  @Roles(...ADMIN_ROLES)
  @Post('sources/:id/reindex')
  reindex(@Param('id') id: string) {
    return this.kb.reindex(id);
  }

  @Roles(...ADMIN_ROLES)
  @Delete('sources/:id')
  remove(@Param('id') id: string) {
    return this.kb.remove(id);
  }
}

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
