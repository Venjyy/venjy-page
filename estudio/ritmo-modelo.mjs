// =========================================================
// VENJY · Estudio · pestaña Ritmo: modelo puro (S10a)
// Sin DOM: la pestaña (ritmo.js) y la prueba (mundo/tests/ritmo.mjs) comparten estas funciones.
// La partitura sale sola del bajo (salonas-partitura.js); aquí solo se arma lo que la línea de tiempo dibuja y se
// llevan los ajustes a mano de salonas.json → ajustes.<canción>.<dificultad>.<compás:paso> = carril (0..n-1) | null
// (null = quitar la nota). Un ajuste nunca cambia cuándo suena una nota, solo dónde cae o si se juega.
// =========================================================
import { partitura, revisarPartitura, reglasDe, DIFICULTADES } from '../mundo/supervivencia/salonas-partitura.js';

export { DIFICULTADES };

const clonar = o => JSON.parse(JSON.stringify(o));

// Ajustes de una canción y dificultad ({} si no hay).
export function ajustesDe(ajustes, cancion, dificultad) {
    const a = ajustes && ajustes[cancion] && ajustes[cancion][dificultad];
    return a && typeof a === 'object' ? a : {};
}

// Copia de `ajustes` con la nota `clave` puesta en `valor`: un carril, null (quitar) o undefined (volver a la generada).
// Un carril igual al generado no se guarda, y los objetos que quedan vacíos se podan. No cambia el original.
export function ponerAjuste(ajustes, cancion, dificultad, clave, valor, carrilBase) {
    const sal = clonar(ajustes || {});
    if (valor === undefined || valor === carrilBase) {
        const d = sal[cancion] && sal[cancion][dificultad];
        if (d) delete d[clave];
    } else {
        sal[cancion] = sal[cancion] || {};
        sal[cancion][dificultad] = sal[cancion][dificultad] || {};
        sal[cancion][dificultad][clave] = valor;
    }
    for (const c of Object.keys(sal)) {
        for (const d of Object.keys(sal[c])) if (!Object.keys(sal[c][d]).length) delete sal[c][d];
        if (!Object.keys(sal[c]).length) delete sal[c];
    }
    return sal;
}

// Lo que dibuja la línea de tiempo: la partitura ya ajustada, cada nota con su carril generado (`base`) y si el dueño
// la movió (`movida`), más las notas quitadas a mano (`quitadas`, con su carril generado, para poder devolverlas).
export function armar(clave, cancion, dificultad, reglasJson, ajustes, tempo = 1) {
    const reglas = reglasDe(reglasJson);
    const mia = ajustesDe(ajustes, clave, dificultad);
    const generada = partitura(cancion, dificultad, reglas, { tempo });
    const ajustada = partitura(cancion, dificultad, reglas, { tempo, ajustes: mia });
    const porClave = new Map(generada.notas.map(n => [n.clave, n]));
    const notas = ajustada.notas.map(n => {
        const g = porClave.get(n.clave);
        return { ...n, base: g ? g.carril : n.carril, movida: !!g && g.carril !== n.carril };
    });
    const vivas = new Set(notas.map(n => n.clave));
    const quitadas = generada.notas.filter(n => !vivas.has(n.clave)).map(n => ({ ...n, base: n.carril, movida: false, quitada: true }));
    return { dificultad, carriles: ajustada.carriles, duracion: ajustada.duracion, secciones: ajustada.secciones, notas, quitadas };
}

// «Revisar partitura» listo para pintar: cada aviso con su texto, gravedad y sección (n), de lo grave a lo suave.
export function revisar(clave, cancion, reglasJson, ajustes, tempo = 1) {
    const mias = ajustes && ajustes[clave] ? ajustes[clave] : {};
    const avisos = revisarPartitura(cancion, reglasDe(reglasJson), { tempo, ajustes: mias });
    return avisos.slice().sort((a, b) => Number(b.grave) - Number(a.grave));
}

// Cuántos ajustes tiene una canción (todas las dificultades), para el rótulo del selector.
export function contarAjustes(ajustes, cancion) {
    const c = ajustes && ajustes[cancion];
    return c ? Object.values(c).reduce((a, d) => a + Object.keys(d).length, 0) : 0;
}
