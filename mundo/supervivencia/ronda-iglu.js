// =========================================================
// VENJY · Supervivencia · Ronda del iglú (sentarte con Lalo y Moisés)
// Dentro del iglú, junto al cojín rojo de lana (que cierra un triángulo con Moisés, sentado en el
// suelo, y Lalo, de pie) aparece el aviso y la tecla G (o los botones SENTARSE / SIT). Te sientas
// en ~1,5 s con fundido a cámara de cine y ellos te saludan con globos. Mientras sigas sentado la
// ronda se repite (~20 s por vuelta): pito, bong, charla con globos dirigidos a ti y a veces YIA.
// Los objetos rotan: en la vuelta siguiente terminan en otras manos. Después de 2 vueltas la
// cámara se mece apenas y los colores se saturan poco a poco (se va al pararte).
// Primera persona: F5 o CAM. No corta la ronda; miras con el mouse (o arrastrando).
// Pararse: G, Esc, W/A/S/D o PARARSE. Tarda 1 s; cada objeto vuelve a su dueño (pito → Lalo,
// bong → Moisés) aunque te pares a mitad de un pase. Lalo y Moisés retoman lo suyo.
// Usa los ganchos n.escena de amigos.js y la API amigos.iglu (no reescribe su lógica).
// Si tu skin parte de Venjy, primero va la escena de skin del iglú (escenas-skin.js).
//
// GUION (t = s desde que te sientas; la ronda empieza en t = 4,2; una vuelta = 20 s)
//   t 0,0–1,5   te sientas (cuerpo baja al cojín), fundido, plano general desde el túnel
//   t 0,4–2,3   Lalo saluda con la mano y globo · t 2,4–4,2 Moisés saluda con globo
//   r 0,0–1,2   pito: quien lo tiene extiende el brazo; vuela a tu mano
//   r 1,2–2,0   subes el pito a la boca · 2,0–3,4 aspiras (brasa) · 3,4–4,1 bajas
//   r 4,1–5,6   botas el humo; tos a veces (50 %)
//   r 5,6–6,8   pasas el pito a la otra persona
//   r 6,8–7,9   bong: quien lo tiene extiende el brazo; vuela a tu mano
//   r 7,9–8,6   subes el bong · 8,6–10,6 aspiras (burbujas) · 10,6–11,1 bajas
//   r 11,1–11,6 aguantas, cabeza atrás · 11,6–13,4 botas el humo; tos fuerte a 11,9 (Lalo a 12,4)
//   r 13,4–14,6 pasas el bong a la otra persona
//   r 14,6–17,2 Lalo habla (globo) · 17,4–20,0 Moisés habla (globo), o YIA de los tres (40 %)
//   r 20,0      nueva vuelta: el pito y el bong ya están en otras manos
//
// Depuración: window.__venjy.ronda → forzar(), pausar(v), irA(s) (s desde que te sientas),
// saltar() (levantarse de golpe), pararse() (animado), alternarVista(v), estado.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { crearGlobo, crearTinte, caja, texturaPixeles } from '../criaturas/cuerpo.js';
import { tipoSkin } from './escenas-skin.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
// Peso de algo que dura de a a b con rampas de entrada y salida (0 → 1 → 0)
const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));
const F = (es, en) => ({ es, en });

const ENTRADA = 4.2;          // saludos antes de la primera vuelta (s desde que te sientas)
const VUELTA = 20;            // duración de una vuelta (s)
const SENTAR = 1.5;           // tiempo de sentarse (s)
const PARAR = 1.0;            // tiempo de levantarse (s)
const ALTO_COJIN = 0.28;      // tope del cojín sobre el suelo
const Y_SENTADO = ALTO_COJIN + 0.125 - 0.75; // cuerpo.y en el cojín (cadera a la altura del tope + medio muslo)
const PIERNAS_SENT = -Math.PI / 2;           // piernas estiradas hacia delante (como Moisés)
const REPOSO_BONG_J = [0.3, 0.8, 0.3];       // bong en la mano del jugador (mismo que escenas-skin.js)
const BONG_ARRIBA = [0, 1.03, 0.36];         // bong a la boca
const DOS_VUELTAS = ENTRADA + 2 * VUELTA;    // desde aquí la cámara empieza a volarse

// Momentos de la vuelta (s desde su inicio)
const TL = {
    pitoIda: [0, 1.2], pitoSube: [1.2, 2.0], pitoAspira: [2.0, 3.4], pitoBaja: [3.4, 4.1], pitoExhala: [4.1, 5.6], pitoPasa: [5.6, 6.8],
    bongIda: [6.8, 7.9], bongSube: [7.9, 8.6], bongAspira: [8.6, 10.6], bongBaja: [10.6, 11.1], bongAguanta: [11.1, 11.6], bongExhala: [11.6, 13.4], bongPasa: [13.4, 14.6],
    charlaL: [14.6, 17.2], charlaM: [17.4, 20.0]
};

// ---------------------------------------------------------
// Frases (bilingües, tono de amigos chilenos). Dos bancos: si tu skin parte de Venjy te tratan de Venjy.
// ---------------------------------------------------------
const SALUDO = {
    venjy: { lalo: F('¡Venjy, llegaste! Siéntate, po.', 'Venjy, you made it! Sit down, man.'), moises: F('Qué bacán verte acá, Venjy.', 'So good to see you here, Venjy.') },
    general: { lalo: F('¡Oye, llegaste! Siéntate, compa.', 'Hey, you made it! Sit down, buddy.'), moises: F('Qué bacán, hermano. Hay espacio al tiro.', "Nice, bro. There's room right here.") }
};
const CHARLA = {
    venjy: {
        lalo: [F('Venjy, aquí el humo no se cobra, hermano.', 'Venjy, the smoke is free here, bro.'), F('Te tratamos como de la casa, Venjy.', 'We treat you like family, Venjy.'), F('Venjy, el iglú te queda chico, ¿o no?', "Venjy, this igloo's too small for you, huh?"), F('Venjy, aspirai como si fueras de la familia.', 'Venjy, you hit it like family.')],
        moises: [F('Venjy, cuidado con el bong, pega fuerte.', 'Venjy, careful with the bong, it hits hard.'), F('Esa tos fue de Venjy de verdad, jaja.', 'That cough was pure Venjy, haha.'), F('Oye Venjy, ¿y el Inicio quién lo cuida?', 'Hey Venjy, who is watching the Start?'), F('Dale, Venjy, la próxima te toca cantar.', "Come on Venjy, next time you're singing.")]
    },
    general: {
        lalo: [F('Compa, aspiras como profesional, eh.', 'Buddy, you hit it like a pro, huh.'), F('Oye, la brasa te quedó bonita, hermano.', 'Hey, your ember looks great, bro.'), F('Cachai que acá no entra nadie sin pasar el pito.', 'Know what? Nobody gets in without the joint.'), F('Tú sí que sabes llegar justo, hermano.', 'You really know how to show up on time, bro.')],
        moises: [F('Esa tos fue de campeón, hermano.', 'That cough was championship level, bro.'), F('La próxima traes tú la leña, ¿ya?', 'Next time you bring the firewood, deal?'), F('Quédate otro rato, compa. Aquí se está bien.', 'Stay a while, buddy. It is nice here.'), F('Ya, pero no se lo digas a la polola de Lalo.', "Okay, but don't tell Lalo's girlfriend.")]
    }
};
const YIA = F('¡YIAAAAAA!', 'YIAAAAAA!');
const TXT = {
    es: { sentar: 'SENTARSE', pararse: 'PARARSE', cam: 'CAM', aviso: 'G: sentarte con Lalo y Moisés' },
    en: { sentar: 'SIT', pararse: 'STAND', cam: 'CAM', aviso: 'G: sit with Lalo and Moisés' }
};

// Cojín de lana roja: caras pintadas píxel a píxel, con borde más oscuro
const lana = (color, semilla, borde) => texturaPixeles(16, 16, semilla, (x, y, r) => {
    const f = (0.9 + r() * 0.2) * (x === 0 || y === 0 || x === 15 || y === 15 ? borde : 1);
    return [color[0] * f, color[1] * f, color[2] * f];
});

// Vacío: el iglú no existe (mundo sin amigos) o no tiene lugar; la ronda queda apagada
const APAGADA = {
    get activa() { return false; }, get estado() { return 'fuera'; }, intentar: () => false, actualizar() {},
    alternarVista: () => false, pararse() {}, saltar() {}, forzar: () => false, pausar() {}, irA() {}, setIdioma() {}
};

export function crearRondaIglu(ctx) {
    const { grupo, dy, jugador, camara, camaras, misiones, amigos, escenas, terreno, skin, puede, bloquear, liberar, hud, lienzo } = ctx;
    let idioma = ctx.idioma || 'es';
    const L = o => (o ? o[idioma] || o.es : '');
    const iglu = amigos.iglu;
    const I = (terreno.lugares || []).find(l => l.clave === 'iglu');
    if (!iglu || !I) return APAGADA;

    // ---------------------------------------------------------
    // Geometría: cojín en el lado del fondo del iglú, a 1,8 del punto medio entre Moisés y Lalo
    // ---------------------------------------------------------
    const piso = I.y;                                 // suelo del iglú (coordenadas del creativo)
    const CX = I.bx + 0.5, CZ = I.bz + 0.5;           // centro de la cúpula
    const mo = iglu.moises, ln = iglu.lalo;
    const mitad = { x: (mo.x + ln.x) / 2, z: (mo.z + ln.z) / 2 };
    const ex = ln.x - mo.x, ez = ln.z - mo.z, lon = Math.hypot(ex, ez);
    let px = -ez / lon, pz = ex / lon;
    if (pz > 0) { px = -px; pz = -pz; }               // hacia el fondo (−z)
    const COJIN = { x: mitad.x + px * 1.8, z: mitad.z + pz * 1.8 };
    const personas = { lalo: ln, moises: mo };

    // Cojín: dos cajas de lana (no es un bloque del mapa)
    const tinte = crearTinte();
    const cojinG = new THREE.Group();
    const base = caja(0.92, 0.2, 0.92, tinte.caras(lana([170, 44, 40], 9001, 0.72)));
    base.position.y = 0.1;
    const relleno = caja(0.8, 0.08, 0.8, tinte.caras(lana([198, 68, 60], 9002, 0.8)));
    relleno.position.y = 0.24;
    cojinG.add(base, relleno);
    cojinG.position.set(COJIN.x, piso, COJIN.z);
    grupo.add(cojinG);

    // Pose de reposo de Lalo y Moisés (la fijó amigos.js al crearlos): se restaura al terminar
    const reposo = new Map();
    for (const n of [mo, ln]) {
        const p = n.p;
        reposo.set(n, { y: p.cuerpo.position.y, cx: p.cuerpo.rotation.x, cz: p.cuerpo.rotation.z, pD: p.piernaD.rotation.x, pI: p.piernaI.rotation.x, pDz: p.piernaD.rotation.z, pIz: p.piernaI.rotation.z, yaw: n.yaw });
    }

    // ---------------------------------------------------------
    // Estado
    // ---------------------------------------------------------
    let estado = 'fuera';            // fuera | sentando | sentado | parando
    let t = 0, tp = 0;               // s desde que te sientas · s desde que empiezas a pararte
    let peso = 0;                    // 0 de pie → 1 sentado
    let primera = false;             // vista en primera persona
    let pausada = false;
    let bodyYaw = 0;                 // hacia dónde mira el cuerpo (formato de jugador.yaw)
    let volarse = 0;                 // 0 → 1: mecido y saturación
    let banco = 'general';
    let plan = null, planN = -1;
    const estadoMano = { pito: 'lalo', bong: 'moises' };
    const origen = { pito: new THREE.Vector3(), bong: new THREE.Vector3() };
    const reaccion = { lalo: 0, moises: 0 }; // segundos de tos de cada uno
    let tosJ = 0;                    // segundos de tos del jugador
    const usadas = new Set();
    const mira = new THREE.Vector3(); let miraViva = false;
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    let dentroAntes = false, saturacionAntes = '';
    let arrastre = null;
    const reducirMovimiento = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // Globos propios (los de Lalo y Moisés se callan con n.escena)
    const globos = { lalo: crearGlobo(grupo), moises: crearGlobo(grupo), j: crearGlobo(grupo) };
    const ultimoTexto = { lalo: '', moises: '', j: '' };

    const esVenjy = () => tipoSkin(skin()).base === 'venjy';
    const otro = q => (q === 'lalo' ? 'moises' : 'lalo');
    const elegirLinea = bank => {
        const libres = bank.filter(l => !usadas.has(l.es));
        const lista = libres.length ? libres : bank;
        const l = lista[Math.floor(Math.random() * lista.length)];
        usadas.add(l.es);
        return l;
    };
    // Cada vuelta: pito y bong cambian de manos (pito: Lalo → Moisés → Lalo…; bong al revés)
    function planVuelta(n) {
        const pitoH = n % 2 === 0 ? 'lalo' : 'moises';
        const bongH = n % 2 === 0 ? 'moises' : 'lalo';
        const bank = CHARLA[banco];
        return {
            n, pitoH, pitoR: otro(pitoH), bongH, bongR: otro(bongH), yia: Math.random() < 0.4,
            l1: elegirLinea(bank.lalo), l2: elegirLinea(bank.moises), hechos: {}
        };
    }
    const relRonda = () => (t - ENTRADA) - plan.n * VUELTA;

    // ---------------------------------------------------------
    // Objetos (pito y bong): en la mano de alguien o volando entre dos manos
    // ---------------------------------------------------------
    // Posición de la mano de quien (grupo local). quien: 'lalo' | 'moises' | 'j'
    function manoDe(quien, nombre, v) {
        if (quien === 'j') {
            const c = camaras.cuerpo;
            c.g.updateMatrixWorld(true);
            if (nombre === 'pito') c.brazoD.localToWorld(v.set(...iglu.POS_PITO)); else c.cuerpo.localToWorld(v.set(...REPOSO_BONG_J));
        } else {
            const n = personas[quien];
            n.p.g.updateMatrixWorld(true);
            if (nombre === 'pito') n.p.brazoD.localToWorld(v.set(...iglu.POS_PITO)); else n.p.cuerpo.localToWorld(v.set(...n.reposoBong));
        }
        return grupo.worldToLocal(v);
    }
    function enMano(nombre, quien) {
        if (quien === 'j') {
            const c = camaras.cuerpo, g = iglu[nombre].g;
            if (nombre === 'pito') { c.brazoD.add(g); g.position.set(...iglu.POS_PITO); g.rotation.set(-0.6, 0, 0); }
            else { c.cuerpo.add(g); g.position.set(...REPOSO_BONG_J); g.rotation.set(0, 0, 0); }
        } else iglu.tomar(personas[quien], nombre);
        estadoMano[nombre] = quien;
    }
    // Segmento de la vuelta en el que está cada objeto
    function segObjeto(nombre, r, p) {
        if (nombre === 'pito') {
            if (r < TL.pitoIda[1]) return { vuelo: true, de: p.pitoH, a: 'j', u: r / TL.pitoIda[1] };
            if (r < TL.pitoPasa[0]) return { quien: 'j' };
            if (r < TL.pitoPasa[1]) return { vuelo: true, de: 'j', a: p.pitoR, u: tramo(r, TL.pitoPasa[0], TL.pitoPasa[1]) };
            return { quien: p.pitoR };
        }
        if (r < TL.bongIda[0]) return { quien: p.bongH };
        if (r < TL.bongIda[1]) return { vuelo: true, de: p.bongH, a: 'j', u: tramo(r, TL.bongIda[0], TL.bongIda[1]) };
        if (r < TL.bongPasa[0]) return { quien: 'j' };
        if (r < TL.bongPasa[1]) return { vuelo: true, de: 'j', a: p.bongR, u: tramo(r, TL.bongPasa[0], TL.bongPasa[1]) };
        return { quien: p.bongR };
    }
    function aplicarObjetos(r) {
        for (const nombre of ['pito', 'bong']) {
            const s = segObjeto(nombre, r, plan);
            if (!s.vuelo) { if (estadoMano[nombre] !== s.quien) enMano(nombre, s.quien); continue; }
            const g = iglu[nombre].g;
            if (g.parent !== grupo) grupo.attach(g);   // conserva la posición en el mundo
            estadoMano[nombre] = 'vuelo';
            const a = manoDe(s.de, nombre, vA), b = manoDe(s.a, nombre, vB);
            g.position.copy(a).lerp(b, suave(s.u));
            g.position.y += Math.sin(s.u * Math.PI) * 0.35;
        }
    }

    // ---------------------------------------------------------
    // Lalo y Moisés (gancho n.escena de amigos.js: se llama cada cuadro en vez de su animación)
    // ---------------------------------------------------------
    // Quién habla ahora: 'lalo' | 'moises' | null
    function hablante() {
        if (estado === 'parando' || estado === 'fuera') return null;
        if (t < 0.4) return null;
        if (t < 2.3) return 'lalo';
        if (t < ENTRADA) return 'moises';
        if (!plan) return null;
        const r = relRonda();
        if (r >= TL.charlaL[0] && r < TL.charlaL[1]) return 'lalo';
        if (!plan.yia && r >= TL.charlaM[0] && r < TL.charlaM[1]) return 'moises';
        return null;
    }
    function poseIglu(n, dt) {
        if (estado === 'fuera') return;
        const esL = n === ln, nombre = esL ? 'lalo' : 'moises', otroN = esL ? mo : ln;
        const p = n.p, base0 = reposo.get(n);
        const enRonda = (estado === 'sentando' || estado === 'sentado') && t >= ENTRADA && plan;
        const r = enRonda ? relRonda() : -1;
        // Brazos en reposo (las manos en los bolsillos del polerón de Lalo; Moisés, con las manos sueltas)
        let bD = -0.3, bDz = esL ? 0.32 : 0.12, bI = -0.3, bIz = esL ? -0.32 : -0.12, cX = 0, subida = 0;
        // Saludo: Lalo 0,4–2,3 · Moisés 2,4–4,2
        if ((estado === 'sentando' || estado === 'sentado') && t < ENTRADA) {
            const [a, b] = esL ? [0.4, 2.3] : [2.4, 4.2];
            const w = envolvente(t, a, b, 0.35);
            bD = lerp(bD, -2.6, w); bDz = lerp(bDz, -0.3 + Math.sin(t * 9) * 0.35, w);
        }
        if (r >= 0) {
            // Pasar o recibir el pito y el bong: el brazo se estira hacia el objeto
            if (plan.pitoH === nombre) { const w = envolvente(r, 0, 1.4, 0.3); bD = lerp(bD, -1.35, w); bDz = lerp(bDz, 0.1, w); }
            if (plan.pitoR === nombre) { const w = envolvente(r, 5.4, 6.9, 0.3); bD = lerp(bD, -1.2, w); bDz = lerp(bDz, 0.1, w); }
            if (plan.bongH === nombre) { const w = envolvente(r, 6.6, 8.0, 0.3); bD = lerp(bD, -0.9, w); }
            if (plan.bongR === nombre) { const w = envolvente(r, 13.2, 14.8, 0.3); bD = lerp(bD, -0.9, w); }
            // Hablar con la mano (gesto de charla)
            const hablaYo = (nombre === 'lalo' && r >= TL.charlaL[0] && r < TL.charlaL[1]) || (nombre === 'moises' && !plan.yia && r >= TL.charlaM[0] && r < TL.charlaM[1]);
            if (hablaYo) {
                const w = envolvente(r, nombre === 'lalo' ? TL.charlaL[0] : TL.charlaM[0], nombre === 'lalo' ? TL.charlaL[1] : TL.charlaM[1], 0.25);
                bD = lerp(bD, -0.95 + Math.sin(r * 5) * 0.3, w); bDz = lerp(bDz, 0.25 + Math.sin(r * 3.1) * 0.15, w);
            }
            // ¡YIAAAAAA!: brazos arriba y cabeza atrás (Lalo además salta)
            if (plan.yia) {
                const w = envolvente(r, TL.charlaM[0], TL.charlaM[1], 0.3), s = Math.sin(r * 18) * 0.15;
                bD = lerp(bD, -2.85 + s, w); bDz = lerp(bDz, -0.35, w);
                bI = lerp(bI, -2.85 - s, w); bIz = lerp(bIz, 0.35, w);
                cX = lerp(cX, -0.35, w);
                if (esL) subida = Math.abs(Math.sin(r * 6)) * 0.25 * w;
            }
        }
        // Mirada: al otro si es quien habla; si no, a ti
        const h = hablante();
        const tx = h && h !== nombre ? otroN.x : jugador.pos.x, tz = h && h !== nombre ? otroN.z : jugador.pos.z;
        const giro = lim(angulo(Math.atan2(tx - n.x, tz - n.z) - n.yaw), -1.1, 1.1);
        p.cuello.rotation.y += (giro - p.cuello.rotation.y) * Math.min(1, dt * 5);
        p.cuello.rotation.x += (cX - p.cuello.rotation.x) * Math.min(1, dt * 6);
        // Tos (después de fumar)
        if (reaccion[nombre] > 0) {
            reaccion[nombre] = Math.max(0, reaccion[nombre] - dt);
            p.cuerpo.rotation.x = base0.cx + Math.max(0, Math.sin(reaccion[nombre] * (esL ? 26 : 22))) * (esL ? 0.3 : 0.18);
        } else p.cuerpo.rotation.x = base0.cx;
        p.cuerpo.position.y = base0.y + subida;
        p.brazoD.rotation.x = bD; p.brazoD.rotation.z = bDz;
        p.brazoI.rotation.x = bI; p.brazoI.rotation.z = bIz;
    }

    // ---------------------------------------------------------
    // Tú: cuerpo sentado, brazos, cabeza, objetos y humo
    // ---------------------------------------------------------
    // Humo: emitir() espera coordenadas de `grupo` (las criaturas viven ahí, subidas dy)
    const bocaJugador = () => {
        const c = camaras.cuerpo;
        c.g.updateMatrixWorld(true);
        return grupo.worldToLocal(c.cabeza.localToWorld(vC.set(0, -0.08, 0.3)));
    };
    function toser(fuerza) {
        tosJ = fuerza > 1 ? 2.0 : 1.2;
        iglu.tos(1, fuerza);
    }
    function poseJugador(r, dt) {
        const c = camaras.cuerpo, k = peso;
        let bD = -0.5, bDz = 0.12, bI = -0.5, bIz = -0.12, cX = 0, subeBong = 0, cY = 0;
        if (r >= 0) {
            // Recibir el pito (brazo estirado) y subirlo a la boca: 1,2–2,0; aspiras 2,0–3,4; bajas 3,4–4,1
            const w1 = envolvente(r, 0, TL.pitoIda[1] + 0.05, 0.25);
            bD = lerp(bD, -1.35, w1); bDz = lerp(bDz, 0.1, w1);
            const subePito = suave(tramo(r, TL.pitoSube[0], TL.pitoSube[1])) * (1 - suave(tramo(r, TL.pitoBaja[0], TL.pitoBaja[1])));
            bD = lerp(bD, -1.95, subePito); bDz = lerp(bDz, 0.62, subePito);
            cX = lerp(cX, -0.35, envolvente(r, TL.pitoExhala[0] - 0.1, TL.pitoExhala[1] + 0.1, 0.4));
            // Pasar el pito 5,4–6,9
            const w2 = envolvente(r, 5.4, 6.9, 0.3); bD = lerp(bD, -1.35, w2); bDz = lerp(bDz, 0.1, w2);
            // Recibir el bong 6,6–8,0
            const w3 = envolvente(r, 6.6, 8.0, 0.3); bD = lerp(bD, -1.0, w3); bDz = lerp(bDz, 0.1, w3);
            // Fumar el bong: sube 7,9–8,6 · aspira · baja 10,6–11,1 (los dos brazos sostienen el bong)
            subeBong = suave(tramo(r, TL.bongSube[0], TL.bongSube[1])) * (1 - suave(tramo(r, TL.bongBaja[0], TL.bongBaja[1])));
            bD = lerp(bD, -1.15, subeBong); bDz = lerp(bDz, 0.42, subeBong);
            bI = lerp(bI, -1.0, subeBong); bIz = lerp(bIz, -0.4, subeBong);
            cX = lerp(cX, -0.3, envolvente(r, TL.bongBaja[0], TL.bongExhala[1] + 0.1, 0.4));
            // Pasar el bong 13,2–14,8
            const w4 = envolvente(r, 13.2, 14.8, 0.3); bD = lerp(bD, -1.0, w4); bDz = lerp(bDz, 0.1, w4);
            // ¡YIAAAAAA!: brazos arriba
            if (plan.yia) {
                const w = envolvente(r, TL.charlaM[0], TL.charlaM[1], 0.3), s = Math.sin(r * 18) * 0.15;
                bD = lerp(bD, -2.85 + s, w); bDz = lerp(bDz, -0.35, w);
                bI = lerp(bI, -2.85 - s, w); bIz = lerp(bIz, 0.35, w);
                cX = lerp(cX, -0.35, w);
            }
        }
        // Tos: sacudones del torso
        let inc = 0;
        if (tosJ > 0) { tosJ = Math.max(0, tosJ - dt); inc = Math.max(0, Math.sin(tosJ * 24)) * 0.3; }
        // Cabeza hacia quien habla (o al centro del triángulo)
        const h = hablante();
        const tx = h === 'lalo' ? ln.x : h === 'moises' ? mo.x : mitad.x, tz = h === 'lalo' ? ln.z : h === 'moises' ? mo.z : mitad.z;
        const giro = lim(angulo(Math.atan2(tx - jugador.pos.x, tz - jugador.pos.z) - (bodyYaw + Math.PI)), -1, 1);
        cY = giro;
        c.cuerpo.position.y = lerp(0, Y_SENTADO, k);
        c.cuerpo.rotation.x = inc; c.cuerpo.rotation.z = 0;
        c.piernaD.rotation.x = lerp(0, PIERNAS_SENT, k); c.piernaI.rotation.x = lerp(0, PIERNAS_SENT + 0.1, k);
        c.brazoD.rotation.x = bD; c.brazoD.rotation.z = bDz;
        c.brazoI.rotation.x = bI; c.brazoI.rotation.z = bIz;
        c.cuello.rotation.x = cX;
        c.cuello.rotation.y += (cY - c.cuello.rotation.y) * Math.min(1, dt * 5);
        c.cuello.rotation.z = 0;
        // Bong: sube a la boca al fumar; pito: brasa encendida mientras aspiras
        if (estadoMano.bong === 'j') {
            iglu.bong.g.position.set(lerp(REPOSO_BONG_J[0], BONG_ARRIBA[0], subeBong), lerp(REPOSO_BONG_J[1], BONG_ARRIBA[1], subeBong), lerp(REPOSO_BONG_J[2], BONG_ARRIBA[2], subeBong));
            iglu.bong.g.rotation.x = lerp(0, -0.15, subeBong);
        }
        const aspiraBong = r >= TL.bongAspira[0] && r < TL.bongAspira[1];
        const aspiraPito = r >= TL.pitoAspira[0] && r < TL.pitoAspira[1];
        iglu.pito.brasa.material.color.setHex(aspiraPito ? 0xff5a10 : 0x993300);
        iglu.bong.brasa.material.color.setHex(aspiraBong && Math.sin(t * 20) > -0.5 ? 0xff7a1a : 0x552200);
        iglu.bong.agua.position.y = 0.07 + (aspiraBong ? Math.sin(t * 40) * 0.01 : 0);
    }
    // Sonidos, burbujas y humo de la vuelta (una sola vez por vuelta cada efecto)
    function efectos(r, dt) {
        const h = plan.hechos;
        const una = (k, cuando, f) => { if (!h[k] && r >= cuando) { h[k] = true; f(); } };
        una('burbujas', TL.bongAspira[0], () => iglu.burbujas(1.2, 2.0));
        una('tosPito', TL.pitoExhala[0] + 0.4, () => { if (Math.random() < 0.5) toser(1); });
        una('tosBong', TL.bongExhala[0] + 0.3, () => toser(2));
        una('tosLalo', TL.bongExhala[0] + 0.8, () => { iglu.tos(1.2, 2); reaccion.lalo = 1.0; });
        const exhala = (r >= TL.pitoExhala[0] && r < TL.pitoExhala[1]) || (r >= TL.bongExhala[0] && r < TL.bongExhala[1]);
        const yaw = bodyYaw;
        if (exhala && Math.random() < dt * 14) {
            const b = bocaJugador();
            iglu.emitir(b.x, b.y, b.z, { s: 0.22, dur: 2.6, vy: 0.35, vx: -Math.sin(yaw) * 0.5, vz: -Math.cos(yaw) * 0.5 });
        }
        if (r >= TL.bongAspira[0] && r < TL.bongAspira[1] && Math.random() < dt * 6) {
            camaras.cuerpo.g.updateMatrixWorld(true);
            const b = grupo.worldToLocal(iglu.bong.g.localToWorld(vC.set(0, 0.6, 0)));
            iglu.emitir(b.x, b.y, b.z, { s: 0.1, dur: 0.8, vy: 0.2 });
        }
    }

    // ---------------------------------------------------------
    // Globos: saludo y charla de los tres (YIA: los tres a la vez)
    // ---------------------------------------------------------
    function textosAhora() {
        const g = { lalo: '', moises: '', j: '' };
        if (estado !== 'sentando' && estado !== 'sentado') return g;
        if (t < ENTRADA) {
            const h = hablante();
            if (h) g[h] = L(SALUDO[banco][h]);
        } else if (plan) {
            const r = relRonda();
            if (r >= TL.charlaL[0] && r < TL.charlaL[1]) g.lalo = L(plan.l1);
            if (r >= TL.charlaM[0] && r < TL.charlaM[1]) {
                if (plan.yia) g.lalo = g.moises = g.j = L(YIA);
                else g.moises = L(plan.l2);
            }
        }
        return g;
    }
    function actualizarGlobos(dt) {
        const txt = textosAhora();
        const pos = {
            lalo: [ln.x, ln.y + 2.15 + 0.6, ln.z],
            moises: [mo.x, mo.y + 2.1, mo.z],
            j: [jugador.pos.x, jugador.pos.y - dy + 2.0, jugador.pos.z]
        };
        for (const k of ['lalo', 'moises', 'j']) {
            const visible = !!txt[k] && !(k === 'j' && primera);
            if (visible && txt[k] !== ultimoTexto[k]) { globos[k].decir(txt[k]); ultimoTexto[k] = txt[k]; }
            if (!visible) ultimoTexto[k] = '';
            globos[k].actualizar(dt, visible, pos[k][0], pos[k][1], pos[k][2]);
        }
    }

    // ---------------------------------------------------------
    // Cámara: cine de tres (planos 'trio') o primera persona sobre tu cuerpo sentado
    // ---------------------------------------------------------
    const ancla = () => ({ x: mitad.x, y: piso, z: mitad.z, escala: 0.8 });
    function focoCamara(r) {
        const h = hablante();
        if (r >= TL.pitoExhala[0] && r < TL.pitoExhala[1] || r >= TL.bongSube[0] && r < TL.bongExhala[1]) return vC.set(jugador.pos.x, jugador.pos.y + 1.3, jugador.pos.z);
        if (h === 'lalo') return vC.set(ln.x, ln.y + dy + 1.9, ln.z);
        if (h === 'moises') return vC.set(mo.x, mo.y + dy + 1.3, mo.z);
        return vC.set((jugador.pos.x + mitad.x) / 2, jugador.pos.y + 1.2, (jugador.pos.z + mitad.z) / 2);
    }

    // ---------------------------------------------------------
    // Estado: sentarse, ronda, pararse, terminar
    // ---------------------------------------------------------
    function cercaCojin() {
        const p = jugador.pos;
        return Math.hypot(p.x - COJIN.x, p.z - COJIN.z) < 1.9 && Math.abs(p.y - (piso + dy)) < 2;
    }
    function dentroIglu() {
        const p = jugador.pos;
        return Math.hypot(p.x - CX, p.z - CZ) < 4.6 && Math.abs(p.y - (piso + dy)) < 2.5;
    }
    function sentarse() {
        bloquear();
        iglu.terminarPase();
        iglu.devolver(mo, ln);                     // cada uno con lo suyo: bong → Moisés, pito → Lalo
        estadoMano.pito = 'lalo'; estadoMano.bong = 'moises';
        ln.escena = (dt) => poseIglu(ln, dt);
        mo.escena = (dt) => poseIglu(mo, dt);
        jugador.colocar(COJIN.x, piso + dy, COJIN.z);
        bodyYaw = Math.atan2(mitad.x - COJIN.x, mitad.z - COJIN.z) - Math.PI;
        jugador.yaw = bodyYaw; jugador.pitch = 0;
        banco = esVenjy() ? 'venjy' : 'general';
        estado = 'sentando'; t = 0; tp = 0; peso = 0; primera = false;
        plan = null; planN = -1; volarse = 0; miraViva = false; tosJ = 0;
        reaccion.lalo = reaccion.moises = 0;
        camaras.iniciarCine(ancla(), { escena: true, fundido: 0.45, evitar: [ln, mo], planos: 'trio' });
        misiones.ocultarMarcas = true;
        document.body.classList.remove('en-iglu');
        document.body.classList.add('en-ronda');
    }
    // Pararse: 1 s; los objetos vuelan a sus dueños desde donde estén
    function pararse() {
        if (estado === 'fuera' || estado === 'parando') return;
        if (primera) alternarVista(false);
        for (const nombre of ['pito', 'bong']) {
            const g = iglu[nombre].g;
            if (g.parent !== grupo) grupo.attach(g);
            origen[nombre].copy(g.position);
            estadoMano[nombre] = 'vuelo';
        }
        estado = 'parando'; tp = 0;
    }
    function terminar() {
        iglu.terminarPase();
        iglu.devolver(mo, ln);
        for (const n of [mo, ln]) {
            delete n.escena;
            const r = reposo.get(n), p = n.p;
            p.cuerpo.position.y = r.y; p.cuerpo.rotation.x = r.cx; p.cuerpo.rotation.z = r.cz;
            p.piernaD.rotation.x = r.pD; p.piernaI.rotation.x = r.pI; p.piernaD.rotation.z = r.pDz; p.piernaI.rotation.z = r.pIz;
            p.cuello.rotation.set(0, 0, 0);
            n.yaw = r.yaw;
        }
        const c = camaras.cuerpo;
        c.cuerpo.position.y = 0; c.cuerpo.rotation.x = 0; c.cuerpo.rotation.z = 0;
        for (const h of [c.brazoD, c.brazoI, c.piernaD, c.piernaI, c.cuello]) { h.rotation.x = 0; h.rotation.z = 0; }
        c.cuello.rotation.y = 0;
        c.cuello.visible = c.torso.visible = c.piernaD.visible = c.piernaI.visible = true;
        camaras.terminarCine();
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-ronda', 'en-ronda-fp');
        if (lienzo) lienzo.style.filter = '';
        estado = 'fuera'; primera = false; volarse = 0; plan = null; planN = -1;
        for (const k of ['lalo', 'moises', 'j']) { globos[k].actualizar(0, false, 0, 0, 0); ultimoTexto[k] = ''; }
        liberar();
    }
    function alternarVista(v = !primera) {
        if (estado !== 'sentando' && estado !== 'sentado') return false;
        if (v === primera) return primera;
        primera = v;
        jugador.yaw = bodyYaw; jugador.pitch = 0;      // sin salto: mira hacia donde estabas sentado
        if (primera) {
            camaras.terminarCine();
            document.body.classList.add('en-ronda-fp');
            if (lienzo && lienzo.requestPointerLock) { const r = lienzo.requestPointerLock(); if (r && r.catch) r.catch(() => {}); }
        } else {
            document.body.classList.remove('en-ronda-fp');
            if (document.pointerLockElement) document.exitPointerLock();
            camaras.iniciarCine(ancla(), { escena: true, fundido: 0.3, evitar: [ln, mo], planos: 'trio' });
        }
        return primera;
    }
    function intentar() {
        if (estado === 'parando') return false;
        if (estado !== 'fuera') { pararse(); return true; }
        if (!puede() || !cercaCojin()) return false;
        // Venjy: primero la escena de skin del iglú (la marca escenas-skin.js en misiones.estado.escenasSkin)
        const vistas = misiones.estado.escenasSkin;
        if (esVenjy() && !(vistas.has('lalo') && vistas.has('moises')) && escenas.antesDeHablar('lalo')) return true;
        sentarse();
        return true;
    }

    // ---------------------------------------------------------
    // Botones (DOM: también en celular, donde los táctiles se ocultan durante las escenas)
    // ---------------------------------------------------------
    const contenedor = document.createElement('div');
    contenedor.className = 'ronda-botones';
    function boton(clase, alPulsar) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'boton ' + clase;
        b.addEventListener('click', e => { e.preventDefault(); alPulsar(); });
        contenedor.appendChild(b);
        return b;
    }
    const bSentar = boton('ronda-sentar', () => intentar());
    const bPararse = boton('ronda-pararse', () => pararse());
    const bCam = boton('ronda-cam', () => alternarVista());
    document.body.appendChild(contenedor);

    // ---------------------------------------------------------
    // Teclas y arrastre para mirar (si no hay puntero bloqueado)
    // ---------------------------------------------------------
    document.addEventListener('keydown', e => {
        if (estado !== 'sentando' && estado !== 'sentado') return;
        if (e.repeat) return;
        if (e.code === 'Escape') { e.preventDefault(); pararse(); }
        else if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) pararse();
    });
    document.addEventListener('pointerdown', e => {
        if (!primera || !lienzo || e.target !== lienzo) return;
        arrastre = { x: e.clientX, y: e.clientY };
    });
    document.addEventListener('pointermove', e => {
        if (!arrastre || document.pointerLockElement) return;
        const dx = e.clientX - arrastre.x, dyy = e.clientY - arrastre.y;
        arrastre = { x: e.clientX, y: e.clientY };
        jugador.yaw -= dx * (jugador.sensibilidad || 0.0025);
        jugador.pitch = lim(jugador.pitch - dyy * (jugador.sensibilidad || 0.0025), -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    });
    document.addEventListener('pointerup', () => { arrastre = null; });

    // ---------------------------------------------------------
    // Bucle
    // ---------------------------------------------------------
    function actualizar(dt) {
        if (pausada) dt = 0;
        if (estado === 'fuera') {
            const dentro = dentroIglu(), ok = dentro && !!puede();
            document.body.classList.toggle('en-iglu', ok);
            if (dentro && !dentroAntes && puede()) hud.mensaje(TXT[idioma].aviso, 4.5);
            dentroAntes = dentro;
            volarse = Math.max(0, volarse - dt * 0.6);
            actualizarGlobos(dt);
            return;
        }
        dentroAntes = true;
        const c = camaras.cuerpo;
        if (estado === 'parando') {
            tp += dt;
            peso = 1 - suave(tramo(tp, 0, PARAR));
            const u = suave(tramo(tp, 0, PARAR));
            for (const nombre of ['pito', 'bong']) {
                const g = iglu[nombre].g, quien = nombre === 'pito' ? 'lalo' : 'moises';
                const a = origen[nombre], b = manoDe(quien, nombre, vB);
                g.position.copy(a).lerp(b, u);
                g.position.y += Math.sin(u * Math.PI) * 0.3;
            }
            volarse = Math.max(0, volarse - dt * 0.6);
            if (tp >= PARAR) { terminar(); return; }
        } else {
            if (!pausada) t += dt;
            peso = suave(lim(t / SENTAR, 0, 1));
            if (t >= ENTRADA) {
                const n = Math.floor((t - ENTRADA) / VUELTA);
                if (n !== planN) { plan = planVuelta(n); planN = n; }
            }
            const r = t >= ENTRADA && plan ? relRonda() : -1;
            if (r >= 0) { aplicarObjetos(r); efectos(r, dt); }
            volarse = t >= DOS_VUELTAS ? lim((t - DOS_VUELTAS) / 10, 0, 1) : 0;
            poseJugador(r, dt);
        }

        // Cuerpo del jugador a la vista (en primera persona también: se ven los brazos y los objetos)
        c.g.position.set(jugador.pos.x, jugador.pos.y, jugador.pos.z);
        c.g.rotation.y = bodyYaw + Math.PI;
        c.g.visible = true;
        const fp = primera;
        c.cuello.visible = c.torso.visible = c.piernaD.visible = c.piernaI.visible = !fp;

        // Cámara
        const r = estado === 'parando' || t < ENTRADA || !plan ? -1 : relRonda();
        if (primera) {
            const f = 0.12;
            camara.position.set(jugador.pos.x - Math.sin(bodyYaw) * f, jugador.pos.y + lerp(1.62, 1.36, peso), jugador.pos.z - Math.cos(bodyYaw) * f);
            camara.rotation.set(jugador.pitch, jugador.yaw, 0, 'YXZ');
        } else if (camaras.enCine) {
            const foco = focoCamara(r);
            if (!miraViva) { mira.copy(foco); miraViva = true; }
            mira.lerp(foco, Math.min(1, dt * 2.5));
            camara.lookAt(mira);
        }
        // Mecido y saturación (poco, y solo si llevas dos vueltas)
        if (volarse > 0.01 && !reducirMovimiento()) camara.rotateZ(Math.sin(t * 0.55) * 0.018 * volarse);
        if (lienzo) {
            const f = volarse > 0.01 ? `saturate(${(1 + 0.25 * volarse).toFixed(3)})` : '';
            if (f !== saturacionAntes) { lienzo.style.filter = f; saturacionAntes = f; }
        }
        actualizarGlobos(dt);
    }

    bSentar.textContent = TXT[idioma].sentar; bPararse.textContent = TXT[idioma].pararse; bCam.textContent = TXT[idioma].cam;
    return {
        actualizar,
        intentar,
        alternarVista,
        pararse,
        saltar: () => { if (estado === 'sentando' || estado === 'sentado' || estado === 'parando') terminar(); },
        get activa() { return estado !== 'fuera'; },
        get estado() { return estado; },
        setIdioma(l) {
            idioma = l;
            bSentar.textContent = TXT[idioma].sentar; bPararse.textContent = TXT[idioma].pararse; bCam.textContent = TXT[idioma].cam;
        },
        // Depuración (capturas): sentarse ya, pausar el reloj, ir a un segundo de la sesión
        forzar() { if (estado !== 'fuera' || escenas.activa) return false; sentarse(); return true; },
        pausar(v = true) { pausada = v; },
        irA(s) { if (estado === 'sentando' || estado === 'sentado') t = Math.max(0, s); },
        cercaCojin: () => cercaCojin(),
        get cojin() { return { x: COJIN.x, y: piso, z: COJIN.z }; },
        get banco() { return banco; }
    };
}
