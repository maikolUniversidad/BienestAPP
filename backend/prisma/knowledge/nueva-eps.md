# Catálogo de Servicios de Nueva EPS para BienestAPP
### Documento accionable para equipo de producto y para alimentar al asistente de IA

## TL;DR
- **Nueva EPS opera en ambos regímenes (contributivo y subsidiado) y ya cuenta con un ecosistema digital maduro y referenciable por URL**: App oficial "APP NUEVA EPS" (y la versión web `app.nuevaeps.com.co`), Portal/Zona Transaccional, chat/WhatsApp "Eva" (+57 321 445 9657), líneas gratuitas nacionales y red presencial de oficinas. Estos son los puntos de integración inmediatos para BienestAPP.
- **Líneas clave**: Régimen Contributivo `01 8000 95 4400` / Bogotá `(601) 307 7022`; Régimen Subsidiado `01 8000 95 2000` / Bogotá `(601) 307 7051`; Empleador `01 8000 93 3331` / Bogotá `(601) 307 7096`; orientación médica telefónica 24 horas / 365 días.
- **Regla operativa central que la IA debe respetar**: las citas de medicina general, P y P y odontología se piden en la **IPS primaria asignada**; las **autorizaciones** de servicios/procedimientos se piden por App/WhatsApp/oficina; los servicios y medicamentos **no-PBS** los prescribe el médico tratante vía **MIPRES**.

## Key Findings
- Nueva EPS es la EPS más grande de Colombia, con cerca del **22% del total de afiliados del sistema** a febrero de 2026 (El Colombiano: *"Esa EPS concentra 11,5 millones de afiliados, equivalentes al 22% del total"*). Es la primera en cobertura: según nuevaeps.com.co/quienes-somos, *"la primera en cobertura con presencia en 1.117 municipios"* y *"Más de 100 millones de atenciones en salud en un año. Estamos en 1.117 de los 1.125 municipios del país"*. Lema oficial: **"Gente Cuidando Gente"**.
- El conteo más reciente disponible es de **11,44 millones de afiliados a marzo de 2026** (≈4,7M contributivo / 6,1M subsidiado), tras una pérdida neta de 314.586 usuarios desde junio de 2025, según la BDUA y el Ministerio de Salud (Portafolio, marzo 2026: *"la Nueva EPS registró 11,44 millones de afiliados, frente a los 11,76 millones que tenía en junio de 2025"*).
- El ecosistema de canales no presenciales está consolidado y es directamente enlazable por URL, ideal para que una IA guíe trámites paso a paso.
- Distinción funcional crítica para la IA: **citas asistenciales → IPS asignada**; **autorizaciones y trámites administrativos → canales Nueva EPS** (App, Zona Transaccional, WhatsApp Eva, oficinas).
- Co-branding: la paleta real es **azul + rojo + blanco** (no verde); **no existe manual de marca público**.

## Details

### 1. Información institucional (para co-branding)
- **Razón social**: NUEVA EPS S.A., sociedad anónima. NIT 900.156.264-2. Constituida por escritura pública No. 753 del 22 de marzo de 2007; habilitada como EPS del Régimen Contributivo por Resolución No. 371 del 3 de abril de 2008 y del Régimen Subsidiado por Resolución No. 02664 del 17 de diciembre de 2015 de la Superintendencia Nacional de Salud. Inició operaciones el 1 de agosto de 2008 con afiliados trasladados del ISS. *(Fuente: https://www.nuevaeps.com.co/quienes-somos)*
- **Cobertura y tamaño**: 1.117 de 1.125 municipios; más de 100 millones de atenciones en salud al año; ~22% de los afiliados del sistema (≈11,44–11,5 millones). Vigilada por Supersalud.
- **Sede nacional**: Carrera 85K No. 46A-66, Bogotá D.C. Teléfono administrativo `(601) 419 3000`. *(Fuente: https://www.nuevaeps.com.co/sedes-administrativas)*
- **Identidad de marca**: lema **"Gente Cuidando Gente"** (hashtags #GenteCuidandoGente, #YoSoyGenteCuidandoGente). Logotipo tipográfico en minúsculas "nueva eps" ("nueva" en azul, "eps" en rojo) con un acento/figura humana abstracta roja sobre la "v". Paleta **azul + rojo + blanco**. Códigos HEX **aproximados** (extraídos del logo, NO oficiales): azul ~`#00A0E3`, rojo ~`#E31E24`. **No existe manual de marca público**; se recomienda solicitar assets oficiales a la Dirección de Comunicaciones. Logos del sitio: `https://nuevaeps.com.co/sites/default/files/logo.png`.
- **Redes sociales oficiales**: YouTube https://www.youtube.com/user/SomosNuevaEps · X https://x.com/NuevaEPS_ · Instagram https://www.instagram.com/gentecuidandogente/ · LinkedIn https://www.linkedin.com/company/nueva-eps. (El sitio oficial **no lista una cuenta de Facebook**; las que aparecen en búsquedas son de terceros.)

### 2. Canales digitales y de contacto (núcleo de la integración)

| Canal | Detalle / URL | Para qué sirve |
|---|---|---|
| App oficial "APP NUEVA EPS" | Google Play, id `co.com.nuevaeps.app`. Existe también la app heredada "NUEVA EPS MÓVIL" (`com.colombitrade.health.simplified`) | Estado de afiliación, ubicar IPS/farmacias/oficinas, autorizaciones, certificados, seguimiento de solicitudes, notificaciones |
| Web App afiliados | https://app.nuevaeps.com.co/#/ | Versión web de la app: autorizaciones, transcripción de incapacidades, certificados, actualización de datos |
| Instructivo App | https://www.nuevaeps.com.co/Instructivo-Aplicacion | Crear usuario y guía de uso (solicitar autorización por App) |
| Portal / Zona Transaccional | https://aplicaciones.nuevaeps.com.co/Portal/home.jspx | Trámites en línea: citas IPS exclusivas, certificados, incapacidades, novedades |
| "Nueva EPS a un clic" | https://www.nuevaeps.com.co/nueva-eps-a-un-clic | Hub de trámites en línea |
| WhatsApp / Chat "Eva" | https://api.whatsapp.com/send?phone=573214459657 (**+57 321 445 9657**) | Autorizar órdenes, consultar autorizaciones vigentes, certificados, dudas |
| Cita en Oficina (agendamiento web) | https://citasweboaa.nuevaeps.com.co/ | Agendar turno presencial (selección de regional, oficina, trámite, fecha/hora) |
| Citas web afiliaciones | https://citaswebafiliaciones.nuevaeps.com.co | Agendar trámites de afiliación |
| Red de atención / puntos | https://www.nuevaeps.com.co/red_de_atencion · https://nuevaeps.com.co/oficinas_y_puntos_de_atencion | Localizar IPS, farmacias y oficinas (OAA, PAF, PAA) |
| Canales no presenciales (detalle) | https://nuevaeps.com.co/canales-servicio/no-presenciales | Listado completo de servicios por canal |
| Canales presenciales | https://nuevaeps.com.co/canales-servicio/presenciales | Tipos de oficina (híbrida con agendamiento / a demanda) |
| Contáctanos / contactos regionales | https://www.nuevaeps.com.co/contactanos · https://www.nuevaeps.com.co/personas/contactos-administrativos-regionales | Directorio de contactos administrativos |
| Soporte App (correo) | soporte.app@nuevaeps.com.co | Incidencias técnicas de la app |

**Líneas telefónicas** *(Fuentes: https://www.nuevaeps.com.co/lineas-de-atencion-telefonicas y https://nuevaeps.com.co/canales-servicio/no-presenciales)*:
- **Régimen Contributivo**: `01 8000 95 4400`; Bogotá `(601) 307 7022`.
- **Régimen Subsidiado**: `01 8000 95 2000`; Bogotá `(601) 307 7051`.
- **Empleador**: `01 8000 93 3331`; Bogotá `(601) 307 7096`.
- **Horario líneas administrativas**: lunes a viernes 8:00 a.m.–6:00 p.m. y sábados 8:00 a.m.–12:00 m.

### 3. Servicios asistenciales y de atención

**Citas médicas (medicina general, P y P, odontología)**
- *Qué es*: asignación de consulta en la IPS primaria asignada (medicina general, P y P, odontología; obstetricia y pediatría para menores de 18).
- *Requisitos*: afiliado vigente con documento de identidad; conocer la IPS asignada (aparece en el carné).
- *Proceso/canales*: llamar o acudir a la IPS asignada; o usar la App ("Citas médicas" → "Buscar citas médicas" → elegir entre las próximas 10 disponibles → confirmar) para IPS exclusivas; cancelación en la app con el ícono de papelera (mínimo 1 día hábil antes). Si no conoce su IPS: contributivo `01 8000 95 4400` / `(601) 307 7022`; subsidiado `01 8000 95 2000`.
- Las citas de P y P **no requieren orden médica ni autorización**. *(Fuentes: https://www.nuevaeps.com.co/personas/regimen-contributivo/urgencias-citas ; https://nuevaeps.com.co/personas/regimen-subsidiado/citas-medicas)*

**Autorizaciones de servicios, procedimientos, cirugías**
- *Qué es*: autorización de servicios que requieren aval (cirugías programadas, citas con especialistas, exámenes, medicamentos no-PBS, patologías especiales como VIH, cáncer, insuficiencia renal).
- *Proceso/canales*: por App (menú "Autorizaciones" → "Solicitar" → adjuntar foto de la orden de servicios e historia clínica → observación → "Grabar"); WhatsApp Eva; o en Oficina de Atención al Afiliado con orden médica y documento. Las IPS también tramitan autorizaciones directamente vía portal transaccional. Tener presente la vigencia/vencimiento de la orden.
- *(Fuentes: https://www.nuevaeps.com.co/personas/regimen-contributivo/autorizaciones ; https://nuevaeps.com.co/personas/regimen-subsidiado/autorizaciones ; https://www.nuevaeps.com.co/Instructivo-Aplicacion)*

**Medicamentos (dispensación, no-PBS/MIPRES, domiciliarios)**
- *Qué es*: entrega de medicamentos en puntos de dispensación de operadores logísticos; domicilio para población de cobertura especial.
- *Proceso*: presentar fórmula médica vigente (original/física) y documento; para no-PBS el médico prescribe en **MIPRES** y entrega la prescripción para reclamar máximo 5 días después; la entrega a domicilio se programa con el operador (llega en máximo 48 horas). Un tercero puede reclamar con fórmula firmada, documento del paciente y código de autorización (SMS) si aplica.
- *Coyuntura de operadores (verificar por región)*: tras la salida de Colsubsidio el 1 de enero de 2026 (1.642.000 afiliados en 11 departamentos), Nueva EPS designó a **Cafam, Medic, Discolmets, Audifarma, Farmedicall y Tododrogas**; el **10 de febrero de 2026 reactivó Colsubsidio en 40 puntos** en Bogotá, Antioquia, Tolima, Cundinamarca y Valle del Cauca, bajo modalidad **pico y cédula** (Infobae / El Tiempo, feb. 2026). La IA debe verificar el operador y los puntos vigentes por región antes de orientar.
- *(Fuentes: https://www.nuevaeps.com.co/Como-funciona-la-entrega-de-medicamentos ; https://www.nuevaeps.com.co/Y-mis-medicamentos ; https://www.nuevaeps.com.co/blog/asi-avanza-el-plan-de-normalizacion-en-la-entrega-de-medicamentos)*

**Urgencias**
- *Qué es*: atención inicial de urgencias **sin autorización previa ni convenio**; basta presentar documento de identidad. Superada la urgencia, la IPS coordina con Nueva EPS las autorizaciones de hospitalización. *(Fuente: https://www.nuevaeps.com.co/personas/regimen-contributivo/urgencias-citas)*

**Atención domiciliaria**
- *Qué es*: consulta domiciliaria de medicina general activada por línea telefónica; un profesional evalúa por teléfono y, según el cuadro, desplaza una unidad médica. Cubre zonas geográficas designadas por el operador.
- *Líneas por ciudad (ejemplos)*: Bogotá `(601) 307 7330` / `(601) 745 7859`; Medellín `(604) 444 1330`; Cali `(602) 653 1313`; Barranquilla `(605) 360 9911`; Bucaramanga `(607) 657 4545`; Armenia `(606) 731 4031`; Ibagué `(608) 264 1111`; Manizales `(606) 887 9911`. *(Fuente: https://www.nuevaeps.com.co/personas/servicios-domiciliarios/consulta-domiciliaria-de-medicina-general)*

**Telemedicina / teleconsulta**
- *Qué es*: teleconsulta de medicina general, especializada y de programas especiales (crónicos: HTA, diabetes, ERC, EPOC), por web o teléfono, en IPS exclusivas y según región. *(Fuente: https://www.nuevaeps.com.co/coronavirus-atencion/teleconsulta-medica)*

**Orientación médica telefónica 24/7**
- *Qué es*: línea atendida por un operador médico **24 horas, 365 días**, que orienta según protocolos de atención. *(Fuente: https://www.nuevaeps.com.co/personas/servicios-domiciliarios/orientacion-medica-telefonica)*

**Promoción y Prevención (P y P) y RIAS**
- *Qué es*: programas de la Ruta de Promoción y Mantenimiento de la Salud (Resolución 3280 de 2018): vacunación, salud bucal, tamizajes de cáncer (cuello uterino, mama, próstata, colon), control prenatal, crecimiento y desarrollo, asesoría en anticoncepción, suplementación con micronutrientes, etc. Citas **sin orden ni autorización** en la IPS primaria.
- *Programas por curso de vida*: Crecimiento y Desarrollo (0 a <10 años), programa del joven, Programa del Adulto (mayores de 45 por quinquenios: 45, 50, 55…). *(Fuentes: https://www.nuevaeps.com.co/programas-promocion-prevencion ; https://www.nuevaeps.com.co/programas-promocion-prevencion/adultos)*

**Gestión de riesgo / enfermedades crónicas y alto costo**
- Programas para patologías especiales: VIH, cáncer (incluye ruta oncológica regional y la estrategia **"Valientes"** para menores con cáncer — José Fernando Cardona, presidente de Nueva EPS: *"Desde el año 2018 hasta la fecha, en NUEVA EPS hemos realizado 97 trasplantes de médula ósea, garantizando la calidad de vida a los niños y niñas inscritas al programa"*), enfermedad renal crónica y diálisis, hipertensión y diabetes. Acceso vía médico tratante y red especializada contratada. *(Fuente: https://www.nuevaeps.com.co/personas/regimen-contributivo/autorizaciones ; https://nuevaeps.com.co/blog/valientes-la-estrategia-de-nueva-eps-que-acompana-los-menores-de-edad-en-su-tratamiento-de)*

**Salud mental**
- Contenido institucional y orientación para buscar ayuda psicológica; el acceso a atención psicológica/psiquiátrica se da por la red asistencial. *(Fuente: https://www.nuevaeps.com.co/salud-mental-buscar-ayuda-psicologica-no-es-una-locura)*

**Materno-perinatal y vacunación (PAI)**
- Ruta materno-perinatal: control prenatal integral (examen físico, antropometría, signos vitales, valoración ginecológica). Programa Ampliado de Inmunización (PAI) con esquema gratuito por curso de vida; jornadas nacionales de vacunación (la citación puede llegar por SMS). Localizar punto: https://www.nuevaeps.com.co/agenda-vacunacion ; PAI: https://www.nuevaeps.com.co/personas/promocion-y-prevencion/programa-ampliado-de-inmunizacion

**Adulto mayor / discapacidad**
- Programa del Adulto (gestión del riesgo en mayores de 45). En la App se pueden registrar datos de cuidador/familiar responsable (relevante para adultos mayores): https://app.nuevaeps.com.co/#/registerattend

### 4. Trámites administrativos y afiliación

**Afiliación / traslados / novedades / beneficiarios**
- *Canales*: Sistema de Afiliación Transaccional (SAT) en https://miseguridadsocial.gov.co/ ; formulario único de afiliación en oficina; portal web. Novedades: inclusión/exclusión de beneficiarios, actualización de datos, reingresos/retiros. Documentos según caso (registro civil de matrimonio/nacimiento, cédula ampliada al 150%, declaración de convivencia, etc.). *(Fuentes: https://nuevaeps.com.co/personas/regimen-contributivo/novedades-afiliacion ; https://www.nuevaeps.com.co/empresas/sistema-afiliacion-transaccional ; https://www.nuevaeps.com.co/empresas/afiliaciones)*

**Consulta de estado de afiliación y derechos**
- En la Zona Transaccional con tipo y número de documento; también vía ADRES https://www.adres.gov.co/consulte-su-eps y https://miseguridadsocial.gov.co/. Carta de Derechos y Deberes: https://www.nuevaeps.com.co/carta-derechos-deberes. *(Fuente: https://nuevaeps.com.co/personas/regimen-contributivo/consulta-estado-afiliacion)*

**Certificados y carné digital**
- Certificados disponibles: **afiliación, semanas cotizadas, incapacidad, pagos, duplicado de carné**. Canales: Zona Transaccional, App (menú "Certificaciones" → seleccionar → confirmar correo → "Solicitar"), WhatsApp Eva, línea telefónica (`01 8000 954400`, opción de certificado). *(Fuentes: https://www.nuevaeps.com.co/personas/regimen-contributivo/certificaciones ; https://nuevaeps.com.co/canales-servicio/no-presenciales)*

**Incapacidades y licencias**
- *Transcripción*: obligatoria solo para certificados de la red **no exclusiva**; plazo de 30 días siguientes a la expedición (consulta externa fuera de red: 15 días hábiles). Canal: App / web App, menú "Transcripción Incapacidades" (anexar documentos legibles).
- *Pago/cobro y consulta*: por Trámites en Línea → Servicios en Línea → empleador/afiliado POS → "Solicitud de pago", "Consulta giro de incapacidades", "Estadísticas de incapacidad". Certificados de incapacidad y para fondo de pensiones descargables.
- *Reglas de responsabilidad*: incapacidades <3 días a cargo del **empleador** (Decreto 2943 de 2013); >180 días a cargo de la **AFP** (Decreto Ley 019 de 2012); origen laboral a cargo de la **ARL** (Decreto 1295 de 1994). Acompañamiento de remisión al fondo de pensiones desde los 120 días continuos. *(Fuentes: https://www.nuevaeps.com.co/empresas/licencias-e-incapacidades ; https://www.nuevaeps.com.co/personas/tipos-licencias-incapacidades)*

**Portabilidad y movilidad entre regímenes**
- *Portabilidad* (Decreto 1683 de 2013): emigración ocasional (<1 mes, urgencias en cualquier IPS), temporal (1–12 meses, Nueva EPS asigna IPS en destino), permanente (>12 meses, cambio de EPS). Correo exclusivo de portabilidad indicado en la web por régimen.
- *Movilidad*: del subsidiado al contributivo al adquirir capacidad de pago/vínculo laboral (y del contributivo al subsidiado según Sisbén niveles I–II), **permaneciendo en la misma EPS**; se tramita con formulario único enviado al correo de movilidad o en oficina. *(Fuentes: https://www.nuevaeps.com.co/personas/regimen-contributivo/portabilidad ; https://nuevaeps.com.co/personas/regimen-subsidiado/portabilidad ; https://www.nuevaeps.com.co/personas/regimen-subsidiado/movilidad)*

**PQRS / Tutelas / Notificaciones judiciales**
- Registro de quejas en el portal: https://portal.nuevaeps.com.co/Portal/public/contactenos/quejas/registrarQuejas.jspx ; consulta de queja: https://portal.nuevaeps.com.co/Portal/public/contactenos/quejas/consultarQuejas.jspx ; también por líneas telefónicas (radicación de inconformidades, sugerencias y reclamos).
- *Escalamiento*: Supersalud https://www.supersalud.gov.co/es-co/atencion-ciudadano/pqrd ; ADRES https://www.adres.gov.co/portal-del-ciudadano/pqrsd ; MinSalud https://www.minsalud.gov.co/Atencion-y-servicios-a-la-ciudadania/Paginas/peticiones-quejas-reclamos.aspx
- Notificaciones judiciales: https://www.nuevaeps.com.co/notificaciones-judiciales (correo de Secretaría General y Jurídica usado en procesos judiciales: `secretaria.general@nuevaeps.com.co`).

**Recobros y reembolsos / no-PBS (MIPRES)**
- El acceso a prestaciones no incluidas en el PBS lo define el médico tratante prescribiendo en **MIPRES**; Nueva EPS descarga la prescripción, valida y direcciona el servicio (normalmente en máximo 5 días hábiles). El afiliado recibe la fórmula/plan de manejo con número de prescripción. *(Fuente: https://nuevaeps.com.co/personas/regimen-subsidiado/autorizaciones)*

## Recommendations
1. **Fase 1 (MVP)**: integrar deep-links a los canales ya existentes (App, WhatsApp Eva, Zona Transaccional, agendamiento web, líneas telefónicas) y construir flujos guiados por la IA para los **5 trámites de mayor demanda**: (a) citas, (b) autorizaciones, (c) medicamentos, (d) incapacidades, (e) certificados. *Benchmark de cambio*: si Nueva EPS publica APIs o un manual de marca, re-evaluar para integración nativa.
2. **Fase 2**: módulos de P y P, programas crónicos (HTA, diabetes, ERC, VIH, oncología) y vacunación con recordatorios; sincronizar con el "simulador de riesgo" del portal y con el registro de datos de salud que ya ofrece la app (glucometrías, presión arterial, peso).
3. **Parámetro de configuración por región/operador de medicamentos**, dado el proceso de normalización 2026 (Cafam, Medic, Discolmets, Audifarma, Farmedicall, Tododrogas, Colsubsidio). Actualizar dinámicamente puntos y modalidad (pico y cédula).
4. **Co-branding**: usar paleta **azul + rojo + blanco** y el lema "Gente Cuidando Gente"; **solicitar formalmente a la Dirección de Comunicaciones de Nueva EPS los HEX y assets oficiales** antes de producción para evitar discrepancias.
5. **Guardarraíles de la IA**: que distinga siempre "cita en IPS asignada" vs. "autorización/trámite en canal Nueva EPS", que muestre la línea correcta según régimen del usuario, y que para urgencias indique acudir directamente sin autorización previa.

## Caveats
- Los códigos **HEX de marca son aproximados** (extraídos del logo), no oficiales; confirmar con Nueva EPS.
- Coexisten una app **heredada** ("NUEVA EPS MÓVIL") y una **nueva** ("APP NUEVA EPS"); confirmar cuál es la vigente y su URL de descarga en App Store/Google Play antes de enlazar.
- La **red de dispensación de medicamentos** estuvo en plena normalización en 2026; operadores y puntos cambian por región y fecha — no codificar valores fijos.
- Servicios como **teleconsulta y atención domiciliaria** dependen de disponibilidad regional/IPS exclusiva.
- Pueden existir **restricciones regulatorias temporales** (Supersalud) sobre nuevas afiliaciones/traslados al subsidiado; verificar estado vigente.
- Nueva EPS ha estado bajo **intervención de la Supersalud**; cifras de afiliados, PQRS y operadores pueden variar — la IA debe priorizar siempre la fuente oficial en tiempo real (`nuevaeps.com.co`) y, para derechos y normatividad, MinSalud/Supersalud/ADRES.
- Varias fuentes de procesos detallados provienen de portales de terceros (tueps.com, etramite.com, etc.); se priorizaron y citaron las URLs oficiales de Nueva EPS donde existían. Para datos de marca y cifras agregadas se usaron fuentes secundarias confiables (prensa) claramente identificadas.