// =========================================================
// VENJY · Supervivencia · cómo se agarra cada objeto (mano en 1.ª persona y cuerpo en 3.ª)
// Sin DOM ni Three: lo leen mano.js (1.ª persona) y pose-jugador.js (3.ª), y el Estudio (pestaña Objetos)
// para mostrar los valores reales. El código trae los valores por tipo; mundo/datos/objetos-mano.json los
// cambia por tipo o por objeto (posición en bloques, rotación en GRADOS, escala). Lo que falte usa el código.
// Orden: valor del tipo en el código → `tipos[tipo]` del JSON → ajuste del objeto en el código →
// `objetos[clave]` del JSON. Esquema: estudio/esquemas/objetos-mano.schema.json
// =========================================================
import { cargarDatos } from '../datos/cargador.js';

export const TIPOS = ['objeto', 'herramienta', 'bloque'];
export const VISTAS = ['mano1', 'mano3'];

// mano1: la malla dentro del pivote de la mano en primera persona (mano.js, crearMalla)
// mano3: el grupo en la punta del brazo del cuerpo (pose-jugador.js); `mango` va aparte, no se edita
export const AGARRE_1P_MALLA = {
    objeto: { pos: [0, 0, 0], rot: [0, -0.55, 0], escala: 0.5 },
    herramienta: { pos: [0, 0, 0], rot: [0, -Math.PI / 2 + 0.35, 0.65], escala: 0.5 },
    bloque: { pos: [0, 0, 0], rot: [0, Math.PI / 4, 0], escala: 1.1 },
    // Modelos 3D (modelos-mano.js): el mástil hacia +X del modelo apunta hacia delante y un poco arriba
    modelo: { pos: [0, 0, 0], rot: [0, Math.PI / 2 + 0.25, 0.25], escala: 0.34 }
};
export const AGARRE = {
    objeto: { pos: [0, -0.68, 0.08], rot: [0, -Math.PI / 2, 0], escala: 0.55, mango: [-0.32, -0.32] },
    herramienta: { pos: [0, -0.68, 0.08], rot: [Math.PI / 4, -Math.PI / 2, 0], escala: 0.62, mango: [-0.36, -0.36] },
    bloque: { pos: [0, -0.78, 0.12], rot: [0, Math.PI / 4, 0], escala: 1.4 },
    // Los modelos 3D van colgados del torso (COLGAR en modelos-mano.js); esto solo vale si no tienen colgar
    modelo: { pos: [0, -0.68, 0.08], rot: [0, 0, 0], escala: 0.5 }
};
// Ajustes por objeto que ya traía el código (clave en minúscula, como las del JSON)
export const AJUSTE_OBJETO = {
    mano1: {
        cana: { pos: [0, 0.1, -0.15] }, // la caña va más adelante en la mano: sin esto queda pegada al cuerpo
        // Instrumentos 3D (modelos-mano.js): el cuerpo cerca de la mano y el mástil hacia delante y arriba
        guitarra: { pos: [-0.1, 0.12, 0.1], rot: [0, Math.PI / 2 + 0.3, 0.45], escala: 0.4 },
        teclado: { pos: [-0.12, 0.12, 0.05], rot: [0.3, 0.35, 0.1], escala: 0.45 },
        tambor: { pos: [-0.1, 0.1, 0.05], rot: [0.5, 0, 0.1], escala: 0.55 }
    },
    // Instrumentos 3D colgados del torso (en coordenadas de `cuerpo`, no del brazo): ver COLGAR en modelos-mano.js
    mano3: {
        // Armas del combate (modelos-mano.js → ARMAS). Katana: en la mano, medida desde el hombro como los demás objetos
        // (la muñeca está a 0,75); vaina: en coordenadas de `cuerpo` (desde los pies), en la cadera izquierda, la boca
        // adelante y la punta hacia atrás y abajo
        katana: { pos: [0, -0.68, 0.0], rot: [0, 0, 0], escala: 1 },
        vaina_katana: { pos: [0.3, 0.78, 0.16], rot: [-0.35, Math.PI, 0.12], escala: 1 },
        guitarra: { pos: [0.05, 0.86, 0.2], rot: [0, 0, 0.42], escala: 1 },
        teclado: { pos: [0, 0.8, 0.22], rot: [0, 0, 0.12], escala: 1 },
        tambor: { pos: [0, 0.62, 0.32], rot: [0.5, 0, 0], escala: 1 }
    }
};

const RAD = Math.PI / 180;
let datos = null;
let version = 0;
if (typeof location !== 'undefined') cargarDatos('objetos-mano').then(d => { if (d) { datos = d; version++; } });

// Estudio (?estudio): cambia el JSON ya cargado; mano.js y pose-jugador.js se reacomodan al notar la versión nueva
export function aplicarDatosVivos(d) { datos = d; version++; }
export const versionObjetosMano = () => version;
// Para pruebas en Node
export function fijarDatosObjetosMano(d) { datos = d; version++; }

const unir = (a, o) => (o ? { ...a, pos: o.pos || a.pos, rot: o.rot ? o.rot.map(g => g * RAD) : a.rot, escala: o.escala ?? a.escala } : a);

// -> { pos, rot (radianes), escala [, mango] }. `clave`: la de OBJETOS (CANA, PICO_MADERA…) en cualquier caja, o null.
export function agarre(vista, clave, tipo) {
    const tabla = vista === 'mano1' ? AGARRE_1P_MALLA : AGARRE;
    const k = clave ? String(clave).toLowerCase() : null;
    let a = tabla[tipo] || tabla.objeto;
    a = unir(a, datos && datos.tipos && datos.tipos[tipo] && datos.tipos[tipo][vista]);
    const ajuste = k && AJUSTE_OBJETO[vista][k];
    if (ajuste) a = { ...a, ...ajuste };
    return unir(a, k && datos && datos.objetos && datos.objetos[k] && datos.objetos[k][vista]);
}
