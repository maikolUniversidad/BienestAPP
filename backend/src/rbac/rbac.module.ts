import { Body, Controller, Get, Injectable, Module, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsBoolean, IsString } from 'class-validator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN = [RoleName.EPS_ADMIN, RoleName.SUPERADMIN];

// Catálogo de módulos con submódulos (jerarquía). moduleKey = ruta sin '/'.
const CATALOG = [
  { key: 'overview', label: 'Resumen', group: 'Panel', subs: [] as string[] },
  { key: 'director', label: 'Dirección', group: 'Panel', subs: [] },
  { key: 'mapa-salud', label: 'Mapa de salud', group: 'Panel', subs: ['Equipo en campo', 'Histórico de atención'] },
  { key: 'clinico', label: 'Clínico', group: 'Asistencial', subs: ['Pacientes', 'Alertas', 'Notas clínicas'] },
  { key: 'gestion-salud', label: 'Gestión Salud (HIS)', group: 'Asistencial', subs: ['Pacientes y HCE', 'Encuentros', 'Contratos EPS', 'FHIR/HL7'] },
  { key: 'hospitalizacion', label: 'Hospitalización y Urgencias', group: 'Asistencial', subs: ['Camas y censo', 'Admisión/Egreso', 'Triage'] },
  { key: 'asistencial', label: 'Diagnósticos y domiciliaria', group: 'Asistencial', subs: ['Ayudas diagnósticas', 'Atención domiciliaria'] },
  { key: 'campo', label: 'Atención de campo', group: 'Asistencial', subs: ['Estado/Ubicación', 'Visitas'] },
  { key: 'medicamentos', label: 'Medicación', group: 'Asistencial', subs: [] },
  { key: 'nutricion', label: 'Nutrición', group: 'Asistencial', subs: [] },
  { key: 'facturacion', label: 'Facturación y RIPS', group: 'Administrativo', subs: ['Cuentas', 'RIPS 2275', 'Glosas', 'Cartera', 'Pagos'] },
  { key: 'inventario', label: 'Inventario', group: 'Administrativo', subs: ['Ítems', 'Movimientos', 'Alertas'] },
  { key: 'reportes', label: 'Reportes', group: 'Administrativo', subs: ['Producción', 'Reingresos', 'Oportunidad', 'PYP'] },
  { key: 'callcenter', label: 'Call Center', group: 'Atención', subs: ['Cola', 'Caso 360', 'Despacho', 'Mensajería'] },
  { key: 'agenda', label: 'Agenda y videollamadas', group: 'Atención', subs: [] },
  { key: 'chat', label: 'Chat del equipo', group: 'Atención', subs: [] },
  { key: 'mensajes', label: 'Mensajería (CRM)', group: 'Atención', subs: ['Plantillas', 'Envío'] },
  { key: 'alerts', label: 'Alertas de riesgo', group: 'Atención', subs: [] },
  { key: 'usuarios', label: 'Usuarios', group: 'Gestión', subs: [] },
  { key: 'roles-acceso', label: 'Roles y accesos', group: 'Gestión', subs: [] },
  { key: 'encuestas', label: 'Encuestas', group: 'Gestión', subs: [] },
  { key: 'comunidad-admin', label: 'Comunidad', group: 'Gestión', subs: [] },
  { key: 'pqrs-gestion', label: 'PQRS', group: 'Gestión', subs: [] },
  { key: 'conocimiento', label: 'Base de conocimiento IA', group: 'Gestión', subs: [] },
  { key: 'notificaciones-admin', label: 'Notificaciones', group: 'Gestión', subs: ['Categorías', 'Comunicados'] },
  { key: 'documentos-admin', label: 'Gestión documental', group: 'Gestión', subs: ['IPS', 'Plantillas', 'Control de firmas'] },
  { key: 'audit', label: 'Auditoría', group: 'Sistema', subs: [] },
  { key: 'admin-ti', label: 'Admin TI', group: 'Sistema', subs: [] },
];

const ROLE_LABEL: Record<string, string> = {
  AFFILIATE: 'Afiliado', CALLCENTER_OPERATOR: 'Call center', PSYCHOLOGIST: 'Psicólogo', PHYSICIAN: 'Médico',
  NUTRITIONIST: 'Nutricionista', NURSE: 'Enfermería', SOCIAL_WORKER: 'Trabajo social', FIELD_DOCTOR: 'Médico out-door',
  EPS_ADMIN: 'Administrador', SUPERADMIN: 'Superadmin', AUDITOR: 'Auditor',
};

class ToggleDto {
  @IsString() roleName: string;
  @IsString() moduleKey: string;
  @IsBoolean() enabled: boolean;
}

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  catalog() {
    return { modules: CATALOG, roles: Object.values(RoleName).map((r) => ({ name: r, label: ROLE_LABEL[r] ?? r })) };
  }

  /** Matriz: por rol, las claves de módulo/submódulo deshabilitadas explícitamente. */
  async matrix() {
    const rows = await this.prisma.roleModuleAccess.findMany();
    const disabled: Record<string, string[]> = {};
    for (const r of rows) if (!r.enabled) (disabled[r.roleName] = disabled[r.roleName] || []).push(r.moduleKey);
    return disabled;
  }

  toggle(dto: ToggleDto) {
    return this.prisma.roleModuleAccess.upsert({
      where: { roleName_moduleKey: { roleName: dto.roleName, moduleKey: dto.moduleKey } },
      update: { enabled: dto.enabled },
      create: { roleName: dto.roleName, moduleKey: dto.moduleKey, enabled: dto.enabled },
    });
  }

  /** Claves de módulo ocultas para el usuario: deshabilitadas en TODOS sus roles. */
  async myDisabled(user: AuthUser) {
    const roles = user.roles.filter((r) => r !== 'AFFILIATE');
    if (!roles.length) return { disabled: [] as string[] };
    const rows = await this.prisma.roleModuleAccess.findMany({ where: { roleName: { in: roles }, enabled: false } });
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.moduleKey] = (counts[r.moduleKey] || 0) + 1;
    // oculto solo si está deshabilitado en todos los roles del usuario
    const disabled = Object.entries(counts).filter(([, c]) => c >= roles.length).map(([k]) => k);
    return { disabled };
  }
}

@ApiTags('rbac')
@Controller('rbac')
export class RbacController {
  constructor(private readonly svc: RbacService) {}

  @Get('my-disabled')
  myDisabled(@CurrentUser() user: AuthUser) { return this.svc.myDisabled(user); }

  @Roles(...ADMIN)
  @Get('catalog')
  catalog() { return this.svc.catalog(); }
  @Roles(...ADMIN)
  @Get('matrix')
  matrix() { return this.svc.matrix(); }
  @Roles(...ADMIN)
  @Patch()
  toggle(@Body() dto: ToggleDto) { return this.svc.toggle(dto); }
}

@Module({
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
