// =========================================================
// VENJY · Estudio · cáscara: idioma ES/EN, estado del servidor y pestañas
// Cada fase suma una pestaña (estudio/DISENO.md §4). Fase 1: Layout. Fase 2: Juego. Fase 3: Textos.
// =========================================================
import { montarLayout } from './layout.js';
import { montarJuego } from './juego.js';
import { montarTextos } from './textos.js';
import { montarPosiciones } from './posiciones.js';
import { crearCliente } from './puente-cliente.js';

const ctx = {
    idioma: 'es',
    zonaSegura: false,
    servidor: { escritura: false },
    alIdioma: [],
    pestana: 'layout',
    alPestana: [], // f(clave) al cambiar de pestaña (posiciones pone y quita el gizmo)
    puente: crearCliente(), // canal con el juego (fase 2); layout.js manda cada cambio por aquí
    juego: null
};

function idiomaGuardado() {
    try {
        const g = localStorage.getItem('preferredLanguage');
        if (g === 'es' || g === 'en') return g;
    } catch (e) { /* sin almacenamiento */ }
    return (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
}

function aplicarIdioma(idioma) {
    ctx.idioma = idioma;
    document.documentElement.lang = idioma;
    for (const el of document.querySelectorAll('[data-es]')) {
        const t = el.dataset[idioma] || el.dataset.es;
        if (el.children.length === 0 || el.tagName === 'OPTION') el.textContent = t;
    }
    for (const b of document.querySelectorAll('[data-idioma]')) b.classList.toggle('activo', b.dataset.idioma === idioma);
    try { localStorage.setItem('preferredLanguage', idioma); } catch (e) { /* sin almacenamiento */ }
    for (const f of ctx.alIdioma) f(idioma);
}

async function buscarServidor() {
    const estado = document.getElementById('estado-servidor');
    try {
        const r = await fetch('../api/estudio', { cache: 'no-store' });
        const j = await r.json();
        ctx.servidor.escritura = !!(r.ok && j && j.escritura);
    } catch (e) {
        ctx.servidor.escritura = false;
    }
    estado.classList.toggle('ok', ctx.servidor.escritura);
    estado.classList.toggle('solo-lectura', !ctx.servidor.escritura);
    estado.dataset.es = ctx.servidor.escritura ? 'Servidor del Estudio: se puede guardar' : 'Solo lectura: abre con node estudio/servidor.mjs para guardar';
    estado.dataset.en = ctx.servidor.escritura ? 'Studio server: saving enabled' : 'Read-only: open with node estudio/servidor.mjs to save';
    estado.textContent = estado.dataset[ctx.idioma];
}

for (const b of document.querySelectorAll('[data-idioma]')) b.addEventListener('click', () => aplicarIdioma(b.dataset.idioma));
// el estado del servidor se cuenta antes de aplicar el idioma, para que se traduzca con el resto
aplicarIdioma(idiomaGuardado());
await buscarServidor();
await montarLayout(ctx);
montarJuego(ctx);
await montarTextos(ctx);
await montarPosiciones(ctx);

// Pestañas: cada una enseña la sección #seccion-<clave> (la del juego carga el iframe la primera vez).
// Posiciones comparte la sección del juego (el gizmo se arrastra en el juego): data-seccion="juego" y el panel propio.
for (const b of document.querySelectorAll('.pestana[data-pestana]')) {
    b.addEventListener('click', () => {
        const anterior = ctx.pestana;
        const seccion = b.dataset.seccion || b.dataset.pestana;
        for (const o of document.querySelectorAll('.pestana[data-pestana]')) o.classList.toggle('activa', o === b);
        for (const sec of document.querySelectorAll('main.seccion')) sec.hidden = sec.id !== 'seccion-' + seccion;
        ctx.pestana = b.dataset.pestana;
        document.getElementById('panel-posiciones').hidden = ctx.pestana !== 'posiciones';
        if (seccion === 'juego') ctx.juego.activar();
        if (anterior !== ctx.pestana) for (const f of ctx.alPestana) f(ctx.pestana);
        window.dispatchEvent(new Event('resize')); // el editor de layout mide la vista al volver
    });
}
