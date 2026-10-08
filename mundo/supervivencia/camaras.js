// =========================================================
// VENJY · Supervivencia · Cuerpo del jugador y cámaras
//  · Cuerpo: el modelo de cajas con tu skin. Se ve en tercera persona y en las escenas.
//  · Tercera persona (F5 o el botón CAM): primera persona → por detrás → de frente, como
//    Minecraft; la cámara se acerca si un muro se interpone.
//  · Escena con un amigo: mientras está abierto el panel de su misión, una cámara de cine
//    encuadra al amigo y al jugador y va cambiando de plano (contraplano, plano general, picado,
//    contrapicado, primer plano), con un movimiento lento dentro de cada plano y un fundido corto
//    entre planos. Evita los planos que quedarían detrás de un bloque.
//  · Escenas de skin (escenas-skin.js): la misma cámara sin panel; encuadra a los dos al centro,
//    se inclina hacia quien habla (`enfocar`) y deja que la escena mueva el cuerpo (`pose`).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';
import { caminar } from '../criaturas/cuerpo.js';
import { crearModelo } from './skin.js';

const opaco = (mundo, x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };
function libre(mundo, a, b) {
    const d = a.distanceTo(b), n = Math.ceil(d * 3);
    for (let i = 1; i < n; i++) {
        const k = i / n;
        if (opaco(mundo, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k)) return false;
    }
    return !opaco(mundo, b.x, b.y, b.z);
}

export function crearCamaras({ scene, camara, mundo, jugador, skin, tinteMundo, dy }) {
    // ---------- Cuerpo ----------
    let cuerpo = crearModelo(skin);
    cuerpo.g.visible = false;
    scene.add(cuerpo.g);
    let fase = 0, ultima = null;
    const luz = new THREE.Color();
    function ponerSkin(d) {
        scene.remove(cuerpo.g);
        cuerpo = crearModelo(d);
        cuerpo.g.visible = false;
        scene.add(cuerpo.g);
    }
    function actualizarCuerpo(dt, visible) {
        cuerpo.g.visible = visible;
        if (!visible) return;
        const p = jugador.pos;
        cuerpo.g.position.set(p.x, p.y - (jugador.agachado ? 0.2 : 0), p.z);
        cuerpo.g.rotation.y = jugador.yaw + Math.PI;
        const mov = ultima ? Math.hypot(p.x - ultima.x, p.z - ultima.z) / Math.max(dt, 0.001) : 0;
        ultima = { x: p.x, z: p.z };
        fase += mov * dt * 2.6;
        caminar(cuerpo, fase, Math.min(0.8, mov * 0.18));
        cuerpo.cuello.rotation.x = Math.max(-0.8, Math.min(0.8, -jugador.pitch * 0.8));
        cuerpo.cuerpo.rotation.x = jugador.agachado ? 0.35 : 0;
        const l = mundo.nivelLuz(p.x, p.y + 1, p.z);
        const c = Math.pow(l >= 0 ? (l >> 4) / 15 : 1, 1.6), b = Math.pow(l >= 0 ? (l & 15) / 15 : 0, 1.6);
        luz.copy(tinteMundo).multiplyScalar(c);
        luz.setRGB(Math.max(luz.r, b, 0.08), Math.max(luz.g, b * 0.85, 0.08), Math.max(luz.b, b * 0.6, 0.08));
        cuerpo.tinte.aplicar(luz);
    }

    // ---------- Tercera persona ----------
    let vista = 0; // 0 primera, 1 por detrás, 2 de frente
    const ojo = new THREE.Vector3(), dir = new THREE.Vector3(), pos = new THREE.Vector3();
    function terceraPersona() {
        ojo.copy(camara.position);
        camara.getWorldDirection(dir);
        const signo = vista === 1 ? -1 : 1;
        let d = 4;
        while (d > 0.6) { pos.copy(ojo).addScaledVector(dir, signo * d); if (libre(mundo, ojo, pos)) break; d -= 0.25; }
        camara.position.copy(pos);
        if (vista === 2) camara.lookAt(ojo);
    }

    // ---------- Escena de cine ----------
    // Planos relativos a la línea amigo → jugador: ang (rad), dist (desde el amigo), alto (sobre sus pies), mira (0 amigo, 1 jugador)
    const PLANOS = [
        { nombre: 'contraplano', ang: 0.28, dist: null, alto: 1.95, mira: 0, orbita: 0.08, dolly: -0.4 },
        { nombre: 'general', ang: 1.45, dist: 6.5, alto: 2.6, mira: 0.5, orbita: 0.18, dolly: -0.6 },
        { nombre: 'contrapicado', ang: -0.55, dist: 3.4, alto: 0.7, mira: 0, orbita: -0.12, dolly: -0.3 },
        { nombre: 'picado', ang: -1.9, dist: 7.5, alto: 5.5, mira: 0.5, orbita: 0.14, dolly: -0.8 },
        { nombre: 'primer plano', ang: 0.12, dist: 2.1, alto: 1.75, mira: 0, orbita: 0.05, dolly: -0.15 },
        { nombre: 'perfil', ang: 2.4, dist: 4.5, alto: 1.6, mira: 0.5, orbita: -0.1, dolly: -0.4 }
    ];
    // Escenas de skin: planos de dos personajes a la altura de los ojos, medidos desde el punto medio
    // (ang 0 = detrás del jugador mirando al amigo; dist null = media distancia entre los dos + 1,8)
    const PLANOS_ESCENA = [
        { nombre: 'dos', ang: Math.PI / 2, dist: 3.4, alto: 1.75, orbita: 0.1, dolly: -0.4 },
        { nombre: 'hombro jugador', ang: 0.38, dist: null, alto: 1.9, orbita: 0.06, dolly: -0.3 },
        { nombre: 'hombro amigo', ang: Math.PI - 0.38, dist: null, alto: 1.9, orbita: -0.06, dolly: -0.3 },
        { nombre: 'general', ang: -1.15, dist: 5.6, alto: 2.5, orbita: 0.14, dolly: -0.6 },
        { nombre: 'hombro amigo, otro lado', ang: Math.PI + 0.38, dist: null, alto: 1.9, orbita: 0.06, dolly: -0.3 },
        { nombre: 'contrapicado', ang: -Math.PI / 2, dist: 2.6, alto: 0.8, orbita: -0.1, dolly: -0.2 },
        { nombre: 'hombro jugador, otro lado', ang: -0.38, dist: null, alto: 1.9, orbita: -0.06, dolly: -0.3 }
    ];
    // Escena de una gata (caricias.js, opción planos: 'gata'): planos de lado a la altura de la cabeza
    // de la gata, con el jugador a su lado; el de «hombro jugador» la tapaba, así que se evita.
    const PLANOS_GATA = [
        { nombre: 'de lado', ang: Math.PI / 2, dist: 3.0, alto: 1.5, orbita: 0.08, dolly: -0.3 },
        { nombre: 'tres cuartos', ang: Math.PI / 2 - 0.6, dist: 2.7, alto: 1.7, orbita: 0.05, dolly: -0.2 },
        { nombre: 'de lado, otro lado', ang: -Math.PI / 2, dist: 3.0, alto: 1.4, orbita: -0.08, dolly: -0.3 },
        { nombre: 'picado', ang: Math.PI / 2 + 0.3, dist: 3.8, alto: 2.8, orbita: 0.04, dolly: -0.4 }
    ];
    // Planos del trío (ronda-iglu.js, planos: 'trio'): el ancla es el punto medio entre Lalo y Moisés;
    // ang es relativo a la línea jugador → amigo (como en PLANOS_ESCENA). Se eligieron con el mapa de planta del iglú (referencia/camara.md,
    // «Método para diseñar planos»): sin bloques ni personas en la línea a cada cabeza (`visibles`) y sin
    // que la cámara quede dentro de un bloque. Dentro del iglú no hay un punto desde donde se vean las caras
    // de los tres durante toda la ronda: cada plano elige el lado que más caras da (Lalo y Moisés miran al
    // jugador; el jugador mira al centro). Tres puntos distintos: sur, oeste y rincón NE (contrapicado).
    const PLANOS_TRIO = [
        { nombre: 'de frente, desde el sur', ang: -2.982, dist: 2.69, alto: 1.6, orbita: 0.04, dolly: -0.2 },
        { nombre: 'de lado, Lalo y Moisés', ang: 0.974, dist: 2.26, alto: 1.6, orbita: -0.05, dolly: -0.2 },
        { nombre: 'contrapicado de los tres', ang: -1.018, dist: 2.11, alto: 0.85, orbita: -0.06, dolly: -0.2 }
    ];
    const DURACION = 4.2;
    // visibles (opcional): actores cuyas cabezas deben verse desde la cámara; el jugador se añade solo.
    // diag: diagnóstico del último plano calculado (solo con visibles): qué cabezas tapa la posición nominal.
    const cine = { activa: false, n: null, plano: 0, t: 0, fundido: 0, escena: false, foco: 0.5, focoObj: 0.5, pose: null, evitar: [], fijo: null, planos: null, visibles: null, esperarLinea: false, corte: false };
    let diag = null;
    const fundidoEl = document.createElement('div');
    fundidoEl.className = 'fundido-cine';
    document.body.appendChild(fundidoEl);
    const franjas = [0, 1].map(i => { const f = document.createElement('div'); f.className = 'franja-cine ' + (i ? 'abajo' : 'arriba'); document.body.appendChild(f); return f; });

    const amigo = new THREE.Vector3(), yo = new THREE.Vector3(), objetivo = new THREE.Vector3(), cam = new THREE.Vector3(), centro = new THREE.Vector3();
    const derecha = new THREE.Vector3(), mira = new THREE.Vector3();
    // Posición del plano k en el instante u (0..1); null si queda tapado
    const planos = () => (cine.escena ? (cine.planos === 'gata' ? PLANOS_GATA : cine.planos === 'trio' ? PLANOS_TRIO : PLANOS_ESCENA) : PLANOS);
    function calcular(k, u) {
        const pl = planos()[k];
        const n = cine.n, esc = n.escala || 1;
        amigo.set(n.x, (n.y ?? 0) + dy + 1.55 * esc, n.z);
        yo.set(jugador.pos.x, jugador.pos.y + 1.55, jugador.pos.z);
        const base = Math.atan2(yo.x - amigo.x, yo.z - amigo.z);
        const distJ = Math.hypot(yo.x - amigo.x, yo.z - amigo.z);
        const ang = base + pl.ang + pl.orbita * u;
        // En las escenas la cámara gira en torno al punto medio y no se pega a ninguna cabeza (el iglú es estrecho)
        centro.copy(amigo);
        if (cine.escena) centro.lerp(yo, 0.5);
        let dist = (pl.dist ?? (cine.escena ? distJ * 0.5 + 1.8 : distJ + 2.4)) + pl.dolly * u;
        objetivo.copy(amigo).lerp(yo, cine.escena ? cine.foco : pl.mira * 0.5);
        // Bajo techo (el iglú) cada plano prueba también más abajo, hasta la altura del pecho
        const bajo = cine.escena ? Math.min(pl.alto, 1.3) : pl.alto;
        let nominal = null; // lo que tapa la posición nominal del plano (la primera que se prueba)
        for (; dist > (cine.escena ? 1.1 : 1.4); dist -= 0.3) for (let alto = pl.alto; alto >= bajo; alto -= 0.3) {
            cam.set(centro.x + Math.sin(ang) * dist, (n.y ?? 0) + dy + alto, centro.z + Math.cos(ang) * dist);
            if (cine.escena && (cam.distanceTo(yo) < 1 || cam.distanceTo(amigo) < 1 || tapa())) continue;
            if (cine.visibles && mundo.bloque(cam.x, cam.y, cam.z) > 0) continue; // la cámara no puede quedar dentro de un bloque
            const tapadas = cine.visibles ? cabezasTapadas() : null;
            if (nominal === null && tapadas) nominal = tapadas;
            if (libre(mundo, objetivo, cam) && !(tapadas && tapadas.length)) {
                if (tapadas) diag = { plano: k, nombre: pl.nombre, nominal, libre: true, usada: { dist: +dist.toFixed(2), alto: +alto.toFixed(2) } };
                return true;
            }
        }
        if (cine.visibles) diag = { plano: k, nombre: pl.nombre, nominal: nominal || [], libre: false, usada: null };
        return false;
    }
    // ¿La cámara quedó encima de alguno de los actores (cabeza o torso)?
    const vC = new THREE.Vector3();
    const tapa = () => cine.evitar.some(e => cam.distanceTo(e.p.cabeza.getWorldPosition(vC)) < 1.7 || cam.distanceTo(e.p.torso.getWorldPosition(vC)) < 1.4);
    // Comprobación de línea libre cámara → cabeza de cada persona (los actores de `visibles` y el jugador).
    // Una cabeza cuenta como tapada si hay bloques en la línea o si otra persona (su torso o su cabeza)
    // queda sobre ella. Devuelve los nombres de las cabezas tapadas (lista vacía = todas se ven).
    function cabezasTapadas() {
        const personas = cine.visibles.map(e => ({ nombre: e.clave || 'actor', p: e.p }));
        personas.push({ nombre: 'jugador', p: cuerpo });
        const pts = personas.map(a => ({ nombre: a.nombre, cabeza: a.p.cabeza.getWorldPosition(new THREE.Vector3()), torso: a.p.torso.getWorldPosition(new THREE.Vector3()) }));
        const out = [];
        for (const a of pts) {
            let tapada = !libre(mundo, cam, a.cabeza);
            for (const o of pts) if (o !== a && !tapada && (sobreSegmento(cam, a.cabeza, o.torso, 0.45) || sobreSegmento(cam, a.cabeza, o.cabeza, 0.35))) tapada = true;
            if (tapada) out.push(a.nombre);
        }
        return out;
    }
    // ¿El punto p está a menos de r del segmento a→b?
    function sobreSegmento(a, b, p, r) {
        const ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z;
        const k = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey + (p.z - a.z) * ez) / ((ex * ex + ey * ey + ez * ez) || 1)));
        const dx = a.x + ex * k - p.x, dy = a.y + ey * k - p.y, dz = a.z + ez * k - p.z;
        return dx * dx + dy * dy + dz * dz < r * r;
    }
    // Sin ningún plano libre: de lado, a la altura de las cabezas, lo más lejos que se pueda
    function rescate() {
        const base = Math.atan2(yo.x - amigo.x, yo.z - amigo.z);
        centro.copy(amigo).lerp(yo, 0.5);
        objetivo.copy(centro);
        for (const a of [Math.PI / 2, -Math.PI / 2, 2.2, -2.2, 0.9, -0.9]) for (let d = 2.2; d >= 0.6; d -= 0.4) {
            cam.set(centro.x + Math.sin(base + a) * d, centro.y + 0.35, centro.z + Math.cos(base + a) * d);
            if (libre(mundo, objetivo, cam) && !tapa()) return;
        }
        cam.set(centro.x, centro.y + 0.6, centro.z);
    }
    function siguientePlano(desde) {
        const n = planos().length;
        for (let i = 1; i <= n; i++) {
            const k = (desde + i) % n;
            if (calcular(k, 0)) return k;
        }
        return desde;
    }

    function actualizar(dt, verMano) {
        if (cine.activa) {
            cine.t += dt;
            cine.foco += (cine.focoObj - cine.foco) * Math.min(1, dt * 1.5);
            if (cine.fijo !== null) { cine.plano = cine.fijo; cine.t = Math.min(cine.t, DURACION * 0.5); }
            // esperarLinea (escenas con guion): el plano que ya cumplió su tiempo cambia al empezar una línea nueva
            else if (cine.t >= DURACION && (!cine.esperarLinea || cine.corte)) { cine.t = 0; cine.plano = siguientePlano(cine.plano); cine.fundido = 0.35; cine.corte = false; cine.buena = null; }
            if (calcular(cine.plano, Math.min(1, cine.t / DURACION))) {
                camara.position.copy(cam);
                camara.lookAt(objetivo);
                if (cine.esperarLinea) cine.buena = { p: cam.clone(), o: objetivo.clone() };
                if (!cine.escena) {
                    // Regla de tercios: el sujeto queda arriba a la derecha y el panel ocupa abajo a la izquierda
                    derecha.set(1, 0, 0).applyQuaternion(camara.quaternion);
                    const k = Math.max(1.2, cam.distanceTo(objetivo)) * 0.24;
                    mira.copy(objetivo).addScaledVector(derecha, -k).y -= k * 0.85;
                    camara.lookAt(mira);
                }
            } else if (cine.esperarLinea && cine.buena) {
                // Escena con guion: si el plano se tapa a mitad de una frase, la cámara se queda en su última
                // posición buena hasta que empiece la siguiente línea (ahí sí cambia de plano)
                camara.position.copy(cine.buena.p);
                camara.lookAt(cine.buena.o);
            } else {
                cine.plano = siguientePlano(cine.plano); cine.t = 0; cine.corte = false; cine.buena = null;
                if (!calcular(cine.plano, 0)) { rescate(); camara.position.copy(cam); camara.lookAt(objetivo); }
            }
            cine.fundido = Math.max(0, cine.fundido - dt);
            fundidoEl.style.opacity = cine.fundido > 0 ? Math.min(1, cine.fundido / 0.35 * 1.6 - 0.2).toFixed(2) : '0';
            actualizarCuerpo(dt, true);
            if (cine.pose) cine.pose(cuerpo, dt);
            return;
        }
        fundidoEl.style.opacity = '0';
        if (vista > 0) terceraPersona();
        actualizarCuerpo(dt, vista > 0);
    }

    return {
        actualizar, ponerSkin,
        get vista() { return vista; },
        get enCine() { return cine.activa; },
        get cuerpo() { return cuerpo; },
        // Escenas: hacia dónde se inclina el encuadre (0 amigo, 1 jugador) y quién mueve el cuerpo
        enfocar(f) { cine.focoObj = f; },
        // Escenas con guion: empezó una línea nueva. Si el plano ya cumplió su tiempo, cambia en este instante
        nuevaLinea() { if (cine.activa && cine.esperarLinea && cine.t >= DURACION - 0.1) cine.corte = true; },
        fijarPlano(k = null) { cine.fijo = k; }, // depuración (capturas): deja la cámara en un plano
        set pose(f) { cine.pose = f; },
        cambiarVista() { vista = (vista + 1) % 3; },
        iniciarCine(n, op = {}) {
            if (!n) return;
            cine.activa = true; cine.n = n; cine.t = 0; cine.fundido = op.fundido ?? 0.3;
            cine.escena = !!op.escena; cine.planos = op.planos || null; cine.foco = cine.focoObj = 0.5; cine.evitar = op.evitar || [];
            cine.visibles = op.visibles && op.visibles.length ? op.visibles : null;
            cine.esperarLinea = !!op.esperarLinea; cine.corte = false; cine.buena = null;
            cine.plano = calcular(0, 0) ? 0 : siguientePlano(0);
            document.body.classList.add('en-cine');
        },
        terminarCine() {
            if (!cine.activa) return;
            cine.activa = false; cine.n = null; cine.escena = false; cine.pose = null; cine.visibles = null; diag = null; cine.esperarLinea = false; cine.corte = false;
            document.body.classList.remove('en-cine');
        },
        // Depuración (planos.mjs): plano actual y diagnóstico de líneas a las cabezas (null si no se pidió `visibles`)
        get planoActual() { return cine.activa ? cine.plano : null; },
        get diagnostico() { return cine.visibles ? diag : null; }
    };
}
