// =========================================================
// VENJY · Supervivencia · Texto de las señales de los caminos (7f-3)
// Los bloques de mojones, carteles y faroles ya vienen en el terreno (mundo/caminos.js); aquí solo se
// dibuja el texto sobre cada uno. El sprite de un cartel se crea al pasar a menos de CREA bloques
// (no hay sprites ni lienzos para los 30 y tantos del mapa) y se ve a menos de VE.
// =========================================================
import { crearCarteles } from '../portafolio/carteles.js';

export const CREA = 24;
export const VE = 24;

export function crearCartelesCamino({ scene, camara, terreno, dy, idioma = 'es' }) {
    const lista = terreno.caminos || [];
    const carteles = crearCarteles(scene, camara, idioma);
    const hechos = new Set();
    let reloj = 0;
    return {
        total: lista.length,
        creados: () => hechos.size,
        actualizar(dt) {
            reloj -= dt;
            if (reloj <= 0) { // mirar la lista 4 veces por segundo basta
                reloj = 0.25;
                const p = camara.position;
                lista.forEach((c, i) => {
                    if (hechos.has(i) || Math.hypot(p.x - c.x, p.z - c.z) > CREA || Math.abs(p.y - (c.y + dy)) > CREA) return;
                    hechos.add(i);
                    carteles.agregar({
                        x: c.x, y: c.y + dy, z: c.z, texto: c.texto, distancia: VE,
                        ancho: c.tipo === 'lugar' ? 5.2 : c.tipo === 'cruce' ? 4.2 : 2.2, tamano: c.tipo === 'lugar' ? 22 : c.tipo === 'cruce' ? 24 : 26
                    });
                });
            }
            carteles.actualizar();
        }
    };
}
