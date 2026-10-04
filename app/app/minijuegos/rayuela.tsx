/**
 * Rayuela de Piko.
 *
 * Aprendo → juego → salto con Piko → gano sacuanjoches → crece mi madroño.
 * Las palabras salen de las lecciones que el estudiante ya hizo; las flores
 * entran al mismo log de progreso que las lecciones, así que suman al total,
 * se ven en el perfil, hacen crecer el madroño y no se pierden al cerrar la
 * app.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { useTextos } from '../../src/ui/textos/useTextos';
import { elegir } from '../../src/ui/piko/frases';
import { useMinijuego, type CierreMinijuego } from '../../src/features/minijuegos/useMinijuego';
import { decir, vozDePiko } from '../../src/features/minijuegos/voz';
import { ElegirPartida } from '../../src/features/minijuegos/ElegirPartida';
import { Juego } from '../../src/features/minijuegos/rayuela/Juego';
import { FinPartida } from '../../src/features/minijuegos/FinPartida';
import { Bandera } from '../../src/ui/minijuegos/Bandera';
import { IconoRayuela } from '../../src/ui/minijuegos/IconoRayuela';
import { armarPartida, CASILLAS, ID_RAYUELA, SALTOS, type Pregunta } from '../../src/core/minijuegos/rayuela';
import { color } from '../../src/ui/tokens';

type Fase = 'elegir' | 'jugando' | 'fin';

/** Aciertos al primer salto que hacen falta para que haya flores (ver `sacuanjochesPorMinijuego`). */
const MINIMO_FLORES = Math.ceil((SALTOS * 2) / 3);

interface Final extends CierreMinijuego {
  primeros: number;
  titulo: string;
}

export default function Rayuela() {
  const router = useRouter();
  const { t, frases, idioma } = useTextos();
  const juego = useMinijuego(ID_RAYUELA, CASILLAS);
  const [fase, setFase] = useState<Fase>('elegir');
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [final, setFinal] = useState<Final | null>(null);

  const empezar = () => {
    const base = juego.empezar();
    if (!base) return;
    const armada = armarPartida(base.vocab, base.nivel, base.estado, Math.random);
    if (armada.length === 0) return;
    setPreguntas(armada);
    setFinal(null);
    setFase('jugando');
  };

  const terminar = (primeros: number) => {
    const cierre = juego.cerrar({ correct: primeros, total: SALTOS });
    const titulo =
      cierre.recompensa.ganadas > 0
        ? cierre.recompensa.crecioArbol
          ? elegir(frases('piko.arbol_crece'))
          : primeros === SALTOS
            ? t('rayuela.fin_cielo')
            : t('rayuela.fin_bien')
        : cierre.repetida
          ? t('rayuela.fin_repetida')
          : t('rayuela.fin_sin_flores');
    decir([vozDePiko(titulo, idioma)]);
    setFinal({ ...cierre, primeros, titulo });
    setFase('fin');
  };

  if (fase === 'jugando' && preguntas.length > 0) {
    return (
      <Pantalla acolchado={false} fondo={color.nube}>
        <Juego
          preguntas={preguntas}
          lengua={juego.lengua}
          nivel={juego.partida.current.nivel}
          sacuanjoches={juego.estado.sacuanjoches}
          onResponder={juego.responder}
          onTerminar={terminar}
          onSalir={() => setFase('elegir')}
        />
      </Pantalla>
    );
  }

  if (fase === 'fin' && final) {
    return (
      <Pantalla>
        <FinPartida
          recompensa={final.recompensa}
          repetida={final.repetida}
          titulo={final.titulo}
          explicacionSinFlores={t('rayuela.sin_flores_explica', { n: MINIMO_FLORES, total: SALTOS })}
          datos={[
            { valor: `${final.primeros}/${SALTOS}`, etiqueta: t('rayuela.al_primer_salto') },
            { valor: `+${final.xpGanado}`, etiqueta: 'XP' },
            { valor: `+${final.recompensa.ganadas}`, etiqueta: t('minijuegos.sacuanjoches') },
          ]}
          textoReintentar={t('rayuela.volver_a_saltar')}
          textoOtra={t('rayuela.otra_rayuela')}
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
        {...juego.eleccion}
        titulo={t('rayuela.nombre')}
        portada={<IconoRayuela tam={110} />}
        pregunta={t('rayuela.elegir_lengua')}
        iconoLengua={(l) => <Bandera lengua={l} />}
        detalleNivel={(n) => t('rayuela.casillas', { n: CASILLAS[n] })}
        descNivel={(n) => t(`rayuela.desc_${n}`)}
        empezar={t('rayuela.a_saltar')}
        onEmpezar={empezar}
        onPracticar={() => router.push('/practicar')}
        onVolver={() => router.back()}
        onPerfil={() => router.push('/perfil')}
      />
    </Pantalla>
  );
}
