import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { d1Falso } from './d1-falso.mjs';

const real = JSON.parse(readFileSync(new URL('../definiciones/que-le-falta-a-piko.json', import.meta.url), 'utf8'));
const TOKEN = 'secreto-de-prueba';

let env;
beforeEach(() => {
  env = { DB: d1Falso(), ADMIN_TOKEN: TOKEN };
});

function llamar(ruta, { method = 'GET', body, token, ip = '203.0.113.7' } = {}) {
  const h = { 'cf-connecting-ip': ip };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = `Bearer ${token}`;
  return worker.fetch(new Request(`https://encuestas.test${ruta}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env);
}

test('toda respuesta del Worker lleva las cabeceras de seguridad', async () => {
  for (const res of [await llamar('/api/salud'), await llamar('/api/no-existe'), await llamar('/api/admin/encuestas')]) {
    assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.match(res.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.match(res.headers.get('strict-transport-security'), /max-age=/);
  }
});

test('public/_headers protege también los archivos estáticos y el panel', () => {
  const h = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.match(h, /^\/\*\n\s+Content-Security-Policy: .*frame-ancestors 'none'/m);
  assert.match(h, /^\/admin\n\s+X-Robots-Tag: noindex/m);
});

test('probar tokens al azar bloquea la IP, aunque después acierte', async () => {
  for (let i = 0; i < 10; i++) assert.equal((await llamar('/api/admin/encuestas', { token: `malo-${i}` })).status, 401);
  const bloqueada = await llamar('/api/admin/encuestas', { token: TOKEN });
  assert.equal(bloqueada.status, 429);
  assert.equal(bloqueada.headers.get('retry-after'), '900');
  assert.match((await bloqueada.json()).error, /Esperá 15 minutos/);

  // Otra IP no paga por la que se bloqueó.
  assert.equal((await llamar('/api/admin/encuestas', { token: TOKEN, ip: '198.51.100.1' })).status, 200);
});

test('los intentos por la ruta pública de la encuesta también cuentan', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: { ...real, estado: 'borrador' }, token: TOKEN });
  for (let i = 0; i < 10; i++) assert.equal((await llamar(`/api/encuestas/${real.slug}`, { token: `malo-${i}` })).status, 404);
  assert.equal((await llamar(`/api/encuestas/${real.slug}`, { token: TOKEN })).status, 429);
});

test('sin token no cuenta como intento: quien contesta la encuesta no se bloquea', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real, token: TOKEN });
  for (let i = 0; i < 15; i++) assert.equal((await llamar(`/api/encuestas/${real.slug}`)).status, 200);
  assert.equal((await llamar('/api/admin/encuestas', { token: TOKEN })).status, 200);
});

test('un ADMIN_TOKEN corto no abre el panel y dice cómo cambiarlo', async () => {
  env.ADMIN_TOKEN = 'corto123';
  const res = await llamar('/api/admin/encuestas', { token: 'corto123' });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /al menos 16 caracteres.*wrangler secret put ADMIN_TOKEN/);
});
