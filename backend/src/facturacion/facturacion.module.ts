import { Body, Controller, Delete, Get, Header, Injectable, Module, NotFoundException, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { randomUUID } from 'crypto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { buildRips2275 } from './rips.util';

const BILLING_ROLES = [RoleName.EPS_ADMIN, RoleName.SUPERADMIN];

class LineDto {
  @IsString() kind: string;
  @IsOptional() @IsString() code?: string;
  @IsString() description: string;
  @IsOptional() @IsNumber() quantity?: number;
  @IsOptional() @IsNumber() unitValue?: number;
  @IsOptional() @IsString() cie10?: string;
}
class CreateInvoiceDto {
  @IsString() userId: string;
  @IsOptional() @IsString() encounterId?: string;
  @IsOptional() @IsString() contractId?: string;
  @IsOptional() @IsString() insurerName?: string;
  @IsOptional() @IsArray() lines?: LineDto[];
}
class StatusDto { @IsString() status: string; }
class GlosaDto {
  @IsString() code: string;
  @IsString() description: string;
  @IsOptional() @IsNumber() value?: number;
}
class GlosaUpdateDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() response?: string;
}
class PaymentDto {
  @IsNumber() amount: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reference?: string;
}

@Injectable()
export class FacturacionService {
  constructor(private readonly prisma: PrismaService) {}

  private lineTotal(l: any) { return Math.round((l.quantity ?? 1) * (l.unitValue ?? 0)); }

  /** Crea una factura; si no se pasan líneas, las arma desde el encuentro (consulta + órdenes). */
  async create(userId: string, dto: CreateInvoiceDto) {
    let lines = dto.lines ?? [];
    let cie10: string | undefined;
    if (!lines.length && dto.encounterId) {
      const enc = await this.prisma.encounter.findUnique({ where: { id: dto.encounterId } });
      cie10 = enc?.cie10 ?? undefined;
      const orders = await this.prisma.clinicalOrder.findMany({ where: { encounterId: dto.encounterId } });
      lines = [
        { kind: 'consulta', code: '890201', description: `Consulta — ${enc?.type ?? 'atención'}`, quantity: 1, unitValue: 0, cie10 },
        ...orders.map((o) => ({ kind: o.type === 'medication' ? 'medicamento' : o.type === 'lab' || o.type === 'imaging' || o.type === 'procedure' ? 'procedimiento' : 'otros', code: o.code ?? undefined, description: o.description, quantity: 1, unitValue: 0, cie10 })),
      ];
    }
    const number = `FE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const withTotals = lines.map((l) => ({ kind: l.kind, code: l.code, description: l.description, quantity: l.quantity ?? 1, unitValue: l.unitValue ?? 0, total: this.lineTotal(l), cie10: l.cie10 }));
    const total = withTotals.reduce((s, l) => s + l.total, 0);
    return this.prisma.invoice.create({
      data: {
        number, userId: dto.userId, encounterId: dto.encounterId, contractId: dto.contractId, insurerName: dto.insurerName,
        total, createdBy: userId, lines: { create: withTotals },
      },
      include: { lines: true },
    });
  }

  async list(status?: string, q?: string) {
    const where: any = {};
    if (status) where.status = status;
    const invoices = await this.prisma.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { _count: { select: { glosas: true } } } });
    // nombre del paciente
    const ids = Array.from(new Set(invoices.map((i) => i.userId)));
    const profs = await this.prisma.affiliateProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, firstName: true, lastName: true } });
    const nameMap = new Map(profs.map((p) => [p.userId, `${p.firstName} ${p.lastName}`]));
    let out = invoices.map((i) => ({ ...i, patientName: nameMap.get(i.userId) ?? i.userId, glosaCount: i._count.glosas }));
    if (q && q.trim()) { const t = q.toLowerCase(); out = out.filter((i) => i.number.toLowerCase().includes(t) || (i.patientName || '').toLowerCase().includes(t) || (i.insurerName || '').toLowerCase().includes(t)); }
    return out;
  }

  async get(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, include: { lines: true, glosas: { orderBy: { createdAt: 'desc' } }, payments: { orderBy: { createdAt: 'desc' } } } });
    if (!inv) throw new NotFoundException();
    const prof = await this.prisma.affiliateProfile.findUnique({ where: { userId: inv.userId }, select: { firstName: true, lastName: true, documentNumber: true } });
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return { ...inv, patientName: prof ? `${prof.firstName} ${prof.lastName}` : inv.userId, patientDocument: prof?.documentNumber ?? null, paid, balance: Math.round(inv.total - paid) };
  }

  /** Registra un pago; ajusta el estado a pagada/parcial según el saldo. */
  async addPayment(invoiceId: string, by: string, dto: PaymentDto) {
    const inv = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: { payments: true } });
    if (!inv) throw new NotFoundException();
    await this.prisma.invoicePayment.create({ data: { invoiceId, amount: dto.amount, method: dto.method, reference: dto.reference, createdBy: by } });
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0) + dto.amount;
    const status = paid >= inv.total ? 'paid' : paid > 0 ? 'partial' : inv.status;
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
    return { paid, balance: Math.round(inv.total - paid), status };
  }

  /** Reemplaza las líneas de la factura y recalcula el total (para fijar valores/tarifas). */
  async updateLines(id: string, lines: LineDto[]) {
    const withTotals = (lines ?? []).map((l) => ({ invoiceId: id, kind: l.kind, code: l.code, description: l.description, quantity: l.quantity ?? 1, unitValue: l.unitValue ?? 0, total: this.lineTotal(l), cie10: l.cie10 }));
    const total = withTotals.reduce((s, l) => s + l.total, 0);
    await this.prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });
    if (withTotals.length) await this.prisma.invoiceLine.createMany({ data: withTotals });
    return this.prisma.invoice.update({ where: { id }, data: { total }, include: { lines: true } });
  }

  async setStatus(id: string, status: string) {
    const data: any = { status };
    if (status === 'issued') data.issueDate = new Date();
    if (status === 'radicada') data.radicadoDate = new Date();
    return this.prisma.invoice.update({ where: { id }, data });
  }

  // ───────── RIPS 2275 ─────────
  async rips(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id }, include: { lines: true } });
    if (!inv) throw new NotFoundException();
    const prof = await this.prisma.affiliateProfile.findUnique({ where: { userId: inv.userId }, select: { documentType: true, documentNumber: true, birthDate: true } });
    return buildRips2275({
      invoice: { number: inv.number, issueDate: inv.issueDate ?? inv.createdAt },
      patient: { documentType: prof?.documentType ?? undefined, documentNumber: prof?.documentNumber ?? undefined, birthDate: prof?.birthDate ?? undefined },
      lines: inv.lines.map((l) => ({ kind: l.kind, code: l.code ?? undefined, description: l.description, quantity: l.quantity, unitValue: l.unitValue, total: l.total, cie10: l.cie10 ?? undefined })),
    });
  }

  // ───────── Glosas ─────────
  addGlosa(invoiceId: string, dto: GlosaDto) {
    return this.prisma.glosa.create({ data: { invoiceId, code: dto.code, description: dto.description, value: dto.value ?? 0 } });
  }
  updateGlosa(id: string, dto: GlosaUpdateDto) {
    return this.prisma.glosa.update({ where: { id }, data: { status: dto.status, response: dto.response } });
  }

  // ───────── Cartera (CxC) con edades ─────────
  async cartera() {
    const invoices = await this.prisma.invoice.findMany({ include: { payments: { select: { amount: true } } } });
    const byStatus: Record<string, { count: number; total: number }> = {};
    const byInsurer: Record<string, number> = {};
    const aging = { d0_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
    let pendiente = 0;
    const now = Date.now();
    for (const i of invoices) {
      byStatus[i.status] = byStatus[i.status] || { count: 0, total: 0 };
      byStatus[i.status].count++; byStatus[i.status].total += i.total;
      const paid = i.payments.reduce((s, p) => s + p.amount, 0);
      const saldo = i.total - paid;
      if (saldo > 0 && i.status !== 'paid') {
        pendiente += saldo;
        byInsurer[i.insurerName || 'Sin aseguradora'] = (byInsurer[i.insurerName || 'Sin aseguradora'] || 0) + saldo;
        const ref = i.radicadoDate || i.issueDate || i.createdAt;
        const days = Math.floor((now - new Date(ref).getTime()) / 86400000);
        if (days <= 30) aging.d0_30 += saldo; else if (days <= 60) aging.d31_60 += saldo; else if (days <= 90) aging.d61_90 += saldo; else aging.d90 += saldo;
      }
    }
    const glosasOpen = await this.prisma.glosa.aggregate({ where: { status: { in: ['open', 'answered'] } }, _sum: { value: true }, _count: true });
    return { byStatus, byInsurer, pendiente, aging, glosasAbiertas: { count: glosasOpen._count, value: glosasOpen._sum.value ?? 0 } };
  }
}

@ApiTags('facturacion')
@Controller('facturacion')
@Roles(...BILLING_ROLES)
export class FacturacionController {
  constructor(private readonly svc: FacturacionService) {}

  @Post('invoices')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateInvoiceDto) { return this.svc.create(userId, dto); }
  @Get('invoices')
  list(@Query('status') status?: string, @Query('q') q?: string) { return this.svc.list(status, q); }
  @Get('cartera')
  cartera() { return this.svc.cartera(); }
  @Get('invoices/:id')
  get(@Param('id') id: string) { return this.svc.get(id); }
  @Patch('invoices/:id/status')
  setStatus(@Param('id') id: string, @Body() dto: StatusDto) { return this.svc.setStatus(id, dto.status); }
  @Patch('invoices/:id/lines')
  updateLines(@Param('id') id: string, @Body() dto: { lines: LineDto[] }) { return this.svc.updateLines(id, dto.lines); }
  @Get('invoices/:id/rips')
  @Header('Content-Type', 'application/json; charset=utf-8')
  rips(@Param('id') id: string) { return this.svc.rips(id); }
  @Post('invoices/:id/payments')
  addPayment(@Param('id') id: string, @CurrentUser('id') by: string, @Body() dto: PaymentDto) { return this.svc.addPayment(id, by, dto); }
  @Post('invoices/:id/glosas')
  addGlosa(@Param('id') id: string, @Body() dto: GlosaDto) { return this.svc.addGlosa(id, dto); }
  @Patch('glosas/:id')
  updateGlosa(@Param('id') id: string, @Body() dto: GlosaUpdateDto) { return this.svc.updateGlosa(id, dto); }
}

@Module({
  controllers: [FacturacionController],
  providers: [FacturacionService],
  exports: [FacturacionService],
})
export class FacturacionModule {}
