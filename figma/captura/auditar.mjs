/**
 * Chequeo de accesibilidad automático sobre la captura:
 *
 *   - Contraste (WCAG 2.2, 1.4.3 / 1.4.6) de cada texto contra el fondo que
 *     tiene detrás, componiendo los fondos semitransparentes de los ancestros.
 *   - Tamaño de los objetivos táctiles (WCAG 2.5.8 pide 24×24; Apple 44×44;
 *     Material 48×48 dp). Se reportan los menores a 44.
 *   - Tamaños de letra usados.
 */

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lin = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
export const luminancia = (hex) => {
  const [r, g, b] = rgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a, b) => {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const mezclar = (arriba, a, abajo) => {
  const A = rgb(arriba);
  const B = rgb(abajo);
  return '#' + A.map((v, i) => Math.round(v * a + B[i] * (1 - a)).toString(16).padStart(2, '0')).join('').toUpperCase();
};

export function nivel(ratio, grande) {
  if (ratio >= 7 || (grande && ratio >= 4.5)) return 'AAA';
  if (ratio >= 4.5 || (grande && ratio >= 3)) return 'AA';
  // Pasa para texto grande (≥ 24 px, o ≥ 18.66 px en negrita) pero no para el normal.
  if (ratio >= 3) return 'Sólo grande';
  return 'No cumple';
}

export function auditar(datos, nombresColor = {}) {
  const pares = new Map();
  const toques = [];
  const tamanos = new Map();
  let textos = 0;

  const visitar = (n, fondo, pantalla, op, inactivoPadre = false) => {
    let f = fondo;
    // WCAG exime a los controles deshabilitados del contraste mínimo.
    const inactivo = inactivoPadre || n.comp?.variante?.Estado === 'deshabilitado';
    const opacidad = op * (n.opacidad ?? 1);
    if (n.tipo === 'FRAME' && n.fondo) f = mezclar(n.fondo.hex, n.fondo.a * opacidad, f);
    if (n.tipo === 'IMG' || n.tipo === 'SVG') return;
    if (n.toca) {
      let etiqueta = n.a11y || '';
      if (!etiqueta) {
        (function buscar(x) {
          if (!etiqueta && x.tipo === 'TEXT') etiqueta = x.runs.map((r) => r.texto).join('');
          (x.hijos ?? []).forEach(buscar);
        })(n);
      }
      toques.push({ pantalla: pantalla.nombre, etiqueta: etiqueta || n.nombre, w: Math.round(n.w), h: Math.round(n.h) });
    }
    if (n.tipo === 'TEXT') {
      textos++;
      for (const r of n.runs) {
        if (!r.color || !r.texto.trim()) continue;
        // Los emoji no son texto con color propio: no cuentan para contraste.
        if (!/[\p{L}\p{N}]/u.test(r.texto)) continue;
        const tx = r.color.a < 1 || opacidad < 1 ? mezclar(r.color.hex, r.color.a * opacidad, f) : r.color.hex;
        const negrita = /Bold|SemiBold/.test(r.fuente) || Number(r.peso) >= 600;
        const grande = r.tam >= 24 || (r.tam >= 18.66 && negrita);
        const clave = `${tx}|${f}|${inactivo}`;
        const p = pares.get(clave) ?? { texto: tx, fondo: f, inactivo, usos: 0, tamMin: 999, tamMax: 0, grande: true, pantallas: new Set(), ejemplo: r.texto.trim() };
        p.usos++;
        p.tamMin = Math.min(p.tamMin, r.tam);
        p.tamMax = Math.max(p.tamMax, r.tam);
        p.grande = p.grande && grande;
        p.pantallas.add(pantalla.nombre);
        if (r.texto.trim().length > p.ejemplo.length && r.texto.trim().length < 34) p.ejemplo = r.texto.trim();
        pares.set(clave, p);
        tamanos.set(r.tam, (tamanos.get(r.tam) ?? 0) + 1);
      }
    }
    for (const h of n.hijos ?? []) visitar(h, f, pantalla, opacidad, inactivo);
  };
  for (const p of datos.pantallas) visitar(p.raiz, '#FFFFFF', p, 1);

  const contrasteLista = [...pares.values()]
    .map((p) => {
      const ratio = contraste(p.texto, p.fondo);
      return {
        texto: p.texto,
        fondo: p.fondo,
        nombreTexto: nombresColor[p.texto] ?? null,
        nombreFondo: nombresColor[p.fondo] ?? null,
        ratio: Math.round(ratio * 100) / 100,
        nivel: p.inactivo ? 'Inactivo' : nivel(ratio, p.grande),
        inactivo: p.inactivo,
        grande: p.grande,
        usos: p.usos,
        tamMin: p.tamMin,
        tamMax: p.tamMax,
        ejemplo: p.ejemplo,
        pantallas: [...p.pantallas],
      };
    })
    .sort((a, b) => a.ratio - b.ratio);

  // Un mismo tocable repetido en varias pantallas se reporta una vez.
  const vistos = new Set();
  const toquesChicos = toques
    .filter((t) => t.w < 44 || t.h < 44)
    .filter((t) => {
      const k = `${t.etiqueta}|${t.w}|${t.h}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });

  return {
    resumen: {
      pantallas: datos.pantallas.length,
      textos,
      pares: contrasteLista.length,
      tocables: toques.length,
      fallan: contrasteLista.filter((c) => c.nivel === 'No cumple').length,
      soloGrande: contrasteLista.filter((c) => c.nivel === 'Sólo grande').length,
      toquesChicos: toquesChicos.length,
      toques48: toques.filter((t) => t.w >= 48 && t.h >= 48).length,
    },
    contraste: contrasteLista,
    toquesChicos,
    tamanos: [...tamanos.entries()].sort((a, b) => a[0] - b[0]).map(([tam, usos]) => ({ tam, usos })),
  };
}
