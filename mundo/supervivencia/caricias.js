// =========================================================
// VENJY · Supervivencia · Caricias a las gatas
// Junto a Mila o Gala (≤ 2,2 bloques, con línea de vista) aparece el aviso y la tecla G (o el botón
// ACARICIAR en el celular). Al usarla, ~8 s en cámara de cine: te ves a ti mismo, con tu skin, le
// haces cariño. Guion (T = 8 s):
//   0,0–0,5  te ubicas frente a la cara de la gata (bajo el fundido); ella se gira y se sienta; maullido
//   0,5–1,5  te inclinas y la mano derecha baja hacia su cabeza
//   1,5–6,2  caricia: la mano se desliza de lado sobre la cabeza; ella empuja, ladea la cabeza,
//            mueve la cola y ronronea; corazones cada 1,3 s; globo «Prrrr…»; corte de plano a 4,2 s
//   6,2–8,0  te enderezas, la gata se calma, la cámara vuelve a neutral y ella se levanta sola
// Se salta con Esc o con el botón «Saltar». Mientras dura, la IA de la gata se pausa con el gancho
// `gata.escena` de gatas.js. Las gatas viven en `grupo` (su pie en el mundo = gata.y + dy).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';
import { crearGlobo, COLOR_GLOBO } from '../criaturas/cuerpo.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
// Peso de algo que dura de a a b con rampas de entrada y salida (0 → 1 → 0)
const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));

const T = 8.0;                 // duración de la caricia (s)
const RADIO = 2.2;             // distancia horizontal para poder acariciarla (bloques)
const HORAS_CORAZON = [2.0, 3.3, 4.6, 5.9];
const NOMBRE = { mila: 'Mila', gala: 'Gala' };
const TXT = {
    es: { saltar: 'Saltar', pista: 'Acaricia a {n}: tecla G o el botón ACARICIAR', ronron: 'Prrrrr…' },
    en: { saltar: 'Skip', pista: 'Pet {n}: G key or the PET button', ronron: 'Purrrrr…' }
};

// Corazón de 9×9 píxeles (igual que el de los animales enamorados en ganado.js)
const texCorazon = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 9;
    const ctx = c.getContext('2d');
    ['.kk...kk.', 'kaak.kaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '..kaaak..', '...kak...', '....k....'].forEach((f, y) => {
        for (let x = 0; x < 9; x++) if (f[x] !== '.') { ctx.fillStyle = f[x] === 'k' ? '#3a0008' : '#e82040'; ctx.fillRect(x, y, 1, 1); }
    });
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    return t;
})();

// especial(g) (opcional): se consulta antes de la caricia; si devuelve true, otra escena tomó el lugar
// (las escenas especiales de escenas-gatas.js la primera vez con skin de Lona o Venjy).
export function crearCaricias({ grupo, dy, mundo, jugador, camaras, gatas, hud, misiones, puede, bloquear, liberar, especial = null, idioma = 'es' }) {
    let L = idioma;
    const tx = () => TXT[L];

    // ---- Botón «Saltar» (igual que el de las escenas de skin, con su propia clase de body) ----
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton saltar-caricia';
    boton.textContent = tx().saltar;
    boton.addEventListener('click', e => { e.preventDefault(); terminar(); });
    document.body.appendChild(boton);

    // Globo de ronroneo: más chico que el de las conversaciones (3 bloques de ancho se sale de la pantalla en celular)
    const globo = crearGlobo(grupo);
    globo.sp.scale.set(1.4, 0.58, 1);

    // ---- Bloques que tapan / pisables ----
    const opaco = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };
    const solido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && TIPO[id] === 1; };
    function libre(ax, ay, az, bx, by, bz) {
        const n = Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) * 3);
        for (let i = 1; i < n; i++) { const k = i / n; if (opaco(ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k)) return false; }
        return true;
    }

    // ¿Qué gata está al alcance? La más cercana, de pie al suelo, sin estar en su caja ni en otra escena
    function cercana() {
        if (estado) return null;
        const p = jugador.pos;
        let mejor = null, md = RADIO;
        for (const g of gatas.gatas) {
            if (!g.g.visible || !g.cargada || g.cajaEst || g.escena) continue;
            const d = Math.hypot(g.x - p.x, g.z - p.z);
            if (d > md) continue;
            const ny = g.y + dy;
            if (Math.abs(p.y - ny) > 1.5) continue;
            if (!libre(p.x, p.y + 1.6, p.z, g.x, ny + 0.8, g.z)) continue;
            mejor = g; md = d;
        }
        return mejor;
    }

    // Dónde se para el jugador: delante de la cara de la gata, del lado en que ya está. Si no hay
    // suelo libre ahí, se queda donde está (la escena empieza igual, bajo el fundido).
    function lugarJunto(g) {
        const dx = jugador.pos.x - g.x, dz = jugador.pos.z - g.z;
        const base = Math.hypot(dx, dz) > 0.3 ? Math.atan2(dx, dz) : g.yaw;
        const piso = Math.round(g.y + dy);
        const r0 = g.e.largo / 2 + 0.75; // desde el centro de la gata: la mano llega a su cabeza (ver poseJugador)
        for (const [da, dr] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.2], [0, -0.2], [0.55, 0], [-0.55, 0]]) {
            const a = base + da, r = r0 + dr;
            const x = Math.floor(g.x + Math.sin(a) * r) + 0.5, z = Math.floor(g.z + Math.cos(a) * r) + 0.5;
            for (const y of [piso, piso + 1, piso - 1]) {
                if (solido(x, y - 0.5, z) && !opaco(x, y + 0.5, z) && !opaco(x, y + 1.5, z)) return { x, y, z };
            }
        }
        return null;
    }

    // ---------------------------------------------------------
    // Estado de la caricia
    // ---------------------------------------------------------
    let estado = null, pausada = false;
    const corazones = [];
    const vC = new THREE.Vector3();

    function iniciar(g) {
        bloquear();
        globo.etiqueta = { color: COLOR_GLOBO[g.clave] }; // el ronroneo lleva el color de la gata
        const sitio = lugarJunto(g);
        if (sitio) jugador.colocar(sitio.x, sitio.y, sitio.z);
        // La gata mira hacia el jugador; el jugador, hacia la gata (el cuerpo gira con yaw + PI)
        g.yaw = Math.atan2(jugador.pos.x - g.x, jugador.pos.z - g.z);
        jugador.yaw = Math.atan2(g.x - jugador.pos.x, g.z - jugador.pos.z) - Math.PI;
        jugador.pitch = 0;

        // Ancla de la cámara: x, y, z de la gata y «escala» para que encuadre a su cabeza (1,55·escala)
        const ancla = { x: g.x, y: g.y, z: g.z, escala: 0.62 };
        for (const k in cur) delete cur[k]; // la pose del jugador empieza desde cero en cada caricia
        estado = { g, t: 0, ancla, maullo: false, hechos: [false, false, false, false] };
        g.pose = 'sentada';
        g.escena = (dt) => animarGata(dt);
        camaras.iniciarCine(ancla, { escena: true, fundido: 0.45, evitar: [], planos: 'gata' });
        camaras.enfocar(0.35);
        camaras.pose = (cuerpo, dt) => poseJugador(dt);
        globo.decir(tx().ronron);
        misiones.ocultarMarcas = true; // sin marcas «!» de misión en el encuadre (como en las escenas de skin)
        document.body.classList.add('en-caricia');
    }

    function terminar() {
        if (!estado) return;
        const e = estado; estado = null;
        const g = e.g;
        delete g.escena;
        g.ronroneo = false;
        g.pose = 'pie'; g.poseElegida = false; g.espera = 1.2;
        g.cabeza.rotation.y = 0; g.cabeza.rotation.z = 0;
        // Cuerpo del jugador a neutro (la cámara de cine ya no lo mueve)
        const c = camaras.cuerpo;
        c.cuerpo.position.y = 0; c.cuerpo.rotation.x = 0; c.cuerpo.rotation.z = 0;
        for (const h of [c.brazoD, c.brazoI, c.piernaD, c.piernaI, c.cuello]) { h.rotation.x = 0; h.rotation.z = 0; }
        c.cuello.rotation.y = 0;
        camaras.terminarCine();
        for (const h of corazones.splice(0)) { grupo.remove(h.s); h.s.material.dispose(); }
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-caricia');
        liberar();
    }

    // ---------------------------------------------------------
    // Pose del jugador (cuello, brazos, piernas y torso)
    // ---------------------------------------------------------
    const cur = {};
    function poseJugador(dt) {
        if (!estado) return;
        const t = estado.t, c = camaras.cuerpo;
        const w = envolvente(t, 0.3, 6.9, 0.7);  // inclinarse y volver a erguirse
        const m = envolvente(t, 1.4, 6.3, 0.5);  // caricia (solo mientras la mano está en la cabeza)
        // Medido con posar/medir: con el torso a 0,3 y el brazo adelantado y arriba (-1,62), la mano
        // queda a ~1,17 delante de los pies y a 1,27 de altura, donde está la cabeza de una gata sentada.
        const meta = {
            inc: 0.3 * w,                                         // torso algo adelante
            pDx: -0.3 * w, pIx: -0.3 * w,                         // piernas compensadas (siguen rectas)
            y: 0.034 * w,                                         // cuerpo a la altura de la compensación
            bDx: w * (-1.62 + 0.04 * Math.sin(t * 3.1) * m),      // brazo derecho adelante y arriba, hacia la cabeza
            bDz: 0.05 + w * (0.12 + 0.15 * Math.sin(t * 6) * m),  // la mano se desliza de lado sobre la cabeza
            bIx: 0.25 * w, bIz: -0.05 - 0.1 * w,                  // izquierdo relajado detrás
            cx: 0.3 * w, cy: 0, cz: 0                             // cabeza inclinada hacia la gata
        };
        const r = Math.min(1, dt * 9);
        for (const k in meta) { cur[k] = (cur[k] ?? meta[k]) + (meta[k] - (cur[k] ?? meta[k])) * r; }
        c.cuerpo.position.y = cur.y;
        c.cuerpo.rotation.x = cur.inc;
        c.cuerpo.rotation.z = 0;
        c.piernaD.rotation.x = cur.pDx; c.piernaI.rotation.x = cur.pIx;
        c.brazoD.rotation.x = cur.bDx; c.brazoD.rotation.z = cur.bDz;
        c.brazoI.rotation.x = cur.bIx; c.brazoI.rotation.z = cur.bIz;
        c.cuello.rotation.x = cur.cx; c.cuello.rotation.y = 0; c.cuello.rotation.z = 0;
    }

    // ---------------------------------------------------------
    // Pose de la gata (se llama desde gatas.js después de aplicarPose)
    // ---------------------------------------------------------
    function animarGata(dt) {
        const e = estado, g = e.g, t = e.t;
        const hd = envolvente(t, 0.5, 6.9, 0.6);  // cuánto se entrega a la caricia
        // Cabeza: empuja hacia arriba contra la mano, ladeada y con un vaivén suave
        g.cabeza.rotation.x += hd * (-0.32 + 0.06 * Math.sin(t * 6));
        g.cabeza.rotation.z = hd * (0.16 + 0.05 * Math.sin(t * 6));
        g.cabeza.rotation.y = hd * 0.12 * Math.sin(t * 2.3);
        // Cola: se menea más mientras la acarician
        g.cola.rotation.y = Math.sin(t * (5 + 3 * hd)) * (0.12 + 0.45 * hd);
        if (!e.maullo && t >= 0.5) { e.maullo = true; g.maullar(1.0); }
        g.ronroneo = t >= 1.0 && t < 6.9;
    }

    // ---------------------------------------------------------
    // Bucle
    // ---------------------------------------------------------
    let cerca = null;
    const listeners = [];
    function actualizar(dt) {
        if (estado) {
            if (!pausada) estado.t += dt;
            const e = estado, g = e.g;
            // Mantiene el encuadre y el giro del jugador hacia ella
            jugador.yaw = Math.atan2(g.x - jugador.pos.x, g.z - jugador.pos.z) - Math.PI;
            for (let i = 0; i < HORAS_CORAZON.length; i++) {
                if (!e.hechos[i] && e.t >= HORAS_CORAZON[i]) { e.hechos[i] = true; corazon(g); }
            }
            if (e.t >= T) terminar();
        }
        // Aviso y botón táctil cuando hay una gata al alcance
        const ahora = cercana();
        if (ahora !== cerca) {
            cerca = ahora;
            for (const f of listeners) f(!!ahora);
            if (ahora && !anunciadas.has(ahora.clave)) { anunciadas.add(ahora.clave); hud.mensaje(tx().pista.replace('{n}', NOMBRE[ahora.clave] || ahora.clave), 4); }
        }
        actualizarCorazones(dt);
        // Globo de ronroneo sobre la cabeza
        if (estado && estado.t >= 0.9 && estado.t < 6.9) {
            const g = estado.g, alto = g.e.patas + g.e.alto + g.e.cabeza * 0.9;
            // Un poco hacia el jugador desde la gata: en el encuadre de celular queda en el centro de la pantalla
            const jp = jugador.pos;
            globo.actualizar(dt, true, lerp(g.x, jp.x, 0.35), g.y + alto + 0.5, lerp(g.z, jp.z, 0.35));
        } else globo.actualizar(dt, false, 0, 0, 0);
    }

    const anunciadas = new Set(); // gatas ya anunciadas (el aviso sale una vez por partida)

    function corazon(g) {
        g.g.updateMatrixWorld(true);
        const p = grupo.worldToLocal(g.cabeza.getWorldPosition(vC));
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texCorazon, transparent: true, depthWrite: false }));
        s.scale.set(0.35, 0.35, 1);
        s.position.set(p.x + (Math.random() - 0.5) * 0.3, p.y + 0.3, p.z);
        grupo.add(s);
        corazones.push({ s, t: 1.2 });
    }
    function actualizarCorazones(dt) {
        for (let i = corazones.length - 1; i >= 0; i--) {
            const c = corazones[i];
            c.t -= dt;
            c.s.position.y += dt * 0.6;
            c.s.material.opacity = Math.min(1, c.t * 2);
            if (c.t <= 0) { grupo.remove(c.s); c.s.material.dispose(); corazones.splice(i, 1); }
        }
    }

    function intentar() {
        if (estado || !puede()) return false;
        const g = cercana();
        if (!g) return false;
        if (especial && especial(g)) return true;
        iniciar(g);
        return true;
    }

    // Esc para saltar. La tecla G la reparte main.js (caricias.intentar() o la ronda del iglú)
    document.addEventListener('keydown', e => {
        if (estado && e.code === 'Escape' && !e.repeat) { e.preventDefault(); terminar(); }
    });

    return {
        actualizar, intentar, saltar: terminar,
        // Para el botón táctil: avisa cuando hay una gata al alcance (true/false)
        alCambiarCercania(f) { listeners.push(f); },
        get activa() { return !!estado; },
        saltar: () => { if (estado) terminar(); },
        setIdioma(l) { L = l; boton.textContent = tx().saltar; },
        // Depuración (capturas): forzar una caricia con una gata, detener el reloj, ir a un segundo
        forzar(clave) {
            const g = gatas.gatas.find(x => x.clave === clave);
            if (!g || estado) return false;
            iniciar(g);
            return true;
        },
        pausar(v = true) { pausada = v; },
        irA(t) { if (estado) estado.t = t; },
        cercana: () => cercana()
    };
}
