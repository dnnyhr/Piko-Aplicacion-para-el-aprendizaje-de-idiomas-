# Contenido de Piko

Todo el contenido es **data, no código**. Un maestro o un lingüista puede escribir
un paquete completo sin tocar la aplicación: se agrega un archivo `.json` en
`packs/<idioma>/`, se registra en `index.ts` y listo.

Para comprobar que un paquete está bien antes de usarlo:

```bash
npm run validate:packs
```

## Estado actual

| Código | Lengua | Estado |
|---|---|---|
| `eng` | Inglés | ✅ Con contenido |
| `miq` | Miskito | ⬜ Vacío — necesita hablantes |
| `sum` | Mayangna | ⬜ Vacío — necesita hablantes |
| `rma` | Rama | ⬜ Vacío — necesita hablantes |
| `cab` | Garífuna | ⬜ Vacío — necesita hablantes |

Los códigos son ISO 639-3.

> **Las cuatro lenguas indígenas están vacías a propósito.** El vocabulario y la
> pronunciación tienen que venir de hablantes nativos o de material lingüístico
> publicado. Inventarlos sería enseñar una lengua falsa a los niños que
> justamente están tratando de conservarla. El formato ya está listo para
> recibirlos; lo que falta conseguir son las fuentes.

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

- **`tts` + `ttsLang`** — síntesis de voz del sistema. **Sólo válido para inglés.**
- **`audio`** — ruta relativa dentro de `content/audio/`, p. ej. `miq/saludos/naksa.m4a`.

Android no tiene voces sintéticas para miskito, mayangna, rama ni garífuna, y
hacerlas "hablar" con una voz en español enseñaría una pronunciación falsa. Por
eso el validador **rechaza** `tts` en cualquier idioma que no sea inglés: esos
paquetes necesitan grabaciones de hablantes reales.

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

1. Crear `packs/<lang>/<tema>.json` siguiendo el formato de arriba.
2. Importarlo en `content/index.ts` y agregarlo al arreglo `PACKS`.
3. Correr `npm run validate:packs`.
