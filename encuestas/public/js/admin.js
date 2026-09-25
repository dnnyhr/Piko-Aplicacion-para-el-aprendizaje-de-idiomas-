/**
 * Panel de resultados. Cuatro pestañas para no tener una sola página
 * eterna: Resumen (lo importante de un vistazo), Preguntas (cada una en una
 * tarjeta plegable con la gráfica que mejor le queda a su tipo), Correos y
 * Contactos (con filtros, buscador y páginas).
 *
 * Gráficas: cada una lleva el número escrito al lado (no hay que adivinar
 * por el largo de la barra), un globito al pasar el dedo o el mouse, y una
 * tabla con los datos. Los colores están explicados en admin.html.
 */

const $ = (id) => document.getElementById(id);
const CLAVE = 'piko-encuestas:token';

function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  // replaceChildren y append convierten null en el texto "null": se filtran.
  for (const x of hijos.flat(Infinity)) if (x !== null && x !== undefined && x !== false) el.append(x instanceof Node ? x : String(x));
  return el;
}

/** Como replaceChildren, pero aplana listas y no escribe "null" por los huecos. */
const poner = (el, ...hijos) => el.replaceChildren(...hijos.flat(Infinity).filter((x) => x !== null && x !== undefined && x !== false));

let token = sessionStorage.getItem(CLAVE) ?? '';

async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    ...opciones,
    headers: { authorization: `Bearer ${token}`, ...(opciones.body ? { 'content-type': 'application/json' } : {}) },
  });
  if (res.status === 401) throw new Error('Contraseña incorrecta.');
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Error ${res.status}`);
  return res;
}

/* ------------------------------------------------------------ formatos */

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
const dec = (x, d = 1) => (x === null || x === undefined ? '—' : x.toLocaleString('es-NI', { minimumFractionDigits: d, maximumFractionDigits: d }));
const fecha = (iso) =>
  iso ? new Date(iso.endsWith('Z') ? iso : `${iso}Z`).toLocaleString('es-NI', { dateStyle: 'short', timeStyle: 'short' }) : '';
const diaCorto = (dia) => {
  const [, m, d] = dia.split('-');
  return `${Number(d)}/${Number(m)}`;
};
const personas = (n) => `${n} ${n === 1 ? 'persona' : 'personas'}`;
const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Colores: se leen de las variables de admin.html para no repetirlos.
const color = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim();
const CATEGORICOS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const DIVERGENTE = ['div-1', 'div-2', 'div-3', 'div-4', 'div-5'];

/** Color de un valor de escala: naranja (bajo) → gris (medio) → verde (alto). */
function colorEscala(v, min, max) {
  const i = max === min ? 2 : Math.round(((v - min) / (max - min)) * 4);
  return color(DIVERGENTE[i]);
}

/* ------------------------------------------------------------- globito */

const tip = $('tip');
function mostrarTip(el, x, y) {
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2))}px`;
  tip.style.top = `${Math.max(8, y - r.height - 14)}px`;
}
document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest?.('[data-tip]');
  if (el) mostrarTip(el, e.clientX, e.clientY);
  else tip.hidden = true;
});
// En el teléfono: tocar muestra el globito; tocar en otro lado lo esconde.
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  const el = e.target.closest?.('[data-tip]');
  if (el) mostrarTip(el, e.clientX, e.clientY);
  else tip.hidden = true;
});
addEventListener('scroll', () => (tip.hidden = true), { passive: true });

/* ------------------------------------------------------------ gráficas */

/** Tabla plegable con los mismos datos de la gráfica. */
function tablaDatos(cabeceras, filas) {
  return h(
    'details',
    { class: 'datos' },
    h('summary', {}, 'Ver tabla'),
    h(
      'div',
      { class: 'tabla' },
      h(
        'table',
        {},
        h('thead', {}, h('tr', {}, cabeceras.map((c, i) => h('th', { class: i ? 'n' : null }, c)))),
        h('tbody', {}, filas.map((f) => h('tr', {}, f.map((c, i) => h('td', { class: i ? 'n' : null }, c))))),
      ),
    ),
  );
}

/** Barras horizontales ordenadas de mayor a menor. Las primeras, en verde fuerte. */
function barras(items, total, { destacar = 1, unidad = 'personas' } = {}) {
  const orden = [...items].sort((a, b) => b.n - a.n);
  const maximo = Math.max(1, ...orden.map((o) => o.n));
  return h(
    'div',
    { class: 'hbarras' },
    orden.map((o, i) =>
      h(
        'div',
        { class: `hbarra${i < destacar && o.n > 0 ? ' hbarra--top' : ''}`, 'data-tip': `${o.texto}: ${o.n} ${unidad} (${pct(o.n, total)}%)` },
        h('span', { class: 'hbarra__nombre' }, o.texto),
        h('span', { class: 'hbarra__valor' }, `${pct(o.n, total)}% `, h('small', {}, `· ${o.n}`)),
        h('div', { class: 'hbarra__pista' }, h('div', { class: 'hbarra__relleno', style: `width:${(o.n / maximo) * 100}%` })),
      ),
    ),
  );
}

/** Una barra al 100% partida en pedazos (partes de un todo) y su leyenda. */
function apilada(items, total) {
  const conDatos = items.filter((o) => o.n > 0);
  return [
    h(
      'div',
      { class: 'apilada', role: 'img', 'aria-label': conDatos.map((o) => `${o.texto} ${pct(o.n, total)}%`).join(', ') },
      conDatos.map((o) => h('span', { style: `flex:${o.n};background:${o.color}`, 'data-tip': `${o.texto}: ${o.n} (${pct(o.n, total)}%)` })),
    ),
    h(
      'ul',
      { class: 'leyenda' },
      items.map((o) => h('li', {}, h('i', { style: `background:${o.color}` }), h('span', {}, o.texto), h('b', {}, `${pct(o.n, total)}%`))),
    ),
  ];
}

/** Columnas verticales (una escala, o respuestas por día). */
function columnas(items, { conValor = true } = {}) {
  const maximo = Math.max(1, ...items.map((c) => c.n));
  return [
    h(
      'div',
      { class: 'columnas' },
      items.map((c) =>
        h(
          'div',
          { class: 'columna', 'data-tip': c.tip },
          conValor || c.n === maximo ? h('span', { class: 'columna__valor' }, c.n) : null,
          h('div', { class: 'columna__barra', style: `height:${(c.n / maximo) * 100}%${c.color ? `;background:${c.color}` : ''}` }),
        ),
      ),
    ),
    h('div', { class: 'columnas__ejes' }, items.map((c, i) => h('span', {}, items.length <= 16 || i % Math.ceil(items.length / 10) === 0 ? c.etiqueta : ''))),
  ];
}

/** Leyenda de una escala: 1 = etiquetaMin … 5 = etiquetaMax. */
function leyendaEscala(p) {
  const valores = [];
  for (let v = p.min; v <= p.max; v++) valores.push(v);
  return h(
    'ul',
    { class: 'escala-leyenda' },
    valores.map((v) => {
      let texto = String(v);
      if (v === p.min && p.etiquetaMin) texto += ` ${p.etiquetaMin}`;
      if (v === p.max && p.etiquetaMax) texto += ` ${p.etiquetaMax}`;
      return h('li', {}, h('i', { style: `background:${colorEscala(v, p.min, p.max)}` }), texto);
    }),
  );
}

/** Matriz: una barra por fila partida por nivel de la escala, con el promedio. */
function likert(p, filas = p.filas) {
  return h(
    'div',
    { class: 'likert' },
    filas.map((f) => {
      const trozos = [];
      for (let v = p.min; v <= p.max; v++) {
        const n = f.distribucion[v] ?? 0;
        if (n) trozos.push(h('span', { style: `flex:${n};background:${colorEscala(v, p.min, p.max)}`, 'data-tip': `${f.texto} · ${v}: ${n} (${pct(n, f.n)}%)` }));
      }
      return h(
        'div',
        { class: 'likert__fila' },
        h('span', { class: 'likert__nombre' }, f.texto),
        h('span', { class: 'likert__prom', 'data-tip': `Promedio de ${f.n} respuestas` }, `${dec(f.promedio)} / ${p.max}`),
        h('div', { class: 'likert__barra' }, trozos),
      );
    }),
  );
}

const esNps = (p) => p.tipo === 'escala' && p.min === 0 && p.max === 10;

/** NPS: % de 9–10 menos % de 0–6. */
function nps(p) {
  let det = 0;
  let pas = 0;
  let pro = 0;
  for (const [v, n] of Object.entries(p.distribucion)) {
    if (v >= 9) pro += n;
    else if (v >= 7) pas += n;
    else det += n;
  }
  const t = det + pas + pro;
  return { puntaje: t ? pct(pro, t) - pct(det, t) : null, det, pas, pro, t };
}

function graficaNps(p) {
  const r = nps(p);
  const grupos = [
    { texto: 'Lo recomiendan (9–10)', n: r.pro, color: color('div-5') },
    { texto: 'Neutrales (7–8)', n: r.pas, color: color('div-3') },
    { texto: 'No lo recomiendan (0–6)', n: r.det, color: color('div-1') },
  ];
  const signo = r.puntaje > 0 ? '+' : '';
  const cols = [];
  for (let v = 0; v <= 10; v++) {
    const n = p.distribucion[v] ?? 0;
    cols.push({ etiqueta: String(v), n, tip: `${v}: ${n} (${pct(n, r.t)}%)`, color: color(v >= 9 ? 'div-5' : v >= 7 ? 'div-3' : 'div-1') });
  }
  return [
    h(
      'div',
      { class: 'nps' },
      h('div', { class: 'nps__numero', 'data-tip': '% que lo recomienda menos % que no. Va de −100 a +100.' }, r.puntaje === null ? '—' : `${signo}${r.puntaje}`, h('small', {}, 'NPS')),
      h('div', {}, apilada(grupos, r.t)),
    ),
    h('details', { class: 'datos' }, h('summary', {}, 'Ver cada nota del 0 al 10'), h('div', { style: 'margin-top:10px' }, columnas(cols))),
  ];
}

/* ---------------------------------------- una pregunta: gráfica y frase */

function graficaPregunta(p) {
  if (!p.respondieron) return h('p', { class: 'vacio' }, 'Nadie respondió esta pregunta todavía.');

  if (p.tipo === 'unica' || p.tipo === 'multiple') {
    const partes = [];
    // Pocas opciones de una sola respuesta: son partes de un todo, van en una
    // barra al 100%. Muchas, o de varias respuestas: barras ordenadas.
    if (p.tipo === 'unica' && p.opciones.length <= CATEGORICOS.length) {
      partes.push(apilada(p.opciones.map((o, i) => ({ ...o, color: color(CATEGORICOS[i]) })), p.respondieron));
    } else {
      partes.push(barras(p.opciones, p.respondieron));
    }
    if (p.otros.length) {
      partes.push(
        h('details', { class: 'datos' }, h('summary', {}, `Lo que escribieron en "otro" (${p.otros.length})`), h('ul', { class: 'lista-textos', style: 'margin-top:8px' }, p.otros.map((t) => h('li', {}, t)))),
      );
    }
    return partes;
  }

  if (p.tipo === 'escala') {
    if (esNps(p)) return graficaNps(p);
    const cols = [];
    for (let v = p.min; v <= p.max; v++) {
      const n = p.distribucion[v] ?? 0;
      cols.push({ etiqueta: String(v), n, tip: `${v}: ${n} (${pct(n, p.respondieron)}%)`, color: colorEscala(v, p.min, p.max) });
    }
    return [leyendaEscala(p), columnas(cols)];
  }

  if (p.tipo === 'matriz') return [leyendaEscala(p), likert(p)];

  return listaTextos(p.textos);
}

/** Frase corta para la tarjeta cerrada: lo más importante de la pregunta. */
function frase(p) {
  if (!p.respondieron) return 'Sin respuestas todavía';
  if (p.opciones) {
    const top = [...p.opciones].sort((a, b) => b.n - a.n)[0];
    return [h('b', {}, top.texto), ` · ${pct(top.n, p.respondieron)}%`];
  }
  if (esNps(p)) {
    const r = nps(p);
    return ['NPS ', h('b', {}, `${r.puntaje > 0 ? '+' : ''}${r.puntaje}`)];
  }
  if (p.tipo === 'escala') return ['Promedio ', h('b', {}, dec(p.promedio)), ` de ${p.max}`];
  if (p.tipo === 'matriz') return [h('b', {}, p.filas[0].texto), ` · ${dec(p.filas[0].promedio)} de ${p.max}`];
  return [h('b', {}, p.respondieron), p.respondieron === 1 ? ' respuesta' : ' respuestas'];
}

/* ------------------------------------------- listas con buscador y páginas */

/** Controles "Anterior · 1–20 de 57 · Siguiente". */
function paginas(total, pagina, tam, ir) {
  if (total <= tam) return null;
  const ultima = Math.ceil(total / tam) - 1;
  return h(
    'div',
    { class: 'paginas' },
    h('button', { class: 'btn btn--papel btn--chico', type: 'button', disabled: pagina === 0, onclick: () => ir(pagina - 1) }, '← Anterior'),
    h('span', {}, `${pagina * tam + 1}–${Math.min(total, (pagina + 1) * tam)} de ${total}`),
    h('button', { class: 'btn btn--papel btn--chico', type: 'button', disabled: pagina >= ultima, onclick: () => ir(pagina + 1) }, 'Siguiente →'),
  );
}

function buscador(placeholder, valor, alCambiar) {
  const input = h('input', { class: 'campo buscador', type: 'search', placeholder, value: valor, 'aria-label': placeholder });
  input.addEventListener('input', () => alCambiar(input.value));
  return input;
}

/** Respuestas de texto libre: buscador y de a 10. */
function listaTextos(textos) {
  const TAM = 10;
  const caja = h('div');
  const lista = h('div');
  let q = '';
  let pagina = 0;
  const pintar = () => {
    const filtro = sinTildes(q);
    const vis = filtro ? textos.filter((t) => sinTildes(t.texto).includes(filtro)) : textos;
    pagina = Math.min(pagina, Math.max(0, Math.ceil(vis.length / TAM) - 1));
    poner(lista, 
      vis.length
        ? h('ul', { class: 'lista-textos' }, vis.slice(pagina * TAM, (pagina + 1) * TAM).map((t) => h('li', {}, t.texto, h('time', {}, fecha(t.en)))))
        : h('p', { class: 'vacio' }, 'Nada coincide con la búsqueda.'),
      paginas(vis.length, pagina, TAM, (n) => {
        pagina = n;
        pintar();
      }),
    );
  };
  if (textos.length > TAM) {
    caja.append(
      buscador('Buscar en las respuestas…', '', (v) => {
        q = v;
        pagina = 0;
        pintar();
      }),
    );
  }
  caja.append(lista);
  pintar();
  return caja;
}

/** Botones de filtro que se excluyen entre sí. */
function chips(opciones, actual, elegir) {
  return h(
    'div',
    { class: 'filtros', role: 'group' },
    opciones.map(([valor, texto]) =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': String(valor === actual), onclick: () => elegir(valor) }, texto),
    ),
  );
}

/* ----------------------------------------------------------- el estado */

const estado = {
  slug: null,
  r: null, // resumen
  pestana: 'resumen',
  seccion: 'todas',
  abiertas: new Set(),
  correos: null,
  correosFiltro: { estado: 'todos', q: '', pagina: 0, aviso: '' },
  contactos: null,
  contactosError: '',
  contactosFiltro: { tipo: 'todos', q: '', pagina: 0, aviso: '' },
};

const PESTANAS = [
  ['resumen', 'Resumen'],
  ['preguntas', 'Preguntas'],
  ['correos', 'Correos'],
  ['contactos', 'Contactos'],
];

async function entrar() {
  try {
    const { encuestas } = await (await api('/api/admin/encuestas')).json();
    sessionStorage.setItem(CLAVE, token);
    $('acceso').hidden = true;
    $('panel').hidden = false;
    const sel = $('encuesta');
    sel.replaceChildren(...encuestas.map((e) => h('option', { value: e.slug }, `${e.titulo} · ${e.estado} · ${e.respuestas} resp.`)));
    if (encuestas.length) cargarEncuesta(encuestas[0].slug);
    else poner($('contenido'), h('p', { class: 'vacio' }, 'Todavía no hay encuestas publicadas.'));
  } catch (err) {
    $('acceso-error').textContent = err.message;
    sessionStorage.removeItem(CLAVE);
  }
}

async function cargarEncuesta(slug) {
  Object.assign(estado, { slug, r: null, correos: null, contactos: null, contactosError: '', seccion: 'todas', abiertas: new Set() });
  poner($('kpis'), );
  poner($('contenido'), h('p', { class: 'meta' }, 'Cargando…'));
  try {
    estado.r = await (await api(`/api/admin/encuestas/${slug}/resumen`)).json();
  } catch (err) {
    poner($('contenido'), h('p', { class: 'vacio' }, `No se pudo cargar el resumen: ${err.message}`));
    return;
  }
  pintarKpis();
  pintarPestanas();
  pintarContenido();
  // Los contactos se piden ya, para que el número de la pestaña esté.
  cargarContactos().then(pintarPestanas);
}

function pintarKpis() {
  const r = estado.r;
  const enviados = r.correos?.enviado ?? 0;
  const conCorreo = Object.values(r.correos ?? {}).reduce((a, b) => a + b, 0);
  const min = r.duracionPromedioSeg ? Math.round(r.duracionPromedioSeg / 60) : null;
  const ultimo = r.porDia?.at(-1);
  poner($('kpis'), 
    h('div', { class: 'kpi' }, h('b', {}, r.respuestas), h('span', {}, 'respuestas')),
    h('div', { class: 'kpi' }, h('b', {}, min === null ? '—' : `${Math.max(1, min)} min`), h('span', {}, 'en contestar, en promedio')),
    h('div', { class: 'kpi' }, h('b', {}, conCorreo ? `${enviados}/${conCorreo}` : '—'), h('span', {}, 'correos que llegaron')),
    h('div', { class: 'kpi' }, h('b', {}, ultimo ? ultimo.n : 0), h('span', {}, ultimo ? `el último día (${diaCorto(ultimo.dia)})` : 'respuestas hoy')),
  );
}

function pintarPestanas() {
  const r = estado.r;
  const cuenta = {
    preguntas: r?.preguntas.length,
    correos: r?.correos ? Object.values(r.correos).reduce((a, b) => a + b, 0) : null,
    contactos: estado.contactos?.length ?? null,
  };
  poner($('pestanas'), 
    ...PESTANAS.map(([id, texto]) =>
      h(
        'button',
        {
          class: 'pestana',
          type: 'button',
          role: 'tab',
          id: `pestana-${id}`,
          'aria-selected': String(estado.pestana === id),
          onclick: () => irA(id),
        },
        texto,
        cuenta[id] !== null && cuenta[id] !== undefined ? h('span', { class: 'num' }, cuenta[id]) : null,
      ),
    ),
  );
}

function irA(pestana) {
  estado.pestana = pestana;
  history.replaceState(null, '', `#${pestana}`);
  pintarPestanas();
  pintarContenido();
  const nav = $('pestanas');
  if (nav.getBoundingClientRect().top < 0 || scrollY > nav.offsetTop) scrollTo({ top: nav.offsetTop });
}

function pintarContenido() {
  const cont = $('contenido');
  cont.setAttribute('aria-labelledby', `pestana-${estado.pestana}`);
  if (estado.pestana === 'preguntas') poner(cont, vistaPreguntas());
  else if (estado.pestana === 'correos') vistaCorreos(cont);
  else if (estado.pestana === 'contactos') vistaContactos(cont);
  else poner(cont, vistaResumen());
}

/* ------------------------------------------------------ pestaña Resumen */

function tarjeta(titulo, sub, cuerpo, { ancha = false, pregunta = null } = {}) {
  return h(
    'article',
    { class: `carta${ancha ? ' carta--ancha' : ''}` },
    h('h3', {}, titulo),
    sub ? h('p', { class: 'meta' }, sub) : null,
    cuerpo,
    pregunta
      ? h('p', { style: 'margin:12px 0 0' }, h('a', { href: '#preguntas', onclick: (e) => { e.preventDefault(); verPregunta(pregunta); } }, 'Ver la pregunta completa →'))
      : null,
  );
}

function verPregunta(id) {
  estado.seccion = 'todas';
  estado.abiertas.add(id);
  irA('preguntas');
  document.getElementById(`p-${id}`)?.scrollIntoView({ block: 'start' });
}

function vistaResumen() {
  const r = estado.r;
  if (!r.respuestas) return h('p', { class: 'vacio' }, 'Todavía nadie respondió esta encuesta. Cuando lleguen respuestas, acá aparece lo más importante.');

  const actuales = r.preguntas.filter((p) => !p.anterior && p.respondieron);
  const cartas = [];

  // Respuestas por día: los últimos 30 días con datos, sin saltarse días vacíos.
  if (r.porDia?.length) {
    const dias = [];
    const hasta = new Date(`${r.porDia.at(-1).dia}T00:00:00Z`);
    const desde = new Date(Math.max(new Date(`${r.porDia[0].dia}T00:00:00Z`), hasta - 29 * 864e5));
    const n = new Map(r.porDia.map((d) => [d.dia, d.n]));
    for (let d = desde; d <= hasta; d = new Date(+d + 864e5)) {
      const dia = d.toISOString().slice(0, 10);
      // En el eje va solo el número del día (si no, no cabe en el teléfono); en el globito, la fecha.
      dias.push({ etiqueta: String(Number(dia.slice(8))), fecha: diaCorto(dia), n: n.get(dia) ?? 0, tip: `${diaCorto(dia)}: ${n.get(dia) ?? 0} respuestas` });
    }
    const mejor = [...dias].sort((a, b) => b.n - a.n)[0];
    cartas.push(
      tarjeta('Respuestas por día', `Desde el ${dias[0].fecha} · el día con más: ${mejor.fecha}, con ${mejor.n}`, [columnas(dias, { conValor: dias.length <= 14 }), tablaDatos(['Día', 'Respuestas'], dias.map((d) => [d.fecha, d.n]))], {
        ancha: true,
      }),
    );
  }

  // La primera pregunta de opción única (casi siempre: quién respondió).
  const quien = actuales.find((p) => p.tipo === 'unica' && p.opciones.length <= CATEGORICOS.length);
  if (quien) cartas.push(tarjeta(quien.texto, personas(quien.respondieron), apilada(quien.opciones.map((o, i) => ({ ...o, color: color(CATEGORICOS[i]) })), quien.respondieron), { pregunta: quien.id }));

  for (const p of actuales.filter(esNps)) cartas.push(tarjeta(p.texto, personas(p.respondieron), graficaNps(p), { pregunta: p.id }));

  // Las matrices son las listas de deseos: lo más valorado arriba.
  for (const p of actuales.filter((q) => q.tipo === 'matriz')) {
    const top = p.filas.filter((f) => f.n).slice(0, 5);
    cartas.push(
      tarjeta(p.texto, `Los ${top.length} mejor valorados, de ${p.filas.length}`, [leyendaEscala(p), likert(p, top)], { ancha: true, pregunta: p.id }),
    );
  }

  // Las escalas (1 a 5) van juntas en una sola tarjeta, una fila cada una:
  // se comparan de un vistazo y no alargan la página.
  const escalas = actuales.filter((q) => q.tipo === 'escala' && !esNps(q));
  const grupos = new Map();
  for (const p of escalas) {
    const clave = `${p.min}-${p.max}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(p);
  }
  for (const ps of grupos.values()) {
    const filas = ps.map((p) => ({ texto: p.texto, n: p.respondieron, promedio: p.promedio, distribucion: p.distribucion }));
    const escala = { min: ps[0].min, max: ps[0].max };
    cartas.push(
      tarjeta(ps.length > 1 ? 'Las preguntas de escala' : ps[0].texto, `Promedio de ${escala.min} a ${escala.max} · ${personas(Math.max(...ps.map((p) => p.respondieron)))}`, [
        leyendaEscala(escala),
        likert(escala, filas),
      ], { ancha: ps.length > 1 }),
    );
  }

  // De un vistazo: lo más elegido en cada pregunta de opciones, una fila por
  // pregunta (tocarla abre la pregunta completa).
  const deOpciones = actuales.filter((q) => q.opciones && q !== quien);
  if (deOpciones.length) {
    cartas.push(
      tarjeta('De un vistazo', 'Lo más elegido en cada pregunta. Tocá una para verla completa.', [
        h(
          'div',
          { class: 'hbarras vistazo' },
          deOpciones.map((p) => {
            const top = [...p.opciones].sort((a, b) => b.n - a.n)[0];
            const x = pct(top.n, p.respondieron);
            return h(
              'a',
              { class: 'hbarra hbarra--top', href: `#preguntas`, onclick: (e) => { e.preventDefault(); verPregunta(p.id); }, 'data-tip': `${top.n} de ${p.respondieron} personas` },
              h('span', { class: 'vistazo__pregunta' }, p.texto),
              h('span', { class: 'hbarra__nombre' }, top.texto),
              h('span', { class: 'hbarra__valor' }, `${x}%`),
              h('div', { class: 'hbarra__pista' }, h('div', { class: 'hbarra__relleno', style: `width:${x}%` })),
            );
          }),
        ),
      ], { ancha: true }),
    );
  }

  return h('div', { class: 'cartas cartas--dos' }, cartas);
}

/* ---------------------------------------------------- pestaña Preguntas */

function vistaPreguntas() {
  const r = estado.r;
  const secciones = [...r.secciones];
  if (r.preguntas.some((p) => p.anterior)) secciones.push('Versiones anteriores');
  const filtro = chips(
    [['todas', 'Todas'], ...secciones.map((s) => [s, s])],
    estado.seccion,
    (s) => {
      estado.seccion = s;
      pintarContenido();
    },
  );
  const lista = r.preguntas.filter((p) => estado.seccion === 'todas' || p.seccion === estado.seccion);
  return h('div', {}, filtro, h('div', { class: 'cartas' }, lista.map(tarjetaPregunta)));
}

function tarjetaPregunta(p) {
  const cuerpo = h('div', { class: 'plegable__cuerpo' });
  const det = h(
    'details',
    { class: 'pregunta-plegable', id: `p-${p.id}`, open: estado.abiertas.has(p.id) },
    h(
      'summary',
      {},
      h('span', { class: 'plegable__titulo' }, p.texto),
      h('span', { class: 'plegable__resumen' }, frase(p)),
    ),
    cuerpo,
  );
  // La gráfica se arma recién al abrir: con 30 preguntas, la pestaña carga al toque.
  const llenar = () => {
    if (cuerpo.childElementCount) return;
    poner(cuerpo, 
      p.anterior ? h('p', { class: 'meta', style: 'margin:0 0 12px' }, `De la versión ${p.anterior}: ya no está en la encuesta.`) : null,
      graficaPregunta(p),
    );
  };
  if (det.open) llenar();
  det.addEventListener('toggle', () => {
    if (det.open) {
      estado.abiertas.add(p.id);
      llenar();
    } else estado.abiertas.delete(p.id);
  });
  return det;
}

/* ------------------------------------------------------ pestaña Correos */

const ETIQUETA = { enviado: 'Enviado', error: 'Falló', omitido: 'Sin enviar' };

async function vistaCorreos(cont) {
  if (!estado.correos) {
    poner(cont, h('p', { class: 'meta' }, 'Cargando correos…'));
    try {
      ({ correos: estado.correos } = await (await api(`/api/admin/encuestas/${estado.slug}/correos`)).json());
    } catch (err) {
      poner(cont, h('p', { class: 'vacio' }, `No se pudieron leer los correos: ${err.message}`));
      return;
    }
    if (estado.pestana !== 'correos') return;
  }
  const lista = estado.correos;
  const f = estado.correosFiltro;
  if (!lista.length) {
    poner(cont, h('p', { class: 'vacio' }, 'Todavía nadie dejó su correo en la encuesta.'));
    return;
  }

  const cuenta = { enviado: 0, error: 0, omitido: 0 };
  for (const c of lista) cuenta[c.estado] = (cuenta[c.estado] ?? 0) + 1;
  const pendientes = cuenta.error + cuenta.omitido;
  const repintar = () => vistaCorreos(cont);

  const filtrados = lista.filter((c) => (f.estado === 'todos' || c.estado === f.estado) && (!f.q || sinTildes(c.para).includes(sinTildes(f.q))));
  const TAM = 20;
  f.pagina = Math.min(f.pagina, Math.max(0, Math.ceil(filtrados.length / TAM) - 1));

  const aviso = h('p', { class: 'nota', role: 'status' }, f.aviso);
  const botonTodos = pendientes
    ? h(
        'button',
        {
          class: 'btn',
          type: 'button',
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            aviso.textContent = 'Mandando… puede tardar unos segundos.';
            try {
              const r = await (await api(`/api/admin/encuestas/${estado.slug}/correos/reenviar`, { method: 'POST', body: '{}' })).json();
              f.aviso = `Enviados: ${r.enviado} · fallaron: ${r.error} · sin enviar: ${r.omitido}${r.quedan ? ' · quedan más: tocá de nuevo' : ''}`;
            } catch (err) {
              f.aviso = err.message;
            }
            estado.correos = null;
            repintar();
          },
        },
        `Reenviar los que no llegaron (${pendientes})`,
      )
    : null;

  const total = lista.length;
  poner(cont, 
    h(
      'article',
      { class: 'carta', style: 'margin-bottom:14px' },
      h('h3', {}, 'Cómo van los correos con el enlace'),
      h('p', { class: 'meta' }, `${total} ${total === 1 ? 'dirección' : 'direcciones'} de la encuesta`),
      apilada(
        [
          { texto: 'Llegaron', n: cuenta.enviado, color: color('div-5') },
          { texto: 'Fallaron', n: cuenta.error, color: color('div-1') },
          { texto: 'Sin enviar', n: cuenta.omitido, color: color('div-3') },
        ],
        total,
      ),
      botonTodos ? h('div', { style: 'margin-top:14px' }, botonTodos) : null,
      aviso,
    ),
    chips(
      [
        ['todos', `Todos · ${total}`],
        ['enviado', `Enviado · ${cuenta.enviado}`],
        ['error', `Falló · ${cuenta.error}`],
        ['omitido', `Sin enviar · ${cuenta.omitido}`],
      ],
      f.estado,
      (v) => {
        Object.assign(f, { estado: v, pagina: 0 });
        repintar();
      },
    ),
    buscadorVivo('Buscar un correo…', f, repintar),
    filtrados.length ? h('ul', { class: 'correos__lista' }, filtrados.slice(f.pagina * TAM, (f.pagina + 1) * TAM).map((c) => filaCorreo(c, repintar))) : h('p', { class: 'vacio' }, 'Ninguno coincide.'),
    paginas(filtrados.length, f.pagina, TAM, (n) => {
      f.pagina = n;
      repintar();
    }),
  );
}

/** Buscador que no pierde el foco al repintar la lista. */
function buscadorVivo(placeholder, f, repintar) {
  const input = buscador(placeholder, f.q, (v) => {
    Object.assign(f, { q: v, pagina: 0 });
    const pos = input.selectionStart;
    repintar();
    const nuevo = $('contenido').querySelector('input.buscador');
    nuevo?.focus();
    nuevo?.setSelectionRange(pos, pos);
  });
  return input;
}

function filaCorreo(c, repintar) {
  const boton = h(
    'button',
    {
      class: 'btn btn--papel btn--chico',
      type: 'button',
      onclick: async () => {
        if (c.estado === 'enviado' && !confirm(`A ${c.para} ya le llegó. ¿Mandárselo otra vez?`)) return;
        boton.disabled = true;
        boton.textContent = 'Mandando…';
        try {
          await api(`/api/admin/correos/${c.respuesta_id}/reenviar`, { method: 'POST' });
        } catch (err) {
          alert(err.message);
        }
        estado.correos = null;
        repintar();
      },
    },
    c.estado === 'enviado' ? 'Reenviar' : 'Intentar de nuevo',
  );
  return h(
    'li',
    { class: 'correo' },
    h('div', { class: 'correo__fila' }, h('b', { class: 'correo__para' }, c.para), h('span', { class: `estado estado--${c.estado}` }, ETIQUETA[c.estado] ?? c.estado)),
    c.detalle ? h('p', { class: 'meta correo__detalle' }, c.detalle) : null,
    h('div', { class: 'correo__fila' }, h('span', { class: 'meta' }, `${c.intentos > 1 ? `${c.intentos} intentos · ` : ''}${fecha(c.actualizado_en)}`), boton),
  );
}

/* ---------------------------------------------------- pestaña Contactos */

const ETIQUETA_CONTACTO = { enviado: 'Enlace enviado', error: 'Falló', omitido: 'Sin enviar' };

async function cargarContactos() {
  try {
    ({ contactos: estado.contactos } = await (await api(`/api/admin/encuestas/${estado.slug}/contactos`)).json());
    estado.contactosError = '';
  } catch (err) {
    estado.contactos = null;
    estado.contactosError = err.message;
  }
}

async function vistaContactos(cont) {
  if (!estado.contactos && !estado.contactosError) {
    poner(cont, h('p', { class: 'meta' }, 'Cargando contactos…'));
    await cargarContactos();
    pintarPestanas();
    if (estado.pestana !== 'contactos') return;
  }
  const f = estado.contactosFiltro;
  const lista = estado.contactos ?? [];
  const repintar = () => vistaContactos(cont);
  const recargar = async () => {
    await cargarContactos();
    pintarPestanas();
    repintar();
  };

  const estadoDe = (c) => (c.correo ? c.correo_estado ?? 'omitido' : 'numero');
  const cuenta = { correo: 0, numero: 0, enviado: 0, error: 0, omitido: 0 };
  for (const c of lista) {
    if (c.correo) cuenta.correo++;
    else cuenta.numero++;
    if (c.correo) cuenta[estadoDe(c)] = (cuenta[estadoDe(c)] ?? 0) + 1;
  }
  const pasa = (c) => {
    if (f.tipo === 'correo' && !c.correo) return false;
    if (f.tipo === 'numero' && c.correo) return false;
    if (['enviado', 'error', 'omitido'].includes(f.tipo) && estadoDe(c) !== f.tipo) return false;
    if (!f.q) return true;
    return sinTildes([c.nombre, c.correo, c.telefono].filter(Boolean).join(' ')).includes(sinTildes(f.q));
  };
  const filtrados = lista.filter(pasa);
  const TAM = 20;
  f.pagina = Math.min(f.pagina, Math.max(0, Math.ceil(filtrados.length / TAM) - 1));

  poner(cont, 
    formularioContactos(lista.length === 0, recargar),
    f.aviso ? h('p', { class: 'nota', role: 'status' }, f.aviso) : null,
    estado.contactosError
      ? h('p', { class: 'vacio', style: 'color:var(--intento-tinta)' }, `No se pudo leer la lista de contactos: ${estado.contactosError}`)
      : null,
    lista.length
      ? [
          h(
            'article',
            { class: 'carta', style: 'margin-bottom:14px' },
            h('h3', {}, 'Contactos agregados a mano'),
            h('p', { class: 'meta' }, `${lista.length} en total · ${cuenta.correo} con correo · ${cuenta.numero} solo con número`),
            cuenta.correo
              ? apilada(
                  [
                    { texto: 'Les llegó el enlace', n: cuenta.enviado, color: color('div-5') },
                    { texto: 'Falló', n: cuenta.error, color: color('div-1') },
                    { texto: 'Sin enviar', n: cuenta.omitido, color: color('div-3') },
                  ],
                  cuenta.correo,
                )
              : null,
          ),
          chips(
            [
              ['todos', `Todos · ${lista.length}`],
              ['correo', `Con correo · ${cuenta.correo}`],
              ['numero', `Solo número · ${cuenta.numero}`],
              ['enviado', `Enviado · ${cuenta.enviado}`],
              ['error', `Falló · ${cuenta.error}`],
              ['omitido', `Sin enviar · ${cuenta.omitido}`],
            ],
            f.tipo,
            (v) => {
              Object.assign(f, { tipo: v, pagina: 0 });
              repintar();
            },
          ),
          buscadorVivo('Buscar por nombre, correo o número…', f, repintar),
          filtrados.length
            ? h('ul', { class: 'correos__lista' }, filtrados.slice(f.pagina * TAM, (f.pagina + 1) * TAM).map((c) => filaContacto(c, recargar)))
            : h('p', { class: 'vacio' }, 'Ninguno coincide.'),
          paginas(filtrados.length, f.pagina, TAM, (n) => {
            f.pagina = n;
            repintar();
          }),
        ]
      : estado.contactosError
        ? null
        : h('p', { class: 'vacio' }, 'Todavía no hay contactos agregados a mano.'),
  );
}

function formularioContactos(abierto, recargar) {
  const f = estado.contactosFiltro;
  const texto = h('textarea', {
    class: 'campo',
    id: 'contactos-texto',
    rows: '5',
    placeholder: 'Uno por línea. Por ejemplo:\nAna López, ana@correo.com\n+505 8888 1234\nCarlos, carlos@correo.com, 8888-5555',
  });
  const enviar = h('input', { type: 'checkbox', id: 'contactos-enviar', checked: true });
  // Trae al cuadro lo que la gente escribió en preguntas de texto de versiones
  // anteriores que tengan pinta de contacto (un correo o un número), para
  // revisarlo antes de agregarlo.
  const traer = h('button', { class: 'btn btn--papel btn--chico', type: 'button' }, 'Traer los contactos viejos de la encuesta');
  traer.addEventListener('click', async () => {
    traer.disabled = true;
    traer.textContent = 'Buscando…';
    try {
      const r = await (await api(`/api/admin/encuestas/${estado.slug}/contactos/viejos`)).json();
      texto.value = r.lineas.join('\n');
      if (r.lineas.length) traer.textContent = `Se trajeron ${r.lineas.length}: revisalos y tocá "Agregar contactos"`;
      else if (r.yaAgregados) traer.textContent = `Los ${r.yaAgregados} contactos viejos ya estaban agregados`;
      else if (!r.preguntas.length) traer.textContent = 'La encuesta no tiene preguntas de versiones anteriores';
      else traer.textContent = `Nadie dejó un correo o número válido en: ${r.preguntas.map((p) => `"${p.texto}"`).join(', ')}`;
    } catch (err) {
      traer.textContent = `No se pudo: ${err.message}`;
    }
    traer.disabled = false;
  });
  const boton = h('button', { class: 'btn', type: 'submit' }, 'Agregar contactos');

  const form = h(
    'form',
    {},
    h('p', { class: 'meta', style: 'margin:0 0 12px' }, 'Para los que dejaron su correo o número antes (por ejemplo en la pregunta "contacto" de la versión anterior) o por fuera de la encuesta. Uno por línea; el nombre es opcional. Los repetidos no se agregan dos veces.'),
    traer,
    texto,
    h('label', { class: 'contactos__check' }, enviar, ' Mandarles el enlace de descarga a los que tengan correo'),
    boton,
  );
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!texto.value.trim()) return;
    boton.disabled = true;
    boton.textContent = enviar.checked ? 'Agregando y mandando…' : 'Agregando…';
    try {
      const r = await (
        await api(`/api/admin/encuestas/${estado.slug}/contactos`, { method: 'POST', body: JSON.stringify({ texto: texto.value, enviar: enviar.checked }) })
      ).json();
      const partes = [`Agregados: ${r.agregados}`];
      if (r.repetidos) partes.push(`ya estaban: ${r.repetidos}`);
      if (enviar.checked) partes.push(`correos enviados: ${r.enviado}`, `fallaron: ${r.error}`);
      if (r.omitido) partes.push('no se mandaron: el envío de correos todavía no está configurado');
      if (r.sinEnviar) partes.push(`quedaron ${r.sinEnviar} sin mandar: usá "Mandar enlace" en cada uno`);
      if (r.invalidas.length) partes.push(`no se entendieron ${r.invalidas.length} líneas: ${r.invalidas.join(' / ')}`);
      if (r.recortado) partes.push(`solo se leen las primeras ${r.maxLineas} líneas`);
      f.aviso = partes.join(' · ');
    } catch (err) {
      f.aviso = err.message;
    }
    recargar();
  });

  return h('details', { class: 'agregar', open: abierto }, h('summary', {}, '+ Agregar contactos a mano'), h('div', {}, form));
}

function filaContacto(c, recargar) {
  const acciones = h('div', { class: 'correo__acciones' });
  if (c.correo) {
    const mandar = h('button', { class: 'btn btn--papel btn--chico', type: 'button' }, c.correo_estado === 'enviado' ? 'Reenviar' : 'Mandar enlace');
    mandar.addEventListener('click', async () => {
      if (c.correo_estado === 'enviado' && !confirm(`A ${c.correo} ya le llegó. ¿Mandárselo otra vez?`)) return;
      mandar.disabled = true;
      mandar.textContent = 'Mandando…';
      try {
        await api(`/api/admin/contactos/${c.id}/enviar`, { method: 'POST' });
      } catch (err) {
        alert(err.message);
      }
      recargar();
    });
    acciones.append(mandar);
  }
  const borrar = h('button', { class: 'btn btn--fantasma btn--chico', type: 'button' }, 'Borrar');
  borrar.addEventListener('click', async () => {
    if (!confirm(`¿Borrar a ${c.nombre ?? c.correo ?? c.telefono}?`)) return;
    try {
      await api(`/api/admin/contactos/${c.id}`, { method: 'DELETE' });
    } catch (err) {
      alert(err.message);
    }
    recargar();
  });
  acciones.append(borrar);

  const est = c.correo
    ? h('span', { class: `estado estado--${c.correo_estado ?? 'omitido'}` }, ETIQUETA_CONTACTO[c.correo_estado] ?? 'Sin enviar')
    : h('span', { class: 'estado estado--numero' }, 'Solo número');
  return h(
    'li',
    { class: 'correo' },
    h('div', { class: 'correo__fila' }, h('b', { class: 'correo__para' }, c.nombre ?? c.correo ?? c.telefono), est),
    h('p', { class: 'meta correo__para' }, [c.correo, c.telefono].filter(Boolean).join(' · ')),
    c.correo_detalle ? h('p', { class: 'meta correo__detalle' }, c.correo_detalle) : null,
    h('div', { class: 'correo__fila' }, h('span', { class: 'meta' }, `${c.correo_intentos > 1 ? `${c.correo_intentos} intentos · ` : ''}${fecha(c.correo_actualizado_en ?? c.creado_en)}`), acciones),
  );
}

/* --------------------------------------------------------------- inicio */

const inicial = location.hash.slice(1);
if (PESTANAS.some(([id]) => id === inicial)) estado.pestana = inicial;

$('acceso').addEventListener('submit', (e) => {
  e.preventDefault();
  token = $('token').value.trim();
  entrar();
});
$('encuesta').addEventListener('change', (e) => cargarEncuesta(e.target.value));
$('salir').addEventListener('click', () => {
  sessionStorage.removeItem(CLAVE);
  location.reload();
});
$('csv').addEventListener('click', async () => {
  const slug = $('encuesta').value;
  const blob = await (await api(`/api/admin/encuestas/${slug}/csv`)).blob();
  const a = h('a', { href: URL.createObjectURL(blob), download: `${slug}.csv` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

if (token) entrar();
