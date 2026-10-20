// =========================================================
// VENJY · Arena del duelo · efectos de los golpes (bloque 8 · L2, mundo/COMBATE.md §16.3 y §19.7)
// Los dibuja la escena de la arena (arena/escena.js) sobre su propia escena de Three; los valores vienen de los datos:
//   estela(clave, base, punta, op, aura, dt)   cinta pixel que sigue la hoja durante el activo (estilo-*.json →
//                                              ataques.<x>.efectos.estela); base y punta en el mundo, o null si ya no
//                                              está en el activo (la cinta se desvanece en `desvanecer` cuadros)
//   chispas(pos, n, tipo)                      chispas en el punto de choque (n = combate.json → peso.<x>.particulas;
//                                              tipo 'desvio' | 'perfecto' | 'bloqueo'); el perfecto suma un destello
//   carga(clave, base, punta, nivel)           brillo del filo mientras carga el golpe fuerte (nivel 0..1 en escalones)
//   dibujar(dt) / aplicar(R) / destruir()
// Los tamaños, colores, vidas y velocidades de chispas y destellos van en arena.json → efectos (Estudio → Arena).
// =========================================================
export const EFECTOS = {
    chispas: { vida: 0.35, velocidad: 3.2, gravedad: 9, tamano: 0.05, colores: ['#fff6c0', '#ffc040', '#ff8a20'] },
    perfecto: { destello: 0.12, tamano: 0.9, color: '#ffffff', chispasExtra: 1.5 },
    bloqueo: { escala: 0.5 },
    carga: { color: '#fff4c8', opacidad: 0.75, niveles: 3 },
    estela: { escalones: 4 }
};
const MAX_CHISPAS = 96;

export function crearEfectos(THREE, scene, R) {
    let E = fundir(EFECTOS, R && R.efectos);
    const recursos = [];
    const color = h => new THREE.Color(h || '#ffffff');

    // ---------- Estelas ----------
    // Por peleador: las últimas muestras de la hoja (base y punta) con su edad; una malla de tiras (3 vértices por
    // muestra: base, centro y punta) con color por vértice y alfa en escalones (se ve pixelado, no degradado liso)
    const estelas = new Map();
    function mallaEstela() {
        const n = 17, geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3 * 3), 3));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3 * 4), 4));
        const idx = [];
        for (let i = 0; i < n - 1; i++) for (let k = 0; k < 2; k++) {
            const a = i * 3 + k, b = a + 1, c2 = a + 3, d = a + 4;
            idx.push(a, c2, b, b, c2, d);
        }
        geo.setIndex(idx);
        const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false });
        const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 5;
        recursos.push(geo, mat); scene.add(m);
        return { m, geo, muestras: [], n, apagado: 0 };
    }
    const _c1 = new THREE.Color(), _c2 = new THREE.Color();
    function estela(clave, base, punta, op, aura, dt) {
        let s = estelas.get(clave);
        if (!s) { s = mallaEstela(); estelas.set(clave, s); }
        const cuadros = Math.max(2, Math.min(s.n - 1, (op && op.cuadros) || 6));
        if (base && punta && op) {
            s.op = op; s.aura = aura;
            s.muestras.push({ b: base.clone(), p: punta.clone() });
            while (s.muestras.length > cuadros + 1) s.muestras.shift();
            s.apagado = 0;
        } else if (s.muestras.length) {
            // Fuera del activo: se apaga en `desvanecer` cuadros (y las muestras viejas se van yendo)
            s.apagado += dt * 60;
            const des = Math.max(1, (s.op && s.op.desvanecer) || 8);
            if (s.apagado >= des) s.muestras.length = 0;
        }
        pintarEstela(s);
    }
    function pintarEstela(s) {
        const pos = s.geo.attributes.position.array, col = s.geo.attributes.color.array, N = s.muestras.length, op = s.op || {};
        if (N < 2) { s.m.visible = false; return; }
        s.m.visible = true;
        const des = Math.max(1, op.desvanecer || 8), apaga = Math.max(0, 1 - s.apagado / des);
        const escalones = Math.max(2, E.estela.escalones | 0), ancho = op.ancho ?? 1, opa = (op.opacidad ?? 0.9) * apaga;
        _c1.set(op.color || '#ffffff');
        _c2.set(!op.borde || op.borde === 'aura' ? s.aura || '#ffffff' : op.borde);
        for (let i = 0; i < s.n; i++) {
            const q = s.muestras[Math.min(i, N - 1)], u = N > 1 ? Math.min(i, N - 1) / (N - 1) : 1; // 0 = la más vieja
            // Más ancha en el centro del arco: el tramo de la hoja se escala alrededor de su punto medio
            const w = ancho * (0.45 + 0.55 * Math.sin(Math.PI * u));
            const mx = (q.b.x + q.p.x) / 2, my = (q.b.y + q.p.y) / 2, mz = (q.b.z + q.p.z) / 2;
            const v = [[mx + (q.b.x - mx) * w, my + (q.b.y - my) * w, mz + (q.b.z - mz) * w], [mx, my, mz], [mx + (q.p.x - mx) * w, my + (q.p.y - my) * w, mz + (q.p.z - mz) * w]];
            // Alfa en escalones: lo nuevo opaco, lo viejo transparente
            const a = Math.ceil(u * escalones) / escalones * opa;
            for (let k = 0; k < 3; k++) {
                const j = i * 3 + k;
                pos[j * 3] = v[k][0]; pos[j * 3 + 1] = v[k][1]; pos[j * 3 + 2] = v[k][2];
                const cc = k === 1 ? _c1 : _c2;
                col[j * 4] = cc.r; col[j * 4 + 1] = cc.g; col[j * 4 + 2] = cc.b; col[j * 4 + 3] = k === 1 ? a : a * 0.85;
            }
        }
        s.geo.attributes.position.needsUpdate = true; s.geo.attributes.color.needsUpdate = true;
        s.geo.computeBoundingSphere();
    }

    // ---------- Chispas y destello ----------
    const geoChispa = new THREE.BoxGeometry(1, 1, 1); recursos.push(geoChispa);
    const matsChispa = () => E.chispas.colores.map(h => { const m = new THREE.MeshBasicMaterial({ color: color(h), transparent: true, depthWrite: false }); recursos.push(m); return m; });
    let mats = matsChispa();
    const chispasV = [];
    for (let i = 0; i < MAX_CHISPAS; i++) {
        const m = new THREE.Mesh(geoChispa, mats[i % mats.length]); m.visible = false; m.renderOrder = 6; scene.add(m);
        chispasV.push({ m, v: new THREE.Vector3(), vida: 0, max: 1 });
    }
    let siguiente = 0;
    const matDestello = new THREE.MeshBasicMaterial({ color: color(E.perfecto.color), transparent: true, depthWrite: false, opacity: 0 });
    const geoDestello = new THREE.PlaneGeometry(1, 1); recursos.push(matDestello, geoDestello);
    const destello = new THREE.Mesh(geoDestello, matDestello); destello.visible = false; destello.renderOrder = 7; scene.add(destello);
    const destelloE = { t: 0, max: 1 };
    function chispas(p, n, tipo = 'desvio', camara = null) {
        const C = E.chispas, k = tipo === 'perfecto' ? E.perfecto.chispasExtra : tipo === 'bloqueo' ? E.bloqueo.escala : 1;
        const total = Math.min(MAX_CHISPAS, Math.round((n || 10) * k));
        for (let i = 0; i < total; i++) {
            const s = chispasV[siguiente]; siguiente = (siguiente + 1) % MAX_CHISPAS;
            const th = Math.random() * Math.PI * 2, fi = Math.acos(2 * Math.random() - 1), vel = C.velocidad * (0.4 + Math.random() * 0.8);
            s.v.set(Math.sin(fi) * Math.cos(th) * vel, Math.abs(Math.cos(fi)) * vel * 0.9 + 0.6, Math.sin(fi) * Math.sin(th) * vel);
            s.m.position.copy(p); s.m.scale.setScalar(C.tamano * (tipo === 'perfecto' ? 1.3 : 1)); s.m.visible = true;
            s.vida = s.max = C.vida * (0.6 + Math.random() * 0.6);
        }
        if (tipo === 'perfecto') {
            destello.position.copy(p); destello.visible = true;
            if (camara) destello.quaternion.copy(camara.quaternion);
            destelloE.t = destelloE.max = E.perfecto.destello;
        }
    }

    // ---------- Brillo de la carga ----------
    const cargas = new Map();
    function carga(clave, base, punta, nivel) {
        let s = cargas.get(clave);
        if (!s) {
            const mat = new THREE.MeshBasicMaterial({ color: color(E.carga.color), transparent: true, depthWrite: false, opacity: 0 });
            const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat); recursos.push(mat, m.geometry); m.renderOrder = 6; scene.add(m);
            s = { m, mat }; cargas.set(clave, s);
        }
        if (!base || !(nivel > 0)) { s.m.visible = false; return; }
        const pasos = Math.max(1, E.carga.niveles | 0), esc = Math.ceil(nivel * pasos) / pasos;
        s.m.visible = true;
        s.m.position.copy(base).lerp(punta, 0.5);
        s.m.lookAt(punta);
        const largo = base.distanceTo(punta), grueso = 0.03 + 0.05 * esc;
        s.m.scale.set(grueso, grueso, largo * (0.5 + 0.5 * esc));
        s.mat.opacity = E.carga.opacidad * esc;
    }

    function dibujar(dt) {
        const g = E.chispas.gravedad;
        for (const s of chispasV) {
            if (s.vida <= 0) continue;
            s.vida -= dt;
            if (s.vida <= 0) { s.m.visible = false; continue; }
            s.v.y -= g * dt;
            s.m.position.addScaledVector(s.v, dt);
            s.m.material.opacity = Math.min(1, s.vida / s.max * 2);
        }
        if (destelloE.t > 0) {
            destelloE.t -= dt;
            const u = Math.max(0, destelloE.t / destelloE.max);
            destello.visible = u > 0; matDestello.opacity = u;
            destello.scale.setScalar(E.perfecto.tamano * (1.3 - 0.3 * u));
        }
    }
    function aplicar(R2) {
        E = fundir(EFECTOS, R2 && R2.efectos);
        mats = matsChispa();
        chispasV.forEach((s, i) => { s.m.material = mats[i % mats.length]; });
        matDestello.color.set(E.perfecto.color);
        for (const s of cargas.values()) s.mat.color.set(E.carga.color);
    }
    function destruir() {
        for (const s of chispasV) scene.remove(s.m);
        for (const s of estelas.values()) scene.remove(s.m);
        for (const s of cargas.values()) scene.remove(s.m);
        scene.remove(destello);
        for (const r of recursos) if (r && r.dispose) r.dispose();
        estelas.clear(); cargas.clear();
    }
    return { estela, chispas, carga, dibujar, aplicar, destruir };
}

const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    const o = {};
    for (const k of Object.keys(base)) {
        const b = base[k], e = objeto(extra) ? extra[k] : undefined;
        if (objeto(b)) o[k] = fundir(b, e);
        else o[k] = e !== undefined && (Array.isArray(b) ? Array.isArray(e) : typeof e === typeof b) ? e : b;
    }
    return o;
}
