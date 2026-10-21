// =========================================================
// VENJY · Supervivencia · Salonas: reloj, calibración y ajustes del jugable (puro: no toca el navegador al importarse)
// Diseño en mundo/SALONAS.md §5. Lo usa salonas.js; la prueba está en mundo/tests/salonas.mjs (bloque S3).
// No editable aún: AJUSTES_SALONAS pasa a mundo/datos/salonas.json → juego en S9 (el juego llamará ajustesDe(json)).
// =========================================================

// Valores del jugable (segundos, unidades del mundo 3D y colores). ajustesDe() los mezcla con lo que venga del JSON.
export const AJUSTES_SALONAS = {
    cancion: 'sala-ska',           // la que sale marcada al abrir el menú (musica.json → canciones; se toca aunque sea borrador)
    canciones: ['sala-ska', 'sala-garage'], // las que ofrece el menú, en orden (sala de ensayo: canciones 1 y 2)
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
    avisoSeg: 0.5,                 // cuánto dura el «Perfecto» / «Bien» en pantalla
    // ---------- S5: locales, banda, público y cámara (salonas-escena.js; z negativa = hacia el escenario) ----------
    local: 'sala',                 // el local de una canción que no esté en localDe
    localDe: { 'sala-ska': 'sala', 'sala-garage': 'sala' }, // canción → local (bar y festival llegan en S6 y S7)
    banda: {
        // pos: [x, z] sobre el piso del escenario; giro: radianes hacia el centro (0 = mira a la cámara)
        salonas: { pos: [-3.7, -6.8], giro: 0.32 },
        jugador: { pos: [3.7, -6.8], giro: -0.32 },
        conejeros: { pos: [-8.4, -11.5], giro: 0.55, tarima: 0.45 }, // tarima: alto del podio (lo sentado está en salonas-gestos.js)
        amplis: { pos: [7.4, -13], giro: -0.35 },
        baqueta: { pos: [0, -0.06, 0.1], rot: [1.1, 0, 0], largo: 0.55 }, // en la muñeca de Conejeros
        reposoBpm: 90,             // el pulso de la banda en el menú y en los resultados (sin canción)
        saltoCada: 8,              // en el coro, Salonas salta cada tantos pulsos
        carrilK: 10,               // qué tan rápido la mano del bajo sigue al carril (1/s)
        slapSeg: 0.18, falloSeg: 0.45 // lo que dura el golpe del slap y el «uf» del fallo
    },
    // Ánimo del público (−1 abuchea … 1 salta): sube con cada acierto, baja con cada fallo y vuelve a reposo
    publico: { subida: 0.045, bajada: 0.22, reposo: 0.2, vuelta: 0.15, aplaude: 0.35, salta: 0.7, abuchea: -0.25, celebrarSeg: 2.5 },
    // Mientras dura una sección de `secciones` (el solo de Salonas; el puente mientras no haya solos), la cámara se corre hacia Salonas (suma a la posición y a la mira); k = rapidez (1/s)
    camaraSolo: { secciones: ['solo', 'puente'], pos: [-1.1, -0.4, -1.4], mira: [-2.2, 0.6, 0], k: 2.5 },
    locales: {
        sala: {
            cielo: '#17110d', niebla: [22, 45],
            piso: '#5d5a55', pared: '#3b3430', ancho: 22, fondo: 26, alto: 8,
            colchones: ['#6f88a8', '#a86f6f', '#8fa86f', '#b39a62', '#7d6fa8'],
            lampara: { pos: [0, 6.2, -9], color: '#ffd98a', mecer: 0.06 },
            luz: { color: '#ffe6c0', base: 0.9, pulso: 0.12 }, // tinte de todo el local y su latido al pulso
            afiches: 4,
            publico: [],
            intro: { desde: [-6, 2.2, -2], mira: [-3.7, 1.4, -6.8], seg: 2.6 }
        },
        bar: {
            cielo: '#120a14', niebla: [24, 48],
            piso: '#6b4a2e', pared: '#7a3a2c', ancho: 26, fondo: 28, alto: 7,
            tarima: '#3a2618', barra: '#4a2c18',
            barraPos: [8.8, -3], mesas: [[-6, -1.5], [6, -1.5], [-7.5, -5]], // [x, z]; el público se para junto a las mesas
            neon: ['#ff4fb0', '#4fe0ff', '#ffe04f'],
            luz: { color: '#ffc8e0', base: 0.82, pulso: 0.18 },
            publico: ['pony', 'hadad', 'andy', 'nacho', 'lucho', 'braulio'],
            intro: { desde: [9, 3, 4], mira: [0, 1, -7], seg: 2.6 }
        },
        festival: {
            cielo: '#070512', niebla: [30, 70],
            piso: '#26232b', pared: '#111018', ancho: 40, fondo: 34, alto: 14,
            torres: '#8a8a94', pantallas: ['#ff3c6e', '#3cc8ff', '#b4ff3c', '#ffb43c'],
            haces: ['#ff4f4f', '#4f8fff', '#ffe04f', '#c04fff'],
            luz: { color: '#d8d0ff', base: 0.78, pulso: 0.25 },
            multitud: 220, colores: ['#c8503c', '#3c78c8', '#3ca050', '#d2b43c', '#8c50b4', '#e6e6e6', '#303030'],
            humo: 14,
            frente: -3.6, foso: 1.2,  // el escenario termina en z = frente; la multitud está foso más abajo, delante
            multitudZ: [-3.2, 1.2],     // entre qué z se reparte la multitud (a los lados de la autopista)
            torresPos: [10.5, -11],   // [x a cada lado, z] de las torres de luces
            pantallaY: 5,             // altura del centro de las pantallas
            publico: ['pony', 'hadad', 'andy'],
            intro: { desde: [0, 9, 14], mira: [0, 1.5, -8], seg: 3 }
        }
    }
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
