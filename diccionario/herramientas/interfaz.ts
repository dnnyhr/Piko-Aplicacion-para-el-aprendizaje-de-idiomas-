/**
 * La interfaz de la app en otra lengua.
 *
 * El catálogo de referencia es el español (`app/src/ui/textos/es.ts`). La
 * traducción vive en `diccionario/<lengua>/interfaz.csv`, una planilla con una
 * fila por texto:
 *
 *   clave, es, miq, notas
 *
 * La llena un hablante en la columna de su lengua. `npm run contenido` la
 * mantiene al día con el catálogo (agrega las filas nuevas y actualiza la
 * columna `es`, sin tocar lo traducido) y vuelca lo traducido en
 * `app/src/ui/textos/<código>.ts`. Lo que queda vacío se muestra en español.
 *
 * Las frases de Piko son listas: van una por fila, `piko.acierto#1`,
 * `piko.acierto#2`… La traducción no tiene que tener la misma cantidad.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ES } from '../../app/src/ui/textos/es';
import { escribirCsv, leerCsv, RAIZ_DICCIONARIO, type Lengua } from './recetas';

/** Las lenguas en que puede estar la app, además del español. */
const IDIOMAS = new Set(['miq']);

const TEXTOS = path.resolve(RAIZ_DICCIONARIO, '..', 'app', 'src', 'ui', 'textos');

/** Ayudas para quien traduce, por clave. */
const NOTAS: Record<string, string> = {
  'portada.practicar': 'Botón: practicar sin maestro, en el propio teléfono.',
  'portada.lengua_app': 'Va antes de los botones «Español» y «Miskitu».',
  'maestro.aviso_1': 'Las tres partes forman una sola oración: «Encendé el **punto de acceso** (hotspot)…». La del medio va en negrita.',
  'maestro.aviso_negrita': 'Ver maestro.aviso_1.',
  'maestro.aviso_2': 'Ver maestro.aviso_1.',
  'maestro.conectado': 'Una sola persona conectada.',
  'maestro.conectados': 'Varias personas conectadas.',
  'piko.intento': 'Piko nunca dice «mal», «incorrecto» ni «no»: reconoce el intento y muestra la respuesta.',
  'piko.acierto': 'Cuando acierta. Pueden ser más o menos frases que en español.',
};

function notaDe(clave: string, es: string): string {
  const base = NOTAS[clave.replace(/#\d+$/, '')] ?? '';
  const marcas = es.match(/\{\w+\}/g);
  const aviso = marcas ? `Dejar ${marcas.join(' y ')} tal cual: ahí la app pone un valor.` : '';
  return [base, aviso].filter(Boolean).join(' ');
}

/** Las filas del catálogo en español, en orden. */
function filasDelCatalogo(): { clave: string; es: string }[] {
  return Object.entries(ES).flatMap(([clave, v]) =>
    typeof v === 'string' ? [{ clave, es: v }] : (v as readonly string[]).map((es, i) => ({ clave: `${clave}#${i + 1}`, es })),
  );
}

/**
 * Los archivos que tienen que quedar: la planilla al día y el catálogo de la
 * app. Ruta absoluta → texto. Vacío si la lengua no es una lengua de la app.
 */
export function archivosDeInterfaz(lengua: Lengua, dir: string): Map<string, string> {
  const salida = new Map<string, string>();
  if (!IDIOMAS.has(lengua.codigo)) return salida;
  const codigo = lengua.codigo;
  const archivo = path.join(dir, 'interfaz.csv');

  // Lo que ya está traducido, por clave.
  const previas = new Map<string, { traduccion: string; nota: string }>();
  if (fs.existsSync(archivo)) {
    const [cabecera, ...filas] = leerCsv(fs.readFileSync(archivo, 'utf8'));
    const col = (n: string) => cabecera?.indexOf(n) ?? -1;
    const [cClave, cTrad, cNota] = [col('clave'), col(codigo), col('notas')];
    for (const f of filas) {
      const clave = f[cClave] ?? '';
      if (clave) previas.set(clave, { traduccion: (f[cTrad] ?? '').trim(), nota: f[cNota] ?? '' });
    }
  }

  const filas = filasDelCatalogo().map(({ clave, es }) => {
    const previa = previas.get(clave);
    return [clave, es, previa?.traduccion ?? '', previa?.nota || notaDe(clave, es)];
  });
  salida.set(archivo, escribirCsv([['clave', 'es', codigo, 'notas'], ...filas]));

  // Lo traducido, agrupando las listas.
  const catalogo = new Map<string, string | string[]>();
  for (const [clave = '', , trad = ''] of filas) {
    if (!trad) continue;
    const [base = '', n] = clave.split('#');
    if (n === undefined) catalogo.set(base, trad);
    else catalogo.set(base, [...((catalogo.get(base) as string[] | undefined) ?? []), trad]);
  }
  const constante = codigo.toUpperCase();
  const cuerpo = [...catalogo]
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${Array.isArray(v) ? `[${v.map((x) => JSON.stringify(x)).join(', ')}]` : JSON.stringify(v)},`)
    .join('\n');
  salida.set(
    path.join(TEXTOS, `${codigo}.ts`),
    `/**
 * La interfaz en ${lengua.nombre.toLowerCase()}.
 *
 * GENERADO por \`npm run contenido\` desde \`diccionario/${lengua.carpeta}/interfaz.csv\`:
 * no se edita a mano. Lo que falta acá se muestra en español.
 */

import type { CatalogoParcial } from './traducir';

export const ${constante}: CatalogoParcial = {${cuerpo ? `\n${cuerpo}\n` : ''}};
`,
  );
  return salida;
}

/** Cuántos textos tiene traducidos la planilla, para el resumen. */
export function avanceDeInterfaz(texto: string, codigo: string): { traducidos: number; total: number } {
  const [cabecera, ...filas] = leerCsv(texto);
  const c = cabecera?.indexOf(codigo) ?? -1;
  return { traducidos: filas.filter((f) => (f[c] ?? '').trim()).length, total: filas.length };
}
