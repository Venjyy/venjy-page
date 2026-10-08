// =========================================================
// VENJY · Zonas del portafolio dentro del mundo 3D
// El mundo sigue el mismo orden que la página: Inicio → Sobre mí → Experiencia → Habilidades →
// Proyectos → Mis gatas → Contacto (y el faro, ProcedimientoSeguro). Cada zona vive en su lugar
// del mapa (datos.P) y registra sus puntos de interés (cartel + panel).
// Los textos salen de index.html (contenido.js) y del CV (cv-datos.js); el CV manda si difieren.
// =========================================================
import { CV_PAGINAS, CV_PDF } from './cv-datos.js';
import { ESCALA, BASE_ESTRUCTURA } from '../voxeles.js';
import { paginar } from './portafolio.js';
import { VETAS, geometriaPantallaFaro } from './bloques.js';

const por = (x, l) => (x && (x[l] ?? x.es)) ?? '';
const bloqueEn = (terreno, x, z) => terreno.HT[Math.floor(z) * terreno.BW + Math.floor(x)];

// ---------- Zona 0 · Inicio: cartel de bienvenida frente al punto de aparición ----------
function inicio({ portafolio, terreno, datos, contenido, nombres }) {
    const [sx, sz] = datos.P.spawn;
    const tit = datos.titulo;
    const yaw = Math.atan2(-(tit.tx0 + tit.anchoT / 2 - sx), -(tit.ty0 + tit.altoT / 2 - sz));
    const bx = sx * ESCALA + 2, bz = sz * ESCALA + 2;
    const x = bx + 0.5 - Math.sin(yaw) * 7, z = bz + 0.5 - Math.cos(yaw) * 7;
    const y = bloqueEn(terreno, x, z) + 4;
    const nombre = contenido.texto('.letrero-nombre');
    portafolio.carteles.agregar({
        x, y, z, ancho: 8, tamano: 30, color: '#ffff55', distancia: 70,
        texto: l => `${por(nombre, l)}\n${l === 'en' ? 'Follow the path' : 'Sigue el camino'} · ${por(nombres.casa, l)} >`
    });
}

// Página de ProcedimientoSeguro para el CV (viene de index.html: el CV aún no la incluye)
function paginaPS(contenido, clave) {
    const parada = contenido.uno('#experiencia .parada');
    if (!parada) return null;
    const t = sel => contenido.texto(sel, parada)[clave];
    return {
        titulo: t('.tt-empresa'),
        sub: [{ cab: t('.tt-titulo'), texto: t('.tt-fecha') }],
        parrafos: [t('.tt-desc')],
        items: contenido.textos('.tt-lista li', parada).map(x => x[clave]),
        pie: t('.tt-encantamientos')
    };
}

// ---------- Zona 1 · Sobre mí: la casa roja (CV en dos atriles, libro y retrato) ----------
function sobreMi({ portafolio, terreno, contenido, nombres }) {
    const g = terreno.sobreMi;
    if (!g) return;
    const y0 = g.base + 1;
    const nombre = contenido.texto('.letrero-nombre');
    const zona = nombres.casa;

    // Atriles del CV: cada uno muestra siempre su idioma
    const atriles = [
        { poi: g.atriles[0], clave: 'es', cartel: 'CV · Español', titulo: { es: 'CV · Español', en: 'CV · Spanish' }, boton: { es: 'Abrir el PDF', en: 'Open the PDF' } },
        { poi: g.atriles[1], clave: 'en', cartel: 'CV · English', titulo: { es: 'CV · Inglés', en: 'CV · English' }, boton: { es: 'Open the PDF', en: 'Open the PDF' } }
    ];
    for (const a of atriles) {
        const crudas = CV_PAGINAS[a.clave].slice();
        const ps = paginaPS(contenido, a.clave);
        if (ps) crudas.splice(3, 0, ps); // antes de Dafa: lo más reciente primero, como en la página
        const paginas = crudas.flatMap(p => paginar(p));
        portafolio.agregarPOI({
            id: a.poi.id,
            x: a.poi.x + 0.5, y: y0 + 2.6, z: a.poi.z + 0.5,
            cartel: { texto: { es: a.cartel, en: a.cartel }, dy: 1.6, ancho: 3.2, tamano: 30, color: '#ffff55' },
            titulo: a.titulo,
            paginas: () => paginas,
            recurso: () => ({ url: CV_PDF[a.clave], etiqueta: a.boton })
        });
    }

    // Libro de presentación: los mismos párrafos y logros de la sección «Sobre mí» de la página
    const parrafos = contenido.textos('#sobre-mi .letrero p');
    const logros = contenido.textos('#sobre-mi .logro-texto');
    portafolio.agregarPOI({
        id: 'sobre-mi-libro',
        x: g.libro.x, y: g.libro.y, z: g.libro.z,
        cartel: { texto: zona, dy: 0.8, ancho: 2.0, tamano: 26, color: '#ffffff' },
        titulo: zona,
        paginas: l => [
            { titulo: por(nombre, l), parrafos: parrafos.map(p => por(p, l)) },
            { titulo: l === 'en' ? 'Achievements' : 'Logros', items: logros.map(p => por(p, l)) }
        ]
    });

    // Retrato en la pared norte
    const retrato = contenido.uno('#retrato');
    const altEs = retrato?.getAttribute('data-alt-es') || 'Retrato de Benjamín Flores';
    const altEn = retrato?.getAttribute('data-alt-en') || 'Portrait of Benjamin Flores';
    portafolio.agregarCuadro({
        x: g.retrato.x, y: g.retrato.y, z: g.retrato.z, ancho: 3, alto: 2.83, normal: 'z+', imagen: 'images/Venjy.png',
        poi: {
            id: 'sobre-mi-retrato', radio: 5,
            titulo: { es: altEs, en: altEn },
            paginas: l => [{ titulo: l === 'en' ? altEn : altEs, imagen: 'images/Venjy.png', parrafos: [por(nombre, l)] }]
        }
    });

    // Cartel grande con el nombre bajo la cumbrera y letrero sobre la puerta
    portafolio.carteles.agregar({
        x: g.centro.x, y: g.centro.y, z: g.centro.z, ancho: 9, tamano: 34, color: '#ffff55', distancia: 40,
        texto: l => `${por(nombre, l)}\n${l === 'en' ? 'Full Stack Developer' : 'Desarrollador Full Stack'}`
    });
    portafolio.carteles.agregar({
        x: g.px + 0.5, y: y0 + 5.2, z: g.iz1 + 3, ancho: 4.5, tamano: 34, color: '#ffffff', distancia: 60,
        texto: zona
    });
}

// ---------- Zona 2 · Experiencia: el edificio azul del registro (un puesto por trabajo) ----------
function experiencia({ portafolio, terreno, contenido, nombres }) {
    const g = terreno.registro;
    if (!g) return;
    const y0 = g.base + 1;
    const paradas = contenido.varios('#experiencia .parada');
    paradas.forEach((parada, i) => {
        const p = g.puestos[i];
        if (!p) return;
        const cargo = contenido.texto('.tt-titulo', parada), empresa = contenido.texto('.tt-empresa', parada).es;
        const fecha = contenido.texto('.tt-fecha', parada), desc = contenido.texto('.tt-desc', parada);
        const items = contenido.textos('.tt-lista li', parada), stack = contenido.texto('.tt-encantamientos', parada);
        const esPS = empresa === 'ProcedimientoSeguro';
        portafolio.agregarPOI({
            id: 'exp-' + i, x: p.x + 0.5, y: y0 + 2.6, z: p.z + 0.5,
            cartel: { texto: l => `${empresa}\n${por(cargo, l)}`, dy: 1.7, ancho: 5.6, tamano: 20, color: '#ffff55', cerca: 3 },
            titulo: { es: empresa, en: empresa },
            paginas: l => paginar({
                titulo: empresa, sub: [{ cab: por(cargo, l), texto: por(fecha, l) }], parrafos: [por(desc, l)],
                items: items.map(x => por(x, l)), pie: por(stack, l)
            }),
            recurso: esPS ? () => [
                { url: 'https://app.procedimientoseguro.cl', etiqueta: { es: 'Abrir la app', en: 'Open the app' } },
                { url: 'https://procedimientoseguro.cl', etiqueta: { es: 'Ver el sitio', en: 'Visit the site' } }
            ] : null
        });
    });
    portafolio.carteles.agregar({
        x: g.px + 0.5, y: y0 + 5.2, z: g.iz1 + 3, ancho: 4.5, tamano: 34, color: '#ffffff', distancia: 60, texto: nombres.registro
    });
    portafolio.carteles.agregar({
        x: g.centro.x, y: g.centro.y, z: g.centro.z, ancho: 7, tamano: 34, color: '#ffff55', distancia: 40, texto: nombres.registro
    });
}

// ---------- Zona 3 · Habilidades: vetas de mineral en el túnel de la mina ----------
function habilidades({ portafolio, terreno, contenido, nombres }) {
    const d = terreno.decor.find(x => x.t === 'mina');
    if (!d) return;
    const y0 = BASE_ESTRUCTURA + 1;
    contenido.varios('#habilidades .veta').forEach((veta, i) => {
        const v = VETAS[i];
        if (!v) return;
        const titulo = contenido.bi(veta.querySelector('.veta-titulo > span')), mineral = contenido.texto('.veta-mineral', veta);
        const menas = contenido.textos('.mena', veta);
        portafolio.agregarPOI({
            id: 'hab-' + i, x: d.x + 0.5, y: y0 + 1.4, z: d.z - v.k + 0.5, radio: 2.8,
            cartel: { texto: l => `${por(titulo, l)}\n${por(mineral, l)}`, dy: 1.3, ancho: 3.6, tamano: 20, color: '#ffffff', distancia: 14, cerca: 2.8 },
            titulo: { es: titulo.es, en: titulo.en },
            paginas: l => paginar({ titulo: `${por(titulo, l)} · ${por(mineral, l)}`, parrafos: [menas.map(m => por(m, l)).join(' · ')] })
        });
    });
    portafolio.carteles.agregar({
        x: d.x + 0.5, y: y0 + 3.4, z: d.z + 3, ancho: 3.4, tamano: 30, color: '#ffffff', distancia: 60, texto: nombres.mina
    });
}

// ---------- Zona 4 · Proyectos: tarjetas en la casa de la aldea ----------
function proyectos({ portafolio, terreno, datos, contenido, nombres }) {
    const [ax, az] = datos.P.aldea;
    let c = null, dm = Infinity;
    for (const k of terreno.casas) {
        const d = Math.hypot((k.minx + k.maxx) / 2 - ax * ESCALA, (k.minz + k.maxz) / 2 - az * ESCALA);
        if (k.sup === 18 && d < dm) { dm = d; c = k; } // PODZOL: la casa del centro de la aldea
    }
    if (!c) return;
    const y0 = BASE_ESTRUCTURA + 1, zf = c.maxz + 1.6;
    const obras = contenido.varios('#proyectos .obra');
    const xs = [c.puertaX - 9, c.puertaX - 4.5, c.puertaX + 5.5, c.puertaX + 10];
    obras.forEach((obra, i) => {
        if (i >= xs.length) return;
        const titulo = contenido.uno('.tt-titulo', obra).textContent.trim();
        const desc = contenido.texto('.tt-desc', obra), stack = contenido.texto('.tt-encantamientos', obra);
        const enlaces = contenido.varios('a.boton', obra).map(a => ({ url: a.getAttribute('href'), etiqueta: contenido.bi(a) }));
        portafolio.agregarPOI({
            id: 'proy-' + i, x: xs[i] + 0.5, y: y0 + 2, z: zf, radio: 3.8,
            cartel: { texto: { es: titulo, en: titulo }, dy: 1.5, ancho: 3.4, tamano: 28, color: '#ffff55', distancia: 26 },
            titulo: { es: titulo, en: titulo },
            paginas: l => paginar({ titulo, parrafos: [por(desc, l)], pie: por(stack, l) }),
            recurso: () => enlaces
        });
    });
    portafolio.carteles.agregar({
        x: c.puertaX + 0.5, y: y0 + 5.4, z: c.maxz + 4, ancho: 4.5, tamano: 34, color: '#ffffff', distancia: 70, texto: nombres.aldea
    });
}

// ---------- Zona 5 · Mis gatas: cuadros con las fotos en las paredes de la gatera ----------
const FOTOS_GATAS = [
    // [archivo, pared (n norte, s sur, o oeste, e este), posición a lo largo de la pared]; todas por dentro de la casa
    ['MilayGala', 'n', 739.5], ['Gala', 'n', 743], ['MilaGod', 'n', 746.5], ['Galapatitas', 'n', 750],
    ['Mila1', 'n', 753.5], ['Gala2', 'n', 757], ['Milasol', 'n', 760.5],
    ['GalayMila', 'o', 825], ['Galatuto', 'o', 829], ['Milapetit', 'o', 833],
    ['Gala3', 'e', 825], ['MilaCuestionando', 'e', 829], ['Mila3', 'e', 833],
    ['Galapatona', 's', 743.5], ['MilaAceituna', 's', 756]
];

function gatas({ portafolio, terreno, contenido, nombres }) {
    const c = terreno.gatera;
    if (!c) return;
    const yc = BASE_ESTRUCTURA + 3.6;
    // Fichas de Mila y Gala (de la sección «Mis gatas» de la página)
    const ficha = {};
    for (const mob of contenido.varios('#gatos .mob')) {
        const nombre = mob.querySelector('.placa-nombre')?.textContent.trim();
        const f = mob.querySelector('.mob-ficha');
        if (!f || !nombre) continue;
        ficha[nombre === 'Galatea' ? 'Gala' : nombre] = contenido.textos('span', f);
    }
    const altDe = archivo => {
        const img = contenido.uno(`#gatos img[src$="/${archivo}.jfif"]`);
        const es = img?.getAttribute('data-alt-es') || img?.getAttribute('alt') || archivo;
        const en = img?.getAttribute('data-alt-en') || es;
        return { es, en };
    };
    for (const [archivo, pared, pos] of FOTOS_GATAS) {
        const a = altDe(archivo);
        const gala = /^Gala/.test(archivo) && !/^GalayMila/.test(archivo), mila = /^Mila/.test(archivo) && !/^MilayGala/.test(archivo);
        const quien = gala ? ['Gala'] : mila ? ['Mila'] : ['Mila', 'Gala'];
        const nombreCartel = quien.join(' y ');
        let x, z, normal;
        // Planos pegados a la cara INTERIOR de cada muro (el muro ocupa [min, min+1) y [max, max+1))
        if (pared === 'n') { x = pos; z = c.minz + 1.04; normal = 'z+'; }
        else if (pared === 's') { x = pos; z = c.maxz - 0.04; normal = 'z-'; }
        else if (pared === 'o') { x = c.minx + 1.04; z = pos; normal = 'x+'; }
        else { x = c.maxx - 0.04; z = pos; normal = 'x-'; }
        portafolio.agregarCuadro({
            x, y: yc, z, ancho: 2.5, alto: 2.2, normal, imagen: `images/mundo/${archivo}.jpg`,
            poi: {
                id: 'gata-' + archivo, radio: 3.4,
                cartel: { texto: { es: nombreCartel, en: nombreCartel }, dy: 1.6, ancho: 1.8, tamano: 26, color: '#ffff55', distancia: 14 },
                titulo: { es: a.es, en: a.en },
                paginas: l => [{
                    titulo: l === 'en' ? a.en : a.es, imagen: `images/mundo/${archivo}.jpg`,
                    parrafos: quien.flatMap(q => (ficha[q] || []).map(t => por(t, l)))
                }]
            }
        });
    }
    portafolio.carteles.agregar({
        x: c.px + 0.5, y: BASE_ESTRUCTURA + 6, z: c.maxz + 3, ancho: 4.5, tamano: 34, color: '#ffffff', distancia: 70, texto: nombres.gatera
    });
}

// ---------- Zona 6 · Contacto: el correo por dentro (un atril por canal) y el buzón de la entrada ----------
function contacto({ portafolio, terreno, contenido, nombres }) {
    const g = terreno.correo;
    const y0 = BASE_ESTRUCTURA + 1;
    const gancho = contenido.texto('.correo-gancho');
    const filas = contenido.varios('#contacto a.canal').map(a => ({
        tipo: a.querySelector('.canal-tipo')?.textContent.trim(), valor: a.querySelector('.canal-valor')?.textContent.trim(), url: a.getAttribute('href')
    }));
    // Un atril por canal dentro del edificio: el panel muestra el dato y su botón
    if (g) {
        filas.forEach((f, i) => {
            const p = g.puestos[i];
            if (!p) return;
            portafolio.agregarPOI({
                id: 'contacto-' + i, x: p.x + 0.5, y: y0 + 2.6, z: p.z + 0.5,
                cartel: { texto: { es: f.tipo, en: f.tipo }, dy: 1.6, ancho: 3, tamano: 30, color: '#ffff55' },
                titulo: { es: f.tipo, en: f.tipo },
                paginas: l => [{ titulo: f.tipo, parrafos: [por(gancho, l), f.valor] }],
                recurso: () => ({ url: f.url, etiqueta: { es: 'Abrir ' + f.tipo, en: 'Open ' + f.tipo } })
            });
        });
        portafolio.carteles.agregar({
            x: g.centro.x, y: g.centro.y, z: g.centro.z, ancho: 7, tamano: 34, color: '#ffff55', distancia: 40, texto: nombres.correo
        });
        portafolio.carteles.agregar({
            x: g.px + 1, y: y0 + 5.4, z: g.maxz + 4, ancho: 4.5, tamano: 34, color: '#ffffff', distancia: 70, texto: nombres.correo
        });
    }
    // Buzón de la entrada: resumen con los tres canales
    const d = terreno.decor.find(x => x.t === 'buzon');
    if (d) {
        portafolio.agregarPOI({
            id: 'contacto-buzon', x: d.x + 1.5, y: y0 + 3.2, z: d.z + 1.5, radio: 5,
            cartel: { texto: nombres.correo, dy: 1.7, ancho: 3.4, tamano: 30, color: '#ffff55' },
            titulo: nombres.correo,
            paginas: l => paginar({ titulo: por(nombres.correo, l), parrafos: [por(gancho, l)], items: filas.map(f => `${f.tipo}: ${f.valor}`) }),
            recurso: () => filas.map(f => ({ url: f.url, etiqueta: { es: f.tipo, en: f.tipo } }))
        });
    }
}

// ---------- Zona 7 · ProcedimientoSeguro: la pantalla al pie del faro ----------
function faro({ portafolio, terreno, contenido }) {
    const s = geometriaPantallaFaro(terreno.faro);
    const raiz = contenido.uno('#procedimiento-seguro');
    const nombre = contenido.texto('.servidor-nombre', raiz).es || 'ProcedimientoSeguro';
    const motd = contenido.texto('.servidor-motd', raiz), estado = contenido.texto('.servidor-estado', raiz);
    const desc = contenido.texto('.tooltip-ps .tt-desc', raiz), rol = contenido.texto('.tooltip-ps .tt-rol', raiz);
    const lista = contenido.textos('.ps-lista li', raiz), stack = contenido.texto('.tooltip-ps .tt-encantamientos', raiz);
    portafolio.agregarCuadro({
        x: s.centro.x, y: s.centro.y, z: s.centro.z, ancho: 5.6, alto: 3, normal: 'z+', marco: 0.1,
        imagen: 'images/procseg/promo-poster.jpg', video: 'images/procseg/promo.mp4',
        poi: {
            id: 'faro-ps', radio: 5,
            cartel: { texto: l => `${nombre}\n${l === 'en' ? 'online' : 'en línea'}`, dy: 2.6, ancho: 5.2, tamano: 30, color: '#ffff55', distancia: 60 },
            titulo: { es: nombre, en: nombre },
            paginas: l => paginar({
                titulo: nombre, sub: [{ cab: por(motd, l), texto: por(estado, l) }], parrafos: [por(rol, l), por(desc, l)],
                items: lista.map(x => por(x, l)), pie: por(stack, l)
            }),
            recurso: () => [
                { url: 'https://app.procedimientoseguro.cl', etiqueta: { es: 'Abrir la app', en: 'Open the app' } },
                { url: 'https://procedimientoseguro.cl', etiqueta: { es: 'Ver el sitio', en: 'Visit the site' } }
            ]
        }
    });
}

// ---------- Carteles «siguiente» a lo largo del camino ----------
function siguientes({ portafolio, terreno, datos, nombres }) {
    const orden = ['casa', 'registro', 'mina', 'aldea', 'gatera', 'correo', 'faro'];
    for (let i = 0; i < orden.length - 1; i++) {
        const [cx, cz] = datos.P[orden[i]];
        const x = cx * ESCALA + 2, z = cz * ESCALA + 2; // justo sobre el camino
        const sig = nombres[orden[i + 1]];
        portafolio.carteles.agregar({
            x, y: bloqueEn(terreno, x, z) + 3.6, z, ancho: 5, tamano: 26, color: '#aaffaa', distancia: 36,
            texto: l => `${l === 'en' ? 'Next' : 'Siguiente'}: ${por(sig, l)} >`
        });
    }
}

// Dónde aparece el visitante al elegir una zona en «Ir a»: frente a su entrada y mirando hacia ella
// (norte = yaw 0). Sin `y`, se usa el suelo del lugar.
export function destinos({ terreno, datos }) {
    const y1 = BASE_ESTRUCTURA + 1;
    const d = {};
    if (terreno.sobreMi) d.casa = { x: terreno.sobreMi.px + 0.5, z: terreno.sobreMi.iz1 + 6, y: y1, yaw: 0 };
    if (terreno.registro) d.registro = { x: terreno.registro.px + 0.5, z: terreno.registro.iz1 + 6, y: y1, yaw: 0 };
    const mina = terreno.decor.find(x => x.t === 'mina');
    if (mina) d.mina = { x: mina.x + 0.5, z: mina.z + 8, y: y1, yaw: 0 };
    const [ax, az] = datos.P.aldea;
    let c = null, dm = Infinity;
    for (const k of terreno.casas) {
        const dd = Math.hypot((k.minx + k.maxx) / 2 - ax * ESCALA, (k.minz + k.maxz) / 2 - az * ESCALA);
        if (k.sup === 18 && dd < dm) { dm = dd; c = k; }
    }
    if (c) d.aldea = { x: c.puertaX + 0.5, z: c.maxz + 7, y: undefined, yaw: 0 };
    if (terreno.gatera) d.gatera = { x: terreno.gatera.px + 0.5, z: terreno.gatera.maxz - 3, y: y1, yaw: 0 }; // dentro de la casa, mirando las fotos (frente a la puerta hay cajas)
    if (terreno.correo) d.correo = { x: terreno.correo.px + 1, z: terreno.correo.maxz + 5, y: y1, yaw: 0 };
    d.faro = { x: terreno.faro.x - 4, z: terreno.faro.z + 14, y: undefined, yaw: 0 };
    return d;
}

export function registrarZonas(ctx) {
    const nombres = ctx.contenido.nombresZona();
    const c = { ...ctx, nombres };
    inicio(c);
    sobreMi(c);
    experiencia(c);
    habilidades(c);
    proyectos(c);
    gatas(c);
    contacto(c);
    faro(c);
    siguientes(c);
    return { nombres, destinos: destinos(c) };
}
