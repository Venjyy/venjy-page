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
// · Bienvenidas y reencuentros (6c-1): bienvenida(base) carga bienvenidas/<base>.js (el Venjy del Inicio recibe a
//   tu skin) y reencuentro(base, clave) carga reencuentros.js (dos amigos con relación 2 o 3). Los dispara
//   escenas-skin.js (sola al acercarte, una por lugar, o con clic derecho) por medio de main.js.
// · Escenas de grupo (6c-2): grupo(nombre, base) carga grupos/<nombre>.js (Tomatitos en la fogata, trío de la atalaya,
//   los de Coyhaique en el iglú) con la variante de tu skin. El guion trae `ancla` (el amigo 'n'), `centro(api)` (todos lo
//   miran y la cámara gira en torno a él), `colocar(api)` (dónde se para el jugador) y frases de 'todos' (un globo para el
//   grupo). api.girar(q, yaw) fija hacia dónde mira alguien (el que camina) y api.camara(f) pone un plano manual (el salto).
// Guion: { T, r, lineas: [{ q, texto, a, d }], pista: { n, j, <extra>: [[gesto, desde, hasta]] }, gestos,
//   actores: { <q>: clave | { clave, radio } }, reparto: { <personaje>: q }, yaw: { <q>: t => radianes }, golpes,
//   corazones, extra: { iniciar, cuadro, terminar } }
//   (q = 'n' el amigo, 'j' el jugador o la clave de un actor extra). Con `reparto` las frases, pistas y giros pueden
//   ir por personaje ('pony', 'andy'): la misma escena sirve en las dos direcciones. Un actor con `radio` es
//   opcional (tu clon: solo actúa si está a menos de `radio` bloques); sus pistas se ignoran si no está.
//   api.mover(q, x, y, z) mueve a un actor (coordenadas del grupo) y al terminar o saltar vuelve a su sitio.
// Estudio, fase 5: las animaciones genéricas salen de ANIMACIONES fusionadas con mundo/datos/escenas.json; jugarGuion(clave,
//   persona) juega una escena de tipo «guion» del JSON (/amistad guion <clave> [persona]).
// Etapa B3b (estudio/DISENO.md §40): momento, bienvenida, reencuentro y grupo buscan primero en escenas.json una escena con
//   su `dispara` (la más específica gana) y, si no hay, cargan el JS de siempre. Las escenas del JSON traen reparto
//   automático (personas como q), opciones del tramo (reloj, escala, espejo), `lugar`, `giros`, `caminos`, `objetos`,
//   `efectos` y `sonidos` de un catálogo cerrado y, para lo único, `codigo` (CODIGO_ESCENAS de codigo-escenas.js). Las
//   piezas puras están en datos/escenas.js; mundo/tests/escenas-motor.mjs prueba la paridad con Lalo y Lona.
// Depuración: __venjy.amistadEscena (jugar(clave, tipo), jugarGuion(clave, persona), momento(clave), bienvenida(base), reencuentro(base, clave),
//   pausar(v), irA(s), saltar(), escena).
// Para revisarlas en el juego: /amistad (comandos-dev.js, con /gamemode devenjy).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO, B } from '../texturas.js';
import { crearGlobo, COLOR_GLOBO } from '../criaturas/cuerpo.js';
import { GESTOS } from './escenas-skin.js';
import { ANIMACIONES, GESTOS_AMISTAD, FRASES_AMISTAD, TXT_AMISTAD, PLANOS_AMISTAD, PLANOS_GRUPO, PLANOS_GRUPO_TECHO } from './escena-amistad-datos.js';
import { NOMBRES_AMIGO } from './misiones-datos.js';
import { sonidos } from './sonidos.js';
import { PERSONAJES, relacion, GRUPOS } from './amistad.js';
import { cargarDatos, fusionar } from '../datos/cargador.js';
import { animacionDeDatos, guionDeDatos, opcionesCamara, escenaQueDispara, amigoDeEscena, repartoDe, repartirGuion, tramoEn, metaTramo, claveEn, caminoEn, objetoEn,
    eventosEn, sonidosDeEscena, sitioEn } from '../datos/escenas.js';
import { CODIGO_ESCENAS } from './codigo-escenas.js';

// Estudio, fase 5: mundo/datos/escenas.json (escenas «amistad» reemplazan a ANIMACIONES por clave; las de «guion» solo
// se juegan con jugarGuion). Se pide al importar este módulo, que ya se carga solo al usarlo: la carga inicial no cambia.
// Sin archivo, roto o con ?sin-datos: el código. aplicarDatosVivos lo cambia sin recargar (puente del Estudio).
let datosEscenas = await cargarDatos('escenas');
export function aplicarDatosVivos(nuevo) { datosEscenas = nuevo || null; }
const defDatos = clave => { const d = datosEscenas && datosEscenas.escenas && datosEscenas.escenas[clave]; return d && typeof d === 'object' ? d : null; };

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
const envolvente = (t, a, b, r) => suave(Math.min(tramo(t, a, a + r), 1 - tramo(t, b - r, b)));

// Huesos que mueve la escena (nombres cortos de la skill); pz = cuerpo.position.z (un paso adelante)
const CAMPOS = ['cx', 'cy', 'cz', 'bDx', 'bDz', 'bIx', 'bIz', 'pDx', 'pIx', 'inc', 'rz', 'y', 'pz'];
const NEUTRAL = { cx: 0, cy: 0, cz: 0, bDx: 0, bDz: 0.05, bIx: 0, bIz: -0.05, pDx: 0, pIx: 0, inc: 0, rz: 0, y: 0, pz: 0 };

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
    const claveDe = q => (q === 'j' || q === 'todos' ? q : (e && e.actores[q] ? e.actores[q].clave : q));
    // 'venjy@atalaya' (otro Venjy del mapa) se llama y se pinta como Venjy; 'todos' (6c-2) es un globo para el grupo
    function globoDe(q) {
        const quien = claveDe(q), base = quien.split('@')[0];
        if (!globos.has(quien)) globos.set(quien, crearGlobo(grupo, { nombre: quien === 'j' ? tx().tu : quien === 'todos' ? tx().todos : NOMBRES_AMIGO[base] || base, color: COLOR_GLOBO[base] || COLOR_GLOBO.j }));
        return globos.get(quien);
    }

    // ---- Efectos: corazones (pareja) y chispas (choques) en sprites píxel ----
    const TEX = {
        corazon: texturaPixeles(['.kk...kk.', 'kaak.kaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '..kaaak..', '...kak...', '....k....'], { k: '#3a0008', a: '#e82040' }),
        chispa: texturaPixeles(['...a...', '...b...', '..aba..', 'abbbbba', '..aba..', '...b...', '...a...'], { a: '#ffd84a', b: '#fffbe0' }),
        // B3b: humo (una nube gris que sube y crece) y nieve (un copo que cae), para los `efectos` de escenas.json
        humo: texturaPixeles(['..aaa...', '.abbbaa.', 'abbbbbba', 'abbbbbba', '.abbbba.', '..aaaa..'], { a: '#8a8a8a', b: '#c8c8c8' }),
        nieve: texturaPixeles(['.a.a.', 'a.b.a', '.bbb.', 'a.b.a', '.a.a.'], { a: '#dfeaf5', b: '#ffffff' })
    };
    // Lo que no dice el guion, por tipo: tamaño, vida (s), velocidad hacia arriba y si crece
    const EFECTO_BASE = { corazon: [0.32, 1.6, 0.45, false], chispa: [0.28, 0.45, 0, true], humo: [0.36, 1.4, 0.5, true], nieve: [0.14, 2.0, -0.35, false] };
    const efectos = [];
    // tipo: 'corazon', 'chispa' o un dibujo { filas, colores } (moldes.js, PIX); la textura se guarda para la próxima vez
    const texPix = new Map();
    const texDe = tipo => {
        if (typeof tipo === 'string') return TEX[tipo];
        if (!texPix.has(tipo)) texPix.set(tipo, texturaPixeles(tipo.filas, tipo.colores));
        return texPix.get(tipo);
    };
    function efecto(tipo, x, y, z, op = {}) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texDe(tipo), transparent: true, depthWrite: false }));
        const [tam0, vida, vy, crece] = EFECTO_BASE[tipo] || [0.28, 0.45, 0, false]; // un dibujo de PIX: como antes
        const tam = op.tam ?? tam0;
        s.scale.set(tam, tam, 1);
        s.position.set(x, y, z);
        grupo.add(s);
        efectos.push({ s, t: 0, vida: op.vida ?? vida, vy: op.vy ?? vy, tam, crece: op.crece ?? crece });
        return s;
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
        // Primero a la misma altura que el amigo (todas las direcciones) y solo después un bloque más arriba o abajo.
        // Con gente al lado (la fogata, el iglú), entre los sitios posibles gana el más lejos de los demás: así la
        // cámara, que gira alrededor de los dos, no deja a un tercero en primer plano.
        const vecinos = otros.filter(o => o !== n && Math.hypot(o.x - n.x, o.z - n.z) < 6);
        for (const y of [piso, piso + 1, piso - 1]) {
            let mejor = null, puntos = -Infinity;
            for (let i = 0; i < 32; i++) {
                const ang = ang0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.2;
                const x = n.x + Math.sin(ang) * r, z = n.z + Math.cos(ang) * r;
                if (otros.some(o => o !== n && Math.hypot(o.x - x, o.z - z) < 0.8)) continue;
                if (!(solido(x, y - 0.5, z) && aire(x, y + 0.5, z) && aire(x, y + 1.5, z) && libre(x, y + 1.6, z, n.x, piso + 1.5, n.z))) continue;
                if (!vecinos.length) return { x, y, z };
                const lejos = Math.min(3, ...vecinos.map(o => Math.hypot(o.x - x, o.z - z)));
                const p = lejos - Math.ceil(i / 2) * 0.04;
                if (p > puntos) { puntos = p; mejor = { x, y, z }; }
            }
            if (mejor) return mejor;
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
        return { q, clave, n, p: n.p, foto, neutral, cur: { ...neutral }, sentado: false, levanta, adelante, giro: 1, yaw0: n.yaw, alto: 2.15 * esc(n), yawMeta: null };
    }
    const actorJugador = () => ({ q: 'j', clave: 'j', p: camaras.cuerpo, neutral: { ...NEUTRAL }, cur: { ...NEUTRAL }, sentado: false, alto: 2.15, jugador: true, yawMeta: null });
    const pos = a => (a.jugador ? { x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z } : { x: a.n.x, y: (a.n.y ?? 0) + dy, z: a.n.z });

    // ---------------------------------------------------------
    // Escena
    // ---------------------------------------------------------
    let e = null, pausada = false;

    // Guion de una animación genérica: su tiempo, sus pistas y la frase única del personaje
    function guionGenerico(clave, tipo) {
        const d = defDatos(tipo);
        // Una fila de actor del JSON reemplaza la fila entera de pista (fusionar reemplaza los arreglos); la que falta queda la del código
        const base = ANIMACIONES[tipo];
        const a = base && d && d.tipo === 'amistad' ? fusionar(base, animacionDeDatos(d)) : base, f = FRASES_AMISTAD[clave] && FRASES_AMISTAD[clave][tipo];
        if (!a || !f) return null;
        // `camara` de escenas.json (PR 5c): animacionDeDatos la quita para que la fusión con ANIMACIONES siga exacta, aquí se agrega
        const camara = base && d && d.tipo === 'amistad' && d.camara ? { camara: d.camara } : {};
        return { ...a, ...camara, tipo, lineas: [{ q: 'n', texto: f, a: a.linea[0], d: a.linea[1] }] };
    }

    function iniciar(clave, guion) {
        if (e || !guion) return false;
        guion = repartirGuion(guion); // con guion.reparto ({ pony: 'j', andy: 'n' }) cada persona pasa a su papel (B3b: también giros, caminos, objetos, efectos y lugar)
        const n = personaDe(clave);
        if (!n || n.escena) return false; // otra escena (skin, minijuego) lo tiene
        bloquear();
        const A = actorAmigo(clave, n), J = actorJugador();
        // El jugador se para a la distancia del contacto: frente al amigo si estaba sentado (se levanta hacia adelante),
        // si no, por el lado donde ya estaba. Si el amigo da un paso al pararse, el jugador queda ese paso más allá.
        // Una escena de grupo (guion.colocar) elige ella el lugar del jugador, más abajo.
        if (!guion.colocar && !(guion.lugar && guion.lugar.jugador)) {
            const r = guion.r + A.adelante;
            const ang0 = A.levanta ? n.yaw : Math.atan2(jugador.pos.x - n.x, jugador.pos.z - n.z);
            const l = lugarExacto(n, r, ang0, ctx.personas ? ctx.personas() : []);
            if (l) jugador.colocar(l.x, l.y, l.z);
        }
        jugador.yaw = Math.atan2(n.x - jugador.pos.x, n.z - jugador.pos.z) - Math.PI;
        jugador.pitch = 0;
        e = { clave, guion, t: 0, T: guion.T, actores: { n: A, j: J }, lineas: guion.lineas || [], hechos: new Set(), ultimaLinea: null, callados: [], props: [], prestados: [],
            jugador0: { x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z } };
        n.escena = (dt, base) => animarAmigo(A, dt, base);
        // Actores extra del guion (otro amigo de al lado, tu clon): se quedan en su sitio y siguen su pista.
        // Con `radio`, el actor es opcional: solo entra si está cerca del amigo (tu clon en la fogata, el iglú...)
        for (const [q, def] of Object.entries(guion.actores || {})) {
            const c = typeof def === 'string' ? def : def.clave;
            const m = personaDe(c);
            if (!m || m === n || m.escena) continue;
            if (def.radio && (!m.p || !m.p.g.visible || Math.hypot(m.x - n.x, m.z - n.z) > def.radio || Math.abs((m.y ?? 0) - (n.y ?? 0)) > 4)) continue;
            const X = actorAmigo(c, m, q);
            e.actores[q] = X;
            m.escena = (dt, base) => animarAmigo(X, dt, base);
        }
        e.lineas = e.lineas.filter(l => e.actores[l.q] || l.q === 'todos'); // las de un actor opcional que no vino no salen
        const extras = Object.values(e.actores).filter(a => a.n && a !== A).map(a => a.n);
        // Escena de grupo (6c-2): el centro del grupo (todos lo miran y la cámara gira en torno a él) y el lugar del jugador
        if (guion.centro) e.centro = guion.centro(api());
        if (guion.colocar) {
            const l = guion.colocar(api());
            if (l) jugador.colocar(l.x, (l.y ?? jugador.pos.y - dy) + dy, l.z);
            e.jugador0 = { x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z };
        }
        // B3b: `lugar` de escenas.json, relativo al sitio de alguien (sin coordenadas fijas del mapa)
        if (guion.lugar && guion.lugar.centro) e.centro = sitioDe(guion.lugar.centro);
        if (guion.lugar && guion.lugar.jugador) {
            const l = sitioDe(guion.lugar.jugador);
            if (l) jugador.colocar(l.x, l.y + dy, l.z);
            e.jugador0 = { x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z };
        }
        if (guion.objetos) crearObjetos();
        if (e.centro) jugador.yaw = Math.atan2(e.centro.x - jugador.pos.x, e.centro.z - jugador.pos.z) - Math.PI;
        // Quien esté cerca (Lucho junto a Boris, la fogata) cuenta en `visibles`: la cámara no lo deja tapando a los dos
        const cerca = (ctx.personas ? ctx.personas() : []).filter(o => o !== n && !extras.includes(o) && o.p && o.p.g.visible && Math.hypot(o.x - n.x, o.z - n.z) < 5);
        // Al aire libre, planos propios y la cámara lejos de todos; bajo techo (el iglú) no hay espacio para eso:
        // ahí van los planos de las escenas de skin, que ya están probados dentro del iglú
        const piso = (n.y ?? 0) + dy, techo = [2, 3, 4].some(k => opaco(n.x, piso + k + 0.5, n.z));
        let cam = techo ? { sinTerceros: true } : { planos: PLANOS_AMISTAD, minDist: 1.8, evitarDist: 2.4, holgura: 0.7, sinTerceros: true };
        // En grupo hay siempre alguien más cerca de la cámara que el centro: sin la regla de terceros, planos más abiertos
        if (e.centro) cam = { planos: techo ? PLANOS_GRUPO_TECHO : PLANOS_GRUPO, minDist: techo ? 1 : 1.6, evitarDist: techo ? 1.2 : 2.0, holgura: techo ? 0 : 0.5, centro: centroCamara };
        // Estudio, fase 5c: la `camara` de escenas.json (nombre de un juego de planos o lista propia) manda sobre lo de arriba
        const propia = guion.camara ? opcionesCamara(guion.camara) : null;
        if (propia) { cam = propia; if (e.centro) { delete cam.sinTerceros; cam.centro = centroCamara; } }
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
            if (A.orig) { A.n.x = A.orig.x; A.n.y = A.orig.y; A.n.z = A.orig.z; }
            A.n.yaw = A.yaw0;
            escribir(A.p, A.foto);
        }
        escribir(camaras.cuerpo, NEUTRAL);
        // El jugador que se movió en la escena (baile, auto) vuelve a donde quedó al empezar
        if (x.jugadorMovido) jugador.colocar(x.jugador0.x, x.jugador0.y, x.jugador0.z);
        // Objetos del guion: los propios se borran y los prestados (el sombrero de Lalo) vuelven a su dueño
        for (const o of x.props) { if (o.parent) o.parent.remove(o); if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }
        for (const { o, padre, pos, rot, esc } of x.prestados.reverse()) { padre.add(o); o.position.copy(pos); o.rotation.copy(rot); o.scale.copy(esc); }
        for (const [o, h] of x.callados) if (o.escena === h) delete o.escena;
        for (const f of efectos.splice(0)) { grupo.remove(f.s); f.s.material.dispose(); }
        camaras.manual = null; // el plano manual de una escena de grupo (el salto de la atalaya, el iglú)
        camaras.terminarCine();
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-amistad');
        liberar();
        if (x.alTerminar) x.alTerminar();
    }
    function saltar() { if (e) terminar(); }

    // ---- Pose: neutral → gesto de la pista (peso con rampas) → suavizado → mezcla con la animación base ----
    // El tramo de la pista que corre ahora (tramoEn de datos/escenas.js: { g, u, w, op })
    const gestoDe = a => tramoEn(e.guion.pista && e.guion.pista[a.q], e.t);
    // A quién mira cada uno: a quien habla (si es otro); si nadie habla, el amigo y el jugador se miran y los extras miran al amigo
    function miraA(a) {
        const ls = lineasAhora(), l = ls[ls.length - 1];
        const habla = l && e.actores[l.q];
        if (habla && habla !== a) return habla;
        return a.jugador ? e.actores.n : a.q === 'n' || e.centro ? e.actores.j : e.actores.n;
    }
    function metaDe(g, a) {
        const otro = a.jugador ? e.actores.n : e.actores.j;
        const info = { s: a.sentado, otroS: otro.sentado, j: !!a.jugador, esc: esc(e.actores.n.n) };
        // metaTramo aplica las opciones del tramo (B3b: reloj, escala, espejo); sin opciones, el gesto tal cual
        return metaTramo(g, e.t, info, buscarGesto);
    }
    // Gestos del guion, luego GESTOS_AMISTAD y luego GESTOS (firma u, t, sentado, jugador; ahí llegan los nuevos de poses.json)
    const deSkin = new Map();
    function buscarGesto(nombre) {
        const f = (e.guion.gestos && e.guion.gestos[nombre]) || GESTOS_AMISTAD[nombre];
        if (f) return f;
        if (!GESTOS[nombre]) return null;
        if (!deSkin.has(nombre)) deSkin.set(nombre, (u, t, i) => GESTOS[nombre](u, t, i.s, i.j));
        return deSkin.get(nombre);
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
        // Mira al jugador (o, en grupo, al centro del grupo); un actor que camina o mira algo lejos lleva su giro fijo (api.girar)
        // api.girar manda; si no, los `giros` y `caminos` de escenas.json (yawDatos, B3b)
        const fijo = a.yawMeta !== null ? a.yawMeta : a.yawDatos ?? null;
        if (fijo !== null) { a.n.yaw += angulo(fijo - a.n.yaw) * Math.min(1, dt * 8); return r; }
        const J = e.centro ? { x: e.centro.x, z: e.centro.z } : jugador.pos, giro = e.guion.yaw && e.guion.yaw[a.q];
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
    // Mueve a un actor (coordenadas del grupo, como posG); al terminar o al saltar vuelve a su sitio.
    // El jugador se mueve con colocar(); un amigo, por su x/y/z (su animación queda congelada durante la escena).
    function mover(q, x, y, z) {
        const a = e && e.actores[q];
        if (!a) return;
        if (a.jugador) { e.jugadorMovido = true; jugador.colocar(x, (y ?? jugador.pos.y - dy) + dy, z); return; }
        if (!a.orig) a.orig = { x: a.n.x, y: a.n.y, z: a.n.z };
        a.n.x = x; a.n.z = z;
        if (y !== undefined) a.n.y = y;
    }
    // Sitio de partida de un actor (antes de moverse), en coordenadas del grupo
    const origen = q => {
        const a = e && e.actores[q];
        if (!a) return null;
        if (a.jugador) return { x: e.jugador0.x, y: e.jugador0.y - dy, z: e.jugador0.z };
        const o = a.orig || a.n;
        return { x: o.x, y: o.y ?? 0, z: o.z };
    };
    // Giro fijo de un actor (radianes, hacia donde mira el cuerpo, como n.yaw; null vuelve a mirar al jugador o al centro)
    function girar(q, yaw) { const a = e && e.actores[q]; if (a) a.yawMeta = yaw; }
    // Plano manual de la cámara: f() -> { pos: [x, y, z], mira: [x, y, z] } en coordenadas del grupo, o null para volver a los planos
    const vCam = new THREE.Vector3(), vMira = new THREE.Vector3();
    function camaraManual(f) {
        camaras.manual = f ? () => {
            const m = f();
            if (!m) return null;
            return { pos: vCam.set(m.pos[0], m.pos[1] + dy, m.pos[2]), mira: vMira.set(m.mira[0], m.mira[1] + dy, m.mira[2]) };
        } : null;
    }
    // ---- B3b: lugar, caminos, giros, objetos y efectos de escenas.json (estudio/DISENO.md §40) ----
    // Un punto { desde, mas } en coordenadas del grupo: desde = 'centro' o un actor (su sitio de partida); o { promedio } entre
    // varios (la atalaya, decisión 24)
    function sitioDe(s) {
        return sitioEn(s, d => (d === 'centro' ? e.centro : origen(d)), e.actores.n.n.y ?? 0);
    }
    // Adónde va q en una clave de camino: 'sitio', { hacia, dist } (a dist bloques de alguien, del lado de donde viene q) o un punto
    function destinoDe(q, a) {
        if (a === 'sitio') return origen(q);
        if (a && a.hacia !== undefined) {
            const o = origen(q), t = posG(a.hacia);
            if (!o || !t) return null;
            const dx = o.x - t.x, dz = o.z - t.z, d = Math.hypot(dx, dz) || 1, dist = a.dist ?? 1;
            return { x: t.x + (dx / d) * dist, y: o.y, z: t.z + (dz / d) * dist };
        }
        return a ? sitioDe(a) : null;
    }
    // mira de un giro -> yaw (como n.yaw): 'centro', un actor, grados del mundo o null (el motor decide)
    function yawDe(a, mira) {
        if (mira === null || mira === undefined) return null;
        if (typeof mira === 'number') return (mira * Math.PI) / 180;
        const yo = pos(a), b = mira === 'centro' ? e.centro : e.actores[mira] && pos(e.actores[mira]);
        return b ? Math.atan2(b.x - yo.x, b.z - yo.z) : null;
    }
    // Cada cuadro: los que caminan van a su punto (mover los devuelve al terminar) y miran hacia donde caminan, salvo que un
    // giro diga otra cosa. yawDatos lo leen animarAmigo y el giro del jugador.
    function moverYGirar(x) {
        for (const [q, claves] of Object.entries(x.guion.caminos || {})) {
            const a = x.actores[q];
            const p = a && caminoEn(claves, x.t, d => destinoDe(q, d));
            if (!p) continue;
            mover(q, p.x, p.y, p.z);
            a.rumbo = p.rumbo;
        }
        for (const a of Object.values(x.actores)) {
            const c = claveEn(x.guion.giros && x.guion.giros[a.q], x.t);
            const y = c ? yawDe(a, c[1]) : null;
            a.yawDatos = y !== null ? y : a.rumbo ?? null;
        }
    }
    // Texturas de los dibujos del catálogo: PIX (moldes.js) o un ícono de iconos.json (16×16, los pinta el dueño en Píxeles)
    const texDibujo = new Map();
    function texturaDibujo(nombre) {
        const cat = e.guion.catalogo || {};
        const clave = (cat.iconos && cat.iconos[nombre] ? 'i:' : 'p:') + nombre;
        if (texDibujo.has(clave)) return texDibujo.get(clave);
        let t = null;
        if (cat.iconos && cat.iconos[nombre]) {
            const c = document.createElement('canvas'); c.width = c.height = 16;
            const g = c.getContext('2d');
            cat.iconos[nombre].forEach((px, i) => { if (px) { g.fillStyle = `rgb(${px[0]},${px[1]},${px[2]})`; g.fillRect(i % 16, Math.floor(i / 16), 1, 1); } });
            t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
        } else if (cat.pix && cat.pix[nombre]) t = texturaPixeles(cat.pix[nombre].filas, cat.pix[nombre].colores);
        texDibujo.set(clave, t);
        return t;
    }
    // Un objeto por actor (q 'todos') o uno solo; pegado a su hueso (sigue a la mano solo) o al grupo del mapa
    function crearObjetos() {
        e.objetos = [];
        for (const o of e.guion.objetos) {
            const conHueso = o.en.hueso !== undefined;
            const qs = conHueso ? (o.en.q === 'todos' ? Object.keys(e.actores) : [o.en.q]) : [null];
            for (const q of qs) {
                if (q && !e.actores[q]) continue; // un actor opcional que no vino
                let m;
                if (typeof o.dibujo === 'object') {
                    // { caja, color } o { caja, pix }: caja lisa o con la textura de un dibujo de PIX (decisión 18)
                    const px = o.dibujo.pix !== undefined && e.guion.catalogo && e.guion.catalogo.pix && e.guion.catalogo.pix[o.dibujo.pix];
                    m = caja(...o.dibujo.caja.map(v => v * (o.tam ?? 1)), o.dibujo.color, px ? { filas: px.filas, colores: px.colores } : {});
                }
                else {
                    m = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaDibujo(o.dibujo), transparent: true, depthWrite: false }));
                    e.props.push(m);
                }
                m.visible = false;
                if (conHueso) pegar(m, q, o.en.hueso, o.en.mas); else pegar(m);
                e.objetos.push({ o, q, m, dibujo: o.dibujo, sprite: m.isSprite });
            }
        }
    }
    function actualizarObjetos(x) {
        for (const it of x.objetos) {
            const s = objetoEn(it.o, x.t);
            it.m.visible = s.visible;
            if (!s.visible) continue;
            if (it.sprite) { const k = (it.o.tam ?? 0.4) * s.escala; it.m.scale.set(k, k, 1); } else it.m.scale.setScalar(s.escala);
            if (it.sprite && s.dibujo !== it.dibujo && typeof s.dibujo === 'string') { it.dibujo = s.dibujo; it.m.material.map = texturaDibujo(s.dibujo); it.m.material.needsUpdate = true; }
            if (!it.q) { const p = sitioDe(it.o.en); if (p) it.m.position.set(p.x, p.y, p.z); }
        }
    }
    // [t, tipo, { en, alto, mas, tam, vida, vy, n, encoge }]: sobre alguien, en el centro, en la punta de una mano
    // ({ q, mano }) o, sin `en`, entre el amigo y el jugador. tipo: chispa, corazon, humo, nieve o un dibujo de PIX (decisión 17).
    // Con `encoge` [a, b] el efecto no se apaga solo: se achica hasta desaparecer entre a y b (el árbol que se borra).
    function efectoDeDatos([, tipo, op = {}]) {
        const mano = op.en && typeof op.en === 'object';
        const b = mano ? (e.actores[op.en.q] ? punta(e.actores[op.en.q], op.en.mano === 'I' ? 'I' : 'D', new THREE.Vector3()) : null)
            : op.en === 'centro' ? e.centro && { x: e.centro.x, y: e.centro.y ?? (e.actores.n.n.y ?? 0), z: e.centro.z }
            : op.en !== undefined ? posG(op.en) : (() => { const A = posG('n'), J = posG('j'); return { x: (A.x + J.x) / 2, y: Math.max(A.y, J.y), z: (A.z + J.z) / 2 }; })();
        if (!b) return;
        const cat = e.guion.catalogo && e.guion.catalogo.pix, dibujo = TEX[tipo] ? tipo : cat && cat[tipo];
        if (!dibujo) return;
        const mas = op.mas || [0, 0, 0], n = op.n ?? 1, y = b.y + (op.alto ?? (mano ? 0 : 1.8)) + mas[1];
        const o = {};
        for (const k of ['tam', 'vida', 'vy']) if (op[k] !== undefined) o[k] = op[k];
        if (op.encoge) o.vida = Infinity;
        for (let i = 0; i < n; i++) {
            const s = efecto(dibujo, b.x + mas[0] + (i - (n - 1) / 2) * 0.3, y + i * 0.12, b.z + mas[2], o);
            if (op.encoge) (e.encogen || (e.encogen = [])).push({ s, tam: s.scale.x, a: op.encoge[0], b: op.encoge[1] });
        }
    }
    function encoger(x) {
        for (const f of x.encogen) { const u = tramo(x.t, f.a, f.b); f.s.visible = u < 1; f.s.scale.set(f.tam * (1 - u), f.tam * (1 - u), 1); }
    }
    // Cámara de grupo (camaras.js, opción centro): gira en torno al centro del grupo y mira hacia quien habla (miraG, suavizado)
    function centroCamara(c, objetivo) {
        if (!e || !e.centro) return;
        c.set(e.centro.x, (e.actores.n.n.y ?? 0) + dy + 1.55, e.centro.z);
        if (e.miraG) objetivo.set(e.miraG.x, e.miraG.y, e.miraG.z); else objetivo.copy(c);
    }
    // Lo que reciben los extras de un guion propio (momentos especiales)
    const api = (x = e) => ({ e: x, grupo, dy, jugador, camaras, mundo, efecto, golpe, corazones, globoDe, personaDe, punta, pos, posG, caja, sprite, pegar, soltar, prestar, mover, origen,
        girar, camara: camaraManual, opaco: (bx, by, bz) => opaco(bx, by + dy, bz), actor: q => x.actores[q], L, sonidos, THREE, suave, lim, lerp, tramo, envolvente });

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
        // «Todos» (6c-2): sobre el centro del grupo, encima de la cabeza más alta (y bajo el techo del iglú)
        if (quien === 'todos' && e.centro) {
            const piso = (e.actores.n.n.y ?? 0) + dy;
            let y = piso + 2.15 + 0.9;
            for (let k = 2; k <= 4; k++) if (opaco(e.centro.x, piso + k + 0.5, e.centro.z)) { y = Math.min(y, piso + k - 0.4); break; }
            return [e.centro.x, y - dy, e.centro.z];
        }
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
            // B3b: efectos y sonidos del catálogo (con la misma regla), caminos, giros y objetos de escenas.json
            for (const i of eventosEn(x.guion.efectos, t0, x.t, x.hechos, 'e')) efectoDeDatos(x.guion.efectos[i]);
            for (const i of eventosEn(x.guion.sonidos, t0, x.t, x.hechos, 's')) { const [, nombre, nota] = x.guion.sonidos[i], f = x.guion.catalogo && x.guion.catalogo.sonidos[nombre]; if (f) f(nota); }
            if (x.encogen) encoger(x);
            if (x.guion.caminos || x.guion.giros) moverYGirar(x);
            if (x.objetos) actualizarObjetos(x);
            if (x.guion.extra && x.guion.extra.cuadro) x.guion.extra.cuadro(api(x), pausada ? 0 : dt);
            const giroJ = x.guion.yaw && x.guion.yaw.j, wS = suave(Math.min(tramo(x.t, 0, 0.5), 1 - tramo(x.t, x.T - 0.7, x.T)));
            const J = x.actores.j, mira = x.centro || x.actores.n.n;
            const fijoJ = J.yawMeta !== null ? J.yawMeta : J.yawDatos ?? null;
            if (fijoJ !== null) jugador.yaw += angulo(fijoJ - Math.PI - jugador.yaw) * Math.min(1, dt * 8);
            else jugador.yaw = Math.atan2(mira.x - jugador.pos.x, mira.z - jugador.pos.z) - Math.PI + (giroJ ? giroJ(x.t) * wS : 0);
            // Cámara de grupo: el punto de mira se corre con suavidad hacia quien habla
            if (x.centro) {
                const a = l && x.actores[l.q], p = a ? pos(a) : null, c = x.centro, y = (x.actores.n.n.y ?? 0) + dy + 1.55;
                const meta = p ? { x: c.x + (p.x - c.x) * 0.35, y: y + (p.y + 1.55 - y) * 0.35, z: c.z + (p.z - c.z) * 0.35 } : { x: c.x, y, z: c.z };
                if (!x.miraG) x.miraG = { ...meta };
                const k = Math.min(1, dt * 2);
                for (const ax of ['x', 'y', 'z']) x.miraG[ax] += (meta[ax] - x.miraG[ax]) * k;
            }
            if (x.t >= x.T) terminar();
        }
        actualizarEfectos(dt);
        actualizarGlobos(dt);
    }

    // ---- B3b: escenas de escenas.json para los cargadores ----
    const disparada = consulta => escenaQueDispara(datosEscenas && datosEscenas.escenas, consulta);
    // Íconos de iconos.json ya decodificados (se piden la primera vez que una escena usa uno)
    let iconos = null;
    async function iconosDeDatos() {
        if (iconos) return iconos;
        const [datos, { decodificar }] = await Promise.all([cargarDatos('iconos'), import('../datos/pixeles.js')]);
        iconos = Object.fromEntries(Object.entries((datos && datos.iconos) || {}).map(([k, d]) => [k, decodificar(d, 16, 16)]));
        return iconos;
    }
    // Guion de ejecución de una escena «guion»: gestos de MOLDES, `reparto` según quién es el amigo y cuál es tu skin
    // (las personas que no son ninguno de los dos entran como actores extra), catálogo de dibujos y sonidos y su `codigo`
    async function guionDeEscena(clave, amigo, skin) {
        const def = defDatos(clave);
        const [{ MOLDES, PIX, SONIDOS }, { durLinea }] = await Promise.all([import('./moldes.js'), import('./reencuentros.js')]);
        const g = guionDeDatos(def, { durLinea, moldes: MOLDES, personajes: PERSONAJES });
        const r = repartoDe(g.personas, amigo, skin, g.actores);
        const dibujos = (g.objetos || []).flatMap(o => [o.dibujo, ...o.cambia.map(c => c[1])]).filter(d => typeof d === 'string');
        const conIconos = dibujos.some(d => !PIX[d]) ? await iconosDeDatos() : null;
        const salida = { ...g, reparto: r.reparto, actores: r.actores, datos: clave, catalogo: { pix: PIX, iconos: conIconos, sonidos: sonidosDeEscena(SONIDOS, sonidos) } };
        if (def.codigo && CODIGO_ESCENAS[def.codigo]) { const m = await CODIGO_ESCENAS[def.codigo](); salida.extra = m.default(salida.marcas || {}); }
        return salida;
    }
    function empezar(clave, guion, alTerminar) {
        const ok = iniciar(clave, guion);
        if (ok && alTerminar) e.alTerminar = alTerminar;
        return ok;
    }

    return {
        actualizar, saltar, iniciar,
        // Una animación genérica (punos, abrazo, secreto, pareja) con la frase del personaje
        jugar(clave, tipo, alTerminar) {
            const ok = iniciar(clave, guionGenerico(clave, tipo));
            if (ok && alTerminar) e.alTerminar = alTerminar;
            return ok;
        },
        // Escena «guion» de mundo/datos/escenas.json (Estudio, fase 5): sin `dispara`, solo /amistad guion y el Estudio.
        // Sin persona, la más cercana al jugador. Promesa con true si empezó (moldes.js y reencuentros.js se cargan al usarla).
        async jugarGuion(clave, persona, alTerminar) {
            const def = defDatos(clave);
            if (e || !def || def.tipo !== 'guion') return false;
            let quien = persona;
            if (!quien) {
                const libres = (ctx.personas ? ctx.personas() : []).filter(n => n.p && n.p.g.visible && !n.escena);
                const cerca = libres.sort((a, b) => Math.hypot(a.x - jugador.pos.x, a.z - jugador.pos.z) - Math.hypot(b.x - jugador.pos.x, b.z - jugador.pos.z))[0];
                quien = cerca && cerca.clave;
            }
            if (!quien) return false;
            try {
                const g = await guionDeEscena(clave, quien, ctx.base ? ctx.base() : null);
                if (e) return false; // otra escena empezó mientras cargaban los módulos
                return empezar(quien, g, alTerminar);
            } catch (err) { console.error('No se pudo jugar la escena de guion', err); return false; }
        },
        // Los cuatro cargadores (B3b, DISENO §40 decisión 7): primero una escena de escenas.json con su `dispara` (la más
        // específica gana) y, si no hay, el módulo de JS como siempre. Promesa con true si empezó.
        // Momento especial (6b-2): momentos/<clave>.js. op.base fuerza la base de la skin (el /amistad de desarrollo muestra
        // la variante de pareja sin cambiar de skin)
        momento(clave, alTerminar, op = {}) {
            if (e) return Promise.resolve(false);
            const base = op.base !== undefined ? op.base : ctx.base ? ctx.base() : null;
            const datos = disparada({ tipo: 'momento', persona: clave, skin: base });
            const cargar = datos ? guionDeEscena(datos, clave, base) : import(`./momentos/${clave}.js`).then(m => m.momento({ base, idioma }));
            return cargar.then(g => !e && empezar(clave, { ...g, tipo: 'momento' }, alTerminar))
                .catch(err => { console.error('No se pudo cargar el momento especial', err); return false; });
        },
        // Bienvenida del Venjy del Inicio a tu skin (6c-1): bienvenidas/<base>.js
        bienvenida(base, alTerminar) {
            if (e || !base || base === 'venjy' || !PERSONAJES.includes(base)) return Promise.resolve(false);
            const datos = disparada({ tipo: 'bienvenida', skin: base });
            const cargar = datos ? guionDeEscena(datos, 'venjy', base) : import(`./bienvenidas/${base}.js`).then(m => m.bienvenida({ idioma }));
            return cargar.then(g => !e && empezar('venjy', { ...g, tipo: 'bienvenida', base }, alTerminar))
                .catch(err => { console.error('No se pudo cargar la bienvenida', err); return false; });
        },
        // Reencuentro entre tu skin (base) y un amigo con relación 2 o 3 (6c-1): reencuentros.js
        reencuentro(base, clave, alTerminar) {
            if (e || base === 'venjy' || clave === 'venjy' || relacion(base, clave) < 2) return Promise.resolve(false);
            const datos = disparada({ tipo: 'reencuentro', skin: base, persona: clave });
            const cargar = datos ? guionDeEscena(datos, clave, base) : import('./reencuentros.js').then(m => m.reencuentro(base, clave));
            return cargar.then(g => !!g && !e && empezar(clave, { ...g, tipo: 'reencuentro', base }, alTerminar))
                .catch(err => { console.error('No se pudo cargar el reencuentro', err); return false; });
        },
        // Escena de grupo (6c-2): grupos/<nombre>.js con la variante de tu skin (base). En el JSON, 'n' es de quien parte
        // `lugar.centro` (o el primer miembro que sale y no es tu skin: amigoDeEscena)
        grupo(nombre, base, alTerminar) {
            if (e || !GRUPOS[nombre] || !GRUPOS[nombre].miembros.includes(base)) return Promise.resolve(false);
            const datos = disparada({ tipo: 'grupo', grupo: nombre, skin: base });
            const def = datos && defDatos(datos);
            const amigo = def && amigoDeEscena(def, def.dispara, base, GRUPOS[nombre].miembros);
            if (datos && !amigo) return Promise.resolve(false);
            const cargar = datos ? guionDeEscena(datos, amigo, base).then(g => ({ ...g, ancla: amigo })) : import(`./grupos/${nombre}.js`).then(m => m.grupo(base, { idioma }));
            return cargar.then(g => !!g && !e && empezar(g.ancla, { ...g, tipo: 'grupo', base, grupo: nombre }, alTerminar))
                .catch(err => { console.error('No se pudo cargar la escena de grupo', err); return false; });
        },
        // Claves de las escenas de tipo «guion» de escenas.json (las que se juegan con jugarGuion)
        guiones() { return Object.entries((datosEscenas && datosEscenas.escenas) || {}).filter(([, d]) => d && d.tipo === 'guion').map(([k]) => k); },
        get activa() { return !!e; },
        get escena() { return e && { clave: e.clave, tipo: e.guion.tipo || null, base: e.guion.base || null, grupo: e.guion.grupo || null, datos: e.guion.datos || null, t: e.t, T: e.T }; },
        setIdioma(l) { idioma = l; boton.textContent = tx().saltar; for (const [q, g] of globos) if (q === 'j' || q === 'todos') g.etiqueta = { nombre: q === 'j' ? tx().tu : tx().todos, color: COLOR_GLOBO.j }; },
        // Depuración (capturas)
        pausar(v = true) { pausada = v; },
        irA(s) { if (e) { e.t = s; e.hechos.clear(); } },
        get actores() { return e && e.actores; }
    };
}
