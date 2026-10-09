/**
 * Verifica el plugin sin abrir Figma:
 *
 *   1. Carga en Chromium un `figma` falso (mock-figma.js) y el code.js real.
 *   2. Corre la importación completa, como si se tocara «Importar».
 *   3. Dibuja cada pantalla resultante (render.js) y la compara píxel a píxel
 *      con la captura de la app (docs/diseno/pantallas/*.png).
 *
 * Deja en figma/captura/verificar/salida/ un PNG por pantalla con
 * app | plugin | diferencias, y un resumen. Falla si alguna pantalla difiere
 * en más del umbral, o si el plugin tira cualquier error.
 *
 *   node verificar/verificar.mjs [--umbral 3]
 */

import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..', '..');
const PLUGIN = join(RAIZ, 'figma', 'plugin');
const PNG = join(RAIZ, 'docs', 'diseno', 'pantallas');
const SALIDA = join(AQUI, 'salida');
const FUENTES = join(RAIZ, 'app', 'node_modules', '@expo-google-fonts');
const args = process.argv.slice(2);
const UMBRAL = args.includes('--umbral') ? Number(args[args.indexOf('--umbral') + 1]) : 3;

mkdirSync(SALIDA, { recursive: true });

const fuente = (familia, ruta, peso) =>
  `@font-face{font-family:'${familia}';font-weight:${peso};src:url(data:font/ttf;base64,${readFileSync(join(FUENTES, ruta)).toString('base64')})}`;
const estilos = [
  fuente('Fredoka', 'fredoka/500Medium/Fredoka_500Medium.ttf', 500),
  fuente('Fredoka', 'fredoka/600SemiBold/Fredoka_600SemiBold.ttf', 600),
  fuente('Fredoka', 'fredoka/700Bold/Fredoka_700Bold.ttf', 700),
  fuente('Fredoka', 'fredoka/400Regular/Fredoka_400Regular.ttf', 400),
  fuente('Nunito Sans', 'nunito-sans/400Regular/NunitoSans_400Regular.ttf', 400),
  fuente('Nunito Sans', 'nunito-sans/600SemiBold/NunitoSans_600SemiBold.ttf', 600),
  fuente('Nunito Sans', 'nunito-sans/700Bold/NunitoSans_700Bold.ttf', 700),
  fuente('Nunito Sans', 'nunito-sans/500Medium/NunitoSans_500Medium.ttf', 500),
].join('\n');

const html = `<!doctype html><meta charset="utf-8"><style>${estilos}
body{margin:0;background:#fff} #lienzo{position:absolute;left:0;top:0}</style><body><div id="lienzo"></div></body>`;

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
await pagina.route('http://piko.local/**', (r) => r.fulfill({ contentType: 'text/html', body: html }));
await pagina.goto('http://piko.local/verificar.html');
await pagina.evaluate(() => document.fonts.ready);
// Forzar la carga de cada peso antes de medir textos.
await pagina.evaluate(async () => {
  for (const f of ['500 16px Fredoka', '600 16px Fredoka', '700 16px Fredoka', '400 16px Fredoka', '400 16px "Nunito Sans"', '600 16px "Nunito Sans"', '700 16px "Nunito Sans"', '500 16px "Nunito Sans"']) {
    await document.fonts.load(f);
  }
});

await pagina.addScriptTag({ content: readFileSync(join(AQUI, 'render.js'), 'utf8') });
await pagina.addScriptTag({ content: readFileSync(join(AQUI, 'mock-figma.js'), 'utf8') });
await pagina.addScriptTag({ content: readFileSync(join(PLUGIN, 'code.js'), 'utf8') });

const datos = JSON.parse(readFileSync(join(PLUGIN, 'datos', 'captura.json'), 'utf8'));
const ids = datos.pantallas.map((p) => p.id);
const t0 = Date.now();
const resultado = await pagina.evaluate(async (ids) => {
  figma.ui.onmessage({ tipo: 'importar', pantallas: ids, prototipo: true, flujo: true, accesibilidad: true });
  for (let i = 0; i < 1200; i++) {
    const fin = window.__mensajes.find((m) => m.tipo === 'listo' || m.tipo === 'error');
    if (fin) return fin;
    await new Promise((ok) => setTimeout(ok, 100));
  }
  return { tipo: 'error', texto: 'la importación no terminó' };
}, ids);
console.log(`Importación: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
if (resultado.tipo === 'error') {
  console.error('✗ El plugin falló:\n' + resultado.texto);
  process.exit(1);
}
console.log('Resultado:', JSON.stringify(resultado.resultado));

const estructura = await pagina.evaluate(() => {
  const paginas = figma.root.children.map((p) => ({ nombre: p.name, hijos: p.children.length }));
  let instancias = 0;
  let enlaces = 0;
  let al = 0;
  let marcos = 0;
  const contar = (n) => {
    if (n.type === 'INSTANCE') instancias++;
    if (n.reactions && n.reactions.length) enlaces++;
    if (n.type === 'FRAME') {
      marcos++;
      if (n.layoutMode !== 'NONE') al++;
    }
    (n.children || []).forEach(contar);
  };
  Object.values(ESTADO.pantallas).forEach(contar);
  return { paginas, instancias, enlaces, al, marcos };
});
console.log('Páginas:', estructura.paginas.map((p) => `${p.nombre} (${p.hijos})`).join(' · '));
console.log(`En pantallas: ${estructura.instancias} instancias, ${estructura.enlaces} enlaces de prototipo, ${estructura.al}/${estructura.marcos} marcos con auto layout`);

const filas = [];
let peor = 0;
for (const p of datos.pantallas) {
  await pagina.setViewportSize({ width: 360, height: p.alto });
  const png = await pagina.evaluate((id) => {
    const lienzo = document.getElementById('lienzo');
    lienzo.innerHTML = '';
    const f = ESTADO.pantallas[id];
    if (!f) return false;
    const el = window.__pikoRender.dibujar(f, null);
    el.style.position = 'relative';
    lienzo.appendChild(el);
    return true;
  }, p.id);
  if (!png) continue;
  await pagina.waitForTimeout(150);
  const plugin = await pagina.locator('#lienzo > div').screenshot();
  const app = readFileSync(join(PNG, `${p.id}.png`));
  const cmp = await pagina.evaluate(
    async ({ a, b }) => {
      const cargar = (b64) =>
        new Promise((ok) => {
          const i = new Image();
          i.onload = () => ok(i);
          i.src = 'data:image/png;base64,' + b64;
        });
      const [ia, ib] = await Promise.all([cargar(a), cargar(b)]);
      const w = Math.min(ia.width, ib.width);
      const h = Math.min(ia.height, ib.height);
      const c = document.createElement('canvas');
      c.width = w * 3 + 40;
      c.height = h;
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(ia, 0, 0);
      x.drawImage(ib, w + 20, 0);
      const da = x.getImageData(0, 0, w, h).data;
      const db = x.getImageData(w + 20, 0, w, h).data;
      const diff = x.createImageData(w, h);
      let distintos = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
        const malo = d > 48;
        if (malo) distintos++;
        const gris = (da[i] + da[i + 1] + da[i + 2]) / 3;
        diff.data[i] = malo ? 230 : gris * 0.3 + 178;
        diff.data[i + 1] = malo ? 30 : gris * 0.3 + 178;
        diff.data[i + 2] = malo ? 60 : gris * 0.3 + 178;
        diff.data[i + 3] = 255;
      }
      x.putImageData(diff, (w + 20) * 2, 0);
      return { porcentaje: (100 * distintos) / (w * h), png: c.toDataURL('image/png').split(',')[1], w, h, ha: ia.height, hb: ib.height };
    },
    { a: app.toString('base64'), b: plugin.toString('base64') },
  );
  writeFileSync(join(SALIDA, `${p.id}.png`), Buffer.from(cmp.png, 'base64'));
  const umbral = p.animada ? UMBRAL * 4 : UMBRAL;
  if (cmp.porcentaje > umbral) peor = Math.max(peor, cmp.porcentaje);
  const marca = cmp.porcentaje <= umbral ? '✓' : '✗';
  filas.push({ id: p.id, nombre: p.nombre, diferencia: Math.round(cmp.porcentaje * 100) / 100, alto: [cmp.ha / 2, cmp.hb / 2] });
  console.log(`${marca} ${p.id.padEnd(20)} ${cmp.porcentaje.toFixed(2).padStart(6)} % de píxeles distintos  (alto app ${cmp.ha / 2} · plugin ${cmp.hb / 2})${p.animada ? '  · animada' : ''}`);
}

// Las otras páginas, para mirarlas a ojo.
for (const nombre of ['🎨 Fundamentos', '🧩 Componentes', '🔀 Flujo UX', '📦 Assets', '♿ Accesibilidad']) {
  const tam = await pagina.evaluate((nombre) => {
    const p = figma.root.children.find((x) => x.name === nombre);
    const lienzo = document.getElementById('lienzo');
    lienzo.innerHTML = '';
    let w = 0;
    let h = 0;
    const caja = document.createElement('div');
    caja.style.position = 'relative';
    caja.style.background = '#E9E9E9';
    for (const n of p.children) {
      const el = window.__pikoRender.dibujar(n, { layoutMode: 'NONE', width: 0, height: 0 });
      caja.appendChild(el);
    }
    lienzo.appendChild(caja);
    for (const el of caja.children) {
      const r = el.getBoundingClientRect();
      w = Math.max(w, r.right);
      h = Math.max(h, r.bottom);
    }
    caja.style.width = w + 'px';
    caja.style.height = h + 'px';
    return { w: Math.ceil(w), h: Math.ceil(h) };
  }, nombre);
  await pagina.setViewportSize({ width: Math.min(tam.w, 8000), height: Math.min(tam.h, 16000) });
  await pagina.waitForTimeout(200);
  const archivo = join(SALIDA, `pagina-${nombre.split(' ').slice(1).join('-').toLowerCase()}.png`);
  await pagina.screenshot({ path: archivo, scale: 'css', clip: { x: 0, y: 0, width: Math.min(tam.w, 8000), height: Math.min(tam.h, 16000) } });
  console.log(`  página ${nombre}: ${tam.w}×${tam.h}`);
}

await navegador.close();
writeFileSync(join(SALIDA, 'resumen.json'), JSON.stringify({ resultado: resultado.resultado, estructura, pantallas: filas, errores }, null, 1));
if (errores.length) console.error('Errores en la página:\n' + errores.join('\n'));
if (errores.length || peor > 0) process.exit(1);
console.log(`\nTodo dentro del umbral (${UMBRAL} %).`);
