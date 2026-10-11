// =========================================================
// VENJY · Un motivo para ir a cada lugar sin amigos (7f-3, parte 3) · solo supervivencia
// Se suma a lo que ya levantan `construcciones.js` y `voxeles.js` sin tocar el creativo (paridad.mjs):
//   · molino → refugio: cama y antorcha dentro de la torre (dormir fija la reaparición a mitad de mapa);
//   · portal → ruina con historia: el cartel cuenta el Chonchon (el cofre y el oro ya estaban);
//   · cada lugar con cartel muestra su nombre y para qué sirve.
// Determinista (sale de `terreno.lugares`), así que los workers dan lo mismo que el hilo principal.
// Devuelve { decor, carteles }; los carteles se pintan en supervivencia/caminos-carteles.js.
// =========================================================
import { B } from './texturas.js';
import { aDecor } from './construcciones.js';

// Texto de cada lugar: [clave, alto sobre el suelo, desplazamiento z (hacia el sur), texto]
export const CARTELES_LUGARES = {
    molino: {
        dz: 4.5, alto: 3.2,
        texto: {
            es: 'Molino viejo\nRefugio: duerme en la cama de adentro y reapareces aquí',
            en: 'Old windmill\nShelter: sleep in the bed inside and you respawn here'
        }
    },
    portal: {
        dz: 3.5, alto: 3.2,
        texto: {
            es: 'Portal del Chonchon\nDicen que un brujo lo cruzó de noche y volvió hecho pájaro. Si oyes «tue, tue», no mires',
            en: 'Chonchon portal\nThey say a wizard crossed it at night and came back as a bird. If you hear "tue, tue", do not look'
        }
    }
};

export function colocarMotivos(terreno) {
    const decor = [], carteles = [];
    for (const l of terreno.lugares || []) {
        const c = CARTELES_LUGARES[l.clave];
        if (c) carteles.push({ tipo: 'lugar', x: l.bx + 0.5, y: l.y + c.alto, z: l.bz + 0.5 + c.dz, texto: c.texto });
        if (l.clave === 'molino') {
            // Dentro de la torre (hueco de 3×3, puerta al sur): cama contra el lado oeste y antorcha en el este
            const { bx, bz, y } = l;
            const d = aDecor(poner => {
                poner(bx - 1, y, bz - 1, B.CAMA); poner(bx - 1, y, bz, B.CAMA);
                poner(bx + 1, y, bz - 1, B.ANTORCHA);
            });
            d.motivo = 'molino'; // dentro del decorado del molino: ya está en zonasLuz
            decor.push(d);
        }
    }
    return { decor, carteles };
}
