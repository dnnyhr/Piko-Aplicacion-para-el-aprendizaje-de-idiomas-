/**
 * El camino de niveles, dibujado sobre un madroño.
 *
 * El tronco sube por el medio y cada nivel es una rama, alternando de un lado
 * al otro, con un nidito entre las hojas: el 1 abajo, cerca del suelo, y el
 * último arriba, en la copa. En cada nido hay libros de idiomas: es lo que
 * Piko va a aprender ahí. Los superados llevan sus estrellas, los que faltan
 * tienen candado, y Piko espera en el que toca.
 *
 * Al volver de superar un nivel, Piko salta de su rama a la siguiente: esa
 * subida es la recompensa que se ve en el camino.
 *
 * El árbol es un único SVG estático; lo único que se anima es Piko y el
 * nido nuevo, con `transform` por el hilo nativo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { NivelConEstado } from '../../core/progress/niveles';
import { ARBOL_COLOR, Copo, Escama, Nudo, Parche, Racimo } from '../../ui/arbol/dibujo';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import { color, fuente } from '../../ui/tokens';

// ------------------------------------------------------------------ geometría

/**
 * El madroño del camino: tronco grueso con las raíces abiertas que sube por
 * el medio, y de él salen ramas separadas, alternando de lado, cada una con
 * su propio copo de hojas y un nido. Arriba del último nivel el árbol sigue:
 * más ramas y mucho follaje que se pierden entre las nubes, para que se note
 * que el camino continúa cuando lleguen más niveles.
 */
const PASO = 140;
const SUELO = 130;
/** Ramas sin nido arriba del último nivel, que asoman de las nubes. */
const RAMAS_EN_NUBES = 2;
const NUBES = RAMAS_EN_NUBES * PASO + 200;
const NODO = { ancho: 110, alto: 80 } as const;
const ALTO_PIKO = 74;

type Lado = 'izq' | 'der';

export interface Geometria {
  ancho: number;
  alto: number;
  /** Centro del nido de cada nivel, por número (índice 0 = nivel 1). */
  nodos: { x: number; y: number; lado: Lado }[];
  /** Ramas de más arriba, sin nido: los niveles que todavía no llegaron. */
  enNubes: { x: number; y: number; lado: Lado }[];
  /** Hasta dónde bajan las nubes. */
  nubes: number;
}

export function geometriaCamino(cantidad: number, ancho: number): Geometria {
  const alto = SUELO + Math.max(0, cantidad - 1) * PASO + NUBES;
  const punto = (i: number) => {
    const lado: Lado = i % 2 === 0 ? 'izq' : 'der';
    return { x: ancho * (lado === 'izq' ? 0.24 : 0.76), y: alto - SUELO - i * PASO, lado };
  };
  const nodos = Array.from({ length: cantidad }, (_, i) => punto(i));
  const enNubes = Array.from({ length: RAMAS_EN_NUBES }, (_, k) => punto(cantidad + k));
  const ultimo = nodos[nodos.length - 1];
  const nubes = (ultimo ? ultimo.y : alto - SUELO) - PASO * 1.55;
  return { ancho, alto, nodos, enNubes, nubes };
}

/** Dónde se para Piko en un nivel: en el borde del nido, del lado del tronco. */
function lugarDePiko(g: Geometria, numero: number) {
  const n = g.nodos[Math.max(0, Math.min(g.nodos.length - 1, numero - 1))];
  if (!n) return { x: 0, y: 0 };
  const anchoPiko = ALTO_PIKO * (178 / 292);
  const x = n.x + (n.lado === 'izq' ? 46 : -46) - anchoPiko / 2;
  return { x, y: n.y - 2 - ALTO_PIKO };
}

// ------------------------------------------------------------------- dibujos

/** Cortes de las vetas: segmentos de largo distinto, como la corteza real. */
const VETAS = ['40 14 70 18', '26 20 50 12', '60 16 30 22', '34 12 48 26', '50 22 28 14'];
/** Dónde se pela la corteza, de abajo (t = 0) hacia arriba (t = 1). */
const PARCHES = [
  { t: 0.05, o: -16, s: 1.1 },
  { t: 0.14, o: 14, s: 0.9 },
  { t: 0.25, o: -6, s: 0.8 },
  { t: 0.37, o: 10, s: 0.9 },
  { t: 0.48, o: -12, s: 0.8 },
  { t: 0.6, o: 6, s: 0.8 },
  { t: 0.71, o: -6, s: 0.8 },
  { t: 0.83, o: 6, s: 0.7 },
  { t: 0.93, o: -3, s: 0.6 },
];
/** Escamas sueltas entre los parches. */
const ESCAMAS = Array.from({ length: 16 }, (_, k) => ({
  t: 0.03 + k * 0.06,
  o: [8, -14, 16, -4, 12, -18, 2, -10][k % 8] as number,
}));
const NUDOS = [
  { t: 0.31, o: 12, s: 1 },
  { t: 0.66, o: -10, s: 0.8 },
];

/** Punto sobre el eje del tronco, que tiene una curva suave. */
function enTronco(cx: number, base: number, tope: number, t: number) {
  const p0 = { x: cx, y: base - 26 };
  const p1 = { x: cx - 11, y: base - 140 };
  const p2 = { x: cx + 10, y: tope + 140 };
  const p3 = { x: cx, y: tope };
  const u = 1 - t;
  const b = (a: number, b1: number, c: number, d: number) =>
    u * u * u * a + 3 * u * u * t * b1 + 3 * u * t * t * c + t * t * t * d;
  return { x: b(p0.x, p1.x, p2.x, p3.x), y: b(p0.y, p1.y, p2.y, p3.y) };
}

/**
 * Las nubes que tapan la copa: un banco blanco arriba, con el borde de abajo
 * en lóbulos y una segunda capa más transparente que lo deshace, y algún
 * jirón suelto. Lo de arriba del camino queda escondido, como por descubrir.
 */
function Nubes({ ancho, hasta }: { ancho: number; hasta: number }) {
  // Filas de bollos de nube, de arriba hacia abajo. Arriba tapan todo; las
  // de abajo son más transparentes y dejan asomar las hojas.
  const filas = Math.max(1, Math.ceil(hasta / 46));
  const bollos: { x: number; y: number; r: number; o: number }[] = [];
  for (let f = 0; f < filas; f++) {
    const y = f * 46 + 10;
    const abajo = f / Math.max(1, filas - 1);
    const cuantos = 5;
    for (let k = 0; k < cuantos; k++) {
      const x = 38 + ((ancho - 76) * (k + (f % 2) * 0.5)) / (cuantos - 0.5);
      const r = 40 + ((k * 7 + f * 11) % 14);
      bollos.push({ x: Math.min(ancho - 34, x), y, r, o: abajo < 0.5 ? 1 : abajo < 0.8 ? 0.85 : 0.68 });
    }
  }
  const ultima = (filas - 1) * 46 + 10;
  return (
    <G>
      {/* Sombra celeste debajo de cada bollo: les da volumen */}
      {bollos.map((c, k) => (
        <Circle key={`s${k}`} cx={c.x + 4} cy={c.y + 8} r={c.r} fill="#C9E7F7" opacity={c.o} />
      ))}
      {bollos.map((c, k) => (
        <Circle key={`n${k}`} cx={c.x} cy={c.y} r={c.r} fill={color.blanco} opacity={c.o} />
      ))}
      {/* El borde de abajo, deshilachado: nubecitas cada vez más transparentes */}
      {Array.from({ length: 6 }, (_, k) => (
        <Ellipse
          key={`b${k}`}
          cx={30 + k * ((ancho - 60) / 5)}
          cy={ultima + 44 + (k % 2) * 12}
          rx={34}
          ry={16}
          fill={color.blanco}
          opacity={0.55}
        />
      ))}
      {/* Jirones sueltos */}
      <Ellipse cx={ancho * 0.12} cy={hasta + 40} rx={30} ry={10} fill={color.blanco} opacity={0.6} />
      <Ellipse cx={ancho * 0.9} cy={hasta + 54} rx={32} ry={10} fill={color.blanco} opacity={0.55} />
    </G>
  );
}

function ArbolDelCamino({ g }: { g: Geometria }) {
  const cx = g.ancho / 2;
  const base = g.alto - 30;
  // El tronco sigue hasta perderse entre las nubes.
  const tope = 24;
  const ramas = [...g.nodos, ...g.enNubes];

  return (
    <Svg width={g.ancho} height={g.alto} style={StyleSheet.absoluteFill}>
      {/* Suelo */}
      <Ellipse cx={cx} cy={g.alto - 22} rx={g.ancho * 0.62} ry={30} fill={color.verdePasto} />
      <Ellipse cx={cx} cy={g.alto - 26} rx={g.ancho * 0.4} ry={16} fill={color.verdeHoja} opacity={0.45} />

      {/* Ramas: una por nivel, saliendo del tronco hacia su copo. Cada una con
          su sombra abajo y un brillo arriba, para que se vean redondas. */}
      {ramas.map((n, i) => {
        const afuera = n.lado === 'izq' ? -1 : 1;
        const finX = n.x - afuera * 8;
        const d = `M${cx} ${n.y + 100} C ${cx + afuera * 40} ${n.y + 94}, ${finX} ${n.y + 84}, ${finX} ${n.y + 40}`;
        return (
          <G key={`r${i}`}>
            <G y={3}>
              <Path d={d} stroke={ARBOL_COLOR.cortezaSombra} strokeWidth={16} strokeLinecap="round" fill="none" />
            </G>
            <Path d={d} stroke={ARBOL_COLOR.corteza} strokeWidth={15} strokeLinecap="round" fill="none" />
            <G y={-3}>
              <Path d={d} stroke={ARBOL_COLOR.cortezaLuz} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.7} />
            </G>
          </G>
        );
      })}

      {/* Ramitas cortas con hojas en el tronco, del otro lado de cada rama */}
      {ramas.map((n, i) => {
        const otro = n.lado === 'izq' ? 1 : -1;
        const y = n.y + PASO / 2 + 20;
        return (
          <G key={`m${i}`}>
            <Path
              d={`M${cx} ${y + 18} Q ${cx + otro * 22} ${y + 12}, ${cx + otro * 34} ${y}`}
              stroke={ARBOL_COLOR.corteza}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
            />
            <Copo x={cx + otro * 42} y={y - 6} s={0.3} />
          </G>
        );
      })}

      {/* Tronco grueso con las raíces abiertas, angostándose hacia arriba */}
      <Path
        d={`M${cx - 66} ${base + 4} Q ${cx - 38} ${base - 2} ${cx - 34} ${base - 26} C ${cx - 40} ${base - 140}, ${cx - 6} ${tope + 140}, ${cx - 16} ${tope} L ${cx + 16} ${tope} C ${cx + 26} ${tope + 140}, ${cx + 18} ${base - 140}, ${cx + 34} ${base - 26} Q ${cx + 38} ${base - 2} ${cx + 66} ${base + 4} Z`}
        fill={ARBOL_COLOR.corteza}
      />
      <Path d={`M${cx - 18} ${base - 6} Q ${cx} ${base + 14} ${cx + 18} ${base - 6} Z`} fill={ARBOL_COLOR.corteza} />
      {/* Lado en sombra: el tronco se ve redondo */}
      <Path
        d={`M${cx + 34} ${base - 26} C ${cx + 18} ${base - 140}, ${cx + 26} ${tope + 140}, ${cx + 16} ${tope} L ${cx + 7} ${tope} C ${cx + 16} ${tope + 140}, ${cx + 6} ${base - 140}, ${cx + 18} ${base - 26} Q ${cx + 30} ${base - 4} ${cx + 44} ${base + 4} L ${cx + 66} ${base + 4} Q ${cx + 38} ${base - 2} ${cx + 34} ${base - 26} Z`}
        fill={ARBOL_COLOR.cortezaSombra}
        opacity={0.5}
      />
      {/* Vetas finas que siguen la curva del tronco */}
      {[-22, -12, 0, 12, 22].map((o, k) => (
        <Path
          key={`v${k}`}
          d={`M${cx + o} ${base - 24} C ${cx - 11 + o * 0.9} ${base - 140}, ${cx + 10 + o * 0.6} ${tope + 140}, ${cx + o * 0.45} ${tope + 6}`}
          stroke={ARBOL_COLOR.cortezaSombra}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={VETAS[k % VETAS.length]}
          opacity={0.55}
        />
      ))}
      {/* Brillo del lado de la luz */}
      <Path
        d={`M${cx - 8} ${base - 20} C ${cx - 14} ${base - 160}, ${cx + 6} ${tope + 120}, ${cx - 2} ${tope + 20}`}
        stroke={ARBOL_COLOR.cortezaLuz}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      {/* Raíces marcadas */}
      <Path
        d={`M${cx - 22} ${base - 10} Q ${cx - 40} ${base - 2} ${cx - 58} ${base + 2} M${cx + 22} ${base - 10} Q ${cx + 40} ${base - 2} ${cx + 58} ${base + 2} M${cx + 2} ${base - 30} L ${cx} ${base + 6}`}
        stroke={ARBOL_COLOR.cortezaSombra}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
        opacity={0.6}
      />
      {/* La corteza que se pela, y algún nudo */}
      {PARCHES.map((p, k) => {
        const punto = enTronco(cx, base, tope, p.t);
        return <Parche key={`p${k}`} x={punto.x + p.o * (1 - p.t * 0.5)} y={punto.y} s={p.s * (1 - p.t * 0.45)} />;
      })}
      {ESCAMAS.map((p, k) => {
        const punto = enTronco(cx, base, tope, p.t);
        return <Escama key={`e${k}`} x={punto.x + p.o * (1 - p.t * 0.5)} y={punto.y} s={1 - p.t * 0.4} />;
      })}
      {NUDOS.map((p, k) => {
        const punto = enTronco(cx, base, tope, p.t);
        return <Nudo key={`n${k}`} x={punto.x + p.o} y={punto.y} s={p.s} />;
      })}

      {/* Un copo de hojas por rama, con el nido metido arriba */}
      {g.nodos.map((n, i) => (
        <Copo key={`c${i}`} x={n.x} y={n.y + 16} s={1} flores={6} />
      ))}

      {/* Arriba, follaje tupido: las ramas de los niveles que vienen, y más
          copos alrededor del tronco, todo metiéndose en las nubes. */}
      {g.enNubes.map((n, i) => (
        <G key={`a${i}`}>
          <Copo x={n.x} y={n.y + 16} s={1.05} flores={4} />
          <Copo x={cx + (n.lado === 'izq' ? 46 : -46)} y={n.y - 30} s={0.8} flores={3} />
          <Copo x={cx} y={n.y - 70} s={0.9} flores={3} />
        </G>
      ))}
      <Copo x={cx - 40} y={g.nubes + 30} s={0.75} flores={2} />
      <Copo x={cx + 44} y={g.nubes + 18} s={0.7} flores={2} />

      {/* Las dos ramitas que sostienen cada nido */}
      {g.nodos.map((n, i) => (
        <Path
          key={`s${i}`}
          d={`M${n.x} ${n.y + 30} Q ${n.x - 26} ${n.y + 26}, ${n.x - 40} ${n.y + 12} M${n.x} ${n.y + 30} Q ${n.x + 26} ${n.y + 26}, ${n.x + 40} ${n.y + 12}`}
          stroke={ARBOL_COLOR.corteza}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
      ))}

      <Nubes ancho={g.ancho} hasta={g.nubes} />
    </Svg>
  );
}

const LIBROS = {
  vivos: ['#3AA8E0', '#D9452B', '#61A66B'],
  apagados: ['#A9BCC8', '#C8A8A0', '#AFC2AA'],
} as const;

/**
 * El nidito de cada nivel, tejido con ramitas, con tres libros de idiomas
 * adentro. El de un nivel con candado tiene los libros apagados.
 */
function Nido({ resaltado, apagado }: { resaltado: boolean; apagado: boolean }) {
  const [a, b, c] = apagado ? LIBROS.apagados : LIBROS.vivos;
  return (
    <Svg width={NODO.ancho} height={NODO.alto} viewBox="0 0 110 80">
      {resaltado && <Ellipse cx={55} cy={54} rx={55} ry={26} fill={color.verdePasto} opacity={0.45} />}

      {/* El hueco del nido, por detrás de los libros */}
      <Ellipse cx={55} cy={40} rx={50} ry={13} fill="#5A3818" />

      {/* Libros de idiomas, parados y un poco inclinados */}
      <G rotation={-14} origin="34, 52">
        <Rect x={25} y={14} width={17} height={38} rx={2} fill={a} />
        <Rect x={25} y={20} width={17} height={3} fill={color.blanco} opacity={0.7} />
        <Rect x={25} y={42} width={17} height={3} fill={color.blanco} opacity={0.7} />
      </G>
      <Rect x={44} y={6} width={21} height={46} rx={2} fill={b} />
      <Rect x={47} y={13} width={15} height={11} rx={1.5} fill="#FFFDF4" />
      <SvgText x={54.5} y={21.5} fontSize={7} fontWeight="bold" fill={b} textAnchor="middle">
        ABC
      </SvgText>
      <Rect x={44} y={44} width={21} height={3} fill={color.blanco} opacity={0.6} />
      <G rotation={12} origin="74, 52">
        <Rect x={67} y={16} width={16} height={36} rx={2} fill={c} />
        <Rect x={67} y={22} width={16} height={3} fill={color.blanco} opacity={0.7} />
        <Circle cx={75} cy={36} r={3.5} fill={color.blanco} opacity={0.7} />
      </G>

      {/* El frente del nido, tejido */}
      <Path d="M4 38 C 20 52, 90 52, 106 38 C 104 62, 84 76, 55 76 C 26 76, 6 62, 4 38 Z" fill="#8A5A2B" />
      <Path d="M9 46 C 34 60, 76 60, 101 46" stroke="#C48A52" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M12 54 C 36 68, 74 68, 98 54" stroke="#6E4520" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M20 64 C 40 74, 70 74, 90 64" stroke="#B07A44" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M22 50 L30 70 M46 54 L50 75 M66 54 L62 75 M88 50 L80 70" stroke="#6E4520" strokeWidth={1.6} strokeLinecap="round" opacity={0.6} />
      <Path d="M4 38 C 20 52, 90 52, 106 38" stroke="#C48A52" strokeWidth={5} fill="none" strokeLinecap="round" />
      {/* Ramitas sueltas */}
      <Path d="M5 40 L-2 33 M104 39 L111 31 M18 68 L10 74 M92 68 L100 74" stroke="#8A5A2B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Hojas delante del nido, para que quede metido entre las ramas. */
function HojasDelante({ g }: { g: Geometria }) {
  return (
    <Svg width={g.ancho} height={g.alto} style={StyleSheet.absoluteFill} pointerEvents="none">
      {g.nodos.map((n, i) => {
        const afuera = n.lado === 'izq' ? -1 : 1;
        return (
          <G key={i}>
            <Circle cx={n.x + afuera * 50} cy={n.y + 30} r={13} fill={ARBOL_COLOR.hoja} />
            <Circle cx={n.x + afuera * 38} cy={n.y + 40} r={9} fill={ARBOL_COLOR.hojaLuz} />
            <Circle cx={n.x - afuera * 46} cy={n.y + 36} r={8} fill={ARBOL_COLOR.hojaHonda} />
            <Racimo x={n.x + afuera * 50} y={n.y + 28} r={4} />
          </G>
        );
      })}
    </Svg>
  );
}

export function Estrella({ llena, tam = 22 }: { llena: boolean; tam?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Path
        d="M12 2.5 L14.9 8.6 L21.5 9.3 L16.6 13.8 L18 20.4 L12 17 L6 20.4 L7.4 13.8 L2.5 9.3 L9.1 8.6 Z"
        fill={llena ? '#F4C542' : color.blanco}
        stroke={llena ? color.pico : color.bordeHondo}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Candado({ tam = 30 }: { tam?: number }) {
  return (
    <Svg width={tam} height={tam * 1.2} viewBox="0 0 30 36">
      <ArcoSvg />
      <CuerpoSvg />
    </Svg>
  );
}

function ArcoSvg() {
  return <Path d="M8 16 V11 a7 7 0 0 1 14 0 V16" stroke={color.cieloHondo} strokeWidth={4} fill="none" />;
}

function CuerpoSvg() {
  return (
    <G>
      <Rect x={3} y={15} width={24} height={19} rx={5} fill={color.cielo} stroke={color.cieloHondo} strokeWidth={2} />
      <Circle cx={15} cy={23} r={3} fill="#0B3D57" />
      <Rect x={13.8} y={24} width={2.4} height={5} rx={1} fill="#0B3D57" />
      {/* Brillito: se lee como metal */}
      <Rect x={6} y={18} width={3} height={8} rx={1.5} fill={color.blanco} opacity={0.5} />
    </G>
  );
}

const TAM_CANDADO = 30;
/** Hacia dónde salen las chispitas al abrirse un candado. */
const CHISPAS = [0, 60, 120, 180, 240, 300].map((g) => ({
  x: Math.cos((g * Math.PI) / 180),
  y: Math.sin((g * Math.PI) / 180),
  estrella: g % 120 === 0,
}));

interface Abriendo {
  sacude: Animated.Value;
  abre: Animated.Value;
  vuela: Animated.Value;
  chispa: Animated.Value;
}

/**
 * El candado de un nivel. Quieto flota: sube y baja despacito, cada uno a su
 * ritmo. Al abrirse se sacude, se le levanta el arco, sale volando hacia
 * arriba entre chispitas y desaparece.
 */
function CandadoAnimado({
  flota,
  par,
  abriendo,
}: {
  flota: Animated.Value;
  par: boolean;
  abriendo?: Abriendo;
}) {
  const t = TAM_CANDADO;
  const flotaY = flota.interpolate({ inputRange: [0, 0.5, 1], outputRange: par ? [0, -6, 0] : [-6, 0, -6] });
  const flotaGiro = flota.interpolate({ inputRange: [0, 0.5, 1], outputRange: par ? ['-4deg', '4deg', '-4deg'] : ['4deg', '-4deg', '4deg'] });

  const transform = abriendo
    ? [
        {
          rotate: abriendo.sacude.interpolate({
            inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
            outputRange: ['0deg', '-14deg', '12deg', '-10deg', '8deg', '0deg'],
          }),
        },
        { translateY: abriendo.vuela.interpolate({ inputRange: [0, 1], outputRange: [0, -46] }) },
        { scale: abriendo.vuela.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) },
      ]
    : [{ translateY: flotaY }, { rotate: flotaGiro }];

  return (
    <View style={styles.candado} pointerEvents="none">
      {abriendo &&
        CHISPAS.map((c, k) => (
          <Animated.View
            key={k}
            style={[
              styles.chispa,
              {
                opacity: abriendo.chispa.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateX: abriendo.chispa.interpolate({ inputRange: [0, 1], outputRange: [0, c.x * 34] }) },
                  { translateY: abriendo.chispa.interpolate({ inputRange: [0, 1], outputRange: [0, c.y * 30 - 12] }) },
                ],
              },
            ]}
          >
            {c.estrella ? (
              <Estrella llena tam={14} />
            ) : (
              <View style={styles.chispaPunto} />
            )}
          </Animated.View>
        ))}
      <Animated.View
        style={{
          width: t,
          height: t * 1.2,
          transform,
          opacity: abriendo ? abriendo.vuela.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }) : 1,
        }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            abriendo && {
              transform: [
                { translateY: abriendo.abre.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
                { translateX: abriendo.abre.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) },
                { rotate: abriendo.abre.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-24deg'] }) },
              ],
            },
          ]}
        >
          <Svg width={t} height={t * 1.2} viewBox="0 0 30 36">
            <ArcoSvg />
          </Svg>
        </Animated.View>
        <Svg width={t} height={t * 1.2} viewBox="0 0 30 36" style={StyleSheet.absoluteFill}>
          <CuerpoSvg />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ------------------------------------------------------------------ el camino

export interface CaminoNivelesProps {
  niveles: readonly NivelConEstado[];
  ancho: number;
  /** Número del nivel donde está Piko. */
  pikoEn: number;
  /** Si viene, Piko salta desde este nivel hasta `pikoEn`. */
  subiendoDesde?: number | null;
  onElegir: (nivel: NivelConEstado) => void;
  onBloqueado?: (nivel: NivelConEstado) => void;
  onLlego?: () => void;
}

export function CaminoNiveles({
  niveles,
  ancho,
  pikoEn,
  subiendoDesde = null,
  onElegir,
  onBloqueado,
  onLlego,
}: CaminoNivelesProps) {
  const g = useMemo(() => geometriaCamino(niveles.length, ancho), [niveles.length, ancho]);
  const sube = subiendoDesde !== null && subiendoDesde !== pikoEn;

  const a = lugarDePiko(g, sube ? (subiendoDesde as number) : pikoEn);
  const b = lugarDePiko(g, pikoEn);
  const trepa = useRef(new Animated.Value(sube ? 0 : 1)).current;
  const brinco = useRef(new Animated.Value(0)).current;
  const festejo = useRef(new Animated.Value(0)).current;
  const flota = useRef(new Animated.Value(0)).current;
  const abriendo = useRef<Abriendo>({
    sacude: new Animated.Value(0),
    abre: new Animated.Value(0),
    vuela: new Animated.Value(0),
    chispa: new Animated.Value(0),
  }).current;
  const [abierto, setAbierto] = useState(!sube);

  // Los candados flotan: un solo bucle para todos, por el hilo nativo.
  const hayCandados = niveles.some((n) => n.estado === 'bloqueado') || sube;
  useEffect(() => {
    if (!hayCandados) return;
    const bucle = Animated.loop(
      Animated.timing(flota, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    );
    bucle.start();
    return () => bucle.stop();
  }, [hayCandados, flota]);

  useEffect(() => {
    if (!sube) return;
    trepa.setValue(0);
    abriendo.sacude.setValue(0);
    abriendo.abre.setValue(0);
    abriendo.vuela.setValue(0);
    abriendo.chispa.setValue(0);
    setAbierto(false);
    const saltito = Animated.sequence([
      Animated.timing(brinco, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(brinco, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    const anim = Animated.sequence([
      Animated.delay(400),
      // Primero se abre el candado del nivel nuevo…
      Animated.timing(abriendo.sacude, { toValue: 1, duration: 520, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(abriendo.abre, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(abriendo.vuela, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(abriendo.chispa, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      // …y después Piko salta a ese nido.
      Animated.parallel([
        Animated.timing(trepa, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([saltito, saltito, saltito]),
      ]),
      // El nido nuevo se infla una vez: "este es el que sigue".
      Animated.timing(festejo, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(festejo, { toValue: 0, duration: 260, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
    ]);
    // Un toquecito en la mano justo cuando el arco se abre.
    const toque = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }, 400 + 520);
    anim.start(({ finished }) => {
      setAbierto(true);
      if (finished) onLlego?.();
    });
    return () => {
      clearTimeout(toque);
      anim.stop();
    };
    // `onLlego` puede cambiar en cada render y no debe reiniciar la subida.
  }, [sube, subiendoDesde, pikoEn, trepa, brinco, festejo, abriendo]);

  return (
    <View style={{ width: g.ancho, height: g.alto }}>
      <ArbolDelCamino g={g} />

      {niveles.map((n, i) => {
        const pos = g.nodos[i];
        if (!pos) return null;
        const bloqueado = n.estado === 'bloqueado';
        const esActual = n.numero === pikoEn;
        const escala = esActual
          ? festejo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] })
          : 1;
        const etiqueta =
          n.estado === 'superado'
            ? `Nivel ${n.numero}, ${n.titulo}, superado con ${n.estrellas} de 3 estrellas`
            : bloqueado
              ? `Nivel ${n.numero}, ${n.titulo}, con candado`
              : `Nivel ${n.numero}, ${n.titulo}. Tocá para jugar`;
        return (
          <Animated.View
            key={n.packId}
            style={[
              styles.nodo,
              { left: pos.x - NODO.ancho / 2, top: pos.y - NODO.alto / 2 - 4, transform: [{ scale: escala }] },
            ]}
          >
            <Pressable
              onPress={() => (bloqueado ? onBloqueado?.(n) : onElegir(n))}
              accessibilityRole="button"
              accessibilityLabel={etiqueta}
              style={styles.toque}
            >
              <View style={styles.arriba}>
                {n.estado === 'superado' && (
                  <View style={styles.estrellas}>
                    {[1, 2, 3].map((k) => (
                      <Estrella key={k} llena={k <= n.estrellas} tam={k === 2 ? 26 : 22} />
                    ))}
                  </View>
                )}
                {bloqueado && <CandadoAnimado flota={flota} par={i % 2 === 0} />}
                {sube && esActual && !abierto && <CandadoAnimado flota={flota} par={i % 2 === 0} abriendo={abriendo} />}
              </View>
              <View>
                <Nido resaltado={n.estado === 'actual'} apagado={bloqueado} />
                <View style={[styles.placa, bloqueado && styles.placaApagada]}>
                  <Text style={[styles.numero, bloqueado && styles.numeroApagado]}>{n.numero}</Text>
                </View>
              </View>
              <Text style={[styles.titulo, bloqueado && styles.tituloApagado]} numberOfLines={1}>
                {n.titulo}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}

      <HojasDelante g={g} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.piko,
          {
            transform: [
              { translateX: trepa.interpolate({ inputRange: [0, 1], outputRange: [a.x, b.x] }) },
              { translateY: trepa.interpolate({ inputRange: [0, 1], outputRange: [a.y, b.y] }) },
              { translateY: brinco.interpolate({ inputRange: [0, 1], outputRange: [0, -ALTO_PIKO * 0.22] }) },
            ],
          },
        ]}
      >
        <PikoMascota estado={sube ? 'alegre' : 'saludando'} tam={ALTO_PIKO} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  nodo: { position: 'absolute', width: NODO.ancho, alignItems: 'center', marginTop: -30 },
  toque: { alignItems: 'center' },
  arriba: { height: 34, justifyContent: 'flex-end', alignItems: 'center' },
  estrellas: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  candado: { width: TAM_CANDADO, height: TAM_CANDADO * 1.2, alignItems: 'center', justifyContent: 'center' },
  chispa: { position: 'absolute', left: TAM_CANDADO / 2 - 7, top: TAM_CANDADO * 0.6 - 7, width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  chispaPunto: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.cielo },
  placa: {
    position: 'absolute',
    left: NODO.ancho / 2 - 17,
    top: 44,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF6E6',
    borderWidth: 3,
    borderColor: '#D9A066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placaApagada: { backgroundColor: '#EFE7DA', borderColor: '#BFAE96' },
  numero: {
    fontFamily: fuente.tituloFuerte,
    fontSize: 19,
    lineHeight: 23,
    color: '#D9452B',
  },
  numeroApagado: { color: '#8C7A66' },
  titulo: {
    marginTop: 2,
    fontFamily: fuente.titulo,
    fontSize: 13,
    color: color.verdeHondo,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
    paddingHorizontal: 8,
    overflow: 'hidden',
    maxWidth: NODO.ancho + 30,
  },
  tituloApagado: { color: color.tintaSuave },
  piko: { position: 'absolute', left: 0, top: 0 },
});
