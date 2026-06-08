import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

class CreateHabitDto {
  @IsString() name: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsInt() target?: number;
}

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.habit.findMany({ where: { userId, active: true } });
  }
  create(userId: string, dto: CreateHabitDto) {
    return this.prisma.habit.create({
      data: { userId, name: dto.name, icon: dto.icon, target: dto.target ?? 1 },
    });
  }
  update(userId: string, id: string, dto: CreateHabitDto) {
    return this.prisma.habit.updateMany({ where: { id, userId }, data: dto });
  }
  remove(userId: string, id: string) {
    return this.prisma.habit.updateMany({ where: { id, userId }, data: { active: false } });
  }

  /** Marca cumplimiento → incrementa racha y refuerza positivamente la mascota. */
  async logCompletion(userId: string, id: string) {
    const habit = await this.prisma.habit.findFirst({ where: { id, userId } });
    if (!habit) return { error: 'Hábito no encontrado' };

    await this.prisma.habitLog.create({ data: { habitId: id, completed: true } });
    const updated = await this.prisma.habit.update({
      where: { id },
      data: { streak: { increment: 1 } },
    });

    // Refuerzo positivo de la mascota (sin manipulación: solo sube felicidad gradualmente).
    await this.prisma.virtualPet.updateMany({
      where: { userId },
      data: { happiness: { increment: 2 } },
    });

    // Otorga carta de logro a hitos de racha (7, 30...).
    await this.maybeAwardStreakCard(userId, updated.streak);

    return { streak: updated.streak };
  }

  private async maybeAwardStreakCard(userId: string, streak: number) {
    const milestones: Record<number, string> = {
      7: 'STREAK_7',
      30: 'STREAK_30',
      100: 'STREAK_100',
    };
    const code = milestones[streak];
    if (!code) return;
    const card = await this.prisma.achievementCard.findUnique({ where: { code } });
    if (!card) return;
    await this.prisma.userAchievementCard.upsert({
      where: { userId_cardId: { userId, cardId: card.id } },
      update: {},
      create: { userId, cardId: card.id },
    });
  }
}

@ApiTags('habits')
@Controller('habits')
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.habits.list(userId);
  }
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateHabitDto) {
    return this.habits.create(userId, dto);
  }
  @Put(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: CreateHabitDto) {
    return this.habits.update(userId, id, dto);
  }
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.habits.remove(userId, id);
  }
  @Post(':id/log')
  log(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.habits.logCompletion(userId, id);
  }
}

@Module({
  controllers: [HabitsController],
  providers: [HabitsService],
})
export class HabitsModule {}
