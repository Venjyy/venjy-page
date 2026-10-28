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
import { enLugar } from './datos/posiciones.js';

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
        dx: -3.5, dz: 1, alto: 3.2, // al oeste del centro: Venjy queda en la mitad este (candidatos a +2,4)
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
        // Con el lugar girado (lugares.<clave>.giro), el cartel y la cama giran con él (enLugar)
        if (c) { const p = enLugar(l, l.bx + 0.5 + (c.dx || 0), l.bz + 0.5 + c.dz); carteles.push({ tipo: 'lugar', x: p.x, y: l.y + c.alto, z: p.z, texto: c.texto }); }
        if (l.clave === 'molino') {
            // Dentro de la torre (hueco de 3×3, puerta al sur): cama contra el lado oeste y antorcha en el este
            const { bx, bz, y } = l;
            const d = aDecor(ponerB => {
                const poner = (x, yy, z, id) => { const p = enLugar(l, x + 0.5, z + 0.5); ponerB(Math.floor(p.x), yy, Math.floor(p.z), id); };
                poner(bx - 1, y, bz - 1, B.CAMA); poner(bx - 1, y, bz, B.CAMA);
                poner(bx + 1, y, bz - 1, B.ANTORCHA);
            });
            d.motivo = 'molino'; // dentro del decorado del molino: ya está en zonasLuz
            decor.push(d);
        }
    }
    return { decor, carteles };
}
