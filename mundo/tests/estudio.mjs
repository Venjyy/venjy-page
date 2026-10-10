// Prueba del Estudio, fases 1 y 2: node mundo/tests/estudio.mjs
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
import { evaluarCanal } from '../../estudio/evaluar.mjs';

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
    const canal = evaluarCanal; // el mismo evaluador que usa el CLI (estudio/evaluar.mjs)
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

// ---------- 8. Puente BroadcastChannel (fase 2) ----------
{
    const { CANAL, DATOS_VIVOS, crearManejador } = await import('../../estudio/puente-protocolo.js');
    const { crearCliente } = await import('../../estudio/puente-cliente.js');
    ok(CANAL === 'venjy-estudio', 'el canal se llama venjy-estudio');
    ok(DATOS_VIVOS.includes('ui-layout') && DATOS_VIVOS.includes('textos'), 'layout y textos se aplican en vivo');
    // Un «juego» de mentira detrás de un canal real y un cliente real, como entre dos pestañas
    const aplicados = [], viajes = [];
    let listoJuego = false;
    const responder = crearManejador({
        listo: () => listoJuego,
        idioma: () => 'en',
        aplicarDatos(nombre, datos) { if (datos.romper) throw new Error('rompe'); aplicados.push([nombre, datos]); },
        async teletransportar(d) { if (d.destino === 'nada') throw new Error('no existe'); viajes.push(d); return { x: 1, y: 2, z: 3 }; }
    });
    const canalJuego = new BroadcastChannel(CANAL);
    canalJuego.onmessage = async e => { const r = await responder(e.data); if (r) canalJuego.postMessage(r); };
    const cliente = crearCliente({ tope: 1500 });
    const vistos = [];
    cliente.alMensaje(m => vistos.push(m.tipo));
    try {
        const antes = await cliente.hola();
        ok(antes.tipo === 'estado' && antes.fase === 'abriendo', 'hola con el mundo abriéndose da estado');
        listoJuego = true;
        const h = await cliente.hola();
        ok(h.tipo === 'listo' && h.version === 1 && h.idioma === 'en', 'hola da listo { version, idioma }');
        ok(cliente.estado.listo === true && cliente.estado.idioma === 'en', 'el cliente recuerda que el juego está listo');
        const d = await cliente.enviar('datos', { nombre: 'ui-layout', datos: { supervivencia: {} } });
        ok(d.tipo === 'ok' && aplicados.length === 1 && aplicados[0][0] === 'ui-layout', 'datos se aplica y responde ok');
        const dm = await cliente.enviar('datos', { nombre: 'posiciones', datos: {} }).then(() => null, e => e.message);
        ok(dm && dm.includes('no se aplica en vivo'), 'un archivo que no es vivo da error');
        const dr = await cliente.enviar('datos', { nombre: 'textos', datos: { romper: 1 } }).then(() => null, e => e.message);
        ok(dr === 'rompe', 'el error de aplicarDatos llega al cliente');
        const tp = await cliente.tp('spawn');
        ok(tp.tipo === 'ok' && tp.pos.x === 1 && viajes[0].destino === 'spawn', 'tp con destino responde ok { pos }');
        await cliente.tp({ x: 10, y: 70, z: -5 });
        ok(viajes[1].x === 10 && viajes[1].y === 70 && viajes[1].z === -5, 'tp con x y z');
        await cliente.tp({ x: 10, z: 5 });
        ok(viajes[2].y === undefined, 'tp sin y deja y sin definir');
        for (const malo of ['../x', '', 'a;b', 'x'.repeat(60)]) {
            const e = await cliente.tp(malo).then(() => null, er => er.message);
            ok(e !== null, `tp rechaza el destino «${malo.slice(0, 12)}»`);
        }
        ok((await cliente.tp('nada').then(() => null, e => e.message)) === 'no existe', 'el error de teletransportar llega');
        const desc = await cliente.enviar('volar').then(() => null, e => e.message);
        ok(desc && desc.includes('desconocido'), 'un mensaje desconocido da error');
        // varios cambios en el mismo cuadro llegan como uno solo
        const antesN = aplicados.length;
        cliente.enviarDatos('ui-layout', { n: 1 });
        cliente.enviarDatos('ui-layout', { n: 2 });
        cliente.enviarDatos('ui-layout', { n: 3 });
        await new Promise(r => setTimeout(r, 120));
        ok(aplicados.length === antesN + 1 && aplicados[aplicados.length - 1][1].n === 3, 'enviarDatos junta los cambios del mismo cuadro');
        // un mensaje que no es del Estudio no se responde
        ok((await responder({ de: 'juego', tipo: 'hola' })) === null && (await responder('x')) === null, 'el manejador ignora lo que no es del Estudio');
        ok(vistos.includes('listo'), 'alMensaje recibe los mensajes del juego');
        // sin juego: el cliente da error por tiempo, no se cuelga
        canalJuego.onmessage = null;
        const mudo = await cliente.hola().then(() => null, e => e.message);
        ok(mudo && mudo.includes('no respondió'), 'sin juego, la petición vence');
    } finally {
        cliente.cerrar();
        canalJuego.close();
    }
}

// ---------- 9. Eventos del servidor (SSE) ----------
{
    const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'estudio-sse-'));
    fs.mkdirSync(path.join(tmp2, 'mundo', 'datos'), { recursive: true });
    for (const f of ['indice.json', 'ui-layout.json', 'textos.json']) fs.copyFileSync(path.join(DATOS, f), path.join(tmp2, 'mundo', 'datos', f));
    const srv = await iniciar({ puerto: 0, raiz: tmp2 });
    const p2 = srv.address().port;
    const recibidos = [];
    const req = http.get({ host: '127.0.0.1', port: p2, path: '/api/eventos' }, res => {
        ok(res.statusCode === 200 && res.headers['content-type'].startsWith('text/event-stream'), '/api/eventos es text/event-stream');
        res.setEncoding('utf8');
        res.on('data', c => recibidos.push(c));
    });
    req.on('error', () => {});
    const espera = (cond, ms = 2500) => new Promise(r => { const fin = Date.now() + ms; const t = setInterval(() => { if (cond() || Date.now() > fin) { clearInterval(t); r(cond()); } }, 25); });
    const cuenta = () => (recibidos.join('').match(/event: cambio\ndata: ui-layout\n\n/g) || []).length;
    const pedirP = (metodo, ruta, cab, cuerpo) => new Promise((res2, rej) => {
        const r = http.request({ host: '127.0.0.1', port: p2, method: metodo, path: ruta, headers: cab }, x => {
            const b = [];
            x.on('data', c => b.push(c));
            x.on('end', () => res2({ codigo: x.statusCode, cabeceras: x.headers, texto: Buffer.concat(b).toString() }));
        });
        r.on('error', rej);
        if (cuerpo !== undefined) r.write(cuerpo);
        r.end();
    });
    try {
        await espera(() => recibidos.join('').includes(': abierto'));
        ok(recibidos.join('').includes('retry:'), 'el flujo abre con retry');
        // 1) guardar con PUT avisa una vez
        const lay2 = JSON.parse(fs.readFileSync(path.join(tmp2, 'mundo', 'datos', 'ui-layout.json'), 'utf8'));
        const et = (await pedirP('GET', '/mundo/datos/ui-layout.json', {})).cabeceras.etag;
        lay2.supervivencia.normal.botones['sv-usar'].y = 97;
        const put = await pedirP('PUT', '/api/datos/ui-layout', { 'X-Estudio': '1', 'If-Match': et, 'Content-Type': 'application/json' }, JSON.stringify(lay2));
        ok(put.codigo === 200, 'PUT para el SSE: ' + put.texto);
        ok(await espera(() => cuenta() === 1), 'guardar anuncia «cambio ui-layout»');
        await new Promise(r => setTimeout(r, 400)); // fs.watch ve el mismo cambio: no debe repetirlo
        ok(cuenta() === 1, 'el cambio no se anuncia dos veces (PUT y fs.watch)');
        // 2) una edición en disco (un agente) también avisa
        const archivoLay = path.join(tmp2, 'mundo', 'datos', 'ui-layout.json');
        fs.writeFileSync(archivoLay, fs.readFileSync(archivoLay, 'utf8').replace('"y": 97', '"y": 95'));
        ok(await espera(() => cuenta() === 2), 'editar el archivo en disco también anuncia el cambio');
        // 3) regrabar el mismo contenido no avisa
        fs.writeFileSync(archivoLay, fs.readFileSync(archivoLay));
        await new Promise(r => setTimeout(r, 400));
        ok(cuenta() === 2, 'regrabar el mismo contenido no anuncia nada');
        ok((await pedirP('POST', '/api/eventos', {})).codigo === 404, 'POST a /api/eventos da 404');
    } finally {
        req.destroy();
        await new Promise(r => srv.close(r));
        fs.rmSync(tmp2, { recursive: true, force: true });
    }
}

// ---------- 10. CLI capturar: las piezas que no abren navegador ----------
{
    const { aparatoDe } = await import('../../estudio/capturar.mjs');
    const { calcularAvisos } = await import('../../estudio/avisos-layout.js');
    const { candidatosPlaywright, cargarPlaywright, buscarChromiumLocal, lanzarNavegador } = await import('../../estudio/playwright.mjs');
    const { evaluarGesto } = await import('../../estudio/evaluar.mjs');

    ok(aparatoDe('acostado').w === 844 && aparatoDe('acostado').h === 390, 'aparato acostado = 844×390');
    ok(aparatoDe('vertical').h === 844 && aparatoDe('tablet').w === 820, 'alias vertical y tablet');
    ok(aparatoDe('cel-h').id === 'cel-h' && aparatoDe('915x412').w === 915, 'id de layout.js y ANCHOxALTO');
    ok((() => { try { aparatoDe('reloj'); return false; } catch (e) { return /desconocido/.test(e.message); } })(), 'aparato desconocido da error claro');

    const r = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h });
    const av = calcularAvisos([
        { clave: 'a', r: r(0, 0, 80, 80) }, { clave: 'b', r: r(70, 70, 80, 80) }, { clave: 'c', r: r(300, 0, 30, 60) },
        { clave: 'mision', r: r(0, 200, 30, 20) }, { clave: 'd', r: r(390, 10, 60, 60) }
    ], 400, 300);
    ok(av.some(x => x.tipo === 'choque' && x.a === 'a' && x.b === 'b'), 'calcularAvisos ve el choque');
    ok(av.some(x => x.tipo === 'chico' && x.clave === 'c' && x.ancho === 30), 'calcularAvisos ve el botón chico');
    ok(!av.some(x => x.tipo === 'chico' && x.clave === 'mision'), 'la misión no cuenta como chica');
    ok(av.some(x => x.tipo === 'fuera' && x.clave === 'd'), 'calcularAvisos ve lo que sale de la pantalla');
    ok(calcularAvisos([{ clave: 'a', r: r(0, 0, 50, 50) }, { clave: 'b', r: r(50, 0, 50, 50) }], 400, 300).filter(x => x.tipo === 'choque').length === 0, 'botones pegados no chocan');

    // Resolución de Playwright con paquetes de mentira
    const falso = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-falso-'));
    fs.writeFileSync(path.join(falso, 'package.json'), '{"name":"playwright-core","main":"index.js"}');
    fs.writeFileSync(path.join(falso, 'index.js'), 'exports.chromium = { launch: async o => ({ lanzado: o }) };');
    ok(candidatosPlaywright({ PLAYWRIGHT: '/x' }, '/g')[0] === '/x' && candidatosPlaywright({}, '/g').length === 2, 'candidatos: PLAYWRIGHT primero y luego el global');
    ok(cargarPlaywright({ PLAYWRIGHT: falso }, null).origen === falso, 'cargarPlaywright toma la variable PLAYWRIGHT');
    const sinPaquete = (() => { try { cargarPlaywright({ PLAYWRIGHT: path.join(falso, 'no-existe') }, null); return ''; } catch (e) { return e.message; } })();
    ok(/No encuentro Playwright/.test(sinPaquete) && sinPaquete.includes('PLAYWRIGHT'), 'sin paquete el error dice cómo arreglarlo');
    // caché de navegadores: la revisión más nueva primero
    const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-pw-'));
    const exe = process.platform === 'win32' ? 'chrome-headless-shell-win64/chrome-headless-shell.exe'
        : process.platform === 'darwin' ? 'chrome-headless-shell-mac-arm64/chrome-headless-shell' : 'chrome-headless-shell-linux64/chrome-headless-shell';
    for (const rev of [1100, 1243]) {
        const p = path.join(cache, 'chromium_headless_shell-' + rev, exe);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, '');
    }
    const locales = buscarChromiumLocal({ PLAYWRIGHT_BROWSERS_PATH: cache });
    ok(locales.length === 2 && locales[0].includes('1243') && locales[1].includes('1100'), 'buscarChromiumLocal ordena por revisión');
    ok(buscarChromiumLocal({ PLAYWRIGHT_BROWSERS_PATH: path.join(cache, 'nada') }).length === 0, 'sin caché, lista vacía');
    // lanzarNavegador prueba en orden hasta que uno abre: por defecto (falla), 1243 (falla), 1100 (abre)
    const intentos = [];
    const chromiumFalso = { launch: async o => { intentos.push(o); if (!o.executablePath || o.executablePath.includes('1243')) throw new Error('no abre'); return { ok: true, o }; } };
    const nav = await lanzarNavegador(chromiumFalso, { PLAYWRIGHT_BROWSERS_PATH: cache });
    ok(nav.ok && nav.o.executablePath.includes('1100') && intentos.length === 3, `lanzarNavegador cae al siguiente (intentos: ${intentos.length})`);
    const todosMal = await lanzarNavegador({ launch: async () => { throw new Error('nada'); } }, { PLAYWRIGHT_BROWSERS_PATH: cache }).then(() => '', e => e.message);
    ok(/No pude abrir un navegador/.test(todosMal), 'si ningún navegador abre, el error los lista');
    fs.rmSync(falso, { recursive: true, force: true });
    fs.rmSync(cache, { recursive: true, force: true });

    // evaluarGesto es el mismo evaluador de la paridad
    const habla = json('poses.json').gestos.habla;
    const e0 = evaluarGesto(habla, 0);
    ok(Math.abs(e0.bDx - -0.9) < 1e-9 && Object.keys(e0).length === Object.keys(habla.canales).length, 'evaluarGesto(habla, 0)');

    // el CLI falla con un mensaje claro y código 1 antes de abrir nada
    for (const args of [['capturar'], ['capturar', 'gesto', 'inexistente'], ['capturar', 'pose', 'nada']]) {
        let codigo = 0, salida = '';
        try { execFileSync(process.execPath, [path.join(RAIZ, 'estudio', 'cli.mjs'), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { codigo = e.status; salida = String(e.stdout); }
        ok(codigo === 1 && /^capturar: /.test(salida), `cli ${args.join(' ')} sale con 1 y un mensaje (salió ${codigo}: ${salida.slice(0, 80)})`);
    }
}

console.log(fallos ? `${fallos} fallas` : 'estudio OK');
process.exit(fallos ? 1 : 0);
