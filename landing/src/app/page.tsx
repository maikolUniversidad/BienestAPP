import type { ReactNode } from 'react';
import { Reveal } from './reveal';

const PANEL_URL = 'https://bienest-admin.vercel.app';
const API_URL = 'https://bienest-app.vercel.app';

/* ---------- Logo "El Hilo" ---------- */
function Hilo({ size = 38, sprout = '#5E9B7E' }: { size?: number; sprout?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <path d="M12 60 C28 60 34 60 42 60 C49 60 51 42 59 42 C67 42 69 74 77 74" stroke="#FF7A59" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M77 74 c13 -1 19 -18 12 -33 c-12 5 -17 18 -12 33 z" fill={sprout} />
      <circle cx="12" cy="60" r="5.5" fill="#FF7A59" />
    </svg>
  );
}

/* ---------- Onda "El Hilo" ---------- */
function HiloWave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 200" preserveAspectRatio="none" fill="none" aria-hidden>
      <path d="M-20 130 C120 130 130 50 250 50 C370 50 365 160 480 160 C600 160 600 40 720 40 C830 40 850 110 960 110 C1070 110 1090 50 1220 50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-20 160 C120 160 130 90 250 90 C370 90 365 190 480 190 C600 190 600 80 720 80 C830 80 850 140 960 140 C1070 140 1090 90 1220 90" stroke="#9FD8B0" strokeWidth="1.4" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

/* ---------- Iconos de línea (manual §09) ---------- */
const ICONS: Record<string, ReactNode> = {
  diario: <><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3z" /><path d="M9 8h6M9 12h4" /></>,
  ia: <><circle cx="12" cy="11" r="7" /><path d="M9 11c0-2 6-2 6 0M12 7v1" /><path d="M12 18v3M8 20h8" /></>,
  sos: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  call: <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  food: <path d="M7 4v16M7 9c5 0 5-3 10-3v9c-5 0-5 3-10 3" />,
  habits: <><path d="M3 13c4 0 4-6 8-6s4 6 8 6" /><circle cx="6" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" /><circle cx="18" cy="18" r="1.5" /></>,
  compi: <><ellipse cx="12" cy="13" rx="6" ry="7" /><path d="M12 6c0-2 2-3 4-3 0 2-1 3-4 3z" /><circle cx="10" cy="12" r="1" /><circle cx="14" cy="12" r="1" /></>,
  logros: <path d="M12 3l2.5 5 5.5.8-4 4 1 5.4L12 15l-5 3.2 1-5.4-4-4 5.5-.8z" />,
  tests: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  biblioteca: <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 1 2 2z" />,
  dashboard: <><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M7 21h10M8 9l3 3 5-5" /></>,
  privacidad: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  shield: <path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />,
  doc: <><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></>,
  users: <><path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 19v-2a4 4 0 0 0-3-3.8" /></>,
  layers: <path d="M12 3 2 9l10 6 10-6zM2 15l10 6 10-6" />,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  hospital: <><rect x="4" y="7" width="16" height="14" rx="2" /><path d="M9 7V4h6v3M12 11v6M9 14h6" /></>,
};
function Ico({ k, color }: { k: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[k]}
    </svg>
  );
}

const FEATURES = [
  { k: 'diario', t: 'Diario emocional inteligente', d: 'Registra emociones (texto, foto o voz con transcripción) y recibe análisis de sentimiento con IA, resumen semanal y un mensaje que te acompaña.' },
  { k: 'ia', t: 'Asistente IA seguro', d: 'Acompañamiento conversacional multimodal con límites claros: nunca diagnostica ni prescribe, detecta el tema emocional y deriva a una persona ante señales de riesgo.' },
  { k: 'sos', t: 'Botón SOS', d: 'Emergencia médica, crisis emocional, accidente o violencia. Envía ubicación (con tu permiso) y conecta con el call center.' },
  { k: 'call', t: 'Call center integrado', d: 'Cola priorizada por riesgo, historial autorizado, escalamiento a psicólogo o médico y trazabilidad completa.' },
  { k: 'food', t: 'Alimentación con IA', d: 'Describe tu comida y obtén una estimación aproximada de calorías y macronutrientes. Orientativo, no diagnóstico.' },
  { k: 'habits', t: 'Hábitos saludables', d: 'Caminatas, sueño, agua y pausas activas con metas, rachas y recordatorios. Constancia amable, sin culpa.' },
  { k: 'compi', t: 'Compi, tu compañía', d: 'Una mascota que evoluciona con tus hábitos positivos y te motiva sin presión ni manipulación emocional.' },
  { k: 'logros', t: 'Logros y gamificación', d: 'Cartas coleccionables, insignias, niveles de bienestar y retos individuales y grupales sin exponer datos sensibles.' },
  { k: 'tests', t: 'Tests y evaluaciones', d: 'Chequeos de estrés, sueño y ánimo con lenguaje responsable y escalamiento si el resultado indica riesgo.' },
  { k: 'biblioteca', t: 'Biblioteca de actividades', d: 'Respiración guiada, meditación, pausas activas, gratitud y educación en salud mental.' },
  { k: 'dashboard', t: 'Dashboard de bienestar', d: 'Tu ánimo del día, rachas, alimentación, actividad, logros y alertas preventivas en un solo lugar.' },
  { k: 'privacidad', t: 'Privacidad y control', d: 'Consentimiento informado, control de permisos y separación de datos clínicos, emocionales y operativos.' },
];

const ROLES = ['Afiliado', 'Operador call center', 'Psicólogo', 'Médico', 'Administrador EPS', 'Superadministrador', 'Auditor'];

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <a className="brand-lockup" href="#top"><span className="float"><Hilo size={38} /></span><span className="name">Bienest<span className="app">APP</span></span></a>
          <div className="nav-links">
            <a href="#modulos">Módulos</a>
            <a href="#ia">IA Segura</a>
            <a href="#empresas">Para empresas</a>
            <a href="#seguridad">Seguridad</a>
            <a className="btn btn-primary" href={PANEL_URL} target="_blank" rel="noreferrer">Ingresar</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header id="top" className="hero">
        <div className="aurora" aria-hidden><span className="a1" /><span className="a2" /><span className="a3" /></div>
        <HiloWave className="hero-bg hilo-draw" />
        <div className="container hero-grid">
          <div className="fade-up">
            <span className="eyebrow">Salud mental preventiva · Colombia</span>
            <h1 className="title">El hilo que<br /><em>te acompaña</em></h1>
            <p className="lead">
              Salud mental, hábitos saludables y acompañamiento preventivo en una sola app. Diario emocional,
              asistente con IA responsable, botón SOS y conexión directa con un call center humano — para
              cuidar antes de tratar.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href={PANEL_URL} target="_blank" rel="noreferrer">Ver la app en vivo →</a>
              <a className="btn btn-outline" href="#modulos">Explorar módulos</a>
            </div>
            <div className="hero-trust">
              <div><b>16</b> módulos integrados</div>
              <div><b>7</b> roles del sistema</div>
              <div><b>24/7</b> botón SOS</div>
            </div>
          </div>
          <div className="fade-up float">
            <div className="hero-art"><img src="/hero.png" alt="Persona usando BienestAPP con calma" /></div>
          </div>
        </div>
      </header>

      {/* MISIÓN */}
      <section className="sec">
        <div className="container split">
          <div>
            <span className="kicker">Bienestar preventivo</span>
            <h2 style={{ fontSize: 36, color: 'var(--tinta)', margin: '12px 0 16px' }}>Cuidar antes de tratar</h2>
            <p style={{ color: 'var(--indigo-700)', fontSize: 18 }}>
              BienestAPP acompaña a cada afiliado en su día a día emocional y de hábitos, detecta señales de
              riesgo de forma temprana y conecta con ayuda humana cuando importa — siempre con privacidad y
              lenguaje responsable.
            </p>
            <ul className="safe-list">
              <li><span className="chk">✓</span> Detección temprana de señales de riesgo.</li>
              <li><span className="chk">✓</span> Acompañamiento humano a un toque.</li>
              <li><span className="chk">✓</span> Privacidad y lenguaje responsable.</li>
            </ul>
          </div>
          <Reveal><img src="/hilo-art.png" alt="El Hilo — el trazo continuo del cuidado" style={{ width: '100%', borderRadius: 'var(--radio-l)', boxShadow: 'var(--sombra-l)', display: 'block' }} /></Reveal>
        </div>
      </section>

      {/* MÓDULOS */}
      <section id="modulos" className="sec surface">
        <div className="container">
          <div className="sec-head">
            <span className="kicker">Todo en una app</span>
            <h2>16 módulos que se complementan</h2>
            <p>Desde el diario emocional hasta el call center, cada pieza trabaja junta — unida por El Hilo.</p>
          </div>
          <div className="grid">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 90}>
                <div className="card">
                  <div className="ico"><Ico k={f.k} /></div>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* IA SEGURA */}
      <section id="ia" className="sec dark">
        <div className="container">
          <div className="sec-head">
            <span className="kicker" style={{ color: '#FF9E85' }}>AI Orchestrator</span>
            <h2>IA con guardrails de seguridad</h2>
            <p>Toda interacción de IA pasa por una capa que clasifica el riesgo y protege a la persona.</p>
          </div>
          <div className="split">
            <ul className="safe-list">
              <li><span className="chk">✓</span><span><b>Nunca diagnostica ni prescribe.</b> Es acompañamiento, no atención clínica.</span></li>
              <li><span className="chk">✓</span><span><b>No reemplaza</b> a un psicólogo, médico ni línea de emergencia, y lo dice con claridad.</span></li>
              <li><span className="chk">✓</span><span><b>Detecta el tema emocional</b> y clasifica el riesgo en dos capas que solo escalan.</span></li>
              <li><span className="chk">✓</span><span><b>Degradación segura:</b> si la IA falla, el protocolo de crisis igual se activa.</span></li>
              <li><span className="chk">✓</span><span><b>Trazabilidad total</b> y revisión humana posterior.</span></li>
            </ul>
            <div className="crisis-card">
              <div className="tag">Protocolo de crisis</div>
              <h3 style={{ color: '#fff', margin: '6px 0 14px', fontSize: 22 }}>Cuando se detecta riesgo alto</h3>
              <div className="crisis-step"><span className="crisis-num">1</span><span>Mensaje de contención breve y empático.</span></div>
              <div className="crisis-step"><span className="crisis-num">2</span><span>Líneas de ayuda visibles (Línea 106 / 123).</span></div>
              <div className="crisis-step"><span className="crisis-num">3</span><span>Botón para hablar con el call center.</span></div>
              <div className="crisis-step"><span className="crisis-num">4</span><span>Caso priorizado + notificación según permisos.</span></div>
              <div className="crisis-step"><span className="crisis-num">5</span><span>Marcado para revisión humana obligatoria.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="sec">
        <div className="container">
          <div className="sec-head"><span className="kicker">Así funciona</span><h2>Tu rutina de bienestar, simple</h2></div>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>Regístrate</h3><p>Crea tu perfil, preferencias y contactos de emergencia.</p></div>
            <div className="step"><div className="n">2</div><h3>Registra tu día</h3><p>Ánimo, diario, hábitos, comida y actividad — a tu ritmo.</p></div>
            <div className="step"><div className="n">3</div><h3>Recibe apoyo</h3><p>IA de acompañamiento, recomendaciones y Compi que evoluciona.</p></div>
            <div className="step"><div className="n">4</div><h3>Conecta si lo necesitas</h3><p>Botón SOS y call center humano a un toque.</p></div>
          </div>
        </div>
      </section>

      {/* MASCOTA */}
      <section className="sec mascota">
        <div className="container mascota-band">
          <img className="float" src="/mascota.png" alt="Compi, la mascota de bienestar" />
          <div>
            <span className="kicker">Conoce a Compi</span>
            <h2 style={{ fontSize: 34, color: 'var(--tinta)', margin: '12px 0 14px' }}>Tu compañero de bienestar</h2>
            <p style={{ color: 'var(--indigo-700)', fontSize: 18 }}>
              Compi evoluciona contigo a medida que cumples hábitos saludables y te envía mensajes
              motivacionales medidos. Diseñado para <b>reforzar el bienestar sin culpa ni presión</b>:
              nunca manipula emocionalmente, solo te acompaña a tu ritmo.
            </p>
            <div className="roles" style={{ marginTop: 18 }}>
              <span className="role-chip">Evoluciona con tus hábitos</span>
              <span className="role-chip">Mensajes positivos</span>
              <span className="role-chip">Nunca en modo crisis</span>
            </div>
          </div>
        </div>
      </section>

      {/* EMPRESAS */}
      <section id="empresas" className="sec surface">
        <div className="container split">
          <div>
            <span className="kicker">Para Nueva EPS y empresas</span>
            <h2 style={{ fontSize: 34, color: 'var(--tinta)', margin: '12px 0 14px' }}>Indicadores de bienestar, sin exponer a las personas</h2>
            <p style={{ color: 'var(--indigo-700)', fontSize: 17 }}>
              Un panel administrativo con métricas agregadas y anónimas, gestión de contenidos y campañas,
              operadores de call center y auditoría — todo con control de acceso por rol.
            </p>
            <ul className="safe-list">
              <li><span className="chk">✓</span> Reportes anónimos y agregados (sin PII).</li>
              <li><span className="chk">✓</span> Alertas de riesgo solo para personal autorizado.</li>
              <li><span className="chk">✓</span> Retos grupales de bienestar para equipos.</li>
            </ul>
            <div style={{ marginTop: 24 }}>
              <a className="btn btn-primary" href={PANEL_URL} target="_blank" rel="noreferrer">Abrir panel administrativo →</a>
            </div>
          </div>
          <div className="card" style={{ padding: 30 }}>
            <h3 style={{ fontSize: 16, color: 'var(--gris)', fontWeight: 600, fontFamily: 'Hanken Grotesk' }}>Roles del sistema</h3>
            <div className="roles" style={{ marginTop: 14 }}>
              {ROLES.map((r) => <span className="role-chip" key={r}>{r}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* SEGURIDAD */}
      <section id="seguridad" className="sec">
        <div className="container">
          <div className="sec-head"><span className="kicker">Seguridad y cumplimiento</span><h2>Hecho para datos de salud</h2>
            <p>Privacidad por diseño y cumplimiento con la normativa de protección de datos en Colombia.</p></div>
          <div className="grid">
            {[
              { k: 'shield', t: 'Cifrado en tránsito y reposo', d: 'TLS y cifrado de columnas sensibles. Tus datos viajan y se guardan protegidos.' },
              { k: 'doc', t: 'Habeas Data (Ley 1581)', d: 'Consentimiento informado, finalidad declarada y tus derechos siempre disponibles.' },
              { k: 'users', t: 'Acceso por roles', d: 'RBAC con auditoría append-only de cada acceso a información sensible.' },
              { k: 'layers', t: 'Datos separados', d: 'Información clínica, emocional y operativa en dominios distintos.' },
              { k: 'eye', t: 'Anonimización', d: 'Reportes agregados sin información personal identificable.' },
              { k: 'hospital', t: 'Listo para FHIR/HL7', d: 'Arquitectura preparada para interoperabilidad clínica futura.' },
            ].map((s, i) => (
              <Reveal key={s.k} delay={(i % 3) * 90}>
                <div className="card"><div className="ico"><Ico k={s.k} /></div><h3>{s.t}</h3><p>{s.d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sec">
        <div className="container">
          <div className="cta">
            <div className="aurora" aria-hidden><span className="a1" /><span className="a2" /></div>
            <HiloWave className="hero-bg hilo-draw" />
            <h2>Empieza a cuidar tu bienestar hoy</h2>
            <p>Explora la app en vivo o conéctate con tu equipo de Nueva EPS para activarla.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <a className="btn btn-primary" href={PANEL_URL} target="_blank" rel="noreferrer">Ver app en vivo</a>
              <a className="btn btn-ghost" href={`${API_URL}/docs`} target="_blank" rel="noreferrer">Documentación de la API</a>
            </div>
            <div className="badge-row">
              <span className="badge">⚡ Desplegado en Vercel</span>
              <span className="badge">🗄️ Supabase</span>
              <span className="badge">🤖 IA con guardrails</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="foot-grid">
            <div>
              <div className="brand-lockup"><Hilo size={38} sprout="#9FD8B0" /><span className="name" style={{ color: 'var(--crema)' }}>Bienest<span className="app" style={{ color: '#FF7A59' }}>APP</span></span></div>
              <p style={{ marginTop: 14, maxWidth: 320, color: '#8FA0C0' }}>
                SuperApp de bienestar y salud preventiva. El hilo que te acompaña, día a día.
              </p>
              <div className="endorse">Un servicio de Nueva EPS · Colombia</div>
            </div>
            <div>
              <h4>Producto</h4>
              <a href="#modulos">Módulos</a><a href="#ia">IA Segura</a><a href="#empresas">Para empresas</a><a href="#seguridad">Seguridad</a>
            </div>
            <div>
              <h4>Accesos</h4>
              <a href={PANEL_URL} target="_blank" rel="noreferrer">Panel / Call Center</a>
              <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">API (Swagger)</a>
            </div>
          </div>
          <div className="disclaimer">
            ⚠️ BienestAPP es una herramienta de acompañamiento y prevención. <b>No reemplaza</b> la atención médica,
            psicológica ni los servicios de emergencia. En caso de emergencia, llama a la Línea 123 o a la Línea de
            salud mental 106. · Cuidar antes de tratar. · © {new Date().getFullYear()} BienestAPP.
          </div>
        </div>
      </footer>
    </>
  );
}
