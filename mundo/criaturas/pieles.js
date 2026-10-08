// =========================================================
// VENJY · Pieles de persona a partir de una descripción
// En vez de pintar cada NPC a mano, se describe: piel, pelo (color y estilo), ojos,
// barba, lunar, ropa, pantalón y zapatillas. Devuelve los pintores que usa
// crearPersona (cuerpo.js) y los accesorios con volumen (melena, gorro, capucha…).
// Lienzos: cabeza 16×16 por cara, torso 16×24 (lados 8×24), brazos y piernas 8×24.
// En las caras laterales la columna 0 es el frente (cuerpo.js espeja la otra).
// =========================================================
import { ajustar } from './cuerpo.js';

const mot = (c, f = 0.14) => (x, y, r) => ajustar(c, 1 - f / 2 + r() * f);
const mezcla = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Largo de cada mechón del pelo desordenado (por columna), como un flequillo que cae sobre la cara
const MECHONES = [9, 7, 4, 3, 6, 8, 5, 3, 7, 8, 4, 3, 5, 7, 9, 10];
const OJO = { 3: 'blanco', 4: 'iris', 11: 'iris', 12: 'blanco' };

export function pielDe(d) {
    const P = d.piel, H = d.pelo.color, estilo = d.pelo.estilo;
    const pelo = mot(H, 0.22);
    const buzz = (x, y, r) => ajustar(mezcla(H, P, 0.35), 0.85 + r() * 0.25);
    const piel = mot(P, 0.07);
    const barba = d.barba ? mot(ajustar(H, 1.05), 0.12) : null;

    // ¿Hay pelo en la cara frontal en (x, y)?
    function peloFrente(x, y) {
        switch (estilo) {
            case 'muy corto': return y <= 1 || ((x === 0 || x === 15) && y <= 3);
            case 'corto': return y <= 2 || (y === 3 && (x <= 1 || x >= 14)) || ((x === 0 || x === 15) && y <= 5);
            case 'ordenado': return y <= 2 || (y === 3 && (x >= 9 || x <= 1)) || ((x <= 1 || x >= 14) && y <= 5);
            case 'largo': return y <= 2 || (y === 3 && (x <= 5 || x >= 10)) || x <= 1 || x >= 14;
            case 'desordenado': {
                const ojo = y >= 6 && y <= 8 && ((x >= 2 && x <= 5) || (x >= 10 && x <= 13));
                return y <= 2 || ((x === 0 || x === 15) && y <= 9) || (!ojo && y < MECHONES[x]);
            }
        }
        return y <= 2;
    }
    const cabeza = {
        frente: (x, y, r) => {
            if (peloFrente(x, y)) return estilo === 'muy corto' ? buzz(x, y, r) : pelo(x, y, r);
            // Barba completa y arreglada: bigote, mentón y patillas, con la boca entre medio
            if (barba) {
                if (y === 12 && x >= 6 && x <= 9) return [146, 80, 70];
                if ((y === 10 && x >= 5 && x <= 10) || (y >= 11 && x >= 1 && x <= 14 && !(y === 15 && (x <= 2 || x >= 13)))) return barba(x, y, r);
                if ((x <= 1 || x >= 14) && y >= 7) return barba(x, y, r);
            }
            if (y === 5 && ((x >= 3 && x <= 5) || (x >= 10 && x <= 12))) return ajustar(H, 0.9);  // cejas
            if (d.ojosRojos && y === 6 && ((x >= 3 && x <= 4) || (x >= 11 && x <= 12))) return ajustar(P, 0.82); // párpados caídos
            if (y === 7 && OJO[x]) {
                if (OJO[x] === 'blanco') return d.ojosRojos ? [222, 122, 120] : [240, 240, 236];
                return d.ojosRojos ? mezcla(d.ojos, [200, 40, 40], 0.45) : d.ojos;
            }
            if (d.lunar && x === 3 && y === 9) return [70, 44, 34];
            if (x >= 7 && x <= 8 && (y === 8 || y === 9)) return ajustar(P, x === 7 ? 0.86 : 0.94);  // nariz
            if (y === 11 && x >= 6 && x <= 9) return [150, 82, 72];                                // boca
            return piel(x, y, r);
        },
        lado: (x, y, r) => {
            const atras = { 'muy corto': 12, corto: 10, ordenado: 9, largo: 4, desordenado: 6 }[estilo] ?? 10;
            const hasta = { 'muy corto': 5, corto: 9, ordenado: 9, largo: 15, desordenado: 11 }[estilo] ?? 9;
            if (y <= 2 || (x >= atras && y <= hasta) || (estilo === 'desordenado' && x <= 3 && y <= 5)) return estilo === 'muy corto' ? buzz(x, y, r) : pelo(x, y, r);
            if (barba && ((y >= 10 && x <= 7) || (x >= 6 && x <= 7 && y >= 6))) return barba(x, y, r);
            if (x >= 7 && x <= 8 && y >= 7 && y <= 9) return ajustar(P, 0.84);                  // oreja
            return piel(x, y, r);
        },
        atras: (x, y, r) => {
            const hasta = { 'muy corto': 6, corto: 11, ordenado: 11, largo: 15, desordenado: 13 }[estilo] ?? 11;
            if (y <= hasta) return estilo === 'muy corto' ? buzz(x, y, r) : pelo(x, y, r);
            return piel(x, y, r);
        },
        arriba: estilo === 'muy corto' ? buzz : pelo,
        abajo: barba || piel
    };

    // ---------------------------------------------------------
    // Ropa
    // ---------------------------------------------------------
    const R = d.ropa, C = R.color;
    const pant = mot(d.pantalon, 0.12);
    const cuadros = (x, y, r) => { // camisa de leñador: cuadros rojo y negro
        const a = (x >> 1) & 1, b = (y >> 1) & 1;
        const c = a && b ? [40, 22, 22] : a || b ? ajustar(C, 0.62) : C;
        return ajustar(c, 0.92 + r() * 0.14);
    };
    const tela = R.tipo === 'camisa cuadros' ? cuadros : mot(C, 0.14);
    const largoTorso = R.tipo === 'polera ancha' ? 24 : 21;
    function torsoFrente(x, y, r) {
        if (y >= largoTorso) return pant(x, y, r);
        switch (R.tipo) {
            case 'poleron':
                if (y <= 1 && x >= 3 && x <= 12) return ajustar(C, 0.72);                             // borde de la capucha
                if ((x === 6 || x === 9) && y >= 2 && y <= 6) return [232, 232, 228];                 // cordones
                if (y >= 13 && y <= 17 && x >= 4 && x <= 11) return ajustar(C, y === 13 ? 0.7 : 0.84); // bolsillo canguro
                if (y >= 19) return ajustar(C, 0.8);                                                  // elástico
                break;
            case 'camisa cuadros':
                if (x === 8 && y % 4 === 3) return [222, 212, 190];                                   // botones
                if (x === 7) return ajustar(cuadros(x, y, r), 0.8);
                if (y <= 1 && ((x >= 4 && x <= 6) || (x >= 9 && x <= 11))) return [40, 22, 22];      // cuello
                break;
            case 'polera ancha': {
                // Cadena dorada en V con un colgante
                const yc = 2 + Math.round((5 - Math.abs(x - 7.5)) * 0.9);
                if (x >= 3 && x <= 12 && y === yc) return [226, 186, 60];
                if (x >= 7 && x <= 8 && y >= 8 && y <= 10) return y === 9 ? [250, 220, 110] : [206, 166, 50];
                if ((x + y * 3) % 11 === 0) return ajustar(C, 0.86);                                  // arrugas
                break;
            }
            default:
                if (y === 0 && x >= 5 && x <= 10) return ajustar(C, 0.75);                             // cuello
                if (R.estampado && y >= 7 && y <= 11 && x >= 4 && x <= 11) {                          // estampado de banda
                    if (y === 7 || y === 11 || x === 4 || x === 11) return R.estampado;
                    if (y === 9 && x >= 6 && x <= 9) return ajustar(R.estampado, 0.8);
                }
        }
        return tela(x, y, r);
    }
    const cuerpo = {
        frente: torsoFrente,
        atras: (x, y, r) => {
            if (y >= largoTorso) return pant(x, y, r);
            if (R.tipo === 'poleron' && y <= 6 && x >= 4 && x <= 11 && !(y === 6 && (x === 4 || x === 11))) return ajustar(C, 0.82); // capucha caída
            if (R.tipo === 'poleron' && y >= 19) return ajustar(C, 0.8);
            return tela(x, y, r);
        },
        lado: (x, y, r) => (y >= largoTorso ? pant(x, y, r) : tela(x, y, r)),
        arriba: tela
    };
    // Mangas: largas (polerón), arremangadas (camisa) o cortas
    const manga = R.tipo === 'poleron' ? 'larga' : R.tipo === 'camisa cuadros' ? 'arremangada' : 'corta';
    const brazoP = (x, y, r) => {
        if (manga === 'larga') return y >= 21 ? piel(x, y, r) : y >= 19 ? ajustar(C, 0.8) : tela(x, y, r);
        if (manga === 'arremangada') return y >= 15 ? piel(x, y, r) : y === 14 ? ajustar(C, 0.7) : tela(x, y, r);
        return y >= (R.tipo === 'polera ancha' ? 10 : 7) ? piel(x, y, r) : tela(x, y, r);
    };
    const brazo = { frente: brazoP, abajo: piel, arriba: tela };
    // Zapatillas
    const Z = d.zapatillas || 'blancas';
    const zapato = (x, y, r) => {
        if (Z === 'jordan') { // rojas con panel blanco y suela blanca
            if (y === 23) return [236, 236, 232];
            if (y === 21 && x >= 2 && x <= 5) return [240, 240, 236];
            if (y === 22 && x === 6) return [20, 20, 20];
            return ajustar([196, 28, 36], 0.92 + r() * 0.12);
        }
        if (Z === 'botas') return ajustar([98, 66, 40], 0.85 + r() * 0.2);
        if (Z === 'negras') return y === 23 ? [220, 220, 216] : ajustar([30, 30, 34], 0.9 + r() * 0.2);
        return y === 23 ? [196, 196, 192] : ajustar([238, 238, 236], 0.95 + r() * 0.06);
    };
    const pierna = {
        frente: (x, y, r) => (y >= 21 ? zapato(x, y, r) : pant(x, y, r)),
        abajo: (x, y, r) => zapato(x, 23, r),
        arriba: pant
    };

    // Accesorios con volumen (los arma amigos.js)
    const extras = [];
    if (estilo === 'largo') extras.push({ tipo: 'melena', color: H });
    if (estilo === 'desordenado') extras.push({ tipo: 'mechones', color: H });
    if (R.tipo === 'poleron') extras.push({ tipo: 'capucha', color: ajustar(C, 0.82) });
    if (d.gorro) extras.push({ tipo: 'gorro', color: d.gorro });
    return { cabeza, cuerpo, brazo, pierna, extras };
}
