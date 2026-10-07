// =========================================================
// VENJY · Contenido del portafolio para el mundo 3D
// Una sola fuente: se lee el propio index.html (sus pares data-es / data-en), así los textos
// del mundo nunca se desactualizan ni se copian a mano. Lo que no está en index.html
// (el CV completo) vive en cv-datos.js.
// =========================================================

export async function cargarContenido() {
    let doc = null;
    try {
        const url = new URL('../../index.html', import.meta.url);
        const r = await fetch(url);
        if (r.ok) doc = new DOMParser().parseFromString(await r.text(), 'text/html');
    } catch (e) { /* sin red: el mundo funciona, solo sin los textos del portafolio */ }
    if (!doc) doc = new DOMParser().parseFromString('<html><body></body></html>', 'text/html');
    return crearAcceso(doc);
}

const limpiar = t => (t || '').replace(/\s+/g, ' ').trim();

function crearAcceso(doc) {
    // Texto bilingüe de un elemento: usa data-es / data-en y, si no los tiene, su texto
    const bi = el => {
        if (!el) return { es: '', en: '' };
        const es = el.getAttribute('data-es') ?? limpiar(el.textContent);
        const en = el.getAttribute('data-en') ?? es;
        return { es: limpiar(es), en: limpiar(en) };
    };
    const uno = (sel, raiz = doc) => raiz.querySelector(sel);
    const varios = (sel, raiz = doc) => Array.from(raiz.querySelectorAll(sel));
    return {
        doc, bi, uno, varios,
        // Texto bilingüe del primer elemento que cumple el selector
        texto: (sel, raiz = doc) => bi(uno(sel, raiz)),
        // Lista de textos bilingües
        textos: (sel, raiz = doc) => varios(sel, raiz).map(bi),
        // Enlace (href y etiqueta bilingüe)
        enlace: (sel, raiz = doc) => {
            const a = uno(sel, raiz);
            return a ? { url: a.getAttribute('href'), etiqueta: bi(a) } : null;
        }
    };
}
