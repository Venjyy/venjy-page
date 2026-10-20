// =========================================================
// VENJY · Arena del duelo de Lalo contra Moisés (bloque 8 · L1, mundo/COMBATE.md §19)
// El juego dentro del juego, como la carrera de gatas: su escena propia (arena/escena.js, el lago congelado) se
// dibuja en lugar del mundo mientras peleas. main.js lo carga con import() (cargarArena) desde «¡Un duelo en el
// lago!» de Hablar con Lalo o Moisés, después de la escena del reto (escenas.json → duelo-reto).
//   abrir(clave)   la ventisca tapa el mundo, aparece la arena con el menú (peleador y dificultad)
//   Pelear → VS (primeros planos, «VS», tambor; Espacio lo salta) → vuelo de cámara con el nombre del escenario
//   mientras los dos caminan a su marca (Espacio lo salta) → «Ronda 1» → «¡Peleen!» → rondas (arena/modelo.js)
//   → resultado con premio y amistad → Revancha / Elegir otra vez / Salir (ventisca inversa, vuelve al mundo)
// Controles (combate/intenciones.js, perfiles en combate.json → teclas): teclado y mouse, mando (Gamepad API) y en
// el celular los botones de la arena (combate/tactil-arena.js, ui-layout.json → arena). Mientras peleas, la capa
// táctil de la supervivencia y el HUD del mundo se ocultan (body.en-arena) y la música del mundo calla.
// El rival de L1 es de práctica (modelo.intencionPractica); la CPU de verdad llega en L4 y los estilos en L2 y L5.
// Valores: mundo/datos/arena.json (Estudio → Arena, en vivo con aplicarDatos).
// No editable aún: el CSS de las capas (tamaños de letra, sombras) y los sonidos sintetizados (SFX).
// Depuración: __venjy.arena (abrir(), elegir(clave, dificultad), saltar(), estado, terminar()).
// =========================================================
import * as THREE from '../../../vendor/three.module.js';
import { O, nombreDe } from '../objetos.js';
import { tono, ruido } from '../sonidos.js';
import { aplicarAngulos } from '../pose-jugador.js';
import { interpolar } from '../combate/animacion.js';
import { crearRelojFijo, cargaDe } from '../combate/estados.js';
import { COMBATE, faseEn } from '../combate/datos.js';
import { fraccion, cansado } from '../combate/postura.js';
import { crearIntenciones } from '../combate/intenciones.js';
import { crearEscenaArena } from './escena.js';
import * as M from './modelo.js';

const CSS = `
body.en-arena #hud, body.en-arena .mira, body.en-arena .tactil { display: none !important; }
.ar { font-family: 'PixelCraft', monospace; color: #fff; text-shadow: 2px 2px 0 #3f3f3f; }
.ar-capa { position: fixed; inset: 0; z-index: 60; pointer-events: none; display: none; }
.ar-capa.visible { display: block; }
.ar-caja { background: rgb(16 12 20 / 0.86); border: 3px solid #000; box-shadow: inset 3px 3px 0 #3a3450, inset -3px -3px 0 #0a0810; }
.ar-hud { position: absolute; top: calc(10px + env(safe-area-inset-top, 0px)); left: 12px; right: 12px; display: none; justify-content: space-between; align-items: flex-start; gap: 10px; }
.ar-hud.visible { display: flex; }
.ar-lado { display: flex; gap: 8px; align-items: flex-start; }
.ar-lado.der { flex-direction: row-reverse; text-align: right; }
.ar-lado canvas { border: 3px solid #000; image-rendering: pixelated; background: #222; }
.ar-barra { position: relative; height: 22px; border: 3px solid #000; box-shadow: inset 2px 2px 0 rgb(0 0 0 / 0.5); }
.ar-barra i { position: absolute; top: 0; bottom: 0; left: 0; }
.ar-lado.der .ar-barra i { left: auto; right: 0; }
.ar-postura { position: relative; height: 10px; margin-top: 4px; border: 2px solid #000; align-self: center; }
.ar-postura i { position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); }
.ar-postura.rota i { animation: ar-parpadeo 0.18s steps(2) infinite; }
@keyframes ar-parpadeo { 50% { opacity: 0.35; } }
.ar-nombre { font-size: 1.05rem; margin-top: 3px; display: flex; gap: 6px; align-items: center; }
.ar-lado.der .ar-nombre { justify-content: flex-end; }
.ar-nombre b { width: 12px; height: 12px; border: 2px solid #000; background: #2a2a2a; display: inline-block; }
.ar-nombre b.ganada { background: #ffff55; box-shadow: 0 0 8px #ffff55; }
.ar-reloj { font-size: 2.6rem; line-height: 1; padding: 4px 10px; min-width: 70px; text-align: center; }
.ar-aviso { position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%) scale(1); font-size: 4rem; text-shadow: 4px 4px 0 #3f3f15, -2px -2px 0 #000; white-space: nowrap; opacity: 0; transition: opacity 0.12s, transform 0.12s; }
.ar-aviso.visible { opacity: 1; }
.ar-aviso.golpe { transform: translate(-50%, -50%) scale(1.25); }
.ar-titulo { position: absolute; left: 50%; bottom: 14%; transform: translateX(-50%); padding: 10px 22px; font-size: 2.2rem; color: #ffff55; text-align: center; white-space: nowrap; display: none; }
.ar-titulo.visible { display: block; }
.ar-titulo small { display: block; font-size: 0.85rem; color: #c6c6c6; }
.ar-vs { position: absolute; inset: 0; display: none; }
.ar-vs.visible { display: block; }
.ar-vs .raya { position: absolute; left: 50%; top: -10%; width: 14px; height: 120%; background: repeating-linear-gradient(#fff 0 8px, #ffff55 8px 16px); border-left: 4px solid #000; border-right: 4px solid #000; transform: translateX(-50%) rotate(var(--diag, 12deg)); }
.ar-vs .letras { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 6rem; color: #ffdd33; text-shadow: 6px 6px 0 #6a2a00, -3px -3px 0 #000; }
.ar-vs .ficha { position: absolute; bottom: 10%; padding: 8px 16px; font-size: 1.8rem; }
.ar-vs .ficha small { display: block; font-size: 1rem; color: #ffdd88; }
.ar-vs .ficha.izq { left: 6%; } .ar-vs .ficha.der { right: 6%; text-align: right; }
.ar-vs .carta { position: absolute; top: 12%; width: 200px; image-rendering: pixelated; border: 4px solid #000; display: none; }
.ar-vs .carta.izq { left: 12%; } .ar-vs .carta.der { right: 12%; }
.ar-ventisca { position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; display: none; }
.ar-ventisca.visible { display: block; }
.ar-menu, .ar-pausa, .ar-final { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 16px 18px; pointer-events: auto; max-width: 94vw; max-height: 92vh; overflow: auto; display: none; }
.ar-menu.visible, .ar-pausa.visible, .ar-final.visible { display: block; }
.ar-menu h2, .ar-final h2, .ar-pausa h2 { margin: 0 0 10px; font-size: 1.6rem; color: #ffff55; text-shadow: 3px 3px 0 #3f3f15; text-align: center; font-weight: normal; }
.ar-peleadores { display: grid; grid-template-columns: repeat(2, minmax(150px, 1fr)); gap: 8px; }
.ar-peleador { padding: 10px; background: #2a2a2a; border: 3px solid #000; box-shadow: inset 2px 2px 0 #555, inset -2px -2px 0 #111; cursor: pointer; color: #fff; font: inherit; text-shadow: inherit; text-align: center; font-size: 1.2rem; }
.ar-peleador small { display: block; font-size: 0.8rem; color: #ffdd88; margin-top: 4px; }
.ar-peleador.sel { background: #4f7a2a; box-shadow: inset 2px 2px 0 #7aa84a, inset -2px -2px 0 #2c4a14; }
.ar-niveles, .ar-botones { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; align-items: center; }
.ar-niveles button, .ar-botones button { width: auto; margin: 0; padding: 8px 14px; }
.ar-niveles button.sel { background: #4f7a2a; }
.ar-final p { text-align: center; margin: 6px 0; }
.ar-final .premio { color: #7aff7a; }
.ar-ayuda { position: absolute; left: 50%; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); padding: 4px 10px; font-size: 0.75rem; color: #c6c6c6; max-width: 70vw; text-align: center; display: none; }
.ar-ayuda.visible { display: block; }
@media (max-width: 700px) { .ar-reloj { font-size: 1.8rem; } .ar-aviso { font-size: 2.4rem; } .ar-vs .letras { font-size: 3.6rem; } .ar-vs .ficha { font-size: 1.2rem; } .ar-titulo { font-size: 1.4rem; } .ar-nombre { font-size: 0.8rem; } }
`;

// Sonidos sintetizados (sin archivos)
const SFX = {
    tambor: () => { ruido({ dur: 0.35, frec: 120, q: 0.7, vol: 0.4, tipo: 'lowpass' }); tono({ f0: 110, f1: 50, dur: 0.4, vol: 0.25, forma: 'sine' }); },
    ronda: () => [523, 659].forEach((f, i) => tono({ f0: f, f1: f, dur: 0.14, vol: 0.09, forma: 'square', retardo: i * 0.12 })),
    peleen: () => { ruido({ dur: 0.25, frec: 900, q: 0.6, vol: 0.2 }); [784, 1046].forEach((f, i) => tono({ f0: f, f1: f, dur: 0.2, vol: 0.1, forma: 'square', retardo: i * 0.08 })); },
    tajo: () => ruido({ dur: 0.1, frec: 2600, q: 1.4, vol: 0.12 }),
    golpe: () => { ruido({ dur: 0.12, frec: 380, q: 0.8, vol: 0.3, tipo: 'lowpass' }); tono({ f0: 220, f1: 90, dur: 0.12, vol: 0.12, forma: 'square' }); },
    bloqueo: () => { ruido({ dur: 0.08, frec: 1600, q: 3, vol: 0.2 }); tono({ f0: 900, f1: 700, dur: 0.12, vol: 0.06, forma: 'triangle' }); },
    desvio: () => { tono({ f0: 1760, f1: 1500, dur: 0.35, vol: 0.12, forma: 'triangle' }); ruido({ dur: 0.06, frec: 4000, q: 4, vol: 0.18 }); },
    // Desvío perfecto: campana aguda con su armónico y un chasquido metálico
    campana: () => { [2093, 3136, 4186].forEach((f, i) => tono({ f0: f, f1: f * 0.995, dur: 0.9 - i * 0.2, vol: 0.11 / (i + 1), forma: 'sine' })); ruido({ dur: 0.05, frec: 5200, q: 5, vol: 0.2 }); },
    postura: () => { tono({ f0: 140, f1: 70, dur: 0.6, vol: 0.2, forma: 'triangle' }); ruido({ dur: 0.3, frec: 600, q: 1.5, vol: 0.15 }); },
    carga: () => tono({ f0: 300, f1: 900, dur: 0.25, vol: 0.05, forma: 'square' }),
    ko: () => { ruido({ dur: 0.6, frec: 200, q: 0.5, vol: 0.35, tipo: 'lowpass' }); tono({ f0: 300, f1: 60, dur: 0.8, vol: 0.15, forma: 'sawtooth' }); },
    final: gana => (gana ? [523, 659, 784, 1046] : [392, 349, 330, 262]).forEach((f, i) => tono({ f0: f, f1: f, dur: 0.18, vol: 0.09, forma: 'square', retardo: i * 0.14 }))
};
const sonar = (k, ...a) => { try { SFX[k](...a); } catch { /* sin audio */ } };

// ctx: { idioma, tactil(), puede(), bloquear(), liberar(), datos() (arena.json), estilos: { prueba: … } (estilo-*.json),
//        personasMundo(clave), inventario, entidades, jugador, misiones, crearEscena (la escena; arena/escena.js) }
export function crearArena(ctx) {
    let L = ctx.idioma || 'es';
    let datos = ctx.datos ? ctx.datos() : null;
    let R = M.reglasArena(datos);
    const tx = (k, vars) => { let s = (R.textos[k] && (R.textos[k][L] || R.textos[k].es)) || k; for (const [a, b] of Object.entries(vars || {})) s = s.replace(`{${a}}`, b); return s; };
    const tt = o => (o ? o[L] || o.es || '' : '');

    // ---------- DOM ----------
    const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
    const el = (cls, padre, tag = 'div') => { const e = document.createElement(tag); if (cls) e.className = cls; padre.appendChild(e); return e; };
    const boton = (padre, texto, f, cls = 'boton') => { const b = el(cls, padre, 'button'); b.type = 'button'; b.textContent = texto; b.addEventListener('click', e => { e.preventDefault(); f(); }); return b; };
    const capa = el('ar ar-capa', document.body);
    const ventEl = el('ar-ventisca', capa, 'canvas'); ventEl.width = 160; ventEl.height = 90;
    const vsEl = el('ar-vs', capa);
    const hud = el('ar-hud', capa);
    let relojEl = null;
    const lados = [0, 1].map(i => {
        if (i === 1) relojEl = el('ar-caja ar-reloj', hud); // vida · reloj · vida
        const lado = el('ar-lado' + (i ? ' der' : ''), hud);
        const ret = el('', lado, 'canvas'); ret.width = ret.height = 64;
        const col = el('', lado), barra = el('ar-barra', col), perdida = el('', barra, 'i'), vida = el('', barra, 'i');
        // Postura (L2): crece desde el centro, como en Sekiro; se pone roja sobre el cansancio y parpadea rota
        const post = el('ar-postura', col), postI = el('', post, 'i');
        const nom = el('ar-nombre', col), txt = el('', nom, 'span'), pips = el('', nom, 'span');
        return { lado, ret, barra, perdida, vida, txt, pips, post, postI, vista: 1 };
    });
    const avisoEl = el('ar-aviso', capa), tituloEl = el('ar-caja ar-titulo', capa), ayudaEl = el('ar-caja ar-ayuda', capa);
    const menuEl = el('ar-caja ar-menu', capa), pausaEl = el('ar-caja ar-pausa', capa), finalEl = el('ar-caja ar-final', capa);
    const mostrar = (e, v) => e.classList.toggle('visible', !!v);

    // ---------- Entradas ----------
    const intenciones = crearIntenciones({ lado: 1 });
    let tactilUI = null, tactilCargando = null;
    function tactilActivo() { return !!(ctx.tactil && ctx.tactil()); }
    function montarTactil() {
        if (tactilUI || tactilCargando || !tactilActivo()) return;
        // tactil-arena.js carga su CSS y su layout; solo en aparatos táctiles
        tactilCargando = import('../combate/tactil-arena.js').then(m => {
            tactilUI = m.montarTactilArena({ intenciones, idioma: L, padre: capa });
            tactilUI.especial(false);
            tactilUI.mostrar(!!(c && c.fase === 'pelea' && !c.pausa));
        }).catch(err => console.error('No se pudieron cargar los botones de la arena', err)).finally(() => { tactilCargando = null; });
    }
    const peleando = () => c && c.fase === 'pelea' && !c.pausa;
    const oyentes = [];
    const oir = (obj, tipo, f, op) => { obj.addEventListener(tipo, f, op); oyentes.push([obj, tipo, f, op]); };
    oir(document, 'keydown', e => {
        if (!c) return;
        if (e.code === 'Escape' && !e.repeat) {
            e.preventDefault(); e.stopPropagation();
            if (c.fase === 'menu' || c.fase === 'final') salir();
            else if (['vs', 'vuelo', 'pelea'].includes(c.fase)) pausar(!c.pausa);
            return;
        }
        if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && (c.fase === 'vs' || c.fase === 'vuelo')) { e.preventDefault(); e.stopPropagation(); saltar(); return; }
        if (c.fase === 'menu' && e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); pelear(); return; }
        if (c.fase === 'final' && e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); revancha(); return; }
        if (peleando() && intenciones.teclaAbajo(e.code)) { e.preventDefault(); e.stopPropagation(); return; }
        if (c.fase !== 'cerrando') e.stopPropagation(); // el mundo no recibe teclas mientras la arena está abierta
    }, true);
    oir(document, 'keyup', e => { if (c && intenciones.teclaArriba(e.code)) { e.preventDefault(); e.stopPropagation(); } }, true);
    oir(document, 'mousedown', e => { if (peleando() && !e.target.closest?.('button') && intenciones.teclaAbajo('Mouse' + e.button)) e.preventDefault(); }, true);
    oir(document, 'mouseup', e => { if (c) intenciones.teclaArriba('Mouse' + e.button); }, true);
    oir(document, 'contextmenu', e => { if (c) e.preventDefault(); }, true);
    oir(window, 'blur', () => { intenciones.soltarTodo(); if (c && c.fase === 'pelea') pausar(true); });
    function mando() {
        const gps = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : null;
        if (!gps) return null;
        for (const g of gps) if (g && g.connected) return g;
        return null;
    }

    // ---------- Escena y cámara ----------
    let esc = null;
    const cam = new THREE.PerspectiveCamera(R.camara.fov, 16 / 9, 0.1, 400);
    function escena() {
        if (!esc) esc = (ctx.crearEscena || crearEscenaArena)({ R, personasMundo: ctx.personasMundo || (() => null), idioma: L });
        return esc;
    }
    const v3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    function ponerCamara(pos, mira, fov) {
        cam.position.set(pos[0], pos[1], pos[2]); cam.lookAt(mira[0], mira[1], mira[2]);
        if (fov && Math.abs(cam.fov - fov) > 1e-3) { cam.fov = fov; cam.updateProjectionMatrix(); }
    }

    // ---------- Estado ----------
    // c = { fase: 'menu'|'vs'|'vuelo'|'pelea'|'final'|'cerrando', yo, rival, dificultad, P, C, reloj, t, tc, pausa, vent }
    let c = null, sel = 'lalo', dificultad = 'normal';
    const pose = {}, tmp = {};
    const ventisca = { k: 0, a: 0, b: 0, t: 0, dur: 1, alFin: null };

    function abrir(clave = null) {
        if (c) return false;
        if (ctx.puede && !ctx.puede()) return false;
        datos = ctx.datos ? ctx.datos() : datos; R = M.reglasArena(datos);
        if (clave && R.peleadores[clave]) sel = clave;
        if (!R.peleadores[sel]) sel = Object.keys(R.peleadores)[0];
        c = { fase: 'menu', t: 0, tc: 0, pausa: false };
        ctx.bloquear();
        if (document.pointerLockElement) document.exitPointerLock();
        document.body.classList.add('en-arena');
        mostrar(capa, true);
        for (const e of [hud, avisoEl, tituloEl, ayudaEl, vsEl, finalEl, pausaEl]) mostrar(e, false);
        // La ventisca tapa el mundo; detrás aparece la arena con el menú
        c.enMundo = true;
        tapar(R.entrada.ventisca, () => { c.enMundo = false; escena(); colocarMenu(); pintarMenu(); });
        montarTactil();
        return true;
    }
    function colocarMenu() {
        c.fase = 'menu'; c.t = 0;
        const P = nuevaP();
        P.fase = 'quieto'; // en el menú esperan en guardia, sin caminar
        c.P = P; c.C = M.crearCamara(R);
        mostrar(menuEl, true);
    }
    function nuevaP() {
        const claves = Object.keys(R.peleadores);
        const rival = claves.find(k => k !== sel) || sel;
        const estilos = {};
        for (const k of [sel, rival]) { const e = R.peleadores[k].estilo; estilos[k] = (ctx.estilos && (ctx.estilos[e] || ctx.estilos.prueba)) || null; }
        const P = M.nuevaPelea(R, { estilos, yo: sel, rival, dificultad, tactil: tactilActivo(), semilla: (Math.random() * 1e9) | 0, aspecto: aspecto() });
        P.f.forEach(F => { F.xa = F.x; F.za = F.z; F.yawa = F.yaw; });
        const e = escena();
        for (const F of P.f) {
            e.armar(F.clave, F.estilo && F.estilo.arma ? F.estilo.arma : null);
            const pe = e.peleador(F.clave); if (pe) pe.g.visible = true;
        }
        for (const k of Object.keys(R.peleadores)) if (!P.f.some(F => F.clave === k)) { const pe = e.peleador(k); if (pe) pe.g.visible = false; }
        return P;
    }
    function aspecto() {
        const w = (typeof window !== 'undefined' && window.innerWidth) || 16, h = (typeof window !== 'undefined' && window.innerHeight) || 9;
        return w / h;
    }
    function pintarMenu() {
        menuEl.textContent = '';
        el('', menuEl, 'h2').textContent = tx('elegir');
        const g = el('ar-peleadores', menuEl);
        for (const [k, d] of Object.entries(R.peleadores)) {
            const b = boton(g, tt(d.nombre), () => { sel = k; c.P = nuevaP(); c.P.fase = 'quieto'; pintarMenu(); }, 'ar-peleador' + (k === sel ? ' sel' : ''));
            el('', b, 'small').textContent = tt(d.titulo);
        }
        const nv = el('ar-niveles', menuEl);
        el('', nv, 'span').textContent = tx('dificultad') + ':';
        for (const k of R.dificultades) boton(nv, tx(k), () => { dificultad = k; pintarMenu(); }, 'boton' + (k === dificultad ? ' sel' : ''));
        const bt = el('ar-botones', menuEl);
        boton(bt, tx('pelear') + ' (Enter)', pelear);
        boton(bt, tx('salir') + ' (Esc)', salir, 'boton secundario');
    }
    function pelear() {
        if (!c || c.fase !== 'menu') return;
        mostrar(menuEl, false);
        c.P = nuevaP(); c.C = M.crearCamara(R);
        intenciones.soltarTodo();
        intenciones.fijarLado(1); // la cámara está de tu lado: siempre miras a la derecha de la pantalla
        empezarVs();
    }
    function empezarVs() {
        c.fase = 'vs'; c.t = 0;
        vsEl.textContent = '';
        vsEl.style.setProperty('--diag', R.vs.diagonal + 'deg');
        el('raya', vsEl);
        el('letras', vsEl).textContent = 'VS';
        c.P.f.forEach((F, i) => {
            const f = el('ar-caja ficha ' + (i ? 'der' : 'izq'), vsEl);
            f.textContent = tt(F.d.nombre);
            el('', f, 'small').textContent = tt(F.d.titulo);
        });
        mostrar(vsEl, true);
        if (R.vs.tambor) { sonar('tambor'); c.tambor2 = true; }
    }
    function empezarVuelo() {
        mostrar(vsEl, false);
        c.fase = 'vuelo'; c.t = 0;
        tituloEl.textContent = ''; tituloEl.append(tt(R.escenario.nombre));
        el('', tituloEl, 'small').textContent = tx('saltar');
        mostrar(tituloEl, true);
    }
    function empezarPelea() {
        mostrar(tituloEl, false);
        // Si se saltó el vuelo, terminan de llegar a su marca de una vez
        const P = c.P;
        let n = 0; while (!P.listaEntrada && n++ < 600) M.pasoPelea(P, []);
        P.f.forEach(F => { F.xa = F.x; F.za = F.z; F.yawa = F.yaw; });
        M.empezarRondas(P);
        c.fase = 'pelea'; c.t = 0;
        c.reloj = crearRelojFijo();
        mostrar(hud, true);
        mostrar(ayudaEl, !tactilActivo()); ayudaEl.textContent = tx('ayuda');
        c.retratosPendientes = true; // (los pinta el primer dibujo: hace falta el renderer)
        pintarHud(true);
        if (tactilUI) tactilUI.mostrar(true);
    }
    function saltar() {
        if (!c) return;
        if (c.fase === 'vs') empezarVuelo();
        else if (c.fase === 'vuelo') empezarPelea();
    }
    function pausar(v) {
        if (!c || !['vs', 'vuelo', 'pelea'].includes(c.fase)) return;
        c.pausa = v;
        intenciones.soltarTodo();
        if (tactilUI) tactilUI.mostrar(!v && c.fase === 'pelea');
        mostrar(pausaEl, v);
        if (v) {
            pausaEl.textContent = '';
            el('', pausaEl, 'h2').textContent = tx('pausa');
            const bt = el('ar-botones', pausaEl);
            boton(bt, tx('seguir'), () => pausar(false));
            boton(bt, tx('revancha'), revancha, 'boton secundario');
            boton(bt, tx('salir'), salir, 'boton secundario');
        }
    }
    function revancha() {
        if (!c) return;
        for (const e of [finalEl, pausaEl, hud, avisoEl, ayudaEl]) mostrar(e, false);
        c.pausa = false; c.premio = null;
        c.fase = 'menu'; pelear();
        empezarVuelo(); // sin la presentación: directo a la arena
    }
    function otraVez() {
        if (!c) return;
        for (const e of [finalEl, pausaEl, hud, avisoEl, ayudaEl]) mostrar(e, false);
        if (tactilUI) tactilUI.mostrar(false);
        c.pausa = false; colocarMenu(); pintarMenu();
    }
    // Salir: ventisca inversa y vuelta al mundo
    function salir() {
        if (!c || c.fase === 'cerrando') return;
        c.fase = 'cerrando';
        for (const e of [menuEl, finalEl, pausaEl, hud, avisoEl, ayudaEl, tituloEl, vsEl]) mostrar(e, false);
        if (tactilUI) tactilUI.mostrar(false);
        tapar(R.entrada.ventisca, () => { c.enMundo = true; }, cerrar);
    }
    // Cierra de una vez y deja todo como estaba (lo que hizo abrir, al revés)
    function cerrar() {
        if (!c) return;
        c = null;
        intenciones.soltarTodo();
        if (tactilUI) { tactilUI.destruir(); tactilUI = null; }
        for (const e of [menuEl, finalEl, pausaEl, hud, avisoEl, ayudaEl, tituloEl, vsEl, ventEl]) mostrar(e, false);
        mostrar(capa, false);
        document.body.classList.remove('en-arena');
        ventisca.alFin = null; ventisca.alFinal = null; ventisca.k = 0;
        ctx.liberar();
    }

    // ---------- Ventisca (transición sin corte: la nieve tapa, cambia la escena y se despeja) ----------
    function tapar(dur, enMedio, alFinal = null) {
        Object.assign(ventisca, { t: 0, dur: Math.max(0.2, dur), enMedio, alFinal, hecho: false });
        mostrar(ventEl, true);
    }
    function pasoVentisca(dt) {
        if (!ventEl.classList.contains('visible')) return;
        ventisca.t += dt;
        const u = ventisca.t / ventisca.dur;
        // 0 → 0,5 tapa; en la mitad cambia la escena; 0,5 → 1 se despeja
        ventisca.k = u < 0.5 ? u * 2 : Math.max(0, 2 - u * 2);
        if (u >= 0.5 && !ventisca.hecho) { ventisca.hecho = true; if (ventisca.enMedio) ventisca.enMedio(); }
        pintarVentisca(ventisca.k, ventisca.t);
        if (u >= 1) { mostrar(ventEl, false); const f = ventisca.alFinal; ventisca.alFinal = null; if (f) f(); }
    }
    function pintarVentisca(k, t) {
        const g = ventEl.getContext && ventEl.getContext('2d');
        if (!g) return;
        const w = ventEl.width, h = ventEl.height, v = R.escenario.nieve.viento;
        g.clearRect(0, 0, w, h);
        g.fillStyle = `rgba(232, 240, 255, ${Math.min(1, k * 1.15)})`;
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffffff';
        const n = Math.round(260 * k);
        for (let i = 0; i < n; i++) {
            const sx = (i * 37.7 + t * (60 + (i % 7) * 12) * (v[0] >= 0 ? 1 : -1)) % w, sy = (i * 19.3 + t * (20 + (i % 5) * 9)) % h;
            g.fillRect((sx + w) % w, sy, 1 + (i % 3 === 0), 1 + (i % 3 === 0));
        }
    }

    // ---------- Cada cuadro ----------
    function actualizar(dt) {
        if (!c) return;
        pasoVentisca(dt);
        if (!c || c.enMundo || !esc) return; // (la ventisca de salida pudo cerrar la arena)
        c.tc += dt;
        const lento = c.lentaHasta && c.tc < c.lentaHasta ? c.escalaLenta || R.rondas.escalaLenta : 1;
        const dtE = c.pausa ? 0 : dt * lento;
        esc.dibujar(dtE, c.tc);
        if (c.pausa) return;
        c.t += dt;
        const P = c.P;
        if (c.fase === 'menu' || c.fase === 'cerrando') { pasoLibre(dtE); camaraMenu(); }
        else if (c.fase === 'vs') {
            pasoLibre(dtE);
            if (c.tambor2 && c.t > 0.5) { c.tambor2 = false; sonar('tambor'); }
            if (c.t >= R.entrada.vs) empezarVuelo();
        } else if (c.fase === 'vuelo') {
            // Caminan a su marca mientras la cámara vuela por la arena
            pasoLibre(dtE);
            camaraVuelo(Math.min(1, c.t / R.entrada.vuelo));
            if (c.t >= R.entrada.vuelo) empezarPelea();
        } else if (c.fase === 'pelea' || c.fase === 'final') {
            const g = mando();
            const alfa = c.reloj.avanzar(dtE, () => {
                if (g) intenciones.leerMando(g);
                const it0 = c.fase === 'pelea' ? intenciones.leer(performance.now()) : {};
                const it1 = M.intencionPractica(P, 1);
                P.f.forEach(F => { F.xa = F.x; F.za = F.z; F.yawa = F.yaw; });
                P.aspecto = aspecto();
                M.pasoPelea(P, [it0, it1]);
                for (const e of P.eventos) evento(e);
            });
            dibujarPeleadores(alfa);
            efectosPeleadores(dtE);
            const vista = M.pasoCamara(c.C, P, dtE, aspecto());
            ponerCamara(vista.pos, vista.mira, vista.fov);
            pintarHud(false);
            if (c.avisoHasta && c.tc > c.avisoHasta) { mostrar(avisoEl, false); c.avisoHasta = 0; }
        }
    }
    // Fuera de la pelea: el modelo sigue (la entrada camina, la guardia respira) con un reloj propio
    function pasoLibre(dt) {
        const P = c.P;
        if (!P) return;
        c.relojLibre = c.relojLibre || crearRelojFijo();
        const alfa = c.relojLibre.avanzar(dt, () => {
            P.f.forEach(F => { F.xa = F.x; F.za = F.z; F.yawa = F.yaw; });
            M.pasoPelea(P, []);
        });
        dibujarPeleadores(alfa);
    }
    function dibujarPeleadores(alfa) {
        for (const F of c.P.f) {
            const pe = esc.peleador(F.clave);
            if (!pe) continue;
            interpolar(F.poseAnt, F.pose, alfa, tmp);
            aplicarAngulos(pe, tmp);
            const yaw = F.yawa + Math.atan2(Math.sin(F.yaw - F.yawa), Math.cos(F.yaw - F.yawa)) * alfa;
            pe.g.position.set(F.xa + (F.x - F.xa) * alfa, 0, F.za + (F.z - F.za) * alfa);
            pe.g.rotation.set(0, yaw, 0);
        }
    }
    // Estela del tajo durante el activo (estilo → ataques.<x>.efectos.estela) y brillo del filo mientras carga
    function efectosPeleadores(dt) {
        const ef = esc.efectos;
        if (!ef) return;
        for (const F of c.P.f) {
            const p = F.p, def = p.def, aura = R.peleadores[F.clave]?.aura;
            const op = def && def.efectos && def.efectos.estela;
            const activo = op && p.estado === 'ataque' && faseEn(def.fases, p.c).fase === 'activo';
            const h = activo ? esc.hoja(F.clave, op.desde ?? 0.3, op.hasta ?? 1) : null;
            ef.estela(F.clave, h && h.base, h && h.punta, op, aura, dt);
            const k = def && def.carga ? cargaDe(p) : 0;
            const hc = k > 0 ? esc.hoja(F.clave, 0, 1) : null;
            ef.carga(F.clave, hc && hc.base, hc && hc.punta, k);
            const nivel = k > 0 ? Math.ceil(k * (def.carga.niveles || 3)) : 0;
            if (nivel > (F.nivelCarga || 0)) sonar('carga');
            F.nivelCarga = nivel;
        }
    }
    // Donde chocan: la mitad de la hoja del que defiende (o entre los dos, a la altura del golpe)
    function puntoChoque(e) {
        const O = c.P.f[e.a], F = c.P.f[e.de];
        const h = esc.hoja && esc.hoja(O.clave, 0.35, 0.65);
        if (h) return h.base.clone().lerp(h.punta, 0.5);
        const y = e.altura === 'bajo' ? 0.5 : e.altura === 'medio' ? 1.1 : 1.5;
        return new THREE.Vector3((O.x + F.x) / 2, y, (O.z + F.z) / 2);
    }
    function camaraMenu() {
        // Órbita lenta alrededor de los dos
        const a = c.tc * 0.15, d = 7;
        ponerCamara([Math.sin(a) * d, 2.4, Math.cos(a) * d], [0, 1, 0], R.camara.fov);
    }
    function camaraVuelo(u) {
        const V = R.entrada.vuelos;
        if (!V.length) { const vista = M.pasoCamara(c.C, c.P, 1 / 60, aspecto()); ponerCamara(vista.pos, vista.mira, vista.fov); return; }
        const n = V.length, x = Math.min(n - 1e-6, u * n), i = Math.floor(x), k = x - i, s = k * k * (3 - 2 * k);
        const v = V[i];
        ponerCamara(v3(v.desde, v.hasta, s), v.mira || [0, 1, 0], R.camara.fov);
    }
    function aviso(texto, dur = 1.2, golpe = false) {
        avisoEl.textContent = texto;
        avisoEl.classList.toggle('golpe', golpe);
        mostrar(avisoEl, true);
        c.avisoHasta = c.tc + dur;
    }
    function evento(e) {
        const P = c.P;
        if (e.tipo === 'ronda') { aviso(e.final ? tx('rondaFinal') : `${tx('ronda')} ${e.n}`, R.rondas.anuncio); sonar('ronda'); }
        else if (e.tipo === 'peleen') { aviso(tx('peleen'), R.rondas.peleen, true); sonar('peleen'); }
        else if (e.tipo === 'golpe') {
            const fuerte = e.fuerza >= 0.1;
            if (e.resultado === 'golpeado') { sonar('golpe'); if (e.a === 0 || e.de === 0) intenciones.vibrar(fuerte ? 'fuerte' : 'golpe'); if (fuerte) esc.celebrar(Math.min(1, e.fuerza * 4)); }
            else if (e.resultado === 'bloqueado') { sonar('bloqueo'); chispas(e, 'bloqueo'); }
            else if (e.resultado === 'desviado') { sonar('desvio'); chispas(e, 'desvio'); if (e.a === 0) intenciones.vibrar('desvio'); }
            else if (e.resultado === 'perfecto') {
                // Clang: campana, chispas grandes con destello, vibración y cámara lenta (combate.json → peso.perfecto)
                sonar('desvio'); sonar('campana'); chispas(e, 'perfecto');
                if (e.a === 0) intenciones.vibrar('perfecto');
                const cl = (COMBATE.peso.perfecto || {}).camaraLenta;
                if (cl) { c.lentaHasta = c.tc + cl.segundos; c.escalaLenta = cl.escala; }
            }
        } else if (e.tipo === 'postura') { aviso(tx('postura'), 1, true); sonar('postura'); esc.celebrar(0.6); }
        else if (e.tipo === 'ko') { aviso(tx('ko'), R.rondas.finRonda, true); sonar('ko'); c.lentaHasta = c.tc + R.rondas.lentaKo; c.escalaLenta = R.rondas.escalaLenta; esc.celebrar(1); }
        else if (e.tipo === 'tiempo') aviso(tx('tiempo'), R.rondas.finRonda, true);
        else if (e.tipo === 'final') terminar(P);
    }
    function chispas(e, tipo) {
        if (!esc.efectos) return;
        const pg = COMBATE.peso[tipo === 'perfecto' ? 'perfecto' : 'desvio'] || {};
        esc.efectos.chispas(puntoChoque(e), pg.particulas || 10, tipo, cam);
    }
    function terminar(P) {
        c.fase = 'final';
        if (tactilUI) tactilUI.mostrar(false);
        mostrar(ayudaEl, false);
        const gana = P.ganador === 0;
        sonar('final', gana);
        finalEl.textContent = '';
        const G = P.ganador == null ? null : P.f[P.ganador];
        el('', finalEl, 'h2').textContent = G ? tx('gana', { n: tt(G.d.nombre) }) : tx('empate');
        for (const F of P.f) {
            const fr = F.d.frases && F.d.frases[P.ganador == null ? 'derrota' : F === G ? 'victoria' : 'derrota'];
            if (fr) el('', finalEl, 'p').textContent = `${tt(F.d.nombre)}: «${tt(fr)}»`;
        }
        const dados = gana ? premio() : [];
        for (const d of dados) el('premio', finalEl, 'p').textContent = d;
        const bt = el('ar-botones', finalEl);
        boton(bt, tx('revancha') + ' (Enter)', revancha);
        boton(bt, tx('otraVez'), otraVez, 'boton secundario');
        boton(bt, tx('salir') + ' (Esc)', salir, 'boton secundario');
        mostrar(finalEl, true);
        // Amistad con los dos (minijuego `duelo`, misiones.js)
        const m = ctx.misiones;
        if (m && R.premios.amistad) {
            if (m.estado && m.estado.minijuegos) m.estado.minijuegos.add('duelo');
            if (m.alMinijuego) m.alMinijuego('duelo', gana ? 'gana' : 'pierde');
        }
    }
    // Un objeto por la primera victoria de cada dificultad (arena.json → premios.primeraVictoria)
    function premio() {
        const out = [], m = ctx.misiones, marca = 'duelo-gana-' + dificultad;
        if (R.premios.amistad) out.push(tx('amistad'));
        const pv = R.premios.primeraVictoria[dificultad];
        const ya = m && m.estado && m.estado.minijuegos && m.estado.minijuegos.has(marca);
        if (!pv || ya) return out;
        if (m && m.estado && m.estado.minijuegos) m.estado.minijuegos.add(marca);
        const id = O[pv.objeto], n = pv.cantidad || 1;
        if (id == null || !ctx.inventario) return out;
        const resto = ctx.inventario.agregar(id, n);
        const j = ctx.jugador;
        if (resto && ctx.entidades && j) ctx.entidades.soltar(id, resto, 0, j.pos.x, j.pos.y + 1, j.pos.z);
        out.push(tx('premio', { d: tx(dificultad), o: `${n > 1 ? n + ' × ' : ''}${nombreDe(id, L)}` }));
        return out;
    }

    // ---------- HUD ----------
    function retratos() {
        c.P.f.forEach((F, i) => {
            const cv = lados[i].ret, t = R.hud.retrato;
            cv.style.width = cv.style.height = t + 'px';
            if (ctx.renderer && esc.retrato) {
                try {
                    const r = esc.retrato(ctx.renderer, F.clave, 64);
                    const g = cv.getContext && cv.getContext('2d');
                    if (g && r) { g.imageSmoothingEnabled = false; g.drawImage(r, 0, 0, 64, 64); }
                } catch (err) { console.warn('arena: sin retrato', err); }
            }
        });
    }
    function pintarHud(todo) {
        const P = c.P, H = R.hud;
        P.f.forEach((F, i) => {
            const l = lados[i], v = Math.max(0, F.vida / F.vidaMax);
            // La parte perdida queda amarilla y se vacía después (como en los juegos de pelea)
            l.vista = l.vista > v ? Math.max(v, l.vista - 0.5 / 60) : v;
            if (todo) {
                l.barra.style.width = `${H.anchoVida}vw`; l.barra.style.background = H.vidaFondo;
                l.vida.style.background = H.vida; l.perdida.style.background = H.vidaPerdida;
                l.txt.textContent = tt(F.d.nombre);
            }
            l.vida.style.width = (v * 100).toFixed(1) + '%';
            if (todo) { l.post.style.width = `${H.anchoPostura}vw`; l.post.style.background = H.posturaFondo; }
            const fp = fraccion(F.post);
            l.postI.style.width = (fp * 100).toFixed(1) + '%';
            l.postI.style.background = cansado(F.post) ? H.posturaAlta : H.postura;
            l.post.classList.toggle('rota', !!F.post.roto);
            l.perdida.style.width = (l.vista * 100).toFixed(1) + '%';
            const pips = Math.ceil(R.rondas.mejorDe / 2);
            if (todo || l.pipsN !== P.victorias[i]) {
                l.pipsN = P.victorias[i]; l.pips.textContent = '';
                for (let k = 0; k < pips; k++) el(k < P.victorias[i] ? 'ganada' : '', l.pips, 'b');
            }
        });
        if (relojEl) { relojEl.textContent = String(Math.ceil(P.reloj)); relojEl.style.color = H.reloj; }
    }

    // Se dibuja en lugar del mundo (main.js): true si dibujó la arena
    function dibuja(renderer) {
        if (!c || c.enMundo || !esc) return false;
        ctx.renderer = renderer;
        if (c.retratosPendientes && c.P) { c.retratosPendientes = false; retratos(); }
        const w = renderer.domElement.clientWidth || window.innerWidth, h = renderer.domElement.clientHeight || window.innerHeight;
        if (c.fase === 'vs' && R.vs.retrato === '3d') {
            // Pantalla partida: un primer plano de cada uno (la raya diagonal y el VS van encima, en el DOM)
            const tam = renderer.getSize(new THREE.Vector2());
            renderer.setScissorTest(true);
            c.P.f.forEach((F, i) => {
                const pp = esc.primerPlano(F.clave);
                cam.aspect = (tam.x / 2) / tam.y; cam.updateProjectionMatrix();
                ponerCamara(pp.pos, pp.mira, R.camara.fov);
                renderer.setViewport(i * tam.x / 2, 0, tam.x / 2, tam.y); renderer.setScissor(i * tam.x / 2, 0, tam.x / 2, tam.y);
                renderer.render(esc.scene, cam);
            });
            renderer.setScissorTest(false); renderer.setViewport(0, 0, tam.x, tam.y);
            return true;
        }
        if (Math.abs(cam.aspect - w / h) > 1e-3) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
        renderer.render(esc.scene, cam);
        return true;
    }

    return {
        abrir, actualizar, dibuja, cerrar, terminar: cerrar, salir,
        get activa() { return !!c; },
        get estado() { return c; },
        get escena() { return esc; },
        get intenciones() { return intenciones; },
        setIdioma(l) { L = l; },
        // Estudio: datos nuevos en vivo
        aplicarDatos(d) {
            datos = d; R = M.reglasArena(d);
            if (esc && esc.aplicar) esc.aplicar(R);
            if (c && c.P) { c.P.R = R; if (c.C) c.C.R = R; }
        },
        // Estudio y depuración: directo a la pelea con ese peleador
        elegir(clave, dif = 'normal') {
            if (!c && !abrir(clave)) return false;
            const ir = () => { if (!c) return; if (R.peleadores[clave]) sel = clave; dificultad = dif; if (c.fase !== 'menu') colocarMenu(); pelear(); empezarVuelo(); empezarPelea(); };
            if (c.enMundo) { const f = ventisca.enMedio; ventisca.enMedio = () => { if (f) f(); ir(); }; } else ir();
            return true;
        },
        saltar
    };
}
