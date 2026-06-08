import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Catálogo orientativo (no requiere tabla). Para el selector al agregar medicación.
const CATALOG = [
  { name: 'Sertralina', form: 'tableta', strengths: ['25 mg', '50 mg', '100 mg'] },
  { name: 'Fluoxetina', form: 'cápsula', strengths: ['10 mg', '20 mg'] },
  { name: 'Escitalopram', form: 'tableta', strengths: ['10 mg', '20 mg'] },
  { name: 'Quetiapina', form: 'tableta', strengths: ['25 mg', '50 mg', '100 mg'] },
  { name: 'Clonazepam', form: 'tableta', strengths: ['0.5 mg', '2 mg'] },
  { name: 'Ácido valproico', form: 'tableta', strengths: ['250 mg', '500 mg'] },
  { name: 'Naltrexona', form: 'tableta', strengths: ['50 mg'] },
  { name: 'Vitamina B', form: 'tableta', strengths: ['complejo'] },
];

class CreateItemDto {
  @IsString() @MaxLength(120) name: string;
  @IsString() @MaxLength(60) dose: string;
  @IsOptional() @IsString() route?: string;
  @IsArray() @IsString({ each: true }) schedule: string[]; // ["08:00","20:00"]
  @IsOptional() @IsString() @MaxLength(300) instructions?: string;
}
class UpdateItemDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() dose?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) schedule?: string[];
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
class IntakeDto {
  @IsString() itemId: string;
  @IsString() time: string; // "HH:MM" de la dosis
}

@Injectable()
export class MedicationsService {
  constructor(private readonly prisma: PrismaService) {}

  listItems(userId: string) {
    return this.prisma.medicationItem.findMany({ where: { userId, active: true }, orderBy: { createdAt: 'asc' } });
  }
  createItem(userId: string, dto: CreateItemDto, assignedBy?: string) {
    return this.prisma.medicationItem.create({
      data: {
        userId,
        assignedBy,
        name: dto.name,
        dose: dto.dose,
        route: dto.route ?? 'oral',
        schedule: dto.schedule,
        instructions: dto.instructions,
        startDate: new Date(),
      },
    });
  }
  updateItem(userId: string, id: string, dto: UpdateItemDto) {
    return this.prisma.medicationItem.updateMany({ where: { id, userId }, data: dto });
  }
  removeItem(userId: string, id: string) {
    return this.prisma.medicationItem.updateMany({ where: { id, userId }, data: { active: false } });
  }

  /** Plan de HOY: cada dosis (item × horario) con su estado (tomada/pendiente). */
  async today(userId: string) {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const items = await this.prisma.medicationItem.findMany({ where: { userId, active: true } });
    const intakes = await this.prisma.medicationIntake.findMany({
      where: { userId, scheduledFor: { gte: dayStart } },
    });
    const now = new Date();
    const doses = items.flatMap((it) =>
      (it.schedule ?? []).map((time) => {
        const [h, m] = time.split(':').map(Number);
        const when = new Date(dayStart); when.setHours(h || 0, m || 0, 0, 0);
        const taken = intakes.find((x) => x.itemId === it.id && Math.abs(new Date(x.scheduledFor).getTime() - when.getTime()) < 60000);
        const status = taken ? taken.status : when < now ? 'PENDING_LATE' : 'PENDING';
        return { itemId: it.id, name: it.name, dose: it.dose, route: it.route, instructions: it.instructions, time, status };
      }),
    );
    doses.sort((a, b) => a.time.localeCompare(b.time));
    const total = doses.length;
    const taken = doses.filter((d) => d.status === 'TAKEN' || d.status === 'LATE').length;
    return { doses, taken, total };
  }

  async markIntake(userId: string, dto: IntakeDto) {
    const item = await this.prisma.medicationItem.findFirst({ where: { id: dto.itemId, userId } });
    if (!item) return { error: 'Medicamento no encontrado' };
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const [h, m] = dto.time.split(':').map(Number);
    const scheduledFor = new Date(dayStart); scheduledFor.setHours(h || 0, m || 0, 0, 0);
    const status = new Date() > new Date(scheduledFor.getTime() + 60 * 60000) ? 'LATE' : 'TAKEN';
    // Evita duplicado de la misma dosis del día.
    const existing = await this.prisma.medicationIntake.findFirst({
      where: { userId, itemId: dto.itemId, scheduledFor },
    });
    if (existing) return existing;
    return this.prisma.medicationIntake.create({ data: { itemId: dto.itemId, userId, scheduledFor, status } });
  }

  async history(userId: string) {
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000);
    const intakes = await this.prisma.medicationIntake.findMany({
      where: { userId, scheduledFor: { gte: since } },
      orderBy: { scheduledFor: 'desc' },
      include: { item: { select: { name: true, dose: true } } },
    });
    return intakes.map((i) => ({
      id: i.id, name: i.item.name, dose: i.item.dose, status: i.status,
      scheduledFor: i.scheduledFor, takenAt: i.takenAt,
    }));
  }

  /** Adherencia de los últimos 7 días: tomadas / dosis esperadas. */
  async adherence(userId: string) {
    const items = await this.prisma.medicationItem.findMany({ where: { userId, active: true } });
    const dosesPerDay = items.reduce((s, it) => s + (it.schedule?.length ?? 0), 0);
    const expected = dosesPerDay * 7;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const taken = await this.prisma.medicationIntake.count({
      where: { userId, scheduledFor: { gte: since }, status: { in: ['TAKEN', 'LATE'] } },
    });
    const pct = expected > 0 ? Math.min(100, Math.round((taken / expected) * 100)) : 0;
    return { taken, expected, percent: pct, activeItems: items.length };
  }
}

@ApiTags('medications')
@Controller('medications')
export class MedicationsController {
  constructor(private readonly meds: MedicationsService) {}

  @Public()
  @Get('catalog')
  catalog() {
    return CATALOG;
  }

  @Get('items')
  list(@CurrentUser('id') userId: string) {
    return this.meds.listItems(userId);
  }
  @Post('items')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateItemDto) {
    return this.meds.createItem(userId, dto);
  }
  @Patch('items/:id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.meds.updateItem(userId, id, dto);
  }
  @Delete('items/:id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.meds.removeItem(userId, id);
  }

  @Get('today')
  today(@CurrentUser('id') userId: string) {
    return this.meds.today(userId);
  }
  @Post('intakes')
  mark(@CurrentUser('id') userId: string, @Body() dto: IntakeDto) {
    return this.meds.markIntake(userId, dto);
  }
  @Get('history')
  history(@CurrentUser('id') userId: string) {
    return this.meds.history(userId);
  }
  @Get('adherence')
  adherence(@CurrentUser('id') userId: string) {
    return this.meds.adherence(userId);
  }
}

@Module({
  controllers: [MedicationsController],
  providers: [MedicationsService],
})
export class MedicationsModule {}
