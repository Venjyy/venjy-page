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
ese pedido **no programa la animación**: escribe el encargo, lanza el subagente con el modelo pedido,
revisa lo que entrega (video, hojas, medidas) y lo presenta. Si no se nombra el modelo, usa la tabla:

| Modelo | Costo | Úsalo para | Ejemplos probados |
|---|---|---|---|
| **Haiku** (por defecto) | bajo | tipos A y B simples, interacciones con tecla, gestos nuevos, escenas cortas de 1–2 actores en lugares abiertos | caricias a las gatas (bien al primer intento); ronda del iglú desde cero (buena mecánica, ~50 min). Sus pasadas de cámara empeoraron la escena (la dejó estática); la versión final la corrigió Opus |
| **Sonnet** | medio | escenas con 3+ actores, interiores estrechos, puesta en escena y cámara difíciles, cuando Haiku falló dos veces en lo mismo | — |

**Plantilla del encargo** (cópiala y llena los `<…>`):

```
Trabajas en /home/user/venjy-page. Lee enteros CLAUDE.md, .claude/skills/animaciones-minecraft/SKILL.md
y todos los archivos de su carpeta referencia/, y sigue la skill al pie de la letra.
Lee además: <archivos del lugar/actores: p. ej. mundo/gatas.js, la sección X de mundo/criaturas/amigos.js>.
TAREA: <qué pasa, quiénes, dónde, cómo se activa (tecla/botón/al acercarse), cuánto dura, cómo se sale>.
Decisiones del dueño: <cámara, efectos, quién puede, textos especiales…>.
Entrega: guion con tabla de tiempos antes del código, capturas medidas, hoja de planos si hay cámara,
video con grabar.mjs, pruebas del repo, PENDIENTES.md actualizado.
Temporales SOLO en <scratchpad>/<carpeta>/. NO hagas commit ni push. No edites la skill.
Responde con: qué hace + tabla de tiempos, teclas/botones, archivos, rutas de capturas/video y qué
viste, pruebas, y lo que de la skill fue confuso o faltó.
```

**Costo**: con Haiku 5.5 el precio sube 5× cuando el contexto pasa de 100K tokens ($0,10 → $0,50 de
entrada). En las pruebas los subagentes llegaron a 300–480K porque leían archivos enteros. En el
encargo pide **leer solo las secciones necesarias** (`grep -n` y luego `Read` con offset/limit) y no
releer capturas viejas; así una animación cuesta varias veces menos.

**Límite de una pasada**: si el subagente lleva dos pasadas sobre lo mismo sin mejorar (sobre todo
cámara y puesta en escena), no lances una tercera con el mismo modelo: súbelo a Sonnet o corrígelo tú.

Al recibir el resultado: mira tú mismo la hoja de cuadros del video
(`referencia/verificar.md` §2b), corre las pruebas, y si algo se ve mal pide una pasada más al
mismo subagente o súbelo a Sonnet. Lleva a la skill lo que el subagente diga que faltó.

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
