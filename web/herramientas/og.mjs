/*
 * Genera las imágenes para compartir (Open Graph, 1200 × 630) de cada página
 * del sitio en web/assets/og/<página>.png.
 *
 *   npx -y -p playwright-core node web/herramientas/og.mjs
 *
 * Necesita un Chromium (CHROMIUM=/ruta/al/chrome si no lo encuentra) y las
 * dependencias de la app instaladas (cd app && npm ci): usa las tipografías de
 * la app para no depender de internet. Se corre a mano cuando cambia el texto
 * de una página; las imágenes quedan en el repositorio.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(AQUI, '..');
const FUENTES = path.resolve(WEB, '..', 'app', 'node_modules', '@expo-google-fonts');
const SALIDA = path.join(WEB, 'assets', 'og');

const PAGINAS = [
  { id: 'inicio', etiqueta: 'Hackathon Nicaragua 2026', titulo: 'Salvemos nuestras lenguas haciéndolas divertidas de aprender', bajada: 'Miskito, mayangna, rama, garífuna e inglés en escuelas rurales. Sin internet.', ruta: '', color: '#97C137' },
  { id: 'diccionario', etiqueta: 'Diccionario', titulo: 'Miskitu ↔ español', bajada: '{entradas} palabras y frases, cada una con su fuente: hablantes de Raiti y diccionarios publicados.', ruta: 'diccionario/', color: '#60C5FA' },
  { id: 'probar', etiqueta: 'Probar Piko', titulo: 'Practicá ahora, sin instalar nada', bajada: 'La misma app del aula, abierta en el navegador.', ruta: 'probar/', color: '#E8A429' },
  { id: 'docentes', etiqueta: 'Para docentes', titulo: 'Una clase con Piko, sin internet', bajada: 'Paso a paso, y el miskito en 10 ideas para acompañarla.', ruta: 'docentes/', color: '#E97927' },
  { id: 'aporta', etiqueta: 'Aportá tu lengua', titulo: 'Piko aprende de quienes hablan', bajada: '¿Hablás miskito, mayangna, rama o garífuna? Con un teléfono alcanza.', ruta: 'aporta/', color: '#61A66B' },
];

const fuente = (familia, archivo) =>
  `url(data:font/ttf;base64,${fs.readFileSync(path.join(FUENTES, familia, archivo)).toString('base64')})`;
const svg = (nombre) =>
  `data:image/svg+xml;base64,${fs.readFileSync(path.join(WEB, 'assets', 'img', nombre)).toString('base64')}`;
const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function plantilla(p) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Fredoka;font-weight:600;src:${fuente('fredoka', '600SemiBold/Fredoka_600SemiBold.ttf')}}
@font-face{font-family:Nunito;font-weight:400;src:${fuente('nunito-sans', '400Regular/NunitoSans_400Regular.ttf')}}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#F7F0E4;font-family:Nunito,sans-serif;color:#16241D;position:relative}
.franja{position:absolute;inset:auto 0 0 0;height:96px;background:#0F5D3D;display:flex;align-items:center;padding:0 72px;color:#F7F0E4;font-size:28px}
.franja b{font-family:Fredoka;font-weight:600;color:#97C137}
.circulo{position:absolute;right:-120px;top:-150px;width:640px;height:640px;border-radius:50%;background:${p.color};opacity:.28}
.texto{position:absolute;left:72px;top:64px;width:720px}
.marca{height:70px;margin-bottom:34px}
.etiqueta{font-family:Fredoka;font-weight:600;font-size:24px;letter-spacing:.14em;text-transform:uppercase;color:#197249;display:flex;align-items:center;gap:14px;margin-bottom:16px}
.etiqueta:before{content:"";width:40px;height:5px;border-radius:3px;background:${p.color}}
h1{font-family:Fredoka;font-weight:600;font-size:${p.titulo.length > 40 ? 58 : 70}px;line-height:1.05;color:#0F5D3D;letter-spacing:-.01em}
p{font-size:28px;line-height:1.35;color:#33453B;margin-top:22px}
.piko{position:absolute;right:86px;bottom:70px;height:430px;filter:drop-shadow(0 22px 24px rgba(10,69,48,.25))}
</style></head><body>
<div class="circulo"></div>
<div class="texto">
  <img class="marca" src="${svg('marca.svg')}">
  <div class="etiqueta">${esc(p.etiqueta)}</div>
  <h1>${esc(p.titulo)}</h1>
  <p>${esc(p.bajada)}</p>
</div>
<img class="piko" src="${svg('piko.svg')}">
<div class="franja"><b>piko.mugiware.com</b>/${esc(p.ruta)}</div>
</body></html>`;
}

const datos = JSON.parse(fs.readFileSync(path.join(WEB, 'datos', 'estado.json'), 'utf8'));
const miq = datos.lenguas.find((l) => l.codigo === 'miq');

fs.mkdirSync(SALIDA, { recursive: true });
const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const pagina = await navegador.newPage({ viewport: { width: 1200, height: 630 } });
for (const p of PAGINAS) {
  const conDatos = { ...p, bajada: p.bajada.replace('{entradas}', String(miq?.entradas ?? '')) };
  await pagina.setContent(plantilla(conDatos), { waitUntil: 'load' });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.screenshot({ path: path.join(SALIDA, `${p.id}.png`) });
  console.log(`  ✓ assets/og/${p.id}.png`);
}
await navegador.close();
