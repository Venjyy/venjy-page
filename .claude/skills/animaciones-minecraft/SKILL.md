---
name: animaciones-minecraft
description: Diseña, programa y verifica animaciones estilo Minecraft en el mundo 3D de Venjy (Three.js, mundo/ y mundo/supervivencia/). Úsala siempre que haya que animar personas de cajas (amigos, Venjy, el cuerpo del jugador), las gatas Mila y Gala u otros animales; crear gestos, escenas con guion y globos, interacciones que se activan con una tecla, o planos de la cámara de cine (escenas de skin, paneles de misiones). Trae el rig con sus signos, un atlas de poses probadas, plantillas de código, el sistema de cámara y una herramienta de capturas para revisar cada pose.
---

# Animaciones estilo Minecraft · mundo 3D de Venjy

Esta skill sirve para **tres tipos de animación** que ya existen en el juego y para crear nuevas
con la misma calidad. Léela entera antes de escribir código. Las referencias están en `referencia/`.

| Tipo | Ejemplo que ya existe | Dónde vive | Lee |
|---|---|---|---|
| **A. Gesto o escena corta** (≤ 8 s, un actor, gestos fijos) | Escena «corta» cuando un amigo reconoce que tu skin parte de la suya: se gira, se sorprende, se rasca, se señala y te señala | `GESTOS` y `pista` en `mundo/supervivencia/escenas-skin.js`; frases en `escenas-datos.js` (`CORTAS`) | `referencia/rig.md`, `referencia/escenas.md` §1 |
| **B. Escena avanzada** (guion con turnos, varios actores, objetos que pasan de mano en mano, partículas, sonido) | Escenas «Venjy» (conversación de 6 turnos) y el iglú (el pito y el bong vuelan a tu mano, humo, tos) | `escenas-skin.js` (`iniciar`, `aplicar`, `fumarJugador`) y `escenas-datos.js` (`VENJY`, `IGLU`) | `referencia/escenas.md` §2 y §3 |
| **D. Interacción con estado** (te quedas el tiempo que quieras, guion en bucle, primera persona sin cortar) | Sentarse en el iglú con Lalo y Moisés (`G`) | `mundo/supervivencia/ronda-iglu.js` | `referencia/escenas.md` §4 |
| **C. Cámara de cine** (planos, fundidos, encuadre) | Cámara al leer la misión de un amigo (6 planos con regla de tercios) y la de las escenas de skin (7 planos de dos personajes) | `PLANOS` y `PLANOS_ESCENA` en `mundo/supervivencia/camaras.js` | `referencia/camara.md` |

Una **interacción nueva con tecla** es un tipo B en su propio módulo: plantilla en
`referencia/escenas.md` §3 y ejemplo real terminado en `mundo/supervivencia/caricias.js`
(acariciar a Mila o Gala con G). Cópialo cuando hagas algo parecido.

---

## 0. Encargar la animación a un subagente (lo normal)

El dueño suele pedir: «ejecuta un subagente Haiku (o Sonnet) que haga la animación X». Quien recibe
ese pedido (el orquestador) **no programa la animación**: escribe el encargo, lanza el subagente,
revisa lo que entrega (video, hoja de cuadros, medidas) y lo presenta. Objetivo de la skill:
**animaciones de alta calidad con bajo consumo**, así que **Haiku va siempre primero**.

### 0.1 Flujo: Haiku hace la base, el dueño revisa, se retoca o se escala

```
Encargo ──► HAIKU ──► video ──► el dueño revisa
                                   │
            ┌──────────────────────┼─────────────────────────────┐
         «está bien»       «retoca un par de cosas»       «hay varias cosas mal»
            │                      │                             │
         aprobada           Haiku retoca (0.4)        Haiku evalúa (0.3): ¿le queda grande?
                                                        │ no                  │ sí
                                                   Haiku arregla     SONNET sigue sobre la base (0.5)
                                                                              │ se atasca
                                                                           OPUS (orquestador)
```

| Encargo | Qué entrega Haiku |
|---|---|
| Pequeño o mediano: un gesto, una interacción con tecla, escena de 1–2 actores | la animación completa |
| Grande: 3+ personas, escena larga, muchos pases de ida y vuelta, interiores | una **base** completa y jugable (guion, poses, objetos, cámara simple) que el dueño revisa antes de pulir |

Un subagente **no puede cambiarse de modelo**: cuando a Haiku algo le queda grande, lo dice en su
respuesta y el orquestador lanza a Sonnet con la plantilla de traspaso (0.5). Sonnet trabaja **sobre la
base de Haiku**, no desde cero. Opus entra solo si Sonnet también se atasca.

### 0.2 Punto de control a los ~100K tokens (no es un corte)

Con Haiku 5.5 cada paso cuesta 5× más pasados los 100K de contexto, pero **cortar en seco pierde
trabajo**. Por eso a los ~100K (aprox. **25 llamadas a herramientas**, o tras leer 6+ archivos grandes,
o 20 min) el subagente se detiene un momento y estima cuánto le falta:

- **Le falta poco** (verificar, grabar el video, un ajuste): **sigue y termina**. Entregar algo vale más.
- **Le falta mucho** (partes sin programar, varios problemas abiertos): **se detiene en un punto
  limpio**: el código queda funcionando (sin ediciones a medias), escribe una nota de traspaso
  (`<scratchpad>/<carpeta>/traspaso.md`: hecho, falta, archivos y líneas, cómo verificar, capturas) y
  responde. Nada se pierde: el código queda en disco y la nota permite seguir.
  Seguir desde la nota con **un Haiku nuevo** (contexto limpio) sale más barato que dejar al primero
  con 300K de contexto; si lo que falta es de criterio (0.3), sigue Sonnet.

### 0.3 ¿Le queda grande a Haiku? (lo evalúa Haiku con estas señales)

| Puede solo (retoque) | Le queda grande → pide Sonnet |
|---|---|
| tiempos, frases, un gesto, una pose | rediseñar la cámara o la puesta en escena |
| un plano puntual que tapa algo | cambiar la estructura del guion |
| un objeto o una mano mal ubicados | arreglos que se cruzan (arreglar un pase rompe otro) |
| un efecto (humo, sonido, globo) | un intento ya hecho sobre lo mismo que no mejoró |
| 1–3 comentarios del dueño, cada uno local | 4+ comentarios o comentarios de «se ve raro/estático» en general |

Ante la duda, Haiku hace **un** intento acotado y, si no mejora, lo declara grande. No sigue iterando.

### 0.4 Reglas para cualquier encargo

- **Acotado y con aceptación**: «arregla X; está listo cuando se vea Y». Nunca «rehaz la escena».
- **Versión aprobada protegida**: lo que el dueño aprueba queda en un commit. Una pasada nueva solo la
  reemplaza si el dueño, viendo los dos videos, prefiere la nueva; si no, se descarta.
- **Leer poco**: la skill entera sí; de las referencias, solo las del tipo de animación; del código,
  `grep -n` y luego `Read` por tramos. No releer capturas viejas.
- **Variedad de planos y guion coherente** (lecciones del iglú, `referencia/camara.md` y `escenas.md`).

### 0.5 Plantillas

**Encargo nuevo** (Haiku):
```
Trabajas en /home/user/venjy-page. Lee CLAUDE.md y .claude/skills/animaciones-minecraft/SKILL.md
completos, y de referencia/ solo: <rig.md, escenas.md §…, camara.md si hay cámara, verificar.md>.
Del código, busca con grep y lee por tramos: <archivos/secciones del lugar y actores>.
TAREA: <qué pasa, quiénes, dónde, cómo se activa, cuánto dura, cómo se sale>.
Tipo: <completa | BASE (escena grande: el dueño la revisará antes de pulir)>.
Decisiones del dueño: <cámara, efectos, quién puede, textos especiales…>.
Lista cuando: <criterios visibles en el video>.
Sigue §0.2 (punto de control ~100K) y §0.3 (si te queda grande, dilo y para).
Entrega: guion con tabla de tiempos antes del código, capturas medidas, hoja de planos si hay cámara,
video con grabar.mjs, pruebas del repo, PENDIENTES.md actualizado.
Temporales SOLO en <scratchpad>/<carpeta>/. NO hagas commit ni push. No edites la skill.
Responde con: qué hace + tabla de tiempos, teclas/botones, archivos, rutas de video/capturas y qué
viste, pruebas, si te quedó grande algo (y por qué), y lo que de la skill faltó.
```

**Retoque** (Haiku, el mismo u otro con contexto limpio):
```
Trabajas en /home/user/venjy-page con la skill .claude/skills/animaciones-minecraft (lee SKILL.md).
La animación <nombre> está en <archivos>. El dueño vio el video y pide SOLO esto:
1. <comentario> → lista cuando <criterio>
2. <comentario> → lista cuando <criterio>
No cambies nada más. Si al intentarlo ves que es grande (§0.3), detente y explícalo.
Entrega: video nuevo con grabar.mjs y hoja de cuadros de los momentos tocados; pruebas del repo.
Temporales en <scratchpad>/<carpeta>/. NO hagas commit ni push. No edites la skill.
```

**Traspaso a Sonnet** (cuando Haiku declaró grande o paró en el punto de control):
```
Trabajas en /home/user/venjy-page con la skill .claude/skills/animaciones-minecraft (lee SKILL.md y
las referencias que necesites). Continúas una BASE hecha por otro agente: NO empieces de cero.
Estado: <resumen de 5–10 líneas o ruta a traspaso.md>. Video de la base: <ruta>.
Lo que el dueño aprobó de la base: <…>. Lo que pidió cambiar: <lista>.
Por qué se escaló: <señal de §0.3>.
Lista cuando: <criterios>. Entrega lo mismo que un encargo nuevo. NO hagas commit ni push.
```

### 0.6 Al recibir el resultado

El orquestador mira la hoja de cuadros del video (`referencia/verificar.md` §2b), corre las pruebas y
presenta el video al dueño. Lleva a la skill lo que el subagente diga que faltó.

| Ejemplos probados | Resultado |
|---|---|
| Haiku · caricias a las gatas (18 min, ≈ US$ 0,85) | bien al primer intento |
| Haiku · ronda del iglú desde cero (37 min) | buena mecánica (base aprobable) |
| Haiku · rehacer planos del iglú (33 min) | aprobada por el dueño |
| Haiku · puesta en escena en media luna (49 min) | descartada: era rediseño de criterio (debió ir a Sonnet) y la idea fue del orquestador |

## 1. Reglas del estilo (no negociables)

1. **Cajas rígidas que giran en sus pivotes.** Se anima solo `rotation` de los grupos pivote
   (`cuello`, `brazoD`, `brazoI`, `piernaD`, `piernaI`, `cuerpo`) y `cuerpo.position.y` (saltitos,
   agacharse). **Nunca** escales ni deformes brazos, piernas o cabeza de una persona. (Las gatas sí
   escalan patas en `aplicarPose`: es su sistema, no lo copies a personas.)
2. **Sin rodillas ni codos.** El brazo es una sola caja de 0,75 de largo que cuelga del hombro.
   Para «agacharse» se inclina el torso (`inc`) y se baja `cuerpo.position.y`; para alcanzar algo
   bajo, el brazo apunta hacia abajo-adelante (ver atlas de poses en `referencia/rig.md`).
3. **Poses claras, transiciones suaves.** Cada gesto es una *pose meta* clara (se lee en una
   captura fija) más un *movimiento secundario pequeño* con `Math.sin(t * f)`. El paso de una pose a
   otra siempre va con easing (`suave`, `envolvente`) y un suavizado exponencial
   (`cur += (meta - cur) * Math.min(1, dt * rapidez)`). Nada salta de golpe salvo un corte de cámara
   tapado por fundido.
4. **Rangos que se ven bien** (radianes): oscilaciones secundarias 0,03–0,35; frecuencias
   `t * 5` (hablar) a `t * 18` (agitar brazos). Un brazo en alto es `-2,7` a `-2,9`, nunca menos de
   `-3,1` (atraviesa la cabeza). Cabeza: `cx` entre `-0,45` y `0,5`, `cy` entre `-1,1` y `1,1`.
5. **Pixel art, nada moderno.** Partículas y adornos son cajas o sprites con texturas pintadas
   píxel a píxel en un `canvas` con `NearestFilter` (ver el corazón de `ganado.js`). Sin emojis, sin
   degradados suaves, sin fuentes que no sean `PixelCraft`.
6. **Bilingüe.** Todo texto visible (globos, botones, avisos) va como `{ es, en }` y se elige con
   el idioma (`L(o)` en `escenas-skin.js`). Contexto chileno en el tono.
7. **Siempre se puede salir.** Toda escena que congela al jugador se salta con `Esc` y con un
   botón «Saltar» / «Skip», y al terminar (o saltar) **restaura** todo lo que tocó: pose, `yaw`,
   objetos de vuelta a su dueño, clases del `body`, cámara, jugador liberado.
8. **Contacto real.** Cuando una mano toca algo, se apoya **encima** o de frente (tabla y
   reglas de contacto en `referencia/rig.md`) y se **mide** con `capturar.mjs --medir`. Una mano
   que entra en una cabeza o queda a la altura de su centro se lee como un golpe.
9. **Duraciones**: gesto 0,6–2 s; escena corta 5–8 s; escena avanzada 15–25 s. Entrada con
   rampa de 0,25–0,5 s y salida de 0,6–1 s. Una frase de globo dura `1,8 + letras * 0,045` s
   (entre 2,5 y 3,8).

## 2. Flujo de trabajo (síguelo en orden)

1. **Lee primero**: `mundo/PENDIENTES.md` (sección «Modo supervivencia», regla de oro: se actualiza
   en cada cambio), `referencia/rig.md` y la sección de `referencia/escenas.md` o
   `referencia/camara.md` que toque. Abre el código de ejemplo que nombra la tabla de arriba.
2. **Escribe el guion antes que el código**: una tabla de tiempos con columnas
   `segundo · actor · pose/gesto · cámara · texto/sonido`. Ejemplo en `referencia/escenas.md` §3.
   Si la idea es ambigua (qué tecla, qué actor), elige lo razonable y anótalo en la entrega.
3. **Elige el tipo** (A, B o C) y **reutiliza**: un gesto nuevo es una entrada en `GESTOS`; una
   escena nueva con amigos usa `crearEscenasSkin`; una interacción con otro actor (gata, animal) va
   en un módulo nuevo que copia la plantilla. No dupliques `camaras.js`: usa `iniciarCine`.
4. **Programa por capas**: (a) que arranque y termine bien (bloquear, cámara, saltar, restaurar),
   (b) poses meta, (c) easing y movimiento secundario, (d) adornos (partículas, sonido, globos).
   Prueba después de cada capa.
5. **Expón depuración** en `window.__venjy` (`forzar()`, `pausar()`, `irA(t)`, `saltar()`), igual
   que `escenas`. Sin esto no se pueden revisar poses con capturas.
6. **Verifica con capturas** (y, si tocaste la cámara, con la hoja de planos `planos.mjs`) (`referencia/verificar.md`): al menos 5 tiempos clave y 2 planos de
   cámara. Mira cada imagen: ¿la pose se lee?, ¿la mano llega donde debe?, ¿algo atraviesa un
   bloque o una cabeza?, ¿la cámara ve a los actores? Corrige y vuelve a capturar.
7. **Corre las pruebas**: `node mundo/tests/recetas.mjs`, `node mundo/tests/inventario.mjs` y
   `node mundo/tests/paridad.mjs` (no deben romperse) y revisa que no haya errores de consola en las capturas.
8. **Graba un video** con `grabar.mjs` (`referencia/verificar.md` §2b) y entrégalo: es lo que
   revisa el dueño.
9. **Documenta**: marca/añade la tarea en `mundo/PENDIENTES.md` y una entrada en su bitácora
   (fecha · qué · archivos · cómo se verificó). Pon un comentario de cabecera en el módulo nuevo
   explicando qué hace, como los demás archivos.

### Revisor automático: correrlo antes de entregar cualquier escena con globos

```bash
node .claude/skills/animaciones-minecraft/revisar.mjs --escenas lona,boris --salida $SCRATCH/revisor
node .claude/skills/animaciones-minecraft/revisar.mjs --escenas todas --salida $SCRATCH/revisor
```

Recorre cada escena cuadro a cuadro a 15 fps con el reloj manual de `grabar.mjs` (sin capturas) y mide:
cuadros con globo; solape grave globo-cabeza/pecho (> 0,03); solape globo-globo (> 0,03); globo fuera
del área segura; medio alto mínimo del globo (< 0,17 falla); cambios de candidata dentro de una línea
(cualquiera falla); líneas más cortas que `0,6 s + 0,04 s por carácter`. Imprime una tabla y sale con
código 1 si algo falla, no arranca o hubo errores de página. Un JSON por escena con los datos de cada
cuadro, más `resumen.json`, queda en `--salida`.

- Claves: `lona`, `boris`… (la conversación venjy y la corta de ese amigo), `iglu` y `cuello`.
- Tarda ~1 min por escena (`--escenas todas`, unos 20 min). Úsalo con claves para iterar.
- Es un informe: **no arregla nada**. Lo que marque se corrige a mano y se vuelve a correr.
- Lo que no mide está en `NO_CUBIERTAS` (al final de `revisar.mjs`). Ahí hay que mirar capturas.
- Una escena nueva con globos necesita `diag()` (como `escenas-skin.js`) para que el revisor la vea.
  Las capturas siguen siendo necesarias para la pose: el revisor no mira poses.

## 3. Lo mínimo que hay que saber del motor

- **Coordenadas**: amigos, Venjys y gatas viven en `vista.grupo`, subido `dy = 48` (`DY`). Sus
  `x, z` son del mundo y su `y` es la del creativo: **en el mundo su pie está en `n.y + dy`**. El
  jugador (`jugador.pos`) ya está en coordenadas del mundo. Para mover algo entre ambos sistemas
  usa `grupo.worldToLocal(v)` / `objeto.localToWorld(v)` (ver `manoDe` en `escenas-skin.js`).
- **Personas** (`crearPersona` en `mundo/criaturas/cuerpo.js`): miran a `+Z`, pies en el origen.
  Huesos: `g` (raíz, posición y `rotation.y`), `cuerpo` (todo cuelga de aquí), `torso`, `cuello`
  (cabeza), `cabeza` (la caja), `brazoD`, `brazoI`, `piernaD`, `piernaI`.
- **El cuerpo del jugador** es `camaras.cuerpo` (mismo rig, con su skin). Solo se ve en tercera
  persona o en modo cine. Su `rotation.y` es `jugador.yaw + Math.PI`; para que el jugador mire a
  un punto: `jugador.yaw = Math.atan2(px - jugador.pos.x, pz - jugador.pos.z) - Math.PI`.
  Durante una escena la pose del jugador se escribe en el gancho `camaras.pose = (cuerpo, dt) => …`.
- **Ganchos de animación**: amigos, NPCs y Venjys aceptan `n.escena = (dt, base) => …`, que
  reemplaza su animación (`base(0)` congela la normal; con `n.escena` se callan su globo, nombre y
  charla). Las gatas aceptan `gata.escena = (dt, t) => …` (se llama **después** de su pose; ver
  `referencia/rig.md` §3). Otra criatura sin gancho: agrégalo igual (`referencia/escenas.md` §3.4).
- **Mientras dura una escena**: `misiones.ocultarMarcas = true` (si no, sale un «!» de misión en
  el encuadre) y vuelve a `false` al terminar. Los monstruos siguen activos: no hagas escenas
  largas lejos de las zonas seguras de los amigos.
- **Bucle** (`mundo/supervivencia/main.js`, función `bucle`): `escenas.actualizar` y
  `camaras.actualizar` corren cada cuadro; las criaturas se actualizan con `dtC` (0 en pausa). Un
  módulo nuevo se actualiza justo después de `escenas.actualizar(corre ? dt : 0)`.
- **Bloquear al jugador**: copia el `bloquear`/`liberar` que se le pasa a `crearEscenasSkin` en
  `main.js` (`uiAbierta = true; jugador.congelado = true; jugador.teclas.clear(); soltar puntero`).
  Con `uiAbierta = true` el mundo sigue corriendo aunque no haya puntero bloqueado.
- **Teclas ocupadas**: W A S D, Espacio, Shift, Ctrl, R (correr), Tab, E (inventario), Q (soltar),
  F (cambiar mano), T y / (consola), F5 (cámara), Esc, 1–9. Libres y cómodas: **G**, **C**, **V**,
  **X**, **Z**. En celular, agrega un botón con `tactil.agregarAccion` en
  `tactil-supervivencia.js` (mira cómo está `sv-camara`).
- **Depuración**: `window.__venjy` tiene `jugador`, `mundo`, `camaras`, `escenas`, `gatas`,
  `npcs`, `amigos`, `venjys`, `ponerSkin(clave)`, etc. `camaras.fijarPlano(k)` congela la cámara
  en un plano; `escenas.forzar(clave)`, `pausar()`, `irA(seg)`.

## 4. Utilidades de easing (cópialas tal cual; ya están en `escenas-skin.js`)

```js
const suave = u => u * u * (3 - 2 * u);                 // 0→1 con entrada y salida suaves
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const angulo = a => Math.atan2(Math.sin(a), Math.cos(a)); // normaliza a [-π, π]
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);  // 0 antes de a, 1 después de b
// Peso de algo que dura de a a b con rampas de entrada y salida (0 → 1 → 0)
const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));
```

Patrón de cada cuadro: `meta = lerp(neutral, poseDelGesto, envolvente(...))` →
`cur += (meta - cur) * Math.min(1, dt * rapidez)` (rapidez 7 lento, 13 ágil) → escribir en los huesos.

## 5. Errores típicos (revísalos antes de entregar)

- Signos al revés: el brazo derecho (`brazoD`) está en `-X`. `bDz > 0` lleva la mano derecha
  **hacia el pecho**; `bIz < 0` lleva la izquierda hacia el pecho. Ver tabla en `referencia/rig.md`.
- Olvidar el `+ dy` al comparar alturas del jugador con amigos o gatas.
- Escribir huesos de un amigo sin `n.escena`: su animación normal los pisa en el mismo cuadro.
- No restaurar al saltar a la mitad (objetos en la mano equivocada, `body` con clase de cine,
  jugador congelado, `yaw` del amigo girado para siempre).
- Usar `Math.random()` dentro de la pose: tiembla. El azar se decide una vez al iniciar.
- Escena que arranca con el jugador lejos o detrás de un muro: acércalo bajo el fundido de
  entrada con `lugarCerca` (como `iniciar` en `escenas-skin.js`).
- Cámara dentro de un bloque o pegada a una cabeza: usa `iniciarCine` con `evitar`, no muevas
  la cámara a mano.
- Capturas en negro o de puro cielo: los chunks no cargaron; lleva al jugador antes con
  `irJunto(...)` (`referencia/verificar.md`).
- Dos botones «Saltar» a la vez: `.saltar-escena` se muestra con `body.en-escena`; un módulo nuevo
  usa su propia clase de `body` y su propia regla CSS.
- Botón táctil que no se oculta con `hidden`: `.tactil-boton` tiene `display: flex`; agrega
  `.tactil-boton.sv-<nombre>[hidden] { display: none; }`.
- Globo enorme en celular: `crearGlobo` mide 3 × 1,25 bloques; para un texto corto achícalo
  (`globo.sp.scale.set(1.4, 0.58, 1)`) y ponlo un poco hacia el centro de la escena.
- `pausar()` congela tu reloj, **no** el de la cámara (que corre en tiempo real y cambia de plano
  cada 4,2 s): en capturas fija el plano con `--plano k`.
- Al empezar otra vez la misma interacción, reinicia su estado suavizado (`cur`), o arranca
  desde la pose en que quedó la vez anterior.

## 6. Entrega

Resume: qué hace la animación, la tabla de tiempos final, tecla/botón, archivos tocados, las
capturas revisadas (rutas) y cualquier decisión que tomaste por tu cuenta.
