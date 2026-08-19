/**
 * Prueba del puente sin Arduino y sin teléfonos.
 *
 *   npm run prueba
 *
 * Levanta el servidor en un puerto aparte, lo maltrata un poco y lo apaga. No
 * hace falta tener nada conectado: lo que se prueba acá es todo lo que está
 * antes del cable y antes de los navegadores — el reparto entre roles, la
 * lista blanca de órdenes, el catálogo de caras y los caminos de archivos.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const PUERTO = 4711;
const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const CARA_DE_PRUEBA = path.join(RAIZ, 'public', 'caras', '_prueba.svg');

/* Una cara de mentira, para que el catálogo no esté vacío y se pueda probar el
   reparto de expresiones. Se borra al final. */
fs.writeFileSync(CARA_DE_PRUEBA, '<svg xmlns="http://www.w3.org/2000/svg"/>');

const servidor = spawn(process.execPath, ['server.js', '--http', String(PUERTO)], {
  cwd: RAIZ,
  stdio: ['ignore', 'pipe', 'pipe'],
});
servidor.stdout.on('data', (d) => process.stdout.write(`[srv] ${d}`));
servidor.stderr.on('data', (d) => process.stdout.write(`[srv!] ${d}`));

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
function comprobar(nombre, ok, extra) {
  console.log(`${ok ? '  ok  ' : ' FALLA'}  ${nombre}`);
  if (!ok) { fallas++; if (extra) console.log(`        ${extra}`); }
}

function limpiar(codigo) {
  try { fs.unlinkSync(CARA_DE_PRUEBA); } catch { }
  servidor.kill();
  process.exit(codigo);
}

/* Esperar un tiempo fijo era una prueba que fallaba sola cuando la máquina
   estaba ocupada: el módulo nativo del puerto serie tarda distinto en cada
   arranque. Mejor preguntar hasta que conteste. */
async function esperarAlServidor(intentos = 40) {
  for (let i = 0; i < intentos; i++) {
    try { await fetch(`http://localhost:${PUERTO}/`); return true; }
    catch { await esperar(250); }
  }
  return false;
}

if (!(await esperarAlServidor())) {
  console.log(' FALLA  el servidor no levantó en 10 s');
  limpiar(1);
}

/** Abre un cliente y devuelve el socket con los mensajes que va juntando. */
async function cliente(rol) {
  const ws = new WebSocket(`ws://localhost:${PUERTO}`);
  ws.recibidos = [];
  ws.on('message', (d) => ws.recibidos.push(JSON.parse(d.toString())));
  await new Promise((r) => ws.on('open', r));
  ws.send(JSON.stringify({ t: 'soy', rol }));
  await esperar(200);
  return ws;
}

const ultima = (ws, tipo) => [...ws.recibidos].reverse().find((m) => m.t === tipo);

// ═════════════════════════════════════════════════════════════════════════

console.log('\nLas dos páginas\n');

{
  const control = await fetch(`http://localhost:${PUERTO}/`);
  const html = await control.text();
  comprobar('sirve el panel de control en /', control.status === 200);
  comprobar('el panel manda latido por WebSocket', html.includes("t: 'hb'"));

  const cara = await fetch(`http://localhost:${PUERTO}/cara`);
  const htmlCara = await cara.text();
  comprobar('sirve la cara en /cara', cara.status === 200);
  comprobar('la cara se anuncia como tal', htmlCara.includes("rol: 'cara'"));

  /* Las dos páginas piden que la pantalla no se apague, y la cara además lleva
     el respaldo de video para cuando se sirva por http en la red local, donde
     el candado no existe. */
  comprobar('la cara pide que no se apague la pantalla',
    htmlCara.includes('vigilia.js') && htmlCara.includes('respaldo: true'));
  comprobar('el control también lo pide', html.includes('vigilia.js'));

  /* La boca se mueve con la onda del audio, no con un temporizador. Lo que se
     comprueba acá es que el camino esté armado; que se vea bien es cosa de
     mirarlo. */
  comprobar('la cara analiza la onda del audio', htmlCara.includes('createMediaElementSource'));
  comprobar('y con eso le mueve la boca a Piko', htmlCara.includes('Piko.boca('));

  const pikojs = await fetch(`http://localhost:${PUERTO}/piko.js`);
  const dibujo = await pikojs.text();
  comprobar('piko.js abre el pico por cantidad y no por sí o no',
    dibujo.includes('boca(cuanto)') && dibujo.includes('APERTURA_MAX'));

  const vigilia = await fetch(`http://localhost:${PUERTO}/vigilia.js`);
  const js = await vigilia.text();
  comprobar('sirve vigilia.js', vigilia.status === 200);
  comprobar('usa el candado de pantalla', js.includes("wakeLock.request('screen')"));
  comprobar('vuelve a pedirlo cuando el sistema lo suelta', js.includes("'release'"));
  comprobar('tiene el respaldo de video', js.includes('captureStream'));

  const fuera = await fetch(`http://localhost:${PUERTO}/../server.js`);
  comprobar('no deja salir de public/', fuera.status === 404 || fuera.status === 403);
}

console.log('\nCatálogo y roles\n');

const control = await cliente('control');
const cara = await cliente('cara');

{
  const cat = ultima(control, 'catalogo');
  comprobar('manda el catálogo al conectar', !!cat);
  comprobar('encuentra las caras de la carpeta', !!cat && cat.caras.some((c) => c.nombre === '_prueba'));
  comprobar('clasifica el svg como imagen',
    !!cat && cat.caras.find((c) => c.nombre === '_prueba')?.tipo === 'imagen');

  const est = ultima(control, 'estado');
  comprobar('cuenta un control y una cara', !!est && est.controles === 1 && est.caras === 1,
    est && `controles=${est.controles} caras=${est.caras}`);
  comprobar('reporta que no hay placa', !!est && est.conectado === false);
}

console.log('\nReparto de expresiones\n');

{
  control.send(JSON.stringify({ t: 'expresion', nombre: '_prueba' }));
  await esperar(250);
  comprobar('la expresión llega a la cara', !!ultima(cara, 'expresion'));
  comprobar('y vuelve al control para que marque el botón', !!ultima(control, 'expresion'));

  control.send(JSON.stringify({ t: 'expresion', nombre: 'no-existe' }));
  await esperar(250);
  comprobar('rechaza una expresión que no está',
    control.recibidos.some((m) => m.t === 'serie' && m.linea.includes('no hay cara')));
}

{
  // Una cara que llega tarde tiene que ponerse al día, no quedarse en negro.
  const tardia = await cliente('cara');
  const cat = ultima(tardia, 'catalogo');
  comprobar('una cara que llega tarde recibe la expresión puesta', cat && cat.expresion === '_prueba',
    cat && `expresion=${cat.expresion}`);
  tardia.close();
}

console.log('\nLista blanca de órdenes\n');

{
  const buenas = ['SV 90', 'SV 0', 'PA -1024 10', 'PA 4096', 'LED 0 255 0 0',
                  'LED 7 1 2 3', 'LED -1 0 0 0', 'BRILLO 60', 'PARA', 'PING',
                  'TIRA 0 255 255 255', 'TIRA 1 0 0 0', 'TIRA -1 63 169 255'];
  for (const b of buenas) control.send(JSON.stringify({ t: 'cmd', linea: b }));
  await esperar(300);
  const rechazos = control.recibidos.filter((m) => m.t === 'serie' && m.linea.includes('el puente rechazo'));
  comprobar('no rechaza ninguna orden buena', rechazos.length === 0,
    rechazos.map((r) => r.linea).join(' | '));
}

{
  const antes = control.recibidos.filter((m) => m.t === 'serie' && m.linea.includes('el puente rechazo')).length;
  // DC y LCD ya no existen; LED sólo llega hasta el 7.
  const malas = ['DC 160', 'LCD 0 hola', 'LED 8 1 2 3', 'SV 900', 'rm -rf /',
                 'PA 1024 99', 'TIRA 2 1 2 3', 'TIRA 0 300 0 0'];
  for (const m of malas) control.send(JSON.stringify({ t: 'cmd', linea: m }));
  await esperar(300);
  const ahora = control.recibidos.filter((m) => m.t === 'serie' && m.linea.includes('el puente rechazo')).length;
  comprobar(`rechaza las ${malas.length} órdenes malas`, ahora - antes === malas.length,
    `rechazadas ${ahora - antes}`);
}

console.log('\nAguante\n');

{
  control.send('esto no es json');
  await esperar(200);
  const vivo = await fetch(`http://localhost:${PUERTO}/`).then((r) => r.status === 200).catch(() => false);
  comprobar('sobrevive a un mensaje que no es JSON', vivo);
}

{
  control.send(JSON.stringify({ t: 'sonido', archivo: '../../../windows/system32/x.wav' }));
  await esperar(250);
  comprobar('ignora un sonido fuera de la carpeta',
    !cara.recibidos.some((m) => m.t === 'sonido'));
}

control.close();
cara.close();
await esperar(300);

console.log(fallas === 0 ? '\nTodo bien.\n' : `\n${fallas} falla(s).\n`);
limpiar(fallas === 0 ? 0 : 1);
