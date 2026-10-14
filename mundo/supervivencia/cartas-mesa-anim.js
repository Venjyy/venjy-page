// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel: animaciones de la mesa 3D (pulido, PR 1)
// Recibe los eventos de `aplicar` (cartas.js) después de aplicar la jugada y los reproduce encima del estado
// final: la carta robada sale del mazo a la mano, la jugada vuela a su zona y se voltea (las de Lucho, desde su
// mano), la que ataca embiste, la golpeada tiembla, el daño flota en números y la vida baja, la que muere se
// pone roja y viaja al descarte, los hechizos se muestran sobre la mesa con su color, etc.
// Salen solo de los eventos (no de la jugada): en un duelo de 2 jugadores cada equipo anima lo mismo.
// Sin animación el estado es el mismo: tocar la pantalla la termina al tiro (anim.tocarSalta).
// La línea de tiempo es pura (cartas-anim-modelo.js); los tiempos y colores vienen de L (cartas-mesa.json).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { planificar, ocupanteEn, suave, sale0, rival } from './cartas-anim-modelo.js';
import { ALTO_CARTA, posZona, posManoRival, posMazo, posDesc, posMano } from './cartas-mesa-modelo.js';

// api: la mesa le presta lo que necesita (ver crearMesaCartas)
//   L(), estado(), efimeros (grupo en el local de la mesa), geo(), tex(id), reverso(),
//   zonaMesh(j, z), manoMesh(i), manoRivalMesh(i), tam() → { x, y } del lienzo,
//   pantalla(x, y, z) → { x, y } px desde arriba (o null), desdePantalla(x, yAbajo, dist) → Vector3 local,
//   destinoMano(i) → { x, y, w, h, giro } de tu carta i, efectoDe(id), capa (DOM para los números),
//   texto(evento turno), vida(j, n), refrescar(), alTerminar(), sonido(paso) (opcional: suena al empezar cada paso)
//   mirando (opcional, quien mira un duelo ajeno): las dos manos van boca abajo en la mesa (manoMesh = la del lado 0)
//   y texto() puede devolver null (sin cartel de turno)
export function crearAnimador(api) {
    let plan = null, t = 0, pend = [0, 0];
    const fantasmas = new Map(); // segmento → malla
    const extras = new Map();    // k del paso → { mallas: [], dom: [] }
    const destacados = new Set();// mallas reales tocadas este cuadro (para devolverlas a su sitio)
    const color = new THREE.Color(), BLANCO = new THREE.Color(1, 1, 1);
    const v = new THREE.Vector3(), w = new THREE.Vector3();

    const L = () => api.L();
    const alto = () => L().mesa.alto;
    const empezo = k => k < 0 || (plan && t >= plan.pasos[k].ini);
    const termino = k => plan && k >= 0 && t >= plan.pasos[k].ini + plan.pasos[k].dur;
    const avance = p => (p.dur > 0 ? Math.min(1, Math.max(0, (t - p.ini) / p.dur)) : t >= p.ini ? 1 : 0);
    const tramo = (u, a, b) => Math.min(1, Math.max(0, (u - a) / (b - a)));

    // ---------- Mallas propias de la animación ----------
    function cartaSuelta(id) {
        const m = new THREE.Mesh(api.geo(), new THREE.MeshBasicMaterial({ map: id ? api.tex(id) : api.reverso(), transparent: true, alphaTest: 0.02, side: THREE.DoubleSide, depthWrite: true }));
        m.userData.cara = m.material.map; m.userData.efimera = true; m.rotation.order = 'XYZ';
        api.efimeros.add(m);
        return m;
    }
    function brillo(hex) {
        const cw = L().carta.ancho, ch = cw * ALTO_CARTA, s = ch + 0.06;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        m.rotation.x = -Math.PI / 2; m.userData.efimera = true;
        api.efimeros.add(m);
        return m;
    }
    function quitar(m) {
        api.efimeros.remove(m);
        m.material.dispose();
        if (m.geometry !== api.geo()) m.geometry.dispose();
    }
    function extra(k) { let x = extras.get(k); if (!x) extras.set(k, x = { mallas: [], dom: [] }); return x; }
    function numero(k, texto, hex) {
        const x = extra(k);
        if (x.dom.length) return x.dom[0];
        const d = document.createElement('div'); d.className = 'cartas-fx-num'; d.textContent = texto;
        d.style.color = hex; d.style.fontSize = `${L().anim.numero}px`;
        api.capa.appendChild(d); x.dom.push(d);
        return d;
    }
    function banner(k, texto) {
        const x = extra(k);
        if (x.dom.length) return x.dom[0];
        const d = document.createElement('div'); d.className = 'cartas-fx-turno'; d.textContent = texto;
        api.capa.appendChild(d); x.dom.push(d);
        return d;
    }

    // ---------- Puntos (local de la mesa) ----------
    const enZona = (j, z, y = 0.004) => { const p = posZona(L(), j, z); return v.set(p.x, alto() + y, p.z).clone(); };
    const enMazo = j => { const p = posMazo(L(), j); return new THREE.Vector3(p.x, alto() + 0.05, p.z); };
    const enDesc = j => { const p = posDesc(L(), j); return new THREE.Vector3(p.x, alto() + 0.01, p.z); };
    // La mano en la mesa del lado j (la del lado 0 solo se dibuja ahí para quien mira: espejada)
    const enManoRival = (i, n, j = 1) => { const p = posManoRival(L(), i, Math.max(1, n)); return j === 1 ? new THREE.Vector3(p.x, p.y, p.z) : new THREE.Vector3(-p.x, p.y, -p.z); };
    const enMano = (j, m, n) => (j === 0 && !api.mirando ? enManoPropia(m, n) : enManoRival(m, n, j));
    function enManoPropia(m, n) {
        const T = api.tam(), p = posMano(L(), Math.max(0, m), Math.max(1, n), T.x, T.y);
        return api.desdePantalla(p.x, p.y, 0.45);
    }
    function origen(p) {
        const e = api.estado();
        if (p.de === 'mazo') return enMazo(p.j);
        if (p.de === 'desc') return enDesc(p.j);
        if (p.de === 'mesa') return enZona(p.j, p.z);
        const n = e.jug[p.j].mano.length - plan.manos[p.j].length + 1;
        const m = p.m ?? Math.floor(n / 2);
        return enMano(p.j, m, n);
    }
    // La carta que ocupa (j, z) en el paso k: un fantasma (se va en esta jugada) o la del estado final
    function actor(j, z, k) {
        const s = ocupanteEn(plan, j, z, k);
        if (s && s.hasta !== null) return fantasmas.get(s) || null;
        return api.zonaMesh(j, z);
    }
    function tocar(m) {
        if (!m) return null;
        if (!m.userData.efimera) {
            if (!m.userData.base) m.userData.base = { p: m.position.clone(), r: m.rotation.clone() };
            destacados.add(m);
        }
        return m;
    }
    const arco = (u, h = L().anim.arco) => Math.sin(Math.PI * Math.min(1, Math.max(0, u))) * h;

    // ---------- Pasos ----------
    function animarPaso(p) {
        const u = avance(p), s = suave(u), A = L().anim, C = L().colores, k = p.k;
        switch (p.t) {
            case 'invoca': {
                const m = tocar(actor(p.j, p.z, k)); if (!m) break;
                const fin = m.userData.efimera ? enZona(p.j, p.z) : m.userData.base.p, rz = m.userData.efimera ? 0 : m.userData.base.r.z;
                if (p.de === 'mesa') { // el Slimecito brota en su zona
                    const e = sale0(tramo(u, 0, 0.7)) * (1 + 0.15 * Math.sin(Math.PI * tramo(u, 0.5, 1)));
                    m.scale.setScalar(Math.max(0.001, e)); break;
                }
                const o = origen(p);
                m.position.lerpVectors(o, fin, s); m.position.y += arco(u);
                // Las que llegan boca abajo (Lucho, mazo, descarte) se voltean en el aire; la tuya cae con un golpe
                const voltea = p.j === 1 || p.de === 'mazo' || p.de === 'desc';
                const ry = voltea ? Math.PI * (1 - s) : 0;
                m.rotation.set(-Math.PI / 2 + (1 - s) * 0.6, ry, rz * s);
                m.material.map = ry > Math.PI / 2 ? api.reverso() : (m.userData.cara || m.material.map);
                m.scale.setScalar(1 + 0.12 * Math.sin(Math.PI * tramo(u, 0.8, 1)));
                break;
            }
            case 'hechizo': {
                const x = extra(k);
                if (!x.mallas.length) { x.mallas.push(cartaSuelta(p.c), brillo(C[api.efectoDe(p.c)] || C.efecto)); x.o = origen(p); }
                const [m, b] = x.mallas, alto0 = alto() + A.alzar, centro = new THREE.Vector3(0, alto0, 0.02);
                m.visible = u < 1; b.visible = u > 0.25 && u < 0.85;
                if (u < 0.3) {
                    const a = suave(tramo(u, 0, 0.3)), ry = p.j === 1 ? Math.PI * (1 - a) : 0;
                    m.position.lerpVectors(x.o, centro, a); m.rotation.set(-Math.PI / 2 + 0.9 * a, ry, 0);
                    m.material.map = ry > Math.PI / 2 ? api.reverso() : m.userData.cara;
                    m.scale.setScalar(1);
                } else if (u < 0.72) {
                    const a = tramo(u, 0.3, 0.72);
                    m.position.copy(centro); m.position.y += 0.02 * Math.sin(a * Math.PI * 2);
                    m.rotation.set(-Math.PI / 2 + 0.9, 0, 0); m.material.map = m.userData.cara; m.scale.setScalar(1 + 0.08 * Math.sin(a * Math.PI));
                    b.position.set(0, alto() + 0.004, 0.02);
                    b.scale.setScalar(1 + (A.pulso - 1) * a); b.material.opacity = 0.85 * (1 - a);
                } else {
                    const a = suave(tramo(u, 0.72, 1));
                    m.position.lerpVectors(centro, enDesc(p.j), a); m.position.y += arco(a, 0.06);
                    m.rotation.set(-Math.PI / 2 + 0.9 * (1 - a), 0, 0); m.scale.setScalar(1 - 0.1 * a);
                }
                break;
            }
            case 'efecto': case 'escudo': case 'salva': case 'atada': {
                const x = extra(k), hex = p.t === 'efecto' ? (p.ef === 'explota' ? C.dano : p.ef === 'pocion' ? C.cura : C.efecto) : C[p.t];
                if (!x.mallas.length) { x.mallas.push(brillo(hex)); if (p.t === 'efecto' && p.obj !== undefined && p.obj >= 0) x.mallas.push(brillo(hex)); }
                const zonas = [[p.j, p.z], [rival(p.j), p.obj]];
                x.mallas.forEach((b, i) => {
                    const [jj, zz] = zonas[i], c = enZona(jj, zz, 0.003);
                    b.position.copy(c); b.visible = u > 0 && u < 1;
                    b.scale.setScalar(1 + (A.pulso - 1) * s); b.material.opacity = 0.9 * Math.sin(Math.PI * u);
                });
                const m = tocar(actor(p.j, p.z, k));
                if (m && u > 0 && u < 1) {
                    m.position.y += arco(u, 0.05);
                    if (p.t === 'salva') m.position.x += Math.sin(u * 70) * A.sacudida * (1 - u);
                }
                break;
            }
            case 'ataque': {
                const m = tocar(actor(p.j, p.z, k)); if (!m || u <= 0 || u >= 1) break;
                const de = enZona(p.j, p.z), a = p.obj >= 0 ? enZona(rival(p.j), p.obj) : new THREE.Vector3(0, alto(), (p.j === 0 ? -1 : 1) * L().mesa.fondo * 0.45);
                const ida = u < 0.55 ? suave(tramo(u, 0, 0.55)) : 1 - suave(tramo(u, 0.55, 1));
                w.subVectors(a, de).multiplyScalar(A.embestida * ida);
                m.position.add(w); m.position.y += 0.08 * ida;
                if (p.obj >= 0 && u > 0.5 && u < 0.85) {
                    const o = tocar(actor(rival(p.j), p.obj, k));
                    if (o) o.position.x += Math.sin(u * 90) * A.sacudida;
                }
                break;
            }
            case 'dano': case 'cura': case 'sube': {
                if (u <= 0 || u >= 1) break;
                const malo = p.t === 'dano' || (p.t === 'sube' && p.n < 0);
                const hex = p.t === 'sube' ? (p.n < 0 ? C.baja : C.sube) : C[p.t];
                const txt = `${malo ? '-' : '+'}${Math.abs(p.n)}${p.t === 'sube' ? ' ATK' : ''}`;
                const d = numero(k, txt, hex);
                const punto = p.t === 'sube' ? enZona(p.j, p.z, 0.08) : enZona(p.j, 1, 0.16);
                if (p.t !== 'sube') punto.z += p.j === 0 ? 0.12 : -0.12;
                const q = api.pantalla(punto.x, punto.y, punto.z);
                d.style.display = q ? '' : 'none';
                if (q) d.style.transform = `translate(${q.x}px, ${q.y - A.flota * sale0(u)}px) translate(-50%, -50%) scale(${1 + 0.4 * Math.sin(Math.PI * tramo(u, 0, 0.25))})`;
                d.style.opacity = String(1 - tramo(u, 0.7, 1));
                if (p.t === 'sube') { const m = tocar(actor(p.j, p.z, k)); if (m) m.position.y += arco(u, 0.04); }
                break;
            }
            case 'muere': {
                const m = tocar(actor(p.j, p.z, k)); if (!m || u <= 0) break;
                const de = enZona(p.j, p.z), a = tramo(u, 0, 0.4), b = suave(tramo(u, 0.4, 1));
                color.copy(BLANCO).lerp(new THREE.Color(C.muere), Math.min(1, a * 1.5));
                m.material.color.copy(color);
                m.position.copy(de); m.position.x += Math.sin(u * 80) * A.sacudida * (1 - b) * (a < 1 ? 1 : 0);
                if (b > 0) { m.position.lerpVectors(de, enDesc(p.j), b); m.position.y += arco(b, 0.1); m.rotation.set(-Math.PI / 2, 0, 0); }
                m.material.opacity = 1 - 0.4 * b; m.scale.setScalar(1 - 0.1 * b);
                break;
            }
            case 'vuelve': {
                const m = tocar(actor(p.j, p.z, k)); if (!m || u <= 0) break;
                const e = api.estado(), n = e.jug[p.j].mano.length;
                const a = enMano(p.j, Math.floor(n / 2), n);
                m.position.lerpVectors(enZona(p.j, p.z), a, s); m.position.y += arco(u);
                m.material.opacity = 1 - tramo(u, 0.6, 1);
                break;
            }
            case 'abrazo': {
                const m = tocar(actor(p.j, p.z2, k)); if (!m || u <= 0) break;
                m.position.lerpVectors(enZona(p.j, p.z2), enZona(p.j, p.z, 0.01), s); m.position.y += arco(u, 0.08);
                m.material.opacity = 1 - tramo(u, 0.7, 1); m.scale.setScalar(1 - 0.3 * s);
                const x = extra(k); if (!x.mallas.length) x.mallas.push(brillo(C.abrazo));
                const b = x.mallas[0]; b.position.copy(enZona(p.j, p.z, 0.003)); b.visible = u > 0.6 && u < 1;
                b.scale.setScalar(1 + (A.pulso - 1) * tramo(u, 0.6, 1)); b.material.opacity = 0.9 * (1 - tramo(u, 0.6, 1));
                break;
            }
            case 'modo': {
                const m = tocar(actor(p.j, p.z, k)); if (!m || m.userData.efimera || u >= 1) break;
                const de = p.modo === 'def' ? 0 : Math.PI / 2;
                m.rotation.z = de + (m.userData.base.r.z - de) * s;
                m.position.y += arco(u, 0.03);
                break;
            }
            case 'quema': {
                const x = extra(k); if (!x.mallas.length) x.mallas.push(cartaSuelta(p.c));
                const m = x.mallas[0]; m.visible = u > 0 && u < 1;
                const a = suave(u);
                m.position.lerpVectors(enMazo(p.j), enDesc(p.j), a); m.position.y += arco(u, 0.25);
                m.rotation.set(-Math.PI / 2, Math.PI * (1 - Math.min(1, a * 2)), 0);
                m.material.map = m.rotation.y > Math.PI / 2 ? api.reverso() : m.userData.cara;
                m.material.color.copy(BLANCO).lerp(new THREE.Color(C.muere), a);
                break;
            }
            case 'turno': {
                if (u <= 0 || u >= 1) break;
                const tx = api.texto(p); if (!tx) break;
                const d = banner(k, tx);
                d.style.opacity = String(Math.min(1, tramo(u, 0, 0.2) * 1, 1 - tramo(u, 0.75, 1)));
                d.style.transform = `translate(-50%, -50%) scale(${0.85 + 0.15 * sale0(tramo(u, 0, 0.3))})`;
                break;
            }
        }
    }

    // ---------- Mostrar u ocultar lo del estado final ----------
    function visibilidad() {
        for (const [key, lista] of Object.entries(plan.ocupantes)) {
            const [j, z] = key.split(':').map(Number), real = lista.find(s => s.hasta === null), m = api.zonaMesh(j, z);
            if (m) m.visible = !real || empezo(real.desde);
            for (const s of lista) {
                if (s.hasta === null) continue;
                let g = fantasmas.get(s);
                if (!g) { g = cartaSuelta(s.c); g.userData.zona = [j, z]; g.position.copy(enZona(j, z)); g.rotation.set(-Math.PI / 2, 0, 0); fantasmas.set(s, g); }
                g.visible = empezo(s.desde) && !termino(s.hasta);
            }
        }
        for (const r of plan.manos[0]) { const m = api.manoMesh(r.i); if (m) m.visible = empezo(r.k); }
        for (const r of plan.manos[1]) { const m = api.manoRivalMesh(r.i); if (m) m.visible = empezo(r.k); }
    }
    // Las cartas que llegan a la mano: la tuya en pantalla (escena ortográfica) y la de Lucho en la mesa
    function animarManos() {
        const T = api.tam();
        for (const r of plan.manos[0]) {
            const p = plan.pasos[r.k], u = avance(p); if (u <= 0 || u >= 1) continue;
            if (api.mirando) { // quien mira: la mano del lado 0 también está en la mesa
                const m = tocar(api.manoMesh(r.i)); if (!m) continue;
                const o = r.de === 'desc' ? enDesc(0) : r.de === 'mesa' && r.z != null ? enZona(1, r.z) : enMazo(0);
                m.position.lerpVectors(o, m.userData.base.p, suave(u)); m.position.y += arco(u);
                continue;
            }
            const m = api.manoMesh(r.i); if (!m) continue;
            const o = r.de === 'desc' ? enDesc(0) : r.de === 'mesa' && r.z != null ? enZona(1, r.z) : enMazo(0);
            const q = api.pantalla(o.x, o.y, o.z) || { x: T.x * 0.8, y: T.y * 0.6 };
            const d = api.destinoMano(r.i), s = suave(u);
            m.position.x = q.x + (d.x - q.x) * s; m.position.y = (T.y - q.y) + (d.y - (T.y - q.y)) * s;
            m.rotation.z = d.giro * s;
            m.scale.set(d.w * (0.35 + 0.65 * s), d.h * (0.35 + 0.65 * s), 1);
        }
        for (const r of plan.manos[1]) {
            const p = plan.pasos[r.k], u = avance(p); if (u <= 0 || u >= 1) continue;
            const m = tocar(api.manoRivalMesh(r.i)); if (!m) continue;
            const o = r.de === 'desc' ? enDesc(1) : r.de === 'mesa' && r.z != null ? enZona(0, r.z) : enMazo(1);
            m.position.lerpVectors(o, m.userData.base.p, suave(u)); m.position.y += arco(u);
        }
    }

    function vidas() {
        // Cada cambio va de `antes` a lo que quedó (el daño no baja de 0); el último que empezó manda
        const vv = plan.vidaAntes.slice();
        for (const p of plan.pasos) if ((p.t === 'dano' || p.t === 'cura') && t >= p.ini) {
            const fin = p.t === 'cura' ? p.antes + p.n : Math.max(0, p.antes - p.n);
            vv[p.j] = p.antes + (fin - p.antes) * suave(avance(p));
        }
        api.vida(0, Math.round(vv[0])); api.vida(1, Math.round(vv[1]));
    }

    function terminar() {
        if (!plan) return;
        for (const g of fantasmas.values()) quitar(g);
        fantasmas.clear();
        for (const x of extras.values()) { x.mallas.forEach(quitar); x.dom.forEach(d => d.remove()); }
        extras.clear();
        for (const m of destacados) { const b = m.userData.base; if (b) { m.position.copy(b.p); m.rotation.copy(b.r); } m.scale.setScalar(1); delete m.userData.base; m.visible = true; }
        destacados.clear();
        plan = null; pend = [0, 0];
        api.alTerminar();
    }

    return {
        get ocupado() { return !!plan; },
        // Cuántas cartas del descarte de j todavía vienen en camino (la mesa muestra la de arriba al llegar)
        pendientesDesc: j => pend[j],
        iniciar(ev) {
            terminar();
            const P = planificar(ev, L(), api.estado());
            if (!P.pasos.length || P.total <= 0) return;
            plan = P; t = 0; pend = P.alDesc.slice();
            vidas(); visibilidad();
        },
        saltar: terminar,
        actualizar(dt) {
            if (!plan) return;
            t += dt;
            // Llegadas al descarte: la mesa se repinta con la carta nueva arriba
            let llegaron = false;
            for (const p of plan.pasos) if ((p.t === 'muere' || p.t === 'quema' || p.t === 'hechizo') && termino(p.k) && !p.llego) { p.llego = true; pend[p.j] = Math.max(0, pend[p.j] - 1); llegaron = true; }
            if (llegaron) api.refrescar();
            if (t >= plan.total + 0.05) { terminar(); return; }
            // Todo vuelve a su sitio y cada paso activo suma su movimiento
            for (const m of destacados) { const b = m.userData.base; if (b && m.parent) { m.position.copy(b.p); m.rotation.copy(b.r); m.scale.setScalar(1); if (m.userData.cara) m.material.map = m.userData.cara; } }
            for (const m of [...destacados]) if (!m.parent) destacados.delete(m);
            for (const g of fantasmas.values()) {
                const [j, z] = g.userData.zona;
                g.position.copy(enZona(j, z)); g.rotation.set(-Math.PI / 2, 0, 0); g.scale.setScalar(1);
                g.material.map = g.userData.cara; g.material.opacity = 1; g.material.color.copy(BLANCO);
            }
            visibilidad();
            for (const p of plan.pasos) {
                if (t >= p.ini && !p.sono) { p.sono = true; if (api.sonido) api.sonido(p); } // el sonido sale al empezar el paso
                if (t >= p.ini && t <= p.ini + p.dur + 0.001) animarPaso(p);
            }
            for (const x of extras.entries()) { const p = plan.pasos[x[0]]; if (termino(p.k)) { x[1].mallas.forEach(m => { m.visible = false; }); x[1].dom.forEach(d => { d.style.opacity = '0'; }); } }
            animarManos();
            vidas();
        }
    };
}
