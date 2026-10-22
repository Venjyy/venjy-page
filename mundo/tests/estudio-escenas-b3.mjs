// Prueba del editor de escenas, B3c (Etapa B, punto 3): node mundo/tests/estudio-escenas-b3.mjs
// estudio/escenas-b3.mjs (puro): anclas y su recálculo, «Acomodar frases», reloj automático, variantes por skin, escenas nuevas con
// `dispara` y bases para partir (válidas contra el esquema y las reglas), objetos, efectos, sonidos y lugar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar } from '../../estudio/validar.mjs';
import { reglasEscenas, guionDeDatos } from '../datos/escenas.js';
import * as B from '../../estudio/escenas-b3.mjs';
globalThis.window ??= { addEventListener() {} };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { MOLDES } = await import('../supervivencia/moldes.js');
const { GESTOS_AMISTAD } = await import('../supervivencia/escena-amistad-datos.js');
const { durLinea } = await import('../supervivencia/reencuentros.js');
const { gestosDeDatos } = await import('../datos/gestos.js');

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fichaParidad = JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundo', 'tests', 'escenas-paridad.json'), 'utf8'));
const paridad = fichaParidad.escenas;
const poses = JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', 'poses.json'), 'utf8'));
const gestos = new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES), ...gestosDeDatos(poses).map(([g]) => g), ...Object.keys(fichaParidad.poses.gestos)]);
const { PERSONAJES } = await import('../supervivencia/amistad.js');
const nombres = { gestos, durLinea, personas: new Set(PERSONAJES) };
const clon = o => JSON.parse(JSON.stringify(o));
const r2 = v => Math.round(v * 100) / 100;
const errores = (clave, def) => reglasEscenas({ escenas: { [clave]: def } }, nombres).filter(r => r.tipo === 'error');
const esquema = (clave, def) => validar({ version: 1, escenas: { [clave]: def } }, 'escenas');

// Escena de trabajo: 3 frases sin d, con gestos que dependen de ellas
const base = () => ({
    tipo: 'guion', T: 20, r: 1.3,
    lineas: [
        { q: 'n', a: 1, texto: { es: 'Hola, ¿cómo estás hoy?', en: 'Hi, how are you today?' } },
        { q: 'j', a: 5, texto: { es: 'Muy bien, gracias por venir.', en: 'Very well, thanks for coming.' } },
        { q: 'n', a: 9, texto: { es: 'Entonces, choquemos esos puños.', en: 'Then, fist bump.' } }
    ],
    pista: { n: [['habla', 1, 3], ['secreto', 9, 12, { reloj: 8.6 }]], j: [['habla', 5, 7]] }
});

// ---------- Anclas ----------
{
    let d = base();
    const dur0 = durLinea(d.lineas[0].texto);
    const r = B.fijarAncla(d, { k: 'tramo', q: 'j', i: 0 }, 0, 'fin', durLinea);
    ok(r && r.cambio && r.def.pista.j[0][3].ancla.mas === r2(5 - (1 + dur0)), 'fijarAncla: mas = diferencia actual');
    ok(r.def.pista.j[0][1] === 5, 'fijarAncla no mueve el tramo');
    d = r.def;
    ok(B.fijarAncla(d, { k: 'frase', i: 0 }, 0, 'fin', durLinea) === null, 'una frase no se ancla a sí misma');
    ok(B.fijarAncla(d, { k: 'frase', i: 0 }, 1, 'fin', durLinea) === null, 'una frase solo depende de una anterior');
    ok(B.fijarAncla(d, { k: 'frase', i: 9 }, 0, 'fin', durLinea) === null, 'elemento que no existe');
    ok(B.fijarAncla(d, { k: 'tramo', q: 'j', i: 0 }, 7, 'fin', durLinea) === null, 'frase que no existe');
    // la frase 0 se estira: el tramo anclado a su fin se corre con ella
    const e = clon(d); e.lineas[0].d = 4;
    const n = B.sincronizar(e, { k: 'frase', i: 0 }, durLinea);
    ok(n.cambio && Math.abs(n.def.pista.j[0][1] - (1 + 4 + d.pista.j[0][3].ancla.mas)) < 1e-9, 'estirar la frase corre lo anclado a su fin');
    ok(Math.abs((n.def.pista.j[0][2] - n.def.pista.j[0][1]) - 2) < 1e-9, 'el tramo conserva su duración');
    // mover el tramo anclado cambia su mas, no lo suelta
    const m = clon(d); m.pista.j[0][1] = 6; m.pista.j[0][2] = 8;
    const s = B.sincronizar(m, { k: 'tramo', q: 'j', i: 0 }, durLinea);
    ok(s.def.pista.j[0][1] === 6 && s.def.pista.j[0][3].ancla.mas === r2(6 - (1 + dur0)), 'mover un elemento anclado ajusta su mas');
    const q = B.quitarAncla(d, { k: 'tramo', q: 'j', i: 0 });
    ok(q.cambio && q.def.pista.j[0].length === 3, 'quitarAncla deja el tramo de 3 elementos');
    ok(!B.normalizar(d, durLinea).cambio, 'normalizar sin diferencias no cambia nada');
    // el esquema y las reglas aceptan lo que escribe (incluido el sonido con ancla)
    const conSonido = B.agregarEvento(d, 'sonido', 'golpe', 9, {}, durLinea).def;
    const completa = B.fijarAncla(conSonido, { k: 'sonido', i: 0 }, 1, 'inicio', durLinea).def;
    ok(esquema('x', completa).length === 0, 'esquema: ' + esquema('x', completa).join(' | '));
    ok(errores('x', completa).length === 0, 'reglas: ' + JSON.stringify(errores('x', completa)));
    ok(guionDeDatos(completa, { durLinea }).sonidos.every(x => x.length === 2), 'guionDeDatos quita el ancla del sonido');
    // el aviso de «número guardado no coincide» salta con un sonido anclado mal
    const mal = clon(completa); mal.sonidos[0][0] = 15;
    ok(reglasEscenas({ escenas: { x: mal } }, nombres).some(r => /no coincide con su ancla/.test(r.texto)), 'regla: sonido que no coincide con su ancla');
}

// ---------- Acomodar frases ----------
{
    const d = base();
    d.lineas[1].d = 1; // apurada
    let r = B.agregarEvento(d, 'efecto', 'chispa', 9.3, { frase: 2, mas: 0.3 }, durLinea);
    r = B.agregarObjeto(r.def, 'tomate', 'n', 'brazoD');
    r = B.objetoEntreFrases(r.def, 0, 2, 2, durLinea);
    const a = B.acomodarFrases(r.def, durLinea);
    ok(a.cambio, 'acomodar cambia una escena desordenada');
    const L = a.def.lineas;
    const d0 = durLinea(L[0].texto);
    ok(L[0].a === 1, 'la primera frase se queda');
    ok(L[1].a === r2(1 + d0 + B.HUECO), 'la 2.ª empieza 0,15 s después del fin de la 1.ª');
    ok(L[1].d === durLinea(L[1].texto), 'una frase apurada sube a lo que se alcanza a leer');
    ok(L[2].a === r2(L[1].a + L[1].d + B.HUECO), 'la 3.ª sigue a la 2.ª');
    ok(a.def.efectos[0][0] === r2(L[2].a + 0.3), 'el efecto anclado se movió con la frase 3');
    ok(a.def.objetos[0].desde === L[2].a, 'el objeto anclado se movió con la frase 3');
    ok(!B.acomodarFrases(a.def, durLinea).cambio, 'acomodar dos veces no cambia más');
    ok(errores('x', a.def).length === 0, 'la escena acomodada cumple las reglas: ' + JSON.stringify(errores('x', a.def)));
    const t = base(); t.T = 8;
    const at = B.acomodarFrases(t, durLinea).def;
    ok(at.T >= at.lineas[2].a + durLinea(at.lineas[2].texto), 'T crece si la última frase pasa');
    const c = base(); c.lineas[2].ancla = { frase: 0, de: 'fin', mas: 1 };
    ok(!('ancla' in B.acomodarFrases(c, durLinea).def.lineas[2]), 'acomodar suelta el ancla propia de las frases');
}

// ---------- Borrar una frase deja las anclas sanas ----------
{
    let d = base();
    d = B.fijarAncla(d, { k: 'tramo', q: 'n', i: 1 }, 2 - 1 + 1, 'inicio', durLinea).def; // a la frase 2
    d = B.fijarAncla(d, { k: 'tramo', q: 'j', i: 0 }, 0, 'fin', durLinea).def;            // a la frase 0
    const sin = clon(d); sin.lineas.splice(1, 1);                                          // se borra la 1
    const r = B.repararAnclasTrasBorrar(sin, 1);
    ok(r.def.pista.n[1][3].ancla.frase === 1, 'la ancla a la frase 2 baja a la 1');
    ok(r.def.pista.j[0][3].ancla.frase === 0, 'la ancla a la frase 0 no cambia');
    const sin0 = clon(d); sin0.lineas.splice(0, 1);
    const r0 = B.repararAnclasTrasBorrar(sin0, 0);
    ok(r0.def.pista.j[0].length === 3, 'la ancla a la frase borrada se suelta (el número queda)');
    ok(errores('x', r.def).length === 0, 'tras borrar sin errores');
}

// ---------- Reloj automático ----------
{
    const antes = base();
    const des = clon(antes);
    des.pista.n[1][1] = 10; des.pista.n[1][2] = 13;
    const r = B.relojAuto(antes, des, 'n', 1);
    ok(r.cambio && r.def.pista.n[1][3].reloj === 9.6, 'mover un secreto con reloj automático lo corre (= desde − 0,4)');
    const manual = base(); manual.pista.n[1][3].reloj = 7;
    const m2 = clon(manual); m2.pista.n[1][1] = 10; m2.pista.n[1][2] = 13;
    ok(!B.relojAuto(manual, m2, 'n', 1).cambio, 'un reloj puesto a mano no se toca');
    const nuevo = base(); nuevo.pista.j.push(['abrazo', 10, 14]);
    ok(B.relojAuto(base(), nuevo, 'j', 1).def.pista.j[1][3].reloj === 9.6, 'un abrazo recién soltado recibe su reloj');
    const habla = base(); habla.pista.j.push(['habla', 10, 14]);
    ok(!B.relojAuto(base(), habla, 'j', 1).cambio, 'otros gestos no llevan reloj');
}

// ---------- Variantes y dispara ----------
{
    const escenas = { 'lalo-bienvenida': clon(paridad.escenas['lalo-bienvenida']), 'lona-bufanda': clon(paridad.escenas['lona-bufanda']) };
    escenas['lalo-bienvenida'].lineas[0].texto.revisado = true;
    const v = B.variante(escenas, 'lalo-bienvenida', 'pony');
    ok(v.clave === 'lalo-bienvenida-pony' && v.def.dispara.skin === 'pony', 'variante: copia con otra skin');
    ok(v.def.base === 'lalo-bienvenida', 'variante: recuerda de cuál partió');
    const copia = clon(v.def); delete copia.dispara; delete copia.base;
    const orig = clon(escenas['lalo-bienvenida']); delete orig.dispara; orig.lineas.forEach(l => delete l.texto.revisado);
    ok(JSON.stringify(copia) === JSON.stringify(orig), 'variante: solo cambia dispara.skin (y base; se pierde la marca revisado)');
    ok(B.variante(escenas, 'lalo-bienvenida', 'lalo').error === 'misma-skin', 'variante: misma skin');
    escenas[v.clave] = v.def;
    ok(B.variante(escenas, 'lalo-bienvenida', 'pony').error === 'repetido', 'variante: no repite un dispara');
    const vm = B.variante(escenas, 'lona-bufanda', 'pony');
    ok(vm.clave === 'lona-bufanda-pony', 'variante de un momento sin skin');
    ok(errores('x', vm.def).length === 0, 'la variante cumple las reglas');
    const re = { tipo: 'guion', T: 5, r: 1, lineas: [{ q: 'n', a: 1, texto: { es: 'a', en: 'a' } }], dispara: { tipo: 'reencuentro', personas: ['pony', 'lalo'] } };
    ok(B.variante({ r: re }, 'r', 'pony').error === 'sin-skin', 'los reencuentros no tienen variantes por skin');
    const suelta = clon(re); delete suelta.dispara;
    ok(B.variante({ r: suelta }, 'r', 'pony').error === 'sin-dispara', 'sin dispara no hay variante');
    ok(B.llaveDispara({ tipo: 'reencuentro', personas: ['b', 'a'] }) === B.llaveDispara({ tipo: 'reencuentro', personas: ['a', 'b'] }), 'el reencuentro no depende del orden');
    ok(B.escenaConDispara(escenas, { tipo: 'bienvenida', skin: 'lalo' }) === 'lalo-bienvenida', 'escenaConDispara la encuentra');
    ok(B.escenaConDispara(escenas, { tipo: 'bienvenida', skin: 'lalo' }, 'lalo-bienvenida') === null, 'escenaConDispara ignora la propia');
    ok(B.ponerDispara(escenas, 'lona-bufanda', { tipo: 'bienvenida', skin: 'lalo' }) === null, 'ponerDispara rechaza un dispara repetido');
    ok(B.ponerDispara(escenas, 'lona-bufanda', null).def.dispara === undefined, 'ponerDispara null lo quita');
}

// ---------- Escenas nuevas y bases ----------
{
    const escenas = { 'lalo-bienvenida': clon(paridad.escenas['lalo-bienvenida']) };
    escenas['lalo-bienvenida'].lineas[0].texto.revisado = true;
    const casos = [['corto', { tipo: 'reencuentro', personas: ['pony', 'salonas'] }], ['largo', { tipo: 'reencuentro', personas: ['nacho', 'braulio'] }],
        ['blanco', { tipo: 'momento', persona: 'lona' }], ['lalo-bienvenida', { tipo: 'bienvenida', skin: 'pony' }]];
    for (const [nom, dp] of casos) {
        const r = B.escenaNueva(escenas, dp, nom);
        ok(r.def && r.clave, `base ${nom}: crea`);
        if (!r.def) continue;
        ok(esquema(r.clave, r.def).length === 0, `base ${nom}: esquema ` + esquema(r.clave, r.def).join(' | '));
        ok(errores(r.clave, r.def).length === 0, `base ${nom}: reglas ` + JSON.stringify(errores(r.clave, r.def)));
        ok(!r.def.lineas.some(l => l.texto.revisado), `base ${nom}: sin revisado`);
        if (nom !== 'blanco') ok(r.def.base === nom, `base ${nom}: recuerda de cuál partió`);
        ok(JSON.stringify(r.def.dispara) === JSON.stringify(dp), `base ${nom}: dispara`);
    }
    ok(B.escenaNueva(escenas, { tipo: 'bienvenida', skin: 'lalo' }, 'corto').error === 'repetido', 'nueva: dispara repetido');
    ok(B.escenaNueva(escenas, null, 'blanco').clave === 'escena' && !B.escenaNueva(escenas, null).def.dispara, 'nueva suelta sin dispara');
    ok(B.claveSugerida({ tipo: 'grupo', grupo: 'tomatitos', skin: 'pony' }, []) === 'tomatitos-pony', 'clave sugerida de un grupo');
    ok(B.claveSugerida({ tipo: 'reencuentro', personas: ['a', 'b'] }, ['a-b-reencuentro']) === 'a-b-reencuentro-2', 'clave sugerida no choca');
}

// ---------- Objetos, efectos, sonidos y lugar ----------
{
    let r = B.agregarObjeto(base(), 'tomate', 'j', 'brazoI');
    ok(r.def.objetos[0].id === 'tomate' && r.def.objetos[0].en.hueso === 'brazoI' && r.def.objetos[0].en.q === 'j', 'agregarObjeto');
    ok(B.agregarObjeto(r.def, 'tomate').def.objetos[1].id === 'tomate-2', 'ids que no chocan');
    r = B.cambiarObjeto(r.def, 0, { tam: 0.8, hueso: 'cabeza', mas: [0, 0.2, 0] });
    ok(r.def.objetos[0].tam === 0.8 && r.def.objetos[0].en.hueso === 'cabeza' && r.def.objetos[0].en.mas[1] === 0.2, 'cambiarObjeto');
    r = B.cambiarObjeto(r.def, 0, { tam: null, mas: [0, 0, 0] });
    ok(r.def.objetos[0].tam === undefined && r.def.objetos[0].en.mas === undefined, 'tam null y mas cero se quitan');
    r = B.objetoEntreFrases(r.def, 0, 0, 1, durLinea);
    ok(r.def.objetos[0].desde === 1 && r.def.objetos[0].ancla.frase === 0 && B.fraseQueTermina(r.def, r.def.objetos[0].hasta, durLinea) === 1, 'objetoEntreFrases: desde el inicio de la 0 hasta el fin de la 1');
    ok(B.objetoEntreFrases(r.def, 0, 1, 0, durLinea).cambio === false, 'objetoEntreFrases rechaza hasta antes que desde');
    ok(errores('x', r.def).length === 0, 'objeto cumple las reglas: ' + JSON.stringify(errores('x', r.def)));
    r = B.objetoEntreFrases(r.def, 0, null, null, durLinea);
    ok(r.def.objetos[0].desde === undefined && r.def.objetos[0].hasta === undefined && !r.def.objetos[0].ancla, 'sin frases = toda la escena');
    ok(B.borrarObjeto(r.def, 0).def.objetos === undefined, 'borrar el último objeto quita la clave');

    let e = B.agregarEvento(base(), 'efecto', 'corazon', 8, {}, durLinea);
    e = B.agregarEvento(e.def, 'efecto', 'chispa', 2, { opciones: { alto: 2 } }, durLinea);
    ok(e.i === 0 && e.def.efectos.map(x => x[1]).join() === 'chispa,corazon', 'efectos en orden de tiempo');
    e = B.agregarEvento(e.def, 'efecto', 'humo', 0, { frase: 1 }, durLinea);
    ok(e.def.efectos[e.i][0] === 5 && e.def.efectos[e.i][2].ancla.frase === 1, 'efecto en una frase: anclado a su inicio');
    e = B.cambiarEvento(e.def, 'efecto', e.i, { t: 1 }, durLinea);
    ok(e.i === 0 && e.def.efectos[0][2] === undefined, 'cambiar t suelta el ancla y reordena');
    e = B.cambiarEvento(e.def, 'efecto', 1, { alto: 3, n: 3, en: 'centro' }, durLinea);
    ok(e.def.efectos[1][2].alto === 3 && e.def.efectos[1][2].n === 3 && e.def.efectos[1][2].en === 'centro', 'cambiar opciones del efecto');
    e = B.cambiarEvento(e.def, 'efecto', 1, { alto: null, n: null, en: null }, durLinea);
    ok(e.def.efectos[1].length === 2, 'sin opciones queda [t, tipo]');
    ok(errores('x', e.def).length === 0, 'efectos cumplen las reglas: ' + JSON.stringify(errores('x', e.def)));
    ok(esquema('x', e.def).length === 0, 'efectos cumplen el esquema');
    ok(B.borrarEvento(B.borrarEvento(B.borrarEvento(e.def, 'efecto', 0).def, 'efecto', 0).def, 'efecto', 0).def.efectos === undefined, 'borrar los efectos quita la clave');

    let s = B.agregarEvento(base(), 'sonido', 'golpe', 4, {}, durLinea);
    s = B.agregarEvento(s.def, 'sonido', 'nivel', 0, { frase: 2 }, durLinea);
    ok(s.def.sonidos.length === 2 && s.def.sonidos[1][0] === 9, 'sonidos en orden y en una frase');
    s = B.cambiarEvento(s.def, 'sonido', 1, { nombre: 'visto' }, durLinea);
    ok(s.def.sonidos[1][1] === 'visto', 'cambiar el sonido');
    ok(B.agregarEvento(base(), 'otro', 'x', 1, {}, durLinea) === null, 'tipo de evento desconocido');

    let l = B.ponerLugar(base(), 'centro', { desde: 'hadad', mas: [2.65, 0, -0.5] });
    l = B.ponerLugar(l.def, 'jugador', { desde: 'centro', mas: [0, 0, -2.15] });
    ok(l.def.lugar.centro.mas[0] === 2.65 && l.def.lugar.jugador.desde === 'centro', 'ponerLugar');
    const sinCentro = B.ponerLugar(l.def, 'centro', null).def;
    ok(sinCentro.lugar.centro === undefined, 'quitar una parte del lugar');
    ok(B.ponerLugar(sinCentro, 'jugador', null).def.lugar === undefined, 'sin partes no queda `lugar`');
}

console.log(fallos ? `estudio-escenas-b3: ${fallos} FALLAS` : 'estudio-escenas-b3: todo bien');
process.exit(fallos ? 1 : 0);
