/**
 * El canje de códigos de logros especiales de la app.
 *
 * La app es offline: todo el progreso vive en el teléfono. Lo único que
 * necesita un servidor es que cada tarjeta se pueda canjear **una sola vez en
 * todos los teléfonos**, y eso es esta tabla. Canjear necesita internet en ese
 * momento; el resto de la app sigue sin necesitarlo.
 *
 * Las funciones devuelven `{ status, cuerpo }`; el Worker las convierte en
 * respuestas. Los mensajes que ve el niño los arma la app según `error`.
 */

import { codigoNuevo, normalizarCodigo } from './codigos.js';

/** Intentos con códigos que no existen por IP antes de bloquearla, y por cuánto tiempo. */
export const INTENTOS_CANJE = 10;
export const BLOQUEO_CANJE_MIN = 15;
/** Tope de códigos por tanda, para que un error de tipeo no cree un millón. */
export const MAX_LOTE = 2000;

const ID = /^[a-z0-9][a-z0-9-]{1,63}$/;
const EVENTO = /^[A-Z0-9]{4}$/;

const texto = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * POST /api/canjes  { codigo, alumno, dispositivo, nombre? }
 *
 *   200 { ok, codigo, logro, canjeadoEn }   canjeado ahora, o ya era de este mismo alumno
 *   400 { error: 'datos' }                  falta el alumno o el teléfono
 *   404 { error: 'invalido' }               no existe (o no tiene la forma de un código)
 *   409 { error: 'usado' }                  ya lo canjeó otra persona
 *   429 { error: 'bloqueado' }              demasiados códigos que no existen desde esta IP
 */
export async function canjear(env, datos, huella) {
  const alumno = texto(datos.alumno, 80);
  const dispositivo = texto(datos.dispositivo, 80);
  const nombre = texto(datos.nombre, 80);
  if (!alumno || !dispositivo) return { status: 400, cuerpo: { error: 'datos' } };

  const desde = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-${BLOQUEO_CANJE_MIN} minutes')`;
  const { n: fallidos } = await env.DB.prepare(`SELECT COUNT(*) AS n FROM intentos_canje WHERE huella = ? AND creado_en > ${desde}`)
    .bind(huella)
    .first();
  if (fallidos >= INTENTOS_CANJE) return { status: 429, cuerpo: { error: 'bloqueado', minutos: BLOQUEO_CANJE_MIN } };

  const codigo = normalizarCodigo(datos.codigo);
  const fila = codigo ? await env.DB.prepare('SELECT * FROM codigos WHERE codigo = ?').bind(codigo).first() : null;
  if (!fila) {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO intentos_canje (huella) VALUES (?)').bind(huella),
      env.DB.prepare(`DELETE FROM intentos_canje WHERE creado_en < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day')`),
    ]);
    return { status: 404, cuerpo: { error: 'invalido' } };
  }

  // Sólo cambia si sigue disponible: si dos teléfonos lo canjean a la vez,
  // gana uno y el otro ve que ya está usado.
  const { meta } = await env.DB.prepare(
    `UPDATE codigos
        SET estado = 'utilizado', alumno = ?, dispositivo = ?, nombre = ?,
            canjeado_en = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE codigo = ? AND estado = 'disponible'`,
  )
    .bind(alumno, dispositivo, nombre, codigo)
    .run();

  const ahora = await env.DB.prepare('SELECT * FROM codigos WHERE codigo = ?').bind(codigo).first();
  // Si la app se cerró después de canjear y antes de guardarlo, el mismo
  // alumno en el mismo teléfono lo vuelve a pedir: es suyo, no "ya usado".
  const esSuyo = ahora.alumno === alumno && ahora.dispositivo === dispositivo;
  if (meta.changes === 1 || esSuyo) {
    return { status: 200, cuerpo: { ok: true, codigo, logro: ahora.logro, canjeadoEn: ahora.canjeado_en } };
  }
  return { status: 409, cuerpo: { error: 'usado' } };
}

/**
 * POST /api/admin/codigos  { lote, logro, evento, cantidad }  → crea códigos nuevos
 * POST /api/admin/codigos  { lote, logro, codigos: [...] }    → carga códigos ya impresos
 *
 * Devuelve los códigos de la tanda, para imprimir las tarjetas.
 */
export async function cargarCodigos(env, datos) {
  const lote = texto(datos.lote, 64);
  const logro = texto(datos.logro, 64);
  if (!lote || !ID.test(lote)) return { status: 422, cuerpo: { error: 'El lote va en minúsculas, con guiones: hackathon-2026.' } };
  if (!logro || !ID.test(logro)) return { status: 422, cuerpo: { error: 'Falta el id del logro de la app: piko-hackathon-2026.' } };

  let codigos;
  if (Array.isArray(datos.codigos)) {
    codigos = datos.codigos.map(normalizarCodigo);
    const malos = datos.codigos.filter((_, i) => !codigos[i]);
    if (malos.length) return { status: 422, cuerpo: { error: 'Hay códigos con otra forma.', malos: malos.slice(0, 20) } };
  } else {
    const evento = typeof datos.evento === 'string' ? datos.evento.toUpperCase() : '';
    const cantidad = Number(datos.cantidad);
    if (!EVENTO.test(evento)) return { status: 422, cuerpo: { error: 'El evento son 4 letras o números: HK26.' } };
    if (!Number.isInteger(cantidad) || cantidad < 1) return { status: 422, cuerpo: { error: 'La cantidad tiene que ser un número entero.' } };
    codigos = Array.from({ length: cantidad }, () => codigoNuevo(evento));
  }
  codigos = [...new Set(codigos)];
  if (codigos.length > MAX_LOTE) return { status: 422, cuerpo: { error: `Como mucho ${MAX_LOTE} códigos por vez.` } };

  // Los que ya existían no se tocan: cargar dos veces la misma tanda no
  // libera códigos ya canjeados.
  const res = await env.DB.batch(
    codigos.map((c) => env.DB.prepare('INSERT OR IGNORE INTO codigos (codigo, logro, lote) VALUES (?, ?, ?)').bind(c, logro, lote)),
  );
  const nuevos = codigos.filter((_, i) => res[i].meta.changes === 1);
  return { status: 201, cuerpo: { lote, logro, nuevos: nuevos.length, repetidos: codigos.length - nuevos.length, codigos: nuevos } };
}

/** GET /api/admin/codigos?lote=  → cada código con su estado, quién lo canjeó y cuándo. */
export async function listarCodigos(env, lote) {
  const filas = lote
    ? await env.DB.prepare('SELECT * FROM codigos WHERE lote = ? ORDER BY creado_en, codigo').bind(lote).all()
    : await env.DB.prepare('SELECT * FROM codigos ORDER BY lote, creado_en, codigo').all();
  const codigos = filas.results.map((f) => ({
    codigo: f.codigo,
    estado: f.estado,
    logro: f.logro,
    lote: f.lote,
    alumno: f.alumno,
    dispositivo: f.dispositivo,
    nombre: f.nombre,
    canjeadoEn: f.canjeado_en,
  }));
  const utilizados = codigos.filter((c) => c.estado === 'utilizado').length;
  return { status: 200, cuerpo: { total: codigos.length, utilizados, disponibles: codigos.length - utilizados, codigos } };
}
