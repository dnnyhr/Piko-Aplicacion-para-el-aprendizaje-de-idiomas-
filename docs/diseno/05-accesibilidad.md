# 5 · Chequeo de accesibilidad

Verificación de que la interfaz de Piko cumpla los principios básicos de
accesibilidad. **No es una lista de buenas intenciones**: el contraste y los
tamaños táctiles están medidos sobre las 17 pantallas reales
(384 textos, 122 elementos tocables), por
[`figma/captura/auditar.mjs`](../../figma/captura/auditar.mjs). En Figma, la
página **♿ Accesibilidad** tiene la misma tabla con muestras de cada par.

Criterios: **WCAG 2.2 nivel AA** (lo que piden la mayoría de las normas), con
las guías de Android (Material, 48 dp) y Apple (44 pt) para los toques.

## Resumen

| Principio | Estado | Detalle |
|---|---|---|
| Contraste de texto | ⚠️ Casi | 276 de 349 textos (79 %) pasan AA. 6 combinaciones a corregir (abajo). |
| Legibilidad | ✅ | Cuerpo de 16 px con alto de línea 24 (1.5); el texto más usado después es de 13 px. Dos textos de 10–11 px a revisar. |
| Jerarquía visual | ✅ | Escala clara: Display 32 → Título 24 → Subtítulo 19 → Cuerpo 16 → Chico 13. Una acción principal verde por pantalla. |
| Tamaño de los objetivos táctiles | ⚠️ Casi | 104 de 122 (85 %) miden 48 × 48 o más. 7 por debajo de 44. Botones de 48–52 px de alto, opciones de 64. |
| Uso del color | ✅ | Nada depende sólo del color: acierto e intento llevan texto, la cara de Piko y la respuesta; las opciones llevan número. El error es ámbar, no rojo. |
| Navegación | ⚠️ | Botón atrás de Android en todas las pantallas; «Volver» en dos lugares distintos (ver [flujo UX](03-flujo-ux.md#hallazgos-y-ajustes-propuestos)). Roles y etiquetas en los tocables. |
| Adaptación a usuarios | ✅ | Interfaz en español y miskitu; funciona sin internet; tocar en vez de arrastrar; el audio se puede repetir; los minijuegos respetan «reducir movimiento». |
| Adaptación a dispositivos | ✅ | Diseñado a 360 × 800 (gama baja), todo en scroll vertical, fuentes empaquetadas. En pantallas anchas sólo Logros y Canjear limitan el ancho (560 / 520): el resto se estira. |

## 1. Contraste

WCAG 1.4.3 pide **4.5 : 1** para texto normal y **3 : 1** para texto grande
(24 px, o 18.66 px en negrita). El fondo de cada texto se calcula componiendo
todos los fondos que tiene detrás, incluidos los semitransparentes.

| | Ejemplo | Texto | Fondo | Contraste | Nivel | Tamaño | Usos |
|---|---|---|---|---|---|---|---|
| ⏸️ | «Canjear» | `#9D6C12` | `#D2921F` | **1.72** | Inactivo | 16 px | 1 |
| ⏸️ | «Abrir la sala» | `#4F8031` | `#88B031` | **1.86** | Inactivo | 16 px | 3 |
| ❌ | «Tocá para escuchar» | `#FFFFFF` blanco | `#60C5FA` cielo | **1.93** | No cumple | 13 px | 1 |
| ❌ | «¡Nuevo logro desbloqueado!» | `#E97927` copete | `#F7F0E4` papel | **2.56** | No cumple | 15–16 px | 2 |
| ⚠️ | «El maestro está leyendo un libro» | `#A17832` | `#FDF2DC` intentoFondo | **3.60** | Sólo grande | 13 px | 1 |
| ⚠️ | «Coleccionista de palabras» | `#6B7A70` tintaSuave | `#F3EEE6` | **3.92** | Sólo grande | 13 px | 33 |
| ⚠️ | «Un poquito cada día rinde mucho.» | `#6B7A70` tintaSuave | `#F7F0E4` papel | **3.99** | Sólo grande | 13–16 px | 35 |
| ⚠️ | «¡Salió el primer brote!» | `#6B7A70` tintaSuave | `#EDF8D9` aciertoFondo | **4.10** | Sólo grande | 13 px | 1 |
| ✅ | «Tu madroño está por nacer.» | `#6B7A70` tintaSuave | `#FFFFFF` blanco | **4.52** | AA | 13–20 px | 29 |
| ✅ | «🎟️  Canjear código» | `#5C3D02` | `#E8A429` intento | **4.60** | AA | 16 px | 3 |
| ✅ | «Próximamente» | `#8A5A08` intentoTinta | `#F3EEE6` | **5.13** | AA | 11 px | 2 |
| ⏸️ | «Comprobar» | `#0A4530` verdeHondo | `#97C137` acierto | **5.24** | Inactivo | 16 px | 1 |
| ✅ | «¡Continuar aprendiendo!» | `#0A4530` verdeHondo | `#97C137` acierto | **5.24** | AA | 11–16 px | 34 |
| ✅ | «The teacher is reading a book» | `#8A5A08` intentoTinta | `#FDF2DC` intentoFondo | **5.33** | AA | 18–19 px | 2 |
| ✅ | «¡Correcto!» | `#3F6B0E` aciertoTinta | `#EDF8D9` aciertoFondo | **5.73** | AA | 13–19 px | 3 |
| ✅ | «Tu madroño ahora es: Brote» | `#197249` verdeBosque | `#FFFFFF` blanco | **5.92** | AA | 16–24 px | 3 |
| ✅ | «Unirme a la clase» | `#0B3D57` | `#60C5FA` cielo | **5.97** | AA | 16 px | 1 |
| ✅ | «Exclusivo» | `#5C3D02` | `#F4C542` | **6.08** | AA | 10 px | 1 |
| ✅ | «Logros especiales» | `#F4C542` | `#0B3D6E` | **6.77** | AA | 13–19 px | 2 |
| ✅ | «Aprendé jugando, sin internet.» | `#0F5D3D` verde | `#F7F0E4` papel | **6.99** | AA | 16–32 px | 17 |
| ✅ | «Brote» | `#0F5D3D` verde | `#EDF8D9` aciertoFondo | **7.17** | AAA | 15–16 px | 2 |
| ✅ | «PIKO-HK26-XXXX-XXXX» | `#BFD9F2` | `#0B3D6E` | **7.56** | AAA | 13 px | 1 |
| ✅ | «Usar una lista de ejemplo» | `#0F5D3D` verde | `#FFFFFF` blanco | **7.91** | AAA | 13–32 px | 48 |
| ✅ | «Español» | `#FFFFFF` blanco | `#0F5D3D` verde | **7.91** | AAA | 16 px | 1 |
| ✅ | «Piko Hackathon 2026» | `#FFFFFF` blanco | `#14528F` | **7.97** | AAA | 13 px | 1 |
| ✅ | ««Aprendiste tu primera palabra en » | `#33453B` tinta | `#F7F0E4` papel | **9.02** | AAA | 13–16 px | 7 |
| ✅ | «0/1» | `#DDF1FC` nube | `#0B3D6E` | **9.47** | AAA | 13–16 px | 2 |
| ✅ | «Antes de abrir la sala» | `#0B3D57` | `#DDF1FC` nube | **9.93** | AAA | 13–19 px | 7 |
| ✅ | «Has recolectado 4 sacuanjoches» | `#33453B` tinta | `#FFFFFF` blanco | **10.22** | AAA | 13–16 px | 45 |
| ✅ | «El maestro está leyendo un libro» | `#16241D` grafito | `#F7F0E4` papel | **14.21** | AAA | 19–27 px | 7 |
| ✅ | «Twinkle, Twinkle, Little Star» | `#16241D` grafito | `#FFFFFF` blanco | **16.10** | AAA | 13–19 px | 58 |

✅ AA o AAA · ⚠️ «Sólo grande»: alcanza para texto grande pero estos son chicos · ❌ no cumple · ⏸️ control deshabilitado (WCAG lo exime).

### Ajustes de color propuestos

El color mínimo que pasa 4.5 : 1 manteniendo el tono:

| Dónde | Hoy | Propuesto |
|---|---|---|
| «Tocá para escuchar» (Ejercicio · Escuchar) | `#FFFFFF` blanco sobre `#60C5FA` cielo → 1.93 | `#0B3D57` → **5.97** |
| «¡Nuevo logro desbloqueado!» (Ejercicio · Escuchar, Logro desbloqueado) | `#E97927` copete sobre `#F7F0E4` papel → 2.56 | `#A8571C` → **4.58** |
| «El maestro está leyendo un lib» (Ejercicio · Seguí intentando) | `#A17832` sobre `#FDF2DC` intentoFondo → 3.60 | `#8A672B` → **4.66** |
| «Coleccionista de palabras» (Mis logros) | `#6B7A70` tintaSuave sobre `#F3EEE6` → 3.92 | `#627067` → **4.51** |
| «Un poquito cada día rinde much» (Practicar · Elegir tema, Ejercicio · Opción múltiple) | `#6B7A70` tintaSuave sobre `#F7F0E4` papel → 3.99 | `#627067` → **4.60** |
| «¡Salió el primer brote!» (Mi madroño) | `#6B7A70` tintaSuave sobre `#EDF8D9` aciertoFondo → 4.10 | `#657369` → **4.52** |

Lo más rendidor es **un solo cambio de token**: `tintaSuave` `#6B7A70`
está en 98 textos y sobre papel da
3.99 : 1. Llevarlo a `#627067` lo deja en AA sobre
todos los fondos claros de la app sin que se note el cambio.

## 2. Legibilidad

| Tamaño | Textos | Comentario |
|---|---|---|
| 10 px | 1 | ⚠️ Muy chico para lectores que empiezan: subir a 12–13 |
| 11 px | 3 | ⚠️ Muy chico para lectores que empiezan: subir a 12–13 |
| 13 px | 135 | Chico (ayudas) |
| 14 px | 4 |  |
| 15 px | 8 |  |
| 16 px | 112 | Cuerpo |
| 17 px | 5 |  |
| 18 px | 1 |  |
| 19 px | 57 |  |
| 20 px | 1 |  |
| 24 px | 17 |  |
| 27 px | 2 |  |
| 32 px | 8 |  |

- Alto de línea de 1.5 en el cuerpo (16/24) y 1.38 en el chico (13/18).
- Fredoka tiene formas redondas y abiertas, fáciles para quien está aprendiendo a leer.
- **Escalado del sistema**: React Native respeta el tamaño de letra del teléfono. Las tarjetas usan auto layout vertical, así que crecen; los botones son de una línea y se cortan con «…» si el texto no entra — probar con el tamaño de letra al 130 %.

## 3. Jerarquía visual

- **Una acción principal por pantalla**, siempre en verde, y siempre la primera.
- Títulos de pantalla en Display 32 verde; secciones en Subtítulo 19; rótulos en mayúsculas espaciadas.
- Piko y su globo marcan qué hay que hacer («Elegí la traducción correcta»).
- En los ejercicios, el enunciado (27 px) es lo más grande; las opciones (19 px) después; la instrucción (13 px, mayúsculas) arriba.

## 4. Tamaño de los elementos interactivos

WCAG 2.5.8 (AA) pide 24 × 24 como mínimo; Apple recomienda 44 × 44 y Android 48 × 48 dp.

| Pantalla | Elemento | Tamaño | |
|---|---|---|---|
| Practicar · Elegir tema | «Tenés 0 sacuanjoches. Ver mi árbol» | 60 × 34 | ⚠️ < 44 |
| Ejercicio · Opción múltiple | «✕» | 16 × 24 | ❌ < 24 |
| Ejercicio · Armar oración | «a» | 41 × 51 | ⚠️ < 44 |
| Logro desbloqueado | «Ver mi árbol» | 91 × 32 | ⚠️ < 44 |
| Inicio | «Español» | 87 × 36 | ⚠️ < 44 |
| Inicio | «Miskitu» | 82 × 36 | ⚠️ < 44 |
| Minijuegos | «Tenés 4 sacuanjoches. Ver mi árbol» | 59 × 34 | ⚠️ < 44 |

Notas:

- Algunos tienen `hitSlop` en el código (el área tocable es mayor que lo que se ve): el «✕» del ejercicio suma 12 px por lado (40 × 48), «Soy el maestro» 8 px. Igual conviene que el área visible sea de 44.
- Las fichas de una sola letra o palabra corta («a», «is») miden 41 px de ancho: subir el ancho mínimo de `Bloque` a 44.
- Los chips de idioma (36 px de alto) y el contador de sacuanjoches (34 px) deberían llegar a 44.

## 5. Uso adecuado del color

- **El significado nunca depende sólo del color.** Acierto: verde + «¡Correcto!» + Piko alegre. Intento: ámbar + la respuesta correcta + Piko animando. Una opción elegida además cambia el borde.
- **Sin rojo para el error**, por pedagogía y porque rojo/verde es el par que más confunde con daltonismo (deuteranopía, ~8 % de los varones).
- Verde `acierto` `#97C137` y ámbar `intento` `#E8A429` se distinguen también por luminosidad (1.02 : 1 entre sí), no sólo por tono.
- Los logros pendientes se ven en gris **y** con candado.

## 6. Navegación

- Botón atrás del sistema (Android) en todas las pantallas; en el prototipo de Figma, cada «Volver» lleva a la pantalla anterior.
- 73 props de accesibilidad en el código (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`): botones, opciones (con `selected`), Piko («Saludar a Piko»), tarjetas de acceso («Ver mi madroño y mi perfil»), insignias (con su avance).
- Orden de lectura = orden visual (todo es una columna con scroll).
- **A mejorar**: unificar dónde está «Volver» (encabezado arriba) y que el «✕» del ejercicio tenga `accessibilityLabel="Salir de la ronda"`.

## 7. Adaptación a diferentes usuarios

| Usuario | Cómo se atiende |
|---|---|
| Niños que recién leen | Piko explica con frases cortas; instrucciones en mayúsculas de 13 px y enunciado grande; tocar en vez de arrastrar. |
| Hablantes de miskito | Toda la interfaz en Miskitu (elegible en la portada). |
| Sin internet | Funciona offline; las fuentes y los audios van en la app. |
| Baja visión | Contraste AA en 79 % de los textos; respeta el tamaño de letra del sistema. |
| Sensibles al movimiento | Los minijuegos leen «reducir movimiento» del sistema. **A mejorar**: que la respiración de Piko y la lluvia de flores del logro también lo respeten. |
| Hipoacusia | En los ejercicios de escucha las opciones son palabras escritas y, si se falla, se muestra la respuesta. **A mejorar**: subtítulos en las canciones y una alternativa sin audio. |
| Maestros | Un solo botón grande por paso: abrir la sala, empezar la ronda, terminarla. |

## 8. Adaptación a dispositivos

- Diseñado a **360 × 800**: el Android de gama baja que llega a las escuelas.
- Una sola columna con scroll: nada se sale del ancho en 320 px.
- En pantallas anchas (tablet, web) sólo Mis logros y Canjear centran el contenido con un máximo (560 / 520 px). **A mejorar**: aplicar ese máximo en `Pantalla` para todas, así una tablet no estira los botones a lo ancho.
- Sin sombras, blur ni degradados: rinde en gama baja.
- Áreas seguras (notch, barra de gestos) respetadas por `Pantalla` (`SafeAreaView`).

## Plan de ajustes

| Prioridad | Ajuste | Dónde |
|---|---|---|
| Alta | Subir `tintaSuave` a `#627067` | `app/src/ui/tokens.ts` |
| Alta | Textos en `copete` (título de la celebración, «🔥 racha» del ejercicio) → `#A8571C` | `app/src/ui/logros/Celebracion.tsx`, `app/src/features/exercises/Runner.tsx` |
| Alta | Texto «Tocá para escuchar» en `#0B3D57`, como el texto del botón celeste | `app/src/features/exercises/EjercicioOpciones.tsx` |
| Alta | «✕» de salir a 44 × 44, con etiqueta y confirmación | `app/src/features/exercises/Runner.tsx` |
| Media | Chips de idioma y contador a 44 px de alto; ancho mínimo 44 en `Bloque` | `app/app/index.tsx`, `ContadorSacuanjoches.tsx`, `Bloque.tsx` |
| Media | Textos de 10–11 px a 12 px como mínimo | `app/app/logros/index.tsx` |
| Baja | Respetar «reducir movimiento» en Piko y en el festejo de logros | `PikoMascota.tsx`, `Festejo.tsx` |

---

<sub>Generado por `figma/captura/documentar.mjs` a partir de la captura del 9 de octubre de 2026. Las cifras y tablas salen de la app real; para actualizarlas, ver [figma/README.md](../../figma/README.md).</sub>
