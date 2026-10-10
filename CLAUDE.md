@AGENTS.md

# Venjy · portafolio

Sitio estático sin build: `index.html`, `style.css`, `script.js`. Español por defecto, inglés vía atributos `data-es` / `data-en`.

## Ejecutar

- Servidor local: `python -m http.server 5510` (configurado en `.claude/launch.json` como `venjy`). Ya no se puede abrir `index.html` con doble clic: `script.js` y el mundo 3D usan módulos ES y necesitan servidor o hosting.

## Mapa del proyecto

- `script.js` genera en canvas el mapa de Minecraft, las texturas, los íconos pixelados y los estandartes. No hay imágenes para eso.
- `PRODUCT.md`: audiencia, contenido y datos de ProcedimientoSeguro. `DESIGN.md`: tokens y reglas visuales. Léelos antes de cambiar contenido o diseño.
- `images/`: fotos, GIFs y CVs. Los GIFs pesan varios MB; no los abras, refiérete a ellos por nombre.
- No leer salvo que se pida: `respaldo-2026-10-06/` (versión anterior), `.impeccable/review/` (capturas), `centroeventostest/` (demo aparte).

## Convenciones

- **Si un pedido es grande, avisarlo y proponer hacerlo en un chat dedicado.**

- **Al terminar cada chat de trabajo** (PR abierto o fusionado, o plan escrito): entregar el prompt de traspaso al siguiente chat con el modelo recomendado y la parte del plan que sigue. Cómo, en la skill `.claude/skills/traspaso-chat/`.

- **Nunca** incluir enlaces de sesión (`claude.ai/code/session…`) ni la línea «Generated with Claude Code» en commits, PRs, comentarios o archivos del repo (ni la línea `Claude-Session:` en los commits).

- **Artifacts** (resúmenes de trabajo, reportes de PR, revisiones): siempre con la receta de `.claude/artifacts/GUIA.md` (estética de paneles Minecraft, PixelCraft incrustada, datos generados desde el código, secciones en orden fijo). El generador de ejemplo es `.claude/artifacts/ejemplo-6a.mjs`.
- Todo texto visible lleva su par `data-es` / `data-en`.
- Solo fuente `PixelCraft`; sin emojis como íconos (se dibujan en `ICONOS` de `script.js`).

## Mundo 3D (`mundo.html`)

Minecraft 3D jugable con Three.js (carpeta `mundo/`, `vendor/`). Antes de tocarlo lee `mundo/PENDIENTES.md` (estado, arquitectura y tareas) y **actualízalo en cada cambio**: marca tareas hechas y añade una entrada a la bitácora.

**Animaciones** (gestos, escenas, interacciones, cámara de cine): usa la skill `.claude/skills/animaciones-minecraft/`. Se encargan a un subagente **Haiku** primero (bajo costo; en escenas grandes hace una base que el dueño revisa) y se escala a **Sonnet** según la §0 de la skill.

**Modo supervivencia** (`supervivencia.html`, `mundo/supervivencia/`): página aparte sobre el mismo mapa (subido 48 bloques, altura 128, cuevas y menas). Arquitectura, decisiones y estado en la sección «Modo supervivencia» de `mundo/PENDIENTES.md`. Pruebas: `node mundo/tests/recetas.mjs`, `node mundo/tests/inventario.mjs` y `node mundo/tests/amistad.mjs` (amistad y diálogos de «Hablar», bloque 6a; los textos para revisar están en `mundo/DIALOGOS.md`).

**Modo online** (`mundo/online/`): usa Supabase (clave publishable en `mundo/online/config.js`; nunca la service role key). El esquema está en `mundo/online/schema.sql`; el detalle, en la sección «Modo online» de `mundo/PENDIENTES.md`.

**Supervivencia cooperativa** (`mundo/supervivencia/coop.js`): hasta 8 jugadores por WebRTC en estrella con el anfitrión (`SalaDirecta` en `mundo/online/red.js`); Supabase solo conecta y sirve de respaldo (tope 4 si alguien entra por respaldo). Arquitectura, mensajes medidos y pruebas en «Bloque 5» de `mundo/PENDIENTES.md`. Para probar con dos pestañas: `supervivencia.html?disp=2`. **Sin internet** (misma red): `SalaLocal` en `mundo/online/sala-local.js`, un QR de ida y vuelta por invitado, nada de Supabase; prueba `node mundo/tests/senal-qr.mjs`.
