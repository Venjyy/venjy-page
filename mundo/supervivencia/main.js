// =========================================================
// VENJY · Supervivencia
// El mapa del portafolio (horizontal) subido 48 bloques, con cuevas y menas debajo, para
// sobrevivir: romper y poner, inventario y crafteo, hambre, día y noche, cama, horno, cofres
// y cultivos. Los amigos y las gatas siguen en sus lugares.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { generarDatos } from '../mundo-datos.js';
import { crearAtlas, animarAgua, B } from '../texturas.js';
import { prepararTerreno, MundoVoxel, ESCALA, CHUNK, fijarAlto, ALTO_SUPERVIVENCIA, DESNIVEL_SUPERVIVENCIA, recalcularEmisores } from '../voxeles.js';
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
        noDormir: 'Solo puedes dormir de noche', durmiendo: 'Durmiendo…', spawn: 'Punto de reaparición fijado',
        muerteCausa: c => (CAUSAS[c] || CAUSAS.golpe).es, sinAlmacen: 'Este navegador no permite guardar partidas (modo privado).',
        completado: 'Completado', jugado: m => `${m} min jugados`
    },
    en: {
        dificultades: ['Peaceful', 'Easy', 'Normal', 'Hard'], jugar: 'Play', exportar: 'Export', borrar: 'Delete',
        confirmarBorrar: n => `Delete "${n}" forever? This can't be undone.`, vacio: "You don't have any worlds yet.",
        dia: n => `Day ${n}`, lleno: `You have ${MAX_MUNDOS} worlds: delete one to create another.`, mundo: 'My world',
        generando: 'Generating the world…', guardado: 'Game saved', importado: 'World imported', errorGuardar: "Couldn't save the game",
        noDormir: 'You can only sleep at night', durmiendo: 'Sleeping…', spawn: 'Respawn point set',
        muerteCausa: c => (CAUSAS[c] || CAUSAS.golpe).en, sinAlmacen: "This browser can't save games (private mode).",
        completado: 'Completed', jugado: m => `${m} min played`
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
const pantallas = ['menu-mundos', 'crear-mundo', 'pausa', 'muerte'];
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
    jugador.sensibilidad = ajustes.sens / 10000;

    const [sx, sz] = datos.P.spawn;
    const spawnMundo = { x: sx * ESCALA + 2.5, z: sz * ESCALA + 2.5 };
    spawnMundo.y = terreno.HT[Math.floor(spawnMundo.z) * terreno.BW + Math.floor(spawnMundo.x)] + DY + 1;
    const pj = guardado.jugador || { x: spawnMundo.x, y: spawnMundo.y, z: spawnMundo.z };
    mundo.planificar(pj.x, pj.z);
    const cercanos = mundo.cola.filter(c => c.d2 <= 4).length;
    while (mundo.chunks.size < cercanos) mundo.construir(40);
    mundo.iniciarWorkers('h', Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 2)));
    jugador.colocar(pj.x, pj.y, pj.z);
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
    let spawnCama = guardado.spawnCama || null;
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
    const ventanas = {
        get abierta() { return ventanasBase.abierta; },
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
        alMorir: causa => {
            for (const p of inventario.vaciar()) entidades.soltar(p.id, p.n, p.d, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
            ventanasBase.cerrar();
            $('causa-muerte').textContent = tx().muerteCausa(causa);
            if (tactil) tactil.desactivar(); else if (document.pointerLockElement) document.exitPointerLock();
            mostrar('muerte');
            guardarYa();
        }
    });
    vida.cargar(guardado.vida);
    jugador.vivo = true;

    const minado = crearMinado({ scene, camara, mundo, jugador, inventario, entidades, contenedores, agricultura, vida, ventanas, hud, idioma });
    minado.dormir = (x, y, z) => {
        if (!dia.puedeDormir) return tx().noDormir;
        spawnCama = { x: x + 0.5, y: y + 1, z: z + 0.5 };
        const negro = document.createElement('div');
        negro.className = 'fundido-sueno';
        document.body.appendChild(negro);
        hud.mensaje(tx().durmiendo, 2);
        setTimeout(() => { dia.amanecer(); hud.mensaje(tx().spawn); }, 1300);
        setTimeout(() => negro.remove(), 2600);
        return null;
    };

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

    // ---- Guardado ----
    function estadoActual() {
        return {
            id: guardado.id, nombre: guardado.nombre, dificultad: vida.dificultad, creado: guardado.creado || Date.now(),
            jugado: Math.round(jugado), dias: dia.dias, completado: !!guardado.completado,
            jugador: { x: +jugador.pos.x.toFixed(2), y: +jugador.pos.y.toFixed(2), z: +jugador.pos.z.toFixed(2), yaw: +jugador.yaw.toFixed(3), pitch: +jugador.pitch.toFixed(3) },
            spawnCama, vida: vida.serializar(), inventario: inventario.serializar(),
            ediciones: serializarEdiciones(terreno.ediciones), contenedores: contenedores.serializar(),
            agricultura: agricultura.serializar(), entidades: entidades.serializar(), dia: dia.serializar(),
            misiones: guardado.misiones || null
        };
    }
    let guardando = false;
    async function guardarYa(aviso = false) {
        if (guardando) return;
        guardando = true;
        try { await guardarMundo(estadoActual()); if (aviso) hud.mensaje(tx().guardado, 2); }
        catch (e) { console.error(e); if (aviso) hud.mensaje(tx().errorGuardar, 3); }
        guardando = false;
    }
    setInterval(() => { if (!vida.muerto) guardarYa(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) guardarYa(); });

    // ---- Entrada: puntero, pausa y teclas ----
    function pedirPuntero() {
        // Si el navegador lo rechaza (p. ej. tras cerrar el inventario con Esc), se muestra la pausa
        const rechazo = () => { if (!jugador.activo && !uiAbierta && !vida.muerto) alActivo(false); };
        try { const r = lienzo.requestPointerLock(); if (r && r.catch) r.catch(rechazo); } catch (e) { rechazo(); }
    }
    const alActivo = activo => {
        $('hud').hidden = !activo && !uiAbierta;
        if (activo) { mostrar(null); return; }
        if (uiAbierta || vida.muerto) return;
        mostrar('pausa');
        sincronizarAjustes();
        guardarYa();
    };
    jugador.alCambiarActivo = alActivo;
    const tactil = iniciarTactil(jugador, { alEntrar: alActivo });
    const entrar = () => (tactil ? tactil.activar() : pedirPuntero());
    if (tactil) iniciarTactilSupervivencia({ tactil, minado, ventanas, inventario, idioma });

    document.addEventListener('keydown', e => {
        if (e.code === 'KeyE' && !e.repeat) {
            if (ventanasBase.abierta) { ventanasBase.cerrar(true); e.preventDefault(); }
            else if (jugador.activo && !vida.muerto) { ventanas.abrir('inventario'); e.preventDefault(); }
        } else if (e.code === 'Escape' && ventanasBase.abierta) { ventanasBase.cerrar(true); e.preventDefault(); }
    });
    lienzo.addEventListener('click', () => { if (!jugador.activo && !uiAbierta && !vida.muerto && $('inicio').hidden) entrar(); });

    $('continuar').addEventListener('click', () => entrar());
    $('guardar').addEventListener('click', () => guardarYa(true));
    $('salir-menu').addEventListener('click', async () => { await guardarYa(); location.reload(); });
    $('salir-muerte').addEventListener('click', async () => { vida.reaparecer(); jugador.colocar(spawnMundo.x, spawnMundo.y, spawnMundo.z); await guardarYa(); location.reload(); });
    $('reaparecer').addEventListener('click', () => {
        vida.reaparecer();
        const s = spawnCama && mundo.bloque(spawnCama.x, spawnCama.y - 1, spawnCama.z) !== 0 ? spawnCama : spawnMundo;
        if (s !== spawnCama) spawnCama = null;
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

    // ---- Depuración ----
    window.__venjy = {
        datos, terreno, mundo, jugador, camara, renderer, scene, cielo, inventario, vida, dia, entidades, contenedores, agricultura, minado, hud, ventanas,
        gatas, animales, npcs, amigos, venjys, minimapa, guardarYa, estadoActual,
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
            jugador.actualizar(dt);
            vida.actualizar(dt);
            minado.actualizar(dt);
            entidades.actualizar(dt, camara);
            contenedores.actualizar(dt);
            agricultura.actualizar(dt);
        } else jugador.actualizar(0);
        vista.sincronizar();
        cielo.actualizar(camara, corre ? dt : 0);
        const dtC = corre ? dt : 0;
        gatas.actualizar(dtC);
        npcs.actualizar(dtC, false);
        animales.actualizar(dtC, false);
        amigos.actualizar(dtC, false);
        venjys.actualizar(dtC, false);
        ventanasBase.actualizar();
        hud.actualizar(dt, vida);
        relojAgua += dt;
        if (relojAgua > 0.2) { relojAgua = 0; animarAgua(atlasLienzo, ++cuadroAgua); atlas.needsUpdate = true; }
        minimapa.actualizar(jugador.pos.x, jugador.pos.z, jugador.yaw);
        mundo.planificar(jugador.pos.x, jugador.pos.z);
        mundo.procesar(5);
        renderer.render(scene, camara);

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
