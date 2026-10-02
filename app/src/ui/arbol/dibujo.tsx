/**
 * El dibujo del madroño, etapa por etapa.
 *
 * El madroño (*Calycophyllum candidissimum*) es el árbol nacional: corteza
 * lisa color cobre que se pela, copa redonda, y a fin de año se cubre de
 * racimos de flores blancas. Acá va con la misma gramática que el resto de
 * Piko: formas planas, redondas, sin degradados ni sombras.
 *
 * Coordenadas en un lienzo de 200×308 cuyo origen está 48 unidades por debajo
 * del borde de arriba (viewBox `0 -48 200 308`): ese margen es el aire que
 * necesita Piko cuando se para en la copa.
 */

import { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { EtapaId } from '../../core/progress/arbol';
import { color } from '../tokens';

export const LIENZO = { ancho: 200, alto: 308, arriba: -48 } as const;
export const VIEWBOX = `0 ${LIENZO.arriba} ${LIENZO.ancho} ${LIENZO.alto}`;

export const ARBOL_COLOR = {
  tierra: '#8A5A2B',
  tierraHonda: '#6E4520',
  corteza: '#B5562E',
  cortezaLuz: '#D98452',
  hoja: color.verdeHoja,
  hojaHonda: color.verdeMonte,
  hojaLuz: color.verdePasto,
  flor: '#FFFDF4',
  florCentro: '#F4C542',
} as const;

/**
 * Dónde pone las patas Piko en cada nivel (1 a 10). Abajo, al lado de la
 * semilla; después el tallo, las ramas, y al final la copa.
 */
export const PERCHAS: readonly { x: number; y: number }[] = [
  { x: 52, y: 246 },
  { x: 60, y: 246 },
  { x: 86, y: 214 },
  { x: 86, y: 188 },
  { x: 60, y: 172 },
  { x: 148, y: 152 },
  { x: 60, y: 80 },
  { x: 140, y: 72 },
  { x: 124, y: 28 },
  { x: 100, y: 16 },
];

export function perchaDe(nivel: number): { x: number; y: number } {
  const i = Math.max(1, Math.min(PERCHAS.length, nivel)) - 1;
  return PERCHAS[i] as { x: number; y: number };
}

/** Racimo de flores del madroño: tres florcitas juntas. */
function Racimo({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
  return (
    <G>
      <Circle cx={x - r} cy={y + r * 0.4} r={r} fill={ARBOL_COLOR.flor} />
      <Circle cx={x + r} cy={y + r * 0.4} r={r} fill={ARBOL_COLOR.flor} />
      <Circle cx={x} cy={y - r * 0.7} r={r} fill={ARBOL_COLOR.flor} />
      <Circle cx={x} cy={y} r={r * 0.45} fill={ARBOL_COLOR.florCentro} />
    </G>
  );
}

function Suelo() {
  return (
    <G>
      <Ellipse cx={100} cy={252} rx={96} ry={10} fill={color.verdePasto} />
      <Ellipse cx={100} cy={250} rx={70} ry={6} fill={color.verdeHoja} opacity={0.5} />
    </G>
  );
}

function Semilla() {
  return (
    <G>
      <Ellipse cx={100} cy={246} rx={16} ry={5} fill={ARBOL_COLOR.tierraHonda} />
      <Ellipse cx={100} cy={240} rx={9} ry={6.5} fill={ARBOL_COLOR.tierra} />
      <Path d="M96 237 Q100 241 104 237" stroke={ARBOL_COLOR.cortezaLuz} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </G>
  );
}

function Brote() {
  return (
    <G>
      <Ellipse cx={100} cy={246} rx={16} ry={5} fill={ARBOL_COLOR.tierraHonda} />
      <Path d="M100 246 C 100 232, 98 222, 100 210" stroke={ARBOL_COLOR.hojaHonda} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M100 214 C 90 202, 80 206, 78 210 C 84 218, 94 218, 100 214 Z" fill={ARBOL_COLOR.hoja} />
      <Path d="M100 212 C 108 198, 120 200, 123 204 C 118 214, 108 216, 100 212 Z" fill={ARBOL_COLOR.hojaLuz} />
    </G>
  );
}

function Arbolito() {
  return (
    <G>
      <Path d="M95 248 L97.5 168 L102.5 168 L105 248 Z" fill={ARBOL_COLOR.corteza} />
      <Path d="M99 240 L100 176" stroke={ARBOL_COLOR.cortezaLuz} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M99 200 Q 88 192 80 194" stroke={ARBOL_COLOR.corteza} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M101 186 Q 112 178 120 180" stroke={ARBOL_COLOR.corteza} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Circle cx={78} cy={190} r={9} fill={ARBOL_COLOR.hoja} />
      <Circle cx={122} cy={176} r={10} fill={ARBOL_COLOR.hojaLuz} />
      <Circle cx={100} cy={158} r={18} fill={ARBOL_COLOR.hoja} />
      <Circle cx={92} cy={152} r={9} fill={ARBOL_COLOR.hojaLuz} opacity={0.7} />
    </G>
  );
}

/** Tronco y ramas del árbol grande; se comparte de "hojas" en adelante. */
function Tronco() {
  return (
    <G>
      <Path d="M86 250 C 90 210, 92 160, 94 112 L106 112 C 108 160, 110 210, 114 250 Z" fill={ARBOL_COLOR.corteza} />
      <Path d="M97 236 C 98 200, 98 160, 99 120" stroke={ARBOL_COLOR.cortezaLuz} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M104 214 C 105 196, 105 184, 105 172" stroke={ARBOL_COLOR.cortezaLuz} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.7} />
      <Path d="M94 192 C 80 186, 70 182, 60 178" stroke={ARBOL_COLOR.corteza} strokeWidth={6} fill="none" strokeLinecap="round" />
      <Path d="M106 170 C 120 164, 134 160, 148 158" stroke={ARBOL_COLOR.corteza} strokeWidth={6} fill="none" strokeLinecap="round" />
    </G>
  );
}

function CopaHojas() {
  return (
    <G>
      <Circle cx={54} cy={174} r={13} fill={ARBOL_COLOR.hoja} />
      <Circle cx={154} cy={154} r={13} fill={ARBOL_COLOR.hojaLuz} />
      <Circle cx={68} cy={118} r={28} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={134} cy={112} r={30} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={100} cy={100} r={42} fill={ARBOL_COLOR.hoja} />
      <Circle cx={82} cy={82} r={24} fill={ARBOL_COLOR.hojaLuz} opacity={0.75} />
      <Circle cx={124} cy={80} r={22} fill={ARBOL_COLOR.hoja} />
    </G>
  );
}

function CopaGrande({ conCima }: { conCima: boolean }) {
  return (
    <G>
      <Circle cx={54} cy={174} r={14} fill={ARBOL_COLOR.hoja} />
      <Circle cx={154} cy={154} r={14} fill={ARBOL_COLOR.hojaLuz} />
      <Circle cx={60} cy={110} r={32} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={140} cy={104} r={34} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={100} cy={88} r={50} fill={ARBOL_COLOR.hoja} />
      <Circle cx={78} cy={62} r={28} fill={ARBOL_COLOR.hojaLuz} opacity={0.8} />
      <Circle cx={124} cy={58} r={32} fill={ARBOL_COLOR.hoja} />
      {conCima && <Circle cx={100} cy={40} r={26} fill={ARBOL_COLOR.hojaLuz} />}
    </G>
  );
}

const FLORES_PRIMERAS = [
  { x: 72, y: 96 },
  { x: 128, y: 74 },
  { x: 104, y: 112 },
  { x: 150, y: 110 },
  { x: 52, y: 120 },
  { x: 92, y: 64 },
];

const FLORES_TODAS = [
  ...FLORES_PRIMERAS,
  { x: 118, y: 92 },
  { x: 84, y: 120 },
  { x: 136, y: 128 },
  { x: 64, y: 140 },
  { x: 110, y: 46 },
  { x: 84, y: 40 },
  { x: 146, y: 64 },
  { x: 54, y: 86 },
  { x: 152, y: 156 },
  { x: 50, y: 172 },
  { x: 100, y: 22 },
  { x: 122, y: 30 },
];

/** Pétalos caídos alrededor del tronco: el árbol en su punto. */
function PetalosCaidos() {
  return (
    <G>
      {[
        { x: 64, y: 252 },
        { x: 132, y: 250 },
        { x: 150, y: 254 },
        { x: 44, y: 254 },
      ].map((p, i) => (
        <Ellipse key={i} cx={p.x} cy={p.y} rx={3.2} ry={1.8} fill={ARBOL_COLOR.flor} />
      ))}
    </G>
  );
}

/**
 * Encuadre de cada etapa para las miniaturas: una semilla en un lienzo pensado
 * para un árbol entero sería un punto perdido.
 */
export const ENCUADRE: Record<EtapaId, string> = {
  semilla: '62 200 76 68',
  brote: '58 186 84 82',
  arbolito: '46 130 108 138',
  hojas: '20 52 160 216',
  flores: '10 12 180 256',
  florecido: '10 6 180 262',
};

/**
 * El paisaje de atrás: un volcán como los del Pacífico, el sol y un par de
 * nubes. Va en una capa aparte para que no parpadee cuando el árbol cambia.
 */
export function Paisaje() {
  return (
    <G>
      <Circle cx={162} cy={-14} r={15} fill="#FCE7A8" />
      <Path d="M-4 252 L46 158 C 50 152, 62 152, 66 158 L128 252 Z" fill="#C3E3F4" />
      <Path d="M52 160 L56 154 L60 160 Z" fill={color.blanco} opacity={0.8} />
      <Path d="M96 252 L160 192 C 164 189, 170 189, 174 192 L216 252 Z" fill="#CFE9F7" />
      <G opacity={0.9}>
        <Circle cx={30} cy={4} r={9} fill={color.blanco} />
        <Circle cx={42} cy={0} r={12} fill={color.blanco} />
        <Circle cx={56} cy={5} r={8} fill={color.blanco} />
      </G>
      <G opacity={0.8}>
        <Circle cx={150} cy={50} r={7} fill={color.blanco} />
        <Circle cx={160} cy={46} r={9} fill={color.blanco} />
        <Circle cx={171} cy={51} r={6} fill={color.blanco} />
      </G>
    </G>
  );
}

/** El árbol completo en una etapa, sin Piko. */
export function DibujoArbol({ etapa }: { etapa: EtapaId }) {
  return (
    <G>
      <Suelo />
      {etapa === 'semilla' && <Semilla />}
      {etapa === 'brote' && <Brote />}
      {etapa === 'arbolito' && <Arbolito />}
      {(etapa === 'hojas' || etapa === 'flores' || etapa === 'florecido') && <Tronco />}
      {etapa === 'hojas' && <CopaHojas />}
      {(etapa === 'flores' || etapa === 'florecido') && <CopaGrande conCima={etapa === 'florecido'} />}
      {etapa === 'flores' && FLORES_PRIMERAS.map((f, i) => <Racimo key={i} x={f.x} y={f.y} />)}
      {etapa === 'florecido' && FLORES_TODAS.map((f, i) => <Racimo key={i} x={f.x} y={f.y} r={4.4} />)}
      {etapa === 'florecido' && <PetalosCaidos />}
    </G>
  );
}
