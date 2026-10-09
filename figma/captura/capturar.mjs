/**
 * Captura las pantallas REALES de la app para el plugin de Figma.
 *
 *   1. Sirve la exportación web de la app (`expo export --platform web`).
 *   2. La recorre con Chromium a 360×800 (un Android de gama baja típico, el
 *      teléfono para el que está pensada Piko), juega una lección de verdad
 *      para que el progreso, los ejercicios y el resultado tengan datos.
 *   3. De cada pantalla guarda una captura PNG (para la documentación) y el
 *      árbol de nodos que extrae `extraer.js` (para Figma).
 *   4. Infiere el auto layout de cada contenedor (`maquetar.mjs`) y deja todo
 *      en `figma/plugin/datos/captura.json`.
 *
 * Uso (desde figma/captura):
 *   npm install
 *   npm run capturar -- --web <carpeta de la exportación web>
 *
 * Sin `--web`, exporta la app por su cuenta (sin minificar, para poder leer
 * los nombres de los componentes de React).
 */

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from './servidor.mjs';
import { maquetar } from './maquetar.mjs';
import { CATALOGO, PANTALLAS } from './pantallas.mjs';
import { leerTokens } from './tokens.mjs';
import { nombrarAssets } from './assets.mjs';
import { auditar } from './auditar.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const APP = join(RAIZ, 'app');
const SALIDA_DATOS = join(AQUI, '..', 'plugin', 'datos');
const SALIDA_PNG = join(RAIZ, 'docs', 'diseno', 'pantallas');
const ANCHO = 360;
const ALTO = 800;
const BASE_URL = JSON.parse(readFileSync(join(APP, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';

const args = process.argv.slice(2);
const argWeb = args.indexOf('--web');
let carpetaWeb = argWeb >= 0 ? args[argWeb + 1] : null;
const argSemilla = args.indexOf('--semilla');
// Las rondas se arman al azar: con una semilla fija la captura sale siempre igual.
const SEMILLA = argSemilla >= 0 ? Number(args[argSemilla + 1]) : 1;
if (!carpetaWeb) {
  carpetaWeb = join(AQUI, '.web');
  console.log('Exportando la app web sin minificar…');
  execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', carpetaWeb, '--no-minify', '--clear'], {
    cwd: APP,
    stdio: 'inherit',
  });
}


/**
 * Se inyecta en la página: recorre el árbol de fibras ACTUAL de React (desde
 * FiberRoot.current) y devuelve las fibras de un componente, en orden de DOM.
 * La fibra que guarda cada nodo del DOM puede ser la alterna (vieja), con
 * props desactualizados; por eso se baja siempre desde la raíz.
 */
const FIBRAS = `
window.__fibras = (nombre) => {
  const el = document.getElementById('root');
  let k = Object.keys(el).find((k) => k.startsWith('__reactContainer$'));
  let f = el[k];
  while (f && f.tag !== 3) f = f.return;
  const actual = f.stateNode.current;
  const out = [];
  const pila = [actual];
  while (pila.length) {
    const n = pila.pop();
    const t = n.type;
    if (t && typeof t !== 'string' && (t.displayName || t.name) === nombre) out.push(n);
    if (n.sibling) pila.push(n.sibling);
    if (n.child) pila.push(n.child);
  }
  return out;
};`;

const EXTRAER = readFileSync(join(AQUI, 'extraer.js'), 'utf8');
const NOMBRES_CATALOGO = Object.keys(CATALOGO);

const servidor = await servir(carpetaWeb, BASE_URL);
const origen = `http://127.0.0.1:${servidor.address().port}${BASE_URL}`;
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 2 });
pagina.on('pageerror', (e) => console.warn('  ⚠ error en la página:', e.message));

/** Utilidades que se usan desde los pasos de `pantallas.mjs`. */
const app = {
  pagina,
  async esperar(ms = 900) {
    await pagina.waitForTimeout(ms);
  },
  async ir(ruta) {
    await pagina.evaluate(
      ({ base, ruta }) => {
        history.pushState({}, '', base + ruta);
        dispatchEvent(new PopStateEvent('popstate'));
      },
      { base: BASE_URL, ruta },
    );
    await app.esperar(1300);
  },
  async tocar(texto, { exacto = true, n = 0 } = {}) {
    const loc = pagina.getByText(texto, { exact: exacto });
    await loc.nth(n).click();
    await app.esperar(450);
  },
  /** Los props del componente de React montado con ese nombre (el primero). */
  async props(nombre) {
    return pagina.evaluate((nombre) => {
      const f = window.__fibras(nombre)[0];
      if (!f) return null;
      return JSON.parse(JSON.stringify(f.memoizedProps, (k, v) => (typeof v === 'function' || (v && v.$$typeof) ? undefined : v)));
    }, nombre);
  },
  /** El ejercicio en pantalla: tipo, respuesta correcta y fichas. */
  async ejercicio() {
    const op = await app.props('EjercicioOpciones');
    if (op) return { tipo: op.item.type, item: op.item, revelado: op.revelado };
    const bl = await app.props('EjercicioBloques');
    if (bl) return { tipo: 'build', item: bl.item, banco: bl.banco, armado: bl.armado, revelado: bl.revelado };
    return null;
  },
  /**
   * Presiona un componente llamando su `onPress` desde la fibra de React. Es
   * más confiable que un clic por texto: las palabras de las fichas se repiten
   * en el enunciado, en el renglón y en el banco.
   */
  async presionar(componente, texto, { ultimo = false } = {}) {
    const ok = await pagina.evaluate(
      ({ componente, texto, ultimo }) => {
        const hallados = window
          .__fibras(componente)
          .map((f) => f.memoizedProps)
          .filter((p) => (texto === null || p.children === texto) && !p.fantasma && !p.disabled && p.onPress);
        const p = ultimo ? hallados.at(-1) : hallados[0];
        if (!p) return false;
        p.onPress();
        return true;
      },
      { componente, texto, ultimo },
    );
    if (!ok) throw new Error(`no encontré ${componente} «${texto}»`);
    await app.esperar(350);
  },
  /** Responde el ejercicio en pantalla, bien o a propósito mal. */
  async responder({ bien = true, comprobar = true } = {}) {
    const e = await app.ejercicio();
    if (!e) return null;
    if (e.tipo === 'build') {
      let palabras = e.item.target.split(/\s+/);
      if (!bien) palabras = [...palabras].reverse();
      for (const p of palabras) await app.presionar('Bloque', p, { ultimo: true });
    } else {
      const otra = e.item.options.find((o) => o !== e.item.answer);
      await app.presionar('Opcion', bien ? e.item.answer : otra);
    }
    if (comprobar) await app.presionar('Boton', 'Comprobar');
    return e;
  },
  async cerrarCelebraciones() {
    for (let i = 0; i < 12; i++) {
      const hay = await app.props('Cartel');
      if (!hay) return;
      await app.presionar('Boton', null, { ultimo: true });
      await app.esperar(500);
    }
  },
};

/** Ajusta el alto de la ventana para que el scroll principal quepa entero. */
async function desplegar() {
  for (let i = 0; i < 4; i++) {
    const sobra = await pagina.evaluate(() => {
      let max = 0;
      for (const el of document.querySelectorAll('div')) {
        const cs = getComputedStyle(el);
        if (!/(auto|scroll)/.test(cs.overflowY)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 200 || r.height < 200) continue;
        max = Math.max(max, el.scrollHeight - el.clientHeight);
      }
      return max;
    });
    if (sobra <= 1) return;
    const actual = pagina.viewportSize();
    await pagina.setViewportSize({ width: ANCHO, height: Math.ceil(actual.height + sobra) });
    await app.esperar(500);
  }
}

async function capturar(def) {
  await desplegar();
  await app.esperar(def.esperar ?? 700);
  const alto = pagina.viewportSize().height;
  await pagina.screenshot({ path: join(SALIDA_PNG, `${def.id}.png`) });
  const datos = await pagina.evaluate(
    ({ codigo, ancho, catalogo }) => {
      // eslint-disable-next-line no-eval
      eval(codigo);
      // eslint-disable-next-line no-undef
      return extraerPantalla({ ancho, catalogo });
    },
    { codigo: EXTRAER, ancho: ANCHO, catalogo: NOMBRES_CATALOGO },
  );
  // Las imágenes se bajan desde la página: así van exactamente las que usa la app.
  for (const img of Object.values(datos.imagenes)) {
    const r = await pagina.evaluate(async (url) => {
      const res = await fetch(url);
      const buf = new Uint8Array(await res.arrayBuffer());
      let s = '';
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const bmp = await createImageBitmap(new Blob([buf]));
      return { b64: btoa(s), w: bmp.width, h: bmp.height };
    }, img.url);
    Object.assign(img, r);
  }
  await pagina.setViewportSize({ width: ANCHO, height: ALTO });
  await app.esperar(300);
  return { ...datos, alto };
}

mkdirSync(SALIDA_DATOS, { recursive: true });
mkdirSync(SALIDA_PNG, { recursive: true });

await pagina.addInitScript(FIBRAS);
await pagina.addInitScript((semilla) => {
  let t = semilla;
  Math.random = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}, SEMILLA);
// Sin anillos de foco del navegador: en el teléfono no existen.
await pagina.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '*:focus,*:focus-visible{outline:none!important}';
    document.head.appendChild(st);
  });
});
await pagina.goto(`${origen}/`);
await app.esperar(2500);

const svgs = {};
const imagenes = {};
const pantallas = [];

for (const def of PANTALLAS) {
  console.log(`· ${def.id} — ${def.nombre}`);
  try {
    if (def.antes) await def.antes(app);
    if (def.ruta) await app.ir(def.ruta);
    if (def.pasos) await def.pasos(app);
    if (def.ruta || def.pasos) await app.esperar(400);
    const c = await capturar(def);
    // Los SVG y las imágenes se juntan en un solo diccionario para todo el archivo.
    const renombrar = {};
    for (const [id, s] of Object.entries(c.svgs)) {
      let nuevo = Object.keys(svgs).find((k) => svgs[k].xml === s.xml);
      if (!nuevo) {
        nuevo = `s${Object.keys(svgs).length + 1}`;
        svgs[nuevo] = s;
      }
      renombrar[id] = nuevo;
    }
    for (const [id, im] of Object.entries(c.imagenes)) {
      let nuevo = Object.keys(imagenes).find((k) => imagenes[k].url === im.url);
      if (!nuevo) {
        nuevo = `i${Object.keys(imagenes).length + 1}`;
        imagenes[nuevo] = im;
      }
      renombrar[id] = nuevo;
    }
    const raiz = maquetar(c.raiz, { renombrar, ancho: ANCHO, alto: c.alto, catalogo: CATALOGO });
    pantallas.push({
      id: def.id,
      nombre: def.nombre,
      seccion: def.seccion,
      descripcion: def.descripcion,
      ruta: def.ruta ?? null,
      enlaces: def.enlaces ?? {},
      animada: !!def.animada,
      ancho: ANCHO,
      alto: c.alto,
      raiz,
    });
    if (def.despues) await def.despues(app);
  } catch (e) {
    console.error(`  ✗ ${def.id}: ${e.message}`);
    if (def.obligatoria) throw e;
  }
}

await navegador.close();
servidor.close();

const tokens = leerTokens(join(APP, 'src', 'ui', 'tokens.ts'));
const componentes = Object.fromEntries(
  Object.entries(CATALOGO).map(([k, v]) => [k, { nombre: v.nombre, grupo: v.grupo, descripcion: v.descripcion ?? '', fuente: v.fuente ?? '' }]),
);
const salida = {
  generado: new Date().toISOString(),
  dispositivo: { ancho: ANCHO, alto: ALTO },
  tokens,
  componentes,
  pantallas,
  svgs,
  imagenes: Object.fromEntries(Object.entries(imagenes).map(([k, v]) => [k, { b64: v.b64, w: v.w, h: v.h }])),
};
nombrarAssets(salida);
writeFileSync(join(SALIDA_DATOS, 'captura.json'), JSON.stringify(salida));
const nombresColor = Object.fromEntries(Object.entries(tokens.color).map(([k, v]) => [v.toUpperCase(), k]));
writeFileSync(join(SALIDA_DATOS, 'auditoria.json'), JSON.stringify(auditar(salida, nombresColor), null, 1));
console.log(
  `\nListo: ${pantallas.length} pantallas, ${Object.keys(svgs).length} SVG, ${Object.keys(imagenes).length} imágenes → figma/plugin/datos/captura.json`,
);
if (!existsSync(join(AQUI, '..', 'plugin', 'code.js'))) console.log('Falta construir el plugin: npm run plugin');
