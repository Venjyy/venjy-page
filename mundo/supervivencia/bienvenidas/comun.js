// =========================================================
// VENJY · Supervivencia · Bienvenidas (bloque 6c-1): piezas comunes
// Lo importan los módulos bienvenidas/<clave>.js (se cargan con import() al usarse, nunca al iniciar).
// · encadenar(lista, desde): pone tiempos a las frases [q, texto, pausa?] una tras otra ('n' = el Venjy del
//   Inicio, 'j' = tú); cada una dura lo que se alcanza a leer (durLinea de reencuentros.js).
// · secreto(S0) / abrazo(A0) / pareja(P0): bloques de 6b corridos a otro segundo (gestos, pistas y golpes o
//   corazones), para las bienvenidas de relación 3 (saludo secreto, abrazo y recuerdo) y la de pareja.
// Duración según la relación (DISENO-6c.md §2): 1 cordial · 2 corta · 3 larga con secreto, abrazo y recuerdo · pareja.
// =========================================================
import { durLinea } from '../reencuentros.js';
import { MOLDES, desplazar } from '../moldes.js';

export { durLinea };
export const r2 = x => Math.round(x * 100) / 100;
export const t = (es, en) => ({ es, en });

// [[q, texto, pausaAntes?], ...] -> [{ q, a, d, texto }]
export function encadenar(lista, desde = 0.6, pausa = 0.15) {
    let s = desde;
    return lista.map(([q, texto, antes = 0]) => {
        s += antes;
        const l = { q, a: r2(s), d: durLinea(texto), texto };
        s += l.d + pausa;
        return l;
    });
}
export const fin = lineas => { const l = lineas[lineas.length - 1]; return l.a + l.d; };

// Saludo secreto de 6b desde S0 (dura 4.6 s; golpes en +0.8, +1.8, +2.7 y +3.6). Distancia de contacto: 1.3
export const secreto = S0 => ({
    gestos: { secretoB: desplazar('secreto', S0 - 0.4) },
    pista: [['secretoB', r2(S0), r2(S0 + 4.6)]],
    golpes: [0.8, 1.8, 2.7, 3.6].map(x => r2(S0 + x))
});
// Abrazo de 6b desde A0 (dura 4.5 s); con paso más largo para que llegue desde la distancia del secreto (1.3)
export const abrazo = (A0, paso = 1.7) => {
    const f = desplazar('abrazo', A0 - 0.4);
    return { gestos: { abrazoB: (u, x, i) => { const m = f(u, x, i); return { ...m, pz: m.pz * paso }; } }, pista: [['abrazoB', r2(A0), r2(A0 + 4.5)]] };
};
// Abrazo y beso de pareja de 6b desde P0 (dura 6 s; beso de +3.0 a +4.4; corazones en +2.8, +3.8 y +5.0). Distancia 0.9
export const pareja = P0 => ({
    gestos: { parejaB: desplazar('pareja', P0 - 0.4) },
    pista: [['parejaB', r2(P0), r2(P0 + 6.0)]],
    corazones: [2.8, 3.8, 5.0].map(x => r2(P0 + x))
});
export { MOLDES };
