# Recursos en lengua de señas

Esta carpeta está preparada, pero **vacía a propósito**. Piko no inventa
traducciones ni genera señas o gestos con una máquina: acá sólo entran videos
grabados y validados por personas competentes en la lengua de señas
correspondiente, por ejemplo personas sordas usuarias de la lengua e intérpretes
de su comunidad.

## Qué hace falta por cada recurso

| Campo | Qué es |
|---|---|
| `id` | Identificador único. |
| `lengua` | ISO 639-3. Hoy: `ncs` (lengua de señas nicaragüense). |
| `clave` | A qué acompaña: `instruccion.choice`, `instruccion.rayuela`, `vocabulario.<id del ítem>`. |
| `video` | `require('./archivo.mp4')`: va dentro de la app para funcionar sin internet. |
| `descripcion` | Qué se dice en el video, por escrito. |
| `permiso` | `true` si quien aparece en el video autorizó su uso en Piko. |
| `validacion` | `por`, `competencia` y `fecha` (AAAA-MM-DD). |

Un recurso al que le falte cualquiera de estos datos **no se muestra**, y
`npm test` falla.

## Cómo sumar el primer video

1. Agregar el archivo acá, comprimido para gama baja: los videos pesan mucho más
   que el resto del contenido, y el APK viaja por Bluetooth entre teléfonos.
2. Registrarlo en `index.ts`.
3. **Instalar el reproductor.** Hoy `expo-video` no está instalado, porque sin
   contenido sería una dependencia nativa de más:

   ```bash
   npx expo install expo-video
   ```

   Después se usa en `ReproductorSena` (`src/features/senas/PanelSenas.tsx`), que
   mientras tanto muestra sólo la `descripcion`. Este paso pide un development
   build nuevo.

## Qué ya está listo

- La preferencia «Lengua de señas» en *Mi forma de aprender*.
- El panel junto a las instrucciones y al vocabulario de los ejercicios, y junto
  a las instrucciones de cada minijuego.
- La validación de cada recurso, en `src/core/senas/recurso.ts`.
