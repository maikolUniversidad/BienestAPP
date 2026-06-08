import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { ConsentModule } from './consent/consent.module';
import { MoodModule } from './mood/mood.module';
import { JournalModule } from './journal/journal.module';
import { AiModule } from './ai/ai.module';
import { EmergencyModule } from './emergency/emergency.module';
import { CallcenterModule } from './callcenter/callcenter.module';
import { HabitsModule } from './habits/habits.module';
import { PetModule } from './pet/pet.module';
import { AchievementsModule } from './achievements/achievements.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';
import { FoodModule } from './food/food.module';
import { ExerciseModule } from './exercise/exercise.module';
import { TestsModule } from './tests/tests.module';
import { ContentModule } from './content/content.module';
import { GoalsModule } from './goals/goals.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    StorageModule,
    AuthModule,
    ProfileModule,
    ConsentModule,
    MoodModule,
    JournalModule,
    AiModule,
    EmergencyModule,
    CallcenterModule,
    HabitsModule,
    PetModule,
    AchievementsModule,
    DashboardModule,
    AdminModule,
    FoodModule,
    ExerciseModule,
    TestsModule,
    ContentModule,
    GoalsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
