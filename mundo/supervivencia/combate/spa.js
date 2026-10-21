// =========================================================
// VENJY · Combate · agarres por altura, pisotón, arte especial y Furia de Urban Reign (bloque 8 · L6b, mundo/COMBATE.md §17.6-17.7)
// Puro: sin Three.js ni DOM. Lo usa la arena (arena/modelo.js) por cada peleador cuyo estilo trae reglas.spa
// (estilo-urbano.json); lo que falte usa SPA_BASE. Un cuadro = 1/60 s. La barra SPA es la del espíritu
// (combate/peligro.js → reglas.espiritu: segmentos, porHecho, porRecibido).
//   · agarre: un ataque con `sujeta` que conecta deja a los dos en la sujeción (`sujetar` y la reacción `sujetado`);
//     el agarrado tiene `ventana` c (`tactil` en el celular) para apretar defensa con la altura del agarre. Si acierta
//     se zafa (`zafarse` y el que agarraba, `soltado`; los dos se separan `empujon`); si se equivoca, el agarre sigue
//     y el remate hace × `errado`. Al cerrar la ventana sale el remate de la altura (`remates`). La CPU amaga: la
//     anticipación muestra otra altura y a `pista` c del activo pasa a la de verdad (estados.cambiarAccion).
//   · pisoton: S + clic con el rival en una de `reacciones` a menos de `distancia` → la acción `accion`
//   · arte: el arte especial (controles.especial) sale aunque te estén pegando si tu estado está en `rompe` y la
//     reacción no está en `excepto` (rompe la reacción y el hitstop)
//   · furia: Q + E (modoEspecial) con la barra en `costo`: `accion` (la pose), y durante `segundos` armadura contra
//     los golpes normales, ataques × `prisa`, zona × `zona` y la guardia mantenida no la frena (`rompeGuardia`). La
//     barra se vacía en ese tiempo. Desde un estado libre o en los primeros `entrada` c de un agarre o un arte
//     (apretar Q y E casi juntos).
//   reglasSpa(estilo)                   reglas.spa fundidas sobre SPA_BASE (null si el estilo no las trae)
//   alturaDe(it)                        'alto' | 'medio' | 'bajo' de una intención (la neutra es medio)
//   controlAltura(c, altura)            la clave de un control por altura (o el control tal cual)
//   escape(A, s, altura)                'zafa' | 'errado' | null: un intento de zafarse de la sujeción s
//   ventanaEscape(A, tactil)            cuadros para zafarse
//   faltanActivo(p)                     cuadros hasta el activo de la acción en curso (con la anticipación sostenida)
//   puedeRomper(A, p)                   ¿el arte especial sale desde este estado?
//   puedePisar(A, F, O)                 ¿S + clic es pisotón?
// =========================================================
import { inicioFase } from './datos.js';
import { LIBRES, TERMINALES } from './estados.js';

export const SPA_BASE = {
    agarre: {
        ventana: 18, tactil: 24, errado: 1.2, empujon: 0.5, pista: 4,
        sujetar: null, sujetado: 'sujetado', zafarse: 'zafarse', soltado: 'soltado',
        remates: { alto: null, medio: null, bajo: null }
    },
    pisoton: { accion: null, reacciones: ['derribo', 'agarrado'], distancia: 1.2 },
    arte: { rompe: ['reaccion'], excepto: ['lanzado'] },
    furia: { accion: null, costo: 4, segundos: 8, prisa: 1.25, zona: 1.5, armadura: true, rompeGuardia: true, entrada: 6 }
};

const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    const o = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(objeto(extra) ? extra : {})])) {
        const b = base[k], e = objeto(extra) ? extra[k] : undefined;
        if (e === undefined) o[k] = objeto(b) ? fundir(b, null) : Array.isArray(b) ? [...b] : b;
        else if (objeto(b) && objeto(e)) o[k] = fundir(b, e);
        else if (b === null || b === undefined || typeof e === typeof b) o[k] = Array.isArray(e) ? [...e] : e;
        else o[k] = b;
    }
    return o;
}
export function reglasSpa(estilo) {
    const a = estilo && estilo.reglas && estilo.reglas.spa;
    return objeto(a) ? fundir(SPA_BASE, a) : null;
}

export const alturaDe = it => (it && (it.altura === 'alto' || it.altura === 'bajo') ? it.altura : 'medio');
export function controlAltura(c, altura) {
    if (!objeto(c)) return c || null;
    return c[altura] || c.medio || c.neutro || null;
}

export function escape(A, s, altura) {
    if (!A || !s || s.intento) return null;
    s.intento = true;
    if (altura === s.altura) return 'zafa';
    s.errado = true;
    return 'errado';
}
export const ventanaEscape = (A, tactil) => (tactil ? A.agarre.tactil : A.agarre.ventana);

export function faltanActivo(p) {
    if (!p.def || !p.def.fases) return Infinity;
    const g = inicioFase(p.def.fases, 'activo');
    if (g === null) return Infinity;
    return Math.max(0, g - 1 - p.c) + (p.sostener || 0) + 1;
}

export function puedeRomper(A, p) {
    if (!A || TERMINALES.has(p.estado) || LIBRES.has(p.estado)) return false;
    return A.arte.rompe.includes(p.estado) && !A.arte.excepto.includes(p.clave);
}

// F y O: peleadores de la arena ({ p, x, z }); F tiene que poder empezar algo (libre)
export function puedePisar(A, F, O) {
    if (!A || !A.pisoton.accion || !LIBRES.has(F.p.estado)) return false;
    if (!A.pisoton.reacciones.includes(O.p.clave)) return false;
    return Math.hypot(O.x - F.x, O.z - F.z) <= A.pisoton.distancia;
}
