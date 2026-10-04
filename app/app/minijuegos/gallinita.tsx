/**
 * Gallinita Ciega de Piko.
 *
 * Escucho → identifico → respondo → encuentro la respuesta con Piko → gano
 * sacuanjoches → crece mi madroño. Es el juego de la comprensión auditiva:
 * las palabras salen de las lecciones que el estudiante ya hizo y suenan con
 * la misma voz que en los ejercicios de escucha.
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
import { JuegoGallinita } from '../../src/features/minijuegos/gallinita/Juego';
import { Bandera } from '../../src/ui/minijuegos/Bandera';
import { Hoja } from '../../src/ui/minijuegos/Iconos';
import { IconoGallinita } from '../../src/ui/minijuegos/Venda';
import { tienePictograma } from '../../src/ui/minijuegos/Pictograma';
import {
  armarRondas,
  ID_GALLINITA,
  OPCIONES,
  RONDAS,
  type EstadoGallinita,
  type Ronda,
} from '../../src/core/minijuegos/gallinita';
import { color } from '../../src/ui/tokens';

type Fase = 'elegir' | 'jugando' | 'fin';

/** Aciertos que hacen falta para que haya flores (ver `sacuanjochesPorGallinita`). */
const MINIMO_FLORES = Math.ceil((RONDAS * 2) / 3);

interface Final extends CierreMinijuego {
  partida: EstadoGallinita;
  titulo: string;
}

export default function Gallinita() {
  const router = useRouter();
  const { t, frases, idioma } = useTextos();
  const juego = useMinijuego(ID_GALLINITA, OPCIONES);
  const [fase, setFase] = useState<Fase>('elegir');
  const [rondas, setRondas] = useState<Ronda[]>([]);
  const [intento, setIntento] = useState(0);
  const [final, setFinal] = useState<Final | null>(null);

  const empezar = () => {
    const base = juego.empezar();
    if (!base) return;
    const armadas = armarRondas(base.vocab, base.nivel, base.estado, Math.random, tienePictograma);
    if (armadas.length === 0) return;
    setRondas(armadas);
    setIntento((n) => n + 1);
    setFinal(null);
    setFase('jugando');
  };

  const terminar = (resultado: EstadoGallinita) => {
    const cierre = juego.cerrar({ correct: resultado.aciertos, total: resultado.respondidas, streak: resultado.mejorRacha });
    const titulo =
      cierre.recompensa.ganadas > 0
        ? cierre.recompensa.crecioArbol
          ? elegir(frases('piko.arbol_crece'))
          : resultado.aciertos === RONDAS
            ? t('gallinita.perfecta')
            : t('gallinita.fin_bien')
        : cierre.repetida
          ? t('gallinita.fin_repetida')
          : t('gallinita.fin_sin_flores');
    decir([vozDePiko(titulo, idioma)]);
    setFinal({ ...cierre, partida: resultado, titulo });
    setFase('fin');
  };

  if (fase === 'jugando' && rondas.length > 0) {
    return (
      <Pantalla acolchado={false} fondo={color.nube}>
        <JuegoGallinita
          key={intento}
          rondas={rondas}
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
          explicacionSinFlores={t('gallinita.sin_flores_explica', { n: MINIMO_FLORES, total: RONDAS })}
          datos={[
            { valor: `${p.aciertos}/${p.respondidas}`, etiqueta: t('gallinita.aciertos') },
            { valor: String(p.mejorRacha), etiqueta: t('gallinita.mejor_racha') },
            { valor: String(p.puntos), etiqueta: t('gallinita.puntos') },
          ]}
          textoReintentar={t('gallinita.jugar_otra_vez')}
          textoOtra={t('gallinita.otra_partida')}
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
        titulo={t('gallinita.nombre')}
        portada={<IconoGallinita tam={120} />}
        pregunta={t('gallinita.elegir_lengua')}
        iconoLengua={(l) => (l === 'miq' ? <Hoja /> : <Bandera lengua={l} />)}
        detalleNivel={(n) => t('gallinita.detalle_nivel', { n: OPCIONES[n] })}
        descNivel={(n) => t(`gallinita.desc_${n}`)}
        empezar={t('gallinita.a_jugar')}
        onEmpezar={empezar}
        onPracticar={() => router.push('/practicar')}
        onVolver={() => router.back()}
        onPerfil={() => router.push('/perfil')}
      />
    </Pantalla>
  );
}
