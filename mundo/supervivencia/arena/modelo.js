// =========================================================
// VENJY · Arena del duelo · reglas (bloque 8 · L1, mundo/COMBATE.md §19.1, §19.4, §19.5 y §19.7)
// Puro: sin Three.js ni DOM. La pelea corre a paso fijo (60 Hz, combate/estados.js) y este módulo la arbitra:
//   reglasArena(datos)                   arena.json fundido sobre ARENA (lo que falte usa el código)
//   nuevaPelea(R, opciones)              dos peleadores en sus puntos de entrada; f[0] es el tuyo (siempre a la izquierda
//                                        de la pantalla: la cámara se pone de su lado) y f[1] el rival
//   pasoPelea(P, [i0, i1])               un cuadro: intenciones → estados.paso → movimiento en el eje → empuje entre
//                                        cuerpos → paredes → golpes → animación → reloj y rondas. Deja en P.eventos lo
//                                        que pasó ({ tipo: 'golpe' | 'ronda' | 'peleen' | 'ko' | 'tiempo' | 'final', … })
//   empezarRondas(P)                     después de la entrada: «Ronda 1» → «¡Peleen!»
//   intencionPractica(P, i)              el rival de práctica de L1 (se acerca y tira el tajo cada tanto; L4 trae la CPU)
//   crearCamara(R) / pasoCamara(C, P, dt, aspecto)   cámara de lado al eje del duelo (§19.4): { pos, mira, fov }
//   encuadre(cam, puntos, aspecto)       ¿todos los puntos caen dentro de la imagen? (las pruebas y el Estudio)
//   puntosCuerpo(F)                      pies y cabeza de un peleador, para medir el encuadre
// Fases de la pelea: 'entrada' (caminan a su marca) → 'anuncio' («Ronda N», luego «¡Peleen!») → 'pelea' → 'ko' o
// 'tiempo' (finRonda) → 'anuncio' de la siguiente o 'final'. Coordenadas: centro de la arena en (0, 0), eje largo X,
// yaw 0 = mira hacia +Z (como cuerpo.js y estados.alcanza).
// =========================================================
import * as E from '../combate/estados.js';
import * as A from '../combate/animacion.js';
import { COMBATE, faseEn } from '../combate/datos.js';

const t = (es, en) => ({ es, en });
// Valores base (arena.json los ajusta; Estudio → Arena)
export const ARENA = {
    nivelDuelo: 2,
    peleadores: {
        lalo: { nombre: t('Lalo', 'Lalo'), titulo: t('El Ronin', 'The Ronin'), estilo: 'prueba', vida: 100, postura: 100, aura: '#e8c050', carta: null, frases: {} },
        moises: { nombre: t('Moisés', 'Moisés'), titulo: t('El de la Calle', 'The Street'), estilo: 'prueba', vida: 100, postura: 100, aura: '#5aa0ff', carta: 'moises', frases: {} }
    },
    rondas: { mejorDe: 3, segundos: 60, maxRondas: 5, anuncio: 1.3, peleen: 0.9, finRonda: 2.2, lentaKo: 0.6, escalaLenta: 0.35 },
    escenario: {
        tipo: 'lago', nombre: t('Lago congelado', 'Frozen Lake'), largo: 14, ancho: 8, pared: { alto: 1.5, grosor: 1 },
        fogatas: [[-6.2, -3.2], [6.2, -3.2], [-6.2, 3.2], [6.2, 3.2]], barriles: [],
        nieve: { cantidad: 500, viento: [0.6, 0.15], caida: 1.1, radio: 14 },
        luz: { cielo: '#9ab4d8', suelo: '#3a4a66', ambiente: 0.55, fogata: '#ff9a40', fogataFuerza: 1.6, parpadeo: 0.25, niebla: '#b8c8e0', nieblaCerca: 16, nieblaLejos: 46 },
        hielo: { color: '#a8d4f0', grietas: 18, brillo: 0.35 }
    },
    publico: { personas: [], distancia: 1.6, gestos: [] },
    marcas: { separacion: 3.2, x: 0, z: 0 },
    movimiento: { radio: 0.35, distanciaMin: 0.7, duro: 0.45, empuje: 0.35, reorientar: 6, giroEje: 75 },
    camara: { fov: 50, altura: 1.45, mira: 1.0, inclinacion: 8, distanciaMin: 3.5, distanciaMax: 8, margen: 1.1, resorte: 0.25, giroMax: 90, adelanto: 0.25, separacionMin: 3 },
    planos: {},
    entrada: { guion: 'duelo-reto', viaje: 2.4, vs: 3, vuelo: 4, ventisca: 1.1, vuelos: [], caminarMarca: 1.1 },
    vs: { retrato: '3d', tambor: true, diagonal: 12 },
    practica: { ataqueCada: [1.4, 2.6], alcance: 2.1, acercarse: 0.8 },
    golpe: { hitstop: 'ligero', bloqueoDano: 0.15 },
    hud: { vida: '#d83a2a', vidaFondo: '#3a0c0c', vidaPerdida: '#ffd040', reloj: '#ffff55', ronda: '#ffff55', anchoVida: 38, retrato: 44 },
    premios: { amistad: true, primeraVictoria: {} },
    dificultades: ['facil', 'normal', 'dificil', 'maestro'],
    textos: {}
};

const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
// Como datos.js: un objeto se funde por clave; un arreglo o un valor del JSON reemplaza al del código si es del mismo tipo
function fundir(base, extra) {
    if (!objeto(extra)) return JSON.parse(JSON.stringify(base));
    const o = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(extra)])) {
        const b = base[k], e = extra[k];
        if (e === undefined) o[k] = objeto(b) || Array.isArray(b) ? JSON.parse(JSON.stringify(b)) : b;
        else if (objeto(b) && objeto(e)) o[k] = fundir(b, e);
        else if (b === undefined || b === null || e === null || typeof e === typeof b) o[k] = objeto(e) || Array.isArray(e) ? JSON.parse(JSON.stringify(e)) : e;
        else o[k] = b; // tipo equivocado: vale el del código
    }
    return o;
}
export const reglasArena = datos => fundir(ARENA, datos);

const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const HZ = () => COMBATE.motor.hz;
// Generador con semilla (el rival de práctica es determinista)
export function azar(semilla) {
    let s = semilla >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let q = s; q = Math.imul(q ^ (q >>> 15), q | 1); q ^= q + Math.imul(q ^ (q >>> 7), q | 61); return ((q ^ (q >>> 14)) >>> 0) / 4294967296; };
}

// ---------- Pelea ----------
// opciones: { estilos: { lalo: estilo, … } (estilo-*.json ya leído), yo: clave del tuyo, rival: clave, dificultad,
//             tactil, semilla, aspecto }
export function nuevaPelea(R, { estilos, yo = 'lalo', rival = 'moises', dificultad = 'normal', tactil = false, semilla = 1, aspecto = 16 / 9 } = {}) {
    const P = {
        R, dificultad, tactil, rnd: azar(semilla), aspecto,
        f: [crearF(R, estilos, yo, 0, tactil), crearF(R, estilos, rival, 1, tactil)],
        fase: 'entrada', c: 0, ronda: 0, rondasJugadas: 0, victorias: [0, 0], reloj: R.rondas.segundos,
        ganadorRonda: null, ganador: undefined, eventos: [], cola: [], cuadros: 0, practica: { espera: 0 }
    };
    colocar(P, true);
    return P;
}
function crearF(R, estilos, clave, i, tactil) {
    const d = R.peleadores[clave] || {};
    const estilo = (estilos && (estilos[clave] || estilos[d.estilo])) || null;
    return {
        clave, i, estilo, d,
        p: E.crearPeleador(estilo, { tactil: i === 0 && tactil }), an: A.crearAnimador(estilo),
        x: 0, z: 0, yaw: 0, vx: 0, vz: 0, vida: d.vida || 100, vidaMax: d.vida || 100,
        empuje: 0, enActivo: false, pego: false, marca: 0,
        pose: {}, poseAnt: {}
    };
}
// En sus marcas (inicio de ronda) o en el punto de entrada, más afuera, para que caminen a la marca
function colocar(P, entrada) {
    const R = P.R, m = R.marcas, s = m.separacion / 2;
    const extra = entrada ? R.entrada.caminarMarca * velocidadPaso(P.f[0]) : 0;
    P.f.forEach((F, i) => {
        const lado = i === 0 ? -1 : 1;
        F.marca = m.x + lado * s;
        F.x = m.x + lado * (s + extra); F.z = m.z; F.yaw = lado < 0 ? Math.PI / 2 : -Math.PI / 2;
        F.vx = F.vz = 0; F.empuje = 0; F.enActivo = F.pego = false;
        F.vida = F.vidaMax; F.p = E.crearPeleador(F.estilo, { tactil: F.p.tactil }); F.an = A.crearAnimador(F.estilo);
        limitar(P, F);
        animarF(P, F, null); animarF(P, F, null);
    });
}
const velocidadPaso = F => (F.estilo && F.estilo.paso && F.estilo.paso.velocidad) || 1.2;

export function empezarRondas(P) { siguienteRonda(P, false); }
function siguienteRonda(P, recolocar) {
    if (recolocar) colocar(P, false);
    P.ronda++; P.fase = 'anuncio'; P.c = 0; P.reloj = P.R.rondas.segundos; P.ganadorRonda = null;
    P.cola.push({ tipo: 'ronda', n: P.ronda, final: esFinal(P) }); // (sale en P.eventos del cuadro que sigue)
}
const necesarias = P => Math.ceil(P.R.rondas.mejorDe / 2);
// La ronda que decide: los dos quedan a una victoria de ganar (o es la última que cabe)
const esFinal = P => (P.victorias[0] === necesarias(P) - 1 && P.victorias[1] === necesarias(P) - 1) || P.rondasJugadas + 1 >= P.R.rondas.maxRondas;

export function pasoPelea(P, intenciones = []) {
    P.eventos.length = 0;
    if (P.cola.length) P.eventos.push(...P.cola.splice(0));
    P.cuadros++;
    const hz = HZ(), R = P.R;
    const libre = P.fase === 'pelea';
    // Fuera de la pelea nadie ataca: en la entrada caminan a la marca y en el anuncio esperan en guardia
    const it = P.f.map((F, i) => {
        if (P.fase === 'entrada') return { mover: [Math.abs(F.x - F.marca) > 0.03 ? 1 : 0, 0] };
        return libre ? intenciones[i] || {} : {};
    });
    const eje0 = Math.atan2(P.f[1].z - P.f[0].z, P.f[1].x - P.f[0].x);
    for (let i = 0; i < 2; i++) {
        const F = P.f[i], O = P.f[1 - i];
        E.paso(F.p, it[i]);
        mover(P, F, O);
    }
    girarEje(P, eje0);
    separar(P);
    for (const F of P.f) limitar(P, F);
    if (libre) for (let i = 0; i < 2; i++) golpes(P, P.f[i], P.f[1 - i]);
    for (const F of P.f) animarF(P, F, P.f[1 - F.i]);
    // Reloj y rondas
    P.c++;
    if (P.fase === 'entrada') {
        if (P.f.every(F => Math.abs(F.x - F.marca) <= 0.03) || P.c > hz * (R.entrada.caminarMarca * 3 + 1)) P.listaEntrada = true;
    } else if (P.fase === 'anuncio') {
        if (P.c === Math.round(R.rondas.anuncio * hz)) P.eventos.push({ tipo: 'peleen' });
        if (P.c >= Math.round((R.rondas.anuncio + R.rondas.peleen) * hz)) { P.fase = 'pelea'; P.c = 0; }
    } else if (P.fase === 'pelea') {
        P.reloj = Math.max(0, P.reloj - 1 / hz);
        const caidos = P.f.map(F => F.vida <= 0);
        if (caidos[0] || caidos[1]) terminarRonda(P, 'ko', caidos[0] && caidos[1] ? null : caidos[0] ? 1 : 0);
        else if (P.reloj <= 0) {
            const pc = P.f.map(F => F.vida / F.vidaMax);
            terminarRonda(P, 'tiempo', Math.abs(pc[0] - pc[1]) < 1e-9 ? null : pc[0] > pc[1] ? 0 : 1);
        }
    } else if (P.fase === 'ko' || P.fase === 'tiempo') {
        if (P.c >= Math.round(R.rondas.finRonda * hz)) {
            const n = necesarias(P);
            if (P.victorias[0] >= n || P.victorias[1] >= n || P.rondasJugadas >= R.rondas.maxRondas) {
                P.fase = 'final'; P.c = 0;
                P.ganador = P.victorias[0] === P.victorias[1] ? null : P.victorias[0] > P.victorias[1] ? 0 : 1;
                P.eventos.push({ tipo: 'final', ganador: P.ganador });
            } else siguienteRonda(P, true);
        }
    }
    return P;
}
function terminarRonda(P, como, ganador) {
    P.fase = como; P.c = 0; P.rondasJugadas++; P.ganadorRonda = ganador;
    if (ganador != null) P.victorias[ganador]++;
    P.eventos.push({ tipo: como, ganador });
}

// ---------- Movimiento en el eje (§19.5) ----------
// p.mov = [adelante, lado] en bloques; lado + = hacia el fondo de la pantalla, que para los dos es su izquierda
// (los dos se miran y la cámara está del lado de f[0]), así que no depende de quién es quién.
function mover(P, F, O) {
    const [a, l] = F.p.mov, s = Math.sin(F.yaw), c = Math.cos(F.yaw);
    let dx = a * s + l * c, dz = a * c - l * s;
    // Empuje de un golpe recibido: se reparte en unos cuadros, hacia atrás en el eje
    if (F.empuje > 1e-4) {
        const k = F.empuje * 0.3; F.empuje -= k;
        const ux = F.x - O.x, uz = F.z - O.z, d = Math.hypot(ux, uz) || 1;
        dx += ux / d * k; dz += uz / d * k;
    }
    F.x += dx; F.z += dz;
    F.vx = dx * HZ(); F.vz = dz * HZ();
    // Siempre se miran: en los estados libres el cuerpo gira hacia el rival en `reorientar` cuadros; en una acción
    // queda comprometido hacia donde la empezó
    const objetivo = Math.atan2(O.x - F.x, O.z - F.z);
    if (E.LIBRES.has(F.p.estado) || P.fase !== 'pelea') F.yaw = angulo(F.yaw + angulo(objetivo - F.yaw) / Math.max(1, P.R.movimiento.reorientar));
}
// El paso lateral orbita al rival (como en Tekken): el eje gira a lo más giroEje °/s, menos que la cámara (giroMax),
// así que la cámara siempre lo alcanza y el tuyo nunca cambia de lado en la imagen, ni cuerpo a cuerpo
function girarEje(P, eje0) {
    const [a, b] = P.f, tope = P.R.movimiento.giroEje * Math.PI / 180 / HZ();
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d < 1e-6) return;
    const giro = angulo(Math.atan2(dz, dx) - eje0);
    if (Math.abs(giro) <= tope) return;
    // Lo corrige quien se movió de lado (el que más se desplazó en este cuadro), girando alrededor del otro
    const ma = Math.hypot(a.vx, a.vz), mb = Math.hypot(b.vx, b.vz);
    const eje = eje0 + Math.sign(giro) * tope;
    if (mb >= ma) { b.x = a.x + Math.cos(eje) * d; b.z = a.z + Math.sin(eje) * d; }
    else { a.x = b.x - Math.cos(eje) * d; a.z = b.z - Math.sin(eje) * d; }
}
// A menos de distanciaMin se separan suave; nunca a menos de `duro`. Y no se alejan más de lo que la cámara encuadra.
function separar(P) {
    const M = P.R.movimiento, [a, b] = P.f;
    let ux = b.x - a.x, uz = b.z - a.z, d = Math.hypot(ux, uz);
    if (d < 1e-6) { ux = 1; uz = 0; d = 1e-6; } else { ux /= d; uz /= d; }
    let corr = 0;
    if (d < M.duro) corr = M.duro - d + Math.max(0, M.distanciaMin - M.duro) * M.empuje;
    else if (d < M.distanciaMin) corr = (M.distanciaMin - d) * M.empuje;
    if (corr > 0) { a.x -= ux * corr / 2; a.z -= uz * corr / 2; b.x += ux * corr / 2; b.z += uz * corr / 2; }
    const max = separacionMax(P.R, P.aspecto);
    if (d > max) {
        // Lo devuelve quien se alejó (lo que cada uno se movió hacia afuera en el eje); si no se sabe, mitad y mitad
        const sa = Math.max(0, -(a.vx * ux + a.vz * uz)), sb = Math.max(0, b.vx * ux + b.vz * uz);
        const ka = sa + sb > 1e-9 ? sa / (sa + sb) : 0.5, exceso = d - max;
        a.x += ux * exceso * ka; a.z += uz * exceso * ka; b.x -= ux * exceso * (1 - ka); b.z -= uz * exceso * (1 - ka);
    }
}
function limitar(P, F) {
    const e = P.R.escenario, r = P.R.movimiento.radio;
    F.x = lim(F.x, -e.largo / 2 + r, e.largo / 2 - r);
    F.z = lim(F.z, -e.ancho / 2 + r, e.ancho / 2 - r);
}

// ---------- Golpes (el tajo de prueba de L1; los estilos de verdad, L2 y L5) ----------
function golpes(P, F, O) {
    const p = F.p, def = p.def;
    const activo = p.estado === 'ataque' && def && def.fases && faseEn(def.fases, p.c).fase === 'activo';
    if (!activo) { F.enActivo = false; return; }
    if (!F.enActivo) { F.enActivo = true; F.pego = false; }
    if (F.pego || !E.alcanza(def, F, O)) return;
    F.pego = true;
    const { resultado } = E.recibir(O.p, { reaccion: def.reaccion, altura: def.altura, peligro: def.peligro });
    const peso = COMBATE.peso || {}, pg = peso[def.hitstop] || peso[P.R.golpe.hitstop] || {};
    let dano = 0, hit = pg.hitstop || 0;
    if (resultado === 'golpeado') { dano = def.dano || 0; E.conecto(p); O.empuje += def.empuje != null ? def.empuje : pg.empuje || 0; }
    else if (resultado === 'bloqueado') { dano = (def.dano || 0) * P.R.golpe.bloqueoDano; E.reaccionar(p, 'bloqueado'); O.empuje += (pg.empuje || 0) * 0.5; }
    else if (resultado === 'desviado') { E.reaccionar(p, 'desviado'); hit = (peso.desvio && peso.desvio.hitstop) || hit; }
    if (resultado !== 'esquivado' && resultado !== 'sinEfecto' && hit > 0) { E.congelar(p, hit); E.congelar(O.p, hit); }
    O.vida = Math.max(0, O.vida - dano);
    P.eventos.push({ tipo: 'golpe', de: F.i, a: O.i, resultado, dano, clave: p.clave, fuerza: dano / Math.max(1, O.vidaMax) });
}

// ---------- Animación ----------
function animarF(P, F, O) {
    const mirada = O ? angulo(Math.atan2(O.x - F.x, O.z - F.z) - F.yaw) : 0;
    const o = A.animar(F.an, F.p, { t: P.cuadros / HZ(), raiz: { x: F.x, z: F.z, yaw: F.yaw }, mirada });
    const ant = F.poseAnt; F.poseAnt = F.pose; F.pose = ant;
    for (const k in F.pose) if (!(k in o)) delete F.pose[k];
    Object.assign(F.pose, o);
}

// ---------- Rival de práctica (L1) ----------
// Se acerca hasta su alcance y tira el ataque de su botón atacar cada ataqueCada s (al azar con semilla); nunca durante
// tu hitstop ni mientras tú estás en el suelo de una reacción. La CPU de verdad (§19.6) llega en L4.
export function intencionPractica(P, i = 1) {
    const F = P.f[i], O = P.f[1 - i], Q = P.R.practica, hz = HZ();
    if (P.fase !== 'pelea') return {};
    const d = Math.hypot(O.x - F.x, O.z - F.z);
    const it = { mover: [d > Q.alcance ? Q.acercarse : 0, 0] };
    if (P.practica.espera <= 0) P.practica.espera = Math.round(hz * (Q.ataqueCada[0] + P.rnd() * Math.max(0, Q.ataqueCada[1] - Q.ataqueCada[0])));
    if (P.practica.espera > 1) P.practica.espera--;
    else if (d <= Q.alcance + 0.2 && E.LIBRES.has(F.p.estado) && O.p.congelado === 0 && !F.p.quieto) { it.atacar = 'apretar'; P.practica.espera = 0; }
    return it;
}

// ---------- Cámara de lado al eje (§19.4) ----------
const RAD = Math.PI / 180;
const tanH = (fov, aspecto) => Math.tan(fov * RAD / 2) * aspecto;
// Lo más lejos que pueden estar los dos sin que la cámara (a su distancia máxima) pierda a uno
export function separacionMax(R, aspecto = 16 / 9) {
    const C = R.camara;
    return Math.max(C.separacionMin, 2 * (C.distanciaMax * tanH(C.fov, aspecto) - C.margen));
}
export function crearCamara(R) { return { R, phi: null, dist: R.camara.distanciaMin, cx: 0, cz: 0, ux: 1, uz: 0 }; }
// phi: hacia dónde está la cámara desde el centro (0 = +Z). La normal al eje se elige para que f[0] quede a la
// izquierda de la imagen; la cámara gira hacia ella con resorte y un tope de giroMax °/s (nunca un giro brusco).
export function pasoCamara(C, P, dt, aspecto = 16 / 9) {
    const K = C.R.camara, [a, b] = P.f;
    // Ronda nueva: los dos vuelven a su marca y la cámara corta con ellos (lo tapa el anuncio)
    if (C.ronda !== P.ronda) { C.ronda = P.ronda; C.listo = false; C.phi = null; }
    let ux = b.x - a.x, uz = b.z - a.z;
    const s = Math.hypot(ux, uz);
    if (s > 0.25) { C.ux = ux / s; C.uz = uz / s; } // muy juntos: el eje de antes (no tiembla)
    const objetivo = Math.atan2(-C.uz, C.ux); // n = (−uz, ux)
    const k = 1 - Math.exp(-dt / Math.max(1e-3, K.resorte));
    if (C.phi == null) C.phi = objetivo;
    else C.phi += lim(angulo(objetivo - C.phi) * k, -K.giroMax * RAD * dt, K.giroMax * RAD * dt);
    // Centro: el punto medio, adelantado hacia donde va el que se mueve
    const mx = (a.x + b.x) / 2 + (a.vx + b.vx) / 2 * K.adelanto, mz = (a.z + b.z) / 2 + (a.vz + b.vz) / 2 * K.adelanto;
    const tH = tanH(K.fov, aspecto);
    const quiere = lim((s / 2 + K.margen) / tH, K.distanciaMin, K.distanciaMax);
    if (C.listo) { C.cx += (mx - C.cx) * k; C.cz += (mz - C.cz) * k; C.dist += (quiere - C.dist) * k; }
    else { C.cx = mx; C.cz = mz; C.dist = quiere; C.listo = true; }
    // Distancia: encuadra a los dos con su margen (resorte); y nunca menos de lo que hace falta para no perder a
    // nadie, medido desde el centro real de la cámara (con el radio del cuerpo y lo que se acerca a la lente)
    const nx = Math.sin(C.phi), nz = Math.cos(C.phi), r = C.R.movimiento.radio, holgura = 0.15;
    for (const F of P.f) {
        const lado = Math.abs((F.x - C.cx) * nz - (F.z - C.cz) * nx) + r + holgura;
        const hacia = (F.x - C.cx) * nx + (F.z - C.cz) * nz + r; // lo que el cuerpo se acerca a la cámara
        C.dist = Math.max(C.dist, lado / tH + hacia);
    }
    return vistaCamara(C);
}
function vistaCamara(C) {
    const K = C.R.camara, nx = Math.sin(C.phi), nz = Math.cos(C.phi), inc = K.inclinacion * RAD;
    const y = Math.max(K.altura, K.mira + C.dist * Math.tan(inc));
    const pos = [C.cx + nx * C.dist, y, C.cz + nz * C.dist];
    return { pos, mira: [C.cx, y - C.dist * Math.tan(inc), C.cz], fov: K.fov };
}
// Proyección en una cámara { pos, mira, fov } (vertical, grados): true si todos los puntos [x, y, z] caen dentro
export function encuadre(cam, puntos, aspecto = 16 / 9, holgura = 0) {
    const f = [cam.mira[0] - cam.pos[0], cam.mira[1] - cam.pos[1], cam.mira[2] - cam.pos[2]];
    const n = Math.hypot(...f); f[0] /= n; f[1] /= n; f[2] /= n;
    let r = [-f[2], 0, f[0]]; const nr = Math.hypot(...r); r = r.map(v => v / nr); // derecha = adelante × arriba
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const tv = Math.tan(cam.fov * RAD / 2), th = tv * aspecto;
    let peor = 0;
    for (const p of puntos) {
        const d = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
        const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
        if (z <= 0.05) return { dentro: false, peor: Infinity };
        const x = (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / (z * th), y = (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / (z * tv);
        peor = Math.max(peor, Math.abs(x), Math.abs(y));
    }
    return { dentro: peor <= 1 - holgura, peor };
}
// Lo que tiene que verse de un peleador: los pies a cada lado (su radio) y la cabeza
export function puntosCuerpo(F, R) {
    const r = R.movimiento.radio;
    return [[F.x - r, 0, F.z], [F.x + r, 0, F.z], [F.x, 0, F.z - r], [F.x, 0, F.z + r], [F.x - r, 1.9, F.z], [F.x + r, 1.9, F.z]];
}
// ¿Dónde queda f[0] en la imagen? (−1 izquierda … +1 derecha): f[0] nunca cambia de lado
export function ladoEnImagen(cam, x, z) {
    const fx = cam.mira[0] - cam.pos[0], fz = cam.mira[2] - cam.pos[2];
    return (x - cam.pos[0]) * -fz + (z - cam.pos[2]) * fx;
}
