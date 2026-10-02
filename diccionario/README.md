# Diccionario

Acá Piko arma, a partir de lo que escriben los hablantes, el diccionario y la
gramática de cada lengua: las palabras, y también **las reglas que no están
escritas en ningún lado**. Cómo se forman los verbos, en qué orden va una
frase, qué sonidos tiene la lengua.

El método está en [**metodologia.md**](metodologia.md). En corto: un modelo de
lenguaje de razonamiento busca patrones en los datos y los propone como
hipótesis, cada una con su evidencia. Los hablantes deciden qué es correcto.

**Es la única fuente del contenido de la app.** Los paquetes de
`app/content/packs/` y su `index.ts` los genera `npm run contenido` a partir de
acá; no se editan a mano.

```
diccionario/
├── lenguas.json              la lista única de lenguas: código, nombre, carpeta y voz
├── metodologia.md            el método, y por qué se puede confiar en él
├── herramientas/
│   ├── recetas.ts            convierte recetas + léxico en paquetes de la app
│   ├── contenido.ts          npm run contenido: escribe app/content/packs/ e index.ts
│   ├── voz.ts                prepara cada palabra para la voz sintética
│   ├── interfaz.ts           la planilla de traducción de la interfaz
│   ├── web.ts                los datos del sitio: web/datos/, la lista del diccionario y el sitemap
│   └── verificar.ts          npm run validate:diccionario: de la fuente al ejercicio
├── ingles/
│   ├── fuentes.json · corpus.csv · lexico.json    escrito y revisado por el equipo
│   └── ejercicios.json
└── miskito/
    ├── fuentes.json          quién aportó y de dónde (sin datos de contacto)
    ├── corpus.csv            lo que escribió cada persona o la obra publicada, tal cual
    ├── lexico.json           el diccionario: cada entrada con su análisis
    ├── gramatica.md          los patrones y reglas encontrados, con evidencia y confianza
    ├── ejercicios.json       recetas de ejercicios: apuntan al léxico por id
    └── interfaz.csv          la interfaz de la app en miskito: la llenan hablantes
```

## Estado

| Lengua | Versión | Fuentes | Léxico | Reglas | Ejercicios |
|---|---|---|---|---|---|
| Inglés (`eng`) | 1.0 | El equipo | 91 entradas | — | 6 paquetes, 43 ítems |
| Miskito (`miq`) | 0.4 | 2 hablantes (Raiti, Río Coco) y dos diccionarios publicados (Bilwi) | 269 entradas, 18 por revisar, 60 dichas por las dos personas | 48 (24 A · 17 B · 6 C · 1 mixta) | 19 paquetes, 167 ítems (28 de escucha) |
| Mayangna (`sum`) | — | — | — | — | — |
| Rama (`rma`) | — | — | — | — | — |
| Garífuna (`cab`) | — | — | — | — | — |

Lo principal del miskito, en [`miskito/gramatica.md`](miskito/gramatica.md#lo-principal-en-diez-líneas).

## Cuatro capas, y por qué no se mezclan

1. **`corpus.csv`: lo que escribió la gente.** Queda tal cual, con sus
   mayúsculas y sus variantes. No se corrige nunca.
2. **`lexico.json`: el análisis.** Cada entrada guarda en `registrado` cómo se
   escribió y en `forma` la forma de trabajo. Si las dos difieren,
   `normalizacion` explica por qué.
3. **`ejercicios.json`: las recetas.** Cada ejercicio apunta a entradas del
   léxico por su id; no copia palabras.
4. **`app/content/packs/`: lo que ve un estudiante.** Lo genera `npm run
   contenido`. Llega a la app todo ejercicio cuyas palabras **no** estén
   marcadas para revisar, incluidas las opciones incorrectas. Los que usan
   una palabra en revisión esperan, y aparecen solos cuando se resuelve.

Dos comprobaciones cuidan la cadena en cada cambio, también en CI:

```bash
cd app && npm run validate:diccionario   # de la fuente a la receta
cd app && npm run contenido:comprobar    # la app está al día con el diccionario
```

## Una entrada del léxico

```json
{
  "id": "yumpha",
  "forma": "yumpha",
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
| `estado` | `publicada` (sólo en una obra publicada) · `un_hablante` → `varios_hablantes` (la dieron 2 personas o más) → `probable` (3 personas, 2 zonas) → `confirmada` (la validó un hablante) |

## Las recetas de ejercicios

Una línea por ejercicio, en `<lengua>/ejercicios.json`:

```json
{ "elegir": "yapti", "opciones": ["yapti", "aisa", "kuka"] }
{ "escuchar": "kumi", "opciones": ["kumi", "wal", "lal"] }
{ "armar": "frase.hasta_manana", "extra": ["titan", "ra"] }
```

| Receta | Ejercicio en la app | De dónde sale cada cosa |
|---|---|---|
| `elegir` | Elegir la traducción | La pregunta es el `es` de la entrada (o `pregunta`); las opciones, sus `forma` |
| `escuchar` | Escuchar y elegir | La voz dice la `forma`, preparada por `voz.ts`; la traducción es el `es` (o `glosa`) |
| `armar` | Ordenar bloques | La frase es la `forma`; `extra` son bloques para despistar |

Las recetas se agrupan en paquetes con `tema`, `nivel` (1 a 3) y `titulo`, y
`"mayuscula": true` escribe la primera letra en mayúscula. El id de cada
ejercicio sale de su posición en el paquete (`miq.saludos.1.a`): para no
mezclar el progreso de los estudiantes, **los ejercicios nuevos se agregan al
final** del paquete.

**Para cambiar algo:** si es una palabra, se cambia en `lexico.json`; si es un
ejercicio, en `ejercicios.json`. Después:

```bash
cd app && npm run contenido && npm run validate:diccionario
```

Los ejercicios de escuchar del miskito suenan con la voz en español **para
mientras** se consiguen grabaciones de hablantes (decisión 16). La palabra se
le pasa a la voz preparada por [`herramientas/voz.ts`](herramientas/voz.ts), y
sólo usan palabras que dieron igual las dos personas.

## Español desde el miskito

Las mismas recetas del miskito, dadas vuelta, enseñan español a quien habla
miskito: la pregunta va en miskito (la `forma`) y la respuesta en español (la
traducción del léxico, `es`). No hay recetas aparte. Lo marca `"ensena":
["spa"]` en `lenguas.json`, y `npm run contenido` arma los paquetes en
`app/content/packs/spa/desde-miq/`. Se salta lo que al darse vuelta queda
ambiguo (dos opciones que en español dicen lo mismo) o trivial (una frase de
una sola palabra para ordenar).

Con la app en miskito, la pantalla de práctica ofrece esto. Inglés desde el
miskito necesita pares inglés–miskito revisados; todavía no está.

## La interfaz en miskito

`miskito/interfaz.csv` tiene una fila por cada texto de la app: la clave, el
español, la columna `miq` para la traducción y notas para quien traduce. Se
llena con una planilla (Excel, LibreOffice o Google Sheets), sin tocar código.
Después:

```bash
cd app && npm run contenido
```

Eso vuelca lo traducido en `app/src/ui/textos/miq.ts`. Lo que queda vacío se
sigue mostrando en español, así que se puede traducir de a poco. Las frases
de Piko van una por fila (`piko.acierto#1`, `#2`…), y la traducción no tiene
que tener la misma cantidad. Los `{valores}` se dejan tal cual: el verificador
avisa si una traducción los pierde.

## Cómo se suma una tanda nueva

1. Bajar el CSV de *Tu lengua en Piko* desde `/admin` (**Descargar respuestas**).
2. Descartar las respuestas de prueba y las que no dieron permiso, y quitar los
   datos de contacto: el WhatsApp nunca entra acá.
3. Agregar la fuente a `fuentes.json` y sus filas a `corpus.csv`, tal cual.
4. Antes de tocar las reglas, contar cuántas predicciones de
   [`gramatica.md`](miskito/gramatica.md#qué-preguntar-en-la-próxima-tanda)
   acertó la tanda nueva: es la tasa de acierto de la versión anterior.
5. Actualizar léxico, reglas y recetas. Subir la versión y anotarla abajo.
6. `npm run contenido` y `npm run validate:diccionario`.

## Uso de estos datos

La licencia MIT del repositorio cubre el código. Los datos lingüísticos de esta
carpeta se comparten con el permiso que dio cada persona: usarlos para enseñar
la lengua en Piko. Cualquier otro uso requiere consultar a quienes los
aportaron y a sus comunidades. Más detalle en
[metodologia.md § 8](metodologia.md#8-ética-y-gobernanza-de-los-datos).

## Quienes enseñaron

- **Teacher Smith**, docente, Raiti, Río Coco. Miskito.
- **Tangni**, estudiante, Raiti, Río Coco. Miskito.

## Obras publicadas consultadas

- Ernesto Scott Lackwood (2006). *Diccionario Bilingüe: Términos de Medicina Tradicional en Lengua Miskita (Miskito – Español)*. URACCAN – IMTRADEC, Bilwi.
  En `corpus.csv` están sólo las 88 entradas citadas como evidencia, tal cual; la obra completa no se redistribuye.
- Jorge Matamoros R. (1996). *Diccionario Miskito–Miskitu, Español–Miskito*. CIDCA. Consultado en pueblosoriginarios.com.
  En `corpus.csv` están sólo las 80 entradas citadas como evidencia, tal cual.

Una obra publicada respalda reglas y formas, pero no cuenta como un hablante: no sube una palabra a `probable`.

## Historial

| Versión | Fecha | Qué cambió | Predicciones |
|---|---|---|---|
| miskito 0.1 | 2026-09-29 | Primera tanda: 1 hablante, 80 palabras, 15 frases y una oración libre | 26 abiertas · sin tanda anterior para medir aciertos |
| miskito 0.2 | 2026-10-02 | Segunda tanda: otra hablante de Raiti, de otra generación. Animales, comida y naturaleza; dos sistemas de números; hermanos según quién habla; «hermano» y «hermana» salen de los ejercicios | 3 comprobables: 2 acertadas y 1 a medias (2,5 / 3) · 23 siguen abiertas |
| miskito 0.3 | 2026-10-02 | Diccionario de Scott Lackwood (2006) como respaldo publicado: pasado, futuro, negación, plural, pregunta con *ki*; *bara* es «ahí», *kaya* es «vamos», la vocal larga distingue palabras (*kati* / *kâti*) | 8 comprobables: 6,5 acertadas · acumulado 9 de 11 |
| miskito 0.4 | 2026-10-02 | Diccionario de Matamoros (1996): *nina* (nombre) y *kikaia* (reír) confirmados; *sangni* también es verde; la familia y el cuerpo se citan con dueño; variantes entre Raiti y Bilwi; *iris* y *yapta* a revisión | 2 comprobables: 1,5 acertadas · acumulado 10,5 de 13 |
| miskito 0.5 | 2026-10-02 | Ejercicios de escucha con la voz en español, para mientras se consiguen grabaciones (decisión 16); `voz.ts` prepara cada palabra; regla S9 (acento inicial); *mamiki* y *papiki* en «Mío y tuyo» | — |
