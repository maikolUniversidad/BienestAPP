import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AchievementsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string) {
    const earned = await this.prisma.userAchievementCard.findMany({
      where: { userId },
      include: { card: true },
      orderBy: { earnedAt: 'desc' },
    });
    const totalCards = await this.prisma.achievementCard.count();
    const level = Math.floor(earned.length / 3) + 1; // nivel de bienestar simple
    return {
      level,
      earned: earned.map((e) => ({ ...e.card, earnedAt: e.earnedAt })),
      progress: `${earned.length}/${totalCards}`,
    };
  }
}

@ApiTags('achievements')
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  get(@CurrentUser('id') userId: string) {
    return this.achievements.forUser(userId);
  }
}

@Module({
  controllers: [AchievementsController],
  providers: [AchievementsService],
})
export class AchievementsModule {}
