// =========================================================
// VENJY · Supervivencia online · Interpolación con búfer
// Los estados de red (jugadores, monstruos, jefes) llegan a 2-5 Hz con la hora del emisor.
// Se guardan los últimos y se dibuja RETRASO ms en el pasado, interpolando en línea recta entre
// los dos estados que rodean ese momento: el movimiento sale parejo aunque los mensajes lleguen
// a saltos. Los relojes de los equipos no coinciden: el desfase (llegada − emisión) se estima con
// el menor visto, que es la latencia mínima más la diferencia de relojes, y sube despacio si cambia.
// El retraso se adapta al ritmo de los mensajes: 200 ms a 5 Hz; a 2 Hz (monstruos lejanos) unos
// 600 ms, porque con menos retraso que el intervalo el dibujo se queda sin datos y da saltos.
// =========================================================
export const RETRASO = 200;
const MAX = 24;

export class Bufer {
    constructor() {
        this.l = [];
        this.desfase = null;
        this.intervalo = 200; // promedio entre mensajes (ms)
    }
    get retraso() { return Math.max(RETRASO, Math.min(800, this.intervalo * 1.1 + 50)); }

    // t: reloj del emisor (ms); e: estado plano ({ x, y, z, yaw, … })
    agregar(t, e, ahora = performance.now()) {
        const d = ahora - t;
        if (this.desfase === null || d < this.desfase) this.desfase = d;
        else this.desfase += (d - this.desfase) * 0.01;
        const u = this.l[this.l.length - 1];
        if (u && t <= u.t) return; // llegó desordenado: se descarta
        if (u) this.intervalo += (Math.min(1500, t - u.t) - this.intervalo) * 0.3;
        this.l.push({ t, e });
        if (this.l.length > MAX) this.l.shift();
    }

    get vacio() { return !this.l.length; }
    get ultimo() { return this.l.length ? this.l[this.l.length - 1].e : null; }
    // Milisegundos (en reloj local) desde que llegó el último estado
    edad(ahora = performance.now()) { return this.l.length ? ahora - (this.l[this.l.length - 1].t + this.desfase) : Infinity; }

    // Estado a dibujar ahora: { a, b, k } con a y b los estados que rodean el momento y k ∈ [0, 1]
    muestra(ahora = performance.now()) {
        const l = this.l;
        if (!l.length) return null;
        const t = ahora - this.desfase - this.retraso;
        if (t <= l[0].t) return { a: l[0].e, b: l[0].e, k: 0 };
        for (let i = l.length - 1; i > 0; i--) {
            if (l[i - 1].t <= t) {
                if (t >= l[i].t) return { a: l[i].e, b: l[i].e, k: 0 }; // pasado el último: se queda quieto
                return { a: l[i - 1].e, b: l[i].e, k: (t - l[i - 1].t) / (l[i].t - l[i - 1].t) };
            }
        }
        return { a: l[0].e, b: l[0].e, k: 0 };
    }

    // Estados de los últimos `ms` (para validar golpes con tolerancia)
    recientes(ms, ahora = performance.now()) {
        const desde = ahora - this.desfase - this.retraso - ms;
        return this.l.filter(s => s.t >= desde).map(s => s.e);
    }
}

export const mezclar = (a, b, k) => a + (b - a) * k;
export function mezclarAngulo(a, b, k) {
    let d = b - a;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return a + d * k;
}
