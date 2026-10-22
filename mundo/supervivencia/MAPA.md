# Mapa del código · mundo 3D y supervivencia

Hecho a partir de las cabeceras (primeras líneas) y de grep sobre `main` (`cc03834`). Formato:
`archivo` (líneas) — qué hace · `función:línea`. Actualízalo en el mismo PR que mueve o agrega módulos.
Estado, tareas y decisiones: `mundo/PENDIENTES.md` (solo la sección en curso).

`mundo/` es el portafolio 3D ya terminado (no se le harán más cambios); el desarrollo activo es
`mundo/supervivencia/`. Base compartida del creativo en `mundo/*.js` (`voxeles`, `luz-incremental`, `texturas`, `jugador`, `cielo`, `gatas`,
`construcciones`, `minimapa`, `ajustes`, …); red en `mundo/online/` (`red.js`, `sala-local.js`,
`ping.js`, `qr.js`, `config.js`). Aquí solo `mundo/supervivencia/` y `mundo/criaturas/`.

## supervivencia/ · núcleo y sistemas

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `main.js` (1362) | Arranque, menús, cableado de todos los sistemas y bucle. `aplicarIdioma:84` `hospedarMundo:287` `jugar:403` `iniciarJuego:413` `arrancar:424` `pintarCoop:887` `pintarPing:942` (barras de ms, lista de Tab, 7e) `estadoActual:1098` `guardarYa:1116` `bucle:1265` |
| `guardado.js` (150) | Hasta 5 mundos en IndexedDB `venjy-supervivencia`. `listarMundos:42` `cargarMundo:49` `guardarMundo:50` `borrarMundo:51` `serializarEdiciones:60` `cargarEdiciones:72` `descargarMundo:98` `guardarCopiaConTope:121` (copia del coop con tope, almacén inyectado) |
| `vida.js` (218) | Vida, hambre, aire, daño y armadura. `crearVida:23` |
| `inventario.js` (~180) | Datos puros: 36 casillas, armadura, mano; marca `p` de préstamo (`nombrePila`). `Inventario:12` `clicCasilla:149` |
| `objetos.js` (346) | Registro de bloques y objetos. `OBJETOS:15` `MATERIALES:75` `info:237` `tiempoRomper:256` |
| `recetas.js` (159) | Recetas con y sin forma, fundición. `RECETAS:16` `buscarReceta:122` `FUNDICION:152` |
| `inventario.js` (173) | Datos puros: 36 casillas, armadura, mano. `Inventario:12` `clicCasilla:149` |
| `objetos.js` (364) | Registro de bloques y objetos. `OBJETOS:15` `MATERIALES:75` `info:237` `tiempoRomper:256` |
| `recetas.js` (171) | Recetas con y sin forma, fundición. `RECETAS:16` `buscarReceta:122` `FUNDICION:152` |
| `ui-inventario.js` (494) | Ventanas: inventario, mesa 3×3, horno, cofre. `crearVentanas:22` |
| `hud.js` (169) | Barra rápida, corazones, hambre, mensajes. `crearHUD:39` |
| `iconos.js` (534) | Íconos 16×16 y cubos isométricos; el dibujo de `mundo/datos/iconos.json` manda sobre `PINTORES`. `aplicarIconos:395` (repinta lo entregado) `crearAtlasObjetos:412` `icono:471` `pixelesDeCodigo` |
| `minado.js` (437) | Romper, poner y usar bloques; beber leche (`terminarComer`). `crearMinado:53` |
| `contenedores.js` (164) | Cofres, barriles y hornos por posición. `crearContenedores:15` |
| `botin.js` (30) | Tablas de botín por lugar. `botinDe:21` |
| `agricultura.js` (146) | Cultivos y brotes por registro. `crearAgricultura:26` |
| `entidades.js` (215) | Objetos tirados; se juntan los iguales a < 1 bloque también al soltar (7b-1). `crearEntidades:69` |
| `particulas.js` (~100) | Partículas con un InstancedMesh; `factor` (0-1) descarta emisiones (menú de rendimiento, 7b-2). `crearParticulas:11` |
| `dia.js` (41) | Día de 10 min. `crearDia:15` |
| `inicio-datos.js` (~170) | Menú de inicio, sin DOM: `INICIO` (título, carga, `presentacion` y `fondo`), `datosInicio(json)` (mezcla con `mundo/datos/inicio.json`), `fraseAlAzar`, `consejoAlAzar`, `avanceCarga` y los del fondo (`planosValidos`, `fondoActivo`, `planoEn`, `siguientePlano`, `veloEn`). Lo pinta `pintarTitulo` de `main.js`; lo edita la pestaña Inicio del Estudio. Prueba `mundo/tests/inicio.mjs` |
| `presentacion.js` (~110) | Presentación «Venjy presenta» al abrir la página: módulo propio que se carga antes que `main.js` (se ve mientras baja el juego); logo de píxeles, nombre y lema de `inicio.json → presentacion`. Se cierra con `presentacion.listo()` (lo llama `main.js` cuando el fondo tiene su primer plano) + tiempo mínimo, o al máximo |
| `fondo-menu.js` (~170) | Fondo de cine detrás del menú: escena, cielo y `MundoVoxel` propios con planos de cámara y fundidos (`inicio.json → fondo`); carga el plano que sigue mientras corre el actual. `main.js`: `iniciarFondo` / `cerrarFondo` (al entrar a un mundo). Depuración `__venjy.fondo.fijar(i, u)` |
| `reloj.js` (19) | 7j-0, sin DOM: hora de reloj (24 h, 1 h = 25 s de media) desde `horaDe`. `minutosDe` `textoHora` `textoDiaHora` `enTramo`. Lo pinta `pintarHora` de `main.js` (HUD, pausa, Reloj en la mano) |
| `paseos.js` (~230) / `paseos-datos.js` (~30) | 6d etapa 2: los amigos dejan su sitio y caminan (con `navegacion.js`) a una persona, un lugar o al jugador, y vuelven a su sitio, giro y pose exactos; gancho `n.paseo` en `amigos.js`. `crearPaseos` → `ir` `volver` `volverTodos` `estado` `fuera` `personas` `lugares` · `PASEO_BASE` `fijarPaseo` (navegacion.json, pestaña Vida). `/caminar`, `__venjy.paseos` |
| `acompanante.js` (~200) | 7i: un amigo te acompaña. «¿Me acompañas?» / «Puedes volver» en «Hablar» (`hablar`, `invitar`, `soltar`), uno a la vez, corta y retoma la rutina con su frase (`rutinas.acompanar` / `retomar` / `decir`), `motivoLugar` (su minijuego apagado), espera en minijuegos y escenas (`pausa`). Cooperativo: mensaje `co` (el anfitrión arbitra `lista`), `pose` en tu `p`, `dibujar` el de otros (`paseos.remoto`). Textos `ACOMPANAR_BASE` (rutinas.json → acompanar). `/rutina <persona> acompanar`, `__venjy.acompanante`. Prueba `mundo/tests/acompanante.mjs`. 7i PR 2: órdenes (`ordenar`), frases de pelea y torre. 7i PR 3: su mochila (`mochila`, `abrirMochila`, `serializar` / `cargar`; la usa el seguidor por `torre.mochila`) |
| `acompanante-pelea.js` (~140) | 7i PR 2: peleas y órdenes del acompañante (puro): elige el monstruo, lo persigue (`seguidor.perseguir`), pega como espada de piedra, `aguante` → se sienta `descanso` s; órdenes `sigue` / `quieto` / `tranquilo`. `PELEA_BASE` + `navegacion.json → pelea`. Lo llama `paseos` por el gancho `mando` |
| `horarios-datos.js` (22) | 7j-0: horario y lugar ES/EN de cada amigo con posición (`HORARIOS`, `LUGARES`; valores del código, `rutinas.json` los ajusta); lo muestra `hablar.js` |
| `rutinas.js` (~260) / `rutinas-datos.js` (~65) | 6d etapa 2 PR 2 (+ 7j-1): visitas por horario con la hora del mundo. Estados `en-sitio` `yendo` `visitando` `volviendo` `acompanando`; sale antes según la distancia (`horasDeViaje`); saludo al llegar (gesto de `moldes.js` + globo, y respuesta de quien recibe con el gancho `n.visita` de `amigos.js`). `crearRutinas` → `actualizar` `estado` `acompanar` `retomar` `probar` `cortar` `texto` (línea del panel, la muestra `tienda.pestanas`) `fijar` · PR 3: te saludan al pasar con amistad alta (`incluir`), cooperativo `red` `recibir` `foto` (mensaje `ru` de `coop.js`) · `RUTINA_BASE` `fijarRutinas` (rutinas.json, pestaña Vida). `/rutina`, `__venjy.rutinas` |
| `subsuelo.js` (~230) | Roca madre, cuevas, lava, menas. `llenarSubsuelo:128` · `buscarSubsuelo` (pistas de 7d-2: mena o piedra luminosa más cercana con la misma generación) |
| `desplazado.js` (41) | Vista con el mapa subido `dy` para las criaturas. `vistaDesplazada:20` |
| `mano.js` (252) | Mano en primera persona: brazo con la skin siempre visible y el objeto en la mano (7c-1, `AGARRE_1P`). `crearFabrica` (mallas por id, las comparte con el cuerpo) `crearMano` |
| `pose-jugador.js` (201) | 7c-1: pose del cuerpo propio (F5) y de los demás jugadores: caminar/correr, golpe, objeto en la mano, comer, arco, escudo, sentado. `F` `codificarF` `decodificarF` (bits de `f` en `p`) `POSES` `AGARRE` `avanzar` `angulos` (puras) `posar` `ponerObjeto` `limpiar`. Prueba `mundo/tests/pose-jugador.mjs` |
| `camaras.js` (372) | Cuerpo del jugador (pose con `pose-jugador.js`; con `cine.pose` o `cuerpoAjeno` solo camina), 3.ª persona (F5) y cámara de cine. `crearCamaras:31` · depuración `poseForzada`, `estadoPose` |
| `skin.js` (245) | Skin del jugador y editor. `skinPorDefecto:32` `crearModelo:53` `crearEditorSkin:110` |
| `sonidos.js` (104) / `musica.js` (~220) | Efectos y música sintetizados con WebAudio. `sonidos:63` · `crearMusica`. Un tema de `musica.json` con la misma clave reemplaza al del código |
| `musica-instrumentos.js` (~110) | Instrumentos de la música (`I`: piano, pulsar, chip, bajo, colchon, batería…), puros (sin Three): también suenan en el Estudio |
| `musica-motor.js` (~400) | Temas como datos, puro: `tocarPaso`, `tocarSinte` (sintetizadores de `musica.json`), `acordeDe`, `crearSecuenciador`, `revisarTema`, `USOS` (temas del código y niveles). Canciones de Salonas: `mapaTiempo`, `pasoEnTiempo`, `tocarPasoCancion`, `crearReproductorCancion`, `revisarCancion` (SALONAS.md §3). Estudio DISENO §24 |
| `salonas.js` (~560) | Salonas «La Gira» jugable (S3): menú, calibración, autopista 3D de 4 carriles, D F J K y trastes táctiles, dos reproductores (banda y bajo aparte: el fallo apaga el bajo), pausa con `ctx.suspend()` y cuenta, resultados. main.js lo carga con `import()` (`cargarSalonas`) desde el panel de Salonas y lo dibuja en lugar del mundo; SALONAS.md §2, §5, §7 |
| `salonas-escena.js` (~480) | Salonas S5: los 3 locales (sala, bar, festival) alrededor de la autopista, la banda (copias de Salonas y Conejeros, tu skin con el bajo, batería de cajas), el público (amigos y multitud de cubos), luces que laten al pulso y fuegos. Lo usa `salonas.js`; valores en `AJUSTES_SALONAS.locales/banda/publico`; SALONAS.md §7 |
| `salonas-gestos.js` (~200) | Salonas, puro: gestos de tocar (`guitarra`, `bateria` con sus golpes, `bajo`, `publico`) a partir del pulso; amplitudes en `GESTOS_SALONAS`. Prueba `tests/salonas-gestos.mjs` |
| `salonas-aldea.js` (~90) | Salonas en la aldea: de noche toca las canciones de «La Gira» junto al escenario en vez de los riffs de `bajo.js` (main.js lo carga con `import()` la primera noche; `actualizarAldeaSalonas`). Ajustes en `salonas.json → juego.aldea`; reglas puras en `salonas-reloj.js`. Prueba `tests/salonas-aldea.mjs` |
| `salonas-reloj.js` (~100) | Salonas, puro: `AJUSTES_SALONAS`/`ajustesDe` (no editable aún, S9 → `salonas.json`), `horaAudio` (pulsación → hora del audio que suena), `mediana`, `calibrar`, leer y guardar la calibración. Prueba en `tests/salonas.mjs` |
| `salonas-partitura.js` (~110) | Salonas, puro: `partitura` (notas por dificultad desde la capa de bajo y `mapaTiempo`), `juicio`, `golpe`, `vencidas`, `sumar`/`puntajeMaximo`, `estrellas`, `revisarPartitura`, `REGLAS_BASE`/`reglasDe`. Contrato `tests/salonas.mjs`; SALONAS.md §4-6 |
| `musica-bajo.js` (~130) | La voz del bajo de Salonas como instrumento (`bajoSlap`): `VOZ_BAJO`, `vozDe(cancion.vozBajo)`, `tocarBajo` con las técnicas s/p/g/t/d/a/r (mismo sonido que `criaturas/bajo.js`) |
| `musica-datos.js` (~25) | `musica.json` en el juego: `cargarMusica`, `aplicarMusica` (en vivo), `temaMusica(clave)` (no borradores), `instrumentosPropios`, `enPrueba` (vista previa del Estudio) |
| `interpolacion.js` (66) | Búfer de red a 2-5 Hz. `Bufer:14` `mezclar:61` |
| `tactil-supervivencia.js` (70) | Botones táctiles; etiquetas y layout salen de `mundo/datos/` (`textos.json`, `ui-layout.json`) con el código como defecto. `aplicarDatosVivos:28` (Estudio, sin recargar) `iniciarTactilSupervivencia:36` |
| `layout-datos.js` (112) | Estudio fase 1: genera un `<style id="layout-datos">` desde `ui-layout.json` solo con las claves presentes. `cssLayout:88` `aplicarLayout:97` |
| `consola.js` (176) / `comandos-dev.js` (345) | Consola T o `/` y comandos de desarrollo (`/gamemode devenjy`). `crearConsola:40` · `crearComandosDev:95` |
| `rendimiento.js` (~170) | 7b-2, sin DOM: menú «Rendimiento» de la pausa. `PRESETS` `normalizar` `presetDe` `aplicarPreset` `LimitadorFps` `AutoDistancia` (portada de `autoAjustar` del creativo) `Cuadros` (mediana/p95 de ms); reexporta `LOD` y `pasoLejano` de `../criaturas/lod.js`. Cableado en `main.js`: `aplicarRend` `fijarDistancia` `sincronizarRend`. Prueba `mundo/tests/rendimiento.mjs` |
| `medir.js` (182) | 7b-1: `/medir romper [captura]` (devenjy, con `import()`): rompe 6×6×3 a 4 bloques/s en campo, campamento y base con antorchas; cuadro p50/p95/p99 y ms por fase (`marcar` de `voxeles.js`). `medirRomper:45` |
| `creditos.js` (35) | Créditos al hundir el Caleuche. `mostrarCreditos:13` |

## supervivencia/ · combate, mundo vivo y jefes

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `combate.js` (135) | Golpe con carga, crítico, arco. `crearCombate:16` |
| `combate/` (bloque 8, puro) | Núcleo del combate nuevo (`COMBATE.md` §15): `estados.js` (máquina de estados, buffer, `recibir`, `crearRelojFijo`) · `animacion.js` (`crearAnimador`, `animar`: capas, inercialización, mirada, suelo, pasos (y el paso de boxeo `arrastre` y la cojera, L6a), pies, choques) · `cinematica.js` (`fk`, `resolverPierna`, `cajas`, `penetracion`) · `datos.js` (`fijarCombate`, `marca`, `accionDe`) · `reglas.js` (validar y línea de tiempo) · `postura.js` (L2, puro: postura, regeneración, ventanas del desvío con penalización y `clasificar` para `recibir`; reglas en `estilo-*.json → reglas`) · `peligro.js` (L3, puro: aviso de los ataques peligrosos, tabla de respuestas de §16.4, mikiri, golpe final y espíritu; reglas en `estilo-*.json → reglas.peligro, mikiri, remate, espiritu`) · `ia.js` (L4, puro y con semilla: CPU peleador con retraso humano, desvíos por probabilidad, cadenas, tajos retrasados, peligrosos y respiro; datos en `arena.json → cpu` y `estilo-*.json → cpu`) · `urbano.js` (L5, puro: defensa por altura de Urban Reign: reversión, desvío con contraataque, altura errada +30 % a la vida o a la zona según `erradaEn`; reglas en `estilo-*.json → reglas.altura`) · `zonas.js` (L6a, puro: zonas cabeza/torso/piernas, multiplicador por color y estados críticos; `estilo-*.json → zonas`) · `spa.js` (L6b, puro: agarre por altura con escape y amago, pisotón, arte especial que rompe la reacción y Furia; `estilo-*.json → reglas.spa`) · `peso.js` (N5, puro: nivel del golpe, reacción que toca, temblor, sacudida por trauma, cámara lenta y `capasSonido`; datos en `combate.json → peso, impacto, elegir, sonidos`) · `intenciones.js` (`crearIntenciones`: teclado, mando y táctil → intención por cuadro, N4) · `tactil-arena.js` (botones de la arena, DOM). Datos: `combate.json`, `estilo-*.json`, `ui-layout.json → arena` |
| `arena/` (bloque 8 · L1) | Arena del duelo de Lalo contra Moisés (`COMBATE.md` §19): `modelo.js` (puro: `reglasArena`, `nuevaPelea`, `pasoPelea` con rondas y reloj, eje, paredes, empuje y golpe de prueba; `intencionPractica`; cámara de lado `crearCamara`/`pasoCamara`, `encuadre`) · `escena.js` (lago congelado, clones de los amigos, arma del estilo con `colocarArma` de `modelos-mano.js` y `hoja()`, nieve, público, `retrato`, `primerPlano`) · `efectos.js` (L2: estela pixel del tajo, chispas, destello del perfecto y brillo de la carga; N5: impacto, polvo, aro, estrellas y marca roja con tope por cuadro; valores en `arena.json → efectos`) · `pantalla.js` (N5: líneas de velocidad, flash, viñeta y números de daño en un canvas pixelado; `arena.json → efectos.pantalla`) · `arena.js` (`crearArena`: flujo menú → VS → vuelo → rondas → resultado, HUD, teclado, mouse, mando y táctil, premios; main.js la carga con `import()` desde Hablar con Lalo o Moisés y la dibuja en lugar del mundo). Datos: `arena.json` |
| `proyectiles.js` (128) | Flechas y bolas de fuego. `crearProyectiles:17` |
| `enemigos.js` (~660) | Zombi, esqueleto, araña, creeper, Trauco. `RETROCESO` `empujar` `suavizarVelocidad` (knockback, 7a) · `crearEnemigos:213` · `garantizar` (monstruo de la noche, 7d-2) |
| `jefes.js` (579) | Imbunche y demás jefes en altares. `crearJefes:34` |
| `ganado.js` (231) | Caza y cría sobre `criaturas/animales.js`. `crearGanado:35` |
| `pesca.js` (~120) | Caña y boya; el botín sale de `botinPesca` con los multiplicadores de la misión. `crearPesca:22` |
| `ganado.js` (247) | Caza, cría y ordeño de vacas (cubo/botella → leche) sobre `criaturas/animales.js`. `crearGanado:35` |
| `pesca.js` (120) | Caña y boya. `crearPesca:22` |

## supervivencia/ · amigos, misiones y escenas

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `misiones-datos.js` (~300) | 3 misiones por amigo, kits y 3 jefes. `MISIONES:23` `KITS` `repartirKit` `JEFES:219` `TEXTOS_VENJY:240` |
| `facilidades-datos.js` (~220) / `facilidades.js` (~130) | 7d-2: tabla `FACILIDADES` por misión, pesca, rumbo, `crearGarantia`, planos del huerto/grava/horno · cableado: decorados una vez por mundo, pista, marcas del minimapa y monstruo de la noche. `botinPesca` `elegirSitio` `planoHuerto` · `crearFacilidades` |
| `caminos-carteles.js` (~40) + `mundo/caminos.js` (~155) | 7f-3 parte 1: mojones, carteles de cruce y faroles sobre los caminos. `colocarCaminos` (en `mundo/`, determinista, lo llama `prepararTerreno` solo en supervivencia y deja `terreno.caminos`; bloques como decorados) · `crearCartelesCamino` (texto a < 24 bloques) |
| `mundo/lugares-motivos.js` (~50) | 7f-3 parte 3: cama y antorcha del molino y carteles de lugar (molino, portal). `colocarMotivos` (lo llama `prepararTerreno` solo en supervivencia; los carteles van en `terreno.caminos` con `tipo: 'lugar'`) · `CARTELES_LUGARES` |
| `mundo/ruinas.js` (~120) | 7f-3 parte 4: 7 ruinas con cofre (arco y pilar caído) en claros del bosque. `colocarRuinas` (lo llama `prepararTerreno` solo en supervivencia; deja `terreno.ruinas` y decorados `ruina`, sin `zonasLuz`) · `RUINAS` (cantidad, separación, densidad de bosque). Botín: tabla `ruina` de `botin.js`, elegida por `lugarDe` de `contenedores.js` |
| `cuaderno.js` (~130) + `cuaderno-datos.js` (~75) + `mundo/paginas-cuaderno.js` (~100) | 7f-3 parte 6: 12 páginas del cuaderno de los Tomatitos. `colocarPaginas` (en `mundo/`, determinista, 1 por zona 4×3 con orden barajado; deja `terreno.paginas`) · `crearCuaderno` (sprites a < 40 bloques, recoger a 1,6, panel de lectura, clic derecho con el Cuaderno) · `recogerPagina` (lógica pura, premio) · `PAGINAS`/`PREMIO`/`TEXTOS`. Estado por jugador: `inventario.cuaderno` (viaja en `serializar` como `q`) |
| `mundo/seguir.js` (~240) | 7i: seguir a alguien por su rastro (puro, reutilizable). `crearSeguidor` → `anotar(lider)` (migas con su suelo; cortes) `actualizar(dt, { lider, visible })` (estados `quieto` `siguiendo` `esperando`, modos `rastro` / `camino` con el caminante; eventos `espera` `aparecio`) · `seVe` · `SEGUIR_BASE` `fijarSeguir` (navegacion.json → seguir, pestaña Vida). Modos `torre` y `puente` (7i PR 2-3), desatasco esperando sin camino; bloques de `opciones.mochila` |
| `mundo/navegacion.js` (~430) | 6d etapa 2: buscar camino sobre el terreno y seguirlo. Puro, reutilizable (cualquier criatura de 1×2). `consultaMundo` (bloques + `terreno.HT` para lo no cargado) `crearBusqueda` (A* por tramos, `avanzar(tope)`) `suavizar` `inicio` `apoyo` `crearNavegador` (cola con tope por cuadro) `crearCaminante` (cerca mira bloques y busca de nuevo; lejos a saltos) `NAV_BASE` `fijarNavegacion`. Hojas y vallas = `OBSTACULO` (chocan, no se pisan; `pisarHojas`). Prueba `mundo/tests/navegacion.mjs` |
| `mundo/formas.js` (~270) | 7f-2: cajas de los bloques con forma (losas, escalones, trampilla, vallas de jardín, farol, cartel) y de los chicos (cama, antorcha, plantas) para el contorno y las grietas. Puro. `FORMAS_BASE` `cajasDe` `rayoCajas` `chocaFormas` `topeFormas` `aristasContorno` `colocarForma` `fijarFormas` (formas.json, pestaña Formas). Lo leen `voxeles.js` (`mallarCajas`), `rayo.js`, `jugador.js`, `fisica.js`, `minado.js`, `iconos.js`, `entidades.js` |
| `mundo/fauna.js` (~180) + `fauna.js` (~140) | 7f-3 parte 5: fauna de ambiente (mariposas, abejas, peces que saltan, luciérnagas), tope 64. `mundo/fauna.js` es puro: `colocarFauna` (anclas `flores`/`lago`/`bosque`, determinista, despejadas de obras; **no** la llama `prepararTerreno`: la pide el cliente al cargar) · `criaturaEn` (posición como función del tiempo, sin estado) · `FAUNA`/`TOPES`/`TOPE_TOTAL`. `supervivencia/fauna.js`: `crearFauna` (4 `InstancedMesh`, anclas a < 56 bloques, luciérnagas de noche, el resto de día). Se carga con `import()` desde `main.js`. `plantaEn` de `voxeles.js` da la flor de cada columna (la comparte con `llenarChunk`) |
| `misiones.js` (499) | Panel de cada amigo y misión activa. `crearMisiones:38` `cumplida:114` `aceptar:273` `completar:284` `hablar:321` `hablarVenjy:343` |
| `tienda-datos.js` (215) / `tienda.js` (136) | Ofertas por amigo · pestaña «Tienda». `TIENDAS:17` · `crearTienda:21` `comprar:110` `vender:123` |
| `amistad.js` (196) | Lógica pura 0-100 y 5 niveles. `PERSONAJES:15` `NIVELES:17` `relacion:52` `nivelDe:66` |
| `hablar.js` (332) | Pestaña «Hablar»; carga por `import()`. `crearHablar:38` `abrir:184` `regalar:282` `actualizar:316` |
| `dialogos-datos.js` (50) | Fachada de `mundo/datos/dialogos.json` (Estudio, fase 3): `TEMAS` `OPINIONES` `SALUDOS` `REGALOS` `GESTO_REGALO` y `aplicarDatosVivos:40`; fetch en el navegador, `fs` en Node |
| `dialogos-datos.js` (365) | `TEMAS:22` `OPINIONES:227` `SALUDOS:330` `REGALOS:349` |
| `venjys-datos.js` (338) | 7f-1: lo que dicen los Venjy en la supervivencia: pistas, brújula, progreso, skin, amistad, carta, hora, chistes; `crearSelector` (`import()` al primer globo). `brujula` `progreso` `amistadFrase` `paraDe` `crearSelector` |
| `escenas-datos.js` (174) | Diálogos de las escenas de skin. `CORTAS:12` `VENJY:68` `IGLU:162` |
| `escenas-skin.js` (645) | Escena al acercarte con skin de un amigo. `GESTOS:75` (la registra para `poses.json`: `registrarGestos`) `crearEscenasSkin:102` `iniciar:199` `terminar:266` |
| `escena-amistad-datos.js` (212) | Animaciones por nivel. `ANIMACIONES:22` `GESTOS_AMISTAD:57` (registrada para `poses.json`) `FRASES_AMISTAD:108`; al final `PLANOS_AMISTAD`, `PLANOS_GRUPO`, `PLANOS_GRUPO_TECHO` (los lee `mundo/datos/escenas.js` → `planosDe`) |
| `escena-amistad.js` (781) | Motor de guiones de amistad, bienvenidas y reencuentros. Lee `mundo/datos/escenas.json` al importarse (`await cargarDatos`; `aplicarDatosVivos:57` para el Estudio) y fusiona sus escenas `amistad` con `ANIMACIONES` en `guionGenerico`; `jugarGuion:715` juega las de tipo `guion`. `crearEscenaAmistad:80` `iniciar:228` `terminar:304` `aplicar:358`; B3b: los cargadores buscan antes su `dispara` en el JSON (`guionDeEscena:688`), `moverYGirar:504` (caminos y giros), objetos y efectos del catálogo |
| `codigo-escenas.js` | `CODIGO_ESCENAS` (B3b): nombre → carga del módulo con lo único de una escena de `escenas.json` (`codigo`); vacío hasta B4 |
| `moldes.js` (158) | Piezas de movimiento 6c. `ruta:29` `MOLDES:40` `molde:82` `fusion:91` `espejo:108` |
| `reencuentros.js` (226) | Escenas entre amigos 6c-1. `REENCUENTROS:23` `reencuentro:212` |
| `bienvenidas/*.js` (13 archivos) | Guion del Venjy del Inicio por amigo; `comun.js` trae piezas (`encadenar:18` `abrazo:36`). Cada uno: `LINEAS` y `bienvenida` |
| `momentos/*.js` (12 archivos) | «Momento especial» a amistad 100, uno por personaje: `LINEAS` y `momento` |
| `escenas-gatas.js` (497) | Primera caricia a Mila/Gala con skin Lona o Venjy. `crearEscenasGatas:305` |
| `usos-objetos.js` | Usos con clic derecho de Mapa, instrumentos y Pluma de juguete (7f-2). `crearUsosObjetos`; Farol, Cartel y Botella van en `minado.usarObjeto`. |
| `modelos-mano.js` | Modelos 3D de Guitarra, Teclado y Tambor (cajas con color) y `COLGAR`: dónde van en el torso y los brazos (7f-2). Los usa la fábrica de `mano.js` y `pose-jugador.js`. Armas del combate (L2, `ARMAS`): `katana` (hoja con filo, temple y lomo, curva, guarda, mango con cordaje; medidas en `KATANA`) y `vaina_katana`; `colocarArma` las cuelga de una persona (muñeca y cadera) con el agarre de `objetos-mano.json` (Estudio → Objetos → Armas del combate). |
| `caricias.js` (290) | Caricias a las gatas (tecla G). `crearCaricias:47` |
| `escena-cuello.js` (300) | Misión lona3, el cuello de Gala. `crearEscenaCuello:45` |
| `escena-guardian.js` (334) / `cofres-companeros.js` (175) | Cofres de amigos que ya no están y su guardián. `crearEscenaGuardian:66` · `crearCofresCompaneros:53` |
| `recorrido-escenas.js` (131) | `/escenas` y `/escena <nombre>`. `crearRecorridoEscenas:32` |
| `ronda-iglu.js` (687) | Sentarte con Lalo y Moisés (G). `crearRondaIglu:102` |
| `minijuego.js` (285) | Marco: intro, juego, final. `crearMinijuegos:27` |
| `minijuego-lena.js` (310) / `-pesca.js` (250) / `-asado.js` (338) | Hachas con Boris · pesca con Pony · asado. `crearLena:36` `crearPescaPony:33` `crearAsado:47` |
| `minijuegos-datos.js` (201) | Textos ES/EN. `TXT_MJ:11` `LENA:28` `PESCA:69` `ASADO:164` |
| `cartas-mesa.js` (~560) | Duelo de Cartas: mesa 3D junto a Lucho, tu mano en pantalla, cámaras, toques y HUD. `crearMesaCartas` |
| `cartas-mesa-anim.js` (~330) | Animaciones del Duelo desde los eventos de `aplicar` (robar, jugar, atacar, daño, cementerio, hechizos, turno). `crearAnimador` |
| `cartas-coleccion.js` (~150) | Duelo: tu colección y tu mazo (puro): `inventario.cartas`, reglas de `cartas-mesa.json` (`coleccion`, `coleccionInicial`), `mazoParaPartida` (armado o al azar con cartas de más en la mano), `sumarCarta` |
| `cartas-tienda.js` (~130) | Duelo: tienda de cartas (puro): sobres (`sacarSobre`, pesos), cartas sueltas (`catalogo`, precios), `comprarSobre` / `comprarSuelta` con esmeraldas → `inventario.cartas`; reglas en `cartas-mesa.json` (`tiendaCartas`, `preciosCartas`, `pesosSobre`) |
| `cartas-sobre.js` (~150) | Escena de abrir un sobre: rasgar la franja (arrastrar, tocar o Espacio), la tapa vuela y las cartas se dan vuelta; valores `sobreAnim` (parte pura en `cartas-tienda.js`) |
| `cartas-tienda-ui.js` (~110) | Sección «Cartas del Duelo» de la pestaña Tienda (amigo con `cartas: true`, hoy Lucho); `tienda.js` la carga con `import()` |
| `actividades-red.js` (~160) | Actividades compartidas en la sala (7g-1, base común): mensaje `ac` con `op` (unir, salir, ev, estado, evento, invitar, resp, ver, registro, rf/rafaga); eventos `libre` sin orden y ráfagas sin registro para juegos en tiempo real (carrera); el anfitrión arbitra cupos, una actividad por jugador y el orden de los eventos (lockstep); todos reciben el estado (quien mira sabe quién juega); `huella` para notar desincronías. Bases (7g-1): asientos (`as`), `t0` con el reloj del anfitrión (`segundos`), progreso en el `ax` del `p` (`progreso`, `progresoDe`) y frases que lee toda la sala (`decir` → `dicho`, en el `registro`). Puro, transporte inyectado; main.js lo crea con la sala (`coop.actividad`, `alActividad`, `alSalirJugador`, `progresoPropio`, `alProgreso`) |
| `fogata.js` (~230) | Sentarse en la fogata del campamento (7g-1, primer uso de las bases): 8 asientos (`FOGATA_BASE` + `actividades.json → fogata`), G/SENTARSE, cámara libre, frases 1-4 que leen los cercanos, calentarse; con sala, `fogata@campamento` con un asiento por jugador; sin NPC. Parte pura: `datosFogata`, `asientosMundo`, `asientoCercano` |
| `cartas-duelo.js` (~150) | Duelo de cartas entre 2 jugadores sobre `actividades-red.js` (actividad `duelo@lucho`, cupo 2): `retar` / `aceptar` / `rechazar`, `ini` del retador (semilla, mazos de `mazoParaPartida`), `jugar` / `aplicarRival` con huella; `espejo` (el invitado juega la partida espejada: siempre eres el 0 de la mesa); `reglasDuelo` (`duelo` de cartas-mesa.json); `TXT_RETO` |
| `carrera-modelo.js` (~420) | Carrera de gatas (7h-1), puro: `CARRERA` (valores base: pista, sala, muebles, física, 6 gatas, IA, cámara, premio), `reglasCarrera`, `armarPista` / `enPista` / `puntoPista` / `proyectarCerca`, `nuevaGata`, `pasoGata` (salto, derrape de 3 niveles, turbos, truco, huecos, paredes, vueltas; devuelve eventos), `chocarGatas`, `puestos`, `entradaIA` (con `{ gs, W }` usa objetos), objetos (`cajasDe`, `nuevosObjetos`, `sortearObjeto`, `pasoObjetos`), `azar`; red: `empacar`/`recibirRed`/`seguirRed`, `efectoObjeto`, `empacarObjetos`/`aplicarObjetos`/`avanzarObjetos` |
| `carrera-escena.js` (~400) | La escena propia del «Gran Premio del Living»: sala, muebles, carretera (cinta, bordes, barandas, pilares de libros, placas, línea y arco), las 6 gatas (Mila y Gala copiadas del mundo con `clonarConPartes`), Lona con la bandera, podio, partículas, cajas «?», ovillo, caja, pescado y la aspiradora de Lona; `dibujar(gs, dt, t, W)`, `lanzarAspiradora` |
| `carrera.js` (~520) | El juego: menú (gata y dificultad), presentación, semáforo, carrera, llegada con planos de cine, podio, HUD con minimapa, música (`carrera-musica.js`) y sonidos, pausa, teclado y botones táctiles, premio. main.js lo carga con `import()` (`cargarCarrera`) desde el panel de Lona y lo dibuja en lugar del mundo (`dibuja(renderer)`); `ver()` para el Estudio |
| `carrera-musica-datos.js` (~175) | Música de la carrera como datos, puro: `TEMAS_CARRERA` (living rock chiptune, cocina funk, patio surf, techo synthwave, podio fanfarria; cada uno bpm, progresión y capas con patrones de 16 pasos: `ritmo`, `rel`, `acorde`, `notas`, `arpegio`, por nivel `menu`/`cuenta`/`corre`/`ultima`), `NIVELES`; `tocarPaso`, `INSTRUMENTOS` y `AC` vienen de `musica-motor.js`. Un tema de `musica.json` con la misma clave lo reemplaza |
| `carrera-musica.js` (~50) | Toca un tema (de `musica.json` si hay uno con esa clave; si no, de `carrera-musica-datos.js`) con `musica-instrumentos.js` y el secuenciador de `musica-motor.js`; `actualizar({ tema, nivel, tempo, vol, pausa })`, `callar()`. Mientras la carrera está abierta, main.js calla la música del mundo (`musica.actualizar({ silencio })`) |
| `carrera-red.js` (~170) | Carrera entre jugadores sobre `actividades-red.js` (`carrera@living`, cupo 8; ráfagas solo a los de dentro): `repartirGatas`, sala de espera (`entrar`, `elegir`, `largar`, `aLaSala`), en carrera `estado` (mi gata), `paquete` y `objetos` (líder: IA y objetos), `usar`, `meta`, `hurra`; avisa `abandono` y `lider` |
| `mesas-colocadas.js` (~85) | Mesas de duelo colocadas (duelo 2J, PR 3): `ES_MESA`, `giroMesa`, `armarMesa` (el mueble; lo usa también `cartas-mesa.js`) y `crearMesasColocadas` (sigue los bloques `B.MESA_DUELO`/`_Z` con `mundo.alEditar` y `cargar()`; `lista` para `mesaCercana` de `cartas-duelo.js`). main.js lo carga con `import()` solo si hay alguna mesa |
| `cartas-armar.js` (~150) | Panel para armar tu mazo (clic derecho con el MAZO): colección con arte, poner/quitar, completar al azar, elegir armado o al azar |
| `cartas-mesa-sonido.js` (~75) | Sonido del Duelo: recetas con `tono`/`ruido`; `sonar(sonidoDe(paso))` al empezar cada paso de la animación y `sonidoFin` al terminar |
| `cartas-anim-modelo.js` (~100) | Puro: tiempos y colores por defecto (`ANIM`, en `cartas-mesa.json`) y línea de tiempo de los eventos. `planificar` `ocupanteEn` |

## supervivencia/ · cooperativo y panel QR

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `coop.js` (852) | Hasta 8 jugadores por WebRTC en estrella. Cuerpo de los demás con `posar` (7c-1: bits de `f`, `i`/`i2` = manos, golpes a la hora del dibujo; `golpeo()`). Ping (7e): `rttDe:310` `medirEco:332`, API `pingDe` `pingPropio` `relojAnfitrion` `desfaseAnfitrion`. `hospedar:123` `unirse:138` `hospedarLocal:174` `unirseLocal:185` `guardadoDeInvitado:203` `crearCoop:216` `actualizar:765` `salir:794` |
| `../online/ping.js` (118) | 7e, lógica pura del ping (sin DOM ni red): `nivelDeMs` `barrasDeMs` `rttDeEco` `rttDeStats` `Suave` `RelojAnfitrion` `Eco` `ecoDeLista` `ecoPropio`. Prueba `mundo/tests/ping.mjs` |
| `ui-qr.js` (86) | Panel QR para jugar sin internet. `crearPanelQR:15` |

## Estudio · editor y datos (fases 1 a 5)

Servidor, editor y CLI en `estudio/` (no se publica); datos que lee el juego en `mundo/datos/`. Diseño y contratos: `estudio/DISENO.md`.

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `mundo/datos/cargador.js` (58) | Navegador: `cargarDatos:21` (fetch con tope 3 s, caché, `?sin-datos`), `fusionar:46`, `texto:55` |
| `mundo/datos/*.json` | Contenido nuevo: `ui-layout`, `textos`, `dialogos`, `posiciones` (los lee el juego), `escenas` (lo lee `escena-amistad.js`, fase 5) y `poses` (lo lee `mundo/datos/gestos.js`, fase 6; `main.js` lo pide); `indice.json` dice quién lee qué |
| `mundo/datos/escenas.js` (94) | Fase 5, sin DOM: `animacionDeDatos` (escena `amistad` → fila de `ANIMACIONES`), `guionDeDatos` (escena `guion` → guion de ejecución, `d` = `durLinea(texto)` si falta) y `reglasEscenas` (las reglas que el esquema no expresa; las usa `cli.mjs validar` y la prueba) |
| `mundo/datos/gestos.js` (177) | Fase 6, sin DOM: `evaluarGesto` (canales de un gesto de `poses.json` en un objeto reutilizado), `funcionGesto` (con la firma de `GESTOS` o `GESTOS_AMISTAD`), `registrarGestos` + `aplicarPoses` (reemplaza por nombre en esas tablas; nuevos y poses fijas a `GESTOS`; con otros datos todo vuelve a su código), `gestosDeDatos`, `reglasPoses` (las usa `cli.mjs validar`) |
| `mundo/datos/pixeles.js` (85) | Pestaña Píxeles, sin DOM: formato de los dibujos (`paleta` + `filas`), `codificar`, `decodificar`, `revisarDibujo`, `listoParaJuego`, `MEDIDAS` (ícono 16×16, retrato 40×26, carta 50×76) |
| `estudio/pixeles.js` (541) | Pestaña Píxeles: editor de íconos (`iconos.json`), retratos, reverso y marcos (`cartas-arte.json`) y objetos y cartas nuevos (`borradores.json`). `montarPixeles` |
| `mundo/datos/posiciones.js` (84) | Fase 4, sin DOM: `resolverAncla` (lugares, `escenario`, `faro`), `puntoAMundo` y `mundoAPunto` (la inversa que usa el gizmo), `GIRO_CALCULADO` |
| `estudio/servidor.mjs` (249) | `node estudio/servidor.mjs [--lan] [--log]`: estáticos con ETag, `PUT /api/datos/<nombre>` y `GET /api/eventos` (SSE: `cambio <nombre>`). `crearServidor:85` `iniciar:232` |
| `estudio/formato.mjs` (39) | `formatear(obj)`: el formato estable de los JSON |
| `estudio/validar.mjs` (95) | `validar(datos, esquema)`: subconjunto de JSON Schema sin dependencias |
| `estudio/cli.mjs` (446) / `fuentes.mjs` (77) | `resumen` (con `dialogos --md [--escribir]`), `validar`, `glifos` y `capturar` (delega en `capturar.mjs`); fuentes JS `tienda` y `amistad` |
| `estudio/capturar.mjs` (180) | `capturar layout\|pose\|gesto\|escena`: servidor propio + Playwright. `aparatoDe:29` `capturar:110` |
| `estudio/playwright.mjs` (109) | Dónde está Playwright y un navegador: `cargarPlaywright:34` `buscarChromiumLocal:68` `lanzarNavegador:90` `abrirNavegador:106` |
| `estudio/musica.js` (~560) / `estudio/musica-modelo.mjs` (~200) | Pestaña Música del Estudio: temas de `musica.json`, rejillas y piano roll en canvas, selector de acordes, sintetizadores propios, Reproducir aquí y en el juego (`estudio/musica-juego.js`). DISENO §24 |
| `estudio/puente-protocolo.js` (96) | Canal `venjy-estudio`, `DATOS_VIVOS`, `crearManejador` (mensajes `hola`, `datos`, `tp`, `globo`, `elegir`, `escena`; sin DOM) |
| `estudio/puente-juego.js` (190) | Lado del juego, solo con `?estudio`: abre/crea el mundo «Estudio», `/tp` por la consola, globo de vista previa, SSE; aplica `dialogos` en la fachada, `posiciones` en `amigos.posiciones` y `escenas` en `escena-amistad.js`; `elegir` carga `gizmo-juego.js`; `escena:96` juega, pausa, salta o para una escena y suelta el mouse; manda `escenaT` cada 100 ms |
| `estudio/gizmo-juego.js` (135) | Fase 4, solo con `?estudio`: `crearGizmo` pone un `TransformControls` (de `vendor/three-addons/`) sobre un marcador en el grupo de la persona, mira hacia ella, libera el puntero, salta las escenas que arranquen y manda `cambio` al soltar |
| `estudio/puente-cliente.js` (67) / `juego.js` (98) | Lado del Estudio: `crearCliente:11`; pestaña Juego (iframe, `/tp`, aplicar archivos) |
| `estudio/avisos-layout.js` (26) / `evaluar.mjs` (35) | `calcularAvisos` (choques, chicos, fuera); `evaluarGesto` de `poses.json` (referencia legible; el del juego es `mundo/datos/gestos.js`) |
| `estudio/avisos-textos.js` (68) / `glifos.mjs` (75) / `dialogos-md.mjs` (87) | `avisosDeTexto` (par, emoji, glifo, plantilla, largo); `leerGlifos` (cmap de PixelCraft → `glifos.json`); `generarPersonas` y `escribirEnDocumento` (tablas de `mundo/DIALOGOS.md`) |
| `estudio/textos.js` (352) | Editor de textos ES/EN: tabla filtrable, «revisado», avisos, globo en el juego, guardar. `montarTextos:22` |
| `estudio/puntero-libre.js` (34) | Solo con `?estudio`: `liberar:14` / `devolver:26` (con cuenta) sueltan el mouse del juego (no recaptura, sin pausa, sin «Haz clic»); lo usan el gizmo y la pestaña Escenas |
| `estudio/escenas-modelo.mjs` (295) | Línea de tiempo, puro: `moverTramo:63` `estirarTramo:76` `agregarTramo:90` `moverMarca:123` `moverFrase:158` `estirarFrase:168` `cambiarT:216` `desdeCodigo:263` `escenaNueva:271` `crearHistorial:287`; encaja a 0,05 s y se detiene contra el vecino |
| `estudio/escenas.js` (733) | Editor de escenas: lista (JSON y «en código»), línea de tiempo (gestos, frases, golpes y corazones), Reproducir / Pausa / Parar / clic en la regla por el puente, avisos con `reglasEscenas`, guardar. `montarEscenas:46` `cargarMotor:86` `pintarLinea:181` `reproducir:608` |
| `estudio/posiciones.js` (221) | Editor de posiciones: persona, ancla, ejes, dx/dy/dz/giro, Mover / Girar, guardar. Comparte el iframe de la pestaña Juego. `montarPosiciones:25` |
| `estudio/index.html` · `estudio.js` (86) · `estudio.css` | Cáscara: idioma ES/EN, estado del servidor, pestañas (Layout, Juego, Textos, Posiciones y Escenas), cliente del puente |
| `estudio/layout.js` (578) | Editor de layout: asas, panel de campos, avisos, guardar; manda cada cambio al juego. `APARATOS:50` `montarLayout:65` |
| `estudio/vista-tactil.html` (87) | Capa táctil real sin el mundo (iframe del editor); recibe `{tipo:'layout'}` y `{tipo:'seguro'}` |

## criaturas/ · base compartida con el creativo

| Archivo (líneas) | Qué hace · funciones |
|---|---|
| `cuerpo.js` (597) | Texturas, cuerpo de cajas, nombre y globo. `textura:43` `lerp:14` `angulo:16` |
| `pieles.js` (227) | Pieles a partir de una descripción. `pielDe:19` `agregarExtras:187` |
| `npcs.js` (857) | Amigos reales como personas de cajas. `crearNPCs:223` |
| `amigos.js` (948) | Más amigos en los lugares; su sitio sale de `posiciones.json` (`sitioDe:104` en `nuevo:110`; `aplicarPosiciones:142`, expuesto como `amigos.posiciones` para el Estudio). `PERSONAS:30` `crearAmigos:92` |
| `venjy.js` (581) | Venjy en persona. `VENJY:16` `crearVenjys:99` |
| `animales.js` (630) | Granja y manadas. `crearAnimales:360` |
| `charla.js` (34) | Conversaciones de grupo. `crearCharla:9` |
| `bajo.js` (251) | Bajo de Salonas (WebAudio). `RIFFS:15` `crearBajo:62` |
| `lod.js` (~25) | 7b-2, sin imports: `LOD` (`salto` para personas, `animales`, `radio`) y `pasoLejano`, que `npcs.js`, `amigos.js` y `venjy.js` usan para actualizar a los lejanos 1 de cada N cuadros con el dt acumulado; `animales.js` lee `LOD.animales` (4 por defecto). El menú lo fija; sin menú todo queda como antes |

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
`cx`; `iniciarJuego(guardado, cx):413` → `arrancar` crea `crearCoop(cx, ctx)` (`coop.js:216`).
`coop.actualizar:765` envía posición a `HZ_POS`, aplica bloques y mobs del anfitrión e interpola con
`interpolacion.js`. El anfitrión simula hornos y cultivos; el invitado recibe.

**Guardado**: `estadoActual:926` arma el objeto del mundo (jugador, vida, inventario, `ediciones` con
`serializarEdiciones`, contenedores, agricultura, entidades, día, ganado, misiones, jugadores de coop) y
`guardarYa:944` lo escribe con `guardarMundo`, en cola, cada 30 s y al ocultar la pestaña. El invitado
no guarda el mundo: manda su perfil al anfitrión (`coop.enviarPerfil`) y guarda copia con
`guardarCopia:913` / `guardadoDeInvitado:198`. Al cargar, `jugar:387` → `cargarMundo` → `arrancar`
aplica `cargarEdiciones` antes de crear los chunks.
