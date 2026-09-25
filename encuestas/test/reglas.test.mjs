import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aFilas, esVisible, revisar, validarDefinicion } from '../public/js/reglas.js';

const real = JSON.parse(readFileSync(new URL('../definiciones/que-le-falta-a-piko.json', import.meta.url), 'utf8'));

const mini = {
  slug: 'mini',
  titulo: 'Mini',
  secciones: [
    {
      titulo: 'Una',
      preguntas: [
        { id: 'rol', tipo: 'unica', requerida: true, texto: '¿Rol?', opciones: [{ id: 'a', texto: 'A' }, { id: 'b', texto: 'B' }, { id: 'otro', texto: 'Otro', otro: true }] },
        { id: 'solo_b', tipo: 'texto', requerida: true, texto: 'Solo B', mostrarSi: { pregunta: 'rol', en: ['b'] } },
        { id: 'cadena', tipo: 'texto', texto: 'Depende de solo_b', mostrarSi: { pregunta: 'rol', en: ['b'] } },
        { id: 'varias', tipo: 'multiple', max: 2, texto: '¿Varias?', opciones: [{ id: 'x', texto: 'X' }, { id: 'y', texto: 'Y' }, { id: 'z', texto: 'Z' }] },
        { id: 'nota', tipo: 'escala', min: 0, max: 10, texto: '¿Nota?' },
        { id: 'm', tipo: 'matriz', requerida: true, texto: 'Matriz', escala: { min: 1, max: 5 }, filas: [{ id: 'f1', texto: 'F1' }, { id: 'f2', texto: 'F2' }] },
      ],
    },
  ],
};

test('la encuesta real está bien armada', () => {
  assert.deepEqual(validarDefinicion(real), []);
});

test('la encuesta del robot presenta el concepto: guía, escucha y corrige con IA', () => {
  const robot = real.secciones.find((s) => s.id === 'robot');
  assert.match(robot.concepto.titulo, /guía, escucha y corrige con IA/);
  assert.deepEqual(robot.concepto.pilares.map((p) => p.id), ['guia', 'escucha', 'corrige']);
});

test('validarDefinicion encuentra los errores típicos', () => {
  const mala = structuredClone(mini);
  mala.slug = 'Con Espacios';
  mala.secciones[0].preguntas.push({ id: 'rol', tipo: 'unica', texto: 'dup', opciones: [{ id: 'a', texto: 'A' }] });
  mala.secciones[0].preguntas.push({ id: 'huerfana', tipo: 'texto', texto: 'h', mostrarSi: { pregunta: 'no_existe', en: ['a'] } });
  mala.secciones[0].preguntas.push({ id: 'mala_op', tipo: 'texto', texto: 'h', mostrarSi: { pregunta: 'rol', en: ['zzz'] } });
  const e = validarDefinicion(mala).join('\n');
  assert.match(e, /slug/);
  assert.match(e, /id repetido/);
  assert.match(e, /al menos 2 opciones/);
  assert.match(e, /no_existe/);
  assert.match(e, /"zzz"/);
});

test('esVisible sigue la condición', () => {
  const p = mini.secciones[0].preguntas[1];
  assert.equal(esVisible(mini, p, { rol: 'a' }), false);
  assert.equal(esVisible(mini, p, { rol: 'b' }), true);
  assert.equal(esVisible(mini, p, {}), false);
});

test('revisar pide lo requerido y respeta los límites', () => {
  const r = revisar(mini, { rol: 'b', varias: ['x', 'y', 'z'], nota: 11, m: { f1: 3 } });
  assert.equal(r.ok, false);
  assert.ok(r.errores.solo_b);
  assert.match(r.errores.varias, /máximo 2/);
  assert.match(r.errores.nota, /0 al 10/);
  assert.match(r.errores.m, /faltan/);
});

test('revisar descarta respuestas de preguntas ocultas o inexistentes', () => {
  const r = revisar(mini, { rol: 'a', solo_b: 'no debería quedar', inventada: 'x', m: { f1: 1, f2: 5 } });
  assert.equal(r.ok, true);
  assert.deepEqual(r.limpias, { rol: 'a', m: { f1: 1, f2: 5 } });
});

test('"otro" pide el texto y solo se guarda si se eligió', () => {
  assert.match(revisar(mini, { rol: 'otro', m: { f1: 1, f2: 1 } }).errores.rol, /otra opción/);
  const ok = revisar(mini, { rol: 'otro', m: { f1: 1, f2: 1 } }, { rol: '  maestra jubilada ' });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.otros, { rol: 'maestra jubilada' });
  const sin = revisar(mini, { rol: 'a', m: { f1: 1, f2: 1 } }, { rol: 'sobra' });
  assert.deepEqual(sin.otros, {});
});

test('revisar rechaza opciones y tipos que no existen', () => {
  assert.ok(revisar(mini, { rol: 'zzz' }).errores.rol);
  assert.ok(revisar(mini, { rol: ['a'] }).errores.rol);
  assert.ok(revisar(mini, { rol: 'a', m: { f1: 1, f9: 1 } }).errores.m);
  assert.ok(revisar(mini, { rol: 'a', m: { f1: 1.5, f2: 1 } }).errores.m);
});

test('aFilas deja una fila por cosa contable', () => {
  const r = revisar(mini, { rol: 'otro', varias: ['x', 'z'], nota: 7, m: { f1: 2, f2: 4 } }, { rol: 'abuela' });
  const filas = aFilas(mini, r.limpias, r.otros);
  assert.deepEqual(
    filas.map((f) => [f.pregunta, f.fila, f.opcion, f.numero, f.texto]),
    [
      ['rol', null, 'otro', null, 'abuela'],
      ['varias', null, 'x', null, null],
      ['varias', null, 'z', null, null],
      ['nota', null, null, 7, null],
      ['m', 'f1', null, 2, null],
      ['m', 'f2', null, 4, null],
    ],
  );
});

test('la encuesta real: preguntas para docentes solo aparecen a docentes', () => {
  const docente = real.secciones.flatMap((s) => s.preguntas).find((p) => p.id === 'app_docente');
  assert.equal(esVisible(real, docente, { rol: 'estudiante' }), false);
  assert.equal(esVisible(real, docente, { rol: 'docente' }), true);
});

test('imagen: solo una ruta dentro de public/img', () => {
  const base = { slug: 'x', titulo: 'X', secciones: [{ titulo: 'S', preguntas: [{ id: 'a', tipo: 'texto', texto: 'A' }] }] };
  assert.deepEqual(validarDefinicion({ ...base, imagen: '/img/og-x.jpg' }), []);
  for (const mala of ['https://otro.com/x.jpg', '/img/../secreto.jpg', 'og.jpg', '/img/x.svg']) {
    assert.equal(validarDefinicion({ ...base, imagen: mala }).length, 1, mala);
  }
});
