# Mundo 3D · Pendientes y bitácora

Este archivo es la memoria del proyecto `mundo.html` (Minecraft 3D jugable del portafolio). **Cada chat que cambie algo aquí debe actualizar este archivo**: marcar tareas hechas y añadir una entrada en la bitácora (sección final). Léelo completo antes de empezar.

## Objetivo

Que el mapa del inicio del portafolio (el mismo del minimapa) sea un mundo 3D explorable en modo creativo: caminar, volar, nada más. Sin hambre, vida, inventario ni romper/colocar bloques (por ahora). Debe parecerse lo más posible a Minecraft, solo gráficamente.

Decisiones tomadas: página aparte `mundo.html`, Three.js local en `vendor/`, mapa horizontal por defecto (384×256 celdas) y vertical con `?mapa=v`, texturas 100 % procedurales (sin assets de Minecraft).

## Cómo ejecutar

- `python -m http.server 5510` y abrir `http://localhost:5510/mundo.html` (no sirve con `file://`: tanto `mundo.html` como `index.html` cargan módulos ES). `.claude/launch.json` usa `PORT` y `autoPort`.
- `node mundo/tests/paridad.mjs` para verificar que el mapa 3D coincide con el 2D.
- Depuración en consola: `window.__venjy` = `{ datos, terreno, mundo, jugador, camara, renderer, scene }`. Para ver el mapa sin pointer lock: ocultar `#inicio`, poner `jugador.noclipVuelo = true` y usar `jugador.colocar(x, y, z)`, `jugador.yaw/pitch` y `jugador.actualizar(0)`.
- PR de la Fase 1: https://github.com/Venjyy/venjy-page/pull/3

## Arquitectura

| Archivo | Qué hace |
|---|---|
| `mundo.html` | Canvas, menú de inicio/pausa, HUD. Textos con pares `data-es`/`data-en`. |
| `mundo/mundo-datos.js` | Única fuente de verdad del mapa (la usan `script.js` y el mundo 3D), sin DOM. Devuelve `{ W, H, E, T, F, P, tramos, titulo }`. `F` = 1 en celdas de estructura. **No cambiar el orden de llamadas a `r()` ni las semillas** (1424, 77, 2026) o el mapa deja de coincidir con el 2D. |
| `mundo/texturas.js` | Atlas 8×8 de tiles 16×16 (`PINTORES`), ids de bloque `B`, definición por cara `BLOQUES`, tipo `TIPO` (1 sólido, 2 hoja, 3 agua). |
| `mundo/voxeles.js` | `prepararTerreno` (alturas y materiales por columna), `llenarChunk` (bloques + árboles), `mallarChunk` (culling + AO + vertex colors), `MundoVoxel` (carga por distancia con presupuesto por cuadro). |
| `mundo/jugador.js` | Caminar con colisión AABB, vuelo con doble Espacio, correr, agua básica. |
| `mundo/cielo.js` | Domo de gradiente, sol y nubes de bloques. |
| `mundo/ajustes.js` | Ajustes de pausa, teletransporte y nombre de zona. |
| `mundo/minimapa.js` | Minimapa y mapa grande (tecla M). |
| `mundo/tactil.js` + `tactil.css` | Joystick y botones para móvil. |
| `mundo/gatas.js` | Las gatas Mila y Gala (modelos de cajas con texturas pintadas por código) que deambulan por la Gatera y entran/salen de su casa. |
| `mundo/pintado.js` | Paleta `MC`, tonos y `pintarBitmap`: el bitmap del mapa 2D, puro y sin DOM (lo usa `script.js`). |
| `mundo/brujula.js` | Brújula del HUD. |
| `mundo/worker-chunks.js` | Worker que llena, ilumina y malla chunks fuera del hilo principal (cada uno calcula su propio terreno con la misma semilla). |
| `mundo/online/` | Modo online (opcional, solo si hay sala): `config.js` (URL y clave pública de Supabase), `red.js` (sala, Presence, Broadcast, guardado de bloques), `avatares.js` (otros jugadores), `edicion.js` (romper/poner + hotbar), `online.js` (lobby e integración), `partida.js` (Skywars), `arena.js` (mapa de islas), `schema.sql` (tablas y RLS), `tests/conexion.html` (prueba de red). |
| `mundo/portafolio/` | Portafolio interactivo: `portafolio.js` (puntos de interés, panel por proximidad, páginas, idioma), `carteles.js` (carteles flotantes con PixelCraft), `contenido.js` (lee `index.html`: una sola fuente de textos), `cv-datos.js` (CV en ES/EN), `sobremi.js` (muebles de la casa «Sobre mí»), `bloques.js` (interior de Experiencia, vetas de la mina, soporte de la pantalla del faro), `cuadros.js` (planos con imágenes y marco), `zonas.js` (qué POI crea cada zona), `portafolio.css`. |
| `mundo/main.js` | Escena, render, niebla, bucle, idioma, HUD. |
| `mundo/mundo.css` | Estilo de menús tipo Minecraft (fuente PixelCraft). |
| `vendor/` | Three.js 0.186.1 minificado (~750 KB) y supabase-js 2.117.2 minificado (~220 KB, solo se descarga al entrar a una sala) + licencias. |

Constantes clave (`voxeles.js`): `ESCALA = 4` (1 celda = 4×4 bloques), `FACTOR_Y = 1.5`, `CHUNK = 16`, `ALTO = 80`, `NIVEL_AGUA = 14`. El mundo mide 1536×1024 bloques. Norte = −Z, este = +X (igual que el mapa 2D).

Cómo se arma una columna: la altura sale de interpolar `E` (suavizado bilineal por celda); el material, del tipo `T` de la celda con el borde desordenado. Las celdas con `F = 1` son estructuras: tope exacto `vh(E)` y material de color desde la altura base (`BASE_ESTRUCTURA`). Puentes (`T = madera` sin `F`) se tratan aparte (`ES = 2`).

## Modo online (Supabase)

Solo para pasar el rato con amigos. Sin sala no se descarga nada de Supabase y el mundo funciona exactamente igual que offline.

- **Proyecto Supabase**: `venjy-mundo-online` (plan gratis, región São Paulo). Tablas `salas` y `cambios_bloques` con RLS: el rol `anon` solo puede leer, insertar y actualizar (con restricciones `check` de rango); no hay DELETE directo, solo la función `reiniciar_sala` (security definer). La clave del cliente es la *publishable* (pública por diseño); la service role key nunca va en el repo.
- **Cómo se juega**: en el panel de pausa, «Jugar con amigos»: nombre + código de sala (3-12 letras o números, máx. 8 jugadores). Todos generan el mismo mapa; solo viajan jugadores y cambios.
- **Realtime**: un canal `venjy:CODIGO` con Presence (nombre y aspecto) y Broadcast (evento `m` con `e` = pos, bloque, hola, inicio, golpe, muerte, situacion). Posición a 10 Hz, solo 1 Hz si el jugador está quieto.
- **Bloques**: clic izquierdo rompe, derecho pone, hotbar 1-9 o rueda. Se aplican al instante, se difunden y se guardan en `cambios_bloques` (una fila por posición, gana el último). Quien entra tarde los lee al entrar. El motor aplica las ediciones en `llenarVentana` (`guardarEdicion`/`aplicarEdiciones` en `voxeles.js`), también en los workers.
- **Skywars**: cualquier jugador pulsa «Iniciar partida» (mínimo 2). Todos pasan a la arena (`arena.js`: 8 islas de salida, 8 intermedias con cofres, islotes y una isla central con los cofres buenos), cuenta de 5 s, combate cuerpo a cuerpo (cada cliente decide su daño y su muerte), caer bajo y=-12 es morir, el último en pie gana, 7 s después todos vuelven al mundo. Cofres: clic derecho, botín determinista por (ronda, cofre). Quien entra durante una partida la mira como espectador (`situacion`).
- **Prueba de red**: abrir `mundo/online/tests/conexion.html` desde la red del colegio (HTTPS, WebSocket, Broadcast, Presence).
- **Límites del plan gratis a vigilar**: el proyecto se pausa tras ~7 días sin actividad (se reactiva desde el panel), tope de mensajes Realtime por segundo (~100) y por mes (~2 M), ~200 conexiones simultáneas y 500 MB de base.
- **Sala pública**: botón «Sala pública» (código `PUBLICA`, máx. 8): solo Realtime, no se guarda nada en la base y no se crea fila en `salas`.
- **Celular**: la hotbar se toca para elegir bloque y hay botones ROMPER / PONER (PONER también abre cofres y ROMPER golpea). Pueden afinarse al probarlos en un teléfono real.
- **Controles**: correr con R, Ctrl o doble W (Ctrl+W cierra la pestaña en Windows; además hay aviso de confirmación al cerrar dentro de una sala); Shift agacha en el suelo (lento, baja la cámara y no te deja caer por el borde).
- **Pendiente online**: chat; la arena no oculta el menú de teletransporte; probar con amigos reales desde la red del colegio; limpieza periódica de salas viejas (`select public.limpiar_salas_viejas()` a mano).

## Portafolio interactivo (el mundo como portafolio)

Cada lugar del mundo muestra el contenido real del portafolio: cartel flotante encima y panel al acercarse (~4,5 bloques).

- **Sistema base** (`mundo/portafolio/`): `crearPortafolio` registra puntos de interés con `agregarPOI({ id, x, y, z, cartel, titulo, paginas(idioma), recurso(idioma) })`. El panel se abre al acercarse y se cierra al alejarse. Escritorio: clic izquierdo = página siguiente y derecho = anterior (solo apuntando al objeto, así no rompe bloques), flechas, `E` abre el recurso real (PDF, enlace…), `G` agranda, `L` cambia el idioma. Celular: botones del panel y tocar el texto lo agranda a pantalla completa.
- **Idioma**: sale de `?lang=` / `preferredLanguage` y cambia en vivo con `L` (paneles, carteles y textos de la página).
- **Una sola fuente de contenido**: `contenido.js` hace `fetch` de `index.html` y lee sus pares `data-es` / `data-en` (`texto`, `textos`, `enlace`). Lo que no está en `index.html` (el CV) está en `cv-datos.js`, extraído del DOCX; **si cambias el CV hay que actualizar ese archivo**.
- **Nuevas zonas**: añadir una función en `zonas.js` que llame a `agregarPOI` y devuelva sus destinos de teletransporte `{ clave, nombre: {es,en}, x, y, z, yaw }`; `ajustes.js` los pinta en «Ir a». Si la zona lleva bloques nuevos, crear su `levantar…` (como `sobremi.js`) y llamarlo desde `colocarDecor` en `voxeles.js`; el terreno se nivela en `prepararTerreno` (ES=3 evita árboles).
- **Orden y lugares (según `data-punto` de index.html)**: Inicio → spawn · **Sobre mí → casa roja** · Experiencia → registro (edificio azul) · Habilidades → mina · Proyectos → aldea · Mis gatas → gatera · Contacto → correo · ProcedimientoSeguro → faro. El camino del mapa (`RUTA`) ya recorre ese orden. Los nombres del menú «Ir a» y del HUD salen de index.html (`contenido.nombresZona()`) y cambian con `L`.
- **Regla del contenido**: ante cualquier discrepancia manda el CV (`images/cv/*.pdf|docx`). `index.html` se alineó con el CV (métricas, fechas, ciudades, DigitalOcean). ProcedimientoSeguro está en Experiencia (2D y 3D) aunque el CV todavía no lo incluya; en los atriles del CV 3D se inserta como página 4 leyendo index.html.
- **Zona 0 · Inicio** (hecha): cartel de bienvenida «Sigue el camino · Sobre mí >» frente al punto de aparición.
- **Zona 1 · Sobre mí** (hecha, casa roja del mapa): `terreno.sobreMi` marca la casa roja más cercana a `P.casa`; `amueblarCasa` llama a `levantarSobreMi` (`sobremi.js`) en vez del mobiliario genérico. Dentro (puerta al sur): alfombra roja, atril «CV · Español» a la izquierda (oeste) y «CV · English» a la derecha (este), cada uno con su botón al PDF real; mesa con el **libro de presentación** (párrafos y logros leídos de index.html), **retrato** (`images/Venjy.png`, único retrato que hay) en la pared norte, cartel con el nombre bajo la cumbrera y letrero «Sobre mí» sobre la puerta.
- **Zona 2 · Experiencia** (hecha, edificio azul del registro): `terreno.registro` marca el edificio azul más cercano a `P.registro`; `levantarExperiencia` pone alfombra, libreros y **4 atriles, uno por trabajo** (de izquierda a derecha, igual que en la página: ProcedimientoSeguro, Dafa, El Patio de Lea, Mentor Inclusivo). Cada atril tiene cartel (empresa y cargo) y panel con fecha, descripción, viñetas y stack leídos de `#experiencia .parada`; el de ProcedimientoSeguro lleva además los botones de la app y el sitio.
- **Zona 3 · Habilidades** (hecha, mina): 5 vetas (diamante, oro, redstone, esmeralda, lapislázuli) a lo largo del túnel (`levantarVetas`, `VETAS`), cada una con letrero y panel con las menas de `#habilidades .veta`.
- **Zona 4 · Proyectos** (hecha, aldea): 4 tarjetas colgadas en el muro sur de la casa del centro (PODZOL) con título, descripción, stack y botones a GitHub o al informe, leídos de `#proyectos .obra`.
- **Zona 5 · Mis gatas** (hecha, gatera): 15 cuadros con fotos en las 4 paredes exteriores de la casa naranja (`FOTOS_GATAS` en `zonas.js`). Las fotos están convertidas a JPG pequeños en `images/mundo/` (23 archivos, ~720 KB en total; solo se descargan al acercarse). Cada cuadro muestra nombre y la ficha de Mila o Gala de index.html. Las gatas siguen caminando. Para sumar más fotos, agregar una fila a `FOTOS_GATAS` (el JPG se genera desde la `.jfif` con Pillow, ver bitácora).
- **Zona 6 · Contacto** (hecha, correo): el buzón abre un panel con el gancho, los 3 canales y botones a Email, GitHub y LinkedIn.
- **Zona 7 · ProcedimientoSeguro** (hecha, faro): pantalla al pie del faro con el video `images/procseg/promo.mp4` (se reproduce al acercarse y se pausa al alejarse; el póster se ve mientras carga) y panel con la descripción, rasgos y botones de la app y el sitio.
- **Extras hechos**: carteles «Siguiente: … >» en cada punto del camino, sonido sutil al abrir un panel (respeta el interruptor de sonido de las gatas), paginación automática de los paneles (`paginar` en `portafolio.js`: con el puntero bloqueado no se puede desplazar el texto), varios botones de recurso por panel (hasta 3), el cartel del panel activo se oculta.
- **Pendiente**: flecha de la brújula hacia la siguiente sección; probar en un teléfono real; el video no se reproduce en el celular si el navegador bloquea el autoplay (se ve el póster).

## Estado actual (Fase 1 completa)

- Mapa idéntico al 2D (test de paridad: 0 celdas distintas de 98.304).
- Terreno, mar, playa, nieve, caminos, puentes, árboles (tronco + copa), cultivos.
- Estructuras como losas macizas de color (4–7 bloques de alto).
- Caminar con colisión, saltar, volar (doble Espacio), correr, nadar básico, techo de vuelo a 600.
- Rendimiento: ~72 FPS con distancia 10 chunks; ~1,8 ms por chunk al mallar.
- Menú de inicio/pausa con ES/EN según `preferredLanguage`.

## Por hacer

Marca `[x]` al terminar y registra el cambio en la bitácora.

### Fase 2 · Pulido Minecraft
- [x] Casas con volumen: paredes de tablones, techo del color del mapa, interior hueco, puerta de 2×3 con felpudo a ras del suelo (hecho 2026-10-06). Ventanas de vidrio ya puestas. Techo a dos aguas, chimenea con hogar, cama, librero, mesa con antorcha, cofre y antorchas en las paredes (hecho). La casa naranja de las gatas se deja sin muebles para que ellas circulen.
- [x] Mina: el foso se convirtió en una plaza de piedra a ras del camino y un túnel de 28 bloques con marcos de madera, vetas de mineral y un bloque de oro y otro de diamante al fondo (`colocarDecor`, tipo `mina`). Vías, antorchas y cofre ya puestos.
- [x] Faro: torre de rayas rojas/blancas con linterna de diamante, balcón y puerta, sobre pedestal de piedra (`colocarFaro` en `voxeles.js`).
- [x] Pozo de la aldea (agua, piedra labrada, techo) y buzón del correo (`colocarDecor`). [x] Cajas de la gatera: cajones abiertos de 2×2 por dentro (naranjo y negro). Falta: que las gatas duerman dentro.
- [x] Letras "VENJY" elevadas a 18 bloques (`ALTO_LETRAS`). Cada píxel sigue midiendo 32×32 bloques; Decidido mantener la escala: se leen mejor desde el aire.
- [x] Cielo: domo con gradiente, sol cuadrado y nubes de bloques estáticas (`mundo/cielo.js`). Luna, estrellas, ciclo día/noche de 8 min y nubes móviles ya hechos (`cielo.js`; `cielo.fijarHora(h)`, `cielo.pausado`).
- [x] Niebla y colores: decisión estética cerrada, se dejan como están (cambiar solo si el usuario lo pide). [x] Agua animada ( `animarAgua` en `texturas.js`, 5 cuadros/s).
- [x] Árboles: roble, abedul (1 de cada 4) y pino en zonas altas; el bosquecillo del registro ahora son árboles. [x] Flores (amapola, diente de león, aciano) y pasto alto en cruz (bloques tipo 4, planta). 
- [x] Terreno más suave: ruido de ±0,45 bloques sobre la altura interpolada rompe las curvas de nivel rectas sin tocar las zonas planas (`prepararTerreno`).
- [x] Cultivos: franjas de tierra labrada con trigo (cubo con textura recortada). [x] Trigo en cruz.
- [x] Luz por bloque: cielo y bloque 0-15, antorcha (id 34) y piedra luminosa (id 35), interiores y mina oscuros con luz local. Ver comentarios de `calcularLuz` en `voxeles.js`; los emisores nuevos fuera de un decorado deben registrar su rectángulo en `terreno.zonasLuz`.

### Gatas (Mila y Gala)
- [x] Modelos, pelajes y caminata por la Gatera, con entrada y salida de la casa por la puerta (`mundo/gatas.js`). **Mila**: carey gordita, casi toda negra con poquito amarillo y naranjo, SIN blanco. **Gala**: toda gris, guantes blancos delante, botas blancas detrás, pecho blanco y panza gris.
- [x] Pelajes y proporciones revisados y aprobados por el usuario (2026-10-06). No cambiarlos sin que lo pida.
- [x] Poses (de pie, sentada, echada) con transiciones suaves, acercarse al jugador, maullido y ronroneo sintéticos con WebAudio (interruptor 'Sonido de las gatas' en pausa). 
- [x] Duermen dentro de las cajas de la gatera (salto en arco, 20-60 s; nunca dos en la misma caja).
- [x] Nombre flotante ('Mila'/'Gala') al mirarlas de cerca.
- Limitación: no esquivan árboles ni obstáculos con un buscador de rutas, solo eligen otro destino si algo bloquea; el sombreado de sus caras es fijo respecto al modelo.

### Fase 3 · Jugador y extras
- [x] (hecho) Enlace de entrada desde `index.html` (estandarte/slot "Mundo" o botón en el hero) con `data-es`/`data-en`. Cuidado: la hotbar usa teclas 1–9 y 8/9 ya están ocupadas (`script.js:1256`).
- [x] HUD con nombre de zona cercana. [x] Brújula (`mundo/brujula.js`, casilla 'Mostrar brújula') y opción de ocultar FPS.
- [x] Teletransporte a los puntos clave desde el menú de pausa (hecho) (spawn, casa, registro, mina, aldea, gatera, correo, faro) usando `datos.P` y `datos.tramos`.
- [x] Minimapa en el HUD y mapa grande con tecla M (`mundo/minimapa.js`).
- [x] Ajustes en pausa: distancia de render, FOV, sensibilidad, hora y ciclo (`mundo/ajustes.js`, se guardan en localStorage).
- [x] Controles táctiles (`mundo/tactil.js`). Verificados con eventos simulados; falta probar en un teléfono real.
- [x] Auto-ajuste de distancia de render según FPS (casilla 'Distancia automática'; el slider es el máximo) y casilla 'Mostrar FPS'.

### Técnico / deuda
- [x] Mallado en Web Workers (`mundo/worker-chunks.js`, 1-3 workers): al volar a máxima velocidad el peor cuadro fue de ~21 ms. Sin workers (o si fallan) se malla en el hilo principal.
- [x] Three.js minificado con esbuild (`npx esbuild three.module.js three.core.js --minify --format=esm --legal-comments=none`, sin bundle): de ~2 MB a ~750 KB. Los archivos conservan sus nombres en `vendor/`; la licencia MIT está en `vendor/three.LICENSE`. Para actualizar Three.js, repetir el proceso con el paquete npm `three`.
- [x] `script.js` ahora es un módulo y consume `mundo/mundo-datos.js` + `mundo/pintado.js`: ya no hay generador duplicado. Consecuencia: `index.html` no abre con doble clic (`file://`), necesita servidor o hosting.
- [x] Mapa vertical con `?mapa=v` (y selector en los ajustes). El yaw inicial mira hacia el título en ambos mapas.
- [x] Chunks sin cargar: volando se atraviesan (sin pared fantasma) y caminando la caída se congela hasta que carguen.
- [x] `.claude/launch.json` usa la variable `PORT` con `autoPort: true`.
- [x] Test de paridad reutilizable en el repo (`mundo/tests/paridad.mjs` ejecuta `generarMundo` con un `document` falso y compara el bitmap; 0 celdas distintas).

## Notas para depurar

- El navegador integrado cachea los módulos ES: tras editar, ejecuta `await Promise.all(urls.map(u => fetch(u, { cache: 'reload' })))` y luego `location.reload()`.
- `window.__venjy` incluye también `cielo`, `ajustes` y `minimapa`.

## Convenciones del proyecto (resumen)

- Solo fuente `PixelCraft`; sin emojis como íconos.
- Todo texto visible con par `data-es` / `data-en`.
- Estética Minecraft; nombres y comentarios en español (contexto Chile).
- No leer `respaldo-2026-10-06/`, `.impeccable/review/` ni `centroeventostest/` salvo que se pida.
- Léanse `AGENTS.md`, `PRODUCT.md` y `DESIGN.md` antes de tocar contenido o diseño del portafolio.

## Bitácora de cambios

- 2026-10-07 · **Todas las zonas del portafolio en 3D** (Experiencia, Habilidades, Proyectos, Mis gatas, Contacto y ProcedimientoSeguro): `mundo/portafolio/bloques.js` (nuevo), `zonas.js` reescrito, `portafolio.js` (paginar, varios recursos, sonido), `cuadros.js` (proporción de la foto y video), `carteles.js` (se desvanecen muy cerca), `voxeles.js` (`terreno.registro`, vetas, soporte de la pantalla del faro y su radio de luz), `images/mundo/*.jpg` (fotos convertidas con Pillow: `ImageOps.exif_transpose`, `thumbnail((560, 560))`, calidad 78 a 55 hasta ≤45 KB). Verificado zona por zona en el navegador sin errores de consola.

- 2026-10-07 · **Mundo = portafolio en el mismo orden de la página**: el CV pasa a la casa roja («Sobre mí»), se quita la sala del spawn (`salacv.js` eliminado, nuevo `sobremi.js`), cuadros con imágenes (`cuadros.js`), cartel de bienvenida, nombres reales y orden del portafolio en «Ir a» y HUD (`contenido.nombresZona`, `ajustes.js`), página de ProcedimientoSeguro en los atriles. `index.html` alineado con el CV (agente Haiku, revisado) · `mundo/portafolio/*`, `mundo/voxeles.js`, `mundo/ajustes.js`, `mundo/main.js`, `index.html`.

- 2026-10-07 · **Portafolio interactivo: sistema base y Sala del CV** (rama `feature/mundo-3d-portafolio`): `mundo/portafolio/*` (carteles flotantes, panel por proximidad con páginas, idioma en vivo con `L`, contenido de `index.html` + `cv-datos.js`), Sala del CV construida en `voxeles.js` (`salaCV` en el terreno, decorado `cv`, nivelación del terreno), destinos propios en `ajustes.js` (`destinos`, `irA`), `main.js` (carga el contenido, crea el portafolio y la tecla L), `mundo.html` y `portafolio.css`. Verificado en escritorio y emulación de celular, sin errores de consola.

- 2026-10-07 · **Mejoras online y controles** (rama `feature/mundo-3d-mejoras`): botón destacado «Entrar a la sala de amigos» bajo «Jugar» y sala pública; arreglo del avatar invisible en el mundo normal (la posición podía llegar antes que la presencia: ahora se guarda hasta que aparece); nombre del bloque y pista de controles sobre la hotbar, aviso «abrir cofre» y guía al iniciar Skywars; correr con R, agacharse con Shift (`jugador.agachado`), aviso al cerrar con Ctrl+W en una sala; hotbar táctil y botones ROMPER/PONER (`tactil.agregarAccion`, `edicion.abajo/arriba`) · `jugador.js`, `tactil.js/css`, `mundo/online/*`, `mundo.html`.

- 2026-10-07 · **Modo online** (rama `feature/mundo-3d-online`): proyecto Supabase creado, `schema.sql` aplicado (tablas, RLS, `reiniciar_sala`), supabase-js local en `vendor/`, `mundo/online/*` (salas, Presence/Broadcast, avatares de cajas con piel pintada por código, romper/poner con hotbar y persistencia, arena Skywars con cofres, combate, rondas y espectadores), prueba `tests/conexion.html`. Motor: ediciones por chunk, `cambiarTerreno` para pasar a la arena, `gen` para descartar resultados de workers, ganchos de jugador (`sinVuelo`, `congelado`, `vacio`). Verificado en el navegador con dos clientes reales y uno simulado: presencia, posiciones, bloques, entrada tardía, cuenta, golpes, cofre, caída al vacío, fin de ronda y vuelta al mundo.

Formato: `AAAA-MM-DD · qué se cambió · archivos · por qué / notas`. Lo más reciente arriba.

- 2026-10-06 · **Three.js minificado** (`vendor/three.module.js`, `vendor/three.core.js`): ~2 MB a ~750 KB, mismos nombres de archivo, verificado en mundo horizontal y vertical.
- 2026-10-06 · **Casas, mina, terreno y worker (rama `feature/mundo-3d-fase-4`)**: techo a dos aguas con chimenea, cama, librero, mesa, cofre y antorchas (`amueblarCasa`, `casas` en el terreno), vías y cofre en la mina, ruido de altura, bloques 36-40 (ladrillo, librero, cofre, cama, riel), `worker-chunks.js` con `procesar()`/`iniciarWorkers()` en `MundoVoxel`, yaw inicial hacia el título · `mundo/voxeles.js`, `mundo/texturas.js`, `mundo/worker-chunks.js` (nuevo), `mundo/main.js`.
- 2026-10-06 · **Luz por bloque** (`voxeles.js`, `texturas.js`): luz de cielo y de bloque con antorchas y piedra luminosa; la linterna del faro ahora es piedra luminosa tras vidrio.
- 2026-10-06 · **Tanda de pendientes (rama `feature/mundo-3d-fase-4`)**: gatas durmiendo en cajas y nombres flotantes (`gatas.js`); brújula, vuelo sin paredes fantasma, mapa vertical `?mapa=v`, `launch.json` con `PORT` (`brujula.js`, `jugador.js`, `ajustes.js`, `main.js`, `mundo.css`, `.claude/launch.json`); generador deduplicado: `script.js` es módulo y usa `mundo-datos.js` + `pintado.js` (`script.js`, `index.html`, `mundo/tests/paridad.mjs` reescrito).
- 2026-10-06 · **Poses y sonido de las gatas, auto-ajuste de distancia, agua animada** · `mundo/gatas.js` (poses, `silenciar`), `mundo/ajustes.js` (casillas auto, FPS y sonido; `aplicarDistanciaAuto`), `mundo/main.js` (`autoAjustar`, animación del agua, `window.__venjy.auto` para depurar), `mundo/texturas.js` (`animarAgua`).
- 2026-10-06 · **Mina, cajas y plantas**: plaza y túnel de la mina, cajas abiertas, flores, pasto alto y trigo en cruz · `mundo/voxeles.js` (nuevo tipo de bloque 4 «planta», mallado en cruz, `HUECO` 5/6 para cajas, decorado `mina`), `mundo/texturas.js` (ids 30-33, trigo nuevo). Los troncos de árbol reemplazan plantas.
- 2026-10-06 · **Gatas Mila y Gala**: modelos y pelajes hechos con código, caminata por la Gatera y entrada/salida de su casa · `mundo/gatas.js` (nuevo), `mundo/main.js` (crearGatas, `window.__venjy.gatas`), `mundo/voxeles.js` (exporta `BASE_ESTRUCTURA`). Nota: el PR #4 se fusionó en la rama del PR #3 y no en `main`, así que `main` aún no lo tiene; esta rama se creó sobre `feature/add-joaquin-salinas`.
- 2026-10-06 · **Actualización grande (PR de la rama `feature/mundo-3d-fase-2`)**: ventanas de vidrio; trigo; pozo y buzón; bosquecillo como árboles; abedules y pinos; ciclo día/noche con luna, estrellas y nubes móviles; ajustes de pausa; teletransporte; nombre de zona en el HUD; minimapa con mapa grande (M); controles táctiles; enlace en el pie de `index.html` · archivos: `mundo/{texturas,voxeles,cielo,main,ajustes,minimapa,tactil}.js`, `mundo/{mundo,tactil}.css`, `mundo.html`, y `index.html`/`script.js`/`style.css` (solo el botón del pie, ícono `portal` y estilos `.boton-portal`) · Pendiente destacado: mina, cajas de la gatera, luz interior, flores, mallado en worker.
- 2026-10-06 · **Fase 2 parcial**: casas huecas con puerta, faro, letras elevadas, cielo con sol y nubes · `mundo/voxeles.js` (capa `HUECO`, `colocarFaro`, `ALTO_LETRAS`, `faro` en el terreno), `mundo/cielo.js` (nuevo), `mundo/main.js` (integra el cielo; `camara.far = 2000`) · Piso de las casas a ras del suelo para entrar caminando. Pendiente: mina, pozo/buzón/cajas, ventanas, luna, cultivos.
- 2026-10-06 · **Fase 1 completa**: página `mundo.html`, generador sin DOM con paridad exacta, conversión mapa→bloques por chunks (culling + AO), texturas procedurales, árboles, jugador creativo (caminar/volar), menú ES/EN. Archivos: `mundo.html`, `mundo/*`, `vendor/*`. Mapa 2D e `index.html` sin tocar. PR #3.
- 2026-10-06 · Se subió el techo de vuelo de `ALTO + 120` a 600 · `mundo/jugador.js` · para poder ver el título desde arriba.
- 2026-10-06 · Se creó este archivo · `mundo/PENDIENTES.md`.
