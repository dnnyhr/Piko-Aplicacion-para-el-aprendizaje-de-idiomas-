/**
 * La rayuela dibujada con tiza y Piko saltando por ella.
 *
 * La forma es la de siempre: la casilla 1 abajo (donde está Piko), arriba un
 * par 2|3, una sola 4, otro par 5|6 y el cielo. Las respuestas van escritas
 * en las casillas de adelante; Piko salta a la que se toca.
 *
 * Las animaciones mueven sólo `transform` y `opacity` con el driver nativo:
 * corren fuera del hilo de JS y no hacen relayout, que es lo que aguanta un
 * Android de gama baja.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { PikoMascota } from '../../../ui/piko/PikoMascota';
import type { EstadoPiko } from '../../../ui/piko/sprites';
import { Pictograma } from '../../../ui/minijuegos/Pictograma';
import { TIZA } from '../../../ui/minijuegos/Escena';
import { color, fuente } from '../../../ui/tokens';

export type EstadoCasilla = 'normal' | 'correcta' | 'intento' | 'probada' | 'apagada';

export interface Casilla {
  texto: string;
  /** Palabra en español para el dibujo de apoyo, si va. */
  dibujo?: string;
  estado: EstadoCasilla;
}

export interface TableroProps {
  casillas: readonly Casilla[];
  /** Dónde está Piko: en la casilla 1 o en la casilla de una respuesta. */
  pikoEn: number | 'inicio';
  estadoPiko: EstadoPiko;
  /** Cambia en cada salto nuevo: la rayuela "avanza" y Piko vuelve a la 1 sin saltar. */
  paso: number;
  bloqueado: boolean;
  etiquetaCielo: string;
  etiquetaCasilla: (n: number, texto: string) => string;
  onElegir: (i: number) => void;
}

const SALTO_MS = 440;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Filas por encima de la casilla 1, según cuántas respuestas hay. */
function filasPara(n: number): ('par' | 'una')[] {
  if (n <= 3) return ['par', 'una'];
  if (n === 4) return ['par', 'par'];
  return ['par', 'una', 'par'];
}

function geometria(ancho: number, alto: number, n: number) {
  const filas = filasPara(n);
  const col = Math.min(150, Math.floor((ancho - 40) / 2));
  const arco = Math.round(col * 0.5);
  const pie = 26;
  const celdaAlto = Math.max(56, Math.min(96, Math.floor((alto - pie - arco) / (filas.length + 1))));
  const borde = 3;
  const x0 = Math.round((ancho - (2 * col - borde)) / 2);
  const xUna = Math.round((ancho - col) / 2);
  // Con pocas casillas sobra patio: la rayuela sube hasta quedar en el medio.
  const total = arco + (celdaAlto - borde) * filas.length + celdaAlto;
  const sobra = Math.max(0, alto - pie - total);
  const yInicio = alto - pie - celdaAlto - Math.round(sobra / 2);
  const inicio: Rect = { x: xUna, y: yInicio, w: col, h: celdaAlto };
  const casillas: Rect[] = [];
  filas.forEach((f, r) => {
    const y = yInicio - (celdaAlto - borde) * (r + 1);
    if (f === 'par') {
      casillas.push({ x: x0, y, w: col, h: celdaAlto }, { x: x0 + col - borde, y, w: col, h: celdaAlto });
    } else {
      casillas.push({ x: xUna, y, w: col, h: celdaAlto });
    }
  });
  const ultima = yInicio - (celdaAlto - borde) * filas.length;
  const cielo: Rect = { x: x0, y: ultima - arco + borde, w: 2 * col - borde, h: arco };
  return { inicio, casillas: casillas.slice(0, n), cielo, celdaAlto, pie };
}

export function Tablero({
  casillas,
  pikoEn,
  estadoPiko,
  paso,
  bloqueado,
  etiquetaCielo,
  etiquetaCasilla,
  onElegir,
}: TableroProps) {
  const [tam, setTam] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!tam || Math.abs(tam.w - width) > 1 || Math.abs(tam.h - height) > 1) setTam({ w: width, h: height });
  };

  const geo = useMemo(() => (tam ? geometria(tam.w, tam.h, casillas.length) : null), [tam, casillas.length]);
  const pikoAlto = geo ? Math.min(geo.celdaAlto * 1.1, 104) : 90;
  const pikoAncho = (pikoAlto * 178) / 292;

  const destino = (en: number | 'inicio'): { x: number; y: number } => {
    if (!geo) return { x: 0, y: 0 };
    const r = en === 'inicio' ? geo.inicio : (geo.casillas[en] ?? geo.inicio);
    return { x: r.x + r.w / 2 - pikoAncho / 2, y: r.y + r.h - 6 - pikoAlto };
  };

  // Posición de Piko, el brinco (arco hacia arriba) y el aplastón al despegar y caer.
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const brinco = useRef(new Animated.Value(0)).current;
  const entrada = useRef(new Animated.Value(1)).current;
  const [sinMovimiento, setSinMovimiento] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setSinMovimiento)
      .catch(() => undefined);
  }, []);

  const ultimoPaso = useRef<number | null>(null);
  useEffect(() => {
    if (!geo) return;
    const d = destino(pikoEn);
    const nuevoTramo = ultimoPaso.current !== paso;
    ultimoPaso.current = paso;
    if (nuevoTramo || sinMovimiento) {
      // Tramo nuevo de la rayuela: Piko ya está en la 1 y las casillas aparecen.
      pos.setValue(d);
      if (nuevoTramo && !sinMovimiento) {
        entrada.setValue(0);
        Animated.timing(entrada, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      }
      return;
    }
    brinco.setValue(0);
    Animated.parallel([
      Animated.timing(pos, {
        toValue: d,
        duration: SALTO_MS,
        delay: 90,
        easing: Easing.bezier(0.3, 0.7, 0.4, 1),
        useNativeDriver: true,
      }),
      Animated.timing(brinco, { toValue: 1, duration: SALTO_MS + 90, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [pikoEn, paso, geo]); // eslint-disable-line react-hooks/exhaustive-deps

  const subida = brinco.interpolate({ inputRange: [0, 0.18, 0.55, 0.9, 1], outputRange: [0, 0, -64, 0, 0] });
  const ancho = brinco.interpolate({ inputRange: [0, 0.18, 0.55, 0.9, 1], outputRange: [1, 1.1, 0.94, 1.08, 1] });
  const altoEsc = brinco.interpolate({ inputRange: [0, 0.18, 0.55, 0.9, 1], outputRange: [1, 0.86, 1.07, 0.9, 1] });
  const caidaEntrada = entrada.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });

  return (
    <View style={styles.raiz} onLayout={onLayout}>
      {geo && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: entrada, transform: [{ translateY: caidaEntrada }] }]}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.cielo,
                {
                  left: geo.cielo.x,
                  top: geo.cielo.y,
                  width: geo.cielo.w,
                  height: geo.cielo.h,
                  borderTopLeftRadius: geo.cielo.w / 2,
                  borderTopRightRadius: geo.cielo.w / 2,
                },
              ]}
            >
              <Text style={styles.cieloTexto}>{etiquetaCielo.toLocaleUpperCase('es')}</Text>
            </View>
            {casillas.map((c, i) => (
              <Celda
                key={`${paso}-${i}`}
                casilla={c}
                numero={i + 2}
                rect={geo.casillas[i] as Rect}
                bloqueada={bloqueado || c.estado !== 'normal'}
                etiqueta={etiquetaCasilla(i + 2, c.texto)}
                quieta={sinMovimiento}
                onPress={() => onElegir(i)}
              />
            ))}
          </Animated.View>

          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.celda, styles.celdaInicio, { left: geo.inicio.x, top: geo.inicio.y, width: geo.inicio.w, height: geo.inicio.h }]}
          >
            <Text style={styles.numero}>1</Text>
            <View style={styles.piedrita} />
          </View>

          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.piko, { transform: [{ translateX: pos.x }, { translateY: pos.y }] }]}
          >
            <Animated.View style={{ transform: [{ translateY: subida }, { scaleX: ancho }, { scaleY: altoEsc }] }}>
              <PikoMascota estado={estadoPiko} tam={pikoAlto} />
            </Animated.View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const COLORES: Record<EstadoCasilla, { fondo: string; borde: string; tinta: string; opacidad: number }> = {
  normal: { fondo: 'rgba(255,253,244,0.38)', borde: TIZA, tinta: color.grafito, opacidad: 1 },
  correcta: { fondo: color.aciertoFondo, borde: color.acierto, tinta: color.aciertoTinta, opacidad: 1 },
  intento: { fondo: color.intentoFondo, borde: color.intento, tinta: color.intentoTinta, opacidad: 1 },
  probada: { fondo: 'rgba(255,253,244,0.38)', borde: TIZA, tinta: color.grafito, opacidad: 0.4 },
  apagada: { fondo: 'rgba(255,253,244,0.38)', borde: TIZA, tinta: color.grafito, opacidad: 0.55 },
};

function Celda({
  casilla,
  numero,
  rect,
  bloqueada,
  etiqueta,
  quieta,
  onPress,
}: {
  casilla: Casilla;
  numero: number;
  rect: Rect;
  bloqueada: boolean;
  etiqueta: string;
  quieta: boolean;
  onPress: () => void;
}) {
  const golpe = useRef(new Animated.Value(0)).current;
  const c = COLORES[casilla.estado];

  // Acierto: un latido. Intento: un temblor corto, cuando Piko ya volvió.
  useEffect(() => {
    if (quieta || (casilla.estado !== 'correcta' && casilla.estado !== 'intento')) return;
    golpe.setValue(0);
    Animated.timing(golpe, {
      toValue: 1,
      duration: casilla.estado === 'correcta' ? 520 : 360,
      delay: casilla.estado === 'intento' ? 120 : 0,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [casilla.estado, golpe, quieta]);

  const escala =
    casilla.estado === 'correcta'
      ? golpe.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.07, 1] })
      : 1;
  const temblor =
    casilla.estado === 'intento'
      ? golpe.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, -6, 6, 0] })
      : 0;

  const larga = casilla.texto.length > 13;
  return (
    <Animated.View
      style={[
        styles.abs,
        { left: rect.x, top: rect.y, width: rect.w, height: rect.h, opacity: c.opacidad },
        { transform: [{ scale: escala }, { translateX: temblor }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={bloqueada}
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        accessibilityState={{ disabled: bloqueada }}
        style={[styles.celda, styles.lleno, { backgroundColor: c.fondo, borderColor: c.borde }]}
      >
        <Text style={[styles.numero, { color: casilla.estado === 'normal' || casilla.estado === 'probada' || casilla.estado === 'apagada' ? TIZA : c.borde }]}>
          {numero}
        </Text>
        {casilla.dibujo ? <Pictograma es={casilla.dibujo} tam={Math.min(40, rect.h * 0.42)} /> : null}
        <Text
          numberOfLines={3}
          adjustsFontSizeToFit
          style={[larga ? styles.textoLargo : casilla.texto.length > 9 ? styles.textoMedio : styles.texto, { color: c.tinta }]}
        >
          {casilla.texto}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  abs: { position: 'absolute' },
  lleno: { flex: 1 },
  cielo: {
    position: 'absolute',
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: TIZA,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  cieloTexto: { fontFamily: fuente.titulo, fontSize: 13, letterSpacing: 4, color: TIZA },
  celda: {
    borderWidth: 3,
    borderColor: TIZA,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  celdaInicio: { position: 'absolute', backgroundColor: 'rgba(255,253,244,0.18)' },
  numero: { position: 'absolute', left: 6, top: 2, fontFamily: fuente.titulo, fontSize: 13, color: TIZA },
  piedrita: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    width: 16,
    height: 10,
    borderRadius: 8,
    backgroundColor: '#9B8B78',
  },
  piko: { position: 'absolute', left: 0, top: 0, zIndex: 3 },
  texto: { fontFamily: fuente.titulo, fontSize: 19, lineHeight: 23, textAlign: 'center' },
  textoMedio: { fontFamily: fuente.titulo, fontSize: 16, lineHeight: 20, textAlign: 'center' },
  textoLargo: { fontFamily: fuente.cuerpoFuerte, fontSize: 14, lineHeight: 18, textAlign: 'center' },
});
