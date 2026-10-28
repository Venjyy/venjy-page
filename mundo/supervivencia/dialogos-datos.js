// =========================================================
// VENJY · Supervivencia · Diálogos de la pestaña «Hablar» (bloque 6a) · fachada del JSON (Estudio, fase 3)
// Los textos viven en mundo/datos/dialogos.json (esquema: estudio/esquemas/dialogos.schema.json) y se editan
// en /estudio/ (pestaña Textos). Este módulo solo los lee y exporta lo mismo de siempre. Se carga con import()
// dinámico la primera vez que abres «Hablar» (hablar.js): no suma a la carga inicial.
// TEMAS[clave]: lista de { id, p: pregunta, r: respuesta, g?: gesto, req?: requisito, skin?: { base: respuesta } }
//   · req: { nivel } (de amistad, 0-4), { mision: id }, { mj: juego o marca de minijuego }, { jefe: id }.
//   · skin: respuesta distinta si tu skin parte de esa base (tipoSkin en escenas-skin.js).
//   · El tema `opina` abre la lista de OPINIONES (solo de quienes conoce, según la tabla de relaciones de 6c).
// SALUDOS: lo primero que dice al abrir «Hablar» (bajo: nivel < Amigo · alto: Amigo o más · skin: por base).
// REGALOS: lo que dice al recibir su objeto favorito (FAVORITOS en amistad.js). GESTO_REGALO: su gesto.
// Cada texto es { es, en } y puede traer `revisado: true`. Son personas reales: el dueño revisa los textos
// (mundo/DIALOGOS.md se regenera con `node estudio/cli.mjs resumen dialogos --md --escribir`).
// Sin el JSON no hay diálogos: aquí el archivo ES la fuente, no un ajuste sobre el código (a diferencia de ui-layout).
// B5: las personas nuevas de mundo/datos/personajes.json traen su «Hablar» (bloque `hablar`, mismo formato); se suman
// con fusionarHablar sin pisar lo que ya esté en dialogos.json. Sin personajes.json, nada cambia.
// =========================================================
import { fusionarHablar } from '../datos/personajes.js';

const ARCHIVO = new URL('../datos/dialogos.json', import.meta.url);
const ARCHIVO_PERSONAJES = new URL('../datos/personajes.json', import.meta.url);

// En el navegador, fetch; en Node (pruebas y CLI), el archivo directo.
async function leer(archivo = ARCHIVO) {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
        const { readFileSync } = await import('node:fs');
        return JSON.parse(readFileSync(archivo, 'utf8'));
    }
    const r = await fetch(archivo, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${archivo.pathname.split('/').pop()}: HTTP ${r.status}`);
    return r.json();
}

let dialogosBase = await leer();
let personajes = await leer(ARCHIVO_PERSONAJES).catch(() => null);
const datos = fusionarHablar(dialogosBase, personajes);

export const TEMAS = datos.temas;
export const OPINIONES = datos.opiniones;
export const SALUDOS = datos.saludos;
export const REGALOS = datos.regalos;
// Gesto al recibir el regalo (por defecto, risa)
export const GESTO_REGALO = datos.gestoRegalo || {};

// Cambia el contenido en el sitio (los objetos exportados siguen siendo los mismos): lo usa el puente del
// Estudio (?estudio) para ver un texto editado sin recargar. hablar.js lee estos objetos al usarlos.
export function aplicarDatosVivos(crudo) {
    dialogosBase = crudo;
    const nuevo = fusionarHablar(crudo, personajes);
    const poner = (destino, origen) => {
        for (const k of Object.keys(destino)) delete destino[k];
        Object.assign(destino, origen || {});
    };
    poner(TEMAS, nuevo.temas);
    poner(OPINIONES, nuevo.opiniones);
    poner(SALUDOS, nuevo.saludos);
    poner(REGALOS, nuevo.regalos);
    poner(GESTO_REGALO, nuevo.gestoRegalo);
}
// B5: personajes.json cambió en el Estudio (o se guardó): vuelve a sumar su «Hablar»
export function aplicarPersonajes(datosPersonajes) {
    personajes = datosPersonajes;
    aplicarDatosVivos(dialogosBase);
}
