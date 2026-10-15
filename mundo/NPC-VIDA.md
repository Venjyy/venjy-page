# NPC con vida propia: lo que aprendimos (6d etapa 2) y lo que sirve para el juego comercial

Documento de referencia sobre los amigos que dejan su sitio, caminan por el mapa, se visitan y te saludan.
Junta **todos los problemas que aparecieron** al construirlo (síntoma, causa, arreglo y la regla que deja) y las
**consideraciones para el juego comercial** (`estudio/PLAN-COMERCIAL.md` → «Mundo vivo, no guionado»).
El estado del día a día sigue en `mundo/PENDIENTES.md` (bloques «Estado 6d etapa 2 · PR 1/2/3»); aquí va lo que
conviene leer **antes** de diseñar algo parecido otra vez.

Fechas: todo pasó entre el 2026-10-14 y el 2026-10-15, en las ramas `navegacion-6d2`, `rutinas-visitas-6d2` y
`rutinas-pulido-6d2`.

---

## 1. Cómo está armado hoy

Cuatro capas, de abajo hacia arriba. Cada una solo conoce a la de abajo.

| Capa | Archivo | Qué hace | No sabe nada de |
|---|---|---|---|
| Navegación | `mundo/navegacion.js` (puro) | Cómo se ve el mundo (`consultaMundo`: libre, sólido, obstáculo, agua, lava, sin cargar), busca camino A* por tramos (`crearBusqueda`, cola `crearNavegador` con tope de nodos por cuadro) y lo sigue (`crearCaminante`: cerca mira bloque a bloque, lejos avanza a saltos) | Personas, horarios, el juego |
| Paseos | `mundo/supervivencia/paseos.js` (+ `paseos-datos.js`) | Saca a una persona de su sitio (guarda sitio, giro y pose), la lleva a un punto, a un lugar o **a otra persona** (y la sigue si se mueve), la anima caminando o de pie, y la devuelve exacta a su sitio. Ganchos `n.paseo`, `adornar` (gesto encima) y `mirar` (dueño único del cuello) | Horarios, saludos, amistad |
| Rutinas | `mundo/supervivencia/rutinas.js` (+ `rutinas-datos.js`) | Con la hora del mundo decide quién sale a ver a quién: `en-sitio` → `yendo` → `visitando` → `volviendo`, más `acompanando` (7j-1). Saludo al llegar y respuesta, «¿Y …?» si no lo encuentra, «te saludan al pasar» con amistad alta, cooperativo (`red`, `recibir`, `foto`) | Cómo se camina |
| Juego | `main.js`, `amigos.js`, `coop.js`, `tienda.js`, `escenas-skin.js` | Dibuja (`n.paseo`, `n.visita`), choca con escenas, misiones, tienda, minijuegos y ronda del iglú (`libre`), manda las rutinas por la red (mensaje `ru`) | — |

Datos (todo editable en el Estudio, pestaña **Vida**): `mundo/datos/navegacion.json` (`caminar` = `NAV_BASE`,
`paseo` = `PASEO_BASE`) y `mundo/datos/rutinas.json` (`ajustes` = `RUTINA_BASE`, `visitas`, `ausente`, `incluir`,
`horarios`, `lugares`, `textos`). Depuración: `/caminar`, `/rutina`, `__venjy.paseos`, `__venjy.rutinas`.
Pruebas: `mundo/tests/navegacion.mjs` (mundos de juguete + terreno real) y `mundo/tests/rutinas.mjs` (personas y
paseos falsos, anfitrión e invitado).

---

## 2. Problemas que encontramos, uno por uno

Ordenados por tema. Cada uno: **síntoma** (lo que se vio), **causa**, **arreglo** y **regla** (lo que hay que
recordar para el juego comercial).

### 2.1 Llegar a un lugar

**A. El destino estaba dentro de una construcción.**
- Síntoma: mandarlo «a la atalaya» no llegaba nunca; buscaba hasta el tope de nodos.
- Causa: el punto del lugar es el centro de la torre, que no se puede pisar.
- Arreglo: `cercaPisable` busca en anillos el punto pisable más cercano (hasta `radioPisable`).
- Regla: **un destino siempre se convierte en «un punto donde se puede estar de pie» antes de buscar.** Los lugares
  deberían traer su punto de llegada propio (puerta, banca, borde de la fogata), no su centro.

**B. Buscaba sin fin un destino imposible.**
- Síntoma: búsquedas repetidas, cuadros pesados, la persona quieta.
- Causa: un camino parcial que no acercaba nada volvía a pedir camino una y otra vez.
- Arreglo: un parcial que termina a menos de `aceptable` cuenta como llegada; si un tramo no acercó ni un bloque, se
  rinde; los reintentos a la vista son pocos y cada vez más espaciados (`reintento`, el doble…).
- Regla: **toda búsqueda tiene que poder terminar en «no se puede»,** y ese resultado tiene que tener una salida
  visible (rendirse, aparecer allá si nadie mira, quedarse «atascado»).

**C. El destino tenía altura 0.**
- Síntoma: iba a «junto a Braulio» y buscaba en el fondo del mapa.
- Causa: Braulio y Conejeros buscan su suelo recién cuando se carga su chunk; antes su `y` es 0.
- Arreglo: sin altura conocida (`cargado === false`), `cercaPisable` usa el mapa de alturas.
- Regla: **una posición de NPC sin cargar no es una posición confiable.** Marcar explícitamente «altura conocida /
  no conocida» en vez de usar 0.

**D. Llegaba «cerca» pero no tanto y decía «¿Y Braulio?» con Braulio al lado.** (2026-10-15)
- Síntoma: Andy llegaba donde Braulio, en la playa, y a veces preguntaba dónde estaba; otras veces lo saludaba bien.
- Causa: tres tolerancias que no conversaban entre sí. El destino queda a ~2,2 bloques de Braulio (`distanciaVisita`
  1,8 + `cercaPisable`); un camino parcial cuenta como llegada a ≤ 4 del destino (`aceptable`); y la rutina exigía
  ≤ 6 de la persona (`radioEncuentro`). 2,2 + 4 > 6: según por dónde terminaba el camino, «llegaba» a 6 y pico.
- Arreglo: si al llegar la persona no está a menos de `radioEncuentro`, vuelve a ir a ella hasta `acercarse` (2)
  veces antes del «¿Y …?». Ajuste nuevo en la pestaña Vida.
- Regla: **las tolerancias de llegada tienen que derivarse unas de otras** (radio de encuentro ≥ distancia de visita
  + tolerancia de llegada + margen), o mejor, **«llegó» lo decide quien pidió el viaje**, no el caminante: el
  caminante dice «terminé», la rutina mira si la persona está y, si no, se acerca.

### 2.2 Caminar

**E. Andy flotaba y se quedaba quieto en el aire.**
- Síntoma: al acercarse el jugador, Andy aparecía flotando a varios bloques del suelo y no seguía.
- Causa: lejos, `pasoLejos` mueve x/z por tramos largos del camino suavizado pero dejaba la altura del punto anterior
  (hasta 4 bloques fuera del suelo). Al pasar a «cerca» no encontraba piso, no podía partir desde el aire y se rendía.
- Arreglo: a mitad de tramo toma el suelo de esa columna (`suelo`); `inicio` parte del suelo si quedó en el aire; el
  primer cuadro cerca **lo reubica** si quedó sin piso o metido en el follaje y busca de nuevo; quieto, `asentar` lo
  baja.
- Regla: **la transición lejos → cerca es el momento más frágil.** Lo simplificado (mapa de alturas, sin árboles) y
  lo detallado (bloques reales) no coinciden; siempre «aterrizar» al pasar de uno a otro.

**F. Rozaba un tronco que el camino esquivaba.**
- Síntoma: chocaba, buscaba de nuevo, obtenía el mismo camino y se rendía.
- Causa: tras buscar de nuevo iba derecho al segundo punto desde el borde de su celda; el camino suavizado parte del
  centro de la celda.
- Arreglo: si no está en el centro de su celda, primero va ahí.
- Regla: **el cuerpo tiene que empezar el camino donde el camino empieza.**

**G. Se rendía a mitad de un viaje largo.**
- Síntoma: Andy se detenía antes del bosque entre la aldea y el naufragio, saludaba a la nada y se devolvía; al
  repetir, llegaba.
- Causa: mientras camina se cargan chunks; cada árbol que el mapa de alturas no tenía lo hace chocar y buscar de nuevo.
  Los reintentos se sumaban todo el viaje y nunca volvían a 0; al pasar de 3 se rendía, y `paseos.js`, a la vista, lo
  daba por «llegó».
- Arreglo: si avanzó `avanceReintentos` (8) bloques desde la última búsqueda, los reintentos vuelven a 0. Rendido a
  la vista queda **`atascado`** (no «llegó»): la rutina no saluda, lo intenta de nuevo cada tanto y, si dejas de
  verlo, aparece allá.
- Regla: **«no pude» y «llegué» son estados distintos y nunca se confunden.** Un contador de fracasos tiene que
  medir fracasos seguidos, no fracasos totales.

**H. Caminaban por encima de los árboles y del corral.**
- Síntoma: Braulio pasaba por encima del corral de la granja yendo a ver a Conejeros; otros cruzaban copas de árboles.
- Causa: las hojas (y la valla del corral, que es TIPO 2 «hoja») contaban como sólido pisable.
- Arreglo: clase `OBSTACULO` en `navegacion.js` (choca, no sirve de piso) para hojas, la valla del corral y las
  vallas de jardín (`noPisables`). `pisarHojas` = 1 vuelve a lo de antes.
- Regla: **«se puede caminar encima» y «choca» son dos propiedades distintas de cada bloque.** El juego comercial
  necesita una tabla de navegación por bloque: pisable, atravesable, alto (valla = 1,5), costo (barro, arbusto),
  rompible por NPC.

**I. El juego se trababa: «Cannot read properties of undefined (reading 'x')».** (2026-10-15)
- Síntoma: al llegar Andy donde Braulio (o Braulio yendo a ver a Conejeros, que venía hacia él), error en
  `pasoCerca` y todo pegado.
- Causa: al seguir a alguien que se movió un poco, el nuevo destino caía en la misma celda: camino de un solo punto.
  El caminante empezaba en el índice 1 (ya estaba en el centro) y leía `camino[1]`, que no existe.
- Arreglo: un camino de un punto es llegada (`finDeCamino`); `pasoCerca` nunca lee fuera del camino. Prueba en
  `navegacion.mjs` que falla con el código anterior.
- Regla: **los casos degenerados (0 o 1 punto, destino = origen) se prueban siempre,** y un error en la IA de un NPC
  nunca puede botar el bucle del juego (en el comercial: `try/catch` por NPC que lo deja quieto y lo anota).

**J. Velocidad.**
- 2,2 bloques/s se veía lento; el dueño pidió 3,3 y después 4,1 (el jugador camina a 4,3 y corre a 5,6).
- Las distancias del mapa son grandes: campamento → naufragio 558 bloques en recta (~10 h de juego a 2,2 b/s).
  Por eso `rapidezLejos` = 4 (lejos, nadie lo ve, caminan 4 veces más rápido) y la rutina **sale antes según la
  distancia** (`horasDeViaje` con `rodeo` 1,3) para llegar a la hora.
- Regla: **la velocidad visible es una decisión de sensación; la velocidad lejos es una decisión de calendario.**
  Separarlas desde el principio.

### 2.3 Ir a ver a alguien (no a un lugar)

**K. Iban a la zona, no a la persona.**
- Síntoma: con Braulio en la aldea, Andy iba al naufragio y saludaba a la nada.
- Arreglo: `paseos.js` sigue a la persona (cada `seguirCada` s, si se movió más de `seguirDistancia`, corrige el
  camino); al llegar, si no está a menos de `radioEncuentro`, «¿Y {quien}? Pensé que estaba aquí.» y vuelve sin
  repetir la visita en ese tramo; quien tiene visita no sale de su casa.
- Regla: **el objetivo de una visita es una entidad, no una coordenada.**

**L. Quien recibía no contestaba si estaba de paseo; de visita, si se iba, el otro se quedaba.**
- Arreglo: `amigos.js` dibuja `n.visita` también con `n.paseo`; si quien recibe se aleja más de `radioEncuentro × 1,5`,
  quien visita lo sigue sin repetir el saludo; si no puede, «¿Y …?».
- Regla: **una visita es una relación entre dos que dura**, con sus propias reglas mientras dura (no un evento de
  llegada).

**M. Saludo doble.**
- Síntoma: «Probar» en el Estudio dentro del horario de esa misma visita: al terminar la prueba, la rutina la hacía
  de nuevo y se saludaban dos veces.
- Arreglo: al terminar una prueba, esa visita queda `descartada` hasta que termine su tramo.
- Regla: **las acciones de depuración tienen que dejar el estado como si hubieran pasado de verdad.**

### 2.4 Mirar y gestos

**N. Quien recibía no miraba a quien llegó.**
- Arreglo: gancho `n.visita` (cuello con tope `cuello`, gira en `girar` s y vuelve la cabeza al irse).

**O. Al saludarte la cabeza «peleaba» entre mirarte y mirar el camino.** (2026-10-15)
- Causa: dos dueños del cuello: `paseos.animar` lo llevaba suave hacia el frente (o hacia quien visita) y el adorno
  del saludo lo empujaba hacia el jugador cada cuadro. Caminando, además, el adorno ni corría.
- Arreglo: `paseos.mirar(clave, punto)`: un solo dueño del cuello (te mira caminando o de pie, con tope); el adorno
  solo pone el gesto encima.
- Regla: **cada hueso tiene un solo dueño por cuadro.** El comercial necesita un sistema de capas de animación con
  prioridades (base: caminar; encima: mirar; encima: gesto de brazos; encima: escena) en vez de que cada sistema
  escriba rotaciones.

### 2.5 Choques con el resto del juego

**P. La escena de grupo llevaba al jugador a la fogata bajo tierra.**
- Síntoma: con Andy de visita, la escena del saludo del grupo (6c-2) salía igual y la cámara terminaba bajo tierra.
- Arreglo: la escena automática, el botón del panel y `iniciar6c` esperan a que nadie del grupo esté fuera de su
  sitio (`n.paseo`).
- Regla: **toda escena declara a quién necesita y dónde,** y no empieza si falta alguien.

**Q. Choques varios resueltos con reglas simples.** Una escena (`n.escena`: Hablar, misión, tienda) lo deja quieto
donde va; `libre(n)` (ronda del iglú, minijuego, jefe, el pase del bong) no lo deja salir; el panel sigue
funcionando donde esté y dice «Está de visita donde Conejeros, en el escenario.»; a quien te acompaña no lo visitan;
si otro lo movió (`/caminar`, el Estudio) la rutina no lo pelea.

**R. Con alguien de paseo se calla la vida de su grupo.** Hoy la charla de la fogata y el pase del iglú se suspenden
si falta alguien. Visto en la prueba: con uno de visita, los que quedan deberían seguir hablando entre ellos (pedido
del dueño, anotado en el plan comercial).

### 2.6 Cooperativo

**S. Cada equipo simulaba sus propias rutinas.**
- Causa: solo se sincronizaba la hora (`h` cada 10 s). El viaje depende de los chunks y del jugador de cada equipo
  (cerca camina bloque a bloque, lejos a saltos), así que dos equipos podían terminar en visitas distintas (en uno
  Andy no encuentra a Braulio, en otro sí).
- Arreglo: el anfitrión decide y manda el mensaje `ru` al pasar algo (`{ c, a: sale | vuelve | noesta, v }`, unos
  pocos por día de juego) y a quien entra la lista de visitas en curso (`ya: 1` = llega sin repetir el saludo). El
  invitado no mira la hora; solo dibuja su llegada y su saludo. «Te acompaña» y «te saludan al pasar» quedan locales.
- Detalle que casi pasa: el campo se iba a llamar `e`, pero `e` es el tipo del mensaje en la sala (`{ e: evento, de,
  ...dato }`): lo habría pisado y el mensaje se perdía. Prueba que revisa que no se usen `e`, `de` ni `para`.
- Regla: **en multijugador, las decisiones van del anfitrión (eventos discretos, baratos) y el movimiento lo simula
  cada uno**; nunca dos simulaciones independientes con la esperanza de que coincidan.

### 2.7 Probar y medir

**T. El panel del navegador oculto no corre el juego.** Con el panel de vista previa escondido,
`requestAnimationFrame` no corre: el reloj del juego no avanza y parece que nada funciona. Además el jugador necesita
estar «activo» (puntero bloqueado). Para medir se usó Playwright sin ventana (`estudio/playwright.mjs`).

**U. Medidas** (headless con swiftshader, dos visitas y dos paseos en curso, junto a Braulio): `rutinas` + `paseos` +
`amigos` por cuadro, mediana 0,1 → 0,2 ms, p90 0,3 → 3,8 ms (búsquedas A* de los primeros segundos, con su tope
`nodosPorCuadro`), máximo 19 ms (un cuadro al reubicar al llegar los chunks). El viaje más caro: campamento → iglú,
727 bloques, 143 720 nodos, ~270 ms repartidos en ~3 s.

**V. Las pruebas que más sirvieron:** mundos de juguete para cada regla (pared con hueco, escalón de 2, agua honda,
seto de hojas), el terreno real con el mapa de alturas, y «el jugador se acerca a mitad del viaje» (4 rutas × 7
momentos) para la transición lejos → cerca. Cada bug que reportó el dueño quedó con una prueba que falla con el código
anterior.

---

## 3. Reglas que salen de todo esto

1. **Capas separadas:** buscar camino, llevar a alguien, decidir a dónde va y dibujarlo son cuatro cosas. La de abajo
   nunca sabe de la de arriba.
2. **Estados explícitos y que no se confunden:** «llegué», «terminé el camino pero no está», «no puedo llegar»,
   «me interrumpieron». Cada uno con su salida visible.
3. **Quien pide el viaje decide si llegó** (mira la persona o el lugar); el caminante solo dice que terminó.
4. **Lejos, un reloj; cerca, el cuerpo.** Y al pasar de lejos a cerca, aterrizar siempre.
5. **Nunca a la vista:** no aparecer, no teletransportar, no saludar a la nada, no rendirse de golpe. Lejos todo vale.
6. **Un dueño por hueso y por cuadro.**
7. **Toda escena declara a quién necesita.** Los NPC fuera de su sitio no pueden romper una escena.
8. **Los casos degenerados se prueban** (0-1 puntos, destino = origen, persona sin cargar, persona que se mueve
   mientras llegas).
9. **Todo número de sensación se edita sin tocar código** (velocidades, radios, esperas, frases).
10. **En multijugador decide uno y los demás dibujan.**

---

## 4. Consideraciones para el juego comercial

### 4.1 Navegación
- **Caminos jerárquicos:** A* sobre regiones (p. ej. 16×16 o por chunk) con conexiones precalculadas, y detalle solo en
  el tramo cercano. Hoy un viaje de 700 bloques cuesta 143 mil nodos; con regiones serían cientos.
- **Caché de rutas frecuentes** (casa → trabajo → plaza) que se invalida cuando cambia un bloque en la región.
- **Tabla de navegación por bloque:** pisable, atravesable, alto, costo, rompible, «solo de día» (puertas cerradas de
  noche), peligroso (lava, cactus).
- **Puertas, escaleras de mano, nadar, botes, saltar huecos de 1:** hoy no hay ninguno. Las puertas son lo primero
  (los NPC de un pueblo viven tras puertas).
- **Lugares con puntos de llegada** declarados (dónde se para cada uno, mirando a dónde) en vez de «el centro».
- **Evitar a otros NPC y al jugador:** hoy se atraviesan. Hace falta separación local (empujarse suave) y esperar en
  pasillos.
- **Caminos que se marcan y árboles que se rompen** (pedido del dueño): un mapa de «uso» por columna que, al pasar de
  un umbral, cambia pasto por tierra de a poco; los árboles en el camino se rompen solo si nadie mira.

### 4.2 Comportamiento
- **Intenciones, no destinos:** «ir a ver a Braulio», «ir a trabajar», «buscar comida». Cada intención sabe cuándo se
  cumplió, qué hacer si no puede y qué decir. Hoy eso vive mezclado en `rutinas.js`.
- **Agenda por personaje** (horario con prioridades) y reacción a lo que pasa (lluvia, noche, monstruos, el jugador
  pide algo). Un planificador simple (utilidad o árbol de comportamiento) en datos.
- **Encuentros:** si dos NPC se cruzan en el camino, que se saluden o se detengan a hablar según su relación.
- **Conversaciones de grupo con cualquier cantidad** (2, 3, 4…), según quiénes estén y su relación (pedido del dueño).
- **Te incluyen** (ya hecho en chico): con amistad alta te saludan al pasar, te invitan a donde van. En el comercial:
  que te sigan si aceptas, que te esperen, que te comenten algo de lo que hiciste (memoria).
- **Memoria y rumores:** los NPC recuerdan lo que les hiciste y lo cuentan; lo que pasa llega a otros pueblos con los
  viajeros.

### 4.3 Animación y sensación
- **Capas de animación con prioridad y mezcla** (ver regla 6): base de locomoción, mirada (cabeza y ojos con límites),
  gestos de brazos, gestos de cara, escena que manda sobre todo.
- **Mirada con intención:** mirar al jugador al pasar, mirar a quien habla, mirar a donde va antes de girar el cuerpo.
- **Ritmo:** frases largas y bien dichas, no apuradas (preferencia del dueño); un globo a la vez por NPC.
- **Nunca romper la ilusión a la vista:** sin apariciones, sin saludar a la nada, sin flotar, sin cabezas que tiemblan.

### 4.4 Multijugador
- **Anfitrión autoritativo para las decisiones**, cada cliente simula el movimiento con sus chunks (como el mensaje
  `ru`). Lista completa al entrar. Si el anfitrión se va, migrar la autoridad (hoy la sala se cierra).
- **Determinismo donde se pueda:** misma semilla y misma hora → mismas decisiones, para que un cliente que se
  desconecta un rato pueda seguir sin pedir todo.
- **Lo personal es local:** amistad, «te saludan al pasar», acompañante. Dos jugadores con amistades distintas ven
  reacciones distintas del mismo NPC.
- **Presupuesto de red:** eventos solo al cambiar de intención (unos pocos por día de juego), nunca posiciones de NPC
  por la red salvo que un jugador los esté mirando y haga falta precisión (peleas, escoltas).

### 4.5 Guardado
- Hoy el estado de las rutinas **no se guarda**: al cargar, todos parten en su sitio y la rutina retoma según la hora
  (si a esa hora tenían visita, salen). En el comercial hay que guardar dónde está cada NPC importante y qué intención
  tenía, o el mundo se «resetea» al cargar.

### 4.6 Rendimiento
- **Presupuesto por cuadro** para toda la IA (hoy `nodosPorCuadro` = 800, ~1,5 ms en un PC medio), repartido entre
  todos los NPC con una cola.
- **Niveles de detalle:** a la vista (animación completa), cerca pero sin ver (camina sin animar), lejos (salta por el
  camino), muy lejos (solo el reloj: «a esta hora está allá»).
- Medir siempre con el escenario peor (muchos NPC empezando viajes largos a la vez) y en un teléfono.

### 4.7 Herramientas
- **Vista de depuración en el juego:** dibujar el camino de cada NPC, su intención y su estado sobre la cabeza.
- **Comandos** (`/caminar`, `/rutina`) y pestaña del Estudio para probar una visita ya («Probar ahora»).
- **Pruebas automáticas** con mundos de juguete y con el terreno real, y una prueba de navegador por cada bug visto.
- **Registro de decisiones** por NPC (últimas 20: «salí a ver a Braulio», «no lo encontré», «me acerqué de nuevo»)
  para diagnosticar lo que el dueño ve jugando sin reproducirlo.

---

## 5. Pendiente en el portafolio

- Que los que quedan en la fogata sigan conversando si uno sale de visita (hoy se callan).
- 7i: el acompañante que te sigue (`rutinas.acompanar` / `retomar` ya existen).
- No editable aún: la tolerancia de altura de «te saludan al pasar» (±4 bloques) y el radio para seguir a quien se
  alejó (`radioEncuentro × 1,5`).
- Probar el cooperativo con dos equipos de verdad (`supervivencia.html?disp=2`).
- Puertas y nadar (hoy los amigos no los usan).
