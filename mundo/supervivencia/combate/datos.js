// =========================================================
// VENJY · Combate · datos del núcleo (bloque 8 · N3, mundo/COMBATE.md §15.2, §15.3 y §25.1)
// Puro. Valores base del motor en el código; combate.json los ajusta (lo que falte usa estos) y cada
// estilo-*.json trae sus ataques, acciones y animaciones. Esquemas: estudio/esquemas/combate.schema.json y
// estilo.schema.json. Lo leen estados.js, animacion.js, el CLI (validar y resumen) y las pruebas.
//   fijarCombate(datos)        combate.json (o null) -> COMBATE (también las curvas con nombre)
//   COMBATE                    lo que usa el motor ahora
//   largoFases(f) / inicioFase(f, fase)   cuadros totales y cuadro donde empieza una fase
//   marca("activo+2", fases)   cuadro absoluto de una marca respecto de una fase (las ventanas siguen valiendo si el
//                              dueño estira una fase); null si la marca no se entiende
//   faseEn(fases, c)           { fase, f } del cuadro c (f = 0..1 dentro de la fase)
//   accionDe(estilo, clave)    el ataque, la acción del estilo o la reacción (del estilo o de combate.json)
//   animDe(estilo, clave)      la animación (estilo-*.json → anim, luego combate.json → anim)
// =========================================================
import { fijarCurvas } from '../../datos/curvas.js';

export const COMBATE_BASE = {
    motor: {
        hz: 60, maxPasos: 6,                         // paso fijo de la lógica; tope de pasos por dibujo (pestaña en pausa)
        saltoMax: 0.35, velocidadMax: 0.6,           // rad por cuadro: lo más que cambia un canal (y en los activos que lo declaran)
        mezcla: { normal: 6, buffer: 3, guardia: 10 }, // cuadros de la inercialización al cambiar de estado
        inercia: 0.5,                                // cuánto de la velocidad que traía conserva la mezcla (0..1)
        mezclaPorRad: 4.5,                           // con diferencias grandes la mezcla dura al menos esto × dif / saltoMax
        choques: { tope: 0.04, paso: 0.06, rapidez: 0.25 }, // el antebrazo no entra en el torso ni en la cabeza
        suelo: true,                                 // el pie más bajo toca el suelo (doblar las rodillas baja el cuerpo)
        pies: { anclar: true, apoyo: 0.03, velocidad: 0.03, alcance: 0.02, rodillaMin: 0.4, soltar: 4, alzar: 0.04, distanciaMax: 0.5 }, // pie apoyado = no se mueve en el mundo
        mirada: { cabeza: { tope: 0.5, rapidez: 0.35 }, pecho: { tope: 0.3, rapidez: 0.08 } },
        paso: { umbral: 0.15, rapidez: 0.12 }        // |mover| para caminar en guardia; qué tan rápido entra la caminata
    },
    entrada: { buffer: 8, alturaNeutra: 'medio' },
    // Asistencias del celular (§15.1). deslizar: un toque en ATACAR o DEFENSA se vuelve deslizamiento (alto o bajo) si
    // el dedo recorre px en vertical antes de ms; pasados los ms sin recorrerlos, es mantener. esquiva: deslizar rápido
    // en la zona libre de la derecha. especialModo: cuadros manteniendo ESPECIAL que dan modoEspecial.
    tactil: {
        buffer: 12, ventanasExtra: 2,
        deslizar: { px: 18, ms: 120 },
        esquiva: { px: 40, ms: 220 },
        joystick: { radio: 48, zonaMuerta: 0.2, mitad: 0.5 },
        especialModo: 20,
        vibracion: { activa: true, intensidad: 1, golpe: [12], fuerte: [28], desvio: [16], perfecto: [18, 30, 26] }
    },
    // Perfiles de PC (KeyboardEvent.code; Mouse0 = clic izquierdo, Mouse2 = derecho) y del mando (Gamepad API, botones
    // del mapeo estándar). juntos: dos controles apretados a la vez dan otro (Q + E = modoEspecial).
    teclas: {
        fuerte: 14, perfil: 'raton',
        arena: {
            raton: {
                izquierda: ['KeyA'], derecha: ['KeyD'], alto: ['KeyW'], bajo: ['KeyS'],
                atacar: ['Mouse0'], defensa: ['Mouse2'], esquivar: ['ShiftLeft', 'ShiftRight'],
                agarre: ['KeyE'], especial: ['KeyQ'], saltar: ['Space']
            },
            teclado: {
                izquierda: ['ArrowLeft'], derecha: ['ArrowRight'], alto: ['ArrowUp'], bajo: ['ArrowDown'],
                atacar: ['KeyJ'], defensa: ['KeyK'], esquivar: ['KeyL'],
                agarre: ['KeyU'], especial: ['KeyI'], saltar: ['Space']
            }
        },
        juntos: { modoEspecial: ['agarre', 'especial'] },
        mando: {
            atacar: [2], defensa: [0], agarre: [3], especial: [1], esquivar: [7], foco: [6], saltar: [5], modoEspecial: [4],
            ejeX: 0, ejeY: 1, zonaMuerta: 0.2, altura: 0.5,
            vibracion: { golpe: [60, 0.2, 0.3], fuerte: [120, 0.7, 0.5], desvio: [70, 0.3, 0.6], perfecto: [140, 0.8, 0.8] }
        }
    },
    peso: {},
    reacciones: {},
    anim: {}
};

export const COMBATE = {};
const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    const o = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(extra || {})])) {
        const b = base[k], e = extra ? extra[k] : undefined;
        if (e === undefined) o[k] = objeto(b) ? fundir(b, null) : b;
        else if (objeto(b) && objeto(e)) o[k] = fundir(b, e);
        else if (b === undefined || typeof e === typeof b) o[k] = e;
        else o[k] = b; // tipo equivocado: vale el del código
    }
    return o;
}
export function fijarCombate(datos) {
    const d = objeto(datos) ? datos : {};
    for (const k of Object.keys(COMBATE)) delete COMBATE[k];
    Object.assign(COMBATE, fundir(COMBATE_BASE, { motor: d.motor, entrada: d.entrada, tactil: d.tactil, teclas: d.teclas, peso: d.peso, reacciones: d.reacciones, anim: d.anim }));
    fijarCurvas(d.curvas || null);
    return COMBATE;
}
fijarCombate(null);

// ---------- Fases y marcas ----------
export const NOMBRES_FASES = ['anticipacion', 'activo', 'recuperacion'];
export const largoFases = f => (f.anticipacion || 0) + (f.activo || 0) + (f.recuperacion || 0);
export function inicioFase(f, fase) {
    if (fase === 'anticipacion') return 0;
    if (fase === 'activo') return f.anticipacion || 0;
    if (fase === 'recuperacion') return (f.anticipacion || 0) + (f.activo || 0);
    if (fase === 'fin') return largoFases(f);
    return null;
}
const RE_MARCA = /^(anticipacion|activo|recuperacion|fin)([+-]\d+)?$/;
export function marca(m, fases) {
    if (Number.isInteger(m)) return m;
    const r = typeof m === 'string' && RE_MARCA.exec(m);
    if (!r) return null;
    return inicioFase(fases, r[1]) + (r[2] ? parseInt(r[2], 10) : 0);
}
export function faseEn(fases, c) {
    const a = fases.anticipacion || 0, g = fases.activo || 0, r = fases.recuperacion || 0;
    if (c < a) return { fase: 'anticipacion', f: c / a };
    if (c < a + g) return { fase: 'activo', f: (c - a) / g };
    return { fase: 'recuperacion', f: r ? Math.min(1, (c - a - g) / r) : 1 };
}
// ¿El cuadro c está dentro de alguno de los tramos [desde, hasta] (marcas)?
export function enTramos(tramos, fases, c, extra = 0) {
    if (!tramos) return false;
    for (const t of tramos) {
        const d = marca(t[0], fases), h = marca(t[1], fases);
        if (d !== null && h !== null && c >= d && c <= h + extra) return true;
    }
    return false;
}

// ---------- Estilos ----------
export function accionDe(estilo, clave) {
    if (!clave) return null;
    const at = estilo && estilo.ataques && estilo.ataques[clave];
    if (at) return { tipo: 'ataque', estado: 'ataque', ...at };
    const ac = estilo && estilo.acciones && estilo.acciones[clave];
    if (ac) return { tipo: 'accion', estado: ac.estado || clave, ...ac };
    const re = (estilo && estilo.reacciones && estilo.reacciones[clave]) || COMBATE.reacciones[clave];
    if (re) return { tipo: 'reaccion', estado: re.estado || 'reaccion', ...re };
    return null;
}
export function animDe(estilo, clave) {
    if (!clave) return null;
    return (estilo && estilo.anim && estilo.anim[clave]) || COMBATE.anim[clave] || null;
}
export const esAtaque = (estilo, clave) => !!(estilo && estilo.ataques && estilo.ataques[clave]);
