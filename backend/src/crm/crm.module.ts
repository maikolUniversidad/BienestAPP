import { Body, Controller, Delete, Get, Injectable, Logger, Module, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Roles que pueden usar el CRM (operadores + profesionales de salud + admins).
const CRM_ROLES = [
  RoleName.CALLCENTER_OPERATOR, RoleName.PSYCHOLOGIST, RoleName.PHYSICIAN,
  RoleName.NUTRITIONIST, RoleName.NURSE, RoleName.SOCIAL_WORKER,
  RoleName.EPS_ADMIN, RoleName.SUPERADMIN,
];
const CHANNELS = ['email', 'whatsapp', 'sms'];

class TemplateDto {
  @IsIn(CHANNELS) channel: string;
  @IsString() name: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() htmlBody: string;
  @IsOptional() @IsArray() variables?: string[];
  @IsOptional() @IsIn(['global', 'eps']) scope?: string;
  @IsOptional() @IsString() epsCode?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
class RenderDto {
  @IsString() body: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsObject() variables?: Record<string, string>;
}
class SendDto {
  @IsIn(CHANNELS) channel: string;
  @IsOptional() @IsString() toUserId?: string;
  @IsOptional() @IsString() toAddress?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsObject() variables?: Record<string, string>;
  @IsOptional() @IsString() caseId?: string;
}

/** Sustituye {{variable}} (y {variable}) por sus valores. */
export function renderTemplate(text: string, vars: Record<string, string> = {}): string {
  return (text || '').replace(/\{\{?\s*([\w.]+)\s*\}?\}/g, (_m, k) => (vars[k] != null ? String(vars[k]) : ''));
}

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Plantillas ----------
  listTemplates(channel?: string, scope?: string) {
    const where: any = {};
    if (channel) where.channel = channel;
    if (scope) where.scope = scope;
    return this.prisma.messageTemplate.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }
  createTemplate(userId: string, dto: TemplateDto) {
    return this.prisma.messageTemplate.create({
      data: {
        channel: dto.channel, name: dto.name, subject: dto.subject, htmlBody: dto.htmlBody,
        variables: dto.variables ?? [], scope: dto.scope ?? 'global', epsCode: dto.epsCode,
        active: dto.active ?? true, createdBy: userId,
      },
    });
  }
  updateTemplate(id: string, dto: TemplateDto) {
    return this.prisma.messageTemplate.update({
      where: { id },
      data: {
        channel: dto.channel, name: dto.name, subject: dto.subject, htmlBody: dto.htmlBody,
        variables: dto.variables ?? [], scope: dto.scope ?? 'global', epsCode: dto.epsCode,
        active: dto.active ?? true,
      },
    });
  }
  async deleteTemplate(id: string) {
    await this.prisma.messageTemplate.delete({ where: { id } });
    return { success: true };
  }

  render(dto: RenderDto) {
    return {
      subject: renderTemplate(dto.subject ?? '', dto.variables),
      body: renderTemplate(dto.body, dto.variables),
    };
  }

  messages(caseId?: string, targetUserId?: string) {
    const where: any = {};
    if (caseId) where.caseId = caseId;
    if (targetUserId) where.targetUserId = targetUserId;
    return this.prisma.outboundMessage.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  // ---------- Envío ----------
  async send(userId: string, dto: SendDto) {
    // Resuelve destinatario: por userId (toma correo/teléfono del perfil) o dirección directa.
    let toAddress = dto.toAddress || '';
    let targetUserId = dto.toUserId;
    let vars = dto.variables ?? {};
    if (dto.toUserId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.toUserId }, include: { profile: true } });
      if (u) {
        if (dto.channel === 'email') toAddress = toAddress || u.email;
        else toAddress = toAddress || u.profile?.phone || '';
        vars = { nombre: u.profile?.firstName ?? '', apellido: u.profile?.lastName ?? '', ...vars };
      }
    }

    // Resuelve cuerpo: plantilla o cuerpo directo, con variables sustituidas.
    let subject = dto.subject ?? '';
    let body = dto.body ?? '';
    if (dto.templateId) {
      const t = await this.prisma.messageTemplate.findUnique({ where: { id: dto.templateId } });
      if (t) { subject = t.subject ?? subject; body = t.htmlBody; }
    }
    subject = renderTemplate(subject, vars);
    body = renderTemplate(body, vars);

    if (!toAddress) {
      const rec = await this.prisma.outboundMessage.create({
        data: { channel: dto.channel, toAddress: '', targetUserId, caseId: dto.caseId, templateId: dto.templateId, subject, body, status: 'failed', error: 'Destinatario sin correo/teléfono', sentBy: userId },
      });
      return rec;
    }

    const result = dto.channel === 'email'
      ? await this.sendEmail(toAddress, subject, body)
      : await this.sendWhatsapp(toAddress, body);

    return this.prisma.outboundMessage.create({
      data: {
        channel: dto.channel, toAddress, targetUserId, caseId: dto.caseId, templateId: dto.templateId,
        subject, body, status: result.status, provider: result.provider, error: result.error, sentBy: userId,
      },
    });
  }

  /** Correo vía Resend si hay RESEND_API_KEY; si no, queda 'simulated' (no se pierde la trazabilidad). */
  private async sendEmail(to: string, subject: string, html: string): Promise<{ status: string; provider?: string; error?: string }> {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM ?? 'BienestAPP <onboarding@resend.dev>';
    if (!key) return { status: 'simulated', provider: 'none' };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject: subject || 'BienestAPP', html }),
      });
      if (!res.ok) return { status: 'failed', provider: 'resend', error: `HTTP ${res.status}` };
      return { status: 'sent', provider: 'resend' };
    } catch (e: any) {
      return { status: 'failed', provider: 'resend', error: String(e?.message || e).slice(0, 200) };
    }
  }

  /** WhatsApp Cloud API si hay WHATSAPP_TOKEN + WHATSAPP_PHONE_ID; si no, 'simulated'. */
  private async sendWhatsapp(to: string, body: string): Promise<{ status: string; provider?: string; error?: string }> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    if (!token || !phoneId) return { status: 'simulated', provider: 'none' };
    const phone = to.replace(/[^\d]/g, '');
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: body.slice(0, 4000) } }),
      });
      if (!res.ok) return { status: 'failed', provider: 'whatsapp', error: `HTTP ${res.status}` };
      return { status: 'sent', provider: 'whatsapp' };
    } catch (e: any) {
      return { status: 'failed', provider: 'whatsapp', error: String(e?.message || e).slice(0, 200) };
    }
  }
}

@ApiTags('crm')
@Controller('crm')
@Roles(...CRM_ROLES)
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('templates')
  templates(@Query('channel') channel?: string, @Query('scope') scope?: string) {
    return this.crm.listTemplates(channel, scope);
  }
  @Post('templates')
  createTemplate(@CurrentUser('id') userId: string, @Body() dto: TemplateDto) {
    return this.crm.createTemplate(userId, dto);
  }
  @Put('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: TemplateDto) {
    return this.crm.updateTemplate(id, dto);
  }
  @Delete('templates/:id')
  deleteTemplate(@Param('id') id: string) {
    return this.crm.deleteTemplate(id);
  }
  @Post('render')
  renderPreview(@Body() dto: RenderDto) {
    return this.crm.render(dto);
  }
  @Get('messages')
  messages(@Query('caseId') caseId?: string, @Query('targetUserId') targetUserId?: string) {
    return this.crm.messages(caseId, targetUserId);
  }
  @Post('send')
  send(@CurrentUser('id') userId: string, @Body() dto: SendDto) {
    return this.crm.send(userId, dto);
  }
}

@Module({
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
