// Prueba del Estudio, fase 1: node mundo/tests/estudio.mjs
// Formato estable, validador, fusión de datos, CSS del layout, servidor de desarrollo, CLI y paridad de gestos.
// Lo que depende del navegador (estilos computados con y sin datos, mover un botón y guardar) se prueba a mano:
// ver «Estudio · fase 1» en mundo/PENDIENTES.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { formatear } from '../../estudio/formato.mjs';
import { validar } from '../../estudio/validar.mjs';
import { iniciar } from '../../estudio/servidor.mjs';
import { fusionar, texto } from '../datos/cargador.js';
import { cssLayout } from '../supervivencia/layout-datos.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATOS = path.join(RAIZ, 'mundo', 'datos');
const lee = n => fs.readFileSync(path.join(DATOS, n), 'utf8');
const json = n => JSON.parse(lee(n));
const clon = o => JSON.parse(JSON.stringify(o));

// ---------- 1. Formato estable ----------
const archivos = fs.readdirSync(DATOS).filter(f => f.endsWith('.json'));
ok(archivos.length >= 5, 'faltan archivos en mundo/datos');
for (const f of archivos) {
    const crudo = lee(f).replace(/\r\n/g, '\n');
    ok(formatear(JSON.parse(crudo)) === crudo, `${f}: formatear no es idempotente`);
}
ok(formatear({ a: [1, [2, 3]], b: { x: 1, y: 'z' }, c: {}, d: [] }) === '{\n  "a": [1, [2, 3]],\n  "b": { "x": 1, "y": "z" },\n  "c": {},\n  "d": []\n}\n', 'formato de arreglos y objetos planos');
const largo = { k: Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['clave' + i, 'valor largo ' + i])) };
ok(formatear(largo).split('\n').length > 5, 'un objeto plano de más de 120 columnas se parte');

// ---------- 2. Validador ----------
const indice = json('indice.json');
for (const [nombre, meta] of Object.entries(indice.archivos)) {
    const e = validar(json(nombre + '.json'), meta.esquema);
    ok(e.length === 0, `${nombre}.json no cumple su esquema: ${e.slice(0, 2).join(' · ')}`);
}
ok(validar(indice, 'indice').length === 0, 'indice.json no cumple indice.schema.json');
const malo = (nombre, esquema, cambia, quiere) => {
    const d = clon(json(nombre + '.json'));
    cambia(d);
    const e = validar(d, esquema);
    ok(e.length > 0 && (!quiere || e.some(x => x.includes(quiere))), `validar debía rechazar: ${quiere || esquema} (salió ${JSON.stringify(e)})`);
};
malo('ui-layout', 'ui-layout', d => { d.supervivencia.normal.botones.joy.ancla = 'centro'; }, 'ancla');
malo('ui-layout', 'ui-layout', d => { d.supervivencia.normal.botones.fantasma = { x: 1 }; }, 'fantasma');
malo('ui-layout', 'ui-layout', d => { d.supervivencia.normal.botones.joy.w = 10; }, '10 < 24');
malo('textos', 'textos', d => { delete d.textos.tactil.romper.en; }, 'en');
malo('textos', 'textos', d => { d.textos.tactil.usar.es = ''; }, 'usar.es');
malo('posiciones', 'posiciones', d => { d.personas.hadad.dy = 'arriba'; }, 'dy');
malo('poses', 'poses', d => { d.poses.neutral.canales.brazo = 0.1; }, 'brazo');
malo('poses', 'poses', d => { d.gestos.habla.canales.bDx.osc[0].forma = 'cuadrada'; }, 'cuadrada');
malo('poses', 'poses', d => { d.poses.neutral.canales.cx = 9; }, '9');

// ---------- 3. Fusión ----------
{
    const defecto = { a: 1, b: { c: 2, d: [1, 2, 3] }, e: { f: 'x' } };
    const datos = { b: { d: [9] }, e: { g: 'y' }, h: null };
    const r = fusionar(defecto, datos);
    ok(r.a === 1 && r.b.c === 2, 'fusionar conserva lo que falta');
    ok(JSON.stringify(r.b.d) === '[9]', 'fusionar reemplaza arreglos completos');
    ok(r.e.f === 'x' && r.e.g === 'y', 'fusionar mezcla objetos en profundidad');
    ok(defecto.b.d.length === 3 && !('g' in defecto.e), 'fusionar no modifica el defecto');
    ok(fusionar(defecto, null) === defecto && fusionar(defecto, undefined) === defecto, 'sin datos devuelve el defecto');
    ok(texto({ es: 'Hola {n}', en: 'Hi {n}' }, 'en', { n: 3 }) === 'Hi 3', 'texto con plantilla');
    ok(texto({ es: 'Hola' }, 'en') === 'Hola', 'texto cae a es');
}

// ---------- 4. CSS del layout ----------
{
    const css = cssLayout(json('ui-layout.json'));
    const esperado = [
        'body.con-tactil.layout-datos{--pie:calc(var(--casilla) + 60px + env(safe-area-inset-bottom, 0px))}',
        'body.con-tactil.layout-datos .tactil-joy{left:calc(14px + env(safe-area-inset-left, 0px));right:auto;bottom:calc(var(--pie) + 0px);top:auto;width:116px;height:116px}',
        'body.con-tactil.layout-datos .tactil-joy-palanca{width:48px;height:48px;margin:-24px 0 0 -24px}',
        'body.con-tactil.layout-datos .tactil-saltar{right:calc(14px + env(safe-area-inset-right, 0px));left:auto;bottom:calc(var(--pie) + 0px);top:auto;width:76px;height:76px}',
        'body.con-tactil.layout-datos .tactil-bajar{right:calc(98px + env(safe-area-inset-right, 0px));left:auto;bottom:calc(var(--pie) + 0px);top:auto;width:64px;height:64px;font-size:0.8rem}',
        'body.con-tactil.layout-datos .tactil-boton.sv-romper{right:calc(98px + env(safe-area-inset-right, 0px));left:auto;bottom:calc(var(--pie) + 88px);top:auto;width:76px;height:76px}',
        'body.con-tactil.layout-datos .tactil-boton.sv-usar{right:calc(14px + env(safe-area-inset-right, 0px));left:auto;bottom:calc(var(--pie) + 88px);top:auto;width:76px;height:76px}',
        'body.con-tactil.layout-datos .tactil-boton.sv-inventario{left:calc(12px + env(safe-area-inset-left, 0px));right:auto;top:calc(84px + env(safe-area-inset-top, 0px));bottom:auto;width:64px;height:40px;font-size:0.8rem}',
        'body.con-tactil.layout-datos .tactil-boton.sv-soltar{left:calc(12px + env(safe-area-inset-left, 0px));right:auto;top:calc(130px + env(safe-area-inset-top, 0px));bottom:auto;width:64px;height:40px;font-size:0.8rem}',
        'body.con-tactil.layout-datos .tactil-boton.sv-camara{left:calc(12px + env(safe-area-inset-left, 0px));right:auto;top:calc(176px + env(safe-area-inset-top, 0px));bottom:auto;width:64px;height:40px;font-size:0.8rem}',
        'body.con-tactil.layout-datos .tactil-boton.sv-comando{left:calc(12px + env(safe-area-inset-left, 0px));right:auto;top:calc(222px + env(safe-area-inset-top, 0px));bottom:auto;width:64px;height:40px;font-size:0.9rem}',
        'body.con-tactil.layout-datos .tactil-boton.sv-acariciar{right:calc(14px + env(safe-area-inset-right, 0px));left:auto;bottom:calc(var(--pie) + 176px);top:auto;width:96px;height:40px;font-size:0.8rem}',
        'body.con-tactil.layout-datos #hud .mision-activa{left:12px;right:auto;top:270px;bottom:auto}',
        '@media (max-height:460px){body.con-tactil.layout-datos{--pie:calc(var(--casilla) + 50px)}',
        'body.con-tactil.layout-datos .tactil-boton.sv-romper{right:calc(88px + env(safe-area-inset-right, 0px));left:auto;bottom:calc(var(--pie) + 82px);top:auto;width:66px;height:66px}',
        'body.con-tactil.layout-datos .tactil-boton.sv-usar{bottom:calc(var(--pie) + 82px);top:auto;width:66px;height:66px}',
        'body.con-tactil.layout-datos .tactil-boton.sv-acariciar{bottom:calc(var(--pie) + 156px);top:auto}}'
    ].join('\n');
    ok(css === esperado, 'cssLayout de los datos iniciales no coincide con el texto esperado\n' + css);
    ok(cssLayout({}) === '' && cssLayout(null) === '', 'sin datos, cssLayout no escribe nada');
    ok(!/!important/.test(css), 'sin pausa ni pantalla no hay !important');
    const mover = { supervivencia: { normal: { botones: { pausa: { ancla: 'sd', x: 20, y: 30 } } } } };
    ok(/\.tactil-pausa\{right:calc\(20px \+ env\(safe-area-inset-right, 0px\)\) !important;left:auto !important;top:calc\(30px \+ env\(safe-area-inset-top, 0px\)\) !important;bottom:auto !important\}/.test(cssLayout(mover)), 'pausa gana a mundo.css con !important');
    const sinSeguro = { supervivencia: { normal: { botones: { saltar: { ancla: 'id', x: 5, y: 7, seguro: false } } } } };
    ok(cssLayout(sinSeguro).includes('right:5px;left:auto;bottom:7px;top:auto'), 'seguro:false no suma env()');
    const mm = { supervivencia: { normal: { botones: { minimapa: { ancla: 'sd', x: 8, y: 6, w: 120, h: 120, seguro: false } } } } };
    ok(cssLayout(mm).includes('#hud .mm-pequeno{right:8px;left:auto;top:6px;bottom:auto;width:120px;height:120px}'), 'minimapa mueve y cambia tamaño sin zona segura');
    const oculto = { supervivencia: { normal: { botones: { 'sv-camara': { oculto: true } } } } };
    ok(cssLayout(oculto).includes('display:none'), 'oculto esconde el botón');
}

// ---------- 5. Servidor ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-'));
const raiz = path.join(tmp, 'sitio');
fs.mkdirSync(path.join(raiz, 'mundo', 'datos'), { recursive: true });
fs.mkdirSync(path.join(raiz, '.git'), { recursive: true });
fs.mkdirSync(path.join(raiz, 'estudio'), { recursive: true });
for (const f of ['indice.json', 'ui-layout.json', 'textos.json']) fs.copyFileSync(path.join(DATOS, f), path.join(raiz, 'mundo', 'datos', f));
fs.writeFileSync(path.join(raiz, 'index.html'), '<p>hola</p>');
fs.writeFileSync(path.join(raiz, 'estudio', 'index.html'), '<p>estudio</p>');
fs.writeFileSync(path.join(raiz, '.git', 'config'), 'secreto-git');
fs.writeFileSync(path.join(tmp, 'secreto.txt'), 'FUERA-DE-LA-RAIZ');

const servidor = await iniciar({ puerto: 0, raiz });
const puerto = servidor.address().port;
function pedir(metodo, ruta, { cabeceras = {}, cuerpo } = {}) {
    return new Promise((ok2, mal) => {
        const r = http.request({ host: '127.0.0.1', port: puerto, method: metodo, path: ruta, headers: cabeceras }, res => {
            const partes = [];
            res.on('data', c => partes.push(c));
            res.on('end', () => ok2({ codigo: res.statusCode, cabeceras: res.headers, texto: Buffer.concat(partes).toString('utf8') }));
        });
        r.on('error', mal);
        if (cuerpo !== undefined) r.write(cuerpo);
        r.end();
    });
}
const PUT = (nombre, datos, cab = {}, crudo) => pedir('PUT', '/api/datos/' + nombre, {
    cabeceras: { 'X-Estudio': '1', 'Content-Type': 'application/json', ...cab },
    cuerpo: crudo !== undefined ? crudo : JSON.stringify(datos)
});

try {
    // estáticos
    const raizHtml = await pedir('GET', '/');
    ok(raizHtml.codigo === 200 && raizHtml.texto.includes('hola') && raizHtml.cabeceras['content-type'].startsWith('text/html'), 'GET / sirve index.html');
    const carpeta = await pedir('GET', '/estudio/');
    ok(carpeta.codigo === 200 && carpeta.texto.includes('estudio'), 'una carpeta sirve su index.html');
    const sinBarra = await pedir('GET', '/estudio');
    ok(sinBarra.codigo === 301 && sinBarra.cabeceras.location === '/estudio/', 'carpeta sin barra redirige');
    const j = await pedir('GET', '/mundo/datos/textos.json');
    ok(j.codigo === 200 && j.cabeceras['content-type'].startsWith('application/json') && j.cabeceras['cache-control'] === 'no-cache', 'JSON con no-cache');
    const etag = j.cabeceras.etag;
    ok(/^"[0-9a-f]{40}"$/.test(etag), 'ETag sha1');
    const nm = await pedir('GET', '/mundo/datos/textos.json', { cabeceras: { 'If-None-Match': etag } });
    ok(nm.codigo === 304 && nm.texto === '', 'If-None-Match da 304');
    const head = await pedir('HEAD', '/mundo/datos/textos.json');
    ok(head.codigo === 200 && head.texto === '', 'HEAD sin cuerpo');
    // seguridad de rutas
    for (const ruta of ['/../secreto.txt', '/%2e%2e/secreto.txt', '/..%2fsecreto.txt', '/%2e%2e%2fsecreto.txt', '/..\\secreto.txt', '/mundo/../../secreto.txt']) {
        const r = await pedir('GET', ruta);
        ok(!r.texto.includes('FUERA-DE-LA-RAIZ'), `${ruta} salió de la raíz`);
    }
    ok((await pedir('GET', '/.git/config')).codigo === 404, '.git no se sirve');
    ok(!(await pedir('GET', '/%2egit/config')).texto.includes('secreto-git'), '.git codificado no se sirve');
    ok((await pedir('GET', '/%00')).codigo !== 200, 'byte nulo rechazado');
    // API
    const api = await pedir('GET', '/api/estudio');
    ok(api.codigo === 200 && JSON.parse(api.texto).escritura === true, 'GET /api/estudio');

    const lay = JSON.parse(fs.readFileSync(path.join(raiz, 'mundo', 'datos', 'ui-layout.json'), 'utf8'));
    const etagLay = (await pedir('GET', '/mundo/datos/ui-layout.json')).cabeceras.etag;
    const nuevo = clon(lay);
    nuevo.supervivencia.normal.botones['sv-romper'].y = 92;
    // un PUT válido escribe y formatea (se manda minificado)
    const buena = await PUT('ui-layout', nuevo, { 'If-Match': etagLay });
    ok(buena.codigo === 200 && JSON.parse(buena.texto).ok === true, 'PUT válido da 200: ' + buena.texto);
    const enDisco = fs.readFileSync(path.join(raiz, 'mundo', 'datos', 'ui-layout.json'), 'utf8');
    ok(enDisco === formatear(nuevo), 'PUT escribe con el formato estable');
    const lineasCambiadas = enDisco.split('\n').filter((l, i) => l !== lee('ui-layout.json').replace(/\r\n/g, '\n').split('\n')[i]);
    ok(lineasCambiadas.length === 1 && lineasCambiadas[0].includes('"y": 92'), 'el diff del PUT es de una sola línea');
    ok(JSON.parse(buena.texto).etag === (await pedir('GET', '/mundo/datos/ui-layout.json')).cabeceras.etag, 'el etag devuelto es el del archivo');
    // reglas
    ok((await PUT('../indice', {}, { 'If-Match': '*' })).codigo === 404, 'nombre con .. da 404');
    ok((await PUT('inexistente', {}, { 'If-Match': '*' })).codigo === 404, 'nombre desconocido da 404');
    const sinX = await pedir('PUT', '/api/datos/ui-layout', { cabeceras: { 'If-Match': '*' }, cuerpo: JSON.stringify(nuevo) });
    ok(sinX.codigo === 403, 'sin X-Estudio da 403');
    ok((await PUT('ui-layout', nuevo, { 'If-Match': '*', Origin: 'http://evil.example' })).codigo === 403, 'otro origen da 403');
    ok((await PUT('ui-layout', nuevo, { 'If-Match': '*', Host: 'evil.example' })).codigo === 403, 'otro Host da 403');
    ok((await PUT('ui-layout', nuevo)).codigo === 428, 'sin If-Match da 428');
    ok((await PUT('ui-layout', nuevo, { 'If-Match': etagLay })).codigo === 412, 'If-Match viejo da 412');
    const etagAhora = (await pedir('GET', '/mundo/datos/ui-layout.json')).cabeceras.etag;
    ok((await PUT('ui-layout', null, { 'If-Match': etagAhora }, '{no es json')).codigo === 422, 'JSON roto da 422');
    const invalido = clon(nuevo);
    invalido.supervivencia.normal.botones.joy.ancla = 'centro';
    const r422 = await PUT('ui-layout', invalido, { 'If-Match': etagAhora });
    ok(r422.codigo === 422 && JSON.parse(r422.texto).errores.length > 0, 'esquema inválido da 422');
    ok(fs.readFileSync(path.join(raiz, 'mundo', 'datos', 'ui-layout.json'), 'utf8') === enDisco, 'un PUT rechazado no toca el archivo');
    const grande = await PUT('ui-layout', null, { 'If-Match': etagAhora }, ' '.repeat(600 * 1024));
    ok(grande.codigo === 413, 'cuerpo de 600 KB da 413 (salió ' + grande.codigo + ')');
    ok((await pedir('POST', '/api/datos/ui-layout')).codigo === 405, 'POST no permitido');
    ok(!fs.readdirSync(path.join(raiz, 'mundo', 'datos')).some(f => f.includes('.tmp')), 'no quedan temporales');
} finally {
    await new Promise(r => servidor.close(r));
    fs.rmSync(tmp, { recursive: true, force: true });
}

// ---------- 6. CLI ----------
{
    const cli = (...args) => {
        try { return { codigo: 0, salida: execFileSync('node', [path.join(RAIZ, 'estudio', 'cli.mjs'), ...args], { encoding: 'utf8', cwd: RAIZ, stdio: ['ignore', 'pipe', 'pipe'] }) }; }
        catch (e) { return { codigo: e.status, salida: String(e.stdout) }; }
    };
    const r = cli('resumen');
    ok(r.codigo === 0 && /^ui-layout +\d+ elementos \(normal\)/m.test(r.salida) && /^js:dialogos /m.test(r.salida), 'resumen lista los archivos y las fuentes JS');
    ok(/^habla +reloj t +bDx -0\.9 ~0\.3@5/m.test(cli('resumen', 'poses', 'habla').salida), 'resumen poses habla');
    ok(/^sv-romper +id 98,88 pie 76x76 \| baja id 88,82 pie 66x66/m.test(cli('resumen', 'ui-layout').salida), 'resumen ui-layout');
    ok(cli('resumen', 'dialogos', 'pony.quien').salida.includes('pony.quien'), 'resumen dialogos pony.quien');
    ok(cli('resumen', 'nada').codigo === 1, 'resumen de algo desconocido sale con 1');
    const v = cli('validar');
    ok(v.codigo === 0 && /^OK \d+ de \d+ archivos/m.test(v.salida), 'validar de los datos reales sale con 0: ' + v.salida);
    ok(cli('capturar').codigo === 1, 'capturar responde «fase 2»');
    const j = JSON.parse(cli('validar', '--json').salida);
    ok(j.ok === true && j.total >= 5, 'validar --json');
}

// ---------- 7. Paridad de gestos (poses.json contra el código) ----------
{
    // escenas-skin.js trae cuerpo.js, que escucha eventos de `window`: basta un objeto mínimo (igual que amistad.mjs)
    globalThis.window ??= { addEventListener() {} };
    const { GESTOS } = await import('../supervivencia/escenas-skin.js');
    const { GESTOS_AMISTAD } = await import('../supervivencia/escena-amistad-datos.js');
    const FORMAS = { sin: Math.sin, abs: x => Math.abs(Math.sin(x)), pos: x => Math.max(0, Math.sin(x)), neg: x => Math.min(0, Math.sin(x)) };
    const suave = u => u * u * (3 - 2 * u);
    const tramo = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
    const clave = (k, t, interp) => {
        if (t <= k[0][0]) return k[0][1];
        for (let i = 1; i < k.length; i++) {
            if (t <= k[i][0]) {
                const [t0, v0] = k[i - 1], [t1, v1] = k[i];
                const f = (t - t0) / (t1 - t0);
                return interp === 'paso' ? v0 : v0 + (v1 - v0) * (interp === 'lineal' ? f : suave(f));
            }
        }
        return k[k.length - 1][1];
    };
    const canal = (c, t, u) => {
        if (typeof c === 'number') return c;
        let v = c.k ? clave(c.k, t, c.interp) : (c.base || 0);
        for (const o of c.osc || []) v += o.amp * FORMAS[o.forma](t * o.frec + (o.fase || 0)) * (o.env ? tramo(u, o.env[0], o.env[1]) : 1);
        return v;
    };
    const gestos = json('poses.json').gestos;
    let comparaciones = 0, maxima = 0;
    for (const [nombre, def] of Object.entries(gestos)) {
        const fn = GESTOS[nombre] || GESTOS_AMISTAD[nombre];
        ok(typeof fn === 'function', `gesto ${nombre} no existe en el código`);
        if (typeof fn !== 'function' || def.reloj !== 't') continue;
        for (let t = 0; t <= 8; t += 0.01) {
            const u = Math.min(1, t / 8);
            const esperado = fn(u, t, { j: false });
            const claves = new Set([...Object.keys(esperado), ...Object.keys(def.canales)]);
            for (const c of claves) {
                const a = esperado[c] === undefined ? 0 : esperado[c];
                const b = def.canales[c] === undefined ? 0 : canal(def.canales[c], t, u);
                maxima = Math.max(maxima, Math.abs(a - b));
                comparaciones++;
            }
        }
    }
    ok(maxima < 1e-9, `poses.json se aparta del código (diferencia máxima ${maxima})`);
    ok(Object.keys(gestos).length >= 11, 'poses.json debe traer los 11 gestos');
    console.log(`gestos: ${Object.keys(gestos).length} · ${comparaciones} comparaciones · diferencia máxima ${maxima}`);
}

console.log(fallos ? `${fallos} fallas` : 'estudio OK');
process.exit(fallos ? 1 : 0);
