import { Body, Controller, Get, Injectable, Put } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

class UpdateProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
}
class PreferencesDto {
  @IsObject() preferences: Record<string, unknown>;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  get(userId: string) {
    return this.prisma.affiliateProfile.findUnique({ where: { userId } });
  }
  update(userId: string, dto: UpdateProfileDto) {
    return this.prisma.affiliateProfile.update({ where: { userId }, data: dto });
  }
  setPreferences(userId: string, prefs: Record<string, unknown>) {
    return this.prisma.affiliateProfile.update({
      where: { userId },
      data: { preferences: prefs as object },
    });
  }
  async activity(userId: string) {
    const [moods, journals, habits] = await Promise.all([
      this.prisma.moodEntry.count({ where: { userId } }),
      this.prisma.journalEntry.count({ where: { userId, deletedAt: null } }),
      this.prisma.habitLog.count({ where: { habit: { userId } } }),
    ]);
    return { moodEntries: moods, journalEntries: journals, habitCompletions: habits };
  }
}

@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(@CurrentUser('id') userId: string) {
    return this.profile.get(userId);
  }
  @Put()
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profile.update(userId, dto);
  }
  @Get('preferences')
  async getPrefs(@CurrentUser('id') userId: string) {
    const p = await this.profile.get(userId);
    return p?.preferences ?? {};
  }
  @Put('preferences')
  setPrefs(@CurrentUser('id') userId: string, @Body() dto: PreferencesDto) {
    return this.profile.setPreferences(userId, dto.preferences);
  }
  @Get('activity')
  activity(@CurrentUser('id') userId: string) {
    return this.profile.activity(userId);
  }
}

@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
