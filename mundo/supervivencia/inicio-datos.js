// =========================================================
// VENJY · Supervivencia · Datos del menú de inicio (pantalla de título)
// Valores base del logo, el pie y las frases amarillas que saltan junto al logo (como las de Minecraft).
// El dueño los cambia en mundo/datos/inicio.json (Estudio → pestaña Inicio); lo que falte usa INICIO.
// Sin DOM: lo usan main.js, el Estudio y mundo/tests/inicio.mjs.
// =========================================================
import { fusionar } from '../datos/cargador.js';

export const INICIO = {
    titulo: {
        logo: { es: 'VENJY', en: 'VENJY' },
        sub: { es: 'Supervivencia', en: 'Survival' },
        pie: { es: 'El mapa del portafolio, ahora para sobrevivir.', en: 'The portfolio map, now to survive in.' },
        frases: [
            { es: '¡Con gatas!', en: 'With cats!' },
            { es: '¡Hecho bloque a bloque!', en: 'Built block by block!' },
            { es: '¡Ahora con duelo de cartas!', en: 'Now with a card duel!' },
            { es: '¡Hasta 8 amigos!', en: 'Up to 8 friends!' },
            { es: '¡También sin internet!', en: 'Works offline too!' },
            { es: '¡Cuidado con los jefes!', en: 'Beware of the bosses!' },
            { es: '¡Hecho en Chile!', en: 'Made in Chile!' }
        ],
        // Cómo se ve la frase: color, giro en grados, cuánto crece al latir (0,1 = 10 %), latidos por segundo y dónde
        // queda (x: % desde el borde derecho del logo hacia adentro, negativo = sale del logo; y: % desde abajo del logo)
        frase: { color: '#ffff55', giro: -18, pulso: 0.08, ritmo: 1.6, x: -10, y: 40 }
    },
    // Pantalla de carga a pantalla completa: título, rótulo del consejo, etapas reales de main.js (arrancar), consejos
    // al azar, colores y tiempos. Las claves de etapas son las de ORDEN_CARGA; el peso reparte la barra (a más peso,
    // más barra ocupa esa etapa).
    carga: {
        titulo: { es: 'Generando el mundo…', en: 'Generating the world…' },
        rotuloConsejo: { es: 'Consejo', en: 'Tip' },
        etapas: {
            terreno: { nombre: { es: 'Levantando el terreno', en: 'Raising the terrain' }, peso: 4 },
            sistemas: { nombre: { es: 'Armando inventario y sistemas', en: 'Setting up inventory and systems' }, peso: 2 },
            amigos: { nombre: { es: 'Llamando a los amigos', en: 'Calling the friends' }, peso: 2 },
            mundo: { nombre: { es: 'Poblando el mundo', en: 'Populating the world' }, peso: 2 },
            escenas: { nombre: { es: 'Preparando las escenas', en: 'Preparing the scenes' }, peso: 3 },
            datos: { nombre: { es: 'Cargando los últimos datos', en: 'Loading the last data' }, peso: 1 }
        },
        consejos: [
            { es: 'Las gatas Mila y Gala aceptan caricias: acércate despacio.', en: 'Mila and Gala the cats love pets: approach slowly.' },
            { es: 'Habla con tus amigos para subir la amistad y desbloquear cosas.', en: 'Talk to your friends to raise friendship and unlock things.' },
            { es: 'Duerme en una cama para fijar tu punto de reaparición.', en: 'Sleep in a bed to set your respawn point.' },
            { es: 'Un mazo de cartas propio hace el duelo mucho más justo.', en: 'Building your own deck makes the duel a lot fairer.' },
            { es: 'Con la tecla L cambias el idioma sin salir del juego.', en: 'Press L to switch language without leaving the game.' },
            { es: 'Guarda la partida antes de enfrentar a un jefe.', en: 'Save the game before facing a boss.' },
            { es: 'Invita a hasta 7 amigos desde «Con amigos».', en: 'Invite up to 7 friends from “With friends”.' }
        ],
        // Colores (fondo de tierra a cuadros, barra, texto) y tiempos en segundos: minimo = lo menos que se ve la
        // pantalla (para que se alcance a leer el consejo), salida = cuánto dura el desvanecido
        aspecto: { fondo: '#6b4a2f', fondo2: '#5a3d26', barra: '#5aa532', barraFondo: '#2b2b2b', texto: '#ffffff', cuadro: 64 },
        tiempos: { minimo: 1.2, salida: 0.35 }
    }
};

// Orden en que main.js recorre las etapas de la carga (las claves de INICIO.carga.etapas)
export const ORDEN_CARGA = ['terreno', 'sistemas', 'amigos', 'mundo', 'escenas', 'datos'];

// INICIO con lo que traiga el JSON encima (los arreglos del JSON reemplazan a los del código)
export function datosInicio(json) {
    return fusionar(INICIO, json && typeof json === 'object' ? { titulo: json.titulo, carga: json.carga } : null);
}

// Una frase al azar en el idioma pedido ('' si no hay). azar: función [0, 1) para las pruebas.
export function fraseAlAzar(datos, idioma = 'es', azar = Math.random) {
    const l = ((datos && datos.titulo && datos.titulo.frases) || []).filter(f => f && (f[idioma] || f.es));
    if (!l.length) return '';
    const f = l[Math.min(l.length - 1, Math.floor(azar() * l.length))];
    return f[idioma] || f.es;
}

// Un consejo al azar en el idioma pedido ('' si no hay)
export function consejoAlAzar(datos, idioma = 'es', azar = Math.random) {
    const l = ((datos && datos.carga && datos.carga.consejos) || []).filter(f => f && (f[idioma] || f.es));
    if (!l.length) return '';
    const f = l[Math.min(l.length - 1, Math.floor(azar() * l.length))];
    return f[idioma] || f.es;
}

// Avance de la barra (0-100) al EMPEZAR la etapa `clave`: lo que pesan las etapas anteriores sobre el total.
// `clave` = null o desconocida → 100 (todo hecho). Una etapa sin peso válido cuenta 1.
export function avanceCarga(datos, clave) {
    const e = (datos && datos.carga && datos.carga.etapas) || {};
    const peso = k => { const p = e[k] && Number(e[k].peso); return p > 0 ? p : 1; };
    const total = ORDEN_CARGA.reduce((a, k) => a + peso(k), 0);
    const i = ORDEN_CARGA.indexOf(clave);
    if (i < 0) return 100;
    return Math.round(ORDEN_CARGA.slice(0, i).reduce((a, k) => a + peso(k), 0) / total * 100);
}
