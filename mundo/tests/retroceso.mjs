// Prueba del retroceso de los monstruos (bloque 7a, punto 10): node mundo/tests/retroceso.mjs
// Usa `empujar` y `suavizarVelocidad` de supervivencia/enemigos.js (las mismas funciones que `golpear` y el
// bucle de cada monstruo) con `moverCuerpo` de fisica.js sobre un mundo plano falso.
// Meta del plan: 2,5 ± 0,5 bloques con golpe normal (fuerza 0,45) y 4 ± 0,5 corriendo (0,85).
globalThis.window ??= { addEventListener() {} };
globalThis.document ??= { addEventListener() {}, createElement() { return { getContext() { return {}; } }; } };
const { empujar, suavizarVelocidad, RETROCESO } = await import('../supervivencia/enemigos.js');
const { moverCuerpo } = await import('../fisica.js');
const { B } = await import('../texturas.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };

const mundo = { chunks: { has: () => true }, bloque: (x, y) => Math.floor(y) < 10 ? B.PIEDRA : B.AIRE };
const V_ZOMBI = 2.6; // d.vel de un zombi; da igual: en retroceso el objetivo es 0

// Golpea a un monstruo quieto en el suelo desde 1 bloque al sur y mide cuánto se aleja como máximo
// (persiguiendo: al terminar el retroceso vuelve hacia el jugador). `fuerza` como en combate.js.
function distanciaMaxima(fuerza, { retroceso = true, seg = 3 } = {}) {
    const e = { pos: { x: 0, y: 10, z: 0 }, vel: { x: 0, y: 0, z: 0 }, ancho: 0.6, alto: 1.9, enSuelo: true, retroceso: 0 };
    const jugador = { x: 0, z: 1 };
    e.enSuelo = true;
    empujar(e, e.pos.x - jugador.x, e.pos.z - jugador.z, fuerza);
    if (!retroceso) e.retroceso = 0;
    let max = 0;
    const dt = 1 / 60;
    for (let t = 0; t < seg; t += dt) {
        const dx = jugador.x - e.pos.x, dz = jugador.z - e.pos.z, d = Math.hypot(dx, dz) || 1;
        // Persigue siempre (la IA lo pone en ix/iz; en retroceso suavizarVelocidad lo anula)
        suavizarVelocidad(e, dx / d, dz / d, V_ZOMBI, dt);
        moverCuerpo(mundo, e, dt);
        if (e.chocoLado && e.enSuelo) e.vel.y = 8.4; // salta escalones, como enemigos.js
        max = Math.max(max, -e.pos.z); // alejamiento hacia -z (opuesto al jugador) desde el punto del golpe
    }
    return max;
}
const normal = distanciaMaxima(0.45);   // golpe de cuadro completo sin correr (fuerza 0,45 × (0,3 + 0,7·carga) con carga = 1)
const corriendo = distanciaMaxima(0.85);       // correr con carga > 0,9
const sinMejora = distanciaMaxima(0.45, { retroceso: false });

console.log(`normal ${normal.toFixed(2)} · corriendo ${corriendo.toFixed(2)} · (sin retroceso: ${sinMejora.toFixed(2)})`);
ok(Math.abs(normal - 2.5) <= 0.5, `golpe normal: ${normal.toFixed(2)} bloques (meta 2,5 ± 0,5)`);
ok(Math.abs(corriendo - 4) <= 0.5, `golpe corriendo: ${corriendo.toFixed(2)} bloques (meta 4 ± 0,5)`);
ok(corriendo > normal + 1, 'correr empuja bastante más que caminar');
ok(sinMejora < normal, 'sin la ventana de retroceso el empuje es menor (se borra al cuadro siguiente)');

// Mientras dura el retroceso no persigue: el objetivo es 0 aunque (ix, iz) apunten al jugador
{
    const e = { vel: { x: 5, y: 0, z: 0 }, enSuelo: true, retroceso: RETROCESO.tiempo };
    suavizarVelocidad(e, -1, 0, 3, 1 / 60);
    ok(e.vel.x > 4.5, `en retroceso solo baja la rapidez con roce bajo (vel.x = ${e.vel.x.toFixed(2)})`);
    ok(e.retroceso < RETROCESO.tiempo, 'el temporizador de retroceso baja');
    for (let i = 0; i < 40; i++) suavizarVelocidad(e, -1, 0, 3, 1 / 60);
    ok(e.retroceso === 0, 'el retroceso termina a los 0,5 s');
    ok(e.vel.x < 3, 'al terminar vuelve a perseguir');
}

// El monstruo tocado en el aire (vel.y no se pisa) y la altura del salto
{
    const e = { pos: { x: 0, y: 10, z: 0 }, vel: { x: 0, y: 0, z: 0 }, enSuelo: true };
    empujar(e, 0, -1, 0.45);
    ok(e.vel.y === RETROCESO.salto && RETROCESO.salto === 6, 'salto de 6 m/s en el suelo');
    ok(Math.abs(Math.hypot(e.vel.x, e.vel.z) - 0.45 * 16) < 0.01, 'impulso horizontal = fuerza × 16');
    const f = { vel: { x: 0, y: 0, z: 0 }, enSuelo: false };
    empujar(f, 0, -1, 0.45);
    ok(f.vel.y === 0, 'en el aire no se vuelve a lanzar hacia arriba');
}

// Explosiones: la fuerza k (0..1) escala el empuje, y el creeper empujado a > 7 apaga la mecha (ver enemigos.js)
{
    const a = { vel: { x: 0, y: 0, z: 0 }, enSuelo: true }, b = { vel: { x: 0, y: 0, z: 0 }, enSuelo: true };
    empujar(a, 1, 0, 0.5); empujar(b, 1, 0, 1);
    ok(b.vel.x > a.vel.x * 1.9, 'más fuerza empuja más');
}

console.log(fallos ? `\n${fallos} de ${pruebas} pruebas fallaron` : `OK · ${pruebas} pruebas`);
process.exit(fallos ? 1 : 0);
