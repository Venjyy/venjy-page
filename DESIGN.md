---
name: Venjy
description: El portafolio como mundo explorado de Minecraft, colgado como un muro de mapas en marcos de ítem.
colors:
  abeto: "#34251a"
  abeto-oscuro: "#22180f"
  roble: "#a07f4c"
  roble-claro: "#b8945f"
  roble-oscuro: "#6e5431"
  roble-borde: "#2b1c0e"
  letrero: "#ae8a56"
  letrero-tinta: "#1b1208"
  mapa-pasto: "#7fb238"
  mapa-agua: "#4040ff"
  mapa-arena: "#f7e9a3"
  piedra: "#6d6d6d"
  pizarra: "#45454c"
  tierra: "#3b2a1c"
  lecho: "#2b2b2b"
  mc-blanco: "#ffffff"
  texto-suave: "#e6e6e6"
  mc-gris: "#aaaaaa"
  mc-gris-oscuro: "#555555"
  mc-amarillo: "#ffff55"
  mc-oro: "#ffaa00"
  mc-aqua: "#55ffff"
  mc-verde: "#55ff55"
  mc-rojo: "#ff5555"
  mc-encantamiento: "#8b8bff"
  tt-fondo: "rgb(16 0 16 / 0.95)"
  tt-borde-claro: "#5a1fd1"
  tt-borde-oscuro: "#2b0a6b"
  ui-gris: "#6f6f6f"
  ui-gris-claro: "#a9a9a9"
  ui-gris-oscuro: "#3e3e3e"
  ui-panel: "#c6c6c6"
  ui-ranura: "#8b8b8b"
  boton-hover: "#4f5590"
  boton-verde: "#2f7420"
  logro-fondo: "#212121"
  diamante: "#5cdbd5"
  oro: "#fcee4b"
  redstone: "#ff3b30"
  esmeralda: "#17dd62"
  lapis: "#7aa2ff"
typography:
  display:
    fontFamily: "PixelCraft, ui-monospace, monospace"
    fontSize: "clamp(2.5rem, 8vw, 6rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.01em"
  headline:
    fontFamily: "PixelCraft, ui-monospace, monospace"
    fontSize: "clamp(1.6rem, 3.6vw, 2.6rem)"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "PixelCraft, ui-monospace, monospace"
    fontSize: "clamp(1.3rem, 2.4vw, 1.75rem)"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "PixelCraft, ui-monospace, monospace"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.55
  body-letrero:
    fontFamily: "PixelCraft, ui-monospace, monospace"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "PixelCraft, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.3
  label-sm:
    fontFamily: "PixelCraft, ui-monospace, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.25
rounded:
  none: "0"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  ancho: "1200px"
  gap-sm: "12px"
  gap-md: "18px"
  gap-lg: "clamp(24px, 3vw, 40px)"
  zona-arriba: "clamp(56px, 8vw, 120px)"
  zona-abajo: "clamp(72px, 10vw, 140px)"
  subzona-arriba: "clamp(72px, 9vw, 128px)"
components:
  boton:
    backgroundColor: "{colors.ui-gris}"
    textColor: "{colors.mc-blanco}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "6px 22px 9px"
    height: "46px"
  boton-hover:
    backgroundColor: "{colors.boton-hover}"
    textColor: "{colors.mc-amarillo}"
  boton-verde:
    backgroundColor: "{colors.boton-verde}"
    textColor: "{colors.mc-blanco}"
    rounded: "{rounded.none}"
    padding: "6px 22px 9px"
    height: "46px"
  ficha:
    backgroundColor: "{colors.ui-ranura}"
    textColor: "{colors.mc-blanco}"
    rounded: "{rounded.none}"
    padding: "6px 16px 6px 8px"
    height: "52px"
  ficha-hover:
    backgroundColor: "{colors.ui-gris-claro}"
    textColor: "{colors.mc-amarillo}"
  tooltip:
    backgroundColor: "{colors.tt-fondo}"
    textColor: "{colors.mc-blanco}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "24px 28px 26px"
  marco:
    backgroundColor: "{colors.roble-borde}"
    rounded: "{rounded.none}"
  letrero:
    backgroundColor: "{colors.letrero}"
    textColor: "{colors.letrero-tinta}"
    typography: "{typography.body-letrero}"
    rounded: "{rounded.none}"
    padding: "clamp(24px, 3vw, 40px) clamp(24px, 3.4vw, 44px)"
  logro:
    backgroundColor: "{colors.logro-fondo}"
    textColor: "{colors.mc-blanco}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "12px 18px 13px 12px"
  ranura:
    textColor: "{colors.mc-blanco}"
    rounded: "{rounded.none}"
    size: "50px"
  campo:
    backgroundColor: "#000000"
    textColor: "{colors.mc-blanco}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  canal:
    textColor: "{colors.mc-blanco}"
    rounded: "{rounded.none}"
    padding: "10px 16px 10px 12px"
---

# Design System: Venjy

## Overview

**Creative North Star: "El Muro de Mapas"**

El portafolio es el mundo explorado de Venjy. La página es un muro de tablones oscuros de abeto del que cuelgan mapas de Minecraft en marcos de ítem de roble; cada apartado es una zona del mapa, marcada con un estandarte y con su propia franja de terreno generado. Todo el control vive en el HUD del juego: barra de ítems inferior, minimapa con flecha del jugador, toasts de logro y tooltips morados de ítem. No hay chrome web genérico: no hay barra de navegación, ni tarjetas redondeadas, ni sombras difusas.

La densidad es de juego, no de revista: texto pixelado sobre placas negras translúcidas, biseles de 3px, colores de la paleta de chat de Minecraft para jerarquizar (amarillo para lo accionable, oro para cargos, gris para lo secundario, verde para "en línea"). Las texturas (tablones, piedra, pizarra, tierra, lecho de roca, camino) y los íconos son pixel art generado en `script.js` con semilla fija, y el mapa de portada usa la paleta real de mapas de Minecraft con cuatro sombras por color.

Se rechazan de forma explícita (AGENTS.md, PRODUCT.md) los looks modernos o minimalistas que rompan la temática, la pantalla de título con botones grises como composición y la columna de tarjetas iguales.

**Key Characteristics:**
- Una sola tipografía pixelada (PixelCraft), siempre en peso normal, sin suavizado.
- Esquinas rectas en todo: el radio es cero, sin excepciones.
- Profundidad por biseles (luz arriba-izquierda, sombra abajo-derecha) y contornos negros, nunca por sombra difusa.
- Materiales de bloque como superficies: abeto, roble, letrero, piedra, pizarra, tierra, lecho de roca.
- El HUD de juego es el único set de controles persistente.
- Movimiento corto y con pasos: latidos, parpadeo de cursor, picar menas, toasts que entran y salen.

## Colors

Una paleta de materiales de Minecraft (maderas, piedra, terreno de mapa) con la paleta de texto del juego como acentos.

### Primary
- **Amarillo de Chat** (mc-amarillo): el color de lo accionable y lo destacado. Hover de botones, fichas, canales y marcadores; enlaces de tooltip; rol en la portada; anillo de foco (3px, offset 3px); caret de los campos.
- **Roble de Marco** (roble, roble-claro, roble-oscuro, roble-borde): marcos de ítem, borde del mapa, minimapa y visor. Siempre biselado: claro arriba-izquierda, oscuro abajo-derecha, más contorno roble-borde.

### Secondary
- **Morado de Tooltip** (tt-fondo, tt-borde-claro, tt-borde-oscuro): el contenedor de lectura de todo el sitio (experiencia, proyectos, rasgos). Fondo casi negro violáceo con doble borde biselado morado.
- **Gris de Interfaz** (ui-gris, ui-gris-claro, ui-gris-oscuro, ui-panel, ui-ranura): botones de Minecraft, ranuras de inventario y el panel del inventario de CV.
- **Azul de Botón Activo** (boton-hover): el hover del botón gris, como el resalte de botón del juego.
- **Verde de Acción** (boton-verde): única variante de botón con color, para la acción principal de un tooltip.

### Tertiary
- **Paleta de chat**: oro (cargos, títulos de logro de experiencia), aqua (títulos de proyecto), verde (estado en línea, ping), rojo (errores de formulario), encantamiento (stack tecnológico, como líneas de encantamiento).
- **Minerales** (diamante, oro, redstone, esmeralda, lapis): uno por veta de habilidades, usado solo en la etiqueta de mineral; diamante también es la luz del faro de ProcedimientoSeguro.
- **Paleta de mapa** (mapa-pasto, mapa-agua, mapa-arena): colores reales de mapa de Minecraft, pintados en canvas con cuatro sombras (multiplicadores 180, 220, 255, 135 sobre 255). Solo viven dentro de mapas y franjas generadas.

### Neutral
- **Muro de Abeto** (abeto, abeto-oscuro): fondo de página con textura de tablones; abeto-oscuro separa franjas (6px arriba y abajo).
- **Letrero** (letrero, letrero-tinta): tablón claro con tinta casi negra para el bloque largo de lectura de "Sobre mí".
- **Piedra y Pizarra** (piedra, pizarra): capas de la mina (habilidades), con textura de ruido.
- **Tierra y Lecho** (tierra, lecho): formulario de contacto y pie.
- **Blanco y grises de texto** (mc-blanco, texto-suave, mc-gris, mc-gris-oscuro): texto principal, párrafos en tooltip, metadatos, viñetas.
- **Placa negra**: `rgb(0 0 0 / 0.5–0.72)` bajo todo texto que se apoya sobre textura o mapa (placa de nombre, marcadores, coordenadas, menas, servidor).

### Named Rules
**La Regla del Amarillo.** El amarillo de chat marca lo que se puede tocar o lo que está seleccionado. No se usa como decoración ni como fondo.

**La Regla de la Placa.** Ningún texto se apoya directo sobre textura de material o terreno de mapa: va sobre una placa negra translúcida o lleva la sombra de texto del juego.

**La Regla del Mapa.** La paleta de mapa (pasto, agua, arena y sus sombras) se queda dentro de canvases de mapa y franja. La interfaz no la toma prestada.

## Typography

**Display Font:** PixelCraft (con ui-monospace, monospace)
**Body Font:** PixelCraft (con ui-monospace, monospace)

**Character:** Una sola voz pixelada para todo, como la fuente del juego. La jerarquía sale del tamaño, del color de chat y de la sombra de texto dura, nunca del peso.

### Hierarchy
- **Marca** (letras de bloque en canvas): "VENJY" se pinta como bloques de cuarzo sobre el terreno del mapa, no como texto tipográfico.
- **Display** (400, clamp(2.5rem, 8vw, 6rem), 1.2): nombre de zona en la franja; sombra 0.08em.
- **Headline** (400, clamp(1.6rem, 3.6vw, 2.6rem), 1.1): subzonas dentro de una zona.
- **Title** (400, clamp(1.3rem, 2.4vw, 1.75rem), 1.2): títulos de tooltip; títulos de veta, letrero, servidor y formulario viven entre 1.25rem y 2.1rem.
- **Body** (400, 18px, 1.55; 17px bajo 600px): texto general; en tooltip, máximo 68ch.
- **Body de letrero** (400, 19px, 1.6): lectura larga sobre tablón, máximo 62ch.
- **Label** (400, 16px): logros, fechas, encantamientos, errores, datos de gatas.
- **Label pequeño** (400, 13–15px): coordenadas, etiquetas de tooltip, atajos de ranura, notas.

### Named Rules
**La Regla del Peso Único.** Todo va en peso normal (400). Nada de negritas sintéticas: la jerarquía es tamaño, color y sombra.

**La Regla de la Sombra de Juego.** La sombra de texto es un desplazamiento duro de 0.1em sin desenfoque (`0.1em 0.1em 0` en negro al 55–75% o en #3f3f3f), como el texto del juego. Nunca con desenfoque.

## Layout

La portada es un muro de mapas a pantalla completa: un mapa 3:2 dividido por marcos de ítem en una grilla de 3x2 (2x3 en vertical, cuando el viewport es alto), con ancho `min(100%, (100svh − 140px) × 1.5)`. El letrero de inicio (nombre, rol, acciones) flota sobre el mapa, y en la versión vertical sale debajo de él. Los estandartes del mapa son las puertas a cada zona.

Cada zona abre con una franja de terreno generado (alto clamp(150px, 19vw, 240px)) con el nombre de la zona abajo a la izquierda y el lugar con coordenadas abajo a la derecha. El contenido va en un contenedor de 1200px con gutter `clamp(16px, 4vw, 48px)`. Las zonas usan composiciones propias, no una grilla común: casa con retrato fijo y letrero (0.8fr / 1.5fr), camino vertical con estandartes por parada, vetas de mina a todo el ancho, servidor destacado y galería de 3, gatas en 1.3fr/1fr/1fr con muro de fotos denso de 4 columnas, correo en 2 columnas.

Ritmo: espacios pequeños de 12px y 18px dentro de grupos; `clamp(24px, 3vw, 40px)` entre piezas; zonas con 56–120px arriba y 72–140px abajo; subzonas con 72–128px arriba.

Responsive: a 960px las composiciones de 2 o 3 columnas pasan a una; a 760px desaparece el minimapa y la franja apila lugar y título; a 600px se esconde el camino, las ranuras bajan a 38px y el muro de fotos va a 2 columnas. Dentro del mapa, una consulta de contenedor (560px) achica los estandartes y quita la etiqueta "en línea": el mapa suelta detalle al achicarse.

## Elevation & Depth

Sistema plano de bloques. La profundidad sale de biseles internos de 3px (luz arriba-izquierda, sombra abajo-derecha), de bordes de cuatro colores en los marcos y de contornos negros de 3px. No hay sombras difusas ni capas flotantes con blur. Lo que flota (HUD, minimapa, toasts) se separa por contorno negro y fondo opaco, no por sombra.

### Shadow Vocabulary
- **Bisel de botón** (`box-shadow: inset 3px 3px 0 #a9a9a9, inset -3px -5px 0 #3e3e3e`): botón gris en reposo; al presionar se invierte y baja 2px.
- **Bisel de panel** (`box-shadow: inset 3px 3px 0 #fff, inset -3px -3px 0 #555`): panel de inventario.
- **Anillo interior** (`box-shadow: inset 0 0 0 3px #555`): logros; canales usan 2px #3a3a3a y pasan a blanco en hover.
- **Marco de ítem en mapa** (`box-shadow: 0 0 0 2px #2b1c0e, inset 0 0 0 2px rgb(0 0 0 / 0.35)`): divisiones del muro de mapas.

### Named Rules
**La Regla del Bisel.** Todo volumen es un bisel de color plano: claro arriba-izquierda, oscuro abajo-derecha. Si una superficie necesita destacar, se le da contorno negro o bisel, nunca sombra con desenfoque.

## Shapes

Esquinas rectas en todo (radio 0). Los bordes son gruesos y en número de píxel: 3px para interfaz, 4–12px para marcos de roble (9px en marco de ítem, 12px en el mapa, 6px en minimapa). Las imágenes se dibujan con `image-rendering: pixelated`. Los íconos son SVG de matriz de píxeles generados desde arreglos de caracteres; los estandartes, la flecha del jugador y las menas son canvases pixelados. Las viñetas de lista son cuadrados de 8px con bisel.

## Components

### Botones
Táctiles y del juego: el botón gris de Minecraft.
- **Forma:** rectos (0), borde negro de 3px, alto mínimo 46px.
- **Primario:** gris de interfaz con bisel, texto blanco con sombra #3f3f3f, padding 6px 22px 9px.
- **Hover / Foco:** fondo azul de botón activo con bisel azul, texto amarillo; transición de 80ms lineal. Activo: bisel invertido y bajada de 2px. Foco: anillo amarillo 3px.
- **Verde:** variante para la acción principal dentro de un tooltip; hover mantiene texto blanco.

### Fichas (ranuras de inventario)
- **Estilo:** ranura gris (#8b8b8b) con borde hundido (#373737 arriba-izquierda, blanco abajo-derecha) y contorno negro; ícono de 34px más texto.
- **Estado:** hover aclara a #a8a8a8 y el texto pasa a amarillo. Son las acciones de la portada (CV, Escríbeme).

### Tooltip de ítem
- **Esquinas:** rectas.
- **Fondo:** tt-fondo con borde #100010 de 3px y borde interior biselado morado.
- **Contenido:** título en aqua u oro, empresa en blanco, fecha y etiquetas en gris, rol en oro, descripción en texto suave, stack en color de encantamiento, enlace en amarillo subrayado.
- **Padding:** 24px 28px 26px (20px 18px 22px en móvil).

### Marco de ítem
- **Estilo:** borde de roble de 9px biselado más contorno roble-borde de 3px; envuelve fotos, video y GIFs. Como botón abre el visor con cursor de zoom; hover aclara el roble.

### Letrero
- Tablón con textura, borde #5b4226 de 6px y contorno roble-borde; tinta oscura a 19px. Para la lectura larga de "Sobre mí".

### Logro
- Toast negro (#212121) con borde negro y anillo gris, ícono de 40px, título amarillo y texto blanco a 16px. Entran desde la derecha en cascada de 140ms en "Sobre mí" y desde la izquierda como toast en la esquina superior.

### Campos
- **Estilo:** fondo negro, borde gris claro de 3px, radio 0, caret amarillo, como el chat del juego.
- **Foco:** el borde pasa a blanco.
- **Error:** borde y mensaje en rojo de chat.

### Navegación (HUD)
- **Barra de ítems:** fija abajo al centro, ranuras de 50px (38px en móvil) con número de atajo; la ranura activa lleva el selector blanco grueso. El nombre del ítem aparece sobre la barra y se desvanece en 400ms.
- **Minimapa:** arriba a la derecha, marco de roble, flecha del jugador que sigue el scroll y coordenadas en placa negra; aparece al dejar la portada y se oculta bajo 760px.
- **Estandartes:** puertas de zona en el mapa; en hover suben 5px y su nombre pasa a amarillo.

### Firma: mapa de portada y franjas
Terreno procedural con la paleta real de mapas de Minecraft, ríos, costa, camino entre zonas y "VENJY" en letras de bloque. Las franjas repiten el terreno como cabecera de cada zona. La mina usa vetas de piedra y pizarra con menas que se pueden picar (sacudida en 3 pasos y partículas).

## Do's and Don'ts

### Do:
- **Do** usar PixelCraft en peso 400 para todo texto, con sombra dura de 0.1em y sin desenfoque.
- **Do** dejar todas las esquinas rectas (radio 0) y construir volumen con biseles de 3px y contornos negros.
- **Do** enmarcar imágenes y video en marcos de ítem de roble biselados y renderizarlos pixelados.
- **Do** poner texto sobre textura o mapa encima de una placa negra translúcida (`rgb(0 0 0 / 0.5–0.72)`).
- **Do** reservar el amarillo de chat para lo accionable, el hover y el foco.
- **Do** generar texturas, íconos y estandartes como pixel art con semilla fija, siguiendo la paleta de materiales.
- **Do** que cada zona nueva tenga su franja de terreno, su estandarte en el mapa y un material propio.

### Don't:
- **Don't** usar looks modernos o minimalistas: nada de esquinas redondeadas, sombras difusas, gradientes suaves ni tarjetas genéricas (AGENTS.md).
- **Don't** usar negritas ni una segunda familia tipográfica.
- **Don't** armar una columna de tarjetas iguales ni una pantalla de título con botones grises apilados como composición.
- **Don't** agregar controles fuera del HUD de juego (no hay barra de navegación web).
- **Don't** sacar la paleta de mapa (pasto, agua, arena) de los canvases de mapa y franja.
- **Don't** suavizar texto o imágenes: sin antialiasing de fuente y con `image-rendering: pixelated`.
