// Prueba del Estudio, fase 4 (posiciones y gizmo): node mundo/tests/estudio-posiciones.mjs
// Paridad exacta de posiciones.json con los números de amigos.js, ida y vuelta de la conversión del gizmo,
// anclas que faltan, mensaje `elegir` del puente y referencias del validador.
// Lo que necesita navegador (el gizmo sobre una persona, soltar y guardar) se prueba con Playwright: ver DISENO §12.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolverAncla, puntoAMundo, mundoAPunto, GIRO_CALCULADO } from '../datos/posiciones.js';
import { crearManejador, DATOS_VIVOS } from '../../estudio/puente-protocolo.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', 'posiciones.json'), 'utf8'));

// Un mundo cualquiera, con decimales feos para que un orden distinto de sumas se note
const terreno = {
    lugares: [
        { clave: 'campamento', x: 311.5, z: 207.5, bx: 311, bz: 207, y: 23 },
        { clave: 'iglu', x: 100.5, z: 410.5, bx: 100, bz: 410, y: 31 },
        { clave: 'atalaya', x: 530.5, z: 288.5, bx: 530, bz: 288, y: 27 },
        { clave: 'naufragio', x: 402.5, z: 560.5, bx: 402, bz: 560, y: 9 }
    ],
    escenario: { x: 211.5, z: 150.5, y: 20, yaw: Math.PI / 2 },
    faro: { x: 40, z: 40, y: 50 }
};
const L = k => terreno.lugares.find(l => l.clave === k);
const E = terreno.escenario;
const sitio = clave => puntoAMundo(resolverAncla(terreno, datos.personas[clave].ancla), datos.personas[clave]);

// ---------- 1. Paridad: lo mismo que las expresiones de crearAmigos (criaturas/amigos.js) ----------
const C = L('campamento'), I = L('iglu'), A = L('atalaya'), N = L('naufragio');
const hoy = {
    hadad: [C.bx - 2.15, C.y, C.bz + 2, Math.PI / 2],
    nacho: [C.bx + 3.15, C.y, C.bz + 2, -Math.PI / 2],
    andy: [C.bx + 1.3, C.y, C.bz + 3.6, Math.PI],
    moises: [I.bx - 0.6, I.y, I.bz + 1.4, 0],
    lalo: [I.bx + 1.6, I.y, I.bz + 0.6, 0],
    boris: [A.bx - 0.5, A.y, A.bz + 5.5 + 1.65, Math.PI],
    lucho: [A.bx + 2.3, A.y, A.bz + 6.5, 0],
    braulio: [N.x + 4, 0, N.z + 4, 0]
};
{
    const s = Math.sin(E.yaw), c = Math.cos(E.yaw);
    hoy.conejeros = [E.x + s * 6.2 + c * 1.6, 0, E.z + c * 6.2 - s * 1.6, E.yaw + Math.PI];
}
for (const [clave, [x, y, z, yaw]] of Object.entries(hoy)) {
    const s = sitio(clave);
    ok(s.x === x && s.y === y && s.z === z, `${clave}: posición ${s.x},${s.y},${s.z} distinta de la del código ${x},${y},${z}`);
    ok(s.yaw === yaw, `${clave}: giro ${s.yaw} distinto de ${yaw}`);
}
ok(Object.keys(datos.personas).sort().join() === Object.keys(hoy).sort().join(), 'posiciones.json y esta prueba no tienen las mismas personas');
ok(sitio('braulio').suelo && sitio('conejeros').suelo && !sitio('hadad').suelo, 'dy «suelo» solo en braulio y conejeros');

// ---------- 2. Ida y vuelta (lo que hace el gizmo al soltar) ----------
for (const [clave, p] of Object.entries(datos.personas)) {
    const ancla = resolverAncla(terreno, p.ancla);
    const vuelta = mundoAPunto(ancla, sitio(clave), p);
    ok(vuelta.ancla === p.ancla && vuelta.marco === p.marco, `${clave}: ancla y marco se pierden en la vuelta`);
    ok(Math.abs(vuelta.dx - p.dx) < 0.006 && Math.abs(vuelta.dz - p.dz) < 0.006, `${clave}: dx/dz ${vuelta.dx},${vuelta.dz} vs ${p.dx},${p.dz}`);
    ok(Math.abs(vuelta.giro - p.giro) < 0.06 || Math.abs(Math.abs(vuelta.giro - p.giro) - 360) < 0.06, `${clave}: giro ${vuelta.giro} vs ${p.giro}`);
    ok(vuelta.dy === (p.dy === 'suelo' ? 'suelo' : p.dy), `${clave}: dy ${vuelta.dy} vs ${p.dy}`);
    ok(vuelta.nota === p.nota, `${clave}: la nota se perdió`);
}
{
    // Mover a Hadad 1 bloque al este y girarlo 45°: el JSON sale con dx +1 y giro 135 (90 + 45)
    const p = datos.personas.hadad, a = resolverAncla(terreno, p.ancla), s = sitio('hadad');
    const m = mundoAPunto(a, { x: s.x + 1, y: s.y, z: s.z, yaw: s.yaw + Math.PI / 4 }, p);
    ok(m.dx === p.dx + 1 && m.dz === p.dz && m.giro === 135, `mover y girar: ${JSON.stringify(m)}`);
    // marco «ancla»: dos vueltas del escenario no cambian el punto
    const pe = datos.personas.conejeros, ae = resolverAncla(terreno, pe.ancla);
    const m2 = mundoAPunto(ae, { x: sitio('conejeros').x, y: 0, z: sitio('conejeros').z, yaw: sitio('conejeros').yaw + 2 * Math.PI }, pe);
    ok(m2.giro === 180 && m2.dx === pe.dx && m2.dz === pe.dz, `giro normalizado: ${JSON.stringify(m2)}`);
    // el orden de claves es el del archivo (los diffs quedan chicos)
    ok(Object.keys(m).join() === 'ancla,dx,dy,dz,giro,nota', `orden de claves: ${Object.keys(m)}`);
    ok(Object.keys(m2).join() === 'ancla,marco,dx,dy,dz,giro,nota', `orden de claves con marco: ${Object.keys(m2)}`);
}

// ---------- 3. Anclas ----------
ok(resolverAncla(terreno, 'faro').y === 50, 'faro');
ok(resolverAncla(terreno, 'escenario').yaw === Math.PI / 2, 'escenario trae su giro');
ok(resolverAncla(terreno, 'molino') === null, 'un lugar que este mundo no tiene da null');
ok(resolverAncla({}, 'iglu') === null && resolverAncla(null, 'iglu') === null, 'sin terreno da null');
ok(Object.keys(GIRO_CALCULADO).sort().join() === 'lalo,lucho,moises', 'quienes ignoran el giro');

// ---------- 4. Puente: mensaje `elegir` ----------
ok(DATOS_VIVOS.includes('posiciones'), 'posiciones entra en DATOS_VIVOS');
{
    const llamadas = [];
    const responder = crearManejador({
        idioma: () => 'es',
        aplicarDatos: async () => {},
        elegir: async o => { llamadas.push(o); if (o.clave === 'nadie') throw new Error('«nadie» no existe en este mundo'); return o.clave ? { ancla: 'iglu', dx: 1, dy: 0, dz: 2, giro: 0 } : null; }
    });
    const pedir = m => responder({ de: 'estudio', id: 7, ...m });
    let r = await pedir({ tipo: 'elegir', objeto: 'persona', clave: 'hadad', modo: 'girar' });
    ok(r.tipo === 'elegido' && r.id === 7 && r.clave === 'hadad' && r.punto.dx === 1, `elegir: ${JSON.stringify(r)}`);
    ok(llamadas[0].clave === 'hadad' && llamadas[0].modo === 'girar', 'el modo llega al juego');
    r = await pedir({ tipo: 'elegir', objeto: 'persona', clave: 'hadad' });
    ok(llamadas[1].modo === 'mover', 'modo por defecto: mover');
    r = await pedir({ tipo: 'elegir', objeto: 'nada' });
    ok(r.tipo === 'elegido' && r.clave === null && r.punto === null && llamadas[2].clave === null, `quitar gizmo: ${JSON.stringify(r)}`);
    r = await pedir({ tipo: 'elegir', objeto: 'persona', clave: 'nadie' });
    ok(r.tipo === 'error' && r.id === 7 && /no existe/.test(r.mensaje), 'persona que no existe: error con el id');
    r = await pedir({ tipo: 'elegir', objeto: 'cosa', clave: 'x' });
    ok(r.tipo === 'error', 'objeto no válido');
    r = await pedir({ tipo: 'elegir', objeto: 'persona', clave: 'x', modo: 'volar' });
    ok(r.tipo === 'error' && /modo/.test(r.mensaje), 'modo no válido');
    r = await pedir({ tipo: 'elegir', objeto: 'persona', clave: '../x' });
    ok(r.tipo === 'error', 'clave con caracteres raros');
    r = await responder({ de: 'estudio', tipo: 'elegir', objeto: 'persona', clave: 'a' }).then(x => crearManejador({ idioma: () => 'es', aplicarDatos() {} })({ de: 'estudio', tipo: 'elegir', objeto: 'persona', clave: 'a' }));
    ok(r.tipo === 'error', 'un juego sin gizmo contesta error');
    r = await pedir({ tipo: 'datos', nombre: 'posiciones', datos: { version: 1, personas: {} } });
    ok(r.tipo === 'ok', 'datos posiciones se acepta');
}

// ---------- 5. Validador con referencias ----------
const cli = (...args) => {
    try { return { salida: execFileSync('node', [path.join(RAIZ, 'estudio', 'cli.mjs'), ...args], { cwd: RAIZ, encoding: 'utf8' }), codigo: 0 }; } catch (e) { return { salida: String(e.stdout), codigo: e.status }; }
};
{
    const r = cli('validar', 'posiciones');
    ok(r.codigo === 0 && /OK 1 de 1/.test(r.salida), `validar posiciones: ${r.salida}`);
    const r2 = cli('resumen', 'posiciones');
    ok(/hadad\s+campamento/.test(r2.salida) && /braulio\s+naufragio 4.5,suelo,4.5/.test(r2.salida), 'resumen posiciones');
    // una persona y un ancla que no existen
    const ruta = path.join(RAIZ, 'mundo', 'datos', 'posiciones.json');
    const original = fs.readFileSync(ruta);
    try {
        const d = JSON.parse(original.toString('utf8'));
        d.personas.fantasma = { ancla: 'castillo', dx: 1, dz: 1 };
        d.personas.hadad.ancla = 'spawn';
        fs.writeFileSync(ruta, JSON.stringify(d, null, 2) + '\n');
        const r3 = cli('validar', 'posiciones');
        ok(r3.codigo === 1, 'validar debía fallar con persona y ancla inexistentes');
        ok(/personas\.fantasma: no existe esa persona/.test(r3.salida), 'persona inexistente');
        ok(/fantasma\.ancla: «castillo»/.test(r3.salida) && /hadad\.ancla: «spawn»/.test(r3.salida), 'ancla inexistente');
    } finally {
        fs.writeFileSync(ruta, original);
    }
}

console.log(fallos ? `${fallos} FALLAS` : 'estudio-posiciones: todo bien');
process.exit(fallos ? 1 : 0);
