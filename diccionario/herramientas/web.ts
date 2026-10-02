/**
 * Los datos que muestra el sitio (piko.mugiware.com), sacados del diccionario.
 *
 *   web/datos/diccionario-<código>.json   las palabras, con su fuente y su análisis
 *   web/datos/estado.json                 cuánto hay de cada lengua y quiénes enseñaron
 *   web/diccionario/index.html            sólo la lista entre <!-- palabras:inicio --> y
 *                                         <!-- palabras:fin -->, para que los buscadores
 *                                         vean las palabras sin correr JavaScript
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
import { armar, armarAlEspanol, leerDiccionario, leerLenguas, paraLaApp, RAIZ_DICCIONARIO, usable, type Entrada } from './recetas';
import { paraVozEspanola } from './voz';

const WEB = path.resolve(RAIZ_DICCIONARIO, '..', 'web');
const REPO = 'https://github.com/dnnyhr/Piko-Aplicacion-para-el-aprendizaje-de-idiomas-/blob/main';

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

/** El ancla con que GitHub enlaza un título de Markdown. */
const ancla = (titulo: string) =>
  titulo.toLocaleLowerCase('es').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-');

/** Las reglas de `gramatica.md`: id → título, confianza y enlace. */
function reglasDe(dir: string, carpeta: string) {
  const archivo = path.join(dir, 'gramatica.md');
  if (!fs.existsSync(archivo)) return {};
  const reglas: Record<string, { titulo: string; confianza: string; enlace: string }> = {};
  for (const m of fs.readFileSync(archivo, 'utf8').matchAll(/^### (([A-Z]\d+) · (.+?) — Confianza (.+))$/gm)) {
    const [, completo = '', id = '', titulo = '', confianza = ''] = m;
    reglas[id] = { titulo, confianza, enlace: `${REPO}/diccionario/${carpeta}/gramatica.md#${ancla(completo)}` };
  }
  return reglas;
}

const json = (v: unknown) => JSON.stringify(v, null, 1) + '\n';
const html = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const SITIO = 'https://piko.mugiware.com/';
/** Las páginas del sitio, en el orden de la barra. */
export const PAGINAS_DEL_SITIO = ['', 'diccionario/', 'probar/', 'docentes/', 'aporta/'];

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
    const reglas = reglasDe(d.dir, lengua.carpeta);
    const entradas = d.entradas.map((e) => ({
      id: e.id,
      forma: e.forma,
      es: e.es,
      categoria: e.categoria,
      tema: e.tema,
      ...(e.analisis ? { analisis: e.analisis } : {}),
      ...(e.glosa ? { glosa: e.glosa } : {}),
      ...(e.prestamo ? { prestamo: e.prestamo } : {}),
      ...(e.notas ? { notas: e.notas } : {}),
      ...(e.revisar ? { revisar: e.revisar } : {}),
      escrito: e.registrado,
      reglas: (e.reglas ?? []).filter((r) => r in reglas),
      fuentes: e.fuentes,
      estado: e.estado,
      voz: lengua.codigo === 'miq' ? paraVozEspanola(e.forma) : e.forma,
    }));
    salida.set(
      path.join(WEB, 'datos', `diccionario-${lengua.codigo}.json`),
      json({
        lengua: { codigo: lengua.codigo, nombre: lengua.nombre, autonimo: lengua.autonimo ?? null, voz: lengua.voz },
        fuentes: fuentes.filter((f) => f.tipo !== 'equipo').map(fuentePublica),
        reglas,
        entradas,
      }),
    );
    if (lengua.codigo === 'miq') {
      const pagina = path.join(WEB, 'diccionario', 'index.html');
      salida.set(pagina, conPalabras(fs.readFileSync(pagina, 'utf8'), entradas));
    }
  }

  salida.set(path.join(WEB, 'datos', 'estado.json'), json({ lenguas: estado }));
  salida.set(path.join(WEB, 'sitemap.xml'), sitemap());
  return salida;
}
