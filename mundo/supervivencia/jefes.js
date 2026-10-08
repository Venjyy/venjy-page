// =========================================================
// VENJY · Supervivencia · Jefes
// Venjy entrega un objeto; en el altar del lugar (clic derecho con el objeto) aparece el jefe:
//  1. El Imbunche, al fondo de la mina: salta en una pierna, embiste, invoca lepismas y
//     derrumba grava del techo.
//  2. El Chonchon gigante, en el portal en ruinas: cabeza voladora que lanza bolas de fuego y
//     a veces baja a morder (hace falta arco y escudo). Grita «tue tue».
//  3. El Caleuche, frente al naufragio: el barco fantasma emerge del mar con una pasarela a la
//     orilla; dos oleadas de tripulación y luego el capitán brujo (se teletransporta, lanza
//     fuego, invoca esqueletos y rayos). Al ganar, el barco se hunde y aparecen los créditos.
// Si mueres o te alejas, el jefe se va y te devuelve el objeto para reintentar.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B, TIPO } from '../texturas.js';
import { BASE_ESTRUCTURA, NIVEL_AGUA } from '../voxeles.js';
import { crearTinte, crearPersona, caminar, texturaPixeles, caja } from '../criaturas/cuerpo.js';
import { moverCuerpo, solidoEn } from '../fisica.js';
import { lanzarRayo } from '../rayo.js';
import { O } from './objetos.js';
import { sonidos } from './sonidos.js';

const ajustar = ([r, g, b], f) => [r * f, g * f, b * f];
const mota = (c, f = 0.2) => (x, y, r) => ajustar(c, 1 - f / 2 + r() * f);
const NOMBRES = {
    imbunche: { es: 'El Imbunche', en: 'The Imbunche' },
    chonchon: { es: 'El Chonchon gigante', en: 'The giant Chonchon' },
    caleuche: { es: 'El Caleuche', en: 'The Caleuche' },
    capitan: { es: 'El capitán brujo del Caleuche', en: 'The Caleuche warlock captain' }
};

export function crearJefes(ctx) {
    const { scene, mundo, jugador, camara, terreno, dy, vida, inventario, entidades, enemigos, proyectiles, particulas, hud, misiones } = ctx;
    let idioma = ctx.idioma || 'es';
    const L = o => o[idioma] || o.es;
    let actual = null; // { tipo, ... }

    // ---------- Altares ----------
    const sup = (x, z) => terreno.HT[Math.floor(z) * terreno.BW + Math.floor(x)] + dy + 1;
    function altares() {
        const l = {};
        const mina = (terreno.decor || []).find(d => d.t === 'mina');
        if (mina) { const y0 = (mina.y ?? BASE_ESTRUCTURA + 1) + dy; l.imbunche = { x: mina.x, y: y0, z: mina.z - 22 }; }
        const portal = (terreno.lugares || []).find(p => p.clave === 'portal');
        if (portal) l.chonchon = { x: Math.floor(portal.x) + 7, z: Math.floor(portal.z) + 1, y: sup(portal.x + 7, portal.z + 1) };
        const nau = (terreno.lugares || []).find(p => p.clave === 'naufragio');
        if (nau) {
            // En tierra firme, lo más cerca posible del naufragio
            let mejor = null;
            for (let r = 4; r < 30 && !mejor; r++) for (let a = 0; a < 16 && !mejor; a++) {
                const x = Math.floor(nau.x + Math.cos(a / 16 * Math.PI * 2) * r), z = Math.floor(nau.z + Math.sin(a / 16 * Math.PI * 2) * r);
                const o = z * terreno.BW + x;
                if (!terreno.ES[o] && terreno.HT[o] > NIVEL_AGUA) mejor = { x, z, y: terreno.HT[o] + dy + 1 };
            }
            l.caleuche = mejor;
        }
        return l;
    }
    const ALTARES = altares();
    function asegurarAltar(tipo) {
        const a = ALTARES[tipo];
        if (!a) return;
        const b = mundo.bloque(a.x, a.y, a.z);
        if (b !== -1 && b !== B.ALTAR) mundo.editarLote([[a.x, a.y, a.z, B.ALTAR], [a.x, a.y + 1, a.z, 0], [a.x, a.y + 2, a.z, 0]], true);
    }

    // ---------- Barra de vida ----------
    const barra = document.createElement('div');
    barra.className = 'vida-jefe';
    barra.hidden = true;
    barra.innerHTML = '<b></b><div class="barra-jefe"><i></i></div>';
    document.getElementById('hud').appendChild(barra);
    function pintarBarra(nombre, k) {
        barra.hidden = false;
        barra.firstChild.textContent = L(nombre);
        barra.querySelector('i').style.width = Math.max(0, k * 100).toFixed(1) + '%';
    }

    // ---------- Utilidades de modelos ----------
    const luzTinte = new THREE.Color();
    function iluminar(t, pos, rojo) {
        const l = mundo.nivelLuz(pos.x, pos.y + 1, pos.z);
        const c = Math.pow(l >= 0 ? (l >> 4) / 15 : 1, 1.6), b = Math.pow(l >= 0 ? (l & 15) / 15 : 0, 1.6);
        luzTinte.copy(ctx.tinteMundo).multiplyScalar(c);
        luzTinte.setRGB(Math.max(luzTinte.r, b, 0.12), Math.max(luzTinte.g, b * 0.85, 0.12), Math.max(luzTinte.b, b * 0.6, 0.12));
        if (rojo > 0) luzTinte.setRGB(Math.min(1, luzTinte.r * 1.6 + 0.3), luzTinte.g * 0.4, luzTinte.b * 0.4);
        t.aplicar(luzTinte);
    }

    // ---------- 1 · Imbunche ----------
    function crearImbunche(a) {
        const tinte = crearTinte();
        const pielC = [96, 108, 84], poncho = [70, 46, 40];
        const p = crearPersona(tinte, {
            cabeza: { frente: (x, y, r) => (y === 7 || y === 8) && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)) ? [230, 200, 40] : (y === 12 && x >= 4 && x <= 11) ? [30, 20, 18] : mota(pielC)(x, y, r), lado: mota(pielC), atras: mota([50, 40, 34], 0.3) },
            cuerpo: { frente: (x, y, r) => (x + y * 3) % 7 === 0 ? mota([40, 26, 22])(x, y, r) : mota(poncho, 0.3)(x, y, r) },
            brazo: { frente: (x, y, r) => y < 9 ? mota(poncho, 0.3)(x, y, r) : mota(pielC)(x, y, r) },
            pierna: { frente: mota(pielC) }
        }, 7300);
        p.g.scale.setScalar(1.6);
        p.cuello.rotation.z = 0.7; // cabeza torcida
        p.piernaI.rotation.x = -2.6; // la pierna pegada a la espalda
        scene.add(p.g);
        return {
            tipo: 'imbunche', nombre: NOMBRES.imbunche, m: p, tinte, pos: new THREE.Vector3(a.x + 0.5, a.y + 1, a.z - 3.5), vel: new THREE.Vector3(),
            ancho: 1.1, alto: 2.9, vida: 140, max: 140, relojEmb: 4, relojInv: 7, relojDer: 10, embiste: 0, ataque: 0, fase: 0, rojo: 0, invul: 0
        };
    }
    function tickImbunche(j, dt) {
        const dx = jugador.pos.x - j.pos.x, dz = jugador.pos.z - j.pos.z, d = Math.hypot(dx, dz) || 1;
        j.yaw = Math.atan2(dx, dz);
        j.relojEmb -= dt; j.relojInv -= dt; j.relojDer -= dt;
        let vel = 2.2;
        if (j.embiste > 0) { j.embiste -= dt; vel = 11; }
        else if (j.relojEmb <= 0 && d < 16) { j.relojEmb = 5 + Math.random() * 2; j.embiste = 0.7; sonidos.mob('zombi', 1); }
        j.vel.x += (dx / d * vel - j.vel.x) * Math.min(1, dt * 8);
        j.vel.z += (dz / d * vel - j.vel.z) * Math.min(1, dt * 8);
        // Avanza a saltos en una pierna
        if (j.enSuelo && Math.hypot(j.vel.x, j.vel.z) > 0.5) j.vel.y = j.embiste > 0 ? 3 : 6;
        moverCuerpo(mundo, j, dt);
        if (d < 2.2 && Math.abs(jugador.pos.y - j.pos.y) < 2.5 && j.ataque <= 0) {
            j.ataque = 1.2;
            vida.danar(j.embiste > 0 ? 9 : 6, 'golpe', { origen: j.pos, fuerza: j.embiste > 0 ? 1.2 : 0.6 });
        }
        j.ataque -= dt;
        // Invoca lepismas
        if (j.relojInv <= 0) {
            j.relojInv = 9;
            for (let k = 0; k < 3; k++) enemigos.crear('lepisma', j.pos.x + (Math.random() - 0.5) * 3, j.pos.y + 0.5, j.pos.z + (Math.random() - 0.5) * 3);
            particulas.humo(j.pos.x, j.pos.y + 1, j.pos.z, 14);
        }
        // Derrumbe: grava que cae alrededor del jugador
        if (j.relojDer <= 0) {
            j.relojDer = 11;
            hud.mensaje(idioma === 'en' ? 'The ceiling is collapsing!' : '¡Se derrumba el techo!', 2);
            setTimeout(() => derrumbe(), 900);
        }
        j.fase += Math.hypot(j.vel.x, j.vel.z) * dt * 2;
        caminar(j.m, j.fase, 0.4);
        j.m.piernaI.rotation.x = -2.6;
        j.m.brazoD.rotation.x = -1.2 + Math.sin(j.fase * 2) * 0.4;
    }
    function derrumbe() {
        if (!actual) return;
        const lote = [];
        for (let k = 0; k < 7; k++) {
            const x = Math.floor(jugador.pos.x + (k === 0 ? 0 : (Math.random() - 0.5) * 7)), z = Math.floor(jugador.pos.z + (k === 0 ? 0 : (Math.random() - 0.5) * 7));
            let y = Math.floor(jugador.pos.y) + 3;
            while (y > 1 && !solidoEn(mundo, x, y - 1, z)) y--;
            if (mundo.bloque(x, y, z) !== 0) continue;
            lote.push([x, y, z, B.GRAVA]);
            particulas.romper(B.GRAVA, x, y + 1, z);
            if (Math.floor(jugador.pos.x) === x && Math.floor(jugador.pos.z) === z) { vida.danar(3, 'golpe', { ignoraArmadura: true }); jugador.pos.y = y + 1; }
        }
        mundo.editarLote(lote); mundo.procesarRemallado(6);
        sonidos.romper(B.GRAVA);
    }

    // ---------- 2 · Chonchon ----------
    function crearChonchon(a) {
        const tinte = crearTinte();
        const piel = [168, 128, 96];
        const cara = texturaPixeles(16, 16, 7401, (x, y, r) => {
            if ((y === 6 || y === 7) && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) return [220, 30, 30];
            if (y >= 10 && y <= 12 && x >= 5 && x <= 10) return y === 10 || x === 5 || x === 10 ? [240, 240, 230] : [40, 10, 10];
            if (y <= 3) return mota([30, 24, 22], 0.3)(x, y, r);
            return mota(piel)(x, y, r);
        });
        const pelo = texturaPixeles(16, 16, 7402, mota([30, 24, 22], 0.3));
        const oreja = texturaPixeles(16, 16, 7403, (x, y, r) => (x + y) % 4 === 0 ? mota([120, 80, 60])(x, y, r) : mota(piel)(x, y, r));
        const g = new THREE.Group();
        const cabeza = caja(2.4, 2.4, 2.4, tinte.caras(pelo, { 4: cara, 0: pelo, 1: pelo }));
        g.add(cabeza);
        const orejas = [-1, 1].map(l => {
            const piv = new THREE.Group(); piv.position.set(l * 1.2, 0.4, 0);
            const o = caja(2.6, 0.15, 1.6, tinte.caras(oreja)); o.position.x = l * 1.3; piv.add(o); g.add(piv); return piv;
        });
        scene.add(g);
        return {
            tipo: 'chonchon', nombre: NOMBRES.chonchon, g, orejas, tinte, pos: new THREE.Vector3(a.x + 0.5, a.y + 8, a.z + 0.5), vel: new THREE.Vector3(),
            ancho: 2.4, alto: 2.4, vida: 150, max: 150, ang: 0, relojFuego: 2.5, relojBaja: 10, baja: 0, ataque: 0, rojo: 0, invul: 0, relojGrito: 3, centro: { x: a.x + 0.5, z: a.z + 0.5, y: a.y }
        };
    }
    function tickChonchon(j, dt) {
        j.ang += dt * 0.5;
        j.relojFuego -= dt; j.relojBaja -= dt; j.relojGrito -= dt;
        const furioso = j.vida < j.max / 2;
        let objetivo;
        if (j.baja > 0) {
            j.baja -= dt;
            objetivo = new THREE.Vector3(jugador.pos.x, jugador.pos.y + 1.2, jugador.pos.z);
            const d = j.pos.distanceTo(objetivo);
            if (d < 2.2 && j.ataque <= 0) { j.ataque = 1.5; vida.danar(7, 'golpe', { origen: j.pos, fuerza: 1 }); j.baja = 0; }
        } else {
            const r = 9;
            objetivo = new THREE.Vector3(jugador.pos.x + Math.cos(j.ang) * r, Math.max(jugador.pos.y + 6, j.centro.y + 5), jugador.pos.z + Math.sin(j.ang) * r);
            if (j.relojBaja <= 0) { j.relojBaja = furioso ? 7 : 11; j.baja = 3; }
        }
        j.ataque -= dt;
        const v = objetivo.sub(j.pos);
        const rap = j.baja > 0 ? 9 : 5;
        if (v.length() > 0.1) j.vel.lerp(v.normalize().multiplyScalar(rap), Math.min(1, dt * 2));
        j.pos.addScaledVector(j.vel, dt);
        if (j.relojFuego <= 0 && j.baja <= 0) {
            j.relojFuego = furioso ? 1.6 : 2.6;
            const dir = new THREE.Vector3(jugador.pos.x - j.pos.x, jugador.pos.y + 1.2 - j.pos.y, jugador.pos.z - j.pos.z).normalize();
            proyectiles.disparar({ tipo: 'bola', pos: j.pos.clone().addScaledVector(dir, 1.6), vel: dir.multiplyScalar(13), dano: 5, deJugador: false, alImpactar: p => enemigos.explotar(p.x, p.y, p.z, 1.6, 'fuego') });
            sonidos.fuego();
        }
        if (j.relojGrito <= 0) { j.relojGrito = 5 + Math.random() * 4; sonidos.tueTue(); }
        // Aletea con las orejas y mira al jugador
        const a = Math.sin(performance.now() / 90) * 0.6;
        j.orejas[0].rotation.z = a; j.orejas[1].rotation.z = -a;
        j.g.position.copy(j.pos);
        j.g.rotation.y = Math.atan2(jugador.pos.x - j.pos.x, jugador.pos.z - j.pos.z);
    }

    // ---------- 3 · Caleuche ----------
    function sitioBarco(a) {
        // Busca agua honda cerca del altar: rectángulo de 23×11 con agua
        let mejor = null, dm = Infinity;
        for (let r = 8; r < 60; r += 2) {
            for (let k = 0; k < 24; k++) {
                const cx = Math.floor(a.x + Math.cos(k / 24 * Math.PI * 2) * r), cz = Math.floor(a.z + Math.sin(k / 24 * Math.PI * 2) * r);
                let ok = true;
                for (let z = cz - 6; z <= cz + 6 && ok; z += 2) for (let x = cx - 12; x <= cx + 12 && ok; x += 2) {
                    const o = z * terreno.BW + x;
                    if (x < 0 || z < 0 || x >= terreno.BW || z >= terreno.BD || terreno.HT[o] > NIVEL_AGUA - 2 || terreno.ES[o]) ok = false;
                }
                if (ok && r < dm) { dm = r; mejor = { x: cx, z: cz }; }
            }
            if (mejor) break;
        }
        return mejor;
    }
    // Barco: casco de madera oscura, tres mástiles con velas pálidas y faroles
    function bloquesBarco(c, a) {
        const yA = NIVEL_AGUA + dy; // nivel del agua real
        const l = [];
        const hull = (x, z) => Math.abs(z - c.z) <= 4 - Math.floor(Math.max(0, Math.abs(x - c.x) - 7) / 1.5);
        for (let x = c.x - 11; x <= c.x + 11; x++) for (let z = c.z - 5; z <= c.z + 5; z++) {
            if (!hull(x, z)) continue;
            const borde = !hull(x + 1, z) || !hull(x - 1, z) || !hull(x, z + 1) || !hull(x, z - 1);
            for (let y = yA - 2; y <= yA + 3; y++) {
                if (y === yA - 2 || (borde && y <= yA + 3)) l.push([x, y, z, B.NEGRO]);
                else if (y === yA + 2) l.push([x, y, z, B.TABLONES]); // cubierta
                else l.push([x, y, z, y <= yA ? B.AGUA : 0]);
            }
            if (borde) l.push([x, yA + 4, z, B.VALLA]);
        }
        for (const mx of [c.x - 6, c.x, c.x + 6]) {
            const alto = mx === c.x ? 12 : 9;
            for (let y = yA + 3; y <= yA + 3 + alto; y++) l.push([mx, y, c.z, B.TRONCO_PINO]);
            for (let y = yA + 6; y <= yA + 2 + alto; y++) for (let z = c.z - 3; z <= c.z + 3; z++) if (z !== c.z) l.push([mx + 1, y, z, B.LANA]);
            l.push([mx, yA + 4 + alto, c.z, B.PIEDRA_LUMINOSA]);
        }
        // Pasarela hasta la orilla
        const dx = a.x - c.x, dz = a.z - c.z, n = Math.hypot(dx, dz);
        for (let k = 0; k < 60; k++) {
            const x = Math.round(c.x + dx / n * k), z = Math.round(c.z + dz / n * k);
            if (hull(x, z)) continue;
            const o = z * terreno.BW + x;
            if (terreno.HT[o] + dy >= yA + 2) break;
            l.push([x, yA + 2, z, B.TABLONES], [x + (Math.abs(dz) > Math.abs(dx) ? 1 : 0), yA + 2, z + (Math.abs(dz) > Math.abs(dx) ? 0 : 1), B.TABLONES]);
        }
        return l;
    }
    function quitarBarco(lista) {
        const yA = NIVEL_AGUA + dy;
        mundo.editarLote(lista.map(([x, y, z]) => [x, y, z, y <= yA && (terreno.HT[z * terreno.BW + x] + dy) < y ? B.AGUA : 0]));
        mundo.procesarRemallado(16);
    }
    function crearCaleuche(a) {
        const c = sitioBarco(a);
        if (!c) return null;
        const barco = bloquesBarco(c, a);
        mundo.editarLote(barco); mundo.procesarRemallado(16);
        particulas.humo(c.x, NIVEL_AGUA + dy + 4, c.z, 40);
        sonidos.explosion();
        return { tipo: 'caleuche', nombre: NOMBRES.caleuche, c, barco, ola: 0, oleadas: [], capitan: null, vida: 1, max: 1, deck: NIVEL_AGUA + dy + 3, relojOla: 2 };
    }
    function crearCapitan(j) {
        const tinte = crearTinte();
        const tunica = [60, 30, 90], piel = [170, 190, 170];
        const p = crearPersona(tinte, {
            cabeza: { frente: (x, y, r) => (y === 7 || y === 8) && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12)) ? [120, 255, 200] : y >= 10 ? mota([200, 200, 200], 0.3)(x, y, r) : mota(piel)(x, y, r), lado: mota(piel), arriba: mota([30, 20, 40]) },
            cuerpo: { frente: (x, y, r) => x === 7 || x === 8 ? [200, 170, 60] : mota(tunica, 0.25)(x, y, r) },
            brazo: { frente: mota(tunica, 0.25) },
            pierna: { frente: mota(tunica, 0.25) }
        }, 7500);
        p.g.scale.setScalar(1.3);
        const sombrero = caja(0.7, 0.2, 0.7, tinte.caras(texturaPixeles(16, 16, 7501, mota([24, 20, 30])))); sombrero.position.y = 0.55;
        const copa = caja(0.4, 0.35, 0.4, tinte.caras(texturaPixeles(16, 16, 7502, mota([24, 20, 30])))); copa.position.y = 0.8;
        p.cuello.add(sombrero, copa);
        scene.add(p.g);
        return { m: p, tinte, pos: new THREE.Vector3(j.c.x + 0.5, j.deck, j.c.z + 0.5), vel: new THREE.Vector3(), ancho: 0.8, alto: 2.5, vida: 220, max: 220, relojTp: 6, relojFuego: 3, relojInv: 12, relojRayo: 8, fase: 0, rojo: 0, invul: 0 };
    }
    function tickCaleuche(j, dt) {
        if (!j.capitan) {
            // Oleadas de tripulación sobre la cubierta
            j.oleadas = j.oleadas.filter(e => enemigos.lista.includes(e));
            if (!j.oleadas.length) {
                j.relojOla -= dt;
                if (j.relojOla <= 0) {
                    j.ola++;
                    j.relojOla = 3;
                    if (j.ola <= 2) {
                        hud.mensaje((idioma === 'en' ? 'Crew wave ' : 'Oleada de tripulación ') + j.ola + '/2', 3);
                        const tipos = j.ola === 1 ? ['esqueleto', 'esqueleto', 'zombi', 'zombi', 'esqueleto'] : ['esqueleto', 'esqueleto', 'esqueleto', 'zombi', 'creeper', 'zombi'];
                        for (const t of tipos) j.oleadas.push(enemigos.crear(t, j.c.x + (Math.random() - 0.5) * 14, j.deck, j.c.z + (Math.random() - 0.5) * 4));
                        for (const e of j.oleadas) { e.persigue = true; e.jefe = true; }
                    } else {
                        j.capitan = crearCapitan(j);
                        hud.mensaje(L(NOMBRES.capitan), 3);
                        sonidos.risaTrauco();
                    }
                }
            }
            // La barra baja un tercio por oleada vencida (la última parte es el capitán)
            const vencidas = Math.max(0, j.ola - (j.oleadas.length ? 1 : 0));
            pintarBarra(NOMBRES.caleuche, 1 - vencidas / 3);
            return;
        }
        const k = j.capitan;
        const dx = jugador.pos.x - k.pos.x, dz = jugador.pos.z - k.pos.z, d = Math.hypot(dx, dz) || 1;
        const furioso = k.vida < k.max / 2;
        k.relojTp -= dt; k.relojFuego -= dt; k.relojInv -= dt; k.relojRayo -= dt;
        k.yaw = Math.atan2(dx, dz);
        if (k.relojTp <= 0) {
            k.relojTp = furioso ? 4 : 6;
            particulas.humo(k.pos.x, k.pos.y + 1, k.pos.z, 16);
            k.pos.set(j.c.x + 0.5 + (Math.random() - 0.5) * 16, j.deck, j.c.z + 0.5 + (Math.random() - 0.5) * 5);
            particulas.humo(k.pos.x, k.pos.y + 1, k.pos.z, 16);
        }
        if (k.relojFuego <= 0) {
            k.relojFuego = furioso ? 1.8 : 3;
            const dir = new THREE.Vector3(dx, jugador.pos.y + 1.2 - (k.pos.y + 2), dz).normalize();
            proyectiles.disparar({ tipo: 'bola', pos: new THREE.Vector3(k.pos.x, k.pos.y + 2, k.pos.z).addScaledVector(dir, 1), vel: dir.multiplyScalar(14), dano: 5, deJugador: false, alImpactar: p => enemigos.explotar(p.x, p.y, p.z, 1.2, 'fuego') });
            sonidos.fuego();
        }
        if (k.relojInv <= 0) { k.relojInv = 14; for (let n = 0; n < 2; n++) { const e = enemigos.crear('esqueleto', k.pos.x + (Math.random() - 0.5) * 4, j.deck, k.pos.z + (Math.random() - 0.5) * 2); e.persigue = true; } }
        if (furioso && k.relojRayo <= 0) {
            k.relojRayo = 7;
            const x = jugador.pos.x, z = jugador.pos.z, y = jugador.pos.y;
            for (let n = 0; n < 12; n++) particulas.critico(x, y + n * 0.6, z);
            setTimeout(() => {
                for (let n = 0; n < 24; n++) particulas.fuego(x, y + n * 0.5, z);
                sonidos.explosion();
                if (Math.hypot(jugador.pos.x - x, jugador.pos.z - z) < 1.6) { vida.danar(6, 'fuego', { ignoraArmadura: false }); vida.fuego = 4; }
            }, 1000);
        }
        k.vel.x += ((d > 5 ? dx / d * 2 : 0) - k.vel.x) * Math.min(1, dt * 6);
        k.vel.z += ((d > 5 ? dz / d * 2 : 0) - k.vel.z) * Math.min(1, dt * 6);
        moverCuerpo(mundo, k, dt);
        if (d < 2 && Math.abs(jugador.pos.y - k.pos.y) < 2 && (k.ataque = (k.ataque || 0) - dt) <= 0) { k.ataque = 1; vida.danar(5, 'golpe', { origen: k.pos }); }
        k.fase += Math.hypot(k.vel.x, k.vel.z) * dt * 3;
        caminar(k.m, k.fase, 0.5);
        k.m.brazoD.rotation.x = -1.4; k.m.brazoI.rotation.x = -0.4 + Math.sin(performance.now() / 300) * 0.3;
        k.m.g.position.copy(k.pos);
        k.m.g.rotation.y = k.yaw;
        k.rojo = Math.max(0, k.rojo - dt); k.invul = Math.max(0, k.invul - dt);
        iluminar(k.tinte, k.pos, k.rojo);
        pintarBarra(NOMBRES.capitan, k.vida / k.max);
    }

    // ---------- Invocar, golpear, terminar ----------
    function invocar(tipo) {
        const a = ALTARES[tipo];
        if (!a || actual) return false;
        particulas.explosion(a.x + 0.5, a.y + 1.5, a.z + 0.5);
        sonidos.explosion();
        if (tipo === 'imbunche') actual = crearImbunche(a);
        else if (tipo === 'chonchon') actual = crearChonchon(a);
        else actual = crearCaleuche(a);
        if (!actual) return false;
        actual.altar = a;
        hud.mensaje(L(actual.nombre) + (idioma === 'en' ? ' has appeared!' : ' apareció'), 4);
        return true;
    }

    // Clic derecho sobre el altar con el objeto del jefe en la mano
    function usarAltar(o) {
        if (!o || o.id !== B.ALTAR) return false;
        const p = inventario.enMano();
        const tipo = Object.keys(ALTARES).find(k => ALTARES[k] && ALTARES[k].x === o.x && ALTARES[k].y === o.y && ALTARES[k].z === o.z);
        if (!tipo) return false;
        const idObj = { imbunche: O.AMULETO_MINA, chonchon: O.PLUMA_CHONCHON, caleuche: O.FAROL_CALEUCHE }[tipo];
        if (!p || p.id !== idObj) { hud.mensaje(idioma === 'en' ? 'The altar waits for an offering…' : 'El altar espera una ofrenda…', 3); return true; }
        if (actual) return true;
        if (invocar(tipo)) inventario.gastarMano(1);
        return true;
    }

    function golpear(j, dano, origen) {
        if (j.invul > 0) return false;
        j.invul = 0.4; j.rojo = 0.3;
        j.vida -= dano;
        sonidos.golpe();
        if (origen && j.vel && j.tipo !== 'chonchon') { const dx = j.pos.x - origen.x, dz = j.pos.z - origen.z, n = Math.hypot(dx, dz) || 1; j.vel.x += dx / n * 2; j.vel.z += dz / n * 2; }
        if (j.vida <= 0) vencer();
        return true;
    }

    function objetivos(cx, cz, radio) {
        if (!actual) return [];
        const j = actual.tipo === 'caleuche' ? actual.capitan : actual;
        if (!j || Math.abs(j.pos.x - cx) > radio + 3 || Math.abs(j.pos.z - cz) > radio + 3) return [];
        const y = j.tipo === 'chonchon' ? j.pos.y - j.alto / 2 : j.pos.y;
        return [{ tipo: 'jefe', jefe: j, x: j.pos.x, y, z: j.pos.z, ancho: j.ancho, alto: j.alto, golpear: (dano, origen) => golpear(j, dano, origen) }];
    }

    function quitarModelos(j) {
        if (j.m) scene.remove(j.m.g);
        if (j.g) scene.remove(j.g);
        if (j.capitan) scene.remove(j.capitan.m.g);
    }

    function vencer() {
        const j = actual;
        if (!j) return;
        const pos = j.tipo === 'caleuche' ? j.capitan.pos : j.pos;
        particulas.explosion(pos.x, pos.y + 1, pos.z);
        sonidos.explosion();
        quitarModelos(j);
        barra.hidden = true;
        actual = null;
        const id = { imbunche: 'jefe1', chonchon: 'jefe2', caleuche: 'jefe3' }[j.tipo];
        for (const e of enemigos.lista.slice()) if (e.tipo === 'lepisma' || e.jefe) enemigos.quitar(e);
        misiones.jefeDerrotado(id);
        if (j.tipo === 'caleuche') {
            // El barco se hunde por capas, de arriba abajo
            const capas = [...new Set(j.barco.map(b => b[1]))].sort((a, b) => b - a);
            capas.forEach((y, i) => setTimeout(() => { quitarBarco(j.barco.filter(b => b[1] === y)); particulas.salpicar(j.c.x, NIVEL_AGUA + dy + 1, j.c.z); }, 400 + i * 350));
            setTimeout(() => ctx.alFinal && ctx.alFinal(), 1200 + capas.length * 350);
        }
    }

    // Reinicio: el jefe se va y devuelve el objeto
    function reiniciar(motivo) {
        const j = actual;
        if (!j) return;
        quitarModelos(j);
        if (j.tipo === 'caleuche') { quitarBarco(j.barco); for (const e of j.oleadas) enemigos.quitar(e); }
        for (const e of enemigos.lista.slice()) if (e.tipo === 'lepisma' || e.jefe) enemigos.quitar(e);
        barra.hidden = true;
        actual = null;
        const idObj = { imbunche: O.AMULETO_MINA, chonchon: O.PLUMA_CHONCHON, caleuche: O.FAROL_CALEUCHE }[j.tipo];
        if (inventario.agregar(idObj, 1)) entidades.soltar(idObj, 1, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
        hud.mensaje(motivo === 'lejos' ? (idioma === 'en' ? 'You fled. The boss is gone… for now.' : 'Te alejaste. El jefe se fue… por ahora.') : (idioma === 'en' ? 'The boss is waiting for you at its altar.' : 'El jefe te espera en su altar.'), 4);
    }

    function actualizar(dt) {
        // Altares de las misiones de jefe activas (y de los ya invocables)
        const m = misiones.activa;
        if (m && m.jefe && !actual) asegurarAltar(m.jefe);
        if (!actual) return;
        const j = actual;
        const centro = j.tipo === 'caleuche' ? { x: j.c.x, z: j.c.z } : j.altar;
        if (Math.hypot(jugador.pos.x - centro.x, jugador.pos.z - centro.z) > 70) { reiniciar('lejos'); return; }
        dt = Math.min(dt, 0.05);
        if (j.tipo === 'imbunche') tickImbunche(j, dt);
        else if (j.tipo === 'chonchon') tickChonchon(j, dt);
        else { tickCaleuche(j, dt); return; }
        j.rojo = Math.max(0, j.rojo - dt); j.invul = Math.max(0, j.invul - dt);
        if (j.m) { j.m.g.position.copy(j.pos); j.m.g.rotation.y = j.yaw || 0; }
        iluminar(j.tinte, j.pos, j.rojo);
        pintarBarra(j.nombre, j.vida / j.max);
    }

    return {
        ALTARES, actualizar, usarAltar, objetivos, reiniciar, invocar,
        get enCurso() { return !!actual; },
        alMorirJugador() { if (actual) reiniciar('muerte'); },
        setIdioma(l) { idioma = l; }
    };
}
