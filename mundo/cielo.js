// =========================================================
// VENJY · Cielo: domo con gradiente, sol y luna cuadrados, estrellas,
// nubes de bloques y ciclo día/noche
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { crearRuido } from './mundo-datos.js';

// Colores de día (el horizonte se exporta: main.js lo usa como color base)
export const COLOR_HORIZONTE = new THREE.Color('#bcd5f6');
const COLOR_ZENIT = new THREE.Color('#6b9fee');

// Duración de un día completo en segundos reales (~8 minutos)
export const DURACION_DIA = 480;
// Hora inicial: media mañana (0 = medianoche, 0.25 = amanecer, 0.5 = mediodía, 0.75 = atardecer)
const HORA_INICIAL = 0.38;

// Paletas del ciclo
const NOCHE_HORIZONTE = new THREE.Color('#0b1228');
const NOCHE_ZENIT = new THREE.Color('#03050f');
const CREP_HORIZONTE = new THREE.Color('#f29a62');
const CREP_ZENIT = new THREE.Color('#5a5f9e');

// Nivel de luz aplicado al mundo (multiplica los materiales)
const LUZ_NOCHE = new THREE.Color(0.24, 0.28, 0.42);
const LUZ_DIA = new THREE.Color(1, 1, 1);
const LUZ_CREP = new THREE.Color(1, 0.86, 0.78);

// Colores de las nubes
const NUBE_DIA = new THREE.Color(1, 1, 1);
const NUBE_NOCHE = new THREE.Color(0.2, 0.23, 0.36);
const NUBE_CREP = new THREE.Color(1, 0.72, 0.66);

const RADIO_DOMO = 900;
const VELOCIDAD_NUBES = 1.5; // bloques por segundo hacia el este (+x)

const suavizar = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

function crearDomo() {
    const g = new THREE.SphereGeometry(RADIO_DOMO, 16, 12);
    const pos = g.attributes.position;
    // Factor de altura de cada vértice (0 horizonte, 1 cenit), precalculado
    const alturas = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
        alturas[i] = Math.pow(Math.max(0, Math.min(1, pos.getY(i) / RADIO_DOMO)), 0.6);
    }
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
    const domo = new THREE.Mesh(g, m);
    domo.renderOrder = -2;
    domo.frustumCulled = false;
    domo.userData.alturas = alturas;
    return domo;
}

// Reescribe el atributo de color del domo (pocos vértices, sin recrear geometría)
function pintarDomo(domo, horizonte, cenit) {
    const col = domo.geometry.attributes.color;
    const alturas = domo.userData.alturas;
    for (let i = 0; i < alturas.length; i++) {
        const t = alturas[i];
        col.setXYZ(i,
            horizonte.r + (cenit.r - horizonte.r) * t,
            horizonte.g + (cenit.g - horizonte.g) * t,
            horizonte.b + (cenit.b - horizonte.b) * t);
    }
    col.needsUpdate = true;
}

function crearTextura(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function crearSol() {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    x.fillStyle = '#fff6a8'; x.fillRect(0, 0, 16, 16);
    x.fillStyle = '#ffffff'; x.fillRect(3, 3, 10, 10);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(110, 110),
        new THREE.MeshBasicMaterial({ map: crearTextura(c), fog: false, depthWrite: false, transparent: true }));
    m.renderOrder = -1;
    return m;
}

// Dibuja la luna 16x16 con cráteres; la fase (0..7) oscurece parte del disco
function dibujarLuna(ctx, fase) {
    const CRATERES = [[4, 4, 2], [10, 3, 1], [11, 9, 2], [5, 11, 1], [8, 7, 1], [2, 8, 1]];
    const p = fase / 8 * Math.PI * 2;
    const crecientes = Math.sin(p) >= 0;
    ctx.clearRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const u = (x + 0.5) / 8 - 1, v = (y + 0.5) / 8 - 1;
            const w = Math.sqrt(Math.max(0, 1 - v * v));
            const t = Math.cos(p) * w;
            const iluminado = crecientes ? u > t : u < -t;
            let color = iluminado ? '#e8ecf4' : '#1c2338';
            if (iluminado && CRATERES.some(([cx, cy, r]) => x >= cx && x < cx + r && y >= cy && y < cy + r)) color = '#b4bccf';
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

function crearLuna() {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    dibujarLuna(ctx, 4);
    const tex = crearTextura(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(80, 80),
        new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: false, transparent: true }));
    m.renderOrder = -1;
    m.userData.cambiarFase = fase => { dibujarLuna(ctx, fase); tex.needsUpdate = true; };
    return m;
}

// Estrellas: puntos cuadrados de 2 px repartidos en una esfera que sigue a la cámara
function crearEstrellas() {
    const N = 450, R = 800;
    const ruido = crearRuido(909);
    const pos = new Float32Array(N * 3);
    // Generador simple y determinista (el ruido sólo siembra la semilla)
    let s = Math.floor(ruido(1, 1, 1) * 1e6) + 12345;
    const azar = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let i = 0; i < N; i++) {
        const z = azar() * 2 - 1, a = azar() * Math.PI * 2, r = Math.sqrt(1 - z * z);
        pos.set([Math.cos(a) * r * R, z * R, Math.sin(a) * r * R], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    const p = new THREE.Points(g, m);
    p.renderOrder = -1.5;
    p.frustumCulled = false;
    p.visible = false;
    return p;
}

// Nubes planas: celdas de 12×12 bloques con grosor 4, a 150 de altura.
// El patrón es periódico en x (ancho = nx celdas) para poder desplazarlo sin saltos.
function crearNubes(anchoMundo, fondoMundo) {
    const CELDA = 12, GROSOR = 4, Y = 150;
    const ruido = crearRuido(555);
    const nx = Math.ceil(anchoMundo / CELDA), nz = Math.ceil(fondoMundo / CELDA);
    // Ruido tileable en x: mezcla lineal de dos muestras desfasadas un ancho
    const valor = (i, j) => {
        const w = i / nx;
        return ruido(i / 6, j / 6, 3) * (1 - w) + ruido((i - nx) / 6, j / 6, 3) * w;
    };
    const valores = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) valores[j * nx + i] = valor(i, j);
    // Umbral por percentil: cubre ~40 % del cielo aunque la mezcla reduzca el contraste
    const umbral = Array.from(valores).sort((a, b) => a - b)[Math.floor(valores.length * 0.6)];
    const llena = (i, j) => j >= 0 && j < nz && valores[j * nx + ((i % nx) + nx) % nx] > umbral;
    const p = [], col = [], idx = [];
    const quad = (v, s) => {
        const b = p.length / 3;
        v.forEach(q => p.push(q[0], q[1], q[2]));
        for (let k = 0; k < 4; k++) col.push(s, s, s);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
            if (!llena(i, j)) continue;
            const x0 = i * CELDA, x1 = x0 + CELDA, z0 = j * CELDA, z1 = z0 + CELDA, y0 = Y, y1 = Y + GROSOR;
            quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], 1);
            quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], 0.72);
            if (!llena(i + 1, j)) quad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], 0.86);
            if (!llena(i - 1, j)) quad([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], 0.86);
            if (!llena(i, j + 1)) quad([[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], 0.8);
            if (!llena(i, j - 1)) quad([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], 0.8);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, fog: false });
    // Tres copias contiguas (comparten geometría y material) para cubrir el desplazamiento
    const grupo = new THREE.Group();
    for (let k = -1; k <= 1; k++) {
        const m = new THREE.Mesh(g, material);
        m.position.x = k * nx * CELDA;
        m.frustumCulled = false;
        grupo.add(m);
    }
    grupo.userData = { material, periodo: nx * CELDA };
    return grupo;
}

export function crearCielo(scene, anchoMundo, fondoMundo, materiales) {
    const domo = crearDomo();
    const sol = crearSol();
    const luna = crearLuna();
    const estrellas = crearEstrellas();
    const nubes = crearNubes(anchoMundo, fondoMundo);
    scene.add(domo, sol, luna, estrellas, nubes);

    // Colores propios para no mutar COLOR_HORIZONTE (compartido con main.js)
    const colorFondo = new THREE.Color().copy(COLOR_HORIZONTE);
    scene.background = colorFondo;

    const horizonte = new THREE.Color(), cenit = new THREE.Color(), tmp = new THREE.Color();
    const dirSol = new THREE.Vector3();
    let diaActual = 0;
    let desfaseNubes = 0;

    const cielo = {
        hora: HORA_INICIAL,
        pausado: false,
        // Fija la hora (0..1: 0 medianoche, 0.25 amanecer, 0.5 mediodía, 0.75 atardecer)
        // `dia` (opcional): número de días transcurridos, para la fase de la luna (lo usa la supervivencia)
        fijarHora(h, dia) {
            this.hora = ((h % 1) + 1) % 1;
            if (dia !== undefined) diaActual = dia + this.hora;
            aplicar(this.hora);
        },
        // nubesLibres: con el ciclo pausado (la supervivencia maneja su propio reloj) las nubes siguen andando
        nubesLibres: false,
        actualizar(camara, dt) {
            if (!this.pausado) {
                this.hora = (this.hora + dt / DURACION_DIA) % 1;
                desfaseNubes = (desfaseNubes + VELOCIDAD_NUBES * dt) % nubes.userData.periodo;
                diaActual += dt / DURACION_DIA;
                aplicar(this.hora);
            } else if (this.nubesLibres) desfaseNubes = (desfaseNubes + VELOCIDAD_NUBES * dt) % nubes.userData.periodo;
            const cp = camara.position;
            domo.position.copy(cp);
            estrellas.position.copy(cp);
            sol.position.copy(cp).addScaledVector(dirSol, 700);
            sol.lookAt(cp);
            luna.position.copy(cp).addScaledVector(dirSol, -700);
            luna.lookAt(cp);
            nubes.position.x = desfaseNubes;
        }
    };

    // Fase lunar: cambia al cumplirse cada día
    let faseLunar = 4;
    let ultimoDia = 0;

    function aplicar(hora) {
        const a = hora * Math.PI * 2;
        // Altura del sol: -1 (medianoche) .. 1 (mediodía); este (+x) al amanecer, oeste al atardecer
        const alt = -Math.cos(a);
        dirSol.set(-Math.sin(a), alt, 0.35).normalize();

        const dia = suavizar(-0.12, 0.25, alt);                     // 0 noche .. 1 día
        const crep = Math.pow(Math.max(0, 1 - Math.abs(alt) / 0.38), 1.5); // 1 en el horizonte

        horizonte.copy(NOCHE_HORIZONTE).lerp(COLOR_HORIZONTE, dia).lerp(CREP_HORIZONTE, crep * 0.8);
        cenit.copy(NOCHE_ZENIT).lerp(COLOR_ZENIT, dia).lerp(CREP_ZENIT, crep * 0.55);
        pintarDomo(domo, horizonte, cenit);
        colorFondo.copy(horizonte);
        if (scene.fog) scene.fog.color.copy(horizonte);

        // Tinte de luz del mundo (nunca negro)
        tmp.copy(LUZ_NOCHE).lerp(LUZ_DIA, dia).lerp(LUZ_CREP, crep * 0.5 * dia);
        if (materiales) {
            if (materiales.solido) materiales.solido.color.copy(tmp);
            if (materiales.agua) materiales.agua.color.copy(tmp);
        }

        // Astros: se ocultan bajo el horizonte
        sol.visible = alt > -0.12;
        luna.visible = alt < 0.12;
        const dNum = Math.floor(diaActual);
        if (dNum !== ultimoDia) {
            ultimoDia = dNum;
            faseLunar = (faseLunar + 1) % 8;
            luna.userData.cambiarFase(faseLunar);
        }

        // Estrellas: sólo de noche, con fade en el crepúsculo, girando con el cielo
        const brillo = 1 - suavizar(-0.3, 0.05, alt);
        estrellas.material.opacity = brillo;
        estrellas.visible = brillo > 0.01;
        estrellas.rotation.z = a;

        // Nubes: blancas de día, rosadas al atardecer, azul oscuro de noche
        nubes.userData.material.color.copy(NUBE_NOCHE).lerp(NUBE_DIA, dia).lerp(NUBE_CREP, crep * 0.6 * dia);
    }

    aplicar(cielo.hora);
    return cielo;
}
