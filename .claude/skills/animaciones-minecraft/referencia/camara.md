# Cámara de cine (`mundo/supervivencia/camaras.js`)

Una sola cámara de cine sirve para dos cosas:

| Modo | Cuándo | Planos | Encuadre |
|---|---|---|---|
| **Misión** (`escena: false`) | mientras está abierto el panel de misión de un amigo (`abrirPanel(el, { enfocar: n })` en `main.js`) | `PLANOS` (6) | el amigo; **regla de tercios**: el sujeto arriba a la derecha y el panel abajo a la izquierda |
| **Escena** (`escena: true`) | escenas de skin y cualquier animación nueva con dos actores | `PLANOS_ESCENA` (7) | gira en torno al **punto medio** amigo–jugador; `enfocar(f)` inclina hacia uno |
| **Escena con actor bajo** (`escena: true, planos: 'gata'`) | caricias a las gatas; úsalo para cualquier animal | `PLANOS_GATA` (4: de lado, tres cuartos, el otro lado, picado) | igual, pero sin planos sobre el hombro (el jugador tapaba a la gata) |

Ambos modos: franjas negras arriba y abajo (`body.en-cine`), HUD oculto, cada plano dura
`DURACION = 4.2` s con un movimiento lento (`orbita`, `dolly`), y entre planos un fundido negro
de 0,35 s. Si un plano queda tapado por bloques, salta al siguiente; si ninguno sirve, `rescate()`.

## API

```js
camaras.iniciarCine(n, { escena: true, fundido: 0.45, evitar: [amigo1, amigo2], planos: 'gata' /* opcional */ });
// n: cualquier objeto con x, y (del creativo: adentro se le suma dy), z y escala opcional.
//    La "cabeza" que encuadra está a y + dy + 1.55·escala. Para una gata usa escala ≈ 0.5.
// evitar: actores con .p.cabeza y .p.torso; la cámara no se acerca a menos de 1,7 / 1,4 de ellos.
camaras.enfocar(0.32);     // 0 = el actor, 1 = el jugador, 0.5 = los dos (solo modo escena)
camaras.pose = (cuerpo, dt) => { … };  // escribe la pose del cuerpo del jugador cada cuadro
camaras.fijarPlano(k);     // depuración: queda en el plano k (null para soltar)
camaras.terminarCine();
camaras.cuerpo;            // el modelo del jugador (rig de persona)
camaras.enCine;            // ¿está activa?
```

## Campos de un plano

Los ángulos se miden alrededor de la línea **amigo → jugador** (`base`):

| Campo | Significado | Misión | Escena |
|---|---|---|---|
| `ang` | ángulo de la cámara respecto a `base` (rad). 0 = detrás del jugador mirando al amigo (escena) / del lado del jugador (misión); `Math.PI` = detrás del amigo; `±Math.PI/2` = de lado | desde el amigo | desde el punto medio |
| `dist` | distancia (bloques). `null` = automática: misión `distJ + 2.4`, escena `distJ·0.5 + 1.8` | | |
| `alto` | altura de la cámara sobre los pies del amigo. 1.6–1.95 ojos; 0.7–0.8 contrapicado; 5.5 picado | | bajo techo prueba hasta 1.3 |
| `mira` | (misión) 0 = mira al amigo, 1 = entre los dos | ✔ | (usa `foco`) |
| `orbita` | cuánto gira durante el plano (rad, en 4,2 s). ±0.05 sutil, ±0.18 notorio | | |
| `dolly` | cuánto se acerca (negativo) durante el plano (bloques) | | |

Planos actuales de escena: `dos` (de lado, los dos), `hombro jugador`, `hombro amigo`, `general`,
`hombro amigo, otro lado`, `contrapicado`, `hombro jugador, otro lado`. Se recorren en orden.

**Reloj**: la cámara cuenta su propio tiempo real; el `pausar()` de una escena no la detiene.
Para capturas, fija el plano (`fijarPlano(k)` o `capturar.mjs --plano k`).

## Reglas de lenguaje de cámara (síguelas al diseñar planos)

1. **Regla de los 180°**: alterna planos del mismo lado de la línea amigo–jugador. Si cruzas al
   otro lado (`otro lado`), que sea después de un plano neutro (`dos` o `general`).
2. **Plano/contraplano** para diálogos: sobre el hombro del que escucha, mirando al que habla.
   Por eso `enfocar` sigue a quien habla.
3. **De más abierto a más cerrado** al empezar (general → dos → hombro) y vuelve a abrir al final.
4. **Movimiento siempre lento** (`orbita` ≤ 0.2, `dolly` ≤ 0.8 por plano) y nunca dos
   movimientos fuertes seguidos.
5. **Altura de ojos** por defecto (1.6–1.95). Contrapicado (0.7) para algo heroico o gracioso;
   picado (5.5) para mostrar el lugar.
6. **Animación pequeña (gata, objeto)**: usa `escala` chica en `iniciarCine` para que el encuadre
   baje, y planos más cercanos (dist 2–3.4) a la altura del pecho (alto 1.1–1.4).
7. Nada de cámara en mano ni sacudones salvo un golpe/explosión.

## Interiores estrechos (iglú, casas)

- Antes de preferir «desde la entrada», **mide la entrada**: el túnel del iglú tiene 1 bloque de
  ancho y desde ahí solo se ve lo que queda en su eje.
- Si tu módulo reorienta la cámara después de `camaras.actualizar` (p. ej. `camara.lookAt(...)` cada
  cuadro, como la ronda), la dirección real no es `objetivo`: tenlo en cuenta al medir.

En un espacio de radio ~3 casi cualquier plano tiene algo delante. Reglas aprendidas:
- Nada en primer plano tapa más de **1/4 del cuadro**: ni un barril, ni la espalda de un actor, ni
  una pared. Revisa cada plano con `--plano k` y descarta o mueve el que falle.
- Prefiere planos **desde la entrada** (el túnel) y laterales a la altura del pecho (alto 1.3–1.6) a los
  planos «sobre el hombro» (en interiores el hombro llena media pantalla).
- `evitar` solo sabe de actores: los muebles hay que esquivarlos eligiendo `ang`/`dist` a mano.
- Pocos planos buenos (3) valen más que 5 con dos malos.

## Primero la puesta en escena, después la cámara

Lección del iglú: tras 1845 posiciones de cámara probadas, ningún punto veía las tres caras,
porque **los actores estaban mal ubicados para la cámara**, no la cámara para los actores. En cine
se «hace trampa» con las posiciones: se acomoda a la gente para el plano.

- Antes de diseñar planos, decide **dónde se paran o sientan los actores** (y el jugador): en
  **arco abierto** (media luna) mirando hacia el lado con más espacio libre, no en triángulo cerrado.
  Así un plano desde ese lado ve todas las caras.
- Puedes mover a los actores **solo durante la escena** (como `iniciar` en `escenas-skin.js` mueve al
  jugador bajo el fundido) y devolverlos al terminar. También puedes elegir otro lugar para el
  asiento o el objeto de la interacción.
- Deja **≥ 2 bloques libres** entre la cámara y el actor más cercano: si el espacio no lo da, cambia
  la puesta en escena, no aprietes la cámara.
- Cuando la acción mete un brazo u objeto en cuadro (pasar el pito), el plano de ese momento debe
  ser uno donde esa acción ocurra **de perfil**, no hacia la cámara.

## Método para diseñar planos (síguelo en orden)

0. **Puesta en escena** (sección anterior): ¿están los actores en arco y mirando a un lado libre?
1. **Mapa de planta en texto**: anota en coordenadas del mundo dónde están las paredes, muebles
   (bloques: `mundo.bloque(x, y, z)` en la zona), los actores (cabezas) y la entrada. Escríbelo como
   tabla o rejilla ASCII antes de elegir ángulos: así ves desde dónde hay línea limpia.
2. **Candidatos**: propón 6–8 posiciones de cámara en ese mapa (desde la entrada, laterales,
   contrapicado, cenital) y descarta las que tengan un mueble o pared entre la cámara y algún actor.
3. **Comprobación automática**: para cada plano, la línea cámara → **cabeza de cada actor** debe
   estar libre (no solo cámara → objetivo, que es lo que revisa `calcular`). Si agregas esta
   comprobación a `camaras.js` (p. ej. una opción `visibles: [actores]` que descarte el plano si
   alguno queda tapado) y expones `camaras.diagnostico = { nombre, tapados: [...] }`, `planos.mjs`
   la imprime por plano.
   Ya existe: `iniciarCine(n, { …, visibles: [actor1, actor2] })` descarta posiciones donde un
   bloque o **otra persona** tapa la cabeza de un actor o del jugador, y donde la cámara quedaría
   dentro de un bloque; `camaras.diagnostico` y `camaras.planoActual` lo informan.
   Para saber qué **cara** ve la cámara: la cara está en la cara +Z de la cabeza, y la cabeza gira
   hacia quien mira (`cuello.rotation.y`, hasta ±1,1 rad); una cabeza puede verse y aun así de nuca.
   Ojo: `mundo.bloque(x, y, z)` usa la **y del mundo** (creativo + `dy`).
4. **Hoja de planos** (`planos.mjs`): mira todos los planos juntos. Para cada uno responde: ¿se ven
   las caras de todos?, ¿algo tapa más de 1/4?, ¿es distinto de los demás (tamaño o ángulo)?, ¿la
   franja o los botones cortan una cabeza? Corrige y repite hasta que todos pasen.
5. **Variedad con propósito**: un plano de situación (general), uno de dos o tres (medio), un
   primer plano de quien actúa y, si cabe, uno con ángulo distinto (contrapicado/cenital). Dos planos
   casi iguales seguidos = un plano de más.
6. **Video**: confirma en movimiento (`grabar.mjs`); `orbita`/`dolly` pueden meter algo en cuadro.

## Conjunto de planos nuevo

Agrega una lista (`PLANOS_<NOMBRE>`) junto a las otras y su valor en `iniciarCine(n, { planos: '<nombre>' })`
(mira cómo se resolvió `'gata'` y `'trio'` en la función `planos()`). El ancla `n` puede ser un punto
cualquiera `{ x, y, z, escala }` (p. ej. el punto medio entre dos actores), no tiene que ser un actor.

## Agregar un plano

1. Copia una entrada de `PLANOS_ESCENA`, `PLANOS_GATA` o `PLANOS` (o crea una lista nueva y su
   valor de `planos` en `iniciarCine`, como hizo `'gata'`) con un `nombre` claro y cambia `ang`, `dist`,
   `alto`, `orbita`, `dolly`.
2. Ubícala en el orden en que quieres que aparezca (se recorren en orden circular).
3. Prueba con `capturar.mjs --plano <índice>` en una escena forzada y mira:
   ¿se ven las dos caras?, ¿nadie queda cortado por el borde o la franja?, ¿no atraviesa un bloque?
4. Si un actor es chico (gata), prueba también ese plano con la escena de la gata.

## Secuencia guionada (si la necesitas)

Hoy los planos rotan solos cada 4,2 s. Si una animación necesita **cortes en segundos exactos**,
agrega a `iniciarCine` una opción `secuencia: [[0, k0], [1.8, k1], …]` que, en `actualizar`,
elija `cine.plano` según el tiempo y ponga `cine.fundido = 0.35` en cada cambio (mantén el
comportamiento actual cuando no se pasa). Documenta la opción en el comentario de cabecera.
