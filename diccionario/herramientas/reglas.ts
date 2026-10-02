/**
 * La página de reglas del sitio (web/reglas/), sacada de `<lengua>/gramatica.md`.
 *
 * Sólo van las reglas sólidas (confianza A): 3 ejemplos o más y ningún
 * contraejemplo. Las probables y las hipótesis quedan en gramatica.md, igual
 * que las palabras en revisión quedan fuera del diccionario del sitio. Y sin
 * lo técnico: las glosas palabra por palabra, las predicciones y las
 * hipótesis no se publican.
 *
 * El texto de cada regla se escribe en gramatica.md y en ningún otro lado;
 * acá sólo se pasa de Markdown a HTML.
 */

export interface Regla {
  codigo: string;
  titulo: string;
  seccion: string;
  html: string;
}

/** Las secciones de gramatica.md que tienen reglas, con su nombre en el sitio. */
const SECCIONES: Record<string, { id: string; nombre: string }> = {
  'Sonidos y escritura': { id: 'sonidos', nombre: 'Sonidos y escritura' },
  'Palabras: cómo se forman': { id: 'palabras', nombre: 'Cómo se forman las palabras' },
  'Frases: el orden': { id: 'frases', nombre: 'El orden de la frase' },
  Vocabulario: { id: 'vocabulario', nombre: 'Vocabulario' },
  'Los números': { id: 'numeros', nombre: 'Los números' },
};

/** Párrafos que no se publican: lo que todavía no se sabe, o que es sólo para el equipo. */
const NO_VA = /^\*\*(Predicci|Hipótesis|Dos hipótesis|Para Piko|Lo que decía|Historia|Contraejemplo)/;

const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

/** Negritas, cursivas (el miskito va en cursiva), código y enlaces externos. Los enlaces al repositorio quedan como texto. */
function enLinea(t: string, codigos: Set<string>): string {
  let s = escapar(t);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, texto: string, url: string) =>
    /^https?:/.test(url) ? `<a href="${url}">${texto}</a>` : texto);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/\*([^*]+)\*/g, '<i lang="miq">$1</i>');
  // «(M16)», «ver M17»: un enlace a la regla, si está en la página
  s = s.replace(/\b([SMOLN]\d{1,2})\b/g, (c: string) => (codigos.has(c) ? `<a href="#${c.toLowerCase()}">${c}</a>` : c));
  return s;
}

/** Bloques de Markdown: párrafos, listas y tablas. Los bloques de código (las glosas) se saltan. */
function bloques(md: string): string[] {
  const salida: string[] = [];
  let actual: string[] = [];
  let enCodigo = false;
  const cerrar = () => {
    if (actual.length) salida.push(actual.join('\n'));
    actual = [];
  };
  for (const linea of md.split('\n')) {
    if (linea.startsWith('```')) {
      cerrar();
      enCodigo = !enCodigo;
      continue;
    }
    if (enCodigo) continue;
    if (!linea.trim()) cerrar();
    else actual.push(linea);
  }
  cerrar();
  return salida;
}

function bloqueHtml(b: string, codigos: Set<string>): string {
  const lineas = b.split('\n');
  if (lineas.every((l) => l.trim().startsWith('|'))) {
    const celdas = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => enLinea(c.trim(), codigos));
    const [cabeza, , ...cuerpo] = lineas;
    return `<div class="tabla"><table><thead><tr>${celdas(cabeza!).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${cuerpo
      .map((f) => `<tr>${celdas(f).map((c) => `<td>${c}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  }
  const desde = lineas.findIndex((l) => l.startsWith('- '));
  if (desde >= 0) {
    // «**Evidencia.**» y después la lista: el párrafo y la lista por separado
    const antes = desde > 0 ? `<p>${enLinea(lineas.slice(0, desde).join(' '), codigos)}</p>` : '';
    const items: string[] = [];
    for (const l of lineas.slice(desde)) {
      if (l.startsWith('- ')) items.push(l.slice(2));
      else items[items.length - 1] += ' ' + l.trim();
    }
    return `${antes}<ul>${items.map((i) => `<li>${enLinea(i, codigos)}</li>`).join('')}</ul>`;
  }
  return `<p>${enLinea(lineas.join(' '), codigos)}</p>`;
}

/** Las reglas sólidas de gramatica.md, en orden, con su texto en HTML. */
export function reglasSolidas(md: string): Regla[] {
  const crudas: { codigo: string; titulo: string; seccion: string; cuerpo: string }[] = [];
  let seccion = '';
  const partes = md.split(/^(?=#{2,3} )/m);
  for (const parte of partes) {
    const h2 = /^## (.+)$/m.exec(parte);
    if (parte.startsWith('## ') && h2) {
      seccion = h2[1]!.trim();
      continue;
    }
    const h3 = /^### ([A-Z]\d+) · (.+?) — Confianza ([ABC])\b.*$/m.exec(parte);
    if (!h3 || h3[3] !== 'A' || !SECCIONES[seccion]) continue;
    crudas.push({ codigo: h3[1]!, titulo: h3[2]!.trim(), seccion, cuerpo: parte.slice(parte.indexOf('\n') + 1) });
  }
  const codigos = new Set(crudas.map((r) => r.codigo));
  return crudas.map((r) => {
    const html = bloques(r.cuerpo)
      .filter((b) => !NO_VA.test(b.trim()) && !b.startsWith('---'))
      .map((b) => bloqueHtml(b, codigos));
    // Lo primero se ve siempre; el resto, al abrir la tarjeta.
    const [primero = '', ...resto] = html;
    const mas = resto.length ? `<details><summary>Ver más</summary>${resto.join('')}</details>` : '';
    return { codigo: r.codigo, titulo: r.titulo, seccion: r.seccion, html: primero + mas };
  });
}

/** El HTML de la página: los filtros por sección y una tarjeta por regla. */
export function reglasHtml(reglas: Regla[]): { lista: string; filtros: string } {
  const usadas = Object.entries(SECCIONES).filter(([s]) => reglas.some((r) => r.seccion === s));
  const filtros = [
    `<button class="filtro" type="button" data-seccion="" aria-pressed="true">Todas <small>${reglas.length}</small></button>`,
    ...usadas.map(([s, { id, nombre }]) =>
      `<button class="filtro" type="button" data-seccion="${id}" aria-pressed="false">${escapar(nombre)} <small>${reglas.filter((r) => r.seccion === s).length}</small></button>`),
  ].join('\n');
  const tarjeta = (r: Regla) => `<article class="regla-tarjeta" id="${r.codigo.toLowerCase()}">
<a class="regla-tarjeta__codigo" href="#${r.codigo.toLowerCase()}" aria-label="Enlace a la regla ${r.codigo}">${r.codigo}</a>
<h3>${enLinea(r.titulo, new Set())}</h3>
${r.html}
</article>`;
  const lista = usadas
    .map(([s, { id, nombre }]) => `<section class="reglas-seccion" data-seccion="${id}">
<h2>${escapar(nombre)}</h2>
<div class="reglas-grilla">
${reglas.filter((r) => r.seccion === s).map(tarjeta).join('\n')}
</div>
</section>`)
    .join('\n');
  return { lista, filtros };
}
