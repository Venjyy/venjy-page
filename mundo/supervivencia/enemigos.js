// =========================================================
// VENJY · Supervivencia · Monstruos
// Zombi, esqueleto (con arco), araña (trepa), creeper (explota) y el Trauco (mito chilote:
// bajito, sombrero de quilineja y hacha de piedra; anda por los bosques de noche y su golpe
// aturde). Aparecen en la oscuridad (de noche a cielo abierto o en cuevas) según la
// dificultad, nunca cerca de los amigos (zona segura), y los zombis y esqueletos se queman
// con el sol (el Trauco se esfuma al amanecer). Modelos de cajas pintados con código.
// Online (api.red = coop.js): cada cliente simula los monstruos que aparecen junto a él y persiguen
// al jugador más cercano de la sala; los de los demás son «fantasmas» que solo se dibujan con lo que
// llega por la red y, al golpearlos, avisan a su dueño.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B, TIPO } from '../texturas.js';
import { crearTinte, crearPersona, caminar, texturaPixeles, caja, colgante, angulo } from '../criaturas/cuerpo.js';
import { moverCuerpo, solidoEn } from '../fisica.js';
import { O, dropsDe, infoBloque } from './objetos.js';
import { sonidos } from './sonidos.js';

const ajustar = ([r, g, b], f) => [r * f, g * f, b * f];
const mota = (c, f = 0.18) => (x, y, r) => ajustar(c, 1 - f / 2 + r() * f);

// Retroceso al recibir un golpe (7a). Durante `tiempo` el monstruo no persigue y casi no frena, así el
// empuje no se borra al cuadro siguiente: ≈ 2,3 bloques normal y ≈ 4,3 corriendo (Minecraft: 2,5 y 4). Valores
// medidos con mundo/tests/retroceso.mjs (el plan decía 0,4 s y ×14: daba 1,8 y 3,4).
export const RETROCESO = { tiempo: 0.5, factor: 16, salto: 6, rocePersecucion: 10, roceRetroceso: 3, roceAire: 2 };

export function empujar(e, dx, dz, fuerza) {
    const n = Math.hypot(dx, dz) || 1;
    e.vel.x += dx / n * fuerza * RETROCESO.factor; e.vel.z += dz / n * fuerza * RETROCESO.factor;
    if (e.enSuelo) e.vel.y = RETROCESO.salto;
    e.retroceso = RETROCESO.tiempo;
}

// Suaviza la velocidad horizontal hacia (ix, iz)·v. En retroceso el objetivo es 0 y el roce es bajo.
export function suavizarVelocidad(e, ix, iz, v, dt) {
    let k = e.enSuelo ? RETROCESO.rocePersecucion : RETROCESO.roceAire;
    if (e.retroceso > 0) { ix = 0; iz = 0; if (e.enSuelo) k = RETROCESO.roceRetroceso; e.retroceso = Math.max(0, e.retroceso - dt); }
    const a = 1 - Math.exp(-k * dt);
    e.vel.x += (ix * v - e.vel.x) * a;
    e.vel.z += (iz * v - e.vel.z) * a;
}

export const NOMBRES_MOB = {
    zombi: { es: 'Zombi', en: 'Zombie' }, esqueleto: { es: 'Esqueleto', en: 'Skeleton' },
    arana: { es: 'Araña', en: 'Spider' }, creeper: { es: 'Creeper', en: 'Creeper' }, trauco: { es: 'Trauco', en: 'Trauco' },
    lepisma: { es: 'Lepisma', en: 'Silverfish' }
};

const DEF = {
    zombi: { vida: 20, vel: 2.5, dano: 3, alcance: 1.6, ancho: 0.6, alto: 1.9, sol: true },
    esqueleto: { vida: 20, vel: 2.5, dano: 3, ancho: 0.6, alto: 1.9, sol: true, arquero: true },
    arana: { vida: 16, vel: 3.6, dano: 2, alcance: 1.7, ancho: 1.3, alto: 0.9, trepa: true },
    creeper: { vida: 20, vel: 2.2, ancho: 0.6, alto: 1.7 },
    trauco: { vida: 18, vel: 3.3, dano: 4, alcance: 1.6, ancho: 0.5, alto: 1.35, aturde: true },
    lepisma: { vida: 6, vel: 3.6, dano: 1, alcance: 1.0, ancho: 0.45, alto: 0.35 }
};
const azarEntre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function soltarDe(tipo) {
    switch (tipo) {
        case 'zombi': {
            const l = [[O.CARNE_PODRIDA, azarEntre(0, 2)]];
            const r = Math.random();
            if (r < 0.025) l.push([O.LINGOTE_HIERRO, 1]); else if (r < 0.05) l.push([O.ZANAHORIA, 1]); else if (r < 0.075) l.push([O.PAPA, 1]);
            return l;
        }
        case 'esqueleto': return [[O.HUESO, azarEntre(0, 2)], [O.FLECHA, azarEntre(0, 2)]];
        case 'arana': return [[O.HILO, azarEntre(0, 2)], ...(Math.random() < 0.33 ? [[O.OJO_ARANA, 1]] : [])];
        case 'creeper': return [[O.POLVORA, azarEntre(0, 2)]];
        case 'lepisma': return [];
        case 'trauco': return [[O.CUERO, azarEntre(0, 1)], [O.PALO, azarEntre(0, 2)], ...(Math.random() < 0.08 ? [[O.HACHA_PIEDRA, 1]] : [])];
        default: return [];
    }
}

// ---------------------------------------------------------
// Pieles y modelos
// ---------------------------------------------------------
function caraCon(base, ojo, boca) {
    return (x, y, r) => {
        if ((y === 7 || y === 8) && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) return ojo;
        if (boca && y === 11 && x >= 5 && x <= 10) return boca;
        return mota(base)(x, y, r);
    };
}
const PIELES = {
    zombi: () => {
        const verde = [86, 136, 70], camisa = [42, 138, 150], pant = [64, 56, 138];
        return {
            cabeza: { frente: caraCon(verde, [20, 30, 18], [52, 84, 44]), lado: mota(verde), atras: mota([60, 96, 50]), arriba: mota([48, 76, 40]) },
            cuerpo: { frente: (x, y, r) => y > 20 ? mota(pant)(x, y, r) : mota(camisa)(x, y, r) },
            brazo: { frente: (x, y, r) => y < 8 ? mota(camisa)(x, y, r) : mota(verde)(x, y, r) },
            pierna: { frente: (x, y, r) => y > 20 ? mota([70, 70, 74])(x, y, r) : mota(pant)(x, y, r) }
        };
    },
    esqueleto: () => {
        const hueso = [196, 196, 186], hueco = [44, 44, 44];
        const costillas = (x, y, r) => (y % 4 === 1 && x > 2 && x < 13) || (x === 7 || x === 8) ? mota(hueso)(x, y, r) : (y > 18 ? mota(hueso)(x, y, r) : hueco);
        return {
            cabeza: { frente: (x, y, r) => ((y >= 6 && y <= 9) && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) || (y === 12 && x >= 4 && x <= 11 && x % 2 === 0) ? [24, 24, 24] : mota(hueso)(x, y, r), lado: mota(hueso), arriba: mota(hueso) },
            cuerpo: { frente: costillas, atras: costillas },
            brazo: { frente: (x, y, r) => y % 6 === 5 ? ajustar(hueso, 0.75) : mota(hueso)(x, y, r) },
            pierna: { frente: (x, y, r) => y % 6 === 5 ? ajustar(hueso, 0.75) : mota(hueso)(x, y, r) }
        };
    },
    trauco: () => {
        const piel = [150, 104, 70], ropa = [104, 84, 48], barba = [70, 52, 36];
        return {
            cabeza: {
                frente: (x, y, r) => {
                    if (y === 7 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) return [30, 18, 10];
                    if (y >= 10) return mota(barba, 0.3)(x, y, r);
                    if (y === 9 && x >= 6 && x <= 9) return [120, 76, 48]; // nariz grande
                    return mota(piel)(x, y, r);
                },
                lado: (x, y, r) => y >= 10 ? mota(barba, 0.3)(x, y, r) : mota(piel)(x, y, r), atras: mota(barba, 0.3)
            },
            cuerpo: { frente: (x, y, r) => (x + y) % 5 === 0 ? mota([80, 62, 34])(x, y, r) : mota(ropa, 0.3)(x, y, r) },
            brazo: { frente: (x, y, r) => y < 10 ? mota(ropa, 0.3)(x, y, r) : mota(piel)(x, y, r) },
            pierna: { frente: (x, y, r) => y > 19 ? mota([60, 44, 28])(x, y, r) : mota([92, 72, 40], 0.3)(x, y, r) }
        };
    }
};

function texturasDe(semilla, pintor, w = 16, h = 16) { return texturaPixeles(w, h, semilla, pintor); }

function modeloCreeper(tinte, semilla) {
    const verde = (x, y, r) => { const v = r(); return v < 0.2 ? [60, 150, 52] : v < 0.4 ? [110, 190, 90] : v < 0.5 ? [180, 210, 170] : [80, 170, 66]; };
    const cara = (x, y, r) => {
        const ojos = (y >= 4 && y <= 7) && ((x >= 2 && x <= 5) || (x >= 10 && x <= 13));
        const boca = (y >= 8 && y <= 9 && x >= 6 && x <= 9) || (y >= 10 && y <= 13 && ((x >= 4 && x <= 5) || (x >= 10 && x <= 11) || (x >= 6 && x <= 9 && y <= 11)));
        return ojos || boca ? [12, 20, 10] : verde(x, y, r);
    };
    const tv = texturasDe(semilla, verde), tc = texturasDe(semilla + 1, cara);
    const g = new THREE.Group();
    const cuerpo = new THREE.Group(); g.add(cuerpo);
    const torso = caja(0.5, 0.75, 0.3, tinte.caras(tv)); torso.position.y = 0.375 + 0.375; cuerpo.add(torso);
    const cabeza = caja(0.5, 0.5, 0.5, tinte.caras(tv, { 4: tc })); cabeza.position.y = 1.375; cuerpo.add(cabeza);
    const patas = [[-0.13, 0.17], [0.13, 0.17], [-0.13, -0.17], [0.13, -0.17]].map(([x, z]) => { const p = colgante(0.25, 0.375, 0.25, tinte.caras(tv), x, 0.375, z); cuerpo.add(p); return p; });
    return { g, cuerpo, cabeza, patas };
}

function modeloArana(tinte, semilla) {
    const cafe = (x, y, r) => { const v = r(); return v < 0.3 ? [40, 32, 28] : v < 0.5 ? [70, 56, 46] : [52, 42, 36]; };
    const cara = (x, y, r) => {
        if ((y === 6 || y === 7) && (x === 3 || x === 4 || x === 11 || x === 12)) return [230, 20, 20];
        if (y === 4 && (x === 6 || x === 9)) return [200, 30, 30];
        return cafe(x, y, r);
    };
    const tc = texturasDe(semilla, cafe), tcara = texturasDe(semilla + 1, cara);
    const g = new THREE.Group();
    const cuerpo = new THREE.Group(); g.add(cuerpo);
    const abdomen = caja(0.85, 0.65, 0.95, tinte.caras(tc)); abdomen.position.set(0, 0.55, -0.55); cuerpo.add(abdomen);
    const torax = caja(0.5, 0.45, 0.5, tinte.caras(tc)); torax.position.set(0, 0.45, 0); cuerpo.add(torax);
    const cabeza = caja(0.6, 0.55, 0.55, tinte.caras(tc, { 4: tcara })); cabeza.position.set(0, 0.5, 0.48); cuerpo.add(cabeza);
    const patas = [];
    for (let i = 0; i < 4; i++) for (const l of [-1, 1]) {
        const piv = new THREE.Group();
        piv.position.set(l * 0.25, 0.48, 0.2 - i * 0.2);
        const pata = caja(1.0, 0.1, 0.1, tinte.caras(tc));
        pata.position.x = l * 0.5;
        piv.add(pata);
        piv.rotation.z = l * -0.45;
        piv.rotation.y = l * (0.5 - i * 0.33);
        piv.userData = { l, i };
        cuerpo.add(piv); patas.push(piv);
    }
    return { g, cuerpo, cabeza, patas };
}

function modeloLepisma(tinte, semilla) {
    const gris = (x, y, r) => ajustar([150, 150, 156], (y % 4 === 0 ? 0.7 : 1) * (0.85 + r() * 0.25));
    const t = texturasDe(semilla, gris);
    const g = new THREE.Group();
    const cuerpo = new THREE.Group(); g.add(cuerpo);
    const segmentos = [[0.24, 0.2, 0.2, 0.25], [0.32, 0.26, 0.24, 0.02], [0.26, 0.2, 0.2, -0.2], [0.16, 0.14, 0.16, -0.38]].map(([w, h, d, z]) => {
        const c = caja(w, h, d, tinte.caras(t)); c.position.set(0, h / 2, z); cuerpo.add(c); return c;
    });
    return { g, cuerpo, patas: [], segmentos };
}

function modeloPersona(tinte, tipo, semilla) {
    const p = crearPersona(tinte, PIELES[tipo](), semilla);
    if (tipo === 'esqueleto') {
        // Brazos y piernas flacos (huesos)
        for (const l of [p.brazoD, p.brazoI, p.piernaD, p.piernaI]) l.children[0].scale.set(0.45, 1, 0.45);
        // Arco en la mano
        const arco = new THREE.Group();
        const m = new THREE.MeshBasicMaterial({ color: 0x6e5130 });
        for (const [y, rz] of [[0.25, 0.4], [0, 0], [-0.25, -0.4]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), m); b.position.set(0, y, 0); b.rotation.z = rz; arco.add(b); }
        arco.position.set(0, -0.65, 0.15);
        arco.rotation.x = Math.PI / 2;
        p.brazoD.add(arco);
    }
    if (tipo === 'trauco') {
        // Sombrero cónico de quilineja y hacha de piedra (pahueldún)
        const paja = texturasDe(semilla + 9, (x, y, r) => ajustar([196, 160, 84], (x + y) % 3 === 0 ? 0.8 : 1 + r() * 0.1));
        const ala = caja(0.8, 0.06, 0.8, tinte.caras(paja)); ala.position.y = 0.52;
        const copa1 = caja(0.5, 0.18, 0.5, tinte.caras(paja)); copa1.position.y = 0.62;
        const copa2 = caja(0.28, 0.16, 0.28, tinte.caras(paja)); copa2.position.y = 0.78;
        p.cuello.add(ala, copa1, copa2);
        const hacha = new THREE.Group();
        const mango = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.6), new THREE.MeshBasicMaterial({ color: 0x6e5130 }));
        const piedra = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.16), new THREE.MeshBasicMaterial({ color: 0x77777b }));
        piedra.position.set(0, 0.08, 0.26);
        hacha.add(mango, piedra);
        hacha.position.set(0, -0.68, 0.18);
        p.brazoD.add(hacha);
    }
    return p;
}

// ---------------------------------------------------------
export function crearEnemigos(ctx) {
    const { scene, mundo, jugador, vida, dia, entidades, proyectiles, terreno, datos, zonasSeguras, dificultad = () => 2, hud } = ctx;
    const lista = [];
    const fantasmas = new Map(); // uid -> monstruo de otro jugador (solo dibujo)
    let semilla = 5000, relojAparecer = 0, contador = 0;
    const MAX = [0, 8, 12, 16];
    const api = { red: null, prefijo: '' };

    // Jugadores a los que se puede perseguir: el local y, online, los de la sala
    const yo = { id: null, get pos() { return jugador.pos; }, get vivo() { return !vida.muerto; } };
    const jugadores = () => (api.red ? [yo, ...api.red.jugadores()] : [yo]);
    function masCercano(x, y, z) {
        let mejor = null, dm = Infinity;
        for (const j of jugadores()) {
            if (!j.vivo) continue;
            const d = Math.hypot(j.pos.x - x, j.pos.z - z) + Math.abs(j.pos.y - y) * 0.5;
            if (d < dm) { dm = d; mejor = j; }
        }
        return mejor || yo;
    }
    function distJugadores(x, z) {
        let dm = Infinity;
        for (const j of jugadores()) dm = Math.min(dm, Math.hypot(j.pos.x - x, j.pos.z - z));
        return dm;
    }
    // Daño a un jugador: el local recibe el golpe; a uno remoto se le avisa por la red
    function danarA(obj, dano, causa, op = {}, aturde = 0) {
        if (!obj.id) {
            const hizo = vida.danar(dano, causa, op);
            if (hizo && aturde) ctx.aturdir && ctx.aturdir(aturde);
            return hizo;
        }
        api.red.danar(obj.id, dano, causa, op, aturde);
        return true;
    }

    function modelo(tipo) {
        const tinte = crearTinte();
        const m = tipo === 'creeper' ? modeloCreeper(tinte, semilla) : tipo === 'arana' ? modeloArana(tinte, semilla) : tipo === 'lepisma' ? modeloLepisma(tinte, semilla) : modeloPersona(tinte, tipo, semilla);
        semilla += 17;
        if (tipo === 'trauco') m.g.scale.setScalar(0.7);
        scene.add(m.g);
        return { m, tinte };
    }

    function crear(tipo, x, y, z) {
        const { m, tinte } = modelo(tipo);
        const d = DEF[tipo];
        const e = {
            uid: api.prefijo + (contador++).toString(36), hist: [],
            tipo, d, m, tinte, pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), ancho: d.ancho, alto: d.alto,
            enSuelo: false, vida: d.vida, invul: 0, yaw: Math.random() * Math.PI * 2, fase: 0, reloj: 0, ataque: 0,
            mecha: 0, fuego: 0, edad: 0, rojo: 0, sonido: 2 + Math.random() * 8, persigue: false, destino: null, lejos: 0
        };
        lista.push(e);
        return e;
    }

    function quitar(e) {
        const i = lista.indexOf(e);
        if (i >= 0) lista.splice(i, 1);
        scene.remove(e.m.g);
        if (api.red) api.red.mobFin(e.uid);
    }

    function enZonaSegura(x, z, margen = 0) {
        for (const s of zonasSeguras()) if (Math.hypot(s.x - x, s.z - z) < s.radio + margen) return true;
        return false;
    }

    // ---------- Aparición ----------
    function luzEfectiva(x, y, z) {
        const l = mundo.nivelLuz(x, y, z);
        if (l < 0) return 15;
        const cielo = l >> 4, bloque = l & 15;
        const brilloCielo = dia.esNoche ? Math.round(cielo * 4 / 15) : cielo;
        return Math.max(bloque, brilloCielo);
    }
    function esBosque(x, z) {
        const { W, H, T } = datos;
        const cx = Math.floor(x / 4), cz = Math.floor(z / 4);
        let n = 0;
        for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
            const xx = cx + dx, zz = cz + dz;
            if (xx >= 0 && zz >= 0 && xx < W && zz < H && T[zz * W + xx] === 'hojas') n++;
        }
        return n >= 6;
    }
    function intentarAparecer() {
        const dif = dificultad();
        if (!dif) return;
        let cercanos = lista.filter(e => e.pos.distanceTo(jugador.pos) < 72).length;
        for (const g of fantasmas.values()) if (g.pos.distanceTo(jugador.pos) < 72) cercanos++;
        if (cercanos >= MAX[dif]) return;
        const ang = Math.random() * Math.PI * 2, dist = 22 + Math.random() * 34;
        const x = Math.floor(jugador.pos.x + Math.cos(ang) * dist) + 0.5, z = Math.floor(jugador.pos.z + Math.sin(ang) * dist) + 0.5;
        if (enZonaSegura(x, z, 6)) return;
        // Busca un piso con dos bloques de aire encima, cerca de la altura del jugador
        const y0 = Math.floor(jugador.pos.y);
        for (let k = 0; k < 40; k++) {
            const y = y0 + 16 - k;
            if (y < 2) break;
            const piso = mundo.bloque(x, y - 1, z), a = mundo.bloque(x, y, z), b = mundo.bloque(x, y + 1, z);
            if (piso === -1) return;
            if (TIPO[piso] !== 1 || a !== 0 || b !== 0 || piso === B.TIERRA_LABRADA || piso === B.TIERRA_LABRADA_HUMEDA) continue;
            if (luzEfectiva(x, y, z) > 7) return;
            const superficie = (mundo.nivelLuz(x, y, z) >> 4) >= 10;
            let tipo;
            if (superficie && dia.esNoche && esBosque(x, z) && Math.random() < 0.45) tipo = 'trauco';
            else {
                const r = Math.random();
                tipo = r < 0.35 ? 'zombi' : r < 0.6 ? 'esqueleto' : r < 0.8 ? 'arana' : 'creeper';
            }
            if (tipo === 'arana' && (solidoEn(mundo, x + 1, y, z) || solidoEn(mundo, x - 1, y, z))) tipo = 'zombi';
            crear(tipo, x, y, z);
            return;
        }
    }

    // ---------- Daño ----------
    function golpear(e, dano, origen = null) {
        if (e.invul > 0) return false;
        e.invul = 0.5;
        e.vida -= dano;
        e.rojo = 0.3;
        e.persigue = true;
        if (origen) e.porJugador = true; // para las misiones (el sol no cuenta)
        if (origen) e.por = origen.por || null; // online: quién pegó (null = el jugador local)
        const fuerza = origen && origen.fuerza != null ? origen.fuerza : 0.45;
        if (origen) {
            empujar(e, e.pos.x - origen.x, e.pos.z - origen.z, fuerza);
        }
        if (origen && origen.fuego) e.fuego = Math.max(e.fuego, 5);
        sonidos.golpe();
        if (e.vida <= 0) morir(e);
        return true;
    }

    function morir(e) {
        for (const [id, n] of soltarDe(e.tipo)) if (n > 0) entidades.soltar(id, n, 0, e.pos.x, e.pos.y + 0.5, e.pos.z);
        quitar(e);
        sonidos.caida();
        // Lo mató otro jugador: la misión de matar cuenta para él, no para el local
        if (e.por && api.red) api.red.creditoMuerte(e.por, e.tipo);
        else ctx.alMorirMob && ctx.alMorirMob(e.tipo, e);
    }

    // Objetivos para el combate y los proyectiles
    function objetivos(cx, cz, radio) {
        const l = [];
        for (const e of lista) {
            if (Math.abs(e.pos.x - cx) > radio || Math.abs(e.pos.z - cz) > radio) continue;
            l.push({ tipo: e.tipo, mob: e, x: e.pos.x, y: e.pos.y, z: e.pos.z, ancho: e.ancho, alto: e.alto, golpear: (dano, origen) => golpear(e, dano, origen) });
        }
        // Fantasmas: el golpe se le avisa a su dueño (que lo valida); aquí solo el destello
        for (const g of fantasmas.values()) {
            if (Math.abs(g.pos.x - cx) > radio || Math.abs(g.pos.z - cz) > radio) continue;
            l.push({
                tipo: g.tipo, fantasma: g, x: g.pos.x, y: g.pos.y, z: g.pos.z, ancho: g.ancho, alto: g.alto,
                golpear: (dano, origen) => {
                    if (g.invul > 0 || !api.red) return false;
                    g.invul = 0.5; g.rojoLocal = 0.3;
                    sonidos.golpe();
                    api.red.golpearMob(g.uid, dano, origen);
                    return true;
                }
            });
        }
        return l;
    }

    // ---------- Explosión (creeper y jefes) ----------
    // remoto: la explosión es de otro jugador; aquí solo el daño al jugador local y las partículas
    // (los bloques rotos llegan como ediciones)
    function explotar(x, y, z, potencia = 3, origenTipo = 'explosion', remoto = false) {
        sonidos.explosion();
        if (!remoto && api.red) api.red.explosion(x, y, z, potencia, origenTipo);
        const lote = [];
        if (!remoto) {
        const r = potencia;
        for (let dz = -r; dz <= r; dz++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const d = Math.hypot(dx, dy, dz);
            if (d > r * (0.7 + Math.random() * 0.5)) continue;
            const bx = Math.floor(x + dx), by = Math.floor(y + dy), bz = Math.floor(z + dz);
            if (by < 1) continue;
            const id = mundo.bloque(bx, by, bz);
            if (id <= 0 || id === B.AGUA || id === B.LAVA) continue;
            const info = infoBloque(id);
            if (!info || info.dureza < 0 || info.dureza >= 25) continue; // roca madre, obsidiana, altares
            lote.push([bx, by, bz, 0]);
            if (Math.random() < 0.3) for (const [s, n] of dropsDe(id, O.PICO_DIAMANTE)) entidades.soltar(s, n, 0, bx + 0.5, by + 0.5, bz + 0.5);
            if (info.contenedor && ctx.contenedores) for (const p of ctx.contenedores.quitar(bx, by, bz)) entidades.soltar(p.id, p.n, p.d, bx + 0.5, by + 0.5, bz + 0.5);
        }
        if (lote.length) { mundo.editarLote(lote); mundo.procesarRemallado(12); }
        }
        // Daño al jugador y a lo que esté cerca (fórmula de Minecraft, con tope)
        const alcance = potencia * 2;
        const dj = Math.hypot(jugador.pos.x - x, jugador.pos.y + 0.9 - y, jugador.pos.z - z);
        if (dj < alcance) {
            const k = 1 - dj / alcance;
            // Fórmula de Minecraft × 0,75 (más amable para partidas cortas)
            vida.danar(Math.min(24, Math.round((((k * k + k) / 2) * 7 * alcance + 1) * 0.75)), origenTipo, { origen: { x, z }, fuerza: 0.9 * k + 0.2 });
        }
        for (const o of remoto ? [] : ctx.objetivosTodos(x, z, alcance)) {
            if (o.mob && o.mob.vida <= 0) continue;
            if (o.fantasma) continue; // su dueño recibe la explosión por la red
            const d = Math.hypot(o.x - x, o.y + o.alto / 2 - y, o.z - z);
            if (d >= alcance) continue;
            const k = 1 - d / alcance;
            o.golpear(Math.round(((k * k + k) / 2) * 7 * alcance + 1), { x, z, fuerza: k });
        }
        ctx.particulas && ctx.particulas.explosion(x, y, z);
    }

    // ---------- IA ----------
    const tinte = new THREE.Color();
    function actualizarMob(e, dt) {
        const d = e.d;
        e.edad += dt;
        e.invul = Math.max(0, e.invul - dt);
        e.rojo = Math.max(0, e.rojo - dt);
        e.ataque = Math.max(0, e.ataque - dt);
        const obj = masCercano(e.pos.x, e.pos.y, e.pos.z);
        const dx = obj.pos.x - e.pos.x, dz = obj.pos.z - e.pos.z, dy = obj.pos.y - e.pos.y;
        const dist = Math.hypot(dx, dz);
        const vivo = obj.vivo;

        // Luz y sol
        const l = mundo.nivelLuz(e.pos.x, e.pos.y + e.alto * 0.8, e.pos.z);
        const cielo = l >= 0 ? l >> 4 : 15;
        const deDia = !dia.esNoche;
        if (d.sol && deDia && cielo >= 13 && !e.enAgua) e.fuego = Math.max(e.fuego, 2);
        if (e.tipo === 'trauco' && deDia && cielo >= 12) { ctx.particulas && ctx.particulas.humo(e.pos.x, e.pos.y + 0.7, e.pos.z); quitar(e); return; }
        if (e.fuego > 0) {
            e.fuego -= dt;
            if (e.enAgua) e.fuego = 0;
            e.relojFuego = (e.relojFuego || 0) + dt;
            if (e.relojFuego >= 1) { e.relojFuego = 0; e.invul = 0; golpear(e, 1); if (!lista.includes(e)) return; }
        }
        if (e.enLava) { e.fuego = 6; if (e.invul <= 0) { golpear(e, 4); if (!lista.includes(e)) return; } }

        // ¿Persigue? La araña de día es neutral (salvo que le hayan pegado)
        const neutral = e.tipo === 'arana' && deDia && cielo >= 12 && !e.provocada;
        if (e.persigue && e.invul > 0) e.provocada = true;
        const ve = vivo && dist < 18 && Math.abs(dy) < 10 && !neutral;
        e.persigue = ve || (e.persigue && dist < 28 && vivo && !neutral);
        // En una zona segura no entra: si el jugador está dentro, se queda en el borde
        let ix = 0, iz = 0, v = d.vel;
        if (e.persigue) {
            if (d.arquero) {
                // Mantiene distancia: se acerca si está lejos, se aleja si está muy cerca
                const ideal = 9;
                const s = dist > ideal + 2 ? 1 : dist < ideal - 3 ? -1 : 0;
                ix = dx / (dist || 1) * s; iz = dz / (dist || 1) * s;
                e.reloj -= dt;
                if (e.reloj <= 0 && dist < 18) {
                    e.reloj = 1.8 + Math.random() * 0.8;
                    disparar(e, obj);
                }
            } else { ix = dx / (dist || 1); iz = dz / (dist || 1); }
            e.yaw = Math.atan2(dx, dz);
        } else {
            // Deambula
            e.reloj -= dt;
            if (e.reloj <= 0) { e.reloj = 3 + Math.random() * 5; e.destino = Math.random() < 0.6 ? Math.random() * Math.PI * 2 : null; }
            if (e.destino !== null) { ix = Math.sin(e.destino) * 0.5; iz = Math.cos(e.destino) * 0.5; e.yaw += angulo(e.destino - e.yaw) * Math.min(1, dt * 4); }
        }
        const nx = e.pos.x + ix * 0.8, nz = e.pos.z + iz * 0.8;
        if (enZonaSegura(nx, nz)) { ix = 0; iz = 0; }
        // No se tira por precipicios (más de 4 bloques) al deambular
        if (!e.persigue && (ix || iz)) {
            let hondo = 0;
            while (hondo < 5 && !solidoEn(mundo, nx, e.pos.y - 1 - hondo, nz)) hondo++;
            if (hondo >= 5) { ix = 0; iz = 0; e.destino = null; }
        }

        // Creeper: mecha
        if (e.tipo === 'creeper') {
            if (e.persigue && dist < 3 && Math.abs(dy) < 3) { if (e.mecha === 0) sonidos.mecha(); e.mecha += dt; }
            else if (e.mecha > 0) { e.mecha = Math.max(0, e.mecha - dt * 1.5); if (dist > 7) e.mecha = 0; }
            if (e.mecha > 0) { ix *= 0.2; iz *= 0.2; }
            if (e.mecha >= 1.5) { quitar(e); explotar(e.pos.x, e.pos.y + 0.8, e.pos.z, 3); return; }
        }
        // Ataque cuerpo a cuerpo
        if (d.dano && !d.arquero && e.persigue && dist < d.alcance && Math.abs(dy + 0.5) < 1.6 && e.ataque <= 0) {
            e.ataque = 1;
            e.golpeAnim = 0.35;
            const hizo = danarA(obj, d.dano, 'golpe', { origen: e.pos }, d.aturde ? 2.5 : 0);
            if (hizo && d.aturde) sonidos.risaTrauco();
            if (hizo && e.tipo === 'arana' && e.enSuelo) e.vel.y = 6;
        }
        // Araña: salta hacia el jugador
        if (e.tipo === 'arana' && e.persigue && dist < 4 && dist > 2 && e.enSuelo && Math.random() < dt * 1.2) { e.vel.y = 6.5; e.vel.x += ix * 3; e.vel.z += iz * 3; }

        // Movimiento
        suavizarVelocidad(e, ix, iz, v, dt);
        moverCuerpo(mundo, e, dt);
        if (e.chocoLado && (ix || iz)) {
            if (d.trepa) e.vel.y = 3; // la araña trepa por las paredes
            else if (e.enSuelo) e.vel.y = 8.4; // salta un escalón
        }
        if (e.pos.y < -5) { quitar(e); return; }
        // Historial corto de posiciones: el dueño valida con él los golpes que llegan por la red
        if (api.red) { const t = performance.now(), u = e.hist[e.hist.length - 1]; if (!u || t - u.t >= 50) { e.hist.push({ t, x: e.pos.x, y: e.pos.y, z: e.pos.z }); if (e.hist.length > 30) e.hist.shift(); } } // 1,5 s a 20 Hz

        // Sonidos ocasionales
        e.sonido -= dt;
        if (e.sonido <= 0) {
            e.sonido = 6 + Math.random() * 10;
            const k = Math.max(0, 1 - Math.hypot(dist, dy) / 16);
            if (k > 0) sonidos.mob(e.tipo, k);
        }

        dibujar(e, dt, Math.hypot(e.vel.x, e.vel.z), dy, dist, l);
    }

    // Dibujo (también de los fantasmas): pose según el movimiento, luz del lugar y destellos
    function dibujar(e, dt, mov, dy, dist, l) {
        e.fase += mov * dt * 3.2;
        const m = e.m;
        m.g.position.copy(e.pos);
        m.g.rotation.y = e.yaw;
        if (e.tipo === 'creeper') {
            const b = Math.sin(e.fase) * 0.5 * Math.min(1, mov);
            m.patas[0].rotation.x = b; m.patas[3].rotation.x = b; m.patas[1].rotation.x = -b; m.patas[2].rotation.x = -b;
            const s = 1 + (e.mecha > 0 ? Math.min(0.25, e.mecha * 0.15) : 0);
            m.cuerpo.scale.set(s, 1 + (s - 1) * 0.6, s);
        } else if (e.tipo === 'lepisma') {
            m.segmentos.forEach((c, i) => { c.position.x = Math.sin(e.fase * 2 + i) * 0.05; });
        } else if (e.tipo === 'arana') {
            m.patas.forEach((p, i) => { p.rotation.x = Math.sin(e.fase * 1.5 + i * 1.3) * 0.3 * Math.min(1, mov); });
        } else {
            caminar(m, e.fase, Math.min(0.7, mov * 0.3));
            if (e.tipo === 'zombi') { m.brazoD.rotation.x = -1.45; m.brazoI.rotation.x = -1.45; }
            if (e.tipo === 'esqueleto' && e.persigue) { m.brazoD.rotation.x = -1.5; m.brazoI.rotation.x = -1.3; m.brazoI.rotation.z = -0.3; }
            if (e.golpeAnim > 0) { e.golpeAnim -= dt; m.brazoD.rotation.x = -1.6 - Math.sin(e.golpeAnim * 9) * 0.8; }
            if (e.persigue) m.cuello.rotation.x = -Math.atan2(dy + 0.3, dist) * 0.6;
        }
        // Luz: la del lugar; rojo al recibir golpe; parpadeo blanco de la mecha
        const cieloL = l >= 0 ? (l >> 4) / 15 : 1, bloqueL = l >= 0 ? (l & 15) / 15 : 0;
        const c = Math.pow(cieloL, 1.6), b = Math.pow(bloqueL, 1.6);
        tinte.copy(ctx.tinteMundo).multiplyScalar(c);
        tinte.setRGB(Math.max(tinte.r, b, 0.06), Math.max(tinte.g, b * 0.85, 0.06), Math.max(tinte.b, b * 0.6, 0.06));
        if (e.rojo > 0 || e.rojoLocal > 0) tinte.setRGB(Math.min(1, tinte.r * 1.6 + 0.3), tinte.g * 0.4, tinte.b * 0.4);
        if (e.mecha > 0 && Math.floor(e.mecha * 8) % 2) tinte.setRGB(1, 1, 1);
        if (e.fuego > 0 && Math.random() < 0.5) tinte.setRGB(Math.min(1, tinte.r + 0.4), tinte.g * 0.8 + 0.1, tinte.b * 0.5);
        e.tinte.aplicar(tinte);
    }

    function disparar(e, obj = yo) {
        const origen = new THREE.Vector3(e.pos.x, e.pos.y + 1.5, e.pos.z);
        const objetivo = new THREE.Vector3(obj.pos.x, obj.pos.y + 1.2, obj.pos.z);
        const dir = objetivo.sub(origen);
        const d = dir.length();
        dir.y += 0.5 * 20 * (d / 22) * (d / 22); // compensa la caída de la flecha (gravedad 20, 22 m/s)
        dir.normalize();
        // Puntería imperfecta según la dificultad
        const err = [0, 0.14, 0.09, 0.05][dificultad()] || 0.1;
        dir.x += (Math.random() - 0.5) * err; dir.y += (Math.random() - 0.5) * err; dir.z += (Math.random() - 0.5) * err;
        proyectiles.disparar({ pos: origen.addScaledVector(dir, 0.6), vel: dir.multiplyScalar(22), dano: 2 + Math.floor(Math.random() * 3), deJugador: false });
        sonidos.arco();
    }

    // ---------- Fantasmas (online) ----------
    function fantasma(uid, tipo) {
        let g = fantasmas.get(uid);
        if (g) return g;
        if (!DEF[tipo]) return null;
        const { m, tinte } = modelo(tipo);
        const d = DEF[tipo];
        g = { uid, tipo, d, m, tinte, pos: new THREE.Vector3(), yaw: 0, ancho: d.ancho, alto: d.alto, fase: 0, rojo: 0, rojoLocal: 0, invul: 0, mecha: 0, fuego: 0, persigue: false, golpeAnim: 0, fantasma: true, previo: null };
        m.g.visible = false;
        fantasmas.set(uid, g);
        return g;
    }
    function quitarFantasma(uid) {
        const g = fantasmas.get(uid);
        if (!g) return;
        scene.remove(g.m.g);
        fantasmas.delete(uid);
    }
    // Pone el fantasma en el estado interpolado { x, y, z, yaw, f } (f: banderas, ver coop.js)
    function moverFantasma(g, s, dt) {
        const antes = g.previo || { x: s.x, z: s.z };
        g.pos.set(s.x, s.y, s.z);
        g.yaw = s.yaw;
        const f = s.f | 0;
        g.persigue = !!(f & 1); g.rojo = f & 2 ? 0.1 : 0; g.mecha = f & 4 ? g.mecha + dt : 0; g.fuego = f & 8 ? 1 : 0;
        if (f & 16) g.golpeAnim = Math.max(g.golpeAnim, 0.3);
        g.invul = Math.max(0, g.invul - dt);
        g.rojoLocal = Math.max(0, g.rojoLocal - dt);
        const mov = Math.hypot(s.x - antes.x, s.z - antes.z) / Math.max(dt, 1e-3);
        g.previo = { x: s.x, z: s.z };
        const m = g.m;
        m.g.visible = mundo.chunks.has(Math.floor(g.pos.x / 16) + ',' + Math.floor(g.pos.z / 16));
        if (!m.g.visible) return;
        m.g.position.copy(g.pos);
        m.g.rotation.y = g.yaw;
        const dx = jugador.pos.x - g.pos.x, dz = jugador.pos.z - g.pos.z;
        dibujar(g, dt, Math.min(6, mov), jugador.pos.y - g.pos.y, Math.hypot(dx, dz), mundo.nivelLuz(g.pos.x, g.pos.y + g.alto * 0.8, g.pos.z));
    }

    return {
        lista, fantasmas, crear, quitar, golpear, objetivos, explotar, fantasma, quitarFantasma, moverFantasma, api,
        masCercano, distJugadores, danarA,
        // ¿Hay monstruos cerca? (no se puede dormir)
        cerca(x, y, z, r = 8) {
            const cerca = e => Math.abs(e.pos.x - x) < r && Math.abs(e.pos.z - z) < r && Math.abs(e.pos.y - y) < 5;
            return lista.some(cerca) || [...fantasmas.values()].some(cerca);
        },
        actualizar(dt) {
            relojAparecer += dt;
            if (relojAparecer >= 1) { relojAparecer = 0; for (let k = 0; k < 3; k++) intentarAparecer(); }
            for (const e of lista.slice()) {
                const dist = api.red ? distJugadores(e.pos.x, e.pos.z) : e.pos.distanceTo(jugador.pos);
                // Lejos: desaparece (muy lejos al tiro; a media distancia de a poco)
                if (dist > 96 || (dist > 48 && Math.random() < dt / 30)) { quitar(e); continue; }
                if (!mundo.chunks.has(Math.floor(e.pos.x / 16) + ',' + Math.floor(e.pos.z / 16))) { e.m.g.visible = false; continue; }
                e.m.g.visible = true;
                actualizarMob(e, Math.min(dt, 0.05));
            }
        },
        limpiar() { for (const e of lista.slice()) quitar(e); for (const uid of [...fantasmas.keys()]) quitarFantasma(uid); }
    };
}
