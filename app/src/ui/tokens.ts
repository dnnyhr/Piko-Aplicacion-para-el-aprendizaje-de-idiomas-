/**
 * Sistema de diseño de Piko.
 *
 * La paleta y las tipografías vienen tal cual de la landing (`web/index.html`),
 * para que el sitio y la app se vean como la misma cosa. La gramática visual
 * es la de Duolingo: superficies planas, bordes redondos generosos, y botones
 * con un "labio" inferior más oscuro que se hunde al presionarse — nada de
 * degradados ni sombras difusas, que además cuestan caro en gama baja.
 */

export const color = {
  // Verdes — la identidad
  verde: '#0F5D3D',
  verdeHondo: '#0A4530',
  verdeBosque: '#197249',
  verdeMonte: '#327945',
  verdeHoja: '#61A66B',
  verdePasto: '#97C137',

  // Cielo
  cielo: '#60C5FA',
  cieloHondo: '#3AA8E0',
  nube: '#DDF1FC',

  // Papel — los fondos
  papel: '#F7F0E4',
  papelHondo: '#ECE1CC',
  blanco: '#FFFFFF',

  // Acentos del chocoyo
  copete: '#E97927',
  pico: '#E8A429',
  picoHondo: '#C9862060',

  // Tinta
  grafito: '#16241D',
  tinta: '#33453B',
  tintaSuave: '#6B7A70',

  // Bordes y superficies neutras
  borde: '#E3DACA',
  bordeHondo: '#CFC3AD',

  /**
   * Estados de respuesta. El error es ámbar, nunca rojo: Piko refuerza sin
   * regañar, y un aspa roja en la cara de un niño que recién empieza a hablar
   * su propia lengua es exactamente lo contrario de lo que buscamos.
   */
  acierto: '#97C137',
  aciertoFondo: '#EDF8D9',
  aciertoTinta: '#3F6B0E',
  intento: '#E8A429',
  intentoFondo: '#FDF2DC',
  intentoTinta: '#8A5A08',
} as const;

/** Escala de 4 puntos. */
export const espacio = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radio = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  redondo: 999,
} as const;

export const fuente = {
  titulo: 'Fredoka_600SemiBold',
  tituloFuerte: 'Fredoka_700Bold',
  boton: 'Fredoka_600SemiBold',
  cuerpo: 'NunitoSans_400Regular',
  cuerpoFuerte: 'NunitoSans_700Bold',
  cuerpoMedio: 'NunitoSans_600SemiBold',
} as const;

export const texto = {
  display: { fontFamily: fuente.tituloFuerte, fontSize: 32, lineHeight: 36 },
  titulo: { fontFamily: fuente.titulo, fontSize: 24, lineHeight: 29 },
  subtitulo: { fontFamily: fuente.titulo, fontSize: 19, lineHeight: 24 },
  cuerpo: { fontFamily: fuente.cuerpo, fontSize: 16, lineHeight: 24 },
  cuerpoFuerte: { fontFamily: fuente.cuerpoFuerte, fontSize: 16, lineHeight: 24 },
  chico: { fontFamily: fuente.cuerpo, fontSize: 13, lineHeight: 18 },
  etiqueta: {
    fontFamily: fuente.boton,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

/** Grosor del labio inferior que le da volumen a botones y tarjetas. */
export const labio = { normal: 4, chico: 3 } as const;

/** Duraciones de animación. Cortas: la app tiene que sentirse instantánea. */
export const tiempo = { rapido: 120, normal: 200, lento: 380 } as const;
