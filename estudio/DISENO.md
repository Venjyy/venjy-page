# Estudio · diseño y contratos (fase 0)

El **Estudio** es un editor visual aparte, hecho a la medida de este juego, para ajustar a mano el
contenido que hoy se toca editando JS: botones táctiles, posiciones de personas, textos ES/EN,
escenas y poses. Tiene tres partes:

1. **Datos en JSON** (`mundo/datos/*.json`): el contenido nuevo vive ahí; la lógica sigue en JS y
   solo lo lee.
2. **Editor visual** (`estudio/`): arrastrar botones del layout móvil, mover personas con un gizmo
   3D, sliders de huesos con línea de tiempo y tablas de textos ES/EN. Guarda en disco con un
   servidor de desarrollo en Node.
3. **CLI para el agente** (`node estudio/cli.mjs resumen | validar | capturar`): un resumen compacto
   del contenido, para no leer decenas de KB de JS en cada chat.

Este archivo es el contrato. Los esquemas están en `estudio/esquemas/` y los datos iniciales en
`mundo/datos/`. La fase 0 no trae código del editor ni migra contenido.

## 1. Qué no es

| Descartado | Por qué |
|---|---|
| Reescribir con ECS / GameObject / SceneManager | El juego funciona y está medido. Solo se cambia de dónde salen los números; los sistemas siguen igual. |
| GLTF, Mixamo, `AnimationMixer` | Las personas son cajas con huesos (`crearPersona`, `rig.md`) y las poses se calculan. Un esqueleto importado no encaja con ese rig ni con las escenas. |
| Fork de Babylon u otro motor | Three.js 0.186.1 ya está en `vendor/`. Cambiar de motor no mejora nada de lo que se quiere editar. |
| Motor genérico desde el día uno | Primero tiene que servir a este juego. Lo genérico se extrae al final si hace falta (fase 7, opcional). |
| Build, bundler o `npm install` | El sitio es estático y sin build. La única dependencia nueva será `TransformControls` (fase 4), copiada a `vendor/`. |

## 2. Lo que dice el código (hallazgos que ajustan el plan)

- **Los gestos de amistad ya son keyframes.** `GESTOS_AMISTAD` (`escena-amistad-datos.js`) usa
  `ruta(t, [[t, v], ...])`, que interpola con smoothstep. Los `GESTOS` de `escenas-skin.js` son un
  valor base más senos (`-0.9 + Math.sin(t * 5) * 0.3`). Las dos formas caben en datos. Prueba
  hecha en esta fase: los 11 gestos de `mundo/datos/poses.json`, evaluados con el esquema, dan
  **exactamente** lo mismo que las funciones del juego (16 040 comparaciones, diferencia máxima 0).
  La fase 6 es más chica de lo que parecía.
- **Lo que no cabe en datos sigue en JS**: composiciones como `alHombro`, condiciones (`pareja`
  mira `i.j`), `hachazo` con su ciclo y `cabecea` con `pow`. El JSON solo reemplaza lo que expresa
  igual; si un gesto no está en el JSON, se usa el del código.
- **Las personas se ubican relativas a su lugar.** `amigos.js` hace `nuevo('hadad', C.bx - 2.15, C.y,
  C.bz + 2, …)` con `C = lugar('campamento')`, y los lugares salen de `colocarLugares`
  (`construcciones.js`), buscados con semilla. Por eso `posiciones.json` guarda **desplazamientos
  respecto de un ancla**, nunca coordenadas absolutas.
- **Los puntos de `mundo/mundo-datos.js` (`DISENOS`) no se editan en el Estudio.** Generan el terreno
  y el mapa 2D del portafolio. Moverlos rompe `node mundo/tests/paridad.mjs`.
- **El layout táctil es CSS con anclas.** Cada botón tiene `left`/`right` + `top`/`bottom`, con
  `env(safe-area-inset-*)` y `var(--pie)` (barra rápida + 60 px). Hay dos perfiles: normal y
  `@media (max-height: 460px)`. Los valores de hoy están en `mundo/supervivencia/supervivencia.css`
  (líneas 318-336, 462-486) y `mundo/tactil.css`.
- **Los textos ya son pares `{ es, en }`** (`const t = (es, en) => …`). Los que son funciones
  (`` p => `Momento especial: amistad ${p}/100` ``) pasan a plantillas con `{p}`.
- **Los datos JS se pueden importar en Node** (lo hacen `mundo/tests/*.mjs` y los Artifacts). El CLI
  puede resumir el contenido de hoy **sin migrarlo**.
- **Rutas relativas**: el sitio puede servirse bajo una subruta (GitHub Pages de proyecto). El
  cargador usa `new URL('./x.json', import.meta.url)`, nunca `/mundo/...`.
- **`TransformControls` importa `'three'`** (especificador desnudo). La página que lo use necesita un
  `importmap` que mande `three` a `vendor/three.module.js`. Es la misma URL que ya importa el juego,
  así que es la misma instancia de Three.js.
- **El gizmo tiene que vivir dentro del juego**, no en el Estudio. El iframe del juego tiene su propio
  Three.js, su escena y su cámara. El Estudio manda órdenes y el juego mueve sus objetos.
- **La capa táctil se puede abrir sin el mundo.** `iniciarTactil` (`mundo/tactil.js`) decide si hay
  táctil con `'ontouchstart' in window`. Una página liviana puede forzarlo, crear los botones reales
  con stubs y mostrarlos con `activar()`. Así el editor de layout no carga el mundo.
- **Conflictos con el trabajo en paralelo.** La rama `amistad-6d` tiene cambios sin commit en
  `criaturas/amigos.js`, `main.js`, `jugador.js`, `minado.js`, `comandos-dev.js`,
  `escena-amistad-datos.js` y `escenas-datos.js`. La fase 1 no toca ninguno. La fase 4 (que conecta
  `amigos.js`) va después de fusionar 6d.
- **La ruleta de 7c-2** suma un botón táctil «GESTOS». Para el Estudio, un botón nuevo es una clave
  más en `ui-layout.schema.json` y un selector más en el aplicador del layout.

## 3. Contrato de datos

### Dónde vive cada cosa

| Ruta | Qué es |
|---|---|
| `mundo/datos/<nombre>.json` | Datos que lee el juego. Van con el sitio publicado. |
| `mundo/datos/indice.json` | Lista de archivos: esquema, módulo que lo lee (`lee`, `null` = todavía nadie), fase y descripción. El servidor solo guarda archivos listados aquí. |
| `estudio/esquemas/<nombre>.schema.json` | JSON Schema (subconjunto, ver `comun.schema.json`). Cada dato apunta a su esquema con `"$schema"`, así VS Code autocompleta. |
| `estudio/` | Editor, servidor y CLI. No lo carga el juego y no se publica (lo excluye `_config.yml`). |

Archivos de esta fase:

| Archivo | Contenido real de hoy | Lo leerá |
|---|---|---|
| `ui-layout.json` | Los 12 botones táctiles de la supervivencia más la misión en curso, en los dos perfiles | Fase 1: `tactil-supervivencia.js` |
| `textos.json` | Etiquetas de los 7 botones de `tactil-supervivencia.js` (ROMPER, USAR…) | Fase 1: `tactil-supervivencia.js` |
| `posiciones.json` | Los 9 amigos de `criaturas/amigos.js`, relativos a su lugar | Fase 4: `amigos.js` |
| `poses.json` | 6 poses del atlas de `rig.md` y 11 gestos (`GESTOS` y `GESTOS_AMISTAD.puno`) | Fase 6 (PR 6a): `mundo/datos/gestos.js` |

Mientras `lee` sea `null`, el archivo es **referencia** (sirve al CLI y a las pruebas de paridad) y el
juego sigue usando el código.

### Reglas

1. **El código es el valor por defecto.** El juego fusiona `código ← JSON`: si falta una clave, usa
   la del código. Si falta el archivo o está roto, usa todo el código y avisa una vez en la consola
   (`[datos] ui-layout.json: …`). Nunca se cae por un JSON.
2. **La fusión** mezcla objetos en profundidad y **reemplaza** los arreglos completos (una lista de
   keyframes no se mezcla elemento a elemento).
3. **`?sin-datos`** en la URL hace que el juego ignore `mundo/datos/` (sirve para comparar con el
   código).
4. **Formato estable** (lo aplican el servidor y el CLI, para que los diffs sean chicos):
   - 2 espacios de sangría y el orden de claves intacto;
   - arreglos de primitivos, o de arreglos de primitivos, en una línea: `[[0.45, 0], [1.45, -0.98]]`;
   - objeto plano (solo primitivos) en una línea si la línea completa cabe en 120 columnas;
   - UTF-8 sin BOM, `\n` y salto final. `.gitattributes` fuerza LF en `mundo/datos/*.json`
     (en este equipo `core.autocrlf` es `true` y si no los pasaría a CRLF). El validador igual
     acepta CRLF al leer.
   Los 5 archivos de `mundo/datos/` ya están en este formato. Prueba de la fase 1:
   `formatear(JSON.parse(archivo)) === archivo`.
5. **Quién escribe qué.** El editor guarda lo que el dueño movió (para eso es). Un agente **solo
   añade claves**: nunca cambia un valor existente salvo que el dueño lo pida.
   `cli.mjs validar --contra HEAD` lo avisa.
6. **Migración**: lo viejo pasa a JSON solo cuando se toca por otro motivo. Cada fase del Estudio
   migra **un piloto** (el editor no sirve sin datos), y ese piloto es su motivo.
7. **Unidades**: huesos en radianes (como `rig.md` y el código); giro de personas en **grados** (90 y
   180 exactos, como se edita a mano); posiciones en bloques; layout en px CSS y letra en rem.
8. **Producción**: sigue estática, igual que hoy. El juego hace un `fetch` por archivo conectado
   (1-3 KB). Se pide al cargar el módulo y no bloquea el arranque.

## 4. Fases (orden corregido)

| Fase | Qué | Piloto que migra | Depende de | Modelo |
|---|---|---|---|---|
| 0 | Diseño, esquemas, datos iniciales, contrato del CLI | nada | nada | Opus (este PR) |
| 1 | Servidor Node, formato y validador, cargador, layout táctil desde JSON, editor de layout, CLI `resumen` y `validar` | `ui-layout.json` y las etiquetas táctiles | nada (no choca con 6d) | Sonnet |
| 2 | Estudio con el juego dentro (iframe), puente `BroadcastChannel`, recarga en vivo, `/tp` desde el Estudio, CLI `capturar` | nada | 1 | Sonnet |
| 3 | **Textos y diálogos ES/EN** (antes era la 4) | `dialogos-datos.js` → `mundo/datos/dialogos.json` | 1 (2 deseable) | Sonnet; Opus revisa la migración |
| 4 | **Posiciones con gizmo** (`TransformControls`) (antes era la 3) | `posiciones.json` en `amigos.js` | 2 y 6d fusionado | Sonnet |
| 5 | Escenas y guiones (línea de tiempo de pistas, frases, golpes, cámara) | `ANIMACIONES` de `escena-amistad-datos.js` | 2, 3 | Opus diseña el esquema de escena; Sonnet construye |
| 6 | Poses y animaciones (sliders por hueso, keyframes, osciladores) | `GESTOS` de `escenas-skin.js` y gestos con `ruta()` | 2 (5 deseable) | Opus en el evaluador (corre en cada cuadro); subagente Sonnet en el editor |
| 7 | (Opcional, no ahora) extraer lo genérico a un motor para otros juegos | — | 1-6 | — |

**Por qué textos antes que posiciones.** Los textos no necesitan dependencias nuevas, son lo que más
pesa (`dialogos-datos.js` 54 KB más `mundo/DIALOGOS.md` 107 KB, que hoy se regenera para que el dueño
revise) y el dueño los corrige en casi todos los bloques (la revisión del 6c-2 fue de textos).
Posiciones necesita el gizmo dentro del juego, el importmap y que 6d deje `amigos.js` tranquilo.

**Intercalado con el juego.** La fase 1 puede ir en paralelo con 6d: toca
`tactil-supervivencia.js`, `estudio/`, `mundo/datos/`, `.claude/launch.json` y `CLAUDE.md`. La 6 conviene
después de 7c-2 (la ruleta crea 8 gestos que serían su mejor prueba) o antes, si se quiere que la
ruleta ya nazca en JSON.

## 5. Fase 1 en detalle (para ejecutar directo)

Objetivo: el dueño abre `http://localhost:5510/estudio/`, elige «celular acostado», arrastra ROMPER
un poco más arriba, aprieta Guardar, recarga `supervivencia.html` en el celular (o con `?tactil`) y
el botón está donde lo dejó. `mundo/datos/ui-layout.json` cambió solo en esa línea.

Rama sugerida: `estudio-fase1`, desde `main` con este PR fusionado. Si crece, se parte en **1a**
(servidor, formato, validador, cargador, CLI y conexión del juego) y **1b** (editor de layout).

### Archivos

Nuevos:

| Archivo | Qué hace |
|---|---|
| `estudio/servidor.mjs` | Servidor de desarrollo (reemplaza a `python -m http.server`) |
| `estudio/formato.mjs` | `formatear(obj) -> string` con las reglas del punto 3.4 (lo usan el servidor y el CLI) |
| `estudio/validar.mjs` | `validar(datos, nombreEsquema) -> [errores]`, con el subconjunto de `comun.schema.json` (~120 líneas, sin dependencias) |
| `estudio/cli.mjs` | `resumen` y `validar` (contrato en §7). `capturar` queda para la fase 2 y responde «fase 2» |
| `mundo/datos/cargador.js` | Cargador del juego (navegador): `cargarDatos(nombre)` y `fusionar(defecto, datos)` |
| `mundo/supervivencia/layout-datos.js` | `aplicarLayout(datos)`: genera un `<style id="layout-datos">` con reglas solo para las claves presentes |
| `estudio/index.html`, `estudio/estudio.css`, `estudio/estudio.js` | Cáscara del Estudio: pestañas (Layout activa; Textos, Posiciones, Escenas y Poses deshabilitadas con «fase N»), ES/EN, estado del servidor |
| `estudio/layout.js` | Editor de layout |
| `estudio/vista-tactil.html` | Capa táctil real sin el mundo (la que muestra el editor) |
| `mundo/tests/estudio.mjs` | Pruebas de la fase |

Cambiados: `mundo/supervivencia/tactil-supervivencia.js` (lee layout y etiquetas),
`mundo/datos/indice.json` (`lee` de `ui-layout` y `textos`), `.claude/launch.json` (servidor Node),
`CLAUDE.md` («Ejecutar»), `mundo/PENDIENTES.md` (estado y bitácora) y `mundo/supervivencia/MAPA.md`
(fila nueva). **No se tocan** `main.js`, `mundo/tactil.js` ni los archivos de 6d.

### `estudio/servidor.mjs`

- Solo `node:http`, `node:fs`, `node:path` y `node:crypto`. Se arranca con
  `node estudio/servidor.mjs [--lan] [--log]`, con puerto `PORT` (lo pone `launch.json` con
  `autoPort`) o 5510.
- **Estáticos**: `GET` y `HEAD` de todo lo que está bajo la raíz del repo, salvo `.git/`. Tiene que
  servir `.claude/skills/...`, porque `posar.html` y `capturar.mjs` lo usan. Tabla de MIME (`.html`,
  `.js`, `.mjs`, `.css`, `.json`, `.png`, `.jpg`, `.gif`, `.svg`, `.ttf`, `.woff2`, `.webmanifest`,
  `.md`, `.txt`). Una carpeta sirve su `index.html`. Para no ver datos viejos: `ETag` (sha1 del
  contenido) y `Cache-Control: no-cache`. Con `If-None-Match` responde 304.
- **Seguridad**: escucha en `127.0.0.1`. Con `--lan` escucha en `0.0.0.0` para probar en el
  celular, pero **solo acepta escrituras desde loopback**. Antes de abrir un archivo hace
  `decodeURIComponent`, normaliza la ruta y rechaza lo que quede fuera de la raíz. El servidor no
  responde preflights CORS.
- **API**:

| Método y ruta | Qué hace | Respuesta |
|---|---|---|
| `GET /api/estudio` | El Estudio pregunta si puede guardar | `{ "ok": true, "escritura": true, "version": 1 }` (si no hay servidor, el `fetch` falla y el Estudio queda en solo lectura) |
| `PUT /api/datos/<nombre>` | Guarda `mundo/datos/<nombre>.json` | 200 `{ "ok": true, "bytes": n, "etag": "…" }` |

  Reglas del `PUT`:
  - `<nombre>` cumple `^[a-z][a-z0-9-]*$` y está en `indice.json`; si no, 404.
  - Lleva el encabezado `X-Estudio: 1` (una página de otro origen no puede ponerlo sin preflight);
    si no, 403.
  - El `Origin`, si viene, debe ser el mismo host; si no, 403.
  - El cuerpo pesa como máximo 512 KB; si no, 413.
  - Lleva `If-Match: <etag>` del archivo que el editor leyó. Si el archivo cambió en disco mientras
    tanto (por ejemplo, lo editó un agente), responde 412 y el editor avisa «El archivo cambió en
    disco: recarga y vuelve a aplicar tus cambios».
  - Parsea, valida con el esquema del índice (422 con `{ "errores": [...] }`), formatea y escribe.
    Escribe a un temporal y lo renombra; si el rename falla (OneDrive a veces lo bloquea con EPERM),
    reintenta con escritura directa.
  - Registra una línea por escritura: `guardado ui-layout.json (1555 B)`.

### `mundo/datos/cargador.js`

```js
// Promesa con el objeto, o null si no está, está roto o la URL trae ?sin-datos (avisa una vez en consola).
export function cargarDatos(nombre) { /* fetch(new URL(`./${nombre}.json`, import.meta.url), { cache: 'no-cache' }), tope 3 s, caché por nombre */ }
// Mezcla profunda de objetos simples; los arreglos y los primitivos del segundo reemplazan.
export function fusionar(defecto, datos) { /* … */ }
// Texto por idioma con plantillas {n}: texto(t, 'es', { n: 3 })
export function texto(t, idioma, vars) { /* … */ }
```

### Layout desde JSON (`layout-datos.js`)

- `aplicarLayout(datos)` arma el CSS solo para los botones presentes, con un selector más específico
  que el CSS actual: `body.con-tactil.layout-datos .tactil-boton.sv-romper` (0,4,1) gana a
  `body.con-tactil .tactil-saltar` (0,2,1) y a `.tactil-boton.sv-romper` (0,2,0). El perfil `baja` va
  dentro de `@media (max-height: 460px)`.
- Mapa clave → selector: `joy` `.tactil-joy` (con `palanca` → `.tactil-joy-palanca`), `saltar`
  `.tactil-saltar`, `bajar` `.tactil-bajar`, `pausa` `.tactil-pausa`, `pantalla` `.tactil-pantalla`,
  `sv-*` `.tactil-boton.sv-*` y `mision` `#hud .mision-activa`.
- Traducción de cada campo:
  - `ancla` `ii` + `desde: pie`: `left: calc(<x>px + env(safe-area-inset-left, 0px)); bottom: calc(var(--pie) + <y>px)`.
  - `seguro: false`: sin `env(...)`.
  - `pie`: `body.con-tactil { --pie: calc(var(--casilla) + <pie>px + env(safe-area-inset-bottom, 0px)) }`;
    en `baja`, sin la zona segura, como hoy.
  - La ancla contraria se anula: un `ancla: id` pone `left: auto` y `top: auto`.
  - `oculto`: `display: none`.
- Llamada: `tactil-supervivencia.js` pide `cargarDatos('ui-layout')` y `cargarDatos('textos')` **al
  importarse el módulo** (`main.js` lo importa al abrir la página) y los aplica en
  `iniciarTactilSupervivencia`. Las etiquetas fusionan `TEXTOS` del archivo con `textos.tactil`.
  `CAM` y `/` pasan a leerse del mismo lado.
- **Sin JSON, el resultado debe ser idéntico al de hoy.** Prueba: `getComputedStyle` de los 13
  elementos, con y sin `?sin-datos`, en 844×390 y 390×844. Con los valores iniciales de
  `ui-layout.json` también debe dar igual, porque son los mismos números del CSS.

### Editor de layout (`estudio/index.html` → pestaña Layout)

- **Vista**: `vista-tactil.html` en un iframe con el tamaño del aparato elegido, escalado para caber.
  - Antes de importar, la página hace `window.ontouchstart = null` para forzar el táctil.
  - Carga `mundo/supervivencia/supervivencia.css` y crea `#barra-rapida` con 9 casillas falsas y
    una `.mision-activa` de ejemplo.
  - Llama a `iniciarTactil(stubJugador)` y a `iniciarTactilSupervivencia({ … stubs })`, y después a
    `tactil.activar()`. El stub de jugador es lo mínimo que leen `etiquetas()` y los botones de
    `tactil.js` (revisar el archivo).
  - Muestra ACARICIAR siempre.
  - Escucha `postMessage` del editor: `{ tipo: 'layout', datos }` → `aplicarLayout(datos)`.
- **Aparatos**: celular vertical 390×844, celular acostado 844×390, Android 412×915 y 915×412,
  tablet 820×1180, y personalizado. Con altura ≤ 460 se edita el perfil `baja`. Opción «zona
  segura» que simula 47 px arriba en vertical y a los lados en acostado.
- **Interacción**:
  - Cada elemento lleva un asa encima: arrastrar lo mueve (rejilla de 2 px; con Shift, 1 px) y la
    esquina lo agranda.
  - Las flechas mueven 1 px (con Shift, 10 px) y Ctrl+Z deshace.
  - El panel lateral muestra campos numéricos del elegido: ancla, x, y, desde, w, h, letra, oculto.
  - Al arrastrar se mantiene la ancla y se recalculan x e y desde el `getBoundingClientRect` real.
  - **Avisos**: botones que se tapan (borde rojo), botones de menos de 44 px (amarillo) y botones
    fuera de la pantalla.
  - En `baja` se guarda solo lo que difiere de `normal`. «Restablecer» borra la clave y vuelve al
    CSS.
- **Guardar**: `PUT /api/datos/ui-layout` con el `If-Match`. Sin servidor, «Guardar» se deshabilita
  y aparece «Descargar JSON».
- **Estética**: paneles de `mundo.css` (bisel Minecraft, PixelCraft, sin emojis: los íconos son CSS o
  `ICONOS`). Todo texto visible con `data-es` y `data-en` y el selector de idioma de siempre
  (`preferredLanguage`). El editor es para escritorio; a menos de 900 px avisa «Abre el Estudio en el
  computador».

### Pruebas (`node mundo/tests/estudio.mjs`)

- `formatear` es idempotente sobre los 5 archivos de `mundo/datos/` (sale igual byte a byte).
- `validar` acepta los 5 archivos y rechaza estos casos: ancla `centro`, botón desconocido, texto sin
  `en`, texto vacío, `dy: 'arriba'`, canal `brazo`, oscilador `cuadrada` y ángulo 9.
- `fusionar`: los objetos se mezclan, los arreglos se reemplazan y lo que falta queda del código.
- CSS de `aplicarLayout` para los datos iniciales: comparar con un texto esperado.
- Servidor (lo levanta la prueba en un puerto libre):
  - `PUT` válido escribe y formatea;
  - nombre fuera del índice da 404;
  - sin `X-Estudio` da 403;
  - un `If-Match` viejo da 412;
  - un JSON inválido da 422;
  - `/../` no sale de la raíz;
  - el 304 funciona con `ETag`.
- Paridad de gestos: copiar la prueba de concepto de la fase 0 (evaluar `poses.json` contra `GESTOS`
  y `GESTOS_AMISTAD`). Así nadie cambia un gesto en JS sin que el JSON de referencia lo note.
- En el navegador:
  - Estilos computados iguales con y sin datos, en 844×390 y 390×844.
  - Mover un botón en el editor, guardar, ver el diff de una línea y ver el botón movido en
    `supervivencia.html` (táctil forzado con el modo dispositivo del navegador).
  - Sin errores de consola.

### Medición (regla del bloque 7)

- Al abrir `supervivencia.html` y entrar a un mundo nuevo: archivos y KB al abrir, tiempo de entrar
  y cuadro mediano. Comparar `main` con la rama.
- Referencias: 88 archivos y 2184-2199 KB al abrir, entrar ~514-615 ms, cuadro mediano 1,8-4,2 ms
  según la máquina.
- Esperado: +3 archivos (cargador, `layout-datos.js` y 2 JSON pequeños; ~6 KB) y sin cambio en el
  cuadro.
- Medir también el servidor Node contra el de Python: tiempo hasta `load` con caché fría y con caché
  caliente (el `ETag` debería mejorar la caliente).

### Listo cuando

- `launch.json` arranca el servidor Node con el mismo nombre `venjy` y puerto 5510, y `capturar.mjs`
  y `posar.mjs` siguen funcionando.
- Todas las pruebas de `mundo/tests/` pasan (las de siempre y `estudio.mjs`).
- `indice.json` dice `lee` para `ui-layout` y `textos`.
- `node estudio/cli.mjs resumen` y `validar` cumplen §7.
- `CLAUDE.md` cambia `python -m http.server 5510` por `node estudio/servidor.mjs`; Python queda
  anotado como alternativa de solo lectura.
- `PENDIENTES.md` (estado y bitácora) y `MAPA.md` están al día.
- Artifact y prompt de traspaso a la fase 2.

## 6. Fases 2 a 7 (resumen y contratos clave)

### Fase 2 · el juego dentro del Estudio

- `supervivencia.html?estudio` carga `estudio/puente-juego.js` con un `import()` de una línea en un
  `<script type="module">` del HTML. No toca `main.js`. El puente espera `window.__venjy` y crea o
  abre el mundo «Estudio» en Pacífico (igual que `capturar.mjs`).
- **Canal** `new BroadcastChannel('venjy-estudio')`. Se elige en vez de acceso directo al iframe
  porque:
  - funciona igual con el juego en otra pestaña o en un segundo monitor;
  - no mezcla objetos de dos instancias de Three.js;
  - el CLI `capturar` usa el mismo protocolo desde Playwright.
- **Mensajes** (todos `{ tipo, id?, ... }`; las respuestas repiten el `id`):

| Del Estudio al juego | Respuesta |
|---|---|
| `hola` | `listo { version, idioma }` |
| `datos { nombre, datos }` (aplica sin recargar: layout, textos; después posiciones y poses) | `ok` / `error { mensaje }` |
| `tp { destino }` o `tp { x, y, z }` (los destinos de `/tp`) | `ok { pos }` |
| `elegir { tipo: 'persona', clave }` (fase 4) | `elegido { punto }` |
| `escena { clave }`, `pausa`, `irA { t }` (fases 5 y 6) | `ok { T }` |
| `pose { clave, canales }` (fase 6) | `ok` |
| (del juego) `cambio { nombre, ruta, valor }` cuando el gizmo mueve algo | — |

- **Recarga en vivo**: `GET /api/eventos` (SSE) en el servidor avisa `cambio <nombre>` al escribir un
  archivo de `mundo/datos/`. Sirve para el celular en la red local (`--lan`), donde el
  `BroadcastChannel` no llega.
- **CLI `capturar`** (§7) envuelve `capturar.mjs` y `posar.mjs`. Playwright se resuelve desde el npm
  global (`npm root -g`) o con la variable `PLAYWRIGHT`, no con la ruta fija `/opt/node22/...` del
  contenedor.

### Fase 3 · textos y diálogos ES/EN

- **Esquema `dialogos.schema.json`**, con el bloque `texto` de `comun`:
  - `temas[persona][]`: `{ id, p, r, g?, req?, skin? }`;
  - `opiniones`;
  - `saludos { bajo, alto, skin }`;
  - `regalos`.
  Mismas claves que `dialogos-datos.js`.
- **Migración piloto**: `dialogos-datos.js` queda como fachada que importa el JSON. Exporta lo mismo
  (`TEMAS`, `OPINIONES`, `SALUDOS`, `REGALOS`) y se carga con el mismo `import()` dinámico de
  `hablar.js`. Prueba de paridad: el export antes y después es igual (`deepEqual`).
- **Editor de textos**:
  - tabla filtrable por persona y por tema;
  - ES y EN lado a lado;
  - marca «revisado» (el dueño aprueba los textos de personas reales);
  - largo y vista en un globo real (fase 2).
- **Avisos del editor y de `validar`**:
  - emojis;
  - caracteres que PixelCraft no tiene (se lee la tabla `cmap` de `font/pixelcraft.ttf` una vez y se
    guarda `estudio/glifos.json`);
  - par incompleto;
  - plantilla `{n}` presente en un idioma y no en el otro.
- **`mundo/DIALOGOS.md`**: se genera con `cli.mjs resumen dialogos --md` en vez del script de cada
  bloque.
- **Precios**: `tienda.schema.json` para ofertas nuevas, con los objetos por nombre (los de `/dar`),
  nunca por id numérico.

### Fase 4 · posiciones con gizmo

- **Dependencia**: copiar `examples/jsm/controls/TransformControls.js` de Three.js 0.186.1 a
  `vendor/three-addons/` con su licencia, y añadir en `supervivencia.html`, antes de cualquier
  módulo:
  `<script type="importmap">{ "imports": { "three": "./vendor/three.module.js" } }</script>`.
  Medir que no cambie la carga normal: el gizmo se importa solo con `?estudio`.
- **En el juego**: el puente crea el gizmo sobre la persona elegida. Al soltar, convierte la
  posición del mundo a `{ ancla, marco, dx, dy, dz, giro }` (inversa de la fórmula de
  `posiciones.schema.json`) y manda `cambio`. El Estudio guarda.
- **Piloto**: `amigos.js` lee `posiciones.json` en `nuevo()`. El orden es `datos.personas[clave]` →
  si no, los números de hoy. **Después de fusionar 6d.**
- **Riesgo**: las escenas usan `n.x`/`n.z` de cada amigo como sitio de vuelta («vuelve a su sitio» en
  `amistad.mjs`). Mover a alguien debe seguir pasando esas pruebas.

### Fase 5 · escenas y guiones

- **Esquema de escena** (lo diseña Opus en esa fase), sacado de `ANIMACIONES`:
  - `T`, `r`, `linea [desde, dura]`, `golpes [s]`, `corazones [s]`;
  - `pista { n: [[gesto, desde, hasta]], j: [...] }`;
  - después, planos de cámara.
  Los guiones con lógica (moldes, `fusion`, `espejo`, grupos) siguen en JS. Solo las escenas nuevas
  y simples nacen en JSON.
  **Diseño cerrado en §13** (esquema, piloto con paridad y partición en los PR 5a, 5b y 5c).
- **Editor**: línea de tiempo con una fila por actor, bloques de gesto que se arrastran y estiran,
  marcas de golpe y de frase, y Reproducir, Pausa e Ir a con el puente. Los nombres de gesto se
  validan contra `GESTOS`, `GESTOS_AMISTAD`, `MOLDES` y `poses.json`.

### Fase 6 · poses y animaciones

- **Evaluador**: `mundo/datos/gestos.js` con `evaluarGesto(def, u, t, info, salida)`. Es la misma
  matemática que la prueba de concepto de la fase 0. No reserva memoria por cuadro: escribe en un
  objeto reutilizado y no usa closures por cuadro.
- **Conexión**: el motor busca primero en `poses.json` y, si no, en `GESTOS`. Las variantes
  `sentado` y `jugador` reemplazan canales.
- **Editor**:
  - sliders por canal con los rangos de `rig.md`;
  - vista de frente, 3/4 y lado (como `posar.html`);
  - curva por canal con keyframes que se arrastran;
  - osciladores con amplitud, frecuencia y fase;
  - reproducción en el juego con el puente;
  - botón «medir» (la punta de la mano, como `capturar.mjs --medir`).
- **Piloto**: los 11 gestos que ya están en `poses.json` (paridad exacta probada). El resto
  (`baile`, `cabecea`, `hachazo`, `sorpresa`) entra si se extiende el esquema (`ciclo`, forma
  `pulso`), con su prueba de paridad.
- **Partición** (2026-10-11): PR 6a = evaluador + lectura del juego + en vivo + CLI (hecho, §16); PR 6b = el editor de
  arriba (pestaña Poses) con el mensaje `pose`. Detalle y criterios de 6b en §16.

### Fase 7 · motor genérico (opcional)

Solo si aparece otro juego. Candidatos a extraer: servidor, formato, validador, cargador, puente y
editor de layout. No se extrae el rig ni las escenas.

## 7. CLI para el agente (contrato)

`node estudio/cli.mjs <orden> [argumentos]`. Sin colores ni adornos. Una línea por cosa, en orden
estable. `--json` devuelve lo mismo para máquinas. Códigos de salida: 0 bien, 1 errores, 2 avisos que
piden confirmación.

### `resumen`

Lee `mundo/datos/*.json` y, mientras no estén migrados, los módulos JS de datos con `import()`
(como los tests). Corta cada texto a 90 caracteres; `--completo` muestra todo y `--idioma es|en|ambos`
elige idioma (por defecto `es`).

```
$ node estudio/cli.mjs resumen
ui-layout   13 elementos (normal) · 3 (baja) · lee tactil-supervivencia.js
textos      1 espacio, 7 textos · lee tactil-supervivencia.js
posiciones  9 personas · referencia (fase 4)
poses       6 poses, 11 gestos · lee gestos.js
js:dialogos 93 temas, 53 variantes de skin, 74 opiniones (dialogos-datos.js, 54 KB)
js:tienda   13 tiendas, 80 ofertas (tienda-datos.js, 14 KB)

$ node estudio/cli.mjs resumen ui-layout
sv-romper   id 98,88 pie 76x76 | baja 88,82 66x66
sv-usar     id 14,88 pie 76x76 | baja 14,82 66x66
…

$ node estudio/cli.mjs resumen poses habla
habla  reloj t  bDx -0.9 ~0.3@5  bDz 0.2 ~0.15@3.1  bIx -0.55 ~0.2@4+1  bIz -0.15  cx ~0.06@6

$ node estudio/cli.mjs resumen dialogos pony
pony.quien    ¿Quién eres? -> Soy el Pony. Pescador de muelle y, según todos, el más chico del g…  [g yo] [skin 6]
pony.aqui     ¿Qué haces aquí? -> Pesco. Bueno, espero que piquen, que es casi lo mismo pero con…
pony.abuelo   ¿Quién te enseñó a pescar? -> Mi abuelo de Tomé, el de los bacalaos. Me dijo q…  [req nivel 2]
…
```

Filtros: `resumen <archivo|js:fuente> [clave o prefijo]`. Las fuentes JS se registran en
`estudio/fuentes.mjs` (una función por módulo que devuelve filas). Fase 1: `dialogos`, `tienda` y
`amistad` (frases y animaciones).

### `validar`

```
$ node estudio/cli.mjs validar                 # todos los de indice.json
$ node estudio/cli.mjs validar ui-layout textos
$ node estudio/cli.mjs validar --contra HEAD   # además: valores existentes que cambiaron
ui-layout.json  $.supervivencia.normal.botones.joy.w: 10 < 24
textos.json     CAMBIO tactil.romper.es: «ROMPER» -> «PICAR» (usa --permitir-cambios si lo pidió el dueño)
OK 4 de 5 archivos
```

Revisa:
- el esquema;
- el formato (`formatear(x) === x`; con `--arreglar`, lo reescribe);
- emojis;
- desde la fase 3: glifos de PixelCraft y pares de plantilla;
- desde las fases 4 y 5: referencias (anclas, gestos y personas que existen).

Imprime solo los problemas y una línea final.

### `capturar` (fase 2)

```
$ node estudio/cli.mjs capturar layout acostado          # PNG de vista-tactil con el JSON aplicado + choques
$ node estudio/cli.mjs capturar pose sentadoSuelo --skin pony
$ node estudio/cli.mjs capturar gesto habla --tiempos 0,0.4,0.8 --hoja   # una hoja en vez de N imágenes
$ node estudio/cli.mjs capturar escena punos --tiempos 0.5,1.45,2.4 --medir "manoD()"
/scratchpad/estudio/layout-acostado.png  choques: ninguno  fuera: ninguno
```

Imprime solo rutas y números. Con `--medir` muchas veces no hace falta mirar la imagen.

### Cuánto ahorra (estimado, ~3,5 bytes por token)

| Para saber… | Hoy se lee | Con el CLI |
|---|---|---|
| Qué dice Pony en «Hablar» | `dialogos-datos.js` entero: 54 KB, ~15 000 tokens | `resumen dialogos pony`: ~10 líneas, ~400 tokens |
| Revisar los textos de un bloque | `mundo/DIALOGOS.md`: 107 KB, ~30 000 tokens | `resumen dialogos <persona>` o el editor de textos |
| Dónde está cada botón táctil | `tactil.css` + `supervivencia.css`: 42 KB o varios grep | `resumen ui-layout`: 13 líneas, ~250 tokens |
| Valores de un gesto | `escenas-skin.js`: 38 KB, o grep con contexto | `resumen poses <gesto>`: 1 línea |
| Si un cambio de datos está bien | Captura y mirarla (imagen ~1 500 tokens) | `validar` y `capturar … --medir`: 1-3 líneas |

Todo el contenido en JS de la supervivencia (archivos `*-datos.js`, momentos, bienvenidas, grupos,
reencuentros y moldes) más `DIALOGOS.md` pesa **474 KB** (39 archivos), ~135 000 tokens si se leyera
entero.

## 8. Decisiones del dueño (2026-10-10)

- **Criterio general**: el Estudio tiene que ser lo más cómodo posible para el dueño y para Claude.
  El dueño solo opina en lo obvio; las decisiones de diseño y arquitectura las toma el chat de cada
  fase (y las anota aquí o en la bitácora).
- **Orden 3 ↔ 4** (textos antes que posiciones): aprobado.
- **Giro en grados** en `posiciones.json` (el resto del juego usa radianes): aprobado. Poner a
  alguien de espaldas es sumarle 180.
- **`estudio/` no se publica**: `_config.yml` lo excluye del build de GitHub Pages (Jekyll, rama
  `main`, raíz). Solo existe en el repo y en el servidor local. `mundo/datos/` sí se publica, porque
  lo lee el juego. Después de fusionar, comprobar que
  `https://venjyy.github.io/venjy-page/estudio/DISENO.md` da 404 y que el juego carga igual.
- **Más adelante**: el mismo `aplicarLayout` podría servir para que cada jugador mueva sus botones
  dentro del juego (guardado en `localStorage`), por ejemplo en el menú de opciones de 7b-2. No se
  hace ahora.

## 9. Fase 1 · lo que cambió al construirla (2026-10-10)

- **Datos corregidos**: `pausa` y `pantalla` salen de `ui-layout.json`. Sus valores de la fase 0 no eran los de
  hoy (`mundo/mundo.css` las ubica con `!important` según ancho y minimapa). Si se editan, se escriben y
  `layout-datos.js` agrega `!important` solo a esas dos claves.
- **`desde: pie` no suma `env(safe-area-inset-bottom)`**: `--pie` ya lo trae. El texto del §5 decía lo mismo;
  queda fijado con la prueba de CSS esperado.
- **`PUT` exige `If-Match`** (428 sin él; `*` para crear). También rechaza un `Host` que no sea localhost
  (contra DNS rebinding) y contesta 405 a los otros métodos.
- **Sin `?tactil`**: el juego no lo tiene. El editor usa `vista-tactil.html`; en el juego real, el modo
  dispositivo del navegador.
- **Zona segura simulada**: `vista-tactil.html` recibe `{ tipo: 'seguro', t, r, b, l }` y mueve el contenedor
  `.tactil` (no puede cambiar `env()`); es una aproximación para ver el efecto, no medidas reales.
- **El cargador pide los dos JSON al importar `tactil-supervivencia.js`** y aplica el layout al llegar si los
  botones ya existían (sin tocar `main.js`).
- **El editor guarda lo medido**: al arrastrar, x e y salen del `getBoundingClientRect` real de la vista; en
  perfil `baja` solo se guarda lo que difiere de `normal`.
- **Medición**: ver «Estudio» en `mundo/PENDIENTES.md`. El servidor Node carga en frío ~5 veces más rápido que
  `python -m http.server` (1,2 s contra 6 s con 97 recursos) y siempre sirve archivos al día.

## 10. Fase 2 · lo que cambió al construirla (2026-10-10)

- **Archivos**: `estudio/puente-protocolo.js` (canal, versión, `DATOS_VIVOS`, `crearManejador`: el lado del juego sin DOM),
  `puente-juego.js` (el lado del juego con DOM: abre el mundo, `/tp`, SSE), `puente-cliente.js` (el lado del Estudio y de
  las pruebas), `juego.js` (pestaña Juego), `avisos-layout.js` (choques, botones chicos y fuera de pantalla: lo usan el editor
  y el CLI), `evaluar.mjs` (evaluador de gestos de referencia: lo usan el CLI y la prueba de paridad), `playwright.mjs` y
  `capturar.mjs` (CLI).
- **Cambia `supervivencia.html`** (3 líneas): un script clásico que fuerza el táctil con `?estudio=tactil` y un
  `<script type="module">` que hace `import('./estudio/puente-juego.js')` solo con `?estudio`. `main.js` no se toca. El único
  cambio en código del juego es `aplicarDatosVivos(nombre, datos)` en `tactil-supervivencia.js` (cambia el JSON ya cargado y
  repinta los botones existentes).
- **Mensajes implementados**: `hola` (→ `listo { version, idioma }`, o `estado { fase: 'abriendo' }` mientras el mundo
  carga), `datos` (`ui-layout` y `textos`), `tp`. Del juego, sin `id`: `estado { fase }` y `error { mensaje }`. `cambio`,
  `elegir`, `escena`, `pausa`, `irA` y `pose` quedan para las fases 4 a 6 (el manejador contesta «mensaje desconocido»).
  Todo mensaje lleva `de: 'estudio' | 'juego'`; las respuestas repiten el `id`. El cliente espera 15 s antes de dar error
  (el juego puede estar generando chunks).
- **`/tp` sin tocar `comandos-dev.js` ni `main.js`**: el puente prende el modo devenjy, manda `/tp <destino>` por
  `__venjy.consola.ejecutar` y lo apaga en el mismo instante (así el panel de ayuda no se queda en pantalla). El destino
  se valida con una lista corta de caracteres; si la posición no cambia, el error dice que no existe el destino.
- **Mundo «Estudio»**: el puente cliquea el DOM del menú (como `capturar.mjs`): abre la tarjeta que se llama «Estudio» o crea
  una en Pacífico. Con 5 mundos y sin «Estudio» da un error que lo explica. Las escenas de skin pueden dispararse al llegar
  a una persona (no se silencian: lo decidirá la fase 5).
- **SSE** (`GET /api/eventos`): `event: cambio` con `data: <nombre>`. Se anuncia al guardar (`PUT`) y al detectar un cambio en
  disco con `fs.watch` (un agente, VS Code); un hash evita el aviso doble y los toques sin cambios. El juego con `?estudio` lo
  escucha, vuelve a leer el archivo y lo aplica (solo `ui-layout` y `textos`). Latido cada 25 s; `close()` del servidor corta los flujos.
- **Estudio**: la pestaña Juego carga el iframe la primera vez que se abre. Lo que se mueve en Layout se manda al juego en cada
  cambio (con o sin guardar; se junta un mensaje por cuadro). La casilla «Controles táctiles» recarga el iframe con
  `?estudio=tactil` (si no, el juego de escritorio no tiene botones táctiles que mover). «Abrir en otra pestaña» sirve para
  un segundo monitor: el canal funciona igual.
- **CLI `capturar`**: `layout <aparato> [--seguro] [--datos archivo]`, `pose <clave|--pose json>`, `gesto <clave> --tiempos … [--hoja]`
  y `escena <clave> --tiempos … [--medir js] [--plano k]`. Levanta su propio servidor en un puerto libre (no hace falta
  tener el 5510 abierto; `--url` usa otro). La salida es una línea por archivo; `layout` agrega choques, fuera y chicos
  (los de `avisos-layout.js`). Códigos: 0 bien, 1 error de uso o de entorno, 2 si la página dio errores de consola.
  `capturar.mjs`, `posar.mjs`, `planos.mjs` y `grabar.mjs` de la skill resuelven Playwright con `estudio/playwright.mjs`;
  `capturar.mjs` y `posar.mjs` además exportan `capturarEscena` y `posar` (el CLI las importa) y siguen sirviendo por línea de comandos.
- **Playwright y navegador**: `PLAYWRIGHT` (carpeta del paquete `playwright` o `playwright-core`) → `npm root -g`. Navegador:
  `PLAYWRIGHT_CHROMIUM` → el que trae el paquete → el más nuevo de la caché `ms-playwright` (headless shell primero) → Chrome →
  Edge. Con Chromium 153 el argumento `--use-gl=swiftshader` hace fallar `screenshot`; se usa `--use-angle=swiftshader`
  (vale también en los anteriores). En este equipo hay `playwright-core` 1.62.1 dentro de `omniroute` y un Chromium en la
  caché; no se instaló nada: `PLAYWRIGHT=<ruta a esa carpeta>`.
- **Sin probar**: la pestaña Juego en un celular real con `--lan`. `capturar escena pony` sí corrió (va junto a la persona con
  `irJunto`, fuerza la escena y mide).

## 11. Fase 3 · lo que cambió al construirla (2026-10-10)

- **Archivos**: `mundo/datos/dialogos.json` y `estudio/esquemas/dialogos.schema.json`; `mundo/supervivencia/dialogos-datos.js` (ahora fachada);
  `estudio/textos.js` (editor, pestaña Textos), `avisos-textos.js` (avisos sin DOM: editor y `validar`), `glifos.mjs` y `glifos.json`
  (cmap de PixelCraft), `dialogos-md.mjs` (genera `mundo/DIALOGOS.md`); `mundo/datos/tienda.json` y `tienda.schema.json`;
  `mundo/tests/estudio-textos.mjs`.
- **Forma del JSON**: `temas` (persona → lista de `{ id, p, r?, g?, req?, skin? }`), `opiniones`, `saludos`, `regalos` y `gestoRegalo`
  (`GESTO_REGALO` también salió del JS). Cada texto es `{ es, en }` y puede llevar `revisado: true`. La migración la hizo un script
  que volcó los cinco exports tal cual: `deepEqual` contra el módulo anterior, diferencia 0 (93 temas, 53 variantes de skin, 74 opiniones,
  13 saludos, 13 regalos; 341 pares). Ningún texto quedó marcado como revisado: eso lo aprueba el dueño.
- **Fachada**: `dialogos-datos.js` hace `await fetch` del JSON en el navegador y `readFileSync` en Node (pruebas y CLI importan lo mismo
  que el juego). No usa `import … with { type: 'json' }`: exige Chrome 123, Safari 17.2 o Firefox 138, y un navegador más viejo rompería
  «Hablar» con un error de sintaxis. Se sigue cargando con el `import()` dinámico de `misiones.js`; al abrir la página no baja nada nuevo.
  Aquí el archivo **es** la fuente (no hay «código por defecto»), así que `?sin-datos` no lo afecta. `aplicarDatosVivos(datos)` cambia el
  contenido **en el sitio** (los objetos exportados son los mismos), y `hablar.js` los lee al usarlos: un texto editado se ve al reabrir
  el panel.
- **Datos vivos**: `dialogos` entra en `DATOS_VIVOS`. `puente-juego.js` importa la fachada con `import()` (solo con `?estudio`) y la
  actualiza, tanto al recibir `datos` del Estudio como por SSE al guardarse el archivo. `crearManejador` ahora espera `aplicarDatos`.
- **Vista en un globo real**: mensaje nuevo `globo { persona, texto }` (hasta 400 caracteres). El juego lo muestra con el globo especial de
  `misiones.js` (el mismo de los diálogos únicos), para lo cual `misiones.js` expone `decir` (una línea). El globo solo se ve a menos de
  14 bloques: el editor viaja con `/tp` junto a la persona (casilla activada por defecto). Las preguntas no tienen globo: son el texto de un botón.
- **Avisos** (`avisos-textos.js`): par incompleto, emoji, glifo que PixelCraft no tiene, variable `{n}` en un idioma y no en el otro, y
  largo (error si pasa su `max`; aviso si pasa 140 caracteres, que es un globo largo: hoy el más largo mide 132). En el editor se ven por
  fila y en un panel; Guardar se deshabilita mientras haya errores. `validar` aplica las mismas reglas a todo par `{ es, en }` de
  cualquier JSON y agrega las del contenido: ids de tema repetidos, tema sin respuesta que no sea `opina`, y en `tienda.json` que cada nombre
  de objeto exista (los de `/dar`). Necesita `estudio/glifos.json`: `node estudio/cli.mjs glifos` lo regenera desde la fuente (1379 glifos);
  `estudio-textos.mjs` avisa si quedó desactualizado.
- **`mundo/DIALOGOS.md`**: `resumen dialogos --md` imprime las 13 tablas; con `--escribir` reemplaza solo esas secciones (hasta «Saludos de
  amigos»). Las demás secciones vienen de otros archivos y no se tocan. La salida reproduce las 248 filas del archivo anterior sin
  diferencias de contenido; solo suma la columna **Revisado**. La prueba comprueba que el archivo esté al día.
- **CLI**: `dialogos` pasó de fuente JS a archivo de `indice.json` (`js:dialogos` sigue funcionando como alias). `resumen dialogos` muestra
  también saludos y regalos, y `[sin revisar]`. `resumen` cuenta cuántos textos faltan por revisar.
- **Tienda**: `tienda.schema.json` con ofertas y compras **nuevas** por nombre de objeto (no por id: `O` y `B` cambian al agregar
  objetos). `tienda.json` está vacío y `lee: null`: las 80 ofertas de hoy siguen en `tienda-datos.js`. Conectarlo es sumar esas ofertas al
  final de `TIENDAS` al cargar (misma lectura de `tienda.js`), cuando exista la primera oferta nueva.
- **Medida** (mismo Chromium con swiftshader, 1280×720, mundo nuevo en Pacífico; `main` en el commit base contra la rama, sin `?estudio`):
  al abrir 97 archivos y 2510 KB en las dos; hasta entrar al mundo 133 archivos y 5381 KB en las dos; entrar 0,75-1,25 s y cuadro mediano
  67-117 ms en las dos (swiftshader, ruidoso, sin diferencia). Al abrir «Hablar»: 2 archivos y 72 KB (`hablar.js` y `dialogos-datos.js`
  de 53 KB) contra 3 archivos y 91 KB (`hablar.js`, la fachada de 3 KB y `dialogos.json` de 69 KB). El +19 KB (sin comprimir; GitHub Pages
  sirve JSON con gzip) es del formato estable con un par ES/EN por varias líneas.
- **Sin probar / pendiente**: el globo en el juego con el Estudio en otra pestaña o por `--lan`; el editor con un teclado en celular (no es
  su uso). `estudio-navegador.mjs` falla en el paso de `/tp spawn` también en `main` (el jugador ya está ahí): no es de esta fase.

## 12. Fase 4 · lo que cambió al construirla (2026-10-10)

- **Archivos**: `mundo/datos/posiciones.js` (ancla ↔ mundo, sin DOM; lo usan `amigos.js`, el gizmo y las pruebas), `estudio/gizmo-juego.js`
  (el gizmo dentro del juego), `estudio/posiciones.js` (editor), `vendor/three-addons/TransformControls.js` (Three 0.186.1, `three.LICENSE`
  al lado), `mundo/tests/estudio-posiciones.mjs` y `estudio-posiciones-navegador.mjs`.
- **Anclas que el juego resuelve**: los 6 `lugares` (bx, bz, y), `escenario` (x, z, y y `yaw` propio) y `faro`. Los puntos RUTA (`spawn`,
  `casa`, `mina`…) son celdas del mapa 2D sin construcción propia y todavía no sirven de ancla: `validar` los rechaza con la lista de las que
  valen.
- **`amigos.js`**: `nuevo(clave, x, y, z, yaw, semilla)` sigue recibiendo los números de hoy y, si `posiciones.json` trae a esa persona
  (y el mundo tiene su ancla), usa el JSON. `cargarDatos('posiciones')` se pide al importar el módulo; si no llegó antes de crear a las
  personas, `aplicarPosiciones()` las reubica cuando llega (el mundo tarda más en generarse, pasa casi nunca). Sin archivo, roto o con
  `?sin-datos`: los números del código. La paridad es exacta bit a bit: el orden de las sumas del JSON reproduce el de las expresiones
  del código (`posiciones.js` lo comenta; la prueba lo verifica con un mundo de decimales feos).
- **`dy: "suelo"`** (braulio y conejeros): `y` vale 0 y la persona sigue buscando su suelo sola (`cargado`), igual que hoy. El gizmo de
  esos dos solo se mueve en X y Z.
- **Quién ignora `giro`**: Moisés y Lalo se miran entre sí (con ±0,35 rad) y Lucho mira a Boris; el juego lo recalcula siempre
  (`calcularMiradas`). El JSON de hoy trae `giro: 0` para ellos y no se tocó. El editor lo avisa y `validar` da un aviso solo si alguien
  les pone un giro distinto de 0.
- **Sitio de vuelta de las escenas**: las escenas leen `n.x`/`n.z` al empezar y los restauran al terminar; no copian el sitio a otro lado.
  Mover a alguien con el gizmo (o con el JSON) lo mueve todo junto. `amistad.mjs` y `vida-amigos.mjs` pasan sin cambios.
- **Mensajes**: `elegir { objeto: 'persona' | 'nada', clave?, modo?: 'mover' | 'girar' }` → `elegido { clave, punto }` (el campo no puede
  llamarse `tipo`: es el del sobre). Del juego, sin `id`: `cambio { nombre: 'posiciones', ruta: 'personas.<clave>', valor: punto }` al
  soltar. Errores con el id: persona que el mundo no tiene, persona sin entrada en `posiciones.json`, ancla que falta.
- **El gizmo**: un `Object3D` marcador en el **mismo grupo** que la persona (el de la supervivencia va subido 48 bloques; así `n.x/n.y/n.z`
  y el marcador comparten coordenadas de terreno) con `TransformControls` colgado. Mientras está puesto: el marcador manda sobre
  `n.x/n.z/n.yaw` en cada cuadro (braulio camina y las escenas lo mueven); el puntero queda libre (`requestPointerLock` de la
  vista se desactiva, la pausa no se abre al soltarlo y `.clic-seguir` se esconde; «Quitar gizmo» lo devuelve todo); el jugador mira hacia la persona (si no, el gizmo
  cae detrás de la barra de objetos); una escena que arranque se salta con su propio `saltar()` (un Esc abriría la pausa). Giro con paso de 5°.
- **Pestaña Posiciones = pestaña Juego + panel**: `data-seccion="juego"` en el botón. El iframe es el mismo (sin recargar y sin
  segundo mundo); al salir de la pestaña se quita el gizmo. Cada cambio de campo o de gizmo se manda al juego (`datos`) sin guardar;
  Guardar escribe con `If-Match`, y el servidor valida el esquema. «Volver a lo guardado» deshace solo a esa persona.
- **Persona sin entrada**: el editor solo lista las que ya están en `posiciones.json`. Para sumar una nueva hay que agregar su clave
  con ancla, `dx` y `dz` (a mano o por un agente) y recargar el editor. Un botón «Agregar persona» queda para cuando exista una.
- **Importmap**: `supervivencia.html` lo trae siempre (una línea). No cambia la carga: solo mapea `three` y el juego importa por ruta.
  `TransformControls.js` se baja con `import()` dinámico al elegir a alguien con `?estudio`.
- **Sin probar**: el gizmo con el Estudio en otra pestaña o por `--lan`; con táctil (el arrastre con el dedo sí funciona en
  TransformControls, pero el editor es de escritorio); personas de `npcs.js` (Pony, Salonas, Lona y los Venjy no están en `posiciones.json`).
- **Pruebas**: `node mundo/tests/estudio-posiciones.mjs` (Node) y `node mundo/tests/estudio-posiciones-navegador.mjs` (arrastre real con
  Playwright; toca `posiciones.json` y lo deja como estaba aunque falle).

## 13. Fase 5 · diseño de escenas (2026-10-11)

Solo diseño: esquema, piloto con paridad y partición en 3 PR para Sonnet. Nada del juego lee todavía `escenas.json`
(`lee: null` en `indice.json`). Archivos: `estudio/esquemas/escenas.schema.json`, `mundo/datos/escenas.json`,
`mundo/tests/estudio-escenas.mjs`.

### Lo que dice el código

- **Un solo motor**: `escena-amistad.js` corre las 4 genéricas de 6b, los momentos, las bienvenidas, los reencuentros y los
  grupos. Todas terminan en el mismo **guion de ejecución** (cabecera de `escena-amistad.js`):
  `{ T, r, lineas: [{ q, a, d, texto }], pista: { q: [[gesto, desde, hasta]] }, gestos, actores, reparto, yaw, golpes, corazones, extra }`.
- **`ANIMACIONES` ya es datos puros**; `guionGenerico(clave, tipo)` solo le agrega la frase de `FRASES_AMISTAD[clave][tipo]`
  como `lineas: [{ q: 'n', a: linea[0], d: linea[1] }]`.
- **Las bienvenidas, momentos y grupos son código que fabrica el guion**: `encadenar()` pone los tiempos de las frases con
  `durLinea`, los golpes salen de cuentas (`H = f(3) + 0.3`), los gestos propios son funciones (`tiembla` con senos,
  `frotaJ = MOLDES.frota + pz`), `desplazar`, `reparto`, `yaw` por función, `centro`/`colocar`, `extra.iniciar/cuadro/terminar`,
  objetos `PIX` y `SONIDOS`.
- **Un gesto se busca por nombre** en `guion.gestos` → `GESTOS_AMISTAD` → `GESTOS` (`escena-amistad.js`, `aplicar`). `MOLDES`
  solo existe si el guion lo pasa en `gestos` (las bienvenidas hacen `gestos: { ...MOLDES, … }`).
- **Peso de un tramo**: `gestoDe` da `u = (t - desde) / (hasta - desde)` y rampas de `min(0,3, tramo / 3)`. Es todo lo que el
  motor hace con la pista; por eso, con datos iguales, la paridad es exacta.
- **Cámara**: `escena-amistad.js` elige `PLANOS_AMISTAD`, `PLANOS_GRUPO` o `PLANOS_GRUPO_TECHO` y los pasa a
  `camaras.iniciarCine({ planos })`. `camaras.js` cambia de plano con cada frase, pero **salta los planos tapados**
  (`siguientePlano`): qué plano sale en cada frase no se sabe sin el mundo. Los planos manuales (`camaras.manual`) piden
  coordenadas del mundo.
- **`escenas-skin.js`** (`CORTAS`, `VENJY`, `IGLU`) es otro motor (humo, objetos del iglú, globos propios). Queda fuera de la fase 5.

### Decisiones

1. **Un archivo, dos tipos.** `escenas.json` → `escenas.<clave>` con `tipo`:
   - `amistad`: la misma forma que `ANIMACIONES` (`nivel`, `T`, `r`, `linea [desde, dura]`, `golpes`, `corazones`, `pista`).
     Reemplaza por clave a la de `ANIMACIONES`. La frase sigue en `FRASES_AMISTAD` (13 personas × 4); no entra a este archivo.
   - `guion`: escena nueva y simple con sus frases: `lineas [{ q, a, d?, texto {es, en, revisado?} }]`, `actores` extra
     (`clave` o `{ clave, radio }`), `golpes`, `corazones`, `pista`.
2. **El mismo vocabulario que el guion de ejecución.** Ningún nombre se traduce: el convertidor es casi la identidad y la
   paridad es fácil de probar.
3. **Tiempos absolutos** en segundos de escena. Nada de «después de la frase 3»: encadenar es lógica, y el editor arrastra
   bloques en una línea de tiempo. En `guion`, `d` es opcional: si falta vale `durLinea(texto)` (`reencuentros.js`), lo que se
   alcanza a leer (regla del dueño: no apurar frases).
4. **Gestos solo por nombre.** Una escena no define gestos ni variantes (`frotaJ = frota + pz 0.4`). Un gesto nuevo va a `MOLDES`
   (JS) o, desde la fase 6, a `poses.json`. Nombres válidos = los que el juego resuelve: `GESTOS`, `GESTOS_AMISTAD`,
   `MOLDES` y, desde el PR 6a, los gestos y las poses fijas de `poses.json` (§16).
5. **Fusión** (regla 2 de §3): `fusionar(ANIMACIONES[k], escenas[k])` sin `tipo`, `camara` ni `nota`. `pista` es objeto: una
   fila de actor del JSON reemplaza la fila entera; una fila que falta queda la del código. Sin archivo, roto o con
   `?sin-datos`: el código.
6. **Cámara (después, PR 5c)**: `camara.planos` = `"amistad" | "grupo" | "grupo-techo"` o una lista propia de planos con la
   forma de `PLANOS_AMISTAD` (`nombre`, `ang`, `dist`, `alto`, `orbita`, `dolly`). Se pasa tal cual a `iniciarCine`. **Sin
   cortes por tiempo ni planos manuales** (pedirían tocar `camaras.js` y coordenadas del mundo). Ver un plano en el editor =
   reproducir la escena con `planos: [ese]`.
7. **Quién dispara una escena `guion`**: nadie, sola. Se juega con `/amistad guion <clave> [persona]` y desde el Estudio.
   Conectarla a un evento (llegar a un lugar, subir de nivel) es JS y lo decide el dueño escena por escena.
8. **Reglas que el esquema no expresa** (`cli.mjs validar`; errores salvo donde dice aviso):
   - tramos de cada fila en orden, `desde < hasta ≤ T` y sin superponerse;
   - cada fila de `pista` y cada `q` de `lineas` es `n`, `j` o un actor declarado (o `todos` en `lineas`);
   - cada gesto existe (punto 4);
   - `golpes` y `corazones` en orden creciente y `< T`; la frase (`linea` o cada línea) termina antes de `T`;
   - **aviso**: dos frases que se pisan; `d < durLinea(texto)` (frase apurada); `texto` sin `revisado: true`; escena
     `amistad` cuya clave no está en `ANIMACIONES` (el juego la ignoraría).
   Hoy están en la sección 3 de `mundo/tests/estudio-escenas.mjs`.
9. **El editor muestra también las 4 de `ANIMACIONES`**: las que no están en el JSON salen como «en código»; editarlas las
   copia al JSON (añadir claves está permitido). Así el piloto no obliga a migrar a mano.

### Qué queda en JS (y por qué)

> Etapa B, punto 3 (2026-10-21): cómo pasa cada fila de esta tabla a datos, en §40.

| Queda en JS | Por qué |
|---|---|
| `fusion`, `seguidos`, `espejo`, `con`, `desplazar` y los moldes compuestos | Son funciones de funciones; en datos serían un lenguaje nuevo |
| Gestos propios de una escena (`tiembla`, `frotaJ`, `punoM`) | Senos, sumas y moldes corridos: van a `MOLDES` o, en la fase 6, a `poses.json` |
| `reparto` y `yaw` | La misma escena en las dos direcciones y giros que dependen de dónde está cada uno |
| Escenas de grupo (`centro`, `colocar`, `api.mover`, `api.camara`) | Dependen del lugar y de quién vino |
| `extra` (`iniciar`, `cuadro`, `terminar`), objetos `PIX`, `SONIDOS`, efectos | Código por cuadro |
| `encadenar` y tiempos derivados (`H = f(3) + 0.3`) | Lógica; en JSON se guarda el número ya calculado |
| Bienvenidas, momentos y reencuentros | Usan todo lo anterior. Se migran solo si se tocan **y** caben en el esquema |
| `escenas-skin.js` | Otro motor |

### Piloto (hecho en esta fase)

`punos` (golpe) y `pareja` (corazones) copiados de `ANIMACIONES`. `abrazo` y `secreto` siguen en el código (el editor los
mostrará, decisión 9). `node mundo/tests/estudio-escenas.mjs`: formato estable, esquema, 7 casos inválidos que fallan, una
escena `guion` de ejemplo válida, paridad de datos exacta y, cada 1/120 s, el mismo gesto con el mismo `u` y peso
(3418 comparaciones, diferencia máxima 0), más las reglas del punto 8.

### Partición para Sonnet (3 PR, en orden)

Reglas para los tres: no tocar `camaras.js`, `mano.js`, `skin.js` ni `coop.js`; todo texto visible del Estudio con `data-es` /
`data-en`; `escenas.json` solo gana claves (los valores del piloto no se cambian); PENDIENTES.md y MAPA.md al día.

**PR 5a · el juego lee `escenas.json` (sin editor)** · rama `estudio-fase5a` · **hecho (2026-10-11)**: resumen y medidas en «Estudio» de `mundo/PENDIENTES.md`. Lo único que difiere del texto: el módulo importa el JSON con `await cargarDatos('escenas')` al nivel de módulo (no hay carrera con la primera escena) y `reglasEscenas(datos, { gestos, animaciones, durLinea })` recibe también `durLinea` para el aviso de frase apurada y para el `d` que falta.
- `mundo/datos/escenas.js` (nuevo, puro, sin DOM): `animacionDeDatos(def)` (quita `tipo`, `camara` y `nota`, como la prueba),
  `guionDeDatos(def, { durLinea, moldes })` → guion de ejecución (`d` que falta = `durLinea(texto)`, `gestos: moldes`,
  `actores` tal cual) y `reglasEscenas(datos, nombres)` → `[{ tipo: 'error' | 'aviso', texto }]` (punto 8).
- `escena-amistad.js`: `cargarDatos('escenas')` al importar el módulo (ya se importa con `import()` solo al usarse: la carga
  inicial no cambia). `guionGenerico` usa `fusionar(ANIMACIONES[tipo], animacionDeDatos(datos.escenas[tipo]))` solo si esa
  escena es de tipo `amistad`. Función nueva `jugarGuion(clave, persona)` (sin persona: la más cercana): importa `moldes.js`
  con `import()` y llama a `iniciar`. `__venjy.amistadEscena.jugarGuion`. `aplicarDatosVivos('escenas', datos)` para el Estudio.
- `comandos-dev.js`: `/amistad guion <clave> [persona]`.
- `estudio/puente-protocolo.js`: `escenas` en `DATOS_VIVOS`. `indice.json`: `lee: "mundo/supervivencia/escena-amistad.js"`.
- `estudio/cli.mjs`: `resumen escenas` (una fila por escena: clave, tipo, T, actores, tramos, marcas) y `validar` con
  `reglasEscenas`; los nombres de gestos salen de importar `moldes.js` (con el `window` mínimo de las pruebas).
- `mundo/tests/estudio-escenas.mjs`: importa `escenas.js` en vez de la copia local; agrega que `guionGenerico` fusionado da
  lo mismo que el original en las 4 animaciones y que `guionDeDatos` completa `d` con `durLinea`.
- **Listo cuando**: todas las pruebas de `mundo/tests/` pasan; en el juego, `punos` da el mismo cuadro con y sin `?sin-datos`
  (`irA(1.45)`, una captura de cada uno); cambiar un golpe en el JSON y aplicarlo en vivo mueve la chispa; una escena `guion`
  de prueba (no se commitea) se juega con el comando; abrir el juego no suma pedidos (panel de red).

**PR 5b · editor de línea de tiempo (pestaña Escenas)** · rama `estudio-fase5b` · depende de 5a · **hecho (2026-10-11)**: lo que cambió, en §14
- `estudio/escenas.js` (nuevo) + `index.html` (habilitar la pestaña, con `data-seccion="juego"` como Posiciones) + `estudio.css`.
- `estudio/escenas-modelo.mjs` (nuevo, puro): mover, estirar, encajar a 0,05 s y tope contra el vecino (un tramo nunca pisa
  al otro: se detiene), agregar y borrar tramos y marcas, deshacer. Lo prueba Node.
- **Pantalla**: lista de escenas a la izquierda (JSON + las de `ANIMACIONES` «en código» + «Nueva escena»); arriba `T`, `r`,
  selector de persona (las 13 claves) y Reproducir / Pausa / Ir a; al centro, regla 0..T con zoom y filas `n`, `j` y extras;
  fila **frases** (bloques que se arrastran y estiran; ES y EN en el panel lateral, con el aviso de frase apurada); fila
  **marcas** (golpe = rombo, corazón = corazón píxel en canvas, sin emojis); panel lateral con los números del elemento
  elegido (como Layout). Doble clic en una fila vacía agrega un tramo con un selector filtrable de gestos; Supr borra.
- **Nombres de gestos**: `import()` de `../mundo/supervivencia/moldes.js` al abrir la pestaña (solo localhost; no afecta al
  sitio). La misma lista que `validar`.
- **Puente**: mensaje `escena { accion: 'jugar' | 'pausa' | 'ir', clave, persona, t? }` → `puente-juego.js` manda los datos
  vivos y llama a `jugarGuion` / `jugar`, `pausar`, `irA`. El juego responde `escenaT { t }` 10 veces por segundo mientras
  corre (el cabezal del editor lo sigue). Sin iframe de Juego, esos botones quedan deshabilitados.
- Guardar con `PUT` + `If-Match`; avisos en vivo con `reglasEscenas`.
- **Listo cuando**: `estudio-escenas.mjs` prueba el modelo; `mundo/tests/estudio-escenas-navegador.mjs` (Playwright, se omite
  sin él) arrastra un tramo, guarda, comprueba que cambió **una línea** de `escenas.json` y reproduce en el iframe viendo que
  `t` avanza; el JSON vuelve a como estaba aunque la prueba falle; una captura del editor.

**PR 5c · planos de cámara** · rama `estudio-fase5c` · depende de 5a (puede ir antes o después de 5b) · **hecho (2026-10-11)**: lo que cambió, en §15
- Mover `PLANOS_AMISTAD`, `PLANOS_GRUPO` y `PLANOS_GRUPO_TECHO` de `escena-amistad.js` a `escena-amistad-datos.js` (puro,
  exportados, mismos números). `escenas.js`: `planosDe(camara)` (nombre → la constante; lista → tal cual).
- `escena-amistad.js` (la línea `let cam = …`): si el guion trae `camara`, usa `planosDe(camara)`; `minDist`, `evitarDist` y
  `holgura` son los de la familia (`grupo*`: los de grupo; lista propia: los de amistad). Sin `camara`, igual que hoy.
- Editor: fila **cámara** con la lista de planos (campos numéricos, Agregar, Quitar, orden), «Usar juego: amistad / grupo /
  grupo techo» y «Ver» (reproduce la escena con `planos: [ese]`). No se dibuja qué plano toca en cada frase (decisión 6).
- **Listo cuando**: la prueba compara `planosDe('amistad')` con `PLANOS_AMISTAD` (y los otros dos); una escena con lista
  propia muestra esos planos (`camaras.planoNombre` por `__venjy`); sin `camara`, los de siempre; captura de un plano propio.

Modelo: los tres con **Sonnet** (instrucciones cerradas). 5b es el más largo; si no cabe en un chat, cortar después del modelo
puro y su prueba.

## 14. Fase 5 · PR 5b · lo que cambió al construirla (2026-10-11)

- **Archivos**: `estudio/escenas-modelo.mjs` (puro: las cuentas de mover, estirar, encajar y los topes), `estudio/escenas.js` (editor),
  `estudio/puntero-libre.js` (mouse suelto con cuenta, compartido con el gizmo), `mundo/tests/estudio-escenas-navegador.mjs`; pestaña y
  panel en `index.html`, `estudio.js` y `estudio.css`.
- **Pantalla**: la pestaña Escenas comparte la sección del juego (`data-seccion="juego"`). El juego se achica a 38 vh y la línea va debajo;
  la lista de escenas, los números del elemento elegido, los avisos y Guardar van en el panel lateral (no a la izquierda, como decía el
  §13). Una fila por actor (`n`, `j` y los extras declarados), una de frases (en carriles si se pisan) y dos de marcas (golpes: rombo
  amarillo; corazones: corazón rojo, ambos en canvas de píxeles). Zoom con dos botones; clic en la regla salta la escena a ese instante.
- **Modelo**: `moverTramo`, `estirarTramo`, `agregarTramo`, `borrarTramo`, `cambiarGesto`, `moverMarca`, `agregarMarca`, `borrarMarca`, `moverFrase`,
  `estirarFrase`, `agregarFrase`, `borrarFrase`, `cambiarFrase`, `cambiarT`, `cambiarR`, `cambiarNivel`, `ponerActor`, `quitarActor`, `desdeCodigo`,
  `escenaNueva`, `claveLibre`, `crearHistorial`. Todas devuelven `{ def, i, cambio }` sin tocar la escena que reciben. Encaja a 0,05 s,
  un tramo se detiene contra su vecino y contra T, mínimos de 0,1 s (tramo) y 0,5 s (frase). La prueba hace 400 operaciones al azar
  y exige que todo lo que salga cumpla el esquema y las reglas de `reglasEscenas`.
- **Arrastre**: pointer events sobre el contenedor de la línea con `setPointerCapture`. Un arrastre parte siempre de la escena como estaba al
  hacer clic (`base`), así los topes no se acumulan; el historial toma una sola foto por arrastre. El realce de la selección cambia
  clases sin reconstruir el DOM (si no, el doble clic cae sobre un elemento que ya no existe); y como la línea captura el puntero, el
  doble clic busca el elemento con `elementFromPoint`.
- **Filas vacías**: una fila sin tramos queda `[]` y `golpes: []` en una escena `amistad`; si desaparecieran, `fusionar` devolvería lo del
  código. En una escena `guion` la clave de marcas sí se borra.
- **Mouse libre**: el juego captura el mouse al abrir el mundo y al empezar y terminar una escena (`bloquearEscena`, `entrar`). Con eso el
  editor no recibe clics (la prueba de navegador lo mostró: no llegaba ni un pointerdown). Mensaje `escena { accion: 'puntero', v }`
  → `puntero-libre.js` (`requestPointerLock` sin efecto, la pausa no se abre, `.clic-seguir` escondido). La pestaña lo pide al abrirse, al
  quedar listo el juego y antes de cada Reproducir, y lo devuelve al salir. El gizmo usa el mismo módulo; con cuenta, los dos no se pisan.
- **Mensajes**: `escena { accion: 'jugar' | 'pausa' | 'ir' | 'parar' | 'puntero', clave?, persona?, t?, v? }` → `{ tipo: 'ok', escena }`.
  `jugar` usa `jugarGuion` si `clave` es una escena de guion de los datos vivos y, si no, `jugar(persona, clave)`; antes salta la que corra.
  El Estudio manda los `datos` y espera su respuesta antes de jugar. Del juego, sin `id`: `escenaT { clave, persona, t, T, pausada }` cada 100 ms
  mientras corre una escena (`clave` es la que lanzó el editor; si la lanzó otro, el nombre de la animación) y un último con `clave: null`.
- **Gestos**: `import()` de `escenas-skin.js`, `moldes.js` y `reencuentros.js` al abrir la pestaña (41 nombres: `GESTOS`, `GESTOS_AMISTAD` y `MOLDES`).
  Si falla, el editor sigue sin validar nombres. Un bloque con un gesto que no existe sale en rojo y `reglasEscenas` da el error.
  Desde el PR 6a se suman los gestos y las poses fijas de `poses.json` (el editor lo pide con `fetch` al abrir la pestaña).
- **Guardar**: `PUT /api/datos/escenas` con `If-Match`; el botón queda deshabilitado mientras haya errores de reglas. Mover un tramo cambia
  una sola línea de `escenas.json` (la prueba lo comprueba con `formatear`).
- **No hecho** (a propósito): crear escenas `amistad` nuevas (el juego solo conoce las de `ANIMACIONES`); borrar una escena; arrastrar un
  tramo a otra fila; cámara (PR 5c).
- **Medida**: sin `?estudio`, 106 archivos y 2633,5 KB antes y después (nada nuevo se carga con el juego).

## 15. Fase 5 · PR 5c · lo que cambió al construirla (2026-10-11)

- **Archivos**: constantes `PLANOS_*` en `mundo/supervivencia/escena-amistad-datos.js`; `planosDe`, `opcionesCamara` y `JUEGOS_PLANOS` en `mundo/datos/escenas.js`; operaciones de cámara en `estudio/escenas-modelo.mjs`; panel **Cámara** en `index.html`, `escenas.js` y `estudio.css`.
- **Cámara del motor**: `opcionesCamara(camara)` junto con las distancias de la familia. `amistad` y lista propia: `minDist 1.8, evitarDist 2.4, holgura 0.7, sinTerceros`; `grupo`: `1.6, 2.0, 0.5`; `grupo-techo`: `1, 1.2, 0`. Si hay `camara` manda sobre lo que el motor elegía (planos del iglú bajo techo, planos de grupo con `centro`); en una escena con `centro` se conserva `centro` y se quita `sinTerceros`.
- **Panel Cámara** (va en el lateral, como el resto de la pestaña; no es una fila de la línea de tiempo: una lista de campos numéricos no cabe en una pista): estado, tres botones «Usar juego», una tarjeta por plano (nombre, ang, dist, alto, órbita, dolly; Ver, Subir, Bajar, Quitar) y Agregar (tope 8, el del esquema). Los números se recortan a los límites del esquema.
- **Ver**: el editor manda `datos` con una copia de la escena con `camara: { planos: [ese] }` y juega; cuando el juego avisa que terminó (`escenaT` con `clave: null`) manda otra vez los datos reales. Sin mensaje nuevo en el puente.
- **Sin cambios**: `escenas.json`, el esquema (ya traía `camara` y `plano`; solo se actualizó su texto), `camaras.js`.

## 16. Fase 6 · PR 6a · lo que cambió al construirla (2026-10-11)

- **Partición**: la fase entera (evaluador, lectura del juego y editor con sliders, vistas, curvas, osciladores y «medir») era
  demasiado para un PR. 6a deja el juego leyendo `poses.json` y todo lo que no necesita pantalla; 6b es el editor.
- **Archivos**: `mundo/datos/gestos.js` (nuevo, puro); `escenas-skin.js` y `escena-amistad-datos.js` registran `GESTOS` y
  `GESTOS_AMISTAD` (una línea cada uno); `main.js` pide `poses.json` (`cargarDatos('poses').then(aplicarPoses)`);
  `puente-juego.js` y `puente-protocolo.js` (`poses` en `DATOS_VIVOS`); `cli.mjs` (`validar` con `reglasPoses` y los nombres de
  `poses.json` como gestos válidos de las escenas); `estudio/escenas.js` (los mismos nombres en el editor de Escenas);
  `indice.json` (`lee` = `mundo/datos/gestos.js`).
- **Conexión: reemplazo en la tabla, no un paso más en cada motor.** Hay cinco lugares que llaman gestos por nombre
  (`escenas-skin.js`, `escena-amistad.js`, `hablar.js`, `vida-amigos.js` y `molde()` de `moldes.js`). En vez de enseñarle a cada
  uno a mirar primero el JSON, `aplicarPoses` cambia la entrada de `GESTOS` o `GESTOS_AMISTAD` por una función armada con el
  evaluador, con la misma firma (`skin`: `u, t, s, j`; `amistad`: `u, t, info`). Así ningún motor cambió y la prioridad de hoy se
  conserva (`GESTOS_AMISTAD` gana a `GESTOS` en las escenas de amistad; `MOLDES` gana a todo en las de guion).
  - Un nombre que existe en el código se reemplaza en su tabla; uno nuevo va a `GESTOS` (la que miran todos al final).
  - Las **poses fijas** de `poses.json` también entran como gestos quietos (se pueden usar en una pista: `["doblarse", 1, 2]`),
    salvo que un gesto del JSON tenga el mismo nombre.
  - Al aplicar otros datos (en vivo o del disco), todo vuelve primero a su código: lo que sale del JSON recupera su función y
    los nuevos se borran. Sin archivo, roto o con `?sin-datos`: el código, como siempre.
  - Lo que se arma con nombre al cargar `moldes.js` (`fusion('habla', …)`, `espejo`, `con`) guarda la función de ese momento:
    las composiciones siguen en JS (§2) y no cambian con el JSON. `molde('nombre')` sí lo ve (busca al usarse).
- **Sin memoria por cuadro**: el evaluador arma una vez por gesto las listas `[canal, valor]` de cada caso (de pie, sentado,
  jugador, los dos) y escribe en un objeto por caso que se reutiliza (`funcionGesto`). Ninguna closure ni objeto por cuadro.
  El resultado vale hasta la próxima llamada: los motores lo leen enseguida y los combinadores de `moldes.js` copian.
- **Relojes**: `t` y `u` como el esquema; `local` necesita la duración del tramo, que los motores de hoy no pasan: usa
  `info.d` si viene y si no, `t` (`validar` lo avisa). `ciclo` funciona (`t` módulo `ciclo`, también con `t` negativo).
- **`salto`**: se devuelve tal cual. Cada motor decide qué hacer sentado (las funciones de hoy ya lo ponen en 0 donde hace falta).
- **Reglas de `validar`** (`reglasPoses`): claves `k` fuera de orden y `env` al revés son error; `base` junto a `k`, reloj `local`,
  un gesto que tapa `MOLDES`, una pose con nombre de gesto del JSON o del código son aviso.
- **Paridad**: los 11 gestos con la firma del juego, en los 4 casos, 401 instantes: 64 160 comparaciones, diferencia 0. También
  igual a la referencia legible `estudio/evaluar.mjs` (sigue para el CLI `capturar gesto`).
- **Pruebas**: `mundo/tests/estudio-poses.mjs` (paridad, referencia, memoria, variantes, relojes, ciclo, interpolaciones, formas,
  reemplazo y vuelta al código, poses como gestos, un gesto roto, reglas, puente y CLI) y `estudio-poses-navegador.mjs`
  (Playwright: el juego pidió `poses.json` una vez, `GESTOS.doblarse` existe, el editor de Escenas acepta las poses, `punos` en
  pausa en el golpe: el brazo de Andy está en -0,980 con el archivo, en -2,500 al mandar `puno` editado por el puente y
  vuelve a -0,981; un gesto nuevo
  escrito en disco llega por `/api/eventos`). `estudio.mjs` y `estudio-textos.mjs` usan ahora `tienda` como archivo «no vivo».
- **Medida** (sin `?estudio`, headless con swiftshader, 960×540, 12 s, base `origin/main` contra la rama, dos corridas iguales):
  al abrir `supervivencia.html` 114 archivos y 2665,9 KB contra 116 y 2681,2 KB: `gestos.js` (10 KB) y `poses.json` (4,6 KB),
  pedidos en paralelo sin esperar a nadie. El cuadro no cambia: un gesto del JSON cuesta lo mismo que la función que reemplaza.
- **No hecho** (a propósito): mensaje `pose { clave, canales }` (es del editor: 6b); extender el esquema para `baile`, `cabecea`,
  `hachazo` y `sorpresa` (forma `pulso`, condición de sentado en un oscilador); pasar la duración del tramo a los motores
  (`local`). No se tocaron `camaras.js`, `mano.js`, `skin.js` ni `coop.js`.

### PR 6b · editor de poses (para el próximo chat)

- **Pestaña Poses** en `/estudio/` (comparte el iframe de Juego, como Posiciones y Escenas): lista de poses y gestos de
  `poses.json` más los de `GESTOS` / `GESTOS_AMISTAD` que no están («en código», como Escenas: editar uno lo copia al JSON solo
  si cabe en el esquema; los que no caben —composiciones, condiciones— se muestran sin editar).
- **Sliders por canal** con los rangos de `rig.md` (los 14 canales del esquema; desde N2, 28: suman codos, rodillas, pecho, apertura de piernas, giro del brazo y muñeca del arma, con su límite duro de `limites.js` como rango; casilla de suelo automático y medida de pie en la vista), **curva por canal** con claves que se arrastran
  (reloj, `interp`) y **osciladores** (forma, amplitud, frecuencia, fase, `env`); variantes `sentado` y `jugador` en pestañas.
- **Vista**: frente, 3/4 y lado con una persona de cajas en un canvas propio (como `posar.html`), sin esperar al juego; y en el
  juego, el mensaje nuevo `pose { clave, canales }` (pone esos canales en una persona, quieta) y `datos` → `poses` + `escena`
  para ver el gesto en una escena.
- **Medir**: la punta de la mano (como `capturar.mjs --medir`), en el canvas propio.
- **Guardar** con `PUT /api/datos/poses` e `If-Match`; deshabilitado con errores de `reglasPoses`. Mover una clave cambia una línea.
- **Pruebas**: modelo puro en Node (como `escenas-modelo.mjs`) y una de navegador (slider → el juego, guardar, restaurar).
- **Modelo**: Opus para el diseño de la pestaña y el modelo; Sonnet para la parte grande de UI una vez definida.

## 17. Fase 6 · PR 6b · el editor de poses (2026-10-11)

- **Archivos**: `estudio/poses.js` (pestaña), `estudio/poses-modelo.mjs` (puro), `index.html` / `estudio.css` / `estudio.js`
  (pestaña con `data-seccion="juego"`, `#panel-poses` y `#po-zona`), `puente-protocolo.js` (`pose`, `CANALES_POSE`) y
  `puente-juego.js` (`pose`). Una sola PR: el modelo y el panel numérico salieron chicos, así que no se dividió en 6b-1 y 6b-2.
- **Modelo** (`poses-modelo.mjs`): toda operación devuelve `{ datos, i, cambio }` con una copia nueva, como `escenas-modelo.mjs`.
  Una ruta `{ tipo: 'pose' | 'gesto', clave, variante? }` dice qué se edita; la variante escribe en `variantes.sentado|jugador`
  y se borra si queda vacía. Valores a 0,001; tiempos encajan a 0,05 s (0,01 con reloj `u`); una clave se detiene a un paso
  de su vecina (el orden de `k` no se rompe y `reglasPoses` no puede quejarse); un canal sin `k` ni `osc` vuelve a número;
  `suave`, `fase: 0` y `env` vacío no se escriben. Pasar un número o una base a claves deja `[0, previo]` y la clave nueva
  (lo de antes no cambia). Mover una clave cambia una línea del JSON (probado con `formatear`).
- **Slider**: en un fijo o una base cambia el valor; en un canal con claves pone (o cambia) la clave en el instante t: el
  flujo de cualquier programa de animación. Rangos de `rig.md` (`cy`, `salto` y `pz` no están en su tabla: rango propio) y
  se ensanchan si el archivo trae un valor fuera.
- **«En código»**: los gestos de `GESTOS`/`GESTOS_AMISTAD` que el JSON no reemplaza se llaman con su firma para la vista y no se
  editan (no hay forma segura de saber si una función cabe en el esquema). «Pose nueva» y «Gesto nuevo» copian el instante
  al JSON. `MOLDES` no se lista (son composiciones; siguen en Escenas) pero sus nombres cuentan para `reglasPoses`.
- **Vista**: un `WebGLRenderer` con tres escenas (frente, 3/4, lado) y `crearModelo` de `skin.js` (solo se importa). La punta
  de cada mano es una cajita colgada del brazo en (0, −0,75, 0). `puntaMano` del modelo hace la misma cuenta a mano (Euler
  XYZ): la prueba de Node la compara con la tabla de `rig.md` y la de navegador con Three.js y con la mano del juego.
- **`pose { clave, canales }`**: el juego usa el gancho `n.escena` de `criaturas/amigos.js` (el que ya reemplaza la animación
  en las escenas) con una función propia que escribe los canales; si la persona está en otra escena, error. `canales: null`
  la suelta y la deja neutral (su animación sigue el próximo cuadro). La respuesta trae `manoD` y `manoI` medidas en el juego.
  El editor manda el instante a ~15 por segundo mientras se reproduce o se arrastra. Al salir de la pestaña, se suelta.
- **Puntero**: como Escenas, la pestaña pide `escena { accion: 'puntero' }` para que el juego no se quede con el mouse.
- **Agarrar y grabar** (pedido del dueño tras probarla: lo directo antes que los números): en los muñecos se agarra cabeza,
  brazo, pierna o tronco (raycast; `CANAL_HUESO` dice qué canal mueve cada hueso por eje) y gira en su articulación siguiendo
  el ángulo del mouse alrededor del pivote, sobre el eje del hueso que más apunta a esa cámara (de frente, `z`; de lado y
  3/4, `x`; Mayús + cabeza, `cy` arrastrando a los lados). **Grabar**: con el botón activo, agarrar hace correr el tiempo
  desde t y `grabarClaves` reemplaza las claves de ese canal en el tramo grabado (una cada 0,1 s; 0,03 con reloj `u`; lo de
  antes y después queda). Se graba una extremidad por pasada y se vuelve a `t = 0` para la siguiente. Grabar sobre una pose o
  un gesto del código crea primero un gesto nuevo con el instante.
- **Sentado**: la vista y `instante` ponen `SENTADO` (piernas −1,5, las de `sentadoSilla`) bajo el gesto y una silla; antes se
  veía igual que de pie si el gesto no tenía variante. Las poses no tienen casos (botones deshabilitados).
- **Otras escenas** (momentos, bienvenidas, reencuentros, grupos): no se listan en Escenas. Son JS con lógica y no se pueden
  editar en la línea de tiempo; verlas sin poder editarlas no sirve. Para editarlas habría que pasarlas a JSON (fase aparte).
- **No hecho**: ver un gesto dentro de una escena desde esta pestaña (hoy: en vivo, o posando el instante); lo de 6a que
  sigue pendiente (reloj `local`, extender el esquema).

## 18. Mesa del Duelo de Cartas: lista para el Estudio (7h-2b, PR 4a, 2026-10-11)

La mesa 3D (`mundo/supervivencia/cartas-mesa.js`) toma todas sus medidas de `MESA` en `cartas-mesa-modelo.js`: dónde queda respecto de Lucho (`mesa.giro`, `dist`, `lado`), su tamaño, las zonas, los mazos, la mano de Lucho, los dos encuadres (`camara1`, `camara3`), la vista de arriba (`mini`) y tu mano en pantalla (`mano`). Son datos planos y la mesa los mezcla con `fusionar(MESA, datos)`; `mesa.aplicarDatos(datos)` los cambia sin recargar (rearma la mesa y te vuelve a sentar). Para editarla desde el Estudio falta solo: un `mundo/datos/cartas-mesa.json` (con su esquema y su entrada en `indice.json`), sumarlo a `DATOS_VIVOS` y que `aplicarDatos` del juego lo pase a `__venjy.mesaCartas`. Con `supervivencia.html?estudio` la mesa ya funciona igual (se abre con `/cartas` o `__venjy.abrirMesa('facil')`; con `?estudio=tactil` está sin probar).

**Sonido (2026-10-13, pulido PR 2):** grupo `sonido` de `cartas-mesa.json` (`activo`, `volumen`, un volumen por sonido: roba, juega, ataque, golpe, destruye, hechizo, efecto, cura, turno, gana, pierde, empate). Va en la pestaña Mesa → «Sonido del duelo»; sale de los mismos eventos que las animaciones (`sonidoDe` en `cartas-anim-modelo.js`), así que «Repetir la última jugada» también lo prueba.

**Hecho (2026-10-11):** pestaña **Mesa** (`estudio/mesa.js`): edita `cartas-mesa.json` en vivo y lo guarda; mensaje `mesa { accion: 'abrir' | 'cerrar' | 'vista' }` en el puente.

**Tutorial y turno de Lucho (pulido, PR 3, 2026-10-13):** grupos `turnoLucho` (`enPartida` 1 = la cámara mira a Lucho en su turno también fuera del tutorial; `pausa` = segundos mirándolo antes de su primera jugada; `mesa` = segundos en la mesa tras su jugada), `planoLucho` y `planoMesa` (cámaras de ese turno: `lado`, `alto` sobre la mesa, `z` hacia ti y `mira`) y `tutorial` (`color` del marco y del botón que brilla, `opacidad`, `pulso` por segundo, `borde` × la carta, `leer` = segundos que Lucho habla antes de jugar). En la pestaña Mesa van como cuatro grupos más; el botón **Abrir el tutorial** (`mesa { accion: 'tutorial' }`) lo juega desde el principio para ajustar encuadres y tiempos. No editable aún: los textos del tutorial (`TUTORIAL` en `cartas-datos.js`).

**Colección y mazo (etapa A punto 3, PR 1, 2026-10-13):** grupos `coleccion` (`largo` del mazo 10-40, `copias` 1-4, `azarExtra` = cartas de más en la mano con el mazo al azar, `azarTodas` 1 = al azar de todas las cartas / 0 = de tu colección, `hechizosMin`/`hechizosMax`) y `coleccionInicial` (copias de cada carta con que parte quien nunca tocó su colección; trae todas las cartas jugables, 0 = no la tiene). En la pestaña Mesa van como dos grupos más, con enteros (`ENTEROS` en `estudio/mesa.js`). El juego los lee en `cartas-coleccion.js` (`reglasDe`, `coleccionInicial`); el puente ahora deja siempre `__venjy.datosMesa`, así el panel de armar mazo también los ve en vivo. No editable aún: los textos del panel (`TXT_ARMAR` en `cartas-armar.js`).

**Tienda de cartas (etapa A punto 3, PR 2, 2026-10-13):** grupos `tiendaCartas` (`activa` 0/1, `sobrePrecio` 1-64 esmeraldas, `sobreCartas` 1-10, `sobreNuevas` = cuántas salen de las que no tienes, `sobreHechizos` = mínimo por sobre, `sueltaTope` 1 = no vende una suelta si ya tienes las copias que caben), `preciosCartas` (esmeraldas por carta suelta, 0 = no se vende; sin clave, `precioBase`) y `pesosSobre` (qué tan seguido sale cada carta en un sobre, 0 = nunca; sin clave, 1). Enteros con slider de 0-10 y 0-5; el número acepta más. Se ven al abrir la tienda de Lucho (el juego lee lo último que mandó el Estudio). Grupo `sobreAnim` (abrir el sobre: `activa`, `rasgar`, `toques`, `salir` / `voltear` / `entre` / `tapa` en segundos, `ancho`, `sacudir`, `sonido`, colores `color` / `franja` / `letra`); botón «Probar el sobre» (mensaje `mesa { accion: 'sobre' }`) la muestra con los valores en vivo, sin cobrar ni sumar cartas.

**Duelo entre jugadores (duelo 2J, PR 1, 2026-10-13):** grupo `duelo` (`vida` 500-20000 de cada uno, `mano` 1-7 cartas al empezar (el mazo al azar suma `coleccion.azarExtra`), `espera` 0-120 segundos para aceptar el reto, 0 = sin límite). Lo lee `reglasDuelo` de `cartas-duelo.js` al armar la partida (lo último que mandó el Estudio). No editable aún: los textos del reto y de la mesa contra un jugador (`TXT_RETO`, `TXT_MESA`, como el resto de los textos del Duelo).

**Duelo donde están (duelo 2J, PR 2, 2026-10-13):** grupos `lugar` (`dist` metros máximos hasta el jugador al que apuntas con el MAZO, `desnivel` diferencia de altura máxima), `tronco` (`alto` de la cara de arriba, `ojos` = cámara sentado en el suelo, `asiento` = distancia del borde a cada jugador, `mano` = altura de las cartas del rival, colores `corteza` y `madera`), `piso` (lo mismo, sin colores) y `planoRival` (cámara del turno del otro jugador: `lado`, `alto` y `mira[1]` desde tus ojos, `z`). Pestaña Mesa → «Duelo entre jugadores: retar», «Duelo sobre un tronco», «Duelo en el piso» y «Cámara que mira al otro jugador». `conSuperficie` (cartas-mesa-modelo.js) los aplica encima de las medidas de la mesa; el ancho, el fondo, las zonas y las cartas son los de la mesa de Lucho. Se ven en vivo con un duelo abierto (aplicarDatos rearma el lugar). No editable aún: qué objetos cuentan como tronco (`TRONCOS` en main.js: roble, abedul y pino) y la pose sentada (`POSES.sentado` de pose-jugador.js, la misma de 7g).

**Celular horizontal y turno del rival (2026-10-14):** grupos `hudHorizontal` (`altoMax` = alto de pantalla hasta el que vale; `arriba`, `ancho`, `boton` de la columna de botones; `lectorAncho`, `lectorDerecha` de la carta grande a la derecha, en px; los lee `medidasHud` de cartas-mesa.js como variables CSS) y `turnoRival` (`mirar` 0/1: en el turno del otro jugador, tu vista del tablero o la cámara que lo mira, `planoRival`).

**Esperar rival en una mesa colocada (duelo 2J, PR 5, 2026-10-14):** `duelo.esperaMesa` (0-600 s esperando rival sentado a una mesa colocada; 0 = sin límite). El `asiento` de los grupos `tronco` y `piso` aparece como «separación: cada jugador hasta el borde».

**Mirar un duelo (duelo 2J, PR 4, 2026-10-14):** `lugar.mirar` (metros hasta un duelo ajeno para verlo en vivo desde afuera; 0 = no se mira), en «Duelo entre jugadores: retar». La mesa de quien mira usa las mismas medidas, superficies, colores y tiempos de animación que la de los que juegan. No editable aún: los textos de la revancha y de la lista Tab, y el margen (25 %) para dejar de mirar.

**Mesa de duelo como objeto (duelo 2J, PR 3, 2026-10-13):** `tiendaCartas.mesaPrecio` (0-64 esmeraldas; 0 = Lucho no la vende), `lugar.mesaCerca` (metros máximos hasta una mesa colocada para jugar en ella) y el grupo nuevo `mueble` (colores `madera`, `oscura` y `pano` de la mesa: la de Lucho, la que se lleva y la colocada; antes estaban fijos en `construirMesa`). Las medidas de la mesa colocada son las del grupo `mesa` (ancho, fondo, alto) y se rehacen en vivo al cambiarlas. No editable aún: la dureza de la mesa colocada y su orientación (largo en X o en Z, según hacia dónde mira quien la pone).

**Animaciones (pulido, PR 1, 2026-10-13):** el mismo JSON trae `desc` (dónde va el descarte), `anim` (activas, velocidad, arco, embestida, sacudida, números, brillo, tocar para saltar), `duraciones` y `sigue` (segundos de cada evento y cuándo empieza el siguiente) y `colores` (hechizos por efecto, daño, cura, muerte). La pestaña Mesa los muestra como grupos más (los colores con selector) y el botón **Repetir la última jugada** (`mesa { accion: 'animar' }`) vuelve a animarla con los valores nuevos. Los valores base viven en `ANIM` (`mundo/supervivencia/cartas-anim-modelo.js`).

## 19. Objetos en la mano editables (Hito 1, punto 13, 2026-10-13)

`mundo/datos/objetos-mano.json` guarda cómo se agarra lo que llevas: `tipos` (`objeto`, `herramienta`, `bloque`) y `objetos` (clave de `OBJETOS` en minúscula: `cana`, `pico_madera`), cada uno con `mano1` (la mano en primera persona, `mano.js`) y `mano3` (el cuerpo en tercera y el de los demás jugadores, `pose-jugador.js`): `pos` en bloques, `rot` en **grados**, `escala`. Esquema: `estudio/esquemas/objetos-mano.schema.json`.

- **Quién lo lee**: `mundo/supervivencia/objetos-mano-datos.js` (puro, sin DOM): trae los valores del código (`AGARRE`, `AGARRE_1P_MALLA`, el ajuste de la caña) y `agarre(vista, clave, tipo)` los une así: tipo en el código → `tipos[tipo]` → ajuste del objeto en el código → `objetos[clave]`. Sin archivo o sin claves, todo queda como estaba.
- **En vivo**: `aplicarDatosVivos` sube una versión; `mano.js` recoloca sus mallas y `pose-jugador.js` vuelve a armar el objeto cuando nota la versión nueva.
- **Estudio**: pestaña **Objetos** (`estudio/objetos.js`): lista por tipo o por objeto, sliders de posición, rotación y escala por vista, «Volver al valor del código» (borra esa vista del JSON), «Ponerlo en mi mano» (mensaje `objeto { clave }` del puente: lo da si no lo tienes y lo elige en la barra rápida). Cada cambio guarda el agarre completo de esa vista.
- **No hecho**: el `mango` del cuerpo (cuál píxel del dibujo queda en la mano) sigue en el código; los bloques sueltos no se editan por separado (solo por tipo `bloque`); no hay vista previa dentro del propio Estudio, solo en el juego.

## 20. Pestaña Píxeles: íconos, arte de cartas y borradores (punto 3b, 2026-10-13)

Editor de píxeles en `estudio/pixeles.js` (sección propia, no comparte pantalla con el juego: lo que va al juego viaja en vivo por el puente igual).

- **Formato** (`mundo/datos/pixeles.js`, puro): `{ paleta: ["#rrggbb", …], filas: ["..01..", …] }`; cada carácter es el índice del color en `0-9a-zA-Z` y `.` es vacío. Con más de 62 colores (retratos con tramado) cada píxel usa dos caracteres; el ancho de la fila dice cuál. `codificar`, `decodificar`, `revisarDibujo` (medidas e índices) y `listoParaJuego` (sin `"estado": "borrador"` y bien formado). En los esquemas: `comun.schema.json#/$defs/dibujo`. El formateador deja cada arreglo de filas en una sola línea (regla común de `formato.mjs`): diffs anchos, pero `resumen … --dibujo` los muestra por fila.
- **`iconos.json`** (`iconos.js`): `iconos[clave en minúscula]` = dibujo de 16×16. `pintarObjeto` lo usa antes que `PINTORES`; `aplicarIconos` repinta en su lugar los lienzos de 32×32 ya entregados (la interfaz cambia sola) y el atlas de objetos tirados, y avisa a `alCambiarIconos` (la textura de `entidades.js`); `mano.js` rehace la malla extruida al ver `versionDeIconos()` nueva. `pixelesDeCodigo(id)` = el del código, para «Partir del dibujo actual».
- **`cartas-arte.json`** (`cartas-arte.js`): `retratos[clave de carta]` (40×26, sobre el fondo de la familia: lo vacío deja verlo; la viñeta de las esquinas se pone siempre encima), `reverso` (50×76, la carta entera) y `marcos[familia]` (`claro`, `base`, `oscuro`, `sombra`, `cinta`; la base genera sola sus motas). `dibujarCarta` se partió en `retratoCodigo` + `componer`; `retratoDeCodigo` y `reversoDeCodigo` sirven al Estudio; `dibujarPlantilla(familia, boceto)` dibuja una carta nueva con su marco. `aplicarArte` vacía el caché de dataURL y sube `versionDeArte()`: la mesa 3D rehace texturas (`refrescarArte` desde el puente) y el panel 2D las toma al repintarse.
- **`borradores.json`** (el juego no lo lee, `lee: null`): `objetos[clave]` = `{ estado, nombre {es, en?}, que, receta, notas, fecha, dibujo }` y `cartas[clave]` = `{ estado, plantilla, nombre, atk, def, efecto {es, en?}, notas, fecha, boceto? }`. El dueño escribe en español; el inglés lo completa el agente. Flujo del agente: skill `datos-json`, sección «Borradores».
- **Editor**: modos ícono, retrato, reverso, objeto nuevo, carta nueva. Herramientas lápiz, borrador, cuentagotas, relleno (4 vecinos), espejo (pinta también el reflejo), voltear, deshacer/rehacer (200 pasos), cuadrícula con línea central; vista a tamaño real, «en el juego» (×2, ×3 el reverso) y la carta completa con textos en PixelCraft (×4). Paleta = colores del dibujo + los del dibujo del código + selector. Abrir algo sin dibujo propio muestra el del código; el primer trazo lo vuelve propio. Guardar escribe cada archivo sucio con If-Match.
- **CLI**: `resumen iconos|cartas-arte|borradores [filtro] [--dibujo] [--completo]`; `validar` revisa medidas e índices, y avisa si una clave no existe en `OBJETOS`/`CARTAS` o si un borrador ya tiene su clave en el juego.
- **No hecho**: los íconos de `script.js` (la página principal); el marco no se pinta píxel a píxel (solo colores); el panel 2D del Duelo no se repinta solo al llegar un cambio en vivo.

## 21. Pestaña Inicio: el menú de inicio de la supervivencia (etapa A punto 3, 2026-10-14)

- **Juego**: `supervivencia.html` abre en una pantalla de título (`#menu-titulo`): logo, subtítulo, pie y una frase amarilla al azar que late junto al logo; botones Un jugador (`#menu-mundos`: tus mundos), Con amigos (`#menu-amigos`: nombre, código, QR y la lista para hospedar), Mi skin, Modo creativo y Volver. Con `?estudio` se salta el título (el puente busca `#lista-mundos` visible).
- **Datos**: `mundo/datos/inicio.json` (esquema `inicio`): `titulo.logo|sub|pie` (texto ES/EN), `titulo.frases` (lista; reemplaza a la del código) y `titulo.frase` (`color`, `giro` en grados, `pulso` 0-1, `ritmo` latidos/s, `x`/`y` en % respecto al logo). Valores base en `INICIO` de `mundo/supervivencia/inicio-datos.js`.
- **Editor** (`estudio/inicio.js`): vista previa con las mismas reglas de CSS, campos ES/EN, frases (agregar, quitar, enfocar una la muestra), aspecto de la frase y «Abrir el menú real». Guarda con If-Match. No va en vivo al juego: el menú se ve al abrir `supervivencia.html` sin `?estudio`.
- **Pantalla de carga** (PR 2, 2026-10-14): al entrar a un mundo, `#pantalla-carga` cubre todo con fondo de tierra a cuadros, título, barra, nombre de la etapa y un consejo al azar. La barra avanza con las etapas reales de `arrancar` en `main.js` (`await etapaCarga('<clave>')` al empezar cada una; ceden un cuadro para pintar): `terreno` (hasta cargar los chunks cercanos), `sistemas`, `amigos` (criaturas y personas), `mundo` (mundo vivo y mano), `escenas` (cámaras, gatas, minijuegos), `datos` (consola, comandos y el resto). Al terminar se espera el tiempo mínimo y se desvanece.
- **Datos** (`carga` en `inicio.json`): `titulo`, `rotuloConsejo`, `etapas.<clave>` (`nombre` ES/EN y `peso`: lo que ocupa en la barra), `consejos` (lista; reemplaza a la del código), `aspecto` (`fondo`, `fondo2`, `barra`, `barraFondo`, `texto`, `cuadro` px) y `tiempos` (`minimo` y `salida`, segundos). Las claves de etapas las fija el código (`ORDEN_CARGA`); sumar una etapa nueva = una línea `await etapaCarga('x')` y su clave en `ORDEN_CARGA`, el esquema e `INICIO`. Helpers puros: `consejoAlAzar`, `avanceCarga`.
- **Editor**: la misma pestaña Inicio trae vista previa de la carga (etapa y consejo a elección), lista de consejos, textos y pesos por etapa, colores y tiempos.
- **Presentación y fondo de cine** (PR 3, 2026-10-14):
  - **Presentación «Venjy presenta»** (`presentacion.js`, pedido del dueño: que se vea quién hace el juego): al abrir `supervivencia.html` cubre la pantalla con un logo de píxeles (bloque de pasto isométrico con una V), el nombre y un lema. Es un módulo propio cargado antes que `main.js`, así se ve mientras bajan los ~90 archivos del juego. Se cierra al pasar `tiempos.minimo` (contado desde que se abre la página) y cuando `main.js` avisa que el fondo tiene su primer plano; `tiempos.maximo` la cierra igual. Clic o tecla la saltan. No sale con `?estudio`, `?plano` ni al volver de «seguir jugando» (marca `data-sin-presentacion` en el `<head>`).
  - **Fondo** (`fondo-menu.js`): escena, cielo y `MundoVoxel` propios (el mapa sin ediciones, con sus workers) detrás de `#inicio`; planos de dolly con fundido a negro (`#fondo-velo`). Mientras corre un plano se cargan los chunks del que sigue (lista propia de chunks con dos centros), así el corte no espera. Al entrar a un mundo, `cerrarFondo()` (con la carga ya tapando) libera chunks, workers y cielo, y `arrancar` crea los suyos. Con `?plano=N` repite solo ese plano y `#fondo=<json>` trae lo que aún no se guarda (botón «Ver» del Estudio).
  - **Datos** (`inicio.json`, claves nuevas): `presentacion` (`activa`, `nombre`, `lema`, `logo` = dibujo `{ paleta, filas }` de `comun.schema.json`, `aspecto` con colores y `pixel`, `tiempos` `minimo`/`maximo`/`entrada`/`salida`) y `fondo` (`activo`, `enCelular`, `distancia`, `distanciaCelular`, `fps`, `hora`, `fov`, `oscurecer`, `fundido`, `esperaMax`, `orden` y `planos`: `nombre`, `desde`, `hasta`, `mira`, `miraHasta`, `duracion`). Helpers puros: `planosValidos`, `fondoActivo`, `planoEn`, `siguientePlano`, `veloEn`.
  - **Editor** (pestaña Inicio): vista previa de la presentación con el logo pintable (paleta, color elegido, agregar color, borrador, «Logo del código», «Repetir animación»), campos de textos, colores y tiempos; ajustes del fondo y lista de planos (nombre, duración, cuatro vectores x/y/z, «Ver», «Subir», «Quitar», «Agregar plano»). No hay aún un gizmo para poner la cámara mirando el mundo: las posiciones se escriben a mano (anotado en PENDIENTES).

## 22. Pestaña Formas: bloques con forma (7f-2, 2026-10-14)

- **Qué edita**: `mundo/datos/formas.json` (esquema `formas.schema.json`). `formas.<nombre>.cajas` = lista de cajas `{ a, b }` en 1/16 de bloque (reemplaza todas las del código); `altoChoque` en las vallas; `paso` (cuánto sube solo el jugador), `contorno` (`color`, `opacidad`) y `grietas` (`opacidad`). Nombres: `losa`, `losa_arriba`, `escalones`, `trampilla`, `trampilla_arriba`, `trampilla_abierta`, `valla_poste`, `valla_brazo`, `farol`, `cartel` (malla y choque) y `cama`, `antorcha`, `flor`, `planta`, `cultivo` (solo contorno, grietas y rayo). Escalones, trampilla abierta y brazo de la valla se dibujan hacia el norte: el juego los gira.
- **Código**: `mundo/formas.js` (puro) tiene los valores base (`FORMAS_BASE`, `AJUSTES_BASE`) y `fijarFormas(json)`. `main.js` pide el JSON antes de crear el mundo (`mundo.aplicarFormas`); los workers lo reciben en `init` y en el mensaje `formas`.
- **Editor**: lista de formas (y «General»), seis números por caja (desde/hasta x, y, z), agregar y quitar cajas, alto de choque, «Volver al valor del código», «Darme el bloque» (mensaje `objeto` con el id). Cada cambio va en vivo (`datos` → `puente-juego.js` → `mundo.aplicarFormas`, que vuelve a mallar los chunks cargados); Guardar escribe con If-Match.
- **No editable aún**: qué bloques usan cada forma, la conexión de la valla y las texturas (tiles) de las cajas del farol y el cartel (están en el esquema, sin control en la pestaña).

## 23. Pestaña Carrera: Gran Premio del Living (7h-1, 2026-10-14)

- **Qué edita**: `mundo/datos/carrera.json` (esquema `carrera.schema.json`): carrera (`vueltas`, `cuenta`, `intro`, `tope`, `dificultad`), `pista` (`puntos` [x, y, z, ancho?] en bloques sobre el piso del living, `huecos` / `turbos` / `tuneles` referidos a un punto, `ancho`, `paso`, `salida`), `sala`, `muebles` (tipo, x, z, a, f, h, g, color; el podio es uno más), `gata` (física, `niveles` y `turbos` del derrape), `gatas` (se funden por clave: nombre, carácter, pañuelo, pelaje, patrón, tamaño), `ia` (con `niveles` por dificultad), `camara`, `tactil`, `premio` (`puestos` y `resto`).
- **Editor de pista** (`carrera-pista.js`, debajo del juego; lo puro en `pista-modelo.mjs`): plano desde arriba con la carretera tal como la arma el juego (`armarPista`), muebles y avisos; perfil de alturas; inspector del punto o del mueble; barra con Deshacer, Encuadrar, Agregar mueble, Probar con la IA y Volver a la pista del código. Insertar o quitar un punto corrige los índices de huecos, turbos y túneles. Al primer cambio copia la pista y los muebles completos al JSON (así no dependen del código). Los cambios van al juego al soltar.
- **Panel**: grupos de números (carrera, pista, física, IA, cámara, celular, sala), los 3 niveles del derrape, las 6 gatas y el premio por puesto. «Ver la pista» (mensaje `carrera` con `ver`), «Correr con Mila/Gala», «Terminar».
- **Objetos (2026-10-14)**: `pista.cajas` (punto, avance, cuántas) se agregan desde el inspector del punto («Cajas de objetos aquí») y se dibujan en el plano; insertar o quitar puntos también corre sus índices; aviso si una fila cae sobre un hueco. Sección «Objetos» del panel: `objetos.activos`, `cuantas`, `ruleta`, `reaparece`, `radioCaja`, `gracia`, `inmune` y, por objeto (`pluma`, `ovillo`, `caja`, `pescado`, `hierba`, `aspiradora`), los pesos `primera` / `ultima`, sus valores, el nombre ES/EN y el color. En «Cómo corre una gata», también `roza`, `rozaRoce` (deslizarse por el borde) y `vuelve`.
- **Varios jugadores (2026-10-14)**: grupo «Varios jugadores (red)» del panel: `red.envios` (veces por segundo que cada corredor manda su gata), `red.paquetes` (el líder: IA y objetos) y `red.hurra` (segundos entre dos hurras del público).
- **Piezas y rampa sola (2026-10-14)**: barra «Poner pieza» con `PIEZAS` (pista-modelo.mjs: cada plantilla = forma `gen` + medidas por defecto; `MEDIDAS` da los campos del inspector). Una pieza son los puntos [desde..hasta] de `pista.piezas` (con `tipo`, `giro` y sus medidas); arrastrar uno de sus puntos la mueve entera, el perfil la sube entera y cambiar una medida la rehace desde su entrada (`rehacerPieza`: quita y vuelve a poner sus huecos y turbos; los que agregó el dueño se quedan). Insertar o quitar un punto dentro de la pieza la suelta. En el inspector del mueble, «La pista sube encima (rampa sola)» (`sube`); en el grupo Pista, `apoyar` y `rampa`; el perfil pinta en café el alto de los muebles bajo la pista.
- **Más pistas (2026-10-14)**: selector «Pista» al comienzo de la barra del plano (living, cocina, patio, techo y cualquier `pistas.<clave>` nueva del JSON). `api.datos()` del editor devuelve la raíz (living) o `datos.pistas[clave]` (se crea al primer cambio) y `api.real()` = `reglasCarrera(datos, clave)`: el plano, el perfil, el inspector, «Volver a la pista del código» y los grupos «Pista (la elegida)» y «La sala» trabajan sobre esa pista sin saber de pistas. Grupo nuevo **«Escenario»**: nombre ES/EN, nombre corto (botón del menú), tipo (living, cocina, patio, techo; cambiarlo deja solo `{ tipo }` y vuelve a sus colores), 8 colores (piso y su 2.º color, paredes y su detalle, techo/casa, cielo, fondo, niebla), 5 colores de los pilares y, en el techo, el callejón (centro x y ancho). El plano pinta el piso con el color del escenario y el callejón en negro; «Agregar mueble» ofrece primero los del escenario (`MUEBLES_DE`). Cambiar de pista manda `carrera { accion: 'ver', pista }` y el juego muestra esa sala (`usarPista` en carrera.js); el protocolo valida `pista` (`^[a-z0-9_]{1,24}$`). Avisos: las patas y el «muy alta debajo» valen para mesa, silla, banca y estanque (con su giro); la encimera, como el sofá, lleva la pista encima a mano.
- **Cámara de cine y Lona (2026-10-14)**: grupos «Cámara de cine en la llegada» (`camara.alPodio`, `lenta`/`lentaSeg`, `meta*` = rodear a tu gata, `lona*` = corte a Lona, `podio*` = el podio) y «Lona en su caja (gestos)» (`lona.largada`, `aspiradora`, `salto`, `ritmo`, `rapidez`). Usan los mismos campos numéricos de `GRUPOS`; el grupo `camara` aparece dos veces (seguir y cine) y escribe en el mismo objeto.
- **Música (2026-10-14)**: grupo «Música» (`musica.vol`, `menu`, `meta`, `podio`, `tempo`, `ultima`) y un selector por pista con el tema (`musica.temas.<pista>`: living, cocina, patio, techo o podio; lista en `TEMAS_MUSICA` de carrera-modelo.js). Las notas de cada tema se editan en la pestaña Música (§24: un tema de `musica.json` con la misma clave reemplaza al de `carrera-musica-datos.js`).
- **No editable aún**: los textos (`TXT_CARRERA`, incluidos los avisos de los objetos y los de la sala de espera), la música, los colores del HUD y los íconos pixelados de los objetos (`ICONO_OBJ` en `carrera.js`; toman el color del JSON).

## 24. Música como datos y pestaña Música (2026-10-14)

Pedido del dueño: hacer él mismo la música del juego con sintetizadores y patrones, y después decir «aplica la música que creé». En dos PR: **24a** formato, motor y lectura en el juego; **24b** la pestaña.

- **Archivo**: `mundo/datos/musica.json` (esquema `musica.schema.json`, fase 13 en `indice.json`). `instrumentos.<clave>` = sintetizador propio (`onda` sine/square/sawtooth/triangle/ruido, `ataque`, `caida`, `largo` × duración, `curva` exp/lineal, `vol`, `transponer`, `voces` + `desafino`, `filtro` { tipo, frec, hasta (barrido), q }, `tono` { desde, tiempo } (barrido de tono), `vibrato`, `armonicos` [{ onda, ratio, vol }], `golpe` = nota en un patrón de ritmo). `temas.<clave>` = { nombre ES/EN, `borrador`, `uso` (carrera/mundo/libre), `bpm`, `pasos` (16 = 4/4, 12 = 3/4), `vol`, `swing`, `prog` (+ `progs` por nivel, `acordePor`, `acordes` propios), `capas` }. Una capa es de un tipo: `ritmo` (x/o/.), `rel` (sobre la raíz), `acorde` (+ `pasos`, `intervalos`), `notas` (MIDI), `arpegio`; con `inst`, `vol`, `dur`, `octava` (semitonos), `niveles`, `segunda`, `prob`, `mudo`. Es el mismo formato que `TEMAS_CARRERA` (la prueba revisa que los 5 temas de la carrera quepan en el esquema y suenen igual como JSON).
- **Motor** (`mundo/supervivencia/musica-motor.js`, puro): `tocarPaso` (el de la carrera, generalizado: pasos por compás, progresión por nivel, swing, probabilidad, mudo, instrumentos propios), `tocarSinte`, `acordeDe` (AC de siempre + armado por nombre: raíz con #/b y calidad de `CALIDADES`), `crearSecuenciador` (programa adelantado y `pasoEn(t)` para la línea que avanza), `revisarTema` (lo que el esquema no ve: instrumento o acorde desconocido, largo de los patrones), `USOS` (temas del código y sus niveles: carrera menu/cuenta/corre/ultima; mundo dia/noche/cueva). Los instrumentos pasaron de `musica.js` a `musica-instrumentos.js` (puro, sin Three) para que el Estudio suene igual que el juego.
- **El juego** (`musica-datos.js`): `cargarMusica()` lo piden `musica.js` y `carrera-musica.js` al crearse; `temaMusica(clave)` = el tema del JSON si no es borrador. Reemplaza por clave: carrera (living, cocina, patio, techo, podio; además `carrera.json → musica.temas` puede apuntar a cualquier clave de musica.json) y mundo (ambiente, venjy, pony, lona, campamento, iglu, lenera, playa, jefe; el nivel es el momento). Con `?estudio` se aplica en vivo (`DATOS_VIVOS`).
- **Puente**: mensaje `musica { accion: 'tocar' | 'parar', tema, instrumentos, nivel, tempo }` → `estudio/musica-juego.js` toca el tema con el audio del juego y calla la música del mundo y de la carrera mientras suena (`enPrueba`).
- **«Aplica la música que creé»** (para un agente): `node estudio/cli.mjs resumen musica`, quitar `borrador` del tema (o darle la clave del tema que reemplaza, o apuntar `carrera.json → musica.temas.<pista>` a su clave), `node estudio/cli.mjs validar` y `node mundo/tests/musica.mjs`. Un tema nuevo que no reemplaza a ninguno necesita que el código decida dónde suena (anotarlo en el PR).
- **Pestaña Música (24b)**: `estudio/musica.js` (interfaz) y `estudio/musica-modelo.mjs` (lo puro: `listaTemas`, `temaDelCodigo`, `temaNuevo`, `capaNueva`, `cambiarTipo`, `ciclarGolpe`, `ponerNota`, `alternarPasoAcorde`, `ponerArpegio`, `ponerCompases`, `cambiarPasos`, `partirAcorde`, `nivelesDe`, `renombrar`). Selector con los temas del JSON y los del código (carrera: se ven tal cual y al primer cambio se copian como borrador; mundo: «Crear versión con capas» parte con su bpm, pasos y vol). Barra: Reproducir (WebAudio del Estudio con los mismos instrumentos y motor; línea que avanza en las rejillas y el acorde que suena), Reproducir en el juego (mensaje `musica`; los cambios se reenvían a los 150 ms), Nivel y Tempo ×. Progresión: un botón por compás → selector de raíz (12) y calidad (`CALIDADES`), + compás, quitar; «Progresión de» un nivel crea `progs.<nivel>`. Capas: nombre, tipo, instrumento (los del código según sea batería o no, y los propios), volumen, octava, duración, probabilidad, largo (1 o 4 compases, con botones Compás 1-4), intervalos del acorde, pasos del arpegio, niveles, 2.ª vuelta, muda, Solo (no se guarda), subir, bajar, duplicar, quitar. Rejilla en canvas: ritmo (. → x → o), acorde (pasos), arpegio (4 filas), piano roll de 25 filas (rel: semitonos sobre la raíz; notas: MIDI; Más agudo / Más grave). Cada clic suena. Panel Tema: clave (decide a quién reemplaza; lista de las del código), nombre ES/EN, uso, pasos por compás (8/12/16/24/32: `cambiarPasos` corta o rellena cada compás), BPM, volumen, swing, compases por acorde y **Borrador**. Panel Sintetizadores propios: nuevo, duplicar, borrar (no si una capa lo usa), clave (renombra también en las capas), teclado de una octava para probar, y todos los campos del esquema (filtro con barrido, tono, vibrato, hasta 4 armónicos). Deshacer (80 pasos; Ctrl+Z), Espacio reproduce, Ctrl+S guarda con If-Match tras `revisarTema` de cada tema.
- **Canciones (Salonas S1, 2026-10-21; `mundo/SALONAS.md` §3)**: `canciones.<clave>` = los campos de un tema (sin `uso`) más `estructura` (lista de `{ seccion, compases, nivel?, bpm?, pasos? }`: cada sección toca las capas y la progresión de su `nivel`, por defecto el nombre de la sección, y puede cambiar tempo y compás) y `vozBajo` (cambios a `VOZ_BAJO` de `musica-bajo.js`: `vol`, `saturacion`, `nasal`/`metal` { frec, q, ganancia } y `tecnicas.<s|p|g|t|d|a|r>`). Capa `bajo` (solo canciones): `[paso, técnica, nota, duración en pasos, extra]` con `compases` 1-4; con `inst: "bajoSlap"` suena la voz de Salonas y con otro instrumento, notas simples. Motor: `mapaTiempo(cancion, tempo)` → `{ duracion, secciones, pasos: [{ t, n, k, i, s }] }` (puro; el swing entra aquí), `pasoEnTiempo`, `tocarPasoCancion`, `crearReproductorCancion` (`empezar(ctx, cancion, { tempo, desde })`, `avanzar`, `segundoEn(t)`) y `revisarCancion` (estructura, capas por sección, bajo, `prob` prohibido). En el juego, `cancionMusica(clave)`. No editable aún en la pestaña (va en S10); se edita en el JSON.
- **Canciones de la sala de ensayo (Salonas S4, 2026-10-21)**: `canciones.sala-ska` y `canciones.sala-garage` en `musica.json` (con los sintetizadores `guitarraSkank`, `metales` y `guitarraSucia`); el menú del ensayo las ofrece desde `AJUSTES_SALONAS.canciones` (no editable aún: pasa a `salonas.json` en S9). Las notas normales del bajo usan la técnica `t` con su sonido ajustado en `vozBajo.tecnicas.t` de cada canción. Las capas de canción se editan en el JSON hasta S10.
- **Jugable de Salonas (S3, 2026-10-21)**: `salonas.js` toca la canción con dos reproductores (banda sin bajo y bajo solo) y la partitura de `salonas-partitura.js`. Sus valores (canción de prueba, teclas, carriles, cámara, audio, fallo, pausa, calibración) están en `AJUSTES_SALONAS` de `salonas-reloj.js` y las reglas en `REGLAS_BASE`: **no editables aún**; S9 los pasa a `mundo/datos/salonas.json` (`juego` → `ajustesDe`, `reglas` → `reglasDe`; el juego ya los lee por `ctx.datos()` cuando exista) y S10 crea la pestaña Ritmo.
- **No editable aún**: los acordes propios de un tema (`acordes`: el selector arma 12 × 12 por nombre, que cubre casi todo; se pueden escribir en el JSON) y el eco de cada reproductor. Los temas del mundo siguen como funciones en `musica.js` hasta que el dueño haga y aplique su versión con capas.

## 25. Pestaña Vida: cómo caminan los amigos (6d etapa 2, 2026-10-14)

- **Qué edita**: `mundo/datos/navegacion.json` (esquema `navegacion.schema.json`, fase 14 en `indice.json`). `caminar` ajusta `NAV_BASE` de `mundo/navegacion.js` (velocidad, subida, caída, alto, costos de subir/bajar/agua, codicia, nodos por cuadro y por búsqueda, llegada, atasco, reintentos, salto lejos, radio de detalle, giro, suavizado); `paseo` ajusta `PASEO_BASE` de `mundo/supervivencia/paseos-datos.js` (balanceo, acomodarse, reintento a la vista, distancia de visita, mirar al jugador). Vacío = el código.
- **En vivo**: mensaje `datos` con `navegacion` → `fijarPaseo` (la próxima búsqueda y el próximo paso ya usan lo nuevo). **Probar**: mensaje `caminar { persona, destino }` (`aqui`, `sitio`, otra persona o un lugar; destino vacío = solo preguntar) → `__venjy.paseos`; responde `paseo` con el estado (`buscando`, `caminando`, `alla`, `volviendo`, `acomodando`, `sin-camino`, `en-sitio`) y lo que falta.
- **Editor** (`estudio/vida.js`): dos grupos de números con rango (los mismos campos que el esquema y el código: lo comprueba `mundo/tests/navegacion.mjs`), «Volver a los valores del código», y arriba persona + destino (personas y anclas de `posiciones.json`, más molino y portal) con Caminar, Volver a su sitio y ¿Cómo va?. Guardar con If-Match.
- **Destinos (2026-10-14)**: `caminar.aceptable` (un parcial que termina tan cerca ya llegó), `caminar.radioPisable` (destino dentro de una construcción → el punto pisable más cercano) y `paseo.reintentosVista` (reintentos a la vista, con espera doble cada vez).
- **Rutinas (PR 2 de 6d etapa 2, 2026-10-14)**: la misma pestaña edita también `mundo/datos/rutinas.json` (esquema `rutinas.schema.json`, fase 14). Una tarjeta por visita (quién sale, a ver a quién o a qué lugar, hora de llegada y de irse con paso de 15 min, activa, gesto con lista de los de `moldes.js` y frase ES/EN al llegar y de quien recibe, nota; «Probar ahora en el juego», «Cortar y volver», «Quitar»), «Nueva visita» para la persona elegida arriba, `ajustes` (`RUTINA_BASE`: revisar, duración del gesto y los globos, respuesta, giro de cabeza de quien recibe (`girar`, `cuello`), radio del saludo, salir antes según la distancia, rodeo y segundos por hora), horario de cada amigo (su panel), nombres de lugar y las líneas del panel (`TEXTOS_RUTINA`). Un solo **Guardar** escribe los dos archivos (cada uno con su ETag). En vivo: mensaje `datos` con `rutinas` → `rutinas.fijar`; probar: mensaje `rutina { accion: 'probar' | 'cortar' | 'estado', visita?, persona? }`. `caminar.rapidezLejos` (nuevo): lejos del jugador caminan más rápido para que las visitas entre lugares lejanos quepan en el día.
- **PR 3 de 6d etapa 2 (2026-10-14)**: «Rutinas: te saludan al pasar» (gesto y frases ES/EN de `incluir`: yendo, de visita, de vuelta, a un lugar; `{quien}`), ajustes `nivelIncluir`, `radioIncluir`, `esperaIncluir`, y en Caminar `pisarHojas` (0 = rodean hojas y vallas). En vivo con el mismo mensaje `datos`.
- **7i, acompañantes (2026-10-15)**: grupo «Te acompaña: cómo te sigue» (`navegacion.json → seguir`, `SEGUIR_BASE` de `mundo/seguir.js`: distancia, holgura, rapidez para alcanzarte, migas del rastro y cuándo se corta, atasco, esperar, aparecer detrás y el ángulo de tu vista), ajuste `nivelAcompanar` y sección «Rutinas: te acompaña (botones y frases)» (`rutinas.json → acompanar`: botón para invitar y despedir, 8 frases con `{quien}` / `{lugar}` y los gestos al aceptar y despedirse), línea del panel `acompanandoOtro`. Arriba, «Que me acompañe» / «Soltarlo» con la persona elegida (mensaje `rutina` con `acompanar` / `soltar`, sin mirar la amistad). Lo prueba `mundo/tests/acompanante.mjs` (esquema = código = pestaña).
- **7i PR 2 (2026-10-15)**: grupo nuevo «Te acompaña: cómo pelea» (`navegacion.json → pelea`, `PELEA_BASE` de `supervivencia/acompanante-pelea.js`: radio, alcance, daño, ritmo, empuje, rendirse, creepers, aguante, cuándo lo gastan y lo recupera, descanso), +7 campos de su torre en «cómo te sigue» (`torre*`) y +9 textos en «Rutinas: te acompaña» (botones y respuestas de las órdenes, cansado, listo, sin bloques). No editable aún: el bloque de la torre (tierra) y lo que no rompe.
- **7i PR 3 (2026-10-15)**: +5 campos en «Te acompaña: cómo te sigue» (`puenteLargo`, `puenteCada`, `puenteQuitar`, `desatasco`, `desatascoMax`), ajuste `mochila` (casillas) en «Rutinas: ajustes» y +3 textos en «Rutinas: te acompaña» (botón y título de su mochila, lo que dice al abrirla). `torreBloques` ahora es la tierra con que llena su mochila la primera vez.
- **No editable aún (7i)**: la tolerancia de altura para «estar contigo» (3 bloques) y para volver al rastro (1,5), y el margen de 4 bloques en que siempre lo ves.
- **No editable aún (rutinas)**: qué cuenta como «no puede salir» (escena, ronda del iglú, minijuego, jefe: `libre` en `main.js`) y que no se visita a quien no está en su sitio.
- **No editable aún**: qué bloques cuentan como sólidos o líquidos (salen de `TIPO` de `texturas.js`) y la animación de caminar (`caminar()` de `cuerpo.js`, salvo el balanceo).
- **7g-1, actividades compartidas (2026-10-21)**: tercer archivo de la pestaña, `mundo/datos/actividades.json` (esquema `actividades.schema.json`, en vivo con el mensaje `datos`: `window.__venjy.datosActividades` y `ajustarPoses`). Cuatro grupos cerrados al abrir: «Fogata: cupo, radios y tiempos» (`FOGATA_BASE` de `supervivencia/fogata.js`), «Fogata: asientos» (dx/dz desde el fuego y tipo tronco/suelo/cuclillas; agregar, quitar, volver a los del código), «Fogata: frases y textos» (hasta 4 frases con clave y ES/EN, avisos y botones) y «Poses al sentarse» (`POSES_BASE` de `pose-jugador.js`: suelo, tronco, cuclillas y calentarse; las ven igual los demás jugadores). Guardar escribe los tres archivos.
- **No editable aún (7g-1)**: la pausa mínima entre frases de un jugador (1,5 s) y cuántas guarda cada actividad (12) son parámetros de `crearActividades` en `main.js`.

## 26. Combate: núcleo en datos (bloque 8 · N3, 2026-10-15)

- **Archivos:** `mundo/datos/combate.json` (esquema `combate`: motor, entrada, táctil, curvas, peso, reacciones y sus animaciones) y `mundo/datos/estilo-*.json` (esquema `estilo`, uno por estilo; hoy `estilo-prueba`). Los lee `mundo/supervivencia/combate/datos.js`; lo que falte usa `COMBATE_BASE`.
- **Animaciones de combate:** el formato de gesto de `poses.json` con el reloj `fases` (claves `["a" | "g" | "r", fracción, valor, curva]`); las curvas con nombre están en `mundo/datos/curvas.js` y `combate.json → curvas` (puntos de control).
- **CLI:** `validar` corre `reglasCombate` / `reglasEstilo` (`combate/reglas.js`); `resumen estilo-<x> <ataque>` dibuja la línea de tiempo ASCII; `resumen combate` lista motor, curvas, peso y reacciones.
- **Pestaña:** ninguna todavía. La pestaña Combate (línea de tiempo, visor y paneles) llega en N6; los canales nuevos en Poses, en N2.
- **No editable aún:** nada fuera de los JSON (todo valor del motor está en `combate.json`).

## 27. Combate: intenciones y botones de la arena (bloque 8 · N4, 2026-10-20)

- **Datos:** `combate.json → teclas` (perfiles de PC `raton` y `teclado` por `KeyboardEvent.code`, `Mouse0`/`Mouse2`; `juntos`; `mando` con botones del mapeo estándar, ejes, zona muerta, altura y vibración) y `→ tactil` (`deslizar`, `esquiva`, `joystick`, `especialModo`, `vibracion`), más `entrada.alturaNeutra`. Lo lee `combate/intenciones.js`.
- **Layout:** `ui-layout.json` tiene una página nueva, `arena` (`ar-atacar`, `ar-defensa`, `ar-saltar`, `ar-agarre`, `ar-especial`; sin franja `pie`). En la pestaña Layout, el selector «Página» cambia entre Supervivencia y Arena; la vista de la arena es `estudio/vista-arena.html` (botones reales: arriba a la izquierda muestra la intención de cada gesto). `layout-datos.js` escribe un `<style>` y una clase en el body por página (`PAGINAS_LAYOUT`).
- **Textos:** rótulos de los botones en `textos.json → arena` (pestaña Textos).
- **Pestaña:** las teclas, los umbrales y la vibración se editan en el JSON hasta el panel Controles de la pestaña Combate (N6).
- **No editable aún:** el tamaño visual de la base y la palanca del joystick flotante (`tactil-arena.css`; el recorrido sí: `tactil.joystick.radio`).

## 28. Pestaña Arena: el duelo del lago (bloque 8 · L1, 2026-10-20)

- **Archivo:** `mundo/datos/arena.json` (esquema `arena.schema.json`; valores base `ARENA` en `supervivencia/arena/modelo.js`). Lo lee `arena/arena.js` al abrir y en vivo (`aplicarDatos`, datos vivos `arena`).
- **Secciones:** peleadores (nombre, título, estilo, vida, postura, aura, carta, frases), rondas, movimiento (incluido `giroEje`), cámara, entrada (escena del reto, tiempos, vuelos), VS, práctica, golpe, HUD, escenario (medidas, fogatas, barriles, nieve, luz, hielo), público, premios y textos. Guardar usa If-Match y conserva lo que no muestra.
- **Probar:** botones «Abrir la arena», «Pelear con Lalo», «Pelear con Moisés» y «Terminar» (mensaje `arena { accion }`).
- **Escena del reto:** `entrada.guion` es la base; el juego busca primero `<guion>-<clave>` (la de quien te retó) y si no, `<guion>`.
- **No editable aún:** `marcas`, `planos` (L3), `dificultades` y `escenario.tipo` (solo en el JSON); las constantes de `arena/escena.js` (luz, tamaño de bloques y copos, grada y balanceo del público, iglú, pinos, encuadre del retrato), el CSS de las capas y los sonidos de `arena/arena.js`.

## 29. Estilo Sekiro: postura, desvío, katana y efectos (bloque 8 · L2, 2026-10-20)

- **Archivo nuevo:** `mundo/datos/estilo-sekiro.json` (esquema `estilo`, ampliado): controles, guardia, paso, bloqueo, `arma` (`modelo: katana`, `vaina: vaina_katana`, caja de la hoja), `reglas` (postura, tabla por resultado, desvío con penalización, `bloqueoDano`), ataques `tajo1`-`tajo4` (combo continuo) y `fuerte` (con `carga`), acciones `esquiva`, `desvio`, `desvio_choque`, `desvio_perfecto`, y las animaciones. Cada ataque trae `efectos.estela` (cuadros, ancho, tramo de la hoja, color, borde = aura, opacidad, desvanecer). `combate.json` suma la reacción común `desequilibrado` (con armadura).
- **Arena (`arena.json`):** `peleadores.lalo.estilo = "sekiro"`; `practica.patron` (pasos `golpes` o `fuerte`) y `desviaCada`; `hud.postura`, `posturaAlta`, `posturaFondo`, `anchoPostura`; `efectos` (chispas, destello del perfecto, chispas del bloqueo, brillo de la carga, escalones de la estela); `textos.postura`. Todo en la pestaña Arena.
- **Katana y vaina:** `objetos-mano.json → objetos.katana.mano3` (en la mano, medida desde el hombro) y `objetos.vaina_katana.mano3` (en la cadera, desde los pies), en la pestaña Objetos → «Armas del combate»; la arena las vuelve a armar en vivo.
- **CLI:** `capturar combate <estilo>:<acción> [--cuadros] [--cadena tajo1,tajo2,…] [--carga n] [--hoja]` corre el motor de combate real y dibuja con el rig completo y el arma (`.claude/skills/animaciones-minecraft/posar-combate.html`).
- **No editable aún en el Estudio:** `estilo-sekiro.json` (reglas, ataques, efectos de la estela y animaciones) se edita en el JSON hasta la pestaña Combate (N6); las medidas de la katana (`KATANA` en `modelos-mano.js`) y los sonidos sintetizados nuevos (campana, postura, carga) de `arena/arena.js`.

## 30. Peso de los golpes y reacciones (bloque 8 · N5, 2026-10-20)

- **Datos nuevos en `combate.json`:** `impacto` (temblor del hitstop y sacudida por trauma), `elegir` (qué reacción toca), `sonidos` (voces de las capas: aire, impacto por material, cuerpo, cola, volumen por nivel, perfecto) y las 12 reacciones que faltaban de §18 con su `anim` (`espejo`, `efectos.sobre` y `efectos.polvo` nuevos en el esquema de la acción).
- **Datos nuevos en `arena.json`:** `efectos.impacto`, `polvo` (colores por superficie), `aro`, `estrellas`, `marca`, `topeCuadro` y `pantalla` (líneas, flash por nivel, viñeta, números); `escenario.superficie`; `muneco` (`recupera`, `reacciones`); textos `muneco`, `ayudaMuneco` y `espejo`.
- **Estudio → Arena:** sección «Peso de los golpes» con todos los números y colores de los efectos, los niveles en que salen el aro, las líneas y la viñeta, el flash por nivel, la superficie y el muñeco.
- **No editable aún en el Estudio:** `combate.json → peso, impacto, elegir, sonidos` y las reacciones (hasta la pestaña Combate, N6; mientras, en el JSON).
- **Muñeco de práctica:** botón en el menú de la arena; no ataca, no cae y el reloj no corre; R juega la reacción siguiente (Mayús + R, en espejo).

## 31. Sekiro II: peligrosos, mikiri y golpe final (bloque 8 · L3, 2026-10-20)

- **Reglas (`combate/peligro.js`, puro):** `estilo-*.json → reglas.peligro` (aviso en cuadros, destello, y la tabla de §16.4 en `respuestas`: qué defensa sirve contra barrido, estocada, agarre e imparable; `ventana` acorta el desvío), `reglas.mikiri` (acción, hasta activo + N, umbral de «hacia adelante»), `reglas.remate` (acción y alcance) y `reglas.espiritu` (segmentos, lo que da el perfecto y el normal). Lo que falte usa `PELIGRO_BASE`.
- **Esquema de los ataques, ampliado:** `posturaFija` (la recibe el rival aunque bloquee), `posturaPropia` (se suma o resta al que ataca), `rompeGuardia` (la guardia mantenida no lo para), `costo.espiritu` y `alConectar` (la acción que sigue si entra). Las acciones suman `pareja` (`rival`, `cuando`, `postura`, `dano`, `hitstop`, `nivel`, `resultado`, `material`), `efectos.envainar` y el estado `salto`.
- **Sekiro (`estilo-sekiro.json`):** controles `saltar → salto`, `agarre → patada`, `especial → arte`; ataques `pisoton`, `patada`, `arte` («Trazo único») y los peligrosos `barrido`, `estocada`, `agarre`; acciones `salto`, `mikiri`, `remate` y `lanzamiento`. `estilo-prueba.json` (Moisés hasta L5) suma los tres peligrosos y `lanzamiento` para que su práctica los tire. `combate.json` suma las reacciones de pareja `pisado` y `agarrado`.
- **Arena (`arena.json`):** `practica.peligros` y `peligroCada` (el rival intercala los peligrosos); `camara.remate` (plano de cine del golpe final: duración, distancia, altura, mira, desde, giro y fov; se aleja solo si no caben); `hud.espiritu` y `espirituFondo`; `efectos.peligro` (destello rojo del arma) y `efectos.pantalla.aviso` (el rombo: colores, tamaño, altura y parpadeo); textos `golpeFinal`, `mikiri`, `botonPatada` y `botonArte` (rótulos de los botones táctiles cuando el estilo los usa). Todo en Estudio → Arena (Cámara, Práctica, HUD y Peso de los golpes).
- **No editable aún en el Estudio:** lo nuevo de `estilo-sekiro.json`, `estilo-prueba.json` y las reacciones de `combate.json` (hasta la pestaña Combate, N6; mientras, en el JSON) y los sonidos sintetizados nuevos (`peligro`, `mikiri`, `remate`, `nada` en `arena/arena.js`).

## 32. CPU peleador (bloque 8 · L4, 2026-10-20)

- **Módulo `combate/ia.js` (puro, con semilla propia):** `reglasCPU(arena.cpu, estilo, dificultad)` funde `CPU_BASE` con `arena.json → cpu` y `estilo-*.json → cpu`; `crearCPU` y `intencionCPU(S, F, O, libre)` dan la intención de cada cuadro. La arena la llama con `modelo.intencionCPU(P, i)` (una CPU por ronda).
- **Dificultad (`arena.json → cpu.dificultades`):** `anticipacion` (× la de sus ataques), `retraso` (cuadros con que ve tu estado), `desvio` y `perfecto`, `bloqueo`, `esquiva`, `peligros` (leer los tuyos) y `agresion`. `cpu.minimo` (anticipación mínima normal y peligrosa), `repetirMax` y `castigo`. Todo en Estudio → Arena → «CPU peleador».
- **Tabla del estilo (`estilo-*.json → cpu`):** `cadena`, `retrasado` (prob. y cuadros), `fuerte`, `patada`, `arte`, `peligro` (cada, pocaVida, factor, lista; vacía = todos los ataques con `peligro`), `respiro` (cuadros, alejarse, provocar, lejos), `distancia` (cerca, margen × alcance, velocidades), `esperaInicial` y `provocar` (acción; `null` = solo el evento `provoca`). Sin tabla, el estilo usa `CPU_BASE.estilo` (Moisés hasta L5).
- **Motor:** `intencion.sostener` (estados.js) deja el ataque en su último cuadro de anticipación; solo lo manda la CPU.
- **No editable aún en el Estudio:** la tabla del estilo (pestaña Combate, N6). La práctica de L2 (`arena.json → practica`) queda para las pruebas.

## 33. Urban Reign I: alturas, combo y defensa (bloque 8 · L5, 2026-10-21)

- **Controles por altura:** `controles.atacar|defensa|esquivar` como `{ medio, alto, bajo, adelante }`; `adelante` vale cuando la altura es la neutra y el cuerpo va hacia el rival (`combate.json → entrada.adelante`, 0,5). Las ventanas de `cancelar` aceptan `altura` (el castigo bajo de la esquiva neutra).
- **Defensa por altura (`combate/urbano.js`, `estilo-*.json → reglas.altura`):** una acción con `defiende` desvía si el golpe de esa altura llega hasta `ventana` c después de empezar (reversión hasta `reversion`; +`tactil`); otra altura dentro de la ventana entra × `errada`; fuera mandan sus i-frames (`iframesAlturas` limita los de la esquiva neutra a alto y medio normales). `contra` y `reversionAccion` son las acciones de pareja; `imparable` no se desvía; `sinPostura` apaga la postura y su barra. La tabla de §16.4 del que recibe (`reglas.peligro.respuestas`) sigue mandando sobre los peligrosos.
- **Ataques:** `soloSi` (solo pega al rival en esas reacciones: los remates aéreos al `lanzado`), `golpea` (mano o pie: ahí sale la marca de altura) y `material` (a qué suena desviado). `avisos.altura` (activo, cuadros, tamaño, colores) es la marca de §17.3.
- **CPU (`estilo-*.json → cpu`):** `cadenas` (alturas con peso; la cadena sigue solo si conecta), `acierto` por dificultad (leer bien la altura) y `castigoBajo`.
- **No editable aún en el Estudio:** todo lo nuevo de `estilo-urbano.json` (pestaña Combate, N6).


## 34. Urban Reign II-a: zonas, pared, barriles y paso de boxeo (bloque 8 · L6a, 2026-10-21)

- **Zonas (`combate/zonas.js`, `estilo-*.json → zonas`):** `tope`, `porAltura` (alto → cabeza, medio → torso, bajo → piernas), `porDano` (zona por punto de daño si el ataque no trae `zona`), `niveles` (amarillo, rojo), `multiplicador` (verde, amarillo, rojo) y `critico` (`cabeza.reaccion` y `remate`, `torso.dano` y `cuadros`, `piernas.velocidad`). Un ataque o una pareja puede traer `zona`: un número (a la zona de su altura) o `{ cabeza, torso, piernas }`. Un estilo sin `zonas` no las usa (Sekiro sufre por postura).
- **Altura errada:** `reglas.altura.erradaEn` = `vida` (el valor base: × errada al daño) o `zona` (× errada a lo que suma la zona; Urban Reign).
- **Cojera:** `paso.cojera` = `{ accion, largo, pierna, lento, alzar }`: con las piernas en crítico la caminata es la animación de esa reacción (un ciclo cada `largo` bloques) y la pierna rota da su paso `lento` veces más largo. `p.ritmo` (estados.js) multiplica la velocidad del paso.
- **Paso de boxeo:** `paso.modo` = `libre` (el de siempre) o `arrastre`, con `paso.arrastre` = `{ umbral, cuadros: [guía, arrastre], altura: [...], adelanto: [...], espera }`. Guía el pie que la guardia pone más lejos en la dirección del movimiento; el otro sale cuando el primero va en `espera`. Regla para cualquier guardia: las rodillas deben quedar lejos de `combate.json → motor.pies.rodillaMin` (0,4) y el rebote (`respiracion`) debe bajar el cuerpo, no subirlo; si no, la pierna se da por estirada y los pies dan pasos sin parar.
- **Arena (`arena.json`):** `rebote` (`distancia`, `alturas`, `extra`), `escenario.barril` (`radio`, `rompe`, `dano`), `hud.silueta` y los colores `zonaVerde`, `zonaAmarilla`, `zonaRoja`, `zonaCritica`, `zonaBorde`; `efectos.polvo.cuantos.barril` y `colores.madera`; textos `criticoCabeza`, `criticoTorso`, `criticoPiernas`. Eventos nuevos del modelo: `critico` (`i`, `zona`) y `barril` (`n`, `x`, `z`, `i`); `golpe` trae `zonas` (lo que sumó).
- **Editable en el Estudio (pestaña Arena):** silueta (alto y colores), rebote y barril. **No editable aún:** `estilo-urbano.json → zonas`, `paso.arrastre`, `paso.cojera` (pestaña Combate, N6).


## 35. Urban Reign II-b: agarres, pisotón, SPA, arte especial y Furia (bloque 8 · L6b, 2026-10-21)

- **Reglas (`combate/spa.js`, `estilo-*.json → reglas.spa`):** `agarre` (`ventana` 18, `tactil` 24, `errado` ×1,2, `empujon`, `pista` 4, acciones `sujetar`, `sujetado`, `zafarse`, `soltado` y `remates` por altura), `pisoton` (`accion`, `reacciones`, `distancia`), `arte` (`rompe`: estados desde los que sale el arte especial; `excepto`: reacciones donde no), `furia` (`accion`, `costo`, `segundos`, `prisa`, `zona`, `armadura`, `rompeGuardia`, `entrada`). Un estilo sin `reglas.spa` no los usa (Sekiro), pero cualquiera puede ser agarrado y zafarse.
- **Barra SPA:** `reglas.espiritu.porHecho` y `porRecibido` (daño por segmento; 0 = no). Sekiro sigue con desvíos.
- **Ataques y acciones:** `sujeta` (agarre por altura), `comoPeligro` (se defiende como ese peligro, sin aviso ni los 24 c), `mantieneReaccion` (el pisotón), `pareja.repetir` (más golpes de una pareja), `altura` en las acciones (zona del remate). Estados nuevos: `sujetado`, `furia`.
- **Motor:** `estados.cambiarAccion` (amago), `p.prisa` (Furia). Eventos nuevos: `sujeta`, `escape` (`zafa` | `errado`), `agarre`, `amago`, `arte` (`rompe`), `furia` (`activa`).
- **CPU (`estilo-*.json → cpu`):** `escape` (acierto por dificultad, × amago, cuadros), `amago` (por dificultad), `rompe` (prob., espera, vidaMax), `furia` (prob., distancia), `pisoton` (prob.); `peligro.lista` con los agarres.
- **Arena y táctil:** `efectos.aura` y `hud.furia` (pestaña Arena), botón `ar-modoEspecial` FURIA (pestaña Layout); AGARRE y ESPECIAL por altura esperan el gesto (`intenciones.fijarGestos`). Textos `zafa`, `errado`, `arteRompe`, `furia`, `botonFuria`, `botonGiro`.
- **No editable aún:** `reglas.spa`, `reglas.espiritu` y la CPU de Urban Reign (pestaña Combate, N6, que pasa al inicio de la Etapa B).

## 36. Pestaña Salonas y página de layout (Salonas S9, 2026-10-21)

- **Pestaña Salonas** (`estudio/salonas.js`): edita `mundo/datos/salonas.json` (`juego`, `reglas`, `textos`). Editor genérico sobre el JSON (un campo por valor; las claves nuevas aparecen solas), cambios en vivo por `datos` 'salonas', Guardar con `PUT /api/datos/salonas`.
- **Layout, página «Salonas»**: botones `pausa` y `primus` (`SELECTORES_SALONAS`); vista `estudio/vista-salonas.html` con el CSS real (`CSS_SALONAS`). Los trastes táctiles no se editan: siguen la línea 3D.

## 37. Pestaña Ritmo: la partitura en línea de tiempo (Salonas S10a, 2026-10-21)

- **Pestaña Ritmo** (`estudio/ritmo.js` + modelo puro `estudio/ritmo-modelo.mjs`): bajo el juego, la partitura de la canción y dificultad elegidas (secciones arriba, un carril por fila, notas en su segundo; slap/pop con borde, brillantes con punto, largas con cola, zoom). **Revisar partitura** (`revisarPartitura`) lista los avisos con texto ES/EN y marca la sección en la línea de tiempo; un clic en el aviso lleva a ella.
- **Ajustes a mano**: elegir una nota (clic) y cambiarla de carril (botones o teclas 1-4), quitarla (Supr) o volver a la generada (Retroceso). Se guardan en `salonas.json → ajustes.<canción>.<dificultad>.<compás:paso>` = carril | `null` (esquema `ajustesMano`); nunca cambian cuándo suena una nota. `salonas.js` los pasa a `partitura(..., { ajustes })`, en vivo.
- Comparte datos, envío en vivo y Guardar con la pestaña Salonas (`ctx.salonas`), para no pisar el mismo archivo. Prueba: `mundo/tests/ritmo.mjs`.
- **S10b hecho**: «Probar en el juego» manda `salonas { accion: 'probar', cancion, dificultad, seccion }` (índice de la sección del selector, el mismo de la Práctica); el juego abre esa canción en Práctica solo con esa sección y con los ajustes a mano actuales. `terminar` cierra Salonas.
- **S10c-1 hecho**: panel «Canción · estructura» (nombre ES/EN, bpm y pasos base; por sección: nombre, compases, nivel, bpm, pasos, mover/duplicar/quitar/agregar; progresión del nivel). Edita `musica.json → canciones` a través de `ctx.musica` (datos, deshacer y Guardar compartidos con la pestaña Música, que se monta antes). Funciones puras en `ritmo-modelo.mjs`. La partitura se regenera sola y va en vivo al juego.
- **S10c-2 parte 1 hecho**: panel «Bajo · piano roll» (`ritmo-bajo.js`) sobre la capa de bajo del nivel de la sección elegida, con los carriles de cada dificultad debajo en vivo.
- **S10c-2 parte 2 hecho**: «Escuchar en bucle» (solo el bajo o toda la sección elegida; `ctx.musica.escuchar` en `musica.js`, con `crearReproductorCancion` y el mismo audio de Música; se re-arma sola al editar) y panel «Voz del bajo» con sliders para `vozBajo` (vol, saturación, nasal, metal y las 7 técnicas con su chasquido). Solo se guardan las claves que el dueño mueve; el resto es `VOZ_BAJO`. Modelo puro: `valorVoz`, `ponerVoz`, `hayVoz` y `CAMPOS_*` (rangos = los del esquema) en `ritmo-modelo.mjs`.

## 38. Pestaña Combate (bloque 8 · N6, 2026-10-21)

N6 se divide en tres PR, los tres hechos (abajo): **N6a**, **N6b** y **N6c** (paneles Peso con «oír», Reacciones, Controles y CPU, y «Probar en el juego» con el mensaje `combate`).

- **N6a hecho**: `estudio/combate.js` (panel junto al juego + zona `co-zona` debajo) y el modelo puro `estudio/combate-modelo.mjs`. Edita `estilo-*.json` (los del índice con esquema `estilo`) y `combate.json` (reacciones comunes y las casillas **Suelo automático** y **Pies anclados** de `motor`, «Todos los estilos»).
- **Línea de tiempo** (aspecto de la de Escenas, clases `es-*`): regla en cuadros, las tres fases (el borde derecho estira esa fase y corre lo que viene) y una fila por ventana: cancelaciones, i-frames, armadura, `ventana` y avance (este sigue a su fase entera, no se arrastra). Bordes y centro escriben **marcas ancladas a la fase** con `aMarca` (cuadro → `fase+n`, `fin` al final); una cancelación sin `hasta` sigue abierta.
- **Vista simple**: rapidez (× lo que dura, parte de las fases al elegir la acción para no acumular redondeos), las tres fases con nombre común (Preparación, Golpe, Vuelta), altura, daño, postura, alcance y empuje; ventanas con «Puede pasar a…», «solo si conectó», + Cancelación, + Invulnerable, + Armadura; **Partir de este** duplica la acción con otra clave (misma animación; solo añade). **Avanzado**: peligro, peso (hitstop), reacción, postura fija y propia, mezcla, rapidez máxima, arco y casillas.
- **Revisión en vivo**: las reglas de `validar` (`reglasEstilo`/`reglasCombate`) filtradas a la acción elegida (p. ej. un peligro con menos de 24 c de preparación).
- **En vivo**: `DATOS_VIVOS` suma `combate` y los tres estilos; el juego aplica `combate` con `fijarCombate` y cada estilo **en el lugar** sobre `__venjy.estilosArena` (nuevo getter en `main.js`; carga la arena si no estaba), así la pelea en curso ya lo usa. Guardar escribe con If-Match cada archivo tocado.
- Prueba: `mundo/tests/estudio-combate.mjs` (lista, ida y vuelta de marcas en todas las acciones reales, estirar, arrastrar, rapidez, ventanas, duplicar, reglas y puente).
- **N6b hecho**: visor 3D sobre la línea (`estudio/combate-visor.js`) con el modelo puro `estudio/combate-visor-modelo.mjs`.
  - **Mismo motor que el juego**: `simular` corre `crearAnimador`/`animar` cuadro a cuadro (guardia → acción → guardia, `BUCLE` 18 + 24 cuadros), así la mezcla, el suelo automático y los pies anclados se ven como en la pelea. El rival está a `alcance × 0,85` (entre 1,1 y 3) y reacciona desde el primer cuadro del golpe con `reaccionPara(def, nivelDe(def))`. Sin hitstop ni empuje todavía (van con el panel Peso, N6c).
  - **Vistas**: frente (solo el que actúa, como en Poses), 3/4 y lado (los dos; la cámara no sigue al avance). Hoja de cuadros de 8 (siempre el primero de cada fase) en 3/4, con botones para saltar. Arma: caja de `arma.caja` colgada de la muñeca (sigue a la mano sola); punta roja y su camino durante la acción en amarillo. Sin arma, la marca va en la mano o el pie de `golpea`.
  - **Cabezal**: línea amarilla en la línea de tiempo; clic o arrastre en la regla, clic en la hoja o en el fondo de la curva lo llevan a un cuadro y pausan. Clic en el visor: pausa o sigue.
  - **Claves** (casilla «Claves de la animación (avanzado)»; la vista simple no las muestra): una fila por canal con claves de fase, puntos coloreados por fase; arrastrar a los lados escribe `[letra, fracción]` de la fase donde cae y nunca pasa a la clave vecina (el orden no cambia). Clic en el nombre del canal: su curva (como en Poses, eje vertical = límite duro del canal), arrastrar en 2D, doble clic agrega, Supr borra (queda al menos una), valor y curva de llegada (`nombresCurvas`). La animación se escribe en el archivo donde vive (`estilo.anim` o `combate.anim`); las del código se ven pero no se editan.
- **N6c hecho**: paneles en pestañas junto a «Acción» (`estudio/combate-paneles.js`, modelo puro `estudio/combate-paneles-modelo.mjs`), cada uno con vista simple y «Avanzado»; revisión en vivo por panel (las reglas de `combate.json`, o `$.cpu` del estilo).
  - **Peso** (`combate.json → peso, impacto, sonidos`): un tipo de golpe a la vez con nombre común (ligero … golpe final): pausa del golpe, sacudida, empuje, chispas y cámara lenta. Sonido: material y un botón **Oír** por capa (aire, impacto, cuerpo y el golpe entero con eco). `vocesDe` arma las voces con `capasSonido` del juego apagando las otras capas y deja `COMBATE` como estaba; las toca un WebAudio propio del Estudio (no el del mundo). Avanzado: temblor, sacudida, eco y tono, y las voces de cada capa (tipo, frecuencias, duración, volumen, forma o filtro; agregar y quitar).
  - **Reacciones** (`elegir`): la tabla altura × nivel (ligero, medio, fuerte), las leves seguidas que tumban y «Ver y editar» (lleva la reacción a la línea de tiempo y al visor). Avanzado: lo que sube un golpe fuerte o un final, en qué se convierten las leves acumuladas y la pared.
  - **Controles** (`teclas`, `tactil`, `entrada`; `estilo → controles`): perfil con que empieza la arena; las teclas de cada acción del perfil elegido (clic, y la próxima tecla o botón del ratón queda; Esc cancela; «+» agrega otra; una tecla en dos acciones sale en rojo con el aviso); qué acción hace cada botón en el estilo (también por altura); táctil (vibración, deslizar, esquiva, joystick). Avanzado: tiempos del deslizar, buffers, ventanas extra, la carga del golpe fuerte y el mando.
  - **CPU** (`estilo → cpu`): solo los campos que el estilo ya trae (`camposCpuDe`), con nombres comunes; un par [mín, máx] son dos números. «Según la dificultad» para lo propio del estilo (acierto, escape, amago) y los peligrosos que usa (casillas; ninguno = todos). Avanzado: el resto y las cadenas de alturas de Urban Reign. **La dificultad general (`arena.json → cpu`) sigue en la pestaña Arena**: así `arena.json` no se edita desde dos pestañas (dos copias con su ETag chocarían al guardar).
  - **Probar en el juego**: botón y dificultad junto al estilo y la acción. Mensaje `combate { accion: 'probar' | 'terminar', estilo (sin «estilo-»), ataque, reaccion, dificultad }` → `arena.probar` (nuevo; solo lo llama el Estudio): tú con el otro peleador, el rival con el estilo que se prueba (aunque ningún peleador lo use, como `estilo-prueba`), directo a la pelea. Un ataque o movimiento: el rival es el de práctica (`intencionPractica`) con `reglasProbar` (copia de R con `practica.patron = [{ accion }]`, sin peligros intercalados ni desvíos). Una reacción: el muñeco con solo esa (R la juega). Aviso `textos.probando`. «Cerrar la arena» manda `terminar`.
  - **Visor**: `simular(…, { estiloR, peso })`. El hitstop del nivel del golpe congela a los dos en el cuadro del golpe (pasos extra con `hs`; el rival tiembla con `temblor` de `peso.js`) y el empuje (el del ataque o el del nivel) lo corre como `mover` de la arena (30 % de lo que falta por cuadro, desde el cuadro siguiente al golpe, también en la pausa). `indiceDe` corre los cuadros de después del golpe. Selector **Rival** (otro estilo: su reacción, su animador y su arma) y casilla **Pausa del golpe y empuje**. Con «Claves de la animación», **+ Canal** (`canalesLibres`/`agregarCanal`): un canal que la animación no mueve, con dos claves (al empezar y al terminar) en el valor de hoy dentro de su límite; solo en animaciones de un JSON.
  - Pruebas: `estudio-combate.mjs` ampliada (hitstop y empuje en todos los ataques, rival de otro estilo, canal nuevo, rangos de cada control contra los JSON de hoy, «oír» por capa, teclas, probar en el modelo de la arena y el mensaje del puente) y `estudio-combate-navegador.mjs` (nueva: visor, paneles, capturar una tecla y probar en la arena). En la prueba de navegador los clics van con `dispatchEvent`: con el visor a 60 cuadros los clics por coordenada de Playwright fallan a veces.

## 39. Estudio simple · B0: inventario de pestañas y lo que se deduce solo (Etapa B, 0b, 2026-10-21)

Pedido del dueño: que el Estudio lo use alguien sin conocimientos. Este inventario mide qué tan cargada está cada pestaña, qué se puede deducir solo y qué va en la vista simple; de aquí salen las tareas B0-x de `mundo/PENDIENTES.md` (0b).

**Medición** (2026-10-21; «campos» = números o textos que la pestaña muestra a la vez, contados en los `GRUPOS` y listas del módulo; «hojas» = valores del JSON que edita):

| Pestaña | Carga | Qué edita | Ya simple | Deshacer |
|---|---|---|---|---|
| Vida | ~130 campos en 11 grupos | `navegacion.json`, `rutinas.json`, `actividades.json` | no | no |
| Carrera | ~130 campos en 16 grupos + plano | `carrera.json` | el plano sí | solo el plano |
| Mesa | ~118 campos en 34 grupos | `cartas-mesa.json` (327 hojas) | no | no |
| Salonas | todo el JSON, campo por hoja (462 hojas) | `salonas.json` | no | no |
| Poses | 28 sliders por canal + curva, osciladores y variantes | `poses.json` | no | sí |
| Música | capas con rejilla o piano roll, sintes, progresión | `musica.json` (4769 hojas) | no | sí |
| Arena | ~65 campos en 24 grupos | `arena.json` | no | no |
| Escenas | línea de tiempo + ~37 campos del bloque | `escenas.json` | casi (bloques que se arrastran) | sí |
| Combate | vista simple + Avanzado por panel (N6) | `combate.json`, `estilo-*.json` | **sí** | no |
| Inicio | ~20 campos + vista previa | `inicio.json` | casi | no |
| Formas | ~21 campos en 1/16 de bloque | `formas.json` | no | no |
| Objetos | 12 números por objeto (mano1 y mano3) | `objetos-mano.json` | no | no |
| Ritmo | partitura, «Revisar partitura», bajo | `salonas.json → ajustes`, `musica.json` | sí | sí |
| Textos, Píxeles, Layout, Posiciones | tabla, pincel, arrastrar, gizmo | | **sí** | sí |

Las más cargadas, en orden: **Vida, Carrera, Mesa y Salonas** (muros de números), luego **Poses y Música** (pocas opciones a la vista, pero piden saber de rig o de música), luego Arena.

**Qué se deduce solo (y deja de pedirse en la vista simple):**
- **Música:** la tonalidad sale de la progresión y el compás es 4/4; el estilo (cumbia, rock, disco, chiptune…) trae tempo, instrumentos y una base de ritmo, bajo, acordes y melodía de ejemplo. Tres perillas que mueven varios valores a la vez: «más rápido» (bpm), «más triste» (acordes a menor, tempo y brillo) y «más fuerte» (volumen y densidad de la batería). Piano roll, campos finos de las capas y sintes quedan en Avanzado; la rejilla de batería se queda en la simple (clic en un paso es fácil).
- **Poses:** suelo automático siempre prendido en la vista simple; el arma u objeto de la mano sigue a la mano (cuelga de `munecaD`, no se anima aparte); «copiar al otro lado» (espejo) y «suavizar» en un clic; partir de una pose base (saludo, golpe, abrazo, sentarse). Sliders agrupados por parte del cuerpo con nombres comunes («pierna derecha: adelante/atrás» en vez de `pDx`); en simple solo cabeza, tronco, brazos, codos, piernas y rodillas; `pX pY pZ`, `armaX armaZ`, osciladores y variantes, en Avanzado.
- **Escenas:** el largo de un bloque de frase sale del largo del texto (velocidad de lectura); los planos de cámara ya tienen valor por defecto (sin `camara`).
- **Vida:** la vista simple son las rutinas en frases («quién visita a quién, de qué hora a qué hora»); caminar, seguir y la fogata (radios, tiempos, rastro) van a Avanzado.
- **Carrera:** una sola «dificultad» que mueve la IA y la física; los tres niveles de derrape, turbos y paredes a Avanzado. El plano ya es la vista simple de la pista.
- **Mesa y Arena:** mover la mesa con el gizmo de Posiciones en vez de seis números; cámaras con bases («cerca», «de lado», «desde arriba»); los precios y pesos de sobres como una tabla aparte.
- **Salonas:** simple = canciones, dificultad y textos; juicio, partitura, cámara y audio a Avanzado (el editor recorre el JSON, así que basta una lista de rutas «simples»).
- **Objetos y Formas:** arrastrar en el juego (como el gizmo de Posiciones) en vez de escribir 12 números; «igual que el tipo» para volver al valor común.
- **General:** cada número con «volver al valor del juego» (borra la clave del JSON y queda el del código).

**Hecho en este PR (común a todas las pestañas, `estudio/ayuda-modelo.mjs` + `estudio.js`):**
- **Pestañas en grupos** con rótulo: Pantalla y mundo · Historias · Minijuegos · Arte y sonido (`GRUPOS`; el orden de los botones de `index.html` lo sigue y la prueba lo revisa). La barra pasa a dos filas: título y botones arriba, pestañas abajo.
- **Franja de ayuda** bajo la barra: qué edita la pestaña en palabras comunes y «Para empezar: …» con el primer paso, en ES/EN (`AYUDA`). Los botones que nombra entre «…» existen con ese nombre (lo revisa la prueba). Botón «Ayuda» la oculta o muestra (se recuerda en el navegador).
- **Vista Simple / Avanzado global** en la barra (`ctx.vista`, `ctx.alVista`, `body[data-vista]`; se recuerda; por defecto Simple). En Simple se esconde todo lo que tenga la clase `solo-avanzado`. Cada pestaña que gane su vista simple solo marca lo fino con esa clase (y, si necesita más, escucha `ctx.alVista`). Ya marcado: los «Avanzado» del Combate y la casilla «Claves de la animación».
- Prueba: `mundo/tests/estudio-ayuda.mjs`.

**Orden propuesto** (cada uno su PR): B0-M Música → B0-P Poses → B0-C campo común (número con «volver al valor del juego», deshacer en las 9 pestañas que no lo tienen y punto en la pestaña con cambios sin guardar) → vista simple de Vida, Carrera, Mesa y Salonas → Arena, Objetos, Formas, Inicio.

**B0-M · Música simple** (rama `claude/b0m-musica-simple`): `estudio/musica-simple.mjs` (puro).
- **Empezar con un estilo**: cumbia, rock, disco, chiptune, ska y lofi (`ESTILOS`), cada uno con tempo, progresión y una base de batería (bombo, caja, hi-hat o madera), bajo, acordes (o arpegio) y una melodía de ejemplo en Do mayor / La menor pentatónica. `temaDeEstilo` lo crea como borrador libre con clave libre (`cumbia1`…); solo instrumentos del código y el formato del esquema (`additionalProperties: false`: no se guarda el estilo, las perillas leen el tema tal cual).
- **Perillas**: rapidez (bpm 60-200 con palabra: lenta, normal, rápida), fuerza (volumen del tema 0,03-0,18; la batería sube o baja con la raíz de la razón, así se nota más y vuelve exacto), ánimo (alegre o triste: la vuelta parte en el primer acorde mayor o menor, mismos acordes; si no hay menores, los mayores pasan a menor y vuelven) y tono («Más grave» / «Más agudo»: acordes de la progresión y de cada nivel y melodías, un semitono; los acordes propios del tema se quedan). La tonalidad (del primer acorde, «La menor») y el compás (de los pasos) se leen solos.
- **Simple / Avanzado**: en Simple cada capa muestra nombre, instrumento, volumen, Muda y Solo, y solo la rejilla de batería; lo demás (tipo, octava, duración, probabilidad, largo, niveles, 2.ª vuelta, ordenar, piano roll y arpegio, agregar capas, Tempo ×, clave, uso, pasos, bpm/swing a mano y sintes) lleva `solo-avanzado`. `ctx.alVista` vuelve a pintar las capas para medir la rejilla que estaba escondida.
- Pruebas: `estudio-musica.mjs` (cada estilo cumple el esquema y `revisarTema` antes y después de las perillas; ánimo, tono y fuerza de ida y vuelta).

**B0-P · Poses simple** (rama `claude/b0p-poses-simple`): `estudio/poses-simple.mjs` (puro, sobre `poses-modelo.mjs`, que ahora exporta `editar`).
- **14 sliders principales** (`PARTES`, `SIMPLES`): cabeza (mirar, girar), cuerpo (inclinarse, altura), cada brazo (levantar, abrir, doblar el codo) y cada pierna (paso, doblar la rodilla), con el nombre de la parte y qué pasa en cada punta («arriba … atrás»). El slider es el mismo canal (no se invierte nada); en Avanzado vuelven los 28 con su código y sus botones +k, +osc y ×.
- **Bases para partir** (`BASES`, panel «Partir de una base»): de pie, saludar, celebrar, pensar, brazos cruzados, señalar, agacharse, guardia (pelea) y sentado en una silla; cada una crea una pose nueva con clave libre.
- **Un clic**: copiar derecha a izquierda (o al revés), espejo (cambia de lado y da vuelta giros y ladeos del centro) y, en gestos, suavizar (todas las claves en suave). Trabajan sobre la pose, el gesto o su variante, con claves y osciladores; los «abrir» (`bDz`/`bIz`) y el giro del brazo cambian de signo al pasar al otro lado.
- **Suelo automático** prendido por defecto. **El arma sigue a la mano**: en Poses no hay arma a la vista; la del visor del Combate ya cuelga de la muñeca (N6b) y `armaX`/`armaZ` quedan en Avanzado.
- En Simple se esconden: casos sentado/jugador, Grabar, medir manos, ¿patina?, la curva y sus osciladores, reloj y ciclo, nota y Descargar.
- Pruebas: `estudio-poses-editor.mjs` (bases dentro del rango y válidas sin tocar lo que había; copiar y espejo en pose y gesto con claves y oscilador; espejo dos veces = igual; suavizar).

**B0-C · Campo común** (rama apilada sobre B0-P): tres piezas compartidas en `estudio/campo-comun.js`.
- **Deshacer**: `instalarDeshacer(ctx, { pestana, idBoton, leer, poner })` guarda instantáneas de texto del JSON tras cada `cambio()` (los cambios a menos de 0,4 s se juntan, así un slider es un solo paso; tope 100); pone el botón «Deshacer» junto a «Descartar cambios» y atiende Ctrl+Z (salvo dentro de un campo de texto). `poner(texto)` devuelve los datos y repinta. Carrera usa el botón `ca-deshacer` del editor de pista (`adopta`) y ya no tiene historial propio.
- **Punto de «sin guardar»**: cada `montarX` registra `ctx.sucios[clave] = sucio`; `estudio.js` revisa al editar y cada segundo y pone la clase `sucia` al botón de la pestaña.
- **Del juego** (`botonJuego`): en los números borra la clave del JSON (`quitarRuta` también limpia los objetos que queden vacíos) y el juego usa su valor. Pestañas con valor del código a la vista (Arena, Carrera, Combate, Vida, Formas general) repintan con ese valor; Mesa y Salonas (que solo conocen lo que trae el JSON) dejan el campo apagado con el valor que tenía. Inicio pone el valor del código. Objetos y Formas por forma ya tenían «Volver al valor del código».
- Prueba: `mundo/tests/campo-comun.mjs`.

**B0-V · Vista simple de Vida y Carrera** (rama `claude/b0v-vida-carrera`; Mesa y Salonas, abajo).
- **Perillas** (`estudio/perillas.mjs`, puro): un selector con palabras comunes («lenta, normal, rápida») que mueve uno o varios números en una `ruta` del JSON. `factor` multiplica el valor del juego (con `limites` opcionales); `valor` lo pone tal cual. Si el resultado es igual al del juego, la clave se borra (y en Carrera también los objetos que queden vacíos); un número puesto a mano que no calza con ninguna opción se lee como «a mano (en Avanzado)». Cada pestaña simple que tenga números sueltos puede reusarlo.
- **Vida** (`estudio/vida-simple.mjs`): cada visita se titula en una frase («pony va a ver a lalo de 13:00 a 15:00») y sus horas son campos de hora (13:30; el JSON sigue guardando 13.5). **Partir de una base**: almorzar con un amigo, pasar la tarde, junta en la noche o ir a pasear a un lugar (horario, gesto y frases); **«Copiar para hacer otra parecida»** duplica una visita apagada. **«Lo básico»**: rapidez al caminar, qué tan cerca te sigue quien te acompaña, su fuerza al pelear (daño y aguante), desde qué amistad te acompaña y te saluda al pasar (con el nombre del nivel), largo del día y jugadores en la fogata. En Simple se esconden: los gestos de cada visita, «Si no está», la nota, «Nueva visita» vacía y todos los grupos de números y textos finos (caminar, paseos, seguir, pelea, ajustes, ausente, saludo al pasar, frases del acompañante, horarios, lugares, líneas del panel, asientos, frases y poses de la fogata).
- **Carrera** (`estudio/carrera-simple.mjs`): **«Lo básico»** con vueltas, «qué tan difícil es ganarles» (las tres dificultades del menú juntas: `ia.niveles` × 0,9-1,1, tope 0,4-1,2), rapidez de las gatas (`gata.vel` y `acel`), qué tan fácil se dobla (`gata.giro`), con o sin objetos, el celular (acelera sola o con botón) y el volumen de la música. El plano de la pista, el escenario (nombre, tipo y colores), las gatas (nombre, pañuelo, pelaje, tamaño) y el premio siguen en Simple; los 16 grupos de números (física, derrape y sus 3 niveles, turbos, paredes, IA, cámaras, Lona, música, red, sala), el perfil de alturas, los multiplicadores de cada gata y «Volver a la pista / a todos los valores del código» van a Avanzado.
- Prueba: `mundo/tests/estudio-simple.mjs` (horas, frase, bases y copias contra el esquema de rutinas; cada opción de cada perilla de Vida y Carrera se lee igual, cumple el esquema, la del juego no deja claves y un valor a mano = «a mano»).

**B0-V · Vista simple de Mesa y Salonas** (rama `claude/b0v-mesa-salonas`, apilada sobre la anterior). Las dos solo conocen lo que trae su JSON (B0-C), así que sus perillas toman como base **el archivo tal como llegó** y no borran claves (`perillas.mjs`: `borrarIgual: false`; `disponible` esconde la perilla si el archivo no trae el campo). Fila de perilla común: `filaPerilla` en `campo-comun.js`.
- **Mesa** (`estudio/mesa-simple.mjs`): «Lo básico» con animaciones (sí/no y rapidez), sonido (sí/no y volumen), cartas del mazo, largo del duelo entre jugadores (vida × 0,5-2), si Lucho vende cartas y el precio del sobre. **Cámaras de 3.ª persona desde una base**: cada una se elige como «cerca», «de lado» o «desde arriba» (o queda «a mano»), se quita, y «Agregar cámara» suma una desde la base elegida. En Simple se ven además la colección inicial, los precios de cada carta y los pesos de los sobres (listas de una carta = un número), con el rótulo en palabras (sin la clave del JSON); los demás 29 grupos, los números de cada cámara y «Copiar la última cámara», en Avanzado. Mover la mesa con el gizmo de Posiciones queda **pendiente** (sigue con sus números en Avanzado).
- **Salonas** (`estudio/salonas-simple.mjs`): «Lo básico» con la canción y la dificultad con que parte, qué tan exacto hay que tocar (ventanas de perfecto/bien/ok × 0,8-1,3), qué tan rápido se pierde (energía que baja) y el volumen de la banda y del bajo; los textos ES/EN siguen en Simple. «Juego» y «Reglas» (juicio, partitura, cámara, audio fino…) van a Avanzado.
- Prueba: `estudio-simple.mjs` suma Mesa y Salonas (todas las perillas disponibles, cada opción se lee igual y cumple el esquema, la opción del archivo lo deja igual; las cámaras base se reconocen y cumplen el esquema).

**B0-V · Vista simple de Arena, Objetos, Formas e Inicio** (rama `claude/b0v-arena-objetos`). Las tres primeras conocen el valor del código, así que sus perillas borran la clave al elegir la opción del juego (como Vida y Carrera).
- **Perillas `conjunto`** (`perillas.mjs`): cada opción trae sus propios números (`[clave, es, en, { campo: número }]`, `null` = los del juego). Sirve para una «base» que mueve varios campos a valores distintos (cámaras, rondas).
- **Arena** (`estudio/arena-simple.mjs`): «Lo básico» con rondas (a una, al mejor de 3 o de 5; el tope de rondas va con ellas), largo de cada ronda, cámara lenta del K.O., entrada (rápida, normal, lenta: los cinco tiempos × 0,5-1,5), nieve, **cámara de la pelea** desde una base (normal, cerca, lejos, desde arriba: fov, altura, mira, inclinación y distancias) y **plano del golpe final** (normal, rápido, lento y cerca, quieto de frente), más la vida de cada peleador (× 0,5-2). En Simple se ven además los peleadores (nombre, título, aura y frases) y los textos; estilo, vida, postura y carta de cada peleador, los grupos de números, efectos, peso de los golpes, escenario, público, premios y «Volver a los valores del código», en Avanzado.
- **Objetos** (`estudio/objetos-simple.mjs`): en cada vista, «Tamaño» con palabras sobre el del tipo (o el del código, si se edita un tipo), botones para mover de a 0,02 bloques (subir, bajar, a un lado, más lejos o cerca) y girar de a 15° (inclinar, girar, ladear; el ángulo queda entre −180 y 180), e «Igual que el tipo» (borra el ajuste del objeto). Los 7 números, en Avanzado. Arrastrar en el juego queda **pendiente**.
- **Formas** (`estudio/formas-simple.mjs`): cada caja con ancho, alto y largo (x y z crecen desde el centro, y desde la base; siempre dentro del bloque) y Subir/Bajar; «desde» y «hasta» por eje, en Avanzado. En General, «sube escalones solo» (no, una losa, normal, un bloque entero); el suavizado de la cámara, en Avanzado.
- **Inicio** (casi simple): en Simple se esconden el giro, latido, ritmo y posición de la frase (queda el color), los pesos de las etapas de carga, el tamaño del cuadro de tierra y los tiempos, el tamaño del píxel y los tiempos de la presentación, los ajustes numéricos del fondo de cine y las posiciones de cada plano («Agregar plano», que copia el último, también).
- `estudio.js`: `aplicarVista`, `pintarAyuda` y sus botones salen de `aplicarIdioma` (antes se registraban otra vez en cada cambio de idioma).
- **Mesa con gizmo** (rama `claude/b0v-mesa-gizmo`): en Simple, «Dónde va la mesa» dice dónde queda en palabras (`frasePosicion`) y trae «Mover la mesa» / «Girar la mesa». El juego (`estudio/gizmo-mesa.js`, mensaje `mesa` con `mover` | `girar` | `soltar`) cierra la mesa si estaba abierta, te lleva junto a Lucho y dibuja una copia del mueble con un TransformControls (sin eje Y al mover: la mesa va al suelo de Lucho; al girar, solo Y, de a 5°). Al soltar manda `cambio` con `{ giro, dist, lado }` (`mesaDesdeCentro`, la inversa de `marcoMesa`; giro entre −180 y 180, dist y lado a 0,01). Los números siguen en Avanzado («Mesa»); un cambio en ellos mueve la copia (`sincronizar`).
- **Objetos con arrastre** (rama `claude/b0v-objetos-arrastre`): un gizmo en el juego no calza (en 1.ª persona el objeto va pegado a la cámara y en 3.ª sigue al brazo animado), así que cada vista trae un panel «Arrastra aquí» en el Estudio y el resultado se ve en vivo en el juego. «Mover»: de lado = x, arriba/abajo = y, rueda = más lejos o cerca; «Girar»: de lado gira (y), arriba/abajo inclina (x), rueda ladea (z). Cuánto por px y por muesca, en `objetos-simple.mjs` (`PX_*`, `RUEDA_*`). Los botones de a un paso se quedan para lo fino.
- **Formas con arrastre** (rama `claude/b0v-formas-arrastre`): «Arrastra las cajas» encima de las cajas de cada forma, con dos dibujos de 16×16 (`VISTAS`: desde arriba, x y z con el norte arriba; de frente, x e y). Se toma la caja elegida primero; del medio se mueve (`moverCaja`) y a menos de `BORDE` (0,8/16) de un borde se estira (`estirarCaja`), siempre de a 1/16 y dentro del bloque. Mientras se arrastra solo se redibuja; al soltar se repinta el panel (medidas al día). Un gizmo en el juego no se usó: las cajas son chicas y van dentro de un bloque ya mallado.
- Prueba: `estudio-simple.mjs` suma Arena (cada perilla y la vida de cada uno se leen igual, cumplen el esquema, la opción del juego no deja claves, un valor a mano = «a mano»; la base «cerca» no toca el golpe final), Objetos (mover y girar de ida y vuelta, giro en rango, tamaño, esquema) y Formas (medidas dentro del bloque sin tocar los otros ejes, subir y bajar, perilla de paso, esquema).

## 40. Etapa B · punto 3: motor genérico de escenas (diseño, 2026-10-21)

Solo diseño: nada del juego cambia en este PR. Resuelve los casos de «Qué queda en JS» (§13) para que una bienvenida, un
momento, un reencuentro o un grupo nuevos sean **solo datos** en `escenas.json` y se armen en la pestaña Escenas. El punto 4
de la Etapa B migra los que ya existen con estas piezas.

### Lo que se midió

Todas las escenas de JS ya terminan en el guion de ejecución de §13 (`lineas`, `pista`, `golpes`, `corazones`, `actores`,
`T`, `r` son datos). Lo que es código, por familia (`grep` de `extra`, `yaw`, `pegar`, `caja`, `sprite`, `mover`, `efecto`,
`SONIDOS`):

| Familia | Archivos | Lo que es código |
|---|---|---|
| Bienvenidas | 13 (`bienvenidas/*.js`) | `encadenar` y tiempos derivados (`HB = a(2) + 2.4`); gestos propios (`frotaM`, `sopla`, `salta`, `botas`); `secreto`/`abrazo`/`pareja` corridos (`desplazar` + `pz × 1,7`); un sonido o un efecto en un instante (`cuadro` con bandera); `yaw` en 2; cajas pegadas en 2. |
| Momentos | 13 (`momentos/*.js`) | Tiempos ya absolutos (como `lona.js`); objetos pegados a un hueso o al mundo (`caja`, `sprite`, `pegar`: bufanda, agujas, guitarra) que aparecen, crecen o cambian de textura; `yaw` en 6; efectos. |
| Reencuentros | 1 (`reencuentros.js`, 16 pares) | Dos plantillas (`corto`, `largo`) sobre una tabla de textos (`REENCUENTROS`); `reparto` por personaje; tu clon con `radio`. |
| Grupos | 3 + `comun.js` | Variantes por skin (`VARIANTES`); `ordenar` (relleno en los huecos); `centro`/`colocar` desde la casa de un amigo; caminar (`api.mover` + `api.girar`); objetos en la mano de todos; plano manual (`api.camara`) en 2. |

Casi todo el `extra` es lo mismo repetido: **«en el segundo X suena algo, salta una chispa o aparece algo en la mano»**.
Lo de verdad único (el camino de la concha de Braulio, la nieve de Coyhaique, el plano del salto de la atalaya) es poco.

### Decisiones

1. **El motor sigue tonto y los datos siguen absolutos** (§13, decisión 3). El juego solo lee números ya calculados. Lo
   «relativo» (encadenar frases, «el choque 2,4 s después de la frase 3») lo resuelve **el editor**, no el juego: cada
   tramo, marca, efecto u objeto puede llevar un **`ancla`** opcional que el juego ignora y el editor usa para mover lo que
   depende de una frase cuando esa frase se mueve, se estira o cambia de texto:
   `"ancla": { "frase": 3, "de": "inicio" | "fin", "mas": 2.4 }` (frase = índice en `lineas`; `mas` en segundos, puede ser
   negativo). La paridad sigue exacta porque el número guardado es el que corre.
   - **«Acomodar frases»** (botón, vista simple): cada `a` = fin de la anterior + 0,15 (+ su pausa `antes`), cada `d` =
     `durLinea(texto)` si falta o quedó apurada, y arrastra todo lo anclado. Es `encadenar` hecho una vez, a la vista.
   - Sin `ancla`, el bloque se queda donde está (como hoy).
2. **Variantes = escenas aparte.** Una variante por skin (grupos) o por pareja (el momento de Lona con Venjy) es otra
   escena completa con su propio `dispara`. El editor trae «Duplicar como variante» (copia y cambia solo `dispara.skin`).
   Más archivo, pero cada variante se ve y se ajusta entera, sin reglas para mezclar tiempos.
3. **Plantillas solo para partir, no en el juego.** Los 16 reencuentros se **materializan** en el punto 4: un script corre
   `reencuentro(base, clave)` y guarda cada resultado como una escena. Las plantillas `corto` y `largo` quedan como **bases
   para partir** en «Nueva escena». Así no hay huecos de texto ni tiempos que se calculen al jugar. Lo mismo con las
   variantes de grupo: 7 escenas de Tomatitos, no una con 7 ramas.
4. **Gestos propios a `poses.json`** (se mantiene §13, decisión 4). El esquema de poses ya tiene claves (`ruta`), senos
   (`forma: abs` da los saltitos), `salto` y `pz`: `frotaM`, `sopla`, `salta` y `botas` caben tal cual. Van con el nombre
   de la escena delante (`lalo-botas`) para no chocar. Lo que no cabe (`fusion`, `seguidos`) sigue en `MOLDES`.
5. **Opciones del tramo** (reemplazan `desplazar`, `con` y `espejo` en el caso común): un 4.º elemento opcional
   `[gesto, desde, hasta, { "reloj": s, "escala": { "pz": 1.7 }, "espejo": true }]`.
   - `reloj`: el gesto lee `t − reloj` (lo que hace `desplazar`; los gestos de 6b leen el tiempo de la escena). El editor
     lo pone solo al soltar `secreto`, `abrazo` o `pareja` (= `desde − 0,4`, como `bienvenidas/comun.js`): el dueño no lo ve.
   - `escala` multiplica canales (`abrazoB` = `abrazo` con `pz × 1,7`); `espejo` cambia derecha por izquierda.
   - Sin el 4.º elemento, igual que hoy. El `relleno` de `ordenar` **no** entra: el script del punto 4 guarda los tramos ya
     ordenados.
6. **Quién es quién sin `reparto` por función.** En los datos, `q` (frases, pistas, giros, objetos) acepta `n`, `j`, un
   actor declarado **o la clave de una persona** (`pony`). Al jugar, el motor arma el `reparto` con quién es el amigo y
   cuál es tu skin (lo que hoy hace a mano cada archivo). La misma escena sirve en las dos direcciones.
7. **`dispara`: cuándo corre una escena** (reemplaza los cargadores por archivo). Clave nueva y opcional:
   - `{ "tipo": "bienvenida", "skin": "lalo" }`
   - `{ "tipo": "momento", "persona": "lona", "skin": "venjy" }` (sin `skin`: cualquiera)
   - `{ "tipo": "reencuentro", "personas": ["pony", "salonas"] }` (sin orden)
   - `{ "tipo": "grupo", "grupo": "tomatitos", "skin": "pony" }`

   `bienvenida(base)`, `momento(clave)`, `reencuentro(base, clave)` y `grupo(nombre, base)` **primero buscan en
   `escenas.json`** una escena con ese `dispara` (la más específica gana: con `skin` antes que sin ella) y, si no hay,
   cargan el módulo de JS como hoy. Es la regla de siempre: el JSON reemplaza y el código es la base. Sin `dispara`, la
   escena solo se juega con `/amistad guion` y desde el Estudio (§13, decisión 7). Qué eventos existen (llegar a la
   fogata, amistad 100) sigue en JS; la escena elige a cuál responde.
8. **Lugar del grupo, sin coordenadas fijas.** `lugar` reemplaza `centro` y `colocar` con posiciones relativas al sitio de
   alguien (AGENTS.md: nada amarrado a un punto del mapa):
   `"lugar": { "centro": { "desde": "hadad", "mas": [2.65, 0, -0.5] }, "jugador": { "desde": "centro", "mas": [0, 0, -2.15] } }`.
   `desde` = un actor (su sitio de siempre), `n` o `centro`. Se ajusta con el gizmo de Posiciones (mismo mensaje, punto
   nuevo `escena:<clave>:centro`).
9. **Giros y caminos como claves de tiempo.**
   - `giros: { q: [[t, mira]] }`, con `mira` = `"centro"`, un actor, grados del mundo o `null` (el motor decide, como hoy).
     Entre dos claves, giro suave por el lado corto. Reemplaza `yaw: { q: t => … }` de los archivos que lo usan.
   - `caminos: { q: [[t, a]] }`, con `a` = `"sitio"` (su lugar), `{ "hacia": "nacho", "dist": 1 }` o
     `{ "desde": "centro", "mas": [x, y, z] }`. El motor interpola (con `ruta`), gira al actor hacia donde camina y al
     terminar o saltar lo devuelve (lo que hace `api.mover` hoy). El gesto `camina` lo pone el editor solo en ese tramo.
10. **Objetos, efectos y sonidos de un catálogo cerrado** (reemplazan casi todo el `extra`):
    - `objetos: [{ "id", "dibujo", "tam", "en", "desde", "hasta", "crece", "cambia" }]`
      - `dibujo`: un ícono de `iconos.json` (los pinta el dueño en Píxeles), una entrada de `PIX` (`celular`, `concha`,
        `tomate`) o `{ "caja": [ancho, alto, largo], "color" }`.
      - `en`: `{ "q": "j", "hueso": "brazoD" | "brazoI" | "cabeza" | "cuerpo", "mas": [x, y, z] }` o
        `{ "desde": "centro", "mas": [...] }` (en el mundo). Con hueso, el objeto **sigue a la mano solo** (personaje
        reactivo, CLAUDE.md). `q: "todos"` = uno igual para cada actor (los celulares y tomates del grupo).
      - `desde`/`hasta`: cuándo se ve. `crece: [[t, escala]]` (la bufanda). `cambia: [[t, dibujo]]` (el tomate que pasa a
        Tomás).
    - `efectos: [[t, "chispa" | "corazon" | "humo" | "nieve", { "en": q | "centro", "alto", "tam", "n" }]]`
    - `sonidos: [[t, "golpe" | "visto" | "mar" | …]]` (las claves de `SONIDOS` y `sonidos`).
    - Cada uno una vez, con la regla de `eventos()`: volver atrás con `irA` lo vuelve a permitir (capturas y editor).
    - `golpes` y `corazones` siguen como están (chispa entre las manos + sonido).
11. **Lo de verdad único va por nombre** (salida de emergencia, como los gestos): `"codigo": "concha-braulio"` busca una
    función en un registro `CODIGO_ESCENAS` de JS (cargado con `import()` solo si la escena lo pide). Recibe `api` y **las
    marcas con nombre** de la escena, `"marcas": { "llega": 3.2, "vuelta": 7.8 }`, que el dueño mueve en la línea de
    tiempo: el código no trae números propios. Candidatos hoy: la nieve de Coyhaique, el camino de la concha si `caminos`
    no basta y el plano manual del salto de la atalaya (`api.camara`; §13, decisión 6 deja los planos manuales fuera de
    los datos). Un nombre que no existe es error de `validar`.
12. **Las escenas de skin (`escenas-skin.js`) siguen fuera**: otro motor (humo, iglú, globos propios). Se revisan al
    terminar el punto 4; si para entonces el catálogo cubre lo que usan, se pasan con este mismo formato.

### Forma (claves nuevas en `escenas.<clave>`, tipo `guion`; todas opcionales, solo se añaden)

```
{ "tipo": "guion", "T", "r", "lineas", "pista", "golpes", "corazones", "actores", "camara",   ← como hoy (§13)
  "dispara":  { "tipo": "bienvenida" | "momento" | "reencuentro" | "grupo", … },             ← decisión 7
  "lugar":    { "centro": {…}, "jugador": {…} },                                              ← decisión 8
  "giros":    { "<q>": [[t, mira]] },  "caminos": { "<q>": [[t, a]] },                       ← decisión 9
  "objetos":  [ {…} ],  "efectos": [[t, tipo, {…}]],  "sonidos": [[t, nombre]],              ← decisión 10
  "marcas":   { "<nombre>": t },  "codigo": "<nombre>",                                       ← decisión 11
  "base":     "<clave de la escena de la que partió>" }                                       ← solo el editor
```

En `lineas`, `pista`, `efectos`, `objetos` y `marcas`: `ancla` opcional (decisión 1). En `pista`, el 4.º elemento (decisión 5).
El esquema, `guionDeDatos` y las reglas los escribió B3a (2026-10-21; el juego las ignora hasta B3b). Detalles que B3a fijó: `marcas` acepta un número o `{ t, ancla }`; los efectos y sonidos pueden repetir instante, giros y caminos de un mismo actor no; `ancla.frase` de una frase solo apunta a una anterior; `guionDeDatos` devuelve `personas` (las claves de persona usadas como `q`) para armar el `reparto`.

**B3b (2026-10-22): el juego las lee.** Lo que fijó al programarlo (piezas puras al final de `mundo/datos/escenas.js`, motor en `escena-amistad.js`):
- **Quién es `n`**: bienvenida = `venjy` (el del Inicio); momento = la persona; reencuentro = el otro de la pareja; grupo = de quien parte `lugar.centro` o, si no, el primer miembro que sale en la escena y no es tu skin. Tu skin es `j`; cualquier otra persona usada como `q` entra sola como actor extra.
- **Giros**: la clave vale desde su instante hasta la siguiente (el motor gira suave por el lado corto, como `api.girar`, que sigue mandando). Grados del mundo = el mismo `yaw` de las personas (0 mira a +z). Mientras alguien camina mira hacia donde va, salvo que un giro diga otra cosa.
- **Caminos**: como `ruta()`: antes de la primera clave y después de la última, el punto del extremo; entre dos, línea recta con suavizado (sin A*). `{ hacia, dist }` queda a `dist` bloques (1 si falta) del otro, del lado de donde viene. Al terminar o saltar, todos vuelven (`mover`).
- **Objetos**: un ícono o un PIX es un sprite de `tam` (0,4 si falta); una caja mide `caja × tam`. `crece` escala, `cambia` solo cambia el dibujo de un sprite.
- **Efectos**: sin `en`, entre el amigo y el jugador; `alto` 1,8 si falta; `n` copias separadas 0,3. `humo` y `nieve` son nuevos.
- **Sonidos**: `SONIDOS` de `moldes.js` y los de `sonidos.js` sin argumentos (`golpe`, `nivel`...); el CLI valida con la misma lista.
- **`codigo`**: `CODIGO_ESCENAS` (`supervivencia/codigo-escenas.js`) = nombre → `() => import(módulo)`; el módulo exporta `(marcas) => ({ iniciar, cuadro, terminar })`, el mismo `extra` de los JS. Vacío hasta B4.
- **Paridad**: `mundo/tests/escenas-motor.mjs` corre Lalo y Lona de JS y de `mundo/tests/escenas-paridad.json` con las mismas piezas cada 1/120 s (frases, tramo, u, peso, metas de cada canal, golpes, corazones, sonidos, objetos visibles). Los gestos propios van ahí en formato de `poses.json` (`lalo-frotaM`, `lona-teje`...); `salta` usa `reloj` del tramo para no depender de dónde empieza. Única diferencia: bordes de tramo a menos de 1e-9 s (el JS suma tiempos: 23.200000000000003).

### Reglas nuevas de `validar` (`reglasEscenas`)

- `dispara`: personas, skins y grupos que existen (`PERSONAJES`, `GRUPOS`); **error** si dos escenas tienen el mismo
  `dispara` (no se sabría cuál corre).
- `ancla.frase` dentro de `lineas`; **aviso** si el número guardado no coincide con lo que da el ancla (alguien lo cambió a
  mano en el JSON; el editor lo reacomoda al abrir).
- `giros`, `caminos`, `objetos`, `efectos`, `sonidos`: tiempos crecientes y `< T`; `q` válido (decisión 6); `dibujo`,
  efecto y sonido del catálogo; `hueso` de la lista.
- `codigo`: el nombre existe en `CODIGO_ESCENAS`. Toda escena con `caminos` vuelve al sitio antes de `T` (hoy
  `amistad.mjs` lo comprueba para los grupos).

### Estudio (pestaña Escenas): vista simple

- **«Nueva escena»** pregunta qué es (bienvenida, momento, reencuentro, grupo o suelta), con quién, y **parte de una
  parecida**: las plantillas `corto`/`largo` del reencuentro, una bienvenida de relación 1, 2 o 3, o cualquier escena ya
  hecha. El `dispara` se llena con esas respuestas.
- **Frases como lista** (quién dice qué, ES y EN) con «Acomodar frases»: los tiempos se calculan solos. La línea de tiempo
  queda en «Avanzado».
- **Gestos con nombre común y miniatura** (los de `poses-simple.mjs`); soltar `secreto`, `abrazo` o `pareja` pone su
  `reloj` y sus marcas solo.
- **Objetos**: elegir un dibujo de Píxeles, «¿en qué mano?» y «¿desde qué frase hasta cuál?» (crea el `ancla`). Efectos y
  sonidos: «en esta frase, suena…». Los números finos (`mas`, `tam`) en «Avanzado».
- **Lugar** del grupo: botón «Mover el centro» (gizmo de Posiciones), no números.

**B3c (2026-10-22): el editor.** Modelo puro en `estudio/escenas-b3.mjs` (prueba `mundo/tests/estudio-escenas-b3.mjs`), interfaz en `estudio/escenas.js`. Lo que fijó al programarlo:
- **Anclas**: `sincronizar` tras cada edición (arrastre, campos, texto de una frase): si lo editado tiene ancla, su `mas` se ajusta a donde quedó; luego `normalizar` recalcula todo lo anclado (tramos conservan su duración; un objeto arrastra su `hasta`). Al abrir una escena se normaliza sin pasar por el historial. Borrar una frase suelta las anclas que apuntaban a ella (el número queda) y baja las siguientes. Un elemento anclado que choca con su vecino de fila queda superpuesto: lo marca `validar` (el editor no lo empuja).
- **«Acomodar frases»**: cada `a` = fin de la anterior + 0,15 (la primera se queda), las `d` apuradas suben a `durLinea`, las frases pierden su ancla propia (la cadena manda) y T crece si la última pasa. No hay `antes` (pausa) en el esquema: no se usa.
- **Sonidos con ancla**: el esquema admite un 3.er elemento `[t, nombre, { ancla }]` (solo clave nueva; `guionDeDatos` lo quita y el motor lo ignora) para que «en esta frase, suena…» siga a la frase.
- **Reloj automático**: `relojAuto` pone `reloj = desde − 0,4` a `secreto`, `abrazo` y `pareja` al soltarlos y lo corre al moverlos; un reloj que el dueño fijó distinto se respeta.
- **Variantes**: `variante(escenas, clave, skin)` copia la escena, cambia solo `dispara.skin`, guarda `base` y **quita `revisado`** de los textos (el dueño los revisa de nuevo); no hay variantes de reencuentros ni se repite un `dispara`.

**B4a (2026-10-22): reencuentros.** `estudio/migrar-reencuentros.mjs --escribir` materializa los 16 (decisión 3): una escena por pareja (`reencuentro-pony-salonas`), frases con la clave de la persona como `q`, pistas ya ordenadas y el choque, el saludo secreto y el abrazo como `puno`, `secreto` y `abrazo` con `reloj` (y `escala.pz` 1,7 el abrazo largo). El clon es el actor `c: { clave: "j", radio: 9 }`: la clave `'j'` de un actor se cambia por tu skin en `repartoDe`. Prueba: `mundo/tests/escenas-reencuentros.mjs`.

**B4b (2026-10-22, parcial): bienvenidas.** `estudio/migrar-bienvenidas.mjs` migra Lalo, Andy, Braulio y Moisés (escena `bienvenida-<clave>`, `dispara` bienvenida + skin; `n` es el Venjy del Inicio y `j` tu skin). Sus gestos propios van a `poses.json` con la clave de la bienvenida delante. El tramo `salta` de Lalo usa `reloj` = inicio del tramo. No caben todavía: gestos que extienden un molde, ondas |sen|ⁿ, `yaw` relativo, efectos con ícono y sonidos con argumento (lista en `mundo/PENDIENTES.md` B4b).
- **Nueva escena** (`escenaNueva`): tipo (suelta, bienvenida, momento, reencuentro, grupo), con quién y base: en blanco, `corto`/`largo` (plantillas propias con gestos que ya existen, textos de relleno) o cualquier escena de guion. `Cuándo corre` reusa el formulario para cambiar o quitar el `dispara`.
- **Vista simple**: frases como lista (quién, ES, EN), objetos («¿en qué mano?», «¿desde qué frase hasta cuál?»), efectos y sonidos «en esta frase»; línea de tiempo, zoom, panel del bloque elegido (con su ancla), `tam`/`mas` de objetos y efectos y el lugar del grupo, en Avanzado. `hasta` de un objeto es el número del fin de esa frase (no se mueve solo si esa frase se mueve sin «Acomodar»).
- **No editable aún**: `giros`, `caminos`, `marcas`, `codigo` y `cambia`/`crece` de objetos (siguen en el JSON); el gizmo «Mover el centro» (hoy `lugar` se edita con números en Avanzado); gestos con nombre común y miniatura en el selector.

**B4b resto (2026-10-22): las piezas que faltaban.** Se midió qué piden las 8 bienvenidas que quedaban (Boris, Conejeros, Hadad, Lona, Lucho, Nacho, Pony, Salonas). Todo cabe en el catálogo con 7 claves nuevas, todas opcionales y sin cambiar lo que ya existe; `codigo` no hizo falta.

13. **Un gesto que parte de otro** (`poses.json`, gesto): `"extiende": { "gesto": "maneja", "reloj": 5.95, "espejo": true, "por": { "bDx": canal } }`. Primero corre el gesto base (por nombre: MOLDES, GESTOS_AMISTAD, GESTOS o `poses.json`), con su reloj corrido (`t − reloj`, lo que hacía `desplazar`) y en espejo si se pide; `por` multiplica canales de la base (un número o un canal con claves); al final los `canales` propios reemplazan o agregan. Cubre `manejaB` (maneja + saltito), `ventanaB`, `orejitasJ` (+ paso) y `punoBajo` (el puño de 6b con el brazo más largo mientras se agacha). En el editor es «Partir de un gesto» (vista simple). Un gesto no puede extenderse a sí mismo ni hacer un ciclo (`validar`).
14. **Osciladores con más formas.** `en`: con qué avanza la onda: `t` (segundos, como hoy), `u` (0 a 1 dentro del tramo: un saltito que sube y baja una vez, `sin(π·u)`) o claves `[[x, avance]]` en el reloj del gesto (la onda avanza con suavizado: el empujón de Pony). `pot`: potencia con su signo (`abs` con `pot: 3` da el cabeceo |sen|³ de Salonas).
15. **Pies apoyados solos**: `"apoya": true` en el gesto. Con el cuerpo inclinado (`inc`), las piernas quedan rectas y los pies en el suelo: `pDx = pIx = −inc` e `y = 0,75 · (1 − cos inc)` (`cintura()` de `moldes.js`, rig.md). Se calcula al final y manda sobre esos tres canales (personaje reactivo: lo que se deduce no se pide).
16. **Giro relativo** (escena): `"yaw": { "<q>": canal }`, un canal en el formato de `poses.json` (reloj = tiempo de la escena) en radianes que **se suma** al giro de siempre (mirarse). Es el `yaw` de los JS: Lona se mece ±0,25 rad bailando y Boris y tú miran adelante en el auto (±π/2 con rampas). Distinto de `giros` (decisión 9), que fija hacia dónde mirar.
17. **Efectos con ícono**: el tipo de un efecto puede ser también una entrada de `PIX` (`visto`, `flash`, `gota`, `trazo`...). Opciones nuevas: `mas` [x, y, z] (se suma al punto), `vida` y `vy` (segundos y subida; sin ellas, los del tipo), `en: { "q": "n", "mano": "D" | "I" }` (la punta de esa mano; `alto` se suma, 0 si falta), `cada` + `hasta` (se repite cada tantos segundos hasta ese instante: el dedo que dibuja) y `encoge: [a, b]` (los que salieron se achican hasta desaparecer entre a y b; viven hasta b). `guionDeDatos` expande `cada` en efectos sueltos.
18. **Caja con textura**: un objeto puede dibujarse `{ "caja": [ancho, alto, largo], "pix": "celular" }` (el celular de la selfie, la bolsa de papas) además de `{ caja, color }`.
19. **Sonido con argumento**: `[t, "bajo", { "nota": 2 }]` (las 4 notas del bajo de aire). Sin `nota`, como hoy.

Cada pieza tiene su prueba de paridad en `mundo/tests/escenas-bienvenidas.mjs` (canales cada 1/120 s con tolerancia 1e-9, giro relativo, sonidos, efectos y objetos visibles contra el JS). Un arreglo de paso: en Boris, Venjy de copiloto sacaba el brazo izquierdo y lo cambiaba al derecho solo durante el bache (`ventana` sin espejo); ahora es el derecho todo el rato, en el JS y en el JSON. Las 12 bienvenidas quedan en `escenas.json`; los JS siguen como base hasta B7. **No editable aún** en la pestaña Escenas: `extiende`, `en`/`pot` de los osciladores y `apoya` se ven en Poses solo como JSON; `yaw` de la escena y las opciones nuevas de efectos van en Avanzado como JSON.

**B4c (2026-10-27): momentos.** Se midió qué piden los 13 momentos (15 escenas con las parejas de Lona y de Venjy). Casi todo cabe en el catálogo; lo que se mueve entre manos, crece o lleva textura propia va a `codigo` (un módulo por momento en `mundo/supervivencia/codigo-escenas/`, con sus tiempos como `marcas`). Tres piezas nuevas, todas opcionales y sin cambiar lo que ya existe:

20. **`rapidez` de la escena** (número, 1 a 60): qué tan rápido pasa un actor de un gesto al siguiente. Sin ella, 11 (el de siempre). El dibujo .exe de Conejeros usa 22 (cambios bruscos) y el monito de Moisés 9 (lentos). Antes era una clave del JS que el esquema no conocía.
21. **Interpolación por clave** (`poses.json`): una clave `[t, valor]` puede traer un 3.er elemento (`suave` | `lineal` | `paso`) que manda en el tramo que empieza en ella. Sirve para el choque de puños de Lucho y el brindis de Nacho: sube suave y baja pareja. Además `paso` cambia **desde** el instante de su clave (antes, en el instante exacto, valía todavía el valor anterior): así la cuadrada de `floor(t / 0,4) % 2` (el baile de Andy, el «lag» de Conejeros) coincide con el JS.
22. **Tramos que se pisan**: el motor siempre usó el primero que cubre el instante (`tramoEn`) y `validar` no deja superponer. Nacho tenía la carcajada hasta 13,8 y el brindis desde 13,6: en los datos la carcajada termina en 13,6. Solo cambia su salida suave (13,3 a 13,6 en vez de 13,5 a 13,8) y la entrada del brindis; el migrador lo hace solo con cualquier par que se pise y la prueba excusa esa ventana.

Reparto de lo que había en `extra`: **catálogo** = chispas (`efectos` sin `en`: entre los dos, con `alto` y `mas`), el golpe en el hombro de Conejeros (chispa en la punta de la mano + sonido), la bolsa de papas de Hadad (caja con PIX `bolsa`), la caña de Pony y la espátula y los vasos de Nacho (pegados a la mano). **`codigo`** = el tronco de Boris, el cofre y la concha de Braulio, el dibujo en capas de Conejeros, el sombrero de Lalo, la bufanda de Lona (`freq` de las agujas distinta en la pareja: otro módulo), el monito de Moisés, el filete y el plato de Nacho, el salmón de Pony, las notas de Salonas, el bloque de Venjy y la flor de la pareja. Los números de forma (alturas, tamaños, duraciones fijas de 0,3 a 0,6 s) quedan en el módulo; los instantes están en `marcas`. Gestos con nombre de una bienvenida (`hadad-recibe`, `hadad-pulgar`) llevan `-momento` al final.

Prueba de paridad: `mundo/tests/escenas-momentos.mjs`. Cada 1/120 s compara frases, tramos (u, peso, canales), giro relativo, `rapidez`, golpes y corazones; y, con un mundo de mentira hecho con THREE de verdad, el `extra` del JS contra catálogo + código: mismas chispas y sonidos por cuadro y en los mismos puntos, mismos objetos visibles y, para los del código, la misma matriz de mundo, visibilidad y opacidad en cada cuadro.

**B4d, primera parte (2026-10-27): grupos, Tomatitos.** `estudio/migrar-grupos.mjs` corre `grupo(base)` y guarda una escena por skin (`grupo-tomatitos-<skin>`, 7; `dispara` tipo grupo). Sin piezas nuevas del motor; sí del catálogo: `PIX` suma `tomate`, `tomas`, `tomate-bloque` y `hojas` (`grupos/comun.js` los lee de ahí) y `SONIDOS` suma `mensaje`. Lo que fijó:
- **Quién es `n`**: el que da `amigoDeEscena`: Hadad (el fuego se mide desde él: `lugar.centro` = `{ desde: 'hadad', mas: [2.65, 0, -0.5] }`, `jugador` = centro + `[0, 0, -2.15]`) o Andy cuando tu skin es Hadad. En el JS el ancla era Andy: solo cambia el nombre del papel. Si tu skin es Hadad, Andy o Nacho, la escena declara `actores: { <skin>: <skin> }` para que su NPC no pase a ser tu clon (`repartoDe` cambia por `'j'` a toda persona nombrada que sea tu skin).
- **Objetos** (uno por actor, no `todos`: Conejeros lleva el tomate en la izquierda y se vuelve Tomás con `cambia`, Braulio lleva una concha): celular `tam` 0,2, tomate o concha. El tomate gigante son dos objetos (bloque y hojas) pegados al centro.
- **Efectos y sonidos**: las chispas son `en: <persona | 'centro'>` con `alto`; el brindis son tres chispas con `mas` y `alto` propios. Los instantes que `grupo()` no devuelve se sacan barriendo su `extra` con un mundo de mentira cada milésima (salen de `r2()`, así que redondear a 0,01 es exacto).
- **Paseo de Braulio**: `caminos.j` va a `{ hacia: 'nacho', dist: 1 }` y vuelve a `'sitio'`; `giros.j` mira a Nacho mientras está allá. Diferencia: el JS medía el destino a 1 bloque de un punto 0,4 al oeste de Nacho; el motor mide desde Nacho (≤ 0,4 bloques). No se mide en la prueba (mundo de mentira); `pendiente del dueño`.
- **Gestos**: los de `GESTOS_GRUPO` que usan los Tomatitos van a `poses.json` como `grupo-<nombre>` (`doblaRisa` con `apoya`).
Falta (B4d, segunda parte): atalaya (grúa y plano del ping con `api.camara`, salto en arco, ping) y Coyhaique (dos planos manuales, la bola de nieve y la nieve): van a `codigo` con `marcas`.

**B4d, segunda parte (2026-10-27): Coyhaique.** Tres escenas (`grupo-coyhaique-<skin>`). Pieza nueva:
23. **Clave de actor con lugar**: `actores` acepta `venjy@mina` y `venjy@atalaya` (el Venjy de ese lugar; antes el esquema solo dejaba claves simples). Su papel en la escena es `v`.
Lo que fijó: `lugar` y `caminos` se miden desde el asiento de Moisés (`desde: 'moises'`: el iglú, el túnel por donde entra el Venjy y el sitio donde se para Moisés); Moisés es `n` salvo con tu skin de Moisés (entonces es el actor `moises` y `n` es Lalo). Los dos vuelven a su sitio en 0,05 s al final (el motor lo hacía al terminar; `validar` pide que el último punto del camino sea `sitio`). Los copos son `efectos` de tipo `copo` (`PIX.copo` es el dibujo de siempre) y el golpe, `SONIDOS.bolaNieve`. `codigo` `grupo-coyhaique`: los dos planos manuales de la cámara y la bola de nieve en arco, con `marcas` (`llega`, `tiro1`, `tiro2`); resuelve quién es quién con `api.actor`.
**B4d, tercera parte (2026-10-28): la atalaya.** Tres escenas (`grupo-atalaya-<skin>`). Su centro es el promedio de cuatro puntos (Boris, Lucho, el aterrizaje, que se mide desde el Venjy del mirador, 11 bloques arriba, y tu lugar): ningún `desde` + `mas` lo da. Pieza nueva:
24. **`lugar.centro.promedio`**: `{ promedio: [sitio, …], mas? }` (2 a 8 puntos `{ desde, mas }`). x y z son el promedio de los puntos; la altura, la del primero (el suelo del grupo: así un punto puede partir de alguien que está en alto). `mas` se suma después. Solo para `centro` (`jugador` sigue siendo un `sitio`). `sitioEn(s, base)` de `mundo/datos/escenas.js` lo calcula (puro; `sitioDe` del motor lo usa); `repartirGuion` reparte cada punto; `reglasEscenas` pide que cada `desde` sea un actor; `amigoDeEscena` toma el `desde` del primer punto. El Estudio lo muestra («entre 4 puntos, se edita en el JSON») sin dejar pisarlo.
Lo que fijó: el primer punto es Boris (es `n` salvo con tu skin de Boris: entonces `n` es Lucho y Boris el actor `boris`, como Hadad en los Tomatitos); el Venjy del mirador es el actor `v` (`venjy@atalaya`, decisión 23). Los gestos `miraArriba`, `grita`, `rodilla` y `apunta` de `GESTOS_GRUPO` van a `poses.json` como `grupo-<nombre>`. Sonidos al catálogo (`ping`, `polvo`, `golpe`); `PIX` suma `ping` (el rombo; `grupos/comun.js` lo lee de ahí). `codigo` `grupo-atalaya`: el paseo al borde, el salto en arco (su duración es `suelo - salto`), la grúa (o el primer plano fijo con la línea libre si hay árboles), el polvo al aterrizar (a la altura de Boris: no cabe en `efectos`, que se disparan antes de que el código mueva al Venjy), el rombo del ping, su plano y los giros de todos hacia él. Sin `caminos`: el motor devuelve al Venjy a su sitio al terminar. Doce `marcas` (`asoma`, `plano`, `borde`, `salto`, `suelo`, `giro`, `finPlano`, `mira`, `planoPing`, `ping`, `finPing`, `finMira`); el punto de aterrizaje queda como constante del módulo y como tercer punto del `promedio` (moverlos juntos). La prueba excusa el cuadro que cae justo en una marca (el JS la calculaba, los datos la guardan redondeada).

### Plan (PR chicos)

| PR | Qué | Modelo |
|---|---|---|
| B3a | Esquema (las claves de arriba) + `guionDeDatos` las convierte al guion de ejecución (puro) + reglas nuevas de `reglasEscenas` + pruebas en Node. Sin cambios en el juego. | **Sonnet** |
| B3b | Juego: `dispara` en los 4 cargadores, `reparto` automático, opciones del tramo, `lugar`, `giros`, `caminos`, catálogo de objetos, efectos y sonidos, y `CODIGO_ESCENAS`. Paridad: una bienvenida (Lalo) y un momento (Lona) escritos a mano en JSON dan el mismo cuadro que el JS cada 1/120 s (gestos, `u`, peso, giros, objetos visibles). | **Opus** (toca el motor) |
| B3c | Editor: anclas y «Acomodar frases», «Duplicar como variante», filas de objetos, efectos y sonidos, la vista simple de arriba. | **Sonnet** + Haiku para la prueba de navegador |
| B4 | Script que corre cada cargador de JS y guarda el guion como escena (gestos propios a `poses.json`, tramos ya ordenados, `extra` traducido al catálogo; lo que no cabe, a `codigo`). Una familia por PR: reencuentros → bienvenidas → momentos → grupos. Los JS quedan como base hasta el cierre (B7). | **Sonnet** + Haiku |

**Textos**: los que se migran ya están aprobados (`mundo/DIALOGOS.md`): se copian tal cual y `revisado` lo pone el dueño.
**Carga**: nada nuevo al iniciar; `escenas.json` ya se pide solo al usar una escena.

## 41. Etapa B · punto 5: personajes en datos (2026-10-28)

**Meta**: sumar una persona al juego es solo datos: nombre, cómo se ve, dónde está, a qué hora, qué hace mientras espera,
qué dice en el globo y en «Hablar», qué le gusta y a quién conoce. Se hace desde la pestaña **Personajes** del Estudio,
sin tocar JS. Un solo PR (pedido del dueño).

**Archivo**: `mundo/datos/personajes.json` (`personas.<clave>`, esquema `estudio/esquemas/personajes.schema.json`). Modelo
puro en `mundo/datos/personajes.js` (lo comparten juego, Estudio, CLI y prueba). Campos de una persona nueva:

| Campo | Qué es | Quién lo usa |
|---|---|---|
| `nombre` | Nombre propio (igual en ES y EN) | `NOMBRES_AMIGO`, cartel, globo |
| `apariencia` | Mismo formato que `PERSONAS` de `criaturas/amigos.js`, con colores `#rrggbb` | `pielDe` (`descriptorDe` convierte) |
| `lugar` | Un punto de `posiciones.json` (ancla, dx, dz, giro, dy o `suelo`) | Valor base: si `posiciones.json` trae la clave, gana (gizmo de Posiciones) |
| `postura` | `de pie` · `brazos cruzados` · `manos atras` · `sentado` | Animación genérica de `amigos.js` |
| `horario` | `de`, `a` (0-24) y, si el lugar no tiene nombre conocido, `lugar` {es,en} | Valor base de `HORARIOS`; `rutinas.json → horarios` lo ajusta (pestaña Vida) |
| `globo` | Color de su globo | `COLOR_GLOBO` |
| `frases` | Lo que dice al acercarte | Globo de `amigos.js` |
| `hablar` | `saludo` {bajo, alto}, `temas`, `regalo`, `opiniones`, `gestoRegalo`: formato de `dialogos.json` | `dialogos-datos.js` lo suma; si `dialogos.json` trae la persona, gana ese |
| `regalo` | Objetos favoritos por nombre (como `/dar`) | `FAVORITOS` |
| `amigos` | Relación con cada uno, 0 (no se conocen) a 4 (pareja) | `PARES` (amistad inicial y «¿Qué opinas de…?») |
| `borrador` | No sale en el juego | Todo lo ignora |

**Decisiones**

1. **Base + ajuste, como siempre**: las 13 personas de hoy siguen en su JS. Para los 9 de `amigos.js` el JSON solo
   puede traer `apariencia` (se escribe encima de la del código al crearlos; sus accesorios propios, como el hacha
   de Boris, siguen igual). Pony, Salonas y Lona (`npcs.js`) y Venjy tienen la piel **pintada a mano**: no se cambian
   desde aquí (**no editable aún**; haría falta describirlas con `pielDe` y perder detalle).
2. **Una persona = una entrada**: todo lo suyo en un sitio, para que «sumar a alguien» no obligue a tocar cinco archivos.
   Los textos de «Hablar» usan el formato de `dialogos.json`; si más adelante se pasan a ese archivo, ese gana.
3. **Dónde nace**: `supervivencia/personajes.js` registra la persona en los sistemas que van por clave (nombres,
   globo, amistad, regalos, relaciones, horario) y le pide a `amigos.js` que la cree (`amigos.agregar`). Entra a
   `amigos.lista`, así que rutinas, paseos, acompañante, el panel de misiones y el gizmo de Posiciones la tratan como
   a cualquiera. Sin misiones ni tienda: el panel dice «sin más encargos» y tiene la pestaña «Hablar».
4. **Animación genérica** por `postura` (respira, cambia el peso, mira al jugador cerca, gesto ocioso de vez en
   cuando). Lo propio de cada uno (Boris cortando leña, el bong) sigue siendo código: no se pide para sumar a alguien.
5. **El creativo no cambia**: `crearAmigos` lee `personajes` solo si se lo pasa la supervivencia (`opciones.personajes`).
6. **Carga**: `personajes.json` se pide al importar `main.js` y se espera en la etapa «amigos» (archivo chico, en
   paralelo con el mundo). Sin archivo o con `?sin-datos`, todo como antes.
7. **En vivo** (`?estudio`): las personas nuevas se rehacen al recibir el archivo (`amigos.quitar` + `agregar`); un
   cambio de apariencia de alguien del código se ve al recargar el juego (rehacer su cuerpo perdería sus accesorios).
8. **Validar**: esquema + `reglasPersonajes` (lugar existe, regalo es un objeto, amigos y opiniones de personas que
   existen, horario en orden, temas sin repetir, avisos de lo que se ignora). `posiciones.json` acepta las claves de
   `personajes.json`. `resumen personajes` las lista.
9. **Pestaña Personajes** (grupo «Pantalla y mundo»). Vista simple: elegir persona o «Nueva persona» partiendo de
   alguien parecido (copia su apariencia) o de una base; colores y listas con nombres comunes; vista previa de frente
   y de lado con las mismas pieles del juego; lugar de una lista, horario con dos horas, postura, frases, saludo,
   temas (pregunta y respuesta), regalo favorito y a quién conoce. Avanzado: desplazamiento y giro, tamaño exacto,
   estampado, color de barba, requisitos de los temas, opiniones y gesto al regalo. Para moverla en el mundo:
   pestaña Posiciones (la lista ya la incluye).

**Fuera de B5 (anotado)**: misiones y tienda de una persona nueva (B6: `misiones-datos.js` y `tienda-datos.js` a JSON);
su bienvenida y momento (ya se pueden escribir en `escenas.json` con `dispara`, pero la skin del jugador no existe para
alguien nuevo); su carta del Duelo; charlas de la vida entre amigos (`vida-amigos-datos.js`, punto 4).

## 42. Etapa B · punto 6: misiones, objetos, recetas y tienda en datos (2026-10-28)

Un PR por parte: **6a tienda** (hecho), 6b misiones, 6c recetas, 6d objetos (al final); los lugares con el gizmo de Posiciones, aparte.

**6a · Tienda.** `mundo/datos/tienda.json` ya lo leía el juego (`fijarTienda`); ahora:
- Una persona **nueva** de `personajes.json` tiene su tienda solo con datos: `tiendas.<clave>` con al menos una oferta válida crea `TIENDAS[clave]`, y `textos` (`saludo`, `compraOk`, `ventaOk`, `noAlcanza`, ES/EN) le da la voz; lo que falte usa `TEXTOS_TIENDA`. Las 13 de hoy siguen sumando solo al final (sus textos no se tocan).
- Pestaña **Tienda** (`estudio/tienda.js`, parte pura `estudio/tienda-modelo.mjs`): elegir persona, ver lo que ya vende (en Avanzado), «Partir de» una oferta existente + «Agregar oferta», un objeto por lado en Simple (varios y la misión requerida en Avanzado), «Lo que te compra», «Lo que dice» (personas nuevas). Avisa si la oferta **regala** (mismo cálculo que `mundo/tests/tienda.mjs`, ahora en `mundo/supervivencia/tienda-valor.js`). En vivo con `?estudio` (`tienda` en `DATOS_VIVOS`).
- `validar` avisa de una clave de `tiendas` que no es una de las 13 ni una persona de `personajes.json`.
- Decisión: la tienda de una persona vive en `tienda.json` (no dentro de `personajes.json`): un solo lugar para las 13 y las nuevas. Los textos de `tienda.json` y `indice.json` que dicen «el juego todavía no lo lee» quedan como están (valor del dueño); el esquema ya está al día.
- Pruebas: `mundo/tests/tienda.mjs` (crea la tienda de una persona nueva) y `mundo/tests/estudio-tienda.mjs`.

**6b · Misiones.** `mundo/datos/misiones.json` (esquema `misiones.schema.json`): misiones **nuevas** por id, que `fijarMisiones` (`misiones-datos.js`) suma al final de `MISIONES` (las de hoy no se tocan).
- Tipos: `entregar`, `matar` (`mob`, `n`, `noche`) y `noche`; `visitar` y `hablar` quedan en el código (dependen de lugares fijos). Objetos por nombre (como `/dar`), `kit` opcional (con herramienta prestada `[nombre, 1, amigo]`).
- El id empieza con la clave del amigo y no repite uno del código; una misión incompleta o con un objeto inexistente se ignora entera (el juego usa lo demás). Una persona nueva de `personajes.json` las tiene en su panel (`NOMBRES_AMIGO` ya la conoce); sin misiones va directo a «Hablar».
- Pestaña **Misiones** (`estudio/misiones.js`, parte pura `misiones-modelo.mjs`): elegir persona, «Nueva misión» con tipo y «Partir de» una parecida (id automático), textos ES/EN, qué pide o qué monstruo, premio; kit y herramienta prestada en Avanzado; avisa lo que falta y si el kit pasa de 1/3 del premio (regla de `mundo/tests/misiones.mjs`). Lo incompleto no se manda al juego ni se guarda. En vivo con `?estudio`.
- Controles comunes con Tienda en `estudio/campos-datos.js` (`crearCampos`).
- `validar`: persona desconocida, id que no empieza con el amigo, objetos inexistentes. Pruebas: `mundo/tests/misiones-datos.mjs`, `estudio-misiones.mjs`.

**6c · Recetas.** `mundo/datos/recetas.json` (esquema `recetas.schema.json`): `recetas` (lista) y `fundicion` (entrada -> salida), objetos por nombre. `fijarRecetas` (`recetas.js`) las suma **después** de las de hoy (gana la primera que calza) y no pisa una fundición que el código ya tiene.
- Con forma: `forma` (1 a 3 filas de 1 a 3 letras) + `ingredientes` (letra -> nombre o lista de nombres que sirven); sin forma: `sin` (1 a 9). Una receta mal escrita se ignora entera.
- Pestaña **Recetas** (`estudio/recetas.js`, parte pura `recetas-modelo.mjs`): «Partir de» una receta del código, rejilla de 3×3 con un objeto por casilla (la misma casilla repetida = el mismo ingrediente; las letras se asignan solas), qué fabrica y cuántos; varios objetos por casilla (coma) y las fundiciones, en Avanzado. Avisa si falta algo y si el código ya tiene una igual (esa gana). Lo incompleto no se manda al juego ni se guarda. En vivo con `?estudio`.
- `validar`: objetos inexistentes y letras sin ingrediente. Pruebas: `mundo/tests/recetas-datos.mjs`, `estudio-recetas.mjs`.

**6e · Lugares y construcciones.** `posiciones.json → lugares.<clave> = { x, z, nota? }`: bloque central de una construcción movida (las coordenadas de `/tp` y `/pos`). Claves y tamaños en `CONSTRUCCIONES` (`mundo/datos/posiciones.js`): los seis lugares, `escenario`, `corral-vacas`, `corral-ovejas`. Sin la clave, el juego busca el sitio como siempre.
- **Decisión: coordenadas absolutas, no desplazamiento.** El gizmo da un punto del mapa y el dueño piensa «el molino va aquí»; un desplazamiento desde el sitio automático cambiaría de sentido si el terreno cambia. Las personas siguen colgando de su lugar (relativo), así que se mueven con él.
- **Mover una no corre a las demás**: la búsqueda de cada construcción depende de las anteriores (ES y distancias). Con sitio fijo, la construcción igual busca su sitio automático, lo reserva (ES 4, los lugares lo tratan como plaza) y se arma al final con `armarFijos`, después de liberar las reservas. La prueba `lugares-fijos.mjs` mueve el molino y el escenario y comprueba que los otros siete y el pescador quedan donde estaban.
- **Solo supervivencia y al cargar**: el terreno se arma una vez (y en cada worker), así que no hay movimiento en vivo de la construcción. El gizmo mueve una caja de alambre del tamaño del sitio (solo X y Z, de a un bloque); al guardar, el puente compara `sitiosDe` con `terreno.sitios` y recarga el juego. La altura la pone el terreno (centro del rango del sitio, sobre el agua). El escenario sigue mirando al camino más cercano desde su sitio nuevo. Una partida ya guardada conserva sus ediciones de bloques donde estaban.
- No editable aún: la caseta del pescador (pegada al muelle del lago). El giro, hecho después: §44.
- Misiones: `visitar` con `lugares` (claves de `CONSTRUCCIONES`) y `n` (por defecto todos); `hablar` con `con` (otra persona) y `lugar` opcional; se cumple al abrir su «Hablar» (en el lugar, si lo pide) y se entrega a quien la dio. La de Braulio y la 3 de Lona siguen en el código como estaban. Pestaña Misiones: casillas «Adónde hay que ir» y «Hablar con»; «Cuántos de ellos» y «Dónde», en Avanzado.
- `validar`: construcciones movidas que se pisan, `con` que no es persona, `n` mayor que los lugares. Pruebas: `lugares-fijos.mjs`, `misiones-datos.mjs`, `estudio-misiones.mjs`, `estudio-posiciones-navegador.mjs`.

**6d · Objetos.** `mundo/datos/objetos.json` (esquema `objetos.schema.json`): objetos **nuevos** por clave en minúscula (el nombre de /dar). `fijarObjetos` (`objetos.js`) los registra en `O` y `OBJETOS` con un top-level await al cargar el módulo, así recetas, tienda, misiones, regalos y el guardado ya los encuentran por nombre.
- **Ids sin romper partidas**: el inventario guarda ids numéricos. Cada objeto del JSON trae su `id` fijo entre `ID_DATOS` (1024) y 4095; el Estudio lo asigna con `siguienteId`, que solo sube (borrar no libera el número). Los del código siguen en orden desde 256 y deben quedar bajo 1024 (la prueba lo exige): agregar uno al código no corre a los del JSON. Si un objeto se borra, la pila queda en la partida (se ve «?») y vuelve si se crea otra vez con ese id. Se descartó asignar por orden del archivo (reordenar o borrar corría ids) y guardar por clave (cambiaría el formato del guardado y del cooperativo).
- Campos: `nombre` (ES/EN), `icono` (uno del código; un dibujo de `iconos.json` con la misma clave lo reemplaza) + `color`, `apila`, `comida` + `efecto`, `devuelve`, `combustible`, `encargo`. Lo que necesita lógica (clic derecho, herramienta, armadura, modelo 3D) sigue en `objetos.js`. Una clave del código o de un bloque, un id ocupado o un valor que no vale: se ignora entero.
- Atlas de objetos: 16 filas libres y celdas fijas por id (`ubicarObjetos`), para que los que llegan en vivo no muevan a los demás; `refrescarObjetos` repinta.
- Pestaña **Objetos nuevos** (clave `nuevos`; `estudio/objetos-nuevos.js`, parte pura `objetos-nuevos-modelo.mjs`): «Partir de» uno parecido (copia ícono, color, comida, apila, devuelve), nombre ES/EN (el nombre interno sale del español hasta que se guarda; después queda fijo), «Se ve como» con la vista del ícono, «Cuántos caben», «Se come» y cuánto llena (la saturación se calcula: ×1,2). En Avanzado: saturación, efecto, qué deja en la mano, fuego en el horno, «no se vende», nombre interno y número. Cada cambio hace `fijarObjetos` en el propio Estudio y `refrescarNombres` (Tienda, Misiones y Recetas ya aceptan el objeto) y va al juego en vivo. Lo incompleto no se manda ni se guarda.
- `validar`: clave del código, id repetido o ≥ `siguienteId`, `devuelve` o `color` inexistentes, `efecto` sin comida; aviso si el ícono no es del código ni tiene dibujo. Pruebas: `mundo/tests/objetos-datos.mjs`, `estudio-objetos-nuevos.mjs`.

## 43. Etapa B · punto 7: cierre (2026-10-28)

Validación final y lista de lo que quedó en JS, con su motivo (la lista completa, en `mundo/PENDIENTES.md`, Etapa B punto 7).
- `node estudio/cli.mjs validar --contra HEAD`: sin errores en 30 archivos; solo avisos de `escenas.json` (textos «sin revisar», que marca el dueño, y frases apuradas).
- Pruebas de Node: todas pasan salvo `paridad.mjs` y `cartas-panel.mjs`, que ya fallaban en `main`. `campo-comun.mjs` y `estudio-textos.mjs` estaban desfasadas tras 6a y 6d y se actualizaron.
- No pasó a JSON: el giro de las construcciones y la caseta del pescador (§42, 6e), el mapa por semilla (`mundo-datos.js`), las escenas con código propio (`CODIGO_ESCENAS`, `escenas-skin.js`) y los `*-datos.js` que mezclan texto con funciones.
- Tag `portafolio-v1`: pendiente de confirmación del dueño.

## 44. Construcciones en datos y su giro (2026-10-28)

Pedido del dueño: las construcciones como datos (lista de bloques con rotación), con giro en el gizmo de Posiciones, y después «guardar como construcción» lo que él construye.

- **Formato** (`mundo/datos/construcciones.json`, esquema `construcciones.schema.json`): `construcciones.<clave> = { nombre: { es, en }, bloques: [[dx, dy, dz, "BLOQUE", giro?], …], borrador? }`. Relativo al bloque central; dy 0 = primer bloque sobre el suelo (negativo, cimientos); la puerta mira al sur. El bloque va por su nombre en `B` (`mundo/texturas.js`); `giro` (0 norte, 1 este, 2 sur, 3 oeste) solo en escalones y trampilla abierta. Tope 20000 bloques.
- **Decisión: las nuevas no buscan sitio solas.** Solo se arman si tienen `posiciones.json → lugares.<clave>` (un punto que eligió el dueño); sin él no están en el mundo. Así una construcción a medias no aparece en un lugar al azar, y `borrador: true` la apaga aunque tenga sitio. `sitiosDe(posiciones, propiasDe(construcciones))` las suma con su lista de bloques en `propia`, que es lo que reciben los workers.
- **Decisión: las 9 del código siguen siendo código** (valor base). Pasarlas a lista de bloques perdería lo que depende del terreno (el naufragio baja la quilla hasta el fondo, el iglú abre su pasillo) y no gana nada: el giro y el sitio ya se editan.
- **Giro** (`lugares.<clave>.giro`, 0/90/180/270; 90 lleva la puerta al este): `cuartos`, `girarXZ` y `girarBloque` en `mundo/datos/construcciones.js`, con la misma regla que `puntoAMundo` con yaw. `sitioFijo` cambia ancho y fondo; `armarLugar` envuelve `poner` con el giro alrededor del bloque central (los constructores siguen escritos con la puerta al sur). Gira todo lo que cuelga del lugar: las personas de `posiciones.json` (`resolverAncla` da `yaw` y `gira`; en un lugar también gira el marco `lugar`, alrededor del centro del bloque) y lo que el código pone a mano con `enLugar` (fogata, tocón y posiciones base de `amigos.js`, Venjys, cartel y cama del molino, Chonchon, fondo del iglú). El escenario (mira al camino) y los corrales (portón a la aldea) se orientan solos: no tienen giro (`CONSTRUCCIONES[k].gira`).
- **Estudio** (Posiciones → Construcciones, vista simple): «Girar 90°» (si no estaba movida, toma su centro de hoy); la caja del gizmo gira y lleva una placa roja en la puerta. Las nuevas salen en la misma lista («nueva, sin poner»): «Mover con el gizmo» la pone frente al jugador y «Sacarla del mundo» borra su sitio. Avanzado: X, Z, «Puerta hacia» y nota. Guardar recarga el juego si cambió un sitio, un giro o una construcción nueva con sitio (`lugaresCambiaron` mira los dos JSON).
- `validar`: claves de `lugares` que no son construcción, giro en las que se orientan solas, construcciones que se pisan (con el giro), bloques desconocidos o repetidos y claves de las 9 del código en `construcciones.json`. Prueba `construcciones-datos.mjs`.
- No editable aún: cómo se ve por dentro una construcción nueva (no hay editor de bloques: se crean con «guardar como construcción», que sigue) y la caseta del pescador.
- **«Guardar como construcción» (parte 3), decidido por el dueño 2026-10-28:** zona de hasta 32×32 y 24 de alto; el nombre en español se escribe al guardar (el inglés, después en el Estudio); se guarda en `construcciones.json` solo con `supervivencia.html?estudio` y el servidor del Estudio (jugando normal el botón no aparece); como va en el JSON, en el cooperativo la ven todos (guardar, solo el dueño).
