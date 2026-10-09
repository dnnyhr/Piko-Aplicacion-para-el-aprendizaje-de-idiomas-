/**
 * Corre DENTRO de la página (Playwright `page.evaluate`). Recorre el DOM que
 * produce react-native-web y lo devuelve como un árbol de nodos con lo que
 * Figma necesita: caja, fondo, bordes, radios, tipografía y la configuración
 * flex de cada contenedor. Además marca qué componente de React generó cada
 * elemento (Boton, Opcion, Globo…) leyendo la fibra de React, para que el
 * plugin pueda convertirlos en instancias de componentes reutilizables.
 *
 * Se escribe como una sola función autocontenida porque se serializa y se
 * inyecta en el navegador.
 */
// eslint-disable-next-line no-unused-vars
function extraerPantalla({ ancho, catalogo }) {
  const svgs = {};
  const imagenes = {};
  // Desde <body>: los Modal de react-native-web se montan fuera de #root.
  const raizDom = document.body;
  const base = raizDom.getBoundingClientRect();

  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const r2 = (n) => Math.round(n * 100) / 100;

  const colorRGBA = (c) => {
    if (!c || c === 'transparent') return null;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    if (a === 0) return null;
    return { r: p[0], g: p[1], b: p[2], a: r2(a) };
  };

  const claveFibra = (el) => Object.keys(el).find((k) => k.startsWith('__reactFiber$'));

  /** Los componentes compuestos cuyo nodo raíz es este elemento del DOM. */
  const componentesDe = (el) => {
    const k = claveFibra(el);
    if (!k) return [];
    const salida = [];
    let f = el[k].return;
    while (f && typeof f.type !== 'string') {
      const t = f.type;
      const nombre = t && (t.displayName || t.name);
      if (nombre && catalogo.includes(nombre)) salida.unshift({ nombre, props: resumirProps(f.memoizedProps) });
      f = f.return;
    }
    return salida;
  };

  function resumirProps(p) {
    const out = {};
    if (!p) return out;
    for (const [k, v] of Object.entries(p)) {
      if (k === 'style' || typeof v === 'function') continue;
      if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
      else if (typeof v === 'object' && !Array.isArray(v) && ('id' in v || 'nombre' in v)) {
        out[k] = { id: v.id ?? null, nombre: v.nombre ?? null };
      } else if (typeof v === 'object' && v.$$typeof) out[k] = '<elemento>';
    }
    return out;
  }

  /** Nombre legible del componente compuesto más cercano (para nombrar capas). */
  const nombreFibra = (el) => {
    const k = claveFibra(el);
    if (!k) return null;
    let f = el[k].return;
    while (f && typeof f.type !== 'string') {
      const t = f.type;
      const n = t && (t.displayName || t.name);
      if (n && !/^(View|Text|Pressable|Animated|AnimatedComponent|ScrollView|ScrollViewBase|SvgXml|Svg|Image|Fragment)/.test(n) && /^[A-Z]/.test(n)) return n;
      f = f.return;
    }
    return null;
  };

  const rotacionDe = (cs) => {
    const t = cs.transform;
    if (!t || t === 'none') return 0;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    const [a, b] = m[1].split(',').map(Number);
    const g = (Math.atan2(b, a) * 180) / Math.PI;
    return Math.abs(g) < 0.5 ? 0 : r2(g);
  };

  /** Caja sin transformaciones: centro del rect visible + tamaño de layout. */
  const cajaDe = (el, cs) => {
    const rc = el.getBoundingClientRect();
    const w = el.offsetWidth ?? rc.width;
    const h = el.offsetHeight ?? rc.height;
    const tieneT = cs.transform && cs.transform !== 'none';
    if (!tieneT || el instanceof SVGElement) {
      return { x: r2(rc.left - base.left), y: r2(rc.top - base.top), w: r2(rc.width), h: r2(rc.height) };
    }
    const cx = rc.left + rc.width / 2 - base.left;
    const cy = rc.top + rc.height / 2 - base.top;
    // Las animaciones de "respirar" y "saltar" mueven el centro unos píxeles:
    // se usa la posición de layout (sin transform) cuando se puede.
    const padre = el.offsetParent;
    if (padre && rotacionDe(cs) === 0) {
      const pr = padre.getBoundingClientRect();
      const pcs = getComputedStyle(padre);
      const ptiene = pcs.transform && pcs.transform !== 'none';
      if (!ptiene) {
        return {
          x: r2(pr.left - base.left + num(pcs.borderLeftWidth) + el.offsetLeft),
          y: r2(pr.top - base.top + num(pcs.borderTopWidth) + el.offsetTop),
          w: r2(w),
          h: r2(h),
        };
      }
    }
    return { x: r2(cx - w / 2), y: r2(cy - h / 2), w: r2(w), h: r2(h) };
  };

  const visible = (el, cs, caja) => {
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (num(cs.opacity) === 0) return false;
    if (caja.x + caja.w <= 0 || caja.x >= ancho) return false;
    return true;
  };

  const fuenteDe = (cs) => cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();

  const esTexto = (el) =>
    !(el instanceof SVGElement) &&
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '');

  function nodoTexto(el, cs, caja) {
    const runs = [];
    const caminar = (n) => {
      if (n.nodeType === 3) {
        if (!n.textContent) return;
        const pcs = getComputedStyle(n.parentElement);
        const run = {
          texto: n.textContent,
          fuente: fuenteDe(pcs),
          peso: pcs.fontWeight,
          tam: num(pcs.fontSize),
          color: colorRGBA(pcs.color),
          ls: pcs.letterSpacing === 'normal' ? 0 : num(pcs.letterSpacing),
          deco: pcs.textDecorationLine.includes('underline') ? 'UNDERLINE' : 'NONE',
          caso: pcs.textTransform === 'uppercase' ? 'UPPER' : 'ORIGINAL',
        };
        const prev = runs[runs.length - 1];
        if (
          prev &&
          ['fuente', 'peso', 'tam', 'ls', 'deco', 'caso'].every((k) => prev[k] === run[k]) &&
          JSON.stringify(prev.color) === JSON.stringify(run.color)
        ) {
          prev.texto += run.texto;
        } else runs.push(run);
      } else if (n.nodeType === 1) {
        const ncs = getComputedStyle(n);
        if (ncs.display === 'none') return;
        n.childNodes.forEach(caminar);
      }
    };
    el.childNodes.forEach(caminar);

    const rango = document.createRange();
    rango.selectNodeContents(el);
    const rects = [...rango.getClientRects()].filter((r) => r.width > 0.5);
    const tops = [];
    for (const r of rects) if (!tops.some((t) => Math.abs(t - r.top) < 3)) tops.push(r.top);
    const lineas = Math.max(1, tops.length);
    const izq = Math.min(...rects.map((r) => r.left));
    const der = Math.max(...rects.map((r) => r.right));
    const anchoGlifos = rects.length ? der - izq : 0;

    // La caja del texto es la de contenido: sin padding ni borde.
    const pt = num(cs.paddingTop) + num(cs.borderTopWidth);
    const pb = num(cs.paddingBottom) + num(cs.borderBottomWidth);
    const pl = num(cs.paddingLeft) + num(cs.borderLeftWidth);
    const pr = num(cs.paddingRight) + num(cs.borderRightWidth);
    const contenido = { x: r2(caja.x + pl), y: r2(caja.y + pt), w: r2(caja.w - pl - pr), h: r2(caja.h - pt - pb) };
    const lh = cs.lineHeight === 'normal' ? r2(contenido.h / lineas) : num(cs.lineHeight);
    let alinear = cs.textAlign;
    if (alinear === 'start' || alinear === 'justify' || alinear === '-webkit-auto') alinear = 'left';
    if (alinear === 'end') alinear = 'right';

    const texto = {
      t: 'text',
      ...contenido,
      runs,
      lh,
      lineas,
      alinear,
      // Ancho justo (shrink-to-fit): en Figma conviene que el texto abrace su contenido.
      justo: Math.abs(contenido.w - anchoGlifos) < 1.5 && lineas === 1,
      opacidad: num(cs.opacity) < 1 ? r2(num(cs.opacity)) : 1,
      // numberOfLines={1}: el texto se corta con «…».
      trunca: cs.textOverflow === 'ellipsis' ? Math.max(1, num(cs.webkitLineClamp) || 1) : 0,
    };
    const conCaja =
      pt + pb + pl + pr > 0 || colorRGBA(cs.backgroundColor) || num(cs.borderTopLeftRadius) > 0;
    if (!conCaja) return texto;
    const marco = nodoMarco(el, cs, caja);
    texto.opacidad = 1;
    marco.hijos = [texto];
    return marco;
  }

  function nodoMarco(el, cs, caja) {
    const bordes = ['Top', 'Right', 'Bottom', 'Left'].map((l) => ({
      w: cs[`border${l}Style`] === 'none' ? 0 : num(cs[`border${l}Width`]),
      c: colorRGBA(cs[`border${l}Color`]),
      s: cs[`border${l}Style`],
    }));
    const sombra = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : null;
    return {
      t: 'frame',
      ...caja,
      fondo: colorRGBA(cs.backgroundColor),
      bordes: bordes.some((b) => b.w > 0 && b.c) ? bordes : null,
      radios: ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) =>
        Math.min(num(cs[`border${c}Radius`]), caja.w / 2, caja.h / 2),
      ),
      opacidad: num(cs.opacity) < 1 ? r2(num(cs.opacity)) : 1,
      recorta: cs.overflow !== 'visible' || cs.overflowX !== 'visible',
      rot: rotacionDe(cs),
      sombra,
      flex: {
        display: cs.display,
        dir: cs.flexDirection,
        wrap: cs.flexWrap,
        justify: cs.justifyContent,
        align: cs.alignItems,
        gapF: cs.rowGap === 'normal' ? 0 : num(cs.rowGap),
        gapC: cs.columnGap === 'normal' ? 0 : num(cs.columnGap),
        pad: ['Top', 'Right', 'Bottom', 'Left'].map((l) => num(cs[`padding${l}`])),
      },
      hijos: [],
    };
  }

  /** Un campo de texto: su caja y, adentro, el valor o el texto de ayuda. */
  function nodoCampo(el, cs, caja) {
    const marco = nodoMarco(el, cs, caja);
    const valor = el.value || el.placeholder || '';
    if (!valor) return marco;
    const pcs = getComputedStyle(el, el.value ? null : '::placeholder');
    const pt = num(cs.paddingTop) + num(cs.borderTopWidth);
    const pb = num(cs.paddingBottom) + num(cs.borderBottomWidth);
    const pl = num(cs.paddingLeft) + num(cs.borderLeftWidth);
    const pr = num(cs.paddingRight) + num(cs.borderRightWidth);
    const tam = num(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? r2(tam * 1.22) : num(cs.lineHeight);
    const alto = caja.h - pt - pb;
    let alinear = cs.textAlign;
    if (!['center', 'right'].includes(alinear)) alinear = 'left';
    marco.hijos = [
      {
        t: 'text',
        x: r2(caja.x + pl),
        y: r2(caja.y + pt + (alto - lh) / 2),
        w: r2(caja.w - pl - pr),
        h: lh,
        runs: [
          {
            texto: valor,
            fuente: fuenteDe(cs),
            peso: cs.fontWeight,
            tam,
            color: colorRGBA(pcs.color) || colorRGBA(cs.color),
            ls: cs.letterSpacing === 'normal' ? 0 : num(cs.letterSpacing),
            deco: 'NONE',
            caso: cs.textTransform === 'uppercase' ? 'UPPER' : 'ORIGINAL',
          },
        ],
        lh,
        lineas: 1,
        alinear,
        justo: false,
        opacidad: 1,
        trunca: 0,
        flujo: { pos: 'absolute' },
      },
    ];
    marco.campo = true;
    return marco;
  }

  function nodoSvg(el, caja) {
    const copia = el.cloneNode(true);
    const cs = getComputedStyle(el);
    const actual = cs.color;
    copia.removeAttribute('class');
    copia.removeAttribute('style');
    copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // react-native-svg deja en el DOM props que no son SVG (`xml`, `ariaLabel`,
    // `rotation`…) y usa `transform-origin`, que el importador de Figma ignora:
    // se reescribe como traslaciones para que los giros queden donde van.
    for (const n of [copia, ...copia.querySelectorAll('*')]) {
      for (const a of ['xml', 'ariaLabel', 'aria-label', 'role', 'rotation', 'scale', 'origin', 'originX', 'originY', 'data-testid']) {
        n.removeAttribute(a);
      }
      const origen = n.getAttribute('transform-origin');
      if (origen !== null) {
        const t = n.getAttribute('transform');
        const [ox, oy] = origen.trim().split(/[ ,]+/).map(Number);
        if (t && (ox || oy)) n.setAttribute('transform', `translate(${ox} ${oy}) ${t} translate(${-ox} ${-oy})`);
        n.removeAttribute('transform-origin');
      }
      if (n.getAttribute('transform') === 'rotate(0)') n.removeAttribute('transform');
    }
    let vb = el.getAttribute('viewBox');
    if (!vb) {
      vb = `0 0 ${caja.w} ${caja.h}`;
      copia.setAttribute('viewBox', vb);
    }
    const [, , vw, vh] = vb.split(/[ ,]+/).map(Number);
    copia.setAttribute('width', String(vw));
    copia.setAttribute('height', String(vh));
    let xml = new XMLSerializer().serializeToString(copia).replace(/currentColor/g, actual);
    // Los estilos en línea de react-native-svg (transform-origin, etc.) no hacen falta.
    xml = xml.replace(/\s(class)="[^"]*"/g, '');
    let id = Object.keys(svgs).find((k) => svgs[k].xml === xml);
    if (!id) {
      id = `svg${Object.keys(svgs).length + 1}`;
      svgs[id] = { xml, w: vw, h: vh };
    }
    // preserveAspectRatio="xMidYMid meet": el dibujo se centra dentro de la caja.
    const par = el.getAttribute('preserveAspectRatio') || 'xMidYMid meet';
    let dentro = { x: caja.x, y: caja.y, w: caja.w, h: caja.h };
    if (par !== 'none') {
      const s = Math.min(caja.w / vw, caja.h / vh);
      const w = vw * s;
      const h = vh * s;
      dentro = { x: r2(caja.x + (caja.w - w) / 2), y: r2(caja.y + (caja.h - h) / 2), w: r2(w), h: r2(h) };
    }
    return { t: 'svg', ...dentro, svg: id, opacidad: num(cs.opacity) < 1 ? r2(num(cs.opacity)) : 1 };
  }

  function nodoImagen(cs, caja) {
    const url = cs.backgroundImage.match(/url\("?([^")]+)"?\)/)[1];
    let id = Object.keys(imagenes).find((k) => imagenes[k].url === url);
    if (!id) {
      id = `img${Object.keys(imagenes).length + 1}`;
      imagenes[id] = { url };
    }
    const tam = cs.backgroundSize;
    return { t: 'img', ...caja, img: id, ajuste: tam === 'cover' ? 'FILL' : tam === 'contain' ? 'FIT' : 'FILL' };
  }

  function recorrer(el) {
    const cs = getComputedStyle(el);
    const caja = cajaDe(el, cs);
    if (!visible(el, cs, caja)) return null;

    const comps = componentesDe(el);
    const capa = el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg' ? null : nombreFibra(el);
    const etiquetaA11y = el.getAttribute && (el.getAttribute('aria-label') || null);
    const rol = el.getAttribute && el.getAttribute('role');
    const zi = cs.zIndex === 'auto' ? 0 : num(cs.zIndex);
    const enFlujo = {
      pos: cs.position,
      selfAlign: cs.alignSelf,
      grow: num(cs.flexGrow),
      margen: ['Top', 'Right', 'Bottom', 'Left'].map((l) => num(cs[`margin${l}`])),
    };

    let nodo;
    if (el.tagName.toLowerCase() === 'svg') {
      if (caja.w < 0.5 || caja.h < 0.5) return null;
      nodo = nodoSvg(el, caja);
    } else if (el.tagName.toLowerCase() === 'img') {
      return null; // react-native-web dibuja la imagen como background del div hermano
    } else if (cs.backgroundImage && cs.backgroundImage.startsWith('url(')) {
      nodo = nodoImagen(cs, caja);
    } else if (['input', 'textarea'].includes(el.tagName.toLowerCase())) {
      nodo = nodoCampo(el, cs, caja);
    } else if (esTexto(el)) {
      nodo = nodoTexto(el, cs, caja);
    } else {
      nodo = nodoMarco(el, cs, caja);
      for (const hijo of el.children) {
        const h = recorrer(hijo);
        if (h) nodo.hijos.push(h);
      }
      nodo.hijos.sort((a, b) => (a.zi ?? 0) - (b.zi ?? 0));
    }
    if (comps.length) nodo.comps = comps;
    if (capa) nodo.capa = capa;
    if (etiquetaA11y) nodo.a11y = etiquetaA11y;
    if (rol === 'button' || rol === 'link' || el.tagName === 'BUTTON' || el.tagName === 'A') nodo.toca = true;
    if (rol === 'heading') nodo.encabezado = true;
    if (zi) nodo.zi = zi;
    nodo.flujo = enFlujo;
    return nodo;
  }

  const raiz = recorrer(raizDom);
  return { raiz, svgs, imagenes, base: { w: base.width, h: base.height } };
}
