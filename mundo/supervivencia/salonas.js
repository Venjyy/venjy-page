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
// Ajustes y textos editables en mundo/datos/salonas.json; TXT_SALONAS queda como respaldo si falta una clave.
// Los colores del HUD siguen en CSS.
// Depuración: __venjy.salonas (abrir(), tocar(dificultad), estado, pausar(), calibrar(), local('sala'|'bar'|'festival'), primus(), practica, records()).
// S8: el menú por local con estrellas y récord (localStorage, salonas-reloj.js), la energía del público (a cero te abuchean), el Modo
// Primus (Espacio con la barra llena), el duelo de solos (puntaje aparte y «¡Te toca!») y la Práctica (sección y velocidad).
// S5: el local (sala de ensayo, bar o festival), la banda tocando al pulso y el público, en salonas-escena.js;
// la cámara empieza en el plano de intro del local y en el solo se corre hacia Salonas.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { audioMundo, cuandoHayaAudio } from '../criaturas/cuerpo.js';
import { I } from './musica-instrumentos.js';
import { crearReproductorCancion, pasoEnTiempo, mapaTiempo } from './musica-motor.js';
import { tocarBajo, vozDe } from './musica-bajo.js';
import { cargarMusica, cancionMusica, instrumentosPropios } from './musica-datos.js';
import * as P from './salonas-partitura.js';
import * as Z from './salonas-reloj.js';
import { crearEscenaSalonas } from './salonas-escena.js';
import { aplicarLayout } from './layout-datos.js';

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
    combo: t('Combo', 'Combo'),
    // S8
    locales: { sala: t('Sala de ensayo', 'Rehearsal room'), bar: t('Bar', 'Bar'), festival: t('Festival', 'Festival') },
    record: t('Récord', 'Best'),
    sinRecord: t('sin récord', 'no record'),
    modo: t('Modo', 'Mode'),
    modoGira: t('La gira', 'The tour'),
    modoPractica: t('Práctica', 'Practice'),
    practicaSeccion: t('Sección', 'Section'),
    practicaVel: t('Velocidad', 'Speed'),
    secciones: { intro: t('Intro', 'Intro'), verso: t('Verso', 'Verse'), precoro: t('Precoro', 'Pre-chorus'), coro: t('Coro', 'Chorus'), puente: t('Puente', 'Bridge'), solo: t('Solo', 'Solo'), final: t('Final', 'Outro') },
    energia: t('Público', 'Crowd'),
    primus: t('Primus', 'Primus'),
    primusListo: t('¡Espacio!', 'Press Space!'),
    primusToque: t('Primus', 'Primus'),
    primusX: t('PRIMUS ×{n}', 'PRIMUS ×{n}'),
    duelo: t('Duelo', 'Duel'),
    teToca: t('¡Te toca!', 'Your turn!'),
    escucha: t('Escucha a Salonas', 'Listen to Salonas'),
    resAbucheo: t('¡El público se fue!', 'The crowd left!'),
    resAbucheoTxt: t('La energía llegó a cero: esta vez no cuenta para el récord.', 'The energy hit zero: this run does not count for the record.'),
    resPractica: t('Práctica', 'Practice'),
    resPracticaTxt: t('La práctica no cuenta para los récords.', 'Practice does not count for records.'),
    recordNuevo: t('¡Nuevo récord!', 'New best!'),
    recordAnterior: t('Récord: {x}', 'Best: {x}'),
    primusVeces: t('Modo Primus', 'Primus Mode'),
    dueloPuntos: t('Duelo de solos', 'Solo duel'),
    publicoFin: t('Público', 'Crowd'),
    volverMenu: t('Menú', 'Menu'),
    ayudaPrimus: t(' · Espacio: Primus', ' · Space: Primus')
};

export const CSS_SALONAS = `
body.en-salonas #hud, body.en-salonas .mira, body.en-salonas .tactil, body.en-salonas .clic-seguir { display: none !important; }
.sl-capa.sl-intro .sl-letra, .sl-capa.sl-intro .sl-trastes { opacity: 0; }
.sl-letra, .sl-trastes { transition: opacity .4s; }
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
.sl-panel.visible { max-height: calc(100vh - 24px); overflow-y: auto; }
.sl-locales { text-align: left; }
.sl-local { margin: 8px 0 2px; font-size: 0.85rem; color: #55ffff; }
.sl-cancion { display: flex; align-items: center; gap: 8px; margin: 3px 0; }
.sl-cancion .boton { flex: 1; text-align: left; }
.sl-cancion small { font-size: 0.75rem; color: #c6c6c6; min-width: 5.5em; text-align: right; }
.sl-medio { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 120px; }
.sl-barra { width: 130px; height: 10px; background: #1a120c; border: 2px solid #000; }
.sl-barra i { display: block; height: 100%; background: #55c34a; }
.sl-barra.baja i { background: #d8373a; }
.sl-medio small { font-size: 0.7rem; color: #c6c6c6; text-shadow: 2px 2px 0 #3f3f3f; }
.sl-barra.primus i { background: #c04fff; }
.sl-barra.primus.lista { animation: sl-parpadeo 0.5s steps(2) infinite; }
@keyframes sl-parpadeo { 50% { background: #ffff55; } }
.sl-grito { position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%); font-size: 3rem; color: #ff55ff; text-shadow: 4px 4px 0 #3f153f; white-space: nowrap; display: none; }
.sl-grito.visible { display: block; }
.sl-turno { position: absolute; left: 50%; top: 18%; transform: translate(-50%, -50%); font-size: 2.6rem; color: #55ff55; text-shadow: 4px 4px 0 #153f15; white-space: nowrap; display: none; }
.sl-turno.visible { display: block; } .sl-turno.escucha { color: #ffffff; font-size: 1.6rem; }
.sl-duelo { font-size: 1rem; color: #55ffff; }
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
.sl-primusT { position: absolute; top: calc(120px + env(safe-area-inset-top, 0px)); right: 12px; pointer-events: auto; display: none; }
.sl-primusT.visible { display: block; }
.sl-pausaT { position: absolute; top: calc(80px + env(safe-area-inset-top, 0px)); right: 12px; pointer-events: auto; display: none; }
.sl-pausaT.visible { display: block; }
`;

// Estrella de 9×9 para los resultados (sin imágenes ni emojis)
const ESTRELLA = ['....a....', '...aaa...', '...aba...', 'aaaabaaaa', '.aabbbaa.', '..abbba..', '..aabaa..', '.aa...aa.', '.a.....a.'];
function pintarEstrellas(lienzo, n, p = 4) {
    const k = lienzo.getContext('2d'), w = 9 * p;
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
    const rutasTexto = new Map();
    const indexarTextos = (nodo, ruta = []) => {
        for (const [k, valor] of Object.entries(nodo || {})) {
            if (valor && typeof valor === 'object' && typeof valor.es === 'string' && typeof valor.en === 'string') rutasTexto.set(valor, [...ruta, k]);
            else if (valor && typeof valor === 'object' && !Array.isArray(valor)) indexarTextos(valor, [...ruta, k]);
        }
    };
    indexarTextos(TXT_SALONAS);
    const tx = (o, v = {}) => {
        const ruta = rutasTexto.get(o);
        let texto = ruta && datos()?.textos;
        for (const k of ruta || []) texto = texto && texto[k];
        const fuente = texto && (texto[L] || texto.es) ? texto : o;
        return Object.entries(v).reduce((s, [k, x]) => s.replace(`{${k}}`, x), fuente ? fuente[L] || fuente.es : '');
    };
    const datos = () => (ctx.datos && ctx.datos()) || null;
    const layout = () => (ctx.layout && ctx.layout()) || null;
    const ajustes = () => Z.ajustesDe(datos() && datos().juego);
    const reglas = () => P.reglasDe(datos() && datos().reglas);
    let musicaJson = null;
    const listo = cargarMusica().then(d => { musicaJson = d; });
    // La canción: la de musica.json (si el Estudio la aplicó, esa); la de prueba suena aunque sea borrador
    const cancionDe = clave => cancionMusica(clave) || (musicaJson && musicaJson.canciones && musicaJson.canciones[clave]) || null;

    // ---------- DOM ----------
    const estilo = document.createElement('style'); estilo.textContent = CSS_SALONAS; document.head.appendChild(estilo);
    const el = (cls, padre, tag = 'div') => { const e = document.createElement(tag); if (cls) e.className = cls; padre.appendChild(e); return e; };
    const capa = el('sl sl-capa', document.body);
    const progEl = el('sl-progreso', capa);
    const arriba = el('sl-arriba', capa);
    const puntosEl = el('sl-caja sl-puntos', arriba);
    // En el medio: energía del público y barra de Modo Primus
    const medioEl = el('sl-medio', arriba), energiaTxt = el('', medioEl, 'small'), energiaEl = el('sl-barra', medioEl), energiaI = el('', energiaEl, 'i');
    const primusEl = el('sl-barra primus', medioEl), primusI = el('', primusEl, 'i'), primusTxt = el('', medioEl, 'small');
    const comboEl = el('sl-caja sl-combo', arriba);
    const gritoEl = el('sl-grito', capa), turnoEl = el('sl-turno', capa), avisoEl = el('sl-aviso', capa), cuentaEl = el('sl-cuenta', capa), ayudaEl = el('sl-caja sl-ayuda', capa);
    const letrasEl = [0, 1, 2, 3].map(() => el('sl-letra', capa));
    const menuEl = el('sl-caja sl-panel', capa), calEl = el('sl-caja sl-panel', capa), pausaEl = el('sl-caja sl-panel', capa), finalEl = el('sl-caja sl-panel', capa);
    const trastesEl = el('sl-trastes', capa), pausaT = el('sl-pausaT', capa), primusT = el('sl-primusT', capa);
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
    const bPausaT = boton(pausaT, '', () => pausar()), bPrimusT = boton(primusT, '', () => activarPrimus());

    // ---------- Estado ----------
    // c = { fase: 'menu'|'calibra'|'juega'|'pausa'|'cuenta'|'final', A, R, dif, cancion, part, hechas, falladas,
    //       mantiene: Map(idx → último segundo sumado), soltadas, pend: [{ k, hasta }], pts, rep, repBajo, ... }
    let c = null, dificultad = null, cancionElegida = null, calibracion = 0;
    const practica = { activa: false, seccion: 0, tempo: null }; // Práctica: sección y velocidad (no cuenta para récords)
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
    // El local, la banda y el público (salonas-escena.js): viven en la escena de la autopista
    const local = crearEscenaSalonas({ personasMundo: ctx.personasMundo || (() => null), skin: ctx.skin || null });
    let localForzado = null; // depuración: __venjy.salonas.local('bar') toca cualquier canción en ese local
    const localDe = (A, clave) => localForzado || (A.localDe && A.localDe[clave]) || A.local;
    function ponerLocal(A, clave) {
        const L = local.poner(localDe(A, clave), A).L;
        esc.scene.background.set(L.cielo || A.escena.cielo);
        esc.scene.fog.color.set(L.cielo || A.escena.cielo);
        [esc.scene.fog.near, esc.scene.fog.far] = L.niebla || A.escena.niebla;
    }
    const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const v3 = new THREE.Vector3();
    function prepararEscena(A) {
        if (esc && esc.firma === JSON.stringify([A.carriles, A.escena])) return;
        if (esc) { esc.scene.remove(local.raiz); esc.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
        const C = A.carriles, W = C.ancho, N = 4, ancho = N * W, scene = new THREE.Scene();
        scene.background = new THREE.Color(A.escena.cielo);
        scene.fog = new THREE.Fog(A.escena.cielo, A.escena.niebla[0], A.escena.niebla[1]);
        scene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const sol = new THREE.DirectionalLight(0xffffff, 0.7); sol.position.set(2, 8, 4); scene.add(sol);
        scene.add(local.raiz);
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
        if (e.code === 'Space' && c.fase === 'juega') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) activarPrimus(); return; }
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
        c = estadoMenu(A, reglas(), !!(ctx.tactil && ctx.tactil()));
        ponerLocal(A, cancionElegida);
        ctx.bloquear();
        if (document.pointerLockElement) document.exitPointerLock();
        document.body.classList.add('en-salonas');
        if (ctx.tactil && ctx.tactil()) aplicarLayout(layout(), 'salonas');
        capa.classList.add('visible');
        esc.esconder();
        hud(false);
        pintarMenu();
        return true;
    }
    const estadoMenu = (A, R, tactil) => ({ fase: 'menu', A, R, tactil, animo: A.publico.reposo, carril: 1.5, carrilObj: 1.5, slapT: -1e9, falloT: -1e9, solo: 0, primusK: 0 });
    // Vuelve al menú desde los resultados (o la pausa) sin cerrar Salonas
    function aMenu() {
        if (!c) return;
        if (c.rep) { c.rep.parar(); c.repBajo.parar(); }
        callarAudio();
        if (au && au.ctx.state === 'suspended') au.ctx.resume();
        c = estadoMenu(c.A, c.R, c.tactil);
        ponerLocal(c.A, cancionElegida);
        esc.esconder(); hud(false); pintarMenu();
    }
    function hud(v) {
        for (const e of [arriba, progEl, ayudaEl, ...letrasEl]) mostrar(e, v);
        trastesEl.classList.toggle('visible', v && c && c.tactil);
        pausaT.classList.toggle('visible', v && c && c.tactil);
        primusT.classList.toggle('visible', v && c && c.tactil);
        mostrar(medioEl, v);
        if (!v) { for (const e of [avisoEl, cuentaEl, gritoEl, turnoEl]) e.classList.remove('visible'); }
        for (const e of letrasEl) mostrar(e, v && c && !c.tactil);
    }
    function moverDif(d) { const i = P.DIFICULTADES.indexOf(dificultad); dificultad = P.DIFICULTADES[(i + d + P.DIFICULTADES.length) % P.DIFICULTADES.length]; pintarMenu(); }
    function elegirCancion(k) { if (k !== cancionElegida) practica.seccion = 0; cancionElegida = k; ponerLocal(c.A, k); pintarMenu(); }
    function moverCancion(d) {
        const l = c.A.canciones, i = l.indexOf(cancionElegida);
        if (l.length) elegirCancion(l[(i + d + l.length) % l.length]);
    }
    // Secciones de la canción para la Práctica, con su nombre y un número si se repite («Coro 2»)
    function seccionesDe(cancion) {
        const veces = {}, total = {}, sec = mapaTiempo(cancion).secciones;
        for (const q of sec) total[q.seccion] = (total[q.seccion] || 0) + 1;
        return sec.map(q => {
            veces[q.seccion] = (veces[q.seccion] || 0) + 1;
            const base = TXT_SALONAS.secciones[q.seccion], n = total[q.seccion] > 1 ? ` ${veces[q.seccion]}` : '';
            return base ? tx(base) + n : q.seccion + n;
        });
    }
    function pintarMenu(nota = '') {
        panel(menuEl);
        menuEl.textContent = '';
        const A = c.A, cancion = cancionDe(cancionElegida), records = Z.leerRecords(almacen());
        el('', menuEl, 'h2').textContent = tx(TXT_SALONAS.titulo);
        el('', menuEl, 'p').textContent = tx(TXT_SALONAS.dificultad);
        const fila = el('sl-fila', menuEl);
        for (const d of P.DIFICULTADES) boton(fila, tx(TXT_SALONAS.niveles[d]), () => { dificultad = d; pintarMenu(); }, d === dificultad ? 'boton elegido' : 'boton');
        // Canciones por local, con las estrellas y el récord de la dificultad elegida
        el('', menuEl, 'p').textContent = tx(TXT_SALONAS.cancion);
        const lista = el('sl-locales', menuEl), grupos = new Map();
        for (const k of A.canciones) { if (!cancionDe(k)) continue; const l = (A.localDe && A.localDe[k]) || A.local; if (!grupos.has(l)) grupos.set(l, []); grupos.get(l).push(k); }
        for (const [l, claves] of grupos) {
            el('sl-local', lista).textContent = tx(TXT_SALONAS.locales[l]) || l;
            for (const k of claves) {
                const fila2 = el('sl-cancion', lista), rec = Z.recordDe(records, k, dificultad);
                boton(fila2, tx(cancionDe(k).nombre) || k, () => elegirCancion(k), k === cancionElegida ? 'boton elegido' : 'boton');
                pintarEstrellas(el('', fila2, 'canvas'), rec ? rec.estrellas : 0, 2);
                el('', fila2, 'small').textContent = rec ? String(rec.puntos) : tx(TXT_SALONAS.sinRecord);
            }
        }
        // Modo: la gira o la Práctica (sección y velocidad)
        el('', menuEl, 'p').textContent = tx(TXT_SALONAS.modo);
        const fm = el('sl-fila', menuEl);
        boton(fm, tx(TXT_SALONAS.modoGira), () => { practica.activa = false; pintarMenu(); }, practica.activa ? 'boton' : 'boton elegido');
        boton(fm, tx(TXT_SALONAS.modoPractica), () => { practica.activa = true; pintarMenu(); }, practica.activa ? 'boton elegido' : 'boton');
        if (practica.activa && cancion) {
            const nombres = seccionesDe(cancion);
            practica.seccion = Math.min(practica.seccion, nombres.length - 1);
            el('', menuEl, 'p').textContent = tx(TXT_SALONAS.practicaSeccion);
            const fs = el('sl-fila', menuEl);
            nombres.forEach((n, i) => boton(fs, n, () => { practica.seccion = i; pintarMenu(); }, i === practica.seccion ? 'boton elegido' : 'boton'));
            el('', menuEl, 'p').textContent = tx(TXT_SALONAS.practicaVel);
            const fv = el('sl-fila', menuEl), tempo = practica.tempo ?? A.practica.velocidad;
            for (const v of A.practica.velocidades) boton(fv, `${Math.round(v * 100)} %`, () => { practica.tempo = v; pintarMenu(); }, Math.abs(v - tempo) < 1e-6 ? 'boton elegido' : 'boton');
        }
        const cal = el('sl-fila', menuEl);
        const lab = el('', cal, 'label'); lab.textContent = tx(TXT_SALONAS.calibracion) + ' ';
        const inp = el('', lab, 'input'); inp.type = 'number'; inp.step = '1';
        inp.min = String(-A.calibracion.rango * 1000); inp.max = String(A.calibracion.rango * 1000);
        inp.value = String(Math.round(calibracion * 1000));
        inp.addEventListener('change', () => { calibracion = Z.guardarCalibracion(almacen(), parseFloat(inp.value) / 1000, A.calibracion.rango); inp.value = String(Math.round(calibracion * 1000)); });
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
        ponerLocal(A, cancionElegida);
        if (c.rep) { c.rep.parar(); c.repBajo.parar(); }
        // Plano de intro del local: la canción espera a que la cámara llegue detrás de los carriles
        const intro = local.intro(), retraso = Math.max(A.audio.retraso, intro ? intro.seg : 0);
        const x = au.ctx;
        if (x.state !== 'running') x.resume();
        // Práctica: más lenta (mapaTiempo con el tempo) y solo la sección elegida; no cuenta para récords
        const prac = practica.activa, tempo = prac ? Math.max(0.5, Math.min(1, practica.tempo ?? A.practica.velocidad)) : 1;
        // ajustes a mano de la pestaña Ritmo (salonas.json → ajustes.<canción>.<dificultad>): solo cambian el carril o quitan una nota
        const mano = datos() && datos().ajustes && datos().ajustes[cancionElegida] && datos().ajustes[cancionElegida][dificultad];
        const part0 = P.partitura(cancion, dificultad, R, { tempo, ajustes: mano || null });
        let part = part0, desde = 0, fin = part0.duracion;
        if (prac) {
            const sec = part0.secciones[Math.min(practica.seccion, part0.secciones.length - 1)];
            desde = sec.t0; fin = sec.t1;
            part = { ...part0, notas: part0.notas.filter(n => n.t >= desde - 1e-6 && n.t < fin - 1e-6) };
        }
        // La banda sin el bajo y el bajo solo: dos reproductores con el mismo mapa y la misma hora de inicio
        const mudo = conBajo => ({ ...cancion, capas: (cancion.capas || []).map(p => (!!p.bajo === conBajo ? p : { ...p, mudo: true })) });
        const rep = crearReproductorCancion(), repBajo = crearReproductorCancion();
        const mapa = rep.empezar(x, mudo(false), { retraso, tempo, desde });
        repBajo.empezar(x, mudo(true), { mapa, retraso: rep.inicio - x.currentTime + desde, desde });
        const vol = cancion.vol || 1, t0 = x.currentTime;
        au.banda.gain.cancelScheduledValues(t0); au.banda.gain.setValueAtTime(vol * A.audio.volBanda, t0);
        au.bajo.gain.cancelScheduledValues(t0); au.bajo.gain.setValueAtTime(vol * A.audio.volBajo, t0);
        c = { fase: 'juega', A, R, tactil: c.tactil, cancion, part, mapa, rep, repBajo, volBajo: vol * A.audio.volBajo,
            hechas: new Set(), falladas: new Set(), soltadas: new Set(), mantiene: new Map(), pend: [], pts: P.puntajeInicial(),
            maximo: P.puntajeMaximo(part, R), primera: 0, aviso: 0, ultimaNota: null, tJ: desde - retraso, tVis: desde - retraso,
            intro: intro ? { ...intro, desde0: performance.now() } : null, animo: A.publico.reposo, carril: 1.5, carrilObj: 1.5, slapT: -1e9, falloT: -1e9, solo: 0,
            // S8: qué se toca (clave, dificultad, práctica), energía del público, Modo Primus y duelo de solos
            clave: cancionElegida, dif: dificultad, practica: prac, tempo, desde, fin, paso0: Math.max(0, mapa.pasos.findIndex(q => q.t >= desde - 1e-9)),
            energia: A.energia.inicio, piso: dificultad === 'facil' ? A.energia.pisoFacil : 0, abucheado: false,
            primus: { carga: 0, activo: false, resta: 0, veces: 0, fuegosT: 0, porNota: Z.cargaPorNota(part.notas.filter(n => n.brillante).length, A.primus.llenar) }, primusK: 0,
            duelo: { puntos: 0, notas: 0, aciertos: 0 }, dueloN: new Set(part.secciones.filter(q => A.duelo.secciones.includes(q.seccion) || A.duelo.secciones.includes(q.nivel)).map(q => q.n)),
            turnoAv: null, turnoAhora: null, avisoTurno: 0, gritoHasta: 0 };
        primusT.classList.toggle('visible', c.tactil);
        apretadas.clear();
        panel(null);
        hud(true);
        ayudaEl.textContent = tx(c.tactil ? TXT_SALONAS.ayudaTactil : TXT_SALONAS.ayuda) + (c.tactil ? '' : tx(TXT_SALONAS.ayudaPrimus));
        letrasEl.forEach((e, k) => { e.textContent = A.letras[k]; });
        botonesT.forEach((b, k) => { b.textContent = A.letras[k]; b.style.borderColor = A.carriles.colores[k]; });
        bPausaT.textContent = tx(TXT_SALONAS.pausa); bPrimusT.textContent = tx(TXT_SALONAS.primusToque);
        energiaTxt.textContent = tx(TXT_SALONAS.energia);
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
    // Suma al puntaje (con el Modo Primus si está activo); lo que sale de una nota del duelo cuenta también aparte
    function sumar(evento, n = null) {
        const antes = c.pts.puntos;
        c.pts = P.sumar(c.pts, { ...evento, primus: c.primus.activo }, c.R);
        if (n && c.dueloN.has(n.n)) c.duelo.puntos += c.pts.puntos - antes;
    }
    function acierto(r) {
        const n = c.part.notas[r.idx];
        c.hechas.add(r.idx); c.ultimaNota = n.nota;
        sumar({ juicio: r.juicio, marcada: n.marcada }, n);
        c.energia = Z.energiaTras(c.energia, r.juicio, c.A.energia, c.piso);
        if (n.brillante && !c.primus.activo) c.primus.carga = Math.min(1, c.primus.carga + c.primus.porNota);
        if (c.dueloN.has(n.n)) { c.duelo.notas++; c.duelo.aciertos++; }
        if (n.dur > 0) c.mantiene.set(r.idx, n.t);
        c.slapT = performance.now(); c.carrilObj = n.carriles.reduce((a, k) => a + k, 0) / n.carriles.length;
        avisar(r.juicio);
    }
    function fallo(idx) {
        const n = idx === null ? null : c.part.notas[idx];
        if (n) { c.hechas.add(idx); c.falladas.add(idx); }
        sumar({ juicio: 'fallo' }, n);
        c.energia = Z.energiaTras(c.energia, 'fallo', c.A.energia, c.piso);
        if (n && c.dueloN.has(n.n)) c.duelo.notas++;
        apagarBajo();
        c.falloT = performance.now();
        cuerdaMuerta(n ? n.nota : c.ultimaNota);
        avisar('fallo');
    }
    // Modo Primus: con la barra llena, Espacio (o el botón táctil) lo activa: puntos ×primus.factor, la cámara se abre,
    // las luces cambian, el público salta y Salonas grita (fuegos en el festival)
    function activarPrimus() {
        if (!c || c.fase !== 'juega' || c.primus.activo || c.primus.carga < 1) return;
        const Q = c.A.primus, ahora = performance.now();
        Object.assign(c.primus, { activo: true, resta: c.R.primus.seg, carga: 0, fuegosT: 0 }); c.primus.veces++;
        gritoEl.textContent = Q.grito; gritoEl.classList.add('visible'); c.gritoHasta = ahora + Q.gritoSeg * 1000;
        local.celebrar(); c.celebraHasta = ahora + Q.celebraSeg * 1000;
    }
    // Quién toca en el duelo en el segundo t de la canción: 'salonas' | 'tuyo' | null (fuera del duelo)
    function turnoEn(t) {
        if (!c.dueloN.size) return null;
        const ip = pasoEnTiempo(c.mapa, t);
        if (ip < 0) return null;
        const p = c.mapa.pasos[ip], D = c.A.duelo;
        return c.dueloN.has(p.n) ? (p.k % D.ciclo >= D.turnoTuyo ? 'tuyo' : 'salonas') : null;
    }
    function avisar(j) {
        avisoEl.className = `sl-aviso visible ${j}`;
        avisoEl.textContent = tx(TXT_SALONAS.juicios[j]);
        c.aviso = performance.now() + c.A.avisoSeg * 1000;
    }
    function pintarHud() {
        const p = c.pts, Q = c.primus;
        puntosEl.textContent = String(p.puntos);
        const sm = document.createElement('small'); sm.textContent = tx(TXT_SALONAS.puntos); puntosEl.appendChild(sm);
        if (c.dueloN.size) el('sl-duelo', puntosEl, 'small').textContent = `${tx(TXT_SALONAS.duelo)} ${c.duelo.puntos}`;
        energiaI.style.width = `${Math.round(100 * c.energia)}%`; energiaEl.classList.toggle('baja', c.energia < 0.3);
        primusI.style.width = `${Math.round(100 * (Q.activo ? Q.resta / c.R.primus.seg : Q.carga))}%`;
        primusEl.classList.toggle('lista', !Q.activo && Q.carga >= 1);
        primusTxt.textContent = Q.activo ? tx(TXT_SALONAS.primusX, { n: c.R.primus.factor }) : Q.carga >= 1 ? tx(TXT_SALONAS.primusListo) : tx(TXT_SALONAS.primus);
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
        boton(f, tx(TXT_SALONAS.volverMenu), () => aMenu());
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
    // abucheo = true: la energía llegó a cero (sin récord). La Práctica tampoco cuenta para récords.
    function terminar(abucheo = false) {
        c.fase = 'final';
        c.rep.parar(); c.repBajo.parar(); callarAudio();
        c.primus.activo = false; c.abucheado = abucheo; c.turnoAhora = null;
        hud(false);
        const p = c.pts, notas = c.part.notas.length, aciertos = p.conteo.perfecto + p.conteo.bien + p.conteo.ok;
        const nEstrellas = abucheo ? 0 : P.estrellas(p.puntos, c.maximo, c.R);
        const rec = abucheo || c.practica ? null : Z.guardarRecord(almacen(), c.clave, c.dif, { puntos: p.puntos, estrellas: nEstrellas });
        finalEl.textContent = '';
        let titulo = tx(TXT_SALONAS.resultados);
        if (abucheo) titulo = tx(TXT_SALONAS.resAbucheo);
        else if (c.practica) titulo = `${tx(TXT_SALONAS.resPractica)} · ${seccionesDe(c.cancion)[Math.min(practica.seccion, c.part.secciones.length - 1)]} · ${Math.round(c.tempo * 100)} %`;
        el('', finalEl, 'h2').textContent = titulo;
        pintarEstrellas(el('sl-estrellas', finalEl, 'canvas'), nEstrellas);
        if (nEstrellas >= 3 && !c.practica) { local.celebrar(); c.celebraHasta = performance.now() + c.A.publico.celebrarSeg * 1000; }
        const linea = (a, b) => { const e = el('', finalEl, 'p'); e.textContent = `${a}: ${b}`; };
        if (abucheo) el('', finalEl, 'p').textContent = tx(TXT_SALONAS.resAbucheoTxt);
        else if (c.practica) el('', finalEl, 'p').textContent = tx(TXT_SALONAS.resPracticaTxt);
        linea(tx(TXT_SALONAS.puntos), p.puntos);
        if (rec) el('', finalEl, 'p').textContent = rec.nuevo ? tx(TXT_SALONAS.recordNuevo) : tx(TXT_SALONAS.recordAnterior, { x: rec.record.puntos });
        linea(tx(TXT_SALONAS.precision), `${notas ? Math.round(100 * aciertos / notas) : 0} %`);
        linea(tx(TXT_SALONAS.comboMax), p.comboMax);
        if (c.primus.veces) linea(tx(TXT_SALONAS.primusVeces), c.primus.veces);
        if (c.dueloN.size) linea(tx(TXT_SALONAS.dueloPuntos), `${c.duelo.puntos} (${c.duelo.aciertos}/${c.duelo.notas})`);
        if (!abucheo) linea(tx(TXT_SALONAS.publicoFin), `${Math.round(100 * c.energia)} %`);
        el('', finalEl, 'p').textContent = ['perfecto', 'bien', 'ok', 'fallo'].map(j => `${tx(TXT_SALONAS.juicios[j])} ${p.conteo[j]}`).join(' · ');
        const f = el('sl-fila', finalEl);
        boton(f, tx(TXT_SALONAS.otraVez), () => tocar());
        boton(f, tx(TXT_SALONAS.volverMenu), () => aMenu());
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
        aplicarLayout(null, 'salonas');
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
        if (!['juega', 'cuenta', 'pausa'].includes(c.fase)) {
            // Menú y resultados: sin notas; la banda sigue tocando a su pulso de reposo
            if (c.fase === 'menu' || c.fase === 'final') { esc.esconder(); camara(c.A, pintarLocal(ahora, 0), ahora); }
            return;
        }
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
                if (hasta > desde) sumar({ mantener: hasta - desde }, n);
                if (tJ >= n.t + n.dur) c.mantiene.delete(idx); else c.mantiene.set(idx, hasta);
            }
            pintarHud();
            progEl.style.width = `${Math.max(0, Math.min(100, 100 * (tVis - c.desde) / Math.max(1e-6, c.fin - c.desde)))}%`;
            // Modo Primus: se acaba solo; los fuegos se repiten mientras dura; el grito se esconde
            const Q = c.primus;
            if (Q.activo) {
                Q.resta -= c.dt || 0; Q.fuegosT += c.dt || 0;
                if (Q.fuegosT >= A.primus.fuegosCada) { Q.fuegosT = 0; local.celebrar(); c.celebraHasta = ahora + A.primus.celebraSeg * 1000; }
                if (Q.resta <= 0) Q.activo = false;
            }
            if (c.gritoHasta && ahora > c.gritoHasta) { gritoEl.classList.remove('visible'); c.gritoHasta = 0; }
            // Duelo de solos: «¡Te toca!» un poco antes de que empiece tu turno
            c.turnoAhora = turnoEn(tVis);
            const turno = turnoEn(tVis + A.duelo.avisoAntes);
            if (turno !== c.turnoAv) {
                c.turnoAv = turno;
                if (turno) { turnoEl.textContent = tx(turno === 'tuyo' ? TXT_SALONAS.teToca : TXT_SALONAS.escucha); turnoEl.className = `sl-turno visible ${turno === 'tuyo' ? '' : 'escucha'}`; c.avisoTurno = ahora + A.duelo.avisoSeg * 1000; }
            }
            if (c.avisoTurno && ahora > c.avisoTurno) { turnoEl.classList.remove('visible'); c.avisoTurno = 0; }
            if (c.energia <= 0 && !c.practica) { c.abucheado = true; terminar(true); return; }
            if (tJ > c.fin + A.final.cola) { terminar(); return; }
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
        camara(A, pintarLocal(ahora, tVis), ahora);
    }

    // ---------- Banda, público y luces del local ----------
    // El pulso de la banda: el del mapa de tiempo mientras suena la canción; antes de la 1.ª nota sigue el pulso
    // de la primera sección, y en el menú y los resultados, el de reposo (banda.reposoBpm)
    function ritmoDe(tVis, ahora) {
        const A = c.A, m = ['juega', 'cuenta', 'pausa'].includes(c.fase) ? c.mapa : null;
        const ip = m && tVis >= (c.desde || 0) ? pasoEnTiempo(m, tVis) : -1;
        let x, seccion = 'reposo';
        if (ip >= 0) { const p = m.pasos[ip]; x = (ip + Math.min(1, (tVis - p.t) / p.s)) / 4; seccion = m.secciones[p.n].seccion || 'verso'; }
        else if (m && m.pasos.length) { const p0 = m.pasos[c.paso0 || 0]; x = 1000 + (tVis - p0.t) / (p0.s * 4); seccion = 'intro'; }
        else x = ahora / 1000 * A.banda.reposoBpm / 60;
        const pulso = Math.floor(x), fase = x - pulso;
        return {
            pulso, fase, seccion, golpe: Math.pow(1 - fase, 3),
            salto: seccion === 'coro' && pulso % A.banda.saltoCada === 0 ? fase : 0,
            energia: Math.max(0, Math.min(1, (c.animo + 1) / 2))
        };
    }
    let ultimoCuadro = 0;
    function pintarLocal(ahora, tVis) {
        const A = c.A, B = A.banda, U = A.publico;
        const dt = ultimoCuadro ? Math.min(0.05, (ahora - ultimoCuadro) / 1000) : 0; ultimoCuadro = ahora; c.dt = dt;
        // El público sigue a la energía mientras juegas (y abuchea si se acabó); en el menú y los resultados vuelve a reposo
        const juego = c.energia !== undefined && ['juega', 'cuenta', 'pausa'].includes(c.fase);
        const objetivo = juego ? c.energia * 2 - 1 : c.abucheado ? -1 : U.reposo;
        c.animo += (objetivo - c.animo) * Math.min(1, (juego ? A.energia.suavidad : U.vuelta) * dt);
        c.carril += (c.carrilObj - c.carril) * Math.min(1, B.carrilK * dt);
        const ritmo = ritmoDe(tVis, ahora);
        const env = (t0, seg) => { const u = (ahora - t0) / (seg * 1000); return u >= 0 && u < 1 ? Math.sin(Math.PI * u) : 0; };
        const celebra = c.celebraHasta && ahora < c.celebraHasta ? 1 : 0;
        local.cuadro({ ritmo, toca: { carril: c.carril, slap: env(c.slapT, B.slapSeg), fallo: env(c.falloT, B.falloSeg) }, animo: c.animo, t: ahora / 1000, dt, celebra, primus: c.primusK || 0, P: A });
        return ritmo;
    }

    // ---------- Cámara ----------
    // Fija detrás de los carriles y se mece al pulso; se corre hacia Salonas en su solo y empieza en el plano de
    // intro del local (locales.<local>.intro), del que llega a su sitio en intro.seg
    const mira = new THREE.Vector3(), desde = new THREE.Vector3(), miraIntro = new THREE.Vector3();
    function camara(A, ritmo, ahora) {
        const C = A.carriles, K = A.camara, S = A.camaraSolo;
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
        cam.position.y -= K.mecer * Math.pow(Math.sin(Math.PI * ritmo.fase), 2);
        mira.set(0, 0, K.mira);
        if (S) {
            c.solo += ((S.secciones.includes(ritmo.seccion) && c.turnoAhora !== 'tuyo' ? 1 : 0) - c.solo) * Math.min(1, S.k * (c.dt || 0));
            if (c.solo > 1e-3) { cam.position.x += S.pos[0] * c.solo; cam.position.y += S.pos[1] * c.solo; cam.position.z += S.pos[2] * c.solo; mira.x += S.mira[0] * c.solo; mira.y += S.mira[1] * c.solo; mira.z += S.mira[2] * c.solo; }
        }
        // Modo Primus: la cámara se abre (más atrás y más ancha) mientras dura
        const PM = A.primus.camara;
        c.primusK = (c.primusK || 0) + ((c.primus && c.primus.activo ? 1 : 0) - (c.primusK || 0)) * Math.min(1, PM.k * (c.dt || 0));
        if (c.primusK > 1e-3) {
            const q = c.primusK;
            cam.position.x += PM.pos[0] * q; cam.position.y += PM.pos[1] * q; cam.position.z += PM.pos[2] * q;
            mira.x += PM.mira[0] * q; mira.y += PM.mira[1] * q; mira.z += PM.mira[2] * q;
            cam.fov = K.fov + PM.fov * q;
        }
        if (c.intro) {
            const u = (ahora - c.intro.desde0) / (c.intro.seg * 1000);
            if (u >= 1) c.intro = null;
            else {
                const e = u * u * (3 - 2 * u);
                cam.position.lerpVectors(desde.set(...c.intro.desde), cam.position, e);
                mira.lerpVectors(miraIntro.set(...c.intro.mira), mira, e);
            }
        }
        cam.lookAt(mira);
    }
    function dibuja(renderer) {
        if (!c || !esc) return false;
        const w = renderer.domElement.clientWidth || window.innerWidth, h = renderer.domElement.clientHeight || window.innerHeight;
        if (Math.abs(cam.aspect - w / h) > 1e-3) cam.aspect = w / h;
        cam.updateProjectionMatrix();
        renderer.render(esc.scene, cam);
        capa.classList.toggle('sl-intro', !!c.intro); // durante el plano de intro no se ven las letras ni los trastes
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
        local(clave) { localForzado = clave && c && c.A.locales[clave] ? clave : null; if (c) ponerLocal(c.A, cancionElegida); return local.local; },
        calibrar: () => calibrar(),
        primus: () => activarPrimus(), practica, records: () => Z.leerRecords(almacen()),
        get calibracion() { return calibracion; }
    };
}
