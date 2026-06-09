import { Body, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationType, RoleName } from '@prisma/client';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { createHash } from 'crypto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiModule } from '../ai/ai.module';
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';
import { NotificationsService } from '../notifications/notifications.module';

const ADMIN = [RoleName.EPS_ADMIN, RoleName.SUPERADMIN];
const KINDS = ['consent', 'attendance', 'authorization', 'generic'];

class IpsDto {
  @IsString() name: string;
  @IsOptional() @IsString() nit?: string;
  @IsOptional() @IsString() epsCode?: string;
  @IsOptional() @IsString() logoPath?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
class TemplateDto {
  @IsString() name: string;
  @IsIn(KINDS) kind: string;
  @IsOptional() @IsString() description?: string;
  @IsString() htmlBody: string;
  @IsOptional() @IsString() ipsId?: string;
  @IsOptional() @IsBoolean() requiresPhoto?: boolean;
  @IsOptional() @IsIn(['global', 'eps']) scope?: string;
  @IsOptional() @IsString() epsCode?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
class AssignDto {
  @IsString() templateId: string;
  @IsString() userId: string;
}
class SignDto {
  @IsOptional() @IsString() signedDocumentId?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() appointmentId?: string;
  @IsOptional() @IsString() photoPath?: string;
  @IsObject() evidence: Record<string, unknown>;
}
class UploadUrlDto {
  @IsString() ext: string;
}

function renderVars(text: string, vars: Record<string, string>): string {
  return (text || '').replace(/\{\{?\s*([\w.]+)\s*\}?\}/g, (_m, k) => (vars[k] != null ? String(vars[k]) : ''));
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly notifications: NotificationsService,
  ) {}

  uploadUrl(userId: string, ext: string) {
    return this.storage.signUpload(userId, 'image', ext);
  }

  // ───────── IPS (admin) ─────────
  async listIps() {
    const rows = await this.prisma.ips.findMany({ orderBy: { name: 'asc' } });
    return Promise.all(rows.map(async (r) => ({ ...r, logoUrl: r.logoPath ? await this.storage.signDownload(r.logoPath).catch(() => null) : null })));
  }
  createIps(dto: IpsDto) { return this.prisma.ips.create({ data: { ...dto } }); }
  updateIps(id: string, dto: IpsDto) { return this.prisma.ips.update({ where: { id }, data: { ...dto } }); }
  async deleteIps(id: string) { await this.prisma.ips.delete({ where: { id } }); return { success: true }; }

  // ───────── Plantillas (admin) ─────────
  listTemplates() { return this.prisma.documentTemplate.findMany({ orderBy: { updatedAt: 'desc' } }); }
  createTemplate(userId: string, dto: TemplateDto) {
    return this.prisma.documentTemplate.create({ data: { ...dto, scope: dto.scope ?? 'global', createdBy: userId } });
  }
  updateTemplate(id: string, dto: TemplateDto) { return this.prisma.documentTemplate.update({ where: { id }, data: { ...dto } }); }
  async deleteTemplate(id: string) { await this.prisma.documentTemplate.delete({ where: { id } }); return { success: true }; }

  /** Asigna un documento a un afiliado: crea una instancia PENDIENTE de firma. */
  async assign(dto: AssignDto) {
    const tpl = await this.prisma.documentTemplate.findUnique({ where: { id: dto.templateId } });
    if (!tpl) throw new NotFoundException('Plantilla no encontrada');
    const sd = await this.prisma.signedDocument.create({
      data: { templateId: tpl.id, userId: dto.userId, ipsId: tpl.ipsId, title: tpl.name, contentSnapshot: tpl.htmlBody, status: 'pending' },
    });
    await this.notifications.notify({
      userId: dto.userId, type: NotificationType.SYSTEM, category: 'document',
      title: '✍️ Tienes un documento por firmar', body: `"${tpl.name}" está pendiente de tu firma.`, href: '/documentos',
      data: { kind: 'document', signedDocumentId: sd.id },
    });
    return sd;
  }

  /** Control documental (admin): documentos firmados/pendientes con su evidencia. */
  signedList(userId?: string, status?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    return this.prisma.signedDocument.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  // ───────── Afiliado ─────────
  /** Documentos del afiliado: firmados + pendientes (asignados + asistencia a citas). */
  async mine(userId: string) {
    const docs = await this.prisma.signedDocument.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
    const pendingAttendance = await this.attendancePending(userId);
    return {
      signed: docs.filter((d) => d.status === 'signed'),
      pending: docs.filter((d) => d.status === 'pending'),
      pendingAttendance,
    };
  }

  /** Citas (video) atendidas que aún no tienen firma de asistencia. */
  private async attendancePending(userId: string) {
    const appts = await this.prisma.appointment.findMany({
      where: { affiliateId: userId, modality: 'video', status: { in: ['active', 'completed'] } },
      orderBy: { scheduledAt: 'desc' }, take: 20,
      select: { id: true, scheduledAt: true, kind: true },
    });
    if (!appts.length) return [];
    const signed = await this.prisma.signedDocument.findMany({
      where: { userId, appointmentId: { in: appts.map((a) => a.id) }, status: 'signed' },
      select: { appointmentId: true },
    });
    const signedIds = new Set(signed.map((s) => s.appointmentId));
    return appts.filter((a) => !signedIds.has(a.id)).map((a) => ({ appointmentId: a.id, scheduledAt: a.scheduledAt, kind: a.kind, title: 'Firma de asistencia a videoconsulta' }));
  }

  async pendingCount(userId: string) {
    const [assigned, att] = await Promise.all([
      this.prisma.signedDocument.count({ where: { userId, status: 'pending' } }),
      this.attendancePending(userId),
    ]);
    return { count: assigned + att.length };
  }

  /** Firma un documento: calcula hash de evidencia, verifica identidad por foto y registra. */
  async sign(userId: string, dto: SignDto) {
    const profile = await this.prisma.affiliateProfile.findUnique({ where: { userId }, select: { firstName: true, lastName: true, documentNumber: true, avatarPath: true } });
    const nowIso = new Date().toISOString();

    // Resuelve el documento a firmar (pendiente existente, plantilla, o asistencia a cita).
    let sd = dto.signedDocumentId ? await this.prisma.signedDocument.findFirst({ where: { id: dto.signedDocumentId, userId } }) : null;
    let template: any = null;
    if (!sd && dto.templateId) template = await this.prisma.documentTemplate.findUnique({ where: { id: dto.templateId } });
    if (!sd && !template && !dto.appointmentId) throw new NotFoundException('Documento a firmar no especificado');

    // Construye el contenido (snapshot) si es nuevo.
    let title = sd?.title ?? template?.name ?? 'Firma de asistencia a videoconsulta';
    let ipsId = sd?.ipsId ?? template?.ipsId ?? null;
    let requiresPhoto = template?.requiresPhoto ?? false;
    if (dto.appointmentId && !sd && !template) requiresPhoto = true; // asistencia siempre con foto

    const ips = ipsId ? await this.prisma.ips.findUnique({ where: { id: ipsId } }) : null;
    const vars: Record<string, string> = {
      nombre: `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
      documento: profile?.documentNumber ?? '',
      fecha: new Date().toLocaleString('es-CO'),
      ips: ips?.name ?? '',
    };
    const baseBody = sd?.contentSnapshot ?? template?.htmlBody ?? 'Confirmo mi asistencia a la videoconsulta y la veracidad de mis datos.';
    const contentSnapshot = renderVars(baseBody, vars);

    // Verificación de identidad (si hay foto en vivo + foto de perfil).
    let identityMatch: boolean | null = null;
    let identityConfidence: number | null = null;
    if (dto.photoPath) {
      const liveUrl = await this.storage.signDownload(dto.photoPath).catch(() => null);
      const profUrl = profile?.avatarPath ? await this.storage.signDownload(profile.avatarPath).catch(() => null) : null;
      if (liveUrl && profUrl) {
        const v = await this.orchestrator.verifyIdentity(profUrl, liveUrl).catch(() => ({ match: null, confidence: null }));
        identityMatch = v.match; identityConfidence = v.confidence;
      }
    }

    // Evidencia + hash SHA-256 canónico.
    const evidence = {
      ...dto.evidence,
      signedAtIso: nowIso,
      userId,
      photoHash: dto.photoPath ? createHash('sha256').update(dto.photoPath).digest('hex').slice(0, 16) : null,
    };
    const canonical = JSON.stringify({ userId, title, contentSnapshot, evidence, photoPath: dto.photoPath ?? null });
    const hash = createHash('sha256').update(canonical).digest('hex');

    const data = {
      templateId: template?.id ?? sd?.templateId ?? null,
      userId, appointmentId: dto.appointmentId ?? sd?.appointmentId ?? null, ipsId,
      title, contentSnapshot, status: 'signed', hash, evidence: evidence as object,
      photoPath: dto.photoPath, identityMatch, identityConfidence, signedAt: new Date(),
    };
    const saved = sd
      ? await this.prisma.signedDocument.update({ where: { id: sd.id }, data })
      : await this.prisma.signedDocument.create({ data });

    await this.notifications.notify({
      userId, type: NotificationType.SYSTEM, category: 'document',
      title: '✅ Documento firmado', body: `Firmaste "${title}". Queda registrado en tu gestión documental.`, href: '/documentos',
      data: { kind: 'document', signedDocumentId: saved.id },
    });
    return { id: saved.id, hash: saved.hash, identityMatch, identityConfidence, status: saved.status, signedAt: saved.signedAt };
  }

  async getOne(userId: string, id: string, isAdmin: boolean) {
    const d = await this.prisma.signedDocument.findFirst({ where: isAdmin ? { id } : { id, userId } });
    if (!d) throw new NotFoundException();
    const photoUrl = d.photoPath ? await this.storage.signDownload(d.photoPath).catch(() => null) : null;
    return { ...d, photoUrl };
  }
}

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post('upload-url')
  uploadUrl(@CurrentUser('id') userId: string, @Body() dto: UploadUrlDto) {
    return this.docs.uploadUrl(userId, dto.ext);
  }
  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.docs.mine(userId);
  }
  @Get('pending-count')
  pending(@CurrentUser('id') userId: string) {
    return this.docs.pendingCount(userId);
  }
  @Post('sign')
  sign(@CurrentUser('id') userId: string, @Body() dto: SignDto) {
    return this.docs.sign(userId, dto);
  }
  @Get(':id')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    const isAdmin = (user.roles ?? []).some((r: string) => r === 'EPS_ADMIN' || r === 'SUPERADMIN');
    return this.docs.getOne(user.id, id, isAdmin);
  }

  // ───────── Administración ─────────
  @Roles(...ADMIN) @Get('admin/ips')
  listIps() { return this.docs.listIps(); }
  @Roles(...ADMIN) @Post('admin/ips')
  createIps(@Body() dto: IpsDto) { return this.docs.createIps(dto); }
  @Roles(...ADMIN) @Put('admin/ips/:id')
  updateIps(@Param('id') id: string, @Body() dto: IpsDto) { return this.docs.updateIps(id, dto); }
  @Roles(...ADMIN) @Delete('admin/ips/:id')
  deleteIps(@Param('id') id: string) { return this.docs.deleteIps(id); }

  @Roles(...ADMIN) @Get('admin/templates')
  listTemplates() { return this.docs.listTemplates(); }
  @Roles(...ADMIN) @Post('admin/templates')
  createTemplate(@CurrentUser('id') userId: string, @Body() dto: TemplateDto) { return this.docs.createTemplate(userId, dto); }
  @Roles(...ADMIN) @Put('admin/templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: TemplateDto) { return this.docs.updateTemplate(id, dto); }
  @Roles(...ADMIN) @Delete('admin/templates/:id')
  deleteTemplate(@Param('id') id: string) { return this.docs.deleteTemplate(id); }

  @Roles(...ADMIN) @Post('admin/assign')
  assign(@Body() dto: AssignDto) { return this.docs.assign(dto); }
  @Roles(...ADMIN) @Get('admin/signed')
  signed(@Query('userId') userId?: string, @Query('status') status?: string) { return this.docs.signedList(userId, status); }
}

@Module({
  imports: [AiModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
