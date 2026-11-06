/**
 * Con la narración activada: dice las instrucciones al aparecer, y deja
 * repetirlas todas las veces que se quiera. Repetir no se anota en ningún
 * lado, así que no cuesta nada.
 *
 * Sólo agrega voz: lo que dice siempre está también escrito en la pantalla.
 */

import { useEffect } from 'react';
import { Boton } from '../../ui/components/Boton';
import { Parlante } from '../../ui/minijuegos/Iconos';
import { useColor } from '../../ui/tema';
import { useTextos } from '../../ui/textos/useTextos';
import { useNarrador } from './useNarrador';
import type { Voz } from '../../core/minijuegos/rayuela';

export interface BotonRepetirProps {
  voces: readonly Voz[];
  /** Cuando cambia, se vuelve a narrar solo: el id del ejercicio, por ejemplo. */
  clave: string;
  /** `false` si la pantalla ya hace sonar algo propio al aparecer. */
  auto?: boolean;
}

export function BotonRepetir({ voces, clave, auto = true }: BotonRepetirProps) {
  const { activa, decir } = useNarrador();
  const color = useColor();
  const { t } = useTextos();

  useEffect(() => {
    if (!activa || !auto) return;
    const reloj = setTimeout(() => decir(voces), 260);
    return () => clearTimeout(reloj);
  }, [clave, activa, auto]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activa) return null;
  return (
    <Boton chico tono="cielo" icono={<Parlante tam={20} tinta={color.tintaCielo} />} onPress={() => decir(voces)}>
      {t('instruccion.repetir')}
    </Boton>
  );
}
