# Mundo 3D · Pendientes y bitácora

Este archivo es la memoria del proyecto `mundo.html` (Minecraft 3D jugable del portafolio). **Cada chat que cambie algo aquí debe actualizar este archivo**: marcar tareas hechas y añadir una entrada en la bitácora (sección final). Léelo completo antes de empezar.

## Objetivo

Que el mapa del inicio del portafolio (el mismo del minimapa) sea un mundo 3D explorable en modo creativo: caminar, volar, nada más. Sin hambre, vida, inventario ni romper/colocar bloques (por ahora). Debe parecerse lo más posible a Minecraft, solo gráficamente.

Decisiones tomadas: página aparte `mundo.html`, Three.js local en `vendor/`, siempre el mapa horizontal (384×256 celdas), texturas 100 % procedurales (sin assets de Minecraft).

## Cómo ejecutar

- `python -m http.server 5510` y abrir `http://localhost:5510/mundo.html` (no sirve con `file://`, usa módulos ES).
- Depuración en consola: `window.__venjy` = `{ datos, terreno, mundo, jugador, camara, renderer, scene }`. Para ver el mapa sin pointer lock: ocultar `#inicio`, poner `jugador.noclipVuelo = true` y usar `jugador.colocar(x, y, z)`, `jugador.yaw/pitch` y `jugador.actualizar(0)`.
- PR de la Fase 1: https://github.com/Venjyy/venjy-page/pull/3

## Arquitectura

| Archivo | Qué hace |
|---|---|
| `mundo.html` | Canvas, menú de inicio/pausa, HUD. Textos con pares `data-es`/`data-en`. |
| `mundo/mundo-datos.js` | Copia fiel de `generarMundo()` de `script.js` sin DOM. Devuelve `{ W, H, E, T, F, P, tramos, titulo }`. `F` = 1 en celdas de estructura. **No cambiar el orden de llamadas a `r()` ni las semillas** (1424, 77, 2026) o el mapa deja de coincidir con el 2D. |
| `mundo/texturas.js` | Atlas 8×8 de tiles 16×16 (`PINTORES`), ids de bloque `B`, definición por cara `BLOQUES`, tipo `TIPO` (1 sólido, 2 hoja, 3 agua). |
| `mundo/voxeles.js` | `prepararTerreno` (alturas y materiales por columna), `llenarChunk` (bloques + árboles), `mallarChunk` (culling + AO + vertex colors), `MundoVoxel` (carga por distancia con presupuesto por cuadro). |
| `mundo/jugador.js` | Caminar con colisión AABB, vuelo con doble Espacio, correr, agua básica. |
| `mundo/cielo.js` | Domo de gradiente, sol y nubes de bloques. |
| `mundo/main.js` | Escena, render, niebla, bucle, idioma, HUD. |
| `mundo/mundo.css` | Estilo de menús tipo Minecraft (fuente PixelCraft). |
| `vendor/` | Three.js 0.186.1 sin minificar + licencia. |

Constantes clave (`voxeles.js`): `ESCALA = 4` (1 celda = 4×4 bloques), `FACTOR_Y = 1.5`, `CHUNK = 16`, `ALTO = 80`, `NIVEL_AGUA = 14`. El mundo mide 1536×1024 bloques. Norte = −Z, este = +X (igual que el mapa 2D).

Cómo se arma una columna: la altura sale de interpolar `E` (suavizado bilineal por celda); el material, del tipo `T` de la celda con el borde desordenado. Las celdas con `F = 1` son estructuras: tope exacto `vh(E)` y material de color desde la altura base (`BASE_ESTRUCTURA`). Puentes (`T = madera` sin `F`) se tratan aparte (`ES = 2`).

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
- [x] Casas con volumen: paredes de tablones, techo del color del mapa, interior hueco, puerta de 2×3 con felpudo a ras del suelo (hecho 2026-10-06). Falta: ventanas, muebles, techo a dos aguas, iluminación interior.
- [ ] Mina: túnel/entrada en la montaña. Hoy las celdas `negro` (E=16) forman un pozo hundido dentro de la montaña, sin túnel ni dintel; al estar en altura 17 quedan como un cráter.
- [x] Faro: torre de rayas rojas/blancas con linterna de diamante, balcón y puerta, sobre pedestal de piedra (`colocarFaro` en `voxeles.js`).
- [ ] Pozo de la aldea, buzón del correo, cajas de la gatera con forma propia.
- [x] Letras "VENJY" elevadas a 18 bloques (`ALTO_LETRAS`). Cada píxel sigue midiendo 32×32 bloques; valorar reducir la escala.
- [x] Cielo: domo con gradiente, sol cuadrado y nubes de bloques estáticas (`mundo/cielo.js`). Falta: luna, ciclo día/noche, que las nubes se muevan.
- [ ] Niebla/colores más fieles al Minecraft real; agua con animación de textura.
- [ ] Árboles: variedad (altura, abedul), pinos en zonas altas; flores/pasto alto opcional.
- [ ] Suavizar los escalones del terreno (hoy se ven curvas de nivel de 1 bloque).
- [ ] Cultivos reales (trigo) en lugar de franjas de hojas/tierra.
- [ ] Luz en interiores y en la mina (hoy no hay iluminación por bloque).

### Fase 3 · Jugador y extras
- [ ] Enlace de entrada desde `index.html` (estandarte/slot "Mundo" o botón en el hero) con `data-es`/`data-en`. Cuidado: la hotbar usa teclas 1–9 y 8/9 ya están ocupadas (`script.js:1256`).
- [ ] HUD: brújula/coordenadas con nombre de zona, opción de ocultar FPS.
- [ ] Marcadores o teletransporte a los puntos clave (spawn, casa, registro, mina, aldea, gatera, correo, faro) usando `datos.P` y `datos.tramos`.
- [ ] Minimapa opcional dentro del mundo (reusar el bitmap del mapa 2D).
- [ ] Ajustes: distancia de render, FOV, sensibilidad.
- [ ] Soporte táctil: joystick virtual y mirar con el dedo (hoy solo escritorio; mostrar aviso).
- [ ] Auto-ajuste de distancia de render según FPS.

### Técnico / deuda
- [ ] Mallado en Web Worker si el meshing en el hilo principal se nota al volar rápido.
- [ ] Minificar Three.js o importar solo lo necesario (hoy ~2 MB sin minificar).
- [ ] Que `script.js` consuma `mundo/mundo-datos.js` para no duplicar el generador (hoy está duplicado; `script.js` no es módulo). Si se cambia uno, cambiar el otro.
- [ ] Soportar el mapa vertical (`DISENOS.v`) si algún día se quiere; hoy solo `'h'`.
- [ ] Chunks sin cargar se tratan como pared invisible: revisar que no moleste al volar rápido.
- [ ] Revisar `.claude/launch.json`: el puerto 5510 puede estar ocupado por otro chat.
- [ ] Test de paridad reutilizable en el repo (hoy se corrió con un script temporal que ejecuta `generarMundo` con un `document` falso y compara el bitmap).

## Convenciones del proyecto (resumen)

- Solo fuente `PixelCraft`; sin emojis como íconos.
- Todo texto visible con par `data-es` / `data-en`.
- Estética Minecraft; nombres y comentarios en español (contexto Chile).
- No leer `respaldo-2026-10-06/`, `.impeccable/review/` ni `centroeventostest/` salvo que se pida.
- Léanse `AGENTS.md`, `PRODUCT.md` y `DESIGN.md` antes de tocar contenido o diseño del portafolio.

## Bitácora de cambios

Formato: `AAAA-MM-DD · qué se cambió · archivos · por qué / notas`. Lo más reciente arriba.

- 2026-10-06 · **Fase 2 parcial**: casas huecas con puerta, faro, letras elevadas, cielo con sol y nubes · `mundo/voxeles.js` (capa `HUECO`, `colocarFaro`, `ALTO_LETRAS`, `faro` en el terreno), `mundo/cielo.js` (nuevo), `mundo/main.js` (integra el cielo; `camara.far = 2000`) · Piso de las casas a ras del suelo para entrar caminando. Pendiente: mina, pozo/buzón/cajas, ventanas, luna, cultivos.
- 2026-10-06 · **Fase 1 completa**: página `mundo.html`, generador sin DOM con paridad exacta, conversión mapa→bloques por chunks (culling + AO), texturas procedurales, árboles, jugador creativo (caminar/volar), menú ES/EN. Archivos: `mundo.html`, `mundo/*`, `vendor/*`. Mapa 2D e `index.html` sin tocar. PR #3.
- 2026-10-06 · Se subió el techo de vuelo de `ALTO + 120` a 600 · `mundo/jugador.js` · para poder ver el título desde arriba.
- 2026-10-06 · Se creó este archivo · `mundo/PENDIENTES.md`.
