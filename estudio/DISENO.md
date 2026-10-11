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
   (JS) o, desde la fase 6, a `poses.json`. Nombres válidos = los que el juego resuelve hoy: `GESTOS`, `GESTOS_AMISTAD` y
   `MOLDES`. Los de `poses.json` se suman cuando la fase 6 le ponga `lee` (hoy los 11 también están en el código).
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

**PR 5a · el juego lee `escenas.json` (sin editor)** · rama `estudio-fase5a`
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

**PR 5b · editor de línea de tiempo (pestaña Escenas)** · rama `estudio-fase5b` · depende de 5a
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

**PR 5c · planos de cámara** · rama `estudio-fase5c` · depende de 5a (puede ir antes o después de 5b)
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
