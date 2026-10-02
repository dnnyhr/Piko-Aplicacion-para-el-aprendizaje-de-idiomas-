/**
 * El madroño de una etapa en chiquito, encuadrado para que se lea: en la
 * portada y en el camino de etapas. Sin Piko y sin animación.
 */

import Svg from 'react-native-svg';
import type { EtapaId } from '../../core/progress/arbol';
import { DibujoArbol, ENCUADRE } from './dibujo';

export interface MiniaturaArbolProps {
  etapa: EtapaId;
  tam?: number;
}

export function MiniaturaArbol({ etapa, tam = 56 }: MiniaturaArbolProps) {
  return (
    <Svg width={tam} height={tam} viewBox={ENCUADRE[etapa]} preserveAspectRatio="xMidYMax meet">
      <DibujoArbol etapa={etapa} />
    </Svg>
  );
}
