/**
 * Prueba del puente sin Arduino y sin teléfonos.
 *
 *   npm run prueba
 *
 * Levanta el servidor en un puerto aparte, lo maltrata un poco y lo apaga. No
 * hace falta tener nada conectado: lo que se prueba acá es todo lo que está
 * antes del cable y antes de los navegadores — el reparto entre roles, la
 * lista blanca de órdenes, el catálogo de caras y los caminos de archivos.
 *
 * El oído (robot/escucha) tampoco hace falta: se levanta uno de mentira que
 * contesta siempre lo mismo y anota lo que le llega. Lo que se prueba es el
 * camino del audio por el puente, no el modelo.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const PUERTO = 4711;
const PUERTO_OIDO = 4712;
const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const CARA_DE_PRUEBA = path.join(RAIZ, 'public', 'caras', '_prueba.svg');

/* Una cara de mentira, para que el catálogo no esté vacío y se pueda probar el
   reparto de expresiones. Se borra al final. */
fs.writeFileSync(CARA_DE_PRUEBA, '<svg xmlns="http://www.w3.org/2000/svg"/>');

/* El oído de mentira. Contesta «bien» a todo y guarda el último pedido. */
const alOido = [];
const oidoFalso = http.createServer((pedido, respuesta) => {
  const url = new URL(pedido.url, 'http://local');
  if (url.pathname === '/salud') {
    respuesta.end(JSON.stringify({ listo: true, modelo: 'falso' }));
    return;
  }
  const partes = [];
  pedido.on('data', (p) => partes.push(p));
  pedido.on('end', () => {
    alOido.push({
      formas: JSON.parse(url.searchParams.get('formas')),
      exigencia: url.searchParams.get('exigencia'),
      bytes: Buffer.concat(partes).length,
    });
    respuesta.end(JSON.stringify({ veredicto: 'bien', oyo: 'yul', letras: [], puntaje: 1, parecido: 1 }));
  });
});
await new Promise((r) => oidoFalso.listen(PUERTO_OIDO, '127.0.0.1', r));

const servidor = spawn(process.execPath, ['server.js', '--http', String(PUERTO), '--oido', `http://127.0.0.1:${PUERTO_OIDO}`], {
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
  oidoFalso.close();
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

  comprobar('las dos páginas usan Fredoka',
    html.includes('family=Fredoka') && htmlCara.includes('family=Fredoka'));
  comprobar('el panel trae el ejercicio de pronunciación',
    html.includes('btnPresentar') && html.includes("t: 'tarjeta'") && html.includes("t: 'escuchar'"));
  comprobar('la cara y el panel cargan el micrófono',
    htmlCara.includes('oido.js') && html.includes('oido.js'));
  comprobar('la cara muestra la palabra al lado de Piko', htmlCara.includes('id="tarjeta"'));
  comprobar('y sin red cae a la voz del propio teléfono',
    htmlCara.includes('SpeechSynthesisUtterance'));

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

console.log('\nLa voz\n');

{
  /* No se prueba que Google conteste: eso necesita internet y la prueba tiene
     que correr en la misma máquina sin red donde se prueba el resto. Lo que se
     prueba es todo lo que está de este lado — que rechace lo que no sirve y que
     el reparto llegue a la cara. */
  const sinTexto = await fetch(`http://localhost:${PUERTO}/voz`);
  comprobar('/voz sin texto contesta 400', sinTexto.status === 400, `dio ${sinTexto.status}`);

  const idiomaRaro = await fetch(`http://localhost:${PUERTO}/voz?q=hola&idioma=;rm%20-rf`);
  comprobar('/voz rechaza un idioma inventado', idiomaRaro.status === 400, `dio ${idiomaRaro.status}`);

  control.send(JSON.stringify({ t: 'decir', id: 'v1', texto: 'Di esta palabra', idioma: 'es' }));
  await esperar(250);
  const voz = ultima(cara, 'voz');
  comprobar('lo que dice llega a la cara', !!voz);
  comprobar('y llega como dirección del mismo origen, no como archivo',
    !!voz && voz.url.startsWith('/voz?') && voz.url.includes('Di%20esta%20palabra'),
    voz && voz.url);
  comprobar('el control lo ve en su consola',
    control.recibidos.some((m) => m.t === 'serie' && m.linea.includes('Di esta palabra')));

  const antes = cara.recibidos.filter((m) => m.t === 'voz').length;
  control.send(JSON.stringify({ t: 'decir', texto: '   ' }));
  await esperar(200);
  comprobar('no dice nada cuando el texto está vacío',
    cara.recibidos.filter((m) => m.t === 'voz').length === antes);

  control.send(JSON.stringify({ t: 'decir', texto: 'a'.repeat(400) }));
  await esperar(200);
  comprobar('recorta una frase larguísima antes de mandarla',
    ultima(cara, 'voz').texto.length === 300, `quedó en ${ultima(cara, 'voz').texto.length}`);

  // El aviso de que terminó de hablar viaja al revés: de la cara al control.
  cara.send(JSON.stringify({ t: 'vozfin', id: 'v1' }));
  await esperar(250);
  comprobar('la cara avisa al control cuando terminó de hablar',
    ultima(control, 'vozfin')?.id === 'v1');
}

console.log('\nLa tarjeta del ejercicio\n');

{
  control.send(JSON.stringify({
    t: 'tarjeta',
    tarjeta: { texto: 'Naksa', sub: 'Te escucho…', estado: 'escuchando' },
  }));
  await esperar(250);
  const t = ultima(cara, 'tarjeta');
  comprobar('la palabra del ejercicio llega a la cara', t?.tarjeta?.texto === 'Naksa');
  comprobar('con el estado en que va el ejercicio', t?.tarjeta?.estado === 'escuchando');

  control.send(JSON.stringify({ t: 'tarjeta', tarjeta: { texto: 'Naksa', estado: 'inventado' } }));
  await esperar(200);
  comprobar('un estado que no existe cae en neutro',
    ultima(cara, 'tarjeta')?.tarjeta?.estado === 'neutro');

  const tardia = await cliente('cara');
  comprobar('una cara que llega tarde ve la palabra puesta',
    ultima(tardia, 'catalogo')?.tarjeta?.texto === 'Naksa');
  tardia.close();

  control.send(JSON.stringify({ t: 'tarjeta', tarjeta: null }));
  await esperar(200);
  comprobar('y se saca mandando null', ultima(cara, 'tarjeta')?.tarjeta === null);
}

console.log('\nLas palabras y el oído\n');

{
  const cat = ultima(control, 'catalogo');
  const tingki = cat?.palabras?.find((p) => p.id === 'tingki');
  comprobar('el catálogo trae las palabras del ejercicio', (cat?.palabras?.length || 0) > 10,
    `llegaron ${cat?.palabras?.length}`);
  comprobar('con la forma y la voz sacadas del diccionario', tingki?.forma === 'tingki' && !!tingki?.voz);
  comprobar('y las otras escrituras como respuestas válidas',
    !!tingki && tingki.formas.includes('Tinki'), tingki && tingki.formas.join(', '));

  /* El estado del oído se pregunta cada 5 s; el primero sale al arrancar. */
  let est = ultima(control, 'estado');
  for (let i = 0; i < 30 && !est?.oido?.listo; i++) { await esperar(250); est = ultima(control, 'estado'); }
  comprobar('el panel se entera de que el oído está listo', est?.oido?.listo === true);
}

{
  control.send(JSON.stringify({ t: 'escuchar', id: 'o1', formas: ['yul'], segundos: 99, fuente: 'cara', exigencia: 'estricta' }));
  await esperar(250);
  const g = ultima(cara, 'grabar');
  comprobar('pedir que escuche le dice a la cara que grabe', g?.id === 'o1');
  comprobar('sin pasarse de 10 segundos', g?.segundos === 10, `pidió ${g?.segundos}`);

  const sinPedido = await fetch(`http://localhost:${PUERTO}/oido?id=inventado`, { method: 'POST', body: Buffer.alloc(100) });
  comprobar('un audio sin pedido de escucha se rechaza', sinPedido.status === 403, `dio ${sinPedido.status}`);

  const audio = Buffer.alloc(3200);
  const ok = await fetch(`http://localhost:${PUERTO}/oido?id=o1`, { method: 'POST', body: audio });
  comprobar('el audio del pedido se acepta', ok.status === 202, `dio ${ok.status}`);
  await esperar(300);
  comprobar('el panel ve que se está evaluando', !!control.recibidos.find((m) => m.t === 'evaluando' && m.id === 'o1'));
  const nota = control.recibidos.find((m) => m.t === 'oido' && m.id === 'o1');
  comprobar('y le llega la nota del oído', nota?.resultado?.veredicto === 'bien');
  const pedido = alOido.at(-1);
  comprobar('al oído le llegan el audio, la palabra y la exigencia',
    pedido?.bytes === audio.length && pedido?.formas?.[0] === 'yul' && pedido?.exigencia === 'estricta');
  comprobar('la cara no recibe la nota: la decisión es del panel', !cara.recibidos.some((m) => m.t === 'oido'));

  const otraVez = await fetch(`http://localhost:${PUERTO}/oido?id=o1`, { method: 'POST', body: audio });
  comprobar('un pedido de escucha sirve una sola vez', otraVez.status === 403, `dio ${otraVez.status}`);
}

{
  const antes = cara.recibidos.filter((m) => m.t === 'grabar').length;
  cara.send(JSON.stringify({ t: 'escuchar', id: 'o2', formas: ['yul'], fuente: 'cara' }));
  await esperar(250);
  comprobar('una cara no puede pedir que se escuche', cara.recibidos.filter((m) => m.t === 'grabar').length === antes);

  control.send(JSON.stringify({ t: 'escuchar', id: 'o3', formas: [], fuente: 'cara' }));
  await esperar(250);
  comprobar('sin palabra no se abre la escucha',
    !!control.recibidos.find((m) => m.t === 'oido' && m.id === 'o3' && m.error));

  control.send(JSON.stringify({ t: 'escuchar', id: 'o4', formas: ['bila'], fuente: 'cara' }));
  await esperar(200);
  cara.send(JSON.stringify({ t: 'oidoerror', id: 'o4', motivo: 'no dieron permiso para el micrófono' }));
  await esperar(250);
  const error = control.recibidos.find((m) => m.t === 'oido' && m.id === 'o4');
  comprobar('si la cara no puede grabar, el panel se entera', /permiso/.test(error?.error || ''));
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
