/**
 * El correo que recibe quien deja su dirección en una encuesta: gracias y el
 * enlace para descargar la app. Se manda con Resend (https://resend.com).
 *
 * Configuración del Worker:
 *   RESEND_API_KEY      secreto  `npx wrangler secret put RESEND_API_KEY`
 *   CORREO_REMITENTE    var      "Piko <hola@tu-dominio-verificado>"
 *   APP_DESCARGA_URL    var      enlace de descarga de la app
 *   CORREO_RESPUESTA    var      opcional: a dónde van las respuestas al correo
 *   CORREOS_POR_DIA     var      opcional: tope de correos automáticos por día (100)
 *
 * Si falta cualquiera de las tres primeras, no se manda nada y queda anotado
 * en la tabla `correos` como "omitido", con el motivo.
 */

const RESEND = 'https://api.resend.com/emails';
const ESPERA_MS = 10_000;
/**
 * El motivo de un correo, dicho para el panel: sin nombres de variables ni
 * códigos. En la base queda el detalle técnico, para revisarlo desde la consola.
 */
export function detalleAmigable(detalle) {
  if (!detalle) return null;
  const d = String(detalle);
  if (/^Falta configurar/.test(d)) return 'El envío de correos todavía no está configurado.';
  if (/no respondió a tiempo/.test(d)) return 'El servicio de correo no respondió a tiempo: probá de nuevo.';
  if (/^429\b/.test(d)) return 'Demasiados envíos seguidos: probá de nuevo en un minuto.';
  if (/^(401|403|422)\b/.test(d)) return 'El servicio de correo rechazó el envío: hay que revisar su configuración.';
  if (/^\d{3}\b|RESEND|Resend|API|CORREO_|APP_DESCARGA|fetch|Error/.test(d)) return 'No se pudo mandar: probá de nuevo.';
  return d;
}

/** Tope de correos automáticos por día si no se configura CORREOS_POR_DIA (el plan gratis de Resend manda 100). */
const TOPE_DIARIO = 100;

// Qué suele significar cada error de Resend, para que el panel lo diga claro.
const PISTAS = {
  401: 'Resend no aceptó la API key: revisá RESEND_API_KEY.',
  403: 'Resend lo rechazó: revisá la API key y que el dominio del remitente esté verificado.',
  422: 'Resend no aceptó los datos: revisá CORREO_REMITENTE (tiene que ser de un dominio verificado).',
  429: 'Demasiados envíos seguidos: probá de nuevo en un minuto.',
};

// Direcciones que son de un puesto, no de una persona: no sirven para adivinar un nombre.
const GENERICOS = new Set([
  'admin', 'administracion', 'contacto', 'contact', 'hola', 'hello', 'info', 'informacion',
  'noreply', 'no', 'reply', 'soporte', 'support', 'ventas', 'sales', 'oficina', 'escuela',
  'colegio', 'direccion', 'secretaria', 'mail', 'correo', 'test', 'prueba', 'user', 'usuario',
]);

const capital = (p) => p.charAt(0).toLocaleUpperCase('es') + p.slice(1).toLocaleLowerCase('es');

/**
 * Intenta sacar un nombre de pila de la dirección, sin preguntarle a nadie.
 * Solo cuando parece un nombre ("maria.lopez", "juan_perez", "carla"); si
 * tiene números o es de un puesto ("info", "ventas"), devuelve null y el
 * correo saluda sin nombre. Mejor un "¡Hola!" que un "¡Hola, Elcrack2009!".
 */
export function nombreDesdeCorreo(correo) {
  const local = String(correo ?? '').split('@')[0].split('+')[0].toLowerCase();
  const primero = local.split(/[._-]+/)[0] ?? '';
  if (!/^\p{L}{3,20}$/u.test(primero) || /\d/.test(local)) return null;
  if (GENERICOS.has(primero)) return null;
  return capital(primero);
}

/** El nombre que escribió la persona, prolijo: solo el primero y bien escrito. */
export function limpiarNombre(nombre) {
  const primero = String(nombre ?? '').trim().split(/\s+/)[0] ?? '';
  const limpio = primero.replace(/[^\p{L}'-]/gu, '').slice(0, 30);
  return limpio.length >= 2 ? capital(limpio) : null;
}

const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Arma el correo de bienvenida. `base` es el dominio de la encuesta: de ahí
 * salen las imágenes (en PNG: Gmail y Outlook no muestran SVG).
 */
export function armarCorreo({ nombre, enlace, base, encuesta, asunto, marca = null }) {
  const saludo = nombre ? `¡Tuani, ${nombre}!` : '¡Tuani, gracias por responder!';
  const titulo = encuesta ?? 'nuestra encuesta';
  const img = (archivo) => `${base}/img/${archivo}`;
  const e = { saludo: escapar(saludo), titulo: escapar(titulo), enlace: escapar(enlace), base: escapar(base) };

  const fuente = "Fredoka, 'Trebuchet MS', 'Segoe UI', Arial, sans-serif";
  const cuerpo = "'Nunito Sans', 'Segoe UI', Helvetica, Arial, sans-serif";

  const puntos = [
    ['#97C137', 'Lecciones cortitas tipo juego en miskito, mayangna, rama, garífuna e inglés.'],
    ['#60C5FA', 'Funciona sin internet: en el aula, en la casa o en el camino.'],
    ['#D9531C', 'Y ya viene Pikobot: el robot que guía, escucha y corrige con IA.'],
  ];

  const html = `<!doctype html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapar(asunto)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito+Sans:wght@400;700&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; background:#F7F0E4; }
  a { color:#0F5D3D; }
  @media (max-width: 620px) {
    .contenedor { width:100% !important; }
    .relleno { padding-left:22px !important; padding-right:22px !important; }
    .boton a { padding:15px 26px !important; }
    .titulo { font-size:28px !important; line-height:34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F7F0E4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F7F0E4;">Dale pues: acá está tu enlace para descargar Piko. ¡Gracias por echarnos la mano!&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F0E4;">
<tr><td align="center" style="padding:20px 10px 28px;">

  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
  <table role="presentation" class="contenedor" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:24px;overflow:hidden;border:2px solid #E3DACA;">
    <tr><td style="background:#60C5FA;line-height:0;">
      <img src="${img('correo-cabecera.jpg')}" width="600" alt="Piko y Pikobot te dan las gracias" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
    </td></tr>

    <tr><td class="relleno" style="padding:30px 28px 8px;font-family:${cuerpo};color:#33453B;">
      <p style="margin:0 0 10px;font-family:${cuerpo};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#197249;">Encuesta · ${e.titulo}</p>
      <h1 class="titulo" style="margin:0 0 16px;font-family:${fuente};font-size:34px;line-height:40px;font-weight:700;color:#16241D;">${e.saludo}</h1>
      <p style="margin:0 0 14px;font-size:17px;line-height:27px;">Ya tenemos tus respuestas y las vamos a leer una por una. Lo que más pidan es lo primero que vamos a construir, así que gracias por echarnos la mano.</p>
      <p style="margin:0 0 24px;font-size:17px;line-height:27px;">Dijiste que querías probar Piko antes que nadie. ¡Dale pues! Acá la tenés:</p>
    </td></tr>

    <tr><td align="center" style="padding:0 28px 10px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="boton" align="center" bgcolor="#97C137" style="background:#97C137;border-radius:16px;border-bottom:5px solid #7BA22C;">
          <a href="${e.enlace}" target="_blank" style="display:inline-block;padding:16px 28px;font-family:${fuente};font-size:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#0A4530;text-decoration:none;">Descargar Piko</a>
        </td>
      </tr></table>
      <p style="margin:14px 0 0;font-family:${cuerpo};font-size:14px;line-height:21px;color:#33453B;">Es para Android.</p>
      <p style="margin:10px 0 0;font-family:${cuerpo};font-size:13px;line-height:20px;color:#6B7A70;">¿El botón no te abre? Copiá este enlace:<br><a href="${e.enlace}" style="color:#0F5D3D;word-break:break-all;">${e.enlace}</a></p>
    </td></tr>

    <tr><td class="relleno" style="padding:26px 28px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F0E4;border-radius:18px;">
        <tr><td style="padding:20px 20px 10px;font-family:${fuente};font-size:18px;font-weight:600;color:#0F5D3D;">Lo que te espera adentro</td></tr>
        ${puntos
          .map(
            ([color, texto]) => `<tr><td style="padding:0 20px 14px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td valign="top" style="padding:7px 12px 0 0;"><div style="width:10px;height:10px;border-radius:5px;background:${color};line-height:10px;font-size:0;">&nbsp;</div></td>
            <td style="font-family:${cuerpo};font-size:15px;line-height:23px;color:#33453B;">${escapar(texto)}</td>
          </tr></table>
        </td></tr>`,
          )
          .join('')}
        <tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>
      </table>
    </td></tr>

    <tr><td class="relleno" style="padding:24px 28px 32px;font-family:${cuerpo};font-size:16px;line-height:25px;color:#33453B;">
      <p style="margin:0 0 4px;">Con cariño pinolero,</p>
      <p style="margin:0;font-family:${fuente};font-size:18px;font-weight:600;color:#0F5D3D;">Piko, el chocoyito más hablantín de Nicaragua</p>
      <p style="margin:2px 0 0;">y todo el equipo MugiWare</p>
      <p style="margin:6px 0 0;font-family:${fuente};font-size:15px;font-weight:600;color:#7BA22C;">el que repite, salva</p>
    </td></tr>
  </table>

  <table role="presentation" class="contenedor" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">
    <tr><td class="relleno" style="padding:20px 28px 0;font-family:${cuerpo};font-size:12px;line-height:19px;color:#6B7A70;text-align:center;">
      Te llegó este correo porque dejaste tu dirección en la encuesta «${e.titulo}» y pediste probar la app. No te vamos a volver a escribir sin tu permiso: palabra de chocoyo.<br><br>
      MugiWare · Jinotega, Nicaragua · <a href="https://piko.mugiware.com" style="color:#6B7A70;">piko.mugiware.com</a>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
  ${
    // Una marca invisible distinta en cada envío: si no, Gmail ve el mismo
    // contenido que en un correo anterior y lo esconde detrás de "•••".
    marca ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F7F0E4;">${escapar(marca)}</div>` : ''
  }

</td></tr>
</table>
</body>
</html>`;

  const texto = `${saludo}

Ya tenemos tus respuestas a «${titulo}» y las vamos a leer una por una. Lo que más pidan es lo primero que vamos a construir, así que gracias por echarnos la mano.

Dijiste que querías probar Piko antes que nadie. ¡Dale pues! Acá la tenés:

Descargar Piko: ${enlace}
(Es para Android.)

Lo que te espera adentro:
- ${puntos.map(([, t]) => t).join('\n- ')}

Con cariño pinolero,
Piko, el chocoyito más hablantín de Nicaragua
y todo el equipo MugiWare
el que repite, salva

—
Te llegó este correo porque dejaste tu dirección en la encuesta «${titulo}» y pediste probar la app. No te vamos a volver a escribir sin tu permiso: palabra de chocoyo.
MugiWare · Jinotega, Nicaragua · https://piko.mugiware.com
`;

  return { asunto, html, texto };
}

/**
 * Manda el correo de bienvenida de una respuesta y anota el resultado en D1.
 * Sirve para el primer envío y para los reenvíos desde el panel: cada
 * intento lleva su número, y con él su propia clave de idempotencia.
 * Nunca lanza: devuelve { estado, detalle } y la respuesta de la encuesta
 * ya está guardada igual.
 */
export async function enviarBienvenida(env, { respuestaId, def, respuestas, base }) {
  const conf = def.correo;
  const para = String(respuestas[conf.pregunta] ?? '').trim();
  if (!para) return { estado: 'sin-correo', detalle: 'Esta respuesta no dejó correo.' };

  let intento = 1;
  try {
    const previo = await env.DB.prepare('SELECT intentos FROM correos WHERE respuesta_id = ?').bind(respuestaId).first();
    if (previo) intento = (previo.intentos ?? 1) + 1;
  } catch {
    /* sin la migración 0003: se cuenta como primer intento */
  }

  const anotar = async (estado, detalle, resendId = null) => {
    const d = detalle ? String(detalle).slice(0, 500) : null;
    try {
      await env.DB.prepare(
        `INSERT INTO correos (respuesta_id, para, estado, detalle, resend_id, intentos, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT (respuesta_id) DO UPDATE SET
           para = excluded.para, estado = excluded.estado, detalle = excluded.detalle,
           resend_id = excluded.resend_id, intentos = excluded.intentos, actualizado_en = excluded.actualizado_en`,
      )
        .bind(respuestaId, para, estado, d, resendId, intento)
        .run();
    } catch (err) {
      console.error('No se pudo anotar el correo', err);
    }
    return { estado, detalle: d, intentos: intento };
  };

  // Frenos para que nadie use la encuesta para mandar correos a direcciones
  // ajenas. Solo para el envío automático: un reenvío desde el panel sale siempre.
  if (intento === 1) {
    const freno = await frenoAutomatico(env, para);
    if (freno) return anotar('omitido', freno);
  }

  const nombre = limpiarNombre(respuestas[conf.nombre]) ?? nombreDesdeCorreo(para);
  const r = await mandarDescarga(env, {
    para,
    nombre,
    base,
    encuesta: def.titulo,
    asunto: conf.asunto,
    clave: `bienvenida-${respuestaId}-${intento}`,
    tipo: intento > 1 ? 'reenvio' : 'bienvenida',
  });
  return anotar(r.estado, r.detalle, r.resendId);
}

/**
 * ¿Hay que frenar este envío automático? Devuelve el motivo, o null.
 * - A una misma dirección, una vez por día.
 * - Como mucho CORREOS_POR_DIA automáticos por día en total.
 * Los frenados quedan como "omitido" y se pueden reenviar desde el panel.
 */
async function frenoAutomatico(env, para) {
  const hace1dia = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')`;
  try {
    const misma = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM correos WHERE lower(para) = lower(?) AND estado = 'enviado' AND actualizado_en > ${hace1dia}`,
    )
      .bind(para)
      .first();
    if (misma.n > 0) return 'A esta dirección ya se le mandó el enlace hoy.';
    const tope = Number(env.CORREOS_POR_DIA) || TOPE_DIARIO;
    const hoy = await env.DB.prepare(`SELECT COUNT(*) AS n FROM correos WHERE estado = 'enviado' AND actualizado_en > ${hace1dia}`).first();
    if (hoy.n >= tope) return `Se llegó al tope de ${tope} correos automáticos del día: reenvialo desde el panel más tarde.`;
  } catch (err) {
    console.error('No se pudo revisar el tope de correos', err);
  }
  return null;
}

/**
 * Manda el correo con el enlace de descarga a una dirección. No anota nada:
 * devuelve { estado: enviado | error | omitido, detalle, resendId } y quien
 * lo llama decide dónde guardarlo (respuestas de la encuesta o contactos
 * agregados a mano). `clave` es la clave de idempotencia de Resend: un
 * reintento con la misma clave no sale dos veces.
 */
export async function mandarDescarga(env, { para, nombre, base, encuesta, asunto, clave, tipo = 'bienvenida', espera = ESPERA_MS }) {
  const faltan = ['RESEND_API_KEY', 'CORREO_REMITENTE', 'APP_DESCARGA_URL'].filter((k) => !env[k]);
  if (faltan.length) return { estado: 'omitido', detalle: `Falta configurar: ${faltan.join(', ')}`, resendId: null };

  const correo = armarCorreo({
    nombre: nombre ?? null,
    enlace: env.APP_DESCARGA_URL,
    base,
    encuesta,
    asunto: asunto ?? 'Tu enlace para descargar Piko',
    marca: clave,
  });

  try {
    const res = await fetch(RESEND, {
      method: 'POST',
      // Si Resend no contesta, no dejar colgado al panel ni al Worker.
      signal: AbortSignal.timeout(espera),
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
        // Un reintento automático del mismo intento no sale dos veces;
        // un reenvío pedido desde el panel es otro intento y sí sale.
        'idempotency-key': clave,
      },
      body: JSON.stringify({
        from: env.CORREO_REMITENTE,
        to: [para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
        ...(env.CORREO_RESPUESTA ? { reply_to: env.CORREO_RESPUESTA } : {}),
        tags: [{ name: 'tipo', value: tipo }],
        // Un id distinto por envío: Gmail no junta los reenvíos en una misma
        // conversación (ahí es donde recorta lo repetido).
        headers: { 'X-Entity-Ref-ID': clave },
      }),
    });
    const r = await res.json().catch(() => ({}));
    if (res.ok) return { estado: 'enviado', detalle: null, resendId: r.id ?? null };
    return {
      estado: 'error',
      detalle: `${res.status} · ${r.message ?? PISTAS[res.status] ?? r.name ?? 'Resend no pudo mandarlo.'}`,
      resendId: null,
    };
  } catch (err) {
    const tiempo = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return { estado: 'error', detalle: tiempo ? 'Resend no respondió a tiempo: probá de nuevo.' : err?.message ?? String(err), resendId: null };
  }
}
