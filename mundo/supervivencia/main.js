// =========================================================
// VENJY · Supervivencia
// El mapa del portafolio (horizontal) subido 48 bloques, con cuevas y menas debajo, para
// sobrevivir: romper y poner, inventario y crafteo, hambre, día y noche, cama, horno, cofres
// y cultivos. Los amigos y las gatas siguen en sus lugares.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { generarDatos } from '../mundo-datos.js';
import { crearAtlas, animarAgua, B } from '../texturas.js';
import { prepararTerreno, MundoVoxel, ESCALA, CHUNK, ALTO, fijarAlto, ALTO_SUPERVIVENCIA, DESNIVEL_SUPERVIVENCIA, recalcularEmisores, llenarChunk, mallarChunkCrudo, medicion, chunkForzado } from '../voxeles.js';
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
import { listarMundos, cargarMundo, guardarMundo, borrarMundo, exportarMundo, descargarMundo, guardarCopiaConTope, importarMundo, nuevoId, serializarEdiciones, cargarEdiciones, MAX_MUNDOS } from './guardado.js';
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
import { textoHora, textoDiaHora } from './reloj.js';
import { vistaDesplazada } from './desplazado.js';
import { iniciarTactilSupervivencia } from './tactil-supervivencia.js';
import { crearMano } from './mano.js';
import { crearParticulas } from './particulas.js';
import { CLAVE as CLAVE_REND, ESCALA as ESCALA_REND, FACTOR_PARTICULAS, normalizar as normalizarRend, presetDe, aplicarPreset, LimitadorFps, AutoDistancia, Cuadros, LOD } from './rendimiento.js';
import { crearGanado } from './ganado.js';
import { crearProyectiles } from './proyectiles.js';
import { crearEnemigos } from './enemigos.js';
import { crearCombate } from './combate.js';
import { crearPesca } from './pesca.js';
import { crearMisiones } from './misiones.js';
import { avisarLugar } from '../descubrimiento.js';
import { crearFacilidades } from './facilidades.js';
import { crearCartelesCamino } from './caminos-carteles.js';
import { crearCuaderno } from './cuaderno.js';
import { crearJefes } from './jefes.js';
import { mostrarCreditos } from './creditos.js';
import { crearEditorSkin, cargarSkin, BASES, caraDeSkin } from './skin.js';
import { crearCamaras } from './camaras.js';
import { crearRuleta } from './ruleta.js';
import { crearEscenasSkin } from './escenas-skin.js';
import { crearCaricias } from './caricias.js';
import { crearEscenasGatas } from './escenas-gatas.js';
import { crearUsosObjetos } from './usos-objetos.js';
import { tono, ruido } from './sonidos.js';
import { crearEscenaCuello } from './escena-cuello.js';
import { crearRondaIglu } from './ronda-iglu.js';
import { crearVidaAmigos } from './vida-amigos.js';
import { crearMinijuegos } from './minijuego.js';
import { NIVEL_ANIMACION, momentoListo, grupoDe } from './amistad.js';
import { NOMBRES_AMIGO } from './misiones-datos.js';
import { crearMusica } from './musica.js';
import { crearConsola } from './consola.js';
import { crearRecorridoEscenas } from './recorrido-escenas.js';
import { crearComandosDev } from './comandos-dev.js';
import { TXT_CARTAS_BOTON, CARRERA_BOTON } from './minijuegos-datos.js';
import { rayoCaja } from '../fisica.js';
import { lanzarRayo } from '../rayo.js';
import { crearCofresCompaneros } from './cofres-companeros.js';
import { crearEscenaGuardian } from './escena-guardian.js';
import { hospedar, unirse, hospedarLocal, unirseLocal, guardadoDeInvitado, crearCoop, idDispositivo, MAX_COOP, MAX_RESPALDO } from './coop.js';
import { crearPanelQR } from './ui-qr.js';
import { normalizarNombre, normalizarCodigo } from '../online/red.js';
import { ONLINE_ACTIVO } from '../online/config.js';
import { nivelDeMs, barrasDeMs } from '../online/ping.js';
import { cargarDatos, fusionar } from '../datos/cargador.js';
import { datosInicio, fraseAlAzar, consejoAlAzar, avanceCarga, fondoActivo } from './inicio-datos.js';
import { presentacion } from './presentacion.js';
import { crearFondoMenu } from './fondo-menu.js';
import { aplicarPoses } from '../datos/gestos.js';

fijarAlto(ALTO_SUPERVIVENCIA);
const DY = DESNIVEL_SUPERVIVENCIA;
// Estudio, fase 6: gestos y poses de mundo/datos/poses.json (reemplazan por nombre a los del código; sin archivo, el código)
cargarDatos('poses').then(d => { if (d) aplicarPoses(d); });

// ---------------------------------------------------------
// Idioma
// ---------------------------------------------------------
let idioma = 'es';
let panelCartas = null, mesaCartas = null, armarMazo = null;
let mesaMirar = null; // otra mesa (cartas-mesa.js con espectador): el duelo ajeno que miras de cerca (duelo 2J, PR 4)
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
    panelCartas?.setIdioma(idioma);
    mesaCartas?.setIdioma(idioma);
    armarMazo?.setIdioma(idioma);
}
aplicarIdioma();

const TXT = {
    es: {
        dificultades: ['Pacífico', 'Fácil', 'Normal', 'Difícil'], descubierto: 'Lugar descubierto', jugar: 'Jugar', exportar: 'Exportar', borrar: 'Borrar',
        confirmarBorrar: n => `¿Borrar «${n}» para siempre? No se puede deshacer.`, vacio: 'Aún no tienes mundos.',
        dia: n => `Día ${n}`, lleno: `Tienes ${MAX_MUNDOS} mundos: borra uno para crear otro.`, mundo: 'Mi mundo',
        generando: 'Generando el mundo…', guardado: 'Partida guardada', importado: 'Partida importada', errorGuardar: 'No se pudo guardar la partida',
        noDormir: 'Solo puedes dormir de noche', monstruos: 'No puedes dormir ahora: hay monstruos cerca', durmiendo: 'Durmiendo…', spawn: 'Punto de reaparición fijado',
        muerteCausa: c => (CAUSAS[c] || CAUSAS.golpe).es, sinAlmacen: 'Este navegador no permite guardar partidas (modo privado).',
        completado: 'Completado', jugado: m => `${m} min jugados`, clicSeguir: 'Haz clic para seguir jugando', idiomaCoop: 'El idioma se cambia fuera de la partida en grupo', idiomaOtraVez: 'Pulsa L otra vez para pasar a English: se guarda y se recarga el mundo', idiomaPregunta: '¿Cambiar el idioma? Se guarda la partida y el mundo se recarga (unos segundos).',
        hospedar: 'Hospedar', conectando: 'Conectando…', creandoSala: 'Abriendo la sala…', bajandoMundo: 'Bajando el mundo del anfitrión…',
        faltaNombre: 'Escribe tu nombre.', faltaCodigo: 'Escribe el código de la sala (6 letras o números).',
        errores: { 'sin-anfitrion': 'No hay nadie hospedando esa sala.', llena: `La sala está llena (máximo ${MAX_COOP}).`, 'llena-respaldo': `Tu red no permite conexión directa y la sala ya tiene ${MAX_RESPALDO} o más jugadores.`, foto: 'El anfitrión no mandó el mundo. Prueba de nuevo.', codigo: 'No se pudo abrir la sala. Prueba de nuevo.', 'sin-config': 'El modo online no está configurado.' },
        errorRed: 'No se pudo conectar', sala: (c, n) => `Sala ${c} · ${n}/${MAX_COOP}`, copiado: 'Código copiado',
        copiaGuardada: 'Copia guardada en este dispositivo', copiaLlena: `Ya tienes ${MAX_MUNDOS} mundos: borra uno para guardar la copia.`,
        copiaTitulo: 'Tus mundos están llenos', copiaGuardadaTitulo: 'Copia guardada',
        copiaNotaLlena: 'Para guardar esta copia, reemplaza uno de tus mundos o descárgala como archivo (se importa después).',
        copiaNotaGuardada: n => `La copia «${n}» quedó en este dispositivo.`, copiaDescargada: 'Copia descargada como archivo',
        reemplazar: 'Reemplazar', descargarAntes: 'Descargar antes', mundoAbierto: 'Es el mundo que tienes abierto: no se puede reemplazar.',
        borrarParaSiempre: n => `Se borrará «${n}» para siempre. ¿Reemplazarlo por la copia?`,
        errorBorrarCopia: 'La copia se guardó, pero no se pudo borrar el mundo viejo: bórralo desde el menú.',
        finAnfitrion: 'El anfitrión cerró la partida.', finConexion: 'Se cortó la conexión con la sala.', copia: n => `${n} (copia)`,
        finLocal: 'Se cortó la conexión con el anfitrión. Para volver, pídele una invitación nueva («Invitar jugador» en su pausa).',
        salaLocal: n => `Sala sin internet · ${n}/${MAX_COOP}`, invitarTitulo: 'Invitar jugador', unirseTitulo: 'Unirse con QR',
        pasoInvitar1: '1. Tu amigo elige «Unirse con QR (sin internet)» en el menú y escanea este código.',
        pasoInvitar2: '2. Después escanea el código de respuesta que aparece en su pantalla.',
        pasoUnirse1: '1. Escanea la invitación que muestra el anfitrión («Invitar jugador» en su pausa).',
        pasoUnirse2: '2. Muestra este código al anfitrión para que lo escanee.',
        preparando: 'Preparando la respuesta…', esperandoAnfitrion: 'Esperando a que el anfitrión lea tu código…', conectandoQR: 'Conectando…',
        entroQR: n => `${n} entró a la sala`, avisoLocal: 'Sala sin internet: invita a cada amigo desde la pausa («Invitar jugador»).', solos: 'Solo tú',
        tuyo: ' (tú)', tuAnf: ' (tú · anfitrión)', anfitrion: ' (anfitrión)', msPeor: n => `peor invitado: ${n} ms`, tabTitulo: 'Jugadores',
        erroresQR: {
            'qr-ilegible': 'Ese código no es de Venjy o está incompleto.', 'qr-tipo': 'Ese código no corresponde a este paso.',
            'qr-otra': 'Esa respuesta es de otra invitación. Usa la última.', 'qr-conexion': 'No se pudo conectar. ¿Están en la misma red? Prueba con una invitación nueva.',
            'sin-camara': 'No hay cámara disponible: usa el texto.'
        }
    },
    en: {
        dificultades: ['Peaceful', 'Easy', 'Normal', 'Hard'], descubierto: 'Place discovered', jugar: 'Play', exportar: 'Export', borrar: 'Delete',
        confirmarBorrar: n => `Delete "${n}" forever? This can't be undone.`, vacio: "You don't have any worlds yet.",
        dia: n => `Day ${n}`, lleno: `You have ${MAX_MUNDOS} worlds: delete one to create another.`, mundo: 'My world',
        generando: 'Generating the world…', guardado: 'Game saved', importado: 'World imported', errorGuardar: "Couldn't save the game",
        noDormir: 'You can only sleep at night', monstruos: 'You may not rest now; there are monsters nearby', durmiendo: 'Sleeping…', spawn: 'Respawn point set',
        muerteCausa: c => (CAUSAS[c] || CAUSAS.golpe).en, sinAlmacen: "This browser can't save games (private mode).",
        completado: 'Completed', jugado: m => `${m} min played`, clicSeguir: 'Click to keep playing', idiomaCoop: 'Change the language outside the group game', idiomaOtraVez: 'Press L again to switch to Español: the world is saved and reloaded', idiomaPregunta: 'Change the language? The game is saved and the world reloads (a few seconds).',
        hospedar: 'Host', conectando: 'Connecting…', creandoSala: 'Opening the room…', bajandoMundo: "Downloading the host's world…",
        faltaNombre: 'Enter your name.', faltaCodigo: 'Enter the room code (6 letters or numbers).',
        errores: { 'sin-anfitrion': 'Nobody is hosting that room.', llena: `The room is full (max ${MAX_COOP}).`, 'llena-respaldo': `Your network doesn't allow a direct connection and the room already has ${MAX_RESPALDO} or more players.`, foto: "The host didn't send the world. Try again.", codigo: "Couldn't open the room. Try again.", 'sin-config': 'Online mode is not configured.' },
        errorRed: "Couldn't connect", sala: (c, n) => `Room ${c} · ${n}/${MAX_COOP}`, copiado: 'Code copied',
        copiaGuardada: 'Copy saved on this device', copiaLlena: `You already have ${MAX_MUNDOS} worlds: delete one to save the copy.`,
        copiaTitulo: 'Your worlds are full', copiaGuardadaTitulo: 'Copy saved',
        copiaNotaLlena: 'To save this copy, replace one of your worlds or download it as a file (you can import it later).',
        copiaNotaGuardada: n => `The copy "${n}" is now on this device.`, copiaDescargada: 'Copy downloaded as a file',
        reemplazar: 'Replace', descargarAntes: 'Download first', mundoAbierto: "This is the world you have open: it can't be replaced.",
        borrarParaSiempre: n => `"${n}" will be deleted forever. Replace it with the copy?`,
        errorBorrarCopia: "The copy was saved, but the old world couldn't be deleted: delete it from the menu.",
        finAnfitrion: 'The host closed the game.', finConexion: 'The connection to the room was lost.', copia: n => `${n} (copy)`,
        finLocal: 'The connection to the host was lost. To come back, ask for a new invite («Invite player» in their pause menu).',
        salaLocal: n => `Offline room · ${n}/${MAX_COOP}`, invitarTitulo: 'Invite player', unirseTitulo: 'Join with QR',
        pasoInvitar1: '1. Your friend picks «Join with QR (offline)» in the menu and scans this code.',
        pasoInvitar2: '2. Then scan the reply code shown on their screen.',
        pasoUnirse1: '1. Scan the invite shown by the host («Invite player» in their pause menu).',
        pasoUnirse2: '2. Show this code to the host so they can scan it.',
        preparando: 'Preparing the reply…', esperandoAnfitrion: 'Waiting for the host to read your code…', conectandoQR: 'Connecting…',
        entroQR: n => `${n} joined`, avisoLocal: 'Offline room: invite each friend from the pause menu («Invite player»).', solos: 'Just you',
        tuyo: ' (you)', tuAnf: ' (you · host)', anfitrion: ' (host)', msPeor: n => `worst guest: ${n} ms`, tabTitulo: 'Players',
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
const ajustes = { distancia: 8, fov: 70, sens: 22, hora: false };
try { Object.assign(ajustes, JSON.parse(localStorage.getItem(AJUSTES_CLAVE) || '{}')); } catch (e) { /* sin almacenamiento */ }
const guardarAjustes = () => { try { localStorage.setItem(AJUSTES_CLAVE, JSON.stringify(ajustes)); } catch (e) { /* sin almacenamiento */ } };
// Rendimiento (7b-2): escala de render, partículas, nubes, animación lejana, límite de FPS, distancia automática
const DPR = window.devicePixelRatio || 1;
let rendCrudo = null;
try { rendCrudo = JSON.parse(localStorage.getItem(CLAVE_REND)); } catch (e) { /* sin almacenamiento */ }
const rend = normalizarRend(rendCrudo, DPR);
const guardarRend = () => { try { localStorage.setItem(CLAVE_REND, JSON.stringify(rend)); } catch (e) { /* sin almacenamiento */ } };

// ---------------------------------------------------------
// Menú de mundos
// ---------------------------------------------------------
const $ = id => document.getElementById(id);
const pantallas = ['menu-titulo', 'menu-amigos', 'menu-mundos', 'crear-mundo', 'pausa', 'muerte', 'pantalla-skin', 'coop-fin', 'copia-llena', 'hospedar-modo', 'panel-qr'];
function mostrar(id) {
    $('inicio').hidden = !id;
    for (const p of pantallas) $(p).hidden = p !== id;
}

const datos = generarDatos('h');
const terreno = prepararTerreno(datos, { supervivencia: true });

// Menú de inicio: pantalla de título (logo, pie y una frase al azar de mundo/datos/inicio.json)
async function pintarTitulo() {
    mostrar('menu-titulo');
    const d = datosInicio(await cargarDatos('inicio'));
    const poner = (id, txt) => { const el = $(id); el.dataset.es = txt.es; el.dataset.en = txt.en; el.textContent = txt[idioma] || txt.es; };
    poner('logo-texto', d.titulo.logo); poner('logo-sub', d.titulo.sub); poner('pie-inicio', d.titulo.pie);
    const f = $('frase-inicio'), v = d.titulo.frase;
    f.textContent = fraseAlAzar(d, idioma);
    f.hidden = !f.textContent;
    f.style.setProperty('--frase-color', v.color);
    f.style.setProperty('--frase-giro', v.giro + 'deg');
    f.style.setProperty('--frase-pulso', 1 + v.pulso);
    f.style.setProperty('--frase-x', v.x + '%');
    f.style.setProperty('--frase-y', v.y + '%');
    f.style.setProperty('--frase-ritmo', v.ritmo > 0 ? (1 / v.ritmo).toFixed(3) + 's' : '0s');
}
$('ir-un-jugador').addEventListener('click', () => pintarMenu());
$('ir-amigos').addEventListener('click', () => pintarAmigos());
$('volver-titulo').addEventListener('click', () => pintarTitulo());
$('volver-titulo-amigos').addEventListener('click', () => pintarTitulo());

// Un jugador: tus mundos
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
        const be = boton(tx().exportar, () => exportarMundo(m.id).catch(err => alert(err.message)), 'secundario');
        const bb = boton(tx().borrar, async () => { if (confirm(tx().confirmarBorrar(m.nombre))) { await borrarMundo(m.id); pintarMenu(); } }, 'secundario peligro');
        botones.append(bj, be, bb);
        li.append(info, botones);
        ul.appendChild(li);
    }
    $('nuevo-mundo').hidden = false;
    $('nuevo-mundo').disabled = lista.length >= MAX_MUNDOS;
    $('nuevo-mundo').title = lista.length >= MAX_MUNDOS ? tx().lleno : '';
    $('importar').hidden = false;
    $('volver-titulo').hidden = false;
}

// Con amigos: entrar con un código o un QR, u hospedar uno de tus mundos (sin internet también se juega, con QR)
async function pintarAmigos() {
    mostrar('menu-amigos');
    $('coop-fila-codigo').hidden = !ONLINE_ACTIVO;
    let lista = [];
    try { lista = await listarMundos(); } catch (e) { /* sin almacenamiento: solo se puede entrar a una sala */ }
    const ul = $('lista-hospedar');
    ul.textContent = '';
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
        d.textContent = [tx().dificultades[m.dificultad] || '', tx().dia(m.dias + 1)].filter(Boolean).join(' · ');
        info.append(n, d);
        const botones = document.createElement('div');
        botones.className = 'botones-mundo';
        botones.append(boton(tx().hospedar, () => elegirHospedar(m.id)));
        li.append(info, botones);
        ul.appendChild(li);
    }
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
$('hospedar-internet').addEventListener('click', () => { pintarAmigos(); hospedarMundo(mundoPorHospedar, false); });
$('hospedar-local').addEventListener('click', () => { pintarAmigos(); hospedarMundo(mundoPorHospedar, true); });
$('hospedar-cancelar').addEventListener('click', () => pintarAmigos());
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
    panelQR.abrir({ titulo: tx().unirseTitulo, cancelar: () => { cancelado = true; pintarAmigos(); } });
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
        alVolver: () => { editor.destruir(); editor = null; if (volver === 'pausa') mostrar('pausa'); else pintarTitulo(); }
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
// Pantalla de carga: título, barra por etapas reales de arrancar, consejo al azar (mundo/datos/inicio.json → carga)
let etapaCarga = async () => {};
let cerrarCarga = async () => {};
function abrirCarga(d) {
    const c = d.carga, a = c.aspecto, t = c.tiempos, pant = $('pantalla-carga');
    const T = x => (x && (x[idioma] || x.es)) || '';
    const desde = performance.now();
    pant.style.setProperty('--carga-fondo', a.fondo);
    pant.style.setProperty('--carga-fondo2', a.fondo2);
    pant.style.setProperty('--carga-barra', a.barra);
    pant.style.setProperty('--carga-barra-fondo', a.barraFondo);
    pant.style.setProperty('--carga-texto', a.texto);
    pant.style.setProperty('--carga-cuadro', a.cuadro + 'px');
    pant.style.setProperty('--carga-salida', t.salida + 's');
    $('carga-titulo').textContent = T(c.titulo);
    const consejo = consejoAlAzar(d, idioma);
    $('carga-consejo').textContent = consejo ? `${T(c.rotuloConsejo)}: ${consejo}` : '';
    pant.classList.remove('saliendo');
    pant.hidden = false;
    const poner = (clave, nombre) => {
        const n = avanceCarga(d, clave);
        $('carga-relleno').style.width = n + '%';
        $('carga-barra').setAttribute('aria-valuenow', String(n));
        $('carga-etapa').textContent = nombre;
    };
    poner('terreno', T(c.etapas.terreno && c.etapas.terreno.nombre));
    // Cede un cuadro para que se pinte la barra antes del trabajo pesado de la etapa (rAF puede no correr en segundo plano)
    etapaCarga = async clave => {
        poner(clave, T(c.etapas[clave] && c.etapas[clave].nombre));
        await new Promise(r => { requestAnimationFrame(() => setTimeout(r, 0)); setTimeout(r, 60); });
    };
    cerrarCarga = async () => {
        poner(null, '');
        const falta = t.minimo * 1000 - (performance.now() - desde);
        if (falta > 0) await new Promise(r => setTimeout(r, falta));
    };
}
function ocultarCarga() {
    const pant = $('pantalla-carga');
    if (pant.hidden) return;
    const seg = parseFloat(pant.style.getPropertyValue('--carga-salida')) || 0;
    pant.classList.add('saliendo');
    setTimeout(() => { pant.hidden = true; pant.classList.remove('saliendo'); }, seg * 1000 + 30);
}

// Fondo de cine detrás del menú (fondo-menu.js; inicio.json → fondo). Estudio → Inicio «Ver»: ?plano=N repite solo
// ese plano y #fondo=<json> trae lo que aún no se guarda.
let fondo = null;
async function iniciarFondo() {
    const d = datosInicio(await cargarDatos('inicio'));
    const q = new URLSearchParams(location.search);
    try { const h = new URLSearchParams(location.hash.slice(1)).get('fondo'); if (h) d.fondo = { ...d.fondo, ...JSON.parse(h) }; } catch (e) { /* hash roto: el guardado */ }
    const soloPlano = q.has('plano') ? Number(q.get('plano')) : null;
    const tactil = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (!fondoActivo(d, tactil) && soloPlano === null) return;
    if (enJuego) return;
    fondo = crearFondoMenu({ renderer, terreno, materiales, datos: d, velo: $('fondo-velo'), tactil, soloPlano });
    $('inicio').style.setProperty('--fondo-oscurecer', d.fondo.oscurecer);
    $('inicio').classList.add('con-fondo');
    window.__venjy = Object.assign(window.__venjy || {}, { fondo });
    await fondo.listo;
}
function cerrarFondo() {
    if (!fondo) return;
    fondo.destruir();
    fondo = null;
    $('inicio').classList.remove('con-fondo');
}

function iniciarJuego(guardado, cx = null) {
    if (enJuego) return;
    enJuego = true;
    mostrar('menu-mundos');
    $('lista-mundos').hidden = true;
    for (const id of ['nuevo-mundo', 'importar', 'volver-titulo']) $(id).hidden = true;
    $('carga').hidden = true;
    cargarDatos('inicio').then(j => datosInicio(j)).then(d => {
        abrirCarga(d);
        cerrarFondo(); // la carga ya tapa la pantalla: se libera el mundo del fondo antes de crear el del juego
        setTimeout(() => arrancar(guardado, cx).catch(err => {
            console.error(err);
            $('carga-etapa').textContent = 'Error: ' + err.message;
        }), 30);
    });
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
    mundo.aplicarFormas(await cargarDatos('formas')); // 7f-2: losas, escalones, vallas… (pestaña Formas del Estudio)
    const jugador = new Jugador(camara, mundo, lienzo, { x: terreno.BW, z: terreno.BD });
    jugador.sinVuelo = true;
    jugador.vCaminar = 4.6;       // 7a: más rápido que el creativo (4,3); Minecraft camina a 4,32
    jugador.vCorrer = 7.0;        // 7a: creativo 5,6; el mapa es grande (Inicio → Faro ≈ 3 min)
    jugador.bonoCamino = 1.15;    // 7a: +15 % sobre B.CAMINO
    jugador.impulsoSalto = 1.8;   // saltar corriendo suma impulso…
    jugador.topeSalto = 8.6;      // …hasta este tope (correr y saltar es más rápido que solo correr)
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
        mundo.instalar(k, mallarChunkCrudo(cx, cz, relleno), relleno.vox, relleno.luz, relleno.maxY);
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
    await etapaCarga('sistemas');
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
    const soltarDelante = (id, n, d, marca = null) => {
        const dir = new THREE.Vector3(); camara.getWorldDirection(dir);
        entidades.soltar(id, n, d, jugador.pos.x + dir.x * 0.5, jugador.pos.y + 1.3, jugador.pos.z + dir.z * 0.5, dir.multiplyScalar(4).add(new THREE.Vector3(0, 1.5, 0)), 1.5, null, marca);
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
            for (const p of inventario.vaciar()) entidades.soltar(p.id, p.n, p.d, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z, null, 0.5, null, p.p);
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
    await etapaCarga('amigos');
    const vista = vistaDesplazada({ scene, mundo, jugador, camara, dy: DY });
    const ctxCriaturas = { datos, terreno, mundo: vista.mundo, jugador: vista.jugador, materiales };
    const gatas = crearGatas(vista.grupo, ctxCriaturas);
    const animales = crearAnimales(vista.grupo, ctxCriaturas);
    const npcs = crearNPCs(vista.grupo, { ...ctxCriaturas, gatas, carteles: null, idioma });
    const amigos = crearAmigos(vista.grupo, { ...ctxCriaturas, npcs, idioma });
    // Vida entre amigos (bloque 6d): charlas y bromas en la fogata y el iglú sin el jugador; los guiones se cargan al acercarse
    const vidaAmigos = crearVidaAmigos({ amigos, jugador: vista.jugador, idioma: () => idioma, libre: () => !vida.muerto });
    const venjys = crearVenjys(vista.grupo, { ...ctxCriaturas, destinos: destinosZonas({ terreno, datos }), orientacion: 'h', idioma });
    const minimapa = crearMinimapa(datos, $('hud'), ESCALA);
    minimapa.fijarPersonas(() => [...npcs.lista, ...amigos.lista, ...venjys.lista]);

    // ---- Mundo vivo: partículas, ganado, monstruos, proyectiles, combate y pesca ----
    await etapaCarga('mundo');
    const particulas = crearParticulas({ scene, atlasLienzo });
    const ganado = crearGanado({ animales, entidades, inventario, jugador, dy: DY, scene, hud, idioma });
    ganado.cargar(guardado.ganado);
    let enemigos = null, misiones = null, facilidades = null, caminosCarteles = null, cuaderno = null, jefes = null, escenas = null, escenaCuello = null, fauna = null;
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
    const pesca = crearPesca({ scene, camara, mundo, jugador, inventario, entidades, particulas, multiplicadores: () => facilidades && facilidades.multiplicadores() });
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
    // Lugares descubiertos (7f-3): viven en la partida (misiones.estado.lugares). Los de antes estaban
    // en localStorage aparte; se pasan una vez a la partida.
    try {
        const viejos = JSON.parse(localStorage.getItem(`venjy-descubiertos-${guardado.id}`));
        if (Array.isArray(viejos)) for (const c of viejos) misiones.estado.lugares.add(c);
        localStorage.removeItem(`venjy-descubiertos-${guardado.id}`);
    } catch (e) { /* sin almacenamiento */ }
    // Facilidades de misión (7d-2): huerto, horno y grava puestos, pistas, monstruo de la noche y pesca. El invitado no edita el mundo del anfitrión
    facilidades = crearFacilidades({ mundo, terreno, dy: DY, jugador, dia, enemigos, agricultura, misiones, idioma, colocar: !invitado });
    facilidades.cargar();
    misiones.facilidades = facilidades;
    minimapa.fijarMarcas(() => facilidades.marcas());
    // Señales de los caminos (7f-3): mojones, carteles de cruce y faroles; aquí solo se pinta su texto
    caminosCarteles = crearCartelesCamino({ scene, camara, terreno, dy: DY, idioma });
    // Cuaderno de los Tomatitos (7f-3): 12 páginas escondidas; qué páginas lleva cada uno va en el inventario
    cuaderno = crearCuaderno({ scene, jugador, inventario, vida, hud, entidades, terreno, dy: DY, idioma, abrirPanel, cerrarPanel });
    // Fauna de ambiente (7f-3): mariposas, abejas, peces que saltan y luciérnagas (tope 64, instanciada); se carga con import()
    import('./fauna.js').then(m => { fauna = m.crearFauna({ scene, camara, jugador, dia, terreno, datos, dy: DY }); }).catch(() => {});
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
    const usosObjetos = crearUsosObjetos({ minimapa, gatas, jugador, sonido: { tono, ruido } });
    // MAZO: apuntando a otro jugador de la sala lo reta a un duelo ahí mismo; si no, abre el armado del mazo
    minado.usarObjeto = (o, p) => (p.id === O.CANA ? pesca.usar() : p.id === O.CUADERNO && cuaderno ? cuaderno.usar(p) : p.id === O.MAZO ? (retarApuntado() || abrirArmarMazo()) : usosObjetos.usar(p) || combate.usar(p));
    minado.usarSinNada = () => combate.bloquearConMano2();
    minado.alSoltarDerecho = () => combate.soltarDerecho();
    minado.alRomper = (id, x, y, z) => particulas.romper(id, x, y, z);
    const mano = crearMano({ renderer, atlas, atlasLienzo, mundo, jugador, inventario, minado, combate, tinteMundo: materiales.solido.color });
    // Golpe (romper, atacar, usar): la mano, el cuerpo en F5 y los demás jugadores (bit 8 de `p`)
    minado.alGesto = () => { mano.golpear(); camaras.golpear(); if (coop) coop.golpeo(); };
    // Lo que hace el jugador, para la pose del cuerpo (pose-jugador.js, 7c-1): tercera persona y red.
    // Con un gesto de la ruleta (7c-2) se suma el gesto, sin objetos y con el giro congelado.
    let ruleta = null;
    const entradaPose = () => {
        const id = inventario.idEnMano();
        return {
            corre: jugador.corre, golpe: minado.izquierdo, comiendo: minado.comiendo > 0,
            tensando: combate.tensando > 0, bloqueando: combate.bloqueando,
            objeto: id, objeto2: inventario.mano2 ? inventario.mano2.id : 0, escudo: id === O.ESCUDO ? 1 : 0,
            sentado: !!(mesaCartas && mesaCartas.sentado), // duelo de cartas en el piso o el tronco
            ...(ruleta && ruleta.entrada())
        };
    };
    // Skin, tercera persona (F5) y cámara de cine con los amigos
    const skinInicial = cargarSkin();
    await etapaCarga('escenas');
    const camaras = crearCamaras({ scene, camara, mundo, jugador, skin: skinInicial, tinteMundo: materiales.solido.color, dy: DY, fabrica: mano.fabrica, entradaPose });
    // ponerSkin acepta la descripción o la clave de una base ('pony', 'venjy'…) para probar
    let skinActual = skinInicial;
    const ponerSkin = d => {
        if (typeof d === 'string') { const b = BASES.find(x => x.clave === d); if (!b) return null; d = { ...JSON.parse(JSON.stringify(b)), base: b.clave }; }
        skinActual = d;
        camaras.ponerSkin(d); mano.ponerSkin(d);
        if (coop) coop.anunciarSkin(d);
        return d;
    };
    ponerSkin(skinInicial);
    juego = { ponerSkin };
    // Escenas de skin: un amigo reconoce tu skin (o a Venjy) la primera vez que te acercas
    // Bloqueo del jugador durante las escenas (skins y caricias a las gatas): el mundo sigue, sin control.
    // El puntero sigue capturado (sin mirar ni usar las manos): así al terminar se vuelve a jugar sin «Haz clic
    // para seguir jugando», que el navegador exige si hay que pedir el puntero sin un clic reciente. Si la escena
    // se abrió desde un panel (puntero suelto), se recaptura con ese mismo clic. Esc la salta (el navegador suelta
    // el puntero; el botón «Saltar» queda a mano). conCursor: minijuegos y la ronda del iglú, que usan el mouse.
    const bloquearEscena = (conCursor = false) => {
        uiAbierta = true; jugador.congelado = true; jugador.teclas.clear();
        if (tactil) { tactil.desactivar(); return; }
        if (conCursor === true) { if (document.pointerLockElement) document.exitPointerLock(); return; }
        jugador.sinMirar = true;
        if (!document.pointerLockElement && navigator.userActivation && navigator.userActivation.isActive) {
            try { const r = lienzo.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* queda con cursor */ }
        }
    };
    const liberarEscena = () => { uiAbierta = false; jugador.congelado = false; jugador.sinMirar = false; if (!vida.muerto && !jugador.activo) entrar(); };
    escenas = crearEscenasSkin({
        grupo: vista.grupo, dy: DY, mundo, jugador, camara, camaras, misiones, npcs, amigos, venjys, idioma,
        skin: () => skinActual,
        puede: () => jugador.activo && !uiAbierta && !vida.muerto && !jefes.enCurso,
        bloquear: bloquearEscena,
        liberar: liberarEscena,
        // Bienvenidas y reencuentros (bloque 6c-1): el motor de amistad y la escena se cargan con import() al usarse
        amistad6c: {
            bienvenida: base => (puede6c() ? cargarEscenaAmistad().then(ea => (ea ? ea.bienvenida(base) : false)) : false),
            reencuentro: (base, clave) => (puede6c() ? cargarEscenaAmistad().then(ea => (ea ? ea.reencuentro(base, clave) : false)) : false),
            grupo: (nombre, base) => (puede6c() ? cargarEscenaAmistad().then(ea => (ea ? ea.grupo(nombre, base) : false)) : false)
        }
    });
    const puede6c = () => !vida.muerto && !jefes.enCurso && !ronda.activa && !minijuegos.activo && !(escenaAmistad && escenaAmistad.activa);
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
        bloquear: () => bloquearEscena(true),
        liberar: liberarEscena
    });
    camaras.cuerpoAjeno = () => ronda.activa; // sentado en el iglú: la ronda mueve el cuerpo
    // Minijuegos (duelo de hachas con Boris, pesca con Pony, asado en la fogata): botón en el panel del amigo
    const minijuegos = crearMinijuegos({
        grupo: vista.grupo, dy: DY, mundo, jugador, camara, camaras, misiones, amigos, npcs, terreno, inventario, entidades, hud, particulas, idioma,
        tinteMundo: materiales.solido.color,
        puede: () => !vida.muerto && !jefes.enCurso && !ronda.activa,
        bloquear: () => bloquearEscena(true),
        liberar: liberarEscena
    });
    let cargandoCartas = null, datosCartas = null; // datosCartas: cartas-mesa.json tal como se leyó (mesa, panel y armar mazo)
    const textoCartas = o => (o && (o[idioma] || o.es)) || '';
    function cargarPanelCartas() {
        if (!cargandoCartas) cargandoCartas = import('./cartas-panel.js').then(m => {
            panelCartas = m.crearPanelCartas({ idioma, inventario, datos: () => window.__venjy?.datosMesa || datosCartas, alCerrar: () => { document.body.classList.remove('panel-lado'); uiAbierta = false; if (!vida.muerto) entrar(); } });
            return panelCartas;
        }).catch(err => { cargandoCartas = null; console.error('No se pudo cargar el duelo de cartas', err); return null; });
        return cargandoCartas;
    }
    // Mesa 3D del duelo (7h-2b, PR 4a: cartas-mesa.js, con import() la primera vez); el panel 2D queda de respaldo
    let cargandoMesa = null;
    function cargarMesaCartas() {
        if (!cargandoMesa) cargandoMesa = Promise.all([import('./cartas-mesa.js'), cargarDatos('cartas-mesa')]).then(([m, datos]) => {
            datosCartas = datos;
            mesaCartas = m.crearMesaCartas({
                datos: window.__venjy?.datosMesa || datos, // mundo/datos/cartas-mesa.json (o lo último que mandó el Estudio)
                scene, grupo: vista.grupo, dy: DY, camaras, renderer, jugador, idioma, inventario, // inventario: tu colección y tu mazo
                tinte: materiales.solido.color,
                lucho: () => amigos.lista.find(n => n.clave === 'lucho') || null,
                // Duelo entre jugadores: el controlador (null sin sala) y el cuerpo del rival (tocarlo = ataque directo)
                duelo: () => duelo,
                cuerpoDe: id => (coop && coop.remotos.get(id)?.modelo?.g) || null,
                alCerrar: liberarEscena,
                alTutorial: () => misiones.estado.minijuegos.add('cartas-tuto'), // ganaste el tutorial: la próxima vez, elegir nivel
                alPanel: n => { jugador.congelado = false; jugador.sinMirar = false; abrirPanelCartas(n); }
            });
            return mesaCartas;
        }).catch(err => { cargandoMesa = null; console.error('No se pudo cargar la mesa de cartas', err); return null; });
        return cargandoMesa;
    }
    // Mirar un duelo ajeno (duelo 2J, PR 4): otra instancia de la mesa, sin cámara ni controles (ctx.espectador)
    let cargandoMirar = null;
    function cargarMesaMirar() {
        if (!cargandoMirar) cargandoMirar = Promise.all([import('./cartas-mesa.js'), cargarDatos('cartas-mesa')]).then(([m, datos]) => {
            if (!datosCartas) datosCartas = datos;
            mesaMirar = m.crearMesaCartas({ espectador: true, datos: window.__venjy?.datosMesa || datos, scene, grupo: vista.grupo, dy: DY, camaras, renderer, jugador, idioma, tinte: materiales.solido.color });
            return mesaMirar;
        }).catch(err => { cargandoMirar = null; console.error('No se pudo cargar la mesa para mirar', err); return null; });
        return cargandoMirar;
    }
    // Armar tu mazo (etapa A, punto 3): clic derecho con el MAZO en la mano; cartas-armar.js con import() la primera vez.
    // Lee las reglas y la colección inicial de cartas-mesa.json (o lo último que mandó el Estudio)
    let cargandoArmar = null;
    function abrirArmarMazo() {
        if (uiAbierta) return false;
        if (!cargandoArmar) cargandoArmar = Promise.all([import('./cartas-armar.js'), cargarDatos('cartas-mesa')]).then(([m, datos]) => {
            datosCartas = datos;
            armarMazo = m.crearArmarMazo({ idioma, inventario, hud, abrirPanel, cerrarPanel, datos: () => window.__venjy?.datosMesa || datosCartas });
            return armarMazo;
        }).catch(err => { cargandoArmar = null; console.error('No se pudo cargar el armado del mazo', err); return null; });
        cargandoArmar.then(a => { if (a && !uiAbierta && !vida.muerto) a.abrir(); });
        return true;
    }
    function abrirPanelCartas(n = 'facil') {
        uiAbierta = true;
        cargarPanelCartas().then(p => { if (p) p.abrir(n); else { uiAbierta = false; if (!vida.muerto) entrar(); } });
    }
    function abrirMesaCartas(n = 'facil') {
        bloquearEscena(true);
        // (A otro jugador se lo reta donde está, con el MAZO: retarApuntado)
        cargarMesaCartas().then(m => { if (!m || !m.abrir(n)) { jugador.congelado = false; jugador.sinMirar = false; abrirPanelCartas(n); } });
    }
    // Duelo: la primera vez (sin la marca 'cartas-tuto') el botón abre el tutorial; después, «Repasar el tutorial» aparte
    const tutoCartasVisto = () => misiones.estado.minijuegos.has('cartas-tuto');
    misiones.minijuego = {
        texto: clave => {
            if (clave === 'lucho') {
                const motivo = inventario.contar(O.MAZO) >= 1 ? null : textoCartas(TXT_CARTAS_BOTON.faltaMazo);
                return { texto: textoCartas(TXT_CARTAS_BOTON.boton), motivo, extra: tutoCartasVisto() && !motivo ? [{ texto: textoCartas(TXT_CARTAS_BOTON.tuto), modo: 'tutorial' }] : [] };
            }
            if (clave === 'lona') return { texto: textoCartas(CARRERA_BOTON.boton), motivo: null };
            return minijuegos.botonPara(clave);
        },
        // Cierra el panel sin pedir el puntero (el minijuego lo deja libre) y empieza
        jugar: (clave, modo) => {
            const b = clave === 'lucho'
                ? { texto: textoCartas(TXT_CARTAS_BOTON.boton), motivo: inventario.contar(O.MAZO) >= 1 ? null : textoCartas(TXT_CARTAS_BOTON.faltaMazo) }
                : clave === 'lona' ? { texto: textoCartas(CARRERA_BOTON.boton), motivo: null } : minijuegos.botonPara(clave);
            if (!b || b.motivo) return;
            capaPanel.hidden = true; capaPanel.textContent = '';
            document.body.classList.remove('panel-lado');
            camaras.terminarCine();
            if (clave === 'lucho') { abrirMesaCartas(modo === 'tutorial' || !tutoCartasVisto() ? 'tutorial' : 'facil'); return; }
            if (clave === 'lona') { cargarCarrera().then(k => { if (!k || !k.abrir()) { uiAbierta = false; if (!vida.muerto) entrar(); } }); return; }
            if (!minijuegos.intentar(b.juego)) { uiAbierta = false; if (!vida.muerto) entrar(); }
        }
    };
    // Animaciones de amistad (bloque 6b): escena-amistad.js se carga con import() la primera vez que se usa
    // (botón de la pestaña «Hablar»); igual que el minijuego, cierra el panel sin pedir el puntero y empieza
    let escenaAmistad = null, cargandoAmistad = null;
    const personasEscena = () => [...npcs.lista, ...amigos.lista, ...venjys.lista];
    // 'venjy' es el del Inicio; 'venjy@atalaya' o 'venjy@mina' (6c-2), el Venjy de ese lugar
    const personaAmistad = c => (c === 'venjy' ? venjys.lista.find(n => n.lugar === 'inicio')
        : c.startsWith('venjy@') ? venjys.lista.find(n => n.lugar === c.slice(6)) : personasEscena().find(n => n.clave === c)) || null;
    function cargarEscenaAmistad() {
        if (!cargandoAmistad) cargandoAmistad = import('./escena-amistad.js').then(m => {
            escenaAmistad = m.crearEscenaAmistad({
                grupo: vista.grupo, dy: DY, mundo, jugador, camara, camaras, misiones, idioma, personas: personasEscena, base: () => escenas.tipoSkin(skinActual).base,
                personaDe: personaAmistad,
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
        },
        // Saludo del grupo (6c-2): repite la escena de grupo de este amigo con tu skin
        grupo: clave => {
            const base = escenas.tipoSkin(skinActual).base, g = grupoDe(base, clave);
            if (!puedeAmistad() || !g) return;
            capaPanel.hidden = true; capaPanel.textContent = ''; document.body.classList.remove('panel-lado');
            camaras.terminarCine();
            cargarEscenaAmistad().then(ea => (ea ? ea.grupo(g, base) : false)).then(ok => { if (!ok) { uiAbierta = false; if (!vida.muerto) entrar(); } });
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
    await etapaCarga('datos');
    const comandosDev = crearComandosDev({
        jugador, vida, inventario, enemigos, jefes, gatas, escenas, hud, O, B, nombreDe, idioma,
        destinos: destinosDev,
        spawn: () => ({ x: spawnMundo.x, y: spawnMundo.y, z: spawnMundo.z }),
        spawnCama: () => spawnCama,
        irA,
        // /amistad (bloque 6b): recorre los saludos y momentos especiales; /amistad100 deja la amistad en 100
        amistad: {
            cargar: () => cargarEscenaAmistad(),
            persona: personaAmistad,
            nombre: c => NOMBRES_AMIGO[c] || c,
            puede: () => puedeAmistad(),
            max: c => { for (let i = 0; i < 12 && misiones.amistad.puntos(c) < 100; i++) misiones.amistad.sumar(c, 'mision'); },
            // 6c-1: el recorrido de bienvenidas y reencuentros te pone la skin del amigo y al final te devuelve la tuya
            skin: () => skinActual,
            ponerSkin: d => ponerSkin(d),
            callar: v => escenas.callar(v),
            vida: vidaAmigos // 6d: /amistad vida-<id>
        },
        medir: { mundo, jugador, minado, entidades, terreno, irA, hud, B, DY, chunkForzado } // /medir romper (7b-1)
    });
    // /cartas [facil|medio] (7h-2b): abre la mesa del duelo sin pedir el mazo, para probarla.
    // Duelo 2J (PR 3), para probar entre jugadores (cada uno en su pestaña): /cartas listo (tutorial visto + MAZO),
    // /cartas mesa (te da una mesa de duelo) y /cartas retar (reta al jugador más cercano sin apuntarle)
    const TXT_CARTAS_DEV = {
        listo: { es: 'Tutorial del Duelo visto y un MAZO en el inventario: ya puedes retar.', en: 'Duel tutorial done and a DECK in your inventory: you can challenge now.' },
        mesa: { es: 'Recibiste una mesa de duelo.', en: 'You got a duel table.' },
        nadie: { es: 'No hay otro jugador en la sala.', en: 'There is no other player in the room.' }
    };
    comandosDev['/cartas'] = {
        ayuda: { es: '/cartas [facil|medio|tutorial|listo|mesa|retar] (duelo: mesa de Lucho y pruebas entre jugadores)', en: '/cartas [facil|medio|tutorial|listo|mesa|retar] (duel: the table with Lucho and player tests)' },
        sugerir: () => ['facil', 'medio', 'tutorial', 'listo', 'mesa', 'retar'],
        fn: arg => { // la consola se cierra y pide el puntero antes: se abre un momento después
            const a = String(arg || '').trim();
            if (a === 'listo') {
                misiones.estado.minijuegos.add('cartas-tuto');
                if (inventario.contar(O.MAZO) < 1) inventario.agregar(O.MAZO, 1);
                hud.mensaje(textoCartas(TXT_CARTAS_DEV.listo), 4); return;
            }
            if (a === 'mesa') { inventario.agregar(O.MESA_DUELO, 1); hud.mensaje(textoCartas(TXT_CARTAS_DEV.mesa), 3); return; }
            if (a === 'retar') { setTimeout(() => { if (!retarCercano()) hud.mensaje(textoCartas(TXT_CARTAS_DEV.nadie), 3); }, 150); return; }
            const n = a === 'medio' || a === 'tutorial' ? a : 'facil';
            setTimeout(() => { if (!uiAbierta && !vida.muerto && !camaras.enCine) abrirMesaCartas(n); }, 150);
        }
    };
    // Consola de comandos (T o /): /fly, /dia, /noche, /ayuda, /escenas, /escena <nombre>, /gamemode devenjy (+ comandos de desarrollo)
    const consola = crearConsola({
        jugador, dia, hud, idioma, dev: comandosDev,
        extra: {
            '/escenas': { fn: () => recorrido.comando(''), ayuda: { es: '/escenas (todas, con skin de Venjy)', en: '/escenas (all, with the Venjy skin)' } },
            '/escena': { fn: n => recorrido.comando(n), ayuda: { es: '/escena <nombre> (una)', en: '/escena <name> (one)' } },
            '/gesto': { fn: n => ruleta && ruleta.comando(n), ayuda: { es: '/gesto <nombre|todos> (ruleta de gestos)', en: '/gesto <name|todos> (emote wheel)' } }
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
            ventanasBase, jugadoresGuardados: guardado.jugadores || {}, fabrica: mano.fabrica, entradaPose,
            skin: () => skinActual,
            estadoActual: () => estadoActual(),
            amanecerLocal, iluminar: iluminarCaja,
            alCambiarJugadores: () => pintarCoop(),
            alActividad: m => recibirActividad(m),
            alSalirJugador: id => salioDeActividades(id),
            alEntrarJugador: id => entroAActividades(id),
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
        $('coop-sala').textContent = texto;
        $('coop-pausa').hidden = false;
        $('coop-copia').hidden = coop.esAnfitrion;
        $('coop-compartir').checked = coop.compartido;
        // Sin internet no hay código: el anfitrión invita con un QR a cada uno
        $('coop-copiar').hidden = coop.local;
        $('coop-invitar').hidden = !(coop.local && coop.esAnfitrion);
        $('coop-invitar').disabled = coop.total >= MAX_COOP;
        pintarPing();
    }
    // ---- Ping (7e): barras de señal en la pausa y en la lista de Tab, «34 ms» opcional en el HUD ----
    const CLAVE_MS = 'venjy-sv-ms';
    let verMs = false;
    try { verMs = localStorage.getItem(CLAVE_MS) === '1'; } catch (e) { /* sin almacenamiento */ }
    const COLOR_MS = ['v', 'a', 'r'];
    function senalDe(ms) {
        const el = document.createElement('span');
        el.className = 'senal';
        const barras = barrasDeMs(ms), n = nivelDeMs(ms);
        for (let i = 1; i <= 4; i++) {
            const b = document.createElement('i');
            if (i <= barras) b.className = COLOR_MS[n];
            el.appendChild(b);
        }
        return el;
    }
    // Una fila por jugador, yo primero. El anfitrión es el servidor: sin barras en su fila.
    function filasJugadores() {
        const t = tx(), filas = [];
        filas.push({ nombre: cx.nombre + (coop.esAnfitrion ? t.tuAnf : t.tuyo), ms: coop.esAnfitrion ? null : coop.pingPropio(), anf: coop.esAnfitrion });
        for (const [id, r] of coop.remotos) filas.push({ id, nombre: r.nombre + (r.anf ? t.anfitrion : ''), ms: r.anf ? null : coop.pingDe(id), anf: r.anf });
        return filas;
    }
    function pintarFilas(cont) {
        const nodos = [];
        for (const f of filasJugadores()) {
            const fila = document.createElement('span');
            fila.className = 'jug';
            const nom = document.createElement('span');
            nom.textContent = f.nombre;
            fila.appendChild(nom);
            const et = f.id ? etiquetaDuelo(f.id) : '';
            if (et) { const d = document.createElement('span'); d.className = 'reto-tab'; d.textContent = et; fila.appendChild(d); }
            if (!f.anf) {
                fila.appendChild(senalDe(f.ms));
                const ms = document.createElement('span');
                ms.className = 'ms ' + (f.ms == null ? '' : COLOR_MS[nivelDeMs(f.ms)]);
                ms.textContent = f.ms == null ? '— ms' : f.ms + ' ms';
                fila.appendChild(ms);
            }
            nodos.push(fila);
        }
        cont.replaceChildren(...nodos);
    }
    // Lista Tab y de la pausa: quién te reta (con Y / N) y quién está en un duelo (duelo 2J, PR 4)
    const TXT_TAB_DUELO = { reta: { es: 'te reta: Y / N', en: 'challenges you: Y / N' }, duelo: { es: 'en un duelo', en: 'in a duel' }, espera: { es: 'espera rival en una mesa', en: 'waiting at a duel table' } };
    function etiquetaDuelo(id) {
        try { // (reto y actividades se declaran más abajo: antes de eso no hay nada que mostrar)
            if (reto && reto.inv.de === id) return textoCartas(TXT_TAB_DUELO.reta);
            const aid = actividades && actividades.dondeEsta(id);
            if (aid && aid.startsWith('duelo@')) { const a = actividades.actividad(aid); return textoCartas(a && a.jug.length === 1 && a.d[id] && a.d[id].espera ? TXT_TAB_DUELO.espera : TXT_TAB_DUELO.duelo); }
        } catch { /* aún sin declarar */ }
        return '';
    }
    function pintarPing() {
        if (!coop) return;
        const lista = $('coop-lista');
        if (!coop.remotos.size) lista.textContent = tx().solos;
        else pintarFilas(lista);
        const hudSala = $('coop-hud');
        hudSala.textContent = coop.local ? tx().salaLocal(coop.total) : tx().sala(coop.codigo, coop.total);
        const ms = verMs ? coop.pingPropio() : null;
        if (ms != null && coop.remotos.size) {
            const e = document.createElement('span');
            e.className = 'ms ' + COLOR_MS[nivelDeMs(ms)];
            e.textContent = ' · ' + (coop.esAnfitrion ? tx().msPeor(ms) : ms + ' ms');
            hudSala.appendChild(e);
        }
        if (!tabLista.hidden) { tabTitulo.textContent = tx().tabTitulo; pintarFilas(tabCuerpo); }
    }
    const tabLista = document.createElement('div');
    tabLista.id = 'coop-tab'; tabLista.className = 'coop-tab'; tabLista.hidden = true;
    const tabTitulo = document.createElement('b');
    const tabCuerpo = document.createElement('div');
    tabCuerpo.className = 'coop-tab-cuerpo';
    tabLista.append(tabTitulo, tabCuerpo);
    if (coop) $('hud').appendChild(tabLista);
    const ocultarTab = () => { tabLista.hidden = true; };
    document.addEventListener('keydown', e => {
        if (e.code !== 'Tab' || !coop || !jugador.activo || vida.muerto) return;
        e.preventDefault();
        if (tabLista.hidden) { tabLista.hidden = false; pintarPing(); }
    });
    document.addEventListener('keyup', e => { if (e.code === 'Tab') ocultarTab(); });
    window.addEventListener('blur', ocultarTab);
    if (coop) setInterval(() => { if (!document.hidden && (verMs || !tabLista.hidden || !$('coop-pausa').hidden)) pintarPing(); }, 1000);
    // ---- Actividades compartidas (7g-1, actividades-red.js) y duelo de cartas entre jugadores (cartas-duelo.js) ----
    // La capa común se carga con la sala; el duelo, la primera vez que alguien reta o te retan.
    let actividades = null, duelo = null, cargandoDuelo = null;
    const colaAct = [];
    if (coop) import('./actividades-red.js').then(m => {
        actividades = m.crearActividades({ yo: coop.yoId, esAnfitrion: coop.esAnfitrion, anfitrion: coop.idAnfitrion, enviar: x => coop.actividad(x) });
        // Antes de cargar el duelo: una invitación lo carga
        // (y un duelo con los dos dentro también: alguien cerca puede mirarlo)
        actividades.escuchar('duelo', { invitacion: inv => cargarDuelo().then(d => { if (d) avisoReto(inv); }), estado: act => { if (act && act.jug.length === 2) cargarDuelo(); } });
        for (const x of colaAct.splice(0)) actividades.recibir(x);
    }).catch(err => console.error('No se pudieron cargar las actividades compartidas', err));
    function recibirActividad(m) { if (actividades) actividades.recibir(m); else colaAct.push(m); }
    // Carrera de gatas (7h-1, «Gran Premio del Living»: carrera.js y su escena propia): se carga al abrirla desde el panel
    // de Lona; mientras corres, su escena se dibuja en lugar del mundo (el mundo sigue andando: sala, cooperativo)
    let carrera = null, cargandoCarrera = null;
    function cargarCarrera() {
        if (!cargandoCarrera) cargandoCarrera = Promise.all([import('./carrera.js'), cargarDatos('carrera')]).then(([m, json]) => {
            carrera = m.crearCarrera({
                jugador, gatas, npcs, inventario, entidades, hud, misiones, idioma,
                datos: () => window.__venjy?.datosCarrera || json,
                tactil: () => !!tactil,
                puede: () => !vida.muerto && !jefes.enCurso && !ronda.activa && !minijuegos.activo && !uiCarrera(),
                bloquear: () => bloquearEscena(true), liberar: liberarEscena,
                // Con sala: la carrera entre jugadores (carrera-red.js sobre las actividades compartidas)
                acts: () => actividades, yo: () => (coop ? coop.yoId : null), nombreJugador: id => (coop ? coop.nombreDe(id) : String(id))
            });
            return carrera;
        }).catch(err => { cargandoCarrera = null; console.error('No se pudo cargar la carrera de gatas', err); return null; });
        return cargandoCarrera;
    }
    const uiCarrera = () => !!(carrera && carrera.activa);
    // Anfitrión: quien entra a la sala sabe qué actividades hay (y puede mirar un duelo que ya empezó)
    function entroAActividades(id) { if (actividades) actividades.entroJugador(id); }
    function salioDeActividades(id) {
        if (actividades) actividades.salioJugador(id);
        if (duelo) duelo.rivalSalio(id);
    }
    // Duelo donde están los dos (duelo 2J, PR 2): se juega sobre la mejor superficie que lleve alguno (la mesa de duelo,
    // un tronco o el piso); los dos se sientan frente a frente entre donde estaban
    const TRONCOS = [B.TRONCO, B.TRONCO_ABEDUL, B.TRONCO_PINO];
    const superficiePropia = () => (inventario.contar(O.MESA_DUELO) > 0 ? 'mesa' : TRONCOS.some(id => inventario.contar(id) > 0) ? 'tronco' : 'piso');
    // Mesas de duelo colocadas en el mundo (PR 3): bloques que dibuja mesas-colocadas.js (con import() solo si hay alguna).
    // Quien reta o acepta junto a una juega en ella (lugar.mesaCerca metros)
    let mesasColocadas = null, cargandoMesas = null;
    const esMesaDuelo = id => id === B.MESA_DUELO || id === B.MESA_DUELO_Z;
    let esperaMesa = null; // la mesa donde esperas rival (PR 5, minado.usarMesaDuelo): { x, y, z, g }
    const mesaDeBloque = o => ({ x: o.x + 0.5, y: o.y - DY, z: o.z + 0.5, g: o.id === B.MESA_DUELO_Z ? Math.PI / 2 : 0 });
    const mismaMesa = (a, b) => !!(a && b && Math.abs(a.x - b.x) < 0.1 && Math.abs(a.z - b.z) < 0.1 && Math.abs(a.y - b.y) < 0.5);
    function cargarMesasColocadas() {
        if (!cargandoMesas) cargandoMesas = Promise.all([import('./mesas-colocadas.js'), import('./cartas-mesa-modelo.js'), cargarDatos('cartas-mesa')]).then(([MC, MM, datos]) => {
            if (!datosCartas) datosCartas = datos;
            let dc = null, Lc = null; // medidas de la mesa (MESA + JSON o lo último del Estudio), rehechas solo si cambian
            const medidas = () => { const d = window.__venjy?.datosMesa || datosCartas; if (d !== dc || !Lc) { dc = d; Lc = fusionar(MM.MESA, d); } return Lc; };
            mesasColocadas = MC.crearMesasColocadas({ grupo: vista.grupo, dy: DY, mundo, tinte: materiales.solido.color, medidas });
            mesasColocadas.cargar();
            return mesasColocadas;
        }).catch(err => { cargandoMesas = null; console.error('No se pudieron cargar las mesas de duelo', err); return null; });
        return cargandoMesas;
    }
    // Toda edición (tuya o del cooperativo) pasa por aquí: cargar() lee las ediciones ya guardadas, así que no hace falta cola
    mundo.alEditar = lista => {
        // Rompieron la mesa donde esperabas rival: dejas de esperar
        if (esperaMesa && duelo && duelo.fase === 'esperando' && lista.some(e => !esMesaDuelo(e[3]) && mismaMesa(esperaMesa, { x: e[0] + 0.5, y: e[1] - DY, z: e[2] + 0.5 }))) cancelarReto();
        if (mesasColocadas) mesasColocadas.editar(lista);
        else if (lista.some(e => esMesaDuelo(e[3]))) cargarMesasColocadas();
    };
    if (mundo.listaEdiciones().some(e => esMesaDuelo(e[3]))) cargarMesasColocadas();
    // La mesa colocada junto a ti, sin el modelo 3D (viaja en el mensaje de la actividad): { x, y, z, g } o null
    function mesaJuntoATi(D, R) {
        if (!mesasColocadas) return null;
        const m = D.mesaCercana(mesasColocadas.lista, { x: jugador.pos.x, y: jugador.pos.y - DY, z: jugador.pos.z }, R.mesaCerca ?? 3, R.desnivel ?? 1.5);
        return m ? { x: m.x, y: m.y, z: m.z, g: m.g } : null;
    }
    const colaJugadas = []; // jugadas del rival que llegan antes de que la mesa abra (la primera vez se carga con import())
    function cargarDuelo() {
        if (!coop) return Promise.resolve(null);
        if (!cargandoDuelo) cargandoDuelo = Promise.all([import('./cartas-duelo.js'), import('./cartas-coleccion.js'), import('./cartas-mesa-modelo.js'), cargarDatos('cartas-mesa')]).then(([D, K, MM, datos]) => {
            if (!datosCartas) datosCartas = datos;
            const L = () => window.__venjy?.datosMesa || datosCartas;
            duelo = D.crearDuelo({
                acts: actividades, yo: coop.yoId,
                reglas: () => D.reglasDuelo(L()),
                // Tu mazo, la superficie que llevas y dónde estás (y sin el desnivel del modo supervivencia, como los amigos)
                propio: () => ({ ...K.mazoParaPartida(inventario, L(), (Math.random() * 1e9) | 0), sup: superficiePropia(), x: jugador.pos.x, y: jugador.pos.y - DY, z: jugador.pos.z, mesa: mesaJuntoATi(D, duelo.lugar()) }),
                al: {
                    invitacion: inv => avisoReto(inv),
                    espera: id => mostrarEspera(id),
                    // La revancha empieza en la mesa ya abierta (mismo rival y lugar)
                    inicio: (e, rival, lugar, lado, otra) => { if (otra && mesaCartas && mesaCartas.rival) { colaJugadas.length = 0; mesaCartas.dueloOtra(e); } else empezarDueloLugar(e, rival, lugar, lado); },
                    jugada: (a, h) => { if (!mesaCartas || !mesaCartas.dueloJugada(a, h)) colaJugadas.push([a, h]); },
                    fin: motivo => mesaCartas && mesaCartas.dueloFin(motivo),
                    revancha: que => mesaCartas && mesaCartas.dueloRevancha(que),
                    // Mirar un duelo ajeno: la vista llega armada (y se rehace en la revancha); cada jugada ya viene aplicada
                    mirar: () => cargarMesaMirar().then(m => { const v = duelo.vista; if (m && v) m.mirar(v.lugar, v.e); }),
                    mirarJugada: ev => mesaMirar && mesaMirar.mirarJugada(ev),
                    mirarFin: () => mesaMirar && mesaMirar.dejarDeMirar(),
                    rechazo: motivo => {
                        const nombre = coop.nombreDe(espera ? espera.id : duelo.rival);
                        quitarEspera();
                        const R = duelo.textos.rechazo;
                        avisoDuelo(textoCartas(R[motivo] || R.cerrada).replace('{x}', nombre), 4);
                    }
                }
            });
            duelo.textos = D.TXT_RETO; duelo.espera = () => D.reglasDuelo(L()).espera;
            duelo.lugar = () => ({ ...MM.MESA.lugar, ...(L() && L().lugar) }); // distancia y desnivel para retar
            return duelo;
        }).catch(err => { cargandoDuelo = null; console.error('No se pudo cargar el duelo entre jugadores', err); return null; });
        return cargandoDuelo;
    }
    // Mirar desde afuera: cada segundo, el duelo ajeno más a mano (hasta lugar.mirar metros de su mesa o de uno de los que
    // juegan) se pide y se dibuja; al alejarte (un 25 % más) o al jugar tú, se deja. lugar.mirar = 0 lo apaga
    function revisarMirar() {
        if (!duelo) return;
        const max = duelo.lugar().mirar ?? 12, p = jugador.pos;
        if (!(max > 0) || duelo.fase !== 'libre') { if (duelo.mirando) duelo.dejarDeMirar(); return; }
        const dist = a => {
            const v = duelo.mirando === a.id ? duelo.vista : null;
            if (v && v.lugar) return Math.hypot(v.lugar.x - p.x, v.lugar.z - p.z);
            let d = Infinity;
            for (const id of a.jug) { const g = coop.remotos.get(id)?.modelo?.g; if (g && g.visible) d = Math.min(d, Math.hypot(g.position.x - p.x, g.position.z - p.z)); }
            return d;
        };
        const abiertos = duelo.duelosAbiertos();
        if (duelo.mirando) {
            const a = abiertos.find(a => a.id === duelo.mirando);
            if (!a || dist(a) > max * 1.25) duelo.dejarDeMirar();
            return;
        }
        const a = abiertos.find(a => dist(a) <= max);
        if (a) duelo.mirar(a.id);
    }
    if (coop) setInterval(revisarMirar, 1000);
    const persona = id => ({ id, nombre: coop.nombreDe(id) });
    const ocupadoParaDuelo = () => uiAbierta || vida.muerto || jefes.enCurso || (mesaCartas && mesaCartas.activo);
    // Empieza (los dos dentro, `ini` recibido): la mesa abre en el lugar, sobre su superficie
    function empezarDueloLugar(e, rival, lugar, lado) {
        quitarEspera();
        colaJugadas.length = 0;
        if (!lugar || ocupadoParaDuelo()) { duelo.salir(); return; }
        mostrar(null); // si estabas con el menú de pausa (Esc para cambiar de ventana), la mesa queda a la vista
        bloquearEscena(true);
        cargarMesaCartas().then(m => {
            if (!m || !m.abrirDuelo(lugar, lado, e, persona(rival))) { liberarEscena(); duelo.salir(); return; }
            for (const [a, h] of colaJugadas.splice(0)) m.dueloJugada(a, h);
        });
    }
    // Otro jugador de la sala en la mira (rayo desde la cámara; hasta `max` metros): { id, g, t } o null
    const dirMira = new THREE.Vector3();
    function jugadorEnLaMira(max) {
        if (!coop || !coop.remotos.size) return null;
        const o = camara.position; camara.getWorldDirection(dirMira);
        let mejor = null;
        for (const [id, r] of coop.remotos) {
            const g = r.modelo && r.modelo.g;
            if (!g || !g.visible) continue;
            const dx = g.position.x - o.x, dy = g.position.y + 1 - o.y, dz = g.position.z - o.z;
            const t = dx * dirMira.x + dy * dirMira.y + dz * dirMira.z;
            if (t <= 0 || t > max) continue;
            const lejos = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - t * t)); // distancia del cuerpo al rayo
            if (lejos < 0.8 && (!mejor || t < mejor.t)) mejor = { id, g, t };
        }
        return mejor;
    }
    // Clic derecho con el MAZO apuntando a otro jugador: lo retas ahí mismo (después del tutorial de Lucho).
    // true = había alguien en la mira (el clic no abre el armado del mazo)
    function retarApuntado() {
        if (!coop || uiAbierta) return false;
        const o = jugadorEnLaMira(16);
        if (!o) return false;
        retarA(o);
        return true;
    }
    // /cartas retar (prueba): el jugador de la sala más cercano, sin apuntarle; false = no hay nadie
    function retarCercano() {
        if (!coop || uiAbierta) return false;
        let o = null, dm = Infinity;
        for (const [id, r] of coop.remotos) {
            const g = r.modelo && r.modelo.g;
            if (!g || !g.visible) continue;
            const d = Math.hypot(g.position.x - jugador.pos.x, g.position.z - jugador.pos.z);
            if (d < dm) { dm = d; o = { id, g }; }
        }
        if (o) retarA(o);
        return !!o;
    }
    function retarA(o) {
        const nombre = coop.nombreDe(o.id);
        cargarDuelo().then(d => {
            if (!d || espera || reto || d.fase !== 'libre') return;
            const T = d.textos, R = d.lugar();
            if (!tutoCartasVisto()) { avisoDuelo(textoCartas(T.sinTuto), 4); return; }
            const dh = Math.hypot(o.g.position.x - jugador.pos.x, o.g.position.z - jugador.pos.z);
            if (dh > R.dist || Math.abs(o.g.position.y - jugador.pos.y) > R.desnivel) { avisoDuelo(textoCartas(T.lejos).replace('{x}', nombre), 4); return; }
            if (d.retar(o.id)) cargarMesaCartas(); // que la mesa esté lista cuando acepte
        });
    }
    // Avisos del duelo: una caja propia (no el HUD, que se oculta con el menú de pausa), así se leen aunque tengas
    // Esc puesto para cambiar de ventana. El título de la pestaña también avisa mientras te retan
    function avisoDuelo(texto, segundos = 4) {
        const el = document.createElement('div'); el.className = 'reto-aviso reto-breve';
        const p = document.createElement('p'); p.textContent = texto; el.appendChild(p);
        document.body.appendChild(el);
        setTimeout(() => el.remove(), segundos * 1000);
    }
    let tituloAntes = null;
    function tituloReto(texto) {
        if (texto) { if (tituloAntes === null) tituloAntes = document.title; document.title = texto; }
        else if (tituloAntes !== null) { document.title = tituloAntes; tituloAntes = null; }
    }
    // Mientras el otro responde: «Esperando a X…» con Cancelar (N o clic)
    let espera = null;
    function mostrarEspera(id, texto = null) {
        quitarEspera();
        const el = document.createElement('div'); el.className = 'reto-aviso';
        const p = document.createElement('p'); p.textContent = texto || textoCartas(duelo.textos.esperando).replace('{x}', coop.nombreDe(id));
        const b = document.createElement('button'); b.type = 'button'; b.className = 'boton'; b.textContent = textoCartas(duelo.textos.cancelar);
        b.addEventListener('click', ev => { ev.stopPropagation(); cancelarReto(); });
        el.append(p, b); document.body.appendChild(el);
        espera = { id, el };
    }
    function quitarEspera() { if (espera) { espera.el.remove(); espera = null; } esperaMesa = null; }
    // Mesa de duelo colocada (PR 5): clic derecho en ella. Si alguien espera ahí, te sientas enfrente y empieza el duelo;
    // si no, te quedas esperando rival (otro clic derecho o N = dejar de esperar). Sin sala es solo un mueble
    minado.usarMesaDuelo = o => {
        if (!coop || !coop.remotos.size) { avisoDuelo(textoCartas({ es: 'Para jugar en la mesa hace falta una sala con otro jugador', en: 'You need a room with another player to play at the table' }), 4); return true; }
        const m = mesaDeBloque(o);
        cargarDuelo().then(d => {
            if (!d) return;
            const T = d.textos;
            if (d.fase === 'esperando') { if (mismaMesa(esperaMesa, m)) cancelarReto(); return; }
            if (d.fase !== 'libre' || espera || reto || ocupadoParaDuelo()) return;
            if (!tutoCartasVisto()) { avisoDuelo(textoCartas(T.sinTuto), 4); return; }
            if (inventario.contar(O.MAZO) < 1) { avisoDuelo(textoCartas(T.faltaMazo), 4); return; }
            const act = d.mesasEsperando().find(a => mismaMesa(a.d[a.jug[0]].mesa, m));
            if (act) { if (d.unirse(act)) cargarMesaCartas(); return; }
            if (d.duelosAbiertos().some(a => a.jug.some(j => mismaMesa(a.d[j] && a.d[j].mesa, m)))) { avisoDuelo(textoCartas(T.rechazo.cerrada), 3); return; } // ya juegan ahí
            if (d.esperar(m)) { mostrarEspera(null, textoCartas(T.esperandoMesa)); esperaMesa = m; cargarMesaCartas(); }
        });
        return true;
    };
    // Cada segundo: si esperas y te alejas de la mesa, dejas de esperar; si alguien espera cerca de ti, te avisa una vez
    const avisadasMesa = new Set();
    function revisarMesas() {
        if (!duelo) return;
        const R = duelo.lugar(), p = jugador.pos, lejos = (R.mesaCerca ?? 3) * 2 + 2;
        if (duelo.fase === 'esperando' && esperaMesa && Math.hypot(esperaMesa.x - p.x, esperaMesa.z - p.z) > lejos) {
            cancelarReto(); avisoDuelo(textoCartas(duelo.textos.lejosMesa), 4); return;
        }
        if (duelo.fase !== 'libre') return;
        for (const a of duelo.mesasEsperando()) {
            const m = a.d[a.jug[0]].mesa;
            if (!m || avisadasMesa.has(a.id) || Math.hypot(m.x - p.x, m.z - p.z) > (R.mirar ?? 12)) continue;
            avisadasMesa.add(a.id);
            avisoDuelo(textoCartas(duelo.textos.esperaEn).replace('{x}', coop.nombreDe(a.jug[0])), 5);
        }
        for (const k of avisadasMesa) if (!duelo.mesasEsperando().some(a => a.id === k)) avisadasMesa.delete(k);
    }
    if (coop) setInterval(revisarMesas, 1000);
    function cancelarReto() { if (!espera) return; quitarEspera(); duelo.salir(); }
    // Aviso «X te reta»: Aceptar (Y o clic) entra al duelo con tu mazo (la mesa abre donde están cuando llega `ini`);
    // No (N) lo rechaza. Sin el tutorial de Lucho o sin MAZO se rechaza solo, con el motivo
    let reto = null;
    function avisoReto(inv) {
        if (!duelo) return;
        const T = duelo.textos, quien = coop.nombreDe(inv.de);
        if (reto || espera) { duelo.rechazar(inv, 'ocupado'); return; } // ya tienes uno a la vista
        if (!tutoCartasVisto()) { duelo.rechazar(inv, 'sinTuto'); avisoDuelo(`${textoCartas(T.titulo).replace('{x}', quien)}: ${textoCartas(T.sinTuto)}`, 5); return; }
        if (inventario.contar(O.MAZO) < 1) { duelo.rechazar(inv, 'faltaMazo'); avisoDuelo(`${textoCartas(T.titulo).replace('{x}', quien)}: ${textoCartas(T.faltaMazo)}`, 5); return; }
        const el = document.createElement('div');
        el.className = 'reto-aviso';
        const p = document.createElement('p'); p.textContent = textoCartas(T.titulo).replace('{x}', quien);
        const boton = (texto, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'boton'; b.textContent = texto; b.addEventListener('click', ev => { ev.stopPropagation(); fn(); }); return b; };
        el.append(p, boton(textoCartas(T.si), () => responderReto(true)), boton(textoCartas(T.no), () => responderReto(false)));
        document.body.appendChild(el);
        tituloReto(p.textContent);
        const s = duelo.espera();
        reto = { inv, el, timer: s > 0 ? setTimeout(() => responderReto(false), s * 1000) : null };
    }
    function responderReto(si) {
        if (!reto) return;
        const { inv, el, timer } = reto;
        reto = null; el.remove(); if (timer) clearTimeout(timer); tituloReto(null);
        if (!si) { duelo.rechazar(inv); return; }
        const T = duelo.textos;
        if (inventario.contar(O.MAZO) < 1) { duelo.rechazar(inv, 'faltaMazo'); avisoDuelo(textoCartas(T.faltaMazo), 4); return; }
        if (ocupadoParaDuelo()) { duelo.rechazar(inv, 'ocupado'); avisoDuelo(textoCartas(T.ocupado), 4); return; }
        // Te alejaste después del reto: el lugar quedaría lejos de los dos
        const r = coop.remotos.get(inv.de), R = duelo.lugar();
        if (r && r.modelo && Math.hypot(r.modelo.g.position.x - jugador.pos.x, r.modelo.g.position.z - jugador.pos.z) > R.dist * 2) {
            duelo.rechazar(inv, 'lejos'); avisoDuelo(textoCartas(T.lejos).replace('{x}', coop.nombreDe(inv.de)), 4); return;
        }
        if (duelo.aceptar(inv)) cargarMesaCartas();
    }
    document.addEventListener('keydown', ev => {
        if ((!reto && !espera) || ev.repeat) return;
        if (reto && ev.code === 'KeyY') { ev.preventDefault(); responderReto(true); }
        else if (ev.code === 'KeyN') { ev.preventDefault(); if (reto) responderReto(false); else cancelarReto(); }
    });
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
    // Con espacio se guarda directo; con MAX_MUNDOS se abre el panel «Tus mundos están llenos» (7a · 26):
    // reemplazar uno (con confirmación), descargarlo antes o bajar la copia como archivo sin tocar la base.
    // `origen` es el panel al que se vuelve ('pausa' o 'coop-fin'); `alGuardar` corre cuando la copia quedó guardada.
    const almacen = { listar: listarMundos, guardar: guardarMundo, borrar: borrarMundo };
    async function guardarCopia(origen = 'pausa', alGuardar = null) {
        try {
            const copia = { ...estadoActual(), id: nuevoId(), nombre: tx().copia(guardado.nombre || tx().mundo).slice(0, 24), creado: Date.now(), idDueno: miDisp };
            const r = await guardarCopiaConTope(almacen, copia, { abiertoId: invitado ? null : guardado.id });
            if (r.ok) { hud.mensaje(tx().copiaGuardada, 3); alGuardar && alGuardar(); return true; }
            abrirPanelCopia(copia, r.lista, origen, alGuardar);
            return false;
        } catch (err) { console.error(err); alert(tx().errorGuardar); return false; }
    }
    function abrirPanelCopia(copia, lista, origen, alGuardar) {
        const abiertoId = invitado ? null : guardado.id;
        const fecha = ms => new Date(ms).toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
        $('copia-titulo').textContent = tx().copiaTitulo;
        $('copia-nota').textContent = tx().copiaNotaLlena;
        $('copia-seguir').hidden = true;
        $('copia-archivo').hidden = false;
        const ul = $('copia-lista');
        ul.hidden = false;
        ul.textContent = '';
        const guardada = r => {
            alGuardar && alGuardar();
            ul.hidden = true;
            $('copia-archivo').hidden = true;
            $('copia-titulo').textContent = tx().copiaGuardadaTitulo;
            $('copia-nota').textContent = tx().copiaNotaGuardada(copia.nombre) + (r.errorBorrar ? ' ' + tx().errorBorrarCopia : '');
            $('copia-seguir').hidden = false;
            $('copia-seguir').onclick = async () => {
                try { sessionStorage.setItem('venjy-seguir', copia.id); } catch (e) { /* sin almacenamiento */ }
                if (coop) await coop.salir().catch(() => {});
                location.reload();
            };
            hud.mensaje(tx().copiaGuardada, 3);
        };
        for (const m of lista) {
            const li = document.createElement('li');
            li.className = 'tarjeta-mundo';
            const info = document.createElement('div');
            info.className = 'info-mundo';
            const n = document.createElement('b'); n.textContent = m.nombre;
            const d = document.createElement('span');
            d.textContent = [tx().dia(m.dias + 1), fecha(m.actualizado)].join(' · ');
            info.append(n, d);
            const botones = document.createElement('div');
            botones.className = 'botones-mundo botones-copia';
            const br = boton(tx().reemplazar, async () => {
                if (!confirm(tx().borrarParaSiempre(m.nombre))) return;
                try {
                    const r = await guardarCopiaConTope(almacen, copia, { reemplazarId: m.id, abiertoId });
                    if (r.ok) guardada(r);
                } catch (err) { console.error(err); alert(tx().errorGuardar); }
            }, 'secundario peligro');
            if (m.id === abiertoId) { br.disabled = true; br.title = tx().mundoAbierto; }
            const bd = boton(tx().descargarAntes, () => exportarMundo(m.id).catch(err => alert(err.message)), 'secundario');
            botones.append(br, bd);
            li.append(info, botones);
            ul.appendChild(li);
        }
        $('copia-archivo').onclick = async () => {
            try { await descargarMundo(copia); hud.mensaje(tx().copiaDescargada, 3); alGuardar && alGuardar(); } catch (err) { console.error(err); alert(err.message); }
        };
        $('copia-volver').onclick = () => mostrar(origen);
        mostrar('copia-llena');
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
    // Ruleta de gestos (7c-2): B o el botón GESTOS; el cuerpo queda congelado y la cámara orbita
    ruleta = crearRuleta({
        jugador, camaras, vida, hud, idioma, tactil, coop: () => coop,
        puede: () => jugador.activo && !uiAbierta && !vida.muerto && !camaras.enCine && !jefes.enCurso && !ronda.activa && !minijuegos.activo,
        otroManda: () => uiAbierta
    });
    camaras.congelado = ruleta.congelado;

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
        // L cambia el idioma jugando o en la pausa (no mientras se escribe en un campo)
        if (e.code === 'KeyL' && !e.repeat && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '') && !(consola && consola.abierta) && $('inicio').hidden) { e.preventDefault(); idiomaConL(); }
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
    $('coop-ms').checked = verMs;
    $('coop-ms').addEventListener('change', e => {
        verMs = e.target.checked;
        try { localStorage.setItem(CLAVE_MS, verMs ? '1' : '0'); } catch (err) { /* sin almacenamiento */ }
        pintarPing();
    });
    $('coop-copia').addEventListener('click', () => guardarCopia('pausa'));
    $('coop-fin-copia').addEventListener('click', () => guardarCopia('coop-fin', () => { $('coop-fin-copia').disabled = true; }));
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

    // ---- Hora del mundo (7j-0): HUD opcional, línea de la pausa y objeto Reloj en la mano ----
    const horaEl = $('hora'), relojManoEl = $('reloj-mano'), pausaHoraEl = $('pausa-hora');
    let horaPintada = '';
    function pintarHora(fuerza = false) {
        const h = textoHora(dia.t), clave = h + '|' + dia.dias + '|' + idioma + '|' + (ajustes.hora ? 1 : 0) + '|' + inventario.idEnMano() + '|' + (inventario.mano2 ? inventario.mano2.id : 0);
        if (!fuerza && clave === horaPintada) return;
        horaPintada = clave;
        horaEl.hidden = !ajustes.hora;
        if (ajustes.hora) horaEl.textContent = h;
        const enMano = inventario.idEnMano() === O.RELOJ || (inventario.mano2 && inventario.mano2.id === O.RELOJ); // en cualquiera de las dos manos
        relojManoEl.hidden = !enMano;
        if (enMano) relojManoEl.textContent = textoDiaHora(dia.dias, dia.t, idioma);
        pausaHoraEl.textContent = textoDiaHora(dia.dias, dia.t, idioma);
    }

    // Ajustes de la pausa
    function sincronizarAjustes() {
        $('aj-distancia').value = ajustes.distancia; $('aj-distancia-v').textContent = ajustes.distancia;
        $('aj-fov').value = ajustes.fov; $('aj-fov-v').textContent = ajustes.fov;
        $('aj-sens').value = ajustes.sens; $('aj-sens-v').textContent = ajustes.sens;
        $('aj-sonido').checked = !mundoSilenciado();
        $('aj-musica').checked = musica.encendida;
        $('aj-idioma').checked = idioma === 'es'; $('aj-idioma-en').checked = idioma === 'en';
        $('aj-hora').checked = !!ajustes.hora;
        sincronizarRend();
        pintarHora(true);
    }
    $('aj-distancia').addEventListener('input', e => {
        ajustes.distancia = Number(e.target.value);
        fijarDistancia(ajustes.distancia); auto.reiniciar();
        guardarAjustes(); sincronizarRend();
    });
    $('aj-fov').addEventListener('input', e => { ajustes.fov = Number(e.target.value); $('aj-fov-v').textContent = ajustes.fov; camara.fov = ajustes.fov; camara.updateProjectionMatrix(); guardarAjustes(); });
    $('aj-sens').addEventListener('input', e => { ajustes.sens = Number(e.target.value); $('aj-sens-v').textContent = ajustes.sens; jugador.sensibilidad = ajustes.sens / 10000; guardarAjustes(); });
    $('aj-sonido').addEventListener('change', e => silenciarMundo(!e.target.checked));
    $('aj-musica').addEventListener('change', e => musica.encender(e.target.checked));
    // Idioma: el texto de la página se arma al cargar, así que al cambiar se guarda la elección y se recarga
    // volviendo al mismo mundo (venjy-seguir). En la partida en grupo no: recargar cortaría la sala
    let cambiandoIdioma = false;
    const cambiarIdioma = nuevo => {
        if (nuevo === idioma || cambiandoIdioma) return;
        if (coop) { hud.mensaje(tx().idiomaCoop, 3); $('aj-idioma').checked = idioma === 'es'; $('aj-idioma-en').checked = idioma === 'en'; return; }
        cambiandoIdioma = true;
        try { localStorage.setItem('preferredLanguage', nuevo); sessionStorage.setItem('venjy-seguir', guardado.id); } catch (e) { /* sin almacenamiento */ }
        guardarYa().then(() => { const u = new URL(location.href); u.searchParams.delete('lang'); location.href = u.href; });
    };
    // Antes de recargar se avisa: L pide una segunda pulsación (4 s) y los radios, confirmar
    let idiomaPedido = 0;
    const idiomaConL = () => {
        if (coop) { cambiarIdioma(idioma === 'es' ? 'en' : 'es'); return; }
        if (!jugador.activo) { idiomaConRadio(idioma === 'es' ? 'en' : 'es'); return; } // en la pausa la HUD no se ve: se confirma
        if (performance.now() - idiomaPedido < 4000) { cambiarIdioma(idioma === 'es' ? 'en' : 'es'); return; }
        idiomaPedido = performance.now();
        hud.mensaje(tx().idiomaOtraVez, 4);
    };
    const idiomaConRadio = nuevo => {
        if (nuevo === idioma) return;
        if (coop || confirm(tx().idiomaPregunta)) cambiarIdioma(nuevo);
        else { $('aj-idioma').checked = idioma === 'es'; $('aj-idioma-en').checked = idioma === 'en'; }
    };
    $('aj-idioma').addEventListener('change', e => { if (e.target.checked) idiomaConRadio('es'); });
    $('aj-idioma-en').addEventListener('change', e => { if (e.target.checked) idiomaConRadio('en'); });
    $('aj-hora').addEventListener('change', e => { ajustes.hora = e.target.checked; guardarAjustes(); pintarHora(true); });


    // ---- Menú «Rendimiento» (7b-2) ----
    const limitador = new LimitadorFps(rend.limite);
    const auto = new AutoDistancia();
    const cuadrosMs = new Cuadros(120);
    const fpsEl = $('fps'), coordsEl = $('coords');
    // Distancia efectiva: `ajustes.distancia` es el máximo elegido; la automática puede bajarla
    function fijarDistancia(n) {
        mundo.distancia = n; mundo.ultimo = null;
        const b = n * CHUNK; scene.fog.near = b * 0.55; scene.fog.far = b * 0.95;
        $('aj-distancia-v').textContent = n === ajustes.distancia ? n : `${n}/${ajustes.distancia}`;
    }
    function aplicarRend() {
        renderer.setPixelRatio(rend.escala);
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        LOD.salto = rend.lejos; LOD.animales = rend.lejos;
        particulas.factor = FACTOR_PARTICULAS[rend.particulas];
        cielo.mostrarNubes(rend.nubes);
        limitador.fijar(rend.limite);
        auto.reiniciar();
        fijarDistancia(ajustes.distancia);
        fpsEl.style.display = rend.fps || rend.ms ? '' : 'none';
    }
    const rendEl = $('rendimiento');
    const marcarGrupo = (grupo, valor) => {
        for (const b of rendEl.querySelectorAll(`[data-rend="${grupo}"] button`)) {
            const on = b.dataset.v === String(valor);
            b.classList.toggle('activo', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
    };
    function sincronizarRend() {
        const p = presetDe({ ...rend, distancia: ajustes.distancia }, DPR);
        marcarGrupo('preset', p);
        $('rend-personalizado').hidden = p !== 'personalizado';
        $('rend-escala').value = rend.escala; $('rend-escala-v').textContent = '×' + rend.escala.toFixed(2);
        marcarGrupo('particulas', rend.particulas);
        marcarGrupo('lejos', rend.lejos);
        marcarGrupo('limite', rend.limite);
        $('rend-nubes').checked = rend.nubes; $('rend-auto').checked = rend.auto;
        $('rend-fps').checked = rend.fps; $('rend-ms').checked = rend.ms;
    }
    const cambioRend = () => { guardarRend(); aplicarRend(); sincronizarRend(); };
    rendEl.addEventListener('click', e => {
        const b = e.target.closest('button[data-v]');
        if (!b) return;
        const g = b.parentElement.dataset.rend, v = b.dataset.v;
        if (g === 'preset') { aplicarPreset(rend, v, DPR); ajustes.distancia = rend.distancia; guardarAjustes(); $('aj-distancia').value = ajustes.distancia; }
        else if (g === 'particulas') rend.particulas = v;
        else if (g === 'lejos') rend.lejos = +v;
        else if (g === 'limite') rend.limite = +v;
        cambioRend();
    });
    $('rend-escala').min = ESCALA_REND.min; $('rend-escala').max = ESCALA_REND.max; $('rend-escala').step = ESCALA_REND.paso;
    $('rend-escala').addEventListener('input', e => { rend.escala = +(+e.target.value).toFixed(2); cambioRend(); });
    $('rend-nubes').addEventListener('change', e => { rend.nubes = e.target.checked; cambioRend(); });
    $('rend-auto').addEventListener('change', e => { rend.auto = e.target.checked; cambioRend(); });
    $('rend-fps').addEventListener('change', e => { rend.fps = e.target.checked; cambioRend(); });
    $('rend-ms').addEventListener('change', e => { rend.ms = e.target.checked; cambioRend(); });
    aplicarRend();
    sincronizarRend();

    // ---- Depuración ----
    window.__venjy = {
        datos, terreno, mundo, jugador, camara, renderer, scene, cielo, inventario, vida, dia, entidades, contenedores, agricultura, minado, hud, ventanas,
        gatas, animales, npcs, amigos, venjys, minimapa, vidaAmigos, guardarYa, estadoActual,
        particulas, ganado, enemigos, proyectiles, combate, pesca, mano, misiones, facilidades, jefes, final, camaras, ponerSkin, musica, consola, recorrido, escenas, caricias, escenasGatas, escenaCuello, ronda, minijuegos, ruleta,
        get coop() { return coop; }, cofresComp, guardian: escenaGuardian,
        // Animaciones de amistad (bloque 6b): se cargan al usarse; cargarAmistad() las trae para depurar
        get amistadEscena() { return escenaAmistad; }, cargarAmistad: () => cargarEscenaAmistad(),
        // Mesa del duelo (7h-2b): abrirMesa('facil'|'medio'|'tutorial') sin pedir el mazo; mesaCartas, para pruebas y el Estudio
        get mesaCartas() { return mesaCartas; }, abrirMesa: n => abrirMesaCartas(n),
        // Actividades compartidas (7g-1) y duelo entre jugadores: lista de actividades, controlador del duelo
        get actividades() { return actividades; }, get duelo() { return duelo; },
        // Carrera de gatas (7h-1): cargarCarrera().then(k => k.elegir('mila', 'normal')); carrera.saltarIntro(), carrera.saltarA(3)
        get carrera() { return carrera; }, cargarCarrera: () => cargarCarrera(),
        // Abrir un sobre de prueba (Estudio → Mesa, «Probar el sobre»): la escena de cartas-sobre.js sin cobrar ni sumar cartas
        probarSobre: () => Promise.all([import('./cartas-sobre.js'), import('./cartas-tienda.js'), cargarDatos('cartas-mesa')]).then(([s, t, d]) => {
            const D = window.__venjy?.datosMesa || d;
            const el = s.escenaSobre({ cartas: t.sacarSobre({}, D), col: {}, datos: { ...D, sobreAnim: { ...(D && D.sobreAnim), activa: 1 } }, idioma, alTerminar: () => cerrarPanel() });
            if (el) abrirPanel(el);
        }),
        dar(id, n = 1) { return inventario.agregar(id, n); },
        O, B, nombreDe
    };

    // ---- Bucle ----
    await cerrarCarga();
    mostrar(null);
    ocultarCarga();
    $('hud').hidden = false;
    if (vida.muerto) { $('causa-muerte').textContent = ''; mostrar('muerte'); }
    entrar();

    let anterior = performance.now(), cuadros = 0, acumulado = 0, relojAgua = 0, cuadroAgua = 0, fovCorrer = 0;
    function bucle(ahora) {
        requestAnimationFrame(bucle);
        if (!limitador.toca(ahora)) return; // límite de FPS (7b-2): el tiempo se acumula en el próximo cuadro
        const tBucle = performance.now();
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
            if (facilidades) facilidades.actualizar(dt);
            if (caminosCarteles) caminosCarteles.actualizar(dt);
            if (cuaderno) cuaderno.actualizar(dt);
            if (fauna) fauna.actualizar(dt);
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
        if (carrera) carrera.actualizar(corre ? dt : 0);
        if (escenaAmistad) escenaAmistad.actualizar(corre ? dt : 0);
        if (mesaCartas) mesaCartas.actualizar(corre ? dt : 0);
        if (mesaMirar) mesaMirar.actualizar(corre ? dt : 0);
        if (mesasColocadas) mesasColocadas.actualizar();
        ruleta.actualizar(corre ? dt : 0);
        camaras.actualizar(dt);
        // Correr (7c-1): en primera persona el campo de visión sube un 10 % suave, como en Minecraft
        {
            const k = camaras.vista === 0 && !camaras.enCine && corre ? mano.correr : 0;
            fovCorrer += (k - fovCorrer) * Math.min(1, dt * 8);
            const fov = ajustes.fov * (1 + 0.1 * fovCorrer);
            if (Math.abs(camara.fov - fov) > 0.01) { camara.fov = fov; camara.updateProjectionMatrix(); }
        }
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
        vidaAmigos.actualizar(dtC);
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
        if (!(carrera && carrera.dibuja(renderer))) { // la carrera de gatas se dibuja en lugar del mundo
            renderer.render(scene, camara);
            if (mesaCartas) mesaCartas.dibujar(); // la mesa de cartas: vista de arriba (3.ª persona) y tu mano
            if (!vida.muerto && !uiAbierta && camaras.vista === 0 && !camaras.enCine && !camaras.enOrbita) mano.dibujar();
        }
        const msCuadro = performance.now() - tBucle;
        cuadrosMs.agregar(msCuadro);
        if (medicion.activa && medicion.cuadros) medicion.cuadros.push(msCuadro); // /medir romper

        pintarHora(); // barato: solo escribe al cambiar el minuto, el día, el idioma o la mano
        cuadros++; acumulado += dt;
        if (acumulado >= 0.5) {
            // Lugares descubiertos (7f-3): aviso al pasar cerca de uno, revisado cada ~0,5 s
            const lugares = terreno.lugares || [];
            for (const l of lugares) {
                if (misiones.estado.lugares.has(l.clave) || Math.hypot(jugador.pos.x - l.x, jugador.pos.z - l.z) > l.radio) continue;
                misiones.estado.lugares.add(l.clave);
                const n = lugares.filter(q => misiones.estado.lugares.has(q.clave)).length;
                avisarLugar({ nombre: l.nombre[idioma] || l.nombre.es, n, total: lugares.length, idioma });
            }
            const fps = cuadros / acumulado;
            fpsEl.textContent = [rend.fps ? Math.round(fps) + ' FPS' : '', rend.ms ? cuadrosMs.mediana.toFixed(1) + ' ms' : ''].filter(Boolean).join(' · ');
            if (rend.auto) {
                const nueva = auto.paso(fps, acumulado, { activo: jugador.activo, cargando: mundo.cola.length > 0, actual: mundo.distancia, max: ajustes.distancia, objetivo: rend.limite || 60 });
                if (nueva !== null) fijarDistancia(nueva);
            }
            cuadros = 0; acumulado = 0;
            coordsEl.textContent = `X ${jugador.pos.x.toFixed(1)}  Y ${jugador.pos.y.toFixed(1)}  Z ${jugador.pos.z.toFixed(1)}`;
        }
    }
    requestAnimationFrame(bucle);
}

// «Seguir jugando esta copia» (7a · 26): tras salir de la sala se abre el mundo recién guardado
let seguir = null;
try { seguir = sessionStorage.getItem('venjy-seguir'); sessionStorage.removeItem('venjy-seguir'); } catch (e) { /* sin almacenamiento */ }
// Con ?estudio (el puente abre el mundo «Estudio» por el menú) se salta la pantalla de título
const sinTitulo = new URLSearchParams(location.search).has('estudio');
if (seguir) jugar(seguir).catch(() => pintarMenu()); else if (sinTitulo) pintarMenu();
else {
    pintarTitulo();
    // La presentación «Venjy presenta» se cierra cuando el fondo tiene su primer plano (o no hay fondo)
    iniciarFondo().catch(err => console.error('[fondo]', err)).finally(() => presentacion.listo());
}
