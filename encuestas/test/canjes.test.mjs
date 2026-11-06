import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { codigoNuevo, normalizarCodigo } from '../src/codigos.js';
import { INTENTOS_CANJE } from '../src/canjes.js';
import { d1Falso } from './d1-falso.mjs';
import { entrar } from './sesion.mjs';

const TOKEN = 'secreto-de-prueba-largo';

let env;
beforeEach(() => {
  env = { DB: d1Falso(), ADMIN_TOKEN: TOKEN };
});

async function llamar(ruta, { method = 'GET', body, token, ip = '10.0.0.1' } = {}) {
  const h = { 'cf-connecting-ip': ip };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) {
    const s = await entrar(env, token, h['cf-connecting-ip']);
    if (!s.jwt) return s.res;
    h.authorization = `Bearer ${s.jwt}`;
  }
  return worker.fetch(new Request(`https://encuestas.test${ruta}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env);
}

async function tanda(cantidad = 3) {
  const res = await llamar('/api/admin/codigos', {
    method: 'POST',
    token: TOKEN,
    body: { lote: 'hackathon-2026', logro: 'piko-hackathon-2026', evento: 'HK26', cantidad },
  });
  assert.equal(res.status, 201);
  return (await res.json()).codigos;
}

const canje = (codigo, extra = {}) =>
  llamar('/api/canjes', { method: 'POST', body: { codigo, alumno: 'ana', dispositivo: 'tel-1', nombre: 'Ana', ...extra }, ...extra.opciones });

test('los códigos tienen la forma de la tarjeta y se leen como se escriban', () => {
  const c = codigoNuevo('HK26');
  assert.match(c, /^PIKO-HK26-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(normalizarCodigo(c.toLowerCase().replace(/-/g, ' ')), c);
  assert.equal(normalizarCodigo('piko-hk26-7kq2-m9xa'), 'PIKO-HK26-7KQ2-M9XA');
  // O por 0, I y L por 1
  assert.equal(normalizarCodigo('PIKO-HK26-OI2L-M9XA'), 'PIKO-HK26-0121-M9XA');
  assert.equal(normalizarCodigo('PIKO-HK26-A7F3'), null);
  assert.equal(normalizarCodigo('PIKO-HK26-7KQ2-M9XU'), null);
  assert.equal(normalizarCodigo(42), null);
});

test('crear una tanda necesita el token y da códigos distintos', async () => {
  const sin = await llamar('/api/admin/codigos', { method: 'POST', body: { lote: 'x-1', logro: 'y-1', evento: 'HK26', cantidad: 2 } });
  assert.equal(sin.status, 401);
  const codigos = await tanda(50);
  assert.equal(new Set(codigos).size, 50);
  const lista = await (await llamar('/api/admin/codigos?lote=hackathon-2026', { token: TOKEN })).json();
  assert.deepEqual([lista.total, lista.utilizados, lista.disponibles], [50, 0, 50]);
});

test('un código válido se canjea una vez y queda registrado quién y cuándo', async () => {
  const [codigo] = await tanda();
  const res = await canje(codigo.toLowerCase());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  const r = await res.json();
  assert.equal(r.logro, 'piko-hackathon-2026');
  assert.equal(r.codigo, codigo);
  assert.ok(r.canjeadoEn);

  const lista = await (await llamar('/api/admin/codigos', { token: TOKEN })).json();
  const fila = lista.codigos.find((c) => c.codigo === codigo);
  assert.deepEqual([fila.estado, fila.alumno, fila.dispositivo, fila.nombre], ['utilizado', 'ana', 'tel-1', 'Ana']);
  assert.equal(lista.utilizados, 1);
});

test('el mismo código no se canjea dos veces', async () => {
  const [codigo] = await tanda();
  assert.equal((await canje(codigo)).status, 200);
  const otro = await canje(codigo, { alumno: 'beto', dispositivo: 'tel-2' });
  assert.equal(otro.status, 409);
  assert.equal((await otro.json()).error, 'usado');
});

test('el mismo alumno en el mismo teléfono puede volver a pedirlo', async () => {
  const [codigo] = await tanda();
  assert.equal((await canje(codigo)).status, 200);
  assert.equal((await canje(codigo)).status, 200);
  // Pero desde otro teléfono ya no es suyo.
  assert.equal((await canje(codigo, { dispositivo: 'tel-9' })).status, 409);
});

test('un código que no existe no es válido', async () => {
  await tanda();
  const res = await canje('PIKO-HK26-0000-0000');
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'invalido');
  assert.equal((await canje('hola')).status, 404);
});

test('sin alumno o teléfono no se canjea', async () => {
  const [codigo] = await tanda();
  assert.equal((await canje(codigo, { alumno: '' })).status, 400);
  const lista = await (await llamar('/api/admin/codigos', { token: TOKEN })).json();
  assert.equal(lista.utilizados, 0);
});

test('probar códigos al azar bloquea la IP un rato', async () => {
  const [codigo] = await tanda();
  for (let i = 0; i < INTENTOS_CANJE; i++) assert.equal((await canje(`PIKO-HK26-0000-000${i % 10}`)).status, 404);
  const bloqueado = await canje(codigo);
  assert.equal(bloqueado.status, 429);
  // Otra IP (otra aula) sigue pudiendo.
  assert.equal((await canje(codigo, { opciones: { ip: '10.0.0.2' } })).status, 200);
});

test('cargar dos veces la misma tanda no libera los canjeados', async () => {
  const [codigo] = await tanda();
  await canje(codigo);
  const res = await llamar('/api/admin/codigos', {
    method: 'POST',
    token: TOKEN,
    body: { lote: 'hackathon-2026', logro: 'piko-hackathon-2026', codigos: [codigo] },
  });
  assert.deepEqual((await res.json()).repetidos, 1);
  const lista = await (await llamar('/api/admin/codigos', { token: TOKEN })).json();
  assert.equal(lista.codigos.find((c) => c.codigo === codigo).estado, 'utilizado');
});

test('el navegador puede preguntar antes de canjear (CORS)', async () => {
  const res = await llamar('/api/canjes', { method: 'OPTIONS' });
  assert.equal(res.status, 204);
  assert.match(res.headers.get('access-control-allow-methods'), /POST/);
});
