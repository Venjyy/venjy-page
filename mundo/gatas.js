// =========================================================
// VENJY · Las gatas (Mila y Gala) hechas con código
// Mila: carey gordita, casi toda negra con poquito amarillo y naranjo (sin blanco).
// Gala: toda gris, guantes blancos adelante, botas blancas atrás, pecho blanco y panza gris.
// Caminan por la zona de la Gatera y entran y salen de su casa por la puerta.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { ESCALA, BASE_ESTRUCTURA } from './voxeles.js';
import { TIPO } from './texturas.js';
import {
    RADIO_VISIBLE, ajustar, lerp, textura, crearTinte, caja, crearNombre,
    cuandoHayaAudio, audioMundo, sonando, silenciarMundo, mundoSilenciado, bufferRuido
} from './criaturas/cuerpo.js';

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
    const tinte = crearTinte(); // materiales de las gatas, teñidos con la hora del día
    const caras = tinte.caras;

    function construirGata(clave) {
        const e = PELAJES[clave].escala;
        const T = materialesDe(clave);
        const g = new THREE.Group();
        const piso = e.patas;
        const cuerpo = caja(e.ancho, e.alto, e.largo, caras(T.cuerpoLado, { 2: T.cuerpoTapa, 3: T.cuerpoTapa, 4: T.pecho }));
        // tronco: pivote en la grupa (parte trasera, a la altura de la barriga); todo lo demas cuelga de el
        const tronco = new THREE.Group();
        tronco.position.set(0, piso, -e.largo / 2);
        g.add(tronco);
        cuerpo.position.set(0, e.alto / 2, e.largo / 2);
        tronco.add(cuerpo);

        const cabeza = new THREE.Group();
        cabeza.position.set(0, e.alto * 0.95, e.largo + 0.05);
        const c = caja(e.cabeza, e.cabeza * 0.85, e.cabeza * 0.85, caras(T.cabezaLado, { 4: T.cabeza, 2: T.cuerpoTapa }));
        c.position.set(0, 0.05, e.cabeza * 0.28);
        cabeza.add(c);
        for (const lado of [-1, 1]) {
            const o = caja(e.cabeza * 0.24, e.cabeza * 0.3, e.cabeza * 0.1, caras(T.oreja));
            o.position.set(lado * e.cabeza * 0.28, e.cabeza * 0.55, e.cabeza * 0.12);
            cabeza.add(o);
        }
        tronco.add(cabeza);

        const ancho = e.clave || 0;
        void ancho;
        const patas = [];
        const lw = e.ancho * 0.3;
        [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => {
            const delantera = sz > 0;
            const mapa = clave === 'gala' ? (delantera ? T.pataD : T.pataT) : T.pata;
            const pivote = new THREE.Group();
            pivote.position.set(sx * (e.ancho / 2 - lw / 2), 0, e.largo / 2 + sz * (e.largo / 2 - lw / 2 - 0.02));
            const p = caja(lw, piso, lw, caras(mapa));
            p.position.y = -piso / 2;
            pivote.add(p);
            tronco.add(pivote);
            patas.push(pivote);
        });

        const cola = new THREE.Group();
        cola.position.set(0, e.alto * 0.8, 0);
        const cm = caja(0.11, 0.11, 0.75, caras(T.cola));
        cm.position.set(0, 0, -0.34);
        cola.add(cm);
        cola.rotation.x = -0.9;
        tronco.add(cola);
        return { g, tronco, cabeza, patas, cola, e, lw };
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
            velocidad: clave === 'mila' ? 1.35 : 1.8, cargada: false,
            pose: 'pie', bs: 0, be: 0, poseElegida: false, ultimoMaullido: -99
        };
        return gata;
    });

    // Nombres flotantes: visibles solo de cerca y al mirarlas (criaturas/cuerpo.js)
    for (const g of gatas) g.nombre = crearNombre(scene, PELAJES[g.clave].nombre);
    function actualizarNombre(gata, dt) {
        const e = gata.e, alto = lerp(e.patas + e.alto + e.cabeza * 0.9, 0.03 + e.alto + e.cabeza * 0.4, gata.be);
        gata.nombre.actualizar(dt, jugador.camara, mundo, gata.g.visible, gata.x, gata.y + alto + 0.4, gata.z,
            gata.x, gata.y + e.patas + e.alto * 0.5, gata.z);
    }

    // ---------------------------------------------------------
    // Cajas de la gatera: cajones abiertos de 4x4 bloques con hueco interior de 2x2
    // (el borde es de altura HT; el piso interior queda un bloque mas abajo)
    // ---------------------------------------------------------
    const cajas = [[5, -4], [6, -4], [-7, -3], [-6, -3]].map(([dx, dz]) => {
        const x0 = (gx + dx) * ESCALA, z0 = (gz + dz) * ESCALA;
        return { x0, z0, cx: x0 + ESCALA / 2, cz: z0 + ESCALA / 2, ocupa: null, yPiso: 0, yBorde: 0 };
    });
    function alturaCajas() { // el piso interior es el tope del terreno (el bloque superior se vacia)
        for (const c of cajas) {
            const o = Math.floor(c.cz) * BW + Math.floor(c.cx);
            c.yPiso = terreno.HT[o];
            c.yBorde = terreno.HT[o] + 1;
        }
    }
    alturaCajas();

    // Punto de acercamiento fuera de la caja, por el lado norte o sur (las cajas contiguas se tocan en x)
    function accesoCaja(c, gata) {
        const norte = { x: c.cx, z: c.z0 - 0.9, lado: -1 }, sur = { x: c.cx, z: c.z0 + ESCALA + 0.9, lado: 1 };
        const orden = Math.abs(gata.z - norte.z) < Math.abs(gata.z - sur.z) ? [norte, sur] : [sur, norte];
        for (const p of orden) { if (sueloFuera(p.x, p.z)) return p; }
        return null;
    }

    // Inicia la subida: dos saltos en arco (al borde y luego al interior)
    function empezarSubida(gata, c, lado) {
        const zBorde = lado < 0 ? c.z0 + 0.5 : c.z0 + ESCALA - 0.5;
        gata.cajaEst = {
            c, lado, fase: 'saltar', resto: rnd(20, 60), k: 0, t: 0,
            segs: [
                { x: c.cx, z: zBorde, y: c.yBorde, h: 0.7, dur: 0.55 },
                { x: c.cx + rnd(-0.2, 0.2), z: c.cz + rnd(-0.2, 0.2), y: c.yPiso, h: 0.35, dur: 0.5 }
            ]
        };
        c.ocupa = gata;
        gata.ruta = [];
        gata.dormirYaw = Math.PI / 4 + (Math.random() < 0.5 ? 0 : Math.PI / 2) + (Math.random() < 0.5 ? 0 : Math.PI);
    }
    function empezarBajada(gata) {
        const e = gata.cajaEst, c = e.c;
        const zBorde = e.lado < 0 ? c.z0 + 0.5 : c.z0 + ESCALA - 0.5;
        const salida = accesoCaja(c, { z: e.lado < 0 ? c.z0 - 2 : c.z0 + ESCALA + 2 }) || { x: c.cx, z: c.z0 + (e.lado < 0 ? -0.9 : ESCALA + 0.9) };
        e.fase = 'salir'; e.k = 0; e.t = 0;
        e.segs = [
            { x: c.cx, z: zBorde, y: c.yBorde, h: 0.5, dur: 0.5 },
            { x: salida.x, z: salida.z, y: sueloFuera(salida.x, salida.z) || c.yPiso - 1, h: 0.4, dur: 0.5 }
        ];
    }
    // Avanza el salto en arco; devuelve true mientras sigue saltando
    function saltar(gata, dt) {
        const e = gata.cajaEst, s = e.segs[e.k];
        if (e.t === 0) { s.x0 = gata.x; s.z0 = gata.z; s.y0 = gata.y; }
        e.t += dt;
        const u = Math.min(1, e.t / s.dur), suave = u * u * (3 - 2 * u);
        gata.x = lerp(s.x0, s.x, suave); gata.z = lerp(s.z0, s.z, suave);
        gata.y = lerp(s.y0, s.y, u) + 4 * s.h * u * (1 - u);
        const dx = s.x - s.x0, dz = s.z - s.z0;
        if (Math.hypot(dx, dz) > 0.05) {
            let dif = Math.atan2(dx, dz) - gata.yaw;
            dif = Math.atan2(Math.sin(dif), Math.cos(dif));
            gata.yaw += dif * Math.min(1, dt * 12);
        }
        if (u >= 1) { e.k++; e.t = 0; }
        return e.k < e.segs.length;
    }

    function elegirDestino(gata) {
        const adentro = estaDentro(gata.x, gata.z);
        // De vez en cuando va a dormir a una caja libre cercana
        if (!adentro && Math.random() < 0.3) {
            const libres = cajas.filter(c => !c.ocupa && Math.hypot(c.cx - gata.x, c.cz - gata.z) < 60);
            if (libres.length) {
                const c = libres[Math.floor(Math.random() * libres.length)];
                const p = accesoCaja(c, gata);
                if (p) { gata.ruta = [{ x: p.x, z: p.z, caja: c, lado: p.lado }]; return; }
            }
        }
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

    // Si el jugador esta cerca y la gata quieta, a veces se le acerca 1-2 bloques
    function acercarse(gata, dJ) {
        if (dJ >= 5 || dJ < 2.2 || Math.random() > 0.3) return false;
        const paso = Math.min(rnd(1, 2), dJ - 1.6);
        const x = gata.x + (jugador.pos.x - gata.x) / dJ * paso, z = gata.z + (jugador.pos.z - gata.z) / dJ * paso;
        const adentro = estaDentro(gata.x, gata.z);
        if (estaDentro(x, z) !== adentro) return false;
        if (!adentro && !sueloFuera(x, z)) return false;
        gata.ruta = [{ x, z }];
        return true;
    }

    // ---------------------------------------------------------
    // Sonido (WebAudio perezoso, solo tras una interaccion del usuario)
    // ---------------------------------------------------------
    // Ronroneo: ruido filtrado con amplitud modulada a ~24 Hz, siempre sonando pero a volumen 0.
    // Usa el AudioContext compartido del mundo (criaturas/cuerpo.js).
    let purrGain = null;
    cuandoHayaAudio(({ ctx, master }) => {
        const ruido = ctx.createBufferSource();
        ruido.buffer = bufferRuido(ctx); ruido.loop = true;
        const filtro = ctx.createBiquadFilter();
        filtro.type = 'bandpass'; filtro.frequency.value = 140; filtro.Q.value = 0.8;
        const am = ctx.createGain(); am.gain.value = 0.55;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 24;
        const prof = ctx.createGain(); prof.gain.value = 0.45;
        lfo.connect(prof); prof.connect(am.gain);
        purrGain = ctx.createGain(); purrGain.gain.value = 0;
        ruido.connect(filtro); filtro.connect(am); am.connect(purrGain); purrGain.connect(master);
        ruido.start(); lfo.start();
    });

    function maullar(gata, dist) {
        try {
            if (!sonando()) return;
            const { ctx, master } = audioMundo();
            const vol = 0.09 * Math.max(0, 1 - dist / 4.5);
            if (vol <= 0.003) return;
            const t0 = ctx.currentTime, base = gata.clave === 'mila' ? 430 : 560;
            const osc = ctx.createOscillator(); osc.type = 'triangle';
            osc.frequency.setValueAtTime(base, t0);
            osc.frequency.exponentialRampToValueAtTime(base * 1.7, t0 + 0.12);
            osc.frequency.exponentialRampToValueAtTime(base * 1.1, t0 + 0.35);
            const filtro = ctx.createBiquadFilter(); filtro.type = 'bandpass'; filtro.Q.value = 2;
            filtro.frequency.setValueAtTime(900, t0);
            filtro.frequency.exponentialRampToValueAtTime(1800, t0 + 0.15);
            filtro.frequency.exponentialRampToValueAtTime(1000, t0 + 0.35);
            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, t0);
            env.gain.linearRampToValueAtTime(vol, t0 + 0.06);
            env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
            osc.connect(filtro); filtro.connect(env); env.connect(master);
            osc.start(t0); osc.stop(t0 + 0.4);
        } catch (e) { /* sin sonido */ }
    }

    function actualizarPurr() {
        try {
            if (!purrGain) return;
            let v = 0;
            if (sonando()) {
                for (const g of gatas) {
                    if (!g.g.visible || g.be < 0.8) continue;
                    const d = Math.hypot(g.x - jugador.pos.x, g.z - jugador.pos.z);
                    v = Math.max(v, 0.07 * Math.max(0, 1 - d / 6));
                }
            }
            purrGain.gain.setTargetAtTime(v, audioMundo().ctx.currentTime, 0.25);
        } catch (e) { /* sin sonido */ }
    }

    const ANG_SENTADA = 0.61; // ~35 grados

    // Aplica la pose mezclada (bs = sentada, be = echada) sobre el modelo, ademas del ciclo de caminata
    function aplicarPose(gata, t) {
        const { e, lw, tronco, cabeza, patas, cola } = gata;
        const s = gata.bs, z = gata.be, piso = e.patas;
        const th = ANG_SENTADA * s;
        tronco.rotation.x = -th;
        // sentada: la grupa toca el suelo; echada: cuerpo a ras del suelo
        tronco.position.y = lerp(lerp(piso, 0.03, s), 0.03, z);
        const resp = 1 + Math.sin(t * 2.1 + gata.t) * 0.035 * z;
        tronco.scale.y = resp;
        // delanteras: rectas al sentarse (estiradas para tocar el suelo); hacia adelante al echarse
        const zl = e.largo - lw / 2 - 0.02;
        const largoSent = (0.03 + zl * Math.sin(th)) / piso;
        for (const i of [0, 1]) {
            const p = patas[i];
            p.rotation.x = lerp(lerp(p.rotation.x, th, s), -Math.PI / 2, z);
            p.scale.y = lerp(lerp(1, largoSent, s), 0.7, z);
            p.scale.x = lerp(1, 1.05, z);
            p.position.y = lerp(0, lw / 2 + 0.01, z);
        }
        // traseras: plegadas al sentarse (apuntan hacia adelante); recogidas bajo el cuerpo al echarse
        for (const i of [2, 3]) {
            const p = patas[i];
            p.rotation.x = lerp(lerp(p.rotation.x, -1.05, s), 0, z);
            p.scale.y = lerp(lerp(1, 0.62, s), 0.28, z);
            p.scale.x = lerp(1, 1.05, z);
            p.position.y = lerp(lerp(0, lw * 0.5, s), piso * 0.28 + 0.02, z);
        }
        // cabeza: arriba y nivelada al sentarse, baja al echarse
        cabeza.rotation.x = lerp(lerp(0, th * 0.85, s), 0.35, z);
        cabeza.position.y = lerp(e.alto * 0.95, e.alto * 0.5, z);
        cabeza.position.z = e.largo + 0.05 + 0.1 * z;
        // cola: cuelga al sentarse (queda sobre el suelo), enroscada y casi quieta al echarse
        const cx = lerp(-0.9, -0.7 + th, Math.max(s, z));
        gata.colaBase = cx;
    }

    function actualizarGata(gata, dt, t) {
        const dJ = Math.hypot(gata.x - jugador.pos.x, gata.z - jugador.pos.z);
        gata.g.visible = dJ < RADIO_VISIBLE;
        if (!gata.g.visible) { gata.nombre.ocultar(); return; }

        const adentro = estaDentro(gata.x, gata.z);
        if (!gata.cargada) {
            const y0 = adentro ? pisoDentro : sueloFuera(gata.x, gata.z);
            if (y0 === undefined || y0 === null) { gata.g.visible = false; return; }
            gata.y = y0; gata.cargada = true;
        }

        let moviendo = false;
        const pesoPose = gata.bs + gata.be;
        const ce = gata.cajaEst;
        if (ce && ce.fase === 'dormir') {
            // Durmiendo en la caja: echada y quieta; al terminar se levanta y sale
            gata.pose = 'echada';
            gata.yaw += (gata.dormirYaw - gata.yaw) * Math.min(1, dt * 4);
            ce.resto -= dt;
            if (ce.resto <= 0) { gata.pose = 'pie'; if (pesoPose < 0.12) empezarBajada(gata); }
        } else if (ce) {
            // Saltando hacia dentro o hacia fuera de la caja
            gata.pose = 'pie'; gata.poseElegida = false;
            if (pesoPose > 0.12) { /* primero se levanta */ }
            else {
                moviendo = true;
                if (!saltar(gata, dt)) {
                    if (ce.fase === 'saltar') { ce.fase = 'dormir'; gata.pose = 'echada'; }
                    else { ce.c.ocupa = null; gata.cajaEst = null; gata.espera = rnd(2, 6); gata.ruta = []; }
                }
            }
        } else if (gata.espera > 0) {
            gata.espera -= dt;
            // En espera: elegir una pose al azar una vez por pausa
            if (!gata.poseElegida) {
                gata.poseElegida = true;
                const r = Math.random();
                gata.pose = r < 0.4 ? 'pie' : r < 0.7 ? 'sentada' : 'echada';
                if (gata.pose !== 'pie') gata.espera = Math.max(gata.espera, rnd(5, 14));
            }
        } else if (pesoPose > 0.12) {
            gata.pose = 'pie'; // primero se levanta, luego camina
        } else if (!gata.ruta.length) {
            gata.pose = 'pie'; gata.poseElegida = false;
            if (!acercarse(gata, dJ)) { elegirDestino(gata); if (!gata.ruta.length) gata.espera = 1; }
        } else {
            gata.pose = 'pie'; gata.poseElegida = false;
            const w = gata.ruta[0];
            const dx = w.x - gata.x, dz = w.z - gata.z, d = Math.hypot(dx, dz);
            if (d < 0.35) {
                gata.ruta.shift();
                if (w.caja && !w.caja.ocupa) empezarSubida(gata, w.caja, w.lado);
                else if (!gata.ruta.length) gata.espera = rnd(2, 7);
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
        const objS = gata.pose === 'sentada' ? 1 : 0, objE = gata.pose === 'echada' ? 1 : 0;
        const kp = Math.min(1, dt * 2.6);
        gata.bs += (objS - gata.bs) * kp; gata.be += (objE - gata.be) * kp;
        if (Math.abs(gata.bs - objS) < 0.002) gata.bs = objS;
        if (Math.abs(gata.be - objE) < 0.002) gata.be = objE;
        gata.fase += moviendo ? dt * gata.velocidad * 5.5 : 0;
        const bal = moviendo ? Math.sin(gata.fase) * 0.7 : 0;
        gata.patas[0].rotation.x = bal; gata.patas[3].rotation.x = bal;
        gata.patas[1].rotation.x = -bal; gata.patas[2].rotation.x = -bal;
        aplicarPose(gata, t);
        const quieta = Math.max(gata.bs, gata.be);
        gata.cola.rotation.y = Math.sin(t * (moviendo ? 3 : 1.6) + gata.t) * lerp(0.35, gata.be > 0.5 ? 0.08 : 0.28, quieta);
        gata.cola.rotation.x = gata.colaBase + (moviendo ? 0.35 : 0);

        // La cabeza sigue al jugador si está cerca
        let giro = 0;
        if (dJ < 9) {
            const aJ = Math.atan2(jugador.pos.x - gata.x, jugador.pos.z - gata.z);
            giro = Math.max(-0.9, Math.min(0.9, Math.atan2(Math.sin(aJ - gata.yaw), Math.cos(aJ - gata.yaw))));
        }
        gata.cabeza.rotation.y += (giro - gata.cabeza.rotation.y) * Math.min(1, dt * 6 * (1 - gata.be * 0.8));

        // Maullido al acercarse el jugador (enfriamiento de 12 s por gata)
        if (dJ < 4 && t - gata.ultimoMaullido > 12 && !moviendo) { gata.ultimoMaullido = t; maullar(gata, dJ); }

        gata.g.position.set(gata.x, gata.y + (moviendo ? Math.abs(Math.sin(gata.fase)) * 0.04 : 0), gata.z);
        gata.g.rotation.y = gata.yaw;
        actualizarNombre(gata, dt);
    }

    let tiempo = 0;
    return {
        gatas,
        actualizar(dt) {
            tiempo += dt;
            dt = Math.min(dt, 0.05);
            tinte.aplicar(materiales.solido.color);
            for (const g of gatas) actualizarGata(g, dt, tiempo);
            actualizarPurr();
        },
        // silenciar(true) apaga todos los sonidos del mundo (gatas, animales y música); se recuerda
        silenciar(valor = true) { silenciarMundo(valor); },
        get silenciado() { return mundoSilenciado(); }
    };
}
