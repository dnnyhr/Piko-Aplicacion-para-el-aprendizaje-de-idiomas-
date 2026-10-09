import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { d1Falso } from './d1-falso.mjs';
import { entrar } from './sesion.mjs';

const real = JSON.parse(readFileSync(new URL('../definiciones/que-le-falta-a-piko.json', import.meta.url), 'utf8'));
const TOKEN = 'secreto-de-prueba';

let env;
beforeEach(() => {
  env = { DB: d1Falso(), ADMIN_TOKEN: TOKEN };
});

async function llamar(ruta, { method = 'GET', body, token, jwt, ip = '203.0.113.7' } = {}) {
  const h = { 'cf-connecting-ip': ip };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) {
    const s = await entrar(env, token, h['cf-connecting-ip']);
    if (!s.jwt) return s.res;
    h.authorization = `Bearer ${s.jwt}`;
  }
  if (jwt) h.authorization = `Bearer ${jwt}`;
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
  for (let i = 0; i < 10; i++) assert.equal((await llamar(`/api/encuestas/${real.slug}`, { jwt: `malo-${i}` })).status, 404);
  assert.equal((await llamar(`/api/encuestas/${real.slug}`, { token: TOKEN })).status, 429);
});

test('el panel pide un JWT: la contraseña sola no abre /api/admin', async () => {
  assert.equal((await llamar('/api/admin/encuestas', { jwt: TOKEN })).status, 401);
  const { jwt } = await entrar(env, TOKEN, '203.0.113.7');
  assert.match(jwt, /^[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal((await llamar('/api/admin/encuestas', { jwt })).status, 200);
});

test('un JWT alterado, sin firma (alg none), de otro secreto o vencido no entra', async () => {
  const { firmarJwt } = await import('../src/jwt.js');
  const { jwt } = await entrar(env, TOKEN);
  const [cab, cuerpo] = jwt.split('.');
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString());
  const malos = [
    `${cab}.${b64({ ...datos, exp: datos.exp + 99999 })}.${jwt.split('.')[2]}`,
    `${b64({ alg: 'none', typ: 'JWT' })}.${cuerpo}.`,
    await firmarJwt({ sub: 'admin' }, 'otro-secreto-cualquiera', 3600),
    await firmarJwt({ sub: 'admin' }, `jwt|${TOKEN}`, -1),
  ];
  for (const m of malos) assert.equal((await llamar('/api/admin/encuestas', { jwt: m, ip: '198.51.100.9' })).status, 401);
  // Un JWT bien firmado y vigente sí.
  assert.equal((await llamar('/api/admin/encuestas', { jwt: await firmarJwt({ sub: 'admin' }, `jwt|${TOKEN}`, 60), ip: '198.51.100.9' })).status, 200);
});

test('con JWT_SECRET, los JWT se firman con él y cambiar la contraseña no los corta', async () => {
  env.JWT_SECRET = 'x'.repeat(40);
  const { jwt } = await entrar(env, TOKEN);
  env.ADMIN_TOKEN = 'otra-contraseña-larga-de-prueba';
  assert.equal((await llamar('/api/admin/encuestas', { jwt })).status, 200);
});

test('sin token no cuenta como intento: quien contesta la encuesta no se bloquea', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real, token: TOKEN });
  for (let i = 0; i < 15; i++) assert.equal((await llamar(`/api/encuestas/${real.slug}`)).status, 200);
  assert.equal((await llamar('/api/admin/encuestas', { token: TOKEN })).status, 200);
});

test('un ADMIN_TOKEN corto no abre el panel, sin nombrar nada técnico en pantalla', async () => {
  env.ADMIN_TOKEN = 'corto123';
  const res = await llamar('/api/admin/encuestas', { token: 'corto123' });
  assert.equal(res.status, 503);
  const { error } = await res.json();
  assert.equal(error, 'El panel todavía no está listo para usarse.');
});

test('el panel dice los motivos de los correos sin variables ni códigos', async () => {
  const { detalleAmigable } = await import('../src/correo.js');
  const casos = {
    'Falta configurar: RESEND_API_KEY, APP_DESCARGA_URL': 'El envío de correos todavía no está configurado.',
    '403 · The mugiware.com domain is not verified.': 'El servicio de correo rechazó el envío: hay que revisar su configuración.',
    '401 · Resend no aceptó la API key: revisá RESEND_API_KEY.': 'El servicio de correo rechazó el envío: hay que revisar su configuración.',
    '429 · Too many requests': 'Demasiados envíos seguidos: probá de nuevo en un minuto.',
    'Resend no respondió a tiempo: probá de nuevo.': 'El servicio de correo no respondió a tiempo: probá de nuevo.',
    '500 · internal': 'No se pudo mandar: probá de nuevo.',
    'A esta dirección ya se le mandó el enlace hoy.': 'A esta dirección ya se le mandó el enlace hoy.',
  };
  for (const [crudo, amigable] of Object.entries(casos)) assert.equal(detalleAmigable(crudo), amigable);
  assert.equal(detalleAmigable(null), null);
});

test('la pantalla de entrada del panel no habla de tokens ni del Worker', () => {
  const html = readFileSync(new URL('../public/admin.html', import.meta.url), 'utf8').replace(/<style>[\s\S]*?<\/style>/, '');
  const visible = html.replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(visible, /ADMIN_TOKEN|Worker|Token|CSV/);
});
