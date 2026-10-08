// =========================================================
// VENJY · Más amigos repartidos por los lugares para explorar
// Campamento: Hadad, Andy y Nacho conversan de Fortnite junto a la fogata.
// Naufragio: Braulio pasea por la playa. Iglú: Moisés (bong) y Lalo (pito).
// Atalaya: Boris corta leña (hacha, astillas y hachazos) y Lucho conversa con él.
// Escenario: Conejeros escucha a Salonas. Cada uno tiene su animación propia.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { NIVEL_AGUA } from '../voxeles.js';
import {
    seVe, RADIO_VISIBLE, ajustar, lerp, angulo, crearTinte, crearPersona, caminar, caja, texturaPixeles, liso,
    crearNombre, crearGlobo, suelo, audioMundo, sonando, bufferRuido
} from './cuerpo.js';
import { pielDe, agregarExtras } from './pieles.js';
import { crearCharla } from './charla.js';

const suave = u => u * u * (3 - 2 * u);
const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));

// ---------------------------------------------------------
// Cómo es cada uno
// ---------------------------------------------------------
export const PERSONAS = {
    hadad: { nombre: 'Hadad', piel: [226, 192, 164], pelo: { color: [44, 30, 24], estilo: 'ordenado' }, ojos: [64, 150, 86], barba: true, ropa: { tipo: 'polera', color: [62, 88, 66] }, pantalon: [56, 74, 110], zapatillas: 'negras' },
    andy: { nombre: 'Andy', escala: 1.1, piel: [194, 148, 110], pelo: { color: [20, 18, 20], estilo: 'corto' }, ojos: [26, 20, 20], ropa: { tipo: 'poleron', color: [42, 92, 200] }, pantalon: [26, 26, 30], zapatillas: 'blancas' },
    nacho: { nombre: 'Nacho', piel: [244, 216, 196], pelo: { color: [88, 62, 40], estilo: 'corto' }, ojos: [84, 58, 36], ropa: { tipo: 'polera', color: [176, 48, 46] }, pantalon: [62, 92, 142], zapatillas: 'blancas' },
    braulio: { nombre: 'Braulio', escala: 0.9, piel: [240, 210, 188], pelo: { color: [112, 76, 44], estilo: 'corto' }, ojos: [90, 60, 36], lunar: true, ropa: { tipo: 'poleron', color: [40, 70, 150] }, pantalon: [62, 92, 142], zapatillas: 'negras' },
    moises: { nombre: 'Moisés', escala: 1.05, piel: [242, 214, 196], pelo: { color: [178, 134, 72], estilo: 'largo' }, ojos: [90, 60, 36], ojosRojos: true, ropa: { tipo: 'poleron', color: [92, 104, 62] }, pantalon: [62, 92, 142], zapatillas: 'blancas' },
    lalo: { nombre: 'Lalo', piel: [110, 72, 48], pelo: { color: [18, 16, 18], estilo: 'corto' }, ojos: [30, 22, 20], ojosRojos: true, gorro: [30, 30, 36], ropa: { tipo: 'polera ancha', color: [236, 236, 232] }, pantalon: [76, 106, 162], zapatillas: 'jordan' },
    boris: { nombre: 'Boris', piel: [162, 110, 72], pelo: { color: [24, 20, 20], estilo: 'corto' }, ojos: [40, 28, 22], ropa: { tipo: 'camisa cuadros', color: [176, 40, 36] }, pantalon: [58, 66, 92], zapatillas: 'botas' },
    lucho: { nombre: 'Lucho', piel: [242, 216, 198], pelo: { color: [16, 14, 16], estilo: 'desordenado' }, ojos: [96, 62, 34], ropa: { tipo: 'polera', color: [30, 30, 34] }, pantalon: [48, 52, 66], zapatillas: 'negras' },
    conejeros: { nombre: 'Conejeros', piel: [242, 212, 190], pelo: { color: [30, 22, 18], estilo: 'muy corto' }, ojos: [80, 56, 36], ropa: { tipo: 'polera', color: [24, 24, 26], estampado: [226, 226, 220] }, pantalon: [62, 92, 142], zapatillas: 'blancas' }
};

// Frases sueltas (los que hablan solos) y conversaciones de grupo
const FRASES = {
    braulio: [
        { es: 'Me gusta la playa, es como estar en Arica, pero con agua.', en: "I like the beach, it's like being in Arica, but with water." },
        { es: '¿Sabías que tengo un dedo doble?', en: 'Did you know I have a double finger?' },
        { es: 'Este barco no es mío, eh. Ya estaba así.', en: "This ship isn't mine, okay? It was already like this." }
    ],
    conejeros: [
        { es: '¡El terrible weón el Pony! Es muy chico.', en: "That Pony's a legend! He's so tiny." },
        { es: 'Soy de San Rosendo, compadre.', en: "I'm from San Rosendo, mate." },
        { es: '¿Viste al Pony pescando? Es más chico que el pez.', en: "Did you see Pony fishing? He's smaller than the fish." },
        { es: '¡Salonas, toca otra!', en: 'Salonas, play another one!' }
    ]
};
const CHARLAS = {
    campamento: [
        { quien: 'hadad', es: '¿Jugamos Fortnite en la noche?', en: 'Fortnite tonight?' },
        { quien: 'andy', es: 'Obvio. Ayer saqué top 1.', en: 'Obviously. I got a Victory Royale yesterday.', evento: 'baile' },
        { quien: 'nacho', es: 'Mentira, te mató la tormenta.', en: 'Liar, the storm got you.', evento: 'risa' },
        { quien: 'hadad', es: 'Si construyeras más rápido no te pasaría.', en: "If you built faster that wouldn't happen." },
        { quien: 'andy', es: 'Yo no construyo: salto del bus y rezo.', en: "I don't build: I jump off the bus and pray." },
        { quien: 'nacho', es: 'Yo caigo en Tilted y muero altiro.', en: 'I drop at Tilted and die right away.', evento: 'risa' },
        { quien: 'hadad', es: 'Hoy dúo. Y nada de bailar antes de ganar, Andy.', en: 'Duos tonight. And no dancing before winning, Andy.' },
        { quien: 'andy', es: 'No prometo nada.', en: 'No promises.', evento: 'baile' }
    ],
    lenera: [
        { quien: 'boris', es: '¿Viste Nana? Quedé destruido con el final.', en: 'Did you watch Nana? The ending wrecked me.' },
        { quien: 'lucho', es: 'Nana es tremendo. La música es lo mejor.', en: 'Nana is amazing. The music is the best part.' },
        { quien: 'boris', es: 'Ahora estoy pegado con Deadlock.', en: "Now I'm hooked on Deadlock." },
        { quien: 'lucho', es: 'Yo sigo en el LoL. Una ranked y me acuesto.', en: "I'm still on LoL. One ranked and then bed." },
        { quien: 'boris', es: 'Eso dijiste ayer y jugaste hasta las 4.', en: 'You said that yesterday and played until 4.' },
        { quien: 'lucho', es: 'El LoL es así, Boris. Igual que el anime.', en: "That's LoL, Boris. Same as anime." },
        { quien: 'boris', es: 'Deadlock es el futuro, créeme. El LoL ya fue.', en: 'Deadlock is the future, trust me. LoL is old news.' },
        { quien: 'lucho', es: 'Pásame el hacha y lo conversamos.', en: "Hand me the axe and we'll talk about it." }
    ],
    iglu: [
        { quien: 'lalo', es: 'Estamos en el iglú porque el frío nos recuerda a Coyhaique.', en: "We're in the igloo because the cold reminds us of Coyhaique." },
        { quien: 'moises', es: 'Coyhaique... qué tiempos, hermano.', en: 'Coyhaique... good times, bro.' },
        { quien: 'ambos', es: '¡YIAAAAAA!', en: 'YIAAAAAA!', evento: 'yia' },
        { quien: 'lalo', es: '¿Me pasai el encendedor?', en: 'Pass me the lighter?' },
        { quien: 'moises', es: 'Espérate, que estoy cargando.', en: "Hold on, I'm loading it." },
        { quien: 'lalo', es: 'Este iglú es lo más acogedor del mapa.', en: 'This igloo is the coziest spot on the map.' },
        { quien: 'moises', es: '*cof cof*... está bueno.', en: "*cough cough*... it's good.", evento: 'tos' },
        { quien: 'lalo', es: 'Tranqui, tranqui. Respira.', en: 'Easy, easy. Breathe.' },
        { quien: 'lalo', es: '*COF COF COF*... ¡ufff! Ese estaba cargado.', en: '*COUGH COUGH COUGH*... phew! That one was strong.', evento: 'tosLalo' },
        { quien: 'moises', es: 'Jajaja, ¿y te reías de mí?', en: 'Haha, and you were laughing at me?' },
        { quien: 'ambos', es: '¡YIAAAAAA!', en: 'YIAAAAAA!', evento: 'yia' }
    ]
};

export function crearAmigos(scene, { terreno, mundo, jugador, materiales, npcs, idioma: idiomaInicial = 'es' }) {
    let idioma = idiomaInicial;
    const tinte = crearTinte();
    const lista = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const lugar = k => (terreno.lugares || []).find(l => l.clave === k);
    const tex = (w, h, sem, color, f = 0.18) => texturaPixeles(w, h, sem, liso(color, f));

    // ---------------------------------------------------------
    // Crear una persona con sus accesorios de volumen
    // ---------------------------------------------------------
    function nuevo(clave, x, y, z, yaw, semilla) {
        const d = PERSONAS[clave];
        const piel = pielDe(d);
        const p = crearPersona(tinte, piel, semilla);
        const escala = d.escala || 1;
        p.g.scale.setScalar(escala);
        agregarExtras(p, piel.extras, tinte, semilla);
        scene.add(p.g);
        const n = {
            clave, p, escala, x, y, z, yaw, t: Math.random() * 10, fase: 0,
            nombre: crearNombre(scene, d.nombre), globo: crearGlobo(scene),
            frase: null, cerca: false, cambioFrase: 0, charla: null, visible: false
        };
        lista.push(n);
        return n;
    }
    // Poses de base
    function sentadoEnTronco(p) { p.cuerpo.position.y = 0.25; p.piernaD.rotation.x = p.piernaI.rotation.x = -0.75; } // piernas colgando por delante del tronco
    function sentadoEnSuelo(p) { p.cuerpo.position.y = -0.6; p.piernaD.rotation.x = -Math.PI / 2; p.piernaI.rotation.x = -Math.PI / 2 + 0.1; }
    // Gira la cabeza hacia un punto (limitado)
    function mirarA(n, tx, tz, dt, max = 1, incl = 0) {
        const giro = Math.max(-max, Math.min(max, angulo(Math.atan2(tx - n.x, tz - n.z) - n.yaw)));
        const k = Math.min(1, dt * 5);
        n.p.cuello.rotation.y += (giro - n.p.cuello.rotation.y) * k;
        n.p.cuello.rotation.x += (incl - n.p.cuello.rotation.x) * k;
    }
    const k = (dt, v = 8) => Math.min(1, dt * v);
    const ir = (obj, prop, val, a) => { obj[prop] += (val - obj[prop]) * a; };

    // ---------------------------------------------------------
    // Humo (pool fijo de sprites que suben, crecen y se desvanecen)
    // ---------------------------------------------------------
    const humoTex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 16;
        const x = c.getContext('2d');
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
            const d = Math.hypot(i - 7.5, j - 7.5) / 8;
            if (d > 1) continue;
            const a = (1 - d) * (0.6 + Math.random() * 0.4);
            x.fillStyle = `rgba(230,230,230,${a.toFixed(2)})`; x.fillRect(i, j, 1, 1);
        }
        const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
        return t;
    })();
    const humo = Array.from({ length: 40 }, () => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: humoTex, transparent: true, depthWrite: false, opacity: 0 }));
        sp.visible = false; scene.add(sp);
        return { sp, vida: 0, dur: 1, vx: 0, vy: 0, vz: 0, s: 0.3 };
    });
    let humoI = 0;
    function emitir(x, y, z, { n = 1, s = 0.25, dur = 2.2, vy = 0.5, dispersion = 0.12, color = 0xd8d8d8, vx = 0, vz = 0 } = {}) {
        for (let j = 0; j < n; j++) {
            const h = humo[humoI = (humoI + 1) % humo.length];
            h.vida = h.dur = dur * rnd(0.8, 1.2);
            h.sp.position.set(x + rnd(-0.03, 0.03), y, z + rnd(-0.03, 0.03));
            h.vx = vx + rnd(-dispersion, dispersion); h.vy = vy * rnd(0.7, 1.2); h.vz = vz + rnd(-dispersion, dispersion);
            h.s = s * rnd(0.8, 1.2);
            h.sp.material.color.setHex(color);
            h.sp.visible = true;
        }
    }
    function actualizarHumo(dt, oculto) {
        for (const h of humo) {
            if (!h.sp.visible) continue;
            h.vida -= dt;
            if (h.vida <= 0 || oculto) { h.sp.visible = false; continue; }
            const u = 1 - h.vida / h.dur;
            h.sp.position.x += h.vx * dt; h.sp.position.y += h.vy * dt; h.sp.position.z += h.vz * dt;
            h.vx *= 0.98; h.vz *= 0.98;
            const s = h.s * (1 + u * 2.2);
            h.sp.scale.set(s, s, 1);
            h.sp.material.opacity = 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.4 + 0.05)) * (1 - u * 0.4);
        }
    }
    // Boca de una persona en coordenadas del mundo
    const vBoca = new THREE.Vector3();
    function boca(n) {
        n.p.g.updateMatrixWorld(true);
        return n.p.cabeza.localToWorld(vBoca.set(0, -0.08, 0.3));
    }

    // ---------------------------------------------------------
    // Sonidos: hachazo, burbujas del bong y tos
    // ---------------------------------------------------------
    function hachazo(d) {
        try {
            if (!sonando()) return;
            const vol = 0.32 * Math.max(0, 1 - d / 26);
            if (vol < 0.004) return;
            const { ctx, master } = audioMundo();
            const t = ctx.currentTime;
            const golpe = ctx.createOscillator(); golpe.type = 'sine';
            golpe.frequency.setValueAtTime(150, t); golpe.frequency.exponentialRampToValueAtTime(55, t + 0.12);
            const eg = ctx.createGain(); eg.gain.setValueAtTime(vol, t); eg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
            golpe.connect(eg); eg.connect(master); golpe.start(t); golpe.stop(t + 0.18);
            for (const [tipo, f, q, v, dur, ret] of [['bandpass', 900, 1.2, vol * 1.1, 0.09, 0], ['highpass', 3200, 0.7, vol * 0.7, 0.02, 0], ['bandpass', 2200, 3, vol * 0.35, 0.05, 0.06]]) {
                const n = ctx.createBufferSource(); n.buffer = bufferRuido(ctx);
                const fl = ctx.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; fl.Q.value = q;
                const e = ctx.createGain(); e.gain.setValueAtTime(v, t + ret); e.gain.exponentialRampToValueAtTime(0.0001, t + ret + dur);
                n.connect(fl); fl.connect(e); e.connect(master); n.start(t + ret, Math.random()); n.stop(t + ret + dur + 0.02);
            }
        } catch (e) { /* sin sonido */ }
    }
    function burbujas(d, dur) {
        try {
            if (!sonando()) return;
            const vol = 0.07 * Math.max(0, 1 - d / 9);
            if (vol < 0.003) return;
            const { ctx, master } = audioMundo();
            const t0 = ctx.currentTime;
            for (let j = 0; j < dur * 14; j++) {
                const t = t0 + j / 14 + Math.random() * 0.05;
                const o = ctx.createOscillator(); o.type = 'sine';
                const f = rnd(260, 620);
                o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.04);
                const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
                o.connect(e); e.connect(master); o.start(t); o.stop(t + 0.06);
            }
        } catch (e) { /* sin sonido */ }
    }
    // fuerza 2: la tos de Lalo, más fuerte, más grave y con más golpes
    function tos(d, fuerza = 1) {
        try {
            if (!sonando()) return;
            const vol = 0.12 * fuerza * Math.max(0, 1 - d / (12 * fuerza));
            if (vol < 0.003) return;
            const { ctx, master } = audioMundo();
            const t0 = ctx.currentTime;
            (fuerza > 1 ? [0, 0.22, 0.42, 0.66, 0.95] : [0, 0.28, 0.5]).forEach(ret => {
                const n = ctx.createBufferSource(); n.buffer = bufferRuido(ctx);
                const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fuerza > 1 ? 470 : 650; f.Q.value = 1.5;
                const e = ctx.createGain(); const t = t0 + ret;
                e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(vol, t + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
                n.connect(f); f.connect(e); e.connect(master); n.start(t, Math.random()); n.stop(t + 0.2);
            });
        } catch (e) { /* sin sonido */ }
    }

    // ---------------------------------------------------------
    // Campamento: Hadad, Andy y Nacho alrededor de la fogata
    // ---------------------------------------------------------
    const grupos = [];
    const C = lugar('campamento');
    let hadad, andy, nacho, charlaCamp;
    if (C) {
        hadad = nuevo('hadad', C.bx - 2.15, C.y, C.bz + 2, Math.PI / 2, 4100); // al borde del tronco, hacia la fogata
        nacho = nuevo('nacho', C.bx + 3.15, C.y, C.bz + 2, -Math.PI / 2, 4200);
        andy = nuevo('andy', C.bx + 1.3, C.y, C.bz + 3.6, Math.PI, 4300);
        sentadoEnTronco(hadad.p); sentadoEnTronco(nacho.p);
        andy.baile = 0; nacho.risa = 0;
        charlaCamp = crearCharla(CHARLAS.campamento, {
            alEvento: (ev) => { if (ev === 'baile') andy.baile = 3.2; if (ev === 'risa') nacho.risa = 2.4; }
        });
        for (const n of [hadad, nacho, andy]) n.charla = charlaCamp;
        grupos.push({ charla: charlaCamp, x: C.bx + 0.5, z: C.bz + 1.5, fuego: { x: C.bx + 0.5, y: C.y + 0.7, z: C.bz + 1.5 } });
    }
    function animarHadad(n, dt, t) {
        const { p } = n, habla = n.charla.hablando;
        if (habla === 'hadad') { // gesticula con la derecha
            ir(p.brazoD.rotation, 'x', -0.95 + Math.sin(t * 5) * 0.35, k(dt));
            ir(p.brazoD.rotation, 'z', 0.25 + Math.sin(t * 3.1) * 0.2, k(dt));
            ir(p.brazoI.rotation, 'x', -0.7 + Math.sin(t * 4 + 1) * 0.2, k(dt));
            ir(p.cuello.rotation, 'x', Math.sin(t * 6) * 0.08, k(dt));
            mirarA(n, jugador.pos.x, jugador.pos.z, dt, 0.6);
        } else { // escucha con las manos en las rodillas; de a ratos se acaricia la barba
            const barba = (t % 7) < 2.2;
            ir(p.brazoD.rotation, 'x', barba ? -1.55 + Math.sin(t * 5) * 0.1 : -0.75, k(dt, 5));
            ir(p.brazoD.rotation, 'z', barba ? 0.7 : 0.05, k(dt, 5));
            ir(p.brazoI.rotation, 'x', -0.75, k(dt, 5));
            const otro = habla === 'andy' ? andy : habla === 'nacho' ? nacho : null;
            if (otro) mirarA(n, otro.x, otro.z, dt, 1.2, -0.05); else mirarA(n, jugador.pos.x, jugador.pos.z, dt, 0.8);
        }
    }
    function animarNacho(n, dt, t) {
        const { p } = n, habla = n.charla.hablando;
        n.risa = Math.max(0, n.risa - dt);
        if (n.risa > 0) { // se ríe: hombros que saltan, cabeza atrás, manos a la guata
            p.cuerpo.position.y = 0.25 + Math.abs(Math.sin(t * 17)) * 0.05;
            ir(p.cuello.rotation, 'x', -0.35, k(dt));
            ir(p.brazoD.rotation, 'x', -0.55, k(dt)); ir(p.brazoI.rotation, 'x', -0.55, k(dt));
            ir(p.brazoD.rotation, 'z', 0.35, k(dt)); ir(p.brazoI.rotation, 'z', -0.35, k(dt));
            return;
        }
        p.cuerpo.position.y = 0.25;
        if (habla === 'nacho') {
            ir(p.brazoI.rotation, 'x', -1.0 + Math.sin(t * 5) * 0.3, k(dt));
            ir(p.brazoD.rotation, 'x', -1.25, k(dt));
            mirarA(n, jugador.pos.x, jugador.pos.z, dt, 0.6);
        } else { // se calienta las manos en la fogata, frotándolas
            ir(p.brazoD.rotation, 'x', -1.25, k(dt, 5)); ir(p.brazoI.rotation, 'x', -1.25, k(dt, 5));
            p.brazoD.rotation.z = 0.22 + Math.sin(t * 7) * 0.08;
            p.brazoI.rotation.z = -0.22 + Math.sin(t * 7) * 0.08;
            const otro = habla === 'andy' ? andy : habla === 'hadad' ? hadad : null;
            if (otro) mirarA(n, otro.x, otro.z, dt, 1.2); else ir(p.cuello.rotation, 'x', 0.15, k(dt, 3));
        }
    }
    function animarAndy(n, dt, t) {
        const { p } = n, habla = n.charla.hablando;
        n.baile = Math.max(0, n.baile - dt);
        if (n.baile > 0) { // baile de victoria: brazos arriba alternados, cadera y saltitos
            const b = Math.sin(t * 9);
            p.brazoD.rotation.x = -2.7 * Math.max(0, b) - 0.2; p.brazoI.rotation.x = -2.7 * Math.max(0, -b) - 0.2;
            p.brazoD.rotation.z = 0.2; p.brazoI.rotation.z = -0.2;
            p.cuerpo.rotation.z = b * 0.12;
            p.cuerpo.position.y = Math.abs(b) * 0.08;
            p.piernaD.rotation.x = b * 0.3; p.piernaI.rotation.x = -b * 0.3;
            ir(p.cuello.rotation, 'x', -0.15, k(dt));
            return;
        }
        p.cuerpo.position.y = 0;
        ir(p.cuerpo.rotation, 'z', Math.sin(t * 1.1) * 0.04, k(dt, 4)); // cambia el peso de pierna
        p.piernaD.rotation.x = p.piernaI.rotation.x = 0;
        if (habla === 'andy') {
            ir(p.brazoD.rotation, 'x', -0.9 + Math.sin(t * 6) * 0.4, k(dt)); ir(p.brazoI.rotation, 'x', -0.7 + Math.sin(t * 5 + 2) * 0.3, k(dt));
            ir(p.brazoD.rotation, 'z', 0.1, k(dt)); ir(p.brazoI.rotation, 'z', -0.1, k(dt));
            mirarA(n, jugador.pos.x, jugador.pos.z, dt, 0.8);
        } else { // manos en los bolsillos del polerón
            ir(p.brazoD.rotation, 'x', -0.35, k(dt, 5)); ir(p.brazoI.rotation, 'x', -0.35, k(dt, 5));
            ir(p.brazoD.rotation, 'z', 0.32, k(dt, 5)); ir(p.brazoI.rotation, 'z', -0.32, k(dt, 5));
            const otro = habla === 'hadad' ? hadad : habla === 'nacho' ? nacho : null;
            if (otro) mirarA(n, otro.x, otro.z, dt, 1.2, 0.1); else mirarA(n, jugador.pos.x, jugador.pos.z, dt, 0.8);
        }
    }

    // ---------------------------------------------------------
    // Iglú: Moisés (sentado) y Lalo (apoyado) fuman; de vez en cuando se pasan el bong y el pito
    // ---------------------------------------------------------
    const I = lugar('iglu');
    let moises, lalo, charlaIglu, bongO, pitoO, pase = null, proximoPase = rnd(18, 30);
    const POS_PITO = [0.02, -0.76, 0.1];
    if (I) {
        moises = nuevo('moises', I.bx - 0.6, I.y, I.bz + 1.4, 0, 4400);
        lalo = nuevo('lalo', I.bx + 1.6, I.y, I.bz + 0.6, 0, 4500);
        moises.yaw = Math.atan2(lalo.x - moises.x, lalo.z - moises.z) + 0.35;
        lalo.yaw = Math.atan2(moises.x - lalo.x, moises.z - lalo.z) - 0.35;
        moises.yawBase = moises.yaw; lalo.yawBase = lalo.yaw;
        sentadoEnSuelo(moises.p);
        // Dónde queda el bong cuando no lo usa: en el suelo (sentado) o en la mano izquierda (de pie)
        moises.reposoBong = [0.36, 0.6, 0.5];
        lalo.reposoBong = [0.3, 0.8, 0.3];
        // Bong de vidrio celeste con agua, cazoleta y boquilla
        const vidrio = tinte.caras(tex(4, 4, 4601, [170, 220, 236], 0.1), {}, { transparent: true, opacity: 0.5, depthWrite: false });
        const bong = new THREE.Group();
        const base = caja(0.22, 0.12, 0.22, vidrio); base.position.y = 0.06;
        const agua = caja(0.18, 0.1, 0.18, tinte.caras(tex(4, 4, 4602, [96, 150, 110], 0.1), {}, { transparent: true, opacity: 0.75 })); agua.position.y = 0.07;
        const tubo = caja(0.1, 0.5, 0.1, vidrio); tubo.position.y = 0.37;
        const boquilla = caja(0.12, 0.04, 0.12, vidrio); boquilla.position.y = 0.62;
        const tallo = caja(0.04, 0.16, 0.04, tinte.caras(tex(2, 4, 4603, [60, 60, 64]))); tallo.position.set(0, 0.16, 0.12); tallo.rotation.x = 0.8;
        const brasaBong = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.07), new THREE.MeshBasicMaterial({ color: 0x552200 }));
        brasaBong.position.set(0, 0.23, 0.2);
        bong.add(base, agua, tubo, boquilla, tallo, brasaBong);
        bongO = { g: bong, brasa: brasaBong, agua };
        // Pito armado, con brasa que se enciende al fumar
        const pito = new THREE.Group();
        const papel = caja(0.035, 0.035, 0.17, tinte.caras(tex(2, 4, 4701, [240, 236, 226], 0.06)));
        const brasaPito = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.03), new THREE.MeshBasicMaterial({ color: 0x993300 }));
        brasaPito.position.z = 0.1;
        pito.add(papel, brasaPito);
        pitoO = { g: pito, brasa: brasaPito };
        tomar(moises, 'bong'); tomar(lalo, 'pito');
        moises.ciclo = rnd(0, 6); lalo.ciclo = rnd(0, 5);
        for (const n of [moises, lalo]) { n.tose = 0; n.humito = 0; n.yia = 0; }
        // Lalo apoyado: el cuerpo un poco hacia atrás y una pierna cruzada
        lalo.p.cuerpo.rotation.x = -0.09;
        lalo.p.piernaI.rotation.z = -0.16; lalo.p.piernaD.rotation.z = 0.05;
        charlaIglu = crearCharla(CHARLAS.iglu, { radio: 8, alEvento: ev => {
            if (ev === 'tos') moises.tose = 1.4;
            if (ev === 'tosLalo') lalo.tose = 2.2;
            if (ev === 'yia') moises.yia = lalo.yia = 2.2; // gritan los dos a la vez con los brazos arriba
        } });
        moises.charla = lalo.charla = charlaIglu;
        grupos.push({ charla: charlaIglu, x: I.x, z: I.z });
    }
    // Deja el objeto en las manos (o junto) de n
    function tomar(n, objeto) {
        n.objeto = objeto;
        if (objeto === 'bong') { n.p.cuerpo.add(bongO.g); bongO.g.position.set(...n.reposoBong); bongO.g.rotation.set(0, 0, 0); }
        else { n.p.brazoD.add(pitoO.g); pitoO.g.position.set(...POS_PITO); pitoO.g.rotation.set(-0.6, 0, 0); }
    }
    const vTmp = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
    const fumando = n => (n.objeto === 'bong' ? n.ciclo < 8 : n.ciclo < 5.2); // en plena fumada: no se puede pasar

    // Fumar el bong: 0-1.2 lo sube · 1.2-3.6 aspira (burbujas) · 3.6-4.6 lo baja · 4.6-6 aguanta · 6-7.6 bota el humo
    function usarBong(n, dt, t, dJ) {
        const { p } = n, c = n.ciclo, r = n.reposoBong;
        const arriba = c < 1.2 ? suave(c / 1.2) : c < 3.6 ? 1 : c < 4.6 ? 1 - suave((c - 3.6) / 1) : 0;
        bongO.g.position.set(lerp(r[0], 0, arriba), lerp(r[1], 1.03, arriba), lerp(r[2], 0.36, arriba));
        bongO.g.rotation.x = lerp(0, -0.15, arriba);
        const reposo = n === moises ? -0.6 : -0.75;
        p.brazoD.rotation.x = lerp(reposo, -1.15, arriba); p.brazoD.rotation.z = lerp(0.05, 0.42, arriba);
        p.brazoI.rotation.x = lerp(reposo, -1.0, arriba); p.brazoI.rotation.z = lerp(-0.05, -0.4, arriba);
        const aspira = c >= 1.2 && c < 3.6;
        bongO.brasa.material.color.setHex(aspira && Math.sin(t * 20) > -0.5 ? 0xff7a1a : 0x552200);
        bongO.agua.position.y = 0.07 + (aspira ? Math.sin(t * 40) * 0.01 : 0);
        if (aspira && !n.burbujeo) { n.burbujeo = true; burbujas(dJ, 2.2); }
        if (!aspira) n.burbujeo = false;
        if (aspira && Math.random() < dt * 6) { p.g.updateMatrixWorld(true); bongO.g.localToWorld(vTmp.set(0, 0.6, 0)); emitir(vTmp.x, vTmp.y, vTmp.z, { s: 0.1, dur: 0.8, vy: 0.2 }); }
        return { aguanta: c >= 4.6 && c < 6, exhala: c >= 6 && c < 7.6, inicioExhala: c - dt < 6 && c >= 6 };
    }
    // Fumar el pito: 0-1 a la boca · 1-2.4 fuma · 2.4-3.2 lo baja · 3.4-5 bota el humo
    function usarPito(n, dt, t) {
        const { p } = n, c = n.ciclo;
        const sube = c < 1 ? suave(c) : c < 2.4 ? 1 : c < 3.2 ? 1 - suave((c - 2.4) / 0.8) : 0;
        p.brazoD.rotation.x = lerp(n === moises ? -0.6 : -0.4, -1.95, sube);
        p.brazoD.rotation.z = lerp(0.12, 0.62, sube);
        p.brazoI.rotation.x = n === moises ? -0.6 : -0.2; p.brazoI.rotation.z = -0.08;
        const fuma = c >= 1 && c < 2.4;
        pitoO.brasa.material.color.setHex(fuma ? 0xff5a10 : (Math.sin(t * 3) > 0 ? 0xaa3300 : 0x882200));
        return { aguanta: false, exhala: c >= 3.4 && c < 5, inicioExhala: c - dt < 3.4 && c >= 3.4 };
    }
    function animarFumador(n, dt, t, dJ) {
        const { p } = n, otro = n === moises ? lalo : moises;
        if (pase) return animarPase(n, dt, t);
        const T = n.objeto === 'bong' ? 14 : 9;
        n.ciclo = (n.ciclo + dt) % T;
        const e = n.objeto === 'bong' ? usarBong(n, dt, t, dJ) : usarPito(n, dt, t);
        n.yaw += angulo(n.yawBase - n.yaw) * k(dt, 3);
        // Cabeza: aguanta mirando arriba, bota el humo, mira al otro cuando habla o cabecea relajado
        if (e.aguanta) ir(p.cuello.rotation, 'x', -0.25, k(dt, 4));
        else if (e.exhala) {
            ir(p.cuello.rotation, 'x', -0.4, k(dt, 4));
            if (Math.random() < dt * 14) { const b = boca(n); emitir(b.x, b.y, b.z, { s: 0.22, dur: 2.6, vy: 0.35, vx: Math.sin(n.yaw) * 0.5, vz: Math.cos(n.yaw) * 0.5 }); }
            // Después de fumar a veces tosen; Lalo tose más fuerte y más seguido
            if (e.inicioExhala && Math.random() < (n === lalo ? 0.55 : 0.4)) n.tose = n === lalo ? 2.2 : 1.4;
        } else if (n.charla.hablando === otro.clave) mirarA(n, otro.x, otro.z, dt, 1, 0.08);
        else if (n === lalo) { ir(p.cuello.rotation, 'y', 0.2, k(dt, 3)); p.cuello.rotation.x = 0.08 + Math.sin(t * 2.2) * 0.07; }
        else ir(p.cuello.rotation, 'x', Math.sin(t * 0.9) * 0.1, k(dt, 3));
        if (n === lalo) p.cuerpo.rotation.z = Math.sin(t * 1.1) * 0.03;
        // Hilo de humo desde la brasa del pito
        if (n.objeto === 'pito') {
            n.humito -= dt;
            if (n.humito <= 0) {
                n.humito = 0.45;
                p.g.updateMatrixWorld(true);
                pitoO.brasa.getWorldPosition(vTmp);
                emitir(vTmp.x, vTmp.y + 0.03, vTmp.z, { s: 0.07, dur: 1.6, vy: 0.3, dispersion: 0.04 });
            }
        }
        // Tos: sacudones del torso (Lalo: más fuertes)
        const base = n === lalo ? -0.09 : 0;
        if (n.tose > 0) {
            if (n.tose === 1.4 || n.tose === 2.2) tos(dJ, n === lalo ? 2 : 1);
            n.tose = Math.max(0, n.tose - dt);
            p.cuerpo.rotation.x = base + Math.max(0, Math.sin(n.tose * (n === lalo ? 26 : 22))) * (n === lalo ? 0.38 : 0.22);
        } else p.cuerpo.rotation.x = base;
        // ¡YIAAAAAA!: brazos arriba sacudiéndose, cabeza atrás (Lalo además da un saltito)
        if (n.yia > 0) {
            n.yia = Math.max(0, n.yia - dt);
            const s = Math.sin(t * 18) * 0.15;
            p.brazoD.rotation.set(-2.85 + s, 0, -0.35); p.brazoI.rotation.set(-2.85 - s, 0, 0.35);
            p.cuello.rotation.x = -0.35;
            if (n === lalo) p.cuerpo.position.y = Math.abs(Math.sin(n.yia * 6)) * 0.25;
        } else if (n === lalo) p.cuerpo.position.y = 0;
    }
    // Pase: se giran el uno al otro, estiran el brazo y el bong y el pito cruzan por el aire
    function animarPase(n, dt) {
        const { p } = n, otro = n === moises ? lalo : moises;
        const u = Math.min(1, pase.t / pase.dur);
        n.yaw += angulo(Math.atan2(otro.x - n.x, otro.z - n.z) - n.yaw) * k(dt, 5);
        const estira = Math.sin(Math.min(1, u * 1.3) * Math.PI);
        ir(p.brazoD.rotation, 'x', -1.35 * Math.max(0.35, estira), k(dt, 10)); ir(p.brazoD.rotation, 'z', 0.1, k(dt, 10));
        ir(p.cuello.rotation, 'x', 0.15, k(dt, 5)); ir(p.cuello.rotation, 'y', 0, k(dt, 5));
    }
    function actualizarPase(dt) {
        if (!moises) return;
        if (!pase) {
            proximoPase -= dt;
            if (proximoPase > 0 || fumando(moises) || fumando(lalo) || moises.tose > 0 || lalo.tose > 0) return;
            // Empieza: los dos objetos quedan sueltos en el mundo y vuelan hacia el otro
            pase = { t: 0, dur: 1.8, de: { bong: moises.objeto === 'bong' ? moises : lalo, pito: moises.objeto === 'pito' ? moises : lalo } };
            for (const o of [bongO.g, pitoO.g]) { o.parent.updateMatrixWorld(true); scene.attach(o); }
            pase.desde = { bong: bongO.g.position.clone(), pito: pitoO.g.position.clone() };
            return;
        }
        pase.t += dt;
        const u = Math.min(1, Math.max(0, (pase.t - 0.45) / 0.9)); // primero estiran el brazo, después cruza
        for (const clave of ['bong', 'pito']) {
            const recibe = pase.de[clave] === moises ? lalo : moises;
            recibe.p.g.updateMatrixWorld(true);
            if (clave === 'bong') recibe.p.cuerpo.localToWorld(vA.set(...recibe.reposoBong));
            else recibe.p.brazoD.localToWorld(vA.set(...POS_PITO));
            const g = clave === 'bong' ? bongO.g : pitoO.g;
            vB.copy(pase.desde[clave]).lerp(vA, suave(u));
            g.position.copy(vB);
            g.position.y += Math.sin(u * Math.PI) * 0.35;
        }
        if (pase.t >= pase.dur) {
            const recibeBong = pase.de.bong === moises ? lalo : moises, recibePito = pase.de.pito === moises ? lalo : moises;
            tomar(recibeBong, 'bong'); tomar(recibePito, 'pito');
            recibeBong.ciclo = 0; recibePito.ciclo = 0; // el que recibe lo usa al tiro
            pase = null; proximoPase = rnd(25, 40);
        }
    }
    const animarMoises = animarFumador, animarLalo = animarFumador;

    // ---------------------------------------------------------
    // Atalaya: Boris corta leña y Lucho conversa a su lado
    // ---------------------------------------------------------
    const A = lugar('atalaya');
    let boris, lucho, charlaLena;
    const astillas = [];
    if (A) {
        const toconX = A.bx - 0.5, toconZ = A.bz + 5.5;
        boris = nuevo('boris', toconX, A.y, toconZ + 1.65, Math.PI, 4800);
        lucho = nuevo('lucho', A.bx + 2.3, A.y, A.bz + 6.5, 0, 4900);
        lucho.yaw = Math.atan2(boris.x - lucho.x, boris.z - lucho.z);
        // Hacha: mango de madera y hoja de metal, en las manos (sale del brazo derecho)
        const hacha = new THREE.Group();
        const mango = caja(0.06, 0.85, 0.06, tinte.caras(tex(2, 8, 4801, [120, 84, 48])));
        mango.position.y = -0.38;
        const hoja = caja(0.05, 0.24, 0.3, tinte.caras(texturaPixeles(4, 4, 4802, (x, y, r) => x === 3 ? [236, 236, 240] : ajustar([140, 144, 152], 0.9 + r() * 0.2))));
        hoja.position.set(0, -0.72, -0.13); // el filo mira hacia abajo al golpear
        hacha.add(mango, hoja);
        hacha.position.set(0.06, -0.7, 0.05);
        boris.p.brazoD.add(hacha);
        // Leño sobre el tocón y sus dos mitades
        const lenaTex = tinte.caras(texturaPixeles(8, 8, 4803, (x, y, r) => ajustar([118, 86, 52], 0.85 + r() * 0.25)), { 2: texturaPixeles(8, 8, 4804, (x, y, r) => Math.hypot(x - 3.5, y - 3.5) % 2 < 1 ? [200, 164, 112] : [176, 140, 92]) });
        const leno = caja(0.36, 0.42, 0.36, lenaTex);
        leno.position.set(toconX, A.y + 1.21, toconZ);
        scene.add(leno);
        const mitades = [-1, 1].map(l => { const m = caja(0.18, 0.42, 0.36, lenaTex); m.visible = false; scene.add(m); return { m, l }; });
        for (let j = 0; j < 6; j++) { const m = caja(0.08, 0.05, 0.12, lenaTex); m.visible = false; scene.add(m); astillas.push({ m, vida: 0, v: new THREE.Vector3() }); }
        boris.leno = leno; boris.mitades = mitades; boris.tocon = { x: toconX, y: A.y + 1, z: toconZ };
        boris.ciclo = 0; boris.golpes = 0; boris.partido = 0;
        lucho.rasca = rnd(4, 8);
        charlaLena = crearCharla(CHARLAS.lenera, { radio: 10 });
        boris.charla = lucho.charla = charlaLena;
        grupos.push({ charla: charlaLena, x: toconX + 1, z: toconZ + 1 });
    }
    function animarBoris(n, dt, t, dJ) {
        const { p } = n;
        const T = 2.6;
        const antes = n.ciclo;
        n.ciclo = (n.ciclo + dt) % T;
        const u = n.ciclo / T;
        // Levanta el hacha sobre la cabeza, la deja caer con todo y vuelve a la guardia
        let ang, incl;
        if (u < 0.42) { const a = suave(u / 0.42); ang = lerp(-0.55, -3.0, a); incl = lerp(0, -0.12, a); }
        else if (u < 0.5) { const a = (u - 0.42) / 0.08; ang = lerp(-3.0, -1.35, a * a); incl = lerp(-0.12, 0.15, a); }
        else if (u < 0.62) { ang = -1.35; incl = 0.15; } // la hoja queda sobre el leño
        else { const a = suave((u - 0.62) / 0.38); ang = lerp(-1.35, -0.55, a); incl = lerp(0.15, 0, a); }
        p.brazoD.rotation.x = ang; p.brazoI.rotation.x = ang;
        p.brazoD.rotation.z = 0.32; p.brazoI.rotation.z = -0.32;
        p.cuerpo.rotation.x = incl;
        ir(p.cuello.rotation, 'x', n.charla.hablando === 'boris' ? -0.1 : 0.25, k(dt, 4));
        ir(p.cuello.rotation, 'y', n.charla.hablando === 'lucho' ? -0.7 : 0, k(dt, 4));
        // Impacto
        if (antes / T < 0.5 && u >= 0.5 && !n.partido) {
            hachazo(dJ);
            n.golpes++;
            for (let j = 0; j < 3; j++) { // astillas
                const a = astillas[(n.golpes * 3 + j) % astillas.length];
                a.vida = 0.8; a.m.visible = true;
                a.m.position.set(n.tocon.x, n.tocon.y + 0.45, n.tocon.z);
                a.v.set(rnd(-1.6, 1.6), rnd(1.5, 3), rnd(-1.6, 1.6));
            }
            n.leno.position.y = n.tocon.y + 0.18; // se hunde un poco con el golpe
            if (n.golpes % 3 === 0) { n.partido = 1.4; n.leno.visible = false; for (const h of n.mitades) { h.m.visible = true; h.m.position.set(n.tocon.x + h.l * 0.09, n.tocon.y + 0.21, n.tocon.z); h.m.rotation.set(0, 0, 0); } }
        }
        n.leno.position.y += (n.tocon.y + 0.21 - n.leno.position.y) * k(dt, 10);
        // El leño partido: las mitades caen a los lados y aparece uno nuevo
        if (n.partido > 0) {
            n.partido -= dt;
            const a = Math.min(1, (1.4 - n.partido) / 0.4);
            for (const h of n.mitades) {
                h.m.position.x = n.tocon.x + h.l * (0.09 + a * 0.55);
                h.m.position.y = n.tocon.y + 0.21 + Math.sin(a * Math.PI) * 0.3 - a * 0.85;
                h.m.rotation.z = -h.l * a * 1.4;
            }
            if (n.partido <= 0) { for (const h of n.mitades) h.m.visible = false; n.leno.visible = true; n.partido = 0; }
        }
    }
    function animarLucho(n, dt, t) {
        const { p } = n, habla = n.charla.hablando;
        p.cuerpo.rotation.x = -0.07; // apoyado en la leña
        n.rasca -= dt;
        if (habla === 'lucho') { // descruza los brazos y gesticula
            ir(p.brazoD.rotation, 'x', -0.8 + Math.sin(t * 5) * 0.35, k(dt)); ir(p.brazoD.rotation, 'z', 0.2, k(dt));
            ir(p.brazoI.rotation, 'x', -0.6 + Math.sin(t * 4 + 1) * 0.25, k(dt)); ir(p.brazoI.rotation, 'z', -0.2, k(dt));
            mirarA(n, boris.x, boris.z, dt, 1);
        } else if (n.rasca < 0 && n.rasca > -1.6) { // se rasca la cabeza
            ir(p.brazoD.rotation, 'x', -2.85 + Math.sin(t * 14) * 0.08, k(dt)); ir(p.brazoD.rotation, 'z', 0.42, k(dt));
            ir(p.brazoI.rotation, 'x', -1.2, k(dt, 5)); ir(p.brazoI.rotation, 'z', -0.9, k(dt, 5));
            ir(p.cuello.rotation, 'x', 0.15, k(dt, 4));
        } else { // brazos cruzados
            if (n.rasca <= -1.6) n.rasca = rnd(5, 10);
            ir(p.brazoD.rotation, 'x', -1.2, k(dt, 5)); ir(p.brazoD.rotation, 'z', 0.9, k(dt, 5));
            ir(p.brazoI.rotation, 'x', -1.05, k(dt, 5)); ir(p.brazoI.rotation, 'z', -0.9, k(dt, 5));
            if (habla === 'boris') mirarA(n, boris.x, boris.z, dt, 1); else mirarA(n, jugador.pos.x, jugador.pos.z, dt, 0.8);
        }
    }

    // ---------------------------------------------------------
    // Naufragio: Braulio pasea por la orilla
    // ---------------------------------------------------------
    const N = lugar('naufragio');
    let braulio;
    if (N) {
        braulio = nuevo('braulio', N.x + 4, 0, N.z + 4, 0, 5000);
        braulio.estado = 'espera'; braulio.reloj = 1; braulio.ruta = null; braulio.cargado = false;
        // Hacia dónde está el mar (promedio de las columnas con agua alrededor)
        let mx = 0, mz = 0;
        for (let dz = -16; dz <= 16; dz += 2) for (let dx = -16; dx <= 16; dx += 2) {
            const o = Math.floor(N.z + dz) * terreno.BW + Math.floor(N.x + dx);
            if (terreno.HT[o] < NIVEL_AGUA) { mx += dx; mz += dz; }
        }
        braulio.mar = Math.atan2(mx, mz);
    }
    // Como suelo(), pero también vale la arena a ras del agua (la orilla del naufragio) si no hay agua encima
    const sueloArena = (x, z) => {
        const y = suelo(terreno, mundo, x, z, { estructuras: true });
        if (y !== null) return y;
        const { BW, BD, HT, ES } = terreno;
        const bx = Math.floor(x), bz = Math.floor(z);
        if (bx < 1 || bz < 1 || bx >= BW - 1 || bz >= BD - 1) return null;
        const o = bz * BW + bx;
        if (ES[o] === 1 || HT[o] < NIVEL_AGUA) return null;
        const arriba = mundo.bloque(x, HT[o] + 1.5, z), piso = mundo.bloque(x, HT[o] + 0.5, z);
        return arriba === 0 && piso > 0 && piso !== 6 ? HT[o] + 1 : null; // 6 = agua
    };
    function animarBraulio(n, dt, t) {
        const { p } = n;
        if (!n.cargado) {
            for (let j = 0; j < 20 && !n.cargado; j++) {
                const y = sueloArena(n.x, n.z);
                if (y === undefined) return false;
                if (y) { n.y = y; n.cargado = true; }
                else { n.x = N.x + rnd(-18, 18); n.z = N.z + rnd(-18, 18); }
            }
            if (!n.cargado) return false;
        }
        n.reloj -= dt;
        let mueve = false;
        const reset = () => {
            p.cuerpo.rotation.x = 0;
            ir(p.brazoD.rotation, 'z', 0, k(dt, 6)); ir(p.brazoI.rotation, 'z', 0, k(dt, 6));
        };
        if (n.estado === 'camina') {
            const dx = n.ruta.x - n.x, dz = n.ruta.z - n.z, d = Math.hypot(dx, dz);
            if (d < 0.3 || n.reloj <= 0) { n.estado = 'espera'; n.reloj = 0.5; }
            else {
                const paso = Math.min(d, 1.3 * dt);
                const nx = n.x + dx / d * paso, nz = n.z + dz / d * paso;
                const ny = sueloArena(nx, nz);
                if (!ny || Math.abs(ny - n.y) > 1.2) { n.estado = 'espera'; n.reloj = 0.5; }
                else { n.x = nx; n.z = nz; n.y += (ny - n.y) * k(dt, 10); n.yaw += angulo(Math.atan2(dx, dz) - n.yaw) * k(dt, 7); mueve = true; }
            }
            reset();
        } else if (n.estado === 'mira') { // mira el mar con la mano de visera
            n.yaw += angulo(n.mar - n.yaw) * k(dt, 3);
            ir(p.brazoD.rotation, 'x', -2.55, k(dt, 6)); ir(p.brazoD.rotation, 'z', 0.5, k(dt, 6));
            ir(p.brazoI.rotation, 'x', 0, k(dt, 6));
            p.cuello.rotation.y = Math.sin(t * 0.6) * 0.5; p.cuello.rotation.x = -0.05;
        } else if (n.estado === 'estira') { // se estira con los brazos arriba
            const a = Math.sin(Math.min(1, (2.6 - n.reloj) / 2.6) * Math.PI);
            p.brazoD.rotation.x = p.brazoI.rotation.x = -3.0 * a;
            p.brazoD.rotation.z = -0.25 * a; p.brazoI.rotation.z = 0.25 * a;
            p.cuerpo.rotation.x = -0.14 * a; p.cuello.rotation.x = -0.3 * a;
        } else if (n.estado === 'dedo') { // se mira la mano (el dedo doble)
            ir(p.brazoI.rotation, 'x', -1.45, k(dt, 6)); ir(p.brazoI.rotation, 'z', -0.35, k(dt, 6));
            ir(p.cuello.rotation, 'x', 0.4, k(dt, 5)); ir(p.cuello.rotation, 'y', 0.35, k(dt, 5));
            p.brazoI.rotation.y = Math.sin(t * 3) * 0.2;
        } else reset();
        if (n.reloj <= 0 && n.estado !== 'camina') {
            p.brazoI.rotation.y = 0;
            const q = Math.random();
            if (q < 0.45) {
                for (let j = 0; j < 10; j++) {
                    const x = N.x + rnd(-16, 16), z = N.z + rnd(-16, 16);
                    if (sueloArena(x, z)) { n.ruta = { x, z }; n.estado = 'camina'; n.reloj = 12; break; }
                }
                if (n.estado !== 'camina') { n.estado = 'espera'; n.reloj = 1; }
            } else if (q < 0.7) { n.estado = 'mira'; n.reloj = rnd(3, 5); }
            else if (q < 0.85) { n.estado = 'estira'; n.reloj = 2.6; }
            else { n.estado = 'dedo'; n.reloj = 3; if (n.cerca) { n.frase = FRASES.braulio[1]; n.cambioFrase = 6; } }
        }
        n.fase += mueve ? dt * 7 : 0;
        if (n.estado === 'camina') caminar(p, n.fase, 0.6);
        else { ir(p.piernaD.rotation, 'x', 0, k(dt)); ir(p.piernaI.rotation, 'x', 0, k(dt)); }
        return true;
    }

    // ---------------------------------------------------------
    // Conejeros: frente al escenario, escuchando a Salonas
    // ---------------------------------------------------------
    const E = terreno.escenario;
    let conejeros;
    if (E && npcs && npcs.bajo) {
        const s = Math.sin(E.yaw), c = Math.cos(E.yaw);
        conejeros = nuevo('conejeros', E.x + s * 6.2 + c * 1.6, 0, E.z + c * 6.2 - s * 1.6, E.yaw + Math.PI, 5100);
        conejeros.cargado = false; conejeros.salto = 0; conejeros.riff = null;
    }
    function animarConejeros(n, dt, t, dJ) {
        const { p } = n, bajo = npcs.bajo;
        if (!n.cargado) {
            const y = sueloArena(n.x, n.z);
            if (!y) return false;
            n.y = y; n.cargado = true;
        }
        const musica = bajo.sonando;
        const pulso = musica ? bajo.pulso : 0;
        const golpe = Math.pow(Math.sin(pulso * Math.PI), 3);
        // Salta cuando cambia el riff
        if (musica && n.riff !== null && bajo.riff !== n.riff) n.salto = 0.6;
        n.riff = musica ? bajo.riff : null;
        n.salto = Math.max(0, n.salto - dt);
        const conversa = dJ < 5;
        if (musica) {
            const f = conversa ? 0.3 : 1;
            p.cuello.rotation.x = 0.05 + golpe * 0.55 * f; // cabecea al pulso real del bajo
            // Bajo invisible: la izquierda en el mástil, la derecha golpea
            ir(p.brazoI.rotation, 'x', -1.05, k(dt)); ir(p.brazoI.rotation, 'z', -0.55, k(dt));
            p.brazoD.rotation.x = -0.6 - golpe * 0.4; p.brazoD.rotation.z = 0.3;
            p.piernaD.rotation.x = -golpe * 0.15;
        } else { // sin música: brazos cruzados esperando
            ir(p.brazoD.rotation, 'x', -1.2, k(dt, 5)); ir(p.brazoD.rotation, 'z', 0.9, k(dt, 5));
            ir(p.brazoI.rotation, 'x', -1.05, k(dt, 5)); ir(p.brazoI.rotation, 'z', -0.9, k(dt, 5));
            ir(p.cuello.rotation, 'x', 0, k(dt, 4));
        }
        if (n.salto > 0) { p.brazoD.rotation.x = p.brazoI.rotation.x = -2.9; p.brazoI.rotation.z = -0.2; }
        p.cuerpo.position.y = n.salto > 0 ? Math.sin((n.salto / 0.6) * Math.PI) * 0.55 : (musica ? golpe * 0.04 : 0);
        if (conversa) mirarA(n, jugador.pos.x, jugador.pos.z, dt, 1.1, p.cuello.rotation.x);
        else ir(p.cuello.rotation, 'y', 0, k(dt, 3));
        return true;
    }

    // ---------------------------------------------------------
    // Bucle
    // ---------------------------------------------------------
    for (const g of grupos) g.charla.setIdioma(idioma);
    const ANIMAR = { hadad: animarHadad, nacho: animarNacho, andy: animarAndy, moises: animarMoises, lalo: animarLalo, boris: animarBoris, lucho: animarLucho, braulio: animarBraulio, conejeros: animarConejeros };
    let tiempo = 0;
    return {
        lista,
        actualizar(dt, oculto = false) {
            tiempo += dt;
            dt = Math.min(dt, 0.05);
            tinte.aplicar(materiales.solido.color);
            for (const g of grupos) g.charla.actualizar(oculto ? 0 : dt, oculto ? 999 : Math.hypot(g.x - jugador.pos.x, g.z - jugador.pos.z));
            actualizarPase(dt);
            // Humo de la fogata del campamento
            const fg = grupos.find(g => g.fuego);
            if (fg && !oculto && Math.hypot(fg.x - jugador.pos.x, fg.z - jugador.pos.z) < 80 && Math.random() < dt * 4) {
                emitir(fg.fuego.x, fg.fuego.y, fg.fuego.z, { s: 0.3, dur: 3, vy: 0.9, color: 0xb8b8b8 });
            }
            for (const n of lista) {
                n.t += dt;
                const dJ = Math.hypot(n.x - jugador.pos.x, n.z - jugador.pos.z);
                let visible = !oculto && dJ < RADIO_VISIBLE;
                if (visible) visible = ANIMAR[n.clave](n, dt, tiempo, dJ) !== false;
                n.p.g.visible = visible;
                if (n.clave === 'boris') { n.leno.visible = visible && !n.partido; if (!visible) for (const h of n.mitades) h.m.visible = false; }
                if (!visible) { n.nombre.ocultar(); n.globo.actualizar(dt, false, n.x, n.y, n.z); continue; }
                n.p.g.position.set(n.x, n.y, n.z);
                n.p.g.rotation.y = n.yaw;
                // Globo: la conversación del grupo o sus frases sueltas al acercarse
                let texto = '';
                if (n.charla) texto = n.charla.texto(n.clave);
                else {
                    const cerca = dJ < 6;
                    if (cerca && (!n.cerca || (n.cambioFrase -= dt) <= 0)) {
                        const f = FRASES[n.clave];
                        let nueva;
                        do nueva = f[Math.floor(Math.random() * f.length)]; while (f.length > 1 && nueva === n.frase);
                        n.frase = nueva; n.cambioFrase = 7;
                    }
                    n.cerca = cerca;
                    texto = cerca && n.frase ? n.frase[idioma] : '';
                }
                if (texto) n.globo.decir(texto);
                const alto = 2.15 * n.escala;
                // Bajo un techo bajo (el iglú) el globo baja para quedar dentro de la pieza
                let yGlobo = n.y + alto + 0.6;
                if (texto) for (let dy = 2; dy <= 4; dy++) { const b = mundo.bloque(n.x, n.y + dy + 0.5, n.z); if (b > 0 && b !== 6) { yGlobo = Math.min(yGlobo, n.y + dy - 0.5); break; } }
                n.globo.actualizar(dt, !!texto && dJ < 16 && seVe(mundo, jugador.camara, n.x, n.y + alto * 0.8, n.z), n.x, yGlobo, n.z);
                n.nombre.actualizar(dt, jugador.camara, mundo, !texto, n.x, n.y + alto + 0.2, n.z, n.x, n.y + 1.2 * n.escala, n.z);
            }
            // Astillas
            for (const a of astillas) {
                if (!a.m.visible) continue;
                a.vida -= dt;
                if (a.vida <= 0 || oculto) { a.m.visible = false; continue; }
                a.v.y -= 12 * dt;
                a.m.position.addScaledVector(a.v, dt);
                a.m.rotation.x += dt * 9; a.m.rotation.z += dt * 7;
            }
            actualizarHumo(dt, oculto);
        },
        setIdioma(i) {
            idioma = i;
            for (const g of grupos) g.charla.setIdioma(i);
        },
        forzarPase() { proximoPase = 0; } // depuración: que Moisés y Lalo se pasen el bong y el pito
    };
}
