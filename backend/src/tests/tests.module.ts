import { Body, Controller, Get, Injectable, Module, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RiskLevel, RiskSource } from '@prisma/client';
import { IsObject } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';
import { EscalationService, CrisisProtocol } from '../ai/escalation/escalation.service';

class SubmitTestDto {
  @IsObject() answers: Record<string, number>; // { questionId: value }
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

@Module({
  imports: [AiModule],
  controllers: [TestsController],
  providers: [TestsService],
})
export class TestsModule {}
