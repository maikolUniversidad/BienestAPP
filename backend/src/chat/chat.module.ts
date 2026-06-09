import { Body, Controller, ForbiddenException, Get, Injectable, Module, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationType, RoleName } from '@prisma/client';
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.module';

const ROLE_LABEL: Record<string, string> = {
  AFFILIATE: 'Afiliado', CALLCENTER_OPERATOR: 'Call center', PSYCHOLOGIST: 'Psicólogo', PHYSICIAN: 'Médico',
  NUTRITIONIST: 'Nutricionista', NURSE: 'Enfermería', SOCIAL_WORKER: 'Trabajo social', EPS_ADMIN: 'Administrador', SUPERADMIN: 'Superadmin', AUDITOR: 'Auditor',
};
const CARE_ROLES = [RoleName.CALLCENTER_OPERATOR, RoleName.PHYSICIAN, RoleName.PSYCHOLOGIST, RoleName.NUTRITIONIST, RoleName.NURSE, RoleName.SOCIAL_WORKER];

class DirectDto { @IsString() targetId: string; }
class GroupDto { @IsArray() participantIds: string[]; @IsOptional() @IsString() title?: string; }
class AttachmentDto { @IsIn(['image', 'audio', 'document']) type: string; @IsString() path: string; @IsOptional() @IsString() name?: string; }
class SendDto {
  @IsOptional() @IsString() @MaxLength(4000) body?: string;
  @IsOptional() @IsArray() attachments?: AttachmentDto[];
}
class UploadUrlDto { @IsIn(['image', 'audio', 'document']) kind: 'image' | 'audio' | 'document'; @IsString() ext: string; }

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  uploadUrl(userId: string, kind: any, ext: string) { return this.storage.signUpload(userId, kind, ext); }

  /** Marca al usuario como en línea (presencia del chat). */
  async heartbeat(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { chatLastSeenAt: new Date() } }).catch(() => undefined);
    return { ok: true };
  }

  private isStaff(user: AuthUser) { return user.roles.some((r) => r !== 'AFFILIATE'); }

  /** Tarjetas {id,name,role} para una lista de userIds. */
  private async cards(ids: string[]) {
    const uniq = Array.from(new Set(ids));
    if (!uniq.length) return [] as any[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniq } },
      select: { id: true, email: true, chatLastSeenAt: true, profile: { select: { firstName: true, lastName: true } }, roles: { select: { role: { select: { name: true } } } } },
    });
    const now = Date.now();
    return users.map((u) => {
      const role = u.roles[0]?.role.name ?? 'AFFILIATE';
      const online = u.chatLastSeenAt ? now - new Date(u.chatLastSeenAt).getTime() < 90_000 : false;
      return { id: u.id, name: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email, role, roleLabel: ROLE_LABEL[role] ?? role, online, lastSeenAt: u.chatLastSeenAt };
    });
  }

  /** Contactos con los que el usuario puede iniciar una conversación. */
  async contacts(user: AuthUser, q?: string) {
    if (this.isStaff(user)) {
      if (q && q.trim().length >= 2) {
        const term = q.trim();
        const users = await this.prisma.user.findMany({
          where: { id: { not: user.id }, status: 'ACTIVE', OR: [{ email: { contains: term, mode: 'insensitive' } }, { profile: { OR: [{ firstName: { contains: term, mode: 'insensitive' } }, { lastName: { contains: term, mode: 'insensitive' } }] } }] },
          select: { id: true }, take: 20,
        });
        return this.cards(users.map((u) => u.id));
      }
      // sin búsqueda: contrapartes de hilos recientes
      return this.cards(await this.threadCounterpartIds(user.id));
    }
    // Afiliado: su equipo de salud (profesionales de sus citas) + personal de atención + contrapartes previas
    const appts = await this.prisma.appointment.findMany({ where: { affiliateId: user.id, professionalId: { not: null } }, select: { professionalId: true }, take: 50 });
    const careStaff = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', roles: { some: { role: { name: { in: CARE_ROLES } } } } },
      select: { id: true }, take: 20,
    });
    const ids = [...appts.map((a) => a.professionalId as string), ...careStaff.map((u) => u.id), ...(await this.threadCounterpartIds(user.id))];
    return this.cards(ids.filter((id) => id && id !== user.id));
  }

  private async threadCounterpartIds(userId: string): Promise<string[]> {
    const mine = await this.prisma.chatParticipant.findMany({ where: { userId }, select: { threadId: true } });
    const others = await this.prisma.chatParticipant.findMany({ where: { threadId: { in: mine.map((m) => m.threadId) }, userId: { not: userId } }, select: { userId: true } });
    return others.map((o) => o.userId);
  }

  /** Lista de conversaciones del usuario con último mensaje y no leídos. */
  async threads(user: AuthUser) {
    const parts = await this.prisma.chatParticipant.findMany({ where: { userId: user.id }, select: { threadId: true, lastReadAt: true } });
    if (!parts.length) return [];
    const threads = await this.prisma.chatThread.findMany({
      where: { id: { in: parts.map((p) => p.threadId) } },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: { select: { userId: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { body: true, senderId: true, createdAt: true, attachments: true } },
      },
    });
    const readMap = new Map(parts.map((p) => [p.threadId, p.lastReadAt]));
    const allUserIds = threads.flatMap((t) => t.participants.map((p) => p.userId));
    const cardMap = new Map((await this.cards(allUserIds)).map((c) => [c.id, c]));

    const out: any[] = [];
    for (const t of threads) {
      const lastRead = readMap.get(t.id);
      const unread = await this.prisma.chatMessage.count({ where: { threadId: t.id, senderId: { not: user.id }, ...(lastRead ? { createdAt: { gt: lastRead } } : {}) } });
      const others = t.participants.filter((p) => p.userId !== user.id).map((p) => cardMap.get(p.userId)).filter(Boolean);
      const last = t.messages[0];
      out.push({
        id: t.id, kind: t.kind,
        title: t.title || others.map((o: any) => o.name).join(', ') || 'Conversación',
        others, unread, lastMessageAt: t.lastMessageAt,
        preview: last ? (last.body || (Array.isArray(last.attachments) && last.attachments.length ? '📎 Adjunto' : '')) : '',
      });
    }
    return out;
  }

  async unread(user: AuthUser) {
    const parts = await this.prisma.chatParticipant.findMany({ where: { userId: user.id }, select: { threadId: true, lastReadAt: true } });
    let count = 0;
    for (const p of parts) {
      count += await this.prisma.chatMessage.count({ where: { threadId: p.threadId, senderId: { not: user.id }, ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}) } });
    }
    return { count };
  }

  /** Abre (o crea) un chat 1:1 con otro usuario. */
  async openDirect(user: AuthUser, targetId: string) {
    if (targetId === user.id) throw new ForbiddenException('No puedes chatear contigo mismo');
    const target = await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new NotFoundException('Usuario no encontrado');
    const directKey = [user.id, targetId].sort().join(':');
    const existing = await this.prisma.chatThread.findUnique({ where: { directKey } });
    if (existing) return { id: existing.id };
    const t = await this.prisma.chatThread.create({
      data: { kind: 'direct', directKey, createdBy: user.id, participants: { create: [{ userId: user.id }, { userId: targetId }] } },
    });
    return { id: t.id };
  }

  /** Crea un grupo (solo personal). */
  async createGroup(user: AuthUser, dto: GroupDto) {
    if (!this.isStaff(user)) throw new ForbiddenException('Solo el personal puede crear grupos');
    const ids = Array.from(new Set([user.id, ...dto.participantIds])).slice(0, 50);
    const t = await this.prisma.chatThread.create({
      data: { kind: 'group', title: dto.title || 'Grupo', createdBy: user.id, participants: { create: ids.map((userId) => ({ userId })) } },
    });
    return { id: t.id };
  }

  private async assertParticipant(userId: string, threadId: string) {
    const p = await this.prisma.chatParticipant.findUnique({ where: { threadId_userId: { threadId, userId } } });
    if (!p) throw new ForbiddenException('No participas en esta conversación');
  }

  async messages(user: AuthUser, threadId: string, since?: string) {
    await this.assertParticipant(user.id, threadId);
    const where: any = { threadId };
    if (since) where.createdAt = { gt: new Date(since) };
    const msgs = await this.prisma.chatMessage.findMany({ where, orderBy: { createdAt: since ? 'asc' : 'desc' }, take: since ? 100 : 60 });
    const ordered = since ? msgs : msgs.reverse();
    // marca leído
    await this.prisma.chatParticipant.update({ where: { threadId_userId: { threadId, userId: user.id } }, data: { lastReadAt: new Date() } }).catch(() => undefined);
    const cardMap = new Map((await this.cards(ordered.map((m) => m.senderId))).map((c) => [c.id, c]));
    return Promise.all(ordered.map(async (m) => ({
      id: m.id, senderId: m.senderId, mine: m.senderId === user.id,
      senderName: cardMap.get(m.senderId)?.name ?? 'Usuario', senderRole: cardMap.get(m.senderId)?.roleLabel ?? '',
      body: m.body, createdAt: m.createdAt,
      attachments: await this.storage.signAttachments(m.attachments),
    })));
  }

  async send(user: AuthUser, threadId: string, dto: SendDto) {
    await this.assertParticipant(user.id, threadId);
    if (!dto.body?.trim() && !(dto.attachments?.length)) throw new ForbiddenException('Mensaje vacío');
    const msg = await this.prisma.chatMessage.create({
      data: { threadId, senderId: user.id, body: dto.body?.trim() || null, attachments: (dto.attachments as object) ?? undefined },
    });
    await this.prisma.chatThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });
    await this.prisma.chatParticipant.update({ where: { threadId_userId: { threadId, userId: user.id } }, data: { lastReadAt: new Date() } }).catch(() => undefined);

    // Notifica a los demás participantes (ruta según su rol).
    const senderCard = (await this.cards([user.id]))[0];
    const others = await this.prisma.chatParticipant.findMany({ where: { threadId, userId: { not: user.id } }, select: { userId: true } });
    const recipients = await this.prisma.user.findMany({ where: { id: { in: others.map((o) => o.userId) } }, select: { id: true, roles: { select: { role: { select: { name: true } } } } } });
    const bodyPreview = dto.body?.trim()?.slice(0, 80) || '📎 Adjunto';
    for (const r of recipients) {
      const onlyAffiliate = r.roles.every((x) => x.role.name === 'AFFILIATE');
      await this.notifications.notify({
        userId: r.id, type: NotificationType.SYSTEM, category: 'chat',
        title: `💬 ${senderCard?.name ?? 'Mensaje nuevo'}`, body: bodyPreview,
        href: onlyAffiliate ? '/mensajes-chat' : '/chat', data: { kind: 'chat', threadId },
      });
    }
    const [shaped] = await this.messagesShape(user.id, [msg]);
    return shaped;
  }

  private async messagesShape(meId: string, msgs: any[]) {
    const cardMap = new Map((await this.cards(msgs.map((m) => m.senderId))).map((c) => [c.id, c]));
    return Promise.all(msgs.map(async (m) => ({
      id: m.id, senderId: m.senderId, mine: m.senderId === meId,
      senderName: cardMap.get(m.senderId)?.name ?? 'Usuario',
      body: m.body, createdAt: m.createdAt, attachments: await this.storage.signAttachments(m.attachments),
    })));
  }

  async markRead(user: AuthUser, threadId: string) {
    await this.assertParticipant(user.id, threadId);
    await this.prisma.chatParticipant.update({ where: { threadId_userId: { threadId, userId: user.id } }, data: { lastReadAt: new Date() } });
    return { success: true };
  }
}

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('contacts')
  contacts(@CurrentUser() user: AuthUser, @Query('q') q?: string) { return this.chat.contacts(user, q); }
  @Get('threads')
  threads(@CurrentUser() user: AuthUser) { return this.chat.threads(user); }
  @Get('unread')
  unread(@CurrentUser() user: AuthUser) { return this.chat.unread(user); }
  @Post('heartbeat')
  heartbeat(@CurrentUser('id') userId: string) { return this.chat.heartbeat(userId); }
  @Post('direct')
  direct(@CurrentUser() user: AuthUser, @Body() dto: DirectDto) { return this.chat.openDirect(user, dto.targetId); }
  @Post('group')
  group(@CurrentUser() user: AuthUser, @Body() dto: GroupDto) { return this.chat.createGroup(user, dto); }
  @Get('threads/:id/messages')
  messages(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('since') since?: string) { return this.chat.messages(user, id, since); }
  @Post('threads/:id/messages')
  send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendDto) { return this.chat.send(user, id, dto); }
  @Post('threads/:id/read')
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.chat.markRead(user, id); }
  @Post('upload-url')
  uploadUrl(@CurrentUser('id') userId: string, @Body() dto: UploadUrlDto) { return this.chat.uploadUrl(userId, dto.kind, dto.ext); }
}

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
