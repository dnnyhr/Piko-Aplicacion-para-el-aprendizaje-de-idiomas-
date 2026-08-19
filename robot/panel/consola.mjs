/**
 * Consola serie de una sola pasada.
 *
 *   node consola.mjs --segundos 20 --enviar barrido
 *
 * Encuentra la placa sola. Con `--puerto COM6` se fuerza uno en particular, y
 * con `--esperar` se queda aguardando a que la enchufes.
 *
 * Abre el puerto, escupe todo lo que llega, manda las órdenes que le pidas y
 * se cierra sola. Existe porque `arduino-cli monitor` es interactivo y no se
 * puede guionar: esto sí, y así queda registro de lo que dijo la placa.
 *
 * Cerrar el puerto reinicia el Arduino, que es justo lo que se quiere para ver
 * el mensaje de arranque en la próxima corrida.
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const arg = (n, pordefecto = null) => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : pordefecto;
};

const pedido = arg('--puerto', 'auto');
const segundos = Number(arg('--segundos', 15));

/**
 * Encontrar la placa sola.
 *
 * Windows le cambia el número de puerto al CH340 cada vez que se reconecta —
 * COM5 hoy, COM6 mañana— y llevarlo escrito a mano hace que los comandos
 * fallen por una razón que no tiene nada que ver con lo que se está probando.
 */
const FABRICANTES = [/arduino/i, /wch/i, /ftdi/i, /silicon labs/i, /prolific/i];
const VENDEDORES = ['2341', '1a86', '0403', '10c4', '067b', '2a03'];

async function buscarPlaca() {
  const lista = await SerialPort.list();
  const hallada = lista.find(
    (p) =>
      VENDEDORES.includes((p.vendorId || '').toLowerCase()) ||
      FABRICANTES.some((re) => re.test(p.manufacturer || ''))
  );
  return hallada ? hallada.path : null;
}
const ordenes = process.argv
  .map((a, i) => (process.argv[i - 1] === '--enviar' ? a : null))
  .filter(Boolean);

let ruta = pedido === 'auto' ? await buscarPlaca() : pedido;

/* Con --esperar no se rinde si no está: la busca hasta que aparezca. Sirve
   para dejar esto corriendo y que arranque solo al enchufar la placa, en vez
   de andar adivinando el momento justo. */
if (process.argv.includes('--esperar') || (pedido === 'auto' && !ruta)) {
  const hasta = Date.now() + 180000;
  process.stdout.write('# esperando la placa');
  while (Date.now() < hasta) {
    ruta = pedido === 'auto' ? await buscarPlaca() : pedido;
    const hay = ruta && (await SerialPort.list()).some((p) => p.path.toUpperCase() === ruta.toUpperCase());
    if (hay) { console.log(` — ${ruta}`); break; }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Windows tarda un momento en dejar abrir el puerto después de enumerarlo.
  await new Promise((r) => setTimeout(r, 1500));
}

if (!ruta) {
  console.error('No encontré ninguna placa conectada.');
  process.exit(1);
}

const puerto = new SerialPort({ path: ruta, baudRate: 115200 });
const lineas = puerto.pipe(new ReadlineParser({ delimiter: '\n' }));

const arranque = Date.now();
const marca = () => String((Date.now() - arranque) / 1000).padStart(6) + 's ';

lineas.on('data', (l) => console.log(marca() + l.trimEnd()));
puerto.on('error', (e) => { console.error(`Error en ${ruta}: ${e.message}`); process.exit(1); });

puerto.on('open', () => {
  console.log(`# abierto ${ruta} a 115200 — ${segundos} s`);
  // El Mega se reinicia al abrir el puerto; hay que darle tiempo antes de
  // hablarle o las primeras órdenes se pierden en el arranque.
  setTimeout(() => {
    for (const o of ordenes) {
      console.log(`# → ${o}`);
      puerto.write(o + '\n');
    }
  }, 2500);
});

setTimeout(() => {
  console.log('# cerrando');
  puerto.close(() => process.exit(0));
}, segundos * 1000);
