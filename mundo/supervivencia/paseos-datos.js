// =========================================================
// VENJY · Supervivencia · Ajustes de los paseos (6d etapa 2), sin three.js ni DOM
// Valores del código + mundo/datos/navegacion.json: `caminar` va a mundo/navegacion.js (buscar camino y
// caminante), `seguir` a mundo/seguir.js (los acompañantes de 7i) y `paseo` a PASEO_BASE (cómo caminan y vuelven los amigos, paseos.js). Lo leen el juego, el
// Estudio (pestaña Vida) y las pruebas de Node.
// =========================================================
import { fijarNavegacion } from '../navegacion.js';
import { fijarSeguir } from '../seguir.js';

export const PASEO_BASE = {
    amplitud: 0.6,          // cuánto balancea piernas y brazos al caminar
    acomodar: 0.5,          // segundos para acomodarse en su sitio exacto al volver
    reintento: 4,           // sin camino y a la vista: segundos antes de volver a intentarlo (cada vez el doble)
    reintentosVista: 2,     // cuántas veces lo reintenta a la vista antes de quedarse donde llegó
    distanciaVisita: 1.8,   // a qué distancia de la persona que visita se queda
    seguirCada: 1.5,        // yendo a ver a alguien: cada cuántos segundos mira si esa persona se movió
    seguirDistancia: 4,     // … y si se movió más que esto (bloques), corrige el camino hacia donde está ahora
    mirarJugador: 5         // de pie y sin a quién mirar: mira al jugador si está a menos de esto
};
let paseo = { ...PASEO_BASE };
// Aplica navegacion.json entero (las tres partes). Ignora lo que no sea número finito.
export function fijarPaseo(datos) {
    fijarNavegacion(datos);
    fijarSeguir(datos && datos.seguir);
    paseo = { ...PASEO_BASE };
    const p = datos && datos.paseo;
    if (p) for (const k of Object.keys(PASEO_BASE)) if (Number.isFinite(p[k])) paseo[k] = p[k];
    return paseo;
}
export const ajustesPaseo = () => paseo;
