// =========================================================
// VENJY · Estudio · servidor de desarrollo (reemplaza a `python -m http.server 5510`)
// node estudio/servidor.mjs [--lan] [--log]      puerto: PORT o 5510
// Estáticos de toda la raíz del repo (menos .git) con ETag, y la API de guardado de mundo/datos.
// Solo node:http, node:fs, node:path y node:crypto. Contrato: estudio/DISENO.md §5.
// =========================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { formatear } from './formato.mjs';
import { validar } from './validar.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_CUERPO = 512 * 1024;
const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
    '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.pdf': 'application/pdf'
};

const sha1 = buf => '"' + crypto.createHash('sha1').update(buf).digest('hex') + '"';
const esLoopback = ip => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
const esHostLocal = host => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host || '');

function json(res, codigo, obj) {
    const cuerpo = Buffer.from(JSON.stringify(obj));
    res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': cuerpo.length, 'Cache-Control': 'no-store' });
    res.end(cuerpo);
}

function texto(res, codigo, msg) {
    const cuerpo = Buffer.from(msg);
    res.writeHead(codigo, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': cuerpo.length, 'Cache-Control': 'no-store' });
    res.end(cuerpo);
}

// Ruta absoluta dentro de la raíz, o null si sale de ella, toca .git o no se puede decodificar.
function resolverRuta(rutaUrl, raiz) {
    let dec;
    try { dec = decodeURIComponent(rutaUrl); } catch (e) { return null; }
    if (dec.includes('\0')) return null;
    const abs = path.resolve(raiz, '.' + path.posix.normalize('/' + dec.replace(/\\/g, '/')));
    const rel = path.relative(raiz, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    if (rel.split(path.sep).some(p => p === '.git')) return null;
    return abs;
}

// ETag por mtime+tamaño: el contenido solo se lee y se hashea cuando el archivo cambia.
const etags = new Map();

function leerCuerpo(req, max) {
    return new Promise((ok, mal) => {
        const partes = [];
        let total = 0;
        let pasado = false;
        req.on('data', c => {
            if (pasado) return; // se sigue leyendo (y descartando) para poder contestar sin cortar la conexión
            total += c.length;
            if (total > max) { pasado = true; partes.length = 0; mal(Object.assign(new Error('grande'), { codigo: 413 })); return; }
            partes.push(c);
        });
        req.on('end', () => { if (!pasado) ok(Buffer.concat(partes)); });
        req.on('error', mal);
    });
}

function escribirArchivo(destino, contenido) {
    const tmp = destino + '.tmp-' + process.pid;
    try {
        fs.writeFileSync(tmp, contenido);
        fs.renameSync(tmp, destino);
    } catch (e) {
        // OneDrive a veces bloquea el rename (EPERM): escritura directa
        try { fs.unlinkSync(tmp); } catch (e2) { /* ya no está */ }
        fs.writeFileSync(destino, contenido);
    }
}

export function crearServidor({ raiz = RAIZ, log = false } = {}) {
    const dirDatos = path.join(raiz, 'mundo', 'datos');
    const leerIndice = () => JSON.parse(fs.readFileSync(path.join(dirDatos, 'indice.json'), 'utf8'));

    // ---- GET /api/eventos (SSE): avisa «cambio <nombre>» cuando un archivo de mundo/datos/ cambia de contenido ----
    // Lo oye el juego con ?estudio (también el celular en --lan). Se anuncia al guardar (PUT) y al detectar
    // un cambio en disco (fs.watch: un agente o VS Code editando); el hash evita avisar dos veces lo mismo.
    const oyentes = new Set();
    const anunciado = new Map();
    function anunciar(nombre, etag) {
        if (anunciado.get(nombre) === etag) return;
        anunciado.set(nombre, etag);
        for (const r of oyentes) r.write(`event: cambio\ndata: ${nombre}\n\n`);
    }
    const alDisco = new Map();
    function mirarDisco(archivo) {
        const m = /^([a-z][a-z0-9-]*)\.json$/.exec(archivo || '');
        if (!m || m[1] === 'indice') return;
        clearTimeout(alDisco.get(m[1]));
        alDisco.set(m[1], setTimeout(() => {
            alDisco.delete(m[1]);
            try { anunciar(m[1], sha1(fs.readFileSync(path.join(dirDatos, archivo)))); } catch (e) { /* se borró o está en uso */ }
        }, 120));
    }
    let vigia = null;
    try { vigia = fs.watch(dirDatos, (ev, archivo) => mirarDisco(archivo)); vigia.on('error', () => {}); } catch (e) { /* sin vigilancia: solo avisa al guardar */ }
    // Parte del hash de lo que ya hay, para no anunciar un toque sin cambios
    try {
        for (const a of fs.readdirSync(dirDatos)) if (/\.json$/.test(a) && a !== 'indice.json') anunciado.set(a.slice(0, -5), sha1(fs.readFileSync(path.join(dirDatos, a))));
    } catch (e) { /* sin datos */ }

    function eventos(req, res) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        res.write('retry: 2000\n: abierto\n\n');
        oyentes.add(res);
        const latido = setInterval(() => res.write(': latido\n\n'), 25000);
        req.on('close', () => { clearInterval(latido); oyentes.delete(res); });
    }

    async function guardar(req, res, nombre) {
        let indice;
        try { indice = leerIndice(); } catch (e) { return json(res, 500, { ok: false, error: 'indice.json ilegible: ' + e.message }); }
        const meta = /^[a-z][a-z0-9-]*$/.test(nombre) && indice.archivos && indice.archivos[nombre];
        if (!meta) return json(res, 404, { ok: false, error: 'archivo fuera de indice.json' });
        if (req.headers['x-estudio'] !== '1') return json(res, 403, { ok: false, error: 'falta X-Estudio: 1' });
        if (req.headers.origin) {
            let mismo = false;
            try { mismo = new URL(req.headers.origin).host === req.headers.host; } catch (e) { /* origen raro */ }
            if (!mismo) return json(res, 403, { ok: false, error: 'origen distinto' });
        }
        if (!esLoopback(req.socket.remoteAddress) || !esHostLocal(req.headers.host)) {
            return json(res, 403, { ok: false, error: 'solo se guarda desde este computador (localhost)' });
        }
        if (Number(req.headers['content-length'] || 0) > MAX_CUERPO) { req.resume(); return json(res, 413, { ok: false, error: 'cuerpo > 512 KB' }); }
        let cuerpo;
        try { cuerpo = await leerCuerpo(req, MAX_CUERPO); } catch (e) { return json(res, e.codigo || 400, { ok: false, error: 'cuerpo no válido o muy grande' }); }

        const destino = path.join(dirDatos, nombre + '.json');
        const ifMatch = req.headers['if-match'];
        if (!ifMatch) return json(res, 428, { ok: false, error: 'falta If-Match con el ETag del archivo leído (o *)' });
        const existe = fs.existsSync(destino);
        const previo = existe ? fs.readFileSync(destino) : null;
        if (ifMatch !== '*' && ifMatch !== (previo && sha1(previo))) {
            return json(res, 412, { ok: false, error: 'El archivo cambió en disco: recarga y vuelve a aplicar tus cambios' });
        }

        let datos;
        try { datos = JSON.parse(cuerpo.toString('utf8')); } catch (e) { return json(res, 422, { ok: false, errores: ['JSON no válido: ' + e.message] }); }
        let errores;
        try { errores = validar(datos, meta.esquema); } catch (e) { return json(res, 500, { ok: false, error: 'esquema: ' + e.message }); }
        if (errores.length) return json(res, 422, { ok: false, errores });

        const salida = Buffer.from(formatear(datos), 'utf8');
        if (!previo || !salida.equals(previo)) escribirArchivo(destino, salida);
        console.log(`guardado ${nombre}.json (${salida.length} B)`);
        const etagNuevo = sha1(salida);
        anunciar(nombre, etagNuevo);
        return json(res, 200, { ok: true, bytes: salida.length, etag: etagNuevo });
    }

    function estatico(req, res, rutaUrl) {
        let abs = resolverRuta(rutaUrl, raiz);
        if (!abs) return texto(res, 404, 'No encontrado');
        let st;
        try { st = fs.statSync(abs); } catch (e) { return texto(res, 404, 'No encontrado'); }
        if (st.isDirectory()) {
            if (!rutaUrl.endsWith('/')) {
                res.writeHead(301, { Location: rutaUrl + '/' });
                return res.end();
            }
            abs = path.join(abs, 'index.html');
            try { st = fs.statSync(abs); } catch (e) { return texto(res, 404, 'No encontrado'); }
        }
        const clave = st.mtimeMs + '|' + st.size;
        let ent = etags.get(abs);
        let cuerpo = null;
        if (!ent || ent.clave !== clave) {
            cuerpo = fs.readFileSync(abs);
            ent = { clave, etag: sha1(cuerpo) };
            etags.set(abs, ent);
        }
        const inm = req.headers['if-none-match'];
        const cabeceras = {
            'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
            'ETag': ent.etag,
            'X-Content-Type-Options': 'nosniff'
        };
        if (inm && inm.split(',').some(v => v.trim().replace(/^W\//, '') === ent.etag)) {
            res.writeHead(304, cabeceras);
            return res.end();
        }
        cabeceras['Content-Length'] = st.size;
        res.writeHead(200, cabeceras);
        if (req.method === 'HEAD') return res.end();
        if (cuerpo) return res.end(cuerpo);
        fs.createReadStream(abs).on('error', () => res.destroy()).pipe(res);
    }

    const servidor = http.createServer((req, res) => {
        const inicio = Date.now();
        if (log) res.on('finish', () => console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - inicio} ms`));
        let rutaUrl;
        try { rutaUrl = new URL(req.url, 'http://x').pathname; } catch (e) { return texto(res, 400, 'URL no válida'); }
        if (rutaUrl === '/api/estudio' && req.method === 'GET') return json(res, 200, { ok: true, escritura: true, version: 1 });
        if (rutaUrl === '/api/eventos' && req.method === 'GET') return eventos(req, res);
        const m = /^\/api\/datos\/([^/]+)$/.exec(rutaUrl);
        if (m) {
            if (req.method !== 'PUT') return json(res, 405, { ok: false, error: 'usa PUT' });
            return guardar(req, res, m[1]).catch(e => json(res, 500, { ok: false, error: String((e && e.message) || e) }));
        }
        if (rutaUrl.startsWith('/api/')) return json(res, 404, { ok: false, error: 'API desconocida' });
        if (req.method !== 'GET' && req.method !== 'HEAD') return texto(res, 405, 'Método no permitido');
        return estatico(req, res, rutaUrl);
    });
    // close() también corta los SSE abiertos y la vigilancia (si no, el servidor no termina)
    const cerrar = servidor.close.bind(servidor);
    servidor.close = cb => {
        if (vigia) vigia.close();
        for (const r of oyentes) r.end();
        oyentes.clear();
        for (const t of alDisco.values()) clearTimeout(t);
        return cerrar(cb);
    };
    return servidor;
}

export function iniciar({ puerto = 5510, lan = false, log = false, raiz = RAIZ } = {}) {
    const servidor = crearServidor({ raiz, log });
    return new Promise((ok, mal) => {
        servidor.once('error', mal);
        servidor.listen(puerto, lan ? '0.0.0.0' : '127.0.0.1', () => ok(servidor));
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const puerto = process.env.PORT === undefined ? 5510 : Number(process.env.PORT);
    const lan = process.argv.includes('--lan');
    iniciar({ puerto, lan, log: process.argv.includes('--log') }).then(s => {
        console.log(`Venjy · Estudio en http://localhost:${s.address().port}/  (editor: /estudio/)${lan ? '  [--lan: la red solo lee; se guarda desde localhost]' : ''}`);
    }, e => {
        console.error(e.code === 'EADDRINUSE' ? `El puerto ${puerto} está ocupado (¿otro servidor?). Usa PORT=otro.` : String(e));
        process.exit(1);
    });
}
