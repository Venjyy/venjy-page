# Verificar una animación

Nunca entregues una animación sin haber **mirado** capturas de ella. Hay dos herramientas en la
carpeta de la skill. Las dos usan el Chromium del contenedor (no ejecutes `playwright install`) y
necesitan el servidor:

```bash
cd /home/user/venjy-page && (python3 -m http.server 5510 >/dev/null 2>&1 &)
```

Guarda las capturas en tu **scratchpad** (nunca en el repo) y ábrelas con la herramienta de leer
archivos para verlas.

## 1. `posar.mjs` · una pose, sin cargar el mundo (2–3 s)

Para diseñar poses y ajustar ángulos. Dibuja al personaje de frente, 3/4 y de lado, sobre una
rejilla de 1 bloque, con cajas de referencia opcionales.

```bash
node .claude/skills/animaciones-minecraft/posar.mjs --salida $SCRATCH/pose.png --skin venjy \
  --pose '{"inc":0.6,"pDx":-0.6,"pIx":-0.6,"y":0.13,"bDx":-0.55,"bDz":0.12,"cx":0.3}' \
  --cajas '[{"x":0,"y":0.38,"z":1.25,"w":0.6,"h":0.7,"d":1.0,"color":"#555"}]'
```

- `--skin`: `venjy` o la clave de un amigo (`pony`, `lona`, `hadad`…).
- Cajas en coordenadas del modelo (mira a +Z, pies en y = 0). Una gata echada de lado ≈
  `w 0.6, h 0.7, d 1.0`; de pie súbela a `y 0.8`.
- Itera: cambia un número, mira, repite. Apunta los valores que funcionan.

## 2. `capturar.mjs` · la animación en el juego

Crea un mundo nuevo (Pacífico), ejecuta tu preparación y saca una captura por cada tiempo.

```bash
node .claude/skills/animaciones-minecraft/capturar.mjs \
  --preparar "const n = v.npcs.lista.find(n => n.clave === 'pony'); await irJunto(n.x, n.z, n.y); v.ponerSkin('pony'); v.escenas.forzar('pony')" \
  --paso "v.escenas.pausar(); v.escenas.irA(t)" \
  --tiempos 0.3,1.2,2.5,4,6 --salida $SCRATCH/pony
```

- `v` es `window.__venjy`. `irJunto(x, z, y, d)` lleva al jugador cerca y espera a que cargue el
  terreno (sin esto la captura sale de puro cielo).
- Dónde están los actores: `v.npcs.lista` (Pony, Salonas, Lona), `v.amigos.lista` (los otros 9),
  `v.venjys.lista` (`lugar === 'inicio'`), `v.gatas.gatas` (Mila y Gala, `clave`).
- `--paso` con `pausar()` + `irA(t)` congela el reloj en cada segundo: así ves la pose exacta.
  Por eso tu módulo **debe** exponer `pausar` e `irA`.
- **Siempre** pon `callarEscenas()` al inicio de `--preparar` (la skin del mundo de prueba sale al
  azar y una escena de skin puede dispararse sola y arruinar las capturas), salvo que pruebes justo eso.
- **Interiores** (iglú, casas): `irJunto` busca el suelo desde arriba y te deja sobre el techo. Úsalo
  para cargar el terreno y después `v.jugador.colocar(x, yDelPiso, z)` con la altura exacta.
- **`pausar()` congela también la mirada suavizada de la cámara y los globos**: antes de capturar haz
  `pausar(false); await esperar(1500); pausar()`.
- **`pausar()` congela también los efectos** (humo, partículas, globos que se desvanecen): para
  verlos en una captura, en `--paso` haz `irA(t); pausar(false)` y fija la pausa medio segundo después,
  o captura sin `--paso` (tiempo real).
- `--plano k` fija la cámara de cine en el plano `k` (prueba varios). Sin esto, como la cámara
  usa su propio reloj, los cortes de plano no siguen a `irA(t)`.
- **Espera antes de pausar**: las poses de las criaturas se mezclan lento (las gatas a 2,6/s). En
  `--preparar`, después de `forzar(...)`, pon `await esperar(2500)` y recién ahí `pausar()`; si
  no, la primera captura sale a medio camino. `--paso` espera 0,7 s por captura.
- `--medir "<expresión>"` imprime números en cada captura. Ayudas: `manoD()`, `manoI()` (punta
  de la mano del jugador en el mundo) y `mundoDe(hueso, x, y, z)` (un punto local de cualquier
  hueso en el mundo). Ejemplo: `--medir "({ mano: manoD(), cabeza: mundoDe(v.gatas.gatas[1].cabeza, 0, 0.27, 0.15) })"`.
- Imprime los errores de la página: **cualquier `ERROR DE PÁGINA` es un fallo**.
- En el contenedor el puntero no se bloquea y el juego queda «en pausa», salvo que haya algo con
  `uiAbierta` (una escena, un panel). Para probar la tecla real, simúlala:
  `document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG' }))` después de poner
  `v.jugador.activo = true` si tu `intentar()` lo exige, o llama `v.<modulo>.intentar()`.
- Es lento (≈10–20 s por corrida con muchos tiempos). Junta varios tiempos en una corrida.

## 2a. `planos.mjs` · hoja con todos los planos de la cámara

```bash
node .claude/skills/animaciones-minecraft/planos.mjs --planos 5 --salida $SCRATCH/planos.png \
  --preparar "callarEscenas(); const c = v.ronda.cojin; await irJunto(c.x, c.z, c.y, 1.2); v.jugador.colocar(c.x + 0.8, c.y + v.terreno.dy, c.z); await esperar(800); v.ronda.forzar(); await esperar(2500); v.ronda.pausar()"
```

Haz **2–3 hojas en distintos instantes** (`v.ronda.irA(t)` antes de `pausar()` en `--preparar`):
el saludo, un pase de objeto y la charla meten brazos y objetos en cuadro de forma distinta.
Una imagen con un cuadro rotulado por plano (0, 1, 2…). Úsala con el método de
`referencia/camara.md` («Método para diseñar planos»).

## 2b. `grabar.mjs` · video MP4 de la animación completa (para mostrarla)

Avanza el juego cuadro por cuadro con un reloj controlado (30 fps), así el video sale fluido
aunque el contenedor dibuje lento. Tarda de 2 a 6 min por cada 8 s de video según la carga.
En `--preparar`, **espera a que el terreno del lugar esté cargado** antes de terminar (p. ej.
`while (v.mundo.bloque(x, y - 1, z) <= 0) await esperar(500)`): con el reloj manual ya no carga y
los primeros segundos saldrían de puro cielo.

```bash
node .claude/skills/animaciones-minecraft/grabar.mjs \
  --preparar "const g = v.gatas.gatas.find(g => g.clave === 'gala'); await irJunto(g.x, g.z, g.y, 1.5)" \
  --iniciar "v.caricias.forzar('gala')" --segundos 8.6 --salida $SCRATCH/caricia.mp4
```

El video está listo solo cuando el comando imprime `video <ruta>` (antes el archivo puede existir incompleto). Revisa unos cuadros antes de entregarlo (hoja de contacto con ffmpeg:
`ffmpeg -i video.mp4 -vf "select='eq(n\,15)+eq(n\,150)',scale=480:-1,tile=2x1" -frames:v 1 hoja.png`).
Al terminar una tarea de animación, **entrega el video** junto con las capturas.

## 3. Qué mirar en cada captura (lista de control)

- [ ] **Se lee la pose** sin explicación (sorpresa, caricia, saludo…).
- [ ] **Contacto**: la mano toca (o casi) lo que debe; no atraviesa el cuerpo de nadie ni el suelo.
- [ ] **Nadie se hunde ni flota**: pies en el suelo (salvo saltitos), personas sentadas sobre algo.
- [ ] **Cámara**: se ven las caras de los actores; nadie cortado por la franja; ningún bloque
      tapando; la cámara no está dentro de una cabeza.
- [ ] **Entrada y salida**: captura en 0,1 s y en `T − 0,2` s; nada da un salto brusco y al final
      todo vuelve a neutral.
- [ ] **Saltar a la mitad**: llama `saltar()` en la mitad y captura 1 s después: el jugador está
      libre, sin franjas, el actor vuelve a lo suyo y ningún objeto quedó flotando.
- [ ] **Sin errores** de consola.

## 4. Pruebas del repo

```bash
node mundo/tests/recetas.mjs && node mundo/tests/inventario.mjs && node mundo/tests/paridad.mjs
```

## 5. Si algo se ve mal

| Síntoma | Causa probable |
|---|---|
| El brazo va hacia el lado contrario | signo de `bDz`/`bIz` (tabla de `rig.md`) |
| El personaje parece caerse | `inc` sin compensar las piernas |
| La pose tiembla | `Math.random()` dentro de la pose, o dos sistemas escribiendo el mismo hueso |
| La pose no cambia | la animación normal la pisa: falta el gancho (`n.escena` / `gata.escena`) |
| La mano parece golpear | la punta queda a la altura del centro de lo que toca: súbela 0.1–0.15 sobre la superficie (`rig.md`, «Contacto») |
| El botón táctil no se oculta | falta `.tactil-boton.sv-<nombre>[hidden] { display: none; }` |
| Sale un «!» de misión en la escena | falta `misiones.ocultarMarcas = true` |
| La mano no llega | distancia entre actores: ajusta dónde pones al jugador, no estires el brazo |
| Cielo o negro en la captura | chunks sin cargar (`irJunto`) o la cámara quedó dentro de un bloque |
| El actor queda girado después | no se restauró `yaw` en `terminar` |
