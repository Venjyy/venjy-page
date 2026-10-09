// =========================================================
// VENJY · Supervivencia · Minijuego: pesca en el muelle con Pony (sin competir)
// Te sientas junto a Pony en la punta del muelle, cada uno con su caña. Mientras Pony pesca a su
// ritmo te cuenta una historia (la primera vez, cómo se echó un ramo por culpa de la Profe Karly;
// después, el examen de repetición; después, su mazo de agua de Pokémon TCG). Un solo botón según el momento:
//   LANZAR → el corcho vuela al agua · ESPERA → a los 2,5–5,5 s pica (se hunde y salpica)
//   ¡RECOGER! (1,2 s para reaccionar; si no, se va) → ¡TIRA!: dos pulsaciones con la marca en la zona
//   verde (un fallo o 4 s sin lograrlo y se escapa) → el pez sale en arco y coletea en tu mano.
// Guion (s de cada fase):
//   intro 8 s (7 s las siguientes veces) · 0,0–0,6 fundido: Pony se corre medio bloque y te sientas a
//                su lado con la caña · diálogo de bienvenida (tabla en minijuegos-datos.js)
//   juego ~62 s · la historia corre sola en globos (Pony gesticula con la mano libre y te mira al
//                hablar; la cámara se inclina hacia quien habla); termina cuando acaba la historia y
//                no tienes un pez a medio sacar
//   final 8 s   · según los peces: 0 (cero), 1–3 (pocos) o 4+ (muchos, con algo raro del fondo)
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { NIVEL_AGUA } from '../voxeles.js';
import { caja, texturaPixeles, ajustar, angulo } from '../criaturas/cuerpo.js';
import { O } from './objetos.js';
import { sonidos } from './sonidos.js';
import { PESCA } from './minijuegos-datos.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tri = u => { const f = u - Math.floor(u); return f < 0.5 ? f * 2 : 2 - f * 2; };

const AGUA = NIVEL_AGUA + 0.86;  // superficie del agua en coordenadas del creativo (la de Pony)
const VENTANA = 1.2, TIRONES = 2, PLAZO_TIRA = 4;
const TESOROS = [[O.LINGOTE_ORO, 1], [O.ESMERALDA, 1], [O.CUERO, 2], [O.HUESO, 3]];

export function crearPescaPony(api) {
    const { grupo, dy, jugador, camaras, npcs, terreno, particulas, tinte } = api;
    const pony = npcs.pony, P = terreno.pescador;
    if (!pony || !P) return null;
    const px = P.dz ? 1 : 0, pz = P.dx ? 1 : 0; // a lo ancho del muelle (como en construcciones.js)

    // ---- Tu caña, línea, corcho y pez (copiados de los de Pony) ----
    const cana = new THREE.Group();
    cana.position.set(0, -0.68, 0.06);
    const vara = caja(0.05, 2.6, 0.05, tinte.caras(texturaPixeles(4, 16, 7201, (x, y, r) => ajustar([92, 64, 36], 0.8 + r() * 0.4))));
    vara.position.y = 1.3;
    const punta = new THREE.Object3D(); punta.position.y = 2.6;
    cana.add(vara, punta);
    cana.rotation.x = 1.7;
    const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x2a2a2a }));
    linea.frustumCulled = false;
    const corcho = caja(0.16, 0.16, 0.16, tinte.caras(texturaPixeles(4, 4, 7202, (x, y) => (y < 2 ? [214, 40, 40] : [240, 240, 240]))));
    const pezTex = texturaPixeles(8, 4, 7203, (x, y, r) => y === 0 ? [150, 110, 90] : x >= 6 ? [120, 84, 70] : (x === 1 && y === 1 ? [10, 10, 10] : ajustar([210, 150, 120], 0.9 + r() * 0.2)));
    const pez = new THREE.Group();
    const pezC = caja(0.08, 0.16, 0.38, tinte.caras(pezTex));
    const pezCola = caja(0.04, 0.2, 0.1, tinte.caras(pezTex)); pezCola.position.z = -0.24;
    pez.add(pezC, pezCola);
    const vT = new THREE.Vector3();

    const hablaPony = e => (e.fase === 'intro' ? e.dice(e.datos.intro, 'pony') : e.fase === 'juego' ? e.dice(e.datos.hist, 'pony') : e.dice(PESCA[e.final], 'pony'));
    const hablaJ = e => (e.fase === 'intro' ? e.dice(e.datos.intro, 'j') : e.fase === 'juego' ? e.dice(e.datos.hist, 'j') : e.dice(PESCA[e.final], 'j'));
    const finHistoria = lista => lista[lista.length - 1][1] + 0.8;

    // Pony: sigue pescando a su ritmo (su animación) y, cuando habla, gesticula con la mano libre y te mira
    function animarPony(e, dt, base) {
        base(dt);
        const p = pony.p, t = e.total;
        if (hablaPony(e)) {
            p.brazoI.rotation.x = -0.95 + Math.sin(t * 5) * 0.3;
            p.brazoI.rotation.z = -0.15 + Math.sin(t * 3.1) * 0.12;
            const giro = lim(angulo(Math.atan2(jugador.pos.x - pony.x, jugador.pos.z - pony.z) - pony.yaw), -0.9, 0.9);
            p.cuello.rotation.y += (giro - p.cuello.rotation.y) * Math.min(1, dt * 6);
            p.cuello.rotation.x = Math.sin(t * 6) * 0.06;
        } else {
            p.brazoI.rotation.x += (-0.7 - p.brazoI.rotation.x) * Math.min(1, dt * 6);
            p.brazoI.rotation.z += (-0.25 - p.brazoI.rotation.z) * Math.min(1, dt * 6);
        }
    }

    // Blanco de tu corcho: frente a ti, un poco hacia tu lado (las líneas no se cruzan con la de Pony)
    function nuevoBlanco(d) {
        const lejos = 3.4 + Math.random() * 1.2, lado = 1.0 + Math.random() * 0.8;
        d.blanco = { x: P.x + P.dx * lejos + px * lado, z: P.z + P.dz * lejos + pz * lado };
    }
    function cambiar(d, est, reloj) { d.est = est; d.reloj = reloj; d.r0 = reloj; }

    return {
        amigos: ['pony'],
        nombre: PESCA.nombre, boton: PESCA.boton,
        disponible: () => null,
        empezar(e) {
            // Qué historia toca: la Profe Karly la primera vez, después el examen de repetición, después
            // Pokémon TCG; cuando ya las oíste todas, una al azar
            const primera = !api.hecho('pesca');
            const todas = [PESCA.historia, PESCA.historia2, PESCA.historia3];
            const hist = primera ? PESCA.historia : !api.hecho('pesca-2') ? PESCA.historia2 : !api.hecho('pesca-3') ? PESCA.historia3 : todas[Math.floor(Math.random() * 3)];
            if (hist === PESCA.historia2) api.marcar('pesca-2');
            if (hist === PESCA.historia3) api.marcar('pesca-3');
            const d = e.datos = { intro: primera ? PESCA.intro : PESCA.introOtra, hist, est: 'listo', reloj: 0, r0: 1, peces: 0, botin: [], cursor: 0, fase: 0, buenos: 0, blanco: null, pony0: { x: pony.x, z: pony.z } };
            // Pony se corre medio bloque a un lado y tú te sientas en el otro
            pony.x = P.x - px * 0.5; pony.z = P.z - pz * 0.5;
            const x = P.x + px * 0.5, z = P.z + pz * 0.5;
            jugador.colocar(x, P.y + dy, z);
            jugador.yaw = P.yaw - Math.PI; jugador.pitch = 0; // de cara al agua
            e.P = { x, z };
            camaras.cuerpo.brazoD.add(cana);
            grupo.add(linea, corcho, pez);
            pez.visible = false;
            corcho.position.set(x + P.dx * 0.5, P.y + 0.3, z + P.dz * 0.5);
            nuevoBlanco(d);
            pony.escena = (dt, base) => animarPony(e, dt, base);
            // Planos: la línea Pony → tú va a lo ancho del muelle; el agua queda en ang = s·π/2
            const PI = Math.PI;
            const s = Math.sign(angulo(Math.atan2(P.dx, P.dz) - Math.atan2(px, pz))) || 1;
            const planos = [
                { nombre: 'general desde el agua', ang: s * PI / 2, dist: 5.6, alto: 2.0, orbita: 0.08 * s, dolly: -0.5 },
                { nombre: 'tres cuartos, tu lado', ang: s * 0.8, dist: 3.2, alto: 1.3, orbita: 0.05 * s, dolly: -0.3 },
                { nombre: 'desde el muelle, hacia los corchos', ang: -s * (PI / 2 - 0.35), dist: 3.2, alto: 2.3, orbita: -0.06 * s, dolly: -0.3 },
                { nombre: 'tres cuartos, lado de Pony', ang: s * (PI - 0.8), dist: 3.2, alto: 1.3, orbita: -0.05 * s, dolly: -0.3 },
                { nombre: 'contrapicado sobre el agua', ang: s * (PI / 2 - 0.25), dist: 2.8, alto: 0.55, orbita: 0.06 * s, dolly: -0.2 }
            ];
            // Ancla en Pony, más baja (está sentado): la «cabeza» que encuadra la cámara queda a 1,55·0,7
            return { ancla: { x: pony.x, y: pony.y, z: pony.z, escala: 0.7 }, planos, visibles: [pony], evitar: [pony], foco: 0.5 };
        },
        actualizar(e, dt) {
            const d = e.datos, t = e.t;
            jugador.yaw = P.yaw - Math.PI;
            // La cámara se inclina hacia quien habla
            camaras.enfocar(hablaPony(e) ? 0.3 : hablaJ(e) ? 0.7 : 0.5);
            if (e.fase === 'intro') { e.guion(d.intro); if (t >= d.intro[d.intro.length - 1][1]) e.pasar('juego'); }
            else if (e.fase === 'final') { e.guion(PESCA[e.final]); if (t >= 8) { e.fin(); return; } }
            else {
                e.guion(d.hist);
                // Termina con la historia, salvo que tengas un pez a medio sacar
                if (t >= finHistoria(d.hist) && !['pica', 'tira', 'saca', 'muestra'].includes(d.est)) {
                    e.pasar('final', d.peces === 0 ? 'cero' : d.peces < 4 ? 'pocos' : 'muchos');
                }
            }
            this.pescar(e, dt);
        },
        // Tu caña: el estado del corcho y del pez, cuadro a cuadro
        pescar(e, dt) {
            const d = e.datos, b = d.blanco;
            if (d.reloj > 0) d.reloj -= dt;
            const u = 1 - Math.max(0, d.reloj) / d.r0;
            const tc = e.total;
            camaras.cuerpo.g.updateMatrixWorld(true);
            punta.getWorldPosition(vT); grupo.worldToLocal(vT);
            if (d.est === 'listo' || d.est === 'escapa') {
                // Corcho colgando de la punta
                corcho.position.lerp(vT.clone().setY(vT.y - 0.6), Math.min(1, dt * 8));
                if (d.est === 'escapa' && d.reloj <= 0) cambiar(d, 'listo', 0);
            } else if (d.est === 'lanza') {
                const k = Math.max(0, (u - 0.35) / 0.65);
                if (k > 0) corcho.position.set(lerp(vT.x, b.x, k), lerp(vT.y, AGUA, k) + Math.sin(k * Math.PI) * 1.2, lerp(vT.z, b.z, k));
                if (d.reloj <= 0) { cambiar(d, 'espera', 2.5 + Math.random() * 3); particulas.salpicar(b.x, AGUA + dy, b.z); sonidos.salpicar(); }
            } else if (d.est === 'espera') {
                corcho.position.set(b.x, AGUA + Math.sin(tc * 2.2) * 0.03, b.z);
                if (d.reloj <= 0) { cambiar(d, 'pica', VENTANA); particulas.salpicar(b.x, AGUA + dy, b.z); sonidos.salpicar(); }
            } else if (d.est === 'pica') {
                corcho.position.set(b.x, AGUA - Math.max(0, Math.sin(u * VENTANA * 18)) * 0.18, b.z);
                if (d.reloj <= 0) { cambiar(d, 'escapa', 0.9); nuevoBlanco(d); }
            } else if (d.est === 'tira') {
                d.fase += dt / 1.1;
                d.cursor = tri(d.fase);
                corcho.position.set(b.x + Math.sin(tc * 13) * 0.08, AGUA - 0.12, b.z + Math.cos(tc * 11) * 0.08);
                if (d.reloj <= 0) { cambiar(d, 'escapa', 0.9); nuevoBlanco(d); }
            } else if (d.est === 'saca') {
                // El pez sale del agua en arco hasta tu mano
                const mano = { x: jugador.pos.x + P.dx * 0.45, y: P.y + 1.0, z: jugador.pos.z + P.dz * 0.45 };
                pez.visible = true;
                pez.position.set(lerp(b.x, mano.x, u), lerp(AGUA, mano.y, u) + Math.sin(u * Math.PI) * 1.6, lerp(b.z, mano.z, u));
                pez.rotation.set(u * 9, P.yaw, 0);
                corcho.position.copy(pez.position);
                if (d.reloj <= 0) cambiar(d, 'muestra', 1.1);
            } else if (d.est === 'muestra') {
                pez.position.set(jugador.pos.x + P.dx * 0.45, P.y + 1.05, jugador.pos.z + P.dz * 0.45);
                pez.rotation.set(Math.sin(tc * 20) * 0.5, P.yaw + Math.PI / 2, 0); // coletea
                corcho.position.copy(pez.position);
                if (d.reloj <= 0) { pez.visible = false; d.peces++; d.botin.push(Math.random() < 0.6 ? O.BACALAO : O.SALMON); sonidos.recoger(); cambiar(d, 'listo', 0); nuevoBlanco(d); }
            }
            const pos = linea.geometry.attributes.position;
            pos.setXYZ(0, vT.x, vT.y, vT.z);
            pos.setXYZ(1, corcho.position.x, corcho.position.y + 0.08, corcho.position.z);
            pos.needsUpdate = true;
        },
        accion(e) {
            const d = e.datos;
            if (d.est === 'listo') { cambiar(d, 'lanza', 0.9); sonidos.arco(); }
            else if (d.est === 'pica') { cambiar(d, 'tira', PLAZO_TIRA); d.buenos = 0; d.fase = Math.random(); d.zonaC = 0.3 + Math.random() * 0.4; }
            else if (d.est === 'tira') {
                if (Math.abs(d.cursor - d.zonaC) <= 0.13) {
                    d.buenos++; sonidos.clic();
                    if (d.buenos >= TIRONES) { cambiar(d, 'saca', 0.9); particulas.salpicar(d.blanco.x, AGUA + dy, d.blanco.z); sonidos.salpicar(); }
                    else d.zonaC = 0.3 + Math.random() * 0.4;
                } else { cambiar(d, 'escapa', 0.9); nuevoBlanco(d); sonidos.golpe(); }
            }
        },
        premio(e) {
            const d = e.datos, cuenta = new Map();
            for (const id of d.botin) cuenta.set(id, (cuenta.get(id) || 0) + 1);
            const lista = [...cuenta];
            if (e.final === 'muchos') lista.push(TESOROS[Math.floor(Math.random() * TESOROS.length)].slice());
            return lista;
        },
        // Sentado en el borde con los pies colgando, la caña en la derecha (como Pony); al lanzar o tirar, la sube
        pose(e) {
            const d = e.datos, u = d.r0 ? 1 - Math.max(0, d.reloj) / d.r0 : 1, tc = e.total;
            let alzar = 0;
            if (d.est === 'lanza') alzar = u < 0.35 ? u / 0.35 * 1.1 : 1.1 * (1 - (u - 0.35) / 0.65) - 0.15 * Math.sin((u - 0.35) / 0.65 * Math.PI);
            else if (d.est === 'pica') alzar = 0.08 * Math.max(0, Math.sin(u * VENTANA * 18));
            else if (d.est === 'tira') alzar = 0.45 + Math.sin(tc * 14) * 0.08;
            else if (d.est === 'saca') alzar = Math.min(1, u * 2.5) * 0.9;
            else if (d.est === 'muestra') alzar = 0.9;
            const habla = hablaJ(e);
            const aPony = 0.5 * Math.sign(angulo(Math.atan2(pony.x - jugador.pos.x, pony.z - jugador.pos.z) - (jugador.yaw + Math.PI))); // cy hacia Pony
            return {
                y: -0.62, pDx: -0.55, pIx: -0.55,
                bDx: -0.75 - alzar, bDz: 0,
                bIx: habla ? -0.95 + Math.sin(tc * 5) * 0.3 : -0.7, bIz: habla ? -0.15 : -0.25,
                cx: d.est === 'espera' || d.est === 'pica' ? 0.3 : 0.1, cy: hablaPony(e) ? aPony : habla ? aPony * 0.6 : 0
            };
        },
        posGlobo(e, quien) {
            if (quien === 'pony') return { x: pony.x, y: pony.y + 2.05, z: pony.z };
            if (quien === 'j') return { x: jugador.pos.x, y: jugador.pos.y - dy + 2.05, z: jugador.pos.z };
            return null;
        },
        ui(e) {
            const d = e.datos, A = PESCA.acciones;
            const boton = { listo: A.lanzar, lanza: A.espera, espera: A.espera, pica: A.recoger, tira: A.tirar, saca: A.saca, muestra: A.saca, escapa: A.escapa }[d.est];
            const tira = d.est === 'tira';
            return {
                titulo: PESCA.nombre,
                barras: [
                    { nombre: api.etiq(PESCA.peces), v: d.peces, max: Math.max(4, d.peces), texto: `${d.peces}` },
                    ...(tira ? [{ nombre: api.etiq(PESCA.tension), v: d.buenos, max: TIRONES }] : [])
                ],
                cursor: tira ? d.cursor : null, zona: tira ? [d.zonaC - 0.13, d.zonaC + 0.13] : null,
                pista: PESCA.pista, boton,
                inactivo: !['listo', 'pica', 'tira'].includes(d.est),
                urgente: d.est === 'listo' || d.est === 'pica' || (tira && Math.abs(d.cursor - d.zonaC) <= 0.13)
            };
        },
        restaurar(e) {
            const d = e.datos;
            delete pony.escena;
            pony.x = d.pony0.x; pony.z = d.pony0.z;
            if (cana.parent) cana.parent.remove(cana);
            grupo.remove(linea, corcho, pez);
        }
    };
}
