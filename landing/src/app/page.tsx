const PANEL_URL = 'https://bienest-admin.vercel.app';
const API_URL = 'https://bienest-app.vercel.app';

const FEATURES = [
  { ico: '🧠', t: 'Diario emocional inteligente', d: 'Registra emociones y recibe análisis de sentimiento con IA, resumen semanal y recomendaciones de autocuidado.' },
  { ico: '💬', t: 'Asistente psicológico IA seguro', d: 'Acompañamiento conversacional con límites claros: nunca diagnostica ni prescribe, y deriva a un profesional ante señales de riesgo.' },
  { ico: '🆘', t: 'Botón SOS', d: 'Emergencia médica, crisis emocional, accidente o violencia. Envía ubicación (con tu permiso) y conecta con el call center.' },
  { ico: '📞', t: 'Call center integrado', d: 'Cola priorizada por riesgo, historial autorizado, escalamiento a psicólogo o médico y trazabilidad completa.' },
  { ico: '🍎', t: 'Alimentación con IA por foto', d: 'Toma una foto de tu comida y obtén una estimación aproximada de calorías y macronutrientes. Orientativo, no diagnóstico.' },
  { ico: '🏃', t: 'Ejercicio y hábitos', d: 'Caminatas, sueño, agua y pausas activas con metas, rachas, retos y recordatorios inteligentes.' },
  { ico: '🐾', t: 'Mascota virtual de bienestar', d: 'Evoluciona con tus hábitos positivos y te motiva sin presión ni manipulación emocional.' },
  { ico: '🏅', t: 'Logros y gamificación', d: 'Cartas coleccionables, insignias, niveles de bienestar y retos individuales y grupales (sin exponer datos sensibles).' },
  { ico: '📋', t: 'Tests y evaluaciones', d: 'Chequeos de estrés, sueño y estado emocional con lenguaje responsable y escalamiento si el resultado indica riesgo.' },
  { ico: '🧘', t: 'Biblioteca de actividades', d: 'Respiración guiada, meditación, pausas activas, gratitud y educación en salud mental.' },
  { ico: '📊', t: 'Dashboard de bienestar', d: 'Tu ánimo del día, rachas, alimentación, actividad, logros y alertas preventivas en un solo lugar.' },
  { ico: '🔒', t: 'Privacidad y control', d: 'Consentimiento informado, control de permisos y separación de datos clínicos, emocionales y operativos.' },
];

const ROLES = ['Afiliado', 'Operador call center', 'Psicólogo', 'Médico', 'Administrador EPS', 'Superadministrador', 'Auditor'];

export default function Home() {
  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <div className="container nav-inner">
          <a className="brand" href="#top"><img src="/logo.svg" alt="BienestAPP" /></a>
          <div className="nav-links">
            <a href="#modulos">Módulos</a>
            <a href="#ia">IA Segura</a>
            <a href="#empresas">Para empresas</a>
            <a href="#seguridad">Seguridad</a>
            <a className="btn btn-primary" href={PANEL_URL} target="_blank" rel="noreferrer">Ingresar al panel</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header id="top" className="hero">
        <div className="hero-bg" />
        <div className="container hero-grid">
          <div className="fade-up">
            <span className="eyebrow">● SuperApp de Bienestar · Nueva EPS</span>
            <h1 className="title">Tu bienestar,<br /><span className="grad">acompañado por IA</span> segura.</h1>
            <p className="lead">
              Salud mental, hábitos saludables y acompañamiento preventivo en una sola app. Diario emocional,
              asistente con IA responsable, botón SOS y conexión directa con un call center humano — sin
              reemplazar nunca la atención profesional.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary" href={PANEL_URL} target="_blank" rel="noreferrer">Ver el panel en vivo →</a>
              <a className="btn btn-outline" href="#modulos">Explorar módulos</a>
            </div>
            <div className="hero-trust">
              <div><b>16</b> módulos integrados</div>
              <div><b>7</b> roles del sistema</div>
              <div><b>24/7</b> botón SOS</div>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="phone-wrap fade-up">
            <div className="blob" />
            <div className="phone">
              <div className="phone-screen">
                <div className="p-top"><span>9:41</span><span>● ● ●</span></div>
                <div className="p-hi">Hola, Ana 👋</div>
                <div className="p-row">
                  <div className="p-card"><div className="lbl">Ánimo de hoy</div><div className="val">Calma 4/5</div></div>
                  <div className="p-card"><div className="lbl">Racha</div><div className="val">7 días 🔥</div></div>
                </div>
                <div className="p-card"><div className="lbl">Mascota · Compi</div><div className="val">Nivel 2 · 😊 72</div></div>
                <div className="p-card">
                  <div className="lbl">Recomendado para ti</div>
                  <span className="p-pill">Respiración 4-7-8</span>
                  <span className="p-pill">Pausa activa</span>
                  <span className="p-pill">Diario</span>
                </div>
                <div className="p-sos">SOS</div>
                <div className="p-tabs"><span>🏠</span><span>📔</span><span>💬</span><span>🐾</span><span>👤</span></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MISIÓN */}
      <section className="sec">
        <div className="container sec-head">
          <span className="kicker">Bienestar preventivo</span>
          <h2>Cuidar antes de tratar</h2>
          <p>
            BienestAPP acompaña a cada afiliado en su día a día emocional y de hábitos, detecta señales de
            riesgo de forma temprana y conecta con ayuda humana cuando importa — siempre con privacidad y
            lenguaje responsable.
          </p>
        </div>
      </section>

      {/* MÓDULOS */}
      <section id="modulos" className="sec surface">
        <div className="container">
          <div className="sec-head">
            <span className="kicker">Todo en una app</span>
            <h2>16 módulos que se complementan</h2>
            <p>Desde el diario emocional hasta el call center, cada pieza trabaja junta para tu bienestar.</p>
          </div>
          <div className="grid">
            {FEATURES.map((f) => (
              <div className="card" key={f.t}>
                <div className="ico">{f.ico}</div>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IA SEGURA */}
      <section id="ia" className="sec dark">
        <div className="container">
          <div className="sec-head">
            <span className="kicker" style={{ color: '#5FE3C9' }}>AI Orchestrator</span>
            <h2>IA con guardrails de seguridad</h2>
            <p>Toda interacción de IA pasa por una capa de seguridad que clasifica el riesgo y protege a la persona.</p>
          </div>
          <div className="split">
            <ul className="safe-list">
              <li><span className="chk">✓</span><span><b>Nunca diagnostica ni prescribe.</b> Es acompañamiento, no atención clínica.</span></li>
              <li><span className="chk">✓</span><span><b>No reemplaza</b> a un psicólogo, médico ni línea de emergencia, y lo dice con claridad.</span></li>
              <li><span className="chk">✓</span><span><b>Clasificación de riesgo en dos capas:</b> reglas determinísticas + modelo, que solo escala — nunca minimiza.</span></li>
              <li><span className="chk">✓</span><span><b>Degradación segura:</b> si la IA falla, el protocolo de crisis igual se activa.</span></li>
              <li><span className="chk">✓</span><span><b>Trazabilidad total</b> de cada decisión y revisión humana posterior.</span></li>
              <li><span className="chk">✓</span><span><b>Tus datos no entrenan modelos</b> sin tu autorización explícita.</span></li>
            </ul>
            <div className="crisis-card">
              <div className="tag">PROTOCOLO DE CRISIS</div>
              <h3 style={{ color: '#fff', margin: '6px 0 14px', fontSize: 22 }}>Cuando se detecta riesgo alto</h3>
              <div className="crisis-step"><span className="crisis-num">1</span><span>Mensaje de contención breve y empático.</span></div>
              <div className="crisis-step"><span className="crisis-num">2</span><span>Líneas de emergencia visibles (123 / Línea 106).</span></div>
              <div className="crisis-step"><span className="crisis-num">3</span><span>Botón para conectar con el call center.</span></div>
              <div className="crisis-step"><span className="crisis-num">4</span><span>Caso priorizado + notificación según tus permisos.</span></div>
              <div className="crisis-step"><span className="crisis-num">5</span><span>Marcado para revisión humana obligatoria.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="sec">
        <div className="container">
          <div className="sec-head">
            <span className="kicker">Así funciona</span>
            <h2>Tu rutina de bienestar, simple</h2>
          </div>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>Regístrate</h3><p style={{ color: 'var(--muted)' }}>Crea tu perfil y define tus preferencias y contactos de emergencia.</p></div>
            <div className="step"><div className="n">2</div><h3>Registra tu día</h3><p style={{ color: 'var(--muted)' }}>Ánimo, diario, hábitos, comida y actividad — a tu ritmo.</p></div>
            <div className="step"><div className="n">3</div><h3>Recibe apoyo</h3><p style={{ color: 'var(--muted)' }}>IA de acompañamiento, recomendaciones y tu mascota que evoluciona.</p></div>
            <div className="step"><div className="n">4</div><h3>Conecta si lo necesitas</h3><p style={{ color: 'var(--muted)' }}>Botón SOS y call center humano siempre a un toque.</p></div>
          </div>
        </div>
      </section>

      {/* EMPRESAS */}
      <section id="empresas" className="sec surface">
        <div className="container split">
          <div>
            <span className="kicker">Para Nueva EPS y empresas</span>
            <h2 style={{ fontSize: 34, color: 'var(--ink-2)', margin: '10px 0 14px' }}>Indicadores de bienestar, sin exponer a las personas</h2>
            <p style={{ color: 'var(--muted)', fontSize: 17, marginBottom: 20 }}>
              Un panel administrativo con métricas agregadas y anónimas, gestión de contenidos y campañas,
              operadores de call center y auditoría — todo con control de acceso por rol.
            </p>
            <ul className="safe-list" style={{ color: 'var(--ink-2)' }}>
              <li><span className="chk" style={{ color: 'var(--primary)' }}>✓</span> Reportes anónimos y agregados (sin PII).</li>
              <li><span className="chk" style={{ color: 'var(--primary)' }}>✓</span> Alertas de riesgo solo para personal autorizado.</li>
              <li><span className="chk" style={{ color: 'var(--primary)' }}>✓</span> Retos grupales de bienestar para equipos.</li>
            </ul>
            <div style={{ marginTop: 24 }}>
              <a className="btn btn-primary" href={PANEL_URL} target="_blank" rel="noreferrer">Abrir panel administrativo →</a>
            </div>
          </div>
          <div>
            <div className="card" style={{ padding: 30 }}>
              <h3 style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 600 }}>Roles del sistema</h3>
              <div className="roles" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
                {ROLES.map((r) => <span className="role-chip" key={r}>{r}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEGURIDAD */}
      <section id="seguridad" className="sec">
        <div className="container">
          <div className="sec-head">
            <span className="kicker">Seguridad y cumplimiento</span>
            <h2>Hecho para datos de salud</h2>
            <p>Privacidad por diseño y cumplimiento con la normativa de protección de datos en Colombia.</p>
          </div>
          <div className="grid">
            <div className="card"><div className="ico">🛡️</div><h3>Cifrado en tránsito y reposo</h3><p>TLS y cifrado de columnas sensibles. Tus datos viajan y se guardan protegidos.</p></div>
            <div className="card"><div className="ico">📜</div><h3>Habeas Data (Ley 1581)</h3><p>Consentimiento informado, finalidad declarada y tus derechos siempre disponibles.</p></div>
            <div className="card"><div className="ico">👥</div><h3>Acceso por roles</h3><p>RBAC con auditoría append-only de cada acceso a información sensible.</p></div>
            <div className="card"><div className="ico">🗂️</div><h3>Datos separados</h3><p>Información clínica, emocional y operativa en dominios distintos.</p></div>
            <div className="card"><div className="ico">🕵️</div><h3>Anonimización</h3><p>Reportes agregados sin información personal identificable.</p></div>
            <div className="card"><div className="ico">🏥</div><h3>Listo para FHIR/HL7</h3><p>Arquitectura preparada para interoperabilidad clínica futura.</p></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sec">
        <div className="container">
          <div className="cta">
            <h2>Empieza a cuidar tu bienestar hoy</h2>
            <p>Explora el panel en vivo o conéctate con tu equipo de Nueva EPS para activar la app.</p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a className="btn btn-dark" href={PANEL_URL} target="_blank" rel="noreferrer">Ver panel en vivo</a>
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
              <img src="/logo.svg" alt="BienestAPP" style={{ height: 38, filter: 'brightness(0) invert(1)' }} />
              <p style={{ marginTop: 14, maxWidth: 320 }}>
                SuperApp de Bienestar Corporativo y Salud Preventiva para afiliados de Nueva EPS.
                Acompañamiento con IA segura, hábitos y conexión humana.
              </p>
            </div>
            <div>
              <h4>Producto</h4>
              <a href="#modulos">Módulos</a>
              <a href="#ia">IA Segura</a>
              <a href="#empresas">Para empresas</a>
              <a href="#seguridad">Seguridad</a>
            </div>
            <div>
              <h4>Accesos</h4>
              <a href={PANEL_URL} target="_blank" rel="noreferrer">Panel / Call Center</a>
              <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer">API (Swagger)</a>
            </div>
          </div>
          <div className="disclaimer">
            ⚠️ BienestAPP es una herramienta de acompañamiento y prevención. <b>No reemplaza</b> la atención médica,
            psicológica ni los servicios de emergencia profesionales. En caso de emergencia, llama a la línea 123 o
            a la Línea de salud mental 106. · © {new Date().getFullYear()} BienestAPP · Nueva EPS.
          </div>
        </div>
      </footer>
    </>
  );
}
