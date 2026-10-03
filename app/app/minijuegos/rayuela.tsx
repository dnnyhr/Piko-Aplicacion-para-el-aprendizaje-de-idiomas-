/**
 * Rayuela de Piko.
 *
 * Aprendo → juego → salto con Piko → gano sacuanjoches → crece mi madroño.
 * Las palabras salen de las lecciones que el estudiante ya hizo; las flores
 * entran al mismo log de progreso que las lecciones, así que suman al total,
 * se ven en el perfil, hacen crecer el madroño y no se pierden al cerrar la
 * app.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { useTextos } from '../../src/ui/textos/useTextos';
import { elegir } from '../../src/ui/piko/frases';
import { useProgreso } from '../../src/features/progreso/store';
import { useMinijuegos } from '../../src/features/minijuegos/store';
import { decir, vozDePiko } from '../../src/features/minijuegos/voz';
import { Elegir } from '../../src/features/minijuegos/rayuela/Elegir';
import { Juego } from '../../src/features/minijuegos/rayuela/Juego';
import { Fin } from '../../src/features/minijuegos/rayuela/Fin';
import {
  armarPartida,
  diaLocal,
  ID_RAYUELA,
  LENGUAS_RAYUELA,
  nivelesDe,
  nivelSugerido,
  paquetesEstudiados,
  SALTOS,
  vocabularioAprendido,
  type LenguaRayuela,
  type NivelRayuela,
  type Pregunta,
} from '../../src/core/minijuegos/rayuela';
import { clavePremio, yaPremiado } from '../../src/core/progress/projection';
import type { Recompensa } from '../../src/core/progress/arbol';
import { color } from '../../src/ui/tokens';
import { PACKS } from '../../content';

type Fase = 'elegir' | 'jugando' | 'fin';

interface Final {
  recompensa: Recompensa;
  primeros: number;
  repetida: boolean;
  xpGanado: number;
  titulo: string;
}

export default function Rayuela() {
  const router = useRouter();
  const { t, frases, idioma } = useTextos();
  const estado = useProgreso((s) => s.estado);
  const registrar = useProgreso((s) => s.registrar);
  const terminarMinijuego = useProgreso((s) => s.terminarMinijuego);
  const lenguaGuardada = useMinijuegos((s) => s.lengua);
  const elegirLengua = useMinijuegos((s) => s.elegirLengua);
  const lengua: LenguaRayuela = lenguaGuardada ?? 'eng';

  // Lo guardado de otras veces: las lecciones hechas abren los niveles.
  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const niveles = useMemo(() => nivelesDe(PACKS, estado, lengua), [estado, lengua]);
  const sugerido = nivelSugerido(niveles);
  const [elegido, setElegido] = useState<NivelRayuela | null>(null);
  const abierto = (n: NivelRayuela | null) => !!n && niveles.some((x) => x.nivel === n && x.abierto);
  const nivel = abierto(elegido) ? elegido : sugerido;

  const temas = useMemo(() => {
    const out = {} as Record<LenguaRayuela, string[]>;
    for (const l of LENGUAS_RAYUELA) {
      out[l] = [...new Set(paquetesEstudiados(PACKS, estado, l).map((p) => p.theme))].sort();
    }
    return out;
  }, [estado]);

  const [fase, setFase] = useState<Fase>('elegir');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [final, setFinal] = useState<Final | null>(null);
  // Fijados al empezar: lo que cambia durante la partida no debe mover la regla.
  const partida = useRef<{ nivel: NivelRayuela; premiable: boolean; xpInicio: number }>({
    nivel: 'inicial',
    premiable: true,
    xpInicio: 0,
  });

  const empezar = () => {
    if (!nivel) return;
    const actual = useProgreso.getState().estado;
    const armada = armarPartida(vocabularioAprendido(PACKS, actual, lengua), nivel, actual, Math.random);
    if (armada.length === 0) return;
    partida.current = {
      nivel,
      // Si esta rayuela ya dio flores hoy, se juega de práctica: sin XP ni flores.
      premiable: !yaPremiado(actual, clavePremio(ID_RAYUELA, lengua, nivel), diaLocal()),
      xpInicio: actual.xp,
    };
    setPreguntas(armada);
    setFinal(null);
    setFase('jugando');
  };

  const terminar = (primeros: number) => {
    const { nivel: jugado, premiable, xpInicio } = partida.current;
    const recompensa = terminarMinijuego({
      game: ID_RAYUELA,
      lang: lengua,
      level: jugado,
      correct: primeros,
      total: SALTOS,
      day: diaLocal(),
    });
    const repetida = !premiable;
    const titulo =
      recompensa.ganadas > 0
        ? recompensa.crecioArbol
          ? elegir(frases('piko.arbol_crece'))
          : primeros === SALTOS
            ? t('rayuela.fin_cielo')
            : t('rayuela.fin_bien')
        : repetida
          ? t('rayuela.fin_repetida')
          : t('rayuela.fin_sin_flores');
    decir([vozDePiko(titulo, idioma)]);
    setFinal({
      recompensa,
      primeros,
      repetida,
      xpGanado: Math.max(0, useProgreso.getState().estado.xp - xpInicio),
      titulo,
    });
    setFase('fin');
  };

  if (fase === 'jugando' && preguntas.length > 0) {
    return (
      <Pantalla acolchado={false} fondo={color.nube}>
        <Juego
          preguntas={preguntas}
          lengua={lengua}
          nivel={partida.current.nivel}
          sacuanjoches={estado.sacuanjoches}
          onResponder={(palabra, acerto, ms) => {
            if (partida.current.premiable) registrar(palabra.item, palabra.packId, acerto, ms);
          }}
          onTerminar={terminar}
          onSalir={() => setFase('elegir')}
        />
      </Pantalla>
    );
  }

  if (fase === 'fin' && final) {
    return (
      <Pantalla>
        <Fin
          {...final}
          onOtra={() => setFase('elegir')}
          onVolverASaltar={empezar}
          onVerArbol={() => router.push('/arbol')}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Elegir
        lengua={lengua}
        nivel={nivel}
        niveles={niveles}
        sugerido={sugerido}
        temas={temas}
        sacuanjoches={estado.sacuanjoches}
        onLengua={(l) => {
          elegirLengua(l);
          setElegido(null);
        }}
        onNivel={setElegido}
        onEmpezar={empezar}
        onPracticar={() => router.push('/practicar')}
        onVolver={() => router.back()}
        onPerfil={() => router.push('/perfil')}
      />
    </Pantalla>
  );
}
