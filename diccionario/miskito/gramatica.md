# Miskito: patrones y reglas

> **Versión 0.1** · 29 de septiembre de 2026 · primera tanda de datos

**De dónde sale.** De una sola persona: Teacher Smith, docente y hablante
materna, de Raiti (Río Coco). En la encuesta *Tu lengua en Piko* escribió 80
palabras, 15 frases y una oración libre, que suman 124 palabras miskitas
distintas. Todo está en [`corpus.csv`](corpus.csv) tal cual lo escribió.

**Cómo se hizo.** Con el método de [`../metodologia.md`](../metodologia.md). Un
modelo de razonamiento buscó regularidades en el corpus. Cada una se contrastó
contra todos los ejemplos, y también contra lo publicado sobre el miskito
cuando existe. Quedó escrita con su evidencia, su nivel de confianza y una
predicción que la próxima tanda puede confirmar o echar abajo.

| Confianza | Qué significa | Para qué sirve |
|---|---|---|
| **A** · sólida | 3 ejemplos o más en el corpus y ningún contraejemplo | Puede guiar ejercicios, una vez validada |
| **B** · probable | 2 ejemplos, o más con alguna excepción explicada | Guía con cuidado; falta confirmarla |
| **C** · hipótesis | 1 ejemplo o una inferencia | Sólo sirve para decidir qué preguntar. Nunca se enseña |

Con un solo hablante, **ninguna regla está validada todavía**. Una A quiere
decir que el corpus la sostiene bien, no que la comunidad la haya confirmado.
Estas reglas describen el miskito de Raiti tal como lo escribió una persona.
Otra comunidad puede decirlo distinto, y las dos formas valen.

**Glosas** (Reglas de Leipzig): `1`, `2`, `3` = persona · `POSS` = poseedor ·
`PRS` = presente · `INF` = infinitivo · `CVB` = converbo («haciendo…») ·
`IMP` = orden · `LOC` = lugar («a», «en») · `CSTR` = forma con dueño ·
`(?)` = significado todavía hipotético.

---

## Lo principal, en diez líneas

1. **Tres vocales: a, i, u.** Ninguna palabra miskita del corpus lleva e ni o. (S1)
2. **El verbo va al final.** «Yul pisa» es *perro come*. (O1)
3. **«A la casa» se dice «casa a».** «utla ra». Usa posposiciones, no preposiciones. (O2)
4. **La persona va pegada al verbo:** -sna es yo, -sma es vos, -sa es él o ella. Por eso «yo» se puede omitir. (M2, O5)
5. **«Estar» no tiene raíz:** es sólo la terminación, *sna*, *sma*, *sa*. (M3)
6. **«Mi» y «tu» se pegan al sustantivo:** yapti → yaptiki; nini / ninam. (M4)
7. **Los verbos se citan en -aya:** piyaya, yapaya, kaikaya. (M1)
8. **Cinco es «una mano completa» y diez, «dos manos».** Del 7 al 9 se cuenta desde el seis. (N1)
9. **El inglés dejó huella:** skul, buk, sus, dur, bibi… siempre ajustadas a las tres vocales. (L1)
10. **Las palabras no tienen género.** Cuando hace falta, se agrega *waitna* (hombre) o *mairin* (mujer). (L2)

---

## Sonidos y escritura

### S1 · Tres vocales: a, i, u — Confianza A

**Regla.** Las palabras miskitas usan sólo tres vocales: a, i, u.

**Evidencia.** Ninguna de las 124 palabras distintas del corpus tiene e ni o.
Las dos únicas «o» son la conjunción española de «dama o Aisa almuk». Las
palabras que vienen del inglés se acomodan a esas tres: *baby* → bibi,
*story* → stury, *door* → dur, *shoes* → sus, *please* → plis, *book* → buk.
Lo mismo pasa con el nombre de la lengua: en español es «miskito» y en
miskito, **Miskitu**. Coincide con las descripciones publicadas.

**Predicción.** Cualquier palabra nueva tendrá sólo a, i, u. Si aparece una e o
una o, será un préstamo reciente o una variante que vale la pena preguntar.

**Para Piko.** Al evaluar pronunciación, el robot no debe castigar una i que
suena a [e] ni una u que suena a [o]. En miskito esa diferencia no distingue
palabras, y un niño que también habla español las va a producir.

### S2 · La y final suena i — Confianza B

**Evidencia.** *aisaby* (adiós), *stury* (palabra), *duary* (canoa). En el
resto de las palabras la y es consonante: *yapti*, *yang*, *yul*, *piyaya*.

**Para Piko.** Al comparar respuestas de distintas personas, *aisaby* y
*aisabi* tienen que contar como la misma palabra.

### S3 · La h antes de una consonante es parte de la palabra — Confianza A

**Evidencia.** La h aparece antes de consonante en 11 palabras: nahkisma,
tahti, luhpi, mihta, pihni, lalahni, yauhka, wauhtaya, auhwisa, matlalkahbi y
yumhpa. Y la misma persona escribe ese sonido de maneras distintas: «yumgpa» y
«yumpha» (tres), «matlalkahgbi» y «matlal kahbi» (seis), «walg walg» (cuatro).
En esa posición, **g, h, hg y gh son lo mismo**. Es la marca de alguien que
busca cómo escribir un sonido que la ortografía del español no tiene.

**Hipótesis (C).** Sería una aspiración o un soplo antes de la consonante.
Sólo el audio lo puede decir.

**Para Piko.**
- Al normalizar, la h nunca se borra.
- Hoy la pestaña *Palabras* del panel de encuestas toma «yumgpa» y «yumhpa»
  como palabras distintas. Para el miskito convendría agruparlas.
- Es exactamente el tipo de sonido que el robot necesita aprender de
  grabaciones de hablantes, no de texto.

### S4 · ng es un solo sonido — Confianza B

**Evidencia.** *tingki*, *ingk*, *sangni*. Es el sonido de *tengo* o del
inglés *sing*. En la frase «Gracias, amigo» la misma persona escribió
«Tignki», con las letras invertidas: pasa seguido cuando un solo sonido se
escribe con dos letras.

### S5 · La ch de «matchip» es t + s — Confianza B

**Evidencia.** Cinco se escribió «matchip»; diez, «mata wal sip». Las dos
palabras comparten *mat(a)* y *sip*. Cinco es *mat + sip*, y cuando la t se
junta con la s suena parecido a ch. Los materiales publicados escriben
*matsip*.

**Predicción.** Otros encuentros de t + s también van a sonar como ch.

### S6 · Dónde termina una palabra todavía no está fijo — Confianza A

**Evidencia.** La misma persona escribe separado «Kuki ki» y junto «Yaptiki»,
con la misma terminación *-ki*. Junto «matlalkahgbi» y separado «Matlal
kahbi». Junto «aidauksa» y separado «ai kuku ka». No son errores: la escritura
escolar del miskito es relativamente reciente y todavía varía.

**Para Piko.** Los ejercicios de ordenar bloques cortan la frase por los
espacios, así que dónde termina una palabra cambia el ejercicio. Por ahora se
respeta cómo lo escribió la persona en las frases, y los números van juntos
(*matlalkahbi*, *walhwal*), como en los materiales publicados. Hay que
preguntar a docentes de educación bilingüe qué convención usan en la escuela.

---

## Palabras: cómo se forman

### M1 · Los verbos se citan terminados en -aya — Confianza A

**Evidencia.** Doce verbos: piyaya, diyaya, yapaya, wapaya, aisaya, walaya,
kaikaya, aiwanaya, pulaya, ulbaya, y *takaya* dentro de *lan takaya* y *wark
takaya*. Si se quita el -aya queda la raíz: *pi-*, *di-*, *yap-*, *wap-*,
*ais-*, *wal-*, *kaik-*, *aiwan-*, *pul-*, *ulb-*, *tak-*. Cuando la raíz
termina en i aparece una y de puente: *pi-y-aya*, *di-y-aya*.

Otras fuentes escriben -aia (*piaia*, *yapaia*). Es la misma terminación con
otra ortografía.

**Excepciones.** Para «ir» y «venir» se dio la raíz sola: *wap* y *bal*.
*wauhtaya* (cuaderno) termina en -aya pero es sustantivo. Podría venir de un
verbo (C).

**Predicción.** Venir es *balaya*. Y de los verbos conjugados de las frases
salen infinitivos que nadie escribió todavía: *kikisa* → *kikaya* (reír),
*iwisma* → *iwaya* (vivir), *dauksa* → *daukaya* (hacer), *auhwisa* →
*auhwaya* (caer).

### M2 · El presente es raíz + s + persona — Confianza B

| Persona | Terminación | En el corpus |
|---|---|---|
| yo | -sna | *laik-sna* (me gusta), *sna* (estoy) |
| vos | -sma, -isma | *nahki-sma* (¿cómo estás?), *iw-isma* (vivís) |
| él, ella | -sa, -isa | *pi-sa* (come), *dauk-sa* (hace), *auhw-isa* (cae), *kik-isa* (sonríe), *sa* (está) |

Detrás de la s va la persona: **-na** yo, **-ma** vos, **-a** él o ella. La
tercera persona tiene cinco ejemplos (A). Las otras dos, dos cada una (B).

```
Yul   pi-sa.            Inska    laik-sna.       Ani-ra     iw-isma?
perro comer-PRS.3       pescado  «like»-PRS.1    cuál(?)-LOC vivir-PRS.2
'El perro come.'        'Me gusta el pescado.'   '¿Dónde vivís?'
```

**Queda abierto** cuándo aparece la i antes de la s. Con *pi-sa* se entiende,
porque la raíz ya termina en vocal. Pero *auhw-isa*, *kik-isa* e *iw-isma* la
llevan, y *laik-sna* y *dauk-sa* no. Puede ser habla rápida, escritura rápida
o una regla real. Otras fuentes escriben *daukisa*.

**Predicción.** «Yo como» es *pisna*; «vos comés», *pisma*. «Yo duermo»,
*yapisna*; «él duerme», *yapisa*.

### M3 · «Estar» no tiene raíz: sna, sma, sa — Confianza B

**Evidencia.** «Pain sna» (estoy bien), «Yaptiki utla ra sa» (mi mamá está en
la casa), «nahki-sma» (¿cómo estás?). El verbo es sólo la terminación de M2.

```
Yapti-ki    utla  ra   sa.         Pain  sna.
mamá-1POSS  casa  LOC  PRS.3       bien  PRS.1
'Mi mamá está en la casa.'         'Estoy bien.'
```

**Para Piko.** Enseñar *sna / sma / sa* es enseñar «estar» y, a la vez, las
terminaciones de todos los verbos.

**Predicción.** «Estás en la casa» es *utla ra sma*; «estoy en la escuela»,
*skul ra sna*.

### M4 · «Mi» y «tu» se pegan al sustantivo — Confianza A (mi), B (tu), C (su)

|  | mi | tu | su |
|---|---|---|---|
| nombre | *nin-i* | *nin-am* | — |
| mamá (*yapti*) | *yapti-ki* | — | — |
| abuela (*kuka*) | *kuk-i ki* | — | — |
| coco (*kuku*) | — | — | *ai kuku ka* |

- **Mi** termina en i, a veces seguida de *ki*: *nini*, *yaptiki*, *kuki ki*.
  En *kuka* → *kuki ki* la a final se vuelve i y además se agrega *ki*.
- **Tu** lleva m: *ninam*.
- **Su** va entre *ai* y *ka*. Hay un solo ejemplo.

La m de «vos» es la misma que la de los verbos (-sma, M2). Dos partes
distintas de la gramática usan la misma letra para la misma persona (B).

```
Yang  nin-i          Ana.        Nin-am         dia?
yo    nombre-1POSS   Ana         nombre-2POSS   qué
'Me llamo Ana.' (yo, mi nombre Ana)   '¿Cómo te llamás?' (¿tu nombre qué?)
```

**Predicciones (C).** Nombre, *nina*. Tu mamá, *yaptikam* o *yaptim*. Su
mamá, *yaptika*. Mi papá, *aisiki*: la a final se vuelve i y se agrega *ki*,
igual que en *kuka* → *kuki ki*.

### M5 · «utla» cambia cuando la casa tiene dueño: watla — Confianza B

**Evidencia.** *utla* es la casa sola, también en «utla ra sa» (está en la
casa). En *skul watla* (escuela, «la casa de la escuela») la u inicial se
vuelve *wa*. Las gramáticas publicadas describen esta forma del sustantivo
cuando tiene poseedor.

**Predicción (C).** Mi casa, *uitla*; tu casa, *umtla*. Serían las marcas de
M4 metidas dentro de la palabra.

**Para Piko.** El ejercicio «escuela» de `escuela-1` ofrece *utla* como
distractor junto a *watla*.

### M6 · Un verbo terminado en -i acompaña a otro — Confianza B

**Evidencia.** *aisi kaikaya* (leer) es *ais-i* «hablando» + *kaikaya* «ver»:
«ver hablando». En la oración libre, *kaiki kikisa* es *kaik-i* «viendo» +
*kikisa* «sonríe». Son dos ejemplos independientes, y los dos ponen la raíz + i
antes del verbo principal.

```
Kuk-i        ki,     ai     kuku  ka      kaik-i   kik-isa.
abuela-1POSS 1POSS   ai(?)  coco  3POSS   ver-CVB  reír-PRS.3
'Mi abuela sonríe al ver su coco.'
```

La literatura describe cadenas de verbos así en las lenguas misumalpas
(Hale 1991). Falta saber si la forma cambia cuando el que ve y el que sonríe
son personas distintas.

### M7 · Verbos nuevos con «takaya» — Confianza B

**Evidencia.** *lan takaya* (aprender, del inglés *learn*) y *wark takaya*
(trabajar, de *work*). *takaya* es un verbo en -aya que convierte en verbo una
palabra prestada, como en español «hacer» en «hacer clic». Hay otras dos
maneras de adoptar un verbo inglés: pegarle la terminación directamente
(*laik-sna*) o dejarlo sin nada (*Li want*).

**Pregunta.** ¿Qué quiere decir *takaya* solo? ¿«Volverse», «hacerse»?

### M8 · Una orden es raíz + s — Confianza C

**Evidencia.** *Yamni yap-s* (buenas noches): «dormí bien», de *yap-aya*
(dormir). Hay un solo ejemplo.

**Predicción.** «¡Dormí!» es *yaps*; «¡Mirá!», *kaiks*.

### M9 · Los colores y «bueno» terminan en -ni — Confianza B

**Evidencia.** *yamni* (bueno, bien), *pauni* (rojo), *pihni* (blanco),
*lalahni* (amarillo), *sangni* (azul). La excepción es *siksa* (negro).
*tutni* (tarde) es un sustantivo, y probablemente no tiene que ver.

**Hipótesis (C).** -ni forma palabras de cualidad. *lalahni* vendría de
*lalah*, que en otras fuentes es oro o dinero: «del color del oro».

**Predicción.** Dinero u oro es *lalah*.

### M10 · Repetir para formar palabras — Confianza C

**Evidencia.** *krikri* (cama), *walhwal* (cuatro, «dos-dos»), *smasmalkra*
(maestro: *sma-smal-kra*).

**Predicción.** Si *smasmalkra* viene de un verbo «enseñar», ese verbo tendrá
*smalk-*: *smalkaya*.

### M11 · «ai», una pieza que todavía no entendemos — Confianza C

**Evidencia.** Aparece en dos lugares. En *ai kuku ka* (su coco) es tercera
persona, junto con *ka*. En *Plun aidauksa* (tengo hambre, algo como «la
comida me hace») hace de primera persona.

**Dos hipótesis.**
1. *ai* es un pronombre que no es de segunda persona: vale «me» o «su» según la
   frase. La segunda sería otra palabra (*mai*, en otras fuentes).
2. Son dos palabras distintas que suenan igual.

**Cómo decidir.** Preguntar «¿Tenés hambre?». Si la respuesta es *Plun mai
dauksa*, gana la primera. Y pedir «mi coco», «tu coco» y «su coco».

---

## Frases: el orden

### O1 · El verbo va al final — Confianza A

**Evidencia.** Las 8 frases que tienen verbo terminan en él: *Yul pisa*,
*Inska laiksna*, *Li want*, *Li auhwisa*, *Anira iwisma*, *Yaptiki utla ra
sa*, *Skul ra wapp* y *Kuki ki, ai kuku ka kaiki kikisa*. El orden es sujeto –
objeto – verbo: *Inska laiksna* es «pescado me-gusta»; *Li want*, «agua
quiero». Coincide con las descripciones publicadas.

**Para Piko.** Los ejercicios de bloques lo enseñan sin decirlo, porque el
verbo siempre va último. El maestro puede reforzarlo con una frase: «en
miskito, el verbo espera al final».

### O2 · Posposiciones: «casa a», no «a casa» — Confianza A

**Evidencia.**
- *ra* (a, en): *utla ra* (en la casa), *skul ra* (a la escuela), *ani-ra* (¿dónde?).
- *kat* (hasta): *yauhka kat* (hasta mañana).
- *pura* (más, encima): *matlalkahbi pura kum* (seis más uno).

Son tres palabras distintas y todas van después. Encaja con O1: las lenguas
con el verbo al final suelen tener posposiciones.

**Nota.** *ra* sirve para el lugar donde se está («está en la casa») y para
el lugar adonde se va («vamos a la escuela»).

### O3 · Lo que describe al sustantivo va después; lo que describe al verbo, antes — Confianza B

**Evidencia.** Después del sustantivo hay siete ejemplos: *titan yamni*
(mañana buena), *tutni yamni*, *luhpi waitna*, *luhpi mairin*, *smasmalkra
mairin*, *aisa almuk*, *mama almuk*. Antes del verbo, uno solo: *yamni yaps*
(bien dormí). La misma palabra, *yamni*, sirve para «bueno» y para «bien».

### O4 · Lo que dice «de qué» o «de quién» va antes — Confianza B

**Evidencia.** *skul watla* (escuela casa: la casa de la escuela), *skul
tuktan* (escuela niño: estudiante). Es como en inglés *school house*.

**Regla combinada con O3.** El poseedor va antes; la cualidad y el género, después.

### O5 · «Yo» y «vos» se pueden omitir — Confianza A

**Evidencia.** *Pain sna*, *Inska laiksna*, *Anira iwisma*, *Nahkisma*. La
terminación del verbo ya dice quién. *Yang* (yo) aparece sólo en *Yang nini
Ana*, quizá para dar énfasis. Es como en español: «estoy bien», sin «yo».

### O6 · Para decir quién o qué es algo, no hace falta verbo — Confianza B

**Evidencia.** *Yang nini Ana* (yo, mi nombre, Ana) y *Ninam dia?* (¿tu
nombre qué?) no tienen verbo. Para decir dónde o cómo está alguien, en
cambio, aparece «estar»: *Yaptiki utla ra sa*, *Pain sna*.

**Predicción.** «Ana es maestra» será sin verbo: *Ana smasmalkra*.

### O7 · Las preguntas no cambian el orden — Confianza B

**Evidencia.** *Ninam dia?* (¿tu nombre qué?), *Anira iwisma?* (¿dónde
vivís?), *Nahkisma?* (¿cómo estás?). La palabra de pregunta ocupa el lugar
donde irá la respuesta: *Yang nini **Ana*** ↔ *Ninam **dia***.

Palabras de pregunta: *dia* (qué), *anira* (dónde: *ani* + *ra*, «en cuál»),
*nahki* (cómo, dentro de *nahkisma*).

### O8 · No hay «el» ni «la» — Confianza B

**Evidencia.** En cuatro frases el español usa artículo y el miskito no: *Yul
pisa* (el perro come), *Inska laiksna* (me gusta el pescado), *utla ra* (en
la casa), *skul ra* (a la escuela). Otras fuentes mencionan *ba* («ese», «el»)
y *kum* («un») en algunos contextos, y *nani* para el plural, que en el corpus
no aparece.

---

## Vocabulario

### L1 · El inglés dejó muchas palabras — Confianza A

| Inglés | Miskito | Qué cambió |
|---|---|---|
| please, do | plis, du | |
| school, book | skul, buk | oo → u |
| shoes | sus | sh → s, oo → u |
| door | dur | o → u |
| baby | bibi | ei → i |
| aunty | anti | |
| story | stury | o → u |
| ink (tinta) | ingk (lápiz) | cambió el significado |
| work, learn | wark, lan | la vocal de *er* → a, se pierde la r |
| like, want | laik, want | |
| fine | pain (bien) | f → p: no hay f (C) |
| dory (bote) | duary (canoa) | (B) |
| thank (ye) | tingki | (C) |

**Regularidades.**
- Las vocales se ajustan a tres (S1).
- La vocal inglesa de *work* y *learn* se vuelve a (B).
- La r final se pierde, como en el inglés criollo de la Costa (B).
- La f se vuelve p (C).

**Dónde se concentran.** La escuela es el campo con más préstamos: 6 de 10
palabras (*skul watla*, *skul tuktan*, *buk*, *ingk*, *stury*, *lan
takaya*). El cuerpo, los números y los colores no tienen ninguno. El
vocabulario básico resiste los préstamos, y el de la escuela llegó con la
escuela.

Del español, apenas *ispara* (machete), quizá de «espada» (C).

**Para Piko.** Es un puente entre las lecciones de inglés y las de miskito de
la misma app. Un niño que sabe *skul*, *buk*, *dur* y *sus* ya tiene el camino
hecho hacia *school*, *book*, *door* y *shoes*.

### L2 · El género se agrega con waitna y mairin — Confianza A

**Evidencia.** *smasmalkra* es maestro o maestra; *tuktan*, niño o niña. Hijo
es *luhpi waitna*; hija, *luhpi mairin*; maestra, *smasmalkra mairin*. Las
palabras no tienen género, y cuando hace falta se agrega después *waitna*
(hombre) o *mairin* (mujer).

**Predicción.** Maestro, *smasmalkra waitna*. Niña, *tuktan mairin*. Hombre,
*waitna*. Mujer, *mairin*.

### L3 · Dos palabras para «niño»: luhpi y tuktan — Confianza B

*luhpi* es hijo o hija: la relación, el hijo de alguien. *tuktan* es niño o
niña: la edad. «Estudiante» es *skul tuktan*, niño de escuela, no hijo de
nadie. El español hace la misma distinción (hijo / niño); el inglés *child*
las mezcla.

### L4 · Dos palabras para «mañana»: titan y yauhka — Confianza B

*titan* es la mañana, parte del día (*titan yamni*). *yauhka* es mañana, el
día siguiente (*yauhka kat*). El español usa una sola palabra.

**Para Piko.** El ejercicio «Hasta mañana» de `saludos-1` ofrece *titan* como
distractor. Y en la encuesta, «mañana» a secas es ambiguo: conviene
preguntarlo especificando.

### L5 · Una palabra, dos sentidos — Confianza B

*li* es agua y lluvia: *Li want* (quiero agua), *Li auhwisa* (está
lloviendo, «el agua cae»). *bila* es boca, y en otras fuentes también
«idioma» (*Miskitu bila*). Esto último es C.

### L6 · ¿Verde y azul son un mismo color? — Confianza C

Para azul se dio *sangni*. Para verde, una descripción, *twi maplalka*, quizá
«del color del zacate». Muchas lenguas del mundo tienen una sola palabra para
verde y azul. Si *sangni* las cubre a las dos, describir el verde era la
manera de separarlos.

### L7 · ¿Hermano y hermana dependen de quién habla? — Confianza C

*muih* (hermano), *laikra* (hermana). En muchas lenguas la palabra cambia
según si los hermanos son del mismo sexo o no. Hay que preguntarle a una
mujer y a un hombre cómo le dicen a su hermana.

### L8 · Dos palabras para «mamá»: yapti y mama — Confianza B

Para «mamá» se dio *yapti* (y *yaptiki*, mi mamá). Pero abuela es *mama
almuk*, «mamá vieja». ¿*mama* es para llamarla y *yapti* para hablar de ella?

---

## Los números

### N1 · Cinco es una mano; del 7 al 9 se cuenta desde el seis — Confianza A

| | Registrado | Forma de trabajo | Cómo se arma |
|---|---|---|---|
| 1 | kumi | kumi | |
| 2 | wal | wal | |
| 3 | yumgpa | yumhpa | |
| 4 | walg walg | walhwal | dos y dos |
| 5 | matchip | matsip | *mat(a)* «mano» + *sip* «completa» (?) |
| 6 | matlalkahgbi | matlalkahbi | una base nueva, que empieza con *mat-* |
| 7 | matlalkahgbi pura kum | matlalkahbi pura kum | seis + uno |
| 8 | Matlal kahbi pura wal | matlalkahbi pura wal | seis + dos |
| 9 | matlal kahbi pura yumpha | matlalkahbi pura yumhpa | seis + tres |
| 10 | mata wal sip | mata walsip | manos · dos · completas |

Es un sistema que cuenta con el cuerpo: la mano da el cinco y el diez, el
cuatro repite el dos, y del 7 al 9 se suma al seis con *pura*. Las formas de
trabajo coinciden con las publicadas.

**Predicción.** Once es *mata walsip pura kum* (diez + uno).

**Para Piko.** `numeros-2` enseña la regla y no la lista. Un niño que entiende
«seis *pura* uno» arma el 7, el 8 y el 9 sin memorizarlos.

### N2 · kumi sola, kum dentro — Confianza B

Uno es *kumi*, pero en siete dice *pura kum*. *kum* sería la forma que se usa
dentro de otra palabra o antes de un sustantivo. En otras fuentes es «un,
una»: *yul kum*, un perro.

---

## Lo que parece patrón y no lo es (todavía)

Se dejan escritas para que nadie las «descubra» después sin evidencia:

- **-ti** en *yapti* y *tahti* (mamá, tío). Son dos palabras y nada más; puede
  ser casualidad.
- **-kra** en *nakra* (ojo), *laikra* (hermana), *smasmalkra* (maestro). No
  tienen un significado en común.
- **wal** (dos) y **walaya** (escuchar). Suenan igual, pero nada indica que
  estén relacionadas.
- **lal** (cabeza) dentro de *matlalkahbi* (seis) y *lalahni* (amarillo).
  Tienta, pero nada lo sostiene.

---

## Qué preguntar en la próxima tanda

Cada fila es una predicción. Lo que se acierte sube de confianza, y lo que se
falle es lo que más enseña: la regla estaba mal o incompleta.

| # | Preguntar | Esperamos | Pone a prueba |
|---|---|---|---|
| 1 | nombre | *nina* | M4 |
| 2 | tu mamá | *yaptikam* o *yaptim* | M4 |
| 3 | su mamá (de ella) | *yaptika* | M4 |
| 4 | mi papá | *aisiki* | M4 |
| 5 | mi casa · tu casa | *uitla* · *umtla* | M5 |
| 6 | yo como · vos comés | *pisna* · *pisma* | M2 |
| 7 | yo duermo · él duerme | *yapisna* · *yapisa* | M2 (¿lleva i?) |
| 8 | Estás en la casa | *utla ra sma* | M3 |
| 9 | venir | *balaya* | M1 |
| 10 | reír · vivir · hacer | *kikaya* · *iwaya* · *daukaya* | M1, M2 |
| 11 | enseñar | *smalkaya* | M10 |
| 12 | ¡Dormí! · ¡Mirá! | *yaps* · *kaiks* | M8 |
| 13 | el maestro (hombre) · la niña | *smasmalkra waitna* · *tuktan mairin* | L2 |
| 14 | hombre · mujer | *waitna* · *mairin* | L2 |
| 15 | Ana es maestra | *Ana smasmalkra* (sin verbo) | O6 |
| 16 | once | *mata walsip pura kum* | N1 |
| 17 | un perro | *yul kum* | N2 |
| 18 | ¿Tenés hambre? | *Plun mai dauksa?* | M11 |
| 19 | mi coco · tu coco · su coco | — | M4, M11 |
| 20 | dinero u oro | *lalah* | M9 |
| 21 | zacate · ¿verde y azul son el mismo color? | *twi* · — | L6 |
| 22 | hermana, dicho por una mujer · dicho por un hombre | — | L7 |
| 23 | Mi abuela sonríe cuando yo veo su coco | — (¿cambia *kaiki*?) | M6 |
| 24 | los niños | *tuktan nani* (según otras fuentes) | O8 |
| 25 | No quiero agua · No como | — | la negación: no hay datos |
| 26 | Ayer comí · Mañana voy a comer | — | el pasado y el futuro: no hay datos |

Además:
- **Las 40 palabras que faltan** de la encuesta: animales, comida y naturaleza.
  De las frases ya salieron *yul* (perro), *inska* (pescado), *li* (agua,
  lluvia) y *kuku* (coco).
- **Las 10 entradas marcadas «revisar»** en [`lexico.json`](lexico.json).
  Entre ellas, *bara* (hola: otras fuentes dicen *naksa*), *stury*
  (¿palabra o cuento?), *wapp* y los infinitivos de ir y venir.
- **Grabaciones.** Teacher Smith se ofreció a revisar y a grabar su voz. Es la
  primera persona a quien acudir para validar esta versión.

---

## Referencias

La bibliografía está en [`../metodologia.md`](../metodologia.md#referencias).
Donde acá dice «coincide con las descripciones publicadas», la comparación la
hizo el modelo con lo que sabe de la literatura sobre el miskito (Heath y Marx
1953; Salamanca 1988; Hale 1991). Es un contraste de apoyo, no una cita
textual. Antes de tratarlo como confirmado, conviene revisarlo contra las
obras mismas.
