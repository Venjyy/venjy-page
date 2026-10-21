// =========================================================
// VENJY · Combate · defensa por altura de Urban Reign (bloque 8 · L5, mundo/COMBATE.md §17.3-17.5)
// Puro: sin Three.js ni DOM. Lo usa la arena (arena/modelo.js) por cada peleador cuyo estilo trae reglas.altura
// (estilo-urbano.json); lo que falte usa ALTURA_BASE. Un cuadro = 1/60 s (paso fijo de combate/estados.js).
// Urban Reign no bloquea: la defensa es leer la altura. Cada acción de defensa declara la altura que desvía
// (`defiende`: la esquiva neutra, medio; el paso lateral con W o S, alto o bajo) y cuenta desde el cuadro en que empezó:
//   · el golpe de esa altura llega a lo más `reversion` c después → reversión (atrapa la extremidad y lo lanza)
//   · llega a lo más `ventana` c después → desvío con contraataque (la acción de `contra` según la altura)
//   · llega otra altura dentro de la ventana → entra con el daño × `errada` (leíste mal), salvo que la esquiva
//     neutra lo deje pasar por arriba (sus i-frames sirven contra alto y medio normales: `iframesAlturas`)
//     (erradaEn: 'vida' multiplica el daño; 'zona', lo que suma a las zonas de combate/zonas.js, L6a)
//   · fuera de la ventana mandan los i-frames de la acción (la esquiva neutra o el paso lateral)
//   reglasAltura(estilo)                 reglas.altura fundidas sobre ALTURA_BASE (null si el estilo no las trae)
//   clasificar(A, p, golpe, r)           para estados.recibir (reglas.alRecibir): lo que dijo el motor pasa a
//                                        'reversion' | 'desviado' | 'errada' | 'esquivado' | 'golpeado' | r
//   accionDefensa(A, resultado, altura)  la acción que juega el que desvió (contraataque por altura o reversión)
// =========================================================
export const ALTURA_BASE = {
    ventana: 8, reversion: 3, tactil: 2, errada: 1.3, erradaEn: 'vida',
    contra: { alto: null, medio: null, bajo: null }, reversionAccion: null,
    imparable: ['imparable'], sinPostura: false
};
export const ALTURAS = ['alto', 'medio', 'bajo'];

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
export function reglasAltura(estilo) {
    const a = estilo && estilo.reglas && estilo.reglas.altura;
    return objeto(a) ? fundir(ALTURA_BASE, a) : null;
}

// p: el que recibe (estados.js); golpe: { altura, peligro }; r: lo que dijo el motor ('esquivado' si cayó en i-frames)
export function clasificar(A, p, golpe, r) {
    const def = p && p.def;
    if (!A || !def || r === 'sinEfecto' || r === 'armadura') return r;
    const h = golpe.altura || 'medio', pel = golpe.peligro || null;
    // La esquiva neutra solo pasa bajo los golpes normales de sus alturas
    const pasaBajo = !def.iframesAlturas || (def.iframesAlturas.includes(h) && !pel);
    if (r === 'esquivado' && !pasaBajo) r = 'golpeado';
    if (!def.defiende || p.estado === 'contra') return r;
    const extra = p.tactil ? A.tactil : 0;
    if (p.c > A.ventana + extra) return r; // tarde (o temprano para el golpe): sus i-frames
    if (pel && A.imparable.includes(pel)) return r; // el arte especial no se desvía
    if (def.defiende === h) return p.c <= A.reversion + extra ? 'reversion' : 'desviado';
    if (r === 'esquivado' && def.iframesAlturas) return 'esquivado';
    return 'errada';
}

export function accionDefensa(A, resultado, altura) {
    if (!A) return null;
    if (resultado === 'reversion') return A.reversionAccion || A.contra[altura] || null;
    return A.contra[altura] || A.contra.medio || null;
}
