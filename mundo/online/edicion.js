// =========================================================
// VENJY · Romper y poner bloques (modo creativo, sin inventario real)
// Clic izquierdo rompe, clic derecho pone el bloque elegido en la hotbar (1-9 o rueda).
// Los cambios se aplican al instante en local y se mandan a la sala por la red.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B, BLOQUES, TIPO, TAM, COLS } from '../texturas.js';
import { ALTO } from '../voxeles.js';

const ALCANCE = 6;
const REPETIR_S = 0.2; // al mantener el botón

export const HOTBAR = [B.PIEDRA, B.TIERRA, B.TABLONES, B.LADRILLO, B.VIDRIO, B.CUARZO, B.TRONCO, B.ANTORCHA, B.PIEDRA_LUMINOSA];

const TXT = {
    es: { bloques: 'Bloques', ayuda: 'Clic izquierdo: romper · Clic derecho: poner · 1-9 o rueda: elegir bloque', ayudaTactil: 'ROMPER y PONER abajo a la derecha · toca la barra para elegir bloque' },
    en: { bloques: 'Blocks', ayuda: 'Left click: break · Right click: place · 1-9 or wheel: pick a block', ayudaTactil: 'BREAK and PLACE at the bottom right · tap the bar to pick a block' }
};

const NOMBRES = {
    es: { [B.PIEDRA]: 'Piedra', [B.TIERRA]: 'Tierra', [B.TABLONES]: 'Tablones', [B.LADRILLO]: 'Ladrillo', [B.VIDRIO]: 'Vidrio', [B.CUARZO]: 'Cuarzo', [B.TRONCO]: 'Tronco', [B.ANTORCHA]: 'Antorcha', [B.PIEDRA_LUMINOSA]: 'Piedra luminosa' },
    en: { [B.PIEDRA]: 'Stone', [B.TIERRA]: 'Dirt', [B.TABLONES]: 'Planks', [B.LADRILLO]: 'Bricks', [B.VIDRIO]: 'Glass', [B.CUARZO]: 'Quartz', [B.TRONCO]: 'Log', [B.ANTORCHA]: 'Torch', [B.PIEDRA_LUMINOSA]: 'Glowstone' }
};

export function crearEdicion({ mundo, jugador, camara, scene, hud, atlasLienzo, idioma = 'es', alCambiar }) {
    const t = TXT[idioma] || TXT.es;
    const estado = {
        activa: false,        // solo se edita dentro de una sala (offline el mundo queda igual que siempre)
        elegido: 0,
        permitirRomper: () => true,
        interceptarClicIzquierdo: null, // fn() => true si otro sistema (el combate) consumió el clic
        interceptarClicDerecho: null,   // fn(objetivo) => true si se usó (p. ej. abrir un cofre)
        objetivo: null
    };

    // ---- Selección visible del bloque apuntado ----
    const marco = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
        new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8, fog: false })
    );
    marco.visible = false;
    marco.renderOrder = 5;
    scene.add(marco);

    // ---- Hotbar ----
    const barra = document.createElement('div');
    barra.className = 'hotbar';
    barra.setAttribute('role', 'listbox');
    barra.setAttribute('aria-label', t.bloques);
    barra.hidden = true;
    const casillas = HOTBAR.map((id, i) => {
        const c = document.createElement('div');
        c.className = 'hotbar-casilla';
        const icono = document.createElement('canvas');
        icono.width = icono.height = TAM;
        const d = BLOQUES[id];
        const tile = d.lado;
        icono.getContext('2d').drawImage(atlasLienzo, (tile % COLS) * TAM, Math.floor(tile / COLS) * TAM, TAM, TAM, 0, 0, TAM, TAM);
        const n = document.createElement('span');
        n.textContent = String(i + 1);
        c.append(icono, n);
        barra.appendChild(c);
        return c;
    });
    // Nombre del bloque elegido y pista de controles sobre la barra
    const nombreEl = document.createElement('div');
    nombreEl.className = 'hotbar-nombre';
    nombreEl.hidden = true;
    const pistaEl = document.createElement('div');
    pistaEl.className = 'hotbar-pista';
    pistaEl.hidden = true;
    hud.append(barra, nombreEl, pistaEl);
    const tactil = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
    let ocultarNombre = 0, ocultarPista = 0, pistaFija = '';
    const marcar = () => casillas.forEach((c, i) => c.classList.toggle('activa', i === estado.elegido));
    marcar();

    function mostrarNombre() {
        nombreEl.textContent = (NOMBRES[idioma] || NOMBRES.es)[HOTBAR[estado.elegido]] || '';
        nombreEl.hidden = false;
        clearTimeout(ocultarNombre);
        ocultarNombre = setTimeout(() => { nombreEl.hidden = true; }, 1800);
    }
    // Pista temporal (segundos) o fija (la que pone otro sistema, p. ej. «abrir cofre»); '' la quita
    function pista(texto, segundos = 0) {
        clearTimeout(ocultarPista);
        if (segundos) {
            pistaEl.textContent = texto; pistaEl.hidden = !texto;
            ocultarPista = setTimeout(() => { pistaEl.textContent = pistaFija; pistaEl.hidden = !pistaFija; }, segundos * 1000);
        } else { pistaFija = texto; pistaEl.textContent = texto; pistaEl.hidden = !texto; }
    }

    function elegir(i) {
        estado.elegido = ((i % HOTBAR.length) + HOTBAR.length) % HOTBAR.length;
        marcar();
        mostrarNombre();
    }
    casillas.forEach((c, i) => {
        // Tocar o hacer clic en una casilla la elige (en el celular es la forma de cambiar de bloque)
        c.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); elegir(i); });
    });

    // ---- Rayo por la grilla de bloques (Amanatides-Woo) ----
    const dir = new THREE.Vector3();
    function apuntar() {
        camara.getWorldDirection(dir);
        const o = camara.position;
        let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
        const pasoX = Math.sign(dir.x), pasoY = Math.sign(dir.y), pasoZ = Math.sign(dir.z);
        const dx = dir.x ? Math.abs(1 / dir.x) : Infinity;
        const dy = dir.y ? Math.abs(1 / dir.y) : Infinity;
        const dz = dir.z ? Math.abs(1 / dir.z) : Infinity;
        let tx = dir.x ? ((pasoX > 0 ? x + 1 - o.x : o.x - x) * dx) : Infinity;
        let ty = dir.y ? ((pasoY > 0 ? y + 1 - o.y : o.y - y) * dy) : Infinity;
        let tz = dir.z ? ((pasoZ > 0 ? z + 1 - o.z : o.z - z) * dz) : Infinity;
        let previo = null, dist = 0;
        while (dist <= ALCANCE) {
            if (y < 0) return null;
            const id = y >= ALTO ? 0 : mundo.bloque(x, y, z);
            if (id === -1) return null; // chunk sin cargar
            if (id > 0 && (TIPO[id] === 1 || TIPO[id] === 2 || TIPO[id] === 4)) return { x, y, z, id, previo };
            previo = [x, y, z];
            if (tx < ty && tx < tz) { dist = tx; tx += dx; x += pasoX; }
            else if (ty < tz) { dist = ty; ty += dy; y += pasoY; }
            else { dist = tz; tz += dz; z += pasoZ; }
            if (y >= ALTO && pasoY >= 0) return null;
        }
        return null;
    }

    // ¿El bloque (x,y,z) se cruzaría con el jugador? (no se pone un bloque dentro de uno mismo)
    function chocaConJugador(x, y, z) {
        const p = jugador.pos, r = 0.3;
        return x + 1 > p.x - r && x < p.x + r && z + 1 > p.z - r && z < p.z + r && y + 1 > p.y && y < p.y + 1.8;
    }

    function romper() {
        const o = estado.objetivo;
        if (!o || o.y <= 0 || !estado.permitirRomper(o)) return;
        mundo.editar(o.x, o.y, o.z, B.AIRE);
        alCambiar && alCambiar(o.x, o.y, o.z, B.AIRE);
    }

    function poner() {
        const o = estado.objetivo;
        if (!o) return;
        let x, y, z;
        if (TIPO[o.id] === 4) { x = o.x; y = o.y; z = o.z; } // una planta se reemplaza
        else if (o.previo) [x, y, z] = o.previo;
        else return;
        if (y < 0 || y >= ALTO) return;
        const actual = mundo.bloque(x, y, z);
        if (actual === -1 || (actual !== 0 && actual !== B.AGUA && TIPO[actual] !== 4)) return;
        if (chocaConJugador(x, y, z)) return;
        const id = HOTBAR[estado.elegido];
        if (!estado.permitirPoner || estado.permitirPoner({ x, y, z, id })) {
            mundo.editar(x, y, z, id);
            alCambiar && alCambiar(x, y, z, id);
        }
    }

    let izquierdo = false, derecho = false, reloj = 0;
    // boton 0 = izquierdo (romper / golpear), 2 = derecho (poner / abrir). Lo usan el ratón y los botones táctiles.
    function abajo(boton) {
        if (!estado.activa || !jugador.activo) return;
        if (boton === 0) {
            if (estado.interceptarClicIzquierdo && estado.interceptarClicIzquierdo()) return;
            izquierdo = true; romper(); reloj = 0;
        } else if (boton === 2) {
            if (estado.interceptarClicDerecho && estado.interceptarClicDerecho(estado.objetivo)) return;
            derecho = true; poner(); reloj = 0;
        }
    }
    function arriba(boton) { if (boton === 0) izquierdo = false; if (boton === 2) derecho = false; }
    estado.abajo = abajo;
    estado.arriba = arriba;
    document.addEventListener('mousedown', e => abajo(e.button));
    document.addEventListener('mouseup', e => arriba(e.button));
    document.addEventListener('contextmenu', e => { if (estado.activa && jugador.activo) e.preventDefault(); });
    document.addEventListener('wheel', e => {
        if (!estado.activa || !jugador.activo) return;
        elegir(estado.elegido + (e.deltaY > 0 ? 1 : -1));
    }, { passive: true });
    document.addEventListener('keydown', e => {
        if (!estado.activa || !jugador.activo) return;
        const m = /^Digit([1-9])$/.exec(e.code);
        if (m) elegir(Number(m[1]) - 1);
    });
    window.addEventListener('blur', () => { izquierdo = derecho = false; });

    estado.actualizar = dt => {
        const ver = estado.activa && jugador.activo;
        barra.hidden = !estado.activa;
        if (estado.activa && !estado.ayudaMostrada && jugador.activo) {
            estado.ayudaMostrada = true;
            const tx = TXT[idioma] || TXT.es;
            pista(tactil ? tx.ayudaTactil : tx.ayuda, 7);
            mostrarNombre();
        }
        if (!ver) { marco.visible = false; estado.objetivo = null; izquierdo = derecho = false; return; }
        estado.objetivo = apuntar();
        const o = estado.objetivo;
        marco.visible = !!o;
        if (o) marco.position.set(o.x + 0.5, o.y + 0.5, o.z + 0.5);
        if (izquierdo || derecho) {
            reloj += dt;
            if (reloj >= REPETIR_S) { reloj = 0; if (izquierdo) romper(); else poner(); }
        }
    };
    estado.elegir = elegir;
    estado.pista = pista;
    return estado;
}
