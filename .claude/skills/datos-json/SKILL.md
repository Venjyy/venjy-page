---
name: datos-json
description: Agrega o cambia contenido del juego de venjy-page en los JSON de mundo/datos/ (posiciones, poses y gestos, escenas, diálogos de «Hablar», textos, botones táctiles, mesa del Duelo, objetos en la mano, tienda) sin romper nada y sin pisar lo que editó el dueño. Úsala siempre que una tarea toque un archivo de mundo/datos/ o pase algo del JS a JSON (etapa B), sea Opus, Sonnet, Haiku, Codex o Antigravity.
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

## 6. Al cerrar

Una línea en la bitácora de `mundo/PENDIENTES.md` con qué claves se agregaron. Si cambió algo que un
agente futuro necesita saber (un archivo nuevo, `lee` que dejó de ser `null`), actualizar
`mundo/datos/indice.json` y la línea de `CLAUDE.md` / `AGENTS.md` correspondiente.
