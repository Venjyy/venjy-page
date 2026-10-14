// =========================================================
// VENJY · Supervivencia · Ajustes y visitas de las rutinas (6d etapa 2, PR 2), sin three.js ni DOM
// Valores del código + mundo/datos/rutinas.json: `ajustes` va a RUTINA_BASE, `visitas` son las visitas por horario
// (quién visita a quién, de qué hora a qué hora y qué hacen al llegar), `textos` las líneas del panel y `horarios` / `lugares` ajustan los
// HORARIOS de horarios-datos.js (el panel de cada amigo). Lo leen el juego (rutinas.js), el Estudio (pestaña Vida)
// y las pruebas de Node. Una visita sin `quien` o sin destino se ignora.
// =========================================================
import { HORARIOS, LUGARES } from './horarios-datos.js';

export const RUTINA_BASE = {
    revisar: 0.5,       // cada cuántos segundos mira la hora y decide (no hace falta en cada cuadro)
    gesto: 2.4,         // segundos que dura el gesto al llegar
    frase: 4,           // segundos que se ve el globo al llegar
    respuesta: 1.4,     // segundos después de llegar en que contesta quien recibe la visita
    radioSaludo: 24,    // el saludo (gestos y globos) solo se dibuja con el jugador a menos de esto (bloques)
    saludoLejos: 1,     // 1 = lejos del jugador el saludo pasa igual (solo el reloj); 0 = lejos no hay saludo
    anticipar: 1,       // 1 = sale antes según la distancia para llegar a la hora `de`; 0 = sale a la hora `de`
    rodeo: 1.3,         // el camino de verdad es esto más largo que la línea recta (para calcular cuándo salir)
    segundosHora: 25    // segundos de juego que dura una hora del reloj (reloj.js: de media 25)
};
const HORAS = ['de', 'a'];
let ajustes = { ...RUTINA_BASE }, visitas = {}, textos = {};
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
    textos = {};
    for (const [k, t] of Object.entries((datos && datos.textos) || {})) { const x = texto(t); if (x) textos[k] = x; }
    visitas = {};
    for (const [clave, v] of Object.entries((datos && datos.visitas) || {})) {
        if (!v || typeof v.quien !== 'string' || !(typeof v.visita === 'string' || typeof v.lugar === 'string')) continue;
        if (!HORAS.every(k => hora(v[k])) || v.de === v.a) continue;
        visitas[clave] = {
            clave, quien: v.quien, visita: typeof v.visita === 'string' ? v.visita : null, lugar: typeof v.lugar === 'string' ? v.lugar : null,
            de: v.de, a: v.a, activa: v.activa !== false, llegada: accion(v.llegada), respuesta: accion(v.respuesta)
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
