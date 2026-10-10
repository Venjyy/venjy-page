// =========================================================
// VENJY · Supervivencia · Escenas de amistad (bloque 6b)
// main.js lo carga con import() la primera vez que se usa (un botón de la pestaña «Hablar»): no suma
// nada a la carga inicial.
// · Animaciones genéricas por nivel (escena-amistad-datos.js), las mismas para los 13 personajes, cada uno
//   con su frase única: choque de puños (Amigo), abrazo (Buen amigo), saludo secreto + frase especial
//   (Íntimo) y, entre Venjy y Lona, abrazo y beso en la mejilla (pareja).
// · Es una escena corta de cine, como las de skin (escenas-skin.js): el jugador queda quieto a la distancia
//   justa del amigo para que las manos se toquen, la cámara usa los planos de dos personajes y los globos
//   llevan pestaña con el nombre y marco de color, sin colita. Se salta con Esc o «Saltar» y al terminar
//   (o al saltar) se restaura todo: pose, yaw, cámara, marcas de misión y el jugador.
// · Momentos especiales (6b-2): al llegar a 100 de amistad, momento(clave) carga con import() la escena única
//   del personaje (momentos/<clave>.js) y la corre con este mismo motor. Un guion propio puede traer
//   actores extra (otro amigo cercano), frases del jugador, gestos propios, giros (`yaw`), objetos y efectos.
// Guion: { T, r, lineas: [{ q, texto, a, d }], pista: { n, j, <extra>: [[gesto, desde, hasta]] }, gestos,
//   actores: { <q>: clave }, yaw: { <q>: t => radianes }, golpes, corazones, extra: { iniciar, cuadro, terminar } }
//   (q = 'n' el amigo, 'j' el jugador o la clave de un actor extra).
// Depuración: __venjy.amistadEscena (jugar(clave, tipo), momento(clave), pausar(v), irA(s), saltar(), escena).
// Para revisarlas en el juego: /amistad (comandos-dev.js, con /gamemode devenjy).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO, B } from '../texturas.js';
import { crearGlobo, COLOR_GLOBO } from '../criaturas/cuerpo.js';
import { GESTOS } from './escenas-skin.js';
import { ANIMACIONES, GESTOS_AMISTAD, FRASES_AMISTAD, TXT_AMISTAD } from './escena-amistad-datos.js';
import { NOMBRES_AMIGO } from './misiones-datos.js';
import { sonidos } from './sonidos.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const envolvente = (t, a, b, r) => suave(Math.min(tramo(t, a, a + r), 1 - tramo(t, b - r, b)));

// Huesos que mueve la escena (nombres cortos de la skill); pz = cuerpo.position.z (un paso adelante)
const CAMPOS = ['cx', 'cy', 'cz', 'bDx', 'bDz', 'bIx', 'bIz', 'pDx', 'pIx', 'inc', 'rz', 'y', 'pz'];
const NEUTRAL = { cx: 0, cy: 0, cz: 0, bDx: 0, bDz: 0.05, bIx: 0, bIz: -0.05, pDx: 0, pIx: 0, inc: 0, rz: 0, y: 0, pz: 0 };

// Planos propios (camaras.js, opción `planos`): los de dos personajes sin los de sobre el hombro, que con los dos tan
// cerca dejaban la cabeza del jugador tapando las manos y los objetos. ang 0 = detrás del jugador; dist desde el punto medio.
const PLANOS_AMISTAD = [
    { nombre: 'de lado', ang: Math.PI / 2, dist: 3.6, alto: 1.75, orbita: 0.1, dolly: -0.4 },
    { nombre: 'tres cuartos, lado del jugador', ang: 0.85, dist: 4.0, alto: 1.9, orbita: 0.08, dolly: -0.3 },
    { nombre: 'de lado, otro lado', ang: -Math.PI / 2, dist: 3.6, alto: 1.7, orbita: -0.1, dolly: -0.4 },
    { nombre: 'tres cuartos, lado del amigo', ang: Math.PI - 0.85, dist: 4.0, alto: 1.9, orbita: -0.08, dolly: -0.3 },
    { nombre: 'general', ang: -1.15, dist: 5.6, alto: 2.5, orbita: 0.14, dolly: -0.6 }
];

// Texturas píxel a píxel de los efectos (corazón como el de ganado.js y una chispa de cuatro puntas)
function texturaPixeles(filas, colores) {
    const c = document.createElement('canvas'); c.width = filas[0].length; c.height = filas.length;
    const x = c.getContext('2d');
    filas.forEach((f, y) => { for (let i = 0; i < f.length; i++) if (colores[f[i]]) { x.fillStyle = colores[f[i]]; x.fillRect(i, y, 1, 1); } });
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

export function crearEscenaAmistad(ctx) {
    const { grupo, dy, mundo, jugador, camara, camaras, misiones, personaDe, bloquear, liberar } = ctx;
    let idioma = ctx.idioma || 'es';
    const L = o => (o ? o[idioma] || o.es : '');
    const tx = () => TXT_AMISTAD[idioma] || TXT_AMISTAD.es;

    // ---- Botón «Saltar» (también táctil) y Esc ----
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton saltar-amistad';
    boton.textContent = tx().saltar;
    boton.addEventListener('click', ev => { ev.preventDefault(); saltar(); });
    document.body.appendChild(boton);
    document.addEventListener('keydown', ev => { if (e && ev.code === 'Escape' && !ev.repeat) { ev.preventDefault(); saltar(); } });

    // ---- Globos con pestaña de nombre y color, sin colita (uno por persona: la clave del amigo o 'j') ----
    const globos = new Map();
    const claveDe = q => (q === 'j' ? 'j' : (e && e.actores[q] ? e.actores[q].clave : q));
    function globoDe(q) {
        const quien = claveDe(q);
        if (!globos.has(quien)) globos.set(quien, crearGlobo(grupo, { nombre: quien === 'j' ? tx().tu : NOMBRES_AMIGO[quien] || quien, color: COLOR_GLOBO[quien] || COLOR_GLOBO.j }));
        return globos.get(quien);
    }

    // ---- Efectos: corazones (pareja) y chispas (choques) en sprites píxel ----
    const TEX = {
        corazon: texturaPixeles(['.kk...kk.', 'kaak.kaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '..kaaak..', '...kak...', '....k....'], { k: '#3a0008', a: '#e82040' }),
        chispa: texturaPixeles(['...a...', '...b...', '..aba..', 'abbbbba', '..aba..', '...b...', '...a...'], { a: '#ffd84a', b: '#fffbe0' })
    };
    const efectos = [];
    function efecto(tipo, x, y, z, op = {}) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX[tipo], transparent: true, depthWrite: false }));
        const tam = op.tam ?? (tipo === 'corazon' ? 0.32 : 0.28);
        s.scale.set(tam, tam, 1);
        s.position.set(x, y, z);
        grupo.add(s);
        efectos.push({ s, t: 0, vida: op.vida ?? (tipo === 'corazon' ? 1.6 : 0.45), vy: op.vy ?? (tipo === 'corazon' ? 0.45 : 0), tam, crece: tipo === 'chispa' });
    }
    function actualizarEfectos(dt) {
        for (let i = efectos.length - 1; i >= 0; i--) {
            const f = efectos[i];
            f.t += dt;
            const u = f.t / f.vida;
            f.s.position.y += f.vy * dt;
            f.s.material.opacity = 1 - tramo(u, 0.6, 1);
            if (f.crece) { const k = f.tam * (0.6 + Math.sin(Math.min(1, u) * Math.PI) * 0.8); f.s.scale.set(k, k, 1); }
            if (u >= 1) { grupo.remove(f.s); f.s.material.dispose(); efectos.splice(i, 1); }
        }
    }

    // ---- Bloques que tapan / pisables ----
    const opaco = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };
    const solido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && TIPO[id] === 1; };
    function libre(ax, ay, az, bx, by, bz) {
        const n = Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) * 3);
        for (let i = 1; i < n; i++) { const k = i / n; if (opaco(ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k)) return false; }
        return true;
    }
    // Dónde se para el jugador: a r exactos del amigo (sin redondear al bloque: el contacto depende de eso),
    // empezando por el ángulo ang0, con suelo, aire para el cuerpo (esquinas incluidas) y sin otras personas
    function lugarExacto(n, r, ang0, otros) {
        const piso = Math.round((n.y ?? 0) + dy);
        // Aire para el cuerpo, sin agua ni lava (en la orilla quedaba dentro del agua y se ahogaba durante el momento)
        const liquido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id === B.AGUA || id === B.LAVA; };
        const aire = (x, y, z) => [-0.3, 0.3].every(ex => [-0.3, 0.3].every(ez => !opaco(x + ex, y, z + ez) && !liquido(x + ex, y, z + ez)));
        // Primero a la misma altura que el amigo (todas las direcciones) y solo después un bloque más arriba o abajo
        for (const y of [piso, piso + 1, piso - 1]) for (let i = 0; i < 32; i++) {
            const ang = ang0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.2;
            const x = n.x + Math.sin(ang) * r, z = n.z + Math.cos(ang) * r;
            if (otros.some(o => o !== n && Math.hypot(o.x - x, o.z - z) < 0.8)) continue;
            if (solido(x, y - 0.5, z) && aire(x, y + 0.5, z) && aire(x, y + 1.5, z) && libre(x, y + 1.6, z, n.x, piso + 1.5, n.z)) return { x, y, z };
        }
        return null;
    }

    // ---- Actores ----
    function leer(p) {
        return {
            cx: p.cuello.rotation.x, cy: p.cuello.rotation.y, cz: p.cuello.rotation.z, bDx: p.brazoD.rotation.x, bDz: p.brazoD.rotation.z, bIx: p.brazoI.rotation.x, bIz: p.brazoI.rotation.z,
            pDx: p.piernaD.rotation.x, pIx: p.piernaI.rotation.x, inc: p.cuerpo.rotation.x, rz: p.cuerpo.rotation.z, y: p.cuerpo.position.y, pz: p.cuerpo.position.z
        };
    }
    function escribir(p, v) {
        p.cuello.rotation.x = v.cx; p.cuello.rotation.y = v.cy; p.cuello.rotation.z = v.cz;
        p.brazoD.rotation.x = v.bDx; p.brazoD.rotation.z = v.bDz; p.brazoI.rotation.x = v.bIx; p.brazoI.rotation.z = v.bIz;
        p.piernaD.rotation.x = v.pDx; p.piernaI.rotation.x = v.pIx;
        p.cuerpo.rotation.x = v.inc; p.cuerpo.rotation.z = v.rz; p.cuerpo.position.y = v.y; p.cuerpo.position.z = v.pz;
    }
    const esc = n => n.escala || 1;
    function actorAmigo(clave, n, q = 'n') {
        const foto = leer(n.p);
        // Sentado (Hadad y Nacho en su tronco, Moisés en el suelo, Pony en el muelle): se pone de pie para el saludo
        // (la mezcla de la entrada lo levanta y la salida lo vuelve a sentar). Del tronco da un paso adelante.
        const levanta = foto.pDx < -0.4;
        const adelante = levanta && foto.y > 0 ? 0.4 : 0;
        // De pie: piernas rectas y, si tenía un brazo en alto (saludo, hachazo), lo baja
        const neutral = { ...foto, cz: 0, rz: 0, pz: adelante, pDx: 0, pIx: 0, y: 0, inc: lim(foto.inc, -0.1, 0.1) };
        if (levanta) { neutral.bDx = 0; neutral.bDz = 0.05; neutral.bIx = 0; neutral.bIz = -0.05; neutral.cx = 0; }
        if (Math.abs(foto.bDx) > 1.3) { neutral.bDx = 0; neutral.bDz = 0.05; }
        if (Math.abs(foto.bIx) > 1.3) { neutral.bIx = 0; neutral.bIz = -0.05; }
        return { q, clave, n, p: n.p, foto, neutral, cur: { ...neutral }, sentado: false, levanta, adelante, giro: 1, yaw0: n.yaw, alto: 2.15 * esc(n) };
    }
    const actorJugador = () => ({ q: 'j', clave: 'j', p: camaras.cuerpo, neutral: { ...NEUTRAL }, cur: { ...NEUTRAL }, sentado: false, alto: 2.15, jugador: true });
    const pos = a => (a.jugador ? { x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z } : { x: a.n.x, y: (a.n.y ?? 0) + dy, z: a.n.z });

    // ---------------------------------------------------------
    // Escena
    // ---------------------------------------------------------
    let e = null, pausada = false;

    // Guion de una animación genérica: su tiempo, sus pistas y la frase única del personaje
    function guionGenerico(clave, tipo) {
        const a = ANIMACIONES[tipo], f = FRASES_AMISTAD[clave] && FRASES_AMISTAD[clave][tipo];
        if (!a || !f) return null;
        return { ...a, tipo, lineas: [{ q: 'n', texto: f, a: a.linea[0], d: a.linea[1] }] };
    }

    function iniciar(clave, guion) {
        if (e || !guion) return false;
        const n = personaDe(clave);
        if (!n || n.escena) return false; // otra escena (skin, minijuego) lo tiene
        bloquear();
        const A = actorAmigo(clave, n), J = actorJugador();
        // El jugador se para a la distancia del contacto: frente al amigo si estaba sentado (se levanta hacia adelante),
        // si no, por el lado donde ya estaba. Si el amigo da un paso al pararse, el jugador queda ese paso más allá.
        const r = guion.r + A.adelante;
        const ang0 = A.levanta ? n.yaw : Math.atan2(jugador.pos.x - n.x, jugador.pos.z - n.z);
        const l = lugarExacto(n, r, ang0, ctx.personas ? ctx.personas() : []);
        if (l) jugador.colocar(l.x, l.y, l.z);
        jugador.yaw = Math.atan2(n.x - jugador.pos.x, n.z - jugador.pos.z) - Math.PI;
        jugador.pitch = 0;
        e = { clave, guion, t: 0, T: guion.T, actores: { n: A, j: J }, lineas: guion.lineas || [], hechos: new Set(), ultimaLinea: null, callados: [], props: [], prestados: [] };
        n.escena = (dt, base) => animarAmigo(A, dt, base);
        // Actores extra del guion (otro amigo de al lado): se quedan en su sitio y siguen su pista
        for (const [q, c] of Object.entries(guion.actores || {})) {
            const m = personaDe(c);
            if (!m || m === n || m.escena) continue;
            const X = actorAmigo(c, m, q);
            e.actores[q] = X;
            m.escena = (dt, base) => animarAmigo(X, dt, base);
        }
        const extras = Object.values(e.actores).filter(a => a.n && a !== A).map(a => a.n);
        // Quien esté cerca (Lucho junto a Boris, la fogata) cuenta en `visibles`: la cámara no lo deja tapando a los dos
        const cerca = (ctx.personas ? ctx.personas() : []).filter(o => o !== n && !extras.includes(o) && o.p && o.p.g.visible && Math.hypot(o.x - n.x, o.z - n.z) < 5);
        // Al aire libre, planos propios y la cámara lejos de todos; bajo techo (el iglú) no hay espacio para eso:
        // ahí van los planos de las escenas de skin, que ya están probados dentro del iglú
        const piso = (n.y ?? 0) + dy, techo = [2, 3, 4].some(k => opaco(n.x, piso + k + 0.5, n.z));
        const cam = techo ? {} : { planos: PLANOS_AMISTAD, minDist: 1.8, evitarDist: 2.4, holgura: 0.7 };
        camaras.iniciarCine(n, { escena: true, ...cam, esperarLinea: true, fundido: 0.45, validarTexto, evitar: [n, ...extras, ...cerca], visibles: [n, ...extras, ...cerca] });
        // Los de al lado siguen con lo suyo, pero callados (con `n.escena` se apagan su globo y su charla)
        // (hasta 30 bloques: los globos y las charlas se ven de lejos, como el clon de Venjy cerca de la atalaya)
        const aCallar = (ctx.personas ? ctx.personas() : []).filter(o => o !== n && !extras.includes(o) && o.p && Math.hypot(o.x - n.x, o.z - n.z) < 30);
        const callados = aCallar.filter(o => !o.escena).map(o => { const h = (dt, base) => base(); o.escena = h; return [o, h]; });
        e.callados = callados;
        camaras.pose = (c, dt) => { if (e) aplicar(e.actores.j, dt); };
        misiones.ocultarMarcas = true;
        document.body.classList.add('en-amistad');
        const aviso = document.querySelector('.clic-seguir'); // «Haz clic para seguir jugando» no va encima de la escena
        if (aviso) aviso.hidden = true;
        if (guion.extra && guion.extra.iniciar) guion.extra.iniciar(api());
        return true;
    }

    function terminar() {
        if (!e) return;
        const x = e; e = null;
        if (x.guion.extra && x.guion.extra.terminar) x.guion.extra.terminar(api(x));
        for (const A of Object.values(x.actores)) {
            if (!A.n) continue;
            if (A.n.escena) delete A.n.escena;
            A.n.yaw = A.yaw0;
            escribir(A.p, A.foto);
        }
        escribir(camaras.cuerpo, NEUTRAL);
        // Objetos del guion: los propios se borran y los prestados (el sombrero de Lalo) vuelven a su dueño
        for (const o of x.props) { if (o.parent) o.parent.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }
        for (const { o, padre, pos, rot, esc } of x.prestados.reverse()) { padre.add(o); o.position.copy(pos); o.rotation.copy(rot); o.scale.copy(esc); }
        for (const [o, h] of x.callados) if (o.escena === h) delete o.escena;
        for (const f of efectos.splice(0)) { grupo.remove(f.s); f.s.material.dispose(); }
        camaras.terminarCine();
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-amistad');
        liberar();
        if (x.alTerminar) x.alTerminar();
    }
    function saltar() { if (e) terminar(); }

    // ---- Pose: neutral → gesto de la pista (peso con rampas) → suavizado → mezcla con la animación base ----
    function gestoDe(a) {
        const pista = (e.guion.pista && e.guion.pista[a.q]) || [];
        for (const [g, desde, hasta] of pista) if (e.t >= desde && e.t < hasta) return { g, u: (e.t - desde) / (hasta - desde), w: envolvente(e.t, desde, hasta, Math.min(0.3, (hasta - desde) / 3)) };
        return null;
    }
    // A quién mira cada uno: a quien habla (si es otro); si nadie habla, el amigo y el jugador se miran y los extras miran al amigo
    function miraA(a) {
        const ls = lineasAhora(), l = ls[ls.length - 1];
        const habla = l && e.actores[l.q];
        if (habla && habla !== a) return habla;
        return a.jugador ? e.actores.n : a.q === 'n' ? e.actores.j : e.actores.n;
    }
    function metaDe(g, a) {
        const otro = a.jugador ? e.actores.n : e.actores.j;
        const info = { s: a.sentado, otroS: otro.sentado, j: !!a.jugador, esc: esc(e.actores.n.n) };
        const f = (e.guion.gestos && e.guion.gestos[g.g]) || GESTOS_AMISTAD[g.g];
        if (f) return f(g.u, e.t, info);
        return GESTOS[g.g] ? GESTOS[g.g](g.u, e.t, a.sentado, !!a.jugador) : {};
    }
    const vMeta = {};
    function aplicar(a, dt) {
        const wS = suave(Math.min(tramo(e.t, 0, 0.5), 1 - tramo(e.t, e.T - 0.7, e.T)));
        const g = gestoDe(a);
        const meta = g ? metaDe(g, a) : {};
        const w = g ? g.w : 0;
        // Mirada: a la cabeza del otro
        const otro = miraA(a);
        const yo = pos(a), m = pos(otro);
        const yaw = a.jugador ? jugador.yaw + Math.PI : a.n.yaw;
        const d = Math.hypot(m.x - yo.x, m.z - yo.z) || 1;
        const cy = lim(angulo(Math.atan2(m.x - yo.x, m.z - yo.z) - yaw), -1.1, 1.1);
        const cx = lim(-Math.atan2(m.y + 1.6 * (otro.jugador ? 1 : esc(otro.n)) - (yo.y + 1.6 * (a.jugador ? 1 : esc(a.n))), d), -0.45, 0.45);
        for (const k of CAMPOS) {
            let obj = k === 'cx' ? cx : a.neutral[k];
            if (meta[k] !== undefined && k !== 'cy') obj = k === 'pz' ? obj + meta[k] * w : lerp(obj, meta[k], w); // el paso se suma al de pararse
            vMeta[k] = obj;
        }
        vMeta.cy = cy + (meta.cy || 0) * w;
        const r = Math.min(1, dt * (e.guion.rapidez || 11));
        for (const k of CAMPOS) a.cur[k] += (vMeta[k] - a.cur[k]) * r;
        const ahora = leer(a.p), fin = {};
        for (const k of CAMPOS) fin[k] = lerp(ahora[k], a.cur[k], wS);
        fin.y += (meta.salto || 0) * w * wS;
        escribir(a.p, fin);
        return wS;
    }
    function animarAmigo(a, dt, base) {
        if (!e) return base();
        const r = base(0); // la animación normal queda congelada: la escena lo mueve
        const wS = aplicar(a, dt);
        const J = jugador.pos, giro = e.guion.yaw && e.guion.yaw[a.q];
        a.n.yaw = a.yaw0 + (angulo(Math.atan2(J.x - a.n.x, J.z - a.n.z) - a.yaw0) * a.giro + (giro ? giro(e.t) : 0)) * wS;
        return r;
    }

    // ---- Puntos de los huesos (efectos en el contacto) ----
    const vA = new THREE.Vector3(), vB = new THREE.Vector3();
    function punta(a, lado, v) { a.p.g.updateMatrixWorld(true); return grupo.worldToLocal((lado === 'I' ? a.p.brazoI : a.p.brazoD).localToWorld(v.set(0, -0.75, 0))); }
    // Golpe: sonido y chispa entre las dos manos derechas (o donde diga el guion)
    function golpe(donde) {
        const A = e.actores.n, J = e.actores.j;
        const p = donde || punta(A, 'D', vA).lerp(punta(J, 'D', vB), 0.5);
        if (!p) return;
        efecto('chispa', p.x, p.y, p.z);
        sonidos.golpe();
    }
    // Corazones: sobre las cabezas, en medio de los dos
    function corazones() {
        const A = pos(e.actores.n), J = pos(e.actores.j);
        const x = (A.x + J.x) / 2, z = (A.z + J.z) / 2, y = Math.max(A.y + e.actores.n.alto, J.y + 2.15) - dy + 0.2;
        for (let i = 0; i < 3; i++) efecto('corazon', x + (i - 1) * 0.3, y + i * 0.12, z, { vida: 1.6 + i * 0.2 });
    }
    // ---- Objetos de los momentos especiales (se borran o se devuelven al terminar) ----
    const HUESOS = ['brazoD', 'brazoI', 'cabeza', 'cuello', 'cuerpo', 'torso', 'piernaD', 'piernaI'];
    const huesoDe = (q, h) => { const a = e.actores[q]; return a && HUESOS.includes(h) ? a.p[h] : null; };
    // Caja de color liso (o una textura píxel con `filas` y `colores`); sin luz propia, como las partículas
    function caja(w, h, d, color, op = {}) {
        const mat = op.filas ? new THREE.MeshBasicMaterial({ map: texturaPixeles(op.filas, op.colores), transparent: !!op.transparente })
            : new THREE.MeshBasicMaterial({ color, transparent: op.alfa !== undefined, opacity: op.alfa ?? 1 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        e.props.push(m);
        return m;
    }
    function sprite(filas, colores, tam = 0.4) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaPixeles(filas, colores), transparent: true, depthWrite: false }));
        s.scale.set(tam, tam, 1);
        e.props.push(s);
        return s;
    }
    // Pega un objeto a un hueso de un actor (q: 'n', 'j' o un extra) o, sin hueso, al grupo del mapa (coordenadas del creativo)
    function pegar(o, q, hueso, posL = [0, 0, 0], rot = [0, 0, 0]) {
        const padre = q ? huesoDe(q, hueso) : grupo;
        if (!padre) return o;
        padre.add(o); o.position.set(...posL); o.rotation.set(...rot);
        return o;
    }
    // Lo deja en el mundo donde está ahora (para lanzarlo o soltarlo)
    function soltar(o) { if (o.parent) { o.parent.updateMatrixWorld(true); grupo.attach(o); } return o; }
    // Toma prestado algo que ya existe (el sombrero de Lalo) y lo pega a otro hueso; al terminar vuelve tal cual
    function prestar(o, q, hueso, posL, rot) {
        if (!e.prestados.some(x => x.o === o)) e.prestados.push({ o, padre: o.parent, pos: o.position.clone(), rot: o.rotation.clone(), esc: o.scale.clone() });
        return pegar(o, q, hueso, posL, rot);
    }
    // Pies de un actor en coordenadas del grupo (las de los objetos sueltos)
    const posG = q => { const a = e.actores[q]; if (!a) return null; const p = pos(a); return { x: p.x, y: p.y - dy, z: p.z }; };
    // Lo que reciben los extras de un guion propio (momentos especiales)
    const api = (x = e) => ({ e: x, grupo, dy, jugador, camaras, mundo, efecto, golpe, corazones, globoDe, personaDe, punta, pos, posG, caja, sprite, pegar, soltar, prestar,
        actor: q => x.actores[q], L, sonidos, THREE, suave, lim, lerp, tramo, envolvente });

    // ---- Globos (con encaje: esquivan cabezas, el botón «Saltar» y las franjas) ----
    function zonas() {
        const out = [];
        if (!e) return out;
        for (const a of Object.values(e.actores)) {
            const p = pos(a), y = p.y - dy;
            out.push({ quien: a.clave, tipo: 'cabeza', x: p.x, y: y + a.alto * 0.85, z: p.z, r: 0.35 });
            out.push({ quien: a.clave, tipo: 'pecho', x: p.x, y: y + a.alto * 0.6, z: p.z, r: 0.32 });
        }
        return out;
    }
    function anclaGlobo(quien) {
        const a = e.actores[quien] || e.actores.n;
        const p = pos(a);
        let y = p.y + a.alto + 0.6;
        for (let k = 2; k <= 4; k++) if (opaco(p.x, p.y + k + 0.5, p.z)) { y = Math.min(y, p.y + k - 0.5); break; } // bajo techo (el iglú)
        const o = pos(a.jugador ? e.actores.n : e.actores.j);
        return [lerp(p.x, o.x, 0.2), y - dy, lerp(p.z, o.z, 0.2)];
    }
    const lineasAhora = () => e.lineas.filter(l => e.t >= l.a && e.t < l.a + l.d);
    const focoDe = l => (!l ? 0.5 : l.q === 'j' ? 0.68 : l.q === 'n' ? 0.32 : 0.5);
    const camPrueba = new THREE.PerspectiveCamera();
    function validarTexto(posCam, objetivo, objetivoDe) {
        if (!e) return 0;
        camPrueba.fov = camara.fov; camPrueba.aspect = camara.aspect;
        camPrueba.position.copy(posCam);
        grupo.updateWorldMatrix(true, false);
        const prox = e.lineas.find(l => l.a > e.t), zs = zonas();
        let peor = 0;
        for (const l of prox ? [...lineasAhora(), prox] : lineasAhora()) {
            camPrueba.lookAt(objetivoDe ? objetivoDe(focoDe(l)) : objetivo); camPrueba.updateMatrixWorld(true);
            const [x, y, z] = anclaGlobo(l.q);
            peor = Math.max(peor, globoDe(l.q).probar(camPrueba, x, y, z, zs).solape);
        }
        return peor;
    }
    function actualizarGlobos(dt) {
        const activos = new Map(); // clave de la persona -> línea
        if (e) for (const l of lineasAhora()) { globoDe(l.q); activos.set(claveDe(l.q), l); }
        for (const [quien, g] of globos) {
            const l = activos.get(quien);
            if (!l) { g.actualizar(dt, false, 0, 0, 0); continue; }
            g.decir(L(l.texto));
            const [x, y, z] = anclaGlobo(l.q);
            g.actualizar(dt, true, x, y, z, camara, zonas);
        }
    }

    // ---------------------------------------------------------
    // Bucle (main.js, después de escenas.actualizar)
    // ---------------------------------------------------------
    function actualizar(dt) {
        if (e) {
            const t0 = e.t;
            if (!pausada) e.t += dt;
            const x = e;
            const ls = lineasAhora(), l = ls[ls.length - 1];
            if (l && l !== x.ultimaLinea) { x.ultimaLinea = l; camaras.nuevaLinea(); }
            camaras.enfocar(focoDe(l));
            // Golpes y corazones del guion (una vez cada uno; irA hacia atrás los vuelve a permitir)
            for (const s of x.guion.golpes || []) if (x.t >= s && t0 < s + 0.3 && !x.hechos.has('g' + s)) { x.hechos.add('g' + s); golpe(); }
            for (const s of x.guion.corazones || []) if (x.t >= s && t0 < s + 0.3 && !x.hechos.has('c' + s)) { x.hechos.add('c' + s); corazones(); }
            if (x.guion.extra && x.guion.extra.cuadro) x.guion.extra.cuadro(api(x), pausada ? 0 : dt);
            const giroJ = x.guion.yaw && x.guion.yaw.j, wS = suave(Math.min(tramo(x.t, 0, 0.5), 1 - tramo(x.t, x.T - 0.7, x.T)));
            jugador.yaw = Math.atan2(x.actores.n.n.x - jugador.pos.x, x.actores.n.n.z - jugador.pos.z) - Math.PI + (giroJ ? giroJ(x.t) * wS : 0);
            if (x.t >= x.T) terminar();
        }
        actualizarEfectos(dt);
        actualizarGlobos(dt);
    }

    return {
        actualizar, saltar, iniciar,
        // Una animación genérica (punos, abrazo, secreto, pareja) con la frase del personaje
        jugar(clave, tipo, alTerminar) {
            const ok = iniciar(clave, guionGenerico(clave, tipo));
            if (ok && alTerminar) e.alTerminar = alTerminar;
            return ok;
        },
        // Momento especial (6b-2): carga momentos/<clave>.js la primera vez y lo corre; devuelve una promesa con true si empezó
        // op.base fuerza la base de la skin (el /amistad de desarrollo muestra la variante de pareja sin cambiar de skin)
        momento(clave, alTerminar, op = {}) {
            if (e) return Promise.resolve(false);
            return import(`./momentos/${clave}.js`).then(m => {
                const base = op.base !== undefined ? op.base : ctx.base ? ctx.base() : null;
                const ok = iniciar(clave, { ...m.momento({ base, idioma }), tipo: 'momento' });
                if (ok && alTerminar) e.alTerminar = alTerminar;
                return ok;
            }).catch(err => { console.error('No se pudo cargar el momento especial', err); return false; });
        },
        get activa() { return !!e; },
        get escena() { return e && { clave: e.clave, tipo: e.guion.tipo || null, t: e.t, T: e.T }; },
        setIdioma(l) { idioma = l; boton.textContent = tx().saltar; for (const [q, g] of globos) if (q === 'j') g.etiqueta = { nombre: tx().tu, color: COLOR_GLOBO.j }; },
        // Depuración (capturas)
        pausar(v = true) { pausada = v; },
        irA(s) { if (e) { e.t = s; e.hechos.clear(); } },
        get actores() { return e && e.actores; }
    };
}
