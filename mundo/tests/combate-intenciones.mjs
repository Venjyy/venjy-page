// =========================================================
// Prueba de las intenciones del combate (bloque 8 · N4, mundo/COMBATE.md §15.1)
// Ejecutar: node mundo/tests/combate-intenciones.mjs
// Cubre supervivencia/combate/intenciones.js con mundo/datos/combate.json (eventos simulados, sin navegador):
//   1. PC: mover en el eje según el lado, apretar / mantener / soltar, toque más corto que un cuadro, altura del
//      cuadro en que se aprieta, esquiva con dirección, Q + E, segundo perfil (solo teclado), repetición del sistema.
//   2. Carga: mantener atacar da fuerte a los teclas.fuerte cuadros; soltar antes da el ataque normal.
//   3. Táctil: toque, deslizar arriba o abajo con el umbral de px y de ms, sin falsos positivos (horizontal, tarde,
//      corto), mantener, joystick flotante con zona muerta, esquiva en la zona libre, ESPECIAL mantenido.
//   4. Mando: botones del mapeo estándar, stick con zona muerta y altura.
//   5. Vibración: patrón escalado por la intensidad, apagable.
//   6. Buffer con estados.paso(): lo apretado 10 c antes de la ventana se pierde en PC (8) y queda en táctil (12);
//      la altura del deslizamiento llega al buffer.
//   7. Los ajustes salen de combate.json (umbral distinto) y lo que falta usa el código.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const leerJSON = n => JSON.parse(readFileSync(resolve(raiz, 'mundo/datos', n + '.json'), 'utf8'));
const D = await imp('mundo/supervivencia/combate/datos.js');
const E = await imp('mundo/supervivencia/combate/estados.js');
const I = await imp('mundo/supervivencia/combate/intenciones.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { console.error('FALLO: ' + msg); fallos++; } };
const clon = o => JSON.parse(JSON.stringify(o));

const COMB = leerJSON('combate'), ESTILO = leerJSON('estilo-prueba');
D.fijarCombate(COMB);
const U = D.COMBATE.tactil.deslizar, ESQ = D.COMBATE.tactil.esquiva, JOY = D.COMBATE.tactil.joystick;
const FUERTE = D.COMBATE.teclas.fuerte, NEUTRA = D.COMBATE.entrada.alturaNeutra;

// Reloj de 60 Hz: cada leer() es un cuadro
const reloj = () => { let t = 1000; return { t: () => t, cuadro: (it, n = 1) => { let r; for (let i = 0; i < n; i++) { t += 1000 / 60; r = it.leer(t); } return r; } }; };

// ---------- 1. PC ----------
{
    const it = I.crearIntenciones({ perfil: 'raton' }), r = reloj();
    ok(it.teclaAbajo('KeyD') === true, 'D es del combate');
    let x = r.cuadro(it);
    ok(x.mover[0] === 1 && x.mover[1] === 0, 'D adelante con lado +1');
    it.fijarLado(-1);
    x = r.cuadro(it);
    ok(x.mover[0] === -1, 'D atrás con lado -1 (mira a la izquierda)');
    it.teclaArriba('KeyD'); it.fijarLado(1);
    ok(r.cuadro(it).mover[0] === 0, 'sin tecla no se mueve');

    it.teclaAbajo('Mouse0');
    x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === NEUTRA, 'clic = atacar apretar con altura neutra');
    ok(r.cuadro(it).atacar === 'mantener', 'luego mantener');
    it.teclaArriba('Mouse0');
    ok(r.cuadro(it).atacar === 'soltar', 'al soltar, soltar');
    ok(r.cuadro(it).atacar === undefined, 'y después nada');

    it.teclaAbajo('Mouse0'); it.teclaArriba('Mouse0');
    x = r.cuadro(it);
    ok(x.atacar === 'apretar', 'un clic más corto que un cuadro no se pierde');
    ok(r.cuadro(it).atacar === 'soltar', 'y suelta en el cuadro siguiente');

    it.teclaAbajo('KeyW'); it.teclaAbajo('Mouse0');
    x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === 'alto', 'W + clic = alto');
    it.teclaArriba('KeyW'); it.teclaAbajo('KeyS');
    x = r.cuadro(it);
    ok(x.atacar === 'mantener' && x.altura === 'bajo', 'la altura del cuadro sigue a W/S, pero el ataque ya salió');
    it.teclaArriba('KeyS'); it.teclaArriba('Mouse0'); r.cuadro(it); r.cuadro(it);

    it.teclaAbajo('KeyS'); it.teclaAbajo('Mouse2');
    x = r.cuadro(it);
    ok(x.defensa === 'apretar' && x.altura === 'bajo', 'S + clic derecho = defensa baja');
    it.teclaArriba('Mouse2'); it.teclaArriba('KeyS'); r.cuadro(it); r.cuadro(it);

    it.teclaAbajo('KeyW'); it.teclaAbajo('ShiftLeft');
    x = r.cuadro(it);
    ok(x.esquivar === 'apretar' && x.mover[1] === 1, 'Shift + W = esquiva lateral hacia el fondo');
    ok(r.cuadro(it).mover[1] === 0, 'W sola no camina de lado');
    it.teclaArriba('KeyW'); it.teclaArriba('ShiftLeft'); r.cuadro(it);
    it.teclaAbajo('KeyA'); it.teclaAbajo('ShiftRight');
    x = r.cuadro(it);
    ok(x.esquivar === 'apretar' && x.mover[0] === -1 && x.mover[1] === 0, 'Shift + A = esquiva atrás');
    it.teclaArriba('KeyA'); it.teclaArriba('ShiftRight'); r.cuadro(it); r.cuadro(it);

    it.teclaAbajo('KeyQ');
    x = r.cuadro(it);
    ok(x.especial === 'apretar' && !x.modoEspecial, 'Q sola = especial');
    it.teclaAbajo('KeyE');
    x = r.cuadro(it);
    ok(x.agarre === 'apretar' && x.modoEspecial === 'apretar', 'Q + E = modoEspecial');
    ok(!r.cuadro(it).modoEspecial, 'modoEspecial dura un cuadro');
    it.teclaArriba('KeyQ'); it.teclaArriba('KeyE'); r.cuadro(it); r.cuadro(it);

    it.teclaAbajo('Space');
    ok(r.cuadro(it).saltar === 'apretar', 'Espacio = saltar');
    ok(it.teclaAbajo('Space') === true && r.cuadro(it).saltar === 'mantener', 'la repetición del sistema no vuelve a apretar');
    it.teclaArriba('Space');
    ok(it.teclaAbajo('KeyZ') === false, 'una tecla ajena no es del combate');

    it.fijarPerfil('teclado');
    ok(it.teclaAbajo('KeyA') === false, 'en el perfil solo teclado A no es del combate');
    it.teclaAbajo('ArrowUp'); it.teclaAbajo('KeyJ');
    x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === 'alto', 'solo teclado: ↑ + J = ataque alto');
    it.teclaAbajo('ArrowRight');
    ok(r.cuadro(it).mover[0] === 1, 'solo teclado: → adelante');
    it.soltarTodo();
    ok(r.cuadro(it).atacar === undefined || true, 'soltarTodo no truena');
}

// ---------- 2. Carga ----------
{
    ok(I.cargaDe(ESTILO) === !!(ESTILO.controles && ESTILO.controles.fuerte), 'cargaDe lee estilo.controles.fuerte');
    ok(I.cargaDe({ controles: { fuerte: 'golpe' } }) && !I.cargaDe(null), 'cargaDe con y sin fuerte');
    const it = I.crearIntenciones({ carga: true }), r = reloj();
    it.teclaAbajo('KeyW'); it.teclaAbajo('Mouse0');
    let x = r.cuadro(it);
    ok(x.atacar === undefined && x.fuerte === undefined, 'con carga el ataque espera');
    it.teclaArriba('KeyW');
    r.cuadro(it, 3);
    it.teclaArriba('Mouse0');
    x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === 'alto', 'soltar antes de la carga = ataque normal con la altura del cuadro en que se apretó');
    ok(r.cuadro(it).atacar === undefined, 'el ataque normal sale una sola vez');

    it.teclaAbajo('Mouse0');
    const salidas = [];
    for (let i = 0; i < FUERTE + 2; i++) salidas.push(r.cuadro(it));
    ok(salidas.findIndex(s => s.fuerte === 'apretar') === FUERTE - 1, `fuerte sale en el cuadro ${FUERTE} manteniendo`);
    ok(salidas.every(s => !s.atacar), 'y no sale el ataque normal');
    ok(salidas[FUERTE].fuerte === 'mantener', 'luego fuerte mantener');
    it.teclaArriba('Mouse0');
    x = r.cuadro(it);
    ok(x.fuerte === 'soltar' && !x.atacar, 'al soltar, fuerte soltar (sin ataque normal)');
}

// ---------- 3. Táctil ----------
{
    const it = I.crearIntenciones(), r = reloj();
    let t = r.t();
    // Toque
    it.tactilAbajo('atacar', 1, 300, 300, t);
    ok(r.cuadro(it).atacar === undefined, 'ATACAR espera para saber qué gesto es');
    it.tactilArriba(1, 302, 303, r.t());
    let x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === NEUTRA, 'toque = ataque con altura neutra');
    ok(r.cuadro(it).atacar === 'soltar', 'y suelta');
    r.cuadro(it);

    // Deslizar arriba justo en el umbral: sale en ese momento, sin esperar a soltar
    t = r.t();
    it.tactilAbajo('atacar', 2, 300, 300, t);
    it.tactilMover(2, 300, 300 - U.px, t + U.ms / 2);
    x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === 'alto', `deslizar ${U.px} px arriba = ataque alto`);
    ok(r.cuadro(it).atacar === 'mantener', 'el dedo sigue apoyado: mantener');
    it.tactilArriba(2, 300, 300 - U.px, r.t());
    r.cuadro(it); r.cuadro(it);

    // Un px menos: no cuenta
    t = r.t();
    it.tactilAbajo('atacar', 3, 300, 300, t);
    it.tactilMover(3, 300, 300 - (U.px - 1), t + 10);
    it.tactilArriba(3, 300, 300 - (U.px - 1), t + 40);
    x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === NEUTRA, `${U.px - 1} px no es deslizamiento: es un toque`);
    r.cuadro(it); r.cuadro(it);

    // Deslizar abajo en DEFENSA y mantener = guardia baja
    t = r.t();
    it.tactilAbajo('defensa', 4, 200, 300, t);
    it.tactilMover(4, 205, 300 + U.px + 6, t + 50);
    x = r.cuadro(it);
    ok(x.defensa === 'apretar' && x.altura === 'bajo', 'deslizar abajo en DEFENSA = defensa baja');
    ok(r.cuadro(it, 5).defensa === 'mantener', 'mantener = guardia');
    it.tactilArriba(4, 205, 300 + U.px + 6, r.t());
    ok(r.cuadro(it).defensa === 'soltar', 'soltar la guardia');
    r.cuadro(it);

    // Horizontal: no es deslizamiento de altura
    t = r.t();
    it.tactilAbajo('atacar', 5, 300, 300, t);
    it.tactilMover(5, 300 + 40, 300 - 20, t + 30);
    it.tactilArriba(5, 340, 280, t + 60);
    x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === NEUTRA, 'deslizar de lado no cambia la altura');
    r.cuadro(it); r.cuadro(it);

    // Tarde: pasados los ms ya es mantener, y moverse después no cambia nada
    t = r.t();
    it.tactilAbajo('atacar', 6, 300, 300, t);
    x = r.cuadro(it);
    ok(x.atacar === undefined, 'antes de los ms no sale nada');
    const cuadrosHasta = Math.ceil(U.ms / (1000 / 60));
    const salidas = [];
    for (let i = 0; i < cuadrosHasta + 1; i++) salidas.push(r.cuadro(it));
    const iMant = salidas.findIndex(s => s.atacar === 'apretar');
    ok(iMant >= 0 && salidas[iMant].altura === NEUTRA, `mantener ${U.ms} ms = ataque con altura neutra (sin soltar)`);
    it.tactilMover(6, 300, 300 - 60, r.t());
    ok(r.cuadro(it).atacar === 'mantener', 'deslizar después de decidir no vuelve a apretar');
    it.tactilArriba(6, 300, 240, r.t());
    r.cuadro(it); r.cuadro(it);

    // Deslizar tarde (pasado el tiempo antes de que llegue un cuadro)
    t = r.t();
    it.tactilAbajo('atacar', 7, 300, 300, t);
    it.tactilMover(7, 300, 300 - U.px - 10, t + U.ms + 5);
    x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === NEUTRA, 'un deslizamiento después de los ms cuenta como mantener');
    it.tactilArriba(7, 300, 270, r.t());
    r.cuadro(it); r.cuadro(it);

    // Cancelar (el sistema corta el toque) sin decidir: no sale nada
    t = r.t();
    it.tactilAbajo('atacar', 8, 300, 300, t);
    it.tactilCancelar(8);
    ok(r.cuadro(it, 12).atacar === undefined, 'un toque cancelado no ataca');

    // Botones simples: salen al apoyar
    it.tactilAbajo('saltar', 9, 500, 300, r.t());
    ok(r.cuadro(it).saltar === 'apretar', 'SALTAR sale al apoyar el dedo');
    it.tactilArriba(9, 500, 300, r.t()); r.cuadro(it);

    // ESPECIAL mantenido
    it.tactilAbajo('especial', 10, 500, 200, r.t());
    const esp = [];
    for (let i = 0; i < D.COMBATE.tactil.especialModo + 1; i++) esp.push(r.cuadro(it));
    ok(esp[0].especial === 'apretar' && esp.findIndex(s => s.modoEspecial === 'apretar') === D.COMBATE.tactil.especialModo - 1,
        `ESPECIAL mantenido ${D.COMBATE.tactil.especialModo} c = modoEspecial`);
    it.tactilArriba(10, 500, 200, r.t()); r.cuadro(it); r.cuadro(it);

    // Joystick flotante
    it.tactilAbajo('joy', 11, 100, 300, r.t());
    it.tactilMover(11, 100 + JOY.radio, 300 - 50, r.t());
    x = r.cuadro(it);
    ok(x.mover[0] === 1 && x.mover[1] === 0, 'joystick a la derecha = adelante; arriba no camina');
    ok(it.joystick().x0 === 100, 'el joystick nace donde se apoya el dedo');
    it.tactilMover(11, 100 + JOY.radio * JOY.zonaMuerta * 0.5, 300, r.t());
    ok(r.cuadro(it).mover[0] === 0, 'zona muerta');
    it.tactilMover(11, 100 - JOY.radio / 2, 300, r.t());
    ok(Math.abs(r.cuadro(it).mover[0] + 0.5) < 1e-9, 'mitad a la izquierda = -0.5');
    it.fijarLado(-1);
    ok(Math.abs(r.cuadro(it).mover[0] - 0.5) < 1e-9, 'con lado -1 se invierte');
    it.fijarLado(1);
    it.tactilArriba(11, 0, 0, r.t());
    ok(r.cuadro(it).mover[0] === 0 && it.joystick() === null, 'al soltar el joystick desaparece');

    // Joystick y ATACAR a la vez (dos dedos: uno en cada lado)
    it.tactilAbajo('joy', 12, 100, 300, r.t());
    it.tactilMover(12, 100 + JOY.radio, 300, r.t());
    it.tactilAbajo('atacar', 13, 600, 300, r.t());
    it.tactilMover(13, 600, 300 + U.px, r.t() + 20);
    x = r.cuadro(it);
    ok(x.mover[0] === 1 && x.atacar === 'apretar' && x.altura === 'bajo', 'caminar y atacar bajo a la vez');
    it.tactilArriba(12); it.tactilArriba(13); r.cuadro(it); r.cuadro(it);

    // Esquiva en la zona libre
    t = r.t();
    it.tactilAbajo('libre', 14, 600, 200, t);
    it.tactilMover(14, 600 - ESQ.px, 200, t + ESQ.ms / 2);
    x = r.cuadro(it);
    ok(x.esquivar === 'apretar' && x.mover[0] === -1 && Math.abs(x.mover[1]) < 1e-9, 'deslizar rápido a la izquierda = esquiva atrás');
    ok(r.cuadro(it).esquivar === 'soltar', 'la esquiva es un pulso');
    it.tactilArriba(14, 560, 200, r.t()); r.cuadro(it);
    t = r.t();
    it.tactilAbajo('libre', 15, 600, 200, t);
    it.tactilMover(15, 600, 200 - ESQ.px - 5, t + ESQ.ms + 30);
    it.tactilArriba(15, 600, 150, t + ESQ.ms + 40);
    ok(r.cuadro(it).esquivar === undefined, 'deslizar lento en la zona libre no esquiva');
    t = r.t();
    it.tactilAbajo('libre', 16, 600, 200, t);
    it.tactilMover(16, 600, 200 - ESQ.px, t + 40);
    x = r.cuadro(it);
    ok(x.esquivar === 'apretar' && x.mover[1] === 1, 'deslizar arriba = paso lateral al fondo');
    it.tactilArriba(16); r.cuadro(it);
    ok(it.ultima === 'tactil', 'última fuente: táctil');
}

// ---------- 4. Mando ----------
{
    const it = I.crearIntenciones(), r = reloj(), M = D.COMBATE.teclas.mando;
    const gp = (apretados = [], ejes = [0, 0]) => ({ buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: apretados.includes(i), value: apretados.includes(i) ? 1 : 0 })), axes: ejes });
    it.leerMando(gp([M.atacar[0]], [0.1, -0.9]));
    let x = r.cuadro(it);
    ok(x.atacar === 'apretar' && x.altura === 'alto' && x.mover[0] === 0, 'botón de atacar + stick arriba = ataque alto; 0.1 en la zona muerta');
    it.leerMando(gp([M.atacar[0]], [0.8, 0]));
    x = r.cuadro(it);
    ok(x.atacar === 'mantener' && Math.abs(x.mover[0] - 0.8) < 1e-9, 'stick a la derecha mueve');
    it.leerMando(gp([], [0, 0]));
    ok(r.cuadro(it).atacar === 'soltar', 'soltar el botón');
    it.leerMando(gp([M.esquivar[0]], [0, 0.9]));
    x = r.cuadro(it);
    ok(x.esquivar === 'apretar' && x.mover[1] === -1, 'gatillo + stick abajo = esquiva lateral hacia la cámara');
    it.leerMando(gp([M.defensa[0], M.esquivar[0]]));
    ok(r.cuadro(it).defensa === 'apretar', 'defensa en su botón');
    it.leerMando(gp([M.foco[0]]));
    ok(r.cuadro(it).foco === 'apretar', 'foco en el otro gatillo');
    ok(it.ultima === 'mando', 'última fuente: mando');
    let efecto = null;
    it.leerMando({ ...gp(), vibrationActuator: { playEffect: (tipo, e) => { efecto = { tipo, ...e }; } } });
    it.vibrar('fuerte');
    ok(efecto && efecto.tipo === 'dual-rumble' && efecto.duration === M.vibracion.fuerte[0], 'el mando vibra con su patrón');
}

// ---------- 5. Vibración ----------
{
    const v = D.COMBATE.tactil.vibracion;
    const p = I.patronVibracion('perfecto');
    ok(Array.isArray(p) && p.length === v.perfecto.length, 'patrón del desvío perfecto');
    const medio = I.patronVibracion('perfecto', { ...v, intensidad: 0.5 });
    ok(medio[0] === Math.round(v.perfecto[0] * 0.5) && medio[1] === v.perfecto[1], 'la intensidad escala lo que vibra, no las pausas');
    ok(I.patronVibracion('perfecto', { ...v, activa: false }) === null, 'apagable');
    ok(I.patronVibracion('perfecto', { ...v, intensidad: 0 }) === null, 'intensidad 0 = no vibra');
    ok(I.patronVibracion('nada') === null, 'tipo desconocido = no vibra');
    const it = I.crearIntenciones();
    it.tactilAbajo('saltar', 1, 0, 0, 0);
    ok(Array.isArray(it.vibrar('golpe')), 'en el táctil vibrar devuelve el patrón (sin navigator no truena)');
}

// ---------- 6. Buffer con estados.paso() ----------
{
    const tajo = ESTILO.ataques.tajo, F = tajo.fases;
    const d = D.marca('recuperacion+10', F); // primera ventana de combo del tajo
    const probar = tactil => {
        const p = E.crearPeleador(ESTILO, { tactil });
        const it = I.crearIntenciones(), r = reloj();
        it.teclaAbajo('Mouse0'); E.paso(p, r.cuadro(it)); it.teclaArriba('Mouse0');
        while (p.c < d - 11) E.paso(p, r.cuadro(it));
        if (tactil) {
            const t = r.t();
            it.tactilAbajo('atacar', 1, 300, 300, t);
            it.tactilMover(1, 300, 300 - U.px, t + 5);
            it.tactilArriba(1, 300, 300 - U.px, t + 10);
        } else { it.teclaAbajo('Mouse0'); it.teclaArriba('Mouse0'); }
        E.paso(p, r.cuadro(it));
        const altura = p.buffer && p.buffer.altura;
        while (p.c < d - 1) E.paso(p, r.cuadro(it));
        return { p, altura };
    };
    const pc = probar(false), ta = probar(true);
    ok(pc.p.clave === 'tajo' && pc.p.buffer === null, 'PC: apretado 10 c antes de la ventana se pierde (buffer 8)');
    ok(ta.p.clave === 'tajo' && ta.p.buffer && ta.p.buffer.tipo === 'atacar', 'táctil: apretado 10 c antes queda (buffer 12)');
    ok(ta.altura === 'alto', 'la altura del deslizamiento llega al buffer');
}

// ---------- 7. Ajustes desde combate.json ----------
{
    const c = clon(COMB);
    c.tactil = { ...c.tactil, deslizar: { px: 30 } };
    D.fijarCombate(c);
    ok(D.COMBATE.tactil.deslizar.px === 30 && D.COMBATE.tactil.deslizar.ms === U.ms, 'umbral del JSON; ms que falta = el del código');
    const it = I.crearIntenciones(), r = reloj(), t = r.t();
    it.tactilAbajo('atacar', 1, 300, 300, t);
    it.tactilMover(1, 300, 300 - 20, t + 10);
    it.tactilArriba(1, 300, 280, t + 20);
    ok(r.cuadro(it).altura === NEUTRA, 'con umbral 30 px, 20 px no son deslizamiento');
    c.teclas = { arena: { raton: { atacar: ['KeyF'] } } };
    D.fijarCombate(c);
    const it2 = I.crearIntenciones(), r2 = reloj();
    it2.teclaAbajo('KeyF');
    ok(r2.cuadro(it2).atacar === 'apretar', 'tecla cambiada en el JSON');
    ok(it2.teclaAbajo('KeyD') === true, 'lo que el perfil del JSON no trae sigue con el código');
    c.teclas = { perfil: 'teclado' };
    D.fijarCombate(c);
    ok(I.crearIntenciones().teclaAbajo('KeyJ') === true, 'perfil por defecto desde el JSON');
    D.fijarCombate(COMB);
}

console.log(`${pruebas - fallos}/${pruebas} pruebas ok`);
if (fallos) process.exit(1);
