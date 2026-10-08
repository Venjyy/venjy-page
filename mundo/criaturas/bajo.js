// =========================================================
// VENJY · El bajo de Salonas (WebAudio, todo sintetizado)
// Tres riffs originales con el sonido de Primus: bajo nasal y metálico, slap y pop muy
// marcados, notas fantasma, tapping, glissandos, rasgueo tipo flamenco y armónicos,
// sobre una batería seca y saltarina. Las melodías son propias (no son temas reales).
// Se programa con un reloj de look-ahead y rota de riff cada ~35 s.
// =========================================================
import { cuandoHayaAudio, audioMundo, sonando, bufferRuido } from './cuerpo.js';

const hz = m => 440 * Math.pow(2, (m - 69) / 12);

// Notas MIDI del bajo de 5 cuerdas: B0 23, E1 28, A1 33, D2 38, G2 43
// Cada nota: [paso, tipo, nota, duración en pasos, nota final o acorde]
// tipos: s slap · p pop · g fantasma · t tapping · d glissando (nota → nota2) · r rasgueo (acorde) · a armónico
export const RIFFS = [
    {
        nombre: 'Gallo cósmico', bpm: 150, sub: 4, pasos: 14, vueltas: 24, // 7/8
        bajo: [
            [0, 's', 28, 2], [2, 'g', 28, 1], [3, 'p', 40, 1], [4, 's', 31, 2], [6, 's', 32, 1], [7, 'p', 44, 1],
            [8, 's', 33, 2], [10, 'g', 33, 1], [11, 'd', 33, 2, 36], [13, 'p', 38, 1]
        ],
        // cada 4 vueltas, el final cambia por un rasgueo
        variante: [[0, 's', 28, 2], [2, 'g', 28, 1], [3, 'p', 40, 1], [4, 's', 31, 2], [6, 's', 32, 1], [7, 'p', 44, 1],
            [8, 's', 33, 1], [9, 'p', 45, 1], [10, 'r', 28, 3, [28, 35, 40, 43]], [13, 'g', 28, 1]],
        bateria: { k: [0, 6, 8], s: [4, 11], h: [0, 2, 4, 6, 8, 10, 12], t: [] }
    },
    {
        nombre: 'Tapping del topo', bpm: 120, sub: 4, pasos: 20, vueltas: 14, // 5/4
        bajo: [
            [0, 't', 40, 1], [1, 't', 47, 1], [2, 't', 52, 1], [3, 't', 47, 1],
            [4, 't', 39, 1], [5, 't', 46, 1], [6, 't', 51, 1], [7, 't', 46, 1],
            [8, 't', 38, 1], [9, 't', 45, 1], [10, 't', 50, 1], [11, 't', 45, 1],
            [12, 't', 37, 1], [13, 't', 44, 1], [14, 't', 49, 1], [15, 'a', 56, 1],
            [16, 's', 23, 1], [17, 'p', 35, 1], [18, 'g', 23, 1], [19, 'd', 35, 1, 28]
        ],
        variante: [
            [0, 't', 40, 1], [1, 't', 47, 1], [2, 't', 52, 1], [3, 't', 47, 1],
            [4, 't', 41, 1], [5, 't', 48, 1], [6, 't', 53, 1], [7, 't', 48, 1],
            [8, 't', 40, 1], [9, 't', 47, 1], [10, 't', 52, 1], [11, 'a', 59, 1],
            [12, 'a', 64, 3], [16, 's', 23, 1], [17, 'p', 35, 1], [18, 's', 24, 1], [19, 'p', 36, 1]
        ],
        bateria: { k: [0, 10, 14], s: [8, 18], h: [0, 4, 8, 12, 16], t: [16, 17] }
    },
    {
        nombre: 'Pescador de sapos', bpm: 100, sub: 4, pasos: 32, vueltas: 7, // 4/4, dos compases
        bajo: [
            [0, 's', 28, 1], [1, 'g', 28, 1], [2, 'p', 40, 1], [3, 'g', 28, 1], [4, 's', 28, 1], [6, 's', 29, 1], [7, 'p', 41, 1],
            [8, 's', 28, 2], [10, 'r', 28, 2, [28, 35, 40, 43]], [12, 's', 23, 2], [14, 'p', 35, 1], [15, 's', 24, 1],
            [16, 's', 28, 1], [18, 'p', 43, 1], [19, 'p', 42, 1], [20, 's', 28, 2], [22, 'a', 52, 4],
            [26, 'd', 40, 4, 28], [30, 'r', 28, 1, [28, 35, 40]], [31, 'g', 28, 1]
        ],
        variante: [
            [0, 's', 28, 1], [1, 'g', 28, 1], [2, 'p', 40, 1], [3, 'g', 28, 1], [4, 's', 31, 1], [5, 'p', 43, 1], [6, 's', 32, 1], [7, 'p', 44, 1],
            [8, 's', 33, 2], [10, 'r', 33, 2, [33, 40, 45, 48]], [12, 's', 23, 2], [14, 'p', 35, 1], [15, 's', 24, 1],
            [16, 's', 28, 1], [17, 'g', 28, 1], [18, 'p', 40, 1], [19, 'p', 39, 1], [20, 'p', 38, 1], [21, 'p', 37, 1], [22, 's', 28, 2],
            [24, 'd', 28, 6, 52], [30, 'p', 52, 1], [31, 'g', 28, 1]
        ],
        bateria: { k: [0, 3, 8, 11, 16, 19, 24], s: [4, 12, 20, 28], h: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], t: [29, 30, 31] }
    }
];

export function crearBajo() {
    let nodos = null;   // cadena de audio (cuando exista el contexto)
    let riff = 0, vuelta = 0, paso = 0, siguiente = 0, reloj = null, activo = false;
    const eventos = []; // notas programadas: { t, tipo, nota } (para animar a Salonas)

    cuandoHayaAudio(({ ctx, master }) => {
        // Salida: volumen por distancia → paneo → master del mundo
        const salida = ctx.createGain(); salida.gain.value = 0;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) { salida.connect(pan); pan.connect(master); } else salida.connect(master);
        // Bajo: distorsión suave + formante nasal (pico en ~850 Hz) + presencia metálica
        const sat = ctx.createWaveShaper();
        const curva = new Float32Array(1024);
        for (let i = 0; i < curva.length; i++) { const x = i / 511.5 - 1; curva[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
        sat.curve = curva;
        const nasal = ctx.createBiquadFilter(); nasal.type = 'peaking'; nasal.frequency.value = 850; nasal.Q.value = 1.6; nasal.gain.value = 10;
        const metal = ctx.createBiquadFilter(); metal.type = 'peaking'; metal.frequency.value = 2600; metal.Q.value = 1.2; metal.gain.value = 5;
        const bajoBus = ctx.createGain(); bajoBus.gain.value = 0.55;
        bajoBus.connect(sat); sat.connect(nasal); nasal.connect(metal); metal.connect(salida);
        const bateriaBus = ctx.createGain(); bateriaBus.gain.value = 0.5;
        bateriaBus.connect(salida);
        nodos = { ctx, salida, pan, bajoBus, bateriaBus };
    });

    // ---------------------------------------------------------
    // Instrumentos
    // ---------------------------------------------------------
    function cuerda(t, nota, dur, { brillo = 2400, q = 9, ataque = 0.002, vol = 0.5, cola = 0.25, onda = 'sawtooth', hasta = null } = {}) {
        const { ctx, bajoBus } = nodos;
        const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
        o1.type = onda; o2.type = 'square';
        o1.frequency.setValueAtTime(hz(nota), t); o2.frequency.setValueAtTime(hz(nota) * 1.003, t);
        if (hasta !== null) { // glissando
            o1.frequency.exponentialRampToValueAtTime(hz(hasta), t + dur * 0.9);
            o2.frequency.exponentialRampToValueAtTime(hz(hasta) * 1.003, t + dur * 0.9);
        }
        const mezcla2 = ctx.createGain(); mezcla2.gain.value = 0.35;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
        f.frequency.setValueAtTime(brillo, t);
        f.frequency.exponentialRampToValueAtTime(Math.max(180, brillo * 0.16), t + 0.18); // el «twang»
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t);
        env.gain.linearRampToValueAtTime(vol, t + ataque);
        env.gain.exponentialRampToValueAtTime(vol * 0.45, t + 0.08);
        env.gain.setValueAtTime(vol * 0.45, t + Math.max(0.09, dur));
        env.gain.exponentialRampToValueAtTime(0.0001, t + dur + cola);
        o1.connect(f); o2.connect(mezcla2); mezcla2.connect(f); f.connect(env); env.connect(bajoBus);
        const fin = t + dur + cola + 0.02;
        o1.start(t); o2.start(t); o1.stop(fin); o2.stop(fin);
    }
    function chasquido(t, frec, vol, largo = 0.018) { // el golpe del pulgar o el tirón de la cuerda
        const { ctx, bajoBus } = nodos;
        const n = ctx.createBufferSource(); n.buffer = bufferRuido(ctx);
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = frec; f.Q.value = 1.4;
        const e = ctx.createGain();
        e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + largo);
        n.connect(f); f.connect(e); e.connect(bajoBus);
        n.start(t, Math.random()); n.stop(t + largo + 0.01);
    }
    function tocar(t, tipo, nota, dur, extra) {
        if (tipo === 's') { cuerda(t, nota, dur, { brillo: 3200, q: 10, vol: 0.6 }); chasquido(t, 2200, 0.5); }
        else if (tipo === 'p') { cuerda(t, nota, dur, { brillo: 5200, q: 14, vol: 0.5, cola: 0.18 }); chasquido(t, 3800, 0.45, 0.012); }
        else if (tipo === 'g') { cuerda(t, nota, 0.03, { brillo: 420, q: 2, vol: 0.4, cola: 0.03 }); chasquido(t, 1400, 0.35, 0.025); }
        else if (tipo === 't') cuerda(t, nota, dur, { brillo: 2000, q: 6, ataque: 0.008, vol: 0.38, cola: 0.12, onda: 'triangle' });
        else if (tipo === 'd') { cuerda(t, nota, dur, { brillo: 2800, q: 11, vol: 0.55, cola: 0.2, hasta: extra }); chasquido(t, 2200, 0.4); }
        else if (tipo === 'a') { // armónico: casi una campana
            const { ctx, bajoBus } = nodos;
            const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(nota);
            const e = ctx.createGain();
            e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.32, t + 0.004);
            e.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
            o.connect(e); e.connect(bajoBus); o.start(t); o.stop(t + dur + 0.65);
        } else if (tipo === 'r') { // rasgueo tipo flamenco: ráfaga de notas casi juntas, ida y vuelta
            const acorde = extra || [nota];
            for (let k = 0; k < 3; k++) {
                const orden = k % 2 ? [...acorde].reverse() : acorde;
                orden.forEach((n, i) => cuerda(t + k * 0.055 + i * 0.011, n, dur * 0.6, { brillo: 3600, q: 7, vol: 0.28, cola: 0.15 }));
                chasquido(t + k * 0.055, 2600, 0.3);
            }
        }
    }
    function bombo(t) {
        const { ctx, bateriaBus } = nodos;
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        const e = ctx.createGain(); e.gain.setValueAtTime(0.9, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        o.connect(e); e.connect(bateriaBus); o.start(t); o.stop(t + 0.25);
    }
    function ruido(t, tipo, frec, q, vol, largo) {
        const { ctx, bateriaBus } = nodos;
        const n = ctx.createBufferSource(); n.buffer = bufferRuido(ctx);
        const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = frec; f.Q.value = q;
        const e = ctx.createGain(); e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + largo);
        n.connect(f); f.connect(e); e.connect(bateriaBus); n.start(t, Math.random()); n.stop(t + largo + 0.01);
    }
    function caja(t) { // caja seca y apretada
        ruido(t, 'bandpass', 2000, 0.9, 0.55, 0.11);
        const { ctx, bateriaBus } = nodos;
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
        const e = ctx.createGain(); e.gain.setValueAtTime(0.35, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        o.connect(e); e.connect(bateriaBus); o.start(t); o.stop(t + 0.1);
    }
    const charles = t => ruido(t, 'highpass', 7500, 0.7, 0.16, 0.035);
    function tom(t, k) {
        const { ctx, bateriaBus } = nodos;
        const o = ctx.createOscillator(); o.type = 'sine';
        const f0 = 180 - k * 30;
        o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.18);
        const e = ctx.createGain(); e.gain.setValueAtTime(0.6, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        o.connect(e); e.connect(bateriaBus); o.start(t); o.stop(t + 0.26);
    }

    // ---------------------------------------------------------
    // Secuenciador con look-ahead
    // ---------------------------------------------------------
    const ADELANTO = 0.15;
    function programar() {
        if (!nodos || !activo) return;
        const { ctx } = nodos;
        while (siguiente < ctx.currentTime + ADELANTO) {
            const R = RIFFS[riff];
            const dPaso = 60 / R.bpm / R.sub;
            if (siguiente < ctx.currentTime - 0.05) siguiente = ctx.currentTime + 0.05; // se atrasó (pestaña oculta)
            const notas = (vuelta % 4 === 3 && R.variante) ? R.variante : R.bajo;
            for (const [p, tipo, nota, dur, extra] of notas) {
                if (p !== paso) continue;
                tocar(siguiente, tipo, nota, dur * dPaso, extra);
                eventos.push({ t: siguiente, tipo, nota });
            }
            const b = R.bateria;
            if (b.k.includes(paso)) bombo(siguiente);
            if (b.s.includes(paso)) caja(siguiente);
            if (b.h.includes(paso)) charles(siguiente);
            const it = b.t.indexOf(paso);
            if (it >= 0 && vuelta % 2 === 1) tom(siguiente, it);
            siguiente += dPaso;
            paso++;
            if (paso >= R.pasos) {
                paso = 0; vuelta++;
                if (vuelta >= R.vueltas) { vuelta = 0; riff = (riff + 1) % RIFFS.length; siguiente += 60 / RIFFS[riff].bpm; } // respiro entre riffs
            }
        }
        if (eventos.length > 64) eventos.splice(0, eventos.length - 64);
    }

    function encender() {
        if (activo || !nodos) return;
        activo = true;
        paso = 0; vuelta = 0;
        siguiente = nodos.ctx.currentTime + 0.1;
        reloj = setInterval(programar, 25);
        programar();
    }
    function apagar() {
        if (!activo) return;
        activo = false;
        clearInterval(reloj); reloj = null;
    }

    return {
        // d: distancia al jugador; lado: -1 (izquierda) a 1 (derecha) respecto de la cámara
        actualizar(d, lado) {
            const a = audioMundo();
            if (!a || !nodos) return;
            const vol = sonando() ? 0.5 * Math.pow(Math.max(0, 1 - d / 34), 1.4) : 0;
            const t = nodos.ctx.currentTime;
            nodos.salida.gain.setTargetAtTime(vol, t, 0.3);
            if (nodos.pan) nodos.pan.pan.setTargetAtTime(Math.max(-0.7, Math.min(0.7, lado * 0.7)), t, 0.1);
            if (vol > 0.001 && d < 36) encender();
            else if (d > 40 || !sonando()) apagar();
        },
        // Notas que ya sonaron desde la última consulta (para animar los golpes)
        sacarEventos() {
            const a = audioMundo();
            if (!a || !eventos.length) return [];
            const ahora = a.ctx.currentTime, listos = [];
            while (eventos.length && eventos[0].t <= ahora) listos.push(eventos.shift());
            return listos;
        },
        // Fase del pulso (0-1) y nombre del riff que suena
        get pulso() {
            const a = audioMundo();
            if (!a || !activo) return 0;
            const R = RIFFS[riff];
            return ((a.ctx.currentTime * R.bpm / 60) % 1 + 1) % 1;
        },
        get sonando() { return activo; },
        get riff() { return RIFFS[riff].nombre; }
    };
}
