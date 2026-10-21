// =========================================================
// VENJY · Supervivencia · Salonas: partitura, juicio, puntaje y estrellas (puro: no toca el navegador)
// Diseño en mundo/SALONAS.md §4-6. La partitura sale sola de la capa `bajo` de una canción de musica.json
// (canciones.<clave>, formato en estudio/DISENO.md §24) y usa los mismos segundos que el audio (mapaTiempo).
// Contrato: mundo/tests/salonas.mjs (S2). Lo implementa el PR S2b sin cambiar las firmas ni REGLAS_BASE.
// Los valores de REGLAS_BASE pasan a mundo/datos/salonas.json en S9 (el juego llamará reglasDe(json)).
// =========================================================
import { mapaTiempo, acordeEn } from './musica-motor.js';

export const DIFICULTADES = ['facil', 'normal', 'dificil', 'experto'];

// Reglas por defecto (segundos, pasos y puntos). Cualquier función recibe `reglas` ya completas (reglasDe).
// rejilla: en qué pasos del compás puede caer una nota. Un número N = los pasos múltiplos de N; una lista = esos
// pasos. La clave es los pasos por compás de la sección (16 = 4/4, 12 = 6/8, 14 = 7/8) y si no está, `defecto`.
export const REGLAS_BASE = {
    dificultades: {
        // recortar: quita notas hasta que ninguna quede a menos de minSep de la anterior (en las otras solo se revisa)
        facil: { carriles: 2, rejilla: { defecto: 4, 12: [0, 6], 14: [0, 4, 8] }, fantasma: false, largas: false, acordes: false, recortar: true, minSep: 0.35, maxNotasSeg: 3 },
        normal: { carriles: 3, rejilla: { defecto: 2 }, fantasma: false, largas: false, acordes: false, recortar: false, minSep: 0.12, maxNotasSeg: 6 },
        dificil: { carriles: 4, rejilla: { defecto: 1 }, fantasma: false, largas: false, acordes: false, recortar: false, minSep: 0.07, maxNotasSeg: 9 },
        experto: { carriles: 4, rejilla: { defecto: 1 }, fantasma: true, largas: true, acordes: true, recortar: false, minSep: 0.05, maxNotasSeg: 12 }
    },
    largaPasos: 4,               // una nota dura ≥ este número de pasos → nota larga (solo si la dificultad tiene largas)
    brillantes: ['coro'],        // secciones (por nivel o por nombre) cuyas notas cargan el Modo Primus
    ventanas: { perfecto: 0.045, bien: 0.09, ok: 0.135, marcada: 0.7 },  // ± segundos; slap y pop usan × marcada
    puntos: { perfecto: 100, bien: 60, ok: 30, marcada: 1.5, larga: 50 }, // marcada = × a slap y pop; larga = por segundo mantenido
    combo: { paso: 10, max: 4 },  // ×1 las primeras `paso` notas seguidas, ×2 las siguientes `paso`… hasta ×max
    primus: { seg: 8, factor: 2 },
    estrellas: { umbrales: [0, 0.35, 0.55, 0.75, 0.92] } // fracción del puntaje máximo para 1, 2, 3, 4 y 5 estrellas
};

const FALTA = nombre => new Error(`salonas-partitura: falta implementar ${nombre} (PR S2b)`);

// REGLAS_BASE con lo que traiga `parcial` encima (mezcla profunda de objetos; listas y números se reemplazan).
// No cambia REGLAS_BASE. reglasDe() o reglasDe(null) = una copia de REGLAS_BASE.
export function reglasDe(parcial) { throw FALTA('reglasDe'); }

// Partitura de una canción para una dificultad → { dificultad, carriles, duracion, secciones, notas }
//  · duracion y secciones: las de mapaTiempo(cancion, tempo) (tempo = factor de Práctica, 0.5-1).
//  · De qué nota sale cada paso del mapa ({ t, n, k, i, s }): de las capas con `bajo` que suenan en el nivel de la
//    sección (como en tocarPaso de musica-motor.js: sin `mudo`, `niveles` incluye el nivel o no hay `niveles`, y
//    `segunda` solo en los compases 4-7, 12-15…), la primera (en el orden de `capas`) que tiene alguna nota en el
//    índice (k % compases) * pasos + i, y de ella la primera nota de ese índice. Un paso da como mucho una nota.
//  · Filtros de la dificultad, en este orden: sin fantasma ('g') si fantasma es false; solo los pasos de la rejilla;
//    con recortar, en orden de tiempo, se salta toda nota a menos de minSep s de la última que quedó.
//  · Carril por contorno, dentro de la frase (una vuelta de la capa: misma sección y mismo floor(k / compases)):
//    las alturas distintas de las notas que quedaron se ordenan de grave a aguda; rango r de D alturas →
//    carril = Math.round(r * (carriles - 1) / (D - 1)); si D = 1, Math.floor((carriles - 1) / 2).
//    La altura es la nota MIDI del bajo más la `octava` de la capa.
//  · Acorde: rasgueo ('r') con acordes → carriles [a, a + 1] con a = Math.min(carril, carriles - 2). Si no, un carril.
//  · Nota larga: con largas y duración ≥ largaPasos pasos → dur = duración * s (segundos); si no, dur = 0.
// Cada nota: { t, dur, carril, carriles, tipo, nota, marcada, brillante, clave, n }
//   carril = carriles[0]; marcada = tipo 's' o 'p'; brillante = nivel o nombre de la sección en reglas.brillantes;
//   clave = 'compás:paso', con el compás contado desde 0 en toda la canción; n = índice de la sección.
// Orden: por t y después por carril. Determinista; no cambia `cancion`. Sin capa de bajo → notas vacías.
// opciones.ajustes = { clave: carril | null } de esta dificultad (pestaña Ritmo): un número cambia el carril de esa
// nota (acotado a 0..carriles-1, y en un acorde se vuelve a aplicar la regla de arriba); null la quita. Las claves
// que no existen se ignoran (revisarPartitura las avisa). Nunca cambian el tiempo de una nota.
export function partitura(cancion, dificultad, reglas = REGLAS_BASE, { tempo = 1, ajustes = null } = {}) { throw FALTA('partitura'); }

// Juicio de una pulsación: dt = segundo de la pulsación - nota.t (ya con latencia y calibración restadas).
// → 'perfecto' | 'bien' | 'ok' | null (fuera). Bordes incluidos. Si nota.marcada, cada ventana × ventanas.marcada.
export function juicio(dt, nota, reglas = REGLAS_BASE) { throw FALTA('juicio'); }

// Nota que toca una pulsación en `carril` en el segundo t → { idx, juicio, dt } o null.
// Candidatas: no están en `hechas` (Set de índices), tienen `carril` en sus carriles, juicio no null y todos sus
// carriles están en `pulsadas` (los carriles apretados en ese momento; un acorde pide los dos). Gana la de menor |dt|.
export function golpe(notas, t, carril, hechas, reglas = REGLAS_BASE, pulsadas = [carril]) { throw FALTA('golpe'); }

// Índices (en orden) de las notas que ya no se pueden tocar en el segundo t: no están en `hechas` y
// nota.t + ventana ok (× marcada si corresponde) < t. El juego las cuenta como fallo.
export function vencidas(notas, t, hechas, reglas = REGLAS_BASE) { throw FALTA('vencidas'); }

// Multiplicador del combo: min(combo.max, 1 + floor((combo - 1) / combo.paso)); con combo 0, 1.
export function multiplicador(combo, reglas = REGLAS_BASE) { throw FALTA('multiplicador'); }

// Estado del puntaje → { puntos: 0, combo: 0, comboMax: 0, mult: 1, conteo: { perfecto: 0, bien: 0, ok: 0, fallo: 0 } }
export function puntajeInicial() { throw FALTA('puntajeInicial'); }

// Suma un evento y devuelve un estado nuevo (no cambia `estado`):
//  · { juicio: 'perfecto' | 'bien' | 'ok', marcada?, primus? }: combo + 1, comboMax, mult = multiplicador(combo nuevo),
//    conteo, puntos += Math.round(puntos[juicio] × (marcada ? puntos.marcada : 1) × mult × (primus ? primus.factor : 1)).
//  · { juicio: 'fallo' }: combo 0, mult 1, conteo.fallo + 1, sin puntos.
//  · { mantener: segundos, primus? } (nota larga sostenida): puntos += Math.round(puntos.larga × segundos × mult ×
//    (primus ? factor : 1)), con el mult actual; no cambia el combo.
export function sumar(estado, evento, reglas = REGLAS_BASE) { throw FALTA('sumar'); }

// Puntaje con todas las notas en Perfecto, en orden, sin fallos ni Modo Primus y con cada nota larga mantenida
// entera (su `dur`) justo después de tocarla. Es igual a pasar esos eventos por sumar().
export function puntajeMaximo(part, reglas = REGLAS_BASE) { throw FALTA('puntajeMaximo'); }

// Estrellas (1-5): cuántos umbrales alcanza puntos / maximo (al menos 1). Con maximo ≤ 0, 0.
export function estrellas(puntos, maximo, reglas = REGLAS_BASE) { throw FALTA('estrellas'); }

// «Revisar partitura» (pestaña Ritmo) → lista de { tipo, grave, dificultad, n, texto } (texto en español):
//  · Por dificultad y sección (n), uno por tipo como mucho:
//    'vacia' (grave): la sección no tiene notas en esa dificultad;
//    'densidad' (grave): más de maxNotasSeg notas con t en algún intervalo [t de una nota, ese t + 1 s);
//    'separacion' (grave): dos notas seguidas a menos de minSep s (en Fácil no pasa: se recortan).
//  · 'huerfano' (no grave; n: null): una clave de opciones.ajustes[dificultad] que no es de ninguna nota generada.
//  · 'escala' (no grave; dificultad: null): uno por sección con notas de Experto (sin las fantasma) fuera de la escala
//    del acorde del compás (acordeEn(cancion, k, nivel)): escala mayor de la raíz, o menor natural si la tercera del
//    acorde está a 3 semitonos, más las notas del propio acorde. Puede ser a propósito: solo avisa.
// Los acordes en Fácil o Normal no se revisan: la partitura no los genera ahí.
export function revisarPartitura(cancion, reglas = REGLAS_BASE, { tempo = 1, ajustes = {} } = {}) { throw FALTA('revisarPartitura'); }
