// =========================================================
// VENJY · Supervivencia
// El mapa del portafolio (horizontal) subido 48 bloques, con cuevas y menas debajo, para
// sobrevivir: romper y poner, inventario y crafteo, hambre, día y noche, cama, horno, cofres
// y cultivos. Los amigos y las gatas siguen en sus lugares.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { generarDatos } from '../mundo-datos.js';
import { crearAtlas, animarAgua, B } from '../texturas.js';
import { prepararTerreno, MundoVoxel, ESCALA, CHUNK, ALTO, fijarAlto, ALTO_SUPERVIVENCIA, DESNIVEL_SUPERVIVENCIA, recalcularEmisores, llenarChunk, mallarChunkCrudo } from '../voxeles.js';
import { Jugador } from '../jugador.js';
import { crearCielo, COLOR_HORIZONTE } from '../cielo.js';
import { iniciarTactil } from '../tactil.js';
import { crearMinimapa } from '../minimapa.js';
import { crearGatas } from '../gatas.js';
import { crearNPCs } from '../criaturas/npcs.js';
import { crearAnimales } from '../criaturas/animales.js';
import { crearAmigos } from '../criaturas/amigos.js';
import { crearVenjys } from '../criaturas/venjy.js';
import { silenciarMundo, mundoSilenciado } from '../criaturas/cuerpo.js';
import { destinos as destinosZonas } from '../portafolio/zonas.js';
import { listarMundos, cargarMundo, guardarMundo, borrarMundo, exportarMundo, importarMundo, nuevoId, serializarEdiciones, cargarEdiciones, MAX_MUNDOS } from './guardado.js';
import { Inventario } from './inventario.js';
import { O, nombreDe } from './objetos.js';
import { fijarAtlasBloques } from './iconos.js';
import { crearHUD } from './hud.js';
import { crearVentanas } from './ui-inventario.js';
import { crearEntidades } from './entidades.js';
import { crearContenedores } from './contenedores.js';
import { crearAgricultura } from './agricultura.js';
import { crearMinado } from './minado.js';
import { crearVida, CAUSAS } from './vida.js';
import { crearDia } from './dia.js';
import { vistaDesplazada } from './desplazado.js';
import { iniciarTactilSupervivencia } from './tactil-supervivencia.js';
import { crearMano } from './mano.js';
import { crearParticulas } from './particulas.js';
import { crearGanado } from './ganado.js';
import { crearProyectiles } from './proyectiles.js';
import { crearEnemigos } from './enemigos.js';
import { crearCombate } from './combate.js';
import { crearPesca } from './pesca.js';
import { crearMisiones } from './misiones.js';
import { crearJefes } from './jefes.js';
import { mostrarCreditos } from './creditos.js';
import { crearEditorSkin, cargarSkin, coloresMano, BASES, caraDeSkin } from './skin.js';
import { crearCamaras } from './camaras.js';
import { crearEscenasSkin } from './escenas-skin.js';
import { crearCaricias } from './caricias.js';
import { crearEscenasGatas } from './escenas-gatas.js';
import { crearEscenaCuello } from './escena-cuello.js';
import { crearRondaIglu } from './ronda-iglu.js';
import { crearMinijuegos } from './minijuego.js';
import { NIVEL_ANIMACION, momentoListo } from './amistad.js';
import { crearMusica } from './musica.js';
import { crearConsola } from './consola.js';
import { crearRecorridoEscenas } from './recorrido-escenas.js';
import { crearComandosDev } from './comandos-dev.js';
import { rayoCaja } from '../fisica.js';
import { lanzarRayo } from '../rayo.js';
import { crearCofresCompaneros } from './cofres-companeros.js';
import { crearEscenaGuardian } from './escena-guardian.js';
import { hospedar, unirse, hospedarLocal, unirseLocal, guardadoDeInvitado, crearCoop, idDispositivo, MAX_COOP, MAX_RESPALDO } from './coop.js';
import { crearPanelQR } from './ui-qr.js';
import { normalizarNombre, normalizarCodigo } from '../online/red.js';
import { ONLINE_ACTIVO } from '../online/config.js';

fijarAlto(ALTO_SUPERVIVENCIA);
const DY = DESNIVEL_SUPERVIVENCIA;

// ---------------------------------------------------------
// Idioma
// ---------------------------------------------------------
let idioma = 'es';
try {
    const param = new URLSearchParams(location.search).get('lang');
    const guardado = localStorage.getItem('preferredLanguage');
    idioma = param === 'en' || param === 'es' ? param : (guardado === 'en' ? 'en' : 'es');
} catch (e) { /* sin almacenamiento */ }

function aplicarIdioma() {
    document.documentElement.lang = idioma;
    document.querySelectorAll('[data-es]').forEach(el => {
        const t = el.getAttribute(`data-${idioma}`);
        if (t !== null) el.textContent = t;
    });
    document.getElementById('volver').href = `index.html?lang=${idioma}`;
    document.getElementById('ir-creativo').href = `mundo.html?lang=${idioma}`;
}
aplicarIdioma();

const TXT = {
    es: {
        dificultades: ['Pacífico', 'Fácil', 'Normal', 'Difícil'], jugar: 'Jugar', exportar: 'Exportar', borrar: 'Borrar',
        confirmarBorrar: n => `¿Borrar «${n}» para siempre? No se puede deshacer.`, vacio: 'Aún no tienes mundos.',
        dia: n => `Día ${n}`, lleno: `Tienes ${MAX_MUNDOS} mundos: borra uno para crear otro.`, mundo: 'Mi mundo',
        generando: 'Generando el mundo…', guardado: 'Partida guardada', importado: 'Partida importada', errorGuardar: 'No se pudo guardar la partida',
        noDormir: 'Solo puedes dormir de noche', monstruos: 'No puedes dormir ahora: hay monstruos cerca', durmiendo: 'Durmiendo…', spawn: 'Punto de reaparición fijado',
        muerteCausa: c => (CAUSAS[c] || CAUSAS.golpe).es, sinAlmacen: 'Este navegador no permite guardar partidas (modo privado).',
        completado: 'Completado', jugado: m => `${m} min jugados`, clicSeguir: 'Haz clic para seguir jugando',
        hospedar: 'Hospedar', conectando: 'Conectando…', creandoSala: 'Abriendo la sala…', bajandoMundo: 'Bajando el mundo del anfitrión…',
        faltaNombre: 'Escribe tu nombre.', faltaCodigo: 'Escribe el código de la sala (6 letras o números).',
        errores: { 'sin-anfitrion': 'No hay nadie hospedando esa sala.', llena: `La sala está llena (máximo ${MAX_COOP}).`, 'llena-respaldo': `Tu red no permite conexión directa y la sala ya tiene ${MAX_RESPALDO} o más jugadores.`, foto: 'El anfitrión no mandó el mundo. Prueba de nuevo.', codigo: 'No se pudo abrir la sala. Prueba de nuevo.', 'sin-config': 'El modo online no está configurado.' },
        errorRed: 'No se pudo conectar', sala: (c, n) => `Sala ${c} · ${n}/${MAX_COOP}`, copiado: 'Código copiado',
        copiaGuardada: 'Copia guardada en este dispositivo', copiaLlena: `Ya tienes ${MAX_MUNDOS} mundos: borra uno para guardar la copia.`,
        finAnfitrion: 'El anfitrión cerró la partida.', finConexion: 'Se cortó la conexión con la sala.', copia: n => `${n} (copia)`,
        finLocal: 'Se cortó la conexión con el anfitrión. Para volver, pídele una invitación nueva («Invitar jugador» en su pausa).',
        salaLocal: n => `Sala sin internet · ${n}/${MAX_COOP}`, invitarTitulo: 'Invitar jugador', unirseTitulo: 'Unirse con QR',
        pasoInvitar1: '1. Tu amigo elige «Unirse con QR (sin internet)» en el menú y escanea este código.',
        pasoInvitar2: '2. Después escanea el código de respuesta que aparece en su pantalla.',
        pasoUnirse1: '1. Escanea la invitación que muestra el anfitrión («Invitar jugador» en su pausa).',
        pasoUnirse2: '2. Muestra este código al anfitrión para que lo escanee.',
        preparando: 'Preparando la respuesta…', esperandoAnfitrion: 'Esperando a que el anfitrión lea tu código…', conectandoQR: 'Conectando…',
        entroQR: n => `${n} entró a la sala`, avisoLocal: 'Sala sin internet: invita a cada amigo desde la pausa («Invitar jugador»).', solos: 'Solo tú',
        erroresQR: {
            'qr-ilegible': 'Ese código no es de Venjy o está incompleto.', 'qr-tipo': 'Ese código no corresponde a este paso.',
            'qr-otra': 'Esa respuesta es de otra invitación. Usa la última.', 'qr-conexion': 'No se pudo conectar. ¿Están en la misma red? Prueba con una invitación nueva.',
            'sin-camara': 'No hay cámara disponible: usa el texto.'
        }
    },
    en: {
        dificultades: ['Peaceful', 'Easy', 'Normal', 'Hard'], jugar: 'Play', exportar: 'Export', borrar: 'Delete',
        confirmarBorrar: n => `Delete "${n}" forever? This can't be undone.`, vacio: "You don't have any worlds yet.",
        dia: n => `Day ${n}`, lleno: `You have ${MAX_MUNDOS} worlds: delete one to create another.`, mundo: 'My world',
        generando: 'Generating the world…', guardado: 'Game saved', importado: 'World imported', errorGuardar: "Couldn't save the game",
        noDormir: 'You can only sleep at night', monstruos: 'You may not rest now; there are monsters nearby', durmiendo: 'Sleeping…', spawn: 'Respawn point set',
        muerteCausa: c => (CAUSAS[c] || CAUSAS.golpe).en, sinAlmacen: "This browser can't save games (private mode).",
        completado: 'Completed', jugado: m => `${m} min played`, clicSeguir: 'Click to keep playing',
        hospedar: 'Host', conectando: 'Connecting…', creandoSala: 'Opening the room…', bajandoMundo: "Downloading the host's world…",
        faltaNombre: 'Enter your name.', faltaCodigo: 'Enter the room code (6 letters or numbers).',
        errores: { 'sin-anfitrion': 'Nobody is hosting that room.', llena: `The room is full (max ${MAX_COOP}).`, 'llena-respaldo': `Your network doesn't allow a direct connection and the room already has ${MAX_RESPALDO} or more players.`, foto: "The host didn't send the world. Try again.", codigo: "Couldn't open the room. Try again.", 'sin-config': 'Online mode is not configured.' },
        errorRed: "Couldn't connect", sala: (c, n) => `Room ${c} · ${n}/${MAX_COOP}`, copiado: 'Code copied',
        copiaGuardada: 'Copy saved on this device', copiaLlena: `You already have ${MAX_MUNDOS} worlds: delete one to save the copy.`,
        finAnfitrion: 'The host closed the game.', finConexion: 'The connection to the room was lost.', copia: n => `${n} (copy)`,
        finLocal: 'The connection to the host was lost. To come back, ask for a new invite («Invite player» in their pause menu).',
        salaLocal: n => `Offline room · ${n}/${MAX_COOP}`, invitarTitulo: 'Invite player', unirseTitulo: 'Join with QR',
        pasoInvitar1: '1. Your friend picks «Join with QR (offline)» in the menu and scans this code.',
        pasoInvitar2: '2. Then scan the reply code shown on their screen.',
        pasoUnirse1: '1. Scan the invite shown by the host («Invite player» in their pause menu).',
        pasoUnirse2: '2. Show this code to the host so they can scan it.',
        preparando: 'Preparing the reply…', esperandoAnfitrion: 'Waiting for the host to read your code…', conectandoQR: 'Connecting…',
        entroQR: n => `${n} joined`, avisoLocal: 'Offline room: invite each friend from the pause menu («Invite player»).', solos: 'Just you',
        erroresQR: {
            'qr-ilegible': "That code isn't from Venjy or is incomplete.", 'qr-tipo': "That code doesn't belong to this step.",
            'qr-otra': 'That reply belongs to another invite. Use the latest one.', 'qr-conexion': "Couldn't connect. Are you on the same network? Try a new invite.",
            'sin-camara': 'No camera available: use the text.'
        }
    }
};
const tx = () => TXT[idioma];

// ---------------------------------------------------------
// Render (igual que el creativo)
// ---------------------------------------------------------
const lienzo = document.getElementById('juego');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
const scene = new THREE.Scene();
scene.background = COLOR_HORIZONTE;
const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const atlasLienzo = crearAtlas();
fijarAtlasBloques(atlasLienzo);
const atlas = new THREE.CanvasTexture(atlasLienzo);
atlas.magFilter = THREE.NearestFilter; atlas.minFilter = THREE.NearestFilter;
atlas.generateMipmaps = false; atlas.colorSpace = THREE.SRGBColorSpace;
const materiales = {
    solido: new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5 }),
    agua: new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false })
};
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
});

// ---------------------------------------------------------
// Ajustes (se guardan en el navegador)
// ---------------------------------------------------------
const AJUSTES_CLAVE = 'venjy-supervivencia-ajustes';
const ajustes = { distancia: 8, fov: 70, sens: 22 };
try { Object.assign(ajustes, JSON.parse(localStorage.getItem(AJUSTES_CLAVE) || '{}')); } catch (e) { /* sin almacenamiento */ }
const guardarAjustes = () => { try { localStorage.setItem(AJUSTES_CLAVE, JSON.stringify(ajustes)); } catch (e) { /* sin almacenamiento */ } };

// ---------------------------------------------------------
// Menú de mundos
// ---------------------------------------------------------
const $ = id => document.getElementById(id);
const pantallas = ['menu-mundos', 'crear-mundo', 'pausa', 'muerte', 'pantalla-skin', 'coop-fin', 'hospedar-modo', 'panel-qr'];
function mostrar(id) {
    $('inicio').hidden = !id;
    for (const p of pantallas) $(p).hidden = p !== id;
}

const datos = generarDatos('h');
const terreno = prepararTerreno(datos, { supervivencia: true });

async function pintarMenu() {
    mostrar('menu-mundos');
    $('carga').hidden = true;
    let lista = [];
    try { lista = await listarMundos(); } catch (e) {
        $('carga').hidden = false; $('carga').textContent = tx().sinAlmacen;
    }
    const ul = $('lista-mundos');
    ul.textContent = '';
    ul.hidden = false;
    if (!lista.length) {
        const li = document.createElement('li'); li.className = 'vacio'; li.textContent = tx().vacio; ul.appendChild(li);
    }
    for (const m of lista) {
        const li = document.createElement('li');
        li.className = 'tarjeta-mundo';
        const info = document.createElement('div');
        info.className = 'info-mundo';
        const n = document.createElement('b'); n.textContent = m.nombre;
        const d = document.createElement('span');
        d.textContent = [tx().dificultades[m.dificultad] || '', tx().dia(m.dias + 1), tx().jugado(Math.round(m.jugado / 60)), m.completado ? tx().completado : ''].filter(Boolean).join(' · ');
        info.append(n, d);
        const botones = document.createElement('div');
        botones.className = 'botones-mundo';
        const bj = boton(tx().jugar, () => jugar(m.id));
        const bh = boton(tx().hospedar, () => elegirHospedar(m.id), 'secundario');
        const be = boton(tx().exportar, () => exportarMundo(m.id).catch(err => alert(err.message)), 'secundario');
        const bb = boton(tx().borrar, async () => { if (confirm(tx().confirmarBorrar(m.nombre))) { await borrarMundo(m.id); pintarMenu(); } }, 'secundario peligro');
        botones.append(bj, bh, be, bb);
        li.append(info, botones);
        ul.appendChild(li);
    }
    $('nuevo-mundo').hidden = false;
    $('nuevo-mundo').disabled = lista.length >= MAX_MUNDOS;
    $('nuevo-mundo').title = lista.length >= MAX_MUNDOS ? tx().lleno : '';
    $('importar').hidden = false;
    $('coop-menu').hidden = false; // sin internet también se juega (QR)
    $('coop-fila-codigo').hidden = !ONLINE_ACTIVO;
}

// ---------------------------------------------------------
// Jugar con amigos (supervivencia cooperativa)
// ---------------------------------------------------------
const NOMBRE_CLAVE = 'venjy-mundo-online'; // el mismo nombre que el modo online del creativo
function nombreGuardado() { try { return (JSON.parse(localStorage.getItem(NOMBRE_CLAVE)) || {}).nombre || ''; } catch (e) { return ''; } }
function guardarNombre(nombre) {
    try { const v = JSON.parse(localStorage.getItem(NOMBRE_CLAVE)) || {}; v.nombre = nombre; localStorage.setItem(NOMBRE_CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ }
}
$('coop-nombre').value = normalizarNombre(nombreGuardado());
function estadoCoop(texto, error = false) {
    const p = $('coop-estado');
    p.hidden = !texto; p.textContent = texto || ''; p.classList.toggle('error', error);
}
function leerNombre() {
    const nombre = normalizarNombre($('coop-nombre').value);
    if (!nombre) { estadoCoop(tx().faltaNombre, true); $('coop-nombre').focus(); return null; }
    guardarNombre(nombre);
    return nombre;
}
const mensajeError = e => tx().errores[e.codigo] || tx().erroresQR[e.codigo] || `${tx().errorRed}: ${e.message}`;
let ocupadoCoop = false;
// «Hospedar»: con internet (código de sala) o sin internet (QR); sin Supabase configurado, directo al QR
let mundoPorHospedar = null;
function elegirHospedar(id) {
    if (ocupadoCoop || !leerNombre()) return;
    if (!ONLINE_ACTIVO) { hospedarMundo(id, true); return; }
    mundoPorHospedar = id;
    mostrar('hospedar-modo');
}
$('hospedar-internet').addEventListener('click', () => { pintarMenu(); hospedarMundo(mundoPorHospedar, false); });
$('hospedar-local').addEventListener('click', () => { pintarMenu(); hospedarMundo(mundoPorHospedar, true); });
$('hospedar-cancelar').addEventListener('click', () => pintarMenu());
async function hospedarMundo(id, local) {
    if (ocupadoCoop) return;
    const nombre = leerNombre();
    if (!nombre) return;
    ocupadoCoop = true;
    estadoCoop(tx().creandoSala);
    try {
        const m = await cargarMundo(id);
        if (!m) throw new Error('No existe el mundo');
        const cx = await (local ? hospedarLocal : hospedar)({ nombre, skin: cargarSkin() });
        estadoCoop('');
        iniciarJuego(m, cx);
    } catch (e) { console.error(e); estadoCoop(mensajeError(e), true); }
    ocupadoCoop = false;
}
$('coop-unirse').addEventListener('click', async () => {
    if (ocupadoCoop) return;
    const nombre = leerNombre();
    if (!nombre) return;
    const codigo = normalizarCodigo($('coop-codigo').value);
    if (codigo.length < 4) { estadoCoop(tx().faltaCodigo, true); $('coop-codigo').focus(); return; }
    ocupadoCoop = true;
    estadoCoop(tx().conectando);
    try {
        const cx = await unirse({ codigo, nombre, skin: cargarSkin(), alAvance: () => estadoCoop(tx().bajandoMundo) });
        estadoCoop('');
        iniciarJuego(guardadoDeInvitado(cx), cx);
    } catch (e) { console.error(e); estadoCoop(mensajeError(e), true); }
    ocupadoCoop = false;
});
// Unirse sin internet: leer la invitación del anfitrión, mostrarle la respuesta y esperar
const panelQR = crearPanelQR({ idioma });
$('coop-qr').addEventListener('click', async () => {
    if (ocupadoCoop) return;
    const nombre = leerNombre();
    if (!nombre) return;
    ocupadoCoop = true;
    estadoCoop('');
    let cancelado = false;
    panelQR.abrir({ titulo: tx().unirseTitulo, cancelar: () => { cancelado = true; pintarMenu(); } });
    mostrar('panel-qr');
    try {
        for (;;) {
            const invitacion = await panelQR.pedir(tx().pasoUnirse1);
            if (invitacion == null || cancelado) break;
            panelQR.estado(tx().preparando);
            try {
                const cx = await unirseLocal({
                    nombre, skin: cargarSkin(), invitacion, cancelado: () => cancelado,
                    alRespuesta: r => {
                        panelQR.ocultarPedir();
                        panelQR.mostrarCodigo(r, caraDeSkin(cargarSkin()), tx().pasoUnirse2);
                        panelQR.estado(tx().esperandoAnfitrion);
                    },
                    alAvance: () => panelQR.estado(tx().bajandoMundo)
                });
                panelQR.cerrar();
                iniciarJuego(guardadoDeInvitado(cx), cx);
                break;
            } catch (e) {
                if (cancelado || e.codigo === 'cancelada') break;
                console.warn(e);
                panelQR.ocultarCodigo();
                panelQR.estado(mensajeError(e), true);
            }
        }
    } finally { ocupadoCoop = false; }
});
$('coop-codigo').addEventListener('input', e => { e.target.value = normalizarCodigo(e.target.value).slice(0, 12); });

function boton(texto, f, clase = '') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'boton ' + clase;
    b.textContent = texto;
    b.addEventListener('click', f);
    return b;
}

$('nuevo-mundo').addEventListener('click', () => {
    mostrar('crear-mundo');
    $('nombre-mundo').value = tx().mundo;
    $('nombre-mundo').focus();
    $('nombre-mundo').select();
});
$('cancelar-crear').addEventListener('click', () => pintarMenu());
$('crear').addEventListener('click', async () => {
    const nombre = ($('nombre-mundo').value || tx().mundo).trim().slice(0, 24) || tx().mundo;
    const dificultad = Number(document.querySelector('input[name="dificultad"]:checked').value);
    const m = { id: nuevoId(), nombre, dificultad, creado: Date.now(), jugado: 0 };
    try { await guardarMundo(m); } catch (e) { /* sin almacenamiento: se juega igual sin guardar */ }
    iniciarJuego(m);
});
$('importar').addEventListener('click', () => $('archivo-importar').click());
$('archivo-importar').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try { await importarMundo(f); pintarMenu(); } catch (err) { alert(err.message); }
});

// ---------------------------------------------------------
// Editor de skin (desde el menú o desde la pausa)
// ---------------------------------------------------------
let juego = null, editor = null;
function abrirEditorSkin(volver) {
    mostrar('pantalla-skin');
    if (editor) editor.destruir();
    editor = crearEditorSkin({
        contenedor: $('pantalla-skin'), idioma,
        alGuardar: d => { if (juego) juego.ponerSkin(d); },
        alVolver: () => { editor.destruir(); editor = null; if (volver === 'pausa') mostrar('pausa'); else pintarMenu(); }
    });
}
$('ir-skin').addEventListener('click', () => abrirEditorSkin('menu'));

async function jugar(id) {
    const m = await cargarMundo(id);
    if (m) iniciarJuego(m);
}

// ---------------------------------------------------------
// Juego
// ---------------------------------------------------------
let enJuego = false;
// cx: conexión de la sala cooperativa (null = un jugador)
function iniciarJuego(guardado, cx = null) {
    if (enJuego) return;
    enJuego = true;
    mostrar('menu-mundos');
    $('lista-mundos').hidden = true;
    for (const id of ['nuevo-mundo', 'importar', 'coop-menu']) $(id).hidden = true;
    $('carga').hidden = false;
    $('carga').textContent = tx().generando;
    setTimeout(() => arrancar(guardado, cx).catch(err => { console.error(err); $('carga').textContent = 'Error: ' + err.message; }), 30);
}

async function arrancar(guardado, cx = null) {
    const miDisp = idDispositivo();
    const invitado = !!(cx && cx.rol === 'invitado');
    // Ediciones del mundo antes de crear el gestor de chunks (los workers las reciben al iniciar)
    cargarEdiciones(guardado.ediciones, terreno.ediciones);
    recalcularEmisores(terreno);

    const bordeFog = ajustes.distancia * CHUNK;
    scene.fog = new THREE.Fog(COLOR_HORIZONTE, bordeFog * 0.55, bordeFog * 0.95);
    camara.far = 2000;
    camara.fov = ajustes.fov;
    camara.updateProjectionMatrix();

    const cielo = crearCielo(scene, terreno.BW, terreno.BD, materiales);
    const mundo = new MundoVoxel(scene, terreno, materiales, ajustes.distancia);
    const jugador = new Jugador(camara, mundo, lienzo, { x: terreno.BW, z: terreno.BD });
    jugador.sinVuelo = true;
    jugador.vCorrer = 6.1;        // un poco más rápido que el creativo (5,6)
    jugador.impulsoSalto = 1.6;   // saltar corriendo suma impulso…
    jugador.topeSalto = 7.6;      // …hasta este tope (correr y saltar es más rápido que solo correr)
    jugador.sensibilidad = ajustes.sens / 10000;

    const [sx, sz] = datos.P.spawn;
    const spawnMundo = { x: sx * ESCALA + 2.5, z: sz * ESCALA + 2.5 };
    spawnMundo.y = terreno.HT[Math.floor(spawnMundo.z) * terreno.BW + Math.floor(spawnMundo.x)] + DY + 1;
    let spawnCama = guardado.spawnCama || null;

    // ---- Chunks y lugar seguro ----
    // Carga un chunk ya, sin esperar al presupuesto del bucle (hace falta para elegir un hueco y para no caer)
    function cargarChunkAhora(cx, cz) {
        const k = cx + ',' + cz;
        if (cx < 0 || cz < 0 || cx >= mundo.cx || cz >= mundo.cz || mundo.chunks.has(k)) return;
        const relleno = llenarChunk(terreno, cx, cz);
        mundo.instalar(k, mallarChunkCrudo(cx, cz, relleno), relleno.vox, relleno.luz);
    }
    // Carga los chunks cercanos a (x, z) antes de soltar al jugador, y deja planeados los demás
    function cargarCerca(x, z) {
        mundo.planificar(x, z);
        for (const c of mundo.cola) if (c.d2 <= 4) cargarChunkAhora(c.x, c.z);
    }
    // Un hueco donde cabe el cuerpo del jugador cerca de (x, y, z). Si ya está libre se devuelve tal cual
    // (si cae, el suelo lo para); si está dentro de un bloque, sube hasta aire con suelo sólido debajo.
    // Devuelve null si no hay sitio.
    function lugarLibre(x, y, z) {
        for (const dx of [-0.4, 0.4]) for (const dz of [-0.4, 0.4]) cargarChunkAhora(Math.floor((x + dx) / CHUNK), Math.floor((z + dz) / CHUNK));
        if (!jugador.choca(x, y, z)) return { x, y, z };
        const bx = Math.floor(x), bz = Math.floor(z);
        for (let yy = Math.floor(y) + 1; yy < ALTO - 2; yy++) {
            if (jugador.choca(x, yy, z) || mundo.bloque(bx, yy, bz) === B.LAVA) continue;
            if (jugador.solido(bx, yy - 1, bz)) return { x, y: yy, z };
        }
        return null;
    }
    // Punto de reaparición: la cama si sigue en pie, si no el spawn del mapa
    function puntoReaparicion() {
        if (spawnCama) {
            cargarChunkAhora(Math.floor(spawnCama.x / CHUNK), Math.floor(spawnCama.z / CHUNK));
            const c = mundo.bloque(spawnCama.x, spawnCama.y - 1, spawnCama.z) !== 0 ? lugarLibre(spawnCama.x, spawnCama.y, spawnCama.z) : null;
            if (c) return c;
            spawnCama = null; // la cama se rompió o no hay sitio junto a ella
        }
        return lugarLibre(spawnMundo.x, spawnMundo.y, spawnMundo.z) || spawnMundo;
    }

    // Una partida guardada muerta (o con vida 0 de una versión anterior) vuelve al punto de reaparición
    const estabaMuerto = !!guardado.vida && !(guardado.vida.vida > 0);
    const inicio = estabaMuerto || !guardado.jugador ? puntoReaparicion() : (lugarLibre(guardado.jugador.x, guardado.jugador.y, guardado.jugador.z) || spawnMundo);
    cargarCerca(inicio.x, inicio.z);
    mundo.iniciarWorkers('h', Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 2)));
    jugador.colocar(inicio.x, inicio.y, inicio.z);
    const tit = datos.titulo;
    jugador.yaw = guardado.jugador ? guardado.jugador.yaw : Math.atan2(-(tit.tx0 + tit.anchoT / 2 - sx), -(tit.ty0 + tit.altoT / 2 - sz));
    jugador.pitch = guardado.jugador ? guardado.jugador.pitch : 0;

    // ---- Sistemas ----
    const inventario = new Inventario();
    inventario.cargar(guardado.inventario);
    const hud = crearHUD({ inventario, idioma });
    const contenedores = crearContenedores({ mundo, terreno });
    contenedores.cargar(guardado.contenedores);
    const agricultura = crearAgricultura({ mundo });
    agricultura.cargar(guardado.agricultura);
    const entidades = crearEntidades({ scene, mundo, jugador, inventario, atlas, tinteMundo: materiales.solido.color });
    entidades.cargar(guardado.entidades);
    const dia = crearDia({ cielo });
    dia.cargar(guardado.dia);
    let jugado = guardado.jugado || 0;

    // Ventanas: al abrir se libera el puntero sin mostrar la pausa; al cerrar se vuelve a jugar
    let uiAbierta = false;
    const soltarDelante = (id, n, d) => {
        const dir = new THREE.Vector3(); camara.getWorldDirection(dir);
        entidades.soltar(id, n, d, jugador.pos.x + dir.x * 0.5, jugador.pos.y + 1.3, jugador.pos.z + dir.z * 0.5, dir.multiplyScalar(4).add(new THREE.Vector3(0, 1.5, 0)), 1.5);
    };
    const ventanasBase = crearVentanas({
        inventario, contenedores, idioma, soltar: soltarDelante,
        alCerrar: () => { uiAbierta = false; if (!vida.muerto) entrar(); }
    });
    // Panel de diálogo (misiones): como una ventana, libera el puntero sin pausar
    const capaPanel = document.createElement('div');
    capaPanel.className = 'capa-mision';
    capaPanel.hidden = true;
    document.body.appendChild(capaPanel);
    function abrirPanel(el, op = {}) {
        uiAbierta = true;
        if (op.enfocar && camaras) camaras.iniciarCine(op.enfocar);
        // «Hablar» (bloque 6a) no corta el juego: sin cámara de cine y con el panel a un costado
        if (op.hablar && camaras && camaras.enCine) camaras.terminarCine();
        // La tienda abierta desde «Hablar» (sin cine) también va al costado, para ver al amigo y su globo
        capaPanel.classList.toggle('capa-hablar', !!op.hablar || (!!op.lado && camaras && !camaras.enCine));
        document.body.classList.toggle('panel-lado', capaPanel.classList.contains('capa-hablar')); // supervivencia.css oculta el seguimiento de misión
        const aviso = document.querySelector('.clic-seguir'); // sin cine queda a la vista: con un panel abierto no hace falta
        if (aviso) aviso.hidden = true;
        jugador.teclas.clear();
        if (tactil) tactil.desactivar(); else if (document.pointerLockElement) document.exitPointerLock();
        capaPanel.textContent = '';
        capaPanel.appendChild(el);
        capaPanel.hidden = false;
    }
    function cerrarPanel() {
        if (capaPanel.hidden) return;
        capaPanel.hidden = true;
        capaPanel.textContent = '';
        document.body.classList.remove('panel-lado');
        uiAbierta = false;
        if (camaras) camaras.terminarCine();
        if (!vida.muerto) entrar();
    }
    const ventanas = {
        get abierta() { return ventanasBase.abierta || !capaPanel.hidden || !!(consola && consola.abierta); },
        abrir(tipo, extra) {
            uiAbierta = true;
            jugador.teclas.clear();
            if (tactil) tactil.desactivar(); else if (document.pointerLockElement) document.exitPointerLock();
            ventanasBase.abrir(tipo, extra);
        },
        cerrar: () => ventanasBase.cerrar(true)
    };

    const vida = crearVida({
        jugador, mundo, inventario, dificultad: guardado.dificultad ?? 2,
        // Dentro de un bloque al cargar o reaparecer: se sube a un hueco libre
        alAtascarse: () => {
            const p = lugarLibre(jugador.pos.x, jugador.pos.y, jugador.pos.z);
            if (!p) return false;
            jugador.colocar(p.x, p.y, p.z);
            return true;
        },
        alMorir: causa => {
            if (misiones) misiones.alMorir();
            if (jefes) jefes.alMorirJugador();
            for (const p of inventario.vaciar()) entidades.soltar(p.id, p.n, p.d, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
            ventanasBase.cerrar();
            $('causa-muerte').textContent = tx().muerteCausa(causa);
            if (tactil) tactil.desactivar(); else if (document.pointerLockElement) document.exitPointerLock();
            mostrar('muerte');
            guardarYa();
        }
    });
    vida.cargar(guardado.vida);
    if (vida.muerto) vida.reaparecer(); // partida guardada con vida 0: se empieza de nuevo en el punto de reaparición
    jugador.vivo = true;

    // ---- Criaturas del creativo, en coordenadas desplazadas ----
    const vista = vistaDesplazada({ scene, mundo, jugador, camara, dy: DY });
    const ctxCriaturas = { datos, terreno, mundo: vista.mundo, jugador: vista.jugador, materiales };
    const gatas = crearGatas(vista.grupo, ctxCriaturas);
    const animales = crearAnimales(vista.grupo, ctxCriaturas);
    const npcs = crearNPCs(vista.grupo, { ...ctxCriaturas, gatas, carteles: null, idioma });
    const amigos = crearAmigos(vista.grupo, { ...ctxCriaturas, npcs, idioma });
    const venjys = crearVenjys(vista.grupo, { ...ctxCriaturas, destinos: destinosZonas({ terreno, datos }), orientacion: 'h', idioma });
    const minimapa = crearMinimapa(datos, $('hud'), ESCALA);
    minimapa.fijarPersonas(() => [...npcs.lista, ...amigos.lista, ...venjys.lista]);

    // ---- Mundo vivo: partículas, ganado, monstruos, proyectiles, combate y pesca ----
    const particulas = crearParticulas({ scene, atlasLienzo });
    const ganado = crearGanado({ animales, entidades, inventario, jugador, dy: DY, scene, hud, idioma });
    ganado.cargar(guardado.ganado);
    let enemigos = null, misiones = null, jefes = null, escenas = null, escenaCuello = null;
    let coop = null; // sala cooperativa (se crea más abajo, cuando ya existen todos los sistemas)
    const objetivosTodos = (x, z, r) => [...(enemigos ? enemigos.objetivos(x, z, r) : []), ...ganado.objetivos(x, z, r), ...(jefes ? jefes.objetivos(x, z, r) : [])];
    const proyectiles = crearProyectiles({ scene, mundo, jugador, inventario, vida, objetivos: objetivosTodos });
    // Zonas seguras: alrededor de cada amigo y de Venjy no aparecen ni entran monstruos
    const zonasSeguras = () => [...npcs.lista, ...amigos.lista, ...venjys.lista].map(n => ({ x: n.x, z: n.z, radio: 16 }));
    enemigos = crearEnemigos({
        scene, mundo, jugador, vida, dia, entidades, proyectiles, terreno, datos, zonasSeguras, contenedores, particulas, objetivosTodos,
        dificultad: () => vida.dificultad, hud, tinteMundo: materiales.solido.color,
        aturdir: s => { vida.aturdido = Math.max(vida.aturdido, s); },
        alMorirMob: (tipo, e) => { if (e.porJugador && misiones) misiones.alMatar(tipo, e.pos.x, e.pos.z); }
    });
    const minado = crearMinado({ scene, camara, mundo, jugador, inventario, entidades, contenedores, agricultura, vida, ventanas, hud, idioma });
    const combate = crearCombate({ camara, mundo, jugador, inventario, vida, proyectiles, particulas, hud, objetivos: objetivosTodos, idioma });
    const pesca = crearPesca({ scene, camara, mundo, jugador, inventario, entidades, particulas });
    minado.alClicIzquierdo = () => combate.atacar();
    // Misiones y jefes
    misiones = crearMisiones({
        grupo: vista.grupo, dy: DY, jugador, camara, inventario, entidades, vida, dia, hud, terreno, npcs, amigos, venjys, idioma, abrirPanel, cerrarPanel,
        jefeEnCurso: () => jefes && jefes.enCurso,
        skin: () => skinActual, // amistad inicial según tu skin (se lee ya en el bucle, cuando skinActual existe)
        antesDeHablar: clave => !!(escenas && escenas.antesDeHablar(clave)),
        alCompletar: m => !!(escenaCuello && escenaCuello.alCompletar(m)) // cuello de Gala (lona3)
    });
    misiones.cargar(guardado.misiones);
    jefes = crearJefes({ scene, mundo, jugador, camara, terreno, dy: DY, vida, inventario, entidades, enemigos, proyectiles, particulas, hud, misiones, idioma, tinteMundo: materiales.solido.color, alFinal: () => final() });
    function final() {
        guardado.completado = true;
        guardarYa();
        abrirPanel(mostrarCreditos({ idioma, alCerrar: () => cerrarPanel() }));
    }
    // Clic derecho: altar del jefe, luego amigos, luego animales
    minado.alClicDerecho = () => {
        const o = lanzarRayo(camara, mundo, 4.5);
        if (o && o.id === B.ALTAR && jefes.usarAltar(o)) return true;
        if (cofresComp.interactuar()) return true;
        if (misiones.interactuar(rayoCaja)) return true;
        const e = combate.entidadApuntada();
        return !!(e && e.animal && ganado.interactuar(e.animal));
    };
    minado.usarObjeto = (o, p) => (p.id === O.CANA ? pesca.usar() : combate.usar(p));
    minado.usarSinNada = () => combate.bloquearConMano2();
    minado.alSoltarDerecho = () => combate.soltarDerecho();
    minado.alRomper = (id, x, y, z) => particulas.romper(id, x, y, z);
    const mano = crearMano({ renderer, atlas, atlasLienzo, mundo, jugador, inventario, minado, combate, tinteMundo: materiales.solido.color });
    minado.alGesto = () => mano.golpear();
    // Skin, tercera persona (F5) y cámara de cine con los amigos
    const skinInicial = cargarSkin();
    const camaras = crearCamaras({ scene, camara, mundo, jugador, skin: skinInicial, tinteMundo: materiales.solido.color, dy: DY });
    // ponerSkin acepta la descripción o la clave de una base ('pony', 'venjy'…) para probar
    let skinActual = skinInicial;
    const ponerSkin = d => {
        if (typeof d === 'string') { const b = BASES.find(x => x.clave === d); if (!b) return null; d = { ...JSON.parse(JSON.stringify(b)), base: b.clave }; }
        skinActual = d;
        camaras.ponerSkin(d); const c = coloresMano(d); mano.ponerColores(c.piel, c.manga);
        if (coop) coop.anunciarSkin(d);
        return d;
    };
    ponerSkin(skinInicial);
    juego = { ponerSkin };
    // Escenas de skin: un amigo reconoce tu skin (o a Venjy) la primera vez que te acercas
    // Bloqueo del jugador durante las escenas (skins y caricias a las gatas): el mundo sigue, sin control
    const bloquearEscena = () => {
        uiAbierta = true; jugador.congelado = true; jugador.teclas.clear();
        if (tactil) tactil.desactivar(); else if (document.pointerLockElement) document.exitPointerLock();
    };
    const liberarEscena = () => { uiAbierta = false; jugador.congelado = false; if (!vida.muerto) entrar(); };
    escenas = crearEscenasSkin({
        grupo: vista.grupo, dy: DY, mundo, jugador, camara, camaras, misiones, npcs, amigos, venjys, idioma,
        skin: () => skinActual,
        puede: () => jugador.activo && !uiAbierta && !vida.muerto && !jefes.enCurso,
        bloquear: bloquearEscena,
        liberar: liberarEscena
    });
    // Escenas especiales con Mila y Gala: la primera caricia con skin de base Lona o Venjy
    const escenasGatas = crearEscenasGatas({
        grupo: vista.grupo, dy: DY, mundo, jugador, camara, camaras, gatas, misiones, idioma,
        skin: () => skinActual, bloquear: bloquearEscena, liberar: liberarEscena
    });
    // Caricias a las gatas: tecla G (o el botón ACARICIAR) junto a Mila o Gala
    const caricias = crearCaricias({
        grupo: vista.grupo, dy: DY, mundo, jugador, camaras, gatas, hud, misiones, idioma,
        puede: () => jugador.activo && !uiAbierta && !vida.muerto && !jefes.enCurso,
        bloquear: bloquearEscena,
        liberar: liberarEscena,
        especial: g => escenasGatas.especial(g)
    });
    // El cuello de Gala: escena al completar la misión 3 de Lona; sincroniza el cuello con las misiones cargadas
    escenaCuello = crearEscenaCuello({ grupo: vista.grupo, dy: DY, jugador, camara, camaras, gatas, npcs, misiones, bloquear: bloquearEscena, liberar: liberarEscena, idioma });
    escenaCuello.sincronizar();
    // Ronda del iglú: G (o SENTARSE) junto al cojín; con ella, F5 o CAM cambian a primera persona
    const ronda = crearRondaIglu({
        grupo: vista.grupo, dy: DY, jugador, camara, camaras, misiones, amigos, escenas, terreno, idioma, lienzo, hud,
        skin: () => skinActual,
        puede: () => jugador.activo && !uiAbierta && !vida.muerto && !jefes.enCurso,
        bloquear: bloquearEscena,
        liberar: liberarEscena
    });
    // Minijuegos (duelo de hachas con Boris, pesca con Pony, asado en la fogata): botón en el panel del amigo
    const minijuegos = crearMinijuegos({
        grupo: vista.grupo, dy: DY, mundo, jugador, camara, camaras, misiones, amigos, npcs, terreno, inventario, entidades, hud, particulas, idioma,
        tinteMundo: materiales.solido.color,
        puede: () => !vida.muerto && !jefes.enCurso && !ronda.activa,
        bloquear: bloquearEscena,
        liberar: liberarEscena
    });
    misiones.minijuego = {
        texto: clave => minijuegos.botonPara(clave),
        // Cierra el panel sin pedir el puntero (el minijuego lo deja libre) y empieza
        jugar: clave => {
            const b = minijuegos.botonPara(clave);
            if (!b || b.motivo) return;
            capaPanel.hidden = true; capaPanel.textContent = '';
            camaras.terminarCine();
            if (!minijuegos.intentar(b.juego)) { uiAbierta = false; if (!vida.muerto) entrar(); }
        }
    };
    // Animaciones de amistad (bloque 6b): escena-amistad.js se carga con import() la primera vez que se usa
    // (botón de la pestaña «Hablar»); igual que el minijuego, cierra el panel sin pedir el puntero y empieza
    let escenaAmistad = null, cargandoAmistad = null;
    const personasEscena = () => [...npcs.lista, ...amigos.lista, ...venjys.lista];
    function cargarEscenaAmistad() {
        if (!cargandoAmistad) cargandoAmistad = import('./escena-amistad.js').then(m => {
            escenaAmistad = m.crearEscenaAmistad({
                grupo: vista.grupo, dy: DY, mundo, jugador, camara, camaras, misiones, idioma, personas: personasEscena, base: () => escenas.tipoSkin(skinActual).base,
                personaDe: c => (c === 'venjy' ? venjys.lista.find(n => n.lugar === 'inicio') : personasEscena().find(n => n.clave === c)) || null,
                bloquear: bloquearEscena, liberar: liberarEscena
            });
            return escenaAmistad;
        }).catch(err => { cargandoAmistad = null; console.error('No se pudo cargar la escena de amistad', err); });
        return cargandoAmistad;
    }
    const puedeAmistad = () => !vida.muerto && !jefes.enCurso && !ronda.activa && !minijuegos.activo && !escenas.activa;
    misiones.escenaAmistad = {
        jugar: (clave, tipo) => {
            if (!puedeAmistad() || misiones.amistad.nivel(clave) < NIVEL_ANIMACION[tipo]) return;
            capaPanel.hidden = true; capaPanel.textContent = ''; document.body.classList.remove('panel-lado');
            camaras.terminarCine();
            cargarEscenaAmistad().then(ea => { if (!ea || !ea.jugar(clave, tipo)) { uiAbierta = false; if (!vida.muerto) entrar(); } });
        },
        // Momento especial (6b-2): el motor y la escena del personaje se cargan con import() al usarse
        momento: clave => {
            if (!puedeAmistad() || !momentoListo(misiones.amistad.puntos(clave))) return;
            capaPanel.hidden = true; capaPanel.textContent = ''; document.body.classList.remove('panel-lado');
            camaras.terminarCine();
            cargarEscenaAmistad().then(ea => (ea ? ea.momento(clave) : false)).then(ok => { if (!ok) { uiAbierta = false; if (!vida.muerto) entrar(); } });
        }
    };
    // Música de fondo y temas de los amigos
    const musica = crearMusica();
    const personasMusica = () => {
        const l = [];
        for (const n of npcs.lista) l.push({ clave: n.clave, x: n.x, z: n.z });
        for (const n of amigos.lista) l.push({ clave: n.clave, x: n.x, z: n.z });
        const v = venjys.lista.find(n => n.lugar === 'inicio');
        if (v) l.push({ clave: 'venjy', x: v.x, z: v.z });
        return l;
    };
    // /escenas y /escena <nombre>: recorre las escenas para revisarlas (solo con la skin de Venjy)
    const recorrido = crearRecorridoEscenas({ dy: DY, jugador, mundo, gatas, escenas, escenaCuello, caricias, escenasGatas, misiones, hud, skin: () => skinActual, bloquear: bloquearEscena, idioma });
    // Teletransporte de /tp: carga el terreno, busca suelo (si no se da y, desde la altura de la pista) y coloca al jugador
    function irA(x, y, z, pista) {
        cargarCerca(x, z);
        const bx = Math.floor(x), bz = Math.floor(z);
        if (y === undefined) {
            for (let yy = pista !== undefined ? pista + DY + 12 : ALTO - 3; yy > 1 && y === undefined; yy--) {
                if (jugador.solido(bx, yy - 1, bz) && !jugador.choca(x, yy, z)) y = yy;
            }
            if (y === undefined) y = terreno.HT[Math.min(terreno.BD - 1, Math.max(0, bz)) * terreno.BW + Math.min(terreno.BW - 1, Math.max(0, bx))] + DY + 1;
        }
        const p = lugarLibre(x, y, z) || { x, y, z };
        jugador.colocar(p.x, p.y, p.z);
        jugador.yaw = Math.PI; // mira al norte
    }
    // Destinos de zonas del portafolio en coordenadas del mundo (y del creativo + desnivel)
    const destinosDev = {};
    for (const [k, d] of Object.entries(destinosZonas({ terreno, datos }))) destinosDev[k] = { x: d.x, z: d.z, y: d.y === undefined ? undefined : d.y + DY };
    const comandosDev = crearComandosDev({
        jugador, vida, inventario, enemigos, jefes, gatas, escenas, hud, O, B, nombreDe, idioma,
        destinos: destinosDev,
        spawn: () => ({ x: spawnMundo.x, y: spawnMundo.y, z: spawnMundo.z }),
        spawnCama: () => spawnCama,
        irA
    });
    // Consola de comandos (T o /): /fly, /dia, /noche, /ayuda, /escenas, /escena <nombre>, /gamemode devenjy (+ comandos de desarrollo)
    const consola = crearConsola({
        jugador, dia, hud, idioma, dev: comandosDev,
        extra: {
            '/escenas': { fn: () => recorrido.comando(''), ayuda: { es: '/escenas (todas, con skin de Venjy)', en: '/escenas (all, with the Venjy skin)' } },
            '/escena': { fn: n => recorrido.comando(n), ayuda: { es: '/escena <nombre> (una)', en: '/escena <name> (one)' } }
        },
        alAbrir: () => { uiAbierta = true; jugador.teclas.clear(); if (tactil) tactil.desactivar(); else if (document.pointerLockElement) document.exitPointerLock(); },
        alCerrar: () => { uiAbierta = false; if (!vida.muerto) entrar(); }
    });
    // Fundido de dormir y salto a la mañana (online lo dispara el anfitrión cuando todos están en cama)
    function amanecerLocal() {
        const negro = document.createElement('div');
        negro.className = 'fundido-sueno';
        document.body.appendChild(negro);
        hud.mensaje(tx().durmiendo, 2);
        setTimeout(() => { dia.amanecer(); hud.mensaje(tx().spawn); }, 1300);
        setTimeout(() => negro.remove(), 2600);
    }
    minado.dormir = (x, y, z) => {
        if (!dia.puedeDormir) return tx().noDormir;
        if (enemigos.cerca(jugador.pos.x, jugador.pos.y, jugador.pos.z)) return tx().monstruos;
        misiones.alDormir();
        spawnCama = { x: x + 0.5, y: y + 1, z: z + 0.5 };
        if (coop) coop.acostarse(); else amanecerLocal();
        return null;
    };

    // Luz del lugar sobre un modelo de cajas (jugadores remotos, cofres de compañero)
    const luzCaja = new THREE.Color();
    function iluminarCaja(tinte, x, y, z) {
        const l = mundo.nivelLuz(x, y + 1, z);
        const c = Math.pow(l >= 0 ? (l >> 4) / 15 : 1, 1.6), b = Math.pow(l >= 0 ? (l & 15) / 15 : 0, 1.6);
        luzCaja.copy(materiales.solido.color).multiplyScalar(c);
        luzCaja.setRGB(Math.max(luzCaja.r, b, 0.08), Math.max(luzCaja.g, b * 0.85, 0.08), Math.max(luzCaja.b, b * 0.6, 0.08));
        tinte.aplicar(luzCaja);
    }

    // ---- Sala cooperativa ----
    if (cx) {
        coop = crearCoop(cx, {
            scene, mundo, jugador, vida, dia, inventario, entidades, contenedores, agricultura, enemigos, jefes, proyectiles, misiones, hud, particulas, idioma,
            ventanasBase, jugadoresGuardados: guardado.jugadores || {},
            skin: () => skinActual,
            estadoActual: () => estadoActual(),
            amanecerLocal, iluminar: iluminarCaja,
            alCambiarJugadores: () => pintarCoop(),
            alCerrar: motivo => terminarCoop(motivo)
        });
        // Pestaña en segundo plano: el navegador detiene el bucle, pero la red sigue (bloques, latidos)
        setInterval(() => { if (document.hidden) coop.actualizar(0.25); }, 250);
        const hudSala = document.createElement('div');
        hudSala.className = 'coop-hud';
        hudSala.id = 'coop-hud';
        $('hud').appendChild(hudSala);
    }
    function pintarCoop() {
        if (!coop) return;
        const texto = coop.local ? tx().salaLocal(coop.total) : tx().sala(coop.codigo, coop.total);
        $('coop-hud').textContent = texto;
        $('coop-sala').textContent = texto;
        $('coop-pausa').hidden = false;
        $('coop-copia').hidden = coop.esAnfitrion;
        $('coop-compartir').checked = coop.compartido;
        // Sin internet no hay código: el anfitrión invita con un QR a cada uno
        $('coop-copiar').hidden = coop.local;
        $('coop-invitar').hidden = !(coop.local && coop.esAnfitrion);
        $('coop-invitar').disabled = coop.total >= MAX_COOP;
        $('coop-lista').textContent = [...coop.remotos.values()].map(r => r.nombre).join(' · ') || tx().solos;
    }
    pintarCoop();
    if (coop && coop.local && coop.esAnfitrion) setTimeout(() => hud.mensaje(tx().avisoLocal, 6), 1500);
    // Anfitrión sin internet: invitación (QR) → respuesta del invitado (QR o texto). Una a la vez.
    async function invitarQR() {
        panelQR.abrir({ titulo: tx().invitarTitulo, cancelar: () => { coop.cancelarInvitacion(); mostrar('pausa'); } });
        mostrar('panel-qr');
        try {
            for (;;) {
                const inv = await coop.invitar();
                await panelQR.mostrarCodigo(inv, caraDeSkin(skinActual), tx().pasoInvitar1);
                let id = null, otra = false;
                while (!id && !otra) {
                    const texto = await panelQR.pedir(tx().pasoInvitar2);
                    if (texto == null) return; // cancelado
                    panelQR.estado(tx().conectandoQR);
                    try { id = await coop.recibirRespuesta(texto); }
                    catch (e) {
                        panelQR.estado(mensajeError(e), true);
                        otra = e.codigo === 'qr-conexion'; // esa oferta ya no sirve: se hace otra
                    }
                }
                if (!id) continue;
                const r = coop.remotos.get(id);
                panelQR.cerrar();
                mostrar('pausa');
                hud.mensaje(tx().entroQR(r ? r.nombre : '?'), 3);
                return;
            }
        } catch (e) { console.warn(e); panelQR.estado(mensajeError(e), true); }
    }
    // Cofres de compañero: las cosas de quienes jugaron aquí y ahora no están
    const escenaGuardian = crearEscenaGuardian({
        scene, grupo: vista.grupo, dy: DY, mundo, jugador, camara, camaras, hud, particulas, idioma, vida, misiones, cofres: () => cofresComp,
        bloquear: bloquearEscena, liberar: liberarEscena
    });
    const cofresComp = crearCofresCompaneros({
        scene, mundo, jugador, camara, ventanas, ventanasBase, hud, rayoCaja, idioma, miDisp, iluminar: iluminarCaja,
        jugadores: () => (coop ? Object.fromEntries(coop.perfiles) : (guardado.jugadores || {})),
        conectados: () => (coop ? coop.conectados() : new Set()),
        alEditar: (disp, inv) => { if (coop) coop.cofreEditado(disp, inv); },
        escena: () => escenaGuardian
    });
    // El anfitrión se fue o se cortó la red: se puede guardar una copia del mundo y salir
    let coopTerminado = false;
    function terminarCoop(motivo) {
        if (coopTerminado) return;
        coopTerminado = true;
        $('coop-fin-motivo').textContent = motivo === 'anfitrion' ? tx().finAnfitrion : coop && coop.local ? tx().finLocal : tx().finConexion;
        ventanasBase.cerrar();
        cerrarPanel();
        if (tactil) tactil.desactivar(); else if (document.pointerLockElement) document.exitPointerLock();
        mostrar('coop-fin');
    }
    // Copia local del mundo de la sala: queda como un mundo tuyo (tus cosas y tus misiones; las de los
    // demás, en sus cofres de compañero)
    async function guardarCopia() {
        try {
            const lista = await listarMundos();
            if (lista.length >= MAX_MUNDOS) { alert(tx().copiaLlena); return false; }
            const e = estadoActual();
            await guardarMundo({ ...e, id: nuevoId(), nombre: tx().copia(guardado.nombre || tx().mundo).slice(0, 24), creado: Date.now(), idDueno: miDisp });
            hud.mensaje(tx().copiaGuardada, 3);
            return true;
        } catch (err) { console.error(err); alert(tx().errorGuardar); return false; }
    }


    // ---- Guardado ----
    function estadoActual() {
        // Un muerto se guarda en su punto de reaparición (vida.serializar ya lo guarda como vivo)
        const p = vida.muerto ? puntoReaparicion() : jugador.pos;
        return {
            id: guardado.id, nombre: guardado.nombre, dificultad: vida.dificultad, creado: guardado.creado || Date.now(),
            jugado: Math.round(jugado), dias: dia.dias, completado: !!guardado.completado,
            jugador: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +jugador.yaw.toFixed(3), pitch: +jugador.pitch.toFixed(3) },
            spawnCama, vida: vida.serializar(), inventario: inventario.serializar(),
            ediciones: serializarEdiciones(terreno.ediciones), contenedores: contenedores.serializar(),
            agricultura: agricultura.serializar(), entidades: entidades.serializar(), dia: dia.serializar(), ganado: ganado.serializar(),
            misiones: misiones.serializar(),
            // Los demás jugadores que pasaron por este mundo (inventario, misiones, skin): sus cofres de compañero
            jugadores: coop ? coop.jugadoresParaGuardar() : (guardado.jugadores || {}), idDueno: miDisp
        };
    }
    // Las escrituras van en cola y cada una toma el estado al ejecutarse: el guardado de una muerte
    // nunca se descarta por otro en curso (antes se perdía y se recargaba la partida previa)
    let escritura = Promise.resolve();
    function guardarYa(aviso = false) {
        // El invitado no guarda el mundo del anfitrión: manda su perfil (el anfitrión lo guarda con el mundo)
        if (invitado) { if (coop) coop.enviarPerfil(); if (aviso) hud.mensaje(tx().guardado, 2); return Promise.resolve(); }
        escritura = escritura.then(async () => {
            try { await guardarMundo(estadoActual()); if (aviso) hud.mensaje(tx().guardado, 2); }
            catch (e) { console.error(e); if (aviso) hud.mensaje(tx().errorGuardar, 3); }
        });
        return escritura;
    }
    setInterval(() => { if (!vida.muerto) guardarYa(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) guardarYa(); });

    // ---- Entrada: puntero, pausa y teclas ----
    // Si el navegador no deja volver a capturar el mouse (sin un clic reciente), en vez de la pausa se
    // muestra un aviso y el siguiente clic vuelve al juego (Esc otra vez sí abre la pausa)
    const avisoClic = document.createElement('div');
    avisoClic.className = 'clic-seguir';
    avisoClic.hidden = true;
    const avisoTexto = document.createElement('span');
    avisoClic.appendChild(avisoTexto);
    document.body.appendChild(avisoClic);
    avisoClic.addEventListener('click', () => { avisoClic.hidden = true; pedirPuntero(); });
    document.addEventListener('keydown', e => {
        if (e.code === 'Escape' && !avisoClic.hidden && !e.repeat) { avisoClic.hidden = true; alActivo(false); e.preventDefault(); }
    });
    // Esc cierra ventanas como en Minecraft. Si se pide el puntero mientras Esc está abajo, el navegador lo
    // concede y el mismo Esc lo suelta al tiro (se abría la pausa): se espera a soltar la tecla.
    // (si el navegador se traga el keyup, a los 1,5 s se deja de esperar)
    let escAbajo = false, escT = 0, entrarAlSoltarEsc = false;
    document.addEventListener('keydown', e => { if (e.code === 'Escape') { escAbajo = true; escT = performance.now(); } }, true);
    document.addEventListener('keyup', e => {
        if (e.code !== 'Escape') return;
        escAbajo = false;
        if (entrarAlSoltarEsc) { entrarAlSoltarEsc = false; if (!uiAbierta && !vida.muerto && !jugador.activo) entrar(); }
    }, true);
    window.addEventListener('blur', () => { escAbajo = false; });
    function pedirPuntero(reintento = false) {
        if (escAbajo && performance.now() - escT < 1500) {
            entrarAlSoltarEsc = true;
            setTimeout(() => { if (entrarAlSoltarEsc) { entrarAlSoltarEsc = false; escAbajo = false; if (!uiAbierta && !vida.muerto && !jugador.activo) pedirPuntero(); } }, 1600);
            return;
        }
        const rechazo = () => {
            if (jugador.activo || uiAbierta || vida.muerto) return;
            // Justo después de salir con Esc el navegador rechaza el puntero ~1 s aunque haya un clic
            // (por ejemplo «Continuar» en la pausa): se reintenta una vez mientras el clic siga vigente
            if (!reintento && navigator.userActivation && navigator.userActivation.isActive) { setTimeout(() => { if (!jugador.activo && !uiAbierta) pedirPuntero(true); }, 1100); return; }
            avisoTexto.textContent = tx().clicSeguir;
            avisoClic.hidden = false;
        };
        try { const r = lienzo.requestPointerLock(); if (r && r.catch) r.catch(rechazo); } catch (e) { rechazo(); }
    }
    const alActivo = activo => {
        $('hud').hidden = !activo && !uiAbierta;
        if (activo) { avisoClic.hidden = true; mostrar(null); return; }
        if (uiAbierta || vida.muerto) return;
        mostrar('pausa');
        sincronizarAjustes();
        guardarYa();
    };
    jugador.alCambiarActivo = alActivo;
    const tactil = iniciarTactil(jugador, { alEntrar: alActivo });
    const entrar = () => (tactil ? tactil.activar() : pedirPuntero());
    if (tactil) iniciarTactilSupervivencia({ tactil, minado, ventanas, inventario, idioma, camaras, consola, caricias });

    document.addEventListener('keydown', e => {
        if (e.code === 'KeyE' && !e.repeat) {
            if (ventanasBase.abierta) { ventanasBase.cerrar(true); e.preventDefault(); }
            else if (jugador.activo && !vida.muerto) { ventanas.abrir('inventario'); e.preventDefault(); }
        } else if (e.code === 'Escape' && ventanasBase.abierta) { ventanasBase.cerrar(true); e.preventDefault(); }
        if ((e.code === 'Escape' || e.code === 'KeyE') && !capaPanel.hidden && !e.repeat) { cerrarPanel(); e.preventDefault(); }
        if (e.code === 'F5' && !e.repeat && (jugador.activo || ronda.activa)) {
            if (ronda.activa) ronda.alternarVista(); else camaras.cambiarVista();
            e.preventDefault();
        }
        // G reparte según el contexto: acariciar a una gata si está cerca; si no, sentarse en el iglú
        if (e.code === 'KeyG' && !e.repeat && (caricias.intentar() || ronda.intentar())) e.preventDefault();
        if ((e.code === 'KeyT' || e.code === 'Slash') && !e.repeat && jugador.activo && !vida.muerto) { e.preventDefault(); consola.abrir(e.code === 'Slash' ? '/' : ''); }
    });
    lienzo.addEventListener('click', () => { if (!jugador.activo && !uiAbierta && !vida.muerto && $('inicio').hidden) entrar(); });

    $('continuar').addEventListener('click', () => entrar());
    $('guardar').addEventListener('click', () => guardarYa(true));
    $('cambiar-skin').addEventListener('click', () => abrirEditorSkin('pausa'));
    const salirAlMenu = async () => { await guardarYa(); if (coop) await coop.salir(); location.reload(); };
    $('salir-menu').addEventListener('click', salirAlMenu);
    $('salir-muerte').addEventListener('click', salirAlMenu);
    $('coop-copiar').addEventListener('click', () => { try { navigator.clipboard.writeText(coop.codigo); hud.mensaje(tx().copiado, 2); } catch (e) { /* sin portapapeles */ } });
    $('coop-invitar').addEventListener('click', () => { if (coop && coop.local && coop.esAnfitrion) invitarQR(); });
    $('coop-compartir').addEventListener('change', e => { if (coop) coop.compartido = e.target.checked; });
    $('coop-copia').addEventListener('click', () => guardarCopia());
    $('coop-fin-copia').addEventListener('click', async () => { if (await guardarCopia()) $('coop-fin-copia').disabled = true; });
    $('coop-fin-salir').addEventListener('click', async () => { if (coop) await coop.salir().catch(() => {}); location.reload(); });
    if (coop) window.addEventListener('beforeunload', () => { coop.salir(); });
    $('reaparecer').addEventListener('click', () => {
        vida.reaparecer();
        const s = puntoReaparicion();
        cargarCerca(s.x, s.z);
        jugador.colocar(s.x, s.y, s.z);
        mostrar(null);
        entrar();
    });

    // Ajustes de la pausa
    function sincronizarAjustes() {
        $('aj-distancia').value = ajustes.distancia; $('aj-distancia-v').textContent = ajustes.distancia;
        $('aj-fov').value = ajustes.fov; $('aj-fov-v').textContent = ajustes.fov;
        $('aj-sens').value = ajustes.sens; $('aj-sens-v').textContent = ajustes.sens;
        $('aj-sonido').checked = !mundoSilenciado();
        $('aj-musica').checked = musica.encendida;
    }
    $('aj-distancia').addEventListener('input', e => {
        ajustes.distancia = Number(e.target.value); $('aj-distancia-v').textContent = ajustes.distancia;
        mundo.distancia = ajustes.distancia; mundo.ultimo = null;
        const b = ajustes.distancia * CHUNK; scene.fog.near = b * 0.55; scene.fog.far = b * 0.95;
        guardarAjustes();
    });
    $('aj-fov').addEventListener('input', e => { ajustes.fov = Number(e.target.value); $('aj-fov-v').textContent = ajustes.fov; camara.fov = ajustes.fov; camara.updateProjectionMatrix(); guardarAjustes(); });
    $('aj-sens').addEventListener('input', e => { ajustes.sens = Number(e.target.value); $('aj-sens-v').textContent = ajustes.sens; jugador.sensibilidad = ajustes.sens / 10000; guardarAjustes(); });
    $('aj-sonido').addEventListener('change', e => silenciarMundo(!e.target.checked));
    $('aj-musica').addEventListener('change', e => musica.encender(e.target.checked));

    // ---- Depuración ----
    window.__venjy = {
        datos, terreno, mundo, jugador, camara, renderer, scene, cielo, inventario, vida, dia, entidades, contenedores, agricultura, minado, hud, ventanas,
        gatas, animales, npcs, amigos, venjys, minimapa, guardarYa, estadoActual,
        particulas, ganado, enemigos, proyectiles, combate, pesca, mano, misiones, jefes, final, camaras, ponerSkin, musica, consola, recorrido, escenas, caricias, escenasGatas, escenaCuello, ronda, minijuegos,
        get coop() { return coop; }, cofresComp, guardian: escenaGuardian,
        // Animaciones de amistad (bloque 6b): se cargan al usarse; cargarAmistad() las trae para depurar
        get amistadEscena() { return escenaAmistad; }, cargarAmistad: () => cargarEscenaAmistad(),
        dar(id, n = 1) { return inventario.agregar(id, n); },
        O, B, nombreDe
    };

    // ---- Bucle ----
    $('carga').hidden = true;
    mostrar(null);
    $('hud').hidden = false;
    if (vida.muerto) { $('causa-muerte').textContent = ''; mostrar('muerte'); }
    entrar();

    let anterior = performance.now(), cuadros = 0, acumulado = 0, relojAgua = 0, cuadroAgua = 0;
    const fpsEl = $('fps'), coordsEl = $('coords');
    function bucle(ahora) {
        requestAnimationFrame(bucle);
        const dt = Math.min(0.1, (ahora - anterior) / 1000);
        anterior = ahora;
        // En pausa (Esc) el mundo se detiene, como en Minecraft de un jugador; con el inventario abierto sigue.
        // Online el mundo nunca se detiene (ni en la pausa ni muerto): los demás siguen jugando
        const corre = (jugador.activo || uiAbierta || !!coop) && !vida.muerto;
        const mundoCorre = corre || !!coop;
        if (mundoCorre) {
            jugado += dt;
            dia.actualizar(dt);
            if (corre) {
                jugador.lento = minado.lento * combate.lento * (vida.aturdido > 0 ? 0.45 : 1);
                jugador.actualizar(dt);
                vida.actualizar(dt);
                minado.actualizar(dt);
            } else jugador.actualizar(0);
            entidades.actualizar(dt, camara);
            // Hornos y cultivos: online solo los lleva el anfitrión (los demás reciben los cambios)
            if (!invitado) { contenedores.actualizar(dt); agricultura.actualizar(dt); }
            if (corre) { combate.actualizar(dt, minado.derecho); pesca.actualizar(dt); }
            ganado.actualizar(dt);
            enemigos.actualizar(dt);
            jefes.actualizar(dt);
            proyectiles.actualizar(dt);
            particulas.actualizar(dt);
            if (corre) mano.actualizar(dt);
        } else jugador.actualizar(0);
        if (coop) coop.actualizar(dt);
        cofresComp.actualizar(dt);
        escenaGuardian.actualizar(corre ? dt : 0);
        escenas.actualizar(corre ? dt : 0);
        caricias.actualizar(corre ? dt : 0);
        escenasGatas.actualizar(corre ? dt : 0);
        escenaCuello.actualizar(corre ? dt : 0);
        minijuegos.actualizar(corre ? dt : 0);
        if (escenaAmistad) escenaAmistad.actualizar(corre ? dt : 0);
        camaras.actualizar(dt);
        ronda.actualizar(corre ? dt : 0); // después de la cámara: pone la vista de la ronda y el cuerpo sentado
        {
            const l = mundo.nivelLuz(jugador.pos.x, jugador.pos.y + 1.6, jugador.pos.z);
            const cueva = jugador.pos.y < DY + 8 && l >= 0 && (l >> 4) < 6;
            musica.actualizar({ jx: jugador.pos.x, jz: jugador.pos.z, personas: personasMusica(), enJefe: jefes.enCurso, modo: cueva ? 'cueva' : dia.esNoche ? 'noche' : 'dia', pausa: !corre });
        }
        vista.sincronizar();
        cielo.actualizar(camara, corre ? dt : 0);
        const dtC = corre ? dt : 0;
        gatas.actualizar(dtC);
        npcs.actualizar(dtC, false);
        animales.actualizar(dtC, false);
        amigos.actualizar(dtC, false);
        venjys.actualizar(dtC, false);
        misiones.actualizar(dtC);
        ventanasBase.actualizar();
        hud.actualizar(dt, vida);
        relojAgua += dt;
        if (relojAgua > 0.2) { relojAgua = 0; animarAgua(atlasLienzo, ++cuadroAgua); atlas.needsUpdate = true; }
        minimapa.actualizar(jugador.pos.x, jugador.pos.z, jugador.yaw);
        mundo.planificar(jugador.pos.x, jugador.pos.z);
        mundo.procesar(5);
        renderer.render(scene, camara);
        if (!vida.muerto && !uiAbierta && camaras.vista === 0 && !camaras.enCine) mano.dibujar();

        cuadros++; acumulado += dt;
        if (acumulado >= 0.5) {
            fpsEl.textContent = Math.round(cuadros / acumulado) + ' FPS';
            cuadros = 0; acumulado = 0;
            coordsEl.textContent = `X ${jugador.pos.x.toFixed(1)}  Y ${jugador.pos.y.toFixed(1)}  Z ${jugador.pos.z.toFixed(1)}`;
        }
    }
    requestAnimationFrame(bucle);
}

pintarMenu();
