// =========================================================
// VENJY · Caminos con señales (7f-3, parte 1) · solo supervivencia
// Sobre los tramos de RUTA: mojones cada ~100 bloques, carteles de cruce con las distancias a los
// lugares vecinos y un farol en cada cruce. Todo determinista (sale solo de `datos` y del terreno,
// como los decorados): los workers lo recalculan con la misma semilla y los bloques van dentro de
// la malla del chunk, así que no cuestan nada por cuadro. El texto de cada cartel y mojón se
// dibuja en el hilo principal (supervivencia/caminos-carteles.js) y solo a menos de 24 bloques.
// Devuelve { decor: [...], carteles: [{ tipo, x, y, z, texto: { es, en } }] } en coordenadas del
// creativo (el hilo principal suma `dy`).
// =========================================================
import { B } from './texturas.js';
import { RUTA } from './mundo-datos.js';
import { aDecor } from './construcciones.js';

export const NOMBRES_RUTA = {
    spawn: { es: 'Inicio', en: 'Start' },
    casa: { es: 'Casa', en: 'House' },
    registro: { es: 'Registro', en: 'Registry' },
    mina: { es: 'Mina', en: 'Mine' },
    aldea: { es: 'Aldea', en: 'Village' },
    gatera: { es: 'Gatera', en: 'Cat house' },
    correo: { es: 'Correo', en: 'Post office' }
};

export const CAMINOS = {
    cadaMojon: 100,    // bloques de camino entre mojones
    margenMojon: 30,   // un mojón no se pone a menos de esto de un extremo del tramo
    cartelA: 26,       // el cartel de cruce queda a esta distancia (por el camino) del lugar
    maxLado: 14,       // hasta dónde se busca terreno libre al costado del camino
    separacion: 8      // distancia mínima entre dos señales
};

// Dónde se pinta el texto del mojón respecto del pilar (afinar en el navegador). El pilar mide 3 bloques
// (de h+1 a h+3) y el sprite es un cuadro centrado en su posición: sin esto queda medio metido en el pilar.
export const TEXTO_MOJON = {
    arriba: 1.9,       // bloques sobre la cima del pilar hasta el centro del cuadro de texto
    haciaCamino: 1.4   // bloques que se corre el cuadro hacia el camino, para que no lo tape el pilar
};

// Ruta partida en tramos con la longitud acumulada (en bloques) de cada punto
function medirTramos(datos, ESCALA) {
    const salida = [];
    let acum = 0;
    datos.tramos.forEach((px, s) => {
        const pts = px.map(([x, y]) => [(x + 1) * ESCALA, (y + 1) * ESCALA]); // el camino mide 2 celdas: el centro es x+1
        const d = [0];
        for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        salida.push({ a: RUTA[s], b: RUTA[s + 1], pts, d, inicio: acum, largo: d[d.length - 1] });
        acum += d[d.length - 1];
    });
    return salida;
}

export function colocarCaminos(t) {
    const { BW, BD, HT, ES, SUP, datos, ESCALA, NIVEL_AGUA } = t;
    const { W, T } = datos;
    const tramos = medirTramos(datos, ESCALA);
    const carteles = [];
    const decor = [];
    const usados = []; // [x, z] de cada señal: no se apila una sobre otra

    const libre = (x, z) => {
        if (x < 3 || z < 3 || x >= BW - 3 || z >= BD - 3) return false;
        const o = z * BW + x;
        if (ES[o] || SUP[o] === B.CAMINO || SUP[o] === B.TABLONES || HT[o] < NIVEL_AGUA + 1) return false;
        return T[Math.floor(z / ESCALA) * W + Math.floor(x / ESCALA)] !== 'hojas';
    };
    // Punto del tramo a distancia `s` y su dirección (unitaria)
    const puntoEn = (tr, s) => {
        let i = 1;
        while (i < tr.d.length - 1 && tr.d[i] < s) i++;
        const j0 = Math.max(0, i - 3), j1 = Math.min(tr.pts.length - 1, i + 3);
        const dx = tr.pts[j1][0] - tr.pts[j0][0], dz = tr.pts[j1][1] - tr.pts[j0][1];
        const n = Math.hypot(dx, dz) || 1;
        return { x: tr.pts[i][0], z: tr.pts[i][1], dx: dx / n, dz: dz / n };
    };
    // Primer terreno libre al costado del camino (lado +1 o -1) para `ancho` columnas a lo largo del
    // camino (eje dominante). Devuelve { cols, x, z, lado } o null.
    const costado = (p, lado, ancho) => {
        const eje = Math.abs(p.dx) >= Math.abs(p.dz) ? 'x' : 'z';
        const nx = eje === 'x' ? 0 : (p.dz > 0 ? -1 : 1) * lado, nz = eje === 'x' ? (p.dx > 0 ? 1 : -1) * lado : 0;
        let fuera = false;
        for (let k = 1; k <= CAMINOS.maxLado + 4; k++) {
            const x = Math.round(p.x + nx * k), z = Math.round(p.z + nz * k);
            if (x < 3 || z < 3 || x >= BW - 3 || z >= BD - 3) return null;
            if (SUP[z * BW + x] === B.CAMINO) { fuera = false; continue; }
            if (!fuera) { fuera = true; continue; } // un bloque de margen pegado al camino
            const cols = [];
            for (let a = -(ancho >> 1); a <= (ancho >> 1); a++) cols.push([x + (eje === 'x' ? a : 0), z + (eje === 'z' ? a : 0)]);
            if (!cols.every(([cx, cz]) => libre(cx, cz))) continue;
            if (usados.some(([ux, uz]) => Math.hypot(ux - x, uz - z) < CAMINOS.separacion)) continue;
            const hs = cols.map(([cx, cz]) => HT[cz * BW + cx]);
            if (Math.max(...hs) - Math.min(...hs) > 2) continue;
            return { cols, x, z, lado, nx, nz };
        }
        return null;
    };
    const suelo = (x, z) => HT[z * BW + x];
    const delCostado = (p, ancho, preferido = 1) => costado(p, preferido, ancho) || costado(p, -preferido, ancho);

    // ---- Mojones: pilar de piedra con el número del tramo ----
    tramos.forEach((tr, s) => {
        for (let m = CAMINOS.cadaMojon; m <= tr.largo - CAMINOS.margenMojon; m += CAMINOS.cadaMojon) {
            const c = delCostado(puntoEn(tr, m), 1);
            if (!c) continue;
            const [x, z] = c.cols[0], h = suelo(x, z);
            const d = aDecor((poner) => {
                poner(x, h + 1, z, B.LABRADA);
                poner(x, h + 2, z, B.PIEDRA);
                poner(x, h + 3, z, B.LABRADA);
            });
            decor.push(d);
            usados.push([x, z]);
            const desde = Math.round(tr.inicio + m);
            carteles.push({
                tipo: 'mojon', x: x + 0.5 - c.nx * TEXTO_MOJON.haciaCamino, y: h + 4 + TEXTO_MOJON.arriba, z: z + 0.5 - c.nz * TEXTO_MOJON.haciaCamino,
                texto: { es: `Tramo ${s + 1}\n${desde} m`, en: `Section ${s + 1}\n${desde} m` }
            });
        }
    });

    // ---- Cruces: cartel con las distancias y farol del otro lado del camino ----
    for (let s = 1; s < tramos.length; s++) {
        const llega = tramos[s - 1], sale = tramos[s];
        const s0 = Math.max(0, llega.largo - CAMINOS.cartelA);
        const p = puntoEn(llega, s0);
        const c = delCostado(p, 3);
        if (!c) continue;
        const altos = c.cols.map(([x, z]) => suelo(x, z));
        const hMax = Math.max(...altos);
        decor.push(aDecor((poner) => {
            c.cols.forEach(([x, z], i) => {
                if (i === 0 || i === c.cols.length - 1) for (let y = altos[i] + 1; y <= hMax + 2; y++) poner(x, y, z, B.TRONCO);
                poner(x, hMax + 3, z, B.TABLONES);
            });
        }));
        usados.push([c.x, c.z]);
        const A = NOMBRES_RUTA[llega.a], L = NOMBRES_RUTA[llega.b], Z = NOMBRES_RUTA[sale.b];
        const aqui = Math.round(llega.largo - s0), atras = Math.round(s0), adelante = Math.round(aqui + sale.largo);
        const linea = l => `${L[l]} ${aqui} m\n< ${A[l]} ${atras} m\n${Z[l]} ${adelante} m >`;
        carteles.push({ tipo: 'cruce', x: c.x + 0.5, y: hMax + 4.9, z: c.z + 0.5, texto: { es: linea('es'), en: linea('en') } });
        // Farol al otro lado del camino (solo en los cruces: cada emisor amplía la ventana de luz)
        const f = costado(p, -c.lado, 1);
        if (f) {
            const [x, z] = f.cols[0], h = suelo(x, z);
            const farol = aDecor((poner) => {
                for (let y = h + 1; y <= h + 3; y++) poner(x, y, z, B.TRONCO);
                poner(x, h + 4, z, B.PIEDRA_LUMINOSA);
            });
            farol.farol = true; // el único con emisor: solo este amplía la ventana de luz (zonasLuz)
            decor.push(farol);
            usados.push([x, z]);
        }
    }
    return { decor, carteles };
}
