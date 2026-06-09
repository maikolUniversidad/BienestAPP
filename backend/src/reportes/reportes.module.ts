import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const REPORT_ROLES = [RoleName.EPS_ADMIN, RoleName.SUPERADMIN, RoleName.AUDITOR];
const PYP_KINDS = ['pyp'];

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  private range(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 90 * 86400000);
    const end = to ? new Date(to) : new Date();
    return { start, end };
  }

  private async names(ids: string[]) {
    const uniq = Array.from(new Set(ids.filter(Boolean)));
    const profs = await this.prisma.affiliateProfile.findMany({ where: { userId: { in: uniq } }, select: { userId: true, firstName: true, lastName: true } });
    const m = new Map(profs.map((p) => [p.userId, `${p.firstName} ${p.lastName}`]));
    return (id: string) => m.get(id) || id;
  }

  /** Informe de producción por profesional (encuentros + citas atendidas). */
  async produccion(from?: string, to?: string) {
    const { start, end } = this.range(from, to);
    const [encs, appts] = await Promise.all([
      this.prisma.encounter.findMany({ where: { startedAt: { gte: start, lte: end } }, select: { professionalId: true, type: true } }),
      this.prisma.appointment.findMany({ where: { scheduledAt: { gte: start, lte: end }, status: { in: ['completed', 'active'] } }, select: { professionalId: true, kind: true } }),
    ]);
    const agg: Record<string, { encuentros: number; citas: number }> = {};
    encs.forEach((e) => { const k = e.professionalId || 'sin_asignar'; agg[k] = agg[k] || { encuentros: 0, citas: 0 }; agg[k].encuentros++; });
    appts.forEach((a) => { const k = a.professionalId || 'sin_asignar'; agg[k] = agg[k] || { encuentros: 0, citas: 0 }; agg[k].citas++; });
    const nameOf = await this.names(Object.keys(agg));
    const rows = Object.entries(agg).map(([id, v]) => ({ professionalId: id, name: id === 'sin_asignar' ? 'Sin asignar' : nameOf(id), ...v, total: v.encuentros + v.citas }))
      .sort((a, b) => b.total - a.total);
    return { from: start, to: end, rows, totalEncuentros: encs.length, totalCitas: appts.length };
  }

  /** Informe de reingresos: pacientes con un nuevo encuentro dentro de 72h y de 30 días. */
  async reingresos(from?: string, to?: string) {
    const { start, end } = this.range(from, to);
    const encs = await this.prisma.encounter.findMany({ where: { startedAt: { gte: start, lte: end } }, orderBy: { startedAt: 'asc' }, select: { userId: true, startedAt: true, type: true } });
    const byUser: Record<string, Date[]> = {};
    encs.forEach((e) => { (byUser[e.userId] = byUser[e.userId] || []).push(new Date(e.startedAt)); });
    let r72 = 0, r30 = 0; const detalle: any[] = [];
    for (const [userId, dates] of Object.entries(byUser)) {
      for (let i = 1; i < dates.length; i++) {
        const h = (dates[i].getTime() - dates[i - 1].getTime()) / 3600000;
        if (h <= 72) r72++; if (h / 24 <= 30) r30++;
        if (h / 24 <= 30) detalle.push({ userId, horas: Math.round(h) });
      }
    }
    const nameOf = await this.names(detalle.map((d) => d.userId));
    return { from: start, to: end, reingresos72h: r72, reingresos30d: r30, totalPacientes: Object.keys(byUser).length, detalle: detalle.slice(0, 100).map((d) => ({ ...d, name: nameOf(d.userId) })) };
  }

  /** Oportunidad de asignación de citas (Res. 1552/2016): días promedio entre solicitud y atención por tipo. */
  async oportunidad(from?: string, to?: string) {
    const { start, end } = this.range(from, to);
    const appts = await this.prisma.appointment.findMany({ where: { createdAt: { gte: start, lte: end } }, select: { kind: true, createdAt: true, scheduledAt: true } });
    const agg: Record<string, { n: number; dias: number }> = {};
    appts.forEach((a) => { const d = (new Date(a.scheduledAt).getTime() - new Date(a.createdAt).getTime()) / 86400000; const k = a.kind; agg[k] = agg[k] || { n: 0, dias: 0 }; agg[k].n++; agg[k].dias += Math.max(0, d); });
    const rows = Object.entries(agg).map(([kind, v]) => ({ kind, citas: v.n, diasPromedio: v.n ? +(v.dias / v.n).toFixed(1) : 0 }));
    return { from: start, to: end, rows };
  }

  /** Resumen PYP (Res. 202/2021): actividades de promoción y prevención. */
  async pyp(from?: string, to?: string) {
    const { start, end } = this.range(from, to);
    const [encs, appts] = await Promise.all([
      this.prisma.encounter.count({ where: { type: { in: PYP_KINDS }, startedAt: { gte: start, lte: end } } }),
      this.prisma.appointment.count({ where: { kind: { in: ['nutrition', 'medical'] }, scheduledAt: { gte: start, lte: end } } }),
    ]);
    const tamizajes = await this.prisma.testResult.count({ where: { createdAt: { gte: start, lte: end } } });
    return { from: start, to: end, actividadesPyp: encs, consultasPreventivas: appts, tamizajesAplicados: tamizajes };
  }

  async overview() {
    const [prod, rein, opo, pyp] = await Promise.all([this.produccion(), this.reingresos(), this.oportunidad(), this.pyp()]);
    return {
      produccion: { especialistas: prod.rows.length, totalEncuentros: prod.totalEncuentros, totalCitas: prod.totalCitas },
      reingresos: { r72: rein.reingresos72h, r30: rein.reingresos30d },
      oportunidad: opo.rows,
      pyp,
    };
  }
}

@ApiTags('reportes')
@Controller('reportes')
@Roles(...REPORT_ROLES)
export class ReportesController {
  constructor(private readonly svc: ReportesService) {}

  @Get('overview')
  overview() { return this.svc.overview(); }
  @Get('produccion')
  produccion(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.produccion(from, to); }
  @Get('reingresos')
  reingresos(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.reingresos(from, to); }
  @Get('oportunidad')
  oportunidad(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.oportunidad(from, to); }
  @Get('pyp')
  pyp(@Query('from') from?: string, @Query('to') to?: string) { return this.svc.pyp(from, to); }
}

@Module({
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
