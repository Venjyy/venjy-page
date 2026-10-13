---
name: datos-json
description: Agrega o cambia contenido del juego de venjy-page en los JSON de mundo/datos/ (posiciones, poses y gestos, escenas, diálogos de «Hablar», textos, botones táctiles, mesa del Duelo, objetos en la mano, tienda, íconos y arte de cartas) y termina los objetos y cartas nuevos que el dueño dejó como borrador en la pestaña Píxeles, sin romper nada y sin pisar lo que editó el dueño. Úsala siempre que una tarea toque un archivo de mundo/datos/ o pase algo del JS a JSON (etapa B), sea Opus, Sonnet, Haiku, Codex o Antigravity.
---

# Contenido en `mundo/datos/*.json`

El Estudio (`/estudio/`) y el juego leen estos JSON. **La lógica sigue en JS y solo lee el JSON**; si
falta una clave, el juego usa el valor del código. Diseño completo en `estudio/DISENO.md` (no leerlo
entero: buscar la sección de la fase con grep).

## 1. Antes de tocar

1. ¿El juego ya lee ese archivo? Mirar `mundo/datos/indice.json`: si `lee` es `null` (hoy `tienda`),
   lo nuevo sigue en JS como hasta ahora.
2. Leer el contenido con el CLI, no abriendo el JSON ni los `*-datos.js` enteros:
   - `node estudio/cli.mjs resumen` (todo), `resumen <archivo> [clave]` (uno), `resumen js:tienda` o `js:amistad` (lo que sigue en JS).
   - Ejemplo: `node estudio/cli.mjs resumen dialogos pony`.
3. Mirar el esquema: `estudio/esquemas/<archivo>.schema.json`. Textos: `comun.schema.json#/$defs/texto`.
4. Buscar un ejemplo que ya exista del mismo tipo y copiar su forma.

## 2. Reglas duras

- **Solo añadir claves.** Nunca cambiar ni borrar un valor existente salvo que el dueño lo pida en el
  chat. `validar --contra HEAD` avisa si cambió algo; `--permitir-cambios` solo si él lo pidió.
- **Posiciones** (`posiciones.json`): un agente no mueve a nadie por su cuenta; solo agrega personas nuevas.
- **Textos**: siempre par `{ "es": "…", "en": "…" }`. Español de Chile para `es`. La marca
  `"revisado": true` la pone **solo el dueño**: un agente nunca la agrega ni la quita, y si cambia un
  texto revisado (porque se lo pidieron) la deja como estaba.
- Sin emojis (los íconos se dibujan en código). Solo fuente PixelCraft en lo que se vea.
- Lo nuevo, **genérico**: nombres, lugares y textos en datos, no amarrados a Venjy ni a un punto fijo del mapa.
- No meter lógica en el JSON (condiciones, funciones). Si no cabe en el esquema, va en JS y se anota
  por qué en `estudio/DISENO.md` §13.
- `nota` sirve para comentarios (JSON no admite `//`).

## 3. Después de tocar (siempre)

```
node estudio/cli.mjs validar --contra HEAD
node mundo/tests/estudio.mjs
```

Además, según el archivo:

| Archivo | Prueba extra |
|---|---|
| `dialogos.json` | `node mundo/tests/amistad.mjs` y regenerar `mundo/DIALOGOS.md` con `node estudio/cli.mjs resumen dialogos --md --escribir` |
| `escenas.json` | `node mundo/tests/estudio-escenas.mjs` |
| `poses.json` | `node mundo/tests/estudio-poses.mjs` |
| `posiciones.json` | `node mundo/tests/estudio-posiciones.mjs` |
| `textos.json` | `node mundo/tests/estudio-textos.mjs` |
| `objetos-mano.json` | `node mundo/tests/objetos-mano.mjs` |
| `cartas-mesa.json` | `node mundo/tests/cartas-mesa.mjs` |
| `iconos.json`, `cartas-arte.json`, `borradores.json` | `node mundo/tests/pixeles.mjs` (y `recetas.mjs` / `cartas-arte.mjs` si tocaste objetos o cartas) |

Las pruebas `*-navegador.mjs` necesitan Playwright; si no está, se saltan solas y se anota
«pendiente del dueño».

## 4. Pasar algo del JS al JSON (etapa B)

1. Inventario primero: `resumen js:amistad` / `js:tienda` y el esquema. Si no cabe, no forzarlo: anotarlo.
2. Copiar los valores **exactos** del JS (mismos números, mismos textos). La clave del JSON reemplaza
   por nombre a la del código, así que la paridad tiene que ser exacta.
3. No borrar el JS en el mismo cambio: el JS queda como respaldo (el juego vuelve a él si falta la clave).
4. Probar que el juego da lo mismo con y sin la clave (las pruebas de §3 lo cubren para escenas y poses).
5. Quien revisa (Opus) compara la paridad antes de aceptar.

## 5. Gestos, escenas y cámara

El formato está en los esquemas, pero **el criterio** (ángulos, signos del rig, ritmo, planos) está en
`.claude/skills/animaciones-minecraft/`. Para gestos o escenas nuevas, seguir esa skill; esta solo
cuida que el JSON quede válido.

## 6. Borradores: «termínalo e impleméntalo»

El dueño crea objetos y cartas en el Estudio (pestaña Píxeles, «Objeto nuevo» / «Carta nueva») y quedan
en `mundo/datos/borradores.json` con `"estado": "borrador"`. **El juego no lee ese archivo.** Cuando dice
«hice X e Y, termínalos e impleméntalos»:

1. Listarlos: `node estudio/cli.mjs resumen borradores --completo` (todo lo que llenó) y, para ver el
   dibujo o el boceto por filas, `resumen borradores <clave> --dibujo`.
2. **Objeto** (skill `objetos-supervivencia`): agregarlo a `objetos.js` con la clave del borrador en
   mayúscula (`linterna` → `obj('LINTERNA', …)`), su receta o dónde se consigue y su uso, según «qué hace»,
   «receta» y «notas». Si falta el nombre en inglés, ponerlo (par ES/EN siempre).
   **Ícono: el dibujo del dueño tal cual**: copiar `dibujo` (`paleta` y `filas`, sin cambiarlos) a
   `mundo/datos/iconos.json` → `iconos.<clave>`. No hace falta pintor en `PINTORES`.
3. **Carta**: agregarla a `CARTAS` de `cartas-datos.js` (`c(plantilla, atk, def, efecto, …)` o `h(…)` si la
   plantilla es `hechizo`). Si el efecto ya existe (lista al comienzo de `cartas-datos.js`), reutilizarlo;
   si no, programarlo en `cartas.js` con su prueba en `mundo/tests/cartas.mjs` y medir la IA. Texto ES/EN
   (frase única; completar el inglés). **El retrato lo dibuja el agente**: arte único en `RETRATOS` de
   `cartas-arte.js` con las reglas de `mundo/supervivencia/CARTAS-ARTE.md`; si hay `boceto`, tomarlo de
   guía (composición y colores), no copiarlo. No ponerlo en `cartas-arte.json` (eso es del dueño).
   Si las notas no dicen en qué mazo o sobre aparece, preguntar.
4. Marcar el borrador `"estado": "hecho"` (es un cambio de valor pedido: `validar --contra HEAD --permitir-cambios`).
   No borrarlo: queda como registro de lo que pidió.
5. Pruebas de §3 más las del área (`recetas.mjs`, `inventario.mjs`, `cartas.mjs`, `cartas-arte.mjs`).
   En el PR, «qué mirar»: el ícono o la carta en el juego.

## 7. Al cerrar

Una línea en la bitácora de `mundo/PENDIENTES.md` con qué claves se agregaron. Si cambió algo que un
agente futuro necesita saber (un archivo nuevo, `lee` que dejó de ser `null`), actualizar
`mundo/datos/indice.json` y la línea de `CLAUDE.md` / `AGENTS.md` correspondiente.
