#!/usr/bin/env node
/**
 * Genera las versiones animadas de Pikobot a partir del SVG del equipo.
 *
 *   node herramientas/animar-pikobot.mjs
 *
 * No redibuja nada: toma public/img/pikobot.svg tal cual y le agrega
 *   - las alas aleteando (giran desde el hombro),
 *   - las tres luces celestes latiendo,
 *   - la pantalla cambiando de expresión con las caras reales del robot
 *     (robot/panel/public/caras/*.svg), incluido el parpadeo.
 *
 * La animación va en CSS dentro del mismo SVG, así funciona como <img> y
 * no necesita JavaScript. Si el teléfono pide menos movimiento, se queda
 * quieto mirando de frente.
 *
 * Salen dos archivos:
 *   pikobot-animado.svg  mira a los lados, parpadea, guiña, sonríe
 *   pikobot-celebra.svg  festeja: aletea rápido y alterna caras felices
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const raiz = (p) => fileURLToPath(new URL(p, import.meta.url));
const IMG = raiz('../public/img/');
const CARAS = raiz('../../robot/panel/public/caras/');

// Guion de expresiones: [cara, segundos]. Los parpadeos son "cerrados" cortos.
const GUIONES = {
  'pikobot-animado': {
    aleteo: 1.6,
    guion: [
      ['enfrente', 2.6], ['cerrados', 0.18], ['enfrente', 1.4],
      ['izquierda', 1.5], ['derecha', 1.5], ['enfrente', 0.8],
      ['arriba', 1.3], ['cerrados', 0.18], ['abierta', 1.4],
      ['guino', 1.2], ['enfrente', 1.2], ['celebracion', 1.8], ['cerrados', 0.18], ['enfrente', 1],
    ],
  },
  'pikobot-celebra': {
    aleteo: 0.7,
    guion: [
      ['celebracion', 1.6], ['abierta', 0.9], ['celebracion', 1.2], ['guino', 0.9],
      ['celebracion', 1.4], ['cerrados', 0.16], ['abierta', 0.9],
    ],
  },
};

const base = await readFile(`${IMG}pikobot.svg`, 'utf8');

async function cara(nombre) {
  const svg = await readFile(`${CARAS}${nombre}.svg`, 'utf8');
  const interior = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  // Todas las caras usan el mismo id de recorte: se renombra para que no choquen.
  return interior.replaceAll('clip0_52_2', `cara-${nombre}-recorte`);
}

function keyframes(nombre, guion, total) {
  // Cambios instantáneos (step-end): cada cuadro mantiene su valor hasta el siguiente.
  const pasos = [];
  let t = 0;
  for (const [c, dur] of guion) {
    pasos.push([(t / total) * 100, c === nombre ? 1 : 0]);
    t += dur;
  }
  pasos.push([100, guion[0][0] === nombre ? 1 : 0]);
  const lineas = [];
  let previo = null;
  for (const [p, v] of pasos) {
    if (v === previo && p !== 100) continue;
    lineas.push(`${+p.toFixed(3)}%{opacity:${v}}`);
    previo = v;
  }
  return `@keyframes ver-${nombre}{${lineas.join('')}}`;
}

for (const [archivo, { aleteo, guion }] of Object.entries(GUIONES)) {
  const total = guion.reduce((s, [, d]) => s + d, 0);
  const usadas = [...new Set(guion.map(([c]) => c))];
  const inicial = guion[0][0];

  let svg = base;

  // 1. Caras: el bloque de la pantalla se reemplaza por una capa por expresión.
  const ini = svg.indexOf('<g clip-path="url(#caraClip)">');
  const fin = svg.lastIndexOf('</svg></g>') + '</svg></g>'.length;
  if (ini < 0 || fin < ini) throw new Error('No encontré la pantalla en pikobot.svg');
  const capas = [];
  for (const c of usadas) {
    capas.push(
      `<svg class="cara cara-${c}" x="122" y="142.0" width="476.0" height="222.2" viewBox="0 0 647 302" overflow="visible">${await cara(c)}</svg>`,
    );
  }
  svg = svg.slice(0, ini) + `<g clip-path="url(#caraClip)">${capas.join('\n')}</g>` + svg.slice(fin);

  // 2. Alas: se envuelven en un grupo que gira desde el hombro.
  svg = svg.replace(/<g transform="rotate\(-24 [^"]+"\>.*?<\/g>/, (m) => `<g class="ala ala-izq">${m}</g>`);
  svg = svg.replace(/<g transform="rotate\(24 [^"]+"\>.*?<\/g>/, (m) => `<g class="ala ala-der">${m}</g>`);

  // 3. Luces: halo y punto de cada una, con su propio desfase.
  const orden = { 187: 1, 360: 2, 533: 3 };
  svg = svg.replace(/<circle cx="(187|360|533)" cy="([\d.]+)" r="30"/g, (m, x) => m.replace('<circle', `<circle class="halo l${orden[x]}"`));
  svg = svg.replace(/<circle cx="(187|360|533)" cy="([\d.]+)" r="17"/g, (m, x) => m.replace('<circle', `<circle class="luz l${orden[x]}"`));

  const estilo = `<style>
.ala{transform-box:view-box;animation:${aleteo}s ease-in-out infinite}
.ala-izq{transform-origin:132px 250px;animation-name:ala-izq}
.ala-der{transform-origin:588px 250px;animation-name:ala-der}
@keyframes ala-izq{0%,100%{transform:rotate(0)}30%{transform:rotate(30deg)}50%{transform:rotate(-6deg)}72%{transform:rotate(20deg)}}
@keyframes ala-der{0%,100%{transform:rotate(0)}30%{transform:rotate(-30deg)}50%{transform:rotate(6deg)}72%{transform:rotate(-20deg)}}
.halo,.luz{animation:latir 1.8s ease-in-out infinite}
.l2{animation-delay:.3s}.l3{animation-delay:.6s}
@keyframes latir{0%,100%{opacity:.55}50%{opacity:1}}
.cara{opacity:0;animation:${total}s step-end infinite}
.cara-${inicial}{opacity:1}
${usadas.map((c) => `.cara-${c}{animation-name:ver-${c}}`).join('\n')}
${usadas.map((c) => keyframes(c, guion, total)).join('\n')}
@media (prefers-reduced-motion:reduce){.ala,.halo,.luz,.cara{animation:none}.cara{opacity:0}.cara-${inicial}{opacity:1}}
</style>`;
  svg = svg.replace(/(<svg[^>]*>)/, `$1\n${estilo}`);

  await writeFile(`${IMG}${archivo}.svg`, svg);
  console.log(`✓ ${archivo}.svg — ${usadas.length} caras, ciclo de ${total.toFixed(1)} s, ${(svg.length / 1024).toFixed(0)} KB`);
}
