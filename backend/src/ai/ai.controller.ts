import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { LlmMessage } from './llm/llm.provider';

class SendMessageDto {
  @IsString()
  @MaxLength(4000)
  content: string;
}

class StartConversationDto {
  @IsOptional()
  @IsString()
  title?: string;
}

@ApiTags('ai')
@Controller('ai/conversations')
export class AiController {
  constructor(
    private readonly orchestrator: AiOrchestratorService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async start(@CurrentUser('id') userId: string, @Body() dto: StartConversationDto) {
    return this.prisma.aIConversation.create({
      data: { userId, title: dto.title ?? 'Acompañamiento' },
    });
  }

  @Get(':id')
  async getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.prisma.aIConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  @Post(':id/messages')
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    const convo = await this.prisma.aIConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
    if (!convo) {
      return { error: 'Conversación no encontrada' };
    }
    const history: LlmMessage[] = convo.messages.map((m) => ({
      role: m.role as LlmMessage['role'],
      content: m.content,
    }));

    const reply = await this.orchestrator.handleChatMessage({
      userId,
      conversationId: id,
      history,
      userText: dto.content,
    });

    return {
      message: { role: 'assistant', content: reply.content },
      riskLevel: reply.riskLevel,
      crisisProtocol: reply.crisisProtocol,
    };
  }
}
