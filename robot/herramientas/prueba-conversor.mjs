/**
 * Prueba del conversor de Piskel.
 *
 *   node robot/herramientas/prueba-conversor.mjs
 *
 * Lo que se verifica es el empaquetado, que es donde un error no se ve: si un
 * bit queda del lado equivocado, el dibujo sale espejado o corrido ocho píxeles
 * y uno culpa a la pantalla. Acá se arma una exportación de Piskel con píxeles
 * en posiciones conocidas y se comprueba byte por byte qué sale.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ANCHO = 128, ALTO = 64;
const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const CONVERSOR = path.join(AQUI, 'piskel-a-cara.mjs');
const TEMPORAL = fs.mkdtempSync(path.join(os.tmpdir(), 'piko-'));

const BLANCO = 0xffffffff;   // opaco y claro   → encendido
const NEGRO  = 0xff000000;   // opaco y oscuro  → apagado
const NADA   = 0x00000000;   // transparente    → apagado

let fallas = 0;
function comprobar(nombre, ok, extra) {
  console.log(`${ok ? '  ok  ' : ' FALLA'}  ${nombre}`);
  if (!ok) { fallas++; if (extra) console.log(`        ${extra}`); }
}

/** Arma un archivo con la pinta del que exporta Piskel. */
function exportacionPiskel(cuadros, nombre = 'espera') {
  const cuerpo = cuadros
    .map((px) => '{ ' + Array.from(px).map((v) => '0x' + (v >>> 0).toString(16).padStart(8, '0')).join(', ') + ' }')
    .join(',\n');
  const texto =
    `#include <stdint.h>\n` +
    `#define ${nombre}_FRAME_COUNT ${cuadros.length}\n` +
    `#define ${nombre}_FRAME_WIDTH ${ANCHO}\n` +
    `#define ${nombre}_FRAME_HEIGHT ${ALTO}\n` +
    `/* Piskel data for "${nombre}" */\n` +
    `static const uint32_t ${nombre}_data[${cuadros.length}][${ANCHO * ALTO}] = {\n${cuerpo}\n};\n`;
  const ruta = path.join(TEMPORAL, `${nombre}.c`);
  fs.writeFileSync(ruta, texto);
  return ruta;
}

/** Un cuadro apagado con los píxeles pedidos en blanco. */
function cuadroCon(puntos, fondo = NEGRO) {
  const px = new Uint32Array(ANCHO * ALTO).fill(fondo);
  for (const [x, y] of puntos) px[y * ANCHO + x] = BLANCO;
  return px;
}

function convertir(ruta, nombre, ms, ...opciones) {
  return execFileSync(process.execPath, [CONVERSOR, ruta, nombre, String(ms), '--sin-vista', ...opciones], {
    encoding: 'utf8',
  });
}

/** Saca los bytes del primer arreglo que aparezca en la salida. */
function bytesDe(salida, indice = 1) {
  const m = salida.match(new RegExp(`_${indice}\\[\\] = \\{([\\s\\S]*?)\\};`));
  if (!m) return null;
  return (m[1].match(/0x[0-9a-f]{2}/g) || []).map(Number);
}

// ═════════════════════════════════════════════════════════════════════════

console.log('\nEmpaquetado — el bit más significativo es el píxel de la izquierda\n');

{
  const salida = convertir(exportacionPiskel([cuadroCon([[0, 0]])]), 'espera', 250);
  const b = bytesDe(salida);
  comprobar('1024 bytes por cuadro', b && b.length === 1024, `salieron ${b && b.length}`);
  comprobar('el píxel (0,0) prende el bit más alto del byte 0', b && b[0] === 0x80, `byte 0 = ${b && b[0]}`);
}

{
  const b = bytesDe(convertir(exportacionPiskel([cuadroCon([[7, 0]])]), 'espera', 250));
  comprobar('el píxel (7,0) prende el bit más bajo del byte 0', b[0] === 0x01, `byte 0 = ${b[0]}`);
}

{
  const b = bytesDe(convertir(exportacionPiskel([cuadroCon([[8, 0]])]), 'espera', 250));
  comprobar('el píxel (8,0) salta al byte 1', b[0] === 0x00 && b[1] === 0x80, `bytes 0,1 = ${b[0]},${b[1]}`);
}

{
  const b = bytesDe(convertir(exportacionPiskel([cuadroCon([[0, 1]])]), 'espera', 250));
  comprobar('la fila 1 arranca en el byte 16', b[0] === 0x00 && b[16] === 0x80, `byte 16 = ${b[16]}`);
}

{
  const b = bytesDe(convertir(exportacionPiskel([cuadroCon([[127, 63]])]), 'espera', 250));
  comprobar('la esquina (127,63) cae en el último bit', b[1023] === 0x01, `byte 1023 = ${b[1023]}`);
}

console.log('\nQué cuenta como encendido, según cómo se dibujó\n');

/** Cuenta los píxeles encendidos de un cuadro empaquetado. */
const prendidos = (b) => b.reduce((n, x) => n + x.toString(2).split('1').length - 1, 0);

{
  // El caso real: se dibuja en Piskel sobre el fondo transparente, y el color
  // del trazo no significa nada. Es lo que salió de las caras de Piko.
  const px = new Uint32Array(ANCHO * ALTO).fill(NADA);
  px[0] = NEGRO;
  px[1] = NEGRO;
  const b = bytesDe(convertir(exportacionPiskel([px]), 'espera', 250));
  comprobar('el trazo negro sobre transparente queda encendido', b[0] === 0xc0, `byte 0 = ${b && b[0]}`);
  comprobar('el fondo transparente queda apagado', prendidos(b) === 2, `${prendidos(b)} encendidos`);
}

{
  const px = new Uint32Array(ANCHO * ALTO).fill(NADA);
  px[0] = BLANCO;
  const b = bytesDe(convertir(exportacionPiskel([px]), 'espera', 250));
  comprobar('el trazo blanco sobre transparente también', b[0] === 0x80 && prendidos(b) === 1);
}

{
  // Con dos colores opacos ya hay claros y oscuros que distinguir, y ahí el
  // criterio cambia solo a luminosidad.
  const px = new Uint32Array(ANCHO * ALTO).fill(NEGRO);
  px[0] = BLANCO;
  const b = bytesDe(convertir(exportacionPiskel([px]), 'espera', 250));
  comprobar('con fondo negro opaco, prende sólo lo blanco', b[0] === 0x80 && prendidos(b) === 1);
}

{
  const px = new Uint32Array(ANCHO * ALTO).fill(BLANCO);
  px[0] = NEGRO;
  const b = bytesDe(convertir(exportacionPiskel([px]), 'espera', 250, '--invertir'));
  comprobar('--invertir rescata el dibujo negro sobre blanco', b[0] === 0x80 && prendidos(b) === 1);
}

{
  const px = new Uint32Array(ANCHO * ALTO).fill(NADA);
  px[0] = NEGRO;
  const b = bytesDe(convertir(exportacionPiskel([px]), 'espera', 250, '--por-luz'));
  comprobar('--por-luz fuerza el otro criterio', prendidos(b) === 0, `${prendidos(b)} encendidos`);
}

console.log('\nVarios cuadros\n');

{
  const salida = convertir(
    exportacionPiskel([cuadroCon([[0, 0]]), cuadroCon([[1, 0]]), cuadroCon([[2, 0]])]),
    'riendo', 200
  );
  comprobar('saca los tres arreglos', /riendo_1\[\]/.test(salida) && /riendo_2\[\]/.test(salida) && /riendo_3\[\]/.test(salida));
  comprobar('arma la lista de cuadros', salida.includes('const uint8_t* const RIENDO[] = { riendo_1, riendo_2, riendo_3 };'));
  comprobar('arma el #define con la cuenta y el intervalo', salida.includes('#define ANIM_RIENDO { RIENDO, 3, 200 }'));
  comprobar('le pone PROGMEM a cada cuadro', (salida.match(/PROGMEM/g) || []).length === 3);
  const b2 = bytesDe(salida, 2);
  comprobar('cada cuadro lleva su propio dibujo', b2[0] === 0x40, `byte 0 del cuadro 2 = ${b2[0]}`);
}

console.log('\nErrores que tienen que doler\n');

function falla(fn) {
  try { fn(); return false; } catch { return true; }
}

{
  const ruta = path.join(TEMPORAL, 'chico.c');
  fs.writeFileSync(ruta,
    `#define x_FRAME_WIDTH 32\n#define x_FRAME_HEIGHT 32\nstatic const uint32_t d[1][1024] = {\n{ 0x00000000 }\n};\n`);
  comprobar('rechaza un lienzo que no es 128×64', falla(() => convertir(ruta, 'espera', 250)));
}

{
  const ruta = path.join(TEMPORAL, 'cortado.c');
  fs.writeFileSync(ruta, `static const uint32_t d[1][8192] = {\n{ 0xffffffff, 0xffffffff }\n};\n`);
  comprobar('rechaza un archivo cortado a la mitad', falla(() => convertir(ruta, 'espera', 250)));
}

{
  const ruta = path.join(TEMPORAL, 'vacio.c');
  fs.writeFileSync(ruta, 'no hay nada de C acá\n');
  comprobar('rechaza algo que no es una exportación', falla(() => convertir(ruta, 'espera', 250)));
}

fs.rmSync(TEMPORAL, { recursive: true, force: true });
console.log(fallas === 0 ? '\nTodo bien.\n' : `\n${fallas} falla(s).\n`);
process.exit(fallas === 0 ? 0 : 1);
