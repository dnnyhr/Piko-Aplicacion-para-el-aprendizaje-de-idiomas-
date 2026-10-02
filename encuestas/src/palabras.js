/**
 * Palabras que la gente escribe en las preguntas "traducir": se agrupan las
 * respuestas iguales para ver en qué coincide la gente, y lo que el equipo
 * confirma se exporta en el formato de los paquetes de la app
 * (app/src/core/content/schema.ts).
 *
 * Nada de acá toca D1: recibe filas, devuelve objetos.
 */

/** Con cuántas personas y de cuántas zonas una variante es "probable". */
export const REGLA = { personas: 3, zonas: 2 };

/**
 * La clave con que se agrupan dos respuestas: sin mayúsculas, sin espacios de
 * más, sin los signos del principio y el final ("¡Li!" y "li" son la misma).
 * Los acentos y las letras se respetan: en estas lenguas pueden cambiar la palabra.
 */
export function clavePalabra(texto) {
  return String(texto ?? '')
    .normalize('NFC')
    .toLocaleLowerCase('es')
    .replace(/[“”"«»]/g, '')
    .replace(/^[\s¿¡.,;:!?]+|[\s.,;:!?]+$/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Agrupa las filas de una pregunta traducir.
 *
 * filas: [{ item, texto, grupo, grupoTexto, zona, respuesta }]
 *   grupo      la lengua elegida (id de opción); grupoTexto, lo escrito en "otra"
 *   zona       la zona elegida (id de opción)
 * confirmadas: Set de `${item}|${grupo}|${clave}`
 *
 * Devuelve { grupos: Map(grupo → personas), items: Map(item → Map(grupo → [variante])) }
 * con cada variante como { clave, texto, n, zonas, probable, confirmada },
 * ordenadas de la más dicha a la menos.
 */
export function agrupar(filas, confirmadas = new Set()) {
  const personasPorGrupo = new Map();
  const items = new Map();
  for (const f of filas) {
    const grupo = f.grupo === 'otra' && f.grupoTexto ? `otra:${clavePalabra(f.grupoTexto)}` : f.grupo ?? 'sin_lengua';
    if (!personasPorGrupo.has(grupo)) personasPorGrupo.set(grupo, { personas: new Set(), texto: f.grupoTexto ?? null });
    personasPorGrupo.get(grupo).personas.add(f.respuesta);

    const clave = clavePalabra(f.texto);
    if (!clave) continue;
    if (!items.has(f.item)) items.set(f.item, new Map());
    const porGrupo = items.get(f.item);
    if (!porGrupo.has(grupo)) porGrupo.set(grupo, new Map());
    const variantes = porGrupo.get(grupo);
    if (!variantes.has(clave)) variantes.set(clave, { clave, formas: new Map(), personas: new Set(), zonas: new Set() });
    const v = variantes.get(clave);
    v.personas.add(f.respuesta);
    if (f.zona) v.zonas.add(f.zona);
    const forma = f.texto.trim();
    v.formas.set(forma, (v.formas.get(forma) ?? 0) + 1);
  }

  const salida = new Map();
  for (const [item, porGrupo] of items) {
    const g = new Map();
    for (const [grupo, variantes] of porGrupo) {
      g.set(
        grupo,
        [...variantes.values()]
          .map((v) => ({
            clave: v.clave,
            // Se muestra la forma más escrita tal cual (con su mayúscula, si la tenía).
            texto: [...v.formas.entries()].sort((a, b) => b[1] - a[1])[0][0],
            n: v.personas.size,
            zonas: v.zonas.size,
            probable: v.personas.size >= REGLA.personas && v.zonas.size >= REGLA.zonas,
            confirmada: confirmadas.has(`${item}|${grupo}|${v.clave}`),
          }))
          .sort((a, b) => b.n - a.n || b.zonas - a.zonas || a.texto.localeCompare(b.texto)),
      );
    }
    salida.set(item, g);
  }
  const grupos = new Map([...personasPorGrupo].map(([k, v]) => [k, { personas: v.personas.size, texto: v.texto }]));
  return { grupos, items: salida };
}

/** Separa una oración en palabras, igual que la app (`words` en schema.ts). */
const palabrasDe = (oracion) => oracion.trim().split(/\s+/).filter(Boolean);

/**
 * Arma los paquetes de la app con lo confirmado de una lengua.
 *
 * confirmadas: [{ pregunta, item, texto }] — la primera de cada ítem es la respuesta.
 * preguntas: las definiciones de las preguntas traducir (con banco y temas).
 *
 * - Una pregunta con temas (las palabras) da un paquete de "choice" por tema:
 *   "¿Cómo se dice «agua»?" con la respuesta y hasta 3 opciones más del mismo
 *   tema. Hacen falta al menos 2 palabras confirmadas en el tema.
 * - Una pregunta sin temas (las frases) da un paquete de "build": ordenar los
 *   bloques de la frase, con hasta 2 palabras de otras frases como distractores.
 */
export function armarPaquetes({ codigo, lengua, preguntas, confirmadas }) {
  const paquetes = [];
  for (const p of preguntas) {
    const porItem = new Map();
    for (const c of confirmadas) if (c.pregunta === p.id && !porItem.has(c.item)) porItem.set(c.item, c.texto.trim());
    const banco = p.banco.filter((b) => porItem.has(b.id));
    if (!banco.length) continue;

    if (p.temas) {
      for (const [tema, titulo] of Object.entries(p.temas)) {
        const del = banco.filter((b) => b.tema === tema);
        const respuestas = [...new Set(del.map((b) => porItem.get(b.id)))];
        if (respuestas.length < 2) continue;
        const items = del.map((b, i) => {
          const answer = porItem.get(b.id);
          // Distractores fijos (no al azar) para que exportar dos veces dé lo mismo.
          const otras = respuestas.filter((r) => r !== answer);
          const options = [answer, ...[...otras.slice(i % otras.length), ...otras.slice(0, i % otras.length)].slice(0, 3)];
          return { id: `${codigo}-${tema}-${b.id}`, skill: `${codigo}.${tema}`, type: 'choice', prompt: `¿Cómo se dice «${b.texto}»?`, answer, options };
        });
        paquetes.push({ id: `${codigo}-${tema}`, lang: codigo, theme: tema, difficulty: 1, title: `${titulo} en ${lengua}`, items });
      }
    } else {
      const todas = banco.map((b) => porItem.get(b.id));
      const items = banco
        .map((b, i) => {
          const target = porItem.get(b.id);
          const propias = palabrasDe(target);
          if (propias.length < 2) return null;
          const ajenas = [...new Set(todas.filter((_, j) => j !== i).flatMap(palabrasDe))].filter((w) => !propias.includes(w)).slice(0, 2);
          return { id: `${codigo}-frases-${b.id}`, skill: `${codigo}.frases`, type: 'build', target, blocks: [...propias, ...ajenas], gloss: b.texto };
        })
        .filter(Boolean);
      if (items.length) paquetes.push({ id: `${codigo}-${p.id}`, lang: codigo, theme: p.id, difficulty: 1, title: `Frases en ${lengua}`, items });
    }
  }
  return paquetes;
}
