// =========================================================
// Prueba del menú «Rendimiento» (bloque 7b-2, sin navegador)
// Ejecutar: node mundo/tests/rendimiento.mjs
//
// Cubre supervivencia/rendimiento.js y criaturas/lod.js:
//   1. normalizar: valores basura, límites y valores por defecto = lo que había antes del menú
//   2. presets: aplicar y reconocer (presetDe), «personalizado» al cambiar un campo
//   3. LimitadorFps: 30 y 60 con pantallas de 60, 144 y 240 Hz; libre dibuja siempre
//   4. AutoDistancia: baja con FPS bajos, sube con FPS de sobra, respeta mínimo, máximo y enfriamiento;
//      con límite de 30 FPS no baja por estar en 30
//   5. Cuadros: mediana y p95
//   6. pasoLejano: no pierde tiempo (suma de dt igual), cerca/escena/vida siempre dt, salto 1 = nada
// Sale con código 0 si todo coincide, 1 si no.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const R = await import(pathToFileURL(resolve(raiz, 'mundo/supervivencia/rendimiento.js')).href);
const L = await import(pathToFileURL(resolve(raiz, 'mundo/criaturas/lod.js')).href);

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.error('FALLO: ' + msg); } };
const igual = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)}`);
const cerca = (a, b, tol, msg) => ok(a != null && Math.abs(a - b) <= tol, `${msg}: esperaba ${b} ± ${tol}, salió ${a}`);

// ---- 1. normalizar ----
{
    const d = R.normalizar(null, 2);
    igual([d.distancia, d.escala, d.particulas, d.nubes, d.auto, d.limite, d.fps, d.ms], [8, 1.5, 'todas', true, false, 0, true, false], 'defecto en pantalla de 2×');
    igual(R.normalizar(undefined, 1).escala, 1, 'defecto en pantalla de 1× = min(dpr, 1,5)');
    const m = R.normalizar({ distancia: 99, escala: 9, particulas: 'x', nubes: 'si', lejos: 3, limite: 45, auto: 1, fps: null }, 1);
    igual([m.distancia, m.escala, m.particulas, m.nubes, m.lejos, m.limite, m.auto, m.fps], [14, 1.5, 'todas', true, 2, 30, false, true], 'basura y límites');
    igual(R.normalizar({ distancia: 1 }, 1).distancia, 4, 'distancia mínima');
    igual(R.normalizar({ escala: 0.1 }, 1).escala, 0.5, 'escala mínima');
    igual(R.normalizar({ escala: 0.83 }, 1).escala, 0.85, 'escala a pasos de 0,05');
    igual(R.normalizar('texto', 1).distancia, 8, 'no objeto');
}

// ---- 2. presets ----
{
    for (const dpr of [1, 1.25, 2, 3]) for (const n of R.NOMBRES_PRESET) {
        const c = R.normalizar({}, dpr);
        R.aplicarPreset(c, n, dpr);
        igual(R.presetDe(c, dpr), n, `preset ${n} reconocido (dpr ${dpr})`);
    }
    const c = R.normalizar({}, 2);
    R.aplicarPreset(c, 'rapido', 2);
    ok(c.distancia < 8 && c.escala < 1 && c.particulas === 'pocas' && !c.nubes && c.lejos === 4 && c.auto, 'rápido recorta todo');
    c.nubes = true;
    igual(R.presetDe(c, 2), 'personalizado', 'un cambio lo vuelve personalizado');
    const b = R.aplicarPreset(R.normalizar({ fps: false, ms: true }, 1), 'bonito', 1);
    igual([b.fps, b.ms], [false, true], 'los presets no tocan fps ni ms');
    ok(R.PRESETS.rapido(2).distancia < R.PRESETS.equilibrado(2).distancia && R.PRESETS.equilibrado(2).distancia < R.PRESETS.bonito(2).distancia, 'rápido < equilibrado < bonito en distancia');
    ok(R.PRESETS.bonito(1).distancia <= R.DISTANCIA.max && R.PRESETS.bonito(1).escala <= R.ESCALA.max, 'bonito dentro de los topes');
}

// ---- 3. Límite de FPS ----
{
    const contar = (hz, limite, seg = 5) => {
        const l = new R.LimitadorFps(limite);
        let n = 0;
        for (let t = 0; t < seg * 1000; t += 1000 / hz) if (l.toca(t + 1000)) n++;
        return n / seg;
    };
    cerca(contar(60, 60), 60, 2, '60 Hz con límite 60');
    cerca(contar(144, 60), 60, 3, '144 Hz con límite 60');
    cerca(contar(240, 60), 60, 3, '240 Hz con límite 60');
    cerca(contar(60, 30), 30, 2, '60 Hz con límite 30');
    cerca(contar(144, 30), 30, 3, '144 Hz con límite 30');
    cerca(contar(60, 0), 60, 0, 'libre dibuja todos');
    cerca(contar(30, 60), 30, 1, 'pantalla de 30 Hz con límite 60 no inventa cuadros');
    const l = new R.LimitadorFps(30);
    l.toca(0); l.toca(5000); // se queda dormido 5 s: no debe soltar una ráfaga
    let r = 0; for (let t = 5001; t < 5100; t += 4) if (l.toca(t)) r++;
    ok(r <= 4, `sin ráfaga tras una pausa larga (salieron ${r})`);
}

// ---- 4. Distancia automática ----
{
    const corre = (fps, seg, est) => {
        const cambios = [];
        for (let t = 0; t < seg; t += 0.5) {
            const n = est.a.paso(fps, 0.5, { actual: est.d, max: est.max, objetivo: est.obj ?? 60 });
            if (n !== null) { est.d = n; cambios.push([t, n]); }
        }
        return cambios;
    };
    // FPS bajos: baja de a 1, no antes de 6 s ni más de uno cada 5 s
    let e = { a: new R.AutoDistancia(), d: 10, max: 10 };
    let c = corre(25, 40, e);
    ok(c.length >= 3 && c[0][0] >= 6, `baja tras ≥ 6 s (primer cambio en ${c[0] && c[0][0]})`);
    ok(c.every((x, i) => i === 0 || x[0] - c[i - 1][0] >= 5), 'enfriamiento de 5 s');
    ok(c.every((x, i) => x[1] === 10 - 1 - i), 'baja de a 1 chunk');
    corre(25, 400, e);
    igual(e.d, 5, 'no baja del mínimo (5)');
    // FPS de sobra: sube hasta el máximo y no pasa
    c = corre(120, 120, e);
    igual(e.d, 10, 'sube hasta el máximo elegido');
    ok(c.every(x => x[1] <= 10), 'nunca sobre el máximo');
    // FPS medios (entre 40 y 58): se queda
    e = { a: new R.AutoDistancia(), d: 8, max: 10 };
    igual(corre(50, 60, e).length, 0, 'FPS medios no cambian nada');
    // cargando: no mide
    e = { a: new R.AutoDistancia(), d: 8, max: 10 };
    let cam = 0;
    for (let t = 0; t < 60; t += 0.5) if (e.a.paso(10, 0.5, { cargando: true, actual: 8, max: 10 }) !== null) cam++;
    igual(cam, 0, 'cargando chunks: no baja');
    // El máximo baja desde el slider: se ajusta
    e = { a: new R.AutoDistancia(), d: 12, max: 8 };
    corre(60, 30, e);
    igual(e.d, 8, 'si el máximo es menor, vuelve al máximo');
    // Con límite de 30 FPS: 30 FPS es «bien»: no baja y sí sube
    e = { a: new R.AutoDistancia(), d: 8, max: 10, obj: 30 };
    igual(corre(29.5, 5, e).length, 0, 'límite 30: 29,5 FPS no es motivo para bajar');
    corre(29.5, 60, e);
    igual(e.d, 10, 'límite 30: a 29,5 FPS sobra y sube');
}

// ---- 5. Cuadros ----
{
    const q = new R.Cuadros(100);
    for (let i = 1; i <= 100; i++) q.agregar(i);
    cerca(q.mediana, 51, 1, 'mediana');
    cerca(q.p95, 96, 1, 'p95');
    for (let i = 0; i < 100; i++) q.agregar(2);
    igual(q.mediana, 2, 'ventana deslizante');
    igual(new R.Cuadros().mediana, 0, 'vacío = 0');
}

// ---- 6. pasoLejano ----
{
    const tot = (n, salto, dJ, cuadros = 400, dt = 0.016) => {
        let s = 0, ejec = 0;
        for (let i = 0; i < cuadros; i++) { const d = L.pasoLejano(n, dJ, dt, salto, 60); if (d > 0) ejec++; s += d; }
        return { s, ejec };
    };
    for (const salto of [1, 2, 4]) {
        const r = tot({}, salto, 100);
        cerca(r.s, 400 * 0.016, 0.1, `salto ${salto}: el tiempo total se conserva`);
        cerca(r.ejec, 400 / salto, 2, `salto ${salto}: ejecuta 1 de cada ${salto}`);
    }
    igual(tot({}, 4, 30).ejec, 400, 'cerca (≤ radio): todos los cuadros');
    igual(tot({ escena: () => {} }, 4, 100).ejec, 400, 'con escena: todos');
    igual(tot({ inter: {} }, 4, 100).ejec, 400, 'con interacción: todos');
    igual(tot({ vida: {} }, 4, 100).ejec, 400, 'con vida de amigos: todos');
    // Al acercarse suelta lo acumulado
    const n = {};
    let s = 0;
    for (let i = 0; i < 3; i++) s += L.pasoLejano(n, 100, 0.016, 4, 60);
    s += L.pasoLejano(n, 10, 0.016, 4, 60);
    cerca(s, 4 * 0.016, 0.001, 'al acercarse no se pierde tiempo');
    // Los personajes no saltan todos en el mismo cuadro (fases repartidas)
    const gente = Array.from({ length: 8 }, () => ({}));
    const porCuadro = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) for (const g of gente) if (L.pasoLejano(g, 100, 0.016, 4, 60) > 0) porCuadro[i]++;
    ok(Math.max(...porCuadro) <= 3, `trabajo repartido entre cuadros (${porCuadro})`);
    ok(L.LOD.salto === 1 && L.LOD.animales === 4, 'valores por defecto de LOD = comportamiento de antes');
}

console.log(fallos ? `${fallos} FALLOS de ${pruebas}` : `OK · ${pruebas} comprobaciones`);
process.exit(fallos ? 1 : 0);
