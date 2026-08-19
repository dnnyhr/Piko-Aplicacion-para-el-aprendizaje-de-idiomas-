/**
 * Convierte la exportación en C de Piskel al formato que usa la OLED.
 *
 * Piskel exporta `uint32_t`: cuatro bytes por píxel, con color y transparencia.
 * Para 128×64 son 32 KB por cuadro. La SSD1306 es de un bit por píxel, así que
 * el mismo dibujo le entra en 1 KB — treinta y dos veces menos. Este script
 * hace esa traducción y escupe el bloque listo para pegar en `dibujos.h`.
 *
 * USO
 * ---
 *   node robot/herramientas/piskel-a-cara.mjs espera.c espera 250
 *
 * Los tres argumentos son el archivo que exportó Piskel, el nombre de la
 * expresión, y cada cuántos milisegundos cambia de cuadro.
 *
 * Opciones:
 *   --invertir       da vuelta el resultado
 *   --por-alfa       fuerza el criterio del canal alfa
 *   --por-luz        fuerza el criterio de luminosidad
 *   --umbral <0-255> con --por-luz, qué tan claro cuenta como encendido (128)
 *   --sin-vista      no dibujar la vista previa en la terminal
 *   --salida <ruta>  escribir a un archivo en vez de a la pantalla
 *
 * El criterio se elige solo, y casi nunca hay que tocarlo. Está explicado
 * abajo, junto a la función que lo decide.
 */

import fs from 'node:fs';

const ANCHO = 128;
const ALTO = 64;
const BYTES_POR_CUADRO = (ANCHO * ALTO) / 8;   // 1024

// ── Argumentos ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const bandera = (n) => args.includes(n);
const valor = (n, pordefecto) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : pordefecto;
};
const sueltos = args.filter((a, i) => {
  if (a.startsWith('--')) return false;
  const previo = args[i - 1];
  return !(previo === '--umbral' || previo === '--salida');
});

const [archivo, nombre, msTexto] = sueltos;

if (!archivo || !nombre) {
  console.error('Uso: node piskel-a-cara.mjs <archivo.c> <nombre> [ms]');
  console.error('Ejemplo: node piskel-a-cara.mjs espera.c espera 250');
  process.exit(1);
}

const ms = Number(msTexto || 250);
const umbral = Number(valor('--umbral', 128));
const invertir = bandera('--invertir');

/* Los cuatro intervalos que ofrecía la otra herramienta no son una regla del
   hardware — acá vale cualquier número — pero son buenos puntos de partida y
   conviene avisar si el valor quedó raro. */
if (!Number.isFinite(ms) || ms < 20 || ms > 5000) {
  console.error(`El intervalo ${msTexto} no parece razonable. Van entre 20 y 5000 ms.`);
  process.exit(1);
}

const CARAS_CONOCIDAS = ['espera', 'izquierda', 'derecha', 'sonriendo', 'riendo', 'enojado'];

// ── Leer lo que exportó Piskel ───────────────────────────────────────────

let texto;
try {
  texto = fs.readFileSync(archivo, 'utf8');
} catch (e) {
  console.error(`No pude leer ${archivo}: ${e.message}`);
  process.exit(1);
}

/* Se buscan los `#define …_FRAME_WIDTH` que Piskel pone arriba. Si están, son
   la verdad; si el archivo viene recortado o pegado a mano, más abajo se
   deduce del total de píxeles. */
const defineDe = (sufijo) => {
  const m = texto.match(new RegExp(`#define\\s+\\w*${sufijo}\\s+(\\d+)`));
  return m ? Number(m[1]) : null;
};

const anchoDeclarado = defineDe('FRAME_WIDTH');
const altoDeclarado = defineDe('FRAME_HEIGHT');
const cuadrosDeclarados = defineDe('FRAME_COUNT');

/* Sólo se leen números a partir de la primera llave. Antes de ella están los
   `#define`, y sus valores contaminarían la cuenta de píxeles. */
const primeraLlave = texto.indexOf('{');
if (primeraLlave < 0) {
  console.error('No encontré ningún arreglo en ese archivo. ¿Es la exportación en C de Piskel?');
  process.exit(1);
}

const cuerpo = texto.slice(primeraLlave);
const crudos = cuerpo.match(/0[xX][0-9a-fA-F]+|\d+/g) || [];
const pixeles = crudos.map(Number);   // Number() entiende tanto 0xff00 como 255

if (pixeles.length === 0) {
  console.error('El arreglo está vacío.');
  process.exit(1);
}

// ── Validar medidas ──────────────────────────────────────────────────────

if (anchoDeclarado && altoDeclarado && (anchoDeclarado !== ANCHO || altoDeclarado !== ALTO)) {
  console.error(`El lienzo es de ${anchoDeclarado}×${altoDeclarado} y la pantalla es de ${ANCHO}×${ALTO}.`);
  console.error('Redimensioná en Piskel y volvé a exportar. Escalar acá arruinaría los trazos finos.');
  process.exit(1);
}

const porCuadro = ANCHO * ALTO;
if (pixeles.length % porCuadro !== 0) {
  console.error(`Encontré ${pixeles.length} píxeles, que no es múltiplo de ${porCuadro} (${ANCHO}×${ALTO}).`);
  console.error('Revisá que el lienzo de Piskel sea de 128×64.');
  process.exit(1);
}

const cuadros = pixeles.length / porCuadro;

if (cuadrosDeclarados && cuadrosDeclarados !== cuadros) {
  console.error(`Piskel dice ${cuadrosDeclarados} cuadros pero conté ${cuadros}. El archivo está incompleto.`);
  process.exit(1);
}

// ── Empaquetar ───────────────────────────────────────────────────────────

/**
 * Qué píxel queda encendido, decidido según cómo dibujaste.
 *
 * Hay dos formas naturales de encarar un dibujo para una pantalla de un bit, y
 * quieren criterios opuestos:
 *
 *   Un solo color sobre fondo transparente. Es lo que sale de Piskel por
 *   defecto, y ahí el color no significa nada: lo que dibujaste está y lo que
 *   no, no. Manda **el canal alfa**. Da igual si trazaste en negro o en blanco.
 *
 *   Varios colores, o un fondo opaco. Ahí sí hay claros y oscuros que
 *   distinguir, y manda **la luminosidad**.
 *
 * Se elige solo mirando cuántos colores opacos distintos trae el archivo. Con
 * `--por-alfa` o `--por-luz` se fuerza, y con `--invertir` se da vuelta el
 * resultado final — de verdad, no sólo una de las dos condiciones.
 *
 * Del color se toma el promedio simple de los tres canales y no la luminancia
 * ponderada: Piskel puede escribir los bytes como ARGB o como ABGR según la
 * versión, y un promedio sin pesos da lo mismo en los dos casos.
 */
const opacos = pixeles.filter((v) => ((v >>> 24) & 0xff) >= 128);
const coloresOpacos = new Set(opacos.map((v) => v & 0xffffff));

const modo = bandera('--por-luz') ? 'luz'
           : bandera('--por-alfa') ? 'alfa'
           : coloresOpacos.size <= 1 ? 'alfa' : 'luz';

function base(v) {
  const alfa = (v >>> 24) & 0xff;
  if (modo === 'alfa') return alfa >= 128;
  const medio = (((v >>> 16) & 0xff) + ((v >>> 8) & 0xff) + (v & 0xff)) / 3;
  return alfa >= 128 && medio >= umbral;
}

const encendido = (v) => (invertir ? !base(v) : base(v));

/* Fila por fila, 16 bytes cada una, y dentro de cada byte el bit más
   significativo es el píxel de más a la izquierda. Es el formato que
   `drawBitmap` de Adafruit GFX lee de PROGMEM: entra sin convertir nada. */
function empaquetar(cuadro) {
  const bytes = new Uint8Array(BYTES_POR_CUADRO);
  const base = cuadro * porCuadro;
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) {
      if (!encendido(pixeles[base + y * ANCHO + x])) continue;
      bytes[y * (ANCHO / 8) + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return bytes;
}

const empaquetados = [];
for (let c = 0; c < cuadros; c++) empaquetados.push(empaquetar(c));

// ── Vista previa ─────────────────────────────────────────────────────────

/* Dos filas de la pantalla por cada renglón de la terminal, usando medios
   bloques. Es la única forma de ver 64 filas sin llenar la pantalla, y alcanza
   de sobra para darse cuenta de si la cara salió invertida o corrida. */
function vistaPrevia(bytes) {
  const prendido = (x, y) => (bytes[y * 16 + (x >> 3)] >> (7 - (x & 7))) & 1;
  const lineas = [];
  for (let y = 0; y < ALTO; y += 2) {
    let l = '';
    for (let x = 0; x < ANCHO; x++) {
      const arriba = prendido(x, y);
      const abajo = prendido(x, y + 1);
      l += arriba && abajo ? '█' : arriba ? '▀' : abajo ? '▄' : ' ';
    }
    lineas.push(l);
  }
  return lineas.join('\n');
}

if (!bandera('--sin-vista')) {
  console.error(
    `\ncriterio: ${modo === 'alfa' ? 'canal alfa (un solo color sobre transparente)' : 'luminosidad'}`
  );
  empaquetados.forEach((b, i) => {
    const encendidos = b.reduce((n, byte) => n + byte.toString(2).split('1').length - 1, 0);
    console.error(`\ncuadro ${i + 1} de ${cuadros} — ${encendidos} píxeles encendidos`);
    console.error(vistaPrevia(b));
  });
  console.error('');

  const vacio = empaquetados.every((b) => b.every((x) => x === 0));
  const lleno = empaquetados.every((b) => b.every((x) => x === 0xff));
  if (vacio) console.error('Salió todo apagado. Probá --invertir.\n');
  else if (lleno) console.error('Salió todo encendido. Probá --invertir.\n');
}

// ── Escupir el C ─────────────────────────────────────────────────────────

const MAYUS = nombre.toUpperCase();

function comoC(bytes) {
  const lineas = [];
  for (let y = 0; y < ALTO; y++) {
    const fila = Array.from(bytes.slice(y * 16, y * 16 + 16))
      .map((b) => '0x' + b.toString(16).padStart(2, '0'))
      .join(', ');
    lineas.push('  ' + fila + ',');
  }
  // Un renglón del arreglo por cada fila de la pantalla: si algo sale torcido,
  // se ve en el propio código dónde.
  return lineas.join('\n');
}

const partes = [];
partes.push(`// ${nombre} — ${cuadros} cuadro${cuadros === 1 ? '' : 's'} a ${ms} ms.`);
partes.push(`// Convertido desde ${archivo} con piskel-a-cara.mjs.`);
partes.push('');

empaquetados.forEach((b, i) => {
  partes.push(`const uint8_t PROGMEM ${nombre}_${i + 1}[] = {`);
  partes.push(comoC(b));
  partes.push('};');
  partes.push('');
});

const listaCuadros = empaquetados.map((_, i) => `${nombre}_${i + 1}`).join(', ');
partes.push(`const uint8_t* const ${MAYUS}[] = { ${listaCuadros} };`);
partes.push(`#define ANIM_${MAYUS} { ${MAYUS}, ${cuadros}, ${ms} }`);

const salida = partes.join('\n') + '\n';
const destino = valor('--salida', null);

if (destino) {
  fs.writeFileSync(destino, salida, 'utf8');
  console.error(`Escrito en ${destino}`);
} else {
  process.stdout.write(salida);
}

if (!CARAS_CONOCIDAS.includes(nombre)) {
  console.error(`\nOjo: "${nombre}" no es una de las seis expresiones del robot.`);
  console.error(`Son: ${CARAS_CONOCIDAS.join(', ')}.`);
  console.error('El bloque igual sirve, pero el firmware no lo va a encontrar solo.');
}
