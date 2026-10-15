// =========================================================
// VENJY · Estudio · pestaña Vida: cómo caminan los amigos cuando dejan su sitio (6d etapa 2)
// Edita mundo/datos/navegacion.json: `caminar` (buscar camino sobre el terreno y seguirlo, mundo/navegacion.js) y
// `paseo` (animación, volver al sitio, visitas; mundo/supervivencia/paseos-datos.js). Comparte pantalla con el
// juego: «Probar» manda a una persona a un destino (mensaje `caminar`) y cada número va en vivo (mensaje `datos`).
// Los valores que muestra son los reales (código + JSON). Guardar escribe con If-Match, como Formas.
// Sección Rutinas: edita mundo/datos/rutinas.json (visitas por horario: quién, a quién o adónde, de qué hora a qué
// hora, gesto y frase al llegar y al recibir; ajustes; horarios, lugares y textos del panel de cada amigo).
// «Probar ahora» hace esa visita en el juego sin mirar la hora (mensaje `rutina`). Guardar escribe los dos archivos.
// Acompañantes (7i): `seguir` de navegacion.json (cómo te sigue: distancia, rastro, esperar, aparecer; mundo/seguir.js),
// `ajustes.nivelAcompanar` y `acompanar` de rutinas.json (botones y frases); «Que me acompañe» / «Soltarlo» lo prueban.
// =========================================================
import { NAV_BASE } from '../mundo/navegacion.js';
import { PASEO_BASE } from '../mundo/supervivencia/paseos-datos.js';
import { SEGUIR_BASE } from '../mundo/seguir.js';
import { PELEA_BASE } from '../mundo/supervivencia/acompanante-pelea.js';
import { RUTINA_BASE, AUSENTE_BASE, INCLUIR_BASE, ACOMPANAR_BASE } from '../mundo/supervivencia/rutinas-datos.js';
import { TEXTOS_RUTINA, horasDeViaje } from '../mundo/supervivencia/rutinas.js';
import { HORARIOS, LUGARES } from '../mundo/supervivencia/horarios-datos.js';

const clonar = o => JSON.parse(JSON.stringify(o));
// [es, en, min, max, paso] de cada campo (los textos largos están en el esquema)
const CAMINAR = {
    velocidad: ['velocidad (bloques/s)', 'speed (blocks/s)', 0.5, 6, 0.1],
    subida: ['sube de un paso (bloques)', 'steps up (blocks)', 0, 2, 1],
    caida: ['se deja caer (bloques)', 'drops down (blocks)', 1, 6, 1],
    alto: ['alto libre que necesita (bloques)', 'free height needed (blocks)', 1, 3, 1],
    costoSubida: ['costo de subir (más = rodea cerros)', 'climb cost (more = goes around hills)', 0, 5, 0.1],
    costoBajada: ['costo de bajar', 'drop cost', 0, 5, 0.05],
    costoAgua: ['costo de pisar agua bajita (0 = nunca)', 'shallow water cost (0 = never)', 0, 30, 1],
    codicia: ['codicia (1 = camino más corto; más = busca más rápido)', 'greed (1 = shortest path; more = faster search)', 1, 3, 0.05],
    nodosPorCuadro: ['nodos de búsqueda por cuadro (rendimiento)', 'search nodes per frame (performance)', 100, 10000, 100],
    nodosMax: ['tope de nodos por búsqueda', 'node cap per search', 5000, 1000000, 5000],
    llegada: ['llegó a menos de (bloques)', 'arrived within (blocks)', 0.5, 6, 0.1],
    aceptable: ['camino parcial: también llegó a menos de (bloques)', 'partial path: also arrived within (blocks)', 1, 16, 0.5],
    radioPisable: ['destino que no se pisa: busca al lado hasta (bloques)', 'unwalkable target: look nearby up to (blocks)', 0, 32, 1],
    atasco: ['atascado: busca de nuevo tras (s)', 'stuck: search again after (s)', 0.5, 10, 0.5],
    reintentos: ['reintentos antes de rendirse', 'retries before giving up', 0, 10, 1],
    avanceReintentos: ['si avanzó (bloques), los reintentos vuelven a 0', 'if it advanced (blocks), retries reset', 1, 64, 1],
    saltoLejos: ['lejos: un salto cada (s)', 'far away: one jump every (s)', 0.2, 5, 0.1],
    rapidezLejos: ['lejos (nadie lo ve): camina más rápido (×)', 'far away (unseen): walks faster (×)', 1, 10, 0.5],
    radioDetalle: ['camina mirando bloques a menos de (bloques)', 'walks checking blocks within (blocks)', 16, 160, 4],
    pisarHojas: ['pisa hojas y vallas (0 = las rodea, 1 = camina por encima)', 'steps on leaves and fences (0 = goes around, 1 = walks on top)', 0, 1, 1],
    giro: ['rapidez de giro', 'turn speed', 1, 20, 0.5],
    suavizado: ['suavizado del camino (puntos)', 'path smoothing (points)', 1, 64, 1]
};
const PASEO = {
    amplitud: ['balanceo al caminar', 'walk swing', 0, 1.2, 0.05],
    acomodar: ['se acomoda en su sitio en (s)', 'settles into place in (s)', 0, 3, 0.1],
    reintento: ['sin camino y a la vista: reintenta cada (s, luego el doble)', 'no path and in view: retry every (s, then double)', 1, 20, 0.5],
    reintentosVista: ['reintentos a la vista antes de quedarse', 'retries in view before staying', 0, 6, 1],
    distanciaVisita: ['distancia a quien visita (bloques)', 'distance to the friend visited (blocks)', 1, 5, 0.1],
    seguirCada: ['yendo a ver a alguien: mira si se movió cada (s)', 'going to see someone: checks if they moved every (s)', 0.2, 10, 0.1],
    seguirDistancia: ['… y si se movió más de (bloques), lo sigue', '… and if they moved more than (blocks), follows', 1, 32, 0.5],
    mirarJugador: ['de pie, te mira a menos de (bloques)', 'standing, looks at you within (blocks)', 0, 16, 0.5]
};
const SEGUIR = {
    distancia: ['se queda a esta distancia de ti (bloques)', 'stays this far from you (blocks)', 1, 8, 0.25],
    holgura: ['quieto: no parte hasta que te alejes esto más (bloques)', 'standing: waits until you move this much further (blocks)', 0, 6, 0.25],
    rapidezMax: ['si se queda atrás, camina hasta (× velocidad)', 'if left behind, walks up to (× speed)', 1, 3, 0.05],
    alcanzar: ['… a esa rapidez cuando va atrás (bloques)', '… at that speed when behind by (blocks)', 1, 24, 0.5],
    miga: ['guarda por dónde pisaste cada (bloques)', 'records where you stepped every (blocks)', 0.25, 2, 0.05],
    migas: ['cuántas pisadas guarda', 'how many steps it keeps', 20, 1000, 10],
    corte: ['tu rastro se corta si saltas más de (bloques)', 'your trail breaks if you jump more than (blocks)', 1, 10, 0.5],
    subidaRastro: ['… o subes de golpe más de (bloques)', '… or climb at once more than (blocks)', 1, 4, 0.5],
    caidaRastro: ['… o bajas de golpe más de (bloques)', '… or drop at once more than (blocks)', 1, 12, 0.5],
    atasco: ['sin poder andar por tu rastro, busca camino tras (s)', 'unable to walk your trail, finds a path after (s)', 0.5, 10, 0.5],
    buscarCada: ['buscando camino: corrige hacia ti cada (s)', 'finding a path: re-aims at you every (s)', 0.5, 10, 0.5],
    radioEspera: ['más lejos que esto (o sin camino): «¡Espérame!» y espera (bloques)', 'further than this (or no path): «Wait for me!» and waits (blocks)', 8, 80, 1],
    retomar: ['esperando, te sigue de nuevo a menos de (bloques)', 'waiting, follows again within (blocks)', 4, 60, 1],
    reintento: ['esperando sin camino, lo intenta de nuevo cada (s)', 'waiting with no path, retries every (s)', 1, 30, 0.5],
    radioAparecer: ['más lejos que esto y sin que lo veas: aparece detrás de ti (bloques)', 'further than this and out of sight: appears behind you (blocks)', 16, 160, 1],
    detras: ['… a esto detrás de ti (bloques)', '… this far behind you (blocks)', 2, 16, 0.5],
    anguloVista: ['no lo ves más allá de (grados a cada lado)', 'you cannot see it beyond (degrees each side)', 30, 120, 1],
    torreAltura: ['si estás esto o más por encima de él (te subiste a un pilar)… (bloques)', 'if you are this much or more above them (you pillared up)… (blocks)', 1.5, 8, 0.5],
    torreCerca: ['… a menos de esto en horizontal (bloques)…', '… within this horizontally (blocks)…', 1, 8, 0.5],
    torreEspera: ['… durante esto (s): arma su propia torre al lado de la tuya', '… for this long (s): builds their own tower next to yours', 0, 10, 0.5],
    torreCada: ['subiendo su torre: un bloque cada esto (s)', 'going up their tower: one block every (s)', 0.15, 3, 0.05],
    torreBajar: ['bajando: rompe un bloque cada esto (s)', 'going down: breaks one block every (s)', 0.15, 3, 0.05],
    torreRomper: ['si le pusieron un bloque encima, lo rompe en esto (s)', 'if someone put a block above them, breaks it in (s)', 0.15, 5, 0.05],
    torreBloques: ['bloques de tierra en su mochila la primera vez que te acompaña (0 = no arma torres hasta que le des)', 'dirt blocks in their backpack the first time they come with you (0 = none until you give some)', 0, 64, 1],
    puenteLargo: ['si tu rastro cruza un hueco o agua de hasta esto, arma un puente (bloques; 0 = nunca)', 'if your trail crosses a gap or water up to this long, builds a bridge (blocks; 0 = never)', 0, 24, 1],
    puenteCada: ['armando el puente: un bloque cada esto (s)', 'building the bridge: one block every (s)', 0.1, 3, 0.05],
    puenteQuitar: ['quita el puente cuando estás a más de esto y no lo ves (bloques)', 'removes the bridge when you are further than this and cannot see it (blocks)', 0, 64, 1],
    desatasco: ['esperando sin camino (encerrado, en un hoyo): tras esto rompe o pone un bloque para salir (s)', 'waiting with no path (boxed in, in a hole): after this breaks or places a block to get out (s)', 0.5, 20, 0.5],
    desatascoMax: ['… como mucho esta cantidad de bloques (0 = nunca; luego espera o aparece detrás de ti)', '… at most this many blocks (0 = never; then waits or appears behind you)', 0, 20, 1]
};
// Peleas del acompañante (navegacion.json → pelea, 7i PR 2)
const PELEA = {
    radio: ['pelea con monstruos a menos de esto de ti (con «Espérame aquí», de él) (bloques)', 'fights monsters within this of you (with «Wait here», of them) (blocks)', 1, 24, 0.5],
    alcance: ['les pega desde esto (bloques, de centro a centro)', 'hits them from (blocks, center to center)', 1, 4, 0.1],
    dano: ['daño por golpe (espada de piedra: 5)', 'damage per hit (stone sword: 5)', 0, 20, 0.5],
    cadencia: ['un golpe cada esto (s) (espada: 0,625)', 'one hit every (s) (sword: 0.625)', 0.2, 3, 0.025],
    empuje: ['cuánto empuja el golpe (el del jugador sin correr: 0,45)', 'knockback of the hit (the player walking: 0.45)', 0, 1, 0.05],
    repensar: ['persiguiendo: corrige hacia el monstruo cada esto (s)', 'chasing: re-aims at the monster every (s)', 0.1, 3, 0.1],
    rendirse: ['sin poder llegar a un monstruo durante esto (s), lo deja', 'unable to reach a monster for this long (s), gives up', 1, 20, 0.5],
    creepers: ['1 = también pelea con creepers (0: como los lobos, no se les acerca)', '1 = also fights creepers (0: like wolves, keeps away)', 0, 1, 1],
    aguante: ['aguante (como la vida del jugador): los monstruos pegados a él se lo gastan', 'stamina (like the player’s health)', 1, 100, 1],
    apretado: ['un monstruo a menos de esto le gasta el aguante (su daño por segundo) (bloques)', 'a monster within this drains their stamina (its damage per second) (blocks)', 0.5, 4, 0.1],
    recupera: ['sin monstruos cerca recupera esto de aguante por segundo', 'with no monsters near, recovers this much stamina per second', 0, 10, 0.1],
    descanso: ['sin aguante («perdería») se sienta esto (s) y vuelve con todo', 'out of stamina, sits down for (s) and comes back full', 1, 60, 0.5]
};
const RUTINA = {
    revisar: ['mira la hora cada (s)', 'checks the time every (s)', 0.1, 5, 0.1],
    gesto: ['el gesto al llegar dura (s)', 'arrival gesture lasts (s)', 0.5, 10, 0.1],
    frase: ['cada globo del saludo dura (s)', 'each greeting bubble lasts (s)', 1, 12, 0.5],
    respuesta: ['quien recibe contesta tras (s)', 'the host answers after (s)', 0, 8, 0.1],
    girar: ['quien recibe gira la cabeza en (s)', 'the host turns their head in (s)', 0.1, 3, 0.1],
    cuello: ['quien recibe gira el cuello hasta (rad)', 'the host turns their neck up to (rad)', 0.2, 1.6, 0.05],
    radioEncuentro: ['al llegar, lo encuentra a menos de (bloques)', 'on arrival, finds them within (blocks)', 2, 40, 0.5],
    acercarse: ['… si no está, intenta acercarse de nuevo (veces)', '… if not there, tries to get closer again (times)', 0, 6, 1],
    esperaAusente: ['si no está, reacciona durante (s)', 'if not there, reacts for (s)', 0, 20, 0.5],
    radioSaludo: ['el saludo se ve a menos de (bloques)', 'greeting shows within (blocks)', 4, 80, 1],
    saludoLejos: ['lejos el saludo pasa igual (1 sí, 0 no)', 'far away the greeting still happens (1 yes, 0 no)', 0, 1, 1],
    anticipar: ['sale antes según la distancia (1 = llega a la hora; 0 = sale a la hora)', 'leaves early by distance (1 = arrives on time; 0 = leaves on time)', 0, 1.5, 0.05],
    rodeo: ['el camino es más largo que la recta (×)', 'the path is longer than a straight line (×)', 1, 3, 0.05],
    segundosHora: ['segundos de juego por hora del reloj', 'game seconds per clock hour', 5, 120, 1],
    nivelIncluir: ['te saluda al pasar desde el nivel de amistad (3 Buen amigo, 5 = nunca)', 'greets you in passing from friendship level (3 Good friend, 5 = never)', 0, 5, 1],
    radioIncluir: ['… a menos de (bloques)', '… within (blocks)', 2, 24, 0.5],
    esperaIncluir: ['… y no repite antes de (s)', '… and does not repeat before (s)', 5, 600, 5],
    nivelAcompanar: ['te acompaña desde el nivel de amistad (3 Buen amigo, 5 = nunca)', 'comes with you from friendship level (3 Good friend, 5 = never)', 0, 5, 1],
    mochila: ['casillas de la mochila de quien te acompaña', 'backpack slots of whoever comes with you', 9, 27, 9]
};
// Frases de los acompañantes (rutinas.json → acompanar); los gestos van aparte
const FRASES_ACOMPANAR = [['boton', 'botón para invitarlo', 'button to invite'], ['soltar', 'botón para despedirlo', 'button to let go'], ['acepta', 'acepta', 'accepts'],
    ['corta', 'acepta e iba a ver a {quien}', 'accepts while going to see {quien}'], ['despide', 'se despide ({lugar} = su sitio)', 'says goodbye ({lugar} = their spot)'],
    ['cambia', 'otro toma su lugar ({quien})', 'someone else takes over ({quien})'], ['espera', 'te alejaste: espera', 'you went too far: waits'],
    ['ocupado', 'acompaña a otro jugador ({quien})', 'with another player ({quien})'], ['ahoraNo', 'no puede ahora', 'cannot right now'],
    ['lugar', 'su minijuego, mientras te acompaña ({lugar}, {quien})', 'their minigame while with you ({lugar}, {quien})'],
    ['ordenSigue', 'botón: orden básica (te sigue y decide solo)', 'button: basic order (follows, decides alone)'], ['ordenQuieto', 'botón: espérame aquí', 'button: wait here'],
    ['ordenTranquilo', 'botón: no pelees', 'button: don\'t fight'], ['diceSigue', 'contesta a «Sígueme»', 'answers «Follow me»'],
    ['diceQuieto', 'contesta a «Espérame aquí»', 'answers «Wait here»'], ['diceTranquilo', 'contesta a «No pelees»', 'answers «Don\'t fight»'],
    ['cansado', 'sin aguante: se sienta', 'out of stamina: sits down'], ['listo', 'terminó de descansar', 'done resting'],
    ['sinBloques', 'su torre o puente: sin bloques', 'their tower or bridge: out of blocks'],
    ['mochila', 'botón: su mochila', 'button: their backpack'], ['tituloMochila', 'título de su mochila ({quien})', 'backpack title ({quien})'],
    ['abreMochila', 'al abrir su mochila', 'when opening their backpack']];
const TEXTOS_PANEL = { yendo: ['yendo a ver a alguien', 'going to see someone'], yendoLugar: ['yendo a un lugar', 'going to a place'], visitando: ['de visita donde alguien', 'visiting someone'], visitandoLugar: ['de visita en un lugar', 'visiting a place'], volviendo: ['volviendo', 'heading back'], acompanando: ['acompañándote', 'keeping you company'], acompanandoOtro: ['acompañando a otro jugador ({quien})', 'with another player ({quien})'] };
const hhmm = h => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
// Destinos fijos de la prueba (además de las personas y los lugares de posiciones.json)
const DESTINOS = [['aqui', 'junto a mí', 'next to me'], ['sitio', 'su sitio (vuelve)', 'their spot (go back)']];
const LUGARES_EXTRA = ['molino', 'portal']; // lugares del mapa sin nadie (posiciones.json no los nombra)

export async function montarVida(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('vi-campos'), msg = $('vi-mensaje'), btnGuardar = $('vi-guardar');
    const selPersona = $('vi-persona'), selDestino = $('vi-destino');
    let personas = [], lugares = [], gestos = [];
    // Los dos archivos de la pestaña: navegacion.json (caminar y paseo) y rutinas.json (visitas por horario)
    const A = { navegacion: { etag: null, original: null, datos: null }, rutinas: { etag: null, original: null, datos: null } };
    async function leer(nombre) {
        const r = await fetch(`../mundo/datos/${nombre}.json`, { cache: 'no-cache' });
        if (!r.ok) throw new Error(String(r.status));
        A[nombre].etag = r.headers.get('ETag'); A[nombre].original = normalizar(nombre, JSON.parse(await r.text())); A[nombre].datos = clonar(A[nombre].original);
    }
    // Partes vacías que la pantalla espera (también en la copia original, para no marcar cambios que no hay)
    function normalizar(nombre, o) {
        const partes = nombre === 'navegacion' ? ['caminar', 'paseo', 'seguir'] : ['ajustes', 'visitas', 'horarios', 'lugares', 'textos'];
        for (const k of partes) o[k] = o[k] || {};
        return o;
    }
    try { await leer('navegacion'); } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/navegacion.json'; return; }
    try { await leer('rutinas'); } catch (e) { A.rutinas.original = normalizar('rutinas', { version: 1 }); A.rutinas.datos = clonar(A.rutinas.original); }
    try {
        const pos = await (await fetch('../mundo/datos/posiciones.json', { cache: 'no-cache' })).json();
        personas = Object.keys(pos.personas || {});
        lugares = [...new Set([...Object.values(pos.personas || {}).map(p => p.ancla).filter(Boolean), ...LUGARES_EXTRA])];
    } catch (e) { /* sin posiciones: la prueba queda sin lista */ }
    const nav = () => A.navegacion.datos, rut = () => A.rutinas.datos;
    const sucioDe = n => JSON.stringify(A[n].datos) !== JSON.stringify(A[n].original);
    const sucio = () => sucioDe('navegacion') || sucioDe('rutinas');
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = (nombre = 'navegacion') => {
        ctx.puente.enviarDatos(nombre, A[nombre].datos);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    };
    // Nombres de gestos para sugerir (los mismos que entiende moldes.js en el juego)
    (async () => {
        try {
            const [{ GESTOS }, { MOLDES }, { GESTOS_AMISTAD }] = await Promise.all([
                import('../mundo/supervivencia/escenas-skin.js'), import('../mundo/supervivencia/moldes.js'), import('../mundo/supervivencia/escena-amistad-datos.js')
            ]);
            gestos = [...new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES)])].sort();
            const dl = $('vi-gestos') || Object.assign(document.createElement('datalist'), { id: 'vi-gestos' });
            dl.textContent = '';
            for (const g of gestos) dl.appendChild(new Option(g, g));
            if (!dl.isConnected) document.body.appendChild(dl);
        } catch (e) { console.warn('[estudio] sin lista de gestos', e); }
    })();

    function numero(etiqueta, valor, min, max, paso, poner) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = valor;
        const n = document.createElement('input'); n.type = 'number'; n.min = min; n.max = max; n.step = paso; n.value = valor; n.style.width = '6em';
        const fijar = v => { if (!Number.isFinite(v)) return; v = Math.min(max, Math.max(min, v)); rg.value = v; n.value = v; poner(v); };
        rg.addEventListener('input', () => fijar(Number(rg.value)));
        n.addEventListener('change', () => fijar(Number(n.value)));
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        fila.append(s, d);
        return fila;
    }
    function textoCampo(etiqueta, valor, poner, opciones = {}) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const i = document.createElement('input'); i.type = 'text'; i.value = valor || ''; i.placeholder = opciones.placeholder || '';
        if (opciones.lista) i.setAttribute('list', opciones.lista);
        i.addEventListener('change', () => poner(i.value.trim()));
        fila.append(s, i);
        return fila;
    }
    function selector(etiqueta, valor, opciones, poner) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const sel = document.createElement('select');
        for (const [v, txt] of opciones) sel.appendChild(new Option(txt, v));
        sel.value = valor || '';
        sel.addEventListener('change', () => poner(sel.value));
        fila.append(s, sel);
        return fila;
    }
    const seccion = (titulo, abierta = true, dentro = caja) => {
        const sec = document.createElement('details'); sec.className = 'panel'; sec.open = abierta;
        const h = document.createElement('summary'); h.textContent = titulo;
        sec.appendChild(h);
        dentro.appendChild(sec);
        return sec;
    };
    const boton = (es, en, f) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'boton chico secundario'; b.textContent = t(es, en);
        b.addEventListener('click', f);
        return b;
    };
    function grupo(titulo, archivo, parte, campos, base, abierta = true) {
        const sec = seccion(titulo, abierta);
        const d = () => A[archivo].datos[parte];
        for (const [k, [es, en, min, max, paso]] of Object.entries(campos)) {
            const v = Number.isFinite(d()[k]) ? d()[k] : base[k];
            const fila = numero(t(es, en) + (k in d() ? ' *' : ''), v, min, max, paso, x => { d()[k] = x; cambio(archivo); });
            sec.appendChild(fila);
        }
        sec.appendChild(boton('Volver a los valores del código', 'Back to the code values', () => { A[archivo].datos[parte] = {}; cambio(archivo); pintar(); }));
    }
    function llenarPrueba() {
        const p = selPersona.value, d = selDestino.value;
        selPersona.textContent = ''; selDestino.textContent = '';
        for (const c of personas) selPersona.appendChild(new Option(c, c));
        for (const [c, es, en] of DESTINOS) selDestino.appendChild(new Option(t(es, en), c));
        for (const l of lugares) selDestino.appendChild(new Option(t('lugar: ', 'place: ') + l, l));
        for (const c of personas) selDestino.appendChild(new Option(t('visitar a ', 'visit ') + c, c));
        if (p) selPersona.value = p;
        if (d) selDestino.value = d;
    }

    // ---- Rutinas: una tarjeta por visita ----
    const ajustesRut = () => ({ ...RUTINA_BASE, ...rut().ajustes });
    function frase(etq, o, poner) {
        // Texto con su par ES/EN (los dos obligatorios: si falta uno, se copia el otro)
        const f = document.createElement('div'); f.className = 'fila-botones';
        const lab = document.createElement('span'); lab.textContent = etq;
        const mk = (lengua, ph) => {
            const i = document.createElement('input'); i.type = 'text'; i.placeholder = ph; i.value = (o && o[lengua]) || ''; i.style.flex = '1';
            i.addEventListener('change', () => {
                const es = f.querySelector('[data-l=es]').value.trim(), en = f.querySelector('[data-l=en]').value.trim();
                poner(es || en ? { es: es || en, en: en || es } : null);
            });
            i.dataset.l = lengua;
            return i;
        };
        f.append(lab, mk('es', 'español'), mk('en', 'English'));
        return f;
    }
    function accion(sec, titulo, v, parte) {
        const o = v[parte] || {};
        const poner = (k, x) => { v[parte] = { ...(v[parte] || {}) }; if (x === null || x === '') delete v[parte][k]; else v[parte][k] = x; if (!Object.keys(v[parte]).length) delete v[parte]; cambio('rutinas'); };
        sec.appendChild(textoCampo(t(`${titulo}: gesto`, `${titulo}: gesture`), o.gesto, x => poner('gesto', x), { lista: 'vi-gestos', placeholder: t('saluda, asiente, risa…', 'saluda, asiente, risa…') }));
        sec.appendChild(frase(t(`${titulo}: frase`, `${titulo}: line`), o.texto, x => poner('texto', x)));
    }
    async function rutina(accionR, visita) {
        try {
            const r = await ctx.puente.enviar('rutina', { accion: accionR, visita });
            const e = (r && r.rutina) || {};
            rotular(`${visita}: ${e.estado || '?'}${e.paseo && Number.isFinite(e.paseo.restante) ? ` · faltan ${e.paseo.restante} bloques` : ''}`,
                `${visita}: ${e.estado || '?'}${e.paseo && Number.isFinite(e.paseo.restante) ? ` · ${e.paseo.restante} blocks left` : ''}`, 'ok');
        } catch (err) { rotular(err.message, err.message, 'error'); }
    }
    function tarjetaVisita(dentro, clave) {
        const v = rut().visitas[clave];
        const destino = v.visita ? `→ ${v.visita}` : v.lugar ? `→ ${v.lugar}` : '';
        const sec = seccion(`${clave} · ${v.quien} ${destino} · ${hhmm(v.de)}-${hhmm(v.a)}${v.activa === false ? t(' (apagada)', ' (off)') : ''}`, false, dentro);
        const poner = (k, x) => { if (x === null || x === '' || x === undefined) delete v[k]; else v[k] = x; cambio('rutinas'); };
        const gente = personas.map(c => [c, c]);
        sec.appendChild(selector(t('quién sale', 'who leaves'), v.quien, gente, x => { poner('quien', x); pintar(); }));
        sec.appendChild(selector(t('a ver a', 'to see'), v.visita || '', [['', t('— nadie (va a un lugar)', '— nobody (goes to a place)')], ...gente.filter(([c]) => c !== v.quien)], x => { poner('visita', x || null); if (x) delete v.lugar; cambio('rutinas'); pintar(); }));
        if (!v.visita) sec.appendChild(selector(t('lugar', 'place'), v.lugar || '', [['', '—'], ...lugares.map(l => [l, l])], x => { poner('lugar', x || null); pintar(); }));
        const horas = document.createElement('p'); horas.className = 'mensaje';
        // Cuánto antes sale: 100 bloques en línea recta ≈ horasDeViaje(100) con los ajustes y la rapidez de ahora
        const pintarHoras = () => {
            const h100 = horasDeViaje(100, ajustesRut(), { ...NAV_BASE, ...nav().caminar });
            horas.textContent = t(`Está allá de ${hhmm(v.de)} a ${hhmm(v.a)}; sale antes según la distancia (~${hhmm(h100)} h de camino por cada 100 bloques).`,
                `There from ${hhmm(v.de)} to ${hhmm(v.a)}; leaves early by distance (~${hhmm(h100)} h of walking per 100 blocks).`);
        };
        sec.appendChild(numero(t('llega a las (hora, 13.5 = 13:30)', 'arrives at (hour, 13.5 = 13:30)'), v.de, 0, 24, 0.25, x => { v.de = x; cambio('rutinas'); pintarHoras(); }));
        sec.appendChild(numero(t('se va a las', 'leaves at'), v.a, 0, 24, 0.25, x => { v.a = x; cambio('rutinas'); pintarHoras(); }));
        sec.appendChild(horas); pintarHoras();
        const act = document.createElement('label'); act.className = 'campo';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = v.activa !== false;
        cb.addEventListener('change', () => { if (cb.checked) delete v.activa; else v.activa = false; cambio('rutinas'); });
        const sp = document.createElement('span'); sp.textContent = t('activa (la hace cada día)', 'active (does it every day)');
        act.append(cb, sp); sec.appendChild(act);
        accion(sec, t('Al llegar', 'On arrival'), v, 'llegada');
        if (v.visita) accion(sec, t('Quien recibe', 'The host'), v, 'respuesta');
        if (v.visita) accion(sec, t('Si no está (vacío = lo general)', 'If not there (empty = general)'), v, 'ausente');
        sec.appendChild(textoCampo(t('nota', 'note'), v.nota, x => poner('nota', x || null)));
        const f = document.createElement('div'); f.className = 'fila-botones';
        f.append(
            boton('Probar ahora en el juego', 'Try it now in the game', () => rutina('probar', clave)),
            boton('Cortar y volver', 'Stop and go back', () => rutina('cortar', clave)),
            boton('Quitar esta visita', 'Remove this visit', () => { if (confirm(t(`¿Quitar la visita «${clave}»?`, `Remove the visit "${clave}"?`))) { delete rut().visitas[clave]; cambio('rutinas'); pintar(); } })
        );
        sec.appendChild(f);
    }
    function nuevaVisita() {
        const quien = selPersona.value || personas[0];
        if (!quien) return;
        const otro = personas.find(c => c !== quien) || null;
        let clave = `${quien}-${otro || 'paseo'}`, i = 2;
        while (rut().visitas[clave]) clave = `${quien}-${otro || 'paseo'}-${i++}`;
        rut().visitas[clave] = { quien, ...(otro ? { visita: otro } : { lugar: lugares[0] }), de: 12, a: 14 };
        cambio('rutinas'); pintar();
        rotular(`Nueva visita «${clave}»: ábrela abajo para elegir a quién y cuándo.`, `New visit "${clave}": open it below to choose who and when.`, 'ok');
    }
    function pintarRutinas() {
        const sec = seccion(t('Rutinas: visitas por horario', 'Routines: scheduled visits'));
        const p = document.createElement('p'); p.className = 'mensaje';
        p.textContent = t('Con la hora del mundo, quien sale camina a ver a otra persona (o a un lugar), saluda al llegar, se queda hasta la hora de irse y vuelve. Sale antes según la distancia. Si a quien visita no está en su sitio, espera. «Probar ahora» la hace ya sin mirar la hora.',
            'With the world clock, who leaves walks to see someone (or a place), greets on arrival, stays until leaving time and goes back. Leaves early by distance. If the host is not home, waits. «Try it now» does it right away regardless of the time.');
        sec.appendChild(p);
        for (const clave of Object.keys(rut().visitas)) tarjetaVisita(sec, clave);
        sec.appendChild(boton('Nueva visita (de la persona elegida arriba)', 'New visit (for the person chosen above)', nuevaVisita));
        grupo(t('Rutinas: ajustes', 'Routines: settings'), 'rutinas', 'ajustes', RUTINA, RUTINA_BASE, false);
        // Lo que hacen si no encuentran a quien venían a ver (todas las visitas; cada una puede tener lo suyo)
        const sa = seccion(t('Rutinas: si no encuentra a quien visita ({quien})', 'Routines: if the host is not there ({quien})'), false);
        const gen = { ausente: rut().ausente || {} };
        const fijarGen = () => { if (Object.keys(gen.ausente || {}).length) rut().ausente = gen.ausente; else delete rut().ausente; cambio('rutinas'); };
        sa.appendChild(textoCampo(t('gesto', 'gesture'), (rut().ausente || {}).gesto || '', x => { gen.ausente = { ...(rut().ausente || {}) }; if (x) gen.ausente.gesto = x; else delete gen.ausente.gesto; fijarGen(); }, { lista: 'vi-gestos', placeholder: AUSENTE_BASE.gesto }));
        sa.appendChild(frase(t('frase', 'line'), (rut().ausente || {}).texto || AUSENTE_BASE.texto, x => { gen.ausente = { ...(rut().ausente || {}) }; if (x) gen.ausente.texto = x; else delete gen.ausente.texto; fijarGen(); }));
        // Te incluyen: lo que dice al pasar junto al jugador con amistad alta (nivel, radio y espera en los ajustes)
        const si = seccion(t('Rutinas: te saludan al pasar ({quien})', 'Routines: they greet you in passing ({quien})'), false);
        const fijarInc = (k, x) => { const o = { ...(rut().incluir || {}) }; if (x) o[k] = x; else delete o[k]; if (Object.keys(o).length) rut().incluir = o; else delete rut().incluir; cambio('rutinas'); };
        si.appendChild(textoCampo(t('gesto', 'gesture'), (rut().incluir || {}).gesto || '', x => fijarInc('gesto', x), { lista: 'vi-gestos', placeholder: INCLUIR_BASE.gesto }));
        for (const [k, es, en] of [['yendo', 'yendo a ver a alguien', 'going to see someone'], ['visitando', 'de visita', 'visiting'], ['volviendo', 'de vuelta', 'heading back'], ['paseo', 'visita a un lugar', 'visiting a place']])
            si.appendChild(frase(t(es, en), (rut().incluir || {})[k] || INCLUIR_BASE[k], x => fijarInc(k, x)));
        // Acompañantes (7i): botones de «Hablar» y lo que dice (nivel en los ajustes; cómo te sigue, abajo en «Te acompaña»)
        const sc = seccion(t('Rutinas: te acompaña (botones y frases)', 'Routines: comes with you (buttons and lines)'), false);
        const fijarAc = (k, x) => { const o = { ...(rut().acompanar || {}) }; if (x) o[k] = x; else delete o[k]; if (Object.keys(o).length) rut().acompanar = o; else delete rut().acompanar; cambio('rutinas'); };
        for (const [k, es, en] of FRASES_ACOMPANAR) sc.appendChild(frase(t(es, en), (rut().acompanar || {})[k] || ACOMPANAR_BASE[k], x => fijarAc(k, x)));
        for (const [k, es, en] of [['gestoAcepta', 'gesto al aceptar', 'gesture on accepting'], ['gestoDespide', 'gesto al despedirse', 'gesture on goodbye']])
            sc.appendChild(textoCampo(t(es, en), (rut().acompanar || {})[k] || '', x => fijarAc(k, x), { lista: 'vi-gestos', placeholder: ACOMPANAR_BASE[k] }));
        // Horarios y nombres de lugar del panel de cada amigo
        const sh = seccion(t('Rutinas: horario de cada amigo (su panel)', 'Routines: each friend’s schedule (their panel)'), false);
        for (const c of personas) {
            const h = rut().horarios[c] || {}, b = HORARIOS[c] || { de: 8, a: 18 };
            const pon = (k, x) => { rut().horarios[c] = { ...(rut().horarios[c] || {}), [k]: x }; cambio('rutinas'); };
            const f = document.createElement('div'); f.className = 'fila-botones';
            const lab = document.createElement('span'); lab.textContent = c; lab.style.minWidth = '7em';
            const mk = (k, def) => { const i = document.createElement('input'); i.type = 'number'; i.min = 0; i.max = 24; i.step = 0.25; i.value = Number.isFinite(h[k]) ? h[k] : def; i.style.width = '5em'; i.addEventListener('change', () => { const x = Number(i.value); if (Number.isFinite(x) && x >= 0 && x <= 24) pon(k, x); }); return i; };
            f.append(lab, mk('de', b.de), document.createTextNode('–'), mk('a', b.a));
            sh.appendChild(f);
        }
        const sl = seccion(t('Rutinas: nombres de lugar del panel', 'Routines: place names in the panel'), false);
        for (const l of [...new Set([...Object.keys(LUGARES), ...Object.keys(rut().lugares)])]) {
            sl.appendChild(frase(l, rut().lugares[l] || LUGARES[l], x => { if (x) rut().lugares[l] = x; else delete rut().lugares[l]; cambio('rutinas'); }));
        }
        const st = seccion(t('Rutinas: líneas del panel ({quien}, {lugar})', 'Routines: panel lines ({quien}, {lugar})'), false);
        for (const [k, [es, en]] of Object.entries(TEXTOS_PANEL)) {
            st.appendChild(frase(t(es, en), rut().textos[k] || TEXTOS_RUTINA[k], x => { if (x) rut().textos[k] = x; else delete rut().textos[k]; cambio('rutinas'); }));
        }
    }

    function pintar() {
        caja.textContent = '';
        llenarPrueba();
        pintarRutinas();
        grupo(t('Buscar camino y caminar', 'Pathfinding and walking'), 'navegacion', 'caminar', CAMINAR, NAV_BASE);
        grupo(t('Paseos de los amigos', 'Friends’ walks'), 'navegacion', 'paseo', PASEO, PASEO_BASE);
        grupo(t('Te acompaña: cómo te sigue', 'Comes with you: how they follow'), 'navegacion', 'seguir', SEGUIR, SEGUIR_BASE, false);
        grupo(t('Te acompaña: cómo pelea', 'Comes with you: how they fight'), 'navegacion', 'pelea', PELEA, PELEA_BASE, false);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    const ESTADOS = {
        'en-sitio': ['en su sitio', 'at their spot'], buscando: ['buscando camino', 'finding a path'], caminando: ['caminando', 'walking'],
        alla: ['llegó', 'arrived'], volviendo: ['volviendo', 'going back'], acomodando: ['acomodándose', 'settling in'],
        'sin-camino': ['sin camino', 'no path'], quieto: ['de pie', 'standing'], atascado: ['se quedó corto (lo intenta de nuevo)', 'stuck short (will retry)']
    };
    async function caminar(destino) {
        const persona = selPersona.value;
        if (!persona) return;
        try {
            const r = await ctx.puente.enviar('caminar', { persona, destino });
            const e = (r && r.paseo) || {};
            const nombre = ESTADOS[e.estado] ? t(...ESTADOS[e.estado]) : e.estado || '?';
            const resto = Number.isFinite(e.restante) ? t(` · faltan ${e.restante} bloques`, ` · ${e.restante} blocks left`) : '';
            rotular(`${persona}: ${nombre}${resto}`, `${persona}: ${nombre}${resto}`, 'ok');
        } catch (err) { rotular(err.message, err.message, 'error'); }
    }
    async function guardarUno(nombre) {
        const a = A[nombre];
        const resp = await fetch(`../api/datos/${nombre}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': a.etag || '*' }, body: JSON.stringify(a.datos) });
        const j = await resp.json().catch(() => ({}));
        if (resp.ok) { a.original = clonar(a.datos); a.etag = j.etag; return [`${nombre}.json (${j.bytes} B)`, null]; }
        if (resp.status === 412) return [null, t(`${nombre}.json cambió en disco: recarga el Estudio.`, `${nombre}.json changed on disk: reload the Studio.`)];
        return [null, `${nombre}.json (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`];
    }
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        const hechos = [], errores = [];
        try {
            for (const n of Object.keys(A)) if (sucioDe(n)) { const [ok, err] = await guardarUno(n); if (ok) hechos.push(ok); if (err) errores.push(err); }
            if (errores.length) rotular(`No se guardó: ${errores.join(' · ')}`, `Not saved: ${errores.join(' · ')}`, 'error');
            else rotular(`Guardado: ${hechos.join(', ')}.`, `Saved: ${hechos.join(', ')}.`, 'ok');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        pintar();
    }
    $('vi-ir').addEventListener('click', () => caminar(selDestino.value));
    $('vi-volver').addEventListener('click', () => caminar('sitio'));
    $('vi-estado').addEventListener('click', () => caminar(''));
    // 7i: que la persona elegida te siga (sin mirar la amistad) o que te deje
    const acompanar = async accionA => {
        const persona = selPersona.value;
        if (!persona) return;
        try {
            const r = await ctx.puente.enviar('rutina', { accion: accionA, persona });
            const e = (r && r.rutina) || {};
            rotular(`${persona}: ${e.estado || '?'}`, `${persona}: ${e.estado || '?'}`, 'ok');
        } catch (err) { rotular(err.message, err.message, 'error'); }
    };
    $('vi-acompanar').addEventListener('click', () => acompanar('acompanar'));
    $('vi-soltar').addEventListener('click', () => acompanar('soltar'));
    $('vi-descartar').addEventListener('click', () => {
        for (const n of Object.keys(A)) { if (sucioDe(n)) { A[n].datos = clonar(A[n].original); cambio(n); } }
        pintar();
    });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'vida' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(pintar);
    pintar();
}
