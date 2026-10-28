// Prueba de la pestaña Recetas del Estudio (B6c): node mundo/tests/estudio-recetas.mjs
// Modelo puro (estudio/recetas-modelo.mjs), el puente en vivo y que la pestaña esté en la barra, la ayuda y estudio.js.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { O, nombreDe } from '../supervivencia/objetos.js';
import { B } from '../texturas.js';
import { buscarReceta, recetaDeDatos } from '../supervivencia/recetas.js';
import { parseCelda, textoCelda, formaAGrid, gridAForma, recetaNueva, faltaDeReceta, avisosReceta, limpiarReceta } from '../../estudio/recetas-modelo.mjs';
import { DATOS_VIVOS } from '../../estudio/puente-protocolo.js';
import { AYUDA } from '../../estudio/ayuda-modelo.mjs';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const idDe = n => { const k = String(n).toUpperCase(); return O[k] !== undefined ? O[k] : B[k]; };
const calc = { idDe, buscar: buscarReceta, nombreDe: id => nombreDe(id, 'es') };

ok(parseCelda(' Tronco ') === 'tronco' && JSON.stringify(parseCelda('tronco, tronco pino')) === '["tronco","tronco_pino"]' && parseCelda('') === '', 'parseCelda: uno, varios y vacío');
ok(textoCelda(['a', 'b']) === 'a, b' && textoCelda('a') === 'a' && textoCelda('') === '', 'textoCelda');

// grilla <-> forma
const g = new Array(9).fill('');
g[4] = 'arcilla'; g[5] = 'arcilla'; g[7] = 'palo';
const f = gridAForma(g);
ok(f.forma.join('|') === 'AA|B ' && f.ingredientes.A === 'arcilla' && f.ingredientes.B === 'palo', `gridAForma recorta y reparte letras (salió ${f && f.forma.join('|')})`);
ok(gridAForma(new Array(9).fill('')) === null, 'rejilla vacía = null');
const gr = formaAGrid(f);
ok(gr[0] === 'arcilla' && gr[1] === 'arcilla' && gr[3] === 'palo' && gr.filter(Boolean).length === 3, 'formaAGrid pone las casillas arriba a la izquierda');
const ida = gridAForma(formaAGrid(f));
ok(JSON.stringify(ida) === JSON.stringify(f), 'ida y vuelta de la rejilla');

// faltas y avisos
ok(faltaDeReceta(recetaNueva('forma')) === null && faltaDeReceta(recetaNueva('sin')) === null, 'las recetas vacías base están completas');
ok(faltaDeReceta({ forma: [], ingredientes: {}, da: ['pan', 1] }) !== null, 'rejilla vacía falta');
ok(faltaDeReceta({ sin: ['Pan'], da: ['pan', 1] }) !== null && faltaDeReceta({ sin: ['pan'], da: ['pan', 0] }) !== null, 'nombre o cantidad inválidos faltan');
ok(faltaDeReceta({ forma: ['AB'], ingredientes: { A: 'pan' }, da: ['pan', 1] }) !== null, 'letra sin ingrediente falta');
ok(avisosReceta({ forma: ['WW', 'WW'], ingredientes: { W: 'tablones' }, da: ['mesa', 1] }, calc).some(a => /Ya hay una receta igual/.test(a[0]) && /identical/.test(a[1])), 'avisa si el código ya tiene una igual');
ok(avisosReceta({ forma: ['AA', 'AA'], ingredientes: { A: 'arcilla' }, da: ['ladrillo', 4] }, calc).length === 0, 'una receta libre no avisa');
ok(avisosReceta({ sin: ['no_existe'], da: ['pan', 1] }, calc).some(a => /no existe/.test(a[0])), 'avisa si un objeto no existe');
// lo que se guarda lo acepta el juego
for (const r of [recetaNueva('forma'), recetaNueva('sin'), { forma: ['AA', 'AA'], ingredientes: { A: 'arcilla' }, da: ['ladrillo', 4], extra: 1 }]) ok(recetaDeDatos(limpiarReceta(r)) !== null && !('extra' in limpiarReceta(r)), 'limpiarReceta: lo acepta el juego, sin claves de más');

ok(DATOS_VIVOS.includes('recetas'), 'el puente aplica recetas en vivo');
const leer = (...p) => fs.readFileSync(path.join(RAIZ, ...p), 'utf8');
ok(/data-pestana="recetas"/.test(leer('estudio', 'index.html')) && /id="seccion-recetas"/.test(leer('estudio', 'index.html')), 'botón y sección de Recetas en index.html');
ok(/montarRecetas\(ctx\)/.test(leer('estudio', 'estudio.js')), 'estudio.js monta la pestaña Recetas');
ok(!!AYUDA.recetas, 'ayuda de la pestaña Recetas');
ok(/nombre === 'recetas'/.test(leer('estudio', 'puente-juego.js')) && /fijarRecetas/.test(leer('estudio', 'puente-juego.js')), 'puente-juego aplica recetas con fijarRecetas');

console.log(`estudio-recetas: ${fallos ? fallos + ' fallas' : 'OK'}`);
process.exit(fallos ? 1 : 0);
