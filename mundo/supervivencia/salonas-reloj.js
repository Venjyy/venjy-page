// =========================================================
// VENJY · Supervivencia · Salonas: reloj, calibración y ajustes del jugable (puro: no toca el navegador al importarse)
// Diseño en mundo/SALONAS.md §5. Lo usa salonas.js; la prueba está en mundo/tests/salonas.mjs (bloque S3).
// No editable aún: AJUSTES_SALONAS pasa a mundo/datos/salonas.json → juego en S9 (el juego llamará ajustesDe(json)).
// =========================================================

// Valores del jugable (segundos, unidades del mundo 3D y colores). ajustesDe() los mezcla con lo que venga del JSON.
export const AJUSTES_SALONAS = {
    cancion: 'pescador',          // canción de prueba de S3 (musica.json → canciones; se toca aunque sea borrador)
    dificultad: 'normal',         // la que sale marcada al abrir el menú
    teclas: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
    letras: ['D', 'F', 'J', 'K'],
    carriles: {
        ancho: 1.1,               // ancho de cada carril
        largo: 26,                // largo visible de la autopista (hacia el escenario)
        velocidad: 9,             // unidades por segundo que baja una nota
        colores: ['#55c34a', '#d8373a', '#f0d23c', '#3c78d8'], // verde, rojo, amarillo y azul, como los trastes
        fondo: '#1a120c', borde: '#0a0604', linea: '#f2efe6',
        nota: { alto: 0.28, largo: 0.5 }, cola: 0.22, barra: 0.12,
        brillo: 0.12              // segundos que el traste queda encendido después de soltarlo
    },
    // mecer: cuánto baja al pulso; margen: lo que sobra a cada lado de la autopista (en pantallas angostas la cámara se aleja)
    camara: { altura: 4.8, distancia: 6, mira: -7.5, fov: 55, mecer: 0.06, margen: 0.5 },
    escena: { cielo: '#120c18', niebla: [18, 40] },
    audio: { retraso: 0.6, adelanto: 0.2, volBanda: 1, volBajo: 1.15 }, // retraso: segundos antes de la 1.ª nota
    // el bajo baja a volBajo durante seg; muerta = la cuerda muerta (nota MIDI si no hay una nota cerca)
    fallo: { volBajo: 0.12, seg: 0.45, muerta: { vol: 0.9, dur: 0.04, nota: 28 } },
    acordeGracia: 0.06,           // segundos para apretar la segunda tecla de un acorde
    vacioEsFallo: true,           // apretar sin nota corta el combo
    pausa: { cuenta: 3, paso: 0.8 }, // cuenta de 3 al seguir; paso = segundos por número
    final: { cola: 1.5 },         // segundos después de la última nota antes de los resultados
    calibracion: {
        bpm: 100, previos: 4, toques: 8, minimo: 5, // 4 clics de entrada y 8 para tocar; minimo válidos para guardar
        clic: { frec: 1500, frecFuerte: 2000, dur: 0.03, vol: 0.35 },
        rango: 0.25                // ± segundos que acepta el número a mano
    },
    avisoSeg: 0.5                  // cuánto dura el «Perfecto» / «Bien» en pantalla
};

const clona = x => Array.isArray(x) ? x.map(clona) : x && typeof x === 'object'
    ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, clona(v)])) : x;
const mezcla = (base, parcial) => {
    const salida = clona(base);
    if (!parcial || typeof parcial !== 'object' || Array.isArray(parcial)) return salida;
    for (const [k, v] of Object.entries(parcial)) {
        salida[k] = v && typeof v === 'object' && !Array.isArray(v) && salida[k] && typeof salida[k] === 'object' && !Array.isArray(salida[k])
            ? mezcla(salida[k], v) : clona(v);
    }
    return salida;
};
// AJUSTES_SALONAS con lo que traiga `parcial` encima (como reglasDe de salonas-partitura.js)
export function ajustesDe(parcial) { return mezcla(AJUSTES_SALONAS, parcial); }

// Hora del audio (en el reloj de ctx.currentTime) que sonaba por el parlante en el instante perfMs (performance.now()
// o event.timeStamp). Con getOutputTimestamp: contextTime ya es la hora que sale por el parlante (la latencia de
// salida va incluida), así que solo se corre por el tiempo pasado desde performanceTime. Sin él (o si aún no tiene
// datos): currentTime menos outputLatency y baseLatency, corrido igual. `ts` = ctx.getOutputTimestamp() ya leído.
export function horaAudio(ctx, perfMs, ahoraMs, ts = null) {
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
    return ctx.currentTime - (ctx.outputLatency || 0) - (ctx.baseLatency || 0) + (perfMs - ahoraMs) / 1000;
}

// Mediana (la de una lista par es el promedio de las dos del medio); lista vacía → null
export function mediana(lista) {
    const v = lista.filter(Number.isFinite).sort((a, b) => a - b), n = v.length;
    if (!n) return null;
    return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

// Calibración: toques (horas del audio) contra los clics t0 + i × intervalo con i ≥ desde. Cada toque se compara con
// el clic más cercano (positivo = tocaste tarde). Gana la mediana si hay al menos `minimo` toques; si no, null.
export function calibrar(toques, t0, intervalo, { desde = 0, minimo = 1 } = {}) {
    const d = toques.map(t => {
        const i = Math.max(desde, Math.round((t - t0) / intervalo));
        return t - (t0 + i * intervalo);
    }).filter(x => Math.abs(x) <= intervalo / 2);
    return d.length >= minimo ? mediana(d) : null;
}

// Calibración guardada (segundos). El almacenamiento puede no existir o fallar (ventana privada): entonces 0.
export const CLAVE_CALIBRACION = 'venjy-salonas-calibracion';
export function leerCalibracion(almacen, rango = AJUSTES_SALONAS.calibracion.rango) {
    try {
        const v = parseFloat(almacen && almacen.getItem(CLAVE_CALIBRACION));
        return Number.isFinite(v) ? Math.max(-rango, Math.min(rango, v)) : 0;
    } catch (e) { return 0; }
}
export function guardarCalibracion(almacen, seg, rango = AJUSTES_SALONAS.calibracion.rango) {
    const v = Math.max(-rango, Math.min(rango, Number.isFinite(seg) ? seg : 0));
    try { if (almacen) almacen.setItem(CLAVE_CALIBRACION, String(Math.round(v * 1000) / 1000)); } catch (e) { /* sin almacenamiento */ }
    return v;
}
