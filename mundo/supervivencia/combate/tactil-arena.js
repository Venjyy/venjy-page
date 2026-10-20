// =========================================================
// VENJY · Combate · controles táctiles de la arena (bloque 8 · N4, mundo/COMBATE.md §15.1)
// La capa DOM sobre combate/intenciones.js: joystick flotante en la mitad izquierda (nace donde se apoya el dedo),
// botones ATACAR, DEFENSA, SALTAR, AGARRE y ESPECIAL, y la zona libre de la derecha para esquivar deslizando.
// Cada dedo va por su lado (pointer events con captura), así que caminar y atacar a la vez funciona; nada de la
// derecha pide dos dedos. Posición y tamaño de los botones: ui-layout.json → arena (arrastrables en /estudio/,
// pestaña Layout, página Arena); rótulos: textos.json → arena; umbrales: combate.json → tactil.
// Todavía no la usa el juego: la arena llega en L1. La muestra estudio/vista-arena.html.
//   montarTactilArena({ intenciones, idioma, padre })  ->  { raiz, botones, mostrar(b), especial(b), rotular(clave, t), destruir() }
//   aplicarDatosVivos(nombre, datos)   el Estudio cambia ui-layout o textos sin recargar
// =========================================================
import { cargarDatos, fusionar, texto } from '../../datos/cargador.js';
import { aplicarLayout } from '../layout-datos.js';
import { COMBATE } from './datos.js';

export const BOTONES_ARENA = ['atacar', 'defensa', 'saltar', 'agarre', 'especial'];
const TEXTOS = {
    atacar: { es: 'ATACAR', en: 'ATTACK' },
    defensa: { es: 'DEFENSA', en: 'GUARD' },
    saltar: { es: 'SALTAR', en: 'JUMP' },
    agarre: { es: 'AGARRE', en: 'GRAB' },
    especial: { es: 'ESPECIAL', en: 'SPECIAL' }
};

let datosLayout = null, datosTextos = null;
const pendientes = new Set();
cargarDatos('ui-layout').then(d => { datosLayout = d; for (const f of pendientes) f(); });
cargarDatos('textos').then(d => { datosTextos = d; for (const f of pendientes) f(); });

export function aplicarDatosVivos(nombre, datos) {
    if (nombre === 'ui-layout') datosLayout = datos;
    else if (nombre === 'textos') datosTextos = datos;
    else return false;
    for (const f of pendientes) f();
    return true;
}

function cargarCSS(archivo) {
    const href = new URL(archivo, import.meta.url).href;
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === href)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
}

export function montarTactilArena({ intenciones, idioma = 'es', padre = document.body } = {}) {
    cargarCSS('../../tactil.css');
    cargarCSS('./tactil-arena.css');
    const raiz = document.createElement('div');
    raiz.className = 'tactil-arena';
    const base = document.createElement('div');
    base.className = 'ar-joy-base';
    const palanca = document.createElement('div');
    palanca.className = 'ar-joy-palanca';
    base.appendChild(palanca);
    raiz.appendChild(base);

    const botones = {};
    for (const k of BOTONES_ARENA) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `tactil-boton arena-boton ar-${k}`;
        b.dataset.control = k;
        raiz.appendChild(b);
        botones[k] = b;
    }
    padre.appendChild(raiz);
    document.body.classList.add('con-tactil');

    const propios = {};
    function rotular(clave, t) { if (t) propios[clave] = t; pintar(); }
    function pintar() {
        const tx = fusionar(TEXTOS, datosTextos && datosTextos.textos && datosTextos.textos.arena);
        for (const k of BOTONES_ARENA) {
            const t = propios[k] || tx[k];
            botones[k].dataset.es = texto(t, 'es');
            botones[k].dataset.en = texto(t, 'en');
            botones[k].textContent = texto(t, idioma);
        }
        aplicarLayout(datosLayout || {}, 'arena');
    }
    pendientes.add(pintar);
    pintar();

    // ---------- Dedos ----------
    const dedos = new Map(); // pointerId -> botón (o null)
    function dibujarJoy() {
        const j = intenciones.joystick();
        base.hidden = !j;
        if (!j) return;
        const r = COMBATE.tactil.joystick.radio;
        const dx = Math.max(-r, Math.min(r, j.x - j.x0));
        base.style.left = `${j.x0}px`;
        base.style.top = `${j.y0}px`;
        base.style.setProperty('--radio', `${r}px`);
        palanca.style.transform = `translate(${dx}px, 0)`;
    }
    function abajo(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        const b = e.target.closest && e.target.closest('.arena-boton');
        const ancho = raiz.getBoundingClientRect().width || innerWidth;
        const zona = b ? b.dataset.control : e.clientX < ancho * COMBATE.tactil.joystick.mitad ? 'joy' : 'libre';
        try { raiz.setPointerCapture(e.pointerId); } catch (err) { /* sin captura sigue funcionando */ }
        dedos.set(e.pointerId, b || null);
        if (b) b.classList.add('pulsado');
        intenciones.tactilAbajo(zona, e.pointerId, e.clientX, e.clientY, e.timeStamp);
        dibujarJoy();
    }
    function mover(e) {
        if (!dedos.has(e.pointerId)) return;
        intenciones.tactilMover(e.pointerId, e.clientX, e.clientY, e.timeStamp);
        dibujarJoy();
    }
    function arriba(e, cancelado) {
        if (!dedos.has(e.pointerId)) return;
        const b = dedos.get(e.pointerId);
        if (b) b.classList.remove('pulsado');
        dedos.delete(e.pointerId);
        if (cancelado) intenciones.tactilCancelar(e.pointerId);
        else intenciones.tactilArriba(e.pointerId, e.clientX, e.clientY, e.timeStamp);
        dibujarJoy();
    }
    const fin = e => arriba(e, false), cancelar = e => arriba(e, true);
    const menu = e => e.preventDefault();
    raiz.addEventListener('pointerdown', abajo);
    raiz.addEventListener('pointermove', mover);
    raiz.addEventListener('pointerup', fin);
    raiz.addEventListener('pointercancel', cancelar);
    raiz.addEventListener('contextmenu', menu);
    dibujarJoy();

    return {
        raiz, botones, rotular,
        mostrar(v) { raiz.hidden = !v; if (!v) { dedos.clear(); intenciones.soltarTodo(); dibujarJoy(); } },
        // ESPECIAL es contextual: solo aparece si hay barra
        especial(v) { botones.especial.hidden = !v; },
        destruir() {
            pendientes.delete(pintar);
            raiz.remove();
            aplicarLayout({}, 'arena');
        }
    };
}
