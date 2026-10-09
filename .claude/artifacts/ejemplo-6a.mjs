// EJEMPLO de referencia (ver GUIA.md): arma la página del Artifact del bloque 6a con la fuente, las capturas y los datos incrustados.
// Uso: node ejemplo-6a.mjs <raíz del repo> <datos.json de ejemplo-6a-datos.mjs> <salida.html>. Para otro trabajo, cópialo al
// scratchpad y cambia el contenido; deja tal cual los tokens, el CSS y el orden de las secciones.
import { readFileSync, writeFileSync } from 'node:fs';
const [RAIZ, DATOS, SALIDA] = process.argv.slice(2);
const d = JSON.parse(readFileSync(DATOS, 'utf8'));
const b64 = p => readFileSync(p).toString('base64');
const fuente = b64(`${RAIZ}/font/pixelcraft.ttf`);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PR = 'https://github.com/Venjyy/venjy-page/pull/34';
const N = d.nombres, ORDEN = ['venjy', 'pony', 'salonas', 'lona', 'hadad', 'andy', 'nacho', 'moises', 'lalo', 'boris', 'lucho', 'braulio', 'conejeros'];
const NIV = d.niveles.map(n => n.es);

const capturas = [
    ['hablar-boris-desconocido.jpg', 'Boris con skin de Pony: Desconocido. Te mira y mezcla el hachazo con su animación; los temas bloqueados muestran su requisito.'],
    ['hablar-pony-buen-amigo.jpg', 'Pony tras subir a Buen amigo (regalo, misión y compra): se desbloquea su secreto.'],
    ['hablar-pony-opiniones.jpg', '«¿Qué opinas de...?»: solo aparecen quienes Pony conoce según la tabla. La respuesta va al panel y al globo.'],
    ['hablar-lona-pareja.jpg', 'Lona con skin de Venjy: parte en Íntimo y responde con las variantes de pareja.'],
    ['tienda-precio-de-amigo.jpg', 'Tienda de Pony desde «Hablar»: «Precio de amigo» (yapa: 5 bacalaos por 1 esmeralda en vez de 4).'],
    ['hablar-coop-invitado.jpg', 'Cooperativo (?disp=2): el invitado conversa con Hadad en su pantalla, con su propia amistad.']
].map(([f, t]) => `<figure><img src="data:image/jpeg;base64,${b64(`${RAIZ}/mundo/capturas/6a/${f}`)}" alt="${esc(t)}" loading="lazy"><figcaption>${esc(t)}</figcaption></figure>`).join('\n');

const decisiones = [
    ['La amistad inicial no se guarda: se calcula con tu skin actual más los puntos ganados.', 'La skin dice quién eres, como en las escenas de skin. Cambiar de skin es presentarte como otra persona, y el guardado queda simple y compatible.', false],
    ['Cada nivel de relación de la tabla cae en el nivel de amistad del mismo número; Venjy-Lona (pareja) en Íntimo.', 'La tabla del dueño se lee directo y cumple «Venjy-Lona es nivel 4».', false],
    ['Con skin de Venjy nadie parte bajo Amigo (Hadad, Andy, Nacho y Conejeros son 1 en la tabla).', 'El plan dice «con Venjy partes alto con todos».', true],
    ['Con la skin del mismo personaje (tu clon) partes en Amigo.', 'No está en la tabla; es un punto medio razonable.', true],
    ['Clic derecho abre «Misión» si el amigo tiene «!» o «?»; si no, «Hablar».', 'Que una misión nueva no quede escondida detrás de la charla.', false],
    ['«Hablar» no usa cámara de cine ni velo; «Misión» sigue con su cine como antes.', 'Lo pide el plan: hablar no corta el juego.', false],
    ['Topes por día de juego (10 min), no por día real; hablar suma solo por temas distintos del día.', 'Funciona igual en solitario y en el cooperativo (el anfitrión manda la hora) y no se farmea un botón.', false],
    ['El amigo deja de caminar mientras hablan; la cabeza gira hasta ±1,1 rad y el cuerpo el resto (poco si está sentado).', 'Que te mire sin desarmar su pose sentada; Lona deja su juego con la gata como con cualquier escena.', false],
    ['Descuento 10/20/30 % desde Amigo: precio de 2 o más baja; precio 1 da yapa. Nunca más barato que lo que otro amigo te paga por ese objeto. Trueque sin descuento.', 'Los precios son casi todos de 1 esmeralda: un porcentaje no cambiaría nada. La regla de reventa evita esmeraldas infinitas (lo comprueba la prueba). En ofertas chicas Amigo y Buen amigo dan lo mismo.', true],
    ['Minijuegos: hachas → Boris; pesca → Pony; asado → Hadad, Andy y Nacho. Ganar = «gana», 4+ peces o asado «bien». Rendirse no suma.', 'Son quienes juegan contigo en cada uno.', false],
    ['«Pelear cerca de su zona» = el monstruo muere a menos de 40 bloques del amigo.', 'La zona segura es de 16: dentro no aparecen monstruos.', false],
    ['Vencer un jefe suma +12 con Venjy.', 'Las peleas de jefe son las misiones de Venjy.', false],
    ['Íntimo no desbloquea temas propios (solo el 30 % y, en 6b, el saludo secreto).', 'Ya hay temas por Amigo y Buen amigo; dejo el resto para 6b.', true],
    ['«¿Cómo conociste a Venjy?» usa solo datos de las notas; con Pony, Hadad, Andy, Nacho, Braulio y Conejeros la respuesta es vaga.', 'Son personas reales: no invento cómo se conocieron.', true],
    ['Regalos: solo el objeto favorito, uno al día; si no lo llevas, el panel dice qué le gusta.', 'El plan pide 1 o 2 favoritos por amigo.', true],
    ['Se agregó el gesto «asiente» a los gestos de las escenas.', 'El plan lo nombra y no existía.', false]
];

const revisar = [
    'Todos los textos: la tabla de diálogos de esta página o mundo/DIALOGOS.md (248 frases ES/EN).',
    '«negro» en dos frases de Lucho y Boris (la nota dice que es de cariño): confirmar que va en el juego.',
    '«weón» y «waton klo» en frases de Venjy, Pony y Salonas.',
    'Hadad: interpreté «bromas de papas fritas» como chistes sobre papas fritas.',
    'Cómo conocieron a Venjy Pony, Hadad, Andy, Nacho, Braulio y Conejeros (respuestas vagas a propósito).',
    'Los «secretos» de cada personaje: inventados e inofensivos.',
    'Piso de Venjy en Amigo, tu clon en Amigo, Íntimo sin temas propios.',
    'Los regalos favoritos y los descuentos (en ofertas chicas Amigo y Buen amigo dan lo mismo).',
    'De paso (no se tocó): en escenas-datos.js la frase inglesa de Conejeros dice «she\'s playing today» sobre Salonas.'
];

const puntos = [
    ['Hablar (tema distinto del día)', d.puntos.hablar.p, d.puntos.hablar.tope],
    ['Completar una misión suya (Venjy: vencer un jefe)', d.puntos.mision.p, 'sin tope'],
    ['Regalar su objeto favorito', d.puntos.regalo.p, '1 regalo'],
    ['Jugar su minijuego', d.puntos.minijuego.p, d.puntos.minijuego.tope + ' (con ganar)'],
    ['Ganar su minijuego (extra)', d.puntos.gana.p, 'comparte el tope'],
    ['Comprarle en la tienda', d.puntos.tienda.p, d.puntos.tienda.tope],
    [`Monstruo eliminado a menos de ${d.radioPelea} bloques de él`, d.puntos.pelea.p, d.puntos.pelea.tope]
].map(([a, p, t]) => `<tr><td>${esc(a)}</td><td class="num">+${p}</td><td class="num">${esc(t)}</td></tr>`).join('');

const niveles = d.niveles.map((n, i) => `<tr><td><span class="nv nv${i}">${esc(n.es)}</span> <small>${esc(n.en)}</small></td><td class="num">${n.min}</td><td class="num">${Math.round(d.descuento[i] * 100)} %</td></tr>`).join('');
const favs = ORDEN.map(c => `<tr><td>${esc(N[c])}</td><td>${esc(d.favoritos[c].join(' o '))}</td></tr>`).join('');

// Matriz de amistad inicial: filas = tu skin, columnas = personaje
const bases = ['ninguna', ...ORDEN];
const matriz = `<table class="matriz"><thead><tr><th>Tu skin \\ personaje</th>${ORDEN.map(c => `<th>${esc(N[c])}</th>`).join('')}</tr></thead><tbody>${bases.map(b => `<tr><th>${b === 'ninguna' ? 'Sin base' : esc(N[b])}</th>${ORDEN.map(c => { const n = d.nivelesIniciales[b][c]; return `<td class="nv${n}" title="${esc(NIV[n])} · ${d.inicial[b][c]} pts">${d.inicial[b][c]}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;

const filas = d.filas.map(f => `<tr data-p="${f.c}"><td>${esc(N[f.c])}</td><td>${esc(f.p)}</td><td>${f.req === 'Libre' ? '<span class="libre">Libre</span>' : esc(f.req)}</td><td>${f.skin ? `<span class="skin">${esc(f.skin)}</span>` : ''}</td><td>${esc(f.es)}</td><td>${esc(f.en)}</td></tr>`).join('\n');
const chips = ['todos', ...ORDEN].map(c => `<button type="button" class="chip${c === 'todos' ? ' on' : ''}" data-f="${c}">${c === 'todos' ? 'Todos' : esc(N[c])}</button>`).join('');

const html = `<title>Hablar y amistad 6a</title>
<style>
@font-face { font-family: 'PixelCraft'; src: url(data:font/ttf;base64,${fuente}) format('truetype'); font-display: block; }
/* Mundo único (oscuro, como los paneles del juego): tierra oscura, bordes negros con bisel, amarillo de título. Columna central ~1100px. */
:root {
  --tierra: #1e1812; --panel: #2c2219; --panel2: #382b20; --bisel-claro: #4a3826; --bisel-osc: #0c0704;
  --texto: #f1ece2; --gris: #b3a998; --amarillo: #ffd84a; --verde: #7fdc6f; --rosa: #ef6fae; --cielo: #7dd3ff; --rojo: #ff8a6a;
  --fuente: 'PixelCraft', 'Courier New', monospace;
  color-scheme: dark;
}
html { background: var(--tierra); }
body { background: var(--tierra); color: var(--texto); font-family: var(--fuente); font-size: 15px; line-height: 1.55; margin: 0; padding-inline: 16px; padding-block: 24px 48px; }
main { max-width: 1100px; margin: 0 auto; display: grid; gap: 22px; }
h1, h2, h3 { font-weight: normal; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(1.6rem, 4vw, 2.4rem); color: var(--amarillo); text-shadow: 3px 3px 0 #3f3f15; }
h2 { font-size: 1.35rem; color: var(--amarillo); text-shadow: 2px 2px 0 #3f3f15; }
h3 { font-size: 1.05rem; color: var(--cielo); }
p { margin: 0; max-width: 72ch; }
a { color: var(--cielo); }
a:focus-visible, button:focus-visible { outline: 3px solid var(--amarillo); outline-offset: 2px; }
.bloque { background: var(--panel); border: 4px solid #000; box-shadow: inset 4px 4px 0 var(--bisel-claro), inset -4px -4px 0 var(--bisel-osc); padding: 18px 20px; display: grid; gap: 12px; min-width: 0; }
header.bloque { gap: 10px; }
.meta { color: var(--gris); }
.pr { display: inline-block; background: #3c6a2a; color: var(--texto); text-decoration: none; padding: 8px 14px; border: 3px solid #000; box-shadow: inset -3px -3px 0 #24401a, inset 3px 3px 0 #5f9a45; justify-self: start; }
.pr:hover { background: #4f8a36; }
ul { margin: 0; padding-left: 1.2em; display: grid; gap: 6px; }
li { max-width: 80ch; }
code { color: var(--verde); font-family: var(--fuente); }
.dos { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.tabla { overflow-x: auto; min-width: 0; }
table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 2px solid var(--bisel-osc); }
th { color: var(--gris); font-weight: normal; letter-spacing: 0.03em; background: var(--panel2); position: sticky; top: 0; }
td.num, th.num { text-align: right; white-space: nowrap; }
small { color: var(--gris); }
.nv { padding: 1px 6px; border: 2px solid #000; }
.nv0 { background: #3a3a3a; } .nv1 { background: #4d4030; } .nv2 { background: #2f5a2a; } .nv3 { background: #2b5070; } .nv4 { background: #7a2f58; }
.matriz td { text-align: center; color: var(--texto); border: 2px solid var(--tierra); min-width: 34px; }
.matriz th { white-space: nowrap; }
.decision { display: grid; grid-template-columns: 1fr; gap: 2px; padding: 8px 10px; background: var(--panel2); border-left: 4px solid var(--amarillo); }
.decision.rev { border-left-color: var(--rojo); }
.decision b { font-weight: normal; }
.decision span { color: var(--gris); }
.etq { color: var(--rojo); font-size: 0.85em; }
.medidas td.mejor { color: var(--verde); }
.capturas { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
figure { margin: 0; display: grid; gap: 6px; background: var(--panel2); border: 3px solid #000; padding: 8px; }
figure img { width: 100%; height: auto; image-rendering: pixelated; border: 2px solid #000; }
figcaption { color: var(--gris); font-size: 0.9em; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-family: var(--fuente); font-size: 0.9rem; color: var(--texto); background: #555; border: 3px solid #000; box-shadow: inset -3px -3px 0 #333, inset 3px 3px 0 #777; padding: 4px 10px; cursor: pointer; }
.chip.on { background: var(--amarillo); color: #3f3f15; box-shadow: inset -3px -3px 0 #b39520, inset 3px 3px 0 #fff2a8; }
.dialogos { max-height: 70vh; overflow: auto; border: 3px solid #000; }
.dialogos td:nth-child(5), .dialogos td:nth-child(6) { min-width: 240px; }
.dialogos td:nth-child(1) { color: var(--amarillo); white-space: nowrap; }
.libre { color: var(--gris); }
.skin { color: var(--rosa); }
.cuenta { color: var(--gris); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<main>
<header class="bloque">
  <h1>Bloque 6a · «Hablar» y amistad</h1>
  <p>Supervivencia de Venjy: pestaña «Hablar» en el panel de los 13 personajes y amistad de 0 a 100 entre el jugador y cada uno. PR abierto, sin mergear, esperando tu revisión de los textos.</p>
  <a class="pr" href="${PR}">Ver el PR #34 en GitHub</a>
  <p class="meta">Rama <code>amistad-6a</code> · parte de main (el PR #32 del QR ya estaba mergeado) · 2026-10-09</p>
</header>

<section class="bloque">
  <h2>Qué se hizo</h2>
  <ul>
    <li>Panel de clic derecho: <b>Hablar | Misión | Tienda</b>. Abre en «Misión» si el amigo tiene «!» o «?»; si no, en «Hablar».</li>
    <li>Hablar no corta el juego: sin cámara de cine ni pausa, panel abajo a la izquierda. El amigo deja de caminar, te mira y mezcla gestos (asiente, habla, ríe, se rasca, el hachazo de Boris…) sobre su animación normal. La respuesta sale en el panel y en su globo.</li>
    <li>5 a 8 temas por personaje, con desbloqueos por amistad, misiones, minijuegos y jefes. Los bloqueados se ven como «???» junto a su requisito. «¿Qué opinas de...?» solo lista a quienes conoce según la tabla de relaciones. Hay variantes según tu skin.</li>
    <li>Amistad de 0 a 100 en 5 niveles, con topes por día de juego. La amistad inicial sale de tu skin. Hay regalos favoritos y descuentos en la tienda sin reventa.</li>
    <li>Se guarda en <code>misiones.estado</code>, por jugador: los guardados viejos parten en blanco y en el cooperativo cada perfil lleva su amistad.</li>
    <li>Diálogos cargados con <code>import()</code> la primera vez que abres «Hablar».</li>
  </ul>
  <h3>Archivos</h3>
  <ul>
    <li>Nuevos: <code>mundo/supervivencia/amistad.js</code> (lógica pura), <code>hablar.js</code> (pestaña y gestos), <code>dialogos-datos.js</code> (textos), <code>mundo/tests/amistad.mjs</code>, <code>mundo/DIALOGOS.md</code>, <code>mundo/capturas/6a/</code>.</li>
    <li>Cambios: <code>misiones.js</code>, <code>tienda.js</code>, <code>minijuego.js</code>, <code>minijuegos-datos.js</code>, <code>escenas-skin.js</code>, <code>main.js</code>, <code>supervivencia.css</code>, <code>mundo/PENDIENTES.md</code>, <code>CLAUDE.md</code>.</li>
  </ul>
</section>

<section class="bloque">
  <h2>A revisar por ti</h2>
  <ul>${revisar.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
</section>

<section class="bloque">
  <h2>Decisiones y por qué</h2>
  <p class="meta">En rojo, las marcadas «a revisar por el dueño».</p>
  ${decisiones.map(([q, p, r]) => `<div class="decision${r ? ' rev' : ''}"><b>${esc(q)}${r ? ' <span class="etq">A revisar</span>' : ''}</b><span>${esc(p)}</span></div>`).join('\n  ')}
</section>

<section class="bloque">
  <h2>Amistad</h2>
  <div class="dos">
    <div class="tabla"><h3>Puntos por acción</h3><table><thead><tr><th>Acción</th><th class="num">Puntos</th><th class="num">Tope por día de juego</th></tr></thead><tbody>${puntos}</tbody></table></div>
    <div class="tabla"><h3>Niveles y descuentos</h3><table><thead><tr><th>Nivel</th><th class="num">Desde</th><th class="num">Descuento</th></tr></thead><tbody>${niveles}</tbody></table>
      <p class="meta">Precio de 2 o más esmeraldas: baja. Precio 1: yapa (más unidades). Nunca más barato de lo que otro amigo te paga por el mismo objeto. Sin descuento en el trueque.</p></div>
  </div>
  <div class="dos">
    <div class="tabla"><h3>Regalos favoritos</h3><table><thead><tr><th>Personaje</th><th>Le gusta</th></tr></thead><tbody>${favs}</tbody></table></div>
    <div class="tabla"><h3>Amistad inicial según tu skin</h3>${matriz}<p class="meta">Puntos iniciales. Color = nivel (gris Desconocido, café Conocido, verde Amigo, azul Buen amigo, rosado Íntimo).</p></div>
  </div>
</section>

<section class="bloque">
  <h2>Medidas antes y después</h2>
  <div class="tabla"><table class="medidas"><thead><tr><th></th><th class="num">main</th><th class="num">amistad-6a</th></tr></thead><tbody>
    <tr><td>JS al abrir la página</td><td class="num">87 archivos · 2158 KB</td><td class="num">88 archivos · 2172 KB</td></tr>
    <tr><td>Carga de la página (load)</td><td class="num">1269 ms</td><td class="num">896 ms (ruido)</td></tr>
    <tr><td>Entrar a un mundo nuevo</td><td class="num">586 ms</td><td class="num mejor">516 ms</td></tr>
    <tr><td>Cuadro mediano (p90), de día junto a la fogata</td><td class="num">2,3 ms (2,7)</td><td class="num mejor">2,1 ms (2,5)</td></tr>
    <tr><td>Cuadro mediano con «Hablar» abierto</td><td class="num">—</td><td class="num">2,0 ms (2,4)</td></tr>
    <tr><td>Al abrir «Hablar» la primera vez</td><td class="num">—</td><td class="num">+2 archivos · 67 KB</td></tr>
  </tbody></table></div>
  <p class="meta">Navegador del panel con la pestaña oculta. Como la pestaña no pinta, se usó un reloj de 16 ms en lugar de requestAnimationFrame. 1280×720, servidor local sin caché, worktree de main contra la rama.</p>
</section>

<section class="bloque">
  <h2>Pruebas</h2>
  <ul>
    <li><code>node mundo/tests/amistad.mjs</code>: 2745 comprobaciones OK. Cubre puntos, topes diarios, niveles, amistad inicial por skin, subida de nivel, guardado viejo → nuevo, ida y vuelta por JSON, requisitos, descuentos sin reventa (13 tiendas × 5 niveles), 5-8 temas por personaje, opiniones = tabla de relaciones, variantes de skin solo entre amigos, frases únicas contra todo el juego y sin emojis.</li>
    <li><code>amistad</code>, <code>inventario</code>, <code>paridad</code>, <code>recetas</code>, <code>senal-qr</code> y <code>tienda</code>: OK.</li>
    <li>Navegador: hablé con Hadad, Pony, Boris y Lona (skin de Pony y de Venjy) y recorrí los 13 personajes con todos sus temas y opiniones sin errores.</li>
    <li>Navegador: con Pony comprobé el tope de 3 por día, el regalo (+8 y bloqueo del día), una misión (+12) y una compra (+2). Subió a Buen amigo con aviso, la tienda mostró el precio de amigo y los gestos se soltaron al cerrar.</li>
    <li>Cooperativo con 2 pestañas (<code>?disp=2</code>): el invitado conversa y gana amistad en su pantalla, y el anfitrión guarda su perfil con la amistad sin tocar la suya.</li>
    <li>Sin errores de consola. La única excepción es un primer intento del invitado con la pestaña en segundo plano que no abrió el canal de Supabase, y no tiene que ver con este cambio.</li>
  </ul>
</section>

<section class="bloque">
  <h2>Capturas de la pestaña «Hablar»</h2>
  <div class="capturas">${capturas}</div>
</section>

<section class="bloque">
  <h2>Todos los diálogos</h2>
  <p>${d.filas.length} frases. «Desbloqueo» dice qué hace falta para que el tema aparezca; «Skin» marca la respuesta que cambia cuando tu skin parte de ese personaje. Los saludos salen al abrir «Hablar» y el regalo, al dar su favorito.</p>
  <div class="chips" role="group" aria-label="Filtrar por personaje">${chips}</div>
  <p class="cuenta" id="cuenta">${d.filas.length} frases</p>
  <div class="dialogos tabla"><table><thead><tr><th>Personaje</th><th>Pregunta</th><th>Desbloqueo</th><th>Skin</th><th>ES</th><th>EN</th></tr></thead><tbody id="filas">
${filas}
  </tbody></table></div>
</section>
</main>
<script>
(() => {
  const chips = [...document.querySelectorAll('.chip')], filas = [...document.querySelectorAll('#filas tr')], cuenta = document.getElementById('cuenta');
  function filtrar(f) {
    let n = 0;
    for (const r of filas) { const v = f === 'todos' || r.dataset.p === f; r.hidden = !v; if (v) n++; }
    for (const c of chips) c.classList.toggle('on', c.dataset.f === f);
    cuenta.textContent = n + ' frases';
  }
  for (const c of chips) c.addEventListener('click', () => filtrar(c.dataset.f));
})();
</script>
`;
writeFileSync(SALIDA, html);
console.log(Math.round(html.length / 1024), 'KB');
