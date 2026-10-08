// =========================================================
// VENJY · Supervivencia · Vida y hambre
// Como Minecraft: 20 de vida, 20 de hambre con saturación y agotamiento, aire bajo el agua,
// daño por caída, lava, fuego, veneno y hambre en cero; la armadura reduce el daño.
// Dificultad: 0 pacífico (se regenera todo), 1 fácil, 2 normal, 3 difícil.
// =========================================================
import { B } from '../texturas.js';
import { sonidos } from './sonidos.js';

export const CAUSAS = {
    caida: { es: 'Cayó desde muy alto', en: 'Fell from a high place' },
    lava: { es: 'Intentó nadar en lava', en: 'Tried to swim in lava' },
    fuego: { es: 'Se quemó', en: 'Burned to death' },
    ahogo: { es: 'Se ahogó', en: 'Drowned' },
    hambre: { es: 'Murió de hambre', en: 'Starved to death' },
    veneno: { es: 'Se envenenó', en: 'Was poisoned' },
    golpe: { es: 'Lo derrotaron', en: 'Was slain' },
    explosion: { es: 'Voló en pedazos', en: 'Blew up' },
    flecha: { es: 'Le dispararon', en: 'Was shot' },
    asfixia: { es: 'Se asfixió dentro de un muro', en: 'Suffocated in a wall' }
};

export function crearVida({ jugador, mundo, inventario, dificultad = 2, alMorir, alDanio, alAtascarse }) {
    const v = {
        vida: 20, vidaMax: 20, hambre: 20, saturacion: 5, agotamiento: 0,
        aire: 300, fuego: 0, veneno: 0, efectoHambre: 0, invulnerable: 0, aturdido: 0, bloqueo: null,
        gracia: 3, // segundos tras cargar o reaparecer: si se está dentro de un bloque, se busca un hueco
        muerto: false, dificultad, temblor: true,
        relojRegen: 0, relojHambre: 0, relojAire: 0, relojFuego: 0, relojVeneno: 0, relojLava: 0, relojAsfixia: 0,
        get defensa() { return inventario.defensa(); }
    };

    // Overlay rojo al recibir daño
    const rojo = document.createElement('div');
    rojo.className = 'destello-danio';
    document.body.appendChild(rojo);
    const aturdidoEl = document.createElement('div');
    aturdidoEl.className = 'aturdido';
    aturdidoEl.hidden = true;
    document.body.appendChild(aturdidoEl);
    const fuegoEl = document.createElement('div');
    fuegoEl.className = 'en-llamas';
    fuegoEl.hidden = true;
    document.body.appendChild(fuegoEl);

    function agotar(x) { v.agotamiento += x; }

    function danar(cantidad, causa = 'golpe', { origen = null, ignoraArmadura = false, fuerza = 0.42 } = {}) {
        if (v.muerto || cantidad <= 0) return false;
        if (v.invulnerable > 0) return false;
        // Escudo arriba y el golpe viene de frente: no hace daño
        if (origen && (causa === 'golpe' || causa === 'flecha' || causa === 'explosion' || causa === 'fuego') && v.bloqueo && v.bloqueo(origen)) {
            if (causa !== 'explosion') { v.invulnerable = 0.25; return false; }
            cantidad *= 0.2;
        }
        // Dificultad: los golpes de monstruos pegan distinto (como Minecraft)
        if (causa === 'golpe' || causa === 'flecha' || causa === 'explosion') {
            if (v.dificultad === 0) return false;
            if (v.dificultad === 1) cantidad = Math.min(cantidad / 2 + 1, cantidad);
            if (v.dificultad === 3) cantidad *= 1.5;
        }
        let d = cantidad;
        if (!ignoraArmadura) {
            const def = Math.min(20, inventario.defensa());
            d = cantidad * (1 - Math.min(20, Math.max(def / 5, def - cantidad / 2)) / 25);
            if (def > 0) inventario.desgastarArmadura(Math.max(1, Math.floor(cantidad / 4)));
        }
        d = Math.round(d * 2) / 2;
        if (d <= 0) return false;
        v.vida = Math.max(0, v.vida - d);
        v.invulnerable = 0.5;
        agotar(0.1);
        sonidos.danio();
        rojo.classList.remove('activo'); void rojo.offsetWidth; rojo.classList.add('activo');
        if (origen) {
            const dx = jugador.pos.x - origen.x, dz = jugador.pos.z - origen.z, n = Math.hypot(dx, dz) || 1;
            jugador.empuje.set(dx / n * fuerza * 10, 4.5, dz / n * fuerza * 10);
        }
        alDanio && alDanio(d, causa);
        if (v.vida <= 0) morir(causa);
        return true;
    }

    function morir(causa) {
        if (v.muerto) return;
        v.muerto = true;
        v.fuego = 0; v.veneno = 0; v.efectoHambre = 0;
        fuegoEl.hidden = true;
        sonidos.muerte();
        alMorir && alMorir(causa);
    }

    function curar(n) { if (!v.muerto) v.vida = Math.min(v.vidaMax, v.vida + n); }

    // Comer: suma hambre y saturación (la saturación no supera el hambre)
    function alimentar(hambre, saturacion) {
        v.hambre = Math.min(20, v.hambre + hambre);
        v.saturacion = Math.min(v.hambre, v.saturacion + saturacion);
    }

    function reaparecer() {
        Object.assign(v, { vida: v.vidaMax, hambre: 20, saturacion: 5, agotamiento: 0, aire: 300, fuego: 0, veneno: 0, efectoHambre: 0, aturdido: 0, invulnerable: 2, gracia: 3, muerto: false });
    }

    // Daño por caída: más de 3 bloques (en el agua o en una escalera no se cuenta)
    jugador.alAterrizar = caida => {
        // Recién cargado o reaparecido no hay daño de caída: el suelo bajo el jugador puede estar aún cargándose
        if (v.muerto || v.gracia > 0) return;
        const piso = mundo.bloque(jugador.pos.x, jugador.pos.y - 0.5, jugador.pos.z);
        if (piso === B.HENO) caida *= 0.2;
        if (caida > 3.4) { danar(Math.floor(caida - 3), 'caida', { ignoraArmadura: true }); sonidos.caida(); }
    };

    let ultimaPos = null;
    function actualizar(dt) {
        if (v.muerto) return;
        v.invulnerable = Math.max(0, v.invulnerable - dt);
        v.gracia = Math.max(0, v.gracia - dt);
        const p = jugador.pos;

        // Agotamiento por moverse (correr, nadar) y saltar
        if (ultimaPos) {
            const d = Math.hypot(p.x - ultimaPos.x, p.z - ultimaPos.z);
            if (d < 2) {
                if (jugador.enAgua()) agotar(0.01 * d);
                else if (jugador.corre && jugador.enSuelo) agotar(0.1 * d);
            }
            if (p.y - ultimaPos.y > 0.05 && ultimaPos.enSuelo && !jugador.enSuelo) agotar(jugador.corre ? 0.2 : 0.05);
        }
        ultimaPos = { x: p.x, y: p.y, z: p.z, enSuelo: jugador.enSuelo };
        if (v.efectoHambre > 0) { v.efectoHambre -= dt; agotar(0.5 * dt); }
        while (v.agotamiento >= 4) {
            v.agotamiento -= 4;
            if (v.saturacion > 0) v.saturacion = Math.max(0, v.saturacion - 1);
            else if (v.dificultad > 0) v.hambre = Math.max(0, v.hambre - 1);
        }
        jugador.puedeCorrer = v.hambre > 6;

        // Regeneración: rápida con hambre llena y saturación; normal con hambre >= 18
        v.relojRegen += dt;
        if (v.dificultad === 0) {
            if (v.relojRegen >= 1) { v.relojRegen = 0; curar(1); if (v.hambre < 20) v.hambre++; }
        } else if (v.hambre >= 20 && v.saturacion > 0 && v.vida < v.vidaMax) {
            if (v.relojRegen >= 0.5) { v.relojRegen = 0; curar(1); agotar(Math.min(v.saturacion, 6)); }
        } else if (v.hambre >= 18 && v.vida < v.vidaMax) {
            if (v.relojRegen >= 4) { v.relojRegen = 0; curar(1); agotar(6); }
        } else v.relojRegen = Math.min(v.relojRegen, 4);

        // Hambre en cero: daño (fácil hasta 10, normal hasta 1, difícil hasta morir)
        if (v.hambre <= 0) {
            v.relojHambre += dt;
            if (v.relojHambre >= 4) {
                v.relojHambre = 0;
                const limite = v.dificultad === 1 ? 10 : v.dificultad === 2 ? 1 : 0;
                if (v.vida > limite) danar(1, 'hambre', { ignoraArmadura: true });
            }
        } else v.relojHambre = 0;

        // Aire: la cabeza bajo el agua (15 s de aire, luego 2 de daño por segundo)
        const cabeza = mundo.bloque(p.x, p.y + jugador.ojos, p.z);
        if (cabeza === B.AGUA) {
            v.aire = Math.max(0, v.aire - 20 * dt);
            if (v.aire <= 0) {
                v.relojAire += dt;
                if (v.relojAire >= 1) { v.relojAire = 0; danar(2, 'ahogo', { ignoraArmadura: true }); }
            }
        } else { v.aire = Math.min(300, v.aire + 120 * dt); v.relojAire = 0; }

        // Asfixia: la cabeza dentro de un bloque sólido (p. ej. cayó grava encima).
        // Recién cargado o reaparecido dentro de tierra, se busca un hueco en vez de morir
        if (cabeza > 0 && cabeza !== B.AGUA && jugador.solido(Math.floor(p.x), Math.floor(p.y + jugador.ojos), Math.floor(p.z))) {
            if (v.gracia > 0 && alAtascarse && alAtascarse()) v.relojAsfixia = 0;
            else {
                v.relojAsfixia += dt;
                if (v.relojAsfixia >= 0.5) { v.relojAsfixia = 0; danar(1, 'asfixia', { ignoraArmadura: true }); }
            }
        } else v.relojAsfixia = 0;

        // Lava y fuego
        if (jugador.enLava()) {
            v.fuego = 8;
            v.relojLava += dt;
            if (v.relojLava >= 0.5) { v.relojLava = 0; danar(4, 'lava'); }
        } else v.relojLava = 0.5;
        if (v.fuego > 0) {
            if (jugador.enAgua()) { v.fuego = 0; sonidos.salpicar(); }
            v.fuego -= dt;
            v.relojFuego += dt;
            if (v.relojFuego >= 1) { v.relojFuego = 0; danar(1, 'fuego', { ignoraArmadura: true }); }
        }
        fuegoEl.hidden = !(v.fuego > 0);

        // Aturdido (golpe del Trauco): lento y la vista se nubla un poco
        if (v.aturdido > 0) v.aturdido -= dt;
        aturdidoEl.hidden = !(v.aturdido > 0);

        // Veneno: 1 de daño cada 1,25 s sin bajar de medio corazón
        if (v.veneno > 0) {
            v.veneno -= dt;
            v.relojVeneno += dt;
            if (v.relojVeneno >= 1.25) { v.relojVeneno = 0; if (v.vida > 1) danar(1, 'veneno', { ignoraArmadura: true }); }
        }
    }

    function serializar() {
        // Un muerto se guarda como reaparecido: la muerte ya soltó el inventario y la partida vuelve al spawn
        if (v.muerto) return { vida: v.vidaMax, hambre: 20, saturacion: 5, agotamiento: 0, aire: 300, fuego: 0, veneno: 0, efectoHambre: 0 };
        const { vida, hambre, saturacion, agotamiento, aire, fuego, veneno, efectoHambre } = v;
        return { vida, hambre, saturacion, agotamiento, aire, fuego, veneno, efectoHambre };
    }
    function cargar(o) {
        if (!o) return;
        for (const k of ['vida', 'hambre', 'saturacion', 'agotamiento', 'aire', 'fuego', 'veneno', 'efectoHambre']) if (typeof o[k] === 'number') v[k] = o[k];
        v.muerto = v.vida <= 0;
    }

    return Object.assign(v, { danar, curar, alimentar, agotar, actualizar, reaparecer, serializar, cargar, morir });
}
