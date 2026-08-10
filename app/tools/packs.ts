/**
 * Lectura de paquetes desde el disco. Sólo para herramientas de Node
 * (el validador y el simulador): la app usa `content/index.ts`, que los
 * importa de forma estática porque Metro no puede recorrer directorios.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePack, type Pack } from '../src/core/content/schema';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ_PACKS = path.resolve(AQUI, '..', 'content', 'packs');

export interface PaqueteLeido {
  archivo: string;
  /** Relativa a `content/packs`, con barras normales. */
  relativa: string;
  pack: Pack | null;
  errores: string[];
}

async function listarJson(dir: string): Promise<string[]> {
  const entradas = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const e of entradas) {
    const completa = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listarJson(completa)));
    else if (e.isFile() && e.name.endsWith('.json')) out.push(completa);
  }
  return out.sort();
}

export async function leerPacks(raiz: string = RAIZ_PACKS): Promise<PaqueteLeido[]> {
  const archivos = await listarJson(raiz);
  const out: PaqueteLeido[] = [];

  for (const archivo of archivos) {
    const relativa = path.relative(raiz, archivo).split(path.sep).join('/');
    let crudo: unknown;
    try {
      crudo = JSON.parse(await fs.readFile(archivo, 'utf8'));
    } catch (err) {
      out.push({
        archivo,
        relativa,
        pack: null,
        errores: [`JSON inválido: ${(err as Error).message}`],
      });
      continue;
    }

    const r = validatePack(crudo);
    out.push(
      r.ok
        ? { archivo, relativa, pack: r.pack, errores: [] }
        : { archivo, relativa, pack: null, errores: r.errors },
    );
  }
  return out;
}

/** Los paquetes válidos. Lanza si alguno no lo es. */
export async function cargarPacks(raiz: string = RAIZ_PACKS): Promise<Pack[]> {
  const leidos = await leerPacks(raiz);
  const rotos = leidos.filter((l) => l.pack === null);
  if (rotos.length > 0) {
    const detalle = rotos.map((r) => `  ${r.relativa}: ${r.errores.join('; ')}`).join('\n');
    throw new Error(`Hay paquetes inválidos:\n${detalle}`);
  }
  return leidos.map((l) => l.pack as Pack);
}
