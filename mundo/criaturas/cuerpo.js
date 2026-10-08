// =========================================================
// VENJY · Base común de las criaturas (NPCs, animales, gatas)
// Texturas pintadas por código, materiales teñidos con la hora del día,
// cuerpo de persona de cajas, nombre flotante, globo de diálogo, suelo
// y el audio compartido del mundo (un solo AudioContext y un interruptor).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { azar } from '../mundo-datos.js';
import { TIPO } from '../texturas.js';

export const aSRGB = s => Math.pow(s, 2.2);
export const SOMBRA_CARA = [0.6, 0.6, 1, 0.5, 0.8, 0.8]; // +x -x +y -y +z -z
export const RADIO_VISIBLE = 160;
export const lerp = (a, b, k) => a + (b - a) * k;
export const ajustar = ([r, g, b], f) => [r * f, g * f, b * f];
export const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));

// Textura de w×h píxeles; el pintor recibe (x, y, r) y devuelve [r, g, b] o [r, g, b, a]
export function texturaPixeles(w, h, semilla, pintor) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const r = azar(semilla);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const [cr, cg, cb, ca = 255] = pintor(x, y, r);
            const i = (y * w + x) * 4;
            img.data[i] = Math.max(0, Math.min(255, cr));
            img.data[i + 1] = Math.max(0, Math.min(255, cg));
            img.data[i + 2] = Math.max(0, Math.min(255, cb));
            img.data[i + 3] = ca;
        }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
export const textura = (semilla, pintor) => texturaPixeles(16, 16, semilla, pintor);

// Color liso con motas, como las texturas de Minecraft
export const liso = (color, fuerza = 0.18) => (x, y, r) => ajustar(color, 1 - fuerza / 2 + r() * fuerza);

// Materiales con sombreado fijo por cara, teñidos cada cuadro con la luz del día
export function crearTinte() {
    const todos = [];
    const cache = new Map();
    const mat = (mapa, sombra, opciones = {}) => {
        const k = mapa.uuid + sombra + (opciones.transparent ? 't' : '');
        if (!cache.has(k)) {
            const m = new THREE.MeshBasicMaterial({ map: mapa, ...opciones });
            m.userData.sombra = aSRGB(sombra);
            cache.set(k, m);
            todos.push(m);
        }
        return cache.get(k);
    };
    return {
        mat,
        // 6 caras (+x -x +y -y +z -z); `especial` reemplaza el mapa de algunas
        caras: (porDefecto, especial = {}, opciones) => SOMBRA_CARA.map((s, i) => mat(especial[i] || porDefecto, s, opciones)),
        aplicar(tinte) { for (const m of todos) m.color.setScalar(m.userData.sombra).multiply(tinte); }
    };
}

export const caja = (w, h, d, mats) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);

// Caja que cuelga de un pivote (hombro, cadera, cuello): el pivote queda en su cara de arriba
export function colgante(w, h, d, mats, x, y, z) {
    const piv = new THREE.Group();
    piv.position.set(x, y, z);
    const m = caja(w, h, d, mats);
    m.position.y = -h / 2;
    piv.add(m);
    return piv;
}

// ---------------------------------------------------------
// Persona de cajas (proporciones del jugador de Minecraft, 32 px por bloque).
// Mira hacia +Z y su origen está en los pies. La piel trae pintores por parte y cara:
// { cabeza: { frente, atras, lado, arriba, abajo }, cuerpo: { frente, atras, lado, arriba },
//   brazo: { frente, lado, abajo }, pierna: { frente, lado, abajo } } (los que falten usan `frente`)
// ---------------------------------------------------------
export function crearPersona(tinte, piel, semilla) {
    let s = semilla;
    const tex = (w, h, p) => texturaPixeles(w, h, s++, p);
    const seis = (partes, w, h, d) => {
        const f = tex(w, h, partes.frente);
        const a = partes.atras ? tex(w, h, partes.atras) : f;
        const l = partes.lado ? tex(d, h, partes.lado) : tex(d, h, partes.frente);
        // En la cara +X la columna 0 del lienzo es el frente; en la -X es la espalda: se espeja
        const pl = partes.lado || partes.frente;
        const ld = tex(d, h, partes.ladoD || ((x, y, r) => pl(d - 1 - x, y, r)));
        const ar = partes.arriba ? tex(w, d, partes.arriba) : l;
        const ab = partes.abajo ? tex(w, d, partes.abajo) : ar;
        return tinte.caras(f, { 0: l, 1: ld, 2: ar, 3: ab, 4: f, 5: a });
    };
    const g = new THREE.Group();
    const cuerpo = new THREE.Group(); // todo cuelga de aquí (para inclinarse o sentarse)
    g.add(cuerpo);
    const torso = caja(0.5, 0.75, 0.25, seis(piel.cuerpo, 16, 24, 8));
    torso.position.y = 1.125;
    cuerpo.add(torso);
    const cuello = new THREE.Group();
    cuello.position.y = 1.5;
    const cab = caja(0.5, 0.5, 0.5, seis(piel.cabeza, 16, 16, 16));
    cab.position.y = 0.25;
    cuello.add(cab);
    cuerpo.add(cuello);
    const brazo = seis(piel.brazo, 8, 24, 8);
    const pierna = seis(piel.pierna, 8, 24, 8);
    // Brazo derecho del personaje: a su derecha, que mirando hacia +Z es -X
    const brazoD = colgante(0.25, 0.75, 0.25, brazo, -0.375, 1.5, 0);
    const brazoI = colgante(0.25, 0.75, 0.25, brazo, 0.375, 1.5, 0);
    const piernaD = colgante(0.25, 0.75, 0.25, pierna, -0.125, 0.75, 0);
    const piernaI = colgante(0.25, 0.75, 0.25, pierna, 0.125, 0.75, 0);
    cuerpo.add(brazoD, brazoI, piernaD, piernaI);
    return { g, cuerpo, torso, cuello, cabeza: cab, brazoD, brazoI, piernaD, piernaI };
}

// Ciclo de caminata (amp 0 = quieto)
export function caminar(p, fase, amp) {
    const b = Math.sin(fase) * amp;
    p.piernaD.rotation.x = b; p.piernaI.rotation.x = -b;
    p.brazoD.rotation.x = -b * 0.8; p.brazoI.rotation.x = b * 0.8;
}

// ---------------------------------------------------------
// Suelo: altura donde se apoya una criatura en (x, z).
// Devuelve la y, null si no se puede pisar (agua, estructura, árbol) o undefined si el chunk no está.
// opciones.estructuras: también pisa plazas niveladas (ES 3) y tableros de puente (ES 2)
// ---------------------------------------------------------
export function suelo(terreno, mundo, x, z, opciones = {}) {
    const { BW, BD, HT, ES } = terreno;
    const bx = Math.floor(x), bz = Math.floor(z);
    if (bx < 1 || bz < 1 || bx >= BW - 1 || bz >= BD - 1) return null;
    const o = bz * BW + bx;
    const es = ES[o];
    if (es === 1 || (es && !opciones.estructuras)) return null;
    const y = HT[o] + 1;
    if (y <= 15 && es !== 2) return null; // agua o playa baja
    const arriba = mundo.bloque(x, y + 0.5, z);
    if (arriba === -1) return undefined;
    if (TIPO[arriba] === 1 || TIPO[arriba] === 2) return null;
    return y;
}

// ¿Ve la cámara el punto (x, y, z)? (el globo se dibuja encima de todo: solo se muestra si se ve a quien habla)
export function seVe(mundo, camara, x, y, z) {
    const o = camara.position;
    return lineaLibre(mundo, o.x, o.y, o.z, x, y, z);
}

// Rayo simple contra los bloques (para no ver nombres a través de paredes)
export function lineaLibre(mundo, ox, oy, oz, px, py, pz) {
    const d = Math.hypot(px - ox, py - oy, pz - oz);
    const n = Math.ceil(d * 2);
    for (let i = 1; i < n; i++) {
        const k = i / n;
        const b = mundo.bloque(ox + (px - ox) * k, oy + (py - oy) * k, oz + (pz - oz) * k);
        if (b > 0 && TIPO[b] === 1) return false;
    }
    return true;
}

function spriteLienzo(scene, w, h, escala, encima = false) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace;
    // encima: se dibuja sobre todo (el globo no se corta contra un techo bajo, como el del iglú)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: !encima, depthWrite: false, fog: false }));
    sp.scale.set(escala[0], escala[1], 1);
    sp.visible = false;
    sp.renderOrder = encima ? 20 : 10;
    scene.add(sp);
    return { c, tex, sp };
}

// Al cargar PixelCraft se vuelve a dibujar (si no, el primer dibujo sale con otra fuente)
function conFuente(dibujar) {
    dibujar();
    try { document.fonts.load('24px PixelCraft').then(dibujar, () => {}); } catch (e) { /* sin fuentes */ }
}

// ---------------------------------------------------------
// Nombre flotante: visible solo de cerca y al mirarlo (como el de las gatas)
// ---------------------------------------------------------
const DIST_NOMBRE = 12, COS_NOMBRE = Math.cos(12 * Math.PI / 180);
const dir = new THREE.Vector3();
export function crearNombre(scene, texto) {
    // El ancho del letrero depende del largo del nombre (antes «Conejeros» se cortaba)
    const ancho = Math.max(128, Math.ceil((texto.length * 16 + 28) / 8) * 8), kx = ancho / 128;
    const { c, tex, sp } = spriteLienzo(scene, ancho, 40, [1.2 * kx, 0.375]);
    const dibujar = () => {
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.fillStyle = 'rgba(16, 12, 8, 0.62)';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, c.width - 4, c.height - 4);
        ctx.font = '24px PixelCraft';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        // Si aun así no cabe (otra fuente mientras carga PixelCraft), se angosta el texto
        const w = ctx.measureText(texto).width, cabe = c.width - 16;
        ctx.save();
        ctx.translate(c.width / 2, 0);
        if (w > cabe) ctx.scale(cabe / w, 1);
        ctx.fillStyle = '#2a2a2a';
        ctx.fillText(texto, 2, c.height / 2 + 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(texto, 0, c.height / 2 + 1);
        ctx.restore();
        tex.needsUpdate = true;
    };
    conFuente(dibujar);
    let alfa = 0;
    return {
        sp,
        // (x, y, z) = punto sobre la cabeza; mirando = punto del cuerpo al que hay que apuntar
        actualizar(dt, camara, mundo, visible, x, y, z, mx, my, mz) {
            let objetivo = 0;
            const o = camara.position;
            const vx = mx - o.x, vy = my - o.y, vz = mz - o.z, d = Math.hypot(vx, vy, vz);
            if (visible && d < DIST_NOMBRE && d > 0.01) {
                camara.getWorldDirection(dir);
                const cos = (vx * dir.x + vy * dir.y + vz * dir.z) / d;
                if (cos > COS_NOMBRE && lineaLibre(mundo, o.x, o.y, o.z, mx, my, mz)) objetivo = 1;
            }
            alfa += (objetivo - alfa) * Math.min(1, dt * 6);
            if (Math.abs(alfa - objetivo) < 0.01) alfa = objetivo;
            sp.visible = alfa > 0.01;
            if (!sp.visible) return;
            sp.material.opacity = alfa;
            sp.position.set(x, y, z);
            const f = Math.max(0.8, Math.min(1.5, d / 6));
            sp.scale.set(1.2 * kx * f, 0.375 * f, 1);
        },
        ocultar() { sp.visible = false; alfa = 0; }
    };
}

// ---------------------------------------------------------
// Lugar libre para el globo (escenas con cámara de cine). Todo en coordenadas NDC (-1..1) de la cámara.
// `zonas` = puntos 3D { quien, tipo: 'cabeza' | 'pecho', x, y, z, r } en el sistema del padre del globo.
// ---------------------------------------------------------
const ESCALA_GLOBO = [3.0, 1.25];
const MARGEN_GLOBO = 0.04, TOPE_GLOBO = 0.9, ESCALAS_GLOBO = [1, 0.85, 0.7];
const vP = new THREE.Vector3();
// Punto del padre → NDC de la cámara (delante = false si queda detrás; entonces se empuja al borde)
function proyectarGlobo(camara, padre, x, y, z) {
    vP.set(x, y, z).applyMatrix4(padre.matrixWorld).applyMatrix4(camara.matrixWorldInverse); // la cámara mira a -Z
    const t = Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2), asp = camara.aspect;
    const delante = -vP.z > 0.2, prof = delante ? -vP.z : 2;
    let cx, cy;
    if (delante) { cx = vP.x / (prof * t * asp); cy = vP.y / (prof * t); }
    else { const L = Math.hypot(vP.x, vP.y); if (L > 1e-6) { cx = -vP.x / L * 4; cy = -vP.y / L * 4; } else { cx = 0; cy = -4; } }
    return { cx, cy, prof, t, asp, delante };
}
const solapeRect = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
// Elige el lugar del globo. previo = { id, esc } para mantener la candidata elegida mientras siga libre.
// Sin zonas devuelve solo el encaje clásico (corrido hacia dentro y achicado si no cabe).
function planearGlobo(camara, padre, ax, ay, az, zonas, franja, previo, soloActual = false) {
    padre.updateWorldMatrix(true, false);
    const P = proyectarGlobo(camara, padre, ax, ay, az), { prof, t, asp, delante } = P;
    const ms = padre.matrixWorld.getMaxScaleOnAxis();
    let hw0 = (ESCALA_GLOBO[0] * ms / 2) / (prof * t * asp), hh0 = (ESCALA_GLOBO[1] * ms / 2) / (prof * t);
    const k0 = Math.min(1, TOPE_GLOBO / hw0, TOPE_GLOBO * (1 - franja) / hh0);
    hw0 *= k0; hh0 *= k0;
    // Zonas a evitar: cuadrado de lado 2r a la profundidad de cada punto
    const rects = [];
    let cab = null, dMin = Infinity;
    for (const z of zonas || []) {
        const Q = proyectarGlobo(camara, padre, z.x, z.y, z.z);
        if (!Q.delante) continue;
        const hx = z.r / (Q.prof * Q.t * Q.asp), hy = z.r / (Q.prof * Q.t);
        const r = { quien: z.quien, tipo: z.tipo, x0: Q.cx - hx, x1: Q.cx + hx, y0: Q.cy - hy, y1: Q.cy + hy };
        rects.push(r);
        // La cabeza de quien habla = la más cercana al ancla del globo
        const d = z.tipo === 'cabeza' ? Math.hypot(z.x - ax, z.z - az) : Infinity;
        if (d < dMin) { dMin = d; cab = r; }
    }
    const clampC = (c, lo, hi) => (lo > hi ? 0 : Math.min(hi, Math.max(lo, c)));
    // Candidatas para una escala s: (a) la actual, (b,c) a los lados de la cabeza, (d,e) esquinas de arriba, (f..h) abajo
    function candidatas(s) {
        const k = k0 * s, hw = hw0 / k0 * k, hh = hh0 / k0 * k;
        const loX = -1 + MARGEN_GLOBO + hw, hiX = 1 - MARGEN_GLOBO - hw, loY = -1 + franja + MARGEN_GLOBO + hh, hiY = 1 - franja - MARGEN_GLOBO - hh;
        const hx = cab ? (cab.x0 + cab.x1) / 2 : P.cx, hy = cab ? (cab.y0 + cab.y1) / 2 : P.cy;
        const m = (id, x, y) => ({ id, k, hw, hh, x: clampC(x, loX, hiX), y: clampC(y, loY, hiY) });
        // Rejilla de respaldo (de la más cercana a la cabeza a la más lejana) por si las anteriores no bastan
        const rej = [];
        for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) rej.push(m('r' + i + '_' + j, loX + (hiX - loX) * i / 6, loY + (hiY - loY) * j / 4));
        const cerca = (...l) => l.sort((p, q) => Math.hypot(p.x - hx, p.y - hy) - Math.hypot(q.x - hx, q.y - hy));
        const g = 0.02;
        return [
            m('a', P.cx, P.cy),
            ...cerca(m('b', (cab ? cab.x0 : hx) - g - hw, hy), m('c', (cab ? cab.x1 : hx) + g + hw, hy)),
            ...cerca(m('d', loX, hiY), m('e', hiX, hiY)),
            ...cerca(m('f', hx, loY), m('g', loX, loY), m('h', hiX, loY)),
            ...cerca(...rej)
        ];
    }
    const medir = c => {
        const r = { x0: c.x - c.hw, x1: c.x + c.hw, y0: c.y - c.hh, y1: c.y + c.hh };
        let o = 0;
        for (const z of rects) o += solapeRect(r, z);
        c.rect = r; c.solape = o;
        return c;
    };
    let mejor = null, elegida = null;
    if (!rects.length || soloActual) elegida = medir(candidatas(1)[0]);
    else {
        if (previo) { // mantiene la candidata anterior si sigue libre
            const c = candidatas(previo.esc).find(x => x.id === previo.id);
            if (c && medir(c).solape === 0) { elegida = c; c.esc = previo.esc; }
        }
        for (let i = 0; !elegida && i < ESCALAS_GLOBO.length; i++) for (const c of candidatas(ESCALAS_GLOBO[i])) {
            medir(c); c.esc = ESCALAS_GLOBO[i];
            if (c.solape === 0) { elegida = c; break; }
            if (!mejor || c.solape < mejor.solape - 1e-9) mejor = c;
        }
        if (!elegida) elegida = mejor;
    }
    return { c: elegida, P, rects, cab, k0, libre: elegida.solape === 0, mantenida: !!(previo && elegida.id === previo.id && elegida.esc === previo.esc) };
}

// ---------------------------------------------------------
// Globo de diálogo: aparece al acercarse; las frases vienen en { es, en }
// ---------------------------------------------------------
export function crearGlobo(scene) {
    const ESCALA = ESCALA_GLOBO;
    const { c, tex, sp } = spriteLienzo(scene, 384, 160, ESCALA, true);
    let texto = '', alfa = 0;
    // Encaje en pantalla (escenas, con `camara`): si el globo se sale del encuadre lo corre hacia dentro;
    // si ocuparía más de ~90% del ancho o del alto lo achica. Si cabe, no cambia nada.
    // Con `evitar` (función que da las zonas de cabezas y torsos de la escena) además busca un lugar que no
    // las tape (ver planearGlobo) y lo mantiene mientras siga libre; solo cambia con texto nuevo o si se ocupa.
    const v = new THREE.Vector3(), vista = new THREE.Vector3();
    let previo = null, nuevo = true, ultimo = null, sinEvitar = false;
    function encajar(x, y, z, camara, renderer) {
        const padre = sp.parent;
        if (!padre) return;
        const franja = document.body.classList.contains('en-cine') ? 0.18 : 0;
        const zonas = evitar ? evitar() : null;
        const r = planearGlobo(camara, padre, x, y, z, zonas, franja, nuevo ? null : previo, sinEvitar);
        nuevo = false;
        const { c, P } = r;
        previo = zonas && zonas.length ? { id: c.id, esc: c.esc || 1 } : null;
        ultimo = { cuadro: renderer ? renderer.info.render.frame : 0, rect: { x0: c.rect.x0, y0: c.rect.y0, x1: c.rect.x1, y1: c.rect.y1 }, zonas: r.rects, franja, id: c.id, escala: c.k, libre: r.libre };
        if (c.k < 1) sp.scale.set(ESCALA[0] * c.k, ESCALA[1] * c.k, 1);
        if (P.delante && c.x === P.cx && c.y === P.cy) return; // cabe: se queda donde está
        // Des-proyecta a la misma profundidad y pasa a coordenadas del grupo
        vista.set(c.x * P.prof * P.t * P.asp, c.y * P.prof * P.t, -P.prof);
        v.copy(vista).applyMatrix4(camara.matrixWorld);
        padre.worldToLocal(v);
        sp.position.copy(v);
    }
    // El encaje se hace justo antes de dibujar, con la cámara de ese cuadro: la de cine se mueve después
    // de que las escenas actualizan sus globos (antes de eso la cámara sigue en primera persona)
    let encaje = null, evitar = null;
    sp.onBeforeRender = (renderer, escena, cam) => {
        if (!encaje || !cam.isPerspectiveCamera) return;
        sp.position.set(encaje[0], encaje[1], encaje[2]);
        sp.scale.set(ESCALA[0], ESCALA[1], 1);
        encajar(encaje[0], encaje[1], encaje[2], cam, renderer);
        sp.updateMatrixWorld();
    };
    const dibujar = () => {
        const ctx = c.getContext('2d');
        ctx.clearRect(0, 0, c.width, c.height);
        if (!texto) { tex.needsUpdate = true; return; }
        // Corte por palabras; si no cabe en 4 líneas se achica la letra (nunca se corta el texto)
        const partir = px => {
            ctx.font = px + 'px PixelCraft';
            const lineas = [];
            let linea = '';
            for (const p of texto.split(' ')) {
                const prueba = linea ? linea + ' ' + p : p;
                if (ctx.measureText(prueba).width > c.width - 36 && linea) { lineas.push(linea); linea = p; } else linea = prueba;
            }
            if (linea) lineas.push(linea);
            return lineas;
        };
        let px = 22, lineas = partir(px);
        while ((lineas.length > 4 || lineas.length * (px + 4) + 18 > c.height - 16) && px > 12) lineas = partir(px -= 2);
        const paso = px + 4;
        const alto = lineas.length * paso + 18;
        const y0 = Math.max(0, (c.height - 14 - alto) / 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.fillRect(6, y0, c.width - 12, alto);
        ctx.fillStyle = '#1d1d1d';
        ctx.fillRect(6, y0, c.width - 12, 3); ctx.fillRect(6, y0 + alto - 3, c.width - 12, 3);
        ctx.fillRect(6, y0, 3, alto); ctx.fillRect(c.width - 9, y0, 3, alto);
        // Colita del globo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.fillRect(c.width / 2 - 9, y0 + alto - 3, 18, 6);
        ctx.fillRect(c.width / 2 - 3, y0 + alto + 3, 6, 6);
        ctx.fillStyle = '#1d1d1d';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        lineas.forEach((l, i) => ctx.fillText(l, c.width / 2, y0 + 9 + paso / 2 + i * paso));
        tex.needsUpdate = true;
    };
    return {
        sp,
        decir(t) { if (t !== texto) { texto = t; nuevo = true; conFuente(dibujar); } },
        get texto() { return texto; },
        // Último cuadro encajado: { cuadro, rect (NDC), zonas, franja, id, escala, libre } (diagnóstico)
        get ultimo() { return ultimo; },
        get alfa() { return alfa; },
        set sinEvitar(b) { sinEvitar = !!b; nuevo = true; }, // depuración: el comportamiento de antes (solo mide)
        // ¿Hay lugar libre para el globo con esta cámara? (planos de prueba de la cámara de cine; no cambia nada)
        probar(cam, x, y, z, zonas, franja = 0.18) {
            const padre = sp.parent;
            if (!padre || !zonas || !zonas.length) return { libre: true, solape: 0 };
            const r = planearGlobo(cam, padre, x, y, z, zonas, franja, null);
            return { libre: r.libre, solape: r.c.solape, id: r.c.id };
        },
        actualizar(dt, visible, x, y, z, camara, zonasFn) {
            const objetivo = visible && texto ? 1 : 0;
            alfa += (objetivo - alfa) * Math.min(1, dt * 5);
            if (Math.abs(alfa - objetivo) < 0.01) alfa = objetivo;
            sp.visible = alfa > 0.01;
            if (!sp.visible) { previo = null; nuevo = true; ultimo = null; return; }
            sp.material.opacity = alfa;
            sp.position.set(x, y, z);
            sp.scale.set(ESCALA[0], ESCALA[1], 1);
            encaje = camara ? [x, y, z] : null;
            evitar = camara && zonasFn ? zonasFn : null;
            sp.frustumCulled = !encaje; // con encaje se dibuja aunque su punto quede fuera del encuadre
        }
    };
}

// ---------------------------------------------------------
// Audio del mundo: un solo AudioContext (perezoso, tras un gesto del usuario) y un interruptor
// «Sonidos del mundo» que apaga gatas, animales y música. Se guarda como antes ('venjy-mundo-silencio').
// ---------------------------------------------------------
let silencio = false;
try { silencio = localStorage.getItem('venjy-mundo-silencio') === '1'; } catch (e) { /* sin almacenamiento */ }
let audio = null; // { ctx, master }
const alIniciar = [];

export function iniciarAudio() {
    try {
        if (audio) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return audio; }
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = silencio ? 0 : 1;
        master.connect(ctx.destination);
        audio = { ctx, master };
        if (ctx.state === 'suspended') ctx.resume();
        for (const f of alIniciar) { try { f(audio); } catch (e) { /* sin sonido */ } }
        return audio;
    } catch (e) { audio = null; return null; }
}
for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(ev, function una() {
        iniciarAudio();
        for (const e of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(e, una);
    }, { passive: true });
}
// f(audio) se llama cuando exista el contexto (o al tiro si ya existe)
export function cuandoHayaAudio(f) { if (audio) f(audio); else alIniciar.push(f); }
export function audioMundo() { return audio; }
export function sonando() { return !!(audio && audio.ctx.state === 'running' && !silencio); }
export function silenciarMundo(valor = true) {
    silencio = !!valor;
    try { localStorage.setItem('venjy-mundo-silencio', silencio ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    try { if (audio) audio.master.gain.setTargetAtTime(silencio ? 0 : 1, audio.ctx.currentTime, 0.05); } catch (e) { /* sin sonido */ }
}
export function mundoSilenciado() { return silencio; }

// Ruido blanco reutilizable (batería, ronroneo, animales)
let ruidoBuf = null;
export function bufferRuido(ctx) {
    if (ruidoBuf && ruidoBuf.sampleRate === ctx.sampleRate) return ruidoBuf;
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = ruidoBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ruidoBuf;
}
