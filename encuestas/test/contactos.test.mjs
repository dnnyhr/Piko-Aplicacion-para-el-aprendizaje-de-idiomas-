import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { leerContactos, normalizarTelefono } from '../src/contactos.js';
import { d1Falso } from './d1-falso.mjs';

const real = JSON.parse(readFileSync(new URL('../definiciones/que-le-falta-a-piko.json', import.meta.url), 'utf8'));
const TOKEN = 'secreto-de-prueba';

test('lee nombre, correo y número de cada línea', () => {
  const { contactos, invalidas } = leerContactos(
    'Ana López, ana@correo.com\n+505 8888 1234\nCarlos — carlos@correo.com — 8888-5555\n\nhola que tal\nJUAN@CORREO.COM',
  );
  assert.deepEqual(contactos, [
    { nombre: 'Ana López', correo: 'ana@correo.com', telefono: null },
    { nombre: null, correo: null, telefono: '+50588881234' },
    { nombre: 'Carlos', correo: 'carlos@correo.com', telefono: '88885555' },
    { nombre: null, correo: 'juan@correo.com', telefono: null },
  ]);
  assert.deepEqual(invalidas, ['hola que tal']);
  assert.equal(normalizarTelefono('8888-1234'), normalizarTelefono('8888 1234'));
});

let env;
let llamadas;
let fetchOriginal;
beforeEach(() => {
  env = { DB: d1Falso(), ADMIN_TOKEN: TOKEN, RESEND_API_KEY: 're_prueba', CORREO_REMITENTE: 'Piko <hola@piko.test>', APP_DESCARGA_URL: 'https://piko.test/apk' };
  llamadas = [];
  fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, opt) => {
    llamadas.push({ url: String(url), opt, cuerpo: JSON.parse(opt.body) });
    return new Response(JSON.stringify({ id: `re-${llamadas.length}` }), { status: 200 });
  };
});
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

async function llamar(ruta, { method = 'GET', body, token = TOKEN } = {}) {
  const h = {};
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = `Bearer ${token}`;
  return worker.fetch(new Request(`https://encuestas.test${ruta}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env, { waitUntil() {} });
}
const agregar = (texto, enviar) => llamar(`/api/admin/encuestas/${real.slug}/contactos`, { method: 'POST', body: { texto, enviar } });
const lista = async () => (await (await llamar(`/api/admin/encuestas/${real.slug}/contactos`)).json()).contactos;

test('agregar contactos viejos y mandarles el enlace, sin repetir', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real });
  const r = await (await agregar('Rosa Mejía, rosa@correo.com\n+505 8888 1234\nesto no', true)).json();
  assert.deepEqual([r.agregados, r.repetidos, r.enviado, r.error, r.invalidas], [2, 0, 1, 0, ['esto no']]);

  assert.equal(llamadas.length, 1);
  assert.deepEqual(llamadas[0].cuerpo.to, ['rosa@correo.com']);
  assert.match(llamadas[0].cuerpo.html, /¡Tuani, Rosa!/);
  assert.ok(llamadas[0].cuerpo.html.includes('https://piko.test/apk'));

  const otra = await (await agregar('ROSA@correo.com\n8888 1234\n+505 8888 1234', true)).json();
  assert.deepEqual([otra.agregados, otra.repetidos], [1, 2], 'el mismo correo y el mismo número no se repiten');
  assert.equal((await lista()).length, 3);
});

test('sin marcar "mandar", solo los guarda; después se manda y se reenvía uno', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real });
  await agregar('ana@correo.com', false);
  assert.equal(llamadas.length, 0);
  const [c] = await lista();
  assert.equal(c.correo_estado, null);

  const r1 = await (await llamar(`/api/admin/contactos/${c.id}/enviar`, { method: 'POST' })).json();
  const r2 = await (await llamar(`/api/admin/contactos/${c.id}/enviar`, { method: 'POST' })).json();
  assert.deepEqual([r1.estado, r2.estado, r2.intentos], ['enviado', 'enviado', 2]);
  assert.deepEqual(
    llamadas.map((l) => l.opt.headers['idempotency-key']),
    [`contacto-${c.id}-1`, `contacto-${c.id}-2`],
  );
});

test('un contacto con solo número no se puede mandar; borrar y token', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real });
  await agregar('88881234', true);
  const [c] = await lista();
  assert.equal((await llamar(`/api/admin/contactos/${c.id}/enviar`, { method: 'POST' })).status, 422);
  assert.equal((await llamar(`/api/admin/contactos/${c.id}`, { method: 'DELETE', token: 'mal' })).status, 401);
  assert.equal((await llamar(`/api/admin/contactos/${c.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await lista()).length, 0);
});

test('los contactos a mano no cuentan como respuestas', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real });
  await agregar('ana@correo.com\nbeto@correo.com', false);
  const r = await (await llamar(`/api/admin/encuestas/${real.slug}/resumen`)).json();
  assert.equal(r.respuestas, 0);
});
