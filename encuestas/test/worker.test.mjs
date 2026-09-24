import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, { celda } from '../src/index.js';
import { d1Falso } from './d1-falso.mjs';

const real = JSON.parse(readFileSync(new URL('../definiciones/que-le-falta-a-piko.json', import.meta.url), 'utf8'));
const TOKEN = 'secreto-de-prueba';

let env;
beforeEach(() => {
  env = { DB: d1Falso(), ADMIN_TOKEN: TOKEN };
});

function llamar(ruta, { method = 'GET', body, token, headers = {} } = {}) {
  const h = { ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (token) h.authorization = `Bearer ${token}`;
  return worker.fetch(new Request(`https://encuestas.test${ruta}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env);
}

const publicar = (def, token = TOKEN) => llamar(`/api/admin/encuestas/${def.slug}`, { method: 'PUT', body: def, token });

/** Una respuesta completa y válida a la encuesta real. */
function respuestaValida(extra = {}) {
  return {
    id: crypto.randomUUID(),
    version: 1,
    respuestas: {
      rol: 'docente',
      edad: '26_40',
      lenguas_habla: ['espanol', 'miskito'],
      lengua_aprender: ['miskito'],
      telefono: 'propio',
      internet: 'recargas',
      app_funciones: Object.fromEntries(real.secciones[2].preguntas[0].filas.map((f, i) => [f.id, (i % 5) + 1])),
      app_docente: ['presets', 'otro'],
      robot_interes: 5,
      robot_funciones: Object.fromEntries(real.secciones[3].preguntas[1].filas.map((f) => [f.id, 4])),
      robot_correccion: 'pistas',
      robot_confianza: 3,
      robot_garantias: ['sin_internet', 'luz'],
      una_cosa: 'Que cuente las leyendas de mi abuela, = en miskito',
      ...extra,
    },
    otros: { app_docente: 'Juegos para el recreo' },
    duracionSeg: 312,
  };
}

test('sin token no se puede publicar', async () => {
  assert.equal((await publicar(real, 'otro')).status, 401);
  assert.equal((await publicar(real, '')).status, 401);
});

test('publicar crea la versión 1 y republicar igual no crea otra', async () => {
  const r1 = await (await publicar(real)).json();
  assert.deepEqual([r1.version, r1.versionNueva], [1, true]);
  const r2 = await (await publicar(real)).json();
  assert.deepEqual([r2.version, r2.versionNueva], [1, false]);
  const cambiada = structuredClone(real);
  cambiada.secciones[0].preguntas[0].texto = '¿Quién sos?';
  const r3 = await (await publicar(cambiada)).json();
  assert.deepEqual([r3.version, r3.versionNueva], [2, true]);
});

test('cambiar solo el estado no crea versión nueva', async () => {
  await publicar(real);
  const r = await (await publicar({ ...real, estado: 'cerrada' })).json();
  assert.deepEqual([r.estado, r.version, r.versionNueva], ['cerrada', 1, false]);
});

test('una definición rota no se publica', async () => {
  const res = await publicar({ ...real, secciones: [] });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).problemas.length);
});

test('las abiertas se listan; los borradores solo con token', async () => {
  await publicar({ ...real, estado: 'borrador' });
  assert.deepEqual((await (await llamar('/api/encuestas')).json()).encuestas, []);
  assert.equal((await llamar(`/api/encuestas/${real.slug}`)).status, 404);
  assert.equal((await llamar(`/api/encuestas/${real.slug}`, { token: TOKEN })).status, 200);

  await publicar(real);
  const { encuestas } = await (await llamar('/api/encuestas')).json();
  assert.equal(encuestas[0].slug, real.slug);
  const e = await (await llamar(`/api/encuestas/${real.slug}`)).json();
  assert.equal(e.definicion.secciones.length, 5);
});

test('guardar una respuesta válida y agregarla en el resumen', async () => {
  await publicar(real);
  const res = await llamar(`/api/encuestas/${real.slug}/respuestas?origen=whatsapp`, { method: 'POST', body: respuestaValida() });
  assert.equal(res.status, 201);

  const r = await (await llamar(`/api/admin/encuestas/${real.slug}/resumen`, { token: TOKEN })).json();
  assert.equal(r.respuestas, 1);
  const rol = r.preguntas.find((p) => p.id === 'rol');
  assert.equal(rol.opciones.find((o) => o.id === 'docente').n, 1);
  const docente = r.preguntas.find((p) => p.id === 'app_docente');
  assert.deepEqual(docente.otros, ['Juegos para el recreo']);
  const interes = r.preguntas.find((p) => p.id === 'robot_interes');
  assert.equal(interes.promedio, 5);
  const matriz = r.preguntas.find((p) => p.id === 'robot_funciones');
  assert.equal(matriz.filas[0].promedio, 4);
  assert.equal(r.preguntas.find((p) => p.id === 'una_cosa').textos.length, 1);
});

test('reenviar la misma respuesta (señal que se corta) no la duplica', async () => {
  await publicar(real);
  const cuerpo = respuestaValida();
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: cuerpo });
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: cuerpo });
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM respuestas').first();
  const items = await env.DB.prepare('SELECT COUNT(*) AS n FROM respuestas_items WHERE respuesta_id = ?').bind(cuerpo.id).first();
  assert.equal(n, 1);
  assert.ok(items.n > 10);
  const dup = await env.DB.prepare("SELECT COUNT(*) AS n FROM respuestas_items WHERE respuesta_id = ? AND pregunta = 'rol'").bind(cuerpo.id).first();
  assert.equal(dup.n, 1);
});

test('una respuesta incompleta se rechaza con los errores por pregunta', async () => {
  await publicar(real);
  const cuerpo = respuestaValida();
  delete cuerpo.respuestas.robot_interes;
  const res = await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: cuerpo });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).errores.robot_interes);
});

test('una encuesta cerrada no recibe respuestas', async () => {
  await publicar({ ...real, estado: 'cerrada' });
  const res = await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuestaValida() });
  assert.equal(res.status, 410);
});

test('el campo trampa engaña al bot sin guardar nada', async () => {
  await publicar(real);
  const res = await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: { ...respuestaValida(), sitio: 'http://spam' } });
  assert.equal(res.status, 201);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM respuestas').first()).n, 0);
});

test('una respuesta vieja se valida con su versión', async () => {
  await publicar(real);
  const v2 = structuredClone(real);
  v2.secciones[0].preguntas[0].opciones = v2.secciones[0].preguntas[0].opciones.filter((o) => o.id !== 'docente');
  v2.secciones[2].preguntas.find((p) => p.id === 'app_docente').mostrarSi.en = ['institucion'];
  await publicar(v2);
  // Quien empezó en la v1 todavía puede decir "docente".
  const res = await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuestaValida() });
  assert.equal(res.status, 201);
  const fila = await env.DB.prepare('SELECT version FROM respuestas').first();
  assert.equal(fila.version, 1);
});

test('el CSV trae una columna por pregunta y fila, y neutraliza fórmulas', async () => {
  await publicar(real);
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuestaValida({ una_cosa: '=HYPERLINK("x")' }) });
  const res = await llamar(`/api/admin/encuestas/${real.slug}/csv`, { token: TOKEN });
  assert.equal(res.status, 200);
  const csv = await res.text();
  const [cabecera, fila] = csv.replace(/^﻿/, '').trim().split('\r\n');
  assert.ok(cabecera.includes('robot_funciones.guiar'));
  assert.ok(cabecera.includes('app_docente.otro'));
  assert.ok(fila.includes(`"'=HYPERLINK(""x"")"`));
  assert.ok(fila.includes('espanol|miskito'));
});

test('celda escapa comas, comillas y saltos', () => {
  assert.equal(celda('a,b'), '"a,b"');
  assert.equal(celda('di "hola"'), '"di ""hola"""');
  assert.equal(celda(null), '');
  assert.equal(celda(['x', 'y']), 'x|y');
  assert.equal(celda('-1'), "'-1");
});

test('rutas desconocidas y JSON inválido', async () => {
  assert.equal((await llamar('/api/nada')).status, 404);
  await publicar(real);
  const res = await worker.fetch(
    new Request(`https://encuestas.test/api/encuestas/${real.slug}/respuestas`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{roto' }),
    env,
  );
  assert.equal(res.status, 400);
});

test('las respuestas a preguntas que se sacaron siguen en el resumen y el CSV', async () => {
  // v1 tenía una pregunta "contacto" que después se reemplazó
  const v1 = structuredClone(real);
  v1.secciones[4].preguntas = v1.secciones[4].preguntas.filter((p) => !['nombre', 'correo', 'whatsapp'].includes(p.id));
  v1.secciones[4].preguntas.push({ id: 'contacto', tipo: 'texto', texto: '¿Cómo te avisamos?', max: 120 });
  delete v1.correo;
  await publicar(v1);
  await llamar(`/api/encuestas/${real.slug}/respuestas`, { method: 'POST', body: respuestaValida({ contacto: '+505 8888 1234' }) });

  const r2 = await (await publicar(real)).json();
  assert.equal(r2.version, 2);

  const r = await (await llamar(`/api/admin/encuestas/${real.slug}/resumen`, { token: TOKEN })).json();
  const contacto = r.preguntas.find((p) => p.id === 'contacto');
  assert.ok(contacto, 'la pregunta vieja sigue en el resumen');
  assert.equal(contacto.anterior, 1);
  assert.deepEqual(contacto.textos.map((t) => t.texto), ['+505 8888 1234']);
  assert.equal(r.preguntas.find((p) => p.id === 'correo').anterior, null);

  const csv = await (await llamar(`/api/admin/encuestas/${real.slug}/csv`, { token: TOKEN })).text();
  const [cabecera, fila] = csv.replace(/^\uFEFF/, '').trim().split('\r\n');
  assert.ok(cabecera.split(',').includes('contacto'));
  assert.ok(fila.includes('+505 8888 1234'));
});
