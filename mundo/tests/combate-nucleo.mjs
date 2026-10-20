// =========================================================
// Prueba del núcleo del combate (bloque 8 · N3, mundo/COMBATE.md §15.2 y §15.3)
// Ejecutar: node mundo/tests/combate-nucleo.mjs
// Cubre supervivencia/combate/datos.js, estados.js y reglas.js con mundo/datos/combate.json y estilo-prueba.json:
//   1. Marcas («activo+2»), fases y curvas con nombre.
//   2. Paso fijo: a 30, 60, 120 y 144 Hz de dibujo corren los mismos cuadros lógicos.
//   3. Estados: guardia, paso, ataque por fases, fin y vuelta a la guardia; responde en el mismo cuadro.
//   4. Buffer: se guarda 8 c (12 en táctil), gana la última salvo la defensa, se consume en la primera ventana.
//   5. Cancelaciones: combo dentro de la ventana, a defensa desde la recuperación, siConecto.
//   6. Recibir: prioridad (sin efecto > armadura > i-frames > desvío > bloqueo > reacción), ventana del desvío
//      (+2 c en táctil), desvío mantenido que pasa a bloqueo, hitstop que congela.
//   7. Avance (root motion) y alcance.
//   8. Reglas de validar: fases, ventanas, cancelaciones, claves de fase, curvas, límites y peligro.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const leer = n => JSON.parse(readFileSync(resolve(raiz, 'mundo/datos', n + '.json'), 'utf8'));
const D = await imp('mundo/supervivencia/combate/datos.js');
const E = await imp('mundo/supervivencia/combate/estados.js');
const R = await imp('mundo/supervivencia/combate/reglas.js');
const C = await imp('mundo/datos/curvas.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { console.error('FALLO: ' + msg); fallos++; } };
const casi = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const clon = o => JSON.parse(JSON.stringify(o));

const COMB = leer('combate'), ESTILO = leer('estilo-prueba');
D.fijarCombate(COMB);
const tajo = ESTILO.ataques.tajo, F = tajo.fases, TOTAL = D.largoFases(F);

// ---------- 1. Marcas, fases y curvas ----------
ok(D.marca('activo+2', F) === F.anticipacion + 2, 'activo+2');
ok(D.marca('recuperacion-1', F) === F.anticipacion + F.activo - 1, 'recuperacion-1');
ok(D.marca('fin', F) === TOTAL && D.marca('anticipacion', F) === 0, 'fin y anticipacion');
ok(D.marca('golpe+1', F) === null && D.marca('activo+x', F) === null, 'una marca que no se entiende da null');
ok(D.faseEn(F, 0).fase === 'anticipacion' && D.faseEn(F, F.anticipacion).fase === 'activo' && D.faseEn(F, TOTAL - 1).fase === 'recuperacion', 'faseEn');
{
    const largo = { ...F, anticipacion: 20 };
    ok(D.marca('activo+2', largo) === 22, 'la marca sigue a la fase estirada');
}
for (const k of Object.keys(C.CURVAS_BASE)) {
    ok(casi(C.curva(k, 0), 0) && casi(C.curva(k, 1), 1), `curva ${k}: empieza en 0 y termina en 1`);
    for (const [x, y] of C.CURVAS_BASE[k]) ok(casi(C.curva(k, x), y, 1e-12), `curva ${k} pasa por (${x}, ${y})`);
}
ok(C.curva('latigo', 0.8) > 1.07, 'el látigo se pasa un 8 %');
ok(C.curva('retroceso', 0.2) < 0, 'el retroceso baja antes de subir');
{
    let rebotes = 0, prev = 0, sube = true;
    for (let i = 1; i <= 200; i++) { const y = C.curva('asentar', i / 200); if ((y > prev) !== sube) { rebotes++; sube = !sube; } prev = y; }
    ok(rebotes >= 2, 'asentar rebota y se apaga');
}
ok(casi(C.curva('noexiste', 0.5), C.curva('suave', 0.5)), 'una curva que no existe se lee como suave');
C.fijarCurvas({ suave: [[0, 0], [1, 1]] });
ok(casi(C.curva('suave', 0.3), 0.3), 'combate.json → curvas reemplaza por nombre');
C.fijarCurvas({ mala: [[0, 0], [0.5, 1], [0.4, 1]] });
ok(!C.nombresCurvas().includes('mala'), 'una curva con x desordenado no se usa');
D.fijarCombate(COMB);
ok(D.COMBATE.motor.hz === 60 && D.COMBATE.entrada.buffer === 8 && D.COMBATE.tactil.buffer === 12, 'combate.json se lee');
D.fijarCombate({ motor: { hz: 'rápido', saltoMax: 0.2 } });
ok(D.COMBATE.motor.hz === 60 && D.COMBATE.motor.saltoMax === 0.2 && D.COMBATE.motor.mezcla.normal === 6, 'un valor con el tipo equivocado usa el del código');
D.fijarCombate(null);
ok(D.COMBATE.motor.saltoMax === 0.35, 'sin datos vale el código');
D.fijarCombate(COMB);

// ---------- 2. Paso fijo ----------
for (const hzDibujo of [30, 60, 120, 144]) {
    const reloj = E.crearRelojFijo(60, 6);
    let n = 0;
    for (let i = 0; i < hzDibujo * 2; i++) reloj.avanzar(1 / hzDibujo, () => n++);
    ok(Math.abs(n - 120) <= 1, `a ${hzDibujo} Hz de dibujo corren 120 cuadros lógicos en 2 s (corrieron ${n})`);
}
{
    const reloj = E.crearRelojFijo(60, 6);
    let n = 0;
    reloj.avanzar(5, () => n++);
    ok(n === 6, 'una pausa larga corre como mucho maxPasos cuadros');
    const alfa = reloj.avanzar(1 / 120, () => n++);
    ok(alfa >= 0 && alfa < 1, 'alfa entre 0 y 1');
}

// ---------- 3. Estados ----------
const nada = {};
const apretar = (tipo, extra = {}) => ({ [tipo]: 'apretar', ...extra });
const correr = (p, n, intencion = nada) => { for (let i = 0; i < n; i++) E.paso(p, intencion); };
{
    const p = E.crearPeleador(ESTILO);
    E.paso(p, nada);
    ok(p.estado === 'guardia', 'empieza en guardia');
    E.paso(p, { mover: [1, 0] });
    ok(p.estado === 'paso' && casi(p.mov[0], ESTILO.paso.velocidad / 60), 'mover pasa a paso y avanza a su velocidad');
    E.paso(p, { mover: [0.05, 0] });
    ok(p.estado === 'guardia' && p.mov[0] === 0, 'bajo el umbral vuelve a la guardia');
    const n0 = p.cambio.n;
    E.paso(p, apretar('atacar'));
    ok(p.estado === 'ataque' && p.clave === 'tajo' && p.c === 0, 'atacar empieza el tajo en el mismo cuadro (responde al instante)');
    ok(p.cambio.n === n0 + 1 && p.cambio.mezcla === D.COMBATE.motor.mezcla.normal, 'el cambio de estado pide la mezcla normal');
    ok(p.eventos.some(e => e.tipo === 'inicio' && e.clave === 'tajo'), 'evento inicio');
    let activo = -1;
    for (let c = 1; c < TOTAL; c++) { E.paso(p, nada); if (p.eventos.some(e => e.tipo === 'activo')) activo = p.c; }
    ok(activo === F.anticipacion, 'evento activo en el primer cuadro del activo');
    ok(p.estado === 'ataque' && p.c === TOTAL - 1, 'el ataque dura sus cuadros');
    E.paso(p, nada);
    ok(p.estado === 'guardia' && p.cambio.mezcla === D.COMBATE.motor.mezcla.guardia, 'al terminar vuelve a la guardia con la mezcla larga');
    ok(p.eventos.some(e => e.tipo === 'fin' && e.clave === 'tajo'), 'evento fin');
    E.paso(p, { mover: [1, 0], atacar: 'mantener' });
    ok(p.estado === 'paso', 'mantener no vuelve a atacar');
}

// ---------- 4. Buffer ----------
const tajoHasta = (p, c) => { while (p.c < c) E.paso(p, nada); };
{
    // Apretado durante la anticipación (sin ventana) se pierde si pasan más de 8 c
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('atacar'));
    E.paso(p, apretar('atacar')); // c = 1: no hay ventana de combo hasta recuperacion+10
    const d = D.marca('recuperacion+10', F);
    tajoHasta(p, d - 1);
    ok(p.clave === 'tajo' && p.c === d - 1, 'todavía no se puede encadenar');
    ok(p.buffer === null, 'lo apretado hace más de 8 c ya no está');
}
{
    // Apretado 8 c antes de la ventana entra justo; 9 c antes no
    for (const [antes, entra] of [[7, true], [8, false]]) {
        const p = E.crearPeleador(ESTILO);
        E.paso(p, apretar('atacar'));
        const d = D.marca('recuperacion+10', F);
        tajoHasta(p, d - antes - 1);
        E.paso(p, apretar('atacar')); // queda en el cuadro d - antes
        const serial = p.cambio.n;
        while (p.cambio.n === serial && p.c < d) E.paso(p, nada);
        const combo = p.cambio.n !== serial;
        ok(combo === entra, `apretado ${antes} c antes de la ventana ${entra ? 'entra' : 'no entra'} (buffer de 8 c)`);
        if (combo) ok(p.cambio.mezcla === D.COMBATE.motor.mezcla.buffer && p.c === 0, 'salir de un buffer usa la mezcla corta');
    }
}
{
    // Táctil: 12 c
    const p = E.crearPeleador(ESTILO, { tactil: true });
    E.paso(p, apretar('atacar'));
    const d = D.marca('recuperacion+10', F);
    tajoHasta(p, d - 12);
    E.paso(p, apretar('atacar'));
    const serial = p.cambio.n;
    tajoHasta(p, d);
    ok(p.cambio.n !== serial, 'en táctil el buffer guarda 12 c');
}
{
    // Gana la última, salvo la defensa
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('atacar'));
    E.paso(p, apretar('defensa'));
    E.paso(p, apretar('atacar'));
    ok(p.buffer && p.buffer.tipo === 'defensa', 'atacar después de la defensa no la pisa');
    tajoHasta(p, 10);
    E.paso(p, apretar('esquivar'));
    ok(p.buffer && p.buffer.tipo === 'esquivar', 'gana la última (la defensa ya había vencido)');
    const q = E.crearPeleador(ESTILO);
    E.paso(q, { atacar: 'apretar', defensa: 'apretar' });
    ok(q.estado === 'desvio', 'si llegan atacar y defensa en el mismo cuadro, gana la defensa');
}
{
    // Hitstop: el buffer no envejece
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('atacar'));
    E.paso(p, apretar('atacar'));
    E.congelar(p, 20);
    correr(p, 20);
    ok(p.buffer && p.buffer.edad === 1 && p.c === 1, 'durante el hitstop nada avanza ni envejece');
    ok(p.quieto === true, 'p.quieto avisa al motor de animación');
    E.paso(p, nada);
    ok(p.quieto === false && p.c === 2, 'después del hitstop sigue');
}

// ---------- 5. Cancelaciones ----------
{
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('atacar'));
    tajoHasta(p, D.marca('recuperacion+10', F));
    const serial = p.cambio.n;
    E.paso(p, apretar('atacar'));
    ok(p.cambio.n === serial + 1 && p.clave === 'tajo' && p.c === 0, 'combo dentro de la ventana');
}
{
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('atacar'));
    tajoHasta(p, D.marca('recuperacion+0', F) - 1);
    E.paso(p, apretar('defensa'));
    ok(p.estado === 'desvio', 'a desvío desde el primer cuadro de la recuperación (Sekiro)');
    const q = E.crearPeleador(ESTILO);
    E.paso(q, apretar('atacar'));
    tajoHasta(q, F.anticipacion);
    E.paso(q, apretar('esquivar'));
    ok(q.estado === 'ataque', 'no se puede esquivar a mitad del golpe');
}
{
    // siConecto: solo si el golpe pegó
    const est = clon(ESTILO);
    est.ataques.tajo.cancelar = [{ a: ['tajo'], desde: 'activo+0', siConecto: true }];
    for (const pego of [false, true]) {
        const p = E.crearPeleador(est);
        E.paso(p, apretar('atacar'));
        tajoHasta(p, F.anticipacion);
        if (pego) E.conecto(p);
        const serial = p.cambio.n;
        E.paso(p, apretar('atacar'));
        ok((p.cambio.n !== serial) === pego, `siConecto: ${pego ? 'pegó y encadena' : 'no pegó y no encadena'}`);
    }
}
{
    // Esquiva: hacia donde apunta mover; cancelable a ataque al final
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('esquivar', { mover: [0, 1] }));
    ok(p.estado === 'esquiva' && casi(p.dir[0], 0) && casi(p.dir[1], 1), 'la esquiva va hacia mover');
    const q = E.crearPeleador(ESTILO);
    E.paso(q, apretar('esquivar'));
    ok(casi(q.dir[0], -1), 'sin dirección, la esquiva va atrás');
    const ac = ESTILO.acciones.esquiva;
    while (q.c < D.marca('recuperacion+3', ac.fases) - 1) E.paso(q, nada);
    E.paso(q, apretar('atacar'));
    ok(q.estado === 'ataque', 'la esquiva se cancela a ataque en su último tramo');
}

// ---------- 6. Recibir ----------
const golpe = { reaccion: 'alto_leve', altura: 'alto' };
{
    const p = E.crearPeleador(ESTILO);
    E.paso(p, nada);
    ok(E.recibir(p, golpe).resultado === 'golpeado' && p.estado === 'reaccion' && p.clave === 'alto_leve', 'en guardia, el golpe hace reaccionar');
    const total = D.largoFases(COMB.reacciones.alto_leve.fases);
    correr(p, total);
    ok(p.estado === 'guardia', 'la reacción termina sola');
}
{
    // Desvío: dentro de la ventana desvía; después, con la defensa suelta, recibe; mantenida, bloquea
    const ac = ESTILO.acciones.desvio, fin = ac.fases.anticipacion + ac.fases.activo;
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('defensa'));
    ok(E.recibir(clon(p), golpe).resultado === 'desviado', 'desvío en el primer cuadro');
    while (p.c < fin - 1) E.paso(p, nada);
    ok(E.recibir(clon(p), golpe).resultado === 'desviado', 'desvío en el último cuadro de la ventana');
    E.paso(p, nada);
    ok(E.recibir(clon(p), golpe).resultado === 'golpeado', 'después de la ventana, sin defensa, recibe');
    const t = E.crearPeleador(ESTILO, { tactil: true });
    E.paso(t, apretar('defensa'));
    while (t.c < fin + 1) E.paso(t, nada);
    ok(E.recibir(clon(t), golpe).resultado === 'desviado', 'en táctil la ventana tiene 2 c más');
    E.paso(t, nada); E.paso(t, nada);
    ok(E.recibir(clon(t), golpe).resultado === 'golpeado', 'y no más');
    const m = E.crearPeleador(ESTILO);
    E.paso(m, apretar('defensa'));
    while (m.c < fin) E.paso(m, { defensa: 'mantener' });
    ok(E.recibir(clon(m), golpe).resultado === 'bloqueado', 'desvío fuera de la ventana con la defensa mantenida = bloqueo');
    correr(m, D.largoFases(ac.fases), { defensa: 'mantener' });
    ok(m.estado === 'bloqueo', 'el desvío mantenido pasa a bloqueo');
    ok(E.recibir(m, golpe).resultado === 'bloqueado' && m.estado === 'bloqueo', 'el bloqueo bloquea y sigue');
    E.paso(m, nada);
    ok(m.estado === 'guardia', 'soltar la defensa deja el bloqueo');
}
{
    // i-frames de la esquiva (+2 c en táctil) y armadura
    const ac = ESTILO.acciones.esquiva, f = ac.fases;
    for (const tactil of [false, true]) {
        const p = E.crearPeleador(ESTILO, { tactil });
        E.paso(p, apretar('esquivar'));
        const ini = D.marca(ac.iframes[0][0], f), fin = D.marca(ac.iframes[0][1], f) + (tactil ? 2 : 0);
        const res = [];
        while (p.c < D.largoFases(f) - 1) { res.push([p.c, E.recibir(clon(p), golpe).resultado]); E.paso(p, nada); }
        ok(res.every(([c, r]) => (c >= ini && c <= fin) === (r === 'esquivado')), `i-frames de la esquiva justo en su tramo${tactil ? ' (+2 c en táctil)' : ''}`);
    }
    const est = clon(ESTILO);
    est.ataques.tajo.armadura = [['activo+0', 'activo+3']];
    est.ataques.tajo.iframes = [['activo+0', 'activo+3']];
    const p = E.crearPeleador(est);
    E.paso(p, apretar('atacar'));
    tajoHasta(p, F.anticipacion);
    ok(E.recibir(p, golpe).resultado === 'armadura' && p.estado === 'ataque', 'la armadura gana a los i-frames y no interrumpe');
    est.ataques.tajo.ininterrumpible = true;
    const q = E.crearPeleador(est);
    E.paso(q, apretar('atacar'));
    ok(E.recibir(q, golpe).resultado === 'sinEfecto', 'contra y remate (ininterrumpible) no se interrumpen');
    const r = E.crearPeleador(ESTILO);
    E.fijarEstado(r, 'muerto');
    ok(E.recibir(r, golpe).resultado === 'sinEfecto', 'al muerto no le pasa nada');
    E.paso(r, apretar('atacar'));
    ok(r.estado === 'muerto', 'y no ataca');
}
{
    // Reglas del estilo
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('defensa'));
    const reglas = { alRecibir: (q, g, res) => (g.peligro === 'barrido' && res === 'desviado' ? 'golpeado' : res) };
    ok(E.recibir(p, { ...golpe, peligro: 'barrido' }, reglas).resultado === 'golpeado' && p.estado === 'reaccion', 'las reglas del estilo pueden cambiar el resultado (un barrido no se desvía)');
    const q = E.crearPeleador(ESTILO);
    E.paso(q, apretar('atacar'));
    E.reaccionar(q, 'desviado');
    ok(q.estado === 'reaccion' && q.clave === 'desviado', 'reaccionar: el atacante desviado');
}

// ---------- 7. Avance y alcance ----------
{
    const p = E.crearPeleador(ESTILO);
    E.paso(p, apretar('atacar'));
    let total = 0, fuera = 0;
    while (p.estado === 'ataque') { E.paso(p, nada); total += p.mov[0]; if (p.c > F.anticipacion && p.mov[0] !== 0) fuera++; }
    ok(casi(total, tajo.avance.hasta, 1e-9), `el tajo avanza ${tajo.avance.hasta} bloques (avanzó ${total})`);
    ok(fuera === 0, 'el avance ocurre solo en su fase');
    const q = E.crearPeleador(ESTILO);
    E.paso(q, apretar('esquivar', { mover: [0, -1] }));
    let lado = 0;
    while (q.estado === 'esquiva') { E.paso(q, nada); lado += q.mov[1]; }
    ok(casi(lado, -ESTILO.acciones.esquiva.avance.hasta, 1e-9), 'la esquiva lateral avanza de lado');
}
ok(E.alcanza(tajo, { x: 0, z: 0, yaw: 0 }, { x: 0, z: 2 }), 'alcanza adelante');
ok(!E.alcanza(tajo, { x: 0, z: 0, yaw: 0 }, { x: 0, z: 3 }), 'no alcanza lejos');
ok(!E.alcanza(tajo, { x: 0, z: 0, yaw: 0 }, { x: 0, z: -1 }), 'no alcanza atrás');
ok(E.alcanza(tajo, { x: 0, z: 0, yaw: Math.PI / 2 }, { x: 2, z: 0 }), 'alcanza con giro');

// ---------- 8. Reglas de validar ----------
const reglas = (d, c = COMB) => R.reglasEstilo(d, { combate: c }).filter(r => r.tipo === 'error').map(r => r.texto);
const debe = (cambia, quiere) => {
    const d = clon(ESTILO); cambia(d);
    const e = reglas(d);
    ok(e.some(x => x.includes(quiere)), `validar debía avisar «${quiere}» (salió ${JSON.stringify(e)})`);
};
ok(reglas(ESTILO).length === 0, `estilo-prueba.json sin errores (${reglas(ESTILO).join(' · ')})`);
ok(R.reglasCombate(COMB).filter(r => r.tipo === 'error').length === 0, 'combate.json sin errores');
debe(d => { d.ataques.tajo.fases = { anticipacion: 0, activo: 0, recuperacion: 0 }; }, 'no suman');
debe(d => { d.ataques.tajo.fases.activo = 0; }, 'al menos 1 cuadro activo');
debe(d => { d.ataques.tajo.cancelar[0].hasta = 'recuperacion+40'; }, 'fuera de la acción');
debe(d => { d.ataques.tajo.cancelar[0].desde = 'recuperacion+5'; d.ataques.tajo.cancelar[0].hasta = 'activo+0'; }, 'después de terminar');
debe(d => { d.ataques.tajo.cancelar[0].a = ['tajo9']; }, 'no existe «tajo9»');
debe(d => { d.ataques.tajo.peligro = 'barrido'; }, 'al menos 24 cuadros');
debe(d => { d.anim.tajo.canales.codoD.k[1][2] = 0.5; }, 'fuera del límite de codoD');
debe(d => { d.anim.guardia.canales.rodD = -0.3; }, 'fuera del límite de rodD');
debe(d => { d.anim.tajo.canales.bDx.k[2][3] = 'rebote'; }, 'no existe la curva «rebote»');
debe(d => { d.anim.tajo.canales.bDx.k[1] = ['a', 0.01, -2.2]; }, 'va antes que la clave anterior');
debe(d => { d.anim.tajo.canales.bDx.k[1] = [0.5, -2.2]; }, 'con reloj «fases»');
debe(d => { d.ataques.tajo.anim = 'nada'; }, 'no existe la animación «nada»');
debe(d => { d.ataques.tajo.reaccion = 'volar'; }, 'no existe la reacción «volar»');
debe(d => { d.controles.atacar = 'patada'; }, '$.controles.atacar');
debe(d => { d.guardia.anim = 'tajo'; }, 'usan t');
{
    const d = clon(ESTILO); d.anim.tajo.canales.codoD.k[1][2] = -2.8;
    ok(reglas(d).length > 0 && R.reglasEstilo(d, { combate: COMB, limites: { codoD: [-3, 0] } }).filter(r => r.tipo === 'error').length === 0, 'los límites de poses.json cambian lo que vale');
}
{
    const c = clon(COMB); c.curvas.suave = [[0, 0], [0.6, 0.5], [0.5, 1]];
    ok(R.reglasCombate(c).some(r => r.tipo === 'error' && r.texto.includes('$.curvas.suave')), 'una curva desordenada es un error');
}
{
    const l = R.lineaDeTiempo(tajo);
    ok(l.some(x => x.includes('aaaaaaaaaggggrrrrrrrrrrrrrrrr')), 'la línea de tiempo dibuja las fases');
    ok(l.some(x => x.startsWith('avance') && x.includes('=========.')), 'y el avance');
}

console.log(`combate-nucleo.mjs: ${pruebas - fallos}/${pruebas} bien`);
process.exit(fallos ? 1 : 0);
