// =========================================================
// VENJY · Supervivencia · Mano en primera persona
// Lo que tienes en la mano se ve abajo a la derecha, como en Minecraft:
//  · mano vacía: el brazo (piel y manga verde del polerón de Venjy)
//  · bloque: un cubo con sus texturas
//  · objeto o planta: el ícono «extruido» en 3D (cada píxel es un cubito de 1/16)
// Se mueve al caminar, golpea al romper o usar, baja y sube al cambiar de objeto y se acerca
// a la boca al comer. Va en una escena aparte dibujada encima (no atraviesa paredes).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { BLOQUES, TIPO, TAM, COLS } from '../texturas.js';
import { pixelesObjeto } from './iconos.js';
import { geometriaCubo } from './entidades.js';
import { info, O } from './objetos.js';
import { crearModelo } from './skin.js';
const O_ESCUDO = O.ESCUDO;

// Primera persona (7c-1): dónde va el brazo (en el marco del pivote) según lo que tengas en la mano
export const AGARRE_1P = {
    vacia: { pos: [0, 0, 0], rot: [0.42, 0.42, 0] },
    objeto: { pos: [0.06, -0.2, 0.14], rot: [0.42, 0.42, 0] },
    bloque: { pos: [0.22, -0.34, -0.02], rot: [0.7, 0.3, 0] }
};

// Geometría de un dibujo de 16×16 extruido (caras de frente, atrás y cantos donde no hay vecino)
function extruir(px) {
    const pos = [], col = [], idx = [];
    const S = 1 / 16, G = S; // grosor de un píxel
    const quad = (v, c, sombra) => {
        const b = pos.length / 3;
        for (const p of v) pos.push(...p);
        for (let k = 0; k < 4; k++) col.push(c[0] / 255 * sombra, c[1] / 255 * sombra, c[2] / 255 * sombra);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    const hay = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && px[y * 16 + x];
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const c = px[y * 16 + x];
            if (!c) continue;
            const x0 = x * S - 0.5, x1 = x0 + S, y1 = 0.5 - y * S, y0 = y1 - S, z0 = -G / 2, z1 = G / 2;
            quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c, 1);
            quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], c, 0.8);
            if (!hay(x, y - 1)) quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], c, 0.95);
            if (!hay(x, y + 1)) quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], c, 0.55);
            if (!hay(x - 1, y)) quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], c, 0.7);
            if (!hay(x + 1, y)) quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], c, 0.7);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col.map(v => Math.pow(v, 2.2)), 3));
    g.setIndex(idx);
    return g;
}

// Píxeles de un tile del atlas de bloques (para plantas, antorchas, puertas y escaleras en la mano)
function pixelesTile(atlasLienzo, tile) {
    const ctx = atlasLienzo.getContext('2d', { willReadFrequently: true });
    const d = ctx.getImageData((tile % COLS) * TAM, Math.floor(tile / COLS) * TAM, TAM, TAM).data;
    const px = new Array(256).fill(null);
    for (let i = 0; i < 256; i++) if (d[i * 4 + 3] > 128) px[i] = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
    return px;
}

// Fábrica de mallas de lo que va en la mano (una geometría por id, compartida): la usan la mano en
// primera persona y el cuerpo (pose-jugador.js) propio y de los demás jugadores. Cada dueño pone sus
// materiales (`materiales()`), para teñirlos con la luz de donde está.
export function crearFabrica({ atlas, atlasLienzo }) {
    const geos = new Map();
    function datos(id) {
        if (geos.has(id)) return geos.get(id);
        let d;
        const t = id < 256 ? TIPO[id] : 0;
        if (id < 256 && BLOQUES[id] && (t === 1 || t === 2 || t === 5)) d = { geo: geometriaCubo(id), tipo: 'bloque' };
        else {
            const px = id >= 256 ? pixelesObjeto(id) : pixelesTile(atlasLienzo, t === 4 ? BLOQUES[id].top : BLOQUES[id].lado);
            const herramienta = id >= 256 && info(id) && (info(id).herramienta || info(id).icono === 'palo' || info(id).icono === 'cana');
            d = { geo: extruir(px), tipo: herramienta ? 'herramienta' : 'objeto' };
        }
        geos.set(id, d);
        return d;
    }
    return {
        THREE,
        materiales: () => [new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5 }), new THREE.MeshBasicMaterial({ vertexColors: true })],
        // { malla, tipo }: tipo 'bloque' | 'herramienta' | 'objeto'
        malla(id, mats) {
            const d = datos(id);
            return { malla: new THREE.Mesh(d.geo, d.tipo === 'bloque' ? mats[0] : mats[1]), tipo: d.tipo };
        }
    };
}

export function crearMano({ renderer, atlas, atlasLienzo, mundo, jugador, inventario, minado, combate, tinteMundo }) {
    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10);
    window.addEventListener('resize', () => { camara.aspect = window.innerWidth / window.innerHeight; camara.updateProjectionMatrix(); });

    const pivote = new THREE.Group(); // se mueve con el balanceo y el golpe
    escena.add(pivote);
    const pivote2 = new THREE.Group(); // la otra mano (escudo, antorcha…), a la izquierda
    escena.add(pivote2);
    const fabrica = crearFabrica({ atlas, atlasLienzo });
    const materiales = fabrica.materiales();
    const matBrazo = [new THREE.MeshBasicMaterial({ color: 0xe8c4a8 }), new THREE.MeshBasicMaterial({ color: 0x3f8a3a })];

    // Brazo (7c-1): el brazo derecho del modelo con tu skin, siempre visible; lo que tienes va en la mano.
    // `brazo` tiene la mano en z = −0,3 y el hombro hacia +z. Hasta que llega la skin, piel y manga lisas.
    const brazo = new THREE.Group();
    pivote.add(brazo);
    let brazoSkin = new THREE.Group(), tinteBrazo = null;
    {
        const mano = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.3), matBrazo[0]);
        mano.position.z = -0.15;
        const manga = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.55), matBrazo[1]);
        manga.position.z = 0.27;
        brazoSkin.add(mano, manga);
        brazo.add(brazoSkin);
    }
    function ponerSkin(d) {
        const modelo = crearModelo(d);
        const b = modelo.brazoD;
        b.parent.remove(b);
        b.position.set(0, 0, 0);
        b.rotation.set(0, 0, 0);
        const g = new THREE.Group();
        g.position.z = 0.45;        // la punta (0,75 desde el hombro) queda en z = −0,3
        g.rotation.x = Math.PI / 2; // el brazo cuelga hacia −y: girado, apunta hacia −z
        g.add(b);
        brazo.remove(brazoSkin);
        brazoSkin = g;
        brazo.add(brazoSkin);
        tinteBrazo = modelo.tinte;
    }

    const cache = new Map();
    const cache2 = new Map(); // la otra mano necesita sus propias mallas (una malla vive en un solo padre)
    function mallaDe(id, otra = false) {
        const c = otra ? cache2 : cache;
        if (c.has(id)) return c.get(id);
        const m = crearMalla(id);
        c.set(id, m);
        return m;
    }
    function crearMalla(id) {
        const { malla: m, tipo } = fabrica.malla(id, materiales);
        if (tipo === 'bloque') {
            m.scale.setScalar(1.1); // el cubito de 0,25 queda en ~0,28
            m.rotation.set(0, Math.PI / 4, 0);
        } else {
            m.scale.setScalar(0.5);
            // Herramientas inclinadas como en Minecraft; el resto de frente y algo girado
            if (tipo === 'herramienta') m.rotation.set(0, -Math.PI / 2 + 0.35, 0.65);
            else m.rotation.set(0, -0.55, 0);
        }
        m.userData.tipo = tipo === 'bloque' ? 'bloque' : 'objeto';
        return m;
    }
    let actual2 = -1, visible2 = null;
    function mostrar2(id) {
        if (visible2) pivote2.remove(visible2);
        visible2 = id ? mallaDe(id, true) : null;
        if (visible2) pivote2.add(visible2);
        actual2 = id;
    }

    let actual = -1, visible = null;
    let cambio = 1;           // 0..1: animación de bajar y subir al cambiar de objeto
    let golpe = 0;            // 0..1 del golpe en curso
    let fase = 0, ultimaPos = null, balanceo = 0, correr = 0;

    function mostrar(id) {
        if (visible) pivote.remove(visible);
        visible = id ? mallaDe(id) : null;
        if (visible) pivote.add(visible);
        actual = id;
    }
    mostrar(0);

    const tinte = new THREE.Color();
    return {
        fabrica,
        ponerSkin,
        // Golpe (romper, atacar, poner, usar)
        golpear() { if (golpe <= 0 || golpe > 0.5) golpe = 0.001; },
        actualizar(dt) {
            const id = inventario.idEnMano();
            if (id !== actual) { if (cambio >= 1) cambio = 0; if (cambio > 0.5 || actual === -1) mostrar(id); }
            if (cambio < 1) { cambio = Math.min(1, cambio + dt * 5); if (cambio >= 0.5 && actual !== id) mostrar(id); }
            // Golpe continuo mientras se rompe
            if (minado.izquierdo && golpe <= 0) golpe = 0.001;
            if (golpe > 0) { golpe += dt * 3.6; if (golpe >= 1) golpe = minado.izquierdo ? 0.001 : 0; }
            // Balanceo al caminar (corriendo, más amplio)
            const p = jugador.pos;
            correr += ((jugador.corre ? 1 : 0) - correr) * Math.min(1, dt * 6);
            if (ultimaPos && jugador.enSuelo) {
                const d = Math.hypot(p.x - ultimaPos.x, p.z - ultimaPos.z);
                fase += d * 2.2;
                balanceo += (Math.min(1, d / (dt * 4.3 || 1)) * (1 + 0.8 * correr) - balanceo) * Math.min(1, dt * 8);
            } else balanceo *= Math.exp(-dt * 6);
            ultimaPos = { x: p.x, z: p.z };

            const comiendo = minado.comiendo > 0;
            const g = Math.sin(golpe * Math.PI);
            const bajar = cambio < 0.5 ? cambio * 2 : (1 - cambio) * 2; // 0 → 1 → 0
            const esBloque = visible && visible.userData.tipo === 'bloque';
            let x = esBloque ? 0.5 : 0.52, y = esBloque ? -0.4 : -0.36, z = -0.82;
            if (!visible) { x = 0.5; y = -0.52; z = -0.7; }
            x += Math.sin(fase) * 0.025 * balanceo - g * 0.22;
            y += -Math.abs(Math.cos(fase)) * 0.03 * balanceo + g * 0.12 - bajar * 0.6;
            z += -g * 0.22;
            if (comiendo) { x -= 0.32; y += 0.12 + Math.abs(Math.sin(minado.comiendo * 16)) * 0.05; z += 0.1; }
            // Arco tensado: se acerca al centro y tiembla al máximo
            const tension = combate ? Math.min(1, combate.tensando) : 0;
            if (tension > 0) { x -= 0.25 * tension; y += 0.12 * tension; z += 0.15 * tension; if (tension >= 1) { x += (Math.random() - 0.5) * 0.008; y += (Math.random() - 0.5) * 0.008; } }
            pivote.position.set(x, y, z);
            pivote.rotation.set(-g * 0.9, (!visible ? -0.15 : esBloque ? 0 : -0.25) + g * 0.4, !visible ? 0.15 + g * 0.2 : g * 0.25);
            // La mano (−z) sube y apunta al centro; con algo en la mano, el brazo lo agarra desde abajo a la derecha
            const ag = !visible ? AGARRE_1P.vacia : esBloque ? AGARRE_1P.bloque : AGARRE_1P.objeto;
            brazo.position.set(...ag.pos);
            brazo.rotation.set(...ag.rot);

            // Otra mano: a la izquierda; el escudo sube al centro al bloquear
            const id2 = inventario.mano2 ? inventario.mano2.id : 0;
            if (id2 !== actual2) mostrar2(id2);
            if (visible2) {
                const bloquea = combate && combate.bloqueando && id2 === O_ESCUDO;
                pivote2.position.set(bloquea ? -0.28 : -0.55, (bloquea ? -0.28 : -0.42) - bajar * 0.6 - Math.abs(Math.cos(fase)) * 0.03 * balanceo, bloquea ? -0.62 : -0.85);
                pivote2.rotation.set(0, bloquea ? 0.25 : 0.5, 0);
                visible2.rotation.set(0, bloquea ? 0 : 0.55, 0);
            }

            // Luz del lugar: la misma del mundo (cielo según la hora y antorchas)
            const l = mundo.nivelLuz(p.x, p.y + jugador.ojos, p.z);
            const cielo = l >= 0 ? (l >> 4) / 15 : 1, bloque = l >= 0 ? (l & 15) / 15 : 0;
            const c = Math.pow(cielo, 1.6), b = Math.pow(bloque, 1.6);
            tinte.copy(tinteMundo).multiplyScalar(c);
            tinte.setRGB(Math.max(tinte.r, b, 0.08), Math.max(tinte.g, b * 0.85, 0.08), Math.max(tinte.b, b * 0.6, 0.08));
            for (const m of materiales) m.color.copy(tinte);
            for (const m of matBrazo) m.color.copy(tinte);
            if (tinteBrazo) tinteBrazo.aplicar(tinte);
        },
        // 0..1 suavizado de correr (main.js lo usa para el campo de visión)
        get correr() { return correr; },
        dibujar() {
            renderer.autoClear = false;
            renderer.clearDepth();
            renderer.render(escena, camara);
            renderer.autoClear = true;
        }
    };
}
