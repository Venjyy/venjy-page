// =========================================================
// VENJY · Supervivencia · Escenas de skin
// Cuando te acercas (~6 bloques) a un amigo y tu skin parte de la suya, la primera vez de la
// partida se detiene todo y hay una escena antes de cualquier misión:
//  · Corta (~6,6 s): se sorprende (salta o levanta los brazos), se rasca la cabeza, se señala y
//    te señala; dice tres frases (distintas si tu skin es idéntica o solo basada en la suya).
//  · Venjy (tu skin parte de la de Venjy, ~20 s): cualquier amigo conversa con el jugador-Venjy,
//    con globos de los dos y gestos con easing. El Venjy del Inicio se encuentra con su clon.
//    En el iglú, Lalo y Moisés le pasan el pito y el bong al jugador (humo, burbujas y tos).
// Durante la escena el jugador queda congelado, el HUD se oculta (modo cine de camaras.js) y se
// puede saltar con Esc o con el botón «Saltar». Las escenas vistas se guardan en las misiones.
// Coordenadas: los amigos viven en el mapa original dentro de `grupo` (y + dy en el mundo).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';
import { crearGlobo } from '../criaturas/cuerpo.js';
import { BASES } from './skin.js';
import { CORTAS, VENJY, IGLU, DURACION_IGLU, TXT_ESCENA } from './escenas-datos.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
// Peso de algo que dura de a a b con rampas de entrada y salida
const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));

// ---------------------------------------------------------
// ¿Tu skin es idéntica a su base o solo basada en ella?
// ---------------------------------------------------------
const col = c => (c ? c.map(v => Math.round(v)).join(',') : '');
function firma(d) {
    const pelo = d.pelo || {}, ropa = d.ropa || {};
    return [col(d.piel), col(pelo.color), pelo.estilo, col(d.ojos), !!d.barba, d.barba ? col(d.barbaColor || pelo.color) : '', d.barba ? d.barbaEstilo || 'completa' : '', !!d.lentes,
        col(d.gorro), !!d.lunar, ropa.tipo, col(ropa.color), col(ropa.estampado), col(d.pantalon), d.zapatillas || 'blancas'].join('|');
}
export function tipoSkin(d) {
    const base = d && BASES.find(b => b.clave === d.base);
    if (!base) return { base: null, identica: false };
    return { base: base.clave, identica: firma(d) === firma(base) };
}

// ---------------------------------------------------------
// Gestos: metas para los huesos según u (0..1 en su tramo), t (reloj), s (sentado) y j (es el jugador)
// cx/cy/cz cuello (cy se suma a la mirada) · bDx/bDz, bIx/bIz brazos · inc torso adelante · rz torso de lado · salto
// ---------------------------------------------------------
const GESTOS = {
    habla: (u, t) => ({ bDx: -0.9 + Math.sin(t * 5) * 0.3, bDz: 0.2 + Math.sin(t * 3.1) * 0.15, bIx: -0.55 + Math.sin(t * 4 + 1) * 0.2, bIz: -0.15, cx: Math.sin(t * 6) * 0.06 }),
    sorpresa: (u, t, s) => ({ bDx: -2.8, bDz: -0.3, bIx: -2.8, bIz: 0.3, cx: -0.3, inc: s ? -0.15 : -0.05, salto: s ? 0 : Math.sin(tramo(u, 0, 0.4) * Math.PI) * 0.55 }),
    rasca: (u, t) => ({ bDx: -2.85 + Math.sin(t * 14) * 0.08, bDz: 0.42, bIx: -0.15, bIz: -0.05, cx: 0.12, cz: 0.15 }),
    yo: (u, t) => ({ bDx: -1.25, bDz: 0.85 + Math.sin(t * 10) * 0.06, bIx: -0.1, cx: 0.3 }),
    tu: (u, t) => ({ bDx: -1.6, bDz: 0.05 + Math.sin(t * 6) * 0.03, bIx: -0.15, cx: -0.05 }),
    ojos: (u, t) => ({ bDx: -2.3 + Math.sin(t * 12) * 0.07, bDz: 0.62, bIx: -2.3 - Math.sin(t * 12) * 0.07, bIz: -0.62, cx: 0.15 }),
    mano: (u, t) => ({ bDx: -1.45 + Math.sin(t * 9) * 0.08 * tramo(u, 0.3, 0.5), bDz: 0.15 }),
    saluda: (u, t) => ({ bDx: -2.7, bDz: -0.35 + Math.sin(t * 9) * 0.35 }),
    brazosArriba: (u, t, s) => ({ bDx: -2.85 + Math.sin(t * 18) * 0.15, bDz: -0.35, bIx: -2.85 - Math.sin(t * 18) * 0.15, bIz: 0.35, cx: -0.35, salto: s ? 0 : Math.abs(Math.sin(u * Math.PI * 3)) * 0.25 }),
    risa: (u, t) => ({ bDx: -0.55, bDz: 0.35, bIx: -0.55, bIz: -0.35, cx: -0.35, salto: Math.abs(Math.sin(t * 17)) * 0.05 }),
    baile: (u, t, s) => { const b = Math.sin(t * 9); return { bDx: -2.7 * Math.max(0, b) - 0.2, bIx: -2.7 * Math.max(0, -b) - 0.2, bDz: 0.2, bIz: -0.2, rz: b * 0.12, cx: -0.15, salto: s ? 0 : Math.abs(b) * 0.08 }; },
    cabecea: (u, t) => { const g = Math.pow(Math.abs(Math.sin(t * Math.PI * 2)), 3); return { cx: 0.05 + g * 0.5, bIx: -1.05, bIz: -0.55, bDx: -0.6 - g * 0.4, bDz: 0.3 }; },
    dedo: () => ({ bIx: -1.45, bIz: -0.35, cx: 0.4, cy: 0.35 }),
    // Frente al clon: el jugador levanta el derecho y Venjy, como en un espejo, el izquierdo
    espejo: (u, t, s, j) => (j ? { bDx: -2.9, bDz: -0.2, cz: 0.12 } : { bIx: -2.9, bIz: 0.2, cz: -0.12 }),
    doble: u => ({ cy: -1.0 * Math.sin(tramo(u, 0.15, 0.55) * Math.PI), cx: u > 0.6 ? -0.18 : 0.05 }),
    hachazo: (u, t) => { const c = (t % 1.3) / 1.3; const a = c < 0.6 ? lerp(-0.6, -2.9, suave(c / 0.6)) : lerp(-2.9, -1.2, tramo(c, 0.6, 0.72)); return { bDx: a, bIx: a, bDz: 0.32, bIz: -0.32, inc: c > 0.6 && c < 0.85 ? 0.12 : 0 }; },
    pasa: () => ({ bDx: -1.35, bDz: 0.1, cx: 0.1 })
};
const CAMPOS = ['cx', 'cz', 'bDx', 'bDz', 'bIx', 'bIz', 'pDx', 'pIx', 'inc', 'rz', 'y'];

export function crearEscenasSkin(ctx) {
    const { grupo, dy, mundo, jugador, camaras, misiones, npcs, amigos, venjys, skin, puede, bloquear, liberar } = ctx;
    let idioma = ctx.idioma || 'es';
    const L = o => (o ? o[idioma] || o.es : '');
    const vistas = () => misiones.estado.escenasSkin;
    const iglu = amigos.iglu;

    // ---- Botón «Saltar» (también táctil) ----
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton saltar-escena';
    boton.textContent = TXT_ESCENA[idioma].saltar;
    boton.addEventListener('click', e => { e.preventDefault(); saltar(); });
    document.body.appendChild(boton);
    document.addEventListener('keydown', e => { if (escena && e.code === 'Escape' && !e.repeat) { e.preventDefault(); saltar(); } });

    // ---- Globos propios (los del amigo se callan con n.escena) ----
    const globos = { a: crearGlobo(grupo), b: crearGlobo(grupo), j: crearGlobo(grupo) };

    // ---- Bloques que tapan / pisables ----
    const opaco = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };
    const solido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && TIPO[id] === 1; };
    function libre(ax, ay, az, bx, by, bz) {
        const n = Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) * 3);
        for (let i = 1; i < n; i++) { const k = i / n; if (opaco(ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k)) return false; }
        return true;
    }
    // Dónde se para el jugador: a r bloques del centro, empezando por su lado, con suelo y aire para el cuerpo
    function lugarCerca(cx, cz, piso, r, ang0, evitar = []) {
        for (let i = 0; i < 26; i++) {
            const ang = ang0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.25;
            const x = Math.floor(cx + Math.sin(ang) * r) + 0.5, z = Math.floor(cz + Math.cos(ang) * r) + 0.5;
            if (evitar.some(n => Math.hypot(n.x - x, n.z - z) < 1)) continue;
            for (const y of [piso, piso + 1, piso - 1]) {
                if (solido(x, y - 0.5, z) && !opaco(x, y + 0.5, z) && !opaco(x, y + 1.5, z) && libre(x, y + 1.6, z, cx, piso + 1.5, cz)) return { x, y, z };
            }
        }
        return null;
    }

    // ---- Personas que pueden reaccionar ----
    function personas() {
        const l = [];
        for (const n of npcs.lista) l.push({ clave: n.clave, n });
        for (const n of amigos.lista) l.push({ clave: n.clave, n });
        const v = venjys.lista.find(n => n.lugar === 'inicio');
        if (v) l.push({ clave: 'venjy', n: v });
        return l;
    }
    const esc = n => n.escala || 1;

    // ---------------------------------------------------------
    // Actores: el amigo (o los dos del iglú) y el cuerpo del jugador
    // ---------------------------------------------------------
    function leer(p) {
        return {
            cx: p.cuello.rotation.x, cy: p.cuello.rotation.y, cz: p.cuello.rotation.z, bDx: p.brazoD.rotation.x, bDz: p.brazoD.rotation.z, bIx: p.brazoI.rotation.x, bIz: p.brazoI.rotation.z,
            pDx: p.piernaD.rotation.x, pIx: p.piernaI.rotation.x, inc: p.cuerpo.rotation.x, rz: p.cuerpo.rotation.z, y: p.cuerpo.position.y
        };
    }
    function escribir(p, v) {
        p.cuello.rotation.x = v.cx; p.cuello.rotation.y = v.cy; p.cuello.rotation.z = v.cz;
        p.brazoD.rotation.x = v.bDx; p.brazoD.rotation.z = v.bDz; p.brazoI.rotation.x = v.bIx; p.brazoI.rotation.z = v.bIz;
        p.piernaD.rotation.x = v.pDx; p.piernaI.rotation.x = v.pIx;
        p.cuerpo.rotation.x = v.inc; p.cuerpo.rotation.z = v.rz; p.cuerpo.position.y = v.y;
    }
    function actorAmigo(clave, n) {
        const foto = leer(n.p);
        const sentado = foto.pDx < -0.4;
        const neutral = { ...foto, cz: 0, rz: 0 };
        if (!sentado) {
            // De pie: piernas rectas y, si tenía un brazo en alto (saludo, hachazo), lo baja
            neutral.pDx = neutral.pIx = 0; neutral.y = 0; neutral.inc = lim(foto.inc, -0.1, 0.1);
            if (Math.abs(foto.bDx) > 1.3) { neutral.bDx = 0; neutral.bDz = 0.05; }
            if (Math.abs(foto.bIx) > 1.3) { neutral.bIx = 0; neutral.bIz = -0.05; }
        }
        return { clave, n, p: n.p, foto, neutral, cur: { ...neutral }, sentado, giro: sentado ? 0.4 : 1, yaw0: n.yaw, alto: 2.15 * esc(n), globo: null };
    }
    function actorJugador() {
        const c = camaras.cuerpo;
        const neutral = { cx: 0, cy: 0, cz: 0, bDx: 0, bDz: 0.05, bIx: 0, bIz: -0.05, pDx: 0, pIx: 0, inc: 0, rz: 0, y: 0 };
        return { clave: 'j', p: c, neutral, cur: { ...neutral }, sentado: false, giro: 0, alto: 2.15, globo: globos.j, jugador: true };
    }
    // Posición del actor en el mundo (pies)
    const pos = a => (a.jugador ? { x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z } : { x: a.n.x, y: (a.n.y ?? 0) + dy, z: a.n.z });

    // ---------------------------------------------------------
    // Estado de la escena
    // ---------------------------------------------------------
    let escena = null;

    function iniciar(clave, n, info) {
        const tipo = info.base !== 'venjy' ? 'corta' : (clave === 'lalo' || clave === 'moises') && iglu ? 'iglu' : 'venjy';
        const marcar = tipo === 'iglu' ? ['lalo', 'moises'] : [clave];
        for (const k of marcar) vistas().add(k);
        bloquear();

        const J = actorJugador();
        const actores = { j: J };
        let centro;
        if (tipo === 'iglu') {
            iglu.terminarPase();
            // Cada uno con lo suyo: Lalo el pito y Moisés el bong (el guion lo nombra así)
            if (iglu.lalo.objeto !== 'pito') iglu.devolver(iglu.moises, iglu.lalo);
            actores.lalo = actorAmigo('lalo', iglu.lalo); actores.lalo.globo = globos.a;
            actores.moises = actorAmigo('moises', iglu.moises); actores.moises.globo = globos.b;
            const a = iglu.lalo, b = iglu.moises;
            centro = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y), z: (a.z + b.z) / 2, escala: 0.8 };
        } else {
            actores.n = actorAmigo(clave, n); actores.n.globo = globos.a;
            centro = n;
        }
        // Acerca al jugador (bajo el fundido de entrada) si quedó lejos o detrás de algo
        const piso = (centro.y ?? 0) + dy;
        // En el iglú el jugador va al fondo de la cúpula: la cámara, desde el túnel, ve a los tres
        const r = tipo === 'iglu' ? 1.5 : 2.4;
        const dJ = Math.hypot(jugador.pos.x - centro.x, jugador.pos.z - centro.z);
        const ve = libre(jugador.pos.x, jugador.pos.y + 1.6, jugador.pos.z, centro.x, piso + 1.5, centro.z);
        if (tipo === 'iglu' || dJ > 3.4 || dJ < 1.6 || !ve) {
            const ang = Math.atan2(jugador.pos.x - centro.x, jugador.pos.z - centro.z) + (tipo === 'iglu' ? Math.PI : 0);
            const l = lugarCerca(centro.x, centro.z, Math.round(piso), r, ang, tipo === 'iglu' ? [iglu.lalo, iglu.moises] : [n]);
            if (l) jugador.colocar(l.x, l.y, l.z);
        }
        // El jugador mira al amigo (el cuerpo gira con jugador.yaw + PI)
        jugador.yaw = Math.atan2(centro.x - jugador.pos.x, centro.z - jugador.pos.z) - Math.PI;
        jugador.pitch = 0;

        // Guion
        let lineas, T, pista = null;
        if (tipo === 'corta') {
            const d = CORTAS[clave];
            const frases = info.identica ? d.identica : d.basada;
            const fin = (info.identica ? d.finIdentica : d.finBasada) || 'tu';
            T = 6.6;
            lineas = frases.map((f, i) => ({ q: 'n', texto: f, a: T * [0.04, 0.36, 0.66][i], d: T * 0.3 }));
            // Gestos fijos: se gira, sorpresa, se rasca, se señala y te señala
            pista = [['doble', 0, 0.09], ['sorpresa', 0.07, 0.29], ['rasca', 0.27, 0.5], ['yo', 0.48, 0.7], [fin, 0.68, 0.93]].map(([g, a, b]) => ({ g, a: a * T, b: b * T }));
        } else if (tipo === 'venjy') {
            let a = 1.3;
            lineas = VENJY[clave].map(f => { const d = lim(1.8 + f.es.length * 0.045, 2.5, 3.8); const l = { q: f.q, texto: f, g: f.g, o: f.o, a, d }; a += d; return l; });
            T = a + 1.1;
            pista = [{ g: 'doble', a: 0, b: 1.6 }];
        } else {
            lineas = IGLU.map(f => ({ q: f.q, texto: f, g: f.g, o: f.o, a: f.a, d: f.d }));
            T = DURACION_IGLU;
        }
        const principal = tipo === 'iglu' ? null : actores.n;
        escena = { tipo, clave, info, actores, lineas, pista, T, t: 0, centro, principal, rampa: tipo === 'corta' ? 0.25 : 0.45, rapidez: tipo === 'corta' ? 13 : 7, entrada: tipo === 'corta' ? 0.5 : 0.9, salida: tipo === 'corta' ? 0.6 : 1.0 };
        if (tipo === 'iglu') escena.humo = { pito: 0, exhala: 0, tos: new Set(), burbujas: false, vuelo: null, conJugador: null };

        // Los amigos dejan su animación: la escena los mueve
        for (const a of Object.values(actores)) if (a.n) a.n.escena = (dt, base) => animarAmigo(a, dt, base);
        camaras.iniciarCine(centro, { escena: true, fundido: 0.45, evitar: Object.values(actores).filter(a => a.n).map(a => a.n) });
        camaras.pose = (cuerpo, dt) => poseJugador(dt);
        misiones.ocultarMarcas = true;
        document.body.classList.add('en-escena');
    }

    function terminar() {
        if (!escena) return;
        const e = escena;
        escena = null;
        for (const a of Object.values(e.actores)) {
            if (a.jugador) { a.p.brazoD.rotation.z = a.p.brazoI.rotation.z = 0; a.p.cuello.rotation.y = a.p.cuello.rotation.z = 0; a.p.cuerpo.rotation.z = 0; a.p.cuerpo.position.y = 0; continue; }
            delete a.n.escena;
            a.n.yaw = a.yaw0;
            escribir(a.p, a.foto);
        }
        if (e.tipo === 'iglu') {
            // Si se saltó a la mitad, cada cosa vuelve a su dueño
            if (e.humo.vuelo) e.humo.vuelo = null;
            iglu.devolver(iglu.moises, iglu.lalo);
            iglu.pito.brasa.material.color.setHex(0x993300);
        }
        camaras.terminarCine();
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-escena');
        reloj = -4; // un respiro antes de que otro amigo cercano reaccione
        liberar();
    }
    function saltar() { if (escena) terminar(); }

    // ---------------------------------------------------------
    // Quién habla, qué gesto toca y hacia dónde mira cada uno
    // ---------------------------------------------------------
    const habla = (l, a) => l.q === a.clave || (l.q === 'n' && a === escena.principal) || l.q === 'todos' || (l.q === 'ambos' && (a.jugador || a === escena.principal));
    const lineasAhora = () => escena.lineas.filter(l => escena.t >= l.a && escena.t < l.a + l.d);
    function gestoDe(a) {
        const e = escena, t = e.t;
        // Pista fija (escena corta y la doble mirada del comienzo) para el amigo principal
        if (e.pista && a === e.principal) for (const p of e.pista) if (t >= p.a && t < p.b) return { g: p.g, u: (t - p.a) / (p.b - p.a), w: envolvente(t, p.a, p.b, e.rampa) };
        if (e.tipo === 'iglu' && !a.jugador) {
            const p = pistaIglu(a.clave, t);
            if (p) return p;
        }
        for (const l of lineasAhora()) {
            const g = habla(l, a) ? l.g || 'habla' : l.o;
            if (!g || e.tipo === 'corta') continue;
            return { g, u: (t - l.a) / l.d, w: envolvente(t, l.a, l.a + l.d, e.rampa) };
        }
        return null;
    }
    // A quién mira: quien habla mira al jugador (o al amigo); los demás miran a quien habla
    function miraDe(a) {
        const e = escena;
        const ls = lineasAhora();
        const l = ls[ls.length - 1];
        const amigosA = Object.values(e.actores).filter(x => !x.jugador);
        if (a.jugador) {
            const otro = l && amigosA.find(x => habla(l, x) && l.q !== 'todos');
            return otro ? pos(otro) : { x: e.centro.x, y: (e.centro.y ?? 0) + dy, z: e.centro.z };
        }
        if (l && !habla(l, a) && l.q !== 'j' && l.q !== 'ambos') {
            const otro = amigosA.find(x => x !== a && habla(l, x));
            if (otro) return pos(otro);
        }
        return pos(e.actores.j);
    }

    // Aplica pose: neutral → gesto (peso w) → suavizado → mezcla con la animación base (peso de la escena)
    const vMeta = {};
    function aplicar(a, dt) {
        const e = escena;
        const wS = suave(Math.min(tramo(e.t, 0, e.entrada), 1 - tramo(e.t, e.T - e.salida, e.T)));
        const g = gestoDe(a);
        const meta = g ? GESTOS[g.g](g.u, e.t, a.sentado, !!a.jugador) : {};
        const w = g ? g.w : 0;
        // Mirada
        const yo = pos(a), m = miraDe(a);
        const yaw = a.jugador ? jugador.yaw + Math.PI : a.n.yaw;
        const d = Math.hypot(m.x - yo.x, m.z - yo.z) || 1;
        const cy = lim(angulo(Math.atan2(m.x - yo.x, m.z - yo.z) - yaw), -1.1, 1.1);
        const cx = lim(-Math.atan2(m.y + 1.5 - (yo.y + 1.6 * (a.jugador ? 1 : esc(a.n))), d), -0.45, 0.45);
        const respira = e.tipo === 'corta' ? 0 : Math.sin(e.t * 1.7 + (a.jugador ? 1 : 0)) * 0.02;
        for (const k of CAMPOS) {
            let obj = k === 'cx' ? cx : a.neutral[k];
            if (k === 'inc') obj += respira;
            if (meta[k] !== undefined) obj = lerp(obj, meta[k], w);
            vMeta[k] = obj;
        }
        vMeta.cy = cy + (meta.cy || 0) * w;
        const r = Math.min(1, dt * e.rapidez);
        for (const k in vMeta) a.cur[k] = (a.cur[k] ?? vMeta[k]) + (vMeta[k] - (a.cur[k] ?? vMeta[k])) * r;
        // Mezcla con lo que dejó la animación normal según el peso de la escena
        const ahora = leer(a.p);
        const fin = {};
        for (const k in a.cur) fin[k] = lerp(ahora[k], a.cur[k], wS);
        fin.y += (meta.salto || 0) * w * wS;
        escribir(a.p, fin);
        return wS;
    }

    function animarAmigo(a, dt, base) {
        if (!escena) return base();
        // La animación normal queda congelada (dt 0) salvo en el iglú, donde la escena maneja el pito y el bong
        const r = escena.tipo === 'iglu' ? undefined : base(0);
        const wS = aplicar(a, dt);
        // Gira el cuerpo hacia el jugador (los sentados, solo un poco)
        const yo = pos(a), J = jugador.pos;
        a.n.yaw = a.yaw0 + angulo(Math.atan2(J.x - yo.x, J.z - yo.z) - a.yaw0) * a.giro * wS;
        return r;
    }
    function poseJugador(dt) {
        if (!escena) return;
        aplicar(escena.actores.j, dt);
        if (escena.tipo === 'iglu') fumarJugador(dt);
    }

    // ---------------------------------------------------------
    // Iglú: el pito y el bong pasan por las manos del jugador
    // ---------------------------------------------------------
    const REPOSO_BONG_J = [0.3, 0.8, 0.3], BONG_ARRIBA = [0, 1.03, 0.36];
    // Vuelos: [objeto, desde, hacia, inicio, fin]
    const VUELOS = [['pito', 'lalo', 'j', 4.6, 5.8], ['pito', 'j', 'lalo', 9.8, 11.0], ['bong', 'moises', 'j', 11.0, 12.4], ['bong', 'j', 'moises', 19.4, 20.6]];
    const PITO_J = 6.0, BONG_J = 12.6; // cuándo empieza a fumar cada cosa
    function pistaIglu(clave, t) {
        // Quien pasa o recibe estira el brazo
        for (const [, de, a, t0, t1] of VUELOS) if ((de === clave || a === clave) && t >= t0 - 0.4 && t < t1 + 0.2) return { g: 'pasa', u: 0, w: envolvente(t, t0 - 0.4, t1 + 0.2, 0.3) };
        return null;
    }
    const vA = new THREE.Vector3(), vB = new THREE.Vector3();
    function manoDe(quien, objeto, v) {
        if (quien === 'j') {
            const c = camaras.cuerpo;
            c.g.updateMatrixWorld(true);
            if (objeto === 'pito') c.brazoD.localToWorld(v.set(...iglu.POS_PITO)); else c.cuerpo.localToWorld(v.set(...REPOSO_BONG_J));
        } else {
            const n = iglu[quien];
            n.p.g.updateMatrixWorld(true);
            if (objeto === 'pito') n.p.brazoD.localToWorld(v.set(...iglu.POS_PITO)); else n.p.cuerpo.localToWorld(v.set(...n.reposoBong));
        }
        return grupo.worldToLocal(v);
    }
    function alJugador(objeto) {
        const c = camaras.cuerpo, o = iglu[objeto].g;
        if (objeto === 'pito') { c.brazoD.add(o); o.position.set(...iglu.POS_PITO); o.rotation.set(-0.6, 0, 0); }
        else { c.cuerpo.add(o); o.position.set(...REPOSO_BONG_J); o.rotation.set(0, 0, 0); }
    }
    function bocaJugador() {
        const c = camaras.cuerpo;
        c.g.updateMatrixWorld(true);
        return grupo.worldToLocal(c.cabeza.localToWorld(vB.set(0, -0.08, 0.3)));
    }
    function fumarJugador(dt) {
        const e = escena, h = e.humo, t = e.t, c = camaras.cuerpo;
        // Vuelos del pito y el bong
        for (const v of VUELOS) {
            const [obj, de, a, t0, t1] = v;
            if (t < t0 || h[obj + t0]) continue;
            const g = iglu[obj].g;
            if (!h.vuelo || h.vuelo.v !== v) {
                g.parent.updateMatrixWorld(true); grupo.attach(g);
                h.vuelo = { v, desde: g.position.clone() };
                if (de !== 'j') iglu[de].objeto = null;
            }
            const u = tramo(t, t0, t1);
            g.position.copy(h.vuelo.desde).lerp(manoDe(a, obj, vA), suave(u));
            g.position.y += Math.sin(u * Math.PI) * 0.35;
            if (u >= 1) {
                h[obj + t0] = true; h.vuelo = null;
                if (a === 'j') alJugador(obj); else iglu.tomar(iglu[a], obj);
            }
        }
        // Pito: 0-1 a la boca · 1-2.4 fuma · 2.4-3.2 lo baja · 3.4-4.8 bota el humo (y una tosecita)
        const cp = t - PITO_J;
        if (cp >= 0 && cp < 4.8) {
            const sube = cp < 1 ? suave(cp) : cp < 2.4 ? 1 : 1 - suave(tramo(cp, 2.4, 3.2));
            c.brazoD.rotation.x = lerp(c.brazoD.rotation.x, -1.95, sube); c.brazoD.rotation.z = lerp(c.brazoD.rotation.z, 0.62, sube);
            iglu.pito.brasa.material.color.setHex(cp >= 1 && cp < 2.4 ? 0xff5a10 : 0xaa3300);
            if (cp >= 3.4) exhalar(dt, 'pito', 1);
        }
        // Bong: 0-0.8 lo sube · 0.8-3 aspira (burbujas) · 3-3.6 lo baja · 3.6-4.2 aguanta · 4.2-5.6 bota el humo · tos fuerte
        const cb = t - BONG_J;
        if (cb >= 0 && cb < 6.2 && iglu.bong.g.parent === c.cuerpo) {
            const arriba = cb < 0.8 ? suave(cb / 0.8) : cb < 3 ? 1 : 1 - suave(tramo(cb, 3, 3.6));
            iglu.bong.g.position.set(lerp(REPOSO_BONG_J[0], BONG_ARRIBA[0], arriba), lerp(REPOSO_BONG_J[1], BONG_ARRIBA[1], arriba), lerp(REPOSO_BONG_J[2], BONG_ARRIBA[2], arriba));
            iglu.bong.g.rotation.x = lerp(0, -0.15, arriba);
            c.brazoD.rotation.x = lerp(c.brazoD.rotation.x, -1.15, arriba); c.brazoD.rotation.z = lerp(c.brazoD.rotation.z, 0.42, arriba);
            c.brazoI.rotation.x = lerp(c.brazoI.rotation.x, -1.0, arriba); c.brazoI.rotation.z = lerp(c.brazoI.rotation.z, -0.4, arriba);
            const aspira = cb >= 0.8 && cb < 3;
            iglu.bong.brasa.material.color.setHex(aspira && Math.sin(t * 20) > -0.5 ? 0xff7a1a : 0x552200);
            iglu.bong.agua.position.y = 0.07 + (aspira ? Math.sin(t * 40) * 0.01 : 0);
            if (aspira && !h.burbujas) { h.burbujas = true; iglu.burbujas(1, 2.2); }
            if (aspira && Math.random() < dt * 6) { c.g.updateMatrixWorld(true); const b = grupo.worldToLocal(iglu.bong.g.localToWorld(vB.set(0, 0.6, 0))); iglu.emitir(b.x, b.y, b.z, { s: 0.1, dur: 0.8, vy: 0.2 }); }
            if (cb >= 3.6 && cb < 4.2) c.cuello.rotation.x = lerp(c.cuello.rotation.x, -0.25, 0.5); // aguanta
            if (cb >= 4.2 && cb < 5.6) exhalar(dt, 'bong', 2);
        }
        // Tos: sacudones del torso
        h.tose = Math.max(0, (h.tose || 0) - dt);
        if (h.tose > 0) c.cuerpo.rotation.x = Math.max(0, Math.sin(h.tose * 24)) * 0.3;
    }
    function exhalar(dt, cual, fuerza) {
        const h = escena.humo, c = camaras.cuerpo;
        c.cuello.rotation.x = lerp(c.cuello.rotation.x, -0.4, 0.5);
        if (Math.random() < dt * 14) {
            const b = bocaJugador(), yaw = jugador.yaw + Math.PI;
            iglu.emitir(b.x, b.y, b.z, { s: 0.22, dur: 2.6, vy: 0.35, vx: Math.sin(yaw) * 0.5, vz: Math.cos(yaw) * 0.5 });
        }
        if (!h.tos.has(cual)) { h.tos.add(cual); iglu.tos(1, fuerza); h.tose = fuerza > 1 ? 2.0 : 1.2; }
    }

    // ---------------------------------------------------------
    // Bucle
    // ---------------------------------------------------------
    let reloj = 0, pausada = false;
    function cercaDe(n) {
        const ny = (n.y ?? 0) + dy;
        if (!n.p.g.visible || Math.abs(jugador.pos.y - ny) > 4) return false;
        if (Math.hypot(n.x - jugador.pos.x, n.z - jugador.pos.z) > 6) return false;
        return libre(jugador.pos.x, jugador.pos.y + 1.6, jugador.pos.z, n.x, ny + 1.5 * esc(n), n.z);
    }
    function reacciona(clave, info) { return !vistas().has(clave) && !!info.base && (info.base === 'venjy' || info.base === clave) && (clave !== 'venjy' || info.base === 'venjy'); }

    function actualizar(dt) {
        if (escena) {
            if (!pausada) escena.t += dt;
            const e = escena;
            // Encuadre: hacia quien habla
            const ls = lineasAhora(), l = ls[ls.length - 1];
            camaras.enfocar(!l ? 0.5 : l.q === 'j' ? 0.68 : l.q === 'ambos' || l.q === 'todos' ? 0.5 : 0.32);
            if (e.t >= e.T) terminar();
            jugador.yaw = Math.atan2(e.centro.x - jugador.pos.x, e.centro.z - jugador.pos.z) - Math.PI;
        } else if ((reloj += dt) > 0.25) {
            reloj = 0;
            if (puede()) {
                const info = tipoSkin(skin());
                if (info.base) for (const p of personas()) if (reacciona(p.clave, info) && cercaDe(p.n)) { iniciar(p.clave, p.n, info); break; }
            }
        }
        actualizarGlobos(dt);
    }
    function actualizarGlobos(dt) {
        const usados = new Set();
        if (escena) {
            const ls = lineasAhora();
            for (const a of Object.values(escena.actores)) {
                const l = ls.find(x => habla(x, a));
                if (!l || !a.globo) continue;
                const p = pos(a);
                a.globo.decir(L(l.texto));
                // Bajo un techo bajo (el iglú) el globo baja para quedar dentro
                let y = p.y + a.alto + 0.6;
                for (let k = 2; k <= 4; k++) if (opaco(p.x, p.y + k + 0.5, p.z)) { y = Math.min(y, p.y + k - 0.5); break; }
                // Corrido un poco hacia el centro de la escena: así no tapa la cabeza en los planos sobre el hombro
                const c = escena.centro;
                a.globo.actualizar(dt, true, lerp(p.x, c.x, 0.3), y - dy, lerp(p.z, c.z, 0.3));
                usados.add(a.globo);
            }
        }
        for (const g of Object.values(globos)) if (!usados.has(g)) g.actualizar(dt, false, 0, 0, 0);
    }

    // Antes de abrir el panel de un amigo: si le toca la escena, va primero
    function antesDeHablar(clave) {
        if (escena) return true;
        const info = tipoSkin(skin());
        if (!reacciona(clave, info)) return false;
        const p = personas().find(x => x.clave === clave);
        if (!p) return false;
        iniciar(clave, p.n, info);
        return true;
    }

    return {
        actualizar, antesDeHablar, saltar, tipoSkin,
        get activa() { return !!escena; },
        get escena() { return escena && { tipo: escena.tipo, clave: escena.clave, t: escena.t, T: escena.T }; },
        setIdioma(l) { idioma = l; boton.textContent = TXT_ESCENA[idioma].saltar; },
        // Depuración: olvidar las escenas vistas, forzar una, detener el guion (para capturas) o saltar a un segundo
        reiniciar() { vistas().clear(); },
        pausar(v = true) { pausada = v; },
        irA(t) { if (escena) escena.t = t; },
        forzar(clave) {
            const p = personas().find(x => x.clave === clave);
            if (!p || escena) return false;
            let info = tipoSkin(skin());
            if (!info.base || (clave === 'venjy' && info.base !== 'venjy')) info = { base: clave, identica: true };
            iniciar(clave, p.n, info);
            return true;
        }
    };
}
