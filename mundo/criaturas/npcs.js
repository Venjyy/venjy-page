// =========================================================
// VENJY · NPCs: amigos de verdad convertidos en personas de cajas
// Pony (Anthony): pescador en la caseta del lago del puente. Traje gris y corbata,
//   lentes redondos y perilla de chivo (sin bigote).
// Salonas: toca el bajo en el escenario de la aldea; al acercarse suenan sus riffs.
// Lona: pasea por la gatera con Mila y Gala; polera negra con «GALA» adelante y «MILA» atrás.
// Skins pintadas por código (16×16 por cara de cabeza, 16×24 el torso).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { ESCALA, NIVEL_AGUA } from '../voxeles.js';
import {
    seVe, RADIO_VISIBLE, ajustar, lerp, angulo, crearTinte, crearPersona, caminar, caja, texturaPixeles, liso,
    crearNombre, crearGlobo, COLOR_GLOBO, suelo, sonando
} from './cuerpo.js';
import { crearBajo } from './bajo.js';

// ---------------------------------------------------------
// Pintores de piel
// ---------------------------------------------------------
const mot = (c, f = 0.14) => (x, y, r) => ajustar(c, 1 - f / 2 + r() * f);
const en = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

// Letras de 3×5 para la polera de Lona
const LETRAS = {
    G: ['###', '#..', '#.#', '#.#', '###'],
    A: ['.#.', '#.#', '###', '#.#', '#.#'],
    L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###']
};
const letraEn = (texto, x, y, y0) => {
    const k = Math.floor(x / 4), cx = x % 4;
    if (k >= texto.length || cx === 3 || y < y0 || y >= y0 + 5) return false;
    return LETRAS[texto[k]][y - y0][cx] === '#';
};

// Lentes redondos: aro de 4×4 alrededor de cada ojo (filas 6-9)
function lentes(x, y, aro, cristal) {
    for (const ox of [2, 10]) {
        if (!en(x, y, ox, 6, ox + 3, 9)) continue;
        const borde = x === ox || x === ox + 3 || y === 6 || y === 9;
        const esquina = (x === ox || x === ox + 3) && (y === 6 || y === 9);
        if (esquina) return null;
        if (borde) return aro;
        return cristal(x - ox, y - 6);
    }
    if (y === 7 && (x === 6 || x === 9)) return aro; // puente de los lentes
    if (y === 7 && (x === 1 || x === 14)) return aro; // patillas
    return null;
}

const PIELES = {
    pony: {
        nombre: 'Pony',
        piel: [192, 136, 98], pelo: [32, 25, 21],
        cabeza: c => ({
            frente: (x, y, r) => {
                const P = c.piel, H = c.pelo;
                if (y <= 2 || (y === 3 && (x <= 1 || x >= 14))) return mot(H, 0.2)(x, y, r);
                const l = lentes(x, y, [172, 132, 84], (lx, ly) => (ly === 1 || ly === 2) && (lx === 1 || lx === 2) ? (lx === 1 ? [255, 255, 255] : [40, 28, 22]) : ajustar(P, 1.04));
                if (l) return l;
                if (y === 5 && en(x, y, 2, 5, 5, 5) || y === 5 && en(x, y, 10, 5, 13, 5)) return ajustar(H, 1.1); // cejas
                if (en(x, y, 7, 8, 8, 10)) return ajustar(P, x === 7 ? 0.86 : 0.94);    // nariz
                if (y === 12 && en(x, y, 6, 12, 9, 12)) return [118, 62, 52];         // boca
                if (en(x, y, 6, 13, 9, 15) && !(y === 15 && (x === 6 || x === 9))) return mot(H, 0.2)(x, y, r); // perilla de chivo
                return mot(P, 0.08)(x, y, r);
            },
            lado: (x, y, r) => (y <= 4 || (x >= 11 && y <= 9)) ? mot(c.pelo, 0.2)(x, y, r) : (y === 7 && x <= 8 ? [172, 132, 84] : mot(c.piel, 0.08)(x, y, r)),
            atras: (x, y, r) => y <= 10 ? mot(c.pelo, 0.2)(x, y, r) : mot(c.piel, 0.08)(x, y, r),
            arriba: mot([32, 25, 21], 0.25), abajo: mot([192, 136, 98], 0.08)
        }),
        cuerpo: {
            frente: (x, y, r) => {
                const chaqueta = [118, 122, 128];
                if (y >= 21) return mot([62, 64, 70], 0.1)(x, y, r);                                 // pantalón
                if (en(x, y, 7, 1, 8, 13)) return y === 1 ? [36, 38, 46] : mot([40, 44, 56], 0.1)(x, y, r); // corbata
                const v = Math.abs(x - 7.5) <= 3.5 - y * 0.32;
                if (v && y <= 10) return mot([236, 236, 232], 0.06)(x, y, r);                          // camisa
                if (Math.abs(Math.abs(x - 7.5) - (4 - y * 0.32)) < 0.8 && y <= 10) return ajustar(chaqueta, 0.78); // solapa
                if (x === 9 && (y === 14 || y === 18)) return [60, 62, 68];                           // botones
                return mot(chaqueta, 0.12)(x, y, r);
            },
            atras: (x, y, r) => y >= 21 ? mot([62, 64, 70], 0.1)(x, y, r) : mot([118, 122, 128], 0.12)(x, y, r),
            lado: (x, y, r) => y >= 21 ? mot([62, 64, 70], 0.1)(x, y, r) : mot([112, 116, 122], 0.12)(x, y, r),
            arriba: mot([118, 122, 128], 0.12)
        },
        brazo: { frente: (x, y, r) => y >= 21 ? mot([192, 136, 98], 0.08)(x, y, r) : y === 20 ? [236, 236, 232] : mot([118, 122, 128], 0.12)(x, y, r), abajo: mot([192, 136, 98], 0.08), arriba: mot([118, 122, 128], 0.12) },
        pierna: { frente: (x, y, r) => y >= 21 ? mot([28, 24, 22], 0.1)(x, y, r) : mot([62, 64, 70], 0.1)(x, y, r), abajo: mot([28, 24, 22], 0.1), arriba: mot([62, 64, 70], 0.1) }
    },
    salonas: {
        nombre: 'Salonas',
        piel: [204, 158, 126], pelo: [20, 18, 20],
        cabeza: c => ({
            frente: (x, y, r) => {
                const P = c.piel, H = c.pelo;
                // Pelo desordenado a media melena: flequillo irregular y mechones a los lados hasta abajo
                const flequillo = [3, 4, 3, 2, 3, 4, 2, 3, 3, 2, 4, 3, 2, 3, 4, 3][x];
                if (y < flequillo || x <= 1 || x >= 14) return mot(H, 0.3)(x, y, r);
                // Lentes redondos espejados, naranjo arriba y rojo abajo
                const l = lentes(x, y, [204, 172, 86], (lx, ly) => (lx === 1 && ly === 1) ? [255, 236, 190] : ly <= 1 ? [244, 132, 40] : [214, 46, 58]);
                if (l) return l;
                if (y === 5 && (en(x, y, 3, 5, 5, 5) || en(x, y, 10, 5, 12, 5))) return H;
                if (en(x, y, 7, 8, 8, 10) && y < 11) return ajustar(P, x === 7 ? 0.86 : 0.94);
                // Barba completa con bigote; la boca asoma entre medio
                if (y >= 11) {
                    if (y === 13 && en(x, y, 6, 13, 9, 13)) return [104, 56, 48];
                    return mot(H, 0.35)(x, y, r);
                }
                if (y === 10 && (x <= 3 || x >= 12)) return mot(H, 0.35)(x, y, r); // patillas que se juntan con la barba
                return mot(P, 0.08)(x, y, r);
            },
            lado: (x, y, r) => (y <= 2 || x >= 6 || y >= 11 && x >= 2) ? mot(c.pelo, 0.3)(x, y, r) : (y === 7 && x <= 5 ? [204, 172, 86] : mot(c.piel, 0.08)(x, y, r)),
            atras: mot([20, 18, 20], 0.3),
            arriba: mot([20, 18, 20], 0.3), abajo: (x, y, r) => mot([20, 18, 20], 0.3)(x, y, r)
        }),
        cuerpo: {
            frente: (x, y, r) => {
                if (y >= 21) return mot([24, 24, 28], 0.1)(x, y, r);
                if (y === 0 && en(x, y, 5, 0, 10, 0)) return [44, 46, 50];   // cuello de la polera
                return mot([66, 68, 72], 0.16)(x, y, r);
            },
            lado: (x, y, r) => y >= 21 ? mot([24, 24, 28], 0.1)(x, y, r) : mot([62, 64, 68], 0.16)(x, y, r),
            arriba: mot([66, 68, 72], 0.16)
        },
        brazo: { frente: (x, y, r) => y >= 8 ? mot([204, 158, 126], 0.08)(x, y, r) : mot([66, 68, 72], 0.16)(x, y, r), abajo: mot([204, 158, 126], 0.08), arriba: mot([66, 68, 72], 0.16) },
        pierna: { frente: (x, y, r) => y >= 21 ? mot([40, 30, 26], 0.12)(x, y, r) : mot([24, 24, 28], 0.1)(x, y, r), abajo: mot([40, 30, 26], 0.1), arriba: mot([24, 24, 28], 0.1) }
    },
    lona: {
        nombre: 'Lona',
        piel: [242, 216, 198], pelo: [16, 14, 18],
        cabeza: c => ({
            frente: (x, y, r) => {
                const P = c.piel, H = c.pelo;
                // Pelo largo negro con partidura al lado y flequillo
                if (y <= 1 || (y <= 3 && x >= 4) || x <= 1 || x >= 14) return mot(H, 0.18)(x, y, r);
                if (y === 6 && (en(x, y, 3, 6, 5, 6) || en(x, y, 10, 6, 12, 6))) return [24, 20, 24];       // pestañas
                if (y === 7 && (x === 3 || x === 12)) return [255, 255, 255];
                if (y === 7 && (x === 4 || x === 5 || x === 10 || x === 11)) return x === 5 || x === 10 ? [40, 28, 24] : [96, 64, 40];
                if (y === 9 && (en(x, y, 3, 9, 4, 9) || en(x, y, 11, 9, 12, 9))) return [238, 168, 168];   // rubor
                if (en(x, y, 7, 8, 8, 9)) return ajustar(P, x === 7 ? 0.9 : 0.96);
                if (y === 11 && en(x, y, 6, 11, 9, 11)) return [198, 96, 112];                             // labios
                if (y === 12 && en(x, y, 7, 12, 8, 12)) return [214, 128, 138];
                return mot(P, 0.06)(x, y, r);
            },
            lado: (x, y, r) => (y <= 3 || x >= 5) ? mot(c.pelo, 0.18)(x, y, r) : mot(c.piel, 0.06)(x, y, r),
            atras: mot([16, 14, 18], 0.18),
            arriba: mot([16, 14, 18], 0.18), abajo: mot([16, 14, 18], 0.18)
        }),
        cuerpo: {
            frente: (x, y, r) => {
                if (y >= 21) return mot([62, 92, 142], 0.12)(x, y, r); // jeans
                if (letraEn('GALA', x, y, 9)) return [240, 240, 236];
                return mot([26, 26, 30], 0.12)(x, y, r);
            },
            atras: (x, y, r) => {
                if (y >= 21) return mot([62, 92, 142], 0.12)(x, y, r);
                if (letraEn('MILA', x, y, 9)) return [240, 240, 236];
                return mot([26, 26, 30], 0.12)(x, y, r);
            },
            lado: (x, y, r) => y >= 21 ? mot([62, 92, 142], 0.12)(x, y, r) : mot([26, 26, 30], 0.12)(x, y, r),
            arriba: mot([26, 26, 30], 0.12)
        },
        brazo: { frente: (x, y, r) => y >= 7 ? mot([242, 216, 198], 0.06)(x, y, r) : mot([26, 26, 30], 0.12)(x, y, r), abajo: mot([242, 216, 198], 0.06), arriba: mot([26, 26, 30], 0.12) },
        pierna: { frente: (x, y, r) => y >= 21 ? mot([236, 236, 236], 0.08)(x, y, r) : mot([62, 92, 142], 0.12)(x, y, r), abajo: mot([200, 200, 200], 0.08), arriba: mot([62, 92, 142], 0.12) }
    }
};

const FRASES = {
    pony: [
        { es: '¡Hola! Soy Pony. Aquí pican harto.', en: "Hi! I'm Pony. They bite a lot here." },
        { es: 'Me dicen Pony, pero me llamo Anthony.', en: 'They call me Pony, but my name is Anthony.' },
        { es: 'Shh… que se asustan los peces.', en: "Shh… you'll scare the fish." },
        { es: 'Hasta los CEO se toman el día libre.', en: 'Even CEOs take a day off.' }
    ],
    ponyPesca: [
        { es: '¡Ese era grande! Bueno, mediano.', en: 'That one was huge! Well, medium.' },
        { es: '¡Pescado! Y de vuelta al agua.', en: 'Got one! And back in the water.' }
    ],
    salonas: [
        { es: '¡Bienvenido al show! Súbele.', en: 'Welcome to the show! Turn it up.' },
        { es: 'Slap, pop y un poco de locura.', en: 'Slap, pop and a bit of madness.' },
        { es: '¡PRIMUS SUCKS!', en: 'PRIMUS SUCKS!' },
        { es: 'Cinco cuerdas, cero partituras.', en: 'Five strings, zero sheet music.' },
        { es: 'Este va con harto Primus en el alma.', en: 'This one has a lot of Primus in its soul.' }
    ],
    salonasMudo: [{ es: 'Activa «Sonidos del mundo» en la pausa para escucharme.', en: 'Turn on "World sounds" in the pause menu to hear me.' }],
    lona: [
        { es: '¡Hola! Soy Lona. ¿Viste a Mila y a Gala?', en: "Hi! I'm Lona. Have you seen Mila and Gala?" },
        { es: 'Mira mi polera: Gala adelante, Mila atrás.', en: 'Check my shirt: Gala on the front, Mila on the back.' },
        { es: 'Mila es la gordita y Gala la elegante.', en: 'Mila is the chubby one, Gala the elegant one.' }
    ],
    lonaCariño: [
        { es: '¿Quién es la gatita más linda?', en: "Who's the prettiest kitty?" },
        { es: 'Ronronea igual que un motorcito.', en: 'She purrs like a little engine.' }
    ],
    // Repertorio de Lona con las gatas (una pareja de frases propia por interacción)
    lonaMecer: [
        { es: 'Shhh, a mecerse un ratito.', en: 'Shhh, a little rocking time.' },
        { es: 'Pesas como un saco de papas, pero te quiero igual.', en: 'You weigh like a sack of potatoes, but I love you anyway.' }
    ],
    lonaPluma: [
        { es: '¿La pillas? ¡A ver, a ver!', en: 'Can you catch it? Come on, come on!' },
        { es: 'Uy, casi. Tienes garras de cazadora.', en: "Ooh, almost. You've got hunter claws." }
    ],
    lonaCepillo: [
        { es: 'Quieta, que te saco los nudos.', en: "Hold still, I'm getting the knots out." },
        { es: 'Con tanto pelo me armo otra gata.', en: 'With all this fur I could make another cat.' }
    ],
    lonaSiesta: [
        { es: 'Cinco minutitos nomás…', en: 'Just five more minutes…' },
        { es: 'Zzz… pásame la frazada… zzz', en: 'Zzz… pass me the blanket… zzz' }
    ],
    lonaPlato: [
        { es: 'Pollito con arroz, como te gusta.', en: 'Chicken and rice, just how you like it.' },
        { es: 'Despacio, que nadie te lo va a quitar.', en: "Slow down, nobody's taking it from you." }
    ],
    lonaPanza: [
        { es: 'Esa nube parece un pescado. ¿La ves?', en: 'That cloud looks like a fish. See it?' },
        { es: 'Así se pasa la tarde: panza arriba.', en: "That's how you spend the afternoon: belly up." }
    ]
};

export function crearNPCs(scene, { terreno, mundo, jugador, materiales, gatas, carteles, idioma: idiomaInicial = 'es' }) {
    let idioma = idiomaInicial;
    const tinte = crearTinte();
    const lista = [];
    const DIST_GLOBO = 6;
    const rnd = (a, b) => a + Math.random() * (b - a);

    function nuevo(clave, semilla) {
        const piel = PIELES[clave];
        const p = crearPersona(tinte, { cabeza: piel.cabeza(piel), cuerpo: piel.cuerpo, brazo: piel.brazo, pierna: piel.pierna }, semilla);
        scene.add(p.g);
        const npc = {
            clave, p, x: 0, y: 0, z: 0, yaw: 0, fase: 0, t: Math.random() * 10,
            nombre: crearNombre(scene, piel.nombre), globo: crearGlobo(scene, { nombre: piel.nombre, color: COLOR_GLOBO[clave] }),
            frase: null, cambioFrase: 0, cerca: false
        };
        lista.push(npc);
        return npc;
    }
    const decir = (npc, grupo, forzar = false) => {
        const f = FRASES[grupo];
        if (!forzar && npc.frase && f.includes(npc.frase)) return;
        npc.frase = f[Math.floor(Math.random() * f.length)];
        npc.globo.decir(npc.frase[idioma]);
    };
    // Gira la cabeza hacia el jugador si está cerca
    function mirarJugador(npc, dt, dJ, max = 1) {
        let giro = 0, incl = 0;
        if (dJ < 9) {
            const aJ = Math.atan2(jugador.pos.x - npc.x, jugador.pos.z - npc.z);
            giro = Math.max(-max, Math.min(max, angulo(aJ - npc.yaw)));
            incl = Math.max(-0.4, Math.min(0.4, -Math.atan2(jugador.pos.y + 1.6 - (npc.y + 1.7), dJ)));
        }
        const k = Math.min(1, dt * 5);
        npc.p.cuello.rotation.y += (giro - npc.p.cuello.rotation.y) * k;
        npc.p.cuello.rotation.x += (incl - npc.p.cuello.rotation.x) * k;
    }
    function comun(npc, dt, dJ, grupoCerca) {
        const visible = npc.p.g.visible;
        const cerca = visible && dJ < DIST_GLOBO && !npc.escena; // en una escena habla con su propio globo
        // Al acercarse dice algo; si se queda, cambia de frase cada ~7 s
        if (cerca && (!npc.cerca || (npc.cambioFrase -= dt) <= 0)) { decir(npc, grupoCerca, true); npc.cambioFrase = 7; }
        npc.cerca = cerca;
        npc.globo.actualizar(dt, cerca && seVe(mundo, jugador.camara, npc.x, npc.y + 1.6, npc.z), npc.x, npc.y + 2.75, npc.z);
        npc.nombre.actualizar(dt, jugador.camara, mundo, visible && !cerca && !npc.escena, npc.x, npc.y + 2.35, npc.z, npc.x, npc.y + 1.2, npc.z);
    }

    // ---------------------------------------------------------
    // Pony, el pescador
    // ---------------------------------------------------------
    let pony = null;
    const P = terreno.pescador;
    if (P) {
        pony = nuevo('pony', 3100);
        pony.x = P.x; pony.z = P.z; pony.y = P.y; pony.yaw = P.yaw;
        const { p } = pony;
        // Sentado en la punta del muelle con los pies colgando
        p.cuerpo.position.y = -0.62;
        p.piernaD.rotation.x = p.piernaI.rotation.x = -0.55;
        p.brazoI.rotation.x = -0.7; p.brazoI.rotation.z = -0.25;
        // Caña: en la mano derecha, hacia adelante y arriba
        const cana = new THREE.Group();
        cana.position.set(0, -0.68, 0.06);
        const vara = caja(0.05, 2.6, 0.05, tinte.caras(texturaPixeles(4, 16, 9001, liso([92, 64, 36], 0.25))));
        vara.position.y = 1.3;
        cana.add(vara);
        const punta = new THREE.Object3D();
        punta.position.y = 2.6;
        cana.add(punta);
        p.brazoD.add(cana);
        pony.cana = cana; pony.punta = punta;
        // Línea y corcho
        const lineaGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        pony.linea = new THREE.Line(lineaGeo, new THREE.LineBasicMaterial({ color: 0x2a2a2a }));
        pony.linea.frustumCulled = false;
        scene.add(pony.linea);
        const corchoTex = texturaPixeles(4, 4, 9002, (x, y) => (y < 2 ? [214, 40, 40] : [240, 240, 240]));
        pony.corcho = caja(0.16, 0.16, 0.16, tinte.caras(corchoTex));
        scene.add(pony.corcho);
        // Pez (aparece al sacarlo)
        const pezTex = texturaPixeles(8, 4, 9003, (x, y, r) => y === 0 ? [120, 140, 150] : x >= 6 ? [90, 110, 120] : (x === 1 && y === 1 ? [10, 10, 10] : ajustar([176, 190, 196], 0.9 + r() * 0.2)));
        pony.pez = new THREE.Group();
        const pezCuerpo = caja(0.08, 0.16, 0.38, tinte.caras(pezTex));
        const cola = caja(0.04, 0.2, 0.1, tinte.caras(pezTex)); cola.position.z = -0.24;
        pony.pez.add(pezCuerpo, cola);
        pony.pez.visible = false;
        scene.add(pony.pez);
        pony.estado = 'espera'; pony.reloj = rnd(5, 10); pony.lanzamiento = 0;
        pony.blanco = { x: P.x + P.dx * 4.2, z: P.z + P.dz * 4.2 };
        if (carteles) carteles.agregar({ x: P.cartel.x, y: P.cartel.y, z: P.cartel.z, texto: { es: 'Caseta de Pony', en: "Pony's Hut" }, ancho: 3.4, distancia: 40 });
    }
    const vTmp = new THREE.Vector3();
    function actualizarPony(dt, dJ) {
        const n = pony, { p } = n;
        const aguaY = NIVEL_AGUA + 0.86;
        let alzar = 0; // ángulo extra del brazo de la caña
        n.reloj -= dt;
        const b = n.blanco;
        if (n.estado === 'espera') {
            n.corcho.position.set(b.x, aguaY + Math.sin(n.t * 2.2) * 0.03, b.z);
            if (n.reloj <= 0) { n.estado = 'pica'; n.reloj = 1.4; }
        } else if (n.estado === 'pica') {
            const tirones = Math.sin((1.4 - n.reloj) * 18);
            n.corcho.position.set(b.x, aguaY - Math.max(0, tirones) * 0.18, b.z);
            alzar = 0.08 * Math.max(0, tirones);
            if (n.reloj <= 0) { n.estado = 'saca'; n.reloj = 0.9; }
        } else if (n.estado === 'saca') {
            // El pez sale del agua en arco hasta la mano
            const u = 1 - n.reloj / 0.9;
            alzar = Math.min(1, u * 2.5) * 0.9;
            const mano = vTmp.set(n.x, n.y + 1.1, n.z);
            n.pez.visible = true;
            n.pez.position.set(lerp(b.x, mano.x, u), lerp(aguaY, mano.y, u) + Math.sin(u * Math.PI) * 1.6, lerp(b.z, mano.z, u));
            n.pez.rotation.set(u * 9, n.yaw, 0);
            n.corcho.position.copy(n.pez.position);
            if (n.reloj <= 0) {
                n.estado = 'muestra'; n.reloj = 1.8;
                if (n.cerca) { decir(n, 'ponyPesca', true); n.cambioFrase = 4; }
            }
        } else if (n.estado === 'muestra') {
            alzar = 0.9;
            n.pez.position.set(n.x + Math.sin(n.yaw) * 0.45, n.y + 1.15, n.z + Math.cos(n.yaw) * 0.45);
            n.pez.rotation.set(Math.sin(n.t * 20) * 0.5, n.yaw + Math.PI / 2, 0); // coletea
            n.corcho.position.copy(n.pez.position);
            if (n.reloj <= 0) { n.estado = 'suelta'; n.reloj = 0.8; n.desde = n.pez.position.clone(); }
        } else if (n.estado === 'suelta') {
            const u = 1 - n.reloj / 0.8;
            alzar = 0.9 * (1 - u);
            const destino = { x: n.x + Math.sin(n.yaw) * 2.5, z: n.z + Math.cos(n.yaw) * 2.5 };
            n.pez.position.set(lerp(n.desde.x, destino.x, u), lerp(n.desde.y, aguaY - 0.3, u) + Math.sin(u * Math.PI) * 0.8, lerp(n.desde.z, destino.z, u));
            n.pez.rotation.x += dt * 12;
            n.corcho.position.set(n.x + Math.sin(n.yaw) * 0.6, n.y + 0.4, n.z + Math.cos(n.yaw) * 0.6);
            if (n.reloj <= 0) { n.pez.visible = false; n.estado = 'lanza'; n.reloj = 0.9; }
        } else if (n.estado === 'lanza') {
            // Lanza: la caña va atrás y adelante, el corcho vuela en arco
            const u = 1 - n.reloj / 0.9;
            alzar = u < 0.35 ? u / 0.35 * 1.1 : 1.1 * (1 - (u - 0.35) / 0.65) - 0.15 * Math.sin((u - 0.35) / 0.65 * Math.PI);
            const k = Math.max(0, (u - 0.35) / 0.65);
            n.blanco = { x: P.x + P.dx * rnd(3.6, 5) + rnd(-1, 1) * Math.abs(P.dz), z: P.z + P.dz * rnd(3.6, 5) + rnd(-1, 1) * Math.abs(P.dx) };
            if (k > 0) {
                if (!n.blancoFijo) n.blancoFijo = n.blanco;
                const B = n.blancoFijo;
                n.corcho.position.set(lerp(n.x, B.x, k), lerp(n.y + 2.5, aguaY, k) + Math.sin(k * Math.PI) * 1.2, lerp(n.z, B.z, k));
            }
            if (n.reloj <= 0) { n.blanco = n.blancoFijo || n.blanco; n.blancoFijo = null; n.estado = 'espera'; n.reloj = rnd(7, 16); }
        }
        p.brazoD.rotation.x = -0.75 - alzar;
        n.cana.rotation.x = 1.7;
        mirarJugador(n, dt, dJ, 0.8);
        // Línea desde la punta de la caña hasta el corcho
        p.g.updateMatrixWorld(true);
        n.punta.getWorldPosition(vTmp);
        // La línea vive en la escena de las criaturas (en la supervivencia, un grupo subido dy): a sus coordenadas
        if (n.linea.parent) n.linea.parent.worldToLocal(vTmp);
        const pos = n.linea.geometry.attributes.position;
        pos.setXYZ(0, vTmp.x, vTmp.y, vTmp.z);
        pos.setXYZ(1, n.corcho.position.x, n.corcho.position.y + 0.08, n.corcho.position.z);
        pos.needsUpdate = true;
        n.linea.geometry.computeBoundingSphere();
    }

    // ---------------------------------------------------------
    // Salonas, el bajista
    // ---------------------------------------------------------
    let salonas = null;
    const E = terreno.escenario;
    const bajo = E ? crearBajo() : null;
    if (E) {
        salonas = nuevo('salonas', 3200);
        salonas.x = E.x; salonas.z = E.z; salonas.y = E.y; salonas.yaw = E.yaw;
        const { p } = salonas;
        // Bajo de 5 cuerdas color caoba, colgado delante del torso: mástil hacia su izquierda (+X)
        const caoba = texturaPixeles(16, 16, 9101, (x, y, r) => ajustar([142, 58, 34], (0.86 + r() * 0.2) * (1 - Math.abs(x - 8) * 0.012)));
        const diapason = texturaPixeles(4, 32, 9102, (x, y, r) => (y % 4 === 0) ? [190, 190, 186] : ajustar([46, 30, 22], 0.9 + r() * 0.2));
        const mastilTex = texturaPixeles(4, 16, 9103, (x, y, r) => ajustar([124, 76, 44], 0.9 + r() * 0.15));
        const instrumento = new THREE.Group();
        const cuerpoBajo = caja(0.6, 0.38, 0.1, tinte.caras(caoba));
        const cuerno = caja(0.18, 0.16, 0.1, tinte.caras(caoba)); cuerno.position.set(0.28, 0.2, 0);
        const pastilla = caja(0.08, 0.26, 0.02, tinte.caras(texturaPixeles(2, 2, 9104, () => [18, 18, 18])));
        pastilla.position.set(-0.05, 0, 0.06);
        const mastil = caja(1.15, 0.09, 0.06, tinte.caras(mastilTex, { 4: diapason }));
        mastil.position.set(0.85, 0.05, 0.02);
        const pala = caja(0.22, 0.13, 0.05, tinte.caras(mastilTex)); pala.position.set(1.52, 0.07, 0.02);
        instrumento.add(cuerpoBajo, cuerno, pastilla, mastil, pala);
        for (let k = 0; k < 5; k++) { // clavijas
            const c = caja(0.03, 0.03, 0.08, tinte.caras(texturaPixeles(2, 2, 9105, () => [200, 200, 196])));
            c.position.set(1.45 + (k % 3) * 0.06, 0.07 + (k < 3 ? 0.08 : -0.08), 0.02);
            instrumento.add(c);
        }
        instrumento.position.set(0.05, 0.86, 0.2);
        instrumento.rotation.z = 0.42;
        p.cuerpo.add(instrumento);
        salonas.instrumento = instrumento;
        // Brazos: el izquierdo en el mástil, el derecho sobre las cuerdas
        p.brazoI.rotation.set(-1.05, 0, 0.55);
        p.brazoD.rotation.set(-0.6, 0, 0.3);
        salonas.golpe = 0; salonas.mano = 0;
        if (carteles) carteles.agregar({ x: E.cartel.x, y: E.cartel.y, z: E.cartel.z, texto: { es: 'Salonas · en vivo', en: 'Salonas · live' }, ancho: 4.2, distancia: 60 });
    }
    function actualizarSalonas(dt, dJ, t) {
        const n = salonas, { p } = n;
        // Sonido: volumen por distancia y paneo según el lado de la cámara
        // Lado: proyección de la dirección hacia Salonas sobre la derecha de la cámara
        const dx = n.x - jugador.pos.x, dz = n.z - jugador.pos.z, d = Math.hypot(dx, dz) || 1;
        const lado = (dx * Math.cos(jugador.yaw) - dz * Math.sin(jugador.yaw)) / d;
        bajo.actualizar(dJ, lado);
        for (const ev of bajo.sacarEventos()) {
            n.golpe = ev.tipo === 'g' ? 0.5 : 1;
            // La mano izquierda recorre el mástil según la nota (graves cerca de la pala)
            n.mano = Math.max(0, Math.min(1, (ev.nota - 23) / 36));
        }
        n.golpe = Math.max(0, n.golpe - dt * 7);
        const tocando = bajo.sonando;
        const pulso = tocando ? bajo.pulso : (t * 1.6) % 1;
        // Brazo derecho: golpe de slap; izquierdo: sube y baja por el mástil
        p.brazoD.rotation.x = -0.62 - n.golpe * 0.35;
        p.brazoD.rotation.z = 0.3 - n.golpe * 0.12;
        const objetivoMano = tocando ? lerp(0.62, 0.4, n.mano) : 0.55;
        p.brazoI.rotation.z += (objetivoMano - p.brazoI.rotation.z) * Math.min(1, dt * 14);
        // Cabeceo, balanceo y pie marcando el pulso
        const golpeteo = Math.pow(Math.sin(pulso * Math.PI), 4);
        p.cuello.rotation.x = 0.1 + golpeteo * (tocando ? 0.22 : 0.06);
        p.cuerpo.rotation.z = Math.sin(t * (tocando ? 2.6 : 1.2)) * 0.05;
        p.piernaD.rotation.x = -golpeteo * (tocando ? 0.18 : 0.05);
        n.instrumento.rotation.z = 0.42 + n.golpe * 0.03;
        if (dJ < 9 && !tocando) mirarJugador(n, dt, dJ, 0.7);
        else p.cuello.rotation.y += (0 - p.cuello.rotation.y) * Math.min(1, dt * 3);
        // Si el sonido está apagado, avisa cómo escucharlo
        if (n.cerca && !sonando() && !FRASES.salonasMudo.includes(n.frase)) decir(n, 'salonasMudo', true);
    }

    // ---------------------------------------------------------
    // Lona, en la gatera
    // ---------------------------------------------------------
    let lona = null;
    const [gx, gz] = terreno.datos.P.gatera;
    if (gatas) {
        lona = nuevo('lona', 3300);
        // Pelo largo: placa que cae por la espalda desde la nuca
        const peloTex = texturaPixeles(16, 16, 9201, (x, y, r) => ajustar([16, 14, 18], 0.86 + r() * 0.3));
        const melena = caja(0.52, 0.36, 0.07, tinte.caras(peloTex)); // llega a los hombros: no tapa «MILA»
        melena.position.set(0, 0.09, -0.27);
        lona.p.cuello.add(melena);
        lona.x = (gx + 1) * ESCALA; lona.z = (gz + 3) * ESCALA; lona.y = 0;
        lona.ruta = null; lona.espera = 2; lona.pose = 'pie'; lona.bs = 0; lona.cargada = false; lona.gata = null;
    }
    const casaGatera = { x0: (gx - 4) * ESCALA, x1: (gx + 3) * ESCALA, z0: (gz - 10) * ESCALA, z1: (gz - 5) * ESCALA + 1 };
    const enCasa = (x, z) => x > casaGatera.x0 - 1.5 && x < casaGatera.x1 + 1.5 && z > casaGatera.z0 - 1.5 && z < casaGatera.z1 + 1.5;
    const sueloLona = (x, z) => enCasa(x, z) ? null : suelo(terreno, mundo, x, z, { estructuras: true });

    // ---------------------------------------------------------
    // Repertorio de Lona con Mila y Gala
    // Al llegar junto a una gata elige al azar (sin repetir la anterior) una interacción. Cada una tiene
    // una pose de Lona (metas que se mezclan con su pose sentada, con rampas de entrada y salida), una
    // reacción de la gata por el gancho `gata.escena` de gatas.js y su pareja de frases (FRASES.lona*).
    //   cariño   la de siempre: sentada, le hace cariño (la gata sigue con su IA)
    //   mecer    la carga en el regazo y la mece (la gata vuelve a su sitio al final)        11 s
    //   pluma    juega con una varita con pluma; la gata la sigue con la cabeza y manotea    10 s
    //   cepillo  la cepilla echada de lado, la gata ronronea                                 11 s
    //   siesta   las dos sentadas lado a lado cabecean y se quedan dormidas                  12 s
    //   plato    le deja un plato de comida; la gata baja el pecho y come                    10 s
    //   panza    Lona se echa de espaldas con las manos tras la nuca y la gata a su lado     12 s
    // Si una escena de la supervivencia toma a Lona (n.escena) o a la gata (otro gata.escena), la
    // interacción se corta y se restaura lo que tocó.
    // ---------------------------------------------------------
    const suave = u => u * u * (3 - 2 * u);
    const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
    const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));
    const SENT = -Math.PI / 2; // piernas de Lona sentada (las compensaciones de inclinación parten de aquí)
    const vL = new THREE.Vector3();

    // Objetos (cajas pixeladas, se crean al primer uso)
    const tex = (c, s) => tinte.caras(texturaPixeles(4, 4, s, liso(c, 0.2)));
    let objs = null;
    function objetos() {
        if (objs) return objs;
        const pluma = new THREE.Group();
        const palo = caja(0.04, 0.5, 0.04, tex([120, 82, 44], 9301)); palo.position.y = -0.25;
        const hilo = caja(0.015, 0.22, 0.015, tex([226, 222, 210], 9302)); hilo.position.y = -0.61;
        const plumas = caja(0.12, 0.18, 0.03, tex([236, 120, 160], 9303)); plumas.position.y = -0.8;
        pluma.add(palo, hilo, plumas);
        pluma.position.set(0, -0.68, 0.04);
        pluma.punta = plumas;
        const cepillo = new THREE.Group();
        const mango = caja(0.05, 0.24, 0.05, tex([150, 96, 54], 9304)); mango.position.y = -0.1;
        const cerdas = caja(0.16, 0.07, 0.11, tex([210, 210, 204], 9305)); cerdas.position.set(0, -0.24, 0.03);
        cepillo.add(mango, cerdas);
        cepillo.position.set(0, -0.66, 0.06);
        const plato = new THREE.Group();
        const loza = caja(0.34, 0.1, 0.34, tex([196, 52, 52], 9306)); loza.position.y = 0.05;
        const comida = caja(0.26, 0.03, 0.26, tex([196, 150, 96], 9307)); comida.position.y = 0.11;
        plato.add(loza, comida);
        plato.comida = comida;
        objs = { pluma, cepillo, plato };
        return objs;
    }

    // Metas de Lona: y, inc (torso), rz, pD/pI (piernas, se suman a SENT menos inc), bDx/bDz/bIx/bIz, cx/cy/cz
    const INTER = {
        mecer: {
            dur: 11, radio: 1.2, frases: 'lonaMecer', mueve: true,
            pose(t, I) {
                const a = this.dur;
                const alc = Math.max(envolvente(t, 0.4, 2.0, 0.45), envolvente(t, a - 2.5, a - 1.0, 0.45)); // tomarla y dejarla
                const abr = suave(tramo(t, 1.7, 2.3)) * (1 - suave(tramo(t, a - 2.5, a - 2.0)));             // abrazo
                const mece = Math.sin(t * 1.6) * abr;
                const hug = -1.85 + (0.7 - I.g.e.alto) * 2; // Mila (alta) -1,85, Gala -1,57: manos ~0,1 sobre el lomo
                return {
                    // Abrazo: la gata en el regazo llega a la altura de los hombros, así que las manos la rodean por encima
                    inc: 0.28 * alc - 0.05 * abr, rz: 0.07 * mece,
                    bDx: lerp(lerp(-0.9, -1.4, alc), hug, abr), bDz: lerp(0.05, 0.35, abr),
                    bIx: lerp(lerp(-0.3, -1.4, alc), hug, abr), bIz: lerp(-0.05, -0.35, abr),
                    cx: 0.4, cz: -0.1 * mece
                };
            },
            gata(I, g, dt) {
                const t = I.t, a = this.dur, n = lona;
                const k = suave(tramo(t, 0.9, 1.9)) * (1 - suave(tramo(t, a - 2.1, a - 1.1)));
                // En el regazo: delante de la cadera, cruzada sobre las piernas, a la altura de los muslos
                const rx = n.x + Math.sin(n.yaw) * 0.42, rz = n.z + Math.cos(n.yaw) * 0.42;
                g.x = lerp(I.g0.x, rx, k); g.z = lerp(I.g0.z, rz, k);
                g.y = lerp(I.g0.y, n.y + 0.22, k) + Math.sin(k * Math.PI) * 0.35;
                g.pose = t > 0.6 && t < a - 1.1 ? 'echada' : 'pie';
                g.yaw += angulo((k > 0.5 ? n.yaw + Math.PI / 2 : I.aL) - g.yaw) * Math.min(1, dt * 4);
                g.cabeza.rotation.z = Math.sin(t * 1.6) * 0.12 * k;
                g.cola.rotation.y = Math.sin(t * 1.6) * 0.25 * k;
                g.ronroneo = t > 2.2 && t < a - 1.3;
            }
        },
        pluma: {
            dur: 10, radio: 2.0, frases: 'lonaPluma', objeto: 'pluma',
            pose(t) {
                // La pluma baila delante y por encima de la cara de la gata (que mira hacia arriba)
                const s = Math.sin(t * 3.2);
                return { inc: 0.05, bDx: -2.0 + Math.sin(t * 1.3) * 0.12, bDz: s * 0.45, bIx: -0.45, bIz: -0.12, cx: 0.15, cy: s * 0.18 };
            },
            gata(I, g, dt) {
                const t = I.t;
                g.pose = 'sentada';
                g.yaw += angulo(I.aL - g.yaw) * Math.min(1, dt * 4);
                // La cabeza sigue a la pluma
                objetos().pluma.punta.getWorldPosition(vL); g.g.parent.worldToLocal(vL);
                const rel = Math.max(-0.9, Math.min(0.9, angulo(Math.atan2(vL.x - g.x, vL.z - g.z) - g.yaw)));
                g.cabeza.rotation.y += (rel - g.cabeza.rotation.y) * Math.min(1, dt * 8);
                g.cabeza.rotation.x -= 0.2;
                // Manotazos alternados con las patas delanteras
                const c = t / 1.4, u = c % 1;
                const golpe = t > 1.6 && t < this.dur - 1 && u < 0.4 ? Math.sin(u / 0.4 * Math.PI) : 0;
                g.patas[Math.floor(c) % 2].rotation.x -= 1.1 * golpe;
                g.cola.rotation.y = Math.sin(t * 9) * 0.3;
                if (!I.maullo && t > 1.2) { I.maullo = true; g.maullar(1.0); }
            }
        },
        cepillo: {
            dur: 11, radio: 1.05, frases: 'lonaCepillo', objeto: 'cepillo',
            pose(t) {
                // La mano pasa sobre el lomo (0,1 encima) y va y viene a lo largo de la gata, que está de lado
                const s = Math.sin(t * 2.2);
                return { inc: 0.22, bDx: -1.55 + Math.abs(s) * 0.06, bDz: 0.25 + s * 0.3, bIx: -0.5, bIz: -0.1, cx: 0.45, cy: s * 0.08 };
            },
            gata(I, g, dt) {
                const t = I.t;
                g.pose = 'echada';
                g.yaw += angulo(I.aL + Math.PI / 2 - g.yaw) * Math.min(1, dt * 4); // de lado: el lomo hacia Lona
                g.cabeza.rotation.x -= 0.08;
                g.cabeza.rotation.z = 0.12 + 0.05 * Math.sin(t * 2.2);
                g.cola.rotation.y = Math.sin(t * 1.5) * 0.2;
                g.ronroneo = t > 1.5 && t < this.dur - 0.8;
            }
        },
        siesta: {
            dur: 12, radio: 1.0, frases: 'lonaSiesta', giro: -1.2, // la gata queda a su izquierda
            pose(t) {
                const f = (t % 3.4) / 3.4, cab = t > 6.5 ? 1 : (f < 0.85 ? suave(f / 0.85) : 1 - (f - 0.85) / 0.15);
                return { inc: 0.06 + Math.sin(t * 1.3) * 0.025, bDx: -0.55, bDz: 0.2, bIx: -0.55, bIz: -0.2, cx: 0.12 + 0.36 * cab, cz: 0.14 * cab };
            },
            gata(I, g, dt) {
                const t = I.t, f = ((t + 1.7) % 3.4) / 3.4;
                const cab = t > 7 ? 1 : (f < 0.85 ? suave(f / 0.85) : 1 - (f - 0.85) / 0.15);
                g.pose = t < 7 ? 'sentada' : 'echada';
                g.yaw += angulo(lona.yaw - g.yaw) * Math.min(1, dt * 3); // mira para el mismo lado que Lona
                g.cabeza.rotation.x += 0.3 * cab;
                g.cola.rotation.y = Math.sin(t * 0.8) * 0.08;
                g.ronroneo = t > 3.5 && t < this.dur - 0.8;
            }
        },
        plato: {
            // Lejos (1,9) para que el plato (a ~1,05 de Lona) quede más allá de sus pies y la gata no se le eche encima
            dur: 10, radio: 1.9, frases: 'lonaPlato', objeto: 'plato',
            pose(t) {
                const alc = envolvente(t, 0.5, 2.0, 0.45);
                return { inc: 0.08 + 0.37 * alc, bDx: lerp(-0.6, -0.95, alc), bDz: 0.1, bIx: -0.55, bIz: -0.15, cx: 0.35 + 0.1 * alc };
            },
            gata(I, g, dt) {
                const t = I.t, a = this.dur, pl = objetos().plato;
                // El plato aparece en el suelo, delante de su cara, cuando la mano de Lona llega abajo
                const sc = suave(tramo(t, 1.2, 1.45)) * (1 - suave(tramo(t, a - 0.7, a - 0.2)));
                pl.visible = sc > 0.01; pl.scale.setScalar(Math.max(0.01, sc));
                const q = 1 - 0.95 * suave(tramo(t, 2.2, 7.4));
                pl.comida.scale.set(q, 1, q);
                // Come echada como un pan (así la boca llega al plato); después se sienta y se relame
                g.pose = t < 1.7 ? 'pie' : t < 7.6 ? 'echada' : 'sentada';
                g.yaw += angulo(I.aL - g.yaw) * Math.min(1, dt * 4);
                const comer = envolvente(t, 2.0, 7.6, 0.5);
                g.cabeza.rotation.x += 0.45 * comer + Math.sin(t * 10) * 0.07 * comer;
                g.cabeza.rotation.y = Math.sin(t * 5) * 0.15 * tramo(t, 7.8, 8.2); // se relame
                g.ronroneo = t > 7.8 && t < a - 0.5;
            }
        },
        panza: {
            dur: 12, radio: 1.33, frases: 'lonaPanza', rampa: 1.0, echada: true,
            giro: -Math.atan2(0.75, -1.1), // la gata queda a su izquierda, a la altura del pecho cuando se echa
            pose(t) {
                // De espaldas: el cuerpo gira en los pies (y 0,12 apoya la espalda y la nuca en el suelo)
                return { y: 0.12, inc: -1.5, pD: 0, pI: 0.08, bDx: -3.0, bDz: 0.4, bIx: -3.0, bIz: -0.4, cx: -0.1, cy: 0.6 * envolvente(t, 3, 8.5, 0.8) };
            },
            gata(I, g, dt) {
                const t = I.t;
                g.pose = 'echada';
                g.yaw += angulo(lona.yaw + Math.PI - g.yaw) * Math.min(1, dt * 3); // cabeza junto a la de Lona
                g.cabeza.rotation.y += (0.6 - g.cabeza.rotation.y) * Math.min(1, dt * 3);
                g.cola.rotation.y = Math.sin(t * 1.2) * 0.15;
                g.ronroneo = t > 2 && t < this.dur - 0.8;
            }
        }
    };
    const TIPOS = Object.keys(INTER);

    function empezarInter(n, g, tipo) {
        const def = INTER[tipo];
        const aG = Math.atan2(g.x - n.x, g.z - n.z);
        const I = { tipo, def, g, n, t: 0, frase: 0, g0: { x: g.x, y: g.y, z: g.z }, aL: aG + Math.PI, yawLona: aG + (def.giro || 0), obj: null };
        n.inter = I; n.gata = g; n.pose = 'sentada'; n.espera = def.dur;
        g.escena = (d) => def.gata(I, g, d);
        I.fn = g.escena;
        g.poseElegida = false;
        if (def.objeto) {
            const o = objetos()[def.objeto];
            if (def.objeto === 'plato') {
                // En el suelo, delante de la cara de la gata (que mira a Lona)
                const r = g.e.largo / 2 + 0.3;
                o.position.set(g.x + Math.sin(I.aL) * r, g.y, g.z + Math.cos(I.aL) * r);
                o.visible = false;
                g.g.parent.add(o); // mismo grupo que la gata (en la supervivencia, subido dy)
            } else n.p.brazoD.add(o);
            I.obj = o;
        }
    }
    function terminarInter(n) {
        const I = n.inter;
        if (!I) return;
        n.inter = null; n.gata = null;
        if (I.obj && I.obj.parent) I.obj.parent.remove(I.obj);
        const g = I.g;
        if (g.escena === I.fn) {
            delete g.escena;
            g.ronroneo = false; g.pose = 'pie'; g.poseElegida = false; g.espera = rnd(1, 3);
            g.cabeza.rotation.y = 0; g.cabeza.rotation.z = 0;
            if (I.def.mueve) { g.x = I.g0.x; g.y = I.g0.y; g.z = I.g0.z; }
        }
        const p = n.p;
        p.cuerpo.rotation.x = 0; p.cuerpo.rotation.z = 0;
        p.cuello.rotation.y = 0; p.cuello.rotation.z = 0;
        p.brazoD.rotation.z = 0; p.brazoI.rotation.z = 0;
        n.cambioFrase = 2;
    }
    // Mezcla la pose de la interacción sobre la pose sentada que ya escribió actualizarLona
    function aplicarInter(n) {
        const I = n.inter, p = n.p, m = I.def.pose(I.t, I);
        const w = envolvente(I.t, 0, I.def.dur, I.def.rampa || 0.7);
        const inc = m.inc || 0;
        p.cuerpo.position.y = lerp(p.cuerpo.position.y, m.y ?? p.cuerpo.position.y, w);
        p.cuerpo.rotation.x = inc * w;
        p.cuerpo.rotation.z = (m.rz || 0) * w;
        // Piernas: estiradas adelante y compensadas para que la inclinación no las hunda en el suelo
        p.piernaD.rotation.x = lerp(p.piernaD.rotation.x, (m.pD ?? SENT) - inc, w);
        p.piernaI.rotation.x = lerp(p.piernaI.rotation.x, (m.pI ?? SENT + 0.1) - inc, w);
        if (m.bDx !== undefined) p.brazoD.rotation.x = lerp(p.brazoD.rotation.x, m.bDx, w);
        if (m.bIx !== undefined) p.brazoI.rotation.x = lerp(p.brazoI.rotation.x, m.bIx, w);
        p.brazoD.rotation.z = (m.bDz || 0) * w;
        p.brazoI.rotation.z = (m.bIz || 0) * w;
        if (m.cx !== undefined) p.cuello.rotation.x = lerp(p.cuello.rotation.x, m.cx, w);
        p.cuello.rotation.y = (m.cy || 0) * w;
        p.cuello.rotation.z = (m.cz || 0) * w;
    }
    // Frases: la primera al empezar y la segunda a la mitad (solo se ven si el jugador está cerca)
    function frasesInter(n) {
        const I = n.inter, f = FRASES[I.def.frases];
        const k = I.t >= 0.4 ? (I.t >= I.def.dur * 0.5 ? 2 : 1) : 0;
        if (k > I.frase) {
            I.frase = k;
            n.frase = f[k - 1]; n.globo.decir(n.frase[idioma]);
            n.cambioFrase = 99;
        }
    }

    function actualizarLona(dt, dJ, t) {
        const n = lona, { p } = n;
        if (!n.cargada) {
            const y0 = sueloLona(n.x, n.z);
            if (!y0) { p.g.visible = false; return; }
            n.y = y0; n.cargada = true;
        }
        let mueve = false;
        if (n.pose === 'sentada') {
            // Sentada acariciando a una gata (o descansando); mira hacia ella
            n.espera -= dt;
            const g = n.gata, I = n.inter;
            if (I) {
                // Repertorio: Lona gira hacia su sitio (fijado al empezar); si otra escena tomó a la gata, corta
                I.t += dt;
                n.espera = I.def.dur - I.t; // termina por su reloj (depuración: npcs.lona.inter.t = s)
                n.yaw += angulo(I.yawLona - n.yaw) * Math.min(1, dt * 3);
                if (g.escena !== I.fn) n.espera = 0;
            } else if (g) {
                const objetivo = Math.atan2(g.x - n.x, g.z - n.z);
                n.yaw += angulo(objetivo - n.yaw) * Math.min(1, dt * 3);
                if (Math.hypot(g.x - n.x, g.z - n.z) > 3.2 || g.escena) n.espera = Math.min(n.espera, 0.5);
            }
            if (n.espera <= 0) { terminarInter(n); n.pose = 'pie'; n.gata = null; n.espera = rnd(1, 3); }
        } else if (n.espera > 0) {
            n.espera -= dt;
        } else if (!n.ruta) {
            // ¿Hay una gata afuera y cerca? Va a hacerle cariño. Si no, pasea por la gatera
            const libres = gatas.gatas.filter(g => g.g.visible && !g.cajaEst && !g.escena && !enCasa(g.x, g.z) && Math.hypot(g.x - n.x, g.z - n.z) < 22);
            if (libres.length && Math.random() < 0.55) {
                const g = libres[Math.floor(Math.random() * libres.length)];
                const a = Math.random() * Math.PI * 2;
                // Elige qué hará con ella (sin repetir la anterior); cada interacción pide su distancia
                const op = ['cariño', ...TIPOS].filter(k => k !== n.ultimaInter);
                const tipo = op[Math.floor(Math.random() * op.length)];
                const r = INTER[tipo] ? INTER[tipo].radio : 1.4;
                n.ruta = { x: g.x + Math.sin(a) * r, z: g.z + Math.cos(a) * r, gata: g, a, r, tipo };
            } else {
                for (let k = 0; k < 12; k++) {
                    const x = rnd((gx - 9) * ESCALA, (gx + 9) * ESCALA), z = rnd((gz - 4) * ESCALA, (gz + 7) * ESCALA);
                    if (sueloLona(x, z)) { n.ruta = { x, z }; break; }
                }
                if (!n.ruta) n.espera = 1;
            }
        } else {
            const w = n.ruta;
            // Si la gata entró en una escena (caricia del jugador o escena especial), Lona la deja tranquila
            if (w.gata && w.gata.escena) { n.ruta = null; n.espera = rnd(2, 4); return; }
            if (w.gata) { w.x = w.gata.x + Math.sin(w.a) * w.r; w.z = w.gata.z + Math.cos(w.a) * w.r; } // la gata se mueve: la sigue
            const dx = w.x - n.x, dz = w.z - n.z, d = Math.hypot(dx, dz);
            if (d < 0.3) {
                const g = w.gata;
                const libre = g && g.g.visible && g.cargada && !g.escena && !g.cajaEst;
                if (g && Math.hypot(g.x - n.x, g.z - n.z) < 2.6 && libre && INTER[w.tipo]) { empezarInter(n, g, w.tipo); n.ultimaInter = w.tipo; }
                else if (g && Math.hypot(g.x - n.x, g.z - n.z) < 2.6) { n.ultimaInter = 'cariño'; n.pose = 'sentada'; n.gata = g; n.espera = rnd(6, 11); if (n.cerca) { decir(n, 'lonaCariño', true); n.cambioFrase = 6; } }
                else if (Math.random() < 0.25) { n.pose = 'sentada'; n.espera = rnd(5, 9); }
                else n.espera = rnd(2, 6);
                n.ruta = null;
            } else {
                const paso = Math.min(d, 1.5 * dt);
                const nx = n.x + dx / d * paso, nz = n.z + dz / d * paso;
                const ny = sueloLona(nx, nz);
                if (ny === undefined) n.espera = 0.5;
                else if (ny === null || Math.abs(ny - n.y) > 1.2) { n.ruta = null; n.espera = rnd(0.5, 1.5); }
                else {
                    n.x = nx; n.z = nz; n.y += (ny - n.y) * Math.min(1, dt * 10);
                    n.yaw += angulo(Math.atan2(dx, dz) - n.yaw) * Math.min(1, dt * 7);
                    mueve = true;
                }
            }
        }
        // Pose: de pie / sentada en el suelo con las piernas hacia adelante
        const objS = n.pose === 'sentada' ? 1 : 0;
        n.bs += (objS - n.bs) * Math.min(1, dt * 4);
        n.fase += mueve ? dt * 7 : 0;
        caminar(p, n.fase, mueve ? 0.6 : 0);
        p.cuerpo.position.y = -0.6 * n.bs;
        p.piernaD.rotation.x = lerp(p.piernaD.rotation.x, -Math.PI / 2, n.bs);
        p.piernaI.rotation.x = lerp(p.piernaI.rotation.x, -Math.PI / 2 + 0.1, n.bs);
        // Acariciando: el brazo derecho va y viene sobre la gata
        const cariño = n.gata && n.pose === 'sentada' ? 1 : 0;
        p.brazoD.rotation.x = lerp(p.brazoD.rotation.x, -1.0 + Math.sin(t * 4) * 0.25, n.bs * (cariño || 0.3));
        p.brazoI.rotation.x = lerp(p.brazoI.rotation.x, -0.3, n.bs);
        if (!cariño) mirarJugador(n, dt, dJ);
        else p.cuello.rotation.x += (0.45 - p.cuello.rotation.x) * Math.min(1, dt * 4);
        if (n.inter) { aplicarInter(n); frasesInter(n); }
    }

    let tiempo = 0;
    return {
        lista, pony, salonas, lona, bajo,
        // Depuración del repertorio de Lona: forzarLona('pluma', 'mila') la pone junto a la gata y empieza;
        // npcs.lona.inter.t = s salta a un segundo
        forzarLona(tipo, clave) {
            const g = gatas && gatas.gatas.find(x => x.clave === clave);
            if (!lona || !g || !INTER[tipo] || g.escena || !g.cargada || !lona.cargada) return false;
            terminarInter(lona);
            const a = Math.atan2(lona.x - g.x, lona.z - g.z), r = INTER[tipo].radio;
            lona.x = g.x + Math.sin(a) * r; lona.z = g.z + Math.cos(a) * r;
            const y = sueloLona(lona.x, lona.z); if (y) lona.y = y;
            lona.ruta = null; lona.yaw = Math.atan2(g.x - lona.x, g.z - lona.z);
            empezarInter(lona, g, tipo); lona.ultimaInter = tipo;
            return true;
        },
        actualizar(dt, oculto = false) {
            tiempo += dt;
            dt = Math.min(dt, 0.05);
            tinte.aplicar(materiales.solido.color);
            for (const n of lista) {
                n.t += dt;
                const dJ = Math.hypot(n.x - jugador.pos.x, n.z - jugador.pos.z);
                n.p.g.visible = !oculto && dJ < RADIO_VISIBLE;
                if (!n.p.g.visible) {
                    if (n === salonas) bajo.actualizar(999, 0); // lejos o en la arena: se apaga la música
                    n.nombre.ocultar(); n.globo.actualizar(dt, false, n.x, n.y, n.z);
                    if (n === pony) { n.linea.visible = n.corcho.visible = n.pez.visible = false; }
                    continue;
                }
                if (n === pony) n.linea.visible = n.corcho.visible = true;
                // n.escena (escenas de la supervivencia) reemplaza la animación; recibe la normal por si quiere usarla
                const base = (d = dt) => {
                    if (n === pony) actualizarPony(d, dJ);
                    else if (n === salonas) actualizarSalonas(d, dJ, tiempo);
                    else if (n === lona) actualizarLona(d, dJ, tiempo);
                };
                if (n.escena && n.inter) terminarInter(n); // una escena de la supervivencia manda sobre el repertorio
                if (n.escena) n.escena(dt, base); else base();
                if (!n.p.g.visible) continue;
                n.p.g.position.set(n.x, n.y, n.z);
                n.p.g.rotation.y = n.yaw;
                comun(n, dt, dJ, n.inter ? n.inter.def.frases : n.clave);
            }
        },
        setIdioma(i) {
            idioma = i;
            for (const n of lista) if (n.frase) n.globo.decir(n.frase[idioma]);
        }
    };
}
