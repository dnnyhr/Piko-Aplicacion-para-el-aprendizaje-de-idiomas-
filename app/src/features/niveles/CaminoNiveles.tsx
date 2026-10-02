/**
 * El camino de niveles, dibujado sobre un madroño.
 *
 * El tronco sube por el medio y cada nivel es una rama, alternando de un lado
 * al otro, con un tronquito cortado en la punta para pararse: el 1 abajo,
 * cerca del suelo, y el último arriba, en la copa. Los superados llevan sus
 * estrellas, los que faltan tienen candado, y Piko espera en el que toca.
 *
 * Al volver de superar un nivel, Piko salta de su rama a la siguiente: esa
 * subida es la recompensa que se ve en el camino.
 *
 * El árbol es un único SVG estático; lo único que se anima es Piko y el
 * tronquito nuevo, con `transform` por el hilo nativo.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { NivelConEstado } from '../../core/progress/niveles';
import { ARBOL_COLOR, Racimo } from '../../ui/arbol/dibujo';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import { color, fuente } from '../../ui/tokens';

// ------------------------------------------------------------------ geometría

const PASO = 150;
const SUELO = 130;
const COPA = 230;
const NODO = { ancho: 92, alto: 76 } as const;
const ALTO_PIKO = 74;

export interface Geometria {
  ancho: number;
  alto: number;
  /** Centro del tronquito de cada nivel, por número (índice 0 = nivel 1). */
  nodos: { x: number; y: number; lado: 'izq' | 'der' }[];
}

export function geometriaCamino(cantidad: number, ancho: number): Geometria {
  const alto = SUELO + Math.max(0, cantidad - 1) * PASO + COPA;
  const nodos = Array.from({ length: cantidad }, (_, i) => {
    const lado = i % 2 === 0 ? ('izq' as const) : ('der' as const);
    return { x: ancho * (lado === 'izq' ? 0.25 : 0.75), y: alto - SUELO - i * PASO, lado };
  });
  return { ancho, alto, nodos };
}

/** Dónde se para Piko en un nivel: al costado del número, del lado del tronco. */
function lugarDePiko(g: Geometria, numero: number) {
  const n = g.nodos[Math.max(0, Math.min(g.nodos.length - 1, numero - 1))];
  if (!n) return { x: 0, y: 0 };
  const anchoPiko = ALTO_PIKO * (178 / 292);
  const x = n.x + (n.lado === 'izq' ? 40 : -40) - anchoPiko / 2;
  return { x, y: n.y - 2 - ALTO_PIKO };
}

// ------------------------------------------------------------------- dibujos

function ArbolDelCamino({ g }: { g: Geometria }) {
  const cx = g.ancho / 2;
  const tope = COPA * 0.55;
  const base = g.alto - 36;
  return (
    <Svg width={g.ancho} height={g.alto} style={StyleSheet.absoluteFill}>
      {/* Suelo */}
      <Ellipse cx={cx} cy={g.alto - 26} rx={g.ancho * 0.62} ry={34} fill={color.verdePasto} />
      <Ellipse cx={cx} cy={g.alto - 30} rx={g.ancho * 0.4} ry={18} fill={color.verdeHoja} opacity={0.45} />

      {/* Follaje a lo largo del tronco, del lado contrario a cada rama: así se
          lee como un árbol frondoso y no como un poste. */}
      {g.nodos.map((n, i) => {
        const otro = n.lado === 'izq' ? 1 : -1;
        const y = n.y + PASO / 2;
        return (
          <G key={`f${i}`}>
            <Circle cx={cx + otro * 44} cy={y + 4} r={30} fill={ARBOL_COLOR.hojaHonda} />
            <Circle cx={cx + otro * 70} cy={y - 18} r={22} fill={ARBOL_COLOR.hoja} />
            <Circle cx={cx + otro * 30} cy={y - 26} r={18} fill={ARBOL_COLOR.hojaLuz} opacity={0.85} />
            <Racimo x={cx + otro * 58} y={y - 4} r={5} />
            <Racimo x={cx + otro * 34} y={y - 30} r={4.5} />
          </G>
        );
      })}

      {/* Ramas, detrás del tronco */}
      {g.nodos.map((n, i) => {
        const desdeX = cx + (n.lado === 'izq' ? -10 : 10);
        const hastaX = n.x + (n.lado === 'izq' ? 18 : -18);
        const afuera = n.lado === 'izq' ? -1 : 1;
        return (
          <G key={i}>
            <Path
              d={`M${desdeX} ${n.y + 46} C ${(desdeX + hastaX) / 2} ${n.y + 40}, ${hastaX} ${n.y + 34}, ${hastaX} ${n.y + 22}`}
              stroke={ARBOL_COLOR.corteza}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx={n.x + afuera * 46} cy={n.y + 8} r={24} fill={ARBOL_COLOR.hojaHonda} />
            <Circle cx={n.x + afuera * 34} cy={n.y - 20} r={17} fill={ARBOL_COLOR.hoja} />
            <Circle cx={(cx + n.x) / 2} cy={n.y + 58} r={13} fill={ARBOL_COLOR.hoja} />
            <Racimo x={n.x + afuera * 50} y={n.y + 2} r={5} />
          </G>
        );
      })}

      {/* Tronco: ancho abajo, angosto arriba */}
      <Path
        d={`M${cx - 30} ${base} C ${cx - 22} ${base - 200}, ${cx - 16} ${tope + 200}, ${cx - 13} ${tope} L ${cx + 13} ${tope} C ${cx + 16} ${tope + 200}, ${cx + 22} ${base - 200}, ${cx + 30} ${base} Z`}
        fill={ARBOL_COLOR.corteza}
      />
      <Path
        d={`M${cx - 6} ${base - 20} C ${cx - 4} ${base - 260}, ${cx - 3} ${tope + 160}, ${cx - 2} ${tope + 30}`}
        stroke={ARBOL_COLOR.cortezaLuz}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={`M${cx + 9} ${base - 70} C ${cx + 10} ${base - 140}, ${cx + 9} ${base - 200}, ${cx + 8} ${base - 260}`}
        stroke={ARBOL_COLOR.cortezaLuz}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />

      {/* Copa con flores del madroño */}
      <Circle cx={cx - 80} cy={tope + 10} r={52} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={cx + 82} cy={tope + 4} r={54} fill={ARBOL_COLOR.hojaHonda} />
      <Circle cx={cx} cy={tope - 20} r={86} fill={ARBOL_COLOR.hoja} />
      <Circle cx={cx - 40} cy={tope - 64} r={44} fill={ARBOL_COLOR.hojaLuz} opacity={0.85} />
      <Circle cx={cx + 46} cy={tope - 56} r={46} fill={ARBOL_COLOR.hoja} />
      {[
        [-70, 0],
        [-30, -40],
        [10, 6],
        [52, -24],
        [86, 14],
        [-6, -78],
        [40, -88],
        [-56, -64],
        [24, -44],
        [-100, 20],
      ].map(([dx, dy], i) => (
        <Racimo key={i} x={cx + (dx as number)} y={tope + (dy as number)} r={6} />
      ))}
    </Svg>
  );
}

/** El tronquito cortado donde se para cada nivel, con sus anillos. */
function Tronquito({ resaltado }: { resaltado: boolean }) {
  return (
    <Svg width={NODO.ancho} height={NODO.alto} viewBox="0 0 92 76">
      <Ellipse cx={46} cy={62} rx={40} ry={12} fill="#6E4520" />
      <Rect x={6} y={30} width={80} height={32} fill={ARBOL_COLOR.tierra} />
      <Path d="M20 36 L20 60 M40 38 L40 66 M64 36 L64 62" stroke="#6E4520" strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={46} cy={30} rx={40} ry={15} fill="#D9A066" />
      <Ellipse cx={46} cy={30} rx={28} ry={10} fill="none" stroke="#B07A44" strokeWidth={2} />
      <Ellipse cx={46} cy={30} rx={14} ry={5} fill="none" stroke="#B07A44" strokeWidth={2} />
      {resaltado && <Ellipse cx={46} cy={30} rx={43} ry={17.5} fill="none" stroke={color.verdePasto} strokeWidth={4} />}
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
      // El tronquito nuevo se infla una vez: "este es el que sigue".
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
                <Tronquito resaltado={n.estado === 'actual'} />
                <Text style={[styles.numero, bloqueado && styles.numeroApagado]}>{n.numero}</Text>
              </View>
              <Text style={[styles.titulo, bloqueado && styles.tituloApagado]} numberOfLines={1}>
                {n.titulo}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}

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
  numero: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: fuente.tituloFuerte,
    fontSize: 28,
    lineHeight: 34,
    color: '#D9452B',
    textShadowColor: color.blanco,
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
  numeroApagado: { color: '#8C7A66' },
  titulo: {
    marginTop: -2,
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
