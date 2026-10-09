/**
 * Qué se captura y qué se vuelve componente.
 *
 * CATALOGO: los componentes de React de la app que en Figma se vuelven
 * componentes reutilizables. `variantes` decide, a partir de los props reales
 * con los que se montó cada uno, en qué variante del component set cae.
 *
 * PANTALLAS: el recorrido por la app. Va en orden porque el estado se
 * arrastra: primero se juega una lección, así el perfil, el madroño y los
 * logros ya tienen algo que mostrar.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'app');

/** El primer párrafo del comentario de cabecera del archivo, como descripción. */
function doc(ruta, funcion) {
  try {
    const src = readFileSync(join(APP, ruta), 'utf8');
    let m = null;
    if (funcion) {
      const i = src.indexOf(`export function ${funcion}`);
      const antes = i > 0 ? src.slice(0, i) : '';
      const j = antes.lastIndexOf('/**');
      if (j >= 0 && antes.slice(j).trim().endsWith('*/')) m = antes.slice(j);
    }
    if (!m) m = (src.match(/\/\*\*[\s\S]*?\*\//) || [''])[0];
    return m
      .replace(/^\/\*\*|\*\/$/g, '')
      .split('\n')
      .map((l) => l.replace(/^\s*\* ?/, ''))
      .join('\n')
      .trim()
      .split(/\n\s*\n/)[0]
      .replace(/\s*\n\s*/g, ' ');
  } catch {
    return '';
  }
}

const NOMBRES_COLOR = {
  '#97C137': 'verdePasto',
  '#61A66B': 'verdeHoja',
  '#E8A429': 'pico',
  '#60C5FA': 'cielo',
};

export const CATALOGO = {
  Boton: {
    nombre: 'Botón',
    grupo: 'Acciones',
    fuente: 'src/ui/components/Boton.tsx',
    variantes: (p) => ({
      Tono: p.tono ?? 'verde',
      Tamaño: p.chico ? 'chico' : 'normal',
      Estado: p.disabled ? 'deshabilitado' : 'activo',
    }),
  },
  Opcion: {
    nombre: 'Opción',
    grupo: 'Ejercicios',
    fuente: 'src/ui/components/Opcion.tsx',
    variantes: (p) => ({
      Estado: p.estado ?? 'normal',
      Atajo: p.indice !== undefined ? 'con número' : 'sin número',
    }),
  },
  Bloque: {
    nombre: 'Ficha de palabra',
    grupo: 'Ejercicios',
    fuente: 'src/ui/components/Bloque.tsx',
    variantes: (p) => ({ Estado: p.fantasma ? 'hueco' : 'normal' }),
  },
  Globo: {
    nombre: 'Globo de diálogo',
    grupo: 'Piko',
    fuente: 'src/ui/components/Globo.tsx',
    variantes: (p) => ({ Cola: p.hacia ?? 'izquierda' }),
  },
  BarraProgreso: {
    nombre: 'Barra de progreso',
    grupo: 'Progreso',
    fuente: 'src/ui/components/BarraProgreso.tsx',
    variantes: (p) => ({
      Tono: NOMBRES_COLOR[(p.tono ?? '#97C137').toUpperCase()] ?? p.tono,
      Avance: `${Math.round(Math.max(0, Math.min(1, p.valor ?? 0)) * 100)}%`,
    }),
  },
  BarraFeedback: {
    nombre: 'Barra de respuesta',
    grupo: 'Ejercicios',
    fuente: 'src/features/exercises/BarraFeedback.tsx',
    variantes: (p) => ({ Resultado: p.acerto ? 'acierto' : 'intento' }),
  },
  PikoMascota: {
    nombre: 'Piko',
    grupo: 'Piko',
    fuente: 'src/ui/piko/PikoMascota.tsx',
    variantes: (p) => ({ Estado: p.estado ?? 'idle' }),
  },
  ContadorSacuanjoches: {
    nombre: 'Contador de sacuanjoches',
    grupo: 'Progreso',
    fuente: 'src/ui/arbol/ContadorSacuanjoches.tsx',
    variantes: () => ({}),
  },
  Sacuanjoche: {
    nombre: 'Sacuanjoche',
    grupo: 'Ilustraciones',
    fuente: 'src/ui/arbol/Sacuanjoche.tsx',
    variantes: () => ({}),
  },
  MiniaturaArbol: {
    nombre: 'Madroño miniatura',
    grupo: 'Ilustraciones',
    fuente: 'src/ui/arbol/MiniaturaArbol.tsx',
    variantes: (p) => ({ Etapa: p.etapa ?? 'semilla' }),
  },
  ArbolMadrono: {
    nombre: 'Madroño',
    grupo: 'Ilustraciones',
    fuente: 'src/ui/arbol/ArbolMadrono.tsx',
    variantes: (p) => ({ Sacuanjoches: String(p.sacuanjoches ?? 0) }),
  },
  Insignia: {
    nombre: 'Insignia de logro',
    grupo: 'Logros',
    fuente: 'src/ui/logros/Insignia.tsx',
    variantes: (p) => ({
      Logro: p.logro?.id ?? 'logro',
      Estado: p.desbloqueado ? 'ganada' : p.proximamente ? 'próximamente' : 'bloqueada',
    }),
  },
  Instrumento: {
    nombre: 'Instrumento',
    grupo: 'Ilustraciones',
    fuente: 'src/ui/musica/Instrumento.tsx',
    variantes: (p) => ({ Dibujo: p.imagen?.id ?? String(p.imagen ?? 'nota') }),
  },
  IconoGallinita: { nombre: 'Ícono · Gallinita ciega', grupo: 'Íconos', fuente: 'src/ui/minijuegos/Iconos.tsx', variantes: () => ({}) },
  IconoChibolas: { nombre: 'Ícono · Chibolas', grupo: 'Íconos', fuente: 'src/ui/minijuegos/Iconos.tsx', variantes: () => ({}) },
  IconoTrompo: { nombre: 'Ícono · Trompo', grupo: 'Íconos', fuente: 'src/ui/minijuegos/Iconos.tsx', variantes: () => ({}) },
  IconoRayuela: { nombre: 'Ícono · Rayuela', grupo: 'Íconos', fuente: 'src/ui/minijuegos/IconoRayuela.tsx', variantes: () => ({}) },
  Dato: {
    nombre: 'Tarjeta de dato',
    grupo: 'Progreso',
    fuente: 'app/perfil.tsx',
    descripcion: 'Un número grande con su etiqueta: lecciones, XP, racha, correctas.',
    variantes: () => ({}),
  },
  Paso: {
    nombre: 'Paso del ciclo',
    grupo: 'Progreso',
    fuente: 'app/arbol.tsx',
    descripcion: 'Número en círculo verde y una acción corta: el ciclo aprender → sacuanjoches → árbol → Piko sube.',
    variantes: () => ({}),
  },
};

// ── Patrones (no son componentes de React, pero se repiten) ──────────────

const hexDe = (c) => (c ? c.hex : null);
const r0 = (n) => (n.radios ? n.radios[0] : 0);
const pesos = (n) => (n.trazo ? n.trazo.pesos.join(',') : '');
const contiene = (n, id) => (n.hijos ?? []).some((h) => (h.comp && h.comp.id === id) || contiene(h, id));
const soloTexto = (n) => n.hijos?.length === 1 && n.hijos[0].tipo === 'TEXT';

Object.assign(CATALOGO, {
  BotonCircular: {
    nombre: 'Botón circular',
    grupo: 'Acciones',
    fuente: 'app/minijuegos/index.tsx',
    descripcion: 'Botón redondo de 44 × 44 con un ícono: volver atrás en los encabezados.',
    patron: (n) => n.toca && Math.round(n.w) === 44 && Math.round(n.h) === 44 && r0(n) >= 21,
    variantes: () => ({}),
  },
  ChipIdioma: {
    nombre: 'Chip de idioma',
    grupo: 'Acciones',
    fuente: 'app/index.tsx',
    descripcion: 'Selector de la lengua de la interfaz (Español / Miskitu). El elegido va relleno de verde.',
    patron: (n) => n.toca && soloTexto(n) && Math.abs(r0(n) - n.h / 2) < 1 && n.h >= 30 && n.h <= 40,
    variantes: (n) => ({ Estado: hexDe(n.fondo) === '#0F5D3D' ? 'elegido' : 'normal' }),
  },
  EtiquetaLengua: {
    nombre: 'Etiqueta de lengua',
    grupo: 'Acciones',
    fuente: 'app/index.tsx',
    descripcion: 'Píldora informativa con el nombre de cada lengua que enseña Piko. No es tocable.',
    patron: (n) => !n.toca && soloTexto(n) && hexDe(n.trazo) === '#0F5D3D' && Math.abs(r0(n) - n.h / 2) < 1,
    variantes: () => ({}),
  },
  Encabezado: {
    nombre: 'Encabezado de pantalla',
    grupo: 'Encabezados',
    fuente: 'app/minijuegos/index.tsx',
    descripcion: 'Volver + título + contador de sacuanjoches (que lleva al perfil). Encabeza Minijuegos y La Música de Piko.',
    patron: (n) => n.al?.modo === 'H' && n.hijos?.[0]?.comp?.id === 'BotonCircular' && contiene(n, 'ContadorSacuanjoches'),
    variantes: () => ({}),
  },
  TarjetaAcceso: {
    nombre: 'Tarjeta de acceso',
    grupo: 'Tarjetas',
    fuente: 'app/index.tsx',
    descripcion: 'Fila tocable con ícono, título, subtítulo y un dato a la derecha: lleva al madroño y a los logros desde el inicio.',
    patron: (n) => n.toca && n.al?.modo === 'H' && hexDe(n.fondo) === '#FFFFFF' && r0(n) === 20 && pesos(n) === '2,2,2,2',
    variantes: () => ({}),
  },
  TarjetaMinijuego: {
    nombre: 'Tarjeta de minijuego',
    grupo: 'Tarjetas',
    fuente: 'app/minijuegos/index.tsx',
    descripcion: 'Ícono del juego, nombre, descripción y el botón «Jugar». Lleva el labio inferior de 6 px.',
    patron: (n) => r0(n) === 28 && pesos(n) === '2,2,6,2' && contiene(n, 'Boton') && /Icono/.test(JSON.stringify(n)),
    variantes: () => ({}),
  },
  TarjetaCancion: {
    nombre: 'Tarjeta de canción',
    grupo: 'Tarjetas',
    fuente: 'app/musica/index.tsx',
    descripcion: 'Instrumento, título, lengua y región, nivel y el botón para cantar.',
    patron: (n) => r0(n) === 28 && pesos(n) === '2,2,6,2' && contiene(n, 'Instrumento'),
    variantes: () => ({}),
  },
  CeldaLogro: {
    nombre: 'Celda de logro',
    grupo: 'Tarjetas',
    fuente: 'app/logros/index.tsx',
    descripcion: 'Insignia + nombre + avance. Ganada a color, pendiente en gris con candado, especial en azul y oro.',
    patron: (n) => n.toca && r0(n) === 16 && pesos(n) === '2,2,4,2' && contiene(n, 'Insignia'),
    variantes: (n) => ({ Estado: hexDe(n.fondo) === '#14528F' ? 'especial' : hexDe(n.fondo) === '#FFFFFF' ? 'ganada' : 'pendiente' }),
  },
  TarjetaEtapa: {
    nombre: 'Etapa del madroño',
    grupo: 'Tarjetas',
    fuente: 'app/arbol.tsx',
    descripcion: 'Una etapa del camino de semilla a árbol florecido; la actual se resalta en verde.',
    patron: (n) => n.al?.modo === 'H' && r0(n) === 16 && contiene(n, 'MiniaturaArbol') && contiene(n, 'Sacuanjoche'),
    variantes: (n) => ({ Estado: hexDe(n.fondo) === '#EDF8D9' ? 'actual' : 'normal' }),
  },
  Aviso: {
    nombre: 'Aviso informativo',
    grupo: 'Tarjetas',
    fuente: 'app/maestro/index.tsx',
    descripcion: 'Bloque celeste con título y texto para instrucciones importantes (antes de abrir la sala).',
    patron: (n) => hexDe(n.fondo) === '#DDF1FC' && !n.trazo && n.al?.modo === 'V' && (n.hijos ?? []).every((h) => h.tipo === 'TEXT') && n.hijos.length >= 2,
    variantes: () => ({}),
  },
  CampoCodigo: {
    nombre: 'Campo de código',
    grupo: 'Formularios',
    fuente: 'app/logros/canjear.tsx',
    descripcion: 'Formulario de canje: etiqueta, campo de texto grande y el formato esperado debajo.',
    patron: (n) => hexDe(n.fondo) === '#0B3D6E' && (n.hijos ?? []).some((h) => h.campo),
    variantes: () => ({}),
  },
  Campo: {
    nombre: 'Campo de texto',
    grupo: 'Formularios',
    fuente: 'app/logros/canjear.tsx',
    descripcion: 'Entrada de texto: fondo blanco, radio 16, texto Fredoka centrado. El texto de ayuda va en gris.',
    patron: (n) => !!n.campo,
    variantes: () => ({}),
  },
});

for (const c of Object.values(CATALOGO)) {
  if (!c.descripcion) c.descripcion = doc(c.fuente);
}

const continuar = async (app) => {
  for (const t of ['Continuar', 'Terminar']) {
    try {
      await app.presionar('Boton', t);
      await app.esperar(300);
      return;
    } catch {
      /* el otro */
    }
  }
};

/** Avanza la ronda (respondiendo bien) hasta un ejercicio del tipo pedido. */
async function avanzarHasta(app, tipo, max = 12) {
  for (let i = 0; i < max; i++) {
    const e = await app.ejercicio();
    if (!e) return null;
    if (e.revelado) {
      await continuar(app);
      continue;
    }
    if (e.tipo === tipo) return e;
    await app.responder({ bien: true });
    await continuar(app);
  }
  return null;
}

export const PANTALLAS = [
  {
    id: 'practicar',
    nombre: 'Practicar · Elegir tema',
    seccion: 'Aprender',
    descripcion: 'Práctica en solitario: lengua a aprender y tema de la ronda.',
    ruta: '/practicar',
    obligatoria: true,
    enlaces: { 'Todo mezclado': 'ejercicio-opcion', Volver: 'inicio' },
  },
  {
    id: 'ejercicio-opcion',
    nombre: 'Ejercicio · Opción múltiple',
    seccion: 'Aprender',
    descripcion: 'Traducción por selección. La opción tocada queda en celeste hasta comprobar.',
    obligatoria: true,
    pasos: async (app) => {
      await app.presionar('Opcion', 'Todo mezclado');
      await app.esperar(800);
      const e = await avanzarHasta(app, 'choice');
      if (!e) throw new Error('la ronda no trajo ejercicios de opción');
      await app.presionar('Opcion', e.item.answer);
    },
    enlaces: { Comprobar: 'ejercicio-acierto' },
  },
  {
    id: 'ejercicio-acierto',
    nombre: 'Ejercicio · Respuesta correcta',
    seccion: 'Aprender',
    descripcion: 'Piko festeja: la barra de respuesta sube en verde.',
    pasos: async (app) => {
      await app.presionar('Boton', 'Comprobar');
      await app.esperar(700);
    },
    enlaces: { Continuar: 'ejercicio-bloques' },
  },
  {
    id: 'ejercicio-bloques',
    nombre: 'Ejercicio · Armar oración',
    seccion: 'Aprender',
    descripcion: 'Se tocan las fichas para llevarlas al renglón; las usadas dejan su hueco.',
    pasos: async (app) => {
      await continuar(app);
      const e = await avanzarHasta(app, 'build');
      if (!e) throw new Error('la ronda no trajo ejercicios de armar');
      const palabras = e.item.target.split(/\s+/);
      for (const p of palabras.slice(0, Math.max(1, palabras.length - 1))) {
        await app.presionar('Bloque', p, { ultimo: true });
      }
    },
    enlaces: { Comprobar: 'ejercicio-intento' },
  },
  {
    id: 'ejercicio-intento',
    nombre: 'Ejercicio · Seguí intentando',
    seccion: 'Aprender',
    descripcion: 'Error en ámbar, nunca en rojo: se muestra la respuesta sin regañar.',
    pasos: async (app) => {
      // Se vacía el renglón y se arma al revés: así sale el «seguí intentando».
      const e = await app.ejercicio();
      for (let k = 0; k < e.armado.length; k++) await app.presionar('Bloque', null);
      const palabras = e.item.target.split(/\s+/).reverse();
      if (palabras.length < 2) throw new Error('oración de una sola palabra');
      for (const p of palabras) await app.presionar('Bloque', p, { ultimo: true });
      await app.presionar('Boton', 'Comprobar');
      await app.esperar(700);
      const r = await app.props('BarraFeedback');
      if (r?.acerto) throw new Error('el armado salió correcto de casualidad');
    },
    enlaces: { Continuar: 'logro-nuevo' },
  },
  {
    id: 'ejercicio-escucha',
    nombre: 'Ejercicio · Escuchar',
    seccion: 'Aprender',
    descripcion: 'Comprensión auditiva: Piko pronuncia y se elige lo escuchado.',
    pasos: async (app) => {
      await continuar(app);
      const e = await avanzarHasta(app, 'listen');
      if (!e) throw new Error('esta ronda no trajo ejercicios de escucha');
    },
  },
  {
    id: 'logro-nuevo',
    nombre: 'Logro desbloqueado',
    seccion: 'Progreso',
    descripcion: 'La celebración de un logro nuevo, al terminar la ronda.',
    // Rayos que giran y flores que caen sin parar: la comparación tolera más.
    animada: true,
    enlaces: { '¡Continuar aprendiendo!': 'resultado' },
    obligatoria: true,
    pasos: async (app) => {
      for (let i = 0; i < 14; i++) {
        const e = await app.ejercicio();
        if (!e) break;
        if (!e.revelado) await app.responder({ bien: true });
        await continuar(app);
      }
      await app.esperar(1500);
      if (!(await app.props('Cartel'))) throw new Error('no hubo logro para festejar');
    },
  },
  {
    id: 'resultado',
    nombre: 'Resultado de la lección',
    seccion: 'Aprender',
    descripcion: 'Fin de ronda: sacuanjoches ganadas, el madroño y el marcador.',
    obligatoria: true,
    pasos: async (app) => {
      await app.cerrarCelebraciones();
      await app.esperar(600);
    },
    enlaces: { 'Ver mi árbol': 'arbol', 'Otra ronda': 'ejercicio-opcion', 'Cambiar de tema': 'practicar' },
  },
  {
    id: 'inicio',
    nombre: 'Inicio',
    seccion: 'Inicio',
    descripcion: 'Portada: Piko saluda, se elige la lengua de la app y el camino.',
    obligatoria: true,
    antes: (app) => app.cerrarCelebraciones(),
    ruta: '/',
    enlaces: {
      'Practicar sola': 'practicar',
      Minijuegos: 'minijuegos',
      'La Música de Piko': 'musica',
      'Unirme a la clase': 'unirse',
      'Soy el maestro': 'maestro',
      'Mi madroño': 'perfil',
      'Mis logros': 'logros',
    },
  },
  {
    id: 'perfil',
    nombre: 'Perfil',
    seccion: 'Progreso',
    descripcion: 'El perfil del estudiante: madroño, sacuanjoches, nivel, logros y datos.',
    obligatoria: true,
    ruta: '/perfil',
    enlaces: { 'Ver mi árbol': 'arbol', Volver: 'inicio', 'Mis logros': 'logros' },
  },
  {
    id: 'arbol',
    nombre: 'Mi madroño',
    seccion: 'Progreso',
    descripcion: 'El árbol en grande y el camino de semilla a árbol florecido.',
    ruta: '/arbol',
    enlaces: { Volver: 'perfil' },
  },
  {
    id: 'logros',
    nombre: 'Mis logros',
    seccion: 'Progreso',
    descripcion: 'Insignias por categoría: ganadas a color, pendientes con candado.',
    ruta: '/logros',
    antes: (app) => app.cerrarCelebraciones(),
    enlaces: { Volver: 'perfil', 'Canjear código': 'canjear' },
  },
  {
    id: 'canjear',
    nombre: 'Canjear código',
    seccion: 'Progreso',
    descripcion: 'Canje de códigos de logros especiales (eventos).',
    ruta: '/logros/canjear',
    enlaces: { Volver: 'logros' },
  },
  {
    id: 'minijuegos',
    nombre: 'Minijuegos',
    seccion: 'Jugar y cantar',
    descripcion: 'Juegos tradicionales nicaragüenses con las palabras de las lecciones.',
    ruta: '/minijuegos',
  },
  {
    id: 'musica',
    nombre: 'La Música de Piko',
    seccion: 'Jugar y cantar',
    descripcion: 'Canciones por nivel, con el rastro de sacuanjoches.',
    ruta: '/musica',
  },
  {
    id: 'unirse',
    nombre: 'Unirme a la clase',
    seccion: 'En clase',
    descripcion: 'El estudiante busca la sala del maestro en la red local.',
    ruta: '/estudiante/unirse',
    enlaces: { Volver: 'inicio' },
  },
  {
    id: 'maestro',
    nombre: 'Mi clase (maestro)',
    seccion: 'En clase',
    descripcion: 'El maestro abre la sala desde su hotspot y sigue a la clase.',
    ruta: '/maestro',
    enlaces: { Volver: 'inicio' },
  },
];
