// Generador único de Artifacts (receta en GUIA.md). Arma la página con el CSS de GUIA.md, la fuente PixelCraft,
// las capturas incrustadas y el filtro de la tabla. Para un trabajo nuevo solo se escribe un archivo de contenido
// (formato abajo; ejemplo real: contenido-6c1.mjs). Uso:
//   node .claude/artifacts/plantilla.mjs <contenido.mjs> <salida.html>      (desde la raíz del repo)
// Contenido (export default { ... }); todo texto es HTML ya escapado o texto simple (se escapa lo que va en atributos):
//   titulo (2-4 palabras), h1, estado, pr: { n, url }, meta,
//   hecho: [li], archivos: { nuevos: [ruta], cambiados: [ruta] }, revisar: [li],
//   decisiones: [[decisión, motivo, aRevisar?]],
//   secciones: [{ h2, html }]            (datos del sistema: tablas, matrices; se usa class="dos", "tabla", etc.)
//   medidas: { cols: ['', 'main', 'rama'], filas: [[celdas...]], como: 'cómo se midió' }  (celda '!texto' = mejor, en verde)
//   pruebas: [li], capturas: [{ h2, dir, items: [[archivo, pie]] }],
//   tabla: { h2, intro, cols: [..], grupos: { clave: nombre }, filas: [{ g: clave, celdas: [..] }], unidad: 'frases' }
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [CONT, SALIDA] = process.argv.slice(2);
const c = (await import(pathToFileURL(resolve(CONT)).href)).default;
const b64 = p => readFileSync(p).toString('base64');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const guia = readFileSync(new URL('./GUIA.md', import.meta.url), 'utf8');
const css = guia.match(/```css\r?\n([\s\S]*?)```/)[1].replace('url(data:font/ttf;base64,…)', `url(data:font/ttf;base64,${b64('font/pixelcraft.ttf')})`)
    + `.dialogos { max-height: 70vh; overflow: auto; } .dialogos td.largo { min-width: 240px; } .cuenta { color: var(--gris); }`;
const lista = l => `<ul>${l.map(x => `<li>${x}</li>`).join('')}</ul>`;
const sec = (h2, cuerpo) => `<section class="bloque"><h2>${h2}</h2>${cuerpo}</section>`;
const partes = [];
partes.push(`<section class="bloque"><h1>${c.h1}</h1><p>${c.estado}</p>${c.pr ? `<a class="pr" href="${esc(c.pr.url)}">Ver el PR #${c.pr.n} en GitHub</a>` : ''}<p class="meta">${c.meta}</p></section>`);
if (c.hecho) partes.push(sec('Qué se hizo', lista(c.hecho) + (c.archivos ? `<h3>Archivos</h3>${lista([...(c.archivos.nuevos || []).map(a => `<code>${a}</code> (nuevo)`), ...(c.archivos.cambiados || []).map(a => `<code>${a}</code>`)])}` : '')));
if (c.revisar) partes.push(sec('A revisar por ti', lista(c.revisar)));
if (c.decisiones) partes.push(sec('Decisiones y por qué', `<p class="meta">En rojo, las marcadas «a revisar por el dueño».</p>` + c.decisiones.map(([b, s, r]) => `<div class="decision${r ? ' rev' : ''}"><b>${b}${r ? ' <span class="etq">A revisar</span>' : ''}</b><span>${s}</span></div>`).join('')));
for (const s of c.secciones || []) partes.push(sec(s.h2, s.html));
if (c.medidas) {
    const m = c.medidas, td = x => (String(x).startsWith('!') ? `<td class="num mejor">${String(x).slice(1)}</td>` : `<td class="num">${x}</td>`);
    partes.push(sec('Medidas antes y después', `<div class="tabla"><table class="medidas"><thead><tr>${m.cols.map((x, i) => `<th${i ? ' class="num"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${m.filas.map(f => `<tr><td>${f[0]}</td>${f.slice(1).map(td).join('')}</tr>`).join('')}</tbody></table></div><p class="meta">${m.como}</p>`));
}
if (c.pruebas) partes.push(sec('Pruebas', lista(c.pruebas)));
for (const g of c.capturas || []) partes.push(sec(g.h2, `<div class="capturas">${g.items.map(([f, t]) => `<figure><img src="data:image/jpeg;base64,${b64(`${g.dir}/${f}`)}" alt="${esc(t)}" loading="lazy"><figcaption>${esc(t)}</figcaption></figure>`).join('')}</div>`));
let js = '';
if (c.tabla) {
    const t = c.tabla;
    const chips = ['todos', ...Object.keys(t.grupos)].map((k, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-g="${k}">${k === 'todos' ? 'Todos' : esc(t.grupos[k])}</button>`).join('');
    const filas = t.filas.map(f => `<tr data-g="${f.g}">${f.celdas.map((x, i) => `<td${i >= t.cols.length - 2 ? ' class="largo"' : ''}>${x}</td>`).join('')}</tr>`).join('');
    partes.push(sec(t.h2, `<p>${t.intro}</p><div class="chips">${chips}</div><p class="cuenta"><span id="n">${t.filas.length}</span> ${t.unidad || 'filas'}</p><div class="dialogos tabla"><table><thead><tr>${t.cols.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`));
    js = `<script>(()=>{const cs=[...document.querySelectorAll('.chip')],fs=[...document.querySelectorAll('.dialogos tbody tr')],n=document.getElementById('n');cs.forEach(b=>b.addEventListener('click',()=>{cs.forEach(x=>x.classList.toggle('on',x===b));let k=0;for(const f of fs){f.hidden=b.dataset.g!=='todos'&&f.dataset.g!==b.dataset.g;if(!f.hidden)k++;}n.textContent=k;}));})();</script>`;
}
const html = `<meta charset="utf-8"><title>${esc(c.titulo)}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><main>${partes.join('\n')}</main>${js}`;
if (/[\p{Extended_Pictographic}]/u.test(html.replace(/data:[^"')]+/g, ''))) throw new Error('Hay emojis en la página');
writeFileSync(SALIDA, html);
console.log(`${SALIDA}: ${(html.length / 1024).toFixed(0)} KB`);
