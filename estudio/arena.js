// =========================================================
// VENJY · Estudio · pestaña Arena: el duelo de Lalo contra Moisés en el lago congelado (bloque 8 · L1)
// Edita mundo/datos/arena.json (esquema: estudio/esquemas/arena.schema.json). Valor base en el código: ARENA de
// mundo/supervivencia/arena/modelo.js; lo que el JSON no dice se muestra con el valor del código y se escribe al
// tocarlo. Cada cambio va en vivo (mensaje `datos` 'arena'); los botones mandan el mensaje `arena` ({ accion }).
// Guardar escribe con If-Match, como Carrera y Vida, y conserva las claves que la pestaña no muestra (planos, marcas…).
// =========================================================
const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v && typeof v === 'object' && !Array.isArray(v);
// [es, en, min, max, paso] de cada número (mínimos y máximos, del esquema)
const GRUPOS = [
    ['rondas', 'Rondas', 'Rounds', {
        mejorDe: ['mejor de (rondas ganadas para el combate)', 'best of (rounds to win the match)', 1, 9, 1],
        segundos: ['segundos por ronda', 'seconds per round', 10, 600, 5],
        maxRondas: ['tope de rondas (contando empates)', 'round cap (draws count)', 1, 15, 1],
        anuncio: ['segundos de «Ronda N»', 'seconds of «Round N»', 0.2, 5, 0.1],
        peleen: ['segundos de «¡Peleen!»', 'seconds of «Fight!»', 0.2, 5, 0.1],
        finRonda: ['segundos tras el K.O. antes de la siguiente', 'seconds after the K.O. before the next', 0.5, 8, 0.1],
        lentaKo: ['segundos de cámara lenta con el K.O.', 'K.O. slow-motion seconds', 0, 3, 0.1],
        escalaLenta: ['rapidez de esa cámara lenta (1 = normal)', 'that slow-motion speed (1 = normal)', 0.05, 1, 0.05]
    }],
    ['movimiento', 'Movimiento', 'Movement', {
        radio: ['medio ancho del cuerpo contra las paredes', 'half body width against walls', 0.1, 1, 0.05],
        distanciaMin: ['a menos de esto los dos se separan suave', 'closer than this they ease apart', 0.2, 2, 0.05],
        duro: ['nunca más cerca que esto', 'never closer than this', 0.1, 1.5, 0.05],
        empuje: ['fracción de la superposición que se corrige por cuadro', 'overlap fraction fixed per frame', 0.01, 1, 0.01],
        reorientar: ['cuadros en que el cuerpo vuelve a mirar al rival', 'frames to face the rival again', 1, 60, 1]
    }],
    ['camara', 'Cámara', 'Camera', {
        fov: ['ángulo de visión', 'field of view', 20, 100, 1],
        altura: ['altura de la cámara (hombros)', 'camera height (shoulders)', 0.3, 6, 0.05],
        mira: ['altura del punto al que mira', 'height of the look-at point', 0, 3, 0.05],
        inclinacion: ['grados hacia abajo', 'degrees downward', -10, 45, 1],
        distanciaMin: ['distancia mínima', 'minimum distance', 1, 20, 0.1],
        distanciaMax: ['distancia máxima', 'maximum distance', 2, 30, 0.1],
        margen: ['bloques libres a cada lado de los peleadores', 'free blocks beside the fighters', 0, 4, 0.05],
        resorte: ['segundos del resorte (distancia y centro)', 'spring seconds (distance and center)', 0.02, 2, 0.01],
        giroMax: ['grados por segundo que puede girar siguiendo el eje', 'degrees per second it can turn', 10, 720, 5],
        adelanto: ['se adelanta hacia donde va el que se mueve (s)', 'leads toward the mover (s)', 0, 1.5, 0.05],
        separacionMin: ['lo más chico que puede ser el tope de separación', 'smallest separation cap', 1, 12, 0.1]
    }],
    ['entrada', 'Entrada', 'Entrance', {
        viaje: ['segundos del viaje', 'travel seconds', 0, 10, 0.1],
        vs: ['segundos de la pantalla VS', 'VS screen seconds', 0.5, 10, 0.1],
        vuelo: ['segundos de cada vuelo de cámara', 'seconds per camera flight', 0.5, 15, 0.1],
        ventisca: ['segundos que la nieve tapa la pantalla', 'seconds snow covers the screen', 0.2, 4, 0.1],
        caminarMarca: ['segundos que caminan a su marca', 'seconds to walk to their mark', 0, 5, 0.1]
    }],
    ['vs', 'Pantalla VS', 'VS screen', {
        diagonal: ['grados de la línea que parte la pantalla', 'degrees of the split line', 0, 40, 1]
    }],
    ['cpu', 'CPU peleador', 'CPU fighter', {
        repetirMax: ['veces seguidas que puede repetir un ataque', 'times in a row it may repeat an attack', 1, 10, 1],
        castigo: ['cuadros tras su cadena en que no se defiende', 'frames after its chain without defending', 0, 180, 1]
    }],
    ['practica', 'Práctica (patrón fijo; solo las pruebas)', 'Practice (fixed pattern; tests only)', {
        alcance: ['alcance del ataque', 'attack reach', 0.5, 5, 0.1],
        acercarse: ['fracción de la velocidad con que camina hacia ti', 'fraction of speed walking toward you', 0, 1, 0.05],
        desviaCada: ['desvía uno de cada N ataques tuyos (0 = nunca)', 'deflects one of every N of your attacks (0 = never)', 0, 20, 1],
        peligroCada: ['tira un ataque peligroso cada N pasos (0 = nunca)', 'throws a perilous attack every N steps (0 = never)', 0, 20, 1]
    }],
    ['golpe', 'Golpe', 'Hit', {
        bloqueoDano: ['fracción del daño que pasa al bloquear', 'damage fraction through a block', 0, 1, 0.05]
    }],
    ['hud', 'HUD', 'HUD', {
        anchoVida: ['ancho de cada barra de vida (% de pantalla)', 'life bar width (% of screen)', 10, 48, 1],
        retrato: ['lado del retrato chico (px)', 'small portrait side (px)', 16, 128, 1],
        anchoPostura: ['ancho de la barra de postura (% de pantalla)', 'posture bar width (% of screen)', 5, 48, 1],
        silueta: ['alto de la silueta de zonas (px)', 'zone silhouette height (px)', 16, 128, 1]
    }],
    ['rebote', 'Rebote en la pared', 'Wall bounce', {
        distancia: ['un golpe medio a menos de esto de la pared (o un barril) lo hace rebotar', 'a mid hit closer than this to the wall (or a barrel) bounces', 0, 4, 0.05],
        extra: ['bloques de más que lo lleva el golpe (para que llegue)', 'extra blocks the hit carries (so it arrives)', 0, 1, 0.05]
    }]
];
// Una dificultad de la CPU (arena.json → cpu.dificultades.<clave>)
const CPU_DIF = {
    anticipacion: ['× la anticipación de sus ataques', '× wind-up of its attacks', 1, 3, 0.05],
    retraso: ['cuadros de atraso con que te ve', 'frames late it sees you', 0, 60, 1],
    desvio: ['probabilidad de desviar tu ataque', 'chance to deflect your attack', 0, 1, 0.05],
    perfecto: ['de esos, probabilidad de perfecto', 'of those, chance of perfect', 0, 1, 0.05],
    bloqueo: ['probabilidad de bloquear', 'chance to block', 0, 1, 0.05],
    esquiva: ['probabilidad de esquivar', 'chance to dodge', 0, 1, 0.05],
    peligros: ['probabilidad de leer tus peligrosos', 'chance to read your perilous attacks', 0, 1, 0.05],
    agresion: ['agresión (más = espera menos)', 'aggression (more = waits less)', 0.1, 3, 0.05]
};
// Efectos de los golpes (L2, arena/efectos.js): [grupo, campo, es, en, min, max, paso]
const EFECTOS_NUM = [
    ['chispas', 'vida', 'chispas: segundos que duran', 'sparks: seconds they last', 0.05, 3, 0.05],
    ['chispas', 'velocidad', 'chispas: velocidad', 'sparks: speed', 0, 20, 0.1],
    ['chispas', 'gravedad', 'chispas: gravedad', 'sparks: gravity', 0, 40, 0.5],
    ['chispas', 'tamano', 'chispas: tamaño (bloques)', 'sparks: size (blocks)', 0.01, 0.5, 0.01],
    ['perfecto', 'destello', 'desvío perfecto: segundos del destello', 'perfect deflect: flash seconds', 0, 2, 0.01],
    ['perfecto', 'tamano', 'desvío perfecto: tamaño del destello', 'perfect deflect: flash size', 0, 5, 0.05],
    ['perfecto', 'chispasExtra', 'desvío perfecto: × chispas', 'perfect deflect: × sparks', 0, 5, 0.1],
    ['bloqueo', 'escala', 'bloqueo: × chispas', 'block: × sparks', 0, 3, 0.1],
    ['carga', 'opacidad', 'carga: opacidad del brillo', 'charge: glow opacity', 0, 1, 0.05],
    ['carga', 'niveles', 'carga: escalones del brillo', 'charge: glow steps', 1, 10, 1],
    ['estela', 'escalones', 'estela: escalones de transparencia', 'trail: transparency steps', 2, 16, 1]
];
// Peso de los golpes (N5, arena/efectos.js y arena/pantalla.js): [ruta dentro de efectos, es, en, min, max, paso]
const PESO_NUM = [
    [['impacto', 'destello'], 'impacto: segundos del destello blanco', 'impact: white flash seconds', 0, 1, 0.01],
    [['impacto', 'tamano'], 'impacto: tamaño del destello', 'impact: flash size', 0, 3, 0.05],
    [['polvo', 'vida'], 'polvo: segundos que dura', 'dust: seconds it lasts', 0.05, 3, 0.05],
    [['polvo', 'velocidad'], 'polvo: velocidad', 'dust: speed', 0, 10, 0.1],
    [['polvo', 'gravedad'], 'polvo: gravedad', 'dust: gravity', 0, 30, 0.1],
    [['polvo', 'tamano'], 'polvo: tamaño (bloques)', 'dust: size (blocks)', 0.01, 0.5, 0.01],
    [['polvo', 'cuantos', 'impacto'], 'polvo: cubitos en un golpe fuerte', 'dust: cubes on a heavy hit', 0, 60, 1],
    [['polvo', 'cuantos', 'caida'], 'polvo: cubitos al caer', 'dust: cubes on a fall', 0, 60, 1],
    [['polvo', 'cuantos', 'esquiva'], 'polvo: cubitos al esquivar', 'dust: cubes on a dodge', 0, 60, 1],
    [['polvo', 'cuantos', 'pared'], 'polvo: cubitos contra la pared', 'dust: cubes against the wall', 0, 60, 1],
    [['aro', 'vida'], 'aro: segundos', 'ring: seconds', 0.05, 2, 0.01],
    [['aro', 'radio'], 'aro: radio (bloques)', 'ring: radius (blocks)', 0, 5, 0.05],
    [['aro', 'cubos'], 'aro: cubos', 'ring: cubes', 0, 48, 1],
    [['aro', 'tamano'], 'aro: tamaño de cada cubo', 'ring: cube size', 0.01, 0.5, 0.01],
    [['estrellas', 'cuantas'], 'estrellas del mareo: cuántas', 'dizzy stars: how many', 0, 6, 1],
    [['estrellas', 'radio'], 'estrellas: radio de la vuelta', 'stars: orbit radius', 0, 1.5, 0.01],
    [['estrellas', 'alto'], 'estrellas: altura sobre la cabeza', 'stars: height above the head', 0, 1.5, 0.01],
    [['estrellas', 'vueltas'], 'estrellas: vueltas por segundo', 'stars: turns per second', 0, 5, 0.05],
    [['estrellas', 'tamano'], 'estrellas: tamaño', 'stars: size', 0.01, 0.5, 0.01],
    [['marca', 'tamano'], 'marca roja: tamaño', 'red mark: size', 0.01, 1, 0.01],
    [['marca', 'alto'], 'marca roja: altura en el pecho', 'red mark: chest height', 0, 2.5, 0.01],
    [['marca', 'frente'], 'marca roja: delante del pecho', 'red mark: in front of the chest', -1, 1, 0.01],
    [['marca', 'parpadeo'], 'marca roja: parpadeos por segundo', 'red mark: blinks per second', 0, 20, 0.5],
    [['topeCuadro'], 'tope de partículas nuevas por cuadro', 'new particle cap per frame', 0, 160, 1],
    [['pantalla', 'resolucion'], 'pantalla: ancho en píxeles de la capa', 'screen: layer width in pixels', 64, 640, 8],
    [['pantalla', 'lineas', 'dur'], 'líneas de velocidad: segundos', 'speed lines: seconds', 0, 2, 0.01],
    [['pantalla', 'lineas', 'cuantas'], 'líneas de velocidad: cuántas', 'speed lines: how many', 0, 80, 1],
    [['pantalla', 'lineas', 'largo'], 'líneas de velocidad: largo', 'speed lines: length', 0, 1, 0.01],
    [['pantalla', 'vineta', 'dur'], 'viñeta: segundos', 'vignette: seconds', 0, 3, 0.05],
    [['pantalla', 'vineta', 'fuerza'], 'viñeta: fuerza', 'vignette: strength', 0, 1, 0.05],
    [['pantalla', 'numeros', 'dur'], 'números de daño: segundos', 'damage numbers: seconds', 0.1, 3, 0.05],
    [['pantalla', 'numeros', 'sube'], 'números de daño: cuánto saltan', 'damage numbers: jump height', 0, 100, 1],
    [['peligro', 'opacidad'], 'peligro: opacidad del destello del arma', 'peril: weapon flash opacity', 0, 1, 0.05],
    [['peligro', 'grueso'], 'peligro: grosor del destello del arma', 'peril: weapon flash thickness', 0.01, 0.5, 0.01],
    [['pantalla', 'aviso', 'tamano'], 'aviso de peligro: tamaño del rombo (px)', 'peril warning: diamond size (px)', 4, 40, 1],
    [['pantalla', 'aviso', 'alto'], 'aviso de peligro: altura sobre los pies', 'peril warning: height above the feet', 0.5, 4, 0.05],
    [['pantalla', 'aviso', 'parpadeo'], 'aviso de peligro: parpadeos por segundo (0 = fijo)', 'peril warning: blinks per second (0 = steady)', 0, 20, 0.5]
];
const PESO_COLOR = [[['impacto', 'color'], 'destello del impacto', 'impact flash'], [['aro', 'color'], 'aro', 'ring'], [['estrellas', 'color'], 'estrellas', 'stars'], [['marca', 'color'], 'marca roja', 'red mark'],
    [['pantalla', 'lineas', 'color'], 'líneas de velocidad', 'speed lines'], [['pantalla', 'flash', 'color'], 'flash', 'flash'], [['pantalla', 'vineta', 'color'], 'viñeta', 'vignette'],
    [['pantalla', 'numeros', 'color'], 'números', 'numbers'], [['pantalla', 'numeros', 'critico'], 'números de golpe fuerte', 'heavy-hit numbers'],
    [['peligro', 'color'], 'destello rojo del arma (peligro)', 'red weapon flash (peril)'], [['pantalla', 'aviso', 'color'], 'rombo del peligro', 'peril diamond'],
    [['pantalla', 'aviso', 'borde'], 'borde del rombo', 'diamond border'], [['pantalla', 'aviso', 'signo'], 'signo del rombo', 'diamond sign']];
const NIVELES_PESO = [['ligero', 'ligero', 'light'], ['medio', 'medio', 'medium'], ['fuerte', 'fuerte', 'heavy'], ['desvio', 'desvío', 'deflect'], ['perfecto', 'perfecto', 'perfect'], ['remate', 'remate', 'finisher']];
const COLORES_HUD = [['vida', 'vida', 'life'], ['vidaFondo', 'fondo de la vida', 'life background'], ['vidaPerdida', 'vida perdida', 'lost life'], ['reloj', 'reloj', 'clock'], ['ronda', 'texto de ronda', 'round text'],
    ['postura', 'postura', 'posture'], ['posturaAlta', 'postura cansada (sobre el cansancio del estilo)', 'tired posture'], ['posturaFondo', 'fondo de la postura', 'posture background'], ['espiritu', 'espíritu (arte de combate)', 'spirit (combat art)'], ['espirituFondo', 'fondo del espíritu', 'spirit background'],
    ['zonaVerde', 'silueta: zona sana', 'silhouette: healthy zone'], ['zonaAmarilla', 'silueta: zona dañada', 'silhouette: hurt zone'], ['zonaRoja', 'silueta: zona roja', 'silhouette: red zone'],
    ['zonaCritica', 'silueta: zona en crítico (parpadea)', 'silhouette: critical zone (blinks)'], ['zonaBorde', 'silueta: borde', 'silhouette: outline']];
// Plano de cine del golpe final (L3): camara.remate
const CAMARA_REMATE = {
    duracion: ['golpe final: segundos del plano de cine', 'final strike: cinematic shot seconds', 0.2, 6, 0.1],
    distancia: ['golpe final: distancia de la cámara', 'final strike: camera distance', 1, 12, 0.1],
    altura: ['golpe final: altura de la cámara', 'final strike: camera height', 0.1, 6, 0.05],
    mira: ['golpe final: altura del punto al que mira', 'final strike: look-at height', 0, 3, 0.05],
    desde: ['golpe final: grados de partida (hacia el que remata)', 'final strike: start degrees (toward the striker)', -180, 180, 1],
    giro: ['golpe final: grados que gira', 'final strike: degrees it turns', -360, 360, 1],
    fov: ['golpe final: ángulo de visión', 'final strike: field of view', 15, 100, 1]
};
const DIFICULTADES = [['facil', 'Fácil', 'Easy'], ['normal', 'Normal', 'Normal'], ['dificil', 'Difícil', 'Hard'], ['maestro', 'En serio', 'For real']];
const LUZ_NUM = {
    ambiente: ['luz ambiente', 'ambient light', 0, 3, 0.05], fogataFuerza: ['fuerza de las fogatas', 'campfire strength', 0, 6, 0.1],
    parpadeo: ['parpadeo de las fogatas', 'campfire flicker', 0, 1, 0.05], nieblaCerca: ['niebla: desde (bloques)', 'fog: from (blocks)', 0, 200, 1],
    nieblaLejos: ['niebla: hasta (bloques)', 'fog: to (blocks)', 1, 400, 1]
};
const LUZ_COLOR = [['cielo', 'cielo', 'sky'], ['suelo', 'suelo', 'ground'], ['fogata', 'fogata', 'campfire'], ['niebla', 'niebla', 'fog']];

export async function montarArena(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('ar-campos'), msg = $('ar-mensaje'), btnGuardar = $('ar-guardar');
    let etag = null, original = null, datos = null, base = {};
    try {
        const r = await fetch('../mundo/datos/arena.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); datos = clonar(original);
    } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/arena.json'; return; }
    // Valor base del código (el módulo puede no existir todavía: entonces solo se ve lo del JSON)
    try { const m = await import('../mundo/supervivencia/arena/modelo.js'); if (esObj(m.ARENA)) base = m.ARENA; } catch (e) { base = {}; }

    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = (enviar = true) => { if (enviar) ctx.puente.enviarDatos('arena', datos); btnGuardar.disabled = !sucio() || !ctx.servidor.escritura; };
    // Lee una ruta: primero el JSON, luego el código; `por` si ninguno la tiene
    const leer = (ruta, por) => {
        for (const raiz of [datos, base]) {
            let o = raiz;
            for (const k of ruta) { if (o == null || typeof o !== 'object') { o = undefined; break; } o = o[k]; }
            if (o !== undefined) return o;
        }
        return por;
    };
    // Escribe una ruta en el JSON (crea los objetos del camino)
    const poner = (ruta, v) => {
        let o = datos;
        ruta.slice(0, -1).forEach((k, i) => {
            if (!esObj(o[k]) && !Array.isArray(o[k])) { const b = leer(ruta.slice(0, i + 1)); o[k] = esObj(b) || Array.isArray(b) ? clonar(b) : {}; }
            o = o[k];
        });
        o[ruta[ruta.length - 1]] = v; cambio();
    };
    // Las listas se escriben enteras: si el JSON no la tenía se copia la del código antes de cambiarla
    const lista = (ruta, por = []) => clonar(leer(ruta, por));

    const campo = (etiqueta, ...hijos) => {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        l.appendChild(s); hijos.forEach(h => l.appendChild(h)); return l;
    };
    function numero(etiqueta, valor, min, max, paso, fijarValor) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = valor;
        const n = document.createElement('input'); n.type = 'number'; n.min = min; n.max = max; n.step = paso; n.value = valor; n.style.width = '5em';
        const fijar = v => { if (!Number.isFinite(v)) return; v = Math.min(max, Math.max(min, v)); rg.value = v; n.value = v; fijarValor(v); };
        rg.addEventListener('input', () => fijar(Number(rg.value)));
        n.addEventListener('change', () => fijar(Number(n.value)));
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        fila.append(s, d); return fila;
    }
    const num = (ruta, [es, en, min, max, paso]) => numero(t(es, en), leer(ruta, min), min, max, paso, v => poner(ruta, v));
    const texto = (etiqueta, ruta, ancho = '16em', maxLen = 80) => {
        const i = document.createElement('input'); i.type = 'text'; i.value = leer(ruta, '') ?? ''; i.maxLength = maxLen; i.style.width = ancho;
        i.addEventListener('change', () => poner(ruta, i.value)); return campo(etiqueta, i);
    };
    // Par ES/EN: se escribe el objeto {es, en} completo al cambiar uno
    const parTexto = (etiqueta, ruta, largo = false) => {
        const f = document.createElement('div'); f.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta; f.appendChild(s);
        for (const l of ['es', 'en']) {
            const i = document.createElement('input'); i.type = 'text'; i.title = l.toUpperCase(); i.maxLength = 160; i.style.width = largo ? '22em' : '12em';
            i.value = (leer(ruta, {}) || {})[l] || '';
            i.addEventListener('change', () => { const v = i.value.trim(); const ant = esObj(leer(ruta, null)) ? clonar(leer(ruta, {})) : {}; poner(ruta, { ...ant, [l]: v }); });
            f.appendChild(i);
        }
        return f;
    };
    const color = (etiqueta, ruta, por = '#888888') => {
        const c = document.createElement('input'); c.type = 'color'; c.value = leer(ruta, por) || por;
        c.addEventListener('change', () => poner(ruta, c.value)); return campo(etiqueta, c);
    };
    const interruptor = (etiqueta, ruta, por) => {
        const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!leer(ruta, por);
        c.addEventListener('change', () => poner(ruta, c.checked)); return campo(etiqueta, c);
    };
    const boton = (es, en, f, clase = 'boton chico secundario') => {
        const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = t(es, en);
        b.addEventListener('click', f); return b;
    };
    const seccion = (titulo, abierta = false) => {
        const sec = document.createElement('details'); sec.className = 'panel'; sec.open = abierta;
        const h = document.createElement('summary'); h.textContent = titulo;
        sec.appendChild(h); caja.appendChild(sec); return sec;
    };
    // Lista de números fijos (largo `n`): [x, z], [x, y, z]
    const vector = (etiqueta, ruta, n, etiquetas, paso = 0.1) => {
        const f = document.createElement('div'); f.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta; f.appendChild(s);
        const v = leer(ruta, new Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            const e = document.createElement('input'); e.type = 'number'; e.step = paso; e.value = v[i] ?? 0; e.style.width = '4.5em'; e.title = etiquetas[i];
            e.addEventListener('change', () => { const x = Number(e.value); if (!Number.isFinite(x)) return; const a = clonar(leer(ruta, new Array(n).fill(0))); a[i] = x; poner(ruta, a); });
            f.appendChild(e);
        }
        return f;
    };
    // Lista de puntos [x, z] con agregar y quitar
    const puntos = (sec, titulo, ruta, max) => {
        const h = document.createElement('strong'); h.textContent = titulo; sec.appendChild(h);
        const L = leer(ruta, []);
        L.forEach((p, i) => {
            const fila = document.createElement('div'); fila.className = 'fila-botones';
            fila.appendChild(vector(`#${i + 1}`, [...ruta, i], 2, ['x', 'z']));
            fila.appendChild(boton('Quitar', 'Remove', () => { const a = lista(ruta); a.splice(i, 1); poner(ruta, a); pintar(); }));
            // el vector escribe en ruta[i]: se asegura que la lista ya sea propia
            sec.appendChild(fila);
        });
        if (L.length < max) sec.appendChild(boton('Agregar', 'Add', () => { const a = lista(ruta); a.push([0, 0]); poner(ruta, a); pintar(); }));
    };
    // Lista de claves de texto (público, gestos)
    const claves = (sec, titulo, ruta, max, ejemplo) => {
        const h = document.createElement('strong'); h.textContent = titulo; sec.appendChild(h);
        const L = leer(ruta, []);
        L.forEach((k, i) => {
            const fila = document.createElement('div'); fila.className = 'fila-botones';
            const e = document.createElement('input'); e.type = 'text'; e.value = k; e.maxLength = 40; e.pattern = '[a-z0-9_-]+';
            e.addEventListener('change', () => { const v = e.value.trim().toLowerCase(); if (!v) return; const a = lista(ruta); a[i] = v; poner(ruta, a); });
            fila.append(e, boton('Quitar', 'Remove', () => { const a = lista(ruta); a.splice(i, 1); poner(ruta, a); pintar(); }));
            sec.appendChild(fila);
        });
        if (L.length < max) sec.appendChild(boton('Agregar', 'Add', () => { const a = lista(ruta); a.push(ejemplo); poner(ruta, a); pintar(); }));
    };
    const lugarDelRango = (sec) => { // practica.ataqueCada es [min, max] en segundos
        const f = document.createElement('div'); f.className = 'campo';
        const s = document.createElement('span'); s.textContent = t('un ataque cada (s, de … a …)', 'one attack every (s, from … to …)'); f.appendChild(s);
        const v = leer(['practica', 'ataqueCada'], [1.4, 2.6]);
        for (let i = 0; i < 2; i++) {
            const e = document.createElement('input'); e.type = 'number'; e.min = 0; e.step = 0.1; e.value = v[i]; e.style.width = '4.5em';
            e.addEventListener('change', () => { const x = Math.max(0, Number(e.value)); if (!Number.isFinite(x)) return; const a = clonar(leer(['practica', 'ataqueCada'], [1.4, 2.6])); a[i] = x; poner(['practica', 'ataqueCada'], a); });
            f.appendChild(e);
        }
        sec.appendChild(f);
    };

    function pintar() {
        caja.textContent = '';
        // Peleadores
        const sp = seccion(t('Peleadores', 'Fighters'), true);
        sp.appendChild(num(['nivelDuelo'], ['nivel de amistad desde el que aparece «¡Un duelo en el lago!»', 'friendship level from which «A duel on the lake!» shows', 0, 5, 1]));
        const claves_ = [...new Set([...Object.keys(base.peleadores || {}), ...Object.keys(datos.peleadores || {})])];
        for (const k of claves_) {
            const P = ['peleadores', k], f = document.createElement('div'); f.className = 'panel';
            const h = document.createElement('strong'); h.textContent = k; f.appendChild(h);
            f.appendChild(parTexto(t('nombre', 'name'), [...P, 'nombre']));
            f.appendChild(parTexto(t('título', 'title'), [...P, 'titulo']));
            f.appendChild(texto(t('estilo de combate (estilo-<clave>.json)', 'fighting style (estilo-<key>.json)'), [...P, 'estilo'], '10em', 24));
            f.appendChild(num([...P, 'vida'], ['vida', 'life', 1, 1000, 1]));
            f.appendChild(num([...P, 'postura'], ['postura', 'posture', 1, 1000, 1]));
            f.appendChild(color(t('color del aura', 'aura color'), [...P, 'aura']));
            const cartaAct = leer([...P, 'carta'], null);
            const ci = document.createElement('input'); ci.type = 'text'; ci.value = cartaAct || ''; ci.maxLength = 24; ci.placeholder = t('sin carta (primer plano 3D)', 'no card (3D close-up)');
            ci.addEventListener('change', () => { const v = ci.value.trim().toLowerCase(); poner([...P, 'carta'], v || null); });
            f.appendChild(campo(t('carta del Duelo con el retrato', 'Duel card with the portrait'), ci));
            f.appendChild(parTexto(t('frase al ganar', 'win line'), [...P, 'frases', 'victoria'], true));
            f.appendChild(parTexto(t('frase al perder', 'loss line'), [...P, 'frases', 'derrota'], true));
            sp.appendChild(f);
        }
        // Números por grupo
        for (const [g, es, en, campos] of GRUPOS) {
            const sec = seccion(t(es, en));
            for (const [k, def] of Object.entries(campos)) sec.appendChild(num([g, k], def));
            if (g === 'vs') {
                sec.appendChild(interruptor(t('tambor en la pantalla VS', 'drum on the VS screen'), ['vs', 'tambor'], true));
                const sel = document.createElement('select');
                for (const [v, es2, en2] of [['3d', 'primer plano 3D', '3D close-up'], ['carta', 'retrato de la carta', 'card portrait']]) sel.appendChild(new Option(t(es2, en2), v));
                sel.value = leer(['vs', 'retrato'], '3d');
                sel.addEventListener('change', () => poner(['vs', 'retrato'], sel.value));
                sec.appendChild(campo(t('retrato', 'portrait'), sel));
            }
            if (g === 'camara') for (const [k, def] of Object.entries(CAMARA_REMATE)) sec.appendChild(num(['camara', 'remate', k], def));
            if (g === 'cpu') {
                // L4 (combate/ia.js): anticipación mínima y una ficha por dificultad. La tabla de cada estilo
                // (estilo-*.json → cpu) llega con la pestaña Combate (N6).
                sec.appendChild(num(['cpu', 'minimo', 'normal'], ['anticipación mínima de un ataque (c)', 'minimum attack wind-up (f)', 0, 60, 1]));
                sec.appendChild(num(['cpu', 'minimo', 'peligroso'], ['anticipación mínima de un peligroso (c)', 'minimum perilous wind-up (f)', 0, 90, 1]));
                for (const [d, es2, en2] of [['facil', 'Fácil', 'Easy'], ['normal', 'Normal', 'Normal'], ['dificil', 'Difícil', 'Hard'], ['maestro', 'Maestro', 'Master']]) {
                    const f = document.createElement('div'); f.className = 'panel';
                    const h = document.createElement('strong'); h.textContent = t(es2, en2); f.appendChild(h);
                    const D = ['cpu', 'dificultades', d];
                    for (const [k, def] of Object.entries(CPU_DIF)) f.appendChild(num([...D, k], def));
                    sec.appendChild(f);
                }
            }
            if (g === 'practica') {
                lugarDelRango(sec);
                // Peligrosos que intercala (L3): claves de ataques de su estilo, separadas por coma
                const pel = document.createElement('input'); pel.type = 'text'; pel.style.width = '16em';
                pel.value = leer(['practica', 'peligros'], []).join(', ');
                pel.addEventListener('change', () => poner(['practica', 'peligros'], pel.value.split(',').map(x => x.trim()).filter(Boolean)));
                sec.appendChild(campo(t('ataques peligrosos que intercala (estocada, barrido, agarre)', 'perilous attacks it mixes in (estocada, barrido, agarre)'), pel));
                // Patrón fijo: cada paso, tajos seguidos del combo o cuadros que mantiene la carga del golpe fuerte
                const h = document.createElement('strong'); h.textContent = t('Patrón (se repite)', 'Pattern (repeats)'); sec.appendChild(h);
                const Pt = leer(['practica', 'patron'], []);
                Pt.forEach((paso, i) => {
                    const f = document.createElement('div'); f.className = 'panel';
                    const esFuerte = paso.fuerte != null;
                    f.appendChild(num(['practica', 'patron', i, esFuerte ? 'fuerte' : 'golpes'], esFuerte ? ['golpe cargado: cuadros que carga', 'charged strike: frames charging', 0, 240, 1] : ['tajos seguidos del combo', 'chained combo slashes', 1, 8, 1]));
                    f.appendChild(boton('Quitar paso', 'Remove step', () => { const a = lista(['practica', 'patron']); a.splice(i, 1); poner(['practica', 'patron'], a); pintar(); }));
                    sec.appendChild(f);
                });
                if (Pt.length < 12) {
                    sec.appendChild(boton('Agregar combo', 'Add combo', () => { const a = lista(['practica', 'patron']); a.push({ golpes: 2 }); poner(['practica', 'patron'], a); pintar(); }));
                    sec.appendChild(boton('Agregar golpe cargado', 'Add charged strike', () => { const a = lista(['practica', 'patron']); a.push({ fuerte: 30 }); poner(['practica', 'patron'], a); pintar(); }));
                }
            }
            if (g === 'golpe') sec.appendChild(texto(t('peso del golpe de prueba (combate.json → peso)', 'test-hit weight (combate.json → peso)'), ['golpe', 'hitstop'], '10em', 24));
            if (g === 'entrada') {
                sec.appendChild(texto(t('escena guion del reto (escenas.json)', 'challenge script scene (escenas.json)'), ['entrada', 'guion'], '12em', 40));
                const h = document.createElement('strong'); h.textContent = t('Vuelos de cámara', 'Camera flights'); sec.appendChild(h);
                const V = leer(['entrada', 'vuelos'], []);
                V.forEach((_, i) => {
                    const f = document.createElement('div'); f.className = 'panel';
                    f.appendChild(vector(t('desde (x, y, z)', 'from (x, y, z)'), ['entrada', 'vuelos', i, 'desde'], 3, ['x', 'y', 'z']));
                    f.appendChild(vector(t('hasta (x, y, z)', 'to (x, y, z)'), ['entrada', 'vuelos', i, 'hasta'], 3, ['x', 'y', 'z']));
                    f.appendChild(vector(t('mira (x, y, z)', 'looks at (x, y, z)'), ['entrada', 'vuelos', i, 'mira'], 3, ['x', 'y', 'z']));
                    f.appendChild(boton('Quitar vuelo', 'Remove flight', () => { const a = lista(['entrada', 'vuelos']); a.splice(i, 1); poner(['entrada', 'vuelos'], a); pintar(); }));
                    sec.appendChild(f);
                });
                if (V.length < 6) sec.appendChild(boton('Agregar vuelo', 'Add flight', () => { const a = lista(['entrada', 'vuelos']); a.push({ desde: [0, 3, 6], hasta: [0, 2, 5], mira: [0, 1, 0] }); poner(['entrada', 'vuelos'], a); pintar(); }));
            }
            if (g === 'hud') for (const [k, es2, en2] of COLORES_HUD) sec.appendChild(color(t(es2, en2), ['hud', k]));
        }
        // Efectos de los golpes (L2)
        const sf = seccion(t('Efectos de los golpes', 'Hit effects'));
        for (const [g, k, es2, en2, a, b, p] of EFECTOS_NUM) sf.appendChild(num(['efectos', g, k], [es2, en2, a, b, p]));
        sf.appendChild(color(t('destello del perfecto', 'perfect flash'), ['efectos', 'perfecto', 'color']));
        sf.appendChild(color(t('brillo de la carga', 'charge glow'), ['efectos', 'carga', 'color']));
        const nota = document.createElement('p'); nota.className = 'nota';
        nota.textContent = t('Cuántas chispas salen: combate.json → peso (particulas). La estela de cada tajo (largo, ancho, color, desvanecer) va en estilo-sekiro.json → ataques.<tajo>.efectos.estela.', 'How many sparks: combate.json → peso (particulas). Each slash trail (length, width, color, fade) is in estilo-sekiro.json → ataques.<slash>.efectos.estela.');
        sf.appendChild(nota);
        // Peso de los golpes (N5): impacto, polvo, aro, estrellas, marca roja y capa de pantalla
        const spPeso = seccion(t('Peso de los golpes', 'Hit weight'));
        for (const [ruta, es2, en2, a, b, p] of PESO_NUM) spPeso.appendChild(num(['efectos', ...ruta], [es2, en2, a, b, p]));
        for (const [ruta, es2, en2] of PESO_COLOR) spPeso.appendChild(color(t(es2, en2), ['efectos', ...ruta]));
        spPeso.appendChild(interruptor(t('números de daño', 'damage numbers'), ['efectos', 'pantalla', 'numeros', 'activo'], false));
        // En qué niveles salen el aro, las líneas de velocidad y la viñeta; flash por nivel [segundos, fuerza]
        for (const [ruta, es2, en2] of [[['aro', 'niveles'], 'aro en', 'ring on'], [['pantalla', 'lineas', 'niveles'], 'líneas de velocidad en', 'speed lines on'], [['pantalla', 'vineta', 'niveles'], 'viñeta en', 'vignette on']]) {
            const f = document.createElement('div'); f.className = 'campo';
            const s2 = document.createElement('span'); s2.textContent = t(es2, en2); f.appendChild(s2);
            for (const [k, e3, n3] of NIVELES_PESO) {
                const l = document.createElement('label'), c = document.createElement('input'); c.type = 'checkbox';
                c.checked = (leer(['efectos', ...ruta], []) || []).includes(k);
                c.addEventListener('change', () => {
                    const a = new Set(leer(['efectos', ...ruta], []) || []);
                    if (c.checked) a.add(k); else a.delete(k);
                    poner(['efectos', ...ruta], NIVELES_PESO.map(x => x[0]).filter(x => a.has(x)));
                });
                l.append(c, ' ' + t(e3, n3)); f.appendChild(l);
            }
            spPeso.appendChild(f);
        }
        for (const [k, e3, n3] of NIVELES_PESO) {
            const ruta = ['efectos', 'pantalla', 'flash', k], fl = () => { const v = leer(ruta, null); return Array.isArray(v) ? v : [0, 1]; };
            spPeso.appendChild(numero(t(`flash en ${e3}: segundos (0 = no)`, `flash on ${n3}: seconds (0 = none)`), fl()[0], 0, 2, 0.01, v => poner(ruta, [v, fl()[1]])));
            spPeso.appendChild(numero(t(`flash en ${e3}: fuerza`, `flash on ${n3}: strength`), fl()[1], 0, 1, 0.05, v => poner(ruta, [fl()[0], v])));
        }
        const sel = document.createElement('select');
        for (const [v, e3, n3] of [['nieve', 'nieve', 'snow'], ['hielo', 'hielo', 'ice'], ['tierra', 'tierra', 'dirt']]) sel.appendChild(new Option(t(e3, n3), v));
        sel.value = leer(['escenario', 'superficie'], 'nieve');
        sel.addEventListener('change', () => poner(['escenario', 'superficie'], sel.value));
        spPeso.appendChild(campo(t('superficie del suelo (color del polvo)', 'floor surface (dust color)'), sel));
        spPeso.appendChild(num(['muneco', 'recupera'], ['muñeco: segundos para recuperar la vida', 'dummy: seconds to recover life', 0, 30, 0.5]));
        const np = document.createElement('p'); np.className = 'nota';
        np.textContent = t('Hitstop, temblor, sacudida de la cámara, cámara lenta, qué reacción toca y sonido por capas: combate.json → peso, impacto, elegir y sonidos (pestaña Combate, N6). Colores del polvo por superficie: arena.json → efectos.polvo.colores.', 'Hitstop, shake, camera trauma, slow motion, which reaction plays and layered sound: combate.json → peso, impacto, elegir and sonidos (Combat tab, N6). Dust colors per surface: arena.json → efectos.polvo.colores.');
        spPeso.appendChild(np);
        // Escenario
        const se = seccion(t('Escenario', 'Scenery'));
        se.appendChild(parTexto(t('nombre del escenario', 'scenery name'), ['escenario', 'nombre']));
        se.appendChild(num(['escenario', 'largo'], ['largo (X, de pared a pared)', 'length (X, wall to wall)', 6, 40, 0.5]));
        se.appendChild(num(['escenario', 'ancho'], ['ancho (Z, de pared a pared)', 'width (Z, wall to wall)', 4, 30, 0.5]));
        se.appendChild(num(['escenario', 'pared', 'alto'], ['alto de la pared', 'wall height', 0.5, 4, 0.1]));
        se.appendChild(num(['escenario', 'pared', 'grosor'], ['grosor de la pared', 'wall thickness', 0.5, 3, 0.1]));
        puntos(se, t('Fogatas [x, z]', 'Campfires [x, z]'), ['escenario', 'fogatas'], 12);
        puntos(se, t('Barriles [x, z]', 'Barrels [x, z]'), ['escenario', 'barriles'], 12);
        se.appendChild(num(['escenario', 'barril', 'radio'], ['barril: radio del choque', 'barrel: hit radius', 0.1, 1, 0.02]));
        se.appendChild(num(['escenario', 'barril', 'dano'], ['barril: daño al que lo rompe', 'barrel: damage to whoever breaks it', 0, 50, 1]));
        se.appendChild(interruptor(t('los barriles se rompen', 'barrels break'), ['escenario', 'barril', 'rompe'], true));
        se.appendChild(num(['escenario', 'nieve', 'cantidad'], ['copos de nieve', 'snowflakes', 0, 3000, 50]));
        se.appendChild(vector(t('viento de la nieve (x, z)', 'snow wind (x, z)'), ['escenario', 'nieve', 'viento'], 2, ['x', 'z'], 0.05));
        se.appendChild(num(['escenario', 'nieve', 'caida'], ['caída de la nieve', 'snow fall speed', 0, 6, 0.1]));
        se.appendChild(num(['escenario', 'nieve', 'radio'], ['radio de la nieve', 'snow radius', 4, 40, 1]));
        for (const [k, es2, en2] of LUZ_COLOR) se.appendChild(color(t(`luz: ${es2}`, `light: ${en2}`), ['escenario', 'luz', k]));
        for (const [k, def] of Object.entries(LUZ_NUM)) se.appendChild(num(['escenario', 'luz', k], def));
        se.appendChild(color(t('hielo: color', 'ice: color'), ['escenario', 'hielo', 'color']));
        se.appendChild(num(['escenario', 'hielo', 'grietas'], ['hielo: grietas', 'ice: cracks', 0, 80, 1]));
        se.appendChild(num(['escenario', 'hielo', 'brillo'], ['hielo: brillo', 'ice: shine', 0, 1, 0.05]));
        // Público
        const pu = seccion(t('Público', 'Crowd'));
        claves(pu, t('Quién mira (claves de PERSONAS)', 'Who watches (PERSONAS keys)'), ['publico', 'personas'], 12, 'boris');
        pu.appendChild(num(['publico', 'distancia'], ['bloques detrás de la pared', 'blocks behind the wall', 0.5, 6, 0.1]));
        claves(pu, t('Gestos con que celebran', 'Cheering gestures'), ['publico', 'gestos'], 8, 'saluda');
        // Premios
        const pr = seccion(t('Premios', 'Prizes'));
        pr.appendChild(interruptor(t('la victoria sube la amistad', 'winning raises friendship'), ['premios', 'amistad'], true));
        for (const [d, es2, en2] of DIFICULTADES) {
            const R = ['premios', 'primeraVictoria', d], f = document.createElement('div'); f.className = 'panel';
            const h = document.createElement('strong'); h.textContent = t(`Primera victoria · ${es2}`, `First win · ${en2}`); f.appendChild(h);
            const oi = document.createElement('input'); oi.type = 'text'; oi.value = leer([...R, 'objeto'], ''); oi.maxLength = 32; oi.pattern = '[A-Z][A-Z0-9_]*';
            oi.addEventListener('change', () => { const v = oi.value.trim().toUpperCase(); if (/^[A-Z][A-Z0-9_]*$/.test(v)) poner([...R, 'objeto'], v); });
            f.appendChild(campo(t('objeto (clave de O)', 'item (O key)'), oi));
            f.appendChild(num([...R, 'cantidad'], ['cantidad', 'amount', 1, 64, 1]));
            pr.appendChild(f);
        }
        // Textos
        const tx = seccion(t('Textos', 'Texts'));
        const kt = [...new Set([...Object.keys(base.textos || {}), ...Object.keys(datos.textos || {})])];
        for (const k of kt) tx.appendChild(parTexto(k, ['textos', k], true));
        caja.appendChild(boton('Volver a los valores del código', 'Back to code values', () => {
            for (const k of Object.keys(datos)) if (!['$schema', 'version', 'nota'].includes(k)) delete datos[k];
            cambio(); pintar();
        }));
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/arena', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function accion(a) {
        try {
            ctx.puente.enviarDatos('arena', datos);
            await ctx.puente.enviar('arena', { accion: a });
            if (a !== 'terminar') rotular('Listo: haz clic en el juego y pelea.', 'Done: click the game and fight.', 'ok');
        } catch (e) { rotular(e.message, e.message, 'error'); }
    }
    $('ar-abrir').addEventListener('click', () => accion('abrir'));
    $('ar-lalo').addEventListener('click', () => accion('lalo'));
    $('ar-moises').addEventListener('click', () => accion('moises'));
    $('ar-terminar').addEventListener('click', () => accion('terminar'));
    $('ar-descartar').addEventListener('click', () => { datos = clonar(original); cambio(); pintar(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'arena' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(() => pintar());
    pintar();
}
