---
name: objetos-supervivencia
description: Agrega objetos, recetas, íconos pintados, usos (clic derecho, tenerlo en la mano), objetos que se colocan como bloque de cajas (farol, cartel) y objetos con modelo 3D en la mano y en el cuerpo (guitarra, teclado, tambor) en el modo supervivencia de venjy-page (mundo/supervivencia/objetos.js, recetas.js, iconos.js, minado.js, usos-objetos.js, modelos-mano.js, main.js, texturas.js, voxeles.js). Úsala siempre que haya que crear un objeto nuevo, darle una receta, una función, un ícono o un modelo a uno que ya existe, o venderlo en una tienda. Los bloques con forma (losa, escalones, trampilla, valla de jardín) ya tienen su base en mundo/formas.js (§3d).
---

# Objetos y recetas de la supervivencia

Todo lo de esta skill es **puro** (sin DOM) salvo el uso en el juego, y lo prueba Node.
Mapa del módulo: `mundo/supervivencia/MAPA.md` (tabla de archivos con funciones y líneas).

## 1. Objeto nuevo

1. **Registro** en `objetos.js` con `obj('CLAVE', 'Nombre ES', 'Name EN', { icono: 'nombre', ... })`.
   - **Siempre después del último `obj(`** (`grep -n "^obj(" objetos.js | tail -1`). Los ids se asignan en
     orden y viajan en el guardado y el cooperativo: insertar en medio cambia los ids de todo lo que
     sigue y rompe las partidas guardadas. Los del código deben quedar bajo `ID_DATOS` (1024): desde ahí son los de
     `mundo/datos/objetos.json` (pestaña Objetos nuevos), con id fijo. Un objeto que solo necesita nombre, ícono, comida o
     combustible puede ir ahí en vez del código (DISENO §42, 6d).
   - Campos que ya existen y conviene copiar: `apila` (1, 16 o 64), `color` (clave de `COLORES`),
     `comida: [hambre, saturación]`, `efecto`, `devuelve: 'CLAVE'`, `combustible`, `durabilidad`,
     `herramienta`, `encargo: true` (no se vende). Buscar uno parecido con `grep -n "obj('" objetos.js`.
2. **Ícono** en `iconos.js`, dentro de `PINTORES` (bloque `// ---- 7f-2 …` como ejemplo). Si el dueño lo dibujó en el
   Estudio (pestaña Píxeles: `mundo/datos/iconos.json` o el `dibujo` de un borrador en `borradores.json`), ese dibujo
   manda: va tal cual a `iconos.json` y no hace falta pintor (flujo en la skill `datos-json`, §6).
   `nombre(p) { p.mascara([...16 filas de 16...], { letra: [r, g, b] }); p.contornear(); }`.
   - El nombre del pintor es el `icono` del registro. Sin imágenes ni emojis: todo pintado.
   - Paleta Minecraft, contorno oscuro, que se lea a 16×16. Si se pinta sin verlo, decirlo: **el dueño lo revisa**.
   - Un ícono por familia con `color` (como `lingote` o `botella`) es mejor que uno por objeto.
3. **Agarre en la mano** (opcional): si se ve mal en la mano, la posición va en `mundo/datos/objetos-mano.json`
   (skill `datos-json`); el tipo por defecto ya sirve casi siempre.
4. **Cómo se ve el ícono** (lo que más critica el dueño; en la mano se ve extruido y grande):
   - 16×16, contorno oscuro, **una sola silueta grande** que llene el recuadro. Evitar manchas oscuras sin forma.
   - Objetos en diagonal (plumas, guitarras, varas): armarlos con un bucle (`p.set`) a lo largo de la diagonal y
     rellenar el costado con `(x - d + 1, y - d)`: una diagonal sola deja solo la mitad de los píxeles (ajedrez).
   - Referencias: pedir o mirar la foto que mande el dueño; inspirarse, no copiar. Un farol tiene argolla, tapa
     y base azul grisáceo, vidrio anaranjado con núcleo claro y barrotes oscuros.
   - Objeto con modelo 3D: `iconoModelo(clave)` de `modelos-mano.js` dibuja el ícono desde el mismo modelo (`desdeModelo` en
     `iconos.js`; vista en `VISTA_ICONO`). A 16×16 se pierden los detalles finos (teclas, mástil): si no se lee, pintarlo a mano.
   - Para ver íconos: página temporal en la raíz que dibuje `pixelesObjeto(id)` ampliado; borrarla antes del commit.
   - Pintado sin verlo: decirlo en el PR (el dueño lo revisa).

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
| Se coloca como bloque | campo `pone: B.X` en el objeto (minado.js lo coloca con el mismo apoyo que la antorcha) y `suelta` en el bloque | Farol, Cartel |
| Mapa, instrumentos, pluma | `usos-objetos.js` (`crearUsosObjetos`, sonido inyectado, se prueba en Node) | Mapa abre el minimapa |
| Llenar o vaciar | rama por id en `minado.usarObjeto`; reutiliza `llenarCubo` | Botella → Botella de agua |

Reglas:

- **Todo lo que se desarrolle debe poder modificarse y ajustarse desde el Estudio (`/estudio/`) por el dueño**: posiciones, giros, escalas, colores, tiempos, textos, medidas y cualquier valor que afecte cómo se ve o se siente. Los valores van en `mundo/datos/*.json` (o con su valor base en el código y un ajuste en el JSON, como `objetos-mano.json`), con esquema en `estudio/esquemas/` y control en la pestaña que corresponda. Si algo nuevo no cabe en ninguna pestaña, crear el campo o la pestaña, o dejarlo anotado en `mundo/PENDIENTES.md` y en el PR como «no editable aún». Nunca dejar números mágicos que solo se cambien tocando el código.

- La lógica nueva va en el **módulo dueño** del tema (o en uno nuevo chico), no amontonada en `main.js`;
  en `main.js` solo la línea que lo conecta.
- Si el uso abre algo que ya existe (el Mapa abre el minimapa grande), llamar a esa función; no duplicarla.
- El Reloj y cualquier objeto que "muestra algo" en la mano debe mirar **las dos manos** (`inventario.idEnMano()` y
  `inventario.mano2`), no solo la principal.
- Cooperativo: si el uso cambia el mundo (colocar, romper, encender), pasar por las mismas funciones que
  ya sincronizan (`mundo.editar`, `estado.alPoner`); no inventar mensajes de red.
- Texto visible nuevo: par ES/EN como los demás del módulo.

## 3b. Bloque pequeño hecho de cajas (farol, cartel)

Para algo que se coloca y debe verse con volumen (no un plano en cruz):

1. Id nuevo **al final** de `B` en `texturas.js`; `BLOQUES[B.X] = def(nombre, 'p', tile)` (tipo `'p'`: se atraviesa y deja pasar la luz);
   `LUZ_EMISION[B.X]` si ilumina.
2. Tiles **al final de `PINTORES`** (después de `...pintoresSupervivencia()`): insertarlos en medio corre el índice
   de todos los tiles siguientes y cambia la huella del creativo (`paridad.mjs`). Los tiles de caja van opacos y de 16×16.
3. Cajas en `voxeles.js` (`CAJAS_FAROL`, `CAJAS_CARTEL`, `mallarCajas`): medidas en 1/16, un tile por cara (`lado`,
   `arriba`, `fondo`, `frente`). Añadir el id a la condición de `mallarBuffers` antes de la rama de plantas.
4. En `objetos.js`: el bloque (`bloque(B.X, …, { suelta: O.OBJETO })`) y el objeto con `pone: B.X`.
5. Apoyo al colocar: la rama `B.ANTORCHA` de `ponerBloque` en `minado.js` (suelo o muro al lado).

## 3c. Objeto con modelo 3D en la mano y en el cuerpo (guitarra, teclado, tambor)

Los objetos normales se ven como su ícono extruido. Para uno con volumen:

1. En `modelos-mano.js`: una función `nombre(THREE, material)` que arma cajas y cilindros con color por vértice
   (ayudante `fabricar`), con el mástil o lado largo hacia **+X** y la cara hacia **+Z**, en las unidades del cuerpo
   de las personas (igual que el bajo de Salonas en `criaturas/npcs.js`). Registrar en `MODELOS`.
2. `COLGAR[nombre]`: dónde va en el torso (`pos`, `rot`) y cómo quedan los brazos (`brazoI`, `brazoD`). Así se ve
   en 3.ª persona, propio y de los demás jugadores (`pose-jugador.js` → `ponerObjeto`).
3. En `objetos.js`, al objeto: `modelo: 'nombre'`. La fábrica de `mano.js` ya lo toma (tipo `'modelo'`).
4. En primera persona: ajuste por objeto en `AJUSTE_OBJETO.mano1` de `objetos-mano-datos.js` (`pos`, `rot` en
   radianes, `escala`); el tipo `modelo` trae valores base.
5. **Cómo verlo sin pelear con el puntero del juego**: una página temporal en la raíz del repo que importe
   `crearModelo` (`skin.js`), `crearFabrica` (`mano.js`) y `ponerObjeto` (`pose-jugador.js`), arme tres personas con
   el objeto y rinda con una cámara fija; abrirla con el servidor y capturar. Borrarla antes del commit.

## 3d. Bloque con forma (losa, escalones, trampilla, valla)

Todo sale de `mundo/formas.js`: las cajas por forma (`FORMAS_BASE`) y qué id usa cada una (`ID_FORMA`). Para uno nuevo:
id(s) al final de `B` con `def(nombre, 'f', tile)` (tipo 8), la forma en `FORMAS_BASE` (y en el `enum` de
`formas.schema.json` y la lista de `estudio/formas.js`), el id en `ID_FORMA`, la regla de colocar en `colocarForma`
si tiene variantes, `bloque(...)` en `objetos.js` (las variantes con `suelta`) y un caso en `mundo/tests/formas.mjs`.
La malla, el choque, el contorno, las grietas, el ícono y la mano lo toman solos.

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
