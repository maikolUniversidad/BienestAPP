import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [mood, habits, pet, achievements, recentFood, exercise, openTickets] =
      await Promise.all([
        this.prisma.moodEntry.findFirst({
          where: { userId, createdAt: { gte: todayStart } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.habit.findMany({ where: { userId, active: true } }),
        this.prisma.virtualPet.findUnique({ where: { userId } }),
        this.prisma.userAchievementCard.count({ where: { userId } }),
        this.prisma.foodLog.findFirst({
          where: { userId, createdAt: { gte: todayStart } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.exerciseLog.findMany({
          where: { userId, createdAt: { gte: todayStart } },
        }),
        this.prisma.emergencyTicket.count({
          where: { userId, status: { in: ['NEW', 'IN_PROGRESS'] } },
        }),
      ]);

    const bestStreak = habits.reduce((m, h) => Math.max(m, h.streak), 0);

    return {
      moodToday: mood ? { label: mood.label, intensity: mood.intensity } : null,
      habitStreak: bestStreak,
      foodToday: recentFood ? { calories: recentFood.calories } : null,
      activityToday: exercise.map((e) => ({ type: e.type, value: e.value, unit: e.unit })),
      achievementsCount: achievements,
      pet: pet ? { name: pet.name, level: pet.level, happiness: pet.happiness } : null,
      recommendations: this.recommend(mood?.label),
      alerts:
        openTickets > 0
          ? [{ type: 'EMERGENCY_OPEN', message: 'Tienes un caso de acompañamiento en curso.' }]
          : [],
    };
  }

  private recommend(mood?: string): string[] {
    const base = ['Respiración guiada de 3 minutos', 'Tomar agua', 'Caminar 10 minutos'];
    if (mood === 'ANXIETY' || mood === 'STRESS') {
      return ['Ejercicio de respiración 4-7-8', 'Pausa activa', ...base.slice(2)];
    }
    if (mood === 'SADNESS' || mood === 'TIREDNESS') {
      return ['Escribir en el diario', 'Contacto con alguien de confianza', ...base];
    }
    return base;
  }
}

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary(@CurrentUser('id') userId: string) {
    return this.dashboard.summary(userId);
  }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
