// =========================================================
// VENJY · Supervivencia · Carrera de gatas (7h-1): modelo puro
// «Gran Premio del Living»: seis gatas corren dentro de una sala gigante (escena propia, carrera-escena.js), al estilo
// de un juego de karts. Aquí solo hay números:
//   · la pista: puntos de control 3D (x, y, z en bloques) cerrados en lazo y suavizados (Catmull-Rom), muestreados
//     cada `paso`; cada muestra con posición, rumbo, pendiente, ancho, curvatura y si hay piso (los huecos de los saltos);
//   · la física de una gata: acelerar, frenar, doblar; Espacio salta y, si al caer vas doblando, derrapas: la carga
//     sube por tres niveles (azul, naranja, morado) y al soltar sale un turbo más largo según el nivel; saltos
//     naturales en las crestas, truco en el aire (mini turbo al caer), placas de turbo, paredes con rebote, caer en
//     un hueco (te recoge Lona y vuelves a la pista), choques entre gatas;
//   · avance y vueltas (sin atajos: la gata se proyecta sobre la pista cerca de donde iba), puestos y la IA con
//     tres dificultades (línea de carrera por dentro de las curvas, derrapa en las cerradas, busca los turbos).
// Sin DOM ni THREE: se prueba en Node (mundo/tests/carrera.mjs). Rumbo: yaw 0 mira a +Z; avanzar es x += sin(yaw)·v.
// =========================================================

// Valores base (Estudio → Carrera; mundo/datos/carrera.json los ajusta por clave)
export const CARRERA = {
    nombre: { es: 'Gran Premio del Living', en: 'Living Room Grand Prix' },
    corto: { es: 'Living', en: 'Living room' }, // en el selector de pista del menú
    vueltas: 3,
    cuenta: 3,          // segundos de la cuenta regresiva
    intro: 6,           // segundos del vuelo de cámara por la pista antes de la cuenta
    tope: 420,          // segundos máximos de carrera
    dificultad: 'normal',
    pista: {
        paso: 0.5,      // muestreo (bloques)
        ancho: 9,       // ancho base (bloques); cada punto puede traer el suyo como 4.º número
        // Puntos [x, y, z, ancho?] en bloques sobre el piso del living (y = 0), en orden; la salida en el primero
        // (recta de la alfombra, curva al sofá, subida, el asiento, salto del posabrazos sobre el hueco, bajada,
        //  túnel recto bajo la mesa, horquilla del ovillo, eses de la lámpara y vuelta a la alfombra)
        puntos: [
            [-34, 0, 34], [-6, 0, 36], [24, 0, 34], [44, 0, 24], [52, 0, 6],
            [50, 2.5, -8], [44, 6.5, -19, 8], [32, 7, -25, 8], [21, 7, -26, 8], [12, 8.6, -26, 8],
            [0, 5, -25, 8], [-10, 1.5, -23], [-20, 0, -24], [-34, 0, -26], [-48, 0, -18],
            [-50, 0, 0], [-36, 0, 8], [-50, 0, 18], [-54, 0, 30]
        ],
        // Huecos sin piso: desde el punto `punto` (índice desde 0), `largo` bloques; hay que saltarlos con velocidad
        huecos: [{ punto: 9, largo: 6 }],
        // Placas de turbo: `avance` bloques después del punto, `lado` (-1 izquierda .. 1 derecha), `largo` bloques
        turbos: [{ punto: 1, avance: 4, lado: 0.45, largo: 4 }, { punto: 4, avance: 2, lado: -0.4, largo: 4 }, { punto: 8, avance: 2, lado: 0, largo: 3 }, { punto: 15, avance: 6, lado: 0.4, largo: 4 }],
        // Túneles (bajo la mesa): del punto `desde` al `hasta`; solo se dibujan
        tuneles: [{ desde: 12, hasta: 13 }],
        // Filas de cajas de objetos: `avance` bloques después del punto, `cuantas` cajas a lo ancho (sin el número: objetos.cuantas)
        cajas: [{ punto: 2, avance: 0 }, { punto: 11, avance: 3 }, { punto: 16, avance: 4 }],
        salida: 4,      // bloques antes de la línea donde parte la primera fila
        // Rampa sola: si la pista pasa sobre un mueble que deja subir (`sube` o el tipo en SUBE_TIPOS), sube encima con
        // esta pendiente máxima (alto/largo) y vuelve a bajar; apoyar = 0 lo apaga
        apoyar: 1,
        rampa: 0.35
    },
    // Muebles y adornos del living (carrera-escena.js los dibuja; los del piso no pueden pisar la pista: lo revisa la prueba).
    // x, z = centro; a = ancho (x), f = fondo (z), h = alto (bloques); g = giro en grados (solo los adornos sueltos)
    // (grande a propósito: espacio para alargar la pista en el Estudio con la que ya hay al centro)
    sala: { ancho: 260, fondo: 220, alto: 70, x: -2, z: 4 },
    muebles: [
        { tipo: 'sofa', x: 29, z: -31, a: 42, f: 18, h: 6.8 },      // el asiento queda bajo la pista del sofá
        { tipo: 'mesa', x: -27, z: -25, a: 20, f: 16, h: 9 },       // el túnel pasa por debajo
        { tipo: 'alfombra', x: -6, z: 35, a: 74, f: 18, h: 0.12 },
        { tipo: 'ovillo', x: -37, z: -6, a: 8, f: 8, h: 8, color: '#d8455a' },
        { tipo: 'ovillo', x: 30, z: 12, a: 7, f: 7, h: 7, color: '#4a8ad8' },
        { tipo: 'lampara', x: -24, z: 18, a: 6, f: 6, h: 30 },
        { tipo: 'caja', x: 8, z: 16, a: 12, f: 10, h: 8, g: 12 },
        { tipo: 'caja', x: 64, z: 34, a: 14, f: 12, h: 10, g: -8 },
        { tipo: 'pecera', x: -66, z: 40, a: 8, f: 8, h: 9 },
        { tipo: 'cojin', x: 62, z: -12, a: 10, f: 10, h: 3, color: '#e7b13a', g: 20 },
        { tipo: 'raton', x: 4, z: 4, a: 2, f: 3, h: 1.4, g: 40 },
        { tipo: 'podio', x: -6, z: 55, a: 10, f: 4, h: 3, g: 180 }    // donde suben las tres primeras al final (mira hacia el frente: g)
    ],
    // Cómo se ve el escenario (carrera-escena.js): tipo = living | cocina | patio | techo; colores del piso (y su 2.º
    // color: tablas, baldosas, pasto, tejas), de las paredes (papel mural, azulejos, valla, parapeto) y su detalle, el
    // cielo (ventana o el cielo abierto), el fondo y la niebla, y los colores de los pilares bajo los tramos altos
    escenario: { tipo: 'living', piso: '#96663a', piso2: '#86592f', pared: '#e2cea0', pared2: '#c4a878', techo: '#eee8de', cielo: '#80baec', fondo: '#2a1c14', niebla: '#3a2a20', pilares: ['#aa342e', '#3460a0', '#468246', '#d2aa3c', '#78468c'] },
    // Más pistas (el menú las ofrece después del living; en la sala de espera elige el líder). Cada una con su nombre,
    // escenario, sala, muebles y pista (puntos, huecos, turbos, túneles, cajas; lo que no traiga sale de `pista` de arriba:
    // ancho, paso, salida, rampa). Se editan en el Estudio con el mismo editor (selector «Pista»).
    pistas: {
        cocina: {
            nombre: { es: 'Gran Premio de la Cocina', en: 'Kitchen Grand Prix' }, corto: { es: 'Cocina', en: 'Kitchen' },
            // Sube a la encimera, salta el lavaplatos, baja y pasa bajo la silla
            escenario: { tipo: 'cocina', piso: '#ece8de', piso2: '#3c3c48', pared: '#d6ecea', pared2: '#a8c8c4', techo: '#f2f0ea', cielo: '#9cd2f4', fondo: '#1c2426', niebla: '#2e3a3c', pilares: ['#e8e4d8', '#d84a3a', '#e8c040', '#4a8ad8', '#f2f0ea'] },
            sala: { ancho: 170, fondo: 140, alto: 56, x: 0, z: -2 },
            pista: {
                puntos: [
                    [-27, 0, 48], [0, 0, 49.5], [27, 0, 46.5], [48, 0, 34.5], [57, 0, 13.5], [54, 0, -9],
                    [46.5, 4, -28.5], [36, 10.4, -48, 8], [21, 10.4, -57, 8], [7.5, 10.4, -58.5, 8], [-4.5, 10.4, -58.5, 8],
                    [-16.5, 10.4, -57, 8], [-30, 6, -49.5], [-40.5, 1.5, -36], [-46.5, 0, -18], [-46.5, 0, 7.5],
                    [-38, 0, 22], [-41, 0, 38]
                ],
                huecos: [{ punto: 9, largo: 6 }],
                turbos: [{ punto: 1, avance: 4, lado: -0.4, largo: 4 }, { punto: 6, avance: 6, lado: 0, largo: 4 }, { punto: 10, avance: 4, lado: 0.4, largo: 3 }, { punto: 15, avance: 4, lado: 0, largo: 4 }],
                tuneles: [{ desde: 14, hasta: 15 }],
                cajas: [{ punto: 2, avance: 0 }, { punto: 8, avance: 2 }, { punto: 16, avance: 2 }]
            },
            muebles: [
                { tipo: 'encimera', x: 9, z: -62, a: 62, f: 18, h: 10 },      // la pista corre encima (a mano, como el sofá)
                { tipo: 'refri', x: -64, z: -60, a: 22, f: 18, h: 50 },
                { tipo: 'silla', x: -46.5, z: -5, a: 16, f: 16, h: 10, color: '#b07a48' }, // el túnel pasa por debajo
                { tipo: 'olla', x: 18, z: 13.5, a: 14, f: 14, h: 10 },
                { tipo: 'taza', x: -8, z: 24, a: 7, f: 7, h: 8, color: '#e85a4a' },
                { tipo: 'taza', x: -20, z: 12, a: 6, f: 6, h: 7, color: '#4a8ad8' },
                { tipo: 'alfombra', x: 0, z: 48, a: 56, f: 15, h: 0.12, color: '#4a8a5a' },
                { tipo: 'caja', x: 34, z: -9, a: 10, f: 9, h: 6, g: -10 },
                { tipo: 'raton', x: 0, z: 0, a: 2, f: 3, h: 1.4, g: 20 },
                { tipo: 'podio', x: 0, z: 61, a: 10, f: 4, h: 3, g: 180 }
            ]
        },
        patio: {
            nombre: { es: 'Gran Premio del Patio', en: 'Backyard Grand Prix' }, corto: { es: 'Patio', en: 'Backyard' },
            // Salto sobre la piscina inflable, túnel bajo la banca y eses entre los maceteros
            escenario: { tipo: 'patio', piso: '#5c9e3c', piso2: '#4a8a30', pared: '#c8945a', pared2: '#9a6a3a', techo: '#ffffff', cielo: '#8ec8f2', fondo: '#8ec8f2', niebla: '#cfe6f4', pilares: ['#b4523a', '#c8643e', '#9a4430', '#d8b48a', '#a85a3a'] },
            sala: { ancho: 170, fondo: 150, alto: 20, x: 0, z: 2 },
            pista: {
                puntos: [
                    [-30, 0, 49.5], [-15, 0, 54], [0, 0, 51], [14.5, 0, 45], [30, 0, 46.5], [43.5, 0, 42.5], [52.5, 0, 31.5],
                    [60, 0, 7.5], [52.5, 0, -13.5], [39, 3, -27], [24, 6.5, -36], [12, 4.6, -40.5], [0, 2.2, -42], [-13.5, 0, -40.5],
                    [-33, 0, -37.5], [-52.5, 0, -27], [-57, 0, -6], [-39, 0, 4.5], [-22.5, 0, 12], [-39, 0, 22.5], [-52.5, 0, 36], [-39, 0, 39.5]
                ],
                huecos: [{ punto: 10, largo: 9 }],
                turbos: [{ punto: 2, avance: 6, lado: 0.4, largo: 4 }, { punto: 9, avance: 4, lado: 0, largo: 5 }, { punto: 14, avance: 4, lado: -0.4, largo: 4 }, { punto: 19, avance: 2, lado: 0, largo: 3 }],
                tuneles: [{ desde: 14, hasta: 15 }],
                cajas: [{ punto: 4, avance: 2 }, { punto: 13, avance: 2 }, { punto: 18, avance: 0 }]
            },
            muebles: [
                { tipo: 'piscina', x: 16.5, z: -39, a: 14, f: 16, h: 1.8 },    // bajo el salto
                { tipo: 'banca', x: -41.5, z: -34.5, a: 14, f: 14, h: 10, g: 23, color: '#a06a3a' }, // el túnel pasa por debajo
                { tipo: 'arbol', x: 13.5, z: 10.5, a: 14, f: 14, h: 36 },
                { tipo: 'macetero', x: -10, z: 4, a: 7, f: 7, h: 11, color: '#e05a8a' },
                { tipo: 'macetero', x: -64, z: 16, a: 6, f: 6, h: 9, color: '#f2d040' },
                { tipo: 'macetero', x: -68, z: 52, a: 7, f: 7, h: 11, color: '#8a5ad8' },
                { tipo: 'pelota', x: 37.5, z: 13.5, a: 9, f: 9, h: 9, color: '#e8483a' },
                { tipo: 'cojin', x: 72, z: -30, a: 10, f: 10, h: 3, color: '#4ab86a', g: 10 },
                { tipo: 'raton', x: -7.5, z: 26, a: 2, f: 3, h: 1.4, g: 70 },
                { tipo: 'podio', x: 0, z: 66, a: 10, f: 4, h: 3, g: 180 }
            ]
        },
        techo: {
            nombre: { es: 'Gran Premio del Techo', en: 'Rooftop Grand Prix' }, corto: { es: 'Techo', en: 'Rooftop' },
            // Al atardecer: salto del callejón entre los dos techos, túnel bajo el estanque de agua y los paneles solares
            escenario: { tipo: 'techo', piso: '#a8483a', piso2: '#8a3a30', pared: '#8a8a90', pared2: '#6a6a72', techo: '#ffffff', cielo: '#f2a05a', fondo: '#f2a05a', niebla: '#f6c08a', pilares: ['#a8544a', '#8a8a90', '#b8823a', '#c86a4a', '#6a6a72'], callejon: { x: 6, ancho: 8 } },
            sala: { ancho: 180, fondo: 140, alto: 3, x: 0, z: 4 },
            pista: {
                puntos: [
                    [-33, 0, 45], [-4.5, 0, 46.5], [22.5, 0, 43.5], [46.5, 0, 31.5], [55.5, 0, 9], [48, 0, -13.5],
                    [30, 0, -22.5], [18, 4.5, -27], [12, 6, -28.5], [-3, 4.5, -30], [-13.5, 0, -31.5],
                    [-34.5, 0, -33], [-54, 0, -22.5], [-58.5, 0, 0], [-45, 0, 16.5], [-51, 0, 36]
                ],
                huecos: [{ punto: 8, largo: 10 }],
                turbos: [{ punto: 1, avance: 4, lado: 0, largo: 4 }, { punto: 6, avance: 0, lado: 0, largo: 5 }, { punto: 11, avance: 4, lado: 0.4, largo: 4 }, { punto: 14, avance: 4, lado: -0.4, largo: 3 }],
                tuneles: [{ desde: 12, hasta: 13 }],
                cajas: [{ punto: 2, avance: 2 }, { punto: 10, avance: 4 }, { punto: 14, avance: 0 }]
            },
            muebles: [
                { tipo: 'tanque', x: -57, z: -10.5, a: 18, f: 16, h: 11 },      // el túnel pasa por debajo
                { tipo: 'chimenea', x: 13.5, z: 3, a: 10, f: 10, h: 18 },
                { tipo: 'chimenea', x: -30, z: 4.5, a: 8, f: 8, h: 14 },
                { tipo: 'antena', x: 30, z: 12, a: 6, f: 6, h: 30 },
                { tipo: 'panel', x: 37.5, z: 37.5, a: 16, f: 12, h: 2.4 },       // la pista sube sola encima
                { tipo: 'claraboya', x: -18, z: -12, a: 12, f: 9, h: 2 },
                { tipo: 'caja', x: 62, z: -40, a: 9, f: 8, h: 6, g: 15 },
                { tipo: 'raton', x: -7.5, z: 18, a: 2, f: 3, h: 1.4, g: 10 },
                { tipo: 'podio', x: -4.5, z: 62, a: 10, f: 4, h: 3, g: 180 }
            ]
        }
    },
    gata: {
        vel: 21,        // velocidad máxima (bloques/s)
        acel: 16,
        freno: 30,
        roce: 5,
        atras: 0.3,
        giro: 2.6,      // rad/s a buena velocidad
        gravedad: 40,
        salto: 7,     // impulso del salto (Espacio)
        derrapeGiro: 1.4,   // rad/s base al derrapar (hacia el lado del derrape)
        derrapeMando: 0.9,  // cuánto abre o cierra el derrape el mando
        niveles: [0.75, 1.6, 2.6],      // segundos de carga para azul, naranja, morado
        turbos: [0.55, 1.0, 1.6],       // segundos de turbo de cada nivel
        turbo: 1.4,     // velocidad con turbo (× vel)
        placa: 1.1,     // segundos de turbo de una placa
        truco: 0.6,     // segundos de turbo por un truco en el aire
        pared: 0.55,    // al chocar la pared de frente se queda con esta fracción de la velocidad
        roza: 0.35,     // con un ángulo menor (seno) contra la pared, no choca: se desliza por el borde
        rozaRoce: 0.6,  // cuánto frena por segundo al deslizarse por el borde
        radio: 0.45,    // radio de la gata (choques)
        caida: 1.4,     // segundos hasta que Lona te devuelve a la pista
        vuelve: 14      // bloques antes del hueco donde te deja (para tomar impulso y saltarlo)
    },
    // Corredoras: Mila y Gala usan su modelo del mundo; las demás, su pelaje (carrera-escena.js)
    gatas: [
        { clave: 'mila', nombre: 'Mila', vel: 0.98, acel: 1.06, giro: 1.02 },
        { clave: 'gala', nombre: 'Gala', vel: 1.02, acel: 0.98, giro: 1.0 },
        { clave: 'tigre', nombre: 'Tigre', vel: 1.03, acel: 0.95, giro: 0.96, pelaje: { base: '#d9822b', mancha: '#8a4a14', patron: 'atigrado', panza: '#f2d6a8' } },
        { clave: 'pelusa', nombre: 'Pelusa', vel: 0.96, acel: 1.08, giro: 1.06, pelaje: { base: '#f2f0ea', mancha: '#c9c4ba', patron: 'liso', panza: '#ffffff' }, escala: 1.08 },
        { clave: 'canela', nombre: 'Canela', vel: 1.0, acel: 1.0, giro: 1.04, pelaje: { base: '#efe0c4', mancha: '#5a3e2e', patron: 'siames', panza: '#f6ecd8' } },
        { clave: 'sombra', nombre: 'Sombra', vel: 1.01, acel: 1.02, giro: 0.98, pelaje: { base: '#26232a', mancha: '#3c3742', patron: 'liso', panza: '#2e2a33', ojos: '#f2d024' } }
    ],
    ia: {
        niveles: { facil: 0.84, normal: 0.92, dificil: 0.99 },   // fracción de la velocidad máxima
        mira: 7,        // bloques adelante que mira para doblar
        linea: 0.32,    // se corre hacia el interior de la curva (fracción del medio ancho)
        curva: 9,       // cuánto frena en las curvas (más = frena más)
        derrapa: 0.06,  // curvatura (1/bloques) desde la que derrapa
        error: 0.25,    // ruido en la línea (bloques; solo fácil y normal)
        empuje: 0.05    // ayuda si va muy atrás de ti (fracción de vel)
    },
    // Objetos: salen de las cajas según el puesto (peso `primera` para la que va 1.ª y `ultima` para la última; entre
    // medio se mezclan). La IA también los usa. Tiempos en segundos, distancias en bloques.
    objetos: {
        activos: 1,     // 0 = carrera sin objetos
        cuantas: 4,     // cajas por fila (a lo ancho)
        ruleta: 1.1,    // segundos que gira la ruleta antes de poder usarlo
        reaparece: 3,   // segundos hasta que vuelve una caja tomada
        radioCaja: 0.8,
        gracia: 0.4,    // segundos en que lo lanzado no golpea a quien lo lanzó
        inmune: 1.2,    // después de un golpe, segundos sin recibir otro
        pluma: { nombre: { es: 'Pluma', en: 'Feather' }, primera: 1, ultima: 3, turbo: 1.4, color: '#f4f0e6' },
        ovillo: { nombre: { es: 'Ovillo de lana', en: 'Ball of yarn' }, primera: 3, ultima: 1, vel: 34, vida: 5, radio: 0.7, golpe: 1.1, color: '#d8455a' },
        caja: { nombre: { es: 'Caja de cartón', en: 'Cardboard box' }, primera: 3, ultima: 0.6, vida: 40, radio: 0.9, golpe: 0.9, color: '#c49660' },
        pescado: { nombre: { es: 'Pescado', en: 'Fish' }, primera: 1, ultima: 2, adelante: 22, vida: 12, atrae: 10, fuerza: 3.5, radio: 0.9, come: 1.4, color: '#7ab0d8' },
        hierba: { nombre: { es: 'Hierba gatera', en: 'Catnip' }, primera: 0.4, ultima: 2, alcance: 30, segundos: 3.5, color: '#5ac85a' },
        aspiradora: { nombre: { es: 'Aspiradora de Lona', en: 'Lona\'s vacuum' }, primera: 0, ultima: 1.4, segundos: 1.6, freno: 0.55, salto: 0.7, color: '#c8384a' }
    },
    // Cámara: detrás de tu gata; al cruzar la meta, planos de cine (carrera.js): cámara lenta (solo sin otros jugadores),
    // la cámara se acerca y rodea a tu gata, corte a Lona celebrando en su caja, otra vez tu gata y, a los `alPodio` s, el podio
    camara: {
        distancia: 6, alto: 2.5, mira: 6, fov: 72, fovTurbo: 90, suave: 8,
        alPodio: 5,                                   // segundos desde tu llegada hasta el podio (si no llegaron todas antes)
        lenta: 0.35, lentaSeg: 1,                     // velocidad de la cámara lenta al cruzar (1 = sin) y cuántos segundos reales
        metaDist: 4.2, metaAlto: 1.6, metaGiro: 0.8, metaAcerca: 1.2, metaFov: 60, // rodea a tu gata (giro en rad/s)
        lonaEn: 1.8, lonaSeg: 1.6, lonaDist: 4.5, lonaAlto: 1.1, lonaLado: -0.4, // corte a Lona (lonaEn = 0: sin corte; lado en rad)
        podioDist: 10, podioAlto: 4.2, podioMira: 2.4, podioFov: 60,               // el podio
        podioEntra: 2, podioDesde: 2.2, podioVaiven: 0.45, podioRitmo: 0.35        // entra desde lejos (× distancia) y se mece
    },
    // Gestos de Lona en su caja (carrera-escena.js): bandera al largar, aspiradora y celebrar cuando llega tu gata
    lona: { largada: 1.2, aspiradora: 1.4, salto: 0.35, ritmo: 7, rapidez: 12 },
    // Música (carrera-musica.js): volumen (×), en el menú y la sala, desde tu llegada y en el podio; tempo (×), 
    // tempo extra de la última vuelta (×) y el tema de cada pista (living, cocina, patio, techo o podio)
    musica: { vol: 1, menu: 0.6, meta: 0.5, podio: 1, tempo: 1, ultima: 1.12, temas: { living: 'living', cocina: 'cocina', patio: 'patio', techo: 'techo' } },
    tactil: { autoAcelerar: 1 },
    // Varios jugadores (carrera-red.js): veces por segundo que cada corredor manda su gata y el líder la IA y los objetos
    red: { envios: 12, paquetes: 10, hurra: 0.5 }, // hurra: segundos entre dos hurras del público
    premio: {
        puestos: [[['BACALAO_COCIDO', 4], ['LANA', 3], ['ESMERALDA', 2]], [['BACALAO_COCIDO', 3], ['LANA', 2]], [['BACALAO_COCIDO', 2], ['LANA', 1]]],
        resto: [['LANA', 1]]
    }
};
export const COLORES_NIVEL = ['#4aa8ff', '#ff9a2a', '#c35aff'];
// Temas de música que puede elegir cada pista (están en carrera-musica.js; la prueba revisa que coincidan)
export const TEMAS_MUSICA = ['living', 'cocina', 'patio', 'techo', 'podio'];

const esObj = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    if (!esObj(extra)) return base;
    const r = { ...base };
    for (const k of Object.keys(extra)) {
        if (esObj(base[k]) && esObj(extra[k])) r[k] = fundir(base[k], extra[k]);
        else if (extra[k] !== undefined && extra[k] !== null) r[k] = extra[k];
    }
    return r;
}
// Reglas = base + JSON (lo que falte, del código). Las gatas del JSON se funden por clave con las del código.
// `pista` = clave de la pista ('living' o una de `pistas`): su nombre, escenario, sala, muebles y pista quedan arriba
// (R.pista, R.muebles…), así el resto del juego no sabe de pistas. R.pistaClave dice cuál es; R.listaPistas, todas;
// R.nombres y R.cortos, el nombre de cada una (el corto va en el selector del menú).
export function reglasCarrera(datos, pista = 'living') {
    const d = datos || {};
    const R = fundir(CARRERA, { ...d, gatas: undefined });
    if (!Array.isArray(R.pista.puntos) || R.pista.puntos.length < 4) R.pista = { ...R.pista, puntos: CARRERA.pista.puntos };
    const porClave = new Map(CARRERA.gatas.map(g => [g.clave, g]));
    if (Array.isArray(d.gatas)) for (const g of d.gatas) if (g && g.clave) porClave.set(g.clave, fundir(porClave.get(g.clave) || {}, g));
    R.gatas = [...porClave.values()].slice(0, 8);
    R.listaPistas = ['living', ...Object.keys(R.pistas || {}).filter(k => esObj(R.pistas[k]))];
    R.nombres = Object.fromEntries(R.listaPistas.map(k => [k, (k !== 'living' && R.pistas[k].nombre) || R.nombre]));
    R.cortos = Object.fromEntries(R.listaPistas.map(k => [k, (k !== 'living' ? R.pistas[k].corto || R.pistas[k].nombre : R.corto) || R.nombres[k]]));
    R.pistaClave = 'living';
    const p = pista !== 'living' && esObj(R.pistas) ? R.pistas[pista] : null;
    if (p) {
        const base = CARRERA.pistas[pista] || {}, PP = p.pista || {};
        // Lo general de la pista (ancho, paso, salida, rampa) viene de `pista`; las listas, solo de la suya
        const listas = Object.fromEntries(LISTAS_PISTA.map(k => [k, Array.isArray(PP[k]) ? PP[k] : []]));
        R.pista = { ...R.pista, ...PP, ...listas };
        if (R.pista.puntos.length < 4) R.pista.puntos = (base.pista && base.pista.puntos) || CARRERA.pista.puntos;
        R.nombre = p.nombre || R.nombre;
        R.escenario = escenarioDe((base.escenario) || null, d.pistas && d.pistas[pista] && d.pistas[pista].escenario);
        R.sala = fundir(R.sala, p.sala);
        R.muebles = Array.isArray(p.muebles) ? p.muebles : [];
        R.pistaClave = pista;
    } else R.escenario = escenarioDe(CARRERA.escenario, d.escenario);
    return R;
}
// Colores del escenario: los del código si el JSON no cambia el tipo; si lo cambia, los de ese tipo (y encima lo del JSON)
function escenarioDe(codigo, json) {
    const j = esObj(json) ? json : {}, tipo = j.tipo || (codigo && codigo.tipo) || 'living';
    return fundir(codigo && codigo.tipo === tipo ? codigo : ESCENARIO_BASE[tipo] || CARRERA.escenario, j);
}
export const LISTAS_PISTA = ['puntos', 'huecos', 'turbos', 'tuneles', 'cajas', 'piezas'];
// Colores base de cada tipo de escenario (los de la pista del código; una pista nueva parte de estos)
export const ESCENARIO_BASE = Object.fromEntries([['living', CARRERA.escenario], ...Object.values(CARRERA.pistas).map(p => [p.escenario.tipo, p.escenario])]);
export const ESCENARIOS = Object.keys(ESCENARIO_BASE);
// Muebles: los que propone el editor para cada escenario (cualquiera se puede poner en cualquiera)
export const MUEBLES_DE = {
    living: ['sofa', 'mesa', 'ovillo', 'lampara', 'pecera', 'cojin'],
    cocina: ['encimera', 'refri', 'silla', 'olla', 'taza'],
    patio: ['piscina', 'banca', 'arbol', 'macetero', 'pelota'],
    techo: ['tanque', 'chimenea', 'antena', 'panel', 'claraboya'],
    todas: ['caja', 'alfombra', 'raton', 'podio']
};
// La pista pasa por debajo (entre sus patas) / corre encima a mano (sus alturas en los puntos) / es plano (bajo la pista)
export const MUEBLES_TUNEL = ['mesa', 'silla', 'banca', 'tanque'];
export const MUEBLES_ENCIMA = ['sofa', 'encimera'];
export const MUEBLES_PLANOS = ['alfombra'];

// ---------------------------------------------------------
// Pista
// ---------------------------------------------------------
// Catmull-Rom centrípeta (no hace nudos ni se devuelve aunque los puntos queden muy disparejos, como al conectar una pieza)
function crc(p0, p1, p2, p3, u) {
    const d = (a, b) => Math.max(1e-3, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])));
    const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3), t = t1 + (t2 - t1) * u;
    const r = [];
    for (let c = 0; c < 3; c++) {
        const A1 = ((t1 - t) * p0[c] + t * p1[c]) / t1, A2 = ((t2 - t) * p1[c] + (t - t1) * p2[c]) / (t2 - t1), A3 = ((t3 - t) * p2[c] + (t - t2) * p3[c]) / (t3 - t2);
        const B1 = ((t2 - t) * A1 + t * A2) / t2, B2 = ((t3 - t) * A2 + (t - t1) * A3) / (t3 - t1);
        r.push(((t2 - t) * B1 + (t - t1) * B2) / (t2 - t1));
    }
    return r;
}
const angDif = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const lim = (v, a, b) => Math.max(a, Math.min(b, v));

// Muebles sobre los que la pista sube sola (los demás son obstáculos: la pista los rodea o pasa por arriba a mano)
export const SUBE_TIPOS = ['caja', 'cojin', 'panel', 'claraboya'];
export const subeEncima = m => !!(m && (m.sube ?? SUBE_TIPOS.includes(m.tipo)));
// Altura del mueble más alto bajo (x, z), con su planta agrandada `margen` bloques (0 si no hay ninguno)
export function techoMuebles(muebles, x, z, margen = 0) {
    let h = 0;
    for (const m of muebles) {
        const a = (m.g || 0) * Math.PI / 180, dx = x - m.x, dz = z - m.z;
        const lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a);
        if (Math.abs(lx) < m.a / 2 + margen && Math.abs(lz) < m.f / 2 + margen && m.h > h) h = m.h;
    }
    return h;
}

// Muestras de la pista: { x, y, z, yaw, pend (dy/ds), ancho, curva (1/bloques, + = dobla a la izquierda), piso, turbo, tunel,
// apoyo (alto del mueble que tiene debajo, o 0) }
export function armarPista(R) {
    const P = R.pista, pts = P.puntos, n = pts.length;
    // Curva densa
    const densos = [], inicio = [];
    for (let i = 0; i < n; i++) {
        const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n], d = pts[(i + 2) % n];
        const cuantos = Math.max(24, Math.min(240, Math.ceil(Math.hypot(c[0] - b[0], c[2] - b[2]) / 0.75)));
        inicio.push(densos.length);
        for (let k = 0; k < cuantos; k++) {
            const t = k / cuantos, [x, y, z] = crc(a, b, c, d, t);
            densos.push({ x, y, z, ancho: (b[3] || P.ancho) + ((c[3] || P.ancho) - (b[3] || P.ancho)) * t });
        }
    }
    // Largo acumulado (en el plano) y remuestreo uniforme
    const acum = [0];
    for (let i = 1; i <= densos.length; i++) {
        const a = densos[i - 1], b = densos[i % densos.length];
        acum.push(acum[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
    }
    const largo = acum[densos.length];
    const sPunto = i => acum[inicio[((i % n) + n) % n]]; // distancia del punto de control i
    const N = Math.max(16, Math.round(largo / P.paso));
    const m = [];
    let j = 0;
    for (let i = 0; i < N; i++) {
        const s = (i / N) * largo;
        while (acum[j + 1] < s) j++;
        const a = densos[j], b = densos[(j + 1) % densos.length];
        const u = (s - acum[j]) / (acum[j + 1] - acum[j] || 1);
        m.push({ x: a.x + (b.x - a.x) * u, y: Math.max(0, a.y + (b.y - a.y) * u), /* el suavizado no baja del piso */ z: a.z + (b.z - a.z) * u, ancho: a.ancho + (b.ancho - a.ancho) * u, s });
    }
    const paso = largo / N;
    // Rampa sola sobre los muebles que dejan subir: cada muestra queda sobre el mueble que tiene debajo (con el ancho de
    // la pista entero encima) y las vecinas suben y bajan con la pendiente `rampa` (una pasada hacia cada lado, dando la vuelta)
    const sube = P.apoyar ? (R.muebles || []).filter(subeEncima) : [];
    for (const q of m) q.apoyo = sube.length ? techoMuebles(sube, q.x, q.z, q.ancho / 2 + 0.5) : 0;
    if (sube.length && m.some(q => q.apoyo > 0)) {
        const baja = Math.max(0.05, P.rampa || 0.35) * paso, env = m.map(q => q.apoyo > 0 ? q.apoyo + 0.15 : 0);
        for (let k = 0; k < 2 * N; k++) { const i = k % N; env[i] = Math.max(env[i], env[(i - 1 + N) % N] - baja); }
        for (let k = 2 * N - 1; k >= 0; k--) { const i = k % N; env[i] = Math.max(env[i], env[(i + 1) % N] - baja); }
        m.forEach((q, i) => { q.y = Math.max(q.y, env[i]); });
    }
    for (let i = 0; i < N; i++) {
        const a = m[(i - 1 + N) % N], b = m[(i + 1) % N];
        m[i].yaw = Math.atan2(b.x - a.x, b.z - a.z);
        m[i].pend = (b.y - a.y) / (2 * paso);
    }
    const tramos = (lista, f) => (lista || []).filter(x => x && Number.isFinite(x.punto ?? x.desde)).map(f);
    const huecos = tramos(P.huecos, h => [sPunto(h.punto), sPunto(h.punto) + Math.max(1, h.largo || 4)]);
    const tuneles = tramos(P.tuneles, h => [sPunto(h.desde), sPunto(h.hasta ?? h.desde + 1)]);
    const dentro = (s, [a, b]) => { const d = ((s - a) % largo + largo) % largo; return d <= ((b - a) % largo + largo) % largo; };
    for (let i = 0; i < N; i++) {
        const a = m[(i - 2 + N) % N], b = m[(i + 2) % N];
        m[i].curva = angDif(b.yaw, a.yaw) / (4 * paso);
        m[i].piso = !huecos.some(h => dentro(m[i].s, h));
        m[i].tunel = tuneles.some(h => dentro(m[i].s, h));
        m[i].turbo = null;
    }
    // Placas de turbo
    for (const t of tramos(P.turbos, x => x)) {
        const i0 = Math.round((sPunto(t.punto) + (t.avance || 0)) / paso), cuantas = Math.max(1, Math.round((t.largo || 4) / paso));
        for (let k = 0; k < cuantas; k++) m[((i0 + k) % N + N) % N].turbo = { lado: lim(t.lado || 0, -1, 1) };
    }
    return { m, N, paso, largo, puntos: pts.map((q, i) => sPunto(i)) };
}
// Muestra en la distancia s (envuelta) con interpolación
export function enPista(pista, s) {
    const { m, N, paso, largo } = pista;
    s = ((s % largo) + largo) % largo;
    const f = s / paso, i = Math.floor(f) % N, u = f - Math.floor(f), a = m[i], b = m[(i + 1) % N];
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u, yaw: a.yaw + angDif(b.yaw, a.yaw) * u, ancho: a.ancho + (b.ancho - a.ancho) * u, i, piso: a.piso, pend: a.pend, curva: a.curva, turbo: a.turbo, tunel: a.tunel };
}
// Punto a la distancia s y al costado lat (+ = a la izquierda del avance)
export function puntoPista(pista, s, lat = 0) {
    const p = enPista(pista, s);
    return { x: p.x + Math.cos(p.yaw) * lat, y: p.y, z: p.z - Math.sin(p.yaw) * lat, yaw: p.yaw };
}
// Proyección de (x, z) cerca de s0 (busca ±ventana bloques: la pista puede pasar por encima de sí misma)
export function proyectarCerca(pista, x, z, s0, ventana = 8) {
    const { m, N, paso, largo } = pista;
    const c = Math.round((((s0 % largo) + largo) % largo) / paso), w = Math.ceil(ventana / paso);
    let mejor = null;
    for (let k = -w; k <= w; k++) {
        const i = (c + k + N) % N, a = m[i], b = m[(i + 1) % N];
        const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1e-9;
        const u = lim(((x - a.x) * dx + (z - a.z) * dz) / L2, 0, 1);
        const px = a.x + dx * u, pz = a.z + dz * u, d = Math.hypot(x - px, z - pz);
        if (!mejor || d < mejor.d) {
            const L = Math.sqrt(L2);
            // izquierda del avance = (cos yaw, -sin yaw) = (dz, -dx)/L
            const lat = ((x - px) * dz - (z - pz) * dx) / L;
            mejor = { d, s: a.s + u * paso + (i + 1 === N && u > 0 ? 0 : 0), lat, i };
        }
    }
    return mejor;
}

// ---------------------------------------------------------
// Una gata en carrera
// ---------------------------------------------------------
// Parrilla: 2 por fila, la primera fila a `salida` bloques de la línea
export function parrilla(pista, R, k) {
    const fila = Math.floor(k / 2), lado = k % 2 ? -1 : 1;
    const s = -R.pista.salida - fila * 3.2 - (k % 2) * 1.2;
    const p = enPista(pista, s);
    return { s, lat: lado * p.ancho * 0.22 };
}
export function nuevaGata(pista, R, def, k) {
    const g0 = parrilla(pista, R, k), p = puntoPista(pista, g0.s, g0.lat);
    const ss = ((g0.s % pista.largo) + pista.largo) % pista.largo;
    return {
        clave: def.clave, k, def, x: p.x, y: p.y, z: p.z, yaw: p.yaw, v: 0, vy: 0, suelo: true,
        s: ss, lat: g0.lat, av: g0.s, // av: avance total (negativo antes de cruzar la línea la primera vez)
        derrape: 0, carga: 0, nivel: -1, turbo: 0, saltoAntes: false, enAire: 0, truco: false, trucoHecho: false,
        cayendo: 0, choque: 0, fin: null, tiempos: [], ultimaVuelta: 0,
        objeto: null, ruleta: 0, objetoT: 0, usarAntes: false, aturdida: 0, come: 0, susto: 0, reves: 0, inmune: 0
    };
}
export function fisicaDe(R, g) {
    const G = R.gata, d = g.def || {};
    return { ...G, vel: G.vel * (d.vel ?? 1), acel: G.acel * (d.acel ?? 1), giro: G.giro * (d.giro ?? 1) };
}
export const nivelCarga = (F, carga) => (carga >= F.niveles[2] ? 2 : carga >= F.niveles[1] ? 1 : carga >= F.niveles[0] ? 0 : -1);

// Un paso de física. ent = { ad: -1..1, giro: -1..1 (+ = izquierda), salto: bool (mantener) }. t = segundos de carrera.
// Devuelve eventos de este paso (para sonido y efectos): 'salto', 'derrape', 'nivel', 'turbo', 'placa', 'truco', 'pared', 'cae', 'vuelve', 'aterriza', 'vuelta', 'meta'
export function pasoGata(g, ent, dt, R, pista, t = 0) {
    const ev = [];
    const F = fisicaDe(R, g);
    if (g.fin !== null) ent = { ad: 0, giro: 0, salto: false };
    // Efectos de los objetos (se acaban solos)
    for (const k of ['aturdida', 'come', 'susto', 'reves', 'inmune']) if (g[k] > 0) g[k] = Math.max(0, g[k] - dt);
    // Caída por un hueco: Lona la recoge y la deja en la pista, quieta
    if (g.cayendo > 0) {
        g.cayendo -= dt; g.y -= 14 * dt;
        if (g.cayendo <= 0) {
            let s = g.s; for (let k = 0; k < 400 && !enPista(pista, s).piso; k++) s -= pista.paso; // atrás hasta tener piso
            s -= F.vuelve ?? 14;
            const p = puntoPista(pista, s, 0);
            let ds = s - g.s; ds -= Math.round(ds / pista.largo) * pista.largo; g.av += ds; // el avance retrocede lo mismo
            g.x = p.x; g.z = p.z; g.y = p.y; g.yaw = p.yaw; g.s = ((s % pista.largo) + pista.largo) % pista.largo; g.lat = 0;
            g.v = 0; g.vy = 0; g.suelo = true; g.derrape = 0; g.carga = 0; g.turbo = 0;
            ev.push('vuelve');
        }
        return ev;
    }
    const quieta = g.aturdida > 0 || g.come > 0; // golpeada o comiendo: no acelera ni salta
    const ad = quieta ? 0 : lim(ent.ad || 0, -1, 1), giro = lim(ent.giro || 0, -1, 1) * (g.reves > 0 ? -1 : 1), salto = !quieta && !!ent.salto;
    const pulsa = salto && !g.saltoAntes;
    g.saltoAntes = salto;
    const aqui = enPista(pista, g.s);
    // --- Velocidad ---
    const tope = F.vel * (g.turbo > 0 ? F.turbo : 1) * (g.susto > 0 ? (R.objetos?.aspiradora?.freno ?? 1) : 1);
    if (g.suelo) {
        if (ad > 0) { if (g.v < tope) g.v = Math.min(tope, g.v + F.acel * ad * dt * (g.turbo > 0 ? 2.5 : 1)); } // acelerar llega hasta el tope, no lo pasa
        else if (ad < 0) g.v -= (g.v > 0.3 ? F.freno : F.acel) * -ad * dt;
        else g.v -= Math.sign(g.v) * Math.min(Math.abs(g.v), F.roce * dt);
        // La pendiente frena al subir y empuja al bajar
        g.v -= aqui.pend * F.gravedad * 0.25 * dt;
    }
    if (g.turbo > 0) g.v = Math.max(g.v, tope * 0.98);
    if (g.v > tope) g.v = Math.max(tope, g.v - F.freno * 0.5 * dt);
    g.v = Math.max(g.v, -F.vel * F.atras);
    if (quieta) g.v *= Math.max(0, 1 - 4 * dt);
    // --- Salto y derrape ---
    if (pulsa && g.suelo && g.fin === null) { g.vy = F.salto; g.suelo = false; g.enAire = 0; g.trucoHecho = true; ev.push('salto'); }
    else if (pulsa && !g.suelo && !g.trucoHecho && g.enAire > 0.12) { g.truco = true; g.trucoHecho = true; ev.push('truco'); }
    if (g.derrape) {
        if (!salto || g.v < F.vel * 0.35) {
            // Soltar: turbo según el nivel
            if (g.nivel >= 0) { g.turbo = Math.max(g.turbo, F.turbos[g.nivel]); ev.push('turbo'); }
            g.derrape = 0; g.carga = 0; g.nivel = -1;
        } else {
            g.carga += dt * (1 + 0.6 * Math.max(0, giro * g.derrape));
            const n = nivelCarga(F, g.carga);
            if (n > g.nivel) { g.nivel = n; ev.push('nivel'); }
        }
    }
    // --- Giro ---
    const kv = lim(Math.abs(g.v) / 3, 0, 1) * Math.sign(g.v || 1);
    if (g.derrape) g.yaw += (g.derrape * F.derrapeGiro + giro * F.derrapeMando) * kv * dt;
    else g.yaw += giro * F.giro * kv * dt * (g.suelo ? 1 : 0.4);
    g.yaw = Math.atan2(Math.sin(g.yaw), Math.cos(g.yaw));
    // --- Avanzar ---
    g.x += Math.sin(g.yaw) * g.v * dt;
    g.z += Math.cos(g.yaw) * g.v * dt;
    const pr = proyectarCerca(pista, g.x, g.z, g.s);
    let ds = pr.s - g.s;
    if (ds > pista.largo / 2) ds -= pista.largo; else if (ds < -pista.largo / 2) ds += pista.largo;
    const vueltaAntes = Math.floor(g.av / pista.largo);
    g.s = pr.s; g.av += ds; g.lat = pr.lat;
    const p = enPista(pista, g.s);
    // Paredes (no en el aire sobre un hueco)
    const borde = p.ancho / 2 - F.radio;
    if (Math.abs(g.lat) > borde && (g.suelo || p.piso)) {
        const lado = Math.sign(g.lat);
        g.lat = lado * borde;
        const q = puntoPista(pista, g.s, g.lat);
        g.x = q.x; g.z = q.z;
        const rel = angDif(g.yaw, p.yaw);
        // Rebote: si va de frente contra la pared, el rumbo se refleja sobre el eje de la pista (hacia adelante o hacia
        // atrás) y se aplana. Si la roza (o la sigue empujando), se desliza a lo largo del borde con un poco de roce:
        // antes cada cuadro contaba como choque y la gata quedaba pegada, quieta.
        const golpe = Math.abs(Math.sin(rel));
        if (Math.sin(rel) * lado > 0 && (golpe < F.roza || g.choque > 0)) { g.yaw = Math.abs(rel) < Math.PI / 2 ? p.yaw : p.yaw + Math.PI; g.v -= g.v * F.rozaRoce * dt; }
        else if (Math.sin(rel) * lado > 0) { g.yaw =Math.abs(rel) < Math.PI / 2 ? p.yaw - rel * 0.35 : p.yaw + Math.PI - angDif(g.yaw, p.yaw + Math.PI) * 0.35; g.v *= F.pared; g.choque = 0.3; if (g.derrape) { g.derrape = 0; g.carga = 0; g.nivel = -1; } ev.push('pared'); }
    }
    g.choque = Math.max(0, g.choque - dt);
    // --- Altura: en el suelo sigue la pista; si la pista cae más rápido que la gravedad, vuela ---
    if (g.suelo) {
        if (!p.piso) { g.suelo = false; g.vy = Math.max(0, aqui.pend) * g.v; g.enAire = 0; g.trucoHecho = false; }
        else {
            const vyPista = p.pend * g.v;
            if (vyPista < g.vy - 2.5 && g.v > F.vel * 0.55) { g.suelo = false; g.vy = Math.max(g.vy, aqui.pend * g.v); g.enAire = 0; g.trucoHecho = false; }
            else { g.y = p.y; g.vy = vyPista; }
        }
    }
    if (!g.suelo) {
        g.enAire += dt;
        g.vy -= F.gravedad * dt;
        g.y += g.vy * dt;
        if (p.piso && g.y <= p.y) {
            g.y = p.y; g.suelo = true;
            ev.push('aterriza');
            if (g.truco) { g.turbo = Math.max(g.turbo, F.truco); g.truco = false; ev.push('turbo'); }
            // Caer doblando con el salto apretado: empieza el derrape
            if (salto && Math.abs(giro) > 0.25 && g.v > F.vel * 0.4 && !g.derrape) { g.derrape = Math.sign(giro); g.carga = 0; g.nivel = -1; ev.push('derrape'); }
            g.vy = 0;
        } else if (!p.piso && g.y < p.y - 2.5) { g.cayendo = F.caida; g.v = 0; ev.push('cae'); }
    }
    // Placas de turbo
    if (g.suelo && p.turbo && Math.abs(g.lat - (-p.turbo.lado) * p.ancho * 0.3) < 1.6) {
        if (g.turbo < F.placa * 0.9) ev.push('placa');
        g.turbo = Math.max(g.turbo, F.placa);
    }
    g.turbo = Math.max(0, g.turbo - dt);
    // Vueltas y meta
    const vuelta = Math.floor(g.av / pista.largo);
    if (vuelta > vueltaAntes && vuelta >= 1 && g.fin === null) {
        g.tiempos.push(t - g.ultimaVuelta); g.ultimaVuelta = t;
        if (vuelta >= R.vueltas) { g.fin = t; ev.push('meta'); } else ev.push('vuelta');
    }
    return ev;
}
// Choques entre gatas (en el suelo, cerca): se separan y la más rápida pierde un poco
export function chocarGatas(gs, R) {
    const r2 = (R.gata.radio * 2) ** 2;
    let n = 0;
    for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
        const a = gs[i], b = gs[j];
        if (a.cayendo > 0 || b.cayendo > 0 || Math.abs(a.y - b.y) > 0.8) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 >= r2 || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), em = (R.gata.radio * 2 - d) / 2, ux = dx / d, uz = dz / d;
        a.x -= ux * em; a.z -= uz * em; b.x += ux * em; b.z += uz * em;
        const va = a.v, vb = b.v;
        a.v = va * 0.92 + vb * 0.05; b.v = vb * 0.92 + va * 0.05;
        n++;
    }
    return n;
}
// Vuelta en curso (1..vueltas) y orden de llegada
export const vueltaDe = (g, R, pista) => lim(Math.floor(g.av / pista.largo) + 1, 1, R.vueltas);
export function puestos(gs) {
    return gs.slice().sort((a, b) => {
        if (a.fin !== null && b.fin !== null) return a.fin - b.fin;
        if (a.fin !== null) return -1;
        if (b.fin !== null) return 1;
        return b.av - a.av;
    });
}

// ---------------------------------------------------------
// IA: línea por dentro de la curva que viene, frena según la curvatura, derrapa en las cerradas y va por los turbos.
// rnd() opcional (fácil y normal: un poco de ruido en la línea). jugador = la gata del jugador (ayuda si va muy atrás)
// ---------------------------------------------------------
// extra = { gs (todas las gatas), W (objetos: nuevosObjetos) }: con eso esquiva las cajas tiradas y usa sus objetos
export function entradaIA(g, R, pista, rnd = null, jugador = null, extra = null) {
    const I = R.ia, F = fisicaDe(R, g);
    const nivel = I.niveles[R.dificultad] ?? I.niveles.normal;
    const lejos = enPista(pista, g.s + I.mira), cerca = enPista(pista, g.s + I.mira * 0.5);
    const curvaMax = Math.max(Math.abs(lejos.curva), Math.abs(cerca.curva), Math.abs(enPista(pista, g.s + I.mira * 1.6).curva));
    // Línea: por dentro (hacia el lado al que dobla) y hacia la placa de turbo si hay una cerca
    let lat = Math.sign(lejos.curva) * lejos.ancho / 2 * I.linea + ((g.k % 3) - 1) * lejos.ancho * 0.14; // cada una con su carril
    for (let k = 2; k < 14; k += 2) { const q = enPista(pista, g.s + k); if (q.turbo) { lat = -q.turbo.lado * q.ancho * 0.3; break; } }
    if (g.ruido === undefined) g.ruido = 0;
    if (rnd && R.dificultad !== 'dificil') { g.ruido += (rnd() - 0.5) * 0.4; g.ruido *= 0.97; lat += lim(g.ruido, -1, 1) * I.error * lejos.ancho * 0.1; }
    // Esquiva las cajas de cartón tiradas adelante; un pescado cerca la tienta (en difícil, lo esquiva)
    if (extra && extra.W) for (const o of extra.W.sueltos) {
        let ds = o.s - g.s; ds -= Math.round(ds / pista.largo) * pista.largo;
        if (o.tipo === 'pescado' && R.dificultad !== 'dificil') { if (ds > 0 && ds < (R.objetos.pescado.atrae || 10) * 1.5 && o.de !== g.k) lat = o.lat; continue; }
        if (o.tipo !== 'caja' && o.tipo !== 'pescado') continue;
        if (ds > 0 && ds < 14 && Math.abs(o.lat - lat) < 2.2) { const q = enPista(pista, o.s); lat = lim(o.lat + (lat >= o.lat ? 2.6 : -2.6), -q.ancho / 2 + 1, q.ancho / 2 - 1); }
    }
    const objetivo = puntoPista(pista, g.s + I.mira, lat);
    const d = angDif(Math.atan2(objetivo.x - g.x, objetivo.z - g.z), g.yaw);
    let giro = lim(d * 2.2, -1, 1);
    // Velocidad deseada según la curva
    let quiere = F.vel * nivel / (1 + curvaMax * I.curva);
    if (jugador && jugador !== g && jugador.av - g.av > pista.largo * 0.08) quiere *= 1 + I.empuje;
    // Derrape: en curva cerrada, con velocidad, mientras la curva siga
    let salto = false;
    // (lo suelta si ya mira muy lejos de donde va: si no, gira de más y queda al revés contra el borde)
    if (g.derrape) salto = curvaMax > I.derrapa * 0.6 && Math.sign(cerca.curva || lejos.curva) === g.derrape && Math.abs(d) < 0.9;
    else if (!g.suelo) salto = !!g.iaDerrapa && curvaMax > I.derrapa * 0.6; // saltó para derrapar: lo mantiene hasta caer
    else salto = g.iaDerrapa = curvaMax > I.derrapa && g.v > F.vel * 0.55 && Math.abs(giro) > 0.3 && !g.saltoAntes;
    if (g.derrape) giro = lim(giro, g.derrape > 0 ? -0.3 : -1, g.derrape > 0 ? 1 : 0.3);
    // Antes de un hueco, a fondo y derecho
    const hueco = !enPista(pista, g.s + 6).piso || !enPista(pista, g.s + 3).piso;
    // (en un hueco sobre plano, sin cresta que la lance, salta justo al borde)
    if (hueco) { quiere = F.vel * 1.2; salto = g.suelo && !enPista(pista, g.s + 1.2).piso && enPista(pista, g.s + 1.2).pend > -0.15 && !g.saltoAntes; }
    const ad = g.v < quiere ? 1 : g.v > quiere + 1.5 ? -0.5 : 0;
    const usar = !!(extra && extra.gs && quiereUsar(g, R, extra.gs, curvaMax, hueco));
    return { ad, giro, salto, usar };
}
// ¿Usa ya su objeto? La pluma en una recta, el ovillo con una rival cerca adelante y alineada, la caja con una rival
// pegada atrás, el pescado con una rival adelante, la hierba con rivales cerca, la aspiradora si alguien va adelante.
// Si lo guarda mucho rato, lo usa igual. En fácil tarda un poco más en decidirse.
function quiereUsar(g, R, gs, curvaMax, hueco) {
    if (!g.objeto || g.ruleta > 0 || g.fin !== null || g.cayendo > 0) return false;
    const T = g.objetoT || 0, D = R.objetos[g.objeto] || {};
    if (R.dificultad === 'facil' && T < 1.5) return false;
    let delante = null, detras = null;
    for (const x of gs) {
        if (x === g || x.fin !== null) continue;
        const d = x.av - g.av;
        if (d > 0 && (!delante || d < delante.av - g.av)) delante = x;
        if (d < 0 && (!detras || d > detras.av - g.av)) detras = x;
    }
    switch (g.objeto) {
        case 'pluma': return (g.suelo && !hueco && curvaMax < R.ia.derrapa) || T > 6;
        case 'ovillo': return (delante && delante.av - g.av < 25 && Math.abs(delante.lat - g.lat) < 2.5 && curvaMax < R.ia.derrapa * 1.5) || T > 8;
        case 'caja': return (detras && g.av - detras.av < 8) || T > 10;
        case 'pescado': return (delante && delante.av - g.av < (D.adelante || 22) * 2) || T > 6;
        case 'hierba': return gs.some(x => x !== g && x.fin === null && Math.abs(x.av - g.av) < (D.alcance || 30) * 0.8) || T > 6;
        case 'aspiradora': return !!delante || T > 3;
    }
    return T > 5;
}

// ---------------------------------------------------------
// Objetos: cajas en la pista (se toman pasando por encima; vuelven a los `reaparece` s), una ruleta que decide qué
// sale según el puesto, y lo que se tira (`sueltos`: el ovillo corre por la pista, la caja de cartón se queda, el
// pescado atrae a las que pasan cerca). La pluma, la hierba y la aspiradora hacen efecto al instante.
// Todo en coordenadas de pista (s, lat). W = nuevosObjetos(R, pista); pasoObjetos una vez por paso, después de pasoGata.
// ---------------------------------------------------------
export const OBJETOS = ['pluma', 'ovillo', 'caja', 'pescado', 'hierba', 'aspiradora'];
const envolver = (s, L) => ((s % L) + L) % L;
const difS = (a, b, L) => { let d = a - b; d -= Math.round(d / L) * L; return d; };

// Dónde van las cajas: una fila por cada `pista.cajas`, a lo ancho
export function cajasDe(R, pista) {
    const O = R.objetos || {}, r = [];
    if (!O.activos) return r;
    for (const c of R.pista.cajas || []) {
        if (!c || !Number.isFinite(c.punto) || c.punto < 0 || c.punto >= pista.puntos.length) continue;
        const s = envolver(pista.puntos[c.punto] + (c.avance || 0), pista.largo), q = enPista(pista, s);
        const n = Math.max(1, Math.min(8, Math.round(c.cuantas || O.cuantas || 4)));
        for (let k = 0; k < n; k++) r.push({ s, lat: ((k + 0.5) / n - 0.5) * q.ancho * 0.8 });
    }
    return r;
}
export function nuevosObjetos(R, pista) {
    return { cajas: cajasDe(R, pista).map(c => ({ ...c, hasta: 0 })), sueltos: [], t: 0, sig: 1 };
}
// Qué sale de una caja: puesto 0 = la primera, n - 1 = la última (los pesos se mezclan entre `primera` y `ultima`)
export function sortearObjeto(R, puesto, n, rnd = Math.random) {
    const O = R.objetos, f = n > 1 ? lim(puesto / (n - 1), 0, 1) : 0;
    const pesos = OBJETOS.map(k => { const D = O[k] || {}; return Math.max(0, (D.primera ?? 1) * (1 - f) + (D.ultima ?? 1) * f); });
    let r = rnd() * pesos.reduce((a, b) => a + b, 0);
    if (!(r > 0)) return 'pluma';
    for (let i = 0; i < OBJETOS.length; i++) { r -= pesos[i]; if (r < 0) return OBJETOS[i]; }
    return OBJETOS[OBJETOS.length - 1];
}
// Un golpe (ovillo, caja) o un pescado que se come: queda quieta un rato y pierde el derrape y el turbo
function golpear(g, tipo, R) {
    const O = R.objetos, D = O[tipo] || {};
    if (tipo === 'pescado') { g.come = D.come || 1; g.v *= 0.2; }
    else { g.aturdida = D.golpe || 1; g.v *= 0.35; }
    g.derrape = 0; g.carga = 0; g.nivel = -1; g.turbo = 0; g.inmune = O.inmune || 1;
}
function asustar(x, D, R) {
    x.susto = D.segundos; x.v *= D.freno; x.derrape = 0; x.carga = 0; x.nivel = -1; x.turbo = 0;
    if (x.suelo) { x.vy = R.gata.salto * (D.salto ?? 0.7); x.suelo = false; x.enAire = 0; x.trucoHecho = true; } // saltan del susto
}
function usarObjeto(W, gs, k, ent, R, pista, ev) {
    const g = gs[k], O = R.objetos, tipo = g.objeto, D = O[tipo] || {}, L = pista.largo;
    g.objeto = null; g.objetoT = 0;
    ev.push({ k, e: 'usa', o: tipo });
    const atras = (ent.ad || 0) < 0; // con el freno apretado, el ovillo sale hacia atrás
    const soltar = (s, lat, extra) => {
        const q = enPista(pista, s);
        W.sueltos.push({ id: W.sig++, tipo, s: envolver(s, L), lat: lim(lat, -q.ancho / 2 + 0.6, q.ancho / 2 - 0.6), y: q.y, v: 0, de: k, gracia: O.gracia, vida: D.vida || 5, ...extra });
    };
    if (tipo === 'pluma') g.turbo = Math.max(g.turbo, D.turbo || 1);
    else if (tipo === 'ovillo') soltar(g.s + (atras ? -1.5 : 1.5), g.lat, { v: atras ? -D.vel * 0.6 : D.vel + Math.max(0, g.v) * 0.3 });
    else if (tipo === 'caja') soltar(g.s - 1.6, g.lat);
    else if (tipo === 'pescado') {
        // Cae delante de la que va justo adelante (o a `adelante` bloques si vas primera); a quien lo tira no la atrae
        let blanco = null;
        for (const x of gs) if (x !== g && x.fin === null && x.av > g.av && x.av - g.av < D.adelante * 2 && (!blanco || x.av < blanco.av)) blanco = x;
        soltar(blanco ? blanco.s + 7 : g.s + D.adelante, blanco ? blanco.lat : g.lat, { gracia: 1e9 });
    } else if (tipo === 'hierba') {
        for (let j = 0; j < gs.length; j++) {
            const x = gs[j];
            if (x === g || x.fin !== null || x.cayendo > 0 || x.inmune > 0 || Math.abs(x.av - g.av) > D.alcance) continue;
            x.reves = D.segundos; ev.push({ k: j, e: 'reves', o: tipo, de: k });
        }
    } else if (tipo === 'aspiradora') {
        for (let j = 0; j < gs.length; j++) {
            const x = gs[j];
            if (x === g || x.fin !== null || x.cayendo > 0 || x.av <= g.av) continue;
            asustar(x, D, R);
            ev.push({ k: j, e: 'susto', o: tipo, de: k });
        }
    }
}
// Un paso: tomar cajas, la ruleta, usar (ent.usar al apretar), mover lo tirado y sus golpes. ents = la entrada de cada
// gata en este paso. Devuelve [{ k (gata), e: 'caja'|'listo'|'usa'|'golpe'|'come'|'reves'|'susto', o (objeto), de (quién) }]
export function pasoObjetos(W, gs, ents, dt, R, pista, rnd = Math.random) {
    const O = R.objetos, ev = [], L = pista.largo, rad = R.gata.radio;
    if (!O || !O.activos || !W) return ev;
    W.t += dt;
    const orden = puestos(gs);
    for (let k = 0; k < gs.length; k++) {
        const g = gs[k], ent = (ents && ents[k]) || {};
        if (g.ruleta > 0) { g.ruleta = Math.max(0, g.ruleta - dt); if (!g.ruleta) ev.push({ k, e: 'listo', o: g.objeto }); }
        else if (g.objeto) g.objetoT = (g.objetoT || 0) + dt;
        const pulsa = !!ent.usar && !g.usarAntes;
        g.usarAntes = !!ent.usar;
        if (g.fin !== null || g.cayendo > 0) continue;
        if (!g.objeto) for (const c of W.cajas) {
            if (c.hasta > W.t || Math.abs(difS(g.s, c.s, L)) > O.radioCaja + rad || Math.abs(g.lat - c.lat) > O.radioCaja + rad) continue;
            if (Math.abs(g.y - enPista(pista, c.s).y) > 2.5) continue;
            c.hasta = W.t + O.reaparece;
            g.objeto = sortearObjeto(R, orden.indexOf(g), gs.length, rnd); g.ruleta = O.ruleta; g.objetoT = 0;
            ev.push({ k, e: 'caja', o: g.objeto });
            break;
        }
        if (pulsa && g.objeto && !g.ruleta) usarObjeto(W, gs, k, ent, R, pista, ev);
    }
    for (let i = W.sueltos.length - 1; i >= 0; i--) {
        const o = W.sueltos[i], D = O[o.tipo] || {};
        o.vida -= dt; o.gracia -= dt;
        if (o.v) { o.s = envolver(o.s + o.v * dt, L); const q = enPista(pista, o.s); if (!q.piso) o.vida = 0; o.y = q.y; }
        if (o.vida <= 0) { W.sueltos.splice(i, 1); continue; }
        let pego = false;
        for (let k = 0; k < gs.length && !pego; k++) {
            const g = gs[k];
            if (g.cayendo > 0 || g.fin !== null || (k === o.de && o.gracia > 0) || Math.abs(g.y - o.y) > 1.6) continue;
            const ds = difS(g.s, o.s, L);
            // El pescado atrae: corre hacia él a las que pasan cerca
            if (o.tipo === 'pescado' && Math.abs(ds) < D.atrae && !g.come && g.suelo) {
                const dl = g.lat - o.lat;
                g.lat -= Math.sign(dl) * Math.min(Math.abs(dl), D.fuerza * dt);
                const q = puntoPista(pista, g.s, g.lat); g.x = q.x; g.z = q.z;
            }
            if (g.inmune > 0 || Math.abs(ds) > D.radio + rad || Math.abs(g.lat - o.lat) > D.radio + rad) continue;
            golpear(g, o.tipo, R);
            ev.push({ k, e: o.tipo === 'pescado' ? 'come' : 'golpe', o: o.tipo, de: o.de });
            pego = true;
        }
        if (pego) W.sueltos.splice(i, 1);
    }
    return ev;
}

// Azar con semilla (mulberry32): para la IA, reproducible
export function azar(semilla) {
    let a = semilla >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------
// Red (varios jugadores, carrera-red.js): cada corredor manda su gata; el líder, la IA y los objetos
// ---------------------------------------------------------
const r2 = n => Math.round(n * 100) / 100, r1 = n => Math.round(n * 10) / 10;
const EFECTOS = ['aturdida', 'come', 'susto', 'reves', 'inmune'];
export const empacar = g => {
    const m = { x: r2(g.x), y: r2(g.y), z: r2(g.z), w: r2(g.yaw), v: r2(g.v), a: r2(g.av), s: r2(g.s), l: r2(g.lat), d: g.derrape, n: g.nivel, tb: g.turbo > 0 ? 1 : 0, su: g.suelo ? 1 : 0, f: g.fin === null ? null : r2(g.fin) };
    if (!g.suelo) m.vy = r1(g.vy);
    if (g.cayendo > 0) m.c = r2(g.cayendo);
    if (EFECTOS.some(k => g[k] > 0)) m.fx = EFECTOS.map(k => r1(g[k] || 0));
    return m;
};
// Copia directa (la primera vez, o en Node)
export function desempacar(g, m) {
    if (!m) return g;
    g.x = m.x; g.y = m.y; g.z = m.z; g.yaw = m.w;
    return recibirRed(g, m);
}
// Llega el estado de una gata ajena: lo de a saltos se copia; la posición la sigue seguirRed (suave, sin tirones).
// Los efectos de los objetos se quedan con el mayor: el que puso el líder no lo borra un estado que venía en camino.
export function recibirRed(g, m) {
    if (!m) return g;
    g.red = m; g.redEdad = 0;
    g.v = m.v; g.av = m.a; g.derrape = m.d | 0; g.nivel = m.n ?? -1; g.turbo = m.tb ? Math.max(g.turbo, 0.1) : 0;
    if (m.s !== undefined) { g.s = m.s; g.lat = m.l; }
    g.suelo = m.su !== 0; g.vy = m.vy || 0; g.cayendo = m.c || 0;
    EFECTOS.forEach((k, i) => { g[k] = Math.max(g[k] || 0, m.fx ? m.fx[i] : 0); });
    if (m.f !== null && m.f !== undefined && g.fin === null) g.fin = m.f;
    return g;
}
// Cada cuadro, para las gatas ajenas: se acerca a donde estaría ahora (lo último que llegó + lo que avanzó desde
// entonces, hasta 0,3 s) y los efectos se acaban solos. Si quedó muy lejos (cayó y la devolvieron), salta.
export function seguirRed(g, dt, pista) {
    for (const k of EFECTOS) if (g[k] > 0) g[k] = Math.max(0, g[k] - dt);
    const m = g.red;
    if (!m) return g;
    g.redEdad = (g.redEdad || 0) + dt;
    const e = Math.min(g.redEdad, 0.3), v = g.cayendo > 0 ? 0 : m.v;
    const tx = m.x + Math.sin(m.w) * v * e, tz = m.z + Math.cos(m.w) * v * e, ty = m.y + (m.vy || 0) * e;
    const k = 1 - Math.exp(-dt * 12);
    if (Math.hypot(tx - g.x, tz - g.z) > 6) { g.x = tx; g.z = tz; g.y = ty; g.yaw = m.w; }
    else { g.x += (tx - g.x) * k; g.z += (tz - g.z) * k; g.y += (ty - g.y) * k; g.yaw += angDif(m.w, g.yaw) * k; }
    if (m.s !== undefined) g.s = envolver(m.s + v * e, pista.largo);
    g.av = m.a + v * e;
    return g;
}
// Lo que le pasa a tu gata por un suceso de los objetos que manda el líder (pasoObjetos allá): caja (sale la ruleta),
// golpe, pescado, hierba o susto. Quien la maneja lo aplica a la suya.
export function efectoObjeto(g, e, R) {
    const O = R.objetos || {}, D = O[e.o] || {};
    if (e.e === 'caja') { g.objeto = e.o; g.ruleta = O.ruleta; g.objetoT = 0; }
    else if (e.e === 'golpe' || e.e === 'come') golpear(g, e.o, R);
    else if (e.e === 'reves') g.reves = D.segundos;
    else if (e.e === 'susto') asustar(g, D, R);
    return g;
}
// Los objetos para la red (líder → todos): cajas escondidas y lo tirado en la pista
export function empacarObjetos(W) {
    const c = [];
    W.cajas.forEach((x, i) => { if (x.hasta > W.t) c.push([i, r2(x.hasta)]); });
    return { t: r2(W.t), c, s: W.sueltos.map(o => [o.id, OBJETOS.indexOf(o.tipo), r2(o.s), r2(o.lat), r2(o.y), r1(o.v || 0)]) };
}
export function aplicarObjetos(W, m) {
    if (!W || !m) return W;
    W.t = m.t;
    for (const x of W.cajas) x.hasta = 0;
    for (const [i, h] of m.c || []) if (W.cajas[i]) W.cajas[i].hasta = h;
    W.sueltos = (m.s || []).map(([id, ti, s, lat, y, v]) => ({ id, tipo: OBJETOS[ti], s, lat, y, v }));
    return W;
}
// Entre un paquete y otro: el reloj de las cajas y lo que rueda (ovillo) siguen solos
export function avanzarObjetos(W, dt, pista) {
    if (!W) return W;
    W.t += dt;
    for (const o of W.sueltos) if (o.v) { o.s = envolver(o.s + o.v * dt, pista.largo); o.y = enPista(pista, o.s).y; }
    return W;
}
