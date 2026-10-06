// =========================================================
// VENJY · Las gatas (Mila y Gala) hechas con código
// Mila: carey gordita, casi toda negra con poquito amarillo y naranjo (sin blanco).
// Gala: toda gris, guantes blancos adelante, botas blancas atrás, pecho blanco y panza gris.
// Caminan por la zona de la Gatera y entran y salen de su casa por la puerta.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { azar } from './mundo-datos.js';
import { ESCALA, BASE_ESTRUCTURA } from './voxeles.js';
import { TIPO } from './texturas.js';

const aSRGB = s => Math.pow(s, 2.2);
const SOMBRA_CARA = [0.6, 0.6, 1, 0.5, 0.8, 0.8]; // +x -x +y -y +z -z
const RADIO_VISIBLE = 160;

const ajustar = ([r, g, b], f) => [r * f, g * f, b * f];
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function textura(semilla, pintor) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(16, 16);
    const r = azar(semilla);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const [cr, cg, cb] = pintor(x, y, r);
            const i = (y * 16 + x) * 4;
            img.data[i] = Math.max(0, Math.min(255, cr));
            img.data[i + 1] = Math.max(0, Math.min(255, cg));
            img.data[i + 2] = Math.max(0, Math.min(255, cb));
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// ---------------------------------------------------------
// Pelajes
// ---------------------------------------------------------
const NEGRO = [30, 27, 30], NARANJO = [186, 98, 38], AMARILLO = [196, 148, 52];
const GRIS = [124, 128, 134], BLANCO = [238, 238, 234];
const ROSA = [212, 140, 150], OJO = [186, 200, 70], PUPILA = [14, 14, 14];

function cara(pelo, semilla) {
    // Cara con ojos verde-amarillos y nariz rosada
    return textura(semilla, (x, y, r) => {
        const ojo = (ox) => (y >= 6 && y <= 8 && x >= ox && x <= ox + 2);
        if (ojo(3) || ojo(10)) return (y === 7 && (x === 4 || x === 11)) ? PUPILA : OJO;
        if (x >= 7 && x <= 8 && y >= 9 && y <= 10) return ROSA;
        if (y === 11 && (x === 7 || x === 8)) return ajustar(ROSA, 0.7);
        return pelo(x, y, r);
    });
}

const PELAJES = {
    mila: {
        nombre: 'Mila',
        escala: { largo: 1.15, ancho: 0.8, alto: 0.7, patas: 0.46, cabeza: 0.62 }, // gordita
        // Manchas pequeñas de 2×2 píxeles: casi todo negro, poquito naranjo y menos amarillo
        pelo: (naranja, sem = 0) => (x, y, r) => {
            const f = Math.sin((x >> 1) * 12.9898 + (y >> 1) * 78.233 + sem * 3.17) * 43758.5453;
            const bloque = f - Math.floor(f);
            if (bloque < naranja && r() < 0.8) return ajustar(NARANJO, 0.85 + r() * 0.25);
            if (bloque > 1 - naranja * 0.3 && r() < 0.7) return ajustar(AMARILLO, 0.85 + r() * 0.2);
            return ajustar(NEGRO, 0.8 + r() * 0.5);
        }
    },
    gala: {
        nombre: 'Gala',
        escala: { largo: 1.0, ancho: 0.6, alto: 0.56, patas: 0.5, cabeza: 0.52 },
        pelo: () => (x, y, r) => ajustar(GRIS, 0.9 + r() * 0.2)
    }
};

function materialesDe(clave) {
    const p = PELAJES[clave];
    const s = clave === 'mila' ? 100 : 200;
    const base = p.pelo(clave === 'mila' ? 0.05 : 0, 1);
    const T = {};
    if (clave === 'mila') {
        T.cabeza = cara((x, y, r) => (x < 5 && y > 9 && r() < 0.3) ? ajustar(NARANJO, 0.9 + r() * 0.2) : base(x, y, r), s + 1);
        T.cabezaLado = textura(s + 2, (x, y, r) => (y > 9 && x < 5 && r() < 0.25) ? ajustar(NARANJO, 0.9 + r() * 0.2) : base(x, y, r));
        T.cuerpoLado = textura(s + 3, p.pelo(0.09, 2));
        T.cuerpoTapa = textura(s + 4, p.pelo(0.03, 3));
        T.pecho = textura(s + 5, p.pelo(0.2, 4));
        T.pata = textura(s + 6, p.pelo(0.05, 5));
        T.cola = textura(s + 7, p.pelo(0.03, 6));
        T.oreja = textura(s + 8, p.pelo(0.0, 7));
    } else {
        T.cabeza = cara(base, s + 1);
        T.cabezaLado = textura(s + 2, base);
        T.cuerpoLado = textura(s + 3, base);
        T.cuerpoTapa = textura(s + 4, base);
        // pecho blanco, panza gris: la cara frontal es blanca
        T.pecho = textura(s + 5, (x, y, r) => ajustar(BLANCO, 0.96 + r() * 0.06));
        // guantes blancos (pies delanteros) y botas blancas (traseros)
        T.pataD = textura(s + 6, (x, y, r) => y >= 10 ? ajustar(BLANCO, 0.96 + r() * 0.06) : base(x, y, r));
        T.pataT = textura(s + 9, (x, y, r) => y >= 7 ? ajustar(BLANCO, 0.96 + r() * 0.06) : base(x, y, r));
        T.cola = textura(s + 7, base);
        T.oreja = textura(s + 8, base);
    }
    return T;
}

// ---------------------------------------------------------
// Construcción del modelo (mira hacia +Z, origen en los pies)
// ---------------------------------------------------------
export function crearGatas(scene, { datos, terreno, mundo, jugador, materiales }) {
    const todos = []; // materiales de las gatas, para teñirlos con la hora del día
    const cache = new Map();
    const mat = (mapa, sombra) => {
        const k = mapa.uuid + sombra;
        if (!cache.has(k)) {
            const m = new THREE.MeshBasicMaterial({ map: mapa });
            m.userData.sombra = aSRGB(sombra);
            cache.set(k, m);
            todos.push(m);
        }
        return cache.get(k);
    };
    // 6 caras (+x -x +y -y +z -z), con un mapa por cara opcional
    const caras = (porDefecto, especial = {}) =>
        SOMBRA_CARA.map((s, i) => mat(especial[i] || porDefecto, s));
    const caja = (w, h, d, mats) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);

    function construirGata(clave) {
        const e = PELAJES[clave].escala;
        const T = materialesDe(clave);
        const g = new THREE.Group();
        const piso = e.patas;
        const cuerpo = caja(e.ancho, e.alto, e.largo, caras(T.cuerpoLado, { 2: T.cuerpoTapa, 3: T.cuerpoTapa, 4: T.pecho }));
        cuerpo.position.y = piso + e.alto / 2;
        g.add(cuerpo);

        const cabeza = new THREE.Group();
        cabeza.position.set(0, piso + e.alto * 0.95, e.largo / 2 + 0.05);
        const c = caja(e.cabeza, e.cabeza * 0.85, e.cabeza * 0.85, caras(T.cabezaLado, { 4: T.cabeza, 2: T.cuerpoTapa }));
        c.position.set(0, 0.05, e.cabeza * 0.28);
        cabeza.add(c);
        for (const lado of [-1, 1]) {
            const o = caja(e.cabeza * 0.24, e.cabeza * 0.3, e.cabeza * 0.1, caras(T.oreja));
            o.position.set(lado * e.cabeza * 0.28, e.cabeza * 0.55, e.cabeza * 0.12);
            cabeza.add(o);
        }
        g.add(cabeza);

        const ancho = e.clave || 0;
        void ancho;
        const patas = [];
        const lw = e.ancho * 0.3;
        [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => {
            const delantera = sz > 0;
            const mapa = clave === 'gala' ? (delantera ? T.pataD : T.pataT) : T.pata;
            const pivote = new THREE.Group();
            pivote.position.set(sx * (e.ancho / 2 - lw / 2), piso, sz * (e.largo / 2 - lw / 2 - 0.02));
            const p = caja(lw, piso, lw, caras(mapa));
            p.position.y = -piso / 2;
            pivote.add(p);
            g.add(pivote);
            patas.push(pivote);
        });

        const cola = new THREE.Group();
        cola.position.set(0, piso + e.alto * 0.8, -e.largo / 2);
        const cm = caja(0.11, 0.11, 0.75, caras(T.cola));
        cm.position.set(0, 0, -0.34);
        cola.add(cm);
        cola.rotation.x = -0.9;
        g.add(cola);
        return { g, cabeza, patas, cola };
    }

    // ---------------------------------------------------------
    // Comportamiento
    // ---------------------------------------------------------
    const [gx, gz] = datos.P.gatera;
    const casa = { // la casa naranja: casa(gx - 4, gz - 10, 7, 5)
        x0: (gx - 4) * ESCALA + 2, x1: (gx + 3) * ESCALA - 3,
        z0: (gz - 10) * ESCALA + 2, z1: (gz - 5) * ESCALA - 3
    };
    const puertaX = (gx - 1) * ESCALA + 2;
    const puertaMuro = (gz - 5) * ESCALA - 1;
    const fuera = { x: puertaX, z: (gz - 5) * ESCALA + 3 };
    const dentro = { x: puertaX, z: puertaMuro - 3 };
    const pisoDentro = BASE_ESTRUCTURA + 1;
    const BW = terreno.BW;

    const estaDentro = (x, z) => x > casa.x0 - 1 && x < casa.x1 + 1 && z > casa.z0 - 1 && z < casa.z1 + 1;
    const rnd = (a, b) => a + Math.random() * (b - a);

    function sueloFuera(x, z) {
        const bx = Math.floor(x), bz = Math.floor(z);
        if (bx < 1 || bz < 1 || bx >= BW - 1 || bz >= terreno.BD - 1) return null;
        const o = bz * BW + bx;
        const porche = terreno.ES[o] === 1 && terreno.HT[o] === BASE_ESTRUCTURA;
        if (terreno.ES[o] && !porche) return null;
        const y = terreno.HT[o] + 1;
        if (y <= 15) return null; // agua o playa baja
        const arriba = mundo.bloque(x, y + 0.5, z);
        if (arriba === -1) return undefined; // chunk sin cargar
        if (TIPO[arriba] === 1 || TIPO[arriba] === 2) return null; // árbol u obstáculo
        return y;
    }

    const gatas = ['mila', 'gala'].map((clave, i) => {
        const m = construirGata(clave);
        scene.add(m.g);
        const gata = {
            clave, ...m, fase: 0, t: Math.random() * 10, espera: rnd(0.5, 3), ruta: [], yaw: 0,
            x: (gx + (i ? 3 : -3)) * ESCALA, z: (gz + 2) * ESCALA, y: 0, dentro: false,
            velocidad: clave === 'mila' ? 1.35 : 1.8, cargada: false
        };
        return gata;
    });

    function elegirDestino(gata) {
        const adentro = estaDentro(gata.x, gata.z);
        const cerca = Math.hypot(gata.x - fuera.x, gata.z - fuera.z) < 34;
        const quiereCasa = (adentro && Math.random() < 0.55) || (!adentro && cerca && Math.random() < 0.35);
        const ruta = [];
        if (quiereCasa) {
            if (!adentro) ruta.push({ ...fuera, libre: true }, { ...dentro, libre: true, dentro: true });
            ruta.push({ x: rnd(casa.x0 + 2, casa.x1 - 2), z: rnd(casa.z0 + 2, casa.z1 - 2), dentro: true });
        } else {
            if (adentro) ruta.push({ ...dentro, libre: true, dentro: true }, { ...fuera, libre: true });
            for (let n = 0; n < 12; n++) {
                const x = rnd((gx - 9) * ESCALA, (gx + 9) * ESCALA), z = rnd((gz - 3) * ESCALA, (gz + 6) * ESCALA);
                if (estaDentro(x, z)) continue;
                const y = sueloFuera(x, z);
                if (y) { ruta.push({ x, z }); break; }
            }
        }
        gata.ruta = ruta;
    }

    function actualizarGata(gata, dt, t) {
        const dJ = Math.hypot(gata.x - jugador.pos.x, gata.z - jugador.pos.z);
        gata.g.visible = dJ < RADIO_VISIBLE;
        if (!gata.g.visible) return;

        const adentro = estaDentro(gata.x, gata.z);
        if (!gata.cargada) {
            const y0 = adentro ? pisoDentro : sueloFuera(gata.x, gata.z);
            if (y0 === undefined || y0 === null) { gata.g.visible = false; return; }
            gata.y = y0; gata.cargada = true;
        }

        let moviendo = false;
        if (gata.espera > 0) gata.espera -= dt;
        else if (!gata.ruta.length) { elegirDestino(gata); if (!gata.ruta.length) gata.espera = 1; }
        else {
            const w = gata.ruta[0];
            const dx = w.x - gata.x, dz = w.z - gata.z, d = Math.hypot(dx, dz);
            if (d < 0.35) {
                gata.ruta.shift();
                if (!gata.ruta.length) gata.espera = rnd(2, 7);
            } else {
                const paso = Math.min(d, gata.velocidad * dt);
                const nx = gata.x + dx / d * paso, nz = gata.z + dz / d * paso;
                const libre = w.libre || (adentro && estaDentro(nx, nz));
                const ny = libre || adentro ? pisoDentro : sueloFuera(nx, nz);
                if (ny === undefined) { gata.espera = 0.5; }
                else if (ny === null || Math.abs(ny - gata.y) > 1.3) { gata.ruta = []; gata.espera = rnd(0.5, 1.5); }
                else {
                    gata.x = nx; gata.z = nz;
                    gata.y += (ny - gata.y) * Math.min(1, dt * 10);
                    const objetivo = Math.atan2(dx, dz);
                    let dif = objetivo - gata.yaw;
                    dif = Math.atan2(Math.sin(dif), Math.cos(dif));
                    gata.yaw += dif * Math.min(1, dt * 8);
                    moviendo = true;
                }
            }
        }

        // Animación
        gata.fase += moviendo ? dt * gata.velocidad * 5.5 : 0;
        const bal = moviendo ? Math.sin(gata.fase) * 0.7 : 0;
        gata.patas[0].rotation.x = bal; gata.patas[3].rotation.x = bal;
        gata.patas[1].rotation.x = -bal; gata.patas[2].rotation.x = -bal;
        gata.cola.rotation.y = Math.sin(t * (moviendo ? 3 : 1.6) + gata.t) * 0.35;
        gata.cola.rotation.x = -0.9 + (moviendo ? 0.35 : 0);

        // La cabeza sigue al jugador si está cerca
        let giro = 0;
        if (dJ < 9) {
            const aJ = Math.atan2(jugador.pos.x - gata.x, jugador.pos.z - gata.z);
            giro = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(aJ - gata.yaw), Math.cos(aJ - gata.yaw))));
        }
        gata.cabeza.rotation.y += (giro - gata.cabeza.rotation.y) * Math.min(1, dt * 6);

        gata.g.position.set(gata.x, gata.y + (moviendo ? Math.abs(Math.sin(gata.fase)) * 0.04 : 0), gata.z);
        gata.g.rotation.y = gata.yaw;
    }

    let tiempo = 0;
    return {
        gatas,
        actualizar(dt) {
            tiempo += dt;
            dt = Math.min(dt, 0.05);
            const tinte = materiales.solido.color;
            for (const m of todos) m.color.setScalar(m.userData.sombra).multiply(tinte);
            for (const g of gatas) actualizarGata(g, dt, tiempo);
        }
    };
}
