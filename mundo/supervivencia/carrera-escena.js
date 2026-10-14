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
    scene.background = new THREE.Color('#2a1c14');
    const lado = Math.max(R.sala.ancho, R.sala.fondo);
    scene.fog = new THREE.Fog(new THREE.Color('#3a2a20'), lado * 0.6, lado * 1.4); // se adapta al tamaño de la sala

    // ---------- Sala ----------
    const tabla = tx(16, 16, (x, y, r) => {
        const fila = Math.floor(y / 4), corte = (x + fila * 7) % 16 === 0;
        const base = [[150, 102, 58], [140, 94, 52], [158, 110, 64], [134, 90, 50]][fila];
        return corte || y % 4 === 3 ? ajustar(base, 0.72) : ajustar(base, 0.9 + r() * 0.16);
    });
    bloque(sala.ancho, 1, sala.fondo, mats(repetir(tabla, sala.ancho / 4, sala.fondo / 4)), sala.x, -0.5, sala.z);
    const mural = tx(16, 16, (x, y, r) => ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) ? [196, 168, 120] : ajustar([226, 206, 160], 0.94 + r() * 0.08));
    const zocalo = tx(8, 8, (x, y, r) => y === 0 ? [240, 236, 226] : ajustar([226, 220, 206], 0.95 + r() * 0.06));
    const H = sala.alto, A = sala.ancho, F = sala.fondo;
    for (const [w, d, x, z] of [[A, 1, sala.x, sala.z - F / 2], [A, 1, sala.x, sala.z + F / 2], [1, F, sala.x - A / 2, sala.z], [1, F, sala.x + A / 2, sala.z]]) {
        bloque(w, H, d, mats(repetir(mural, Math.max(w, d) / 6, H / 6)), x, H / 2, z);
        bloque(w + 0.4, 2, d + 0.4, mats(repetir(zocalo, Math.max(w, d) / 4, 1)), x, 1, z);
    }
    bloque(A, 1, F, mats(repetir(tx(8, 8, (x, y, r) => ajustar([238, 232, 222], 0.95 + r() * 0.05)), A / 8, F / 8)), sala.x, H + 0.5, sala.z);
    // Ventana con cielo (pared del fondo) y su luz en el piso
    const cielo = tx(16, 16, (x, y, r) => (y > 10 && (x + y) % 5 === 0) ? [248, 248, 252] : [128 + y * 4, 186 + y * 2, 236]);
    const marco = mats(tx(4, 4, () => [244, 240, 232]));
    const vx = sala.x - 10, vz = sala.z - F / 2 + 0.7;
    bloque(40, 22, 0.2, mats(cielo), vx, 30, vz);
    for (const [w, h, x, y] of [[42, 1.6, 0, 41], [42, 1.6, 0, 19], [1.6, 22, -20.5, 30], [1.6, 22, 20.5, 30], [1.2, 22, 0, 30], [42, 1, 0, 30]]) bloque(w, h, 0.6, marco, vx + x, y, vz + 0.2);
    const luz = new THREE.Mesh(new THREE.PlaneGeometry(36, 30), new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: 0.12, depthWrite: false }));
    luz.rotation.x = -Math.PI / 2; luz.position.set(vx + 6, 0.06, vz + 30); scene.add(luz); recursos.push(luz.geometry);

    // ---------- Muebles ----------
    const tela = (c, s = 0.1) => tx(8, 8, (x, y, r) => ajustar(c, 1 - s + r() * s * 2));
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
            const madera = mats(repetir(tabla, m.a / 4, m.f / 4));
            bloque(m.a, 1.2, m.f, madera, 0, m.h + 0.6, 0, g);
            for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bloque(1.5, m.h, 1.5, madera, px * (m.a / 2 - 1), m.h / 2, pz * (m.f / 2 - 1), g);
            // un florero y un libro encima
            bloque(2, 4, 2, mats(tela([210, 230, 236])), 3, m.h + 3.2, -2, g);
            bloque(5, 1, 3.5, mats(tela([170, 52, 46])), -4, m.h + 1.7, 3, g);
        } else if (m.tipo === 'alfombra') {
            const alf = tx(16, 16, (x, y, r) => (x < 1 || y < 1 || x > 14 || y > 14) ? [222, 184, 84] : ((x + y) % 6 < 2 ? [150, 36, 44] : ajustar([176, 48, 52], 0.92 + r() * 0.12)));
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
    const lomos = [[170, 52, 46], [52, 96, 160], [70, 130, 70], [210, 170, 60], [120, 70, 140]];
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
        if ((R.muebles || []).some(m => m.tipo === 'sofa' && Math.abs(q.x - m.x) < m.a / 2 && Math.abs(q.z - m.z) < m.f / 2)) continue;
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
    // Lona: brazo arriba en la cuenta y bandera al bajar; agita en la meta
    function animarLona(modo, t) {
        if (!lonaM || !lonaM.brazoD) return;
        const b = lonaM.brazoD;
        if (modo === 'arriba') { b.rotation.x = -2.9; b.rotation.z = 0; }
        else if (modo === 'baja') { b.rotation.x = -1.2; }
        else if (modo === 'agita') { b.rotation.x = -2.7 + Math.sin(t * 10) * 0.35; b.rotation.z = Math.sin(t * 10) * 0.25; }
        else { b.rotation.x = -0.2; b.rotation.z = 0; }
        if (lonaM.bandera) lonaM.bandera.rotation.x = Math.sin(t * 8) * 0.2;
        if (lonaM.cuello) lonaM.cuello.rotation.y = 0.3 + Math.sin(t * 0.7) * 0.2;
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
        scene, gatas, podio, emitir, estrellas, confeti, dibujar, animarLona, ponerPodio, actualizarParticulas, lanzarAspiradora,
        get lona() { return lonaM; },
        destruir() {
            scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) { if (m.map && m.map.isCanvasTexture === false) m.map.dispose(); } });
            for (const g of recursos) g.dispose();
            geoP.dispose(); matP.dispose();
        }
    };
}
