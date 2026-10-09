/**
 * Un `figma` de mentira para correr el plugin FUERA de Figma, dentro de una
 * página de Chromium. Implementa lo que usa `plugin.js` y guarda el árbol de
 * nodos; `render.js` lo dibuja con HTML (auto layout → flexbox) para poder
 * compararlo con la app.
 *
 * Es estricto donde Figma es estricto: llamar a una propiedad o método que no
 * existe en la API real, poner FILL fuera de un auto layout o HUG en algo sin
 * auto layout tira error, igual que en Figma.
 */
(function () {
  let siguienteId = 1;
  const medidor = document.createElement('div');
  medidor.style.cssText = 'position:absolute;left:-99999px;top:0;white-space:pre;visibility:hidden';
  document.body.appendChild(medidor);

  const PESO = { Thin: 100, ExtraLight: 200, 'Extra Light': 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, 'Semi Bold': 600, Bold: 700, ExtraBold: 800, Black: 900 };
  const FUENTES = [];
  ['Fredoka', 'Nunito Sans', 'Inter'].forEach((family) =>
    ['Regular', 'Medium', 'SemiBold', 'Bold'].forEach((style) => FUENTES.push({ fontName: { family, style } })),
  );

  class Nodo {
    constructor(type) {
      this.id = `${siguienteId++}:1`;
      this.type = type;
      this.name = type;
      this.parent = null;
      this.x = 0;
      this.y = 0;
      this.width = 100;
      this.height = 100;
      this.opacity = 1;
      this.visible = true;
      this.rotation = 0;
      this.relativeTransform = null;
      this.fills = [];
      this.strokes = [];
      this.strokeWeight = 1;
      this.strokeAlign = 'INSIDE';
      this.dashPattern = [];
      this.constraints = { horizontal: 'MIN', vertical: 'MIN' };
      this.layoutPositioning = 'AUTO';
      this._sizing = { h: 'FIXED', v: 'FIXED' };
      this._plugin = {};
      this.exportSettings = [];
      this.reactions = [];
      this.removed = false;
    }
    get children() {
      return this._hijos || (this._hijos = []);
    }
    appendChild(n) {
      if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1);
      n.parent = this;
      this.children.push(n);
      // Al entrar a un auto layout, el hijo queda FIXED salvo que diga otra cosa.
    }
    remove() {
      if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = null;
      this.removed = true;
    }
    resize(w, h) {
      if (!(w > 0) || !(h > 0)) throw new Error(`resize(${w}, ${h}) inválido en ${this.name}`);
      const fx = w / this.width;
      const fy = h / this.height;
      if (this._hijos) {
        const libre = !this.layoutMode || this.layoutMode === 'NONE';
        // Como en Figma: los hijos ABSOLUTE de un auto layout también siguen sus restricciones.
        for (const c of this._hijos) {
          if (libre || c.layoutPositioning === 'ABSOLUTE') aplicarRestriccion(c, this.width, this.height, w, h, fx, fy);
        }
      }
      this.width = w;
      this.height = h;
      if (this.layoutMode && this.layoutMode !== 'NONE') {
        this._sizing = { h: this._sizing.h === 'HUG' ? 'FIXED' : this._sizing.h, v: this._sizing.v === 'HUG' ? 'FIXED' : this._sizing.v };
      }
      if (this.type === 'TEXT') {
        if (this.textAutoResize === 'WIDTH_AND_HEIGHT') this.textAutoResize = 'NONE';
        else this._medir();
      }
    }
    rescale(f) {
      escalar(this, f);
    }
    setPluginData(k, v) {
      this._plugin[k] = v;
    }
    getPluginData(k) {
      return this._plugin[k] || '';
    }
    findAll(fn) {
      const out = [];
      const ir = (n) => {
        for (const c of n.children || []) {
          if (!fn || fn(c)) out.push(c);
          ir(c);
        }
      };
      ir(this);
      return out;
    }
    findOne(fn) {
      return this.findAll(fn)[0] || null;
    }
    async setReactionsAsync(r) {
      this.reactions = r;
    }
    setBoundVariable(campo, v) {
      if (!v || !v.id) throw new Error('variable inválida');
      (this.boundVariables || (this.boundVariables = {}))[campo] = v.id;
    }
    get layoutSizingHorizontal() {
      return this._sizing.h;
    }
    set layoutSizingHorizontal(v) {
      validarSizing(this, v, 'h');
      this._sizing.h = v;
    }
    get layoutSizingVertical() {
      return this._sizing.v;
    }
    set layoutSizingVertical(v) {
      validarSizing(this, v, 'v');
      this._sizing.v = v;
    }
    set cornerRadius(r) {
      this.topLeftRadius = this.topRightRadius = this.bottomLeftRadius = this.bottomRightRadius = r;
    }
    get cornerRadius() {
      return this.topLeftRadius || 0;
    }
    set strokeWeight(w) {
      this._sw = w;
      this.strokeTopWeight = this.strokeRightWeight = this.strokeBottomWeight = this.strokeLeftWeight = w;
    }
    get strokeWeight() {
      return this._sw;
    }
  }

  function validarSizing(n, v, eje) {
    const padreAL = n.parent && n.parent.layoutMode && n.parent.layoutMode !== 'NONE' && n.layoutPositioning !== 'ABSOLUTE';
    if (v === 'FILL' && !padreAL) throw new Error(`FILL en ${n.name} fuera de un auto layout`);
    const al = n.layoutMode && n.layoutMode !== 'NONE';
    if (v === 'HUG' && !(al || n.type === 'TEXT')) throw new Error(`HUG en ${n.name} sin auto layout`);
    if (n.type === 'TEXT' && eje === 'h' && v === 'HUG') n.textAutoResize = 'WIDTH_AND_HEIGHT';
    if (n.type === 'TEXT' && eje === 'v' && v === 'HUG' && n.textAutoResize === 'NONE') n.textAutoResize = 'HEIGHT';
    if (n.type === 'TEXT' && v === 'FIXED' && eje === 'v') n.textAutoResize = 'NONE';
  }

  function aplicarRestriccion(c, w0, h0, w1, h1, fx, fy) {
    const k = c.constraints || {};
    if (k.horizontal === 'SCALE') {
      c.x *= fx;
      if (c.type === 'TEXT') c.width *= fx;
      else c.resize(Math.max(0.01, c.width * fx), c.height);
    } else if (k.horizontal === 'MAX') c.x += w1 - w0;
    else if (k.horizontal === 'STRETCH') c.resize(Math.max(0.01, c.width + w1 - w0), c.height);
    if (k.vertical === 'SCALE') {
      c.y *= fy;
      if (c.type === 'TEXT') c.height *= fy;
      else c.resize(c.width, Math.max(0.01, c.height * fy));
    } else if (k.vertical === 'MAX') c.y += h1 - h0;
    else if (k.vertical === 'STRETCH') c.resize(c.width, Math.max(0.01, c.height + h1 - h0));
  }

  function escalar(n, f) {
    n.width *= f;
    n.height *= f;
    for (const k of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing', 'counterAxisSpacing', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'fontSize']) {
      if (typeof n[k] === 'number') n[k] *= f;
    }
    if (n.lineHeight && n.lineHeight.unit === 'PIXELS') n.lineHeight = { unit: 'PIXELS', value: n.lineHeight.value * f };
    if (n._rangos) n._rangos.forEach((r) => {
      r.tam *= f;
      if (r.ls) r.ls *= f;
    });
    for (const c of n._hijos || []) {
      c.x *= f;
      c.y *= f;
      escalar(c, f);
    }
  }

  class Marco extends Nodo {
    constructor(type = 'FRAME') {
      super(type);
      this.layoutMode = 'NONE';
      this.clipsContent = true;
      this.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      this.paddingTop = this.paddingRight = this.paddingBottom = this.paddingLeft = 0;
      this.itemSpacing = 0;
      this.counterAxisSpacing = 0;
      this.layoutWrap = 'NO_WRAP';
      this.primaryAxisAlignItems = 'MIN';
      this.counterAxisAlignItems = 'MIN';
      this.topLeftRadius = this.topRightRadius = this.bottomLeftRadius = this.bottomRightRadius = 0;
    }
    set primaryAxisSizingMode(v) {
      const eje = this.layoutMode === 'HORIZONTAL' ? 'h' : 'v';
      this._sizing[eje] = v === 'AUTO' ? 'HUG' : 'FIXED';
    }
    get primaryAxisSizingMode() {
      return this._sizing[this.layoutMode === 'HORIZONTAL' ? 'h' : 'v'] === 'HUG' ? 'AUTO' : 'FIXED';
    }
    set counterAxisSizingMode(v) {
      const eje = this.layoutMode === 'HORIZONTAL' ? 'v' : 'h';
      this._sizing[eje] = v === 'AUTO' ? 'HUG' : 'FIXED';
    }
    get counterAxisSizingMode() {
      return this._sizing[this.layoutMode === 'HORIZONTAL' ? 'v' : 'h'] === 'HUG' ? 'AUTO' : 'FIXED';
    }
    createInstance() {
      if (this.type !== 'COMPONENT') throw new Error('createInstance sólo en componentes');
      const inst = clonar(this);
      inst.type = 'INSTANCE';
      inst.mainComponent = this;
      return inst;
    }
    swapComponent(main) {
      if (this.type !== 'INSTANCE') throw new Error('swapComponent sólo en instancias');
      if (!main || main.type !== 'COMPONENT') throw new Error('swapComponent espera un componente');
      const nuevo = clonar(main);
      this._hijos = nuevo._hijos;
      this._hijos.forEach((h) => (h.parent = this));
      for (const k of ['layoutMode', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing', 'counterAxisSpacing', 'primaryAxisAlignItems', 'counterAxisAlignItems', 'layoutWrap', 'fills', 'strokes', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight', 'clipsContent', '_svg']) {
        this[k] = nuevo[k];
      }
      const w = this.width;
      const h = this.height;
      this.width = main.width;
      this.height = main.height;
      if (Math.abs(w - main.width) > 0.01 || Math.abs(h - main.height) > 0.01) this.resize(w, h);
      this.mainComponent = main;
    }
    detachInstance() {
      this.type = 'FRAME';
      return this;
    }
  }

  function clonar(n) {
    const c = Object.create(Object.getPrototypeOf(n));
    for (const k of Object.keys(n)) {
      if (k === 'parent' || k === '_hijos') continue;
      const v = n[k];
      if (k === 'mainComponent') c[k] = v;
      else c[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
    }
    c.id = `${siguienteId++}:1`;
    c.parent = null;
    c._hijos = [];
    c._svg = n._svg;
    c._imagen = n._imagen;
    for (const h of n._hijos || []) {
      const hh = clonar(h);
      hh.parent = c;
      c._hijos.push(hh);
    }
    return c;
  }

  class Texto extends Nodo {
    constructor() {
      super('TEXT');
      this._chars = '';
      this._rangos = [];
      this.fontName = null;
      this.fontSize = 12;
      this.textAutoResize = 'WIDTH_AND_HEIGHT';
      this.lineHeight = { unit: 'AUTO' };
      this.letterSpacing = { unit: 'PIXELS', value: 0 };
      this.textCase = 'ORIGINAL';
      this.textDecoration = 'NONE';
      this.textAlignHorizontal = 'LEFT';
      this.textAlignVertical = 'TOP';
      this.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    }
    get characters() {
      return this._chars;
    }
    set characters(v) {
      if (!this.fontName || !cargadas.has(clave(this.fontName))) throw new Error(`fuente no cargada para ${this.name}`);
      const base = this._rangos[0] || this._rangoBase();
      this._chars = v;
      this._rangos = [{ ...base, i: 0, f: v.length }];
      this._medir();
    }
    _rangoBase() {
      return { fuente: this.fontName, tam: this.fontSize, fills: this.fills, ls: this.letterSpacing.value, caso: this.textCase, deco: this.textDecoration };
    }
    _set(i, f, k, v) {
      if (f <= i) return;
      const nuevos = [];
      for (const r of this._rangos) {
        if (r.f <= i || r.i >= f) {
          nuevos.push(r);
          continue;
        }
        if (r.i < i) nuevos.push({ ...r, f: i });
        nuevos.push({ ...r, i: Math.max(i, r.i), f: Math.min(f, r.f), [k]: v });
        if (r.f > f) nuevos.push({ ...r, i: f });
      }
      this._rangos = nuevos;
      this._medir();
    }
    setRangeFontName(i, f, v) {
      if (!cargadas.has(clave(v))) throw new Error('fuente no cargada: ' + clave(v));
      this._set(i, f, 'fuente', v);
    }
    setRangeFontSize(i, f, v) {
      this._set(i, f, 'tam', v);
    }
    setRangeFills(i, f, v) {
      this._set(i, f, 'fills', v);
    }
    setRangeLetterSpacing(i, f, v) {
      this._set(i, f, 'ls', v.value);
    }
    setRangeTextCase(i, f, v) {
      this._set(i, f, 'caso', v);
    }
    setRangeTextDecoration(i, f, v) {
      this._set(i, f, 'deco', v);
    }
    async setTextStyleIdAsync(id) {
      this.textStyleId = id;
    }
    set fontName(v) {
      this._fn = v;
      if (this._rangos) this._rangos.forEach((r) => (r.fuente = v));
    }
    get fontName() {
      return this._fn;
    }
    set fontSize(v) {
      this._fs = v;
      if (this._rangos) this._rangos.forEach((r) => (r.tam = v));
      if (this._medir) this._medir();
    }
    get fontSize() {
      return this._fs;
    }
    set fills(v) {
      this._fills = v;
      if (this._rangos) this._rangos.forEach((r) => (r.fills = v));
    }
    get fills() {
      return this._fills;
    }
    set lineHeight(v) {
      this._lh = v;
      if (this._medir) this._medir();
    }
    get lineHeight() {
      return this._lh;
    }
    set textAutoResize(v) {
      this._tar = v;
      if (this._sizing) {
        this._sizing.h = v === 'WIDTH_AND_HEIGHT' ? 'HUG' : this._sizing.h === 'HUG' ? 'FIXED' : this._sizing.h;
        this._sizing.v = v === 'NONE' ? 'FIXED' : 'HUG';
      }
      if (this._medir) this._medir();
    }
    get textAutoResize() {
      return this._tar;
    }
    _medir() {
      if (!this._chars || !this._rangos) return;
      const el = window.__pikoRender.textoDom(this, this._tar === 'WIDTH_AND_HEIGHT' ? null : this.width);
      medidor.innerHTML = '';
      medidor.appendChild(el);
      const r = el.getBoundingClientRect();
      if (this._tar === 'WIDTH_AND_HEIGHT') {
        this.width = r.width;
        this.height = r.height;
      } else if (this._tar === 'HEIGHT') this.height = r.height;
    }
  }

  const cargadas = new Set();
  const clave = (f) => `${f.family}|${f.style}`;

  const estilos = [];
  const colecciones = [];
  const variables = [];
  let paginaActual = null;

  class Pagina extends Nodo {
    constructor() {
      super('PAGE');
      this.flowStartingPoints = [];
    }
    async loadAsync() {}
  }

  const raiz = { type: 'DOCUMENT', children: [] };
  const primera = new Pagina();
  primera.name = 'Page 1';
  raiz.children.push(primera);
  paginaActual = primera;

  const mensajes = [];

  window.figma = {
    root: raiz,
    get currentPage() {
      return paginaActual;
    },
    async setCurrentPageAsync(p) {
      paginaActual = p;
    },
    createPage() {
      const p = new Pagina();
      raiz.children.push(p);
      return p;
    },
    createFrame() {
      const f = new Marco();
      paginaActual.appendChild(f);
      return f;
    },
    createComponent() {
      const f = new Marco('COMPONENT');
      paginaActual.appendChild(f);
      return f;
    },
    createComponentFromNode(n) {
      if (n.type !== 'FRAME') throw new Error('createComponentFromNode espera un FRAME, llegó ' + n.type);
      n.type = 'COMPONENT';
      return n;
    },
    combineAsVariants(comps, padre) {
      const nombres = new Set(comps.map((c) => c.name));
      if (nombres.size !== comps.length) throw new Error('variantes con nombre repetido: ' + comps.map((c) => c.name).join(' | '));
      const claves = comps.map((c) => c.name.split(', ').map((p) => p.split('=')[0]).join(','));
      if (new Set(claves).size > 1) throw new Error('propiedades distintas entre variantes');
      const set = new Marco('COMPONENT_SET');
      comps.forEach((c) => set.appendChild(c));
      padre.appendChild(set);
      return set;
    },
    createText() {
      const t = new Texto();
      paginaActual.appendChild(t);
      return t;
    },
    createRectangle() {
      const r = new Nodo('RECTANGLE');
      r.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
      r.topLeftRadius = r.topRightRadius = r.bottomLeftRadius = r.bottomRightRadius = 0;
      paginaActual.appendChild(r);
      return r;
    },
    createVector() {
      const v = new Nodo('VECTOR');
      v.vectorPaths = [];
      v.setVectorNetworkAsync = async (red) => {
        v.vectorNetwork = red;
      };
      paginaActual.appendChild(v);
      return v;
    },
    createNodeFromSvg(xml) {
      const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
      if (doc.querySelector('parsererror')) throw new Error('SVG inválido');
      const s = doc.documentElement;
      const f = new Marco();
      f.fills = [];
      f.width = Number(s.getAttribute('width'));
      f.height = Number(s.getAttribute('height'));
      f._svg = xml;
      paginaActual.appendChild(f);
      return f;
    },
    createImage(bytes) {
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const hash = 'img' + siguienteId++;
      (window.__imagenes || (window.__imagenes = {}))[hash] = 'data:image/png;base64,' + btoa(s);
      return { hash };
    },
    base64Decode(b64) {
      const s = atob(b64);
      const out = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
      return out;
    },
    async listAvailableFontsAsync() {
      return FUENTES;
    },
    async loadFontAsync(f) {
      if (!FUENTES.some((x) => clave(x.fontName) === clave(f))) throw new Error('fuente inexistente ' + clave(f));
      cargadas.add(clave(f));
    },
    async getLocalTextStylesAsync() {
      return estilos;
    },
    createTextStyle() {
      const s = { id: 'S:' + siguienteId++, name: '', type: 'TEXT' };
      estilos.push(s);
      return s;
    },
    variables: {
      async getLocalVariableCollectionsAsync() {
        return colecciones;
      },
      createVariableCollection(name) {
        const c = { id: 'VC:' + siguienteId++, name, modes: [{ modeId: 'm1', name: 'Mode 1' }], renameMode() {} };
        colecciones.push(c);
        return c;
      },
      async getLocalVariablesAsync(tipo) {
        return variables.filter((v) => v.resolvedType === tipo);
      },
      createVariable(name, col, tipo) {
        if (typeof col !== 'object') throw new Error('createVariable espera la colección');
        const v = { id: 'V:' + siguienteId++, name, variableCollectionId: col.id, resolvedType: tipo, valores: {}, setValueForMode(m, x) { this.valores[m] = x; } };
        variables.push(v);
        return v;
      },
      setBoundVariableForPaint(p, campo, v) {
        return { ...p, boundVariables: { [campo]: { type: 'VARIABLE_ALIAS', id: v.id } } };
      },
    },
    ui: {
      postMessage(m) {
        mensajes.push(m);
      },
      onmessage: null,
    },
    viewport: { scrollAndZoomIntoView() {} },
    notify(t) {
      mensajes.push({ tipo: 'notify', texto: t });
    },
    showUI() {},
    closePlugin() {},
  };
  window.__html__ = '';
  window.__mensajes = mensajes;
})();
