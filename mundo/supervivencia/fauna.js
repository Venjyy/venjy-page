// =========================================================
// VENJY · Supervivencia · Fauna de ambiente (7f-3, parte 5)
// Mariposas y abejas de día junto a las flores, peces que saltan en los lagos y luciérnagas de noche en el
// borde del bosque. Dónde hay fauna (anclas) y cómo se mueve cada bicho: mundo/fauna.js (puro, determinista).
// Aquí solo se dibuja: un InstancedMesh por especie (4 llamadas de dibujo en total), tope de 64 bichos vivos
// (TOPES) y solo cerca del jugador (anclas a < 56 bloques; se quitan pasados 64). No hay estado por bicho:
// cada posición sale del tiempo, así que el costo por cuadro es ~64 posiciones y 64 matrices.
// Es solo adorno de este cliente (no viaja por la red, no se guarda). Se carga con import() desde main.js.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { colocarFauna, criaturaEn, ESPECIES_DE, FAUNA, TOPES } from '../fauna.js';
import { ESCALA, NIVEL_AGUA } from '../voxeles.js';

const ESPECIES = ['mariposa', 'abeja', 'pez', 'luciernaga'];
// Tamaño (bloques) del cuadro de cada especie
const TAMANO = { mariposa: [0.42, 0.34], abeja: [0.26, 0.2], pez: [0.5, 0.26], luciernaga: [0.14, 0.14] };
const COLORES_MARIPOSA = [0xffd23a, 0xff8a2a, 0xf4f0e6, 0x7cc8ff, 0xe86bd0];

// Texturas pixeladas dibujadas en canvas (como los íconos y el atlas: no hay imágenes para esto)
function pintar(ancho, alto, filas, paleta) {
    const c = document.createElement('canvas');
    c.width = ancho; c.height = alto;
    const g = c.getContext('2d');
    filas.forEach((fila, y) => [...fila].forEach((ch, x) => {
        if (paleta[ch]) { g.fillStyle = paleta[ch]; g.fillRect(x, y, 1, 1); }
    }));
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    return tex;
}
const TEXTURAS = {
    // Alas abiertas, de frente (el aleteo aplasta el ancho); el color lo pone instanceColor
    mariposa: () => pintar(7, 5, ['aa...aa', 'aaa.aaa', 'aab.baa', '.aa.aa.', '.a...a.'], { a: '#ffffff', b: '#3a2a1a' }),
    abeja: () => pintar(6, 4, ['.ww.w.', 'ykykyk', 'ykykyk', '.ww.w.'], { w: '#d8f0ff', y: '#f5c518', k: '#2b2118' }),
    pez: () => pintar(8, 4, ['...ff...', 'fffffffe', 'fffffffe', '...ff...'], { f: '#6fb7d6', e: '#162a35' }),
    luciernaga: () => pintar(4, 4, ['.gg.', 'gGGg', 'gGGg', '.gg.'], { g: '#c8ff5a', G: '#f6ffb0' })
};

export function crearFauna({ scene, camara, jugador, dia, terreno, datos, dy, anclas: anclasDadas = null }) {
    const anclas = anclasDadas || colocarFauna(terreno, datos, ESCALA, NIVEL_AGUA); // `anclasDadas`: solo para pruebas
    const malla = {};
    const geo = new THREE.PlaneGeometry(1, 1);
    for (const e of ESPECIES) {
        const luz = e === 'luciernaga';
        const mat = new THREE.MeshBasicMaterial({
            map: TEXTURAS[e](), transparent: true, alphaTest: luz ? 0 : 0.5, side: THREE.DoubleSide,
            depthWrite: !luz, blending: luz ? THREE.AdditiveBlending : THREE.NormalBlending
        });
        const m = new THREE.InstancedMesh(geo, mat, TOPES[e]);
        m.setColorAt(0, new THREE.Color(1, 1, 1)); // crea instanceColor (antes de bajar `count`)
        m.count = 0; m.frustumCulled = false; m.renderOrder = luz ? 3 : 2;
        scene.add(m);
        malla[e] = m;
    }
    const activas = new Map(); // i del ancla -> ancla
    let t = 0, reloj = 0;
    const q = new THREE.Quaternion(), qz = new THREE.Quaternion(), pos = new THREE.Vector3(), esc = new THREE.Vector3(), M = new THREE.Matrix4(), col = new THREE.Color(), qc = new THREE.Quaternion(), derecha = new THREE.Vector3();
    const EJE_Z = new THREE.Vector3(0, 0, 1);
    const { HT, BW, BD } = terreno;
    const suelo = (x, z) => {
        const ix = Math.floor(x), iz = Math.floor(z);
        return ix >= 0 && iz >= 0 && ix < BW && iz < BD ? HT[iz * BW + ix] + 1 : 0;
    };

    // Elige las anclas activas: se conservan las que siguen a < 48; se suman las de < 40 más cercanas mientras
    // quede cupo de cada especie. Un ancla solo cuenta si el jugador está cerca de su altura (no bajo tierra).
    function reelegir() {
        const p = jugador.pos;
        const uso = { mariposa: 0, abeja: 0, pez: 0, luciernaga: 0 };
        const cerca = a => Math.hypot(p.x - (a.x + 0.5), p.z - (a.z + 0.5));
        const altura = a => Math.abs(p.y - (a.y + dy + 1)) < 24;
        for (const [i, a] of activas) {
            if (cerca(a) > FAUNA.inactiva || !altura(a)) { activas.delete(i); continue; }
            for (const e of ESPECIES_DE[a.tipo]) uso[e] += FAUNA.porAncla[e];
        }
        const candidatas = anclas.filter(a => !activas.has(a.i) && cerca(a) < FAUNA.activa && altura(a)).sort((a, b) => cerca(a) - cerca(b));
        for (const a of candidatas) {
            const cabe = ESPECIES_DE[a.tipo].every(e => uso[e] + FAUNA.porAncla[e] <= TOPES[e]);
            if (!cabe) continue;
            for (const e of ESPECIES_DE[a.tipo]) uso[e] += FAUNA.porAncla[e];
            activas.set(a.i, a);
        }
    }

    return {
        anclas,
        total: () => ESPECIES.reduce((n, e) => n + malla[e].count, 0),
        activas: () => activas.size,
        actualizar(dt) {
            t += dt; reloj -= dt;
            if (reloj <= 0) { reloj = 0.5; reelegir(); }
            const noche = dia.esNoche;
            const n = { mariposa: 0, abeja: 0, pez: 0, luciernaga: 0 };
            camara.getWorldQuaternion(q);
            derecha.set(1, 0, 0).applyQuaternion(q);
            for (const a of activas.values()) {
                for (const e of ESPECIES_DE[a.tipo]) {
                    if (e === 'luciernaga' ? !noche : (noche && e !== 'pez')) continue; // luciérnagas de noche; el resto, de día (los peces siempre)
                    const m = malla[e], k0 = FAUNA.porAncla[e];
                    for (let k = 0; k < k0; k++) {
                        const c = criaturaEn(e, a, k, t);
                        if (!c.vis) continue;
                        const idx = n[e]++;
                        const y = e === 'pez' ? c.y : Math.max(c.y, suelo(c.x, c.z) + 0.6);
                        pos.set(c.x, y + dy, c.z);
                        const [w, h] = TAMANO[e];
                        let ax = w;
                        if (e === 'mariposa') ax = w * (0.25 + 0.75 * Math.abs(Math.sin(t * 11 + a.i * 3 + k)));
                        else if (e === 'abeja') ax = w * (0.7 + 0.3 * Math.abs(Math.sin(t * 40 + k)));
                        if (e === 'pez') {
                            // Mira hacia donde salta: el lado de la pantalla lo da el producto con el «derecha» de la cámara
                            const lado = (Math.cos(c.rumbo) * derecha.x + Math.sin(c.rumbo) * derecha.z) >= 0 ? 1 : -1;
                            esc.set(w * lado, h, 1);
                            qz.setFromAxisAngle(EJE_Z, c.ang * lado);
                            M.compose(pos, qc.copy(q).multiply(qz), esc);
                        } else { esc.set(ax, h, 1); M.compose(pos, q, esc); }
                        m.setMatrixAt(idx, M);
                        if (e === 'mariposa') col.setHex(COLORES_MARIPOSA[(a.i + k) % COLORES_MARIPOSA.length]);
                        else if (e === 'luciernaga') col.setRGB(c.br, c.br, c.br * 0.6).multiplyScalar(0.9);
                        else col.setRGB(1, 1, 1);
                        m.setColorAt(idx, col);
                    }
                }
            }
            for (const e of ESPECIES) {
                const m = malla[e];
                m.count = n[e];
                m.instanceMatrix.needsUpdate = true;
                if (m.instanceColor) m.instanceColor.needsUpdate = true;
            }
        },
        quitar() {
            for (const e of ESPECIES) { scene.remove(malla[e]); malla[e].material.map.dispose(); malla[e].material.dispose(); malla[e].dispose(); }
            geo.dispose();
        }
    };
}
