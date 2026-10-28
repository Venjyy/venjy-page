// =========================================================
// VENJY · Supervivencia · Personas nuevas desde mundo/datos/personajes.json (Etapa B · B5, estudio/DISENO.md §41)
// registrarPersonajes (sin DOM, lo prueba mundo/tests/personajes.mjs) anota a cada persona nueva en lo que va por
// clave: nombre (NOMBRES_AMIGO: con eso el panel de misiones y «Hablar» la encuentran), color del globo, lista de
// amistad, regalos favoritos, relaciones (tabla de 6c) y horario base. crearPersonajes además le pide a amigos.js
// que la cree (amigos.agregar): entra a amigos.lista y rutinas, paseos, acompañante y Posiciones la ven como a todos.
// Lo de «Hablar» lo suma dialogos-datos.js (fusionarHablar). Las de `borrador` y las claves del código no se tocan.
// =========================================================
import { personasNuevas, nombreDe, globoDe, horarioDe } from '../datos/personajes.js';
import { NOMBRES_AMIGO } from './misiones-datos.js';
import { PERSONAJES, FAVORITOS, sumarRelacion, quitarRelacionesDe } from './amistad.js';
import { sumarHorarioBase, quitarHorarioBase } from './rutinas-datos.js';
import { O } from './objetos.js';
import { B } from '../texturas.js';

// Nombre de objeto como /dar (O o bloque)
export const idDeObjeto = nombre => { const k = String(nombre).toUpperCase(); return O[k] !== undefined ? O[k] : B[k]; };

let puestas = [];
// colores: COLOR_GLOBO de criaturas/cuerpo.js (se pasa desde fuera: cuerpo.js necesita el navegador)
export function registrarPersonajes(datos, { colores = {} } = {}) {
    for (const k of puestas) {
        delete NOMBRES_AMIGO[k]; delete colores[k]; delete FAVORITOS[k];
        quitarRelacionesDe(k); quitarHorarioBase(k);
        const i = PERSONAJES.indexOf(k);
        if (i >= 0) PERSONAJES.splice(i, 1);
    }
    puestas = [];
    for (const { clave, def } of personasNuevas(datos)) {
        NOMBRES_AMIGO[clave] = nombreDe(clave, def);
        colores[clave] = globoDe(def);
        if (!PERSONAJES.includes(clave)) PERSONAJES.push(clave);
        const favs = (Array.isArray(def.regalo) ? def.regalo : []).map(idDeObjeto).filter(id => id !== undefined);
        if (favs.length) FAVORITOS[clave] = favs;
        for (const [otra, nivel] of Object.entries(def.amigos || {})) if (Number.isInteger(nivel) && nivel > 0) sumarRelacion(clave, otra, nivel);
        sumarHorarioBase(clave, horarioDe(def));
        puestas.push(clave);
    }
    return puestas.slice();
}

// Registra y crea. Devuelve { claves, aplicar(datos) } (aplicar: el Estudio, en vivo, las rehace)
export function crearPersonajes(datos, { amigos, colores }) {
    let creadas = [];
    function aplicar(d) {
        for (const k of creadas) amigos.quitar(k);
        registrarPersonajes(d, { colores });
        creadas = personasNuevas(d).filter(({ clave, def }) => amigos.agregar(clave, def)).map(p => p.clave);
        return creadas.slice();
    }
    aplicar(datos);
    return { get claves() { return creadas.slice(); }, aplicar };
}
