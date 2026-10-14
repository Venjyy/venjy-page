// =========================================================
// VENJY · Supervivencia · Horarios de los amigos (7j-0)
// De qué hora a qué hora está cada amigo en su lugar (su panel de «Hablar», misiones y tienda). Son los valores
// del código: mundo/datos/rutinas.json (`horarios`, `lugares`) los ajusta con fijarRutinas (rutinas-datos.js),
// que cambia estos mismos objetos. Las visitas por horario están en rutinas.json → `visitas` (rutinas.js).
// El lugar coincide con el `ancla` de mundo/datos/posiciones.json (lo comprueba tests/hora.mjs). Horas de reloj 0-24.
// =========================================================
export const LUGARES = {
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
