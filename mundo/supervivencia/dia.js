// =========================================================
// VENJY · Supervivencia · Día y noche
// Día completo de 10 minutos para runs cortas: 6 de día (amanecer a atardecer) y 4 de noche.
// El cielo del creativo (cielo.js) se maneja con fijarHora; las nubes siguen andando.
// Dormir en una cama de noche salta a la mañana y fija el punto de reaparición.
// =========================================================
export const SEG_DIA = 360, SEG_NOCHE = 240, SEG_TOTAL = SEG_DIA + SEG_NOCHE;

// t (0..600 desde el amanecer) -> hora de cielo.js (0 medianoche, 0,25 amanecer, 0,5 mediodía, 0,75 atardecer)
export function horaDe(t) {
    t = ((t % SEG_TOTAL) + SEG_TOTAL) % SEG_TOTAL;
    return t < SEG_DIA ? 0.25 + 0.5 * (t / SEG_DIA) : (0.75 + 0.5 * ((t - SEG_DIA) / SEG_NOCHE)) % 1;
}

export function crearDia({ cielo, inicio = 25 }) {
    cielo.pausado = true;
    cielo.nubesLibres = true;
    const d = {
        t: inicio,   // segundos desde el amanecer del día actual
        dias: 0,     // días completos transcurridos
        get hora() { return horaDe(d.t); },
        // Noche «de monstruos»: el sol bajo el horizonte (como Minecraft, un poco antes y después)
        get esNoche() { const h = horaDe(d.t); return h > 0.77 || h < 0.23; },
        get puedeDormir() { const h = horaDe(d.t); return h > 0.76 || h < 0.24; },
        actualizar(dt) {
            d.t += dt;
            if (d.t >= SEG_TOTAL) { d.t -= SEG_TOTAL; d.dias++; }
            cielo.fijarHora(horaDe(d.t), d.dias);
        },
        // Salta a la mañana siguiente
        amanecer() {
            if (d.t >= SEG_DIA) d.dias++;
            d.t = 2;
            cielo.fijarHora(horaDe(d.t), d.dias);
        },
        serializar: () => ({ t: +d.t.toFixed(1), dias: d.dias }),
        cargar(o) { if (o) { d.t = o.t || 0; d.dias = o.dias || 0; } cielo.fijarHora(horaDe(d.t), d.dias); }
    };
    cielo.fijarHora(horaDe(d.t), 0);
    return d;
}
