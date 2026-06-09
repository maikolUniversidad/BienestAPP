import { Body, Controller, Get, Injectable, Module, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

class UpdateProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() @MaxLength(280) bio?: string;
  @IsOptional() @IsString() avatarPath?: string;
}
class PreferencesDto {
  @IsObject() preferences: Record<string, unknown>;
}
class AvatarUrlDto {
  @IsIn(['image']) kind: 'image';
  @IsString() ext: string;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async get(userId: string) {
    const p = await this.prisma.affiliateProfile.findUnique({ where: { userId } });
    if (!p) return null;
    const avatarUrl = p.avatarPath ? await this.storage.signDownload(p.avatarPath) : null;
    return { ...p, avatarUrl };
  }
  update(userId: string, dto: UpdateProfileDto) {
    return this.prisma.affiliateProfile.update({ where: { userId }, data: dto });
  }
  setPreferences(userId: string, prefs: Record<string, unknown>) {
    return this.prisma.affiliateProfile.update({ where: { userId }, data: { preferences: prefs as object } });
  }
  avatarUploadUrl(userId: string, ext: string) {
    return this.storage.signUpload(userId, 'image', ext);
  }
  async preferences(userId: string) {
    const p = await this.prisma.affiliateProfile.findUnique({ where: { userId }, select: { preferences: true } });
    return p?.preferences ?? {};
  }
  async activity(userId: string) {
    const [moods, journals, habits, posts] = await Promise.all([
      this.prisma.moodEntry.count({ where: { userId } }),
      this.prisma.journalEntry.count({ where: { userId, deletedAt: null } }),
      this.prisma.habitLog.count({ where: { habit: { userId } } }),
      this.prisma.communityPost.count({ where: { userId } }),
    ]);
    return { moodEntries: moods, journalEntries: journals, habitCompletions: habits, communityPosts: posts };
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
  @Post('avatar-url')
  avatarUrl(@CurrentUser('id') userId: string, @Body() dto: AvatarUrlDto) {
    return this.profile.avatarUploadUrl(userId, dto.ext);
  }
  @Get('preferences')
  getPrefs(@CurrentUser('id') userId: string) {
    return this.profile.preferences(userId);
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
