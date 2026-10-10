// =========================================================
// VENJY · Supervivencia · Objetos tirados
// Lo que suelta un bloque roto, un animal, la muerte del jugador o la tecla Q. Los bloques se
// ven como cubitos con su textura y los objetos como un plano que gira hacia la cámara.
// Física simple contra los bloques, se juntan los iguales a menos de 1 bloque (también al soltar), el jugador los recoge
// al pasar y desaparecen a los 5 minutos (como en Minecraft).
// Online (api.red): cada objeto tiene un uid que viaja por la red; todos lo simulan, pero recogerlo
// lo decide el anfitrión (el primero que lo pide se lo lleva) y no se juntan pilas.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { BLOQUES, TIPO, TAM, COLS, FILAS } from '../texturas.js';
import { crearAtlasObjetos, uvObjeto } from './iconos.js';
import { sonidos } from './sonidos.js';
import { marcar } from '../voxeles.js';

const VIDA_OBJETO = 300;
const MAX_OBJETOS = 400;
const GRAVEDAD = 18;
const RADIO_RECOGER = 1.5;

function uvTile(tile, u, v) {
    const AW = COLS * TAM, AH = FILAS * TAM, EPS = 0.02;
    const tx = tile % COLS, ty = Math.floor(tile / COLS);
    const u0 = (tx * TAM + EPS) / AW, u1 = ((tx + 1) * TAM - EPS) / AW;
    const v1 = 1 - (ty * TAM + EPS) / AH, v0 = 1 - ((ty + 1) * TAM - EPS) / AH;
    return [u0 + (u1 - u0) * u, v0 + (v1 - v0) * v];
}

// Geometría de un cubito con las texturas del bloque (orden de caras de BoxGeometry: +x -x +y -y +z -z)
const geomCubos = new Map();
export function geometriaCubo(id) {
    if (geomCubos.has(id)) return geomCubos.get(id);
    const d = BLOQUES[id];
    const g = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const uv = g.attributes.uv;
    const tiles = [d.lado, d.lado, d.top, d.fondo, d.lado, d.lado];
    for (let cara = 0; cara < 6; cara++) {
        for (let k = 0; k < 4; k++) {
            const i = cara * 4 + k;
            const [u, v] = uvTile(tiles[cara], uv.getX(i), uv.getY(i));
            uv.setXY(i, u, v);
        }
    }
    // sombra por cara (como el mundo) en el color de vértice
    const sombra = [0.6, 0.6, 1, 0.5, 0.8, 0.8].map(s => Math.pow(s, 2.2));
    const col = new Float32Array(24 * 3);
    for (let cara = 0; cara < 6; cara++) for (let k = 0; k < 4; k++) col.set([sombra[cara], sombra[cara], sombra[cara]], (cara * 4 + k) * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geomCubos.set(id, g);
    return g;
}

// Plano de un objeto (o de una planta) con su celda del atlas
const geomPlanos = new Map();
function geometriaPlano(id) {
    if (geomPlanos.has(id)) return geomPlanos.get(id);
    const g = new THREE.PlaneGeometry(0.4, 0.4);
    const uv = g.attributes.uv;
    if (id >= 256) {
        const { u0, u1, v0, v1 } = uvObjeto(id);
        for (let i = 0; i < 4; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    } else {
        const tile = TIPO[id] === 4 ? BLOQUES[id].top : BLOQUES[id].lado;
        for (let i = 0; i < 4; i++) { const [u, v] = uvTile(tile, uv.getX(i), uv.getY(i)); uv.setXY(i, u, v); }
    }
    geomPlanos.set(id, g);
    return g;
}

export function crearEntidades({ scene, mundo, jugador, inventario, atlas, tinteMundo, alRecoger }) {
    const texObjetos = new THREE.CanvasTexture(crearAtlasObjetos());
    texObjetos.magFilter = THREE.NearestFilter; texObjetos.minFilter = THREE.NearestFilter;
    texObjetos.generateMipmaps = false; texObjetos.colorSpace = THREE.SRGBColorSpace;
    const lista = [];
    const api = { red: null, prefijo: 'o' };
    let relojJuntar = 0, contador = 0;
    const tinte = new THREE.Color();

    const esCubo = id => id < 256 && BLOQUES[id] && (TIPO[id] === 1 || TIPO[id] === 2 || TIPO[id] === 5);

    function crearMalla(id) {
        let m;
        if (esCubo(id)) m = new THREE.Mesh(geometriaCubo(id), new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5 }));
        else m = new THREE.Mesh(geometriaPlano(id), new THREE.MeshBasicMaterial({ map: id >= 256 ? texObjetos : atlas, alphaTest: 0.5, side: THREE.DoubleSide }));
        scene.add(m);
        return m;
    }

    // Suelta una pila en (x, y, z). vel opcional; `demora` antes de poder recogerla (s).
    // `uid`: solo para objetos que llegan por la red (no se vuelven a difundir)
    function soltar(id, n, d, x, y, z, vel = null, demora = 0.5, uid = null) {
        if (!id || n <= 0) return null;
        const t0 = performance.now();
        // Sin red: si ya hay una pila igual a menos de 1 bloque, se suma a ella (7b-1: una explosión no
        // crea decenas de mallas). Online no se juntan pilas (cada una tiene su uid).
        if (!api.red && !uid && !d) {
            const otra = lista.find(e => e.id === id && !e.d && e.edad > 0.2 && (e.pos.x - x) ** 2 + (e.pos.y - y) ** 2 + (e.pos.z - z) ** 2 < 1);
            if (otra) { otra.n += n; otra.edad = 0; otra.quieto = false; marcar('soltar', t0); return otra; }
        }
        if (lista.length >= MAX_OBJETOS) quitar(lista[0]);
        const e = {
            uid: uid || api.prefijo + (contador++).toString(36),
            id, n, d: d || 0,
            pos: new THREE.Vector3(x, y, z),
            vel: vel ? vel.clone() : new THREE.Vector3((Math.random() - 0.5) * 2, 3 + Math.random(), (Math.random() - 0.5) * 2),
            edad: 0, demora, fase: Math.random() * 6, quieto: false,
            malla: crearMalla(id)
        };
        e.malla.position.copy(e.pos);
        lista.push(e);
        if (api.red && !uid) api.red.soltado(e);
        marcar('soltar', t0);
        return e;
    }
    const porUid = u => lista.find(e => e.uid === u) || null;

    function quitar(e) {
        const i = lista.indexOf(e);
        if (i >= 0) lista.splice(i, 1);
        scene.remove(e.malla);
        e.malla.material.dispose();
    }

    const solido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id === -1 || TIPO[id] === 1 || TIPO[id] === 6; };

    function fisica(e, dt) {
        const p = e.pos, v = e.vel;
        const enAgua = mundo.bloque(p.x, p.y, p.z) === 6;
        // Si quedó dentro de un bloque (lo taparon), sube
        if (solido(p.x, p.y, p.z)) { p.y = Math.floor(p.y) + 1.01; v.set(0, 0, 0); e.quieto = false; return; }
        if (e.quieto && solido(p.x, p.y - 0.2, p.z)) return;
        e.quieto = false;
        v.y -= (enAgua ? 2 : GRAVEDAD) * dt;
        if (enAgua) { v.y = Math.max(v.y, -1); v.y += 4 * dt; }
        const nx = p.x + v.x * dt, nz = p.z + v.z * dt;
        if (!solido(nx, p.y + 0.1, p.z)) p.x = nx; else v.x *= -0.3;
        if (!solido(p.x, p.y + 0.1, nz)) p.z = nz; else v.z *= -0.3;
        const ny = p.y + v.y * dt;
        if (v.y < 0 && solido(p.x, ny - 0.12, p.z)) {
            p.y = Math.floor(ny - 0.12) + 1.12;
            v.y = 0;
            v.x *= 0.5; v.z *= 0.5;
            if (Math.abs(v.x) + Math.abs(v.z) < 0.05) { v.x = v.z = 0; e.quieto = true; }
        } else if (v.y > 0 && solido(p.x, ny + 0.15, p.z)) v.y = 0;
        else p.y = ny;
        const roce = Math.exp(-(e.quieto ? 8 : 1.2) * dt);
        v.x *= roce; v.z *= roce;
        if (p.y < -5) e.edad = VIDA_OBJETO;
    }

    function juntar() {
        for (let i = 0; i < lista.length; i++) {
            const a = lista[i];
            if (a.d) continue;
            for (let j = i + 1; j < lista.length; j++) {
                const b = lista[j];
                if (b.id !== a.id || b.d || a.pos.distanceToSquared(b.pos) >= 1) continue; // a menos de 1 bloque, como Minecraft
                a.n += b.n; a.edad = Math.min(a.edad, b.edad);
                quitar(b); j--;
            }
        }
    }

    function actualizar(dt, camara) {
        const ox = jugador.pos.x, oy = jugador.pos.y + 0.8, oz = jugador.pos.z;
        relojJuntar += dt;
        if (relojJuntar > 0.5) { relojJuntar = 0; if (!api.red) juntar(); }
        const tCielo = tinteMundo || null; // color de luz del cielo según la hora (el mismo de los chunks)
        for (let i = lista.length - 1; i >= 0; i--) {
            const e = lista[i];
            e.edad += dt;
            if (e.edad >= VIDA_OBJETO) { quitar(e); continue; }
            const dx = e.pos.x - ox, dy = e.pos.y - oy, dz = e.pos.z - oz;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > 80 * 80) continue; // lejos: no se simula ni se dibuja
            fisica(e, dt);
            // Recoger
            // Online, el invitado pide el objeto al anfitrión y lo recibe al confirmarse (coop.js)
            if (e.edad > e.demora && d2 < RADIO_RECOGER * RADIO_RECOGER && jugador.vivo !== false && (!api.red || api.red.puedeTomar(e))) {
                const resto = inventario.agregar(e.id, e.n, e.d);
                if (resto < e.n) {
                    sonidos.recoger();
                    alRecoger && alRecoger(e.id, e.n - resto);
                    if (resto === 0) { quitar(e); api.red && api.red.tomado(e, 0); continue; }
                    e.n = resto;
                    api.red && api.red.tomado(e, resto);
                }
            }
            // Dibujo: flota y gira; brillo según la luz del lugar
            e.fase += dt * 2;
            const m = e.malla;
            m.position.set(e.pos.x, e.pos.y + 0.12 + Math.sin(e.fase) * 0.05, e.pos.z);
            if (esCubo(e.id)) m.rotation.y = e.fase * 0.6;
            else m.rotation.y = Math.atan2(camara.position.x - e.pos.x, camara.position.z - e.pos.z);
            const luz = mundo.nivelLuz(e.pos.x, e.pos.y + 0.3, e.pos.z);
            const cieloL = luz >= 0 ? (luz >> 4) / 15 : 1, bloqueL = luz >= 0 ? (luz & 15) / 15 : 0;
            if (tCielo) tinte.copy(tCielo).multiplyScalar(Math.pow(cieloL, 1.6)); else tinte.setScalar(Math.pow(cieloL, 1.6));
            const b = Math.pow(bloqueL, 1.6);
            m.material.color.setRGB(Math.max(tinte.r, b, 0.06), Math.max(tinte.g, b * 0.85, 0.06), Math.max(tinte.b, b * 0.6, 0.06));
        }
    }

    function serializar() {
        return lista.filter(e => e.edad < VIDA_OBJETO - 5).map(e => [e.id, e.n, e.d, +e.pos.x.toFixed(2), +e.pos.y.toFixed(2), +e.pos.z.toFixed(2), Math.round(e.edad), e.uid]);
    }
    function cargar(arr) {
        for (const e of lista.slice()) quitar(e);
        for (const [id, n, d, x, y, z, edad, uid] of arr || []) {
            const e = soltar(id, n, d, x, y, z, new THREE.Vector3(), 0, uid || null);
            if (e) e.edad = edad || 0;
        }
    }

    return { lista, soltar, quitar, actualizar, serializar, cargar, porUid, api };
}
