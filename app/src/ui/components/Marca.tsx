/**
 * La señal que acompaña a un estado, para que nunca dependa sólo del color.
 *
 * Un punto es «esto elegiste» y un visto es «esta es la respuesta». A propósito
 * no hay ninguna marca de error: cuando el estudiante elige otra, su tarjeta
 * lleva el punto, la correcta lleva el visto, y nadie le pone una cruz.
 */

import Svg, { Circle, Path } from 'react-native-svg';

export interface MarcaProps {
  tipo: 'punto' | 'visto';
  tinta: string;
  tam?: number;
}

export function Marca({ tipo, tinta, tam = 24 }: MarcaProps) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      {tipo === 'punto' ? (
        <>
          <Circle cx={12} cy={12} r={9} stroke={tinta} strokeWidth={2.4} fill="none" />
          <Circle cx={12} cy={12} r={4.5} fill={tinta} />
        </>
      ) : (
        <Path d="M4 13 L10 19 L20 6" stroke={tinta} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
    </Svg>
  );
}
