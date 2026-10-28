// =========================================================
// VENJY · Estudio · B4c: momentos especiales de momentos/*.js a mundo/datos/escenas.json (y sus gestos a poses.json)
// node estudio/migrar-momentos.mjs [--escribir]      (sin --escribir solo cuenta qué haría)
// Corre momento() de cada módulo y guarda el guion ya calculado como escena «guion» `momento-<clave>` con
// dispara { tipo: 'momento', persona: <clave> } (y skin en las variantes de pareja: `momento-lona-venjy`, `momento-venjy-lona`),
// DISENO §40 decisión 3. Los gestos propios van a poses.json con la clave delante (`andy-victoria`); `yaw` pasa a canales;
// las chispas, los objetos pegados a la mano y los sonidos, al catálogo; lo que se mueve entre manos, crece o se dibuja con
// textura propia (el tronco de Boris, el cofre de Braulio, el sombrero de Lalo, la bufanda de Lona...) va a `codigo` con sus
// `marcas` (mundo/supervivencia/codigo-escenas/momento-*.js). Nuevo en este paso: `rapidez` de la escena (decisión 20) y el
// interp por clave (decisión 21).
// Solo añade claves: lo que ya existe no se toca. Los textos no llevan `revisado`.
// Prueba: node mundo/tests/escenas-momentos.mjs (paridad cuadro a cuadro con el JS).
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatear } from './formato.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.join(aqui, '..', 'mundo', 'datos');
const r10 = x => Math.round(x * 1e10) / 1e10;
const PI = Math.PI;
const seno = (amp, frec, fase) => ({ forma: 'sin', amp, frec, ...(fase !== undefined ? { fase } : {}) });
const absn = (amp, frec, pot) => ({ forma: 'abs', amp, frec, ...(pot !== undefined ? { pot } : {}) });
const osc = (base, ...o) => ({ base, osc: o });
const K = (k, interp) => ({ k, ...(interp ? { interp } : {}) });
// Cuadrada de paso fijo: alto en los pares, bajo en los impares (floor(t / paso) % 2)
const alterna = (alto, bajo, paso, desde, hasta) => K(Array.from({ length: hasta - desde + 1 }, (_, n) => [r10((desde + n) * paso), (desde + n) % 2 === 0 ? alto : bajo]), 'paso');

// ---- Bufanda y abrazo de Lona, y de Venjy: se derivan del gesto de JS evaluado en sus quiebres ----
// Cada canal lleva claves solo donde su función quiebra (entre dos claves la curva es suave): los brazos y el paso, con el peso
// k = env(u, 0, 1, 0.2); la cabeza, con env(u, 0, 1, 0.1) y, en la pareja, el beso (0,5-0,8) que la baja y la sube
const K_PESO = [0, 0.2, 0.8, 1], K_CABEZA = [0, 0.1, 0.9, 1], K_BESO = [0, 0.1, 0.5, 0.6, 0.7, 0.8, 0.9, 1], K_VENJY_BESO = [0, 0.2, 0.5, 0.6, 0.7, 0.8, 1];
const CANALES_ABRAZO = ['bDx', 'bDz', 'bIx', 'bIz', 'pz', 'rz', 'cx', 'cy', 'cz'];
const abrazoDe = (fn, i, bpsDe) => {
    const canales = {};
    for (const c of CANALES_ABRAZO) {
        const k = bpsDe(c).map(u => [u, r10(fn(u, 0, i)[c] ?? 0)]);
        if (k.every(x => x[1] === 0)) continue;
        canales[c] = K(k);
    }
    return { reloj: 'u', canales };
};

// Por momento: gestos propios (poses.json), y lo que no son los gestos: efectos, sonidos, objetos, yaw, marcas, codigo
const env = (a, b, r, v) => [[a, 0], [a + r, v], [b - r, v], [b, 0]];
const TABLA = {
    andy: {
        gestos: {
            // Un brazo arriba y el otro abajo, cambiando cada 0,4 s; cadera de lado a lado y saltito cada 0,8 s
            victoria: { reloj: 't', canales: {
                bDx: alterna(-2.8, -0.25, 0.4, 0, 30), bDz: alterna(-0.3, 0.05, 0.4, 0, 30),
                bIx: alterna(-0.25, -2.8, 0.4, 0, 30), bIz: alterna(0.05, 0.3, 0.4, 0, 30),
                rz: osc(0, seno(0.1, PI / 0.8)), cy: osc(0, seno(0.25, PI / 0.8)), cx: -0.15, salto: osc(0, absn(0.22, PI / 0.8, 2))
            } }
        },
        // Chispas sobre las cabezas en la pose de victoria
        efectos: () => [[11.2, 'chispa', { alto: 2.5, mas: [-0.3, 0, 0], tam: 0.3 }], [11.6, 'chispa', { alto: 2.5, mas: [0.3, 0, 0], tam: 0.3 }]]
    },
    boris: {
        gestos: {
            // Hacha armada sobre la cabeza (0,9-2,5), cae sobre el tronco en 3,0 y vuelve
            tajo: { reloj: 't', canales: { bDx: K([[0.9, -0.6], [2.5, -2.95], [3.0, -0.75]]), bIx: K([[0.9, -0.6], [2.5, -2.95], [3.0, -0.75]]), bDz: 0.15, bIz: -0.15,
                inc: osc(0, { forma: 'sin', amp: 0.2, frec: PI, en: { k: [[2.6, 0], [3.4, 1]], interp: 'lineal' } }) } },
            aplaude: { reloj: 't', canales: { bDx: -1.45, bIx: -1.45, bDz: osc(0.16, seno(0.1, 14)), bIz: osc(-0.16, seno(-0.1, 14)), cx: 0.1 } },
            juega: { reloj: 't', canales: { bIx: osc(-1.1, seno(0.06, 22)), bIz: -0.3, bDx: osc(-0.3, seno(0.08, 12)), bDz: osc(-0.2, seno(0.12, 12, PI / 2)), cx: 0.25, inc: 0.1 } }
        },
        // Chispas chicas cada ~0,8 s entre los dos mientras juegan
        efectos: () => [9.6, 10.4, 11.2, 12.0].map(t => [t, 'chispa', { alto: 1.3, tam: 0.22 }]),
        marcas: { parte: 3.0 },
        codigo: true
    },
    braulio: {
        gestos: {
            cava: { reloj: 't', canales: { cx: 0.4, inc: 0.6, pDx: -0.6, pIx: -0.6, y: 0.13, bDx: osc(-0.55, seno(0.35, 8)), bIx: osc(-0.55, seno(-0.35, 8)), bDz: 0.12, bIz: -0.12 } },
            recibe: { reloj: 't', canales: { cx: 0.1, bDx: -1.2, bDz: 0.1 } },
            oreja: { reloj: 't', canales: { cx: -0.1, cz: 0.2, cy: -0.25, bDx: -2.7, bDz: 0.2 } }
        },
        // Para cavar se ponen hombro con hombro mirando al mismo lado; en 6,0 se vuelven a mirar para el cofre
        yaw: { n: K([[0.8, 0], [1.4, PI / 2], [5.6, PI / 2], [6.2, 0]]), j: K([[0.8, 0], [1.4, -PI / 2], [5.6, -PI / 2], [6.2, 0]]) },
        // Arena: una chispa entre los dos cada 0,6 s, de un lado y del otro
        efectos: () => Array.from({ length: 9 }, (_, k) => [1.0 + 0.6 * k, 'chispa', { alto: 0.25, mas: [k % 2 ? 0.2 : -0.2, 0, 0], tam: 0.16, vida: 0.4 }]),
        marcas: { aparece: 6.0, arriba: 6.5, abre: 6.6, toma: 7.0, da: 9.4, entregada: 10.4 },
        codigo: true
    },
    conejeros: {
        gestos: {
            // Círculo en el aire con el brazo derecho; la cabeza sigue la mano
            dibuja: { reloj: 't', canales: { bDx: osc(-1.3, seno(0.15, 2.2, PI / 2)), bDz: osc(0.15, seno(0.3, 2.2)), bIx: -0.15, bIz: -0.1, cx: osc(0.2, seno(0.05, 2.2)), cy: osc(0, seno(0.2, 2.2)) } },
            // Pose congelada con un temblor cuadrado (un programa colgado): cada 0,1 s salta entre dos valores
            lag: { reloj: 't', canales: { bDx: -2.0, bDz: 0.5, bIx: 0.2, bIz: 0.4, pDx: -0.3, pIx: -0.1, inc: 0.15, rz: alterna(-0.12, 0.12, 0.1, 86, 113), cx: alterna(-0.2, 0.3, 0.1, 86, 113) } },
            golpecito: { reloj: 't', canales: { bDx: -1.6, bDz: 0.05, inc: 0.3, pDx: -0.3, pIx: -0.3, y: 0.034, cx: 0.1 } }
        },
        // Chispa y golpe en el hombro de Conejeros, en la punta de la mano del jugador
        efectos: () => [[11.3, 'chispa', { en: { q: 'j', mano: 'D' } }]],
        sonidos: () => [[11.3, 'golpe']],
        marcas: { capa1: 3.0, capa2: 4.2, capa3: 5.2 },
        codigo: true
    },
    hadad: {
        gestos: {
            presenta: { reloj: 't', canales: { bDx: -1.5, bDz: -0.6, bIx: -0.9, bIz: 0.2, cy: 0.2, cz: 0.12 } },
            // Come con la derecha: la mano sube a la boca dos veces ((1 + sen) / 2 entre -0,25 y -1,45)
            come: { reloj: 't', canales: { bDx: osc(-0.85, seno(-0.6, 5.2)), bDz: osc(0.125, seno(0.125, 5.2)), cx: 0.12 } },
            comeJ: { reloj: 't', canales: { bIx: osc(-0.85, seno(-0.6, 5.2)), bIz: osc(-0.125, seno(-0.125, 5.2)), cx: 0.12 } },
            recibe: { reloj: 't', canales: { bIx: -1.35, bIz: -0.1, cx: 0.1 } },
            pulgar: { reloj: 't', canales: { bDx: osc(-1.6, seno(0.05, 6)), bDz: 0.3, cy: 0.25 } }
        },
        // Dos bolsas: una en la mano de Hadad y, después del pase, otra en la mano izquierda del jugador
        objetos: () => [
            { id: 'bolsa-hadad', dibujo: { caja: [0.32, 0.42, 0.12], pix: 'bolsa' }, en: { q: 'n', hueso: 'brazoD', mas: [0, -0.7, 0.12] }, desde: 3.6, hasta: 9.6 },
            { id: 'bolsa-tuya', dibujo: { caja: [0.32, 0.42, 0.12], pix: 'bolsa' }, en: { q: 'j', hueso: 'brazoI', mas: [0, -0.7, 0.12] }, desde: 9.6, hasta: 12.2 }
        ],
        efectos: () => [[12.4, 'chispa', { alto: 1.6, tam: 0.3 }]]
    },
    lalo: {
        gestos: {
            saca: { reloj: 'u', canales: { bDx: K([[0.5, -2.6], [1, -1.3]], 'lineal'), bDz: K([[0.5, 0.45], [1, 0.2]], 'lineal'), cx: -0.1 } },
            cruza: { reloj: 't', canales: { bDx: -0.3, bDz: 0.85, bIx: -0.3, bIz: -0.85, cx: 0.05 } },
            ala: { reloj: 't', canales: { bDx: -2.5, bDz: 0.5, bIx: -2.5, bIz: -0.5, cx: 0.1 } },
            ahya: { reloj: 't', canales: { bDx: -0.5, bDz: 0.85, bIx: -0.5, bIz: -0.85, cx: osc(0.12, seno(0.12, 2.2)) } },
            recupera: { reloj: 't', canales: { bDx: -1.5, bDz: 0.2, cx: 0.1 } },
            asiente: { reloj: 't', canales: { cx: osc(0.08, { forma: 'pos', amp: 0.3, frec: 3 }) } }
        },
        marcas: { sale: 4.5, mano: 6.0, cabezaJ: 7.6, vuelve: 14.6, llega: 15.6 },
        codigo: true
    },
    lucho: {
        gestos: {
            apunta: { reloj: 't', canales: { bDx: -1.5, bDz: 0.05, bIx: -1.1, bIz: -0.45, cy: osc(0, seno(0.35, 1.6)) } },
            revive: { reloj: 't', canales: { inc: 0.3, pDx: -0.3, pIx: -0.3, y: 0.034, cx: 0.35, bDx: osc(-1.3, seno(0.06, 9)), bDz: 0.2, bIx: osc(-1.3, seno(0.06, 9, 1)), bIz: -0.2 } },
            cae: { reloj: 't', canales: { y: -0.62, pDx: -1.45, pIx: -1.45, inc: 0.15, bDx: 0.3, bDz: -0.15, bIx: -0.9, bIz: -0.2, cx: 0.4 } },
            // Subida suave hasta el choque en 13,0 y bajada pareja (lineal) entre 13,4 y 14,0
            choque: { reloj: 't', canales: { bDx: K([[12.2, -0.4], [13, -1.45], [13.4, -1.45, 'lineal'], [14, -0.4]]), bDz: K([[12.2, 0.1], [13, 0.15], [13.4, 0.15, 'lineal'], [14, 0.1]]), cx: -0.1 } }
        },
        // Espalda con espalda: los dos miran hacia el lado contrario hasta 6,8; se dan vuelta entre 6,8 y 7,6
        yaw: { n: K([[6.8, PI], [7.6, 0]]), j: K([[6.8, PI], [7.6, 0]]) },
        // Chispas de la barra de revivir
        efectos: () => [8.0, 9.0, 10.0].map(t => [t, 'chispa', { alto: 1.1, tam: 0.22 }])
    },
    moises: {
        gestos: {
            // Agachado para armar bolas: torso inclinado 0,6 con piernas compensadas; manos juntas girando en círculo
            arma: { reloj: 't', canales: { inc: 0.6, pDx: -0.6, pIx: -0.6, y: r10(0.75 * (1 - Math.cos(0.6))), bDx: osc(-0.6, seno(0.12, 5)), bIx: osc(-0.6, seno(0.12, 5)),
                bDz: osc(0.22, seno(0.15, 5, PI / 2)), bIz: osc(-0.22, seno(-0.15, 5, PI / 2)), cx: 0.35 } },
            senala: { reloj: 't', canales: { bDx: osc(-1.0, seno(0.05, 6)), bDz: -0.75, cx: 0.1, cy: -0.5 } },
            sombrero: { reloj: 't', canales: { bDx: -2.6, bDz: 0.45, cx: 0.1 } }
        },
        marcas: { baja: 2.5, medio: 4.0, alta: 5.5, cara: 6.5 },
        codigo: true
    },
    nacho: {
        gestos: {
            asa: { reloj: 't', canales: { bDx: osc(-0.55, seno(0.06, 6)), bDz: 0.15, bIx: -0.3, bIz: -0.1, cx: 0.25 } },
            recibe: { reloj: 't', canales: { bIx: -1.35, bIz: -0.1, cx: 0.1 } },
            // Echado un poco hacia atrás, una mano en la guata, la otra en la rodilla y sacudones
            carcajada: { reloj: 't', canales: { inc: osc(-0.12, seno(0.02, 17)), bDx: osc(-0.75, seno(0.05, 17)), bDz: 0.6, bIx: -0.25, bIz: -0.2, cx: -0.4, rz: osc(0, seno(0.03, 17)), salto: osc(0, absn(0.04, 17)) } },
            // El vaso sube hasta chocar con el otro en 14,2 (suave) y baja entre 14,9 y 15,6 (lineal)
            brinda: { reloj: 't', canales: { bDx: K([[13.6, -0.6], [14.2, -1.2], [14.9, -1.2, 'lineal'], [15.6, -0.6]]), bDz: K([[13.6, 0.1], [14.2, 0.15], [14.9, 0.15, 'lineal'], [15.6, 0.1]]), cx: -0.2 } }
        },
        // Durante la carcajada los dos giran ~45° hacia afuera, para no quedar cara a cara
        yaw: { n: K(env(9.4, 13.6, 0.5, 0.75)), j: K(env(9.4, 13.6, 0.5, -0.75)) },
        // La espátula y los vasos van pegados a la mano (el filete y el plato, que viajan, van en `codigo`)
        objetos: () => [
            { id: 'espatula-plancha', dibujo: { caja: [0.22, 0.03, 0.2], color: '#a0a6ad' }, en: { q: 'n', hueso: 'brazoD', mas: [0, -0.86, 0.12] }, desde: 0, hasta: 6.4 },
            { id: 'espatula-mango', dibujo: { caja: [0.05, 0.16, 0.05], color: '#6b4a2b' }, en: { q: 'n', hueso: 'brazoD', mas: [0, -0.72, 0.12] }, desde: 0, hasta: 6.4 },
            { id: 'vaso-nacho', dibujo: { caja: [0.12, 0.18, 0.12], color: '#f2c230' }, en: { q: 'n', hueso: 'brazoD', mas: [0, -0.75, 0.12] }, desde: 13.6, hasta: 15.6 },
            { id: 'vaso-tuyo', dibujo: { caja: [0.12, 0.18, 0.12], color: '#f2c230' }, en: { q: 'j', hueso: 'brazoD', mas: [0, -0.75, 0.12] }, desde: 13.6, hasta: 15.6 }
        ],
        marcas: { vuelo: 3.0, vueloFin: 3.6, plato: 6.4, pase: 7.6, entregado: 8.2, retira: 12.2 },
        codigo: true
    },
    pony: {
        gestos: {
            tira: { reloj: 't', canales: { cx: -0.15, inc: -0.1, bDx: osc(-1.3, seno(0.04, 22)), bIx: osc(-1.3, seno(-0.04, 22)), bDz: 0.2, bIz: -0.2, y: osc(0, absn(0.05, 6)) } },
            ayuda: { reloj: 't', canales: { cx: -0.1, inc: -0.08, bDx: osc(-1.2, seno(0.25, 5)), bIx: osc(-1.2, seno(0.25, 5)), bDz: 0.2, bIz: -0.2 } },
            // Abraza el salmón de lado; de puntillas entre 10,8 y 13,8
            abraza: { reloj: 't', canales: { cx: -0.1, bDx: -1.3, bIx: -1.3, bDz: 0.5, bIz: -0.5, pz: 0.15, y: K(env(10.8, 13.8, 0.6, 0.12)) } },
            choque: { reloj: 't', canales: { cx: -0.1, bDx: -1.9, bDz: 0.45 } }
        },
        objetos: () => [{ id: 'cana', dibujo: { caja: [0.05, 1.5, 0.05], color: '#6b4a2a' }, en: { q: 'n', hueso: 'brazoD', mas: [0, -0.7, 0.12] }, desde: 0.6, hasta: 7.0 }],
        marcas: { sale: 6.5, llega: 7.5, suelta: 14.0 },
        codigo: true
    },
    salonas: {
        gestos: {
            // Solo de bajo: la derecha rasguea rápido, la izquierda se desliza por el mástil, cabeza y torso se mueven
            solo: { reloj: 't', canales: { bDx: osc(-0.62, absn(-0.14, 14)), bDz: osc(0.3, seno(0.05, 14)), bIx: -1.05, bIz: osc(0.5, seno(0.22, 2.4)), cx: osc(0.1, absn(0.12, 4.8)), rz: osc(0, seno(0.05, 2.6)), inc: 0.04 } },
            // Salto de los tres (la altura sube y baja una vez dentro del tramo)
            brinco: { reloj: 'u', canales: { salto: osc(0, { forma: 'sin', amp: 0.5, frec: PI, en: 'u' }) } },
            rockera: { reloj: 't', canales: { bDx: osc(-2.8, seno(0.1, 16)), bDz: -0.3, bIx: -0.1, bIz: -0.1, cx: -0.3 } }
        },
        marcas: { empieza: 3.6 },
        codigo: true
    },
    lona: {
        gestos: {
            teje: { reloj: 't', canales: { cx: 0.35, bDx: osc(-1.1, seno(-0.08, 18)), bIx: osc(-1.1, seno(0.08, 18)), bDz: 0.4, bIz: -0.4 } },
            tejeRapido: { reloj: 't', canales: { cx: 0.35, bDx: osc(-1.1, seno(-0.06, 28)), bIx: osc(-1.1, seno(0.06, 28)), bDz: 0.4, bIz: -0.4 } },
            toca: { reloj: 't', canales: { cx: 0.3, bDx: osc(-0.75, seno(0.05, 6)), bIx: osc(-0.75, seno(-0.05, 6)), bDz: 0.3, bIz: -0.3 } }
        },
        // abrazoL se deriva del gesto de JS (varía con quién es y con la pareja): ver `abrazos` abajo
        marcas: p => p ? { inicio: 0.8, fin: 6.6, entrega: 6.8 } : { inicio: 1.0, fin: 6.8, entrega: 7.0 },
        codigo: true
    },
    venjy: {
        gestos: {
            teclea: { reloj: 't', canales: { cx: 0.3, bDx: osc(-1.15, seno(-0.15, 16)), bDz: 0.25, bIx: osc(-1.15, seno(0.15, 16)), bIz: -0.25 } },
            sostiene: { reloj: 't', canales: { bDx: -1.25, bDz: 0.45, bIx: -1.25, bIz: -0.45, cx: 0.25 } },
            alza: { reloj: 'u', canales: { bDx: -2.85, bDz: 0.25, bIx: -2.85, bIz: -0.25, cx: -0.35, salto: osc(0, { forma: 'abs', amp: 0.15, frec: 3 * PI, en: 'u' }) } },
            tomados: { reloj: 't', canales: { bIx: -0.2, bIz: 0.3 } },
            tomadosJ: { reloj: 't', canales: { bDx: -0.2, bDz: -0.3 } },
            flor: { reloj: 't', canales: { bDx: -1.2, bDz: 0.2, cx: 0.15 } },
            recibe: { reloj: 't', canales: { bDx: -1.1, bDz: -0.15, cx: 0.1 } }
        },
        // Pareja: de lado (mismo sentido) entre 0,6 y 1,2; vuelven a mirarse entre 6,8 y 7,8
        yawPareja: { n: K([[0.6, 0], [1.2, -PI / 2], [6.8, -PI / 2], [7.8, 0]]), j: K([[0.6, 0], [1.2, PI / 2], [6.8, PI / 2], [7.8, 0]]) },
        marcas: p => p ? { aparece: 8.2, pasa: 10.0, llega: 10.4 } : { aparece: 5.5, creceFin: 5.9, vuela: 8.0, llega: 9.0, alza: 12.8, alzaFin: 13.6, choque: 13.0 },
        codigo: true
    }
};

// Variantes por skin: cada una es una escena completa (DISENO §40 decisión 2)
const VARIANTES = [
    ...['andy', 'boris', 'braulio', 'conejeros', 'hadad', 'lalo', 'lona', 'lucho', 'moises', 'nacho', 'pony', 'salonas', 'venjy'].map(k => ({ k, base: null, nombre: 'momento-' + k, dispara: { tipo: 'momento', persona: k } })),
    { k: 'lona', base: 'venjy', nombre: 'momento-lona-venjy', dispara: { tipo: 'momento', persona: 'lona', skin: 'venjy' }, pareja: true },
    { k: 'venjy', base: 'lona', nombre: 'momento-venjy-lona', dispara: { tipo: 'momento', persona: 'venjy', skin: 'lona' }, pareja: true }
];
export const MOMENTOS = VARIANTES;

// Nombres que ya usa una bienvenida (poses.json): el del momento lleva «-momento» al final
const COLISIONES = new Set(['hadad-recibe', 'hadad-pulgar']);
const nom = (k, n) => (COLISIONES.has(`${k}-${n}`) ? `${k}-${n}-momento` : `${k}-${n}`);
// Nombre del gesto en poses.json (y, para lona y venjy, cuál de las variantes de un mismo gesto de JS)
function nombreGesto(k, nombre, q, pareja) {
    if (k === 'lona' && nombre === 'abrazoL') return `lona-abrazo${pareja ? 'Pareja' : ''}${q === 'j' ? 'J' : ''}`;
    if (k === 'venjy' && nombre === 'abrazoL') return `venjy-abrazo${q === 'j' ? 'J' : ''}`;
    if (k === 'venjy' && nombre === 'tomados' && q === 'j') return 'venjy-tomadosJ';
    return nom(k, nombre);
}

// Guion de un momento -> { escena, gestos }
export function escenaDeMomento(v, mod) {
    const cfg = TABLA[v.k];
    const g = mod.momento({ base: v.base });
    const propios = Object.keys(g.gestos || {});
    const gestos = Object.fromEntries(Object.entries(cfg.gestos).map(([n, d]) => [nom(v.k, n), d]));
    // abrazoL de Lona y de Venjy: claves evaluadas en los quiebres del gesto de JS
    if (propios.includes('abrazoL')) {
        for (const q of ['n', 'j']) {
            const nombre = nombreGesto(v.k, 'abrazoL', q, v.pareja);
            if (!gestos[nombre]) gestos[nombre] = abrazoDe(g.gestos.abrazoL, { j: q === 'j' }, v.k === 'lona'
                ? c => (['bDx', 'bDz', 'bIx', 'bIz', 'pz'].includes(c) ? K_PESO : v.pareja ? K_BESO : K_CABEZA)
                : c => (c === 'cy' && q !== 'j' ? K_VENJY_BESO : K_PESO));
        }
        // Lona normal: n y j son iguales; se guarda uno solo
        if (v.k === 'lona' && !v.pareja) { delete gestos['lona-abrazoJ']; }
    }
    const pista = Object.fromEntries(Object.entries(g.pista).map(([q, tr]) => [q, tr.map(([n, a, b]) => {
        const nombre = propios.includes(n) ? (v.k === 'lona' && n === 'abrazoL' && !v.pareja ? 'lona-abrazo' : nombreGesto(v.k, n, q, v.pareja)) : n;
        return [nombre, r10(a), r10(b)];
    })]));
    // Un tramo que se pisa con el siguiente (Nacho: la carcajada con el brindis) termina donde empieza el otro: validar no deja
    // superponer y el motor ya mandaba el primero. Cambia solo la salida suave de ese gesto (decisión 22 en DISENO §40).
    for (const tr of Object.values(pista)) for (let i = 0; i + 1 < tr.length; i++) if (tr[i][2] > tr[i + 1][1]) tr[i][2] = tr[i + 1][1];
    // Gestos que solo usa la variante: los demás no se guardan (la otra variante de Lona no usa tejeRapido, por ejemplo)
    const usados = new Set(Object.values(pista).flat().map(x => x[0]));
    const gestosUsados = Object.fromEntries(Object.entries(gestos).filter(([n]) => usados.has(n)));
    const marcas = typeof cfg.marcas === 'function' ? cfg.marcas(v.pareja) : cfg.marcas;
    const yaw = v.pareja && cfg.yawPareja ? cfg.yawPareja : cfg.yaw;
    const escena = {
        tipo: 'guion',
        dispara: v.dispara,
        T: g.T,
        r: g.r,
        ...(g.rapidez ? { rapidez: g.rapidez } : {}),
        lineas: g.lineas.map(l => ({ q: l.q, a: l.a, d: l.d, texto: l.texto })),
        pista,
        ...(g.golpes && g.golpes.length ? { golpes: g.golpes } : {}),
        ...(g.corazones && g.corazones.length ? { corazones: g.corazones } : {}),
        ...(cfg.sonidos ? { sonidos: cfg.sonidos().map(([t, ...x]) => [r10(t), ...x]) } : {}),
        ...(cfg.efectos ? { efectos: cfg.efectos().map(([t, ...x]) => [r10(t), ...x]) } : {}),
        ...(cfg.objetos ? { objetos: cfg.objetos() } : {}),
        ...(yaw ? { yaw } : {}),
        ...(marcas ? { marcas } : {}),
        ...(cfg.codigo ? { codigo: v.pareja && v.k === 'lona' ? 'momento-lona-pareja' : v.pareja ? `momento-${v.k}-pareja` : `momento-${v.k}` } : {})
    };
    return { escena, gestos: gestosUsados };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    globalThis.window ??= { addEventListener() {} };
    const aviso = console.warn;
    console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
    const escenas = JSON.parse(fs.readFileSync(path.join(DATOS, 'escenas.json'), 'utf8'));
    const poses = JSON.parse(fs.readFileSync(path.join(DATOS, 'poses.json'), 'utf8'));
    let nuevas = 0, ya = 0, gnuevos = 0;
    for (const v of VARIANTES) {
        if (escenas.escenas[v.nombre]) { ya++; continue; }
        const { escena, gestos } = escenaDeMomento(v, await import(`../mundo/supervivencia/momentos/${v.k}.js`));
        escenas.escenas[v.nombre] = escena;
        for (const [n, d] of Object.entries(gestos)) if (!poses.gestos[n]) { poses.gestos[n] = d; gnuevos++; }
        nuevas++;
    }
    console.warn = aviso;
    if (process.argv.includes('--escribir')) {
        fs.writeFileSync(path.join(DATOS, 'escenas.json'), formatear(escenas));
        fs.writeFileSync(path.join(DATOS, 'poses.json'), formatear(poses));
        console.log(`escenas.json: ${nuevas} momentos añadidos (${ya} ya estaban) · poses.json: ${gnuevos} gestos`);
    } else console.log(`${nuevas} momentos por añadir (${ya} ya estaban), ${gnuevos} gestos; --escribir para guardar`);
}
