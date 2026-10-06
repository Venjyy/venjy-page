// =========================================================
// VENJY · Mundo 3D jugable
// El mismo mapa del portafolio, convertido en bloques.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { generarDatos } from './mundo-datos.js';
import { crearAtlas } from './texturas.js';
import { prepararTerreno, MundoVoxel, ESCALA, CHUNK } from './voxeles.js';
import { Jugador } from './jugador.js';
import { crearCielo, COLOR_HORIZONTE } from './cielo.js';
import { iniciarAjustes } from './ajustes.js';
import { iniciarTactil } from './tactil.js';
import { crearMinimapa } from './minimapa.js';

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

const atlas = new THREE.CanvasTexture(crearAtlas());
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

function pedirPuntero() {
    try {
        const r = lienzo.requestPointerLock();
        if (r && r.catch) r.catch(() => { /* el navegador rechazó el bloqueo del puntero */ });
    } catch (e) { /* sin pointer lock */ }
}

async function iniciar() {
    await new Promise(r => setTimeout(r, 30)); // deja pintar el texto de carga
    const datos = generarDatos('h');
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
    jugador.colocar(px + 0.5, terreno.HT[pz * terreno.BW + px] + 1, pz + 0.5);
    jugador.yaw = Math.PI / 2 * -1; // mirando hacia el este (hacia el título)

    const minimapa = crearMinimapa(datos, hudEl, ESCALA);
    const ajustes = iniciarAjustes({ idioma, datos, terreno, mundo, jugador, camara, cielo, scene, pedirPuntero: () => entrar() });
    window.__venjy = { datos, terreno, mundo, jugador, camara, renderer, scene, cielo, ajustes, minimapa };

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
    function bucle(ahora) {
        requestAnimationFrame(bucle);
        const dt = (ahora - anterior) / 1000;
        anterior = ahora;
        if (jugador.activo) jugador.actualizar(dt);
        else jugador.actualizar(0);
        cielo.actualizar(camara, dt);
        minimapa.actualizar(jugador.pos.x, jugador.pos.z, jugador.yaw);
        mundo.planificar(jugador.pos.x, jugador.pos.z);
        mundo.construir(5);
        renderer.render(scene, camara);

        cuadros++; acumulado += dt;
        if (acumulado >= 0.5) {
            fpsEl.textContent = Math.round(cuadros / acumulado) + ' FPS';
            cuadros = 0; acumulado = 0;
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
