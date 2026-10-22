// =========================================================
// VENJY · Estudio · campo común (Etapa B, 0b · B0-C)
// Tres piezas que comparten todas las pestañas con un JSON propio:
//   · deshacer (botón «Deshacer» junto a «Descartar cambios» y Ctrl+Z): `instalarDeshacer`
//   · punto en el botón de la pestaña cuando hay cambios sin guardar: `ctx.sucios[clave] = sucio` (lo pinta estudio.js)
//   · «volver al valor del juego» en los campos numéricos: `botonJuego` (borra la clave del JSON)
// Modelo puro (sin DOM): campo-comun-modelo.mjs.
// =========================================================
import { crearHistorial, tieneRuta, quitarRuta } from './campo-comun-modelo.mjs';

export { tieneRuta, quitarRuta };

const escribiendo = el => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['range', 'checkbox', 'color', 'button'].includes(el.type)));

// Deshacer para una pestaña. `pestana` = data-pestana, `idBoton` = id del botón «Descartar cambios» (el de deshacer
// se pone justo antes; con `adopta` = id de un botón «Deshacer» que la pestaña ya tenía, se usa ese), `leer()` = texto con todo lo editable, `poner(texto)` = lo devuelve a las pestañas y las repinta.
// Devuelve `anotar()`: llamarlo al final del `cambio()` de la pestaña (y tras cargar, `anotar()` ya fija la base).
export function instalarDeshacer(ctx, { pestana, idBoton, adopta, leer, poner }) {
    const hist = crearHistorial();
    let restaurando = false;
    const descartar = document.getElementById(idBoton);
    const propio = adopta ? document.getElementById(adopta) : null;
    const b = propio || document.createElement('button');
    b.disabled = true;
    if (!propio) {
        b.type = 'button'; b.className = descartar ? descartar.className : 'boton chico secundario';
        b.dataset.es = 'Deshacer'; b.dataset.en = 'Undo'; b.title = 'Ctrl+Z';
        b.textContent = ctx.idioma === 'en' ? 'Undo' : 'Deshacer';
        if (descartar) descartar.before(b);
    }
    const refrescar = () => { b.disabled = !hist.largo; };
    function anotar() {
        if (restaurando) return;
        hist.anotar(leer());
        refrescar();
    }
    function deshacer() {
        const antes = hist.deshacer();
        if (antes === null) return;
        restaurando = true;
        try { poner(antes); } finally { restaurando = false; }
        refrescar();
    }
    b.addEventListener('click', deshacer);
    window.addEventListener('keydown', e => {
        if (ctx.pestana !== pestana || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
        if (escribiendo(e.target)) return; // en un campo de texto manda el deshacer del propio campo
        e.preventDefault(); deshacer();
    });
    hist.fijar(leer());
    return { anotar, deshacer, vaciar: () => { hist.vaciar(); hist.fijar(leer()); refrescar(); } };
}

// Botón «Del juego» para un campo numérico. `tiene()` dice si el JSON ya trae la clave (si no, ya manda el valor del juego y
// el botón queda apagado); `quitar()` la borra; `repintar()` vuelve a dibujar la pestaña con el valor del código.
export function botonJuego(ctx, { tiene, quitar, repintar }) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'boton chico secundario volver-juego';
    b.dataset.es = 'Del juego'; b.dataset.en = 'Game value';
    b.textContent = ctx.idioma === 'en' ? 'Game value' : 'Del juego';
    const titulo = () => (ctx.idioma === 'en' ? 'Back to the game value (removes this setting from the file)' : 'Volver al valor del juego (quita este ajuste del archivo)');
    b.title = titulo();
    b.disabled = !tiene();
    b.addEventListener('click', () => { quitar(); if (repintar) repintar(); else b.disabled = true; });
    return b;
}
