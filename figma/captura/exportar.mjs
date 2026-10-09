/**
 * Kit de assets para desarrollo y material para la documentación:
 *
 *   docs/diseno/assets/svg/*.svg          cada ilustración e ícono, tal cual
 *   docs/diseno/assets/png/*.png (@2x @3x) los mismos, rasterizados
 *   docs/diseno/assets/marca/              logo, Piko y el ícono de la app
 *   docs/diseno/assets/manifiesto.json     nombre, archivo, tamaño y dónde se usa
 *   docs/diseno/componentes/*.png          un recorte por variante de componente
 *
 * Todo sale de la captura (`figma/plugin/datos/captura.json`).
 */

import { chromium } from 'playwright';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const DOCS = join(RAIZ, 'docs', 'diseno');
const ASSETS = join(DOCS, 'assets');
const datos = JSON.parse(readFileSync(join(AQUI, '..', 'plugin', 'datos', 'captura.json'), 'utf8'));

rmSync(join(ASSETS, 'svg'), { recursive: true, force: true });
rmSync(join(ASSETS, 'png'), { recursive: true, force: true });
rmSync(join(DOCS, 'componentes'), { recursive: true, force: true });
for (const d of ['svg', 'png', 'marca']) mkdirSync(join(ASSETS, d), { recursive: true });
mkdirSync(join(DOCS, 'componentes'), { recursive: true });

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Dónde aparece cada asset.
const usos = {};
const caminar = (n, pantalla) => {
  const id = n.svg ?? n.img;
  if (id) (usos[id] ??= new Set()).add(pantalla);
  (n.hijos ?? []).forEach((h) => caminar(h, pantalla));
};
datos.pantallas.forEach((p) => caminar(p.raiz, p.nombre));

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
const manifiesto = [];

async function rasterizar(svg, w, h, archivo) {
  for (const [k, sufijo] of [
    [1, ''],
    [2, '@2x'],
    [3, '@3x'],
  ]) {
    await pagina.setViewportSize({ width: Math.ceil(w * k), height: Math.ceil(h * k) });
    await pagina.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg
        .replace(/width="[^"]*"/, `width="${w * k}"`)
        .replace(/height="[^"]*"/, `height="${h * k}"`)}`,
    );
    await pagina.locator('svg').first().screenshot({ path: join(ASSETS, 'png', `${archivo}${sufijo}.png`), omitBackground: true });
  }
}

for (const [id, s] of Object.entries(datos.svgs)) {
  const archivo = s.archivo || slug(s.nombre || id);
  writeFileSync(join(ASSETS, 'svg', `${archivo}.svg`), s.xml);
  await rasterizar(s.xml, s.w, s.h, archivo);
  manifiesto.push({ nombre: s.nombre, archivo: `svg/${archivo}.svg`, png: `png/${archivo}.png`, ancho: s.w, alto: s.h, usos: [...(usos[id] ?? [])] });
}
for (const [id, im] of Object.entries(datos.imagenes)) {
  const archivo = im.archivo || slug(im.nombre || id);
  writeFileSync(join(ASSETS, 'png', `${archivo}.png`), Buffer.from(im.b64, 'base64'));
  manifiesto.push({ nombre: im.nombre, archivo: null, png: `png/${archivo}.png`, ancho: im.w, alto: im.h, usos: [...(usos[id] ?? [])] });
}

// La marca: los originales del repositorio.
const APP = join(RAIZ, 'app', 'assets');
for (const [origen, destino] of [
  ['vector/marca.svg', 'marca.svg'],
  ['vector/piko.svg', 'piko.svg'],
  ['icon.png', 'icono-app-1024.png'],
  ['splash-icon.png', 'splash.png'],
  ['android-icon-foreground.png', 'android-icono-frente.png'],
  ['android-icon-background.png', 'android-icono-fondo.png'],
  ['android-icon-monochrome.png', 'android-icono-monocromo.png'],
]) {
  copyFileSync(join(APP, origen), join(ASSETS, 'marca', destino));
}
const marca = readFileSync(join(APP, 'vector', 'marca.svg'), 'utf8');
const vb = marca.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
if (vb) {
  const [w, h] = [Number(vb[1]) / 4, Number(vb[2]) / 4];
  const conTam = marca.replace('<svg ', `<svg width="${w}" height="${h}" `);
  for (const [k, sufijo] of [
    [1, ''],
    [2, '@2x'],
    [3, '@3x'],
  ]) {
    await pagina.setViewportSize({ width: Math.ceil(w * k), height: Math.ceil(h * k) });
    await pagina.setContent(`<style>html,body{margin:0}svg{display:block}</style>${conTam.replace(`width="${w}" height="${h}"`, `width="${w * k}" height="${h * k}"`)}`);
    await pagina.locator('svg').first().screenshot({ path: join(ASSETS, 'marca', `marca${sufijo}.png`), omitBackground: true });
  }
}

writeFileSync(join(ASSETS, 'manifiesto.json'), JSON.stringify(manifiesto, null, 1));

// Recortes de componentes: la primera aparición de cada variante, a 2x.
const vistos = new Map();
for (const p of datos.pantallas) {
  const ir = (n, ox, oy) => {
    const x = ox + n.x;
    const y = oy + n.y;
    if (n.comp && !vistos.has(n.comp.clave)) vistos.set(n.comp.clave, { pantalla: p.id, x, y, w: n.w, h: n.h, comp: n.comp });
    (n.hijos ?? []).forEach((h) => ir(h, x, y));
  };
  ir(p.raiz, 0, 0);
}
const recortes = [];
for (const [, v] of vistos) {
  const png = readFileSync(join(DOCS, 'pantallas', `${v.pantalla}.png`)).toString('base64');
  const margen = 6;
  const datosPng = await pagina.evaluate(
    async ({ png, v, margen }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + png;
      await img.decode();
      const c = document.createElement('canvas');
      const x = Math.max(0, (v.x - margen) * 2);
      const y = Math.max(0, (v.y - margen) * 2);
      c.width = Math.min(img.width - x, (v.w + margen * 2) * 2);
      c.height = Math.min(img.height - y, (v.h + margen * 2) * 2);
      c.getContext('2d').drawImage(img, x, y, c.width, c.height, 0, 0, c.width, c.height);
      return c.toDataURL('image/png').split(',')[1];
    },
    { png, v, margen },
  );
  const variante = Object.entries(v.comp.variante)
    .map(([k, val]) => `${k}-${val}`)
    .join('-');
  const archivo = slug(`${v.comp.id}-${variante || 'base'}`);
  writeFileSync(join(DOCS, 'componentes', `${archivo}.png`), Buffer.from(datosPng, 'base64'));
  recortes.push({ id: v.comp.id, nombre: v.comp.nombre, variante: v.comp.variante, archivo: `componentes/${archivo}.png`, w: v.w, h: v.h, pantalla: v.pantalla });
}
writeFileSync(join(DOCS, 'componentes', 'indice.json'), JSON.stringify(recortes, null, 1));

await navegador.close();
console.log(`Assets: ${manifiesto.length} (+ marca) · recortes de componentes: ${recortes.length}`);
