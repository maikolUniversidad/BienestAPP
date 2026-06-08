import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';

class AnalyzeFoodDto {
  @IsString() @MaxLength(600) description: string; // descripción de la comida
  @IsOptional() @IsString() imageUrl?: string;
}

@Injectable()
export class FoodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AiOrchestratorService,
  ) {}

  /** Analiza la comida con IA y la registra. Valores aproximados, no diagnóstico. */
  async analyze(userId: string, dto: AnalyzeFoodDto) {
    const est = await this.orchestrator.estimateNutrition(dto.description);
    const log = await this.prisma.foodLog.create({
      data: {
        userId,
        imageUrl: dto.imageUrl,
        detectedItems: est.items as object,
        calories: est.calories ?? undefined,
        macros: (est.macros as object) ?? undefined,
        approximate: true,
      },
    });
    return {
      id: log.id,
      detectedItems: est.items,
      calories: est.calories,
      macros: est.macros,
      approximate: true,
      disclaimer: 'Valores aproximados generados por IA. No constituyen diagnóstico nutricional.',
    };
  }

  list(userId: string) {
    return this.prisma.foodLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async weekly(userId: string) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const logs = await this.prisma.foodLog.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { calories: true },
    });
    const total = logs.reduce((s, l) => s + (l.calories ?? 0), 0);
    return { entries: logs.length, avgCalories: logs.length ? Math.round(total / logs.length) : 0 };
  }
}

@ApiTags('food')
@Controller('food')
export class FoodController {
  constructor(private readonly food: FoodService) {}

  @Post('analyze')
  analyze(@CurrentUser('id') userId: string, @Body() dto: AnalyzeFoodDto) {
    return this.food.analyze(userId, dto);
  }
  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.food.list(userId);
  }
  @Get('summary/weekly')
  weekly(@CurrentUser('id') userId: string) {
    return this.food.weekly(userId);
  }
}

@Module({
  imports: [AiModule],
  controllers: [FoodController],
  providers: [FoodService],
})
export class FoodModule {}
