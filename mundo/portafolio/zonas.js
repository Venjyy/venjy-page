// =========================================================
// VENJY · Zonas del portafolio dentro del mundo 3D
// El mundo sigue el mismo orden que la página: Inicio → Sobre mí → Experiencia → Habilidades →
// Proyectos → Mis gatas → Contacto (y el faro, ProcedimientoSeguro). Cada zona vive en su lugar
// del mapa (datos.P) y registra sus puntos de interés (cartel + panel).
// Los textos salen de index.html (contenido.js) y del CV (cv-datos.js); el CV manda si difieren.
// =========================================================
import { CV_PAGINAS, CV_PDF } from './cv-datos.js';
import { ESCALA } from '../voxeles.js';

// Zona 0 · Inicio: cartel de bienvenida frente al punto de aparición
function inicio({ portafolio, terreno, datos, contenido, nombres }) {
    const [sx, sz] = datos.P.spawn;
    const tit = datos.titulo;
    const yaw = Math.atan2(-(tit.tx0 + tit.anchoT / 2 - sx), -(tit.ty0 + tit.altoT / 2 - sz));
    const bx = sx * ESCALA + 2, bz = sz * ESCALA + 2;
    const x = bx + 0.5 - Math.sin(yaw) * 7, z = bz + 0.5 - Math.cos(yaw) * 7;
    const y = terreno.HT[Math.floor(z) * terreno.BW + Math.floor(x)] + 4;
    const nombre = contenido.texto('.letrero-nombre');
    portafolio.carteles.agregar({
        x, y, z, ancho: 8, tamano: 30, color: '#ffff55', distancia: 70,
        texto: l => `${nombre[l] || nombre.es}\n${l === 'en' ? 'Follow the path' : 'Sigue el camino'} · ${nombres.casa[l] || nombres.casa.es} >`
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

// Zona 1 · Sobre mí: la casa roja (CV en dos atriles, libro de presentación y retrato)
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
        const ps = paginaPS(contenido, a.clave);
        const paginas = CV_PAGINAS[a.clave].slice();
        if (ps) paginas.splice(3, 0, ps); // antes de Dafa: lo más reciente primero, como en la página
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
            { titulo: nombre[l] || nombre.es, parrafos: parrafos.map(p => p[l] || p.es) },
            { titulo: l === 'en' ? 'Achievements' : 'Logros', items: logros.map(p => p[l] || p.es) }
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
            paginas: l => [{ titulo: l === 'en' ? altEn : altEs, imagen: 'images/Venjy.png', parrafos: [nombre[l] || nombre.es] }]
        }
    });

    // Cartel grande con el nombre bajo la cumbrera y letrero sobre la puerta
    portafolio.carteles.agregar({
        x: g.centro.x, y: g.centro.y, z: g.centro.z, ancho: 9, tamano: 34, color: '#ffff55', distancia: 40,
        texto: l => `${nombre[l] || nombre.es}\n${l === 'en' ? 'Full Stack Developer' : 'Desarrollador Full Stack'}`
    });
    portafolio.carteles.agregar({
        x: g.px + 0.5, y: y0 + 5.2, z: g.iz1 + 3, ancho: 4.5, tamano: 34, color: '#ffffff', distancia: 60,
        texto: zona
    });
}

export function registrarZonas(ctx) {
    const nombres = ctx.contenido.nombresZona();
    const c = { ...ctx, nombres };
    inicio(c);
    sobreMi(c);
    return { nombres };
}
