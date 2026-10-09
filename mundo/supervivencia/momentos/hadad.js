// =========================================================
// VENJY · Supervivencia · Momento especial de Hadad: «El comercial» (bloque 6b-2)
// escena-amistad.js lo carga con import() solo al usarlo (botón «Momento especial» de «Hablar» con la amistad en 100).
// momento(info) devuelve el guion (formato en la cabecera de escena-amistad.js); info.base = clave de la base de tu skin.
// Guion de tiempos (lo programa la skill animaciones-minecraft):
//   En la fogata (Andy y Nacho quedan callados al lado: el motor ya lo hace).
//   3.6 Hadad saca una bolsa de papas fritas (api.caja 0.32×0.42×0.12 con filas píxel: amarilla con una franja roja y una papa dibujada) pegada a su mano derecha; 3.8-6.8 la presenta como en un comercial (brazo derecho estirado al lado con la bolsa a la altura de la cara, izquierda abierta señalándola, sonrisa = cabeza un poco ladeada).
//   9.6-12.0 le ofrece la bolsa al jugador (pasa); los dos «comen»: mano a la boca dos veces cada uno (gesto propio `come`).
//   12.2-15.4 los dos levantan el pulgar (gesto propio `pulgar`: brazo derecho adelante doblado hacia arriba) mirando un poco hacia el costado (cy chico), chispas en 12.4. La bolsa desaparece al terminar.
// Son personas reales: siempre en buena onda; el dueño revisa los textos antes del merge.
// =========================================================
const t = (es, en) => ({ es, en });

// Frases (únicas en todo el juego; las comprueba mundo/tests/amistad.mjs)
export const LINEAS = [
    { q: 'n', a: 0.8, d: 2.8, texto: t("Atención, que esto es un comercial. Tú eres mi invitado especial.", "Attention, this is a commercial. You are my special guest.") },
    { q: 'n', a: 3.8, d: 3.0, texto: t("Papas fritas de bolsa: las que acompañan cada victoria del escuadrón.", "Bagged potato chips: the ones that go with every squad victory.") },
    { q: 'j', a: 7.0, d: 2.4, texto: t("¿Y puedo probar o es solo para el comercial?", "And can I try some or is it only for the ad?") },
    { q: 'n', a: 9.6, d: 2.4, texto: t("Prueba nomás. Dicen que con amigos saben el doble.", "Go ahead. They say they taste twice as good with friends.") },
    { q: 'n', a: 12.2, d: 3.2, texto: t("Y corte. Ese comercial ya es más famoso que la imagen de la IA.", "And cut. This commercial is already more famous than the AI picture.") }
];


// ---------------------------------------------------------
// Gestos, objetos y efectos propios de Hadad (en momento(); Andy y Nacho quedan callados)
// ---------------------------------------------------------
const lerp = (a, b, k) => a + (b - a) * k;

const BOLSA = ['yyyyyyyy', 'yyrrrryy', 'rrrrrrrr', 'ywkwwkwy', 'ywwkkwwy', 'ywwwwwwy', 'yyyyyyyy', 'yyyyyyyy'];
const COL_BOLSA = { y: '#f2c230', r: '#c62828', w: '#f7e27a', k: '#8a5a1a' };
// Ritmo de bocado: 0 = mano abajo, 1 = mano a la boca (dos bocados en 2.4 s)
const bocado = t => (1 + Math.sin(t * 5.2)) / 2;

export function momento(info = {}) {
    let bolsaH = null, bolsaJ = null;
    return {
        T: 16, r: 1.4,
        lineas: LINEAS,
        pista: {
            n: [['habla', 0.8, 3.6], ['presenta', 3.6, 6.8], ['pasa', 9.6, 10.2], ['come', 10.2, 12.0], ['pulgar', 12.2, 15.4]],
            j: [['recibe', 9.6, 10.2], ['comeJ', 10.2, 12.0], ['pulgar', 12.2, 15.4]]
        },
        gestos: {
            // Comercial: brazo derecho estirado al lado con la bolsa a la altura de la cara; la izquierda la señala
            presenta: () => ({ bDx: -1.5, bDz: -0.6, bIx: -0.9, bIz: 0.2, cy: 0.2, cz: 0.12 }),
            // Come con la derecha: la mano sube a la boca dos veces
            come: (u, t) => ({ bDx: lerp(-0.25, -1.45, bocado(t)), bDz: 0.25 * bocado(t), cx: 0.12 }),
            // Come con la izquierda (la bolsa que recibió)
            comeJ: (u, t) => ({ bIx: lerp(-0.25, -1.45, bocado(t)), bIz: -0.25 * bocado(t), cx: 0.12 }),
            // Recibe la bolsa: brazo izquierdo estirado al frente
            recibe: () => ({ bIx: -1.35, bIz: -0.1, cx: 0.1 }),
            // Pulgar arriba: brazo derecho al frente y doblado hacia arriba, mirando un poco al costado
            pulgar: (u, t) => ({ bDx: -1.6 + Math.sin(t * 6) * 0.05, bDz: 0.3, cy: 0.25 })
        },
        extra: {
            // Dos bolsas: una en la mano de Hadad y, después del pase, otra en la mano izquierda del jugador
            iniciar(api) {
                const tex = { filas: BOLSA, colores: COL_BOLSA };
                bolsaH = api.pegar(api.caja(0.32, 0.42, 0.12, null, tex), 'n', 'brazoD', [0, -0.7, 0.12]);
                bolsaJ = api.pegar(api.caja(0.32, 0.42, 0.12, null, tex), 'j', 'brazoI', [0, -0.7, 0.12]);
                bolsaH.visible = false;
                bolsaJ.visible = false;
            },
            cuadro(api) {
                const t = api.e.t;
                if (!bolsaH) return;
                bolsaH.visible = t >= 3.6 && t < 9.6;
                bolsaJ.visible = t >= 9.6 && t < 12.2;
                if (t >= 12.4 && !api.e.hechos.has('chispa')) {
                    api.e.hechos.add('chispa');
                    const a = api.posG('n'), j = api.posG('j');
                    api.efecto('chispa', (a.x + j.x) / 2, (a.y + j.y) / 2 + 1.6, (a.z + j.z) / 2, { tam: 0.3 });
                }
            }
        }
    };
}
