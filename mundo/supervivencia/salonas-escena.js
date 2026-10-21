// =========================================================
// VENJY · Supervivencia · Salonas «La Gira» (S5): los locales, la banda y el público. Diseño en mundo/SALONAS.md §7.
// Vive dentro de la escena de salonas.js, alrededor de la autopista (que va de z = 1 hacia −z): el piso del escenario
// queda justo bajo los carriles y la banda a los lados, mirando a la cámara.
//  · Sala de ensayo: garage con colchones en las paredes, portón al fondo, amplis, cables, alfombra, una lámpara
//    colgando que se mece y afiches pixelados propios. Sin público.
//  · Bar: tarima, piso de tablas, muro de ladrillos, barra con botellas, mesas con amigos de público y letreros
//    de neón propios que titilan al pulso.
//  · Festival: escenario grande con torres de luces y sus haces que barren al pulso, pantallas, humo y una
//    multitud de cubos (una sola InstancedMesh) que salta con el ánimo; fuegos de píxeles al celebrar.
// La banda: Salonas (copia de su cuerpo del mundo, sin su bajo y con la guitarra de modelos-mano.js), el jugador
// (su skin, con el bajo de Salonas) y Conejeros sentado en su batería de cajas. Los gestos son los de
// salonas-gestos.js (puros); aquí solo se arman los cuerpos y se les aplica cada cuadro.
// Luces: todo el local es MeshBasic con sombra por cara (crearTinte) y se tiñe con la luz del local, que late al
// pulso; las copias de los amigos llevan materiales propios para teñirlas sin tocar los del mundo.
// Valores: AJUSTES_SALONAS.locales / banda / publico (salonas-reloj.js). No editable aún: pasan a salonas.json en S9.
// No editable aún (constantes de abajo): medidas finas del mobiliario y de la batería.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { texturaPixeles, ajustar, crearTinte, caja, crearPersona } from '../criaturas/cuerpo.js';
import { aplicarAngulos } from './pose-jugador.js';
import { MODELOS } from './modelos-mano.js';
import { agarre } from './objetos-mano-datos.js';
import * as GS from './salonas-gestos.js';

const PISO_Y = -0.12;              // el piso del escenario, apenas bajo el tablero de la autopista
const SEP_PUBLICO = 1.5;           // separación entre amigos del público
const PIEL_MONIGOTE = { cabeza: [200, 160, 130], pierna: [60, 60, 80] };
const BOMBO = { ancho: 0.8, alto: 0.8, hondo: 0.45 };

const hex = h => { const n = parseInt(String(h || '#888888').slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const azar = semilla => { let s = semilla >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// Copia un rig (crearPersona) con sus partes remapeadas; `extra` agrega objetos colgados (el instrumento)
function clonarRig(orig, extra = {}) {
    const a = [], b = [];
    orig.g.traverse(o => a.push(o));
    const rotulas = a.map(o => { const r = o.userData && o.userData.rotula; if (r) o.userData.rotula = null; return r; });
    const copia = orig.g.clone(true);
    a.forEach((o, i) => { if (rotulas[i]) o.userData.rotula = rotulas[i]; });
    copia.traverse(o => b.push(o));
    const mapa = new Map(a.map((o, i) => [o, b[i]]));
    a.forEach((o, i) => { if (o.userData && o.userData.rotula) b[i].userData.rotula = mapa.get(o.userData.rotula) || null; });
    const r = { g: copia };
    for (const [k, v] of Object.entries({ ...orig, ...extra })) if (k !== 'g' && v && v.isObject3D) r[k] = mapa.get(v) || null;
    return r;
}
// Materiales propios para una copia (así se tiñe con la luz del local sin cambiar a la persona del mundo)
function materialesPropios(g, lista) {
    const cache = new Map();
    const propio = m => { if (!cache.has(m)) { const n = m.clone(); n.userData.sombra = m.userData.sombra ?? 1; cache.set(m, n); lista.push(n); } return cache.get(m); };
    g.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial !== undefined) o.material = Array.isArray(o.material) ? o.material.map(propio) : propio(o.material); });
}

export function crearEscenaSalonas({ personasMundo = () => null, skin = null } = {}) {
    const raiz = new THREE.Group();          // banda + local (se agrega a la escena de salonas.js)
    const banda = new THREE.Group(); raiz.add(banda);
    const tinte = crearTinte();              // el del local y la batería
    const matsPersonas = [];                 // materiales de las copias (para teñirlos)
    let tinteJugador = null, local = null, claveLocal = null, firmaLocal = '';
    let sem = 9400;
    const tex = (w, h, f) => texturaPixeles(w, h, sem++, f);
    const ruido = (c, a = 0.12) => (x, y, r) => ajustar(c, 1 - a + r() * a * 2);
    const caras = (c, a) => tinte.caras(tex(8, 8, ruido(hex(c), a)));
    const bloque = (padre, w, h, d, mats, x, y, z) => { const m = caja(w, h, d, mats); m.position.set(x, y, z); padre.add(m); return m; };
    const basica = (color, opacidad = 1, aditiva = false) => new THREE.MeshBasicMaterial({ color, transparent: opacidad < 1 || aditiva, opacity: opacidad, depthWrite: !aditiva && opacidad >= 1, blending: aditiva ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !aditiva });

    // ---------- La banda ----------
    function monigote(color, semilla) {
        const lisa = c => (x, y, r) => ajustar(c, 0.95 + r() * 0.1);
        const piel = { cabeza: { frente: lisa(PIEL_MONIGOTE.cabeza) }, cuerpo: { frente: lisa(color) }, brazo: { frente: lisa(color) }, pierna: { frente: lisa(PIEL_MONIGOTE.pierna) } };
        const p = crearPersona(tinte, piel, semilla);
        return p;
    }
    // Lo que el amigo lleva colgado en el mundo (vaso, pito, el bajo de Salonas) no sube al escenario
    function sinColgados(p) {
        const huesos = new Set(Object.values(p).filter(o => o && o.isObject3D));
        for (const k of ['cuerpo', 'pecho', 'munecaD', 'munecaI']) for (const h of (p[k] && p[k].children) || []) if (!huesos.has(h)) h.visible = false;
    }
    function copiaDe(clave, color, semilla) {
        const n = personasMundo(clave), orig = n && (n.p || n);
        if (orig && orig.g) {
            const p = clonarRig(orig, n.instrumento ? { instrumento: n.instrumento } : {});
            materialesPropios(p.g, matsPersonas);
            return p;
        }
        return monigote(color, semilla);
    }
    const matModelo = new THREE.MeshLambertMaterial({ vertexColors: true });
    function colgarModelo(p, clave) {
        if (!MODELOS[clave]) return null;
        const ag = agarre('mano3', clave, 'modelo'), m = MODELOS[clave](THREE, matModelo);
        m.position.set(...ag.pos); m.rotation.set(...ag.rot); m.scale.setScalar(ag.escala);
        p.cuerpo.add(m);
        return m;
    }
    let salonas = null, jugador = null, conejeros = null, kit = null;
    function armarBanda() {
        if (salonas) return;
        // Salonas: su cuerpo y la guitarra; su bajo se lo pasa al jugador
        salonas = copiaDe('salonas', [150, 60, 40], 5300);
        const bajo = salonas.instrumento ? salonas.instrumento.clone(true) : null;
        sinColgados(salonas);
        colgarModelo(salonas, 'guitarra');
        banda.add(salonas.g);
        // El jugador con su skin (si no hay, un monigote) y el bajo de Salonas
        try { if (skin) { const m = skin(); if (m) { jugador = m; tinteJugador = m.tinte || null; } } } catch (e) { jugador = null; }
        if (!jugador) jugador = monigote([70, 90, 150], 5310);
        if (bajo) { bajo.visible = true; jugador.cuerpo.add(bajo); } else colgarModelo(jugador, 'guitarra');
        banda.add(jugador.g);
        // Conejeros sentado en la batería
        conejeros = copiaDe('conejeros', [90, 140, 90], 5320);
        sinColgados(conejeros);
        banda.add(conejeros.g);
        kit = armarBateria();
        banda.add(kit.g);
    }
    function armarBateria() {
        const g = new THREE.Group();
        const cuero = tinte.caras(tex(8, 8, (x, y, r) => ajustar([228, 222, 206], 0.92 + r() * 0.1)));
        const casco = tinte.caras(tex(8, 8, (x, y, r) => (y === 0 || y === 7) ? [200, 200, 205] : ajustar([170, 36, 40], 0.9 + r() * 0.15)));
        const bomboFrente = tex(16, 16, (x, y, r) => {
            const d = Math.hypot(x - 7.5, y - 7.5);
            if (d > 7.6) return [200, 200, 205];
            if (d > 6.6) return [170, 36, 40];
            // Logo propio: un rayo de 3 trazos
            const rayo = (y >= 3 && y <= 6 && x === 9 - (y - 3)) || (y === 7 && x >= 6 && x <= 9) || (y >= 8 && y <= 11 && x === 9 - (y - 8));
            return rayo ? [255, 210, 60] : ajustar([236, 232, 220], 0.94 + r() * 0.08);
        });
        const metal = tinte.caras(tex(8, 2, (x, y, r) => ajustar([214, 178, 72], 0.85 + r() * 0.25)));
        const fierro = caras('#7a7a80', 0.08);
        const B = BOMBO;
        const bombo = bloque(g, B.ancho, B.alto, B.hondo, tinte.caras(casco[0].map, { 4: bomboFrente }), 0, B.alto / 2, 0.55);
        const caja1 = bloque(g, 0.42, 0.18, 0.42, tinte.caras(cuero[2].map, { 0: casco[0].map, 1: casco[0].map, 4: casco[0].map, 5: casco[0].map }), 0.42, 0.68, 0.32);
        const tom = bloque(g, 0.36, 0.26, 0.36, tinte.caras(cuero[2].map, { 0: casco[0].map, 1: casco[0].map, 4: casco[0].map, 5: casco[0].map }), -0.05, 1.02, 0.5);
        const base = (x, z, alto) => bloque(g, 0.05, alto, 0.05, fierro, x, alto / 2, z);
        base(-0.55, 0.32, 1.02); base(-0.8, 0.72, 1.32);
        const hihat = [bloque(g, 0.44, 0.03, 0.44, metal, -0.55, 1.0, 0.32), bloque(g, 0.44, 0.03, 0.44, metal, -0.55, 1.06, 0.32)];
        const platillo = bloque(g, 0.62, 0.03, 0.62, metal, -0.8, 1.34, 0.72);
        platillo.rotation.x = 0.25;
        const banco = bloque(g, 0.42, 0.5, 0.42, caras('#2a2a2e', 0.1), 0, 0.25, -0.25);
        return { g, bombo, caja1, tom, hihat, platillo, banco, alto: { hihat: hihat[1].position.y } };
    }
    // Baquetas en las muñecas de Conejeros
    let baquetas = null;
    function ponerBaquetas(A) {
        const Q = A.banda.baqueta, firma = JSON.stringify(Q);
        if (baquetas && baquetas.firma === firma) return;
        if (baquetas) for (const b of baquetas.lista) b.parent && b.parent.remove(b);
        const madera = caras('#d8b47a', 0.1), lista = [];
        for (const k of ['munecaD', 'munecaI']) {
            const m = conejeros[k] || conejeros[k === 'munecaD' ? 'brazoD' : 'brazoI'];
            if (!m) continue;
            const piv = new THREE.Group(); piv.position.set(...Q.pos); piv.rotation.set(...Q.rot);
            const palo = caja(0.045, Q.largo, 0.045, madera); palo.position.y = -Q.largo / 2; piv.add(palo);
            m.add(piv); lista.push(piv);
        }
        baquetas = { firma, lista };
    }
    function ubicarBanda(A) {
        const B = A.banda, en = (p, d, y = PISO_Y) => { p.g.position.set(d.pos[0], y, d.pos[1]); p.g.rotation.y = d.giro || 0; };
        en(salonas, B.salonas); en(jugador, B.jugador);
        const C = B.conejeros;
        kit.g.position.set(C.pos[0], PISO_Y + C.tarima, C.pos[1]); kit.g.rotation.y = C.giro || 0;
        // Conejeros detrás del bombo, sobre el banco
        const s = Math.sin(C.giro || 0), co = Math.cos(C.giro || 0), atras = -0.25;
        conejeros.g.position.set(C.pos[0] + s * atras, PISO_Y + C.tarima, C.pos[1] + co * atras); conejeros.g.rotation.y = C.giro || 0;
        ponerBaquetas(A);
    }

    // ---------- Los locales ----------
    function soltarLocal() {
        if (!local) return;
        raiz.remove(local.g);
        local.g.traverse(o => { if (o.geometry && !o.userData.ajena) o.geometry.dispose(); });
        for (const p of local.publico) banda.remove(p.p.g);
        local = null;
    }
    // Lo común: piso, paredes, tarima de la batería y amplis
    function base(L, A) {
        const g = new THREE.Group(), W = L.ancho, F = L.fondo, H = L.alto;
        // El piso del escenario va de `frente` (hacia la cámara) hasta el fondo; con foso, delante queda el público
        const frente = L.frente ?? 4, largo = F - 4 + frente;
        bloque(g, W, 0.2, largo, caras(L.piso, 0.14), 0, PISO_Y - 0.1, frente - largo / 2);
        if (L.foso) bloque(g, W, L.foso, 0.2, caras(L.pared, 0.1), 0, PISO_Y - L.foso / 2, frente);
        bloque(g, W, H, 0.4, caras(L.pared, 0.1), 0, PISO_Y + H / 2, -F + 4);
        for (const s of [-1, 1]) bloque(g, 0.4, H, F, caras(L.pared, 0.1), s * W / 2, PISO_Y + H / 2, -F / 2 + 4);
        const C = A.banda.conejeros;
        if (C.tarima > 0) { const t = bloque(g, 2.6, C.tarima, 2.4, caras(L.tarima || '#3a3a40', 0.1), C.pos[0], PISO_Y + C.tarima / 2, C.pos[1]); t.rotation.y = C.giro || 0; }
        // Amplis: cajas con rejilla y perilla
        const rejilla = tex(16, 16, (x, y, r) => (x === 0 || y === 0 || x === 15 || y === 15) ? [40, 40, 40] : ((x + y) % 2 ? [58, 54, 50] : [34, 32, 30]));
        const tapiz = caras('#202020', 0.08), M = A.banda.amplis;
        const ampli = (x, z, giro, alto) => { const a = bloque(g, 1.3, alto, 0.7, tinte.caras(tapiz[0].map, { 4: rejilla }), x, PISO_Y + alto / 2, z); a.rotation.y = giro; return a; };
        ampli(M.pos[0], M.pos[1], M.giro, 1.4); ampli(M.pos[0], M.pos[1], M.giro, 1.4).position.y += 1.4;
        ampli(A.banda.salonas.pos[0] - 1.6, A.banda.salonas.pos[1] - 1.4, 0.3, 1);
        ampli(A.banda.jugador.pos[0] + 1.6, A.banda.jugador.pos[1] - 1.4, -0.3, 1);
        return g;
    }
    function sala(L, A, g, r) {
        const W = L.ancho, F = L.fondo, H = L.alto, fondoZ = -F + 4;
        // Colchones en las paredes (filas de cajas acolchadas de colores)
        for (const s of [-1, 1]) for (let z = fondoZ + 1.5; z < 2; z += 2.2) {
            const c = L.colchones[Math.floor(r() * L.colchones.length)];
            const m = bloque(g, 0.35, H * 0.7, 2, tinte.caras(tex(8, 16, (x, y, q) => ajustar(hex(c), (y % 4 === 0 ? 0.78 : 1) * (0.92 + q() * 0.12)))), s * (W / 2 - 0.35), PISO_Y + H * 0.38, z);
            m.rotation.z = s * (r() - 0.5) * 0.06;
        }
        // Portón del garage al fondo (listones)
        bloque(g, W * 0.55, H * 0.75, 0.15, tinte.caras(tex(8, 16, (x, y, q) => ajustar([150, 150, 145], (y % 3 === 0 ? 0.7 : 1) * (0.9 + q() * 0.1)))), 0, PISO_Y + H * 0.375, fondoZ + 0.3);
        // Afiches propios (dibujos de píxeles hechos aquí, no copiados)
        const DIBUJOS = [
            (x, y) => Math.hypot(x - 7.5, y - 8) < 5 ? [210, 50, 40] : (y < 4 && Math.abs(x - 7.5) < 2 ? [60, 160, 60] : null), // tomate
            (x, y) => Math.abs(x - 7.5) + Math.abs(y - 7.5) < 6 ? [250, 210, 60] : null,                                        // rombo
            (x, y) => (y > 3 && y < 13 && (x === 5 || x === 10)) || (y === 4 && x > 5 && x < 10) ? [240, 240, 240] : null,      // nota doble
            (x, y) => (x + y) % 5 === 0 && y > 2 && y < 14 ? [120, 200, 255] : null                                             // rayas
        ];
        for (let i = 0; i < L.afiches; i++) {
            const fondo = hex(L.colchones[i % L.colchones.length]), dib = DIBUJOS[i % DIBUJOS.length];
            const t = tex(16, 20, (x, y, q) => (x === 0 || x === 15 || y === 0 || y === 19) ? [235, 230, 215] : (dib(x, y - 2) || ajustar(fondo, 0.6 + q() * 0.1)));
            const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.75), tinte.mat(t, 1));
            m.position.set((i - (L.afiches - 1) / 2) * 2.6 + (i < L.afiches / 2 ? -3.2 : 3.2), PISO_Y + H * 0.62, fondoZ + 0.42);
            m.rotation.z = (r() - 0.5) * 0.12; g.add(m);
        }
        // Alfombra bajo la batería y cables por el piso
        const C = A.banda.conejeros;
        bloque(g, 3.4, 0.02, 3, caras('#7a2a30', 0.15), C.pos[0], PISO_Y + 0.01, C.pos[1] + 0.3);
        for (const d of [A.banda.salonas, A.banda.jugador]) {
            const c = bloque(g, 0.05, 0.03, 2.2, caras('#151515', 0.05), d.pos[0] + (d.pos[0] < 0 ? -0.8 : 0.8), PISO_Y + 0.015, d.pos[1] - 0.9);
            c.rotation.y = d.pos[0] < 0 ? 0.6 : -0.6;
        }
        // La lámpara colgando: cable, pantalla y ampolleta (se mece al pulso)
        const P = L.lampara, piv = new THREE.Group(); piv.position.set(P.pos[0], PISO_Y + H, P.pos[2]); g.add(piv);
        const largo = H - P.pos[1];
        bloque(piv, 0.04, largo, 0.04, caras('#101010', 0.02), 0, -largo / 2, 0);
        bloque(piv, 0.8, 0.3, 0.8, caras('#2e4a3a', 0.1), 0, -largo, 0);
        const foco = bloque(piv, 0.26, 0.2, 0.26, basica(P.color), 0, -largo - 0.2, 0);
        const halo = new THREE.Mesh(new THREE.ConeGeometry(2.4, largo + PISO_Y + P.pos[1] - 0.2, 12, 1, true), basica(P.color, 0.08, true));
        halo.position.y = -largo - (P.pos[1] - 0.2) / 2 - 0.2; piv.add(halo);
        return {
            cuadro(ritmo, t) { piv.rotation.z = P.mecer * Math.sin(t * 1.3); piv.rotation.x = P.mecer * 0.5 * Math.sin(t * 0.9); halo.material.opacity = 0.06 + 0.04 * ritmo.golpe; foco.scale.setScalar(1 + 0.08 * ritmo.golpe); }
        };
    }
    function bar(L, A, g, r) {
        const W = L.ancho, F = L.fondo, H = L.alto, fondoZ = -F + 4;
        // Muro de ladrillos al fondo y piso de tablas encima del piso común
        bloque(g, W, H, 0.1, tinte.caras(tex(16, 16, (x, y, q) => (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) ? [70, 60, 55] : ajustar(hex(L.pared), 0.85 + q() * 0.25))), 0, PISO_Y + H / 2, fondoZ + 0.25);
        bloque(g, W - 0.8, 0.02, F, tinte.caras(tex(16, 16, (x, y, q) => ajustar(hex(L.piso), (x % 4 === 0 ? 0.7 : 1) * (0.9 + q() * 0.15)))), 0, PISO_Y + 0.01, -F / 2 + 4);
        // Barra a la derecha, adelante, con botellas
        const [bx, bz] = L.barraPos, largoB = 7;
        bloque(g, 1.2, 1.1, largoB, caras(L.barra, 0.12), bx, PISO_Y + 0.55, bz);
        bloque(g, 1.5, 0.1, largoB + 0.2, caras('#2a1a10', 0.08), bx, PISO_Y + 1.15, bz);
        // Repisa con botellas detrás de la barra
        bloque(g, 0.5, 0.08, largoB, caras('#2a1a10', 0.08), bx + 1.6, PISO_Y + 2, bz);
        const vidrios = ['#3c8c46', '#8c5a28', '#c8c8b4', '#285a8c'];
        for (let i = 0; i < 12; i++) bloque(g, 0.14, 0.4 + r() * 0.2, 0.14, basica(vidrios[i % 4], 0.85), bx + 1.6 + (r() - 0.5) * 0.3, PISO_Y + 2.3, bz - largoB / 2 + 0.4 + i * (largoB - 0.8) / 11);
        // Mesas a la izquierda, adelante (el público se para alrededor)
        const mesas = [];
        for (const [x, z] of L.mesas) {
            bloque(g, 0.12, 0.9, 0.12, caras('#2a1a10', 0.05), x, PISO_Y + 0.45, z);
            bloque(g, 1.2, 0.08, 1.2, caras(L.barra, 0.1), x, PISO_Y + 0.92, z);
            mesas.push([x, z]);
        }
        // Letreros de neón propios: una jarra, una estrella y una nota (tubos de cajas brillantes)
        const neones = [];
        const tubo = (padre, x0, y0, x1, y1, mat) => { const l = Math.hypot(x1 - x0, y1 - y0), m = caja(l + 0.08, 0.08, 0.08, mat); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); m.rotation.z = Math.atan2(y1 - y0, x1 - x0); padre.add(m); };
        const FORMAS = [
            [[0, 0, 0, 1.2], [0, 1.2, 0.9, 1.2], [0.9, 1.2, 0.9, 0], [0.9, 0, 0, 0], [0.9, 0.9, 1.3, 0.8], [1.3, 0.8, 1.3, 0.3], [1.3, 0.3, 0.9, 0.25]],
            [[0.6, 1.3, 0.8, 0.8], [0.8, 0.8, 1.3, 0.8], [1.3, 0.8, 0.9, 0.45], [0.9, 0.45, 1.05, 0], [1.05, 0, 0.6, 0.3], [0.6, 0.3, 0.15, 0], [0.15, 0, 0.3, 0.45], [0.3, 0.45, -0.1, 0.8], [-0.1, 0.8, 0.4, 0.8], [0.4, 0.8, 0.6, 1.3]],
            [[0.3, 0, 0.3, 1.2], [0.3, 1.2, 1.1, 1.4], [1.1, 1.4, 1.1, 0.2], [0, 0, 0.3, 0], [0.8, 0.2, 1.1, 0.2]]
        ];
        FORMAS.forEach((forma, i) => {
            const n = new THREE.Group(), mat = basica(L.neon[i % L.neon.length]);
            for (const [a, b, c2, d] of forma) tubo(n, a, b, c2, d, mat);
            n.position.set((i - 1) * 5.5 - 0.6, PISO_Y + H * 0.6, fondoZ + 0.4);
            const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), basica(L.neon[i % L.neon.length], 0.15, true));
            halo.position.set(0.6, 0.6, -0.05); n.add(halo);
            g.add(n); neones.push({ n, mat, halo, fase: r() * 10, base: new THREE.Color(L.neon[i % L.neon.length]) });
        });
        // Guirnalda de ampolletas sobre la tarima
        const focos = [];
        for (let i = 0; i < 14; i++) { const x = -6.5 + i, m = bloque(g, 0.14, 0.18, 0.14, basica(L.neon[i % L.neon.length]), x, PISO_Y + H - 1.2 - Math.sin(i / 13 * Math.PI) * 0.6, -9); focos.push(m); }
        return {
            mesas,
            cuadro(ritmo, t) {
                for (const o of neones) { const tit = Math.sin(t * 23 + o.fase) > 0.96 ? 0.35 : 1; o.mat.color.copy(o.base).multiplyScalar(tit * (0.8 + 0.2 * ritmo.golpe)); o.halo.material.opacity = 0.1 + 0.1 * ritmo.golpe * tit; }
                focos.forEach((m, i) => { m.scale.setScalar((ritmo.pulso + i) % 4 === 0 ? 1.3 : 1); });
            }
        };
    }
    function festival(L, A, g, r) {
        const W = L.ancho, F = L.fondo, H = L.alto, fondoZ = -F + 4;
        // Pantallas al fondo (una grilla de cuadros que se enciende al pulso)
        const pantallas = [];
        for (const s of [-1, 1]) {
            const cv = document.createElement('canvas'); cv.width = 16; cv.height = 10;
            const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
            const m = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshBasicMaterial({ map: t, fog: false }));
            m.position.set(s * 8.5, PISO_Y + L.pantallaY, fondoZ + 0.3); g.add(m);
            bloque(g, 8.4, 5.4, 0.2, caras('#151515', 0.05), s * 8.5, PISO_Y + L.pantallaY, fondoZ + 0.15);
            pantallas.push({ cv, x: cv.getContext('2d'), t, s, ultimo: -1 });
        }
        // Torres de luces (cerchas de cajas) a los lados, con sus haces
        const torre = caras(L.torres, 0.1), haces = [];
        for (const s of [-1, 1]) {
            const x = s * L.torresPos[0], z = L.torresPos[1];
            for (const dx of [-0.4, 0.4]) for (const dz of [-0.4, 0.4]) bloque(g, 0.1, H, 0.1, torre, x + dx, PISO_Y + H / 2, z + dz);
            for (let y = 1; y < H; y += 1.2) bloque(g, 0.9, 0.06, 0.9, torre, x, PISO_Y + y, z);
            for (let i = 0; i < 3; i++) {
                const piv = new THREE.Group(); piv.position.set(x, PISO_Y + H - 0.5 - i * 1.6, z); g.add(piv);
                bloque(piv, 0.4, 0.4, 0.5, caras('#202020', 0.05), 0, 0, 0);
                const color = L.haces[(i + (s > 0 ? 1 : 0)) % L.haces.length];
                const largo = 22, cono = new THREE.Mesh(new THREE.ConeGeometry(1.6, largo, 10, 1, true), basica(color, 0.1, true));
                cono.position.y = -largo / 2; cono.userData.cono = true;
                const brazo = new THREE.Group(); brazo.add(cono); piv.add(brazo);
                haces.push({ brazo, cono, s, i, fase: r() * 6 });
            }
        }
        // Humo: cajas translúcidas que suben despacio por el escenario
        const humo = [];
        for (let i = 0; i < L.humo; i++) {
            const m = bloque(g, 2 + r() * 2, 0.8 + r(), 2 + r() * 2, basica('#b8b0c8', 0.08), (r() - 0.5) * 18, PISO_Y + r() * 2, -4 - r() * 14);
            humo.push({ m, v: 0.15 + r() * 0.2, x0: m.position.x, fase: r() * 6 });
        }
        // Multitud de cubos a los lados de la autopista, más abajo que el escenario (cuerpo + cabeza por instancia)
        const N = L.multitud, abajo = PISO_Y - (L.foso || 0);
        bloque(g, W, 0.2, 18, caras('#1a1a1e', 0.1), 0, abajo - 0.1, (L.frente ?? 4) + 9);
        const geo = new THREE.BoxGeometry(0.5, 0.9, 0.35), geoC = new THREE.BoxGeometry(0.42, 0.42, 0.42);
        const cuerpos = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff' }), N);
        const cabezas = new THREE.InstancedMesh(geoC, new THREE.MeshBasicMaterial({ color: '#ffffff' }), N);
        const gente = [], piel = [[230, 190, 160], [190, 140, 100], [140, 95, 65], [100, 70, 50]], col = new THREE.Color();
        for (let i = 0; i < N; i++) {
            let x, z;
            const [z0, z1] = L.multitudZ;
            do { x = (r() - 0.5) * (W - 3); z = z0 + r() * (z1 - z0); } while (Math.abs(x) < 3.2);
            gente.push({ x, z, fase: r(), alto: 0.9 + r() * 0.2 });
            const c = hex(L.colores[Math.floor(r() * L.colores.length)]); col.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); cuerpos.setColorAt(i, col);
            const p = piel[Math.floor(r() * piel.length)]; col.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace); cabezas.setColorAt(i, col);
        }
        g.add(cuerpos, cabezas);
        const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), uno = new THREE.Vector3(1, 1, 1);
        // Fuegos de píxeles (al celebrar): cubitos que salen de un punto y caen
        const chispas = [];
        const geoF = new THREE.BoxGeometry(0.18, 0.18, 0.18);
        function fuegos(n = 4) {
            for (let k = 0; k < n; k++) {
                const c = L.haces[k % L.haces.length], cx = (r() - 0.5) * 20, cy = PISO_Y + H * (0.7 + r() * 0.3), cz = -14 - r() * 6;
                for (let i = 0; i < 28; i++) {
                    const m = new THREE.Mesh(geoF, basica(c)); m.userData.ajena = true;
                    const a = r() * Math.PI * 2, b = (r() - 0.5) * Math.PI, sp = 3 + r() * 2;
                    m.position.set(cx, cy, cz); g.add(m);
                    chispas.push({ m, vx: Math.cos(a) * Math.cos(b) * sp, vy: Math.sin(b) * sp, vz: Math.sin(a) * Math.cos(b) * sp, vida: 1.4 + r() * 0.6, retraso: k * 0.35 });
                }
            }
        }
        return {
            fuegos,
            cuadro(ritmo, t, dt, animo) {
                for (const h of haces) {
                    const barre = Math.sin(t * (0.8 + h.i * 0.2) + h.fase + ritmo.pulso * 0.5 * (animo > 0.5 ? 1 : 0));
                    h.brazo.rotation.z = h.s * (0.55 + 0.35 * barre); h.brazo.rotation.x = 0.25 * Math.cos(t * 0.7 + h.fase);
                    h.cono.material.opacity = 0.1 + 0.12 * ritmo.golpe + 0.08 * Math.max(0, animo);
                }
                for (const o of humo) { o.m.position.y += o.v * dt; o.m.position.x = o.x0 + Math.sin(t * 0.3 + o.fase) * 0.8; if (o.m.position.y > PISO_Y + 5) o.m.position.y = PISO_Y; o.m.material.opacity = 0.06 * (1 - (o.m.position.y - PISO_Y) / 5); }
                for (const p of pantallas) {
                    if (p.ultimo === ritmo.pulso) continue;
                    p.ultimo = ritmo.pulso;
                    for (let y = 0; y < 10; y++) for (let x = 0; x < 16; x++) {
                        const on = ((x + y + ritmo.pulso + (p.s > 0 ? 3 : 0)) % 6 < 2) || (Math.abs(x - 7.5) + Math.abs(y - 4.5) < (ritmo.pulso % 4) * 2);
                        p.x.fillStyle = on ? L.pantallas[(ritmo.pulso + x) % L.pantallas.length] : '#0a0a12'; p.x.fillRect(x, y, 1, 1);
                    }
                    p.t.needsUpdate = true;
                }
                const salto = lim(animo, 0, 1);
                gente.forEach((o, i) => {
                    const f = (ritmo.fase + o.fase) % 1, y = abajo + salto * 0.35 * Math.pow(Math.sin(Math.PI * f), 2) * (o.fase > 0.3 ? 1 : 0.4);
                    e.set(0, Math.sin(t * 0.8 + o.fase * 6) * 0.3, 0); q.setFromEuler(e);
                    v.set(o.x, y + 0.45 * o.alto, o.z); mtx.compose(v, q, uno); cuerpos.setMatrixAt(i, mtx);
                    v.y = y + 0.9 * o.alto + 0.21; mtx.compose(v, q, uno); cabezas.setMatrixAt(i, mtx);
                });
                cuerpos.instanceMatrix.needsUpdate = cabezas.instanceMatrix.needsUpdate = true;
                for (let i = chispas.length - 1; i >= 0; i--) {
                    const c = chispas[i];
                    if (c.retraso > 0) { c.retraso -= dt; c.m.visible = false; continue; }
                    c.m.visible = true; c.vida -= dt; c.vy -= 2.2 * dt;
                    c.m.position.x += c.vx * dt; c.m.position.y += c.vy * dt; c.m.position.z += c.vz * dt;
                    c.m.material.opacity = lim(c.vida, 0, 1); c.m.material.transparent = true;
                    if (c.vida <= 0) { g.remove(c.m); c.m.material.dispose(); chispas.splice(i, 1); }
                }
            }
        };
    }
    const LOCALES = { sala, bar, festival };

    // Amigos de público: de pie, en fila o alrededor de las mesas, mirando al escenario
    function armarPublico(L, extra) {
        const lista = [];
        (L.publico || []).forEach((clave, i) => {
            const n = personasMundo(clave);
            if (!n || !(n.p || n).g) return;
            const p = clonarRig(n.p || n); materialesPropios(p.g, matsPersonas); sinColgados(p);
            let x, z, y = PISO_Y;
            if (extra.mesas && extra.mesas.length) { const [mx, mz] = extra.mesas[i % extra.mesas.length]; x = mx + (i < extra.mesas.length ? 0.9 : -0.9); z = mz + 0.4; }
            else { x = (i % 2 ? 1 : -1) * (4 + Math.floor(i / 2) * SEP_PUBLICO); z = 2 - Math.floor(i / 2) * 0.4; y = PISO_Y - (L.foso || 0); }
            p.g.position.set(x, y, z);
            p.g.rotation.y = Math.PI + Math.atan2(x, 8); // de espaldas a la cámara, mirando a la banda
            banda.add(p.g);
            lista.push({ p, desfase: (i * 0.37) % 1 });
        });
        return lista;
    }

    function poner(clave, A) {
        armarBanda();
        const L = A.locales[clave] || A.locales[A.local] || Object.values(A.locales)[0];
        const firma = JSON.stringify([clave, L, A.banda]);
        if (local && firma === firmaLocal) return local;
        soltarLocal();
        claveLocal = clave; firmaLocal = firma;
        const r = azar(7100 + clave.length * 31);
        const g = base(L, A), propio = (LOCALES[clave] || sala)(L, A, g, r);
        raiz.add(g);
        local = { g, L, propio, publico: [] };
        local.publico = armarPublico(L, propio);
        ubicarBanda(A);
        return local;
    }

    // ---------- Cada cuadro ----------
    // ritmo: { pulso, fase, seccion, golpe (0..1 al pulso), salto, energia }; toca: { carril, slap, fallo };
    // animo: −1..1; celebra: 0..1 (envolvente de la celebración); primus: 0..1 (tinte del Modo Primus)
    const luz = new THREE.Color(), gris = new THREE.Color(), tintePrimus = new THREE.Color();
    function cuadro({ ritmo, toca, animo, t, dt, celebra = 0, primus = 0, G = GS.GESTOS_SALONAS, P }) {
        if (!local) return;
        const L = local.L, Lz = L.luz;
        luz.set(Lz.color).multiplyScalar(Lz.base + Lz.pulso * ritmo.golpe);
        if (primus > 0) luz.lerp(tintePrimus.set(P.primus.luz), P.primus.luzK * primus); // Modo Primus: las luces cambian
        tinte.aplicar(luz);
        for (const m of matsPersonas) m.color.setScalar(m.userData.sombra ?? 1).multiply(luz);
        if (tinteJugador) tinteJugador.aplicar(luz);
        matModelo.color.copy(gris.setScalar(1)).multiply(luz);
        local.propio.cuadro(ritmo, t, dt, animo);
        aplicarAngulos(salonas, GS.guitarra(ritmo, G));
        aplicarAngulos(jugador, GS.bajo(ritmo, G, toca));
        const b = GS.bateria(ritmo, G);
        aplicarAngulos(conejeros, b.angulos);
        const k = b.golpes;
        kit.bombo.scale.set(1 + 0.04 * k.bombo, 1 + 0.04 * k.bombo, 1);
        kit.caja1.position.y = 0.68 - 0.02 * k.caja;
        kit.hihat[1].position.y = kit.alto.hihat - 0.04 * k.hihat;
        kit.platillo.rotation.z = 0.12 * k.platillo * Math.sin(t * 30);
        // Público: el tipo de gesto sale del ánimo (o de la celebración)
        const U = P.publico, tipo = celebra > 0 ? 'salta' : animo >= U.salta ? 'salta' : animo >= U.aplaude ? 'aplaude' : animo <= U.abuchea ? 'abuchea' : 'mira';
        for (const o of local.publico) aplicarAngulos(o.p, GS.publico(ritmo, G, { animo: celebra > 0 ? 1 : animo, desfase: o.desfase, tipo }));
    }

    return {
        raiz, poner, cuadro,
        get local() { return claveLocal; },
        // Para la cámara: dónde está Salonas (su solo) y el plano de intro del local
        posSalonas: () => salonas ? salonas.g.position : null,
        intro: () => (local && local.L.intro) || null,
        celebrar() { if (local && local.propio.fuegos) local.propio.fuegos(); },
        soltar() { soltarLocal(); }
    };
}
