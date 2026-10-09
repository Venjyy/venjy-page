// =========================================================
// VENJY · Supervivencia · Escena del guardián del cofre de compañero
// PROVISIONAL: lo reemplaza la escena animada (ver cofres-companeros.js para la interfaz).
// =========================================================
export function crearEscenaGuardian(ctx) {
    let idioma = ctx.idioma || 'es';
    return {
        get activa() { return false; },
        // cofre: { g, tapa, base, x, y, z, yaw, perfil: { nombre, skin }, compartido, alTerminar }
        iniciar(cofre) {
            if (cofre.compartido) return false;
            ctx.hud.mensaje(idioma === 'en' ? `${cofre.perfil.nombre} left this locked.` : `${cofre.perfil.nombre} lo dejó cerrado.`, 3);
            return true;
        },
        actualizar() {},
        setIdioma(v) { idioma = v; }
    };
}
