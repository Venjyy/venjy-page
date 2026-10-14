// =========================================================
// VENJY · Supervivencia · Carrera de gatas (7h-1): la escena del «Gran Premio del Living»
// Escena propia (no toca la del mundo): una sala gigante a escala de gato con piso de tablas, papel mural, ventana,
// alfombra y muebles (sofá con su posabrazos de rampa, mesa con el túnel debajo, ovillos, lámpara, cajas, pecera,
// cojín y un ratón de juguete). La pista es una cinta con bordes rojos y blancos, barandas, pilares de libros bajo
// los tramos altos, placas de turbo animadas, línea a cuadros y el arco de salida con el nombre del gran premio.
// Las seis gatas: Mila y Gala son copias de su modelo del mundo; las demás se arman con su pelaje (carrera-modelo.js,
// `gatas`). Lona (copia de su modelo) da la partida desde su caja con la bandera. Partículas: polvo, chispas del
// derrape, fuego del turbo, estrellas del truco y confeti del podio. Objetos: cajas «?» que giran (se esconden al
// tomarlas), ovillo que rueda, caja de cartón, pescado que salta, la aspiradora de Lona que pasa volando, y los
// efectos en las gatas (golpeada da vueltas, hierba = remolino verde, susto = gotas, comiendo = agachada).
// Más pistas (R.escenario.tipo): cocina (baldosas a cuadros, azulejos, ventana; encimera con lavaplatos, refri, silla,
// olla, tazas), patio (pasto, valla, la pared de la casa, sol y nubes; piscina inflable, banca, árbol, maceteros,
// pelota) y techo al atardecer (tejas en dos techos con el callejón entre medio, parapeto, ciudad lejos; estanque,
// chimeneas, antena, paneles solares, claraboya). Los colores de cada escenario vienen de R.escenario (Estudio).
// Todo con MeshBasicMaterial y sombra por cara (crearTinte), como las criaturas: sin luces.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { texturaPixeles, ajustar, crearTinte, caja } from '../criaturas/cuerpo.js';
import * as M from './carrera-modelo.js';

const hex = h => { const n = parseInt(String(h || '#888888').slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

// Copia un grupo y devuelve, para cada parte nombrada del original, su copia (mismo orden de recorrido)
function clonarConPartes(orig, partes) {
    const copia = orig.clone(true);
    const a = [], b = [];
    orig.traverse(o => a.push(o)); copia.traverse(o => b.push(o));
    const mapa = new Map(a.map((o, i) => [o, b[i]]));
    const r = { g: copia };
    for (const [k, v] of Object.entries(partes)) r[k] = Array.isArray(v) ? v.map(x => mapa.get(x)) : mapa.get(v) || null;
    return r;
}

export function crearEscenaCarrera({ R, pista, gatasMundo, lona, idioma = 'es' }) {
    const scene = new THREE.Scene();
    const tinte = crearTinte();
    let sem = 7700;
    const tx = (w, h, pintor) => texturaPixeles(w, h, sem++, pintor);
    const repetir = (t, rx, ry) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
    const mats = (t, especial) => tinte.caras(t, especial);
    const recursos = [];
    const bloque = (w, h, d, m, x, y, z, padre = scene) => { const b = caja(w, h, d, m); b.position.set(x, y, z); padre.add(b); recursos.push(b.geometry); return b; };
    const sala = R.sala;
    // Escenario (living, cocina, patio o techo) con sus colores (R.escenario, editables en el Estudio)
    const E = R.escenario || {}, tipoE = E.tipo || 'living';
    const cP = hex(E.piso || '#96663a'), cP2 = hex(E.piso2 || '#86592f'), cW = hex(E.pared || '#e2cea0'), cW2 = hex(E.pared2 || '#c4a878');
    const cT = hex(E.techo || '#eee8de'), cC = hex(E.cielo || '#80baec');
    scene.background = new THREE.Color(E.fondo || '#2a1c14');
    const lado = Math.max(R.sala.ancho, R.sala.fondo);
    const abierto = tipoE === 'patio' || tipoE === 'techo'; // al aire libre: la niebla parte más lejos
    scene.fog = new THREE.Fog(new THREE.Color(E.niebla || '#3a2a20'), lado * (abierto ? 0.9 : 0.6), lado * (abierto ? 2.2 : 1.4)); // se adapta al tamaño de la sala
    const H = sala.alto, A = sala.ancho, F = sala.fondo;
    const tela = (c, s = 0.1) => tx(8, 8, (x, y, r) => ajustar(c, 1 - s + r() * s * 2));
    const paredes = (w, d, x, z) => [[A, d, sala.x, sala.z - F / 2], [A, d, sala.x, sala.z + F / 2], [w, F, sala.x - A / 2, sala.z], [w, F, sala.x + A / 2, sala.z]];
    // Ventana con cielo en la pared del fondo y su luz en el piso (living y cocina)
    function ventana(vx, y0, ancho, alto) {
        const cielo = tx(16, 16, (x, y, r) => (y > 10 && (x + y) % 5 === 0) ? [248, 248, 252] : ajustar(cC, 0.82 + y * 0.025));
        const marco = mats(tx(4, 4, () => [244, 240, 232]));
        const vz = sala.z - F / 2 + 0.7, yc = y0 + alto / 2;
        bloque(ancho, alto, 0.2, mats(cielo), vx, yc, vz);
        for (const [w, h, x, y] of [[ancho + 2, 1.6, 0, alto / 2 + 0.8], [ancho + 2, 1.6, 0, -alto / 2 - 0.8], [1.6, alto, -ancho / 2 - 0.5, 0], [1.6, alto, ancho / 2 + 0.5, 0], [1.2, alto, 0, 0], [ancho + 2, 1, 0, 0]]) bloque(w, h, 0.6, marco, vx + x, yc + y, vz + 0.2);
        const luz = new THREE.Mesh(new THREE.PlaneGeometry(ancho * 0.9, 30), new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: 0.12, depthWrite: false }));
        luz.rotation.x = -Math.PI / 2; luz.position.set(vx + 6, 0.06, vz + 30); scene.add(luz); recursos.push(luz.geometry);
    }
    // Cielo abierto: sol y nubes cuadradas (patio y techo)
    function cieloAbierto(solY, solColor) {
        const nube = mats(tela([250, 250, 252], 0.03));
        const sol = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ color: solColor, fog: false, side: THREE.DoubleSide }));
        sol.position.set(sala.x + A * 0.3, solY, sala.z - lado * 1.3); scene.add(sol); recursos.push(sol.geometry);
        for (let k = 0; k < 9; k++) {
            const nx = sala.x + ((k * 53) % 9 - 4) * A * 0.22, nz = sala.z + ((k * 31) % 7 - 3) * F * 0.3, ny = 70 + (k % 3) * 12;
            bloque(30 + (k % 4) * 10, 3, 14 + (k % 3) * 6, nube, nx, ny, nz);
            bloque(16, 3, 10, nube, nx + 6, ny + 2.5, nz - 2);
        }
    }
    if (tipoE === 'cocina') {
        // Baldosas a cuadros, azulejos con su junta, techo y la ventana sobre la encimera
        const baldosa = tx(16, 16, (x, y, r) => (x % 8 === 0 || y % 8 === 0) ? ajustar(cP, 0.78) : ((x < 8) !== (y < 8) ? ajustar(cP2, 0.94 + r() * 0.1) : ajustar(cP, 0.95 + r() * 0.08)));
        bloque(A, 1, F, mats(repetir(baldosa, A / 8, F / 8)), sala.x, -0.5, sala.z);
        const azulejo = tx(8, 8, (x, y, r) => (x === 0 || y === 0) ? cW2 : ajustar(cW, 0.96 + r() * 0.06));
        for (const [w, d, x, z] of paredes(1, 1)) bloque(w, H, d, mats(repetir(azulejo, Math.max(w, d) / 4, H / 4)), x, H / 2, z);
        bloque(A, 1, F, mats(repetir(tela(cT, 0.03), A / 8, F / 8)), sala.x, H + 0.5, sala.z);
        ventana(sala.x + 8, 22, 34, 18);
    } else if (tipoE === 'patio') {
        // Pasto, valla de tablas alrededor, la pared de la casa al fondo (con su ventana y su puerta) y el cielo
        const pasto = tx(16, 16, (x, y, r) => (r() < 0.12 ? ajustar(cP2, 0.9 + r() * 0.2) : ajustar(cP, 0.9 + r() * 0.16)));
        bloque(A + 120, 1, F + 120, mats(repetir(pasto, (A + 120) / 6, (F + 120) / 6)), sala.x, -0.5, sala.z);
        const tabla = tx(8, 16, (x, y, r) => (x === 0 ? cW2 : y === 15 && x % 4 === 2 ? ajustar(cW2, 0.8) : ajustar(cW, 0.92 + r() * 0.12)));
        for (const [w, d, x, z] of paredes(1, 1).slice(1)) bloque(w, H, d, mats(repetir(tabla, Math.max(w, d) / 3, H / 6)), x, H / 2, z);
        const yeso = tx(8, 8, (x, y, r) => ajustar(cT, 0.94 + r() * 0.08));
        const fz = sala.z - F / 2;
        bloque(A + 2, 64, 2, mats(repetir(yeso, A / 8, 8)), sala.x, 32, fz);
        bloque(A + 6, 2, 6, mats(tela(cW2, 0.05)), sala.x, 64, fz + 2);                // alero
        const vid = mats(tx(8, 8, (x, y) => (x === 0 || y === 0) ? [240, 240, 236] : ajustar(cC, 0.85 + y * 0.03)));
        for (const vx of [-A * 0.28, A * 0.22]) bloque(28, 18, 0.4, vid, sala.x + vx, 34, fz + 1.2);
        bloque(16, 30, 0.6, mats(tela([120, 78, 46], 0.08)), sala.x - 2, 15, fz + 1.3);    // puerta
        cieloAbierto(95, '#fff2a8');
    } else if (tipoE === 'techo') {
        // Tejas sobre dos techos con un callejón entre medio (escenario.callejon), parapeto bajo, ciudad lejos y el atardecer
        const teja = tx(16, 16, (x, y, r) => { const fila = Math.floor(y / 4), c = (x + (fila % 2) * 4) % 8; return (y % 4 === 3 || c === 0) ? ajustar(cP2, 0.8) : ajustar(y % 4 === 0 ? cP : cP2, 0.94 + r() * 0.12); });
        const cj = E.callejon || {}, cw = Math.max(0, cj.ancho || 0), cx = cj.x ?? sala.x;
        const x0 = sala.x - A / 2, x1 = sala.x + A / 2;
        const ladrillo = tx(16, 16, (x, y, r) => (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) ? [190, 180, 168] : ajustar([150, 70, 52], 0.9 + r() * 0.15));
        const piso = (a, b) => { if (b - a < 0.5) return; bloque(b - a, 1, F, mats(repetir(teja, (b - a) / 6, F / 6)), (a + b) / 2, -0.5, sala.z); bloque(b - a, 50, F, mats(repetir(ladrillo, (b - a) / 6, 50 / 6)), (a + b) / 2, -26, sala.z); };
        if (cw > 0) { piso(x0, cx - cw / 2); piso(cx + cw / 2, x1); bloque(cw + 2, 1, F + 40, mats(tela([52, 50, 56], 0.1)), cx, -52, sala.z); } // fondo del callejón
        else piso(x0, x1);
        const muro = mats(repetir(tx(8, 8, (x, y, r) => (y === 0 ? cW2 : ajustar(cW, 0.94 + r() * 0.08))), 1, 1));
        for (const [w, d, x, z] of paredes(1.2, 1.2)) {
            if (cw > 0 && w === A) { for (const [a, b] of [[x0, cx - cw / 2], [cx + cw / 2, x1]]) if (b - a > 0.5) bloque(b - a, H, d, muro, (a + b) / 2, H / 2, z); }
            else bloque(w, H, d, muro, x, H / 2, z);
        }
        // Ciudad lejos (siluetas de edificios con ventanas encendidas)
        const ciudad = tx(8, 16, (x, y, r) => (x % 3 === 1 && y % 4 === 1 && r() < 0.5) ? [255, 214, 120] : ajustar(cW2, 0.55 + r() * 0.06));
        for (let k = 0; k < 28; k++) {
            const ang = (k / 28) * Math.PI * 2, rad = lado * (1.25 + (k % 3) * 0.15), w = 18 + (k * 7) % 16, h = 4 + (k * 13) % 34;
            const b = bloque(w, h + 60, w, mats(repetir(ciudad, w / 8, (h + 60) / 16)), sala.x + Math.cos(ang) * rad, (h + 60) / 2 - 60, sala.z + Math.sin(ang) * rad);
            b.rotation.y = -ang;
        }
        cieloAbierto(18, '#ffe08a');
    } else {
        // Living: piso de tablas, papel mural con zócalo, techo y la ventana con cielo
        const tabla = tx(16, 16, (x, y, r) => {
            const fila = Math.floor(y / 4), corte = (x + fila * 7) % 16 === 0;
            const base = [cP, ajustar(cP, 0.93), ajustar(cP, 1.05), cP2][fila];
            return corte || y % 4 === 3 ? ajustar(base, 0.72) : ajustar(base, 0.9 + r() * 0.16);
        });
        bloque(sala.ancho, 1, sala.fondo, mats(repetir(tabla, sala.ancho / 4, sala.fondo / 4)), sala.x, -0.5, sala.z);
        const mural = tx(16, 16, (x, y, r) => ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) ? cW2 : ajustar(cW, 0.94 + r() * 0.08));
        const zocalo = tx(8, 8, (x, y, r) => y === 0 ? [240, 236, 226] : ajustar([226, 220, 206], 0.95 + r() * 0.06));
        for (const [w, d, x, z] of paredes(1, 1)) {
            bloque(w, H, d, mats(repetir(mural, Math.max(w, d) / 6, H / 6)), x, H / 2, z);
            bloque(w + 0.4, 2, d + 0.4, mats(repetir(zocalo, Math.max(w, d) / 4, 1)), x, 1, z);
        }
        bloque(A, 1, F, mats(repetir(tx(8, 8, (x, y, r) => ajustar(cT, 0.95 + r() * 0.05)), A / 8, F / 8)), sala.x, H + 0.5, sala.z);
        ventana(sala.x - 10, 19, 40, 22);
    }
    // La tabla de madera del living también la usa la mesa
    const madera = tx(16, 16, (x, y, r) => {
        const fila = Math.floor(y / 4), corte = (x + fila * 7) % 16 === 0;
        const base = [[150, 102, 58], [140, 94, 52], [158, 110, 64], [134, 90, 50]][fila];
        return corte || y % 4 === 3 ? ajustar(base, 0.72) : ajustar(base, 0.9 + r() * 0.16);
    });

    // ---------- Muebles ----------
    // Un «cilindro» de cajas apiladas (ovillo, pelota, olla, taza): k capas, ancho según el perfil f(u) (u de 0 a 1)
    const capas = (g, m, mat, k, y0, alto, perfil) => { for (let i = 0; i < k; i++) { const u = (i + 0.5) / k, an = Math.max(0.3, perfil(u) * m.a); bloque(an, alto / k + 0.04, an * (m.f / m.a), mat, 0, y0 + alto * u, 0, g); } };
    const esfera = u => Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2));
    for (const m of R.muebles || []) {
        const g = new THREE.Group(); g.position.set(m.x, 0, m.z); g.rotation.y = (m.g || 0) * Math.PI / 180; scene.add(g);
        const c = hex(m.color);
        if (m.tipo === 'sofa') {
            const tapiz = mats(repetir(tela([92, 122, 156]), 4, 2)), tapizO = mats(repetir(tela([74, 100, 132]), 4, 2));
            bloque(m.a, m.h - 1.5, m.f, tapizO, 0, (m.h - 1.5) / 2 + 1.5, 0, g);                          // base
            for (let k = 0; k < 3; k++) bloque(m.a / 3 - 0.6, 1.2, m.f - 4, tapiz, -m.a / 3 + k * m.a / 3, m.h - 0.6, 1.5, g); // cojines del asiento
            bloque(m.a, 12, 4, tapizO, 0, m.h + 6, -m.f / 2 + 2, g);                                   // respaldo
            for (const lado of [-1, 1]) bloque(4, m.h + 1.6, m.f, tapizO, lado * (m.a / 2 - 2), (m.h + 1.6) / 2 + 1.5, 0, g); // posabrazos
            for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bloque(1.4, 1.5, 1.4, mats(tela([60, 40, 28])), px * (m.a / 2 - 1.5), 0.75, pz * (m.f / 2 - 1.5), g);
        } else if (m.tipo === 'mesa') {
            const mad = mats(repetir(madera, m.a / 4, m.f / 4));
            bloque(m.a, 1.2, m.f, mad, 0, m.h + 0.6, 0, g);
            for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bloque(1.5, m.h, 1.5, mad, px * (m.a / 2 - 1), m.h / 2, pz * (m.f / 2 - 1), g);
            // un florero y un libro encima
            bloque(2, 4, 2, mats(tela([210, 230, 236])), 3, m.h + 3.2, -2, g);
            bloque(5, 1, 3.5, mats(tela([170, 52, 46])), -4, m.h + 1.7, 3, g);
        } else if (m.tipo === 'alfombra') {
            const fondo = m.color ? c : [176, 48, 52], franja = m.color ? ajustar(c, 0.75) : [150, 36, 44];
            const alf = tx(16, 16, (x, y, r) => (x < 1 || y < 1 || x > 14 || y > 14) ? [222, 184, 84] : ((x + y) % 6 < 2 ? franja : ajustar(fondo, 0.92 + r() * 0.12)));
            bloque(m.a, Math.min(m.h, 0.04), m.f, mats(repetir(alf, m.a / 12, m.f / 12)), 0, Math.min(m.h, 0.04) / 2, 0, g); // bajo la pista
        } else if (m.tipo === 'ovillo') {
            const lana = mats(tx(8, 8, (x, y, r) => (x + y * 2) % 5 === 0 ? ajustar(c, 0.7) : ajustar(c, 0.92 + r() * 0.14)));
            const rad = m.a / 2;
            for (let k = -3; k <= 3; k++) { const yy = rad + k * rad / 3.5, ancho = Math.sqrt(Math.max(0, 1 - (k / 3.5) ** 2)) * m.a; bloque(ancho, rad / 3.5 + 0.05, ancho, lana, 0, yy, 0, g); }
            const hilo = bloque(0.4, 0.3, 14, lana, 3, 0.15, 9, g); hilo.rotation.y = 0.6;
        } else if (m.tipo === 'lampara') {
            const metal = mats(tela([60, 56, 52], 0.05)), pantalla = mats(tela([246, 222, 160], 0.04));
            bloque(5, 0.8, 5, metal, 0, 0.4, 0, g); bloque(0.8, m.h - 6, 0.8, metal, 0, (m.h - 6) / 2, 0, g);
            bloque(8, 7, 8, pantalla, 0, m.h - 3, 0, g);
        } else if (m.tipo === 'caja') {
            const carton = tx(8, 8, (x, y, r) => y === 0 || x === 0 ? [156, 112, 64] : ajustar([196, 150, 96], 0.92 + r() * 0.12));
            bloque(m.a, m.h, m.f, mats(repetir(carton, m.a / 4, m.h / 4)), 0, m.h / 2, 0, g);
            bloque(m.a * 0.12, 0.1, m.f, mats(tela([222, 212, 180], 0.02)), 0, m.h + 0.05, 0, g); // cinta
        } else if (m.tipo === 'pecera') {
            const vidrio = new THREE.MeshBasicMaterial({ color: '#9fd6ea', transparent: true, opacity: 0.45, depthWrite: false });
            bloque(m.a, m.h, m.f, vidrio, 0, m.h / 2, 0, g);
            bloque(m.a - 0.6, m.h * 0.7, m.f - 0.6, new THREE.MeshBasicMaterial({ color: '#3a8ec8', transparent: true, opacity: 0.4, depthWrite: false }), 0, m.h * 0.35, 0, g);
            const pez = bloque(1.4, 0.8, 0.5, mats(tela([240, 140, 40])), 0, m.h * 0.45, 0, g); pez.name = 'pez';
        } else if (m.tipo === 'cojin') {
            bloque(m.a, m.h, m.f, mats(tela(c, 0.08)), 0, m.h / 2, 0, g);
            bloque(1.2, m.h + 0.2, 1.2, mats(tela(ajustar(c, 0.7))), 0, m.h / 2, 0, g);
        } else if (m.tipo === 'raton') {
            const gris = mats(tela([150, 150, 156]));
            bloque(m.a, m.h, m.f, gris, 0, m.h / 2, 0, g);
            for (const l of [-1, 1]) bloque(0.8, 0.8, 0.2, mats(tela([236, 160, 170])), l * 0.6, m.h + 0.3, m.f / 2 - 0.4, g);
            const cola = bloque(0.15, 0.15, 3, gris, 0, 0.3, -m.f / 2 - 1.4, g); cola.rotation.y = 0.4;
        } else if (m.tipo === 'encimera') {
            // Muebles de cocina con puertas, cubierta de piedra, lavaplatos con su llave y el muro de azulejos detrás
            const puerta = tx(8, 16, (x, y, r) => (x === 0 || y === 0 || y === 15) ? [150, 104, 64] : (x === 6 && y > 5 && y < 10) ? [210, 210, 214] : ajustar([196, 150, 102], 0.94 + r() * 0.08));
            bloque(m.a, m.h - 1, m.f - 1, mats(repetir(puerta, m.a / 6, 1)), 0, (m.h - 1) / 2, 0.5, g);
            bloque(m.a, 0.6, m.f - 2, mats(tela([40, 40, 46], 0.04)), 0, 0.3, 1, g);                        // zócalo oscuro
            const piedra = mats(repetir(tx(8, 8, (x, y, r) => (r() < 0.1 ? [210, 206, 200] : ajustar([92, 92, 100], 0.9 + r() * 0.14))), m.a / 6, m.f / 6));
            bloque(m.a + 1, 1, m.f, piedra, 0, m.h - 0.5, 0, g);
            bloque(10, 0.2, 8, mats(tela([170, 180, 188], 0.05)), -1.5, m.h + 0.02, m.f / 2 - 7, g);             // lavaplatos (bajo el salto)
            bloque(10.5, 0.15, 8.5, mats(tela([60, 64, 70], 0.05)), -1.5, m.h - 0.05, m.f / 2 - 7, g);
            const llave = mats(tela([200, 204, 210], 0.03));
            bloque(1, 5, 1, llave, -1.5, m.h + 2.5, -m.f / 2 + 1.5, g); bloque(1, 1, 4, llave, -1.5, m.h + 5, -m.f / 2 + 3, g);
            for (const [x, w, cc] of [[-m.a / 2 + 6, 5, [230, 230, 236]], [m.a / 2 - 8, 7, [214, 74, 60]]]) bloque(w, 5, 4, mats(tela(cc, 0.05)), x, m.h + 2.5, -m.f / 2 + 2.5, g); // tostadora y frasco al fondo
        } else if (m.tipo === 'refri') {
            const blanco = mats(tela([238, 240, 242], 0.03)), metal = mats(tela([160, 164, 170], 0.04));
            bloque(m.a, m.h, m.f, blanco, 0, m.h / 2, 0, g);
            bloque(m.a + 0.1, 0.4, m.f + 0.1, mats(tela([170, 176, 182], 0.03)), 0, m.h * 0.66, 0, g);       // separa el congelador
            for (const y of [m.h * 0.33, m.h * 0.83]) bloque(1, m.h * 0.18, 1, metal, m.a / 2 - 3, y, m.f / 2 + 0.5, g);
            for (const [x, y, cc] of [[-4, m.h * 0.5, [228, 72, 72]], [2, m.h * 0.55, [72, 140, 228]], [-1, m.h * 0.42, [244, 200, 60]]]) bloque(2, 2, 0.3, mats(tela(cc, 0.05)), x, y, m.f / 2 + 0.15, g); // imanes
        } else if (m.tipo === 'silla' || m.tipo === 'banca') {
            // Patas, asiento de tablas y respaldo (la pista pasa por debajo, entre las patas)
            const mad = mats(repetir(tx(8, 8, (x, y, r) => (y % 4 === 3 ? ajustar(c, 0.7) : ajustar(c, 0.92 + r() * 0.12))), m.a / 4, m.f / 4));
            bloque(m.a, 1.2, m.f, mad, 0, m.h + 0.6, 0, g);
            for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bloque(1.4, m.h, 1.4, mad, px * (m.a / 2 - 1), m.h / 2, pz * (m.f / 2 - 1), g);
            const alto = m.tipo === 'silla' ? 13 : 8;
            for (const px of [-1, 1]) bloque(1.4, alto, 1.4, mad, px * (m.a / 2 - 1), m.h + 1.2 + alto / 2, -m.f / 2 + 0.7, g);
            for (const y of m.tipo === 'silla' ? [alto - 2, alto - 6] : [alto - 2, alto - 5]) bloque(m.a - 1, 2, 0.8, mad, 0, m.h + 1.2 + y, -m.f / 2 + 0.7, g);
        } else if (m.tipo === 'olla') {
            const metal = mats(tx(8, 8, (x, y, r) => ajustar([150, 154, 162], x === 2 ? 1.2 : 0.9 + r() * 0.1)));
            bloque(m.a, m.h, m.f, metal, 0, m.h / 2, 0, g);
            bloque(m.a + 0.6, 0.8, m.f + 0.6, mats(tela([120, 124, 132], 0.04)), 0, m.h + 0.4, 0, g);     // tapa
            bloque(2, 1.2, 2, mats(tela([40, 40, 44], 0.05)), 0, m.h + 1.4, 0, g);
            for (const l of [-1, 1]) bloque(2, 1, 2.6, mats(tela([40, 40, 44], 0.05)), l * (m.a / 2 + 1), m.h * 0.75, 0, g); // asas
        } else if (m.tipo === 'taza') {
            capas(g, m, mats(tela(c, 0.06)), 4, 0, m.h, () => 1);
            bloque(m.a * 0.8, 0.2, m.f * 0.8, mats(tela([90, 56, 32], 0.05)), 0, m.h - 0.6, 0, g);           // café
            const asa = mats(tela(c, 0.06));
            bloque(1, m.h * 0.6, 1, asa, m.a / 2 + 1.6, m.h * 0.5, 0, g);
            for (const y of [m.h * 0.22, m.h * 0.78]) bloque(2, 1, 1, asa, m.a / 2 + 0.8, y, 0, g);
        } else if (m.tipo === 'piscina') {
            // Piscina inflable: anillo de rayas azul y blanco con agua (bajo el salto)
            const raya = mats(tx(8, 8, (x, y) => (y < 4 ? [70, 150, 230] : [244, 244, 248])));
            const w = 1.6;
            for (const [a, f, x, z] of [[m.a, w, 0, -m.f / 2 + w / 2], [m.a, w, 0, m.f / 2 - w / 2], [w, m.f, -m.a / 2 + w / 2, 0], [w, m.f, m.a / 2 - w / 2, 0]]) bloque(a, m.h, f, raya, x, m.h / 2, z, g);
            const agua = new THREE.Mesh(new THREE.PlaneGeometry(m.a - 2 * w, m.f - 2 * w), new THREE.MeshBasicMaterial({ color: '#4ab4e8', transparent: true, opacity: 0.8 }));
            agua.rotation.x = -Math.PI / 2; agua.position.y = m.h * 0.7; agua.name = 'agua'; g.add(agua); recursos.push(agua.geometry);
            const pato = bloque(1.6, 1.4, 2, mats(tela([244, 214, 60], 0.05)), 1, m.h * 0.7 + 0.7, 1, g); pato.name = 'pato';
        } else if (m.tipo === 'arbol') {
            const corteza = mats(repetir(tx(8, 8, (x, y, r) => (x % 3 === 0 ? [80, 56, 36] : ajustar([110, 78, 48], 0.9 + r() * 0.15))), 1, m.h / 8));
            const tronco = m.a * 0.28;
            bloque(tronco, m.h * 0.6, tronco, corteza, 0, m.h * 0.3, 0, g);
            const hoja = mats(tx(8, 8, (x, y, r) => ajustar(r() < 0.2 ? [56, 120, 40] : [76, 150, 52], 0.88 + r() * 0.2)));
            for (const [x, y, z, s] of [[0, 0.74, 0, 1.2], [0.3, 0.62, 0.2, 0.8], [-0.3, 0.64, -0.22, 0.85], [0.08, 0.9, -0.08, 0.8], [-0.18, 0.58, 0.3, 0.7]]) bloque(m.a * s, m.h * 0.24, m.f * s, hoja, x * m.a, m.h * y, z * m.f, g);
        } else if (m.tipo === 'macetero') {
            const greda = mats(tx(8, 8, (x, y, r) => (y === 0 ? [150, 70, 44] : ajustar([186, 96, 60], 0.92 + r() * 0.12))));
            bloque(m.a, m.h * 0.4, m.f, greda, 0, m.h * 0.2, 0, g);
            bloque(m.a + 0.8, 1, m.f + 0.8, greda, 0, m.h * 0.4 - 0.5, 0, g);
            const tallo = mats(tela([70, 140, 52], 0.1));
            for (const [x, z, k] of [[0, 0, 1], [-0.25, 0.2, 0.8], [0.25, -0.2, 0.85]]) {
                bloque(0.5, m.h * 0.55 * k, 0.5, tallo, x * m.a, m.h * 0.4 + m.h * 0.27 * k, z * m.f, g);
                bloque(m.a * 0.32, m.a * 0.32, m.a * 0.32, mats(tela(c, 0.08)), x * m.a, m.h * 0.4 + m.h * 0.55 * k, z * m.f, g); // flor
            }
        } else if (m.tipo === 'pelota') {
            const gajo = mats(tx(8, 8, (x, y) => ((x >> 2) % 2 ? [244, 244, 244] : c)));
            capas(g, m, gajo, 7, 0, m.h, esfera);
        } else if (m.tipo === 'tanque') {
            // Estanque de agua en sus cuatro patas (la pista pasa por debajo)
            const fierro = mats(tela([90, 92, 100], 0.06));
            for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bloque(1.2, m.h, 1.2, fierro, px * (m.a / 2 - 1), m.h / 2, pz * (m.f / 2 - 1), g);
            bloque(m.a, 1, m.f, fierro, 0, m.h + 0.5, 0, g);
            capas(g, { ...m, a: m.a * 0.9, f: m.f * 0.9 }, mats(tx(8, 8, (x, y, r) => (y === 0 ? [200, 206, 214] : ajustar([150, 176, 196], 0.92 + r() * 0.1)))), 5, m.h + 1, 12, () => 1);
            bloque(m.a * 0.4, 1.2, m.f * 0.4, fierro, 0, m.h + 13.6, 0, g);
        } else if (m.tipo === 'chimenea') {
            const lad = tx(16, 16, (x, y, r) => (y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) ? [200, 190, 176] : ajustar([168, 72, 52], 0.9 + r() * 0.15));
            bloque(m.a, m.h, m.f, mats(repetir(lad, m.a / 4, m.h / 4)), 0, m.h / 2, 0, g);
            bloque(m.a + 1.2, 1, m.f + 1.2, mats(tela([120, 116, 112], 0.05)), 0, m.h + 0.5, 0, g);
            bloque(m.a * 0.5, 0.4, m.f * 0.5, mats(tela([24, 22, 22], 0.02)), 0, m.h + 1.05, 0, g);
        } else if (m.tipo === 'antena') {
            const fierro = mats(tela([150, 150, 158], 0.05));
            bloque(0.6, m.h, 0.6, fierro, 0, m.h / 2, 0, g);
            bloque(m.a, 1, m.f, mats(tela([90, 90, 96], 0.05)), 0, 0.5, 0, g);
            for (const [y, w] of [[0.7, 10], [0.82, 8], [0.94, 6]]) bloque(w, 0.4, 0.4, fierro, 0, m.h * y, 0, g);
            const luz = bloque(0.9, 0.9, 0.9, new THREE.MeshBasicMaterial({ color: '#ff3a2a' }), 0, m.h + 0.5, 0, g); luz.name = 'luz';
        } else if (m.tipo === 'panel') {
            // Panel solar plano en patas bajas (la pista sube sola encima)
            const celda = tx(8, 8, (x, y, r) => (x % 4 === 0 || y % 4 === 0) ? [190, 196, 210] : ajustar([40, 64, 130], 0.9 + r() * 0.15));
            bloque(m.a, 0.5, m.f, mats(repetir(celda, m.a / 4, m.f / 4)), 0, m.h - 0.25, 0, g);
            for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bloque(0.8, m.h - 0.5, 0.8, mats(tela([120, 120, 128], 0.05)), px * (m.a / 2 - 1), (m.h - 0.5) / 2, pz * (m.f / 2 - 1), g);
        } else if (m.tipo === 'claraboya') {
            const marco = mats(tela([200, 200, 206], 0.04));
            bloque(m.a, m.h - 0.3, m.f, marco, 0, (m.h - 0.3) / 2, 0, g);
            bloque(m.a - 1.2, 0.3, m.f - 1.2, new THREE.MeshBasicMaterial({ color: '#a8dcf0', transparent: true, opacity: 0.7 }), 0, m.h - 0.15, 0, g);
        }
    }

    // ---------- Pista ----------
    const N = pista.N, mm = pista.m;
    const lat = (q, l) => [q.x + Math.cos(q.yaw) * l, q.z - Math.sin(q.yaw) * l];
    const camino = tx(16, 16, (x, y, r) => (x === 0 || x === 15) ? [70, 66, 70] : ajustar([92, 88, 96], 0.9 + r() * 0.14));
    camino.wrapS = camino.wrapT = THREE.RepeatWrapping;
    const borde = tx(4, 16, (x, y) => (Math.floor(y / 8) % 2 ? [236, 236, 236] : [210, 40, 40]));
    borde.wrapS = borde.wrapT = THREE.RepeatWrapping;
    const baranda = tx(8, 8, (x, y, r) => (y < 2) ? [250, 214, 70] : ajustar([226, 226, 222], 0.94 + r() * 0.06));
    baranda.wrapS = baranda.wrapT = THREE.RepeatWrapping;
    // Cinta: para cada muestra con piso, un cuadro entre ella y la siguiente; columnas = cortes laterales [desde, hasta]
    function cinta(cortes, alto, textura, vScale, lado = 'arriba', sombra = 1) {
        const pos = [], uv = [], idx = [];
        for (let i = 0; i < N; i++) {
            const a = mm[i], b = mm[(i + 1) % N];
            if (!a.piso || !b.piso) continue;
            const [la, lb] = cortes(a), [la2, lb2] = cortes(b);
            const base = pos.length / 3;
            const va = a.s / vScale, vb = (a.s + pista.paso) / vScale;
            if (lado === 'arriba') {
                const [x1, z1] = lat(a, la), [x2, z2] = lat(a, lb), [x3, z3] = lat(b, la2), [x4, z4] = lat(b, lb2);
                pos.push(x1, a.y + alto, z1, x2, a.y + alto, z2, x3, b.y + alto, z3, x4, b.y + alto, z4);
                uv.push(0, va, 1, va, 0, vb, 1, vb);
                idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
            } else {
                // pared vertical en el corte `la` (de alto[0] a alto[1] sobre la pista)
                const [x1, z1] = lat(a, la), [x3, z3] = lat(b, la2);
                const [y0, y1] = alto;
                pos.push(x1, a.y + y0, z1, x1, a.y + y1, z1, x3, b.y + y0, z3, x3, b.y + y1, z3);
                uv.push(va, 0, va, 1, vb, 0, vb, 1);
                idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
            }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        const mat = tinte.mat(textura, sombra, { side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh); recursos.push(geo);
        return mesh;
    }
    cinta(q => [-q.ancho / 2 + 0.6, q.ancho / 2 - 0.6], 0.07, camino, 4, 'arriba', 1);
    cinta(q => [q.ancho / 2 - 0.6, q.ancho / 2], 0.075, borde, 2, 'arriba', 1);
    cinta(q => [-q.ancho / 2, -q.ancho / 2 + 0.6], 0.075, borde, 2, 'arriba', 1);
    for (const l of [1, -1]) {
        cinta(q => [l * q.ancho / 2, 0], [0, 0.9], baranda, 2, 'pared', 0.8);
        cinta(q => [l * q.ancho / 2, 0], [-0.6, 0.07], tx(4, 4, () => [80, 74, 78]), 2, 'pared', 0.6); // canto de la pista
    }
    // Pilares de libros bajo los tramos altos (desde el piso, el mueble de abajo o la vuelta de la pista que pasa por debajo)
    const lomos = (Array.isArray(E.pilares) && E.pilares.length ? E.pilares : ['#aa342e', '#3460a0', '#468246', '#d2aa3c', '#78468c']).map(hex);
    const encima = (R.muebles || []).filter(m => M.MUEBLES_ENCIMA.includes(m.tipo)); // (la pista va sobre ellos: sin pilares)
    const debajo = (q, i) => {
        let b = q.apoyo || 0;
        const lejos = Math.round(20 / pista.paso); // (las muestras vecinas de la misma cuesta no cuentan)
        mm.forEach((o, j) => {
            const d = Math.abs(i - j);
            if (Math.min(d, N - d) > lejos && o.piso && o.y < q.y - 1 && o.y > b && Math.hypot(o.x - q.x, o.z - q.z) < o.ancho / 2 + 1) b = o.y;
        });
        return b;
    };
    for (let i = 0; i < N; i += 14) {
        const q = mm[i];
        if (!q.piso || q.y < 1.2) continue;
        if (encima.length && M.techoMuebles(encima, q.x, q.z) > 0) continue;
        let y = debajo(q, i), k = 0;
        if (q.y - y < 1.2) continue;
        while (y < q.y - 0.1) {
            const h = Math.min(q.y - y, 0.9 + ((i + k) % 3) * 0.3);
            const lib = bloque(q.ancho * 0.55, h, 3.2, mats(tela(lomos[(i + k) % lomos.length], 0.06)), q.x, y + h / 2, q.z);
            lib.rotation.y = q.yaw + ((k % 2) - 0.5) * 0.12;
            y += h; k++;
        }
    }
    // Placas de turbo (flechas que corren)
    const flecha = tx(16, 16, (x, y) => { const d = Math.abs(x - 7.5); return (y + d * 1) % 8 < 3 ? [255, 236, 80] : [236, 120, 30]; });
    flecha.wrapS = flecha.wrapT = THREE.RepeatWrapping;
    const placas = [];
    {
        let i = 0;
        while (i < N) {
            if (!mm[i].turbo) { i++; continue; }
            const ini = i; while (i < N && mm[i].turbo) i++;
            const q0 = mm[ini], lado = q0.turbo.lado, l = -lado * q0.ancho * 0.3;
            const largo = (i - ini) * pista.paso;
            const qm = mm[Math.floor((ini + i) / 2)], [px, pz] = lat(qm, l);
            const t = flecha.clone(); t.needsUpdate = true; t.repeat.set(1, largo / 2);
            const placa = new THREE.Mesh(new THREE.PlaneGeometry(2.6, largo), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.95 }));
            placa.rotation.order = 'YXZ'; placa.rotation.y = qm.yaw; placa.rotation.x = -Math.PI / 2;
            placa.position.set(px, qm.y + 0.1, pz);
            scene.add(placa); recursos.push(placa.geometry);
            placas.push(t);
        }
    }
    // Línea de salida y arco con el nombre
    {
        const q = mm[0];
        const cuadros = tx(16, 4, (x, y) => ((x + y) % 2 ? [20, 20, 20] : [244, 244, 244]));
        const linea = new THREE.Mesh(new THREE.PlaneGeometry(q.ancho, 1.4), new THREE.MeshBasicMaterial({ map: cuadros }));
        linea.rotation.order = 'YXZ'; linea.rotation.y = q.yaw; linea.rotation.x = -Math.PI / 2;
        linea.position.set(q.x, q.y + 0.11, q.z); scene.add(linea); recursos.push(linea.geometry);
        const arco = new THREE.Group(); arco.position.set(q.x, q.y, q.z); arco.rotation.y = q.yaw; scene.add(arco);
        const poste = mats(tela([60, 60, 66], 0.05));
        for (const l of [-1, 1]) bloque(1, 9, 1, poste, l * (q.ancho / 2 + 0.9), 4.5, 0, arco);
        const c = document.createElement('canvas'); c.width = 512; c.height = 64;
        const k = c.getContext('2d');
        k.fillStyle = '#1a1a1e'; k.fillRect(0, 0, 512, 64);
        k.strokeStyle = '#f2c94c'; k.lineWidth = 6; k.strokeRect(3, 3, 506, 58);
        k.font = '34px PixelCraft'; k.textAlign = 'center'; k.textBaseline = 'middle';
        k.fillStyle = '#3f3f15'; k.fillText((R.nombre[idioma] || R.nombre.es).toUpperCase(), 259, 35);
        k.fillStyle = '#ffff55'; k.fillText((R.nombre[idioma] || R.nombre.es).toUpperCase(), 256, 32);
        const ct = new THREE.CanvasTexture(c); ct.magFilter = THREE.NearestFilter; ct.colorSpace = THREE.SRGBColorSpace;
        const cartel = bloque(q.ancho + 2.8, 1.6, 0.5, mats(tela([26, 26, 30], 0.02), { 4: ct, 5: ct }), 0, 9.4, 0, arco);
        void cartel;
    }
    // Túneles: un techo bajo extra (la mesa ya tapa; se oscurece un poco el piso)
    // (la mesa de `muebles` es el túnel; aquí solo una sombra en la pista)
    for (let i = 0; i < N; i += 2) if (mm[i].tunel) {
        const q = mm[i];
        const sombra = new THREE.Mesh(new THREE.PlaneGeometry(q.ancho, pista.paso * 2.05), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }));
        sombra.rotation.order = 'YXZ'; sombra.rotation.y = q.yaw; sombra.rotation.x = -Math.PI / 2; sombra.position.set(q.x, q.y + 0.12, q.z);
        scene.add(sombra); recursos.push(sombra.geometry);
    }

    // ---------- Gatas ----------
    function pelajeTex(p, cara = false) {
        const B = hex(p.base), Mn = hex(p.mancha || p.base), P = hex(p.panza || p.base), O = hex(p.ojos || '#bac846');
        return tx(16, 16, (x, y, r) => {
            if (cara) {
                const ojo = ox => y >= 6 && y <= 8 && x >= ox && x <= ox + 2;
                if (ojo(3) || ojo(10)) return y === 7 && (x === 4 || x === 11) ? [14, 14, 14] : O;
                if (x >= 7 && x <= 8 && y >= 9 && y <= 10) return [212, 140, 150];
                if (p.patron === 'siames' && Math.hypot(x - 7.5, y - 9) < 4.5) return ajustar(Mn, 0.9 + r() * 0.15);
            }
            if (p.patron === 'atigrado' && (x * 2 + y) % 6 < 2) return ajustar(Mn, 0.9 + r() * 0.15);
            if (p.patron === 'manchas' && Math.sin(x * 1.7 + 3) * Math.cos(y * 1.3) > 0.55) return ajustar(Mn, 0.9 + r() * 0.15);
            return ajustar(B, 0.88 + r() * 0.2);
        });
    }
    function armarGata(def) {
        const mundo = gatasMundo && gatasMundo.find(g => g.clave === def.clave);
        if (mundo) {
            const c = clonarConPartes(mundo.g, { tronco: mundo.tronco, cabeza: mundo.cabeza, cola: mundo.cola, patas: mundo.patas, cuello: mundo.cuello });
            if (c.cuello) c.cuello.visible = !!(mundo.cuello && mundo.cuello.visible);
            c.g.visible = true; c.g.position.set(0, 0, 0); c.g.rotation.set(0, 0, 0);
            return { ...c, e: mundo.e };
        }
        const p = def.pelaje || { base: '#888888' }, k = def.escala || 1;
        const e = { largo: 1.05 * k, ancho: 0.66 * k, alto: 0.6 * k, patas: 0.48 * k, cabeza: 0.56 * k };
        const base = pelajeTex(p), panza = pelajeTex({ ...p, base: p.panza || p.base, patron: 'liso' }), cara = pelajeTex(p, true);
        const oscuro = p.patron === 'siames' ? pelajeTex({ ...p, base: p.mancha, patron: 'liso' }) : base;
        const g = new THREE.Group(), tronco = new THREE.Group();
        tronco.position.set(0, e.patas, -e.largo / 2); g.add(tronco);
        const cuerpo = caja(e.ancho, e.alto, e.largo, mats(base, { 3: panza, 4: panza })); cuerpo.position.set(0, e.alto / 2, e.largo / 2); tronco.add(cuerpo);
        const cabeza = new THREE.Group(); cabeza.position.set(0, e.alto * 0.95, e.largo + 0.05);
        const cb = caja(e.cabeza, e.cabeza * 0.85, e.cabeza * 0.85, mats(base, { 4: cara })); cb.position.set(0, 0.05, e.cabeza * 0.28); cabeza.add(cb);
        for (const l of [-1, 1]) { const o = caja(e.cabeza * 0.24, e.cabeza * 0.3, e.cabeza * 0.1, mats(oscuro)); o.position.set(l * e.cabeza * 0.28, e.cabeza * 0.55, e.cabeza * 0.12); cabeza.add(o); }
        tronco.add(cabeza);
        const lw = e.ancho * 0.3, patas = [];
        for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
            const pv = new THREE.Group(); pv.position.set(sx * (e.ancho / 2 - lw / 2), 0, e.largo / 2 + sz * (e.largo / 2 - lw / 2 - 0.02));
            const pt = caja(lw, e.patas, lw, mats(oscuro)); pt.position.y = -e.patas / 2; pv.add(pt); tronco.add(pv); patas.push(pv);
        }
        const cola = new THREE.Group(); cola.position.set(0, e.alto * 0.8, 0);
        const cm = caja(0.11 * k, 0.11 * k, 0.75 * k, mats(oscuro)); cm.position.set(0, 0, -0.34 * k); cola.add(cm); tronco.add(cola);
        return { g, tronco, cabeza, cola, patas, e };
    }
    // Cada gata con un pañuelo del color de su pelaje (o del suyo) para reconocerla de lejos
    const COLOR_PANUELO = { mila: '#e8742a', gala: '#e0a028', tigre: '#2a8ad8', pelusa: '#e04a8a', canela: '#4ab86a', sombra: '#8a5ad8' };
    const gatas = R.gatas.map(def => {
        const m = armarGata(def);
        const pc = hex(def.panuelo || COLOR_PANUELO[def.clave] || '#d84a4a');
        const pan = caja(m.e.ancho + 0.08, 0.16, 0.22, mats(tela(pc, 0.06))); pan.position.set(0, m.e.alto * 0.82, m.e.largo - 0.08);
        m.tronco.add(pan);
        scene.add(m.g);
        return { ...m, def, fase: Math.random() * 6, color: `rgb(${pc.join(',')})` };
    });

    // ---------- Lona en su caja, con la bandera ----------
    let lonaM = null;
    {
        const q = mm[0], l = q.ancho / 2 + 4.5;
        const [x, z] = lat(q, l);
        const carton = tx(8, 8, (x2, y, r) => y === 0 || x2 === 0 ? [156, 112, 64] : ajustar([196, 150, 96], 0.92 + r() * 0.12));
        bloque(4, 3, 4, mats(carton), x, 1.5, z);
        if (lona && lona.p && lona.p.g) {
            lonaM = clonarConPartes(lona.p.g, { brazoD: lona.p.brazoD, brazoI: lona.p.brazoI, cuello: lona.p.cuello, piernaD: lona.p.piernaD, piernaI: lona.p.piernaI, cuerpo: lona.p.cuerpo });
            lonaM.g.position.set(x, 3, z); lonaM.g.rotation.set(0, q.yaw - Math.PI / 2, 0); lonaM.g.visible = true;
            for (const h of [lonaM.piernaD, lonaM.piernaI, lonaM.brazoI]) if (h) h.rotation.set(0, 0, 0);
            if (lonaM.cuerpo) lonaM.cuerpo.position.y = 0;
            scene.add(lonaM.g);
            // bandera a cuadros en la mano derecha
            const ban = new THREE.Group();
            const palo = caja(0.06, 1.4, 0.06, mats(tela([80, 60, 40]))); palo.position.y = -1.2; ban.add(palo);
            const tela2 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ map: tx(6, 4, (a, b) => ((a + b) % 2 ? [20, 20, 20] : [244, 244, 244])), side: THREE.DoubleSide }));
            tela2.position.set(0, -1.65, 0.45); tela2.rotation.y = Math.PI / 2; ban.add(tela2);
            ban.position.set(0, -0.6, 0); if (lonaM.brazoD) lonaM.brazoD.add(ban);
            lonaM.bandera = tela2;
        }
    }

    // ---------- Podio ----------
    const podio = new THREE.Group(); podio.visible = false; scene.add(podio);
    const escalones = [];
    {
        // El podio es un mueble más (`tipo: 'podio'`, se arrastra en el editor); sin él, al costado de la salida
        const mp = (R.muebles || []).find(m => m.tipo === 'podio');
        if (mp) { podio.position.set(mp.x, 0, mp.z); podio.rotation.y = (mp.g || 0) * Math.PI / 180; }
        else { const q = M.puntoPista(pista, pista.largo * 0.012, -(mm[0].ancho / 2 + 9)); podio.position.set(q.x, 0, q.z); podio.rotation.y = mm[0].yaw + Math.PI / 2; }
        const colores = [[242, 196, 60], [200, 204, 212], [196, 128, 70]];
        [[0, 3], [-3.2, 2], [3.2, 1.2]].forEach(([px, h], i) => {
            bloque(3, h, 3, mats(tela(colores[i], 0.06)), px, h / 2, 0, podio);
            escalones.push({ x: px, h });
        });
    }

    // ---------- Partículas ----------
    const MAXP = 500;
    const geoP = new THREE.BoxGeometry(1, 1, 1);
    const matP = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false });
    const inst = new THREE.InstancedMesh(geoP, matP, MAXP);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 3), 3);
    inst.frustumCulled = false; scene.add(inst);
    const parts = [];
    const col = new THREE.Color(), mtx = new THREE.Matrix4(), qt = new THREE.Quaternion(), vs = new THREE.Vector3(), vp = new THREE.Vector3();
    function emitir(x, y, z, vx, vy, vz, color, vida, tam, grav = 0) {
        if (parts.length >= MAXP) parts.shift();
        parts.push({ x, y, z, vx, vy, vz, c: color, vida, t: 0, tam, grav });
    }
    function actualizarParticulas(dt) {
        let n = 0;
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.t += dt;
            if (p.t >= p.vida) { parts.splice(i, 1); continue; }
            p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        }
        for (const p of parts) {
            const k = 1 - p.t / p.vida, s = p.tam * (0.4 + 0.6 * k);
            mtx.compose(vp.set(p.x, p.y, p.z), qt.identity(), vs.set(s, s, s));
            inst.setMatrixAt(n, mtx); inst.setColorAt(n, col.set(p.c)); n++;
        }
        inst.count = n;
        inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    }

    // ---------- Objetos: cajas «?», lo tirado (ovillo, caja de cartón, pescado) y la aspiradora de Lona ----------
    const OB = R.objetos || {};
    const colOb = (k, d) => hex((OB[k] && OB[k].color) || d);
    const signo = tx(8, 8, (x, y) => {
        const q = ['..aaaa..', '.aa..aa.', '......aa', '....aaa.', '...aa...', '...aa...', '........', '...aa...'][y][x];
        return q === 'a' ? [255, 255, 255] : (x + y) % 2 ? [236, 168, 40] : [246, 196, 64];
    });
    const matCaja = new THREE.MeshBasicMaterial({ map: signo, transparent: true, opacity: 0.88 });
    const cajasV = M.cajasDe(R, pista).map(c => {
        const p = M.puntoPista(pista, c.s, c.lat);
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), matCaja);
        m.position.set(p.x, p.y + 1, p.z); scene.add(m); recursos.push(m.geometry);
        return { m, y: p.y + 1, fase: Math.random() * 6 };
    });
    // Modelos de lo que se tira (un grupo por tipo; se clonan)
    const modelos = {};
    {
        const lana = colOb('ovillo', '#d8455a'), ov = new THREE.Group();
        const matLana = mats(tx(8, 8, (x, y, r) => (x + y * 2) % 5 === 0 ? ajustar(lana, 0.7) : ajustar(lana, 0.92 + r() * 0.14)));
        for (let k = -2; k <= 2; k++) { const w = Math.sqrt(1 - (k / 2.6) ** 2) * 1.1; bloque(w, 0.24, w, matLana, 0, 0.55 + k * 0.22, 0, ov); }
        modelos.ovillo = ov;
        const cc = colOb('caja', '#c49660'), cj = new THREE.Group();
        bloque(1.3, 1.1, 1.3, mats(tx(8, 8, (x, y, r) => y === 0 || x === 0 ? ajustar(cc, 0.8) : ajustar(cc, 0.92 + r() * 0.12))), 0, 0.55, 0, cj);
        bloque(0.2, 0.04, 1.32, mats(tela([222, 212, 180], 0.02)), 0, 1.12, 0, cj);
        for (const l of [-1, 1]) { const solapa = bloque(0.6, 0.06, 1.3, mats(tela(ajustar(cc, 0.9), 0.05)), l * 0.5, 1.2, 0, cj); solapa.rotation.z = l * 0.6; }
        modelos.caja = cj;
        const pc = colOb('pescado', '#7ab0d8'), pz = new THREE.Group(), cuerpoP = mats(tela(pc, 0.12));
        bloque(0.4, 0.5, 1.0, cuerpoP, 0, 0.35, 0, pz);
        bloque(0.3, 0.36, 0.3, mats(tela(ajustar(pc, 0.75), 0.05)), 0, 0.35, -0.6, pz);
        bloque(0.2, 0.6, 0.2, mats(tela(ajustar(pc, 0.75), 0.05)), 0, 0.35, -0.82, pz);
        for (const l of [-1, 1]) bloque(0.05, 0.1, 0.1, mats(tela([20, 20, 20], 0)), l * 0.21, 0.45, 0.32, pz);
        modelos.pescado = pz;
        const ac = colOb('aspiradora', '#c8384a'), asp = new THREE.Group(), gris = mats(tela([70, 70, 76], 0.05));
        bloque(1.6, 1.2, 2.2, mats(tela(ac, 0.08)), 0, 0.8, 0, asp);
        bloque(1.0, 0.3, 1.2, mats(tela(ajustar(ac, 1.25), 0.04)), 0, 1.5, -0.2, asp);
        for (const [x, z] of [[-0.7, 0.8], [0.7, 0.8], [-0.7, -0.8], [0.7, -0.8]]) bloque(0.3, 0.4, 0.4, gris, x, 0.2, z, asp);
        const tubo = bloque(0.3, 0.3, 2.6, gris, 0, 1.6, 1.8, asp); tubo.rotation.x = -0.5;
        bloque(1.4, 0.3, 0.5, gris, 0, 0.35, 2.9, asp); // la boquilla
        asp.visible = false; scene.add(asp);
        modelos.aspiradora = asp;
    }
    const hilo = `rgb(${colOb('ovillo', '#d8455a').join(',')})`; // la hebra que deja el ovillo
    const sueltosV = new Map(); // id → grupo
    let aspiradora = null;      // { s0, s1, t, dur }
    function lanzarAspiradora(s0, s1, dur = 1) { aspiradora = { s0, s1: s1 > s0 ? s1 : s0 + 30, t: 0, dur }; modelos.aspiradora.visible = true; }
    function dibujarObjetos(W, dt, t) {
        cajasV.forEach((c, i) => {
            const vc = W && W.cajas[i], visible = !vc || vc.hasta <= W.t;
            c.m.visible = visible;
            if (!visible) return;
            const pop = vc && W.t - vc.hasta < 0.3 ? lim((W.t - vc.hasta) / 0.3, 0.05, 1) : 1;
            c.m.scale.setScalar(pop);
            c.m.rotation.set(0.35, t * 1.6 + c.fase, 0.2);
            c.m.position.y = c.y + Math.sin(t * 2.4 + c.fase) * 0.15;
        });
        const vivos = new Set();
        for (const o of (W && W.sueltos) || []) {
            vivos.add(o.id);
            let v = sueltosV.get(o.id);
            if (!v) { v = modelos[o.tipo].clone(); scene.add(v); sueltosV.set(o.id, v); }
            const p = M.puntoPista(pista, o.s, o.lat);
            v.position.set(p.x, o.y + 0.07, p.z); v.rotation.order = 'YXZ'; v.rotation.y = p.yaw;
            if (o.tipo === 'ovillo') { v.children.forEach((b, k) => { b.rotation.y = t * 9 + k; }); v.position.y += Math.abs(Math.sin(t * 14)) * 0.15; if (Math.random() < dt * 20) emitir(p.x, o.y + 0.2, p.z, 0, 0.6, 0, hilo, 0.4, 0.12, 1); }
            else if (o.tipo === 'pescado') { v.rotation.z = Math.sin(t * 9 + o.id) * 0.5; v.position.y += Math.abs(Math.sin(t * 5 + o.id)) * 0.3; if (Math.random() < dt * 6) emitir(p.x, o.y + 1.2, p.z, 0, 1.4, 0, '#ffffff', 0.7, 0.14, 0); }
        }
        for (const [id, v] of sueltosV) if (!vivos.has(id)) { scene.remove(v); sueltosV.delete(id); }
        if (aspiradora) {
            aspiradora.t += dt;
            const u = aspiradora.t / aspiradora.dur, a = modelos.aspiradora;
            if (u >= 1) { a.visible = false; aspiradora = null; }
            else {
                const s = aspiradora.s0 + (aspiradora.s1 - aspiradora.s0) * u, p = M.puntoPista(pista, s, 0);
                a.position.set(p.x, p.y + 2.5 + Math.sin(u * Math.PI) * 3, p.z); a.rotation.set(0, p.yaw, Math.sin(t * 30) * 0.05);
                if (Math.random() < dt * 40) emitir(p.x + (Math.random() - 0.5) * 3, p.y + 0.5, p.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2, '#d8d0c4', 0.5, 0.2, 0);
            }
        }
    }

    // ---------- Dibujar el estado ----------
    // gs = gatas del modelo (mismo orden que R.gatas); t = segundos; W = objetos (nuevosObjetos), opcional
    function dibujar(gs, dt, t, W = null) {
        for (let i = 0; i < gs.length; i++) {
            const g = gs[i], v = gatas[i];
            if (!v) continue;
            const q = M.enPista(pista, g.s);
            v.g.position.set(g.x, g.y + 0.07, g.z); // sobre la cinta
            v.g.rotation.order = 'YXZ';
            v.g.rotation.y = g.yaw + (g.derrape ? g.derrape * 0.35 : 0);
            v.g.rotation.x = g.suelo ? -Math.atan(q.pend) : lim(-g.vy * 0.04, -0.5, 0.5);
            v.g.rotation.z = g.derrape ? -g.derrape * 0.12 : 0;
            if (g.cayendo > 0) { v.g.rotation.z += t * 12; }
            // Efectos de los objetos: golpeada da vueltas con estrellas; la hierba, remolino verde; el susto, gotas; comiendo, se agacha
            if (g.aturdida > 0) { v.g.rotation.y += g.aturdida * 9; if (Math.random() < dt * 10) emitir(g.x, g.y + 1.2, g.z, (Math.random() - 0.5) * 2, 0.6, (Math.random() - 0.5) * 2, '#ffff66', 0.5, 0.14, 0); }
            if (g.reves > 0 && Math.random() < dt * 14) { const a = t * 6; emitir(g.x + Math.cos(a) * 0.6, g.y + 1.3, g.z + Math.sin(a) * 0.6, 0, 0.3, 0, Math.random() < 0.5 ? '#5ac85a' : '#a8f07a', 0.6, 0.15, 0); }
            if (g.susto > 0 && Math.random() < dt * 8) emitir(g.x, g.y + 1.2, g.z, (Math.random() - 0.5) * 2, 2, (Math.random() - 0.5) * 2, '#bfe6ff', 0.4, 0.12, 6);
            if (g.come > 0) v.g.rotation.x += 0.35;
            // Galope: delanteras juntas y traseras juntas, a contratiempo; en el aire, estiradas
            const rap = Math.abs(g.v);
            v.fase += rap * dt * 1.6;
            const amp = g.suelo ? Math.min(1.1, 0.3 + rap * 0.06) : 0;
            const sw = Math.sin(v.fase);
            if (v.patas) {
                if (g.suelo) {
                    v.patas[0].rotation.x = v.patas[1].rotation.x = sw * amp;
                    v.patas[2].rotation.x = v.patas[3].rotation.x = -sw * amp;
                } else { v.patas[0].rotation.x = v.patas[1].rotation.x = -1.0; v.patas[2].rotation.x = v.patas[3].rotation.x = 1.0; }
            }
            if (v.tronco) { v.tronco.rotation.x = g.suelo ? Math.sin(v.fase * 2) * 0.05 * Math.min(1, rap / 8) : 0; }
            if (v.cola) { v.cola.rotation.x = -0.25 - Math.min(0.45, rap * 0.03); v.cola.rotation.y = Math.sin(v.fase * 0.5) * 0.3; }
            if (v.cabeza) v.cabeza.rotation.y = g.derrape ? g.derrape * 0.3 : 0;
            v.g.position.y += g.suelo ? Math.abs(Math.sin(v.fase)) * 0.06 * Math.min(1, rap / 6) : 0;
            // Partículas
            const atras = { x: g.x - Math.sin(g.yaw) * 0.6, z: g.z - Math.cos(g.yaw) * 0.6 };
            if (g.suelo && rap > 6 && Math.random() < dt * 14) emitir(atras.x + (Math.random() - 0.5) * 0.5, g.y + 0.1, atras.z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5), 0.8 + Math.random(), (Math.random() - 0.5), q.tunel ? '#8a8078' : '#d8ccb8', 0.5, 0.22, 2);
            if (g.derrape && g.nivel >= 0) for (const l of [-1, 1]) if (Math.random() < dt * 30) {
                const px = atras.x + Math.cos(g.yaw) * l * 0.35, pz = atras.z - Math.sin(g.yaw) * l * 0.35;
                emitir(px, g.y + 0.1, pz, (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, M.COLORES_NIVEL[g.nivel], 0.35, 0.16, 12);
            }
            if (g.turbo > 0 && Math.random() < dt * 40) emitir(atras.x, g.y + 0.35, atras.z, -Math.sin(g.yaw) * 3 + (Math.random() - 0.5), 0.5, -Math.cos(g.yaw) * 3 + (Math.random() - 0.5), Math.random() < 0.5 ? '#ffd040' : '#ff6a20', 0.3, 0.28, -1);
        }
        for (const t2 of placas) t2.offset.y = -(t * 1.6) % 1;
        dibujarObjetos(W, dt, t);
        actualizarParticulas(dt);
    }
    function estrellas(x, y, z) { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; emitir(x, y + 0.6, z, Math.cos(a) * 3, 3 + Math.random() * 2, Math.sin(a) * 3, i % 2 ? '#ffff66' : '#ffffff', 0.6, 0.2, 9); } }
    function confeti(x, y, z) { const c = ['#ff5a5a', '#ffd040', '#5ad0ff', '#7aff7a', '#ff7ae0']; for (let i = 0; i < 60; i++) emitir(x + (Math.random() - 0.5) * 6, y + 6 + Math.random() * 3, z + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3, c[i % c.length], 3, 0.25, 2); }
    // Lona en su caja. Pose de fondo según la fase (`animarLona` cada cuadro: 'quieta', 'arriba' en la cuenta, 'celebra'
    // cuando llega tu gata y en el podio) y gestos sueltos encima (`gestoLona`: 'largada' baja la bandera de golpe al
    // largar, 'aspiradora' apunta con los dos brazos a la pista). Valores en carrera.json → lona.
    // Canales: brazos (bDx, bDz, bIx, bIz), cabeza (cy), torso inclinado (inc) y saltito de todo el cuerpo (y).
    const suave = u => u * u * (3 - 2 * u);
    const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
    const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));
    const lonaCur = { bDx: -0.25, bDz: 0, bIx: 0, bIz: 0, cy: 0.3, inc: 0, y: 0 };
    let lonaGesto = null, lonaT = null, lonaY0 = lonaM ? lonaM.g.position.y : 0;
    function poseLona(modo, t, LO) {
        if (modo === 'arriba') return { bDx: -2.85, bDz: -0.1, bIx: -0.15, bIz: 0.3, cy: 0.15 + Math.sin(t * 0.9) * 0.08, inc: 0, y: 0 };
        if (modo === 'celebra' || modo === 'agita') {
            const f = t * LO.ritmo, s2 = Math.sin(f * 2);
            return { bDx: -2.75 + s2 * 0.3, bDz: -0.25 + s2 * 0.2, bIx: -2.75 - s2 * 0.3, bIz: 0.25 + s2 * 0.2, cy: Math.sin(f * 0.5) * 0.4, inc: -0.08, y: Math.abs(Math.sin(f)) * LO.salto };
        }
        return { bDx: -0.25 + Math.sin(t * 1.3) * 0.04, bDz: 0, bIx: -0.05, bIz: 0, cy: 0.3 + Math.sin(t * 0.7) * 0.2, inc: Math.sin(t * 1.3) * 0.02, y: 0 };
    }
    function gestoLona(clave, t) { if (lonaM) lonaGesto = { clave, t0: t }; }
    function animarLona(modo, t) {
        if (!lonaM || !lonaM.brazoD) return;
        const LO = R.lona || {}, dt = lonaT === null ? 0 : lim(t - lonaT, 0, 0.1); lonaT = t;
        if (modo === 'baja') { gestoLona('largada', t); modo = 'quieta'; } // (nombre antiguo)
        const meta = poseLona(modo, t, LO);
        let rapidez = LO.rapidez || 12;
        if (lonaGesto) {
            const u = t - lonaGesto.t0;
            if (lonaGesto.clave === 'largada') {
                // La bandera baja de golpe (con un pequeño rebote), el cuerpo se va adelante y vuelve a la pose de fondo
                const D = LO.largada || 1.2, w = 1 - suave(tramo(u, D * 0.6, D));
                const g2 = { bDx: -2.85 + 2.35 * suave(tramo(u, 0, 0.16)) - 0.25 * Math.sin(Math.PI * tramo(u, 0.12, 0.4)), bDz: 0.1, bIx: -0.4, bIz: 0.15, cy: 0.05, inc: 0.22 * envolvente(u, 0, D * 0.7, 0.12), y: 0.12 * Math.sin(Math.PI * tramo(u, 0, 0.3)) };
                for (const k in meta) meta[k] += (g2[k] - meta[k]) * w;
                rapidez *= 2.2;
                if (u > D) lonaGesto = null;
            } else if (lonaGesto.clave === 'aspiradora') {
                // Apunta a la pista con los dos brazos juntos, como si empujara la aspiradora; tiembla con el motor
                const D = LO.aspiradora || 1.4, w = envolvente(u, 0, D, Math.min(0.3, D / 3));
                const g2 = { bDx: -1.45, bDz: 0.3, bIx: -1.45, bIz: -0.3, cy: 0, inc: 0.12 + Math.sin(t * 35) * 0.03, y: Math.abs(Math.sin(t * 30)) * 0.03 };
                for (const k in meta) meta[k] += (g2[k] - meta[k]) * w;
                if (u > D) lonaGesto = null;
            } else lonaGesto = null;
        }
        const k = dt ? Math.min(1, dt * rapidez) : 1;
        for (const c2 in lonaCur) lonaCur[c2] += (meta[c2] - lonaCur[c2]) * k;
        const C = lonaCur;
        lonaM.brazoD.rotation.set(C.bDx, 0, C.bDz);
        if (lonaM.brazoI) lonaM.brazoI.rotation.set(C.bIx, 0, C.bIz);
        if (lonaM.cuello) lonaM.cuello.rotation.y = C.cy;
        if (lonaM.cuerpo) lonaM.cuerpo.rotation.x = C.inc;
        lonaM.g.position.y = lonaY0 + C.y;
        const fiesta = modo === 'celebra' || modo === 'agita';
        if (lonaM.bandera) lonaM.bandera.rotation.x = Math.sin(t * (fiesta ? 14 : 8)) * (fiesta ? 0.35 : 0.2);
    }
    // Podio: las tres primeras en sus escalones mirando al frente
    function ponerPodio(orden) {
        podio.visible = true;
        orden.slice(0, 3).forEach((g, i) => {
            const v = gatas[R.gatas.findIndex(d => d.clave === g.clave)];
            if (!v) return;
            podio.updateMatrixWorld(true);
            const p = podio.localToWorld(new THREE.Vector3(escalones[i].x, escalones[i].h, 0));
            v.g.position.copy(p); v.g.rotation.set(0, podio.rotation.y, 0); // mirando al frente del podio
            if (v.patas) for (const pt of v.patas) pt.rotation.x = 0;
        });
        confeti(podio.position.x, 3, podio.position.z);
    }

    tinte.aplicar(new THREE.Color(1, 1, 1));
    return {
        scene, gatas, podio, emitir, estrellas, confeti, dibujar, animarLona, gestoLona, ponerPodio, actualizarParticulas, lanzarAspiradora,
        get lona() { return lonaM; },
        destruir() {
            scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) { if (m.map && m.map.isCanvasTexture === false) m.map.dispose(); } });
            for (const g of recursos) g.dispose();
            geoP.dispose(); matP.dispose();
        }
    };
}
