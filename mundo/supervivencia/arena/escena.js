// =========================================================
// VENJY · Supervivencia · Arena del duelo (bloque 8 · L1, mundo/COMBATE.md §19.3): el lago congelado
// Escena propia (no toca la del mundo), igual que la de la carrera. Centro en (0,0,0), suelo de hielo en y=0,
// eje largo X, paredes bajas de bloques de nieve y hielo FUERA del rectángulo interior, barriles, cuatro fogatas
// con luz que parpadea, nieve que cae, el iglú de Lalo y Moisés al fondo y, detrás de la pared lejana (−Z), el
// público mirando al centro. Los datos vienen de R = arena.json fundido (escenario, publico, peleadores, marcas).
// Rendimiento: lo estático se junta por material (pocas draw calls), Lambert/Basic, sin sombras, NearestFilter.
// =========================================================
import * as THREE from '../../../vendor/three.module.js';
import { texturaPixeles, ajustar, crearTinte, caja, crearPersona } from '../../criaturas/cuerpo.js';
import { aplicarAngulos } from '../pose-jugador.js';
import { colocarArma, KATANA } from '../modelos-mano.js';
import { agarre, versionObjetosMano } from '../objetos-mano-datos.js';
import { crearEfectos } from './efectos.js';

// ---- Constantes no editables aún (anotadas en el informe) ----
const ESCALA_LUZ = Math.PI;        // las luces de esta versión de Three no traen el factor π de antes
const PX_HIELO = 16;               // píxeles de textura por bloque de hielo
const ANCHO_BLOQUE = 1;            // ancho de cada bloque de las paredes
const PROB_HIELO = 0.18;           // parte de los bloques de pared que son de hielo
const ALTO_NIEVE = 9;              // altura hasta donde cae la nieve
const TAM_COPO = 0.13;             // tamaño de cada copo
const ESPACIO_PUBLICO = 1.8;       // separación entre personas del público
const PLATAFORMA = 0.6;            // altura de la grada del público
const IGLU = { radio: 4.5, atras: 8, anillos: 6, bloque: 1.1, puerta: 0.4 }; // atrás = distancia detrás de la fila del público
const ARBOLES = { cantidad: 22, radioMin: 24, radioMax: 40 };
const FOGATA = { distancia: 12, decaimiento: 1.2, llamas: 3 };
const CELEBRAR = { duracion: 0.8, salto: 0.3, brazos: -2.9 };
const BALANCEO = { velocidad: 1.6, giro: 0.12, rebote: 0.03 };
const RETRATO = { fov: 28, distancia: 1.0, oscurecer: 0.45 };
const PRIMER_PLANO = { distancia: 1.15, altura: 0.05 };
const PIEL_MONIGOTE = { cabeza: [200, 160, 130], cuerpo: [70, 90, 150], pierna: [60, 60, 80] };

const hex = h => { const n = parseInt(String(h || '#888888').slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const azar = semilla => { let s = semilla >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// Copia un grupo y devuelve su copia con todas las partes que sean Object3D remapeadas (genérico)
function clonarConPartes(orig, partes) {
    const a = [], b = [];
    orig.traverse(o => a.push(o));
    // Se saca userData.rotula un momento: clone() lo serializa a JSON (lento y lo rompe)
    const rotulas = a.map(o => { const r = o.userData && o.userData.rotula; if (r) o.userData.rotula = null; return r; });
    const copia = orig.clone(true);
    a.forEach((o, i) => { if (rotulas[i]) o.userData.rotula = rotulas[i]; });
    copia.traverse(o => b.push(o));
    const mapa = new Map(a.map((o, i) => [o, b[i]]));
    // userData.rotula (rótulas de codos y rodillas) apunta a un Object3D: Three lo rompe al clonar
    a.forEach((o, i) => { if (o.userData && o.userData.rotula) b[i].userData.rotula = mapa.get(o.userData.rotula) || null; });
    const r = {};
    for (const [k, v] of Object.entries(partes)) {
        if (k === 'g') continue;
        if (v && v.isObject3D) r[k] = mapa.get(v) || null;
        else if (Array.isArray(v) && v.length && v.every(x => x && x.isObject3D)) r[k] = v.map(x => mapa.get(x) || null);
        else r[k] = v;
    }
    r.g = copia;
    return r;
}

// Junta geometrías (con transformación aplicada) de un mismo material en una sola malla
function fusionar(geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let ov = 0, oi = 0;
    for (const g of geos) {
        const n = g.attributes.position.count;
        pos.set(g.attributes.position.array, ov * 3); nor.set(g.attributes.normal.array, ov * 3); uv.set(g.attributes.uv.array, ov * 2);
        for (let i = 0; i < g.index.count; i++) idx[oi + i] = g.index.array[i] + ov;
        ov += n; oi += g.index.count; g.dispose();
    }
    const r = new THREE.BufferGeometry();
    r.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    r.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    r.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    r.setIndex(new THREE.BufferAttribute(idx, 1));
    return r;
}

export function crearEscenaArena({ R, personasMundo, idioma = 'es' }) {
    const scene = new THREE.Scene();
    const tinte = crearTinte();
    tinte.aplicar(new THREE.Color(1, 1, 1));
    let estatico = null;            // grupo con todo lo que se rearma en aplicar()
    let recursos = [];              // geometrías, materiales y texturas del estático
    let nieve = null, fogatas = [], luces = [];
    let llamaMats = [];
    const peleadores = new Map();   // clave -> persona (clon)
    const publico = new Map();      // clave -> { p, x, fase, celeb, propio }
    const propios = [];             // monigotes de reserva (se liberan en destruir)
    const armas = new Map();        // clave -> { g (en la muñeca), vaina, def (estilo → arma), tramo: [z0, z1, y1] de la hoja }
    let reloj = 0;
    let sem = 9100;

    const tx = (w, h, pintor) => { const t = texturaPixeles(w, h, sem++, pintor); recursos.push(t); return t; };
    const repetir = (t, rx, ry) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rx, ry); c.needsUpdate = true; recursos.push(c); return c; };
    const lambert = (map, extra = {}) => { const m = new THREE.MeshLambertMaterial({ map, ...extra }); recursos.push(m); return m; };
    const basico = (color, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, ...extra }); recursos.push(m); return m; };

    // ---------- Texturas de pixel ----------
    const texNieve = () => tx(16, 16, (x, y, r) => {
        const b = [238, 243, 249], sombra = (y === 15 || x === 15) ? 0.86 : (y === 0 || x === 0) ? 1.02 : 1;
        return ajustar(b, sombra * (0.94 + r() * 0.08));
    });
    const texHieloBloque = () => tx(16, 16, (x, y, r) => {
        const b = [160, 208, 238], veta = ((x + y * 2) % 11 === 0) ? 1.1 : 1, borde = (y === 15 || x === 15) ? 0.82 : 1;
        return ajustar(b, veta * borde * (0.93 + r() * 0.1));
    });
    const texMadera = () => tx(16, 16, (x, y, r) => ajustar([138, 96, 52], (x % 4 === 0 ? 0.78 : 1) * (0.92 + r() * 0.14)));
    const texTronco = () => tx(8, 16, (x, y, r) => ajustar([96, 66, 38], (x % 3 === 0 ? 0.8 : 1) * (0.9 + r() * 0.16)));
    const texAro = () => tx(4, 4, (x, y, r) => ajustar([70, 70, 78], 0.9 + r() * 0.2));
    const texPiedra = () => tx(8, 8, (x, y, r) => ajustar([128, 128, 134], 0.8 + r() * 0.3));
    const texTerreno = () => tx(16, 16, (x, y, r) => ajustar([232, 238, 246], 0.93 + r() * 0.08));
    const texPino = () => tx(8, 8, (x, y, r) => ajustar([34, 84, 52], 0.8 + r() * 0.3 + (y < 2 ? 0.25 : 0)));
    const texPuerta = () => tx(4, 4, () => [14, 18, 28]);
    const texMetal = () => tx(8, 8, (x, y, r) => ajustar([196, 204, 214], (y === 0 ? 1.15 : y > 5 ? 0.82 : 1) * (0.95 + r() * 0.08)));
    const texMango = () => tx(4, 4, (x, y, r) => ajustar([54, 40, 36], 0.85 + r() * 0.3));

    // ---------- Escenario estático ----------
    function construirEstatico() {
        const E = R.escenario || {}, luz = E.luz || {}, pared = E.pared || {}, hielo = E.hielo || {};
        const L = E.largo || 14, W = E.ancho || 8, alto = pared.alto ?? 1.5, gr = pared.grosor ?? 1;
        const cielo = new THREE.Color(luz.cielo || '#9ab4d8');
        scene.background = cielo;
        scene.fog = new THREE.Fog(new THREE.Color(luz.niebla || '#b8c8e0'), luz.nieblaCerca ?? 16, luz.nieblaLejos ?? 46);
        estatico = new THREE.Group(); scene.add(estatico);

        // Fusión por material: lista de { geo, mat } -> mallas
        const grupos = new Map();
        const caja3 = (w, h, d, x, y, z, mat, ry = 0, rz = 0) => {
            const g = new THREE.BoxGeometry(w, h, d);
            const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(1, 1, 1));
            g.applyMatrix4(m);
            if (!grupos.has(mat)) grupos.set(mat, []);
            grupos.get(mat).push(g);
        };
        const cerrarGrupos = () => {
            for (const [mat, geos] of grupos) { const g = fusionar(geos); recursos.push(g); estatico.add(new THREE.Mesh(g, mat)); }
            grupos.clear();
        };

        // Luces
        const hemi = new THREE.HemisphereLight(cielo, new THREE.Color(luz.suelo || '#3a4a66'), (luz.ambiente ?? 0.55) * ESCALA_LUZ);
        estatico.add(hemi);

        // Hielo del lago: grietas pixel, nieve en los bordes
        const pw = Math.round(L * PX_HIELO), ph = Math.round(W * PX_HIELO);
        const rg = azar(4242), mascara = new Uint8Array(pw * ph);
        for (let k = 0; k < (hielo.grietas ?? 18); k++) {
            let x = Math.floor(rg() * pw), y = Math.floor(rg() * ph), dx = rg() < 0.5 ? 1 : -1, dy = rg() < 0.5 ? 1 : -1;
            const largo = 6 + Math.floor(rg() * 12);
            for (let i = 0; i < largo; i++) {
                if (x >= 0 && x < pw && y >= 0 && y < ph) mascara[y * pw + x] = 1;
                if (rg() < 0.55) x += dx; else y += dy;
                if (rg() < 0.12) dx = -dx;
            }
        }
        const cH = hex(hielo.color || '#a8d4f0');
        const texHielo = tx(pw, ph, (x, y, r) => {
            const borde = Math.min(x, y, pw - 1 - x, ph - 1 - y);
            if (borde < 2 + (r() < 0.5 ? 1 : 0)) return ajustar([240, 245, 250], 0.95 + r() * 0.08);
            if (mascara[y * pw + x]) return ajustar(cH, 0.68);
            if (((x + 1) < pw && mascara[y * pw + x + 1]) || (y > 0 && mascara[(y - 1) * pw + x])) return ajustar(cH, 1.12);
            return ajustar(cH, 0.94 + r() * 0.1);
        });
        const matHielo = new THREE.MeshPhongMaterial({ map: texHielo, specular: new THREE.Color().setScalar(lim(hielo.brillo ?? 0.35, 0, 1)), shininess: 60 });
        recursos.push(matHielo);
        const suelo = new THREE.Mesh(new THREE.PlaneGeometry(L, W), matHielo);
        suelo.rotation.x = -Math.PI / 2; recursos.push(suelo.geometry); estatico.add(suelo);

        // Terreno nevado hasta la niebla
        const terreno = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), lambert(repetir(texTerreno(), 120, 120)));
        terreno.rotation.x = -Math.PI / 2; terreno.position.y = -0.03; recursos.push(terreno.geometry); estatico.add(terreno);

        // Paredes bajas de nieve con algo de hielo (fuera del rectángulo interior)
        const mNieve = lambert(texNieve()), mHielo = lambert(texHieloBloque());
        const filas = Math.max(1, Math.round(alto / 0.75)), hb = alto / filas;
        const rp = azar(777);
        const tramo = (ini, fin, fijo, horizontal) => {
            const n = Math.max(1, Math.round((fin - ini) / ANCHO_BLOQUE)), w = (fin - ini) / n;
            for (let i = 0; i < n; i++) for (let f = 0; f < filas; f++) {
                const m = rp() < PROB_HIELO ? mHielo : mNieve, c = ini + (i + 0.5) * w, y = hb * (f + 0.5);
                if (horizontal) caja3(w, hb, gr, c, y, fijo, m); else caja3(gr, hb, w, fijo, y, c, m);
            }
        };
        tramo(-L / 2 - gr, L / 2 + gr, -W / 2 - gr / 2, true);
        tramo(-L / 2 - gr, L / 2 + gr, W / 2 + gr / 2, true);
        tramo(-W / 2, W / 2, -L / 2 - gr / 2, false);
        tramo(-W / 2, W / 2, L / 2 + gr / 2, false);

        // Barriles de madera con aros (decorado)
        const mMad = lambert(texMadera()), mAro = lambert(texAro());
        for (const [bx, bz] of (E.barriles || [])) {
            caja3(0.56, 0.8, 0.56, bx, 0.4, bz, mMad);
            for (const y of [0.18, 0.62]) caja3(0.62, 0.07, 0.62, bx, y, bz, mAro);
        }

        // Fogatas: troncos cruzados sobre piedras, llamas de cajas y luz puntual
        const mTronco = lambert(texTronco()), mPiedra = lambert(texPiedra());
        const posF = E.fogatas || [];
        for (const [fx, fz] of posF) {
            caja3(0.12, 0.12, 0.8, fx, 0.1, fz, mTronco, 0.5); caja3(0.12, 0.12, 0.8, fx, 0.1, fz, mTronco, -0.5);
            for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; caja3(0.18, 0.14, 0.18, fx + Math.cos(a) * 0.5, 0.07, fz + Math.sin(a) * 0.5, mPiedra, a); }
        }
        cerrarGrupos();
        llamaMats = [basico('#ff7a1c'), basico('#ffb030'), basico('#ffe070')];
        fogatas = [];
        luces = [];
        for (const [fx, fz] of posF) {
            const g = new THREE.Group(); g.position.set(fx, 0, fz); estatico.add(g);
            const llamas = [];
            for (let k = 0; k < FOGATA.llamas; k++) {
                const t = 1 - k * 0.28, m = new THREE.Mesh(new THREE.BoxGeometry(0.28 * t, 0.5 * t, 0.28 * t), llamaMats[k]);
                m.position.y = 0.2 + k * 0.05; m.rotation.y = k * 0.7; m.userData.base = 0.5 * t; g.add(m); recursos.push(m.geometry); llamas.push(m);
            }
            const pl = new THREE.PointLight(new THREE.Color(luz.fogata || '#ff9a40'), (luz.fogataFuerza ?? 1.6) * ESCALA_LUZ, FOGATA.distancia, FOGATA.decaimiento);
            pl.position.y = 0.8; g.add(pl);
            luces.push(pl);
            fogatas.push({ llamas, luz: pl, fase: fx * 1.7 + fz * 0.9, base: pl.intensity });
        }

        // Nieve que cae
        const N = Math.max(0, Math.round(E.nieve?.cantidad ?? 500)), radio = E.nieve?.radio ?? 14;
        if (N > 0) {
            const pos = new Float32Array(N * 3), rn = azar(31337);
            for (let i = 0; i < N; i++) { pos[i * 3] = (rn() * 2 - 1) * radio; pos[i * 3 + 1] = rn() * ALTO_NIEVE; pos[i * 3 + 2] = (rn() * 2 - 1) * radio; }
            const gn = new THREE.BufferGeometry(); gn.setAttribute('position', new THREE.BufferAttribute(pos, 3)); recursos.push(gn);
            const mn = new THREE.PointsMaterial({ map: tx(2, 2, () => [255, 255, 255]), size: TAM_COPO, sizeAttenuation: true, transparent: true, depthWrite: false, color: 0xffffff });
            recursos.push(mn);
            nieve = new THREE.Points(gn, mn); nieve.frustumCulled = false; estatico.add(nieve);
            nieve.userData = { radio, viento: E.nieve?.viento || [0.6, 0.15], caida: E.nieve?.caida ?? 1.1, fases: Float32Array.from({ length: N }, () => rn() * 6.28) };
        } else nieve = null;

        // Fondo: grada del público, iglú de Lalo y Moisés y unos pinos lejanos
        const P = R.publico || {}, dist = P.distancia ?? 1.6, zFila = -W / 2 - gr - dist;
        const nPub = (P.personas || []).length, anchoGrada = Math.max(6, nPub * ESPACIO_PUBLICO + 2);
        caja3(anchoGrada, PLATAFORMA, 1.4, 0, PLATAFORMA / 2, zFila, mNieve);
        const zI = zFila - IGLU.atras, rI = IGLU.radio, fr = azar(99);
        const altoAnillo = rI * (Math.PI / 2) / IGLU.anillos * 1.05;
        for (let j = 0; j < IGLU.anillos; j++) {
            const phi = (j + 0.5) / IGLU.anillos * (Math.PI / 2) * 0.97, rr = rI * Math.cos(phi), y = rI * Math.sin(phi);
            const n = Math.max(4, Math.floor(2 * Math.PI * rr / IGLU.bloque));
            for (let i = 0; i < n; i++) {
                const th = (i + (j % 2) * 0.5) / n * Math.PI * 2;
                if (j < 3 && Math.abs(Math.atan2(Math.sin(th - Math.PI / 2), Math.cos(th - Math.PI / 2))) < IGLU.puerta + 0.1 * (3 - j)) continue;
                caja3(2 * Math.PI * rr / n * 1.03, altoAnillo, 0.9, Math.cos(th) * rr, y, zI + Math.sin(th) * rr, fr() < 0.1 ? mHielo : mNieve, -th - Math.PI / 2);
            }
        }
        const mPuerta = lambert(texPuerta());
        caja3(1.5, 1.4, 0.3, 0, 0.7, zI + rI * 0.93, mPuerta);
        const mPino = lambert(texPino()), rt = azar(2024);
        for (let k = 0; k < ARBOLES.cantidad; k++) {
            const a = rt() * Math.PI * 2, rad = ARBOLES.radioMin + rt() * (ARBOLES.radioMax - ARBOLES.radioMin), x = Math.cos(a) * rad, z = Math.sin(a) * rad;
            if (Math.hypot(x, z - zI) < rI + 4) continue;
            const h = 1.2 + rt() * 1.6;
            caja3(0.5, h, 0.5, x, h / 2, z, mTronco);
            for (let c = 0; c < 4; c++) caja3(3.2 - c * 0.7, 1, 3.2 - c * 0.7, x, h + c * 0.8 + 0.4, z, mPino, rt() * 0.4);
        }
        cerrarGrupos();
        return { zFila };
    }

    // ---------- Personas ----------
    function monigote(color) {
        const lisa = c => (x, y, r) => ajustar(c, 0.95 + r() * 0.1);
        const piel = { cabeza: { frente: lisa(PIEL_MONIGOTE.cabeza) }, cuerpo: { frente: lisa(color || PIEL_MONIGOTE.cuerpo) }, brazo: { frente: lisa(color || PIEL_MONIGOTE.cuerpo) }, pierna: { frente: lisa(PIEL_MONIGOTE.pierna) } };
        const p = crearPersona(tinte, piel, 5100 + propios.length * 9);
        propios.push(p);
        return p;
    }
    function clonarPersona(orig) { return clonarConPartes(orig.g, orig); }
    function obtenerPersona(clave) {
        const orig = personasMundo ? personasMundo(clave) : null;
        if (orig && orig.g) return { p: clonarPersona(orig), propio: false };
        return { p: null, propio: true };
    }

    function peleador(clave) {
        if (peleadores.has(clave)) return peleadores.get(clave);
        let { p } = obtenerPersona(clave);
        if (!p) { const n = parseInt(String((R.peleadores?.[clave] || {}).aura || '#8080a0').slice(1), 16); p = monigote([(n >> 16) & 255, (n >> 8) & 255, n & 255]); }
        sinObjetosDeMano(p);
        const claves = Object.keys(R.peleadores || {}), i = Math.max(0, claves.indexOf(clave));
        const sep = R.marcas?.separacion ?? 3.2, lado = i === 0 ? -1 : 1;
        p.g.position.set((R.marcas?.x ?? 0) + lado * sep / 2, 0, R.marcas?.z ?? 0);
        p.g.rotation.y = lado < 0 ? Math.PI / 2 : -Math.PI / 2;
        scene.add(p.g);
        peleadores.set(clave, p);
        return p;
    }

    // Lo que el amigo lleva en el mundo colgado del cuerpo o de la muñeca (el vaso, el pito) no entra a la pelea:
    // solo quedan los huesos del rig y lo que cuelga de la cabeza y el pecho (sombrero, capucha). El público sí lo lleva.
    function sinObjetosDeMano(p) {
        const huesos = new Set(Object.values(p).filter(o => o && o.isObject3D));
        for (const k of ['cuerpo', 'munecaD', 'munecaI']) for (const h of (p[k] && p[k].children) || []) if (!huesos.has(h)) h.visible = false;
    }

    // El arma del estilo: el modelo 3D (katana y vaina, modelos-mano.js; agarre editable en objetos-mano.json) o, si el
    // estilo no trae modelo, una caja con su mango (arma.caja)
    const matArma = new THREE.MeshLambertMaterial({ vertexColors: true });
    function soltarArma(clave) {
        const previo = armas.get(clave);
        if (!previo) return;
        for (const o of [previo.g, previo.vaina]) if (o) { o.parent?.remove(o); o.traverse(q => { if (q.geometry) q.geometry.dispose(); }); }
        armas.delete(clave);
    }
    function armar(clave, arma) {
        const p = peleador(clave);
        soltarArma(clave);
        if (!arma) return;
        const puesta = arma.modelo ? colocarArma(THREE, p, arma, matArma, agarre) : null;
        if (puesta) {
            const esc = puesta.arma.children[0];
            armas.set(clave, { g: puesta.arma, vaina: puesta.vaina, def: arma, ver: versionObjetosMano(), local: esc, tramo: [KATANA.hoja[0], KATANA.hoja[1], KATANA.sori] });
            return;
        }
        if (!arma.caja) return;
        const muneca = arma.mano === 'I' ? p.munecaI : p.munecaD;
        if (!muneca) return;
        const [cx, cy, cz] = arma.caja.centro, [w, h, d] = arma.caja.medidas;
        const g = new THREE.Group();
        const hoja = caja(w, h, d, tinte.caras(texMetal())); hoja.position.set(cx, cy, cz); g.add(hoja);
        const largoMango = d * 0.22, mango = caja(w + 0.02, h + 0.02, largoMango, tinte.caras(texMango()));
        mango.position.set(cx, cy, cz - d / 2 + largoMango / 2); g.add(mango);
        muneca.add(g);
        armas.set(clave, { g, def: arma, ver: versionObjetosMano(), local: g, tramo: [cz - d / 2, cz + d / 2, 0] });
    }
    // Base y punta del tramo de la hoja [desde, hasta] (0 = la guarda, 1 = la punta) en el mundo, para la estela, las
    // chispas y el brillo de la carga. null si no tiene arma.
    const _hb = new THREE.Vector3(), _hp = new THREE.Vector3();
    function hoja(clave, desde = 0, hasta = 1) {
        const a = armas.get(clave);
        if (!a) return null;
        const [z0, z1, sori] = a.tramo, L = z1 - z0;
        a.local.updateWorldMatrix(true, false);
        _hb.set(0, sori * desde * desde, z0 + L * desde); a.local.localToWorld(_hb);
        _hp.set(0, sori * Math.min(1, hasta) ** 2, z0 + L * hasta); a.local.localToWorld(_hp);
        return { base: _hb, punta: _hp };
    }
    // El Estudio cambió el agarre (pestaña Objetos): se vuelve a armar
    function revisarArmas() {
        const v = versionObjetosMano();
        for (const [clave, a] of [...armas]) if (a.ver !== v) armar(clave, a.def);
    }

    // ---------- Público ----------
    let zFilaActual = 0;
    function armarPublico() {
        const P = R.publico || {}, claves = P.personas || [];
        for (const [c, o] of publico) if (!claves.includes(c)) { scene.remove(o.p.g); publico.delete(c); }
        const E = R.escenario || {}, gr = E.pared?.grosor ?? 1, W = E.ancho || 8;
        const zFila = -W / 2 - gr - (P.distancia ?? 1.6); zFilaActual = zFila;
        claves.forEach((c, i) => {
            const orig = personasMundo ? personasMundo(c) : null;
            if (!orig || !orig.g) { const o0 = publico.get(c); if (o0) { scene.remove(o0.p.g); publico.delete(c); } return; }
            let o = publico.get(c);
            if (!o) { o = { p: clonarPersona(orig), celeb: 0, fuerza: 0, fase: i * 1.9 }; scene.add(o.p.g); publico.set(c, o); }
            const x = (i - (claves.length - 1) / 2) * ESPACIO_PUBLICO;
            o.x = x;
            o.p.g.position.set(x, PLATAFORMA, zFila);
            o.p.g.rotation.y = Math.atan2(-x, -zFila);
        });
    }

    const ang = {};
    function dibujarPublico(dt, t) {
        for (const o of publico.values()) {
            for (const k in ang) ang[k] = 0;
            ang.y = 0;
            const s = Math.sin(t * BALANCEO.velocidad + o.fase);
            ang.cy = s * BALANCEO.giro; ang.rz = s * BALANCEO.giro * 0.25; ang.y = Math.abs(Math.sin(t * BALANCEO.velocidad * 0.5 + o.fase)) * BALANCEO.rebote;
            if (o.celeb > 0) {
                o.celeb = Math.max(0, o.celeb - dt);
                const u = 1 - o.celeb / CELEBRAR.duracion, env = Math.sin(Math.PI * u);
                ang.y += env * CELEBRAR.salto * o.fuerza;
                ang.bDx = ang.bIx = CELEBRAR.brazos * env * o.fuerza;
                ang.bDz = -0.2 * env; ang.bIz = 0.2 * env;
            }
            aplicarAngulos(o.p, ang);
        }
    }
    function celebrar(fuerza = 1) {
        const f = lim(fuerza, 0, 1);
        for (const o of publico.values()) { o.celeb = CELEBRAR.duracion * (0.85 + ((o.fase * 7) % 1) * 0.3); o.fuerza = f; }
    }

    // ---------- Cuadro a cuadro ----------
    function dibujar(dt, t) {
        reloj = t ?? reloj + dt;
        const parp = R.escenario?.luz?.parpadeo ?? 0.25;
        for (const f of fogatas) {
            const n = (Math.sin(reloj * 13 + f.fase) * 0.5 + Math.sin(reloj * 7.3 + f.fase * 2.1) * 0.35 + Math.sin(reloj * 23 + f.fase * 0.7) * 0.15);
            f.luz.intensity = f.base * (1 + parp * n);
            f.llamas.forEach((m, k) => {
                const e = 1 + 0.35 * Math.sin(reloj * (11 + k * 4) + f.fase + k);
                m.scale.y = e; m.position.y = 0.15 + m.userData.base * e / 2;
                m.scale.x = m.scale.z = 1 + 0.15 * Math.sin(reloj * 9 + k * 2 + f.fase);
            });
        }
        if (llamaMats.length) llamaMats[0].color.setHSL(0.07 + 0.015 * Math.sin(reloj * 9), 1, 0.55);
        if (nieve) {
            const u = nieve.userData, a = nieve.geometry.attributes.position, p = a.array, r = u.radio;
            for (let i = 0; i < p.length; i += 3) {
                const fase = u.fases[i / 3];
                p[i] += (u.viento[0] + Math.sin(reloj * 0.8 + fase) * 0.15) * dt;
                p[i + 1] -= u.caida * dt;
                p[i + 2] += (u.viento[1] + Math.cos(reloj * 0.7 + fase) * 0.15) * dt;
                if (p[i + 1] < 0) p[i + 1] += ALTO_NIEVE;
                if (p[i] > r) p[i] -= 2 * r; else if (p[i] < -r) p[i] += 2 * r;
                if (p[i + 2] > r) p[i + 2] -= 2 * r; else if (p[i + 2] < -r) p[i + 2] += 2 * r;
            }
            a.needsUpdate = true;
        }
        dibujarPublico(dt, reloj);
        revisarArmas();
        efectos.dibujar(dt);
    }

    // ---------- Cámaras de cara ----------
    const _p = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion();
    function cara(clave) {
        const p = peleador(clave);
        p.g.updateMatrixWorld(true);
        (p.cabeza || p.g).getWorldPosition(_p);
        p.g.getWorldQuaternion(_q);
        _f.set(0, 0, 1).applyQuaternion(_q);
        return { cabeza: _p.clone(), frente: _f.clone() };
    }
    function primerPlano(clave) {
        const { cabeza, frente } = cara(clave);
        return { pos: [cabeza.x + frente.x * PRIMER_PLANO.distancia, cabeza.y + PRIMER_PLANO.altura, cabeza.z + frente.z * PRIMER_PLANO.distancia], mira: [cabeza.x, cabeza.y, cabeza.z] };
    }
    function retrato(renderer, clave, lado = 128) {
        const { cabeza, frente } = cara(clave);
        const cam = new THREE.PerspectiveCamera(RETRATO.fov, 1, 0.1, 50);
        cam.position.copy(cabeza).addScaledVector(frente, RETRATO.distancia);
        cam.lookAt(cabeza);
        const aura = new THREE.Color(R.peleadores?.[clave]?.aura || '#888888').multiplyScalar(RETRATO.oscurecer);
        const rt = new THREE.WebGLRenderTarget(lado, lado, { colorSpace: THREE.SRGBColorSpace });
        const antes = { rt: renderer.getRenderTarget(), vp: renderer.getViewport(new THREE.Vector4()), sc: renderer.getScissor(new THREE.Vector4()), st: renderer.getScissorTest(), fondo: scene.background, niebla: scene.fog };
        const visNieve = nieve ? nieve.visible : true;
        scene.background = aura; scene.fog = null; if (nieve) nieve.visible = false;
        renderer.setRenderTarget(rt); renderer.setScissorTest(false); renderer.setViewport(0, 0, lado, lado);
        renderer.render(scene, cam);
        const buf = new Uint8Array(lado * lado * 4);
        renderer.readRenderTargetPixels(rt, 0, 0, lado, lado, buf);
        renderer.setRenderTarget(antes.rt); renderer.setViewport(antes.vp); renderer.setScissor(antes.sc); renderer.setScissorTest(antes.st);
        scene.background = antes.fondo; scene.fog = antes.niebla; if (nieve) nieve.visible = visNieve;
        rt.dispose();
        const c = document.createElement('canvas'); c.width = c.height = lado;
        const ctx = c.getContext('2d'), img = ctx.createImageData(lado, lado);
        for (let y = 0; y < lado; y++) img.data.set(buf.subarray((lado - 1 - y) * lado * 4, (lado - y) * lado * 4), y * lado * 4);
        ctx.putImageData(img, 0, 0);
        return c;
    }

    // ---------- Reconstrucción y limpieza ----------
    function liberarEstatico() {
        if (estatico) scene.remove(estatico);
        for (const r of recursos) if (r && r.dispose) r.dispose();
        recursos = []; fogatas = []; luces = []; llamaMats = []; nieve = null; estatico = null;
    }
    function aplicar(R2) {
        if (R2) R = R2;
        liberarEstatico();
        construirEstatico();
        armarPublico();
        efectos.aplicar(R);
    }
    function destruir() {
        liberarEstatico();
        efectos.destruir(); matArma.dispose();
        for (const c of [...armas.keys()]) soltarArma(c);
        for (const p of propios) p.g.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
            for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
        });
        scene.clear();
        peleadores.clear(); publico.clear(); armas.clear();
    }

    construirEstatico();
    armarPublico();
    for (const c of Object.keys(R.peleadores || {})) peleador(c);
    const efectos = crearEfectos(THREE, scene, R);

    return { scene, peleador, armar, hoja, efectos, dibujar, celebrar, primerPlano, retrato, aplicar, destruir };
}
