// =========================================================
// VENJY · Supervivencia · Pesca
// Caña en la mano + clic derecho lanza la boya. Al caer al agua flota y, tras 5 a 20 s,
// pica: se hunde, salpica y suena. Si recoges (clic derecho) antes de 1 s, sacas algo:
// bacalao, salmón, pez globo o, rara vez, un tesoro. Recoger sin picada no da nada.
// La línea va de la punta de la caña (abajo a la derecha de la pantalla) a la boya.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B, TIPO } from '../texturas.js';
import { O } from './objetos.js';
import { sonidos } from './sonidos.js';
import { botinPesca } from './facilidades-datos.js';

// `mult`: multiplicadores de la misión activa (facilidades-datos.js; pony2 sube el pez globo y el salmón)
function botin(mult) {
    const id = botinPesca(Math.random(), mult);
    if (id) return [id, 1];
    const tesoros = [[O.LINGOTE_ORO, 2], [O.ESMERALDA, 1], [O.ARCO, 1], [O.CANA, 1], [O.HUESO, 3], [O.CUERO, 2]];
    return tesoros[Math.floor(Math.random() * tesoros.length)];
}

export function crearPesca({ scene, camara, mundo, jugador, inventario, entidades, particulas, alPescar, multiplicadores }) {
    let boya = null;
    const malla = new THREE.Group();
    const roja = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), new THREE.MeshBasicMaterial({ color: 0xd02020 }));
    const blanca = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), new THREE.MeshBasicMaterial({ color: 0xf0f0f0 }));
    roja.position.y = 0.08; blanca.position.y = -0.02;
    malla.add(roja, blanca);
    malla.visible = false;
    scene.add(malla);
    const geoLinea = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const linea = new THREE.Line(geoLinea, new THREE.LineBasicMaterial({ color: 0x202020 }));
    linea.frustumCulled = false;
    linea.visible = false;
    scene.add(linea);
    const dir = new THREE.Vector3(), punta = new THREE.Vector3();

    function lanzar() {
        camara.getWorldDirection(dir);
        boya = {
            pos: camara.position.clone().addScaledVector(dir, 0.6),
            vel: dir.clone().multiplyScalar(11).add(new THREE.Vector3(0, 2.5, 0)),
            estado: 'vuela', reloj: 0, pica: 0, enSuelo: false
        };
        malla.visible = linea.visible = true;
        sonidos.arco();
    }

    function recoger() {
        if (!boya) return;
        let desgaste = 1;
        if (boya.estado === 'pica') {
            const [id, n] = botin(multiplicadores && multiplicadores());
            // La captura va directo al inventario (como si la tiraras hacia ti); si no cabe, cae a tus pies
            const resto = inventario.agregar(id, n);
            if (resto) entidades.soltar(id, resto, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
            sonidos.recoger();
            particulas.salpicar(boya.pos.x, boya.pos.y, boya.pos.z);
            sonidos.salpicar();
            alPescar && alPescar(id);
        } else if (boya.enSuelo) desgaste = 2;
        if (inventario.idEnMano() === O.CANA && inventario.desgastarMano(desgaste)) sonidos.herramientaRota();
        quitar();
    }

    function quitar() { boya = null; malla.visible = linea.visible = false; }

    return {
        get activa() { return !!boya; },
        get estadoBoya() { return boya ? boya.estado : null; }, // depuración
        get boya() { return boya; },
        usar() { if (boya) recoger(); else lanzar(); return true; },
        quitar,
        actualizar(dt) {
            if (!boya) return;
            // Se corta si cambias de objeto o te alejas mucho
            if (inventario.idEnMano() !== O.CANA || boya.pos.distanceTo(jugador.pos) > 32) { quitar(); return; }
            const b = boya;
            const id = mundo.bloque(b.pos.x, b.pos.y, b.pos.z);
            const enAgua = id === B.AGUA;
            if (b.estado === 'vuela') {
                b.vel.y -= 14 * dt;
                const sig = b.pos.clone().addScaledVector(b.vel, dt);
                const idSig = mundo.bloque(sig.x, sig.y, sig.z);
                const solido = id => id > 0 && (TIPO[id] === 1 || TIPO[id] === 2);
                if (solido(idSig)) {
                    // Si choca de lado (una baranda, un muro), pierde el impulso y cae; si cae encima, queda quieta
                    if (b.vel.y < 0 && solido(mundo.bloque(b.pos.x, sig.y, b.pos.z))) { b.vel.set(0, 0, 0); b.enSuelo = true; b.estado = 'quieta'; }
                    else { b.vel.x = 0; b.vel.z = 0; }
                } else b.pos.copy(sig);
                if (enAgua) { b.estado = 'flota'; b.reloj = 5 + Math.random() * 15; particulas.salpicar(b.pos.x, b.pos.y, b.pos.z); sonidos.salpicar(); }
                if (b.pos.y < 0) quitar();
            } else if (b.estado === 'flota' || b.estado === 'pica') {
                // Flota en la superficie del agua
                let sup = Math.floor(b.pos.y);
                while (mundo.bloque(b.pos.x, sup + 1, b.pos.z) === B.AGUA) sup++;
                const yAgua = sup + 0.86;
                b.pos.y += (yAgua - b.pos.y) * Math.min(1, dt * 6);
                b.reloj -= dt;
                if (b.estado === 'flota' && b.reloj <= 0) {
                    b.estado = 'pica'; b.pica = 0.9;
                    particulas.salpicar(b.pos.x, b.pos.y, b.pos.z);
                    sonidos.salpicar();
                } else if (b.estado === 'pica') {
                    b.pica -= dt;
                    b.pos.y = yAgua - 0.25;
                    if (Math.random() < dt * 20) particulas.salpicar(b.pos.x, b.pos.y + 0.1, b.pos.z);
                    if (b.pica <= 0) { b.estado = 'flota'; b.reloj = 5 + Math.random() * 15; }
                }
            }
            malla.position.copy(b.pos);
            // Línea desde la punta de la caña (en la vista) hasta la boya
            punta.set(0.45, -0.2, -1).applyQuaternion(camara.quaternion).add(camara.position);
            const pos = geoLinea.attributes.position;
            pos.setXYZ(0, punta.x, punta.y, punta.z);
            pos.setXYZ(1, b.pos.x, b.pos.y + 0.1, b.pos.z);
            pos.needsUpdate = true;
        }
    };
}
