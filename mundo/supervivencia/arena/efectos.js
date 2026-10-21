// =========================================================
// VENJY · Arena del duelo · efectos de los golpes (bloque 8 · L2, mundo/COMBATE.md §16.3 y §19.7)
// Los dibuja la escena de la arena (arena/escena.js) sobre su propia escena de Three; los valores vienen de los datos:
//   estela(clave, base, punta, op, aura, dt)   cinta pixel que sigue la hoja durante el activo (estilo-*.json →
//                                              ataques.<x>.efectos.estela); base y punta en el mundo, o null si ya no
//                                              está en el activo (la cinta se desvanece en `desvanecer` cuadros)
//   chispas(pos, n, tipo)                      chispas en el punto de choque (n = combate.json → peso.<x>.particulas;
//                                              tipo 'desvio' | 'perfecto' | 'bloqueo'); el perfecto suma un destello
//   carga(clave, base, punta, nivel)           brillo del filo mientras carga el golpe fuerte (nivel 0..1 en escalones)
//   impacto(pos, nivel, camara, n)             (N5) golpe que entra: destello blanco, polvo gris y el aro según el nivel
//   polvo(x, z, motivo, superficie, escala)    (N5) polvo o nieve del suelo al caer, al chocar con la pared, al esquivar
//   aro(pos, camara, escala)                   (N5) onda pixel que se abre (desvío perfecto, golpes medios y fuertes)
//   sobre(clave, tipo, x, z, yaw, t)           (N5) estrellas del mareo o marca roja del pecho; tipo null = nada
//   dibujar(dt) / aplicar(R) / destruir()
// Los tamaños, colores, vidas y velocidades de chispas y destellos van en arena.json → efectos (Estudio → Arena).
// =========================================================
export const EFECTOS = {
    chispas: { vida: 0.35, velocidad: 3.2, gravedad: 9, tamano: 0.05, colores: ['#fff6c0', '#ffc040', '#ff8a20'] },
    perfecto: { destello: 0.12, tamano: 0.9, color: '#ffffff', chispasExtra: 1.5 },
    bloqueo: { escala: 0.5 },
    carga: { color: '#fff4c8', opacidad: 0.75, niveles: 3 },
    estela: { escalones: 4 },
    // N5 · peso de los golpes. impacto: destello blanco de 8×8 px (s, bloques) en el punto de contacto de un golpe que
    // entra. polvo: cubitos que se levantan del suelo (vida en s; velocidad y gravedad en bloques/s; cuántos según el
    // motivo; colores según la superficie del escenario). aro: onda pixel que se abre en el punto de choque (cubos en
    // un círculo de cara a la cámara; niveles en que sale). estrellas: las del mareo sobre la cabeza (vueltas por s).
    // marca: la roja del pecho del desequilibrado. topeCuadro: lo más de partículas nuevas por cuadro (Android).
    impacto: { destello: 0.05, tamano: 0.3, color: '#ffffff' },
    polvo: {
        vida: 0.55, velocidad: 1.3, gravedad: 2.2, tamano: 0.07,
        cuantos: { impacto: 8, caida: 16, esquiva: 6, pared: 10 },
        colores: { nieve: ['#ffffff', '#e8f0fa', '#c8d8ec'], hielo: ['#d8eefa', '#a8d4f0', '#ffffff'], tierra: ['#8a6a48', '#6a4e34', '#a88a64'] }
    },
    aro: { vida: 0.22, radio: 0.7, cubos: 14, tamano: 0.05, color: '#ffffff', niveles: ['medio', 'fuerte', 'perfecto', 'remate'] },
    estrellas: { color: '#ffff55', cuantas: 3, radio: 0.28, alto: 0.32, vueltas: 0.8, tamano: 0.07 },
    marca: { color: '#e81c1c', tamano: 0.16, alto: 1.25, frente: 0.2, parpadeo: 4 },
    topeCuadro: 40,
    // Capa de pantalla (arena/pantalla.js, un canvas de `resolucion` px de ancho escalado sin suavizar): líneas de
    // velocidad en los bordes, flash y viñeta (s y fuerza 0..1 por nivel del golpe) y números de daño (opcionales)
    pantalla: {
        resolucion: 192,
        lineas: { niveles: ['fuerte', 'remate'], dur: 0.3, cuantas: 22, largo: 0.22, color: '#ffffff' },
        flash: { perfecto: [0.08, 0.75], remate: [0.12, 0.6], fuerte: [0.04, 0.2], color: '#ffffff' },
        vineta: { niveles: ['fuerte', 'remate'], dur: 0.5, fuerza: 0.45, color: '#000000' },
        numeros: { activo: false, dur: 0.7, sube: 26, color: '#ffff55', critico: '#ff5555' }
    }
};
const MAX_CHISPAS = 96, MAX_POLVO = 160;

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
    // Tope de partículas nuevas por cuadro (lo que pase se pierde: en Android un remate no tumba el cuadro)
    let nuevas = 0;
    const cupo = n => { const m = Math.max(0, Math.min(n, (E.topeCuadro | 0) - nuevas)); nuevas += m; return m; };
    function chispas(p, n, tipo = 'desvio', camara = null) {
        const C = E.chispas, k = tipo === 'perfecto' ? E.perfecto.chispasExtra : tipo === 'bloqueo' ? E.bloqueo.escala : 1;
        const total = cupo(Math.min(MAX_CHISPAS, Math.round((n || 10) * k)));
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

    // ---------- Polvo, aro y destello del impacto (N5) ----------
    // Un solo grupo reciclado de cubitos, cada uno con su material (color y alfa propios); nada se crea por golpe
    const polvoV = [];
    for (let i = 0; i < MAX_POLVO; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }); recursos.push(mat);
        const m = new THREE.Mesh(geoChispa, mat); m.visible = false; m.renderOrder = 6; scene.add(m);
        polvoV.push({ m, mat, v: new THREE.Vector3(), vida: 0, max: 1, g: 0, t0: 1, crece: 0 });
    }
    let sigPolvo = 0;
    const tomar = () => { const s = polvoV[sigPolvo]; sigPolvo = (sigPolvo + 1) % MAX_POLVO; return s; };
    const matImpacto = new THREE.MeshBasicMaterial({ color: color(E.impacto.color), transparent: true, depthWrite: false, opacity: 0 });
    const golpeD = new THREE.Mesh(geoDestello, matImpacto); golpeD.visible = false; golpeD.renderOrder = 7; scene.add(golpeD);
    recursos.push(matImpacto);
    const golpeE = { t: 0, max: 1 };
    // Polvo del suelo en (x, z): motivo 'impacto' | 'caida' | 'esquiva' | 'pared'; superficie del escenario
    function polvo(x, z, motivo = 'caida', superficie = 'nieve', escala = 1) {
        const P = E.polvo, cols = P.colores[superficie] || P.colores.nieve || ['#ffffff'];
        const n = cupo(Math.round(((P.cuantos && P.cuantos[motivo]) || 8) * escala));
        for (let i = 0; i < n; i++) {
            const s = tomar(), a = Math.random() * Math.PI * 2, vel = P.velocidad * (0.5 + Math.random() * 0.7);
            s.v.set(Math.cos(a) * vel, P.velocidad * (0.35 + Math.random() * 0.5), Math.sin(a) * vel);
            s.m.position.set(x + Math.cos(a) * 0.15, 0.05, z + Math.sin(a) * 0.15);
            s.mat.color.set(cols[i % cols.length]);
            s.t0 = P.tamano * (0.7 + Math.random() * 0.6); s.crece = 0.6;
            s.m.scale.setScalar(s.t0); s.m.visible = true; s.g = P.gravedad;
            s.vida = s.max = P.vida * (0.6 + Math.random() * 0.6);
        }
    }
    // Golpe que entra: destello blanco y polvo gris en el punto; el aro sale en los niveles de E.aro.niveles
    function impacto(p, nivel = 'ligero', camara = null, particulas = 0) {
        golpeD.position.copy(p); golpeD.visible = true;
        if (camara) golpeD.quaternion.copy(camara.quaternion);
        golpeE.t = golpeE.max = E.impacto.destello;
        const n = cupo(Math.round((particulas || 0) * 0.6));
        for (let i = 0; i < n; i++) {
            const s = tomar(), th = Math.random() * Math.PI * 2, vel = E.polvo.velocidad * (0.6 + Math.random());
            s.v.set(Math.cos(th) * vel, Math.random() * vel * 0.6, Math.sin(th) * vel);
            s.m.position.copy(p); s.mat.color.set(i % 2 ? '#c6c6c6' : '#8b8b8b');
            s.t0 = E.polvo.tamano * 0.8; s.crece = 0.4; s.m.scale.setScalar(s.t0); s.m.visible = true; s.g = E.polvo.gravedad;
            s.vida = s.max = E.polvo.vida * 0.5;
        }
        if ((E.aro.niveles || []).includes(nivel)) aro(p, camara, nivel === 'remate' || nivel === 'perfecto' ? 1.4 : 1);
    }
    const _a = new THREE.Vector3(), _b = new THREE.Vector3();
    function aro(p, camara, escala = 1) {
        const A = E.aro, n = cupo(A.cubos | 0);
        // Los cubos salen en un círculo de cara a la cámara (o en el suelo si no hay cámara) y se frenan al abrirse
        if (camara) { _a.set(1, 0, 0).applyQuaternion(camara.quaternion); _b.set(0, 1, 0).applyQuaternion(camara.quaternion); }
        else { _a.set(1, 0, 0); _b.set(0, 0, 1); }
        for (let i = 0; i < n; i++) {
            const s = tomar(), th = i / n * Math.PI * 2, vel = A.radio * escala / A.vida;
            s.v.copy(_a).multiplyScalar(Math.cos(th) * vel).addScaledVector(_b, Math.sin(th) * vel);
            s.m.position.copy(p); s.mat.color.set(A.color);
            s.t0 = A.tamano * escala; s.crece = 0; s.m.scale.setScalar(s.t0); s.m.visible = true; s.g = 0;
            s.vida = s.max = A.vida;
        }
    }

    // ---------- Estrellas del mareo y marca roja (sobre un peleador mientras dura su reacción) ----------
    const sobres = new Map();
    function sobre(clave, tipo, x, z, yaw, t) {
        let s = sobres.get(clave);
        if (!s) {
            const g = new THREE.Group(); scene.add(g);
            const matE = new THREE.MeshBasicMaterial({ color: color(E.estrellas.color), depthWrite: false, transparent: true });
            const matM = new THREE.MeshBasicMaterial({ color: color(E.marca.color), depthWrite: false, transparent: true, side: THREE.DoubleSide });
            recursos.push(matE, matM);
            const estrellas = [];
            for (let i = 0; i < 6; i++) {
                // Estrella pixel: dos barras en cruz
                const e = new THREE.Group();
                e.add(new THREE.Mesh(geoChispa, matE)); const b = new THREE.Mesh(geoChispa, matE); b.scale.set(1 / 3, 3, 1 / 3); e.add(b);
                e.children[0].scale.set(3, 1 / 3, 1 / 3);
                g.add(e); estrellas.push(e);
            }
            const marcaM = new THREE.Mesh(geoDestello, matM); marcaM.rotation.z = Math.PI / 4; g.add(marcaM);
            s = { g, estrellas, marcaM, matE, matM }; sobres.set(clave, s);
        }
        if (!tipo) { s.g.visible = false; return; }
        s.g.visible = true; s.g.position.set(x, 0, z); s.g.rotation.set(0, yaw, 0);
        const S = E.estrellas, n = Math.min(6, S.cuantas | 0);
        s.estrellas.forEach((e, i) => {
            e.visible = tipo === 'estrellas' && i < n;
            if (!e.visible) return;
            const a = t * S.vueltas * Math.PI * 2 + i / n * Math.PI * 2;
            e.position.set(Math.cos(a) * S.radio, 1.9 + S.alto + Math.sin(a * 2) * 0.03, Math.sin(a) * S.radio);
            e.scale.setScalar(S.tamano / 3);
        });
        const M = E.marca;
        s.marcaM.visible = tipo === 'marcaRoja';
        if (s.marcaM.visible) {
            s.marcaM.position.set(0, M.alto, M.frente); s.marcaM.scale.setScalar(M.tamano);
            // Parpadea en escalones (no un brillo liso)
            s.matM.opacity = M.parpadeo > 0 && Math.floor(t * M.parpadeo) % 2 ? 0.55 : 1;
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
        nuevas = 0;
        for (const s of polvoV) {
            if (s.vida <= 0) continue;
            s.vida -= dt;
            if (s.vida <= 0) { s.m.visible = false; continue; }
            s.v.y -= s.g * dt;
            s.v.multiplyScalar(Math.max(0, 1 - 3 * dt));
            s.m.position.addScaledVector(s.v, dt);
            if (s.m.position.y < 0.02) { s.m.position.y = 0.02; s.v.y = 0; }
            const u = s.vida / s.max;
            // Se agranda un poco y se apaga en escalones de 4 (pixel)
            s.m.scale.setScalar(s.t0 * (1 + s.crece * (1 - u)));
            s.mat.opacity = Math.ceil(u * 4) / 4;
        }
        if (golpeE.t > 0) {
            golpeE.t -= dt;
            const u = Math.max(0, golpeE.t / golpeE.max);
            golpeD.visible = u > 0; matImpacto.opacity = u > 0.5 ? 1 : 0.6;
            golpeD.scale.setScalar(E.impacto.tamano);
        }
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
        matImpacto.color.set(E.impacto.color);
        for (const s of sobres.values()) { s.matE.color.set(E.estrellas.color); s.matM.color.set(E.marca.color); }
    }
    function destruir() {
        for (const s of chispasV) scene.remove(s.m);
        for (const s of polvoV) scene.remove(s.m);
        for (const s of sobres.values()) scene.remove(s.g);
        scene.remove(golpeD); sobres.clear();
        for (const s of estelas.values()) scene.remove(s.m);
        for (const s of cargas.values()) scene.remove(s.m);
        scene.remove(destello);
        for (const r of recursos) if (r && r.dispose) r.dispose();
        estelas.clear(); cargas.clear();
    }
    return { estela, chispas, carga, impacto, polvo, aro, sobre, dibujar, aplicar, destruir };
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
