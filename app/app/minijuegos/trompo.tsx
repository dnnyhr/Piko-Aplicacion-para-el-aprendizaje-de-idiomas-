/**
 * El Trompo de Piko.
 *
 * Aprendo → lanzo el trompo → respondo → lo mantengo girando → gano
 * sacuanjoches → crece mi madroño. Las palabras salen de las lecciones que
 * el estudiante ya hizo; las respuestas y las flores entran al mismo log de
 * progreso que las lecciones: se guardan sin internet, suman al total y al
 * madroño, y viajan al maestro cuando hay clase.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { useTextos } from '../../src/ui/textos/useTextos';
import { elegir } from '../../src/ui/piko/frases';
import { useProgreso } from '../../src/features/progreso/store';
import { useMinijuegos } from '../../src/features/minijuegos/store';
import { decir, vozDePiko } from '../../src/features/minijuegos/voz';
import { ElegirPartida } from '../../src/features/minijuegos/ElegirPartida';
import { FinPartida } from '../../src/features/minijuegos/FinPartida';
import { JuegoTrompo } from '../../src/features/minijuegos/trompo/Juego';
import { Bandera } from '../../src/ui/minijuegos/Bandera';
import { Hoja } from '../../src/ui/minijuegos/Iconos';
import { DibujoTrompo } from '../../src/ui/minijuegos/Trompo';
import { tienePictograma } from '../../src/ui/minijuegos/Pictograma';
import {
  diaLocal,
  LENGUAS_MINIJUEGOS,
  nivelesDe,
  nivelSugerido,
  paquetesEstudiados,
  vocabularioAprendido,
  type LenguaMinijuego,
  type NivelMinijuego,
} from '../../src/core/minijuegos/vocabulario';
import { armarRetos, ID_TROMPO, META, OPCIONES, SEGUNDOS, type EstadoTrompo, type Reto } from '../../src/core/minijuegos/trompo';
import { clavePremio, yaPremiado } from '../../src/core/progress/projection';
import type { Recompensa } from '../../src/core/progress/arbol';
import { color } from '../../src/ui/tokens';
import { PACKS } from '../../content';

type Fase = 'elegir' | 'jugando' | 'fin';

interface Final {
  recompensa: Recompensa;
  partida: EstadoTrompo;
  repetida: boolean;
  titulo: string;
}

export default function Trompo() {
  const router = useRouter();
  const { t, frases, idioma } = useTextos();
  const estado = useProgreso((s) => s.estado);
  const registrar = useProgreso((s) => s.registrar);
  const terminarMinijuego = useProgreso((s) => s.terminarMinijuego);
  const lenguaGuardada = useMinijuegos((s) => s.lengua);
  const elegirLengua = useMinijuegos((s) => s.elegirLengua);
  const lengua: LenguaMinijuego = lenguaGuardada ?? 'eng';

  // Lo guardado de otras veces: las lecciones hechas abren los niveles.
  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const niveles = useMemo(() => nivelesDe(PACKS, estado, lengua, OPCIONES), [estado, lengua]);
  const sugerido = nivelSugerido(niveles);
  const [elegido, setElegido] = useState<NivelMinijuego | null>(null);
  const abierto = (n: NivelMinijuego | null) => !!n && niveles.some((x) => x.nivel === n && x.abierto);
  const nivel = abierto(elegido) ? elegido : sugerido;

  const temas = useMemo(() => {
    const out = {} as Record<LenguaMinijuego, string[]>;
    for (const l of LENGUAS_MINIJUEGOS) {
      out[l] = [...new Set(paquetesEstudiados(PACKS, estado, l).map((p) => p.theme))].sort();
    }
    return out;
  }, [estado]);

  const [fase, setFase] = useState<Fase>('elegir');
  const [retos, setRetos] = useState<Reto[]>([]);
  const [intento, setIntento] = useState(0);
  const [final, setFinal] = useState<Final | null>(null);
  // Fijados al lanzar: lo que cambia durante la partida no debe mover la regla.
  const partida = useRef<{ nivel: NivelMinijuego; premiable: boolean }>({ nivel: 'inicial', premiable: true });

  const empezar = () => {
    if (!nivel) return;
    const actual = useProgreso.getState().estado;
    const armados = armarRetos(vocabularioAprendido(PACKS, actual, lengua), nivel, actual, Math.random, tienePictograma);
    if (armados.length === 0) return;
    partida.current = {
      nivel,
      // Si este trompo ya dio flores hoy en este nivel, se juega de práctica: sin XP ni flores.
      premiable: !yaPremiado(actual, clavePremio(ID_TROMPO, lengua, nivel), diaLocal()),
    };
    setRetos(armados);
    setIntento((n) => n + 1);
    setFinal(null);
    setFase('jugando');
  };

  const terminar = (resultado: EstadoTrompo) => {
    const { nivel: jugado, premiable } = partida.current;
    const recompensa = terminarMinijuego({
      game: ID_TROMPO,
      lang: lengua,
      level: jugado,
      correct: resultado.aciertos,
      total: resultado.respondidas,
      streak: resultado.mejorRacha,
      day: diaLocal(),
    });
    const repetida = !premiable;
    const titulo =
      recompensa.ganadas > 0
        ? recompensa.crecioArbol
          ? elegir(frases('piko.arbol_crece'))
          : t('trompo.fin_completo')
        : repetida
          ? t('trompo.fin_repetida')
          : t('trompo.fin_cayo');
    decir([vozDePiko(titulo, idioma)]);
    setFinal({ recompensa, partida: resultado, repetida, titulo });
    setFase('fin');
  };

  if (fase === 'jugando' && retos.length > 0) {
    return (
      <Pantalla acolchado={false} fondo={color.nube}>
        <JuegoTrompo
          key={intento}
          retos={retos}
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
    const p = final.partida;
    return (
      <Pantalla>
        <FinPartida
          recompensa={final.recompensa}
          repetida={final.repetida}
          titulo={final.titulo}
          explicacionSinFlores={t('trompo.sin_flores_explica', { meta: META })}
          datos={[
            { valor: `${p.aciertos}/${p.respondidas}`, etiqueta: t('trompo.aciertos_etiqueta') },
            { valor: String(p.mejorRacha), etiqueta: t('trompo.mejor_racha') },
            { valor: String(p.puntos), etiqueta: t('trompo.puntos_etiqueta') },
          ]}
          textoReintentar={t('trompo.lanzar_otra_vez')}
          textoOtra={t('trompo.otra_partida')}
          onReintentar={empezar}
          onOtra={() => setFase('elegir')}
          onVerArbol={() => router.push('/arbol')}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <ElegirPartida
        titulo={t('trompo.nombre')}
        portada={<DibujoTrompo tam={120} />}
        pregunta={t('trompo.elegir_lengua')}
        iconoLengua={(l) => (l === 'miq' ? <Hoja /> : <Bandera lengua={l} />)}
        detalleNivel={(n) => t('trompo.detalle_nivel', { n: OPCIONES[n], s: SEGUNDOS[n] })}
        descNivel={(n) => t(`trompo.desc_${n}`)}
        empezar={t('trompo.a_jugar')}
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
