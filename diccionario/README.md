# Diccionario

Acá Piko arma, a partir de lo que escriben los hablantes, el diccionario y la
gramática de cada lengua: las palabras, y también **las reglas que no están
escritas en ningún lado**. Cómo se forman los verbos, en qué orden va una
frase, qué sonidos tiene la lengua.

El método está en [**metodologia.md**](metodologia.md). En corto: un modelo de
lenguaje de razonamiento busca patrones en los datos y los propone como
hipótesis, cada una con su evidencia. Los hablantes deciden qué es correcto.

```
diccionario/
├── metodologia.md            el método, y por qué se puede confiar en él
├── herramientas/
│   └── verificar.ts          comprueba que cada ejercicio salga de lo que escribió una persona
└── miskito/
    ├── fuentes.json          quién aportó y de dónde (sin datos de contacto)
    ├── corpus.csv            lo que escribió cada persona, tal cual
    ├── lexico.json           el diccionario: cada entrada con su análisis
    ├── gramatica.md          los patrones y reglas encontrados, con evidencia y confianza
    └── ejercicios/           paquetes en el formato de la app (borradores)
```

## Estado

| Lengua | Versión | Fuentes | Léxico | Reglas | Ejercicios |
|---|---|---|---|---|---|
| Miskito (`miq`) | 0.1 | 1 hablante (Raiti, Río Coco) | 137 entradas, 10 por revisar | 35 (10 A · 19 B · 5 C · 1 mixta) | 13 paquetes, 102 ítems |
| Mayangna (`sum`) | — | — | — | — | — |
| Rama (`rma`) | — | — | — | — | — |
| Garífuna (`cab`) | — | — | — | — | — |

Lo principal del miskito, en [`miskito/gramatica.md`](miskito/gramatica.md#lo-principal-en-diez-líneas).

## Tres capas, y por qué no se mezclan

1. **`corpus.csv`: lo que escribió la gente.** Queda tal cual, con sus
   mayúsculas y sus variantes. No se corrige nunca.
2. **`lexico.json`: el análisis.** Cada entrada guarda en `registrado` cómo se
   escribió y en `forma` la forma de trabajo. Si las dos difieren,
   `normalizacion` explica por qué.
3. **`ejercicios/`: lo que ve un estudiante.** Sólo usa formas del léxico que
   no estén marcadas para revisar. Eso incluye las opciones incorrectas.

`verificar.ts` comprueba la cadena completa en cada cambio, también en CI:

```bash
cd app && npm run validate:diccionario
```

## Una entrada del léxico

```json
{
  "id": "yumhpa",
  "forma": "yumhpa",
  "registrado": ["yumgpa", "yumpha"],
  "es": "tres",
  "categoria": "numeral",
  "tema": "numeros",
  "normalizacion": "La misma persona lo escribió «yumgpa» (tres) y «yumpha» (dentro de nueve)…",
  "reglas": ["S3", "N1"],
  "fuentes": ["raiti-2026-09-28"],
  "estado": "un_hablante"
}
```

| Campo | Qué es |
|---|---|
| `forma` | La forma de trabajo: la que usan los ejercicios |
| `registrado` | Cómo la escribió cada fuente, tal cual. Tiene que aparecer así en el corpus |
| `analisis`, `glosa` | Sus partes y qué significa cada una ([Reglas de Leipzig](miskito/gramatica.md)) |
| `prestamo` | Si viene de otra lengua: de cuál, de qué palabra y con qué confianza |
| `reglas` | Las reglas de `gramatica.md` en las que participa |
| `de` | Si salió de una frase, de cuál |
| `revisar` | Qué hay que preguntarle a un hablante. **Si existe, la entrada no se usa en ejercicios** |
| `estado` | `un_hablante` → `probable` (3 personas, 2 zonas) → `confirmada` (la validó un hablante) |

## Los ejercicios todavía no están en la app

Salen de una sola persona y ninguna regla está validada. Por eso viven acá y
no en `app/content/packs/`. Ya tienen el formato exacto de la app y pasan su
mismo validador. Cuando un hablante los revise (Teacher Smith se ofreció),
pasarlos es copiarlos:

1. Copiar `miskito/ejercicios/*.json` a `app/content/packs/miq/`.
2. Importarlos en `app/content/index.ts` y agregarlos a `PACKS`.
3. `cd app && npm run validate:packs`.
4. Actualizar la tabla de estado de [`app/content/README.md`](../app/content/README.md).

Hay un solo tipo de ejercicio que no se puede hacer todavía: los de escuchar.
Necesitan grabaciones de hablantes, y en estas lenguas no se usa voz
sintética.

## Cómo se suma una tanda nueva

1. Bajar el CSV de *Tu lengua en Piko* desde `/admin` (**Descargar respuestas**).
2. Descartar las respuestas de prueba y las que no dieron permiso, y quitar los
   datos de contacto: el WhatsApp nunca entra acá.
3. Agregar la fuente a `fuentes.json` y sus filas a `corpus.csv`, tal cual.
4. Antes de tocar las reglas, contar cuántas predicciones de
   [`gramatica.md`](miskito/gramatica.md#qué-preguntar-en-la-próxima-tanda)
   acertó la tanda nueva: es la tasa de acierto de la versión anterior.
5. Actualizar léxico, reglas y ejercicios. Subir la versión y anotarla abajo.
6. `npm run validate:diccionario`.

## Uso de estos datos

La licencia MIT del repositorio cubre el código. Los datos lingüísticos de esta
carpeta se comparten con el permiso que dio cada persona: usarlos para enseñar
la lengua en Piko. Cualquier otro uso requiere consultar a quienes los
aportaron y a sus comunidades. Más detalle en
[metodologia.md § 8](metodologia.md#8-ética-y-gobernanza-de-los-datos).

## Quienes enseñaron

- **Teacher Smith**, docente, Raiti, Río Coco. Miskito.

## Historial

| Versión | Fecha | Qué cambió | Predicciones |
|---|---|---|---|
| miskito 0.1 | 2026-09-29 | Primera tanda: 1 hablante, 80 palabras, 15 frases y una oración libre | 26 abiertas · sin tanda anterior para medir aciertos |
