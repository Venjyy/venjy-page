// =========================================================
// VENJY · Supervivencia · Bienvenida de Lucho: «El árbol de los primos» (bloque 6c-1, relación 3)
// escena-amistad.js lo carga con import() solo al usarlo (escenas-skin.js: skin de Lucho cerca del Venjy del Inicio).
// bienvenida(info) devuelve el guion (formato en la cabecera de escena-amistad.js). 'n' = el Venjy del Inicio, 'j' = tú.
// Guion (r 1.3, distancia de los saludos):
//   0.6-3.3   Venjy empieza a explicar el árbol y habla (`habla`); tú asientes.
//   3.4-8.4   Venjy dibuja en el aire con el dedo (`traza`): cada 0.2 s aparece un trazo (PIX.trazo) donde
//             está su dedo; el árbol se enreda.
//   8.6-11.0  Venjy se rasca la cabeza (`rasca`) y tú borras el árbol con la mano (`barre`, 8.8-11.0): los trazos
//             se encogen y desaparecen (escala a 0 entre 8.8 y 10.9).
//   11.2-14.6 Venjy recuerda cuando los presentaron como primos (`recuerda`); tú asientes.
//   15.6-20.2 saludo secreto de 6b (`secreto(15.6)`, golpes incluidos).
//   20.3-24.8 abrazo de 6b (`abrazo(20.3)`); Venjy cierra la despedida durante el abrazo.
// Son personas reales: siempre en buena onda; textos aprobados por el dueño (mundo/DIALOGOS.md).
// =========================================================
import { t, encadenar, r2, secreto, abrazo, MOLDES } from './comun.js';
import { PIX } from '../moldes.js';

export const LINEAS = encadenar([
    ['n', t('¡Primo! A ver, déjame explicarte el árbol...', 'Cousin! Wait, let me explain the family tree...')],
    ['j', t('Yo soy primo de tu mamá, entonces tú eres...', "I'm your mom's cousin, so you're my...")],
    ['n', t('Ya me perdí.', "I'm lost already.")],
    ['j', t('Primo es primo. Fin del árbol.', 'Cousin is cousin. End of the tree.')],
    ['n', t('¿Te acuerdas cuando nos presentaron como primos? Nadie preguntó más.', 'Remember when they introduced us as cousins? Nobody asked any more.')],
    ['j', t('Y desde ahí, primos. Ya no hay vuelta atrás.', 'And since then, cousins. No going back now.')],
    ['n', t('Gracias por venir. Esta noche, dúo en Apex: tú me revives.', 'Thanks for coming. Tonight, Apex duos: you revive me.')]
]);

const S0 = 15.6; // saludo secreto
const A0 = 20.3; // abrazo
const DIB = [3.4, 8.4]; // Venjy dibuja
const BORRA = [8.8, 10.9]; // tú borras
const TAM = 0.55;
const sec = secreto(S0), abr = abrazo(A0);

export function bienvenida() {
    const trazos = []; // { s } de cada trazo del árbol
    let ultimo = -1;
    return {
        T: r2(A0 + 4.5 + 0.5), r: 1.3,
        lineas: LINEAS,
        golpes: [...sec.golpes],
        pista: {
            n: [['habla', 0.6, 3.3], ['traza', 3.4, 8.4], ['rasca', 8.6, 11.0], ['recuerda', 11.2, 14.6], ...sec.pista, ...abr.pista],
            j: [['asiente', 0.6, 3.3], ['habla', 3.45, 6.15], ['asiente', 6.3, 8.6], ['barre', 8.8, 11.0], ['asiente', 11.2, 14.6], ...sec.pista, ...abr.pista]
        },
        gestos: { ...MOLDES, ...sec.gestos, ...abr.gestos },
        extra: {
            cuadro(api) {
                const t = api.e.t, h = api.e.hechos;
                // Trazo en la punta del dedo de Venjy cada 0.2 s mientras dibuja (una vez por intervalo)
                const k = Math.floor((t - DIB[0]) / 0.2);
                if (t >= DIB[0] && t < DIB[1] && k > ultimo && !h.has('tz' + k)) {
                    h.add('tz' + k);
                    ultimo = k;
                    const p = api.punta(api.actor('n'), 'D', new api.THREE.Vector3());
                    trazos.push({ s: api.efecto(PIX.trazo, p.x, p.y, p.z, { tam: TAM, vida: 60 }) });
                }
                // Tú borras: los trazos se encogen y desaparecen
                const u = Math.min(1, Math.max(0, (t - BORRA[0]) / (BORRA[1] - BORRA[0])));
                for (const { s } of trazos) {
                    s.visible = u < 1;
                    s.scale.set(TAM * (1 - u), TAM * (1 - u), 1);
                }
                if (t < DIB[0]) ultimo = -1; // irA hacia atrás vuelve a permitir los trazos
            }
        }
    };
}
