# Cómo contribuir a Piko

Gracias por llegar hasta acá. Piko existe para que el miskito, el mayangna, el
rama y el garífuna sigan hablándose en las aulas rurales de Nicaragua, y eso no
lo logra un equipo solo.

Hay **dos formas muy distintas** de ayudar, y las dos importan igual.

---

## 1. Aportar contenido en una lengua

**Esta es la contribución que más falta hace, y no requiere saber programar.**

Hoy Piko sólo tiene contenido en inglés. Las cuatro lenguas indígenas tienen el
formato listo y están vacías **a propósito**: el vocabulario y la pronunciación
tienen que venir de hablantes nativos o de material lingüístico publicado.
Inventarlos sería enseñarle una lengua falsa justo a los niños que están
tratando de conservarla.

### Si hablás una de estas lenguas, o trabajás con quienes la hablan

No hace falta que toques código ni que sepas usar Git. Abrí un
[aporte de contenido lingüístico](../../issues/new?template=aporte-linguistico.yml)
y escribí las palabras y frases ahí mismo, en texto plano. Nosotros nos
encargamos de convertirlo al formato de la aplicación.

Lo que sirve:

- Palabras o frases con su traducción al español.
- El tema al que pertenecen (saludos, familia, números, colores, animales…).
- Grabaciones de audio, si es posible — aunque sea con el teléfono.
- La fuente: quién lo dijo, de qué comunidad, o de qué libro o diccionario salió.

Lo último no es burocracia. Estas lenguas tienen variantes entre comunidades, y
queremos poder decirle a un maestro de dónde viene lo que su alumno está
aprendiendo.

### Si preferís mandarlo como código

El formato completo está documentado en
[`app/content/README.md`](app/content/README.md). En resumen: se agrega un
`.json` en `app/content/packs/<idioma>/`, se registra en `index.ts`, y se
verifica con:

```bash
cd app && npm run validate:packs
```

El validador **rechaza a propósito** la síntesis de voz en las cuatro lenguas
indígenas. Si un paquete pide TTS en miskito, mayangna, rama o garífuna, falla.
Eso es intencional: preferimos no tener audio a tener una pronunciación
inventada por una máquina.

---

## 2. Contribuir código

### Preparar el entorno

```bash
cd app
npm install
```

### Antes de mandar cualquier cambio

```bash
npm test              # 121 pruebas sobre el núcleo puro y la persistencia
npm run typecheck     # app + herramientas de Node
npm run validate:packs
```

Los tres tienen que pasar. CI los corre igual en cada pull request.

### Probar el aula sin tener teléfonos

```bash
npm run sim -- --students 8 --rondas 2
```

Levanta un host real y ocho clientes reales sobre TCP en localhost, con el mismo
código que corre en los teléfonos: juega dos rondas, desconecta un teléfono a
mitad de camino, lo reconecta y verifica que todos converjan.

### La regla que sostiene la arquitectura

**`app/src/core/` no importa React Native. Nunca.**

Ese directorio es TypeScript puro: el protocolo del aula, la sincronización
diferencial, el motor de progreso y la corrección de respuestas. Por eso todo
eso se prueba en Node en dos segundos, y por eso la misma lógica corre igual en
el simulador y en un teléfono de gama baja.

Si tu cambio necesita meter un import de React Native en `core/`, casi seguro
está en el archivo equivocado. Los detalles están en
[`docs/arquitectura.md`](docs/arquitectura.md).

### Restricciones que no son negociables

Piko está diseñado para un contexto muy específico, y estas decisiones son parte
del producto, no descuidos:

- **Nada puede depender de internet.** No hay servidor, no hay nube, no hay
  cuentas. Si una función necesita conexión para funcionar, no entra.
- **El progreso pertenece al estudiante, no al aparato.** Un niño tiene que
  poder jugar hoy en un teléfono prestado y mañana en otro sin perder nada.
- **Piko refuerza, no regaña.** El error nunca se pinta de rojo y el XP jamás
  baja. Un niño que está aprendiendo la lengua de su comunidad no necesita que
  una app le diga que la habla mal.
- **Tiene que correr en gama baja.** Si algo sólo se ve bien en un teléfono
  caro, no sirve para el aula a la que vamos.

### Estilo

El código y los comentarios están en español, igual que la documentación. Segui
la convención que ya ves en los archivos vecinos.

---

## Reportar un problema

- ¿Algo no funciona? [Reportá un error](../../issues/new?template=error.yml).
- ¿Se te ocurre algo? [Proponé una idea](../../issues/new?template=idea.yml).
- ¿Encontraste un problema de seguridad? No abras un issue público — mirá
  [SECURITY.md](SECURITY.md).

Si algo no te queda claro, abrí un issue y preguntá. Preferimos responder una
pregunta a que alguien se vaya sin contribuir.

---

## Convivencia

Al participar aceptás el [Código de Conducta](CODE_OF_CONDUCT.md).

Un punto que va más allá del código de conducta habitual: **estas lenguas
pertenecen a las comunidades que las hablan.** Las decisiones sobre qué se
enseña y cómo se pronuncia las tienen ellas, no nosotros ni quien escriba el
código. Cualquier aporte de contenido se acepta con esa premisa.

---

## Licencia

Piko se distribuye bajo la [Licencia MIT](LICENSE). Al contribuir, aceptás que
tu aporte se publique bajo esos mismos términos.

---

<sub>**English:** contributions are welcome. The project's language is Spanish,
but issues and pull requests in English are perfectly fine — we will reply in
whichever language you write in. The most valuable contribution is language
content from native speakers of Miskito, Mayangna, Rama or Garífuna; no coding
required. See [`README.en.md`](README.en.md) for an overview in English.</sub>
