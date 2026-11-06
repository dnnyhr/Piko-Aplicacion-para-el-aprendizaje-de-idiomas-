/**
 * El Trompo de Piko.
 *
 * Aprendo → lanzo el trompo → respondo → lo mantengo girando → gano
 * sacuanjoches → crece mi madroño. Las palabras salen de las lecciones que
 * el estudiante ya hizo; las respuestas y las flores entran al mismo log de
 * progreso que las lecciones: se guardan sin internet, suman al total y al
 * madroño, y viajan al maestro cuando hay clase.
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
import { JuegoTrompo } from '../../src/features/minijuegos/trompo/Juego';
import { Bandera } from '../../src/ui/minijuegos/Bandera';
import { Hoja } from '../../src/ui/minijuegos/Iconos';
import { DibujoTrompo } from '../../src/ui/minijuegos/Trompo';
import { tienePictograma } from '../../src/ui/minijuegos/Pictograma';
import { armarRetos, ID_TROMPO, META, OPCIONES, SEGUNDOS, type EstadoTrompo, type Reto } from '../../src/core/minijuegos/trompo';
import { color } from '../../src/ui/tokens';

type Fase = 'elegir' | 'jugando' | 'fin';

interface Final extends CierreMinijuego {
  partida: EstadoTrompo;
  titulo: string;
}

export default function Trompo() {
  const router = useRouter();
  const { t, frases, idioma } = useTextos();
  const juego = useMinijuego(ID_TROMPO, OPCIONES);
  const [fase, setFase] = useState<Fase>('elegir');
  const [retos, setRetos] = useState<Reto[]>([]);
  const [intento, setIntento] = useState(0);
  const [final, setFinal] = useState<Final | null>(null);

  const empezar = () => {
    const base = juego.empezar();
    if (!base) return;
    const armados = armarRetos(base.vocab, base.nivel, base.estado, Math.random, tienePictograma);
    if (armados.length === 0) return;
    setRetos(armados);
    setIntento((n) => n + 1);
    setFinal(null);
    setFase('jugando');
  };

  const terminar = (resultado: EstadoTrompo) => {
    const cierre = juego.cerrar({ correct: resultado.aciertos, total: resultado.respondidas, streak: resultado.mejorRacha });
    const titulo =
      cierre.recompensa.ganadas > 0
        ? cierre.recompensa.crecioArbol
          ? elegir(frases('piko.arbol_crece'))
          : t('trompo.fin_completo')
        : cierre.repetida
          ? t('trompo.fin_repetida')
          : t('trompo.fin_cayo');
    decir([vozDePiko(titulo, idioma)]);
    setFinal({ ...cierre, partida: resultado, titulo });
    setFase('fin');
  };

  if (fase === 'jugando' && retos.length > 0) {
    return (
      <Pantalla acolchado={false} fondo={color.nube}>
        <JuegoTrompo
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
        {...juego.eleccion}
        actividad="trompo"
        titulo={t('trompo.nombre')}
        portada={<DibujoTrompo tam={120} />}
        pregunta={t('trompo.elegir_lengua')}
        iconoLengua={(l) => (l === 'miq' ? <Hoja /> : <Bandera lengua={l} />)}
        detalleNivel={(n) => t('trompo.detalle_nivel', { n: OPCIONES[n], s: SEGUNDOS[n] })}
        descNivel={(n) => t(`trompo.desc_${n}`)}
        empezar={t('trompo.a_jugar')}
        onEmpezar={empezar}
        onPracticar={() => router.push('/practicar')}
        onVolver={() => router.back()}
        onPerfil={() => router.push('/perfil')}
      />
    </Pantalla>
  );
}
