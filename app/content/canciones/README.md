# Canciones de «La Música de Piko»

Una canción entra a la app **sólo con permiso de uso** y con su letra y sus
traducciones **validadas por una persona competente** (hablante o
colaborador). Piko no descarga canciones ni escribe letras ni traducciones.

## Qué hace falta por canción

1. **La grabación**: un solo archivo en `audio/`, comprimido para que pese
   poco (AAC mono a 48–64 kbps en `.m4a` alcanza para voz y guitarra; una
   canción de 2 minutos queda en menos de 1 MB).
2. **El permiso**: quién la canta, quién la compuso (o «tradicional»), quién
   autoriza que Piko la use, cómo lo autorizó y cuándo.
3. **La letra** tal como se canta, verso por verso, con el segundo en que
   empieza y termina cada verso en la grabación.
4. **La traducción validada** de cada verso al español (obligatoria si la
   canción no está en español), y quién la validó. Piko no traduce del kriol,
   el miskito ni ninguna otra lengua: usa la traducción que da una persona
   competente.
5. **El inglés de cada verso** (`en`, inglés de Estados Unidos), sacado de ese
   significado. Si no es literal, `aproximado: true` y una `nota` que explique
   la idea (una expresión propia, un dicho, un nombre que no se traduce). Lo
   que no se traduce (un coro de sonidos) lleva sólo la `nota`.
6. **El ritmo** (`ritmo`): los pulsos por minuto y el segundo de un pulso,
   para que Piko baile a tiempo. Se pueden medir con `librosa.beat.beat_track`.
7. **El coro** (`coro`): qué versos son el coro, para marcar «Repite el coro»
   cuando vuelven. Los demás versos repetidos se marcan solos («Se repite»).
8. **Entre 2 y 4 lecciones** (`lecciones`), una por frase elegida, con lo que
   piden sus cuatro actividades: la palabra que se tapa en el inglés del verso
   y sus opciones; una palabra nueva con una oración de ejemplo (y su
   traducción) y sus opciones; una oración corta para ordenar; y 2 o 3
   oraciones parecidas para «¿Qué escuchaste?».
9. **«Conoce nuestra canción»**: de dónde viene, en qué lengua está, de qué
   región o comunidad es y qué representa; y qué versos se cantan en «Canta
   con Piko» (`canta`).

10. **Las palabras en miskito** (`miskito`, opcional): sólo las que ya están
    validadas en el diccionario de Piko, con el id de su entrada (`lexico`) y
    escritas igual que ahí. Piko no traduce canciones al miskito: una línea
    entera en miskito necesita que la traduzca y valide un hablante.

## Canciones de dominio público

Una canción infantil tradicional (letra y melodía de dominio público) puede
entrar sin grabación: Piko arma la pista con `tools/pistas/` y sabe el segundo
de cada palabra (`tiempos`). En `fuente` va «Dominio público» y quién revisó
las traducciones.

## La dificultad

`nivel` dice a quién está dirigida y va con el nivel del estudiante: se abren
las canciones de su nivel (el que le dan sus lecciones de inglés) y las de
abajo. Completar una canción también abre las del nivel siguiente.

## Cómo se agrega

1. Copiar la grabación a `audio/<id>.m4a`.
2. Escribir `<id>.json` con el formato de `Cancion`
   (`src/core/canciones/cancion.ts`).
3. Sumarla a `index.ts` (los datos) y a `audios.ts` (la grabación):

   ```ts
   // index.ts
   import miCancion from './mi-cancion.json';
   export const CANCIONES: readonly Cancion[] = [miCancion as Cancion];

   // audios.ts
   export const AUDIOS: Record<string, number> = {
     'mi-cancion': require('./audio/mi-cancion.m4a'),
   };
   ```

4. `npm test`: la prueba de canciones revisa el permiso, la letra, las
   traducciones, el inglés y las lecciones. Si algo falta, dice qué y en cuál
   canción.
