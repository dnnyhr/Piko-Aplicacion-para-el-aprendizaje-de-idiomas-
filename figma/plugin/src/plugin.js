/**
 * Piko · Importar pantallas — plugin de Figma.
 *
 * Reconstruye en Figma las pantallas reales de la app a partir de la captura
 * (`datos/captura.json`, que genera `figma/captura`). No es una imagen pegada:
 * cada pantalla queda con capas editables, auto layout, colores enlazados a
 * variables, estilos de texto y, sobre todo, INSTANCIAS de componentes
 * reutilizables (Botón, Opción, Globo, Barra de progreso, Piko…) con sus
 * variantes.
 *
 * Páginas que crea:
 *   🎨 Fundamentos    variables de color, espaciado y radios; estilos de texto
 *   🧩 Componentes    la biblioteca: component sets con variantes y descripción
 *   📱 Pantallas      los mockups de alta fidelidad, enlazados como prototipo
 *   🔀 Flujo UX       wireframes de baja fidelidad unidos por el flujo de usuario
 *   📦 Assets         ilustraciones e íconos listos para exportar (SVG / PNG)
 *   ♿ Accesibilidad  contraste de cada par de colores y tamaño de los toques
 *
 * `DATOS` y `AUDITORIA` los inyecta `construir-plugin.mjs` al armar code.js.
 *
 * Se evita `?.` y `??` a propósito: el sandbox de algunos Figma de escritorio
 * viejos no los entiende, y un plugin que no carga es peor que unas líneas más.
 */

/* global DATOS, AUDITORIA, figma, __html__ */

var PAGINAS = {
  fundamentos: '🎨 Fundamentos',
  componentes: '🧩 Componentes',
  pantallas: '📱 Pantallas',
  flujo: '🔀 Flujo UX',
  assets: '📦 Assets',
  a11y: '♿ Accesibilidad',
};

var SECCIONES = ['Inicio', 'Aprender', 'Progreso', 'Jugar y cantar', 'En clase'];

// ───────────────────────────────────────────────────────────── utilidades ──

function avisar(texto) {
  figma.ui.postMessage({ tipo: 'progreso', texto: texto });
}

function hexARgb(hex) {
  var h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}

function def(v, porDefecto) {
  return v === undefined || v === null ? porDefecto : v;
}

/** Pintura sólida; si el color coincide con un token, queda enlazada a la variable. */
function pintura(c) {
  var rgb = hexARgb(c.hex);
  var p = { type: 'SOLID', color: { r: rgb.r, g: rgb.g, b: rgb.b }, opacity: def(c.a, 1) };
  var v = ESTADO.varColor[c.hex + (def(c.a, 1) < 1 ? '@' + c.a : '')];
  if (v) {
    try {
      p = figma.variables.setBoundVariableForPaint(p, 'color', v);
    } catch (e) {
      /* sin variables: queda el color plano */
    }
  }
  return p;
}

function enlazarNumero(nodo, campo, valor, mapa) {
  var v = mapa[String(valor)];
  if (!v) return;
  try {
    nodo.setBoundVariable(campo, v);
  } catch (e) {
    /* el campo no admite variables en esta versión */
  }
}

function texto(contenido, opciones) {
  var t = figma.createText();
  var o = opciones || {};
  t.fontName = o.fuente || ESTADO.fuenteUI.normal;
  t.fontSize = o.tam || 14;
  t.characters = contenido;
  t.fills = [{ type: 'SOLID', color: hexARgb(o.color || '#33453B') }];
  if (o.ancho) {
    t.resize(o.ancho, t.height);
    t.textAutoResize = 'HEIGHT';
  }
  if (o.lh) t.lineHeight = { unit: 'PIXELS', value: o.lh };
  return t;
}

function marcoAL(nombre, modo, gap, pad) {
  var f = figma.createFrame();
  f.name = nombre;
  f.layoutMode = modo;
  f.itemSpacing = gap || 0;
  var p = pad === undefined ? 0 : pad;
  f.paddingTop = p;
  f.paddingRight = p;
  f.paddingBottom = p;
  f.paddingLeft = p;
  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  f.fills = [];
  return f;
}

// ────────────────────────────────────────────────────────────── estado ──

var ESTADO = {
  varColor: {},
  varEspacio: {},
  varRadio: {},
  estilos: [],
  fuentes: {},
  fuenteUI: null,
  mains: {}, // clave → ComponentNode
  fuenteMain: {}, // clave → la aparición con la que se armó
  sets: {}, // id de componente → [ComponentNode]
  assets: {}, // id de svg / imagen → ComponentNode
  nombresAsset: {},
  pantallas: {}, // id → FrameNode
  errores: [],
};

// ────────────────────────────────────────────────────────────── fuentes ──

var ESTILO_POR_PESO = {
  '100': 'Thin',
  '200': 'ExtraLight',
  '300': 'Light',
  '400': 'Regular',
  '500': 'Medium',
  '600': 'SemiBold',
  '700': 'Bold',
  '800': 'ExtraBold',
  '900': 'Black',
};

/** `Fredoka_600SemiBold` → { family: 'Fredoka', estilo: 'SemiBold' } */
function fuenteDeseada(nombreCss, peso) {
  var m = /^([A-Za-z]+?)(Sans)?_(\d{3})([A-Za-z]+)$/.exec(nombreCss);
  if (m) {
    var familia = m[1] + (m[2] ? ' ' + m[2] : '');
    return { familia: familia, estilo: m[4] };
  }
  return { familia: 'Inter', estilo: ESTILO_POR_PESO[String(peso)] || 'Regular' };
}

function variantesDeEstilo(estilo) {
  var con = estilo.replace(/(Semi|Extra|Ultra)(Bold|Light)/, '$1 $2');
  return [estilo, con, estilo.replace(' ', '')];
}

async function prepararFuentes() {
  var disponibles = await figma.listAvailableFontsAsync();
  var hay = {};
  disponibles.forEach(function (f) {
    hay[f.fontName.family + '|' + f.fontName.style] = f.fontName;
  });

  function elegir(familia, estilo) {
    var opciones = variantesDeEstilo(estilo);
    for (var i = 0; i < opciones.length; i++) {
      if (hay[familia + '|' + opciones[i]]) return hay[familia + '|' + opciones[i]];
    }
    // Sin la familia: Inter con el mismo peso, o Inter Regular.
    for (var j = 0; j < opciones.length; j++) {
      if (hay['Inter|' + opciones[j]]) return hay['Inter|' + opciones[j]];
    }
    return { family: 'Inter', style: 'Regular' };
  }

  var faltan = {};
  var pedidas = {};
  recorrerDatos(function (n) {
    if (!n.runs) return;
    n.runs.forEach(function (r) {
      pedidas[r.fuente + '|' + r.peso] = true;
    });
  });
  // Las de los estilos de texto, aunque ninguna pantalla las use.
  Object.keys(DATOS.tokens.fuente).forEach(function (k) {
    pedidas[DATOS.tokens.fuente[k] + '|400'] = true;
  });
  pedidas['Fredoka_500Medium|400'] = true;

  var claves = Object.keys(pedidas);
  for (var i = 0; i < claves.length; i++) {
    var partes = claves[i].split('|');
    var d = fuenteDeseada(partes[0], partes[1]);
    var f = elegir(d.familia, d.estilo);
    if (f.family !== d.familia) faltan[d.familia] = true;
    ESTADO.fuentes[claves[i]] = f;
    await figma.loadFontAsync(f);
  }
  ESTADO.fuenteUI = {
    normal: elegir('Nunito Sans', 'Regular'),
    fuerte: elegir('Nunito Sans', 'Bold'),
    titulo: elegir('Fredoka', 'Bold'),
    medio: elegir('Fredoka', 'SemiBold'),
  };
  for (var k in ESTADO.fuenteUI) await figma.loadFontAsync(ESTADO.fuenteUI[k]);
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  return Object.keys(faltan);
}

function fuenteDeRun(r) {
  return ESTADO.fuentes[r.fuente + '|' + r.peso] || { family: 'Inter', style: 'Regular' };
}

function recorrerDatos(fn) {
  function ir(n) {
    fn(n);
    (n.hijos || []).forEach(ir);
  }
  DATOS.pantallas.forEach(function (p) {
    ir(p.raiz);
  });
}

// ──────────────────────────────────────────── variables y estilos de texto ──

async function coleccion(nombre) {
  var existentes = await figma.variables.getLocalVariableCollectionsAsync();
  for (var i = 0; i < existentes.length; i++) if (existentes[i].name === nombre) return existentes[i];
  return figma.variables.createVariableCollection(nombre);
}

async function variable(col, nombre, tipo) {
  var todas = await figma.variables.getLocalVariablesAsync(tipo);
  for (var i = 0; i < todas.length; i++) {
    if (todas[i].name === nombre && todas[i].variableCollectionId === col.id) return todas[i];
  }
  try {
    return figma.variables.createVariable(nombre, col, tipo);
  } catch (e) {
    // Versiones anteriores de la API pedían el id de la colección.
    return figma.variables.createVariable(nombre, col.id, tipo);
  }
}

async function crearVariables() {
  var col = await coleccion('Piko · Tokens');
  var modo = col.modes[0].modeId;
  try {
    col.renameMode(modo, 'App');
  } catch (e) {
    /* plan sin renombrar modos */
  }
  var colores = DATOS.tokens.color;
  var orden = Object.keys(colores);
  for (var i = 0; i < orden.length; i++) {
    var k = orden[i];
    var rgb = hexARgb(colores[k]);
    var v = await variable(col, 'color/' + k, 'COLOR');
    v.setValueForMode(modo, rgb);
    v.description = colores[k];
    v.scopes = ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR'];
    var hex = colores[k].toUpperCase();
    var clave = hex.length > 7 ? hex.slice(0, 7) + '@' + Math.round(rgb.a * 100) / 100 : hex;
    // Si dos tokens tienen el mismo valor (acierto = verdePasto), gana el primero.
    if (!ESTADO.varColor[clave]) ESTADO.varColor[clave] = v;
  }
  var esp = DATOS.tokens.espacio;
  for (var e in esp) {
    var ve = await variable(col, 'espacio/' + e, 'FLOAT');
    ve.setValueForMode(modo, esp[e]);
    ve.scopes = ['GAP', 'WIDTH_HEIGHT'];
    if (!ESTADO.varEspacio[String(esp[e])]) ESTADO.varEspacio[String(esp[e])] = ve;
  }
  var rad = DATOS.tokens.radio;
  for (var r in rad) {
    var vr = await variable(col, 'radio/' + r, 'FLOAT');
    vr.setValueForMode(modo, rad[r]);
    vr.scopes = ['CORNER_RADIUS'];
    if (!ESTADO.varRadio[String(rad[r])]) ESTADO.varRadio[String(rad[r])] = vr;
  }
}

var NOMBRES_ESTILO = {
  display: 'Display',
  titulo: 'Título',
  subtitulo: 'Subtítulo',
  cuerpo: 'Cuerpo',
  cuerpoFuerte: 'Cuerpo fuerte',
  chico: 'Chico',
  etiqueta: 'Etiqueta',
};

/** El alto de línea más común entre los textos con esa fuente y tamaño. */
function altoMedido(fuenteCss, tam, caso) {
  var cuenta = {};
  recorrerDatos(function (n) {
    if (!n.runs || n.runs.length !== 1) return;
    var r = n.runs[0];
    if (r.fuente === fuenteCss && r.tam === tam && (!caso || r.caso === caso)) {
      cuenta[n.lh] = (cuenta[n.lh] || 0) + 1;
    }
  });
  var mejor = null;
  for (var k in cuenta) if (mejor === null || cuenta[k] > cuenta[mejor]) mejor = k;
  return mejor === null ? null : Number(mejor);
}

async function crearEstilosTexto() {
  var existentes = await figma.getLocalTextStylesAsync();
  function estilo(nombre) {
    for (var i = 0; i < existentes.length; i++) if (existentes[i].name === nombre) return existentes[i];
    return figma.createTextStyle();
  }
  var defs = [];
  var tx = DATOS.tokens.texto;
  for (var k in tx) {
    defs.push({
      nombre: 'Piko/' + (NOMBRES_ESTILO[k] || k),
      fuente: tx[k].fontFamily,
      tam: tx[k].fontSize,
      lh: tx[k].lineHeight || altoMedido(tx[k].fontFamily, tx[k].fontSize, tx[k].textTransform === 'uppercase' ? 'UPPER' : null),
      ls: tx[k].letterSpacing || 0,
      caso: tx[k].textTransform === 'uppercase' ? 'UPPER' : 'ORIGINAL',
    });
  }
  // Los botones usan su propia combinación (Boton.tsx).
  defs.push({ nombre: 'Piko/Botón', fuente: DATOS.tokens.fuente.boton, tam: 16, lh: altoMedido(DATOS.tokens.fuente.boton, 16, 'UPPER'), ls: 0.6, caso: 'UPPER' });
  defs.push({ nombre: 'Piko/Botón chico', fuente: DATOS.tokens.fuente.boton, tam: 14, lh: altoMedido(DATOS.tokens.fuente.boton, 14, 'UPPER'), ls: 0.6, caso: 'UPPER' });

  for (var i = 0; i < defs.length; i++) {
    var d = defs[i];
    var s = estilo(d.nombre);
    s.name = d.nombre;
    s.fontName = ESTADO.fuentes[d.fuente + '|400'] || ESTADO.fuenteUI.normal;
    s.fontSize = d.tam;
    s.lineHeight = d.lh ? { unit: 'PIXELS', value: d.lh } : { unit: 'AUTO' };
    s.letterSpacing = { unit: 'PIXELS', value: d.ls };
    s.textCase = d.caso;
    s.description = s.fontName.family + ' ' + s.fontName.style + ' · ' + d.tam + (d.lh ? '/' + d.lh : '') + (d.ls ? ' · espaciado ' + d.ls : '');
    d.estilo = s;
    ESTADO.estilos.push(d);
  }
}

function estiloPara(n) {
  if (n.runs.length !== 1) return null;
  var r = n.runs[0];
  for (var i = 0; i < ESTADO.estilos.length; i++) {
    var d = ESTADO.estilos[i];
    if (
      d.fuente === r.fuente &&
      d.tam === r.tam &&
      Math.abs((d.lh || 0) - n.lh) < 0.6 &&
      Math.abs(d.ls - r.ls) < 0.05 &&
      d.caso === r.caso
    ) {
      return d.estilo;
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────── páginas ──

async function pagina(clave, limpiar) {
  var nombre = PAGINAS[clave];
  var p = null;
  for (var i = 0; i < figma.root.children.length; i++) {
    if (figma.root.children[i].name === nombre) p = figma.root.children[i];
  }
  if (!p) {
    p = figma.createPage();
    p.name = nombre;
  }
  await p.loadAsync();
  if (limpiar) {
    var hijos = p.children.slice();
    for (var j = 0; j < hijos.length; j++) hijos[j].remove();
  }
  return p;
}

// ─────────────────────────────────────────────────────────────── assets ──

var EXPORTAR = [
  { format: 'SVG', suffix: '' },
  { format: 'PNG', suffix: '', constraint: { type: 'SCALE', value: 1 } },
  { format: 'PNG', suffix: '@2x', constraint: { type: 'SCALE', value: 2 } },
  { format: 'PNG', suffix: '@3x', constraint: { type: 'SCALE', value: 3 } },
];

function assetSvg(id) {
  if (ESTADO.assets[id]) return ESTADO.assets[id];
  var s = DATOS.svgs[id];
  var marco = figma.createNodeFromSvg(s.xml);
  marco.name = s.nombre || id;
  var comp = figma.createComponentFromNode(marco);
  comp.name = s.nombre || id;
  comp.description = 'Exportado tal cual lo dibuja la app (' + s.w + '×' + s.h + ').';
  comp.exportSettings = EXPORTAR;
  comp.setPluginData('asset', id);
  ESTADO.paginaAssets.appendChild(comp);
  ESTADO.assets[id] = comp;
  return comp;
}

function assetImagen(id) {
  if (ESTADO.assets[id]) return ESTADO.assets[id];
  var im = DATOS.imagenes[id];
  var imagen = figma.createImage(figma.base64Decode(im.b64));
  var comp = figma.createComponent();
  comp.name = im.nombre || id;
  // A la mitad: los PNG de Piko son @2x de su tamaño de uso más grande.
  var w = im.w / 2;
  var h = im.h / 2;
  comp.resize(w, h);
  comp.fills = [];
  var r = figma.createRectangle();
  r.name = 'imagen';
  r.resize(w, h);
  r.fills = [{ type: 'IMAGE', imageHash: imagen.hash, scaleMode: 'FIT' }];
  r.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
  comp.appendChild(r);
  comp.exportSettings = EXPORTAR.slice(1);
  comp.setPluginData('asset', id);
  ESTADO.paginaAssets.appendChild(comp);
  ESTADO.assets[id] = comp;
  return comp;
}

// ─────────────────────────────────────────────────────── construir nodos ──

function aplicarRotacion(nodo, n) {
  var t = (n.rot * Math.PI) / 180;
  var c = Math.cos(t);
  var s = Math.sin(t);
  var cx = n.x + n.w / 2;
  var cy = n.y + n.h / 2;
  nodo.relativeTransform = [
    [c, -s, cx - (c * n.w) / 2 + (s * n.h) / 2],
    [s, c, cy - (s * n.w) / 2 - (c * n.h) / 2],
  ];
}

function construirTexto(n) {
  var t = figma.createText();
  var completo = n.runs
    .map(function (r) {
      return r.texto;
    })
    .join('');
  t.fontName = fuenteDeRun(n.runs[0]);
  t.characters = completo;
  var i = 0;
  n.runs.forEach(function (r) {
    var fin = i + r.texto.length;
    if (fin > i) {
      t.setRangeFontName(i, fin, fuenteDeRun(r));
      t.setRangeFontSize(i, fin, r.tam);
      if (r.color) t.setRangeFills(i, fin, [pintura(r.color)]);
      t.setRangeLetterSpacing(i, fin, { unit: 'PIXELS', value: r.ls || 0 });
      t.setRangeTextCase(i, fin, r.caso);
      t.setRangeTextDecoration(i, fin, r.deco);
    }
    i = fin;
  });
  t.lineHeight = { unit: 'PIXELS', value: n.lh };
  t.textAlignHorizontal = { left: 'LEFT', center: 'CENTER', right: 'RIGHT' }[n.alinear] || 'LEFT';
  t.textAlignVertical = 'TOP';
  if (n.tamH === 'HUG') {
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
  } else if (n.tamV === 'HUG') {
    t.resize(Math.max(1, n.w), Math.max(1, n.h));
    t.textAutoResize = 'HEIGHT';
  } else {
    t.resize(Math.max(1, n.w), Math.max(1, n.h));
    t.textAutoResize = 'NONE';
  }
  if (n.trunca) {
    t.textTruncation = 'ENDING';
    t.maxLines = n.trunca;
  }
  if (n.opacidad && n.opacidad < 1) t.opacity = n.opacidad;
  var est = estiloPara(n);
  if (est) ESTADO.pendientesEstilo.push({ nodo: t, estilo: est });
  return t;
}

function construirMarco(n, opciones) {
  var f = figma.createFrame();
  f.name = n.nombre;
  f.fills = n.fondo ? [pintura(n.fondo)] : [];
  f.clipsContent = !!n.recorta;
  f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
  if (n.radios) {
    f.topLeftRadius = n.radios[0];
    f.topRightRadius = n.radios[1];
    f.bottomRightRadius = n.radios[2];
    f.bottomLeftRadius = n.radios[3];
    if (n.radios[0] === n.radios[1] && n.radios[1] === n.radios[2] && n.radios[2] === n.radios[3]) {
      ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'].forEach(function (k) {
        enlazarNumero(f, k, n.radios[0], ESTADO.varRadio);
      });
    }
  }
  if (n.trazo) {
    f.strokes = [pintura(n.trazo)];
    f.strokeAlign = 'INSIDE';
    f.strokeTopWeight = n.trazo.pesos[0];
    f.strokeRightWeight = n.trazo.pesos[1];
    f.strokeBottomWeight = n.trazo.pesos[2];
    f.strokeLeftWeight = n.trazo.pesos[3];
    if (n.trazo.discontinuo) f.dashPattern = [6, 4];
  }
  if (n.opacidad && n.opacidad < 1) f.opacity = n.opacidad;

  if (n.al) {
    f.layoutMode = n.al.modo === 'H' ? 'HORIZONTAL' : 'VERTICAL';
    f.paddingTop = n.al.pad[0];
    f.paddingRight = n.al.pad[1];
    f.paddingBottom = n.al.pad[2];
    f.paddingLeft = n.al.pad[3];
    f.itemSpacing = n.al.gap;
    if (n.al.wrap) {
      f.layoutWrap = 'WRAP';
      f.counterAxisSpacing = n.al.gapCruz;
    }
    f.primaryAxisAlignItems = n.al.prim;
    f.counterAxisAlignItems = n.al.cruz;
    f.strokesIncludedInLayout = false;
    f.primaryAxisSizingMode = 'FIXED';
    f.counterAxisSizingMode = 'FIXED';
    enlazarNumero(f, 'itemSpacing', n.al.gap, ESTADO.varEspacio);
    ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(function (k, i) {
      enlazarNumero(f, k, n.al.pad[i], ESTADO.varEspacio);
    });
  }

  // El labio inferior de las tarjetas: un borde de abajo más grueso y de otro
  // color. Figma no da un color por lado, así que se arma con dos capas:
  // la base (color del labio) y la cara (fondo + borde de los otros lados).
  if (n.trazo && n.trazo.inferior && n.trazo.pesos[2] > 0) {
    var lado = n.trazo.pesos[0];
    var base = figma.createRectangle();
    base.name = 'labio';
    base.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
    base.fills = [pintura(n.trazo.inferior)];
    var cara = figma.createRectangle();
    cara.name = 'cara';
    cara.resize(Math.max(0.01, n.w), Math.max(0.01, n.h - n.trazo.pesos[2] + lado));
    cara.fills = f.fills;
    cara.strokes = [pintura(n.trazo)];
    cara.strokeAlign = 'INSIDE';
    cara.strokeTopWeight = lado;
    cara.strokeRightWeight = n.trazo.pesos[1];
    cara.strokeBottomWeight = lado;
    cara.strokeLeftWeight = n.trazo.pesos[3];
    [base, cara].forEach(function (r) {
      if (n.radios) {
        r.topLeftRadius = n.radios[0];
        r.topRightRadius = n.radios[1];
        r.bottomRightRadius = n.radios[2];
        r.bottomLeftRadius = n.radios[3];
      }
      f.appendChild(r);
      if (n.al) r.layoutPositioning = 'ABSOLUTE';
      r.x = 0;
      r.y = 0;
      r.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
    });
    f.fills = [];
    f.strokes = [];
  }

  (n.hijos || []).forEach(function (h) {
    var hijo = construir(h, opciones);
    if (!hijo) return;
    f.appendChild(hijo);
    colocar(hijo, h, n);
  });

  if (n.toca) f.setPluginData('toca', '1');
  if (n.a11y) f.setPluginData('a11y', n.a11y);
  return f;
}

/** Instancia de un componente reutilizable, ajustada a esta aparición. */
function construirInstancia(n) {
  var main = obtenerMain(n);
  var inst = main.createInstance();
  ajustarInstancia(inst, ESTADO.fuenteMain[n.comp.clave], n, true);
  if (n.toca) inst.setPluginData('toca', '1');
  if (n.a11y) inst.setPluginData('a11y', n.a11y);
  return inst;
}

function textoDe(n) {
  return n.runs
    .map(function (r) {
      return r.texto;
    })
    .join('');
}

/** Las capas que vienen de los datos (sin la base y la cara del labio). */
function hijosReales(nodo) {
  return (nodo.children || []).filter(function (c) {
    return c.type !== 'RECTANGLE';
  });
}

/**
 * Recorre a la par la instancia, la aparición con la que se armó su
 * componente (`fuente`) y esta aparición (`aqui`): cambia los textos que
 * difieren y hace «instance swap» de los componentes anidados que son otros
 * (otra insignia dentro de la misma celda, otro dibujo dentro de Piko).
 */
function ajustarInstancia(fig, fuente, aqui, esRaiz) {
  if (!fig || !fuente || !aqui) return;
  if (aqui.tipo === 'TEXT') {
    if (fig.type === 'TEXT') {
      var nuevo = textoDe(aqui);
      if (fig.characters !== nuevo) fig.characters = nuevo;
    }
    return;
  }
  if (!esRaiz && fig.type === 'INSTANCE') {
    if (aqui.comp) {
      if (fuente.comp && fuente.comp.clave !== aqui.comp.clave) {
        fig.swapComponent(obtenerMain(aqui));
        fuente = ESTADO.fuenteMain[aqui.comp.clave];
      }
    } else if (aqui.tipo === 'SVG') {
      if (fuente.svg !== aqui.svg) fig.swapComponent(assetSvg(aqui.svg));
      return;
    } else if (aqui.tipo === 'IMG') {
      if (fuente.img !== aqui.img) fig.swapComponent(assetImagen(aqui.img));
      return;
    }
  }
  // Componente cuya raíz es un dibujo: el dibujo es el único hijo.
  if (fuente.tipo === 'SVG' || fuente.tipo === 'IMG') {
    var dibujo = hijosReales(fig)[0];
    if (dibujo && fuente.tipo === 'SVG' && fuente.svg !== aqui.svg) dibujo.swapComponent(assetSvg(aqui.svg));
    if (dibujo && fuente.tipo === 'IMG' && fuente.img !== aqui.img) dibujo.swapComponent(assetImagen(aqui.img));
    return;
  }
  var hijos = hijosReales(fig);
  var fh = fuente.hijos || [];
  var ah = aqui.hijos || [];
  for (var i = 0; i < Math.min(hijos.length, fh.length, ah.length); i++) ajustarInstancia(hijos[i], fh[i], ah[i], false);
}

function obtenerMain(n) {
  var clave = n.comp.clave;
  if (ESTADO.mains[clave]) return ESTADO.mains[clave];
  var raiz = construir(n, { raizDe: clave });
  if (raiz.type === 'INSTANCE') {
    // Un componente cuya raíz es un dibujo (Piko, Sacuanjoche…): se envuelve
    // para que el dibujo siga siendo la instancia del asset exportable.
    var envoltorio = figma.createFrame();
    envoltorio.name = n.nombre;
    envoltorio.fills = [];
    envoltorio.clipsContent = false;
    envoltorio.resize(Math.max(0.01, raiz.width), Math.max(0.01, raiz.height));
    envoltorio.appendChild(raiz);
    raiz.x = 0;
    raiz.y = 0;
    raiz.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    raiz = envoltorio;
  }
  ['layoutSizingHorizontal', 'layoutSizingVertical'].forEach(function (k, i) {
    var tam = i === 0 ? n.tamH : n.tamV;
    if (raiz.type === 'FRAME' && raiz.layoutMode !== 'NONE' && tam === 'HUG') raiz[k] = 'HUG';
  });
  var comp = figma.createComponentFromNode(raiz);
  var props = n.comp.variante;
  var nombres = Object.keys(props);
  comp.name = nombres.length
    ? nombres
        .map(function (k) {
          return k + '=' + props[k];
        })
        .join(', ')
    : n.comp.nombre;
  comp.setPluginData('clave', clave);
  ESTADO.paginaComponentes.appendChild(comp);
  ESTADO.mains[clave] = comp;
  ESTADO.fuenteMain[clave] = n;
  if (!ESTADO.sets[n.comp.id]) ESTADO.sets[n.comp.id] = [];
  ESTADO.sets[n.comp.id].push({ comp: comp, variante: props, nombre: n.comp.nombre });
  return comp;
}

function construir(n, opciones) {
  var op = opciones || {};
  if (n.comp && op.raizDe !== n.comp.clave) return construirInstancia(n);
  var hijoOp = op.raizDe ? { raizDe: '__ya__' } : op;
  var nodo;
  if (n.tipo === 'TEXT') nodo = construirTexto(n);
  else if (n.tipo === 'SVG') {
    nodo = assetSvg(n.svg).createInstance();
    if (Math.abs(nodo.width - n.w) > 0.01) nodo.rescale(Math.max(0.01, n.w / nodo.width));
    if (Math.abs(nodo.height - n.h) > 0.5) nodo.resize(n.w, n.h);
    if (n.opacidad && n.opacidad < 1) nodo.opacity = n.opacidad;
  } else if (n.tipo === 'IMG') {
    nodo = assetImagen(n.img).createInstance();
    nodo.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
  } else nodo = construirMarco(n, hijoOp);
  nodo.name = n.nombre;
  return nodo;
}

function tieneTexto(n) {
  if (n.tipo === 'TEXT') return true;
  return (n.hijos || []).some(tieneTexto);
}

/** Posición y tamaño del hijo dentro del padre recién armado. */
function colocar(hijo, h, padre) {
  var enAL = !!padre.al && !h.abs;
  if (padre.al && h.abs) hijo.layoutPositioning = 'ABSOLUTE';
  if (!enAL) {
    var x = h.x;
    // Un texto que abraza su contenido se ubica según su alineación.
    if (h.tipo === 'TEXT' && h.tamH === 'HUG') {
      if (h.alinear === 'center') x = h.x + (h.w - hijo.width) / 2;
      else if (h.alinear === 'right') x = h.x + h.w - hijo.width;
    }
    hijo.x = x;
    hijo.y = h.y;
    if (h.rot) aplicarRotacion(hijo, h);
  }
  var esAL = hijo.type === 'FRAME' && hijo.layoutMode !== 'NONE';
  var instAL = hijo.type === 'INSTANCE' && hijo.layoutMode !== 'NONE';
  var porEje = [
    ['layoutSizingHorizontal', h.tamH],
    ['layoutSizingVertical', h.tamV],
  ];
  // Los SVG sueltos ya llegan a su tamaño desde construir(); los componentes no.
  if (hijo.type === 'INSTANCE' && (h.comp || h.tipo !== 'SVG')) {
    // Las ilustraciones (sin texto) se escalan enteras, como en la app, donde
    // el mismo Piko o la misma insignia aparecen a distintos tamaños.
    var grafico = hijo.findOne(function (x) {
      return x.type === 'TEXT';
    }) === null;
    var mismaForma = Math.abs(hijo.width / hijo.height - h.w / h.h) < 0.02;
    if (grafico && mismaForma) hijo.rescale(Math.max(0.01, h.w / hijo.width));
    if (Math.abs(hijo.width - h.w) > 0.5 || Math.abs(hijo.height - h.h) > 0.5) {
      hijo.resize(Math.max(0.01, h.w), Math.max(0.01, h.h));
    }
  }
  // Dentro de un marco sin auto layout, los dibujos escalan con su contenedor.
  if (!padre.al && (h.tipo === 'SVG' || h.tipo === 'IMG' || (h.tipo === 'FRAME' && !tieneTexto(h)))) {
    hijo.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
  }
  porEje.forEach(function (par) {
    var tam = par[1] || 'FIXED';
    if (tam === 'FILL' && !enAL) tam = 'FIXED';
    if (tam === 'HUG' && !(esAL || instAL || hijo.type === 'TEXT')) tam = 'FIXED';
    if (hijo.type === 'INSTANCE' && tam === 'HUG') tam = 'FIXED';
    if (!enAL && tam === 'FIXED' && hijo.type !== 'TEXT') return;
    try {
      hijo[par[0]] = tam;
    } catch (e) {
      /* combinación que Figma no admite: queda fija */
    }
  });
}

// ───────────────────────────────────────────────────────────── pantallas ──

async function construirPantallas(ids) {
  var p = ESTADO.paginaPantallas;
  var y = 0;
  var porSeccion = {};
  DATOS.pantallas.forEach(function (d) {
    if (ids.indexOf(d.id) < 0) return;
    if (!porSeccion[d.seccion]) porSeccion[d.seccion] = [];
    porSeccion[d.seccion].push(d);
  });
  var secciones = SECCIONES.filter(function (s) {
    return porSeccion[s];
  });
  for (var si = 0; si < secciones.length; si++) {
    var s = secciones[si];
    var titulo = texto(s, { fuente: ESTADO.fuenteUI.titulo, tam: 56, color: '#0F5D3D' });
    titulo.name = 'Sección · ' + s;
    p.appendChild(titulo);
    titulo.x = 0;
    titulo.y = y;
    y += 110;
    var x = 0;
    var altoFila = 0;
    var lista = porSeccion[s];
    for (var i = 0; i < lista.length; i++) {
      var d = lista[i];
      avisar('Pantalla ' + d.nombre + '…');
      try {
        var f = construir(d.raiz, {});
        f.name = s + ' / ' + d.nombre;
        f.clipsContent = true;
        f.setPluginData('pantalla', d.id);
        p.appendChild(f);
        f.x = x;
        f.y = y + 70;
        var cab = texto(d.nombre, { fuente: ESTADO.fuenteUI.medio, tam: 22, color: '#16241D' });
        p.appendChild(cab);
        cab.x = x;
        cab.y = y;
        var sub = texto(d.descripcion || '', { tam: 13, color: '#6B7A70', ancho: d.ancho });
        p.appendChild(sub);
        sub.x = x;
        sub.y = y + 30;
        ESTADO.pantallas[d.id] = f;
        x += d.ancho + 120;
        altoFila = Math.max(altoFila, d.alto + 70);
      } catch (e) {
        ESTADO.errores.push(d.nombre + ': ' + e.message);
      }
      // Ceder el hilo para que la interfaz no se congele.
      await new Promise(function (ok) {
        setTimeout(ok, 0);
      });
    }
    y += altoFila + 200;
  }
}

function normal(t) {
  return t.replace(/\s+/g, ' ').trim().toLowerCase();
}

async function enlazarPrototipo() {
  var inicio = null;
  for (var i = 0; i < DATOS.pantallas.length; i++) {
    var d = DATOS.pantallas[i];
    var f = ESTADO.pantallas[d.id];
    if (!f) continue;
    if (d.id === 'inicio') inicio = f;
    var textos = f.findAll(function (x) {
      return x.type === 'TEXT';
    });
    for (var etiqueta in d.enlaces) {
      var destino = ESTADO.pantallas[d.enlaces[etiqueta]];
      if (!destino) continue;
      for (var j = 0; j < textos.length; j++) {
        var tx = normal(textos[j].characters);
        var et = normal(etiqueta);
        // Exacto, o con un emoji delante («🎟️  Canjear código»).
        if (tx !== et && !(et.length > 4 && tx.slice(-et.length) === et && tx.length - et.length <= 4)) continue;
        // El tocable: la instancia o el marco marcado más cercano.
        var n = textos[j];
        while (n && n !== f && !(n.getPluginData && n.getPluginData('toca') === '1')) n = n.parent;
        if (!n || n === f) n = textos[j];
        // Dentro de una instancia anidada sólo se puede enlazar la instancia de afuera.
        var arriba = n;
        while (arriba.parent && arriba.parent !== f) {
          if (arriba.parent.type === 'INSTANCE') n = arriba.parent;
          arriba = arriba.parent;
        }
        try {
          await n.setReactionsAsync([
            {
              trigger: { type: 'ON_CLICK' },
              actions: [
                {
                  type: 'NODE',
                  destinationId: destino.id,
                  navigation: 'NAVIGATE',
                  transition: { type: 'SLIDE_IN', direction: 'LEFT', matchLayers: false, easing: { type: 'EASE_OUT' }, duration: 0.3 },
                  preserveScrollPosition: false,
                },
              ],
            },
          ]);
        } catch (e) {
          try {
            // Sin transición: la forma mínima que acepta cualquier versión.
            await n.setReactionsAsync([
              { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: destino.id, navigation: 'NAVIGATE', transition: null }] },
            ]);
          } catch (e2) {
            ESTADO.errores.push('Enlace «' + etiqueta + '»: ' + e2.message);
          }
        }
        break;
      }
    }
  }
  if (inicio) {
    try {
      ESTADO.paginaPantallas.flowStartingPoints = [{ nodeId: inicio.id, name: 'Piko · recorrido completo' }];
    } catch (e) {
      /* sin flujos en este plan */
    }
  }
}

// ─────────────────────────────────────────────────────── componentes ──

var GRUPOS = ['Acciones', 'Encabezados', 'Tarjetas', 'Formularios', 'Ejercicios', 'Piko', 'Progreso', 'Logros', 'Ilustraciones', 'Íconos'];

function ordenarComponentes() {
  var p = ESTADO.paginaComponentes;
  // Todo dentro de un auto layout vertical: los component sets crecen al
  // acomodar sus variantes y nada se pisa.
  var raiz = marcoAL('Biblioteca de componentes', 'VERTICAL', 24, 64);
  raiz.fills = [{ type: 'SOLID', color: hexARgb('#FFFFFF') }];
  p.appendChild(raiz);
  raiz.appendChild(texto('Biblioteca de componentes de Piko', { fuente: ESTADO.fuenteUI.titulo, tam: 56, color: '#0F5D3D' }));
  raiz.appendChild(
    texto(
      'Cada componente sale del código de la app (app/src/ui). Las variantes son las combinaciones de props que la app usa de verdad. ' +
        'Los colores están enlazados a las variables «Piko · Tokens» y los textos a los estilos «Piko/…».',
      { tam: 16, color: '#33453B', ancho: 900, lh: 24 },
    ),
  );

  var ids = Object.keys(ESTADO.sets);
  GRUPOS.forEach(function (g) {
    var delGrupo = ids.filter(function (id) {
      return (DATOS.componentes[id] || {}).grupo === g;
    });
    if (!delGrupo.length) return;
    var tg = texto(g, { fuente: ESTADO.fuenteUI.titulo, tam: 36, color: '#16241D' });
    raiz.appendChild(tg);
    delGrupo.forEach(function (id) {
      var miembros = ESTADO.sets[id];
      var info = DATOS.componentes[id];
      var claves = {};
      miembros.forEach(function (m) {
        Object.keys(m.variante).forEach(function (k) {
          claves[k] = true;
        });
      });
      var lista = Object.keys(claves);
      var nodo;
      if (lista.length) {
        miembros.forEach(function (m) {
          m.comp.name = lista
            .map(function (k) {
              return k + '=' + (m.variante[k] !== undefined ? m.variante[k] : 'base');
            })
            .join(', ');
        });
        nodo = figma.combineAsVariants(
          miembros.map(function (m) {
            return m.comp;
          }),
          p,
        );
        nodo.layoutMode = 'HORIZONTAL';
        nodo.layoutWrap = 'WRAP';
        nodo.itemSpacing = 32;
        nodo.counterAxisSpacing = 32;
        nodo.paddingTop = 32;
        nodo.paddingRight = 32;
        nodo.paddingBottom = 32;
        nodo.paddingLeft = 32;
        nodo.counterAxisAlignItems = 'MIN';
        nodo.resize(1400, nodo.height);
        nodo.primaryAxisSizingMode = 'FIXED';
        nodo.counterAxisSizingMode = 'AUTO';
        nodo.fills = [{ type: 'SOLID', color: hexARgb('#F7F0E4') }];
        nodo.strokes = [{ type: 'SOLID', color: hexARgb('#9747FF') }];
        nodo.dashPattern = [10, 5];
        nodo.cornerRadius = 16;
      } else {
        nodo = miembros[0].comp;
      }
      nodo.name = info.nombre;
      nodo.description = info.descripcion + (info.fuente ? '\n\nCódigo: app/' + info.fuente : '');
      var cab = marcoAL('Encabezado · ' + info.nombre, 'VERTICAL', 6, 0);
      cab.paddingTop = 24;
      cab.appendChild(texto(info.nombre, { fuente: ESTADO.fuenteUI.medio, tam: 24, color: '#0F5D3D' }));
      cab.appendChild(
        texto(info.descripcion + (info.fuente ? '  ·  app/' + info.fuente : ''), { tam: 14, color: '#6B7A70', ancho: 1000, lh: 20 }),
      );
      raiz.appendChild(cab);
      raiz.appendChild(nodo);
    });
  });
}

function ordenarAssets() {
  var p = ESTADO.paginaAssets;
  var comps = p.children.filter(function (n) {
    return n.type === 'COMPONENT';
  });
  var cab = texto('Kit de assets para desarrollo', { fuente: ESTADO.fuenteUI.titulo, tam: 56, color: '#0F5D3D' });
  p.appendChild(cab);
  var intro = texto(
    'Cada ilustración e ícono es un componente con exportación preconfigurada: SVG, PNG @1x, @2x y @3x. ' +
      'Seleccioná la página entera y usá «Export» para bajar todo el kit. Los mismos archivos están en docs/diseno/assets/.',
    { tam: 16, color: '#33453B', ancho: 900, lh: 24 },
  );
  p.appendChild(intro);
  intro.y = 80;
  var x = 0;
  var y = 80 + intro.height + 60;
  var fila = 0;
  comps.sort(function (a, b) {
    return a.name < b.name ? -1 : 1;
  });
  comps.forEach(function (c) {
    var celda = Math.max(160, c.width + 40);
    if (x + celda > 1600) {
      x = 0;
      y += fila + 80;
      fila = 0;
    }
    c.x = x + (celda - c.width) / 2;
    c.y = y;
    var t = texto(c.name, { tam: 12, color: '#6B7A70', ancho: celda - 10 });
    p.appendChild(t);
    t.x = x;
    t.y = y + c.height + 10;
    fila = Math.max(fila, c.height + 10 + t.height);
    x += celda + 24;
  });
}

// ───────────────────────────────────────────────────────── fundamentos ──

async function construirFundamentos() {
  var p = ESTADO.paginaFundamentos;
  var raiz = marcoAL('Fundamentos de Piko', 'VERTICAL', 56, 64);
  raiz.fills = [{ type: 'SOLID', color: hexARgb('#FFFFFF') }];
  p.appendChild(raiz);
  raiz.appendChild(texto('Fundamentos visuales', { fuente: ESTADO.fuenteUI.titulo, tam: 56, color: '#0F5D3D' }));
  raiz.appendChild(
    texto('Tokens leídos de app/src/ui/tokens.ts. Cada muestra está enlazada a su variable de la colección «Piko · Tokens».', {
      tam: 16,
      color: '#33453B',
      ancho: 1100,
    }),
  );

  // Colores
  raiz.appendChild(texto('Color', { fuente: ESTADO.fuenteUI.medio, tam: 32, color: '#16241D' }));
  var grilla = marcoAL('Paleta', 'HORIZONTAL', 24, 0);
  grilla.layoutWrap = 'WRAP';
  grilla.counterAxisSpacing = 24;
  grilla.resize(1240, 10);
  grilla.primaryAxisSizingMode = 'FIXED';
  grilla.counterAxisSizingMode = 'AUTO';
  raiz.appendChild(grilla);
  var colores = DATOS.tokens.color;
  Object.keys(colores).forEach(function (k) {
    var tarjeta = marcoAL(k, 'VERTICAL', 8, 0);
    var muestra = figma.createRectangle();
    muestra.resize(136, 88);
    muestra.cornerRadius = 16;
    var hex = colores[k].toUpperCase();
    var rgb = hexARgb(hex);
    muestra.fills = [pintura({ hex: hex.slice(0, 7), a: Math.round(rgb.a * 100) / 100 })];
    muestra.strokes = [{ type: 'SOLID', color: hexARgb('#E3DACA') }];
    muestra.strokeWeight = 1;
    tarjeta.appendChild(muestra);
    tarjeta.appendChild(texto(k, { fuente: ESTADO.fuenteUI.fuerte, tam: 14, color: '#16241D' }));
    tarjeta.appendChild(texto(hex, { tam: 13, color: '#6B7A70' }));
    grilla.appendChild(tarjeta);
  });

  // Tipografía
  raiz.appendChild(texto('Tipografía', { fuente: ESTADO.fuenteUI.medio, tam: 32, color: '#16241D' }));
  raiz.appendChild(
    texto('Fredoka para títulos y botones; Nunito Sans para el cuerpo. Las dos van empaquetadas en la app (funciona sin internet).', {
      tam: 16,
      color: '#33453B',
      ancho: 1100,
    }),
  );
  for (var i = 0; i < ESTADO.estilos.length; i++) {
    var d = ESTADO.estilos[i];
    var fila = marcoAL(d.nombre, 'HORIZONTAL', 32, 0);
    fila.counterAxisAlignItems = 'CENTER';
    var etiqueta = texto(d.nombre.replace('Piko/', '') + '\n' + d.estilo.description, { tam: 13, color: '#6B7A70', ancho: 260, lh: 18 });
    fila.appendChild(etiqueta);
    var muestraT = figma.createText();
    muestraT.fontName = d.estilo.fontName;
    muestraT.characters = 'Aprendé jugando, sin internet.';
    muestraT.fontSize = d.tam;
    if (d.lh) muestraT.lineHeight = { unit: 'PIXELS', value: d.lh };
    muestraT.letterSpacing = { unit: 'PIXELS', value: d.ls };
    muestraT.textCase = d.caso;
    await muestraT.setTextStyleIdAsync(d.estilo.id);
    muestraT.fills = [pintura({ hex: '#0F5D3D', a: 1 })];
    fila.appendChild(muestraT);
    raiz.appendChild(fila);
  }

  // Espaciado y radios
  raiz.appendChild(texto('Espaciado (escala de 4)', { fuente: ESTADO.fuenteUI.medio, tam: 32, color: '#16241D' }));
  var esp = marcoAL('Espaciado', 'HORIZONTAL', 40, 0);
  esp.counterAxisAlignItems = 'MAX';
  Object.keys(DATOS.tokens.espacio).forEach(function (k) {
    var v = DATOS.tokens.espacio[k];
    var col = marcoAL(k, 'VERTICAL', 8, 0);
    col.counterAxisAlignItems = 'CENTER';
    var barra = figma.createRectangle();
    barra.resize(v, v);
    barra.fills = [pintura({ hex: '#97C137', a: 1 })];
    enlazarNumero(barra, 'width', v, ESTADO.varEspacio);
    enlazarNumero(barra, 'height', v, ESTADO.varEspacio);
    col.appendChild(barra);
    col.appendChild(texto(k + ' · ' + v, { tam: 13, color: '#33453B' }));
    esp.appendChild(col);
  });
  raiz.appendChild(esp);

  raiz.appendChild(texto('Radios', { fuente: ESTADO.fuenteUI.medio, tam: 32, color: '#16241D' }));
  var rad = marcoAL('Radios', 'HORIZONTAL', 40, 0);
  Object.keys(DATOS.tokens.radio).forEach(function (k) {
    var v = DATOS.tokens.radio[k];
    var col = marcoAL(k, 'VERTICAL', 8, 0);
    col.counterAxisAlignItems = 'CENTER';
    var caja = figma.createRectangle();
    caja.resize(96, 96);
    caja.cornerRadius = Math.min(v, 48);
    caja.fills = [pintura({ hex: '#FFFFFF', a: 1 })];
    caja.strokes = [pintura({ hex: '#E3DACA', a: 1 })];
    caja.strokeWeight = 2;
    caja.strokeAlign = 'INSIDE';
    col.appendChild(caja);
    col.appendChild(texto(k + ' · ' + v, { tam: 13, color: '#33453B' }));
    rad.appendChild(col);
  });
  raiz.appendChild(rad);

  raiz.appendChild(texto('Volumen: el «labio»', { fuente: ESTADO.fuenteUI.medio, tam: 32, color: '#16241D' }));
  raiz.appendChild(
    texto(
      'Sin sombras difusas ni degradados: botones y tarjetas tienen un borde inferior más oscuro de ' +
        DATOS.tokens.labio.normal +
        ' px (' +
        DATOS.tokens.labio.chico +
        ' px en los chicos) que se hunde al presionar. Animaciones: ' +
        DATOS.tokens.tiempo.rapido +
        ' / ' +
        DATOS.tokens.tiempo.normal +
        ' / ' +
        DATOS.tokens.tiempo.lento +
        ' ms.',
      { tam: 16, color: '#33453B', ancho: 1100, lh: 24 },
    ),
  );
}

// ────────────────────────────────────────────────────── flujo / wireframes ──

var GRIS = { fondo: '#FFFFFF', linea: '#9AA19C', bloque: '#D9DDD9', texto: '#B7BDB8', fuerte: '#7C847E', boton: '#4F5751' };

function wireframe(n) {
  if (n.tipo === 'TEXT') {
    var g = figma.createFrame();
    g.name = 'texto';
    g.fills = [];
    g.resize(Math.max(1, n.w), Math.max(1, n.h));
    var lineas = Math.max(1, n.lineas || 1);
    var titulo = n.runs[0] && n.runs[0].tam >= 19;
    for (var i = 0; i < lineas; i++) {
      var r = figma.createRectangle();
      var ancho = i === lineas - 1 && lineas > 1 ? n.w * 0.6 : n.justo ? n.w : Math.min(n.w, n.w * 0.85);
      r.resize(Math.max(2, ancho), Math.max(3, n.lh * 0.38));
      r.cornerRadius = 3;
      r.fills = [{ type: 'SOLID', color: hexARgb(titulo ? GRIS.fuerte : GRIS.texto) }];
      g.appendChild(r);
      r.x = n.alinear === 'center' ? (n.w - ancho) / 2 : n.alinear === 'right' ? n.w - ancho : 0;
      r.y = i * n.lh + n.lh * 0.31;
    }
    return g;
  }
  if (n.tipo === 'SVG' || n.tipo === 'IMG') {
    var c = figma.createFrame();
    c.name = 'ilustración';
    c.resize(Math.max(1, n.w), Math.max(1, n.h));
    c.fills = [{ type: 'SOLID', color: hexARgb('#EEF0EE') }];
    c.strokes = [{ type: 'SOLID', color: hexARgb(GRIS.linea) }];
    c.strokeWeight = 1;
    var x = figma.createVector();
    x.vectorPaths = [{ windingRule: 'NONE', data: 'M 0 0 L ' + n.w + ' ' + n.h + ' M ' + n.w + ' 0 L 0 ' + n.h }];
    x.strokes = [{ type: 'SOLID', color: hexARgb(GRIS.linea) }];
    x.strokeWeight = 1;
    c.appendChild(x);
    return c;
  }
  var f = figma.createFrame();
  f.name = n.comp ? n.comp.nombre : n.nombre;
  f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
  f.fills = [];
  f.clipsContent = false;
  if (n.radios) f.cornerRadius = Math.max.apply(null, n.radios);
  var boton = n.comp && (n.comp.id === 'Boton' || n.comp.id === 'Opcion' || n.comp.id === 'Bloque');
  if (boton) {
    var fantasma = n.comp.variante.Tono === 'fantasma';
    f.fills = fantasma ? [] : [{ type: 'SOLID', color: hexARgb(n.comp.id === 'Boton' ? GRIS.boton : '#FFFFFF') }];
    f.strokes = [{ type: 'SOLID', color: hexARgb(GRIS.linea) }];
    f.strokeWeight = 1.5;
    var etiqueta = '';
    (function buscar(x) {
      if (x.tipo === 'TEXT' && !etiqueta) etiqueta = x.runs.map(function (r) { return r.texto; }).join('');
      (x.hijos || []).forEach(buscar);
    })(n);
    var t = texto(n.comp.id === 'Boton' ? etiqueta.toUpperCase() : etiqueta, {
      fuente: { family: 'Inter', style: 'Bold' },
      tam: 13,
      color: n.comp.id === 'Boton' && !fantasma ? '#FFFFFF' : '#4F5751',
    });
    f.appendChild(t);
    t.x = n.comp.id === 'Boton' ? (n.w - t.width) / 2 : 16;
    t.y = (n.h - t.height) / 2;
    return f;
  }
  if (n.fondo || n.trazo) {
    var oscuro = n.fondo && luminancia(n.fondo.hex) < 0.25;
    f.fills = [{ type: 'SOLID', color: hexARgb(oscuro ? '#E4E7E4' : '#FFFFFF') }];
    f.strokes = [{ type: 'SOLID', color: hexARgb(GRIS.linea) }];
    f.strokeWeight = 1;
  }
  (n.hijos || []).forEach(function (h) {
    var w = wireframe(h);
    f.appendChild(w);
    w.x = h.x;
    w.y = h.y;
  });
  return f;
}

function luminancia(hex) {
  var c = hexARgb(hex);
  var l = [c.r, c.g, c.b].map(function (v) {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}

async function construirFlujo(ids) {
  var p = ESTADO.paginaFlujo;
  var ESCALA = 0.5;
  var cab = texto('Flujo de usuario · wireframes', { fuente: ESTADO.fuenteUI.titulo, tam: 56, color: '#0F5D3D' });
  p.appendChild(cab);
  var intro = texto(
    'Wireframes de baja fidelidad generados de las mismas pantallas reales, a ' +
      ESCALA * 100 +
      '% de escala. Las flechas son las acciones que llevan de una pantalla a otra (las mismas del prototipo de «📱 Pantallas»). ' +
      'Columnas: los cinco momentos del recorrido.',
    { tam: 16, color: '#33453B', ancho: 1100, lh: 24 },
  );
  p.appendChild(intro);
  intro.y = 80;
  var y0 = 80 + intro.height + 80;
  var cajas = {};
  var x = 0;
  for (var si = 0; si < SECCIONES.length; si++) {
    var s = SECCIONES[si];
    var lista = DATOS.pantallas.filter(function (d) {
      return d.seccion === s && ids.indexOf(d.id) >= 0;
    });
    if (!lista.length) continue;
    var ts = texto(s, { fuente: ESTADO.fuenteUI.titulo, tam: 32, color: '#16241D' });
    p.appendChild(ts);
    ts.x = x;
    ts.y = y0;
    var y = y0 + 70;
    var columnas = lista.length > 3 ? 2 : 1;
    var col = 0;
    var altoFila = 0;
    for (var i = 0; i < lista.length; i++) {
      var d = lista[i];
      var w = wireframe(d.raiz);
      w.name = d.nombre;
      w.fills = [{ type: 'SOLID', color: hexARgb('#FFFFFF') }];
      w.strokes = [{ type: 'SOLID', color: hexARgb('#4F5751') }];
      w.strokeWeight = 2;
      w.cornerRadius = 24;
      w.clipsContent = true;
      // Un tope de alto: las pantallas largas se cortan con un «…».
      var alto = Math.min(d.alto, 1400);
      w.resize(d.ancho, alto);
      w.rescale(ESCALA);
      p.appendChild(w);
      var cx = x + col * (d.ancho * ESCALA + 60);
      w.x = cx;
      w.y = y + 30;
      var tn = texto(d.nombre, { fuente: ESTADO.fuenteUI.medio, tam: 16, color: '#0F5D3D', ancho: d.ancho * ESCALA });
      p.appendChild(tn);
      tn.x = cx;
      tn.y = y;
      cajas[d.id] = { x: w.x, y: w.y, w: w.width, h: w.height };
      altoFila = Math.max(altoFila, w.height + 60);
      col++;
      if (col >= columnas) {
        col = 0;
        y += altoFila + 40;
        altoFila = 0;
      }
    }
    x += columnas * (360 * ESCALA + 60) + 140;
  }

  // Flechas
  var hechos = {};
  for (var k = 0; k < DATOS.pantallas.length; k++) {
    var dd = DATOS.pantallas[k];
    var a = cajas[dd.id];
    if (!a) continue;
    for (var et in dd.enlaces) {
      var b = cajas[dd.enlaces[et]];
      // «Volver» es la flecha de regreso del sistema: no suma al diagrama.
      if (normal(et) === 'volver') continue;
      if (!b || hechos[dd.id + '>' + dd.enlaces[et]]) continue;
      hechos[dd.id + '>' + dd.enlaces[et]] = true;
      var adelante = b.x > a.x + a.w / 2;
      var x1 = adelante ? a.x + a.w : a.x;
      var y1 = a.y + Math.min(a.h - 20, 60 + (Object.keys(hechos).length % 6) * 28);
      var x2 = adelante ? b.x : b.x + b.w;
      if (Math.abs(b.x - a.x) < 5) {
        x1 = a.x + a.w;
        x2 = b.x + b.w;
      }
      var y2 = b.y + 40;
      var dx = Math.max(60, Math.abs(x2 - x1) / 2);
      var c1 = x1 + (adelante || Math.abs(b.x - a.x) < 5 ? dx : -dx);
      var c2 = x2 + (adelante ? -dx : dx);
      var v = figma.createVector();
      v.name = dd.id + ' → ' + dd.enlaces[et] + ' («' + et + '»)';
      await v.setVectorNetworkAsync({
        vertices: [
          { x: x1, y: y1, strokeCap: 'ROUND' },
          { x: x2, y: y2, strokeCap: 'ARROW_LINES' },
        ],
        segments: [{ start: 0, end: 1, tangentStart: { x: c1 - x1, y: 0 }, tangentEnd: { x: c2 - x2, y: 0 } }],
        regions: [],
      });
      v.strokes = [{ type: 'SOLID', color: hexARgb('#E97927') }];
      v.strokeWeight = 2.5;
      p.appendChild(v);
      var et2 = texto(et, { fuente: ESTADO.fuenteUI.fuerte, tam: 12, color: '#C25A12' });
      p.appendChild(et2);
      et2.x = adelante ? x1 + 10 : x1 - et2.width - 10;
      et2.y = y1 - 18;
    }
  }
}

// ───────────────────────────────────────────────────────── accesibilidad ──

function chipNivel(nivel) {
  var colores = { AAA: '#3F6B0E', AA: '#197249', 'Sólo grande': '#8A5A08', 'No cumple': '#9B2C2C', Inactivo: '#6B7A70' };
  var f = marcoAL('nivel', 'HORIZONTAL', 0, 0);
  f.paddingLeft = 10;
  f.paddingRight = 10;
  f.paddingTop = 4;
  f.paddingBottom = 4;
  f.cornerRadius = 999;
  f.fills = [{ type: 'SOLID', color: hexARgb(colores[nivel] || '#6B7A70') }];
  f.appendChild(texto(nivel, { fuente: ESTADO.fuenteUI.fuerte, tam: 12, color: '#FFFFFF' }));
  return f;
}

function construirAccesibilidad() {
  var p = ESTADO.paginaA11y;
  var raiz = marcoAL('Chequeo de accesibilidad', 'VERTICAL', 32, 64);
  raiz.fills = [{ type: 'SOLID', color: hexARgb('#FFFFFF') }];
  p.appendChild(raiz);
  raiz.appendChild(texto('Chequeo de accesibilidad', { fuente: ESTADO.fuenteUI.titulo, tam: 56, color: '#0F5D3D' }));
  var r = AUDITORIA.resumen;
  raiz.appendChild(
    texto(
      'Medido sobre las ' +
        r.pantallas +
        ' pantallas capturadas: ' +
        r.textos +
        ' textos, ' +
        r.pares +
        ' combinaciones distintas de color de texto y fondo, ' +
        r.tocables +
        ' elementos tocables. Criterios WCAG 2.2 (1.4.3 contraste, 2.5.8 tamaño del objetivo) y Material (48 dp). ' +
        'Detalle y plan de ajustes: docs/diseno/05-accesibilidad.md.',
      { tam: 16, color: '#33453B', ancho: 1100, lh: 24 },
    ),
  );
  raiz.appendChild(texto('Contraste de texto', { fuente: ESTADO.fuenteUI.medio, tam: 32, color: '#16241D' }));
  var tabla = marcoAL('Pares de color', 'VERTICAL', 8, 0);
  AUDITORIA.contraste.forEach(function (c) {
    var fila = marcoAL(c.texto + ' sobre ' + c.fondo, 'HORIZONTAL', 24, 0);
    fila.counterAxisAlignItems = 'CENTER';
    var muestra = marcoAL('muestra', 'HORIZONTAL', 0, 0);
    muestra.paddingLeft = 16;
    muestra.paddingRight = 16;
    muestra.paddingTop = 10;
    muestra.paddingBottom = 10;
    muestra.cornerRadius = 10;
    muestra.resize(300, 10);
    muestra.primaryAxisSizingMode = 'FIXED';
    muestra.counterAxisSizingMode = 'AUTO';
    muestra.fills = [pintura({ hex: c.fondo, a: 1 })];
    muestra.strokes = [{ type: 'SOLID', color: hexARgb('#E3DACA') }];
    muestra.strokeWeight = 1;
    muestra.appendChild(texto(c.ejemplo.slice(0, 30), { fuente: ESTADO.fuenteUI.fuerte, tam: Math.min(18, c.tamMin), color: c.texto }));
    fila.appendChild(muestra);
    fila.appendChild(texto(c.ratio.toFixed(2) + ' : 1', { fuente: ESTADO.fuenteUI.titulo, tam: 20, color: '#16241D' }));
    fila.appendChild(chipNivel(c.nivel));
    fila.appendChild(texto(c.texto + ' / ' + c.fondo + ' · ' + c.usos + ' usos · ' + c.tamMin + '–' + c.tamMax + ' px', { tam: 13, color: '#6B7A70' }));
    tabla.appendChild(fila);
  });
  raiz.appendChild(tabla);

  raiz.appendChild(texto('Objetivos táctiles menores a 44 × 44', { fuente: ESTADO.fuenteUI.medio, tam: 32, color: '#16241D' }));
  if (!AUDITORIA.toquesChicos.length) raiz.appendChild(texto('Ninguno.', { tam: 16 }));
  AUDITORIA.toquesChicos.forEach(function (t) {
    raiz.appendChild(
      texto('• ' + t.pantalla + ' — «' + t.etiqueta + '»: ' + t.w + ' × ' + t.h + ' px' + (t.nota ? ' (' + t.nota + ')' : ''), {
        tam: 15,
        color: '#33453B',
        ancho: 1100,
      }),
    );
  });
}

// ──────────────────────────────────────────────────────────── principal ──

async function importar(opciones) {
  ESTADO.errores = [];
  ESTADO.pendientesEstilo = [];
  avisar('Cargando tipografías…');
  var faltan = await prepararFuentes();
  if (faltan.length) {
    figma.notify('Faltan fuentes: ' + faltan.join(', ') + '. Se usó Inter en su lugar.', { timeout: 8000 });
  }

  avisar('Variables y estilos de texto…');
  try {
    await crearVariables();
  } catch (e) {
    ESTADO.errores.push('Variables: ' + e.message);
  }
  await crearEstilosTexto();

  ESTADO.paginaFundamentos = await pagina('fundamentos', true);
  ESTADO.paginaComponentes = await pagina('componentes', true);
  ESTADO.paginaPantallas = await pagina('pantallas', true);
  ESTADO.paginaAssets = await pagina('assets', true);
  await figma.setCurrentPageAsync(ESTADO.paginaPantallas);

  await construirPantallas(opciones.pantallas);
  avisar('Estilos de texto…');
  for (var i = 0; i < ESTADO.pendientesEstilo.length; i++) {
    var pe = ESTADO.pendientesEstilo[i];
    try {
      await pe.nodo.setTextStyleIdAsync(pe.estilo.id);
    } catch (e) {
      /* el texto quedó dentro de una instancia: hereda el del componente */
    }
  }
  avisar('Componentes y variantes…');
  ordenarComponentes();
  ordenarAssets();
  if (opciones.prototipo) {
    avisar('Enlazando el prototipo…');
    await enlazarPrototipo();
  }
  avisar('Fundamentos…');
  await construirFundamentos();
  if (opciones.flujo) {
    avisar('Flujo y wireframes…');
    ESTADO.paginaFlujo = await pagina('flujo', true);
    await construirFlujo(opciones.pantallas);
  }
  if (opciones.accesibilidad) {
    avisar('Accesibilidad…');
    ESTADO.paginaA11y = await pagina('a11y', true);
    construirAccesibilidad();
  }
  await figma.setCurrentPageAsync(ESTADO.paginaPantallas);
  var vistas = Object.keys(ESTADO.pantallas).map(function (k) {
    return ESTADO.pantallas[k];
  });
  if (vistas.length) figma.viewport.scrollAndZoomIntoView(vistas);
  return {
    pantallas: vistas.length,
    componentes: Object.keys(ESTADO.mains).length,
    sets: Object.keys(ESTADO.sets).length,
    assets: Object.keys(ESTADO.assets).length,
    errores: ESTADO.errores,
  };
}

figma.showUI(__html__, { width: 380, height: 600, themeColors: true });
figma.ui.postMessage({
  tipo: 'datos',
  pantallas: DATOS.pantallas.map(function (p) {
    return { id: p.id, nombre: p.nombre, seccion: p.seccion };
  }),
  generado: DATOS.generado,
});
figma.ui.onmessage = function (msg) {
  if (msg.tipo === 'cerrar') {
    figma.closePlugin();
    return;
  }
  if (msg.tipo !== 'importar') return;
  importar(msg)
    .then(function (r) {
      figma.ui.postMessage({ tipo: 'listo', resultado: r });
      figma.notify('Piko: ' + r.pantallas + ' pantallas y ' + r.sets + ' componentes importados');
    })
    .catch(function (e) {
      figma.ui.postMessage({ tipo: 'error', texto: String((e && e.stack) || e) });
    });
};
