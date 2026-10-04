/**
 * Los datos que muestra el sitio (piko.mugiware.com), sacados del diccionario.
 *
 *   web/datos/diccionario-<código>.json   las palabras confirmadas, con su fuente y sus variantes
 *   web/datos/estado.json                 cuánto hay de cada lengua y quiénes enseñaron
 *   web/diccionario/index.html            sólo la lista entre <!-- palabras:inicio --> y
 *                                         <!-- palabras:fin -->, para que los buscadores
 *                                         vean las palabras sin correr JavaScript
 *   web/reglas/index.html                 sólo lo que está entre sus marcas: las reglas
 *                                         sólidas, con el texto de reglas-sitio.md (ver reglas.ts)
 *   web/sitemap.xml                       las páginas del sitio
 *
 * Los escribe `npm run contenido`, igual que los paquetes de la app, así el
 * sitio nunca queda atrás. No llevan datos de contacto ni el identificador
 * interno de las respuestas de la encuesta: sólo el crédito que eligió cada
 * persona.
 */

import fs from 'node:fs';
import path from 'node:path';
import { avanceDeInterfaz } from './interfaz';
import { armar, armarAlEspanol, leerCsv, leerDiccionario, leerLenguas, paraLaApp, RAIZ_DICCIONARIO, usable, type Entrada } from './recetas';
import { reglasHtml, reglasSolidas } from './reglas';
import { paraVozEspanola } from './voz';

const WEB = path.resolve(RAIZ_DICCIONARIO, '..', 'web');

interface Fuente {
  id: string;
  tipo: string;
  credito?: string;
  comunidad?: string;
  rol?: string;
  zona?: string;
  fecha?: string;
  autor?: string;
  titulo?: string;
  editorial?: string;
  consultado_en?: string;
}

/** Cómo se nombra una fuente en el sitio. */
function fuentePublica(f: Fuente) {
  if (f.tipo === 'encuesta') {
    return { id: f.id, tipo: f.tipo, nombre: f.credito ?? 'Anónimo', detalle: [f.rol, f.comunidad].filter(Boolean).join(', '), fecha: f.fecha };
  }
  if (f.tipo === 'publicacion') {
    return { id: f.id, tipo: f.tipo, nombre: f.autor ?? '', detalle: [f.titulo, f.editorial].filter(Boolean).join('. '), fecha: f.fecha, enlace: f.consultado_en?.split(' ')[0] };
  }
  return { id: f.id, tipo: f.tipo, nombre: 'El equipo de Piko', detalle: '', fecha: f.fecha };
}

// ---------- Variantes ----------

/** Cómo se nombra una fuente en una etiqueta corta: «Tangni», «Matamoros (1996)». */
function nombreCorto(f: Fuente) {
  if (f.tipo === 'encuesta') return f.credito ?? 'Anónimo';
  const partes = (f.autor ?? '').split(/\s+/).filter((p) => p && !p.endsWith('.'));
  return `${partes.length > 1 ? partes.slice(1).join(' ') : partes.join(' ')} (${f.fecha?.slice(0, 4) ?? ''})`;
}

/** Dónde se habla la forma que dio una fuente: la comunidad de quien contestó, o la zona de la obra. */
function lugar(f: Fuente) {
  if (f.tipo === 'encuesta') return (f.comunidad ?? '').split(',')[0]!.trim();
  return f.zona ? f.zona.charAt(0).toUpperCase() + f.zona.slice(1).replace(/_/g, ' ') : '';
}

/** Para comparar formas: sin mayúsculas, signos ni tilde aguda (la circunfleja sí cuenta: marca la vocal larga). */
const llano = (t: string) =>
  t.normalize('NFD').replace(/[\u0300\u0301]/g, '').normalize('NFC')
    .toLocaleLowerCase('es').replace(/[¿?¡!.,;:«»"]/g, '').replace(/\s+/g, ' ').trim();
const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Etiqueta = 'escrituras' | 'region' | 'hablantes' | 'sistemas' | 'sinonimo';
interface Variantes {
  etiquetas: Etiqueta[];
  escrituras?: { forma: string; quien: string[] }[];
  otras?: { id: string; forma: string; quien: string[]; tipo: Etiqueta }[];
}

/**
 * Las variantes de cada entrada, sacadas de los datos y no escritas a mano:
 * - las distintas maneras en que la escribieron (`registrado`), con quién
 *   escribió cada una según el corpus;
 * - las otras palabras del léxico con la misma traducción, y por qué difieren:
 *   dos maneras de contar (regla N3), la región (Raiti o Bilwi), la persona,
 *   o simplemente otra palabra.
 */
function variantesDe(entradas: Entrada[], fuentes: Fuente[], corpus: string[][]) {
  const porId = new Map(fuentes.map((f) => [f.id, f]));
  const filas = corpus.slice(1).map(([fuente = '', , , , miq = '']) => ({ fuente, miq }));
  /** Qué fuentes escribieron exactamente esta forma (o, si ninguna, sin mirar mayúsculas). */
  const quienEscribio = (forma: string, candidatas: string[]) => {
    for (const banderas of ['u', 'iu']) {
      const re = new RegExp(`(^|[^\\p{L}])${escapar(forma)}($|[^\\p{L}])`, banderas);
      const ids = candidatas.filter((id) => filas.some((r) => r.fuente === id && re.test(r.miq)));
      if (ids.length) return ids;
    }
    return [];
  };
  const personas = (ids: string[]) => new Set(ids.filter((id) => porId.get(id)?.tipo === 'encuesta'));
  const lugares = (ids: string[]) => new Set(ids.map((id) => porId.get(id)).filter(Boolean).map((f) => lugar(f!)).filter(Boolean));
  const nombres = (ids: string[]) => ids.map((id) => porId.get(id)).filter(Boolean).map((f) => nombreCorto(f!));
  const disjuntos = (a: Set<string>, b: Set<string>) => a.size > 0 && b.size > 0 && [...a].every((x) => !b.has(x));

  const porTraduccion = new Map<string, Entrada[]>();
  for (const e of entradas) porTraduccion.set(llano(e.es), [...(porTraduccion.get(llano(e.es)) ?? []), e]);

  const resultado = new Map<string, Variantes>();
  for (const e of entradas) {
    const etiquetas = new Set<Etiqueta>();
    const v: Variantes = { etiquetas: [] };

    // Las maneras de escribirla: se agrupan las que sólo cambian en mayúsculas o signos.
    const grupos = new Map<string, { forma: string; ids: Set<string> }>();
    for (const forma of e.registrado) {
      const clave = llano(forma);
      const g = grupos.get(clave) ?? { forma: forma.replace(/[¿?¡!]/g, '').trim(), ids: new Set<string>() };
      for (const id of quienEscribio(forma, e.fuentes)) g.ids.add(id);
      grupos.set(clave, g);
    }
    if (grupos.size > 1) {
      etiquetas.add('escrituras');
      const lista = [...grupos.values()];
      v.escrituras = lista.map((g) => ({ forma: g.forma, quien: nombres([...g.ids]) }));
      for (const a of lista) for (const b of lista) {
        // Una forma más larga que empieza igual (muih → muihnika) es la palabra con algo
        // agregado, no otra manera de decirla: no dice nada de la región ni de la persona.
        const [x, y] = [llano(a.forma), llano(b.forma)];
        if (a === b || (x.length >= y.length + 3 && x.startsWith(y)) || (y.length >= x.length + 3 && y.startsWith(x))) continue;
        if (disjuntos(lugares([...a.ids]), lugares([...b.ids]))) etiquetas.add('region');
        if (disjuntos(personas([...a.ids]), personas([...b.ids]))) etiquetas.add('hablantes');
      }
    }

    // Otras palabras con la misma traducción.
    const otras = (porTraduccion.get(llano(e.es)) ?? []).filter((o) => o.id !== e.id && llano(o.forma) !== llano(e.forma));
    if (otras.length) {
      v.otras = otras.map((o) => {
        const tipo: Etiqueta =
          e.tema === 'numeros' && o.tema === 'numeros' && [...(e.reglas ?? []), ...(o.reglas ?? [])].includes('N3')
            ? 'sistemas'
            : disjuntos(lugares(e.fuentes), lugares(o.fuentes))
              ? 'region'
              : disjuntos(personas(e.fuentes), personas(o.fuentes))
                ? 'hablantes'
                : 'sinonimo';
        etiquetas.add(tipo);
        return { id: o.id, forma: o.forma, quien: nombres(o.fuentes), tipo };
      });
    }

    if (etiquetas.size) {
      const orden: Etiqueta[] = ['sistemas', 'region', 'hablantes', 'escrituras', 'sinonimo'];
      v.etiquetas = orden.filter((x) => etiquetas.has(x));
      resultado.set(e.id, v);
    }
  }
  return resultado;
}

const json = (v: unknown) => JSON.stringify(v, null, 1) + '\n';
const html = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const SITIO = 'https://piko.mugiware.com/';
/** Las páginas del sitio, en el orden de la barra. */
export const PAGINAS_DEL_SITIO = ['', 'diccionario/', 'reglas/', 'probar/', 'docentes/', 'aporta/'];

function sitemap() {
  const urls = PAGINAS_DEL_SITIO.map((r) => `  <url><loc>${SITIO}${r}</loc><priority>${r ? '0.8' : '1.0'}</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** La lista de palabras ya escrita en el HTML; el JavaScript la reemplaza por las tarjetas. */
function conPalabras(pagina: string, entradas: { id: string; forma: string; es: string }[]) {
  const inicio = pagina.indexOf('<!-- palabras:inicio');
  const fin = pagina.indexOf('<!-- palabras:fin -->');
  if (inicio < 0 || fin < inicio) throw new Error('web/diccionario/index.html perdió las marcas <!-- palabras:inicio --> y <!-- palabras:fin -->');
  const abre = pagina.indexOf('-->', inicio) + 3;
  const lista = [...entradas]
    .sort((a, b) => a.forma.localeCompare(b.forma, 'es'))
    .map((e) => `<li id="${html(e.id)}"><b lang="miq">${html(e.forma)}</b> · ${html(e.es)}</li>`);
  return `${pagina.slice(0, abre)}\n<ul class="estatico">\n${lista.join('\n')}\n</ul>\n${pagina.slice(fin)}`;
}

/** Reemplaza lo que hay entre `<!-- nombre:inicio … -->` y `<!-- nombre:fin -->`. */
function entreMarcas(pagina: string, archivo: string, nombre: string, contenido: string) {
  const inicio = pagina.indexOf(`<!-- ${nombre}:inicio`);
  const fin = pagina.indexOf(`<!-- ${nombre}:fin -->`);
  if (inicio < 0 || fin < inicio) throw new Error(`${archivo} perdió las marcas <!-- ${nombre}:inicio --> y <!-- ${nombre}:fin -->`);
  const abre = pagina.indexOf('-->', inicio) + 3;
  return `${pagina.slice(0, abre)}\n${contenido}\n${pagina.slice(fin)}`;
}

/** `generados`: archivos que esta misma corrida está por escribir; se leen de ahí antes que del disco. */
export function archivosDeLaWeb(generados: ReadonlyMap<string, string> = new Map()): Map<string, string> {
  const salida = new Map<string, string>();
  const lenguas = leerLenguas();
  const estado: unknown[] = [];

  for (const lengua of lenguas) {
    const d = leerDiccionario(lengua);
    const fila: Record<string, unknown> = { codigo: lengua.codigo, nombre: lengua.nombre, autonimo: lengua.autonimo ?? null };
    if (!d || !lengua.carpeta) {
      const desde = lenguas.find((l) => l.ensena?.includes(lengua.codigo));
      estado.push({ ...fila, desde: desde?.codigo ?? null });
      continue;
    }

    const fuentes = JSON.parse(fs.readFileSync(path.join(d.dir, 'fuentes.json'), 'utf8')).fuentes as Fuente[];
    const armados = armar(d);
    const enApp = paraLaApp(d, armados);
    const interfaz = path.join(d.dir, 'interfaz.csv');
    const personas = (e: Entrada) => e.fuentes.filter((f) => fuentes.find((x) => x.id === f)?.tipo === 'encuesta').length;

    estado.push({
      ...fila,
      entradas: d.entradas.length,
      por_revisar: d.entradas.filter((e) => !usable(e)).length,
      dichas_por_varias_personas: d.entradas.filter((e) => personas(e) >= 2).length,
      paquetes: enApp.length,
      ejercicios: enApp.reduce((n, a) => n + a.pack.items.length, 0),
      al_espanol: lengua.ensena?.includes('spa') ? armarAlEspanol(d, 'es-US').reduce((n, a) => n + a.pack.items.length, 0) : 0,
      interfaz: generados.has(interfaz)
        ? avanceDeInterfaz(generados.get(interfaz) ?? '', lengua.codigo)
        : fs.existsSync(interfaz)
          ? avanceDeInterfaz(fs.readFileSync(interfaz, 'utf8'), lengua.codigo)
          : null,
      fuentes: fuentes.filter((f) => f.tipo !== 'equipo').map(fuentePublica),
      diccionario: lengua.codigo === 'eng' ? null : `datos/diccionario-${lengua.codigo}.json`,
    });

    if (lengua.codigo === 'eng') continue; // el inglés no necesita un diccionario en el sitio
    // En el sitio sólo va lo confirmado: lo que está en revisión espera, como en
    // los ejercicios de la app. Y sin lo técnico (glosas, reglas, categorías):
    // eso vive en gramatica.md y en lexico.json para quien estudia la lengua.
    const publicables = d.entradas.filter(usable);
    const corpus = leerCsv(fs.readFileSync(path.join(d.dir, 'corpus.csv'), 'utf8'));
    const variantes = variantesDe(publicables, fuentes, corpus);
    const entradas = publicables.map((e) => ({
      id: e.id,
      forma: e.forma,
      es: e.es,
      tema: e.tema,
      ...(e.prestamo ? { viene_de: { lengua: e.prestamo.de, palabra: e.prestamo.origen } } : {}),
      ...(variantes.has(e.id) ? { variantes: variantes.get(e.id) } : {}),
      fuentes: e.fuentes,
      voz: lengua.codigo === 'miq' ? paraVozEspanola(e.forma) : e.forma,
    }));
    salida.set(
      path.join(WEB, 'datos', `diccionario-${lengua.codigo}.json`),
      json({
        lengua: { codigo: lengua.codigo, nombre: lengua.nombre, autonimo: lengua.autonimo ?? null, voz: lengua.voz },
        fuentes: fuentes.filter((f) => f.tipo !== 'equipo').map(fuentePublica),
        entradas,
      }),
    );
    if (lengua.codigo === 'miq') {
      const pagina = path.join(WEB, 'diccionario', 'index.html');
      salida.set(pagina, conPalabras(fs.readFileSync(pagina, 'utf8'), entradas));

      const gramatica = path.join(d.dir, 'gramatica.md');
      const textoSitio = path.join(d.dir, 'reglas-sitio.md');
      const paginaReglas = path.join(WEB, 'reglas', 'index.html');
      if (fs.existsSync(paginaReglas)) {
        // Sin sus fuentes, la página quedaría publicada con reglas viejas: mejor fallar.
        for (const f of [gramatica, textoSitio]) {
          if (!fs.existsSync(f)) throw new Error(`Falta ${path.relative(path.resolve(RAIZ_DICCIONARIO, '..'), f)}: de ahí sale web/reglas/index.html`);
        }
        const reglas = reglasSolidas(fs.readFileSync(gramatica, 'utf8'), fs.readFileSync(textoSitio, 'utf8'));
        const { lista, filtros } = reglasHtml(reglas);
        const nota = 'lo escribe npm run contenido desde diccionario/miskito/reglas-sitio.md';
        let r = fs.readFileSync(paginaReglas, 'utf8');
        r = entreMarcas(r, 'web/reglas/index.html', 'cifras', [
          `<div class="cifra-chica" data-entra><b data-contar="${reglas.length}">${reglas.length}</b><span>reglas sólidas</span></div>`,
          `<div class="cifra-chica" data-entra><b data-contar="${fuentes.filter((f) => f.tipo !== 'equipo').length}">${fuentes.filter((f) => f.tipo !== 'equipo').length}</b><span>fuentes</span></div>`,
          `<div class="cifra-chica" data-entra><b data-contar="${publicables.length}">${publicables.length}</b><span>palabras en el diccionario</span></div>`,
        ].join('\n'));
        r = entreMarcas(r, 'web/reglas/index.html', 'filtros', filtros);
        r = entreMarcas(r, 'web/reglas/index.html', 'reglas', lista);
        salida.set(paginaReglas, r.replace(/(<!-- (?:cifras|filtros|reglas):inicio)[^>]*-->/g, `$1 · ${nota} -->`));
      }
    }
  }

  salida.set(path.join(WEB, 'datos', 'estado.json'), json({ lenguas: estado }));
  salida.set(path.join(WEB, 'sitemap.xml'), sitemap());
  return salida;
}
