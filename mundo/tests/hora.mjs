// Prueba de la hora del mundo (7j-0): node mundo/tests/hora.mjs
import { readFileSync } from 'node:fs';
import { SEG_TOTAL, SEG_DIA, horaDe } from '../supervivencia/dia.js';
import { minutosDe, textoHora, textoDiaHora, textoMinutos, enTramo } from '../supervivencia/reloj.js';
import { HORARIOS } from '../supervivencia/horarios-datos.js';

let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLA:', m); } };
const leer = r => readFileSync(new URL(r, import.meta.url), 'utf8');

// El día de 10 min es un día de 24 h: 1 hora = 25 s de media
ok(SEG_TOTAL === 600 && SEG_TOTAL / 24 === 25, '600 s = 24 h → 25 s por hora');
ok(textoHora(0) === '06:00', 'amanecer = 06:00 (' + textoHora(0) + ')');
ok(textoHora(SEG_DIA / 2) === '12:00', 'mediodía = 12:00 (' + textoHora(SEG_DIA / 2) + ')');
ok(textoHora(SEG_DIA) === '18:00', 'atardecer = 18:00 (' + textoHora(SEG_DIA) + ')');
ok(textoHora(SEG_DIA + 120) === '00:00', 'medianoche = 00:00 (' + textoHora(SEG_DIA + 120) + ')');
ok(textoHora(SEG_TOTAL) === '06:00' && textoHora(-1) === textoHora(SEG_TOTAL - 1), 'da la vuelta');
// Coherente con el cielo y siempre válido
let prev = -1, sube = true;
for (let t = 0; t < SEG_TOTAL; t += 0.5) {
    const m = minutosDe(t);
    ok(m >= 0 && m < 1440 && /^\d\d:\d\d$/.test(textoHora(t)), 'formato HH:MM en t=' + t);
    ok(Math.abs(m - Math.round(horaDe(t) * 1440) % 1440) <= 1, 'sigue a horaDe en t=' + t);
    // monótona (salvo la vuelta de las 24 h)
    const rel = (m - 360 + 1440) % 1440;
    if (rel < prev) sube = false;
    prev = rel;
}
ok(sube, 'la hora solo avanza durante el día completo');
ok(textoDiaHora(2, 255, 'es') === 'Día 3 · 14:30', 'Día 3 · 14:30 (' + textoDiaHora(2, 255) + ')');
ok(textoDiaHora(0, 0, 'en') === 'Day 1 · 06:00', 'inglés');
ok(textoMinutos(480) === '08:00' && textoMinutos(1080) === '18:00', 'textoMinutos');
ok(enTramo(9, 8, 18) && !enTramo(18, 8, 18) && !enTramo(7.9, 8, 18), 'tramo normal');
ok(enTramo(23, 22, 6) && enTramo(3, 22, 6) && !enTramo(12, 22, 6), 'tramo que cruza la medianoche');

// Horarios: coinciden con el ancla de posiciones.json, tienen par ES/EN y horas válidas
const pos = JSON.parse(leer('../datos/posiciones.json')).personas;
const dial = JSON.parse(leer('../datos/dialogos.json')).temas;
for (const [k, hr] of Object.entries(HORARIOS)) {
    ok(pos[k] && pos[k].ancla === hr.ancla, `${k}: el lugar del horario es su ancla`);
    ok(dial[k], `${k}: tiene panel de Hablar`);
    ok(hr.de >= 0 && hr.a <= 24 && hr.de !== hr.a, `${k}: horas válidas`);
    ok(hr.lugar && hr.lugar.es && hr.lugar.en, `${k}: lugar ES/EN`);
    ok(!/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(hr.lugar.es + hr.lugar.en), `${k}: sin emojis`);
}
ok(Object.keys(HORARIOS).length === Object.keys(pos).length, 'cada persona con posición tiene horario');

// Cableado en el HTML y el código
const html = leer('../../supervivencia.html');
for (const id of ['hora', 'reloj-mano', 'pausa-hora', 'aj-hora']) ok(html.includes(`id="${id}"`), `HTML: #${id}`);
ok(/id="aj-hora"[\s\S]{0,120}data-es="[^"]+" data-en="[^"]+"/.test(html), 'aj-hora con par ES/EN');
const main = leer('../supervivencia/main.js');
ok(main.includes("O.RELOJ") && main.includes('textoDiaHora'), 'main.js usa el Reloj y la hora');
ok(/ajustes\s*=\s*\{[^}]*hora:\s*false/.test(main), 'el reloj del HUD arranca apagado');
ok(leer('../supervivencia/hablar.js').includes('HORARIOS[clave]'), 'hablar.js muestra el horario');
for (const f of ['mano.js', 'skin.js', 'coop.js', 'camaras.js']) ok(!leer('../supervivencia/' + f).includes('reloj.js'), `${f} intacto`);

if (fallos) { console.log(`${fallos} fallo(s)`); process.exit(1); }
console.log('hora.mjs: todo bien');
