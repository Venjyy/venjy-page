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
- `--plano k` fija la cámara de cine en el plano `k` (prueba varios).
- Imprime los errores de la página: **cualquier `ERROR DE PÁGINA` es un fallo**.
- En el contenedor el puntero no se bloquea y el juego queda «en pausa», salvo que haya algo con
  `uiAbierta` (una escena, un panel). Para probar la tecla real, simúlala:
  `document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG' }))` después de poner
  `v.jugador.activo = true` si tu `intentar()` lo exige, o llama `v.<modulo>.intentar()`.
- Es lento (≈10–20 s por corrida con muchos tiempos). Junta varios tiempos en una corrida.

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
node mundo/tests/recetas.mjs && node mundo/tests/inventario.mjs
```

## 5. Si algo se ve mal

| Síntoma | Causa probable |
|---|---|
| El brazo va hacia el lado contrario | signo de `bDz`/`bIz` (tabla de `rig.md`) |
| El personaje parece caerse | `inc` sin compensar las piernas |
| La pose tiembla | `Math.random()` dentro de la pose, o dos sistemas escribiendo el mismo hueso |
| La pose no cambia | la animación normal la pisa: falta el gancho (`n.escena` / `gata.escena`) |
| La mano no llega | distancia entre actores: ajusta dónde pones al jugador, no estires el brazo |
| Cielo o negro en la captura | chunks sin cargar (`irJunto`) o la cámara quedó dentro de un bloque |
| El actor queda girado después | no se restauró `yaw` en `terminar` |
