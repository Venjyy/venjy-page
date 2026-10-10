# Mapa del código · mundo 3D y supervivencia

Hecho a partir de las cabeceras (primeras líneas) y de grep sobre `main` (`cc03834`). Formato:
`archivo` (líneas) — qué hace · `función:línea`. Actualízalo en el mismo PR que mueve o agrega módulos.
Estado, tareas y decisiones: `mundo/PENDIENTES.md` (solo la sección en curso).

`mundo/` es el portafolio 3D ya terminado (no se le harán más cambios); el desarrollo activo es
`mundo/supervivencia/`. Base compartida del creativo en `mundo/*.js` (`voxeles`, `luz-incremental`, `texturas`, `jugador`, `cielo`, `gatas`,
`construcciones`, `minimapa`, `ajustes`, …); red en `mundo/online/` (`red.js`, `sala-local.js`,
`qr.js`, `config.js`). Aquí solo `mundo/supervivencia/` y `mundo/criaturas/`.

## supervivencia/ · núcleo y sistemas

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `main.js` (1160) | Arranque, menús, cableado de todos los sistemas y bucle. `aplicarIdioma:82` `pintarMenu:199` `hospedarMundo:271` `jugar:387` `iniciarJuego:397` `arrancar:408` `estadoActual:926` `guardarYa:944` `bucle:1087` |
| `guardado.js` (150) | Hasta 5 mundos en IndexedDB `venjy-supervivencia`. `listarMundos:42` `cargarMundo:49` `guardarMundo:50` `borrarMundo:51` `serializarEdiciones:60` `cargarEdiciones:72` `descargarMundo:98` `guardarCopiaConTope:121` (copia del coop con tope, almacén inyectado) |
| `vida.js` (218) | Vida, hambre, aire, daño y armadura. `crearVida:23` |
| `inventario.js` (173) | Datos puros: 36 casillas, armadura, mano. `Inventario:12` `clicCasilla:149` |
| `objetos.js` (346) | Registro de bloques y objetos. `OBJETOS:15` `MATERIALES:75` `info:237` `tiempoRomper:256` |
| `recetas.js` (159) | Recetas con y sin forma, fundición. `RECETAS:16` `buscarReceta:122` `FUNDICION:152` |
| `ui-inventario.js` (494) | Ventanas: inventario, mesa 3×3, horno, cofre. `crearVentanas:22` |
| `hud.js` (169) | Barra rápida, corazones, hambre, mensajes. `crearHUD:39` |
| `iconos.js` (431) | Íconos 16×16 y cubos isométricos. `crearAtlasObjetos:328` `icono:379` |
| `minado.js` (432) | Romper, poner y usar bloques. `crearMinado:53` |
| `contenedores.js` (164) | Cofres, barriles y hornos por posición. `crearContenedores:15` |
| `botin.js` (30) | Tablas de botín por lugar. `botinDe:21` |
| `agricultura.js` (146) | Cultivos y brotes por registro. `crearAgricultura:26` |
| `entidades.js` (215) | Objetos tirados; se juntan los iguales a < 1 bloque también al soltar (7b-1). `crearEntidades:69` |
| `particulas.js` (95) | Partículas con un InstancedMesh. `crearParticulas:11` |
| `dia.js` (41) | Día de 10 min. `crearDia:15` |
| `subsuelo.js` (188) | Roca madre, cuevas, lava, menas. `llenarSubsuelo:128` |
| `desplazado.js` (41) | Vista con el mapa subido `dy` para las criaturas. `vistaDesplazada:20` |
| `mano.js` (199) | Mano en primera persona. `crearMano:57` |
| `camaras.js` (327) | Cuerpo del jugador, 3.ª persona (F5) y cámara de cine. `crearCamaras:30` |
| `skin.js` (245) | Skin del jugador y editor. `skinPorDefecto:32` `crearModelo:53` `crearEditorSkin:110` |
| `sonidos.js` (104) / `musica.js` (299) | Efectos y música sintetizados con WebAudio. `sonidos:63` · `crearMusica:228` |
| `interpolacion.js` (66) | Búfer de red a 2-5 Hz. `Bufer:14` `mezclar:61` |
| `tactil-supervivencia.js` (70) | Botones táctiles; etiquetas y layout salen de `mundo/datos/` (`textos.json`, `ui-layout.json`) con el código como defecto. `aplicarDatosVivos:28` (Estudio, sin recargar) `iniciarTactilSupervivencia:36` |
| `layout-datos.js` (112) | Estudio fase 1: genera un `<style id="layout-datos">` desde `ui-layout.json` solo con las claves presentes. `cssLayout:88` `aplicarLayout:97` |
| `consola.js` (176) / `comandos-dev.js` (345) | Consola T o `/` y comandos de desarrollo (`/gamemode devenjy`). `crearConsola:40` · `crearComandosDev:95` |
| `medir.js` (182) | 7b-1: `/medir romper [captura]` (devenjy, con `import()`): rompe 6×6×3 a 4 bloques/s en campo, campamento y base con antorchas; cuadro p50/p95/p99 y ms por fase (`marcar` de `voxeles.js`). `medirRomper:45` |
| `creditos.js` (35) | Créditos al hundir el Caleuche. `mostrarCreditos:13` |

## supervivencia/ · combate, mundo vivo y jefes

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `combate.js` (135) | Golpe con carga, crítico, arco. `crearCombate:16` |
| `proyectiles.js` (128) | Flechas y bolas de fuego. `crearProyectiles:17` |
| `enemigos.js` (637) | Zombi, esqueleto, araña, creeper, Trauco. `RETROCESO` `empujar` `suavizarVelocidad` (knockback, 7a) · `crearEnemigos:213` |
| `jefes.js` (579) | Imbunche y demás jefes en altares. `crearJefes:34` |
| `ganado.js` (231) | Caza y cría sobre `criaturas/animales.js`. `crearGanado:35` |
| `pesca.js` (120) | Caña y boya. `crearPesca:22` |

## supervivencia/ · amigos, misiones y escenas

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `misiones-datos.js` (244) | 3 misiones por amigo y 3 jefes. `MISIONES:23` `JEFES:219` `TEXTOS_VENJY:240` |
| `misiones.js` (499) | Panel de cada amigo y misión activa. `crearMisiones:38` `cumplida:114` `aceptar:273` `completar:284` `hablar:321` `hablarVenjy:343` |
| `tienda-datos.js` (215) / `tienda.js` (136) | Ofertas por amigo · pestaña «Tienda». `TIENDAS:17` · `crearTienda:21` `comprar:110` `vender:123` |
| `amistad.js` (196) | Lógica pura 0-100 y 5 niveles. `PERSONAJES:15` `NIVELES:17` `relacion:52` `nivelDe:66` |
| `hablar.js` (332) | Pestaña «Hablar»; carga por `import()`. `crearHablar:38` `abrir:184` `regalar:282` `actualizar:316` |
| `dialogos-datos.js` (365) | `TEMAS:22` `OPINIONES:227` `SALUDOS:330` `REGALOS:349` |
| `venjys-datos.js` (338) | 7f-1: lo que dicen los Venjy en la supervivencia: pistas, brújula, progreso, skin, amistad, carta, hora, chistes; `crearSelector` (`import()` al primer globo). `brujula` `progreso` `amistadFrase` `paraDe` `crearSelector` |
| `escenas-datos.js` (174) | Diálogos de las escenas de skin. `CORTAS:12` `VENJY:68` `IGLU:162` |
| `escenas-skin.js` (626) | Escena al acercarte con skin de un amigo. `crearEscenasSkin:90` `iniciar:187` `terminar:254` |
| `escena-amistad-datos.js` (183) | Animaciones por nivel. `ANIMACIONES:20` `GESTOS_AMISTAD:55` `FRASES_AMISTAD:105` |
| `escena-amistad.js` (537) | Motor de guiones de amistad, bienvenidas y reencuentros. `crearEscenaAmistad:68` `iniciar:213` `terminar:265` `aplicar:313` |
| `moldes.js` (158) | Piezas de movimiento 6c. `ruta:29` `MOLDES:40` `molde:82` `fusion:91` `espejo:108` |
| `reencuentros.js` (226) | Escenas entre amigos 6c-1. `REENCUENTROS:23` `reencuentro:212` |
| `bienvenidas/*.js` (13 archivos) | Guion del Venjy del Inicio por amigo; `comun.js` trae piezas (`encadenar:18` `abrazo:36`). Cada uno: `LINEAS` y `bienvenida` |
| `momentos/*.js` (12 archivos) | «Momento especial» a amistad 100, uno por personaje: `LINEAS` y `momento` |
| `escenas-gatas.js` (497) | Primera caricia a Mila/Gala con skin Lona o Venjy. `crearEscenasGatas:305` |
| `caricias.js` (290) | Caricias a las gatas (tecla G). `crearCaricias:47` |
| `escena-cuello.js` (300) | Misión lona3, el cuello de Gala. `crearEscenaCuello:45` |
| `escena-guardian.js` (334) / `cofres-companeros.js` (175) | Cofres de amigos que ya no están y su guardián. `crearEscenaGuardian:66` · `crearCofresCompaneros:53` |
| `recorrido-escenas.js` (131) | `/escenas` y `/escena <nombre>`. `crearRecorridoEscenas:32` |
| `ronda-iglu.js` (687) | Sentarte con Lalo y Moisés (G). `crearRondaIglu:102` |
| `minijuego.js` (285) | Marco: intro, juego, final. `crearMinijuegos:27` |
| `minijuego-lena.js` (310) / `-pesca.js` (250) / `-asado.js` (338) | Hachas con Boris · pesca con Pony · asado. `crearLena:36` `crearPescaPony:33` `crearAsado:47` |
| `minijuegos-datos.js` (201) | Textos ES/EN. `TXT_MJ:11` `LENA:28` `PESCA:69` `ASADO:164` |

## supervivencia/ · cooperativo y panel QR

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `coop.js` (763) | Hasta 8 jugadores por WebRTC en estrella. `hospedar:118` `unirse:133` `hospedarLocal:169` `unirseLocal:180` `guardadoDeInvitado:198` `crearCoop:211` `actualizar:706` `salir:733` |
| `ui-qr.js` (86) | Panel QR para jugar sin internet. `crearPanelQR:15` |

## Estudio · editor y datos (fases 1 y 2)

Servidor, editor y CLI en `estudio/` (no se publica); datos que lee el juego en `mundo/datos/`. Diseño y contratos: `estudio/DISENO.md`.

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `mundo/datos/cargador.js` (58) | Navegador: `cargarDatos:21` (fetch con tope 3 s, caché, `?sin-datos`), `fusionar:46`, `texto:55` |
| `mundo/datos/*.json` | Contenido nuevo: `ui-layout`, `textos` (los lee el juego), `posiciones` y `poses` (referencia); `indice.json` dice quién lee qué |
| `estudio/servidor.mjs` (249) | `node estudio/servidor.mjs [--lan] [--log]`: estáticos con ETag, `PUT /api/datos/<nombre>` y `GET /api/eventos` (SSE: `cambio <nombre>`). `crearServidor:85` `iniciar:232` |
| `estudio/formato.mjs` (39) | `formatear(obj)`: el formato estable de los JSON |
| `estudio/validar.mjs` (95) | `validar(datos, esquema)`: subconjunto de JSON Schema sin dependencias |
| `estudio/cli.mjs` (293) / `fuentes.mjs` (111) | `resumen`, `validar` y `capturar` (delega en `capturar.mjs`); fuentes JS `dialogos`, `tienda`, `amistad` |
| `estudio/capturar.mjs` (180) | `capturar layout\|pose\|gesto\|escena`: servidor propio + Playwright. `aparatoDe:29` `capturar:110` |
| `estudio/playwright.mjs` (109) | Dónde está Playwright y un navegador: `cargarPlaywright:34` `buscarChromiumLocal:68` `lanzarNavegador:90` `abrirNavegador:106` |
| `estudio/puente-protocolo.js` (57) | Canal `venjy-estudio`, `DATOS_VIVOS`, `crearManejador:22` (mensajes `hola`, `datos`, `tp`; sin DOM) |
| `estudio/puente-juego.js` (100) | Lado del juego, solo con `?estudio`: abre/crea el mundo «Estudio», `/tp` por la consola, SSE |
| `estudio/puente-cliente.js` (67) / `juego.js` (98) | Lado del Estudio: `crearCliente:11`; pestaña Juego (iframe, `/tp`, aplicar archivos) |
| `estudio/avisos-layout.js` (26) / `evaluar.mjs` (35) | `calcularAvisos` (choques, chicos, fuera); `evaluarGesto` de `poses.json` (referencia) |
| `estudio/index.html` · `estudio.js` (72) · `estudio.css` | Cáscara: idioma ES/EN, estado del servidor, pestañas (Layout y Juego), cliente del puente |
| `estudio/layout.js` (578) | Editor de layout: asas, panel de campos, avisos, guardar; manda cada cambio al juego. `APARATOS:50` `montarLayout:65` |
| `estudio/vista-tactil.html` (87) | Capa táctil real sin el mundo (iframe del editor); recibe `{tipo:'layout'}` y `{tipo:'seguro'}` |

## criaturas/ · base compartida con el creativo

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `cuerpo.js` (597) | Texturas, cuerpo de cajas, nombre y globo. `textura:43` `lerp:14` `angulo:16` |
| `pieles.js` (227) | Pieles a partir de una descripción. `pielDe:19` `agregarExtras:187` |
| `npcs.js` (857) | Amigos reales como personas de cajas. `crearNPCs:223` |
| `amigos.js` (871) | Más amigos en los lugares. `PERSONAS:23` `crearAmigos:85` |
| `venjy.js` (581) | Venjy en persona. `VENJY:16` `crearVenjys:99` |
| `animales.js` (630) | Granja y manadas. `crearAnimales:360` |
| `charla.js` (34) | Conversaciones de grupo. `crearCharla:9` |
| `bajo.js` (251) | Bajo de Salonas (WebAudio). `RIFFS:15` `crearBajo:62` |

## Flujos clave

**Bucle (`main.js:1087`)**: `bucle` pide el siguiente cuadro, calcula `dt` (tope 0,1 s) y `corre` (jugador
activo o UI abierta, o coop, y no muerto). Con el mundo corriendo: `dia` → `jugador` → `vida` → `minado`
→ `entidades` → (si no es invitado) `contenedores` y `agricultura` → `combate`, `pesca` → `ganado`,
`enemigos`, `jefes`, `proyectiles`, `particulas`, `mano`. Luego `coop`, cofres, escenas
(`escenaGuardian`, `escenas`, `caricias`, `escenasGatas`, `escenaCuello`, `minijuegos`, `escenaAmistad`),
`camaras`, `ronda`, música, criaturas (`gatas`, `npcs`, `animales`, `amigos`, `venjys`), `misiones`,
`hud`, minimapa y `renderer.render`. En pausa el mundo se detiene; online nunca.

**Romper y poner (motor, 7b-1)**: `minado.romperBloque` → `mundo.editar` → `editarLote` → en la
supervivencia `editarRapido` (`voxeles.js:1453`): parcha el bloque en los chunks cuya ventana lo
contiene, actualiza la luz con `actualizarLuz` (`luz-incremental.js:25`; chunks de luz local sobre su
ventana con `campoChunk:94`, chunks forzados — `chunkForzado:894` — sobre la caja `cajaGlobal:1580`) y
marca secciones de 16 de alto. `procesar:1359` → `vaciarSucios:1636` las remalla en el hilo principal
(`mallarChunkCrudo:1228` con rango de y) y `instalarSeccion:1650` las oculta de la malla entera con grupos
de índices. Los chunks con luz no exacta (camino lento) y los vecinos que solo cambian de luz van a
los workers (`pedirTrabajos:1684`; vuelven por `rehecho:1711` y `mallaDeWorker:1723`). El creativo sigue
con `remallarYa` (chunk entero). Prueba: `mundo/tests/luz-incremental.mjs`.

**Escenas de skin y 6c**: `escenas-skin.js` detecta el amigo cercano con tu skin base (`pendiente6c:30`,
`tipoSkin:56`) y arma la escena con `escenas-datos.js`. Para bienvenidas y reencuentros usa los
callbacks `bienvenida`/`reencuentro` que le pasa `main.js:661-662`; estos llaman a
`cargarEscenaAmistad:713` (`import('./escena-amistad.js')` la primera vez), que carga
`bienvenidas/<clave>.js` o `reencuentros.js` y usa `moldes.js`.

**escena-amistad**: entradas `bienvenida`, `reencuentro`, `jugar` y `momento` (desde `main.js:661-737`;
`momento` = botón de «Hablar» con amistad 100) → `iniciar(clave, guion):213` → `repartir:205` coloca
actores (`actorAmigo:176`, `lugarExacto:136`) → `aplicar:313` por cuadro (gestos, miradas, globos,
efectos) → `terminar:265` o `saltar:290`. Niveles en `escena-amistad-datos.js`; guiones en
`momentos/<clave>.js`.

**Misiones, hablar y tienda**: clic derecho sobre un amigo → `misiones.hablar:321` abre el panel
(`panel:215`). Pestañas: misión (`aceptar:273`, `completar:284`), «Hablar» (`cargarHablar:76`, import
dinámico de `hablar.js` y `dialogos-datos.js`) y «Tienda» (`tienda.js`). Los puntos de amistad los
suma `amistad.js`; los datos viven en `misiones-datos.js` y `tienda-datos.js`.

**Cooperativo**: `main.js` llama `hospedar`/`unirse` (o las `*Local` con QR, sin Supabase) y recibe
`cx`; `iniciarJuego(guardado, cx):397` → `arrancar` crea `crearCoop(cx, ctx)` (`coop.js:211`).
`coop.actualizar:706` envía posición a `HZ_POS`, aplica bloques y mobs del anfitrión e interpola con
`interpolacion.js`. El anfitrión simula hornos y cultivos; el invitado recibe.

**Guardado**: `estadoActual:926` arma el objeto del mundo (jugador, vida, inventario, `ediciones` con
`serializarEdiciones`, contenedores, agricultura, entidades, día, ganado, misiones, jugadores de coop) y
`guardarYa:944` lo escribe con `guardarMundo`, en cola, cada 30 s y al ocultar la pestaña. El invitado
no guarda el mundo: manda su perfil al anfitrión (`coop.enviarPerfil`) y guarda copia con
`guardarCopia:913` / `guardadoDeInvitado:198`. Al cargar, `jugar:387` → `cargarMundo` → `arrancar`
aplica `cargarEdiciones` antes de crear los chunks.
