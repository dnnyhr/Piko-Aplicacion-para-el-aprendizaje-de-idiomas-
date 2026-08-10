# Registro de decisiones

Cada entrada dice qué se decidió, por qué, y qué costo tiene. Las que llevan
🩹 salieron de encontrar un fallo, y conviene leerlas antes de "simplificar"
lo que arreglan.

---

## 1. El núcleo no importa React Native

**Contexto.** El protocolo, la sincronización y el motor de progreso son la
parte del proyecto que puede fallar de formas silenciosas y difíciles de
reproducir. Y el equipo no tiene Android SDK ni un aula de teléfonos para
probar.

**Decisión.** Todo eso vive en `src/core/` como TypeScript puro, sin una sola
importación de React Native.

**Por qué.** Porque así corre en Node. Las 121 pruebas se ejecutan en cuatro
segundos sin emulador, y `tools/sim.ts` puede levantar un aula entera —
anfitrión y ocho estudiantes reales sobre TCP — en la computadora.

**Costo.** Disciplina. Cada vez que algo del núcleo necesita saber de la
pantalla, del socket o del disco, hay que inyectárselo desde afuera en lugar de
importarlo. Es exactamente lo que hace posible lo anterior.

---

## 2. TCP crudo con NDJSON

**Contexto.** Los estudiantes tienen que jugar en tiempo real contra el
teléfono del maestro, sin internet y en equipos de gama baja.

**Decisión.** Sockets TCP con una línea de JSON por mensaje.

**Por qué.** Correr Node en el dispositivo suma 15–30 MB al APK. HTTP con
sondeo no es tiempo real y gasta batería. WebSocket exige un apretón de manos
que no hace falta cuando los dos extremos son la misma aplicación.

**Costo.** Hay que manejar el troceado a mano: TCP entrega bytes, no mensajes.
Está resuelto en `core/protocol/codec.ts` y probado con el caso feo — un
mensaje partido carácter por carácter.

---

## 3. El progreso es un registro de eventos, no un contador

**Contexto.** El progreso tiene que sobrevivir a que el niño cambie de
teléfono, a que se caiga el wifi y a que dos dispositivos tengan versiones
distintas de la verdad.

**Decisión.** Un registro que sólo crece. El estado se calcula plegando los
eventos, de forma determinista.

**Por qué.** Con contadores hay que decidir quién gana cuando dos dispositivos
discrepan, y no hay respuesta correcta. Con eventos no hay conflicto: el
conjunto es el mismo y el resultado también.

**Costo.** El registro crece sin techo. Se compensa con los *snapshots* de la
decisión 4.

---

## 4. Un teléfono nuevo recibe un estado, no el historial

**Contexto.** El requisito dice que sólo debe viajar lo que cambió, nunca el
historial completo. Pero un dispositivo que nunca vio al estudiante necesita
*todo* su avance.

**Decisión.** En ese caso el anfitrión pliega el historial y manda el
resultado: un objeto de tamaño fijo, sin importar cuántos eventos haya detrás.
Se guarda periódicamente como *snapshot* para no recalcularlo cada vez.

**Por qué.** Cumple el requisito de verdad. Da igual si detrás hay veinte
eventos o veinte mil: lo que cruza la red es lo mismo.

**Costo.** El estado tiene que ser serializable y su cálculo determinista. Está
verificado en las pruebas.

---

## 5. 🩹 La idempotencia va por `(estudiante, id)`, no por `id`

**Contexto.** Los eventos llevan un identificador único que permite reenviarlos
sin duplicar nada.

**El fallo.** La clave era el `id` a secas. Si dos teléfonos generaban el mismo
identificador, el evento del segundo se descartaba **en silencio**, como si
fuera un reenvío. No da error: sólo faltan respuestas de un niño.

Lo encontró el simulador, cuando dos clientes de prueba compartían semilla.

**Decisión.** La clave es compuesta, en memoria y en SQLite.

**Por qué importa.** El fallo original es del tipo peor: no se manifiesta hasta
que alguien nota que las cuentas no cierran, y para entonces la clase terminó.

---

## 6. 🩹 El marcador sale del registro durable

**Contexto.** El maestro necesita ver en vivo cómo va la clase.

**El fallo.** Había dos caminos hacia el mismo número: un aviso inmediato para
el marcador, y los eventos de progreso para el registro. Un teléfono que perdía
señal perdía el aviso. El niño seguía sumando progreso real, pero **aparecía
atrasado en el semáforo** — justo la funcionalidad que el maestro no puede
darse el lujo de que mienta.

**Decisión.** Se eliminó el aviso. El marcador se alimenta de los mismos
eventos que se sincronizan.

**Por qué funciona.** El ingreso de eventos es idempotente, así que cada
respuesta cuenta exactamente una vez, y lo respondido sin señal cuenta apenas
vuelve la conexión.

**Costo.** El marcador se actualiza al ritmo del envío agrupado (unos 800 ms)
en lugar de instantáneamente. Es imperceptible, y a cambio nunca miente.

---

## 7. 🩹 El estado llega completo en un solo mensaje

**Contexto.** Al reclamar identidad en un teléfono nuevo, el anfitrión mandaba
un *snapshot* y después, por separado, la cola de eventos posteriores.

**El fallo.** La pantalla mostraba el estado incompleto durante el hueco entre
los dos mensajes. En la práctica, el niño veía menos progreso del que tenía.

**Decisión.** El anfitrión pliega la cola antes de mandar. Un solo mensaje, ya
completo.

**Por qué.** Además de eliminar el estado a medias, simplifica el cliente: no
hay que coordinar dos mensajes que podrían llegar en cualquier orden.

---

## 8. El error nunca es rojo, y el XP jamás baja

**Contexto.** Piko acompaña a niños que están aprendiendo la lengua de su
propia comunidad, muchas veces con más soltura que el maestro.

**Decisión.** Equivocarse pinta la barra de ámbar, nunca de rojo. Piko muestra
la respuesta correcta con una frase de aliento, y el texto **no dice en ningún
momento** que estuvo mal. El XP suma menos al fallar, pero nunca resta.

**Por qué.** Un aspa roja en la cara de un chico que recién empieza a hablar su
lengua es exactamente lo contrario de lo que este proyecto busca.

**Consecuencia.** Es una regla de producto, no un detalle de estilo. Está
escrita en `src/ui/piko/frases.ts` y hay que respetarla al agregar textos.

---

## 9. Los bloques se colocan por toque, no arrastrando

**Contexto.** El ejercicio de construir oraciones necesita mover palabras.

**Decisión.** Se toca una ficha y sube al renglón; se toca en el renglón y
vuelve. Las fichas usadas quedan como huecos en su lugar original.

**Por qué.** Un dedo de niño sobre una pantalla de gama baja acierta mucho
mejor un toque que un arrastre. Y evita una dependencia de gestos, con su
costo de rendimiento.

---

## 10. Contenido sólo en inglés, y síntesis de voz prohibida en las demás

**Contexto.** Piko enseña cinco lenguas, pero conseguir vocabulario y
pronunciación correctos en cuatro lenguas indígenas es un trabajo de campo.

**Decisión.** El inglés tiene contenido verificable. Miskito, mayangna, rama y
garífuna quedan con el formato listo y vacías. El validador **rechaza** la
síntesis de voz en esas lenguas.

**Por qué.** Inventar vocabulario o hacer que una voz en español pronuncie
miskito sería enseñar una lengua falsa a los niños que justamente están
tratando de conservarla. Que el validador lo impida evita que pase por
descuido.

**Riesgo abierto.** Este es el riesgo real del proyecto, y no es técnico.
Conviene buscar hablantes y material publicado en paralelo al desarrollo.

---

## 11. La ronda se genera con una semilla, no se transmite

**Contexto.** Todos los teléfonos de una ronda tienen que recibir los mismos
ejercicios en el mismo orden.

**Decisión.** Los ítems se eligen con un generador determinista sembrado con la
sesión y el número de ronda.

**Por qué.** Hace que un estudiante que llega tarde pueda engancharse a la
ronda en curso: el anfitrión reconstruye la lista exacta sin haber guardado
nada. Y permite repetir una ronda idéntica si algo salió mal.

---

## 12. APK, no AAB

**Contexto.** Los tres perfiles de compilación generan APK.

**Decisión.** Ninguno genera Android App Bundle.

**Por qué.** Piko no se distribuye por la tienda de aplicaciones: se comparte de
teléfono en teléfono, sin gastar datos. Un AAB no sirve para eso.

---

## 13. Compilación en la nube

**Contexto.** La máquina de desarrollo no tiene Android SDK ni Java.

**Decisión.** Se compila con EAS Build.

**Por qué.** Ahorra una tarde de instalación y unos 10 GB. Se necesita internet
sólo al compilar; la aplicación nunca lo usa.

**Costo.** Dependencia de un servicio externo y una cola de espera en el plan
gratuito. Si hiciera falta compilar sin conexión, hay que instalar el entorno
nativo local.

---

## 14. La ejecución en navegador es para la interfaz, no para el aula

**Contexto.** Trabajar el diseño esperando una compilación es lento.

**Decisión.** La app corre en el navegador con la base en memoria y sin red.
Metro elige los archivos por plataforma.

**Por qué.** Un navegador no puede abrir un socket TCP crudo — es una
restricción de la plataforma, no algo que se pueda sortear. Y el soporte web de
`expo-sqlite` está en alfa y exige configuración adicional que no vale la pena
para mirar pantallas.

**Consecuencia.** En la computadora se trabaja la interfaz y la práctica en
solitario; el aula se prueba con el simulador o con teléfonos.

---

## 15. El robot queda fuera de alcance

**Contexto.** El documento del proyecto describe una segunda ruta con un robot
físico que evalúa pronunciación.

**Decisión.** No se construye nada del robot en esta aplicación.

**Por qué.** La ruta con teléfonos ya es un proyecto completo, y la fecha es la
que es.

---

## Pendientes conocidos

- **El contenido de las cuatro lenguas indígenas.** El riesgo principal.
- **Presets de aula guardados** e importación de listas por archivo.
- **Compartir el APK por Bluetooth** desde la propia aplicación: requiere un
  módulo nativo pequeño que lea la ruta del paquete instalado y lance el
  selector de compartir de Android.
- **Descubrimiento por difusión UDP.** La dependencia está instalada; hoy
  alcanza con la puerta de enlace y el barrido de subred.
- **Probar en dispositivos reales.** Hace falta un mínimo de dos teléfonos
  Android.
