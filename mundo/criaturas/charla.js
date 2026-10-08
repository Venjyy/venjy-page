// =========================================================
// VENJY · Conversaciones de grupo entre NPCs
// Un guion de turnos { quien, es, en, evento? }: cuando el jugador se acerca, cada turno
// aparece en el globo de quien habla y avanza solo. Quien habla gesticula y los demás
// lo miran (lo leen las animaciones con `hablando`). Al alejarse se pausa; tras un rato
// lejos vuelve al principio.
// =========================================================

export function crearCharla(guion, { radio = 9, alEvento = null } = {}) {
    let i = 0, t = 0, activa = false, lejos = 0, idioma = 'es';
    const duracion = turno => 2.4 + turno.es.length * 0.045;
    return {
        get hablando() { return activa ? guion[i].quien : null; },
        get turno() { return activa ? guion[i] : null; },
        texto(quien) { return activa && guion[i].quien === quien ? guion[i][idioma] : ''; },
        setIdioma(id) { idioma = id; },
        // d: distancia del jugador al centro del grupo
        actualizar(dt, d) {
            if (d > radio) {
                activa = false;
                lejos += dt;
                if (lejos > 25) { i = 0; t = 0; }
                return;
            }
            lejos = 0;
            if (!activa) { activa = true; t = 0; if (alEvento && guion[i].evento) alEvento(guion[i].evento, guion[i].quien); }
            t += dt;
            if (t >= duracion(guion[i])) {
                i = (i + 1) % guion.length; t = 0;
                if (alEvento && guion[i].evento) alEvento(guion[i].evento, guion[i].quien);
            }
        }
    };
}
