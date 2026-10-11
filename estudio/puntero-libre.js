// =========================================================
// VENJY · Estudio · puntero libre dentro del juego (fases 4 y 5)
// Solo se importa con ?estudio (gizmo-juego.js y puente-juego.js). Mientras el Estudio edita sobre el juego (gizmo de
// posiciones, línea de tiempo de escenas) el mouse tiene que quedar suelto: el juego pide el puntero al abrir el mundo,
// al empezar una escena y al terminarla, y un puntero capturado se come los clics del editor. Con esto puesto:
//   - lienzo.requestPointerLock no hace nada (no se recaptura al hacer clic ni al terminar una escena);
//   - la pausa no se abre al soltar el puntero (J.alCambiarActivo solo avisa cuando se activa);
//   - «Haz clic para seguir jugando» (.clic-seguir) se esconde.
// Con cuenta: el gizmo y las escenas lo piden por separado y el juego vuelve a la normalidad al soltarlo el último.
// =========================================================
let cuenta = 0;
let guardado = null; // { pedir, activo, estilo }

export function liberar(venjy) {
    if (cuenta++ > 0) return;
    const J = venjy.jugador, lienzo = venjy.renderer.domElement;
    guardado = { pedir: lienzo.requestPointerLock, activo: J.alCambiarActivo, estilo: document.createElement('style') };
    lienzo.requestPointerLock = () => Promise.resolve();
    J.alCambiarActivo = activo => { if (activo && guardado.activo) guardado.activo(activo); };
    if (document.pointerLockElement) document.exitPointerLock();
    if (guardado.activo) guardado.activo(true); // esconde una pausa que ya estuviera abierta
    guardado.estilo.textContent = '.clic-seguir { display: none !important; }';
    document.head.appendChild(guardado.estilo);
}

export function devolver(venjy) {
    if (cuenta === 0 || --cuenta > 0) return;
    venjy.renderer.domElement.requestPointerLock = guardado.pedir;
    venjy.jugador.alCambiarActivo = guardado.activo;
    guardado.estilo.remove();
    guardado = null;
}

export const liberado = () => cuenta > 0;
