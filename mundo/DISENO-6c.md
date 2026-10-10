# Diseño 6c · Bienvenidas, reencuentros y escenas de grupo (APROBADO por el dueño, 2026-10-10)

Guiones, textos ES/EN y reglas aprobados por el dueño, sin cambios en los textos. Es la especificación de 6c-1 y 6c-2.
Al implementar, los textos pasan a los datos y a `mundo/DIALOGOS.md`. Este archivo se borra al cerrar 6c-2.

## 0. Resumen

| Parte | Qué | Cuántas | Se dispara |
|---|---|---|---|
| **Bienvenidas** | el Venjy del Inicio recibe a cada amigo; cada una con un **momento propio en movimiento** | 12 (todas las skins menos Venjy) | sola al acercarte, o al hacerle clic derecho; una vez por partida |
| **Reencuentros** | entre amigos con relación 2 (corto) o 3 (largo, como los de Venjy) | 16 | igual que las bienvenidas, con la regla «uno por lugar» |
| **Grupos** | Tomatitos (fogata), Trío de la atalaya, Los de Coyhaique (iglú); un **momento propio por cada integrante** | 3 grupos, 13 variantes | sola la primera vez que llegas al lugar con skin del grupo; después, botón «Saludo del grupo» en «Hablar» para repetirla |

Reglas para todas:

- **Tu clon es el NPC**: si en la escena está el personaje de tu skin, él actúa como él mismo (habla,
  gesticula, reacciona a que haya dos) y **tú hablas más**: la mayoría de las frases son tuyas.
- **Uno por lugar**: al llegar a un lugar sale una sola escena automática. En la fogata, la atalaya y
  el iglú es la de grupo; las demás de ese lugar (tu clon, los reencuentros y, con skin de Venjy, sus
  conversaciones de siempre) salen la primera vez que le haces clic derecho a cada uno. Así nunca se
  encadenan dos o tres escenas. Excepción: con skin de Venjy el iglú sigue con su escena de siempre
  (automática) y «Los de Coyhaique» queda solo en el botón.
- **El clon en los grupos**: si tu clon ya actuó en la escena de grupo, su escena corta de skin
  («¿un clon mío?») se da por vista, para que no se sorprenda dos veces.
- Los grupos se activan con la skin de **cualquier integrante**: atalaya con Venjy, Boris o Lucho;
  iglú con Venjy, Lalo o Moisés; fogata con cualquiera de los Tomatitos.
- No dan puntos de amistad. Esc o «Saltar» restauran todo (pose, posición de quien se movió,
  objetos, cámara). En el cooperativo, cada uno ve la suya.
- Nada de fumar ni tomar (solo «unas chelitas» una vez, con Boris y Linares). Los recuerdos son
  generales: nada inventado sobre familias, fechas ni notas.

## 1. Moldes y cómo se arma lo único

Los moldes son movimientos completos ya probados o nuevos; lo único de cada escena se arma
**fusionando moldes** (uno en los brazos y otro en el cuerpo, o dos seguidos) más un objeto o un
efecto. Así cada momento se ve nuevo y quedan piezas para escenas futuras.

| Molde | Ya existe | Nuevo |
|---|---|---|
| Choque de puños, abrazo, saludo secreto, abrazo y beso | 6b | |
| Sorpresa, saluda, rasca, risa, baile, espejo, dedo, cabecea, brazosArriba, doble mirada | escenas de skin | |
| `agacha` (baja el cuerpo y se inclina) · `tirita` (brazos cruzados con sacudones) · `frota` (manos en los hombros del otro) · `teclea` (manos abajo-adelante, dedos rápidos) · `maneja` (manos al volante / brazo afuera por la ventana) · `traza` (dibuja en el aire con un dedo) · `barre` (borra con la mano) · `selfie` (brazo estirado con el celular) · `orejitas` (dos dedos tras la cabeza del otro) · `recuerda` (mira arriba, mano al mentón) · `mide` (palma plana sobre la cabeza) · `empujon` (empujoncito al hombro) · `celular` · `brinda` · `ping` (señala lejos) · `lanza` · `cae` (salto desde lo alto y aterrizaje en tres puntos) · `sacude` (se sacude la nieve) | | 18 |

Objetos y efectos nuevos (cajas y sprites píxel, como los de 6b-2): bolsa de papas, celular, tomate
con **bigote elegante** (estilo «cabeza de tomate» de Fortnite: rojo, hojas verdes arriba, bigote
café curvo), tomate gigante (con el mismo bigote), concha, bola de nieve, pico de diamante (ya lo lleva el Venjy de la mina), visto bueno
verde, dibujo en el aire, nube de polvo, flash de foto, sonido de mar y **ping de enemigo** parecido al
de Apex (sintetizado con Web Audio: dos tonos agudos cortos; no se copia el audio original).

## 2. Bienvenidas del Venjy del Inicio (12)

Duración según la relación: 1 → ~14 s (cordial: te agradece por pasarte y te invita a probar todo con
tu skin), 2 → ~16 s, 3 → ~22 s (con saludo secreto, abrazo y recuerdo), pareja → ~20 s.

### Relación 1 · cordiales

**Hadad · «Papas para el camino»** (Venjy saca una bolsa de papas fritas y te la pasa; tú la levantas
con pulgar arriba, pose de comercial)
1. Venjy: ¡Hadad! Qué bueno que te pasaste por el mundo. · *Hadad! So glad you dropped by the world.*
2. Tú: Me dijeron que había fogata y nada de Fortnite, así que vine a ver. · *They told me there was a campfire and no Fortnite, so I came to see.*
3. Venjy: Toma, para el camino. De tu marca, obvio. · *Here, for the road. Your brand, obviously.*
4. Tú: Auspiciado por mí mismo. · *Sponsored by myself.*
5. Venjy: Gracias por venir. Prueba todo con tu skin, hay harto que descubrir. · *Thanks for coming. Try everything with your skin, there's lots to discover.*
6. Tú: Trato hecho. Parto por la fogata. · *Deal. I'll start with the campfire.*

**Andy · «El baile mal hecho»** (Venjy intenta el baile de victoria y le sale chueco; tú se lo
enseñas y terminan bailando sincronizados)
1. Venjy: ¡Andy! Bienvenido. Mira, practiqué tu baile. · *Andy! Welcome. Look, I practiced your dance.*
2. Tú: Eso no es mi baile. Eso es un calambre. · *That's not my dance. That's a cramp.*
3. Venjy: Ya, enséñame bien. · *Okay, teach me properly.*
4. Tú: Brazo, brazo, y la cadera. ¡Eso! · *Arm, arm, and the hips. That's it!*
5. Venjy: Gracias por pasarte. Con tu skin hay cosas que yo ni he probado. · *Thanks for dropping by. With your skin there are things I haven't even tried.*
6. Tú: Entonces aquí también voy a ganar. · *Then I'm going to win here too.*

**Nacho · «Carcajada contagiosa»** (te ríes tan fuerte que te doblas; Venjy se contagia y se doblan
los dos; al final se secan las lágrimas)
1. Venjy: ¡Nacho! Te escuché reír desde el Inicio. · *Nacho! I heard you laughing from the Start.*
2. Tú: Jajaja, ¿tan fuerte? · *Haha, that loud?*
3. Venjy: Hasta los creepers se dieron vuelta. · *Even the creepers turned around.*
4. Tú: Jajaja, ¡no puedo! ¡Los creepers! · *Haha, I can't! The creepers!*
5. Venjy: Gracias por venir. Ojalá lo disfrutes, y prueba todo con tu skin. · *Thanks for coming. I hope you enjoy it, and try everything with your skin.*
6. Tú: Jajaja, voy. Pero primero respiro. · *Haha, I will. But first I need to breathe.*

**Conejeros · «Orejitas de conejo»** (Venjy saca el celular para una foto juntos; tú le pones
orejitas de conejo; flash; Venjy mira la foto)
1. Venjy: ¡Conejeros! Bienvenido. ¿Una foto para el recuerdo? · *Conejeros! Welcome. A photo to remember?*
2. Tú: Obvio. Sonríe, que va a quedar épica. · *Of course. Smile, it's going to be epic.*
3. Venjy: ¿Me pusiste orejas de conejo? · *Did you give me bunny ears?*
4. Tú: Es mi firma, compadre. · *It's my signature, mate.*
5. Venjy: Gracias por pasarte. Hay harto que probar con tu skin, disfrútalo. · *Thanks for dropping by. There's lots to try with your skin, enjoy it.*
6. Tú: Lo voy a dibujar todo. · *I'm going to draw all of it.*

### Relación 2

**Pony · «Puño bajito»** (Venjy te busca con la mano en la frente mirando lejos, mira abajo, se agacha
y chocan puños a tu altura; tú le das un empujoncito)
1. Venjy: ¿Pony? Me dijeron que venías... · *Pony? They told me you were coming...*
2. Tú: Estoy aquí abajo, weón. · *I'm down here, dude.*
3. Venjy: ¡Ahí estás! Puño bajito, para que llegues. · *There you are! Low fist, so you can reach.*
4. Tú: El chico seré yo, pero el weón eres tú. · *I might be the short one, but you're the goof.*
5. Venjy: Gracias por venir, Pony. El muelle te está esperando. · *Thanks for coming, Pony. The pier is waiting for you.*
6. Tú: Si no pica nada, te culpo a ti. · *If nothing bites, I'm blaming you.*

**Moisés · «Frío de Coyhaique»** (Venjy tirita; tú le frotas los hombros; chocan puños)
1. Venjy: ¡Moisés! ¿Sentiste ese viento? Me acordé de Coyhaique. · *Moisés! Did you feel that wind? It reminded me of Coyhaique.*
2. Tú: Esto no es frío, hermano. Frío era a los trece. · *This isn't cold, bro. Cold was when we were thirteen.*
3. Venjy: Tienes razón. Igual frótame un poco. · *You're right. Rub my arms a bit anyway.*
4. Tú: Ya, ya, sobreviviste. · *There, there, you survived.*
5. Venjy: Gracias por venir. Pásate por el iglú: hay un Moisés igualito a ti. · *Thanks for coming. Drop by the igloo: there's a Moisés just like you.*
6. Tú: ¿Otro yo? Eso tengo que verlo. · *Another me? I have to see that.*

**Braulio · «Choque y medio»** (Venjy te toma la mano y cuenta los dedos, se sorprende; chocan las
palmas y salen dos chispas)
1. Venjy: ¡Braulio! A ver esa mano... uno, dos, tres... · *Braulio! Let's see that hand... one, two, three...*
2. Tú: Sigue contando, que viene lo bueno. · *Keep counting, the good part is coming.*
3. Venjy: ¡El dedo doble! Nunca me acostumbro. · *The double finger! I'll never get used to it.*
4. Tú: Choca esos cinco. Bueno, esos seis. · *High five. Well, high six.*
5. Venjy: Gracias por venir. ¿Y de verdad eres de Arica, tan blanquito? · *Thanks for coming. And you're really from Arica, that pale?*
6. Tú: El sol de Arica me respeta, no me quema. · *The Arica sun respects me, it doesn't burn me.*

### Relación 3 · con saludo secreto, abrazo y recuerdo

**Boris · «De copiloto a Linares»** (manejan un auto imaginario: tú al volante, Venjy de copiloto con
el brazo afuera; rebotan en un bache; se bajan, saludo secreto y abrazo; Venjy recuerda)
1. Venjy: ¡Boris! ¿Y el auto? Pensé que venías a buscarme. · *Boris! Where's the car? I thought you came to pick me up.*
2. Tú: Súbete, que este auto no necesita calles. · *Get in, this car doesn't need roads.*
3. Venjy: ¡Cuidado con el bache! Igual que llegando a Linares. · *Watch the pothole! Just like driving into Linares.*
4. Tú: Llegamos. Te extrañaba, compadre. · *We're here. I missed you, mate.*
5. Venjy: ¿Te acuerdas de la última en tu PC? Perdimos por el jungla. · *Remember the last game on your PC? We lost because of the jungler.*
6. Tú: Perdimos por ti. Pero ya, te perdono. · *We lost because of you. But fine, I forgive you.*
7. Venjy: Gracias por venir. Próxima vez en Linares: unas chelitas y revancha. · *Thanks for coming. Next time in Linares: a couple of beers and a rematch.*

**Lalo · «Choque de botas»** (se frotan las manos y soplan, saltitos para el frío, chocan las
zapatillas de lado; saludo secreto y abrazo; Venjy recuerda)
1. Venjy: ¡Lalo! ¿Y el Moisés? Pensé que no salías sin él. · *Lalo! Where's Moisés? I thought you never went out without him.*
2. Tú: Ahya, el Moisés cuida el iglú. Yo vine a verte, hermano. · *Ahya, Moisés is minding the igloo. I came to see you, bro.*
3. Venjy: Como en Coyhaique: saltitos para el frío y choque de botas. · *Like in Coyhaique: little hops for the cold and a boot bump.*
4. Tú: Ahya, nadie más entiende este saludo. · *Ahya, nobody else gets this greeting.*
5. Venjy: Nieve hasta las rodillas, y nosotros felices. · *Snow up to our knees, and we were happy.*
6. Tú: Éramos cabros chicos y creíamos que el frío no existía. · *We were just kids and thought cold didn't exist.*
7. Venjy: Gracias por venir, hermano. En el iglú te espera otro Lalo, con sombrero y todo. · *Thanks for coming, bro. Another Lalo is waiting in the igloo, hat and all.*

**Salonas · «Commit en vivo»** (teclean juntos en un teclado imaginario; aparece un visto bueno
verde sobre ellos; tú tocas un bajo de aire y Venjy cabecea; saludo secreto y abrazo; Venjy recuerda)
1. Venjy: ¡Socio! ¿Vienes a revisar el último commit? · *Partner! Here to review the latest commit?*
2. Tú: Vengo a ver si compila. Con lo tuyo, uno nunca sabe. · *I came to see if it compiles. With your stuff, you never know.*
3. Venjy: Ya, a la cuenta de tres, enter. · *Okay, on three, hit enter.*
4. Tú: ¡Compiló! Esto amerita un solo de bajo. · *It compiled! This calls for a bass solo.*
5. Venjy: ¿Te acuerdas de la primera versión de ProcedimientoSeguro? Un formulario y puro entusiasmo. · *Remember the first version of ProcedimientoSeguro? One form and pure enthusiasm.*
6. Tú: Y mira dónde llegó. Todavía me da orgullo, socio. · *And look how far it got. I'm still proud of it, partner.*
7. Venjy: Gracias por venir. Tú pones el bajo y yo el código. · *Thanks for coming. You bring the bass and I'll bring the code.*

**Lucho · «El árbol de los primos»** (Venjy dibuja en el aire un árbol familiar que se enreda; se
rasca; tú lo borras con la mano; saludo secreto y abrazo; Venjy recuerda)
1. Venjy: ¡Primo! A ver, déjame explicarte el árbol... · *Cousin! Wait, let me explain the family tree...*
2. Tú: Yo soy primo de tu mamá, entonces tú eres... · *I'm your mom's cousin, so you're my...*
3. Venjy: Ya me perdí. · *I'm lost already.*
4. Tú: Primo es primo. Fin del árbol. · *Cousin is cousin. End of the tree.*
5. Venjy: ¿Te acuerdas cuando nos presentaron como primos? Nadie preguntó más. · *Remember when they introduced us as cousins? Nobody asked any more.*
6. Tú: Y desde ahí, primos. Ya no hay vuelta atrás. · *And since then, cousins. No going back now.*
7. Venjy: Gracias por venir. Esta noche, dúo en Apex: tú me revives. · *Thanks for coming. Tonight, Apex duos: you revive me.*

### Pareja

**Lona · «Baile lento»** (Venjy te ofrece la mano y giran despacio un paso de baile; abrazo, beso en
la mejilla y corazones). Con skin de Venjy frente a Lona sigue la conversación que ya existe.
1. Venjy: ¿Amor? ¿Tú también estás en el juego? · *Love? You're in the game too?*
2. Tú: Vine a ver el mundo que tanto me contabas. · *I came to see the world you kept telling me about.*
3. Venjy: Entonces, antes del recorrido, un baile. · *Then, before the tour, a dance.*
4. Tú: Sin música y todo. Eres un tontito. · *Without music and everything. You're such a goof.*
5. Venjy: Te estaba esperando. Ahora sí está completo. · *I was waiting for you. Now it's complete.*
6. Tú: Las gatas se quedaron cuidando la casa... o eso espero. · *The cats stayed home looking after the house... or so I hope.*
7. Venjy: Mila debe estar durmiendo y Gala botando algo. Ya, te muestro todo. · *Mila must be asleep and Gala knocking something over. Okay, let me show you everything.*

## 3. Reencuentros entre amigos (16)

Las frases van por personaje: la misma escena sirve en las dos direcciones (con skin de Pony frente a
Andy dices las de Pony; con skin de Andy frente a Pony, las de Andy).

- **Relación 2 · corto (~11 s)**: sorpresa y saludo · choque de puños · 4 frases · broma con un gesto.
- **Relación 3 · largo (~19 s)**: brazos arriba · saludo secreto · abrazo · recuerdo · risa · 6 frases.

### Relación 2

**Pony - Salonas** (`empujon`)
1. Salonas: ¡Llegó el waton klo! · *Here comes the big goof!*
2. Pony: ¿Waton klo yo? Waton klo tú, compadre. · *Me, a big goof? You're the big goof, mate.*
3. Salonas: Ya, tregua. Puño y seguimos. · *Okay, truce. Fist bump and we move on.*
4. Pony: Tregua hasta la próxima, waton klo. · *Truce until next time, big goof.*

**Pony - Hadad** (`risa`)
1. Hadad: ¡Pony! ¿Quieres papas fritas? Son de la marca que promociono. · *Pony! Want some chips? They're the brand I promote.*
2. Pony: Esa imagen con IA te va a perseguir toda la vida. · *That AI picture is going to follow you forever.*
3. Hadad: Me persigue y me paga. Bueno, no me paga. · *It follows me and pays me. Well, it doesn't pay me.*
4. Pony: Comparte igual, famoso. · *Share anyway, celebrity.*

**Pony - Nacho** (`mide`)
1. Nacho: Jajaja, ¡Pony! ¿Pescaste algo o vienes por carne? · *Haha, Pony! Did you catch anything or are you here for meat?*
2. Pony: Las dos cosas. El pescado me lo comí en el camino. · *Both. I ate the fish on the way.*
3. Nacho: Jajaja, te guardo una chuleta. Chiquita, a tu medida. · *Haha, I'll save you a chop. A little one, your size.*
4. Pony: ¿Tú también, Nacho? Hasta tú. · *You too, Nacho? Even you.*

**Pony - Braulio** (`mide`)
1. Braulio: Pony, ponte aquí. A ver quién es más bajo. · *Pony, stand here. Let's see who's shorter.*
2. Pony: Obvio que tú. Mira, te gano por un pelo. · *You, obviously. Look, I beat you by a hair.*
3. Braulio: Ese pelo está parado, no cuenta. · *That hair is sticking up, it doesn't count.*
4. Pony: Quedamos iguales y nadie se entera. · *We call it even and nobody finds out.*

**Pony - Conejeros** (`empujon`)
1. Conejeros: Ah, llegó mi enemigo favorito. · *Oh, my favorite enemy is here.*
2. Pony: Enemigo y todo, igual te vine a saludar. · *Enemy or not, I still came to say hi.*
3. Conejeros: Te dibujé en mi cuaderno, con una caña más grande que tú. · *I drew you in my notebook, with a rod bigger than you.*
4. Pony: Eso es difamación... pero el dibujo te quedó bueno. · *That's slander... but the drawing turned out good.*

**Salonas - Andy** (`risa`)
1. Andy: ¡Salonas! ¿Cómo va ese bajo? · *Salonas! How's that bass going?*
2. Salonas: Afinado y sonando. ¿Y el Fortnite? · *Tuned and playing. And Fortnite?*
3. Andy: Ganando, a veces. Cuando el Nacho no se tira solo. · *Winning, sometimes. When Nacho doesn't drop in alone.*
4. Salonas: Pásate al escenario un día y te dedico un tema. · *Come by the stage someday and I'll dedicate a song to you.*

**Salonas - Braulio** (`risa`)
1. Braulio: Salonas, te escuché tocar desde la playa. · *Salonas, I heard you playing from the beach.*
2. Salonas: ¿Tan fuerte? Entonces está bien ecualizado. · *That loud? Then it's well mixed.*
3. Braulio: Hasta los peces cabeceaban, te lo juro. · *Even the fish were headbanging, I swear.*
4. Salonas: Ese es mi público objetivo, compadre. · *That's my target audience, mate.*

**Andy - Braulio** (`rasca`)
1. Andy: ¡Braulio! ¿Encontraste algo en la orilla? · *Braulio! Did you find anything on the shore?*
2. Braulio: Una concha, una chala y un cangrejo enojado. · *A shell, a flip-flop and an angry crab.*
3. Andy: Con ese botín ya te alcanza para el pase de batalla. · *With that loot you can afford the battle pass.*
4. Braulio: Y el cangrejo viene como skin exclusiva. · *And the crab comes as an exclusive skin.*

**Braulio - Conejeros** (`risa`)
1. Conejeros: ¡Braulio! Te iba a saludar, pero se me colgó el cerebro. · *Braulio! I was going to say hi, but my brain froze.*
2. Braulio: Tranquilo: Control, Alt, Suprimir y listo. · *Relax: Control, Alt, Delete and done.*
3. Conejeros: Ya, volví. ¿Me perdí de algo? · *Okay, I'm back. Did I miss anything?*
4. Braulio: Por eso yo me quedé en la versión estable. · *That's why I stayed on the stable version.*

### Relación 3

**Pony - Andy**
1. Andy: ¡Pony! ¿Vienes a hacer un trabajo conmigo? Mentira, ya no caigo. · *Pony! Here to do an assignment with me? Just kidding, I won't fall for it.*
2. Pony: Oye, yo era un aporte. Un aporte de risas, pero aporte. · *Hey, I contributed. Laughs, but still a contribution.*
3. Andy: Ven, abrazo. Te perdono todas las entregas a última hora. · *Come here, hug. I forgive you for every last-minute submission.*
4. Pony: ¿Te acuerdas cuando hacíamos los trabajos juntos? Nos reíamos tanto. · *Remember when we did assignments together? We laughed so much.*
5. Andy: Por eso ahora los hago con el Nacho. Pero contigo era más divertido. · *That's why I do them with Nacho now. But it was more fun with you.*
6. Pony: El próximo lo hacemos juntos, palabra de Pony. · *We'll do the next one together, Pony's word.*

**Boris - Lucho**
1. Lucho: ¡Negro! ¿Soltaste el hacha un rato? · *Negro! Did you put the axe down for a bit?*
2. Boris: Por ti, sí. Pero rápido, que la leña no se corta sola. · *For you, yes. But quick, the firewood won't chop itself.*
3. Lucho: Ven, negro. Desde la media que nos aguantamos. · *Come here, negro. We've put up with each other since high school.*
4. Boris: ¿Te acuerdas de la media? Tú con el LoL y yo diciéndote que te acostaras. · *Remember high school? You with LoL and me telling you to go to bed.*
5. Lucho: Algunas cosas no cambian, negro. · *Some things never change, negro.*
6. Boris: Así me gusta. Vamos, que el tronco no espera. · *That's how I like it. Come on, the log won't wait.*

**Moisés - Lalo**
1. Lalo: Ahya, ¡Moisés! Vivimos juntos y igual te extraño. · *Ahya, Moisés! We live together and I still miss you.*
2. Moisés: Te fuiste a buscar leña hace cinco minutos, hermano. · *You went for firewood five minutes ago, bro.*
3. Lalo: Cinco minutos es harto. Ven, abrazo. · *Five minutes is a lot. Come here, hug.*
4. Moisés: ¿Te acuerdas de Coyhaique? Éramos cabros chicos y ya éramos inseparables. · *Remember Coyhaique? We were little kids and already inseparable.*
5. Lalo: Y seguimos igual, solo que ahora pagamos cuentas. · *And we still are, except now we pay bills.*
6. Moisés: Vamos al iglú, que sin ti se siente vacío. · *Let's go to the igloo, it feels empty without you.*

**Salonas - Conejeros**
1. Conejeros: ¡Salonas! Te hice un dibujo. Eres tú, pero con alas. · *Salonas! I made you a drawing. It's you, but with wings.*
2. Salonas: ¿Por qué tengo alas y un bajo de tres cuerdas? · *Why do I have wings and a three-string bass?*
3. Conejeros: Porque el arte no se explica, compadre. Ven, abrazo. · *Because art can't be explained, mate. Come here, hug.*
4. Salonas: ¿Te acuerdas del primer monito que dibujamos juntos? Era horrible. · *Remember the first doodle we drew together? It was awful.*
5. Conejeros: Horrible y perfecto. Todavía lo tengo guardado. · *Awful and perfect. I still have it saved.*
6. Salonas: Hagamos el segundo. Con más alas. · *Let's make the second one. With more wings.*

**Hadad - Andy**
1. Hadad: ¡Andy! ¿Saliste del Discord? Pensé que vivías ahí. · *Andy! You left Discord? I thought you lived there.*
2. Andy: Salí a tomar aire. Cinco minutos y vuelvo, como siempre. · *I came out for some air. Five minutes and I'm back, as always.*
3. Hadad: Abrazo de escuadrón. Falta el Nacho, pero cuenta igual. · *Squad hug. Nacho's missing, but it still counts.*
4. Andy: ¿Te acuerdas de esa partida que ganamos sin construir nada? · *Remember that match we won without building anything?*
5. Hadad: Ni yo me lo creo. Y tú bailando antes de que terminara. · *I still can't believe it. And you dancing before it was over.*
6. Andy: Era seguro. Bueno, casi seguro. · *It was a sure thing. Well, almost sure.*

**Hadad - Nacho**
1. Nacho: Jajaja, ¡Hadad! ¿Me vienes a cobrar las papas fritas? · *Haha, Hadad! Here to charge me for the chips?*
2. Hadad: Vengo a buscarte para el Fortnite. Las papas, después. · *I came to get you for Fortnite. Chips later.*
3. Nacho: Jajaja, ven, abrazo. Tantas horas de Discord no se olvidan. · *Haha, come here, hug. All those Discord hours don't get forgotten.*
4. Hadad: ¿Te acuerdas cuando caíste en Tilted y duraste diez segundos? · *Remember when you dropped into Tilted and lasted ten seconds?*
5. Nacho: Jajaja, nueve. Esa vez fueron nueve. · *Haha, nine. That time it was nine.*
6. Hadad: Esta noche, dúo. Y caemos lejos de Tilted. · *Tonight, duos. And we land far from Tilted.*

**Andy - Nacho**
1. Nacho: Jajaja, ¡Andy! ¿Ya entregamos el trabajo? · *Haha, Andy! Did we hand in the assignment yet?*
2. Andy: Anoche a las tres, en el Discord, entre partida y partida. · *Last night at three, on Discord, between matches.*
3. Nacho: Jajaja, el mejor equipo de la U. Ven, abrazo. · *Haha, the best team at uni. Come here, hug.*
4. Andy: ¿Te acuerdas del primer trabajo juntos? No sabíamos ni por dónde empezar. · *Remember our first assignment together? We didn't even know where to start.*
5. Nacho: Y lo sacamos adelante igual. Jajaja, todavía no sé cómo. · *And we pulled it off anyway. Haha, I still don't know how.*
6. Andy: Así somos: tarde, pero siempre llegamos. · *That's us: late, but we always make it.*

## 4. Escenas de grupo (3 grupos, 13 variantes)

Cada una: **llegada** según tu skin (con tu momento propio) → **parte común** del grupo → **cierre**
tuyo. Duran ~20-24 s. Si el personaje de tu skin está en el lugar, él actúa como él mismo y reacciona
a que haya dos.

### Tomatitos (fogata: Hadad, Andy, Nacho)

Parte común (todos los NPC de la fogata, también tu clon si está):
1. Andy (suena el grupo de WhatsApp y todos miran el celular): ¿Quién mandó doscientos stickers al grupo? · *Who sent two hundred stickers to the group chat?*
2. Nacho: Jajaja, no fui yo. Bueno, sí fui yo. · *Haha, it wasn't me. Okay, it was me.*
3. Hadad (saca tomates para todos): Ya, Tomatitos: tomate en alto. · *Alright, Tomatitos: tomatoes up.*
4. Todos (brindis con tomates y chispas): ¡Por los Tomatitos! · *To the Tomatitos!*

| Tu skin | Momento propio | Llegada | Durante el brindis | Cierre (tú) |
|---|---|---|---|---|
| **Venjy** | pone un **tomate gigante** (bloque) en medio de la fogata | Hadad: ¡Venjy! Por fin sales del código y vienes a la fogata. · *Venjy! You finally leave the code and come to the campfire.* / Tú: Vi el grupo y no podía faltar. · *I saw the group chat and couldn't miss it.* | Tú: Les traje el tomate oficial de los Tomatitos. · *I brought you the official Tomatitos tomato.* / Nacho: Jajaja, ¡es más grande que el Pony! · *Haha, it's bigger than Pony!* | Esto es lo que más me gusta del mundo: ustedes. · *This is what I like most about the world: you guys.* |
| **Pony** | salta para alcanzar los tomates en alto; Andy baja el suyo | Andy: ¡Pony! Siéntate, pero no webees, que estamos tranquilos. · *Pony! Sit down, but no messing around, we're chilling.* / Tú: ¿Yo webear? Si soy un angelito. · *Me, mess around? I'm a little angel.* | Tú: ¡Bajen los tomates, que no alcanzo! · *Lower the tomatoes, I can't reach!* / Andy: Ya, por esta vez. · *Okay, just this once.* | Lo mejor de la U fueron ustedes. No le digan a nadie. · *The best thing about uni was you guys. Don't tell anyone.* |
| **Braulio** | brinda con una **concha** y se la acerca al oído a Nacho: suena el mar | Nacho: Jajaja, ¡Braulio! ¿Trajiste arena de la playa? · *Haha, Braulio! Did you bring sand from the beach?* / Tú: Un poco. Viene incluida conmigo. · *A little. It comes included with me.* | Tú: Yo brindo con esto. Escuchen: se oye el mar. · *I'll toast with this. Listen: you can hear the sea.* / Hadad: Se oye el mar y un cangrejo reclamando. · *You can hear the sea and a crab complaining.* | La próxima fogata la hacemos en la playa. · *Next campfire we do on the beach.* |
| **Conejeros** | le **dibuja una cara** a su tomate en el aire (aparece la carita) | Hadad: ¡Conejeros! ¿Vienes en modo normal o en modo .exe? · *Conejeros! Coming in normal mode or .exe mode?* / Tú: Modo normal. Por ahora. · *Normal mode. For now.* | Tú: Les presento a Tomás. Es un tomate, pero con sentimientos. · *Meet Tomás. He's a tomato, but with feelings.* / Andy: ¿Y ahora cómo brindamos con Tomás? · *And now how do we toast with Tomás?* | Tomás dice que los quiere. Yo también, un poco. · *Tomás says he loves you. Me too, a little.* |
| **Hadad** | **espejo** con su clon (levantan el mismo brazo); Andy y Nacho miran de uno a otro | Hadad (NPC): ¿Y tú quién eres? ¿Por qué tienes mi cara? · *And who are you? Why do you have my face?* / Tú: Lo mismo te pregunto. Levanta el brazo. · *I was going to ask you the same. Raise your arm.* | Nacho: Jajaja, ¡ahora hay dos que promocionan papas! · *Haha, now there are two promoting chips!* / Tú: Uno para cada bolsa. · *One per bag.* | Dos Hadad en la fogata. El grupo no está listo para esto. · *Two Hadads at the campfire. The group isn't ready for this.* |
| **Andy** | **baile en estéreo** con su clon; Hadad y Nacho se ríen | Andy (NPC): ¿Otro Andy? A ver, ¿te sabes el baile? · *Another Andy? Let's see, do you know the dance?* / Tú: Me lo sé mejor que tú. · *I know it better than you.* | Hadad: Dos Andy bailando y ninguno ganó nada. · *Two Andys dancing and neither of them won anything.* / Tú: Todavía. · *Yet.* | Con ustedes hasta perder es divertido. · *With you guys, even losing is fun.* |
| **Nacho** | **risa en estéreo** con su clon, doblados; Andy se tapa los oídos | Nacho (NPC): Jajaja, ¿otro Nacho? · *Haha, another Nacho?* / Tú: Jajaja, eso iba a decir yo. · *Haha, that's what I was going to say.* | Andy: Una risa ya era fuerte. Dos es un concierto. · *One laugh was already loud. Two is a concert.* / Tú: Jajaja, y viene el bis. · *Haha, and here comes the encore.* | Jajaja, los quiero, Tomatitos. Aunque se rían de mi Tilted. · *Haha, love you, Tomatitos. Even if you laugh at my Tilted.* |

### Trío de la atalaya (Lucho, Boris y el Venjy de arriba de la atalaya)

El Venjy que mira desde lo alto de la atalaya grita, **salta y cae con una nube de polvo** en pose de
tres puntos, y se suma. Al terminar (o al saltar la escena) vuelve arriba.

Parte común:
1. Venjy (desde arriba): ¡Esperen! ¡Voy! · *Wait! I'm coming!*
2. Venjy (cae, polvo): ¡Aterrizaje de superhéroe! · *Superhero landing!*
3. Boris: Eso te dolió. · *That hurt.*
4. Venjy: Ni un poquito. Bueno, un poquito. · *Not even a little. Well, a little.*
5. Lucho (ping: señala lejos y todos miran): ¡Ping! Enemigo a la izquierda. · *Ping! Enemy on the left.*
6. Boris: Era una vaca, Lucho. Otra vez. · *It was a cow, Lucho. Again.*
7. Todos (brazos arriba): ¡Trío de la atalaya! · *Watchtower trio!*

| Tu skin | Llegada (antes del salto) | Después del aterrizaje | Cierre (tú) |
|---|---|---|---|
| **Venjy** (el de arriba es tu clon) | Lucho: ¡Primo! Llegaste justo, el negro y yo estábamos armando trío. · *Cousin! Right on time, negro and I were putting a trio together.* / Tú: ¿Trío? Somos tres... ¿y quién es ese de arriba? · *A trio? There are three of us... and who's that up there?* | Tú: Ya, ahora somos cuatro. Uno sobra y no soy yo. · *Okay, now there are four of us. One's extra and it's not me.* | Una partida de cada uno: Apex y LoL. · *One match of each: Apex and LoL.* |
| **Boris** (Boris NPC es tu clon) | Lucho: ¿Boris? ¿Y este otro Boris de dónde salió? · *Boris? And where did this other Boris come from?* / Tú: Vine a jugar con ustedes. El otro corta la leña. · *I came to play with you guys. The other one chops the wood.* / Boris (NPC): Me parece justo. · *Sounds fair to me.* / Tú: Solo nos falta el Venjy para el trío. · *We're only missing Venjy for the trio.* | Tú: Lo invocamos y cayó del cielo. · *We summoned him and he fell from the sky.* | Después a Linares: yo manejo y tú pones la música, Venjy. · *Later to Linares: I drive and you pick the music, Venjy.* |
| **Lucho** (Lucho NPC es tu clon) | Boris: ¿Lucho? Pero si estabas ahí al lado. · *Lucho? But you were right over there.* / Tú: Soy otro Lucho, negro. Vengo a armar trío. · *I'm another Lucho, negro. Here to build a trio.* / Lucho (NPC): Con dos Luchos ya somos trío... ¿o no? · *With two Luchos we're already a trio... or not?* / Tú: Falta el primo. ¡Venjy! · *We're missing cousin. Venjy!* | Tú: Primo, ¿no había escalera? · *Cousin, wasn't there a ladder?* | Esta noche: el primo, el negro y yo. Ranked hasta las cuatro. · *Tonight: cousin, negro and me. Ranked until four.* |

### Los de Coyhaique (iglú: Lalo, Moisés y el Venjy de la mina)

El Venjy que mina diamantes en la mina cercana **llega por el túnel del iglú** con el pico al hombro,
sacudiéndose la nieve. Guerra de nieve: Lalo te tira una bola, tú se la devuelves al sombrero. Al
terminar (o al saltar), el Venjy vuelve a la mina.

Parte común:
1. Venjy (entra con el pico): Vengo de la mina. Ni un diamante, pero llegué. · *I'm coming from the mine. Not one diamond, but I made it.*
2. Moisés: Hermano, ¿te acuerdas de las guerras de nieve en Coyhaique? · *Bro, remember the snowball fights in Coyhaique?*
3. Lalo (te tira una bola de nieve): Ahya, ¡y siempre perdías tú! · *Ahya, and you always lost!*
4. Moisés: En Coyhaique no había reglas, hermano. · *There were no rules in Coyhaique, bro.*
5. Lalo (le devuelves la bola al sombrero): Ahya, ¡me diste en el sombrero! · *Ahya, you hit my hat!*
6. Todos (brazos arriba): ¡Coyhaique, presente! · *Coyhaique, present!*

| Tu skin | Llegada | Al recibir la bola | Cierre (tú) |
|---|---|---|---|
| **Venjy** (solo con el botón; el de la mina es tu clon) | Tú: ¿Otro yo minando? Yo vine directo al iglú. · *Another me mining? I came straight to the igloo.* | Tú: ¡Oye! Eso fue a traición. · *Hey! That was a sneak attack.* | Desde los trece, hermanos. Y todavía perdiendo en la nieve. · *Since thirteen, bros. And still losing in the snow.* |
| **Lalo** (Lalo NPC es tu clon) | Lalo (NPC): Ahya, ¿otro Lalo? Uno de los dos es el original. · *Ahya, another Lalo? One of us is the original.* / Tú: Ahya, el original soy yo, hermano. · *Ahya, I'm the original, bro.* | Tú: ¡Me tiraste a mí mismo! · *You threw it at yourself!* | Ahya, dos Lalos, un Moisés y un Venjy. El iglú quedó chico. · *Ahya, two Lalos, one Moisés and one Venjy. The igloo got too small.* |
| **Moisés** (Moisés NPC es tu clon) | Moisés (NPC): ¿Y tú? Te pareces a mí, pero más abrigado. · *And you? You look like me, but more bundled up.* / Tú: Soy el Moisés de visita. El de la casa eres tú. · *I'm the visiting Moisés. You're the one who lives here.* | Tú: ¡Lalo! ¿A mí? Si vivimos juntos. · *Lalo! Me? We live together.* | Coyhaique en el corazón, hermanos. Y nieve en la cara. · *Coyhaique in our hearts, bros. And snow in our faces.* |

## 5. Técnica y entrega

- **Carga**: datos y gestos en módulos aparte que se cargan con `import()` solo al usarse:
  `bienvenidas/<clave>.js` (uno por amigo, como `momentos/`), `reencuentros.js` y `grupos/<grupo>.js`.
  La detección (cerca, relación, lugar de grupo, «uno por lugar») va en `escenas-skin.js` con
  `relacion()` de `amistad.js`, que ya se carga al inicio: la carga inicial sube ~2 KB.
- **Motor** (`escena-amistad.js`): frases por personaje (no por papel), clon como actor, actores extra
  que **se mueven** durante la escena (el Venjy que cae de la atalaya, el que llega desde la mina) y
  vuelven a su sitio al terminar o al saltar, moldes fusionados (`fusion(a, b)`: brazos de uno, cuerpo
  del otro).
- **Pruebas** (`mundo/tests/amistad.mjs`): 12 bienvenidas; reencuentro exactamente para cada pareja con
  relación 2-3 (y largo solo en 3); grupos solo con sus miembros y una variante por skin del grupo;
  frases únicas contra todo el juego, sin emojis, dentro de la duración y sin pisarse; gestos que existen
  y dentro de los rangos de `rig.md`; quien se movió vuelve a su sitio.
- **`/amistad`**: `/amistad bienvenidas`, `/amistad reencuentros`, `/amistad grupos`, `/amistad
  pony-andy`, `/amistad tomatitos-braulio`, etc.
- **Medición** antes y después (carga, entrar al mundo, cuadro mediano y durante una escena de grupo),
  mismo método de 6a/6b. Capturas en `mundo/capturas/6c/`.
- **PR** (es grande: ~260 frases y 31 guiones):
  - **6c-1** bienvenidas (12) + reencuentros (16) + motor. Este chat.
  - **6c-2** escenas de grupo (3 grupos, 13 variantes). Propongo un chat dedicado: los actores que se
    mueven y la cámara con 4-5 personas son la parte más delicada.
- **Modelos**: el orquestador hace el motor, los guiones, la cámara y revisa capturas; Haiku arma los
  moldes nuevos, las fusiones y los objetos (en tandas de 4 bienvenidas); Sonnet si Haiku se atasca
  (§0 de la skill), probablemente en los grupos.
