// =========================================================
// VENJY · Supervivencia · Ajustes y visitas de las rutinas (6d etapa 2, PR 2), sin three.js ni DOM
// Valores del código + mundo/datos/rutinas.json: `ajustes` va a RUTINA_BASE, `visitas` son las visitas por horario
// (quién visita a quién, de qué hora a qué hora y qué hacen al llegar), `textos` las líneas del panel, `acompanar` lo que dicen
// los acompañantes (7i, acompanante.js) y `horarios` / `lugares` ajustan los
// HORARIOS de horarios-datos.js (el panel de cada amigo). Lo leen el juego (rutinas.js), el Estudio (pestaña Vida)
// y las pruebas de Node. Una visita sin `quien` o sin destino se ignora.
// =========================================================
import { HORARIOS, LUGARES } from './horarios-datos.js';

export const RUTINA_BASE = {
    revisar: 0.5,       // cada cuántos segundos mira la hora y decide (no hace falta en cada cuadro)
    gesto: 2.4,         // segundos que dura el gesto al llegar
    frase: 4,           // segundos que se ve el globo al llegar
    respuesta: 1.4,     // segundos después de llegar en que contesta quien recibe la visita
    girar: 0.6,         // segundos en que quien recibe gira la cabeza hacia quien llegó (y de vuelta al irse)
    cuello: 1.1,        // cuánto puede girar el cuello quien recibe para mirarlo (radianes; si hace falta más, queda en el tope)
    radioEncuentro: 6,  // al llegar, quien visita tiene que estar a menos de esto (bloques); si no, «no está»
    acercarse: 2,       // … si no está tan cerca, lo intenta de nuevo esta cantidad de veces antes del «¿Y …?» (un camino
                        // parcial cuenta como llegada a unos bloques del destino: a veces quedaba a 6 y pico y no lo veía)
    esperaAusente: 4,   // segundos que se queda reaccionando a que no estaba antes de volver
    radioSaludo: 24,    // el saludo (gestos y globos) solo se dibuja con el jugador a menos de esto (bloques)
    saludoLejos: 1,     // 1 = lejos del jugador el saludo pasa igual (solo el reloj); 0 = lejos no hay saludo
    anticipar: 1,       // 1 = sale antes según la distancia para llegar a la hora `de`; 0 = sale a la hora `de`
    rodeo: 1.3,         // el camino de verdad es esto más largo que la línea recta (para calcular cuándo salir)
    segundosHora: 25,   // segundos de juego que dura una hora del reloj (reloj.js: de media 25)
    // Te incluyen (PR 3): con amistad alta, quien anda de visita (yendo, allá o de vuelta) te saluda al pasar
    nivelIncluir: 3,    // nivel de amistad desde el que te saludan al pasar (0 Desconocido … 3 Buen amigo, 4 Íntimo; 5 = nunca)
    radioIncluir: 7,    // a menos de esto (bloques) del jugador
    esperaIncluir: 90,  // segundos antes de volver a saludarte la misma persona
    // Acompañantes (7i): «¿Me acompañas?» en «Hablar»
    nivelAcompanar: 3   // nivel de amistad desde el que te acompaña (3 Buen amigo, 4 Íntimo; 5 = nunca)
};
const HORAS = ['de', 'a'];
// Lo que hace quien visita si no encuentra a la persona (se lo llevó el jugador, no la alcanzó): gesto y frase;
// {quien} = a quien venía a ver. rutinas.json → `ausente` lo cambia para todas y `visitas.<clave>.ausente` para una
export const AUSENTE_BASE = { gesto: 'rasca', texto: { es: '¿Y {quien}? Pensé que estaba aquí.', en: "Where's {quien}? I thought they'd be here." } };
// Lo que dice al pasar junto al jugador con amistad alta, según lo que está haciendo; {quien} = a quien va a ver o visita.
// rutinas.json → `incluir` lo cambia (gesto y cada frase por separado)
export const INCLUIR_BASE = {
    gesto: 'saluda',
    yendo: { es: '¡Hola! Voy a ver a {quien}. ¿Te vienes?', en: 'Hi! Off to see {quien}. Coming along?' },
    visitando: { es: '¡Hola! Ven, estamos aquí con {quien}.', en: "Hey! Come over, I'm here with {quien}." },
    volviendo: { es: '¡Hola! Ya voy de vuelta.', en: 'Hey! Heading back now.' },
    paseo: { es: '¡Hola! Ando de paseo.', en: "Hey! Just out for a walk." }
};
const FRASES_INCLUIR = ['yendo', 'visitando', 'volviendo', 'paseo'];
// Acompañantes (7i): botones de «Hablar» y lo que dice. {quien} = la persona (o el jugador) de la que se habla, {lugar} = su
// sitio como lo nombra el panel («en el campamento», LUGARES). Los gestos son nombres de moldes.js. rutinas.json → `acompanar` cambia cada uno por separado
export const ACOMPANAR_BASE = {
    boton: { es: '¿Me acompañas?', en: 'Will you come with me?' },
    soltar: { es: 'Puedes volver', en: 'You can head back' },
    acepta: { es: '¡Vamos! Te sigo.', en: "Let's go! I'll follow you." },
    corta: { es: 'Le aviso a {quien} que no llego. ¡Vamos!', en: "I'll tell {quien} I can't make it. Let's go!" },
    despide: { es: '¡Nos vemos! Estaré {lugar}.', en: "See you! I'll be {lugar}." },
    cambia: { es: 'Te dejo con {quien}. ¡Nos vemos!', en: "I'll leave you with {quien}. See you!" },
    espera: { es: '¡Espérame!', en: 'Wait for me!' },
    ocupado: { es: 'Ahora ando con {quien}.', en: "I'm with {quien} right now." },
    ahoraNo: { es: 'Ahora no puedo.', en: "I can't right now." },
    lugar: { es: 'Se juega {lugar}: vuelve allá con {quien}.', en: "It's played {lugar}: head back there with {quien}." },
    // 7i PR 2: órdenes, peleas y su torre
    ordenSigue: { es: 'Sígueme', en: 'Follow me' },
    ordenQuieto: { es: 'Espérame aquí', en: 'Wait here' },
    ordenTranquilo: { es: 'No pelees', en: "Don't fight" },
    diceSigue: { es: '¡Voy contigo!', en: "I'm right behind you!" },
    diceQuieto: { es: 'Aquí te espero.', en: "I'll wait here." },
    diceTranquilo: { es: 'Tranqui, no me meto.', en: "Okay, I'll stay out of it." },
    cansado: { es: '¡Son muchos! Me siento un rato.', en: "Too many of them! I'll sit for a bit." },
    listo: { es: 'Listo, ¡sigamos!', en: "Okay, let's keep going!" },
    sinBloques: { es: '¡No tengo más bloques!', en: "I'm out of blocks!" },
    gestoAcepta: 'asiente',
    gestoDespide: 'saluda'
};
const GESTOS_ACOMPANAR = ['gestoAcepta', 'gestoDespide'];
let ajustes = { ...RUTINA_BASE }, visitas = {}, textos = {}, ausente = { ...AUSENTE_BASE }, incluir = { ...INCLUIR_BASE }, acompanar = { ...ACOMPANAR_BASE };
// Copias de fábrica de HORARIOS (para volver a ellas al aplicar otro rutinas.json)
const HORARIOS_CODIGO = JSON.parse(JSON.stringify(HORARIOS));
const LUGARES_CODIGO = JSON.parse(JSON.stringify(LUGARES));

const hora = v => Number.isFinite(v) && v >= 0 && v <= 24;
const texto = o => (o && typeof o.es === 'string' ? { es: o.es, en: typeof o.en === 'string' && o.en ? o.en : o.es } : null);
// Lo que hace una persona al llegar (o al recibir): un gesto (nombre de moldes.js) y una frase { es, en }
const accion = o => (o ? { gesto: typeof o.gesto === 'string' && o.gesto ? o.gesto : null, texto: texto(o.texto) } : { gesto: null, texto: null });

// Aplica rutinas.json entero. Ignora lo que no sea válido (el Estudio y validar ya lo revisan con el esquema).
export function fijarRutinas(datos) {
    ajustes = { ...RUTINA_BASE };
    const a = datos && datos.ajustes;
    if (a) for (const k of Object.keys(RUTINA_BASE)) if (Number.isFinite(a[k])) ajustes[k] = a[k];
    ausente = { ...AUSENTE_BASE };
    if (datos && datos.ausente) { const x = accion(datos.ausente); if (x.gesto) ausente.gesto = x.gesto; if (x.texto) ausente.texto = x.texto; }
    incluir = { ...INCLUIR_BASE };
    const inc = datos && datos.incluir;
    if (inc) {
        if (typeof inc.gesto === 'string' && inc.gesto) incluir.gesto = inc.gesto;
        for (const k of FRASES_INCLUIR) { const x = texto(inc[k]); if (x) incluir[k] = x; }
    }
    acompanar = { ...ACOMPANAR_BASE };
    const ac = datos && datos.acompanar;
    if (ac) for (const k of Object.keys(ACOMPANAR_BASE)) {
        if (GESTOS_ACOMPANAR.includes(k)) { if (typeof ac[k] === 'string') acompanar[k] = ac[k]; }
        else { const x = texto(ac[k]); if (x) acompanar[k] = x; }
    }
    textos = {};
    for (const [k, t] of Object.entries((datos && datos.textos) || {})) { const x = texto(t); if (x) textos[k] = x; }
    visitas = {};
    for (const [clave, v] of Object.entries((datos && datos.visitas) || {})) {
        if (!v || typeof v.quien !== 'string' || !(typeof v.visita === 'string' || typeof v.lugar === 'string')) continue;
        if (!HORAS.every(k => hora(v[k])) || v.de === v.a) continue;
        visitas[clave] = {
            clave, quien: v.quien, visita: typeof v.visita === 'string' ? v.visita : null, lugar: typeof v.lugar === 'string' ? v.lugar : null,
            de: v.de, a: v.a, activa: v.activa !== false, llegada: accion(v.llegada), respuesta: accion(v.respuesta),
            ausente: v.ausente ? accion(v.ausente) : null
        };
    }
    // Horarios del panel: se cambian en el mismo objeto (hablar.js ya lo tiene importado)
    for (const k of Object.keys(LUGARES)) delete LUGARES[k];
    Object.assign(LUGARES, JSON.parse(JSON.stringify(LUGARES_CODIGO)));
    for (const [k, t] of Object.entries((datos && datos.lugares) || {})) { const x = texto(t); if (x) LUGARES[k] = x; }
    for (const k of Object.keys(HORARIOS)) delete HORARIOS[k];
    for (const [k, h] of Object.entries(HORARIOS_CODIGO)) HORARIOS[k] = { ...h, lugar: LUGARES[h.ancla] || h.lugar };
    for (const [k, h] of Object.entries((datos && datos.horarios) || {})) {
        if (!h) continue;
        const ancla = typeof h.ancla === 'string' ? h.ancla : HORARIOS[k] && HORARIOS[k].ancla;
        if (!ancla) continue;
        const de = hora(h.de) ? h.de : HORARIOS[k] ? HORARIOS[k].de : 8, a2 = hora(h.a) ? h.a : HORARIOS[k] ? HORARIOS[k].a : 18;
        HORARIOS[k] = { ancla, de, a: a2, lugar: LUGARES[ancla] || { es: ancla, en: ancla } };
    }
    return { ajustes, visitas };
}
export const ajustesRutinas = () => ajustes;
export const visitasRutinas = () => visitas;
// Textos del panel que cambió el dueño (los demás, TEXTOS_RUTINA de rutinas.js)
export const textosRutinas = () => textos;
export const ausenteRutinas = () => ausente;
export const incluirRutinas = () => incluir;
export const acompanarRutinas = () => acompanar;
