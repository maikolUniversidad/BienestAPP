import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiOrchestratorService, Attachment } from './ai-orchestrator.service';
import { LlmMessage } from './llm/llm.provider';

class AttachmentDto {
  @IsIn(['image', 'audio']) type: 'image' | 'audio';
  @IsString() path: string;
}

class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsArray()
  attachments?: AttachmentDto[];
}

class EphemeralMessageDto {
  @IsOptional() @IsString() @MaxLength(4000) content?: string;
  @IsOptional() @IsArray() history?: { role: 'user' | 'assistant'; content: string }[];
}

class StartConversationDto {
  @IsOptional()
  @IsString()
  title?: string;
}

class UploadUrlDto {
  @IsIn(['image', 'audio']) kind: 'image' | 'audio';
  @IsString() ext: string;
}

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly orchestrator: AiOrchestratorService,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  @Post('upload-url')
  uploadUrl(@CurrentUser('id') userId: string, @Body() dto: UploadUrlDto) {
    return this.storage.signUpload(userId, dto.kind, dto.ext);
  }

  @Post('conversations')
  async start(@CurrentUser('id') userId: string, @Body() dto: StartConversationDto) {
    return this.prisma.aIConversation.create({
      data: { userId, title: dto.title ?? 'Acompañamiento' },
    });
  }

  /** Historial: lista de conversaciones guardadas del usuario, con vista previa. */
  @Get('conversations')
  async list(@CurrentUser('id') userId: string) {
    const convos = await this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, createdAt: true } },
        _count: { select: { messages: true } },
      },
    });
    return convos.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      messageCount: c._count.messages,
      lastMessageAt: c.messages[0]?.createdAt ?? c.createdAt,
      preview: c.messages[0]?.content?.slice(0, 80) ?? '',
    }));
  }

  @Delete('conversations/:id')
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.prisma.aIConversation.deleteMany({ where: { id, userId } });
    return { success: true };
  }

  /** Conversación TEMPORAL / ANÓNIMA: no se guarda. El historial lo mantiene el cliente. */
  @Post('ephemeral/messages')
  async ephemeral(@CurrentUser('id') userId: string, @Body() dto: EphemeralMessageDto) {
    const history: LlmMessage[] = (dto.history ?? []).map((m) => ({
      role: m.role as LlmMessage['role'],
      content: m.content,
    }));
    const reply = await this.orchestrator.handleChatMessage({
      userId,
      conversationId: null, // efímera: no persiste contenido
      history,
      userText: dto.content ?? '',
      attachments: [],
    });
    return {
      message: { role: 'assistant', content: reply.content },
      riskLevel: reply.riskLevel,
      emotionalTheme: reply.emotionalTheme,
      crisisProtocol: reply.crisisProtocol,
    };
  }

  @Get('conversations/:id')
  async getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const convo = await this.prisma.aIConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!convo) return null;
    // Firma los adjuntos para mostrarlos.
    const messages = await Promise.all(
      convo.messages.map(async (m) => ({
        ...m,
        attachments: await this.storage.signAttachments(m.attachments),
      })),
    );
    return { ...convo, messages };
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const convo = await this.prisma.aIConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
    if (!convo) return { error: 'Conversación no encontrada' };

    // Auto-título con el primer mensaje del usuario (historial legible).
    if (convo.messages.length === 0 && dto.content?.trim()) {
      await this.prisma.aIConversation.update({
        where: { id },
        data: { title: dto.content.trim().slice(0, 48) },
      });
    }

    const history: LlmMessage[] = convo.messages.map((m) => ({
      role: m.role as LlmMessage['role'],
      content: m.content,
    }));

    const reply = await this.orchestrator.handleChatMessage({
      userId,
      conversationId: id,
      history,
      userText: dto.content ?? '',
      attachments: (dto.attachments as Attachment[]) ?? [],
    });

    return {
      message: { role: 'assistant', content: reply.content },
      riskLevel: reply.riskLevel,
      emotionalTheme: reply.emotionalTheme,
      crisisProtocol: reply.crisisProtocol,
    };
  }
}
