/**
 * Todo lo que dice la interfaz, en español.
 *
 * Es el catálogo de referencia: cada clave que use una pantalla tiene que
 * estar acá. La traducción al miskito no se escribe en la app: vive en
 * `diccionario/miskito/interfaz.csv`, la llenan hablantes, y `npm run
 * contenido` la vuelca en `miq.ts`. Lo que todavía no tiene traducción se
 * muestra en español.
 *
 * `{nombre}` se reemplaza al mostrar. Las listas son frases de Piko: se elige
 * una al azar.
 *
 * Regla de tono de Piko: cuando el estudiante se equivoca, **nunca** se señala
 * el error ni se usa "mal", "incorrecto" ni "no". Se reconoce el intento y se
 * muestra la respuesta. Vale igual para cualquier lengua.
 */

export const ES = {
  // ── Portada
  'portada.lema': 'Aprendé jugando, sin internet.',
  'portada.practicar': 'Practicar sola',
  'portada.unirme': 'Unirme a la clase',
  'portada.maestro': 'Soy el maestro',
  'portada.lengua_app': 'La app en',
  'portada.minijuegos': 'Minijuegos',

  // ── Comunes
  'comun.volver': 'Volver',
  'comun.xp_correctas': '{xp} XP · {correctas}/{respondidas} correctas',
  'comun.xp_total': 'XP total',
  'comun.como_va_la_clase': 'Cómo va la clase',

  // ── Práctica en solitario
  'practicar.elegir_lengua': 'Elegí la lengua',
  'practicar.elegir_tema': 'Elegí un tema',
  'practicar.todo_mezclado': 'Todo mezclado',
  'practicar.sin_contenido': 'Todavía no hay ejercicios desde esta lengua.',
  'resultado.correctas': 'Correctas',
  'resultado.mejor_racha': 'Mejor racha',
  'resultado.otra_ronda': 'Otra ronda',
  'resultado.cambiar_tema': 'Cambiar de tema',

  // ── Ejercicios
  'ejercicio.tocar_para_escuchar': 'Tocá para escuchar',
  'ejercicio.que_escuchaste': '¿Qué escuchaste?',
  'ejercicio.elegir_traduccion': 'Elegí la traducción correcta',
  'ejercicio.arma_oracion': 'Armá esta oración',
  'ejercicio.toca_palabras': 'Tocá las palabras de abajo',
  'ejercicio.comprobar': 'Comprobar',
  'ejercicio.continuar': 'Continuar',
  'ejercicio.terminar': 'Terminar',

  // ── Unirse a la clase
  'unirse.sin_red': 'El aula necesita un teléfono: los navegadores no pueden abrir sockets TCP. Desde la computadora podés jugar la práctica en solitario.',
  'unirse.buscando_maestro': 'Buscando al maestro…',
  'unirse.revisando_red': 'Revisando la red del aula…',
  'unirse.no_encontre': 'No encontré la clase. ¿Está encendido el hotspot del maestro?',
  'unirse.no_pude_entrar': 'Encontré la sala pero no pude entrar. Probá de nuevo.',
  'unirse.ip_invalida': 'Esa dirección no parece válida. Tiene que ser algo como 192.168.43.1',
  'unirse.sin_respuesta': 'No hubo respuesta en esa dirección.',
  'unirse.entraste': '¡Entraste a la clase {codigo}! ¿Cuál sos vos?',
  'unirse.ya_esta_jugando': 'ya está jugando',
  'unirse.buscando': 'Buscando…',
  'unirse.buscar_otra_vez': 'Buscar otra vez',
  'unirse.escribi_direccion': 'Escribí la dirección que ve el maestro',
  'unirse.entrar': 'Entrar',

  // ── Jugar en clase
  'jugar.sin_senal': 'Sin señal — seguí jugando, se guarda todo',
  'jugar.reintento': ' · reintento en {segundos} s',
  'jugar.esta_ronda': 'Esta ronda',
  'jugar.en_la_clase': 'En la clase',
  'jugar.esperar_ronda': 'Esperar la próxima ronda',
  'jugar.se_corto': 'Se cortó la señal. Ya vuelvo a intentar.',
  'jugar.salir': 'Salir de la clase',

  // ── Panel del maestro
  'maestro.titulo': 'Mi clase',
  'maestro.conectado': '{n} conectado',
  'maestro.conectados': '{n} conectados',
  'maestro.sala_cerrada': 'Sala cerrada',
  'maestro.antes_de_abrir': 'Antes de abrir la sala',
  'maestro.aviso_1': 'Encendé el ',
  'maestro.aviso_negrita': 'punto de acceso',
  'maestro.aviso_2': ' (hotspot) desde los ajustes de tu teléfono. Los estudiantes se conectan a esa red y ahí te encuentran. No hace falta que tengas datos ni internet.',
  'maestro.codigo': 'Código de la clase',
  'maestro.si_no_encuentra': 'Si algún teléfono no encuentra la sala, que escriba {direccion}',
  'maestro.sin_lista': 'Todavía no cargaste la lista de tu clase.',
  'maestro.usar_ejemplo': 'Usar una lista de ejemplo',
  'maestro.en_la_lista': '{n} estudiantes en la lista',
  'maestro.abriendo': 'Abriendo…',
  'maestro.abrir': 'Abrir la sala',
  'maestro.terminar_ronda': 'Terminar la ronda',
  'maestro.empezar_ronda': 'Empezar una ronda',
  'maestro.cerrar': 'Cerrar la sala',

  // ── Minijuegos
  'minijuegos.titulo': 'Minijuegos',
  'minijuegos.sub': 'Jugá con las palabras que ya aprendiste en tus lecciones.',
  'minijuegos.jugar': 'Jugar',
  'minijuegos.pronto': 'Pronto va a haber más juegos.',

  // ── Rayuela de Piko
  'rayuela.nombre': 'Rayuela de Piko',
  'rayuela.descripcion': 'Saltá con Piko por la rayuela eligiendo la casilla correcta.',
  'rayuela.elegir_lengua': '¿En qué lengua querés saltar?',
  'rayuela.nivel': 'Nivel',
  'rayuela.sugerido': 'Sugerido',
  'rayuela.segun_lecciones': 'Según tus lecciones: {nivel}',
  'rayuela.nivel_inicial': 'Inicial',
  'rayuela.nivel_intermedio': 'Intermedio',
  'rayuela.nivel_avanzado': 'Avanzado',
  'rayuela.desc_inicial': 'Palabras sencillas con dibujos de apoyo.',
  'rayuela.desc_intermedio': 'Más palabras y menos dibujos, en las dos direcciones.',
  'rayuela.desc_avanzado': 'Frases cortas y audio, sin dibujos. Escuchá y elegí.',
  'rayuela.casillas': '{n} casillas',
  'rayuela.bloqueado': 'Se abre con {n} lecciones más',
  'rayuela.bloqueado_palabras': 'Se abre con más palabras aprendidas',
  'rayuela.sin_vocabulario': 'Todavía no hay palabras aprendidas de {lengua}. Hacé una lección y volvé a saltar.',
  'rayuela.ir_a_practicar': 'Ir a practicar',
  'rayuela.a_saltar': '¡A saltar!',
  'rayuela.cambiar_lengua': 'Podés cambiar la lengua en cualquier partida con el globo.',
  'rayuela.pregunta_directo': '¿Qué significa en español?',
  'rayuela.pregunta_inverso': '¿Cómo se dice en {lengua}?',
  'rayuela.pregunta_escucha': 'Escuchá a Piko. ¿Qué dijo?',
  'rayuela.etiqueta': '{lengua} · {nivel} · {n} de {total}',
  'rayuela.seguir': 'Seguir saltando',
  'rayuela.al_cielo': 'Saltar al cielo',
  'rayuela.reintentar': 'Intentar de nuevo',
  'rayuela.pista_escucha': 'Tocá el parlante para escuchar otra vez.',
  'rayuela.pista_mirar': 'Mirá bien y elegí otra casilla.',
  'rayuela.cielo': 'Cielo',
  'rayuela.escuchar': 'Escuchar',
  'rayuela.salir': 'Salir de la rayuela',
  'rayuela.casilla': 'Casilla {n}: {texto}',
  'rayuela.fin_cielo': '¡Llegaste al cielo!',
  'rayuela.fin_bien': '¡Bien saltado!',
  'rayuela.fin_sin_flores': '¡Terminaste la rayuela!',
  'rayuela.fin_repetida': '¡Rayuela terminada!',
  'rayuela.sin_flores_explica': 'Con {n} de {total} al primer salto ganás sacuanjoches. Repasá estas palabras y volvé a saltar.',
  'rayuela.repetida_explica': 'Esta rayuela ya te dio flores hoy. Mañana vuelve a dar, o probá otro nivel u otra lengua.',
  'rayuela.al_primer_salto': 'Al primer salto',
  'rayuela.volver_a_saltar': 'Volver a saltar',
  'rayuela.otra_rayuela': 'Otra rayuela',
  'rayuela.sacuanjoches': 'Sacuanjoches',

  // ── Nombres de las lenguas
  'lengua.eng': 'Inglés',
  'lengua.miq': 'Miskito',
  'lengua.sum': 'Mayangna',
  'lengua.rma': 'Rama',
  'lengua.cab': 'Garífuna',
  'lengua.spa': 'Español',

  // ── Temas de los ejercicios
  'tema.saludos': 'Saludos',
  'tema.familia': 'La familia',
  'tema.numeros': 'Números',
  'tema.cuerpo': 'El cuerpo',
  'tema.animales': 'Animales',
  'tema.comida': 'La comida',
  'tema.naturaleza': 'La naturaleza',
  'tema.casa': 'La casa',
  'tema.escuela': 'La escuela',
  'tema.colores': 'Colores',
  'tema.acciones': 'Acciones',
  'tema.escucha': 'Escuchar',
  'tema.frases': 'Frases',
  'tema.posesion': 'Mío y tuyo',

  // ── Lo que dice Piko
  'piko.acierto': ['¡Esa es!', '¡Bien ahí!', '¡Correcto!', '¡Muy bien!', '¡Le atinaste!', '¡Así se hace!'],
  'piko.racha': ['¡Vas volando!', '¡Qué racha!', '¡No te para nadie!', '¡Seguidas!'],
  /** Para cuando se equivoca. Sin "no", sin "mal", sin aspas rojas. */
  'piko.intento': ['Casi. Mirá cómo es:', 'Buen intento. Es así:', 'Ya casi. Se dice:', 'Tranquilo, mirá:', 'La próxima sale. Es:'],
  'piko.bienvenida': ['¡Hola! Soy Piko.', '¿Jugamos un rato?', '¡Qué bueno verte!'],
  'piko.fin_bien': ['¡Terminaste! Estuviste muy bien.', '¡Qué ronda! Seguí así.', '¡Excelente trabajo!'],
  'piko.fin_normal': ['¡Terminamos! Cada vez sale mejor.', 'Buen trabajo. Practicando se aprende.', '¡Listo! Lo importante es seguir.'],
  /** Al subir de nivel: Piko trepa una rama más del madroño. */
  'piko.subir_nivel': ['¡Subimos una rama!', '¡Más arriba! Desde acá se ve todo.', '¡Tu árbol nos está llevando alto!'],
  /** Cuando el madroño pasa a la etapa siguiente. */
  'piko.arbol_crece': ['¡Mirá cómo creció tu madroño!', '¡Tu árbol está creciendo!'],
  /** Rayuela: al caer en la casilla correcta. */
  'piko.rayuela_salto': ['¡Eso!', '¡Buen salto!', '¡Así se hace!', '¡Muy bien!', '¡Bien saltado!'],
  /** Rayuela: al caer en otra casilla. Sin "no" ni "mal": se vuelve a probar. */
  'piko.rayuela_casi': ['Casi. Probá otra casilla.', 'Buen intento. Elegí otra.', 'Ya casi. Probá de nuevo.'],
  'piko.esperando': ['Esperando a la clase…', 'Ya casi empezamos.', 'El maestro está preparando la ronda.'],
} as const;
