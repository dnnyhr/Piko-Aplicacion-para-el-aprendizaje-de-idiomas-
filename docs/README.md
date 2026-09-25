# Documentación de Piko

Piko enseña miskito, mayangna, rama, garífuna e inglés en escuelas rurales de
Nicaragua. Funciona **sin internet**: el teléfono del maestro levanta una red
local y los estudiantes se conectan a su hotspot para jugar entre sí.

Esta carpeta explica cómo está construido y por qué se tomó cada decisión.

El proyecto tiene tres partes que se desarrollan y se prueban por separado:

| Parte | Carpeta | Qué es |
|---|---|---|
| **La app** | [`app/`](../app/) | Ruta 1: el juego multijugador en red local, para aulas con teléfonos |
| **El robot** | [`robot/`](../robot/) | Ruta 2: el acompañante de aula, para donde no alcanzan los teléfonos |
| **Las encuestas** | [`encuestas/`](../encuestas/) | Para escuchar a la comunidad y juntar palabras de hablantes nativos |

Más la landing estática en [`web/`](../web/) (piko.mugiware.com).

| Documento | Para qué |
|---|---|
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, el protocolo del aula y la sincronización |
| [tecnologias.md](tecnologias.md) | Qué se usa y por qué se eligió sobre las alternativas |
| [decisiones.md](decisiones.md) | Registro de decisiones con su contexto y sus consecuencias |
| [desarrollo.md](desarrollo.md) | Correr, probar y compilar: la app, el panel del robot y las encuestas |
| [../app/README.md](../app/README.md) | La app en resumen |
| [../app/content/README.md](../app/content/README.md) | Formato de los paquetes de contenido |
| [../robot/README.md](../robot/README.md) | Cableado, puente, caras, voz y protocolo serie del robot |
| [../encuestas/README.md](../encuestas/README.md) | Encuestas: ponerlas en marcha, crear una nueva, palabras para la app |

---

## El problema, en una línea

Tres barreras al mismo tiempo: **conectividad casi nula**, **dispositivos
escasos y de gama baja**, y **un solo maestro para un aula numerosa** que
además puede no dominar la lengua que enseña.

Todo lo que sigue es consecuencia de esas tres restricciones.

## Las cuatro ideas que sostienen el diseño

**1. Nada en el aula depende de internet.** La app no tiene servidor, ni nube,
ni cuentas. El teléfono del maestro es el único punto central, y lo es sólo
mientras dura la clase. (Las encuestas sí corren en un servidor, pero viven
fuera del aula: ni la app ni el robot las necesitan.)

**2. El progreso pertenece al estudiante, no al aparato.** Un niño puede jugar
hoy en un teléfono prestado y mañana en otro sin perder nada. Reclama su nombre
de la lista y recibe su avance.

**3. Sólo viaja lo que cambió.** La sincronización es diferencial. Un
dispositivo que ya conoce al estudiante recibe únicamente la diferencia; uno
que nunca lo vio recibe un estado ya calculado de tamaño fijo, nunca el
historial completo.

**4. Piko refuerza, no regaña.** El error nunca se pinta de rojo, el XP jamás
baja, y la mascota muestra la respuesta correcta con una frase de aliento. Un
niño que está aprendiendo la lengua de su comunidad no necesita que una app le
diga que la habla mal.

## Qué hay construido

**La app**

- Los tres ejercicios: escucha, traducción por selección múltiple y
  construcción de oraciones con bloques de palabras.
- El aula en red: sala, descubrimiento del anfitrión, rondas sincronizadas,
  reconexión y semáforo de rezago para el maestro.
- Identidad y progreso que siguen al estudiante entre dispositivos.
- Contenido en inglés (6 paquetes, 43 ítems). Las cuatro lenguas indígenas
  tienen el formato listo y esperan material de hablantes nativos.
- 121 pruebas automatizadas y un simulador que levanta un aula entera sin
  necesidad de teléfonos.

**El robot** (prototipo de control)

- Firmware para el MegaPi: motor a pasos, servo y dos tiras de LEDs, con
  «hombre muerto» que frena todo si se corta el latido.
- Un puente en Node que habla con la placa por USB y reparte entre el panel del
  maestro y la cara.
- La cara en un teléfono: ocho expresiones animadas, boca que sigue a la voz, y
  la pantalla que no se apaga en toda la clase.
- Voz (la de Google, con la del teléfono de respaldo sin internet) y el primer
  ejercicio completo, «Di esta palabra», con el maestro decidiendo si estuvo bien.
- 44 comprobaciones automáticas del puente, sin placa ni teléfonos.

**Las encuestas** (encuestas.piko.mugiware.com)

- *¿Qué le falta a Piko?*: qué quiere la gente de la app y del robot.
- *Tu lengua en Piko*: hablantes escriben palabras y frases en su lengua; un
  panel las agrupa, se confirman y se exportan ya en el formato de los paquetes
  de la app.
- Pensadas para teléfonos de gama baja y poca señal: guardan a cada toque y
  mandan la respuesta cuando vuelve la conexión.

## Qué falta

- El contenido de las cuatro lenguas indígenas — el riesgo real del proyecto.
  *Tu lengua en Piko* es el primer paso para conseguirlo.
- Grabaciones de hablantes para los ejercicios de escucha en esas lenguas.
- Presets de aula guardados e importación de listas de estudiantes por archivo.
- Compartir el APK por Bluetooth desde la propia app.
- Robot: reconocimiento de voz, formación de grupos, configuración desde la app
  y probarlo todo junto con el robot armado.
- Probar la app en un aula real, con teléfonos reales.
