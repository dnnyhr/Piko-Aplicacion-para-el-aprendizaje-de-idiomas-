/**
 * Reglas de las encuestas de Piko.
 *
 * Este archivo lo cargan dos lados: el navegador (para avisar al momento qué
 * falta) y el Worker (para no confiar en el navegador). Por eso no importa
 * nada y no toca ni el DOM ni D1: recibe objetos, devuelve objetos.
 *
 * Una encuesta es un JSON con secciones, y cada sección con preguntas. Los
 * tipos de pregunta son pocos a propósito — alcanzan para casi todo y cada
 * uno se guarda en D1 de una forma que se puede agrupar con SQL:
 *
 *   unica     una opción              → "opcion"
 *   multiple  varias opciones         → ["opcion", ...]
 *   escala    un número en un rango   → 4
 *   matriz    una escala por fila     → { fila: 4, ... }
 *   texto     texto libre             → "..."
 *   traducir  a cada persona le tocan   → { item: "cómo se dice", ... }
 *             `cuantas` cosas al azar de un `banco` y escribe cómo se dicen
 *             (en la lengua que eligió en la pregunta `lengua`). Las que no
 *             sabe, las deja en blanco.
 */

export const TIPOS = ['unica', 'multiple', 'escala', 'matriz', 'texto', 'traducir'];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[a-z0-9_]+$/;
const TEXTO_MAX = 2000;
/** Largo máximo de una traducción si la pregunta no dice otro. */
const TRADUCCION_MAX = 120;

/** Quita las traducciones en blanco y los espacios de más: dejar una en blanco es "no sé esta". */
export function limpiarTraducciones(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return valor;
  const limpio = {};
  for (const [k, v] of Object.entries(valor)) {
    if (typeof v !== 'string') limpio[k] = v;
    else if (v.trim()) limpio[k] = v.trim().replace(/\s+/g, ' ');
  }
  return limpio;
}

/**
 * Elige `cuantas` cosas del banco al azar (Fisher–Yates). `azar` se puede
 * pasar para las pruebas; en el navegador es Math.random.
 */
export function muestraDelBanco(p, azar = Math.random) {
  const ids = p.banco.map((b) => b.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, p.cuantas);
}

/** Formatos que puede pedir una pregunta de texto. */
export const FORMATOS = ['correo', 'telefono'];

/** Un correo razonable: algo@dominio.tld, sin espacios. No intenta ser el RFC entero. */
export function esCorreo(v) {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** Un teléfono: dígitos con +, espacios, guiones o paréntesis; de 8 a 15 dígitos. */
export function esTelefono(v) {
  if (typeof v !== 'string' || !/^\+?[\d\s().-]+$/.test(v.trim())) return false;
  const digitos = v.replace(/\D/g, '').length;
  return digitos >= 8 && digitos <= 15;
}

/** Todas las preguntas de la encuesta, en orden, sin las secciones. */
export function preguntasDe(def) {
  return (def.secciones ?? []).flatMap((s) => s.preguntas ?? []);
}

function responde(valor) {
  if (valor === undefined || valor === null) return false;
  if (typeof valor === 'string') return valor.trim() !== '';
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === 'object') return Object.keys(valor).length > 0;
  return true;
}

/**
 * ¿Se muestra la pregunta con estas respuestas? Una condición apunta a otra
 * pregunta y a las opciones que la activan. Si la pregunta de la que depende
 * está oculta, esta también: así las cadenas de condiciones no dejan huérfanas.
 */
export function esVisible(def, pregunta, respuestas, _vistas = new Set()) {
  const cond = pregunta.mostrarSi;
  if (!cond) return true;
  if (_vistas.has(pregunta.id)) return false;
  _vistas.add(pregunta.id);

  const origen = preguntasDe(def).find((p) => p.id === cond.pregunta);
  if (!origen || !esVisible(def, origen, respuestas, _vistas)) return false;

  const valor = respuestas[cond.pregunta];
  const elegidas = Array.isArray(valor) ? valor : [valor];
  return elegidas.some((v) => cond.en.includes(v));
}

function opcionOtro(p) {
  return (p.opciones ?? []).find((o) => o.otro);
}

/**
 * Revisa una respuesta suelta. Devuelve un mensaje para la persona, o `null`
 * si está bien. El tono es el de Piko: dice qué falta, no regaña.
 */
export function revisarPregunta(p, valor, otro) {
  if (!responde(valor)) return p.requerida ? 'Esta respuesta nos hace falta.' : null;

  const ids = new Set((p.opciones ?? []).map((o) => o.id));

  switch (p.tipo) {
    case 'unica': {
      if (typeof valor !== 'string' || !ids.has(valor)) return 'Elegí una de las opciones.';
      break;
    }
    case 'multiple': {
      if (!Array.isArray(valor) || valor.some((v) => typeof v !== 'string' || !ids.has(v)))
        return 'Elegí entre las opciones.';
      if (new Set(valor).size !== valor.length) return 'Hay una opción repetida.';
      if (p.min && valor.length < p.min) return `Elegí al menos ${p.min}.`;
      if (p.max && valor.length > p.max) return `Elegí como máximo ${p.max}.`;
      break;
    }
    case 'escala': {
      if (!Number.isInteger(valor) || valor < p.min || valor > p.max)
        return `Marcá un número del ${p.min} al ${p.max}.`;
      break;
    }
    case 'matriz': {
      if (typeof valor !== 'object' || Array.isArray(valor)) return 'Respondé cada fila.';
      const filas = new Set(p.filas.map((f) => f.id));
      for (const [fila, n] of Object.entries(valor)) {
        if (!filas.has(fila)) return 'Hay una fila que no existe.';
        if (!Number.isInteger(n) || n < p.escala.min || n > p.escala.max)
          return `Marcá un número del ${p.escala.min} al ${p.escala.max} en cada fila.`;
      }
      if (p.requerida && Object.keys(valor).length < filas.size) return 'Te faltan algunas filas.';
      break;
    }
    case 'traducir': {
      if (typeof valor !== 'object' || Array.isArray(valor)) return 'Escribí cómo se dice.';
      const banco = new Set(p.banco.map((b) => b.id));
      const max = p.max ?? TRADUCCION_MAX;
      for (const [item, texto] of Object.entries(valor)) {
        if (!banco.has(item)) return 'Hay una palabra que no está en la lista.';
        if (typeof texto !== 'string') return 'Escribí cómo se dice.';
        if (texto.length > max) return `Máximo ${max} caracteres en cada una.`;
      }
      if (Object.keys(valor).length > p.cuantas) return `Son ${p.cuantas} como máximo.`;
      break;
    }
    case 'texto': {
      if (typeof valor !== 'string') return 'Escribí tu respuesta.';
      const max = p.max ?? TEXTO_MAX;
      if (valor.length > max) return `Máximo ${max} caracteres.`;
      if (p.formato === 'correo' && !esCorreo(valor)) return 'Revisá el correo: tiene que ser como nombre@correo.com.';
      if (p.formato === 'telefono' && !esTelefono(valor)) return 'Revisá el número: entre 8 y 15 dígitos, puede empezar con +505.';
      break;
    }
    default:
      return 'Tipo de pregunta desconocido.';
  }

  const o = opcionOtro(p);
  if (o) {
    const eligioOtro = Array.isArray(valor) ? valor.includes(o.id) : valor === o.id;
    if (eligioOtro && !responde(otro)) return 'Contanos cuál es la otra opción.';
    if (typeof otro === 'string' && otro.length > 200) return 'Máximo 200 caracteres.';
  }
  return null;
}

/**
 * Revisa una sección (o toda la encuesta si no se pasa `seccion`). Solo mira
 * las preguntas visibles; lo que venga de preguntas ocultas o inexistentes se
 * descarta en `limpias`, que es lo único que se guarda.
 */
export function revisar(def, respuestas = {}, otros = {}, seccion) {
  const errores = {};
  const limpias = {};
  const otrosLimpios = {};
  const secciones = seccion ? [seccion] : def.secciones;

  for (const s of secciones) {
    for (const p of s.preguntas) {
      if (!esVisible(def, p, respuestas)) continue;
      const valor = p.tipo === 'traducir' ? limpiarTraducciones(respuestas[p.id]) : respuestas[p.id];
      const otro = otros[p.id];
      const error = revisarPregunta(p, valor, otro);
      if (error) {
        errores[p.id] = error;
        continue;
      }
      if (!responde(valor)) continue;
      limpias[p.id] = typeof valor === 'string' ? valor.trim() : valor;
      const o = opcionOtro(p);
      const eligioOtro = o && (Array.isArray(valor) ? valor.includes(o.id) : valor === o.id);
      if (eligioOtro) otrosLimpios[p.id] = String(otro).trim();
    }
  }
  return { ok: Object.keys(errores).length === 0, errores, limpias, otros: otrosLimpios };
}

/**
 * Pasa las respuestas limpias al formato largo de D1: una fila por cada cosa
 * contable. Así "¿cuántos eligieron X?" es un GROUP BY y no hay que abrir JSON.
 */
export function aFilas(def, limpias, otros = {}) {
  const filas = [];
  for (const p of preguntasDe(def)) {
    const v = limpias[p.id];
    if (v === undefined) continue;
    const base = { pregunta: p.id, fila: null, opcion: null, numero: null, texto: null };
    switch (p.tipo) {
      case 'unica':
        filas.push({ ...base, opcion: v, texto: otros[p.id] ?? null });
        break;
      case 'multiple':
        for (const o of v) filas.push({ ...base, opcion: o, texto: otros[p.id] && opcionOtro(p)?.id === o ? otros[p.id] : null });
        break;
      case 'escala':
        filas.push({ ...base, numero: v });
        break;
      case 'matriz':
        for (const [fila, n] of Object.entries(v)) filas.push({ ...base, fila, numero: n });
        break;
      case 'texto':
        filas.push({ ...base, texto: v });
        break;
      case 'traducir':
        for (const [item, texto] of Object.entries(v)) filas.push({ ...base, fila: item, texto });
        break;
    }
  }
  return filas;
}

/**
 * Revisa que la definición de una encuesta esté bien armada antes de
 * publicarla. Devuelve la lista de problemas; vacía si está lista.
 */
export function validarDefinicion(def) {
  const e = [];
  if (!def || typeof def !== 'object') return ['La definición no es un objeto.'];
  if (!SLUG.test(def.slug ?? '')) e.push('slug: solo minúsculas, números y guiones.');
  if (!def.titulo) e.push('titulo: hace falta.');
  if (def.estado && !['borrador', 'abierta', 'cerrada'].includes(def.estado))
    e.push('estado: borrador, abierta o cerrada.');
  if (def.imagen !== undefined && !/^\/img\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/.test(def.imagen))
    e.push('imagen: una ruta dentro de public/img, como /img/og-mi-encuesta.jpg.');
  if (!Array.isArray(def.secciones) || def.secciones.length === 0) {
    e.push('secciones: hace falta al menos una.');
    return e;
  }

  const vistas = new Set();
  const anteriores = new Map();
  for (const [i, s] of def.secciones.entries()) {
    const donde = `secciones[${i}]`;
    if (!s.titulo) e.push(`${donde}.titulo: hace falta.`);
    if (!Array.isArray(s.preguntas) || s.preguntas.length === 0) {
      e.push(`${donde}.preguntas: hace falta al menos una.`);
      continue;
    }
    for (const p of s.preguntas) {
      const q = `pregunta "${p.id}"`;
      if (!ID.test(p.id ?? '')) e.push(`${donde}: id inválido "${p.id}" (minúsculas, números y _).`);
      if (vistas.has(p.id)) e.push(`${q}: id repetido.`);
      vistas.add(p.id);
      if (!p.texto) e.push(`${q}: falta el texto.`);
      if (!TIPOS.includes(p.tipo)) e.push(`${q}: tipo "${p.tipo}" no existe.`);

      if (p.tipo === 'unica' || p.tipo === 'multiple') {
        if (!Array.isArray(p.opciones) || p.opciones.length < 2) e.push(`${q}: necesita al menos 2 opciones.`);
        const ids = new Set();
        for (const o of p.opciones ?? []) {
          if (!ID.test(o.id ?? '') || !o.texto) e.push(`${q}: opción mal formada.`);
          if (ids.has(o.id)) e.push(`${q}: opción repetida "${o.id}".`);
          ids.add(o.id);
        }
        if ((p.opciones ?? []).filter((o) => o.otro).length > 1) e.push(`${q}: solo una opción "otro".`);
      }
      if (p.formato && (p.tipo !== 'texto' || !FORMATOS.includes(p.formato)))
        e.push(`${q}: formato "${p.formato}" no existe (solo en texto: ${FORMATOS.join(', ')}).`);
      if (p.tipo === 'escala' && !(Number.isInteger(p.min) && Number.isInteger(p.max) && p.min < p.max))
        e.push(`${q}: la escala necesita min < max enteros.`);
      if (p.tipo === 'matriz') {
        if (!Array.isArray(p.filas) || p.filas.length === 0) e.push(`${q}: necesita filas.`);
        const ids = new Set();
        for (const f of p.filas ?? []) {
          if (!ID.test(f.id ?? '') || !f.texto) e.push(`${q}: fila mal formada.`);
          if (ids.has(f.id)) e.push(`${q}: fila repetida "${f.id}".`);
          ids.add(f.id);
        }
        const esc = p.escala ?? {};
        if (!(Number.isInteger(esc.min) && Number.isInteger(esc.max) && esc.min < esc.max))
          e.push(`${q}: la escala de la matriz necesita min < max enteros.`);
      }
      if (p.tipo === 'traducir') {
        if (!Array.isArray(p.banco) || p.banco.length === 0) e.push(`${q}: necesita un banco.`);
        const ids = new Set();
        for (const b of p.banco ?? []) {
          if (!ID.test(b.id ?? '') || !b.texto) e.push(`${q}: elemento del banco mal formado "${b.id}".`);
          if (ids.has(b.id)) e.push(`${q}: elemento repetido en el banco "${b.id}".`);
          ids.add(b.id);
          if (p.temas && b.tema && !(b.tema in p.temas)) e.push(`${q}: el tema "${b.tema}" de "${b.id}" no está en temas.`);
        }
        if (!Number.isInteger(p.cuantas) || p.cuantas < 1 || p.cuantas > ids.size)
          e.push(`${q}: cuantas tiene que ser un entero entre 1 y el tamaño del banco.`);
        for (const campo of ['lengua', 'zona']) {
          if (p[campo] && anteriores.get(p[campo])?.tipo !== 'unica')
            e.push(`${q}: ${campo} tiene que apuntar a una pregunta anterior de opción única.`);
        }
      }
      if (p.mostrarSi) {
        const origen = anteriores.get(p.mostrarSi.pregunta);
        if (!origen) e.push(`${q}: mostrarSi apunta a "${p.mostrarSi.pregunta}", que no es una pregunta anterior.`);
        else if (!Array.isArray(p.mostrarSi.en) || p.mostrarSi.en.length === 0)
          e.push(`${q}: mostrarSi.en necesita al menos una opción.`);
        else {
          const ids = new Set((origen.opciones ?? []).map((o) => o.id));
          for (const v of p.mostrarSi.en) if (!ids.has(v)) e.push(`${q}: mostrarSi usa la opción "${v}", que no existe.`);
        }
      }
      anteriores.set(p.id, p);
    }
  }
  if (def.permiso) {
    const p = anteriores.get(def.permiso.pregunta);
    if (p?.tipo !== 'unica' || !p.opciones.some((o) => o.id === def.permiso.valor))
      e.push(`permiso: "${def.permiso.pregunta}" tiene que ser una pregunta de opción única con la opción "${def.permiso.valor}".`);
  }
  if (def.correo) {
    const p = anteriores.get(def.correo.pregunta);
    if (!p || p.formato !== 'correo') e.push(`correo.pregunta: "${def.correo.pregunta}" tiene que ser una pregunta de texto con formato "correo".`);
    if (def.correo.nombre && !anteriores.has(def.correo.nombre)) e.push(`correo.nombre: la pregunta "${def.correo.nombre}" no existe.`);
  }
  return e;
}
