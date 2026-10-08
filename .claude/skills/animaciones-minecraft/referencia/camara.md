# Cámara de cine (`mundo/supervivencia/camaras.js`)

Una sola cámara de cine sirve para dos cosas:

| Modo | Cuándo | Planos | Encuadre |
|---|---|---|---|
| **Misión** (`escena: false`) | mientras está abierto el panel de misión de un amigo (`abrirPanel(el, { enfocar: n })` en `main.js`) | `PLANOS` (6) | el amigo; **regla de tercios**: el sujeto arriba a la derecha y el panel abajo a la izquierda |
| **Escena** (`escena: true`) | escenas de skin y cualquier animación nueva con dos actores | `PLANOS_ESCENA` (7) | gira en torno al **punto medio** amigo–jugador; `enfocar(f)` inclina hacia uno |

Ambos modos: franjas negras arriba y abajo (`body.en-cine`), HUD oculto, cada plano dura
`DURACION = 4.2` s con un movimiento lento (`orbita`, `dolly`), y entre planos un fundido negro
de 0,35 s. Si un plano queda tapado por bloques, salta al siguiente; si ninguno sirve, `rescate()`.

## API

```js
camaras.iniciarCine(n, { escena: true, fundido: 0.45, evitar: [amigo1, amigo2] });
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

## Agregar un plano

1. Copia una entrada de `PLANOS_ESCENA` (o `PLANOS`) con un `nombre` claro y cambia `ang`, `dist`,
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
