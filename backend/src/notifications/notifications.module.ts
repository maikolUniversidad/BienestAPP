import { Body, Controller, Get, Global, Injectable, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Emite una notificación a un usuario. Fire-and-forget seguro (nunca rompe el flujo). */
  async notify(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          body: params.body,
          data: params.data as object,
        },
      });
    } catch {
      return null;
    }
  }

  list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { success: true };
  }
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.svc.list(userId);
  }
  @Get('unread-count')
  async unread(@CurrentUser('id') userId: string) {
    return { count: await this.svc.unreadCount(userId) };
  }
  @Patch(':id/read')
  read(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.svc.markRead(userId, id);
  }
  @Post('read-all')
  readAll(@CurrentUser('id') userId: string) {
    return this.svc.markAllRead(userId);
  }
}

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
