@AGENTS.md

# Venjy · portafolio

Sitio estático sin build: `index.html`, `style.css`, `script.js`. Español por defecto, inglés vía atributos `data-es` / `data-en`.

## Ejecutar

- Servidor local: `node estudio/servidor.mjs` (puerto 5510, o `PORT=…`; `--lan` para probar en el celular; configurado en `.claude/launch.json` como `venjy`). Sirve todo con ETag y es el único que guarda desde el editor del Estudio (`http://localhost:5510/estudio/`). `python -m http.server 5510` sigue sirviendo, pero solo de lectura y sin ETag. Ya no se puede abrir `index.html` con doble clic: `script.js` y el mundo 3D usan módulos ES y necesitan servidor o hosting.

- **El juego dentro del Estudio**: `supervivencia.html?estudio` abre (o crea) el mundo «Estudio» en Pacífico y escucha al Estudio por el canal `venjy-estudio` (pestaña Juego de `/estudio/`; `?estudio=tactil` fuerza los controles táctiles). Sin `?estudio` no se carga nada nuevo. En el celular con `--lan` el juego se actualiza solo cuando cambia un JSON de `mundo/datos/` (`GET /api/eventos`).

## Mapa del proyecto

- `script.js` genera en canvas el mapa de Minecraft, las texturas, los íconos pixelados y los estandartes. No hay imágenes para eso.
- `PRODUCT.md`: audiencia, contenido y datos de ProcedimientoSeguro. `DESIGN.md`: tokens y reglas visuales. Léelos antes de cambiar contenido o diseño.
- `estudio/`: editor visual, servidor y CLI (no se publica). `mundo/datos/`: JSON que lee el juego.
- `images/`: fotos, GIFs y CVs. Los GIFs pesan varios MB; no los abras, refiérete a ellos por nombre.
- No leer salvo que se pida: `respaldo-2026-10-06/` (versión anterior), `.impeccable/review/` (capturas), `centroeventostest/` (demo aparte).

## Convenciones

- **Si un pedido es grande, avisarlo y proponer hacerlo en un chat dedicado.**

- **Seguir en el mismo chat por defecto** (dueño, 2026-10-21): un PR por tarea, pero no un chat por tarea. Al abrir un PR, si la parte siguiente es del mismo tema, el chat no se ha resumido y no viene de una tarea grande, seguir aquí en una **rama apilada** sobre la del PR abierto (al fusionarse, el PR siguiente queda solo con su diff). Cortar a un chat nuevo solo si cambia el tema, el chat ya se resumió o se cargó, o la parte siguiente pide otro modelo.
- **Al abrir cada PR** (o al escribir un plan): entregar el prompt de traspaso (máximo ~10 líneas: rama, qué falta y qué leer con funciones o rangos de líneas concretos, no archivos enteros) con el modelo y el effort recomendados; es el respaldo si se corta. Cómo, en la skill `.claude/skills/traspaso-chat/`.

- **Nunca** incluir enlaces de sesión (`claude.ai/code/session…`) ni la línea «Generated with Claude Code» en commits, PRs, comentarios o archivos del repo (ni la línea `Claude-Session:` en los commits).

- **Cierre liviano** (desde 2026-10-11, para ahorrar uso):
  - **Artifact** solo al fusionar una fase completa o si el dueño lo pide: receta de `.claude/artifacts/GUIA.md` (camino corto: copiar `.claude/artifacts/contenido-6c1.mjs`, cambiar el contenido y generar con `.claude/artifacts/plantilla.mjs`; enlazarlo en el PR).
  - **Medición de carga** de `supervivencia.html` solo si el cambio toca lo que carga sin `?estudio`; si no, en el PR: «no aplica: no cambia la carga».
  - **Pruebas de navegador**: solo la nueva o la directamente afectada; las demás van en el PR como «pendientes del dueño». Siempre: las pruebas de Node y `node estudio/cli.mjs validar --contra HEAD`.
  - **Prueba visual** (sliders, canvas, cómo se ve): la hace el dueño; el PR trae una lista corta de «qué mirar».
  - **Docs**: en cada chat, `mundo/PENDIENTES.md` (bitácora) y la sección de la fase en `estudio/DISENO.md`; `CLAUDE.md` y `mundo/supervivencia/MAPA.md` solo si cambió algo que un agente futuro necesite saber.
- **Todo lo que se desarrolle debe poder modificarse y ajustarse desde el Estudio (`/estudio/`) por el dueño**: posiciones, giros, escalas, colores, tiempos, textos, medidas y cualquier valor que afecte cómo se ve o se siente. Los valores van en `mundo/datos/*.json` (o con su valor base en el código y un ajuste en el JSON, como `objetos-mano.json`), con esquema en `estudio/esquemas/` y control en la pestaña que corresponda. Si algo nuevo no cabe en ninguna pestaña, crear el campo o la pestaña, o dejarlo anotado en `mundo/PENDIENTES.md` y en el PR como «no editable aún». Nunca dejar números mágicos que solo se cambien tocando el código.
- **El Estudio tiene que poder usarlo una persona sin conocimientos (pedido del dueño, 2026-10-21).** Cada pestaña nueva o que se toque lleva una **vista simple** por defecto (con «Avanzado» para lo fino): menos opciones, nombres en lenguaje común, valores que se calculan solos y **bases para partir** (en Música, elegir un estilo y empezar con su base de ritmo, bajo y acordes; en Poses y Escenas, partir de una pose o escena parecida). En animación el personaje es **reactivo**: lo que lleva en la mano (arma, guitarra, objeto) sigue a la mano solo, sin animarlo aparte; los pies se apoyan solos (suelo automático) y lo que se pueda deducir no se pide. Si algo exige entender el rig, los canales o el JSON, falta una capa simple encima. Detalle y tareas en `mundo/PENDIENTES.md` «Estudio simple».
- Todo texto visible lleva su par `data-es` / `data-en`.
- Solo fuente `PixelCraft`; sin emojis como íconos (se dibujan en `ICONOS` de `script.js`).

## Contenido nuevo en JSON (Estudio)

Diseño y fases en `estudio/DISENO.md`; esquemas en `estudio/esquemas/`.

- Las posiciones, el layout táctil, los ángulos de poses, los textos ES/EN y los precios **nuevos** van en `mundo/datos/*.json`, siempre que el juego ya lea ese archivo (`lee` distinto de `null` en `mundo/datos/indice.json`). Si todavía no lo lee, siguen en JS como hasta ahora.
- La lógica sigue en JS y solo lee el JSON. Si falta una clave, el juego usa el valor del código.
- Nunca sobrescribir valores que el dueño editó a mano: solo añadir claves. Cambiar un valor existente solo si él lo pide (`node estudio/cli.mjs validar --contra HEAD` lo avisa; `--permitir-cambios` si lo pidió).
- Lo viejo se migra a JSON solo cuando se toca por otro motivo.
- **Posiciones de personas**: `mundo/datos/posiciones.json` (lo lee `amigos.js`). Se mueven en `/estudio/` → pestaña Posiciones (gizmo en el juego) o con `node estudio/cli.mjs resumen posiciones` para leerlas. Un agente solo agrega claves; si mueve a alguien es porque el dueño lo pidió.
- Escenas de amistad y escenas nuevas con guion: `mundo/datos/escenas.json` (lo lee `escena-amistad.js`; las de tipo `amistad` reemplazan por clave a `ANIMACIONES`; las de tipo `guion` se juegan con `/amistad guion <clave> [persona]` y, si traen `dispara` (B3b), reemplazan a la bienvenida, el momento, el reencuentro o el grupo de JS que les toca; lo único va por nombre en `CODIGO_ESCENAS`, `supervivencia/codigo-escenas.js`; prueba `node mundo/tests/escenas-motor.mjs`). Se editan en `/estudio/` → pestaña Escenas (línea de tiempo: arrastrar y estirar bloques, Reproducir en el juego; editar una escena «en código» la copia al JSON; panel **Cámara**: `camara.planos` = `amistad` | `grupo` | `grupo-techo` o lista propia de planos, «Ver» reproduce con solo ese plano; sin `camara` el juego usa sus planos de siempre, los de `PLANOS_*` en `escena-amistad-datos.js`). Esquema en `estudio/esquemas/escenas.schema.json`; qué queda en JS, en `estudio/DISENO.md` §13. `resumen escenas` las lista.
- Para leer contenido, primero `node estudio/cli.mjs resumen [archivo|js:tienda|js:amistad] [clave]` en vez de abrir los `*-datos.js` (los diálogos de «Hablar» ya son `dialogos.json`: `resumen dialogos pony`; `dialogos-datos.js` es solo la fachada). Los textos de «Hablar» se editan en `/estudio/` (pestaña Textos) o en `mundo/datos/dialogos.json`; `node estudio/cli.mjs resumen dialogos --md --escribir` regenera `mundo/DIALOGOS.md`. La marca `revisado` la pone solo el dueño. Al cambiar un JSON: `node estudio/cli.mjs validar` y `node mundo/tests/estudio.mjs`. Capturas medidas: `node estudio/cli.mjs capturar layout acostado | pose <clave> | gesto <clave> --hoja | escena <clave> --medir "manoD()"` (levanta su propio servidor; Playwright por `PLAYWRIGHT=<carpeta del paquete>` o `npm i -g playwright-core`, ver `estudio/playwright.mjs`). `node mundo/tests/estudio-navegador.mjs` prueba el puente con un navegador real (se omite sin Playwright); `estudio-escenas-navegador.mjs` y `estudio-posiciones-navegador.mjs`, lo mismo para las pestañas Escenas y Posiciones (tocan su JSON un momento y lo dejan como estaba). Lo que está en `ui-layout.json` (botones táctiles) se edita arrastrando en `/estudio/`.
- **Píxeles** (`/estudio/` → pestaña Píxeles, `estudio/pixeles.js`): el dueño pinta los íconos de objetos (`mundo/datos/iconos.json`, 16×16), el retrato de cada carta, el reverso y los colores del marco (`cartas-arte.json`), y crea objetos y cartas nuevos como borrador (`borradores.json`, el juego no lo lee). «Termínalos e impleméntalos»: `node estudio/cli.mjs resumen borradores --completo` y la skill `datos-json` §6 (en las cartas el agente programa el efecto y dibuja el retrato único). Formato de los dibujos: `mundo/datos/pixeles.js`; prueba `node mundo/tests/pixeles.mjs`.
- **Objetos nuevos** (B6d, `estudio/DISENO.md` §42): `mundo/datos/objetos.json`, pestaña Objetos nuevos; cada objeto con id fijo desde 1024 (`siguienteId` solo sube; los del código quedan bajo 1024). `objetos.js` los carga con top-level await antes que nadie lea `O`. `resumen objetos`; prueba `node mundo/tests/objetos-datos.mjs`.
- **Música** (`mundo/datos/musica.json`, pestaña Música; `estudio/DISENO.md` §24): temas de capas y sintetizadores propios; un tema con la clave de uno del código lo reemplaza y `"borrador": true` no suena. «Aplica la música que creé»: `node estudio/cli.mjs resumen musica`, quitar `borrador` o dar la clave del tema que reemplaza (o apuntar `carrera.json → musica.temas`); prueba `node mundo/tests/musica.mjs`.
- **Personas nuevas** (B5, `estudio/DISENO.md` §41): solo datos en `mundo/datos/personajes.json` (nombre, apariencia, lugar, postura, horario, globo, frases, «Hablar», regalo, amigos; modelo en `mundo/datos/personajes.js`), pestaña Personajes del Estudio; para los 9 de `amigos.js` solo `apariencia`. `resumen personajes`; prueba `node mundo/tests/personajes.mjs`.
- Gestos nuevos (valor base, claves y senos; ver `estudio/esquemas/poses.schema.json`) van a `mundo/datos/poses.json`: el juego lo lee (`mundo/datos/gestos.js`) y un gesto con el nombre de uno del código lo reemplaza. Lo que no cabe en el esquema (composiciones, condiciones) sigue en `MOLDES` de `moldes.js`. Se editan en `/estudio/` → pestaña Poses (sliders por canal, curva con claves, osciladores, variantes, vista frente/3/4/lado con la mano medida; el mensaje `pose { clave, canales }` deja quieta a una persona en el juego). Modelo puro: `estudio/poses-modelo.mjs`.

## Mundo 3D (`mundo.html`)

Minecraft 3D jugable con Three.js (carpeta `mundo/`, `vendor/`). Antes de tocarlo lee `mundo/PENDIENTES.md` (estado, arquitectura y tareas) y **actualízalo en cada cambio**: marca tareas hechas y añade una entrada a la bitácora.

**Animaciones** (gestos, escenas, interacciones, cámara de cine): usa la skill `.claude/skills/animaciones-minecraft/`. Se encargan a un subagente **Haiku** primero (bajo costo; en escenas grandes hace una base que el dueño revisa) y se escala a **Sonnet** según la §0 de la skill.

**Arte de las cartas del Duelo** (`mundo/supervivencia/cartas-arte.js`): antes de dibujar o cambiar una carta, leer `mundo/supervivencia/CARTAS-ARTE.md` (formato 50×76, amigos reconocibles con los datos del juego, arte propio sin copiar Minecraft).

**Modo supervivencia** (`supervivencia.html`, `mundo/supervivencia/`): página aparte sobre el mismo mapa (subido 48 bloques, altura 128, cuevas y menas). Arquitectura, decisiones y estado en la sección «Modo supervivencia» de `mundo/PENDIENTES.md`. Pruebas: `node mundo/tests/recetas.mjs`, `node mundo/tests/inventario.mjs` y `node mundo/tests/amistad.mjs` (amistad y diálogos de «Hablar», bloque 6a; los textos para revisar están en `mundo/DIALOGOS.md`).

**Modo online** (`mundo/online/`): usa Supabase (clave publishable en `mundo/online/config.js`; nunca la service role key). El esquema está en `mundo/online/schema.sql`; el detalle, en la sección «Modo online» de `mundo/PENDIENTES.md`.

**Navegación** (`mundo/navegacion.js`, puro y reutilizable; problemas vistos y reglas para NPC en `mundo/NPC-VIDA.md`): búsqueda de camino A* por tramos sobre los bloques (mapa de alturas para lo no cargado) y caminante; `supervivencia/paseos.js` la usa para que los amigos dejen su sitio y vuelvan (gancho `n.paseo`), `/caminar <persona> <destino>`; ajustes en `navegacion.json` (pestaña Vida). Prueba `node mundo/tests/navegacion.mjs`. **Acompañantes** (7i): `mundo/seguir.js` (te sigue por tu rastro) + `supervivencia/acompanante.js` («¿Me acompañas?» en Hablar; en el cooperativo el anfitrión arbitra con el mensaje `co`); prueba `node mundo/tests/acompanante.mjs`.

**Supervivencia cooperativa** (`mundo/supervivencia/coop.js`): hasta 8 jugadores por WebRTC en estrella con el anfitrión (`SalaDirecta` en `mundo/online/red.js`); Supabase solo conecta y sirve de respaldo (tope 4 si alguien entra por respaldo). Arquitectura, mensajes medidos y pruebas en «Bloque 5» de `mundo/PENDIENTES.md`. Para probar con dos pestañas: `supervivencia.html?disp=2`. **Sin internet** (misma red): `SalaLocal` en `mundo/online/sala-local.js`, un QR de ida y vuelta por invitado, nada de Supabase; prueba `node mundo/tests/senal-qr.mjs`.
