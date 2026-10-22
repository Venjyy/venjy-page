// =========================================================
// VENJY · Estudio · escenas.json -> guion de ejecución de escena-amistad.js (fase 5, PR 5a)
// Puro: sin DOM, sin Three.js. Lo usan el juego (escena-amistad.js), el CLI (resumen y validar) y las pruebas.
// Formato del JSON: estudio/esquemas/escenas.schema.json. Decisiones: estudio/DISENO.md §13.
//   animacionDeDatos(def)          escena «amistad» -> fila de ANIMACIONES (el juego la fusiona por clave)
//   guionDeDatos(def, { durLinea, moldes })   escena «guion» -> guion de ejecución
//   reglasEscenas(datos, nombres)  las reglas que el esquema no expresa -> [{ tipo: 'error' | 'aviso', texto }]
//   tiempoDeAncla(lineas, ancla, durLinea)   instante que da un `ancla` (B3; lo usan las reglas y el editor)
//   personasUsadas(def, personajes)          claves de persona usadas como `q` (para el `reparto` automático, B3)
//   planosDe(camara)               `camara` de una escena -> lista de planos (nombre de juego o lista propia), null si no hay
//   opcionesCamara(camara)         lo mismo con las distancias de la familia, listo para camaras.iniciarCine
// =========================================================
import { PLANOS_AMISTAD, PLANOS_GRUPO, PLANOS_GRUPO_TECHO } from '../supervivencia/escena-amistad-datos.js';

// Una escena «amistad» del JSON, sin tipo, camara ni nota, es exactamente la entrada de ANIMACIONES
// (la prueba mundo/tests/estudio-escenas.mjs lo comprueba con paridad exacta). La cámara va aparte: planosDe / opcionesCamara.
export function animacionDeDatos(def) {
    const { tipo, camara, nota, ...resto } = def;
    return resto;
}

// Una escena «guion»: lo mismo que el guion de ejecución. `d` que falta vale durLinea(texto) (lo que se alcanza a
// leer, regla del dueño: no apurar frases) y los gestos se buscan en `moldes` (MOLDES de moldes.js) como en las
// bienvenidas. `actores` va tal cual (clave o { clave, radio }).
// Etapa B3 (estudio/DISENO.md §40): las claves nuevas se convierten a lo que lee el motor. Las `ancla` y `base` son del
// editor y se quitan (el juego corre el número guardado); lo opcional que falta se completa (`objetos`: mas, desde, hasta,
// crece, cambia; `efectos`: opciones; `marcas`: solo el número). Sin claves nuevas, el resultado es el de siempre.
// `personajes` (opcional): las claves de personas; la lista de las usadas como `q` sale en `personas` para que el motor
// arme el `reparto` según quién es el amigo y cuál es tu skin.
export function guionDeDatos(def, { durLinea, moldes, personajes } = {}) {
    const { tipo, camara, nota, lineas, base, ...resto } = def;
    const { pista, objetos, efectos, marcas } = def;
    const salida = {
        ...resto,
        ...(camara ? { camara } : {}),
        tipo: 'guion',
        lineas: (lineas || []).map(l => ({ q: l.q, a: l.a, d: l.d !== undefined ? l.d : durLinea ? durLinea(l.texto) : 3, texto: l.texto })),
        gestos: moldes || {}
    };
    if (pista) salida.pista = Object.fromEntries(Object.entries(pista).map(([q, tramos]) => [q, tramos.map(tramoDeDatos)]));
    if (objetos) salida.objetos = objetos.map(o => objetoDeDatos(o, def.T));
    if (efectos) salida.efectos = efectos.map(([t, tipoEfecto, op]) => [t, tipoEfecto, quitarAncla(op || {})]);
    if (marcas) salida.marcas = Object.fromEntries(Object.entries(marcas).map(([k, m]) => [k, typeof m === 'number' ? m : m.t]));
    if (personajes) {
        const p = personasUsadas(def, new Set(personajes));
        if (p.length) salida.personas = p;
    }
    return salida;
}

const quitarAncla = ({ ancla, ...resto }) => resto;
// [gesto, desde, hasta, { reloj, escala, espejo, ancla }] -> el mismo sin `ancla`; sin opciones queda de 3 elementos
function tramoDeDatos(t) {
    if (t.length < 4) return t;
    const op = quitarAncla(t[3]);
    return Object.keys(op).length ? [t[0], t[1], t[2], op] : [t[0], t[1], t[2]];
}
function objetoDeDatos(o, T) {
    const { ancla, ...resto } = o;
    return { ...resto, en: { ...resto.en, mas: resto.en.mas || [0, 0, 0] }, desde: o.desde !== undefined ? o.desde : 0, hasta: o.hasta !== undefined ? o.hasta : T, crece: o.crece || [], cambia: o.cambia || [] };
}

// Las personas (y no actores declarados ni n, j, todos) que nombra la escena como `q`: frases, pistas, giros, caminos,
// objetos y efectos. Orden alfabético.
export function personasUsadas(def, personajes) {
    const declarados = new Set(['n', 'j', 'todos', 'centro', ...Object.keys(def.actores || {})]);
    const usadas = new Set();
    const ver = q => { if (typeof q === 'string' && !declarados.has(q) && personajes.has(q)) usadas.add(q); };
    for (const l of def.lineas || []) ver(l.q);
    for (const k of ['pista', 'giros', 'caminos']) for (const q of Object.keys(def[k] || {})) ver(q);
    for (const [, mira] of Object.values(def.giros || {}).flat()) ver(mira);
    for (const [, a] of Object.values(def.caminos || {}).flat()) if (a && typeof a === 'object') { ver(a.hacia); ver(a.desde); }
    for (const o of def.objetos || []) { ver(o.en && o.en.q); ver(o.en && o.en.desde); }
    for (const e of def.efectos || []) ver(e[2] && e[2].en);
    return [...usadas].sort();
}

// Instante que da un `ancla` { frase, de: 'inicio' | 'fin', mas } sobre `lineas` del JSON. null si la frase no existe o,
// pidiendo su fin, no se sabe cuánto dura (sin `d` ni durLinea). Lo usan las reglas y el editor (B3c).
export function tiempoDeAncla(lineas, ancla, durLinea) {
    const l = lineas && lineas[ancla.frase];
    if (!l) return null;
    if (ancla.de === 'inicio') return l.a + (ancla.mas || 0);
    const d = l.d !== undefined ? l.d : durLinea ? durLinea(l.texto) : null;
    return d === null ? null : l.a + d + (ancla.mas || 0);
}

// Los tres juegos de planos que trae el juego, por el nombre que usa escenas.json (esquema: camara.planos)
export const JUEGOS_PLANOS = { amistad: PLANOS_AMISTAD, grupo: PLANOS_GRUPO, 'grupo-techo': PLANOS_GRUPO_TECHO };

// `camara` = { planos: 'amistad' | 'grupo' | 'grupo-techo' | [plano, ...] }. Nombre -> el mismo arreglo que usa el juego
// (mismos números); lista -> tal cual. Sin camara, o con un nombre que no existe: null (el juego usa los suyos de siempre).
export function planosDe(camara) {
    const p = camara && camara.planos;
    if (Array.isArray(p)) return p.length ? p : null;
    return typeof p === 'string' && Object.prototype.hasOwnProperty.call(JUEGOS_PLANOS, p) ? JUEGOS_PLANOS[p] : null;
}

// Opciones para camaras.iniciarCine: planosDe + las distancias de la familia. grupo*: las de las escenas de grupo (con
// grupo-techo, las del iglú); nombre «amistad» o lista propia: las de dos personajes (`sinTerceros`: la cámara no se
// queda con alguien más entre medio). Los mismos números que escena-amistad.js tenía en línea.
export function opcionesCamara(camara) {
    const planos = planosDe(camara);
    if (!planos) return null;
    const nombre = camara.planos;
    if (nombre === 'grupo') return { planos, minDist: 1.6, evitarDist: 2.0, holgura: 0.5 };
    if (nombre === 'grupo-techo') return { planos, minDist: 1, evitarDist: 1.2, holgura: 0 };
    return { planos, minDist: 1.8, evitarDist: 2.4, holgura: 0.7, sinTerceros: true };
}

const r3 = v => Math.round(v * 1000) / 1000;
// 4.4 + 4.2 da 8.600000000000001: un final que cae justo en T no es un error
const EPS = 1e-9;

// nombres: { gestos: Set | Array de nombres que el juego resuelve (GESTOS, GESTOS_AMISTAD y MOLDES),
//            animaciones: Set | Array con las claves de ANIMACIONES, durLinea?: txt -> segundos,
//            B3 (cada uno opcional; sin él, esa comprobación se salta): personas (claves de PERSONAJES), grupos (claves de
//            GRUPOS), iconos (iconos.json), pix (PIX de moldes.js), sonidos (SONIDOS), codigos (CODIGO_ESCENAS) }
// Errores: tramos en orden, dentro de T y sin superponerse; actores declarados; gestos que existen; golpes y
// corazones en orden y antes de T; la frase termina antes de T. Avisos: frases que se pisan, frase apurada,
// texto sin `revisado`, escena «amistad» que el juego ignora (su clave no está en ANIMACIONES).
// Claves de B3 (DISENO §40, reglasB3 abajo): dispara (existe y no se repite), tiempos de giros, caminos, objetos, efectos y
// sonidos en orden y antes de T, q válida, catálogo cerrado, caminos que vuelven al sitio, codigo que existe; avisos si el
// número guardado no coincide con su `ancla`.
export function reglasEscenas(datos, nombres = {}) {
    const salida = [];
    const mal = texto => salida.push({ tipo: 'error', texto });
    const aviso = texto => salida.push({ tipo: 'aviso', texto });
    const gestos = nombres.gestos ? new Set(nombres.gestos) : null;
    const animaciones = nombres.animaciones ? new Set(nombres.animaciones) : null;
    const durLinea = nombres.durLinea || null;
    const catalogo = c => (nombres[c] ? new Set(nombres[c]) : null);
    const personas = catalogo('personas');
    const vistos = new Map();

    for (const [clave, e] of Object.entries((datos && datos.escenas) || {})) {
        const donde = `$.escenas.${clave}`;
        const T = e.T;
        const declarados = new Set(['n', 'j', ...Object.keys(e.actores || {})]);
        const esQ = q => declarados.has(q) || (personas !== null && personas.has(q));
        const validos = [...declarados, ...(personas ? ['una persona'] : [])].join(', ');

        for (const [q, tramos] of Object.entries(e.pista || {})) {
            if (!esQ(q)) mal(`${donde}.pista.${q}: actor no declarado (valen ${validos})`);
            let fin = 0;
            tramos.forEach(([g, desde, hasta], i) => {
                const ruta = `${donde}.pista.${q}[${i}]`;
                if (gestos && !gestos.has(g)) mal(`${ruta}: el gesto «${g}» no existe en el juego (GESTOS, GESTOS_AMISTAD o MOLDES)`);
                if (!(desde < hasta)) mal(`${ruta}: desde ${desde} tiene que ser menor que hasta ${hasta}`);
                else if (hasta > T) mal(`${ruta}: hasta ${hasta} pasa de T ${T}`);
                if (desde < fin) mal(`${ruta}: ${g} (${desde}) se superpone con el tramo anterior, que termina en ${fin}`);
                fin = Math.max(fin, hasta);
            });
        }

        for (const k of ['golpes', 'corazones']) {
            const l = e[k] || [];
            l.forEach((s, i) => {
                if (s >= T) mal(`${donde}.${k}[${i}]: ${s} tiene que ser menor que T ${T}`);
                if (i > 0 && s <= l[i - 1]) mal(`${donde}.${k}[${i}]: ${s} no sigue en orden al anterior (${l[i - 1]})`);
            });
        }

        if (e.tipo === 'amistad') {
            if (e.linea && e.linea[0] + e.linea[1] > T + EPS) mal(`${donde}.linea: termina en ${r3(e.linea[0] + e.linea[1])}, después de T ${T}`);
            if (animaciones && !animaciones.has(clave)) aviso(`${donde}: «${clave}» no está en ANIMACIONES, el juego la ignora`);
        } else if (e.tipo === 'guion') {
            const lineas = e.lineas || [];
            const dura = l => (l.d !== undefined ? l.d : durLinea ? durLinea(l.texto) : null);
            lineas.forEach((l, i) => {
                const ruta = `${donde}.lineas[${i}]`;
                if (l.q !== 'todos' && !esQ(l.q)) mal(`${ruta}.q: «${l.q}» no es un actor declarado (valen ${validos} o todos)`);
                const d = dura(l);
                if (d !== null && l.a + d > T + EPS) mal(`${ruta}: termina en ${r3(l.a + d)}, después de T ${T}`);
                if (l.d !== undefined && durLinea && l.d < durLinea(l.texto)) aviso(`${ruta}.d: ${l.d} s es menos que los ${durLinea(l.texto)} s que se necesitan para leerla (frase apurada)`);
                if (!l.texto.revisado) aviso(`${ruta}.texto: sin revisar (el dueño marca revisado: true)`);
            });
            for (let i = 1; i < lineas.length; i++) {
                const a = lineas[i - 1], d = dura(a);
                if (d !== null && a.a + d > lineas[i].a) aviso(`${donde}.lineas[${i}]: empieza en ${lineas[i].a}, antes de que termine la anterior (${r3(a.a + d)})`);
            }
            reglasB3(clave, e, { mal, aviso, esQ, validos, catalogo, personas, vistos, durLinea });
        }
    }
    return salida;
}

const HUESOS = ['brazoD', 'brazoI', 'cabeza', 'cuerpo'];
export const EFECTOS_ESCENA = ['chispa', 'corazon', 'humo', 'nieve'];
export const HUESOS_ESCENA = HUESOS;
const TOL_ANCLA = 0.02;

// Las reglas de las claves de B3 de una escena «guion». ctx viene de reglasEscenas.
function reglasB3(clave, e, ctx) {
    const { mal, aviso, esQ, validos, catalogo, personas, vistos, durLinea } = ctx;
    const donde = `$.escenas.${clave}`;
    const T = e.T;
    const lineas = e.lineas || [];
    const qVale = q => q === 'todos' || esQ(q);
    const qOCentro = q => q === 'centro' || esQ(q);

    // dispara: personas, skins y grupos que existen; no puede haber dos escenas con el mismo
    const dp = e.dispara;
    if (dp) {
        const ruta = `${donde}.dispara`;
        const existe = (v, campo) => { if (personas && !personas.has(v)) mal(`${ruta}.${campo}: «${v}» no es una persona del juego`); };
        const grupos = catalogo('grupos');
        if (dp.tipo === 'bienvenida') existe(dp.skin, 'skin');
        else if (dp.tipo === 'momento') { existe(dp.persona, 'persona'); if (dp.skin) existe(dp.skin, 'skin'); }
        else if (dp.tipo === 'reencuentro') {
            dp.personas.forEach(p => existe(p, 'personas'));
            if (dp.personas[0] === dp.personas[1]) mal(`${ruta}.personas: las dos personas son la misma (${dp.personas[0]})`);
        } else if (dp.tipo === 'grupo') {
            if (grupos && !grupos.has(dp.grupo)) mal(`${ruta}.grupo: «${dp.grupo}» no es un grupo del juego`);
            if (dp.skin) existe(dp.skin, 'skin');
        }
        const llave = dp.tipo === 'reencuentro' ? `reencuentro:${[...dp.personas].sort().join('+')}` : JSON.stringify([dp.tipo, dp.skin || '', dp.persona || '', dp.grupo || '']);
        if (vistos.has(llave)) mal(`${ruta}: igual que el de la escena «${vistos.get(llave)}» (no se sabría cuál corre)`);
        else vistos.set(llave, clave);
    }

    // ancla: la frase existe y el número guardado coincide
    const ancla = (ruta, a, valor, indiceLinea) => {
        if (!a) return;
        if (a.frase >= lineas.length) { mal(`${ruta}.ancla.frase: no hay frase ${a.frase} (hay ${lineas.length})`); return; }
        if (indiceLinea !== undefined && a.frase >= indiceLinea) { mal(`${ruta}.ancla.frase: solo puede depender de una frase anterior (${a.frase} no es menor que ${indiceLinea})`); return; }
        const t = tiempoDeAncla(lineas, a, durLinea);
        if (t !== null && Math.abs(t - valor) > TOL_ANCLA) aviso(`${ruta}: el número guardado (${valor}) no coincide con su ancla (${r3(t)}); el editor lo reacomoda al abrir`);
    };
    lineas.forEach((l, i) => ancla(`${donde}.lineas[${i}]`, l.ancla, l.a, i));
    for (const [q, tramos] of Object.entries(e.pista || {})) tramos.forEach((tr, i) => { if (tr[3]) ancla(`${donde}.pista.${q}[${i}]`, tr[3].ancla, tr[1]); });

    // tiempos en orden y antes de T. estricto: claves de un mismo actor; si no, puede repetirse el instante
    const enOrden = (ruta, ts, estricto) => ts.forEach((t, i) => {
        if (t >= T) mal(`${ruta}[${i}]: ${t} tiene que ser menor que T ${T}`);
        if (i > 0 && (estricto ? t <= ts[i - 1] : t < ts[i - 1])) mal(`${ruta}[${i}]: ${t} no sigue en orden al anterior (${ts[i - 1]})`);
    });

    for (const [q, claves] of Object.entries(e.giros || {})) {
        const ruta = `${donde}.giros.${q}`;
        if (!esQ(q)) mal(`${ruta}: actor no declarado (valen ${validos})`);
        enOrden(ruta, claves.map(c => c[0]), true);
        claves.forEach(([, mira], i) => { if (typeof mira === 'string' && !qOCentro(mira)) mal(`${ruta}[${i}]: «${mira}» no es centro ni un actor`); });
    }
    for (const [q, claves] of Object.entries(e.caminos || {})) {
        const ruta = `${donde}.caminos.${q}`;
        if (!esQ(q)) mal(`${ruta}: actor no declarado (valen ${validos})`);
        enOrden(ruta, claves.map(c => c[0]), true);
        claves.forEach(([, a], i) => {
            if (a && typeof a === 'object') {
                if (a.hacia !== undefined && !esQ(a.hacia)) mal(`${ruta}[${i}].hacia: «${a.hacia}» no es un actor`);
                if (a.desde !== undefined && !qOCentro(a.desde)) mal(`${ruta}[${i}].desde: «${a.desde}» no es centro ni un actor`);
            }
        });
        if (claves.length && claves[claves.length - 1][1] !== 'sitio') mal(`${ruta}: la última clave tiene que ser "sitio" (el actor vuelve antes de que termine la escena)`);
    }

    const lugar = e.lugar;
    if (lugar) {
        if (lugar.centro && (lugar.centro.desde === 'centro' || !qOCentro(lugar.centro.desde))) mal(`${donde}.lugar.centro.desde: «${lugar.centro.desde}» tiene que ser un actor (no puede partir de sí mismo)`);
        if (lugar.jugador && !qOCentro(lugar.jugador.desde)) mal(`${donde}.lugar.jugador.desde: «${lugar.jugador.desde}» no es centro ni un actor`);
    }

    const iconos = catalogo('iconos'), pix = catalogo('pix');
    const dibujos = iconos || pix ? new Set([...(iconos || []), ...(pix || [])]) : null;
    const ids = new Set();
    (e.objetos || []).forEach((o, i) => {
        const ruta = `${donde}.objetos[${i}]`;
        if (ids.has(o.id)) mal(`${ruta}.id: «${o.id}» repetido`); else ids.add(o.id);
        const verDibujo = (d, rutaDibujo) => { if (dibujos && typeof d === 'string' && !dibujos.has(d)) mal(`${rutaDibujo}: el dibujo «${d}» no es un ícono de iconos.json ni de PIX`); };
        verDibujo(o.dibujo, `${ruta}.dibujo`);
        (o.cambia || []).forEach(([, d], j) => verDibujo(d, `${ruta}.cambia[${j}]`));
        if (o.en.hueso !== undefined) {
            if (!qVale(o.en.q)) mal(`${ruta}.en.q: «${o.en.q}» no es un actor (valen ${validos} o todos)`);
        } else if (!qOCentro(o.en.desde)) mal(`${ruta}.en.desde: «${o.en.desde}» no es centro ni un actor`);
        const desde = o.desde !== undefined ? o.desde : 0, hasta = o.hasta !== undefined ? o.hasta : T;
        if (desde >= T) mal(`${ruta}.desde: ${desde} tiene que ser menor que T ${T}`);
        if (!(desde < hasta)) mal(`${ruta}: desde ${desde} tiene que ser menor que hasta ${hasta}`);
        else if (hasta > T) mal(`${ruta}.hasta: ${hasta} pasa de T ${T}`);
        if (o.crece) enOrden(`${ruta}.crece`, o.crece.map(c => c[0]), true);
        if (o.cambia) enOrden(`${ruta}.cambia`, o.cambia.map(c => c[0]), true);
        ancla(ruta, o.ancla, desde);
    });

    const efectos = e.efectos || [];
    enOrden(`${donde}.efectos`, efectos.map(x => x[0]), false);
    efectos.forEach(([t, , op], i) => {
        const ruta = `${donde}.efectos[${i}]`;
        if (op && op.en !== undefined && !qOCentro(op.en)) mal(`${ruta}.en: «${op.en}» no es centro ni un actor`);
        if (op) ancla(ruta, op.ancla, t);
    });
    const sonidos = e.sonidos || [];
    enOrden(`${donde}.sonidos`, sonidos.map(x => x[0]), false);
    const catSonidos = catalogo('sonidos');
    sonidos.forEach(([, nombre], i) => { if (catSonidos && !catSonidos.has(nombre)) mal(`${donde}.sonidos[${i}]: el sonido «${nombre}» no existe`); });

    for (const [k, m] of Object.entries(e.marcas || {})) {
        const t = typeof m === 'number' ? m : m.t;
        if (t >= T) mal(`${donde}.marcas.${k}: ${t} tiene que ser menor que T ${T}`);
        if (typeof m === 'object') ancla(`${donde}.marcas.${k}`, m.ancla, t);
    }

    const codigos = catalogo('codigos');
    if (e.codigo !== undefined && codigos && !codigos.has(e.codigo)) mal(`${donde}.codigo: «${e.codigo}» no está en CODIGO_ESCENAS`);
}
