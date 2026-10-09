/**
 * Pone nombre a cada SVG e imagen capturados según el componente que los
 * dibuja (Piko · saludando, Insignia · primera-palabra · ganada…). Ese nombre
 * se usa en la página de assets de Figma y en los archivos del kit.
 */

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Dibujos sueltos que la app arma con su propio componente. */
const CAPAS = {
  Rayos: 'Rayos de festejo',
  Nota: 'Nota musical',
  Candado: 'Candado',
  Reloj: 'Reloj · próximamente',
  Venda: 'Venda de Pikito Ciego',
  Parlante: 'Parlante',
  Chibola: 'Chibola',
  Paisaje: 'Madroño · paisaje',
  DibujoArbol: 'Madroño · árbol',
  Globito: 'Globito',
  Hoja: 'Hoja',
  Bandera: 'Bandera',
  InsigniaHackathon: 'Insignia · Piko Hackathon 2026',
};

/** Y algunos que se reconocen por su trazo. */
const TRAZOS = [
  [/M15 5 L8 12 L15 19/, 'Flecha · volver'],
  [/M4 9v6h4l5 4V5L8 9H4z/, 'Parlante · escuchar'],
  [/clip0_1096_808/, 'Marca · Piko'],
  [/^<svg width="100" height="100"[^>]*><path d="M50 50 L/, 'Rayos de festejo'],
  [/cx="162" cy="-14"/, 'Madroño · cielo y montañas'],
  [/^<svg width="200" height="308" viewBox="0 -48 200 308"[^>]*><g><g><ellipse cx="100" cy="252"/, 'Madroño · árbol y Piko'],
  [/^<svg width="40" height="40" viewBox="0 0 40 40"[^>]*><circle cx="20" cy="20" r="18" fill="#E97927"/, 'Chibola · naranja'],
  [/^<svg width="40" height="40" viewBox="0 0 40 40"[^>]*><circle cx="20" cy="20" r="18" fill="#C8102E"/, 'Chibola · roja'],
  [/^<svg width="40" height="40" viewBox="0 0 40 40"[^>]*><circle cx="20" cy="20" r="18" fill="#61A66B"/, 'Chibola · verde'],
  [/^<svg width="40" height="40" viewBox="0 0 40 40"[^>]*><circle cx="20" cy="20" r="18" fill="#3AA8E0"/, 'Chibola · celeste'],
  [/M9 18 V5 L19 3 V16" stroke="#E97927"/, 'Nota musical · naranja'],
  [/M9 18 V5 L19 3 V16" stroke="#61A66B"/, 'Nota musical · verde'],
];

export function nombrarAssets(datos) {
  const usados = new Set();
  const asignar = (dic, id, nombre) => {
    if (dic[id].nombre) return;
    let n = nombre;
    let i = 2;
    while (usados.has(n)) n = `${nombre} ${i++}`;
    usados.add(n);
    dic[id].nombre = n;
    dic[id].archivo = slug(n.replace(/·/g, ' '));
  };
  const visitar = (n, contexto) => {
    let ctx = contexto;
    if (n.comp) {
      const v = Object.entries(n.comp.variante)
        .filter(([k]) => k !== 'Forma')
        .map(([, v]) => v);
      ctx = [n.comp.nombre, ...v].join(' · ');
      // Las insignias sin ganar comparten el mismo dibujo gris: se nombra por estado.
      if (n.comp.id === 'Insignia' && n.comp.variante.Estado !== 'ganada') {
        ctx = /hackathon/.test(n.comp.variante.Logro) ? `Insignia · Piko Hackathon · ${n.comp.variante.Estado}` : `Insignia · ${n.comp.variante.Estado}`;
      }
    }
    if (n.tipo === 'SVG') {
      const propio = TRAZOS.find(([re]) => re.test(datos.svgs[n.svg].xml))?.[1] ?? CAPAS[n.capa];
      asignar(datos.svgs, n.svg, propio ?? ctx ?? 'Ícono');
    }
    if (n.tipo === 'IMG') asignar(datos.imagenes, n.img, ctx ?? 'Imagen');
    for (const h of n.hijos ?? []) visitar(h, ctx);
  };
  for (const p of datos.pantallas) visitar(p.raiz, null);
  for (const [id, s] of Object.entries(datos.svgs)) if (!s.nombre) asignar(datos.svgs, id, `Ícono ${id}`);
}
