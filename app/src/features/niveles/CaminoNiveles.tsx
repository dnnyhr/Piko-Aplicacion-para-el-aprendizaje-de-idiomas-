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

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { NivelConEstado } from '../../core/progress/niveles';
import { ARBOL_COLOR, Copo, Racimo } from '../../ui/arbol/dibujo';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import { color, fuente } from '../../ui/tokens';

// ------------------------------------------------------------------ geometría

/**
 * El madroño del camino: tronco grueso con las raíces abiertas que sube por
 * el medio, y de él salen ramas separadas, alternando de lado, cada una con
 * su propio copo de hojas y un nido. El último nivel va arriba, en el copo de
 * la punta.
 */
const PASO = 140;
const SUELO = 130;
const ARRIBA = 150;
const NODO = { ancho: 110, alto: 80 } as const;
const ALTO_PIKO = 74;

export interface Geometria {
  ancho: number;
  alto: number;
  /** Centro del nido de cada nivel, por número (índice 0 = nivel 1). */
  nodos: { x: number; y: number; lado: 'izq' | 'der'; punta: boolean }[];
}

export function geometriaCamino(cantidad: number, ancho: number): Geometria {
  const alto = SUELO + Math.max(0, cantidad - 1) * PASO + ARRIBA;
  const nodos = Array.from({ length: cantidad }, (_, i) => {
    const lado = i % 2 === 0 ? ('izq' as const) : ('der' as const);
    const punta = i === cantidad - 1 && cantidad > 1;
    const x = punta ? ancho * 0.5 : ancho * (lado === 'izq' ? 0.24 : 0.76);
    return { x, y: alto - SUELO - i * PASO, lado, punta };
  });
  return { ancho, alto, nodos };
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

function ArbolDelCamino({ g }: { g: Geometria }) {
  const cx = g.ancho / 2;
  const base = g.alto - 30;
  const ultimo = g.nodos[g.nodos.length - 1];
  const tope = (ultimo?.y ?? base - 200) + 40;
  const ramas = g.nodos.filter((n) => !n.punta);

  return (
    <Svg width={g.ancho} height={g.alto} style={StyleSheet.absoluteFill}>
      {/* Suelo */}
      <Ellipse cx={cx} cy={g.alto - 22} rx={g.ancho * 0.62} ry={30} fill={color.verdePasto} />
      <Ellipse cx={cx} cy={g.alto - 26} rx={g.ancho * 0.4} ry={16} fill={color.verdeHoja} opacity={0.45} />

      {/* Ramas: una por nivel, saliendo del tronco hacia su copo */}
      {ramas.map((n, i) => {
        const afuera = n.lado === 'izq' ? -1 : 1;
        const finX = n.x - afuera * 8;
        return (
          <Path
            key={`r${i}`}
            d={`M${cx} ${n.y + 100} C ${cx + afuera * 40} ${n.y + 94}, ${finX} ${n.y + 84}, ${finX} ${n.y + 40}`}
            stroke={ARBOL_COLOR.corteza}
            strokeWidth={16}
            strokeLinecap="round"
            fill="none"
          />
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
      {/* Corteza lisa que se pela: las manchas claras del madroño */}
      <Path
        d={`M${cx - 8} ${base - 20} C ${cx - 14} ${base - 160}, ${cx + 6} ${tope + 120}, ${cx - 2} ${tope + 20}`}
        stroke={ARBOL_COLOR.cortezaLuz}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Ellipse cx={cx + 12} cy={base - 60} rx={5} ry={14} fill={ARBOL_COLOR.cortezaLuz} opacity={0.7} />
      <Ellipse cx={cx + 7} cy={(base + tope) / 2} rx={3} ry={10} fill={ARBOL_COLOR.cortezaLuz} opacity={0.6} />

      {/* Un copo de hojas por rama, con el nido metido arriba */}
      {g.nodos.map((n, i) => (
        <Copo key={`c${i}`} x={n.x} y={n.y + (n.punta ? 6 : 16)} s={n.punta ? 1.2 : 1} flores={n.punta ? 8 : 6} />
      ))}

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
      <Path d="M8 16 V11 a7 7 0 0 1 14 0 V16" stroke={color.cieloHondo} strokeWidth={4} fill="none" />
      <Rect x={3} y={15} width={24} height={19} rx={5} fill={color.cielo} stroke={color.cieloHondo} strokeWidth={2} />
      <Circle cx={15} cy={23} r={3} fill="#0B3D57" />
      <Rect x={13.8} y={24} width={2.4} height={5} rx={1} fill="#0B3D57" />
    </Svg>
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

  useEffect(() => {
    if (!sube) return;
    trepa.setValue(0);
    const saltito = Animated.sequence([
      Animated.timing(brinco, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(brinco, { toValue: 0, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    const anim = Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(trepa, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([saltito, saltito, saltito]),
      ]),
      // El nido nuevo se infla una vez: "este es el que sigue".
      Animated.timing(festejo, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(festejo, { toValue: 0, duration: 260, easing: Easing.out(Easing.back(3)), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && onLlego?.());
    return () => anim.stop();
    // `onLlego` puede cambiar en cada render y no debe reiniciar la subida.
  }, [sube, subiendoDesde, pikoEn, trepa, brinco, festejo]);

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
                {bloqueado && <Candado />}
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
