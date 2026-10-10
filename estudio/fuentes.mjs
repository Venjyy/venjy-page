// =========================================================
// VENJY · Estudio · fuentes JS que el CLI resume sin migrarlas (estudio/DISENO.md §7)
// Cada fuente exporta: archivo (para el KB), cargar() -> { resumen, filas(filtro) }.
// filas devuelve [{ clave, texto, extra? }] y filtra por clave o prefijo.
// `dialogos` ya no es una fuente JS: desde la fase 3 vive en mundo/datos/dialogos.json (lo resume cli.mjs).
// =========================================================
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ruta = rel => fileURLToPath(new URL('../' + rel, import.meta.url));
const kb = rel => Math.round(statSync(ruta(rel)).size / 1024);
const importar = rel => import(new URL('../' + rel, import.meta.url).href);
const coincide = (clave, filtro) => !filtro || clave === filtro || clave.startsWith(filtro + '.') || clave.startsWith(filtro);
const lado = (t, idioma) => (idioma === 'ambos' ? `${t.es} | ${t.en}` : t[idioma] || t.es);

export const FUENTES = {
    tienda: {
        archivo: 'mundo/supervivencia/tienda-datos.js',
        async cargar() {
            const { TIENDAS } = await importar(this.archivo);
            const { nombreDe } = await importar('mundo/supervivencia/objetos.js');
            const nom = id => { try { return nombreDe(id); } catch (e) { return String(id); } };
            const cosas = lista => lista.map(([id, n]) => `${n} ${nom(id)}`).join(' + ');
            let ofertas = 0;
            for (const t of Object.values(TIENDAS)) ofertas += (t.ofertas || []).length;
            return {
                resumen: `${Object.keys(TIENDAS).length} tiendas, ${ofertas} ofertas (tienda-datos.js, ${kb(this.archivo)} KB)`,
                filas: (filtro, { idioma }) => {
                    const filas = [];
                    for (const [persona, t] of Object.entries(TIENDAS)) {
                        (t.ofertas || []).forEach((o, i) => {
                            const clave = `${persona}.oferta${i + 1}`;
                            if (coincide(clave, filtro)) filas.push({ clave, texto: `da ${cosas(o.da)} por ${cosas(o.pide)}`, extra: o.req ? `[req ${o.req}]` : '' });
                        });
                        (t.compra || []).forEach((c, i) => {
                            const clave = `${persona}.compra${i + 1}`;
                            if (coincide(clave, filtro)) filas.push({ clave, texto: `recibe ${c.da[1]} ${nom(c.da[0])} y paga ${c.esm} esmeralda(s)`, extra: '' });
                        });
                        const clave = `${persona}.saludo`;
                        if (t.saludo && coincide(clave, filtro)) filas.push({ clave, texto: lado(t.saludo, idioma), extra: '' });
                    }
                    return filas;
                }
            };
        }
    },

    amistad: {
        archivo: 'mundo/supervivencia/escena-amistad-datos.js',
        async cargar() {
            const { ANIMACIONES, FRASES_AMISTAD } = await importar(this.archivo);
            let frases = 0;
            for (const f of Object.values(FRASES_AMISTAD)) frases += Object.keys(f).length;
            return {
                resumen: `${Object.keys(ANIMACIONES).length} animaciones, ${frases} frases (escena-amistad-datos.js, ${kb(this.archivo)} KB)`,
                filas: (filtro, { idioma }) => {
                    const filas = [];
                    for (const [k, a] of Object.entries(ANIMACIONES)) {
                        const clave = `anim.${k}`;
                        if (!coincide(clave, filtro)) continue;
                        const pista = Object.entries(a.pista || {}).map(([quien, tramos]) => `${quien}: ${tramos.map(([g, d, h]) => `${g} ${d}-${h}`).join(', ')}`).join(' | ');
                        const golpes = a.golpes ? ` golpes ${a.golpes.join(',')}` : '';
                        const cor = a.corazones ? ` corazones ${a.corazones.join(',')}` : '';
                        filas.push({ clave, texto: `nivel ${a.nivel} T ${a.T} r ${a.r} linea ${a.linea.join('+')}${golpes}${cor}`, extra: pista });
                    }
                    for (const [persona, mapa] of Object.entries(FRASES_AMISTAD)) {
                        for (const [anim, t] of Object.entries(mapa)) {
                            const clave = `${persona}.${anim}`;
                            if (coincide(clave, filtro)) filas.push({ clave, texto: lado(t, idioma), extra: '' });
                        }
                    }
                    return filas;
                }
            };
        }
    }
};
