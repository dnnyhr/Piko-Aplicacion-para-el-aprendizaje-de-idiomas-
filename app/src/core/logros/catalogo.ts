/**
 * Todos los logros de Piko.
 *
 * Para agregar uno: una entrada más en `LOGROS`, con un `id` nuevo (los ids
 * quedan guardados en el progreso de los estudiantes: no se cambian ni se
 * reusan). Las condiciones posibles están en `tipos.ts`. Un logro de evento
 * (concurso, escuela, colaboración) es `tipo: 'especial'` con
 * `condicion: { tipo: 'codigo' }`, y sus códigos se crean en el servidor con
 * `npm run codigos` (ver `encuestas/herramientas/codigos.mjs`) usando este
 * mismo `id`.
 *
 * Tono: como habla Piko. Se festeja el avance, nunca se reprocha lo que falta.
 */

import type { Categoria, Logro } from './tipos';

// Los ids de los minijuegos (`ID_RAYUELA` y compañía), escritos acá para que
// la proyección no cargue los juegos enteros. Una prueba revisa que coincidan.
const ID_RAYUELA = 'rayuela';
const ID_TROMPO = 'trompo';
const ID_CHIBOLAS = 'chibolas';
const ID_GALLINITA = 'gallinita';

/** En el orden en que se muestran. */
export const CATEGORIAS: readonly Categoria[] = [
  { id: 'especiales', nombre: 'Logros especiales', descripcion: 'De eventos y momentos únicos. Se consiguen con un código.' },
  { id: 'progreso', nombre: 'Progreso', descripcion: 'Lección a lección, se hace camino.' },
  { id: 'racha', nombre: 'Racha', descripcion: 'Un poquito cada día rinde mucho.' },
  { id: 'palabras', nombre: 'Palabras', descripcion: 'Cada palabra nueva es tuya para siempre.' },
  { id: 'interaccion', nombre: 'Con Piko', descripcion: 'Piko aprende con vos.' },
  { id: 'exploracion', nombre: 'Exploración', descripcion: 'Canciones, juegos y lenguas de Nicaragua.' },
];

/** El logro de las tarjetas de Hackathon Nicaragua 2026. */
export const LOGRO_HACKATHON = 'piko-hackathon-2026';

const VERDE = '#7BA22C';
const NARANJA = '#E97927';
const CIELO = '#3AA8E0';
const PICO = '#E8A429';
const MONTE = '#327945';
const MORADO = '#8E5BB5';

export const LOGROS: readonly Logro[] = [
  // ------------------------------------------------------------ especiales
  {
    id: LOGRO_HACKATHON,
    nombre: 'Piko Hackathon 2026',
    descripcion: 'Estuviste ahí y desbloqueaste una recompensa especial.',
    como: 'Sólo con el código de las tarjetas de Hackathon Nicaragua 2026. Tocá «Canjear código».',
    felicitacion: 'Desbloqueaste un logro exclusivo de Hackathon Nicaragua 2026.',
    categoria: 'especiales',
    tipo: 'especial',
    exclusivo: true,
    insignia: { icono: '💻', color: '#1F6FB2', forma: 'hackathon' },
    condicion: { tipo: 'codigo' },
  },

  // -------------------------------------------------------------- progreso
  {
    id: 'primer-paso',
    nombre: 'Primer paso',
    descripcion: 'Tu aventura con Piko empezó.',
    como: 'Completá tu primera lección.',
    felicitacion: 'Completaste tu primera lección.',
    categoria: 'progreso',
    tipo: 'normal',
    insignia: { icono: '👣', color: VERDE },
    condicion: { tipo: 'lecciones', n: 1 },
  },
  {
    id: 'ya-arrancamos',
    nombre: 'Ya arrancamos',
    descripcion: 'Cinco lecciones: esto ya va en serio.',
    como: 'Completá 5 lecciones.',
    felicitacion: 'Completaste 5 lecciones.',
    categoria: 'progreso',
    tipo: 'normal',
    insignia: { icono: '🚀', color: VERDE },
    condicion: { tipo: 'lecciones', n: 5 },
  },
  {
    id: 'aprendiz-constante',
    nombre: 'Aprendiz constante',
    descripcion: 'Veinte lecciones, una tras otra.',
    como: 'Completá 20 lecciones.',
    felicitacion: 'Completaste 20 lecciones.',
    categoria: 'progreso',
    tipo: 'normal',
    insignia: { icono: '📚', color: VERDE },
    condicion: { tipo: 'lecciones', n: 20 },
  },
  {
    id: 'dominando-el-camino',
    nombre: 'Dominando el camino',
    descripcion: 'Cincuenta lecciones: como subir el Momotombo.',
    como: 'Completá 50 lecciones.',
    felicitacion: 'Completaste 50 lecciones.',
    categoria: 'progreso',
    tipo: 'normal',
    insignia: { icono: '🌋', color: VERDE },
    condicion: { tipo: 'lecciones', n: 50 },
  },

  // ----------------------------------------------------------------- racha
  {
    id: 'no-te-detengas',
    nombre: 'No te detengas',
    descripcion: 'Tres días seguidos aprendiendo.',
    como: 'Estudiá 3 días seguidos.',
    felicitacion: 'Estudiaste 3 días seguidos.',
    categoria: 'racha',
    tipo: 'normal',
    insignia: { icono: '🔥', color: NARANJA },
    condicion: { tipo: 'racha_dias', n: 3 },
  },
  {
    id: 'constancia',
    nombre: 'Constancia',
    descripcion: 'Una semana entera sin parar.',
    como: 'Mantené una racha de 7 días.',
    felicitacion: 'Mantuviste una racha de 7 días.',
    categoria: 'racha',
    tipo: 'normal',
    insignia: { icono: '📅', color: NARANJA },
    condicion: { tipo: 'racha_dias', n: 7 },
  },
  {
    id: 'imparable',
    nombre: 'Imparable',
    descripcion: 'Un mes entero, todos los días.',
    como: 'Mantené una racha de 30 días.',
    felicitacion: 'Mantuviste una racha de 30 días.',
    categoria: 'racha',
    tipo: 'normal',
    insignia: { icono: '⚡', color: NARANJA },
    condicion: { tipo: 'racha_dias', n: 30 },
  },

  // -------------------------------------------------------------- palabras
  {
    id: 'primera-palabra',
    nombre: 'Primera palabra',
    descripcion: 'La primera de muchas en inglés.',
    como: 'Aprendé tu primera palabra en inglés.',
    felicitacion: 'Aprendiste tu primera palabra en inglés.',
    categoria: 'palabras',
    tipo: 'normal',
    insignia: { icono: '💬', color: CIELO },
    condicion: { tipo: 'palabras', lengua: 'eng', n: 1 },
  },
  {
    id: 'coleccionista-de-palabras',
    nombre: 'Coleccionista de palabras',
    descripcion: 'Una canasta llena de palabras en inglés.',
    como: 'Aprendé 50 palabras en inglés.',
    felicitacion: 'Aprendiste 50 palabras en inglés.',
    categoria: 'palabras',
    tipo: 'normal',
    insignia: { icono: '🧺', color: CIELO },
    condicion: { tipo: 'palabras', lengua: 'eng', n: 50 },
  },
  {
    id: 'diccionario-humano',
    nombre: 'Diccionario humano',
    descripcion: 'Cien palabras en inglés en tu cabeza.',
    como: 'Aprendé 100 palabras en inglés.',
    felicitacion: 'Aprendiste 100 palabras en inglés.',
    categoria: 'palabras',
    tipo: 'normal',
    insignia: { icono: '📖', color: CIELO },
    condicion: { tipo: 'palabras', lengua: 'eng', n: 100 },
  },

  // ----------------------------------------------------------- interacción
  {
    id: 'conoce-a-piko',
    nombre: 'Conoce a Piko',
    descripcion: 'Piko ya es tu amigo.',
    como: 'Tocá a Piko en la pantalla de inicio para saludarlo.',
    felicitacion: 'Saludaste a Piko por primera vez.',
    categoria: 'interaccion',
    tipo: 'normal',
    insignia: { icono: '🦜', color: PICO },
    condicion: { tipo: 'hito', clave: 'piko' },
  },
  {
    id: 'companeros-de-aula',
    nombre: 'Compañeros de aula',
    descripcion: 'Aprender juntos es más bonito.',
    como: 'Unite a una clase en vivo con tu maestro.',
    felicitacion: 'Te uniste a tu primera clase en vivo.',
    categoria: 'interaccion',
    tipo: 'normal',
    insignia: { icono: '🏫', color: PICO },
    condicion: { tipo: 'clases', n: 1 },
  },
  {
    id: 'buen-oido',
    nombre: 'Buen oído',
    descripcion: 'Escuchás y repetís como un chocoyo.',
    como: 'Completá bien un ejercicio de pronunciación.',
    felicitacion: 'Completaste bien un ejercicio de pronunciación.',
    categoria: 'interaccion',
    tipo: 'normal',
    insignia: { icono: '👂', color: PICO },
    condicion: { tipo: 'proximamente' },
  },
  {
    id: 'lo-dijiste',
    nombre: '¡Lo dijiste!',
    descripcion: 'Una pronunciación perfecta.',
    como: 'Conseguí una pronunciación perfecta.',
    felicitacion: 'Conseguiste una pronunciación perfecta.',
    categoria: 'interaccion',
    tipo: 'normal',
    insignia: { icono: '🎤', color: PICO },
    condicion: { tipo: 'proximamente' },
  },

  // ----------------------------------------------------------- exploración
  {
    id: 'primera-cancion',
    nombre: 'Mi primera canción',
    descripcion: 'Aprendiste inglés cantando música de Nicaragua.',
    como: 'Completá una canción de La Música de Piko.',
    felicitacion: 'Completaste tu primera canción.',
    categoria: 'exploracion',
    tipo: 'normal',
    insignia: { icono: '🎸', color: MORADO },
    condicion: { tipo: 'canciones', n: 1 },
  },
  {
    id: 'cantor-de-mi-tierra',
    nombre: 'Cantor de mi tierra',
    descripcion: 'Cinco canciones: ya tenés tu propio repertorio.',
    como: 'Completá 5 canciones de La Música de Piko.',
    felicitacion: 'Completaste 5 canciones.',
    categoria: 'exploracion',
    tipo: 'normal',
    insignia: { icono: '🎶', color: MORADO },
    condicion: { tipo: 'canciones', n: 5 },
  },
  {
    id: 'a-jugar',
    nombre: '¡A jugar!',
    descripcion: 'También se aprende jugando.',
    como: 'Jugá una partida de cualquier minijuego.',
    felicitacion: 'Jugaste tu primer minijuego.',
    categoria: 'exploracion',
    tipo: 'normal',
    insignia: { icono: '🪀', color: MONTE },
    condicion: { tipo: 'partidas', n: 1 },
  },
  {
    id: 'recreo-completo',
    nombre: 'Recreo completo',
    descripcion: 'Rayuela, trompo, chibolas y Pikito Ciego: los jugaste todos.',
    como: 'Jugá al menos una vez cada minijuego.',
    felicitacion: 'Jugaste todos los minijuegos del patio.',
    categoria: 'exploracion',
    tipo: 'normal',
    insignia: { icono: '🏃', color: MONTE },
    condicion: { tipo: 'juegos', juegos: [ID_RAYUELA, ID_TROMPO, ID_CHIBOLAS, ID_GALLINITA] },
  },
  {
    id: 'trompo-bailarin',
    nombre: 'Trompo bailarín',
    descripcion: 'El trompo ya baila en tu mano.',
    como: 'Jugá 10 partidas de trompo.',
    felicitacion: 'Jugaste 10 partidas de trompo.',
    categoria: 'exploracion',
    tipo: 'normal',
    insignia: { icono: '🌀', color: MONTE },
    condicion: { tipo: 'partidas', n: 10, juego: ID_TROMPO },
  },
  {
    id: 'desde-la-costa-caribe',
    nombre: 'Desde la Costa Caribe',
    descripcion: 'Tu primera palabra en miskito.',
    como: 'Aprendé una palabra en miskito.',
    felicitacion: 'Aprendiste tu primera palabra en miskito.',
    categoria: 'exploracion',
    tipo: 'normal',
    insignia: { icono: '🌊', color: CIELO },
    condicion: { tipo: 'palabras', lengua: 'miq', n: 1 },
  },
  {
    id: 'dos-lenguas',
    nombre: 'Dos lenguas, un corazón',
    descripcion: 'En Nicaragua se habla en muchas lenguas.',
    como: 'Practicá en dos lenguas distintas.',
    felicitacion: 'Practicaste en dos lenguas distintas.',
    categoria: 'exploracion',
    tipo: 'normal',
    insignia: { icono: '🌎', color: CIELO },
    condicion: { tipo: 'lenguas', n: 2 },
  },
  {
    id: 'ramo-de-sacuanjoches',
    nombre: 'Ramo de sacuanjoches',
    descripcion: 'Tu madroño se llena de flores.',
    como: 'Juntá 50 sacuanjoches.',
    felicitacion: 'Juntaste 50 sacuanjoches.',
    categoria: 'exploracion',
    tipo: 'normal',
    insignia: { icono: '🌼', color: '#D9A21B' },
    condicion: { tipo: 'sacuanjoches', n: 50 },
  },
];

export function logroPorId(id: string): Logro | undefined {
  return LOGROS.find((l) => l.id === id);
}
