// =========================================================
// VENJY · Supervivencia · Minijuego: duelo de hachas con Boris (leñera de la atalaya)
// Te pones junto a Boris con tu propio tocón y tu hacha; gana quien parte primero 3 leños
// (3 golpes buenos cada uno). Un solo botón: pulsar cuando la marca pasa por la zona verde;
// fuera de la zona el hacha rebota y pierdes un instante. Boris corta a ritmo fijo (su propia
// animación acelerada) y Lucho arbitra. Guion (s de cada fase):
//   intro 11 s · 0,0–0,6 fundido: apareces junto al segundo tocón (Boris deja de hachar y te mira)
//                0,6–3,6 Boris te desafía (te apunta con el hacha) · 3,6–6,6 tú: muestras el hacha
//                6,6–9,0 Lucho explica las reglas (brazo arriba) · 9,0–11,0 cuenta 3, 2, 1, ¡a hachar!
//   juego ~8–12 s · los dos hachan; reacciones sueltas (primer leño de cada uno, fallo, quién va ganando)
//   final 9 s   · gana: Lucho celebra con los brazos arriba, Boris se rasca la cabeza y te ofrece
//                 rebaja en su tienda, tú levantas el hacha · pierde: Boris levanta el hacha, Lucho
//                 lo explica, tú te rascas la cabeza
// Premio: ganar = 6 troncos (+1 esmeralda y la oferta rebajada de Boris la primera vez, marca 'mj-boris');
// perder = 2 troncos por leño que partiste.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B, TIPO } from '../texturas.js';
import { caja, texturaPixeles, ajustar, angulo } from '../criaturas/cuerpo.js';
import { O } from './objetos.js';
import { sonidos } from './sonidos.js';
import { LENA } from './minijuegos-datos.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));
const tri = u => { const f = u - Math.floor(u); return f < 0.5 ? f * 2 : 2 - f * 2; }; // 0→1→0, lineal

const LENOS = 3, GOLPES = 3;      // leños para ganar y golpes por leño
const VEL_BORIS = 2.15;           // Boris hacha 2,45 veces más rápido que cuando corta solo (~1,06 s por golpe)
const SWING = 0.42, IMPACTO = 0.23, REBOTE = 0.6;
const T_INTRO = 11, T_FINAL = 9;

export function crearLena(api) {
    const { grupo, dy, mundo, jugador, camaras, amigos, tinte } = api;
    if (!amigos.lena) return null;
    const { boris, lucho, hachazo, astillar } = amigos.lena;

    // ---- Piezas: tu tocón, tu leño (y sus mitades) y tu hacha ----
    const texCorteza = tinte.caras(texturaPixeles(8, 8, 7101, (x, y, r) => ajustar([104, 76, 46], 0.82 + r() * 0.3)),
        { 2: texturaPixeles(8, 8, 7102, (x, y) => Math.hypot(x - 3.5, y - 3.5) % 2 < 1 ? [190, 154, 104] : [160, 126, 82]) });
    const texLena = tinte.caras(texturaPixeles(8, 8, 7103, (x, y, r) => ajustar([118, 86, 52], 0.85 + r() * 0.25)),
        { 2: texturaPixeles(8, 8, 7104, (x, y) => Math.hypot(x - 3.5, y - 3.5) % 2 < 1 ? [200, 164, 112] : [176, 140, 92]) });
    const tocon = caja(0.8, 1.0, 0.8, texCorteza);
    const leno = caja(0.36, 0.42, 0.36, texLena);
    const mitades = [-1, 1].map(l => ({ m: caja(0.18, 0.42, 0.36, texLena), l }));
    const hacha = new THREE.Group();
    const mango = caja(0.06, 0.85, 0.06, tinte.caras(texturaPixeles(2, 8, 7105, (x, y, r) => ajustar([120, 84, 48], 0.85 + r() * 0.3))));
    mango.position.y = -0.38;
    const hoja = caja(0.05, 0.24, 0.3, tinte.caras(texturaPixeles(4, 4, 7106, (x, y, r) => x === 3 ? [236, 236, 240] : ajustar([140, 144, 152], 0.9 + r() * 0.2))));
    hoja.position.set(0, -0.72, -0.13);
    hacha.add(mango, hoja);
    hacha.position.set(0.06, -0.7, 0.05);

    // ---- Bloques ----
    const opaco = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };
    const solido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && TIPO[id] === 1; };

    // Tu tocón a un lado del de Boris (mismo z), y tú detrás de él como Boris (1,65 hacia +Z).
    // Prefiere el oeste: al este está Lucho.
    function sitio() {
        const T = boris.tocon, y = boris.y + dy;
        for (const d of [-2.4, -2.8, -2.0, 2.4, 2.8, -3.2, 3.2]) {
            const sx = T.x + d, sz = T.z, px = sx, pz = sz + 1.65;
            if (Math.hypot(px - lucho.x, pz - lucho.z) < 1.3 || Math.hypot(sx - lucho.x, sz - lucho.z) < 1.0) continue;
            if (!solido(sx, y - 0.5, sz) || opaco(sx, y + 0.5, sz) || opaco(sx, y + 1.5, sz)) continue;
            if (!solido(px, y - 0.5, pz) || opaco(px, y + 0.5, pz) || opaco(px, y + 1.5, pz)) continue;
            return { sx, sz, px, pz };
        }
        return null;
    }

    // Persona mira a un punto: giro de cabeza limitado
    const giroA = (n, x, z, max = 1.0) => lim(angulo(Math.atan2(x - n.x, z - n.z) - n.yaw), -max, max);
    // Escribe huesos suavizados en un amigo
    function escribir(n, s, meta, dt, rapidez = 10) {
        const r = Math.min(1, dt * rapidez), p = n.p;
        for (const k in meta) s[k] = (s[k] ?? meta[k]) + (meta[k] - (s[k] ?? meta[k])) * r;
        if (s.bDx != null) p.brazoD.rotation.x = s.bDx;
        if (s.bDz != null) p.brazoD.rotation.z = s.bDz;
        if (s.bIx != null) p.brazoI.rotation.x = s.bIx;
        if (s.bIz != null) p.brazoI.rotation.z = s.bIz;
        if (s.cx != null) p.cuello.rotation.x = s.cx;
        if (s.cy != null) p.cuello.rotation.y = s.cy;
        if (s.inc != null) p.cuerpo.rotation.x = s.inc;
        if (s.y != null) p.cuerpo.position.y = s.y;
    }

    // ---------------------------------------------------------
    // Actores en cada fase
    // ---------------------------------------------------------
    function animarBoris(e, dt, base) {
        const d = e.datos, t = e.t, s = d.sB;
        if (e.fase === 'juego') { base(dt * VEL_BORIS); return; } // su hachar de siempre, más rápido
        base(0); // congela su pose y encima se escriben los gestos
        const aJ = giroA(boris, e.P.x, e.P.z), aL = giroA(boris, lucho.x, lucho.z);
        let m;
        if (e.fase === 'intro') {
            const reta = envolvente(t, 0.6, 3.6, 0.4); // te apunta con el hacha
            m = { bDx: lerp(-0.55, -1.45, reta), bDz: lerp(0.32, 0.12, reta), bIx: lerp(-0.55, -0.2, reta), bIz: -0.32, inc: 0, y: 0,
                cx: t > 6.6 ? 0.1 : -0.05 + Math.sin(t * 5) * 0.05 * reta, cy: t > 6.6 && t < 9 ? aL : aJ };
        } else if (e.final === 'gana') {
            const rasca = envolvente(t, 3.4, 6.4, 0.35);
            m = { bDx: -0.55, bDz: 0.32, bIx: lerp(-0.55, -2.85 + Math.sin(t * 14) * 0.08, rasca), bIz: lerp(-0.32, -0.42, rasca), inc: 0, y: 0,
                cx: lerp(0.2, 0.12, rasca), cy: t < 3.4 ? aL : aJ * 0.8 };
        } else {
            const arriba = envolvente(t, 0.4, 3.4, 0.3); // levanta el hacha con las dos manos
            m = { bDx: lerp(-0.55, -2.85, arriba), bDz: lerp(0.32, 0.2, arriba), bIx: lerp(-0.55, -2.85, arriba), bIz: lerp(-0.32, -0.2, arriba),
                inc: 0, y: Math.abs(Math.sin(t * 9)) * 0.06 * arriba, cx: lerp(0.05, -0.3, arriba), cy: t < 3.4 ? 0 : t < 6.4 ? aL : aJ };
        }
        escribir(boris, s, m, dt);
    }
    function animarLucho(e, dt, base) {
        const d = e.datos, t = e.t, s = d.sL;
        base(0);
        const habla = e.fase === 'intro' ? e.dice(LENA.intro, 'lucho') : e.fase === 'final' ? e.dice(LENA[e.final], 'lucho') : d.luchoHabla > 0;
        const mid = { x: (boris.x + e.P.x) / 2, z: (boris.z + e.P.z) / 2 };
        let m;
        if (e.fase === 'intro' && t >= 9) { // cuenta regresiva: brazo arriba y lo baja en «¡a hachar!»
            const baja = tramo(t, 10.5, 10.8);
            m = { bDx: lerp(-2.8, -1.2, baja), bDz: -0.2, bIx: -0.3, bIz: -0.1, cx: -0.1, cy: giroA(lucho, mid.x, mid.z) };
        } else if (e.fase === 'final' && e.final === 'gana' && t < 3.4) { // celebra al ganador
            m = { bDx: -2.85, bDz: -0.35, bIx: -2.85, bIz: 0.35, cx: -0.3, cy: giroA(lucho, e.P.x, e.P.z), y: Math.abs(Math.sin(t * 9)) * 0.08 };
        } else if (habla) {
            m = { bDx: -0.9 + Math.sin(t * 5) * 0.3, bDz: 0.2 + Math.sin(t * 3.1) * 0.15, bIx: -0.55 + Math.sin(t * 4 + 1) * 0.2, bIz: -0.15, cx: Math.sin(t * 6) * 0.06, cy: giroA(lucho, e.P.x, e.P.z) };
        } else { // brazos cruzados mirando el duelo
            m = { bDx: -1.0, bDz: 0.75, bIx: -1.0, bIz: -0.75, cx: 0.15, cy: giroA(lucho, mid.x, mid.z), y: 0 };
        }
        if (m.y == null) m.y = 0;
        escribir(lucho, s, m, dt, 9);
    }

    // ---------------------------------------------------------
    // Juego
    // ---------------------------------------------------------
    function nuevoLeno(d) {
        leno.visible = true;
        leno.position.set(d.S.sx, boris.y + 1.21, d.S.sz);
        d.zonaC = 0.32 + Math.random() * 0.36;                  // la zona verde cambia de lugar en cada leño
        d.zonaA = 0.24 - 0.035 * d.lenosJ;                       // y se angosta
    }
    function partir(d) {
        d.partido = 1.0; leno.visible = false;
        for (const h of mitades) { h.m.visible = true; h.m.position.set(d.S.sx + h.l * 0.09, boris.y + 1.21, d.S.sz); h.m.rotation.set(0, 0, 0); }
    }
    const enZona = d => Math.abs(d.cursor - d.zonaC) <= d.zonaA / 2;
    // Reacciones: cada una una vez, en cola (si alguien está hablando, espera su turno)
    const reaccion = (e, k) => { const d = e.datos; if (!d.reac.has(k)) d.pend.add(k); };
    function decirPendiente(e) {
        const d = e.datos;
        if (e.sueltas.length || !d.pend.size) return;
        const k = d.pend.values().next().value;
        d.pend.delete(k); d.reac.add(k);
        const [q, txt] = LENA.reaccion[k];
        e.decir(q, txt, 2.6);
        if (q === 'lucho') d.luchoHabla = 2.6;
    }

    return {
        amigos: ['boris'],
        nombre: LENA.nombre, boton: LENA.boton,
        disponible: () => null,
        empezar(e) {
            const S = sitio() || { sx: boris.tocon.x - 2.4, sz: boris.tocon.z, px: boris.tocon.x - 2.4, pz: boris.tocon.z + 1.65 };
            const lado = Math.sign(S.px - boris.x) || -1; // +1: estás al este de Boris
            e.datos = { S, lado, sB: {}, sL: {}, cursor: 0, fase: 0, golpe: 0, impacto: 0, rebote: 0, golpesJ: 0, lenosJ: 0, lenosB: 0, partido: 0, reac: new Set(), pend: new Set(), luchoHabla: 0, zonaC: 0.5, zonaA: 0.24 };
            jugador.colocar(S.px, boris.y + dy, S.pz);
            jugador.yaw = 0; jugador.pitch = 0; // mirando a -Z, hacia tu tocón (como Boris)
            e.P = { x: S.px, z: S.pz };
            tocon.position.set(S.sx, boris.y + 0.5, S.sz);
            grupo.add(tocon, leno, ...mitades.map(h => h.m));
            for (const h of mitades) h.m.visible = false;
            nuevoLeno(e.datos);
            camaras.cuerpo.brazoD.add(hacha);
            boris.escena = (dt, base) => animarBoris(e, dt, base);
            lucho.escena = (dt, base) => animarLucho(e, dt, base);
            // Planos: el frente de los dos (hacia -Z) queda en ang = lado·π/2 respecto de la línea Boris → tú
            const s = lado, PI = Math.PI;
            const planos = [
                { nombre: 'frente alto', ang: s * PI / 2, dist: 5.2, alto: 3.2, orbita: 0.08 * s, dolly: -0.5 },
                { nombre: 'perfil, tu lado', ang: s * 0.35, dist: 3.6, alto: 1.9, orbita: 0.05 * s, dolly: -0.3 },
                { nombre: 'frente medio, tu lado', ang: s * (PI / 2 - 0.3), dist: 4.2, alto: 2.3, orbita: -0.08 * s, dolly: -0.3 },
                { nombre: 'perfil, lado de Boris', ang: s * (PI - 0.6), dist: 3.6, alto: 2.4, orbita: -0.05 * s, dolly: -0.3 },
                { nombre: 'picado', ang: s * (PI / 2 + 0.35), dist: 6.0, alto: 4.6, orbita: 0.06 * s, dolly: -0.5 }
            ];
            return { ancla: boris, planos, visibles: [boris, lucho], evitar: [boris, lucho], foco: 0.5 };
        },
        alPasar(e, fase) {
            const d = e.datos;
            if (fase === 'juego') { boris.golpes = 0; boris.partido = 0; boris.ciclo = 0; boris.leno.visible = true; d.fase = 0; }
        },
        actualizar(e, dt) {
            const d = e.datos, t = e.t;
            jugador.yaw = 0;
            d.luchoHabla = Math.max(0, d.luchoHabla - dt);
            // Tu leño partido: las mitades caen a los lados y aparece otro
            if (d.partido > 0) {
                d.partido -= dt;
                const a = Math.min(1, (1.0 - d.partido) / 0.4);
                for (const h of mitades) {
                    h.m.position.x = d.S.sx + h.l * (0.09 + a * 0.55);
                    h.m.position.y = boris.y + 1.21 + Math.sin(a * Math.PI) * 0.3 - a * 0.85;
                    h.m.rotation.z = -h.l * a * 1.4;
                }
                if (d.partido <= 0) { for (const h of mitades) h.m.visible = false; if (d.lenosJ < LENOS) nuevoLeno(d); }
            }
            leno.position.y += (boris.y + 1.21 - leno.position.y) * Math.min(1, dt * 10);
            if (e.fase === 'intro') {
                e.guion(LENA.intro);
                if (t >= T_INTRO) e.pasar('juego');
                return;
            }
            if (e.fase === 'final') {
                e.guion(LENA[e.final]);
                if (t >= T_FINAL) e.fin();
                return;
            }
            // ---- Juego ----
            d.fase += dt / (1.3 - 0.07 * d.lenosJ); // la marca va y vuelve en 1,3 s (más rápido con cada leño)
            d.cursor = tri(d.fase);
            if (d.golpe > 0) {
                d.golpe -= dt;
                if (d.impacto > 0 && (d.impacto -= dt) <= 0) {
                    hachazo(2);
                    astillar(d.S.sx, boris.y + 1.45, d.S.sz);
                    leno.position.y = boris.y + 1.03;
                    d.golpesJ++;
                    if (d.golpesJ % GOLPES === 0) { d.lenosJ++; partir(d); if (d.lenosJ === 1) reaccion(e, 'tuLeno'); }
                }
            }
            d.rebote = Math.max(0, d.rebote - dt);
            d.lenosB = Math.floor(boris.golpes / GOLPES);
            if (d.lenosB >= 1) reaccion(e, 'borisLeno');
            if (d.lenosJ > d.lenosB && d.lenosJ >= 1) reaccion(e, 'vasGanando');
            if (d.lenosB >= 2 && d.lenosB > d.lenosJ) reaccion(e, 'vasPerdiendo');
            decirPendiente(e);
            if (d.lenosJ >= LENOS && d.golpe <= 0) e.pasar('final', 'gana');
            else if (d.lenosB >= LENOS && d.lenosJ < LENOS) e.pasar('final', 'pierde');
        },
        accion(e) {
            const d = e.datos;
            if (d.golpe > 0 || d.rebote > 0 || d.lenosJ >= LENOS || d.partido > 0.6) return;
            if (enZona(d)) { d.golpe = SWING; d.impacto = IMPACTO; }
            else { d.rebote = REBOTE; sonidos.golpe(); reaccion(e, 'fallo'); }
        },
        premio(e) {
            const d = e.datos;
            if (e.final === 'gana') {
                if (!api.hecho('mj-boris')) { api.marcar('mj-boris'); return [[B.TRONCO, 6], [O.ESMERALDA, 1]]; }
                return [[B.TRONCO, 6]];
            }
            return d.lenosJ ? [[B.TRONCO, d.lenosJ * 2]] : [];
        },
        // Tu cuerpo: guardia con el hacha, golpe (sube, cae, vuelve) o rebote; gestos en la intro y el final
        pose(e) {
            const d = e.datos, t = e.t, s = d.lado;
            const mirarBoris = 0.55 * s; // cy hacia Boris (estás de cara a -Z)
            const guardia = { bDx: -0.55, bDz: 0.32, bIx: -0.55, bIz: -0.32 };
            if (e.fase === 'juego') {
                let ang = -0.55, inc = 0, cy = 0;
                if (d.golpe > 0) {
                    const u = 1 - d.golpe / SWING;
                    if (u < 0.4) { const a = suave(u / 0.4); ang = lerp(-0.55, -3.0, a); inc = lerp(0, -0.12, a); }
                    else if (u < 0.55) { const a = (u - 0.4) / 0.15; ang = lerp(-3.0, -1.35, a * a); inc = lerp(-0.12, 0.15, a); }
                    else { const a = suave((u - 0.55) / 0.45); ang = lerp(-1.35, -0.55, a); inc = lerp(0.15, 0, a); }
                } else if (d.rebote > 0) {
                    const u = 1 - d.rebote / REBOTE;
                    ang = -1.6 - Math.sin(u * Math.PI * 3) * 0.5 * (1 - u);
                    cy = Math.sin(u * 30) * 0.12 * (1 - u); // sacude la cabeza
                }
                return { bDx: ang, bDz: 0.32, bIx: ang, bIz: -0.32, inc, cx: 0.25, cy };
            }
            if (e.fase === 'intro') {
                const muestra = envolvente(t, 3.6, 6.6, 0.4); // te arremangas y muestras el hacha
                return { ...guardia, bDx: lerp(-0.55, -1.25 + Math.sin(t * 5) * 0.12, muestra), bDz: lerp(0.32, 0.1, muestra),
                    bIx: lerp(-0.55, -0.9 + Math.sin(t * 4 + 1) * 0.2, muestra), bIz: lerp(-0.32, -0.15, muestra),
                    cx: t >= 9 ? 0.25 : 0, cy: t < 3.6 ? mirarBoris : t >= 6.6 ? mirarBoris * 0.4 : 0, inc: t >= 9 ? 0.06 : 0 };
            }
            if (e.final === 'gana') {
                const arriba = envolvente(t, 6.4, 9.0, 0.3);
                return { bDx: lerp(-0.55, -2.85, arriba), bDz: lerp(0.32, -0.3, arriba), bIx: lerp(-0.55, -2.85, arriba), bIz: lerp(-0.32, 0.3, arriba),
                    cx: lerp(0.05, -0.3, arriba), cy: t < 3.4 ? mirarBoris * 0.4 : t < 6.4 ? mirarBoris : 0, y: Math.abs(Math.sin(t * 9)) * 0.07 * arriba };
            }
            const rasca = envolvente(t, 6.4, 9.0, 0.3); // perdiste: te rascas la cabeza con la mano libre
            return { ...guardia, bIx: lerp(-0.55, -2.85 + Math.sin(t * 14) * 0.08, rasca), bIz: lerp(-0.32, -0.42, rasca),
                cx: lerp(0.1, 0.12, rasca), cz: -0.15 * rasca, cy: t < 6.4 ? mirarBoris : 0 };
        },
        ui(e) {
            const d = e.datos;
            const golpesB = Math.min(boris.golpes, LENOS * GOLPES), ocupado = d.golpe > 0 || d.rebote > 0 || d.partido > 0.6;
            return {
                titulo: LENA.nombre,
                barras: [
                    { nombre: api.etiq(LENA.tu), v: Math.min(d.golpesJ, LENOS * GOLPES), max: LENOS * GOLPES, texto: `${d.lenosJ}/${LENOS}` },
                    { nombre: 'Boris', v: golpesB, max: LENOS * GOLPES, texto: `${Math.min(d.lenosB, LENOS)}/${LENOS}` }
                ],
                cursor: d.cursor, zona: [d.zonaC - d.zonaA / 2, d.zonaC + d.zonaA / 2], apagado: ocupado,
                pista: LENA.pista, boton: LENA.hachar, inactivo: ocupado, urgente: !ocupado && enZona(d)
            };
        },
        restaurar(e) {
            delete boris.escena; delete lucho.escena;
            grupo.remove(tocon, leno, ...mitades.map(h => h.m));
            if (hacha.parent) hacha.parent.remove(hacha);
            boris.partido = 0; boris.leno.visible = true;
        }
    };
}
