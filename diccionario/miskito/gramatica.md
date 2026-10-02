# Miskito: patrones y reglas

> **Versión 0.6** · 2 de octubre de 2026 · dos tandas de datos y dos diccionarios publicados

**De dónde sale.** De dos personas de la misma comunidad, Raiti (Río Coco), las
dos hablantes maternas, de dos generaciones distintas:

| Fuente | Quién | Qué escribió |
|---|---|---|
| `raiti-2026-09-28` | Teacher Smith, docente | 80 palabras, 15 frases, una oración libre |
| `raiti-2026-09-30` | Tangni, estudiante de 18 años | 84 palabras, 15 frases, una presentación |
| `lackwood-2006` | *Diccionario Bilingüe: Términos de Medicina Tradicional en Lengua Miskita*, Ernesto Scott Lackwood (URACCAN – IMTRADEC, Bilwi, 2006) | 88 entradas citadas como evidencia |
| `matamoros-1996` | *Diccionario Miskito–Miskitu, Español–Miskito*, Jorge Matamoros R. (CIDCA, 1996), en pueblosoriginarios.com | La parte Español–Miskito (texto) y la Miskitu–Miskitu (98 páginas escaneadas); se citan las entradas y los ejemplos que sirven de evidencia |

Todo está en [`corpus.csv`](corpus.csv) tal cual lo escribieron. De los diccionarios
publicados sólo se copiaron las entradas que sirven de evidencia, no las obras
completas. Los dos son de otra zona (Bilwi). El de Scott Lackwood lo recogió su autor con personas mayores y
usa la ortografía escrita: infinitivos en *-aia* y circunflejo para las vocales
largas. Respalda reglas, pero **no cuenta como un hablante más**: las entradas
que sólo están ahí quedan en estado `publicada`.

**Cómo se hizo.** Con el método de [`../metodologia.md`](../metodologia.md). Un
modelo de razonamiento busca regularidades en el corpus, cada una se contrasta
contra todos los ejemplos (y contra lo publicado, cuando existe) y queda
escrita con su evidencia, su nivel de confianza y una predicción. En esta
versión, además, **se midió cuántas predicciones de la versión 0.1 acertó la
tanda nueva** (ver abajo).

| Confianza | Qué significa | Para qué sirve |
|---|---|---|
| **A** · sólida | 3 ejemplos o más en el corpus y ningún contraejemplo | Puede guiar ejercicios, una vez validada |
| **B** · probable | 2 ejemplos, o más con alguna excepción explicada | Guía con cuidado; falta confirmarla |
| **C** · hipótesis | 1 ejemplo o una inferencia | Sólo sirve para decidir qué preguntar. Nunca se enseña |

Con dos personas de una sola comunidad, **ninguna regla está validada
todavía**. Lo que acá se describe es el miskito de Raiti tal como lo
escribieron ellas; otra comunidad puede decirlo distinto, y las dos formas
valen.

**Glosas** (Reglas de Leipzig): `1`, `2`, `3` = persona · `POSS` = poseedor ·
`PRS` = presente · `INF` = infinitivo · `CVB` = converbo («haciendo…») ·
`IMP` = orden · `LOC` = lugar («a», «en») · `CSTR` = forma con dueño ·
`FUT` = futuro · `PST` = pasado · `NEG` = negación · `TR` = transitivo ·
`INTR` = intransitivo · `REFL` = reflexivo · `REL` = «lo que…» ·
`(?)` = significado todavía hipotético.

---

## Qué trajo la segunda tanda

**Las predicciones de la versión 0.1.** La encuesta no pregunta la mayoría de
ellas, así que sólo tres se pudieron comprobar:

| # | Predicción | Tangni dijo | Resultado |
|---|---|---|---|
| 9 | venir = *balaya* | *balaya* | ✅ acertó |
| 13 | la niña = *tuktan mairin* | *tuktan mairin* (y niño, *tuktan waitna*) | ✅ acertó |
| 4 | mi papá = *aisiki* (a → i + ki) | *papiki* | ½ la regla acertó; la raíz es otra (*papa*, no *aisa*) |

**Tasa de acierto: 2,5 de 3.** Las otras 23 siguen abiertas. Además se
cumplieron predicciones que estaban dentro de las reglas:

- **S1:** en 99 respuestas nuevas, las únicas palabras con e u o son
  préstamos (*bret* ← *bread*, *coco*, *maistro*), justo lo que la regla
  anticipaba.
- **S3 y S5:** Tangni escribe *walhwal* y *matsip*, exactamente las formas a
  las que la versión 0.1 había normalizado «walg walg» y «matchip».
- **L5:** «la lluvia» es *li ausisa*, «el agua cae».
- **O1:** 10 de las 11 frases nuevas con verbo lo ponen al final.

Y dos cosas no se cumplieron, que es lo que más enseña: **los números del 6 al
10** (N3) y **«hasta mañana» con *titan*** (L4).

**Cuánto coinciden las dos personas.** Contestaron las dos 44 palabras: en 27
coinciden: 22 idénticas, 2 que sólo cambian dónde va la h, 2 que coinciden
con la forma normalizada (*walhwal*, *matsip*) y «abuela», donde las dos dan
*mama almuk*. Las otras 17 **no son diferencias al azar**: caen
todas en cinco tipos.

| Tipo | Cuántas | Ejemplos |
|---|---|---|
| Otra manera de contar del 6 al 10 | 5 | *matlalkahbi* / *matsip pura kum* (N3) |
| La familia dicha con «mi», o con *mama* / *papa* | 3 | *yapti* / *mamiki*, *aisa almuk* / *papa almuk* (L8, L9) |
| Hermano y hermana, cruzados | 2 | *muih* / *muiki*, *laikra* / *yaikra* (L7) |
| Cómo se escribe | 2 | *luhpi* / *lupha* (S3) |
| Se dio otra forma de la palabra | 5 | *wap* / *waya*, *bal* / *balaya*, *piyaya* / *plun piyaya*, *bibi* / *tuktan*, *tuktan* / *tuktan mairin, tuktan waitna* |

Varias diferencias van en la misma dirección: Tangni usa *mama* y *papa* donde
Teacher Smith usa *yapti* y *aisa*, *maistro* donde dice *smasmalkra*, y cuenta
todo desde el cinco. **Hipótesis (C):** son diferencias entre generaciones o
entre registros (cómo se habla en la casa y cómo en la escuela). No es una
diferencia de región, porque las dos son de Raiti. Hay que preguntarlo, no
suponerlo.

## Qué trajo el diccionario Miskitu–Miskitu de Matamoros (v0.6)

La v0.4 sólo había usado la tabla Español–Miskito. La parte principal del
diccionario de Matamoros es otra: **cada palabra explicada en miskito y en
español, con un ejemplo en las dos lenguas**. Está publicada como 98 imágenes
escaneadas (las páginas 1 a 102 de la galería; la 43 a la 46 no existen).

**Cómo se leyó.** Cada página se pasó por reconocimiento de texto (OCR),
columna por columna, y un programa separó las entradas: palabra, tipo,
traducción, definición en miskito, definición en español y ejemplos. Salieron
**1.174 entradas y 1.149 ejemplos con su traducción**: un corpus paralelo
diez veces más grande que todo lo que teníamos. El OCR confunde algunas letras
del miskito (v por u, f por t, *â* por *á*), que se corrigieron con reglas, y
**cada ejemplo citado acá se comparó a ojo con la página escaneada**. Las
obras no se copian: en [`corpus.csv`](corpus.csv) entran sólo las frases que
respaldan una regla o una palabra.

**Lo que cambia.**

- **El futuro estaba mal descrito (M13, corregida).** *-aisna* no es el
  futuro: es *-aia* + *sna*, «voy a…». El futuro propio es *-amna* (yo),
  *-ma* (vos) y *-bia* (él, ella, nosotros): *daukamna*, «haré»; *balma*,
  «vengas»; *balbia*, «vendrá».
- **«ai» ya se entiende (M11, resuelta → M17).** Delante del verbo, *ai-*
  es «me» y también «se» (reflexivo): *aiwiram*, «me dijiste»;
  *makupaia* «voltear» → *aimakupaia* «inclinarse». *mai-* es «te»:
  *maiwiri*, «te dije».
- **Los verbos tienen pareja (M16, nueva).** *kalkaia* «romper» /
  *kalwaia* «romperse». La k o la b dicen que la acción pasa a otra cosa; la
  w, que le pasa a uno mismo. Diez parejas.
- **Poder y no poder (M18, nueva).** *V-aia sip sa*, «se puede»; *sip
  V-ras*, «no puede».
- **Frases compuestas (O13 a O15, nuevas).** «Si», «porque», «para»,
  «antes de», «después de», «hasta», «más que…» y «lo que…» tienen cada uno
  su pieza, siempre al final de su parte de la frase.
- **Cómo se toma un verbo del inglés (M19, nueva).** *yus munaia* (usar),
  *stadi munaia* (estudiar), *ansa munaia* (contestar): el préstamo y
  *munaia*, «hacer».
- ***lalah* es «dinero»** (M9): *Lalah ainghwa briaia*, «tener bastante
  dinero». La hipótesis de la v0.2 se cumplió.

**Predicciones de la v0.4.** Se pudieron comprobar tres:

| # | Predicción | Matamoros dice | Resultado |
|---|---|---|---|
| 16 | dinero = *lalah* | *Lalah ainghwa briaia*, «tener bastante dinero» | ✅ acertó |
| 14 | ¿Tenés hambre? termina en *ki* | *Pali? balan ki?*, «¿de veras vino?» | ✅ acertó (la regla O10, no la frase) |
| 26 | Mañana voy a comer = *piaisna* | el futuro es *-amna*: «comeré» sería *piamna* | ❌ falló: la regla M13 estaba mal |

**Tasa de acierto: 2 de 3. Acumulada: 12,5 de 16.**

## Qué trajo el diccionario de Matamoros (v0.4)

Jorge Matamoros es miskito, de Krukira, y vive en Bilwi. La página publica la
parte Español–Miskito de su diccionario: 1.311 entradas en una tabla de texto.
Se cruzaron las 1.311 con el léxico. (En esta versión creímos que la única
imagen de la página era la portada; en la v0.6 aparecieron las 98 páginas
escaneadas de la parte Miskitu–Miskitu.)

**Predicciones.** Se pudieron comprobar dos:

| # | Predicción | Matamoros dice | Resultado |
|---|---|---|---|
| 1 | nombre = *nina* | *Nina* | ✅ acertó (abierta desde la v0.1) |
| 7 | reír · vivir = *kikaya* · *iwaya* | *Kikaia* · *Raya kaia* («estar vivo») | ½ reír acertó; para vivir da otra palabra |

**Tasa de acierto: 1,5 de 2. Acumulada: 10,5 de 13.**

**Lo que cambia.**
- **Verde y azul (L6, sube a B).** Matamoros traduce «verde» como *sangni*,
  la palabra que Teacher Smith dio para «azul».
- **Las partes del cuerpo se citan con dueño (L9, sube a A).** *Wan nakra*
  (nuestro ojo), *wan mihta*, *wan napa*. Y la familia, en tercera persona:
  *Aisika* (su padre), *Muihnika* (su hermano), *papika*.
- ***titan* también es «mañana, el día siguiente» (L4).** Da «mañana = *Titan
  mani ar yauhka*», «titan o yauhka». Tangni tenía razón al usarla.
- ***stury* sale de revisión.** «Palabra» es *Sturi aisanka*.
- **Se resuelven *daiwan nawira* (pájaro: *Daiwan tnawira*) y *pauta klawi*
  (fuego: *Pauta klauhan*).**

**Palabras que cambian según la fuente.** Ninguna es un error seguro. Pueden
ser variantes de zona, de época o de especie:

| | Raiti (encuestas) | Bilwi (Matamoros) | Bilwi (Scott Lackwood) |
|---|---|---|---|
| gato | *micki* | *pus* (inglés *puss*) | — |
| loro | *iris* | *rauha* | — |
| sol | *yapta* | *yu* | — |
| iguana | *kakamuk* | *islu* | *kakamuk* |
| gallina | *galila* | *kalika mairin* | *kâlila* |
| amigo | *painika* | *pana* | — |
| libro · lápiz | *buk* · *ingk* | *paun* · *pinsil* (inglés *pencil*) | — |

*iris* y *yapta* pasan a revisión y salen de los ejercicios hasta preguntarlas.

---

## Qué trajo el diccionario de Scott Lackwood (v0.3)

**Las predicciones de la versión 0.2, contra el diccionario.** Se pudieron
comprobar ocho:

| # | Predicción | El diccionario dice | Resultado |
|---|---|---|---|
| 7 | tener · hacer · entrar = *briaya* · *daukaya* · *dimaya* | *briaia*, *daukaia*, *dimri* (entré), *dimwan* (entró) | ✅ acertó (escrito en -aia) |
| 8 | enseñar = *smalkaya* | *Smalkaia* | ✅ acertó |
| 9 | ¡Mirá! = *kaiks* | *Aman kaiks* (¡cuidado!), *Bilam kuaks* (¡abrí tu boca!) | ✅ acertó |
| 10 | hombre · mujer = *waitna* · *mairin* | *Waitna*, *Mairin* | ✅ acertó |
| 13 | un perro = *yul kum* (kum después) | *siknis kum* (una enfermedad), *plis kum* (un lugar) | ✅ acertó la regla |
| 24 | los niños = *tuktan nani* (nani después) | *Una nani* (labios), *Kabu inskika nani* (mariscos) | ✅ acertó la regla |
| 14 | ¿Tenés hambre? = *Plun mai dauksa?* | *¿Anira mai klahwisa?* (¿dónde te duele?) | ½ *mai* es «te»; falta la frase |
| 16 | oro = *lalah* | *Gul* (del inglés *gold*) | ❌ falló |

**Tasa de acierto: 6,5 de 8.** Sumada a la de la segunda tanda, 9 de 11.

**Lo que resolvió.**
- ***bara* es «ahí»** (*Bara sa*: ahí está), y también aparece como «y». La
  «hola» de la primera tanda sigue en revisión.
- ***kaya* es «vamos»** (*Kaisa, kaia maka*: vamos, vámonos). En *Kaya skul ra*
  no hay un verbo fuera de lugar, sino una palabra para invitar (O12).
- ***dimisna* es «entro»**: *skul dimisna*, «entro a la escuela», es «estudio».
- **La vocal larga cambia la palabra:** *kati* es luna; *kâti*, mes (S8).

**Lo que la encuesta no podía dar.** El pasado (M12), el futuro (M13), la
negación (M14), la terminación de quien hace algo (M15), la pregunta de sí o
no con *ki* (O10) y el plural con *nani* (O11).

---

## Lo principal, en once líneas

1. **Tres vocales: a, i, u.** Ni una palabra miskita lleva e ni o; sólo los préstamos. (S1)
2. **El verbo va al final.** «Yul plun pisa» es *perro comida come*. (O1)
3. **«A la casa» se dice «casa a».** «utla ra». Usa posposiciones, no preposiciones. (O2)
4. **La persona va pegada al verbo:** -sna es yo, -sma es vos, -sa es él o ella. Por eso «yo» se puede omitir. (M2, O5)
5. **«Estar» no tiene raíz:** es sólo la terminación, *sna*, *sma*, *sa*. (M3)
6. **«Mi» se forma cambiando la a final por i y sumando *ki*:** kuka → kuki ki, mama → mamiki, papa → papiki. (M4)
7. **Los verbos vienen en pareja:** *kalkaia* es «romper algo» y *kalwaia*, «romperse». (M16)
8. **En la familia se nombra con dueño:** para «mamá» se dice «mi mamá». (L9)
9. **Hay dos maneras de contar del 6 al 10:** desde el seis o desde el cinco. (N1, N3)
10. **El inglés y el español dejaron huella** en la escuela y en las comidas que llegaron de afuera, no en el cuerpo ni en los números. (L1)
11. **Las palabras no tienen género.** Cuando hace falta, se agrega *waitna* (hombre) o *mairin* (mujer). (L2)

---

## Sonidos y escritura

### S1 · Tres vocales: a, i, u — Confianza A

**Regla.** Las palabras miskitas usan sólo tres vocales: a, i, u.

**Evidencia.** En la primera tanda, ninguna de 124 palabras tenía e ni o. En la
segunda, de 99 respuestas, sólo tres: *bret* (pan, del inglés *bread*),
*coco* y *maistro* (del español). Las demás palabras prestadas se acomodan a
las tres vocales: *baby* → bibi, *door* → dur, *shoes* → sus, *café* → cafi,
*plátano* → platu. Lo mismo pasa con el nombre de la lengua: en miskito es
**Miskitu**. Coincide con las descripciones publicadas.

**Predicción (acertada en la v0.1).** Una e o una o señalan un préstamo.

**Para Piko.** Al evaluar pronunciación, el robot no debe castigar una i que
suena a [e] ni una u que suena a [o]: en miskito esa diferencia no distingue
palabras.

### S2 · La y final suena i — Confianza B

**Evidencia.** *aisaby* (adiós), *stury* (palabra), *duary* (canoa). En el
resto de las palabras la y es consonante: *yapti*, *yang*, *yul*, *piyaya*.

**Para Piko.** Al comparar respuestas, *aisaby* y *aisabi* cuentan como la
misma palabra.

### S3 · La h junto a una consonante: cambia de lugar al escribirla — Confianza A

**Evidencia.** La h aparece junto a una consonante en muchas palabras
(*nahkisma*, *tahti*, *luhpi*, *mihta*, *pihni*, *yauhka*, *wauhtaya*…). Cada
persona la escribe en un lugar distinto o con otra letra:

| Teacher Smith | Tangni |
|---|---|
| mihta | mitha |
| yumgpa, yumpha | yumpha |
| luhpi | lupha |
| auhwisa | ahwisa |
| nahkisma | naki sma |
| walg walg | walhwal |

g, h, hg y gh, antes o después de la consonante, son lo mismo: un sonido que la
ortografía del español no tiene y que cada quien escribe como puede.

**Hipótesis (C).** Sería una aspiración que acompaña a la consonante. Sólo el
audio lo puede decir.

**Para Piko.**
- Para comparar respuestas, la h tiene que ignorarse de lugar: *mihta* y
  *mitha* son la misma palabra. Hoy la pestaña *Palabras* del panel de
  encuestas las toma como distintas.
- La forma de trabajo es la que usan las personas. *yumpha* reemplaza a la
  *yumhpa* de la versión 0.1: la escriben así las dos, y el método pide no
  imponer la ortografía de los libros.

### S4 · ng es un solo sonido — Confianza B

**Evidencia.** *tingki*, *ingk*, *sangni*. Teacher Smith escribió también
«Tignki», con las letras invertidas, y Tangni escribe «Tinki». Delante de k, la
ng se oye casi como n.

### S5 · La ch de «matchip» es t + s — Confianza A

**Evidencia.** Teacher Smith escribió «matchip» (cinco) y «mata wal sip»
(diez). Tangni escribe *matsip* siete veces. Cinco es *mat* + *sip*.

### S6 · Dónde termina una palabra todavía no está fijo — Confianza A

**Evidencia.** Separado «Kuki ki» y junto «Yaptiki». Separado «utla ra»
(Teacher Smith) y junto «utlara» (Tangni). Separado «Naki sma» (Tangni) y junto
«nahkisma» (Teacher Smith).

**Para Piko.** Los ejercicios de bloques cortan por los espacios. Por ahora se
respeta cómo lo escribió cada persona en las frases, y los números van juntos.
Hay que preguntar qué convención usa la escuela.

### S7 · l y y en «lai-» — Confianza C

**Evidencia.** Tangni escribe *yaiksna* (me gusta), donde Teacher Smith escribe
*laiksna*, y *yaikra* (hermano), parecido a *laikra* (hermana). Las demás l de
Tangni quedan como l (*lal*, *plun*, *walaya*, *almuk*).

**Hipótesis.** Antes de *ai*, la l se puede pronunciar como y. Puede ser
personal, de una generación o de la zona.

### S8 · La vocal doble: una vocal larga — Confianza A

**Evidencia.** Tangni escribe *lii* (agua) cuatro veces, siempre con la i
doble. Teacher Smith escribe *li*. Algunas ortografías del miskito marcan las
vocales largas; Tangni lo hace duplicando.

**Confirmado por el diccionario publicado.** Escribe *Lî* (agua) con
circunflejo, la misma i larga que Tangni marca duplicando. Y tiene un par que
sólo se distingue por eso: *kati* (luna) y *kâti* (mes).

**Para Piko.** La duración de la vocal distingue palabras, así que el robot
tiene que aprenderla de grabaciones. Un niño que dice *kati* por *kâti* dijo
otra palabra.

### S9 · El acento va en la primera sílaba — Confianza C

**De dónde sale.** De la literatura sobre el miskito, no del corpus: el texto
de las encuestas no muestra el acento, y ninguna persona lo marcó.

**Para Piko.** Lo usa la voz en español que suena **para mientras**, hasta
tener grabaciones (decisión 16). `herramientas/voz.ts` le pone tilde a la
primera sílaba cuando el español la cargaría en otra: *piyaya* → «píyaya»,
*almuk* → «álmuk». Es lo primero que hay que preguntarle a un hablante al oír
la voz. Si está mal, se cambia en ese archivo y se regeneran los ejercicios.

---

## Palabras: cómo se forman

### M1 · Los verbos se citan terminados en -aya — Confianza A

**Evidencia.** Doce verbos de Teacher Smith (*piyaya*, *yapaya*, *kaikaya*…),
nueve que Tangni escribe igual, y dos nuevos de Tangni: *balaya* (venir) y
*waya* (ir). Si se quita el -aya queda la raíz: *pi-*, *yap-*, *kaik-*,
*bal-*, *w-*. Cuando la raíz termina en i aparece una y de puente:
*pi-y-aya*.

El diccionario de Scott Lackwood escribe -aia (*Kaikaia*, *Yapaia*,
*Smalkaia*): es la misma terminación con otra ortografía.

**Predicción acertada.** Venir es *balaya*: lo dijo Tangni.

**Queda abierto.** Teacher Smith dio *wap* y *bal* para ir y venir. ¿Son la
orden («¡andá!», «¡vení!»)?

**Predicción.** Infinitivos que nadie escribió todavía: *kikaya* (reír),
*iwaya* (vivir), *daukaya* (hacer), *briaya* (tener), *dimaya* (entrar).

### M2 · El presente es raíz + s + persona — Confianza A

| Persona | Terminación | En el corpus |
|---|---|---|
| yo | -sna, -isna | *laik-sna*, *bri-sna* (tengo), *dim-isna* (entro, estudio), *sna* (estoy) |
| vos | -sma, -isma | *nahki-sma*, *iw-isma* (vivís) |
| él, ella | -sa, -isa | *pi-sa* (come), *dauk-sa*, *auhw-isa* (cae), *kik-isa* (sonríe), *sa* (está) |

**La i, resuelta en parte.** Con la presentación de Tangni aparece la regla:
si la raíz termina en vocal, va sin i (*pi-sa*, *bri-sna*); si termina en
consonante, con i (*dim-isna*, *kik-isa*, *iw-isma*, *auhw-isa*). La excepción
es *laik-sna*, en las dos personas: es un préstamo del inglés (*like*), y puede
seguir otra regla. *dauk-sa* queda pendiente (otras fuentes escriben
*daukisa*).

```
Yul   plun    pi-sa.           18  mani  bri-sna.        Jinotega  ra   skul     dim-isna.
perro comida  comer-PRS.3      18  año   tener-PRS.1     Jinotega  LOC  escuela  entrar(?)-PRS.1
'El perro come.'               'Tengo 18 años.'          'Estudio en Jinotega.'
```

**Predicción.** «Yo como» es *pisna*; «vos comés», *pisma*; «yo duermo»,
*yapisna*; «él duerme», *yapisa*.

### M3 · «Estar» no tiene raíz: sna, sma, sa — Confianza A

**Evidencia.** *Pain sna* (estoy bien), igual en las dos personas.
*Yaptiki utla ra sa* y *Mamiki utlara sa* (mi mamá está en la casa).
*Naki sma* (¿cómo estás?): Tangni lo escribe separado, y queda a la vista que
el verbo es sólo la terminación.

**Para Piko.** Enseñar *sna / sma / sa* es enseñar «estar» y las terminaciones
de todos los verbos a la vez.

### M4 · «Mi» y «tu» se pegan al sustantivo — Confianza A (mi, tu, su desde la v0.6)

|  | mi | tu | su |
|---|---|---|---|
| nombre | *nin-i* (las dos) | *nin-am* (TS), *nim-an* (T) | — |
| mamá | *yapti-ki* (TS), *mam-i-ki* (T) | — | — |
| papá | *pap-i-ki* (T) | — | — |
| abuela (*kuka*) | *kuk-i ki* (TS) | — | — |
| hermano o hermana (*muih*) | *muih-ki* → *muiki* (T) | — | — |
| coco | — | — | *ai kuku ka* (TS) |

- **Mi.** La a final se vuelve i y se suma *ki*: *kuka* → *kuki ki*, *mama* →
  *mamiki*, *papa* → *papiki*. Son tres ejemplos de dos personas. Si la palabra
  ya termina en i, sólo se suma *ki*: *yapti* → *yaptiki*.
- **Tu** lleva una m, en las dos personas, aunque en distinto lugar: *ninam*
  y *niman*. La m de «vos» es la misma de los verbos (-sma).
- **Su** va entre *ai* y *ka*. En el diccionario publicado, *ai* aparece
  delante de muchas partes del cuerpo: *ai bila* (su boca), *ai mihta* (su
  mano).
- **Tu** también al final: *Bilam kuaks*, «abrí tu boca» (diccionario).
- **Nuestro** es *wan*, delante: *Wan kiama*, «nuestra oreja» (diccionario).

**Predicción acertada a medias.** «Mi papá» = *aisiki*. La regla funcionó, pero
Tangni dice *papa*, no *aisa*: *papiki*.

**Predicciones.** Nombre, *nina*. Tu mamá, *yaptikam* o *mamikam*. Mi papá,
para quien dice *aisa*: *aisiki*.

**Con Matamoros (v0.6)** el cuadro se completa, con decenas de ejemplos: *papikam*
(tu papá), *ai papika* (su papá), *wan tasbaya* (nuestra tierra). Ver M20.

### M5 · «utla» cambia cuando la casa tiene dueño: watla — Confianza A

**Evidencia.** *utla* es la casa sola, también en *utla ra sa* y *utlara sa*.
En *skul watla* (escuela, «la casa de la escuela») la u inicial se vuelve *wa*.

**Confirmado por el diccionario.** *watla* aparece siempre con un dueño
delante: *Tuktan watla laîka* (líquido amniótico, «el líquido de la casa del
niño») y *Luhpa watlara* (el útero, «en la casa del hijo»).

**Predicción (C).** Mi casa, *uitla*; tu casa, *umtla*.

### M6 · Un verbo terminado en -i acompaña a otro — Confianza A

**Evidencia.** *aisi kaikaya* (leer: «ver hablando») y *kaiki kikisa* («sonríe
viendo»).

```
Kuk-i        ki,     ai     kuku  ka      kaik-i   kik-isa.
abuela-1POSS 1POSS   ai(?)  coco  3POSS   ver-CVB  reír-PRS.3
'Mi abuela sonríe al ver su coco.'
```

El diccionario publicado trae más: *Atki briaia*, «comprar para tenerlo»
(*atk-i* comprando + *briaia* tener). La literatura describe cadenas de verbos
así en las lenguas misumalpas (Hale 1991). Falta saber si la forma cambia cuando el que ve y el que sonríe son
personas distintas.

### M7 · Verbos nuevos con «takaya» — Confianza B

**Evidencia.** *lan takaya* (aprender, del inglés *learn*) y *wark takaya*
(trabajar, de *work*), que las dos personas escriben igual. Hay otras dos
maneras de adoptar un verbo inglés: pegarle la terminación (*laik-sna*) o
dejarlo sin nada (*Li want*, *Lii want*).

**Qué es *takaya*: resuelto con el diccionario.** Con el mismo préstamo,
*Klin takaia* es «limpiarse» y *Klin daukaia*, «limpiarlo». *takaya* es
«volverse» (la acción le pasa a uno) y *daukaya*, «hacer» (se la hace a otra
cosa). Otros ejemplos del diccionario: *laik takaia* (enamorar), *wâri
takisma* (estás pensando). Matamoros agrega un tercer verbo, *munaia*, para
los préstamos del inglés: ver M19.

### M8 · Una orden es raíz + s — Confianza A

**Evidencia.** *Yamni yap-s* (buenas noches): «dormí bien». Y en el
diccionario: *Aman kaiks* (¡cuidado!, «mirá»), *Bilam kuaks* (¡abrí tu boca!),
*Bara suis* (¡dejalo ahí!).

**Predicción acertada.** «¡Mirá!» es *kaiks*.

### M9 · Las cualidades terminan en -ni — Confianza A

**Evidencia.** *yamni* (bueno, bien), *pauni*, *pihni*, *lalahni*, *sangni*.
La excepción es *siksa* (negro). Tangni no contestó los colores. El
diccionario publicado muestra que no es cosa de colores: *damni* (dulce),
*swahni* (ácido), *pakni* (profundo). -ni forma palabras de cualidad.

**Resuelto (v0.6).** *lalahni* (amarillo) viene de *lalah*, que es
«dinero»: *Lalah ainghwa briaia*, «tener bastante dinero»; *¡Bika!, lalahka
narasa*, «¡mirá!, aquí está el dinero» (Matamoros, pp. 3 y 16). La predicción
«oro = *lalah*» había fallado (oro es *gul*, del inglés), pero la idea de
fondo era buena: el amarillo se nombra por la plata.

### M10 · Repetir para formar palabras — Confianza B (subió desde C)

**Evidencia.** *krikri* (cama), *walhwal* (cuatro, «dos-dos»), *smasmalkra*
(maestro).

**Predicción acertada.** Enseñar es *smalkaia* (diccionario). *smasmalkra*
es *sma-smalk-ra*: la raíz repetida y la terminación de quien hace algo (M15).

**Lo que agregó Matamoros (v0.6).** Además de formar palabras, repetir una
palabra entera le cambia el sentido de manera regular:

| Repetida | Sola | Significa | Ejemplo |
|---|---|---|---|
| *pat pat* | *pat* (ya) | muchas veces | *Pat pat ini uplika*, «persona que llora con frecuencia» (p. 3) |
| *pana pana* | *pana* (amigo) | uno al otro | *pana pana prukisa*, «se golpean mutuamente» (p. 69) |
| *kum kum* | *kum* (un) | algunos, uno por uno | *Daiwan nani kum kum*, «algunos animales» (p. 92) |
| *sat sat* | *sat* (clase) | de todas clases | *kalatka sat sat brisa*, «tiene colores diversos» (p. 69) |

Repetir una palabra es «muchas veces», «entre varios» o «de a uno».

### M11 · «ai», resuelta: ver M17 — Confianza A

**Historia.** En la v0.1 no entendíamos *ai* en *ai kuku ka* (su coco) y
*Plun aidauksa* (tengo hambre). Con los ejemplos de Matamoros se ve que son
dos usos de la misma pieza de tercera o primera persona: delante de un
sustantivo, *ai … -ka* es «su» (M4); delante de un verbo, *ai-* es «me» o
«se» (M17). *Plun ai-dauk-sa* es, palabra por palabra, «la comida me hace»:
el hambre es la que hace, y *ai-* es a quién.

### M12 · El pasado: -ri, -ram, -an — Confianza A (subió desde B)

Todo sale de los diccionarios publicados; las encuestas no preguntan el
pasado.

| Persona | Terminación | Ejemplo |
|---|---|---|
| yo | -ri | *kaik-ri* (vi), *yab-ri* (di), *wi-ri* (dije), *wark tak-ri* (trabajé) |
| vos | -(a)ram | *lu-ram* (pasaste), *ais-aram* (hablaste), *dauk-ram* (hiciste) |
| él, ella | -an, -wan | *dauk-an* (hizo), *yap-an* (durmió), *pru-wan* (murió), *dim-wan* (entró) |

```
Yu    kumi  man   wark  tak-ri.          Kaik-ras  piuta  lamak  lu-ram.
día   uno   solo  work  volverse-PST.1   ver-NEG   culebra cerca pasar-PST.2
'Trabajé solamente un día.' (p. 42)      'Pasaste cerca de la serpiente sin verla.' (p. 48)
```

**«Estaba haciendo»: verbo en -i + *kan*.** *kan* es el pasado de «estar»:
*Asla impaki tauki banghwi kan*, «andaban viajando juntos» (p. 9); *Devid harp
kangbi kan*, «David tocaba el arpa» (p. 26); *12 bri kan*, «tenía 12» (p. 22).

**Predicción.** «Comí» es *piri*; «dormiste», *yaparam*.

### M13 · El futuro: -amna, -ma, -bia — Confianza A (corregida en la v0.6)

**Lo que decía la v0.4, y estaba mal.** Que el futuro era *-aisna*, *-aisma*,
*-aisa*. Esas formas existen, pero son otra cosa: el infinitivo *-aia* más
«estar» (*sna*, *sma*, *sa*), «voy a…», «está por…». *Aikab-aisa*: «va a
vomitar» (está por vomitar).

**El futuro propio:**

| Persona | Terminación | Ejemplo |
|---|---|---|
| yo | -amna, -mna | *dauk-amna* (haré), *dim-amna* (me pondré), *bri-mna* (tendré) |
| vos | -ma | *bal-ma* (vengas, vendrás) |
| él, ella, nosotros | -bia | *bal-bia* (vendrá), *alk-bia* (tomará), *lu-bia* (venceremos) |

```
Aiwi-ram     ba    dauk-amna,   sakuna  taim  bri-mna    piuara.
me.decir-PST.2 REL hacer-FUT.1  pero    tiempo tener-FUT.1 cuando
'Haré lo que me dijiste, pero cuando tenga tiempo.' (p. 75)

Dinar-ra      bal-bia.
mediodía-LOC  venir-FUT.3
'Vendrá a mediodía.' (p. 71)
```

**El futuro sirve también para lo que todavía no pasó** en las frases con
«si», «hasta» y «después de» (O13): *balma kat*, «hasta que vengas»; *King ba
prubia ninkara*, «después de que el rey muera».

**Predicción.** «Comeré» es *piamna*; «vendré», *balamna*.

### M14 · La negación: -ras, apia, apu — Confianza A (subió desde B)

- **-ras**, en el verbo, «no» y «sin»: *briras* (no tiene), *Kaikras* (sin
  verla), *Plun piras kainara* (antes de comer: «comida no-comer antes»).
- **-kas**, en el sustantivo, «sin»: *latwan-kas*, sin amor.
- ***apia***, después, niega lo demás: un adjetivo (*Tuktan ainra ba lilia
  apia*, «el niño llorón no es feliz», p. 3), un futuro (*dingkbia apia*, «no
  entrará», p. 9) o un juicio (*yamni apia*, «no está bien»). 95 ejemplos.
- ***apu*** es «no hay», «no tiene»: *Upla tatumra ba pana apu*, «la persona
  envidiosa no tiene amigos» (p. 85); *Sahsing ba wainhkika baman brisa,
  mairka apu*, «sólo hay machos, no hembras» (p. 74).

**Predicción.** «No como» es *pisras* o *piras sna*; hay que preguntarlo.

### M15 · Quien hace algo: -ra, -kra; quien tiene algo: -kira — Confianza B

**Evidencia.** *smasmalkra* (maestro: el que enseña, de *smalkaia*), *rarakra*
(curandero). Y con -kira, «el que tiene»: *sibrin-kira* (miedoso, de *sibrin*,
miedo).

### M16 · Los verbos vienen en pareja: -kaia / -baia hacen, -waia pasa — Confianza A

**Evidencia.** En Matamoros, de los verbos en *-kaia*, 83 son transitivos
(«hacerle algo a algo») y 10 intransitivos; en *-baia*, 71 contra 16; en
*-waia*, 61 son intransitivos y 4 transitivos. Y hay **diez parejas** con la
misma raíz:

| Hacer algo | Que le pase a uno | Página |
|---|---|---|
| *kal-kaia*, romper | *kal-waia*, romperse | 34 |
| *iling-kaia*, abrir | *iling-waia*, abrirse | 28 |
| *dra-baia*, estirar | *dra-waia*, estirarse | 23 |
| *bu-kaia*, levantar | *bu-waia*, levantarse | 19 |
| *karh-baia*, menear | *karh-waia*, menearse | 35 |
| *klas-kaia*, cuajar | *klas-waia*, cuajarse | 39 |
| *lai-kaia*, verter | *lai-waia*, derramarse | 47 |
| *nuh-kaia*, engordar | *nuh-waia*, engordarse | 61 |
| *tuh-kaia*, tostar | *tuh-waia*, quemarse | 89 |
| *bai-kaia*, partir | *bai-waia*, reventar | 12–13 |

El propio diccionario lo dice: define siete verbos en *-waia* como «forma
intransitiva de…», y en miskito, *Silp kalkaia sip ba*: «lo que se puede
romper solo» (*silp*, por sí mismo).

```
Kwala  almuk  kal-waia.            Kwala  kal-kaia.
ropa   vieja  romper-INTR-INF      ropa   romper-TR-INF
'Romperse la ropa vieja.'          'Romper la ropa.'          (p. 34)
```

**Para Piko.** Aprender una pareja es aprender dos verbos.

**Predicción:**
«la puerta se abrió» es *Dur ba ilingwan* (M12); «abrí la puerta», *Dur ba
ilingkri*.

### M17 · ai- y mai- delante del verbo: «me», «se», «te» — Confianza A

**«Se» (la acción vuelve sobre uno).** 17 verbos de Matamoros empiezan con
*ai-*; 14 son intransitivos. Varios tienen la forma sin *ai-*:

| Sin ai- | Con ai- |
|---|---|
| *makupaia*, voltear (p. 54) | *aimakupaia*, inclinarse (p. 3) |
| *kruskaia*, empuñar | *aikruskaia*, agazaparse |
| *paskaia*, fabricar, formar | *aipaskaia*, juntarse (formarse) |
| *madiskaia*, nublar | *aimadiskaia*, nublarse |
| *auhbaia*, cargar | *aiauhbaia*, amontonarse |
| *tahbaia*, bañar | *aihtabaia*, bañarse (la h cambia de lugar, S3) |

**«Me» y «te».** Delante de un verbo conjugado, *ai-* es «me» y *mai-*,
«te»; la m es la de «vos» (M4):

```
Ai-wi-ram      ba   dauk-amna.         Yang  mai-wi-ri    ba   dauk-ram.
1-decir-PST.2  REL  hacer-FUT.1        yo    2-decir-PST.1 REL  hacer-PST.2
'Haré lo que me dijiste.' (p. 75)      'Hiciste lo que te dije.' (p. 13/14)
```

**«Le» no se marca en el verbo.** La persona a quien se le da o se le dice
algo lleva *-ra* (O2): *Witin-ra wi-ri ba aitani daukan*, «hizo bien lo que
le dije» (p. 4); *Kyambda-ra 500 córdobas kum yab-ri*, «le di 500 córdobas al
carpintero» (p. 9).

**Predicción.** «Me ves» es *aikaikisma*; «te veo», *maikaikisna*. Hay que
preguntarlo.

### M18 · Poder: V-aia sip sa; no poder: sip V-ras — Confianza A

**Evidencia.** *sip* es «posible». Con un infinitivo y «estar», «se puede»:
*Ahi ba wal supka auhni daukaia sip sa*, «con la almeja se puede hacer una
sopa rica» (p. 1). Cuatro ejemplos en las primeras tres páginas y decenas más.

Para «no puede», *sip* va **antes** y el verbo lleva *-ras* (M14):

```
Karma  latwan  taka  sip   aiwan-ras.
garganta dolor  por   poder cantar-NEG
'Por un dolor de garganta, no puede cantar.' (p. 35)
```

Otros: *sip ris briras* (no se puede descansar, p. 17), *sip kaikras* (no se
puede ver, p. 79).

**Predicción.** «No puedo dormir» es *sip yapras*.

### M19 · Verbos de dos piezas: takaia, daukaia, munaia — Confianza A

Muchos verbos son una palabra (casi siempre un préstamo) más un verbo
«liviano» que lleva las terminaciones:

| Liviano | Qué aporta | Ejemplos de Matamoros |
|---|---|---|
| *takaia* | volverse, que a uno le pase | *lan takaia* (aprender), *wark takaia* (trabajar), *lilia takaia* (alegrarse), *klin takaia* (limpiarse) |
| *daukaia* | hacer, causar | *lan daukaia* (enseñar: «hacer aprender»), *klin daukaia* (limpiar) |
| *munaia* | hacer (con préstamos del inglés) | *yus munaia* (usar), *stadi munaia* (estudiar), *hilp munaia* (ayudar), *ansa munaia* (contestar), *rispik munaia* (respetar) |

*lan takaia* / *lan daukaia* es la misma pareja que M16, armada con dos
palabras: aprender es que le pase a uno, enseñar es hacérselo a otro. Amplía
M7.

```
Aisi kaikaia   lan    dauk-aia.
leer           learn  hacer-INF
'Enseñar a leer.' (p. 49)
```

### M20 · -ka: «de» pegado al que tiene dueño — Confianza A

El dueño va antes (O4) y la cosa lleva *-ka*, o cambia su vocal final por
*-ika*:

| Frase | Palabra por palabra | Página |
|---|---|---|
| *Waspam tawanka* | Waspam pueblo-de | 11 |
| *Krukira uplika nani* | Krukira gente-de PL: la gente de Krukira | 2 |
| *Miskitu tawanka nani* | miskito pueblos-de: las comunidades miskitas | 21 |
| *ai papika* | su papá-de: su papá | 60 |

*upla* (persona) → *uplika*; *papa* → *papika*. Es la misma -ka de *ai kuku
ka* (M4). Con *-anka* se hace un sustantivo de un verbo: *luk-anka* (el
pensamiento, de *lukaia*, pensar), *pask-anka* (la forma, de *paskaia*),
*klakw-anka* (la herida).

**Mi, tu, su, nuestro, completo** (amplía M4):

| | Cómo | Ejemplos de Matamoros |
|---|---|---|
| mi | -ki, -i | *bip-ki* (mi ganado), *lalah-ki*, *yapti-ki*, *muih-ki*, *tahti-ki* |
| tu | -kam, -m (con *man* delante, si se quiere) | *papi-kam* (tu papá), *Man klakwan-kam* (tu herida), *bila-m* (tu boca) |
| su | *ai* … -ka | *ai papi-ka* (su papá), *ai bila* (su boca) |
| nuestro (de todos) | *wan* delante | *Wan Aisa* (Nuestro Padre), *wan tasbaya* (nuestra tierra) |
| nuestro (sin vos) | *yang nani* delante | *yang nani watla-ra* (a nuestra casa, p. 83) |

*wan* también es «uno, cualquiera»: *wan mihta* es «la mano» (de cualquiera),
por eso el cuerpo se cita así (L9).

---

## Frases: el orden

### O1 · El verbo va al final — Confianza A

**Evidencia.** 18 de las 19 frases con verbo de las dos tandas terminan en él.
La más clara es la de Tangni, que tiene las tres piezas: *Yul plun pisa*,
«perro comida come» (sujeto – objeto – verbo). Y *plun piyaya*, «comida
comer», para «comer».

**Contraejemplo.** *Yaiksna inska* (me gusta el pescado), de Tangni, pone el
verbo primero; Teacher Smith dijo *Inska laiksna*. Puede ser el orden de la
frase en español, que es justo el riesgo de traducir frases (metodología §7).
*Kaya skul ra* (vamos a la escuela) también empieza con *kaya*, que todavía no
sabemos qué es.

### O2 · Posposiciones: «casa a», no «a casa» — Confianza A

**Evidencia.**
- *ra* (a, en): *utla ra*, *utlara*, *skul ra* (las dos personas), *Jinotega ra*, *ani-ra*.
- *kat* (hasta): *yauhka kat*.
- *pura* (encima, más): *matlalkahbi pura kum*, *matsip pura kum* y, en el
  diccionario, *Nakra pura tamaya* (la ceja: «el pelo de encima del ojo»).

**El inventario, con Matamoros (v0.6).** Todas van después:

| Posposición | Significa | Ejemplo | Página |
|---|---|---|---|
| *ra* | a, en; también «a él» (M17) | *Dinar-ra balbia*, vendrá a mediodía | 71 |
| *wina* | de, desde (220 ejemplos) | *Liwanhta wina bukit aubaia*, sacar el balde del pozo | 10 |
| *wal* | con; «que» al comparar (O14) | *kin wal wapisa*, camina con bastón | 6 |
| *kat* | hasta | *Ahkia balma kat*, hasta que vengas | 1 |
| *bilara* | dentro de | *utla bilara*, dentro de la casa | 89 |
| *tilara* | entre | *tangni nani tilara*, entre las flores | 69 |
| *mapara* | contra, frente a | *lapta mapara*, contra el sol | 14 |
| *munhta* | debajo de | *Tibil munhta*, debajo de la mesa | 57 |
| *pura* | encima de, sobre | *dus purara*, por encima de los árboles | 73 |
| *baila* | cerca de | *tnata baila*, cerca de la meta | 12 |
| *piuara* | durante, cuando | *Mani piuara*, durante el verano | 9 |
| *dukiara* | para, por (O13) | *waitla makaia dukiara*, para hacer mi casa | 9 |
| *taka* | por (causa) (O13) | *Uba pasa ailal taka*, por exceso de gas | 13 |

Varias son un sustantivo de lugar con *-ra*: *bila* (boca) → *bila-ra*
(dentro), *pura* → *pura-ra*, *mapa* → *mapa-ra*. Es como decir «en la boca
de la casa».

### O3 · Lo que describe al sustantivo va después — Confianza A

**Evidencia.** *titan yamni*, *luhpi waitna*, *tuktan mairin*, *tuktan
waitna*, *smasmalkra mairin*, *aisa almuk*, *mama almuk*, *papa almuk*. Lo que
describe al verbo va antes: *yamni yaps* (un ejemplo).

### O4 · Lo que dice «de qué» o «de quién» va antes — Confianza A

**Evidencia.** *skul watla* (la casa de la escuela), *skul tuktan* (niño de
escuela: estudiante) y, de Tangni, *galila mabra* (gallina huevo: huevo de
gallina). El diccionario hace igual con todos los huevos: *Kâlila mahbra*, *Kuswa
mahbra* (de tortuga), *Kakamuk mahbra* (de iguana). Es como en inglés
*school house*.

### O5 · «Yo» y «vos» se pueden omitir — Confianza A

**Evidencia.** *Pain sna*, *Inska laiksna*, *Anira iwisma*, *18 mani brisna*.
La terminación ya dice quién. *Yang* (yo) aparece cuando la persona se
presenta: *Yang nini Ana*, *Yang nini Tangni*.

### O6 · Para decir quién es algo, no hace falta verbo — Confianza B

**Evidencia.** *Yang nini Ana* y *Yang nini Tangni* (yo, mi nombre, …), igual
en las dos personas; *Ninam dia?* Para decir dónde o cómo está alguien, en
cambio, aparece «estar»: *Mamiki utlara sa*, *Pain sna*.

### O7 · Las preguntas no cambian el orden — Confianza B

**Evidencia.** *Ninam dia?* («¿tu nombre qué?»), *Niman naki?* («¿tu nombre
cómo?»), *Anira iwisma?* (igual en las dos), *Naki sma?* La palabra de pregunta
ocupa el lugar de la respuesta: *Yang nini **Ana*** ↔ *Ninam **dia***.

Palabras de pregunta: *dia* (qué), *nahki* (cómo), *anira* (dónde).

### O8 · No hay «el» ni «la» — Confianza A

**Evidencia.** En ninguna de las frases donde el español pone artículo lo pone
el miskito: *Yul pisa*, *Yul plun pisa*, *Inska laiksna*, *utla ra*, *skul
ra*. Otras fuentes mencionan *ba* («ese») y *kum* («un»), y *nani* para el
plural; en el corpus no aparecen.

### O9 · El número va después del sustantivo — Confianza A (corregida en la v0.6)

**Lo que decía la v0.4.** Que iba antes, por *18 mani brisna* («tengo 18
años»). Era un solo ejemplo, escrito con cifras.

**Lo que muestra Matamoros.** Con el número escrito en palabras, va después,
como cualquier cualidad (O3), y el sustantivo no cambia:

| Ejemplo | Página |
|---|---|
| *mani wal*, dos años («año dos») | 4 |
| *tuisa wal bri kan*, tenía dos lenguas | 2 |
| *Taim yua 30 bri ba*, tiempo de 30 días («días 30») | 36 |
| *Yu kumi man*, un solo día | 42 |

Con cifras puede ir en cualquiera de los dos lugares: *yua 30*, pero *18
mani* y *500 córdobas kum*, como en español.

**Predicción.** «Dos perros» es *yul wal*.

### O10 · La pregunta de sí o no termina en ki — Confianza B (subió desde C)

**Evidencia.** *¿Atkaisma ki?*, «¿lo vas a comprar?» (Scott Lackwood), y
*¿Pali? ¿balan ki?*, «¿de veras vino?» (Matamoros, p. 62). Las preguntas con
*dia*, *nahki*, *anira* o *yâ* (quién: *¿Man ba yâ?*, «¿quién sos?») no lo
llevan.

**Predicción.** «¿Tenés hambre?» terminará en *ki*.

### O11 · El plural es nani; «un» es kum; los dos van después — Confianza A (subió desde B)

**Evidencia.** *Una nani* (labios), *Kabu inskika nani* (mariscos), *siknis
kum* (una enfermedad). En las encuestas no aparece ninguno: las frases no los
piden.

**El orden completo, con Matamoros (v0.6).** sustantivo – cualidad – *nani* –
*ba*: *Tuktan sirpi nani ba*, «los niños pequeños» (p. 3); *Krukira uplika
nani ba*, «la gente de Krukira» (p. 2). *ba* («ese, el ya sabido») cierra el
grupo que hace de tema de la frase: aparece en casi todos los ejemplos con
sujeto, y no hace falta traducirlo.

### O12 · «Vamos» es kaisa o kaya, al principio — Confianza B

**Evidencia.** *Kaisa, kaia maka* (vamos, vámonos) en el diccionario, y *Kaya
skul ra* (vamos a la escuela) de Tangni. Teacher Smith dijo *Skul ra wapp*.
Puede que las dos maneras convivan.

### O13 · Si, porque, para, antes, después: la pieza va al final — Confianza A

En miskito, la parte que en español empieza con «si», «porque» o «para»
**termina** con su pieza, y va antes de la frase principal (con la excepción
de *bara* y *bamna*, «porque», que pueden ir después). En los ejemplos de
Matamoros no apareció ninguno en contra:

| Significa | Cómo se arma | Ejemplo | Página |
|---|---|---|---|
| si | … V-bia / -aia **kaka**, … | *Asla wark takbia kaka, yawan purman lâka ba pura lubia*: si trabajamos juntos, venceremos la miseria | 70 |
| porque, por | … **taka** | *Karma latwan taka sip aiwanras*: por un dolor de garganta no puede cantar | 35 |
| porque | … V-an **bara** / **bamna** | *asangra mangkram bara*: porque la sembraste en el barranco | 9 |
| para | … V-aia **dukiara** | *waitla makaia dukiara*: para hacer mi casa | 9 |
| antes de | … V-ras **kainara** | *Plun piras kainara*: antes de comer | 77 |
| después de | … V-bia **ninkara** | *King ba prubia ninkara, luhpia ba kraun alkbia*: después de que el rey muera, el hijo tomará la corona | 60 |
| hasta que | … V-ma / -bia **kat** | *Ahkia balma kat, yang naha wina waisna*: hasta que vengas, yo me iré de aquí | 1 |
| cuando | … **taim** / **piuara** | *sukwan taim*: cuando está madura | 36 |
| pero | **sakuna** … (al principio) | *…daukamna, sakuna taim brimna piuara*: lo haré, pero cuando tenga tiempo | 75 |
| como | … **baku** | *Papikam luki ba baku*: como piensa tu papá | 13 |

Dos detalles:
- **«Antes de comer» es «no-comer antes».** *kainara* pide el verbo en
  negativo: *plun pi-ras kainara*. Lo que todavía no pasó se dice como algo
  que no pasó.
- **«Después» y «hasta» piden futuro** (*-bia*, *-ma*) aunque se cuente en
  general: lo que todavía no ocurrió va en futuro (M13).

```
Asla      wark  tak-bia      kaka,  yawan  purman   lâka  ba  pura  lu-bia.
juntos    work  volverse-FUT si     nosotros pobre  -dad  ese encima pasar-FUT
'Si trabajamos juntos, venceremos la miseria.' (p. 70)
```

**Predicción.** «Si llueve, no voy» es *Li auhbia kaka, wapras* o *…waia
apia*: hay que preguntarlo.

### O14 · Comparar: kau + cualidad … wal — Confianza A

**Evidencia.** *kau* es «más» y va delante de la cualidad o del verbo; lo
comparado lleva *wal* (con) y suele ir al final. 89 ejemplos con *kau*:

```
Naiwa  kau  bitar   sna,      nahwala  wal.
hoy    más  better  estar.1   ayer     con
'Hoy estoy mucho mejor que ayer.' (p. 17)

Beriku  ba   kau  paun  wihra   bukisa,      aras     ba   wal.
burro   ese  más  peso  pesado  levanta.3    caballo  ese  con
'El burro aguanta más peso que el caballo.' (p. 17)
```

Sin *wal*, *kau* es «muy, el más»: *kau tara ba Jûpita*, «el más grande es
Júpiter» (p. 47).

**Predicción.** «Mi perro es más grande que el tuyo»:
*Yulki ba kau tara, yulkam ba wal*.

### O15 · «Lo que…», «el que…»: la frase va antes, con ba o ya ba — Confianza A

**Evidencia.** Para describir una cosa con una frase, la frase va antes y
termina en *ba* (ese):

| Ejemplo | Palabra por palabra | Página |
|---|---|---|
| *Aiwiram ba daukamna* | me-dijiste ese haré: haré lo que me dijiste | 75 |
| *Waihla bri uplika nani* | enemistad tener personas: las personas que tienen enemistad | 3 |
| *Klasit pain ba tasba salhki dauki ya ba* | excusado bueno ese, tierra cavando hecho el-que: el buen excusado es el que se hace cavando | 39 |

*ya ba* («el que») cierra casi todas las definiciones del diccionario: 179
veces. El verbo de la frase de adentro va con -i (M6) o con su terminación:
*bri* (que tiene), *dauki ya ba* (el que se hace). Como en el resto del
idioma, lo que describe va antes de lo descrito (O4).

### O16 · «Estar haciendo»: V-i taukisa — Confianza A

**Evidencia.** El verbo con -i (M6) y *taukaia* (andar, moverse) conjugado:
«anda haciendo», «está haciendo». 72 ejemplos:

| Ejemplo | Página |
|---|---|
| *Aras ba utla latara twi pih taukisa*: el caballo anda comiendo zacate en el patio | 8 |
| *Tuktan ba utla bilara kwasi taukisa*: el niño anda gateando dentro de la casa | 89 |
| *Aman kaiki tauki bas*: andá con cuidado («andá mirando») | 6 |

Con *kan* al final es pasado: *Asla impaki tauki banghwi kan*, «andaban
viajando juntos» (p. 9, M12).

**Predicción.** «Estoy comiendo» es *pih
taukisna*.

---

## Vocabulario

### L1 · Los préstamos llegan con lo que vino de afuera — Confianza A

| Viene de | Miskito | Qué cambió |
|---|---|---|
| inglés *please*, *do* | plis, du | |
| *school*, *book* | skul, buk | oo → u |
| *shoes*, *door* | sus, dur | o → u |
| *baby*, *aunty* | bibi, anti | |
| *story* | stury | o → u |
| *ink* (tinta) | ingk (lápiz) | cambió el significado |
| *work*, *learn* | wark, lan | la vocal de *er* → a, se pierde la r |
| *like*, *want*, *fine* | laik, want, pain | f → p |
| *rice*, *beans*, *bread* | rais, bins, bret | |
| *beef* (carne de res) | bip (vaca) | la carne nombra al animal |
| español *gallina*, *plátano*, *café* | galila, platu, cafi | ll → l, o → u, e → i |
| español *maestro* | maistro | conserva la o |

**Dónde se concentran.** En la escuela (6 de 10 palabras en la primera tanda)
y en **las comidas y animales que llegaron de afuera**: arroz, frijoles, pan,
café, plátano, la gallina y la vaca. Lo que se cultiva y se pesca desde siempre
tiene palabra propia: *yaura* (yuca), *tama* (banano), *haya* (maíz), *inska*
(pescado), *wina* (carne). El cuerpo, los números y los colores no tienen
ningún préstamo. Que lo básico resista y lo nuevo se preste es un patrón
conocido en muchas lenguas.

El diccionario publicado suma más, sobre todo en salud: *klin* (limpio,
*clean*), *andris* (naranja, *oranges*), *gul* (oro, *gold*), *siknis*
(enfermedad, *sickness*), *puisin* (veneno, *poison*), *indiksan* (inyección).

**Para Piko.** Es un puente entre las lecciones de inglés y las de miskito:
*skul*, *buk*, *rais*, *bins*, *bret* ya están a medio camino de *school*,
*book*, *rice*, *beans*, *bread*.

### L2 · El género se agrega con waitna y mairin — Confianza A

**Evidencia.** *smasmalkra* es maestro o maestra; *tuktan*, niño o niña. Hijo
es *luhpi waitna*; hija, *luhpi mairin*. Y Tangni, a «niño o niña», contestó
*tuktan mairin* y *tuktan waitna*: niña y niño.

**Predicción acertada.** La niña = *tuktan mairin*.

**Matiz del diccionario.** Para los animales la hembra también es *mairin*
(*Aras mairin*, yegua), pero el macho no es *waitna*: es *wainhka* (*Aras
wainhka*, caballo macho).

### L3 · Dos palabras para «niño»: luhpi y tuktan — Confianza B

*luhpi* es hijo o hija (la relación); *tuktan*, niño o niña (la edad). Tangni
usa *tuktan* también para «bebé».

### L4 · «Mañana»: titan y yauhka — Confianza B

Teacher Smith: *titan yamni* (buenos días) y *yauhka kat* (hasta mañana, el día
siguiente). Tangni: *titan yamni* también, pero «hasta mañana» es *titan
pruabia*. Si *titan* sirve para las dos cosas, la distinción de la versión 0.1
no se sostiene. Matamoros da «mañana = *Titan mani ar yauhka*»: las dos
sirven para el día siguiente, y *titan* además es la mañana del día. Falta
saber qué es *pruabia*.

### L5 · Una palabra, dos sentidos: li — Confianza A

*li* es agua y lluvia. *Li want* / *Lii want* (quiero agua), *Li auhwisa* /
*Lii ahwisa* (está lloviendo) y, para la palabra «lluvia», *li ausisa*: «el
agua cae». Es la manera de decirlo en las dos personas.

### L6 · ¿Verde y azul son un mismo color? — Confianza B

Para azul se dio *sangni* y para verde, una descripción (*twi maplalka*).
Tangni no contestó los colores. Matamoros traduce «verde» como *sangni*: la
misma palabra sirve para los dos colores en dos fuentes distintas.

### L7 · Hermano y hermana dependen de quién habla — Confianza B (subió desde C)

| | hermano | hermana |
|---|---|---|
| Teacher Smith | *muih* | *laikra* |
| Tangni | *yaikra* | *muiki* (*muih* + «mi») |

Las dos personas usan las mismas dos palabras, **pero al revés**. Encaja
exactamente con lo que la versión 0.1 se preguntaba: *muih* sería el hermano
del mismo sexo de quien habla y *laikra* (o *yaikra*, S7) el del otro sexo.
Eso sólo cierra si las dos personas son de distinto sexo, y eso no lo sabemos
ni lo vamos a suponer. Hay que preguntarlo.

**Para Piko.** Hasta saberlo, «hermano» y «hermana» salen de los ejercicios:
la mitad de los niños los aprenderían al revés.

### L8 · Dos palabras para «mamá» y «papá» — Confianza B

Teacher Smith: *yapti* y *aisa* (y *mama almuk*, abuela). Tangni: *mama* y
*papa* en todo (*mamiki*, *papiki*, *mama almuk*, *papa almuk*). ¿*mama* y
*papa* son la manera de hablar en la casa y *yapti* y *aisa* la de la escuela?
¿O de distintas generaciones?

### L9 · La familia y el cuerpo se nombran con dueño — Confianza A

**Evidencia.** A «mamá», «papá» y «hermana», Tangni contestó *mamiki* (mi
mamá), *papiki* (mi papá) y *muiki* (mi hermana). Teacher Smith, en las
frases, dice *yaptiki* y *kuki ki*. En muchas lenguas las palabras de
parentesco se dicen casi siempre con su dueño.

Matamoros, en su diccionario, cita así las partes del cuerpo (*Wan nakra*,
nuestro ojo; *wan mihta*; *wan napa*) y la familia (*Aisika*, su padre;
*Muihnika*, su hermano).

**Para Piko.** Un ejercicio de familia puede enseñar *mamiki* antes que
*mama*: es como lo dicen.

---

## Los números

### N1 · Cinco es una mano — Confianza A

| | Teacher Smith | Tangni | Forma de trabajo |
|---|---|---|---|
| 1 | kumi | kumi | kumi |
| 2 | wal | wal | wal |
| 3 | yumgpa | yumpha | yumpha |
| 4 | walg walg | walhwal | walhwal (dos y dos) |
| 5 | matchip | matsip | matsip (*mat* «mano» + *sip* «completa»?) |

Del 1 al 5 las dos personas cuentan igual. Diez, para Teacher Smith, es *mata
walsip*: «manos dos completas».

### N2 · kumi sola, kum dentro — Confianza A

Uno es *kumi*, pero dentro de un número es *kum*: *matlalkahbi pura kum*
(Teacher Smith), *matsip pura kum* (Tangni).

### N3 · Del 6 al 10 hay dos sistemas — Confianza B

| | Teacher Smith: desde el seis | Tangni: desde el cinco |
|---|---|---|
| 6 | matlalkahbi | matsip pura kum (5 + 1) |
| 7 | matlalkahbi pura kum (6 + 1) | matsip pura wal (5 + 2) |
| 8 | matlalkahbi pura wal (6 + 2) | matsip pura yumpha (5 + 3) |
| 9 | matlalkahbi pura yumpha (6 + 3) | matsip pura walhwal (5 + 4) |
| 10 | mata walsip (manos dos completas) | matsip pura matsip (5 + 5) |

El de Teacher Smith es el que traen los materiales publicados. El de Tangni es
más regular: todo se arma con el cinco y *pura*, sin la palabra
*matlalkahbi*. **Hipótesis (C):** el sistema regular es una simplificación
reciente, que suele pasar cuando una generación cuenta más en otra lengua.

**Para Piko.** Las dos formas son reales. Qué sistema enseñar lo tiene que
decidir la comunidad, con sus docentes. Mientras tanto, `numeros-2` enseña el
de Teacher Smith; si se elige el de Tangni, los ejercicios se arman igual
(«cinco *pura* uno»).

---

## Lo que parece patrón y no lo es (todavía)

- **-ti** en *yapti* y *tahti* (mamá, tío): dos palabras y nada más.
- **-kra** en *nakra* (ojo), *laikra* y *yaikra*. En *smasmalkra* y *rarakra*
  sí es la terminación de quien hace algo (M15), pero en ojo y hermana no
  hay nada que lo indique.
- **wal** (dos) y **walaya** (escuchar), **walpa** (piedra): suenan parecido;
  nada indica relación.
- **lal** (cabeza) dentro de *matlalkahbi* y *lalahni*.
- **yapta** (sol) y **yapti** (mamá), **yapaya** (dormir): se parecen; con
  esto no alcanza para decir nada.

---

## Qué preguntar en la próxima tanda

Las preguntas que la encuesta actual no hace se quedan sin comprobar: en esta
tanda, 23 de 26. **Lo más útil sería una encuesta corta de seguimiento** con
estas filas, para quienes ya contestaron y se ofrecieron a ayudar.

| # | Preguntar | Esperamos | Pone a prueba |
|---|---|---|---|
| 2 | tu mamá · su mamá | *yaptikam* o *mamikam* · *yaptika* | M4 |
| 3 | mi casa · tu casa | *uitla* · *umtla* | M5 |
| 4 | yo como · vos comés | *pisna* · *pisma* | M2 |
| 5 | yo duermo · él duerme | *yapisna* · *yapisa* | M2 (la i) |
| 6 | Estás en la casa | *utla ra sma* | M3 |
| 7 | vivir (en un lugar) | *iwaia* | M1 (reír, tener, hacer y entrar ya están confirmados) |
| 9 | ¡Dormí! · ¡Vení! | *yaps* · ¿*bal*? | M8, M1 |
| 10 | el maestro (hombre) | *smasmalkra waitna* | L2 |
| 11 | Ana es maestra | *Ana smasmalkra* (sin verbo) | O6 |
| 12 | once (en los dos sistemas) | *mata walsip pura kum* · *matsip pura matsip pura kum*? | N3 |
| 13 | un perro · dos perros | *yul kum* · ? | N2, O9, O11 |
| 14 | ¿Tenés hambre? | *Plun mai dauksa ki?* | M11, O10 |
| 15 | mi coco · tu coco · su coco | — | M4, M11 |
| 17 | zacate · ¿*sangni* es verde, azul o los dos? | *twi* · los dos | L6 |
| 18 | **Hermano y hermana, a una mujer y a un hombre** | — | L7 |
| 19 | **¿Qué es *pruabia*? ¿*titan* es también «el día siguiente»?** | — | L4 |
| 20 | **¿Qué sistema de números se enseña en la escuela?** | — | N3 |
| 21 | ¿*yapti* o *mama*? ¿Cuándo se usa cada una? | — | L8 |
| 22 | ¿*Kaya skul ra* o *Skul ra kaya*? | — | O1, O12 |
| 23 | Mi abuela sonríe cuando yo veo su coco | — (¿cambia *kaiki*?) | M6 |
| 24 | los niños | *tuktan nani* | O11 |
| 25 | No quiero agua · No como | *pisras* o *piras sna* | M14 (sólo hay datos de los diccionarios) |
| 26 | Ayer comí · Mañana comeré | *piri* · *piamna* | M12, M13 (corregida en la v0.6) |
| 27 | La puerta se abrió · Abrí la puerta | *Dur ba ilingwan* · *Dur ba ilingkri* | M16 |
| 28 | Me ves · Te veo | *aikaikisma* · *maikaikisna* | M17 |
| 29 | No puedo dormir · Estoy comiendo | *sip yapras* · *pih taukisna* | M18, O16 |
| 30 | Si llueve, no voy | *Li auhbia kaka, …* | O13 |

Además:
- **Personas de otras zonas.** Las dos fuentes son de Raiti. Para que una
  palabra pase a «probable» hacen falta 3 personas de 2 zonas: Bilwi, Waspam,
  Laguna de Perlas…
- **Las 20 entradas marcadas «revisar»** en [`lexico.json`](lexico.json).
- **Grabaciones.** Teacher Smith y Tangni se ofrecieron a revisar y a grabar.

---

## Referencias

La bibliografía está en [`../metodologia.md`](../metodologia.md#referencias).
Donde acá dice «coincide con las descripciones publicadas», la comparación la
hizo el modelo con lo que sabe de la literatura sobre el miskito (Heath y Marx
1953; Salamanca 1988; Hale 1991). Es un contraste de apoyo, no una cita
textual. Antes de tratarlo como confirmado, conviene revisarlo contra las
obras mismas.
