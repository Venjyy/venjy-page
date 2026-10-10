// =========================================================
// VENJY · Supervivencia · Controles táctiles
// Sobre el joystick y los botones de mundo/tactil.js: ROMPER (mantener; también golpea),
// USAR (poner, comer, abrir, hablar), INVENTARIO y SOLTAR. La barra rápida se toca para elegir.
// =========================================================
import { cargarDatos, fusionar, texto } from '../datos/cargador.js';
import { aplicarLayout } from './layout-datos.js';

// Etiquetas por defecto; mundo/datos/textos.json (espacio «tactil») las reemplaza clave por clave.
const TEXTOS = {
    romper: { es: 'ROMPER', en: 'BREAK' },
    usar: { es: 'USAR', en: 'USE' },
    inventario: { es: 'INV', en: 'INV' },
    soltar: { es: 'SOLTAR', en: 'DROP' },
    acariciar: { es: 'ACARICIAR', en: 'PET' },
    camara: { es: 'CAM', en: 'CAM' },
    comando: { es: '/', en: '/' }
};

// Se piden al importar el módulo (main.js lo importa al abrir la página), antes de que el mundo termine de armarse.
let datosLayout = null;
let datosTextos = null;
const pendientes = new Set();
cargarDatos('ui-layout').then(d => { datosLayout = d; for (const f of pendientes) f(); });
cargarDatos('textos').then(d => { datosTextos = d; for (const f of pendientes) f(); });

// Estudio (?estudio, estudio/puente-juego.js): cambia el JSON ya cargado y repinta sin recargar la página.
export function aplicarDatosVivos(nombre, datos) {
    if (nombre === 'ui-layout') datosLayout = datos;
    else if (nombre === 'textos') datosTextos = datos;
    else return false;
    for (const f of pendientes) f();
    return true;
}

export function iniciarTactilSupervivencia({ tactil, minado, ventanas, inventario, idioma = 'es', camaras, consola, caricias }) {
    const claves = ['romper', 'usar', 'inventario', 'soltar', 'acariciar', 'camara', 'comando'];
    const etiqueta = clave => texto(fusionar(TEXTOS, datosTextos && datosTextos.textos && datosTextos.textos.tactil)[clave], idioma);
    const t = Object.fromEntries(claves.map(c => [c, etiqueta(c)]));
    const botones = [
        tactil.agregarAccion('sv-romper', t.romper, () => minado.abajo(0), () => minado.arriba(0)),
        tactil.agregarAccion('sv-usar', t.usar, () => minado.abajo(2), () => minado.arriba(2)),
        tactil.agregarAccion('sv-inventario', t.inventario, () => ventanas.abrir('inventario')),
        tactil.agregarAccion('sv-soltar', t.soltar, () => minado.soltarEnMano(false)),
        tactil.agregarAccion('sv-camara', t.camara, () => camaras && camaras.cambiarVista()),
        tactil.agregarAccion('sv-comando', t.comando, () => consola && consola.abrir('/'))
    ];
    for (const b of botones) b.hidden = false;
    // ACARICIAR aparece solo junto a una gata (caricias.js avisa cuando hay una al alcance)
    const acariciar = tactil.agregarAccion('sv-acariciar', t.acariciar, () => caricias && caricias.intentar());
    if (caricias) caricias.alCambiarCercania(cerca => { acariciar.hidden = !cerca; });
    document.body.classList.add('con-tactil');
    // Layout y etiquetas desde el JSON: si llegan después de crear los botones, se aplican al llegar
    const porNombre = { romper: botones[0], usar: botones[1], inventario: botones[2], soltar: botones[3], camara: botones[4], comando: botones[5], acariciar };
    const aplicarDatos = () => {
        if (datosLayout) aplicarLayout(datosLayout);
        for (const [c, b] of Object.entries(porNombre)) b.textContent = etiqueta(c);
    };
    aplicarDatos();
    pendientes.add(aplicarDatos);
    // Tocar una casilla de la barra rápida la elige
    const barra = document.getElementById('barra-rapida');
    barra.addEventListener('touchstart', e => {
        const c = e.target.closest('.casilla-rapida');
        if (!c) return;
        e.preventDefault();
        inventario.elegida = [...barra.children].indexOf(c);
    }, { passive: false });
    return { botones, acariciar };
}
