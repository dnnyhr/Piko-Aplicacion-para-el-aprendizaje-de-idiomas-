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
   canción no está en español) y al inglés si la hay, y quién la validó.
5. **Entre 3 y 5 palabras clave**: en la lengua de la canción, en español y
   en inglés. Si la canción está en miskito, cada palabra apunta (`lexico`) a
   su entrada del diccionario de Piko: una palabra que no está en el
   diccionario entra primero ahí, con su fuente.
6. **«Conoce nuestra canción»**: de dónde viene, en qué lengua está, de qué
   región o comunidad es y qué representa.
7. **Los huecos** de «Completa la canción» (verso y palabra a tapar) y qué
   versos se cantan en «Canta con Piko».

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
   traducciones, las palabras clave contra el diccionario y los huecos. Si
   algo falta, dice qué y en cuál canción.

## Niveles

`nivel` dice a quién está dirigida: **inicial** (palabras sueltas, mucho
apoyo), **intermedio** (completar frases, escuchar) o **avanzado** (frases
completas, comprensión). Las de un nivel se abren al completar alguna del
nivel anterior.
