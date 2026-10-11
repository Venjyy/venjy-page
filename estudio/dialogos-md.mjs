// =========================================================
// VENJY · Estudio · mundo/DIALOGOS.md desde mundo/datos/dialogos.json (fase 3)
// generarPersonas(datos, ctx) -> markdown de las 13 secciones «## Persona» (las tablas de «Hablar»).
// cargarContexto() trae del juego los nombres que usa la tabla (personas, niveles, misiones, jefes, minijuegos,
// objetos favoritos). `escribirEnDocumento(doc, md)` cambia solo esas secciones de DIALOGOS.md: las demás
// (saludos de amistad, momentos, bienvenidas, grupos…) vienen de otros archivos y no se tocan.
// =========================================================
const celda = s => String(s ?? '').replace(/\|/g, '\|').replace(/\r?\n/g, ' ');

export async function cargarContexto() {
    const imp = rel => import(new URL('../mundo/supervivencia/' + rel, import.meta.url).href);
    const { PERSONAJES, NIVELES, FAVORITOS } = await imp('amistad.js');
    const { NOMBRES_AMIGO, MISIONES, JEFES } = await imp('misiones-datos.js');
    const { REQ_MINIJUEGOS } = await imp('minijuegos-datos.js');
    const { nombreDe } = await imp('objetos.js');
    const titulos = new Map();
    for (const m of MISIONES) titulos.set(m.id, m.titulo.es);
    for (const j of JEFES) titulos.set(j.id, j.titulo.es);
    for (const [k, v] of Object.entries(REQ_MINIJUEGOS)) titulos.set(k, v.titulo.es);
    return {
        personas: PERSONAJES,
        nombre: c => NOMBRES_AMIGO[c] || c,
        nivel: n => (NIVELES[n] || {}).es || String(n),
        titulo: id => titulos.get(id) || id,
        favoritos: c => (FAVORITOS[c] || []).map(id => nombreDe(id, 'es')).join(' o ')
    };
}

function desbloqueo(req, ctx) {
    if (!req) return 'Libre';
    if (req.nivel !== undefined) return `Amistad: ${ctx.nivel(req.nivel)}`;
    if (req.mision) return `Misión «${ctx.titulo(req.mision)}»`;
    if (req.mj) return `Minijuego: ${ctx.titulo(req.mj)}`;
    if (req.jefe) return `Jefe: ${ctx.titulo(req.jefe)}`;
    return 'Libre';
}

const rev = t => (t && t.revisado ? 'sí' : '');

export function generarPersonas(datos, ctx) {
    const salida = [];
    const orden = [...ctx.personas, ...Object.keys(datos.temas).filter(c => !ctx.personas.includes(c))];
    for (const clave of orden) {
        const temas = datos.temas[clave];
        if (!temas) continue;
        const filas = [];
        const fila = (pregunta, req, skin, t) => filas.push(`| ${celda(pregunta)} | ${celda(req)} | ${celda(skin)} | ${celda(t.es)} | ${celda(t.en)} | ${rev(t)} |`);
        const s = datos.saludos[clave];
        if (s) {
            fila('(al abrir, nivel < Amigo)', 'Libre', '', s.bajo);
            fila('(al abrir, Amigo o más)', 'Amistad: Amigo', '', s.alto);
            for (const [base, t] of Object.entries(s.skin || {})) fila('(al abrir)', 'Libre', ctx.nombre(base), t);
        }
        for (const tema of temas) {
            if (tema.id === 'opina' && !tema.r) {
                for (const [de, t] of Object.entries(datos.opiniones[clave] || {})) fila(`¿Qué opinas de ${ctx.nombre(de)}?`, desbloqueo(tema.req, ctx), '', t);
                continue;
            }
            if (!tema.r) continue;
            fila(tema.p.es, desbloqueo(tema.req, ctx), '', tema.r);
            for (const [base, t] of Object.entries(tema.skin || {})) fila(tema.p.es, desbloqueo(tema.req, ctx), ctx.nombre(base), t);
        }
        if (datos.regalos[clave]) fila(`(al regalar ${ctx.favoritos(clave) || '?'})`, 'Libre', '', datos.regalos[clave]);
        salida.push(`## ${ctx.nombre(clave)}\n\n| Pregunta | Desbloqueo | Skin | ES | EN | Revisado |\n|---|---|---|---|---|---|\n${filas.join('\n')}\n`);
    }
    return salida.join('\n');
}

export function contarFrases(datos) {
    let n = 0;
    const sumar = t => { if (t && typeof t.es === 'string') n++; };
    for (const lista of Object.values(datos.temas)) for (const tema of lista) { sumar(tema.p); sumar(tema.r); for (const t of Object.values(tema.skin || {})) sumar(t); }
    for (const m of Object.values(datos.opiniones)) for (const t of Object.values(m)) sumar(t);
    for (const s of Object.values(datos.saludos)) { sumar(s.bajo); sumar(s.alto); for (const t of Object.values(s.skin || {})) sumar(t); }
    for (const t of Object.values(datos.regalos)) sumar(t);
    return n;
}

// Reemplaza desde la primera sección de persona hasta la anterior a «## Saludos de amigos». Devuelve el documento nuevo.
export function escribirEnDocumento(doc, md) {
    const fin = doc.indexOf('\n## Saludos de amigos');
    const ini = doc.search(/\n## [^\n]+\n\n\| Pregunta \|/);
    if (ini < 0 || fin < 0 || fin < ini) throw new Error('DIALOGOS.md: no encuentro las secciones de personas ni «## Saludos de amigos»');
    const intro = doc.slice(0, ini + 1).replace(/Generado desde `mundo\/supervivencia\/dialogos-datos\.js`[^\n]*/,
        'Las secciones de cada persona se generan desde `mundo/datos/dialogos.json` con `node estudio/cli.mjs resumen dialogos --md --escribir`; los textos se editan en `/estudio/` (pestaña Textos) o en ese JSON. La columna **Revisado** dice si el dueño ya aprobó el par ES/EN. `node mundo/tests/amistad.mjs` comprueba que todas las frases sigan únicas.');
    return intro + md.trimEnd() + '\n' + doc.slice(fin);
}
