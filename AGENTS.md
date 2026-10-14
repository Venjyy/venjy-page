# AGENTS.md

Guía para cualquier agente (Codex, Antigravity, Claude u otro) que trabaje en este repositorio.
Portafolio personal de Venjy con estética Minecraft: una página (`index.html`) y un juego 3D en Three.js
(`mundo.html` y el modo supervivencia, `supervivencia.html`). Todo en español de Chile, con inglés aparte.

## Antes de empezar

- Partir de `main` actualizado, en una **rama nueva** por tarea. Un PR por tarea.
- Leer solo lo necesario: el mapa del módulo (`mundo/supervivencia/MAPA.md`), luego `grep` del símbolo
  y leer por tramos. No abrir archivos de más de ~200 líneas enteros.
- No abrir: `images/*.gif` (pesan varios MB), `vendor/`, `respaldo-2026-10-06/`, `.impeccable/review/`,
  `centroeventostest/` (demo aparte, ya no es parte de la estructura principal).
- Estado del juego y tareas: `mundo/PENDIENTES.md` (buscar con `grep -n` la sección de la tarea; no leerlo entero).

## Ejecutar

- Servidor: `node estudio/servidor.mjs` (puerto 5510). `index.html` no abre con doble clic: usa módulos ES.
- Estudio (editor visual de datos): `http://localhost:5510/estudio/`. El juego dentro del Estudio:
  `supervivencia.html?estudio`.
- Sin `package.json` ni build: las pruebas son scripts de Node en `mundo/tests/`.

## Reglas visuales y de texto

- Estética Minecraft siempre: fuente **PixelCraft** (`font/pixelcraft.ttf`), verdes, marrones, grises,
  bloques y bordes pixelados. Nada de estilos modernos o minimalistas. Tokens en `DESIGN.md`.
- **Todo texto visible lleva su par español/inglés**: en HTML, atributos `data-es` / `data-en`; en
  JSON, `{ "es": "…", "en": "…" }`; en JS, el mismo patrón que use el módulo.
- **Sin emojis** como íconos: los íconos se dibujan en código (`ICONOS` en `script.js`, `iconos.js` en
  la supervivencia). No se agregan imágenes para eso.
- Nombres de archivos, funciones y endpoints en español.
- **Todo lo que se desarrolle debe poder modificarse y ajustarse desde el Estudio (`/estudio/`) por el dueño**: posiciones, giros, escalas, colores, tiempos, textos, medidas y cualquier valor que afecte cómo se ve o se siente. Los valores van en `mundo/datos/*.json` (o con su valor base en el código y un ajuste en el JSON, como `objetos-mano.json`), con esquema en `estudio/esquemas/` y control en la pestaña que corresponda. Si algo nuevo no cabe en ninguna pestaña, crear el campo o la pestaña, o dejarlo anotado en `mundo/PENDIENTES.md` y en el PR como «no editable aún». Nunca dejar números mágicos que solo se cambien tocando el código.
- **El modo creativo (`mundo.html`) no se toca**: es el portafolio web 3D. Todo lo nuevo del juego va en la supervivencia.
- Contenido del portafolio y datos de ProcedimientoSeguro: `PRODUCT.md`.

## Contenido en JSON (`mundo/datos/`)

Instrucciones completas: **`.claude/skills/datos-json/SKILL.md`** (léela si la tarea toca esa carpeta).
Lo esencial:

- Posiciones, poses, gestos, escenas, diálogos, textos y layout táctil **nuevos** van en
  `mundo/datos/*.json` si el juego ya lee ese archivo (`lee` distinto de `null` en `mundo/datos/indice.json`).
  Si no, siguen en JS. La lógica sigue en JS.
- **Solo añadir claves.** No cambiar ni borrar valores existentes salvo que el dueño lo pida. No mover
  personas en `posiciones.json`. La marca `"revisado"` de los textos la pone solo el dueño.
- Leer con el CLI en vez de abrir archivos grandes: `node estudio/cli.mjs resumen [archivo] [clave]`.
- Todo lo nuevo, genérico: nombres, lugares y textos en datos, no amarrados a una persona ni a un punto fijo del mapa.

## Verificar (siempre antes del commit)

```
node estudio/cli.mjs validar --contra HEAD
node mundo/tests/estudio.mjs
```

Y la prueba del área tocada:

- Objetos, recetas, íconos: `node mundo/tests/recetas.mjs` y `node mundo/tests/inventario.mjs`.
- Amistad y diálogos: `node mundo/tests/amistad.mjs`.
- Otra área: la prueba con su nombre en `mundo/tests/` (`ls mundo/tests`).
- Las `*-navegador.mjs` necesitan Playwright; si no está, se saltan solas.

Lo que solo se ve jugando (cómo se ve un ícono, una animación, la cámara) lo prueba el dueño: el PR
trae una lista corta de «qué mirar».

## Skills para tareas frecuentes

Son archivos Markdown; si tu herramienta no las carga sola, léelas como documento:

| Tarea | Skill |
|---|---|
| Cambiar o agregar datos en `mundo/datos/` | `.claude/skills/datos-json/SKILL.md` |
| Objetos, recetas, íconos y usos de la supervivencia | `.claude/skills/objetos-supervivencia/SKILL.md` |
| Animaciones, gestos, escenas, cámara | `.claude/skills/animaciones-minecraft/SKILL.md` |
| Arte de las cartas del Duelo | `mundo/supervivencia/CARTAS-ARTE.md` |
| Encargar trabajo a otro agente | `.claude/skills/delegar/SKILL.md` |

## Commits y PR

- Mensajes cortos en español con prefijo (`feat:`, `fix:`, `docs:`).
- **Sin atribución de herramientas**: nada de «Generated with …», enlaces de sesión ni líneas
  `Claude-Session:` en commits, PRs, comentarios ni archivos. (La línea `Co-Authored-By` del modelo en el
  commit sí se permite.)
- Descripción del PR: qué cambió, por qué, qué pruebas pasaron y «qué mirar» para el dueño.
- No tocar `estudio/hoja-de-ruta.html` (es local, fuera de git) ni documentos que no estén en git.

## Al terminar

- `mundo/PENDIENTES.md`: marcar lo hecho en su bloque y agregar una línea a la bitácora con la fecha.
- Si se creó un módulo, una línea en `mundo/supervivencia/MAPA.md`.
- Si cambian las convenciones visuales o la estructura principal, actualizar este archivo.
