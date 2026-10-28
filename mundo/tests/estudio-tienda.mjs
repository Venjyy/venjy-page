// Prueba de la pestaña Tienda del Estudio (Etapa B · B6): node mundo/tests/estudio-tienda.mjs
// Las reglas de precio como avisos (estudio/tienda-modelo.mjs), la limpieza de lo que se guarda, el puente en vivo
// y que la pestaña esté en la barra, en la ayuda y en el estudio.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { O } from '../supervivencia/objetos.js';
import { B } from '../texturas.js';
import { VAL_ESMERALDA, valor, suma } from '../supervivencia/tienda-valor.js';
import { avisosOferta, avisosCompra, limpiarTienda, ofertaValida, compraValida, pilaValida, resumenPilas, TEXTOS_CLAVES } from '../../estudio/tienda-modelo.mjs';
import { DATOS_VIVOS } from '../../estudio/puente-protocolo.js';
import { AYUDA } from '../../estudio/ayuda-modelo.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const idDe = n => { const k = String(n).toUpperCase(); return O[k] !== undefined ? O[k] : B[k]; };
const calc = { idDe, valor, suma, VAL_ESMERALDA };

// Avisos de oferta
ok(avisosOferta({ da: [['bacalao', 4]], pide: [['esmeralda', 1]] }, calc).length === 0, 'una oferta de la tienda de hoy no avisa');
ok(avisosOferta({ da: [['diamante', 8]], pide: [['esmeralda', 1]] }, calc).some(a => /Regala/.test(a[0]) && /gives away/.test(a[1])), 'avisa si regala (ES y EN)');
ok(avisosOferta({ da: [['pan', 1]], pide: [['pan', 2]] }, calc).some(a => /lo mismo/.test(a[0])), 'avisa si da y pide lo mismo');
ok(avisosOferta({ da: [['no_existe', 1]], pide: [['esmeralda', 1]] }, calc).some(a => /no existe/.test(a[0])), 'avisa si el objeto no existe');
ok(avisosOferta({ da: [], pide: [['esmeralda', 1]] }, calc).length === 1, 'avisa si falta un lado');
// Avisos de compra
ok(avisosCompra({ da: ['bacalao', 8], esm: 1 }, calc).length === 0, 'una compra de hoy no avisa');
ok(avisosCompra({ da: ['bacalao', 1], esm: 5 }, calc).some(a => /Paga de más/.test(a[0])), 'avisa si paga de más');
ok(avisosCompra({ da: ['no_existe', 1], esm: 1 }, calc).length === 1, 'avisa compra con objeto que no existe');

// Validez de lo que se guarda
ok(pilaValida(['pan', 2]) && !pilaValida(['Pan', 2]) && !pilaValida(['pan', 0]) && !pilaValida(['pan', 65]) && !pilaValida(['pan']), 'pilaValida: nombre en minúscula y 1 a 64');
ok(ofertaValida({ da: [['pan', 1]], pide: [['esmeralda', 1]] }) && !ofertaValida({ da: [], pide: [['esmeralda', 1]] }), 'ofertaValida');
ok(compraValida({ da: ['pan', 4], esm: 1 }) && !compraValida({ da: ['pan', 4], esm: 0 }) && !compraValida({ da: ['pan', 4] }), 'compraValida');

// Limpieza
ok(limpiarTienda({ ofertas: [], compra: [], textos: {} }) === null, 'limpiarTienda: sin nada = null');
const l = limpiarTienda({ ofertas: [{ da: [['pan', 1]], pide: [['esmeralda', 1]] }], textos: { saludo: { es: 'Hola', en: 'Hi', revisado: true }, compraOk: { es: 'solo es', en: '' }, otro: { es: 'a', en: 'b' } } });
ok(l && l.ofertas.length === 1 && l.textos.saludo.en === 'Hi' && !l.textos.compraOk && !l.textos.otro && !('revisado' in l.textos.saludo) && !l.compra, 'limpiarTienda: deja ofertas y textos con ES y EN, quita lo demás');
ok(TEXTOS_CLAVES.map(c => c[0]).join() === 'saludo,compraOk,ventaOk,noAlcanza', 'los cuatro textos que lee el juego');
ok(resumenPilas([['pan', 3], ['esmeralda', 1]], n => n) === '3 pan + 1 esmeralda', 'resumenPilas');

// Puente y barra
ok(DATOS_VIVOS.includes('tienda'), 'el puente aplica tienda en vivo');
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');
ok(/data-pestana="tienda"/.test(leer('estudio', 'index.html')) && /id="seccion-tienda"/.test(leer('estudio', 'index.html')), 'botón y sección de Tienda en index.html');
ok(/montarTienda\(ctx\)/.test(leer('estudio', 'estudio.js')), 'estudio.js monta la pestaña Tienda');
ok(!!AYUDA.tienda, 'ayuda de la pestaña Tienda');
ok(/aplicar|fijarTienda/.test(leer('estudio', 'puente-juego.js')) && /nombre === 'tienda'/.test(leer('estudio', 'puente-juego.js')), 'puente-juego aplica tienda con fijarTienda');

console.log(`estudio-tienda: ${fallos ? fallos + ' fallas' : 'OK'}`);
process.exit(fallos ? 1 : 0);
