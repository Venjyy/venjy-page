// =========================================================
// VENJY · Supervivencia · Datos del menú de inicio (pantalla de título)
// Valores base del logo, el pie y las frases amarillas que saltan junto al logo (como las de Minecraft), la
// pantalla de carga, la presentación «Venjy presenta» y el fondo de cine detrás del menú.
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
    },
    // Presentación al abrir la página (antes del título): logo de píxeles, nombre de quien hace el juego y un lema.
    // Mientras se ve, se carga el primer plano del fondo. logo: dibujo { paleta, filas } (formato de mundo/datos/pixeles.js).
    // aspecto.pixel: tamaño en px de cada píxel del logo. tiempos en segundos: minimo = lo menos que se ve; maximo = se
    // cierra aunque el fondo no esté listo; entrada = cuánto tarda en aparecer cada parte; salida = desvanecido.
    presentacion: {
        activa: true,
        nombre: { es: 'VENJY', en: 'VENJY' },
        lema: { es: 'presenta', en: 'presents' },
        logo: {
            paleta: ['#0c0704', '#8fd14f', '#5aa532', '#3f7d22', '#a8754d', '#8a5a3b', '#6b4a2f', '#f4e9c8', '#4a3220', '#55391f', '#367020'],
            filas: [
                '..............0000..............', '............00222200............', '..........002322212100..........',
                '........0022221122222200........', '......00222221212222132200......', '....001222232122212213232200....',
                '..0022222312222222222232122100..', '.012123222222222222221222223130.', '.022222222212212222122222222230.',
                '.022222232222222222222322222220.', '.021222223222222222223221222a30.', '.02212122232222213221222223aa30.',
                '.02222212222222232123311aaaaaa0.', '.026222121212221112122aa333aa60.', '.0452422212232221222a3aaaaa9960.',
                '.0544444212212221233aaaaa566660.', '.054444525122221aa3aaaa96666960.', '.046454444452121a3aa65696666660.',
                '.064564444454222aa6656696665650.', '.044477464447741356669666669590.', '.044677844547784666669966666660.',
                '.046467744677884956666566665660.', '.044447784477844666666965969650.', '.064444774778844566656666566690.',
                '.054444778778666699666669666690.', '..0064657778844466666666966600..', '....005447884444695656566900....',
                '......00668546466695666500......', '........0046444466656600........', '..........005444595500..........',
                '............00466900............', '..............0000..............'
            ]
        },
        aspecto: { fondo: '#14100c', texto: '#ffffff', sombra: '#3a2a1c', lema: '#c6c6c6', pixel: 6 },
        tiempos: { minimo: 2.4, maximo: 8, entrada: 0.5, salida: 0.6 }
    },
    // Fondo de cine detrás del menú (título, mundos, amigos, skin): el mapa sin ediciones con planos de cámara que se
    // funden a negro entre uno y otro. Cada plano: desde/hasta = posición de la cámara al empezar y al terminar
    // [x, y, z] en bloques del mundo; mira/miraHasta = el punto que mira (sin miraHasta, el mismo); duracion en s.
    // distancia: radio en chunks que se carga (distanciaCelular en pantallas táctiles); fps: tope de cuadros del fondo;
    // hora: 0-1 (0,25 amanecer, 0,5 mediodía); oscurecer: velo negro sobre el fondo detrás de los menús (0-1);
    // fundido: segundos del fundido a negro; esperaMax: lo más que espera en negro a que cargue el plano siguiente;
    // orden: 'seguido' o 'azar'.
    fondo: {
        activo: true,
        enCelular: true,
        distancia: 6,
        distanciaCelular: 4,
        fps: 30,
        hora: 0.4,
        fov: 60,
        oscurecer: 0.3,
        fundido: 1.2,
        esperaMax: 4,
        orden: 'seguido',
        planos: [
            { nombre: 'molino', desde: [350, 88, 625], hasta: [380, 90, 650], mira: [387, 74, 592], duracion: 13 },
            { nombre: 'atalaya', desde: [845, 88, 655], hasta: [860, 88, 672], mira: [881, 80, 624], duracion: 13 },
            { nombre: 'iglu', desde: [1296, 110, 172], hasta: [1340, 112, 168], mira: [1329, 100, 133], duracion: 13 },
            { nombre: 'faro', desde: [1392, 94, 868], hasta: [1424, 92, 860], mira: [1438, 82, 922], duracion: 13 }
        ]
    }
};

// Orden en que main.js recorre las etapas de la carga (las claves de INICIO.carga.etapas)
export const ORDEN_CARGA = ['terreno', 'sistemas', 'amigos', 'mundo', 'escenas', 'datos'];

// INICIO con lo que traiga el JSON encima (los arreglos del JSON reemplazan a los del código)
export function datosInicio(json) {
    const j = json && typeof json === 'object' ? json : null;
    return fusionar(INICIO, j ? { titulo: j.titulo, carga: j.carga, presentacion: j.presentacion, fondo: j.fondo } : null);
}

// ---- Fondo de cine (sin DOM: lo usan fondo-menu.js, el Estudio y las pruebas) ----
const tres = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
// Planos que se pueden jugar (posiciones de 3 números y duración positiva)
export function planosValidos(datos) {
    const l = (datos && datos.fondo && datos.fondo.planos) || [];
    return l.filter(p => p && tres(p.desde) && tres(p.mira) && (p.hasta === undefined || tres(p.hasta)) && (p.miraHasta === undefined || tres(p.miraHasta)) && Number(p.duracion) > 0);
}
// ¿Se muestra el fondo? (activo, con planos y, en pantallas táctiles, solo si enCelular)
export function fondoActivo(datos, tactil = false) {
    const f = datos && datos.fondo;
    return !!(f && f.activo && (!tactil || f.enCelular) && planosValidos(datos).length);
}
// Cámara del plano en el instante u (0-1): { pos, mira }, avance lineal (el fundido tapa los bordes)
export function planoEn(p, u) {
    const k = Math.min(1, Math.max(0, Number(u) || 0));
    const mezclar = (a, b) => a.map((v, i) => v + ((b || a)[i] - v) * k);
    return { pos: mezclar(p.desde, p.hasta), mira: mezclar(p.mira, p.miraHasta) };
}
// Índice del plano que sigue a i entre n: en orden o al azar (sin repetir el mismo si hay más de uno)
export function siguientePlano(i, n, orden = 'seguido', azar = Math.random) {
    if (n <= 1) return 0;
    if (orden === 'azar') { const j = Math.min(n - 2, Math.floor(azar() * (n - 1))); return j >= i ? j + 1 : j; }
    return (i + 1) % n;
}
// Opacidad del velo negro en el segundo t de un plano que dura `dur` con fundidos de `fundido` s (1 = negro)
export function veloEn(t, dur, fundido) {
    if (!(fundido > 0)) return 0;
    const f = Math.min(fundido, dur / 2);
    if (t < f) return 1 - t / f;
    if (t > dur - f) return Math.min(1, (t - (dur - f)) / f);
    return 0;
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
