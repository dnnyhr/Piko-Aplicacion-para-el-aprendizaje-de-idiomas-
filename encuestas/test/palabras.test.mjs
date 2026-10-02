import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { agrupar, armarPaquetes, clavePalabra } from '../src/palabras.js';
import { aFilas, limpiarTraducciones, muestraDelBanco, revisar, validarDefinicion } from '../public/js/reglas.js';
import { d1Falso } from './d1-falso.mjs';

const def = JSON.parse(readFileSync(new URL('../definiciones/tu-lengua.json', import.meta.url), 'utf8'));
const palabras = def.secciones[1].preguntas[0];
const frases = def.secciones[2].preguntas[0];
const TOKEN = 'secreto-de-prueba';

/* ------------------------------------------------------------- reglas */

test('la definición de "Tu lengua en Piko" está bien armada', () => {
  assert.deepEqual(validarDefinicion(def), []);
  assert.equal(palabras.banco.length, 120);
  assert.equal(frases.banco.length, 15);
});

test('a cada persona le toca una muestra distinta del banco, sin repetir', () => {
  const a = muestraDelBanco(palabras);
  assert.equal(a.length, 10);
  assert.equal(new Set(a).size, 10);
  let semilla = 1;
  const fija = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647);
  assert.notDeepEqual(muestraDelBanco(palabras, fija), muestraDelBanco(palabras, fija));
});

test('traducir: las que quedan en blanco no cuentan, y no se aceptan cosas fuera del banco', () => {
  assert.deepEqual(limpiarTraducciones({ agua: '  li ', sol: '   ', luna: 'x' }), { agua: 'li', luna: 'x' });
  const seccion = def.secciones[1];
  assert.equal(revisar(def, { palabras: { agua: 'li', inventada: 'x' } }, {}, seccion).errores.palabras, 'Hay una palabra que no está en la lista.');
  // Quien elige "todas" puede escribir el banco entero.
  const todas = Object.fromEntries(palabras.banco.map((b) => [b.id, 'x']));
  assert.ok(revisar(def, { palabras: todas }, {}, seccion).ok);
  const r = revisar(def, { palabras: { agua: ' li ', sol: '' } }, {}, seccion);
  assert.ok(r.ok);
  assert.deepEqual(r.limpias.palabras, { agua: 'li' });
  assert.deepEqual(aFilas(def, r.limpias), [{ pregunta: 'palabras', fila: 'agua', opcion: null, numero: null, texto: 'li' }]);
});

test('validarDefinicion revisa el banco y a qué apuntan lengua y zona', () => {
  const malo = structuredClone(def);
  const p = malo.secciones[1].preguntas[0];
  p.cuantas = 500;
  p.banco.push({ ...p.banco[0] });
  p.zona = 'no_existe';
  const problemas = validarDefinicion(malo).join('\n');
  assert.match(problemas, /cuantas/);
  assert.match(problemas, /repetido en el banco "hola"/);
  assert.match(problemas, /zona tiene que apuntar/);
});

/* ------------------------------------------------------------ agrupar */

test('agrupa las respuestas iguales aunque cambien mayúsculas y signos', () => {
  assert.equal(clavePalabra(' ¡Li! '), 'li');
  assert.equal(clavePalabra('“Naha”'), 'naha');
  const filas = [
    { item: 'agua', texto: 'Li', grupo: 'miskito', zona: 'bilwi', respuesta: 'r1' },
    { item: 'agua', texto: 'li.', grupo: 'miskito', zona: 'rio_coco', respuesta: 'r2' },
    { item: 'agua', texto: 'li', grupo: 'miskito', zona: 'bilwi', respuesta: 'r3' },
    { item: 'agua', texto: 'otra', grupo: 'miskito', zona: 'bilwi', respuesta: 'r4' },
    { item: 'agua', texto: 'was', grupo: 'mayangna', zona: 'bosawas', respuesta: 'r5' },
  ];
  const { grupos, items } = agrupar(filas, new Set(['agua|miskito|li']));
  assert.equal(grupos.get('miskito').personas, 4);
  const [li, otra] = items.get('agua').get('miskito');
  assert.deepEqual([li.clave, li.n, li.zonas, li.probable, li.confirmada], ['li', 3, 2, true, true]);
  assert.deepEqual([otra.n, otra.probable, otra.confirmada], [1, false, false]);
  assert.equal(items.get('agua').get('mayangna')[0].n, 1);
});

test('los paquetes que se exportan cumplen el formato de la app', () => {
  const confirmadas = [
    { pregunta: 'palabras', item: 'agua', texto: 'aaa' },
    { pregunta: 'palabras', item: 'arroz', texto: 'bbb' },
    { pregunta: 'palabras', item: 'yuca', texto: 'ccc' },
    { pregunta: 'palabras', item: 'rojo', texto: 'ddd' }, // único de su tema: no alcanza para opciones
    { pregunta: 'frases', item: 'quiero_agua', texto: 'uno dos' },
    { pregunta: 'frases', item: 'tengo_hambre', texto: 'tres cuatro cinco' },
  ];
  const paquetes = armarPaquetes({ codigo: 'miq', lengua: 'miskito', preguntas: [palabras, frases], confirmadas });
  assert.deepEqual(paquetes.map((p) => p.id), ['miq-comida', 'miq-frases']);
  const [comida, fr] = paquetes;
  assert.equal(comida.title, 'Comida en miskito');
  for (const it of comida.items) {
    assert.equal(it.type, 'choice');
    assert.ok(it.options.includes(it.answer));
    assert.equal(new Set(it.options).size, it.options.length);
    assert.ok(it.options.length >= 2 && it.options.length <= 4);
  }
  assert.equal(comida.items[0].prompt, '¿Cómo se dice «agua»?');
  for (const it of fr.items) {
    assert.equal(it.type, 'build');
    for (const w of it.target.split(' ')) assert.ok(it.blocks.includes(w));
  }
});

/* ------------------------------------------------ de punta a punta */

let env;
beforeEach(() => {
  env = { DB: d1Falso(), ADMIN_TOKEN: TOKEN };
});
const llamar = (ruta, { method = 'GET', body, token } = {}) =>
  worker.fetch(
    new Request(`https://encuestas.test${ruta}`, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env,
    { waitUntil() {} },
  );

function respuesta(lengua, region, traducciones, permiso = 'si') {
  return {
    id: crypto.randomUUID(),
    version: 1,
    respuestas: {
      lengua, region, nivel: 'materna', palabras: traducciones, permiso,
      ...(permiso === 'si' ? { credito: 'anonimo' } : {}),
    },
    otros: {},
  };
}

test('responder, ver las palabras agrupadas, confirmar y exportar para la app', async () => {
  assert.equal((await llamar(`/api/admin/encuestas/${def.slug}`, { method: 'PUT', body: def, token: TOKEN })).status, 200);
  const mandar = async (r) => assert.equal((await llamar(`/api/encuestas/${def.slug}/respuestas`, { method: 'POST', body: r })).status, 201);
  await mandar(respuesta('miskito', 'bilwi', { agua: 'aaa', arroz: 'bbb' }));
  await mandar(respuesta('miskito', 'rio_coco', { agua: 'Aaa.' }));
  await mandar(respuesta('miskito', 'bilwi', { agua: 'aaa' }));
  await mandar(respuesta('miskito', 'bilwi', { agua: 'NO USAR' }, 'no'));

  const v = await (await llamar(`/api/admin/encuestas/${def.slug}/palabras`, { token: TOKEN })).json();
  assert.equal(v.sinPermiso, 1);
  const p = v.preguntas.find((q) => q.id === 'palabras');
  assert.deepEqual(p.grupos.map((g) => [g.id, g.codigo, g.personas]), [['miskito', 'miq', 3]]);
  const agua = p.items.find((i) => i.id === 'agua').porGrupo.miskito;
  assert.deepEqual(agua.map((x) => [x.texto, x.n, x.zonas, x.probable]), [['aaa', 3, 2, true]]);

  for (const [item, texto] of [['agua', 'aaa'], ['arroz', 'bbb']]) {
    const r = await llamar(`/api/admin/encuestas/${def.slug}/palabras/confirmar`, { method: 'POST', token: TOKEN, body: { pregunta: 'palabras', item, grupo: 'miskito', texto } });
    assert.equal(r.status, 200);
  }
  const v2 = await (await llamar(`/api/admin/encuestas/${def.slug}/palabras`, { token: TOKEN })).json();
  assert.equal(v2.preguntas[0].items.find((i) => i.id === 'agua').porGrupo.miskito[0].confirmada, true);

  const ex = await llamar(`/api/admin/encuestas/${def.slug}/palabras/exportar?grupo=miskito`, { token: TOKEN });
  assert.match(ex.headers.get('content-disposition'), /tu-lengua-miq\.json/);
  const datos = await ex.json();
  assert.deepEqual(datos.palabras.map((x) => [x.es, x.texto]), [['agua', 'aaa'], ['arroz', 'bbb']]);
  assert.deepEqual(datos.paquetes.map((x) => x.id), ['miq-comida']);

  // Quitar la confirmación
  await llamar(`/api/admin/encuestas/${def.slug}/palabras/confirmar`, { method: 'POST', token: TOKEN, body: { pregunta: 'palabras', item: 'arroz', grupo: 'miskito', texto: 'bbb', confirmada: false } });
  const ex2 = await (await llamar(`/api/admin/encuestas/${def.slug}/palabras/exportar?grupo=miskito`, { token: TOKEN })).json();
  assert.deepEqual(ex2.paquetes, []);

  // El CSV muestra la palabra en español al lado de la traducción
  const csv = await (await llamar(`/api/admin/encuestas/${def.slug}/csv`, { token: TOKEN })).text();
  assert.match(csv, /agua: aaa \| arroz: bbb/);
});

test('palabras y exportar piden la contraseña', async () => {
  assert.equal((await llamar(`/api/admin/encuestas/${def.slug}/palabras`)).status, 401);
  assert.equal((await llamar(`/api/admin/encuestas/${def.slug}/palabras/exportar?grupo=miskito`)).status, 401);
});
