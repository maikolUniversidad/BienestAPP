/** Seed del catálogo de categorías de notificación (jerarquía y parametrización admin).
 *  Ejecutar: npx ts-node prisma/seed-notifications.ts */
import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// level: 1 = alta/crítica, 2 = normal, 3 = informativa.
const CATS: { key: string; label: string; description: string; type: NotificationType; level: number; icon: string; href?: string; broadcastable?: boolean }[] = [
  { key: 'emergency', label: 'Emergencias y SOS', description: 'Solicitudes de ayuda y crisis.', type: NotificationType.CALLCENTER, level: 1, icon: '🚨', href: '/' },
  { key: 'dispatch', label: 'Asistencia despachada', description: 'Ambulancia, visita domiciliaria o telemetría.', type: NotificationType.CALLCENTER, level: 1, icon: '🚑', href: '/' },
  { key: 'risk', label: 'Alertas de riesgo', description: 'Señales de riesgo emocional o clínico.', type: NotificationType.RISK_ALERT, level: 1, icon: '⚠️', href: '/' },
  { key: 'appointment', label: 'Citas y videollamadas', description: 'Recordatorios de citas agendadas.', type: NotificationType.REMINDER, level: 2, icon: '🗓️', href: '/citas' },
  { key: 'medication', label: 'Medicación', description: 'Cambios y recordatorios de medicamentos.', type: NotificationType.REMINDER, level: 2, icon: '💊', href: '/medicacion' },
  { key: 'nutrition_summary', label: 'Resumen de nutrición', description: 'Resumen diario de calorías con dato motivador.', type: NotificationType.REMINDER, level: 3, icon: '🍎', href: '/alimentacion', broadcastable: true },
  { key: 'weight', label: 'Peso y medidas', description: 'Recordatorios de control de peso y medidas.', type: NotificationType.REMINDER, level: 3, icon: '⚖️', href: '/alimentacion', broadcastable: true },
  { key: 'goal_completed', label: 'Metas', description: 'Metas completadas.', type: NotificationType.ACHIEVEMENT, level: 3, icon: '🎯', href: '/metas' },
  { key: 'achievement', label: 'Logros', description: 'Logros y cartas desbloqueadas.', type: NotificationType.ACHIEVEMENT, level: 3, icon: '🏅', href: '/logros' },
  { key: 'pqrs', label: 'PQRS', description: 'Respuestas a peticiones y reclamos.', type: NotificationType.SYSTEM, level: 2, icon: '📨', href: '/pqrs' },
  { key: 'document', label: 'Documentos y firmas', description: 'Documentos por firmar y firmas registradas.', type: NotificationType.SYSTEM, level: 2, icon: '✍️', href: '/documentos' },
  { key: 'broadcast', label: 'Comunicados', description: 'Mensajes y campañas enviadas por el administrador.', type: NotificationType.SYSTEM, level: 3, icon: '📢', href: '/', broadcastable: true },
  { key: 'system', label: 'Sistema', description: 'Avisos generales del sistema.', type: NotificationType.SYSTEM, level: 3, icon: 'ℹ️', broadcastable: true },
];

async function main() {
  for (const c of CATS) {
    await prisma.notificationCategory.upsert({
      where: { key: c.key },
      update: { label: c.label, description: c.description, type: c.type, level: c.level, icon: c.icon, href: c.href, broadcastable: c.broadcastable ?? false },
      create: { key: c.key, label: c.label, description: c.description, type: c.type, level: c.level, icon: c.icon, href: c.href, enabled: true, broadcastable: c.broadcastable ?? false },
    });
  }
  console.log(`Categorías de notificación upsertadas: ${CATS.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
