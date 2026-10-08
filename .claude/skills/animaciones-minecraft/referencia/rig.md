# Rig, signos y atlas de poses

## 1. Persona de cajas (`crearPersona` en `mundo/criaturas/cuerpo.js`)

Mide ~2 bloques. Mira hacia **+Z**; su derecha es **−X**. Pies en el origen de `g`.

| Hueso | Qué es | Pivote (local) | Medidas de la caja |
|---|---|---|---|
| `g` | raíz: posición en el mundo y `rotation.y` (hacia dónde mira) | pies | — |
| `cuerpo` | grupo del que cuelga todo: inclinar, ladear, subir/bajar | pies (0, 0, 0) | — |
| `torso` | caja del tronco (no se rota sola) | centro (0, 1.125, 0) | 0.5 × 0.75 × 0.25 |
| `cuello` | grupo de la cabeza | (0, 1.5, 0) | — |
| `cabeza` | la caja de la cabeza (dentro de `cuello`) | (0, 0.25, 0) en `cuello` | 0.5 × 0.5 × 0.5 |
| `brazoD` / `brazoI` | brazos (cuelgan del hombro) | (−0.375 / +0.375, 1.5, 0) | 0.25 × 0.75 × 0.25 |
| `piernaD` / `piernaI` | piernas (cuelgan de la cadera) | (−0.125 / +0.125, 0.75, 0) | 0.25 × 0.75 × 0.25 |

### Nombres cortos (los usan `GESTOS`, `leer`/`escribir` de `escenas-skin.js` y `posar.mjs`)

| Campo | Propiedad real | Signo: valor **positivo** hace… | Rango útil |
|---|---|---|---|
| `cx` | `cuello.rotation.x` | **mirar abajo** (negativo = mirar arriba) | −0.45 … 0.5 |
| `cy` | `cuello.rotation.y` | girar la cara hacia **su izquierda** (+X) | −1.1 … 1.1 |
| `cz` | `cuello.rotation.z` | ladear la cabeza hacia **su hombro derecho** (−X) | −0.2 … 0.2 |
| `bDx` / `bIx` | `brazoD/I.rotation.x` | brazo **hacia atrás** (negativo = adelante y arriba) | −2.9 … 0.6 |
| `bDz` | `brazoD.rotation.z` | mano derecha **hacia el pecho** (negativo = hacia afuera) | −0.8 … 0.9 |
| `bIz` | `brazoI.rotation.z` | mano izquierda **hacia afuera** (negativo = hacia el pecho) | −0.9 … 0.8 |
| `pDx` / `pIx` | `piernaD/I.rotation.x` | pierna **hacia atrás** (negativo = adelante; −1.5 sentado) | −1.6 … 0.6 |
| `inc` | `cuerpo.rotation.x` | **todo** el cuerpo se inclina adelante, girando en los pies | −0.2 … 0.7 |
| `rz` | `cuerpo.rotation.z` | ladear todo el cuerpo | −0.15 … 0.15 |
| `y` | `cuerpo.position.y` | subir el cuerpo (saltito, compensar) | −0.7 … 0.6 |

Regla de espejo: para que el brazo izquierdo haga lo mismo que el derecho, **mismo `x`, `z` con
signo contrario** (`bIx = bDx`, `bIz = -bDz`).

### Geometría útil (para que una mano llegue a un punto)

Con el brazo girado `a` en x (y sin `z`), la mano (punta del brazo) queda, en coordenadas del
cuerpo, a:

```
adelante = -0.75 * Math.sin(a)        // a negativo → adelante
altura   = 1.5 - 0.75 * Math.cos(a)   // a = 0 → 0.75 (cuelga), a = -π/2 → 1.5 (horizontal)
```

Si además el cuerpo se inclina `inc = φ`, el hombro se mueve a `(adelante 1.5·sin φ, altura 1.5·cos φ)`
y el ángulo real del brazo respecto del suelo es `a + φ`. Para alcanzar un punto a `dz` adelante y
`h` de alto: `a + φ = -Math.atan2(dz - 1.5*Math.sin(φ), (1.5*Math.cos(φ)) - h)` (comprueba con
`posar.mjs` y una caja de referencia).

### ⚠️ `inc` inclina también las piernas

`cuerpo` contiene las piernas: con `inc` solo, el personaje parece caerse. Para **doblarse de
cintura** con las piernas rectas hay que compensar:

```js
pDx = pIx = -φ;                          // piernas de vuelta a la vertical
y = 0.75 * (1 - Math.cos(φ));            // que los pies no se hundan
// los pies quedan 0.75·sin(φ) por delante del origen: ubica al actor un poco más atrás
```

(El agachado de Minecraft con Shift usa `inc = 0.35` sin compensar porque es breve; para una pose
que se sostiene, compensa.)

## 2. Atlas de poses probadas

Valores verificados con `posar.mjs`. Lo que no se nombra queda en neutral (0, con `bDz 0.05` y
`bIz -0.05`). Úsalos como punto de partida y ajusta mirando la captura.

| Pose | Valores | Notas |
|---|---|---|
| Neutral de pie | `bDz 0.05, bIz -0.05` | |
| Hablar | `bDx -0.9 + sin(t*5)*0.3, bDz 0.2 + sin(t*3.1)*0.15, bIx -0.55 + sin(t*4+1)*0.2, bIz -0.15, cx sin(t*6)*0.06` | gesto `habla` |
| Sorpresa | `bDx -2.8, bDz -0.3, bIx -2.8, bIz 0.3, cx -0.3`, saltito `y = sin(u·π/0.4)*0.55` al inicio | `sorpresa` |
| Rascarse la cabeza | `bDx -2.85 + sin(t*14)*0.08, bDz 0.42, cx 0.12, cz 0.15` | `rasca` |
| Señalarse | `bDx -1.25, bDz 0.85, cx 0.3` | `yo` |
| Señalar al otro | `bDx -1.6, bDz 0.05` | `tu` |
| Saludar | `bDx -2.7, bDz -0.35 + sin(t*9)*0.35` | `saluda` |
| Brazos arriba (celebrar) | `bDx -2.85, bDz -0.35, bIx -2.85, bIz 0.35, cx -0.35` | `brazosArriba` |
| Reír | `bDx -0.55, bDz 0.35, bIx -0.55, bIz -0.35, cx -0.35`, `y = abs(sin(t*17))*0.05` | `risa` |
| Pasar/recibir un objeto | `bDx -1.35, bDz 0.1, cx 0.1` | `pasa` |
| Dar la mano | `bDx -1.45, bDz 0.15` | `mano` |
| Brazo horizontal adelante | `bDx -1.57` | mano a 1.5 de alto, 0.75 adelante |
| **Doblarse de cintura y bajar la mano** | `inc 0.6, pDx -0.6, pIx -0.6, y 0.13, bDx -0.55, bDz 0.12, bIx 0.25, cx 0.3` | mano a ~0.75 de alto y ~1.1 adelante de los pies; sirve para tocar algo de ~0.7 de alto |
| **Sentado en el suelo** | `y -0.62, pDx -1.45, pIx -1.45, inc 0.15, bDx -1.0, bDz 0.1, cx 0.35` | piernas estiradas adelante; mano a ~0.5 de alto |
| Sentado en silla/tronco | `pDx -1.5, pIx -1.5` y el actor puesto 0.6 más alto | lo usan los amigos del campamento |

## 3. Gatas (Mila y Gala, `mundo/gatas.js`)

Miran hacia **+Z** (su `yaw` va en `g.rotation.y`). Están en `vista.grupo`: su pie en el mundo
está en `gata.y + dy`.

| Parte | Qué es |
|---|---|
| `gata.g` | raíz (`position` = `gata.x, gata.y, gata.z`, `rotation.y = gata.yaw`) |
| `gata.tronco` | pivote en la grupa (atrás, a la altura de la barriga); todo cuelga de aquí |
| `gata.cabeza` | grupo de la cabeza (con orejas); `rotation.y` ya sigue al jugador cerca |
| `gata.patas[0..3]` | 0 y 1 delanteras, 2 y 3 traseras (pivote arriba) |
| `gata.cola` | grupo de la cola; `rotation.y` la menea, `rotation.x` la sube/baja (base ≈ −0.9) |
| `gata.e` | medidas: Mila `{ largo 1.15, ancho 0.8, alto 0.7, patas 0.46, cabeza 0.62 }`, Gala `{ 1.0, 0.6, 0.56, 0.5, 0.52 }` |
| `gata.pose` | `'pie'`, `'sentada'` o `'echada'`; `gata.bs` / `gata.be` son sus pesos (se mezclan solos) |

Alturas aproximadas: de pie el lomo está a `patas + alto` (Mila 1.16, Gala 1.06) y la cabeza un
poco más arriba; **echada** el lomo queda a ~`alto` (Mila 0.73, Gala 0.6). En coordenadas de
`g`, el cuerpo va de la grupa en `z = −largo/2` al pecho en `z = +largo/2`, y la cabeza está
justo delante, en `z ≈ largo/2 + cabeza·0.3`. Para tocarle **el lomo** apunta a `z ≈ −largo·0.1`
(un poco detrás del centro); para la **cabeza**, a `z ≈ largo/2 + 0.15`.

Para animarla desde fuera hay que agregar un gancho (no existe aún) en `actualizarGata`:
ver `referencia/escenas.md` §3.
