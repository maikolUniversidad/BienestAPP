import { Body, Controller, Delete, Get, Injectable, Module, Param, Post, Put, Query, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import * as F from './fhir.util';

const HIS_ROLES = [
  RoleName.PHYSICIAN, RoleName.PSYCHOLOGIST, RoleName.NURSE, RoleName.NUTRITIONIST,
  RoleName.SOCIAL_WORKER, RoleName.EPS_ADMIN, RoleName.SUPERADMIN,
];

class RecordDto {
  @IsOptional() @IsString() mrn?: string;
  @IsOptional() @IsString() regimen?: string;
  @IsOptional() @IsString() eapb?: string;
  @IsOptional() @IsString() bloodType?: string;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() chronicConditions?: string;
  @IsOptional() @IsString() emergencyNotes?: string;
}
class ContractDto {
  @IsString() insurerName: string;
  @IsOptional() @IsString() epsCode?: string;
  @IsOptional() @IsString() contractNumber?: string;
  @IsOptional() @IsString() modality?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsNumber() ceilingValue?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}
class EncounterDto {
  @IsString() type: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() cie10?: string;
  @IsOptional() @IsString() diagnosis?: string;
  @IsOptional() @IsString() status?: string;
}

@Injectable()
export class GestionService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────── Registro de pacientes ─────────
  async patients(q?: string) {
    const where: any = { roles: { some: { role: { name: RoleName.AFFILIATE } } } };
    if (q && q.trim()) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { profile: { OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { documentNumber: { contains: q } }] } },
      ];
    }
    const users = await this.prisma.user.findMany({ where, select: { id: true, email: true, epsCode: true, profile: { select: { firstName: true, lastName: true, documentNumber: true, phone: true } } }, take: 100 });
    const records = await this.prisma.patientRecord.findMany({ where: { userId: { in: users.map((u) => u.id) } }, select: { userId: true, mrn: true, regimen: true } });
    const recMap = new Map(records.map((r) => [r.userId, r]));
    return users.map((u) => ({
      userId: u.id, name: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email,
      document: u.profile?.documentNumber ?? null, phone: u.profile?.phone ?? null, epsCode: u.epsCode,
      mrn: recMap.get(u.id)?.mrn ?? null, regimen: recMap.get(u.id)?.regimen ?? null,
    }));
  }

  async patient(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, epsCode: true, profile: true } });
    if (!user) return null;
    const [record, encounters, meds, risks, docs] = await Promise.all([
      this.prisma.patientRecord.findUnique({ where: { userId } }),
      this.prisma.encounter.count({ where: { userId } }),
      this.prisma.medicationItem.count({ where: { userId, active: true } }),
      this.prisma.riskAssessment.count({ where: { userId } }),
      this.prisma.signedDocument.count({ where: { userId, status: 'signed' } }),
    ]);
    const eps = user.epsCode ? await this.prisma.eps.findUnique({ where: { code: user.epsCode }, select: { name: true } }) : null;
    return { user, record, epsName: eps?.name ?? null, counts: { encounters, meds, risks, docs } };
  }

  upsertRecord(userId: string, dto: RecordDto) {
    return this.prisma.patientRecord.upsert({ where: { userId }, update: { ...dto }, create: { userId, ...dto } });
  }

  // ───────── Contratos EPS ─────────
  contracts() { return this.prisma.epsContract.findMany({ orderBy: { createdAt: 'desc' } }); }
  createContract(userId: string, dto: ContractDto) {
    return this.prisma.epsContract.create({ data: { ...dto, startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined, createdBy: userId } });
  }
  updateContract(id: string, dto: ContractDto) {
    return this.prisma.epsContract.update({ where: { id }, data: { ...dto, startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined } });
  }
  async deleteContract(id: string) { await this.prisma.epsContract.delete({ where: { id } }); return { success: true }; }

  // ───────── Encuentros (admisiones / atención) ─────────
  encounters(userId: string) { return this.prisma.encounter.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 50 }); }
  createEncounter(userId: string, proId: string, dto: EncounterDto) {
    return this.prisma.encounter.create({ data: { userId, professionalId: proId, type: dto.type, reason: dto.reason, cie10: dto.cie10, diagnosis: dto.diagnosis, status: dto.status || 'open' } });
  }

  // ───────── Interoperabilidad FHIR / HL7 ─────────
  private async gather(userId: string) {
    const [user, record] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, epsCode: true, profile: true } }),
      this.prisma.patientRecord.findUnique({ where: { userId } }),
    ]);
    if (!user) return null;
    const [metrics, moods, risks, appts, encs, meds, docs] = await Promise.all([
      this.prisma.healthMetric.findMany({ where: { userId }, orderBy: { recordedAt: 'desc' }, take: 50 }),
      this.prisma.moodEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.riskAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.appointment.findMany({ where: { affiliateId: userId }, orderBy: { scheduledAt: 'desc' }, take: 30 }),
      this.prisma.encounter.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 30 }),
      this.prisma.medicationItem.findMany({ where: { userId }, take: 50 }),
      this.prisma.signedDocument.findMany({ where: { userId, status: 'signed' }, take: 50 }),
    ]);
    return { user, record, metrics, moods, risks, appts, encs, meds, docs };
  }

  async fhirBundle(userId: string) {
    const d = await this.gather(userId);
    if (!d) return { resourceType: 'OperationOutcome', issue: [{ severity: 'error', diagnostics: 'Paciente no encontrado' }] };
    const p = d.user.profile;
    const patient = F.patientResource({
      userId: d.user.id, documentType: p?.documentType ?? undefined, documentNumber: p?.documentNumber ?? undefined,
      firstName: p?.firstName, lastName: p?.lastName, birthDate: p?.birthDate ?? undefined, phone: p?.phone ?? undefined,
      email: d.user.email, mrn: d.record?.mrn ?? undefined, regimen: d.record?.regimen ?? undefined, eapb: d.record?.eapb ?? d.user.epsCode ?? undefined,
    });
    const entries: any[] = [patient];
    d.metrics.forEach((m) => entries.push(F.observationFromMetric(d.user.id, m)));
    d.moods.forEach((m) => entries.push(F.observationFromMood(d.user.id, m)));
    d.risks.forEach((r) => entries.push(F.conditionResource(d.user.id, { id: `risk-${r.id}`, text: `Riesgo en salud mental: ${r.level}${r.summary ? ' — ' + r.summary : ''}`, date: r.createdAt })));
    if (d.record?.chronicConditions) entries.push(F.conditionResource(d.user.id, { id: `chronic-${d.user.id}`, text: d.record.chronicConditions }));
    d.appts.forEach((a) => entries.push(F.encounterResource(d.user.id, { id: `appt-${a.id}`, type: a.kind === 'medical' ? 'consulta_externa' : a.kind, status: a.status === 'completed' ? 'closed' : a.status, reason: a.reason ?? undefined, startedAt: a.scheduledAt, endedAt: a.endedAt ?? undefined })));
    d.encs.forEach((e) => entries.push(F.encounterResource(d.user.id, { id: `enc-${e.id}`, type: e.type, status: e.status, reason: e.reason ?? undefined, cie10: e.cie10 ?? undefined, startedAt: e.startedAt, endedAt: e.endedAt ?? undefined })));
    d.meds.forEach((m) => entries.push(F.medicationStatementResource(d.user.id, { id: m.id, name: m.name, dose: m.dose, schedule: m.schedule, active: m.active })));
    d.docs.forEach((doc) => entries.push(F.documentReferenceResource(d.user.id, { id: doc.id, title: doc.title, status: doc.status, hash: doc.hash ?? undefined, signedAt: doc.signedAt ?? undefined })));
    const b = F.bundle(entries);
    b.timestamp = new Date().toISOString();
    return b;
  }

  async hl7(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { profile: true } });
    const r = await this.prisma.patientRecord.findUnique({ where: { userId }, select: { mrn: true } });
    const p = u?.profile;
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    return F.hl7Adt({ documentNumber: p?.documentNumber ?? undefined, firstName: p?.firstName, lastName: p?.lastName, birthDate: p?.birthDate ?? undefined, phone: p?.phone ?? undefined, mrn: r?.mrn ?? undefined, nowStamp: stamp });
  }
}

@ApiTags('gestion-salud')
@Controller('gestion')
@Roles(...HIS_ROLES)
export class GestionController {
  constructor(private readonly svc: GestionService) {}

  @Get('patients')
  patients(@Query('q') q?: string) { return this.svc.patients(q); }
  @Get('patients/:userId')
  patient(@Param('userId') userId: string) { return this.svc.patient(userId); }
  @Put('patients/:userId/record')
  upsert(@Param('userId') userId: string, @Body() dto: RecordDto) { return this.svc.upsertRecord(userId, dto); }
  @Get('patients/:userId/encounters')
  encounters(@Param('userId') userId: string) { return this.svc.encounters(userId); }
  @Post('patients/:userId/encounters')
  createEncounter(@Param('userId') userId: string, @CurrentUser('id') proId: string, @Body() dto: EncounterDto) { return this.svc.createEncounter(userId, proId, dto); }

  @Get('contracts')
  contracts() { return this.svc.contracts(); }
  @Post('contracts')
  createContract(@CurrentUser('id') userId: string, @Body() dto: ContractDto) { return this.svc.createContract(userId, dto); }
  @Put('contracts/:id')
  updateContract(@Param('id') id: string, @Body() dto: ContractDto) { return this.svc.updateContract(id, dto); }
  @Delete('contracts/:id')
  deleteContract(@Param('id') id: string) { return this.svc.deleteContract(id); }

  // Interoperabilidad
  @Get('fhir/patient/:userId')
  fhir(@Param('userId') userId: string) { return this.svc.fhirBundle(userId); }
  @Get('fhir/patient/:userId/hl7')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  hl7(@Param('userId') userId: string) { return this.svc.hl7(userId); }
}

@Module({
  controllers: [GestionController],
  providers: [GestionService],
  exports: [GestionService],
})
export class GestionSaludModule {}
