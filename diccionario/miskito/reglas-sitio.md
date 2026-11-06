# Reglas del miskito: el texto del sitio

Este archivo es el texto que muestra piko.mugiware.com/reglas. La evidencia,
las fuentes de cada dato, las predicciones y lo que falta comprobar están en
[`gramatica.md`](gramatica.md); acá cada regla se explica en tono formal, sin
nombrar a las personas que contestaron las encuestas («según datos
proporcionados por hablantes») y sin la historia del trabajo.

`npm run contenido` publica una regla sólo si en `gramatica.md` tiene
confianza A, y toma de allí la sección. Si una regla baja de confianza, sale
del sitio sola. `npm run validate:diccionario` avisa si una regla de este
archivo no existe en `gramatica.md` o no tiene confianza A.

Cada regla: `### CÓDIGO · Título`, un primer párrafo que se ve siempre y, si
hace falta, lo demás, que se muestra al abrir la tarjeta.

---

### S1 · Tres vocales: a, i, u

Las palabras propias del miskito usan sólo tres vocales: *a*, *i* y *u*. La e
y la o aparecen únicamente en palabras tomadas de otras lenguas.

Según datos proporcionados por hablantes, de más de doscientas palabras
registradas, sólo tres préstamos llevan e u o: *bret* (pan, del inglés
*bread*), *coco* y *maistro* (del español). Los demás préstamos se adaptan a
las tres vocales:

| Origen | Miskito |
|---|---|
| inglés *baby* | *bibi* |
| inglés *door* | *dur* |
| inglés *shoes* | *sus* |
| español *café* | *cafi* |
| español *plátano* | *platu* |

El nombre mismo de la lengua sigue la regla: en miskito es *Miskitu*.

### S3 · La h junto a una consonante cambia de lugar al escribirse

Muchas palabras llevan una h junto a una consonante: *mihta* (mano), *luhpi*
(hijo), *pihni* (blanco), *yauhka* (mañana). Al escribirlas, la h puede ir
antes o después de la consonante, o escribirse con otra letra.

En los datos proporcionados por hablantes aparecen pares como estos, que
corresponden a la misma palabra:

| Una escritura | Otra escritura |
|---|---|
| *mihta* | *mitha* |
| *luhpi* | *lupha* |
| *auhwisa* | *ahwisa* |
| *nahkisma* | *naki sma* |
| *walg walg* | *walhwal* |

Se trata de un sonido que la ortografía del español no tiene, y cada quien lo
escribe como mejor lo representa. El diccionario de Matamoros (1996) registra
el mismo fenómeno: *tahbaia* (bañar) y *aihtabaia* (bañarse).

### S5 · La ch de «matchip» se escribe ts

Lo que en algunas escrituras aparece como ch es en realidad una t seguida de
una s. «Cinco» se registró como *matchip* y como *matsip*; esta segunda forma
muestra sus partes: *mat* (mano) y *sip* (completa).

### S6 · La separación de las palabras al escribir no está fijada

Una misma expresión se escribe a veces junta y a veces separada, sin que
cambie su significado.

| Separada | Junta |
|---|---|
| *utla ra* | *utlara* (en la casa) |
| *naki sma* | *nahkisma* (¿cómo estás?) |

Ninguna de las dos formas es un error; ambas aparecen en los datos
proporcionados por hablantes.

### S8 · La vocal larga distingue palabras

Una vocal puede ser corta o larga, y esa diferencia cambia el significado.
Algunas escrituras la marcan con circunflejo (*î*, *â*) y otras duplicando la
vocal (*ii*).

El diccionario de Matamoros (1996) registra un par que se distingue sólo por
la longitud de la vocal:

| Vocal corta | Vocal larga |
|---|---|
| *kati*, luna | *kâti*, mes |

«Agua» se registró como *li*, como *lii* y, en la obra publicada, como *lî*:
las tres escrituras indican la misma i larga.

### M1 · Los verbos se nombran con la terminación -aya

La forma con la que se nombra un verbo, equivalente al infinitivo del español,
termina en *-aya*. Las obras publicadas la escriben *-aia*: es la misma
terminación con otra ortografía.

| Verbo | Significado | Raíz |
|---|---|---|
| *piyaya* | comer | *pi-* |
| *yapaya* | dormir | *yap-* |
| *kaikaya* | ver | *kaik-* |
| *balaya* | venir | *bal-* |
| *smalkaia* | enseñar | *smalk-* |

Cuando la raíz termina en i, aparece una y entre la raíz y la terminación:
*pi-y-aya*.

### M2 · El presente: raíz + s + persona

El verbo en presente se forma con la raíz, una s y una terminación que indica
la persona.

| Persona | Terminación | Ejemplos |
|---|---|---|
| yo | *-sna*, *-isna* | *brisna* (tengo), *dimisna* (entro) |
| tú, vos | *-sma*, *-isma* | *iwisma* (vives) |
| él, ella | *-sa*, *-isa* | *pisa* (come), *kikisa* (sonríe) |

Si la raíz termina en vocal, la terminación va directamente (*pi-sa*); si
termina en consonante, se agrega una i (*kik-isa*). Por ejemplo, *Yul plun
pisa*: «el perro come».

### M3 · El verbo «estar» es sólo la terminación

«Estar» no tiene raíz propia: se expresa únicamente con la terminación de
persona.

| Miskito | Español |
|---|---|
| *Pain sna.* | Estoy bien. |
| *Naki sma?* | ¿Cómo estás? |
| *Mamiki utlara sa.* | Mi mamá está en la casa. |

Por eso, aprender *sna*, *sma* y *sa* es aprender a la vez el verbo «estar» y
las terminaciones de todos los verbos.

### M4 · Los posesivos se unen al sustantivo

«Mi», «tu» y «su» no son palabras separadas: se expresan con terminaciones
unidas al sustantivo.

| | Cómo se forma | Ejemplos |
|---|---|---|
| mi | *-ki*; la a final cambia a i | *mama* → *mamiki*, *papa* → *papiki*, *yapti* → *yaptiki* |
| tu | *-kam* o *-m* | *papikam* (tu papá), *bilam* (tu boca), *ninam* (tu nombre) |
| su | *ai* … *-ka* | *ai papika* (su papá), *ai kuku ka* (su coco) |
| nuestro | *wan* delante | *Wan Aisa* (Nuestro Padre), *wan tasbaya* (nuestra tierra) |

### M5 · «utla» cambia cuando la casa tiene dueño

*utla* es «casa». Cuando la casa pertenece a alguien o a algo, la palabra
cambia a *watla*: *skul watla*, la casa de la escuela.

Las obras publicadas confirman que *watla* aparece siempre con un dueño
delante: *Tuktan watla laîka*, el líquido amniótico («el líquido de la casa
del niño»).

### M6 · Un verbo terminado en -i acompaña a otro

Cuando dos acciones las realiza la misma persona, la primera lleva la
terminación *-i* y la segunda se conjuga.

| Miskito | Literalmente | Significado |
|---|---|---|
| *aisi kaikaya* | ver hablando | leer |
| *kaiki kikisa* | sonríe viendo | sonríe al ver |
| *atki briaia* | tener comprando | comprar para tener |

### M8 · La orden: raíz + s

Para dar una orden se usa la raíz del verbo seguida de *s*.

| Miskito | Español |
|---|---|
| *Yamni yaps.* | Buenas noches («duerme bien»). |
| *Aman kaiks!* | ¡Cuidado! («mira»). |
| *Bilam kuaks!* | ¡Abre la boca! |

### M9 · Las cualidades terminan en -ni

Muchas palabras que expresan una cualidad terminan en *-ni*: *yamni* (bueno),
*pauni* (rojo), *pihni* (blanco), *sangni* (verde, azul), *damni* (dulce),
*swahni* (ácido), *pakni* (profundo).

*lalahni*, «amarillo», viene de *lalah*, «dinero»: el color se nombra por el
de la moneda. Según el diccionario de Matamoros (1996): *Lalah ainghwa
briaia*, «tener bastante dinero».

### M12 · El pasado: -ri, -ram, -an

El pasado se forma con una terminación distinta para cada persona.

| Persona | Terminación | Ejemplos |
|---|---|---|
| yo | *-ri* | *kaikri* (vi), *yabri* (di), *wiri* (dije) |
| tú, vos | *-ram*, *-aram* | *luram* (pasaste), *aisaram* (hablaste), *daukram* (hiciste) |
| él, ella | *-an*, *-wan* | *daukan* (hizo), *yapan* (durmió), *pruwan* (murió) |

Para algo que ocurría habitualmente o se estaba haciendo, se usa el verbo en
*-i* seguido de *kan*, el pasado de «estar»: *Devid harp kangbi kan*, «David
tocaba el arpa» (Matamoros, 1996).

### M13 · El futuro: -amna, -ma, -bia

El futuro se forma con una terminación propia para cada persona.

| Persona | Terminación | Ejemplos |
|---|---|---|
| yo | *-amna*, *-mna* | *daukamna* (haré), *brimna* (tendré) |
| tú, vos | *-ma* | *balma* (vendrás) |
| él, ella, nosotros | *-bia* | *balbia* (vendrá), *alkbia* (tomará) |

Por ejemplo, *Dinarra balbia*: «vendrá a mediodía» (Matamoros, 1996).

Una construcción distinta, *-aisna*, *-aisma*, *-aisa*, equivale a «voy a…» o
«está por…»: *Aikabaisa*, «va a vomitar».

### M14 · La negación: -ras, apia y apu

El miskito tiene tres formas principales de negar:

- ***-ras***, unida al verbo, equivale a «no» o «sin»: *briras* (no tiene),
  *kaikras* (sin ver).
- ***apia***, después de lo que se niega: *Tuktan ainra ba lilia apia*, «el
  niño llorón no es feliz».
- ***apu*** significa «no hay» o «no tiene»: *Upla tatumra ba pana apu*, «la
  persona envidiosa no tiene amigos».

Con los sustantivos, *-kas* equivale a «sin»: *aisikas*, «sin padre».

### M16 · Los verbos vienen en pareja

Muchos verbos tienen dos formas. Con *-kaia* o *-baia*, la acción se realiza
sobre otra cosa; con *-waia*, le ocurre al sujeto mismo.

| Se realiza sobre algo | Le ocurre al sujeto |
|---|---|
| *kalkaia*, romper | *kalwaia*, romperse |
| *ilingkaia*, abrir | *ilingwaia*, abrirse |
| *bukaia*, levantar | *buwaia*, levantarse |
| *drabaia*, estirar | *drawaia*, estirarse |
| *laikaia*, verter | *laiwaia*, derramarse |
| *nuhkaia*, engordar | *nuhwaia*, engordarse |
| *klaskaia*, cuajar | *klaswaia*, cuajarse |

El diccionario de Matamoros (1996) registra diez parejas como estas y define
la forma en *-waia* como «forma intransitiva de…»: *Kwala kalkaia*, «romper
la ropa»; *Kwala almuk kalwaia*, «romperse la ropa vieja».

### M17 · ai- y mai- delante del verbo

Unidas al comienzo del verbo, *ai-* y *mai-* indican a quién se dirige la
acción.

| Prefijo | Significado | Ejemplo |
|---|---|---|
| *ai-* | me | *aiwiram*, me dijiste |
| *mai-* | te | *maiwiri*, te dije |
| *ai-* | se (la acción vuelve sobre el sujeto) | *makupaia*, voltear → *aimakupaia*, inclinarse |

Otros verbos con *ai-* reflexivo: *aipaskaia* (juntarse), *aimadiskaia*
(nublarse), *aihtabaia* (bañarse).

Cuando la acción se dirige a otra persona, esa persona lleva *-ra* y el verbo
no cambia: *Witinra wiri*, «le dije a él» (Matamoros, 1996).

### M18 · Poder y no poder: sip

*sip* significa «posible». Para decir «se puede», se usa el verbo terminado en
*-aia* seguido de *sip sa*; para «no se puede», *sip* va antes y el verbo
lleva *-ras*.

| Miskito | Español |
|---|---|
| *Ahi ba wal supka auhni daukaia sip sa.* | Con la almeja se puede preparar una sopa deliciosa. |
| *Karma latwan taka sip aiwanras.* | Por un dolor de garganta, no puede cantar. |

Ejemplos del diccionario de Matamoros (1996).

### M19 · Verbos de dos palabras: takaia, daukaia y munaia

Muchos verbos se forman con una palabra, a menudo tomada del inglés, y un
verbo de apoyo que lleva las terminaciones.

| Verbo de apoyo | Aporta | Ejemplos |
|---|---|---|
| *takaia* | volverse; que le ocurra al sujeto | *lan takaia* (aprender), *wark takaia* (trabajar), *lilia takaia* (alegrarse) |
| *daukaia* | hacer, causar | *lan daukaia* (enseñar), *klin daukaia* (limpiar) |
| *munaia* | hacer, con palabras del inglés | *yus munaia* (usar), *stadi munaia* (estudiar), *hilp munaia* (ayudar) |

*lan takaia* y *lan daukaia* forman una pareja como la de la regla M16:
aprender es que el conocimiento le llegue a uno; enseñar es hacer que le
llegue a otro.

### M20 · -ka: la marca de pertenencia

Cuando algo pertenece a alguien o a un lugar, el dueño va primero y la cosa
poseída lleva *-ka* (o cambia su vocal final por *-ika*).

| Miskito | Literalmente | Español |
|---|---|---|
| *Waspam tawanka* | Waspam pueblo-de | el pueblo de Waspam |
| *Krukira uplika nani* | Krukira gente-de | la gente de Krukira |
| *ai papika* | su papá-de | su papá |

Con *-anka* se forma un sustantivo a partir de un verbo: *lukanka*
(pensamiento, de *lukaia*, pensar), *paskanka* (forma, de *paskaia*,
fabricar).

### O1 · El verbo va al final

En la oración, el orden habitual es sujeto, objeto y verbo.

| Miskito | Literalmente | Español |
|---|---|---|
| *Yul plun pisa.* | perro comida come | El perro come. |
| *Inska laiksna.* | pescado me-gusta | Me gusta el pescado. |

Según datos proporcionados por hablantes, casi todas las oraciones con verbo
lo colocan al final.

### O2 · Posposiciones: «casa a», no «a casa»

Las palabras que en español van antes del sustantivo («a», «de», «con»,
«dentro de») en miskito van después.

| Posposición | Significado | Ejemplo |
|---|---|---|
| *ra* | a, en | *utla ra*, a la casa |
| *wina* | de, desde | *Liwanhta wina*, del pozo |
| *wal* | con | *kin wal*, con bastón |
| *kat* | hasta | *yauhka kat*, hasta mañana |
| *bilara* | dentro de | *utla bilara*, dentro de la casa |
| *tilara* | entre | *tangni nani tilara*, entre las flores |
| *munhta* | debajo de | *tibil munhta*, debajo de la mesa |
| *pura* | encima de | *dus purara*, sobre los árboles |
| *baila* | cerca de | *tnata baila*, cerca de la meta |
| *piuara* | durante | *mani piuara*, durante el verano |

### O3 · Lo que describe al sustantivo va después

El adjetivo se coloca después del sustantivo que describe: *titan yamni*
(buenos días, «mañana buena»), *tuktan mairin* (niña), *aisa almuk* (abuelo,
«padre viejo»), *tuktan sirpi* (niño pequeño).

### O4 · Lo que indica «de qué» o «de quién» va antes

Cuando un sustantivo precisa a otro, el que precisa va primero, como en
inglés *school house*.

| Miskito | Literalmente | Español |
|---|---|---|
| *skul watla* | escuela casa | la escuela (el edificio) |
| *galila mabra* | gallina huevo | huevo de gallina |
| *kuswa mahbra* | tortuga huevo | huevo de tortuga |

### O5 · «Yo» y «tú» pueden omitirse

Como la terminación del verbo ya indica la persona, el pronombre suele
omitirse: *Pain sna* (estoy bien), *Inska laiksna* (me gusta el pescado),
*Anira iwisma?* (¿dónde vives?). *Yang*, «yo», aparece cuando se quiere
destacar quién habla, por ejemplo al presentarse: *Yang nini Ana*, «mi nombre
es Ana».

### O8 · No hay artículos «el» ni «la»

El miskito no usa artículos como los del español: *Yul pisa* es «el perro
come»; *utla ra*, «a la casa». Cuando hace falta señalar algo ya conocido, se
usa *ba* («ese») después del sustantivo.

### O9 · El número va después del sustantivo

Los números escritos en palabras se colocan después del sustantivo, como
cualquier cualidad, y el sustantivo no cambia.

| Miskito | Español |
|---|---|
| *mani wal* | dos años |
| *tuisa wal* | dos lenguas |
| *yu kumi* | un día |

Ejemplos del diccionario de Matamoros (1996). Con cifras, el número puede ir
antes, como en español: *18 mani*.

### O11 · El plural es nani; «un» es kum; los dos van después

*nani* indica plural y *kum* equivale a «un»; ambos van después del
sustantivo: *una nani* (los labios), *siknis kum* (una enfermedad).

El grupo completo sigue este orden: sustantivo, cualidad, *nani* y *ba*.
*Tuktan sirpi nani ba*: «los niños pequeños».

### O13 · «Si», «porque», «para», «antes de», «después de»: la palabra va al final

La parte de la oración que en español empieza con «si», «porque» o «para»
termina en miskito con la palabra correspondiente, y suele ir antes de la
oración principal.

| Significado | Palabra | Ejemplo |
|---|---|---|
| si | *kaka* | *Asla wark takbia kaka, …*: si trabajamos juntos, … |
| por (causa) | *taka* | *Karma latwan taka …*: por un dolor de garganta, … |
| porque | *bara*, *bamna* | *… asangra mangkram bara*: porque la sembraste en el barranco |
| para | *dukiara* | *waitla makaia dukiara*: para construir mi casa |
| antes de | *kainara* | *Plun piras kainara*: antes de comer |
| después de | *ninkara* | *King ba prubia ninkara, …*: después de que el rey muera, … |
| hasta que | *kat* | *Ahkia balma kat, …*: hasta que vengas, … |
| cuando | *taim*, *piuara* | *sukwan taim*: cuando está madura |
| pero | *sakuna* (al principio) | *…, sakuna taim brimna piuara*: …, pero cuando tenga tiempo |

«Antes de comer» se dice *plun piras kainara*, literalmente «no comer antes»:
lo que todavía no ha ocurrido se expresa en negativo. Ejemplos del diccionario
de Matamoros (1996).

### O14 · Comparar: kau … wal

Para comparar, *kau* («más») va delante de la cualidad y lo comparado lleva
*wal*, generalmente al final.

| Miskito | Español |
|---|---|
| *Naiwa kau bitar sna, nahwala wal.* | Hoy estoy mucho mejor que ayer. |
| *Beriku ba kau paun wihra bukisa, aras ba wal.* | El burro aguanta más peso que el caballo. |

Sin *wal*, *kau* significa «muy» o «el más»: *kau tara ba Jûpita*, «el más
grande es Júpiter». Ejemplos del diccionario de Matamoros (1996).

### O15 · «Lo que…», «el que…»: la descripción va antes

Para describir algo con una oración completa, esa oración va antes y termina
en *ba* («ese»).

| Miskito | Español |
|---|---|
| *Aiwiram ba daukamna.* | Haré lo que me dijiste. |
| *Waihla bri uplika nani* | Las personas que guardan enemistad |

Las definiciones del diccionario de Matamoros (1996) terminan casi siempre en
*ya ba*, «el que»: *tasba salhki dauki ya ba*, «el que se construye cavando».

### O16 · «Estar haciendo»: verbo en -i + taukisa

Para una acción en curso se usa el verbo terminado en *-i* seguido de
*taukaia* («andar») conjugado: «anda haciendo», «está haciendo».

| Miskito | Español |
|---|---|
| *Aras ba utla latara twi pih taukisa.* | El caballo anda comiendo zacate en el patio. |
| *Tuktan ba utla bilara kwasi taukisa.* | El niño anda gateando dentro de la casa. |
| *Asla impaki tauki banghwi kan.* | Andaban viajando juntos. |

Ejemplos del diccionario de Matamoros (1996).

### L1 · Los préstamos llegaron con lo que vino de afuera

Las palabras tomadas del inglés y del español se concentran en la escuela y en
los alimentos y animales que llegaron de fuera. Lo que se cultiva y se pesca
desde siempre tiene palabra propia, y el cuerpo, los números y los colores no
tienen préstamos.

| Origen | Miskito | Español |
|---|---|---|
| *school*, *book* | *skul*, *buk* | escuela, libro |
| *rice*, *beans*, *bread* | *rais*, *bins*, *bret* | arroz, frijoles, pan |
| *work*, *learn* | *wark*, *lan* | trabajo, aprender |
| *beef* | *bip* | vaca |
| *gallina*, *café* | *galila*, *cafi* | gallina, café |

Palabras propias: *yaura* (yuca), *tama* (banano), *haya* (maíz), *inska*
(pescado).

### L2 · El género se indica con waitna y mairin

Los sustantivos no tienen género. Cuando es necesario precisarlo, se agrega
*waitna* (hombre) o *mairin* (mujer) después: *tuktan* es niño o niña;
*tuktan waitna*, niño; *tuktan mairin*, niña.

En los animales, la hembra es *mairin* y el macho *wainhka*: *aras mairin*
(yegua), *aras wainhka* (caballo).

### L5 · li: agua y lluvia

*li* significa a la vez «agua» y «lluvia». «Llueve» se dice *li auhwisa*,
literalmente «el agua cae».

### L9 · La familia y el cuerpo se nombran con dueño

Las palabras de parentesco y las partes del cuerpo se dicen casi siempre con
un posesivo: *mamiki* (mi mamá), *papiki* (mi papá), *muiki* (mi hermana).

Las obras publicadas citan las partes del cuerpo con *wan*, «nuestro» o «de
uno»: *wan nakra* (el ojo), *wan mihta* (la mano), *wan napa* (los dientes).

### N1 · Cinco es una mano

Los números del uno al cinco son *kumi*, *wal*, *yumpha*, *walhwal* y
*matsip*. «Cuatro», *walhwal*, es «dos y dos». «Cinco», *matsip*, se forma con
*mat* (mano) y *sip* (completa): una mano completa.

### N2 · kumi sola, kum dentro de otra palabra

«Uno» es *kumi* cuando va solo, pero *kum* dentro de un número o después de un
sustantivo: *matsip pura kum* (seis, «cinco más uno»), *siknis kum* (una
enfermedad).
