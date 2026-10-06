# Pistas de Piko

Para canciones de **dominio público** que no tienen una grabación con permiso,
Piko arma su propia pista instrumental: marimba con la melodía, una voz suave
que la sigue, tambor y maraca. Como la pista se arma nota por nota, se sabe el
segundo exacto en que empieza cada palabra, y la sacuanjoche cae justo sobre
cada sílaba (`tiempos` en cada verso).

1. Escribir la melodía en `melodias.py`, palabra por palabra:
   `('Twinkle,', [('C4', 1), ('C4', 1)])` es la palabra con sus notas y
   cuántos pulsos dura cada una.
2. `python3 sintetiza.py <carpeta>` (necesita `numpy` y `ffmpeg`): deja un
   `.m4a` por canción y `tiempos.json` con el ritmo y, por verso, `inicio`,
   `fin` y `tiempos`.
3. Copiar el `.m4a` a `content/canciones/audio/` y los tiempos al JSON de la
   canción (ver `content/canciones/README.md`).

Sólo para letra y melodía de dominio público. Una canción con autor necesita
su permiso y, mejor, su grabación.
