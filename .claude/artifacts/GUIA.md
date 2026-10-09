# Guía de Artifacts (estilo Venjy)

El dueño quiere que **todos los Artifacts** (resúmenes de trabajo, reportes de PR, revisiones, planes) se vean y funcionen como el del bloque 6a: «Hablar y amistad 6a» (https://claude.ai/artifact/Frm7pmrRtjGp1vBihytp6w). Esta guía es la receta completa. El generador de ese Artifact está en `ejemplo-6a.mjs`, junto a esta guía: cópialo y adáptalo, no partas de cero.

## Cómo se arma (proceso)

1. **Los datos salen del código real, nunca a mano.** Un script de Node importa los módulos del proyecto (diálogos, tablas, niveles…) y escribe un JSON. Otro script (como `ejemplo-6a.mjs`) lee ese JSON y arma el HTML. Así las tablas del Artifact coinciden exactamente con el juego. En el 6a fueron `generar.mjs` (datos y `mundo/DIALOGOS.md`) y `artifact.mjs` (página). Ambos se escriben en el scratchpad y reciben rutas como argumentos.
2. **Todo va incrustado** (el Artifact no puede cargar archivos del repo):
   - la fuente `font/pixelcraft.ttf` en base64 dentro de un `@font-face` (`format('truetype')`, `font-display: block`);
   - las capturas en `data:image/jpeg;base64,…`, con `loading="lazy"`. Antes se copian al repo (por ejemplo `mundo/capturas/<parte>/`) con nombres que dicen qué muestran.
3. Se publica con la herramienta Artifact: `icon` de una palabra genérica (en el 6a, `chat`) y `description` de una frase en español.
4. **Enlaces cruzados**: primero se abre el PR (el Artifact lo enlaza), después se publica el Artifact y se agrega su enlace a la descripción del PR con la nota «privado: ábrelo con tu cuenta». El enlace va también en el último mensaje al dueño.
5. Peso razonable: el del 6a pesó ~790 KB con fuente y 6 capturas.

## Reglas visuales

- **Un solo mundo oscuro, como los paneles del juego** (no se hace tema claro): tierra oscura de fondo, paneles café con borde negro de 4 px y **bisel Minecraft** (sombra interior clara arriba a la izquierda y oscura abajo a la derecha). `color-scheme: dark` en `:root` y fondo explícito en `html` y `body`.
- **Solo PixelCraft** en todo (títulos, texto, tablas, botones y código), con respaldo `'Courier New', monospace`. **Sin emojis**: el estado se marca con colores y etiquetas de texto.
- Títulos en amarillo `#ffd84a` con sombra dura `3px 3px 0 #3f3f15` (como el `h2` de los paneles del juego); subtítulos en celeste.
- Columna central de máx. 1100 px, `display: grid` con `gap` entre bloques (nada de márgenes sueltos), 16 px de margen lateral y una columna en celular.
- Tablas anchas dentro de su propio contenedor con `overflow-x: auto`; encabezados `position: sticky`; números con `tabular-nums` y alineados a la derecha.
- Texto en español (contexto Chile), con frases cortas y directas, sin relleno.

### Tokens y CSS base (copiar tal cual)

```css
@font-face { font-family: 'PixelCraft'; src: url(data:font/ttf;base64,…) format('truetype'); font-display: block; }
/* Mundo único (oscuro, como los paneles del juego): tierra oscura, bordes negros con bisel, amarillo de título. Columna central ~1100px. */
:root {
  --tierra: #1e1812; --panel: #2c2219; --panel2: #382b20; --bisel-claro: #4a3826; --bisel-osc: #0c0704;
  --texto: #f1ece2; --gris: #b3a998; --amarillo: #ffd84a; --verde: #7fdc6f; --rosa: #ef6fae; --cielo: #7dd3ff; --rojo: #ff8a6a;
  --fuente: 'PixelCraft', 'Courier New', monospace;
  color-scheme: dark;
}
html { background: var(--tierra); }
body { background: var(--tierra); color: var(--texto); font-family: var(--fuente); font-size: 15px; line-height: 1.55; margin: 0; padding-inline: 16px; padding-block: 24px 48px; }
main { max-width: 1100px; margin: 0 auto; display: grid; gap: 22px; }
h1, h2, h3 { font-weight: normal; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); color: var(--amarillo); text-shadow: 3px 3px 0 #3f3f15; }
h2 { font-size: 1.35rem; color: var(--amarillo); text-shadow: 2px 2px 0 #3f3f15; }
h3 { font-size: 1.05rem; color: var(--cielo); }
p { margin: 0; max-width: 72ch; }
a { color: var(--cielo); }
a:focus-visible, button:focus-visible { outline: 3px solid var(--amarillo); outline-offset: 2px; }
.bloque { background: var(--panel); border: 4px solid #000; box-shadow: inset 4px 4px 0 var(--bisel-claro), inset -4px -4px 0 var(--bisel-osc); padding: 18px 20px; display: grid; gap: 12px; min-width: 0; }
.meta { color: var(--gris); }
.pr { display: inline-block; background: #3c6a2a; color: var(--texto); text-decoration: none; padding: 8px 14px; border: 3px solid #000; box-shadow: inset -3px -3px 0 #24401a, inset 3px 3px 0 #5f9a45; justify-self: start; }
.pr:hover { background: #4f8a36; }
ul { margin: 0; padding-left: 1.2em; display: grid; gap: 6px; }
li { max-width: 80ch; }
code { color: var(--verde); font-family: var(--fuente); }
.dos { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.tabla { overflow-x: auto; min-width: 0; }
table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 2px solid var(--bisel-osc); }
th { color: var(--gris); font-weight: normal; letter-spacing: 0.03em; background: var(--panel2); position: sticky; top: 0; }
td.num, th.num { text-align: right; white-space: nowrap; }
small { color: var(--gris); }
.decision { display: grid; gap: 2px; padding: 8px 10px; background: var(--panel2); border-left: 4px solid var(--amarillo); }
.decision.rev { border-left-color: var(--rojo); }
.decision b { font-weight: normal; }
.decision span { color: var(--gris); }
.etq { color: var(--rojo); font-size: 0.85em; }
.medidas td.mejor { color: var(--verde); }
.capturas { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
figure { margin: 0; display: grid; gap: 6px; background: var(--panel2); border: 3px solid #000; padding: 8px; }
figure img { width: 100%; height: auto; image-rendering: pixelated; border: 2px solid #000; }
figcaption { color: var(--gris); font-size: 0.9em; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-family: var(--fuente); font-size: 0.9rem; color: var(--texto); background: #555; border: 3px solid #000; box-shadow: inset -3px -3px 0 #333, inset 3px 3px 0 #777; padding: 4px 10px; cursor: pointer; }
.chip.on { background: var(--amarillo); color: #3f3f15; box-shadow: inset -3px -3px 0 #b39520, inset 3px 3px 0 #fff2a8; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
```

Los chips son botones de piedra (gris con bisel) y el activo es amarillo, como los botones del juego. Si hay niveles o estados, cada uno lleva su color de fondo con borde negro, como en el 6a: gris `#3a3a3a`, café `#4d4030`, verde `#2f5a2a`, azul `#2b5070` y rosado `#7a2f58`.

## Estructura (en este orden)

Todo es una `section.bloque`. Si una sección no aplica, se omite.

1. **Cabecera**: `h1` con el nombre del trabajo («Bloque 6a · «Hablar» y amistad»), una frase de qué es y en qué estado está («PR abierto, sin mergear, esperando tu revisión…»), el botón verde `.pr` («Ver el PR #N en GitHub») y una línea `.meta` con rama, de qué partió y fecha. `<title>` corto, de 2 a 4 palabras («Hablar y amistad 6a»).
2. **Qué se hizo**: lista de lo que cambia para quien juega, y debajo un `h3 Archivos` con nuevos y cambiados en `code`.
3. **A revisar por ti**: va arriba porque es lo primero que el dueño necesita. Una lista de cosas concretas: textos sensibles, interpretaciones de sus notas, decisiones abiertas y errores ajenos vistos de paso.
4. **Decisiones y por qué**: una tarjeta `.decision` por decisión, con la decisión en `b` y el motivo en `span` gris. Las que quedan para el dueño llevan la clase `rev` (borde rojo) y la etiqueta `.etq` «A revisar». Arriba, una línea `.meta`: «En rojo, las marcadas «a revisar por el dueño»».
5. **Datos del sistema** (en el 6a, «Amistad»): tablas lado a lado con `.dos` (puntos por acción con tope, niveles con descuento, favoritos) y, si hay una relación entre dos ejes, una **matriz coloreada** (tu skin × personaje, celda = valor y color = nivel, con `title` al pasar el mouse) con una leyenda en `.meta`.
6. **Medidas antes y después**: tabla `.medidas` con las columnas «main» y la rama. Lo que mejora va en verde (`td.mejor`) y lo que es ruido se marca «(ruido)». Debajo, en `.meta`, **cómo se midió** (navegador, resolución, caché, reloj usado, qué se comparó).
7. **Pruebas**: lista con cada prueba y su resultado real (número de comprobaciones, qué cubre), lo que se probó en el navegador y lo que falló aunque sea ajeno.
8. **Capturas**: grilla `.capturas` de `figure`, cada una con un `figcaption` que dice qué se ve y qué demuestra («Boris con skin de Pony: Desconocido. Te mira y…»).
9. **Tablas completas para revisar** (en el 6a, «Todos los diálogos»): una frase que explique las columnas, chips para filtrar por grupo («Todos» y uno por personaje), un contador («248 frases») y la tabla en un contenedor con `max-height: 70vh; overflow: auto`. Todas las filas se ven al cargar y el filtro solo oculta (`row.hidden`). Las columnas con texto largo llevan `min-width: 240px`; las celdas «Libre» van en gris y las variantes en rosado.

## Detalles que hacen la diferencia

- Las cifras son las medidas de verdad, con su contexto; nunca se redondea a favor.
- Cada captura muestra algo que se probó, y el pie lo dice.
- Lo que el dueño debe decidir se ve de un vistazo (bloque arriba, tarjetas en rojo).
- Los textos para revisar van completos en la página (sin «ver el archivo»), con el filtro para ir por persona.
- La página se entiende sin abrir el PR, y el PR enlaza a la página.
- El script de filtro es mínimo (una IIFE de ~10 líneas, sin librerías).
- Revisar que no haya emojis en nada de lo publicado.
