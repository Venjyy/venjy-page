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
//   B3b, piezas puras del motor (al final): escenaQueDispara, amigoDeEscena, repartoDe, repartirGuion, tramoEn, metaTramo,
//   claveEn, valorEn, caminoEn, objetoEn, eventosEn, sonidosDeEscena
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
    const { pista, objetos, efectos, sonidos, marcas } = def;
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
    if (sonidos) salida.sonidos = sonidos.map(x => [x[0], x[1]]);
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
    sonidos.forEach(([t, nombre, op], i) => {
        if (catSonidos && !catSonidos.has(nombre)) mal(`${donde}.sonidos[${i}]: el sonido «${nombre}» no existe`);
        if (op) ancla(`${donde}.sonidos[${i}]`, op.ancla, t);
    });

    for (const [k, m] of Object.entries(e.marcas || {})) {
        const t = typeof m === 'number' ? m : m.t;
        if (t >= T) mal(`${donde}.marcas.${k}: ${t} tiene que ser menor que T ${T}`);
        if (typeof m === 'object') ancla(`${donde}.marcas.${k}`, m.ancla, t);
    }

    const codigos = catalogo('codigos');
    if (e.codigo !== undefined && codigos && !codigos.has(e.codigo)) mal(`${donde}.codigo: «${e.codigo}» no está en CODIGO_ESCENAS`);
}

// ---------------------------------------------------------
// B3b (DISENO §40): piezas puras del motor. escena-amistad.js las usa cada cuadro y mundo/tests/escenas-motor.mjs
// comprueba con ellas la paridad entre una escena de JS y la misma escrita en escenas.json.
//   escenaQueDispara(escenas, consulta)   clave de la escena «guion» con ese `dispara` (la más específica gana) o null
//   amigoDeEscena(def, dp, skin, miembros)  quién es 'n' en una escena disparada
//   repartoDe(personas, amigo, skin, actores)  { reparto, actores }: personas -> 'n', 'j' o actor extra
//   repartirGuion(guion)                  frases, pistas, giros, caminos, objetos, efectos y lugar por su papel
//   tramoEn(pista, t)                     tramo activo { g, u, w, op } (peso con rampas) o null
//   metaTramo(tr, t, info, buscar)        metas del gesto con las opciones del tramo (reloj, escala, espejo)
//   claveEn(claves, t)                    la última clave [t, v] que ya pasó (giros, cambia) o undefined
//   valorEn(claves, t, porDefecto)        claves [t, v] interpoladas con suavizado (crece), como ruta()
//   caminoEn(claves, t, punto)            dónde va un actor que camina { x, y, z, rumbo } o null
//   objetoEn(o, t)                        { visible, escala, dibujo } de un objeto del catálogo
//   eventosEn(lista, t0, t, hechos, pre)  índices de efectos o sonidos que tocan en este cuadro (una vez cada uno)
//   sonidosDeEscena(...tablas)            nombre -> función, de las tablas de sonidos sin argumentos
// ---------------------------------------------------------
const suave = u => u * u * (3 - 2 * u);
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const tramoDe = (u, a, b) => limitar((u - a) / (b - a), 0, 1);
const envolvente = (t, a, b, r) => suave(Math.min(tramoDe(t, a, a + r), 1 - tramoDe(t, b - r, b)));

// consulta: { tipo, skin, persona (el amigo), grupo }. Nivel 1 = con skin (o la pareja exacta), 0 = sin skin; gana el mayor
// y, empatados, la primera en el archivo (validar no deja dos iguales).
export function escenaQueDispara(escenas, c) {
    let mejor = null, nivel = -1;
    for (const [k, d] of Object.entries(escenas || {})) {
        const p = d && d.tipo === 'guion' && d.dispara;
        if (!p || p.tipo !== c.tipo) continue;
        let n = -1;
        if (p.tipo === 'bienvenida') n = p.skin === c.skin ? 1 : -1;
        else if (p.tipo === 'momento') n = p.persona !== c.persona ? -1 : p.skin === undefined ? 0 : p.skin === c.skin ? 1 : -1;
        else if (p.tipo === 'reencuentro') n = [...p.personas].sort().join('+') === [c.skin, c.persona].sort().join('+') ? 1 : -1;
        else if (p.tipo === 'grupo') n = p.grupo !== c.grupo ? -1 : p.skin === undefined ? 0 : p.skin === c.skin ? 1 : -1;
        if (n > nivel) { mejor = k; nivel = n; }
    }
    return mejor;
}

// 'n' de una escena disparada: el Venjy del Inicio (bienvenida), la persona (momento), el otro de la pareja (reencuentro)
// o, en un grupo, de quien parte el centro (`lugar.centro.desde`) o el primer miembro que sale en la escena y no es tu skin.
export function amigoDeEscena(def, dp, skin, miembros = []) {
    if (dp.tipo === 'bienvenida') return 'venjy';
    if (dp.tipo === 'momento') return dp.persona;
    if (dp.tipo === 'reencuentro') return dp.personas[0] === skin ? dp.personas[1] : dp.personas[0];
    const desde = def.lugar && def.lugar.centro && def.lugar.centro.desde;
    if (desde && desde !== skin && miembros.includes(desde)) return desde;
    const usadas = personasUsadas(def, new Set(miembros));
    return usadas.find(p => p !== skin) || miembros.find(p => p !== skin) || null;
}

// Las personas usadas como `q` pasan a su papel: el amigo a 'n', tu skin a 'j' y el resto queda con su clave como actor
// extra (se declara solo si la escena no lo declaró). Sin personas, nada cambia.
export function repartoDe(personas, amigo, skin, actores = {}) {
    const reparto = {}, extra = { ...actores };
    for (const p of personas || []) {
        if (p === amigo) reparto[p] = 'n';
        else if (p === skin) reparto[p] = 'j';
        else if (!extra[p]) extra[p] = p;
    }
    return { reparto, actores: extra };
}

// guion.reparto ({ pony: 'j', andy: 'n' }) aplicado a todo lo que nombra a alguien. Sin reparto, el mismo guion.
export function repartirGuion(guion) {
    const rep = guion.reparto;
    if (!rep || !Object.keys(rep).length) return guion;
    const rol = q => (typeof q === 'string' && rep[q] !== undefined ? rep[q] : q);
    const porRol = o => (o ? Object.fromEntries(Object.entries(o).map(([q, v]) => [rol(q), v])) : o);
    const destino = a => (a && typeof a === 'object' ? { ...a, ...(a.hacia !== undefined ? { hacia: rol(a.hacia) } : {}), ...(a.desde !== undefined ? { desde: rol(a.desde) } : {}) } : a);
    const sitio = s => (s ? { ...s, desde: rol(s.desde) } : s);
    const salida = { ...guion, lineas: (guion.lineas || []).map(l => ({ ...l, q: rol(l.q) })), pista: porRol(guion.pista), yaw: porRol(guion.yaw) };
    if (guion.giros) salida.giros = porRol(Object.fromEntries(Object.entries(guion.giros).map(([q, cs]) => [q, cs.map(([t, m]) => [t, rol(m)])])));
    if (guion.caminos) salida.caminos = porRol(Object.fromEntries(Object.entries(guion.caminos).map(([q, cs]) => [q, cs.map(([t, a]) => [t, destino(a)])])));
    if (guion.objetos) salida.objetos = guion.objetos.map(o => ({ ...o, en: o.en.hueso !== undefined ? { ...o.en, q: rol(o.en.q) } : sitio(o.en) }));
    if (guion.efectos) salida.efectos = guion.efectos.map(([t, tipo, op]) => [t, tipo, op && op.en !== undefined ? { ...op, en: rol(op.en) } : op]);
    if (guion.lugar) salida.lugar = { ...(guion.lugar.centro ? { centro: sitio(guion.lugar.centro) } : {}), ...(guion.lugar.jugador ? { jugador: sitio(guion.lugar.jugador) } : {}) };
    return salida;
}

// El tramo [gesto, desde, hasta, opciones?] que corre en t: u = 0..1 dentro del tramo y w = peso con rampas de hasta 0.3 s
export function tramoEn(pista, t) {
    if (pista) for (const tr of pista) {
        const desde = tr[1], hasta = tr[2];
        if (t >= desde && t < hasta) return { g: tr[0], u: (t - desde) / (hasta - desde), w: envolvente(t, desde, hasta, Math.min(0.3, (hasta - desde) / 3)), op: tr[3] || null };
    }
    return null;
}

// Metas del gesto del tramo. buscar(nombre) -> función (u, t, info) o null. Opciones: reloj (el gesto lee t − reloj, lo que
// hacía desplazar), escala (multiplica canales: pz × 1.7) y espejo (derecha por izquierda, como espejo() de moldes.js).
export function metaTramo(tr, t, info, buscar) {
    const f = buscar(tr.g);
    if (!f) return {};
    const op = tr.op;
    if (!op) return f(tr.u, t, info);
    let m = f(tr.u, op.reloj !== undefined ? t - op.reloj : t, info);
    if (op.escala) { m = { ...m }; for (const k of Object.keys(op.escala)) if (m[k] !== undefined) m[k] *= op.escala[k]; }
    if (op.espejo) m = espejar(m);
    return m;
}
function espejar(m) {
    const o = { ...m };
    delete o.bDx; delete o.bDz; delete o.bIx; delete o.bIz;
    if (m.bIx !== undefined) o.bDx = m.bIx;
    if (m.bIz !== undefined) o.bDz = -m.bIz;
    if (m.bDx !== undefined) o.bIx = m.bDx;
    if (m.bDz !== undefined) o.bIz = -m.bDz;
    for (const k of ['cy', 'cz', 'rz']) if (m[k] !== undefined) o[k] = -m[k];
    return o;
}

export function claveEn(claves, t) {
    let v;
    if (claves) for (const c of claves) { if (c[0] <= t) v = c; else break; }
    return v;
}

export function valorEn(claves, t, porDefecto = 1) {
    if (!claves || !claves.length) return porDefecto;
    if (t <= claves[0][0]) return claves[0][1];
    for (let i = 1; i < claves.length; i++) {
        const [t1, v1] = claves[i];
        if (t <= t1) { const [t0, v0] = claves[i - 1]; return v0 + (v1 - v0) * suave((t - t0) / (t1 - t0)); }
    }
    return claves[claves.length - 1][1];
}

// Claves [t, a] de un camino: antes de la primera y después de la última, el punto del extremo; entre dos, en línea recta
// con suavizado. punto(a) -> { x, y, z } (coordenadas del grupo) o null. rumbo: hacia dónde camina (como n.yaw) o null quieto.
export function caminoEn(claves, t, punto) {
    if (!claves || !claves.length) return null;
    const quieto = a => { const p = punto(a); return p && { x: p.x, y: p.y, z: p.z, rumbo: null }; };
    if (t <= claves[0][0]) return quieto(claves[0][1]);
    for (let i = 1; i < claves.length; i++) {
        const [t1, a1] = claves[i];
        if (t > t1) continue;
        const [t0, a0] = claves[i - 1];
        const p = punto(a0), q = punto(a1);
        if (!p || !q) return null;
        const k = suave((t - t0) / (t1 - t0)), dx = q.x - p.x, dz = q.z - p.z;
        return { x: p.x + dx * k, y: p.y + (q.y - p.y) * k, z: p.z + dz * k, rumbo: Math.hypot(dx, dz) > 1e-6 ? Math.atan2(dx, dz) : null };
    }
    return quieto(claves[claves.length - 1][1]);
}

// Un objeto ya completado por guionDeDatos (desde, hasta, crece, cambia)
export function objetoEn(o, t) {
    const c = claveEn(o.cambia, t);
    return { visible: t >= o.desde && t < o.hasta, escala: valorEn(o.crece, t, 1), dibujo: c ? c[1] : o.dibujo };
}

// La regla de golpes y corazones: toca si ya llegó su instante y el cuadro anterior no lo pasó por más de 0.3 s; una vez
// (irA hacia atrás vacía `hechos` y lo vuelve a permitir). lista: [[t, ...], ...]
export function eventosEn(lista, t0, t, hechos, pre) {
    const salen = [];
    if (lista) lista.forEach((ev, i) => { const s = ev[0]; if (t >= s && t0 < s + 0.3 && !hechos.has(pre + i)) { hechos.add(pre + i); salen.push(i); } });
    return salen;
}

// Las tablas de sonidos (SONIDOS de moldes.js y `sonidos` del juego): solo las funciones sin argumentos (golpeBloque(id) no
// sirve en una escena). La primera tabla gana.
export function sonidosDeEscena(...tablas) {
    const salida = {};
    for (const tabla of tablas) for (const [k, f] of Object.entries(tabla || {})) if (typeof f === 'function' && f.length === 0 && !(k in salida)) salida[k] = f;
    return salida;
}
