import { Body, Controller, Delete, Get, Injectable, Module, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const INV_ROLES = [RoleName.EPS_ADMIN, RoleName.SUPERADMIN, RoleName.NURSE, RoleName.PHYSICIAN];
const NEAR_EXPIRY_DAYS = 60;

class ItemDto {
  @IsIn(['medicamento', 'insumo']) kind: string;
  @IsOptional() @IsString() code?: string;
  @IsString() name: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() stock?: number;
  @IsOptional() @IsNumber() reorderLevel?: number;
  @IsOptional() @IsString() lot?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
class MovementDto {
  @IsIn(['in', 'out', 'adjust']) type: string;
  @IsNumber() quantity: number;
  @IsOptional() @IsString() reason?: string;
}

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  private flags(i: any) {
    const lowStock = i.stock <= i.reorderLevel;
    const nearExpiry = !!i.expiryDate && (new Date(i.expiryDate).getTime() - Date.now()) / 86400000 <= NEAR_EXPIRY_DAYS;
    const expired = !!i.expiryDate && new Date(i.expiryDate).getTime() < Date.now();
    return { lowStock, nearExpiry, expired };
  }

  async list(kind?: string, q?: string) {
    const where: any = {};
    if (kind) where.kind = kind;
    if (q && q.trim()) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { code: { contains: q } }];
    const items = await this.prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' }, take: 300 });
    return items.map((i) => ({ ...i, ...this.flags(i) }));
  }

  create(dto: ItemDto) {
    return this.prisma.inventoryItem.create({ data: { ...dto, expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined } });
  }
  update(id: string, dto: ItemDto) {
    return this.prisma.inventoryItem.update({ where: { id }, data: { ...dto, expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined } });
  }
  async remove(id: string) { await this.prisma.inventoryItem.delete({ where: { id } }); return { success: true }; }

  /** Movimiento de inventario (entrada/salida/ajuste) que recalcula el stock. */
  async movement(itemId: string, by: string, dto: MovementDto) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException();
    const stock = dto.type === 'in' ? item.stock + dto.quantity : dto.type === 'out' ? item.stock - dto.quantity : dto.quantity;
    await this.prisma.inventoryMovement.create({ data: { itemId, type: dto.type, quantity: dto.quantity, reason: dto.reason, createdBy: by } });
    return this.prisma.inventoryItem.update({ where: { id: itemId }, data: { stock: Math.max(0, stock) } });
  }

  movements(itemId: string) { return this.prisma.inventoryMovement.findMany({ where: { itemId }, orderBy: { createdAt: 'desc' }, take: 50 }); }

  /** Alertas: bajo stock y próximos a vencer. */
  async alerts() {
    const items = await this.prisma.inventoryItem.findMany({ where: { active: true }, take: 500 });
    const withFlags = items.map((i) => ({ id: i.id, name: i.name, kind: i.kind, stock: i.stock, reorderLevel: i.reorderLevel, expiryDate: i.expiryDate, ...this.flags(i) }));
    return {
      lowStock: withFlags.filter((i) => i.lowStock),
      nearExpiry: withFlags.filter((i) => i.nearExpiry && !i.expired),
      expired: withFlags.filter((i) => i.expired),
    };
  }
}

@ApiTags('inventario')
@Controller('inventario')
@Roles(...INV_ROLES)
export class InventarioController {
  constructor(private readonly svc: InventarioService) {}

  @Get('items')
  list(@Query('kind') kind?: string, @Query('q') q?: string) { return this.svc.list(kind, q); }
  @Post('items')
  create(@Body() dto: ItemDto) { return this.svc.create(dto); }
  @Patch('items/:id')
  update(@Param('id') id: string, @Body() dto: ItemDto) { return this.svc.update(id, dto); }
  @Delete('items/:id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
  @Post('items/:id/movement')
  movement(@Param('id') id: string, @CurrentUser('id') by: string, @Body() dto: MovementDto) { return this.svc.movement(id, by, dto); }
  @Get('items/:id/movements')
  movements(@Param('id') id: string) { return this.svc.movements(id); }
  @Get('alerts')
  alerts() { return this.svc.alerts(); }
}

@Module({
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioModule {}
