// =========================================================
// VENJY · Zonas del portafolio dentro del mundo 3D
// Cada zona registra sus puntos de interés (cartel + panel) en el portafolio y devuelve los
// destinos de teletransporte con el nombre que ve el visitante.
// Los textos salen de index.html (contenido.js) y del CV (cv-datos.js).
// =========================================================
import { CV_PAGINAS, CV_PDF } from './cv-datos.js';

// Zona A · Sala del CV
function salaDelCV({ portafolio, terreno, contenido }) {
    const g = terreno.salaCV;
    const y0 = g.base + 1;
    const nombre = contenido.texto('.letrero-nombre'); // «Benjamín «Venjy» Flores», tal como está en index.html
    const idiomas = [
        { poi: g.atriles[0], clave: 'es', cartel: 'CV · Español', titulo: { es: 'CV · Español', en: 'CV · Spanish' }, boton: { es: 'Abrir el PDF', en: 'Open the PDF' } },
        { poi: g.atriles[1], clave: 'en', cartel: 'CV · English', titulo: { es: 'CV · Inglés', en: 'CV · English' }, boton: { es: 'Open the PDF', en: 'Open the PDF' } }
    ];
    for (const a of idiomas) {
        portafolio.agregarPOI({
            id: a.poi.id,
            x: a.poi.x + 0.5, y: y0 + 2.6, z: a.poi.z + 0.5,
            cartel: { texto: { es: a.cartel, en: a.cartel }, dy: 1.6, ancho: 3.2, tamano: 30, color: '#ffff55' },
            titulo: a.titulo,
            // Cada atril muestra siempre su idioma, sin importar el de la página
            paginas: () => CV_PAGINAS[a.clave],
            recurso: () => ({ url: CV_PDF[a.clave], etiqueta: a.boton })
        });
    }
    // Cartel grande con el nombre, colgado en el centro del salón
    portafolio.carteles.agregar({
        x: g.centro.x, y: g.centro.y + 0.5, z: g.centro.z,
        texto: l => `${nombre[l] || nombre.es}\n${l === 'en' ? 'Full Stack Developer' : 'Desarrollador Full Stack'}`,
        ancho: 9, tamano: 34, color: '#ffff55', distancia: 40
    });
    // Letrero sobre la puerta
    portafolio.carteles.agregar({
        x: g.x0 - 1.5, y: y0 + 4.2, z: g.puerta.z + 0.5,
        texto: { es: 'Sala del CV', en: 'CV Room' }, ancho: 4.5, tamano: 34, color: '#ffffff', distancia: 60
    });
    return [{
        clave: 'salacv',
        nombre: { es: 'Sala del CV', en: 'CV room' },
        x: g.x0 - 3 + 0.5, z: g.puerta.z + 0.5, y: y0, yaw: -Math.PI / 2
    }];
}

export function registrarZonas(ctx) {
    return [...salaDelCV(ctx)];
}
