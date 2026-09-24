/**
 * La página de encuestas de Piko.
 *
 * No conoce ninguna encuesta: pide la definición al Worker y la dibuja. Las
 * mismas reglas que usa el Worker (`reglas.js`) deciden qué se muestra y qué
 * falta, así el navegador y el servidor nunca discuten.
 *
 * Pensada para señal mala y teléfonos compartidos:
 *   - lo contestado se guarda en el teléfono a cada toque (se puede cerrar y seguir);
 *   - si al enviar no hay señal, la respuesta queda en cola y sale sola al volver;
 *   - al terminar, "otra persona va a responder" deja el teléfono listo para la siguiente.
 */

import { esVisible, revisar } from './reglas.js';

const app = document.getElementById('app');
const barra = document.getElementById('barra');
const progreso = document.getElementById('progreso');
const pasoTexto = document.getElementById('paso');

const CLAVE_PENDIENTES = 'piko-encuestas:pendientes';

/* ------------------------------------------------------------ utilidades */

function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v; // solo para íconos propios, nunca para texto de la encuesta
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

const ICONO = {
  check: '<svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>',
  flecha: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h12M11 5l5 5-5 5"/></svg>',
  atras: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10H4M9 5l-5 5 5 5"/></svg>',
  guia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>',
  escucha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 3-2 4-3 5.5S14 18 12 19.5 8.5 20 8 18"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3"/></svg>',
  corrige: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z"/></svg>',
  compartir: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="4.5" r="2.5"/><circle cx="5" cy="10" r="2.5"/><circle cx="15" cy="15.5" r="2.5"/><path d="M7.2 8.8l5.6-3M7.2 11.2l5.6 3"/></svg>',
};
const icono = (n) => h('span', { html: ICONO[n], 'aria-hidden': 'true', style: 'display:contents' });

function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch {
    return porDefecto;
  }
}
function escribir(clave, valor) {
  try {
    if (valor === undefined) localStorage.removeItem(clave);
    else localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* modo privado o sin espacio: la encuesta sigue funcionando, solo no recuerda */
  }
}

function nuevoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

function piko(cara = 'saludo', clase = '') {
  return h('img', { class: `piko piko--${cara} ${clase}`, src: '/img/piko.svg', alt: 'Piko, el chocoyo', width: 178, height: 292 });
}

/* ---------------------------------------------------------- piezas de marca
 * Las mismas de las publicaciones de Piko: cielo con el paisaje, confeti,
 * destellos, sello verde, créditos de KronoX y Pikobot.
 */

// Posiciones del confeti de las piezas de Instagram, pasadas a porcentajes.
const CONFETI = [
  [7, 20, 'var(--amarillo)', 24], [14.5, 8, 'var(--rojo)', -38], [21.6, 30, 'var(--papel)', 12],
  [28.6, 5, 'var(--naranja)', -16], [35.4, 34, 'var(--turquesa)', 42], [39.8, 7, 'var(--amarillo)', -28],
  [46.9, 38, 'var(--rojo)', 18], [53.8, 12, 'var(--papel)', -44], [60.5, 42, 'var(--naranja)', 30],
  [66, 8, 'var(--amarillo)', -12], [71.9, 46, 'var(--turquesa)', 36], [77.8, 16, 'var(--rojo)', -24],
  [84.1, 40, 'var(--papel)', 14], [90.9, 14, 'var(--naranja)', -34], [96.5, 44, 'var(--amarillo)', 16],
];

const DESTELLOS = {
  portada: [[8, 16], [88, 12], [70, 30], [14, 58]],
  cabecera: [[86, 18], [62, 10]],
  noche: [[10, 14], [88, 22], [76, 60], [18, 70]],
  final: [[10, 12], [86, 9], [80, 44], [8, 50]],
};

/** Fondo de cielo: paisaje abajo, confeti arriba y destellos. `noche` no lleva paisaje. */
function fondo(tipo) {
  const piezas = [];
  if (tipo !== 'noche') piezas.push(h('img', { class: 'cielo__escena', src: '/img/escena.svg', alt: '', 'aria-hidden': 'true' }));
  if (tipo !== 'noche') {
    piezas.push(
      h('div', { class: 'confeti', 'aria-hidden': 'true' },
        CONFETI.map(([x, y, c, r]) => h('i', { style: `left:${x}%;top:${y}px;background:${c};transform:rotate(${r}deg)` }))),
    );
  }
  for (const [x, y] of DESTELLOS[tipo] ?? []) piezas.push(h('span', { class: 'destello', style: `left:${x}%;top:${y}%`, 'aria-hidden': 'true' }));
  return piezas;
}

function sello() {
  return h('div', { class: 'sello' }, h('img', { src: '/img/marca-clara.svg', alt: 'Piko', width: 770, height: 410 }), h('span', {}, 'el que repite, salva'));
}

function creditos() {
  return h(
    'div',
    { class: 'creditos' },
    h('small', {}, 'Rumbo a'),
    h('img', { class: 'creditos__kronox', src: '/img/kronox.webp', alt: 'KronoX 2026', width: 520, height: 210 }),
    h('span', { class: 'creditos__raya', 'aria-hidden': 'true' }),
    h('img', { class: 'creditos__hackathon', src: '/img/hackathon-nicaragua.webp', alt: 'Hackathon Nicaragua' }),
  );
}

// Copete de plumas de Pikobot, con los colores del chocoyo.
const COPETE =
  '<svg viewBox="0 0 300 130" aria-hidden="true"><g stroke="#fff" stroke-width="10" stroke-linejoin="round" paint-order="stroke">' +
  '<ellipse cx="150" cy="62" rx="24" ry="58" fill="#E0332A" transform="rotate(-58 150 124)"/>' +
  '<ellipse cx="150" cy="62" rx="24" ry="58" fill="#E0332A" transform="rotate(58 150 124)"/>' +
  '<ellipse cx="150" cy="58" rx="26" ry="62" fill="#F0672A" transform="rotate(-29 150 124)"/>' +
  '<ellipse cx="150" cy="58" rx="26" ry="62" fill="#F0672A" transform="rotate(29 150 124)"/>' +
  '<ellipse cx="150" cy="54" rx="28" ry="66" fill="#F3C020"/>' +
  '</g></svg>';

/** Pikobot, el robot de aula, como en el carrusel. `cara`: enfrente | celebra. */
function pikobot(cara = 'enfrente', { pupitre = false } = {}) {
  const src = cara === 'celebra' ? '/img/robot-celebra.svg' : '/img/robot-cara.svg';
  return h(
    'div',
    { class: 'pikobot', role: 'img', 'aria-label': 'Pikobot, el robot de aula de Piko' },
    h(
      'div',
      { class: 'pikobot__cuerpo' },
      h('span', { class: 'pikobot__ala pikobot__ala--izq' }),
      h('span', { class: 'pikobot__ala pikobot__ala--der' }),
      h(
        'div',
        { class: 'pikobot__marco' },
        h(
          'div',
          { class: 'pikobot__carcasa' },
          h('span', { class: 'pikobot__copete', html: COPETE }),
          h('div', { class: 'pikobot__pantalla' }, h('img', { src, alt: '' })),
        ),
      ),
      h('span', { class: 'pikobot__brillo' }),
    ),
    pupitre ? h('div', { class: 'pikobot__pupitre' }, h('i'), h('i'), h('i')) : null,
    pupitre ? h('div', { class: 'pikobot__sombra' }) : null,
  );
}

/** Pinta en verde la palabra que la definición pide resaltar en el título. */
function tituloResaltado(titulo, resaltar) {
  const i = resaltar ? titulo.indexOf(resaltar) : -1;
  if (i < 0) return titulo;
  return [titulo.slice(0, i), h('em', {}, resaltar), titulo.slice(i + resaltar.length)];
}

function mostrarBarra(visible, fraccion = 0, texto = '') {
  barra.hidden = !visible;
  progreso.style.width = `${Math.round(fraccion * 100)}%`;
  progreso.parentElement.setAttribute('aria-valuenow', String(Math.round(fraccion * 100)));
  pasoTexto.textContent = texto;
}

function pantalla(...hijos) {
  app.replaceChildren(...hijos);
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

/* ---------------------------------------------------------------- envío */

async function enviar(pendiente) {
  const res = await fetch(`/api/encuestas/${encodeURIComponent(pendiente.slug)}/respuestas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(pendiente.cuerpo),
  });
  const datos = await res.json().catch(() => ({}));
  return { status: res.status, datos };
}

/** Manda lo que quedó en cola. Lo que el servidor rechaza para siempre se descarta. */
async function vaciarCola() {
  const cola = leer(CLAVE_PENDIENTES, []);
  if (!cola.length || !navigator.onLine) return;
  const quedan = [];
  for (const p of cola) {
    try {
      const { status } = await enviar(p);
      if (status >= 500 || status === 429) quedan.push(p);
    } catch {
      quedan.push(p);
    }
  }
  escribir(CLAVE_PENDIENTES, quedan.length ? quedan : undefined);
  document.querySelectorAll('[data-pendiente]').forEach((el) => (el.hidden = quedan.length === 0));
}
window.addEventListener('online', vaciarCola);

/* ------------------------------------------------------------------ rutas */

async function iniciar() {
  vaciarCola();
  const ruta = location.pathname.replace(/\/+$/, '');
  const m = ruta.match(/^\/e\/([a-z0-9-]+)$/);
  if (m) return abrirEncuesta(m[1]);
  return listar();
}

async function listar() {
  mostrarBarra(false);
  let encuestas = [];
  try {
    const res = await fetch('/api/encuestas');
    encuestas = (await res.json()).encuestas ?? [];
  } catch {
    return sinSenal(listar);
  }
  if (encuestas.length === 1) {
    history.replaceState(null, '', `/e/${encuestas[0].slug}${location.search}`);
    return abrirEncuesta(encuestas[0].slug);
  }
  pantalla(
    h(
      'section',
      { class: 'contenedor centro' },
      piko(encuestas.length ? 'saludo' : 'pensando'),
      h('h1', {}, encuestas.length ? 'Encuestas de Piko' : 'Por ahora no hay encuestas abiertas'),
      h('p', {}, encuestas.length ? 'Elegí una. Cada respuesta nos ayuda a decidir qué construir.' : 'Volvé pronto: Piko siempre tiene algo que preguntar.'),
      h(
        'div',
        { class: 'tarjetas' },
        encuestas.map((e) =>
          h(
            'a',
            { class: 'tarjeta', href: `/e/${e.slug}${location.search}` },
            h('h2', {}, e.titulo),
            h('p', {}, e.descripcion, e.minutos ? ` · ${e.minutos} min` : ''),
          ),
        ),
      ),
    ),
  );
}

function sinSenal(reintentar) {
  mostrarBarra(false);
  pantalla(
    h(
      'section',
      { class: 'contenedor centro' },
      piko('pensando'),
      h('h1', {}, 'Piko no encuentra señal'),
      h('p', {}, 'Para abrir la encuesta hace falta conexión un momentito. Lo que contestes después se guarda en tu teléfono aunque se vaya la señal.'),
      h('button', { class: 'btn', type: 'button', onclick: reintentar }, 'Probar de nuevo'),
    ),
  );
}

function noExiste(mensaje) {
  mostrarBarra(false);
  pantalla(
    h(
      'section',
      { class: 'contenedor centro' },
      piko('pensando'),
      h('h1', {}, mensaje),
      h('p', {}, 'Puede que el enlace esté incompleto o que la encuesta ya haya cerrado.'),
      h('a', { class: 'btn btn--papel', href: '/' }, 'Ver encuestas abiertas'),
    ),
  );
}

/* --------------------------------------------------------------- encuesta */

async function abrirEncuesta(slug) {
  let datos;
  try {
    const res = await fetch(`/api/encuestas/${slug}`);
    if (res.status === 404) return noExiste('No encontramos esa encuesta');
    datos = await res.json();
  } catch {
    return sinSenal(() => abrirEncuesta(slug));
  }
  const def = datos.definicion;
  document.title = `${def.titulo} · Piko`;

  const clave = `piko-encuesta:${slug}`;
  const origen = new URLSearchParams(location.search).get('origen');

  const nuevo = () => ({ id: nuevoId(), version: datos.version, respuestas: {}, otros: {}, paso: -1, inicio: Date.now(), origen });
  let estado = leer(clave, null);
  if (!estado || !estado.id) estado = nuevo();
  const guardar = () => escribir(clave, estado);

  const total = def.secciones.length;

  function ir(paso) {
    estado.paso = paso;
    guardar();
    if (paso < 0) return portada();
    if (paso >= total) return enviarYTerminar();
    return seccion(paso);
  }

  /* ---- portada ---- */
  function portada() {
    mostrarBarra(false);
    const empezado = Object.keys(estado.respuestas).length > 0;
    const cerrada = datos.estado === 'cerrada';
    pantalla(
      h(
        'section',
        { class: 'portada cielo' },
        fondo('portada'),
        h(
          'div',
          { class: 'portada__grid' },
          h('div', { class: 'portada__cabeza' }, sello()),
          // En el teléfono Piko se asoma sobre la tarjeta; en escritorio queda de pie a la derecha.
          h('div', { class: 'portada__piko' }, h('div', { class: 'globo' }, h('p', {}, def.portada?.saludo ?? '¡Hola! Soy Piko.')), piko('saludo')),
          h(
            'div',
            { class: 'papel portada__tarjeta' },
            h('span', { class: 'pastilla' }, def.minutos ? `Encuesta · ${def.minutos} minutos` : 'Encuesta'),
            h('h1', {}, tituloResaltado(def.titulo, def.portada?.resaltar)),
            h('p', { class: 'portada__bajada' }, def.portada?.texto ?? def.descripcion ?? ''),
            h(
              'div',
              { class: 'portada__acciones' },
              cerrada
                ? h('p', { class: 'pendiente' }, 'Esta encuesta ya cerró. ¡Gracias por tu interés!')
                : h(
                    'button',
                    { class: 'btn btn--siguiente', type: 'button', onclick: () => ir(empezado ? Math.max(0, estado.paso) : 0) },
                    empezado ? 'Seguir donde quedé' : '¡Empecemos!',
                    icono('flecha'),
                  ),
              empezado && !cerrada
                ? h('button', { class: 'btn btn--fantasma', type: 'button', onclick: () => ((estado = nuevo()), ir(0)) }, 'Empezar de cero')
                : null,
            ),
            h(
              'ul',
              { class: 'portada__meta' },
              h('li', {}, `${total} partes`),
              h('li', {}, 'Anónima'),
              h('li', {}, 'Funciona con poca señal'),
            ),
          ),
          h(
            'div',
            { class: 'portada__pie' },
            def.portada?.etiqueta ? h('div', { class: 'sticker sticker--derecha' }, h('span', {}, def.portada.etiqueta)) : null,
            def.creditos === 'kronox' ? creditos() : null,
          ),
        ),
      ),
    );
  }

  /* ---- una sección ---- */
  function seccion(i) {
    const s = def.secciones[i];
    mostrarBarra(true, i / total, `${i + 1}/${total}`);

    const bloques = new Map(); // id → { el, error }
    const aviso = h('p', { class: 'pie__aviso', role: 'status', 'aria-live': 'polite' });

    const refrescar = () => {
      for (const p of s.preguntas) bloques.get(p.id).el.hidden = !esVisible(def, p, estado.respuestas);
    };
    const cambio = (p) => {
      guardar();
      const b = bloques.get(p.id);
      b.el.classList.remove('pregunta--error');
      b.error.textContent = '';
      aviso.textContent = '';
      refrescar();
    };

    const preguntas = s.preguntas.map((p) => {
      const b = dibujarPregunta(p, estado, () => cambio(p));
      bloques.set(p.id, b);
      return b.el;
    });
    refrescar();

    const siguiente = () => {
      const r = revisar(def, estado.respuestas, estado.otros, s);
      if (!r.ok) {
        let primero = null;
        for (const [id, msg] of Object.entries(r.errores)) {
          const b = bloques.get(id);
          b.el.classList.add('pregunta--error');
          b.error.textContent = msg;
          b.marcarFaltantes?.();
          primero ??= b.el;
        }
        const n = Object.keys(r.errores).length;
        aviso.textContent = n === 1 ? 'Te falta 1 respuesta' : `Te faltan ${n} respuestas`;
        primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      ir(i + 1);
    };

    // La parte del robot pasa a un escenario de noche: es el momento de Pikobot.
    const esRobot = s.piko?.cara === 'robot';
    const cabecera = h(
      'header',
      { class: `cabecera cielo${esRobot ? ' cielo--noche' : ''}` },
      fondo(esRobot ? 'noche' : 'cabecera'),
      h(
        'div',
        { class: 'contenedor cabecera__fila' },
        esRobot ? pikobot('enfrente') : piko(s.piko?.cara ?? 'feliz'),
        h(
          'div',
          { class: `papel${i % 2 ? ' papel--derecha' : ''}` },
          h('span', { class: 'pastilla' }, `Parte ${i + 1} de ${total}`),
          h('h2', {}, s.titulo),
          s.piko?.dice ? h('p', { class: 'cabecera__dice' }, s.piko.dice) : null,
        ),
      ),
    );
    const cuerpo = h(
      'section',
      { class: 'contenedor paso' },
      s.concepto ? dibujarConcepto(s.concepto) : null,
      h('form', { novalidate: true, onsubmit: (e) => (e.preventDefault(), siguiente()) }, preguntas, h('button', { type: 'submit', hidden: true })),
    );

    pantalla(
      esRobot ? h('div', { class: 'noche' }, cabecera, cuerpo) : h('div', {}, cabecera, cuerpo),
      h(
        'nav',
        { class: 'pie', 'aria-label': 'Navegación de la encuesta' },
        h(
          'div',
          { class: 'contenedor pie__fila' },
          h('button', { class: 'btn btn--papel', type: 'button', onclick: () => ir(i - 1), 'aria-label': 'Volver' }, icono('atras')),
          aviso,
          h('button', { class: 'btn btn--siguiente', type: 'button', onclick: siguiente }, i === total - 1 ? 'Enviar' : 'Siguiente', icono('flecha')),
        ),
      ),
    );
  }

  /* ---- envío y final ---- */
  async function enviarYTerminar() {
    mostrarBarra(true, 1, '¡Listo!');
    pantalla(h('div', { class: 'cargando' }, h('img', { class: 'cargando__piko', src: '/img/piko.svg', alt: '' }), h('p', {}, 'Piko está guardando tus respuestas…')));

    const pendiente = {
      slug,
      cuerpo: {
        id: estado.id,
        version: estado.version,
        respuestas: estado.respuestas,
        otros: estado.otros,
        duracionSeg: Math.round((Date.now() - estado.inicio) / 1000),
        origen: estado.origen,
        sitio: '',
      },
    };

    let enCola = false;
    try {
      const { status, datos: r } = await enviar(pendiente);
      if (status === 422) {
        // El servidor encontró algo que el navegador no: volver a la primera sección con problemas.
        const ids = Object.keys(r.errores ?? {});
        const idx = def.secciones.findIndex((s) => s.preguntas.some((p) => ids.includes(p.id)));
        return ir(idx >= 0 ? idx : 0);
      }
      if (status === 410) return noExiste('Esta encuesta ya cerró');
      if (status >= 500 || status === 429) throw new Error(String(status));
    } catch {
      const cola = leer(CLAVE_PENDIENTES, []);
      if (!cola.some((c) => c.cuerpo.id === pendiente.cuerpo.id)) cola.push(pendiente);
      escribir(CLAVE_PENDIENTES, cola);
      enCola = true;
    }

    escribir(clave, undefined);
    final(enCola);
  }

  function final(enCola) {
    mostrarBarra(true, 1, '¡Listo!');
    const enlace = `${location.origin}/e/${slug}`;
    const textoCompartir = `${def.titulo} Ayudá a Piko a decidir qué construir: ${enlace}`;

    const compartir = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: def.titulo, text: textoCompartir, url: enlace });
        } catch {
          /* la persona canceló */
        }
      } else {
        await navigator.clipboard?.writeText(enlace);
        botonCompartir.lastChild.textContent = '¡Enlace copiado!';
      }
    };
    const botonCompartir = h('button', { class: 'btn btn--papel', type: 'button', onclick: compartir }, icono('compartir'), h('span', {}, 'Compartir'));

    pantalla(
      h(
        'section',
        { class: 'final cielo' },
        fondo('final'),
        h(
          'div',
          { class: 'final__grid' },
          h('div', { class: 'final__duo' }, piko('celebra'), pikobot('celebra')),
          h(
            'div',
            { class: 'papel' },
            h('span', { class: 'pastilla' }, '¡Respuesta enviada!'),
            h('h1', {}, def.final?.titulo ?? '¡Gracias!'),
            h('p', {}, def.final?.texto ?? ''),
            h(
              'p',
              { class: 'pendiente', style: 'margin-top:12px', 'data-pendiente': true, hidden: !enCola },
              'Sin señal ahora: tu respuesta está guardada en el teléfono y se envía sola cuando vuelva.',
            ),
          ),
          h(
            'div',
            { class: 'final__compartir' },
            h('p', {}, def.final?.compartir ?? '¿Conocés a alguien que debería contestarla?'),
            h(
              'div',
              { class: 'final__acciones' },
              h('a', { class: 'btn', href: `https://wa.me/?text=${encodeURIComponent(textoCompartir)}`, target: '_blank', rel: 'noopener' }, 'WhatsApp'),
              botonCompartir,
            ),
          ),
          h(
            'button',
            {
              class: 'btn btn--fantasma final__otra',
              type: 'button',
              onclick: () => {
                estado = nuevo();
                ir(-1);
              },
            },
            'Otra persona va a responder en este teléfono',
          ),
          sello(),
          def.creditos === 'kronox' ? creditos() : null,
        ),
      ),
    );
  }

  // Si la persona ya iba por la mitad, se retoma en la portada con "Seguir donde quedé".
  portada();
}

/* ------------------------------------------------------ piezas de pregunta */

function dibujarConcepto(c) {
  const pilares = c.pilares ?? [];
  return h(
    'aside',
    { class: 'concepto', 'aria-label': c.titulo },
    pikobot('enfrente', { pupitre: true }),
    pilares.length ? h('div', { class: 'sticker' }, h('span', {}, pilares.map((p) => p.titulo).join(' · '))) : null,
    h(
      'div',
      { class: 'papel papel--derecha concepto__titulo' },
      h('span', { class: 'pastilla' }, c.nombre ? `Conocé a ${c.nombre}` : 'La idea'),
      h('h3', {}, tituloResaltado(c.titulo, c.resaltar)),
      h('p', {}, c.texto),
    ),
    h(
      'ul',
      { class: 'pilares' },
      pilares.map((p) =>
        h(
          'li',
          { class: `pilar pilar--${p.id}` },
          h('span', { class: 'pilar__icono', html: ICONO[p.id] ?? ICONO.corrige, 'aria-hidden': 'true' }),
          h('b', {}, p.titulo),
          h('span', {}, p.texto),
        ),
      ),
    ),
    c.nota ? h('p', { class: 'concepto__ia' }, c.nota) : null,
  );
}

let contadorIds = 0;

/**
 * Dibuja una pregunta y la conecta al estado. Devuelve el bloque, el lugar
 * donde va el mensaje de error y, para la matriz, cómo marcar filas vacías.
 */
function dibujarPregunta(p, estado, alCambiar) {
  const uid = `p${++contadorIds}`;
  const error = h('p', { class: 'pregunta__error', id: `${uid}-error`, role: 'alert' });
  const titulo = [p.texto, p.requerida ? h('span', { class: 'pregunta__requerida', 'aria-hidden': 'true' }, ' *') : null];
  const ayuda = p.ayuda ? h('span', { class: 'pregunta__ayuda' }, p.ayuda) : null;

  const set = (valor) => {
    if (valor === undefined || (Array.isArray(valor) && !valor.length) || valor === '') delete estado.respuestas[p.id];
    else estado.respuestas[p.id] = valor;
    alCambiar();
  };

  let cuerpo;
  let marcarFaltantes;

  if (p.tipo === 'unica' || p.tipo === 'multiple') {
    const multiple = p.tipo === 'multiple';
    const actual = () => estado.respuestas[p.id] ?? (multiple ? [] : undefined);
    const otroOp = p.opciones.find((o) => o.otro);
    const campoOtro = otroOp
      ? h('input', {
          class: 'campo campo--otro',
          type: 'text',
          maxlength: 200,
          placeholder: '¿Cuál?',
          'aria-label': `${p.texto} — otra opción`,
          value: estado.otros[p.id] ?? '',
          oninput: (e) => {
            estado.otros[p.id] = e.target.value;
            alCambiar();
          },
        })
      : null;

    const entradas = [];
    const sincronizar = () => {
      const v = actual();
      const elegidas = multiple ? v : v ? [v] : [];
      const lleno = multiple && p.max && elegidas.length >= p.max;
      for (const inp of entradas) {
        inp.checked = elegidas.includes(inp.value);
        inp.disabled = Boolean(lleno && !inp.checked);
      }
      if (campoOtro) campoOtro.hidden = !elegidas.includes(otroOp.id);
    };

    const lista = h(
      'div',
      { class: 'opciones', role: multiple ? 'group' : 'radiogroup' },
      p.opciones.map((o) => {
        const inp = h('input', {
          type: multiple ? 'checkbox' : 'radio',
          name: uid,
          value: o.id,
          onchange: () => {
            if (multiple) {
              const v = new Set(actual());
              inp.checked ? v.add(o.id) : v.delete(o.id);
              set(p.opciones.map((x) => x.id).filter((id) => v.has(id)));
            } else set(o.id);
            sincronizar();
            if (o.otro && inp.checked) campoOtro?.focus();
          },
        });
        entradas.push(inp);
        return h('label', { class: 'opcion' }, inp, h('span', { class: 'opcion__cuerpo' }, h('span', { class: 'opcion__marca', html: ICONO.check }), h('span', {}, o.texto)));
      }),
    );
    sincronizar();
    cuerpo = [lista, campoOtro];
  } else if (p.tipo === 'escala') {
    cuerpo = dibujarEscala(uid, p.min, p.max, p.etiquetaMin, p.etiquetaMax, estado.respuestas[p.id], set, p.texto);
  } else if (p.tipo === 'matriz') {
    const valor = () => estado.respuestas[p.id] ?? {};
    const filasEl = new Map();
    const filas = p.filas.map((f) => {
      const fila = h('div', { class: 'matriz__fila' });
      const escala = dibujarEscala(`${uid}-${f.id}`, p.escala.min, p.escala.max, null, null, valor()[f.id], (n) => {
        set({ ...valor(), [f.id]: n });
        fila.classList.add('matriz__fila--hecha');
        fila.classList.remove('matriz__fila--falta');
      }, f.texto);
      fila.append(h('span', { class: 'matriz__texto', id: `${uid}-${f.id}-t` }, f.texto), escala);
      if (valor()[f.id] !== undefined) fila.classList.add('matriz__fila--hecha');
      filasEl.set(f.id, fila);
      return fila;
    });
    marcarFaltantes = () => {
      for (const [id, el] of filasEl) if (valor()[id] === undefined) el.classList.add('matriz__fila--falta');
    };
    cuerpo = h(
      'div',
      { class: 'matriz' },
      h('div', { class: 'matriz__leyenda', 'aria-hidden': 'true' }, h('span', {}, h('b', {}, p.escala.min), ` = ${p.escala.etiquetaMin ?? ''}`), h('span', {}, h('b', {}, p.escala.max), ` = ${p.escala.etiquetaMax ?? ''}`)),
      filas,
    );
  } else {
    const max = p.max ?? 2000;
    const contador = h('span', { class: 'contador', 'aria-hidden': 'true' });
    const pintar = (v) => (contador.textContent = `${v.length}/${max}`);
    const campo = h(p.multilinea ? 'textarea' : 'input', {
      class: 'campo',
      maxlength: max,
      placeholder: p.placeholder ?? '',
      'aria-describedby': `${uid}-error`,
      oninput: (e) => {
        pintar(e.target.value);
        set(e.target.value);
      },
      ...(p.multilinea ? { rows: 4 } : { type: 'text' }),
    });
    campo.value = estado.respuestas[p.id] ?? '';
    pintar(campo.value);
    cuerpo = [campo, p.multilinea ? contador : null];
  }

  const el = h(
    p.tipo === 'texto' ? 'div' : 'fieldset',
    { class: 'pregunta', 'aria-describedby': `${uid}-error` },
    p.tipo === 'texto' ? h('label', { class: 'pregunta__titulo', for: `${uid}-campo` }, titulo) : h('legend', {}, titulo),
    ayuda,
    cuerpo,
    error,
  );
  if (p.tipo === 'texto') el.querySelector('.campo').id = `${uid}-campo`;
  return { el, error, marcarFaltantes };
}

function dibujarEscala(nombre, min, max, etMin, etMax, valor, alElegir, etiqueta) {
  const larga = max - min > 6;
  const botones = [];
  for (let n = min; n <= max; n++) {
    const inp = h('input', { type: 'radio', name: nombre, value: n, 'aria-label': `${etiqueta}: ${n}`, onchange: () => alElegir(n) });
    if (valor === n) inp.checked = true;
    botones.push(h('label', { class: 'opcion' }, inp, h('span', { class: 'opcion__cuerpo' }, String(n))));
  }
  return h(
    'div',
    { class: `escala${larga ? ' escala--larga' : ''}`, role: 'radiogroup', 'aria-label': etiqueta },
    h('div', { class: 'escala__botones' }, botones),
    etMin || etMax ? h('div', { class: 'escala__etiquetas', 'aria-hidden': 'true' }, h('span', {}, etMin ?? ''), h('span', {}, etMax ?? '')) : null,
  );
}

iniciar();
