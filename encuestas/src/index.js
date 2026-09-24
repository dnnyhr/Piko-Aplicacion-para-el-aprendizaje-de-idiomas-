/**
 * Worker de las encuestas de Piko.
 *
 * Sirve la página (carpeta `public/`, como assets estáticos) y una API chica
 * sobre D1. Ninguna ruta conoce una encuesta en particular: todo sale de la
 * definición guardada en `versiones_encuesta`, así una encuesta nueva es un
 * JSON nuevo y no código nuevo.
 *
 *   GET  /  y  /e/:slug                        la página, con la vista previa
 *                                              para compartir ya completa
 *   GET  /api/encuestas                        las abiertas
 *   GET  /api/encuestas/:slug                  definición vigente
 *   POST /api/encuestas/:slug/respuestas       guardar una respuesta
 *
 *   PUT  /api/admin/encuestas/:slug            publicar / actualizar (token)
 *   GET  /api/admin/encuestas                  todas, con conteo (token)
 *   GET  /api/admin/encuestas/:slug/resumen    agregados por pregunta (token)
 *   GET  /api/admin/encuestas/:slug/csv        exportar (token)
 *   GET  /api/admin/encuestas/:slug/correos    correos enviados y su estado (token)
 *   POST /api/admin/encuestas/:slug/correos/reenviar   reenviar los que fallaron (token)
 *   POST /api/admin/correos/:respuesta/reenviar         reenviar uno (token)
 */

import { aFilas, preguntasDe, revisar, validarDefinicion } from '../public/js/reglas.js';
import { enviarBienvenida } from './correo.js';

/** Respuestas por huella y por día antes de responder 429. Un aula comparte IP. */
const LIMITE_DIARIO = 60;
const CUERPO_MAX = 64 * 1024;

export default {
  async fetch(request, env, ctx) {
    try {
      return await enrutar(request, env, ctx);
    } catch (err) {
      if (err instanceof ErrorHttp) return json({ error: err.message, ...err.extra }, err.status);
      console.error(err);
      return json({ error: 'Algo se rompió de nuestro lado.' }, 500);
    }
  },
};

class ErrorHttp extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

async function enrutar(request, env, ctx) {
  const url = new URL(request.url);
  const partes = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const m = request.method;

  if (partes[0] !== 'api') return servirPagina(request, env, url, partes);

  const [, a, b, c, d, e] = partes;

  if (a === 'salud' && m === 'GET') return json({ ok: true });

  if (a === 'encuestas') {
    if (!b && m === 'GET') return listarAbiertas(env);
    if (b && !c && m === 'GET') return obtenerEncuesta(env, b, esAdmin(request, env));
    if (b && c === 'respuestas' && !d && m === 'POST') return guardarRespuesta(request, env, b, url, ctx);
  }

  if (a === 'admin') {
    await exigirAdmin(request, env);
    if (b === 'encuestas' && !c && m === 'GET') return listarTodas(env);
    if (b === 'encuestas' && c && !d && m === 'PUT') return publicar(request, env, c);
    if (b === 'encuestas' && c && d === 'resumen' && m === 'GET') return resumen(env, c);
    if (b === 'encuestas' && c && d === 'csv' && m === 'GET') return exportarCsv(env, c);
    if (b === 'encuestas' && c && d === 'correos' && !e && m === 'GET') return listarCorreos(env, c);
    if (b === 'encuestas' && c && d === 'correos' && e === 'reenviar' && m === 'POST') return reenviarFallidos(request, env, c, url);
    if (b === 'correos' && c && d === 'reenviar' && m === 'POST') return reenviarUno(env, c, url);
  }

  throw new ErrorHttp(404, 'Ruta no encontrada.');
}

/* ----------------------------------------------------------------- página */

/**
 * WhatsApp, Facebook y X no ejecutan JavaScript ni aceptan direcciones
 * relativas en og:image. Acá se completan las etiquetas Open Graph con el
 * dominio desde el que se abrió la página (workers.dev o el propio) y, en
 * /e/<slug>, con el título y la descripción de esa encuesta.
 */
async function servirPagina(request, env, url, partes) {
  if (!env.ASSETS) return new Response('No encontrado', { status: 404 });

  // /e/<slug> no existe como archivo: se sirve index.html. Se pide explícito
  // porque los robots que arman la vista previa no navegan como un navegador.
  const esEncuesta = partes[0] === 'e' && partes.length === 2;
  const res = await env.ASSETS.fetch(esEncuesta ? new Request(new URL('/', url), request) : request);
  if (!(res.headers.get('content-type') ?? '').includes('text/html') || typeof HTMLRewriter === 'undefined') return res;

  let titulo = null;
  let descripcion = null;
  if (esEncuesta) {
    try {
      const e = await cargar(env, partes[1]);
      if (e && e.estado !== 'borrador') {
        titulo = e.definicion.titulo;
        descripcion = e.definicion.descripcion || null;
      }
    } catch {
      /* sin D1 la página se sirve igual, con los textos genéricos */
    }
  }

  const absoluta = (el) => el.setAttribute('content', new URL(el.getAttribute('content') ?? '/', url.origin).href);
  const poner = (valor) => ({ element: (el) => valor && el.setAttribute('content', valor) });

  return new HTMLRewriter()
    .on('meta[property="og:image"]', { element: absoluta })
    .on('meta[name="twitter:image"]', { element: absoluta })
    .on('meta[property="og:url"]', { element: (el) => el.setAttribute('content', url.origin + url.pathname) })
    .on('meta[property="og:title"]', poner(titulo))
    .on('meta[name="twitter:title"]', poner(titulo))
    .on('meta[property="og:description"]', poner(descripcion))
    .on('meta[name="twitter:description"]', poner(descripcion))
    .on('meta[name="description"]', poner(descripcion))
    .on('title', { element: (el) => titulo && el.setInnerContent(`${titulo} · Piko`) })
    .transform(res);
}

/* ---------------------------------------------------------------- lectura */

async function listarAbiertas(env) {
  const { results } = await env.DB.prepare(
    `SELECT e.slug, e.titulo, v.definicion
       FROM encuestas e
       JOIN versiones_encuesta v ON v.encuesta_id = e.id AND v.version = e.version_actual
      WHERE e.estado = 'abierta'
      ORDER BY e.actualizada_en DESC`,
  ).all();
  const encuestas = results.map((r) => {
    const def = JSON.parse(r.definicion);
    return { slug: r.slug, titulo: r.titulo, descripcion: def.descripcion ?? '', minutos: def.minutos ?? null };
  });
  return json({ encuestas }, 200, { 'cache-control': 'public, max-age=60' });
}

async function cargar(env, slug) {
  const fila = await env.DB.prepare(
    `SELECT e.id, e.slug, e.estado, e.version_actual AS version, v.definicion
       FROM encuestas e
       JOIN versiones_encuesta v ON v.encuesta_id = e.id AND v.version = e.version_actual
      WHERE e.slug = ?`,
  )
    .bind(slug)
    .first();
  if (!fila) return null;
  return { ...fila, definicion: JSON.parse(fila.definicion) };
}

async function obtenerEncuesta(env, slug, admin) {
  const e = await cargar(env, slug);
  // Un borrador solo lo ve quien tiene el token: sirve para revisarla antes de abrirla.
  if (!e || (e.estado === 'borrador' && !admin)) throw new ErrorHttp(404, 'Esa encuesta no existe.');
  return json(
    { slug: e.slug, estado: e.estado, version: e.version, definicion: e.definicion },
    200,
    { 'cache-control': e.estado === 'abierta' ? 'public, max-age=60' : 'no-store' },
  );
}

/* ------------------------------------------------------------- respuestas */

async function guardarRespuesta(request, env, slug, url, ctx) {
  const cuerpo = await leerJson(request);
  const e = await cargar(env, slug);
  if (!e) throw new ErrorHttp(404, 'Esa encuesta no existe.');
  if (e.estado !== 'abierta') throw new ErrorHttp(410, 'Esta encuesta ya cerró. ¡Gracias igual!');

  // Campo trampa: invisible para las personas, los bots lo llenan.
  if (cuerpo.sitio) return json({ ok: true, id: crypto.randomUUID() }, 201);

  const id = String(cuerpo.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ErrorHttp(400, 'Falta el identificador de la respuesta.');

  // Se valida contra la versión con que la persona empezó, si todavía existe;
  // si la encuesta cambió en el medio, contra la vigente.
  let version = e.version;
  let def = e.definicion;
  if (Number.isInteger(cuerpo.version) && cuerpo.version !== e.version) {
    const vieja = await env.DB.prepare(
      'SELECT definicion FROM versiones_encuesta WHERE encuesta_id = ? AND version = ?',
    )
      .bind(e.id, cuerpo.version)
      .first();
    if (vieja) {
      version = cuerpo.version;
      def = JSON.parse(vieja.definicion);
    }
  }

  const r = revisar(def, objeto(cuerpo.respuestas), objeto(cuerpo.otros));
  if (!r.ok) throw new ErrorHttp(422, 'Faltan algunas respuestas.', { errores: r.errores });

  const huella = await huellaDe(request, slug);
  const { n } = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM respuestas
      WHERE encuesta_id = ? AND huella = ? AND creada_en > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')`,
  )
    .bind(e.id, huella)
    .first();
  if (n >= LIMITE_DIARIO) throw new ErrorHttp(429, 'Recibimos muchas respuestas desde aquí hoy. Probá mañana.');

  const duracion = Number.isFinite(cuerpo.duracionSeg) ? Math.max(0, Math.min(86400, Math.round(cuerpo.duracionSeg))) : null;
  const origen = (url.searchParams.get('origen') ?? cuerpo.origen ?? '').toString().slice(0, 60) || null;

  // INSERT OR IGNORE + id del navegador: si la señal se cae después de
  // guardar y el teléfono reintenta, no queda la respuesta dos veces.
  const nueva = await env.DB.prepare(
    `INSERT OR IGNORE INTO respuestas (id, encuesta_id, version, datos, origen, duracion_seg, huella)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, e.id, version, JSON.stringify({ respuestas: r.limpias, otros: r.otros }), origen, duracion, huella)
    .run();

  if (nueva.meta.changes > 0) {
    const insertar = env.DB.prepare(
      'INSERT INTO respuestas_items (respuesta_id, pregunta, fila, opcion, numero, texto) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const filas = aFilas(def, r.limpias, r.otros);
    if (filas.length) await env.DB.batch(filas.map((f) => insertar.bind(id, f.pregunta, f.fila, f.opcion, f.numero, f.texto)));

    // Si dejó su correo, le llega el enlace de descarga. Va después de
    // responder (waitUntil): la persona no espera a Resend.
    if (def.correo && r.limpias[def.correo.pregunta]) {
      const tarea = enviarBienvenida(env, { respuestaId: id, def, respuestas: r.limpias, base: url.origin });
      if (ctx?.waitUntil) ctx.waitUntil(tarea);
      else await tarea;
    }
  }

  return json({ ok: true, id }, 201);
}

async function huellaDe(request, slug) {
  const ip = request.headers.get('cf-connecting-ip') ?? '';
  const ua = request.headers.get('user-agent') ?? '';
  const dia = new Date().toISOString().slice(0, 10);
  // Cambia cada día y por encuesta: no sirve para seguir a nadie, solo para contar.
  return sha256(`${slug}|${dia}|${ip}|${ua}`);
}

/* ------------------------------------------------------------------ admin */

function esAdmin(request, env) {
  const token = env.ADMIN_TOKEN;
  const dado = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return Boolean(token) && dado.length > 0 && igualSeguro(dado, token);
}

async function exigirAdmin(request, env) {
  if (!env.ADMIN_TOKEN) throw new ErrorHttp(503, 'Falta configurar ADMIN_TOKEN en el Worker.');
  if (!esAdmin(request, env)) throw new ErrorHttp(401, 'Token inválido.');
}

function igualSeguro(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let dif = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) dif |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return dif === 0;
}

async function listarTodas(env) {
  const { results } = await env.DB.prepare(
    `SELECT e.slug, e.titulo, e.estado, e.version_actual AS version, e.actualizada_en,
            (SELECT COUNT(*) FROM respuestas r WHERE r.encuesta_id = e.id) AS respuestas
       FROM encuestas e
      ORDER BY e.actualizada_en DESC`,
  ).all();
  return json({ encuestas: results });
}

async function publicar(request, env, slug) {
  const def = await leerJson(request);
  if (def.slug !== slug) throw new ErrorHttp(400, `El slug del JSON ("${def.slug}") no coincide con la ruta.`);
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new ErrorHttp(422, 'La definición tiene problemas.', { problemas });

  const { estado = 'borrador', ...contenido } = def;
  const texto = JSON.stringify(contenido);
  const huella = await sha256(texto);

  await env.DB.prepare(
    `INSERT INTO encuestas (slug, titulo, estado) VALUES (?, ?, ?)
     ON CONFLICT (slug) DO UPDATE SET
       titulo = excluded.titulo,
       estado = excluded.estado,
       actualizada_en = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  )
    .bind(slug, def.titulo, estado)
    .run();

  const e = await env.DB.prepare(
    `SELECT e.id, e.version_actual AS version, v.huella
       FROM encuestas e
       LEFT JOIN versiones_encuesta v ON v.encuesta_id = e.id AND v.version = e.version_actual
      WHERE e.slug = ?`,
  )
    .bind(slug)
    .first();

  let version = e.version;
  const cambio = e.huella !== huella;
  if (cambio) {
    version = e.version + 1;
    await env.DB.batch([
      env.DB.prepare('INSERT INTO versiones_encuesta (encuesta_id, version, definicion, huella) VALUES (?, ?, ?, ?)').bind(
        e.id,
        version,
        texto,
        huella,
      ),
      env.DB.prepare('UPDATE encuestas SET version_actual = ? WHERE id = ?').bind(version, e.id),
    ]);
  }
  return json({ ok: true, slug, estado, version, versionNueva: cambio });
}

async function resumen(env, slug) {
  const e = await cargar(env, slug);
  if (!e) throw new ErrorHttp(404, 'Esa encuesta no existe.');

  const total = await env.DB.prepare(
    'SELECT COUNT(*) AS n, AVG(duracion_seg) AS duracion FROM respuestas WHERE encuesta_id = ?',
  )
    .bind(e.id)
    .first();

  const { results: conteos } = await env.DB.prepare(
    `SELECT i.pregunta, i.fila, i.opcion, i.numero, COUNT(*) AS n
       FROM respuestas_items i JOIN respuestas r ON r.id = i.respuesta_id
      WHERE r.encuesta_id = ?
      GROUP BY i.pregunta, i.fila, i.opcion, i.numero`,
  )
    .bind(e.id)
    .all();

  const { results: textos } = await env.DB.prepare(
    `SELECT i.pregunta, i.opcion, i.texto, r.creada_en
       FROM respuestas_items i JOIN respuestas r ON r.id = i.respuesta_id
      WHERE r.encuesta_id = ? AND i.texto IS NOT NULL
      ORDER BY r.creada_en DESC
      LIMIT 500`,
  )
    .bind(e.id)
    .all();

  const preguntas = preguntasDe(e.definicion).map((p) => {
    const mias = conteos.filter((c) => c.pregunta === p.id);
    const base = { id: p.id, tipo: p.tipo, texto: p.texto, respondieron: 0 };
    if (p.tipo === 'unica' || p.tipo === 'multiple') {
      const opciones = p.opciones.map((o) => ({ id: o.id, texto: o.texto, n: mias.find((c) => c.opcion === o.id)?.n ?? 0 }));
      const otros = textos.filter((t) => t.pregunta === p.id && t.opcion).map((t) => t.texto);
      return { ...base, opciones, otros };
    }
    if (p.tipo === 'escala') {
      const dist = {};
      let suma = 0;
      let n = 0;
      for (const c of mias) {
        dist[c.numero] = c.n;
        suma += c.numero * c.n;
        n += c.n;
      }
      return { ...base, respondieron: n, min: p.min, max: p.max, promedio: n ? suma / n : null, distribucion: dist };
    }
    if (p.tipo === 'matriz') {
      const filas = p.filas.map((f) => {
        let suma = 0;
        let n = 0;
        const dist = {};
        for (const c of mias.filter((c) => c.fila === f.id)) {
          dist[c.numero] = c.n;
          suma += c.numero * c.n;
          n += c.n;
        }
        return { id: f.id, texto: f.texto, n, promedio: n ? suma / n : null, distribucion: dist };
      });
      filas.sort((x, y) => (y.promedio ?? -1) - (x.promedio ?? -1));
      return { ...base, min: p.escala.min, max: p.escala.max, filas };
    }
    const lista = textos.filter((t) => t.pregunta === p.id && !t.opcion).map((t) => ({ texto: t.texto, en: t.creada_en }));
    return { ...base, respondieron: lista.length, textos: lista };
  });

  // "respondieron" para opciones = personas distintas, no marcas.
  const { results: personas } = await env.DB.prepare(
    `SELECT i.pregunta, COUNT(DISTINCT i.respuesta_id) AS n
       FROM respuestas_items i JOIN respuestas r ON r.id = i.respuesta_id
      WHERE r.encuesta_id = ?
      GROUP BY i.pregunta`,
  )
    .bind(e.id)
    .all();
  for (const p of preguntas) {
    const fila = personas.find((x) => x.pregunta === p.id);
    if (fila && p.tipo !== 'texto') p.respondieron = fila.n;
  }

  let correos = null;
  try {
    const { results } = await env.DB.prepare(
      `SELECT c.estado, COUNT(*) AS n FROM correos c JOIN respuestas r ON r.id = c.respuesta_id
        WHERE r.encuesta_id = ? GROUP BY c.estado`,
    )
      .bind(e.id)
      .all();
    correos = Object.fromEntries(results.map((x) => [x.estado, x.n]));
  } catch {
    /* sin la migración 0002 todavía: no hay tabla de correos */
  }

  return json({
    slug: e.slug,
    titulo: e.definicion.titulo,
    correos,
    estado: e.estado,
    version: e.version,
    respuestas: total.n,
    duracionPromedioSeg: total.duracion,
    preguntas,
  });
}

async function exportarCsv(env, slug) {
  const e = await cargar(env, slug);
  if (!e) throw new ErrorHttp(404, 'Esa encuesta no existe.');
  const { results } = await env.DB.prepare(
    'SELECT id, version, datos, origen, duracion_seg, creada_en FROM respuestas WHERE encuesta_id = ? ORDER BY creada_en',
  )
    .bind(e.id)
    .all();

  const columnas = [];
  for (const p of preguntasDe(e.definicion)) {
    if (p.tipo === 'matriz') for (const f of p.filas) columnas.push({ titulo: `${p.id}.${f.id}`, leer: (d) => d.respuestas[p.id]?.[f.id] });
    else columnas.push({ titulo: p.id, leer: (d) => d.respuestas[p.id] });
    if ((p.opciones ?? []).some((o) => o.otro)) columnas.push({ titulo: `${p.id}.otro`, leer: (d) => d.otros?.[p.id] });
  }

  const lineas = [['id', 'creada_en', 'version', 'origen', 'duracion_seg', ...columnas.map((c) => c.titulo)]];
  for (const r of results) {
    const d = JSON.parse(r.datos);
    lineas.push([r.id, r.creada_en, r.version, r.origen, r.duracion_seg, ...columnas.map((c) => c.leer(d))]);
  }
  const csv = '﻿' + lineas.map((l) => l.map(celda).join(',')).join('\r\n') + '\r\n';
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${slug}.csv"`,
      'cache-control': 'no-store',
    },
  });
}

/* ---------------------------------------------------------------- correos */

async function listarCorreos(env, slug) {
  const e = await cargar(env, slug);
  if (!e) throw new ErrorHttp(404, 'Esa encuesta no existe.');
  let results = [];
  try {
    ({ results } = await env.DB.prepare(
      `SELECT c.respuesta_id, c.para, c.estado, c.detalle, c.intentos, c.creado_en,
              COALESCE(c.actualizado_en, c.creado_en) AS actualizado_en
         FROM correos c JOIN respuestas r ON r.id = c.respuesta_id
        WHERE r.encuesta_id = ?
        ORDER BY COALESCE(c.actualizado_en, c.creado_en) DESC
        LIMIT 500`,
    )
      .bind(e.id)
      .all());
  } catch {
    throw new ErrorHttp(503, 'Falta la tabla de correos: corré `npm run db:remoto`.');
  }
  return json({ correos: results });
}

/** Vuelve a mandar el correo de una respuesta con la definición con que se contestó. */
async function reenviar(env, respuestaId, base) {
  const r = await env.DB.prepare(
    `SELECT r.id, r.datos, v.definicion
       FROM respuestas r
       JOIN versiones_encuesta v ON v.encuesta_id = r.encuesta_id AND v.version = r.version
      WHERE r.id = ?`,
  )
    .bind(respuestaId)
    .first();
  if (!r) throw new ErrorHttp(404, 'Esa respuesta no existe.');
  const def = JSON.parse(r.definicion);
  const { respuestas } = JSON.parse(r.datos);
  if (!def.correo || !respuestas[def.correo.pregunta]) throw new ErrorHttp(422, 'Esta respuesta no dejó correo.');
  return enviarBienvenida(env, { respuestaId, def, respuestas, base });
}

async function reenviarUno(env, respuestaId, url) {
  const resultado = await reenviar(env, respuestaId, url.origin);
  return json({ ok: resultado.estado === 'enviado', ...resultado });
}

// Resend acepta pocos envíos por segundo en el plan gratis: se mandan de a
// uno, con una pausa, y de a tandas. El panel vuelve a pedir la siguiente.
const TANDA = 20;
const PAUSA_MS = 600;

async function reenviarFallidos(request, env, slug, url) {
  const e = await cargar(env, slug);
  if (!e) throw new ErrorHttp(404, 'Esa encuesta no existe.');
  const cuerpo = await request.json().catch(() => ({}));
  const estados = (Array.isArray(cuerpo.estados) ? cuerpo.estados : ['error', 'omitido']).filter((x) =>
    ['error', 'omitido', 'enviado'].includes(x),
  );
  if (!estados.length) throw new ErrorHttp(400, 'Indicá qué estados reenviar.');

  const { results } = await env.DB.prepare(
    `SELECT c.respuesta_id FROM correos c JOIN respuestas r ON r.id = c.respuesta_id
      WHERE r.encuesta_id = ? AND c.estado IN (${estados.map(() => '?').join(', ')})
      ORDER BY c.creado_en
      LIMIT ${TANDA + 1}`,
  )
    .bind(e.id, ...estados)
    .all();

  const cuenta = { enviado: 0, error: 0, omitido: 0 };
  for (const [i, { respuesta_id }] of results.slice(0, TANDA).entries()) {
    if (i) await new Promise((r) => setTimeout(r, PAUSA_MS));
    const r = await reenviar(env, respuesta_id, url.origin).catch(() => ({ estado: 'error' }));
    cuenta[r.estado] = (cuenta[r.estado] ?? 0) + 1;
    // Si falta configurar Resend, los demás van a dar lo mismo: no tiene sentido seguir.
    if (r.estado === 'omitido') break;
  }
  return json({ ...cuenta, quedan: results.length > TANDA });
}

export function celda(v) {
  if (v === undefined || v === null) return '';
  let s = Array.isArray(v) ? v.join('|') : String(v);
  // Evita que Excel/Sheets ejecuten una respuesta como fórmula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* -------------------------------------------------------------- utilidades */

async function leerJson(request) {
  const tipo = request.headers.get('content-type') ?? '';
  if (!tipo.includes('application/json')) throw new ErrorHttp(415, 'Se espera JSON.');
  const texto = await request.text();
  if (texto.length > CUERPO_MAX) throw new ErrorHttp(413, 'La respuesta es demasiado grande.');
  try {
    const v = JSON.parse(texto);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v;
  } catch {
    throw new ErrorHttp(400, 'JSON inválido.');
  }
}

function objeto(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

async function sha256(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(cuerpo, status = 200, cabeceras = {}) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cabeceras },
  });
}
