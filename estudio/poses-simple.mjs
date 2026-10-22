// =========================================================
// VENJY · Estudio · pestaña Poses, vista simple (Etapa B, 0b · B0-P, estudio/DISENO.md §39)
// Puro (lo prueba mundo/tests/estudio-poses-editor.mjs). Sobre poses-modelo.mjs:
//   - SIMPLES: los canales principales por parte del cuerpo, con nombre común y qué pasa en cada punta del slider
//     (el valor no se invierte: el slider es el mismo canal, solo cambian los nombres);
//   - BASES: poses para partir (saludar, celebrar, pensar, brazos cruzados, señalar, agacharse, guardia, sentado);
//   - copiar un lado al otro y espejo (cambiar de lado) sobre la pose, el gesto o su variante, con claves y osciladores;
//   - suavizar: todas las claves con interpolación suave.
// =========================================================
import { NOMBRES_CANAL, NEUTRAL, canalesDe, editar, nuevaPose } from './poses-modelo.mjs';

// [canal, es, en, punta mínima [es, en], punta máxima [es, en]] agrupados por parte del cuerpo
export const PARTES = [
    ['cabeza', 'Cabeza', 'Head', [
        ['cx', 'Mirar', 'Look', ['arriba', 'up'], ['abajo', 'down']],
        ['cy', 'Girar la cabeza', 'Turn head', ['a la derecha', 'to the right'], ['a la izquierda', 'to the left']]
    ]],
    ['cuerpo', 'Cuerpo', 'Body', [
        ['inc', 'Inclinarse', 'Lean', ['atrás', 'back'], ['adelante', 'forward']],
        ['y', 'Altura', 'Height', ['agachado', 'crouched'], ['arriba', 'up']]
    ]],
    ['brazoD', 'Brazo derecho', 'Right arm', [
        ['bDx', 'Levantar', 'Raise', ['arriba', 'up'], ['atrás', 'back']],
        ['bDz', 'Abrir', 'Open', ['afuera', 'out'], ['al pecho', 'to the chest']],
        ['codoD', 'Doblar el codo', 'Bend elbow', ['doblado', 'bent'], ['estirado', 'straight']]
    ]],
    ['brazoI', 'Brazo izquierdo', 'Left arm', [
        ['bIx', 'Levantar', 'Raise', ['arriba', 'up'], ['atrás', 'back']],
        ['bIz', 'Abrir', 'Open', ['al pecho', 'to the chest'], ['afuera', 'out']],
        ['codoI', 'Doblar el codo', 'Bend elbow', ['doblado', 'bent'], ['estirado', 'straight']]
    ]],
    ['piernaD', 'Pierna derecha', 'Right leg', [
        ['pDx', 'Paso', 'Step', ['adelante', 'forward'], ['atrás', 'back']],
        ['rodD', 'Doblar la rodilla', 'Bend knee', ['estirada', 'straight'], ['doblada', 'bent']]
    ]],
    ['piernaI', 'Pierna izquierda', 'Left leg', [
        ['pIx', 'Paso', 'Step', ['adelante', 'forward'], ['atrás', 'back']],
        ['rodI', 'Doblar la rodilla', 'Bend knee', ['estirada', 'straight'], ['doblada', 'bent']]
    ]]
];
export const SIMPLES = PARTES.flatMap(p => p[3].map(x => x[0]));
export const esSimple = c => SIMPLES.includes(c);
export function nombreDe(c, idioma = 'es') {
    const i = idioma === 'en' ? 1 : 0;
    for (const [, pes, pen, l] of PARTES) for (const [k, es, en, a, b] of l) if (k === c) return { parte: [pes, pen][i], nombre: [es, en][i], min: a[i], max: b[i] };
    return null;
}

// Poses base para partir (canales; lo que falta es neutral). Con el suelo automático los pies se apoyan solos.
export const BASES = {
    dePie: { nombre: ['De pie', 'Standing'], canales: {} },
    saludar: { nombre: ['Saludar', 'Wave'], canales: { bDx: -2.6, bDz: -0.35, codoD: -0.5, cy: 0.15 } },
    celebrar: { nombre: ['Celebrar', 'Celebrate'], canales: { bDx: -2.8, bIx: -2.8, bDz: -0.4, bIz: 0.4, cx: -0.3 } },
    pensar: { nombre: ['Pensar', 'Think'], canales: { bDx: -0.9, bDz: 0.5, codoD: -2.2, cx: 0.15, cy: -0.2 } },
    cruzarBrazos: { nombre: ['Brazos cruzados', 'Arms crossed'], canales: { bDx: -0.6, bIx: -0.6, bDz: 0.6, bIz: -0.6, codoD: -1.9, codoI: -1.9 } },
    senalar: { nombre: ['Señalar', 'Point'], canales: { bDx: -1.55, bDz: -0.1, cy: 0.1 } },
    agacharse: { nombre: ['Agacharse', 'Crouch'], canales: { pDx: -1.3, pIx: -1.3, rodD: 2.2, rodI: 2.2, inc: 0.3, bDx: -0.6, bIx: -0.6 } },
    guardia: { nombre: ['Guardia (pelea)', 'Guard (fight)'], canales: { bDx: -1.3, bIx: -1.1, codoD: -1.9, codoI: -1.9, bDz: 0.3, bIz: -0.3, pDx: 0.25, pIx: -0.3, rodD: 0.3, rodI: 0.3, inc: 0.1 } },
    sentado: { nombre: ['Sentado en una silla', 'Seated on a chair'], canales: { pDx: -1.5, pIx: -1.5, rodD: 1.5, rodI: 1.5 } }
};
// Pose nueva desde una base (clave libre la elige quien llama)
export const poseDeBase = (datos, clave, base) => nuevaPose(datos, clave, { ...NEUTRAL, ...(BASES[base] || BASES.dePie).canales });

// ---------- Lados ----------
// Par derecho → izquierdo y si el valor cambia de signo al pasar al otro lado (los «abrir» tienen signos opuestos)
const PARES = [['bDx', 'bIx', 1], ['bDz', 'bIz', -1], ['bDy', 'bIy', -1], ['codoD', 'codoI', 1], ['pDx', 'pIx', 1], ['rodD', 'rodI', 1], ['pDz', 'pIz', 1]];
// Lo del centro que el espejo da vuelta (giros y ladeos)
const CENTRO = ['cy', 'cz', 'rz', 'ry', 'pY', 'pZ'];
const r3 = v => Math.round(v * 1000) / 1000;
// Un canal con el signo dado (número, o base, claves y amplitud de los osciladores)
function conSigno(v, s) {
    if (v === undefined || s === 1) return v === undefined ? v : JSON.parse(JSON.stringify(v));
    if (typeof v === 'number') return r3(-v) || 0;
    const o = JSON.parse(JSON.stringify(v));
    if (typeof o.base === 'number') o.base = r3(-o.base) || 0;
    if (o.k) o.k = o.k.map(([x, y]) => [x, r3(-y) || 0]);
    if (o.osc) o.osc = o.osc.map(z => ({ ...z, amp: r3(-z.amp) || 0 }));
    return o;
}
const poner = (cs, c, v) => { if (v === undefined) delete cs[c]; else cs[c] = v; };
// desde: 'D' copia el derecho al izquierdo; 'I', el izquierdo al derecho
export function copiarLado(datos, ruta, desde = 'D') {
    if (!canalesDe(datos, ruta)) return { datos, i: -1, cambio: false };
    return editar(datos, ruta, cs => {
        for (const [d, i, s] of PARES) {
            const [de, a] = desde === 'D' ? [d, i] : [i, d];
            poner(cs, a, conSigno(cs[de], s));
        }
    });
}
// Espejo: cambia de lado (lo derecho pasa a la izquierda y al revés; los giros del centro se dan vuelta)
export function espejo(datos, ruta) {
    if (!canalesDe(datos, ruta)) return { datos, i: -1, cambio: false };
    return editar(datos, ruta, cs => {
        for (const [d, i, s] of PARES) { const vd = cs[d], vi = cs[i]; poner(cs, i, conSigno(vd, s)); poner(cs, d, conSigno(vi, s)); }
        for (const c of CENTRO) poner(cs, c, conSigno(cs[c], -1));
    });
}
// Suavizar: todas las claves de la ruta con interpolación suave (la de por defecto)
export function suavizar(datos, ruta) {
    const cs = canalesDe(datos, ruta);
    if (!cs || !Object.values(cs).some(v => v && typeof v === 'object' && v.k && v.interp)) return { datos, i: -1, cambio: false };
    return editar(datos, ruta, c2 => { for (const v of Object.values(c2)) if (v && typeof v === 'object' && v.k) delete v.interp; });
}
// Para las pruebas: todos los canales de PARES y CENTRO existen
export const _canalesLados = () => [...PARES.flatMap(p => [p[0], p[1]]), ...CENTRO].every(c => NOMBRES_CANAL.includes(c));
