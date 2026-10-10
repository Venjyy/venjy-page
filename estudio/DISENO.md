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
| `poses.json` | 6 poses del atlas de `rig.md` y 11 gestos (`GESTOS` y `GESTOS_AMISTAD.puno`) | Fase 6: el evaluador de gestos |

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
poses       6 poses, 11 gestos · referencia (fase 6)
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
