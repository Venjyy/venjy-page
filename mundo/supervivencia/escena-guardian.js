// =========================================================
// VENJY · Supervivencia · Escena del guardián del cofre de compañero
// Clic derecho sobre un «Cofre de <nombre>» (cofres-companeros.js) llama a iniciar(cofre).
//  · Cofre NO compartido (~8,2 s, cámara de cine): tu personaje (con tu skin) estira la mano hacia la
//    tapa; la tapa tiembla y se entreabre; sale el guardián, tu amigo con SU skin y medio translúcido;
//    mueve el dedo (brazo en alto que oscila, cabeza que niega), te da un manotazo suave y dice una
//    frase en un globo; se hunde de vuelta y la tapa se cierra de golpe con humo.
//  · Cofre compartido (~3,2 s): el guardián sale contento (saluda, salto chico), dice una frase
//    invitando a sacar lo que necesites, se hunde y la tapa se abre. Al terminar, después de liberar
//    al jugador, se llama cofre.alTerminar() (abre la ventana del cofre).
// Se salta con Esc o con «Saltar»: restaura todo (en la compartida también abre la ventana).
// Coordenadas: el cofre vive en `scene` (coordenadas del mundo, sin dy); el ancla de la cámara resta
// dy porque iniciarCine lo suma. Depuración: __venjy.guardian (forzar, pausar, irA, saltar, activa).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';
import { crearGlobo, COLOR_GLOBO } from '../criaturas/cuerpo.js';
import { crearModelo, BASES } from './skin.js';
import { crearModeloCofre } from './cofres-companeros.js';
import { sonidos } from './sonidos.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);

const T_SOLO = 8.2;               // duración de la variante no compartida (s)
const T_COMP = 3.2;               // duración de la variante compartida (s)
const DIST = 1.38;                // el jugador se para a esta distancia del centro del cofre (su mano llega a la tapa)
const SOBRE_COFRE = -0.15;        // el guardián sale casi del centro del cofre (un poco hacia atrás)
const OPACIDAD = 0.5;             // translúcido
const COLOR_PESTANA = '#8e8e86';  // pestaña del globo del guardián (no hay clave de color para un amigo cualquiera)
// Planos de la escena (camaras.js acepta una lista propia). Se quitan los de «hombro amigo» (la cámara quedaba dentro del cofre) y el de «hombro jugador, otro lado» (quedaba dentro del terreno).
const PLANOS_COFRE = [
    { nombre: 'dos', ang: Math.PI / 2, dist: 3.4, alto: 1.75, orbita: 0.1, dolly: -0.4 },
    { nombre: 'hombro jugador', ang: 0.38, dist: null, alto: 1.9, orbita: 0.06, dolly: -0.3 },
    { nombre: 'hombro amigo, otro lado', ang: Math.PI + 0.38, dist: null, alto: 1.9, orbita: 0.06, dolly: -0.3 },
    { nombre: 'general', ang: -1.15, dist: 5.6, alto: 2.5, orbita: 0.14, dolly: -0.6 },
    { nombre: 'contrapicado', ang: -Math.PI / 2, dist: 2.6, alto: 0.8, orbita: -0.1, dolly: -0.2 }
];

const TXT = {
    es: { saltar: 'Saltar' },
    en: { saltar: 'Skip' }
};
// Frases del guardián (una al azar por escena); cada índice tiene su par ES/EN
const FRASES = {
    solo: {
        es: ['¡Quieto ahí, cabro! Eso es mío. Vuelve cuando yo esté.', 'Jaja, buen intento. Esto se abre cuando yo esté, ¿ya?', 'No me enojo, pero cuando vuelva lo vemos juntos, ¿ya?', 'Tranquilo, mis cosas están a salvo. Pasa cuando yo esté.'],
        en: ["Hey, hands off, kid! That one is mine. Come back when I'm around.", "Ha, nice try. This only opens when I'm around, okay?", "No hard feelings, but we'll sort it out together when I'm back.", "Relax, my stuff is safe in here. Come by when I'm online."]
    },
    comp: {
        es: ['¡Mira quién llegó! Saca lo que necesites, que también es tuyo.', 'Ya po, pasa nomás. Agarra lo que te haga falta, no te cobro.', 'Mis cosas también son tuyas, así que sírvete tranquilo.'],
        en: ['Look who showed up! Grab what you need, it is yours too.', "Come on in! Take whatever you need, I won't charge you.", 'My stuff is your stuff too, so help yourself, dude.']
    }
};

// Quita geometría y materiales de un modelo de cajas (o de un cofre) que ya no se usa
function soltarObjeto(g) {
    g.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) for (const mt of Array.isArray(o.material) ? o.material : [o.material]) { if (mt.map) mt.map.dispose(); mt.dispose(); }
    });
}

export function crearEscenaGuardian(ctx) {
    const { scene, dy, mundo, jugador, camara, camaras, hud, particulas, bloquear, liberar } = ctx;
    // main.js hoy no pasa `misiones`: sin él, los «!» de misión pueden salir en el encuadre (ver PENDIENTES)
    const misiones = ctx.misiones || null;
    let idioma = ctx.idioma || 'es';
    let estado = null, pausada = false;

    // ---- Botón «Saltar» (igual que caricias.js; clase propia para su CSS) ----
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton saltar-guardian';
    boton.textContent = (TXT[idioma] || TXT.es).saltar;
    boton.addEventListener('click', e => { e.preventDefault(); saltar(); });
    document.body.appendChild(boton);
    document.addEventListener('keydown', e => { if (estado && e.code === 'Escape' && !e.repeat) { e.preventDefault(); saltar(); } });

    // Globo del guardián (la pestaña lleva su nombre y un color neutro)
    const globo = crearGlobo(scene);

    // ---- Bloques: el suelo se pisa y lo que tapa no sirve para parar al jugador ----
    const solido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && TIPO[id] === 1; };
    const opaco = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };

    // Dónde se para el jugador: a DIST del centro, del lado de la cara del cofre; si no hay piso, otro ángulo
    function sitioJugador(C, F) {
        for (const a of [0, 0.35, -0.35, 0.7, -0.7]) {
            const c = Math.cos(a), s = Math.sin(a);
            const x = Math.floor(C.x + (F.x * c - F.z * s) * DIST), z = Math.floor(C.z + (F.x * s + F.z * c) * DIST);
            if (solido(x, C.y - 1, z) && !opaco(x, C.y, z) && !opaco(x, C.y + 1, z)) return { x: x + 0.5, y: C.y, z: z + 0.5 };
        }
        return { x: C.x + F.x * DIST, y: C.y, z: C.z + F.z * DIST };
    }

    // Luz del mundo en un punto (como camaras.js con el cuerpo del jugador): el modelo del guardián la sigue
    const luzG = new THREE.Color();
    function luzEn(x, y, z) {
        const l = mundo.nivelLuz(x, y, z);
        const c = Math.pow(l >= 0 ? (l >> 4) / 15 : 1, 1.6), b = Math.pow(l >= 0 ? (l & 15) / 15 : 0, 1.6);
        return luzG.setRGB(Math.max(c, b, 0.08), Math.max(c * 0.97, b * 0.85, 0.08), Math.max(c * 0.92, b * 0.6, 0.08));
    }

    // Modelo de cajas del amigo con SU skin, translúcido (sin escalar partes)
    function crearGuardian(perfil) {
        const m = crearModelo(perfil && perfil.skin ? perfil.skin : BASES[0]);
        m.mats = new Set();
        m.g.traverse(o => {
            if (!o.isMesh) return;
            for (const mt of Array.isArray(o.material) ? o.material : [o.material]) {
                mt.transparent = true; mt.opacity = 0; mt.depthWrite = false; m.mats.add(mt);
            }
        });
        m.tinte.aplicar(luzG.setRGB(1, 1, 1));
        m.g.visible = false;
        scene.add(m.g);
        return m;
    }

    // Cofre de prueba (forzar sin cofre real): se pone a 2,5 bloques delante del jugador, con su cara hacia él
    function cofreDePrueba(compartido) {
        const p = jugador.pos;
        const fx = -Math.sin(jugador.yaw), fz = -Math.cos(jugador.yaw);
        const x = Math.floor(p.x + fx * 2.5) + 0.5, z = Math.floor(p.z + fz * 2.5) + 0.5, y = Math.round(p.y);
        const yaw = Math.atan2(p.x - x, p.z - z);
        const m = crearModeloCofre(9100);
        m.g.position.set(x, y, z);
        m.g.rotation.y = yaw;
        scene.add(m.g);
        const base = BASES[Math.floor(Math.random() * BASES.length)];
        return {
            g: m.g, tapa: m.tapa, base: m.base, x, y, z, yaw, perfil: { nombre: 'Pony', skin: base },
            compartido, alTerminar: compartido ? () => { if (hud) hud.mensaje('[prueba] ventana del cofre', 2); } : null, temp: true
        };
    }

    // ---------------------------------------------------------
    // Actores: tu cuerpo (camaras.cuerpo) y el guardián
    // ---------------------------------------------------------
    // Tu cuerpo: alcance con el brazo derecho (variante no compartida); neutro en la compartida
    function poseJugador(c) {
        if (!estado) return;
        const e = estado;
        let W = 0, R = 0, t = e.t;
        if (!e.compartido) {
            W = suave(tramo(t, 0.3, 1.2)) * (1 - suave(tramo(t, 6.2, 6.9)));   // estira y vuelve
            R = suave(tramo(t, 5.2, 5.6)) * (1 - suave(tramo(t, 6.2, 6.9)));  // retrocede tras el manotazo
        }
        c.cuerpo.position.y = 0.034 * W;
        c.cuerpo.rotation.x = 0.3 * W * (1 - 0.6 * R);
        c.cuerpo.rotation.z = 0;
        c.piernaD.rotation.x = -0.3 * W; c.piernaI.rotation.x = -0.3 * W;
        c.brazoD.rotation.x = W * lerp(-1.2, -0.45, R);
        c.brazoD.rotation.z = 0.05 + 0.1 * W + 0.02 * Math.sin(t * 30) * W;
        c.brazoI.rotation.x = 0.25 * W; c.brazoI.rotation.z = -0.05 - 0.1 * W;
        c.cuello.rotation.x = 0.35 * W; c.cuello.rotation.y = 0; c.cuello.rotation.z = 0;
    }

    function resetearJugador(c) {
        c.cuerpo.position.y = 0; c.cuerpo.rotation.x = 0; c.cuerpo.rotation.z = 0;
        for (const h of [c.brazoD, c.brazoI, c.piernaD, c.piernaI, c.cuello]) { h.rotation.x = 0; h.rotation.z = 0; }
        c.cuello.rotation.y = 0;
    }

    // Una vez por escena: efecto disparado cuando t pasa `cuando`
    function una(e, clave, cuando, fn) {
        if (cuando && !e.hechos.has(clave)) { e.hechos.add(clave); fn(); }
    }

    // ---------------------------------------------------------
    // Cuadro a cuadro: tapa, guardián, globo y efectos según el tiempo t de la escena
    // ---------------------------------------------------------
    function aplicar(e, t, dt) {
        const C = e.C, F = e.F, m = e.m, solo = !e.compartido;
        // Tapa (rotation.x negativo = se abre)
        let tapaX;
        if (solo) {
            tapaX = -1.25 * suave(tramo(t, 1.9, 3.0)) * (1 - suave(tramo(t, 7.6, 7.8)))
                + 0.035 * Math.sin(t * 50) * tramo(t, 1.2, 1.9) * (1 - tramo(t, 1.9, 2.0))      // tiembla
                + 0.02 * Math.sin(t * 42) * tramo(t, 1.9, 2.2) * (1 - tramo(t, 2.6, 3.0));    // se entreabre con temblor
        } else {
            tapaX = -1.25 * suave(tramo(t, 2.2, 2.8));
        }
        e.cofre.tapa.rotation.x = tapaX;

        // Guardián: altura (dentro del cofre → fuera → hundido), opacidad y pose
        let yG, op, bDx, bDz, bIx, bIz, cx, cy;
        if (solo) {
            const rs = suave(tramo(t, 2.2, 3.0)), sk = suave(tramo(t, 6.6, 7.6));
            yG = -0.9 * (1 - rs) - 0.9 * sk;
            op = OPACIDAD * suave(tramo(t, 2.2, 2.8)) * (1 - suave(tramo(t, 7.0, 7.5)));
            const up = suave(tramo(t, 3.0, 3.5)), gS = suave(tramo(t, 5.0, 5.2)), gR = suave(tramo(t, 5.2, 5.5));
            const wag = up * (1 - gS);                 // mueve el dedo mientras tiene el brazo arriba
            bDx = -2.1 * up * (1 - gS) - 0.8 * gS * (1 - gR);   // baja y toca tu mano (manotazo) y vuelve
            bDz = 0.32 * Math.sin(t * 8.5) * wag;      // dedo: de lado a lado
            cy = 0.5 * Math.sin(t * 8.5) * wag;        // la cabeza niega
            cx = -0.1 * rs;
            bIx = 0.2 * rs; bIz = -0.05;
            una(e, 'humoSale', t >= 2.5, () => particulas.humo(C.x, C.y + 0.9, C.z, 12));
            una(e, 'golpe', t >= 5.2, () => sonidos.golpe());
            una(e, 'humoHundir', t >= 6.6, () => particulas.humo(C.x, C.y + 0.4, C.z, 8));
            una(e, 'crujido', t >= 1.9, () => sonidos.puerta(true));
            una(e, 'cierre', t >= 7.6, () => { sonidos.puerta(false); particulas.humo(C.x, C.y + 1.0, C.z, 16); });
        } else {
            const rs = suave(tramo(t, 0.2, 0.9)), sk = suave(tramo(t, 2.4, 3.0));
            const hop = Math.sin(tramo(t, 0.9, 1.4) * Math.PI) * 0.35;   // salto chico al saludar
            yG = -0.9 * (1 - rs) - 0.9 * sk + hop;
            op = OPACIDAD * suave(tramo(t, 0.2, 0.8)) * (1 - suave(tramo(t, 2.5, 3.0)));
            const up = suave(tramo(t, 0.8, 1.2)) * (1 - sk);   // saludo con la mano
            bDx = -2.7 * up;
            bDz = (-0.35 + 0.35 * Math.sin(t * 9)) * up;
            bIx = 0; bIz = -0.05; cx = 0; cy = 0;
            una(e, 'humoSale', t >= 0.5, () => particulas.humo(C.x, C.y + 0.6, C.z, 10));
            una(e, 'crujido', t >= 2.2, () => sonidos.puerta(true));
            una(e, 'polvo', t >= 2.6, () => particulas.humo(C.x, C.y + 0.9, C.z, 8));
        }
        const gx = C.x + F.x * SOBRE_COFRE, gz = C.z + F.z * SOBRE_COFRE, gy = C.y + yG;
        m.g.position.set(gx, gy, gz);
        m.g.rotation.y = e.cofre.yaw;     // mira hacia ti (el frente del cofre)
        m.g.visible = op > 0.01;
        for (const mt of m.mats) mt.opacity = op;
        m.tinte.aplicar(luzEn(gx, gy + 1, gz));
        m.cuello.rotation.x = cx; m.cuello.rotation.y = cy; m.cuello.rotation.z = 0;
        // Cara a cara, su brazo izquierdo cae del mismo lado que tu derecho: el manotazo sale de ahí
        if (solo) {
            m.brazoD.rotation.x = bIx; m.brazoD.rotation.z = 0.05;
            m.brazoI.rotation.x = bDx; m.brazoI.rotation.z = -0.05 - bDz;
        } else {
            m.brazoD.rotation.x = bDx; m.brazoD.rotation.z = bDz;
            m.brazoI.rotation.x = bIx; m.brazoI.rotation.z = bIz;
        }
        m.piernaD.rotation.x = 0; m.piernaI.rotation.x = 0;
        m.cuerpo.rotation.x = 0; m.cuerpo.position.y = 0;

        // Globo con la frase (solo mientras el guardián está a la vista y en su tramo)
        const ventana = solo ? (t >= 3.3 && t < 6.9) : (t >= 1.0 && t < 2.9);
        if (ventana && !e.dijo) { e.dijo = true; globo.etiqueta = { nombre: e.nombre, color: COLOR_PESTANA }; globo.decir(e.texto); }
        const px = jugador.pos.x, pz = jugador.pos.z;
        const zonas = () => [
            { quien: 'g', tipo: 'cabeza', x: gx, y: gy + 1.75, z: gz, r: 0.3 },
            { quien: 'j', tipo: 'cabeza', x: px, y: jugador.pos.y + 1.7, z: pz, r: 0.3 }
        ];
        globo.actualizar(dt, ventana && !!e.dijo, gx, gy + 2.3, gz, camara, zonas);
    }

    // ---------------------------------------------------------
    // Inicio, fin y bucle
    // ---------------------------------------------------------
    function iniciar(cofre) {
        if (estado || jugador.congelado || (ctx.vida && ctx.vida.muerto)) return false;
        const compartido = !!cofre.compartido;
        bloquear();
        const C = { x: cofre.x, y: cofre.y, z: cofre.z };
        const F = { x: Math.sin(cofre.yaw), z: Math.cos(cofre.yaw) };   // frente del cofre (hacia donde se abre)
        const sitio = sitioJugador(C, F);
        jugador.colocar(sitio.x, sitio.y, sitio.z);
        jugador.yaw = Math.atan2(C.x - sitio.x, C.z - sitio.z) - Math.PI;   // mira al cofre
        jugador.pitch = 0;

        const m = crearGuardian(cofre.perfil);
        const lista = compartido ? FRASES.comp : FRASES.solo;
        const i = Math.floor(Math.random() * lista.es.length);
        const nombre = (cofre.perfil && cofre.perfil.nombre) || '';
        // Ancla de la cámara: entre el cofre y tú; y restando dy (iniciarCine lo suma)
        const ancla = { x: C.x + F.x * 0.6, y: C.y - dy + 0.2, z: C.z + F.z * 0.6, escala: 0.9 };
        estado = {
            cofre, compartido, m, C, F, sitio, nombre, ancla,
            T: compartido ? T_COMP : T_SOLO, t: 0, hechos: new Set(), dijo: false,
            texto: (lista[idioma] || lista.es)[i],
            alTerminar: cofre.alTerminar || null
        };
        camaras.iniciarCine(ancla, { escena: true, fundido: 0.45, planos: PLANOS_COFRE, visibles: [{ clave: 'guardian', p: m }], evitar: [] });
        camaras.enfocar(0.5);
        camaras.pose = c => poseJugador(c);
        if (misiones) misiones.ocultarMarcas = true;
        document.body.classList.add('en-guardian');
        return true;
    }

    function terminar() {
        if (!estado) return;
        const e = estado; estado = null;
        resetearJugador(camaras.cuerpo);
        camaras.terminarCine();
        e.cofre.tapa.rotation.x = 0;
        scene.remove(e.m.g);
        soltarObjeto(e.m.g);
        if (e.cofre.temp) { scene.remove(e.cofre.g); soltarObjeto(e.cofre.g); }
        if (misiones) misiones.ocultarMarcas = false;
        document.body.classList.remove('en-guardian');
        liberar();
        // Compartido: la ventana del cofre se abre cuando el jugador ya está libre
        if (e.compartido && e.alTerminar) e.alTerminar();
    }

    function saltar() { if (estado) terminar(); }

    function actualizar(dt) {
        if (!estado) { globo.actualizar(dt, false, 0, 0, 0); return; }
        const e = estado;
        if (!pausada) e.t += dt;
        aplicar(e, e.t, dt);
        if (e.t >= e.T) terminar();
    }

    return {
        actualizar,
        // cofres-companeros.js: escena.iniciar(cofre) → true si arrancó
        iniciar,
        get activa() { return !!estado; },
        // Depuración (capturas): el modelo del guardián mientras dura la escena
        get modelo() { return estado ? estado.m : null; },
        saltar,
        setIdioma(v) { idioma = v; boton.textContent = (TXT[v] || TXT.es).saltar; },
        // Depuración: abre el primer cofre real (con la variante que pidas) o uno de prueba si no hay ninguno
        forzar(compartido = false) {
            if (estado || jugador.congelado) return false;
            const c = ctx.cofres ? ctx.cofres().cofre() : null;
            if (c && c.colocado) {
                const prev = c.perfil.comp;
                c.perfil.comp = !!compartido;
                const ok = ctx.cofres().abrir(c.disp);
                c.perfil.comp = prev;
                return ok;
            }
            return iniciar(cofreDePrueba(!!compartido));
        },
        pausar(v = true) { pausada = v; },
        irA(s) { if (estado) estado.t = s; }
    };
}
