/**
 * JWT (HS256) para el panel de las encuestas, con Web Crypto: corre igual en
 * Cloudflare Workers y en Node 22 (Azure), sin dependencias.
 *
 * La contraseña (ADMIN_TOKEN) se manda una sola vez, a POST /api/admin/sesion,
 * y a cambio sale un JWT que vence. Todo /api/admin/* pide ese JWT.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

const aB64url = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const deB64url = (s) => Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));

const CABECERA = aB64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
export const EMISOR = 'piko-encuestas';

const llave = (secreto, uso) => crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, [uso]);

/** Firma `datos` y le agrega iss, iat y exp (dentro de `segundos`). */
export async function firmarJwt(datos, secreto, segundos) {
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = aB64url(enc.encode(JSON.stringify({ ...datos, iss: EMISOR, iat: ahora, exp: ahora + segundos })));
  const firma = await crypto.subtle.sign('HMAC', await llave(secreto, 'sign'), enc.encode(`${CABECERA}.${cuerpo}`));
  return `${CABECERA}.${cuerpo}.${aB64url(new Uint8Array(firma))}`;
}

/** Los datos del JWT si la firma, el emisor y el vencimiento están bien; si no, null. */
export async function verificarJwt(jwt, secreto) {
  const partes = String(jwt ?? '').split('.');
  if (partes.length !== 3) return null;
  const [cabecera, cuerpo, firma] = partes;
  try {
    // Solo HS256: un JWT con alg "none" u otro algoritmo no entra.
    if (JSON.parse(dec.decode(deB64url(cabecera))).alg !== 'HS256') return null;
    const ok = await crypto.subtle.verify('HMAC', await llave(secreto, 'verify'), deB64url(firma), enc.encode(`${cabecera}.${cuerpo}`));
    if (!ok) return null;
    const datos = JSON.parse(dec.decode(deB64url(cuerpo)));
    if (datos.iss !== EMISOR || !Number.isFinite(datos.exp) || datos.exp <= Math.floor(Date.now() / 1000)) return null;
    return datos;
  } catch {
    return null;
  }
}
