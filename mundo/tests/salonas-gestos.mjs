// Prueba de los gestos de tocar de Salonas (Node puro): node mundo/tests/salonas-gestos.mjs
// Comprueba números finitos, continuidad dentro de cada sección (ningún canal salta más de 0,35 rad por
// cuadro; «y» más de 0,08), golpes en [0,1], salto nulo = guitarra quieta en y, y determinismo.
import { GESTOS_SALONAS as G, guitarra, bateria, bajo, publico } from '../supervivencia/salonas-gestos.js';

let fallos = 0;
let comprobaciones = 0;
const ok = (cond, msg) => { comprobaciones++; if (!cond) { fallos++; console.log('FALLA:', msg); } };

const PULSOS = 8;
const CUADROS = 120;
const SECCIONES = ['intro', 'verso', 'coro', 'solo', 'puente', 'final', 'otro'];
const UMBRAL = 0.35;
const UMBRAL_Y = 0.08;

// Ritmo de un cuadro. El salto, si se pide, es una envolvente suave (dos pulsos por ciclo).
function ritmoDe(pulso, j, seccion, conSalto) {
    const fase = j / CUADROS;
    const t = pulso + fase;
    const salto = conSalto ? Math.pow(Math.sin(Math.PI * t / 2), 2) : 0;
    return { pulso, fase, seccion, salto, energia: 0.7 };
}

// Recorre 8 pulsos y devuelve la lista de cuadros (cada uno, un objeto plano de números).
function recorrer(fn, seccion, conSalto = false) {
    const cuadros = [];
    for (let p = 0; p < PULSOS; p++) {
        for (let j = 0; j < CUADROS; j++) cuadros.push(fn(ritmoDe(p, j, seccion, conSalto)));
    }
    return cuadros;
}

// Revisa números finitos y continuidad canal por canal (solo entre cuadros consecutivos).
function revisarSerie(nombre, cuadros) {
    let prev = null;
    cuadros.forEach((c, i) => {
        for (const [k, v] of Object.entries(c)) {
            ok(Number.isFinite(v), `${nombre} cuadro ${i}: ${k} no es finito (${v})`);
            if (prev && typeof prev[k] === 'number') {
                const lim = k === 'y' ? UMBRAL_Y : UMBRAL;
                const d = Math.abs(v - prev[k]);
                ok(d <= lim, `${nombre} cuadro ${i}: ${k} salta ${d.toFixed(3)} (máx ${lim})`);
            }
        }
        prev = c;
    });
}

// Aplana un resultado (bateria devuelve { angulos, golpes }; los demás, canales directos).
const angulosDe = res => (res && res.angulos ? res.angulos : res);

// ---------- Guitarra ----------
for (const sec of SECCIONES) {
    const sinSalto = recorrer(r => guitarra(r), sec);
    revisarSerie(`guitarra/${sec}`, sinSalto);
    for (const c of sinSalto) {
        ok(c.y >= -0.05 && c.y <= 0.1, `guitarra/${sec} con salto 0: y=${c.y} fuera de [-0.05, 0.1]`);
    }
    const conSalto = recorrer(r => guitarra(r, G), sec, true);
    revisarSerie(`guitarra/${sec}+salto`, conSalto);
}

// ---------- Batería ----------
for (const sec of SECCIONES) {
    const cuadros = recorrer(r => bateria(r), sec);
    revisarSerie(`bateria/${sec}`, cuadros.map(angulosDe));
    const golpes = cuadros.map(c => c.golpes);
    for (const [i, g] of golpes.entries()) {
        for (const [k, v] of Object.entries(g)) {
            ok(Number.isFinite(v) && v >= 0 && v <= 1, `bateria/${sec} cuadro ${i}: golpe ${k}=${v} fuera de [0,1]`);
        }
    }
    revisarSerie(`bateria/${sec} golpes`, golpes);
}

// ---------- Bajo ----------
for (const sec of SECCIONES) {
    for (const carril of [0, 1.5, 3]) {
        const cuadros = recorrer(r => bajo(r, G, {
            carril,
            slap: Math.pow(Math.sin(Math.PI * (r.pulso + r.fase)), 2),
            fallo: 0.5 - 0.5 * Math.cos(Math.PI * (r.pulso + r.fase))
        }), sec);
        revisarSerie(`bajo/${sec}/carril${carril}`, cuadros);
    }
}

// ---------- Público ----------
for (const sec of SECCIONES) {
    for (const tipo of ['aplaude', 'abuchea', 'salta', 'mira']) {
        for (const animo of [-1, 0, 1]) {
            const cuadros = recorrer(r => publico(r, G, { animo, desfase: 0.37, tipo }), sec);
            revisarSerie(`publico/${sec}/${tipo}/animo${animo}`, cuadros);
        }
    }
}

// ---------- Determinismo: misma entrada, misma salida ----------
{
    const r = ritmoDe(3, 40, 'coro', true);
    const a = JSON.stringify([guitarra(r), bateria(r), bajo(r, G, { carril: 2, slap: 0.4, fallo: 0.1 }), publico(r, G, { animo: -0.5, desfase: 0.2, tipo: 'salta' })]);
    const b = JSON.stringify([guitarra(r), bateria(r), bajo(r, G, { carril: 2, slap: 0.4, fallo: 0.1 }), publico(r, G, { animo: -0.5, desfase: 0.2, tipo: 'salta' })]);
    ok(a === b, 'determinismo: misma entrada dio salidas distintas');
}

if (fallos === 0) {
    console.log(`OK salonas-gestos: ${comprobaciones} comprobaciones, 0 fallos`);
} else {
    console.log(`salonas-gestos: ${fallos} fallos de ${comprobaciones} comprobaciones`);
    process.exitCode = 1;
}
