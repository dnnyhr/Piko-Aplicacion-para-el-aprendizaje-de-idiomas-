/**
 * De las recetas de ejercicios a los paquetes de la app.
 *
 * Un ejercicio no copia palabras: apunta a entradas del léxico por su id.
 *
 *   { "elegir": "yapti", "opciones": ["yapti", "aisa", "kuka"] }
 *   { "escuchar": "kumi", "opciones": ["kumi", "wal", "lal"] }
 *   { "armar": "frase.hasta_manana", "extra": ["titan", "ra"] }
 *
 * La forma, la traducción y el texto para la voz salen del léxico al armar el
 * paquete. Si cambia una palabra, cambia en todos los ejercicios a la vez.
 *
 * Lo usan `contenido.ts` (que escribe `app/content/packs/`) y `verificar.ts`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Item, LangCode, Pack } from '../../app/src/core/content/schema';
import { textoParaVoz } from './voz';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ_DICCIONARIO = path.resolve(AQUI, '..');

export interface Lengua {
  codigo: LangCode;
  nombre: string;
  autonimo?: string;
  /** Carpeta del diccionario dentro de `diccionario/`; null si todavía no hay. */
  carpeta: string | null;
  /** Voz sintética con que puede sonar (BCP-47); null = sólo grabaciones. */
  voz: string | null;
  /** Lenguas que se aprenden desde esta, con su mismo léxico (hoy: el español). */
  ensena?: LangCode[];
}

export interface Entrada {
  id: string;
  forma: string;
  registrado: string[];
  es: string;
  categoria: string;
  tema: string;
  analisis?: string;
  glosa?: string;
  prestamo?: { de: string; origen: string; confianza: string };
  normalizacion?: string;
  notas?: string;
  de?: string;
  revisar?: string;
  reglas?: string[];
  fuentes: string[];
  estado: string;
}

interface RecetaBase {
  /** Escribe la primera letra en mayúscula (por defecto, lo que diga el paquete). */
  mayuscula?: boolean;
}
export interface RecetaElegir extends RecetaBase {
  elegir: string;
  /** Todas las opciones, en orden, incluida la correcta. */
  opciones: string[];
  /** Lo que se le muestra en español; por defecto, el `es` de la entrada. */
  pregunta?: string;
}
export interface RecetaEscuchar extends RecetaBase {
  escuchar: string;
  opciones: string[];
  glosa?: string;
}
export interface RecetaArmar extends RecetaBase {
  armar: string;
  /** Bloques de más, para despistar. Cada uno tiene que ser palabra de alguna entrada. */
  extra: string[];
  glosa?: string;
}
export type Receta = RecetaElegir | RecetaEscuchar | RecetaArmar;

export interface RecetaPaquete {
  tema: string;
  nivel: 1 | 2 | 3;
  titulo: string;
  mayuscula?: boolean;
  items: Receta[];
}

export interface DiccionarioDeLengua {
  lengua: Lengua;
  dir: string;
  entradas: Entrada[];
  paquetes: RecetaPaquete[];
}

/** Palabras de un texto, sin los signos pegados al principio o al final. */
export function palabras(texto: string): string[] {
  return texto
    .split(/\s+/)
    .map((p) => p.replace(/^[¿¡"«(]+|[.,;:!?"»)]+$/g, ''))
    .filter(Boolean);
}

/** CSV con comillas dobles, como lo exportan las planillas. */
export function leerCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

/** Escribe un CSV que abre bien una planilla: comillas sólo donde hacen falta. */
export function escribirCsv(filas: readonly (readonly string[])[]): string {
  const campo = (c: string) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return filas.map((f) => f.map(campo).join(',')).join('\n') + '\n';
}

const leerJson = <T>(archivo: string): T => JSON.parse(fs.readFileSync(archivo, 'utf8')) as T;

export function leerLenguas(): Lengua[] {
  return leerJson<{ lenguas: Lengua[] }>(path.join(RAIZ_DICCIONARIO, 'lenguas.json')).lenguas;
}

export function leerDiccionario(lengua: Lengua): DiccionarioDeLengua | null {
  if (!lengua.carpeta) return null;
  const dir = path.join(RAIZ_DICCIONARIO, lengua.carpeta);
  const { entradas } = leerJson<{ entradas: Entrada[] }>(path.join(dir, 'lexico.json'));
  const archivoRecetas = path.join(dir, 'ejercicios.json');
  const paquetes = fs.existsSync(archivoRecetas)
    ? leerJson<{ paquetes: RecetaPaquete[] }>(archivoRecetas).paquetes
    : [];
  return { lengua, dir, entradas, paquetes };
}

/**
 * Una entrada se puede usar en un ejercicio si no está marcada para revisar.
 * Todo el léxico sale de fuentes reales (encuestas con permiso, diccionarios
 * publicados o el equipo, en inglés); lo que tiene una duda abierta lleva
 * `revisar` y no llega a ningún estudiante hasta que se resuelva.
 */
export const usable = (e: Entrada) => !e.revisar;

export interface Armado {
  pack: Pack;
  /** Ruta del archivo dentro de `app/content/packs/`. */
  archivo: string;
  /** Por cada ítem, las entradas que usa y los bloques extra. */
  usa: { entradas: string[]; extra: string[] }[];
  /** Problemas al armar (ids que no existen). */
  errores: string[];
}

const letra = (i: number) => (i < 26 ? String.fromCharCode(97 + i) : `z${i - 25}`);
/** Primera letra en mayúscula, saltando los signos de apertura: «¿cómo…» → «¿Cómo…». */
const mayus = (t: string) => t.replace(/^([¿¡"«(]*)(.)/u, (_, signos: string, c: string) => signos + c.toLocaleUpperCase('es'));

/** Arma todos los paquetes de una lengua, con todos sus ítems. */
export function armar(d: DiccionarioDeLengua): Armado[] {
  const porId = new Map(d.entradas.map((e) => [e.id, e]));
  const codigo = d.lengua.codigo;

  return d.paquetes.map((rp) => {
    const id = `${codigo}.${rp.tema}.${rp.nivel}`;
    const skill = `${codigo}.${rp.tema}`;
    const errores: string[] = [];
    const usa: Armado['usa'] = [];

    const entrada = (ref: string, en: string): Entrada => {
      const e = porId.get(ref);
      if (!e) errores.push(`${en}: no hay ninguna entrada «${ref}» en el léxico`);
      return e ?? ({ id: ref, forma: ref, es: ref } as Entrada);
    };

    const items: Item[] = rp.items.map((r, i) => {
      const itemId = `${id}.${letra(i)}`;
      const texto = (e: Entrada) => ((r.mayuscula ?? rp.mayuscula) ? mayus(e.forma) : e.forma);

      if ('armar' in r) {
        const e = entrada(r.armar, itemId);
        const target = texto(e);
        usa.push({ entradas: [e.id], extra: r.extra });
        return { id: itemId, type: 'build', skill, target, blocks: [...palabras(target), ...r.extra], gloss: r.glosa ?? e.es };
      }

      const ref = 'elegir' in r ? r.elegir : r.escuchar;
      const e = entrada(ref, itemId);
      const opciones = r.opciones.map((o) => entrada(o, itemId));
      if (!r.opciones.includes(ref)) errores.push(`${itemId}: la respuesta «${ref}» no está entre las opciones`);
      usa.push({ entradas: [e.id, ...opciones.map((o) => o.id)], extra: [] });
      const answer = texto(e);
      const options = opciones.map(texto);

      if ('elegir' in r) {
        return { id: itemId, type: 'choice', skill, prompt: r.pregunta ?? e.es, answer, options };
      }
      if (!d.lengua.voz) {
        errores.push(`${itemId}: ${d.lengua.nombre} no tiene voz sintética; un ejercicio de escucha necesita grabación`);
      }
      return {
        id: itemId,
        type: 'listen',
        skill,
        tts: textoParaVoz(codigo, answer),
        ttsLang: d.lengua.voz ?? '',
        answer,
        options,
        gloss: r.glosa ?? e.es,
      };
    });

    const pack: Pack = { id, lang: codigo, theme: rp.tema, difficulty: rp.nivel, title: rp.titulo, items };
    return { pack, archivo: `${codigo}/${rp.tema}-${rp.nivel}.json`, usa, errores: [...new Set(errores)] };
  });
}

/**
 * Lo que llega a la app: sólo los ítems cuyas palabras están todas libres de
 * dudas (sin `revisar`). Los ids no cambian al filtrar (salen de la posición en
 * la receta), así que el progreso de un estudiante no se mezcla cuando una
 * palabra sale de revisión y su ítem aparece.
 */
export function paraLaApp(d: DiccionarioDeLengua, armados: Armado[]): Armado[] {
  const porId = new Map(d.entradas.map((e) => [e.id, e]));
  const fichas = new Set(
    d.entradas.filter(usable).flatMap((e) => palabras(e.forma).map((p) => p.toLocaleLowerCase('es'))),
  );
  const listo = (u: Armado['usa'][number]) =>
    u.entradas.every((id) => {
      const e = porId.get(id);
      return e !== undefined && usable(e);
    }) && u.extra.every((x) => fichas.has(x.toLocaleLowerCase('es')));

  return armados
    .map((a) => {
      const items = a.pack.items.filter((_, i) => listo(a.usa[i] as Armado['usa'][number]));
      return { ...a, pack: { ...a.pack, items }, usa: a.usa.filter((u) => listo(u)) };
    })
    .filter((a) => a.pack.items.length > 0);
}

/**
 * El español de una entrada, como respuesta: la primera traducción, sin las
 * aclaraciones entre paréntesis. «pescado, pez» → «pescado»; «mamá (en «mama
 * almuk»)» → «mamá». Las frases quedan enteras, sin el punto final.
 */
export function espanolDe(e: Entrada): string {
  const sin = e.es.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (e.categoria === 'frase' || e.categoria === 'expresion') return sin.replace(/\.$/, '');
  return (sin.split(/[;,]/)[0] ?? '').trim();
}

/**
 * Los paquetes para aprender español desde esta lengua, con las mismas recetas
 * dadas vuelta: la pregunta en la lengua (su `forma`) y la respuesta en español
 * (su traducción del léxico). Sólo con palabras usables, y se salta lo que al
 * darlo vuelta queda ambiguo (dos opciones que en español son la misma
 * palabra) o trivial (una frase para ordenar de una sola palabra).
 *
 * Los ids salen de la posición en la receta, igual que en `armar`.
 */
export function armarAlEspanol(d: DiccionarioDeLengua, vozEspanol: string): Armado[] {
  const porId = new Map(d.entradas.map((e) => [e.id, e]));
  const desde = d.lengua.codigo;
  const clave = (t: string) => t.toLocaleLowerCase('es');

  return d.paquetes
    .map((rp): Armado => {
      const id = `${desde}.spa.${rp.tema}.${rp.nivel}`;
      const skill = `spa.${rp.tema}`;
      const usa: Armado['usa'] = [];
      const listas = (ids: string[]) => {
        const es = ids.map((i) => porId.get(i));
        return es.every((e): e is Entrada => e !== undefined && usable(e)) ? es : null;
      };
      // Las palabras en español de cada ítem del paquete, para despistar al
      // ordenar bloques. La primera va en minúscula: con mayúscula delataría
      // que no es la primera de la frase.
      const espanolDeCadaItem = rp.items.map((r) => {
        const e = porId.get('armar' in r ? r.armar : 'elegir' in r ? r.elegir : r.escuchar);
        const ps = e && usable(e) ? palabras(espanolDe(e)) : [];
        return ps.map((p, k) => (k === 0 ? p.charAt(0).toLocaleLowerCase('es') + p.slice(1) : p));
      });

      const items = rp.items.flatMap((r, i): Item[] => {
        const itemId = `${id}.${letra(i)}`;
        const conMayuscula = r.mayuscula ?? rp.mayuscula;
        const original = (e: Entrada) => (conMayuscula ? mayus(e.forma) : e.forma);
        const espanol = (e: Entrada) => (conMayuscula ? mayus(espanolDe(e)) : espanolDe(e));

        if ('armar' in r) {
          const [e] = listas([r.armar]) ?? [];
          if (!e) return [];
          const objetivo = palabras(espanolDe(e));
          if (objetivo.length < 2) return [];
          const propias = new Set(objetivo.map(clave));
          // Se empieza por el ítem siguiente, así cada frase recibe otros distractores.
          const otras = [...espanolDeCadaItem.slice(i + 1), ...espanolDeCadaItem.slice(0, i)].flat();
          const extra = [...new Map(otras.filter((p) => !propias.has(clave(p))).map((p) => [clave(p), p])).values()].slice(0, 2);
          usa.push({ entradas: [e.id], extra: [] });
          return [{ id: itemId, type: 'build', skill, target: objetivo.join(' '), blocks: [...objetivo, ...extra], gloss: original(e) }];
        }

        const ref = 'elegir' in r ? r.elegir : r.escuchar;
        const es = listas([ref, ...r.opciones]);
        if (!es) return [];
        const [e, ...opciones] = es as [Entrada, ...Entrada[]];
        const answer = espanol(e);
        const options = opciones.map(espanol);
        if (!answer || options.some((o) => !o) || new Set(options.map(clave)).size !== options.length) return [];
        usa.push({ entradas: es.map((x) => x.id), extra: [] });
        if ('elegir' in r) return [{ id: itemId, type: 'choice', skill, prompt: original(e), answer, options }];
        return [{ id: itemId, type: 'listen', skill, tts: answer, ttsLang: vozEspanol, answer, options, gloss: original(e) }];
      });

      const pack: Pack = { id, lang: 'spa', desde, theme: rp.tema, difficulty: rp.nivel, title: rp.titulo, items };
      return { pack, archivo: `spa/desde-${desde}/${rp.tema}-${rp.nivel}.json`, usa, errores: [] };
    })
    .filter((a) => a.pack.items.length > 0);
}
