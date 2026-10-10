// =========================================================
// VENJY · Estudio · avisos de textos ES/EN (estudio/DISENO.md §6, fase 3)
// Sin DOM ni Node: lo usan el editor de textos (navegador) y `cli.mjs validar` (Node).
// avisosDeTexto(t, glifos) -> [{ nivel, tipo, idioma?, texto }]
//   tipo: par (falta un idioma) · emoji · glifo (PixelCraft no lo tiene) · plantilla ({n} en un idioma y no en el otro) · largo
//   nivel: 'error' (rompe una regla del proyecto o pasa su `max`) o 'aviso' (conviene mirarlo).
// `glifos` es [[desde, hasta], ...] (estudio/glifos.json); sin él no se revisan glifos.
// =========================================================
export const IDIOMAS = ['es', 'en'];
// Un globo de «Hablar» se lee bien hasta ~140 caracteres (hoy el más largo mide 132). Sin `max` propio, pasarse es solo un aviso.
export const LARGO_GLOBO = 140;
const EMOJI = /\p{Extended_Pictographic}/u;
const PLANTILLA = /\{(\w+)\}/g;

export const tieneGlifo = (rangos, cp) => {
    let a = 0, z = rangos.length - 1;
    while (a <= z) {
        const m = (a + z) >> 1, [d, h] = rangos[m];
        if (cp < d) z = m - 1; else if (cp > h) a = m + 1; else return true;
    }
    return false;
};

// Caracteres de `s` que la fuente no tiene (sin repetir). Salto de línea y tabulación no cuentan.
export function glifosFaltantes(s, rangos) {
    const faltan = new Set();
    for (const c of s) {
        const cp = c.codePointAt(0);
        if (cp === 10 || cp === 9 || EMOJI.test(c)) continue; // el emoji ya tiene su propio aviso
        if (!tieneGlifo(rangos, cp)) faltan.add(c);
    }
    return [...faltan];
}

export function variables(s) {
    return new Set([...String(s).matchAll(PLANTILLA)].map(m => m[1]));
}

export function avisosDeTexto(t, glifos) {
    const salida = [];
    if (!t || typeof t !== 'object') return salida;
    const vacios = IDIOMAS.filter(i => typeof t[i] !== 'string' || !t[i].trim());
    for (const i of vacios) salida.push({ nivel: 'error', tipo: 'par', idioma: i, texto: `falta el texto en ${i.toUpperCase()}` });
    for (const i of IDIOMAS) {
        const s = t[i];
        if (typeof s !== 'string' || !s) continue;
        if (EMOJI.test(s)) salida.push({ nivel: 'error', tipo: 'emoji', idioma: i, texto: `emoji en ${i.toUpperCase()} (los íconos se dibujan, no se escriben)` });
        if (glifos) {
            const f = glifosFaltantes(s, glifos);
            if (f.length) salida.push({ nivel: 'error', tipo: 'glifo', idioma: i, texto: `PixelCraft no tiene ${f.map(c => `«${c}» (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(', ')} en ${i.toUpperCase()}` });
        }
        if (Number.isInteger(t.max)) {
            if (s.length > t.max) salida.push({ nivel: 'error', tipo: 'largo', idioma: i, texto: `${s.length} caracteres en ${i.toUpperCase()}, el máximo es ${t.max}` });
        } else if (s.length > LARGO_GLOBO) {
            salida.push({ nivel: 'aviso', tipo: 'largo', idioma: i, texto: `${s.length} caracteres en ${i.toUpperCase()}: largo para un globo (más de ${LARGO_GLOBO})` });
        }
    }
    if (!vacios.length) {
        const a = variables(t.es), b = variables(t.en);
        const soloEs = [...a].filter(v => !b.has(v)), soloEn = [...b].filter(v => !a.has(v));
        if (soloEs.length) salida.push({ nivel: 'error', tipo: 'plantilla', idioma: 'en', texto: `{${soloEs.join('}, {')}} está en ES y no en EN` });
        if (soloEn.length) salida.push({ nivel: 'error', tipo: 'plantilla', idioma: 'es', texto: `{${soloEn.join('}, {')}} está en EN y no en ES` });
    }
    return salida;
}

// ¿Es un par de texto? (objeto con es y en como cadenas, aunque estén vacías)
export const esPar = v => v !== null && typeof v === 'object' && !Array.isArray(v) && typeof v.es === 'string' && typeof v.en === 'string';
