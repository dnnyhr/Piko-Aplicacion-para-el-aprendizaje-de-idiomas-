/**
 * El puente entre todo.
 *
 * Corre en la PC que tiene el cable USB metido en el MegaPi, y atiende a tres
 * clientes distintos que nunca se hablan entre sí directamente:
 *
 *   El Arduino, por el puerto serie — mueve el servo, el motor y las luces.
 *   El teléfono del robot, que abre /cara — es la cara de Piko.
 *   El teléfono del maestro, que abre / — manda las órdenes.
 *
 * Y además le pone voz a Piko: `/voz` trae del traductor de Google el audio
 * de cualquier frase, lo guarda, y la cara lo reproduce por el mismo camino
 * que ya le mueve la boca.
 *
 * Todo pasa por acá. El control nunca le habla al teléfono de la cara: le
 * habla al puente, y el puente reparte. Así se puede tener dos maestros
 * mirando, o ninguno, sin que la cara se entere.
 *
 *   node server.js                 puerto serie automático, http en 4700
 *   node server.js --puerto COM6   forzar el puerto serie
 *   node server.js --http 8080     cambiar el puerto web
 *   node server.js --listar        listar puertos serie y salir
 *
 * El latido va de punta a punta a propósito: lo manda el navegador que
 * controla, no este servidor. Si lo generara acá, el Arduino seguiría creyendo
 * que hay alguien al mando cuando lo que se cayó fue el túnel o el WiFi del
 * que mira el panel — que es la mitad de los cortes posibles. Así, cualquier
 * eslabón que se rompa deja al Arduino sin latido, y el Arduino frena solo.
 */

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { WebSocketServer } from 'ws';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUBLICO = path.join(AQUI, 'public');
const CARAS = path.join(PUBLICO, 'caras');
const SONIDOS = path.join(PUBLICO, 'sonidos');

const BAUDIOS = 115200;
const MS_REINTENTO = 2000;

// ── Argumentos ───────────────────────────────────────────────────────────

function argumento(nombre, pordefecto = null) {
  const i = process.argv.indexOf(nombre);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : pordefecto;
}

const PUERTO_HTTP = Number(argumento('--http', 4700));
const PUERTO_FIJO = argumento('--puerto');

// ═════════════════════════════════════════════════════════════════════════
//  PUERTO SERIE
// ═════════════════════════════════════════════════════════════════════════

/**
 * Órdenes que el panel tiene permiso de mandar.
 *
 * Esto no es paranoia de más: con el túnel levantado, lo que llega por el
 * WebSocket viene de internet. La lista blanca asegura que aunque alguien se
 * cuele, sólo pueda mandar las mismas órdenes que el panel — y no, por
 * ejemplo, una línea de mil caracteres para desbordar el buffer del Mega.
 */
/* Se arma por partes en vez de escribirla de un tirón porque así los rangos se
   leen: `0 a 255` como expresión regular es ilegible, y repetido tres veces en
   una línea de doscientos caracteres es imposible de revisar. Los rangos van
   acá y no sólo en el firmware para que el panel se entere en el momento, sin
   esperar el viaje de ida y vuelta. */
const N_0_255 = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const N_0_180 = '(180|1[0-7]\\d|[1-9]?\\d)';
const RPM_1_15 = '(1[0-5]|[1-9])';
const INDICE = '(-1|[0-7])';

const ORDENES = new RegExp(
  '^(HB|PING|PARA' +
  `|SV ${N_0_180}` +
  `|PA -?\\d{1,6}( ${RPM_1_15})?` +
  `|LED ${INDICE} ${N_0_255} ${N_0_255} ${N_0_255}` +
  `|TIRA (-1|[01]) ${N_0_255} ${N_0_255} ${N_0_255}` +
  `|BRILLO ${N_0_255})$`
);

let puerto = null;
let conectado = false;
let nombrePuerto = null;

/** Los adaptadores USB-serie que aparecen en un MegaPi, sea original o clon. */
const FABRICANTES = [/arduino/i, /wch/i, /ftdi/i, /silicon labs/i, /prolific/i];
const VENDEDORES = ['2341', '1a86', '0403', '10c4', '067b', '2a03'];

async function buscarPuerto() {
  const lista = await SerialPort.list();
  if (PUERTO_FIJO) {
    const hallado = lista.find((p) => p.path.toUpperCase() === PUERTO_FIJO.toUpperCase());
    return hallado ? hallado.path : PUERTO_FIJO;
  }
  const probable = lista.find(
    (p) =>
      VENDEDORES.includes((p.vendorId || '').toLowerCase()) ||
      FABRICANTES.some((re) => re.test(p.manufacturer || ''))
  );
  return probable ? probable.path : null;
}

/** Manda un mensaje a los clientes del rol pedido, o a todos si no se aclara. */
function difundir(mensaje, rol = null) {
  const texto = JSON.stringify(mensaje);
  for (const cliente of wss.clients) {
    if (cliente.readyState !== 1) continue;
    if (rol && cliente.rol !== rol) continue;
    cliente.send(texto);
  }
}

function cuantos(rol) {
  let n = 0;
  for (const c of wss.clients) if (c.readyState === 1 && c.rol === rol) n++;
  return n;
}

function avisarEstado() {
  difundir({
    t: 'estado',
    conectado,
    puerto: nombrePuerto,
    controles: cuantos('control'),
    caras: cuantos('cara'),
  });
}

async function abrirPuerto() {
  if (puerto) return;

  const ruta = await buscarPuerto();
  if (!ruta) {
    if (nombrePuerto !== null) {
      nombrePuerto = null;
      avisarEstado();
    }
    setTimeout(abrirPuerto, MS_REINTENTO);
    return;
  }

  nombrePuerto = ruta;
  const p = new SerialPort({ path: ruta, baudRate: BAUDIOS, autoOpen: false });

  p.open((error) => {
    if (error) {
      // El caso normal acá es que el Monitor Serie del IDE tenga el puerto
      // tomado. Se reintenta callado en vez de morir.
      console.error(`No se pudo abrir ${ruta}: ${error.message}`);
      puerto = null;
      conectado = false;
      avisarEstado();
      setTimeout(abrirPuerto, MS_REINTENTO);
      return;
    }
    puerto = p;
    conectado = true;
    console.log(`Serie abierto en ${ruta} a ${BAUDIOS} baudios`);
    avisarEstado();
  });

  const lineas = p.pipe(new ReadlineParser({ delimiter: '\n' }));
  lineas.on('data', (linea) => {
    const texto = linea.trim();
    if (!texto) return;
    difundir({ t: 'serie', dir: 'in', linea: texto }, 'control');
  });

  p.on('close', () => {
    console.log('Serie cerrado');
    puerto = null;
    conectado = false;
    avisarEstado();
    setTimeout(abrirPuerto, MS_REINTENTO);
  });

  p.on('error', (e) => console.error(`Serie: ${e.message}`));
}

function mandar(linea) {
  if (!puerto || !conectado) return false;
  puerto.write(`${linea}\n`);
  // El latido no se muestra en la consola del panel: son cinco por segundo y
  // taparían todo lo demás.
  if (linea !== 'HB') difundir({ t: 'serie', dir: 'out', linea }, 'control');
  return true;
}

// ═════════════════════════════════════════════════════════════════════════
//  LA CARA Y LOS SONIDOS
// ═════════════════════════════════════════════════════════════════════════

/**
 * Las expresiones son los archivos que haya en `public/caras/`, no una lista
 * escrita en el código.
 *
 * Así agregar una expresión es dejar un archivo en esa carpeta: no hay que
 * tocar el firmware, ni el panel, ni esto. El nombre del archivo es el nombre
 * de la expresión, y la extensión decide cómo se muestra.
 */
const VIDEO = ['.mp4', '.webm', '.ogv'];
const IMAGEN = ['.svg', '.gif', '.png', '.webp', '.jpg', '.jpeg'];

/**
 * Las expresiones que Piko sabe hacer moviéndose, sin archivo de por medio.
 *
 * Están acá repetidas —la lista de verdad vive en `public/piko.js`— para poder
 * validar una orden sin cargar el navegador. Son seis nombres que casi nunca
 * cambian; duplicarlos cuesta menos que inventar un mecanismo para
 * compartirlos entre el servidor y una página.
 */
const PROPIAS = ['enfrente', 'izquierda', 'derecha', 'arriba', 'guino', 'abierta'];

async function listarCaras() {
  let archivos;
  try {
    archivos = await fsp.readdir(CARAS);
  } catch {
    return [];
  }
  return archivos
    .map((archivo) => {
      const ext = path.extname(archivo).toLowerCase();
      const tipo = VIDEO.includes(ext) ? 'video' : IMAGEN.includes(ext) ? 'imagen' : null;
      if (!tipo) return null;
      return { nombre: path.basename(archivo, ext), archivo, tipo };
    })
    .filter(Boolean)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

const AUDIO = ['.mp3', '.ogg', '.wav', '.m4a', '.aac'];

async function listarSonidos() {
  try {
    const archivos = await fsp.readdir(SONIDOS);
    return archivos.filter((a) => AUDIO.includes(path.extname(a).toLowerCase())).sort();
  } catch {
    return [];
  }
}

/** Lo último que se mandó a mostrar, para que una cara que llega tarde —o que
    recargó la página— arranque donde está el resto y no en blanco. */
let expresionActual = null;

/**
 * El catálogo vive acá arriba y no dentro de cada conexión.
 *
 * Antes se leía la carpeta dentro del manejador de conexión, y eso obligaba a
 * registrar el manejador de mensajes después de dos `await` — con lo cual todo
 * mensaje que llegara en ese hueco se perdía en silencio. El primero que manda
 * la cara al conectarse es justamente `soy cara`, así que la cara nunca
 * quedaba registrada como tal y los sonidos, que van dirigidos sólo a ella, no
 * le llegaban nunca.
 */
let catalogo = { caras: [], sonidos: [] };

async function refrescarCatalogo() {
  catalogo = { caras: await listarCaras(), sonidos: await listarSonidos() };
}

// ═════════════════════════════════════════════════════════════════════════
//  LA VOZ
// ═════════════════════════════════════════════════════════════════════════

/**
 * Piko habla con la voz del traductor de Google, y el audio pasa por acá en
 * vez de bajarlo el teléfono por su cuenta. Tres motivos, y ninguno es rodeo:
 *
 *   La boca. El pico se abre con la energía de la onda, y para leerla hay que
 *   meter el audio en un `AnalyserNode`. Un archivo traído de otro dominio sin
 *   permiso de CORS —y el de Google no lo da— entra al grafo como silencio: se
 *   escucharía la voz y la boca quedaría quieta. Servido desde el mismo origen
 *   que la página, el problema no existe.
 *
 *   La caché. En una clase, «Di esta palabra» suena cuarenta veces. Guardada
 *   acá, treinta y nueve de esas veces no salen a internet.
 *
 *   El largo. Google corta cerca de los 200 caracteres. Partir la frase y
 *   pegar los pedazos se hace una vez acá y no en cada teléfono. Los MP3 se
 *   pegan uno detrás del otro sin ceremonia: son cuadros independientes.
 */
const VOZ_GOOGLE = 'https://translate.google.com/translate_tts';

/* Lo que entra por acá viene de internet igual que las órdenes del serie, así
   que se recorta antes de tocarlo. */
const VOZ_LARGO = 300;
const TARJETA_LARGO = 64;
const TARJETA_SUB_LARGO = 120;

/* Se parte en 180 y no en el límite exacto para no quedar pegado al borde: el
   corte de Google cuenta bytes y no letras, y una tilde ocupa dos. */
const VOZ_TROZO = 180;

const IDIOMA = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

const ESTADOS_TARJETA = ['neutro', 'escuchando', 'bien', 'mal'];

/** Deja el texto en una sola línea, sin caracteres de control y recortado. */
function limpiarTexto(texto, largo) {
  return String(texto ?? '')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, largo);
}

/** Parte la frase en pedazos que a Google le entren, cortando entre palabras. */
function partirFrase(texto) {
  if (texto.length <= VOZ_TROZO) return [texto];
  const pedazos = [];
  let queda = texto;
  while (queda.length > VOZ_TROZO) {
    const tope = queda.lastIndexOf(' ', VOZ_TROZO);
    // Una palabra sola más larga que el trozo entero se corta a lo bruto: es
    // eso o no decir nada.
    const corte = tope > 40 ? tope : VOZ_TROZO;
    pedazos.push(queda.slice(0, corte).trim());
    queda = queda.slice(corte).trim();
  }
  if (queda) pedazos.push(queda);
  return pedazos;
}

/* Las frases ya pedidas. Es un Map y no un objeto porque el orden de inserción
   decide cuál se tira cuando se llena: la más vieja sin usar. */
const CACHE_VOZ = new Map();
const CACHE_MAXIMO = 60;

async function pedirleAGoogle(texto, idioma) {
  const url = `${VOZ_GOOGLE}?ie=UTF-8&client=tw-ob&ttsspeed=1` +
              `&tl=${encodeURIComponent(idioma)}&textlen=${texto.length}` +
              `&q=${encodeURIComponent(texto)}`;

  /* Sin estas dos cabeceras Google contesta 403. Es el mismo pedido que hace
     el botón del altavoz del traductor. */
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
    },
  });
  if (!r.ok) throw new Error(`Google contestó ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function sintetizar(texto, idioma) {
  const clave = `${idioma}|${texto}`;
  const guardado = CACHE_VOZ.get(clave);
  if (guardado) {
    CACHE_VOZ.delete(clave);          // vuelve a ser la más nueva
    CACHE_VOZ.set(clave, guardado);
    return guardado;
  }

  const pedazos = [];
  for (const parte of partirFrase(texto)) pedazos.push(await pedirleAGoogle(parte, idioma));
  const mp3 = Buffer.concat(pedazos);

  CACHE_VOZ.set(clave, mp3);
  if (CACHE_VOZ.size > CACHE_MAXIMO) CACHE_VOZ.delete(CACHE_VOZ.keys().next().value);
  return mp3;
}

async function atenderVoz(url, respuesta) {
  const texto = limpiarTexto(url.searchParams.get('q'), VOZ_LARGO);
  const idioma = url.searchParams.get('idioma') || 'es';

  if (!texto || !IDIOMA.test(idioma)) {
    respuesta.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
             .end('falta el texto, o el idioma no sirve');
    return;
  }

  try {
    const mp3 = await sintetizar(texto, idioma);
    respuesta.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': mp3.length,
      // Que el teléfono la guarde también: la misma consigna se repite toda la
      // clase y por el túnel cada viaje se nota.
      'Cache-Control': 'public, max-age=86400',
    });
    respuesta.end(mp3);
  } catch (e) {
    /* Sin internet esto falla, y falla justo en el aula rural que es donde
       importa. Se contesta con un error claro y la cara cae sola a la voz del
       propio navegador, que no necesita red. */
    console.error(`Voz: ${e.message}`);
    respuesta.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
             .end(`no se pudo traer la voz: ${e.message}`);
  }
}

/** Lo último que se mandó a la pantalla del ejercicio, con el mismo criterio
    que la expresión: una cara que recarga tiene que volver a donde estaba y no
    quedarse mostrando una palabra vieja ni ninguna. */
let tarjetaActual = null;

// ═════════════════════════════════════════════════════════════════════════
//  HTTP + WEBSOCKET
// ═════════════════════════════════════════════════════════════════════════

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
};

const servidor = http.createServer((pedido, respuesta) => {
  const url = new URL(pedido.url, 'http://local');

  /* La voz no es un archivo de la carpeta: se trae de Google y se guarda. Va
     antes que nada para que no la busque el servidor de archivos. */
  if (url.pathname === '/voz') {
    atenderVoz(url, respuesta);
    return;
  }

  let relativo;
  if (url.pathname === '/') relativo = 'index.html';
  else if (url.pathname === '/cara') relativo = 'cara.html';
  else relativo = url.pathname.slice(1);

  const archivo = path.join(PUBLICO, relativo);

  // Nadie sale de public/ por más ../ que ponga.
  if (!archivo.startsWith(PUBLICO)) {
    respuesta.writeHead(403).end('no');
    return;
  }

  fs.stat(archivo, (error, datos) => {
    if (error || !datos.isFile()) {
      respuesta.writeHead(404).end('no está');
      return;
    }

    const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';

    /* Los videos se sirven por trozos. Sin esto un teléfono no puede saltar ni
       volver a empezar sin bajarlo entero de nuevo, y por el túnel eso se
       nota. */
    const rango = pedido.headers.range;
    if (rango && tipo.startsWith('video')) {
      const [desde, hasta] = rango.replace('bytes=', '').split('-');
      const inicio = parseInt(desde, 10) || 0;
      const fin = hasta ? parseInt(hasta, 10) : datos.size - 1;
      respuesta.writeHead(206, {
        'Content-Type': tipo,
        'Content-Range': `bytes ${inicio}-${fin}/${datos.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': fin - inicio + 1,
      });
      fs.createReadStream(archivo, { start: inicio, end: fin }).pipe(respuesta);
      return;
    }

    respuesta.writeHead(200, { 'Content-Type': tipo, 'Content-Length': datos.size });
    fs.createReadStream(archivo).pipe(respuesta);
  });
});

const wss = new WebSocketServer({ server: servidor });

wss.on('connection', (socket) => {
  // Hasta que diga quién es, se lo trata como control: es lo más común y lo
  // menos dañino si se equivoca.
  socket.rol = 'control';

  // El manejador va antes que cualquier `await`, o se pierden los mensajes que
  // lleguen mientras tanto — y el primero es el que dice quién es este cliente.
  socket.on('message', (crudo) => {
    let mensaje;
    try {
      mensaje = JSON.parse(crudo.toString());
    } catch {
      return;
    }

    if (mensaje.t === 'soy' && (mensaje.rol === 'cara' || mensaje.rol === 'control')) {
      socket.rol = mensaje.rol;
      avisarEstado();
      return;
    }

    /* El latido. Va aparte de las órdenes normales porque no tiene que
       aparecer en la consola del panel: son cinco por segundo y taparían todo
       lo demás. Y sólo cuenta el de quien controla — una cara mirando no es
       alguien al mando. */
    if (mensaje.t === 'hb') {
      if (socket.rol === 'control') mandar('HB');
      return;
    }

    if (mensaje.t === 'cmd' && typeof mensaje.linea === 'string') {
      const linea = mensaje.linea.trim();
      if (!ORDENES.test(linea)) {
        socket.send(JSON.stringify({ t: 'serie', dir: 'in', linea: `ERR el puente rechazo: ${linea}` }));
        return;
      }
      mandar(linea);
      return;
    }

    if (mensaje.t === 'expresion' && typeof mensaje.nombre === 'string') {
      const existe = PROPIAS.includes(mensaje.nombre) ||
                     catalogo.caras.some((c) => c.nombre === mensaje.nombre);
      if (!existe) {
        socket.send(JSON.stringify({ t: 'serie', dir: 'in', linea: `ERR no hay cara: ${mensaje.nombre}` }));
        return;
      }
      expresionActual = mensaje.nombre;
      difundir({ t: 'expresion', nombre: expresionActual });
      return;
    }

    if (mensaje.t === 'sonido' && typeof mensaje.archivo === 'string') {
      if (!catalogo.sonidos.includes(mensaje.archivo)) return;   // corta el path traversal
      // Lo reproduce el teléfono del robot: el sonido tiene que salir de donde
      // está la cara, no de la PC que está en otro rincón del aula.
      difundir({ t: 'sonido', archivo: mensaje.archivo }, 'cara');
      difundir({ t: 'serie', dir: 'out', linea: `♪ ${mensaje.archivo}` }, 'control');
      return;
    }

    /* Lo que Piko tiene que decir. El puente no baja el audio para mandárselo:
       le pasa a la cara la dirección de la que colgarlo, y la cara la pide
       cuando le toca sonar. Así la voz entra por el mismo `<audio>` que ya
       sabe mover la boca, sin un camino nuevo que mantener. */
    if (mensaje.t === 'decir' && typeof mensaje.texto === 'string') {
      const texto = limpiarTexto(mensaje.texto, VOZ_LARGO);
      if (!texto) return;
      const idioma = IDIOMA.test(mensaje.idioma || '') ? mensaje.idioma : 'es';
      const id = limpiarTexto(mensaje.id, 40) || null;
      const donde = `/voz?idioma=${encodeURIComponent(idioma)}&q=${encodeURIComponent(texto)}`;
      difundir({ t: 'voz', id, url: donde, texto, idioma }, 'cara');
      difundir({ t: 'serie', dir: 'out', linea: `🗣 ${texto}` }, 'control');
      return;
    }

    /* La cara avisa cuando terminó de hablar. Sin esto, el ejercicio del panel
       tendría que adivinar cuánto dura cada frase, y adivinaría mal: entre que
       la manda y que suena está lo que tarde Google en contestar, que por el
       internet de una escuela puede ser un segundo o cinco. */
    if (mensaje.t === 'vozfin') {
      difundir({ t: 'vozfin', id: limpiarTexto(mensaje.id, 40) || null }, 'control');
      return;
    }

    /* La tarjeta del ejercicio: la palabra que aparece en la pantalla del
       robot, al lado de la cara. Mandar `null` la saca. */
    if (mensaje.t === 'tarjeta') {
      const t = mensaje.tarjeta;
      const texto = t && typeof t.texto === 'string' ? limpiarTexto(t.texto, TARJETA_LARGO) : '';
      tarjetaActual = texto
        ? {
            texto,
            sub: limpiarTexto(t.sub, TARJETA_SUB_LARGO),
            estado: ESTADOS_TARJETA.includes(t.estado) ? t.estado : 'neutro',
          }
        : null;
      // A todos y no sólo a la cara: un segundo panel mirando tiene que ver en
      // qué paso va el ejercicio, igual que ve la expresión puesta.
      difundir({ t: 'tarjeta', tarjeta: tarjetaActual });
      return;
    }

    if (mensaje.t === 'callar') {
      difundir({ t: 'callar' }, 'cara');
    }
  });

  socket.on('close', () => {
    // Se fue el último que controlaba: frenar sin esperar al hombre muerto.
    // Medio segundo de motor suelto es medio segundo de más.
    if (cuantos('control') === 0) mandar('PARA');
    avisarEstado();
  });

  // Recién ahora se lee la carpeta, con el manejador ya puesto. Se relee en
  // cada conexión para que agregar una cara sea dejar el archivo y recargar,
  // sin reiniciar el servidor.
  refrescarCatalogo().then(() => {
    if (socket.readyState !== 1) return;
    socket.send(JSON.stringify({
      t: 'catalogo',
      caras: catalogo.caras,
      sonidos: catalogo.sonidos,
      expresion: expresionActual,
      tarjeta: tarjetaActual,
    }));
    avisarEstado();
  });
});

// ═════════════════════════════════════════════════════════════════════════

if (process.argv.includes('--listar')) {
  const lista = await SerialPort.list();
  if (lista.length === 0) console.log('No hay puertos serie.');
  for (const p of lista) {
    console.log(`${p.path}\t${p.manufacturer || 'sin fabricante'}\tvid=${p.vendorId || '-'}`);
  }
  process.exit(0);
}

servidor.listen(PUERTO_HTTP, () => {
  console.log(`Control:  http://localhost:${PUERTO_HTTP}/`);
  console.log(`Cara:     http://localhost:${PUERTO_HTTP}/cara`);
});

abrirPuerto();

// Ctrl+C con el motor girando no puede dejarlo girando.
for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    mandar('PARA');
    setTimeout(() => process.exit(0), 150);
  });
}
