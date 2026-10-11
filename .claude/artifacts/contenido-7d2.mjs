// Contenido del Artifact del bloque 7d-2 (facilidades de misión) para plantilla.mjs; la tabla sale de FACILIDADES.
// Uso (desde la raíz del repo): node .claude/artifacts/plantilla.mjs .claude/artifacts/contenido-7d2.mjs <salida.html>
import { pathToFileURL } from 'node:url';
const imp = p => import(pathToFileURL(`${process.cwd()}/${p}`).href);
const F = await imp('mundo/supervivencia/facilidades-datos.js');
const tabla = (cab, f) => `<div class="tabla"><table><thead><tr>${cab.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${f}</tbody></table></div>`;
const txt = f => [
    f.pesca && 'Pesca: pez globo ×3, salmón ×1,5',
    f.pista && `Pista: ${f.pista.nombre.es}${f.pista.radio ? ` (hasta ${f.pista.radio} bloques)` : ''}`,
    f.noche && `Monstruo de noche: ${f.noche.mob}${f.noche.piso ? ' (en arena)' : ''}${f.noche.bosque ? ' (en bosque)' : ''}`,
    f.marcas && 'Lugares sin visitar con «?» en el minimapa'
].filter(Boolean).join(' · ');
const filas = Object.entries(F.FACILIDADES).map(([id, f]) => `<tr><td>${id}</td><td>${txt(f)}</td></tr>`).join('');

export default {
    titulo: 'Facilidades de misión 7d-2',
    h1: 'Bloque 7d-2 · Facilidades de misión',
    estado: 'PR abierto, sin mergear. Sin probar en navegador: marcas del minimapa, decorados en el mundo real y aparición de monstruos.',
    pr: { n: 61, url: 'https://github.com/Venjyy/venjy-page/pull/61' },
    meta: 'Rama <code>misiones-7d2</code> · 2026-10-11 · Sonnet',
    hecho: [
        '<b>Pesca</b> de pony2 con salmón ×1,5 y pez globo ×3 (<code>botinPesca</code>).',
        '<b>Animales</b>: 4 ovejas y 3 gallinas junto al escenario, 4 gallinas junto a la atalaya, al final de <code>animales.lista</code>.',
        '<b>Decorados una vez por mundo</b>: huerto de Lalo (9×5, un agua riega todo), horno en la gatera y parche de grava en la atalaya.',
        '<b>Pistas</b> de 8 misiones con <code>buscarSubsuelo</code>: marca en el minimapa y rumbo en el seguimiento.',
        '<b>Monstruo garantizado</b> por noche en 6 misiones (<code>enemigos.garantizar</code>) y «?» de braulio2.'
    ],
    archivos: {
        nuevos: ['mundo/supervivencia/facilidades-datos.js', 'mundo/supervivencia/facilidades.js', 'mundo/tests/facilidades.mjs', '.claude/artifacts/contenido-7d2.mjs'],
        cambiados: ['mundo/supervivencia/subsuelo.js', 'pesca.js', 'enemigos.js', 'misiones.js', 'main.js', 'mundo/criaturas/animales.js', 'mundo/minimapa.js', 'mundo/PENDIENTES.md', 'mundo/supervivencia/MAPA.md']
    },
    revisar: [
        '<b>Sin probar en navegador</b>: rombo, «?» y flecha de borde del minimapa; texto de la pista; decorados puestos; monstruo de la noche; animales nuevos.',
        '<b>Cooperativo sin probar</b>: el invitado no coloca decorados; no se tocó <code>coop.js</code>.',
        '<b>Sin brújula en la supervivencia</b>: la flecha va en el minimapa.'
    ],
    decisiones: [
        ['3 gallinas en el escenario y 4 en la atalaya; grava 5×5 en 2 capas (≈5 pedernales).', 'La tabla no daba cantidades.', true],
        ['1 monstruo por noche en todas las misiones.', 'braulio1 pide 10 huesos: con 1 sirve poco; <code>noche: { n }</code> lo sube.', true],
        ['Pista de arena (moises2) hasta 400 bloques.', 'El iglú está a 248 bloques de la orilla.', true],
        ['Cultivos del huerto a medio crecer.', 'Que lalo1 no espere minutos.', true]
    ],
    secciones: [{ h2: 'Facilidad por misión', html: tabla(['Misión', 'Facilidad'], filas) }],
    pruebas: [
        '<code>node mundo/tests/facilidades.mjs</code>: 273 comprobaciones; las pistas se validan contra <code>llenarSubsuelo</code> y fuerza bruta, y los planos contra el mapa real.',
        'Pasan todas las de <code>mundo/tests/</code> salvo las de navegador (sin Playwright).'
    ]
};
