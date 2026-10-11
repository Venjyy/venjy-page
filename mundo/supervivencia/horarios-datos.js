// =========================================================
// VENJY · Supervivencia · Horarios de los amigos (7j-0)
// Solo datos para mostrar en su panel de «Hablar»: de qué hora a qué hora están en su lugar. Todavía no
// mueven a nadie: las rutinas (6d etapa 2) leerán estos tramos. El lugar coincide con el `ancla` de
// mundo/datos/posiciones.json (lo comprueba tests/hora.mjs). Horas de reloj 0-24 (ver reloj.js).
// =========================================================
const LUGARES = {
    campamento: { es: 'en el campamento', en: 'at the camp' },
    iglu: { es: 'en el iglú', en: 'at the igloo' },
    atalaya: { es: 'en la atalaya', en: 'at the watchtower' },
    naufragio: { es: 'en el naufragio', en: 'at the shipwreck' },
    escenario: { es: 'en el escenario', en: 'at the stage' }
};
const h = (ancla, de = 8, a = 18) => ({ ancla, de, a, lugar: LUGARES[ancla] });

export const HORARIOS = {
    hadad: h('campamento'), nacho: h('campamento'), andy: h('campamento'),
    moises: h('iglu'), lalo: h('iglu'),
    boris: h('atalaya'), lucho: h('atalaya'),
    braulio: h('naufragio'),
    conejeros: h('escenario')
};
