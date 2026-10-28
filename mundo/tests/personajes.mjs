// Prueba de personajes en datos (Etapa B · B5, estudio/DISENO.md §41): node mundo/tests/personajes.mjs
// Modelo puro (mundo/datos/personajes.js), registro en el juego (supervivencia/personajes.js), «Hablar» sumado
// (fusionarHablar), esquema, el personajes.json real y que el creativo no lo lea.
import { readFileSync } from 'node:fs';
import {
    PERSONAS_CODIGO, CLAVES_CODIGO, APARIENCIA_BASE, descriptorDe, aparienciaDe, claveDeNombre, personasNuevas, aparienciasCodigo,
    horarioDe, lugarDe, posturaDe, fusionarHablar, reglasPersonajes, hexARgb, rgbAHex
} from '../datos/personajes.js';
import { registrarPersonajes, idDeObjeto } from '../supervivencia/personajes.js';
import { NOMBRES_AMIGO } from '../supervivencia/misiones-datos.js';
import { PERSONAJES, FAVORITOS, relacion, inicialDe } from '../supervivencia/amistad.js';
import { HORARIOS } from '../supervivencia/horarios-datos.js';
import { fijarRutinas } from '../supervivencia/rutinas-datos.js';
import { validar } from '../../estudio/validar.mjs';

let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA:', m); } };
const leer = r => readFileSync(new URL(r, import.meta.url), 'utf8');
const t = (es, en) => ({ es, en });

// Una persona de prueba hecha solo con datos (no es nadie real: no va al personajes.json del juego)
const PRUEBA = {
    version: 1,
    personas: {
        tito: {
            nombre: 'Tito',
            apariencia: { piel: '#d0a080', pelo: { color: '#202020', estilo: 'rulos' }, ropa: { tipo: 'poleron', color: '#aa3030' }, lentes: true, escala: 1.05 },
            lugar: { ancla: 'molino', dx: 3, dz: -2, dy: 'suelo', giro: 90 },
            postura: 'brazos cruzados',
            horario: { de: 9, a: 17 },
            globo: '#aa3030',
            frases: [t('El molino cruje cuando hay viento.', 'The windmill creaks when it is windy.')],
            hablar: {
                saludo: { bajo: t('Hola.', 'Hi.'), alto: t('¡Hola, amigo!', 'Hi, friend!') },
                temas: [{ id: 'quien', p: t('¿Quién eres?', 'Who are you?'), r: t('Tito, del molino.', 'Tito, from the windmill.') }],
                regalo: t('¡Pan fresco!', 'Fresh bread!')
            },
            regalo: ['PAN'],
            amigos: { venjy: 2, boris: 1 }
        },
        nube: { nombre: 'Nube', borrador: true },
        boris: { apariencia: { ropa: { color: '#2050a0' } } }
    }
};

// ---- Modelo puro ----
ok(rgbAHex(hexARgb('#0a10ff')) === '#0a10ff', 'hex ida y vuelta');
const d = descriptorDe(PRUEBA.personas.tito.apariencia);
ok(d.piel.join() === '208,160,128' && d.pelo.estilo === 'rulos' && d.ropa.tipo === 'poleron' && d.lentes && d.escala === 1.05, 'descriptorDe convierte y conserva');
ok(d.pantalon.join() === hexARgb(APARIENCIA_BASE.pantalon).join() && d.zapatillas === 'blancas', 'lo que falta sale de la base');
const borisCodigo = { nombre: 'Boris', piel: [162, 110, 72], pelo: { color: [24, 20, 20], estilo: 'corto' }, ojos: [40, 28, 22], ropa: { tipo: 'camisa cuadros', color: [176, 40, 36] }, pantalon: [58, 66, 92], zapatillas: 'botas' };
const b2 = descriptorDe(PRUEBA.personas.boris.apariencia, borisCodigo);
ok(b2.ropa.tipo === 'camisa cuadros' && b2.ropa.color.join() === '32,80,160' && b2.zapatillas === 'botas' && b2.piel.join() === '162,110,72', 'cambio de apariencia encima del código');
ok(JSON.stringify(descriptorDe(aparienciaDe(borisCodigo), borisCodigo).ropa) === JSON.stringify(borisCodigo.ropa), 'aparienciaDe ida y vuelta');
ok(descriptorDe({ gorro: '#123456' }).gorro.join() === '18,52,86' && !('gorro' in descriptorDe({ gorro: '' }, { ...borisCodigo, gorro: [1, 2, 3] })), 'gorro se pone y se quita');
ok(claveDeNombre('José Ñandú') === 'jose-nandu' && claveDeNombre('Boris', ['boris']) === 'boris-2' && /^[a-z]/.test(claveDeNombre('123')), 'claveDeNombre');
ok(personasNuevas(PRUEBA).map(p => p.clave).join() === 'tito', 'personasNuevas: sin borrador ni claves del código');
ok(Object.keys(aparienciasCodigo(PRUEBA)).join() === 'boris', 'aparienciasCodigo: solo los de amigos.js');
const h = horarioDe(PRUEBA.personas.tito);
ok(h.ancla === 'molino' && h.de === 9 && h.a === 17 && h.lugar.es === 'en el molino viejo', 'horarioDe');
ok(lugarDe({}).ancla === 'campamento' && lugarDe({}).dy === 'suelo' && posturaDe({ postura: 'bailando' }) === 'de pie', 'valores por defecto');

// ---- Reglas ----
const refs = { anclas: new Set(['molino', 'campamento', 'faro']), objeto: n => idDeObjeto(n) !== undefined, gestos: new Set(['risa']) };
const errores = reglasPersonajes(PRUEBA, refs).filter(r => r.tipo === 'error');
ok(errores.length === 0, 'la persona de prueba no tiene errores: ' + errores.map(e => e.texto).join(' | '));
const malo = { version: 1, personas: {
    x: { lugar: { ancla: 'luna', dx: 0, dz: 0 }, regalo: ['NADA_DE_NADA'], amigos: { fantasma: 2, x: 1, boris: 9 }, hablar: { temas: [{ id: 'a', p: t('?', '?'), r: t('.', '.') }, { id: 'a', p: t('?', '?'), r: t('.', '.') }] } },
    lalo: { nombre: 'Otro', apariencia: {} }, pony: { apariencia: {} }
} };
const rm = reglasPersonajes(malo, refs), txt = rm.map(r => r.tipo + ' ' + r.texto).join('\n');
for (const s of ['falta el nombre', '«luna» no es un lugar', 'NADA_DE_NADA', 'amigos.fantasma', 'sí mismo', 'amigos.boris: va de 0', '«a» está repetido']) ok(txt.includes(s), 'regla: ' + s);
ok(/aviso .*lalo: es del código/.test(txt) && /aviso .*pony: pony tiene la piel pintada/.test(txt), 'avisos de lo que se ignora');

// ---- Esquema ----
ok(validar(PRUEBA, 'personajes').length === 0, 'esquema: la prueba es válida: ' + validar(PRUEBA, 'personajes').join(' | '));
ok(validar({ version: 1, personas: { Mal: {} } }, 'personajes').length > 0, 'esquema: clave con mayúscula falla');
ok(validar({ version: 1, personas: { y: { postura: 'volando' } } }, 'personajes').length > 0, 'esquema: postura desconocida falla');

// ---- Registro en el juego ----
const colores = {};
const antesP = PERSONAJES.length;
ok(!NOMBRES_AMIGO.tito && relacion('venjy', 'tito') === 0, 'antes: tito no existe');
const claves = registrarPersonajes(PRUEBA, { colores });
ok(claves.join() === 'tito' && NOMBRES_AMIGO.tito === 'Tito' && colores.tito === '#aa3030', 'nombre y color del globo');
ok(PERSONAJES.includes('tito') && PERSONAJES.length === antesP + 1, 'entra a la lista de amistad');
ok(FAVORITOS.tito && FAVORITOS.tito[0] === idDeObjeto('PAN'), 'regalo favorito');
ok(relacion('venjy', 'tito') === 2 && relacion('tito', 'boris') === 1 && inicialDe('venjy', 'tito') === 35, 'relaciones y amistad inicial');
ok(HORARIOS.tito && HORARIOS.tito.de === 9 && HORARIOS.tito.ancla === 'molino', 'horario base');
fijarRutinas({ horarios: { tito: { de: 10 } } });
ok(HORARIOS.tito.de === 10 && HORARIOS.tito.a === 17, 'rutinas.json ajusta el horario de la persona nueva');
fijarRutinas({});
ok(HORARIOS.tito.de === 9, 'sin ajuste vuelve a su base');
ok(NOMBRES_AMIGO.boris === 'Boris', 'los del código no cambian');
// No pisa relaciones de la tabla
registrarPersonajes({ version: 1, personas: { tito: { nombre: 'Tito', amigos: { boris: 3 } }, otro: { nombre: 'Otro', amigos: { tito: 4 } } } }, { colores });
ok(relacion('venjy', 'tito') === 0 && relacion('tito', 'boris') === 3 && relacion('otro', 'tito') === 4, 'se rehace sin restos');
ok(relacion('boris', 'lucho') === 3, 'la tabla del código queda igual');
registrarPersonajes({ version: 1, personas: {} }, { colores });
ok(!NOMBRES_AMIGO.tito && !NOMBRES_AMIGO.otro && !PERSONAJES.includes('tito') && !FAVORITOS.tito && !HORARIOS.tito && relacion('tito', 'boris') === 0 && !colores.tito, 'vaciar deja todo como el código');
ok(PERSONAJES.length === antesP, 'la lista de amistad vuelve a su largo');

// ---- «Hablar» ----
const dialogos = JSON.parse(leer('../datos/dialogos.json'));
const f = fusionarHablar(dialogos, PRUEBA);
ok(f.temas.tito.length === 1 && f.saludos.tito.alto.es === '¡Hola, amigo!' && f.regalos.tito.es === '¡Pan fresco!', 'suma el «Hablar» de la persona nueva');
ok(f.temas.boris === dialogos.temas.boris && !f.temas.nube, 'no toca a los del código ni a los borradores');
const ya = fusionarHablar({ ...dialogos, temas: { ...dialogos.temas, tito: [] } }, PRUEBA);
ok(ya.temas.tito.length === 0, 'si dialogos.json ya trae a la persona, gana ese');
ok(fusionarHablar(dialogos, { version: 1, personas: { sin: { nombre: 'Sin' } } }).saludos.sin.bajo.es === '¿Hola?', 'saludo por defecto');
const { TEMAS, aplicarPersonajes } = await import('../supervivencia/dialogos-datos.js');
aplicarPersonajes(PRUEBA);
ok(TEMAS.tito && TEMAS.tito[0].id === 'quien', 'dialogos-datos suma en vivo');
aplicarPersonajes(null);
ok(!TEMAS.tito && TEMAS.boris, 'y lo quita');

// ---- El archivo real ----
const real = JSON.parse(leer('../datos/personajes.json'));
ok(validar(real, 'personajes').length === 0, 'personajes.json cumple su esquema');
const er = reglasPersonajes(real, refs).filter(r => r.tipo === 'error' && !r.texto.includes('no es un lugar'));
ok(er.length === 0, 'personajes.json sin errores: ' + er.map(e => e.texto).join(' | '));
for (const k of Object.keys(real.personas)) if (CLAVES_CODIGO.includes(k)) ok(Object.keys(real.personas[k]).every(c => ['apariencia', 'borrador', 'nota'].includes(c)), `${k}: del código, solo apariencia`);

// ---- Coherencia con el código ----
const amigos = leer('../criaturas/amigos.js');
const bloque = (amigos.match(/export const PERSONAS = \{([\s\S]*?)\r?\n\};/) || [])[1] || '';
const enAmigos = [...bloque.matchAll(/^ {4}([a-z0-9_]+): \{/gm)].map(m => m[1]);
ok(enAmigos.join() === PERSONAS_CODIGO.join(), 'PERSONAS_CODIGO = PERSONAS de amigos.js');
ok([...CLAVES_CODIGO].sort().join() === [...PERSONAJES].sort().join(), 'CLAVES_CODIGO = PERSONAJES de amistad.js');
ok(/personajes = null \}\) \{/.test(amigos) && amigos.includes('const cambios = personajes ?'), 'amigos.js solo lee personajes si se lo pasan');
ok(!leer('../main.js').includes('personajes'), 'el creativo (mundo/main.js) no lo pasa');
const sup = leer('../supervivencia/main.js');
ok(sup.includes("cargarDatos('personajes')") && sup.includes('crearPersonajes(datosPersonajes'), 'la supervivencia lo carga y crea a las personas');
const indice = JSON.parse(leer('../datos/indice.json'));
ok(indice.archivos.personajes && indice.archivos.personajes.lee, 'indice.json: personajes lo lee el juego');
ok(leer('../../estudio/puente-protocolo.js').includes("'personajes'"), 'se aplica en vivo desde el Estudio');

if (fallos) { console.log(`${fallos} fallo(s)`); process.exit(1); }
console.log('personajes.mjs: todo bien');
