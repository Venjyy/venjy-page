// =========================================================
// VENJY · Supervivencia · Carrera de gatas (7h-1): «Gran Premio del Living», el juego dentro del juego
// Desde el panel de Lona: un menú para elegir gata (seis, con su velocidad, aceleración y giro) y dificultad; luego
// la carrera en su propia escena (carrera-escena.js), que se dibuja en lugar del mundo mientras corres:
//   presentación (la cámara vuela por la pista con el nombre del gran premio; Espacio la salta) → semáforo con Lona
//   → 3 vueltas → al cruzar la meta, la cámara da la vuelta a tu gata → podio con la tabla de tiempos, el premio,
//   «Revancha» y «Salir».
// Manejo: W/↑ acelera, S/↓ frena, A/D o ←/→ dobla. Espacio (o Shift) salta; si caes doblando con Espacio apretado
// derrapas: las chispas pasan de azul a naranja a morado y al soltar sale un turbo más largo. En el aire, Espacio
// hace un truco (mini turbo al caer). Placas de flechas: turbo. Acelerar en el último segundo de la cuenta: arranque
// turbo. Si caes en el hueco del sofá, Lona te devuelve. Esc pausa. En el celular: botones grandes y acelerar solo.
// Objetos: las cajas «?» dan uno según tu puesto (ruleta en la casilla bajo el puesto); E o F lo usa (con S, el
// ovillo sale hacia atrás). Lo que te pasa (golpe, pescado, hierba, aspiradora) sale como aviso grande y sonido.
// HUD: vuelta, puesto, tiempo, tabla en vivo, minimapa, avisos grandes; líneas de velocidad con turbo; música de
// 8 bits que se apura en la última vuelta y sonidos sintetizados (sin archivos).
// Premio por puesto y amistad con Lona (minijuego `carrera`). Valores: mundo/datos/carrera.json (Estudio → Carrera).
// No editable aún: los textos (TXT_CARRERA), la música, los colores del HUD y los íconos de los objetos (ICONO_OBJ).
// Depuración: __venjy.carrera (abrir(), estado, elegir(clave, dificultad), saltarIntro(), saltarA(vuelta)).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B } from '../texturas.js';
import { O, nombreDe } from './objetos.js';
import { tono, ruido } from './sonidos.js';
import * as M from './carrera-modelo.js';
import { crearEscenaCarrera } from './carrera-escena.js';

const t = (es, en) => ({ es, en });
export const TXT_CARRERA = {
    elegir: t('Elige tu gata', 'Choose your cat'),
    dificultad: t('Dificultad', 'Difficulty'),
    niveles: { facil: t('Fácil', 'Easy'), normal: t('Normal', 'Normal'), dificil: t('Difícil', 'Hard') },
    stats: [t('Velocidad', 'Speed'), t('Aceleración', 'Acceleration'), t('Giro', 'Handling')],
    correr: t('¡A correr! (Enter)', 'Race! (Enter)'),
    volver: t('Volver (Esc)', 'Back (Esc)'),
    saltarIntro: t('Espacio: saltar la presentación', 'Space: skip intro'),
    vuelta: t('VUELTA', 'LAP'),
    ultima: t('¡ÚLTIMA VUELTA!', 'FINAL LAP!'),
    turbo: t('¡TURBO!', 'BOOST!'),
    turboMax: t('¡SÚPER TURBO!', 'SUPER BOOST!'),
    truco: t('¡TRUCO!', 'TRICK!'),
    cae: t('¡Uy! Lona te rescata', 'Whoops! Lona picks you up'),
    meta: t('¡META!', 'FINISH!'),
    ya: t('¡YA!', 'GO!'),
    pausa: t('Pausa', 'Paused'),
    seguir: t('Seguir (Esc)', 'Resume (Esc)'),
    salir: t('Salir', 'Leave'),
    revancha: t('Revancha', 'Rematch'),
    resultados: t('Resultados', 'Results'),
    tu: t('tú', 'you'),
    premio: t('Premio', 'Prize'),
    mejor: t('mejor vuelta', 'best lap'),
    ayuda: t('W acelera · S frena · A/D dobla · Espacio salta y, doblando, derrapa (suéltalo para el turbo) · E usa el objeto (con S, el ovillo va atrás) · Esc pausa', 'W gas · S brake · A/D steer · Space hops and, while turning, drifts (release for a boost) · E uses the item (with S, the yarn goes back) · Esc pause'),
    teclas: { izq: '<', der: '>', salto: t('SALTO', 'HOP'), freno: t('FRENO', 'BRAKE'), acel: t('ACELERAR', 'GAS'), objeto: t('OBJETO', 'ITEM') },
    usar: t('E: usar', 'E: use'),
    // Lo que te pasa con un objeto (aviso grande)
    golpe: t('¡Auch!', 'Ouch!'),
    come: t('¡Ñam! Un pescado', 'Yum! A fish'),
    reves: t('¡Hierba gatera! Todo al revés', 'Catnip! Everything is backwards'),
    susto: t('¡LA ASPIRADORA!', 'THE VACUUM!'),
    aspiradora: t('¡Lona prendió la aspiradora!', 'Lona turned on the vacuum!')
};
// Íconos de los objetos (12×12, se pintan en canvas; sin imágenes ni emojis). a = color del objeto (carrera.json),
// b = el mismo más oscuro, c y d = fijos de cada uno
const ICONO_OBJ = {
    pluma: { c: '#8a5a32', px: ['..........aa', '.........aab', '........aabb', '.......aabb.', '......aabb..', '.....aabb...', '....aabb....', '...aabb.....', '..aabb......', '..abb.......', '.c..........', 'c...........'] },
    ovillo: { c: '#f0f0f0', px: ['....aaaa....', '..aabbaaaa..', '.aaaabbaaaa.', '.abaaabbaaa.', 'aaabaaabbaaa', 'aaaabaaabbaa', 'aabaabaaabaa', 'aaabaabaaaba', '.aaabaabaaa.', '.aaaabaabaa.', '..aaaabaaa.c', '....aaaa..cc'] },
    caja: { c: '#ece2c4', px: ['............', '.bbbbbbbbbb.', '.baaaccaaab.', '.baaaccaaab.', '.bbbbccbbbb.', '.baaaaaaaab.', '.baaaaaaaab.', '.baaaaaaaab.', '.baaaaaaaab.', '.baaaaaaaab.', '.bbbbbbbbbb.', '............'] },
    pescado: { c: '#141414', px: ['............', '............', '...aaaa.....', '..aaaaaa..bb', '.acaaaaaabbb', 'aaaaaaaaabb.', 'aaaaaaaaabb.', '.abbaaaabbbb', '..aaaaaa..bb', '...aaaa.....', '............', '............'] },
    hierba: { c: '#2e6a2e', px: ['....aa......', '...aaaa.....', '..aabbaa....', '..aabbaa..a.', '...abba..aaa', '....cc..aaba', '.a..cc..abba', 'aaa.cc...ca.', 'aaba.c..c...', '.abb.ccc....', '...ccc......', '....c.......'] },
    aspiradora: { c: '#46464c', d: '#2a2a2e', px: ['......cc....', '.....c..c...', '....c....c..', '...c.....c..', '..c.......c.', '.aaaa......c', 'aaaaaa.....c', 'abaaaa....dd', 'aaaaaaaaaddd', 'aaaaaaaaaaa.', '.dd....dd...', '.dd....dd...'] }
};
function pintarIcono(k, clave, color, x, y, tam) {
    const ic = ICONO_OBJ[clave];
    if (!ic) return;
    const n = parseInt(String(color || '#888888').slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const pal = { a: `rgb(${rgb})`, b: `rgb(${rgb.map(v => Math.round(v * 0.68))})`, c: ic.c, d: ic.d || ic.c };
    const p = tam / 12;
    ic.px.forEach((fila, j) => { for (let i = 0; i < 12; i++) { const q = fila[i]; if (q === '.' || !q) continue; k.fillStyle = pal[q]; k.fillRect(x + i * p, y + j * p, Math.ceil(p), Math.ceil(p)); } });
}
const ORD = { es: ['1.º', '2.º', '3.º', '4.º', '5.º', '6.º', '7.º', '8.º'], en: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'] };

const CSS = `
body.en-carrera #hud, body.en-carrera .mira, body.en-carrera .tactil { display: none !important; }
.cr { font-family: 'PixelCraft', monospace; color: #fff; text-shadow: 2px 2px 0 #3f3f3f; }
.cr-capa { position: fixed; inset: 0; z-index: 60; pointer-events: none; display: none; }
.cr-capa.visible { display: block; }
.cr-caja { background: rgb(16 10 6 / 0.86); border: 3px solid #000; box-shadow: inset 3px 3px 0 #3a2a1c, inset -3px -3px 0 #0c0704; }
.cr-arriba { position: absolute; top: calc(10px + env(safe-area-inset-top, 0px)); left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
.cr-vuelta { padding: 6px 12px; font-size: 1.4rem; }
.cr-vuelta small { font-size: 0.85rem; color: #c6c6c6; display: block; }
.cr-puesto { padding: 2px 14px; font-size: 3rem; line-height: 1.1; color: #ffff55; text-shadow: 3px 3px 0 #3f3f15; text-align: right; }
.cr-puesto small { font-size: 1.1rem; color: #fff; text-shadow: 2px 2px 0 #3f3f3f; }
.cr-tabla { position: absolute; left: 12px; top: 96px; padding: 6px 8px; font-size: 0.85rem; min-width: 130px; }
.cr-tabla div { display: flex; gap: 6px; align-items: center; padding: 1px 0; }
.cr-tabla .yo { color: #ffff55; }
.cr-tabla i, .cr-gata b i { display: inline-block; width: 12px; height: 12px; border: 2px solid #000; }
.cr-mapa { position: absolute; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); width: 180px; height: 150px; }
.cr-objeto { position: absolute; right: 12px; top: calc(96px + env(safe-area-inset-top, 0px)); padding: 6px; text-align: center; font-size: 0.7rem; color: #c6c6c6; }
.cr-objeto canvas { display: block; width: 64px; height: 64px; image-rendering: pixelated; background: #2a2a2a; border: 3px solid #000; box-shadow: inset 2px 2px 0 #555, inset -2px -2px 0 #111; }
.cr-objeto.listo canvas { background: #4f7a2a; box-shadow: inset 2px 2px 0 #7aa84a, inset -2px -2px 0 #2c4a14; }
.cr-objeto span { display: block; margin-top: 3px; min-height: 1em; }
.cr-aviso { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); font-size: 3.2rem; color: #ffff55; text-shadow: 4px 4px 0 #3f3f15, -2px -2px 0 #000; white-space: nowrap; opacity: 0; transition: opacity 0.15s; }
.cr-aviso.visible { opacity: 1; }
.cr-semaforo { position: absolute; left: 50%; top: 13%; transform: translateX(-50%); display: none; gap: 10px; padding: 10px 14px; }
.cr-semaforo.visible { display: flex; }
.cr-semaforo b { width: 38px; height: 38px; background: #3a1010; border: 3px solid #000; }
.cr-semaforo b.rojo { background: #ff3a3a; box-shadow: 0 0 18px #ff3a3a; }
.cr-semaforo b.verde { background: #4aff5a; box-shadow: 0 0 18px #4aff5a; }
.cr-titulo { position: absolute; left: 50%; bottom: 16%; transform: translateX(-50%); padding: 10px 22px; font-size: 2.4rem; color: #ffff55; text-align: center; white-space: nowrap; }
.cr-titulo small { display: block; font-size: 0.9rem; color: #c6c6c6; }
.cr-ayuda { position: absolute; left: 50%; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); padding: 4px 10px; font-size: 0.75rem; color: #c6c6c6; max-width: 60vw; text-align: center; }
.cr-velocidad { position: absolute; inset: 0; opacity: 0; transition: opacity 0.2s; background: repeating-conic-gradient(from 0deg at 50% 52%, rgb(255 255 255 / 0.22) 0deg 1.2deg, transparent 1.2deg 9deg); -webkit-mask: radial-gradient(circle at 50% 52%, transparent 34%, #000 70%); mask: radial-gradient(circle at 50% 52%, transparent 34%, #000 70%); }
.cr-velocidad.visible { opacity: 1; }
.cr-menu, .cr-pausa, .cr-final { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 16px 18px; pointer-events: auto; max-width: 94vw; max-height: 92vh; overflow: auto; display: none; }
.cr-menu.visible, .cr-pausa.visible, .cr-final.visible { display: block; }
.cr-menu h2, .cr-final h2, .cr-pausa h2 { margin: 0 0 10px; font-size: 1.6rem; color: #ffff55; text-shadow: 3px 3px 0 #3f3f15; text-align: center; font-weight: normal; }
.cr-menu p { margin: 0 0 8px; text-align: center; }
.cr-gatas { display: grid; grid-template-columns: repeat(3, minmax(150px, 1fr)); gap: 8px; }
.cr-gata { padding: 8px; background: #2a2a2a; border: 3px solid #000; box-shadow: inset 2px 2px 0 #555, inset -2px -2px 0 #111; cursor: pointer; text-align: left; color: #fff; font: inherit; text-shadow: inherit; }
.cr-gata.sel { background: #4f7a2a; box-shadow: inset 2px 2px 0 #7aa84a, inset -2px -2px 0 #2c4a14; }
.cr-gata b { display: flex; align-items: center; gap: 6px; font-weight: normal; font-size: 1.05rem; margin-bottom: 4px; }
.cr-stat { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; color: #c6c6c6; }
.cr-stat span { width: 82px; }
.cr-stat u { flex: 1; height: 7px; background: #111; border: 1px solid #000; position: relative; text-decoration: none; }
.cr-stat u em { position: absolute; left: 0; top: 0; bottom: 0; background: #ffd040; }
.cr-niveles { display: flex; gap: 8px; justify-content: center; margin: 12px 0 6px; flex-wrap: wrap; align-items: center; }
.cr-niveles button, .cr-botones button { width: auto; margin: 0; padding: 8px 14px; }
.cr-niveles button.sel { background: #4f7a2a; }
.cr-botones { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.cr-final table { border-collapse: collapse; width: 100%; font-size: 0.95rem; }
.cr-final td { padding: 3px 8px; }
.cr-final tr.yo td { color: #ffff55; }
.cr-final .premio { margin-top: 8px; color: #7aff7a; text-align: center; font-size: 0.9rem; }
.cr-botonesT { position: absolute; inset: auto 0 calc(4vh + env(safe-area-inset-bottom, 0px)) 0; display: none; justify-content: space-between; padding: 0 3vw; }
.cr-botonesT.visible { display: flex; }
.cr-botonesT > div { display: flex; gap: 10px; align-items: flex-end; }
.cr-botonesT button { pointer-events: auto; min-width: 76px; min-height: 66px; margin: 0; font-size: 1.1rem; touch-action: none; user-select: none; -webkit-user-select: none; opacity: 0.85; }
.cr-botonesT button.activo { background: #4f7a2a; }
@media (max-width: 700px) { .cr-gatas { grid-template-columns: repeat(2, minmax(130px, 1fr)); } .cr-puesto { font-size: 2.2rem; } .cr-tabla, .cr-ayuda { display: none !important; } .cr-mapa { width: 120px; height: 100px; bottom: auto; top: 76px; } .cr-titulo { font-size: 1.5rem; } .cr-aviso { font-size: 2rem; } .cr-objeto { right: auto; left: 12px; top: 76px; } }
`;

// ctx: { jugador, inventario, entidades, hud, misiones, gatas, npcs, idioma, tactil(), puede(), bloquear(), liberar(), datos() }
export function crearCarrera(ctx) {
    const { inventario, entidades, misiones, jugador } = ctx;
    let L = ctx.idioma || 'es';
    const tx = o => (o ? o[L] || o.es : '');
    const reglas = () => M.reglasCarrera(ctx.datos && ctx.datos());

    // ---------- DOM ----------
    const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
    const el = (cls, padre, tag = 'div') => { const e = document.createElement(tag); if (cls) e.className = cls; padre.appendChild(e); return e; };
    const capa = el('cr cr-capa', document.body);
    const velEl = el('cr-velocidad', capa);
    const arriba = el('cr-arriba', capa);
    const vueltaEl = el('cr-caja cr-vuelta', arriba), puestoEl = el('cr-caja cr-puesto', arriba);
    const tablaEl = el('cr-caja cr-tabla', capa);
    const mapa = el('cr-caja cr-mapa', capa, 'canvas'); mapa.width = 180; mapa.height = 150;
    const objEl = el('cr-caja cr-objeto', capa), objLienzo = el('', objEl, 'canvas'), objNombre = el('', objEl, 'span');
    objLienzo.width = 48; objLienzo.height = 48;
    const avisoEl = el('cr-aviso', capa), semEl = el('cr-caja cr-semaforo', capa);
    const luces = [el('', semEl, 'b'), el('', semEl, 'b'), el('', semEl, 'b')];
    const tituloEl = el('cr-caja cr-titulo', capa), ayudaEl = el('cr-caja cr-ayuda', capa);
    const menuEl = el('cr-caja cr-menu', capa), pausaEl = el('cr-caja cr-pausa', capa), finalEl = el('cr-caja cr-final', capa);
    const tact = el('cr-botonesT', capa);
    const pulsado = new Set();
    function botonT(padre, k) {
        const b = el('boton', padre, 'button'); b.type = 'button';
        const on = e => { e.preventDefault(); pulsado.add(k); b.classList.add('activo'); };
        const off = e => { e.preventDefault(); pulsado.delete(k); b.classList.remove('activo'); };
        b.addEventListener('pointerdown', on); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, off);
        return b;
    }
    const tIzq = el('', tact), tDer = el('', tact);
    const bIzq = botonT(tIzq, 'izq'), bDer = botonT(tIzq, 'der'), bObjeto = botonT(tDer, 'objeto'), bSalto = botonT(tDer, 'salto'), bFreno = botonT(tDer, 'freno'), bAcel = botonT(tDer, 'acel');
    const boton = (padre, texto, f, cls = 'boton') => { const b = el(cls, padre, 'button'); b.type = 'button'; b.textContent = texto; b.addEventListener('click', e => { e.preventDefault(); f(); }); return b; };
    const mostrar = (e, v) => { e.style.display = v ? '' : 'none'; };

    // ---------- Teclado (propio: el jugador del mundo está bloqueado) ----------
    const teclas = new Set();
    const MANEJO = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF']);
    document.addEventListener('keydown', e => {
        if (!c) return;
        if (c.fase === 'menu' && c.vista) { if (e.code === 'Escape') { e.preventDefault(); cerrar(); } return; }
        if (c.fase === 'menu') {
            if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); correr(); }
            else if (e.code === 'Escape') { e.preventDefault(); cerrar(); }
            else if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) { e.preventDefault(); moverSel(e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 1); }
            else if (['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) { e.preventDefault(); moverSel(e.code === 'ArrowUp' || e.code === 'KeyW' ? -3 : 3); }
            e.stopPropagation();
            return;
        }
        if (c.fase === 'final') { if (e.code === 'Enter') { e.preventDefault(); revancha(); } else if (e.code === 'Escape') { e.preventDefault(); cerrar(); } e.stopPropagation(); return; }
        if (e.code === 'Escape' && !e.repeat) { e.preventDefault(); pausar(!c.pausa); e.stopPropagation(); return; }
        if (c.fase === 'intro' && (e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); empezarCuenta(); e.stopPropagation(); return; }
        if (MANEJO.has(e.code)) { e.preventDefault(); teclas.add(e.code); e.stopPropagation(); }
    }, true);
    document.addEventListener('keyup', e => teclas.delete(e.code), true);
    window.addEventListener('blur', () => { teclas.clear(); if (c && c.fase === 'corre') pausar(true); });
    capa.addEventListener('pointerdown', () => { if (c && c.fase === 'intro') empezarCuenta(); });
    const tiene = (...ks) => ks.some(k => teclas.has(k));
    function entrada() {
        const auto = c.tactil && c.R.tactil.autoAcelerar && !pulsado.has('freno');
        const ad = (tiene('KeyW', 'ArrowUp') || pulsado.has('acel') || auto ? 1 : 0) - (tiene('KeyS', 'ArrowDown') || pulsado.has('freno') ? 1 : 0);
        const giro = (tiene('KeyA', 'ArrowLeft') || pulsado.has('izq') ? 1 : 0) - (tiene('KeyD', 'ArrowRight') || pulsado.has('der') ? 1 : 0);
        return { ad, giro, salto: tiene('Space', 'ShiftLeft', 'ShiftRight') || pulsado.has('salto'), usar: tiene('KeyE', 'KeyF') || pulsado.has('objeto') };
    }

    // ---------- Sonido ----------
    const sfx = {
        salto: () => tono({ f0: 520, f1: 880, dur: 0.1, vol: 0.07, forma: 'square' }),
        nivel: n => tono({ f0: [660, 880, 1180][n] || 660, f1: [880, 1180, 1560][n] || 880, dur: 0.12, vol: 0.08, forma: 'square' }),
        turbo: () => { ruido({ dur: 0.35, frec: 900, q: 0.6, vol: 0.18 }); tono({ f0: 220, f1: 660, dur: 0.3, vol: 0.1, forma: 'sawtooth' }); },
        pared: () => ruido({ dur: 0.12, frec: 300, q: 0.8, vol: 0.22, tipo: 'lowpass' }),
        aterriza: () => ruido({ dur: 0.08, frec: 500, q: 1, vol: 0.12, tipo: 'lowpass' }),
        cae: () => tono({ f0: 700, f1: 120, dur: 0.6, vol: 0.12, forma: 'triangle' }),
        miau: () => { tono({ f0: 700, f1: 950, dur: 0.12, vol: 0.08, forma: 'triangle' }); tono({ f0: 950, f1: 600, dur: 0.22, vol: 0.08, forma: 'triangle', retardo: 0.12 }); },
        luz: verde => tono({ f0: verde ? 880 : 440, f1: verde ? 880 : 440, dur: verde ? 0.5 : 0.18, vol: 0.12, forma: 'square' }),
        vuelta: () => [660, 880].forEach((f, i) => tono({ f0: f, f1: f, dur: 0.12, vol: 0.08, forma: 'square', retardo: i * 0.1 })),
        meta: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tono({ f0: f, f1: f, dur: 0.16, vol: 0.09, forma: 'square', retardo: i * 0.12 })),
        caja: () => tono({ f0: 990, f1: 1320, dur: 0.08, vol: 0.07, forma: 'square' }),
        ruleta: () => tono({ f0: 1200, f1: 1200, dur: 0.03, vol: 0.03, forma: 'square' }),
        listo: () => [880, 1320].forEach((f, i) => tono({ f0: f, f1: f, dur: 0.08, vol: 0.07, forma: 'square', retardo: i * 0.07 })),
        lanza: () => tono({ f0: 600, f1: 300, dur: 0.15, vol: 0.08, forma: 'triangle' }),
        golpe: () => { ruido({ dur: 0.2, frec: 400, q: 0.7, vol: 0.2, tipo: 'lowpass' }); tono({ f0: 500, f1: 180, dur: 0.35, vol: 0.09, forma: 'square' }); },
        come: () => [0, 0.14, 0.28].forEach(r => tono({ f0: 420, f1: 520, dur: 0.07, vol: 0.06, forma: 'triangle', retardo: r })),
        reves: () => tono({ f0: 300, f1: 900, dur: 0.5, vol: 0.06, forma: 'sine' }),
        aspiradora: () => { ruido({ dur: 1.2, frec: 1800, q: 0.4, vol: 0.12 }); tono({ f0: 140, f1: 220, dur: 1.2, vol: 0.05, forma: 'sawtooth' }); }
    };
    // Música de 8 bits: bajo y melodía en bucle (4 compases de 16 semicorcheas); se apura en la última vuelta
    const BAJO = [45, 45, 52, 45, 43, 43, 50, 43, 41, 41, 48, 41, 43, 43, 50, 47];
    const MEL = [69, 0, 72, 74, 76, 0, 74, 72, 74, 0, 71, 0, 72, 74, 72, 71, 69, 0, 72, 74, 76, 79, 76, 74, 77, 76, 74, 72, 71, 72, 74, 0,
        69, 0, 72, 74, 76, 0, 74, 72, 74, 0, 71, 0, 72, 0, 76, 0, 77, 76, 74, 72, 74, 72, 71, 69, 71, 72, 71, 67, 69, 0, 0, 0];
    const fr = n => 440 * Math.pow(2, (n - 69) / 12);
    let musT = 0, musPaso = 0;
    function musica(dt) {
        if (!c || c.pausa || !['cuenta', 'corre'].includes(c.fase)) return;
        const corchea = 60 / (c.ultima ? 168 : 150) / 2;
        musT += dt;
        while (musT >= corchea) {
            musT -= corchea;
            const i = musPaso++ % 64;
            if (i % 2 === 0) { const b = fr(BAJO[(i >> 1) % 16] - 12); tono({ f0: b, f1: b, dur: corchea * 1.6, vol: 0.05, forma: 'triangle' }); }
            const n = MEL[i];
            if (n && c.fase === 'corre') tono({ f0: fr(n), f1: fr(n), dur: corchea * 0.85, vol: 0.025, forma: 'square' });
            if (i % 4 === 0) ruido({ dur: 0.03, frec: 6000, q: 1, vol: 0.02, tipo: 'highpass' });
        }
    }

    // ---------- Estado ----------
    // c = { fase: 'menu'|'intro'|'cuenta'|'corre'|'fin'|'final', R, P, gs, yo (índice de tu gata), t (s de carrera), tc (s reales) }
    let c = null, esc = null, escClave = '';
    const cam = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
    const camPos = new THREE.Vector3(), camMira = new THREE.Vector3();
    let sel = 0, dificultad = 'normal';
    const claveEscena = R => JSON.stringify([R.pista, R.muebles, R.sala, R.gatas.map(g => [g.clave, g.pelaje, g.escala, g.panuelo]), R.objetos.activos, R.objetos.cuantas, M.OBJETOS.map(k => R.objetos[k] && R.objetos[k].color), L]);

    function prepararEscena(R) {
        const clave = claveEscena(R);
        if (esc && clave === escClave) return esc;
        if (esc) esc.destruir();
        const P = M.armarPista(R);
        const lona = ctx.npcs ? ctx.npcs.lista.find(n => n.clave === 'lona') : null;
        esc = crearEscenaCarrera({ R, pista: P, gatasMundo: ctx.gatas ? ctx.gatas.gatas : null, lona, idioma: L });
        esc.P = P; escClave = clave;
        return esc;
    }

    // ---------- Menú: elegir gata y dificultad ----------
    function pintarMenu() {
        const R = c.R;
        menuEl.textContent = '';
        el('', menuEl, 'h2').textContent = tx(R.nombre);
        el('', menuEl, 'p').textContent = tx(TXT_CARRERA.elegir);
        const grid = el('cr-gatas', menuEl);
        R.gatas.forEach((g, i) => {
            const b = el('cr-gata' + (i === sel ? ' sel' : ''), grid, 'button'); b.type = 'button';
            const nom = el('', b, 'b'); const ic = el('', nom, 'i'); ic.style.background = esc.gatas[i] ? esc.gatas[i].color : '#888'; nom.append(g.nombre);
            ['vel', 'acel', 'giro'].forEach((k, j) => {
                const f = el('cr-stat', b); el('', f, 'span').textContent = tx(TXT_CARRERA.stats[j]);
                const u = el('', f, 'u'); const em = el('', u, 'em'); em.style.width = `${Math.max(6, Math.min(100, ((g[k] ?? 1) - 0.88) / 0.24 * 100))}%`;
            });
            b.addEventListener('click', () => { sel = i; pintarMenu(); });
            b.addEventListener('dblclick', () => { sel = i; correr(); });
        });
        const nv = el('cr-niveles', menuEl);
        el('', nv, 'span').textContent = tx(TXT_CARRERA.dificultad) + ':';
        for (const k of ['facil', 'normal', 'dificil']) { const b = boton(nv, tx(TXT_CARRERA.niveles[k]), () => { dificultad = k; pintarMenu(); }); if (k === dificultad) b.classList.add('sel'); }
        const bt = el('cr-botones', menuEl);
        boton(bt, tx(TXT_CARRERA.correr), correr);
        boton(bt, tx(TXT_CARRERA.volver), cerrar, 'boton secundario');
    }
    function moverSel(d) { const n = c.R.gatas.length; sel = ((sel + d) % n + n) % n; pintarMenu(); }

    // ---------- Abrir y cerrar ----------
    function abrir(pref = null) {
        if (c) return false;
        if (ctx.puede && !ctx.puede()) return false;
        const R = reglas();
        prepararEscena(R);
        if (pref) { const i = R.gatas.findIndex(g => g.clave === pref); if (i >= 0) sel = i; }
        if (sel >= R.gatas.length) sel = 0;
        dificultad = dificultad || R.dificultad;
        c = { fase: 'menu', R, P: esc.P, tactil: !!(ctx.tactil && ctx.tactil()), t: 0, tc: 0 };
        c.gs = R.gatas.map((d, k) => M.nuevaGata(esc.P, R, d, k));
        ctx.bloquear();
        if (document.pointerLockElement) document.exitPointerLock();
        document.body.classList.add('en-carrera');
        capa.classList.add('visible');
        for (const e of [arriba, tablaEl, mapa, ayudaEl, tituloEl, objEl]) mostrar(e, false);
        tact.classList.remove('visible');
        menuEl.classList.add('visible');
        pintarMenu();
        return true;
    }
    function correr() {
        const R = { ...reglas(), dificultad };
        prepararEscena(R);
        const P = esc.P;
        // Tú partes al final de la parrilla (como en los karts); las demás en orden
        const orden = R.gatas.map((d, i) => i).filter(i => i !== sel); orden.push(sel);
        const gs = new Array(R.gatas.length);
        orden.forEach((i, k) => { gs[i] = M.nuevaGata(P, R, R.gatas[i], k); });
        esc.podio.visible = false;
        const tactil = c ? c.tactil : !!(ctx.tactil && ctx.tactil());
        c = { fase: 'intro', R, P, gs, yo: sel, t: 0, tc: 0, rnd: M.azar((Math.random() * 1e9) | 0), ultima: false, pausa: false, tactil, sacudir: 0, acelCuenta: 0, mapaEsc: null, W: M.nuevosObjetos(R, P), firmaObj: '' };
        firmaTabla = '';
        for (const e of [menuEl, finalEl, pausaEl, avisoEl, velEl]) e.classList.remove('visible');
        for (const e of [arriba, tablaEl, mapa, ayudaEl, objEl]) mostrar(e, false);
        tituloEl.textContent = ''; tituloEl.append(tx(R.nombre));
        const sm = document.createElement('small'); sm.textContent = tx(TXT_CARRERA.saltarIntro); tituloEl.appendChild(sm);
        mostrar(tituloEl, true);
        luces.forEach(b => { b.className = ''; });
        musPaso = 0; musT = 0;
    }
    function empezarCuenta() {
        if (!c || c.fase !== 'intro') return;
        c.fase = 'cuenta'; c.t = -c.R.cuenta - 0.6;
        mostrar(tituloEl, false);
        semEl.classList.add('visible');
        for (const e of [arriba, tablaEl, mapa]) mostrar(e, true);
        mostrar(objEl, !!c.R.objetos.activos); mostrar(bObjeto, !!c.R.objetos.activos);
        mostrar(ayudaEl, !c.tactil); ayudaEl.textContent = tx(TXT_CARRERA.ayuda);
        tact.classList.toggle('visible', c.tactil);
        bIzq.textContent = TXT_CARRERA.teclas.izq; bDer.textContent = TXT_CARRERA.teclas.der; bSalto.textContent = tx(TXT_CARRERA.teclas.salto); bFreno.textContent = tx(TXT_CARRERA.teclas.freno); bAcel.textContent = tx(TXT_CARRERA.teclas.acel); bObjeto.textContent = tx(TXT_CARRERA.teclas.objeto);
        mostrar(bAcel, !c.R.tactil.autoAcelerar);
        c.camLista = false;
    }
    function cerrar() {
        if (!c) return;
        c = null;
        for (const e of [menuEl, pausaEl, finalEl, semEl, avisoEl, velEl, tact]) e.classList.remove('visible');
        capa.classList.remove('visible');
        document.body.classList.remove('en-carrera');
        teclas.clear(); pulsado.clear();
        ctx.liberar();
    }
    function pausar(v) {
        if (!c || !['intro', 'cuenta', 'corre', 'fin'].includes(c.fase)) return;
        c.pausa = v;
        pausaEl.classList.toggle('visible', v);
        if (v) {
            pausaEl.textContent = '';
            el('', pausaEl, 'h2').textContent = tx(TXT_CARRERA.pausa);
            const bt = el('cr-botones', pausaEl);
            boton(bt, tx(TXT_CARRERA.seguir), () => pausar(false));
            boton(bt, tx(TXT_CARRERA.revancha), revancha, 'boton secundario');
            boton(bt, tx(TXT_CARRERA.salir), cerrar, 'boton secundario');
        }
    }
    function revancha() { correr(); }
    function aviso(txt, dur = 1.4) { avisoEl.textContent = txt; avisoEl.classList.add('visible'); c.avisoHasta = c.tc + dur; }

    // ---------- Final ----------
    function terminarCarrera() {
        c.fase = 'final'; c.tFinal = 0;
        const orden = M.puestos(c.gs), mia = c.gs[c.yo], puesto = orden.indexOf(mia);
        esc.ponerPodio(orden);
        semEl.classList.remove('visible'); velEl.classList.remove('visible'); tact.classList.remove('visible'); avisoEl.classList.remove('visible');
        for (const e of [arriba, tablaEl, mapa, ayudaEl, objEl]) mostrar(e, false);
        finalEl.textContent = '';
        el('', finalEl, 'h2').textContent = `${tx(TXT_CARRERA.resultados)} · ${ORD[L][puesto] || ORD.es[puesto]}`;
        const tb = el('', finalEl, 'table');
        orden.forEach((g, i) => {
            const tr = el(g === mia ? 'yo' : '', tb, 'tr');
            el('', tr, 'td').textContent = ORD[L][i] || i + 1;
            el('', tr, 'td').textContent = g.def.nombre + (g === mia ? ` (${tx(TXT_CARRERA.tu)})` : '');
            el('', tr, 'td').textContent = g.fin !== null ? `${g.fin.toFixed(2).replace('.', ',')} s` : '--';
            el('', tr, 'td').textContent = g.tiempos.length ? `${tx(TXT_CARRERA.mejor)} ${Math.min(...g.tiempos).toFixed(2).replace('.', ',')}` : '';
        });
        const dados = darPremio(c.R.premio.puestos[puesto] || c.R.premio.resto);
        if (dados.length) el('premio', finalEl).textContent = `${tx(TXT_CARRERA.premio)}: ${dados.join(', ')}`;
        const bt = el('cr-botones', finalEl);
        boton(bt, tx(TXT_CARRERA.revancha) + ' (Enter)', revancha);
        boton(bt, tx(TXT_CARRERA.salir) + ' (Esc)', cerrar, 'boton secundario');
        const yo = c;
        setTimeout(() => { if (c === yo && c.fase === 'final') finalEl.classList.add('visible'); }, 1800);
        misiones.estado.minijuegos.add('carrera');
        if (misiones.alMinijuego) misiones.alMinijuego('carrera', puesto === 0 ? 'gana' : 'pierde');
        c.puesto = puesto;
    }
    function darPremio(lista) {
        const dados = [];
        for (const [clave, n] of lista || []) {
            const id = O[clave] ?? B[clave];
            if (id == null || !(n > 0)) continue;
            const resto = inventario.agregar(id, n);
            if (resto) entidades.soltar(id, resto, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
            dados.push(`${n > 1 ? n + ' × ' : ''}${nombreDe(id, L)}`);
        }
        return dados;
    }

    // ---------- Cámaras ----------
    const vM = new THREE.Vector3(), vMi = new THREE.Vector3();
    function camaraSeguir(dt) {
        const g = c.gs[c.yo], C = c.R.camara;
        const yaw = g.yaw + (g.derrape ? g.derrape * 0.25 : 0);
        vM.set(g.x - Math.sin(yaw) * C.distancia, g.y + C.alto, g.z - Math.cos(yaw) * C.distancia);
        vMi.set(g.x + Math.sin(g.yaw) * C.mira, g.y + 0.9, g.z + Math.cos(g.yaw) * C.mira);
        if (!c.camLista) { camPos.copy(vM); camMira.copy(vMi); c.camLista = true; }
        const k = 1 - Math.exp(-C.suave * dt);
        camPos.lerp(vM, k); camMira.lerp(vMi, Math.min(1, k * 1.6));
        if (camPos.y < g.y + 0.6) camPos.y = g.y + 0.6;
        cam.position.copy(camPos);
        if (c.sacudir > 0) { cam.position.x += (Math.random() - 0.5) * c.sacudir; cam.position.y += (Math.random() - 0.5) * c.sacudir; c.sacudir = Math.max(0, c.sacudir - dt * 2); }
        cam.lookAt(camMira);
        const F = M.fisicaDe(c.R, g);
        const fovMeta = g.turbo > 0 ? C.fovTurbo : C.fov + Math.max(0, g.v / F.vel - 0.6) * 10;
        cam.fov += (fovMeta - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix();
    }
    function camaraIntro() {
        const P = c.P, u = Math.min(1, c.tc / c.R.intro);
        // Vuela sobre la pista (de la mitad de la vuelta hasta la salida), alto para no atravesar los muebles
        const s = P.largo * (0.5 + u * 0.5) - 14, q = M.puntoPista(P, s, 0), q2 = M.puntoPista(P, s + 22, 0);
        cam.position.set(q.x, Math.max(q.y, q2.y) + 15 - u * 6, q.z);
        cam.lookAt(q2.x, q2.y, q2.z); cam.fov = 70; cam.updateProjectionMatrix();
    }
    function camaraMenu() {
        const a = c.t * (c.vista ? 0.06 : 0.12), S = c.R.sala, alto = c.vista ? 70 : 36;
        cam.position.set(S.x + Math.sin(a) * S.ancho * 0.42, alto, S.z + Math.cos(a) * S.fondo * 0.4); cam.lookAt(S.x, 2, S.z); cam.fov = 62; cam.updateProjectionMatrix();
    }
    function camaraPodio() {
        const p = esc.podio.position, a = esc.podio.rotation.y + Math.sin(c.tFinal * 0.35) * 0.45;
        cam.position.set(p.x + Math.sin(a) * 10, 4.2, p.z + Math.cos(a) * 10); cam.lookAt(p.x, 2.4, p.z); cam.fov = 60; cam.updateProjectionMatrix();
    }
    function camaraMeta(dt) {
        const g = c.gs[c.yo]; c.orbita = (c.orbita || 0) + dt * 0.8;
        const a = g.yaw + Math.PI + c.orbita;
        cam.position.set(g.x + Math.sin(a) * 5, g.y + 2.2, g.z + Math.cos(a) * 5);
        cam.lookAt(g.x, g.y + 0.6, g.z);
    }

    // ---------- HUD ----------
    let firmaTabla = '';
    function pintarHud() {
        const R = c.R, P = c.P, g = c.gs[c.yo];
        const orden = M.puestos(c.gs), pu = orden.indexOf(g);
        vueltaEl.textContent = `${tx(TXT_CARRERA.vuelta)} ${M.vueltaDe(g, R, P)}/${R.vueltas}`;
        const sm = document.createElement('small'); sm.textContent = `${Math.max(0, g.fin ?? c.t).toFixed(2).replace('.', ',')} s`; vueltaEl.appendChild(sm);
        puestoEl.textContent = ORD[L][pu] || ORD.es[pu]; const s2 = document.createElement('small'); s2.textContent = ` /${c.gs.length}`; puestoEl.appendChild(s2);
        const firma = orden.map(x => x.k).join();
        if (firma !== firmaTabla) {
            firmaTabla = firma; tablaEl.textContent = '';
            orden.forEach((x, i) => {
                const fila = el(x === g ? 'yo' : '', tablaEl);
                fila.append(`${i + 1}`); const ic = el('', fila, 'i'); ic.style.background = esc.gatas[c.gs.indexOf(x)].color; fila.append(x.def.nombre);
            });
        }
        velEl.classList.toggle('visible', g.turbo > 0 && c.fase === 'corre');
        // Casilla del objeto: la ruleta pasa por los íconos y se detiene en el que salió
        if (R.objetos.activos) {
            const ruleta = g.ruleta > 0, clave = ruleta ? M.OBJETOS[Math.floor(c.tc * 14) % M.OBJETOS.length] : g.objeto;
            const firma = `${clave}|${ruleta}`;
            if (firma !== c.firmaObj) {
                c.firmaObj = firma;
                const k = objLienzo.getContext('2d'); k.clearRect(0, 0, 48, 48);
                if (clave) pintarIcono(k, clave, R.objetos[clave].color, 4, 4, 40);
                if (ruleta) sfx.ruleta();
                objEl.classList.toggle('listo', !!g.objeto && !ruleta);
                objNombre.textContent = g.objeto && !ruleta ? `${tx(R.objetos[g.objeto].nombre)}${c.tactil ? '' : ' · ' + tx(TXT_CARRERA.usar)}` : '';
            }
        }
        // Minimapa
        const k = mapa.getContext('2d'), W = mapa.width, Hh = mapa.height;
        if (!c.mapaEsc) {
            let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
            for (const q of P.m) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); z0 = Math.min(z0, q.z); z1 = Math.max(z1, q.z); }
            const e = Math.min((W - 20) / (x1 - x0), (Hh - 20) / (z1 - z0));
            c.mapaEsc = { e, ox: (W - (x1 - x0) * e) / 2 - x0 * e, oz: (Hh - (z1 - z0) * e) / 2 - z0 * e };
        }
        const { e, ox, oz } = c.mapaEsc, mx = x => ox + x * e, mz = z => oz + z * e;
        k.clearRect(0, 0, W, Hh);
        k.lineJoin = 'round';
        k.lineWidth = 7; k.strokeStyle = '#111'; k.beginPath();
        P.m.forEach((q, i) => (i ? k.lineTo(mx(q.x), mz(q.z)) : k.moveTo(mx(q.x), mz(q.z)))); k.closePath(); k.stroke();
        k.lineWidth = 3; k.strokeStyle = '#9a9a9a'; k.stroke();
        k.fillStyle = '#ffffff'; k.fillRect(mx(P.m[0].x) - 3, mz(P.m[0].z) - 3, 6, 6);
        c.gs.forEach((x, i) => { if (x === g) return; k.fillStyle = esc.gatas[i].color; k.fillRect(mx(x.x) - 3, mz(x.z) - 3, 6, 6); });
        k.fillStyle = '#ffff55'; k.strokeStyle = '#000'; k.lineWidth = 2; k.fillRect(mx(g.x) - 4, mz(g.z) - 4, 8, 8); k.strokeRect(mx(g.x) - 4, mz(g.z) - 4, 8, 8);
    }

    // ---------- Bucle ----------
    function paso(dt) {
        const R = c.R, P = c.P;
        if (c.fase === 'cuenta') {
            const antes = Math.ceil(-c.t);
            c.t += dt;
            const n = Math.ceil(-c.t);
            const encendidas = Math.max(0, Math.min(3, R.cuenta + 1 - n));
            luces.forEach((b, i) => { b.className = i < encendidas ? 'rojo' : ''; });
            if (n !== antes && n > 0 && n <= R.cuenta) sfx.luz(false);
            esc.animarLona(c.t > -R.cuenta ? 'arriba' : 'quieta', c.tc);
            // Arranque turbo: acelerar solo en el último segundo (antes de tiempo no vale)
            const ad = entrada().ad > 0;
            if (ad) c.acelCuenta = -c.t < 1 ? c.acelCuenta + dt : -9;
            if (c.t >= 0) {
                c.fase = 'corre'; c.t = 0;
                luces.forEach(b => { b.className = 'verde'; }); sfx.luz(true);
                aviso(tx(TXT_CARRERA.ya), 0.8);
                esc.animarLona('baja', c.tc);
                const g = c.gs[c.yo];
                if (c.acelCuenta > 0.1 && c.acelCuenta < 0.8) { g.turbo = M.fisicaDe(R, g).turbos[1]; aviso(tx(TXT_CARRERA.turbo), 1); sfx.turbo(); }
                const yo = c;
                setTimeout(() => { if (c === yo) semEl.classList.remove('visible'); }, 900);
            }
            return;
        }
        if (c.fase !== 'corre' && c.fase !== 'fin') return;
        c.t += dt;
        const extra = { gs: c.gs, W: c.W };
        const ents = c.gs.map((g, i) => (i === c.yo && c.fase === 'corre' ? entrada() : M.entradaIA(g, R, P, c.rnd, c.gs[c.yo], extra)));
        for (let i = 0; i < c.gs.length; i++) {
            const g = c.gs[i];
            const ev = M.pasoGata(g, ents[i], dt, R, P, c.t);
            if (i !== c.yo) continue;
            for (const e of ev) {
                if (e === 'salto') sfx.salto();
                else if (e === 'nivel') sfx.nivel(g.nivel);
                else if (e === 'turbo') { sfx.turbo(); aviso(tx(g.turbo > 1.3 ? TXT_CARRERA.turboMax : TXT_CARRERA.turbo), 0.8); c.sacudir = 0.12; }
                else if (e === 'placa') { sfx.turbo(); c.sacudir = 0.08; }
                else if (e === 'truco') { esc.estrellas(g.x, g.y, g.z); aviso(tx(TXT_CARRERA.truco), 0.8); sfx.miau(); }
                else if (e === 'pared') { sfx.pared(); c.sacudir = 0.25; }
                else if (e === 'aterriza') { sfx.aterriza(); c.sacudir = Math.max(c.sacudir, 0.1); }
                else if (e === 'cae') { sfx.cae(); aviso(tx(TXT_CARRERA.cae), 1.6); }
                else if (e === 'vuelta') { sfx.vuelta(); if (M.vueltaDe(g, R, P) === R.vueltas) { c.ultima = true; aviso(tx(TXT_CARRERA.ultima), 2); } }
                else if (e === 'meta') { sfx.meta(); aviso(tx(TXT_CARRERA.meta), 2.2); c.fase = 'fin'; c.tMeta = c.t; esc.confeti(g.x, g.y, g.z); }
            }
        }
        // Objetos: cajas, ruleta, lo que se usa y a quién le pega
        for (const e of M.pasoObjetos(c.W, c.gs, ents, dt, R, P, c.rnd)) {
            const g = c.gs[e.k], mia = e.k === c.yo, mio = e.de === c.yo;
            if (e.e === 'usa' && e.o === 'aspiradora') {
                const delante = c.gs.filter(x => x.av > g.av && x.fin === null).reduce((a, x) => Math.max(a, x.av), g.av);
                esc.lanzarAspiradora(g.av, delante + 8, R.objetos.aspiradora.segundos * 0.7);
                sfx.aspiradora(); if (!mia) aviso(tx(TXT_CARRERA.aspiradora), 1.4);
            }
            if (e.e === 'usa' && e.o === 'hierba') for (let k = 0; k < 18; k++) esc.emitir(g.x, g.y + 0.8, g.z, (Math.random() - 0.5) * 8, 1 + Math.random() * 2, (Math.random() - 0.5) * 8, k % 2 ? '#5ac85a' : '#a8f07a', 0.8, 0.22, 2);
            if (e.e === 'golpe') esc.estrellas(g.x, g.y, g.z);
            if (mia) {
                if (e.e === 'caja') sfx.caja();
                else if (e.e === 'listo') sfx.listo();
                else if (e.e === 'usa') { if (e.o === 'pluma') { sfx.turbo(); aviso(tx(TXT_CARRERA.turbo), 0.8); } else if (e.o !== 'aspiradora') sfx.lanza(); }
                else if (e.e === 'golpe') { sfx.golpe(); aviso(tx(TXT_CARRERA.golpe), 1.2); c.sacudir = 0.35; }
                else if (e.e === 'come') { sfx.come(); aviso(tx(TXT_CARRERA.come), 1.4); }
                else if (e.e === 'reves') { sfx.reves(); aviso(tx(TXT_CARRERA.reves), 1.8); }
                else if (e.e === 'susto') { aviso(tx(TXT_CARRERA.susto), 1.4); c.sacudir = 0.3; }
            } else if (mio && (e.e === 'golpe' || e.e === 'come')) sfx.miau(); // le diste a otra
        }
        M.chocarGatas(c.gs, R);
        if (c.fase === 'fin') esc.animarLona('agita', c.tc);
        // Cierre: 5 s después de tu llegada (las que faltan quedan con el puesto que llevan) o al llegar todas
        if (c.fase === 'fin' && (c.t - c.tMeta > 5 || c.gs.every(g => g.fin !== null))) terminarCarrera();
        else if (c.fase === 'corre' && c.t > R.tope) { c.fase = 'fin'; c.tMeta = c.t; }
    }

    function actualizar(dt) {
        if (!c) return;
        dt = Math.min(dt, 0.05);
        musica(dt);
        if (c.pausa) return;
        c.tc += dt;
        // Valores en vivo del Estudio: si cambió la pista o los muebles, se vuelve a armar la escena y la carrera
        if (ctx.datos && c.fase !== 'menu' && c.fase !== 'final') {
            const R2 = { ...reglas(), dificultad: c.R.dificultad };
            if (claveEscena(R2) !== escClave) { correr(); return; }
            c.R = R2;
        }
        if (c.fase === 'menu') {
            // En el menú (y en «Ver la pista» del Estudio) también: si cambió la pista o los muebles, se rearma la sala
            const R2 = reglas();
            if (claveEscena(R2) !== escClave) { prepararEscena(R2); c.R = R2; c.P = esc.P; c.gs = R2.gatas.map((d, k) => M.nuevaGata(esc.P, R2, d, k)); if (!c.vista) pintarMenu(); }
            c.t += dt; esc.dibujar(c.gs, dt, c.tc); camaraMenu(); return;
        }
        if (c.fase === 'intro') { esc.dibujar(c.gs, dt, c.tc); esc.animarLona('quieta', c.tc); camaraIntro(); if (c.tc >= c.R.intro) empezarCuenta(); return; }
        paso(dt);
        if (!c) return;
        if (c.fase === 'final') { c.tFinal += dt; esc.actualizarParticulas(dt); esc.animarLona('agita', c.tc); camaraPodio(); return; }
        esc.dibujar(c.gs, dt, c.tc, c.W);
        if (c.fase === 'fin') camaraMeta(dt); else camaraSeguir(dt);
        if (c.avisoHasta && c.tc > c.avisoHasta) { avisoEl.classList.remove('visible'); c.avisoHasta = 0; }
        pintarHud();
    }
    // Se dibuja en lugar del mundo (main.js): true si dibujó la carrera
    function dibuja(renderer) {
        if (!c || !esc) return false;
        const w = renderer.domElement.clientWidth || window.innerWidth, h = renderer.domElement.clientHeight || window.innerHeight;
        if (Math.abs(cam.aspect - w / h) > 1e-3) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
        renderer.render(esc.scene, cam);
        return true;
    }

    return {
        abrir, actualizar, dibuja, cerrar, terminar: cerrar,
        get activa() { return !!c; },
        get estado() { return c; },
        get escena() { return esc; },
        setIdioma(l) { L = l; },
        // Estudio («Ver la pista»): la sala sin el menú, con la cámara que la recorre desde arriba (Esc cierra)
        ver() { if (!c && !abrir()) return false; if (c.fase !== 'menu') { cerrar(); if (!abrir()) return false; } c.vista = true; menuEl.classList.remove('visible'); return true; },
        // Depuración
        elegir(clave, dif = 'normal') { if (!c) abrir(clave); const i = c.R.gatas.findIndex(g => g.clave === clave); if (i >= 0) sel = i; dificultad = dif; correr(); },
        saltarIntro: () => empezarCuenta(),
        saltarA(n) { if (c && c.gs) { const g = c.gs[c.yo]; g.av = (n - 1) * c.P.largo + g.s; } }
    };
}
