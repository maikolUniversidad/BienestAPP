import { Body, Controller, Get, Injectable, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.module';

const TYPES = ['peticion', 'queja', 'reclamo', 'sugerencia'];

class CreatePqrsDto {
  @IsIn(TYPES) type: string;
  @IsString() @MaxLength(140) subject: string;
  @IsString() @MaxLength(2000) body: string;
}
class ManagePqrsDto {
  @IsOptional() @IsIn(['new', 'in_progress', 'resolved']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) response?: string;
}

@Injectable()
export class PqrsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  create(userId: string, dto: CreatePqrsDto) {
    return this.prisma.pqrs.create({ data: { userId, type: dto.type, subject: dto.subject, body: dto.body } });
  }
  mine(userId: string) {
    return this.prisma.pqrs.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async all(status?: string) {
    const items = await this.prisma.pqrs.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(items.map((i) => i.userId))] } },
      select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
    });
    const byId = Object.fromEntries(users.map((u) => [u.id, u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email]));
    return items.map((i) => ({ ...i, name: byId[i.userId] ?? 'Usuario' }));
  }

  async manage(id: string, dto: ManagePqrsDto) {
    const p = await this.prisma.pqrs.update({ where: { id }, data: { status: dto.status, response: dto.response } });
    if (dto.response || dto.status === 'resolved') {
      await this.notifications.notify({
        userId: p.userId,
        type: 'SYSTEM',
        title: 'Respuesta a tu PQRS',
        body: `Tu "${p.subject}" fue actualizada a estado: ${p.status}.`,
        data: { pqrsId: p.id },
      });
    }
    return p;
  }
}

@ApiTags('pqrs')
@Controller('pqrs')
export class PqrsController {
  constructor(private readonly pqrs: PqrsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePqrsDto) {
    return this.pqrs.create(userId, dto);
  }
  @Get('mine')
  mine(@CurrentUser('id') userId: string) {
    return this.pqrs.mine(userId);
  }
}

@ApiTags('pqrs-admin')
@Controller('admin/pqrs')
@Roles(RoleName.EPS_ADMIN, RoleName.SUPERADMIN)
export class PqrsAdminController {
  constructor(private readonly pqrs: PqrsService) {}

  @Get()
  all() {
    return this.pqrs.all();
  }
  @Patch(':id')
  manage(@Param('id') id: string, @Body() dto: ManagePqrsDto) {
    return this.pqrs.manage(id, dto);
  }
}

@Module({
  controllers: [PqrsController, PqrsAdminController],
  providers: [PqrsService],
})
export class PqrsModule {}
