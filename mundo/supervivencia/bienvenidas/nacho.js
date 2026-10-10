// =========================================================
// VENJY · Supervivencia · Bienvenida de Nacho: «Carcajada contagiosa» (bloque 6c-1, relación 1)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Nacho cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (los tiempos salen de las frases):
//   Venjy te saluda y se ríe (`risa`) mientras habla de los creepers.
//   Tú te ríes tan fuerte que te doblas (`doblaRisa`); Venjy se contagia y se dobla también (desde la frase 4).
//   Los dos se secan las lágrimas (`seca`) con gotas de llanto; al final respiran y se despiden.
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (mundo/DIALOGOS.md).
// =========================================================
import { t, encadenar, fin, r2, MOLDES } from './comun.js';
import { PIX } from '../moldes.js';

export const LINEAS = encadenar([
    ['n', t('¡Nacho! Te escuché reír desde el Inicio.', 'Nacho! I heard you laughing from the Start.')],
    ['j', t('Jajaja, ¿tan fuerte?', 'Haha, that loud?')],
    ['n', t('Hasta los creepers se dieron vuelta.', 'Even the creepers turned around.')],
    ['j', t('Jajaja, ¡no puedo! ¡Los creepers!', "Haha, I can't! The creepers!")],
    ['n', t('Gracias por venir. Ojalá lo disfrutes, y prueba todo con tu skin.', 'Thanks for coming. I hope you enjoy it, and try everything with your skin.'), 1.0],
    ['j', t('Jajaja, voy. Pero primero respiro.', 'Haha, I will. But first I need to breathe.')]
]);

const A = i => LINEAS[i].a;
const F = i => LINEAS[i].a + LINEAS[i].d;

// Doblado de risa: cintura con las piernas rectas (rig.md) y temblor de la carcajada
const doblaRisa = (u, t) => {
    const phi = 0.35 + Math.sin(t * 15) * 0.04; // 0.5 juntaba las cabezas a r 2.2
    return { inc: phi, pDx: -phi, pIx: -phi, y: 0.75 * (1 - Math.cos(phi)), bDx: -0.9 + Math.sin(t * 15) * 0.1, bDz: 0.3, bIx: -0.9 - Math.sin(t * 15) * 0.1, bIz: -0.3, cx: 0.3 };
};

export function bienvenida() {
    let lagrimas = false;
    const T = r2(fin(LINEAS) + 0.95);
    return {
        T, r: 2.2,
        lineas: LINEAS,
        pista: {
            n: [['habla', 0.3, F(0)], ['risa', F(0) + 0.1, A(3) - 0.1], ['doblaRisa', A(3) - 0.1, F(3) + 0.2], ['seca', F(3) + 0.3, A(4) - 0.1], ['habla', A(4), F(4)], ['asiente', F(4) + 0.1, T - 0.2]],
            j: [['doblaRisa', A(1) - 0.3, F(3) + 0.2], ['seca', F(3) + 0.3, T - 0.2]]
        },
        gestos: {
            ...MOLDES,
            doblaRisa,
            // Se seca las lágrimas con el dorso de la mano, a la altura de la cara
            seca: (u, t) => ({ bDx: -2.1 + Math.sin(t * 10) * 0.08, bDz: 0.45, bIx: -0.2, cx: 0.1 })
        },
        extra: {
            cuadro(api) {
                if (!lagrimas && api.e.t >= F(3) + 0.3 && api.e.t < F(3) + 0.6) {
                    lagrimas = true;
                    for (const q of ['n', 'j']) {
                        const p = api.posG(q);
                        api.efecto(PIX.gota, p.x + 0.2, p.y + 1.6, p.z, { tam: 0.22, vida: 0.9, vy: -0.4 });
                    }
                }
                if (api.e.t < F(3)) lagrimas = false; // irA hacia atrás lo vuelve a permitir
            }
        }
    };
}
