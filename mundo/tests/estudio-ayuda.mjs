// Prueba de la ayuda y los grupos de pestañas del Estudio (Etapa B, 0b · B0): node mundo/tests/estudio-ayuda.mjs
// Cada pestaña de la barra tiene su ayuda en ES y EN, está en un solo grupo y en el orden de GRUPOS; los botones que
// nombra la ayuda entre «…» existen con ese nombre; sin emojis; la vista cae en Simple si no se conoce.
// Lo que se ve (la franja, los grupos y esconder lo avanzado) lo mira el dueño.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AYUDA, GRUPOS, VISTAS, textoAyuda, vistaValida } from '../../estudio/ayuda-modelo.mjs';

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = fs.readFileSync(path.join(RAIZ, 'estudio', 'index.html'), 'utf8');
const nav = html.slice(html.indexOf('<nav class="pestanas"'), html.indexOf('</nav>'));
const enBarra = [...nav.matchAll(/class="pestana[^"]*"[^>]*data-pestana="([a-z]+)"/g)].map(m => m[1]);
const enGrupos = GRUPOS.flatMap(g => g[3]);

ok(enBarra.length >= 18, 'la barra tiene todas las pestañas');
ok(JSON.stringify(enBarra) === JSON.stringify(enGrupos), 'la barra sigue el orden de GRUPOS: ' + enBarra.join(','));
ok(new Set(enGrupos).size === enGrupos.length, 'cada pestaña está en un solo grupo');
for (const [k, es, en] of GRUPOS) ok(nav.includes(`data-grupo="${k}" data-es="${es}" data-en="${en}"`), 'rótulo del grupo ' + k);

// Textos que el código de las pestañas muestra (para comprobar los nombres de botón entre «…»)
const fuentes = html + fs.readdirSync(path.join(RAIZ, 'estudio')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(RAIZ, 'estudio', f), 'utf8')).join('\n');
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
for (const p of enBarra) {
    const a = AYUDA[p];
    ok(!!a, 'ayuda de ' + p);
    if (!a) continue;
    for (const campo of ['que', 'empezar']) {
        const [es, en] = a[campo] || [];
        ok(typeof es === 'string' && es.length > 10 && typeof en === 'string' && en.length > 10, `${p}.${campo} con ES y EN`);
        ok(!emoji.test(es + en), `${p}.${campo} sin emojis`);
        ok((es.match(/«/g) || []).length === (en.match(/«/g) || []).length, `${p}.${campo}: los mismos botones en ES y EN`);
        for (const m of es.matchAll(/«([^»]+)»/g)) {
            const nombre = m[1];
            const grupo = GRUPOS.some(g => g[1] === nombre);
            ok(grupo || fuentes.includes(`"${nombre}`) || fuentes.includes(`'${nombre}`) || fuentes.includes(`>${nombre}`), `${p}: el botón «${nombre}» existe`);
        }
    }
    const t = textoAyuda(p, 'en');
    ok(t && t.que === a.que[1] && t.empezar === a.empezar[1], 'textoAyuda en inglés de ' + p);
}
ok(Object.keys(AYUDA).every(k => enBarra.includes(k)), 'no hay ayuda de pestañas que no existen');
ok(textoAyuda('nada') === null, 'pestaña sin ayuda: null');
ok(textoAyuda('juego').que === AYUDA.juego.que[0], 'idioma por defecto: español');
ok(VISTAS.includes('simple') && VISTAS.includes('avanzado'), 'vistas');
ok(vistaValida('avanzado') === 'avanzado' && vistaValida('rara') === 'simple' && vistaValida(null) === 'simple', 'vista desconocida = simple');
// La barra tiene los botones de vista y ayuda; lo avanzado del Combate queda marcado
ok(/data-vista="simple"/.test(html) && /data-vista="avanzado"/.test(html) && html.includes('id="ayuda-alternar"') && html.includes('id="ayuda-pestana"'), 'botones de vista y ayuda en la barra');
ok(/solo-avanzado/.test(fs.readFileSync(path.join(RAIZ, 'estudio', 'combate.js'), 'utf8')) && /solo-avanzado/.test(fs.readFileSync(path.join(RAIZ, 'estudio', 'combate-paneles.js'), 'utf8')), 'Avanzado del Combate marcado');
ok(/body\[data-vista="simple"\] \.solo-avanzado/.test(fs.readFileSync(path.join(RAIZ, 'estudio', 'estudio.css'), 'utf8')), 'CSS esconde lo avanzado en Simple');

console.log(`estudio-ayuda: ${pruebas - fallos}/${pruebas} bien`);
if (fallos) process.exit(1);
