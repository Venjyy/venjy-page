# Minijuego Salonas · «La Gira» (juego de ritmo con su bajo)

Diseño acordado con el dueño el 2026-10-21 (rama `salonas-diseno`, solo docs). El plan de PRs está en
`mundo/PENDIENTES.md`, buscar «Minijuego Salonas». El combate (`mundo/COMBATE.md`) no se toca.

Regla de la memoria: un minijuego es un **juego completo**. Lleva escenario propio, canciones de verdad,
dificultad y sensación, no una mecánica pelada. La referencia es la carrera de gatas (7h-1): un juego dentro
del juego que se dibuja en lugar del mundo y se carga con `import()` solo al abrirlo.

## 1. Decisiones del dueño (2026-10-21)

| Tema | Decisión |
|---|---|
| Canciones | Las compone Claude como datos en `musica.json`. El dueño puede retocarlas, pero no sabe de música: la partitura **no se escribe a mano**, sale sola de la línea de bajo (§4). |
| Estilos | **Cada canción tiene un estilo distinto**, no todas tipo Primus. Primus queda en una sola: el tema jefe. |
| Cantidad | **6 canciones**, 2 por local. |
| Carriles | **4**. En PC: D F J K. En el celular: 4 zonas grandes abajo. |
| Dificultad | **Fácil, Normal, Difícil y Experto, más Práctica** (una sección, más lenta). En Fácil no se pierde. |
| Premios | **Estrellas (1-5) y récords** por canción y nivel. Sin objetos ni esmeraldas. |
| Escenario | **Escena propia con 3 locales**: sala de ensayo, bar y festival. |
| Con otros | **Salonas es la base**: se juega en solitario. Después, 7h-3 (el concierto) reusa el motor para tocar en grupo. |
| Codex | Hace **PRs chicos con contrato y prueba**: lógica pura con una prueba de Node escrita antes por Claude, o pantallas del Estudio que siguen un patrón. Claude revisa el diff (§9). |

## 2. Qué es

Salonas te presta su bajo y salen de gira con Conejeros. Tú tocas la línea de bajo, Salonas toca la guitarra
y dirige, y Conejeros toca la batería. Las notas bajan por 4 carriles hacia la línea de golpe, sincronizadas
con el audio. Cada local tiene su público, sus luces y sus dos canciones. La última canción del festival es
el **tema jefe**: en el solo, Salonas toca una frase y tú la repites.

**Entrada**: en el panel de Salonas, el botón «Ensayar con Salonas» abre el menú de la gira. Es el mismo patrón
de `CARRERA_BOTON` en `minijuegos-datos.js`: `salonas.js` se carga con `import()` al usarlo.

**Flujo**: menú de la gira (los locales con sus canciones, dificultad, estrellas y récords) → intro corta en el
local (cámara de cine, Salonas presenta la canción) → canción → final (estrellas, precisión, combo máximo,
récord nuevo) → «Otra vez», «Siguiente» o «Salir». Con Esc se pausa (el audio se suspende y vuelve con una cuenta de 3).

**Los locales y sus canciones** (todas abiertas desde el inicio, porque el dueño no eligió desbloqueos; los
nombres los eligió el dueño el 2026-10-21, ver `musica.json`):

| Local | Canción | Estilo | bpm aprox. | Lo que enseña |
|---|---|---|---|---|
| Sala de ensayo | 1 | Reggae / ska relajado | 90 | notas simples a tiempo, contratiempo |
| Sala de ensayo | 2 | Rock garage | 120 | corcheas seguidas, notas largas |
| Bar | 3 | Cumbia chilena (la decidida para 7h-3) | 100 | patrón tónica-quinta, síncopa |
| Bar | 4 | Funk disco | 112 | slap y pop, octavas |
| Festival | 5 | Metal / thrash | 150 | velocidad, galope |
| Festival | 6 | **Tema jefe**: rock progresivo estilo Primus (7/8, sale del «Gallo cósmico» de `bajo.js`) | 150 | cambios de compás y duelo de solos |

Los 3 riffs que Salonas toca junto al escenario de la aldea (`criaturas/bajo.js`) siguen igual. Una idea para
después (no está aprobada): que al terminar la gira esas canciones entren a su rotación de la aldea.

## 3. Canciones completas (motor)

Hoy `musica.json` hace **loops por nivel** (`tocarPaso`, con probabilidad y swing). Una canción de ritmo necesita
tres cosas que no existen todavía:

1. **Secciones**: `canciones.<clave>` en `musica.json` con `estructura`, una lista de
   `{ seccion, compases, nivel, tempo? }`, donde cada sección (intro, verso, coro, puente, solo, final) tiene
   sus capas. También trae los cambios de tempo y de compás (`pasos` por sección).
2. **Determinista**: en una canción no se sortea nada (`prob` y swing aleatorio se ignoran o usan semilla
   fija). Si no, el audio y la partitura se separan.
3. **Bajo con notas explícitas**: la capa `bajo` usa el formato de `bajo.js`, `[paso, tipo, nota, duración, extra]`,
   con los tipos `s` slap, `p` pop, `g` fantasma, `t` tapping, `d` glissando, `r` rasgueo y `a` armónico. La voz
   del bajo es la de `bajo.js` (saturación, formante nasal), que pasa a ser un instrumento del motor.

`mapaTiempo(cancion)` (puro) da, para cada paso, su segundo exacto, contando los cambios de tempo. Lo usan el
audio y la partitura, y así no pueden separarse.

**Hecho en S1** (detalle en `estudio/DISENO.md` §24): la sección es `{ seccion, compases, nivel?, bpm?, pasos? }` y
toca las capas cuyo `niveles` incluye su nivel (sin `nivel`, el nombre de la sección). La capa de bajo es
`{ inst: "bajoSlap", bajo: [...], compases }`, y la voz está en `musica-bajo.js` (`vozBajo` la ajusta por canción).
En una canción, `prob` es un error de `revisarCancion` y el swing ya viene en el mapa. Para la partitura (S2):
`mapaTiempo(c).pasos[x]` = `{ t, n, k, i, s }`, y la nota del bajo del paso es la de la capa `bajo` del nivel de la sección
en el índice `(k % compases) * pasos + i`.

**Hecho en S4** (2026-10-21): `canciones.sala-ska` (1) y `canciones.sala-garage` (2). Convención para las que siguen: la nota normal del bajo es `t` con su sonido en `vozBajo.tecnicas.t` de la canción; `s` y `p` quedan para los acentos (salen marcadas en la partitura). Una canción admite 24 capas como mucho.

### 3b. Visión musical del dueño (2026-10-21; guía para S4, S6 y S7)

Banda sonora variada pero coherente: mucho ritmo, grooves llamativos y contraste emocional entre los temas.
Mezcla dos mundos: **funk rock y metal alternativo llevados por el bajo** con **bolero, vals y melancolía
latinoamericana acústica**.

- **«John The Fisherman» (Primus)**: bajo percusivo, rítmico y dominante (slap, pop y síncopa). Avanza con
  fuerza y mantiene la tensión entre verso y coro. De su riff principal (4/4, ~115 bpm), tomar la *forma*:
  dobles cuerdas que suben por semitonos en corcheas, una nota muteada o grave entre los grupos y un remate que
  sube al final de cada frase de 2 compases. Es la inspiración de los temas de acción.
- **«Los Continentales» (Macha y El Bloque Depresivo)**: vals melancólico en 6/8, frases que fluyen una en otra,
  bajo caminante y suave (fundamental y quinta, bajando por grados), nostálgico pero bailable. La progresión de
  referencia es D — F#m — Em — A/G.
- **«Jerry Was a Race Car Driver» (Primus)**: el tempo que acelera y la polirritmia del bajo, para los
  momentos de máxima acción (el tema jefe).

Reglas de composición:
- Melodías y riffs **100 % originales**: las referencias son de estilo, nunca se copian notas ni frases.
- El bajo se escucha claro **sin tapar la batería** ni a los otros instrumentos (cuidar `vozBajo.vol`, la
  octava y el lugar del bombo frente a las notas graves).
- Cada canción tiene la estructura completa (verso, precoro y coro) y el coro con una **intensidad rítmica**
  claramente mayor.
- Pendiente de decidir con el dueño en S4: cómo entran el vals en 6/8 y el bolero en los 6 estilos de §1
  (por ejemplo, la cumbia o una de las canciones del bar pasa a ser vals melancólico).

## 4. La partitura sale del bajo (por qué el dueño no puede romperla)

`partitura(cancion, dificultad)` es puro y determinista. Lee la capa `bajo` y arma las notas del juego:

- **Carril**: según la altura de la nota dentro de su frase (contorno relativo, no la nota absoluta). La nota
  más grave de la frase va a la izquierda y la más aguda a la derecha. Las notas repetidas se quedan en su carril.
- **Por dificultad** (los valores van en `salonas.json`):
  - Fácil: 2 carriles, solo los tiempos fuertes y nunca dos notas a menos de `fácil.minSep` s.
  - Normal: 3 carriles, hasta corcheas.
  - Difícil: 4 carriles, todas las notas menos las fantasma.
  - Experto: todo, con notas **largas** (las de duración ≥ 1 tiempo, que se mantienen) y **acordes** (rasgueo = 2 carriles a la vez).
- **Slap y pop**: notas marcadas (naranja y celeste). Se tocan con la misma tecla, pero tienen una ventana más
  estrecha y dan más puntos. Así funcionan igual en el celular.
- **Frases Primus**: cada coro marca sus notas como «brillantes». Si las aciertas todas, cargas el Modo Primus (§6).

**Si el dueño cambia la música**, la partitura se regenera sola. Lo que puede tocar sin miedo en la pestaña
Música: el sonido de cada instrumento, el volumen, el tempo (±10 %) y cuántas veces se repite una sección.
Si cambia notas del bajo, **«Revisar partitura»** avisa de lo que quede injugable: más de `maxNotasSeg` notas
por segundo en el nivel, notas a menos de `minSep`, acordes imposibles en Fácil o Normal, una sección sin notas
o una nota fuera de la escala del acorde (este último es un aviso suave: a lo mejor es a propósito).

**Ajustes a mano sin saber música**: en la pestaña Ritmo (§8), el dueño puede mover una nota de carril, quitarla
o volver a la generada, para cada dificultad. Se guarda aparte (`ajustes.<cancion>.<dificultad>`, con la clave
`compás:paso`) y nunca cambia cuándo suena una nota, solo dónde cae. Si la música cambia y un ajuste queda
huérfano, la revisión lo avisa.

**Contrato en S2** (lo implementa Codex en S2b): las firmas y las reglas están en `mundo/supervivencia/salonas-partitura.js`
y la prueba en `mundo/tests/salonas.mjs`. Decisiones de Claude: la frase del contorno es una vuelta de la capa de bajo; los
tiempos fuertes salen de una rejilla por pasos del compás (16: cada 4; 12, el 6/8: pasos 0 y 6; 14, el 7/8: 0, 4 y 8), y
Normal toma los pasos pares; el rasgueo es acorde solo en Experto (los demás lo tocan como una nota); el ajuste a mano usa
la clave `compás:paso` con el compás contado en toda la canción.

## 5. Sincronía y juicio

- **Reloj**: el de `AudioContext.currentTime`. El audio se programa con anticipación (`crearSecuenciador`). La
  posición de las notas en pantalla se calcula con la misma hora, nunca con cuadros contados.
- **Hora de una pulsación**: `performance.now()` del evento, pasada a la hora del audio con
  `getOutputTimestamp()`. A eso se le resta `outputLatency` y la **calibración** del jugador.
- **Calibración** (en el menú): tocas 8 veces al ritmo de un metrónomo y se toma la mediana del desfase. Se
  guarda en `localStorage` (con try/catch) y se puede cambiar con un número.
- **Ventanas** (en `salonas.json`): Perfecto ±45 ms, Bien ±90 ms y OK ±135 ms. Fuera de eso es fallo. Slap y pop usan el 70 % de la ventana.
- **Fallo**: el bajo se apaga un momento y suena una cuerda muerta. La música nunca se detiene.

## 6. Puntaje, energía y estrellas

- Puntos por nota según el juicio. **Combo** con multiplicador ×1 → ×4 (cada `combo.paso` notas seguidas).
- **Modo Primus** (el «poder estrella»): se carga con las frases brillantes y se activa con Espacio (o con el
  botón táctil). Dura `primus.seg` s y dobla el multiplicador. Salonas grita «¡PRIMUS SUCKS!», las luces cambian
  y el público salta.
- **Energía del público** (Normal en adelante): sube con aciertos y baja con fallos. Si llega a cero, te
  abuchean y la canción termina. En Fácil la energía nunca baja de `facil.pisoEnergia`.
- **Estrellas**: de 1 a 5 según el porcentaje del puntaje máximo posible (umbrales en `salonas.json`). Se
  guardan el récord y las estrellas por canción y dificultad, igual que guarda la carrera.
- **Práctica**: eliges una sección y una velocidad (50-100 %; el audio baja el tempo y la partitura se recalcula
  con el mapa de tiempo nuevo). No cuenta para los récords.
- Amistad: la regla general de los minijuegos (`AMIGOS_MINIJUEGO.salonas = ['salonas', 'conejeros']`) se aplica
  como en los demás, salvo que el dueño diga lo contrario (está anotado como pregunta abierta en §10).

## 7. Escenario, cámara y personajes

- **Escena propia** (`salonas-escena.js`, como `carrera-escena.js`): se dibuja en lugar del mundo mientras se
  juega, y el mundo sigue andando.
  - **Sala de ensayo**: garage con colchones en las paredes, amplis, cables, una lámpara colgando, afiches pixelados propios y Conejeros en la batería.
  - **Bar**: tarima chica, barra, mesas con amigos de público (Pony, Hadad, Andy...) y letreros de neón propios.
  - **Festival**: escenario grande con torres de luces, pantallas, humo, una multitud de cubos que salta con la energía y fuegos artificiales de píxeles en el Modo Primus.
- **Carriles**: una autopista de 4 carriles en 3D, inclinada desde abajo hacia el escenario, como en Guitar Hero.
  Detrás se ve el local. La línea de golpe tiene 4 trastes de colores que se encienden al tocar. Los acordes
  salen unidos con una barra y las notas largas con su cola. En el celular, las zonas táctiles son los mismos 4 trastes.
- **Cámara**: planos de intro por local (cámara de cine del marco común). Mientras juegas, la cámara queda fija
  detrás de los carriles y se mece al pulso. Se acerca a Salonas en su solo y se abre en el Modo Primus.
- **Animaciones** (con la skill `animaciones-minecraft`, primero Haiku y después Sonnet según su §0): tu cuerpo
  toca el bajo (la mano de los trastes se mueve con el carril y la del slap golpea). Salonas toca la guitarra,
  cabecea y salta en el coro. Conejeros toca la batería al pulso real. El público aplaude o abuchea.
- **Hecho en S5** (2026-10-21): `salonas-escena.js` (locales, banda, público, luces) y `salonas-gestos.js` (gestos puros).
  La banda queda a los lados de la autopista mirando a la cámara (Salonas a la izquierda, tú a la derecha, Conejeros
  atrás a la izquierda en su tarima); en el bar el público está en las mesas de adelante y en el festival en un foso
  delante del escenario. Mientras no haya solos (S7), el acercamiento a Salonas también sale en el puente.
- **HUD** con PixelCraft y la estética Minecraft: puntaje, combo, multiplicador, barra de energía, carga del
  Modo Primus, avisos grandes («¡×4!», «¡Modo Primus!», «Perfecto») y el progreso de la canción.

## 8. Todo editable en el Estudio

- **`mundo/datos/salonas.json`** (esquema `salonas.schema.json`): locales (colores, luces, público y planos),
  canciones de la gira (clave de `musica.json`, local, nombre ES/EN y dificultades activas), ventanas de
  juicio, puntajes, combo, Modo Primus, energía, umbrales de estrellas, reglas por dificultad, colores de los
  carriles, teclas, layout táctil (página `salonas` en `ui-layout.json`) y textos ES/EN.
- **Pestaña Ritmo** (nueva, `estudio/ritmo.js` + `estudio/ritmo-modelo.mjs`): selector de canción y
  dificultad, vista de la partitura como línea de tiempo (secciones con color, notas en sus 4 carriles),
  «Revisar partitura» con avisos, ajustes a mano (§4), «Probar en el juego desde esta sección» (mensaje
  `salonas { accion, cancion, dificultad, seccion }`) y los ajustes de `salonas.json` en grupos.
- **Pestaña Música**: las canciones aparecen con su estructura (las secciones en orden) y la marca «tiene partitura».

## 9. Codex: qué hace y cómo se supervisa

**Codex sí hace** (riesgo bajo y fácil de revisar):
- Lógica pura con una prueba de Node que Claude escribe antes (el «contrato»): partitura, juicio, puntaje,
  estrellas y revisión. Si la prueba pasa y el diff solo toca los archivos de la lista, está bien.
- Esquemas JSON y grupos de campos del Estudio que copian un patrón existente (por ejemplo, la pestaña Carrera).
- Textos ES/EN en los JSON de datos.

**Codex no hace**: el audio y la sincronía, la cámara, las animaciones, `main.js`, el motor de música
(`musica-motor.js`), la composición de canciones, el combate, ni cambiar valores que el dueño ya editó.

**Cómo se encarga** (el prompt va en el PR o en la bitácora, y sigue la skill `delegar`):
1. Claude crea la rama `codex/salonas-<pr>` con la prueba-contrato ya escrita (falla) y las firmas de las funciones.
2. El encargo de Codex lista los **archivos permitidos**, la prueba que tiene que pasar, «no tocar nada más» y
   los comandos de `AGENTS.md`.
3. **La revisión de Claude es barata, sin leer todo**:
   ```
   git diff --name-only main...codex/salonas-<pr>   # solo los archivos permitidos
   node estudio/cli.mjs validar --contra HEAD
   node mundo/tests/<prueba>.mjs
   ```
   y después `caveman-review` del diff. Si algo sale de la lista o la prueba no pasa, se devuelve a Codex con el error y Claude no lo arregla.
4. Si Codex falla dos veces en el mismo PR, el PR pasa a Sonnet.

## 10. Preguntas abiertas (para el dueño, sin apuro)

- Hecho (2026-10-21): nombres de las 6 canciones y del juego («La Gira» / «The Tour»).
- Si jugar la gira suma amistad con Salonas y Conejeros como los otros minijuegos (propuesta: sí, la regla general).
- Si al terminar la gira las canciones entran a la rotación de Salonas en la aldea.
