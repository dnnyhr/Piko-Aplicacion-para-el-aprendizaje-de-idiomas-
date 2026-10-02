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
 * Un copo de hojas: el montón de follaje en la punta de cada rama. El madroño
 * no tiene una copa de una pieza sino ramas separadas, cada una con su copo
 * redondo y esponjoso; con esto se arma tanto el árbol que crece como el
 * camino de niveles. `s` escala el copo y `flores` dice cuántos racimos lleva.
 */
const COPO = {
  hondo: [[-56, 16, 26], [-30, 24, 30], [0, 28, 32], [30, 24, 30], [56, 16, 26], [-44, -4, 28], [44, -4, 28], [0, -10, 30]],
  medio: [[-34, 4, 26], [0, 8, 30], [34, 4, 26], [-14, -14, 24], [18, -14, 24]],
  luz: [[-22, -22, 16, 0.85], [14, -26, 14, 0.7]],
  flores: [[-50, 8], [46, 10], [0, 32], [-22, -8], [24, -4], [-6, -30], [36, 26], [-38, 26]],
} as const;

export function Copo({ x, y, s = 1, flores = 0 }: { x: number; y: number; s?: number; flores?: number }) {
  return (
    <G>
      {COPO.hondo.map(([dx, dy, r], i) => (
        <Circle key={`h${i}`} cx={x + dx * s} cy={y + dy * s} r={r * s} fill={ARBOL_COLOR.hojaHonda} />
      ))}
      {COPO.medio.map(([dx, dy, r], i) => (
        <Circle key={`m${i}`} cx={x + dx * s} cy={y + dy * s} r={r * s} fill={ARBOL_COLOR.hoja} />
      ))}
      {COPO.luz.map(([dx, dy, r, o], i) => (
        <Circle key={`l${i}`} cx={x + dx * s} cy={y + dy * s} r={r * s} fill={ARBOL_COLOR.hojaLuz} opacity={o} />
      ))}
      {COPO.flores.slice(0, flores).map(([dx, dy], i) => (
        <Racimo key={`f${i}`} x={x + dx * s} y={y + dy * s} r={Math.max(3.2, 6 * s)} />
      ))}
    </G>
  );
}

/** Ramas del árbol grande: hasta dónde llega cada una y dónde va su copo. */
const RAMAS = [
  { d: 'M92 204 C 76 196, 58 184, 46 170', ancho: 9, copo: { x: 42, y: 156, s: 0.52 } },
  { d: 'M108 176 C 124 166, 142 152, 156 138', ancho: 8, copo: { x: 158, y: 124, s: 0.52 } },
  { d: 'M96 146 C 84 132, 70 116, 58 102', ancho: 7, copo: { x: 54, y: 88, s: 0.48 } },
  { d: 'M104 122 C 116 108, 132 94, 146 80', ancho: 6, copo: { x: 148, y: 66, s: 0.44 } },
] as const;
const COPO_ARRIBA = { x: 100, y: 62 };

/**
 * El árbol grande, de "hojas" en adelante: tronco grueso con las raíces
 * abiertas y la corteza lisa color cobre, y ramas separadas, cada una con su
 * copo. Con cada etapa salen más ramas y más flores.
 */
function ArbolGrande({ ramas, arriba, flores }: { ramas: number; arriba: number; flores: number }) {
  const lista = RAMAS.slice(0, ramas);
  return (
    <G>
      {lista.map((r, i) => (
        <Path key={i} d={r.d} stroke={ARBOL_COLOR.corteza} strokeWidth={r.ancho} fill="none" strokeLinecap="round" />
      ))}
      <Path
        d="M60 253 Q 80 251 84 236 C 88 210, 91 160, 95 92 L 105 92 C 109 160, 112 210, 116 236 Q 120 251 140 253 Z"
        fill={ARBOL_COLOR.corteza}
      />
      <Path d="M90 249 Q 100 260 110 249 Z" fill={ARBOL_COLOR.corteza} />
      <Path d="M96 244 C 97 214, 97 170, 98 112" stroke={ARBOL_COLOR.cortezaLuz} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Ellipse cx={107} cy={210} rx={3} ry={8} fill={ARBOL_COLOR.cortezaLuz} opacity={0.7} />
      {lista.map((r, i) => (
        <Copo key={i} x={r.copo.x} y={r.copo.y} s={r.copo.s} flores={flores} />
      ))}
      <Copo x={COPO_ARRIBA.x} y={COPO_ARRIBA.y} s={arriba} flores={flores} />
    </G>
  );
}

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
  hojas: '6 28 188 236',
  flores: '6 16 188 248',
  florecido: '6 8 188 256',
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
      {etapa === 'hojas' && <ArbolGrande ramas={2} arriba={0.55} flores={0} />}
      {etapa === 'flores' && <ArbolGrande ramas={3} arriba={0.6} flores={2} />}
      {etapa === 'florecido' && <ArbolGrande ramas={4} arriba={0.66} flores={6} />}
      {etapa === 'florecido' && <PetalosCaidos />}
    </G>
  );
}
