## Piko 0.2.1 — el ícono de Piko

- **La app ya tiene su ícono:** la cabeza de Piko en blanco sobre verde, igual
  que en piko.mugiware.com. Antes mostraba el ícono de plantilla de Expo.
  También cambia la pantalla de arranque.
- Se instala encima de la 0.2.0 sin desinstalar nada.

## De la 0.2.0: conexión por hotspot rehecha

La sala del aula se rehízo desde abajo: ahora los teléfonos de los estudiantes
encuentran solos el hotspot del maestro.

- **Los estudiantes entran sin escribir nada.** La app lee la dirección del
  maestro directamente del wifi (en un hotspot, el maestro es el router), y
  además el maestro anuncia la sala con un faro en la red. Escribir la IP queda
  solo como último recurso.
- **Funciona aunque el hotspot no tenga internet** y el teléfono tenga los
  datos móviles prendidos: la conexión se ata al wifi del aula.
- **Sin esperas largas.** Probar una dirección vacía ya no traba la búsqueda.
- El maestro ve sus direcciones en pantalla, y un aviso si el hotspot todavía
  no está encendido. El estudiante ve un aviso si no está conectado a ningún wifi.

### Instalar

1. Descargá `piko-*.apk` de esta release en el teléfono.
2. Permití instalar apps de orígenes desconocidos cuando el teléfono lo pida.
3. **Si tenías la 0.1.x, desinstalala primero:** desde la 0.2.0 la app se
   compila de otra forma y Android no deja instalarla encima. Sobre la 0.2.0
   se actualiza directo.

### En el aula

1. Maestro: prendé el hotspot → Piko → *Soy el maestro* → *Abrir la sala*.
2. Estudiantes: conectense a ese hotspot. Si el teléfono avisa que la red no
   tiene internet, elegí **mantener la conexión**. Después Piko → *Unirme a la clase*.
