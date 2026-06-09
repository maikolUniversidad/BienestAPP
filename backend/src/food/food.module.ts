import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationType, RoleName } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';
import { StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.module';

const MEALS = ['desayuno', 'merienda', 'almuerzo', 'onces', 'cena', 'espontanea'];
const MEAL_LABEL: Record<string, string> = { desayuno: 'Desayuno', merienda: 'Merienda', almuerzo: 'Almuerzo', onces: 'Onces', cena: 'Cena', espontanea: 'Comida espontánea' };

class AnalyzeFoodDto {
  @IsString() @MaxLength(600) description: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsIn(MEALS) mealType?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
class AnalyzePhotoDto {
  @IsString() imagePath: string;
  @IsOptional() @IsIn(MEALS) mealType?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
class UploadUrlDto {
  @IsString() ext: string;
}

@Injectable()
export class FoodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AiOrchestratorService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  uploadUrl(userId: string, ext: string) {
    return this.storage.signUpload(userId, 'image', ext);
  }

  /** Registro por descripción de texto. */
  async analyze(userId: string, dto: AnalyzeFoodDto) {
    const est = await this.orchestrator.estimateNutrition(dto.description);
    const log = await this.save(userId, { imageUrl: dto.imageUrl, mealType: dto.mealType, note: dto.note ?? dto.description, est });
    return this.shape(log, est);
  }

  /** Registro inteligente por FOTO: la IA estima calorías y sugiere el tipo de comida. */
  async analyzePhoto(userId: string, dto: AnalyzePhotoDto) {
    const url = (await this.storage.signDownload(dto.imagePath)) ?? dto.imagePath;
    const est = await this.orchestrator.estimateNutritionFromImage(url, { mealType: dto.mealType, note: dto.note });
    const mealType = dto.mealType ?? est.mealTypeGuess ?? this.guessMealByHour();
    const log = await this.save(userId, { imageUrl: dto.imagePath, mealType, note: dto.note, est });
    await this.maybeDailySummary(userId);
    return { ...this.shape(log, est), mealType, vision: est.vision };
  }

  private async save(userId: string, p: { imageUrl?: string; mealType?: string; note?: string; est: any }) {
    return this.prisma.foodLog.create({
      data: {
        userId,
        imageUrl: p.imageUrl,
        mealType: p.mealType,
        note: p.note,
        detectedItems: p.est.items as object,
        calories: p.est.calories ?? undefined,
        macros: (p.est.macros as object) ?? undefined,
        approximate: true,
      },
    });
  }
  private shape(log: any, est: any) {
    return {
      id: log.id, mealType: log.mealType, detectedItems: est.items, calories: est.calories, macros: est.macros,
      approximate: true, disclaimer: 'Valores aproximados generados por IA. No constituyen diagnóstico nutricional.',
    };
  }
  private guessMealByHour(): string {
    const h = new Date().getHours();
    if (h < 10) return 'desayuno';
    if (h < 12) return 'merienda';
    if (h < 15) return 'almuerzo';
    if (h < 18) return 'onces';
    if (h < 22) return 'cena';
    return 'espontanea';
  }

  async list(userId: string) {
    const logs = await this.prisma.foodLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 40 });
    return Promise.all(logs.map(async (l) => ({ ...l, imageSignedUrl: l.imageUrl ? await this.storage.signDownload(l.imageUrl).catch(() => null) : null })));
  }

  /** Resumen del día: total de calorías, desglose por tipo de comida, meta y dato motivador. */
  async dailySummary(userId: string) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const logs = await this.prisma.foodLog.findMany({ where: { userId, createdAt: { gte: dayStart } }, select: { mealType: true, calories: true } });
    const total = logs.reduce((s, l) => s + (l.calories ?? 0), 0);
    const byMeal: Record<string, { count: number; calories: number; label: string }> = {};
    for (const m of MEALS) byMeal[m] = { count: 0, calories: 0, label: MEAL_LABEL[m] };
    for (const l of logs) { const k = l.mealType && byMeal[l.mealType] ? l.mealType : 'espontanea'; byMeal[k].count++; byMeal[k].calories += l.calories ?? 0; }

    const target = await this.prisma.healthTarget.findUnique({ where: { userId_type: { userId, type: 'calories_daily' } } });
    const goal = target?.target ?? null;
    const remaining = goal != null ? Math.round(goal - total) : null;
    const motivator = await this.orchestrator.nutritionMotivator(
      `Hoy: ${total} kcal en ${logs.length} comida(s).${goal ? ` Meta: ${goal} kcal (${remaining! >= 0 ? remaining + ' disponibles' : Math.abs(remaining!) + ' por encima'}).` : ''}`,
    );
    return { date: dayStart, total, entries: logs.length, goal, remaining, byMeal: Object.entries(byMeal).map(([key, v]) => ({ key, ...v })), motivator };
  }

  /** Crea (una vez al día) la notificación de resumen con dato motivador. */
  private async maybeDailySummary(userId: string) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const already = await this.prisma.notification.findFirst({ where: { userId, category: 'nutrition_summary', createdAt: { gte: dayStart } } });
    if (already) return;
    const s = await this.dailySummary(userId);
    if (s.entries < 1) return;
    await this.notifications.notify({
      userId, type: NotificationType.REMINDER, category: 'nutrition_summary',
      title: '🍎 Resumen de tu día',
      body: `${s.total} kcal en ${s.entries} comida(s)${s.goal ? ` · meta ${s.goal} kcal` : ''}. ${s.motivator}`,
      href: '/alimentacion', data: { kind: 'nutrition' },
    });
  }

  async weekly(userId: string) {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const logs = await this.prisma.foodLog.findMany({ where: { userId, createdAt: { gte: since } }, select: { calories: true } });
    const total = logs.reduce((s, l) => s + (l.calories ?? 0), 0);
    return { entries: logs.length, avgCalories: logs.length ? Math.round(total / logs.length) : 0 };
  }

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
      rows.push({ userId: a.id, name: a.profile ? `${a.profile.firstName} ${a.profile.lastName}` : a.email, entries: logs.length, avgCalories: avg });
    }
    rows.sort((x, y) => y.entries - x.entries);
    return { patients: rows, totalEntries, activePatients: rows.length };
  }
}

@ApiTags('food')
@Controller('food')
export class FoodController {
  constructor(private readonly food: FoodService) {}

  @Post('upload-url')
  uploadUrl(@CurrentUser('id') userId: string, @Body() dto: UploadUrlDto) {
    return this.food.uploadUrl(userId, dto.ext);
  }
  @Post('analyze')
  analyze(@CurrentUser('id') userId: string, @Body() dto: AnalyzeFoodDto) {
    return this.food.analyze(userId, dto);
  }
  @Post('analyze-photo')
  analyzePhoto(@CurrentUser('id') userId: string, @Body() dto: AnalyzePhotoDto) {
    return this.food.analyzePhoto(userId, dto);
  }
  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.food.list(userId);
  }
  @Get('daily-summary')
  daily(@CurrentUser('id') userId: string) {
    return this.food.dailySummary(userId);
  }
  @Get('summary/weekly')
  weekly(@CurrentUser('id') userId: string) {
    return this.food.weekly(userId);
  }
}

@ApiTags('food-pro')
@Controller('food/pro')
@Roles(RoleName.NUTRITIONIST, RoleName.PSYCHOLOGIST, RoleName.PHYSICIAN, RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
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
