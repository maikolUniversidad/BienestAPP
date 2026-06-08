import { Body, Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const TYPES = ['walk', 'activity', 'sleep', 'water', 'active_break'] as const;

class CreateExerciseDto {
  @IsString() @IsIn(TYPES as unknown as string[]) type: string;
  @IsNumber() value: number;
  @IsString() unit: string; // pasos, minutos, litros, vasos...
}

@Injectable()
export class ExerciseService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.exerciseLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
  }
  create(userId: string, dto: CreateExerciseDto) {
    return this.prisma.exerciseLog.create({ data: { userId, ...dto } });
  }
  async today(userId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const logs = await this.prisma.exerciseLog.findMany({
      where: { userId, createdAt: { gte: start } },
    });
    const sum = (t: string) => logs.filter((l) => l.type === t).reduce((s, l) => s + l.value, 0);
    return {
      steps: sum('walk'),
      activeMinutes: sum('activity') + sum('active_break'),
      sleepHours: sum('sleep'),
      water: sum('water'),
    };
  }
}

@ApiTags('exercise')
@Controller('exercise')
export class ExerciseController {
  constructor(private readonly exercise: ExerciseService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.exercise.list(userId);
  }
  @Get('today')
  today(@CurrentUser('id') userId: string) {
    return this.exercise.today(userId);
  }
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateExerciseDto) {
    return this.exercise.create(userId, dto);
  }
}

@Module({
  controllers: [ExerciseController],
  providers: [ExerciseService],
})
export class ExerciseModule {}
