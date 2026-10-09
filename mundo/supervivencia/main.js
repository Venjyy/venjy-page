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
import { crearEditorSkin, cargarSkin, coloresMano, BASES } from './skin.js';
import { crearCamaras } from './camaras.js';
import { crearEscenasSkin } from './escenas-skin.js';
import { crearCaricias } from './caricias.js';
import { crearEscenaCuello } from './escena-cuello.js';
import { crearRondaIglu } from './ronda-iglu.js';
import { crearMusica } from './musica.js';
import { crearConsola } from './consola.js';
import { crearRecorridoEscenas } from './recorrido-escenas.js';
import { rayoCaja } from '../fisica.js';
import { lanzarRayo } from '../rayo.js';

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
        completado: 'Completado', jugado: m => `${m} min jugados`, clicSeguir: 'Haz clic para seguir jugando'
    },
    en: {
        dificultades: ['Peaceful', 'Easy', 'Normal', 'Hard'], jugar: 'Play', exportar: 'Export', borrar: 'Delete',
        confirmarBorrar: n => `Delete "${n}" forever? This can't be undone.`, vacio: "You don't have any worlds yet.",
        dia: n => `Day ${n}`, lleno: `You have ${MAX_MUNDOS} worlds: delete one to create another.`, mundo: 'My world',
        generando: 'Generating the world…', guardado: 'Game saved', importado: 'World imported', errorGuardar: "Couldn't save the game",
        noDormir: 'You can only sleep at night', monstruos: 'You may not rest now; there are monsters nearby', durmiendo: 'Sleeping…', spawn: 'Respawn point set',
        muerteCausa: c => (CAUSAS[c] || CAUSAS.golpe).en, sinAlmacen: "This browser can't save games (private mode).",
        completado: 'Completed', jugado: m => `${m} min played`, clicSeguir: 'Click to keep playing'
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
const pantallas = ['menu-mundos', 'crear-mundo', 'pausa', 'muerte', 'pantalla-skin'];
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
}

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
function iniciarJuego(guardado) {
    if (enJuego) return;
    enJuego = true;
    mostrar('menu-mundos');
    $('lista-mundos').hidden = true;
    for (const id of ['nuevo-mundo', 'importar']) $(id).hidden = true;
    $('carga').hidden = false;
    $('carga').textContent = tx().generando;
    setTimeout(() => arrancar(guardado).catch(err => { console.error(err); $('carga').textContent = 'Error: ' + err.message; }), 30);
}

async function arrancar(guardado) {
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
    const objetivosTodos = (x, z, r) => [...(enemigos ? enemigos.objetivos(x, z, r) : []), ...ganado.objetivos(x, z, r), ...(jefes ? jefes.objetivos(x, z, r) : [])];
    const proyectiles = crearProyectiles({ scene, mundo, jugador, inventario, vida, objetivos: objetivosTodos });
    // Zonas seguras: alrededor de cada amigo y de Venjy no aparecen ni entran monstruos
    const zonasSeguras = () => [...npcs.lista, ...amigos.lista, ...venjys.lista].map(n => ({ x: n.x, z: n.z, radio: 16 }));
    enemigos = crearEnemigos({
        scene, mundo, jugador, vida, dia, entidades, proyectiles, terreno, datos, zonasSeguras, contenedores, particulas, objetivosTodos,
        dificultad: () => vida.dificultad, hud, tinteMundo: materiales.solido.color,
        aturdir: s => { vida.aturdido = Math.max(vida.aturdido, s); },
        alMorirMob: (tipo, e) => { if (e.porJugador && misiones) misiones.alMatar(tipo); }
    });
    const minado = crearMinado({ scene, camara, mundo, jugador, inventario, entidades, contenedores, agricultura, vida, ventanas, hud, idioma });
    const combate = crearCombate({ camara, mundo, jugador, inventario, vida, proyectiles, particulas, hud, objetivos: objetivosTodos, idioma });
    const pesca = crearPesca({ scene, camara, mundo, jugador, inventario, entidades, particulas });
    minado.alClicIzquierdo = () => combate.atacar();
    // Misiones y jefes
    misiones = crearMisiones({
        grupo: vista.grupo, dy: DY, jugador, camara, inventario, entidades, vida, dia, hud, terreno, npcs, amigos, venjys, idioma, abrirPanel, cerrarPanel,
        jefeEnCurso: () => jefes && jefes.enCurso,
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
    // Caricias a las gatas: tecla G (o el botón ACARICIAR) junto a Mila o Gala
    const caricias = crearCaricias({
        grupo: vista.grupo, dy: DY, mundo, jugador, camaras, gatas, hud, misiones, idioma,
        puede: () => jugador.activo && !uiAbierta && !vida.muerto && !jefes.enCurso,
        bloquear: bloquearEscena,
        liberar: liberarEscena
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
    const recorrido = crearRecorridoEscenas({ dy: DY, jugador, mundo, gatas, escenas, escenaCuello, caricias, misiones, hud, skin: () => skinActual, bloquear: bloquearEscena, idioma });
    // Consola de comandos (T o /): /fly, /dia, /noche, /ayuda, /escenas, /escena <nombre>
    const consola = crearConsola({
        jugador, dia, hud, idioma,
        extra: {
            '/escenas': { fn: () => recorrido.comando(''), ayuda: { es: '/escenas (todas, con skin de Venjy)', en: '/escenas (all, with the Venjy skin)' } },
            '/escena': { fn: n => recorrido.comando(n), ayuda: { es: '/escena <nombre> (una)', en: '/escena <name> (one)' } }
        },
        alAbrir: () => { uiAbierta = true; jugador.teclas.clear(); if (tactil) tactil.desactivar(); else if (document.pointerLockElement) document.exitPointerLock(); },
        alCerrar: () => { uiAbierta = false; if (!vida.muerto) entrar(); }
    });
    minado.dormir = (x, y, z) => {
        if (!dia.puedeDormir) return tx().noDormir;
        if (enemigos.cerca(jugador.pos.x, jugador.pos.y, jugador.pos.z)) return tx().monstruos;
        misiones.alDormir();
        spawnCama = { x: x + 0.5, y: y + 1, z: z + 0.5 };
        const negro = document.createElement('div');
        negro.className = 'fundido-sueno';
        document.body.appendChild(negro);
        hud.mensaje(tx().durmiendo, 2);
        setTimeout(() => { dia.amanecer(); hud.mensaje(tx().spawn); }, 1300);
        setTimeout(() => negro.remove(), 2600);
        return null;
    };


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
            misiones: misiones.serializar()
        };
    }
    // Las escrituras van en cola y cada una toma el estado al ejecutarse: el guardado de una muerte
    // nunca se descarta por otro en curso (antes se perdía y se recargaba la partida previa)
    let escritura = Promise.resolve();
    function guardarYa(aviso = false) {
        escritura = escritura.then(async () => {
            try { await guardarMundo(estadoActual()); if (aviso) hud.mensaje(tx().guardado, 2); }
            catch (e) { console.error(e); if (aviso) hud.mensaje(tx().errorGuardar, 3); }
        });
        return escritura;
    }
    setInterval(() => { if (!vida.muerto) guardarYa(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) guardarYa(); });

    // ---- Entrada: puntero, pausa y teclas ----
    // Tras cerrar una ventana con Esc el navegador no deja volver a capturar el mouse al tiro: en vez de la
    // pausa se muestra un aviso y el siguiente clic vuelve al juego (Esc otra vez sí abre la pausa)
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
    function pedirPuntero() {
        const rechazo = () => {
            if (jugador.activo || uiAbierta || vida.muerto) return;
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
    $('salir-menu').addEventListener('click', async () => { await guardarYa(); location.reload(); });
    $('salir-muerte').addEventListener('click', async () => { await guardarYa(); location.reload(); });
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
        particulas, ganado, enemigos, proyectiles, combate, pesca, mano, misiones, jefes, final, camaras, ponerSkin, musica, consola, recorrido, escenas, caricias, escenaCuello, ronda,
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
        // En pausa (Esc) el mundo se detiene, como en Minecraft de un jugador; con el inventario abierto sigue
        const corre = (jugador.activo || uiAbierta) && !vida.muerto;
        if (corre) {
            jugado += dt;
            dia.actualizar(dt);
            jugador.lento = minado.lento * combate.lento * (vida.aturdido > 0 ? 0.45 : 1);
            jugador.actualizar(dt);
            vida.actualizar(dt);
            minado.actualizar(dt);
            entidades.actualizar(dt, camara);
            contenedores.actualizar(dt);
            agricultura.actualizar(dt);
            combate.actualizar(dt, minado.derecho);
            pesca.actualizar(dt);
            ganado.actualizar(dt);
            enemigos.actualizar(dt);
            jefes.actualizar(dt);
            proyectiles.actualizar(dt);
            particulas.actualizar(dt);
            mano.actualizar(dt);
        } else jugador.actualizar(0);
        escenas.actualizar(corre ? dt : 0);
        caricias.actualizar(corre ? dt : 0);
        escenaCuello.actualizar(corre ? dt : 0);
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
