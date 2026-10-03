/**
 * Cómo se le pasa una palabra miskita a la voz en español del teléfono.
 *
 * Es una copia de `diccionario/herramientas/voz.ts`, que es la fuente: los
 * paquetes traen el texto ya preparado, pero los minijuegos arman sus
 * preguntas en el teléfono y necesitan prepararlo ahí. Metro no puede
 * importar archivos de fuera de `app/`, por eso la copia; `tests/voz.test.ts`
 * comprueba con todo el léxico que las dos digan lo mismo. Si un hablante
 * pide corregir una regla, se corrige allá y se copia acá.
 */

const VOCALES = 'aeiouáéíóú';

/** El texto que se le da a la voz en español para que diga `texto` en miskito. */
export function paraVozEspanola(texto: string): string {
  return texto
    .split(/\s+/)
    .map((p) => p.replace(/[.,;:!?¿¡"«»]/g, ''))
    .filter(Boolean)
    .map(palabra)
    .join(' ');
}

function palabra(original: string): string {
  let p = original
    .toLocaleLowerCase('es')
    // S8: la voz no sabe alargar una vocal; el circunflejo sólo la confundiría.
    .normalize('NFD')
    .replace(/̂/g, '')
    .normalize('NFC');

  // S2: la y al final de palabra suena i (aisaby, duary).
  p = p.replace(/y$/, 'i');
  // S3: la aspiración escrita después de la consonante (yumpha, mitha) va antes.
  p = p.replace(/([ptk])h/g, 'h$1');
  // S3: la h junto a una consonante o al final suena como la j del Caribe.
  p = p.replace(/h(?=[^aeiou]|$)/g, 'j');
  // La w es la u de «huevo»: la voz española a veces la lee «doble u».
  p = p.replace(/w/g, 'u');

  return acentoInicial(p);
}

/** S9: el miskito carga el acento en la primera sílaba. */
function acentoInicial(p: string): string {
  const nucleos = [...p.matchAll(new RegExp(`[${VOCALES}]+`, 'g'))];
  if (nucleos.length < 2 || /[áéíóú]/.test(p)) return p;

  const terminaSuave = /[aeiouns]$/.test(p);
  const tonicaEspanola = terminaSuave ? nucleos.length - 2 : nucleos.length - 1;
  if (tonicaEspanola === 0) return p;

  const primero = nucleos[0] as RegExpMatchArray;
  const grupo = primero[0];
  // En un diptongo la tilde va en la vocal abierta: «ái», «áu».
  const k = /[aeo]/.test(grupo) ? grupo.search(/[aeo]/) : 0;
  const i = (primero.index ?? 0) + k;
  const tilde: Record<string, string> = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
  return p.slice(0, i) + (tilde[p[i] as string] ?? p[i]) + p.slice(i + 1);
}
