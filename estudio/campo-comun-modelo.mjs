// =========================================================
// VENJY · Estudio · campo común, modelo puro (Etapa B, 0b · B0-C)
// Historial para deshacer por instantáneas de texto (sirve a cualquier pestaña que guarde un JSON) y borrado de una
// ruta del JSON para «volver al valor del juego». Sin DOM: lo prueba mundo/tests/campo-comun.mjs.
// =========================================================

// Historial por instantáneas. `anotar(actual)` se llama tras cada cambio con la instantánea nueva: si cambió, guarda la
// anterior. Los cambios seguidos (un slider que se arrastra) caen en una sola entrada si pasan menos de `junta` ms.
export function crearHistorial({ limite = 100, junta = 400, ahora = () => Date.now() } = {}) {
    const pila = [];
    let ultimo = null, tUltimo = -Infinity;
    return {
        // Primera instantánea (o tras cargar/guardar a mano): no cuenta como cambio
        fijar(actual) { ultimo = actual; },
        anotar(actual) {
            if (ultimo === null) { ultimo = actual; return false; }
            if (actual === ultimo) return false;
            const t = ahora();
            if (!pila.length || t - tUltimo >= junta) { pila.push(ultimo); if (pila.length > limite) pila.shift(); }
            tUltimo = t; ultimo = actual;
            return true;
        },
        // Devuelve la instantánea anterior (o null si no hay) y la deja como la actual
        deshacer() {
            if (!pila.length) return null;
            ultimo = pila.pop(); tUltimo = -Infinity;
            return ultimo;
        },
        vaciar() { pila.length = 0; tUltimo = -Infinity; },
        get largo() { return pila.length; }
    };
}

// ¿Existe la ruta en el JSON?
export function tieneRuta(datos, ruta) {
    let o = datos;
    for (const k of ruta) { if (o == null || typeof o !== 'object' || !(k in o)) return false; o = o[k]; }
    return true;
}

// Borra la clave de la ruta (el juego vuelve a usar el valor del código) y los objetos que queden vacíos por el camino.
// Devuelve true si borró algo. Una ruta que pasa por una lista borra solo el elemento final si es una clave de objeto.
export function quitarRuta(datos, ruta) {
    if (!ruta.length || !tieneRuta(datos, ruta)) return false;
    const camino = [datos];
    for (const k of ruta.slice(0, -1)) camino.push(camino[camino.length - 1][k]);
    const ultimo = camino[camino.length - 1];
    if (Array.isArray(ultimo)) return false;
    delete ultimo[ruta[ruta.length - 1]];
    for (let i = ruta.length - 2; i >= 0; i--) {
        const o = camino[i + 1];
        if (Array.isArray(o) || Object.keys(o).length) break;
        delete camino[i][ruta[i]];
    }
    return true;
}
