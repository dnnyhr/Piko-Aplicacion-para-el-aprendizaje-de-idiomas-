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
}

export interface Entrada {
  id: string;
  forma: string;
  registrado: string[];
  es: string;
  categoria: string;
  tema: string;
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
  /** Nombre del archivo en `app/content/packs/<codigo>/`. */
  archivo: string;
  /** Por cada ítem, las entradas que usa y los bloques extra. */
  usa: { entradas: string[]; extra: string[] }[];
  /** Problemas al armar (ids que no existen). */
  errores: string[];
}

const letra = (i: number) => (i < 26 ? String.fromCharCode(97 + i) : `z${i - 25}`);
const mayus = (t: string) => t.charAt(0).toLocaleUpperCase('es') + t.slice(1);

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
    return { pack, archivo: `${rp.tema}-${rp.nivel}.json`, usa, errores: [...new Set(errores)] };
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
