import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { armarCorreo, limpiarNombre, nombreDesdeCorreo } from '../src/correo.js';
import { esCorreo, esTelefono, revisar } from '../public/js/reglas.js';
import { d1Falso } from './d1-falso.mjs';

const real = JSON.parse(readFileSync(new URL('../definiciones/que-le-falta-a-piko.json', import.meta.url), 'utf8'));
const TOKEN = 'secreto-de-prueba';
const CONFIG = {
  RESEND_API_KEY: 're_prueba',
  CORREO_REMITENTE: 'Piko <hola@piko.test>',
  APP_DESCARGA_URL: 'https://piko.test/descargar',
};

/* ------------------------------------------------------------- formatos */

test('formato correo y teléfono', () => {
  assert.ok(esCorreo('ana@correo.com'));
  assert.ok(!esCorreo('ana@correo'));
  assert.ok(!esCorreo('ana correo@x.com'));
  assert.ok(esTelefono('+505 8888 1234'));
  assert.ok(esTelefono('(505) 2222-3333'));
  assert.ok(!esTelefono('1234'));
  assert.ok(!esTelefono('llamame'));
});

test('la encuesta rechaza un correo o teléfono mal escritos', () => {
  const r = revisar(real, { probar: 'si', correo: 'ana@', whatsapp: '12' });
  assert.match(r.errores.correo, /correo/);
  assert.match(r.errores.whatsapp, /número/);
});

/* --------------------------------------------------------------- nombres */

test('nombreDesdeCorreo solo adivina cuando parece un nombre', () => {
  assert.equal(nombreDesdeCorreo('maria.lopez@gmail.com'), 'Maria');
  assert.equal(nombreDesdeCorreo('JUAN_PEREZ@yahoo.com'), 'Juan');
  assert.equal(nombreDesdeCorreo('carla+piko@correo.com'), 'Carla');
  assert.equal(nombreDesdeCorreo('elcrack2009@gmail.com'), null);
  assert.equal(nombreDesdeCorreo('info@escuela.edu.ni'), null);
  assert.equal(nombreDesdeCorreo('jp@correo.com'), null);
});

test('limpiarNombre deja solo el primer nombre, bien escrito', () => {
  assert.equal(limpiarNombre('  maría josé  '), 'María');
  assert.equal(limpiarNombre('ANA'), 'Ana');
  assert.equal(limpiarNombre(''), null);
  assert.equal(limpiarNombre('x'), null);
});

test('el correo escapa lo que escribió la persona', () => {
  const c = armarCorreo({ nombre: '<script>', enlace: 'https://piko.test/d', base: 'https://e.test', encuesta: 'T', asunto: 'A' });
  assert.ok(!c.html.includes('<script>'));
  assert.ok(c.html.includes('&lt;script&gt;'));
  assert.ok(c.html.includes('https://e.test/img/correo-cabecera.jpg'));
  assert.ok(c.texto.includes('https://piko.test/d'));
});

/* --------------------------------------------------- envío desde el Worker */

let env;
let llamadas;
let fetchOriginal;
let pendientes;

beforeEach(() => {
  env = { DB: d1Falso(), ADMIN_TOKEN: TOKEN, ...CONFIG };
  llamadas = [];
  pendientes = [];
  fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, opt) => {
    llamadas.push({ url: String(url), opt, cuerpo: JSON.parse(opt.body) });
    return new Response(JSON.stringify({ id: 'resend-123' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
});
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

const ctx = { waitUntil: (p) => pendientes.push(p) };

async function llamar(ruta, { method = 'GET', body, token } = {}) {
  const h = {};
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = `Bearer ${token}`;
  const res = await worker.fetch(
    new Request(`https://encuestas.test${ruta}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }),
    env,
    ctx,
  );
  await Promise.all(pendientes);
  return res;
}

function respuesta(extra = {}) {
  return {
    id: crypto.randomUUID(),
    version: 1,
    respuestas: {
      rol: 'estudiante',
      edad: '12_17',
      lenguas_habla: ['espanol'],
      lengua_aprender: ['miskito'],
      telefono: 'propio',
      internet: 'recargas',
      app_funciones: Object.fromEntries(real.secciones[2].preguntas[0].filas.map((f) => [f.id, 3])),
      robot_interes: 4,
      robot_funciones: Object.fromEntries(real.secciones[3].preguntas[1].filas.map((f) => [f.id, 4])),
      robot_correccion: 'pistas',
      robot_confianza: 4,
      probar: 'si',
      ...extra,
    },
    otros: {},
  };
}

const correos = () => env.DB.prepare('SELECT * FROM correos').all().then((r) => r.results);

test('si deja su correo, se manda el enlace por Resend, con su nombre', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real, token: TOKEN });
  const cuerpo = respuesta({ nombre: 'valeria', correo: 'vale@correo.com', whatsapp: '+505 8888 1234' });
  const res = await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: cuerpo });
  assert.equal(res.status, 201);

  assert.equal(llamadas.length, 1);
  const [l] = llamadas;
  assert.equal(l.url, 'https://api.resend.com/emails');
  assert.equal(l.opt.headers.authorization, 'Bearer re_prueba');
  assert.equal(l.opt.headers['idempotency-key'], `bienvenida-${cuerpo.id}`);
  assert.deepEqual(l.cuerpo.to, ['vale@correo.com']);
  assert.equal(l.cuerpo.from, CONFIG.CORREO_REMITENTE);
  assert.match(l.cuerpo.html, /¡Gracias, Valeria!/);
  assert.ok(l.cuerpo.html.includes(CONFIG.APP_DESCARGA_URL));
  assert.ok(l.cuerpo.html.includes('https://encuestas.test/img/correo-cabecera.jpg'));
  assert.match(l.cuerpo.text, /Descargar Piko: https:\/\/piko\.test\/descargar/);

  const [c] = await correos();
  assert.deepEqual([c.estado, c.resend_id, c.para], ['enviado', 'resend-123', 'vale@correo.com']);
});

test('sin nombre, lo adivina del correo cuando se puede', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real, token: TOKEN });
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuesta({ correo: 'rosa.mejia@correo.com' }) });
  assert.match(llamadas[0].cuerpo.html, /¡Gracias, Rosa!/);
});

test('reenviar la misma respuesta no manda el correo dos veces', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real, token: TOKEN });
  const cuerpo = respuesta({ correo: 'ana@correo.com' });
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: cuerpo });
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: cuerpo });
  assert.equal(llamadas.length, 1);
});

test('solo teléfono, o sin contacto: no se manda nada', async () => {
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real, token: TOKEN });
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuesta({ whatsapp: '88881234' }) });
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuesta({ probar: 'no' }) });
  assert.equal(llamadas.length, 0);
  assert.equal((await correos()).length, 0);
});

test('sin configurar Resend, no manda y lo anota como omitido', async () => {
  delete env.RESEND_API_KEY;
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real, token: TOKEN });
  const res = await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuesta({ correo: 'ana@correo.com' }) });
  assert.equal(res.status, 201);
  assert.equal(llamadas.length, 0);
  const [c] = await correos();
  assert.equal(c.estado, 'omitido');
  assert.match(c.detalle, /RESEND_API_KEY/);
});

test('si Resend falla, la respuesta se guarda igual y queda el error anotado', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ name: 'validation_error', message: 'domain not verified' }), { status: 403 });
  await llamar(`/api/admin/encuestas/${real.slug}`, { method: 'PUT', body: real, token: TOKEN });
  const res = await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuesta({ correo: 'ana@correo.com' }) });
  assert.equal(res.status, 201);
  const [c] = await correos();
  assert.equal(c.estado, 'error');
  assert.match(c.detalle, /403 domain not verified/);
  const r = await (await llamar(`/api/admin/encuestas/${real.slug}/resumen`, { token: TOKEN })).json();
  assert.deepEqual(r.correos, { error: 1 });
});
