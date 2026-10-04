/**
 * Tocar la canción, o un pedacito de ella (un verso, una palabra), con
 * `expo-audio`. La grabación va empaquetada en la app: suena sin internet.
 *
 * Para cortar un tramo se mira el tiempo del reproductor y se pausa al
 * pasar el final; con una actualización cada 100 ms el corte cae a tiempo.
 *
 * Saltar a un segundo antes de que la grabación termine de cargar no hace
 * nada (en la web, por ejemplo): el salto queda pendiente y se hace apenas
 * la grabación sabe cuánto dura.
 */

import { useEffect, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

export function useTramo(fuente: number) {
  const player = useAudioPlayer(fuente, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [fin, setFin] = useState<number | null>(null);
  const alTerminar = useRef<(() => void) | null>(null);
  const pendiente = useRef<number | null>(null);

  // El salto pendiente, apenas la grabación está lista.
  useEffect(() => {
    if (pendiente.current === null || !(status.duration > 0)) return;
    const desde = pendiente.current;
    pendiente.current = null;
    if (Math.abs(status.currentTime - desde) > 0.5) player.seekTo(desde).catch(() => undefined);
  }, [status.duration, status.currentTime, player]);

  // Al pasar el final del tramo: pausa y avisa.
  useEffect(() => {
    if (fin === null || !status.playing || pendiente.current !== null) return;
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
    if (!(status.duration > 0)) pendiente.current = desde;
    player
      .seekTo(desde)
      .then(() => player.play())
      .catch(() => player.play());
  };

  const pausar = () => {
    alTerminar.current = null;
    pendiente.current = null;
    setFin(null);
    player.pause();
  };

  return { tocar, pausar, sonando: status.playing, tiempo: status.currentTime, duracion: status.duration };
}
