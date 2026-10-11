// =========================================================
// VENJY · Supervivencia · Ganado (caza y cría)
// Se engancha a los animales del creativo (criaturas/animales.js) sin cambiar cómo se ven
// ni cómo pasean: aquí tienen vida, sueltan carne/cuero/lana/plumas al morir, huyen al
// recibir un golpe, se crían con su comida (corazones y una cría que crece), las ovejas se
// esquilan y las gallinas ponen huevos. Las manadas se reponen solas a los pocos minutos.
// Coordenadas: los animales viven en el mapa original (y sin desplazar); aquí se suma `dy`.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B } from '../texturas.js';
import { O } from './objetos.js';
import { sonidos } from './sonidos.js';
import { pila } from './inventario.js';

const VIDA = { vaca: 10, cerdo: 10, oveja: 8, gallina: 4, conejo: 3, zorro: 10, caballo: 15 };
const COMIDA = {
    vaca: [O.TRIGO], oveja: [O.TRIGO], cerdo: [O.ZANAHORIA, O.PAPA], gallina: [O.SEMILLAS],
    conejo: [O.ZANAHORIA], caballo: [O.MANZANA, O.TRIGO], zorro: []
};
const azarEntre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function drops(tipo, cocido) {
    switch (tipo) {
        case 'vaca': return [[O.CUERO, azarEntre(0, 2)], [cocido ? O.FILETE : O.VACUNO, azarEntre(1, 3)]];
        case 'cerdo': return [[cocido ? O.CHULETA : O.CERDO, azarEntre(1, 3)]];
        case 'oveja': return [[B.LANA, 1], [cocido ? O.CORDERO_ASADO : O.CORDERO, azarEntre(1, 2)]];
        case 'gallina': return [[cocido ? O.POLLO_ASADO : O.POLLO, 1], [O.PLUMA, azarEntre(0, 2)]];
        case 'conejo': return [[O.CUERO, azarEntre(0, 1)]];
        case 'caballo': return [[O.CUERO, azarEntre(0, 2)]];
        default: return [];
    }
}
const REAPARECE_S = 300;  // las manadas se reponen a los 5 minutos
const CRECE_S = 240;       // una cría tarda 4 minutos en crecer
const ENAMORADO_S = 30;
const ORDENA_S = 120;      // una vaca vuelve a dar leche a los 2 minutos

export function crearGanado({ animales, entidades, inventario, jugador, dy, scene, hud, idioma = 'es' }) {
    const base = animales.lista.slice(); // índice estable de los animales originales (para guardar)
    const muertos = new Map();           // índice original -> segundos para reaparecer
    const crias = [];                    // animales nacidos en la partida
    let relojHuevos = 0;

    // Datos de supervivencia de cada animal
    function datos(a) {
        if (!a.sv) a.sv = { vida: VIDA[a.tipo] || 6, enamorado: 0, esquilada: 0, ordenada: 0, cria: 0, invul: 0 };
        return a.sv;
    }

    // Caja para golpear (los pies del animal están en a.y del mapa original)
    function caja(a) {
        const e = a.e || {};
        const [cw, ch, cl] = e.cuerpo || [0.8, 0.8, 1];
        const ph = (e.pata || [0.2, 0.4])[1];
        const k = a.escala || 1;
        return { x: a.x, y: a.y + dy, z: a.z, ancho: Math.max(cw, cl) * 0.85 * k, alto: (ph + ch + 0.35) * k };
    }

    // Objetivos para el combate (solo los visibles y cerca)
    function objetivos(cx, cz, radio) {
        const lista = [];
        for (const a of animales.lista) {
            if (!a.g.visible || !a.cargado) continue;
            if (Math.abs(a.x - cx) > radio || Math.abs(a.z - cz) > radio) continue;
            lista.push({ tipo: 'animal', animal: a, ...caja(a), golpear: (dano, origen) => golpear(a, dano, origen) });
        }
        return lista;
    }

    function golpear(a, dano, origen) {
        const d = datos(a);
        if (d.invul > 0) return false;
        d.invul = 0.5;
        d.vida -= dano;
        animales.asustar(a, origen ? origen.x : jugador.pos.x, origen ? origen.z : jugador.pos.z);
        sonidos.golpe();
        if (d.vida <= 0) morir(a, origen && origen.fuego);
        return true;
    }

    function morir(a, cocido) {
        const k = a.escala || 1;
        if (k >= 1) for (const [id, n] of drops(a.tipo, cocido)) if (n > 0) entidades.soltar(id, n, 0, a.x, a.y + dy + 0.5, a.z);
        animales.quitar(a);
        const i = base.indexOf(a);
        if (i >= 0) muertos.set(i, REAPARECE_S);
        const j = crias.indexOf(a);
        if (j >= 0) crias.splice(j, 1);
        sonidos.caida();
    }

    // Corazones sobre los animales enamorados
    const texCorazon = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 9;
        const ctx = c.getContext('2d');
        ['.kk...kk.', 'kaak.kaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '..kaaak..', '...kak...', '....k....'].forEach((f, y) => {
            for (let x = 0; x < 9; x++) if (f[x] !== '.') { ctx.fillStyle = f[x] === 'k' ? '#3a0008' : '#e82040'; ctx.fillRect(x, y, 1, 1); }
        });
        const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
        return t;
    })();
    const corazones = [];
    function corazon(x, y, z) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texCorazon, transparent: true, depthWrite: false }));
        s.scale.set(0.35, 0.35, 1);
        s.position.set(x, y, z);
        scene.add(s);
        corazones.push({ s, t: 1.2 });
    }

    // Clic derecho sobre un animal: alimentar (criar), esquilar o nada
    function interactuar(a) {
        const d = datos(a);
        const p = inventario.enMano();
        if (!p) return false;
        if (a.tipo === 'oveja' && p.id === O.TIJERAS && d.esquilada <= 0 && (a.escala || 1) >= 1) {
            d.esquilada = 180;
            entidades.soltar(B.LANA, azarEntre(1, 3), 0, a.x, a.y + dy + 1, a.z);
            inventario.desgastarMano(1);
            sonidos.romper(B.LANA);
            return true;
        }
        // Ordeñar: cubo o botella vacíos sobre una vaca adulta (se recupera a los 2 minutos)
        if (a.tipo === 'vaca' && (p.id === O.CUBO || p.id === O.BOTELLA) && d.ordenada <= 0 && (a.escala || 1) >= 1) {
            d.ordenada = ORDENA_S;
            const leche = p.id === O.CUBO ? O.CUBO_LECHE : O.BOTELLA_LECHE;
            if (p.n === 1) inventario.ponerEnMano(pila(leche, 1));
            else {
                inventario.gastarMano(1);
                const resto = inventario.agregar(leche, 1);
                if (resto) entidades.soltar(leche, 1, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
            }
            sonidos.salpicar();
            return true;
        }
        if ((COMIDA[a.tipo] || []).includes(p.id)) {
            if ((a.escala || 1) < 1) { d.cria = Math.min(CRECE_S, d.cria + CRECE_S * 0.1); inventario.gastarMano(1); sonidos.comer(); return true; }
            if (d.enamorado > 0) return true;
            d.enamorado = ENAMORADO_S;
            inventario.gastarMano(1);
            sonidos.comer();
            const c = caja(a);
            corazon(a.x, c.y + c.alto + 0.3, a.z);
            return true;
        }
        return false;
    }

    function nacer(madre, padre) {
        const x = (madre.x + padre.x) / 2, z = (madre.z + padre.z) / 2;
        const zona = madre.zona;
        const c = animales.agregar(madre.tipo, x, z, zona);
        c.escala = 0.5;
        datos(c).cria = 0.0001;
        crias.push(c);
        const k = caja(madre);
        for (let i = 0; i < 4; i++) corazon(x + (Math.random() - 0.5), k.y + k.alto + 0.4 + Math.random() * 0.4, z + (Math.random() - 0.5));
        sonidos.nivel();
        return c;
    }

    function actualizar(dt) {
        // Reaparición de los cazados (lejos del jugador)
        for (const [i, t] of muertos) {
            const nt = t - dt;
            if (nt > 0) { muertos.set(i, nt); continue; }
            const orig = base[i];
            const zn = orig.zona || {};
            const cx = zn.rect ? (zn.rect.x0 + zn.rect.x1) / 2 : zn.x ?? orig.x, cz = zn.rect ? (zn.rect.z0 + zn.rect.z1) / 2 : zn.z ?? orig.z;
            if (Math.hypot(cx - jugador.pos.x, cz - jugador.pos.z) < 40) { muertos.set(i, 20); continue; }
            muertos.delete(i);
            const nuevo = animales.agregar(orig.tipo, cx, cz, zn);
            base[i] = nuevo;
        }
        // Enamorados que se buscan, crías que crecen, ovejas a las que les vuelve a crecer la lana
        const enamorados = [];
        for (const a of animales.lista) {
            const d = a.sv;
            if (!d) continue;
            d.invul = Math.max(0, d.invul - dt);
            if (d.esquilada > 0) d.esquilada -= dt;
            if (d.ordenada > 0) d.ordenada -= dt;
            if (d.cria > 0) {
                d.cria += dt;
                a.escala = Math.min(1, 0.5 + 0.5 * d.cria / CRECE_S);
                if (d.cria >= CRECE_S) { d.cria = 0; a.escala = 1; }
            }
            if (d.enamorado > 0) {
                d.enamorado -= dt;
                if (Math.random() < dt * 1.5) { const c = caja(a); corazon(a.x + (Math.random() - 0.5) * 0.5, c.y + c.alto + 0.2, a.z + (Math.random() - 0.5) * 0.5); }
                enamorados.push(a);
            }
        }
        for (let i = 0; i < enamorados.length; i++) {
            const a = enamorados[i];
            if (a.sv.enamorado <= 0) continue;
            const pareja = enamorados.find(b => b !== a && b.tipo === a.tipo && b.sv.enamorado > 0 && Math.hypot(b.x - a.x, b.z - a.z) < 8);
            if (!pareja) continue;
            const dist = Math.hypot(pareja.x - a.x, pareja.z - a.z);
            if (dist < 1.4) {
                a.sv.enamorado = pareja.sv.enamorado = 0;
                nacer(a, pareja);
            } else { a.destino = { x: pareja.x, z: pareja.z }; a.estado = 'camina'; a.reloj = 3; }
        }
        // Gallinas: un huevo cada 5 a 10 minutos (solo si el jugador anda cerca)
        relojHuevos += dt;
        if (relojHuevos > 20) {
            relojHuevos = 0;
            for (const a of animales.lista) {
                if (a.tipo !== 'gallina' || (a.escala || 1) < 1 || !a.cargado) continue;
                if (Math.hypot(a.x - jugador.pos.x, a.z - jugador.pos.z) > 48) continue;
                if (Math.random() < 20 / 450) entidades.soltar(O.HUEVO, 1, 0, a.x, a.y + dy + 0.3, a.z, new THREE.Vector3(0, 1, 0));
            }
        }
        for (let i = corazones.length - 1; i >= 0; i--) {
            const c = corazones[i];
            c.t -= dt;
            c.s.position.y += dt * 0.6;
            c.s.material.opacity = Math.min(1, c.t * 2);
            if (c.t <= 0) { scene.remove(c.s); c.s.material.dispose(); corazones.splice(i, 1); }
        }
    }

    function serializar() {
        return {
            muertos: [...muertos].map(([i, t]) => [i, Math.round(t)]),
            crias: crias.map(c => [c.tipo, +c.x.toFixed(1), +c.z.toFixed(1), Math.round(c.sv.cria), base.indexOf(base.find(b => b.zona === c.zona))])
        };
    }
    function cargar(o) {
        if (!o) return;
        for (const [i, t] of o.muertos || []) {
            const a = base[i];
            if (!a) continue;
            animales.quitar(a);
            muertos.set(i, t);
        }
        for (const [tipo, x, z, cria, iz] of o.crias || []) {
            const zona = (base[iz] && base[iz].zona) || { x, z, radio: 12 };
            const c = animales.agregar(tipo, x, z, zona);
            datos(c).cria = cria || 0;
            c.escala = cria ? Math.min(1, 0.5 + 0.5 * cria / CRECE_S) : 1;
            crias.push(c);
        }
    }

    return { objetivos, golpear, interactuar, actualizar, serializar, cargar, caja };
}
