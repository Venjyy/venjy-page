---
name: ahorro
description: Reglas para gastar pocos tokens sin bajar la calidad del resultado. Úsala siempre, al empezar cualquier tarea de desarrollo (feature, bug, refactor, documentación, revisión): cómo leer el código, qué modelo elegir, cuánto verificar según el cambio, cómo dividir el trabajo en chats y PR chicos, cómo dejar traspasos y documentación que no engordan.
---

# Ahorro de tokens sin perder calidad

**Ahorrar tokens nunca baja la calidad final.** Se ahorra en cómo se lee, cómo se verifica y cómo se
documenta; jamás entregando algo peor, a medias o sin comprobar. Si una regla de aquí choca con que el
resultado quede bien, gana que quede bien.

Dónde se pierden tokens, de más a menos: (1) leer archivos enteros que no hacían falta, (2) imágenes y
capturas repetidas, (3) chats largos que arrastran contexto, (4) resúmenes y documentación que
repiten lo que ya está en el código. Esta skill ataca esos cuatro.

## 1. Leer poco

Orden fijo para entender código:

1. **El mapa del proyecto** (un `MAPA.md`, `ARCHITECTURE.md` o la sección de estructura del
   `CLAUDE.md`). Dice qué hace cada módulo y dónde está lo importante.
2. **grep** del símbolo, el texto o el error. Devuelve archivo y línea.
3. **Leer por tramos** alrededor de la línea encontrada (30-80 líneas), no el archivo entero.

Reglas:

- Nunca leer completo un archivo de más de ~200 líneas si no hace falta. Primero grep o las cabeceras.
- No releer lo que ya se leyó en este chat; si hace falta un dato, buscarlo en lo ya visto.
- No abrir binarios ni medios pesados (GIF, video, audio, PDF largos, imágenes grandes) salvo que la
  tarea sea sobre ellos; referirse a ellos por nombre.
- No abrir carpetas de respaldos, capturas viejas, dependencias vendidas (`vendor/`, `node_modules/`)
  ni salidas de build salvo que la tarea lo pida.
- Pedir al usuario el dato que falta antes de explorar a ciegas a gran escala.
- Comandos con la salida filtrada (ver §7).

Si el proyecto **no tiene mapa**, el primer aporte útil de la tarea puede ser crearlo: una línea por
módulo, sacado de sus cabeceras y de grep, nunca inventado.

## 2. Elegir modelo

| Modelo | Para qué |
|---|---|
| Haiku | Búsquedas en el código, ediciones triviales, renombrar, partes mecánicas fáciles de verificar. |
| Sonnet | Features con instrucciones claras, ejecutar un plan ya escrito, arreglar un bug con el error a la vista, ajustes de UI, documentación. |
| Opus | Diseño y arquitectura, bugs difíciles, refactors riesgosos, cambios que tocan varios módulos y hay que pensarlos. |

- Decirlo en una línea al empezar: «Para esta tarea conviene <modelo>, porque …». Si el modelo actual
  no es el recomendado, decirlo con franqueza y esperar la decisión del usuario.
- **Subagentes solo para partes grandes y mecánicas**: cada uno parte en frío y vuelve a leer lo que
  ya se sabe. Haiku primero; si Haiku se atasca o el resultado es flojo, Sonnet. Quien delega define
  el encargo con precisión (qué archivos, qué entrega, cómo se verifica) y revisa el resultado.
- Si la parte delegada es pequeña, hacerla directamente sale más barato que explicársela a otro.

## 3. Verificar en proporción al cambio

La calidad manda: se verifica todo lo necesario para que quede bien. El ahorro viene de **cómo** se
verifica, no de verificar menos.

| Cambio | Verificación |
|---|---|
| Documentos / datos | Ninguna, o las pruebas que ya existan sobre esos datos. |
| Lógica | Pruebas automáticas (las existentes; agregar una si el caso no estaba cubierto). |
| Refactor sin cambio de comportamiento | Pruebas + una carga sin interfaz con errores de consola + 1 captura. |
| UI / CSS | Capturas de lo cambiado, en los tamaños que importan (escritorio y celular). |
| Animaciones / escenas | Playwright y capturas **siempre**. Empezar por los tiempos clave (contactos, saltos, cambios de plano) y agregar todas las que hagan falta hasta que la pose, el contacto y la cámara se vean bien. Video cuando el dueño lo vaya a revisar. |

Cómo ahorrar sin perder calidad:

- **Capturas a escala 0.5**; si hay que ver un detalle, zoom a esa zona, no la pantalla completa.
- **Capturar solo lo nuevo o lo cambiado**: no recapturar lo ya aprobado ni reabrir capturas viejas.
- **Hojas de varios tiempos en una sola imagen** en vez de muchas imágenes sueltas.
- **Preferir texto cuando alcance**: medidas numéricas, consola, árbol de accesibilidad, valores
  calculados con JavaScript. Usar la imagen solo para lo que únicamente se ve mirando.
- Un solo ciclo de «cambiar → verificar → corregir» por tanda de cambios, no una verificación por
  cada edición pequeña.
- Si no se puede verificar algo (sin servidor, sin navegador), decirlo; no afirmar que funciona.

## 4. Chats y PR chicos

- **Una parte por chat**, un PR por parte. Un chat largo arrastra todo su contexto en cada mensaje.
- Si un pedido es grande, **avisarlo y dividirlo** antes de empezar, con el orden y el modelo de
  cada parte. No empezar una parte grande «a ver cuánto alcanza».
- **Cerrar el chat al abrir el PR**: lo que sigue va en un chat nuevo con su traspaso (§5).
- Las correcciones del usuario sobre el PR abierto caben en el mismo chat; una parte nueva, no.

## 5. Traspasos baratos

El prompt para el siguiente chat dice, y solo dice:

1. **Qué leer**: secciones concretas («`PENDIENTES.md`, sección “Bloque 6c-2”», «`MAPA.md`»), no
   archivos enteros ni «lee todo el proyecto».
2. **El estado en 5-10 líneas**: qué quedó hecho, qué rama y PR, qué decisiones se tomaron y por qué,
   qué no se tocó.
3. **Lo que sigue**: la tarea exacta, el modelo recomendado y cómo se verifica.

Nada de pegar diffs, historiales ni resúmenes de lo que ya está en el repositorio.

## 6. Documentación que no engorda

- El archivo de **pendientes solo con lo vivo**: lo que falta, lo que está en curso, las decisiones
  que siguen vigentes.
- **Lo terminado** (estados cerrados, bitácora, tablas históricas) va a un historial aparte que no se
  lee salvo que haga falta. En el archivo vivo queda una línea de puntero.
- Un **mapa del código corto y actualizado** (una línea por módulo, funciones principales con
  línea). Se actualiza en el mismo PR que mueve o agrega módulos.
- Un dato vive en un solo lugar; los demás documentos lo enlazan.
- Los comentarios del código explican el porqué; el qué ya lo dice el código.

## 7. Salida breve

- Sin resúmenes largos ni repetir lo que ya se ve en el diff. Cierre: qué cambió, qué se verificó,
  qué queda, en pocas líneas.
- Comandos con la salida filtrada: `grep -n`, `head`/`tail`, `--stat`, `--oneline`, `wc -l`,
  `git diff --stat` antes de `git diff`; tests en modo resumen. No volcar logs enteros.
- No narrar cada paso; avisar solo al cambiar de fase o ante algo inesperado.
- No pegar en el chat el contenido de archivos que el usuario puede abrir con un enlace.

## 8. Checklists

### Al empezar un chat

1. Leer el mapa del proyecto y, de los pendientes, **solo la sección en curso**.
2. Decir el modelo recomendado en una línea (y esperar si el actual no lo es).
3. Confirmar que la tarea cabe en un chat; si no, dividirla y avisar.
4. Revisar `git status` y la rama: partir del `main` actualizado y no pisar trabajo de otros chats.
5. Decidir de antemano la verificación según la tabla de §3.
6. Localizar con grep lo que se va a tocar; leer solo esos tramos.

### Al cerrar un chat

1. Pruebas y verificación de la tabla de §3 hechas; decir lo que no se pudo verificar.
2. Mover lo terminado al historial; dejar en pendientes solo lo vivo.
3. Actualizar el mapa si se movieron o agregaron módulos.
4. Commit y PR con descripción corta (qué, por qué, cómo se probó).
5. Entregar el prompt de traspaso (§5): secciones a leer, estado en 5-10 líneas, lo que sigue.
6. Terminar el chat; no seguir con la parte siguiente aquí.
