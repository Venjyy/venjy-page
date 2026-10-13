---
name: objetos-supervivencia
description: Agrega objetos, bloques simples, recetas, íconos pintados y usos (clic derecho, tenerlo en la mano) en el modo supervivencia de venjy-page (mundo/supervivencia/objetos.js, recetas.js, iconos.js, minado.js, main.js). Úsala siempre que haya que crear un objeto nuevo, darle una receta o una función a uno que ya existe (por ejemplo los de 7f-2: Mapa, Farol, Cartel, Botella), o venderlo en una tienda. No sirve para bloques con forma (losas, escaleras, vallas): esos tocan malla y colisión y van con Opus o Sonnet.
---

# Objetos y recetas de la supervivencia

Todo lo de esta skill es **puro** (sin DOM) salvo el uso en el juego, y lo prueba Node.
Mapa del módulo: `mundo/supervivencia/MAPA.md` (tabla de archivos con funciones y líneas).

## 1. Objeto nuevo

1. **Registro** en `objetos.js` con `obj('CLAVE', 'Nombre ES', 'Name EN', { icono: 'nombre', ... })`.
   - **Siempre después del último `obj(`** (`grep -n "^obj(" objetos.js | tail -1`). Los ids se asignan en
     orden y viajan en el guardado y el cooperativo: insertar en medio cambia los ids de todo lo que
     sigue y rompe las partidas guardadas.
   - Campos que ya existen y conviene copiar: `apila` (1, 16 o 64), `color` (clave de `COLORES`),
     `comida: [hambre, saturación]`, `efecto`, `devuelve: 'CLAVE'`, `combustible`, `durabilidad`,
     `herramienta`, `encargo: true` (no se vende). Buscar uno parecido con `grep -n "obj('" objetos.js`.
2. **Ícono** en `iconos.js`, dentro de `PINTORES` (bloque `// ---- 7f-2 …` como ejemplo):
   `nombre(p) { p.mascara([...16 filas de 16...], { letra: [r, g, b] }); p.contornear(); }`.
   - El nombre del pintor es el `icono` del registro. Sin imágenes ni emojis: todo pintado.
   - Paleta Minecraft, contorno oscuro, que se lea a 16×16. Si se pinta sin verlo, decirlo: **el dueño lo revisa**.
   - Un ícono por familia con `color` (como `lingote` o `botella`) es mejor que uno por objeto.
3. **Agarre en la mano** (opcional): si se ve mal en la mano, la posición va en `mundo/datos/objetos-mano.json`
   (skill `datos-json`); el tipo por defecto ya sirve casi siempre.

## 2. Receta

En `recetas.js`, en la sección temática que corresponda:

- Con forma: `conForma(['ABA', ' B '], { A: O.X, B: B.Y }, O.RESULTADO, n)`. Espacio = casilla vacía.
  Grupos que ya existen: `TRONCOS`, `CARBONES`, `LANAS`; `W` = tablones, `S` = palo.
- Sin forma: `sinForma([O.A, O.B], O.RESULTADO, n)`.
- Horno: `FUNDICION`.
- La receta no puede chocar con otra (misma rejilla, otro resultado): la prueba lo detecta.
- Sin comidas chilenas nuevas sin que el dueño lo pida.

## 3. Uso del objeto (que haga algo)

| Qué hace | Dónde se cablea | Ejemplo que ya existe |
|---|---|---|
| Clic derecho con él en la mano | `minado.usarObjeto` en `main.js` (`grep -n "minado.usarObjeto" main.js`): una rama por id que llama al módulo dueño | Caña → `pesca.usar()`, Cuaderno → `cuaderno.usar(p)` |
| Clic derecho sobre un animal o persona | `interactuar` del módulo de la criatura | Cubo o Botella sobre vaca → leche (`ganado.js`) |
| Efecto mientras se tiene en la mano | el bucle de `main.js` con `inventario.idEnMano() === O.X` | Reloj muestra la hora (`grep -n "O.RELOJ" main.js`) |
| Comida o bebida | solo campos del registro (`comida`, `efecto`, `devuelve`) | Cubo de leche |

Reglas:

- La lógica nueva va en el **módulo dueño** del tema (o en uno nuevo chico), no amontonada en `main.js`;
  en `main.js` solo la línea que lo conecta.
- Si el uso abre algo que ya existe (el Mapa abre el minimapa grande), llamar a esa función; no duplicarla.
- Cooperativo: si el uso cambia el mundo (colocar, romper, encender), pasar por las mismas funciones que
  ya sincronizan (`mundo.editar`, `estado.alPoner`); no inventar mensajes de red.
- Texto visible nuevo: par ES/EN como los demás del módulo.

## 4. Tienda y `/dar`

- `/dar <nombre>` ya encuentra cualquier objeto registrado por su nombre: no hay que hacer nada.
- Para venderlo: hoy las ofertas siguen en `tienda-datos.js` (`tienda.json` tiene `lee: null`). Ver con
  `node estudio/cli.mjs resumen js:tienda`. Precios con criterio de los vecinos de la misma tienda.

## 5. Verificar

```
node mundo/tests/recetas.mjs
node mundo/tests/inventario.mjs
```

`recetas.mjs` comprueba ícono pintado, par ES/EN, sin emojis y que cada receta se encuentre a sí misma
sin chocar. Si el objeto tiene lógica pura nueva (ordeñar, llenar), **agregar el caso a `recetas.mjs`**
o a la prueba del módulo, con un mundo simulado como el de la leche.

Lo que solo se ve jugando (ícono, sonido, uso con el mouse) va en el PR como «qué mirar» para el dueño.

## 6. Al cerrar

- `mundo/PENDIENTES.md`: marcar el objeto en su bloque (hoy «7f-2» en el Bloque 7) y una línea en la bitácora.
- `mundo/supervivencia/MAPA.md`: solo si se creó un módulo nuevo.
