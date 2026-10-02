# Política de seguridad

## Reportar una vulnerabilidad

**No abras un issue público.**

Escribí a **entitydh@gmail.com** con el asunto `[SEGURIDAD] Piko`. Incluí:

- Qué encontraste y qué impacto tendría.
- Cómo reproducirlo.
- Qué parte del proyecto afecta: la app, el aula en red, el robot, el panel o
  las encuestas.

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
- **El puente del robot.** El panel expone un servidor HTTP local, y puede
  abrirse a internet por un túnel. Nos importa que no se pueda usar para
  alcanzar nada más allá del robot, y que nadie de afuera pueda moverlo. El
  túnel debe ir siempre detrás de Cloudflare Access (ver
  [robot/README.md](robot/README.md#abrirlo-a-internet)).
- **Las encuestas.** Son la única parte con un servidor público
  (`encuestas.piko.mugiware.com`) y guardan datos de contacto que la gente deja
  voluntariamente. Nos importa que nadie pueda leer respuestas sin el token del
  panel, usar la encuesta para mandar correos a direcciones ajenas, ni inyectar
  scripts en la página o fórmulas en el CSV. Las defensas que ya tiene están en
  [encuestas/README.md](encuestas/README.md#seguridad).
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

### La app

Todo queda en el dispositivo, en SQLite. No hay servidor, no hay nube, no hay
telemetría, y nada sale del teléfono salvo hacia el aula local durante la clase.

Lo que se guarda de un estudiante es su nombre de pila —el que el maestro pone
en la lista— y su progreso de aprendizaje. Nada más: ni apellidos, ni
direcciones, ni fotos, ni audio.

### El robot

El puente no guarda datos de estudiantes. Guarda en caché el audio de las
frases que dice Piko, que pide a la voz de Google: el texto de esas frases sale
a internet cuando hay conexión.

### Las encuestas

Guardan en Cloudflare D1 las respuestas, y sólo si la persona los escribe, su
nombre, correo o teléfono. No se guarda la IP: para frenar abusos se guarda un
hash de IP y navegador que cambia cada día. Las pueden contestar también
estudiantes, incluso menores de 12 años: por eso los datos de contacto son
siempre opcionales, y el CSV que se descarga del panel hay que tratarlo como
dato personal. Los detalles están en
[encuestas/README.md](encuestas/README.md#privacidad).

---

<sub>**English:** report vulnerabilities privately to entitydh@gmail.com with
the subject `[SEGURIDAD] Piko`. We respond within 7 days. Note the threat model
above: Piko has no accounts and no encryption on the classroom LAN by design —
access control is physical, and all data stays on-device. Anything that breaks
those assumptions is a vulnerability we want to hear about. The surveys
(`encuestas/`) are the one server-side component; see its README for the
defenses already in place.</sub>
