// =========================================================
// VENJY · Supervivencia · Sentarse en la fogata del campamento (7g-1, primer uso de las bases comunes)
// Anillo de asientos alrededor del fuego (troncos, suelo y en cuclillas): G (o el botón SENTARSE) junto a un
// asiento libre te sienta mirando el fuego, con la cámara libre; G, Esc o moverte te paran. Sentado te calientas
// las manos de vez en cuando y puedes decir frases cortas (teclas 1-4 o sus botones).
// Con sala (actividades-red.js): la fogata es la actividad 'fogata@campamento', con un asiento por jugador que
// reparte el anfitrión. Los demás te ven sentado por tu `p` (bits de pose-jugador.js) y leen tus frases si están
// cerca (participen o no); quien llega después recibe las últimas en el registro. Sin sala, todo es local.
// Los NPC no participan (decidido 2026-10-21): solo jugadores.
// Valores: FOGATA_BASE (código) + mundo/datos/actividades.json → fogata (pestaña Vida del Estudio).
// La parte pura (asientos en el mundo, el más cercano libre) se prueba en mundo/tests/actividades.mjs.
// =========================================================

export const ID_FOGATA = 'fogata@campamento';

// dx, dz: desde el centro del fuego, en bloques. tipo: 'tronco' | 'suelo' | 'cuclillas'.
export const FOGATA_BASE = {
    cupo: 8,
    radioSentarse: 1.4,   // a menos de esto de un asiento libre, G te sienta
    radioOir: 14,         // a menos de esto del fuego lees las frases (participes o no)
    duracionFrase: 4.5,   // segundos que se ve una frase
    calentarCada: 9,      // sentado: se calienta las manos cada… (s)
    calentarDura: 4,      // … durante (s)
    asientos: [
        { dx: -1.0, dz: 2.85, tipo: 'tronco' },
        { dx: 0.0, dz: 2.85, tipo: 'tronco' },
        { dx: -0.9, dz: -1.75, tipo: 'suelo' },
        { dx: 0.9, dz: -1.75, tipo: 'suelo' },
        { dx: -1.95, dz: -0.6, tipo: 'suelo' },
        { dx: 1.95, dz: -0.6, tipo: 'cuclillas' },
        { dx: -1.75, dz: 1.85, tipo: 'cuclillas' },
        { dx: 2.0, dz: 1.6, tipo: 'cuclillas' }
    ],
    // Frases cortas (máximo 4: teclas 1-4); la clave viaja por la red y cada equipo muestra su idioma
    frases: {
        hola: { es: '¡Hola! ¿Hay espacio?', en: 'Hi! Is there room?' },
        frio: { es: 'Qué rico el fuego, hacía frío.', en: 'The fire feels great, it was cold.' },
        cuento: { es: '¿Alguien tiene una historia?', en: 'Anyone got a story?' },
        chao: { es: 'Me voy, ¡nos vemos!', en: 'Heading out, see you!' }
    },
    textos: {
        sentarse: { es: 'G: sentarte junto al fuego', en: 'G: sit by the fire' },
        sentado: { es: 'Sentado. 1-4: decir algo · G o moverte: pararte', en: 'Seated. 1-4: say something · G or move: stand up' },
        ocupado: { es: 'Ese asiento ya es de alguien.', en: 'That seat is taken.' },
        llena: { es: 'La fogata está llena.', en: 'The campfire is full.' },
        botonSentarse: { es: 'SENTARSE', en: 'SIT' },
        botonPararse: { es: 'PARARSE', en: 'STAND' }
    }
};

const TIPOS = ['tronco', 'suelo', 'cuclillas'];
const n = (v, base) => (Number.isFinite(v) ? v : base);

// Datos completos: el código más lo del JSON (solo las claves que existan y tengan el tipo correcto)
export function datosFogata(json) {
    const j = json && typeof json === 'object' ? json : {};
    const b = FOGATA_BASE;
    const d = {};
    for (const k of ['cupo', 'radioSentarse', 'radioOir', 'duracionFrase', 'calentarCada', 'calentarDura']) d[k] = n(j[k], b[k]);
    d.cupo = Math.max(1, Math.min(16, Math.round(d.cupo)));
    const lista = Array.isArray(j.asientos) && j.asientos.length ? j.asientos : b.asientos;
    d.asientos = lista.slice(0, d.cupo).map(a => ({ dx: n(a && a.dx, 0), dz: n(a && a.dz, 0), tipo: TIPOS.includes(a && a.tipo) ? a.tipo : 'suelo' }));
    d.cupo = Math.min(d.cupo, d.asientos.length);
    const frases = j.frases && typeof j.frases === 'object' && Object.keys(j.frases).length ? j.frases : b.frases;
    d.frases = Object.fromEntries(Object.entries(frases).slice(0, 4));
    d.textos = { ...b.textos, ...(j.textos && typeof j.textos === 'object' ? j.textos : {}) };
    return d;
}

// Asientos en coordenadas del mundo: x, z y el giro (yaw) que mira al fuego
export function asientosMundo(fuego, d) {
    return d.asientos.map((a, i) => {
        const x = fuego.x + a.dx, z = fuego.z + a.dz;
        // (yaw de jugador.js: mirar hacia −z con yaw 0; hacia el fuego = atan2(−dx, −dz) visto desde el asiento)
        return { i, x, z, tipo: a.tipo, yaw: Math.atan2(a.dx, a.dz) };
    });
}

// El asiento libre más cercano a (x, z) dentro del radio, o null. ocupados: Set de índices.
export function asientoCercano(x, z, asientos, ocupados, radio) {
    let mejor = null, dm = radio;
    for (const a of asientos) {
        if (ocupados.has(a.i)) continue;
        const dd = Math.hypot(a.x - x, a.z - z);
        if (dd <= dm) { dm = dd; mejor = a; }
    }
    return mejor;
}

// api: { jugador, fuego() → { x, y, z } | null, sueloY() → y de los pies, hud, idioma(), acts() (o null sin sala), yo(),
//        nombreDe(id), datos() (el JSON de actividades.fogata), puede(), alSentarse?(b) }
export function crearFogata(api) {
    const { jugador, hud } = api;
    const tx = o => (o ? (api.idioma() === 'en' ? o.en : o.es) || o.es || '' : '');
    let sentado = null;        // asiento donde estoy (objeto de asientosMundo)
    let pendiente = null;      // asiento pedido al anfitrión
    let t = 0, cerca = false, oyenteListo = false;
    const datos = () => datosFogata(api.datos ? api.datos() : null);

    // Botones (táctil y mouse sin puntero bloqueado)
    const caja = document.createElement('div');
    caja.className = 'fogata-botones';
    const boton = (alPulsar) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'boton'; b.hidden = true;
        b.addEventListener('click', e => { e.preventDefault(); alPulsar(); });
        caja.appendChild(b);
        return b;
    };
    const bSentar = boton(() => intentar());
    const bFrases = [0, 1, 2, 3].map(k => boton(() => decir(k)));
    document.body.appendChild(caja);
    function pintarBotones(d) {
        bSentar.textContent = tx(sentado ? d.textos.botonPararse : d.textos.botonSentarse);
        bSentar.hidden = !(sentado || (cerca && libreCerca(d)));
        const claves = Object.keys(d.frases);
        bFrases.forEach((b, k) => { b.hidden = !sentado || !claves[k]; if (claves[k]) b.textContent = `${k + 1}. ${tx(d.frases[claves[k]])}`; });
    }

    function ocupados() {
        const s = new Set();
        const acts = api.acts && api.acts();
        const act = acts && acts.actividad(ID_FOGATA);
        if (act && act.as) for (const [q, i] of Object.entries(act.as)) if (q !== String(api.yo())) s.add(i);
        return s;
    }
    function asientos(d) { const f = api.fuego(); return f ? asientosMundo(f, d) : []; }
    function libreCerca(d) { return asientoCercano(jugador.pos.x, jugador.pos.z, asientos(d), ocupados(), d.radioSentarse); }

    function escucharSala() {
        const acts = api.acts && api.acts();
        if (!acts || oyenteListo) return;
        oyenteListo = true;
        acts.escuchar('fogata', {
            estado: act => {
                const yo = api.yo();
                const mio = act && act.as ? act.as[yo] : undefined;
                if (pendiente && Number.isInteger(mio) && mio === pendiente.i) { const a = pendiente; pendiente = null; sentar(a); }
                else if (sentado && !Number.isInteger(mio)) pararse(false); // el anfitrión me sacó (o se cerró)
            },
            no: m => {
                pendiente = null;
                const d = datos();
                hud.mensaje(tx(m.motivo === 'llena' ? d.textos.llena : d.textos.ocupado), 2.5);
            },
            dicho: (x) => mostrarDicho(x.de, x.c)
        });
    }

    function intentar() {
        if (sentado) { pararse(true); return true; }
        const d = datos();
        if (!api.puede() || pendiente) return false;
        const a = libreCerca(d);
        if (!a) return false;
        escucharSala();
        const acts = api.acts && api.acts();
        if (acts) { pendiente = a; acts.unir(ID_FOGATA, 'fogata', d.cupo, undefined, { asiento: a.i }); }
        else sentar(a);
        return true;
    }
    function sentar(a) {
        sentado = a; t = 0;
        const y = api.sueloY ? api.sueloY() : null;
        if (Number.isFinite(y) && jugador.colocar) jugador.colocar(a.x, y, a.z);
        else { jugador.pos.x = a.x; jugador.pos.z = a.z; }
        jugador.yaw = a.yaw;
        jugador.congelado = true; jugador.teclas.clear();
        document.body.classList.add('en-fogata');
        pintarBotones(datos());
        hud.mensaje(tx(datos().textos.sentado), 4);
        if (api.alSentarse) api.alSentarse(true);
    }
    function pararse(avisarSala) {
        if (!sentado) return;
        sentado = null;
        jugador.congelado = false;
        document.body.classList.remove('en-fogata');
        pintarBotones(datos());
        const acts = api.acts && api.acts();
        if (avisarSala && acts) acts.salir(ID_FOGATA);
        if (acts) acts.progreso(null);
        if (api.alSentarse) api.alSentarse(false);
    }

    function decir(k) {
        if (!sentado) return;
        const d = datos(), c = Object.keys(d.frases)[k];
        if (!c) return;
        const acts = api.acts && api.acts();
        if (acts) acts.decir(ID_FOGATA, c); // vuelve a todos (también a mí) como `dicho`
        else mostrarDicho(api.yo(), c);
    }
    function mostrarDicho(quien, c) {
        const d = datos(), f = api.fuego();
        if (!f || Math.hypot(jugador.pos.x - f.x, jugador.pos.z - f.z) > d.radioOir) return;
        const texto = d.frases[c] ? tx(d.frases[c]) : null;
        if (!texto) return; // una clave que este equipo no conoce (otro JSON): no se muestra
        hud.mensaje(`${api.nombreDe(quien)}: ${texto}`, d.duracionFrase);
    }

    // Teclas: 1-4 dicen una frase sentado (en captura, para que no cambien la ranura); Esc y WASD te paran
    window.addEventListener('keydown', e => {
        if (!sentado || e.repeat) return;
        const m = /^Digit([1-4])$/.exec(e.code);
        if (m) { e.preventDefault(); e.stopImmediatePropagation(); decir(Number(m[1]) - 1); return; }
        if (e.code === 'Escape' || ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) pararse(true);
    }, true);

    function actualizar(dt) {
        const d = datos(), f = api.fuego();
        cerca = !!f && Math.hypot(jugador.pos.x - f.x, jugador.pos.z - f.z) < d.radioOir;
        if (cerca) escucharSala();
        if (sentado) {
            if (!api.puede()) pararse(true);
            else {
                t += dt;
                jugador.pos.x = sentado.x; jugador.pos.z = sentado.z;
                const acts = api.acts && api.acts();
                if (acts) acts.progreso(ID_FOGATA, { a: sentado.i });
            }
        }
        const hay = !sentado && cerca && api.puede() && !!libreCerca(d);
        if (hay && !document.body.classList.contains('cerca-fogata')) hud.mensaje(tx(d.textos.sentarse), 3);
        document.body.classList.toggle('cerca-fogata', hay);
        pintarBotones(d);
    }

    // Pose para pose-jugador.js (se suma a entradaPose de main.js)
    function entrada() {
        if (!sentado) return null;
        const d = datos();
        const ciclo = Math.max(0.1, d.calentarCada + d.calentarDura);
        return { sentado: true, tronco: sentado.tipo === 'tronco', cuclillas: sentado.tipo === 'cuclillas', calentando: (t % ciclo) >= d.calentarCada };
    }

    return {
        intentar, actualizar, entrada, decir,
        pararse: () => pararse(true),
        get sentado() { return !!sentado; },
        get asiento() { return sentado ? sentado.i : -1; }
    };
}
