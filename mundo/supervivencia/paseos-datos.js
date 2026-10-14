// =========================================================
// VENJY · Supervivencia · Ajustes de los paseos (6d etapa 2), sin three.js ni DOM
// Valores del código + mundo/datos/navegacion.json: `caminar` va a mundo/navegacion.js (buscar camino y
// caminante) y `paseo` a PASEO_BASE (cómo caminan y vuelven los amigos, paseos.js). Lo leen el juego, el
// Estudio (pestaña Vida) y las pruebas de Node.
// =========================================================
import { fijarNavegacion } from '../navegacion.js';

export const PASEO_BASE = {
    amplitud: 0.6,          // cuánto balancea piernas y brazos al caminar
    acomodar: 0.5,          // segundos para acomodarse en su sitio exacto al volver
    reintento: 4,           // sin camino y a la vista: segundos antes de volver a intentarlo
    distanciaVisita: 1.8,   // a qué distancia de la persona que visita se queda
    mirarJugador: 5         // de pie y sin a quién mirar: mira al jugador si está a menos de esto
};
let paseo = { ...PASEO_BASE };
// Aplica navegacion.json entero (las dos partes). Ignora lo que no sea número finito.
export function fijarPaseo(datos) {
    fijarNavegacion(datos);
    paseo = { ...PASEO_BASE };
    const p = datos && datos.paseo;
    if (p) for (const k of Object.keys(PASEO_BASE)) if (Number.isFinite(p[k])) paseo[k] = p[k];
    return paseo;
}
export const ajustesPaseo = () => paseo;
