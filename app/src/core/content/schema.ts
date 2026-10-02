/**
 * Formato de los paquetes de contenido.
 *
 * Todo el contenido de Piko es data, no código: un lingüista o un maestro
 * puede escribir un paquete sin tocar la app. `validatePack` es el contrato
 * que ese archivo tiene que cumplir, y `tools/validate-packs.ts` lo corre
 * sobre todo `content/packs/`.
 */

/** ISO 639-3. `eng` es el único con contenido verificado hoy. */
export const LANGS = ['eng', 'miq', 'sum', 'rma', 'cab'] as const;
export type LangCode = (typeof LANGS)[number];

export const LANG_NOMBRE: Record<LangCode, string> = {
  eng: 'Inglés',
  miq: 'Miskito',
  sum: 'Mayangna',
  rma: 'Rama',
  cab: 'Garífuna',
};

export type Difficulty = 1 | 2 | 3;
export type ItemType = 'choice' | 'listen' | 'build';

interface ItemBase {
  id: string;
  /** Unidad de dominio para el motor de progreso, p. ej. `eng.saludos`. */
  skill: string;
}

/** Traducción por selección múltiple. */
export interface ChoiceItem extends ItemBase {
  type: 'choice';
  /** Lo que se le muestra al estudiante, en español. */
  prompt: string;
  /** Respuesta correcta, en la lengua meta. */
  answer: string;
  /** Incluye la respuesta correcta; el orden se baraja al presentar. */
  options: string[];
}

/**
 * Comprensión auditiva: se escucha y se elige.
 *
 * La fuente del sonido puede ser una grabación (`audio`) o la síntesis de voz
 * del sistema (`tts`). Para inglés alcanza el TTS que ya trae Android. Para
 * miskito se admite la voz en español **para mientras**, mientras se consiguen
 * grabaciones de hablantes (decisión 16); mayangna, rama y garífuna no tienen
 * síntesis y necesitan grabaciones.
 */
export interface ListenItem extends ItemBase {
  type: 'listen';
  /** Ruta relativa dentro de `content/audio/`. */
  audio?: string;
  /** Texto a sintetizar y código BCP-47 de la voz, p. ej. `en-US`. */
  tts?: string;
  ttsLang?: string;
  answer: string;
  options: string[];
  /** Significado en español, se revela después de responder. */
  gloss: string;
}

/** Construcción de oraciones ordenando bloques de palabras. */
export interface BuildItem extends ItemBase {
  type: 'build';
  /** Oración correcta en la lengua meta. */
  target: string;
  /** Bloques ofrecidos: los de `target` más distractores. */
  blocks: string[];
  /** Significado en español. */
  gloss: string;
}

export type Item = ChoiceItem | ListenItem | BuildItem;

export interface Pack {
  id: string;
  lang: LangCode;
  theme: string;
  difficulty: Difficulty;
  title: string;
  items: Item[];
}

export type ValidationResult =
  | { ok: true; pack: Pack }
  | { ok: false; errors: string[] };

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isStrArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length > 0 && v.every(isStr);

/** Divide una oración meta en palabras, ignorando espacios de más. */
export function words(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter((w) => w.length > 0);
}

/**
 * Con qué voz sintética se puede hacer sonar cada lengua.
 *
 * Inglés, con la suya. Miskito, con la voz en español **para mientras**, hasta
 * tener grabaciones de hablantes: su escritura se lee casi como el español,
 * pero no del todo (la h aspirada, las vocales largas). Por eso la palabra se
 * le pasa a la voz ya preparada; ver `diccionario/herramientas/voz.ts` y la
 * decisión 16. Mayangna, rama y garífuna no tienen ninguna: hacerlas hablar
 * con otra voz sería enseñar una pronunciación falsa.
 */
const VOZ_SINTETICA: Readonly<Record<string, (ttsLang: string) => boolean>> = {
  eng: (l) => l.startsWith('en'),
  miq: (l) => l.startsWith('es'),
};

function validateItem(raw: unknown, at: string, errors: string[], lang: unknown): Item | null {
  if (typeof raw !== 'object' || raw === null) {
    errors.push(`${at}: no es un objeto`);
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (!isStr(o.id)) {
    errors.push(`${at}: falta \`id\``);
    return null;
  }
  if (!isStr(o.skill)) errors.push(`${at}: falta \`skill\``);

  switch (o.type) {
    case 'choice': {
      if (!isStr(o.prompt)) errors.push(`${at}: falta \`prompt\``);
      if (!isStr(o.answer)) errors.push(`${at}: falta \`answer\``);
      if (!isStrArray(o.options)) errors.push(`${at}: \`options\` debe ser texto no vacío`);
      else {
        if (o.options.length < 2) errors.push(`${at}: hacen falta al menos 2 opciones`);
        if (isStr(o.answer) && !o.options.includes(o.answer)) {
          errors.push(`${at}: \`answer\` no está entre las \`options\``);
        }
        if (new Set(o.options).size !== o.options.length) {
          errors.push(`${at}: hay \`options\` repetidas`);
        }
      }
      break;
    }

    case 'listen': {
      if (!isStr(o.audio) && !isStr(o.tts)) {
        errors.push(`${at}: necesita \`audio\` (grabación) o \`tts\` (síntesis)`);
      }
      if (isStr(o.tts) && !isStr(o.ttsLang)) {
        errors.push(`${at}: con \`tts\` hace falta \`ttsLang\` (p. ej. "en-US")`);
      }
      if (isStr(o.tts) && isStr(o.ttsLang) && isStr(lang)) {
        const permitida = VOZ_SINTETICA[lang];
        if (!permitida) {
          errors.push(
            `${at}: ${lang} no tiene síntesis de voz; este ítem necesita una grabación de hablante en \`audio\``,
          );
        } else if (!permitida(o.ttsLang)) {
          errors.push(`${at}: ${lang} no se puede hacer sonar con la voz ${o.ttsLang}`);
        }
      }
      if (!isStr(o.answer)) errors.push(`${at}: falta \`answer\``);
      if (!isStr(o.gloss)) errors.push(`${at}: falta \`gloss\``);
      if (!isStrArray(o.options)) errors.push(`${at}: \`options\` debe ser texto no vacío`);
      else {
        if (o.options.length < 2) errors.push(`${at}: hacen falta al menos 2 opciones`);
        if (isStr(o.answer) && !o.options.includes(o.answer)) {
          errors.push(`${at}: \`answer\` no está entre las \`options\``);
        }
      }
      break;
    }

    case 'build': {
      if (!isStr(o.target)) errors.push(`${at}: falta \`target\``);
      if (!isStr(o.gloss)) errors.push(`${at}: falta \`gloss\``);
      if (!isStrArray(o.blocks)) errors.push(`${at}: \`blocks\` debe ser texto no vacío`);
      else if (isStr(o.target)) {
        // Cada palabra de la oración tiene que existir como bloque, contándolas:
        // si "sa" aparece dos veces en la oración, tienen que ofrecerse dos.
        const disponibles = new Map<string, number>();
        for (const b of o.blocks) disponibles.set(b, (disponibles.get(b) ?? 0) + 1);
        for (const w of words(o.target)) {
          const n = disponibles.get(w) ?? 0;
          if (n === 0) errors.push(`${at}: la palabra "${w}" de \`target\` no está en \`blocks\``);
          else disponibles.set(w, n - 1);
        }
      }
      break;
    }

    default:
      errors.push(`${at}: \`type\` desconocido (${String(o.type)})`);
      return null;
  }

  return errors.length === 0 ? (o as unknown as Item) : (o as unknown as Item);
}

export function validatePack(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, errors: ['el paquete no es un objeto'] };
  }
  const o = raw as Record<string, unknown>;

  if (!isStr(o.id)) errors.push('falta `id`');
  if (!isStr(o.title)) errors.push('falta `title`');
  if (!isStr(o.theme)) errors.push('falta `theme`');
  if (!isStr(o.lang) || !(LANGS as readonly string[]).includes(o.lang)) {
    errors.push(`\`lang\` inválido (${String(o.lang)}); se espera uno de ${LANGS.join(', ')}`);
  }
  if (o.difficulty !== 1 && o.difficulty !== 2 && o.difficulty !== 3) {
    errors.push('`difficulty` debe ser 1, 2 o 3');
  }
  if (!Array.isArray(o.items)) {
    errors.push('falta `items`');
    return { ok: false, errors };
  }

  const vistos = new Set<string>();
  o.items.forEach((it, i) => {
    const item = validateItem(it, `items[${i}]`, errors, o.lang);
    if (item) {
      if (vistos.has(item.id)) errors.push(`items[${i}]: \`id\` repetido (${item.id})`);
      vistos.add(item.id);
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, pack: o as unknown as Pack };
}
