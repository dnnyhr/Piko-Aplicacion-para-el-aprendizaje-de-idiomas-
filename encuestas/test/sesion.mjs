import worker from '../src/index.js';

/**
 * Entra como el panel: la contraseña va a /api/admin/sesion y vuelve un JWT.
 * Devuelve { jwt }, o { res } con la respuesta si no se pudo entrar (401, 429, 503).
 */
export async function entrar(env, clave, ip) {
  const headers = { 'content-type': 'application/json', ...(ip ? { 'cf-connecting-ip': ip } : {}) };
  const res = await worker.fetch(new Request('https://encuestas.test/api/admin/sesion', { method: 'POST', headers, body: JSON.stringify({ clave }) }), env);
  return res.ok ? { jwt: (await res.json()).token } : { res };
}
