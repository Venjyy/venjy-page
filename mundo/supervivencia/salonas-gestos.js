// Gestos de tocar del minijuego de ritmo «Salonas» (puro: sin Three ni DOM).
// Cada función recibe el ritmo del cuadro (r: pulso, fase, seccion, salto, energia) y devuelve canales
// de aplicarAngulos (pose-jugador.js). Son continuas en el tiempo: los golpes usan curvas con coseno
// que vuelven a su valor al cerrar cada pulso o compás, y las secciones solo cambian en su borde.
// Signos del rig: bDx/bIx negativo = brazo al frente y arriba; bDz > 0 = mano derecha hacia el pecho;
// bIz < 0 = mano izquierda hacia el pecho; cx positivo baja la cabeza; rodD/rodI positivo = pantorrilla hacia atrás.
// Todos los números van en GESTOS_SALONAS (editable desde el Estudio). Diseño: mundo/SALONAS.md.

export const GESTOS_SALONAS = {
    guitarra: {
        energiaMinima: 0.6,        // fracción de amplitud con energía 0
        cabezaBase: 0.05,          // cx en reposo (cabeza algo baja)
        cabezaPulso: 0.12,         // cabeceo al pulso fuera del coro (cx)
        cabezaCoro: 0.22,          // cabeceo al pulso en el coro (cx)
        brazoDX: -0.6,             // brazo derecho (rasgueo) en reposo
        brazoDZ: 0.3,              // brazo derecho hacia el pecho (cuerdas)
        rasgueoAmp: 0.45,          // amplitud del rasgueo abajo-arriba en corcheas
        brazoIX: -1.05,            // mano izquierda en el mástil
        brazoIZ: 0.55,             // mano izquierda, abertura lateral
        compasAmp: 0.06,           // cambio leve de la izquierda por compás
        compas: 4,                 // pulsos por compás
        pieMarca: 0.35,            // rodilla derecha marca el pulso (rodD)
        saltoAltura: 0.35,         // altura del salto (y)
        saltoBrazoD: 0.5,          // cuánto sube el brazo derecho al saltar (sin soltar la guitarra)
        soloInclinacion: -0.12,    // torso hacia atrás en el solo (inc, negativo)
        soloMastilAmp: 0.12,       // recorrido de la mano izquierda por el mástil en el solo (bIz)
        soloPeriodo: 4             // pulsos por recorrido completo del mástil
    },
    bateria: {
        energiaMinima: 0.6,        // fracción de amplitud con energía 0
        exponenteGolpe: 4,         // qué tan corto es el golpe de bombo, caja y platillo (más alto = más corto)
        exponenteHihat: 3,         // ídem para el hi-hat (corcheas)
        asiento: -0.25,            // cuerpo.position.y: se sienta en el banquito
        inclinacion: 0.08,         // torso algo al frente (inc)
        cabezaBase: 0.05,          // cx en reposo
        cabezaPulso: 0.1,          // cabeceo al pulso (cx)
        cabezaCoro: 0.2,           // cabeceo al pulso en el coro (cx)
        pDx: -1.5,                 // muslos al frente (piernas dobladas)
        rodilla: 1.5,              // pantorrillas hacia abajo (rodD/rodI)
        pieBombo: 0.3,             // cuánto avanza el muslo derecho al pegar al bombo
        rodillaBombo: 0.5,         // cuánto se estira la pantorrilla derecha al pegar al bombo
        derechaBaseX: -1.0,        // baqueta derecha sobre el hi-hat
        derechaBaseZ: 0.2,         // baqueta derecha hacia el centro (hi-hat)
        hihatBaja: 0.35,           // cuánto baja la derecha en cada golpe de hi-hat
        platilloX: -2.2,           // baqueta derecha sobre el platillo (coro, más arriba)
        platilloZ: -0.5,           // baqueta derecha hacia afuera (platillo)
        platilloBaja: 0.3,         // golpe sobre el platillo
        izqBaseX: -1.0,            // baqueta izquierda sobre la caja
        izqBaseZ: -0.15,           // baqueta izquierda hacia el centro
        cajaBaja: 0.35             // cuánto baja la izquierda en cada golpe de caja
    },
    bajo: {
        cabezaBase: 0.05,          // cx en reposo
        cabezaPulso: 0.06,         // cabeceo suave al pulso (cx)
        falloCabeza: 0.35,         // agacha la cabeza al fallar (cx)
        falloInclinacion: 0.08,    // se encorva al fallar (inc)
        brazoDX: -0.6,             // mano derecha (púas o dedos) en reposo
        brazoDZ: 0.3,              // mano derecha hacia el pecho (cuerdas)
        slapBajada: 0.45,          // cuánto baja la derecha en el slap
        brazoIX0: -1.25,           // mano izquierda en el carril 0 (cerca de la cabeza, más arriba)
        brazoIXRango: 0.5,         // cuánto baja la izquierda del carril 0 al último (bIx)
        brazoIZ0: 0.55,            // mano izquierda en el carril 0 (abertura lateral)
        brazoIZRango: 0.2,         // cuánto se cierra la izquierda hacia el cuerpo (bIz)
        carrilMax: 3               // carril más cercano al cuerpo
    },
    publico: {
        energiaMinima: 0.6,        // fracción de intensidad con energía 0
        intensidadBase: 0.4,       // intensidad con ánimo 0
        intensidadAnimo: 0.6,      // cuánto suma |ánimo| a la intensidad
        desfaseMax: 0.5,           // desfase máximo entre personas (en pulsos)
        aplauseX: -1.3,            // manos al frente al aplaudir
        aplauseZ: 0.3,             // manos separadas del centro al aplaudir (se juntan con la palmada)
        palmada: 0.5,              // cuánto se juntan las manos en cada palmada
        palmadaNitidez: 3,         // qué tan corta es la palmada
        abucheCabeza: 0.5,         // cabeza de lado a lado al abuchear (cy)
        abucheCiclo: 4,            // pulsos por vaivén de la cabeza
        punoAltura: 1.1,           // altura del puño al abuchear
        punoCiclo: 2,              // pulsos por subir y bajar el puño
        saltoAltura: 0.25,         // altura del rebote al pulso (y)
        saltoBrazos: 2.7,          // brazos arriba al saltar (magnitud, máx. 2.9)
        cabezaPulso: 0.1,          // cabeceo al pulso al saltar (cx)
        miraBalanceo: 0.08,        // balanceo lateral del torso al mirar (rz)
        miraCabeza: 0.12,          // giro suave de la cabeza al mirar (cy)
        miraCiclo: 4               // pulsos por balanceo al mirar
    }
};

// Pulso dentro de un ciclo de `x` (0 = golpe). Vale 1 en x = 0 y 0 en x = 0,5; continuo al repetirse.
const golpe = (x, n) => Math.pow((1 + Math.cos(2 * Math.PI * x)) / 2, n);
// Posición dentro de un ciclo de `periodo` pulsos (0 al empezar el ciclo), continua.
const ciclo = (r, periodo) => ((r.pulso % periodo) + r.fase) / periodo;
// Factor de amplitud según la energía del ritmo.
const factorEnergia = (minima, energia) => minima + (1 - minima) * energia;

// Salonas toca la guitarra de pie.
export function guitarra(r, G = GESTOS_SALONAS) {
    const g = G.guitarra;
    const t = r.pulso + r.fase;
    const coro = r.seccion === 'coro';
    const solo = r.seccion === 'solo';
    const e = factorEnergia(g.energiaMinima, r.energia);
    const rasgueo = Math.cos(Math.PI * 2 * t);   // corcheas: +1 / -1 alternados (abajo-arriba)
    const nod = golpe(t, 2);
    const cambioCompas = Math.sin(2 * Math.PI * (r.pulso % g.compas) / g.compas);
    const salto = Math.sin(Math.PI * r.salto);
    return {
        cx: g.cabezaBase + (coro ? g.cabezaCoro : g.cabezaPulso) * nod,
        inc: solo ? g.soloInclinacion : 0,
        y: g.saltoAltura * salto,
        bDx: g.brazoDX + g.rasgueoAmp * e * rasgueo - g.saltoBrazoD * r.salto,
        bDz: g.brazoDZ,
        bIx: g.brazoIX + g.compasAmp * cambioCompas,
        bIz: g.brazoIZ + (solo ? g.soloMastilAmp * Math.sin(2 * Math.PI * t / g.soloPeriodo) : 0),
        rodD: g.pieMarca * nod
    };
}

// Salonas toca la batería sentado en el banquito. Devuelve { angulos, golpes }.
export function bateria(r, G = GESTOS_SALONAS) {
    const b = G.bateria;
    const t = r.pulso + r.fase;
    const coro = r.seccion === 'coro';
    const wc = coro ? 1 : 0;
    const e = factorEnergia(b.energiaMinima, r.energia);
    const x2 = ciclo(r, 2);   // bombo en 1 y 3 (x2 = 0), caja en 2 y 4 (x2 = 0,5)
    const x4 = ciclo(r, 4);   // platillo al empezar el compás
    const bombo = golpe(x2, b.exponenteGolpe);
    const caja = golpe(x2 + 0.5, b.exponenteGolpe);
    const hihat = golpe(2 * t, b.exponenteHihat);   // una vez por corchea
    const platillo = coro ? golpe(x4, b.exponenteGolpe) : 0;
    const nod = golpe(t, 2);
    const hihatX = b.derechaBaseX + b.hihatBaja * e * hihat;
    const platX = b.platilloX + b.platilloBaja * e * platillo;
    return {
        angulos: {
            cx: b.cabezaBase + (coro ? b.cabezaCoro : b.cabezaPulso) * nod,
            inc: b.inclinacion,
            y: b.asiento,
            bDx: (1 - wc) * hihatX + wc * platX,
            bDz: (1 - wc) * b.derechaBaseZ + wc * b.platilloZ,
            bIx: b.izqBaseX + b.cajaBaja * e * caja,
            bIz: b.izqBaseZ,
            pDx: b.pDx - b.pieBombo * bombo,
            pIx: b.pDx,
            rodD: b.rodilla - b.rodillaBombo * bombo,
            rodI: b.rodilla
        },
        golpes: { bombo, caja, hihat, platillo }
    };
}

// El jugador toca el bajo colgado. extra = { carril 0..3, slap 0..1, fallo 0..1 } (ya suavizados afuera).
export function bajo(r, G = GESTOS_SALONAS, extra = {}) {
    const b = G.bajo;
    const { carril = 0, slap = 0, fallo = 0 } = extra;
    const nod = golpe(r.pulso + r.fase, 2);
    const cerca = carril / b.carrilMax;   // 0 = cabeza del bajo, 1 = cuerpo
    return {
        cx: b.cabezaBase + b.cabezaPulso * nod + b.falloCabeza * fallo,
        inc: b.falloInclinacion * fallo,
        bDx: b.brazoDX + b.slapBajada * slap,
        bDz: b.brazoDZ,
        bIx: b.brazoIX0 + b.brazoIXRango * cerca,
        bIz: b.brazoIZ0 - b.brazoIZRango * cerca
    };
}

// Una persona del público de pie. extra = { animo -1..1, desfase 0..1, tipo: aplaude|abuchea|salta|mira }.
export function publico(r, G = GESTOS_SALONAS, extra = {}) {
    const p = G.publico;
    const { animo = 0, desfase = 0, tipo = 'mira' } = extra;
    const t = r.pulso + r.fase + desfase * p.desfaseMax;
    const intensidad = (p.intensidadBase + p.intensidadAnimo * Math.abs(animo)) * factorEnergia(p.energiaMinima, r.energia);
    const nod = golpe(t, 2);
    if (tipo === 'aplaude') {
        const palmada = golpe(t, p.palmadaNitidez) * intensidad;
        return {
            bDx: p.aplauseX * intensidad,
            bDz: p.aplauseZ + p.palmada * palmada,
            bIx: p.aplauseX * intensidad,
            bIz: -p.aplauseZ - p.palmada * palmada
        };
    }
    if (tipo === 'abuchea') {
        return {
            cy: p.abucheCabeza * intensidad * Math.sin(2 * Math.PI * t / p.abucheCiclo),
            bDx: -p.punoAltura * intensidad * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / p.punoCiclo))
        };
    }
    if (tipo === 'salta') {
        const subeDerecho = 0.5 + 0.5 * Math.cos(Math.PI * t);   // alterna: un brazo sube y el otro baja
        return {
            cx: p.cabezaPulso * intensidad * nod,
            y: p.saltoAltura * intensidad * golpe(t, 2),
            bDx: -p.saltoBrazos * intensidad * subeDerecho,
            bIx: -p.saltoBrazos * intensidad * (1 - subeDerecho)
        };
    }
    // mira (y cualquier tipo desconocido): balanceo suave
    return {
        cy: p.miraCabeza * intensidad * Math.sin(2 * Math.PI * t / p.miraCiclo),
        rz: p.miraBalanceo * intensidad * Math.sin(2 * Math.PI * t / p.miraCiclo)
    };
}
