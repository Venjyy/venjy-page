// =========================================================
// VENJY · Supervivencia · Presentación al abrir la página («Venjy presenta»)
// Módulo propio, cargado antes que main.js en supervivencia.html: su grafo es chico (datos y píxeles), así que se
// ve mientras baja y arranca el resto del juego. Cubre la pantalla con el logo de píxeles, el nombre de quien hace
// el juego y un lema (mundo/datos/inicio.json → presentacion; Estudio → pestaña Inicio; valores base en INICIO).
// Se cierra cuando pasó el tiempo mínimo y main.js avisa que el fondo del menú está listo (presentacion.listo()),
// o al llegar al máximo. Clic o tecla la saltan (si el fondo aún no está, en cuanto esté).
// No se muestra con ?estudio, ?plano ni al volver de «seguir jugando» (el <head> marca <html data-sin-presentacion>).
// =========================================================
import { cargarDatos } from '../datos/cargador.js';
import { INICIO, datosInicio } from './inicio-datos.js';
import { decodificar } from '../datos/pixeles.js';

const el = document.getElementById('presentacion');
const omitida = !el || document.documentElement.hasAttribute('data-sin-presentacion');
let idioma = 'es';
try {
    const p = new URLSearchParams(location.search).get('lang');
    idioma = p === 'en' || p === 'es' ? p : (localStorage.getItem('preferredLanguage') === 'en' ? 'en' : 'es');
} catch (e) { /* sin almacenamiento */ }

let resolverCerrada;
const cerrada = new Promise(r => { resolverCerrada = r; });
let datos = INICIO.presentacion, fondoListo = false, quiereSaltar = false, terminada = false, relojMax = null;

// Pinta el dibujo { paleta, filas } en el lienzo, un píxel del lienzo por píxel del logo (el CSS lo agranda)
function pintarLogo(d) {
    const c = document.getElementById('pres-logo');
    const h = (d && d.filas && d.filas.length) || 0, w = h ? String(d.filas[0]).length : 0;
    if (!c || !w) { if (c) c.hidden = true; return; }
    c.width = w; c.height = h; c.hidden = false;
    const ctx = c.getContext('2d'), img = ctx.createImageData(w, h);
    decodificar(d, w, h).forEach((p, i) => {
        if (!p) return;
        img.data.set([p[0], p[1], p[2], 255], i * 4);
    });
    ctx.putImageData(img, 0, 0);
    c.style.width = w * datos.aspecto.pixel + 'px';
    c.style.height = h * datos.aspecto.pixel + 'px';
}

function aplicar(p) {
    datos = p;
    const a = p.aspecto, t = p.tiempos;
    el.style.setProperty('--pres-fondo', a.fondo);
    el.style.setProperty('--pres-texto', a.texto);
    el.style.setProperty('--pres-sombra', a.sombra);
    el.style.setProperty('--pres-lema', a.lema);
    el.style.setProperty('--pres-entrada', t.entrada + 's');
    el.style.setProperty('--pres-salida', t.salida + 's');
    for (const [id, txt] of [['pres-nombre', p.nombre], ['pres-lema', p.lema]]) {
        const n = document.getElementById(id);
        n.dataset.es = txt.es; n.dataset.en = txt.en;
        n.textContent = txt[idioma] || txt.es;
        n.hidden = !n.textContent;
    }
    el.setAttribute('aria-label', [p.nombre[idioma] || p.nombre.es, p.lema[idioma] || p.lema.es].filter(Boolean).join(' '));
    pintarLogo(p.logo);
}

function cerrar() {
    if (terminada) return;
    terminada = true;
    clearTimeout(relojMax);
    el.classList.add('saliendo');
    setTimeout(() => { el.hidden = true; resolverCerrada(); }, datos.tiempos.salida * 1000 + 30);
}

// Cierra si ya pasó el mínimo (o se pidió saltar) y el fondo está listo
function intentar() {
    if (terminada || !fondoListo) return;
    const falta = datos.tiempos.minimo * 1000 - performance.now();
    if (quiereSaltar || falta <= 0) cerrar();
    else setTimeout(intentar, falta + 5);
}

if (omitida) {
    if (el) el.hidden = true;
    terminada = true;
    resolverCerrada();
} else {
    aplicar(INICIO.presentacion); // ya, con los valores del código; el JSON llega después
    const armarMax = () => { clearTimeout(relojMax); relojMax = setTimeout(cerrar, Math.max(0, datos.tiempos.maximo * 1000 - performance.now())); };
    armarMax();
    cargarDatos('inicio').then(j => {
        if (terminada) return;
        const p = datosInicio(j).presentacion;
        if (!p.activa) { el.hidden = true; terminada = true; resolverCerrada(); return; }
        aplicar(p);
        armarMax();
        intentar();
    });
    const saltar = () => { quiereSaltar = true; intentar(); };
    el.addEventListener('pointerdown', saltar);
    window.addEventListener('keydown', e => { if (!terminada && !e.repeat) saltar(); });
}

export const presentacion = {
    // main.js: el fondo del menú ya tiene su primer plano (o no hay fondo)
    listo() { fondoListo = true; intentar(); },
    // Promesa que se cumple al terminar de desvanecerse (o de inmediato si no se mostró)
    cerrada
};
