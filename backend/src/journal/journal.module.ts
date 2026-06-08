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
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';

class CreateJournalDto {
  @IsOptional() @IsString() title?: string;
  @IsString() @MaxLength(8000) body: string;
  @IsOptional() @IsArray() @IsEnum(MoodLabel, { each: true }) tags?: MoodLabel[];
}

@Injectable()
export class JournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AiOrchestratorService,
  ) {}

  list(userId: string) {
    return this.prisma.journalEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, tags: true, sentimentScore: true, createdAt: true },
    });
  }

  getOne(userId: string, id: string) {
    return this.prisma.journalEntry.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async create(userId: string, dto: CreateJournalDto) {
    const entry = await this.prisma.journalEntry.create({
      data: { userId, title: dto.title, body: dto.body, tags: dto.tags ?? [] },
    });
    // Análisis de sentimiento + riesgo. En producción → cola BullMQ.
    // Aquí lo disparamos sin bloquear la respuesta (fire-and-forget seguro).
    this.orchestrator
      .analyzeJournal({ userId, journalEntryId: entry.id, text: dto.body })
      .catch(() => undefined);
    return { id: entry.id, createdAt: entry.createdAt, analyzing: true };
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
