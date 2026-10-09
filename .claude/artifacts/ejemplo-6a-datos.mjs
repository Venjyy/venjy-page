// EJEMPLO de referencia (ver GUIA.md): genera mundo/DIALOGOS.md y datos.json (para el Artifact) desde los módulos reales.
// Uso: node ejemplo-6a-datos.mjs <raíz del repo> <salida datos.json>
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const RAIZ = process.argv[2], SALIDA = process.argv[3];
const imp = p => import(pathToFileURL(`${RAIZ}/${p}`).href);
const { TEMAS, OPINIONES, SALUDOS, REGALOS } = await imp('mundo/supervivencia/dialogos-datos.js');
const { NIVELES, FAVORITOS, PUNTOS, DESCUENTO, inicialDe, nivelDe, relacion, PERSONAJES, RADIO_PELEA } = await imp('mundo/supervivencia/amistad.js');
const { MISIONES, JEFES, NOMBRES_AMIGO } = await imp('mundo/supervivencia/misiones-datos.js');
const { REQ_MINIJUEGOS } = await imp('mundo/supervivencia/minijuegos-datos.js');
const { nombreDe } = await imp('mundo/supervivencia/objetos.js');

const titulo = id => (MISIONES.find(m => m.id === id) || JEFES.find(j => j.id === id) || REQ_MINIJUEGOS[id] || {}).titulo?.es || id;
function req(r) {
    if (!r) return 'Libre';
    const p = [];
    if (r.nivel !== undefined) p.push(`Amistad: ${NIVELES[r.nivel].es}`);
    if (r.mision) p.push(`Misión «${titulo(r.mision)}»`);
    if (r.mj) p.push(`Minijuego: ${titulo(r.mj)}`);
    if (r.jefe) p.push(`Jefe: ${titulo(r.jefe)}`);
    return p.join(' + ');
}
const filas = []; // { personaje, tema, pregunta, es, en, desbloqueo, variante }
for (const c of PERSONAJES) {
    const s = SALUDOS[c];
    filas.push({ c, tema: 'Saludo', p: '(al abrir, nivel < Amigo)', es: s.bajo.es, en: s.bajo.en, req: 'Libre' });
    filas.push({ c, tema: 'Saludo', p: '(al abrir, Amigo o más)', es: s.alto.es, en: s.alto.en, req: 'Amistad: Amigo' });
    for (const [b, r] of Object.entries(s.skin || {})) filas.push({ c, tema: 'Saludo', p: '(al abrir)', es: r.es, en: r.en, req: 'Libre', skin: NOMBRES_AMIGO[b] });
    for (const t of TEMAS[c]) {
        if (t.id === 'opina') {
            for (const [o, r] of Object.entries(OPINIONES[c])) filas.push({ c, tema: 'Opina', p: `¿Qué opinas de ${NOMBRES_AMIGO[o]}?`, es: r.es, en: r.en, req: req(t.req), rel: relacion(c, o) });
            continue;
        }
        filas.push({ c, tema: t.id, p: t.p.es, es: t.r.es, en: t.r.en, req: req(t.req) });
        for (const [b, r] of Object.entries(t.skin || {})) filas.push({ c, tema: t.id, p: t.p.es, es: r.es, en: r.en, req: req(t.req), skin: NOMBRES_AMIGO[b] });
    }
    filas.push({ c, tema: 'Regalo', p: `(al regalar ${FAVORITOS[c].map(id => nombreDe(id, 'es')).join(' o ')})`, es: REGALOS[c].es, en: REGALOS[c].en, req: 'Libre' });
}

// Markdown
const esc = s => String(s).replace(/\|/g, '\\|');
let md = `# Diálogos de la pestaña «Hablar» (bloque 6a)\n\nGenerado desde \`mundo/supervivencia/dialogos-datos.js\` para que el dueño revise los textos antes del merge (${filas.length} frases ES/EN). Si cambias un texto, cámbialo en ese archivo; \`node mundo/tests/amistad.mjs\` comprueba que todas sigan únicas.\n\n`;
md += 'Columnas: **Pregunta** (botón), **Desbloqueo** (qué hace falta para que aparezca), **Skin** (si la respuesta cambia cuando tu skin parte de ese personaje), **ES** y **EN**.\n\n';
for (const c of PERSONAJES) {
    md += `## ${NOMBRES_AMIGO[c]}\n\n| Pregunta | Desbloqueo | Skin | ES | EN |\n|---|---|---|---|---|\n`;
    for (const f of filas.filter(x => x.c === c)) md += `| ${esc(f.p)} | ${esc(f.req)} | ${f.skin || ''} | ${esc(f.es)} | ${esc(f.en)} |\n`;
    md += '\n';
}
writeFileSync(`${RAIZ}/mundo/DIALOGOS.md`, md);

// Datos para el Artifact
const inicial = {};
for (const base of [null, ...PERSONAJES]) inicial[base || 'ninguna'] = Object.fromEntries(PERSONAJES.map(c => [c, inicialDe(base, c)]));
writeFileSync(SALIDA, JSON.stringify({ filas, nombres: NOMBRES_AMIGO, niveles: NIVELES, puntos: PUNTOS, descuento: DESCUENTO, radioPelea: RADIO_PELEA,
    favoritos: Object.fromEntries(PERSONAJES.map(c => [c, FAVORITOS[c].map(id => nombreDe(id, 'es'))])), inicial,
    nivelesIniciales: Object.fromEntries(Object.entries(inicial).map(([b, o]) => [b, Object.fromEntries(Object.entries(o).map(([c, p]) => [c, nivelDe(p)]))])) }, null, 1));
console.log(filas.length, 'filas');
