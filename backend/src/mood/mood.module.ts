import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MoodLabel } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

class CreateMoodDto {
  @IsEnum(MoodLabel) label: MoodLabel;
  @IsInt() @Min(1) @Max(5) intensity: number;
  @IsOptional() @IsString() note?: string;
}

@Injectable()
export class MoodService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.moodEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });
  }
  create(userId: string, dto: CreateMoodDto) {
    return this.prisma.moodEntry.create({ data: { userId, ...dto } });
  }
}

@ApiTags('mood')
@Controller('mood')
export class MoodController {
  constructor(private readonly mood: MoodService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.mood.list(userId);
  }
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateMoodDto) {
    return this.mood.create(userId, dto);
  }
}

@Module({
  controllers: [MoodController],
  providers: [MoodService],
})
export class MoodModule {}
