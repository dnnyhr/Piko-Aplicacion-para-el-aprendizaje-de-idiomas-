# Miskito: patrones y reglas

> **Versión 0.2** · 2 de octubre de 2026 · dos tandas de datos

**De dónde sale.** De dos personas de la misma comunidad, Raiti (Río Coco), las
dos hablantes maternas, de dos generaciones distintas:

| Fuente | Quién | Qué escribió |
|---|---|---|
| `raiti-2026-09-28` | Teacher Smith, docente | 80 palabras, 15 frases, una oración libre |
| `raiti-2026-09-30` | Tangni, estudiante de 18 años | 84 palabras, 15 frases, una presentación |

Todo está en [`corpus.csv`](corpus.csv) tal cual lo escribieron.

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

---

## Lo principal, en diez líneas

1. **Tres vocales: a, i, u.** Ni una palabra miskita lleva e ni o; sólo los préstamos. (S1)
2. **El verbo va al final.** «Yul plun pisa» es *perro comida come*. (O1)
3. **«A la casa» se dice «casa a».** «utla ra». Usa posposiciones, no preposiciones. (O2)
4. **La persona va pegada al verbo:** -sna es yo, -sma es vos, -sa es él o ella. Por eso «yo» se puede omitir. (M2, O5)
5. **«Estar» no tiene raíz:** es sólo la terminación, *sna*, *sma*, *sa*. (M3)
6. **«Mi» se forma cambiando la a final por i y sumando *ki*:** kuka → kuki ki, mama → mamiki, papa → papiki. (M4)
7. **En la familia se nombra con dueño:** para «mamá» se dice «mi mamá». (L9)
8. **Hay dos maneras de contar del 6 al 10:** desde el seis o desde el cinco. (N1, N3)
9. **El inglés y el español dejaron huella** en la escuela y en las comidas que llegaron de afuera, no en el cuerpo ni en los números. (L1)
10. **Las palabras no tienen género.** Cuando hace falta, se agrega *waitna* (hombre) o *mairin* (mujer). (L2)

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

### S8 · La vocal doble: una vocal larga — Confianza B

**Evidencia.** Tangni escribe *lii* (agua) cuatro veces, siempre con la i
doble. Teacher Smith escribe *li*. Algunas ortografías del miskito marcan las
vocales largas; Tangni lo hace duplicando.

**Para Piko.** Es un dato de pronunciación que el texto casi nunca muestra. Las
grabaciones dirán si *li* tiene la i larga.

---

## Palabras: cómo se forman

### M1 · Los verbos se citan terminados en -aya — Confianza A

**Evidencia.** Doce verbos de Teacher Smith (*piyaya*, *yapaya*, *kaikaya*…),
nueve que Tangni escribe igual, y dos nuevos de Tangni: *balaya* (venir) y
*waya* (ir). Si se quita el -aya queda la raíz: *pi-*, *yap-*, *kaik-*,
*bal-*, *w-*. Cuando la raíz termina en i aparece una y de puente:
*pi-y-aya*.

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

### M4 · «Mi» y «tu» se pegan al sustantivo — Confianza A (mi), B (tu), C (su)

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
- **Su** va entre *ai* y *ka*. Hay un solo ejemplo.

**Predicción acertada a medias.** «Mi papá» = *aisiki*. La regla funcionó, pero
Tangni dice *papa*, no *aisa*: *papiki*.

**Predicciones.** Nombre, *nina*. Tu mamá, *yaptikam* o *mamikam*. Mi papá,
para quien dice *aisa*: *aisiki*.

### M5 · «utla» cambia cuando la casa tiene dueño: watla — Confianza B

**Evidencia.** *utla* es la casa sola, también en *utla ra sa* y *utlara sa*.
En *skul watla* (escuela, «la casa de la escuela») la u inicial se vuelve *wa*.

**Predicción (C).** Mi casa, *uitla*; tu casa, *umtla*.

### M6 · Un verbo terminado en -i acompaña a otro — Confianza B

**Evidencia.** *aisi kaikaya* (leer: «ver hablando») y *kaiki kikisa* («sonríe
viendo»).

```
Kuk-i        ki,     ai     kuku  ka      kaik-i   kik-isa.
abuela-1POSS 1POSS   ai(?)  coco  3POSS   ver-CVB  reír-PRS.3
'Mi abuela sonríe al ver su coco.'
```

La literatura describe cadenas de verbos así en las lenguas misumalpas (Hale
1991). Falta saber si la forma cambia cuando el que ve y el que sonríe son
personas distintas.

### M7 · Verbos nuevos con «takaya» — Confianza B

**Evidencia.** *lan takaya* (aprender, del inglés *learn*) y *wark takaya*
(trabajar, de *work*), que las dos personas escriben igual. Hay otras dos
maneras de adoptar un verbo inglés: pegarle la terminación (*laik-sna*) o
dejarlo sin nada (*Li want*, *Lii want*).

### M8 · Una orden es raíz + s — Confianza C

**Evidencia.** *Yamni yap-s* (buenas noches): «dormí bien». Un solo ejemplo.

**Predicción.** «¡Dormí!» es *yaps*; «¡Mirá!», *kaiks*.

### M9 · Los colores y «bueno» terminan en -ni — Confianza B

**Evidencia.** *yamni* (bueno, bien), *pauni*, *pihni*, *lalahni*, *sangni*.
La excepción es *siksa* (negro). Tangni no contestó los colores.

**Hipótesis (C).** *lalahni* (amarillo) vendría de *lalah* (oro, dinero).

### M10 · Repetir para formar palabras — Confianza C

**Evidencia.** *krikri* (cama), *walhwal* (cuatro, «dos-dos»), *smasmalkra*
(maestro).

**Predicción.** Enseñar sería *smalkaya*.

### M11 · «ai», una pieza que todavía no entendemos — Confianza C

**Evidencia.** *ai kuku ka* (su coco) y *Plun aidauksa* (tengo hambre). Tangni
dijo *Plun aidauki*: la misma pieza *ai* con otra terminación.

**Dos hipótesis.** *ai* es un pronombre que no es de segunda persona («me» o
«su», según la frase), o son dos palabras distintas que suenan igual. Para
decidir, hay que preguntar «¿Tenés hambre?» y «mi coco, tu coco, su coco».

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
- *pura* (más, encima): *matlalkahbi pura kum*, *matsip pura kum*.

### O3 · Lo que describe al sustantivo va después — Confianza A

**Evidencia.** *titan yamni*, *luhpi waitna*, *tuktan mairin*, *tuktan
waitna*, *smasmalkra mairin*, *aisa almuk*, *mama almuk*, *papa almuk*. Lo que
describe al verbo va antes: *yamni yaps* (un ejemplo).

### O4 · Lo que dice «de qué» o «de quién» va antes — Confianza B

**Evidencia.** *skul watla* (la casa de la escuela), *skul tuktan* (niño de
escuela: estudiante) y, de Tangni, *galila mabra* (gallina huevo: huevo de
gallina). Es como en inglés *school house*.

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

### O9 · El número va antes del sustantivo, y el sustantivo no cambia — Confianza C

**Evidencia.** *18 mani brisna*, «18 año tengo». Un solo ejemplo, y escrito con
cifras.

**Predicción.** «Dos perros» será *wal yul* o *yul wal*: hay que preguntarlo.

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

**Para Piko.** Es un puente entre las lecciones de inglés y las de miskito:
*skul*, *buk*, *rais*, *bins*, *bret* ya están a medio camino de *school*,
*book*, *rice*, *beans*, *bread*.

### L2 · El género se agrega con waitna y mairin — Confianza A

**Evidencia.** *smasmalkra* es maestro o maestra; *tuktan*, niño o niña. Hijo
es *luhpi waitna*; hija, *luhpi mairin*. Y Tangni, a «niño o niña», contestó
*tuktan mairin* y *tuktan waitna*: niña y niño.

**Predicción acertada.** La niña = *tuktan mairin*.

### L3 · Dos palabras para «niño»: luhpi y tuktan — Confianza B

*luhpi* es hijo o hija (la relación); *tuktan*, niño o niña (la edad). Tangni
usa *tuktan* también para «bebé».

### L4 · «Mañana»: titan y yauhka — Confianza C (bajó desde B)

Teacher Smith: *titan yamni* (buenos días) y *yauhka kat* (hasta mañana, el día
siguiente). Tangni: *titan yamni* también, pero «hasta mañana» es *titan
pruabia*. Si *titan* sirve para las dos cosas, la distinción de la versión 0.1
no se sostiene. Hay que preguntar qué es *pruabia*.

### L5 · Una palabra, dos sentidos: li — Confianza A

*li* es agua y lluvia. *Li want* / *Lii want* (quiero agua), *Li auhwisa* /
*Lii ahwisa* (está lloviendo) y, para la palabra «lluvia», *li ausisa*: «el
agua cae». Es la manera de decirlo en las dos personas.

### L6 · ¿Verde y azul son un mismo color? — Confianza C

Para azul se dio *sangni* y para verde, una descripción (*twi maplalka*).
Tangni no contestó los colores: sigue abierta.

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

### L9 · En la familia se nombra con dueño — Confianza B

**Evidencia.** A «mamá», «papá» y «hermana», Tangni contestó *mamiki* (mi
mamá), *papiki* (mi papá) y *muiki* (mi hermana). Teacher Smith, en las
frases, dice *yaptiki* y *kuki ki*. En muchas lenguas las palabras de
parentesco se dicen casi siempre con su dueño.

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
- **-kra** en *nakra* (ojo), *laikra*, *yaikra*, *smasmalkra*: no tienen un
  significado en común.
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
| 1 | nombre | *nina* | M4 |
| 2 | tu mamá · su mamá | *yaptikam* o *mamikam* · *yaptika* | M4 |
| 3 | mi casa · tu casa | *uitla* · *umtla* | M5 |
| 4 | yo como · vos comés | *pisna* · *pisma* | M2 |
| 5 | yo duermo · él duerme | *yapisna* · *yapisa* | M2 (la i) |
| 6 | Estás en la casa | *utla ra sma* | M3 |
| 7 | reír · vivir · hacer · tener · entrar | *kikaya* · *iwaya* · *daukaya* · *briaya* · *dimaya* | M1 |
| 8 | enseñar | *smalkaya* | M10 |
| 9 | ¡Dormí! · ¡Mirá! · ¡Vení! | *yaps* · *kaiks* · ¿*bal*? | M8, M1 |
| 10 | el maestro (hombre) · hombre · mujer | *smasmalkra waitna* · *waitna* · *mairin* | L2 |
| 11 | Ana es maestra | *Ana smasmalkra* (sin verbo) | O6 |
| 12 | once (en los dos sistemas) | *mata walsip pura kum* · *matsip pura matsip pura kum*? | N3 |
| 13 | un perro · dos perros | *yul kum* · ? | N2, O9 |
| 14 | ¿Tenés hambre? | *Plun mai dauksa?* | M11 |
| 15 | mi coco · tu coco · su coco | — | M4, M11 |
| 16 | dinero u oro | *lalah* | M9 |
| 17 | zacate · ¿verde y azul son el mismo color? | *twi* · — | L6 |
| 18 | **Hermano y hermana, a una mujer y a un hombre** | — | L7 |
| 19 | **¿Qué es *pruabia*? ¿*titan* es también «el día siguiente»?** | — | L4 |
| 20 | **¿Qué sistema de números se enseña en la escuela?** | — | N3 |
| 21 | ¿*yapti* o *mama*? ¿Cuándo se usa cada una? | — | L8 |
| 22 | ¿Qué es *kaya* en «Kaya skul ra»? | — | O1 |
| 23 | Mi abuela sonríe cuando yo veo su coco | — (¿cambia *kaiki*?) | M6 |
| 24 | los niños | *tuktan nani* (según otras fuentes) | O8 |
| 25 | No quiero agua · No como | — | la negación: no hay datos |
| 26 | Ayer comí · Mañana voy a comer | — | el pasado y el futuro: no hay datos |

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
