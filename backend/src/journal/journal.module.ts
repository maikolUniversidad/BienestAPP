import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MoodLabel } from '@prisma/client';
import { IsArray, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';
import { StorageService } from '../storage/storage.service';

class Attachment {
  @IsIn(['image', 'audio']) type: 'image' | 'audio';
  @IsString() path: string;
}

class CreateJournalDto {
  @IsOptional() @IsString() title?: string;
  @IsString() @MaxLength(8000) body: string;
  @IsOptional() @IsArray() @IsEnum(MoodLabel, { each: true }) tags?: MoodLabel[];
  @IsOptional() @IsArray() attachments?: Attachment[];
  @IsOptional() @IsString() @MaxLength(8000) transcription?: string;
}

class UploadUrlDto {
  @IsIn(['image', 'audio']) kind: 'image' | 'audio';
  @IsString() ext: string;
}

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly storage: StorageService,
  ) {}

  uploadUrl(userId: string, kind: 'image' | 'audio', ext: string) {
    return this.storage.signUpload(userId, kind, ext);
  }

  async list(userId: string) {
    const entries = await this.prisma.journalEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, tags: true, sentimentScore: true, attachments: true, createdAt: true },
    });
    return Promise.all(
      entries.map(async (e) => ({ ...e, attachments: await this.storage.signAttachments(e.attachments) })),
    );
  }

  async getOne(userId: string, id: string) {
    const e = await this.prisma.journalEntry.findFirst({ where: { id, userId, deletedAt: null } });
    if (!e) return null;
    return { ...e, attachments: await this.storage.signAttachments(e.attachments) };
  }

  async create(userId: string, dto: CreateJournalDto) {
    const entry = await this.prisma.journalEntry.create({
      data: {
        userId,
        title: dto.title,
        body: dto.body,
        tags: dto.tags ?? [],
        attachments: (dto.attachments as object) ?? undefined,
        transcription: dto.transcription,
      },
    });

    // Análisis de sentimiento + riesgo en segundo plano (no bloquea).
    this.orchestrator
      .analyzeJournal({ userId, journalEntryId: entry.id, text: `${dto.body}\n${dto.transcription ?? ''}` })
      .catch(() => undefined);

    // Mensaje motivacional de la IA (se espera para mostrarlo al usuario).
    const motivation = await this.orchestrator.motivationalMessage(`${dto.body} ${dto.transcription ?? ''}`);

    return { id: entry.id, createdAt: entry.createdAt, analyzing: true, motivation };
  }

  async weeklySummary(userId: string) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const entries = await this.prisma.journalEntry.findMany({
      where: { userId, deletedAt: null, createdAt: { gte: since } },
      select: { sentimentScore: true, tags: true },
    });
    const avg =
      entries.length > 0
        ? entries.reduce((s, e) => s + (e.sentimentScore ?? 0), 0) / entries.length
        : null;
    return { entries: entries.length, avgSentiment: avg, periodDays: 7 };
  }
}

@ApiTags('journal')
@Controller('journal')
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Post('upload-url')
  uploadUrl(@CurrentUser('id') userId: string, @Body() dto: UploadUrlDto) {
    return this.journal.uploadUrl(userId, dto.kind, dto.ext);
  }
  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.journal.list(userId);
  }
  @Get('summary/weekly')
  weekly(@CurrentUser('id') userId: string) {
    return this.journal.weeklySummary(userId);
  }
  @Get(':id')
  getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.journal.getOne(userId, id);
  }
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateJournalDto) {
    return this.journal.create(userId, dto);
  }
}

@Module({
  imports: [AiModule],
  controllers: [JournalController],
  providers: [JournalService],
})
export class JournalModule {}
