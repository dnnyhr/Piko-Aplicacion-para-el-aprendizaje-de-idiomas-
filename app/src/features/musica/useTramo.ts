/**
 * Tocar la canción, o un pedacito de ella (un verso, una palabra), con
 * `expo-audio`. La grabación va empaquetada en la app: suena sin internet.
 *
 * Para cortar un tramo se mira el tiempo del reproductor y se pausa al
 * pasar el final; con una actualización cada 100 ms el corte cae a tiempo.
 */

import { useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

export function useTramo(fuente: number) {
  const player = useAudioPlayer(fuente, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [fin, setFin] = useState<number | null>(null);
  const alTerminar = useRef<(() => void) | null>(null);

  // Al pasar el final del tramo: pausa y avisa.
  useEffect(() => {
    if (fin === null || !status.playing) return;
    if (status.currentTime >= fin) {
      player.pause();
      setFin(null);
      const cb = alTerminar.current;
      alTerminar.current = null;
      cb?.();
    }
  }, [status.currentTime, status.playing, fin, player]);

  // Al llegar al final de la grabación entera.
  useEffect(() => {
    if (status.didJustFinish) {
      const cb = alTerminar.current;
      alTerminar.current = null;
      setFin(null);
      cb?.();
    }
  }, [status.didJustFinish]);

  /** Toca de `desde` a `hasta` (en segundos); sin `hasta`, hasta el final. */
  const tocar = (desde = 0, hasta?: number, cuandoTermine?: () => void) => {
    alTerminar.current = cuandoTermine ?? null;
    setFin(hasta ?? null);
    player
      .seekTo(desde)
      .then(() => player.play())
      .catch(() => player.play());
  };

  const pausar = () => {
    alTerminar.current = null;
    setFin(null);
    player.pause();
  };

  return { tocar, pausar, sonando: status.playing, tiempo: status.currentTime, duracion: status.duration };
}
