/**
 * Convierte el árbol que extrae `extraer.js` (cajas absolutas + flexbox de
 * CSS) en un árbol listo para Figma:
 *
 *   - Quita los envoltorios vacíos que agrega react-native-web.
 *   - Infiere el AUTO LAYOUT de cada contenedor (dirección, padding, gap,
 *     alineación, hug/fill/fixed) y lo VERIFICA simulando dónde caería cada
 *     hijo: si alguna posición difiere en más de un píxel de la real, ese
 *     contenedor queda con posiciones absolutas. Así el resultado es editable
 *     como un diseño hecho a mano, pero nunca se mueve de donde está en la app.
 *   - Marca los componentes reutilizables y su variante.
 */

const TOL = 1;
const casi = (a, b, t = TOL) => Math.abs(a - b) <= t;
const r2 = (n) => Math.round(n * 100) / 100;

const hex = (c) =>
  c
    ? {
        hex:
          '#' +
          [c.r, c.g, c.b]
            .map((v) => Math.round(v).toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase(),
        a: c.a,
      }
    : null;

const esVisual = (n) =>
  n.t !== 'frame' ||
  !!n.fondo ||
  !!n.bordes ||
  !!n.sombra ||
  (n.opacidad ?? 1) < 1 ||
  !!n.rot;

/** Quita envoltorios sin estilo que tienen un solo hijo con la misma caja. */
function colapsar(n) {
  if (n.t !== 'frame') return n;
  n.hijos = n.hijos.map(colapsar).filter(Boolean);
  if (!esVisual(n) && n.hijos.length === 0) return n.comps ? n : null;
  if (!esVisual(n) && n.hijos.length === 1) {
    const h = n.hijos[0];
    const misma = casi(h.x, n.x, 0.5) && casi(h.y, n.y, 0.5) && casi(h.w, n.w, 0.5) && casi(h.h, n.h, 0.5);
    if (misma) {
      h.comps = [...(n.comps ?? []), ...(h.comps ?? [])];
      if (!h.comps.length) delete h.comps;
      h.flujo = n.flujo;
      h.toca = h.toca || n.toca;
      h.a11y = h.a11y || n.a11y;
      h.capa = n.capa || h.capa;
      return h;
    }
  }
  return n;
}

function bordesDe(n) {
  const b = n.bordes;
  if (!b) return [0, 0, 0, 0];
  return b.map((x) => (x.c ? x.w : 0));
}

/** Intenta describir el contenedor como auto layout. Devuelve null si no se puede. */
function inferir(n) {
  const f = n.flex;
  if (!f || f.display !== 'flex' || !n.hijos.length) return null;
  if (n.rot) return null;
  const dir = f.dir === 'row' ? 'H' : f.dir === 'column' ? 'V' : null;
  if (!dir) return null;

  const enFlujo = n.hijos.filter((h) => !['absolute', 'fixed'].includes(h.flujo?.pos));
  if (!enFlujo.length) return null;
  if (enFlujo.some((h) => h.rot)) return null;

  const bd = bordesDe(n);
  // En Figma el trazo no ocupa lugar: el padding absorbe el ancho del borde.
  const padCss = f.pad.map((p, i) => p + bd[i]);
  const H = dir === 'H';
  const ini = (h) => (H ? h.x : h.y);
  const fin = (h) => (H ? h.x + h.w : h.y + h.h);
  const cIni = (h) => (H ? h.y : h.x);
  const cFin = (h) => (H ? h.y + h.h : h.x + h.w);
  const nIni = H ? n.x : n.y;
  const nFin = H ? n.x + n.w : n.y + n.h;
  const ncIni = H ? n.y : n.x;
  const ncFin = H ? n.y + n.h : n.x + n.w;
  // [inicio, fin] del eje principal y del cruzado en el orden t,r,b,l del CSS.
  const pIniCss = H ? padCss[3] : padCss[0];
  const pFinCss = H ? padCss[1] : padCss[2];
  const cIniCss = H ? padCss[0] : padCss[3];
  const cFinCss = H ? padCss[2] : padCss[1];

  const wrap = f.wrap === 'wrap' && H;
  const gapCss = H ? f.gapC : f.gapF;

  // ── Eje principal ─────────────────────────────────────────────────────
  let gap = gapCss;
  let prim = 'MIN';
  let pIni = pIniCss;
  let pFin = pFinCss;
  let gapCruz = 0;

  if (!wrap) {
    for (let i = 1; i < enFlujo.length; i++) if (ini(enFlujo[i]) < fin(enFlujo[i - 1]) - TOL) return null;
    const huecos = enFlujo.slice(1).map((h, i) => ini(h) - fin(enFlujo[i]));
    if (huecos.length) {
      const g = huecos.reduce((a, b) => a + b, 0) / huecos.length;
      if (huecos.some((x) => !casi(x, g))) return null;
      gap = r2(g);
    }
    const lead = ini(enFlujo[0]) - nIni;
    const trail = nFin - fin(enFlujo.at(-1));
    if (f.justify === 'space-between' && enFlujo.length > 1 && casi(lead, pIniCss) && casi(trail, pFinCss)) {
      prim = 'SPACE_BETWEEN';
    } else if (f.justify === 'center' && casi(lead - pIniCss, trail - pFinCss)) {
      prim = 'CENTER';
    } else if (f.justify === 'flex-end' && casi(trail, pFinCss)) {
      prim = 'MAX';
    } else {
      prim = 'MIN';
      pIni = r2(lead);
      if (!casi(lead, pIniCss)) pFin = Math.max(0, r2(Math.min(trail, pFinCss)));
    }
  } else {
    gapCruz = f.gapF;
    pIni = r2(Math.min(...enFlujo.map((h) => ini(h))) - nIni);
  }

  // ── Eje cruzado ───────────────────────────────────────────────────────
  const disponibleC = ncFin - ncIni - cIniCss - cFinCss;
  const alineaCss = f.align;
  const cand = ['MIN', 'CENTER', 'MAX'];
  const llena = (h) => casi(cFin(h) - cIni(h), disponibleC);
  const cumple = (h, a) => {
    const off0 = cIni(h) - ncIni - cIniCss;
    const off1 = ncFin - cFinCss - cFin(h);
    if (a === 'MIN') return casi(off0, 0);
    if (a === 'MAX') return casi(off1, 0);
    return casi(off0, off1);
  };
  let cruz = null;
  const soloTextos = enFlujo.every((h) => h.t === 'text');
  if (alineaCss === 'baseline' && H && soloTextos && !wrap) cruz = 'BASELINE';
  else if (!wrap) {
    const pref = alineaCss === 'center' ? 'CENTER' : alineaCss === 'flex-end' ? 'MAX' : 'MIN';
    for (const a of [pref, ...cand.filter((c) => c !== pref)]) {
      if (enFlujo.every((h) => cumple(h, a))) {
        cruz = a;
        break;
      }
    }
    if (!cruz) return null;
  } else {
    cruz = 'MIN';
  }

  // ── Verificación por simulación (wrap) ───────────────────────────────
  if (wrap) {
    const disp = nFin - nIni - pIni - pFinCss;
    let x = 0;
    let y = 0;
    let altoLinea = 0;
    for (const h of enFlujo) {
      const w = fin(h) - ini(h);
      if (x > 0 && x + w > disp + 0.5) {
        y += altoLinea + gapCruz;
        x = 0;
        altoLinea = 0;
      }
      if (!casi(ini(h), nIni + pIni + x) || !casi(cIni(h), ncIni + cIniCss + y)) return null;
      x += w + gap;
      altoLinea = Math.max(altoLinea, cFin(h) - cIni(h));
    }
  }

  // ── Tamaño propio en cada eje ─────────────────────────────────────────
  const trailReal = nFin - Math.max(...enFlujo.map(fin));
  // Centrado sin espacio sobrante es lo mismo que abrazar el contenido.
  const leadReal = Math.min(...enFlujo.map(ini)) - nIni;
  const abrazaPrim =
    !wrap &&
    prim !== 'SPACE_BETWEEN' &&
    prim !== 'MAX' &&
    casi(trailReal, pFin) &&
    (prim !== 'CENTER' || casi(leadReal, pIni));
  const maxCruz = Math.max(...enFlujo.map((h) => cFin(h) - cIni(h)));
  const abrazaCruz = !wrap && casi(maxCruz, disponibleC) && cruz !== 'BASELINE';

  return {
    modo: dir,
    wrap,
    pad: H ? [cIniCss, pFin, cFinCss, pIni] : [pIni, cFinCss, pFin, cIniCss],
    gap: Math.max(0, gap),
    gapCruz,
    prim,
    cruz,
    abrazaPrim,
    abrazaCruz,
    estira: alineaCss === 'stretch' || alineaCss === 'normal',
    llena,
    enFlujo,
  };
}

let contador = 0;

function nombrar(n) {
  if (n.comp) return n.comp.nombre;
  if (n.t === 'text') return n.runs.map((r) => r.texto).join('').slice(0, 40) || 'Texto';
  if (n.t === 'svg') return n.capa ? `Dibujo · ${n.capa}` : 'Dibujo';
  if (n.t === 'img') return n.capa ? `Imagen · ${n.capa}` : 'Imagen';
  const texto = primerTexto(n);
  if (n.toca) return `Tocable${texto ? ` · ${texto}` : ''}`;
  if (n.fondo || n.bordes) return `Tarjeta${texto ? ` · ${texto}` : ''}`;
  if (n.capa && !/^(Pantalla|Portada|View)$/.test(n.capa)) return n.capa;
  const dir = n.flex?.dir === 'row' ? 'Fila' : 'Columna';
  return texto ? `${dir} · ${texto}` : dir;
}

function primerTexto(n) {
  if (n.t === 'text') return n.runs.map((r) => r.texto).join('').trim().slice(0, 24);
  for (const h of n.hijos ?? []) {
    const t = primerTexto(h);
    if (t) return t;
  }
  return '';
}

/** Firma estructural: dos apariciones con la misma firma comparten componente. */
function firma(n, raiz = true) {
  if (!raiz && n.comp) return `C(${n.comp.id})`;
  if (n.tipo === 'TEXT') return `T${n.runs.length}`;
  if (n.tipo === 'SVG') return `S`;
  if (n.tipo === 'IMG') return `I`;
  // Un componente anidado cuenta sólo por cuál es, no por su variante: en
  // Figma se cambia con «instance swap» sin necesitar otra variante del padre.
  const anid = n.comp ? `C(${n.comp.id})` : '';
  return `F${n.al ? n.al.modo : 'N'}${anid}[${n.hijos.map((h) => firma(h, false)).join(',')}]`;
}

/**
 * Convierte un nodo (coordenadas absolutas) en el nodo de salida, con
 * coordenadas relativas al padre.
 */
function convertir(n, padre, ctx) {
  contador++;
  const comps = (n.comps ?? []).filter((c) => ctx.catalogo[c.nombre]);
  const c = comps[0];
  const salida = {
    tipo: n.t === 'frame' ? 'FRAME' : n.t === 'text' ? 'TEXT' : n.t === 'svg' ? 'SVG' : 'IMG',
    x: r2(n.x - (padre ? padre.x : 0)),
    y: r2(n.y - (padre ? padre.y : 0)),
    w: r2(n.w),
    h: r2(n.h),
  };
  if (c) {
    const def = ctx.catalogo[c.nombre];
    salida.comp = { id: c.nombre, nombre: def.nombre, variante: def.variantes(c.props ?? {}) };
    n.comp = salida.comp;
  }
  if (n.rot) salida.rot = n.rot;
  if ((n.opacidad ?? 1) < 1) salida.opacidad = n.opacidad;
  if (n.toca) salida.toca = true;
  if (n.a11y) salida.a11y = n.a11y;
  if (n.encabezado) salida.encabezado = true;
  if (n.campo) salida.campo = true;

  if (n.t === 'text') {
    salida.runs = n.runs.map((r) => ({ ...r, color: hex(r.color) }));
    salida.lh = n.lh;
    salida.lineas = n.lineas;
    salida.alinear = n.alinear;
    salida.justo = n.justo;
    if (n.trunca) salida.trunca = n.trunca === true ? 1 : n.trunca;
  } else if (n.t === 'svg') {
    salida.svg = ctx.renombrar[n.svg] ?? n.svg;
    if (n.capa) salida.capa = n.capa;
  } else if (n.t === 'img') {
    salida.img = ctx.renombrar[n.img] ?? n.img;
    salida.ajuste = n.ajuste;
  } else {
    salida.fondo = hex(n.fondo);
    if (n.bordes) {
      const conColor = n.bordes.find((b) => b.c && b.w > 0);
      salida.trazo = {
        ...hex(conColor.c),
        pesos: n.bordes.map((b) => (b.c ? b.w : 0)),
        discontinuo: n.bordes.some((b) => b.s === 'dashed'),
        // Si los lados tienen colores distintos (el labio de las tarjetas), se
        // usa el del lado más grueso para ese lado: Figma no deja un color por lado.
        inferior: n.bordes[2].c && hex(n.bordes[2].c).hex !== hex(conColor.c).hex ? hex(n.bordes[2].c) : null,
      };
    }
    if (n.radios.some((r) => r > 0)) salida.radios = n.radios.map(r2);
    if (n.sombra) salida.sombra = n.sombra;
    const tieneDesborde = n.hijos.some(
      (h) => h.x < n.x - 0.5 || h.y < n.y - 0.5 || h.x + h.w > n.x + n.w + 0.5 || h.y + h.h > n.y + n.h + 0.5,
    );
    salida.recorta = !!(n.recorta && tieneDesborde);

    const al = inferir(n);
    salida.hijos = n.hijos.map((h) => convertir(h, n, ctx));
    if (al) {
      salida.al = {
        modo: al.modo,
        wrap: al.wrap,
        pad: al.pad.map(r2),
        gap: r2(al.gap),
        gapCruz: r2(al.gapCruz),
        prim: al.prim,
        cruz: al.cruz,
      };
      const H = al.modo === 'H';
      salida[H ? 'tamH' : 'tamV'] = al.abrazaPrim ? 'HUG' : 'FIXED';
      salida[H ? 'tamV' : 'tamH'] = al.abrazaCruz && !al.estira ? 'HUG' : 'FIXED';
      n.hijos.forEach((h, i) => {
        const s = salida.hijos[i];
        if (!al.enFlujo.includes(h)) {
          s.abs = true;
          return;
        }
        // Llenar el eje cruzado cuando el CSS estira y el hijo ocupa todo.
        const ejeCruz = H ? 'V' : 'H';
        const ejePrim = H ? 'H' : 'V';
        const self = h.flujo?.selfAlign;
        const estiraHijo = self === 'stretch' || ((self === 'auto' || self === 'normal' || !self) && al.estira);
        if (estiraHijo && al.llena(h) && !al.wrap) s[`tam${ejeCruz}`] = 'FILL';
        // Un texto de una línea que se corta con «…» necesita un ancho que
        // lo contenga: ocupa el ancho del padre y se centra con textAlign.
        // Lo mismo para un texto centrado en una columna: en la app puede
        // partirse en dos líneas si el contenido cambia (otra instancia).
        const centrado = s.tipo === 'TEXT' && s.justo && !H && al.cruz === 'CENTER' && !al.abrazaCruz;
        if (s.tipo === 'TEXT' && (s.trunca || centrado) && !H && !al.wrap) {
          s.tamH = 'FILL';
          if (al.cruz === 'CENTER') s.alinear = 'center';
        }
        if ((h.flujo?.grow ?? 0) > 0 && !al.abrazaPrim && !al.wrap) s[`tam${ejePrim}`] = 'FILL';
      });
      // Un hijo que llena el eje cruzado no puede vivir en un padre que lo abraza.
      const cruzado = H ? 'tamV' : 'tamH';
      if (salida[cruzado] === 'HUG' && salida.hijos.some((x) => !x.abs && x[cruzado] === 'FILL')) salida[cruzado] = 'FIXED';
    } else {
      salida.al = null;
    }
  }

  // Textos: cómo se ajusta la caja.
  if (salida.tipo === 'TEXT') {
    const alto = salida.lineas * salida.lh;
    const altoJusto = casi(alto, salida.h, 1.5);
    if (!salida.tamH) salida.tamH = salida.justo ? 'HUG' : 'FIXED';
    if (!salida.tamV) salida.tamV = altoJusto ? 'HUG' : 'FIXED';
  }
  salida.nombre = nombrar({ ...n, comp: salida.comp });
  return salida;
}

/** Las decisiones de tamaño que dependen del padre se terminan en una segunda pasada. */
function ajustarTamanos(s, padre) {
  for (const k of ['tamH', 'tamV']) {
    if (!s[k]) s[k] = 'FIXED';
    // FILL sólo tiene sentido dentro de un auto layout.
    if (s[k] === 'FILL' && (!padre || !padre.al || s.abs)) s[k] = 'FIXED';
    // HUG en un marco sin auto layout no existe.
    if (s[k] === 'HUG' && s.tipo === 'FRAME' && !s.al) s[k] = 'FIXED';
    if (s[k] === 'HUG' && (s.tipo === 'SVG' || s.tipo === 'IMG')) s[k] = 'FIXED';
  }
  if (s.tipo === 'TEXT') {
    // Ancho que abraza y alto fijo no existe en Figma: se fija también el ancho.
    if (s.tamH === 'HUG' && s.tamV !== 'HUG') s.tamH = 'FIXED';
  }
  for (const h of s.hijos ?? []) ajustarTamanos(h, s);
}

function marcarFirmas(s, mapa) {
  for (const h of s.hijos ?? []) marcarFirmas(h, mapa);
  if (!s.comp) return;
  const base = `${s.comp.id}|${JSON.stringify(s.comp.variante)}`;
  const f = firma(s);
  if (!mapa.has(base)) mapa.set(base, []);
  const lista = mapa.get(base);
  let i = lista.indexOf(f);
  if (i < 0) {
    lista.push(f);
    i = lista.length - 1;
  }
  if (i > 0) s.comp.variante = { ...s.comp.variante, Forma: String.fromCharCode(65 + i) };
  s.comp.clave = `${s.comp.id}|${JSON.stringify(s.comp.variante)}`;
}

/**
 * Patrones: estructuras que se repiten en las pantallas sin ser un componente
 * de React (encabezados, tarjetas, chips, campos). Se reconocen por estilo y
 * contenido, de abajo hacia arriba, y pasan a ser componentes como los demás.
 */
function aplicarPatrones(s, patrones) {
  for (const h of s.hijos ?? []) aplicarPatrones(h, patrones);
  if (s.comp || s.tipo !== 'FRAME') return;
  for (const [id, p] of Object.entries(patrones)) {
    if (!p.patron(s)) continue;
    s.comp = { id, nombre: p.nombre, variante: p.variantes(s) };
    s.nombre = p.nombre;
    return;
  }
}

const firmasGlobales = new Map();

export function maquetar(raiz, { renombrar, ancho, alto, catalogo }) {
  contador = 0;
  let r = colapsar(raiz);
  // La raíz de la pantalla siempre ocupa el dispositivo entero.
  r.x = 0;
  r.y = 0;
  r.w = ancho;
  r.h = alto;
  const salida = convertir(r, null, { renombrar, catalogo });
  salida.x = 0;
  salida.y = 0;
  ajustarTamanos(salida, null);
  salida.tamH = 'FIXED';
  salida.tamV = 'FIXED';
  aplicarPatrones(salida, Object.fromEntries(Object.entries(catalogo).filter(([, v]) => v.patron)));
  marcarFirmas(salida, firmasGlobales);
  salida.nodos = contador;
  return salida;
}
