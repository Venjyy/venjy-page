// =========================================================
// Pestaña Píxeles del Estudio: formato de los dibujos (mundo/datos/pixeles.js), íconos de iconos.json en
// iconos.js, arte de cartas-arte.json en cartas-arte.js, plantillas de cartas nuevas, esquemas y puente.
// Sin canvas: todo con los búferes puros.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, readdirSync } from 'fs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const P = await importar('mundo/datos/pixeles.js');
const I = await importar('mundo/supervivencia/iconos.js');
const { O } = await importar('mundo/supervivencia/objetos.js');
const { CARTAS } = await importar('mundo/supervivencia/cartas-datos.js');
const A = await importar('mundo/supervivencia/cartas-arte.js');
const { validar } = await importar('estudio/validar.mjs');
const { DATOS_VIVOS } = await importar('estudio/puente-protocolo.js');
const ok = (cond, msg) => { if (!cond) throw new Error(`pixeles: ${msg}`); };
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- Formato ----------
const chico = [[255, 0, 0], null, [0, 255, 0], [255, 0, 0]];
const d1 = P.codificar(chico, 2, 2);
ok(igual(d1, { paleta: ['#ff0000', '#00ff00'], filas: ['0.', '10'] }), 'codificar 2×2');
ok(igual(P.decodificar(d1, 2, 2), chico), 'decodificar 2×2');
ok(!P.revisarDibujo(d1, 2, 2).length, 'dibujo 2×2 sin errores');
// Más de 62 colores: dos caracteres por píxel
const muchos = Array.from({ length: 100 }, (_, i) => [i, 255 - i, (i * 7) % 256]);
const d2 = P.codificar(muchos, 10, 10);
ok(d2.filas[0].length === 20 && d2.paleta.length === 100, 'con 100 colores usa dos caracteres');
ok(igual(P.decodificar(d2, 10, 10), muchos) && !P.revisarDibujo(d2, 10, 10).length, 'ida y vuelta con 100 colores');
ok(P.revisarDibujo({ paleta: ['#000000'], filas: ['00', '0'] }, 2, 2).length === 1, 'fila corta = error');
ok(P.revisarDibujo({ paleta: ['#000000'], filas: ['01', '00'] }, 2, 2).length === 1, 'índice fuera de la paleta = error');
ok(P.revisarDibujo({ paleta: ['#000000'], filas: ['00'] }, 2, 2).length === 1, 'filas de menos = error');
ok(!P.listoParaJuego({ estado: 'borrador', ...d1 }, 2, 2) && P.listoParaJuego({ estado: 'hecho', ...d1 }, 2, 2), 'borrador no va al juego; hecho sí');

// ---------- Íconos (iconos.json -> iconos.js) ----------
const codigoPalo = I.pixelesDeCodigo(O.PALO);
ok(igual(I.pixelesObjeto(O.PALO), codigoPalo), 'sin datos, el ícono es el del código');
const cruz = new Array(256).fill(null).map((_, i) => ((i % 16 === 8 || (i >> 4) === 8) ? [10, 20, 30] : null));
const v0 = I.versionDeIconos();
I.aplicarIconos({ version: 1, iconos: { palo: P.codificar(cruz, 16, 16) } });
ok(I.versionDeIconos() === v0 + 1, 'aplicarIconos sube la versión');
ok(igual(I.pixelesObjeto(O.PALO), cruz), 'el dibujo de iconos.json reemplaza al de PINTORES');
ok(igual(I.pixelesDeCodigo(O.PALO), codigoPalo), 'pixelesDeCodigo sigue dando el del código');
ok(igual(I.pixelesObjeto(O.CARBON), I.pixelesDeCodigo(O.CARBON)), 'los otros objetos no cambian');
I.aplicarIconos({ version: 1, iconos: { palo: { estado: 'borrador', ...P.codificar(cruz, 16, 16) } } });
ok(igual(I.pixelesObjeto(O.PALO), codigoPalo), 'un ícono en borrador no se usa');
I.aplicarIconos({ version: 1, iconos: { palo: { paleta: ['#000000'], filas: ['0'] } } });
ok(igual(I.pixelesObjeto(O.PALO), codigoPalo), 'un ícono mal formado no se usa');
// «Partir del dibujo actual»: copiar el del código deja el ícono idéntico
I.aplicarIconos({ version: 1, iconos: { palo: P.codificar(codigoPalo, 16, 16) } });
ok(igual(I.pixelesObjeto(O.PALO), codigoPalo), 'partir del dibujo del código da el mismo ícono');
I.aplicarIconos(null);

// ---------- Cartas (cartas-arte.json -> cartas-arte.js) ----------
const [RW, RH] = P.MEDIDAS.retrato, [CW, CH] = P.MEDIDAS.carta;
const zombi = A.dibujarCarta('zombi'), reverso = A.dibujarReverso();
// Copiar el retrato y el reverso del código deja las cartas idénticas (la viñeta se pone una sola vez)
const retratoZ = A.retratoDeCodigo('zombi');
ok(retratoZ.length === RW * RH && retratoZ.every(Boolean), 'retrato del código: 40×26 sin huecos');
const vA = A.versionDeArte();
A.aplicarArte({ version: 1, retratos: { zombi: P.codificar(retratoZ, RW, RH) }, reverso: P.codificar(A.reversoDeCodigo(), CW, CH) });
ok(A.versionDeArte() === vA + 1, 'aplicarArte sube la versión');
ok(igual([...A.dibujarCarta('zombi').d], [...zombi.d]), 'partir del retrato actual da la misma carta');
ok(igual([...A.dibujarReverso().d], [...reverso.d]), 'partir del reverso actual da el mismo reverso');
// Un retrato vacío deja ver el fondo de la familia; uno pintado cambia la carta
const rojo = new Array(RW * RH).fill(null); rojo[RW * 13 + 20] = [255, 0, 0];
A.aplicarArte({ version: 1, retratos: { zombi: P.codificar(rojo, RW, RH) } });
const conRojo = A.dibujarCarta('zombi');
const en = (L, x, y) => { const i = (y * L.w + x) * 4; return [L.d[i], L.d[i + 1], L.d[i + 2]]; };
const [zx, zy] = A.ZONAS.retrato;
ok(igual(en(conRojo, zx + 1 + 20, zy + 1 + 13), [255, 0, 0]), 'el píxel pintado aparece en la carta');
ok(!igual([...conRojo.d], [...zombi.d]), 'el retrato propio cambia la carta');
ok(igual([...A.dibujarCarta('esqueleto').d], [...A.dibujarCarta('esqueleto').d]), 'las otras cartas siguen iguales cada vez');
A.aplicarArte({ version: 1, retratos: { zombi: { estado: 'borrador', ...P.codificar(rojo, RW, RH) } } });
ok(igual([...A.dibujarCarta('zombi').d], [...zombi.d]), 'un retrato en borrador no se usa');
// Colores del marco por familia
A.aplicarArte({ version: 1, marcos: { monstruo: { claro: '#123456' } } });
ok(igual(en(A.dibujarCarta('zombi'), 5, 1), [0x12, 0x34, 0x56]), 'el color del marco del JSON se usa (bisel claro)');
A.aplicarArte({ version: 1, marcos: { monstruo: { base: '#204060' } } });
ok(!igual([...A.dibujarCarta('zombi').d], [...zombi.d]), 'la base del marco del JSON cambia la carta');
A.aplicarArte(null);
ok(igual([...A.dibujarCarta('zombi').d], [...zombi.d]), 'sin datos, todo vuelve al código');

// ---------- Plantillas de cartas nuevas ----------
for (const pl of A.PLANTILLAS) {
    const L = A.dibujarPlantilla(pl);
    ok(L && L.w === CW && L.h === CH, `plantilla ${pl}: 50×76`);
    const conBoceto = A.dibujarPlantilla(pl, rojo, 'nueva');
    ok(igual(en(conBoceto, zx + 1 + 20, zy + 1 + 13), [255, 0, 0]), `plantilla ${pl}: el boceto aparece en el retrato`);
}
ok(A.dibujarPlantilla('no-existe') === null, 'plantilla desconocida = null');

// ---------- Esquemas ----------
const dib = P.codificar(cruz, 16, 16);
ok(!validar({ version: 1, iconos: { palo: dib } }, 'iconos').length, 'iconos.json válido');
ok(validar({ version: 1, iconos: { Palo: dib } }, 'iconos').length > 0, 'clave de ícono en mayúscula = error');
ok(!validar({ version: 1, retratos: { zombi: P.codificar(rojo, RW, RH) }, marcos: { mito: { claro: '#aabbcc' } } }, 'cartas-arte').length, 'cartas-arte.json válido');
ok(validar({ version: 1, marcos: { dragon: { claro: '#aabbcc' } } }, 'cartas-arte').length > 0, 'familia desconocida = error');
const borradores = {
    version: 1,
    objetos: { linterna: { estado: 'borrador', nombre: { es: 'Linterna' }, que: 'Alumbra', receta: 'farol + hierro', fecha: '2026-10-13', dibujo: dib } },
    cartas: { golem: { estado: 'borrador', plantilla: 'monstruo', nombre: { es: 'Gólem', en: 'Golem' }, atk: 800, def: 900, efecto: { es: 'Al entrar, robas.' }, boceto: P.codificar(rojo, RW, RH) } }
};
ok(!validar(borradores, 'borradores').length, 'borradores.json válido');
ok(validar({ version: 1, cartas: { x: { estado: 'borrador', plantilla: 'dragon', nombre: { es: 'X' } } } }, 'borradores').length > 0, 'plantilla desconocida = error');
ok(validar({ version: 1, objetos: { x: { nombre: { es: 'X' } } } }, 'borradores').length > 0, 'borrador sin estado = error');
ok(!CARTAS.golem && !O.LINTERNA, 'las claves de prueba no existen en el juego');

// ---------- Puente y juego ----------
ok(DATOS_VIVOS.includes('iconos') && DATOS_VIVOS.includes('cartas-arte') && !DATOS_VIVOS.includes('borradores'), 'iconos y cartas-arte van en vivo; borradores no');
const indice = JSON.parse(readFileSync(resolve(raiz, 'mundo/datos/indice.json'), 'utf8'));
ok(indice.archivos.borradores && indice.archivos.borradores.lee === null, 'el juego no lee borradores.json');
for (const f of readdirSync(resolve(raiz, 'mundo/supervivencia'))) {
    if (!f.endsWith('.js')) continue;
    ok(!/cargarDatos\(['"]borradores['"]\)/.test(readFileSync(resolve(raiz, 'mundo/supervivencia', f), 'utf8')), `${f} no carga borradores.json`);
}

console.log('pixeles OK');
