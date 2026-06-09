import { Body, Controller, Get, Global, Injectable, Module, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NotificationType, RoleName } from '@prisma/client';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN = [RoleName.EPS_ADMIN, RoleName.SUPERADMIN];

class CategoryDto {
  @IsString() key: string;
  @IsString() label: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(['REMINDER', 'ACHIEVEMENT', 'RISK_ALERT', 'CALLCENTER', 'SYSTEM']) type?: string;
  @IsOptional() @IsInt() @Min(1) @Max(3) level?: number;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() href?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() broadcastable?: boolean;
}
class CategoryPatchDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(3) level?: number;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() href?: string;
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsBoolean() broadcastable?: boolean;
}
class BroadcastDto {
  @IsOptional() @IsString() category?: string;
  @IsIn(['REMINDER', 'ACHIEVEMENT', 'RISK_ALERT', 'CALLCENTER', 'SYSTEM']) type: string;
  @IsString() title: string;
  @IsString() body: string;
  @IsOptional() @IsString() href?: string;
  @IsIn(['all', 'eps']) audience: string;
  @IsOptional() @IsString() epsCode?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Emite una notificación a un usuario. Respeta la parametrización de la categoría
   *  (si está deshabilitada, no se emite). Fire-and-forget seguro. */
  async notify(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    category?: string;
    href?: string;
    data?: Record<string, unknown>;
  }) {
    try {
      if (params.category) {
        const cat = await this.prisma.notificationCategory.findUnique({ where: { key: params.category } });
        if (cat && !cat.enabled) return null; // categoría silenciada por el administrador
      }
      return await this.prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          category: params.category,
          title: params.title,
          body: params.body,
          href: params.href,
          data: params.data as object,
        },
      });
    } catch {
      return null;
    }
  }

  list(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 40 });
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

  // ───────────── Administración (jerarquía y parametrización) ─────────────
  categories() {
    return this.prisma.notificationCategory.findMany({ orderBy: [{ level: 'asc' }, { label: 'asc' }] });
  }
  createCategory(dto: CategoryDto) {
    return this.prisma.notificationCategory.create({
      data: {
        key: dto.key, label: dto.label, description: dto.description,
        type: (dto.type as NotificationType) ?? NotificationType.SYSTEM,
        level: dto.level ?? 2, icon: dto.icon, href: dto.href,
        enabled: dto.enabled ?? true, broadcastable: dto.broadcastable ?? false,
      },
    });
  }
  updateCategory(key: string, dto: CategoryPatchDto) {
    return this.prisma.notificationCategory.update({ where: { key }, data: { ...dto } });
  }

  /** Resumen para el panel: categorías + conteos recientes (7 días) y no leídas. */
  async adminOverview() {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [categories, recent, grouped, unread] = await Promise.all([
      this.categories(),
      this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, type: true, category: true, title: true, body: true, href: true, read: true, createdAt: true } }),
      this.prisma.notification.groupBy({ by: ['category'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.notification.count({ where: { read: false } }),
    ]);
    const counts: Record<string, number> = {};
    grouped.forEach((g) => { counts[g.category ?? 'sin_categoria'] = g._count._all; });
    return { categories, recent, counts7d: counts, totalUnread: unread };
  }

  /** Emite la misma notificación a un segmento de afiliados. */
  async broadcast(dto: BroadcastDto) {
    const where: any = { status: 'ACTIVE', roles: { some: { role: { name: RoleName.AFFILIATE } } } };
    if (dto.audience === 'eps' && dto.epsCode) where.epsCode = dto.epsCode;
    const users = await this.prisma.user.findMany({ where, select: { id: true }, take: 5000 });
    if (!users.length) return { sent: 0 };
    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id, type: dto.type as NotificationType, category: dto.category,
        title: dto.title, body: dto.body, href: dto.href,
      })),
    });
    return { sent: users.length };
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

  // Administración
  @Roles(...ADMIN)
  @Get('admin/overview')
  overview() {
    return this.svc.adminOverview();
  }
  @Roles(...ADMIN)
  @Get('admin/categories')
  categories() {
    return this.svc.categories();
  }
  @Roles(...ADMIN)
  @Post('admin/categories')
  createCategory(@Body() dto: CategoryDto) {
    return this.svc.createCategory(dto);
  }
  @Roles(...ADMIN)
  @Put('admin/categories/:key')
  updateCategory(@Param('key') key: string, @Body() dto: CategoryPatchDto) {
    return this.svc.updateCategory(key, dto);
  }
  @Roles(...ADMIN)
  @Post('admin/broadcast')
  broadcast(@Body() dto: BroadcastDto) {
    return this.svc.broadcast(dto);
  }
}

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
