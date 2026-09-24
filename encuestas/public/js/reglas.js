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
 */

export const TIPOS = ['unica', 'multiple', 'escala', 'matriz', 'texto'];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[a-z0-9_]+$/;
const TEXTO_MAX = 2000;

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
    case 'texto': {
      if (typeof valor !== 'string') return 'Escribí tu respuesta.';
      const max = p.max ?? TEXTO_MAX;
      if (valor.length > max) return `Máximo ${max} caracteres.`;
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
      const valor = respuestas[p.id];
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
  return e;
}
