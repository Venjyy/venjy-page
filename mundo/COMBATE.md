# Combate nuevo · Bloque 8

Estado (2026-10-15): **encargo anotado y ubicado en la hoja de ruta; el diseño todavía no se hace.** Este archivo tiene dos partes:

1. **Encargo del dueño** (§1 a §8): lo que pidió, con las decisiones que ya tomó. No se vuelven a preguntar.
2. **Dónde entra** (§9): en qué punto del portafolio, del Estudio y del juego comercial va cada parte.

El diseño completo (§10 en adelante) lo escribe el **chat de diseño** (Opus, effort alto, solo docs), que también divide el bloque 8 en PRs en `mundo/PENDIENTES.md`.

---

## 1. Meta (manda sobre todo lo demás)

- El combate actual es el de Minecraft: monótono, se gana spameando clic. Se reemplaza y pasa a ser **el diferenciador del juego**.
- Meta de sensación: que el jugador diga «es literal el combate de Sekiro en Minecraft, pero adaptado y mejor», y lo mismo con cada estilo («es como X juego»). En el juego comercial, que lo único parecido a Minecraft sean los bloques.
- Fluido, pulido y con peso real; nada tosco. Animaciones únicas por estilo.
- El dueño sabe que esto alarga el desarrollo varios meses y lo quiere igual.
- Gemini propuso más ideas que el dueño no pegó todavía: el chat de diseño le pregunta al final si quiere compartirlas.

## 2. Decisiones ya tomadas

1. **Reemplaza el combate de Minecraft.** Construir y minar se quedan como están. Si convivieran los dos, la gente usaría el de Minecraft por comodidad. Falta definir cómo convive con construir (p. ej.: clic sobre un bloque mina, clic con un enemigo en foco ataca; el modo combate se activa con un botón y quizás solo, con un enemigo cerca).
2. **Táctil desde la base.** El combate no lee teclas: lee **intenciones** (atacar, ataque fuerte o cargado, dirección del ataque, esquivar o dash en una dirección, parry/desvío, guardia, agarre, especial, modo especial, cambiar foco, saltar). PC y táctil traducen a esas intenciones. Cada estilo se pule primero en PC, pero **cada PR trae su versión táctil jugable**. Ideas: buffer más generoso, deslizar para esquivar, foco automático, botones contextuales por estilo y situación, ventanas de parry por plataforma. Los botones van en `mundo/datos/ui-layout.json`.
3. **Cooperativo desde la base** (hasta 8, WebRTC en estrella con el anfitrión). Autoridad: cada jugador juzga los golpes que **recibe** (su parry, esquiva e i-frames se deciden en su equipo, sin lag); el dueño del monstruo valida los golpes que recibe el monstruo (como hoy y como el mensaje `g` del acompañante); el anfitrión simula a los jefes. Los demás ven animaciones, foco y efectos por la red. Medir el tamaño de los mensajes nuevos. **En el juego comercial no hay Supabase**: el diseño no puede depender de él.
4. **Sin PvP por ahora.** Se verá con los 4 estilos listos. Diseñar sin cerrarle la puerta y anotar lo que haría falta como «no se hace ahora».

## 3. Base común (antes que cualquier estilo)

### 3.1 Modo combate y cámara
- Botón para entrar al modo combate: **tercera persona dinámica** (resorte, inercia, se adelanta al movimiento, se acerca en los remates), no el F5 estático de Minecraft.
- La cámara se mete en los bloques: rayo desde el jugador que la acerca, suavizado, transparencia de lo que tape. Es lo más delicado de la base.
- **Lock-on** con marca visible (estilo Devil May Cry): cambiar y soltar el foco, varios enemigos, foco fuera de la vista.
- Reusar lo que sirva de `supervivencia/camaras.js` (planos de cine).

### 3.2 Peso de los golpes
- Hitstop (más en golpes fuertes), cámara lenta breve en remates y parries perfectos, sacudida según la fuerza, empuje y retroceso, partículas, destellos, sonido por capas, reacción visible del enemigo (se dobla, retrocede, cae).
- Todo con valores en datos.

### 3.3 Datos de cada ataque (como un juego de pelea)
- Por ataque: startup, cuadros activos, recuperación, ventanas de cancelación (a qué y desde qué cuadro), daño, daño a postura o zona, empuje, hitstop, i-frames, hyper armor y reacción que causa.
- En `mundo/datos/combate.json` (o uno por estilo), esquema en `estudio/esquemas/` y **pestaña nueva del Estudio** con la línea de tiempo de cada golpe (bloques que se arrastran y estiran, como Escenas) y «Probar en el juego».
- Máquina de estados del jugador (quieto, moviéndose, atacando por fases, recuperando, esquivando, aturdido, derribado, agarrando o agarrado…) y buffer de entrada.

### 3.4 Rig con codos y rodillas
- Hoy `criaturas/cuerpo.js` tiene cuerpo, torso, cuello, cabeza, brazoD/I y piernaD/I, sin codos ni rodillas.
- Agregar **codos y rodillas** (brazo + antebrazo, muslo + canilla). **Sin manos ni muñecas**: a esta escala de cajas no se notan; el arma va pegada al final del antebrazo (justificarlo en el diseño).
- **Compatibilidad obligatoria:** con codo y rodilla en 0 todo se ve exactamente igual que hoy. No romper escenas, gestos, poses (`poses.json`, `moldes.js`), la pestaña Poses ni las cartas. Plan de migración y prueba que lo mida.
- Monstruos y jefes también necesitan ataques con aviso: definir si usan este rig o el suyo.

### 3.5 Enemigos con aviso (sin esto ningún estilo funciona)
- Hoy solo persiguen y pegan. Necesitan anticipación visible (telegraph), estados, patrones, postura o zonas según el estilo, reacciones (stagger, knockback, derribo, aturdimiento) y **fichas de ataque** (no atacan todos a la vez, como Batman Arkham).

### 3.6 Elegir y cambiar de estilo
- Cada estilo va con su tipo de arma (katana; puños; espadón, martillo o hacha pesada; dagas o guadaña ligera). Definir cómo se elige (arma en la mano, menú, maestro, misiones) y cómo encaja con inventario, recetas y progresión.

## 4. Estilo 1 · «Sekiro» (katana)
- Desvío con timing (perfecto o normal), **barra de postura** en jugador y enemigo (al romperla, golpe mortal con animación), esquiva, ataques con peligro que no se desvían (barridos que se saltan, estocadas que se contrarrestan), chispas y sonido metálico, ritmo de duelo.
- **Primer estilo completo**: valida toda la base (parry, postura, hitstop, cámara, aviso, red).

## 5. Estilo 2 · «Urban Reign» (beat 'em up 3D, Namco, PS2, 2005)
**Investigar el original en la web antes de diseñar.** Lo que sigue lo propuso Gemini y tiene errores probables:
- El reversal del original parece que se hacía **acertando la altura** del golpe (alto o bajo) con timing; lo de «esquivar hacia la dirección opuesta» parece inventado. Verificar.
- El daño por zonas (cabeza, cuerpo, piernas, con silueta en pantalla) sí era real.
- No es seguro que «Spark» existiera con ese nombre; la barra de especiales sí. Verificar.
- Pilar poco conocido: **pelear en pareja dándole órdenes al compañero**. Calza con el acompañante del 7i (`acompanante-pelea.js`, `acompanante.js`): combos en pareja, órdenes de ataque, agarres de a dos.

Propuesta de Gemini (respetar la intención, corregir lo que no calce):
1. **Ataques en 3 alturas**: alto (W + clic, más daño, stagger corto), medio (A/D o neutro + clic, knockback), bajo (S + clic, derriba).
2. **Esquiva y contraataque, sin bloqueo**: esquiva activa con tecla dedicada; en el cuadro exacto el golpe se cancela y quedas detrás o al lado.
3. **Daño por zonas** ocultas (cabeza, cuerpo, piernas): varios impactos seguidos en una zona la rompen. Cabeza rota: aturdido 3 s. Cuerpo roto: daño doble. Piernas rotas: −70 % de velocidad hasta curarse.
4. **Agarre** (F o clic derecho con la mano vacía) y **remate en el suelo** (enemigo derribado, mirar abajo y clic).
5. **Barra de especiales**: especial al 25 % (giro de área con i-frames); modo potenciado al 100 % (10 s, rompe defensa, inmune al stagger, ataques 50 % más rápidos).
6. **Flujo**: cancelar los cuadros finales de un golpe que conecta; esquiva neutra (agacharse) que evita los altos y deja listo un bajo; **rebote en paredes** de bloques (aturde 1 s).

Resolver choques con PC (W/S también mueven, clic también mina) y cómo se hace todo en táctil.

## 6. Estilo 3 · «Goliath impenetrable» (Monster Hunter / Dark Souls)
- Posicionamiento, peso, daño masivo y destrucción del entorno. Espadón, martillo o hacha pesada.
- **Hyper armor** al cargar: no te interrumpen, pero recibes el daño.
- **Ataque cargado**: mantener y soltar; contra el suelo hace onda de choque y rompe visualmente los bloques de la superficie, que **se restauran**. En el cooperativo los bloques vuelven en todos y nunca rompe construcciones de verdad.
- **Sin rueda**: guardia que bloquea el 80 %; bloquear un pesado en el último instante desestabiliza al enemigo y abre un golpe crítico lento.

## 7. Estilo 4 · «Danzante de las sombras» (Devil May Cry)
- Movilidad aérea, combos largos y control de estilo. Dagas duales o guadaña ligera.
- **Juggles**: lanzar al enemigo y combo suspendido en el aire.
- **Dash de sombra**: atraviesa al enemigo y te deja en su espalda.
- **Rango de estilo** en el HUD (D a SSS): sube al variar y no recibir daño; da más velocidad y efectos (estelas).

## 8. Jefes y arena (sentido Dark Souls)
- Arena propia por jefe, con fases, animaciones, patrones con aviso y música.
- **Entrada con gracia**: una animación o viaje claro, no un teletransporte pelado (como la pista de la carrera de gatas, pero más clara; ver `carrera.js`, `escenario`).
- Reusar lo que sirva de `jefes.js`. Barra de vida, cambio de fase con escena corta, muerte y reintento, cooperativo (el anfitrión simula; entran todos o los cercanos).
- Regla del proyecto: las peleas especiales son juegos completos, no mecánica pelada.

**Riesgos que el diseño debe resolver:** cámara en los bloques; cambiar el rig sin romper nada; latencia con ventanas de pocos cuadros; táctil a la par de PC; rendimiento (partículas, bloques que vuelven, ¿cámara lenta solo local?); clic de minar contra clic de atacar; balance entre estilos pensando en un PvP futuro.

---

## 9. Dónde entra (decidido en el chat de planificación, 2026-10-15; el dueño lo confirma en el PR)

El combate completo son **meses** (estimación gruesa: 25 a 35 PRs). El portafolio está a pocos puntos de terminar. Por eso se parte en tres:

| Parte | Qué | Dónde entra | Por qué |
|---|---|---|---|
| **8·0 Diseño** | Este documento completo (§10+) y el bloque 8 dividido en PRs | **Ya**, al fusionar el 7i (PR #129). Chat solo de docs | Cambia cómo se hace Lalo vs Moisés y el orden comercial: hay que saberlo antes de seguir |
| **8·N Núcleo** | Rig con codos y rodillas compatible · datos de cada ataque, máquina de estados, intenciones PC y táctil, hitstop y peso · pestaña Combate del Estudio | **Portafolio, Etapa A5, antes de Lalo vs Moisés** | Si Lalo vs Moisés se hiciera antes, se programaría una base que después se bota. El rig nuevo también tiene que estar antes de la Etapa B, para que las escenas y gestos que se pasan al Estudio ya tengan codos y rodillas |
| **8·L Lalo vs Moisés = laboratorio de estilos** (pedido del dueño 2026-10-15) | El minijuego estilo Mortal Kombat se juega **con los estilos nuevos**: sale con **Sekiro y Urban Reign** (uno por peleador); Goliath y Danzante se suman al plantel cuando se hagan. Arena propia con entrada animada, rival de la CPU con aviso, 1 o 2 jugadores | **Portafolio, Etapa A5** (reemplaza el punto «Lalo vs Moisés») | Cámara de lado fija = sin el problema de la cámara en los bloques; 1 contra 1 = se pulen timing, postura, hitstop, peso, animaciones y táctil sin grupos de enemigos. Sekiro (duelo), Urban Reign (alturas, reversal, zonas) y Danzante (juggles) calzan con un juego de pelea; Goliath calza menos (área y destrucción), por eso va después. El modo de 2 jugadores es un PvP controlado entre amigos: mide el balance antes del PvP de verdad. Estimación: 8 a 10 PRs con el núcleo |
| **8·M Mundo abierto** | Modo combate en la supervivencia, cámara en tercera persona con lock-on, enemigos con aviso y fichas, red de combate en grupo, los estilos ya pulidos en la arena llevados al mundo, primer jefe con arena | **Comercial, fase C1**, después del prototipo de empaquetado (fase 1) y la limpieza legal (fase 2) | Es lo que reemplaza el combate de Minecraft: en el portafolio (`portafolio-v1`) queda el de siempre fuera de la arena. La fase 1 mide el rendimiento en Android antes de gastar partículas y cámara lenta. Hereda animaciones y datos de 8·L |
| **8·E Estilos y jefes** | Urban Reign en pareja con el acompañante · Goliath (con la destrucción de bloques) · Danzante · más jefes · PvP público (después) | **Comercial**: la pareja con el acompañante junto a la fase 4 (personajes); Goliath, Danzante y más jefes durante o después del Acceso anticipado (cada uno entra también al plantel de la arena) | Las facciones (4b) pelean con la IA con aviso de 8·M. En 1 contra 1 «cada uno juzga lo que recibe» basta entre amigos; un PvP público pide otra red |

Consecuencias en el Estudio:
- La pestaña **Combate** nace en 8·N y reutiliza la línea de tiempo de Escenas. El motor genérico de la Etapa B3 la tiene en cuenta (no hay que pasarla después: nace editable).
- La pestaña **Poses** suma los canales de codo y rodilla en 8·N, antes de B2 (pasar escenas y gestos).

Preguntas para el dueño (en el PR):
1. En el portafolio, ¿el combate nuevo vive **solo en la arena de Lalo vs Moisés** (el mundo abierto sigue con el de Minecraft en `portafolio-v1`)? La otra opción es meter 8·M en el portafolio, que lo retrasa varios meses.
2. ¿Lalo vs Moisés sale con 2 estilos (Sekiro y Urban Reign) o esperas los 4? Con 4 el portafolio se atrasa unos 6 a 8 PRs más.
3. Idea a validar en el diseño: **cada uno de los 4 bastiones de la Fragmentación enseña un estilo** (un maestro por bastión). Así elegir estilo es parte de la historia y de la reputación con las facciones.
