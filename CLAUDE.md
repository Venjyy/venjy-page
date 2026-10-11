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

- **Al terminar cada chat de trabajo** (PR abierto o fusionado, o plan escrito): entregar el prompt de traspaso al siguiente chat con el modelo recomendado y la parte del plan que sigue. Cómo, en la skill `.claude/skills/traspaso-chat/`.

- **Nunca** incluir enlaces de sesión (`claude.ai/code/session…`) ni la línea «Generated with Claude Code» en commits, PRs, comentarios o archivos del repo (ni la línea `Claude-Session:` en los commits).

- **Artifact obligatorio al cerrar cada chat de trabajo** (PR abierto o plan escrito), sin que el dueño lo pida y antes del prompt de traspaso: receta de `.claude/artifacts/GUIA.md` (estética de paneles Minecraft, PixelCraft incrustada, datos generados desde el código, secciones en orden fijo). Camino corto y barato: copiar `.claude/artifacts/contenido-6c1.mjs`, cambiar el contenido y generar con `.claude/artifacts/plantilla.mjs`; enlazarlo en el PR.
- Todo texto visible lleva su par `data-es` / `data-en`.
- Solo fuente `PixelCraft`; sin emojis como íconos (se dibujan en `ICONOS` de `script.js`).

## Contenido nuevo en JSON (Estudio)

Diseño y fases en `estudio/DISENO.md`; esquemas en `estudio/esquemas/`.

- Las posiciones, el layout táctil, los ángulos de poses, los textos ES/EN y los precios **nuevos** van en `mundo/datos/*.json`, siempre que el juego ya lea ese archivo (`lee` distinto de `null` en `mundo/datos/indice.json`). Si todavía no lo lee, siguen en JS como hasta ahora.
- La lógica sigue en JS y solo lee el JSON. Si falta una clave, el juego usa el valor del código.
- Nunca sobrescribir valores que el dueño editó a mano: solo añadir claves. Cambiar un valor existente solo si él lo pide (`node estudio/cli.mjs validar --contra HEAD` lo avisa; `--permitir-cambios` si lo pidió).
- Lo viejo se migra a JSON solo cuando se toca por otro motivo.
- Para leer contenido, primero `node estudio/cli.mjs resumen [archivo|js:tienda|js:amistad] [clave]` en vez de abrir los `*-datos.js` (los diálogos de «Hablar» ya son `dialogos.json`: `resumen dialogos pony`; `dialogos-datos.js` es solo la fachada). Los textos de «Hablar» se editan en `/estudio/` (pestaña Textos) o en `mundo/datos/dialogos.json`; `node estudio/cli.mjs resumen dialogos --md --escribir` regenera `mundo/DIALOGOS.md`. La marca `revisado` la pone solo el dueño. Al cambiar un JSON: `node estudio/cli.mjs validar` y `node mundo/tests/estudio.mjs`. Capturas medidas: `node estudio/cli.mjs capturar layout acostado | pose <clave> | gesto <clave> --hoja | escena <clave> --medir "manoD()"` (levanta su propio servidor; Playwright por `PLAYWRIGHT=<carpeta del paquete>` o `npm i -g playwright-core`, ver `estudio/playwright.mjs`). `node mundo/tests/estudio-navegador.mjs` prueba el puente con un navegador real (se omite sin Playwright). Lo que está en `ui-layout.json` (botones táctiles) se edita arrastrando en `/estudio/`.

## Mundo 3D (`mundo.html`)

Minecraft 3D jugable con Three.js (carpeta `mundo/`, `vendor/`). Antes de tocarlo lee `mundo/PENDIENTES.md` (estado, arquitectura y tareas) y **actualízalo en cada cambio**: marca tareas hechas y añade una entrada a la bitácora.

**Animaciones** (gestos, escenas, interacciones, cámara de cine): usa la skill `.claude/skills/animaciones-minecraft/`. Se encargan a un subagente **Haiku** primero (bajo costo; en escenas grandes hace una base que el dueño revisa) y se escala a **Sonnet** según la §0 de la skill.

**Modo supervivencia** (`supervivencia.html`, `mundo/supervivencia/`): página aparte sobre el mismo mapa (subido 48 bloques, altura 128, cuevas y menas). Arquitectura, decisiones y estado en la sección «Modo supervivencia» de `mundo/PENDIENTES.md`. Pruebas: `node mundo/tests/recetas.mjs`, `node mundo/tests/inventario.mjs` y `node mundo/tests/amistad.mjs` (amistad y diálogos de «Hablar», bloque 6a; los textos para revisar están en `mundo/DIALOGOS.md`).

**Modo online** (`mundo/online/`): usa Supabase (clave publishable en `mundo/online/config.js`; nunca la service role key). El esquema está en `mundo/online/schema.sql`; el detalle, en la sección «Modo online» de `mundo/PENDIENTES.md`.

**Supervivencia cooperativa** (`mundo/supervivencia/coop.js`): hasta 8 jugadores por WebRTC en estrella con el anfitrión (`SalaDirecta` en `mundo/online/red.js`); Supabase solo conecta y sirve de respaldo (tope 4 si alguien entra por respaldo). Arquitectura, mensajes medidos y pruebas en «Bloque 5» de `mundo/PENDIENTES.md`. Para probar con dos pestañas: `supervivencia.html?disp=2`. **Sin internet** (misma red): `SalaLocal` en `mundo/online/sala-local.js`, un QR de ida y vuelta por invitado, nada de Supabase; prueba `node mundo/tests/senal-qr.mjs`.
