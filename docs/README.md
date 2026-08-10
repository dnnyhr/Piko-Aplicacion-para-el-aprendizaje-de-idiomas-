# Documentación de Piko

Piko enseña miskito, mayangna, rama, garífuna e inglés en escuelas rurales de
Nicaragua. Funciona **sin internet**: el teléfono del maestro levanta una red
local y los estudiantes se conectan a su hotspot para jugar entre sí.

Esta carpeta explica cómo está construido y por qué se tomó cada decisión.

| Documento | Para qué |
|---|---|
| [arquitectura.md](arquitectura.md) | Cómo está organizado el código, el protocolo del aula y la sincronización |
| [tecnologias.md](tecnologias.md) | Qué se usa y por qué se eligió sobre las alternativas |
| [decisiones.md](decisiones.md) | Registro de decisiones con su contexto y sus consecuencias |
| [desarrollo.md](desarrollo.md) | Correr, probar y compilar el APK |
| [../app/content/README.md](../app/content/README.md) | Formato de los paquetes de contenido |

---

## El problema, en una línea

Tres barreras al mismo tiempo: **conectividad casi nula**, **dispositivos
escasos y de gama baja**, y **un solo maestro para un aula numerosa** que
además puede no dominar la lengua que enseña.

Todo lo que sigue es consecuencia de esas tres restricciones.

## Las cuatro ideas que sostienen el diseño

**1. Nada depende de internet.** No hay servidor, no hay nube, no hay cuentas.
El teléfono del maestro es el único punto central, y lo es sólo mientras dura
la clase.

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

- Los tres ejercicios: escucha, traducción por selección múltiple y
  construcción de oraciones con bloques de palabras.
- El aula en red: sala, descubrimiento del anfitrión, rondas sincronizadas,
  reconexión y semáforo de rezago para el maestro.
- Identidad y progreso que siguen al estudiante entre dispositivos.
- Contenido en inglés (6 paquetes, 43 ítems). Las cuatro lenguas indígenas
  tienen el formato listo y esperan material de hablantes nativos.
- 121 pruebas automatizadas y un simulador que levanta un aula entera sin
  necesidad de teléfonos.

## Qué falta

- Presets de aula guardados e importación de listas de estudiantes por archivo.
- Compartir el APK por Bluetooth desde la propia app.
- El contenido de las cuatro lenguas indígenas — el riesgo real del proyecto.
