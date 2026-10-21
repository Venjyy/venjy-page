// =========================================================
// VENJY · Combate · zonas del cuerpo de Urban Reign (bloque 8 · L6a, mundo/COMBATE.md §17.6)
// Puro: sin Three.js ni DOM. Lo usa la arena (arena/modelo.js) por cada peleador cuyo estilo trae `zonas`
// (estilo-urbano.json); lo que falte usa ZONAS_BASE. Un cuadro = 1/60 s.
// Cabeza, torso y piernas van de 0 a `tope`. Cada golpe recibido suma a la zona de su altura (o a las de su campo
// `zona`) y la vida pierde el daño × el multiplicador de esa zona (verde, amarillo o rojo). Al llegar al tope, una vez
// por ronda, la zona entra en estado crítico:
//   · cabeza: mareo (la reacción `critico.cabeza.reaccion`, aturdido de combate.json); el primer golpe que lo saca hace × `remate`
//   · torso: todo el daño × `critico.torso.dano` durante `cuadros`
//   · piernas: la velocidad del paso × `critico.piernas.velocidad` hasta el final de la ronda (cojera)
// Las zonas no se curan en la ronda: vuelven a 0 en la siguiente (crearZonas otra vez).
//   reglasZonas(estilo)                 estilo.zonas fundidas sobre ZONAS_BASE (null si el estilo no las trae)
//   crearZonas(Z)                       estado de un peleador
//   nivel(Z, valor)                     'verde' | 'amarillo' | 'rojo'
//   repartir(Z, def, extra)             lo que un ataque suma a cada zona: { cabeza, torso, piernas }
//   multiplicador(Z, z, reparto)        el del daño a la vida (el de la zona más golpeada de este golpe, o el del torso
//                                       crítico si es mayor)
//   sumar(Z, z, reparto)                suma y devuelve las zonas que acaban de entrar en crítico (en orden)
//   pasoZonas(z)                        un cuadro (descuenta el torso crítico)
//   velocidad(Z, z)                     el factor del paso (1, o el de las piernas en crítico)
// =========================================================
export const REGIONES = ['cabeza', 'torso', 'piernas'];
export const ZONAS_BASE = {
    tope: 100,
    porAltura: { alto: 'cabeza', medio: 'torso', bajo: 'piernas' },
    porDano: 2, // zona por punto de daño si el ataque no trae `zona`
    niveles: { amarillo: 40, rojo: 75 },
    multiplicador: { verde: 1, amarillo: 1.25, rojo: 1.5 },
    critico: {
        cabeza: { reaccion: 'aturdido', remate: 1.5 },
        torso: { dano: 1.75, cuadros: 300 },
        piernas: { velocidad: 0.6 }
    }
};

const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
function fundir(base, extra) {
    const o = {};
    for (const k of new Set([...Object.keys(base), ...Object.keys(objeto(extra) ? extra : {})])) {
        const b = base[k], e = objeto(extra) ? extra[k] : undefined;
        if (e === undefined) o[k] = objeto(b) ? fundir(b, null) : b;
        else if (objeto(b) && objeto(e)) o[k] = fundir(b, e);
        else if (b === null || b === undefined || typeof e === typeof b) o[k] = e;
        else o[k] = b;
    }
    return o;
}
export function reglasZonas(estilo) {
    const z = estilo && estilo.zonas;
    return objeto(z) ? fundir(ZONAS_BASE, z) : null;
}

export function crearZonas(Z) {
    return { cabeza: 0, torso: 0, piernas: 0, criticos: { cabeza: false, torso: false, piernas: false }, torsoC: 0, mareo: false };
}

export function nivel(Z, v) { return v >= Z.niveles.rojo ? 'rojo' : v >= Z.niveles.amarillo ? 'amarillo' : 'verde'; }

// def.zona: un número (lo que suma a la zona de su altura) o { cabeza, torso, piernas }. extra: × (la altura errada)
export function repartir(Z, def, extra = 1) {
    const r = { cabeza: 0, torso: 0, piernas: 0 }, zd = def && def.zona;
    if (objeto(zd)) { for (const k of REGIONES) r[k] = (Number(zd[k]) || 0) * extra; return r; }
    const k = Z.porAltura[(def && def.altura) || 'medio'] || 'torso';
    r[k] = (typeof zd === 'number' ? zd : ((def && def.dano) || 0) * Z.porDano) * extra;
    return r;
}

export function multiplicador(Z, z, reparto) {
    let mayor = null;
    for (const k of REGIONES) if (reparto[k] > 0 && (!mayor || reparto[k] > reparto[mayor])) mayor = k;
    let m = mayor ? Z.multiplicador[nivel(Z, z[mayor])] ?? 1 : 1;
    if (z.torsoC > 0) m = Math.max(m, Z.critico.torso.dano);
    return m;
}

export function sumar(Z, z, reparto) {
    const nuevos = [];
    for (const k of REGIONES) {
        if (!(reparto[k] > 0)) continue;
        z[k] = Math.min(Z.tope, z[k] + reparto[k]);
        if (z[k] >= Z.tope && !z.criticos[k]) {
            z.criticos[k] = true; nuevos.push(k);
            if (k === 'torso') z.torsoC = Z.critico.torso.cuadros;
        }
    }
    return nuevos;
}

export function pasoZonas(z) { if (z.torsoC > 0) z.torsoC--; }

export function velocidad(Z, z) { return Z && z && z.criticos.piernas ? Z.critico.piernas.velocidad : 1; }
