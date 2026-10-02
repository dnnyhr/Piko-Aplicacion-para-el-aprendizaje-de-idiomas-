# Contenido de Piko

Todo el contenido es **data, no código**, y tiene una sola fuente: el
[diccionario](../../diccionario/README.md). Los paquetes de `packs/` y
`index.ts` los **genera** `npm run contenido` a partir de las recetas de
`diccionario/<lengua>/ejercicios.json` y su léxico. No se editan a mano: un
cambio hecho acá se pierde la próxima vez que se generen, y CI lo rechaza.

```bash
npm run contenido              # genera packs/ e index.ts desde el diccionario
npm run contenido:comprobar    # comprueba que estén al día (lo corre CI)
npm run validate:packs         # el formato de cada paquete
```

Este documento describe el **formato** de un paquete: lo que la app lee y lo
que el generador escribe.

## Estado actual

| Código | Lengua | Estado |
|---|---|---|
| `eng` | Inglés | ✅ 6 paquetes, 43 ítems |
| `miq` | Miskito | ✅ 19 paquetes, 167 ítems, de dos hablantes de Raiti y dos diccionarios publicados. Escucha con voz en español para mientras |
| `sum` | Mayangna | ⬜ Vacío — necesita hablantes |
| `rma` | Rama | ⬜ Vacío — necesita hablantes |
| `cab` | Garífuna | ⬜ Vacío — necesita hablantes |

Los códigos son ISO 639-3.

> **Ninguna palabra se inventa.** El vocabulario y la pronunciación vienen de
> hablantes nativos o de material lingüístico publicado, y el diccionario
> rastrea cada palabra hasta su fuente. Lo que tiene una duda abierta queda
> marcado para revisar y no llega a la app. Mayangna, rama y garífuna esperan
> sus fuentes.

## Estructura de un paquete

```json
{
  "id": "eng.saludos.1",
  "lang": "eng",
  "theme": "saludos",
  "difficulty": 1,
  "title": "Saludos",
  "items": [ ... ]
}
```

| Campo | Qué es |
|---|---|
| `id` | Único en todo el proyecto. Convención: `<lang>.<tema>.<nivel>` |
| `lang` | `eng`, `miq`, `sum`, `rma` o `cab` |
| `theme` | Agrupa paquetes; el maestro elige temas al armar un preset |
| `difficulty` | `1`, `2` o `3` |
| `title` | Lo que ve el maestro en pantalla |

Cada ítem lleva un `id` único y un `skill` — la unidad con la que el motor mide
el dominio. Conviene que sea `<lang>.<tema>`, así el semáforo del maestro y la
selección adaptativa agrupan bien.

## Los tres tipos de ejercicio

### `choice` — traducción por selección múltiple

```json
{
  "id": "eng.saludos.1.a",
  "type": "choice",
  "skill": "eng.saludos",
  "prompt": "Buenos días",
  "answer": "Good morning",
  "options": ["Good morning", "Good night", "Good afternoon"]
}
```

`prompt` va en español y `answer` en la lengua que se enseña. La respuesta
correcta **tiene que estar** dentro de `options`; el orden se baraja al
presentarlo, así que no importa en qué posición se escriba.

### `listen` — comprensión auditiva

```json
{
  "id": "eng.numeros.1.f",
  "type": "listen",
  "skill": "eng.numeros",
  "tts": "three",
  "ttsLang": "en-US",
  "answer": "three",
  "options": ["three", "tree", "free"],
  "gloss": "tres"
}
```

El sonido sale de una de dos fuentes:

- **`tts` + `ttsLang`** — síntesis de voz del sistema. Para inglés, y para miskito con voz en español (abajo).
- **`audio`** — ruta relativa dentro de `content/audio/`, p. ej. `miq/saludos/naksa.m4a`.

Android no tiene voces sintéticas para miskito, mayangna, rama ni garífuna, y
hacerlas "hablar" con una voz en español enseñaría una pronunciación falsa. Por
eso el validador **rechaza** `tts` en mayangna, rama y garífuna: esos paquetes
necesitan grabaciones de hablantes reales.

**El miskito es la excepción, para mientras se consiguen voces reales.** Se
escribe casi como se lee en español, así que puede usar `"ttsLang": "es-US"`.
El texto de `tts` no es la palabra tal cual: lo prepara
`diccionario/herramientas/voz.ts` (*mihta* → «mijta», *walhwal* → «uáljual»).
Cuando llegue la grabación, el ítem pasa a `audio`. Ver la decisión 16 de
`docs/decisiones.md`.

Para que el APK siga siendo liviano, las grabaciones van en mono a unos 24 kbps.

### `build` — construcción de oraciones por bloques

```json
{
  "id": "eng.saludos.1.h",
  "type": "build",
  "skill": "eng.saludos",
  "target": "How are you",
  "blocks": ["How", "are", "you", "is", "the"],
  "gloss": "¿Cómo estás?"
}
```

`blocks` son las fichas que se le ofrecen al estudiante: todas las palabras de
`target` más algunos distractores. El validador cuenta las repeticiones — si la
oración usa "is" dos veces, hay que ofrecer dos bloques "is".

## Cómo agregar un paquete

1. Agregar las palabras que falten a `diccionario/<lengua>/lexico.json`, con su fuente.
2. Escribir las recetas en `diccionario/<lengua>/ejercicios.json` (ver
   [diccionario/README.md](../../diccionario/README.md#las-recetas-de-ejercicios)).
3. `npm run contenido` y `npm run validate:diccionario`.
