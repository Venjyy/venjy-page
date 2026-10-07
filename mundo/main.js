// =========================================================
// VENJY · Mundo 3D jugable
// El mismo mapa del portafolio, convertido en bloques.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { generarDatos } from './mundo-datos.js';
import { crearAtlas, animarAgua } from './texturas.js';
import { prepararTerreno, MundoVoxel, ESCALA, CHUNK } from './voxeles.js';
import { Jugador } from './jugador.js';
import { crearCielo, COLOR_HORIZONTE } from './cielo.js';
import { iniciarAjustes } from './ajustes.js';
import { iniciarTactil } from './tactil.js';
import { crearMinimapa } from './minimapa.js';
import { crearGatas } from './gatas.js';
import { crearBrujula } from './brujula.js';

// ---------------------------------------------------------
// Idioma (misma preferencia que el portafolio)
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
    const volver = document.getElementById('volver');
    volver.href = `index.html?lang=${idioma}`;
}
aplicarIdioma();

const TXT = {
    es: { vuelo: 'Volando', suelo: 'Caminando', cargando: 'Generando el mundo…' },
    en: { vuelo: 'Flying', suelo: 'Walking', cargando: 'Generating the world…' }
};

// ---------------------------------------------------------
// Render
// ---------------------------------------------------------
const lienzo = document.getElementById('juego');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
const COLOR_CIELO = COLOR_HORIZONTE;
scene.background = COLOR_CIELO;

const camara = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

const atlasLienzo = crearAtlas();
const atlas = new THREE.CanvasTexture(atlasLienzo);
let cuadroAgua = 0, relojAgua = 0;
atlas.magFilter = THREE.NearestFilter;
atlas.minFilter = THREE.NearestFilter;
atlas.generateMipmaps = false;
atlas.colorSpace = THREE.SRGBColorSpace;

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
// Mundo
// ---------------------------------------------------------
const cargaEl = document.getElementById('carga');
const botonJugar = document.getElementById('jugar');
const pantallaInicio = document.getElementById('inicio');
const hudEl = document.getElementById('hud');
const coordsEl = document.getElementById('coords');
const modoEl = document.getElementById('modo');
const zonaEl = document.getElementById('zona');
const pausaEl = document.getElementById('pausa-titulo');

cargaEl.textContent = TXT[idioma].cargando;

const DISTANCIA = 10;
// Orientación del mapa: ?mapa=v (vertical) o ?mapa=h (horizontal, por defecto)
let orientacion = 'h';
try { orientacion = new URLSearchParams(location.search).get('mapa') === 'v' ? 'v' : 'h'; } catch (e) { /* sin parámetros */ }

function pedirPuntero() {
    try {
        const r = lienzo.requestPointerLock();
        if (r && r.catch) r.catch(() => { /* el navegador rechazó el bloqueo del puntero */ });
    } catch (e) { /* sin pointer lock */ }
}

async function iniciar() {
    await new Promise(r => setTimeout(r, 30)); // deja pintar el texto de carga
    const datos = generarDatos(orientacion);
    const terreno = prepararTerreno(datos);

    const bordeFog = DISTANCIA * CHUNK;
    scene.fog = new THREE.Fog(COLOR_CIELO, bordeFog * 0.55, bordeFog * 0.95);
    camara.far = 2000;
    camara.updateProjectionMatrix();

    const cielo = crearCielo(scene, terreno.BW, terreno.BD, materiales);
    const mundo = new MundoVoxel(scene, terreno, materiales, DISTANCIA);
    const jugador = new Jugador(camara, mundo, lienzo, { x: terreno.BW, z: terreno.BD });

    // Aparece en el spawn del mapa, sobre el suelo
    const [sx, sz] = datos.P.spawn;
    const px = sx * ESCALA + 2, pz = sz * ESCALA + 2;
    mundo.planificar(px, pz);
    const cercanos = mundo.cola.filter(c => c.d2 <= 9).length;
    while (mundo.chunks.size < cercanos) mundo.construir(40);
    mundo.iniciarWorkers(orientacion, Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 2)));
    jugador.colocar(px + 0.5, terreno.HT[pz * terreno.BW + px] + 1, pz + 0.5);
    // Mira hacia el título, esté donde esté en el mapa (este en el horizontal)
    const tit = datos.titulo;
    jugador.yaw = Math.atan2(-(tit.tx0 + tit.anchoT / 2 - sx), -(tit.ty0 + tit.altoT / 2 - sz));

    const gatas = crearGatas(scene, { datos, terreno, mundo, jugador, materiales });
    const minimapa = crearMinimapa(datos, hudEl, ESCALA);
    const brujula = crearBrujula(hudEl, idioma);
    const ajustes = iniciarAjustes({ idioma, datos, terreno, mundo, jugador, camara, cielo, scene, gatas, brujula, mapa: orientacion, pedirPuntero: () => entrar() });
    window.__venjy = { datos, terreno, mundo, jugador, camara, renderer, scene, cielo, ajustes, minimapa, gatas, brujula };

    cargaEl.hidden = true;
    botonJugar.hidden = false;
    botonJugar.focus();

    botonJugar.addEventListener('click', () => entrar());
    lienzo.addEventListener('click', () => { if (!jugador.activo) entrar(); });
    pantallaInicio.addEventListener('click', e => { if (e.target === pantallaInicio) entrar(); });

    const alActivo = activo => {
        pantallaInicio.hidden = activo;
        hudEl.hidden = !activo;
        if (!activo) {
            ajustes.sincronizarHora();
            pausaEl.textContent = pausaEl.dataset[idioma === 'en' ? 'enPausa' : 'esPausa'];
            botonJugar.textContent = botonJugar.dataset[idioma === 'en' ? 'enContinuar' : 'esContinuar'];
        }
    };
    jugador.alCambiarActivo = alActivo;
    // En pantallas táctiles no hay pointer lock: se usan los controles en pantalla
    const tactil = iniciarTactil(jugador, { alEntrar: alActivo });
    if (tactil) document.querySelector('.controles').hidden = true;
    const entrar = () => (tactil ? tactil.activar() : pedirPuntero());
    const actualizarModo = v => { modoEl.textContent = v ? TXT[idioma].vuelo : TXT[idioma].suelo; };
    jugador.alCambiarVuelo = actualizarModo;
    actualizarModo(false);

    let anterior = performance.now(), cuadros = 0, acumulado = 0;
    const fpsEl = document.getElementById('fps');
    // Distancia automática: el slider es el máximo; baja si hay pocos FPS y sube si sobran
    const auto = { fpsSimulados: null, tiempo: 0, ultimoCambio: -99, ventana: 0, ventanaFps: 0, medidas: [], alto: 0, escala: 1 };
    window.__venjy.auto = auto; // auto.escala acelera el reloj (solo depuración)
    function autoAjustar(fps, paso) {
        if (!jugador.activo || mundo.cola.length > 0) { auto.ventana = 0; auto.ventanaFps = 0; auto.alto = 0; return; }
        auto.tiempo += paso * auto.escala;
        if (!ajustes.auto) return;
        auto.ventana += paso * auto.escala; auto.ventanaFps += fps * paso * auto.escala;
        auto.alto = fps > 58 ? auto.alto + paso * auto.escala : 0;
        if (auto.ventana >= 3) {
            auto.medidas.push(auto.ventanaFps / auto.ventana);
            if (auto.medidas.length > 3) auto.medidas.shift();
            auto.ventana = 0; auto.ventanaFps = 0;
        }
        if (auto.tiempo < 6 || auto.tiempo - auto.ultimoCambio < 5) return;
        const actual = mundo.distancia, max = ajustes.distanciaMax;
        const prom = auto.medidas.reduce((a, b) => a + b, 0) / (auto.medidas.length || 1);
        let nueva = actual;
        if (auto.medidas.length >= 3 && prom < 40 && actual > 5) nueva = actual - 1;
        else if (auto.alto >= 10 && actual < max) nueva = actual + 1;
        else if (actual > max) nueva = max;
        if (nueva !== actual) {
            ajustes.aplicarDistanciaAuto(nueva);
            auto.ultimoCambio = auto.tiempo; auto.medidas.length = 0; auto.alto = 0;
        }
    }
    function bucle(ahora) {
        requestAnimationFrame(bucle);
        const dt = (ahora - anterior) / 1000;
        anterior = ahora;
        if (jugador.activo) jugador.actualizar(dt);
        else jugador.actualizar(0);
        cielo.actualizar(camara, dt);
        gatas.actualizar(dt);
        relojAgua += dt;
        if (relojAgua > 0.2) { relojAgua = 0; animarAgua(atlasLienzo, ++cuadroAgua); atlas.needsUpdate = true; }
        minimapa.actualizar(jugador.pos.x, jugador.pos.z, jugador.yaw);
        brujula.actualizar(jugador.yaw);
        mundo.planificar(jugador.pos.x, jugador.pos.z);
        mundo.procesar(5);
        renderer.render(scene, camara);

        cuadros++; acumulado += dt;
        if (acumulado >= 0.5) {
            const paso = acumulado;
            const fps = auto.fpsSimulados ?? cuadros / acumulado;
            fpsEl.textContent = Math.round(fps) + ' FPS';
            cuadros = 0; acumulado = 0;
            autoAjustar(fps, paso);
            zonaEl.textContent = ajustes.zonaEn(jugador.pos.x, jugador.pos.z);
            zonaEl.hidden = !zonaEl.textContent;
            coordsEl.textContent = `X ${jugador.pos.x.toFixed(1)}  Y ${jugador.pos.y.toFixed(1)}  Z ${jugador.pos.z.toFixed(1)}`;
        }
    }
    requestAnimationFrame(bucle);
}

iniciar().catch(err => {
    console.error(err);
    cargaEl.textContent = 'Error: ' + err.message;
});
