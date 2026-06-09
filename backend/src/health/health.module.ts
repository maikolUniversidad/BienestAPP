import { Body, Controller, Get, Injectable, Module, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AiModule } from '../ai/ai.module';
import { AiOrchestratorService } from '../ai/ai-orchestrator.service';

const METRIC_TYPES = ['heart_rate', 'steps', 'sleep', 'calories', 'distance', 'active_minutes', 'hrv', 'spo2', 'weight'];
const PROVIDERS = ['apple_health', 'google_fit', 'health_connect', 'wearable_ble', 'manual'];

class MetricDto {
  @IsIn(METRIC_TYPES) type: string;
  @IsNumber() value: number;
  @IsString() unit: string;
  @IsOptional() @IsString() recordedAt?: string;
}
class IngestDto {
  @IsIn(PROVIDERS) source: string;
  @IsArray() metrics: MetricDto[];
  @IsOptional() @IsString() deviceName?: string;
}
class ConnectDto {
  @IsIn(PROVIDERS) provider: string;
  @IsOptional() @IsString() deviceName?: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: AiOrchestratorService,
  ) {}

  /** Ingesta universal: cualquier fuente (nativa/BLE/Google Fit/manual) empuja métricas aquí. */
  async ingest(userId: string, dto: IngestDto) {
    const rows = (dto.metrics ?? []).slice(0, 2000).map((m) => ({
      userId, type: m.type, value: m.value, unit: m.unit, source: dto.source,
      recordedAt: m.recordedAt ? new Date(m.recordedAt) : new Date(),
    }));
    if (rows.length) await this.prisma.healthMetric.createMany({ data: rows });
    // Marca la conexión como activa y actualiza la última sincronización.
    await this.prisma.healthConnection.upsert({
      where: { userId_provider: { userId, provider: dto.source } },
      update: { status: 'connected', lastSync: new Date(), deviceName: dto.deviceName },
      create: { userId, provider: dto.source, status: 'connected', lastSync: new Date(), deviceName: dto.deviceName },
    });
    return { ingested: rows.length };
  }

  async connect(userId: string, dto: ConnectDto) {
    return this.prisma.healthConnection.upsert({
      where: { userId_provider: { userId, provider: dto.provider } },
      update: { status: 'connected', deviceName: dto.deviceName },
      create: { userId, provider: dto.provider, status: 'connected', deviceName: dto.deviceName },
    });
  }
  async disconnect(userId: string, provider: string) {
    await this.prisma.healthConnection.updateMany({ where: { userId, provider }, data: { status: 'disconnected' } });
    return { success: true };
  }
  connections(userId: string) {
    return this.prisma.healthConnection.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  history(userId: string, type: string) {
    return this.prisma.healthMetric.findMany({
      where: { userId, type }, orderBy: { recordedAt: 'desc' }, take: 100,
    });
  }

  async summary(userId: string) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const latest = async (type: string) =>
      this.prisma.healthMetric.findFirst({ where: { userId, type }, orderBy: { recordedAt: 'desc' } });
    const sumToday = async (type: string) => {
      const rows = await this.prisma.healthMetric.findMany({ where: { userId, type, recordedAt: { gte: dayStart } }, select: { value: true } });
      return rows.reduce((s, r) => s + r.value, 0);
    };
    const [hr, spo2, hrv, weight, sleepLast] = await Promise.all([latest('heart_rate'), latest('spo2'), latest('hrv'), latest('weight'), latest('sleep')]);
    const [steps, calories, active, distance] = await Promise.all([sumToday('steps'), sumToday('calories'), sumToday('active_minutes'), sumToday('distance')]);
    return {
      heartRate: hr ? { value: Math.round(hr.value), at: hr.recordedAt } : null,
      spo2: spo2 ? Math.round(spo2.value) : null,
      hrv: hrv ? Math.round(hrv.value) : null,
      weight: weight ? weight.value : null,
      steps: Math.round(steps),
      calories: Math.round(calories),
      activeMinutes: Math.round(active),
      distanceKm: Math.round(distance * 10) / 10,
      sleepHours: sleepLast ? Math.round(sleepLast.value * 10) / 10 : null,
    };
  }

  /** "Interpreta y gestiona": lectura IA de los datos de salud. */
  async interpret(userId: string) {
    const s = await this.summary(userId);
    const text = [
      s.heartRate ? `Ritmo cardíaco reciente: ${s.heartRate.value} lpm.` : '',
      s.spo2 ? `SpO2: ${s.spo2}%.` : '',
      s.hrv ? `Variabilidad cardíaca: ${s.hrv} ms.` : '',
      `Pasos hoy: ${s.steps}. Minutos activos: ${s.activeMinutes}. Calorías: ${s.calories}. Distancia: ${s.distanceKm} km.`,
      s.sleepHours != null ? `Sueño: ${s.sleepHours} h.` : '',
    ].filter(Boolean).join(' ');
    const interpretation = await this.orchestrator.interpretHealth(text || 'Sin datos suficientes aún.');
    return { summary: s, interpretation };
  }
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Post('metrics')
  ingest(@CurrentUser('id') userId: string, @Body() dto: IngestDto) {
    return this.health.ingest(userId, dto);
  }
  @Get('summary')
  summary(@CurrentUser('id') userId: string) {
    return this.health.summary(userId);
  }
  @Get('metrics')
  history(@CurrentUser('id') userId: string, @Query('type') type: string) {
    return this.health.history(userId, type ?? 'heart_rate');
  }
  @Get('connections')
  connections(@CurrentUser('id') userId: string) {
    return this.health.connections(userId);
  }
  @Post('connect')
  connect(@CurrentUser('id') userId: string, @Body() dto: ConnectDto) {
    return this.health.connect(userId, dto);
  }
  @Post('disconnect')
  disconnect(@CurrentUser('id') userId: string, @Body() dto: ConnectDto) {
    return this.health.disconnect(userId, dto.provider);
  }
  @Get('interpret')
  interpret(@CurrentUser('id') userId: string) {
    return this.health.interpret(userId);
  }
}

@Module({
  imports: [AiModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
