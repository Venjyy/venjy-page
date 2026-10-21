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
//   intencionPractica(P, i)              el rival de práctica (repite practica.patron: tajos seguidos y golpes cargados,
//                                        y desvía uno de cada desviaCada ataques tuyos; L4 trae la CPU)
// Postura y desvío (L2, combate/postura.js con estilo-*.json → reglas): cada peleador tiene F.post; los golpes la suben
// según la tabla del estilo del que recibe, baja sola con calma y al tope deja al peleador desequilibrado.
// Peso y reacciones (N5, combate/peso.js): cada golpe trae su nivel (ligero … remate) y su reacción (la del ataque o
// la de combate.json → elegir, subida por el nivel y por las leves acumuladas, en espejo si llega por la derecha);
// durante el hitstop el que recibe tiembla (F.temblor, [dx, dz] que la escena suma al dibujarlo); empujado contra
// una pared rebota (reacción `pared`). Eventos nuevos: 'golpe' trae nivel, reaccion, material y eje; 'polvo' (caídas,
// pared, esquivas; con su trauma), 'aire' (empieza el activo de un ataque), 'pared' y 'prueba' (muñeco).
//   muñeco de práctica: nuevaPelea(R, { muneco: true }) → el rival no ataca ni se defiende, no cae y no corre el
//   reloj; probarReaccion(P, i, clave) le hace jugar una reacción (para mirarlas una por una)
// Peligrosos, mikiri, golpe final y arte (L3, combate/peligro.js con estilo-*.json → reglas.peligro, mikiri, remate y
// espiritu): los ataques con `peligro` avisan (evento 'peligro') y se defienden según la tabla de §16.4; esquivar
// hacia el rival durante su estocada es mikiri (evento 'mikiri'); atacar al desequilibrado a tu alcance es el golpe
// final (evento 'remate'); las acciones con `pareja` mueven al rival a su reacción y le dan postura y daño; el arte
// cuesta espíritu (F.esp, lo llenan los desvíos). avisoPeligro(P, i): el aviso de f[i] en este cuadro. Otros eventos:
// 'envainar' (efectos.envainar del golpe final) y 'sinEspiritu'.
//   crearCamara(R) / pasoCamara(C, P, dt, aspecto)   cámara de lado al eje del duelo (§19.4): { pos, mira, fov }
//   encuadre(cam, puntos, aspecto)       ¿todos los puntos caen dentro de la imagen? (las pruebas y el Estudio)
//   puntosCuerpo(F)                      pies y cabeza de un peleador, para medir el encuadre
// Fases de la pelea: 'entrada' (caminan a su marca) → 'anuncio' («Ronda N», luego «¡Peleen!») → 'pelea' → 'ko' o
// 'tiempo' (finRonda) → 'anuncio' de la siguiente o 'final'. Coordenadas: centro de la arena en (0, 0), eje largo X,
// yaw 0 = mira hacia +Z (como cuerpo.js y estados.alcanza).
// =========================================================
import * as G from '../combate/peligro.js';
import * as E from '../combate/estados.js';
import * as A from '../combate/animacion.js';
import * as S from '../combate/postura.js';
import * as W from '../combate/peso.js';
import { EFECTOS } from './efectos.js';
import { COMBATE, faseEn, inicioFase, accionDe, marca } from '../combate/datos.js';

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
        tipo: 'lago', superficie: 'nieve', nombre: t('Lago congelado', 'Frozen Lake'), largo: 14, ancho: 8, pared: { alto: 1.5, grosor: 1 },
        fogatas: [[-6.2, -3.2], [6.2, -3.2], [-6.2, 3.2], [6.2, 3.2]], barriles: [],
        nieve: { cantidad: 500, viento: [0.6, 0.15], caida: 1.1, radio: 14 },
        luz: { cielo: '#9ab4d8', suelo: '#3a4a66', ambiente: 0.55, fogata: '#ff9a40', fogataFuerza: 1.6, parpadeo: 0.25, niebla: '#b8c8e0', nieblaCerca: 16, nieblaLejos: 46 },
        hielo: { color: '#a8d4f0', grietas: 18, brillo: 0.35 }
    },
    publico: { personas: [], distancia: 1.6, gestos: [] },
    marcas: { separacion: 3.2, x: 0, z: 0 },
    movimiento: { radio: 0.35, distanciaMin: 0.7, duro: 0.45, empuje: 0.35, reorientar: 6, giroEje: 75 },
    camara: {
        fov: 50, altura: 1.45, mira: 1.0, inclinacion: 8, distanciaMin: 3.5, distanciaMax: 8, margen: 1.1, resorte: 0.25, giroMax: 90, adelanto: 0.25, separacionMin: 3,
        // Golpe final (L3, S13): plano de cine bajo que gira alrededor de los dos (s; bloques; grados; fov)
        remate: { duracion: 1.6, distancia: 3.4, altura: 0.75, mira: 1.0, giro: 70, desde: 25, fov: 40 }
    },
    planos: {},
    entrada: { guion: 'duelo-reto', viaje: 2.4, vs: 3, vuelo: 4, ventisca: 1.1, vuelos: [], caminarMarca: 1.1 },
    vs: { retrato: '3d', tambor: true, diagonal: 12 },
    practica: { ataqueCada: [1.4, 2.6], alcance: 2.1, acercarse: 0.8, patron: [], desviaCada: 0, peligros: [], peligroCada: 0 },
    muneco: { recupera: 2, reacciones: [] }, // muñeco de práctica (N5): s sin golpes para recuperar la vida; orden de «probar» (vacío = todas)
    golpe: { hitstop: 'ligero', bloqueoDano: 0.15 },
    hud: {
        vida: '#d83a2a', vidaFondo: '#3a0c0c', vidaPerdida: '#ffd040', reloj: '#ffff55', ronda: '#ffff55', anchoVida: 38, retrato: 44, postura: '#ffb030', posturaAlta: '#ff4a20', posturaFondo: '#2a1a08', anchoPostura: 22,
        espiritu: '#7ad8ff', espirituFondo: '#10222a' // segmentos del arte de combate (L3)
    },
    premios: { amistad: true, primeraVictoria: {} },
    efectos: EFECTOS, // chispas, destello del perfecto, brillo de la carga y escalones de la estela (arena/efectos.js)
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
export function nuevaPelea(R, { estilos, yo = 'lalo', rival = 'moises', dificultad = 'normal', tactil = false, semilla = 1, aspecto = 16 / 9, muneco = false } = {}) {
    const P = {
        R, dificultad, tactil, rnd: azar(semilla), aspecto, muneco,
        f: [crearF(R, estilos, yo, 0, tactil), crearF(R, estilos, rival, 1, tactil)],
        fase: 'entrada', c: 0, ronda: 0, rondasJugadas: 0, victorias: [0, 0], reloj: R.rondas.segundos,
        ganadorRonda: null, ganador: undefined, eventos: [], cola: [], cuadros: 0, practica: nuevaPractica()
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
        empuje: 0, enActivo: false, pego: false, marca: 0, post: S.crearPostura(S.reglasPostura(estilo), d.postura || 100),
        pel: G.reglasPeligro(estilo), esp: null,
        acc: W.crearAcumulador(), tiembla: null, temblor: [0, 0], calma: 0,
        pose: {}, poseAnt: {}
    };
}
const conEspiritu = F => { F.esp = G.crearEspiritu(F.pel); return F; };
// En sus marcas (inicio de ronda) o en el punto de entrada, más afuera, para que caminen a la marca
function colocar(P, entrada) {
    const R = P.R, m = R.marcas, s = m.separacion / 2;
    const extra = entrada ? R.entrada.caminarMarca * velocidadPaso(P.f[0]) : 0;
    P.f.forEach((F, i) => {
        const lado = i === 0 ? -1 : 1;
        F.marca = m.x + lado * s;
        F.x = m.x + lado * (s + extra); F.z = m.z; F.yaw = lado < 0 ? Math.PI / 2 : -Math.PI / 2;
        F.vx = F.vz = 0; F.empuje = 0; F.enActivo = F.pego = false; F.tiembla = null; F.temblor = [0, 0]; W.soltarAcumulador(F.acc);
        F.vida = F.vidaMax; F.p = E.crearPeleador(F.estilo, { tactil: F.p.tactil }); F.an = A.crearAnimador(F.estilo);
        F.post = S.crearPostura(F.post.R, F.post.tope); conEspiritu(F);
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
        if (libre) it[i] = antesDelPaso(P, F, O, it[i]);
        // Cada toque de defensa abre la ventana de su desvío (con la penalización por repetir)
        if (libre && it[i].defensa === 'apretar') S.tocarDefensa(F.post, P.cuadros, F.p.tactil);
        E.paso(F.p, it[i]);
        if (libre) despuesDelPaso(P, F, O);
        mover(P, F, O);
        efectosAccion(P, F, O);
    }
    girarEje(P, eje0);
    separar(P);
    for (const F of P.f) pared(P, F, limitar(P, F));
    if (libre) for (let i = 0; i < 2; i++) golpes(P, P.f[i], P.f[1 - i]);
    for (const F of P.f) temblar(F);
    if (P.muneco && libre) munecoPaso(P, P.f[1]);
    if (libre) for (const F of P.f) postura(F);
    for (const F of P.f) animarF(P, F, P.f[1 - F.i]);
    // Reloj y rondas
    P.c++;
    if (P.fase === 'entrada') {
        if (P.f.every(F => Math.abs(F.x - F.marca) <= 0.03) || P.c > hz * (R.entrada.caminarMarca * 3 + 1)) P.listaEntrada = true;
    } else if (P.fase === 'anuncio') {
        if (P.c === Math.round(R.rondas.anuncio * hz)) P.eventos.push({ tipo: 'peleen' });
        if (P.c >= Math.round((R.rondas.anuncio + R.rondas.peleen) * hz)) { P.fase = 'pelea'; P.c = 0; }
    } else if (P.fase === 'pelea') {
        if (!P.muneco) P.reloj = Math.max(0, P.reloj - 1 / hz);
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
    if (Math.abs(F.empuje) > 1e-4) {
        const k = F.empuje * 0.3; F.empuje -= k; // (negativo = rebote de la pared, hacia el rival)
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
    const e = P.R.escenario, r = P.R.movimiento.radio, x = F.x, z = F.z;
    F.x = lim(F.x, -e.largo / 2 + r, e.largo / 2 - r);
    F.z = lim(F.z, -e.ancho / 2 + r, e.ancho / 2 - r);
    return F.x !== x || F.z !== z;
}
// Empujado contra la pared con fuerza (combate.json → elegir.pared): choca de espalda, hitstop extra y rebota
function pared(P, F, choco) {
    const Q = (COMBATE.elegir || {}).pared || {};
    if (!choco || !(F.empuje >= (Q.empuje ?? Infinity)) || !F.p.def || F.p.def.tipo !== 'reaccion') return;
    const k = Q.reaccion || 'pared';
    if (F.p.clave === k || !accionDe(F.p.estilo, k)) return;
    E.reaccionar(F.p, k);
    if (Q.hitstop) E.congelar(F.p, Q.hitstop);
    F.empuje = -(Q.rebote || 0);
    P.eventos.push({ tipo: 'pared', i: F.i, trauma: W.pesoDe('fuerte').trauma || 0 });
}
// Temblor del hitstop: mientras está congelado el que recibió el golpe, ±amplitud en el eje del golpe
function temblar(F) {
    if (F.tiembla && F.p.congelado > 0) F.temblor = W.temblor(F.tiembla.c++, F.tiembla.eje);
    else { F.tiembla = null; F.temblor[0] = F.temblor[1] = 0; }
}
// Lo que deja una acción en el suelo: polvo al empezar una esquiva y en las marcas de efectos.polvo (caídas, pared),
// y la capa del aire al empezar el activo de un ataque
function efectosAccion(P, F, O) {
    const p = F.p, def = p.def;
    for (const e of p.eventos) {
        const d = e.clave && accionDe(p.estilo, e.clave);
        if (!d) continue;
        if (e.tipo === 'inicio' && d.estado === 'esquiva') P.eventos.push({ tipo: 'polvo', i: F.i, motivo: 'esquiva', x: F.x, z: F.z, trauma: 0 });
        if (e.tipo === 'activo' && d.tipo === 'ataque') P.eventos.push({ tipo: 'aire', i: F.i, nivel: W.nivelDe(d, 'golpeado') });
        if (d.pareja && (e.tipo === 'inicio' || e.tipo === 'activo')) pareja(P, F, O, d, e.tipo);
    }
    if (p.quieto || !def) return;
    // Aviso del peligro (§16.4): una vez, `aviso` cuadros después de empezar la anticipación
    if (def.peligro && p.estado === 'ataque' && p.c === F.pel.peligro.aviso) P.eventos.push({ tipo: 'peligro', i: F.i, peligro: def.peligro, destello: F.pel.peligro.destello });
    const ef = def.efectos;
    if (!ef) return;
    if (ef.envainar != null && marca(ef.envainar, def.fases) === p.c) P.eventos.push({ tipo: 'envainar', i: F.i });
    if (ef.polvo) ef.polvo.forEach((m, n) => {
        if (marca(m, def.fases) === p.c) P.eventos.push({ tipo: 'polvo', i: F.i, motivo: 'caida', x: F.x, z: F.z, trauma: n === 0 ? ef.sacudida || 0 : 0 });
    });
}

// ---------- Ataques peligrosos, mikiri, golpe final y arte (L3, combate/peligro.js) ----------
// Antes del paso: el golpe final reemplaza al tajo si el rival está desequilibrado a su alcance, y el arte de combate
// no sale sin espíritu. Devuelve una copia de la intención (la de quien llama no se toca).
function antesDelPaso(P, F, O, it) {
    const ctl = (F.estilo && F.estilo.controles) || {};
    if (it.atacar === 'apretar' && G.puedeRematar(F.pel, F, O) && accionDe(F.p.estilo, F.pel.remate.accion)) {
        E.iniciar(F.p, F.pel.remate.accion);
        P.eventos.push({ tipo: 'remate', de: F.i, a: O.i });
        return { ...it, atacar: undefined };
    }
    const arte = ctl.especial && accionDe(F.p.estilo, ctl.especial);
    if (it.especial === 'apretar' && arte && arte.costo && arte.costo.espiritu > F.esp.valor + 1e-9) {
        P.eventos.push({ tipo: 'sinEspiritu', i: F.i });
        return { ...it, especial: undefined };
    }
    return it;
}
// Después del paso: lo que cuesta espíritu lo gasta al empezar; una esquiva hacia el rival durante su estocada es mikiri
function despuesDelPaso(P, F, O) {
    for (const e of F.p.eventos) {
        const d = e.tipo === 'inicio' && accionDe(F.p.estilo, e.clave);
        if (d && d.costo && d.costo.espiritu) G.gastarEspiritu(F.esp, d.costo.espiritu);
    }
    const ctl = (F.estilo && F.estilo.controles) || {};
    if (G.esMikiri(F.pel, F.p, O.p, ctl.esquivar) && accionDe(F.p.estilo, F.pel.mikiri.accion)) {
        F.p.eventos.length = 0;
        E.iniciar(F.p, F.pel.mikiri.accion); // (su inicio arma la pareja en efectosAccion: el rival pasa a «pisado»)
        P.eventos.push({ tipo: 'mikiri', de: F.i, a: O.i });
    }
}
// Animación de pareja (mikiri, golpe final): def.pareja = { rival, cuando, postura, dano, hitstop, nivel, resultado }.
// El rival pasa a su reacción al empezar (cuando: inicio) o en el activo; en el activo recibe postura y daño, los dos
// se congelan `hitstop` cuadros y sale un golpe con el peso de `nivel`.
function pareja(P, F, O, d, tipo) {
    const q = d.pareja;
    if (!O || E.TERMINALES.has(O.p.estado)) return;
    if ((q.cuando || 'activo') === tipo && q.rival && accionDe(O.p.estilo, q.rival)) { E.iniciar(O.p, q.rival); O.p.espejo = false; }
    if (tipo !== 'activo') return;
    const dano = q.dano || 0;
    O.vida = Math.max(P.muneco && O.i === 1 ? 1 : 0, O.vida - dano);
    if (q.postura) subir(P, O, q.postura);
    if (q.hitstop) { E.congelar(F.p, q.hitstop); E.congelar(O.p, q.hitstop); }
    W.soltarAcumulador(O.acc); O.calma = 0; O.post.calma = 0;
    const ux = O.x - F.x, uz = O.z - F.z, dd = Math.hypot(ux, uz) || 1;
    P.eventos.push({
        tipo: 'golpe', de: F.i, a: O.i, resultado: q.resultado || 'golpeado', dano, clave: F.p.clave, altura: d.altura || 'medio', carga: 0,
        fuerza: dano / Math.max(1, O.vidaMax), nivel: q.nivel || 'fuerte', reaccion: q.rival || null, material: q.material || 'carne', eje: [ux / dd, uz / dd], pareja: true
    });
}

// El aviso que se ve sobre la cabeza de f[i] en este cuadro (null si no hay)
export const avisoPeligro = (P, i) => G.avisoDe(P.f[i].p, P.f[i].pel);

// ---------- Golpes (L2: postura y desvío de combate/postura.js, con las reglas del que recibe) ----------
function golpes(P, F, O) {
    const p = F.p, def = p.def;
    const activo = p.estado === 'ataque' && def && def.fases && faseEn(def.fases, p.c).fase === 'activo';
    if (!activo) { F.enActivo = false; return; }
    if (!F.enActivo) { F.enActivo = true; F.pego = false; }
    if (F.pego || !E.alcanza(def, F, O)) return;
    F.pego = true;
    const RO = O.post.R;
    // La reacción que le tocaría si el golpe entra (cuenta en las leves acumuladas solo si entra)
    const acc = { leves: O.acc.leves, enReaccion: !!(O.p.def && O.p.def.tipo === 'reaccion') };
    let reaccion = W.reaccionPara(def, W.nivelDe(def, 'golpeado'), acc);
    if (!accionDe(O.p.estilo, reaccion)) reaccion = def.reaccion && accionDe(O.p.estilo, def.reaccion) ? def.reaccion : 'alto_leve';
    const espejo = W.ladoDe(def) < 0;
    const golpe = { reaccion, altura: def.altura, peligro: def.peligro, rompeGuardia: !!def.rompeGuardia };
    // El desvío se mide con la ventana del toque (con el ajuste del peligro) y después manda la tabla de §16.4
    const { resultado } = E.recibir(O.p, golpe, { alRecibir: (q, g, r) => G.responder(O.pel, q, g, S.clasificar(O.post, q, r, G.ajusteVentana(O.pel, g))) });
    if (resultado === 'golpeado') { O.acc.leves = acc.leves; O.p.espejo = espejo; }
    else if (resultado !== 'armadura') W.soltarAcumulador(O.acc);
    const peso = COMBATE.peso || {}, pg = peso[def.hitstop] || peso[P.R.golpe.hitstop] || {};
    const carga = 1 + (def.carga ? (def.carga.extra || 0) * E.cargaDe(p) : 0);
    let dano = 0, hit = pg.hitstop || 0;
    if (resultado === 'golpeado' || resultado === 'armadura') {
        dano = (def.dano || 0) * carga; E.conecto(p);
        if (resultado === 'golpeado') O.empuje += def.empuje != null ? def.empuje : pg.empuje || 0;
    } else if (resultado === 'bloqueado') {
        dano = (def.dano || 0) * (RO.bloqueoDano ?? P.R.golpe.bloqueoDano);
        E.reaccionar(p, 'bloqueado'); O.empuje += (pg.empuje || 0) * 0.5;
    } else if (resultado === 'desviado' || resultado === 'perfecto') {
        // El atacante rebota; el que desvía hace su choque (en el perfecto queda adelante) y empuja al atacante
        const pd = peso[resultado === 'perfecto' ? 'perfecto' : 'desvio'] || {};
        hit = pd.hitstop || hit;
        E.reaccionar(p, 'desviado');
        const choque = resultado === 'perfecto' ? RO.desvio.choquePerfecto || RO.desvio.choque : RO.desvio.choque;
        if (choque && accionDe(O.p.estilo, choque)) E.iniciar(O.p, choque);
        F.empuje += pd.empuje || 0;
    }
    if (resultado !== 'esquivado' && resultado !== 'sinEfecto' && hit > 0) {
        E.congelar(p, hit); E.congelar(O.p, hit);
        // El que recibe tiembla en el eje del golpe (del atacante hacia él)
        const ux = O.x - F.x, uz = O.z - F.z, dd = Math.hypot(ux, uz) || 1;
        O.tiembla = { c: 0, eje: [ux / dd, uz / dd] };
    }
    O.vida = Math.max(0, O.vida - dano);
    // Postura: lo que dice la tabla del que recibe para este resultado (la armadura del desequilibrado no suma).
    // posturaFija (pisotón, arte) se suma al rival aunque la bloquee; posturaPropia se suma (o resta) al que ataca.
    const T = RO.tabla[resultado], base = (def.postura || 0) * carga, conecta = resultado !== 'esquivado' && resultado !== 'sinEfecto';
    if (T) { subir(P, O, def.posturaFija != null ? 0 : base * (T.recibe || 0)); subir(P, F, base * (T.atacante || 0) + (T.extra || 0)); }
    if (conecta && def.posturaFija != null && resultado !== 'desviado' && resultado !== 'perfecto') subir(P, O, def.posturaFija);
    if (conecta && def.posturaPropia) { if (def.posturaPropia > 0) subir(P, F, def.posturaPropia); else if (!F.post.roto) F.post.valor = Math.max(0, F.post.valor + def.posturaPropia); }
    // Espíritu del arte de combate: lo llenan los desvíos del que defiende
    if (resultado === 'desviado' || resultado === 'perfecto') G.ganarEspiritu(O.esp, O.pel, resultado);
    // El agarre que entra sigue con su lanzamiento (animación de pareja del que agarra)
    if (resultado === 'golpeado' && def.alConectar && accionDe(p.estilo, def.alConectar)) E.iniciar(p, def.alConectar);
    O.post.calma = 0;
    if (P.muneco && O.i === 1) O.vida = Math.max(1, O.vida);
    O.calma = 0;
    // La hoja contra el cuerpo suena a carne; contra la hoja o la guardia, al material del arma (metal)
    const material = resultado === 'golpeado' || resultado === 'armadura' ? 'carne' : def.material || 'metal';
    P.eventos.push({
        tipo: 'golpe', de: F.i, a: O.i, resultado, dano, clave: p.clave, altura: def.altura, carga: E.cargaDe(p), fuerza: dano / Math.max(1, O.vidaMax),
        nivel: W.nivelDe(def, resultado), reaccion: resultado === 'golpeado' ? O.p.clave : null, material, eje: O.tiembla ? O.tiembla.eje : null
    });
}
// Suma postura; al tope, desequilibrado (la reacción del estilo o de combate.json) hasta que se recompone
function subir(P, F, n) {
    if (!S.sumar(F.post, n)) return;
    S.romper(F.post);
    const k = F.post.R.postura.desequilibrado;
    if (k && accionDe(F.p.estilo, k)) E.reaccionar(F.p, k);
    P.eventos.push({ tipo: 'postura', i: F.i });
}
function postura(F) {
    const s = F.post, k = s.R.postura.desequilibrado;
    if (s.roto && F.p.clave !== k) S.recomponer(s);
    S.pasoPostura(s, { vida: F.vida / F.vidaMax, bloqueo: F.p.estado === 'bloqueo', activo: F.p.estado === 'ataque' });
}

// ---------- Animación ----------
function animarF(P, F, O) {
    const mirada = O ? angulo(Math.atan2(O.x - F.x, O.z - F.z) - F.yaw) : 0;
    const o = A.animar(F.an, F.p, { t: P.cuadros / HZ(), raiz: { x: F.x, z: F.z, yaw: F.yaw }, mirada });
    const ant = F.poseAnt; F.poseAnt = F.pose; F.pose = ant;
    for (const k in F.pose) if (!(k in o)) delete F.pose[k];
    Object.assign(F.pose, o);
}

// ---------- Muñeco de práctica (N5) ----------
// No ataca ni se defiende; recupera la vida después de `recupera` s sin golpes y nunca cae
function munecoPaso(P, F) {
    F.calma++;
    if (F.calma >= Math.round((P.R.muneco.recupera || 0) * HZ())) F.vida = F.vidaMax;
}
// Las reacciones para probar en el muñeco: arena.json → muneco.reacciones, o todas las de combate.json
export function reaccionesMuneco(P) {
    const l = P.R.muneco.reacciones;
    return (l && l.length ? l : Object.keys(COMBATE.reacciones || {})).filter(k => accionDe(P.f[1].estilo, k));
}
export function probarReaccion(P, i, clave, { espejo = false } = {}) {
    const F = P.f[i];
    if (!accionDe(F.p.estilo, clave)) return false;
    E.reaccionar(F.p, clave);
    F.p.espejo = espejo;
    P.cola.push({ tipo: 'prueba', i, clave }); // (sale en P.eventos del cuadro que sigue)
    return true;
}

// ---------- Rival de práctica ----------
// Repite practica.patron (cada paso: «golpes» = tajos seguidos del combo, «fuerte» = cuadros que mantiene la carga,
// «accion» = un ataque por su clave, como los peligrosos),
// esperando ataqueCada s entre pasos (al azar con semilla); se acerca hasta su alcance y nunca empieza durante tu
// hitstop. Desvía uno de cada desviaCada ataques tuyos. Sin patrón tira su ataque de atacar, como en L1.
// La CPU de verdad (§19.6) llega en L4.
const nuevaPractica = () => ({ espera: 0, paso: 0, n: 0, peligro: 0, golpes: 0, serial: -1, fuerte: -1, visto: -1, cuenta: 0, desviar: false });
export function intencionPractica(P, i = 1) {
    const F = P.f[i], O = P.f[1 - i], Q = P.R.practica, hz = HZ(), pr = P.practica;
    if (P.fase !== 'pelea' || P.muneco) return {};
    const d = Math.hypot(O.x - F.x, O.z - F.z);
    const it = { mover: [d > Q.alcance ? Q.acercarse : 0, 0] };
    // Desvía uno de cada desviaCada ataques tuyos: toca defensa 6 cuadros antes del activo (un desvío normal)
    if (O.p.estado === 'ataque' && O.p.cambio.n !== pr.visto) { pr.visto = O.p.cambio.n; pr.cuenta++; pr.desviar = Q.desviaCada > 0 && pr.cuenta % Q.desviaCada === 0; }
    if (pr.desviar && O.p.estado === 'ataque' && O.p.def && E.LIBRES.has(F.p.estado) && O.p.c >= Math.max(0, inicioFase(O.p.def.fases, 'activo') - 6)) {
        it.defensa = 'apretar'; pr.desviar = false; return it;
    }
    // Un paso en curso: los tajos se encadenan (el buffer los suelta en la ventana del combo); la carga se mantiene
    if (pr.golpes > 0) {
        if (F.p.estado === 'ataque' && F.p.cambio.n !== pr.serial) { pr.serial = F.p.cambio.n; pr.golpes--; }
        if (pr.golpes > 0 && P.cuadros % 3 === 0) it.atacar = 'apretar';
        return it;
    }
    if (pr.fuerte >= 0) { it.fuerte = pr.fuerte-- > 0 ? 'mantener' : 'soltar'; return it; }
    if (pr.espera <= 0) pr.espera = Math.round(hz * (Q.ataqueCada[0] + P.rnd() * Math.max(0, Q.ataqueCada[1] - Q.ataqueCada[0])));
    if (pr.espera > 1) { pr.espera--; return it; }
    if (!(d <= Q.alcance + 0.2 && E.LIBRES.has(F.p.estado) && O.p.congelado === 0 && !F.p.quieto)) return it;
    pr.espera = 0;
    // Cada peligroCada pasos intercala un peligroso de la lista (los que su estilo tenga), en orden
    const pel = (Q.peligros || []).filter(k => accionDe(F.p.estilo, k)), toca = Q.peligroCada > 0 && pel.length && ++pr.n % (Q.peligroCada + 1) === 0;
    const lista = Q.patron || [], paso = toca ? { accion: pel[pr.peligro++ % pel.length] } : lista.length ? lista[pr.paso++ % lista.length] : { golpes: 1 };
    // accion: un ataque por su clave (los peligrosos de §16.4: barrido, estocada, agarre), si el estilo lo tiene
    if (paso.accion && accionDe(F.p.estilo, paso.accion)) it.accion = paso.accion;
    else if (paso.fuerte != null && F.estilo && F.estilo.controles && F.estilo.controles.fuerte) { it.fuerte = 'apretar'; pr.fuerte = paso.fuerte; }
    else { it.atacar = 'apretar'; pr.golpes = Math.max(1, paso.golpes || 1); pr.serial = -1; }
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
// Golpe final (S13): plano de cine bajo que orbita a los dos. u = 0..1 del plano; empieza del lado de la cámara de
// la pelea (desde ° hacia el que remata) y gira `giro` ° con una curva suave; se aleja si hace falta para encuadrarlos.
export function camaraRemate(R, P, de, a, u, aspecto = 16 / 9) {
    const K = R.camara.remate, F = P.f[de], O = P.f[a];
    const mx = (F.x + O.x) / 2, mz = (F.z + O.z) / 2;
    let ux = O.x - F.x, uz = O.z - F.z; const d = Math.hypot(ux, uz) || 1; ux /= d; uz /= d;
    const lado = de === 0 ? 1 : -1; // la cámara de la pelea mira desde la normal (−uz, ux) con f[0] a la izquierda
    const nx = -uz * lado, nz = ux * lado, k = Math.max(0, Math.min(1, u)), s = k * k * (3 - 2 * k);
    const th = (-(K.desde || 0) - (K.giro || 0) * s) * RAD;
    const dx = Math.cos(th) * nx + Math.sin(th) * ux, dz = Math.cos(th) * nz + Math.sin(th) * uz;
    // A `distancia` o más lejos, lo justo para que los dos quepan enteros en el plano (de lado entran a esa distancia;
    // cuando el giro los pone uno detrás del otro, la cámara se aleja)
    const puntos = [...puntosCuerpo(F, R), ...puntosCuerpo(O, R)];
    let cam = null;
    for (let dist = K.distancia; dist <= K.distancia + 12; dist += 0.2) {
        cam = { pos: [mx + dx * dist, K.altura, mz + dz * dist], mira: [mx, K.mira, mz], fov: K.fov };
        if (encuadre(cam, puntos, aspecto, 0.04).dentro) break;
    }
    return cam;
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
