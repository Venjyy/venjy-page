// =========================================================
// VENJY · Supervivencia · Salonas «La Gira» (S3: jugable mínimo). Diseño en mundo/SALONAS.md §2, §5 y §7.
// Desde el panel de Salonas («Ensayar con Salonas»; main.js lo carga con import() al usarlo): un menú corto (dificultad,
// calibración) y la canción de prueba en su propia escena, que se dibuja en lugar del mundo mientras tocas.
//  · Carriles: autopista de 4 carriles inclinada hacia el fondo; la línea de golpe tiene 4 trastes que se encienden.
//    Los acordes salen unidos con una barra y las notas largas con su cola (se mantiene la tecla).
//  · Entrada: D F J K (AJUSTES_SALONAS.teclas) o los 4 trastes táctiles, que se ubican bajo los trastes 3D.
//  · Reloj: el del audio (AudioContext.currentTime). La hora de una pulsación sale de event.timeStamp pasado al audio
//    con getOutputTimestamp (sin él, currentTime − outputLatency); a eso se le resta la calibración (salonas-reloj.js).
//  · Fallo: el bajo se apaga un momento y suena una cuerda muerta; la música nunca se detiene.
//  · Esc pausa: el audio se suspende y vuelve con una cuenta de 3.
// La partitura, el juicio y el puntaje son los de salonas-partitura.js; el audio, el de musica-motor.js (dos
// reproductores con el mismo mapa: la banda y el bajo por separado, para poder apagar solo el bajo).
// No editable aún: AJUSTES_SALONAS y REGLAS_BASE (pasan a mundo/datos/salonas.json en S9), los textos (TXT_SALONAS)
// y los colores del HUD (CSS). Locales, público, menú de la gira, récords y Modo Primus vienen en S5 y S8.
// Depuración: __venjy.salonas (abrir(), tocar(dificultad), estado, pausar(), calibrar()).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { audioMundo, cuandoHayaAudio } from '../criaturas/cuerpo.js';
import { I } from './musica-instrumentos.js';
import { crearReproductorCancion, pasoEnTiempo } from './musica-motor.js';
import { tocarBajo, vozDe } from './musica-bajo.js';
import { cargarMusica, cancionMusica, instrumentosPropios } from './musica-datos.js';
import * as P from './salonas-partitura.js';
import * as Z from './salonas-reloj.js';

const t = (es, en) => ({ es, en });
export const TXT_SALONAS = {
    titulo: t('Ensayo con Salonas', 'Rehearsal with Salonas'),
    dificultad: t('Dificultad', 'Difficulty'),
    cancion: t('Canción', 'Song'),
    niveles: { facil: t('Fácil', 'Easy'), normal: t('Normal', 'Normal'), dificil: t('Difícil', 'Hard'), experto: t('Experto', 'Expert') },
    tocar: t('¡A tocar! (Enter)', 'Play! (Enter)'),
    salir: t('Salir (Esc)', 'Leave (Esc)'),
    calibrar: t('Calibrar (C)', 'Calibrate (C)'),
    calibracion: t('Calibración (ms)', 'Calibration (ms)'),
    calTexto: t('Toca una tecla (o la pantalla) con cada clic. Los primeros {n} clics son de entrada.', 'Press a key (or tap the screen) with each click. The first {n} clicks are a count-in.'),
    calCuenta: t('Toques: {x} de {n}', 'Taps: {x} of {n}'),
    calLista: t('Listo: {x} ms', 'Done: {x} ms'),
    calFalta: t('Faltaron toques. Prueba otra vez.', 'Not enough taps. Try again.'),
    sinCancion: t('Esa canción no está lista.', 'That song is not ready.'),
    ayuda: t('D F J K tocan los trastes · mantén la tecla en las notas largas · los acordes van juntos · Esc pausa', 'D F J K play the frets · hold the key on long notes · chords go together · Esc pauses'),
    ayudaTactil: t('Toca los trastes de abajo · mantén en las notas largas · los acordes van juntos', 'Tap the frets below · hold on long notes · chords go together'),
    pausa: t('Pausa', 'Paused'),
    seguir: t('Seguir (Esc)', 'Resume (Esc)'),
    otraVez: t('Otra vez (Enter)', 'Again (Enter)'),
    resultados: t('Resultados', 'Results'),
    puntos: t('Puntos', 'Score'),
    precision: t('Precisión', 'Accuracy'),
    comboMax: t('Combo máximo', 'Best combo'),
    juicios: { perfecto: t('¡Perfecto!', 'Perfect!'), bien: t('Bien', 'Good'), ok: t('OK', 'OK'), fallo: t('Fallo', 'Miss') },
    combo: t('Combo', 'Combo')
};

const CSS = `
body.en-salonas #hud, body.en-salonas .mira, body.en-salonas .tactil { display: none !important; }
.sl { font-family: 'PixelCraft', monospace; color: #fff; text-shadow: 2px 2px 0 #3f3f3f; }
.sl-capa { position: fixed; inset: 0; z-index: 60; pointer-events: none; display: none; }
.sl-capa.visible { display: block; }
.sl-caja { background: rgb(16 10 6 / 0.86); border: 3px solid #000; box-shadow: inset 3px 3px 0 #3a2a1c, inset -3px -3px 0 #0c0704; }
.sl-arriba { position: absolute; top: calc(10px + env(safe-area-inset-top, 0px)); left: 12px; right: 12px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.sl-puntos { padding: 4px 12px; font-size: 1.8rem; color: #ffff55; text-shadow: 3px 3px 0 #3f3f15; }
.sl-puntos small, .sl-combo small { display: block; font-size: 0.8rem; color: #c6c6c6; text-shadow: 2px 2px 0 #3f3f3f; }
.sl-combo { padding: 4px 12px; font-size: 1.4rem; text-align: right; }
.sl-combo b { color: #55ffff; font-weight: normal; }
.sl-progreso { position: absolute; top: 0; left: 0; height: 6px; background: #55c34a; box-shadow: 0 2px 0 #1d4a18; }
.sl-aviso { position: absolute; left: 50%; top: 26%; transform: translate(-50%, -50%); font-size: 2.2rem; opacity: 0; transition: opacity 0.12s; white-space: nowrap; }
.sl-aviso.visible { opacity: 1; }
.sl-aviso.perfecto { color: #ffff55; } .sl-aviso.bien { color: #55ff55; } .sl-aviso.ok { color: #c6c6c6; } .sl-aviso.fallo { color: #ff5555; }
.sl-cuenta { position: absolute; left: 50%; top: 42%; transform: translate(-50%, -50%); font-size: 5rem; color: #ffff55; text-shadow: 4px 4px 0 #3f3f15; display: none; }
.sl-cuenta.visible { display: block; }
.sl-ayuda { position: absolute; left: 50%; bottom: calc(10px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); padding: 4px 10px; font-size: 0.8rem; color: #e0e0e0; white-space: nowrap; max-width: calc(100vw - 24px); overflow: hidden; text-overflow: ellipsis; }
.sl-letra { position: absolute; transform: translate(-50%, 0); font-size: 1.3rem; color: #fff; }
.sl-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 16px 20px; min-width: min(420px, calc(100vw - 32px)); max-width: calc(100vw - 32px); text-align: center; pointer-events: auto; display: none; }
.sl-panel.visible { display: block; }
.sl-panel h2 { margin: 0 0 10px; font-size: 1.5rem; font-weight: normal; color: #ffff55; text-shadow: 3px 3px 0 #3f3f15; }
.sl-panel p { margin: 6px 0; font-size: 0.95rem; }
.sl-fila { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 8px 0; }
.sl .boton { font-family: inherit; font-size: 0.95rem; color: #fff; text-shadow: 2px 2px 0 #3f3f3f; padding: 6px 12px; cursor: pointer;
  background: #6f6f6f; border: 2px solid #000; box-shadow: inset 2px 2px 0 #a8a8a8, inset -2px -2px 0 #3c3c3c; }
.sl .boton:hover { background: #7f8cc4; }
.sl .boton.elegido { background: #3f7a32; box-shadow: inset 2px 2px 0 #6fb05c, inset -2px -2px 0 #1d3a16; }
.sl-panel input { font-family: inherit; font-size: 1rem; width: 6em; text-align: center; background: #000; color: #fff; border: 2px solid #a0a0a0; padding: 3px; }
.sl-pulso { width: 64px; height: 64px; margin: 10px auto; background: #3a2a1c; border: 3px solid #000; }
.sl-pulso.fuerte { background: #ffff55; }
.sl-estrellas { display: block; margin: 6px auto; image-rendering: pixelated; }
.sl-trastes { position: absolute; left: 0; right: 0; bottom: 0; height: 32vh; display: none; pointer-events: auto; touch-action: none; }
.sl-trastes.visible { display: block; }
.sl-trastes button { position: absolute; top: 0; bottom: 0; border: 3px solid #000; background: rgb(255 255 255 / 0.06); font-family: inherit; color: #fff; font-size: 1.2rem; touch-action: none; }
.sl-trastes button.activo { background: rgb(255 255 255 / 0.22); }
.sl-pausaT { position: absolute; top: calc(80px + env(safe-area-inset-top, 0px)); right: 12px; pointer-events: auto; display: none; }
.sl-pausaT.visible { display: block; }
`;

// Estrella de 9×9 para los resultados (sin imágenes ni emojis)
const ESTRELLA = ['....a....', '...aaa...', '...aba...', 'aaaabaaaa', '.aabbbaa.', '..abbba..', '..aabaa..', '.aa...aa.', '.a.....a.'];
function pintarEstrellas(lienzo, n) {
    const k = lienzo.getContext('2d'), p = 4, w = 9 * p;
    lienzo.width = 5 * (w + p); lienzo.height = w;
    k.clearRect(0, 0, lienzo.width, lienzo.height);
    for (let s = 0; s < 5; s++) {
        const on = s < n;
        ESTRELLA.forEach((fila, j) => { for (let i = 0; i < 9; i++) {
            const q = fila[i]; if (q === '.') continue;
            k.fillStyle = on ? (q === 'a' ? '#c8a000' : '#ffff55') : (q === 'a' ? '#2a2a2a' : '#4a4a4a');
            k.fillRect(s * (w + p) + i * p, j * p, p, p);
        } });
    }
}

// ctx: { idioma, tactil(), puede(), bloquear(), liberar(), datos() (salonas.json en S9; hoy null) }
export function crearSalonas(ctx) {
    let L = ctx.idioma || 'es';
    const tx = (o, v = {}) => Object.entries(v).reduce((s, [k, x]) => s.replace(`{${k}}`, x), o ? o[L] || o.es : '');
    const datos = () => (ctx.datos && ctx.datos()) || null;
    const ajustes = () => Z.ajustesDe(datos() && datos().juego);
    const reglas = () => P.reglasDe(datos() && datos().reglas);
    let musicaJson = null;
    const listo = cargarMusica().then(d => { musicaJson = d; });
    // La canción: la de musica.json (si el Estudio la aplicó, esa); la de prueba suena aunque sea borrador
    const cancionDe = clave => cancionMusica(clave) || (musicaJson && musicaJson.canciones && musicaJson.canciones[clave]) || null;

    // ---------- DOM ----------
    const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
    const el = (cls, padre, tag = 'div') => { const e = document.createElement(tag); if (cls) e.className = cls; padre.appendChild(e); return e; };
    const capa = el('sl sl-capa', document.body);
    const progEl = el('sl-progreso', capa);
    const arriba = el('sl-arriba', capa);
    const puntosEl = el('sl-caja sl-puntos', arriba), comboEl = el('sl-caja sl-combo', arriba);
    const avisoEl = el('sl-aviso', capa), cuentaEl = el('sl-cuenta', capa), ayudaEl = el('sl-caja sl-ayuda', capa);
    const letrasEl = [0, 1, 2, 3].map(() => el('sl-letra', capa));
    const menuEl = el('sl-caja sl-panel', capa), calEl = el('sl-caja sl-panel', capa), pausaEl = el('sl-caja sl-panel', capa), finalEl = el('sl-caja sl-panel', capa);
    const trastesEl = el('sl-trastes', capa), pausaT = el('sl-pausaT', capa);
    const boton = (padre, texto, f, cls = 'boton') => { const b = el(cls, padre, 'button'); b.type = 'button'; b.textContent = texto; b.addEventListener('click', e => { e.preventDefault(); f(); }); return b; };
    const mostrar = (e, v) => { e.style.display = v ? '' : 'none'; };
    const paneles = [menuEl, calEl, pausaEl, finalEl];
    const panel = p => { for (const e of paneles) e.classList.toggle('visible', e === p); };

    // Trastes táctiles (los mismos 4 de la línea de golpe; se ubican bajo ellos en cada cuadro)
    const botonesT = [0, 1, 2, 3].map(k => {
        const b = el('', trastesEl, 'button'); b.type = 'button';
        b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (_) { /* sin captura */ } apretar(k, e.timeStamp); });
        for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, e => { e.preventDefault(); soltar(k); });
        return b;
    });
    const bPausaT = boton(pausaT, '', () => pausar());

    // ---------- Estado ----------
    // c = { fase: 'menu'|'calibra'|'juega'|'pausa'|'cuenta'|'final', A, R, dif, cancion, part, hechas, falladas,
    //       mantiene: Map(idx → último segundo sumado), soltadas, pend: [{ k, hasta }], pts, rep, repBajo, ... }
    let c = null, dificultad = null, cancionElegida = null, calibracion = 0;
    const almacen = () => { try { return window.localStorage; } catch (e) { return null; } };
    const apretadas = new Set(), brillo = [0, 0, 0, 0];

    // ---------- Audio (un juego de nodos para siempre: banda, bajo y efectos → master del mundo) ----------
    let au = null;
    cuandoHayaAudio(a => {
        const g = () => { const n = a.ctx.createGain(); n.gain.value = 0; n.connect(a.master); return n; };
        au = { ctx: a.ctx, banda: g(), bajo: g(), efectos: g() };
        au.efectos.gain.value = 1;
    });
    const ahoraAudio = () => {
        const x = au.ctx, ts = x.getOutputTimestamp ? x.getOutputTimestamp() : null, ms = performance.now();
        return { ts, ms, hora: Z.horaAudio(x, ms, ms, ts) };
    };
    const horaDe = perfMs => { const x = au.ctx, ts = x.getOutputTimestamp ? x.getOutputTimestamp() : null; return Z.horaAudio(x, perfMs, performance.now(), ts); };
    function apagarBajo() {
        const A = c.A, x = au.ctx, g = au.bajo.gain, lleno = c.volBajo, t0 = x.currentTime;
        g.cancelScheduledValues(t0); g.setTargetAtTime(lleno * A.fallo.volBajo, t0, 0.01); g.setTargetAtTime(lleno, t0 + A.fallo.seg, 0.05);
    }
    function cuerdaMuerta(nota) {
        const M = c.A.fallo.muerta;
        try { tocarBajo(au.ctx, au.efectos, au.ctx.currentTime + 0.005, 'g', nota || M.nota, M.dur, null, M.vol * c.cancion.vol, vozDe(c.cancion.vozBajo)); } catch (e) { /* sin sonido */ }
    }
    function callarAudio() {
        if (!au) return;
        const t0 = au.ctx.currentTime;
        for (const n of [au.banda, au.bajo]) { n.gain.cancelScheduledValues(t0); n.gain.setTargetAtTime(0, t0, 0.05); }
    }

    // ---------- Escena 3D ----------
    let esc = null;
    const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const v3 = new THREE.Vector3();
    function prepararEscena(A) {
        if (esc && esc.firma === JSON.stringify([A.carriles, A.escena])) return;
        if (esc) esc.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        const C = A.carriles, W = C.ancho, N = 4, ancho = N * W, scene = new THREE.Scene();
        scene.background = new THREE.Color(A.escena.cielo);
        scene.fog = new THREE.Fog(A.escena.cielo, A.escena.niebla[0], A.escena.niebla[1]);
        scene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const sol = new THREE.DirectionalLight(0xffffff, 0.7); sol.position.set(2, 8, 4); scene.add(sol);
        const caja = (w, h, d, color, basica = false) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), basica ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }));
        const xDe = k => (k - (N - 1) / 2) * W;
        // Autopista: tablero, bordes, carriles con su tinte y separadores (el fondo va hacia −z)
        const tabla = caja(ancho + 0.3, 0.1, C.largo, C.fondo); tabla.position.set(0, -0.05, -C.largo / 2 + 1); scene.add(tabla);
        for (const s of [-1, 1]) { const b = caja(0.15, 0.25, C.largo, C.borde); b.position.set(s * (ancho / 2 + 0.15), 0.05, -C.largo / 2 + 1); scene.add(b); }
        for (let k = 0; k < N; k++) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, C.largo), new THREE.MeshBasicMaterial({ color: C.colores[k], transparent: true, opacity: 0.08 }));
            m.rotation.x = -Math.PI / 2; m.position.set(xDe(k), 0.002, -C.largo / 2 + 1); scene.add(m);
            if (k) { const s = caja(0.04, 0.02, C.largo, C.linea, true); s.material.transparent = true; s.material.opacity = 0.25; s.position.set(xDe(k) - W / 2, 0.01, -C.largo / 2 + 1); scene.add(s); }
        }
        // Línea de golpe y los 4 trastes
        const linea = caja(ancho, 0.05, 0.08, C.linea, true); linea.position.set(0, 0.02, 0); scene.add(linea);
        const trastes = [];
        for (let k = 0; k < N; k++) {
            const aro = caja(W * 0.8, 0.12, 0.55, C.borde); aro.position.set(xDe(k), 0.06, 0); scene.add(aro);
            const tapa = caja(W * 0.62, 0.14, 0.38, C.colores[k], true); tapa.position.set(xDe(k), 0.07, 0); scene.add(tapa);
            trastes.push({ tapa, color: new THREE.Color(C.colores[k]) });
        }
        // Líneas de compás (se reutilizan) y notas, barras de acorde y colas (también reutilizadas)
        const lineas = [], notas = [], barras = [], colas = [];
        const grupo = new THREE.Group(); scene.add(grupo);
        const pide = (lista, crear) => { for (const o of lista) if (!o.visible) return o; const o = crear(); lista.push(o); grupo.add(o); return o; };
        const H = C.nota.alto, Lg = C.nota.largo;
        esc = {
            scene, trastes, xDe, firma: JSON.stringify([A.carriles, A.escena]),
            linea: () => pide(lineas, () => caja(ancho, 0.01, 0.05, C.linea, true)),
            nota: () => pide(notas, () => { const m = caja(W * 0.78, H, Lg, '#ffffff'); m.userData.borde = caja(W * 0.84, H * 0.5, Lg * 1.1, C.borde); m.add(m.userData.borde); m.userData.borde.position.y = -H * 0.3; return m; }),
            barra: () => pide(barras, () => caja(1, C.barra, C.barra, C.linea)),
            cola: () => pide(colas, () => caja(W * C.cola, 0.06, 1, '#ffffff', true)),
            esconder() { for (const l of [lineas, notas, barras, colas]) for (const o of l) o.visible = false; }
        };
    }

    // ---------- Teclado (propio: el jugador del mundo está bloqueado) ----------
    document.addEventListener('keydown', e => {
        if (!c) return;
        const A = c.A, k = A.teclas.indexOf(e.code);
        if (c.fase === 'menu') {
            if (e.code === 'Enter') { e.preventDefault(); tocar(); }
            else if (e.code === 'Escape') { e.preventDefault(); cerrar(); }
            else if (e.code === 'KeyC') { e.preventDefault(); calibrar(); }
            else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); moverDif(e.code === 'ArrowRight' ? 1 : -1); }
            else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { e.preventDefault(); moverCancion(e.code === 'ArrowDown' ? 1 : -1); }
            if (e.target && e.target.tagName === 'INPUT') return;
            e.stopPropagation(); return;
        }
        if (c.fase === 'final') { if (e.code === 'Enter') { e.preventDefault(); tocar(); } else if (e.code === 'Escape') { e.preventDefault(); cerrar(); } e.stopPropagation(); return; }
        if (e.code === 'Escape' && !e.repeat) {
            e.preventDefault(); e.stopPropagation();
            if (c.fase === 'calibra') { terminarCalibracion(true); return; }
            if (c.fase === 'pausa') seguir(); else if (c.fase === 'juega') pausar();
            return;
        }
        if (c.fase === 'calibra' && !e.repeat && (k >= 0 || e.code === 'Space')) { e.preventDefault(); e.stopPropagation(); toqueCalibracion(e.timeStamp); return; }
        if (k >= 0) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) apretar(k, e.timeStamp); }
    }, true);
    document.addEventListener('keyup', e => { if (!c) return; const k = c.A.teclas.indexOf(e.code); if (k >= 0) { soltar(k); e.stopPropagation(); } }, true);
    window.addEventListener('blur', () => { for (const k of [...apretadas]) soltar(k); if (c && c.fase === 'juega') pausar(); });
    capa.addEventListener('pointerdown', e => { if (c && c.fase === 'calibra' && e.target === capa) toqueCalibracion(e.timeStamp); });

    // ---------- Menú ----------
    function abrir() {
        if (c) return false;
        if (ctx.puede && !ctx.puede()) return false;
        const A = ajustes();
        prepararEscena(A);
        dificultad = dificultad || A.dificultad;
        if (!A.canciones.includes(cancionElegida)) cancionElegida = A.canciones.includes(A.cancion) ? A.cancion : A.canciones[0] || A.cancion;
        calibracion = Z.leerCalibracion(almacen(), A.calibracion.rango);
        c = { fase: 'menu', A, R: reglas(), tactil: !!(ctx.tactil && ctx.tactil()) };
        ctx.bloquear();
        if (document.pointerLockElement) document.exitPointerLock();
        document.body.classList.add('en-salonas');
        capa.classList.add('visible');
        esc.esconder();
        hud(false);
        pintarMenu();
        return true;
    }
    function hud(v) {
        for (const e of [arriba, progEl, ayudaEl, ...letrasEl]) mostrar(e, v);
        trastesEl.classList.toggle('visible', v && c && c.tactil);
        pausaT.classList.toggle('visible', v && c && c.tactil);
        if (!v) { avisoEl.classList.remove('visible'); cuentaEl.classList.remove('visible'); }
        for (const e of letrasEl) mostrar(e, v && c && !c.tactil);
    }
    function moverDif(d) { const i = P.DIFICULTADES.indexOf(dificultad); dificultad = P.DIFICULTADES[(i + d + P.DIFICULTADES.length) % P.DIFICULTADES.length]; pintarMenu(); }
    function moverCancion(d) {
        const l = c.A.canciones, i = l.indexOf(cancionElegida);
        if (l.length) { cancionElegida = l[(i + d + l.length) % l.length]; pintarMenu(); }
    }
    function pintarMenu(nota = '') {
        panel(menuEl);
        menuEl.textContent = '';
        const cancion = cancionDe(cancionElegida);
        el('', menuEl, 'h2').textContent = tx(TXT_SALONAS.titulo);
        el('', menuEl, 'p').textContent = tx(TXT_SALONAS.cancion);
        const filaC = el('sl-fila', menuEl);
        for (const k of c.A.canciones) {
            const x = cancionDe(k);
            if (x) boton(filaC, tx(x.nombre) || k, () => { cancionElegida = k; pintarMenu(); }, k === cancionElegida ? 'boton elegido' : 'boton');
        }
        el('', menuEl, 'p').textContent = tx(TXT_SALONAS.dificultad);
        const fila = el('sl-fila', menuEl);
        for (const d of P.DIFICULTADES) boton(fila, tx(TXT_SALONAS.niveles[d]), () => { dificultad = d; pintarMenu(); }, d === dificultad ? 'boton elegido' : 'boton');
        const cal = el('sl-fila', menuEl);
        const lab = el('', cal, 'label'); lab.textContent = tx(TXT_SALONAS.calibracion) + ' ';
        const inp = el('', lab, 'input'); inp.type = 'number'; inp.step = '1';
        inp.min = String(-c.A.calibracion.rango * 1000); inp.max = String(c.A.calibracion.rango * 1000);
        inp.value = String(Math.round(calibracion * 1000));
        inp.addEventListener('change', () => { calibracion = Z.guardarCalibracion(almacen(), parseFloat(inp.value) / 1000, c.A.calibracion.rango); inp.value = String(Math.round(calibracion * 1000)); });
        boton(cal, tx(TXT_SALONAS.calibrar), () => calibrar());
        if (nota) el('', menuEl, 'p').textContent = nota;
        else if (!cancion) el('', menuEl, 'p').textContent = tx(TXT_SALONAS.sinCancion);
        const acc = el('sl-fila', menuEl);
        boton(acc, tx(TXT_SALONAS.tocar), () => tocar());
        boton(acc, tx(TXT_SALONAS.salir), () => cerrar());
    }

    // ---------- Calibración: 8 toques con un metrónomo, gana la mediana del desfase ----------
    function calibrar() {
        if (!c || !au || (c.fase !== 'menu')) return;
        const K = c.A.calibracion, x = au.ctx;
        if (x.state !== 'running') x.resume();
        const int = 60 / K.bpm, t0 = x.currentTime + 0.5, total = K.previos + K.toques;
        for (let i = 0; i < total; i++) {
            const o = x.createOscillator(), g = x.createGain(), tt = t0 + i * int;
            o.frequency.value = i < K.previos ? K.clic.frec : K.clic.frecFuerte;
            g.gain.setValueAtTime(K.clic.vol, tt); g.gain.exponentialRampToValueAtTime(0.0001, tt + K.clic.dur);
            o.connect(g); g.connect(au.efectos); o.start(tt); o.stop(tt + K.clic.dur + 0.01);
        }
        c.fase = 'calibra';
        c.cal = { t0, int, total, toques: [] };
        panel(calEl);
        pintarCalibracion();
    }
    function pintarCalibracion() {
        const K = c.A.calibracion;
        calEl.textContent = '';
        el('', calEl, 'h2').textContent = tx(TXT_SALONAS.calibrar).replace(/\s*\(.*\)$/, '');
        el('', calEl, 'p').textContent = tx(TXT_SALONAS.calTexto, { n: K.previos });
        c.cal.pulso = el('sl-pulso', calEl);
        c.cal.cuenta = el('', calEl, 'p');
        c.cal.cuenta.textContent = tx(TXT_SALONAS.calCuenta, { x: 0, n: K.toques });
        boton(el('sl-fila', calEl), tx(TXT_SALONAS.salir), () => terminarCalibracion(true));
    }
    function toqueCalibracion(perfMs) {
        if (!c || c.fase !== 'calibra') return;
        const K = c.A.calibracion, h = horaDe(perfMs);
        if (h < c.cal.t0 + (K.previos - 0.5) * c.cal.int) return; // los clics de entrada no cuentan
        c.cal.toques.push(h);
        c.cal.cuenta.textContent = tx(TXT_SALONAS.calCuenta, { x: Math.min(K.toques, c.cal.toques.length), n: K.toques });
    }
    function terminarCalibracion(cancelada = false) {
        if (!c || c.fase !== 'calibra') return;
        const K = c.A.calibracion, { t0, int, toques } = c.cal;
        c.fase = 'menu'; c.cal = null;
        if (cancelada) { pintarMenu(); return; }
        const d = Z.calibrar(toques, t0, int, { desde: K.previos, minimo: K.minimo });
        if (d === null) { pintarMenu(tx(TXT_SALONAS.calFalta)); return; }
        calibracion = Z.guardarCalibracion(almacen(), d, K.rango);
        pintarMenu(tx(TXT_SALONAS.calLista, { x: Math.round(calibracion * 1000) }));
    }

    // ---------- Canción ----------
    function tocar() {
        if (!c || !au) return;
        const A = ajustes(), R = reglas(), cancion = cancionDe(cancionElegida);
        if (!cancion) { pintarMenu(tx(TXT_SALONAS.sinCancion)); return; }
        prepararEscena(A);
        if (c.rep) { c.rep.parar(); c.repBajo.parar(); }
        const x = au.ctx;
        if (x.state !== 'running') x.resume();
        const part = P.partitura(cancion, dificultad, R);
        // La banda sin el bajo y el bajo solo: dos reproductores con el mismo mapa y la misma hora de inicio
        const mudo = conBajo => ({ ...cancion, capas: (cancion.capas || []).map(p => (!!p.bajo === conBajo ? p : { ...p, mudo: true })) });
        const rep = crearReproductorCancion(), repBajo = crearReproductorCancion();
        const mapa = rep.empezar(x, mudo(false), { retraso: A.audio.retraso });
        repBajo.empezar(x, mudo(true), { mapa, retraso: rep.inicio - x.currentTime });
        const vol = cancion.vol || 1, t0 = x.currentTime;
        au.banda.gain.cancelScheduledValues(t0); au.banda.gain.setValueAtTime(vol * A.audio.volBanda, t0);
        au.bajo.gain.cancelScheduledValues(t0); au.bajo.gain.setValueAtTime(vol * A.audio.volBajo, t0);
        c = { fase: 'juega', A, R, tactil: c.tactil, cancion, part, mapa, rep, repBajo, volBajo: vol * A.audio.volBajo,
            hechas: new Set(), falladas: new Set(), soltadas: new Set(), mantiene: new Map(), pend: [], pts: P.puntajeInicial(),
            maximo: P.puntajeMaximo(part, R), primera: 0, aviso: 0, ultimaNota: null, tJ: -A.audio.retraso };
        apretadas.clear();
        panel(null);
        hud(true);
        ayudaEl.textContent = tx(c.tactil ? TXT_SALONAS.ayudaTactil : TXT_SALONAS.ayuda);
        letrasEl.forEach((e, k) => { e.textContent = A.letras[k]; });
        botonesT.forEach((b, k) => { b.textContent = A.letras[k]; b.style.borderColor = A.carriles.colores[k]; });
        bPausaT.textContent = tx(TXT_SALONAS.pausa);
        pintarHud();
    }
    // Segundo de juego (para el juicio) de una pulsación: la hora del audio que sonaba, menos la calibración
    const segundoDe = perfMs => c.rep.segundoEn(horaDe(perfMs)) - calibracion;
    function apretar(k, perfMs) {
        if (!c || k < 0 || k > 3) return;
        apretadas.add(k); brillo[k] = performance.now();
        botonesT[k].classList.add('activo');
        if (c.fase === 'calibra') { toqueCalibracion(perfMs); return; }
        if (c.fase !== 'juega') return;
        const tP = segundoDe(perfMs), { notas } = c.part;
        const r = P.golpe(notas, tP, k, c.hechas, c.R, [...apretadas]);
        if (r) {
            acierto(r); c.pend = c.pend.filter(p => !notas[r.idx].carriles.includes(p.k));
            if (notas[r.idx].carriles.length > 1) c.acorde = { carriles: notas[r.idx].carriles, hasta: performance.now() + c.A.acordeGracia * 1000 };
            return;
        }
        // La otra tecla de un acorde que ya sonó (la primera estaba apretada de antes): no es fallo
        if (c.acorde && c.acorde.carriles.includes(k) && performance.now() < c.acorde.hasta) return;
        // ¿Media pulsación de un acorde? Se espera un poco a la otra tecla
        const acorde = notas.some((n, i) => !c.hechas.has(i) && n.carriles.length > 1 && n.carriles.includes(k) && P.juicio(tP - n.t, n, c.R));
        if (acorde) { c.pend.push({ k, hasta: performance.now() + c.A.acordeGracia * 1000 }); return; }
        if (c.A.vacioEsFallo) fallo(null);
    }
    function soltar(k) {
        apretadas.delete(k); botonesT[k].classList.remove('activo');
        if (c && c.mantiene.size) for (const idx of [...c.mantiene.keys()]) if (c.part.notas[idx].carriles.includes(k)) { c.mantiene.delete(idx); c.soltadas.add(idx); }
    }
    function acierto(r) {
        const n = c.part.notas[r.idx];
        c.hechas.add(r.idx); c.ultimaNota = n.nota;
        c.pts = P.sumar(c.pts, { juicio: r.juicio, marcada: n.marcada }, c.R);
        if (n.dur > 0) c.mantiene.set(r.idx, n.t);
        avisar(r.juicio);
    }
    function fallo(idx) {
        const n = idx === null ? null : c.part.notas[idx];
        if (n) { c.hechas.add(idx); c.falladas.add(idx); }
        c.pts = P.sumar(c.pts, { juicio: 'fallo' }, c.R);
        apagarBajo();
        cuerdaMuerta(n ? n.nota : c.ultimaNota);
        avisar('fallo');
    }
    function avisar(j) {
        avisoEl.className = `sl-aviso visible ${j}`;
        avisoEl.textContent = tx(TXT_SALONAS.juicios[j]);
        c.aviso = performance.now() + c.A.avisoSeg * 1000;
    }
    function pintarHud() {
        const p = c.pts;
        puntosEl.textContent = String(p.puntos);
        const sm = document.createElement('small'); sm.textContent = tx(TXT_SALONAS.puntos); puntosEl.appendChild(sm);
        comboEl.textContent = '';
        const b = el('', comboEl, 'b'); b.textContent = `×${p.mult}`;
        const s2 = el('', comboEl, 'small'); s2.textContent = `${tx(TXT_SALONAS.combo)} ${p.combo}`;
    }

    // ---------- Pausa: el audio se suspende y vuelve con una cuenta ----------
    function pausar() {
        if (!c || c.fase !== 'juega') return;
        c.fase = 'pausa';
        for (const k of [...apretadas]) soltar(k);
        try { au.ctx.suspend(); } catch (e) { /* sin audio */ }
        pausaEl.textContent = '';
        el('', pausaEl, 'h2').textContent = tx(TXT_SALONAS.pausa);
        const f = el('sl-fila', pausaEl);
        boton(f, tx(TXT_SALONAS.seguir), () => seguir());
        boton(f, tx(TXT_SALONAS.salir), () => cerrar());
        panel(pausaEl);
    }
    function seguir() {
        if (!c || c.fase !== 'pausa') return;
        panel(null);
        c.fase = 'cuenta';
        c.cuentaFin = performance.now() + c.A.pausa.cuenta * c.A.pausa.paso * 1000;
        cuentaEl.classList.add('visible');
    }

    // ---------- Final ----------
    function terminar() {
        c.fase = 'final';
        c.rep.parar(); c.repBajo.parar(); callarAudio();
        hud(false);
        const p = c.pts, notas = c.part.notas.length, aciertos = p.conteo.perfecto + p.conteo.bien + p.conteo.ok;
        finalEl.textContent = '';
        el('', finalEl, 'h2').textContent = tx(TXT_SALONAS.resultados);
        pintarEstrellas(el('sl-estrellas', finalEl, 'canvas'), P.estrellas(p.puntos, c.maximo, c.R));
        const linea = (a, b) => { const e = el('', finalEl, 'p'); e.textContent = `${a}: ${b}`; };
        linea(tx(TXT_SALONAS.puntos), p.puntos);
        linea(tx(TXT_SALONAS.precision), `${notas ? Math.round(100 * aciertos / notas) : 0} %`);
        linea(tx(TXT_SALONAS.comboMax), p.comboMax);
        el('', finalEl, 'p').textContent = ['perfecto', 'bien', 'ok', 'fallo'].map(j => `${tx(TXT_SALONAS.juicios[j])} ${p.conteo[j]}`).join(' · ');
        const f = el('sl-fila', finalEl);
        boton(f, tx(TXT_SALONAS.otraVez), () => tocar());
        boton(f, tx(TXT_SALONAS.salir), () => cerrar());
        panel(finalEl);
    }
    function cerrar() {
        if (!c) return;
        if (c.rep) { c.rep.parar(); c.repBajo.parar(); }
        callarAudio();
        if (au && au.ctx.state === 'suspended') au.ctx.resume();
        c = null;
        panel(null); hud(false);
        capa.classList.remove('visible');
        document.body.classList.remove('en-salonas');
        for (const k of [...apretadas]) soltar(k);
        ctx.liberar();
    }

    // ---------- Cada cuadro ----------
    function actualizar() {
        if (!c || !au) return;
        const ahora = performance.now(), A = c.A;
        if (c.aviso && ahora > c.aviso) { avisoEl.classList.remove('visible'); c.aviso = 0; }
        if (c.fase === 'calibra') {
            const h = ahoraAudio().hora, { t0, int, total } = c.cal, i = Math.floor((h - t0) / int);
            c.cal.pulso.classList.toggle('fuerte', i >= 0 && i < total && h - (t0 + i * int) < int * 0.3);
            if (h > t0 + total * int + int) terminarCalibracion();
            return;
        }
        if (c.fase === 'cuenta') {
            const resta = (c.cuentaFin - ahora) / 1000;
            if (resta <= 0) { cuentaEl.classList.remove('visible'); c.fase = 'juega'; au.ctx.resume(); }
            else cuentaEl.textContent = String(Math.ceil(resta / A.pausa.paso));
        }
        if (!['juega', 'cuenta', 'pausa'].includes(c.fase)) return;
        if (c.fase === 'juega') {
            if (au.ctx.state === 'running') {
                const salida = { I, ctx: au.ctx, propios: instrumentosPropios(), adelanto: A.audio.adelanto };
                c.rep.avanzar({ ...salida, salida: au.banda });
                c.repBajo.avanzar({ ...salida, salida: au.bajo });
            }
            const tVis = c.rep.segundoEn(ahoraAudio().hora), tJ = tVis - calibracion, { notas } = c.part;
            c.tVis = tVis; c.tJ = tJ;
            // Acordes a medias que no se completaron, notas que pasaron sin tocar y notas largas mantenidas
            for (const p of c.pend.filter(p => ahora > p.hasta)) { c.pend.splice(c.pend.indexOf(p), 1); if (A.vacioEsFallo) fallo(null); }
            for (const idx of P.vencidas(notas, tJ, c.hechas, c.R)) fallo(idx);
            for (const [idx, desde] of [...c.mantiene]) {
                const n = notas[idx], hasta = Math.min(tJ, n.t + n.dur);
                if (hasta > desde) c.pts = P.sumar(c.pts, { mantener: hasta - desde }, c.R);
                if (tJ >= n.t + n.dur) c.mantiene.delete(idx); else c.mantiene.set(idx, hasta);
            }
            pintarHud();
            progEl.style.width = `${Math.max(0, Math.min(100, 100 * tVis / c.part.duracion))}%`;
            if (tJ > c.part.duracion + A.final.cola) { terminar(); return; }
        }
        pintarCarriles(ahora);
    }
    function pintarCarriles(ahora) {
        const A = c.A, C = A.carriles, v = C.velocidad, tVis = c.tVis ?? -A.audio.retraso, { notas } = c.part;
        const zDe = tt => -(tt - tVis) * v, hastaT = tVis + C.largo / v;
        esc.esconder();
        // Líneas de compás y de pulso (cada 4 pasos)
        const pasos = c.mapa.pasos;
        for (let i = Math.max(0, pasoEnTiempo(c.mapa, tVis)); i < pasos.length && pasos[i].t < hastaT; i++) {
            if (pasos[i].i % 4) continue;
            const l = esc.linea(); l.visible = true; l.position.set(0, 0.012, zDe(pasos[i].t));
            l.scale.set(1, 1, pasos[i].i === 0 ? 2.5 : 1);
        }
        // Notas (la primera que aún puede verse avanza sola)
        while (c.primera < notas.length && notas[c.primera].t + notas[c.primera].dur < tVis - 1) c.primera++;
        for (let i = c.primera; i < notas.length && notas[i].t < hastaT; i++) {
            const n = notas[i], tocada = c.hechas.has(i) && !c.falladas.has(i), gris = c.falladas.has(i) || c.soltadas.has(i);
            const cabeza = tocada ? Math.max(n.t, tVis) : n.t;
            if (n.dur > 0 && cabeza < n.t + n.dur) for (const k of n.carriles) {
                const q = esc.cola(), z0 = zDe(cabeza), z1 = zDe(n.t + n.dur);
                q.visible = true; q.material.color.set(gris ? '#555555' : C.colores[k]);
                q.scale.set(1, 1, Math.max(0.01, z0 - z1)); q.position.set(esc.xDe(k), 0.03, (z0 + z1) / 2);
            }
            if (tocada) continue;
            for (const k of n.carriles) {
                const m = esc.nota(); m.visible = true; m.material.color.set(gris ? '#555555' : C.colores[k]);
                m.position.set(esc.xDe(k), C.nota.alto / 2 + 0.02, zDe(n.t));
            }
            if (n.carriles.length > 1) {
                const a = esc.xDe(n.carriles[0]), b = esc.xDe(n.carriles[n.carriles.length - 1]), br = esc.barra();
                br.visible = true; br.scale.set(b - a, 1, 1); br.position.set((a + b) / 2, C.nota.alto + 0.06, zDe(n.t));
            }
        }
        // Trastes: encendidos mientras se aprietan (y un momento después)
        esc.trastes.forEach((tr, k) => {
            const on = apretadas.has(k) || ahora - brillo[k] < C.brillo * 1000;
            tr.tapa.material.color.copy(tr.color).multiplyScalar(on ? 1 : 0.45);
            tr.tapa.scale.set(on ? 1.12 : 1, on ? 1.6 : 1, on ? 1.12 : 1);
        });
        // Cámara fija detrás de los carriles; se mece al pulso
        const K = A.camara, ip = pasoEnTiempo(c.mapa, tVis), p = pasos[Math.max(0, ip)];
        const fase = ip < 0 ? 1 : ((p.i % 4) + Math.min(1, (tVis - p.t) / p.s)) / 4;
        // Si la pantalla es angosta (celular en vertical), se aleja hasta que entren los 4 carriles en la línea de golpe
        const w = innerWidth, h = innerHeight; cam.aspect = w / h;
        const medio = 2 * C.ancho + K.margen, dist = Math.hypot(K.altura, K.distancia);
        const ve = dist * Math.tan(THREE.MathUtils.degToRad(K.fov) / 2) * cam.aspect, f = Math.max(1, medio / ve);
        cam.fov = K.fov; cam.position.set(0, K.altura * f, K.distancia * f); cam.lookAt(0, 0, K.mira);
        // Letras y trastes táctiles: se miden con la cámara quieta (así no se mueven con el vaivén)
        cam.updateProjectionMatrix(); cam.updateMatrixWorld();
        c.trastesPx = esc.trastes.map(tr => { v3.set(tr.tapa.position.x, 0, 0).project(cam); return (v3.x + 1) / 2 * w; });
        c.letraPx = (1 - (v3.set(0, 0, 0.6).project(cam).y + 1) / 2) * h;
        // Vaivén suave al pulso (vuelve a 0 al final de cada pulso, sin saltos), igual en cualquier pantalla
        cam.position.y -= K.mecer * Math.pow(Math.sin(Math.PI * fase), 2); cam.lookAt(0, 0, K.mira);
    }
    function dibuja(renderer) {
        if (!c || !esc) return false;
        const w = renderer.domElement.clientWidth || window.innerWidth, h = renderer.domElement.clientHeight || window.innerHeight;
        if (Math.abs(cam.aspect - w / h) > 1e-3) cam.aspect = w / h;
        cam.updateProjectionMatrix();
        renderer.render(esc.scene, cam);
        // Letras (PC) y trastes táctiles bajo los trastes 3D (medidos en pintarCarriles con la cámara quieta)
        if (c.trastesPx) {
            const xs = c.trastesPx, paso = xs.length > 1 ? xs[1] - xs[0] : w / 4;
            xs.forEach((x, k) => {
                letrasEl[k].style.left = `${x}px`; letrasEl[k].style.top = `${c.letraPx}px`;
                const b = botonesT[k]; b.style.left = `${x - paso / 2}px`; b.style.width = `${paso}px`;
            });
        }
        return true;
    }

    return {
        abrir, actualizar, dibuja, cerrar, terminar: cerrar, listo,
        get activa() { return !!c; },
        get estado() { return c; },
        setIdioma(l) { L = l; },
        // Depuración
        tocar(dif) { if (!c && !abrir()) return false; if (dif && P.DIFICULTADES.includes(dif)) dificultad = dif; tocar(); return true; },
        pausar: () => pausar(),
        calibrar: () => calibrar(),
        get calibracion() { return calibracion; }
    };
}
