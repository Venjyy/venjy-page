// =========================================================
// VENJY · Supervivencia · Cuerpo del jugador y cámaras
//  · Cuerpo: el modelo de cajas con tu skin. Se ve en tercera persona y en las escenas.
//  · Tercera persona (F5 o el botón CAM): primera persona → por detrás → de frente, como
//    Minecraft; la cámara se acerca si un muro se interpone.
//  · Escena con un amigo: mientras está abierto el panel de su misión, una cámara de cine
//    encuadra al amigo y al jugador y va cambiando de plano (contraplano, plano general, picado,
//    contrapicado, primer plano), con un movimiento lento dentro de cada plano y un fundido corto
//    entre planos. Evita los planos que quedarían detrás de un bloque.
//  · Con `validarTexto(pos, objetivo)` (escenas con globos) al elegir plano se descartan los que no dejan
//    lugar libre para el globo de la línea actual/siguiente (con el foco que tendrá la cámara en cada una); si ninguno sirve, queda el de menor solape.
//  · Escenas de skin (escenas-skin.js): la misma cámara sin panel; encuadra a los dos al centro,
//    se inclina hacia quien habla (`enfocar`) y deja que la escena mueva el cuerpo (`pose`).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';
import { caminar } from '../criaturas/cuerpo.js';
import { crearModelo } from './skin.js';
import { crearEstado, avanzar, angulos, aplicarAngulos, ponerObjeto, iluminarObjetos, limpiar } from './pose-jugador.js';

const opaco = (mundo, x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };
function libre(mundo, a, b) {
    const d = a.distanceTo(b), n = Math.ceil(d * 3);
    for (let i = 1; i < n; i++) {
        const k = i / n;
        if (opaco(mundo, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k)) return false;
    }
    return !opaco(mundo, b.x, b.y, b.z);
}

export function crearCamaras({ scene, camara, mundo, jugador, skin, tinteMundo, dy, fabrica = null, entradaPose = null }) {
    // ---------- Cuerpo ----------
    let cuerpo = crearModelo(skin);
    cuerpo.g.visible = false;
    scene.add(cuerpo.g);
    let fase = 0, ultima = null;
    const luz = new THREE.Color();
    // Pose (7c-1, pose-jugador.js): golpe, correr, objeto en la mano, comer, arco y escudo.
    // Si una escena mueve el cuerpo (cine.pose, la ronda del iglú: `cuerpoAjeno`), solo camina, como antes.
    let estadoPose = crearEstado(), golpePend = false, ajenoAntes = false, cuerpoAjeno = null, poseForzada = null;
    function ponerSkin(d) {
        scene.remove(cuerpo.g);
        cuerpo = crearModelo(d);
        cuerpo.g.visible = false;
        scene.add(cuerpo.g);
        estadoPose = crearEstado();
    }
    function actualizarCuerpo(dt, visible) {
        cuerpo.g.visible = visible;
        if (!visible) { golpePend = false; return; }
        const p = jugador.pos;
        cuerpo.g.position.set(p.x, p.y - (jugador.agachado ? 0.2 : 0), p.z);
        cuerpo.g.rotation.y = jugador.yaw + Math.PI;
        const mov = ultima ? Math.hypot(p.x - ultima.x, p.z - ultima.z) / Math.max(dt, 0.001) : 0;
        ultima = { x: p.x, z: p.z };
        const ajeno = !!cine.pose || !!(cuerpoAjeno && cuerpoAjeno());
        if (ajeno || !entradaPose) {
            if (!ajenoAntes && ajeno) limpiar(cuerpo);
            fase += mov * dt * 2.6;
            caminar(cuerpo, fase, Math.min(0.8, mov * 0.18));
            cuerpo.cuello.rotation.x = Math.max(-0.8, Math.min(0.8, -jugador.pitch * 0.8));
            cuerpo.cuerpo.rotation.x = jugador.agachado ? 0.35 : 0;
            golpePend = false;
        } else {
            const ent = { ...entradaPose(), mov, pitch: jugador.pitch, agachado: jugador.agachado };
            ent.golpe = ent.golpe || golpePend;
            golpePend = false;
            if (poseForzada) Object.assign(ent, poseForzada);
            avanzar(estadoPose, ent, dt);
            if (poseForzada && poseForzada.golpeEn != null) estadoPose.golpe = poseForzada.golpeEn;
            if (poseForzada && poseForzada.fase != null) { estadoPose.fase = poseForzada.fase; estadoPose.amp = poseForzada.amp ?? estadoPose.amp; }
            aplicarAngulos(cuerpo, angulos(estadoPose, ent, ent.escudo || 0));
            ponerObjeto(cuerpo, ent.objeto || 0, fabrica, 0);
            ponerObjeto(cuerpo, ent.objeto2 || 0, fabrica, 1);
        }
        ajenoAntes = ajeno;
        const l = mundo.nivelLuz(p.x, p.y + 1, p.z);
        const c = Math.pow(l >= 0 ? (l >> 4) / 15 : 1, 1.6), b = Math.pow(l >= 0 ? (l & 15) / 15 : 0, 1.6);
        luz.copy(tinteMundo).multiplyScalar(c);
        luz.setRGB(Math.max(luz.r, b, 0.08), Math.max(luz.g, b * 0.85, 0.08), Math.max(luz.b, b * 0.6, 0.08));
        cuerpo.tinte.aplicar(luz);
        iluminarObjetos(cuerpo, luz);
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
    const cine = { activa: false, n: null, plano: 0, t: 0, fundido: 0, escena: false, foco: 0.5, focoObj: 0.5, pose: null, evitar: [], fijo: null, planos: null, visibles: null, esperarLinea: false, corte: false, validarTexto: null, peor: null, usado: null };
    let diag = null;
    const fundidoEl = document.createElement('div');
    fundidoEl.className = 'fundido-cine';
    document.body.appendChild(fundidoEl);
    const franjas = [0, 1].map(i => { const f = document.createElement('div'); f.className = 'franja-cine ' + (i ? 'abajo' : 'arriba'); document.body.appendChild(f); return f; });

    const amigo = new THREE.Vector3(), yo = new THREE.Vector3(), objetivo = new THREE.Vector3(), cam = new THREE.Vector3(), centro = new THREE.Vector3();
    const derecha = new THREE.Vector3(), mira = new THREE.Vector3();
    // Posición del plano k en el instante u (0..1); null si queda tapado
    // `planos` también puede ser una lista propia (minijuegos: la arma cada juego según dónde quedan los actores)
    const planos = () => (cine.escena ? (Array.isArray(cine.planos) ? cine.planos : cine.planos === 'gata' ? PLANOS_GATA : cine.planos === 'trio' ? PLANOS_TRIO : PLANOS_ESCENA) : PLANOS);
    // validar (solo al elegir plano, no cada cuadro): exige además lugar libre para el globo; si el plano
    // es válido salvo por eso, guarda en cine.peor el menor solape (para escoger el menos malo)
    const tmpObj = new THREE.Vector3(), cam2 = new THREE.Vector3();
    const objetivoDe = f => tmpObj.copy(amigo).lerp(yo, f); // hacia dónde mirará la cámara con el foco f (0 amigo, 1 jugador)
    function calcular(k, u, validar = false) {
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
        // Escenas de grupo (6c-2): la cámara gira en torno al centro del grupo y mira hacia quien habla
        if (cine.centro) cine.centro(centro, objetivo);
        // Bajo techo (el iglú) cada plano prueba también más abajo, hasta la altura del pecho
        const bajo = cine.escena ? Math.min(pl.alto, 1.3) : pl.alto;
        let nominal = null; // lo que tapa la posición nominal del plano (la primera que se prueba)
        cine.peor = null;
        // Pares (recorte de distancia, recorte de altura); primero el que se validó al elegir el plano (sin saltos)
        const d0 = dist, minD = cine.escena ? 1.1 : 1.4, pares = [];
        if (!validar && cine.usado && cine.usado.k === k) pares.push([cine.usado.di, cine.usado.ai]);
        for (let di = 0; d0 - 0.3 * di > minD; di++) for (let ai = 0; pl.alto - 0.3 * ai >= bajo - 1e-9; ai++) pares.push([di, ai]);
        for (const [di, ai] of pares) {
            const dist = d0 - 0.3 * di, alto = pl.alto - 0.3 * ai;
            cam.set(centro.x + Math.sin(ang) * dist, (n.y ?? 0) + dy + alto, centro.z + Math.cos(ang) * dist);
            if (cine.escena && (cam.distanceTo(yo) < cine.minDist || cam.distanceTo(amigo) < cine.minDist || tapa())) continue;
            if (cine.visibles && mundo.bloque(cam.x, cam.y, cam.z) > 0) continue; // la cámara no puede quedar dentro de un bloque
            if (cine.holgura && pegadaABloque()) continue; // ni pegada a uno (un fardo en primer plano)
            const tapadas = cine.visibles ? cabezasTapadas() : null;
            if (nominal === null && tapadas) nominal = tapadas;
            if (libre(mundo, objetivo, cam) && !(tapadas && tapadas.length)) {
                if (validar && cine.validarTexto) {
                    // Se prueba al empezar el plano y al final (más cerca por el dolly y girado por la órbita)
                    const fin = cam2.set(centro.x + Math.sin(ang + pl.orbita * (1 - u)) * (dist + pl.dolly * (1 - u)), cam.y, centro.z + Math.cos(ang + pl.orbita * (1 - u)) * (dist + pl.dolly * (1 - u)));
                    const sol = Math.max(cine.validarTexto(cam, objetivo, objetivoDe), cine.validarTexto(fin, objetivo, objetivoDe));
                    if (sol > 0) { if (!cine.peor || sol < cine.peor.s) cine.peor = { s: sol, di, ai }; continue; }
                }
                if (tapadas) diag = { plano: k, nombre: pl.nombre, nominal, libre: true, usada: { dist: +dist.toFixed(2), alto: +alto.toFixed(2) } };
                cine.usado = { k, di, ai };
                return true;
            }
        }
        if (cine.visibles) diag = { plano: k, nombre: pl.nombre, nominal: nominal || [], libre: false, usada: null };
        return false;
    }
    // ¿Hay un bloque opaco a menos de `holgura` de la cámara (en los 6 lados)?
    const pegadaABloque = () => { const h = cine.holgura; return [[h, 0, 0], [-h, 0, 0], [0, h, 0], [0, -h, 0], [0, 0, h], [0, 0, -h]].some(([x, y, z]) => opaco(mundo, cam.x + x, cam.y + y, cam.z + z)); };
    // ¿La cámara quedó encima de alguno de los actores (cabeza o torso)?
    const vC = new THREE.Vector3();
    const tapa = () => cine.evitar.some(e => cam.distanceTo(e.p.cabeza.getWorldPosition(vC)) < cine.evitarDist || cam.distanceTo(e.p.torso.getWorldPosition(vC)) < cine.evitarDist - 0.3) || primerPlano();
    // ¿Alguien que no es el amigo (un tercero sentado al lado, la fogata) queda entre la cámara y los actores, dentro del
    // cuadro? Solo en las escenas de amistad (opción sinTerceros, sigue aunque se relajen las distancias): se lee como un bulto en primer plano aunque no tape las cabezas
    const vD = new THREE.Vector3(), vO = new THREE.Vector3();
    const primerPlano = () => {
        if (!cine.sinTerceros) return false;
        vO.copy(objetivo).sub(cam);
        const dObj = vO.length();
        vO.normalize();
        return cine.evitar.some(e => {
            if (e === cine.n) return false;
            vD.copy(e.p.torso.getWorldPosition(vC)).sub(cam);
            const d = vD.length();
            return d < dObj - 0.6 && vD.normalize().dot(vO) > Math.cos(0.85); // casi todo el ancho del cuadro (16:9)
        });
    };
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
        // Si el plano anterior se eligió con distancias relajadas, el siguiente vuelve a probar primero las estrictas
        if (cine.relajado) { [cine.minDist, cine.evitarDist, cine.holgura] = cine.relajado; cine.relajado = null; }
        const n = planos().length;
        let menos = null, solape = Infinity;
        for (let i = 1; i <= n; i++) {
            const k = (desde + i) % n;
            if (calcular(k, 0, true)) return k;
            if (cine.peor && cine.peor.s < solape) { solape = cine.peor.s; menos = { k, di: cine.peor.di, ai: cine.peor.ai }; } // válido pero sin lugar para el globo
        }
        if (menos) { cine.usado = { k: menos.k, di: menos.di, ai: menos.ai }; return menos.k; }
        // Con distancias estrictas (escenas de amistad) y ningún plano libre: se prueban con las normales antes del
        // rescate, y quedan así mientras dure ese plano (si no, cada cuadro lo daría por tapado)
        if (cine.minDist > 1 || cine.holgura || cine.evitarDist > 1.7) {
            const estrictas = [cine.minDist, cine.evitarDist, cine.holgura];
            cine.minDist = 1; cine.evitarDist = 1.7; cine.holgura = 0;
            const k = siguientePlano(desde);
            cine.relajado = estrictas;
            return k;
        }
        return desde;
    }

    function actualizar(dt, verMano) {
        if (cine.activa) {
            cine.t += dt;
            cine.foco += (cine.focoObj - cine.foco) * Math.min(1, dt * 1.5);
            // Plano manual de la escena (6c-2: el Venjy que salta de la atalaya): posición y punto de mira fijados por ella
            const m = cine.manual && cine.manual();
            if (m) {
                camara.position.copy(m.pos); camara.lookAt(m.mira);
                cine.fundido = Math.max(0, cine.fundido - dt);
                fundidoEl.style.opacity = cine.fundido > 0 ? Math.min(1, cine.fundido / 0.35 * 1.6 - 0.2).toFixed(2) : '0';
                actualizarCuerpo(dt, true);
                if (cine.pose) cine.pose(cuerpo, dt);
                return;
            }
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
        // 7c-1: golpe del cuerpo (romper, atacar, usar); quién más mueve el cuerpo; depuración de poses
        golpear() { golpePend = true; },
        set cuerpoAjeno(f) { cuerpoAjeno = f; },
        // Capturas: { golpeEn: 0..1, corre, comiendo, tensando, bloqueando, objeto, fase, amp, … } o null
        set poseForzada(o) { poseForzada = o; },
        get estadoPose() { return estadoPose; },
        get vista() { return vista; },
        get enCine() { return cine.activa; },
        get cuerpo() { return cuerpo; },
        // Escenas: hacia dónde se inclina el encuadre (0 amigo, 1 jugador) y quién mueve el cuerpo
        enfocar(f) { cine.focoObj = f; },
        // Escenas con guion: empezó una línea nueva. Si el plano ya cumplió su tiempo, cambia en este instante
        nuevaLinea() { if (cine.activa && cine.esperarLinea && cine.t >= DURACION - 0.1) cine.corte = true; },
        fijarPlano(k = null) { cine.fijo = k; }, // depuración (capturas): deja la cámara en un plano
        set pose(f) { cine.pose = f; },
        // Plano manual: f() -> { pos, mira } (Vector3 del mundo) o null para volver a los planos; el cambio va con fundido
        set manual(f) { if (!!f !== !!cine.manual) { cine.fundido = 0.35; cine.t = DURACION; cine.corte = true; } cine.manual = f; },
        cambiarVista() { vista = (vista + 1) % 3; },
        iniciarCine(n, op = {}) {
            if (!n) return;
            cine.activa = true; cine.n = n; cine.t = 0; cine.fundido = op.fundido ?? 0.3;
            cine.escena = !!op.escena; cine.planos = op.planos || null; cine.foco = cine.focoObj = 0.5; cine.evitar = op.evitar || [];
            cine.visibles = op.visibles && op.visibles.length ? op.visibles : null;
            cine.esperarLinea = !!op.esperarLinea; cine.corte = false; cine.buena = null; cine.usado = null;
            cine.validarTexto = op.validarTexto || null;
            cine.sinTerceros = !!op.sinTerceros;
            cine.centro = op.centro || null; cine.manual = null;
            cine.relajado = null; cine.minDist = op.minDist ?? 1; cine.evitarDist = op.evitarDist ?? 1.7; cine.holgura = op.holgura || 0; // escenas de amistad: más lejos, para que nadie quede tapando en primer plano
            cine.plano = calcular(0, 0, true) ? 0 : siguientePlano(0);
            document.body.classList.add('en-cine');
        },
        terminarCine() {
            if (!cine.activa) return;
            cine.activa = false; cine.n = null; cine.escena = false; cine.pose = null; cine.visibles = null; diag = null; cine.esperarLinea = false; cine.corte = false; cine.validarTexto = null;
            cine.centro = null; cine.manual = null;
            document.body.classList.remove('en-cine');
        },
        // Depuración (planos.mjs): plano actual y diagnóstico de líneas a las cabezas (null si no se pidió `visibles`)
        get camara() { return camara; }, // la cámara real (los globos con encaje la necesitan)
        get planoActual() { return cine.activa ? cine.plano : null; },
        get planoNombre() { return cine.activa ? planos()[cine.plano]?.nombre ?? null : null; },
        get diagnostico() { return cine.visibles ? diag : null; }
    };
}
