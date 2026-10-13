// =========================================================
// VENJY · Estudio · el juego no atrapa el mouse (Hito 1, punto 14)
// Solo se importa con ?estudio (puente-juego.js), cuando el mundo ya está listo.
// En el juego normal, Esc suelta el puntero y abre la pausa, que tapa toda la vista; al editar eso estorba. Aquí:
//   - al soltar el puntero (Esc) no se abre la pausa: queda una etiqueta chica abajo a la derecha («Mouse suelto»);
//     un clic en el juego o en la etiqueta lo vuelve a tomar. La partida sigue corriendo y se ve completa;
//   - el chat (T o /) se cierra solo cuando el juego pierde el foco (se hace clic en el Estudio), así su franja
//     no queda tapando la vista;
//   - «Haz clic para seguir jugando» (.clic-seguir) no aparece: lo reemplaza la etiqueta.
// El puntero libre del gizmo y de las escenas (puntero-libre.js) se apila encima sin problema: guarda este gancho y lo devuelve.
// =========================================================
const TEXTOS = {
    es: 'Mouse suelto · haz clic en el juego para seguir',
    en: 'Mouse released · click the game to continue'
};

export function soltarSinPausa(venjy) {
    const J = venjy.jugador, lienzo = venjy.renderer.domElement;
    const estilo = document.createElement('style');
    estilo.textContent = `
.estudio-suelto { position: fixed; right: 10px; bottom: 10px; z-index: 44; padding: 6px 10px; cursor: pointer; font-family: 'PixelCraft', monospace; font-size: 0.8rem; color: #fff;
    background: rgb(16 10 6 / 0.75); border: 2px solid #000; box-shadow: inset 2px 2px 0 rgb(139 139 139 / 0.5), inset -2px -2px 0 rgb(55 55 55 / 0.8); text-shadow: 1px 1px 0 #3f3f3f; }
.estudio-suelto[hidden] { display: none !important; }
.clic-seguir { display: none !important; }`;
    document.head.appendChild(estilo);
    const etiqueta = document.createElement('div');
    etiqueta.className = 'estudio-suelto';
    etiqueta.hidden = true;
    document.body.appendChild(etiqueta);
    const idioma = () => (document.documentElement.lang === 'en' ? 'en' : 'es');
    const tomar = () => { etiqueta.hidden = true; try { const r = lienzo.requestPointerLock(); if (r && r.catch) r.catch(() => { etiqueta.hidden = false; }); } catch (e) { etiqueta.hidden = false; } };
    etiqueta.addEventListener('click', tomar);
    lienzo.addEventListener('mousedown', () => { if (!etiqueta.hidden && !J.activo) tomar(); });

    const original = J.alCambiarActivo;
    J.alCambiarActivo = activo => {
        if (original) original(activo);
        if (activo) { etiqueta.hidden = true; return; }
        const pausa = document.getElementById('pausa');
        if (pausa && !pausa.hidden) {
            // El juego abrió la pausa porque no había ninguna ventana: se esconde y se deja la etiqueta
            document.getElementById('inicio').hidden = true;
            pausa.hidden = true;
            document.getElementById('hud').hidden = false;
            etiqueta.textContent = TEXTOS[idioma()];
            etiqueta.hidden = false;
        }
    };
    // El chat sin foco no sirve: se cierra para que su franja no quede sobre la vista
    window.addEventListener('blur', () => { if (venjy.consola && venjy.consola.abierta) venjy.consola.cerrar(); });
    return { etiqueta, tomar };
}
