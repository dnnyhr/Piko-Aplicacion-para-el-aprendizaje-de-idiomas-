/**
 * «Mi forma de aprender»: cómo prefiere usar la app quien la tiene en la mano.
 *
 * Son preferencias y nada más: se pueden combinar como se quiera, ninguna
 * describe a la persona y ninguna sale del teléfono. No viajan en el protocolo
 * del aula ni entran al log de progreso, y por eso no pueden cambiar ni el XP
 * ni las sacuanjoches ni el semáforo del maestro.
 *
 * Funciones puras, sin React ni base de datos, para probarlas en Node.
 */

export const TAMANOS = ['chico', 'normal', 'grande', 'muy_grande'] as const;
export type TamanoTexto = (typeof TAMANOS)[number];

/** Por cuánto se multiplica cada texto. */
export const ESCALA_TEXTO: Record<TamanoTexto, number> = {
  chico: 0.9,
  normal: 1,
  grande: 1.2,
  muy_grande: 1.4,
};

export interface Preferencias {
  tamano: TamanoTexto;
  contraste: boolean;
  /** Piko lee las instrucciones en voz alta. */
  narracion: boolean;
  /** Las instrucciones aparecen divididas en pasos cortos. */
  pasoAPaso: boolean;
  /** Mostrar los recursos en lengua de señas cuando haya. */
  senas: boolean;
}

/** Con esto la app se ve y se comporta igual que siempre. */
export const PREFERENCIAS_INICIALES: Preferencias = {
  tamano: 'normal',
  contraste: false,
  narracion: false,
  pasoAPaso: false,
  senas: false,
};

/** Un paso más grande (+1) o más chico (-1). Se queda en la punta. */
export function tamanoVecino(tamano: TamanoTexto, paso: 1 | -1): TamanoTexto {
  const i = TAMANOS.indexOf(tamano) + paso;
  return TAMANOS[Math.max(0, Math.min(TAMANOS.length - 1, i))] as TamanoTexto;
}

const siNo = (v: unknown, otro: boolean): boolean => (typeof v === 'boolean' ? v : otro);

/**
 * Lo guardado, tolerando cualquier cosa: una versión vieja o un dato dañado no
 * pueden impedir que la app abra. Lo que no se entiende vuelve a su valor inicial.
 */
export function leerPreferencias(guardado: string | null | undefined): Preferencias {
  const base = PREFERENCIAS_INICIALES;
  if (!guardado) return { ...base };
  let o: unknown;
  try {
    o = JSON.parse(guardado);
  } catch {
    return { ...base };
  }
  if (typeof o !== 'object' || o === null) return { ...base };
  const p = o as Record<string, unknown>;
  return {
    tamano: (TAMANOS as readonly unknown[]).includes(p.tamano) ? (p.tamano as TamanoTexto) : base.tamano,
    contraste: siNo(p.contraste, base.contraste),
    narracion: siNo(p.narracion, base.narracion),
    pasoAPaso: siNo(p.pasoAPaso, base.pasoAPaso),
    senas: siNo(p.senas, base.senas),
  };
}

export const escribirPreferencias = (p: Preferencias): string => JSON.stringify(p);
