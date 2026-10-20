# Combate nuevo · Bloque 8

Estado (2026-10-15): **encargo anotado completo, decisiones del dueño tomadas, ubicado en la hoja de ruta y diseño escrito (§14-28, chat 8·0).** Lo que sigue es el PR N1 (rig con codos y rodillas).

- §0 a §11: **el encargo del dueño, completo**. Es la fuente: el chat de diseño no puede perder ni contradecir nada de aquí.
- §12: **decisiones del dueño del 2026-10-15** (respuestas al PR #130).
- §13: **dónde entra** cada parte (portafolio, Estudio, comercial).
- §14 a §28: **el diseño** (chat 8·0). Núcleo, Sekiro, Urban Reign (investigado y corregido), reacciones y arena de Lalo contra Moisés al detalle; mundo abierto, Goliath, Danzante y jefes a nivel de diseño. Respuestas del dueño en §27. El bloque 8 de `mundo/PENDIENTES.md` tiene los PRs.

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

## 14. Diseño · cómo leerlo

Escrito por el chat 8·0 (2026-10-15). Cada sección cita el punto del encargo que resuelve (§0-12). Lo que lleva **«decidido»** no se vuelve a discutir en los PRs. Lo que lleva **«punto de partida»** son valores iniciales que el PR ajusta con capturas y que después edita el dueño en el Estudio. Las respuestas del dueño a las preguntas del diseño están en §27.

| § | Qué | Nivel |
|---|---|---|
| 14.1 | Pilares de gamefeel y qué juego evoca cada estilo | decidido |
| 15 | Núcleo (8·N): intenciones, estados, datos de ataques, peso, rig con codos y rodillas, motor de animación, red | detalle de construcción |
| 16 | Estilo Sekiro: mecánicas, controles y animaciones fase por fase | detalle de construcción |
| 17 | Estilo Urban Reign: investigación, correcciones a Gemini, mecánicas, controles y animaciones fase por fase | detalle de construcción |
| 18 | Reacciones comunes (las de quien recibe) fase por fase | detalle de construcción |
| 19 | Arena de Lalo contra Moisés (8·L) | detalle de construcción |
| 20 | Mundo abierto (8·M): modo combate, cámara en tercera persona, foco, enemigos con aviso | diseño |
| 21 | Goliath | diseño |
| 22 | Danzante | diseño |
| 23 | Jefes y arenas con entrada animada | diseño |
| 24 | Estilos, armas, maestros y progresión | diseño |
| 25 | Datos, esquemas y pestañas del Estudio | detalle de construcción |
| 26 | Riesgos y cómo se resuelven · lo que no se hace ahora (PvP) | decidido |
| 27 | Respuestas del dueño | decidido |
| 28 | Partición en PRs (copia de `PENDIENTES.md`) | decidido |

**Unidades en todo el documento:** los tiempos de combate se escriben en **cuadros a 60 por segundo** («c»): 6 c = 0,1 s. Es la unidad de los juegos de pelea y la que usa `combate.json`. Los ángulos van en **radianes** y los nombres de canal son los de las poses (`rig.md`), más los nuevos de §15.5. Las distancias van en bloques.

### 14.1 Pilares de gamefeel (los cinco que juzgan cada PR)

1. **Se lee antes de que pase.** Todo golpe, propio o ajeno, tiene una anticipación que se ve con el personaje de espalda, de lado o lejos. Si el jugador pierde, tiene que saber por qué. Esto incluye los avisos de peligro (§16.4) y la altura del golpe (§17.3).
2. **Pega y se siente.** Hitstop, sacudida, sonido por capas, chispas o polvo y reacción del cuerpo en cada contacto (§15.4). Un golpe que conecta sin todo eso no está terminado.
3. **Responde al instante.** Entre apretar y ver el primer cuadro del movimiento pasan como mucho 2 c (la anticipación empieza al tiro, aunque sea lenta). El buffer (§15.2) hace que lo apretado un poco antes cuente.
4. **Fluye.** Nada salta de una pose a otra: inercialización en cada cambio de estado (§15.6). Los pies no patinan y el cuerpo entero se mueve, no solo el brazo (§1).
5. **Cada estilo es otro juego.** Con el personaje quieto ya se sabe qué estilo usa: guardia, respiración, forma de caminar y de esquivar propias.

| Estilo | Qué tiene que decir la gente | Qué lo hace sentir así |
|---|---|---|
| Sekiro (katana) | «Es Sekiro en Minecraft» | Ritmo de duelo de toma y daca, el clang del desvío perfecto, la postura que se llena hasta romperse, el peligro rojo que obliga a decidir en medio segundo |
| Urban Reign (puños) | «Es un beat 'em up de PS2 de verdad» | Leer la altura del golpe y desviarlo con un contraataque brutal, castigar zonas hasta romperlas, agarres que se escapan adivinando, rebotar al rival en la pared |
| Goliath (espadón, martillo, hacha) | «Es Monster Hunter» | Carga con riesgo, golpes lentos que paran el mundo, el suelo que revienta |
| Danzante (dagas, guadaña) | «Es Devil May Cry» | Combos en el aire, el humo del dash, la letra del rango que sube a SSS |

### 14.2 Decisiones grandes de este diseño (resumen)

- **La lógica del combate corre a paso fijo de 60 Hz** (acumulador), separada del dibujo, que interpola. Así los cuadros de los datos son cuadros de verdad en cualquier pantalla (30, 60 o 120 Hz). Además deja la puerta abierta a un PvP con rollback (§26.2).
- **Una sola máquina de estados y un solo formato de ataque para todos los estilos, la CPU y los monstruos.** Un estilo es un archivo de datos (`estilo-*.json`) más reglas propias chicas (postura en Sekiro, zonas en Urban Reign).
- **Las animaciones de combate son datos con forma de gesto** (el formato de `poses.json`), pero sus claves se anclan a las **fases** del ataque. Si el dueño alarga la anticipación en la línea de tiempo, la animación se estira con ella y nunca se desfasa de los cuadros activos (§15.3).
- **Rig:** codo y rodilla con una **rótula** que tapa el hueco de la articulación doblada, y un pivote nuevo `pecho` para que las caderas y el torso giren por separado. Todo en 0 es idéntico a hoy: lo prueba una comparación de matrices (§15.5).
- **Mezcla por inercialización:** al cambiar de estado se guarda la diferencia entre lo que se veía y la pose nueva, y esa diferencia se apaga con un resorte. Cancelar, recibir un golpe a media animación o esquivar a media carrera nunca da un salto (§15.6).
- **Red:** cada uno juzga lo que **recibe**. El hitstop esconde la latencia del veredicto (§15.8).
- **Cámara de la arena:** de lado al **eje del duelo** (la recta entre los dos peleadores), como Tekken. Se puede dar un paso lateral sin que la cámara pierda a nadie (§19.4).
- **Convivencia con construir (mundo abierto):** el arma de estilo en la mano define la intención. Con katana, puños vendados, espadón o dagas, el clic ataca y nunca mina; con herramienta o bloque, todo sigue como Minecraft (§20.1).

---

## 15. Núcleo (8·N)

### 15.1 Intenciones (§2.2)

El combate no lee teclas: lee un objeto `intencion` por cuadro lógico, que arma `combate/intenciones.js` desde el teclado y el mouse, el táctil o la red (o la CPU, que escribe intenciones como un jugador).

| Intención | Tipo | Qué significa |
|---|---|---|
| `mover` | vector 2D (-1..1) | En la arena, x = adelante o atrás en el eje e y = paso lateral. En el mundo, relativo a la cámara |
| `altura` | `alto` · `medio` · `bajo` · `neutro` | Se lee **en el cuadro en que se aprieta** atacar, defensa o agarre (no después) |
| `atacar` | apretar · soltar | Ataque normal. Mantener cuenta como `fuerte` si el estilo lo tiene |
| `fuerte` | mantener (cuadros) | Carga. La lleva el estilo: Sekiro, golpe fuerte; Goliath, carga de 3 niveles |
| `defensa` | apretar · mantener · soltar | Sekiro: tocar para desviar, mantener para guardia. Urban Reign: tocar para esquivar, y con la altura justa, desviar. Goliath: guardia. Danzante: dash |
| `esquivar` | apretar + dirección | Paso, rodada o dash según el estilo |
| `agarre` | apretar | Agarre (Urban Reign) o patada frontal (Sekiro, §16.1) |
| `especial` | apretar | Arte especial: SPA (Urban Reign), arte de combate (Sekiro) |
| `modoEspecial` | apretar | Furia (Urban Reign) o Rango (Danzante). Se reserva |
| `foco` | apretar · cambiar(±1) | Fijar o soltar el objetivo, o pasar al siguiente. En la arena el foco es fijo |
| `saltar` | apretar | Salto. En Sekiro, también se usa contra los barridos |

**Controles en PC: arena** (punto de partida, en `combate.json → teclas.arena`; el dueño los cambia en la pestaña Combate):

| Intención | Mouse y teclado (por defecto) | Solo teclado (2.º perfil) |
|---|---|---|
| mover | A / D en el eje (relativo a la pantalla: se traduce a adelante o atrás según el lado) | ← / → |
| altura | **W** = alto, **S** = bajo, nada = medio o neutro | ↑ / ↓ |
| atacar / fuerte | clic izquierdo (mantener 14 c = fuerte) | J |
| defensa | clic derecho | K |
| esquivar | Shift + dirección (W o S = paso lateral; A o D = atrás o adelante) | L + dirección |
| agarre | E | U |
| especial | Q | I |
| modoEspecial | Q + E juntos | U + I |
| saltar | Espacio | Espacio |

- W y S no sirven para caminar en la arena: el movimiento es A y D sobre el eje, y el paso lateral sale de la esquiva. Así se libera W y S para la altura, que es el corazón de Urban Reign. Es justo el choque de controles que pedía resolver §6.
- **En el mundo abierto** (8·M) W y S vuelven a caminar. Allí la altura se toma de la **inclinación de la mira**: mirar arriba del centro del pecho del objetivo es alto, mirar abajo de la cintura es bajo. Además, mientras se mantiene `defensa`, W y S fijan la altura. Lo resume §20.2.

**Mando (decidido, §27.7):** el stick izquierdo es `mover` y la altura (arriba o abajo al apretar). Los botones de abajo son `atacar` y `defensa`; los de arriba, `agarre` y `especial`. Un gatillo es `esquivar` y el otro `foco`; el salto va en un botón propio. Vibra en los impactos. Va en `combate.json → teclas.mando` y entra en N4 (Gamepad API).

**Controles táctiles: arena** (botones en `ui-layout.json → arena`, arrastrables en el Estudio):

| Zona | Gesto | Intención |
|---|---|---|
| Mitad izquierda | joystick flotante (aparece donde se apoya el dedo) | `mover` (izquierda o derecha en el eje; arriba o abajo no camina) |
| **ATACAR** (grande, abajo a la derecha) | toque = medio · **deslizar arriba** = alto · **deslizar abajo** = bajo · mantener = fuerte | `atacar` + `altura` en un solo gesto, con un solo pulgar |
| **DEFENSA** (a la izquierda de ATACAR) | toque · mantener · deslizar arriba o abajo | `defensa` + `altura` (el desvío por altura de Urban Reign sale con un gesto) |
| Zona libre de la derecha | deslizar rápido en una dirección | `esquivar` en esa dirección (hacia el rival = mikiri en Sekiro) |
| **SALTAR** | toque | `saltar` |
| **AGARRE** o **ARTE** | toque | según el estilo |
| **ESPECIAL** | toque. Solo aparece si hay barra (botón contextual) | `especial` (mantener 20 c = `modoEspecial`) |

- **Asistencias del táctil** (todas en `combate.json → tactil`): buffer de 12 c en vez de 8; ventanas de desvío y esquiva con +2 c; el umbral para que un deslizamiento cuente es de 18 px o 120 ms; la vibración en impactos fuertes y desvíos perfectos (`navigator.vibrate`, intensidad editable, apagable) y el foco siempre automático.
- **Regla del táctil (decidida):** nada del combate pide dos dedos a la vez en la derecha. Todo lo que en PC es «tecla + clic» en el táctil es **un gesto sobre un solo botón** (deslizar).
- En el cooperativo y en el 2 jugadores **cada uno juzga lo que recibe con sus propias ventanas**, así que el de celular tiene sus 2 c extra al defenderse. Entre amigos vale. En la arena de 2 jugadores también (decidido, §27.3: lo más cómodo para el de celular). El interruptor «ventanas iguales» existe, pero viene apagado.
- **Hecho en N4 (2026-10-20), con estos ajustes** (`combate/intenciones.js`, `combate/tactil-arena.js`; datos en `combate.json → teclas` y `→ tactil`, botones en `ui-layout.json → arena`):
  - **ATACAR y DEFENSA esperan el gesto** en el táctil: el deslizamiento sale apenas se cruzan los 18 px en vertical (antes de 120 ms); un toque sale al soltar; pasados los 120 ms sin cruzarlos, es mantener (con altura neutra). Así un dedo que tiembla nunca da alto ni bajo, a cambio de que el toque salga al soltar.
  - **Carga:** si el estilo tiene `controles.fuerte`, mantener atacar 14 c da `fuerte` y el ataque normal sale al soltar antes; si no lo tiene, atacar sale al apretar.
  - **Altura neutra** = `entrada.alturaNeutra` («medio»): la misma para PC sin W ni S y para el toque.
  - **Esquiva en PC:** la dirección es la del cuadro en que se aprieta Shift (W o S = paso lateral, A o D = atrás o adelante). `mover[1]` solo trae algo en ese cuadro.
  - **Mando (mapeo estándar):** X = atacar, A = defensa, Y = agarre, B = especial, RT = esquivar, LT = foco, RB = saltar, LB = modoEspecial. Vibra con `vibrationActuator` ([ms, motor grande, chico]).
  - **Botones de la arena** en la página `arena` de `ui-layout.json` (Estudio → Layout → Página «Arena»); el joystick es flotante y su tamaño está en `tactil.joystick`.

### 15.2 Máquina de estados (§4.3)

Un peleador (jugador, CPU, monstruo o jefe con rig de persona) tiene **un** estado activo. Cada estado tiene una prioridad y dice desde qué cuadro se puede salir y hacia qué estados.

| Estado | Sale con | Notas |
|---|---|---|
| `guardia` (quieto, en guardia del estilo) | cualquier intención | Respiración del estilo (capa secundaria) |
| `paso` (moviéndose en guardia) | cualquier intención | Caminar propio del estilo (§16.2, §17.6) |
| `ataque` · fases `anticipacion` → `activo` → `recuperacion` | ventanas de cancelación del ataque (§15.3) | Puede tener i-frames o hyper armor por tramo |
| `carga` (mantener fuerte) | soltar o llegar al tope · `defensa` si el estilo deja cancelar | Goliath: hyper armor |
| `desvio` (ventana abierta) | termina sola (`ventana` c) o pasa a `guardia` mantenida | Sekiro: penalización por repetir (§16.3) |
| `bloqueo` (guardia mantenida) | soltar | Sube la postura propia al recibir |
| `esquiva` | termina sola · cancelable en el último tercio a ataque (Urban Reign: contraataque) | i-frames por tramo |
| `contra` (contraataque automático) | termina sola | Urban Reign y Mikiri: no se puede interrumpir (i-frames enteros) |
| `agarre` / `agarrado` | escape (`agarrado`) por adivinanza (§17.7) | Los dos peleadores se sincronizan a una sola animación de pareja |
| `reaccion` (golpeado: tipo alto, medio, bajo, pesado) | termina sola · Sekiro: desvío desde el cuadro 8 de una reacción leve (como el juego) | La elige el ataque recibido (§18) |
| `aturdido` (mareo, postura rota) | termina sola | Recibe golpe final o remate |
| `derribado` → `levantarse` | levantarse: i-frames enteros; rodar a un lado con `esquivar` | |
| `remate` / `rematado` | termina sola | Animación de pareja con cámara de cine |
| `muerto` / `victoria` | — | |

- **Prioridad al recibir:** `contra` y `remate` (no se interrumpen) > hyper armor (recibe el daño sin reacción) > `esquiva` con i-frames > `desvio` > `bloqueo` > el resto (reacción).
- **Buffer de entrada:** una intención apretada se guarda **8 c** (12 c en táctil). Se consume en el primer cuadro en que el estado actual deja salir hacia ella. Si llegan dos, gana la última, salvo `defensa`, que gana siempre (defenderse nunca se pierde por haber apretado atacar antes).
- **Cancelar a defensa:** en Sekiro, todo ataque ligero se puede cancelar a `desvio` desde el primer cuadro de recuperación (como el juego: atacar no te deja vendido ante el contraataque si lees bien). En Urban Reign solo si el golpe conectó (§17.4).
- Está todo en `combate/estados.js`, puro y sin three.js. Lo prueba `mundo/tests/combate-nucleo.mjs`.

### 15.3 Datos de cada ataque (§4.2)

Formato en `estilo-*.json → ataques.<clave>` (esquema `estudio/esquemas/estilo.schema.json`). Ejemplo, punto de partida del primer tajo de Sekiro:

```json
"tajo1": {
  "nombre": { "es": "Tajo", "en": "Slash" },
  "fases": { "anticipacion": 9, "activo": 4, "recuperacion": 16 },
  "altura": "alto",
  "peligro": null,
  "dano": 6, "postura": 10, "zona": { "cabeza": 1 },
  "alcance": 2.4, "arco": [-60, 60],
  "empuje": 0.25, "avance": { "fase": "anticipacion", "hasta": 0.55, "curva": "salida" },
  "hitstop": "ligero",
  "reaccion": "alto_leve",
  "cancelar": [
    { "a": ["tajo2"], "desde": "activo+2", "hasta": "recuperacion+10" },
    { "a": ["desvio", "esquiva"], "desde": "recuperacion+0" }
  ],
  "iframes": [], "armadura": [],
  "sonido": { "aire": "tajo", "impacto": "carne", "desvio": "metal" },
  "anim": "tajo1"
}
```

- `fases`: en cuadros. `cancelar.desde` y `hasta` se escriben respecto a una fase («activo+2»). Así siguen valiendo si el dueño estira una fase.
- `altura` (alto, medio, bajo) existe en **todos** los ataques de todos los estilos. Es lo que permite el cruce Sekiro contra Urban Reign (§19.2).
- `peligro`: `null`, `barrido`, `estocada`, `agarre` o `imparable`. Lo leen las reglas de defensa de cada estilo (§16.4, §17.5).
- `dano` (vida), `postura` (lo que suma a la postura del que recibe o bloquea), `zona` (lo que suma a cada zona de Urban Reign). Cada ataque lleva los tres: cada estilo usa su recurso, y cuando se cruzan los dos sistemas funcionan a la vez.
- `iframes` y `armadura`: listas de tramos `["activo+0", "activo+3"]`.
- `avance`: desplazamiento del cuerpo durante el ataque (root motion) en bloques, con su curva. Debe calzar con los pies (§15.6, regla del pie en el aire).
- `anim`: la clave de la animación en `estilo-*.json → anim`.

**Formato de las animaciones de combate** (extensión del de `poses.json`, que se mantiene compatible): cada canal es un valor fijo, una lista de claves o un oscilador, como hoy. La diferencia es que **una clave de combate se ancla a una fase**: `["a", 0.6, -1.4, "salida"]` significa «en la anticipación, al 60 %, el canal vale −1,4 y llega con curva `salida`». Las fases son `a` (anticipación), `g` (golpe o activo) y `r` (recuperación). Si la anticipación pasa de 9 a 12 c, la clave queda en el 60 % de 12. El evaluador es `evaluarGesto` de `mundo/datos/gestos.js` con un reloj nuevo (`fases`) que traduce el cuadro del ataque a «fase + fracción». Las poses de hoy no cambian.

**Curvas con nombre** (en `combate.json → curvas`, editables como puntos de control):

| Curva | Forma | Uso |
|---|---|---|
| `lineal` | recta | Casi nunca. Solo osciladores |
| `suave` | ease-in-out | Pasar a la guardia, mirar |
| `entrada` | ease-in (acelera) | El último tramo de la anticipación, cuando el cuerpo «suelta» el golpe |
| `salida` | ease-out (frena) | El golpe y los pasos |
| `latigo` | ease-out con sobrepaso del 8 % que vuelve en el último 20 % | Golpes rápidos: el arma pasa un poco más allá y vuelve (§1: overshoot leve) |
| `asentar` | resorte amortiguado (2 rebotes que se apagan) | Recuperación: el cuerpo se asienta en la guardia |
| `retroceso` | baja un 6 % antes de subir (anticipación dentro de la anticipación) | Inicio de los golpes fuertes |

### 15.4 Peso de los golpes (§4.1)

Todos los números en `combate.json → peso` (pestaña Combate, panel Peso). Punto de partida:

| Nivel | Hitstop | Sacudida (trauma) | Empuje | Cámara lenta | Partículas |
|---|---|---|---|---|---|
| `ligero` | 4 c | 0,15 | 0,25 | — | 6 |
| `medio` | 6 c | 0,25 | 0,5 | — | 10 |
| `fuerte` | 9 c | 0,45 | 1,0 | — | 16 |
| `desvio` | 5 c (los dos) | 0,15 | 0,15 a cada uno | — | chispas 10 |
| `perfecto` | 8 c (los dos) | 0,3 | 0,3 al atacante | 0,25 s a 0,4× | chispas 18 + destello |
| `remate` | 14 c | 0,7 | según la animación | 0,8 s a 0,3× + acercamiento | 24 |

- **Hitstop:** congela **solo a los dos implicados** (animación y avance). El resto del mundo sigue. Durante el hitstop el que recibe **tiembla** (±0,03 bloques alternando cada 2 c, en el eje del golpe) y el arma deja su estela quieta. Sin temblor, el hitstop se lee como un tirón (se probó en muchos juegos de pelea: es parte del efecto).
- **Sacudida:** modelo de trauma. Cada golpe suma trauma (tope 1), la sacudida es `trauma²` por un ruido suave (no aleatorio por cuadro) y el trauma baja 1,6 por segundo. Desplaza y gira la cámara (tope 0,12 bloques y 1,5°).
- **Cámara lenta:** **solo local** (decidido, §11). En la arena de 1 jugador escala el `dt` de toda la escena. En la de 2 jugadores la disparan los dos a la vez los eventos compartidos (desvío perfecto y remate), que llegan por red con su cuadro. En el cooperativo del mundo **no** ralentiza la simulación: se reemplaza por un acercamiento, un hitstop local más largo y bajar la saturación 0,3 s.
- **Empuje:** velocidad inicial que frena con roce (como `RETROCESO` de `enemigos.js`). Contra una pared se convierte en rebote (§17.8).
- **Partículas** (pixel art, cajas o sprites pintados en canvas con `NearestFilter`, regla 5 de la skill):
  - **chispas** del desvío: cubitos amarillos y blancos que salen en abanico perpendicular al filo, con gravedad, vida de 0,25 s;
  - **polvo** de impacto en carne: anillo de cubitos grises más un destello blanco de 8×8 px durante 3 c sobre la zona golpeada;
  - **nieve** levantada en pisadas fuertes y caídas (en el escenario de nieve; cada escenario dice su material).
  - **Sin sangre** (decidido: el tono es de amigos; el «golpe mortal» de Sekiro es un golpe final que derriba, no mata).
- **Sonido por capas** (sintetizado en `sonidos.js`, como todo el juego, sin archivos):
  1. **aire:** silbido cuya altura sube con la velocidad del arma; suena al empezar el activo;
  2. **impacto:** `carne` (grave, seco, corto), `metal` (campana con armónicos inarmónicos y un ruido de 20 ms) o `madera`;
  3. **cuerpo:** el golpe sordo del que recibe, más grave cuanto más pesado;
  4. **cola:** reverb corta del escenario.
  - El desvío perfecto sube el tono un 20 % y alarga la campana. Cada capa tiene su volumen y tono en `combate.json → sonidos`.
- **Reacción visible:** siempre una animación de §18. Nunca el parpadeo rojo solo (el parpadeo queda como capa extra de 2 c).
- Módulo: `combate/peso.js` (puro: decide hitstop, trauma y cámara lenta; los efectos los dibuja quien lo usa).

### 15.5 Rig con codos, rodillas y pecho (§4.4)

**Estructura nueva** de `crearPersona` (`mundo/criaturas/cuerpo.js`):

```
g
└─ cuerpo                      (inclinarse o sentarse: como hoy)
   ├─ pecho  [nuevo, pivote en la cintura y = 0,75]
   │   ├─ torso                 (y local 0,375)
   │   ├─ cuello → cabeza       (y local 0,75)
   │   ├─ brazoD  (hombro, y local 0,75) → caja de 0,375 + rótula + antebrazoD (pivote del codo, y −0,375) → caja de 0,375 → [arma]
   │   └─ brazoI  (lo mismo)
   ├─ piernaD (cadera, y 0,75) → caja de 0,375 + rótula + canillaD (pivote de la rodilla, y −0,375) → caja de 0,375
   └─ piernaI (lo mismo)
```

- **Por qué un pivote `pecho`:** §1 pide que «caderas y torso giren antes que el brazo». Hoy solo se puede girar o inclinar el `cuerpo` entero, piernas incluidas. Con `pecho` el torso gira e inclina sobre las caderas, y las piernas se quedan plantadas.
- **Compatibilidad exacta:**
  1. `pecho` en 0 no mueve nada: las posiciones locales de torso, cuello y brazos se restan 0,75 y su matriz de mundo queda igual.
  2. **Textura:** el brazo y la pierna se pintan **una sola vez** en su lienzo de 8×24 (el mismo pintor y la misma semilla de hoy) y cada mitad usa la mitad del lienzo por UV (`offset` y `repeat`). Así no cambia ni un píxel del ruido.
  3. Las caras interiores de la articulación (la de abajo del brazo y la de arriba del antebrazo) quedan tapadas con el codo en 0.
  4. **Rótula:** un cubo de 0,25 en el pivote del codo o la rodilla, con la textura de la fila del lienzo que cae en la articulación. Es invisible con el ángulo en 0 (`visible = |ángulo| > 0,02`). Doblado, tapa la muesca que deja un codo de cajas rígidas en la esquina de afuera. Así no se ve un brazo «quebrado» ni un hueco.
- **Por qué sin manos ni muñecas (§4.4):**
  - A esta escala el brazo mide 4 px de ancho. Una mano serían 4×4 px, igual a la punta del antebrazo, y no se distinguiría.
  - Lo que una muñeca aporta en combate es **girar el arma** (el filo que rota en un tajo). Eso se hace con el canal `arma` (giro del arma respecto del antebrazo, una muñeca virtual), sin geometría nueva.
  - Los puños de Urban Reign son la punta del antebrazo. Se leen como puño porque el codo dobla y estira.
- **Canales nuevos** (todos en 0 por defecto, con su slider en la pestaña Poses, §25.3):

| Canal | Qué hace | Rango (límite duro) |
|---|---|---|
| `codoD`, `codoI` | dobla el codo: − lleva el antebrazo adelante y arriba | −2,6 … 0 |
| `rodD`, `rodI` | dobla la rodilla: + lleva la canilla atrás | 0 … 2,4 |
| `pY` | gira el pecho sobre las caderas: + a su izquierda | −0,9 … 0,9 |
| `pX` | inclina el pecho: + adelante | −0,35 … 0,9 |
| `pZ` | ladea el pecho | −0,3 … 0,3 |
| `pDz`, `pIz` | abre la pierna hacia afuera (+) | −0,15 … 0,5 |
| `bDy`, `bIy` | giro del brazo sobre su eje (ya existe en `aplicarAngulos`; ahora con slider) | −1,2 … 1,2 |
| `armaX`, `armaZ` | muñeca virtual: giro del arma respecto del antebrazo | −1,6 … 1,6 |

- **Límites duros:** `aplicarAngulos` recorta cada canal a su rango (en `poses.json → limites`, editable). Ninguna animación ni la CPU pueden producir un codo al revés ni una rodilla hacia adelante. Los rangos de hoy de `rig.md` siguen, con dos ampliaciones medidas para combate: `bDx` a −3,0 … 1,0 y `bDz` a −0,8 … 1,6 (cruzar el pecho con la katana).
- **Suelo automático (pies que no flotan ni se hunden):** con `suelo: true` (por defecto en combate), el motor calcula la altura del pie más bajo con las dos piernas (muslo, rodilla, canilla) y ajusta `y` para que toque el suelo. Doblar las rodillas baja el cuerpo solo, sin tener que ajustar `y` a mano.
- **El arma va en el antebrazo:** `ponerObjeto` (`pose-jugador.js`) cuelga el objeto de `antebrazoD` si existe y resta el largo del brazo a la posición del agarre. Los valores de `objetos-mano.json` (posición respecto del hombro) siguen valiendo tal cual.
- **Monstruos:** los zombis, esqueletos y el trauco usan `modeloPersona` de `enemigos.js`, que pasa a usar el rig nuevo (mismas animaciones de combate con su estilo de monstruo). La araña, el creeper y la lepisma tienen su rig y su telegrafía propios (§20.4). Los jefes también tienen el suyo (§23).
- **Migración (PR N1):**
  1. Cambiar `crearPersona`, `aplicarAngulos`, `limpiar` y `ponerObjeto`.
  2. Adaptar los dos lugares que escriben posiciones de brazos (`online/avatares.js:105-107`). El grep de `brazo[DI].position|cuello.position|torso.position` no encuentra otros fuera de `cuerpo.js`.
  3. Correr la prueba.
- **Prueba** `mundo/tests/rig-articulaciones.mjs` (Node, con three.js sin dibujar):
  - **Paridad:** para cada creador de personas (amigos, NPCs, Venjys, jugador, avatares, enemigos persona), con 200 poses de `poses.json` y de los gestos del código, en los 4 casos (de pie, sentado, jugador y los dos), la matriz de mundo de cada caja visible es igual a la de `main` (diferencia < 1e-9). La referencia se guarda en `mundo/tests/rig-referencia.json`, generada desde `main` antes del cambio.
  - **UV:** los píxeles de cada mitad son los del lienzo original.
  - **Límites:** ningún canal fuera de rango después de `aplicarAngulos`.
  - **Rótula invisible en 0.**
- **Hecho en N1 (2026-10-15), con dos ajustes:** la textura de cada mitad se corta con los UV de la geometría (no con `offset`/`repeat` de la textura, que se comparte entre caras y personas); y `online/avatares.js` no se adaptó porque no usa `crearPersona` (es el avatar del modo online del creativo, con cajas propias). `doblar(art, ángulo)` vive en `pose-jugador.js`. El suelo automático (`suelo: true`) queda para el motor de combate (N3).
- **Cartas:** el arte de las cartas es 2D en canvas (`cartas-arte.js`) y no usa el rig. No se toca. Las escenas de las cartas que usan personas quedan cubiertas por la paridad.

### 15.6 Motor de animación de combate (§1)

`combate/animacion.js` arma la pose de cada cuadro por **capas**, todas con los canales de §15.5:

| Capa | Qué pone | Peso |
|---|---|---|
| 1 · base | la guardia del estilo, o la caminata en guardia mezclada por velocidad | 1 |
| 2 · acción | ataque, esquiva, desvío, agarre o remate (reemplaza los canales que define) | 0 → 1 con la inercialización |
| 3 · reacción | §18 (reemplaza; las leves solo en pecho y cabeza, sobre la acción) | por tipo |
| 4 · mirada | cuello y `pY` hacia el objetivo (aditiva, tope ±0,5 y ±0,3) | 1 salvo en remates |
| 5 · secundario | respiración del estilo, temblor del hitstop, cansancio con postura alta | aditiva chica |

- **Inercialización (decidido):** al cambiar de estado, por cada canal se guarda `d = poseVisible − poseNueva` y la velocidad `v` del cuadro anterior. Esa diferencia se suma a la pose nueva y se apaga con un resorte crítico en `mezcla` cuadros (por defecto 6; 3 en los ataques que salen de un buffer, 10 al volver a la guardia). Ventajas:
  - cuesta lo mismo que no mezclar (no evalúa dos animaciones);
  - respeta la velocidad que traía el brazo, así que un golpe cancelado sigue su inercia en vez de frenar en seco;
  - nunca da un salto.
- **Peso en el cuerpo entero (regla de construcción para cada ataque):**
  - el orden de llegada es **pies → caderas (`ry`) → pecho (`pY`, `pX`) → hombro → codo → arma**;
  - cada eslabón empieza su movimiento 1 o 2 c después que el anterior (desfase en las claves);
  - en el golpe, el pie de adelante se planta antes del contacto;
  - en los golpes pesados el cuerpo baja (rodillas + suelo automático).
- **Regla del pie en el aire (pies sin patinar):** el `avance` de un ataque o paso solo ocurre en los cuadros en que el pie que avanza está levantado (rodilla doblada y muslo adelante). Mientras un pie está apoyado su posición en el mundo no cambia. La caminata en guardia ajusta la frecuencia del paso a la velocidad real, como `caminar` hoy (2,6 por bloque).
- **Mirada:** la cabeza llega al objetivo primero (resorte rápido) y el pecho después (lento). Así el cuerpo «lee» al rival.
- **Prueba** `mundo/tests/combate-animacion.mjs`:
  - **sin saltos:** en 2000 secuencias de intenciones al azar (con semilla), ningún canal cambia más de `saltoMax` por cuadro (0,35 rad), salvo en los cuadros activos de los ataques que lo declaren (`velocidadMax`, tope 0,6);
  - **pies:** con el pie apoyado, su posición de mundo se mueve menos de 0,02 por cuadro;
  - **límites** de §15.5;
  - **choques:** con cajas orientadas (OBB), el antebrazo no entra más de 0,04 en el torso ni en la cabeza, y el arma no entra en la cabeza propia, en todos los cuadros de todas las animaciones de los estilos;
  - **paridad del formato:** una animación sin claves de fase da lo mismo que `evaluarGesto`.
- **Hecho en N3 (2026-10-15), con estos ajustes** (código en `mundo/supervivencia/combate/`: `datos.js`, `estados.js`, `animacion.js`, `cinematica.js`, `reglas.js`; datos en `combate.json` y `estilo-prueba.json`):
  - **Caminata en guardia procedural** (no por ciclo): una caminata de claves por distancia nunca calza con la velocidad constante del cuerpo (los pies patinan al arrancar, frenar o retroceder). En los estados libres cada pie queda plantado y da un paso en arco cuando se aleja `umbral` de donde lo pone la guardia (`estilo → paso`: `umbral`, `cuadros`, `altura`, `adelanto`); sirve igual para girar y frenar. La animación `paso` pone solo el resto del cuerpo.
  - **Pies anclados en las acciones:** el pie que la pose apoya queda fijo en el mundo (IK de dos huesos con la apertura `pDz`); se suelta al despegar (sube primero y avanza después, llevado por el cuerpo si este salta), si la pierna no alcanza o casi se estira. Nunca gira una articulación más rápido que `saltoMax`: si la IK lo pide, el pie cede su camino.
  - **Inercialización con duración adaptativa** (`mezclaPorRad`: con una diferencia grande dura más) y `inercia` (cuánto de la velocidad que traía conserva; 1 hacía que el brazo siguiera de largo y atravesara el torso).
  - **Capa de choques** (`motor.choques`): al mezclar dos poses un antebrazo puede cruzar el torso aunque ninguna animación lo haga; si entra más de `tope`, el hombro se abre lo justo.
  - **Caderas:** con los pies plantados el rig no tiene giro de pierna, así que un ataque gira poco `ry` y lo pone el pecho (`pY`).
  - **Suelo automático** en el motor (`suelo: true`): `cinematica.js → ajusteSuelo`.
  - Reacciones de N3: `alto_leve`, `desviado` y `bloqueado` (las 16 de §18 en N5). Las reacciones bruscas (`alto_leve`, `desviado`) declaran `velocidadMax` en su activo.

### 15.7 IA con aviso (base para la CPU y los monstruos, §4.5)

- **Toda acción de la CPU es una intención** que pasa por la misma máquina de estados. La CPU no puede hacer nada que el jugador no pueda.
- **Anticipación mínima legible:** `ataque.fases.anticipacion × factorDificultad` (fácil 1,5; normal 1,15; difícil 1; maestro 1). Nunca menos de 8 c en un ataque normal de la CPU, ni menos de 14 en uno peligroso.
- **Tiempo humano:** la CPU «ve» tu acción con un retraso (fácil 22 c, normal 16, difícil 11, maestro 8) y decide con una tabla de pesos por situación (distancia, estado tuyo, su postura o sus zonas, su barra). No tiene ventanas perfectas: desvía con probabilidad por dificultad.
- **Respiro:** después de una cadena de 2 a 4 golpes se aleja, provoca o espera (36 a 90 c). El ritmo de duelo necesita silencios.
- **Fichas de ataque (mundo abierto, §20.4):** cada jugador tiene `fichas` (2 por defecto). Un monstruo pide una antes de atacar y la devuelve al terminar su recuperación. Los que no tienen ficha rodean, amagan o se acomodan. Así no atacan todos a la vez (Batman Arkham y los beat 'em up).
- Datos en `estilo-*.json → cpu` (pesos por situación) y `arena.json → dificultades`. Módulo `combate/ia.js`, puro y con semilla (prueba determinista).

### 15.8 Red y autoridad (§2.3)

- **Paso fijo y reloj compartido:** cada peleador lleva su cuadro lógico. El reloj compartido sale de `RelojAnfitrion` de `online/ping.js` (ya existe).
- **Cada uno juzga lo que recibe (decidido):**
  1. El atacante manda `ci` (combate inicia): `{ a: clave, f: cuadro de inicio en el reloj compartido, h: altura, x, z, yaw }`.
  2. El receptor reproduce el ataque del rival desde ese cuadro. Como le llega con `L` de latencia, **comprime** la anticipación: la reproduce en `anticipacion − L` cuadros, acelerándola sin saltarse poses, con un tope del 40 %. Si `L` es mayor, el ataque se ve igual de entero y el impacto local llega más tarde.
  3. El receptor juzga en **su** línea de tiempo (desvío, esquiva, bloqueo o golpe) con sus propias ventanas, sin lag.
  4. Manda `cv` (veredicto): `{ a, r: golpe|bloqueo|desvio|perfecto|esquiva|mikiri|contra|agarre_escapa…, n: daño, p: postura, z: zona }`.
- **El hitstop esconde la latencia:** el atacante, al llegar a su cuadro activo con el rival al alcance, **entra en hitstop sin saber todavía el veredicto** (un contacto neutro: sonido de aire más golpe sordo genérico).
  - Si el veredicto llega durante el hitstop (4 a 9 c = 66 a 150 ms; con conexión directa entre amigos casi siempre), pone el efecto correcto: chispas y campana si fue desvío, polvo y carne si fue golpe.
  - Si llega después, el efecto se corrige con una capa corta (sin repetir el hitstop).
  - Un desvío que llega tarde convierte la recuperación del atacante en `desviado` con inercialización: no hay salto.
- **Cuánto pesa:** `ci` ≈ 40 bytes, `cv` ≈ 30 bytes y el estado `cp` a 20 Hz (solo en la arena de 2 jugadores: posición en el eje, cuadro y estado, ≈ 24 bytes). El PR N7 mide los tamaños reales y los anota en el bloque 5 de `PENDIENTES.md` (regla de siempre).
- **Mundo abierto** (8·M):
  - El dueño del monstruo manda `ci` de los ataques del monstruo hacia su objetivo. El objetivo juzga y manda `cv`. El dueño aplica al monstruo la reacción del veredicto (desviado, postura) y lo sigue simulando.
  - Los golpes del jugador a un monstruo siguen el camino de hoy (`g`, validado por el dueño con su historial), con dos campos más: `at` (ataque) y `rx` (reacción pedida). El dueño puede rechazar la reacción si el monstruo estaba en hyper armor.
  - El anfitrión simula a los jefes (como hoy).
  - Los demás ven por `p` el estado y el cuadro de cada peleador cercano: un byte más (`ce`: índice del estado y de la animación) y dibujan la misma animación.
- **Confianza:** entre amigos se confía en el veredicto del otro. Un PvP público no puede (§26.2).
- Módulo `combate/red.js`, puro. Lo prueba `mundo/tests/combate-red.mjs` con latencias simuladas de 0, 60, 150 y 300 ms:
  - el veredicto es el mismo que sin red cuando el receptor juzga lo mismo;
  - la compresión respeta el tope;
  - un desvío tardío nunca produce un salto (se mide con §15.6);
  - los tamaños quedan bajo lo presupuestado.

---

## 16. Estilo Sekiro · katana (§5)

Es el **primer estilo completo** y valida la base: desvío, postura, hitstop, cámara, aviso y red. Archivo `mundo/datos/estilo-sekiro.json`.

### 16.1 Reglas

- **Vida y postura:** cada peleador tiene las dos. La postura sube con lo que bloquea, con lo que desvía mal y con lo que recibe. Al llegar al tope se rompe: el peleador queda `desequilibrado` (90 c) y se le puede dar el **golpe final**. En la arena gana la ronda; en el mundo tumba al enemigo (los jefes tienen varios, §23).
- **La postura baja sola:**
  - 12 por segundo si no atacas ni te golpearon en el último segundo;
  - multiplicada por `0,4 + 0,6 × vida%`: con poca vida baja lento, como en el original, y obliga a curarse o arriesgar;
  - ×1,5 con la guardia mantenida.
- **Tope de postura:** 100 el jugador; cada rival tiene el suyo (Lalo, 100; en el mundo, uno por monstruo).

| Qué pasa | Vida del que recibe | Postura del que recibe | Postura del atacante |
|---|---|---|---|
| Golpe sin defensa | −`dano` | +0,5 × `postura` | — |
| Bloqueo (guardia mantenida) | 0 | +1,0 × `postura` | — |
| Desvío normal | 0 | +0,3 × `postura` | +0,5 × `postura` |
| **Desvío perfecto** | 0 | 0 | +1,0 × `postura` + 8 |
| Mikiri (§16.4) | 0 | 0 | +35 |
| Pisotón sobre un barrido | 0 | 0 | +25 |

- **Ventana de desvío** (punto de partida): se abre al tocar `defensa` y dura 10 c. Si el impacto llega entre 0 y 4 c después de apretar, el desvío es **perfecto**; entre 5 y 10, **normal**. Después cuenta la guardia si se sigue manteniendo; si se soltó, entra el golpe. Lo que se premia es apretar **justo antes** del impacto. En táctil, +2 c a cada tramo.
- **Penalización por repetir** (como el original: no se puede spamear): cada toque de `defensa` dentro de 30 c del anterior le quita 3 c a la ventana (mínimo 3 c y sin perfecto). Se recupera después de 45 c sin tocar.
- **Ritmo de duelo:** la CPU también desvía tus tajos (con chispas), así que el duelo se vuelve un toma y daca: atacas hasta que te desvía y contraataca, desvías su cadena y vuelves a atacar. No es una regla aparte: lo arma la tabla de la CPU (§19.6).
- **Arte de combate** (`especial`, Q): «Trazo único», un tajo vertical que suma 40 de postura aunque se lo bloqueen y te baja 15 de la tuya. Cuesta 1 de los 3 segmentos de **espíritu**, que se llenan con desvíos (el perfecto da un segmento entero; el normal, un tercio). Los nombres son propios: no se copian los del original.
- **`agarre` en Sekiro = patada frontal:** atraviesa la guardia mantenida (no se puede bloquear, pero sí desviar). Sirve contra el que se queda tapado y es telegrafiada (anticipación de 16 c).

### 16.2 Controles

| | PC (arena) | Táctil |
|---|---|---|
| Tajo (combo de 4) | clic izq. | ATACAR (toque) |
| Golpe fuerte (carga) | mantener clic izq. 14 c y soltar | mantener ATACAR |
| Desvío / guardia | tocar / mantener clic der. | tocar / mantener DEFENSA |
| Esquiva (paso) | Shift + dirección | deslizar en la zona libre |
| Mikiri | Shift + **hacia el rival** con el aviso de estocada | deslizar hacia el rival |
| Salto / pisotón | Espacio / Espacio otra vez sobre el rival | SALTAR / SALTAR |
| Arte de combate | Q | ARTE |
| Patada | E | PATADA (reemplaza a AGARRE) |
| Golpe final | clic izq. con el rival desequilibrado (lo avisa la marca) | ATACAR |

La altura (W, S o deslizar) no cambia los tajos de Sekiro: cada tajo tiene su altura fija. La que sí cambia es la **animación del desvío**, que elige sola su variante según la altura del golpe que llega. El jugador no tiene que adivinarla, y esa es la diferencia con Urban Reign.

### 16.3 Animaciones clave de Sekiro, fase por fase

- Los valores son un punto de partida, en radianes. Los sentidos de los canales están en §15.5 y en `rig.md`; las curvas, en §15.3.
- La guardia tiene el **pie derecho adelante**.
- Todas pasan por la lista de §1 y por la prueba de §15.6, y se revisan con `capturar gesto <clave> --hoja`.

**S1 · Guardia (quieto).** Postura *chūdan* a dos manos, con la punta a la garganta del rival.
- **Pies:** el derecho adelante (`pDx` −0,3, `rodD` 0,3) y el izquierdo atrás (`pIx` 0,35, `rodI` 0,45), algo abiertos (`pDz` 0,08, `pIz` 0,1). El suelo automático baja el cuerpo unos 0,05.
- **Caderas y pecho:** las caderas giran para que el pie derecho quede adelante (`ry` 0,3). El pecho vuelve a medias hacia el rival (`pY` −0,15) y se inclina un poco (`pX` 0,12).
- **Brazos:** juntos en el mango, frente al ombligo. El derecho, `bDx` −1,0, `codoD` −0,7, `bDz` 0,45; el izquierdo, `bIx` −1,05, `codoI` −0,8, `bIz` −0,5. `armaX` −0,6 deja la hoja apuntando adelante y arriba.
- **Movimiento secundario:** respiración en `pX` (±0,02 a 0,4 Hz) y en `y` (±0,01). La punta de la katana oscila (`armaX` ±0,03 a 0,25 Hz), desfasada de la respiración.
- **Cansancio:** con la postura sobre el 70 %, la respiración se apura (0,9 Hz) y los hombros bajan (`bDx` +0,1). El rival lo puede leer.

**S2 · Paso en guardia (adelante y atrás).** Pasos cortos sin cruzar las piernas (*suriashi*): el pie de adelante avanza y el de atrás lo sigue, sin que se junten nunca.
- El ciclo avanza 0,5 bloques. Cada pie se levanta poco (`rod` 0,35 en el aire) y la canilla queda casi vertical.
- Las caderas no oscilan de lado, el pecho queda quieto y los brazos no siguen al paso: la katana se mantiene en la línea del rival. Es lo que más lo distingue del caminar de Minecraft.
- Hacia atrás se invierte el orden: sale primero el pie de atrás.

**S3 · Tajo 1 (diagonal descendente, alto).** 9 / 4 / 16 c.
- **Anticipación (9 c):**
  - c0-3: el pie derecho se levanta (`rodD` 0,6, `pDx` −0,45). En este tramo ocurre el avance de 0,55. Las caderas se cargan a su derecha (`ry` 0,3 → 0,45).
  - c2-9: el pecho gira lejos del rival (`pY` −0,15 → −0,5) y se echa atrás (`pX` −0,1).
  - c3-9: las manos suben sobre el hombro derecho. Derecho: `bDx` −2,4, `codoD` −1,6, `bDz` 0,6. Izquierdo: `bIx` −2,2, `codoI` −1,7, `bIz` −0,7. `armaX` −1,2 deja la hoja atrás, sobre el hombro. La prueba de choques verifica que no atraviese la cabeza.
  - Curvas: `retroceso` hasta c6 y `entrada` en los últimos 3 c (el cuerpo «suelta» el golpe).
- **Golpe (4 c):**
  - c0: el pie derecho se planta (`pDx` −0,5, `rodD` 0,35): la rodilla de adelante cede.
  - c0-1: las caderas giran primero (`ry` 0,45 → 0,05).
  - c0-3: el pecho las sigue (`pY` −0,5 → 0,45 y `pX` → 0,35).
  - c1-4: los brazos cruzan desde arriba a la derecha hasta abajo a la izquierda (`bDx` −2,4 → −0,6, `bDz` 0,6 → 1,1). El codo se estira justo en el impacto (`codoD` −1,6 → −0,25) y la muñeca virtual gira el filo (`armaX` −1,2 → 0,3).
  - Curva `latigo`: la hoja pasa un 8 % más allá. Deja una estela pixel de 3 cuadros.
- **Recuperación (16 c):**
  - c0-6: termina el sobrepaso, con la hoja abajo a la izquierda.
  - c4-10: el pie izquierdo avanza para recuperar la base (pie en el aire, sin patinar).
  - c6-16: todo se asienta en S1 con la curva `asentar`.
  - Se puede desviar desde r+0. El tajo 2 entra desde g+2 hasta r+10.

**S4 · Tajo 2 (horizontal de vuelta, medio).** 7 / 4 / 15 c. Sale de donde terminó S3, con la hoja abajo a la izquierda.
- **Anticipación:** el pecho se carga a su izquierda (`pY` 0,6). La hoja queda horizontal a la altura de la cintura izquierda (`bDx` −1,3, `bDz` 1,2, `armaZ` 1,3) y el pie izquierdo pivota.
- **Golpe:** barrido horizontal de izquierda a derecha a la altura del pecho. Las caderas abren primero y el pecho las sigue (`pY` 0,6 → −0,55). Los codos se estiran en el centro del arco. La cabeza mira al rival todo el tiempo (capa de mirada).
- **Recuperación:** la hoja termina a la derecha y vuelve a la guardia con `asentar`.

**S5 · Tajo 3 (diagonal ascendente, medio).** 8 / 4 / 17 c.
- **Anticipación:** el cuerpo baja (las dos rodillas a 0,6), con la hoja abajo a la derecha, cerca de la cadera (`bDx` −0,3, `codoD` −0,9, `armaX` 0,8).
- **Golpe:** sube en diagonal hacia arriba a la izquierda mientras las piernas se estiran (el cuerpo sube con el tajo; el suelo automático lo resuelve solo). El pecho termina abierto a la izquierda.

**S6 · Tajo 4, cierre del combo (vertical con paso, alto).** 12 / 5 / 26 c. Hitstop `medio`.
- **Anticipación:** paso largo adelante: avanza 0,9 con el pie derecho en el aire durante 8 c. La hoja sube por la derecha hasta quedar sobre la cabeza (`bDx` −2,8, `codoD` −1,2, sin pasar de −3,0) y el pecho se arquea atrás (`pX` −0,2).
- **Golpe:** corte vertical al centro. El pecho se dobla adelante (`pX` 0,55) y las dos rodillas ceden (0,7): el cuerpo baja 0,15. Es el golpe que más pesa del combo.
- **Recuperación (26 c, larga a propósito):** la hoja queda abajo 6 c para que se sienta el peso, después sube y vuelve a la guardia. Solo se cancela a desvío desde r+8: cerrar el combo tiene riesgo.

**S7 · Golpe fuerte cargado (vertical).** Carga hasta 40 c; después, 6 / 5 / 28 c. Hitstop `fuerte` y postura alta.
- **Carga:** la hoja sube sobre la cabeza y queda vibrando (`armaX` ±0,02 a 8 Hz). La rodilla de atrás se dobla más (`rodI` 0,8) y la respiración se corta. Un brillo pixel en el filo crece con la carga, en 3 niveles visibles.
- **Al soltar:** una anticipación corta (6 c) con un retroceso de 3 c. El golpe es como S6, pero más bajo y más lejos (avance de 1,1). La recuperación dura 28 c y no se cancela a desvío hasta r+12.

**S8 · Desvío (normal y perfecto, según la altura).**
- **Ventana sin contacto (10 c):** las manos levantan la hoja horizontal delante del cuerpo, a la altura del golpe que viene: alto, `bDx` −1,9; medio, −1,4; bajo, −0,7 con las rodillas a 0,7. `armaZ` 1,4 deja la hoja cruzada y el pecho gira 0,2 hacia el lado del golpe. Si no llega nada, vuelve a la guardia en 8 c con `suave`: se ve como un abanico corto, no como un salto.
- **Contacto (5 c, hitstop compartido):** la hoja empuja hacia afuera (`bDz` −0,2 en 3 c), el cuerpo se comprime (rodillas +0,2) y el pie de atrás retrocede 0,1 en el aire. Saltan chispas en el punto de choque de las dos armas (o del arma y el brazo, contra puños).
- **Perfecto:** igual, pero la hoja termina más abierta y el pecho no retrocede: el defensor queda adelante. Hitstop de 8 c, cámara lenta, una campana aguda y un destello blanco de 2 c en el filo.
- **Recuperación:** 10 c a la guardia con `asentar`. Si se sigue manteniendo `defensa`, se queda en la guardia de bloqueo.

**S9 · Bloqueo (guardia mantenida).**
- **Pose:** la hoja en diagonal frente a la cara y el pecho (`bDx` −1,7, `codoD` −1,3, `armaZ` 0,9), con los codos cerrados y las rodillas a 0,5.
- **Al recibir:** el cuerpo se dobla atrás (`pX` −0,15) y retrocede con dos pasos cortos según el empuje (primero el pie de atrás, nunca deslizando). Las chispas son más chicas que en el desvío y el sonido es metálico y apagado.
- **Con la postura sobre el 70 %:** los brazos tiemblan (`bDx` ±0,02 a 10 Hz).

**S10 · Esquiva (paso).** 18 c, con i-frames de c2 a c10.
- Un paso largo en la dirección elegida (0,9 bloques; hacia atrás, 1,1), con el cuerpo bajo (rodillas a 0,7, `pX` 0,3). La katana se recoge pegada al cuerpo (`bDx` −0,6, `codoD` −1,4).
- Sale primero el pie que va adelante y el otro lo sigue en el aire (c6-12). Aterriza con un asentamiento de 6 c.
- Mantener Shift al terminar hace correr (en la arena, correr en el eje).

**S11 · Salto y pisotón.**
- **Salto:** 28 c en el aire, con las piernas recogidas (`rod` 1,6, `pDx` −0,9) y la katana atrás.
- **Pisotón (8 c):** si se aprieta saltar otra vez sobre la cabeza del rival (a menos de 0,8 en horizontal), la pierna derecha se estira hacia abajo (`rodD` 0, `pDx` −0,2).
- El rival recibe la reacción `alto_fuerte` y +25 de postura. El jugador rebota hacia atrás y aterriza en guardia.

**S12 · Mikiri (contra la estocada).** Animación de pareja, 34 c, con i-frames enteros (estado `contra`).
- c0-6: el jugador sale hacia el rival en diagonal y esquiva la punta por su izquierda (el cuerpo gira, `pY` 0,5).
- c6-12: su pie derecho **pisa la hoja** del rival contra el suelo (`pDx` −0,4, con la rodilla estirada al pisar). El rival se dobla siguiendo su arma hacia abajo (animación `pisado`: `pX` 0,7, los brazos abajo y la hoja contra el suelo). Hitstop de 8 c y un sonido metálico grave.
- c12-34: el jugador queda alto sobre el pie, con la katana en guardia alta, y retrocede con un salto corto. El rival recibe +35 de postura y queda en `desviado_largo` (30 c).

**S13 · Golpe final (remate).** Animación de pareja de 60 c, con cámara de cine (§19.4) y cámara lenta (0,3× en c10-30).
- c0-8: paso rápido hacia el rival desequilibrado.
- c8-20: un tajo ascendente lo levanta. El rival pasa a `rematado` y cae de espalda (§18).
- c20-40: el jugador queda con la rodilla derecha en el suelo (`rodD` 2,0, `rodI` 1,2, suelo automático) y la katana abajo.
- c40-60: sacude la hoja con un arco corto de `armaX` (el *chiburi*) y la envaina en la cadera izquierda: las dos manos van a la cadera y la hoja entra en la vaina, un modelo propio colgado de `cuerpo`.
- Aparece el texto pixel «¡Golpe final!» / «Final strike!».

**S14 · Ataques peligrosos (los usan la CPU de Lalo y los monstruos con katana).** Todos llevan el aviso de §16.4 y al menos 24 c de anticipación.
- **Barrido (bajo):** 24 / 6 / 26 c.
  - Anticipación: el cuerpo baja mucho (la rodilla de atrás casi en el suelo, `rodI` 1,8), con la hoja horizontal abajo a la derecha y el pecho girado lejos.
  - Golpe: un corte giratorio a la altura de las canillas. El cuerpo gira media vuelta sobre el pie de adelante (`ry` con `latigo`).
  - Recuperación: se para en 26 c.
- **Estocada (medio):** 24 / 5 / 22 c.
  - Anticipación: la hoja se recoge a la cadera con la punta adelante (`bDx` −0,6, `codoD` −1,8, `armaX` −0,1). El pecho se enrosca (`pY` −0,6) y el pie de adelante se levanta.
  - Golpe: la estocada avanza 1,6, con el pie en el aire durante todo el avance, y los brazos se estiran (`bDx` −1,5, codos a 0). El pecho se abre con `latigo`.
  - Recuperación: retira la hoja.
- **Agarre (alto):** 22 / 6 / 30 c.
  - Anticipación: el cuerpo se agacha, la mano izquierda suelta el mango y se estira (`bIx` −1,4, `codoI` −0,3, `bIz` 0,2).
  - Golpe: si conecta, entra una animación de pareja: lo toma del hombro, lo voltea sobre la cadera y lo tira al suelo. Hace mucho daño y causa la reacción `derribo`.

### 16.4 Ataques peligrosos: aviso y respuesta

- **Aviso:** un **rombo rojo con un signo pixel** sobre la cabeza del atacante, dibujado en código (`ICONOS`, sin emoji y sin copiar el kanji del original). Aparece 4 c después de que empieza la anticipación y dura hasta el activo. Lo acompañan:
  - un sonido agudo corto;
  - un destello rojo de 2 c en el arma;
  - en el táctil, una vibración corta.
- **Respuestas:**

| Peligro | Desvío | Guardia | Salto | Esquiva | Respuesta buena |
|---|---|---|---|---|---|
| `barrido` | no | no | **sí** | sí (sin premio) | Saltar y pisotón (+25 de postura al rival) |
| `estocada` | sí (ventana −2 c) | no | no | sí | **Mikiri:** esquivar hacia el rival desde el aviso hasta g+2 (+35) |
| `agarre` | no | no | sí | **sí** | Esquivar hacia atrás o de lado |
| `imparable` (arte de Urban Reign, jefes) | no | no | según el ataque | **sí** | Esquivar con i-frames |

---

## 17. Estilo Urban Reign · puños y pelea callejera (§6)

Archivo `mundo/datos/estilo-urbano.json`.

### 17.1 Qué era el original (investigado el 2026-10-15)

Fuentes: [Wikipedia](https://en.wikipedia.org/wiki/Urban_Reign), [Hardcore Gaming 101](https://www.hardcoregaming101.net/urban-reign/), [Of Swords and Joysticks](http://ofswordsandjoysticks.blogspot.com/2021/05/game-992-urban-reign.html), [Giant Bomb](https://www.giantbomb.com/games/3030-15532/) y una [reseña de GameFAQs](https://gamefaqs.gamespot.com/ps2/927659-urban-reign/reviews/112882). Las guías de GameFAQs no se pudieron abrir (bloquean el acceso); lo que dependa de ellas queda marcado.

- **Botones (PS2):**
  - Círculo, golpe. Triángulo, agarre (y cancelar). Cuadrado, defensa (esquivar y desviar).
  - Círculo + Triángulo con una dirección, arte especial (SPA).
  - L1, tomar o soltar un arma. R1, fijar el objetivo. R2, órdenes al compañero.
- **Golpe con dirección = zona:** arriba va a la cabeza, izquierda o derecha al torso y abajo a las piernas. Sin dirección sale el combo básico. Casi todos los combos empiezan con tres golpes y **el tercero lanza al rival al aire** (juggle). También hay agarres aéreos.
- **Defensa sin bloqueo** (lo que lo separaba de otros beat 'em up): el botón de defensa **esquiva**.
  - Si se aprieta con la **dirección de la altura del golpe** justo antes del impacto, el golpe se **desvía** y sale un contraataque fuerte. Se puede desviar a media cadena, salvo estando en el aire.
  - Algunos personajes **revierten**: atrapan la extremidad del rival y lo lanzan.
  - Con buena lectura se esquivan todos los golpes normales, aunque te rodeen.
- **Agarres por zona** (cabeza, torso o piernas): se escapan apretando defensa **con la dirección de la zona atacada**. Es una adivinanza, y la IA amaga: aparenta ir a la cabeza y va al pecho.
- **Daño por zonas (su sello):** una silueta con cabeza, torso y piernas, cada parte en verde (bien), amarillo (herida) o rojo (rota). **Cuanto más dañada está una zona, más daño recibe.** En rojo, los golpes ahí marean. Las fuentes no dicen qué efecto propio tenían el torso y las piernas.
- **Barra de SPA:** se llena **al pegar y al recibir daño**.
  - Cada SPA cuesta barras, tiene **i-frames generosos** y se puede lanzar **en cualquier momento, incluso mientras te pegan**.
  - No se puede desviar ni esquivar, salvo con otro SPA. Según Giant Bomb, un SPA de combo más largo contrarresta a otro.
- **Compañero:**
  - Se le dan órdenes (las guías hablan de 4 tipos, pero no se pudieron confirmar los nombres) y se puede cambiar de personaje.
  - Hay **agarres de a dos**: el compañero atrapa al que lanzaste al aire o lo levanta para tu golpe aéreo.
  - Te salva de un agarre, y cuando él agarra a alguien tú le sigues pegando.
- **Entorno:** golpes que mandan al rival contra la pared, correr por la pared y voltear, y muebles que se rompen. Había 30 armas del escenario, que no se rompían y tenían sus propios remates.
- **Lo que se le criticó:** la cámara era torpe, se invertía y perdía al compañero, y había un solo botón de golpe.

### 17.2 Gemini contra el original (correcciones)

| Gemini (§6) | Original | Decisión |
|---|---|---|
| 6.1 Alto con W, medio con A/D o neutro, bajo con S | Arriba = cabeza, lados = torso, abajo = piernas; **neutro = combo básico** | Se corrige: **neutro = combo básico** (3 golpes; el 3.º lanza). W = alto, **adelante** = medio y S = bajo. Los efectos de cada altura que propuso Gemini (aturdir, empujar, derribar) se quedan como adaptación: respetan la intención |
| 6.2 Esquivar hacia el lado **contrario** al golpe | Defensa + **la dirección de la altura del golpe** | **Error de Gemini.** Se corrige: el desvío consiste en acertar la altura (W para alto, nada para medio, S para bajo) con buen timing |
| 6.2 Sin bloqueo, esquiva activa con tecla dedicada | Igual | Se mantiene |
| 6.3 Tres zonas ocultas con estado crítico | Las zonas se **ven** (silueta en verde, amarillo y rojo) y suben el daño recibido; en rojo, mareo | Se corrige: **la silueta se muestra**, porque es el sello del juego. El estado crítico de Gemini se mantiene como adaptación, con valores más suaves (§17.6) |
| 6.4 Agarre que no se puede esquivar | Se escapa adivinando la zona | Se corrige: **el agarre se escapa adivinando la altura**, y la CPU amaga |
| 6.4 Golpe al rival en el suelo (*ground pound*) | Típico del género (no confirmado como mecánica con nombre) | Se mantiene |
| 6.5 Barra SPA que se llena pegando y recibiendo; arte especial con el 25 % | Igual. Además, los SPA tienen i-frames y salen incluso mientras te pegan | Se mantiene y se suma que **sale aunque te estén pegando** (*breaker*) |
| 6.5 «Modo Spark» con el 100 % | **No aparece en ninguna fuente** | Invención de Gemini. Se adapta con otro nombre (**Furia**) y con efectos que tengan sentido en un estilo sin bloqueo (§17.6). El dueño la aprobó (§27.2) |
| 6.6 Cancelar los cuadros finales si el golpe conecta | Combos de cadena; el 3.º lanza | Se mantiene |
| 6.6 Esquiva neutra (agacharse) que evita los golpes altos | La defensa sin dirección esquiva | Se integra: **defensa sin dirección = esquiva neutra** (*weave*). Evita los golpes altos y medios normales y deja un castigo bajo rápido |
| 6.6 Rebote en paredes | Patadas contra la pared y muebles que se rompen | Se mantiene. En la arena hay paredes y barriles de hielo |
| — (Gemini no lo propuso) | Correr por la pared, armas del escenario | **No se hace ahora** (8·E) |
| — | Compañero con órdenes y agarres de a dos | 8·E, junto al acompañante (§17.9) |

### 17.3 Altura del golpe

- **Al atacar:**
  - **W + clic = alto** (a la cabeza): más daño de zona en la cabeza y un tambaleo corto (`alto_leve`, 14 c).
  - **Adelante (hacia el rival) + clic = medio** (al torso): empuje grande (`medio_empuje`), con rebote si hay una pared detrás.
  - **S + clic = bajo** (a las piernas): **derribo** inmediato si el rival está de pie y no tiene armadura.
  - **Sin dirección:** combo básico.
- **Cada golpe muestra su altura en la anticipación** (pilar 1):
  - en el alto, el hombro y el codo suben a la altura de la cara;
  - en el bajo, la cadera baja y el peso se va atrás;
  - en el medio, se carga el pie de atrás.
- Además hay una marca de 3 c en la mano o el pie que golpea: blanca para el alto, amarilla para el medio y azul para el bajo. Se puede apagar en `estilo-urbano.json → avisos` para los expertos.

### 17.4 Combos y cancelación

- **Combo básico** (sin dirección): jab (6 / 3 / 10 c) → recto (7 / 3 / 12 c) → **gancho ascendente que lanza** (10 / 4 / 20 c; el rival queda 40 c en el aire). Con el rival en el aire hay dos remates:
  - **golpe aéreo** (salto + clic);
  - **agarre aéreo** (salto + E): lo toma y lo azota contra el suelo.
- **Cancelación por conexión** (uno de los pilares de flujo): si un golpe conecta, su recuperación se puede cancelar desde r+2 a un golpe de altura, a un agarre o al siguiente del combo. Si falla, la recuperación es completa y quedas vendido. Esa es la diferencia con Sekiro, donde siempre se puede cancelar a desvío.
- **Cadenas de altura:** alto → medio → bajo se encadenan cancelando. Cada paso tiene su propia animación de transición: el cuerpo sale de donde quedó el golpe anterior.

### 17.5 Defensa: esquiva, desvío y reversión

| Entrada | Cuándo | Resultado |
|---|---|---|
| Defensa sin dirección | cualquier momento | **Esquiva neutra** (*weave*): agacha y mueve el torso. Tiene 12 c de i-frames contra golpes altos y medios normales, y después abre una ventana de 14 c en que **S + clic** sale 4 c antes (castigo bajo) |
| Defensa + W o S | lejos del impacto | **Paso lateral** (*sidestep*, 10 c de i-frames): sale del eje del duelo |
| Defensa con la altura correcta (W alto; nada o adelante, medio; S bajo) | 0-8 c antes del impacto | **Desvío** → contraataque automático (estado `contra`, i-frames enteros; animación según la altura) |
| Lo mismo | 0-3 c antes del impacto | **Reversión:** atrapa la extremidad, lanza y derriba. Hace más daño y suma más zona |
| Altura incorrecta dentro de la ventana | — | Recibes el golpe con +30 % de daño de zona: leíste mal |

- **Contra los peligrosos de Sekiro:** el barrido es bajo (se desvía con S), la estocada es media y el agarre es alto (se escapa como agarre, §17.7). Urban Reign **sí puede desviar los peligrosos**, porque toda su defensa consiste en leer la altura. Es su ventaja contra Sekiro. Su desventaja es que no tiene una guardia que perdone un mal timing.
- **Contra un SPA** (`imparable`): no se desvía. Se esquiva con un paso lateral temprano o se responde con otro SPA. En ese caso gana el que tiene la anticipación más corta (la versión de Giant Bomb).

### 17.6 Zonas, barra SPA y Furia

- **Zonas:** cabeza, torso y piernas, de 0 a 100 cada una. Se ven en una silueta pixel junto a la vida: verde bajo 40, amarillo bajo 75, rojo desde 75. Cada ataque las sube según su campo `zona`.
  - **Multiplicador de daño** (como el original, más dañada recibe más): ×1 en verde, ×1,25 en amarillo y ×1,5 en rojo.
  - **Estado crítico** al llegar a 100 (adaptación de Gemini, con valores más suaves para el 1 contra 1):
    - **cabeza:** mareo de 120 c, con estrellas pixel girando sobre la cabeza. No ataca, se tambalea y se le puede dar un remate.
    - **torso:** ×1,75 de daño durante 300 c. Gemini decía ×2, y con eso la ronda se terminaba en 3 golpes.
    - **piernas:** −40 % de velocidad hasta el final de la ronda, con una animación de cojera propia. Gemini decía −70 %, y en la arena eso deja al otro sin poder huir nunca.
  - Las zonas no se curan durante la ronda y vuelven a 0 en la siguiente. Todo está en `estilo-urbano.json → zonas`.
- **Barra SPA:** 4 segmentos. Se llena un segmento por cada 40 de daño hecho y uno por cada 60 de daño recibido.
- **Arte especial** (Q, 1 segmento): **sale aunque te estén pegando**, porque rompe la reacción (es el escape del original).
  - Sin dirección: el **giro** de Gemini, una patada giratoria de área con i-frames enteros.
  - W + Q: un cabezazo con salto que marea.
  - S + Q: una barrida doble que derriba.
- **Furia** (Q + E, 4 segmentos): reemplaza al «Spark», que no existía en el original. Dura 8 s, con un aura pixel de cubos rojos que suben.
  - Inmune al tambaleo: hyper armor contra golpes normales, aunque recibe el daño igual.
  - Ataca un 25 % más rápido.
  - Sus golpes suman ×1,5 de zona.
  - El «rompe la defensa» de Gemini no tiene sentido en un estilo sin bloqueo. Contra Sekiro se traduce así: **en Furia, la guardia mantenida de Sekiro no frena los golpes** (solo el desvío).

### 17.7 Agarre y remate en el suelo

- **Agarre** (E, alcance 1,1): 8 / 4 / 24 c si falla. La altura se elige con W, S o sin dirección, y al conectar entra la animación de pareja:
  - alto: **cabezazo**;
  - medio: **rodillazos al estómago** (3 golpes);
  - bajo: **derribo de piernas** (lo tumba).
- **Escape** (como el original): el agarrado tiene 18 c (24 en táctil) para apretar defensa **con la altura del agarre**.
  - Si acierta, se zafa con un empujón y los dos quedan neutros.
  - Si se equivoca, el agarre sigue y le hace un 20 % más de daño.
- **La CPU amaga** (en difícil y maestro): la anticipación del agarre muestra una altura y el agarre usa otra. Siempre deja una pista de 4 c al final: el pie de apoyo se acomoda a la altura real.
- **Golpe en el suelo:** con el rival derribado a menos de 1,2, S + clic da un **pisotón** (8 / 4 / 18 c, mucho daño al torso). En el mundo abierto es mirar abajo + clic.

### 17.8 Rebote en paredes

- Un golpe **medio**, o un empuje fuerte, que lleva al rival contra una pared a menos de 1,2 lo hace **rebotar**. En la arena valen sus paredes de hielo y los barriles; en el mundo, los bloques sólidos de verdad, sin romperlos.
- El rebote es la reacción `pared` (§18): queda aturdido 60 c y rebota 0,3 hacia ti, a punto para el siguiente golpe.
- En la arena, los barriles se rompen (son de la escena, no del mundo) y vuelven en la ronda siguiente. Es la versión propia de los muebles que se rompían en el original.

### 17.9 Pareja con el compañero (8·E, a nivel de diseño)

Se apoya en el acompañante del 7i (`acompanante.js`, `acompanante-pelea.js`), que ya pelea y recibe órdenes en «Hablar».

- **Órdenes rápidas en combate**, sin abrir «Hablar»: una rueda con 4 órdenes, como los 4 tipos del original.
  - **«¡A ese!»:** ataca a tu foco.
  - **«Cúbreme»:** pelea con lo que te ataca a ti.
  - **«Conmigo»:** te sigue y pelea solo (la orden que ya existe).
  - **«Quieto»:** la orden que ya existe.
  - Se dan en PC manteniendo R + una dirección, y en táctil con el botón PAREJA y deslizando.
- **Golpes de a dos:**
  - **lanzamiento compartido:** tu gancho deja al rival en el aire y el compañero lo remata con un golpe aéreo;
  - **agarre de a dos:** tú agarras y el compañero le pega al agarrado (más daño de zona);
  - **rescate:** si te agarran, el compañero suelta al agarrador de un golpe (una vez cada 20 s).
- **Red:** el compañero lo simula tu equipo, como hoy. Los golpes de a dos viajan con `ci` y `cv` como cualquier otro ataque, con el compañero como atacante.
- **En la arena:** un modo 2 contra 2 (tú y un compañero de la CPU contra Lalo y Moisés) queda para 8·E.

### 17.10 Controles

| | PC (arena) | Táctil |
|---|---|---|
| Combo básico | clic izq. sin dirección | ATACAR (toque) |
| Alto / medio / bajo | W / adelante / S + clic | ATACAR deslizando arriba / toque con el joystick hacia adelante / deslizando abajo |
| Esquiva neutra | clic der. sin dirección | DEFENSA (toque) |
| Desvío / reversión | clic der. con la altura, dentro de la ventana | DEFENSA deslizando (arriba, sin deslizar o abajo) |
| Paso lateral | Shift + W o S | deslizar arriba o abajo en la zona libre |
| Agarre (según la altura) | E (+ W o S) | AGARRE (deslizar para elegir la altura) |
| Escape de un agarre | clic der. con la altura | DEFENSA deslizando |
| Arte especial | Q (+ W o S) | ESPECIAL (deslizar para la variante) |
| Furia | Q + E | mantener ESPECIAL 20 c |
| Golpe aéreo / agarre aéreo | Espacio + clic / Espacio + E | SALTAR + ATACAR / SALTAR + AGARRE |

### 17.11 Animaciones clave de Urban Reign, fase por fase

Todo el estilo **rebota**: el peso va en la punta de los pies y nada queda tan quieto como en Sekiro. Así se reconoce aunque el personaje esté quieto (pilar 5).

**U1 · Guardia callejera.**
- **Puños** a la altura de la cara: el derecho atrás, junto al mentón (`bDx` −1,4, `codoD` −2,2, `bDz` 0,5), y el izquierdo adelante (`bIx` −1,5, `codoI` −1,6, `bIz` −0,35).
- **Cuerpo:** el hombro izquierdo adelante (`ry` −0,35), el pecho encorvado (`pX` 0,25) y el mentón abajo (`cx` 0,15). Rodillas a 0,4 y 0,5, con los pies abiertos (`pDz` 0,12).
- **Movimiento secundario:** un **rebote** de `y` (±0,03 a 2,2 Hz) en que despegan los talones y nunca la punta de los pies. El pecho se balancea (`pZ` ±0,04), desfasado del rebote, y los puños giran en círculos chicos (`bDx` ±0,05).
- **Con una zona en rojo:** la mano de ese lado la protege. Con la cabeza, la guardia sube; con el torso, el codo baja; con las piernas, cojea.

**U2 · Desplazamiento de boxeo.** Pasos cortos con rebote: sale primero el pie del lado hacia donde va y el otro lo sigue en el mismo rebote, sin que el cuerpo deje de rebotar. Hacia atrás es igual, pero más lento. Los puños se quedan en guardia.

**U3 · Jab (golpe 1 del combo).** 6 / 3 / 10 c.
- **Anticipación:** el hombro izquierdo se carga apenas (`pY` −0,1) y el puño baja 0,1 (un amago chico).
- **Golpe:** el brazo izquierdo se estira recto a la cara (`bIx` −1,55; el codo pasa de −1,6 a −0,1 con `latigo`). El pecho gira 0,25 hacia adelante y el pie de adelante avanza 0,15 en el aire.
- **Recuperación:** el puño vuelve **por la misma línea** (el codo se dobla primero) y el rebote retoma.

**U4 · Recto (golpe 2).** 7 / 3 / 12 c.
- **Anticipación:** la cadera derecha se carga atrás (`ry` −0,5) y el talón de atrás sube.
- **Golpe:** se mueve en orden caderas → pecho (`pY` −0,1 → 0,6) → hombro → codo (−2,2 → −0,05). El pie de atrás **pivota** sobre la punta (`pIx` y `pIz` giran con la cadera): es el detalle que hace creíble un recto.
- **Recuperación:** 12 c.

**U5 · Gancho ascendente (golpe 3, lanza).** 10 / 4 / 20 c. Hitstop `medio`.
- **Anticipación:** el cuerpo baja (rodillas a 0,8) y se ladea a la derecha (`pZ` 0,15). El puño derecho cae a la cadera (`bDx` −0,2, `codoD` −1,7).
- **Golpe:** las piernas se estiran de golpe y el cuerpo sube 0,2. El pecho gira y se arquea atrás (`pX` 0,25 → −0,15). El puño sube en vertical con el codo fijo a 90° (`codoD` −1,6; `bDx` −0,2 → −2,4). El rival sale al aire.
- **Recuperación:** el puño se queda arriba 4 c (*follow-through*) y después baja.

**U6 · Alto: gancho a la cabeza** (W + clic). 9 / 3 / 16 c.
- Gancho de derecha horizontal, con el codo arriba a la altura del hombro (`bDx` −1,6, `bDz` 0,9, `codoD` fijo en −1,7).
- Toda la rotación sale de las caderas y el pecho (`ry` y `pY` en cadena, con `latigo`). La cabeza del atacante se ladea en sentido contrario al golpe.

**U7 · Medio: patada frontal al torso** (adelante + clic). 10 / 4 / 18 c. Empuje grande.
- **Anticipación:** la rodilla derecha sube al pecho (`pDx` −1,4, `rodD` 2,0). Los brazos se abren para equilibrar (`bIz` 0,3) y el pecho se echa atrás (`pX` −0,25).
- **Golpe:** la pierna se estira hacia adelante (la rodilla pasa de 2,0 a 0,1, `pDx` −1,4 → −1,5), con un empujón de cadera (`pz` 0,15).
- **Recuperación:** la rodilla se vuelve a doblar antes de bajar el pie (la pierna nunca baja estirada como un palo). El pie aterriza adelante y queda como la nueva base.

**U8 · Bajo: patada barrida a las piernas** (S + clic). 11 / 4 / 22 c. Derriba.
- **Anticipación:** el cuerpo baja y el peso pasa a la pierna de adelante (`rodI` 1,0). Una mano baja casi hasta el suelo (`bIx` −0,6, `pX` 0,5).
- **Golpe:** la pierna derecha barre en un arco bajo, con la rodilla casi estirada (`pDx` −0,9, `pDz` 0,4, `latigo`). El cuerpo gira con ella (`ry`).
- **Recuperación:** se para con un rebote.

**U9 · Esquiva neutra (*weave*).** 16 c.
- El torso baja y se mueve en «U»: se agacha hacia la derecha (`pX` 0,45, `pZ` 0,2, rodillas a 0,9) y sube por la izquierda. La cabeza pasa bajo la línea del golpe alto y los puños siguen en guardia.
- Durante la ventana de castigo (14 c), el cuerpo queda abajo, cargado sobre la pierna de adelante y listo para el golpe bajo.

**U10 · Paso lateral.** 14 c, con i-frames de c2 a c11.
- Un salto corto de lado sobre la punta de los pies, con los dos pies en el aire en c3-9 (así no patina).
- El torso se inclina hacia el lado del paso (`pZ` ±0,2) y la mirada sigue al rival.

**U11 · Desvío + contraataque** (una variante por altura). 26 c, estado `contra`.
- **Alto:** el antebrazo izquierdo **barre** el golpe hacia arriba y afuera (`bIx` −2,0, `bIz` 0,5) mientras el cuerpo se agacha. En c8 sale un gancho al hígado con la derecha (hitstop `medio`) y el rival pasa a `medio_fuerte`.
- **Medio:** el cuerpo gira de lado (`ry` 0,8) y el golpe pasa por delante. El codo derecho vuelve al estómago del rival (c8) y lo empuja.
- **Bajo:** levanta la pierna atacada (`pDx` −0,6, `rodD` 1,4) para que la patada pase por abajo. El pie baja **pisando** y sale un recto a la cara (c10).
- **En las tres:** la chispa es blanca (no amarilla: no hay metal, salvo contra la katana) y suena a carne con una palmada.

**U12 · Reversión** (ventana de 3 c). Animación de pareja, 40 c.
- c0-6: atrapa la extremidad que pega: el brazo o la pierna del rival queda pegado a sus dos antebrazos.
- c6-20: gira con él (`ry`, media vuelta, con las rodillas dobladas) y lo lanza por encima de la cadera.
- c20-40: el rival cae de espalda (`derribo`). El que revirtió queda de pie, mirándolo, con un rebote.

**U13 · Agarres** (de pareja, sincronizados al cuadro).
- **Cabezazo** (alto, 30 c): lo toma de los hombros (los dos brazos adelante, `bDx` −1,5, codos −0,6), echa la cabeza atrás (`cx` −0,4, `pX` −0,3) y la baja de golpe (`cx` 0,45, `pX` 0,5). El rival recibe `alto_fuerte` y queda mareado.
- **Rodillazos** (medio, 42 c): lo toma del cuello y le da tres rodillazos (`pDx` −1,3, `rodD` 1,8), cada uno con su hitstop chico. El rival se dobla un poco más con cada uno.
- **Derribo de piernas** (bajo, 36 c): se agacha, lo toma de una pierna (los brazos abajo) y lo tumba de espalda. Queda encima y se para.
- **Escape:** el agarrado se zafa con un **empujón**. Los dos retroceden 0,6 y quedan en guardia.

**U14 · Pisotón en el suelo.** 8 / 4 / 18 c. La rodilla sube (`rodD` 1,8, `pDx` −1,0) y baja con todo el peso (el cuerpo baja 0,1). Levanta un anillo de polvo o nieve y causa una sacudida `medio`.

**U15 · Arte especial: patada giratoria.** 8 / 18 / 20 c, con i-frames enteros. Da un giro completo sobre el pie izquierdo (`ry` 2π con `salida`), con la pierna derecha estirada a la altura del pecho, y golpea en todo el círculo. Deja una estela pixel circular y una cámara lenta de 0,2 s al final.

**U16 · Activar la Furia.** 40 c, invulnerable. Se agacha con los puños cerrados junto al pecho (codos −2,4) y se para de golpe abriendo los brazos (`bDz` −0,6, pecho arqueado con `pX` −0,3). Una onda de cubos rojos recorre el suelo y suena un grito sintetizado grave.

**U17 · Victoria.** Sacude los hombros (`pZ` ±0,15), choca los puños frente al pecho y vuelve a la guardia con un rebote más lento.

---

## 18. Reacciones de quien recibe (§1)

Son comunes a todos los estilos, a la CPU y a los monstruos con rig de persona. Están en `combate.json → reacciones` y cada estilo puede reemplazar una con la suya (por ejemplo, la cojera de Urban Reign). Nunca son un parpadeo rojo solo.

| Clave | Cuándo | Animación (fases) | Duración |
|---|---|---|---|
| `alto_leve` | golpe alto ligero | La cabeza se va atrás primero (`cx` −0,4 en 2 c) y el pecho la sigue (`pX` −0,3). Un pie retrocede en el aire y vuelve a la guardia con `asentar` | 14 c |
| `alto_fuerte` | golpe alto fuerte, cabezazo, pisotón | Como el leve, pero gira la cabeza hacia el lado del golpe (`cy` 0,6) y retrocede dos pasos tambaleando (`pZ` ±0,15) | 30 c |
| `medio_leve` | golpe medio ligero | Se dobla: el pecho adelante (`pX` 0,6), los brazos al estómago (codos −2,0, `bDz` 0,8) y las rodillas ceden (0,5). Se endereza en 2 tiempos | 18 c |
| `medio_empuje` | golpe medio con empuje | Doblado como el leve y empujado: retrocede en 2 o 3 pasos reales (el pie en el aire en cada uno) | 26 c |
| `medio_fuerte` | contraataque al hígado, rodillazos | Doblado profundo (`pX` 0,85), una rodilla casi al suelo, y se para | 40 c |
| `bajo_leve` | golpe bajo sin derribo | La rodilla del lado golpeado cede (`rod` 1,0) y el cuerpo baja de ese lado (`pZ` 0,2). Recupera con un paso | 16 c |
| `derribo` | golpe bajo, agarres, reversión | **Caída de espalda en 4 fases:** pierde los pies (las piernas adelante, el pecho atrás, 6 c) → en el aire (8 c) → **impacto** en el suelo: la espalda primero, con un rebote de 0,1, polvo y una sacudida (4 c) → tendido (20 c) | 38 c + `levantarse` |
| `levantarse` | después de `derribo` | Gira de lado, apoya una mano y una rodilla y se para en guardia (i-frames enteros). Con `esquivar` en el suelo: **rueda** de lado y se para (también con i-frames) | 30 c |
| `pared` | rebote contra una pared | Choca de espalda (hitstop extra de 4 c), rebota 0,3 hacia adelante y queda aturdido (los brazos abajo, la cabeza ladeada) | 60 c |
| `aturdido` (mareo) | cabeza rota, cabezazo | Tambaleo en círculo: el pecho dibuja un círculo lento (`pX` y `pZ` ±0,15 a 0,8 Hz), los pies dan pasitos para no caerse y hay estrellas pixel sobre la cabeza | 120 c |
| `desequilibrado` | postura rota (Sekiro) | El arma baja (los brazos caen, `bDx` −0,3), la rodilla de adelante cede (`rod` 1,2) y el pecho cae (`pX` 0,5). **Marca roja** pixel en el pecho (la señal del golpe final) | 90 c |
| `desviado` | tu ataque fue desviado (normal) | El arma rebota atrás y arriba (`bDx` hacia −2,4 y `armaX` atrás), el pecho se abre (`pX` −0,25) y da un paso atrás | 18 c |
| `desviado_largo` | desvío perfecto, mikiri | Como `desviado`, pero más abierto y con un segundo paso. Deja una ventana real de castigo | 30 c |
| `bloqueado` | tu ataque chocó con una guardia | Rebote corto del arma | 8 c |
| `rematado` | golpe final o remate | Animación de pareja: el que remata manda; el rematado cae (`derribo` lento con cámara lenta) y se queda tendido hasta el final de la ronda | según el remate |
| `cojera` | piernas rotas (Urban Reign) | Caminata asimétrica: la pierna rota no dobla la rodilla (`rod` 0,1) y el pecho se ladea a ese lado en cada paso | ciclo |

- **Dirección:** toda reacción se orienta según el lado del golpe, porque el golpe trae su origen. Una reacción `alto_leve` recibida por la izquierda gira la cabeza a la derecha.
- **Acumular:** una reacción leve recibida durante otra reacción leve se reinicia con inercialización (6 c), no desde la pose de guardia. Tres leves seguidas sin defenderse se convierten en `alto_fuerte` o `medio_fuerte`: el cuerpo «se rinde».

---

## 19. Arena de Lalo contra Moisés (8·L, §12)

Minijuego completo (regla de los minijuegos: escenario propio, dificultad y sensación). Es el **laboratorio** del combate: aquí se pulen el núcleo y los dos primeros estilos antes de llevarlos al mundo.

### 19.1 Qué es

- **Peleadores (decidido, §27.1):** **Lalo = Sekiro** (su sombrero de paja calza con un ronin) y **Moisés = Urban Reign** (el de la calle). Cada peleador tiene su ficha en `arena.json → peleadores` (estilo, vida, postura, colores del aura y frase de victoria y de derrota ES/EN), así que cambiar quién usa qué es editar un dato.
- **Modos:**
  - **1 jugador:** eliges peleador y la CPU lleva al otro.
  - **2 jugadores por sala** (como la carrera: `SalaDirecta` o `SalaLocal`): cada uno controla su peleador.
  - **Espejo** (los dos con el mismo estilo): se desbloquea al ganar una vez con cada uno.
  - **Práctica:** el rival no ataca o repite un ataque elegido. Muestra los cuadros en pantalla (anticipación, activo, ventana de desvío) y sirve también para que el dueño pruebe los datos desde el Estudio.
- **Dificultad:** fácil, normal, difícil y «Moisés en serio» / «Lalo en serio» (maestro). Los valores están en `arena.json → dificultades` (§15.7).
- **Rondas:** al mejor de 3, de 60 s cada una (editables). Se gana por vida en 0, por **golpe final** (postura rota en Sekiro) o, al acabarse el tiempo, por más vida en porcentaje.
- **Tono:** pelea de amigos. Sin sangre, nadie muere. Al terminar, el perdedor se levanta riéndose y los dos chocan los puños.

### 19.2 Sekiro contra Urban Reign (el cruce)

| Ataque de… | Cómo se defiende el otro |
|---|---|
| Sekiro → Urban Reign | Cada tajo tiene su altura (S3 alto, S4 medio, S5 medio, S6 alto, barrido bajo). Urban Reign la lee y desvía con la altura, o hace la esquiva neutra. Los tajos suman zona: los altos a la cabeza, los medios al torso y el barrido a las piernas |
| Urban Reign → Sekiro | Sekiro desvía o bloquea cualquier golpe normal sin adivinar la altura. Los **agarres** de Urban Reign son `agarre` peligroso para Sekiro (solo se esquivan) y el **bajo** es `barrido` (se salta). El SPA es `imparable`. Los golpes de Urban Reign suman postura |
| Recursos | Cada uno sufre según su sistema: Sekiro pierde por postura (golpe final) o por vida; Urban Reign, por vida, con las zonas como multiplicador y estado crítico |

Así cada estilo tiene una ventaja clara: Sekiro tiene una guardia que perdona; Urban Reign desvía incluso lo peligroso. El balance se mide (§19.8).

### 19.3 Escenario y entrada animada (§9: la entrada tiene gracia)

- **Escenario por defecto: el lago congelado** frente al iglú de Lalo y Moisés. Es una escena propia, como la de la carrera (`carrera-escena.js`): no toca el mundo.
  - El suelo de hielo tiene grietas pixel y nieve en los bordes.
  - Paredes bajas de bloques de nieve y hielo cierran un rectángulo de 14 × 8 bloques (sirven para los rebotes) y hay barriles rompibles en las esquinas.
  - Cuatro fogatas dan una luz cálida que parpadea. Nieve cae en partículas, con el viento en `arena.json`.
  - Detrás de la pared lejana hay público: amigos tomados de una lista en `arena.json → publico` (genéricos, no amarrados a nadie) que celebran los golpes fuertes con gestos que ya existen.
  - Más escenarios después, con `escenario.tipo`, igual que la carrera.
- **Cómo se entra:** en «Hablar» con Lalo o con Moisés aparece la opción «¡Un duelo en el lago!» (desde el nivel de amistad de `arena.json → nivelDuelo`).
  1. **El reto** (escena con guion de `escenas.json`, `duelo-reto`, ~6 s): Lalo se para y se acomoda el sombrero, Moisés se truena los dedos (gestos nuevos), y cada uno dice una frase (globos ES/EN).
  2. **El viaje** (~5 s): la cámara de cine sigue a los tres saliendo por el túnel del iglú, desde atrás y bajo. Afuera, una ráfaga de nieve en partículas va llenando la pantalla. Es una transición sin corte: la nieve tapa, se cambia de escena y la nieve se despeja.
  3. **Presentación tipo Mortal Kombat** (~3 s, Espacio la salta):
     - la pantalla se parte en diagonal pixel, con el **retrato de la carta** de cada uno (`cartas-arte.js`, el mismo arte de 50×76 escalado ×4 con `NearestFilter`);
     - abajo, su nombre y su estilo («El Ronin» / «The Ronin», «El de la Calle» / «The Street»);
     - suena un tambor y aparece «VS» en PixelCraft.
  4. **Vuelo de cámara** por la arena con el nombre del escenario (~4 s, Espacio lo salta) y los peleadores entrando a su marca con su animación de entrada (Lalo desenvaina; Moisés se saca la chaqueta).
  5. **«Ronda 1»** → **«¡Peleen!»** / «Fight!», con texto grande pixel y sonido.
- **Al terminar:**
  - pantalla de resultado con la animación de victoria de cada estilo (S13 termina envainando; U17);
  - premio y amistad (§19.7);
  - **Revancha** / **Elegir otra vez** / **Salir**. Salir devuelve al iglú con una ráfaga de nieve inversa.

### 19.4 Cámara de la arena (de lado al eje del duelo)

- El **eje del duelo** es la recta entre los dos peleadores. La cámara se pone **perpendicular a ese eje**, del lado de P1 (en 2 jugadores, cada uno ve desde su lado: la cámara es local), a la altura de los hombros y mirando un poco hacia abajo (8°).
- **Distancia según la separación:** encuadra a los dos con un margen. Va de 3,5 bloques (cuerpo a cuerpo) a 8 (lejos), con un resorte de 0,25 s. Se adelanta un poco hacia donde va el que se mueve.
- **El paso lateral** desplaza el eje. La cámara orbita para seguir perpendicular, con una velocidad angular máxima de 90° por segundo y suavizado, así que nunca da un giro brusco. P1 no cambia de lado: el eje gira de forma continua.
- **Sacudida y acercamientos:** el trauma de §15.4. Con un desvío perfecto, la cámara se acerca un 10 % durante 0,25 s.
- **Planos de remate** (golpe final, reversión, agarres de pareja): la cámara pasa a un plano de cine predefinido por animación: bajo y lateral, a 2 bloques, mirando a los dos. Entra con un corte tapado por un destello blanco de 2 c y vuelve con un resorte. Los planos van en `arena.json → planos`.
- **Sin el problema de los bloques:** la escena es propia y la arena está cerrada. Por eso la cámara de lado es el laboratorio perfecto, y la cámara en tercera persona del mundo (§20.3) puede esperar.

### 19.5 Movimiento en la arena

- Se camina en el eje (A y D) y se sale del eje con el paso lateral.
- Correr: mantener Shift después de una esquiva. Salto vertical con Espacio.
- Los dos peleadores **siempre se miran** (giran en el eje, con mirada y caderas por inercialización). Después de un paso lateral, el cuerpo se reorienta en 6 c.
- Las paredes empujan y hacen rebotar (§17.8). Un peleador no puede salir de la arena.
- **Empuje entre cuerpos:** a menos de 0,7, los dos se separan suave. Nunca se superponen ni se atraviesan, salvo en las animaciones de pareja, que fijan sus posiciones.

### 19.6 CPU peleador

Cada estilo tiene su tabla en `estilo-*.json → cpu`, y la dificultad escala tiempos y probabilidades (§15.7).

- **Sekiro (Lalo):**
  - cadenas de 2 a 4 tajos, con **tajos retrasados** de vez en cuando (la anticipación se alarga 8 a 16 c para castigar al que desvía por ritmo, como algunos duelistas del original);
  - desvía tus tajos con una probabilidad según la dificultad;
  - un peligroso cada 6 a 12 s, más seguido con poca vida;
  - respira y provoca cuando te alejas.
- **Urban Reign (Moisés):**
  - presión con jabs para medir la distancia, cambios de altura en cadena (alto → bajo para engañar) y agarres con amago (difícil y maestro);
  - esquiva neutra y desvío según la dificultad;
  - usa el arte especial para escapar de tus combos (como el original) y la Furia cuando va perdiendo.
- **Reglas para todas las CPU:**
  - nunca ataca durante tu hitstop;
  - no repite el mismo ataque más de 3 veces seguidas;
  - siempre deja una ventana de castigo después de una cadena;
  - se puede **leer**: cada ataque suyo tiene su anticipación completa (nunca la comprime como hace la red).

### 19.7 HUD, sonido, premio

- **HUD** (pixel, PixelCraft, ES/EN):
  - **arriba:** las barras de vida estilo Mortal Kombat a cada lado, con nombre, retrato chico e íconos de rondas ganadas, y el reloj al centro;
  - **bajo cada vida, según el estilo:** la postura (Sekiro: una barra que crece desde el centro, de amarillo a naranja, y parpadea al 80 %) y el espíritu (3 segmentos), o la **silueta de zonas** y la barra SPA en 4 segmentos (Urban Reign);
  - **sobre los peleadores:** la marca de peligro y la marca roja del golpe final.
  - Todo editable en `arena.json → hud` (posiciones y colores).
- **Música:** un tema `duelo` en `musica.json` (capas: tambores graves, una flauta sintetizada para el lado de Sekiro y un bajo callejero para el de Urban Reign). Se intensifica en la ronda final y se corta 0,5 s en el golpe final.
- **Premio:** amistad con Lalo y Moisés (minijuego `duelo`, como la carrera con Lona) y un objeto por la primera victoria de cada dificultad (en `arena.json → premios`). Decidido: objetos y amistad (§27.4).

- **Hecho en L1 (2026-10-20), con estos ajustes** (`supervivencia/arena/`, datos en `arena.json`):
  - El **paso lateral orbita al rival**: el eje gira a lo más `movimiento.giroEje` (75 °/s), menos que `camara.giroMax` (90 °/s). Así la cámara siempre lo alcanza y P1 nunca cambia de lado en la imagen, ni cuerpo a cuerpo (con un paso lateral libre, a 0,7 bloques el eje giraba más de 300 °/s).
  - La cámara tiene un **piso de distancia** que nunca pierde a nadie (medido desde su centro real, con el radio del cuerpo); puede pasar un poco `distanciaMax` mientras el centro alcanza a uno que se aleja. Los peleadores **no se separan más** de lo que la cámara encuadra a su distancia máxima con el ancho de la pantalla (`separacionMax`, con piso `separacionMin` para pantallas angostas). Al empezar una ronda la cámara corta (lo tapa el anuncio).
  - La altura de la cámara sube con la distancia (`mira` + distancia × tan(`inclinacion`), nunca menos de `altura`): el cuerpo queda al centro de cerca y de lejos.
  - **VS con primeros planos 3D** (`vs.retrato: "3d"`), porque Lalo no tiene carta del Duelo. Con `"carta"` se usará el retrato de la carta cuando exista.
  - Quedan para L8 el **viaje** por el túnel del iglú (hoy la ventisca tapa el cambio de escena sin seguir a nadie) y las animaciones de entrada (desenvainar, chaqueta) y de victoria. El rival es de práctica (`practica`: se acerca y tira el tajo cada 1,4 a 2,6 s, nunca en tu hitstop); la CPU llega en L4.
  - La escena del reto son dos espejos (`duelo-reto`, `duelo-reto-moises`), porque el esquema de `guion` no admite `reparto`.
  - **La arena es el laboratorio, no el destino:** la cámara de lado y la escena cerrada sirven para afinar el combate. El movimiento ya es 3D (el paso lateral orbita y el eje gira), y estados, animación e intenciones no dependen de la cámara, así que el mismo combate pasa al modo supervivencia con la cámara en tercera persona de §20.3 (8·M).
  - Pedidos del dueño tras probarla (2026-10-20), anotados en `PENDIENTES.md`: el combo continuo (cada tajo empieza donde terminó el anterior), la katana como modelo 3D de calidad y la estela del tajo, en L2; la capa completa de efectos de cada golpe (impacto, chispas, aros, líneas de velocidad, flashes, polvo), en N5; el escenario con modelos de calidad, en L8. Principio: **los efectos venden el golpe**; toda animación de ataque se revisa con sus efectos puestos.

### 19.8 Balance (lo que se mide antes de cualquier PvP)

- **Prueba de balance** `mundo/tests/arena-balance.mjs`: CPU contra CPU en Node (sin dibujar, con paso fijo y semilla), 400 combates por dificultad y combinación (Sekiro contra Urban Reign y los espejos).
- **Criterio:** ningún estilo gana más del 60 % en la misma dificultad. La duración media de una ronda tiene que quedar entre 25 y 50 s.
- Los resultados se anotan en el PR. Si un estilo pasa del 60 %, se ajustan datos, no reglas.

---

## 20. Mundo abierto (8·M, a nivel de diseño, §2.1, §3, §4.5)

Entra **cuando la arena funcione bien** (decisión del dueño). Hereda los datos y las animaciones de 8·L sin rehacerlos.

### 20.1 Convivencia con construir (decidido)

- **El arma de estilo en la mano define la intención.**
  - Con katana, vendas (puños), espadón o dagas, el **clic izquierdo ataca y nunca mina**, y el clic derecho es `defensa`.
  - Con herramienta, bloque o mano vacía sin vendas, todo sigue como Minecraft: el clic mina y pone bloques.
  - **Por qué:** no hay ambigüedad en ningún cuadro. Además, el jugador decide al cambiar de casilla (1-9 o la rueda), un gesto que ya hace mil veces. Las otras opciones del encargo (§2.1) tienen problemas:
    - «Clic sobre bloque mina, clic con enemigo en foco ataca» falla justo en el peor momento: el enemigo frente a una pared.
    - «Solo un botón de modo» obliga a un paso más en medio del peligro.
- **Modo combate:**
  - Se entra **solo** al sacar el arma de estilo con un enemigo a menos de 12 bloques, o con **V** («Guardia»).
  - Al entrar: el personaje desenvaina o se pone las vendas (animación de 20 c, que no bloquea moverse), la cámara pasa a tercera persona dinámica y se muestra el HUD de combate (postura o zonas).
  - Se sale con **V**, o solo tras 6 s sin enemigos a menos de 16 bloques (envaina y la cámara vuelve a la vista que tenías).
- **Hasta que llegue 8·M**, el mundo abierto sigue con el combate de hoy (`combate.js`, spam de clic). El núcleo no lo toca.

### 20.2 Controles en el mundo

| | PC | Táctil |
|---|---|---|
| Moverse | W A S D (relativo a la cámara) | joystick |
| Altura (Urban Reign) | según la mira (arriba del pecho del foco = alto; bajo la cintura = bajo); manteniendo defensa, W o S la fijan | deslizar en ATACAR o DEFENSA, como en la arena |
| Foco (lock-on) | **clic de la rueda** o **Z** (fijar o soltar); rueda arriba o abajo = siguiente; mover el mouse rápido a un lado = el de ese lado | **FOCO**: toque fija o suelta; deslizar sobre FOCO cambia; tocar a un enemigo lo fija |
| Lo demás | como la arena (§16.2, §17.10) | como la arena |

### 20.3 Cámara en tercera persona dinámica (§3: lo más delicado de la base)

Reemplaza a la tercera persona del F5 **solo en modo combate**: el F5 de hoy no se toca.

- **Brazo con resorte:**
  - El punto de mira queda sobre el hombro derecho del jugador (0,5 de lado, 1,6 de alto), con la cámara a 4,5 detrás.
  - Resorte crítico de 0,18 s en posición y de 0,12 s en giro.
  - **Adelanto:** el punto de mira se adelanta en la dirección de la velocidad (hasta 0,8).
  - **Con foco:** la cámara encuadra al jugador y al foco (el punto medio, con el jugador en el tercio izquierdo) y se aleja si el foco es grande (jefes).
  - **Remates:** se acerca a 2,5 y baja, con la cámara lenta local (§15.4).
- **Choque con bloques (el riesgo n.º 1):**
  - **Rayos:** 5 rayos de vóxeles (DDA, como `lanzarRayo`) desde el punto de mira a la posición deseada: el centro y las 4 esquinas del plano cercano de la cámara. Solo frenan los bloques opacos (tipo 1 y 6, como `libre()` en `camaras.js`); las hojas, plantas y antorchas no frenan.
  - **Entra rápido y sale lento:** si un rayo choca, la cámara se pone en el choque menos 0,2 en **2 c** (sin resorte, para no meterse nunca en la pared). Al liberarse, vuelve con un resorte lento de 0,4 s. Así no tiembla al rozar esquinas.
  - **Distancia mínima** de 1,2. Más cerca, la cámara pasa a un plano casi en primera persona, sobre el hombro, y el cuerpo propio se ve transparente al 50 %.
  - **Lo que tape al jugador o al foco** (un pilar entre la cámara y el foco): el material de los chunks recibe un uniforme con el segmento cámara → jugador y descarta, con un **tramado pixel** (un patrón de ajedrez de 2 px, sin transparencia real, que es barato y estético), los fragmentos dentro de un cilindro de 0,6 alrededor del segmento. Es un solo cambio de shader en el material de los chunks, sin reconstruir mallas.
  - **Prueba** `camara-combate.mjs`: 500 posiciones al azar en el mapa real (cuevas, bosques, junto a muros) en las que la cámara nunca queda dentro de un bloque opaco ni salta más de 0,5 por cuadro.
- **Reuso de `camaras.js`:** se reusan `libre()`, el cuerpo del jugador (`actualizarCuerpo`) y la lógica de los planos de cine para los remates.

### 20.4 Foco (lock-on)

- **Elegir el foco:** el enemigo con el menor `ángulo a la mira × 1,0 + distancia × 0,08`, a menos de 20 bloques y con línea de vista.
- **Marca:** un rombo pixel blanco y rojo que gira, sobre el pecho del foco (estilo Devil May Cry). Sobre otros enemigos que te tienen ficha aparece una marca chica y gris («este viene»).
- **Cambiar:** al siguiente por ángulo hacia el lado pedido.
- **Se suelta** si el foco se aleja más de 24, si pasa 2 s sin línea de vista, o si muere. En ese caso pasa al siguiente en 0,5 s, solo si hay otro a menos de 10. Si no, suelta.
- **Si el foco sale de la vista:** la cámara gira hacia él con un resorte (sin pelear con el mouse: el mouse suma un desplazamiento que se apaga solo).
- **Con varios enemigos:** el foco es uno. El jugador ve en la marca chica quién tiene ficha.

### 20.5 Enemigos con aviso (§4.5)

| Enemigo | Rig | Estilo y ataques (con aviso) |
|---|---|---|
| Zombi | persona (rig nuevo) | Torpe: 2 golpes de brazo con anticipación larga (28 c), y abrazo-agarre (peligro `agarre`) |
| Esqueleto | persona | Arco (como hoy, con el aviso del arco tensado de 30 c) y, de cerca, golpe con el arco. Desvía flechas: Sekiro desvía flechas como el original |
| Trauco | persona | Sekiro de monstruo: tajos con hacha de mano y estocada peligrosa |
| Araña | propio (8 patas) | Se levanta en las patas traseras para avisar (20 c) y salta; mordida baja (se salta) |
| Creeper | propio | La mecha ya es su aviso; se suma un retroceso visible antes de inflarse |
| Lepisma | propio | Enjambre chico sin fichas (no cuentan), mordiscos de 1 de daño |

- **Postura y zonas:** cada monstruo tiene las dos, con valores en `enemigos-combate.json`. Así sirve contra cualquier estilo.
- **Fichas** (§15.7): 2 por jugador por defecto (3 en difícil). En el cooperativo las administra el dueño del monstruo, por cada jugador objetivo.
- **Patrones:** cada monstruo con un estado de «rodear» (camina de lado manteniendo la distancia, amaga) mientras espera su ficha. Es lo que hace que un grupo se vea peligroso pero justo.
- Los cambios en `enemigos.js` son de comportamiento (estados y telegrafía). La aparición, la luz, el sol y las zonas seguras siguen igual.

### 20.6 Red en grupo y rendimiento

- **Red:** §15.8 (`ci`, `cv`, `g` con `at` y `rx`, `ce` dentro de `p`). El PR M4 mide los mensajes en una sala de 8 con 16 monstruos peleando.
- **Rendimiento (Android primero):** el PR M1 mide antes de gastar.
  - **Presupuestos:** 300 partículas de combate vivas, como mucho; 8 peleadores animados con el motor de combate a la vez (los demás monstruos lejanos usan su animación simple de hoy, como LOD); la cámara lenta solo local.
  - Si el celular baja de 50 fps en la prueba de `rendimiento.mjs`, se recortan primero las partículas y después la distancia del motor de combate.

---

## 21. Estilo Goliath · espadón, martillo, hacha (§7, a nivel de diseño, 8·E)

- **Evoca:** Monster Hunter (la carga) y Dark Souls (el peso).
- **Guardia:** el arma apoyada en el hombro derecho, la mano izquierda en la empuñadura baja, las piernas muy abiertas (`pDz` 0,3) y las rodillas a 0,6. La respiración es lenta y profunda (0,25 Hz). Es lento y plantado.
- **Caminar:** pasos pesados que hunden el cuerpo (las rodillas ceden en cada pisada), con polvo en cada paso y más lento que los otros estilos.
- **Ataque cargado:** mantener el clic carga 3 niveles (20, 40 y 60 c; brillo y temblor creciente).
  - **Hyper armor** durante la carga y el golpe: recibe el daño sin reacción.
  - Al soltar: un golpe vertical lento (anticipación de 14 c, golpe de 6 c, recuperación de 40 c). En el nivel 3 tiene un hitstop de 14 c y una sacudida de 0,8.
  - Si el golpe cae al suelo, **onda de choque**: daño en área (radio 2,5 en el nivel 3) y bloques que «revientan».
- **El suelo cambia de verdad y se repara (decidido por el dueño, §27.5):**
  - **Al golpear:** los bloques naturales de la superficie en el radio (tope de 12 por golpe en el nivel 3; menos en el 1 y el 2) se cambian a aire o a una versión agrietada, con `mundo.ponerBloque` y una marca **temporal**. Al mismo tiempo, cubos con la textura de cada bloque **salen volando** en abanico (física simple y rebote), con polvo y una calcomanía de cráter.
  - **Al reparar** (a los 4 s, editable): los cubos vuelven volando a su hueco, uno tras otro, y cada bloque reaparece al llegar su cubo, con un destello chico.
  - **Lo que nunca se rompe:**
    - lo construido: solo se tocan los bloques que **no** están en las ediciones guardadas del mundo, es decir, terreno natural nunca tocado por un jugador;
    - cofres, hornos, camas, bloques con forma y todo lo que tenga contenido;
    - lo que esté bajo un jugador, un amigo o un animal (no se cae nadie a un hoyo).
  - **Guardado:** los bloques temporales no se escriben en el guardado. Si se guarda o se sale a media reparación, al cargar se restauran.
  - **Cooperativo:** lo decide el que golpea (`ci` del golpe con su nivel). El anfitrión aplica el cambio y la reparación con el mensaje de bloques de hoy (`b`) más una marca temporal, así todos ven el mismo hoyo y la misma reparación. Si el anfitrión sale, la foto del mundo ya lleva los bloques restaurados.
  - **Costo:** dos reconstrucciones del chunk por golpe (al romper y al reparar, agrupadas aunque haya varios bloques). Se mide en Android en el PR E4; si baja de 50 fps, se baja el tope de bloques (dato editable).
- **Guardia:** el arma levantada en diagonal bloquea el 80 % del daño (y sube la postura propia, si hay postura). **Bloqueo justo** de un ataque pesado (ventana de 6 c): el atacante queda en `desviado_largo` (recoil) y se abre una ventana para un **golpe crítico lento** (un remate de 50 c con cámara de cine).
- **Datos:** `estilo-goliath.json`.

## 22. Estilo Danzante · dagas, guadaña ligera (§8, a nivel de diseño, 8·E)

- **Evoca:** Devil May Cry (el rango y el aire) y Trickster (el dash).
- **Guardia:** baja y abierta, sobre una pierna adelantada, con las dagas invertidas junto al antebrazo (`armaX` 3,1) y un balanceo de lado a lado. Es el estilo más vivo.
- **Lanzador** (mantener `fuerte`): un tajo ascendente que lanza al enemigo 2,5 bloques arriba. Mantener saltar al soltarlo = **sigue al enemigo al aire**.
- **Combo aéreo:**
  - Mientras dura el combo, la gravedad del jugador y del enemigo baja al 15 % y se recupera de a poco (cada golpe aéreo la sube un 15 %). Así no hay combos infinitos y se ve como desafiar a Minecraft.
  - Remate aéreo: un golpe hacia abajo que lo estrella (`derribo` y polvo).
- **Dash de sombra** (`defensa` o `esquivar`, no es una rodada): un teletransporte corto de hasta 4 bloques.
  - Atraviesa enemigos y deja al jugador **a la espalda** del foco, con i-frames enteros.
  - Deja una nube de humo pixel en el origen y en el destino. El cuerpo se ve como 3 cuadros de estela oscura en línea.
  - Cuesta 1 de 3 cargas, que vuelven en 1,5 s cada una.
- **Rango de estilo (D, C, B, A, S, SS, SSS):**
  - Los puntos suben al pegar, con un multiplicador por **variedad**: el mismo ataque repetido vale cada vez menos (½, ¼…).
  - Bajan con el tiempo y caen de golpe al recibir daño (2 letras).
  - Cuanto más alto el rango, más velocidad (hasta +20 % en SSS) y efectos más vistosos (estelas de luz en los golpes desde B, chispas de color desde S).
  - HUD: la letra pixel grande a la derecha, con un temblor al subir.
- **Datos:** `estilo-danzante.json` (incluye la tabla de rango).

## 23. Jefes y arenas (§9, a nivel de diseño, 8·M y 8·E)

- **Qué se reusa de `jefes.js`:**
  - los altares y el objeto que entrega Venjy para invocar;
  - devolver el objeto si mueres o te alejas;
  - el fantasma en red y `golpeRemoto`;
  - `premiar` y los créditos del Caleuche;
  - el mensaje `jv`.
- **Qué se rehace:** el cerebro de cada jefe pasa a ser una máquina de estados con ataques en datos (`jefes.json`: fases, ataques con `peligro`, postura y zonas) y animaciones propias con aviso.
- **Arena en el mundo** (no es una escena aparte: así el cooperativo es el mismo mundo):
  - Al invocar se cierra un anillo de **niebla pixel** (cubos semitransparentes con tramado) alrededor de la zona del jefe.
  - Dentro, la música del jefe (`musica.json`).
  - Los que crucen la niebla en los primeros 5 s pelean; después queda sellada. Los de afuera ven la pelea a través de la niebla y no pueden entrar hasta el reintento.
- **Entrada animada (no un teletransporte):**
  - **Imbunche:** al usar el altar al fondo de la mina, el suelo se agrieta y el jugador **resbala** por un túnel de tierra hasta la caverna del jefe. La cámara de cine lo sigue desde atrás y abajo; es un viaje de 4 s sobre una curva.
  - **Chonchon:** en el portal en ruinas, un remolino de viento levanta al jugador y lo deja en lo alto de las ruinas, con la cabeza voladora rodeándolo. La cámara orbita.
  - **Caleuche:** se mantiene la pasarela que baja del barco fantasma. La entrada pasa a ser una escena: la pasarela cae, el jugador sube por ella en un travelling y la niebla se cierra al pisar la cubierta.
- **Cada jefe tiene:**
  - una barra de vida grande abajo, con su nombre y su postura;
  - **fases** al 66 % y al 33 %: una escena corta de 3 o 4 s (el jefe ruge, cambia de arma o de forma) con el jugador invulnerable, y los ataques nuevos se suman a su tabla;
  - **golpes finales**: la cantidad de veces que hay que romperle la postura o vaciarle la vida (Sekiro: 2 o 3 marcas);
  - **muerte y reintento:** reapareces en una **fogata de reintento** junto a la arena (una para cada jefe, que se enciende al verla). El jefe vuelve a su vida llena, el objeto de invocación no se pierde y el reintento es inmediato, con una entrada corta de 1 s (sin el viaje completo).
  - **cooperativo:** lo simula el anfitrión; pelean los que entraron antes de que se sellara y todos los que estén cerca lo cuentan para sus misiones (como hoy).
- **Primer jefe con arena:** el **Imbunche** rehecho en 8·M (PR M8). Los otros dos y los jefes nuevos, en 8·E.

## 24. Estilos, armas, maestros y progresión (§4.6)

- **Cada estilo tiene su arma** (objetos nuevos en `objetos.js` con el campo `estilo`):
  - Sekiro: katana (receta de hierro y madera, con su vaina);
  - Urban Reign: vendas (receta de lana), y la mano vacía usa una versión básica del estilo;
  - Goliath: espadón, martillo o hacha pesada;
  - Danzante: dagas dobles o guadaña ligera.
- Los objetos y recetas siguen la skill `objetos-supervivencia`. Los íconos se pintan en la pestaña Píxeles.
- **Técnicas:** cada estilo tiene técnicas básicas, que funcionan con solo tener el arma (combo, desvío normal, esquiva), y técnicas que **enseña su maestro** (desvío perfecto, mikiri, golpe final; reversión, agarres por altura, Furia; carga de nivel 3 y onda; dash de sombra y combo aéreo). Se guardan en `misiones.estado.tecnicas` (se serializa).
- **Portafolio (antes de lo comercial):** Lalo enseña Sekiro y Moisés enseña Urban Reign, como misiones de amistad que se desbloquean al ganarles en la arena en dificultad normal. Así la arena es también el lugar donde se aprende.
- **Comercial (decidido, §12):** cada uno de los **4 bastiones de la Fragmentación** enseña un estilo, con un maestro por bastión. Aprender un estilo es parte de la historia y de la reputación con esa facción. El diseño de los maestros va junto a las fases comerciales 4 y 4b (§13).

---

## 25. Datos, esquemas y pestañas del Estudio (§10)

### 25.1 Archivos de datos (todos en `mundo/datos/`, con `lee` en `indice.json`)

| Archivo | Qué tiene | Lo lee | PR que lo crea |
|---|---|---|---|
| `poses.json` (existe) | + `limites` de cada canal; los gestos de combate que no son ataques (provocar, entrada a la arena) | `gestos.js`, `pose-jugador.js` | N1 |
| `combate.json` | teclas (perfiles de PC), táctil (buffer, ventanas extra, umbrales, vibración), curvas, peso (hitstop, trauma, cámara lenta, empuje), partículas, sonidos por capa, reacciones (§18), red (compresión máxima), cámara del mundo y foco | `combate/*.js` | N3 a N7 |
| `estilo-sekiro.json` | reglas (postura, ventanas, penalización, espíritu), ataques (§15.3), animaciones con claves de fase, guardia, paso y CPU | `combate/estilos.js` | L2, L3 |
| `estilo-urbano.json` | reglas (zonas, SPA, Furia, ventanas de desvío y reversión), ataques, animaciones, avisos y CPU | `combate/estilos.js` | L5, L6 |
| `arena.json` | peleadores, escenarios, rondas, dificultades, planos de cámara, HUD, público, premios, `nivelDuelo` y textos ES/EN | `arena/*.js` | L1 |
| `ui-layout.json` (existe) | + `arena.normal` y `arena.baja` (botones táctiles de la arena); después, `combate` (mundo) | `layout-datos.js` | L1, M1 |
| `escenas.json` (existe) | + `duelo-reto` (guion de la entrada) | `escena-amistad.js` | L1 |
| `musica.json` (existe) | + tema `duelo` | `musica.js` | L8 |
| `enemigos-combate.json` | postura, zonas, ataques y fichas de cada monstruo | `enemigos.js` | M3 |
| `jefes.json` | fases, ataques, golpes finales y fogatas | `jefes.js` | M8 |
| `estilo-goliath.json`, `estilo-danzante.json` | como los otros estilos | `combate/estilos.js` | 8·E |

- **Esquemas nuevos** en `estudio/esquemas/`: `combate.schema.json`, `estilo.schema.json` (uno para los 4 estilos), `arena.schema.json`, `enemigos-combate.schema.json`, `jefes.schema.json`. Los de `poses` y `ui-layout` se amplían (solo se añaden claves).
- **`validar`** (reglas nuevas en el CLI):
  - un ataque con fases que no suman o con ventanas fuera de rango;
  - una clave de animación con fase inexistente;
  - un canal fuera de `limites`;
  - un ataque peligroso con menos de 24 c de anticipación;
  - una cancelación a un ataque que no existe;
  - un texto sin su par ES/EN.
- **`resumen`:** `resumen estilo-sekiro tajo1` imprime los cuadros, las ventanas y un dibujo ASCII de la línea de tiempo.

### 25.2 Pestaña **Combate** (nueva, nace en N6)

- **Izquierda:** la lista de estilos y, dentro de cada uno, sus ataques, reacciones y estados (guardia, paso).
- **Centro: línea de tiempo del ataque**, reusando la de Escenas (`estudio/escenas.js`):
  - tres bloques (anticipación, activo, recuperación) que se arrastran y estiran en cuadros;
  - debajo, barras de ventanas de cancelación, i-frames, hyper armor y avance;
  - las claves de cada canal como puntos sobre la línea, ancladas a la fase (se mueven con ella);
  - la curva de un canal se edita como en Poses.
- **Derecha:** un visor 3D con un muñeco que hace el ataque en bucle contra un segundo muñeco que reacciona, en vista de frente, 3/4 o lado, con hoja de cuadros y la medida de la punta del arma.
- **Probar en el juego:** con el puente (`supervivencia.html?estudio`), el mensaje `combate { estilo, ataque }` abre la arena en **modo práctica** con ese ataque en la CPU.
- **Paneles:**
  - **Peso:** hitstop, sacudida, cámara lenta y sonidos, con un botón «oír» por capa.
  - **Reacciones.**
  - **Controles:** perfiles de teclas y umbrales del táctil.
  - **CPU:** pesos por situación y dificultades.

### 25.3 Otras pestañas

- **Poses:** los canales nuevos de §15.5, con sus sliders, rangos y límites editables. La vista suma el **suelo automático** (casilla) y una «medida de pie» que muestra si un pie patina en un gesto.
- **Arena** (nueva, como la pestaña Carrera): peleadores, escenario (colores, paredes, barriles, fogatas, público), rondas, HUD, planos de cámara y premios.
- **Layout:** los botones de la arena y del combate en el mundo, arrastrables (sale de `ui-layout.json`).
- **Textos:** todos los textos nuevos (`arena.json → textos`, nombres de ataques y avisos) aparecen en la pestaña Textos con su par ES/EN.
- **Música:** el tema `duelo`.
- **Vida:** nada nuevo (la pelea del acompañante queda donde está hasta 8·E).
- **No editable aún** (se anota en cada PR si aparece): nada previsto. Si algo no cabe, se agrega el campo o la pestaña (regla del proyecto).

---

## 26. Riesgos (§11) y lo que no se hace ahora

### 26.1 Riesgos y cómo se resuelven

| Riesgo | Solución | Dónde se prueba |
|---|---|---|
| La cámara se mete en los bloques | Arena: la escena es propia y cerrada (no hay riesgo). Mundo: 5 rayos, entra en 2 c y sale lento, distancia mínima, tramado pixel de lo que tapa | `camara-combate.mjs` (500 posiciones reales) |
| Cambiar el rig rompe escenas, gestos, poses, cartas o la pestaña Poses | `pecho`, codo y rodilla en 0 = matrices idénticas; textura por UV sin repintar; rótula invisible en 0 | `rig-articulaciones.mjs` (paridad contra `main`) |
| Latencia con ventanas de pocos cuadros | Cada uno juzga lo que recibe; compresión de la anticipación (tope 40 %); el hitstop esconde el veredicto | `combate-red.mjs` (0 a 300 ms) |
| El táctil hace menos que PC | Un gesto por intención con un solo pulgar; buffer y ventanas +2 c; foco automático; vibración; cada PR trae su táctil | `combate-intenciones.mjs` y la lista «qué mirar» en el celular |
| Rendimiento (partículas, bloques, cámara lenta) | Presupuestos (300 partículas, 8 peleadores con motor), bloques de Goliath como cubos temporales, cámara lenta solo local | `rendimiento.mjs` + medición en Android en M1 |
| El clic de minar choca con el de atacar | El arma de estilo en la mano define la intención | Prueba de intenciones en el mundo (M1) |
| Balance entre estilos | CPU contra CPU: ningún estilo pasa del 60 % | `arena-balance.mjs` |
| **Animaciones raras** (§1) | Formato con fases, inercialización, regla del pie en el aire, límites duros, pruebas de saltos, pies y choques, hoja de cuadros en cada PR, Sonnet como mínimo y Opus revisa | `combate-animacion.mjs` + hojas en el PR |
| El documento se queda corto y el PR inventa | Cada PR parte de su sección. Lo que el PR decida distinto se anota aquí (§14+) y en la bitácora | revisión del PR |

### 26.2 Lo que no se hace ahora (PvP y más)

- **PvP público:** no se hace ahora (§2.4). Lo que haría falta:
  - **red con autoridad o rollback:** «cada uno juzga lo que recibe» supone confianza (un tramposo desvía todo). Haría falta un rollback tipo GGPO (la lógica ya va a paso fijo de 60 Hz y lee intenciones, que es lo que ese sistema necesita) o un servidor que arbitre;
  - **emparejamiento** y una sala pública;
  - **ventanas iguales** en todas las plataformas (o salas separadas para táctil y PC);
  - **balance de los 4 estilos** medido con jugadores, no solo con la CPU.
- **Correr por la pared y armas del escenario** (Urban Reign): 8·E o después.
- **Prótesis y herramientas de Sekiro** (shuriken, gancho, etc.): el dueño pidió el estilo «con todo lo de Sekiro» (§27.6). Entran como ampliación del estilo en 8·E (E9), después de la arena.
- **2 contra 2 en la arena:** 8·E, con la pareja.
- **Mando (gamepad):** **sí, desde el núcleo** (§27.7). Va en N4 (Gamepad API: `combate.json → teclas.mando`, con vibración del mando).

---

## 27. Respuestas del dueño (2026-10-15, PR #132)

1. **Lalo usa Sekiro y Moisés, Urban Reign.**
2. **Se queda la Furia** como está en §17.6.
3. **Ventanas:** lo más cómodo para el de celular. Sus +2 c valen también en la arena de 2 jugadores; «ventanas iguales» viene apagado.
4. **Premio de la arena:** objetos y amistad.
5. **Goliath:** el suelo **cambia de verdad y se repara**, con bloques que vuelan y vuelven (§21).
6. **Sekiro, con todo lo del original:** la patada se queda y el estilo suma después sus herramientas de prótesis (E9).
7. **Mando:** sí, con soporte desde el núcleo (N4).
8. **Tamaño:** se sigue así, con los PRs que hagan falta para que quede bien, ordenado y de calidad. **Prioridad del dueño: ver algo jugable pronto.** Por eso el orden de 8·N y 8·L se ajustó para llegar a una pelea jugable con Sekiro en el 5.º PR (§28).

---

## 28. Partición en PRs

La lista completa, con su prueba, táctil, cooperativo, «qué mirar» y tamaño, está en `mundo/PENDIENTES.md`, bloque 8, que es el que manda. **Orden (prioridad del dueño: algo jugable pronto):** N1 → N3 → N4 → L1 → **L2 (primera pelea jugable: Sekiro contra un Lalo de práctica)** → N5 → L3 → L4 → N2 → N6 → L5 → L6 → N7 → L7 → L8 → **8·M** M1 a M8 → **8·E** E1 a E9. En total son unos 32 PRs, dentro de los 25 a 35 de §13. N2 (Poses) y N6 (pestaña Combate) van después de la primera pelea, pero los valores igual viven en JSON desde N3, así que el dueño los puede editar en el archivo mientras tanto.

**Regla de cada PR del bloque 8:**
- las animaciones las hace **Sonnet como mínimo** y Opus las revisa contra la lista de §1 con la hoja de cuadros;
- trae su táctil jugable;
- dice qué toca del cooperativo (o «no aplica»);
- pasa `node estudio/cli.mjs validar --contra HEAD`, `node mundo/tests/estudio.mjs` y su prueba;
- deja su línea en la bitácora.
