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
- **Sliders por canal** con los rangos de `rig.md` (los 14 canales del esquema), **curva por canal** con claves que se arrastran
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
- **No editable aún**: los acordes propios de un tema (`acordes`: el selector arma 12 × 12 por nombre, que cubre casi todo; se pueden escribir en el JSON) y el eco de cada reproductor. Los temas del mundo siguen como funciones en `musica.js` hasta que el dueño haga y aplique su versión con capas.

## 25. Pestaña Vida: cómo caminan los amigos (6d etapa 2, 2026-10-14)

- **Qué edita**: `mundo/datos/navegacion.json` (esquema `navegacion.schema.json`, fase 14 en `indice.json`). `caminar` ajusta `NAV_BASE` de `mundo/navegacion.js` (velocidad, subida, caída, alto, costos de subir/bajar/agua, codicia, nodos por cuadro y por búsqueda, llegada, atasco, reintentos, salto lejos, radio de detalle, giro, suavizado); `paseo` ajusta `PASEO_BASE` de `mundo/supervivencia/paseos-datos.js` (balanceo, acomodarse, reintento a la vista, distancia de visita, mirar al jugador). Vacío = el código.
- **En vivo**: mensaje `datos` con `navegacion` → `fijarPaseo` (la próxima búsqueda y el próximo paso ya usan lo nuevo). **Probar**: mensaje `caminar { persona, destino }` (`aqui`, `sitio`, otra persona o un lugar; destino vacío = solo preguntar) → `__venjy.paseos`; responde `paseo` con el estado (`buscando`, `caminando`, `alla`, `volviendo`, `acomodando`, `sin-camino`, `en-sitio`) y lo que falta.
- **Editor** (`estudio/vida.js`): dos grupos de números con rango (los mismos campos que el esquema y el código: lo comprueba `mundo/tests/navegacion.mjs`), «Volver a los valores del código», y arriba persona + destino (personas y anclas de `posiciones.json`, más molino y portal) con Caminar, Volver a su sitio y ¿Cómo va?. Guardar con If-Match.
- **Destinos (2026-10-14)**: `caminar.aceptable` (un parcial que termina tan cerca ya llegó), `caminar.radioPisable` (destino dentro de una construcción → el punto pisable más cercano) y `paseo.reintentosVista` (reintentos a la vista, con espera doble cada vez).
- **Rutinas (PR 2 de 6d etapa 2, 2026-10-14)**: la misma pestaña edita también `mundo/datos/rutinas.json` (esquema `rutinas.schema.json`, fase 14). Una tarjeta por visita (quién sale, a ver a quién o a qué lugar, hora de llegada y de irse con paso de 15 min, activa, gesto con lista de los de `moldes.js` y frase ES/EN al llegar y de quien recibe, nota; «Probar ahora en el juego», «Cortar y volver», «Quitar»), «Nueva visita» para la persona elegida arriba, `ajustes` (`RUTINA_BASE`: revisar, duración del gesto y los globos, respuesta, giro de cabeza de quien recibe (`girar`, `cuello`), radio del saludo, salir antes según la distancia, rodeo y segundos por hora), horario de cada amigo (su panel), nombres de lugar y las líneas del panel (`TEXTOS_RUTINA`). Un solo **Guardar** escribe los dos archivos (cada uno con su ETag). En vivo: mensaje `datos` con `rutinas` → `rutinas.fijar`; probar: mensaje `rutina { accion: 'probar' | 'cortar' | 'estado', visita?, persona? }`. `caminar.rapidezLejos` (nuevo): lejos del jugador caminan más rápido para que las visitas entre lugares lejanos quepan en el día.
- **PR 3 de 6d etapa 2 (2026-10-14)**: «Rutinas: te saludan al pasar» (gesto y frases ES/EN de `incluir`: yendo, de visita, de vuelta, a un lugar; `{quien}`), ajustes `nivelIncluir`, `radioIncluir`, `esperaIncluir`, y en Caminar `pisarHojas` (0 = rodean hojas y vallas). En vivo con el mismo mensaje `datos`.
- **No editable aún (rutinas)**: qué cuenta como «no puede salir» (escena, ronda del iglú, minijuego, jefe: `libre` en `main.js`) y que no se visita a quien no está en su sitio.
- **No editable aún**: qué bloques cuentan como sólidos o líquidos (salen de `TIPO` de `texturas.js`) y la animación de caminar (`caminar()` de `cuerpo.js`, salvo el balanceo).
