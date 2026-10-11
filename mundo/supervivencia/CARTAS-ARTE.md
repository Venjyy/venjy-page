# Arte de las cartas del Duelo (guía de diseño)

Reglas para dibujar o cambiar el arte de las cartas en `mundo/supervivencia/cartas-arte.js`. Valen para el panel 2D y para la mesa 3D (las cartas 3D usan los mismos lienzos como textura).

## Formato

- Cada carta es un lienzo de **50×76 píxeles** de arte. El panel solo la escala por enteros (×2 en la mesa, ×3 en la mano) con `image-rendering: pixelated`.
- Los textos (nombre, familia, efecto y ATK/DEF) **no se dibujan**: los pone el panel encima, en PixelCraft, con su par ES/EN. Las zonas están en `ZONAS` y `supervivencia.css` las repite.
- El retrato mide **40×26** (dentro de `ZONAS.retrato`). Cada carta tiene una función en `RETRATOS[id](F, fondo, s)`:
  - `fondo` ya trae el fondo de la familia (`FONDOS`). Se puede pintar encima (brillos, niebla, agua, lluvia), y lo que va ahí no lleva contorno.
  - `F` es la figura: a todo lo que se dibuje en `F` se le agrega un **contorno oscuro de 1 píxel** sin diagonales, como los ítems de Minecraft.
  - `s` es la semilla: todo el ruido sale de `azar(x, y, s)`, así que cada carta sale siempre igual (la prueba lo exige).
- Una carta sin retrato muestra la insignia de su familia en grande (`marcador`).

## Familias y fondos

| Familia | Marco | Fondo del retrato |
|---|---|---|
| Monstruo | verde | noche con luna y pasto |
| Mito | azul | niebla del sur (Chiloé) |
| Amigo | dorado | atardecer del campamento |
| Animal | terracota | día de pasto con nubes |
| Hechizo | morado | tormenta morada |

Una carta puede cambiar su fondo si el tema lo pide (Moisés: noche de nieve; Hadad: resplandor de la fogata). La familia se reconoce igual por el marco.

## Personas (amigos)

- La cara es un **bloque de 16×16** en `(12, 1)`, de frente, con luz a la izquierda y sombra a la derecha y abajo (`cara`/`rostro`). El torso de 16×9 va debajo (`polera`) y los brazos de 5 de ancho a los lados (`bloque`, `mano`).
- **Tienen que reconocerse**: piel, pelo (color y estilo), ojos, barba, lentes y lunar salen de `ROSTROS`, copiados de `criaturas/amigos.js` (`PERSONAS`), `criaturas/npcs.js` (Pony, Salonas y Lona) y `criaturas/venjy.js`. Las reglas de la cara frontal son las de `criaturas/pieles.js`. El color de la ropa es el del juego. Si cambia un personaje en el juego, hay que cambiarlo también en `ROSTROS`.
- Boris tiene su cara en una matriz propia (`CABEZA_BORIS`), del PR 2.
- Cada amigo lleva **un objeto o gesto que cuenta su efecto**: Pony pesca, Nacho asa, Hadad tiene la fogata, Moisés el muro del iglú (defensa), Andy baila, Lucho tiene diana y arco, Braulio el mapa, Conejeros la bufanda, Salonas el bajo, Lona las gatas, y Venjy saluda con una invitación en la mano. **Lalo** no tiene carta propia: aparece en Abrazo de Amigos con Moisés (con su sombrero de paja). Andy y Nacho no van juntos en un abrazo.

## Gatas

Colores de `mundo/gatas.js`: **Mila** es carey y gordita (casi todo negro, manchas naranjas de 2×2 y algo de amarillo). **Gala** es gris, con guantes blancos y su cuello naranjo. Las dos tienen ojos verde-amarillos y nariz rosada (`GATA`, `peloMila`, `peloGala`, `caraGata`).

## Monstruos, mitos y hechizos

- **Arte propio: no copiar diseños de Minecraft ni de juegos de cartas reales.** Pueden recordar el tono de Minecraft (bloques, píxeles, paleta), pero sin ser el mob literal. El Creeper (bloque de musgo con mecha y ojos nerviosos) y el Enderman (espectro con grietas moradas que se deshace en chispas) son diseños propios. **El Creeper es provisional: el dueño lo va a rediseñar.** Los slimes llevan cara propia.
- Los mitos de Chiloé siguen la leyenda: el Trauco con sombrero cónico, ropa de quilineja y pahueldún; el Caleuche, barco fantasma iluminado en la niebla; el Chonchon, una cabeza con orejas que son alas; la Calchona, una oveja negra que aúlla; el Basilisco, una culebra con cabeza de gallo; el Cuero, un cuero estirado en el lago con garfios.
- Los hechizos muestran **el objeto**, no a una persona (salvo Abrazo): la poción, la sopaipilla, el escudo de obsidiana, el tótem, la once.

## Estilo

- Píxel limpio. Bloques con luz arriba a la izquierda y sombra abajo a la derecha. Nada de antialias, salvo los brillos con alfa en `fondo`.
- Los colores se dan en `#rrggbb`, o en rgb con `hx(aj(c, f))` para aclarar u oscurecer. Para que no quede plano, se usa un poco de ruido (`elegir`, `ruido`, `bloque` con `f`).
- Lo importante va al centro: a ×2 en la mesa se tiene que leer qué es.
- Lo oscuro sobre fondo oscuro necesita un halo en `fondo` (Enderman) o luz de borde.

## Cómo revisar

- `node mundo/tests/cartas-arte.mjs`: comprueba tamaño, que salga igual cada vez, colores de marco y que **todas las cartas tengan retrato**.
- Para ver las cartas sin navegador, se arma un PNG con los búferes de `dibujarCarta(id)` ampliados (zlib de Node). Conviene mirar el retrato a ×8 o más y la carta completa a ×3.
