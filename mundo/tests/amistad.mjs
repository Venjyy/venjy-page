// Prueba de la amistad y la pestaña «Hablar» (bloques 6a y 6b): node mundo/tests/amistad.mjs
// Puntos, topes diarios, niveles, amistad inicial por skin, desbloqueos, descuentos sin reventa,
// guardado viejo → nuevo, y los diálogos: completos, coherentes con la tabla de relaciones, únicos y sin emojis.
// 6b: animaciones por nivel (punos, abrazo, secreto, pareja), sus frases únicas y sus guiones; los 13 momentos especiales.
import { O, nombreDe } from '../supervivencia/objetos.js';
import { TIENDAS } from '../supervivencia/tienda-datos.js';
import { MISIONES, JEFES, TEXTOS_VENJY } from '../supervivencia/misiones-datos.js';
import { REQ_MINIJUEGOS } from '../supervivencia/minijuegos-datos.js';
import { CORTAS, VENJY, IGLU } from '../supervivencia/escenas-datos.js';
import {
    crearAmistad, nivelDe, inicialDe, relacion, cumple, precioAmigo, PERSONAJES, NIVELES, PUNTOS, FAVORITOS, DESCUENTO, MAX,
    esPareja, nombreNivel, animacionesDe, NIVEL_ANIMACION, momentoListo
} from '../supervivencia/amistad.js';
import { ANIMACIONES, GESTOS_AMISTAD, FRASES_AMISTAD, TXT_AMISTAD, ORDEN } from '../supervivencia/escena-amistad-datos.js';
// escenas-skin.js (GESTOS) trae cuerpo.js, que escucha eventos de `window`: basta un objeto mínimo
globalThis.window ??= { addEventListener() {} };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
import { TEMAS, OPINIONES, SALUDOS, REGALOS, GESTO_REGALO } from '../supervivencia/dialogos-datos.js';

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };

// ---------------------------------------------------------
// Niveles e inicial por skin
// ---------------------------------------------------------
for (const [p, n] of [[0, 0], [14, 0], [15, 1], [34, 1], [35, 2], [59, 2], [60, 3], [84, 3], [85, 4], [100, 4]]) ok(nivelDe(p) === n, `nivelDe(${p}) = ${nivelDe(p)}, esperado ${n}`);
ok(NIVELES.length === 5 && NIVELES[4].es === 'Íntimo', '5 niveles, el último Íntimo');
ok(relacion('venjy', 'lona') === 4 && relacion('lona', 'venjy') === 4, 'Venjy-Lona es pareja (4) en ambos sentidos');
ok(relacion('pony', 'boris') === 0 && relacion('pony', 'pony') === 0, 'sin relación: 0');
ok(nivelDe(inicialDe('venjy', 'lona')) === 4, 'con skin de Venjy, Lona parte en Íntimo (nivel 4)');
ok(nivelDe(inicialDe('venjy', 'boris')) === 3, 'con skin de Venjy, Boris (3) parte en Buen amigo');
ok(nivelDe(inicialDe('venjy', 'hadad')) === 1, 'con skin de Venjy vale la tabla: Hadad (1) parte en Conocido');
ok(nivelDe(inicialDe('venjy', 'pony')) === 2, 'con skin de Venjy, Pony (2) parte en Amigo');
ok(nivelDe(inicialDe('salonas', 'conejeros')) === 3, 'Salonas-Conejeros (3): Buen amigo');
ok(nivelDe(inicialDe('salonas', 'pony')) === 2, 'Salonas-Pony (2): Amigo');
ok(nivelDe(inicialDe('moises', 'lona')) === 1, 'Moisés-Lona (1): Conocido');
ok(inicialDe('pony', 'boris') === 0, 'Pony-Boris (0): Desconocido');
ok(inicialDe(null, 'pony') === 0, 'sin base de skin: todos desde 0');
ok(nivelDe(inicialDe('pony', 'pony')) === 2, 'tu clon parte en Amigo');
for (const a of PERSONAJES) for (const b of PERSONAJES) if (a !== b) ok(relacion(a, b) === relacion(b, a), `relación simétrica ${a}-${b}`);

// ---------------------------------------------------------
// Puntos y topes diarios
// ---------------------------------------------------------
let dia = 0, base = null;
const nueva = () => crearAmistad({ dia: () => dia, base: () => base });
{
    const a = nueva();
    ok(a.puntos('pony') === 0 && a.nivel('pony') === 0, 'parte en 0');
    ok(a.hablar('pony', 'quien') === 1, 'hablar suma 1');
    ok(a.hablar('pony', 'quien') === 0, 'el mismo tema el mismo día no suma');
    a.hablar('pony', 'aqui'); a.hablar('pony', 'venjy');
    ok(a.hablar('pony', 'opina:andy') === 0 && a.ganados('pony') === 3, `tope de hablar: 3 por día (ganados ${a.ganados('pony')})`);
    ok(a.hablar('salonas', 'quien') === 1, 'el tope es por personaje');
    dia = 1;
    ok(a.hablar('pony', 'quien') === 1, 'al día siguiente vuelve a sumar (y el tema se puede repetir)');
    ok(!a.regaloHoy('pony') && a.sumar('pony', 'regalo') === 8 && a.regaloHoy('pony'), 'regalo: +8 y queda marcado');
    ok(a.sumar('pony', 'regalo') === 0, 'un regalo por día');
    ok(a.sumar('pony', 'minijuego') === 4 && a.sumar('pony', 'gana') === 4, 'minijuego +4 y ganar +4');
    ok(a.sumar('pony', 'minijuego') === 0 && a.sumar('pony', 'gana') === 0, 'tope de minijuego: 8 por día');
    ok(a.sumar('pony', 'tienda') === 2 && a.sumar('pony', 'tienda') === 2 && a.sumar('pony', 'tienda') === 0, 'tienda: +2 por compra, tope 4');
    ok(a.sumar('pony', 'pelea') + a.sumar('pony', 'pelea') + a.sumar('pony', 'pelea') + a.sumar('pony', 'pelea') === 3, 'pelea: +1, tope 3');
    const antes = a.ganados('pony');
    for (let i = 0; i < 5; i++) a.sumar('pony', 'mision');
    ok(a.ganados('pony') === antes + 5 * PUNTOS.mision.p, 'misiones sin tope');
    for (let i = 0; i < 10; i++) a.sumar('pony', 'mision');
    ok(a.puntos('pony') === MAX && a.nivel('pony') === 4, 'tope de 100 puntos');
    ok(a.sumar('nadie', 'mision') === 0 && a.sumar('pony', 'inventado') === 0, 'personaje o motivo desconocido: nada');
}
{
    // Subir de nivel avisa una vez por nivel
    dia = 5;
    const a = nueva(), subidas = [];
    a.alSubir = (c, n) => subidas.push(`${c}:${n}`);
    a.sumar('lalo', 'mision'); a.sumar('lalo', 'mision'); a.sumar('lalo', 'mision');
    ok(subidas.join(',') === 'lalo:1,lalo:2', `avisos de subida: ${subidas.join(',')}`);
    // La inicial depende de la skin actual y no se guarda
    base = 'moises';
    ok(a.nivel('lalo') === 4 && a.inicial('lalo') === 60, 'con skin de Moisés, Lalo suma la inicial de mejores amigos');
    base = null;
}

// ---------------------------------------------------------
// Guardado: viejo (sin amistad) → nuevo, ida y vuelta por JSON (como viaja en el cooperativo)
// ---------------------------------------------------------
{
    dia = 3;
    const viejo = { hechas: ['pony1'], activa: null, progreso: 0, visitados: [], noche: null, jefes: [], vidaExtra: 0, escenasSkin: [], minijuegos: [] };
    const a = nueva();
    a.cargar(viejo.amistad);
    ok(a.puntos('pony') === 0 && a.hablar('pony', 'quien') === 1, 'guardado viejo: parte en blanco y funciona');
    a.sumar('boris', 'mision'); a.sumar('boris', 'regalo');
    const nuevo = { ...viejo, amistad: a.serializar() };
    const b = nueva();
    b.cargar(JSON.parse(JSON.stringify(nuevo)).amistad);
    ok(b.ganados('boris') === 20 && b.ganados('pony') === 1, 'ida y vuelta conserva los puntos');
    ok(b.regaloHoy('boris') && b.hablar('pony', 'quien') === 0, 'ida y vuelta conserva los topes del día');
    dia = 4;
    ok(!b.regaloHoy('boris'), 'el tope del día se renueva tras cargar');
    const c = nueva();
    c.cargar({ ganados: { pony: -5, boris: 'x', fantasma: 40, lalo: 12 }, hoy: 'nada' });
    ok(c.ganados('pony') === 0 && c.ganados('boris') === 0 && c.ganados('lalo') === 12 && !('fantasma' in c.serializar().ganados), 'datos raros se limpian al cargar');
}

// ---------------------------------------------------------
// Desbloqueos
// ---------------------------------------------------------
{
    const h = { hechas: new Set(['pony2']), minijuegos: new Set(['pesca']), jefes: new Set(['jefe1']) };
    ok(cumple(undefined, 0, h) && cumple(null, 0, h), 'sin requisito: libre');
    ok(!cumple({ nivel: 2 }, 1, h) && cumple({ nivel: 2 }, 2, h), 'requisito de nivel');
    ok(cumple({ mision: 'pony2' }, 0, h) && !cumple({ mision: 'pony3' }, 4, h), 'requisito de misión');
    ok(cumple({ mj: 'pesca' }, 0, h) && !cumple({ mj: 'lena' }, 4, h), 'requisito de minijuego');
    ok(cumple({ jefe: 'jefe1' }, 0, h) && !cumple({ jefe: 'jefe3' }, 4, h), 'requisito de jefe');
    ok(!cumple({ nivel: 3, mision: 'pony2' }, 2, h), 'varios requisitos: todos');
}

// ---------------------------------------------------------
// Descuentos en la tienda: nunca encarecen, mínimo 1, solo esmeraldas y sin reventa con ganancia
// ---------------------------------------------------------
{
    const venta = new Map();
    for (const t of Object.values(TIENDAS)) for (const v of t.compra || []) {
        const u = v.da[1] / v.esm;
        if (!venta.has(v.da[0]) || u < venta.get(v.da[0])) venta.set(v.da[0], u);
    }
    let rebajas = 0;
    for (const [clave, t] of Object.entries(TIENDAS)) for (const o of t.ofertas) for (let n = 0; n < NIVELES.length; n++) {
        const pr = precioAmigo(o, n);
        const esm = o.pide.length === 1 && o.pide[0][0] === O.ESMERALDA;
        if (!esm) { ok(!pr.rebaja && pr.pide === o.pide, `${clave}: el trueque no tiene descuento`); continue; }
        const [id, cant] = pr.da[0], precio = pr.pide[0][1];
        ok(precio >= 1 && precio <= o.pide[0][1], `${clave} ${nombreDe(id)} nivel ${n}: precio ${precio} entre 1 y el normal`);
        ok(cant >= o.da[0][1], `${clave} ${nombreDe(id)} nivel ${n}: no da menos que antes`);
        if (DESCUENTO[n] === 0) ok(!pr.rebaja, `${clave} nivel ${n}: sin descuento`);
        if (venta.has(id)) ok(cant / precio <= venta.get(id) + 1e-9, `${clave} ${nombreDe(id)} nivel ${n}: ${cant} por ${precio} esmeraldas permite revender con ganancia`);
        if (pr.rebaja) rebajas++;
    }
    ok(rebajas > 40, `hay descuentos de verdad (${rebajas} ofertas×nivel con rebaja)`);
    const caro = precioAmigo({ da: [[O.HACHA_DIAMANTE, 1]], pide: [[O.ESMERALDA, 8]] }, 4);
    ok(caro.pide[0][1] === 6 && caro.rebaja, `hacha de diamante en Íntimo: 6 esmeraldas (sale ${caro.pide[0][1]})`);
    const yapa = precioAmigo({ da: [[O.HILO, 4]], pide: [[O.ESMERALDA, 1]] }, 2);
    ok(yapa.da[0][1] === 5 && yapa.pide[0][1] === 1, 'precio 1: la yapa da una unidad más en Amigo');
}

// ---------------------------------------------------------
// Diálogos
// ---------------------------------------------------------
const MINIJUEGOS = new Set(Object.keys(REQ_MINIJUEGOS));
const MISION_IDS = new Set(MISIONES.map(m => m.id)), JEFE_IDS = new Set(JEFES.map(j => j.id));
const GESTOS_OK = new Set(['asiente', 'habla', 'sorpresa', 'rasca', 'yo', 'tu', 'ojos', 'mano', 'saluda', 'brazosArriba', 'risa', 'baile', 'cabecea', 'dedo', 'hachazo']);
const textos = []; // [ruta, {es, en}]
const par = (ruta, o) => {
    ok(o && typeof o.es === 'string' && o.es.trim() && typeof o.en === 'string' && o.en.trim(), `${ruta}: par ES/EN completo`);
    if (o) textos.push([ruta, o]);
};
ok(Object.keys(TEMAS).sort().join() === [...PERSONAJES].sort().join(), 'temas para los 13 personajes');
for (const clave of PERSONAJES) {
    const temas = TEMAS[clave] || [];
    ok(temas.length >= 5 && temas.length <= 8, `${clave}: entre 5 y 8 temas (tiene ${temas.length})`);
    const ids = temas.map(t => t.id);
    ok(new Set(ids).size === ids.length, `${clave}: ids de tema sin repetir`);
    for (const id of ['quien', 'aqui', 'opina']) ok(ids.includes(id), `${clave}: tiene el tema ${id}`);
    ok(temas.some(t => t.req && (t.req.mision || t.req.mj || t.req.jefe)), `${clave}: algún tema se desbloquea con misión, minijuego o jefe`);
    ok(temas.some(t => t.req && t.req.nivel >= 2), `${clave}: algún tema se desbloquea con la amistad`);
    for (const t of temas) {
        par(`${clave}.${t.id}.p`, t.p);
        if (t.id !== 'opina') par(`${clave}.${t.id}`, t.r);
        if (t.g) ok(GESTOS_OK.has(t.g), `${clave}.${t.id}: gesto ${t.g} existe`);
        if (t.req) {
            if (t.req.mision) ok(MISION_IDS.has(t.req.mision), `${clave}.${t.id}: misión ${t.req.mision} existe`);
            if (t.req.mj) ok(MINIJUEGOS.has(t.req.mj), `${clave}.${t.id}: minijuego ${t.req.mj} tiene título`);
            if (t.req.jefe) ok(JEFE_IDS.has(t.req.jefe), `${clave}.${t.id}: jefe ${t.req.jefe} existe`);
            if (t.req.nivel !== undefined) ok(t.req.nivel >= 0 && t.req.nivel < NIVELES.length, `${clave}.${t.id}: nivel válido`);
        }
        for (const [b, r] of Object.entries(t.skin || {})) {
            ok(PERSONAJES.includes(b) && b !== clave, `${clave}.${t.id}: variante de skin ${b} válida`);
            ok(b === 'venjy' || clave === 'venjy' || relacion(b, clave) >= 2, `${clave}.${t.id}: variante para ${b} solo si son amigos (relación ${relacion(b, clave)})`);
            par(`${clave}.${t.id}[skin ${b}]`, r);
        }
    }
    // «¿Qué opinas de...?»: exactamente quienes conoce
    const conoce = PERSONAJES.filter(o => o !== clave && relacion(clave, o) > 0).sort().join();
    ok(Object.keys(OPINIONES[clave] || {}).sort().join() === conoce, `${clave}: opina de quienes conoce (${conoce})`);
    for (const [o, r] of Object.entries(OPINIONES[clave] || {})) par(`${clave} opina de ${o}`, r);
    ok(SALUDOS[clave] && SALUDOS[clave].bajo && SALUDOS[clave].alto, `${clave}: saludos bajo y alto`);
    par(`${clave}.saludo.bajo`, SALUDOS[clave].bajo); par(`${clave}.saludo.alto`, SALUDOS[clave].alto);
    for (const [b, r] of Object.entries(SALUDOS[clave].skin || {})) par(`${clave}.saludo[skin ${b}]`, r);
    par(`${clave}.regalo`, REGALOS[clave]);
    if (GESTO_REGALO[clave]) ok(GESTOS_OK.has(GESTO_REGALO[clave]), `${clave}: gesto de regalo existe`);
    const favs = FAVORITOS[clave] || [];
    ok(favs.length >= 1 && favs.length <= 2, `${clave}: 1 o 2 regalos favoritos`);
    for (const id of favs) ok(!!nombreDe(id, 'es'), `${clave}: favorito ${id} existe`);
}
// Venjy-Lona tiene variantes de pareja
ok(TEMAS.lona.find(t => t.id === 'venjy').skin.venjy && TEMAS.venjy.find(t => t.id === 'quien').skin.lona && SALUDOS.lona.skin.venjy, 'variantes de pareja Venjy-Lona');
// Con skin de Venjy, cada amigo responde distinto a «¿Cómo conociste a Venjy?»
for (const clave of PERSONAJES) if (clave !== 'venjy') ok(TEMAS[clave].find(t => t.id === 'venjy')?.skin?.venjy, `${clave}: variante de «¿Cómo conociste a Venjy?» para la skin de Venjy`);

// ---------------------------------------------------------
// 6b · Animaciones por nivel de amistad
// ---------------------------------------------------------
ok(NIVEL_ANIMACION.punos === 2 && NIVEL_ANIMACION.abrazo === 3 && NIVEL_ANIMACION.secreto === 4 && NIVEL_ANIMACION.pareja === 4, 'puños en Amigo, abrazo en Buen amigo, saludo secreto y pareja en Íntimo');
ok(esPareja('venjy', 'lona') && esPareja('lona', 'venjy') && !esPareja('venjy', 'boris') && !esPareja('lona', 'lona') && !esPareja(null, 'lona'), 'esPareja: solo Venjy y Lona');
ok(nombreNivel(4, 'venjy', 'lona').es === 'Pareja' && nombreNivel(4, 'lona', 'venjy').en === 'Partner' && nombreNivel(4, 'pony', 'lona').es === 'Íntimo' && nombreNivel(3, 'venjy', 'lona').es === 'Buen amigo', 'el nivel máximo de Venjy y Lona se llama Pareja');
ok(animacionesDe('venjy', 'lona').join() === 'punos,abrazo,pareja' && animacionesDe('pony', 'lona').join() === 'punos,abrazo,secreto' && animacionesDe(null, 'venjy').join() === ORDEN.join(), 'la pareja reemplaza al saludo secreto');
for (const base of [null, ...PERSONAJES]) for (const clave of PERSONAJES) {
    const lista = animacionesDe(base, clave);
    ok(lista.length === 3, `${base}/${clave}: 3 animaciones`);
    for (const tipo of lista) ok(!!FRASES_AMISTAD[clave]?.[tipo], `${clave}: frase para «${tipo}» (skin ${base})`);
}
for (const clave of PERSONAJES) for (const tipo of ORDEN) {
    const f = FRASES_AMISTAD[clave][tipo];
    ok(f && f.es && f.en && f.es !== f.en, `${clave}.${tipo}: frase ES/EN`);
    if (f) textos.push([`FRASES_AMISTAD.${clave}.${tipo}`, f]);
}
for (const clave of ['venjy', 'lona']) textos.push([`FRASES_AMISTAD.${clave}.pareja`, FRASES_AMISTAD[clave].pareja]);
ok(Object.keys(FRASES_AMISTAD).sort().join() === [...PERSONAJES].sort().join(), 'frases para los 13 personajes y nadie más');
for (const clave of PERSONAJES) for (const tipo of Object.keys(FRASES_AMISTAD[clave])) ok(tipo !== 'pareja' || clave === 'venjy' || clave === 'lona', `${clave}: solo Venjy y Lona tienen frase de pareja`);
for (const idi of ['es', 'en']) for (const k of ['titulo', 'punos', 'abrazo', 'secreto', 'pareja', 'saltar', 'tu']) ok(!!TXT_AMISTAD[idi][k], `TXT_AMISTAD.${idi}.${k}`);
// Guiones: tiempos dentro de la escena, gestos que existen y metas dentro de los rangos de la skill (rig.md)
const RANGO = { cx: [-0.46, 0.51], cy: [-1.11, 1.11], cz: [-0.21, 0.21], bDx: [-3.1, 0.61], bIx: [-3.1, 0.61], bDz: [-0.81, 1.0], bIz: [-1.0, 0.81], pDx: [-1.61, 0.61], pIx: [-1.61, 0.61], inc: [-0.21, 0.71], rz: [-0.16, 0.16], y: [-0.71, 0.61], pz: [-0.1, 0.5], salto: [0, 0.6] };
for (const [tipo, a] of Object.entries(ANIMACIONES)) {
    ok(a.T >= 4 && a.T <= 12, `${tipo}: dura entre 4 y 12 s`);
    ok(a.r >= 0.6 && a.r <= 2, `${tipo}: distancia de contacto razonable`);
    ok(a.nivel === NIVEL_ANIMACION[tipo], `${tipo}: nivel igual al de amistad.js`);
    ok(a.linea[0] >= 0.3 && a.linea[0] + a.linea[1] <= a.T, `${tipo}: la frase cabe en la escena`);
    for (const s of [...(a.golpes || []), ...(a.corazones || [])]) ok(s > 0 && s < a.T, `${tipo}: efecto en ${s} s dentro de la escena`);
    for (const q of ['n', 'j']) for (const [g, desde, hasta] of a.pista[q]) {
        ok(!!(GESTOS_AMISTAD[g] || GESTOS[g]), `${tipo}.${q}: el gesto ${g} existe`);
        ok(desde >= 0 && hasta > desde && hasta <= a.T, `${tipo}.${q}: ${g} dentro de la escena`);
        const f = GESTOS_AMISTAD[g];
        if (!f) continue;
        for (const s of [false, true]) for (let u = 0; u <= 1.0001; u += 0.05) {
            const m = f(u, desde + u * (hasta - desde), { s, otroS: !s, j: q === 'j', esc: 1 });
            for (const [k, v] of Object.entries(m)) ok(Number.isFinite(v) && (!RANGO[k] || (v >= RANGO[k][0] && v <= RANGO[k][1])), `${tipo}.${q}.${g}: ${k}=${v} en rango (u ${u.toFixed(2)})`);
        }
    }
}

// ---------------------------------------------------------
// 6b-2 · Momentos especiales (uno por personaje, cargados con import())
// ---------------------------------------------------------
ok(!momentoListo(99) && momentoListo(100), 'el momento especial aparece con la amistad en 100');
const QS = new Set(['n', 'j']);
for (const clave of PERSONAJES) {
    const m = await import(`../supervivencia/momentos/${clave}.js`);
    ok(typeof m.momento === 'function' && Array.isArray(m.LINEAS), `${clave}: módulo de momento con momento() y LINEAS`);
    const variantes = [['normal', m.momento({ base: null }), m.LINEAS]];
    if (clave === 'venjy' || clave === 'lona') {
        ok(Array.isArray(m.LINEAS_PAREJA), `${clave}: momento de pareja`);
        const g = m.momento({ base: clave === 'venjy' ? 'lona' : 'venjy' });
        ok(g.lineas === m.LINEAS_PAREJA, `${clave}: con la skin de su pareja usa LINEAS_PAREJA`);
        variantes.push(['pareja', g, m.LINEAS_PAREJA]);
    } else ok(!m.LINEAS_PAREJA, `${clave}: sin momento de pareja (solo Venjy y Lona)`);
    for (const [v, g] of variantes) {
        const ruta = `momento ${clave} (${v})`;
        ok(g.T >= 10 && g.T <= 22, `${ruta}: dura entre 10 y 22 s`);
        ok(g.r >= 0.6 && g.r <= 2.2, `${ruta}: distancia razonable`);
        const qs = new Set([...QS, ...Object.keys(g.actores || {})]);
        for (const [q, c] of Object.entries(g.actores || {})) ok(PERSONAJES.includes(c) && c !== clave && relacion(clave, c) >= 2, `${ruta}: actor extra ${c} existe y es amigo de ${clave}`);
        ok(g.lineas.length >= 3 && g.lineas.length <= 8, `${ruta}: 3 a 8 frases`);
        let fin = 0;
        for (const l of g.lineas) {
            ok(qs.has(l.q), `${ruta}: habla un actor de la escena (${l.q})`);
            ok(l.a >= 0.3 && l.d >= 1.8 && l.a + l.d <= g.T, `${ruta}: «${l.texto.es}» cabe en la escena y se alcanza a leer`);
            ok(l.a >= fin - 0.01, `${ruta}: las frases no se pisan («${l.texto.es}»)`);
            fin = l.a + l.d;
        }
        for (const [q, lista] of Object.entries(g.pista || {})) {
            ok(qs.has(q), `${ruta}: pista de un actor de la escena (${q})`);
            for (const [gesto, desde, hasta] of lista) {
                const f = (g.gestos && g.gestos[gesto]) || GESTOS_AMISTAD[gesto];
                ok(!!(f || GESTOS[gesto]), `${ruta}: el gesto ${gesto} existe`);
                ok(desde >= 0 && hasta > desde && hasta <= g.T, `${ruta}: ${gesto} dentro de la escena`);
                if (!f) continue;
                for (let u = 0; u <= 1.0001; u += 0.05) {
                    const meta = f(u, desde + u * (hasta - desde), { s: false, otroS: false, j: q === 'j', esc: 1 });
                    for (const [k, val] of Object.entries(meta)) ok(Number.isFinite(val) && (!RANGO[k] || (val >= RANGO[k][0] && val <= RANGO[k][1])), `${ruta}.${q}.${gesto}: ${k}=${val} en rango (u ${u.toFixed(2)})`);
                }
            }
        }
        for (const [q, f] of Object.entries(g.yaw || {})) for (let x = 0; x <= g.T; x += 0.5) ok(qs.has(q) && Number.isFinite(f(x)) && Math.abs(f(x)) <= Math.PI + 0.01, `${ruta}: giro de ${q} en ${x} s`);
        for (const s of [...(g.golpes || []), ...(g.corazones || [])]) ok(s > 0 && s < g.T, `${ruta}: efecto en ${s} s dentro de la escena`);
    }
    for (const [i, l] of [...m.LINEAS, ...(m.LINEAS_PAREJA || [])].entries()) {
        ok(l.texto.es && l.texto.en && l.texto.es !== l.texto.en, `momento ${clave}.${i}: frase ES/EN`);
        textos.push([`MOMENTO.${clave}.${i}`, l.texto]);
    }
}

// ---------------------------------------------------------
// 6c-1 · Bienvenidas del Venjy del Inicio y reencuentros entre amigos (cargados con import())
// ---------------------------------------------------------
const { MOLDES, molde, fusion, seguidos, espejo, desplazar } = await import('../supervivencia/moldes.js');
const { REENCUENTROS, reencuentro, claveDe } = await import('../supervivencia/reencuentros.js');
const { pendiente6c, LUGAR } = await import('../supervivencia/escenas-skin.js');
ok(Object.keys(MOLDES).length >= 18, 'moldes.js: los 18 moldes nuevos de 6c');
for (const k of ['agacha', 'tirita', 'frota', 'teclea', 'maneja', 'traza', 'barre', 'selfie', 'orejitas', 'recuerda', 'mide', 'empujon', 'celular', 'brinda', 'ping', 'lanza', 'cae', 'sacude']) ok(typeof MOLDES[k] === 'function', `molde ${k}`);
for (const k of ['puno', 'abrazo', 'secreto', 'pareja', 'habla', 'risa', 'sorpresa', 'saluda']) ok(typeof molde(k) === 'function', `molde() encuentra ${k}`);
// Fusión: brazos de uno y cuerpo del otro
{
    const m = fusion('teclea', 'agacha')(0.5, 1, { j: false });
    const a = MOLDES.teclea(0.5, 1, {}), b = MOLDES.agacha(0.5, 1, {});
    ok(m.bDx === a.bDx && m.bIz === a.bIz && m.inc === b.inc && m.y === b.y && m.cx === b.cx, 'fusion: brazos de a y cuerpo de b');
    const s = seguidos('risa', 'tirita', 0.5);
    ok(s(0.2, 1, {}).bDz === molde('risa')(0.4, 1, {}).bDz && s(0.8, 1, {}).bDz === MOLDES.tirita(0.6, 1, {}).bDz, 'seguidos: a y luego b');
    const e = espejo('selfie')(0.5, 1, {});
    ok(e.bIx === MOLDES.selfie(0.5, 1, {}).bDx && e.cy === -MOLDES.selfie(0.5, 1, {}).cy, 'espejo: el otro brazo');
    ok(desplazar('puno', 2)(0, 3.45, {}).bDx === GESTOS_AMISTAD.puno(0, 1.45, {}).bDx, 'desplazar: corre el reloj');
}
// Metas de un guion: gestos que existen y dentro de los rangos de rig.md
function revisarPista(ruta, g, qs) {
    for (const [q, lista] of Object.entries(g.pista || {})) {
        ok(qs.has(q), `${ruta}: pista de un actor de la escena (${q})`);
        let fin = 0;
        for (const [gesto, desde, hasta] of lista) {
            const f = (g.gestos && g.gestos[gesto]) || GESTOS_AMISTAD[gesto] || MOLDES[gesto];
            ok(!!(f || GESTOS[gesto]), `${ruta}: el gesto ${gesto} existe`);
            ok(desde >= 0 && hasta > desde && hasta <= g.T, `${ruta}: ${gesto} dentro de la escena`);
            ok(desde >= fin - 0.01, `${ruta}.${q}: ${gesto} no pisa al gesto anterior`);
            fin = hasta;
            for (let u = 0; u <= 1.0001; u += 0.05) {
                const meta = f ? f(u, desde + u * (hasta - desde), { s: false, otroS: false, j: q === 'j', esc: 1 }) : GESTOS[gesto](u, desde + u * (hasta - desde), false, q === 'j');
                for (const [k, val] of Object.entries(meta)) ok(Number.isFinite(val) && (!RANGO[k] || (val >= RANGO[k][0] && val <= RANGO[k][1])), `${ruta}.${q}.${gesto}: ${k}=${val} en rango (u ${u.toFixed(2)})`);
            }
        }
    }
}
// minD(texto): lo mínimo que dura una frase para leerse (1.8 s; en los grupos una exclamación corta puede durar menos)
function revisarLineas(ruta, g, qs, nMin, nMax, minD = () => 1.8) {
    ok(g.lineas.length >= nMin && g.lineas.length <= nMax, `${ruta}: ${nMin} a ${nMax} frases`);
    let fin = 0;
    for (const l of g.lineas) {
        ok(qs.has(l.q), `${ruta}: habla un actor de la escena (${l.q})`);
        ok(l.a >= 0.3 && l.d >= minD(l.texto) && l.a + l.d <= g.T, `${ruta}: «${l.texto.es}» cabe en la escena y se alcanza a leer`);
        ok(l.a >= fin - 0.01, `${ruta}: las frases no se pisan («${l.texto.es}»)`);
        fin = l.a + l.d;
    }
    for (const s of [...(g.golpes || []), ...(g.corazones || [])]) ok(s > 0 && s < g.T, `${ruta}: efecto en ${s} s dentro de la escena`);
    for (const [q, f] of Object.entries(g.yaw || {})) for (let x = 0; x <= g.T; x += 0.5) ok(qs.has(q) && Number.isFinite(f(x)) && Math.abs(f(x)) <= Math.PI + 0.01, `${ruta}: giro de ${q} en ${x} s`);
}
// Bienvenidas: una por skin de amigo (todas menos Venjy); duración y frases según la relación con Venjy
const BIEN = { 1: [6, 6, 12, 22], 2: [6, 6, 12, 22], 3: [7, 7, 16, 28], 4: [7, 7, 15, 26] };
const amigos6c = PERSONAJES.filter(c => c !== 'venjy');
for (const clave of amigos6c) {
    const m = await import(`../supervivencia/bienvenidas/${clave}.js`);
    const ruta = `bienvenida ${clave}`;
    ok(typeof m.bienvenida === 'function' && Array.isArray(m.LINEAS), `${ruta}: módulo con bienvenida() y LINEAS`);
    const g = m.bienvenida({ idioma: 'es' });
    const rel = relacion('venjy', clave), [nMin, nMax, tMin, tMax] = BIEN[rel];
    ok(rel >= 1, `${ruta}: Venjy conoce a ${clave}`);
    ok(g.T >= tMin && g.T <= tMax, `${ruta}: dura ${g.T} s (relación ${rel}: ${tMin}-${tMax})`);
    ok(g.r >= 0.6 && g.r <= 2.2, `${ruta}: distancia razonable`);
    ok(g.lineas === m.LINEAS, `${ruta}: las frases son LINEAS`);
    const qs = new Set(['n', 'j', ...Object.keys(g.actores || {})]);
    revisarLineas(ruta, g, qs, nMin, nMax);
    revisarPista(ruta, g, qs);
    ok(g.lineas.filter(l => l.q === 'j').length >= 3, `${ruta}: tú hablas al menos 3 veces`);
    if (rel === 3) ok((g.golpes || []).length >= 4 && Object.values(g.pista).flat().some(([x]) => /secreto/.test(x)) && Object.values(g.pista).flat().some(([x]) => /abrazo/.test(x)) && Object.values(g.pista).flat().some(([x]) => x === 'recuerda'), `${ruta}: relación 3 con saludo secreto, abrazo y recuerdo`);
    if (rel === 4) ok((g.corazones || []).length >= 3 && Object.values(g.pista).flat().some(([x]) => /pareja/.test(x)), `${ruta}: pareja con abrazo, beso y corazones`);
    for (const [i, l] of m.LINEAS.entries()) {
        ok(l.texto.es && l.texto.en && l.texto.es !== l.texto.en, `${ruta}.${i}: frase ES/EN`);
        textos.push([`BIENVENIDA.${clave}.${i}`, l.texto]);
    }
}
// Reencuentros: exactamente uno por pareja con relación 2 o 3 (corto en 2, largo en 3), ninguno con Venjy
const parejas = [];
for (let i = 0; i < PERSONAJES.length; i++) for (let k = i + 1; k < PERSONAJES.length; k++) {
    const a = PERSONAJES[i], b = PERSONAJES[k], r = relacion(a, b);
    if (a !== 'venjy' && b !== 'venjy' && (r === 2 || r === 3)) parejas.push([a, b, r]);
}
ok(parejas.length === 16 && Object.keys(REENCUENTROS).length === 16, `16 reencuentros (pares con relación 2-3: ${parejas.length})`);
for (const [a, b, r] of parejas) {
    const k = claveDe(a, b);
    ok(!!k && REENCUENTROS[k].rel === r, `reencuentro ${a}-${b} (relación ${r})`);
    for (const [base, otro] of [[a, b], [b, a]]) {
        const g = reencuentro(base, otro), ruta = `reencuentro ${base}->${otro}`;
        if (!g) { ok(false, `${ruta}: sin guion`); continue; }
        ok(r === 3 ? g.T >= 16 && g.T <= 25 : g.T >= 9 && g.T <= 16, `${ruta}: dura ${g.T} s (${r === 3 ? 'largo' : 'corto'})`);
        ok(g.reparto[base] === 'j' && g.reparto[otro] === 'n', `${ruta}: tu skin habla como tú y el amigo como el NPC`);
        // Frases por personaje: el guion habla con las claves de los dos; el motor las pasa a j / n
        const qs = new Set([a, b, 'c']);
        revisarLineas(ruta, g, qs, r === 3 ? 6 : 4, r === 3 ? 6 : 4);
        revisarPista(ruta, g, qs);
        ok(g.actores.c.clave === base && g.actores.c.radio > 0, `${ruta}: tu clon reacciona si está cerca`);
        if (r === 3) ok(g.golpes.length === 4 && g.pista[a].some(([x]) => x === 'secretoR') && g.pista[a].some(([x]) => x === 'abrazoR') && Object.values(g.pista).flat().some(([x]) => x === 'recuerda'), `${ruta}: largo con secreto, abrazo y recuerdo`);
        else ok(g.golpes.length === 1 && Object.values(g.pista).flat().some(([x]) => x === REENCUENTROS[k].broma.gesto), `${ruta}: corto con puños y la broma (${REENCUENTROS[k].broma.gesto})`);
    }
}
for (const a of PERSONAJES) for (const b of PERSONAJES) if (a !== b && !parejas.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) ok(!reencuentro(a, b), `sin reencuentro ${a}-${b}`);
for (const [k, d] of Object.entries(REENCUENTROS)) for (const [i, [q, txt]] of d.lineas.entries()) {
    ok(k.split('-').includes(q), `reencuentro ${k}.${i}: habla uno de los dos`);
    ok(txt.es && txt.en && txt.es !== txt.en, `reencuentro ${k}.${i}: frase ES/EN`);
    textos.push([`REENCUENTRO.${k}.${i}`, txt]);
}
// Disparo: bienvenida con toda skin de amigo (no con Venjy), reencuentros solo con relación 2-3, una vez cada uno
{
    const vistas = new Set(['gr:tomatitos:pony']); // con skin de Pony, la escena de grupo (6c-2) va antes que el reencuentro con Andy: aquí ya se vio
    for (const base of amigos6c) ok(pendiente6c(base, 'venjy', vistas)?.tipo === 'bienvenida', `${base}: le toca la bienvenida`);
    ok(pendiente6c('venjy', 'pony', vistas) === null && pendiente6c('venjy', 'lona', vistas) === null && pendiente6c(null, 'venjy', vistas) === null, 'con skin de Venjy (o sin base) no hay escenas 6c');
    ok(pendiente6c('pony', 'pony', vistas) === null, 'tu clon no tiene reencuentro (tiene su escena de skin)');
    ok(pendiente6c('pony', 'andy', vistas)?.tipo === 'reencuentro' && pendiente6c('pony', 'boris', vistas) === null && pendiente6c('salonas', 'hadad', vistas) === null, 'reencuentro solo con relación 2-3');
    ok(pendiente6c('pony', 'conejeros', vistas)?.tipo === 'reencuentro', 'Pony-Conejeros (2) tiene reencuentro aunque se digan enemigos');
    vistas.add('bv:pony'); vistas.add('rc:pony:andy');
    ok(pendiente6c('pony', 'venjy', vistas) === null && pendiente6c('pony', 'andy', vistas) === null && pendiente6c('andy', 'pony', vistas)?.tipo === 'reencuentro', 'una vez por partida y por skin');
    for (const c of PERSONAJES) ok(!!LUGAR[c], `${c}: tiene lugar para «uno por lugar»`);
    ok(pendiente6c('pony', 'andy', vistas) === null, 'tras su reencuentro y su grupo, Andy no tiene otra escena con skin de Pony');
    ok(LUGAR.hadad === LUGAR.andy && LUGAR.andy === LUGAR.nacho && LUGAR.lalo === LUGAR.moises && LUGAR.boris === LUGAR.lucho && LUGAR.salonas === LUGAR.conejeros, 'los que están juntos comparten lugar');
}

// ---------------------------------------------------------
// 6c-2 · Escenas de grupo (grupos/<grupo>.js, cargados con import())
// ---------------------------------------------------------
const { GRUPOS, grupoDe } = await import('../supervivencia/amistad.js');
ok(Object.keys(GRUPOS).length === 3 && Object.values(GRUPOS).reduce((s, d) => s + d.miembros.length, 0) === 13, '3 grupos con 13 variantes');
const modGrupos = {};
for (const [nombre, def] of Object.entries(GRUPOS)) {
    const m = await import(`../supervivencia/grupos/${nombre}.js`);
    modGrupos[nombre] = m;
    ok(typeof m.grupo === 'function' && m.VARIANTES && m.COMUN, `grupo ${nombre}: módulo con grupo(), VARIANTES y COMUN`);
    ok(m.MIEMBROS.length === def.miembros.length && def.miembros.every(c => m.MIEMBROS.includes(c)), `grupo ${nombre}: una variante por cada integrante (${def.miembros.join(', ')})`);
    ok(def.npcs.every(c => def.miembros.includes(c)) && def.npcs.includes(m.ANCLA), `grupo ${nombre}: los del lugar son del grupo y el ancla es uno de ellos`);
    for (const c of PERSONAJES) if (!def.miembros.includes(c)) ok(!m.grupo(c) && !grupoDe(c, def.npcs[0]), `grupo ${nombre}: sin variante ni disparo para ${c}`);
    const vistasG = new Set();
    for (const base of def.miembros) {
        const g = m.grupo(base), ruta = `grupo ${nombre}/${base}`;
        // Solo actúan los del grupo: los NPC del lugar y el Venjy que se suma (el de la atalaya o el de la mina)
        const extras = Object.values(g.actores || {});
        ok(g.ancla === m.ANCLA && extras.every(c => def.npcs.includes(c) || c === `venjy@${def.venjy}`), `${ruta}: actores solo del grupo (${extras.join(', ')})`);
        ok(g.reparto[m.ANCLA] === 'n' && typeof g.centro === 'function' && typeof g.colocar === 'function', `${ruta}: ancla, centro y lugar del jugador`);
        ok(g.T >= 18 && g.T <= 40, `${ruta}: dura ${g.T} s (18-40)`);
        const qs = new Set(['j', 'todos', ...def.npcs, ...Object.keys(g.actores)]);
        revisarLineas(ruta, g, qs, 8, 13);
        revisarPista(ruta, g, qs);
        ok(g.lineas.filter(l => l.q === 'j').length >= 2 && g.lineas[g.lineas.length - 1].q === 'j', `${ruta}: tú hablas y cierras la escena`);
        ok(m.COMUN.every(([, x]) => g.lineas.some(l => l.texto === x)), `${ruta}: tiene toda la parte común del grupo`);
        ok(g.lineas.some(l => l.q === 'todos'), `${ruta}: todos dicen la frase del grupo`);
        // Tu clon actúa como él mismo si es del lugar (sus frases son del NPC, no tuyas)
        if (def.npcs.includes(base)) ok(m.VARIANTES[base].llegada.some(([q]) => q === base), `${ruta}: tu clon habla en la llegada`);
        // Disparo: automática la primera vez con la skin de un integrante, salvo «solo botón» (Venjy en el iglú)
        for (const c of def.npcs) {
            ok(grupoDe(base, c) === nombre, `${ruta}: «Saludo del grupo» frente a ${c}`);
            const p = pendiente6c(base, c, vistasG);
            if ((def.soloBoton || []).includes(base)) ok(p === null || p.tipo !== 'grupo', `${ruta}: solo con el botón`);
            else ok(p?.tipo === 'grupo' && p.grupo === nombre && p.clon === (def.npcs.includes(base) ? base : null), `${ruta}: sale sola frente a ${c} (y da por vista la escena de tu clon)`);
        }
    }
    for (const [i, [, x]] of m.COMUN.entries()) textos.push([`GRUPO.${nombre}.comun.${i}`, x]);
    for (const [base, v] of Object.entries(m.VARIANTES)) {
        for (const [k, x] of [...(v.llegada || []).map(([, y], i) => [`llegada${i}`, y]), ...(v.brindis || []).map(([, y], i) => [`brindis${i}`, y]),
            ['despues', v.despues], ['bola', v.bola], ['cierre', v.cierre]]) if (x) textos.push([`GRUPO.${nombre}.${base}.${k}`, x]);
    }
}
{
    const vistas = new Set();
    ok(pendiente6c('pony', 'andy', vistas)?.tipo === 'grupo', 'con skin de Pony en la fogata, primero los Tomatitos');
    vistas.add('gr:tomatitos:pony');
    ok(pendiente6c('pony', 'andy', vistas)?.tipo === 'reencuentro', 'después del grupo, el reencuentro con Andy (clic derecho)');
    ok(pendiente6c('venjy', 'boris', vistas)?.tipo === 'grupo' && pendiente6c('venjy', 'lalo', vistas) === null, 'con skin de Venjy: atalaya sola, iglú solo con el botón');
    ok(grupoDe('venjy', 'moises') === 'coyhaique' && grupoDe('salonas', 'hadad') === null && grupoDe('pony', 'boris') === null, 'el botón solo con la skin de un integrante');
}
// Quien se movió vuelve a su sitio: el motor real (escena-amistad.js) con un DOM mínimo y personas de cajas falsas.
// Sin frases (los globos piden el DOM entero): los movimientos no dependen de ellas.
{
    const THREE = await import('../../vendor/three.module.js');
    const lienzo2d = { fillRect() {}, fillStyle: '' };
    const elem = () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, getContext: () => lienzo2d, width: 0, height: 0 });
    globalThis.document ??= { createElement: elem, body: { appendChild() {}, classList: { add() {}, remove() {}, contains: () => false } }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
    const { crearEscenaAmistad } = await import('../supervivencia/escena-amistad.js');
    const rig = () => {
        const p = {};
        for (const k of ['g', 'cuerpo', 'torso', 'cuello', 'cabeza', 'brazoD', 'brazoI', 'piernaD', 'piernaI']) p[k] = new THREE.Group();
        p.g.add(p.cuerpo); p.cuerpo.add(p.torso, p.cuello, p.brazoD, p.brazoI, p.piernaD, p.piernaI); p.cuello.add(p.cabeza);
        return p;
    };
    // Sitios medidos en el mapa (creativo: y sin el desnivel de 48)
    const SITIOS = { hadad: [721.85, 25, 538, 1.57], andy: [725.3, 25, 539.6, 3.14], nacho: [727.15, 25, 538, -1.57], boris: [879.5, 27, 630.15, 3.14], lucho: [882.3, 27, 629.5, -1.34],
        moises: [1327.4, 45, 133.4, 2.27], lalo: [1329.6, 45, 132.6, -1.57], 'venjy@atalaya': [879.5, 38, 621.5, 3.14], 'venjy@mina': [1294.9, 21, 138, -0.45] };
    const personas = Object.entries(SITIOS).map(([clave, [x, y, z, yaw]]) => ({ clave, x, y, z, yaw, p: rig() }));
    const jugador = { pos: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0, colocar(x, y, z) { this.pos.x = x; this.pos.y = y; this.pos.z = z; } };
    const camaras = { cuerpo: rig(), iniciarCine() {}, terminarCine() {}, nuevaLinea() {}, enfocar() {}, set pose(f) {}, set manual(f) { this.m = f; } };
    const motor = crearEscenaAmistad({ grupo: new THREE.Group(), dy: 48, mundo: { bloque: () => 0 }, jugador, camara: new THREE.PerspectiveCamera(), camaras, misiones: {},
        personas: () => personas, personaDe: c => personas.find(n => n.clave === c) || null, bloquear() {}, liberar() {} });
    const foto = () => personas.map(n => [n.clave, n.x, n.y, n.z, n.yaw]);
    for (const [nombre, m] of Object.entries(modGrupos)) for (const base of m.MIEMBROS) for (const corte of [0.6, 1.1]) {
        const ruta = `grupo ${nombre}/${base} (${corte < 1 ? 'Saltar a la mitad' : 'hasta el final'})`;
        const antes = foto(), g = m.grupo(base);
        ok(motor.iniciar(g.ancla, { ...g, lineas: [] }), `${ruta}: empieza`);
        const j0 = { ...jugador.pos };
        let movidos = new Set();
        for (let x = 0; x < g.T * corte && motor.activa; x += 0.05) {
            motor.actualizar(0.05);
            for (const [i, n] of personas.entries()) if (Math.hypot(n.x - antes[i][1], n.y - antes[i][2], n.z - antes[i][3]) > 0.05) movidos.add(n.clave);
            if (Math.hypot(jugador.pos.x - j0.x, jugador.pos.z - j0.z) > 0.05) movidos.add('j');
        }
        if (motor.activa) motor.saltar();
        const esperados = { atalaya: ['venjy@atalaya'], coyhaique: ['venjy@mina', 'moises'] }[nombre] || (base === 'braulio' ? ['j'] : []);
        ok(esperados.every(c => movidos.has(c)), `${ruta}: se movieron ${[...movidos].join(', ') || 'nadie'} (esperados: ${esperados.join(', ') || 'nadie'})`);
        const despues = foto();
        ok(!motor.activa && antes.every((a, i) => a.every((v, k) => v === despues[i][k])), `${ruta}: todos vuelven a su sitio (posición y giro)`);
        ok(jugador.pos.x === j0.x && jugador.pos.y === j0.y && jugador.pos.z === j0.z, `${ruta}: el jugador queda donde empezó la escena`);
        ok(camaras.m === null || camaras.m === undefined, `${ruta}: la cámara manual se suelta`);
    }
}

// Frases únicas (las preguntas de los botones se repiten a propósito) y sin emojis
const respuestas = textos.filter(([r]) => !/\.p$/.test(r));
const otros = [];
for (const m of [...MISIONES, ...JEFES]) for (const k of ['pedido', 'aceptar', 'completada']) if (m[k]) otros.push(m[k]);
for (const t of Object.values(TIENDAS)) for (const k of ['saludo', 'compraOk', 'ventaOk', 'noAlcanza']) otros.push(t[k]);
for (const v of Object.values(TEXTOS_VENJY)) otros.push(v);
for (const c of Object.values(CORTAS)) for (const l of [...c.identica, ...c.basada]) otros.push(l);
for (const l of [...Object.values(VENJY).flat(), ...IGLU]) otros.push(l);
for (const idi of ['es', 'en']) {
    const vistos = new Map();
    for (const o of otros) vistos.set(o[idi].trim().toLowerCase(), 'otro módulo');
    for (const [ruta, o] of respuestas) {
        const k = o[idi].trim().toLowerCase();
        ok(!vistos.has(k), `${ruta} (${idi}) repetida con ${vistos.get(k)}: «${o[idi]}»`);
        vistos.set(k, ruta);
    }
}
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;
for (const [ruta, o] of textos) ok(!EMOJI.test(o.es) && !EMOJI.test(o.en), `${ruta}: sin emojis`);

console.log(`${respuestas.length} frases de «Hablar» (ES/EN) · ${pruebas} comprobaciones`);
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('amistad.mjs: todo bien');
