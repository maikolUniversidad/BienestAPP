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
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';

const TYPES = ['emotional', 'habit', 'physical', 'sleep', 'nutrition', 'other'];
const FREQS = ['daily', 'weekly', 'once'];

class CreateGoalDto {
  @IsString() @MaxLength(120) title: string;
  @IsOptional() @IsIn(TYPES) type?: string;
  @IsOptional() @IsIn(FREQS) frequency?: string;
  @IsOptional() @IsString() targetDate?: string;
}
class UpdateGoalDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
  @IsOptional() @IsIn(['active', 'completed', 'archived']) status?: string;
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId, status: { not: 'archived' } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(userId: string, dto: CreateGoalDto) {
    return this.prisma.goal.create({
      data: {
        userId,
        title: dto.title,
        type: dto.type ?? 'habit',
        frequency: dto.frequency ?? 'daily',
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const before = await this.prisma.goal.findFirst({ where: { id, userId } });
    const status = dto.progress === 100 ? 'completed' : dto.status;
    await this.prisma.goal.updateMany({
      where: { id, userId },
      data: { title: dto.title, progress: dto.progress, status },
    });
    const after = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (after && after.status === 'completed' && before?.status !== 'completed') {
      await this.notifications.notify({
        userId,
        type: 'ACHIEVEMENT',
        title: '🎯 ¡Meta completada!',
        body: `Lograste tu meta "${after.title}". Cada paso cuenta. 🎉`,
        data: { goalId: after.id },
      });
    }
    return after;
  }

  remove(userId: string, id: string) {
    return this.prisma.goal.updateMany({ where: { id, userId }, data: { status: 'archived' } });
  }

  async stats(userId: string) {
    const [active, completed] = await Promise.all([
      this.prisma.goal.count({ where: { userId, status: 'active' } }),
      this.prisma.goal.count({ where: { userId, status: 'completed' } }),
    ]);
    return { active, completed };
  }
}

@ApiTags('goals')
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.goals.list(userId);
  }
  @Get('stats')
  stats(@CurrentUser('id') userId: string) {
    return this.goals.stats(userId);
  }
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGoalDto) {
    return this.goals.create(userId, dto);
  }
  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.goals.update(userId, id, dto);
  }
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.goals.remove(userId, id);
  }
}

@Module({
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
