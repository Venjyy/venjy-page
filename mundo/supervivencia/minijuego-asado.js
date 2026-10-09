// =========================================================
// VENJY · Supervivencia · Minijuego: asado en la fogata con Hadad, Andy y Nacho
// Si llevas carne cruda (vacuno, cerdo, pollo o cordero), desde el panel de cualquiera de los tres
// puedes invitarlos a un asado. Andy pone una parrilla sobre la fogata y asas hasta 3 piezas, de a
// una. La barra de cocción avanza sola (más rápido cuando el fuego se aviva): un botón para DAR
// VUELTA (zona amarilla) y otro toque para SACAR (zona verde). Si un lado pasa de dorado a negro,
// la pieza se quema (humo negro). Resultado: «bien» si nada se quemó, «quemado» si algo se quemó.
// Guion (s de cada fase):
//   intro 10 s · 0,0–0,6 fundido: te paras al norte de la fogata, de cara al fuego · Hadad, Andy y
//                Nacho reaccionan a la carne (Nacho con las manos arriba: «yo no estuve») · tú contestas
//   juego ~8 s por pieza · se miran la parrilla; reacciones sueltas (zona de vuelta, llamarada,
//                pieza perfecta, cruda o quemada)
//   final bien 10 s · todos comen (presa en la mano, mano a la boca); Andy baila a los 3 s; Nacho se
//                ríe a los 5,6 s; tú te señalas al final
//   final quemado 11 s · nube de humo negro y tos; Nacho se ríe; Andy espanta el humo con los brazos;
//                Hadad se tapa la cara; tú te rascas la cabeza
// La carne se consume al empezar el juego (si te rindes, vuelven las piezas que no alcanzaste a asar).
// Premio por pieza: perfecta o bien = la cocida; cruda = vuelve cruda; quemada = carbón.
// Si sale bien: +2 papas asadas (y 1 esmeralda si las 3 piezas quedaron perfectas).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';
import { caja, texturaPixeles, ajustar, angulo } from '../criaturas/cuerpo.js';
import { O } from './objetos.js';
import { sonidos } from './sonidos.js';
import { ASADO } from './minijuegos-datos.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));

// Cruda → cocida (y su color crudo)
const CARNES = [
    [O.VACUNO, O.FILETE, [196, 70, 70]],
    [O.CERDO, O.CHULETA, [232, 140, 140]],
    [O.CORDERO, O.CORDERO_ASADO, [200, 84, 84]],
    [O.POLLO, O.POLLO_ASADO, [240, 196, 170]]
];
const DORADO = [150, 92, 44], NEGRO = [34, 28, 24];
const VUELTA = [0.36, 0.5], SACAR = [0.8, 0.95]; // zonas de la barra de cocción
const LADO = 0.43;          // cocción de la barra que dora un lado (1 = dorado; 1,35 = quemado)
const VEL = 1 / 7;          // la barra se llena en ~7 s (más con llamaradas)
const T_INTRO = 10;

export function crearAsado(api) {
    const { grupo, dy, mundo, jugador, camaras, amigos, inventario, tinte, tinteMundo } = api;
    const C = amigos.campamento;
    if (!C) return null;
    const { hadad, andy, nacho, fuego, emitir, tos } = C;
    const suelo = fuego.y - 0.7; // y de los pies en el campamento (coordenadas del creativo)

    // ---- Parrilla, pieza en el fuego y presas en las manos ----
    const texParrilla = texturaPixeles(8, 8, 7301, (x, y) => (x % 2 === 0 ? [60, 60, 64] : [24, 24, 26]));
    const parrilla = new THREE.Group();
    const rejilla = caja(1.2, 0.04, 0.8, tinte.caras(texParrilla));
    parrilla.add(rejilla);
    for (const [a, b] of [[-0.56, -0.36], [0.56, -0.36], [-0.56, 0.36], [0.56, 0.36]]) { // por fuera de los troncos de la fogata
        const pata = caja(0.05, 0.76, 0.05, tinte.caras(texturaPixeles(1, 4, 7302, () => [50, 50, 54])));
        pata.position.set(a, -0.38, b); parrilla.add(pata);
    }
    // La pieza: materiales propios (cada lado cambia de color con la cocción), multiplicados por la luz del mundo
    const texCarne = texturaPixeles(8, 8, 7303, (x, y, r) => ajustar([255, 255, 255], 0.82 + r() * 0.18));
    const matsPieza = [0.6, 0.6, 1, 0.5, 0.8, 0.8].map(s => { const m = new THREE.MeshBasicMaterial({ map: texCarne }); m.userData.sombra = s; return m; });
    const pieza = caja(0.4, 0.09, 0.28, matsPieza);
    const presaTex = tinte.caras(texturaPixeles(4, 4, 7304, (x, y, r) => ajustar(DORADO, 0.85 + r() * 0.3)));
    const presas = [hadad, andy, nacho, null].map(() => { const m = caja(0.22, 0.08, 0.16, presaTex); m.position.set(0, -0.74, 0.08); return m; });

    // ---- Bloques ----
    const opaco = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };
    const solido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && TIPO[id] === 1; };
    // Te paras a 1,55 de la fogata; primero al norte (entre la fogata y las carpas), si no donde haya lugar
    function sitio() {
        const y = suelo + dy;
        for (const a of [Math.PI, Math.PI - 0.5, Math.PI + 0.5, Math.PI - 1.0, Math.PI + 1.0, 0.4, -0.4]) {
            for (const r of [1.55, 1.8, 1.35]) {
                const x = fuego.x + Math.sin(a) * r, z = fuego.z + Math.cos(a) * r;
                if ([hadad, andy, nacho].some(n => Math.hypot(n.x - x, n.z - z) < 1.2)) continue;
                if (solido(x, y - 0.5, z) && !opaco(x, y + 0.5, z) && !opaco(x, y + 1.5, z)) return { x, z };
            }
        }
        return { x: fuego.x, z: fuego.z - 1.55 };
    }
    const carneEnInventario = () => CARNES.reduce((s, [id]) => s + inventario.contar(id), 0);
    const giroA = (n, x, z, max = 1.0) => lim(angulo(Math.atan2(x - n.x, z - n.z) - n.yaw), -max, max);

    // Color de un lado según su cocción (0 cruda, 1 dorada, 1,35 negra)
    const color = (crudo, c) => (c <= 1 ? crudo.map((v, i) => lerp(v, DORADO[i], suave(lim(c, 0, 1)))) : DORADO.map((v, i) => lerp(v, NEGRO, lim((c - 1) / 0.35, 0, 1))));
    function pintarPieza(d) {
        const p = d.actual;
        if (!p) return;
        // Cara de abajo (índice 3) = el lado que está en el fuego; arriba (2) = el otro; los cantos, mezcla
        const abajo = p.volteada ? p.cB : p.cA, arriba = p.volteada ? p.cA : p.cB;
        const cAbajo = color(p.crudo, abajo), cArriba = color(p.crudo, arriba), cCanto = color(p.crudo, (abajo + arriba) / 2);
        matsPieza.forEach((m, i) => {
            const c = i === 3 ? cAbajo : i === 2 ? cArriba : cCanto;
            m.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255).multiplyScalar(m.userData.sombra).multiply(tinteMundo);
        });
    }

    // ---------------------------------------------------------
    // Amigos: su animación de siempre y gestos encima
    // ---------------------------------------------------------
    const habla = (e, quien) => (e.fase === 'intro' ? e.dice(ASADO.intro, quien) : e.fase === 'final' ? e.dice(ASADO[e.final], quien) : false);
    function animar(n, e, dt, base) {
        base(dt);
        const p = n.p, t = e.t, T = e.total;
        const parr = giroA(n, fuego.x, fuego.z), aJ = giroA(n, jugador.pos.x, jugador.pos.z);
        const ir = (o, k, v, r = 8) => { o[k] += (v - o[k]) * Math.min(1, dt * r); };
        const comer = (fase) => { // presa a la boca cada ~2,4 s
            const c = Math.max(0, Math.sin(T * 2.6 + fase));
            ir(p.brazoD.rotation, 'x', lerp(-1.0, -2.25, c), 12); ir(p.brazoD.rotation, 'z', lerp(0.15, 0.55, c), 12);
            ir(p.cuello.rotation, 'x', lerp(0.1, -0.05, c), 8);
        };
        if (e.fase === 'intro') {
            if (habla(e, n.clave)) {
                if (n === nacho) { ir(p.brazoD.rotation, 'x', -2.6, 10); ir(p.brazoI.rotation, 'x', -2.6, 10); ir(p.brazoD.rotation, 'z', -0.3, 10); ir(p.brazoI.rotation, 'z', 0.3, 10); } // «yo no estuve»
                else { ir(p.brazoD.rotation, 'x', -0.95 + Math.sin(T * 5) * 0.35, 12); ir(p.brazoD.rotation, 'z', 0.25 + Math.sin(T * 3.1) * 0.2, 12); }
                ir(p.cuello.rotation, 'y', aJ, 6);
            } else ir(p.cuello.rotation, 'y', t < 8 ? aJ * 0.7 : parr, 5);
        } else if (e.fase === 'juego') {
            ir(p.cuello.rotation, 'y', parr, 6); ir(p.cuello.rotation, 'x', 0.3, 6); // todos miran la parrilla
        } else if (e.final === 'bien') {
            if (n === andy && t >= 3 && !e.datos.bailo) { e.datos.bailo = true; andy.baile = 2.6; }
            if (n === nacho && t >= 5.6 && !e.datos.rio) { e.datos.rio = true; nacho.risa = 2.4; }
            if ((n === andy && andy.baile > 0) || (n === nacho && nacho.risa > 0)) return;
            if (habla(e, n.clave)) { ir(p.brazoI.rotation, 'x', -0.9 + Math.sin(T * 5) * 0.3, 12); ir(p.cuello.rotation, 'y', aJ, 6); }
            comer(n === hadad ? 0 : n === andy ? 2 : 4);
        } else { // quemado
            if (n === nacho && !e.datos.rio) { e.datos.rio = true; nacho.risa = 3.0; }
            if (n === nacho && nacho.risa > 0) return;
            if (n === andy && t >= 3.0 && t < 6.2) { // espanta el humo
                p.brazoD.rotation.x = -2.0 + Math.sin(T * 14) * 0.5; p.brazoI.rotation.x = -2.0 - Math.sin(T * 14) * 0.5;
                p.brazoD.rotation.z = -0.4; p.brazoI.rotation.z = 0.4;
                ir(p.cuello.rotation, 'x', -0.2, 8);
            } else if (n === hadad && t >= 5.6 && t < 8.8) { // se tapa la cara
                ir(p.brazoD.rotation, 'x', -2.3, 10); ir(p.brazoD.rotation, 'z', 0.6, 10); ir(p.cuello.rotation, 'x', 0.35, 8); ir(p.cuello.rotation, 'y', 0, 8);
            } else ir(p.cuello.rotation, 'y', t < 3 ? parr : aJ, 5);
        }
    }

    // ---------------------------------------------------------
    // Piezas
    // ---------------------------------------------------------
    function ponerPieza(d) {
        const def = d.carnes[d.i];
        d.actual = { id: def[0], cocido: def[1], crudo: def[2], v: 0, cA: 0, cB: 0, volteada: false, vVuelta: null, giro: 0, sale: 0, res: null };
        pieza.visible = true; pieza.rotation.set(0, 0, 0);
        pieza.position.set(fuego.x, suelo + 0.8, fuego.z);
        d.entra = 0.5;
    }
    function cerrarPieza(e, res) {
        const d = e.datos, p = d.actual;
        p.res = res; d.res.push(p); p.sale = 0.6;
        if (res === 'perfecta') reaccion(e, 'perfecta');
        else if (res === 'cruda') reaccion(e, 'cruda');
        else if (res === 'quemada') { reaccion(e, 'quemada'); for (let k = 0; k < 6; k++) emitir(fuego.x, suelo + 0.8, fuego.z, { s: 0.45, dur: 3, vy: 0.8, color: 0x2a2a2a, dispersion: 0.3 }); tos(3, 1); }
    }
    // Reacciones: cada una una vez, en cola (si alguien está hablando, espera su turno)
    const reaccion = (e, k) => { const d = e.datos; if (!d.reac.has(k)) d.pend.add(k); };
    function decirPendiente(e) {
        const d = e.datos;
        if (e.sueltas.length || !d.pend.size) return;
        const k = d.pend.values().next().value;
        d.pend.delete(k); d.reac.add(k);
        const [q, txt] = ASADO.reaccion[k];
        e.decir(q, txt, 2.6);
    }

    return {
        amigos: ['hadad', 'andy', 'nacho'],
        nombre: ASADO.nombre, boton: ASADO.boton,
        disponible: () => (carneEnInventario() ? null : ASADO.sinCarne),
        empezar(e) {
            const S = sitio();
            e.datos = { S, carnes: [], i: 0, actual: null, res: [], reac: new Set(), pend: new Set(), llama: 0, proxLlama: 2 + Math.random() * 2, entra: 0, consumida: false, bailo: false, rio: false, chisporroteo: 0 };
            jugador.colocar(S.x, suelo + dy, S.z);
            jugador.yaw = Math.atan2(fuego.x - S.x, fuego.z - S.z) - Math.PI; jugador.pitch = 0;
            e.P = { x: S.x, z: S.z };
            parrilla.position.set(fuego.x, suelo + 0.76, fuego.z); // sobre la llama de la antorcha
            parrilla.rotation.y = Math.atan2(S.x - fuego.x, S.z - fuego.z);
            pieza.rotation.y = parrilla.rotation.y;
            grupo.add(parrilla, pieza);
            pieza.visible = false;
            for (const n of [hadad, andy, nacho]) n.escena = (dt, base) => animar(n, e, dt, base);
            const PI = Math.PI;
            const planos = [
                { nombre: 'sobre tu hombro', ang: 0.45, dist: 3.6, alto: 2.9, orbita: 0.06, dolly: -0.3 },
                { nombre: 'general alto', ang: -1.2, dist: 5.8, alto: 3.8, orbita: 0.12, dolly: -0.6 },
                { nombre: 'contraplano desde la fogata', ang: PI - 0.45, dist: 3.0, alto: 2.0, orbita: -0.06, dolly: -0.3 },
                { nombre: 'picado sobre la parrilla', ang: 3 * PI / 4, dist: 2.6, alto: 3.6, orbita: 0.04, dolly: -0.2 }, // por el hueco entre Hadad y Andy
                { nombre: 'contrapicado', ang: 1.0, dist: 2.5, alto: 0.85, orbita: -0.08, dolly: -0.2 }
            ];
            return { ancla: { x: fuego.x, y: suelo, z: fuego.z, escala: 0.6 }, planos, evitar: [hadad, andy, nacho], foco: 0.5 };
        },
        alPasar(e, fase) {
            const d = e.datos;
            if (fase === 'juego') {
                // Toma hasta 3 piezas de carne cruda del inventario (en el orden de CARNES)
                for (const c of CARNES) while (d.carnes.length < 3 && inventario.quitar(c[0], 1)) d.carnes.push(c);
                d.consumida = d.carnes.length > 0;
                if (!d.carnes.length) d.carnes.push(CARNES[0]); // depuración (forzar sin carne): una pieza de prueba
                d.i = 0; ponerPieza(d);
            }
            if (fase === 'final') pieza.visible = false;
            if (fase === 'final' && e.final === 'quemado') {
                for (let k = 0; k < 14; k++) emitir(fuego.x, suelo + 0.8, fuego.z, { s: 0.6, dur: 4, vy: 0.9, color: 0x303030, dispersion: 0.45 });
                tos(2, 2);
            }
            if (fase === 'final' && e.final === 'bien') { [hadad, andy, nacho].forEach((n, i) => n.p.brazoD.add(presas[i])); camaras.cuerpo.brazoD.add(presas[3]); }
        },
        actualizar(e, dt) {
            const d = e.datos, t = e.t;
            jugador.yaw = Math.atan2(fuego.x - d.S.x, fuego.z - d.S.z) - Math.PI;
            if (e.fase === 'intro') { e.guion(ASADO.intro); if (t >= T_INTRO) e.pasar('juego'); return; }
            if (e.fase === 'final') {
                e.guion(ASADO[e.final]);
                if (e.final === 'quemado' && Math.random() < dt * 5) emitir(fuego.x, suelo + 0.9, fuego.z, { s: 0.5, dur: 3, vy: 0.7, color: 0x3a3a3a, dispersion: 0.4 });
                if (e.final === 'quemado' && t >= 3.2 && !d.tosAndy) { d.tosAndy = true; tos(2.5, 1); }
                if (t >= (e.final === 'quemado' ? 11 : 10)) e.fin();
                return;
            }
            // ---- Juego ----
            const p = d.actual;
            if (!p) return;
            decirPendiente(e);
            if (d.entra > 0) { d.entra -= dt; pieza.position.y = suelo + 0.8 + Math.max(0, d.entra) * 0.8; }
            if (p.sale > 0) {
                // Sale de la parrilla (sube y desaparece) y entra la siguiente o se acaba
                p.sale -= dt;
                pieza.position.y = suelo + 0.8 + (0.6 - p.sale) * 1.2;
                if (p.sale <= 0) {
                    pieza.visible = false;
                    d.i++;
                    if (d.i < d.carnes.length) ponerPieza(d);
                    else e.pasar('final', d.res.some(r => r.res === 'quemada') ? 'quemado' : 'bien');
                }
                return;
            }
            // Llamaradas: de vez en cuando el fuego se aviva y la barra corre más
            d.proxLlama -= dt;
            if (d.proxLlama <= 0) { d.llama = 0.9; d.proxLlama = 2.2 + Math.random() * 2.2; reaccion(e, 'llama'); sonidos.fuego(); }
            d.llama = Math.max(0, d.llama - dt);
            if (d.llama > 0 && api.particulas) api.particulas.fuego(fuego.x, suelo + dy + 0.45, fuego.z);
            const avance = VEL * (d.llama > 0 ? 2.2 : 1) * (d.entra > 0 ? 0 : 1) * dt;
            p.v += avance;
            // El lado de abajo se dora; el de arriba solo se entibia
            if (p.volteada) { p.cB += avance / LADO; p.cA += avance * 0.3; } else { p.cA += avance / LADO; p.cB += avance * 0.3; }
            if (p.v >= VUELTA[0] && p.v < VUELTA[1] && !p.volteada) reaccion(e, 'vuelta');
            // Chisporroteo y humo suave
            if ((d.chisporroteo -= dt) <= 0) { d.chisporroteo = 0.5 + Math.random() * 0.6; emitir(fuego.x, suelo + 0.75, fuego.z, { s: 0.22, dur: 1.6, vy: 0.6, color: 0xc8c8c8 }); }
            // Dar vuelta: medio giro sobre el eje largo (0,35 s)
            if (p.giro > 0) { p.giro -= dt; pieza.rotation.x = Math.PI * (1 - Math.max(0, p.giro) / 0.35) * (p.volteada ? 1 : 0); pieza.position.y = suelo + 0.8 + Math.sin(Math.PI * (1 - Math.max(0, p.giro) / 0.35)) * 0.25; }
            // Se quema: un lado pasó de negro o la barra llegó al final
            if (p.cA > 1.35 || p.cB > 1.35 || p.v >= 1) cerrarPieza(e, 'quemada');
            pintarPieza(d);
        },
        accion(e) {
            const d = e.datos, p = d.actual;
            if (!p || p.sale > 0 || p.giro > 0 || d.entra > 0) return;
            if (!p.volteada) { p.volteada = true; p.vVuelta = p.v; p.giro = 0.35; d.pend.delete('vuelta'); sonidos.golpe(); return; }
            // Sacar: perfecta si la vuelta y la salida fueron en sus zonas; cruda si es antes de la verde
            const vueltaBien = p.vVuelta >= VUELTA[0] && p.vVuelta <= VUELTA[1];
            const res = p.v < SACAR[0] || p.cA < 0.7 ? 'cruda' : vueltaBien && p.v <= SACAR[1] ? 'perfecta' : 'bien';
            sonidos.recoger();
            cerrarPieza(e, res);
        },
        premio(e) {
            const d = e.datos, lista = [];
            const sumar = (id, n) => { const x = lista.find(l => l[0] === id); if (x) x[1] += n; else lista.push([id, n]); };
            if (!d.consumida) return lista; // forzado sin carne: no se regala nada
            for (const r of d.res) {
                if (r.res === 'perfecta' || r.res === 'bien') sumar(r.cocido, 1);
                else if (r.res === 'cruda') sumar(r.id, 1);
                else sumar(O.CARBON, 1);
            }
            if (e.final === 'bien') {
                sumar(O.PAPA_ASADA, 2);
                if (d.res.length === 3 && d.res.every(r => r.res === 'perfecta')) sumar(O.ESMERALDA, 1);
            }
            return lista;
        },
        // Tú: de pie mirando el fuego; en el juego, inclinado hacia la parrilla con la mano adelante
        pose(e) {
            const d = e.datos, t = e.t, T = e.total;
            const giroAmigo = n => lim(angulo(Math.atan2(n.x - jugador.pos.x, n.z - jugador.pos.z) - (jugador.yaw + Math.PI)), -1, 1);
            if (e.fase === 'intro') {
                const quien = ['hadad', 'andy', 'nacho'].find(k => habla(e, k));
                const yo = habla(e, 'j');
                return { cy: quien ? giroAmigo(C[quien]) * 0.8 : 0, cx: 0.05,
                    bDx: yo ? -0.9 + Math.sin(T * 5) * 0.3 : 0, bDz: yo ? 0.2 + Math.sin(T * 3.1) * 0.15 : 0.05, bIx: yo ? -0.55 + Math.sin(T * 4 + 1) * 0.2 : 0, bIz: yo ? -0.15 : -0.05 };
            }
            if (e.fase === 'juego') {
                const p = d.actual, f = 0.35;
                let bDx = -1.15, bDz = 0.12;
                if (p && p.giro > 0) { const u = 1 - p.giro / 0.35; bDx = -1.15 - Math.sin(u * Math.PI) * 0.45; bDz = 0.12 + Math.sin(u * Math.PI) * 0.3; }
                if (p && p.sale > 0) bDx = -1.15 - Math.sin((0.6 - p.sale) / 0.6 * Math.PI) * 0.6;
                return { inc: f, pDx: -f, pIx: -f, y: 0.75 * (1 - Math.cos(f)), bDx, bDz, bIx: 0.2, bIz: -0.1, cx: 0.35 };
            }
            if (e.final === 'bien') {
                const yo = envolvente(t, 8.0, 10.0, 0.3); // «les dije»: te señalas
                const c = Math.max(0, Math.sin(T * 2.6 + 1)) * (1 - yo);
                return { bDx: lerp(lerp(-1.0, -2.25, c), -1.25, yo), bDz: lerp(lerp(0.15, 0.55, c), 0.85, yo), cx: lerp(lerp(0.1, -0.05, c), 0.3, yo), cy: yo ? 0 : giroAmigo(andy) * 0.5 };
            }
            // Quemado: tose con la mano en la boca, después se rasca la cabeza
            const tose = envolvente(t, 0.3, 3.4, 0.3), rasca = envolvente(t, 8.6, 11, 0.3);
            return {
                bIx: lerp(lerp(0, -2.2, tose), -2.85 + Math.sin(t * 14) * 0.08, rasca), bIz: lerp(lerp(-0.05, -0.55, tose), -0.42, rasca),
                inc: tose * (0.12 + Math.abs(Math.sin(t * 9)) * 0.08), pDx: -tose * 0.12, pIx: -tose * 0.12,
                cx: lerp(tose * 0.25, 0.12, rasca), cz: -0.15 * rasca, cy: !tose && !rasca ? giroAmigo(hadad) * 0.6 : 0
            };
        },
        ui(e) {
            const d = e.datos, p = d.actual;
            if (!p) return null;
            const listo = !(p.sale > 0 || p.giro > 0 || d.entra > 0);
            const zona = !p.volteada ? (p.v >= VUELTA[0] && p.v <= VUELTA[1]) : (p.v >= SACAR[0] && p.v <= SACAR[1]);
            return {
                titulo: ASADO.pieza(Math.min(d.i + 1, d.carnes.length), d.carnes.length),
                barras: [{ nombre: api.etiq(ASADO.coccion), v: Math.round(p.v * 100), max: 100, texto: `${Math.min(100, Math.round(p.v * 100))}%` }],
                cursor: p.v, zona: SACAR, zona2: p.volteada ? null : VUELTA, apagado: !listo,
                pista: ASADO.pista, boton: !listo ? ASADO.acciones.espera : p.volteada ? ASADO.acciones.sacar : ASADO.acciones.vuelta,
                inactivo: !listo, urgente: listo && zona
            };
        },
        restaurar(e) {
            const d = e.datos;
            for (const n of [hadad, andy, nacho]) delete n.escena;
            grupo.remove(parrilla, pieza);
            for (const m of presas) if (m.parent) m.parent.remove(m);
            // Te rendiste a medio asado: vuelven las piezas que no alcanzaste a cerrar
            if (e.fase === 'juego' && d.consumida) {
                for (let k = d.res.length; k < d.carnes.length; k++) inventario.agregar(d.carnes[k][0], 1);
            }
        }
    };
}
