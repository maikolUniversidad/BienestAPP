import { Body, Controller, Get, Injectable, Module, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RiskLevel, RiskSource, RoleName } from '@prisma/client';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';
import { EscalationService, CrisisProtocol } from '../ai/escalation/escalation.service';

class SubmitTestDto {
  @IsObject() answers: Record<string, number>; // { questionId: value }
}

class CreateTestDto {
  @IsString() @MaxLength(120) title: string;
  @IsString() @MaxLength(60) category: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsArray() questions: { id: string; text: string; options: { label: string; value: number }[] }[];
}
class ToggleTestDto {
  @IsBoolean() active: boolean;
}

@Injectable()
export class TestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escalation: EscalationService,
  ) {}

  list() {
    return this.prisma.wellnessTest.findMany({
      where: { active: true },
      select: { id: true, code: true, title: true, description: true, category: true },
    });
  }

  getOne(id: string) {
    return this.prisma.wellnessTest.findUnique({ where: { id } });
  }

  /** Califica de forma ORIENTATIVA (no diagnóstico) y escala si el riesgo es alto. */
  async submit(userId: string, testId: string, answers: Record<string, number>) {
    const test = await this.prisma.wellnessTest.findUnique({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test no encontrado');

    const score = Object.values(answers).reduce((s, v) => s + (Number(v) || 0), 0);
    const scoring = (test.scoring as any) ?? {};
    const bands: { max: number; band: string }[] = scoring.bands ?? [];
    const band = bands.find((b) => score <= b.max)?.band ?? 'atención';

    // Riesgo orientativo según banda (lenguaje responsable, no clínico).
    let riskLevel: RiskLevel = RiskLevel.NONE;
    if (band === 'cuidado') riskLevel = RiskLevel.HIGH;
    else if (band === 'atención') riskLevel = RiskLevel.MEDIUM;

    const result = await this.prisma.testResult.create({
      data: { userId, testId, answers: answers as object, score, band, riskLevel },
    });

    let crisis: CrisisProtocol | null = null;
    if (riskLevel === RiskLevel.HIGH) {
      crisis = await this.escalation.activateCrisis({
        userId,
        level: RiskLevel.HIGH,
        source: RiskSource.TEST,
        ruleMatches: [`test:${test.code}:band:${band}`],
      });
    }

    return {
      id: result.id,
      score,
      band,
      riskLevel,
      message:
        riskLevel === RiskLevel.HIGH
          ? 'Tu resultado sugiere que sería valioso hablar con un profesional. No estás solo/a.'
          : 'Resultado orientativo. Recuerda que no reemplaza una valoración profesional.',
      crisisProtocol: crisis,
      recommendations: this.recommend(band),
    };
  }

  // ─────────────── Constructor (admin) ───────────────

  listAll() {
    return this.prisma.wellnessTest.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, title: true, category: true, active: true, questions: true },
    });
  }

  async createTest(dto: CreateTestDto) {
    const slug = dto.title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '_').slice(0, 28);
    const code = `${slug}_${Date.now().toString(36)}`.slice(0, 40);
    let maxScore = 0;
    for (const q of dto.questions) {
      const vals = (q.options ?? []).map((o) => Number(o.value) || 0);
      maxScore += vals.length ? Math.max(...vals) : 0;
    }
    const scoring = {
      bands: [
        { max: Math.floor(maxScore * 0.33), band: 'estable' },
        { max: Math.floor(maxScore * 0.66), band: 'atención' },
        { max: maxScore, band: 'cuidado' },
      ],
    };
    return this.prisma.wellnessTest.create({
      data: {
        code,
        title: dto.title,
        description: dto.description ?? '',
        category: dto.category,
        questions: dto.questions as object,
        scoring: scoring as object,
        active: true,
      },
    });
  }

  toggleActive(id: string, active: boolean) {
    return this.prisma.wellnessTest.update({ where: { id }, data: { active } });
  }

  private recommend(band: string): string[] {
    if (band === 'cuidado') return ['Conectar con el call center', 'Ejercicio de respiración', 'Contactar a alguien de confianza'];
    if (band === 'atención') return ['Pausa activa', 'Diario de gratitud', 'Rutina de sueño'];
    return ['Mantener tus hábitos saludables', 'Hidratación', 'Caminata diaria'];
  }
}

@ApiTags('tests')
@Controller('tests')
export class TestsController {
  constructor(private readonly tests: TestsService) {}

  @Get()
  list() {
    return this.tests.list();
  }
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.tests.getOne(id);
  }
  @Post(':id/submit')
  submit(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: SubmitTestDto) {
    return this.tests.submit(userId, id, dto.answers);
  }
}

@ApiTags('tests-admin')
@Controller('admin/tests')
@Roles(RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
export class TestsAdminController {
  constructor(private readonly tests: TestsService) {}

  @Get()
  list() {
    return this.tests.listAll();
  }
  @Post()
  create(@Body() dto: CreateTestDto) {
    return this.tests.createTest(dto);
  }
  @Patch(':id')
  toggle(@Param('id') id: string, @Body() dto: ToggleTestDto) {
    return this.tests.toggleActive(id, dto.active);
  }
}

@Module({
  imports: [AiModule],
  controllers: [TestsController, TestsAdminController],
  providers: [TestsService],
})
export class TestsModule {}
