import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
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

  /** Dashboard de nutrición (profesional): afiliados con su actividad nutricional de 7 días. */
  async proSummary() {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const affiliates = await this.prisma.user.findMany({
      where: { status: 'ACTIVE', roles: { some: { role: { name: RoleName.AFFILIATE } } } },
      select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
      take: 300,
    });
    const rows: any[] = [];
    let totalEntries = 0;
    for (const a of affiliates) {
      const logs = await this.prisma.foodLog.findMany({ where: { userId: a.id, createdAt: { gte: since } }, select: { calories: true } });
      if (logs.length === 0) continue;
      const avg = Math.round(logs.reduce((s, l) => s + (l.calories ?? 0), 0) / logs.length);
      totalEntries += logs.length;
      rows.push({
        userId: a.id,
        name: a.profile ? `${a.profile.firstName} ${a.profile.lastName}` : a.email,
        entries: logs.length,
        avgCalories: avg,
      });
    }
    rows.sort((x, y) => y.entries - x.entries);
    return { patients: rows, totalEntries, activePatients: rows.length };
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

@ApiTags('food-pro')
@Controller('food/pro')
@Roles(RoleName.PSYCHOLOGIST, RoleName.PHYSICIAN, RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
export class FoodProController {
  constructor(private readonly food: FoodService) {}

  @Get('summary')
  summary() {
    return this.food.proSummary();
  }
}

@Module({
  imports: [AiModule],
  controllers: [FoodController, FoodProController],
  providers: [FoodService],
})
export class FoodModule {}
