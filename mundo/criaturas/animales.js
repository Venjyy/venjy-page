// =========================================================
// VENJY · Animales del mundo
// Granja en la aldea (vacas, cerdos y ovejas en corrales; gallinas sueltas),
// manadas sueltas por el mapa (conejos, zorros, caballos, vacas y ovejas) y
// pájaros en bandadas (gaviotas en la costa). Modelos de cajas con texturas
// pintadas por código. Lugares deterministas: siempre aparecen en el mismo sitio.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { azar } from '../mundo-datos.js';
import { ESCALA, NIVEL_AGUA } from '../voxeles.js';
import { B } from '../texturas.js';
import {
    ajustar, lerp, angulo, crearTinte, caja, textura, suelo, audioMundo, sonando, bufferRuido
} from './cuerpo.js';

const RADIO_ANIMAL = 120;    // más lejos no se dibujan
const RADIO_DETALLE = 60;    // más lejos se actualizan a menos cuadros por segundo

// ---------------------------------------------------------
// Pelajes (pintores de 16×16)
// ---------------------------------------------------------
const mot = (c, f = 0.16) => (x, y, r) => ajustar(c, 1 - f / 2 + r() * f);
const manchas = (base, mancha, p, sem) => (x, y, r) => {
    const f = Math.sin((x >> 2) * 12.9898 + (y >> 2) * 78.233 + sem * 7.1) * 43758.5453;
    return (f - Math.floor(f)) < p ? mot(mancha, 0.12)(x, y, r) : mot(base, 0.12)(x, y, r);
};
// Cara: ojos a la altura `oy`, con hocico opcional abajo
const cara = (fondo, { ojo = [20, 20, 20], oy = 5, sep = 3, hocico = null, hy = 10, hw = 6 } = {}) => (x, y, r) => {
    if (y === oy && (x === 8 - sep - 1 || x === 7 + sep + 1)) return ojo;
    if (y === oy && (x === 8 - sep - 2 || x === 8 + sep + 1)) return [236, 236, 236];
    if (hocico && y >= hy && Math.abs(x - 7.5) < hw / 2) {
        if (y === hy + 1 && (x === Math.round(7.5 - hw / 4) || x === Math.round(7.5 + hw / 4))) return ajustar(hocico, 0.55);
        return mot(hocico, 0.08)(x, y, r);
    }
    return fondo(x, y, r);
};

const COLORES_CABALLO = [[120, 76, 44], [236, 232, 224], [40, 34, 30], [160, 96, 52]];
const COLORES_OVEJA = [[236, 236, 232], [236, 236, 232], [236, 236, 232], [150, 150, 150], [92, 68, 50], [40, 38, 40]];
const COLORES_CONEJO = [[132, 98, 70], [236, 232, 226], [120, 116, 112], [196, 168, 128]];

// Especies: medidas (bloques) y pintores. El cuerpo mira hacia +Z y el origen está en los pies.
function especie(tipo, variante) {
    switch (tipo) {
        case 'vaca': {
            const pelo = manchas([236, 234, 228], [36, 32, 30], 0.45, variante);
            return {
                cuerpo: [0.9, 0.72, 1.35], pata: [0.26, 0.62], cabeza: [0.55, 0.52, 0.42], cabezaY: 0.15, vel: 0.9, come: true,
                pelo, cara: cara(pelo, { hocico: [222, 168, 160], oy: 6, hy: 9, hw: 8 }), pataPelo: (x, y, r) => y >= 13 ? [56, 48, 40] : pelo(x, y, r),
                cuernos: true, sonido: 'mugido'
            };
        }
        case 'oveja': {
            const lana = COLORES_OVEJA[variante % COLORES_OVEJA.length];
            const pelo = (x, y, r) => ajustar(lana, ((x + y * 3) % 5 === 0 ? 0.86 : 1) * (0.9 + r() * 0.12));
            const piel = mot([196, 178, 160], 0.1);
            return {
                cuerpo: [0.85, 0.78, 1.15], pata: [0.22, 0.52], cabeza: [0.42, 0.42, 0.42], cabezaY: 0.18, vel: 0.85, come: true,
                pelo, cara: cara(piel, { oy: 6 }), pataPelo: piel, sonido: 'balido'
            };
        }
        case 'cerdo': {
            const pelo = mot([238, 160, 160], 0.1);
            return {
                cuerpo: [0.72, 0.58, 1.0], pata: [0.22, 0.36], cabeza: [0.55, 0.5, 0.5], cabezaY: 0.05, vel: 0.8, come: true,
                pelo, cara: cara(pelo, { oy: 5 }), pataPelo: pelo, hocico: true, sonido: 'gruñido'
            };
        }
        case 'caballo': {
            const c = COLORES_CABALLO[variante % COLORES_CABALLO.length];
            const pelo = mot(c, 0.12);
            const crin = ajustar(c, c[0] > 200 ? 0.6 : 0.45);
            return {
                cuerpo: [0.68, 0.72, 1.45], pata: [0.2, 0.92], cabeza: [0.3, 0.32, 0.62], cabezaY: 0.75, vel: 1.4, come: true,
                pelo, cara: cara(pelo, { oy: 4, sep: 5 }), pataPelo: (x, y, r) => y >= 13 ? [44, 36, 30] : pelo(x, y, r),
                caballo: true, crin, sonido: 'relincho'
            };
        }
        case 'zorro': {
            const pelo = mot([214, 112, 40], 0.14);
            return {
                cuerpo: [0.42, 0.38, 0.75], pata: [0.12, 0.26], cabeza: [0.42, 0.34, 0.34], cabezaY: 0.12, vel: 1.6, come: false,
                pelo, cara: (x, y, r) => y >= 9 ? mot([240, 236, 228], 0.08)(x, y, r) : cara(pelo, { oy: 6 })(x, y, r),
                pataPelo: mot([36, 30, 28], 0.1), orejas: true, colaGrande: true, sonido: null
            };
        }
        case 'conejo': {
            const c = COLORES_CONEJO[variante % COLORES_CONEJO.length];
            const pelo = mot(c, 0.14);
            return {
                cuerpo: [0.3, 0.3, 0.44], pata: [0.1, 0.12], cabeza: [0.28, 0.28, 0.26], cabezaY: 0.1, vel: 2.2, come: true,
                pelo, cara: cara(pelo, { oy: 6, sep: 4, hocico: [236, 170, 176], hy: 10, hw: 2 }), pataPelo: pelo,
                orejasLargas: true, salta: true, sonido: null
            };
        }
        case 'gallina': {
            const pelo = mot([244, 244, 240], 0.08);
            return {
                cuerpo: [0.34, 0.34, 0.44], pata: [0.06, 0.26], cabeza: [0.22, 0.3, 0.2], cabezaY: 0.28, vel: 1.0, come: true,
                pelo, cara: cara(pelo, { oy: 5, sep: 4 }), pataPelo: mot([230, 186, 40], 0.1), gallina: true, sonido: 'cacareo'
            };
        }
    }
    return null;
}

// ---------------------------------------------------------
// Modelo de cuadrúpedo (o gallina) a partir de la especie
// ---------------------------------------------------------
function construir(tinte, tipo, variante, semilla) {
    const e = especie(tipo, variante);
    const s = semilla * 13;
    const T = { pelo: textura(s + 1, e.pelo), cara: textura(s + 2, e.cara), pata: textura(s + 3, e.pataPelo) };
    const [cw, ch, cl] = e.cuerpo, [pw, ph] = e.pata, [hw, hh, hd] = e.cabeza;
    const g = new THREE.Group();
    const tronco = new THREE.Group();
    tronco.position.y = ph;
    g.add(tronco);
    const cuerpo = caja(cw, ch, cl, tinte.caras(T.pelo));
    cuerpo.position.y = ch / 2;
    tronco.add(cuerpo);
    // Cabeza: pivote en el borde delantero de arriba del cuerpo (baja al comer)
    const cabeza = new THREE.Group();
    cabeza.position.set(0, ch * 0.8 + e.cabezaY * (e.caballo ? 0 : 1), cl / 2);
    if (e.caballo) {
        // Cuello inclinado y cabeza alargada al final, con crin oscura
        const crinTex = textura(s + 4, mot(e.crin, 0.2));
        const cuello = caja(0.28, 0.75, 0.34, tinte.caras(T.pelo, { 5: crinTex, 2: crinTex }));
        cuello.position.set(0, 0.3, 0.05);
        cuello.rotation.x = 0.5;
        cabeza.add(cuello);
        const cab = caja(hw, hh, hd, tinte.caras(T.pelo, { 4: T.cara }));
        cab.position.set(0, 0.68, 0.38);
        cabeza.add(cab);
        const crin = caja(0.06, 0.6, 0.16, tinte.caras(crinTex));
        crin.position.set(0, 0.42, -0.12); crin.rotation.x = 0.5;
        cabeza.add(crin);
    } else {
        const cab = caja(hw, hh, hd, tinte.caras(T.pelo, { 4: T.cara }));
        cab.position.set(0, 0, hd / 2 - 0.02);
        cabeza.add(cab);
        if (e.cuernos) for (const l of [-1, 1]) {
            const c = caja(0.08, 0.14, 0.08, tinte.caras(textura(s + 5, mot([226, 214, 184], 0.1))));
            c.position.set(l * (hw / 2 + 0.03), hh / 2 + 0.02, 0.06);
            cabeza.add(c);
        }
        if (e.hocico) {
            const h = caja(0.26, 0.18, 0.08, tinte.caras(textura(s + 6, (x, y, r) => (y > 5 && y < 10 && (x === 5 || x === 10)) ? [150, 80, 90] : mot([246, 176, 178], 0.08)(x, y, r))));
            h.position.set(0, -0.06, hd + 0.02);
            cabeza.add(h);
        }
        if (e.orejas) for (const l of [-1, 1]) {
            const o = caja(0.1, 0.14, 0.05, tinte.caras(textura(s + 7, mot([214, 112, 40], 0.14))));
            o.position.set(l * 0.13, hh / 2 + 0.06, 0.06);
            cabeza.add(o);
        }
        if (e.orejasLargas) for (const l of [-1, 1]) {
            const o = caja(0.07, 0.22, 0.04, tinte.caras(T.pelo));
            o.position.set(l * 0.07, hh / 2 + 0.11, 0.04);
            cabeza.add(o);
        }
        if (e.gallina) {
            const cresta = caja(0.06, 0.1, 0.12, tinte.caras(textura(s + 8, mot([214, 30, 30], 0.1))));
            cresta.position.set(0, hh / 2 + 0.05, 0.1);
            const pico = caja(0.1, 0.06, 0.1, tinte.caras(textura(s + 9, mot([236, 180, 40], 0.1))));
            pico.position.set(0, 0, hd + 0.03);
            const barba = caja(0.06, 0.08, 0.04, tinte.caras(textura(s + 8, mot([214, 30, 30], 0.1))));
            barba.position.set(0, -0.08, hd);
            cabeza.add(cresta, pico, barba);
        }
    }
    tronco.add(cabeza);
    // Patas (o alas de gallina además de dos patas)
    const patas = [];
    const pos = e.gallina ? [[-1, 0], [1, 0]] : [[-1, 1], [1, 1], [-1, -1], [1, -1]];
    for (const [sx, sz] of pos) {
        const piv = new THREE.Group();
        piv.position.set(sx * (e.gallina ? 0.08 : cw / 2 - pw / 2), 0, sz * (cl / 2 - pw / 2 - 0.02));
        const p = caja(pw, ph, pw, tinte.caras(T.pata));
        p.position.y = -ph / 2;
        piv.add(p);
        tronco.add(piv);
        patas.push(piv);
    }
    tronco.position.y = ph;
    const alas = [];
    if (e.gallina) for (const l of [-1, 1]) {
        const piv = new THREE.Group();
        piv.position.set(l * cw / 2, ch * 0.85, 0);
        const a = caja(0.04, 0.24, 0.32, tinte.caras(T.pelo));
        a.position.set(l * 0.02, -0.12, 0);
        piv.add(a);
        tronco.add(piv);
        alas.push(piv);
    }
    // Cola
    let cola = null;
    if (e.colaGrande || e.caballo || tipo === 'vaca' || tipo === 'cerdo' || tipo === 'oveja' || tipo === 'conejo') {
        cola = new THREE.Group();
        cola.position.set(0, ch * (e.colaGrande ? 0.6 : 0.85), -cl / 2);
        let m;
        if (e.colaGrande) m = caja(0.22, 0.22, 0.55, tinte.caras(textura(s + 10, (x, y, r) => x < 4 ? [240, 236, 228] : mot([214, 112, 40], 0.14)(x, y, r))));
        else if (e.caballo) m = caja(0.1, 0.6, 0.1, tinte.caras(textura(s + 4, mot(e.crin, 0.2))));
        else if (tipo === 'conejo') m = caja(0.12, 0.12, 0.08, tinte.caras(textura(s + 11, mot([240, 240, 236], 0.06))));
        else m = caja(0.08, 0.4, 0.08, tinte.caras(T.pelo));
        if (e.colaGrande) { m.position.z = -0.25; cola.rotation.x = -0.35; }
        else if (tipo === 'conejo') m.position.z = -0.03;
        else { m.position.y = -0.2; cola.rotation.x = 0.25; }
        cola.add(m);
        tronco.add(cola);
    }
    return { g, tronco, cabeza, patas, alas, cola, e };
}

// ---------------------------------------------------------
// Sonidos sintéticos (suaves y de vez en cuando)
// ---------------------------------------------------------
function sonar(tipo, vol) {
    try {
        if (!sonando() || vol <= 0.004) return;
        const { ctx, master } = audioMundo();
        const t = ctx.currentTime;
        const voz = (onda, f0, f1, f2, dur, filtro, q = 2, vibrato = 0) => {
            const o = ctx.createOscillator(); o.type = onda;
            o.frequency.setValueAtTime(f0, t);
            o.frequency.linearRampToValueAtTime(f1, t + dur * 0.35);
            o.frequency.linearRampToValueAtTime(f2, t + dur);
            if (vibrato) {
                const l = ctx.createOscillator(); l.frequency.value = vibrato;
                const p = ctx.createGain(); p.gain.value = f0 * 0.04;
                l.connect(p); p.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
            }
            const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filtro; f.Q.value = q;
            const e = ctx.createGain();
            e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.2));
            e.gain.setValueAtTime(vol, t + dur * 0.7); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(f); f.connect(e); e.connect(master); o.start(t); o.stop(t + dur + 0.05);
            return e;
        };
        if (tipo === 'mugido') voz('sawtooth', 120, 132, 96, 1.2, 520, 1.5, 5);
        else if (tipo === 'balido') {
            const e = voz('square', 360, 390, 340, 0.7, 1100, 3);
            const trem = ctx.createOscillator(); trem.frequency.value = 9;
            const p = ctx.createGain(); p.gain.value = vol * 0.6;
            trem.connect(p); p.connect(e.gain); trem.start(t); trem.stop(t + 0.75);
        } else if (tipo === 'gruñido') {
            for (const d of [0, 0.22]) {
                const n = ctx.createBufferSource(); n.buffer = bufferRuido(ctx);
                const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 3;
                const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t + d); e.gain.linearRampToValueAtTime(vol * 1.6, t + d + 0.03);
                e.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
                n.connect(f); f.connect(e); e.connect(master); n.start(t + d, Math.random()); n.stop(t + d + 0.2);
            }
        } else if (tipo === 'cacareo') {
            for (const d of [0, 0.13, 0.26, 0.5]) {
                const o = ctx.createOscillator(); o.type = 'triangle';
                o.frequency.setValueAtTime(820, t + d); o.frequency.exponentialRampToValueAtTime(d === 0.5 ? 1500 : 1150, t + d + 0.07);
                const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t + d); e.gain.linearRampToValueAtTime(vol * 0.7, t + d + 0.01);
                e.gain.exponentialRampToValueAtTime(0.0001, t + d + (d === 0.5 ? 0.22 : 0.08));
                o.connect(e); e.connect(master); o.start(t + d); o.stop(t + d + 0.25);
            }
        } else if (tipo === 'relincho') voz('sawtooth', 620, 920, 480, 1.0, 1300, 2.5, 11);
        else if (tipo === 'pío') {
            for (const d of [0, 0.09]) {
                const o = ctx.createOscillator(); o.type = 'sine';
                o.frequency.setValueAtTime(3200, t + d); o.frequency.exponentialRampToValueAtTime(4600, t + d + 0.05);
                const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t + d); e.gain.linearRampToValueAtTime(vol * 0.5, t + d + 0.01);
                e.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.06);
                o.connect(e); e.connect(master); o.start(t + d); o.stop(t + d + 0.08);
            }
        }
    } catch (err) { /* sin sonido */ }
}

// ---------------------------------------------------------
// Manadas sueltas: lugares deterministas según el entorno
// ---------------------------------------------------------
function elegirManadas(terreno) {
    const { BW, BD, HT, ES, SUP, datos } = terreno;
    const { W, H, T, P } = datos;
    const r = azar(4242);
    const puntos = Object.values(P).map(([x, z]) => [x * ESCALA, z * ESCALA]);
    const bosqueEn = (x, z, rad) => {
        const cx = Math.floor(x / ESCALA), cz = Math.floor(z / ESCALA);
        let n = 0;
        for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
            const xx = cx + dx, zz = cz + dz;
            if (xx >= 0 && zz >= 0 && xx < W && zz < H && T[zz * W + xx] === 'hojas') n++;
        }
        return n;
    };
    const candidatos = [];
    for (let z = 24; z < BD - 24; z += 22) {
        for (let x = 24; x < BW - 24; x += 22) {
            const px = Math.floor(x + (r() - 0.5) * 16), pz = Math.floor(z + (r() - 0.5) * 16);
            const o = pz * BW + px;
            if (ES[o] || SUP[o] !== B.PASTO || HT[o] < NIVEL_AGUA + 3) continue;
            // Pendiente suave alrededor
            let mn = HT[o], mx = HT[o];
            for (const [dx, dz] of [[-5, 0], [5, 0], [0, -5], [0, 5], [-4, -4], [4, 4], [-4, 4], [4, -4]]) {
                const h = HT[(pz + dz) * BW + px + dx];
                mn = Math.min(mn, h); mx = Math.max(mx, h);
            }
            if (mx - mn > 3) continue;
            // Lejos de las zonas del portafolio (allí ya hay gatas, NPCs y granja)
            if (puntos.some(([qx, qz]) => Math.hypot(qx - px, qz - pz) < 48)) continue;
            const bosque = bosqueEn(px, pz, 3);
            if (bosqueEn(px, pz, 0)) continue; // justo en un árbol
            candidatos.push({ x: px + 0.5, z: pz + 0.5, h: HT[o], bosque, k: r() });
        }
    }
    candidatos.sort((a, b) => a.k - b.k);
    const cupos = [
        { tipo: 'conejo', n: 7, cuantos: 3, sirve: c => c.bosque <= 6 },
        { tipo: 'zorro', n: 4, cuantos: 2, sirve: c => c.bosque >= 5 },
        { tipo: 'caballo', n: 4, cuantos: 3, sirve: c => c.bosque <= 2 },
        { tipo: 'vaca', n: 3, cuantos: 3, sirve: c => c.bosque <= 2 },
        { tipo: 'oveja', n: 4, cuantos: 4, sirve: c => c.bosque <= 3 && c.h >= NIVEL_AGUA + 8 },
        { tipo: 'oveja', n: 1, cuantos: 4, sirve: c => c.bosque <= 3 }
    ];
    const manadas = [];
    for (const cupo of cupos) {
        let n = 0;
        for (const c of candidatos) {
            if (n >= cupo.n) break;
            if (c.usado || !cupo.sirve(c)) continue;
            if (manadas.some(m => Math.hypot(m.x - c.x, m.z - c.z) < 56)) continue;
            c.usado = true; n++;
            manadas.push({ tipo: cupo.tipo, x: c.x, z: c.z, radio: cupo.tipo === 'zorro' ? 16 : 12, cuantos: cupo.cuantos });
        }
    }
    return manadas;
}

// Pasto parejo a 15–25 bloques de un lugar (fuera de sus construcciones), el más cercano que sirva
function praderaJunto(terreno, L) {
    const { BW, BD, HT, ES, SUP } = terreno;
    for (let d = 15; d <= 25; d += 2) {
        for (let k = 0; k < 12; k++) {
            const a = k / 12 * Math.PI * 2;
            const x = Math.floor(L.bx + Math.cos(a) * d), z = Math.floor(L.bz + Math.sin(a) * d);
            if (x < 8 || z < 8 || x >= BW - 8 || z >= BD - 8) continue;
            const o = z * BW + x;
            if (ES[o] || SUP[o] !== B.PASTO || HT[o] < NIVEL_AGUA + 3) continue;
            let mn = HT[o], mx = HT[o], libre = true;
            for (const [dx, dz] of [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, -3], [3, 3], [-3, 3], [3, -3]]) {
                const q = (z + dz) * BW + x + dx;
                if (ES[q]) libre = false;
                mn = Math.min(mn, HT[q]); mx = Math.max(mx, HT[q]);
            }
            if (libre && mx - mn <= 2) return { x: x + 0.5, z: z + 0.5 };
        }
    }
    return null;
}

// ---------------------------------------------------------
// Crear todos los animales
// ---------------------------------------------------------
export function crearAnimales(scene, { terreno, mundo, jugador, materiales }) {
    const tinte = crearTinte();
    const lista = [];
    const r = azar(777);
    let semilla = 1;
    const rnd = (a, b) => a + Math.random() * (b - a);

    function agregar(tipo, x, z, zona) {
        const variante = Math.floor(r() * 12);
        const m = construir(tinte, tipo, variante, semilla++);
        m.g.visible = false;
        scene.add(m.g);
        const a = {
            tipo, ...m, x, z, y: 0, yaw: r() * Math.PI * 2, zona, cargado: false,
            estado: 'quieto', reloj: rnd(0.5, 4), destino: null, fase: 0, comer: 0,
            proximoSonido: rnd(4, 25), cuadro: Math.floor(r() * 4), acum: 0,
            huye: 0, escala: 1 // supervivencia: huye tras un golpe; las crías son más chicas
        };
        lista.push(a);
        return a;
    }
    // Granja: corrales de la aldea
    for (const c of terreno.corrales || []) {
        const R = c.rect;
        const tipos = c.tipo === 'vacas' ? ['vaca', 'vaca', 'vaca', 'cerdo', 'cerdo', 'cerdo'] : ['oveja', 'oveja', 'oveja', 'oveja', 'oveja'];
        for (const tipo of tipos) agregar(tipo, lerp(R.x0 + 1, R.x1 - 1, r()), lerp(R.z0 + 1, R.z1 - 1, r()), { rect: R, evitar: c.evitar, estructuras: true });
    }
    // Gallinas sueltas cerca de las casas de la aldea
    const [ax, az] = terreno.datos.P.aldea;
    const aldea = { x: ax * ESCALA + 2, z: az * ESCALA + 2, radio: 26, estructuras: true };
    for (let k = 0; k < 7; k++) agregar('gallina', aldea.x + (r() - 0.5) * 20, aldea.z + 10 + (r() - 0.5) * 14, aldea);
    // Manadas sueltas
    const manadas = elegirManadas(terreno);
    for (const m of manadas) {
        for (let k = 0; k < m.cuantos; k++) {
            const a = r() * Math.PI * 2, d = r() * m.radio * 0.5;
            agregar(m.tipo, m.x + Math.cos(a) * d, m.z + Math.sin(a) * d, { x: m.x, z: m.z, radio: m.radio });
        }
    }
    // Pradera junto al campamento: vacas, cerdos y gallinas cerca de la fogata (carne para el asado del
    // modo supervivencia). Van al final de la lista: el guardado del ganado usa el índice de cada animal.
    const camp = (terreno.lugares || []).find(l => l.clave === 'campamento');
    const prado = camp && praderaJunto(terreno, camp);
    if (prado) {
        const zona = { x: prado.x, z: prado.z, radio: 9 };
        for (const tipo of ['vaca', 'vaca', 'cerdo', 'cerdo', 'gallina', 'gallina', 'gallina']) agregar(tipo, prado.x + (r() - 0.5) * 8, prado.z + (r() - 0.5) * 8, zona);
    }

    // ¿Puede pisar (x, z)? Devuelve la y, null o undefined (chunk sin cargar)
    function pisar(a, x, z) {
        const zn = a.zona;
        if (zn.rect) {
            const R = zn.rect;
            if (x < R.x0 || x > R.x1 || z < R.z0 || z > R.z1) return null;
            if (zn.evitar && zn.evitar.some(e => x > e.x0 && x < e.x1 && z > e.z0 && z < e.z1)) return null;
        } else if (Math.hypot(x - zn.x, z - zn.z) > zn.radio) return null;
        return suelo(terreno, mundo, x, z, { estructuras: !!zn.estructuras });
    }
    function nuevoDestino(a) {
        const zn = a.zona;
        for (let k = 0; k < 8; k++) {
            let x, z;
            if (zn.rect) { x = lerp(zn.rect.x0, zn.rect.x1, Math.random()); z = lerp(zn.rect.z0, zn.rect.z1, Math.random()); }
            else {
                // Pasos cortos desde donde está, sin salir del radio de la manada
                const ang = Math.random() * Math.PI * 2, d = rnd(2, a.tipo === 'zorro' ? 10 : 6);
                x = a.x + Math.cos(ang) * d; z = a.z + Math.sin(ang) * d;
            }
            if (pisar(a, x, z)) return { x, z };
        }
        return null;
    }

    function actualizarAnimal(a, dt, t, dJ) {
        if (!a.cargado) {
            const y = pisar(a, a.x, a.z);
            if (y === undefined) { a.g.visible = false; return; }
            if (y === null) { // apareció en mal sitio: busca otro dentro de su zona
                const d = nuevoDestino(a);
                if (d) { a.x = d.x; a.z = d.z; }
                a.g.visible = false;
                return;
            }
            a.y = y; a.cargado = true;
        }
        const e = a.e;
        let mueve = false;
        a.reloj -= dt;
        if (a.estado === 'quieto' || a.estado === 'come') {
            if (a.reloj <= 0) {
                const q = Math.random();
                if (e.come && q < 0.3) { a.estado = 'come'; a.reloj = rnd(2, 5); }
                else if (q < 0.85) { a.destino = nuevoDestino(a); a.estado = a.destino ? 'camina' : 'quieto'; a.reloj = a.destino ? 12 : 1; }
                else { a.estado = 'quieto'; a.reloj = rnd(2, 6); }
            }
        } else if (a.estado === 'camina') {
            const w = a.destino;
            const dx = w.x - a.x, dz = w.z - a.z, d = Math.hypot(dx, dz);
            if (d < 0.3 || a.reloj <= 0) { a.estado = 'quieto'; a.reloj = rnd(1.5, 6); }
            else {
                const v = e.vel * ((a.tipo === 'zorro' || a.huye > 0) && a.corre ? 2.2 : 1);
                const paso = Math.min(d, v * dt);
                const nx = a.x + dx / d * paso, nz = a.z + dz / d * paso;
                const ny = pisar(a, nx, nz);
                if (ny === undefined) a.reloj = Math.min(a.reloj, 0.5);
                else if (ny === null || Math.abs(ny - a.y) > 1.2) { a.estado = 'quieto'; a.reloj = rnd(0.5, 2); }
                else {
                    a.x = nx; a.z = nz;
                    a.y += (ny - a.y) * Math.min(1, dt * 10);
                    a.yaw += angulo(Math.atan2(dx, dz) - a.yaw) * Math.min(1, dt * 6);
                    mueve = true;
                }
            }
        }
        // Golpeado (supervivencia): corre lejos de quien le pegó mientras dure el susto
        if (a.huye > 0) {
            a.huye -= dt;
            if (a.estado !== 'camina' || a.reloj < 0.3) {
                const ang = Math.atan2(a.x - a.susto.x, a.z - a.susto.z) + (Math.random() - 0.5) * 1.2;
                const x = a.x + Math.sin(ang) * 6, z = a.z + Math.cos(ang) * 6;
                if (pisar(a, x, z)) { a.destino = { x, z }; a.estado = 'camina'; a.reloj = 2; a.corre = true; }
            }
        } else
        // Zorros y conejos se asustan si el jugador se acerca mucho: arrancan
        if ((a.tipo === 'conejo' || a.tipo === 'zorro') && dJ < 4 && a.estado !== 'camina') {
            const ang = Math.atan2(a.x - jugador.pos.x, a.z - jugador.pos.z);
            const x = a.x + Math.sin(ang) * 5, z = a.z + Math.cos(ang) * 5;
            if (pisar(a, x, z)) { a.destino = { x, z }; a.estado = 'camina'; a.reloj = 4; a.corre = true; }
        } else if (a.estado !== 'camina') a.corre = false;

        // Animación
        a.fase += mueve ? dt * e.vel * (a.corre ? 9 : 6) : 0;
        const bal = mueve ? Math.sin(a.fase) * 0.6 : 0;
        if (a.patas.length === 4) {
            a.patas[0].rotation.x = bal; a.patas[3].rotation.x = bal;
            a.patas[1].rotation.x = -bal; a.patas[2].rotation.x = -bal;
        } else { a.patas[0].rotation.x = bal; a.patas[1].rotation.x = -bal; }
        // Cabeza: baja al comer (la gallina picotea), mira al jugador si está cerca y quieto
        const objComer = a.estado === 'come' ? 1 : 0;
        a.comer += (objComer - a.comer) * Math.min(1, dt * 4);
        let picoteo = 0;
        if (e.gallina && a.estado === 'come') picoteo = Math.max(0, Math.sin(t * 9 + a.cuadro)) * 0.5;
        a.cabeza.rotation.x = a.comer * (e.caballo ? 0.9 : 0.75) + picoteo;
        let giro = 0;
        if (dJ < 7 && !mueve && a.estado !== 'come') {
            const aJ = Math.atan2(jugador.pos.x - a.x, jugador.pos.z - a.z);
            giro = Math.max(-0.8, Math.min(0.8, angulo(aJ - a.yaw)));
        }
        a.cabeza.rotation.y += (giro - a.cabeza.rotation.y) * Math.min(1, dt * 5);
        if (a.cola) a.cola.rotation.z = Math.sin(t * 2.4 + a.cuadro) * 0.25;
        if (a.alas.length) { // la gallina aletea al correr o de vez en cuando
            const aleteo = mueve && Math.sin(t * 1.3 + a.cuadro) > 0.6 ? Math.abs(Math.sin(t * 30)) * 0.9 : 0;
            a.alas[0].rotation.z = -aleteo; a.alas[1].rotation.z = aleteo;
        }
        const salto = e.salta && mueve ? Math.abs(Math.sin(a.fase * 0.5)) * 0.35 : 0;
        a.g.position.set(a.x, a.y + salto, a.z);
        a.g.rotation.y = a.yaw;
        if (a.escala !== 1) a.g.scale.setScalar(a.escala);
        // Sacudón al recibir un golpe
        if (a.sacudon > 0) { a.sacudon -= dt; a.g.rotation.z = Math.sin(a.sacudon * 30) * 0.25 * a.sacudon * 3; } else if (a.g.rotation.z) a.g.rotation.z = 0;

        // Sonido de vez en cuando, solo si el jugador está cerca
        a.proximoSonido -= dt;
        if (a.proximoSonido <= 0) {
            a.proximoSonido = rnd(10, 30);
            if (e.sonido && dJ < 14) sonar(e.sonido, 0.12 * Math.max(0, 1 - dJ / 14));
        }
    }

    // ---------------------------------------------------------
    // Pájaros: bandadas que giran en círculos amplios; gaviotas sobre la costa y el faro
    // ---------------------------------------------------------
    const pajaros = [];
    const texPajaro = textura(9301, mot([70, 62, 58], 0.2));
    const texAla = textura(9302, (x, y, r) => x > 11 ? [36, 32, 30] : mot([96, 84, 74], 0.2)(x, y, r));
    const texGaviota = textura(9303, mot([240, 240, 236], 0.06));
    const texAlaGaviota = textura(9304, (x, y, r) => x > 12 ? [40, 40, 44] : mot([170, 174, 180], 0.1)(x, y, r));
    function pajaro(gaviota) {
        const g = new THREE.Group();
        const k = gaviota ? 1.5 : 1;
        const cuerpo = caja(0.16 * k, 0.13 * k, 0.36 * k, tinte.caras(gaviota ? texGaviota : texPajaro));
        const cab = caja(0.13 * k, 0.12 * k, 0.12 * k, tinte.caras(gaviota ? texGaviota : texPajaro));
        cab.position.set(0, 0.05 * k, 0.22 * k);
        g.add(cuerpo, cab);
        if (gaviota) { const pico = caja(0.04, 0.04, 0.1, tinte.caras(textura(9305, () => [236, 190, 40]))); pico.position.set(0, 0.06 * k, 0.33 * k); g.add(pico); }
        const alas = [-1, 1].map(l => {
            const piv = new THREE.Group();
            piv.position.set(l * 0.08 * k, 0.03, 0);
            const a = caja(0.42 * k, 0.03, 0.2 * k, tinte.caras(gaviota ? texAlaGaviota : texAla));
            a.position.x = l * 0.21 * k;
            piv.add(a); g.add(piv);
            return piv;
        });
        g.visible = false;
        scene.add(g);
        return { g, alas };
    }
    {
        const { BW, BD, HT, datos } = terreno;
        const P = datos.P;
        const altura = (x, z) => HT[Math.max(0, Math.min(BD - 1, Math.floor(z))) * BW + Math.max(0, Math.min(BW - 1, Math.floor(x)))];
        const centros = [
            { x: (P.casa[0] + P.registro[0]) / 2 * ESCALA, z: (P.casa[1] + 30) * ESCALA },
            { x: P.mina[0] * ESCALA - 40, z: P.mina[1] * ESCALA + 70 },
            { x: (P.gatera[0] + P.correo[0]) / 2 * ESCALA, z: P.gatera[1] * ESCALA - 60 },
            { x: P.spawn[0] * ESCALA + 60, z: P.spawn[1] * ESCALA - 40 }
        ];
        centros.forEach((c, i) => {
            const n = 6 + (i % 3);
            const radio = 26 + i * 6;
            // Vuela sobre el punto más alto del círculo (cerros, árboles y las letras del título)
            let techo = NIVEL_AGUA;
            for (let k = 0; k < 24; k++) for (const rr of [0, radio * 0.5, radio, radio + 6]) techo = Math.max(techo, altura(c.x + Math.cos(k / 24 * Math.PI * 2) * rr, c.z + Math.sin(k / 24 * Math.PI * 2) * rr));
            const alto = techo + 14 + i * 2;
            for (let k = 0; k < n; k++) pajaros.push({ ...pajaro(false), cx: c.x, cz: c.z, radio: radio + (k % 3) * 3, alto: alto + (k % 2) * 2, ang: k * 0.32 + i, vel: 0.16 + i * 0.015, dir: i % 2 ? -1 : 1, fase: k * 1.7, chirrido: rnd(3, 15) });
        });
        // Gaviotas: alrededor del faro, cerca del agua
        const [fx, fz] = P.faro;
        for (let k = 0; k < 6; k++) pajaros.push({ ...pajaro(true), cx: fx * ESCALA + 2, cz: fz * ESCALA + 2, radio: 14 + k * 4, alto: NIVEL_AGUA + 18 + (k % 3) * 4, ang: k * 1.1, vel: 0.22 - k * 0.012, dir: k % 2 ? 1 : -1, fase: k, chirrido: rnd(5, 20), gaviota: true });
    }
    function actualizarPajaros(dt, t) {
        for (const p of pajaros) {
            const d = Math.hypot(p.cx - jugador.pos.x, p.cz - jugador.pos.z);
            p.g.visible = d < 220;
            if (!p.g.visible) continue;
            p.ang += p.vel * p.dir * dt;
            const x = p.cx + Math.cos(p.ang) * p.radio, z = p.cz + Math.sin(p.ang) * p.radio;
            const y = p.alto + Math.sin(t * 0.7 + p.fase) * 1.5;
            p.g.position.set(x, y, z);
            // Rumbo tangente al círculo e inclinado hacia el centro
            p.g.rotation.set(0, Math.atan2(-Math.sin(p.ang) * p.dir, Math.cos(p.ang) * p.dir), 0);
            p.g.rotateZ(-0.25 * p.dir);
            // Aleteo con planeos (las gaviotas planean más)
            const planea = Math.sin(t * 0.5 + p.fase) > (p.gaviota ? -0.2 : 0.4);
            const ala = planea ? 0.08 : Math.sin(t * (p.gaviota ? 9 : 16) + p.fase) * 0.7;
            p.alas[0].rotation.z = ala; p.alas[1].rotation.z = -ala;
            p.chirrido -= dt;
            if (p.chirrido <= 0) {
                p.chirrido = rnd(8, 25);
                const dj = Math.hypot(x - jugador.pos.x, y - jugador.pos.y, z - jugador.pos.z);
                if (dj < 28) sonar('pío', 0.08 * (1 - dj / 28));
            }
        }
    }

    let tiempo = 0, cuadro = 0;
    return {
        lista, pajaros, agregar,
        // Supervivencia: quitar uno (cazado) y asustarlo (golpe desde ox, oz)
        quitar(a) { const i = lista.indexOf(a); if (i >= 0) lista.splice(i, 1); scene.remove(a.g); },
        asustar(a, ox, oz, segundos = 5) { a.huye = segundos; a.susto = { x: ox, z: oz }; a.reloj = 0; a.sacudon = 0.3; },
        actualizar(dt, oculto = false) {
            tiempo += dt; cuadro++;
            dt = Math.min(dt, 0.05);
            tinte.aplicar(materiales.solido.color);
            for (const a of lista) {
                const dJ = Math.hypot(a.x - jugador.pos.x, a.z - jugador.pos.z);
                const visible = !oculto && dJ < RADIO_ANIMAL;
                if (!visible) { a.g.visible = false; continue; }
                // Lejos: se actualiza uno de cada 4 cuadros con el tiempo acumulado
                a.acum += dt;
                if (dJ > RADIO_DETALLE && (cuadro + a.cuadro) % 4 !== 0) continue;
                actualizarAnimal(a, Math.min(a.acum, 0.2), tiempo, dJ);
                a.acum = 0;
                if (a.cargado) a.g.visible = true;
            }
            if (oculto) { for (const p of pajaros) p.g.visible = false; }
            else actualizarPajaros(dt, tiempo);
        }
    };
}
