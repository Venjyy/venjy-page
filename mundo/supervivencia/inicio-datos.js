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
    }
};

// INICIO con lo que traiga el JSON encima (los arreglos del JSON reemplazan a los del código)
export function datosInicio(json) {
    return fusionar(INICIO, json && typeof json === 'object' ? { titulo: json.titulo } : null);
}

// Una frase al azar en el idioma pedido ('' si no hay). azar: función [0, 1) para las pruebas.
export function fraseAlAzar(datos, idioma = 'es', azar = Math.random) {
    const l = ((datos && datos.titulo && datos.titulo.frases) || []).filter(f => f && (f[idioma] || f.es));
    if (!l.length) return '';
    const f = l[Math.min(l.length - 1, Math.floor(azar() * l.length))];
    return f[idioma] || f.es;
}
