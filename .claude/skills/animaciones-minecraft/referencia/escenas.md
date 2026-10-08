# Gestos, escenas y nuevas interacciones

Todo lo de §1 y §2 vive en `mundo/supervivencia/escenas-skin.js` (motor) y
`mundo/supervivencia/escenas-datos.js` (textos y guiones). §3 es para módulos nuevos.

---

## 1. Tipo A · Gestos y escena corta (detección de la skin base)

### Cómo funciona

1. Cada 0,25 s `actualizar` busca un amigo a ≤ 6 bloques, con línea de vista, cuya clave sea
   `skin.base` (`tipoSkin`), que no se haya visto (`misiones.estado.escenasSkin`).
2. `iniciar` congela al jugador, lo acerca si quedó lejos (`lugarCerca`), lo hace mirar al amigo,
   arma el **guion** (`lineas`) y la **pista** de gestos, pone `n.escena` y abre la cámara de cine.
3. Cada cuadro `aplicar(actor, dt)` calcula la pose:
   `neutral → (gesto con peso w) → suavizado → mezcla con la animación normal (peso de la escena wS)`.
   La mirada (`cx`, `cy`) se calcula sola hacia quien habla.
4. Al terminar (`T`) o saltar, `terminar` restaura todo.

La corta dura `T = 6.6` s y su pista es fija (fracciones de `T`):

```js
[['doble', 0, 0.09], ['sorpresa', 0.07, 0.29], ['rasca', 0.27, 0.5], ['yo', 0.48, 0.7], [fin, 0.68, 0.93]]
```

Los tramos **se solapan un poco** (0.07 < 0.09): así un gesto entra mientras el anterior sale.

### Un gesto es una función

```js
// u: 0..1 dentro de su tramo · t: reloj de la escena (s) · s: está sentado · j: es el jugador
miGesto: (u, t, s, j) => ({ bDx: -2.7, bDz: -0.35 + Math.sin(t * 9) * 0.35, cx: -0.1 }),
```

Devuelve solo los campos que cambia (ver `referencia/rig.md`). Extras: `cy` se **suma** a la
mirada automática; `salto` se suma a `y` (úsalo con `Math.sin(...)` para que vuelva a 0).

Receta para un gesto nuevo:

1. Diseña la pose meta con `posar.mjs` hasta que se lea bien de frente y de lado.
2. Agrega la entrada en `GESTOS` con un comentario de una línea si no es obvia.
3. Agrega 1 movimiento secundario (un `sin` pequeño) para que no quede de estatua.
4. Si es para un sentado, usa `s` para no hacer saltar a quien está sentado (`s ? 0 : …`).
5. Úsalo: en la pista de la corta, en `finIdentica` / `finBasada` de `CORTAS`, o como `g`/`o` de
   una línea en `VENJY`.

### Frases de la corta (`CORTAS` en `escenas-datos.js`)

```js
pony: {
    identica: [F('…', '…'), F('…', '…'), F('…', '…')],   // tu skin no cambió nada
    basada:   [F('…', '…'), F('…', '…'), F('…', '…')],   // cambiaste colores o ropa
    finIdentica: 'baile', finBasada: 'brazosArriba'        // opcional: último gesto (por defecto 'tu')
}
```

Tres frases cortas (≤ 45 letras), tono de amigos chilenos, la 1 reacciona, la 2 nombra un rasgo
de la skin, la 3 es un remate con su personalidad (`PRODUCT.md` y los comentarios de cada amigo
en `criaturas/amigos.js` dicen cómo es cada uno).

---

## 2. Tipo B · Escenas avanzadas (al detectar a Venjy)

### Conversación por turnos (`VENJY[clave]`)

```js
F('texto es', 'texto en', { q: 'n', g: 'sorpresa', o: 'risa' })
```

- `q`: quién habla: `'n'` el amigo, `'j'` el jugador, `'ambos'`, o la clave del actor (`'lalo'`).
- `g`: gesto de quien habla (si falta, `'habla'`). `o`: gesto de quien escucha (si falta, quieto).
- Los tiempos son **automáticos**: empieza en 1,3 s y cada frase dura `1,8 + letras·0,045`
  (entre 2,5 y 3,8). `T` = fin de la última + 1,1. La escena empieza con `doble` (la doble mirada).
- La cámara se inclina sola hacia quien habla (`camaras.enfocar`: 0,32 amigo, 0,68 jugador).
- 6 turnos alternados, de 20 a 24 s en total. Cierra con un gesto de remate (`mano`, `risa`,
  `brazosArriba`) y, si se puede, que **los dos** hagan algo juntos (`o` igual a `g`).

### Guion con tiempos fijos (como `IGLU`)

Cuando hay objetos o efectos amarrados al tiempo, cada línea lleva `a` (inicio) y `d` (duración)
en segundos y la escena tiene su `DURACION_*`. Escribe primero la tabla:

| s | Lalo | Moisés | Jugador | Objeto / efecto |
|---|---|---|---|---|
| 0.4 | sorpresa «¿Venjy?» | mira | mira | — |
| 4.6–5.8 | pasa | — | recibe | el pito vuela de su mano a la tuya |
| 6.0–10.8 | mira | mira | fuma: sube la mano 1 s, aspira 1,4 s, baja, bota humo | brasa encendida, humo, tos |

### Coherencia del guion con lo que se ve

Lo que dicen los globos tiene que calzar con el estado del cuerpo **en ese momento**: si alguien
dice «siéntate», el jugador todavía está de pie y se sienta **después** (y puede responder con un
gesto). Revisa cada frase contra la captura de su segundo.

### Pases coordinados (anticipación)

Un pase se lee bien solo si los dos se miran y se apuntan:
1. **Anticipación** (0,3–0,4 s): el que da se gira hacia el que recibe y estira el brazo; el objeto
   sigue en su mano.
2. **Vuelo**: recién ahí el objeto sale, en arco, desde la mano (posición viva) hasta la mano del otro.
3. **Atrapar**: el que recibe ya tiene el brazo estirado **hacia el que da** y lo baja con el objeto.
El brazo apunta con `bDz` = ángulo local hacia el otro (`atan2(dx, dz) − yaw`, + hacia su
izquierda, límite ±1,1); a los de pie además se les gira el cuerpo (`n.yaw`) y se restaura al
final. Ejemplo: `pesoPase`, `haciaLocal` y `segObjeto` en `ronda-iglu.js`.

### Objeto que pasa de mano en mano (patrón de `fumarJugador`)

```js
// Vuelos: [objeto, desde, hacia, inicio, fin]
const VUELOS = [['pito', 'lalo', 'j', 4.6, 5.8], ['pito', 'j', 'lalo', 9.8, 11.0]];
// 1) al empezar el vuelo: soltar el objeto al grupo del mundo SIN que salte
g.parent.updateMatrixWorld(true); grupo.attach(g);          // attach conserva la posición en el mundo
// 2) durante: mezcla entre donde estaba y la mano de destino, con un arco
g.position.copy(desde).lerp(manoDe(hacia, objeto, v), suave(u));
g.position.y += Math.sin(u * Math.PI) * 0.35;
// 3) al llegar: colgarlo del brazo de quien lo recibe, en la punta de la mano
brazo.add(g); g.position.set(0, -0.68, 0.12); g.rotation.set(-0.6, 0, 0);
```

`manoDe` usa `brazo.localToWorld(...)` y luego `grupo.worldToLocal(...)`: siempre convierte entre
sistemas así (nunca sumes `dy` a mano a un objeto colgado de un hueso). **Al saltar a la mitad**,
devuelve cada objeto a su dueño.

### Efectos que ya existen

- Humo y burbujas del iglú: `amigos.iglu.emitir(x, y, z, { s, dur, vy, vx, vz })`, `iglu.burbujas`,
  `iglu.tos(quien, fuerza)`. **`emitir` usa coordenadas de `grupo`** (las criaturas subidas `dy`):
  si tienes un punto del mundo (`getWorldPosition`, `localToWorld`), conviértelo con
  `grupo.worldToLocal(v)` antes; si no, el humo sale 48 bloques abajo. `iglu.boca(n)` ya devuelve
  coordenadas de `grupo`.
- Corazones pixelados que suben y se desvanecen: `texCorazon` y `corazon(x, y, z)` en
  `supervivencia/ganado.js` (cópialos a tu módulo si los necesitas; son ~15 líneas).
- Partículas de bloques: `particulas.romper(id, x, y, z)` (`supervivencia/particulas.js`).
- Sonido: WebAudio sintetizado. `audioMundo()`, `sonando()` y `cuandoHayaAudio` en
  `criaturas/cuerpo.js`; ejemplos: `maullar` y el ronroneo en `gatas.js`, `sonidos.js`. Nunca
  archivos de audio. Respeta `sonando()` (el interruptor de sonido).
- Globos de texto: `crearGlobo(grupo)` → `globo.decir(texto)` y cada cuadro
  `globo.actualizar(dt, visible, x, y, z)` (coordenadas de `grupo`, encima de la cabeza:
  `y + alto + 0.6`).

---

## 3. Interacción nueva con una tecla (módulo propio)

Ejemplo: acariciar a una gata, chocar los cinco con un amigo, darle de comer a un animal.

### 3.1 Guion (escríbelo antes)

| s | Jugador | Actor | Cámara | Efectos |
|---|---|---|---|---|
| 0–0.4 | camina/gira hacia el actor (bajo el fundido) | deja lo que hacía | fundido de entrada | — |
| 0.4–1.2 | entra en la pose de alcance | se acomoda (sentada/echada) | plano de dos | — |
| 1.2–4.4 | gesto principal en bucle (2–3 pasadas) | reacciona (cabeza, cola, ojos) | otro plano o el mismo con dolly | sonido, partículas |
| 4.4–5.4 | vuelve a neutral | vuelve a lo suyo | — | — |

### 3.2 Esqueleto del módulo (`mundo/supervivencia/<nombre>.js`)

```js
// =========================================================
// VENJY · Supervivencia · <Nombre>
// <Qué pasa, con qué tecla, cuánto dura, cómo se salta.>
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));

const TXT = { es: { saltar: 'Saltar' }, en: { saltar: 'Skip' } };
const T = 5.4; // duración total (s)

export function crear<Nombre>(ctx) {
    const { grupo, dy, mundo, jugador, camaras, misiones, puede, bloquear, liberar } = ctx;
    let idioma = ctx.idioma || 'es';
    let estado = null, pausada = false;

    // Botón «Saltar» propio (el de escenas-skin se muestra con body.en-escena; este con body.en-<nombre>)
    const boton = document.createElement('button');
    boton.type = 'button'; boton.className = 'boton saltar-escena saltar-<nombre>';
    boton.textContent = TXT[idioma].saltar;
    boton.addEventListener('click', e => { e.preventDefault(); terminar(); });
    document.body.appendChild(boton);
    document.addEventListener('keydown', e => { if (estado && e.code === 'Escape' && !e.repeat) { e.preventDefault(); terminar(); } });

    // ¿Hay algo que tape la vista? (igual que en escenas-skin.js)
    const opaco = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };

    function objetivoCercano() {
        // Devuelve el actor más cercano a ≤ 2,5 bloques (en x/z) y a ≤ 1,5 de altura (¡con + dy!)
    }

    function iniciar(actor) {
        bloquear();
        // 1) Ubicar al jugador a la distancia buena del actor y que lo mire
        jugador.yaw = Math.atan2(actor.x - jugador.pos.x, actor.z - jugador.pos.z) - Math.PI;
        jugador.pitch = 0;
        // 2) Tomar el control del actor (gancho) y guardar lo que hay que restaurar
        for (const k in cur) delete cur[k];            // el suavizado parte de cero en cada vez
        estado = { t: 0, actor, foto: { /* pose / yaw / estado del actor */ } };
        actor.escena = (dt, tiempo) => animarActor(dt);
        // 3) Cámara de cine: iniciarCine lee n.x, n.y (+ dy adentro), n.z y n.escala (alto de la cabeza = 1.55·escala)
        // Con un actor bajo (gata, animal) usa planos: 'gata' (PLANOS_GATA): los de dos personas lo tapan
        camaras.iniciarCine({ x: actor.x, y: actor.y, z: actor.z, escala: 0.6 }, { escena: true, fundido: 0.4, planos: 'gata' });
        camaras.pose = (cuerpo, dt) => poseJugador(cuerpo, dt);
        misiones.ocultarMarcas = true;                 // sin «!» de misión en el encuadre
        document.body.classList.add('en-<nombre>');
    }

    function terminar() {
        if (!estado) return;
        const e = estado; estado = null;
        delete e.actor.escena;
        // restaurar el actor (pose, yaw, lo que tocaste) y TODO el cuerpo del jugador:
        const c = camaras.cuerpo;
        c.cuerpo.position.y = 0; c.cuerpo.rotation.x = 0; c.cuerpo.rotation.z = 0;
        for (const h of [c.brazoD, c.brazoI, c.piernaD, c.piernaI, c.cuello]) { h.rotation.x = 0; h.rotation.z = 0; }
        c.cuello.rotation.y = 0;
        camaras.terminarCine();
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-<nombre>');
        liberar();
    }

    // Pose del jugador: neutral → pose de alcance (peso w) → gesto en bucle → suavizado
    const cur = {};
    function poseJugador(c, dt) {
        if (!estado) return;
        const t = estado.t;
        const w = envolvente(t, 0.4, T - 0.6, 0.7);      // entra y sale de la pose
        const meta = { /* ver referencia/rig.md: p. ej. doblarse de cintura */ };
        // ...escribir con suavizado: cur[k] += (meta[k] - cur[k]) * Math.min(1, dt * 10)
    }
    function animarActor(dt) { /* pose del actor con easing; NO lo muevas de lugar */ }

    function actualizar(dt) {
        if (!estado) return;
        if (!pausada) estado.t += dt;
        camaras.enfocar(0.5);
        if (estado.t >= T) terminar();
    }
    function intentar() {
        if (estado || !puede()) return false;
        const a = objetivoCercano();
        if (!a) return false;
        iniciar(a);
        return true;
    }

    return {
        actualizar, intentar, saltar: terminar,
        get activa() { return !!estado; },
        setIdioma(l) { idioma = l; boton.textContent = TXT[idioma].saltar; },
        // Depuración (capturas): forzar con un actor concreto, detener el reloj, ir a un segundo
        forzar(actor) { if (!estado) iniciar(actor); return !!estado; },
        pausar(v = true) { pausada = v; },
        irA(t) { if (estado) estado.t = t; }
    };
}
```

CSS (en `supervivencia.css`, junto a `.saltar-escena`):

```css
body.en-<nombre> .saltar-<nombre> { display: block; }
```

### 3.3 Conectarlo en `mundo/supervivencia/main.js`

**Teclas compartidas**: G es la tecla de «interactuar» y la reparte `main.js` según el contexto
(`caricias.intentar() || ronda.intentar() || <nuevo>.intentar()`). Un módulo nuevo **no** escucha
G por su cuenta: expone `intentar()` y se agrega a esa cadena (lo más cercano/específico primero).


1. `import { crear<Nombre> } from './<nombre>.js';`
2. Crearlo **después** de `escenas = crearEscenasSkin({...})`, con el mismo `bloquear` / `liberar`
   y `puede: () => jugador.activo && !uiAbierta && !vida.muerto && !jefes.enCurso && !escenas.activa`.
3. En el `keydown` del juego: `if (e.code === 'KeyG' && !e.repeat && jugador.activo && !vida.muerto && <nombre>.intentar()) e.preventDefault();`
   (elige una tecla libre: ver SKILL.md §3).
4. En `bucle`, justo después de `escenas.actualizar(corre ? dt : 0);`: `<nombre>.actualizar(corre ? dt : 0);`
5. Agrégalo a `window.__venjy` para depurar.
6. Celular: si el botón debe verse **durante** la escena (Pararse, CAM), no uses `tactil.agregarAccion`:
   `tactil.desactivar()` (lo llama `bloquear`) oculta toda esa capa. Usa un botón DOM propio como
   en `ronda-iglu.js`. Para botones fuera de la escena: en `tactil-supervivencia.js` agrega un botón (`tactil.agregarAccion('sv-<nombre>', TEXTO, () => …)`)
   y su posición en el CSS (`.tactil-boton.sv-<nombre>`, más `.tactil-boton.sv-<nombre>[hidden] { display: none; }`
   si lo muestras solo a veces), o reutiliza USAR si tiene sentido.
7. Un aviso pequeño la primera vez que el jugador está cerca («G: acariciar» / «G: pet») ayuda a
   descubrirlo: `hud.mensaje(texto, segundos)` (pásale `hud` en el contexto; una vez por cercanía,
   no cada cuadro).

### 3.4 Gancho en una criatura que no lo tiene

Las gatas ya lo tienen (así quedó en `actualizarGata` de `gatas.js`, úsalo como modelo):

```js
if (gata.escena) {
    mezclarPose(gata, dt);              // su sistema de poses sigue (gata.pose = 'sentada' se mezcla solo)
    aplicarPose(gata, t);               // escribe tronco, patas, cabeza.rotation.x y la base de la cola
    gata.escena(dt, t);                 // DESPUÉS: la interacción suma lo suyo encima (cabeza, cola, yaw)
    gata.g.position.set(gata.x, gata.y, gata.z);
    gata.g.rotation.y = gata.yaw;
    gata.nombre.ocultar();              // sin nombre flotante durante la escena
    return;                             // sin IA: no camina ni elige destino mientras dura
}
```

El orden importa: si llamas a la escena **antes** de aplicar la pose, la pose pisa lo que hizo la
escena. Para otra criatura (animales de `criaturas/animales.js`), copia el patrón en su función de
actualización y documenta el gancho en el comentario de cabecera del archivo. Las gatas son
**inmortales** y no se deben teletransportar lejos de la gatera.

---

## 4. Interacción con estado (sentarse, quedarse, pararse) · ejemplo: `ronda-iglu.js`

Cuando la interacción no dura un tiempo fijo sino **mientras el jugador quiera** (sentarse, dormir
junto a la fogata, mirar el mar), usa una máquina de estados en vez de una sola `T`:

| Estado | Entra con | Dura | Sale a |
|---|---|---|---|
| `sentando` | `intentar()` | 1–1,5 s (fundido, el cuerpo baja) | `sentado` |
| `sentado` | — | indefinido; el guion corre en **bucle** (`r = (t - inicio) % vuelta`) | `parando` con G, Esc, W/A/S/D o el botón |
| `parando` | cualquiera de esas | ~1 s | nada (restaurar todo y `liberar()`) |

Reglas:
- El bucle **varía**: alterna quién tiene cada objeto, frases al azar elegidas al empezar cada vuelta,
  un evento especial con probabilidad («¡YIAAAA!» 40 %). Nunca la misma vuelta dos veces seguidas.
- Al pararse a la mitad de algo (un objeto volando), cada cosa vuelve a **su casa** (su dueño
  original), no a quien la tenía en ese instante.
- Efectos que crecen con el tiempo (p. ej. el de «volarse»): sube suave desde 0 (10 s de rampa),
  baja en ~2 s al salir, y sin movimiento de cámara con `prefers-reduced-motion`.

### Primera persona sin cortar la escena

`camaras.pose` solo se llama en modo cine. Si el jugador cambia a primera persona (F5 / CAM)
durante la escena:
1. `camaras.terminarCine()` sin terminar tu escena (tu `actualizar` sigue corriendo).
2. Pon la cámara en la cabeza del cuerpo (`camaras.cuerpo.cabeza.getWorldPosition`) y deja mirar
   con `jugador.yaw`/`pitch` (el puntero se pide de nuevo).
3. Escribe la pose del cuerpo **desde tu módulo** cada cuadro, **después** de `camaras.actualizar`
   (que pisa la visibilidad y la pose del cuerpo), y oculta `cuello` (y `torso`) para que la cámara
   no vea el interior de la cabeza; deja visibles brazos y objetos.
4. Volver a F5 = `iniciarCine(...)` otra vez con los mismos planos.
En `main.js` la tecla F5 debe ir a tu módulo mientras está activo (`if (ronda.activa) ronda.alternarVista()`).
