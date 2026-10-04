/**
 * Bolas chinas.
 *
 * Aprendo una palabra → lanzo mi chibola → respondo → acierto → gano
 * sacuanjoches → crece mi madroño. Las palabras salen de las lecciones que
 * el estudiante ya hizo; las respuestas y las flores entran al mismo log de
 * progreso que las lecciones.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { useTextos } from '../../src/ui/textos/useTextos';
import { elegir } from '../../src/ui/piko/frases';
import { useMinijuego, type CierreMinijuego } from '../../src/features/minijuegos/useMinijuego';
import { decir, vozDePiko } from '../../src/features/minijuegos/voz';
import { ElegirPartida } from '../../src/features/minijuegos/ElegirPartida';
import { FinPartida } from '../../src/features/minijuegos/FinPartida';
import { JuegoChibolas } from '../../src/features/minijuegos/chibolas/Juego';
import { Bandera } from '../../src/ui/minijuegos/Bandera';
import { Hoja } from '../../src/ui/minijuegos/Iconos';
import { IconoChibolas } from '../../src/ui/minijuegos/Chibola';
import { tienePictograma } from '../../src/ui/minijuegos/Pictograma';
import { armarPartida, CHIBOLAS, ID_CHIBOLAS, TIROS } from '../../src/core/minijuegos/chibolas';
import type { Reto } from '../../src/core/minijuegos/retos';
import { color } from '../../src/ui/tokens';

type Fase = 'elegir' | 'jugando' | 'fin';

/** Aciertos al primer tiro que hacen falta para que haya flores (ver `sacuanjochesPorMinijuego`). */
const MINIMO_FLORES = Math.ceil((TIROS * 2) / 3);

interface Final extends CierreMinijuego {
  primeros: number;
  titulo: string;
}

export default function Chibolas() {
  const router = useRouter();
  const { t, frases, idioma } = useTextos();
  const juego = useMinijuego(ID_CHIBOLAS, CHIBOLAS);
  const [fase, setFase] = useState<Fase>('elegir');
  const [retos, setRetos] = useState<Reto[]>([]);
  const [intento, setIntento] = useState(0);
  const [final, setFinal] = useState<Final | null>(null);

  const empezar = () => {
    const base = juego.empezar();
    if (!base) return;
    const armados = armarPartida(base.vocab, base.nivel, base.estado, Math.random, tienePictograma);
    if (armados.length === 0) return;
    setRetos(armados);
    setIntento((n) => n + 1);
    setFinal(null);
    setFase('jugando');
  };

  const terminar = (primeros: number) => {
    const cierre = juego.cerrar({ correct: primeros, total: TIROS });
    const titulo =
      cierre.recompensa.ganadas > 0
        ? cierre.recompensa.crecioArbol
          ? elegir(frases('piko.arbol_crece'))
          : t('chibolas.fin_bien')
        : cierre.repetida
          ? t('chibolas.fin_repetida')
          : t('chibolas.fin_sin_flores');
    decir([vozDePiko(titulo, idioma)]);
    setFinal({ ...cierre, primeros, titulo });
    setFase('fin');
  };

  if (fase === 'jugando' && retos.length > 0) {
    return (
      <Pantalla acolchado={false} fondo={color.nube}>
        <JuegoChibolas
          key={intento}
          retos={retos}
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
          explicacionSinFlores={t('chibolas.sin_flores_explica', { n: MINIMO_FLORES, total: TIROS })}
          datos={[
            { valor: `${final.primeros}/${TIROS}`, etiqueta: t('chibolas.al_primer_tiro') },
            { valor: `+${final.xpGanado}`, etiqueta: 'XP' },
            { valor: `+${final.recompensa.ganadas}`, etiqueta: t('minijuegos.sacuanjoches') },
          ]}
          textoReintentar={t('chibolas.jugar_otra_vez')}
          textoOtra={t('chibolas.otra_partida')}
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
        titulo={t('chibolas.nombre')}
        portada={<IconoChibolas tam={110} />}
        pregunta={t('chibolas.elegir_lengua')}
        iconoLengua={(l) => (l === 'miq' ? <Hoja /> : <Bandera lengua={l} />)}
        detalleNivel={(n) => t('chibolas.detalle_nivel', { n: CHIBOLAS[n] })}
        descNivel={(n) => t(`chibolas.desc_${n}`)}
        empezar={t('chibolas.a_jugar')}
        onEmpezar={empezar}
        onPracticar={() => router.push('/practicar')}
        onVolver={() => router.back()}
        onPerfil={() => router.push('/perfil')}
      />
    </Pantalla>
  );
}
