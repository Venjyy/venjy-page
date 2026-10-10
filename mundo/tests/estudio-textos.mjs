// Prueba del Estudio, fase 3 (textos y diálogos ES/EN): node mundo/tests/estudio-textos.mjs
// dialogos.json contra su esquema, la fachada dialogos-datos.js, avisos de texto, glifos de PixelCraft,
// DIALOGOS.md generado, el puente (datos de dialogos y globo) y tienda.json.
// Lo que depende del navegador (editor de textos y globo en el juego) se prueba a mano: ver «Estudio» en PENDIENTES.md.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validar } from '../../estudio/validar.mjs';
import { formatear } from '../../estudio/formato.mjs';
import { avisosDeTexto, glifosFaltantes, variables, esPar } from '../../estudio/avisos-textos.js';
import { leerGlifos, tablaDeRangos } from '../../estudio/glifos.mjs';
import { generarPersonas, cargarContexto, escribirEnDocumento, contarFrases } from '../../estudio/dialogos-md.mjs';
import { crearManejador, DATOS_VIVOS } from '../../estudio/puente-protocolo.js';
import * as D from '../supervivencia/dialogos-datos.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const json = rel => JSON.parse(leer(rel));
const clon = o => JSON.parse(JSON.stringify(o));
const dialogos = json('mundo/datos/dialogos.json');

// ---------- 1. dialogos.json y su esquema ----------
ok(validar(dialogos, 'dialogos').length === 0, 'dialogos.json cumple dialogos.schema.json: ' + validar(dialogos, 'dialogos').slice(0, 3).join(' | '));
ok(formatear(dialogos) === leer('mundo/datos/dialogos.json').replace(/\r\n/g, '\n'), 'dialogos.json está en el formato estable');
{
    const caso = (msg, cambiar) => { const m = clon(dialogos); cambiar(m); ok(validar(m, 'dialogos').length > 0, 'el esquema rechaza: ' + msg); };
    caso('respuesta sin en', m => { delete m.temas.venjy[0].r.en; });
    caso('texto vacío', m => { m.temas.venjy[0].p.es = ''; });
    caso('nivel 9', m => { m.temas.venjy[1].req = { nivel: 9 }; });
    caso('dos requisitos', m => { m.temas.venjy[1].req = { nivel: 1, mj: 'pesca' }; });
    caso('clave desconocida en un tema', m => { m.temas.venjy[0].extra = 1; });
    caso('persona con mayúscula', m => { m.temas.Venjy = []; });
    caso('revisado no booleano', m => { m.temas.venjy[0].p.revisado = 'si'; });
    caso('falta saludos.bajo', m => { delete m.saludos.pony.bajo; });
    caso('regalo sin texto', m => { m.regalos.pony = 'hola'; });
}

// ---------- 2. La fachada exporta lo mismo que el JSON (y lo mismo que el código de antes) ----------
assert.deepStrictEqual(D.TEMAS, dialogos.temas);
assert.deepStrictEqual(D.OPINIONES, dialogos.opiniones);
assert.deepStrictEqual(D.SALUDOS, dialogos.saludos);
assert.deepStrictEqual(D.REGALOS, dialogos.regalos);
assert.deepStrictEqual(D.GESTO_REGALO, dialogos.gestoRegalo || {});
{
    // Paridad con el dialogos-datos.js anterior a la migración (commit 62004ea). Solo mientras nadie haya editado
    // textos: con ediciones del dueño la diferencia es esperada y la prueba avisa, no falla.
    let antes = null;
    try {
        const src = execFileSync('git', ['show', '62004ea:mundo/supervivencia/dialogos-datos.js'], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 24 });
        const tmp = path.join(RAIZ, 'mundo', 'supervivencia', '.dialogos-antes.tmp.mjs');
        fs.writeFileSync(tmp, src);
        try { antes = await import(new URL('file:///' + tmp.replace(/\\/g, '/')).href); } finally { fs.rmSync(tmp, { force: true }); }
    } catch (e) { /* sin git o sin ese commit: no se compara */ }
    if (antes) {
        const sinMarcas = o => JSON.parse(JSON.stringify(o, (k, v) => (k === 'revisado' ? undefined : v)));
        const nombres = [['TEMAS', 'temas'], ['OPINIONES', 'opiniones'], ['SALUDOS', 'saludos'], ['REGALOS', 'regalos'], ['GESTO_REGALO', 'gestoRegalo']];
        const difieren = nombres.filter(([viejo, nuevo]) => JSON.stringify(sinMarcas(antes[viejo])) !== JSON.stringify(sinMarcas(dialogos[nuevo])));
        if (difieren.length) console.log('aviso: dialogos.json ya difiere del dialogos-datos.js original en ' + difieren.map(d => d[0]).join(', ') + ' (esperado si el dueño editó textos)');
    }
}
{
    // aplicarDatosVivos cambia el contenido en el sitio: los objetos exportados siguen siendo los mismos
    const antesTemas = D.TEMAS;
    const copia = clon(dialogos);
    copia.temas.venjy[0].r.es = 'Texto de prueba';
    D.aplicarDatosVivos(copia);
    ok(D.TEMAS === antesTemas && D.TEMAS.venjy[0].r.es === 'Texto de prueba', 'aplicarDatosVivos cambia en el sitio');
    D.aplicarDatosVivos(dialogos);
    ok(D.TEMAS.venjy[0].r.es !== 'Texto de prueba', 'aplicarDatosVivos vuelve al original');
}

// ---------- 3. Avisos de texto ----------
{
    const rangos = leerGlifos(path.join(RAIZ, 'font', 'pixelcraft.ttf'));
    const tipos = (t, g) => avisosDeTexto(t, g).map(a => a.tipo + (a.idioma ? ':' + a.idioma : '')).sort().join(',');
    ok(tipos({ es: 'Hola', en: 'Hi' }, rangos) === '', 'un par normal no avisa');
    ok(tipos({ es: '¿Qué tal, Moisés? Ñandú… «sí»', en: "It's fine — “ok”" }, rangos) === '', 'tildes, ñ, ¿, «», …, — y comillas curvas tienen glifo');
    ok(tipos({ es: 'Hola 😀', en: 'Hi' }, rangos) === 'emoji:es', 'emoji en ES');
    ok(tipos({ es: 'Hola', en: '' }, rangos) === 'par:en', 'par incompleto');
    ok(tipos({ es: 'Tienes {n} cosas', en: 'You have things' }, rangos) === 'plantilla:en', 'plantilla {n} solo en ES');
    ok(tipos({ es: 'Hola', en: 'Hi {n}' }, rangos) === 'plantilla:es', 'plantilla {n} solo en EN');
    ok(tipos({ es: 'Tienes {n}', en: 'You have {n}' }, rangos) === '', 'plantilla en los dos no avisa');
    ok(tipos({ es: 'Ok 日本', en: 'Ok' }, rangos) === 'glifo:es', 'glifo que PixelCraft no tiene (CJK)');
    ok(glifosFaltantes('abc\n', rangos).length === 0, 'el salto de línea no cuenta como glifo faltante');
    ok(tipos({ es: 'x'.repeat(10), en: 'x', max: 5 }, rangos) === 'largo:es', 'largo sobre `max` es error');
    ok(avisosDeTexto({ es: 'x'.repeat(200), en: 'x' }, rangos)[0].nivel === 'aviso', 'largo sin `max` es solo aviso');
    ok(tipos({ es: '日', en: 'x' }, null) === '', 'sin glifos.json no se revisan glifos');
    ok([...variables('a {n} b {nombre} {n}')].sort().join() === 'n,nombre', 'variables de plantilla');
    ok(esPar({ es: '', en: '' }) && !esPar({ es: 'a' }) && !esPar([]), 'esPar');

    // glifos.json es lo que sale de la fuente (si alguien cambia la fuente hay que regenerarlo)
    const t = tablaDeRangos(rangos);
    const g = json('estudio/glifos.json');
    ok(g.total === t.total && JSON.stringify(g.rangos) === JSON.stringify(t.rangos), 'estudio/glifos.json está al día con pixelcraft.ttf (node estudio/cli.mjs glifos)');
    ok(t.total > 1000, 'cmap de PixelCraft leído (' + t.total + ' glifos)');

    // Todos los textos de hoy: sin errores
    let malos = 0;
    const revisar = v => {
        if (esPar(v)) { if (avisosDeTexto(v, rangos).some(a => a.nivel === 'error')) malos++; }
        else if (v && typeof v === 'object') for (const x of Object.values(v)) revisar(x);
    };
    revisar(dialogos.temas); revisar(dialogos.opiniones); revisar(dialogos.saludos); revisar(dialogos.regalos);
    ok(malos === 0, `${malos} textos de dialogos.json con errores de emoji, glifo, par o plantilla`);
}

// ---------- 4. DIALOGOS.md generado ----------
{
    const ctx = await cargarContexto();
    const md = generarPersonas(dialogos, ctx);
    const filas = md.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Pregunta'));
    ok(filas.length > 200 && filas.length <= contarFrases(dialogos), 'el markdown trae las filas de «Hablar» (' + filas.length + ')');
    ok(md.includes('| ¿Qué opinas de Pony? | Amistad: Conocido |'), 'nombres de personas y niveles en las tablas');
    ok(md.includes('| Jefe: El Imbunche de la mina |') && md.includes('| Minijuego: Salir a pescar con Pony |'), 'requisitos de jefe y minijuego con su título');
    ok(md.includes('(al regalar Salmón cocinado o Bacalao cocinado)'), 'regalos con los nombres de objetos favoritos');
    const doc = leer('mundo/DIALOGOS.md').replace(/\r\n/g, '\n');
    ok(escribirEnDocumento(doc, md) === doc, 'mundo/DIALOGOS.md está al día con dialogos.json (node estudio/cli.mjs resumen dialogos --md --escribir)');
    ok(doc.includes('## Saludos de amigos') && doc.includes('## Momentos especiales'), 'DIALOGOS.md conserva las secciones de otros archivos');
    let sinTexto = false;
    try { escribirEnDocumento('# nada', md); } catch (e) { sinTexto = true; }
    ok(sinTexto, 'escribirEnDocumento falla si el documento no tiene las secciones');
}

// ---------- 5. El puente: datos de dialogos en vivo y globo ----------
{
    ok(DATOS_VIVOS.includes('dialogos'), 'dialogos está entre los datos vivos');
    const llamadas = [];
    const responder = crearManejador({
        aplicarDatos: async (nombre, datos) => { llamadas.push(['datos', nombre, Object.keys(datos)]); },
        idioma: () => 'es',
        teletransportar: async () => ({ x: 0, y: 0, z: 0 }),
        globo: (persona, texto) => { llamadas.push(['globo', persona, texto]); }
    });
    const m = (tipo, campos) => responder({ de: 'estudio', tipo, id: 1, ...campos });
    ok((await m('datos', { nombre: 'dialogos', datos: dialogos })).tipo === 'ok' && llamadas[0][1] === 'dialogos', 'datos de dialogos se aplican');
    ok((await m('globo', { persona: 'pony', texto: 'Hola' })).tipo === 'ok' && llamadas[1][0] === 'globo', 'globo de pony');
    ok((await m('globo', { persona: 'pony', texto: '' })).tipo === 'error', 'globo sin texto es error');
    ok((await m('globo', { persona: 'pony', texto: 'x'.repeat(401) })).tipo === 'error', 'globo de más de 400 caracteres es error');
    ok((await m('globo', { persona: '../x', texto: 'Hola' })).tipo === 'error', 'globo con persona no válida es error');
    ok((await m('datos', { nombre: 'posiciones', datos: {} })).tipo === 'error', 'posiciones todavía no se aplica en vivo');
}

// ---------- 6. tienda.json y su esquema ----------
{
    const tienda = json('mundo/datos/tienda.json');
    ok(validar(tienda, 'tienda').length === 0, 'tienda.json cumple su esquema');
    const buena = { version: 1, tiendas: { pony: { ofertas: [{ da: [['bacalao', 4]], pide: [['esmeralda', 1]], req: 'pony2' }], compra: [{ da: ['salmon', 4], esm: 1 }] } } };
    ok(validar(buena, 'tienda').length === 0, 'una oferta por nombre de objeto es válida');
    const mala = (msg, cambiar) => { const m = clon(buena); cambiar(m); ok(validar(m, 'tienda').length > 0, 'tienda: el esquema rechaza ' + msg); };
    mala('id numérico', m => { m.tiendas.pony.ofertas[0].da = [[258, 4]]; });
    mala('nombre con mayúsculas', m => { m.tiendas.pony.ofertas[0].da = [['Bacalao', 4]]; });
    mala('cantidad 0', m => { m.tiendas.pony.ofertas[0].pide = [['esmeralda', 0]]; });
    mala('oferta sin pide', m => { delete m.tiendas.pony.ofertas[0].pide; });
    mala('compra sin esm', m => { delete m.tiendas.pony.compra[0].esm; });

    // El CLI comprueba que los nombres existan (los mismos de /dar)
    const tmpDatos = path.join(RAIZ, 'mundo', 'datos', 'tienda.json');
    const original = fs.readFileSync(tmpDatos);
    try {
        const cli = () => {
            try { return { codigo: 0, salida: execFileSync(process.execPath, [path.join(RAIZ, 'estudio', 'cli.mjs'), 'validar', 'tienda'], { encoding: 'utf8', cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] }) }; }
            catch (e) { return { codigo: e.status, salida: String(e.stdout) }; }
        };
        fs.writeFileSync(tmpDatos, formatear(buena));
        const a = cli();
        ok(a.codigo === 0, 'validar acepta nombres que existen en /dar: ' + a.salida);
        const rara = clon(buena);
        rara.tiendas.pony.ofertas[0].da = [['objeto_que_no_existe', 1]];
        fs.writeFileSync(tmpDatos, formatear(rara));
        const b = cli();
        ok(b.codigo === 1 && /no existe el objeto «objeto_que_no_existe»/.test(b.salida), 'validar rechaza un nombre de objeto que no existe: ' + b.salida);
    } finally {
        fs.writeFileSync(tmpDatos, original);
    }
}

// ---------- 7. indice.json ----------
{
    const indice = json('mundo/datos/indice.json');
    ok(indice.archivos.dialogos && indice.archivos.dialogos.lee === 'mundo/supervivencia/dialogos-datos.js', 'indice.json: dialogos lo lee dialogos-datos.js');
    ok(indice.archivos.tienda && indice.archivos.tienda.lee === null, 'indice.json: tienda es referencia (lee: null)');
    ok(fs.existsSync(path.join(RAIZ, 'estudio', 'esquemas', 'dialogos.schema.json')) && fs.existsSync(path.join(RAIZ, 'estudio', 'esquemas', 'tienda.schema.json')), 'esquemas de fase 3 presentes');
}

console.log(fallos ? `${fallos} fallas` : 'estudio-textos OK');
process.exit(fallos ? 1 : 0);
