// =========================================================
// VENJY · Supervivencia · Combate
// Golpe con carga como Minecraft (cada arma tiene su cadencia: golpear antes de tiempo pega
// menos), crítico al caer, retroceso (más si corres), desgaste del arma. Arco: mantener clic
// derecho tensa (hasta 1 s) y soltar dispara una flecha. Escudo (en cualquiera de las manos):
// mantener clic derecho bloquea los golpes y flechas que vienen de frente.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { rayoCaja } from '../fisica.js';
import { lanzarRayo } from '../rayo.js';
import { O, info, nombreDe } from './objetos.js';
import { sonidos } from './sonidos.js';

const ALCANCE = 3.6;

export function crearCombate({ camara, mundo, jugador, inventario, vida, proyectiles, particulas, hud, objetivos, idioma = 'es' }) {
    const estado = { tensando: 0, bloqueando: false, ultimoGolpe: -10, carga: 1 };
    const dir = new THREE.Vector3();

    // Entidad apuntada (la más cercana que no esté detrás de un bloque)
    function entidadApuntada(alcance = ALCANCE) {
        camara.getWorldDirection(dir);
        const o = camara.position;
        // Solo tapan los bloques sólidos (plantas, antorchas y escaleras no)
        const bloque = lanzarRayo(camara, mundo, alcance, (id, t) => t === 1 || t === 2 || t === 6);
        const limite = bloque ? bloque.dist + 0.2 : alcance;
        let mejor = null, mejorT = limite;
        for (const e of objetivos(o.x, o.z, alcance + 2)) {
            const t = rayoCaja(o.x, o.y, o.z, dir.x, dir.y, dir.z, e.x, e.y, e.z, e.ancho, e.alto);
            if (t >= 0 && t < mejorT) { mejorT = t; mejor = e; }
        }
        return mejor;
    }

    const cadenciaDe = id => (id >= 256 && info(id) && info(id).cadencia) || 0.25;

    function atacar() {
        const ahora = performance.now() / 1000;
        const idMano = inventario.idEnMano();
        const carga = Math.min(1, (ahora - estado.ultimoGolpe) / cadenciaDe(idMano));
        estado.ultimoGolpe = ahora;
        const e = entidadApuntada();
        if (!e) return false;
        const base = (idMano >= 256 && info(idMano) && info(idMano).dano) || 1;
        let dano = base * (0.2 + 0.8 * carga * carga);
        const critico = carga > 0.9 && !jugador.enSuelo && jugador.vel.y < -0.5 && !jugador.enAgua();
        if (critico) { dano *= 1.5; particulas.critico(e.x, e.y + e.alto * 0.6, e.z); }
        const fuerza = (jugador.corre && carga > 0.9 ? 0.85 : 0.45) * (0.3 + 0.7 * carga);
        const pego = e.golpear(Math.max(1, Math.round(dano * 2) / 2), { x: jugador.pos.x, z: jugador.pos.z, fuerza });
        if (pego) {
            vida.agotar(0.1);
            if (jugador.corre) jugador.corre = false; // como Minecraft, el golpe corta el correr
            const m = idMano >= 256 && info(idMano);
            if (m && m.herramienta && inventario.desgastarMano(m.herramienta.clase === 'espada' ? 1 : 2)) { sonidos.herramientaRota(); hud.mensaje(nombreDe(idMano, idioma) + (idioma === 'en' ? ' broke!' : ' se rompió')); }
        }
        return true;
    }

    // ---- Arco y escudo ----
    const tieneEscudo = () => inventario.idEnMano() === O.ESCUDO || (inventario.mano2 && inventario.mano2.id === O.ESCUDO);
    function usar(p) {
        if (p.id === O.ARCO) {
            if (inventario.contar(O.FLECHA) === 0) return false;
            estado.tensando = 0.0001;
            return true;
        }
        if (p.id === O.ESCUDO) { estado.bloqueando = true; return true; }
        return false;
    }
    // Clic derecho sin otro uso: si hay escudo en la otra mano, bloquea
    function bloquearConMano2() {
        if (inventario.mano2 && inventario.mano2.id === O.ESCUDO) { estado.bloqueando = true; return true; }
        return false;
    }
    function soltarDerecho() {
        estado.bloqueando = false;
        if (estado.tensando > 0) {
            const f = Math.min(1, estado.tensando);
            estado.tensando = 0;
            if (f < 0.15 || inventario.idEnMano() !== O.ARCO || !inventario.quitar(O.FLECHA, 1)) return;
            camara.getWorldDirection(dir);
            const pos = camara.position.clone().addScaledVector(dir, 0.5);
            const fuerza = f * f;
            proyectiles.disparar({
                pos, vel: dir.clone().multiplyScalar(14 + 36 * fuerza), dano: Math.round(1 + 8 * fuerza) + (f >= 1 && Math.random() < 0.25 ? 2 : 0),
                deJugador: true, recogible: true
            });
            sonidos.arco();
            if (inventario.desgastarMano(1)) sonidos.herramientaRota();
        }
    }

    // vida.danar pregunta si el golpe se bloquea: escudo arriba y el atacante adelante
    function bloquea(origen) {
        if (!estado.bloqueando || !tieneEscudo() || !origen) return false;
        const fx = -Math.sin(jugador.yaw), fz = -Math.cos(jugador.yaw);
        const dx = origen.x - jugador.pos.x, dz = origen.z - jugador.pos.z;
        if (fx * dx + fz * dz <= 0) return false;
        // Desgasta el escudo (el de la mano principal o el de la otra)
        if (inventario.idEnMano() === O.ESCUDO) inventario.desgastarMano(1);
        else if (inventario.mano2) {
            inventario.mano2.d += 1;
            if (inventario.mano2.d >= info(O.ESCUDO).durabilidad) { inventario.mano2 = null; sonidos.herramientaRota(); }
            inventario.cambio();
        }
        sonidos.golpeBloque(1);
        return true;
    }
    vida.bloqueo = bloquea;

    // Indicador de carga del golpe bajo la mira
    const barra = document.createElement('div');
    barra.className = 'carga-golpe';
    barra.innerHTML = '<i></i>';
    document.getElementById('hud').appendChild(barra);

    return {
        estado, atacar, usar, bloquearConMano2, soltarDerecho, entidadApuntada,
        get tensando() { return estado.tensando; },
        get bloqueando() { return estado.bloqueando && tieneEscudo(); },
        actualizar(dt, derechoApretado) {
            if (estado.tensando > 0) {
                if (!derechoApretado || inventario.idEnMano() !== O.ARCO) soltarDerecho();
                else estado.tensando += dt;
            }
            if (estado.bloqueando && !derechoApretado) estado.bloqueando = false;
            const carga = Math.min(1, (performance.now() / 1000 - estado.ultimoGolpe) / cadenciaDe(inventario.idEnMano()));
            estado.carga = carga;
            barra.hidden = carga >= 1;
            barra.firstChild.style.width = Math.round(carga * 100) + '%';
        },
        // Factor de velocidad: tensar el arco o bloquear frena
        get lento() { return estado.tensando > 0 || (estado.bloqueando && tieneEscudo()) ? 0.3 : 1; }
    };
}
