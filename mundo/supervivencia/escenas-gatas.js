// =========================================================
// VENJY · Supervivencia · Escenas especiales con las gatas
// La PRIMERA vez que acaricias a Mila o a Gala (G o ACARICIAR) con una skin de base Lona o Venjy, en vez
// de la caricia normal hay una escena de ~13 s en cámara de cine (planos 'gata' de camaras.js). Actores:
// tu cuerpo con tu skin y la gata. La gata no habla: sus globos son sonidos. Se guarda en
// misiones.estado.escenasSkin con las claves 'lona-mila', 'lona-gala', 'venjy-mila' y 'venjy-gala'.
// Esc o «Saltar» la cortan; al terminar se restaura todo (pose, gata, cámara, jugador).
//
// lona-mila «Trampa de panza» (13,2 s)
//   0,0–0,5  te ubicas al costado de Mila; ella se echa y gira el costado hacia ti; maullido
//   0,5–1,3  te agachas · 1,0–2,0 Mila rueda y te muestra la panza
//   0,6–3,4  tú: «Mila, mi gordita…» · 2,0–3,6 Mila: «Mrrau.»
//   3,5–8,0  le frotas la panza (vaivén a lo largo); ronronea · 4,6–7,4 tú: «¿Panza?…»
//   8,0–9,6  TRAMPA: te atrapa el brazo con las patas, patea y mordisquea; tu cabeza se echa atrás · «¡Grrrf!»
//   9,6–10,4 vuelve a echarse normal · 9,6–12,4 tú: «Era trampa…» · corazones 10,2 y 11,4
//   12,1–13,2 te enderezas
// lona-gala «Inspección oficial» (12,5 s)
//   0,0–0,5  te sientas a ~1,4 de Gala (bajo el fundido)
//   0,6–3,4  tú: «Ya, ya, revisa todo…»
//   0,8–6,0  Gala da una vuelta a tu alrededor con la cola alta (más cerca por la espalda: se frota);
//            tu cabeza la sigue · 2,5–3,8 Gala: «Mrr?» · 4,0–6,8 tú: «¿Aprobada?…»
//   6,0–7,5  se sienta a tu izquierda, delante; 6,6–7,4 cabezazo · «Prrt.»
//   7,8–10,6 tú: «Un cabezazo…» · le acaricias la cabeza con la mano izquierda; corazones 8,4 y 9,6
//   10,6–11,6 te pones de pie
// venjy-mila «Galletita clandestina» (13,4 s)
//   0,6–3,4  saludas · tú: «Hola, Mila. Vengo sin nada…»
//   3,0–5,0  Mila maúlla fuerte tres veces (3,1 · 3,9 · 4,7) con la cabeza arriba · «¡MIAAAU!»
//   5,0–6,5  te rascas la cabeza · 6,4–7,9 te palpas el bolsillo · 5,0–7,8 tú: «Ok, ok. Una galletita…»
//   7,8–8,9  sacas la galletita, te agachas y la dejas en el suelo delante de ella
//   8,9–11,0 Mila se echa y se la come (se achica) · «Ñam, ñam.»
//   10,2–13,0 brazos en jarra · 10,4–13,2 tú: «Ahora sí me quieres…» · Mila sentada ronronea, corazón 11,8
// venjy-gala «Caricia con cita previa» (13,4 s)
//   0,6–3,4  tú: «Gala, la más elegante…» · 1,4–3,0 te inclinas y acercas la mano a su cabeza
//   3,0–4,6  Gala esquiva, se levanta y te da la espalda · «Hmpf.» · tu mano vuelve
//   4,8–7,6  te sientas con los hombros caídos · tú: «Ok, entendí…»
//   7,6–9,4  Gala se gira, camina a tu costado izquierdo y se echa con la cabeza sobre tu pierna · «Prrrr…»
//   9,6–12,4 le acaricias el lomo con la mano izquierda · tú: «Así que la caricia se pide por cita…»
//            corazones 10,0 y 11,2
// Depuración: __venjy.escenasGatas (forzar(clave), pausar(v), irA(s), saltar(), activa).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { TIPO } from '../texturas.js';
import { crearGlobo, COLOR_GLOBO, angulo, lerp } from '../criaturas/cuerpo.js';
import { tipoSkin } from './escenas-skin.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);
// Peso de algo que dura de a a b con rampas de entrada y salida (0 → 1 → 0)
const envolvente = (t, a, b, rampa) => suave(Math.min(tramo(t, a, a + rampa), 1 - tramo(t, b - rampa, b)));
const pulso = (t, a, b) => Math.sin(Math.PI * tramo(t, a, b)); // 0 → 1 → 0 de a a b

const TXT = { es: { saltar: 'Saltar' }, en: { saltar: 'Skip' } };
const F = (es, en) => ({ es, en });

// Poses del atlas (referencia/rig.md): metas del cuerpo del jugador
const N = { y: 0, inc: 0, rz: 0, pDx: 0, pIx: 0, bDx: 0, bDz: 0.05, bIx: 0, bIz: -0.05, cx: 0, cy: 0, cz: 0 };
const SENTADO = { y: -0.62, pDx: -1.45, pIx: -1.45, inc: 0.15, bDx: -0.6, bDz: 0.1, bIx: -0.6, bIz: -0.1, cx: 0.2 };
const AGACHADO = { inc: 0.6, pDx: -0.6, pIx: -0.6, y: 0.13, bDx: -0.55, bDz: 0.12, bIx: 0.25, bIz: -0.05, cx: 0.3 };
const INCLINADO = { inc: 0.3, pDx: -0.3, pIx: -0.3, y: 0.034, bDx: -1.5, bDz: 0.05, bIx: 0.25, bIz: -0.05, cx: 0.2 };
// Mezcla b sobre a con peso w (las claves que b no trae quedan como en a)
function mezcla(a, b, w) {
    const r = { ...N, ...a };
    if (w <= 0) return r;
    for (const k in b) r[k] = lerp(r[k], b[k], w);
    return r;
}

// Corazón de 9×9 píxeles (igual que en caricias.js) y galletita de 6×6
function texPixeles(filas, colores) {
    const c = document.createElement('canvas'); c.width = filas[0].length; c.height = filas.length;
    const ctx = c.getContext('2d');
    filas.forEach((f, y) => { for (let x = 0; x < f.length; x++) if (f[x] !== '.') { ctx.fillStyle = colores[f[x]]; ctx.fillRect(x, y, 1, 1); } });
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
const texCorazon = texPixeles(['.kk...kk.', 'kaak.kaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '..kaaak..', '...kak...', '....k....', '.........'], { k: '#3a0008', a: '#e82040' });
const texGalleta = texPixeles(['abbaba', 'bcbbab', 'abbcba', 'babbab', 'bbacbb', 'abbbab'], { a: '#8a5426', b: '#b8783a', c: '#4a2a12' });

// ---------------------------------------------------------
// Guiones. Cada escena: T (duración), dist (a cuánto de la gata te ubicas), jugador(t, e) → metas,
// gata(t, e, g, dt) (se llama desde el gancho gata.escena), frases del jugador y de la gata
// ([desde, hasta, texto]), maullidos, corazones y ronroneo.
// ---------------------------------------------------------
const ESCENAS = {
    'lona-mila': {
        T: 13.2,
        dist: g => g.e.ancho / 2 + 0.8,
        jugador(t) {
            let m = mezcla(N, AGACHADO, envolvente(t, 0.5, 12.9, 0.8));
            // Frota la panza: la mano va y viene a lo largo de la gata (que está de lado)
            const frota = envolvente(t, 3.5, 8.0, 0.4), despues = envolvente(t, 9.6, 12.4, 0.4);
            m.bDz += frota * Math.sin(t * 5) * 0.28 + despues * Math.sin(t * 3) * 0.12;
            m.bDx += frota * Math.sin(t * 10) * 0.04;
            // Trampa: el brazo queda atrapado (tironea) y la cabeza se echa atrás de sorpresa
            const trampa = envolvente(t, 8.0, 9.6, 0.25);
            m.bDx = lerp(m.bDx, -0.42 + Math.sin(t * 18) * 0.06, trampa);
            m.cx = lerp(m.cx, -0.25, trampa);
            m.inc -= 0.08 * trampa;
            return m;
        },
        gata(t, e, g, dt) {
            g.pose = 'echada';
            g.yaw += angulo(e.aP - Math.PI / 2 - g.yaw) * Math.min(1, dt * 4); // el costado (+X) hacia ti
            // Rueda: la panza hacia ti (tronco.rotation.z > 0 lleva la panza a +X); se sube para no hundirse
            const th = 1.45 * suave(tramo(t, 1.0, 2.0)) * (1 - suave(tramo(t, 9.6, 10.4)));
            g.tronco.rotation.z = th;
            g.tronco.position.y += (g.e.ancho / 2) * Math.sin(th);
            const trampa = envolvente(t, 8.0, 9.6, 0.2);
            g.patas[0].rotation.x += trampa * (0.9 + Math.sin(t * 16) * 0.15);
            g.patas[1].rotation.x += trampa * (0.9 + Math.sin(t * 16 + 1.3) * 0.15);
            g.patas[2].rotation.x -= trampa * (0.3 + 0.35 * Math.sin(t * 14));
            g.patas[3].rotation.x -= trampa * (0.3 + 0.35 * Math.sin(t * 14 + 1.6));
            g.cabeza.rotation.x += trampa * (0.2 + Math.sin(t * 20) * 0.12);
            g.cola.rotation.y = Math.sin(t * 2) * 0.3 * (1 - trampa) + Math.sin(t * 14) * 0.5 * trampa;
            g.ronroneo = (t > 3.5 && t < 8.0) || (t > 10.0 && t < 12.6);
        },
        frasesJ: [
            [0.6, 3.4, F('Mila, mi gordita. ¿Me extrañaste?', 'Mila, my chubby girl. Did you miss me?')],
            [4.6, 7.4, F('¿Panza? ¿Segura que no es trampa?', "Belly? You sure it's not a trap?")],
            [9.6, 12.4, F('Era trampa. Siempre caigo.', 'It was a trap. I always fall for it.')]
        ],
        frasesG: [[2.0, 3.6, F('Mrrau.', 'Mrrau.')], [8.0, 9.5, F('¡Grrrf!', 'Grrrf!')]],
        maullidos: [0.5, 2.0, 8.05], corazones: [10.2, 11.4]
    },

    'lona-gala': {
        T: 12.5,
        dist: () => 1.4,
        inicial: SENTADO, fijo: true, mueve: true,
        iniciar(e) {
            // Vuelta alrededor del jugador: α es el ángulo respecto de hacia dónde mira tu cuerpo (+ = tu izquierda)
            e.alfa0 = angulo(Math.atan2(e.g.x - e.P.x, e.g.z - e.P.z) - e.F);
            e.d0 = Math.hypot(e.g.x - e.P.x, e.g.z - e.P.z);
            e.alfaF = Math.atan2(0.55, 0.62); // termina sentada a tu izquierda, delante (al lado de tus piernas)
            e.fase = 0;
        },
        jugador(t, e) {
            let m = mezcla(N, SENTADO, 1);
            // La cabeza sigue a Gala (girar la cara a tu izquierda es cy > 0)
            const rel = lim(angulo(Math.atan2(e.g.x - e.P.x, e.g.z - e.P.z) - e.F), -1.1, 1.1);
            m.cy = rel * envolvente(t, 0.8, 10.6, 0.5);
            // Cabezazo: te inclinas hacia ella
            const cab = pulso(t, 6.5, 7.6);
            m.cx += 0.15 * cab; m.inc += 0.1 * cab; m.cz -= 0.12 * cab;
            // Caricia en la cabeza con la mano izquierda
            const car = envolvente(t, 7.8, 10.6, 0.5);
            m = mezcla(m, { inc: 0.05, bIx: -2.55 + Math.sin(t * 5) * 0.08, bIz: 0.25, cx: 0.05 }, car);
            // De pie
            return mezcla(m, N, suave(tramo(t, 10.6, 11.6)));
        },
        gata(t, e, g, dt) {
            const u = suave(tramo(t, 0.8, 6.0));
            const a = e.alfa0 + u * (2 * Math.PI + e.alfaF - e.alfa0);
            // Radio: lejos por delante (tus piernas), cerca por la espalda (se frota); al final, junto a tus piernas
            let r = 0.875 + 0.375 * Math.cos(a);
            r = lerp(e.d0, r, tramo(u, 0, 0.12));
            r = lerp(r, 0.83, tramo(u, 0.85, 1));
            let x = e.P.x + Math.sin(e.F + a) * r, z = e.P.z + Math.cos(e.F + a) * r;
            // Cabezazo: se estira hacia tu cara
            const cab = pulso(t, 6.6, 7.4);
            if (cab > 0) { const d = Math.hypot(e.P.x - x, e.P.z - z) || 1; x += (e.P.x - x) / d * 0.25 * cab; z += (e.P.z - z) / d * 0.25 * cab; }
            const dx = x - g.x, dz = z - g.z, paso = Math.hypot(dx, dz);
            g.x = x; g.z = z;
            const camina = t > 0.8 && t < 6.0;
            g.pose = t < 6.0 ? 'pie' : 'sentada';
            if (camina && paso > 1e-4) g.yaw += angulo(Math.atan2(dx, dz) - g.yaw) * Math.min(1, dt * 10);
            else if (t >= 6.0) g.yaw += angulo(Math.atan2(e.P.x - g.x, e.P.z - g.z) - g.yaw) * Math.min(1, dt * 5);
            // Patas al caminar (como la caminata de gatas.js) y cola alta con la punta temblando
            if (camina) {
                e.fase += dt * 10;
                const b = Math.sin(e.fase) * 0.6;
                g.patas[0].rotation.x = b; g.patas[3].rotation.x = b; g.patas[1].rotation.x = -b; g.patas[2].rotation.x = -b;
                g.cola.rotation.x = -0.25 + Math.sin(t * 11) * 0.05;
            } else if (t >= 6.0) {
                g.cola.rotation.x = g.colaBase;
            }
            g.cola.rotation.y = Math.sin(t * 3) * 0.2;
            g.cabeza.rotation.x -= 0.35 * cab;
            g.ronroneo = t > 7.6 && t < 10.8;
        },
        frasesJ: [
            [0.6, 3.4, F('Ya, ya, revisa todo. Soy yo, Gala.', "Okay, okay, inspect everything. It's me, Gala.")],
            [4.0, 6.8, F('¿Aprobada? ¿O falta el papeleo?', 'Approved? Or is there paperwork missing?')],
            [7.8, 10.6, F('Un cabezazo. Eso es un sí oficial.', "A head bump. That's an official yes.")]
        ],
        frasesG: [[2.5, 3.8, F('Mrr?', 'Mrr?')], [6.6, 7.8, F('Prrt.', 'Prrt.')]],
        maullidos: [2.6, 6.7], corazones: [8.4, 9.6]
    },

    'venjy-mila': {
        T: 13.4,
        // Lejos (1,75): al agacharte tu cabeza no choca con la de Mila sentada; la galletita cae a 1,0 de ti
        dist: () => 1.75,
        iniciar(e) {
            // Galletita: cubito pixelado en la mano derecha (se pasa al suelo delante de Mila)
            const mat = new THREE.MeshLambertMaterial({ map: texGalleta });
            e.obj = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), mat);
            e.obj.visible = false;
            const dx = e.g.x - e.P.x, dz = e.g.z - e.P.z, d = Math.hypot(dx, dz) || 1;
            e.suelo = { x: e.P.x + dx / d * 1.0, y: e.g.y + 0.03, z: e.P.z + dz / d * 1.0 };
        },
        jugador(t) {
            let m = mezcla(N, { bDx: -2.7, bDz: -0.35 + Math.sin(t * 9) * 0.35, cx: -0.05 }, envolvente(t, 0.6, 2.8, 0.3));
            m = mezcla(m, { bDx: -2.85 + Math.sin(t * 14) * 0.08, bDz: 0.42, cx: 0.12, cz: 0.15 }, envolvente(t, 5.0, 6.5, 0.3));
            m = mezcla(m, { bDx: 0.12 + Math.sin(t * 14) * 0.08, bDz: -0.3, cx: 0.35, cy: -0.3 }, envolvente(t, 6.4, 7.9, 0.3));
            m = mezcla(m, AGACHADO, envolvente(t, 7.8, 9.4, 0.5));
            return mezcla(m, { bDx: -0.3, bDz: -0.55, bIx: -0.3, bIz: 0.55, cx: 0.15 }, envolvente(t, 10.2, 13.0, 0.4));
        },
        gata(t, e, g, dt) {
            g.pose = t < 8.9 ? 'sentada' : t < 11.0 ? 'echada' : 'sentada';
            g.yaw += angulo(e.aP - g.yaw) * Math.min(1, dt * 4);
            // Te mira fijo; con cada maullido sube la cabeza
            let arriba = 0.15 * envolvente(t, 0.4, 8.6, 0.4);
            for (const m of [3.1, 3.9, 4.7]) arriba += 0.35 * pulso(t, m - 0.05, m + 0.5);
            const come = envolvente(t, 9.1, 11.0, 0.3);
            g.cabeza.rotation.x += -arriba + come * (0.45 + Math.sin(t * 10) * 0.07);
            g.cola.rotation.y = Math.sin(t * 2.5) * 0.25;
            g.ronroneo = t > 11.2 && t < 13.2;
        },
        objeto(t, e, cuerpo, grupo) {
            const o = e.obj;
            if (t >= 7.8 && !e.enMano && !e.enSuelo) { cuerpo.brazoD.add(o); o.position.set(0, -0.72, 0.12); o.rotation.set(0, 0, 0); o.visible = true; e.enMano = true; }
            if (t >= 8.7 && e.enMano) { grupo.attach(o); e.enMano = false; e.enSuelo = { p0: o.position.clone() }; o.rotation.set(0, 0, 0); }
            if (e.enSuelo) {
                const u = suave(tramo(t, 8.7, 8.95));
                o.position.set(lerp(e.enSuelo.p0.x, e.suelo.x, u), lerp(e.enSuelo.p0.y, e.suelo.y, u), lerp(e.enSuelo.p0.z, e.suelo.z, u));
                o.scale.setScalar(Math.max(0.01, 1 - tramo(t, 9.3, 10.9)));
                o.visible = t < 10.9;
            }
        },
        frasesJ: [
            [0.6, 3.4, F('Hola, Mila. Vengo sin nada, lo juro.', 'Hi, Mila. I came empty-handed, I swear.')],
            [5.0, 7.8, F('Ok, ok. Una galletita y no le cuentes a Lona.', "Okay, okay. One treat, and don't tell Lona.")],
            [10.4, 13.2, F('Ahora sí me quieres, interesada.', 'Now you love me, you little gold digger.')]
        ],
        frasesG: [[3.0, 5.0, F('¡MIAAAU!', 'MEOOOW!')], [8.9, 11.0, F('Ñam, ñam.', 'Nom, nom.')]],
        maullidos: [0.4, 3.1, 3.9, 4.7], corazones: [11.8]
    },

    'venjy-gala': {
        T: 13.4,
        dist: () => 1.2,
        fijo: true, mueve: true,
        iniciar(e) {
            e.fase = 0;
            // Destino: echada a tu izquierda (+0,75 de lado, 0,5 adelante), mirando hacia tus piernas
            const lx = 0.75, lz = 0.5;
            e.destino = { x: e.P.x + lx * Math.cos(e.F) + lz * Math.sin(e.F), z: e.P.z - lx * Math.sin(e.F) + lz * Math.cos(e.F) };
            e.yawFinal = e.F - Math.PI / 2;
        },
        jugador(t, e) {
            // Te inclinas y acercas la mano; ella esquiva y la mano vuelve
            let m = mezcla(N, INCLINADO, envolvente(t, 1.4, 4.4, 0.6));
            // Sentado, hombros caídos
            const triste = { ...SENTADO, inc: 0.2, cx: 0.35, bDx: -0.45, bDz: 0.15, bIx: -0.45, bIz: -0.15 };
            m = mezcla(m, triste, suave(tramo(t, 4.8, 5.6)));
            // La sigue con la cabeza mientras llega a tu lado
            if (t > 7.4) m.cy = lim(angulo(Math.atan2(e.g.x - e.P.x, e.g.z - e.P.z) - e.F), -1.1, 1.1) * envolvente(t, 7.4, 13.4, 0.6);
            // Caricia en el lomo con la mano izquierda
            return mezcla(m, { bIx: -1.2 + Math.sin(t * 4) * 0.08, bIz: 0.55, cx: 0.4, inc: 0.12 }, envolvente(t, 9.6, 12.4, 0.5));
        },
        gata(t, e, g, dt) {
            if (t < 7.6) {
                g.pose = t < 3.4 ? 'sentada' : t < 4.6 ? 'pie' : 'sentada';
                // Esquiva y te da la espalda
                const meta = t < 3.6 ? e.aP : e.aP + Math.PI;
                g.yaw += angulo(meta - g.yaw) * Math.min(1, dt * (t < 3.6 ? 4 : 5));
                const esq = envolvente(t, 3.0, 4.2, 0.25);
                g.cabeza.rotation.x -= 0.25 * esq;
                g.cabeza.rotation.z = 0.3 * esq;
                g.cola.rotation.y = Math.sin(t * 3.5) * (t > 4.6 ? 0.45 : 0.15);
            } else {
                if (!e.inicioCamino) e.inicioCamino = { x: g.x, z: g.z };
                const u = suave(tramo(t, 7.8, 9.0));
                const x = lerp(e.inicioCamino.x, e.destino.x, u), z = lerp(e.inicioCamino.z, e.destino.z, u);
                const dx = x - g.x, dz = z - g.z;
                g.x = x; g.z = z;
                const camina = t > 7.6 && t < 9.0;
                g.pose = t < 9.2 ? 'pie' : 'echada';
                const meta = t < 9.0 ? Math.atan2(e.destino.x - e.inicioCamino.x, e.destino.z - e.inicioCamino.z) : e.yawFinal;
                g.yaw += angulo(meta - g.yaw) * Math.min(1, dt * 6);
                if (camina) {
                    e.fase += dt * 9;
                    const b = Math.sin(e.fase) * 0.55 * Math.min(1, Math.hypot(dx, dz) * 60);
                    g.patas[0].rotation.x = b; g.patas[3].rotation.x = b; g.patas[1].rotation.x = -b; g.patas[2].rotation.x = -b;
                }
                // La cabeza descansa sobre tu pierna
                g.cabeza.rotation.x += 0.2 * suave(tramo(t, 9.3, 9.9));
                g.cola.rotation.y = Math.sin(t * 1.5) * 0.2;
            }
            g.ronroneo = t > 8.8 && t < 13.0;
        },
        frasesJ: [
            [0.6, 3.4, F('Gala, la más elegante. ¿Una caricia?', 'Gala, the classiest. A little pet?')],
            [4.8, 7.6, F('Ok, entendí. Me siento acá, no molesto.', "Got it. I'll sit here, not bothering anyone.")],
            [9.6, 12.4, F('Así que la caricia se pide por cita. Anotado.', 'So pets are by appointment only. Noted.')]
        ],
        frasesG: [[3.0, 4.6, F('Hmpf.', 'Hmpf.')], [8.8, 10.4, F('Prrrr…', 'Purrrr…')]],
        maullidos: [0.4, 3.2], corazones: [10.0, 11.2]
    }
};
export const CLAVES_ESCENAS_GATAS = Object.keys(ESCENAS);

export function crearEscenasGatas({ grupo, dy, mundo, jugador, camara, camaras, gatas, misiones, skin, bloquear, liberar, idioma = 'es' }) {
    let L = idioma;
    const tx = () => TXT[L] || TXT.es;
    const etiq = o => (o ? o[L] || o.es : '');

    // Botón «Saltar» (clase propia, como caricias.js) y Esc
    const boton = document.createElement('button');
    boton.type = 'button'; boton.className = 'boton saltar-gata';
    boton.textContent = tx().saltar;
    boton.addEventListener('click', e => { e.preventDefault(); terminar(); });
    document.body.appendChild(boton);
    document.addEventListener('keydown', e => { if (estado && e.code === 'Escape' && !e.repeat) { e.preventDefault(); terminar(); } });

    // Globos achicados (como caricias.js y escena-cuello.js): uno sobre ti y otro sobre la gata
    const globoJ = crearGlobo(grupo); globoJ.sp.scale.set(1.5, 0.62, 1);
    const globoG = crearGlobo(grupo); globoG.sp.scale.set(1.3, 0.56, 1);
    const dicho = new Map();
    function mostrar(globo, texto, dt, x, y, z) {
        if (texto && dicho.get(globo) !== texto) { globo.decir(texto); dicho.set(globo, texto); }
        if (!texto) dicho.delete(globo);
        globo.actualizar(dt, !!texto, x, y, z, camara);
    }

    // Bloques que tapan / pisables (coordenadas del mundo)
    const opaco = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && (TIPO[id] === 1 || TIPO[id] === 6); };
    const solido = (x, y, z) => { const id = mundo.bloque(x, y, z); return id > 0 && TIPO[id] === 1; };
    const sueloValido = (x, y, z) => solido(x, y + dy - 0.5, z) && !opaco(x, y + dy + 0.5, z);

    // Dónde te paras: a `r` del centro de la gata, del lado en que ya estás (como lugarJunto de caricias.js)
    function lugarJunto(g, r0) {
        const dx = jugador.pos.x - g.x, dz = jugador.pos.z - g.z;
        const base = Math.hypot(dx, dz) > 0.3 ? Math.atan2(dx, dz) : g.yaw;
        const piso = Math.round(g.y + dy);
        for (const [da, dr] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.2], [0, -0.15], [0.6, 0], [-0.6, 0], [1.0, 0], [-1.0, 0]]) {
            const a = base + da, r = r0 + dr;
            const x = g.x + Math.sin(a) * r, z = g.z + Math.cos(a) * r;
            for (const y of [piso, piso + 1, piso - 1]) {
                if (solido(x, y - 0.5, z) && !opaco(x, y + 0.5, z) && !opaco(x, y + 1.5, z)) return { x, y, z };
            }
        }
        return null;
    }

    // ---------------------------------------------------------
    // Estado
    // ---------------------------------------------------------
    let estado = null, pausada = false;
    const corazones = [];
    const vC = new THREE.Vector3();
    const cur = {};

    function iniciar(clave, g) {
        const def = ESCENAS[clave];
        bloquear();
        const sitio = lugarJunto(g, def.dist(g));
        if (sitio) jugador.colocar(sitio.x, sitio.y, sitio.z);
        jugador.yaw = Math.atan2(g.x - jugador.pos.x, g.z - jugador.pos.z) - Math.PI;
        jugador.pitch = 0;
        const P = { x: jugador.pos.x, y: jugador.pos.y - dy, z: jugador.pos.z };
        const e = {
            clave, def, g, t: 0, P, F: jugador.yaw + Math.PI, yaw0: jugador.yaw,
            aP: Math.atan2(P.x - g.x, P.z - g.z), g0: { x: g.x, y: g.y, z: g.z },
            ancla: { x: (P.x + g.x) / 2, y: g.y, z: (P.z + g.z) / 2, escala: 0.8 },
            maullos: new Set(), latidos: new Set(), obj: null
        };
        estado = e;
        if (def.iniciar) def.iniciar(e);
        for (const k in cur) delete cur[k];
        if (def.inicial) Object.assign(cur, mezcla(N, def.inicial, 1)); // empieza ya en esa pose (bajo el fundido)
        g.pose = 'pie'; g.poseElegida = false;
        g.escena = dt => def.gata(e.t, e, g, dt);
        globoJ.etiqueta = { color: COLOR_GLOBO[clave.split('-')[0]] };
        globoG.etiqueta = { color: COLOR_GLOBO[g.clave] };
        camaras.iniciarCine(e.ancla, { escena: true, fundido: 0.45, evitar: [], planos: 'gata' });
        camaras.enfocar(0.4);
        camaras.pose = (c, dt) => poseJugador(dt);
        misiones.ocultarMarcas = true;
        misiones.estado.escenasSkin.add(clave);
        document.body.classList.add('en-escena-gata');
    }

    function terminar() {
        if (!estado) return;
        const e = estado; estado = null;
        const g = e.g;
        if (g.escena) delete g.escena;
        g.ronroneo = false;
        g.pose = 'pie'; g.poseElegida = false; g.espera = 1.2;
        g.cabeza.rotation.y = 0; g.cabeza.rotation.z = 0;
        g.tronco.rotation.z = 0;
        for (const p of g.patas) p.rotation.x = 0;
        g.cola.rotation.y = 0; g.cola.rotation.x = g.colaBase ?? -0.9;
        // Si la gata se movió y no quedó sobre suelo válido, vuelve a donde estaba
        if (e.def.mueve && !sueloValido(g.x, g.y, g.z)) { g.x = e.g0.x; g.y = e.g0.y; g.z = e.g0.z; }
        if (e.obj) { if (e.obj.parent) e.obj.parent.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); }
        const c = camaras.cuerpo;
        c.cuerpo.position.y = 0; c.cuerpo.rotation.x = 0; c.cuerpo.rotation.z = 0;
        for (const h of [c.brazoD, c.brazoI, c.piernaD, c.piernaI, c.cuello]) { h.rotation.x = 0; h.rotation.z = 0; }
        c.cuello.rotation.y = 0;
        camaras.terminarCine();
        for (const h of corazones.splice(0)) { grupo.remove(h.s); h.s.material.dispose(); }
        mostrar(globoJ, null, 0, 0, 0, 0); mostrar(globoG, null, 0, 0, 0, 0);
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-escena-gata');
        liberar();
    }

    // Pose del jugador: metas del guion, suavizadas (rapidez 9) y escritas en los huesos
    function poseJugador(dt) {
        if (!estado) return;
        const meta = estado.def.jugador(estado.t, estado);
        const r = Math.min(1, dt * 9);
        for (const k in meta) cur[k] = (cur[k] ?? meta[k]) + (meta[k] - (cur[k] ?? meta[k])) * r;
        const c = camaras.cuerpo;
        c.cuerpo.position.y = cur.y;
        c.cuerpo.rotation.x = cur.inc; c.cuerpo.rotation.z = cur.rz;
        c.piernaD.rotation.x = cur.pDx; c.piernaI.rotation.x = cur.pIx;
        c.brazoD.rotation.x = cur.bDx; c.brazoD.rotation.z = cur.bDz;
        c.brazoI.rotation.x = cur.bIx; c.brazoI.rotation.z = cur.bIz;
        c.cuello.rotation.x = cur.cx; c.cuello.rotation.y = cur.cy; c.cuello.rotation.z = cur.cz;
        if (estado.def.objeto) estado.def.objeto(estado.t, estado, c, grupo);
    }

    function corazon(g) {
        g.g.updateMatrixWorld(true);
        const p = grupo.worldToLocal(g.cabeza.getWorldPosition(vC));
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texCorazon, transparent: true, depthWrite: false }));
        s.scale.set(0.35, 0.35, 1);
        s.position.set(p.x + (Math.random() - 0.5) * 0.3, p.y + 0.3, p.z);
        grupo.add(s);
        corazones.push({ s, t: 1.2 });
    }
    function actualizarCorazones(dt) {
        for (let i = corazones.length - 1; i >= 0; i--) {
            const c = corazones[i];
            c.t -= dt;
            c.s.position.y += dt * 0.6;
            c.s.material.opacity = Math.min(1, c.t * 2);
            if (c.t <= 0) { grupo.remove(c.s); c.s.material.dispose(); corazones.splice(i, 1); }
        }
    }

    function actualizar(dt) {
        actualizarCorazones(dt);
        // Sin escena, los globos se siguen actualizando para terminar de desvanecerse (si no, quedan flotando)
        if (!estado) { mostrar(globoJ, null, dt, 0, 0, 0); mostrar(globoG, null, dt, 0, 0, 0); return; }
        const e = estado, g = e.g, def = e.def;
        if (!pausada) e.t += dt;
        const t = e.t;
        // Si otra escena tomó a la gata, se corta
        if (!g.escena) { terminar(); return; }
        // Te quedas donde empezaste; mirando a la gata o fijo (escenas en que ella da vueltas)
        jugador.pos.x = e.P.x; jugador.pos.z = e.P.z;
        jugador.yaw = def.fijo ? e.yaw0 : Math.atan2(g.x - e.P.x, g.z - e.P.z) - Math.PI;
        e.ancla.x = (e.P.x + g.x) / 2; e.ancla.z = (e.P.z + g.z) / 2; e.ancla.y = g.y;
        def.maullidos.forEach((m, i) => { if (t >= m && !e.maullos.has(i)) { e.maullos.add(i); g.maullar(1.0); } });
        def.corazones.forEach((m, i) => { if (t >= m && !e.latidos.has(i)) { e.latidos.add(i); corazon(g); } });
        // Globos: el tuyo sobre tu cabeza y el de la gata sobre la suya, cada uno corrido hacia su lado
        // (si los dos hablan a la vez no se tapan)
        const fj = def.frasesJ.find(([a, b]) => t >= a && t < b);
        const fg = def.frasesG.find(([a, b]) => t >= a && t < b);
        const alto = (cur.y ?? 0) + 2.35;
        mostrar(globoJ, fj ? etiq(fj[2]) : null, dt, lerp(e.P.x, g.x, -0.35), e.P.y + alto, lerp(e.P.z, g.z, -0.35));
        mostrar(globoG, fg ? etiq(fg[2]) : null, dt, lerp(g.x, e.P.x, -0.35), g.y + g.e.patas + g.e.alto + g.e.cabeza + 0.2, lerp(g.z, e.P.z, -0.35));
        if (t >= def.T) terminar();
    }

    // Llamado por caricias.intentar(): ¿esta caricia es la primera con una skin de Lona o Venjy?
    function especial(g) {
        if (estado) return false;
        const base = tipoSkin(skin()).base;
        const clave = `${base}-${g.clave}`;
        if (!ESCENAS[clave] || misiones.estado.escenasSkin.has(clave)) return false;
        iniciar(clave, g);
        return true;
    }

    return {
        actualizar, especial, saltar: terminar,
        get activa() { return !!estado; },
        setIdioma(l) { L = l; boton.textContent = tx().saltar; dicho.clear(); },
        // Depuración: forzar una escena aunque ya se haya visto y sin importar la skin
        forzar(clave) {
            const def = ESCENAS[clave];
            const g = def && gatas.gatas.find(x => x.clave === clave.split('-')[1]);
            if (!g || estado || g.escena) return false;
            iniciar(clave, g);
            return true;
        },
        pausar(v = true) { pausada = v; },
        irA(s) { if (estado) estado.t = s; }
    };
}
