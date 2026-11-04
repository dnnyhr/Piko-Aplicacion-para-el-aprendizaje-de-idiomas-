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
  tintaSuave: '#56655B',

  // Bordes y superficies neutras
  borde: '#E3DACA',
  bordeHondo: '#CFC3AD',

  // Labios y tintas de los botones de color
  labioVerde: '#7BA22C',
  labioPico: '#C08417',
  tintaCielo: '#0B3D57',
  tintaPico: '#5C3D02',

  // Lo que cambia de rol con el alto contraste
  barra: '#97C137',
  bordeElegido: '#60C5FA',

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

export type Paleta = { readonly [K in keyof typeof color]: string };

/**
 * El alto contraste de «Mi forma de aprender».
 *
 * Sigue siendo Piko: los botones conservan su verde, su celeste y su ámbar,
 * pero más limpios y con tinta casi negra; el papel pasa a blanco y los bordes
 * se vuelven oscuros para que cada tarjeta se distinga aunque se vea poco el
 * color. `tests/contraste.test.ts` comprueba las parejas de texto y fondo.
 */
export const colorContraste: Paleta = {
  verde: '#0A4530',
  verdeHondo: '#00261A',
  verdeBosque: '#0A4530',
  verdeMonte: '#0A4530',
  verdeHoja: '#0A4530',
  verdePasto: '#B6E34A',

  cielo: '#9ADCFF',
  cieloHondo: '#0B4F7A',
  nube: '#E3F5FF',

  papel: '#FFFFFF',
  papelHondo: '#E6E6E6',
  blanco: '#FFFFFF',

  copete: '#8F3600',
  pico: '#FFC94D',
  picoHondo: '#7A5200',

  grafito: '#000000',
  tinta: '#0D0D0D',
  tintaSuave: '#1F2A24',

  borde: '#16241D',
  bordeHondo: '#000000',

  labioVerde: '#00261A',
  labioPico: '#5C3D02',
  tintaCielo: '#00212F',
  tintaPico: '#2B1C00',

  barra: '#0A4530',
  bordeElegido: '#0B4F7A',

  acierto: '#1E6B00',
  aciertoFondo: '#E9FBD0',
  aciertoTinta: '#174D00',
  intento: '#8A5A08',
  intentoFondo: '#FFF0CC',
  intentoTinta: '#4F2F00',
};

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
