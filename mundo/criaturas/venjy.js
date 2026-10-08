// =========================================================
// VENJY · Venjy en persona, repartido por todo el mapa
// Benjamín «Venjy» Flores: blanco, rulos oscuros con volumen, barba pelirroja completa
// y lentes cuadrados. Recibe en el inicio y explica cada lugar del portafolio, con una
// animación distinta en cada uno (saluda, lee, presenta, pica, construye, acaricia gatas,
// escribe, muestra el celular…), y aparece también en varios rincones para explorar.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { ESCALA, NIVEL_AGUA } from '../voxeles.js';
import {
    seVe, RADIO_VISIBLE, ajustar, lerp, angulo, crearTinte, crearPersona, caminar, caja, texturaPixeles, liso,
    crearNombre, crearGlobo, suelo, audioMundo, sonando, bufferRuido
} from './cuerpo.js';
import { pielDe, agregarExtras } from './pieles.js';

const VENJY = {
    piel: [240, 212, 192], pelo: { color: [56, 34, 22], estilo: 'rulos' }, ojos: [74, 50, 30],
    barba: true, barbaColor: [182, 88, 42], lentes: true,
    ropa: { tipo: 'poleron', color: [54, 126, 70] }, pantalon: [56, 80, 124], zapatillas: 'blancas'
};
const suave = u => u * u * (3 - 2 * u);

// Lo que dice en cada lugar (es / en)
const F = (es, en) => ({ es, en });
const DICHOS = {
    inicio: [
        F('¡Hola! Soy Venjy, Benjamín Flores. Bienvenido a mi portafolio hecho Minecraft.', "Hi! I'm Venjy, Benjamín Flores. Welcome to my portfolio, Minecraft style."),
        F('Consejo: la versión estable es el mapa horizontal. Para la mejor experiencia, usa ese.', 'Tip: the stable version is the horizontal map. For the best experience, use that one.'),
        F('Sigue el camino de tierra: cada lugar es una sección de mi portafolio.', 'Follow the dirt path: every place is a section of my portfolio.'),
        F('WASD para moverte, doble espacio para volar, M abre el mapa y L cambia el idioma.', 'WASD to move, double space to fly, M opens the map and L switches language.'),
        F('Todo este mundo está hecho con código: ni una sola imagen de Minecraft.', 'This whole world is made with code: not a single Minecraft image.')
    ],
    inicioVertical: F('Estás en el mapa vertical. El estable es el horizontal: cámbialo en Pausa → Mapa.', "You're on the vertical map. The stable one is horizontal: switch it in Pause → Map."),
    casa: [
        F('Esta es mi casa. Adentro está mi CV en español e inglés.', 'This is my house. My CV is inside, in Spanish and English.'),
        F('Estudio Ingeniería en Informática, voy en tercer año. Soy de Chile.', "I study Computer Engineering, third year. I'm from Chile."),
        F('El libro de la mesa es mi presentación. Léelo, no muerde.', "The book on the table is my introduction. Read it, it doesn't bite.")
    ],
    registro: [
        F('Aquí está mi experiencia: un atril por cada trabajo.', 'Here is my experience: one lectern per job.'),
        F('ProcedimientoSeguro, IDafa-connect, El Patio de LEA y Mentor Inclusivo.', 'ProcedimientoSeguro, IDafa-connect, El Patio de LEA and Inclusive Mentor.'),
        F('Cada atril tiene las fechas, lo que hice y con qué tecnologías.', 'Each lectern has the dates, what I did and which technologies I used.')
    ],
    mina: [
        F('Mis habilidades son vetas de mineral: cada veta es un grupo de tecnologías.', 'My skills are ore veins: each vein is a group of technologies.'),
        F('Next.js, TypeScript, PostgreSQL, Prisma… pica con la vista, no con el pico.', 'Next.js, TypeScript, PostgreSQL, Prisma… mine with your eyes, not the pickaxe.'),
        F('Diamantes no encontré, pero TypeScript sí.', "Didn't find diamonds, but I found TypeScript.")
    ],
    aldea: [
        F('En la aldea están mis proyectos, con enlaces a GitHub.', 'My projects are in the village, with GitHub links.'),
        F('El Patio de LEA fue un proyecto freelance pagado, con clientes reales.', 'El Patio de LEA was a paid freelance project with real clients.'),
        F('Cat Clicker, InstantGIF, Plantotchi… siempre estoy construyendo algo.', 'Cat Clicker, InstantGIF, Plantotchi… I am always building something.')
    ],
    gatera: [
        F('Estas son Mila y Gala, mis gatas. Las fotos de las paredes son reales.', 'These are Mila and Gala, my cats. The photos on the walls are real.'),
        F('Mila es carey y gordita; Gala, gris con guantes blancos.', 'Mila is a chubby tortoiseshell; Gala is grey with white gloves.'),
        F('Si me ves sentado aquí, es que no me dejan levantarme.', "If you see me sitting here, it's because they won't let me get up.")
    ],
    correo: [
        F('¿Quieres trabajar conmigo? Escríbeme: benjaf243@gmail.com', 'Want to work with me? Write to me: benjaf243@gmail.com'),
        F('También estoy en GitHub (Venjyy) y en LinkedIn.', "I'm also on GitHub (Venjyy) and LinkedIn."),
        F('Hago sistemas y sitios web. Cuéntame tu idea.', 'I build systems and websites. Tell me your idea.')
    ],
    faro: [
        F('ProcedimientoSeguro: actas policiales desde el celular, en producción.', 'ProcedimientoSeguro: police reports from your phone, in production.'),
        F('Lo desarrollé completo: Next.js, Prisma, PostgreSQL y Azure.', 'I built the whole app: Next.js, Prisma, PostgreSQL and Azure.'),
        F('Funciona sin señal y las actas nunca salen del teléfono.', 'It works offline and the reports never leave the phone.')
    ],
    puente: [
        F('Antes este puente eran tablones sueltos. Ahora se cruza tranquilo.', 'This bridge used to be loose planks. Now you can cross it easily.'),
        F('Allá está el Pony pescando. Dice que pican harto.', "That's Pony fishing over there. He says they bite a lot.")
    ],
    escenario: [
        F('Salonas es seco. Sus riffs están hechos con código, nota por nota.', "Salonas rocks. His riffs are made with code, note by note."),
        F('¡PRIMUS SUCKS! (es un cumplido, lo juro).', "PRIMUS SUCKS! (it's a compliment, I swear).")
    ],
    letras: [
        F('¡Mi nombre en bloques gigantes! Modestia aparte.', 'My name in giant blocks! Modesty aside.'),
        F('Desde aquí arriba se ve todo el portafolio.', 'You can see the whole portfolio from up here.')
    ],
    atalaya: [
        F('Desde la atalaya se ve medio mapa. ¿Ves la mina al fondo?', 'You can see half the map from the watchtower. See the mine back there?'),
        F('Boris sigue cortando leña allá abajo. No para nunca.', 'Boris is still chopping wood down there. He never stops.')
    ],
    molino: [
        F('Zzz… (Venjy está durmiendo. Mejor no lo despiertes.)', "Zzz… (Venjy is asleep. Better not wake him up.)"),
        F('Zzz… cinco minutitos más… zzz', 'Zzz… five more minutes… zzz')
    ],
    portal: [
        F('¿Alguien tiene un encendedor? Ah, cierto: Lalo.', 'Anyone got a lighter? Oh right: Lalo.'),
        F('Este portal no lleva al Nether. Lo probé.', "This portal doesn't go to the Nether. I tried.")
    ],
    granja: [
        F('Las vacas no dan leche, pero dan buena compañía.', "The cows don't give milk, but they're good company."),
        F('Cada animal está hecho de cajas pintadas con código.', 'Every animal is made of boxes painted with code.')
    ]
};

export function crearVenjys(scene, { terreno, mundo, jugador, materiales, destinos = {}, orientacion = 'h', idioma: idiomaInicial = 'es' }) {
    let idioma = idiomaInicial;
    const tinte = crearTinte();
    const lista = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const tex = (w, h, sem, color, f = 0.18) => texturaPixeles(w, h, sem, liso(color, f));
    const k = (dt, v = 8) => Math.min(1, dt * v);
    const ir = (obj, prop, val, a) => { obj[prop] += (val - obj[prop]) * a; };
    const { datos } = terreno;
    const piel = pielDe(VENJY);

    // Objetos que lleva en las manos
    const madera = c => tinte.caras(tex(4, 8, 7000 + c[0], c));
    function libro() {
        const g = new THREE.Group();
        const tapa = tinte.caras(tex(4, 4, 7101, [128, 40, 36]));
        const hoja = tinte.caras(texturaPixeles(8, 8, 7102, (x, y) => (y % 2 === 0 && x > 0 && x < 7 ? [120, 110, 96] : [236, 228, 206])));
        const izq = new THREE.Group(), der = new THREE.Group();
        const ti = caja(0.24, 0.02, 0.32, tapa); ti.position.x = -0.12; const hi = caja(0.22, 0.03, 0.3, hoja); hi.position.set(-0.12, 0.02, 0);
        const td = caja(0.24, 0.02, 0.32, tapa); td.position.x = 0.12; const hd = caja(0.22, 0.03, 0.3, hoja); hd.position.set(0.12, 0.02, 0);
        izq.add(ti, hi); der.add(td, hd);
        const pagina = new THREE.Group(); const pm = caja(0.22, 0.01, 0.29, hoja); pm.position.x = 0.11; pagina.add(pm);
        g.add(izq, der, pagina);
        izq.rotation.z = 0.25; der.rotation.z = -0.25;
        g.userData.pagina = pagina;
        return g;
    }
    function pico() {
        const g = new THREE.Group();
        const mango = caja(0.05, 0.75, 0.05, madera([120, 84, 48])); mango.position.y = -0.35;
        const cabeza = caja(0.05, 0.07, 0.6, tinte.caras(texturaPixeles(4, 4, 7201, (x, y, r) => ajustar([92, 210, 205], 0.85 + r() * 0.25))));
        cabeza.position.y = -0.7;
        g.add(mango, cabeza);
        return g;
    }
    function martillo() {
        const g = new THREE.Group();
        const mango = caja(0.05, 0.42, 0.05, madera([120, 84, 48])); mango.position.y = -0.2;
        const cabeza = caja(0.1, 0.1, 0.24, tinte.caras(tex(4, 4, 7301, [110, 110, 118])));
        cabeza.position.set(0, -0.4, 0.04);
        g.add(mango, cabeza);
        return g;
    }
    function celular() {
        const g = new THREE.Group();
        const cuerpo = caja(0.16, 0.03, 0.3, tinte.caras(tex(2, 2, 7401, [30, 30, 34])));
        const pantalla = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.005, 0.25), new THREE.MeshBasicMaterial({ map: texturaPixeles(8, 16, 7402, (x, y) => (y === 2 ? [40, 90, 180] : y > 4 && y < 13 && x > 0 && x < 7 ? (y % 3 === 0 ? [180, 190, 210] : [236, 240, 248]) : [60, 120, 220])) }));
        pantalla.position.y = 0.02;
        g.add(cuerpo, pantalla);
        return g;
    }
    function papel() {
        const g = new THREE.Group();
        const hoja = caja(0.26, 0.01, 0.34, tinte.caras(texturaPixeles(8, 8, 7501, (x, y) => (y % 2 === 1 && x > 0 && x < 6 ? [70, 80, 140] : [244, 240, 228]))));
        g.add(hoja);
        return g;
    }
    function lapiz() { const g = caja(0.03, 0.22, 0.03, tinte.caras(tex(2, 4, 7502, [232, 190, 40]))); return g; }

    // Golpe sintético (pico contra piedra o martillo contra madera)
    function golpe(d, tipo) {
        try {
            if (!sonando()) return;
            const vol = (tipo === 'piedra' ? 0.2 : 0.16) * Math.max(0, 1 - d / 22);
            if (vol < 0.004) return;
            const { ctx, master } = audioMundo();
            const t = ctx.currentTime;
            const n = ctx.createBufferSource(); n.buffer = bufferRuido(ctx);
            const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = tipo === 'piedra' ? 2600 : 1300; f.Q.value = 2.5;
            const e = ctx.createGain(); e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + (tipo === 'piedra' ? 0.07 : 0.05));
            n.connect(f); f.connect(e); e.connect(master); n.start(t, Math.random()); n.stop(t + 0.1);
            const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(tipo === 'piedra' ? 900 : 420, t); o.frequency.exponentialRampToValueAtTime(tipo === 'piedra' ? 500 : 260, t + 0.06);
            const eo = ctx.createGain(); eo.gain.setValueAtTime(vol * 0.6, t); eo.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
            o.connect(eo); eo.connect(master); o.start(t); o.stop(t + 0.1);
        } catch (e) { /* sin sonido */ }
    }
    // Cubitos que saltan al golpear
    const chispas = [];
    const chispaMat = tinte.caras(tex(2, 2, 7601, [130, 130, 134]));
    for (let j = 0; j < 8; j++) { const m = caja(0.07, 0.07, 0.07, chispaMat); m.visible = false; scene.add(m); chispas.push({ m, vida: 0, v: new THREE.Vector3() }); }
    let chispaI = 0;
    function saltar(x, y, z, n = 3) {
        for (let j = 0; j < n; j++) {
            const c = chispas[chispaI = (chispaI + 1) % chispas.length];
            c.vida = 0.6; c.m.visible = true; c.m.position.set(x, y, z);
            c.v.set(rnd(-1.4, 1.4), rnd(1.4, 2.6), rnd(-1.4, 1.4));
        }
    }

    // ---------------------------------------------------------
    // Crear un Venjy en un lugar
    // ---------------------------------------------------------
    function nuevo(lugar, x, z, yaw, { y = null, anim, frases, extra = null, candidatos = null }) {
        const p = crearPersona(tinte, piel, 6000 + lista.length * 7);
        agregarExtras(p, piel.extras, tinte, 6000 + lista.length * 7);
        scene.add(p.g);
        const n = {
            lugar, p, x, z, y, yaw, yawBase: yaw, anim, frases, t: Math.random() * 10, fase: 0, ciclo: Math.random() * 3,
            nombre: crearNombre(scene, 'Venjy'), globo: crearGlobo(scene), frase: null, cerca: false, cambioFrase: 0,
            cargado: false, candidatos: candidatos || [[x, z]], ...extra
        };
        if (n.alCrear) n.alCrear(n);
        lista.push(n);
        return n;
    }
    // Dónde se para: el primer candidato pisable (o la altura indicada, para interiores)
    function ubicar(n) {
        for (const [x, z] of n.candidatos) {
            let y;
            if (n.y !== null) {
                const piso = mundo.bloque(x, n.y - 0.5, z), aire = mundo.bloque(x, n.y + 0.5, z), aire2 = mundo.bloque(x, n.y + 1.5, z);
                if (piso === -1) return false;
                if (piso > 0 && aire === 0 && aire2 === 0) y = n.y;
            } else {
                y = suelo(terreno, mundo, x, z, { estructuras: true });
                if (y === undefined) return false;
            }
            if (y) { n.x = x; n.z = z; n.y = y; n.cargado = true; return true; }
        }
        n.candidatos = null;
        return false;
    }
    // Mira al jugador girando el cuerpo (sobre su orientación base) y la cabeza
    function mirarJugador(n, dt, dJ, cuerpo = 0.6) {
        let giro = 0;
        if (dJ < 9) giro = angulo(Math.atan2(jugador.pos.x - n.x, jugador.pos.z - n.z) - n.yawBase);
        const gc = Math.max(-cuerpo, Math.min(cuerpo, giro));
        n.yaw += angulo(n.yawBase + gc - n.yaw) * k(dt, 3);
        ir(n.p.cuello.rotation, 'y', Math.max(-0.8, Math.min(0.8, angulo(giro - gc))), k(dt, 5));
    }

    // ---------------------------------------------------------
    // Animaciones
    // ---------------------------------------------------------
    const A = {
        // Inicio: saluda con todo el brazo y de vez en cuando da un saltito con los dos brazos arriba
        saluda(n, dt, t, dJ) {
            const { p } = n;
            const salto = (t % 6) < 0.6;
            if (salto) {
                const u = (t % 6) / 0.6;
                p.cuerpo.position.y = Math.sin(u * Math.PI) * 0.45;
                p.brazoD.rotation.x = p.brazoI.rotation.x = -2.9; p.brazoD.rotation.z = -0.3; p.brazoI.rotation.z = 0.3;
            } else {
                p.cuerpo.position.y = 0;
                p.brazoD.rotation.x = -2.7; p.brazoD.rotation.z = -0.35 + Math.sin(t * 9) * 0.35;
                ir(p.brazoI.rotation, 'x', 0, k(dt)); ir(p.brazoI.rotation, 'z', 0, k(dt));
            }
            mirarJugador(n, dt, dJ, 1.2);
        },
        // Sobre mí: lee un libro abierto, pasa las páginas y a ratos levanta la vista
        lee(n, dt, t, dJ) {
            const { p } = n;
            p.brazoD.rotation.set(-1.15, 0, 0.42); p.brazoI.rotation.set(-1.15, 0, -0.42);
            const u = (t % 5) / 5;
            n.libro.userData.pagina.rotation.z = u > 0.8 ? -Math.PI * suave((u - 0.8) / 0.2) + 0.25 : 0.25;
            const mira = dJ < 6 && (t % 8) > 5;
            ir(p.cuello.rotation, 'x', mira ? 0 : 0.5, k(dt, 4));
            mirarJugador(n, dt, mira ? dJ : 99, 0.3);
        },
        // Experiencia: presenta el edificio con el brazo y luego se gira a explicar
        presenta(n, dt, t, dJ) {
            const { p } = n;
            const fase = (t % 7) < 3.5;
            if (fase) { // señala la entrada
                n.yaw += angulo(n.yawEdificio - n.yaw) * k(dt, 3);
                ir(p.brazoD.rotation, 'x', -1.55, k(dt, 6)); ir(p.brazoD.rotation, 'z', 0.1, k(dt, 6));
                ir(p.brazoI.rotation, 'x', -0.2, k(dt, 6));
                ir(p.cuello.rotation, 'y', 0, k(dt, 4));
            } else { // explica con las dos manos
                mirarJugador(n, dt, dJ < 9 ? dJ : 0, 1.4);
                ir(p.brazoD.rotation, 'x', -0.9 + Math.sin(t * 5) * 0.3, k(dt)); ir(p.brazoI.rotation, 'x', -0.8 + Math.sin(t * 4 + 1) * 0.3, k(dt));
                ir(p.brazoD.rotation, 'z', 0.15, k(dt)); ir(p.brazoI.rotation, 'z', -0.15, k(dt));
            }
        },
        // Habilidades: pica una roca con un pico de diamante (chispas y golpe)
        pica(n, dt, t, dJ) {
            const { p } = n;
            const T = 0.9, antes = n.ciclo; n.ciclo = (n.ciclo + dt) % T;
            const u = n.ciclo / T;
            const ang = u < 0.6 ? lerp(-0.6, -2.6, suave(u / 0.6)) : lerp(-2.6, -0.6, (u - 0.6) / 0.4);
            p.brazoD.rotation.x = ang; p.brazoD.rotation.z = 0.15;
            p.brazoI.rotation.x = -0.4;
            p.cuerpo.rotation.x = u > 0.6 ? 0.18 * (1 - (u - 0.6) / 0.4) : 0;
            if (antes > n.ciclo) { // fin del golpe: el pico toca la roca
                golpe(dJ, 'piedra');
                saltar(n.roca.position.x, n.roca.position.y + 0.3, n.roca.position.z);
            }
            ir(p.cuello.rotation, 'x', 0.35, k(dt, 4));
            if (dJ < 5) mirarJugador(n, dt, dJ, 0);
        },
        // Proyectos: construye en una mesa de trabajo, martillazo tras martillazo
        construye(n, dt, t, dJ) {
            const { p } = n;
            const T = 0.7, antes = n.ciclo; n.ciclo = (n.ciclo + dt) % T;
            const u = n.ciclo / T;
            p.brazoD.rotation.x = u < 0.7 ? lerp(-0.9, -2.2, suave(u / 0.7)) : lerp(-2.2, -0.9, (u - 0.7) / 0.3);
            p.brazoI.rotation.x = -0.95; p.brazoI.rotation.z = -0.25;
            if (antes > n.ciclo) { golpe(dJ, 'madera'); saltar(n.mesa.position.x, n.mesa.position.y + 0.35, n.mesa.position.z, 2); }
            p.cuerpo.rotation.x = 0.12;
            ir(p.cuello.rotation, 'x', 0.4, k(dt, 4));
            if (dJ < 5 && (t % 9) > 6) mirarJugador(n, dt, dJ, 0.4);
        },
        // Mis gatas: sentado en el suelo haciéndole cariño a una gata imaginaria (o a las de verdad)
        acaricia(n, dt, t, dJ) {
            const { p } = n;
            p.cuerpo.position.y = -0.6;
            p.piernaD.rotation.x = -Math.PI / 2; p.piernaI.rotation.x = -Math.PI / 2 + 0.1;
            p.brazoD.rotation.x = -0.75 + Math.sin(t * 3.2) * 0.22; p.brazoD.rotation.z = 0.25;
            p.brazoI.rotation.x = -0.4;
            ir(p.cuello.rotation, 'x', dJ < 6 ? 0 : 0.45, k(dt, 3));
            mirarJugador(n, dt, dJ, 0.2);
        },
        // Contacto: escribe una carta y de vez en cuando la muestra («¡escríbeme!»)
        escribe(n, dt, t, dJ) {
            const { p } = n;
            const muestra = (t % 8) > 6;
            if (muestra) {
                ir(p.brazoI.rotation, 'x', -1.6, k(dt, 6)); ir(p.brazoI.rotation, 'z', -0.1, k(dt, 6));
                ir(p.brazoD.rotation, 'x', -0.3, k(dt, 6));
                mirarJugador(n, dt, dJ, 0.9);
                ir(p.cuello.rotation, 'x', 0, k(dt, 4));
            } else {
                ir(p.brazoI.rotation, 'x', -1.05, k(dt, 6)); ir(p.brazoI.rotation, 'z', -0.3, k(dt, 6));
                p.brazoD.rotation.x = -1.0 + Math.sin(t * 11) * 0.06; p.brazoD.rotation.z = 0.35 + Math.sin(t * 7) * 0.08;
                ir(p.cuello.rotation, 'x', 0.45, k(dt, 4));
                ir(p.cuello.rotation, 'y', 0, k(dt, 4));
                n.yaw += angulo(n.yawBase - n.yaw) * k(dt, 3);
            }
        },
        // ProcedimientoSeguro: usa el celular y te lo muestra con orgullo
        celular(n, dt, t, dJ) {
            const { p } = n;
            const muestra = dJ < 8 && (t % 7) > 4;
            if (muestra) {
                ir(p.brazoD.rotation, 'x', -1.55, k(dt, 6)); ir(p.brazoD.rotation, 'z', 0, k(dt, 6));
                n.cel.rotation.x = lerp(n.cel.rotation.x, -1.4, k(dt, 6));
                mirarJugador(n, dt, dJ, 1.2);
                ir(p.cuello.rotation, 'x', 0, k(dt, 4));
            } else {
                ir(p.brazoD.rotation, 'x', -1.2, k(dt, 6)); ir(p.brazoD.rotation, 'z', 0.35, k(dt, 6));
                n.cel.rotation.x = lerp(n.cel.rotation.x, -0.2, k(dt, 6));
                p.brazoI.rotation.x = -1.1 + Math.max(0, Math.sin(t * 9)) * 0.08; p.brazoI.rotation.z = -0.45; // toca la pantalla
                ir(p.cuello.rotation, 'x', 0.5, k(dt, 4));
                ir(p.cuello.rotation, 'y', 0, k(dt, 4));
                n.yaw += angulo(n.yawBase - n.yaw) * k(dt, 3);
            }
        },
        // Puente: pasea de un lado a otro y se apoya a mirar el lago
        pasea(n, dt, t, dJ) {
            const { p } = n;
            if (n.parado > 0) {
                n.parado -= dt;
                ir(p.brazoD.rotation, 'x', -0.5, k(dt)); ir(p.brazoI.rotation, 'x', -0.5, k(dt));
                p.cuerpo.rotation.x = 0.12; ir(p.cuello.rotation, 'x', 0.2, k(dt, 3));
                caminar(p, 0, 0);
                if (dJ < 6) mirarJugador(n, dt, dJ, 0.2);
                return;
            }
            p.cuerpo.rotation.x = 0;
            const [ax, az] = n.ruta[n.hacia];
            const dx = ax - n.x, dz = az - n.z, d = Math.hypot(dx, dz);
            if (d < 0.3) { n.hacia = 1 - n.hacia; n.parado = rnd(3, 6); n.yawBase = n.yaw; return; }
            const nx = n.x + dx / d * Math.min(d, 1.4 * dt), nz = n.z + dz / d * Math.min(d, 1.4 * dt);
            const ny = suelo(terreno, mundo, nx, nz, { estructuras: true });
            if (!ny) { n.hacia = 1 - n.hacia; return; }
            n.x = nx; n.z = nz; n.y += (ny - n.y) * k(dt, 10);
            n.yaw += angulo(Math.atan2(dx, dz) - n.yaw) * k(dt, 6);
            n.fase += dt * 7;
            caminar(p, n.fase, 0.6);
            ir(p.cuello.rotation, 'x', 0, k(dt, 3)); ir(p.cuello.rotation, 'y', 0, k(dt, 3));
        },
        // Escenario: baila al ritmo con los brazos arriba
        baila(n, dt, t, dJ) {
            const { p } = n;
            const b = Math.sin(t * 7.5);
            p.cuerpo.position.y = Math.abs(b) * 0.12;
            p.brazoD.rotation.x = -2.6 + b * 0.4; p.brazoI.rotation.x = -2.6 - b * 0.4;
            p.brazoD.rotation.z = -0.2; p.brazoI.rotation.z = 0.2;
            p.cuello.rotation.x = 0.1 + Math.abs(b) * 0.25;
            p.cuerpo.rotation.z = b * 0.08;
            if (dJ < 5) mirarJugador(n, dt, dJ, 0.5);
        },
        // Sobre las letras: posa con las manos en la cintura y a ratos saca músculo
        posa(n, dt, t, dJ) {
            const { p } = n;
            const fuerza = (t % 6) > 4;
            if (fuerza) { p.brazoD.rotation.set(-1.4, 0, -1.2); p.brazoI.rotation.set(-1.4, 0, 1.2); ir(p.cuello.rotation, 'x', -0.15, k(dt)); }
            else { ir(p.brazoD.rotation, 'x', -0.3, k(dt)); ir(p.brazoD.rotation, 'z', -0.75, k(dt)); ir(p.brazoI.rotation, 'x', -0.3, k(dt)); ir(p.brazoI.rotation, 'z', 0.75, k(dt)); p.brazoD.rotation.y = 0; p.brazoI.rotation.y = 0; ir(p.cuello.rotation, 'x', 0, k(dt)); }
            mirarJugador(n, dt, dJ, 0.8);
        },
        // Atalaya: mira a lo lejos con las manos como binoculares, girando despacio
        observa(n, dt, t, dJ) {
            const { p } = n;
            p.brazoD.rotation.set(-2.3, 0, 0.75); p.brazoI.rotation.set(-2.3, 0, -0.75);
            if (dJ < 4) { mirarJugador(n, dt, dJ, 1.4); ir(p.brazoD.rotation, 'x', -0.3, 1); ir(p.brazoI.rotation, 'x', -0.3, 1); }
            else { n.yaw = n.yawBase + Math.sin(t * 0.25) * 1.2; ir(p.cuello.rotation, 'y', 0, k(dt)); }
        },
        // Molino: duerme de espaldas sobre el piso, respirando lento
        duerme(n, dt, t) {
            const { p } = n;
            p.cuerpo.rotation.x = -Math.PI / 2;
            p.cuerpo.position.y = 0.14;
            p.torso.scale.z = 1 + Math.sin(t * 1.6) * 0.06;
            p.brazoD.rotation.set(0, 0, 0.05); p.brazoI.rotation.set(-0.2, 0, -0.05);
            p.cuello.rotation.set(0, Math.sin(t * 0.2) * 0.2, 0);
        },
        // Portal en ruinas: mira el portal rascándose la cabeza; luego se encoge de hombros
        rasca(n, dt, t, dJ) {
            const { p } = n;
            const u = t % 8;
            if (u < 4) {
                n.yaw += angulo(n.yawBase - n.yaw) * k(dt, 3);
                p.brazoD.rotation.x = -2.85 + Math.sin(t * 13) * 0.08; p.brazoD.rotation.z = 0.4;
                ir(p.brazoI.rotation, 'x', 0, k(dt)); ir(p.cuello.rotation, 'x', -0.1, k(dt, 4)); ir(p.cuello.rotation, 'y', 0, k(dt));
            } else {
                const h = Math.max(0, Math.sin((u - 4) * 2.4));
                p.brazoD.rotation.set(-0.5 - h * 0.4, 0, -0.6 * h); p.brazoI.rotation.set(-0.5 - h * 0.4, 0, 0.6 * h);
                mirarJugador(n, dt, dJ < 9 ? dJ : 0, 1.4);
            }
        },
        // Granja: se apoya en la valla mirando a los animales
        apoya(n, dt, t, dJ) {
            const { p } = n;
            p.cuerpo.rotation.x = 0.18;
            p.brazoD.rotation.set(-1.4, 0, 0.2); p.brazoI.rotation.set(-1.4, 0, -0.2);
            p.piernaI.rotation.x = 0.25;
            if (dJ < 6) mirarJugador(n, dt, dJ, 0.8); else { ir(p.cuello.rotation, 'y', Math.sin(t * 0.4) * 0.6, k(dt)); ir(p.cuello.rotation, 'x', 0.15, k(dt)); }
        }
    };

    // ---------------------------------------------------------
    // Dónde aparece
    // ---------------------------------------------------------
    // Junto al punto de llegada de una zona del portafolio (el jugador llega mirando al norte, hacia la entrada)
    function enZona(clave, anim, extra = {}) {
        const d = destinos[clave];
        if (!d) return null;
        const cands = [[2.4, -2], [-2.4, -2], [2.6, 0.5], [-2.6, 0.5], [1.5, 2.5]].map(([dx, dz]) => [d.x + dx, d.z + dz]);
        const [x, z] = cands[0];
        return nuevo(clave, x, z, Math.atan2(d.x - x, d.z + 3 - z), { y: d.y ?? null, anim, frases: DICHOS[clave], candidatos: cands, extra: { mira: [d.x, d.z + 3], ...extra } });
    }
    // Inicio: delante del punto de aparición, mirando hacia él
    {
        const [sx, sz] = datos.P.spawn, tit = datos.titulo;
        const bx = sx * ESCALA + 2.5, bz = sz * ESCALA + 2.5;
        const yawCam = Math.atan2(-(tit.tx0 + tit.anchoT / 2 - sx), -(tit.ty0 + tit.altoT / 2 - sz));
        const fx = -Math.sin(yawCam), fz = -Math.cos(yawCam); // hacia donde mira el visitante al aparecer
        const cands = [[5, 1.6], [5, -1.6], [6, 2.5], [4, 0]].map(([a, b]) => [bx + fx * a + fz * b, bz + fz * a - fx * b]);
        const frases = orientacion === 'v' ? [DICHOS.inicioVertical, ...DICHOS.inicio.filter((_, i) => i !== 1)] : DICHOS.inicio;
        const n = nuevo('inicio', cands[0][0], cands[0][1], Math.atan2(bx - cands[0][0], bz - cands[0][1]), { anim: A.saluda, frases, candidatos: cands });
        n.primera = orientacion === 'v' ? DICHOS.inicioVertical : DICHOS.inicio[0];
    }
    // Zonas del portafolio
    enZona('casa', A.lee, { alCrear: n => { n.libro = libro(); n.libro.position.set(0, 1.12, 0.42); n.p.cuerpo.add(n.libro); } });
    enZona('registro', A.presenta, { alCrear: n => { n.yawEdificio = Math.PI; } });
    enZona('mina', A.pica, { yawFijo: Math.PI / 2, alCrear: n => { const pc = pico(); pc.position.set(0, -0.68, 0.05); n.p.brazoD.add(pc); } });
    enZona('aldea', A.construye, { yawFijo: -Math.PI / 2, alCrear: n => { const m = martillo(); m.position.set(0, -0.7, 0.05); m.rotation.x = 1.4; n.p.brazoD.add(m); } });
    enZona('gatera', A.acaricia);
    enZona('correo', A.escribe, {
        alCrear: n => {
            const h = papel(); h.position.set(0, -0.74, 0.12); h.rotation.x = -1.1; n.p.brazoI.add(h);
            const l = lapiz(); l.position.set(0, -0.78, 0.06); l.rotation.x = 1.2; n.p.brazoD.add(l);
        }
    });
    enZona('faro', A.celular, { alCrear: n => { n.cel = celular(); n.cel.position.set(0, -0.76, 0.1); n.cel.rotation.x = -0.2; n.p.brazoD.add(n.cel); } });
    // Rocas y mesas de trabajo de las animaciones (se ubican al cargar, delante del Venjy)
    // Puente: pasea por el tablero del puente más largo
    const puente = terreno.decor.filter(d => d.t === 'puente').sort((a, b) => b.bloques.length - a.bloques.length)[0];
    if (puente) {
        const [ax, az] = puente.a, [bx, bz] = puente.b;
        const p0 = [lerp(ax, bx, 0.3), lerp(az, bz, 0.3)], p1 = [lerp(ax, bx, 0.7), lerp(az, bz, 0.7)];
        const n = nuevo('puente', p0[0], p0[1], Math.atan2(bx - ax, bz - az), { anim: A.pasea, frases: DICHOS.puente });
        n.ruta = [p1, p0]; n.hacia = 0; n.parado = 0;
    }
    // Escenario: bailando del otro lado de Conejeros
    const E = terreno.escenario;
    if (E) {
        const s = Math.sin(E.yaw), c = Math.cos(E.yaw);
        const cands = [[6.2, -1.8], [7, -3], [6, 0]].map(([a, b]) => [E.x + s * a + c * b, E.z + c * a - s * b]);
        nuevo('escenario', cands[0][0], cands[0][1], E.yaw + Math.PI, { anim: A.baila, frases: DICHOS.escenario, candidatos: cands });
    }
    // Sobre la barra de arriba de la «E» del título
    {
        const tit = datos.titulo, celda = datos.celda;
        const cx = (tit.tx0 + 8 * celda + celda / 2) * ESCALA, cz = (tit.ty0 + celda / 2) * ESCALA;
        const yTop = terreno.HT[Math.floor(cz) * terreno.BW + Math.floor(cx)] + 1;
        const [sx, sz] = datos.P.spawn;
        nuevo('letras', cx, cz, Math.atan2(sx * ESCALA - cx, sz * ESCALA - cz), { y: yTop, anim: A.posa, frases: DICHOS.letras });
    }
    // Lugares para explorar
    const L = clave => (terreno.lugares || []).find(l => l.clave === clave);
    const at = L('atalaya');
    if (at) nuevo('atalaya', at.bx - 0.5, at.bz - 1.5, Math.PI, { y: at.y + 11, anim: A.observa, frases: DICHOS.atalaya });
    const mo = L('molino');
    if (mo) nuevo('molino', mo.bx - 0.85, mo.bz + 0.5, -Math.PI / 2, { y: mo.y, anim: A.duerme, frases: DICHOS.molino, candidatos: [[mo.bx - 0.85, mo.bz + 0.5]] });
    const po = L('portal');
    if (po) nuevo('portal', po.bx + 0.5, po.bz + 2.6, Math.PI, { anim: A.rasca, frases: DICHOS.portal, candidatos: [[po.bx + 0.5, po.bz + 2.6], [po.bx + 1.5, po.bz + 3]] });
    const corral = (terreno.corrales || [])[0];
    if (corral) {
        // Afuera del cerco (la valla está a ~0,6 del borde del rectángulo), mirando al centro del corral
        const R = corral.rect, x = (R.x0 + R.x1) / 2 + 2, z = R.z1 + 2.1, mz = (R.z0 + R.z1) / 2;
        nuevo('granja', x, z, Math.PI, {
            anim: A.apoya, frases: DICHOS.granja, extra: { mira: [(R.x0 + R.x1) / 2, mz] },
            candidatos: [[x, z], [x - 4, z], [R.x0 - 2.1, mz], [R.x1 + 2.1, mz], [x, R.z0 - 2.1]]
        });
    }

    // Accesorios en el mundo: roca para picar y mesa de trabajo (delante del Venjy, al ubicarse)
    function colocarAccesorios(n) {
        const fx = Math.sin(n.yawBase), fz = Math.cos(n.yawBase);
        if (n.anim === A.pica) {
            n.roca = caja(0.8, 0.8, 0.8, tinte.caras(texturaPixeles(8, 8, 7701, (x, y, r) => (r() < 0.12 ? [92, 210, 205] : ajustar([128, 128, 130], 0.8 + r() * 0.35)))));
            n.roca.position.set(n.x + fx * 1.25, n.y + 0.4, n.z + fz * 1.25);
            scene.add(n.roca);
        }
        if (n.anim === A.construye) {
            n.mesa = caja(0.9, 0.9, 0.9, tinte.caras(texturaPixeles(8, 8, 7702, (x, y, r) => (y === 0 || x === 0 ? [96, 66, 38] : ajustar([162, 122, 74], 0.85 + r() * 0.2))), { 2: texturaPixeles(8, 8, 7703, (x, y) => ((x + y) % 3 === 0 ? [120, 90, 56] : [176, 136, 86])) }));
            n.mesa.position.set(n.x + fx * 1.0, n.y + 0.45, n.z + fz * 1.0);
            scene.add(n.mesa);
        }
    }

    let tiempo = 0;
    return {
        lista,
        actualizar(dt, oculto = false) {
            tiempo += dt;
            dt = Math.min(dt, 0.05);
            tinte.aplicar(materiales.solido.color);
            for (const n of lista) {
                n.t += dt;
                const dJ = Math.hypot(n.x - jugador.pos.x, n.z - jugador.pos.z);
                let visible = !oculto && dJ < RADIO_VISIBLE;
                if (visible && !n.cargado) {
                    if (!n.candidatos || !ubicar(n)) visible = false;
                    else {
                        // Orientación final: fija (pica y construye de costado) o mirando al punto de llegada
                        if (n.yawFijo !== undefined) n.yawBase = n.yawFijo;
                        else if (n.mira) n.yawBase = Math.atan2(n.mira[0] - n.x, n.mira[1] - n.z);
                        n.yaw = n.yawBase; colocarAccesorios(n);
                    }
                }
                n.p.g.visible = visible;
                for (const o of [n.roca, n.mesa]) if (o) o.visible = visible;
                if (!visible) { n.nombre.ocultar(); n.globo.actualizar(dt, false, n.x, n.y, n.z); continue; }
                n.anim(n, dt, tiempo + n.t * 0.1, dJ);
                n.p.g.position.set(n.x, n.y, n.z);
                n.p.g.rotation.y = n.yaw;
                // Frases al acercarse (la primera del inicio siempre es el saludo)
                const cerca = dJ < 6.5;
                if (cerca && (!n.cerca || (n.cambioFrase -= dt) <= 0)) {
                    let nueva = !n.cerca && n.primera && !n.saludo ? n.primera : null;
                    if (nueva) n.saludo = true;
                    while (!nueva || (n.frases.length > 1 && nueva === n.frase && !n.primera)) {
                        nueva = n.frases[Math.floor(Math.random() * n.frases.length)];
                        if (n.frases.length <= 1 || nueva !== n.frase) break;
                    }
                    n.frase = nueva; n.cambioFrase = 6.5;
                }
                n.cerca = cerca;
                const texto = cerca && n.frase ? n.frase[idioma] : '';
                if (texto) n.globo.decir(texto);
                const tumbado = n.anim === A.duerme;
                const alto = tumbado ? 0.6 : 2.15;
                let yGlobo = n.y + alto + 0.6;
                if (texto) for (let dy = 2; dy <= 4; dy++) { const b = mundo.bloque(n.x, n.y + dy + 0.5, n.z); if (b > 0 && b !== 6) { yGlobo = Math.min(yGlobo, n.y + dy - 0.5); break; } }
                n.globo.actualizar(dt, !!texto && seVe(mundo, jugador.camara, n.x, n.y + (tumbado ? 0.4 : 1.6), n.z), n.x, yGlobo, n.z);
                n.nombre.actualizar(dt, jugador.camara, mundo, !texto, n.x, n.y + alto + 0.2, n.z, n.x, n.y + (tumbado ? 0.3 : 1.2), n.z);
            }
            for (const c of chispas) {
                if (!c.m.visible) continue;
                c.vida -= dt;
                if (c.vida <= 0 || oculto) { c.m.visible = false; continue; }
                c.v.y -= 12 * dt; c.m.position.addScaledVector(c.v, dt);
            }
        },
        setIdioma(i) { idioma = i; for (const n of lista) if (n.frase) n.globo.decir(n.frase[idioma]); }
    };
}
