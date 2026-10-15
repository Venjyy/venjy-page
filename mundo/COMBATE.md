# Combate nuevo · Bloque 8

Estado (2026-10-15): **encargo anotado completo, decisiones del dueño tomadas y ubicado en la hoja de ruta. El diseño detallado todavía no se hace.**

- §0 a §11: **el encargo del dueño, completo**. Es la fuente: el chat de diseño no puede perder ni contradecir nada de aquí.
- §12: **decisiones del dueño del 2026-10-15** (respuestas al PR #130).
- §13: **dónde entra** cada parte (portafolio, Estudio, comercial).
- §14 en adelante: **el diseño**. Lo escribe el chat 8·0 (Opus, effort alto, solo docs, rama nueva desde `main`, un PR solo de docs). Ese chat también divide el bloque 8 en PRs en `mundo/PENDIENTES.md`.

---

## 0. Meta del dueño (manda sobre todo lo demás)

- El combate actual es **monótono y típico de Minecraft** (spamear clic), sin ninguna vuelta. Se cambia para que sea **EL diferenciador del juego**.
- **Meta de gamefeel:** que el jugador diga «wow, es literal el combate de Sekiro en Minecraft, pero adaptado y mejor». Lo mismo con cada estilo: «es como X juego». Cuando la gente vea el juego comercial, que diga «lo único parecido a Minecraft son los bloques».
- Todo debe sentirse **fluido, pulido y con peso real; nada tosco. Animaciones únicas por estilo.**
- El dueño sabe que esto alarga mucho el desarrollo (meses de chats) y lo quiere igual.
- Gemini propuso más ideas que el dueño no pegó. **Respuesta del dueño (2026-10-15): no hace falta**, lo de aquí es lo que vale.

## 1. Animaciones de calidad (pilar que el dueño pidió subrayar, 2026-10-15)

> **ANIMACIONES DE CALIDAD, FLUIDAS, QUE SE VEAN BIEN Y NO RARAS, CON UN EXCELENTE GAMEFEEL.**

Esto vale para **cada PR** del bloque 8 y es criterio de salida: un golpe que funciona pero se ve raro o tosco **no está terminado**. Lo que el diseño (§14+) tiene que resolver y cada PR tiene que cumplir:

- **Las tres fases se leen siempre:** anticipación (el cuerpo se prepara, el rival y el jugador lo ven venir), golpe (rápido, con el arma siguiendo un arco claro) y recuperación (el cuerpo vuelve con inercia, no salta a la pose de reposo).
- **Nada de saltos entre poses:** al pasar de un estado a otro (caminar → atacar → esquivar → recibir golpe) se mezcla con curvas, sin cortes de un cuadro a otro. Cancelar un golpe también se mezcla.
- **Peso en el cuerpo entero:** caderas y torso giran antes que el brazo; las piernas se afirman y cambian el peso de pie; el cuerpo se agacha en los golpes pesados; la cabeza sigue al objetivo. Nunca un brazo que se mueve solo con el resto quieto.
- **Codos y rodillas (§4.4) se usan de verdad:** el brazo se dobla en la anticipación y se estira en el impacto; las rodillas flexionan al pisar fuerte, al esquivar y al caer.
- **Reacciones del que recibe:** se dobla, retrocede, cae y se levanta con animaciones propias, distintas según el golpe (alto, medio, bajo, pesado). Nunca un «parpadeo rojo» solo.
- **Curvas, no lineal:** aceleración y frenado (ease) en cada movimiento; los golpes rápidos con overshoot leve; la recuperación con asentamiento.
- **Animaciones únicas por estilo:** la postura de guardia, el caminar en combate, la esquiva y los golpes de Sekiro no se parecen a los de Urban Reign. Un estilo se reconoce con el personaje quieto.
- **Sin cosas raras:** sin brazos que atraviesan el cuerpo, sin pies que patinan, sin giros imposibles de las articulaciones, sin armas que atraviesan la cabeza. El diseño fija los límites de giro de cada articulación y una prueba los mide.
- **Revisión por capturas:** cada animación nueva se revisa con `node estudio/cli.mjs capturar gesto <clave> --hoja` (hoja de cuadros) antes del PR. Vale la memoria del proyecto: solo las capturas suficientes, sin videos.
- **Todo editable en el Estudio:** tiempos, curvas, ángulos de cada fase y reacciones (§10).
- **Quién las hace:** la skill `animaciones-minecraft` dice que la primera versión la hace Haiku. **Para el combate no basta**: las animaciones de pelea van con **Sonnet** como mínimo y Opus revisa cada una contra esta lista.

## 2. Decisiones ya tomadas (no volver a preguntarlas)

1. **REEMPLAZA el combate de Minecraft.**
   - Construir y minar se quedan como están: al dueño le gusta la construcción.
   - Si convivieran los dos, la gente usaría el de Minecraft por comodidad y el nuevo no tendría gracia.
   - Falta definir cómo convive con construir. Ejemplos a evaluar: el clic sobre un bloque mina y el clic con un enemigo en foco ataca; el modo combate se activa con un botón y quizás también solo, con un enemigo cerca. Proponer y justificar.
   - **Matiz del 2026-10-15 (§12):** mientras se prueba en la arena, el mundo abierto sigue con el spam de clic de Minecraft.
2. **Táctil desde la base.** Los de celular no pueden sentir que hacen menos que los de PC.
   - El combate **no lee teclas: lee intenciones**. Son: atacar, ataque fuerte o cargado, dirección del ataque, esquivar o dash en una dirección, parry o desvío, guardia, agarre, especial, modo especial, cambiar foco y saltar.
   - PC (teclado y mouse) y táctil traducen a esas mismas intenciones.
   - Cada estilo se pule primero en PC, pero **cada PR trae su versión táctil jugable**.
   - Ideas para el táctil: buffer de entrada más generoso, deslizar el dedo para esquivar en una dirección, foco automático, botones contextuales que cambian según el estilo y la situación, ventanas de parry ajustables por plataforma.
   - Los botones van en `mundo/datos/ui-layout.json` y se arrastran en el Estudio.
3. **Cooperativo desde la base** (hasta 8 jugadores, WebRTC en estrella con el anfitrión, Supabase de respaldo; en el juego comercial no hay Supabase, así que el diseño no puede depender de él).
   - Cada jugador juzga los golpes que **recibe**: su parry, su esquiva y sus i-frames se deciden en su propio equipo, sin lag.
   - El dueño del monstruo valida los golpes que recibe el monstruo, como ya se hace hoy y con los golpes del acompañante (mensaje `g`).
   - El anfitrión simula a los jefes.
   - Los demás ven por la red las animaciones, el foco y los efectos.
   - Medir el tamaño de los mensajes nuevos.
4. **Sin PvP por ahora.** Se verá cuando los 4 estilos estén listos y pulidos. Diseñar sin cerrarle la puerta y anotar lo que haría falta para el PvP como «no se hace ahora». El modo de 2 jugadores de la arena de Lalo contra Moisés (§12) es un 1 contra 1 entre amigos, no un PvP público.

## 3. Base común: modo combate y cámara

- Un botón para entrar al modo combate: **tercera persona DINÁMICA**. La cámara se mueve y reacciona de forma fluida: resorte, inercia, se adelanta al movimiento y se acerca en los remates. **No es el F5 de Minecraft**, que queda estático en el centro.
- En un mundo de bloques la cámara se mete en las paredes. Hace falta un rayo desde el jugador que la acerque, con suavizado y transparencia de lo que tape. **Es lo más delicado de la base: diseñarlo con cuidado.**
- **Autoaim o lock-on** a un enemigo, con una marca que muestre a cuál le haces foco (estilo Devil May Cry). Definir cómo se cambia el foco, cómo se suelta, qué pasa con varios enemigos y qué pasa si el enemigo sale de la vista.
- Revisar `supervivencia/camaras.js` (los planos de cine que ya existen) para reusar lo que sirva.
- En la arena de Lalo contra Moisés (§12) la cámara es otra: de lado, para 1 contra 1. La cámara dinámica en tercera persona es para el mundo abierto (8·M).

## 4. Base común: golpes, datos, estados, rig, enemigos y estilos

### 4.1 Peso de los golpes (game feel)
- Sistema para que los golpes se sientan pesados y con daño real:
  - **Hitstop:** congelar unos cuadros al conectar; más en los golpes fuertes.
  - **Cámara lenta breve** en los remates y en los parries perfectos.
  - **Sacudida de cámara** según la fuerza.
  - **Empuje y retroceso.**
  - Partículas y destellos.
  - **Sonido por capas.**
  - **Reacción visible del enemigo:** se dobla, retrocede o cae (ver §1).
- Todo con valores en datos (cuántos cuadros, cuánta sacudida…), editable.

### 4.2 Datos de cada ataque (como un juego de pelea)
- Cada ataque con:
  - anticipación (startup), cuadros activos y recuperación;
  - ventanas de cancelación: a qué se puede encadenar y desde qué cuadro;
  - daño y daño a la postura o a la zona;
  - empuje y hitstop;
  - i-frames y hyper armor;
  - qué reacción causa.
- En `mundo/datos/combate.json` (o uno por estilo), con esquema en `estudio/esquemas/`.
- **Pestaña nueva del Estudio** con la línea de tiempo de cada golpe (como la pestaña Escenas: bloques que se arrastran y estiran) y «Probar en el juego».

### 4.3 Máquina de estados del jugador
- Estados: quieto, moviéndose, atacando (por fases), recuperando, esquivando, aturdido, derribado, agarrando o agarrado, etc.
- **Buffer de entrada:** apretar un poco antes cuenta.
- Las transiciones entre estados se mezclan, sin saltos (§1).

### 4.4 Rig con articulaciones
- Hoy el rig de las personas (`mundo/criaturas/cuerpo.js`) tiene cuerpo, torso, cuello, cabeza, brazoD/I y piernaD/I, **sin codos ni rodillas**.
- Agregar **CODOS y RODILLAS**: 2 segmentos por brazo (brazo + antebrazo) y por pierna (muslo + canilla).
- **Manos y muñecas no hacen falta** a esta escala de cajas: el arma va pegada al final del antebrazo. Justificarlo en el diseño.
- **Compatibilidad obligatoria:** con el codo y la rodilla en 0, todo se ve **EXACTAMENTE** igual que hoy. No se pueden romper:
  - las escenas y los gestos;
  - las poses (`mundo/datos/poses.json`, `moldes.js`);
  - la pestaña Poses del Estudio;
  - las cartas.
- Plan de migración y **una prueba que lo verifique**.
- Los monstruos (zombis, esqueletos, arañas…) y los jefes también necesitan animaciones de ataque con aviso. Definir si usan el mismo rig o el suyo.

### 4.5 Enemigos con aviso (sin esto ningún estilo funciona)
- Hoy los monstruos solo persiguen y pegan.
- Necesitan:
  - ataques con **anticipación visible** (telegraph);
  - estados y patrones;
  - postura o zonas según el estilo;
  - reacciones al golpe: stagger, knockback, derribo y aturdimiento;
  - **que no ataquen todos a la vez**: fichas de ataque, como en los beat 'em up y en Batman Arkham.
- Leer `enemigos.js` y `jefes.js` (grep "function") para ver cómo piensan y pegan hoy.
- En la arena de Lalo contra Moisés el rival de la CPU usa el mismo principio de aviso, con IA de peleador.

### 4.6 Elegir y cambiar de estilo
- Cada estilo va amarrado a su tipo de arma:
  - **Sekiro:** katana.
  - **Urban Reign:** puños o pelea callejera.
  - **Goliath:** espadón, martillo o hacha pesada.
  - **Danzante:** dagas o guadaña ligera.
- Definir cómo se elige o se cambia de estilo (por el arma en la mano, un menú, un maestro, misiones…) y cómo encaja con el inventario, las recetas y la progresión actuales.
- **Decidido el 2026-10-15 (§12):** en el juego comercial, **cada uno de los 4 bastiones de la Fragmentación enseña un estilo**, con un maestro por bastión. Elegir estilo pasa a ser parte de la historia y de la reputación con las facciones.

## 5. Estilo 1 · «Sekiro» (katana)
- Inspirado en Sekiro y desarrollado de forma impecable:
  - **Parry o desvío con timing:** desvío perfecto o normal.
  - **Barra de POSTURA** en el jugador y en el enemigo. Al romperla viene el golpe mortal o un remate con animación.
  - **Roll o esquiva.**
  - **Ataques con peligro que no se pueden desviar**, con su marca: los barridos se saltan y las estocadas se contrarrestan.
  - **Chispas y sonido metálico** en cada desvío.
  - **Ritmo de duelo.**
- Es el **PRIMER estilo completo**: valida toda la base (parry, postura, hitstop, cámara, aviso de los enemigos y red).

## 6. Estilo 2 · «Urban Reign» (beat 'em up 3D de Namco, PS2, 2005)

**IMPORTANTE: investigar en la web el sistema de combate original de Urban Reign antes de diseñarlo.** Lo de abajo lo propuso Gemini y tiene errores probables:
- En el original, el contraataque (reversal) se hacía, de memoria, **acertando la altura** del golpe (alto o bajo) con buen timing. Lo de esquivar hacia «la dirección opuesta» parece inventado. Verificarlo.
- El **daño por zonas** (cabeza, cuerpo y piernas, con la silueta en pantalla) sí era real y es su sello.
- No es seguro que «Spark» existiera con ese nombre; la barra de especiales sí. Verificarlo.
- Su pilar menos conocido es **pelear en pareja dándole órdenes al compañero**. Calza directo con el acompañante del 7i, que ya pelea y recibe órdenes (`supervivencia/acompanante-pelea.js`, `acompanante.js`). Proponer cómo aprovecharlo: combos en pareja, órdenes de ataque, agarres de a dos…

El objetivo es **ADAPTAR BIEN el beat 'em up tridimensional, no copiar a Gemini.** Lo que propuso, punto por punto (respetar la intención y corregir lo que no calce con el original):

**6.1 Ataques direccionales en 3 alturas**
- Alto (W + clic): a la cabeza. Mayor daño base y aturdimiento corto (stagger).
- Medio (A/D o neutro + clic): al torso. Empuja hacia atrás (knockback) para controlar grupos.
- Bajo (S + clic): a las piernas. Derriba al enemigo (knockdown) de inmediato.

**6.2 Defensa «esquiva y contraataque», SIN bloqueo**
- Sin escudo ni guardia pasiva: no se puede mantener un botón para bloquear.
- Esquiva activa por predicción, con tecla dedicada (Shift o Espacio). En el cuadro exacto del golpe, el ataque se cancela (0 de daño) y el jugador queda detrás o al lado del rival.
- Direccionalidad: según Gemini, esquivar hacia el lado contrario al golpe. Contrastarlo con el original.

**6.3 Daño por zonas**
- Cada entidad (jugador y enemigos) tiene 3 secciones de salud ocultas: cabeza, cuerpo y piernas.
- Impactos seguidos en una zona (por ejemplo, 5 altos seguidos) la dejan en **ESTADO CRÍTICO**:
  - **Cabeza rota:** aturdido 3 s, con estrellas en la cabeza; no ataca ni se mueve.
  - **Cuerpo roto:** recibe el doble de daño de cualquier ataque posterior.
  - **Piernas rotas:** −70 % de velocidad hasta que se cure.

**6.4 Agarre (grapple) y remate en el suelo**
- **Agarre** (F, o clic derecho con la mano vacía) a corta distancia: animación o combo rápido que el enemigo no puede esquivar.
- **Ground pound:** con el enemigo derribado por un ataque bajo, mirar hacia abajo y clic. Golpe o pisotón final de alto daño.

**6.5 Barra de Special Arts (SPA)**
- Se llena al golpear y al recibir daño.
- **Special Art** (25 % de la barra): ataque giratorio de área con i-frames, para librarse cuando te rodean.
- **Modo Spark** (100 %): aura visual por 10 s. Los ataques rompen la defensa, eres inmune al stagger y los ataques son un 50 % más rápidos.

**6.6 Los tres pilares de flujo**
- **Cancelación de animaciones:** si fallas un golpe alto quedas vendido; si conecta, puedes cancelar sus cuadros finales para encadenar un medio o un agarre.
- **Esquiva neutra (ducking o weaving):** esquivar sin moverse agacha la cabeza o mueve el torso. Esquiva automáticamente cualquier ataque alto y te deja en posición perfecta para un contraataque bajo (S + clic).
- **Rebote en paredes (wall splat):** el ataque medio cerca de una pared o estructura de bloques hace rebotar al enemigo y lo deja aturdido 1 s. Incentiva usar el entorno 3D de bloques.

Resolver los choques con los controles de PC (W y S también mueven; el clic también mina) y cómo se hace todo en táctil.

## 7. Estilo 3 · «Goliath impenetrable» (Monster Hunter / Dark Souls)
- Enfocado en el posicionamiento, el manejo del peso, el daño masivo y la destrucción del entorno.
- **Armas:** espadones (greatswords), martillos de guerra o hachas pesadas.
- **Hyper armor (inmutabilidad):** al cargar un ataque pesado no te interrumpe ningún golpe (stagger), pero sigues recibiendo el daño. Arriesgas vida a cambio de un impacto devastador.
- **Ataques cargados con impacto geométrico:**
  - Mantener el clic carga el golpe.
  - Al soltar, si pega en el suelo genera una **ONDA DE CHOQUE** (daño en área) y rompe visualmente los bloques de la superficie, con partículas de piedra o tierra disparadas.
  - Los bloques **se restauran** después. Debe dar una sensación de poder absoluto.
  - En el cooperativo los bloques tienen que volver en todos, y el golpe no puede romper construcciones de verdad.
- **Guardia y contragolpe, sin rueda:**
  - Su botón de defensa levanta el arma y bloquea el 80 % del daño.
  - Bloquear un ataque pesado en el último instante desestabiliza al enemigo (recoil) y abre una ventana para un golpe crítico lento.

## 8. Estilo 4 · «Danzante de las sombras» (Devil May Cry / Trickster)
- Enfocado en la movilidad aérea, los combos largos, la velocidad vertical y el control de estilo.
- **Armas:** dagas duales o guadañas ligeras.
- **Combate aéreo (juggles):** ciertos ataques (por ejemplo, mantener el ataque secundario) lanzan al enemigo al aire. Saltas detrás y haces un combo suspendido en el aire, desafiando la gravedad de Minecraft.
- **Dash de humo o sombra** (no es un roll): atraviesa enemigos y te deja en su espalda al instante (teleport corto).
- **Rango de estilo en el HUD** (D, C, B, A, S, SSS): sube al variar los ataques y no recibir daño. A mayor rango, más velocidad de movimiento y efectos más vistosos (estelas de luz en los golpes).

## 9. Jefes y arena (sentido Dark Souls)
- **Arena especial para cada jefe**, con fases, animaciones propias, patrones con aviso y música. Que se sienta extremadamente pulido.
- **La entrada a la arena debe tener gracia:** una animación o un viaje claro, **NO** simplemente ir y teletransportarte. Es como la pista de la carrera de gatas, pero con una animación más clara (ver `carrera.js`, grep "escenario", como ejemplo de escenario aparte).
- Revisar `jefes.js` (lo que hay hoy) y proponer qué se reusa.
- Cada jefe necesita:
  - barra de vida;
  - cambio de fase con una escena corta;
  - muerte y reintento;
  - qué pasa en el cooperativo: el anfitrión lo simula; entran todos o solo los que estén cerca.
- **Regla del proyecto:** los minijuegos y las peleas especiales son juegos completos (escenario propio, dificultad y sensación), nada de mecánica pelada. Vale igual para la arena de Lalo contra Moisés.

## 10. Qué va en datos y en el Estudio (todo editable por el dueño)
- Tiempos, daños, ventanas, cámara, colores, curvas de animación, ángulos por fase, reacciones y textos ES/EN van en `mundo/datos/*.json` (por ejemplo `combate.json`, o uno por estilo), con esquema en `estudio/esquemas/`.
- Pestaña **Combate** del Estudio: la línea de tiempo de cada golpe y «Probar en el juego».
- Los canales de codo y rodilla, en la pestaña **Poses**.
- Los botones táctiles, en `ui-layout.json`.
- Nada de números mágicos.

## 11. Riesgos que el diseño debe resolver
- La cámara en tercera persona metiéndose en los bloques.
- Cambiar el rig sin romper las escenas, gestos, poses, cartas y la pestaña Poses.
- La latencia en el cooperativo, con ventanas de parry de pocos cuadros: autoridad local de cada jugador.
- Que el táctil pueda hacer lo mismo que PC con buen gamefeel.
- El rendimiento: partículas, bloques que se rompen y vuelven, cámara lenta con varios jugadores. ¿La cámara lenta es solo local?
- Que el clic de minar y el de atacar no choquen.
- El balance de los 4 estilos entre sí, pensando en el PvP futuro.
- **Animaciones que se vean raras** (§1): es un riesgo tan grande como la cámara.

### Qué leer (por tramos con grep; no abrir enteros los archivos de más de ~200 líneas)
- `mundo/PENDIENTES.md`: `grep -n "### Bloque"`, Bloque 5 (cooperativo), el estado del 7i (acompañante) y este Bloque 8.
- `mundo/supervivencia/MAPA.md` (mapa de módulos).
- `mundo/supervivencia/combate.js` (entero: es chico y es lo que se reemplaza).
- `mundo/supervivencia/enemigos.js` y `jefes.js` (grep "function").
- `mundo/criaturas/cuerpo.js` (el rig y el caminar) y la skill `.claude/skills/animaciones-minecraft/` §0-2 (rig, signos y poses).
- `mundo/supervivencia/camaras.js` (planos de cine).
- `mundo/supervivencia/tactil-supervivencia.js` y `mundo/datos/ui-layout.json`.
- `mundo/supervivencia/coop.js` (grep `'g'` y cómo se validan los golpes).
- `mundo/supervivencia/acompanante-pelea.js` y `acompanante.js`.
- `carrera.js` (grep "escenario").
- `estudio/DISENO.md` (cómo se diseñan las pestañas del Estudio).

### Qué entrega el chat de diseño (8·0)
- **§14+ de este archivo**, el documento de diseño completo:
  - los pilares de gamefeel y qué juego evoca cada estilo;
  - la base común (intenciones PC y táctil, máquina de estados, datos de cada ataque, peso, cámara y lock-on, rig con codos y rodillas y por qué sin manos, IA con aviso, red y autoridad);
  - cada estilo con TODAS sus mecánicas, con Urban Reign corregido tras investigarlo, sus controles en PC y táctil y **sus animaciones clave descritas fase por fase** (§1);
  - la arena de Lalo contra Moisés;
  - jefes y arena con la entrada animada;
  - qué va en datos, en qué esquemas y en qué pestaña;
  - riesgos, lo que no se hace ahora (PvP) y preguntas abiertas.
- **El bloque 8 de `mundo/PENDIENTES.md` dividido en PRs chicos y verificables**, en el orden de §13. Cada PR con su prueba de Node, su versión táctil, lo que toca del cooperativo, su «qué mirar» y una estimación honesta del tamaño.
- Un PR solo de docs, con las preguntas abiertas en la descripción.

### Reglas del proyecto (siempre)
- Todo ajustable desde el Estudio (§10).
- El modo creativo (`mundo.html`) **no se toca**: todo va en la supervivencia.
- Estética Minecraft en la interfaz: fuente PixelCraft y sin emojis como íconos (se dibujan en código). Todo texto visible con su par ES/EN.
- Nombres de archivos, funciones y datos en español.
- `mundo/PENDIENTES.md` manda y lleva su línea en la bitácora.
- Commits y PR sin atribución de herramientas.
- Cierre liviano con el prompt de traspaso.

---

## 12. Decisiones del dueño (2026-10-15, respuestas al PR #130)

1. **El combate nuevo se prueba y se pule en la arena de Lalo contra Moisés** (estilo Mortal Kombat), con todo el trabajo de animaciones pulidas. Mientras tanto, el mundo abierto **sigue con el spam de clic de Minecraft**. Cuando se vea que funciona bien en la arena, se pasa al mundo abierto (8·M).
2. **La arena sale con 2 estilos: Sekiro y Urban Reign**, uno por peleador, para que queden muy bien y de buena calidad. Goliath y Danzante se suman después.
3. **Cada uno de los 4 bastiones enseña un estilo**, con un maestro por bastión (§4.6).
4. **No hay más ideas de Gemini que agregar.** Este documento tiene que ser ultra específico y no perder nada del encargo, con énfasis en las **animaciones de calidad** (§1).

## 13. Dónde entra

El combate completo son **meses** (estimación gruesa: 25 a 35 PRs). El portafolio está a pocos puntos de terminar.

| Parte | Qué | Dónde | Por qué |
|---|---|---|---|
| **8·0 Diseño** | §14+ de este archivo y el bloque 8 dividido en PRs | **Ya**, al fusionar #129 y #130. Chat solo de docs | Define el núcleo y la arena antes de programar |
| **8·N Núcleo** | Rig con codos y rodillas compatible · datos de cada ataque, máquina de estados, intenciones PC y táctil, hitstop y peso · pestaña Combate del Estudio | **Portafolio, Etapa A5** | Sin núcleo, Lalo contra Moisés se haría con una base para botar. El rig nuevo tiene que estar antes de la Etapa B, para que las escenas y gestos que pasen al Estudio ya tengan codos y rodillas |
| **8·L Arena de Lalo vs Moisés** | Minijuego estilo Mortal Kombat con **Sekiro y Urban Reign**, arena propia con entrada animada, rival de la CPU con aviso, 1 o 2 jugadores | **Portafolio, Etapa A5** (reemplaza el punto «Lalo vs Moisés») | Cámara de lado fija: sin el problema de los bloques. Un 1 contra 1 deja pulir el timing, la postura, el hitstop, el peso, las animaciones y el táctil sin grupos de enemigos. El modo de 2 jugadores mide el balance antes de cualquier PvP. Estimación: 8 a 10 PRs con el núcleo |
| **8·M Mundo abierto** | Modo combate en la supervivencia, cámara dinámica en tercera persona con lock-on, enemigos con aviso y fichas, red de combate en grupo, los estilos de la arena llevados al mundo y primer jefe con arena | **Cuando la arena funcione bien** (decisión del dueño). Por defecto, fase comercial C1, después del empaquetado y la limpieza legal | Reemplaza el spam de clic. Hereda animaciones y datos de 8·L. La fase 1 mide el rendimiento en Android antes de gastar partículas y cámara lenta |
| **8·E Estilos y jefes** | Pareja con el acompañante (Urban Reign) · Goliath (con la destrucción de bloques) · Danzante · más jefes · PvP público (después) · maestros por bastión | **Comercial:** la pareja y los maestros junto a la fase 4 (personajes) y la 4b (facciones); Goliath, Danzante y más jefes durante o después del Acceso anticipado. Cada estilo entra también al plantel de la arena | Las facciones pelean con la IA con aviso de 8·M. En 1 contra 1, «cada uno juzga lo que recibe» basta entre amigos; un PvP público pide otra red |

**Consecuencias en el Estudio:**
- La pestaña **Combate** nace editable en 8·N y reutiliza la línea de tiempo de Escenas. El motor genérico (B3) la tiene en cuenta.
- La pestaña **Poses** suma los canales de codo y rodilla en 8·N, antes de B2.

---

## 14. Diseño

*(Pendiente: lo escribe el chat 8·0.)*
