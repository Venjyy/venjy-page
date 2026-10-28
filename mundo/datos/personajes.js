// =========================================================
// VENJY · Personajes en datos (Etapa B · punto 5, estudio/DISENO.md §41)
// Puro, sin DOM: lo usan el juego (supervivencia/personajes.js, criaturas/amigos.js, dialogos-datos.js), el Estudio
// (pestaña Personajes), el CLI (resumen y validar) y mundo/tests/personajes.mjs.
// mundo/datos/personajes.json → personas.<clave>:
//   · Persona nueva (la clave no es de nadie del código): nombre, apariencia, lugar, postura, horario, globo, frases,
//     hablar (mismo formato que dialogos.json), regalo (nombres de objeto, como /dar) y amigos (tabla de relaciones 6c).
//   · Persona del código (PERSONAS de criaturas/amigos.js): solo `apariencia`, que cambia lo que se escriba encima
//     de la del código (lo demás de esa persona sigue en su JS y validar avisa que se ignora).
//   · `borrador: true`: no sale en el juego (se arma tranquilo en el Estudio).
// Los colores van como "#rrggbb" (el Estudio usa <input type="color">); pielDe (criaturas/pieles.js) los quiere en
// [r, g, b]: descriptorDe los convierte.
// =========================================================

// Quienes ya nacen en el código. amigos.js arma a los 9 primeros con pielDe (se les puede cambiar la apariencia);
// Pony, Salonas y Lona (npcs.js) y Venjy (venjy.js) tienen la piel pintada a mano: aquí no se cambian.
export const PERSONAS_CODIGO = ['hadad', 'andy', 'nacho', 'braulio', 'moises', 'lalo', 'boris', 'lucho', 'conejeros'];
export const PINTADOS_A_MANO = ['pony', 'salonas', 'lona', 'venjy'];
export const CLAVES_CODIGO = [...PERSONAS_CODIGO, ...PINTADOS_A_MANO];

// Opciones con nombre común (valor del juego, ES, EN)
export const ESTILOS_PELO = [
    ['muy corto', 'Rapado', 'Buzz cut'], ['corto', 'Corto', 'Short'], ['ordenado', 'Peinado al lado', 'Side part'],
    ['desordenado', 'Desordenado', 'Messy'], ['largo', 'Largo', 'Long'], ['rulos', 'Rulos', 'Curls']
];
export const ROPAS = [
    ['polera', 'Polera', 'T-shirt'], ['polera ancha', 'Polera ancha', 'Baggy tee'], ['poleron', 'Polerón con capucha', 'Hoodie'],
    ['camisa cuadros', 'Camisa a cuadros', 'Plaid shirt'], ['traje', 'Traje', 'Suit']
];
export const ZAPATILLAS = [['blancas', 'Zapatillas blancas', 'White sneakers'], ['negras', 'Zapatillas negras', 'Black sneakers'], ['jordan', 'Zapatillas rojas', 'Red sneakers'], ['botas', 'Botas', 'Boots']];
export const CABEZA = [['', 'Nada', 'Nothing'], ['paja', 'Sombrero de paja', 'Straw hat'], ['gorro', 'Gorro de lana', 'Beanie']];
export const POSTURAS = [
    ['de pie', 'De pie, mirando alrededor', 'Standing, looking around'], ['brazos cruzados', 'Brazos cruzados', 'Arms crossed'],
    ['manos atras', 'Manos atrás', 'Hands behind the back'], ['sentado', 'Sentado en el suelo', 'Sitting on the ground']
];
export const TAMANOS = [[0.9, 'Bajo', 'Short'], [1, 'Normal', 'Normal'], [1.05, 'Un poco alto', 'A bit tall'], [1.1, 'Alto', 'Tall']];
export const RELACIONES = [['No se conocen', 'Strangers'], ['Conocidos', 'Acquaintances'], ['Amigos', 'Friends'], ['Mejores amigos', 'Best friends'], ['Pareja', 'Couple']];
// Lugares donde puede vivir alguien (mismas anclas que la pestaña Posiciones) y cómo los nombra su panel
export const LUGARES_PERSONA = {
    campamento: { es: 'en el campamento', en: 'at the camp', nombre: ['Campamento', 'Campsite'] },
    iglu: { es: 'en el iglú', en: 'at the igloo', nombre: ['Iglú', 'Igloo'] },
    atalaya: { es: 'en la atalaya', en: 'at the watchtower', nombre: ['Atalaya del bosque', 'Forest watchtower'] },
    naufragio: { es: 'en el naufragio', en: 'at the shipwreck', nombre: ['Naufragio', 'Shipwreck'] },
    molino: { es: 'en el molino viejo', en: 'at the old windmill', nombre: ['Molino viejo', 'Old windmill'] },
    portal: { es: 'en el portal en ruinas', en: 'at the ruined portal', nombre: ['Portal en ruinas', 'Ruined portal'] },
    escenario: { es: 'en el escenario', en: 'at the stage', nombre: ['Escenario de Salonas', 'Salonas stage'] },
    faro: { es: 'en el faro', en: 'at the lighthouse', nombre: ['Faro', 'Lighthouse'] }
};
export const POSTURA_BASE = 'de pie';
export const HORARIO_BASE = { de: 8, a: 18 };
export const GLOBO_BASE = '#9d9d97';
// Una persona nueva sin nada escrito: así se ve (lo que falte de su apariencia sale de aquí)
export const APARIENCIA_BASE = {
    piel: '#e6c4ac', pelo: { color: '#3a2a20', estilo: 'corto' }, ojos: '#5a3c24',
    ropa: { tipo: 'polera', color: '#3c6ea0' }, pantalon: '#3e5c8e', zapatillas: 'blancas'
};

const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const HEX = /^#[0-9a-fA-F]{6}$/;
export const esColor = v => typeof v === 'string' && HEX.test(v);
export function hexARgb(h) {
    if (Array.isArray(h)) return h.slice(0, 3);
    if (!esColor(h)) return null;
    return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
}
export function rgbAHex(c) {
    if (typeof c === 'string') return c;
    return '#' + c.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

// Apariencia del JSON (hex) encima de una base (hex o arreglos) → descriptor de pielDe (arreglos). La base es la de
// PERSONAS (persona del código) o APARIENCIA_BASE (persona nueva). Lo que no viene o viene mal queda como en la base.
export function descriptorDe(apariencia, base = APARIENCIA_BASE) {
    const a = esObj(apariencia) ? apariencia : {};
    const col = (v, b) => hexARgb(v) || hexARgb(b);
    const d = { ...base };
    d.piel = col(a.piel, base.piel);
    d.ojos = col(a.ojos, base.ojos);
    d.pantalon = col(a.pantalon, base.pantalon);
    const bp = base.pelo || APARIENCIA_BASE.pelo, ap = esObj(a.pelo) ? a.pelo : {};
    d.pelo = { color: col(ap.color, bp.color), estilo: typeof ap.estilo === 'string' ? ap.estilo : bp.estilo };
    const br = base.ropa || APARIENCIA_BASE.ropa, ar = esObj(a.ropa) ? a.ropa : {};
    d.ropa = { tipo: typeof ar.tipo === 'string' ? ar.tipo : br.tipo, color: col(ar.color, br.color) };
    const est = 'estampado' in ar ? ar.estampado : br.estampado;
    if (est) d.ropa.estampado = hexARgb(est); else delete d.ropa.estampado;
    for (const k of ['zapatillas', 'barbaEstilo', 'sombrero']) if (typeof a[k] === 'string') d[k] = a[k];
    for (const k of ['barba', 'lunar', 'lentes', 'ojosRojos']) if (typeof a[k] === 'boolean') d[k] = a[k];
    if (a.sombrero === '') delete d.sombrero;
    if ('gorro' in a) { if (a.gorro) d.gorro = hexARgb(a.gorro); else delete d.gorro; } else if (base.gorro) d.gorro = hexARgb(base.gorro);
    if (a.barbaColor) d.barbaColor = hexARgb(a.barbaColor); else if (base.barbaColor) d.barbaColor = hexARgb(base.barbaColor);
    if (Number.isFinite(a.escala)) d.escala = Math.max(0.7, Math.min(1.3, a.escala));
    return d;
}

// Al revés: descriptor de PERSONAS (arreglos) → apariencia en hex (para partir de alguien parecido en el Estudio)
export function aparienciaDe(d) {
    const a = {
        piel: rgbAHex(d.piel), pelo: { color: rgbAHex(d.pelo.color), estilo: d.pelo.estilo }, ojos: rgbAHex(d.ojos),
        ropa: { tipo: d.ropa.tipo, color: rgbAHex(d.ropa.color) }, pantalon: rgbAHex(d.pantalon), zapatillas: d.zapatillas || 'blancas'
    };
    if (d.ropa.estampado) a.ropa.estampado = rgbAHex(d.ropa.estampado);
    for (const k of ['barba', 'lunar', 'lentes', 'ojosRojos']) if (d[k]) a[k] = true;
    if (d.barbaEstilo) a.barbaEstilo = d.barbaEstilo;
    if (d.barbaColor) a.barbaColor = rgbAHex(d.barbaColor);
    if (d.sombrero) a.sombrero = d.sombrero;
    if (d.gorro) a.gorro = rgbAHex(d.gorro);
    if (d.escala && d.escala !== 1) a.escala = d.escala;
    return a;
}

// Clave a partir del nombre: minúsculas, sin tildes ni espacios, y que no choque con otra
export function claveDeNombre(nombre, ocupadas = []) {
    const ya = new Set(ocupadas);
    let base = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!/^[a-z]/.test(base)) base = 'persona' + (base ? '-' + base : '');
    base = base.slice(0, 40);
    let k = base, i = 2;
    while (ya.has(k)) k = `${base}-${i++}`;
    return k;
}

export const esDelCodigo = clave => CLAVES_CODIGO.includes(clave);
// Las personas nuevas que salen en el juego (sin borrador), en orden del archivo
export function personasNuevas(datos) {
    const p = (datos && esObj(datos.personas)) ? datos.personas : {};
    return Object.entries(p).filter(([k, d]) => esObj(d) && !d.borrador && !esDelCodigo(k)).map(([clave, def]) => ({ clave, def }));
}
// Apariencias que cambian a alguien del código (sin borrador)
export function aparienciasCodigo(datos) {
    const p = (datos && esObj(datos.personas)) ? datos.personas : {};
    const o = {};
    for (const k of PERSONAS_CODIGO) if (esObj(p[k]) && !p[k].borrador && esObj(p[k].apariencia)) o[k] = p[k].apariencia;
    return o;
}
export const nombreDe = (clave, def) => (def && typeof def.nombre === 'string' && def.nombre.trim()) || clave;
export const posturaDe = def => (def && POSTURAS.some(p => p[0] === def.postura) ? def.postura : POSTURA_BASE);
export const globoDe = def => (def && esColor(def.globo) ? def.globo : GLOBO_BASE);
// Lugar base: el `lugar` del JSON (formato de posiciones.json); sin lugar, el campamento
export function lugarDe(def) {
    const l = def && esObj(def.lugar) ? def.lugar : {};
    return {
        ancla: typeof l.ancla === 'string' ? l.ancla : 'campamento',
        dx: Number.isFinite(l.dx) ? l.dx : 0, dz: Number.isFinite(l.dz) ? l.dz : 6,
        dy: l.dy === undefined ? 'suelo' : l.dy,
        ...(l.marco ? { marco: l.marco } : {}), ...(Number.isFinite(l.giro) ? { giro: l.giro } : {})
    };
}
const hora = v => Number.isFinite(v) && v >= 0 && v <= 24;
// Horario base de su panel: { ancla, de, a, lugar: { es, en } }
export function horarioDe(def) {
    const h = def && esObj(def.horario) ? def.horario : {};
    const ancla = lugarDe(def).ancla;
    const texto = esObj(h.lugar) && h.lugar.es && h.lugar.en ? { es: h.lugar.es, en: h.lugar.en } : null;
    return {
        ancla, de: hora(h.de) ? h.de : HORARIO_BASE.de, a: hora(h.a) ? h.a : HORARIO_BASE.a,
        lugar: texto || (LUGARES_PERSONA[ancla] ? { es: LUGARES_PERSONA[ancla].es, en: LUGARES_PERSONA[ancla].en } : { es: ancla, en: ancla })
    };
}
export const frasesDe = def => (def && Array.isArray(def.frases) ? def.frases.filter(f => esObj(f) && f.es && f.en) : []);

// «Hablar» de las personas nuevas dentro de los diálogos (mismo formato que dialogos.json). Solo suma: si
// dialogos.json ya trae esa persona en una sección, gana el de dialogos.json. Devuelve un objeto nuevo.
export function fusionarHablar(dialogos, datos) {
    const d = dialogos || {};
    const out = { ...d, temas: { ...(d.temas || {}) }, opiniones: { ...(d.opiniones || {}) }, saludos: { ...(d.saludos || {}) }, regalos: { ...(d.regalos || {}) }, gestoRegalo: { ...(d.gestoRegalo || {}) } };
    for (const { clave, def } of personasNuevas(datos)) {
        const h = esObj(def.hablar) ? def.hablar : {};
        const saludo = esObj(h.saludo) && h.saludo.bajo && h.saludo.alto ? h.saludo : { bajo: { es: '¿Hola?', en: 'Hi?' }, alto: { es: '¡Hola de nuevo!', en: 'Hi again!' } };
        if (!out.temas[clave]) out.temas[clave] = Array.isArray(h.temas) ? h.temas.filter(t => esObj(t) && t.id && t.p && t.r) : [];
        if (!out.saludos[clave]) out.saludos[clave] = saludo;
        if (!out.regalos[clave] && h.regalo) out.regalos[clave] = h.regalo;
        if (!out.opiniones[clave] && esObj(h.opiniones)) out.opiniones[clave] = h.opiniones;
        if (!out.gestoRegalo[clave] && typeof h.gestoRegalo === 'string') out.gestoRegalo[clave] = h.gestoRegalo;
    }
    return out;
}

// Reglas que el esquema no ve. refs: { anclas: Set, objeto(nombre) → bool, gestos?: Set }
export function reglasPersonajes(datos, refs = {}) {
    const r = [];
    const mal = texto => r.push({ tipo: 'error', texto }), aviso = texto => r.push({ tipo: 'aviso', texto });
    const p = (datos && esObj(datos.personas)) ? datos.personas : {};
    const todas = new Set([...CLAVES_CODIGO, ...Object.keys(p)]);
    const nombres = new Map();
    for (const [k, d] of Object.entries(p)) {
        const $ = `$.personas.${k}`;
        if (!esObj(d)) continue;
        if (PINTADOS_A_MANO.includes(k)) { aviso(`${$}: ${k} tiene la piel pintada a mano en el código; el juego ignora esta entrada`); continue; }
        if (PERSONAS_CODIGO.includes(k)) {
            const sobran = Object.keys(d).filter(c => !['apariencia', 'borrador', 'nota'].includes(c));
            if (sobran.length) aviso(`${$}: es del código; solo se usa «apariencia» (se ignora: ${sobran.join(', ')})`);
            continue;
        }
        if (typeof d.nombre !== 'string' || !d.nombre.trim()) mal(`${$}: le falta el nombre`);
        else {
            const n = d.nombre.trim().toLowerCase();
            if (nombres.has(n)) aviso(`${$}: se llama igual que ${nombres.get(n)}`);
            nombres.set(n, k);
        }
        const l = lugarDe(d);
        if (refs.anclas && !refs.anclas.has(l.ancla)) mal(`${$}.lugar.ancla: «${l.ancla}» no es un lugar del mapa`);
        if (!d.lugar) aviso(`${$}: sin lugar, aparece en el campamento`);
        const h = esObj(d.horario) ? d.horario : null;
        if (h && hora(h.de) && hora(h.a) && h.de >= h.a) aviso(`${$}.horario: «de» (${h.de}) va antes que «a» (${h.a})`);
        if (h && !h.lugar && !LUGARES_PERSONA[l.ancla]) aviso(`${$}.horario.lugar: falta cómo nombra su panel el lugar «${l.ancla}»`);
        for (const nom of Array.isArray(d.regalo) ? d.regalo : []) if (refs.objeto && !refs.objeto(nom)) mal(`${$}.regalo: «${nom}» no es un objeto (nombres como /dar)`);
        for (const [o, v] of Object.entries(esObj(d.amigos) ? d.amigos : {})) {
            if (!todas.has(o)) mal(`${$}.amigos.${o}: no existe esa persona`);
            else if (o === k) mal(`${$}.amigos.${o}: no puede ser amigo de sí mismo`);
            else if (!(Number.isInteger(v) && v >= 0 && v <= 4)) mal(`${$}.amigos.${o}: va de 0 (no se conocen) a 4 (pareja)`);
        }
        const hb = esObj(d.hablar) ? d.hablar : {};
        if (!d.borrador && !(esObj(hb.saludo) && hb.saludo.bajo && hb.saludo.alto)) aviso(`${$}.hablar.saludo: sin saludo, dice «¿Hola?» al abrir «Hablar»`);
        const ids = new Set();
        for (const t of Array.isArray(hb.temas) ? hb.temas : []) {
            if (!esObj(t)) continue;
            if (ids.has(t.id)) mal(`${$}.hablar.temas: el tema «${t.id}» está repetido`);
            ids.add(t.id);
            if (t.g && refs.gestos && !refs.gestos.has(t.g)) aviso(`${$}.hablar.temas.${t.id}.g: el gesto «${t.g}» no existe`);
        }
        for (const o of Object.keys(esObj(hb.opiniones) ? hb.opiniones : {})) if (!todas.has(o)) mal(`${$}.hablar.opiniones.${o}: no existe esa persona`);
        if (!frasesDe(d).length && !d.borrador) aviso(`${$}.frases: sin frases, no dice nada al acercarte`);
    }
    return r;
}

// Bases para partir (vista simple del Estudio): ropa y postura de ejemplo; la apariencia exacta sale de copiar a alguien
export const BASES = {
    vacia: { es: 'En blanco', en: 'Blank', def: { apariencia: APARIENCIA_BASE, postura: 'de pie' } },
    tranquilo: { es: 'Tranquilo, brazos cruzados', en: 'Calm, arms crossed', def: { apariencia: { ...APARIENCIA_BASE, ropa: { tipo: 'poleron', color: '#4a5a3a' } }, postura: 'brazos cruzados' } },
    sentado: { es: 'Sentado descansando', en: 'Sitting, resting', def: { apariencia: { ...APARIENCIA_BASE, ropa: { tipo: 'polera ancha', color: '#d8d8d0' } }, postura: 'sentado' } }
};
