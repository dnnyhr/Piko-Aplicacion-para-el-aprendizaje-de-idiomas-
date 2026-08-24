# Política de seguridad

## Reportar una vulnerabilidad

**No abras un issue público.**

Escribí a **entitydh@gmail.com** con el asunto `[SEGURIDAD] Piko`. Incluí:

- Qué encontraste y qué impacto tendría.
- Cómo reproducirlo.
- Qué parte del proyecto afecta: la app, el aula en red, el robot o el panel.

Respondemos en un plazo de **7 días**. Somos un equipo pequeño y esto no es
nuestro trabajo de tiempo completo, así que agradecemos la paciencia. Te vamos
a mantener al tanto mientras trabajamos en el arreglo, y te damos crédito
cuando publiquemos la corrección — salvo que prefieras lo contrario.

## Qué versiones reciben arreglos

El proyecto está en desarrollo activo y todavía no tiene versiones estables. Los
arreglos de seguridad van a la rama `main`.

## Modelo de amenaza

Piko corre en un contexto poco habitual, y vale la pena ser explícitos sobre qué
consideramos un problema y qué no.

### Lo que nos preocupa

- **Datos de menores de edad.** Los usuarios de Piko son niños. Cualquier cosa
  que exponga sus nombres o su progreso más allá del aula es un problema serio.
- **El aula en red.** El teléfono del maestro abre un hotspot y escucha en un
  socket TCP. Nos importa que un dispositivo dentro de esa red no pueda
  suplantar al maestro, alterar el progreso de otro estudiante, ni tumbar la
  clase con paquetes mal formados.
- **El puente del robot.** El panel expone un servidor HTTP local. Nos importa
  que no se pueda usar para alcanzar nada más allá del robot.
- **Paquetes de contenido.** El contenido es data que viene de fuera. Un `.json`
  malicioso no debería poder ejecutar nada ni romper la app.

### Lo que es una decisión de diseño, no un fallo

- **No hay cuentas ni contraseñas.** Es deliberado. Los niños no tienen correo
  y la escuela no tiene internet para verificarlo. La identidad se reclama de
  una lista que el maestro controla, presencialmente, en el aula.
- **El tráfico del aula no va cifrado.** Corre sobre una red local aislada que
  el maestro levanta y apaga con la clase. Añadir TLS exigiría gestionar
  certificados en teléfonos sin conexión, y el costo no se justifica contra lo
  que protege.
- **Cualquiera en el hotspot puede unirse a la sala.** El control de acceso es
  físico: es el aula, y el maestro decide quién está adentro.

Si encontrás algo que rompe una de esas suposiciones — por ejemplo, datos que
salen de la red local, o alguien que se une desde fuera del aula — eso sí es una
vulnerabilidad y queremos saberlo.

## Datos que Piko guarda

Todo queda en el dispositivo, en SQLite. No hay servidor, no hay nube, no hay
telemetría, y nada sale del teléfono salvo hacia el aula local durante la clase.

Lo que se guarda de un estudiante es su nombre de pila —el que el maestro pone
en la lista— y su progreso de aprendizaje. Nada más: ni apellidos, ni
direcciones, ni fotos, ni audio.

---

<sub>**English:** report vulnerabilities privately to entitydh@gmail.com with
the subject `[SEGURIDAD] Piko`. We respond within 7 days. Note the threat model
above: Piko has no accounts and no encryption on the classroom LAN by design —
access control is physical, and all data stays on-device. Anything that breaks
those assumptions is a vulnerability we want to hear about.</sub>
