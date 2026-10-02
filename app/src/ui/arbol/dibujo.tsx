/**
 * El dibujo del madroño, etapa por etapa.
 *
 * El madroño (*Calycophyllum candidissimum*) es el árbol nacional: corteza
 * lisa color cobre que se pela, copa redonda, y a fin de año se cubre de
 * racimos de flores blancas. Acá va con la misma gramática que el resto de
 * Piko: formas planas, redondas, sin degradados ni sombras.
 *
 * Coordenadas en un lienzo de 200×308 cuyo origen está 48 unidades por debajo
 * del borde de arriba (viewBox `0 -48 200 308`): ese margen es el cielo que
 * llena el árbol florecido.
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

/** Racimo de flores del madroño: tres florcitas juntas. */
export function Racimo({ x, y, r = 4 }: { x: number; y: number; r?: number }) {
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

/**
 * Tronco del árbol grande, de "hojas" en adelante: corto y grueso, con las
 * raíces abiertas, y partido en tres ramas que se meten en la copa. Así es el
 * madroño: más ancho que alto, con la corteza lisa color cobre.
 */
function Tronco() {
  return (
    <G>
      <Path d="M100 180 C 96 160, 70 150, 50 130" stroke={ARBOL_COLOR.corteza} strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path d="M100 180 C 104 160, 132 152, 152 132" stroke={ARBOL_COLOR.corteza} strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path d="M100 180 C 100 160, 98 140, 102 110" stroke={ARBOL_COLOR.corteza} strokeWidth={8} fill="none" strokeLinecap="round" />
      <Path
        d="M56 253 Q 78 251 82 236 C 86 214, 88 196, 80 176 L 120 176 C 112 196, 114 214, 118 236 Q 122 251 144 253 Z"
        fill={ARBOL_COLOR.corteza}
      />
      <Path d="M90 249 Q 100 260 110 249 Z" fill={ARBOL_COLOR.corteza} />
      <Path d="M95 244 C 96 222, 96 202, 91 184" stroke={ARBOL_COLOR.cortezaLuz} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Ellipse cx={108} cy={214} rx={3} ry={8} fill={ARBOL_COLOR.cortezaLuz} opacity={0.7} />
    </G>
  );
}

/** Copa de "árbol con hojas": ya ancha, todavía sin flores. */
function CopaHojas() {
  return (
    <G>
      <Ellipse cx={100} cy={112} rx={70} ry={40} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={38} cy={120} r={24} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={56} cy={92} r={26} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={86} cy={76} r={28} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={120} cy={76} r={28} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={150} cy={92} r={26} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={164} cy={120} r={24} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={140} cy={140} r={22} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={100} cy={144} r={24} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={60} cy={140} r={22} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={60} cy={108} r={22} fill={ARBOL_COLOR.hoja} />
      <Circle cx={90} cy={92} r={24} fill={ARBOL_COLOR.hoja} />
      <Circle cx={124} cy={94} r={22} fill={ARBOL_COLOR.hoja} />
      <Circle cx={146} cy={112} r={20} fill={ARBOL_COLOR.hoja} />
      <Circle cx={100} cy={118} r={24} fill={ARBOL_COLOR.hoja} />
      <Circle cx={72} cy={128} r={18} fill={ARBOL_COLOR.hoja} />
      <Circle cx={128} cy={128} r={18} fill={ARBOL_COLOR.hoja} />
      <Circle cx={78} cy={86} r={16} fill={ARBOL_COLOR.hojaLuz} opacity={0.8} />
      <Circle cx={112} cy={80} r={14} fill={ARBOL_COLOR.hojaLuz} opacity={0.7} />
    </G>
  );
}

/** Copa grande, la de las flores: una nube ancha de copos. */
function CopaGrande({ conCima }: { conCima: boolean }) {
  return (
    <G>
      <Ellipse cx={100} cy={96} rx={90} ry={60} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={14} cy={108} r={26} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={26} cy={76} r={28} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={52} cy={50} r={30} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={86} cy={36} r={32} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={122} cy={36} r={32} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={154} cy={50} r={30} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={178} cy={76} r={28} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={188} cy={108} r={26} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={170} cy={136} r={26} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={132} cy={148} r={26} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={94} cy={150} r={26} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={56} cy={146} r={26} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={28} cy={134} r={24} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={44} cy={100} r={26} fill={ARBOL_COLOR.hoja} />
      <Circle cx={70} cy={72} r={28} fill={ARBOL_COLOR.hoja} />
      <Circle cx={104} cy={62} r={30} fill={ARBOL_COLOR.hoja} />
      <Circle cx={136} cy={72} r={28} fill={ARBOL_COLOR.hoja} />
      <Circle cx={160} cy={100} r={26} fill={ARBOL_COLOR.hoja} />
      <Circle cx={130} cy={112} r={26} fill={ARBOL_COLOR.hoja} />
      <Circle cx={96} cy={106} r={28} fill={ARBOL_COLOR.hoja} />
      <Circle cx={64} cy={124} r={22} fill={ARBOL_COLOR.hoja} />
      <Circle cx={142} cy={132} r={20} fill={ARBOL_COLOR.hoja} />
      <Circle cx={64} cy={70} r={20} fill={ARBOL_COLOR.hojaLuz} opacity={0.8} />
      <Circle cx={100} cy={50} r={20} fill={ARBOL_COLOR.hojaLuz} opacity={0.7} />
      <Circle cx={138} cy={62} r={16} fill={ARBOL_COLOR.hojaLuz} opacity={0.6} />
      {conCima && <Circle cx={100} cy={26} r={22} fill={ARBOL_COLOR.hoja} />}
      {conCima && <Circle cx={94} cy={20} r={12} fill={ARBOL_COLOR.hojaLuz} opacity={0.8} />}
    </G>
  );
}

const FLORES_PRIMERAS = [
  { x: 52, y: 96 },
  { x: 150, y: 96 },
  { x: 100, y: 70 },
  { x: 76, y: 124 },
  { x: 128, y: 120 },
  { x: 172, y: 118 },
];

const FLORES_TODAS = [
  ...FLORES_PRIMERAS,
  { x: 30, y: 110 },
  { x: 64, y: 58 },
  { x: 120, y: 44 },
  { x: 144, y: 80 },
  { x: 88, y: 96 },
  { x: 112, y: 130 },
  { x: 44, y: 134 },
  { x: 162, y: 62 },
  { x: 92, y: 38 },
  { x: 184, y: 98 },
  { x: 140, y: 146 },
  { x: 70, y: 146 },
  { x: 100, y: 18 },
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
  hojas: '18 30 164 238',
  flores: '-6 -6 212 274',
  florecido: '-6 -8 212 276',
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
