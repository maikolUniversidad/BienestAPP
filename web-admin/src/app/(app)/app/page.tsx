'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Hilo, Ico } from '../../../components/brand';

const MOOD_LABEL: Record<string, string> = {
  ANXIETY: 'Ansiedad', SADNESS: 'Tristeza', STRESS: 'Estrés', ANGER: 'Enojo', TIREDNESS: 'Cansancio',
  GRATITUDE: 'Gratitud', MOTIVATION: 'Motivación', JOY: 'Alegría', CALM: 'Calma', ANGER_: 'Enojo',
};
const REFLECTIONS = [
  'El progreso no es lineal. Algunos días serán más difíciles que otros, y está bien. Lo importante es que estás aquí.',
  'No necesitas ser perfecto. Solo necesitas ser constante. Cada pequeño paso cuenta.',
  'Reconocer cómo te sientes ya es un acto de cuidado. Date crédito por ello.',
  'Hoy es una nueva oportunidad de cuidarte, a tu ritmo y sin prisa.',
];

export default function AffiliateHome() {
  const [d, setD] = useState<any>(null);
  const [content, setContent] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);

  async function load() {
    setD(await api.dashboard().catch(() => null));
    setContent(await api.content().catch(() => []));
    setJournal(await api.journalList().catch(() => []));
  }
  useEffect(() => { load(); }, []);

  async function doHabit(id: string) { await api.logHabit(id).catch(() => undefined); load(); }

  const name = d?.firstName ?? '';
  const days = d?.daysActive ?? 1;
  const streak = d?.habitStreak ?? 0;
  const wb = d?.wellbeingIndex ?? 0;
  const moodLabel = d?.moodToday ? (MOOD_LABEL[d.moodToday.label] ?? d.moodToday.label) : null;
  const reflection = REFLECTIONS[(days - 1) % REFLECTIONS.length];

  // Camino de bienestar (estado real, sin desbloqueos ficticios).
  const journey = [
    { k: 'inicio', label: 'Inicio', done: true, active: false },
    { k: 'diario', label: 'Diario', done: (d?.journalCount ?? 0) > 0, active: (d?.journalCount ?? 0) === 0 },
    { k: 'habits', label: 'Hábitos', done: streak > 0, active: false },
    { k: 'ia', label: 'Asistente', done: (d?.conversationCount ?? 0) > 0, active: false },
    { k: 'logros', label: 'Logros', done: (d?.achievementsCount ?? 0) > 0, active: false },
  ];
  const progress = Math.round((journey.filter((j) => j.done).length / journey.length) * 100);

  const metrics = [
    { label: 'Constancia', val: Math.min(100, streak * 14), color: 'var(--coral)', note: streak > 0 ? `${streak} día(s) en racha` : 'Empieza tu primera racha' },
    { label: 'Autoconocimiento', val: Math.min(100, (d?.journalCount ?? 0) * 10), color: 'var(--salvia)', note: 'Cada registro te ayuda a conocerte' },
    { label: 'Herramientas activas', val: Math.round(((d?.modulesUsed ?? 0) / 6) * 100), color: 'var(--azul)', note: `${d?.modulesUsed ?? 0} de 6 en uso` },
  ];

  return (
    <>
      {/* HERO */}
      <section style={S.hero}>
        <div style={S.heroBlob1} /><div style={S.heroBlob2} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={S.heroTitle}>Hola, {name} 👋</h1>
            <p style={S.heroLead}>Este es tu espacio personal. Un lugar seguro donde avanzas a tu ritmo. No hay prisa — vamos paso a paso, juntos.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <span style={S.heroChip}>📅 Día {days} de tu proceso</span>
              {streak > 0 && <span style={S.heroChip}>🔥 {streak} día(s) de constancia</span>}
              {d?.alerts?.length > 0 && <span style={{ ...S.heroChip, background: 'rgba(200,69,59,.4)' }}>Acompañamiento en curso</span>}
            </div>
          </div>
          <div style={S.heroIcon}><Hilo size={64} sprout="#9FD8B0" /></div>
        </div>
      </section>

      {/* TU MOMENTO ACTUAL */}
      <h2 style={S.h2}>Tu momento actual</h2>
      <div className="grid grid-4" style={{ marginBottom: 26 }}>
        <MiniStat tone="durazno" ic="diario" title="Día del proceso" value={`Día ${days}`} note="Estás construyendo tu camino" />
        <MiniStat tone="azul" ic="ia" title="Ánimo de hoy" value={moodLabel ?? 'Sin registro'} note={moodLabel ? `Intensidad ${d.moodToday.intensity}/5` : 'Regístralo en tu diario'} />
        <MiniStat tone="salvia" ic="habits" title="Bienestar" value={`${wb}/10`} note="Referencia amable, no diagnóstico" />
        <MiniStat tone="coral" ic="logros" title="Constancia" value={`${streak} 🔥`} note="Cada día cuenta" />
      </div>

      {/* PASO DE HOY + ASISTENTE */}
      <div className="grid stack-mobile" style={{ gridTemplateColumns: '1.6fr 1fr', marginBottom: 26 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><h3 style={S.h3}>Tu paso de hoy</h3><p className="muted">Solo necesitas esto ahora. Nada más.</p></div>
            <div style={S.stepStar}>★</div>
          </div>
          <div style={S.stepBox}>
            <div style={S.stepIcon}><Ico k="diario" size={28} color="var(--coral-deep)" /></div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontFamily: 'Fraunces', fontSize: 18, color: 'var(--tinta)', marginBottom: 6 }}>
                {d?.moodToday ? 'Ya registraste tu ánimo hoy ✓' : 'Registra cómo te sientes hoy'}
              </h4>
              <p className="muted" style={{ marginBottom: 12 }}>
                {d?.moodToday ? 'Si quieres, escribe un poco más en tu diario. No hay respuestas correctas.' : 'Tómate unos minutos para escribir sobre tu día. Solo escribe lo que sientes.'}
              </p>
              <Link className="btn btn-primary" href={d?.moodToday ? '/diario' : '/checkin'}>{d?.moodToday ? 'Abrir mi diario' : 'Comenzar ahora'} →</Link>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 14 }}>
            <span className="muted">🕐 5–10 minutos aprox.</span>
            <span style={{ color: 'var(--salvia-deep)', fontWeight: 600 }}>🔓 Privado y seguro</span>
          </div>
        </div>

        <div className="card" style={S.aiCard}>
          <div style={S.aiBlob} />
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={S.aiIcon}><Ico k="ia" size={30} color="#fff" /></div>
            <h3 style={{ fontFamily: 'Fraunces', fontSize: 22, marginBottom: 6 }}>Tu asistente está aquí</h3>
            <p style={{ color: '#CBD4E8', fontSize: 14, marginBottom: 14 }}>Disponible para escucharte sin juzgar, con IA segura.</p>
            <div style={S.aiQuote}>«Te leo. ¿Cómo te sientes con tu proceso hasta ahora?»</div>
            <Link className="btn" href="/asistente" style={{ background: 'var(--card)', color: 'var(--tinta)', width: '100%', justifyContent: 'center', marginTop: 14 }}>Hablar con el asistente</Link>
            <p style={{ color: '#8FA0C0', fontSize: 11, marginTop: 10 }}>🛡️ Conversación privada y confidencial</p>
          </div>
        </div>
      </div>

      {/* CAMINO DE BIENESTAR */}
      <div className="card" style={{ marginBottom: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div><h3 style={S.h3}>Tu camino de bienestar</h3><p className="muted">Cada paso cuenta. Avanzamos juntos, sin apuros.</p></div>
          <div style={{ textAlign: 'right' }}><div className="muted" style={{ fontSize: 13 }}>Progreso</div><div style={{ fontSize: 28, fontWeight: 700, color: 'var(--coral-deep)', fontFamily: 'Fraunces' }}>{progress}%</div></div>
        </div>
        <div className="grid scroll-x-mobile" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
          {journey.map((j) => (
            <div key={j.k} style={{ textAlign: 'center' }}>
              <div style={{ ...S.journeyIcon, background: j.done ? 'var(--salvia)' : j.active ? 'var(--coral)' : 'var(--niebla)', color: j.done || j.active ? '#fff' : 'var(--gris)' }}>
                <Ico k={j.k} size={22} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--tinta)' }}>{j.label}</div>
              <div style={{ fontSize: 11, color: j.done ? 'var(--salvia-deep)' : j.active ? 'var(--coral-deep)' : 'var(--gris)', fontWeight: 600 }}>
                {j.done ? '✓ Hecho' : j.active ? '→ Tu paso' : 'Disponible'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HÁBITOS + MÉTRICAS */}
      <div className="grid grid-2" style={{ marginBottom: 26 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={S.h3}>Hábitos diarios</h3>
            <span style={{ background: 'var(--durazno)', color: 'var(--coral-deep)', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>🔥 {streak} días</span>
          </div>
          <p className="muted" style={{ marginBottom: 14 }}>Pequeñas acciones que construyen grandes cambios.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {(d?.habits ?? []).slice(0, 4).map((h: any) => (
              <div key={h.id} style={S.habitRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...S.habitIcon, background: h.doneToday ? 'var(--salvia)' : 'var(--coral)' }}>{h.doneToday ? '✓' : (h.icon ?? '⭐')}</div>
                  <div><div style={{ fontWeight: 600, color: 'var(--tinta)' }}>{h.name}</div><div className="muted" style={{ fontSize: 12 }}>{h.doneToday ? 'Completado hoy' : 'Pendiente hoy'}</div></div>
                </div>
                {!h.doneToday && <button className="btn btn-primary btn-sm" onClick={() => doHabit(h.id)}>Hacer</button>}
              </div>
            ))}
            {(d?.habits ?? []).length === 0 && <Link className="link" href="/habitos">Crea tu primer hábito →</Link>}
          </div>
        </div>

        <div className="card">
          <h3 style={S.h3}>Tu bienestar en números</h3>
          <p className="muted" style={{ marginBottom: 16 }}>Una mirada simple a tu proceso.</p>
          <div style={{ display: 'grid', gap: 16 }}>
            {metrics.map((m) => (
              <div key={m.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{m.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: m.color }}>{m.val}%</span>
                </div>
                <div style={S.barTrack}><div style={{ height: '100%', width: `${m.val}%`, background: m.color, borderRadius: 999 }} /></div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{m.note}</div>
              </div>
            ))}
          </div>
          <div style={S.wbBox}>
            <div style={{ fontSize: 13, color: 'var(--gris)' }}>Índice de bienestar <span className="muted">(referencia, no te define)</span></div>
            <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--coral-deep)', fontFamily: 'Fraunces' }}>{wb}<span style={{ fontSize: 16, color: 'var(--gris)' }}>/10</span></div>
          </div>
        </div>
      </div>

      {/* AYUDA / CRISIS */}
      <div className="card" style={S.helpCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={S.helpIcon}>💗</div>
            <div>
              <h3 style={{ ...S.h3, color: 'var(--tinta)' }}>¿Necesitas hablar con alguien ahora?</h3>
              <p className="muted" style={{ marginBottom: 12, maxWidth: 520 }}>No estás solo en esto. Si necesitas apoyo inmediato, estamos aquí. Sin juicios, sin presión.</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a className="btn btn-danger btn-sm" href="tel:106">📞 Llamar Línea 106</a>
                <a className="btn btn-ghost btn-sm" href="tel:123">Línea 123</a>
                <Link className="btn btn-ghost btn-sm" href="/asistente">💬 Chat de apoyo</Link>
              </div>
            </div>
          </div>
          <div style={S.crisisLine}><div className="muted" style={{ fontSize: 12 }}>Línea de crisis 24/7</div><div style={{ fontSize: 26, fontWeight: 700, color: 'var(--sos)', fontFamily: 'Fraunces' }}>106</div></div>
        </div>
      </div>

      {/* ACCIONES + ACTIVIDAD + REFLEXIÓN */}
      <div className="grid grid-3" style={{ marginTop: 26, marginBottom: 26 }}>
        <div className="card">
          <h3 style={S.h3}>Acciones rápidas</h3>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            <QuickAction href="/diario" ic="diario" label="Escribir en mi diario" />
            <QuickAction href="/asistente" ic="ia" label="Hablar con el asistente" />
            <QuickAction href="/medicacion" ic="med" label="Mi medicación" />
            <QuickAction href="/habitos" ic="habits" label="Ver mis hábitos" />
            <QuickAction href="/biblioteca" ic="biblioteca" label="Recursos y actividades" />
          </div>
        </div>

        <div className="card">
          <h3 style={S.h3}>Actividad reciente</h3>
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            {d?.moodToday && <Activity ic="ia" color="var(--azul)" title="Registraste tu ánimo" sub="Hoy" />}
            {journal.slice(0, 3).map((j) => (
              <Activity key={j.id} ic="diario" color="var(--coral)" title="Entrada en tu diario" sub={new Date(j.createdAt).toLocaleDateString()} />
            ))}
            {streak > 0 && <Activity ic="logros" color="var(--salvia)" title={`Racha de ${streak} día(s)`} sub="¡Sigue así!" />}
            {!d?.moodToday && journal.length === 0 && streak === 0 && <p className="muted">Tu actividad aparecerá aquí.</p>}
          </div>
        </div>

        <div className="card" style={{ background: 'var(--durazno)', borderColor: 'transparent' }}>
          <div style={{ width: 48, height: 48, background: 'var(--card)', borderRadius: 14, display: 'grid', placeItems: 'center', marginBottom: 12, fontSize: 22 }}>❝</div>
          <h3 style={S.h3}>Pensamiento del día</h3>
          <p style={{ fontStyle: 'italic', color: 'var(--tinta)', lineHeight: 1.6, marginTop: 8 }}>“{reflection}”</p>
        </div>
      </div>

      {/* RECURSOS */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div><h3 style={S.h3}>Recursos para ti</h3><p className="muted">Contenido que puede ayudarte en tu proceso.</p></div>
          <Link className="link" href="/biblioteca">Ver todos →</Link>
        </div>
        <div className="grid grid-4">
          {content.slice(0, 4).map((c) => (
            <Link key={c.id} href="/biblioteca" className="card hover" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ height: 90, background: 'linear-gradient(135deg, #1B2A4A, #27406B)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 30 }}>
                {{ breathing: '🌬️', meditation: '🧘', active_break: '🤸', gratitude: '🙏', education: '📚' }[c.type as string] ?? '🧩'}
              </div>
              <div style={{ padding: 16 }}>
                <span className="badge-soft badge">{c.type}</span>
                <h4 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', margin: '8px 0 4px', fontSize: 16 }}>{c.title}</h4>
                {c.durationMin && <p className="muted" style={{ fontSize: 12 }}>{c.durationMin} min</p>}
              </div>
            </Link>
          ))}
          {content.length === 0 && <p className="muted">Biblioteca en preparación.</p>}
        </div>
      </div>
    </>
  );
}

/* ---------- Subcomponentes ---------- */
function MiniStat({ tone, ic, title, value, note }: { tone: string; ic: string; title: string; value: string; note: string }) {
  const bg: Record<string, string> = { durazno: 'var(--durazno)', azul: '#E7EDF7', salvia: '#E8F1EC', coral: '#FDEAE4' };
  const fg: Record<string, string> = { durazno: 'var(--coral-deep)', azul: 'var(--azul-deep)', salvia: 'var(--salvia-deep)', coral: 'var(--coral-deep)' };
  return (
    <div className="card">
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg[tone], color: fg[tone], display: 'grid', placeItems: 'center', marginBottom: 12 }}><Ico k={ic} size={22} /></div>
      <div className="muted" style={{ fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--tinta)', fontFamily: 'Fraunces', margin: '2px 0' }}>{value}</div>
      <div className="muted" style={{ fontSize: 12 }}>{note}</div>
    </div>
  );
}
function QuickAction({ href, ic, label }: { href: string; ic: string; label: string }) {
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--card)' }}>
      <span style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--secondary)', color: '#fff', display: 'grid', placeItems: 'center' }}><Ico k={ic} size={18} /></span>
      <span style={{ fontWeight: 600, color: 'var(--tinta)' }}>{label}</span>
    </Link>
  );
}
function Activity({ ic, color, title, sub }: { ic: string; color: string; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--niebla)', color, display: 'grid', placeItems: 'center' }}><Ico k={ic} size={17} /></span>
      <div><div style={{ fontWeight: 600, fontSize: 14, color: 'var(--tinta)' }}>{title}</div><div className="muted" style={{ fontSize: 12 }}>{sub}</div></div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  hero: { position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 32, marginBottom: 26, background: 'linear-gradient(135deg, #1B2A4A, #27406B)', color: '#fff' },
  heroBlob1: { position: 'absolute', top: -120, right: -100, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,122,89,.18)' },
  heroBlob2: { position: 'absolute', bottom: -90, left: -70, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.06)' },
  heroTitle: { fontFamily: 'Fraunces', fontSize: 34, fontWeight: 600, marginBottom: 8 },
  heroLead: { color: '#CBD4E8', fontSize: 16, maxWidth: 560, lineHeight: 1.6 },
  heroChip: { background: 'rgba(255,255,255,.15)', padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600 },
  heroIcon: { width: 110, height: 110, background: 'rgba(255,255,255,.12)', borderRadius: 24, display: 'grid', placeItems: 'center', flexShrink: 0 },
  h2: { fontFamily: 'Fraunces', fontSize: 22, color: 'var(--tinta)', margin: '4px 0 14px' },
  h3: { fontFamily: 'Fraunces', fontSize: 19, color: 'var(--tinta)' },
  stepStar: { width: 52, height: 52, borderRadius: 16, background: 'var(--coral)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 22 },
  stepBox: { display: 'flex', gap: 18, alignItems: 'flex-start', background: 'var(--durazno)', borderRadius: 16, padding: 22, margin: '16px 0' },
  stepIcon: { width: 64, height: 64, background: 'var(--card)', borderRadius: 16, display: 'grid', placeItems: 'center', flexShrink: 0 },
  aiCard: { background: 'linear-gradient(150deg, #27406B, #1B2A4A)', color: '#fff', position: 'relative', overflow: 'hidden', border: 0 },
  aiBlob: { position: 'absolute', top: -60, right: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,122,89,.18)' },
  aiIcon: { width: 64, height: 64, background: 'rgba(255,255,255,.15)', borderRadius: 18, display: 'grid', placeItems: 'center', margin: '0 auto 14px' },
  aiQuote: { background: 'rgba(255,255,255,.12)', borderRadius: 14, padding: 14, fontStyle: 'italic', fontSize: 14 },
  journeyIcon: { width: 60, height: 60, borderRadius: 18, display: 'grid', placeItems: 'center', margin: '0 auto 10px' },
  habitRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 14, border: '1px solid var(--line)', background: 'var(--card)' },
  habitIcon: { width: 42, height: 42, borderRadius: 12, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18 },
  barTrack: { height: 10, background: 'var(--niebla)', borderRadius: 999, overflow: 'hidden' },
  wbBox: { marginTop: 18, background: 'var(--durazno)', borderRadius: 16, padding: 18 },
  helpCard: { background: '#FBEAE8', borderColor: 'rgba(200,69,59,.3)' },
  helpIcon: { width: 56, height: 56, background: 'var(--card)', borderRadius: 16, display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0 },
  crisisLine: { background: 'var(--card)', borderRadius: 14, padding: '12px 18px', textAlign: 'center' },
};
