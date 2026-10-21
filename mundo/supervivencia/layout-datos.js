// =========================================================
// VENJY · Supervivencia · layout táctil desde mundo/datos/ui-layout.json
// aplicarLayout(datos) escribe un <style id="layout-datos"> solo con las claves presentes; lo que falta
// sigue con el CSS de tactil.css y supervivencia.css. Esquema: estudio/esquemas/ui-layout.schema.json.
// Páginas del archivo: supervivencia (la capa táctil de siempre) y arena (combate/tactil-arena.js, bloque 8 · N4);
// cada una con su <style> y su clase en el body, así conviven.
// =========================================================
export const SELECTORES = {
    joy: '.tactil-joy',
    saltar: '.tactil-saltar',
    bajar: '.tactil-bajar',
    pausa: '.tactil-pausa',
    pantalla: '.tactil-pantalla',
    'sv-romper': '.tactil-boton.sv-romper',
    'sv-usar': '.tactil-boton.sv-usar',
    'sv-inventario': '.tactil-boton.sv-inventario',
    'sv-soltar': '.tactil-boton.sv-soltar',
    'sv-camara': '.tactil-boton.sv-camara',
    'sv-comando': '.tactil-boton.sv-comando',
    'sv-acariciar': '.tactil-boton.sv-acariciar',
    'sv-gestos': '.tactil-boton.sv-gestos',
    mision: '#hud .mision-activa',
    minimapa: '#hud .mm-pequeno',
    coords: '#coords',
    fps: '#fps',
    hora: '#hora'
};
// Botones de la arena del combate (combate/tactil-arena.js y tactil-arena.css)
export const SELECTORES_ARENA = {
    'ar-atacar': '.tactil-arena .ar-atacar',
    'ar-defensa': '.tactil-arena .ar-defensa',
    'ar-saltar': '.tactil-arena .ar-saltar',
    'ar-agarre': '.tactil-arena .ar-agarre',
    'ar-especial': '.tactil-arena .ar-especial'
};
export const SELECTORES_SALONAS = {
    'traste-0': '.sl-trastes button:nth-child(1)',
    'traste-1': '.sl-trastes button:nth-child(2)',
    'traste-2': '.sl-trastes button:nth-child(3)',
    'traste-3': '.sl-trastes button:nth-child(4)',
    pausa: '.sl-pausaT',
    primus: '.sl-primusT'
};
export const PAGINAS_LAYOUT = {
    supervivencia: { selectores: SELECTORES, clase: 'layout-datos', estilo: 'layout-datos' },
    arena: { selectores: SELECTORES_ARENA, clase: 'layout-datos-arena', estilo: 'layout-datos-arena' },
    salonas: { selectores: SELECTORES_SALONAS, clase: 'layout-datos-salonas', estilo: 'layout-datos-salonas' }
};
// pausa y pantalla: mundo/mundo.css fija su posición con !important (bajan bajo el minimapa); el layout tiene que ganarle
const IMPORTANTES = new Set(['pausa', 'pantalla']);
// coords, fps y hora van uno bajo otro dentro de .datos (flex, mundo/mundo.css): para moverlos solos se sacan del flujo.
// position:fixed mide desde la pantalla, lo mismo que #hud (fixed, inset 0), que es desde donde mide el Estudio.
export const TEXTOS_HUD = new Set(['coords', 'fps', 'hora']);
// display al «des-ocultar» (oculto:false en baja cuando normal lo oculta)
const VISIBLE = { joy: 'block', mision: 'flex' };
const LADOS = { si: ['left', 'top'], sd: ['right', 'top'], ii: ['left', 'bottom'], id: ['right', 'bottom'] };

const num = v => typeof v === 'number' && Number.isFinite(v);
const px = v => `${Math.round(v * 1000) / 1000}px`;

// Distancia al borde `lado`: suma la zona segura de ese lado salvo seguro:false; desde:pie parte de --pie (que ya la incluye).
function medida(valor, lado, seguro, desdePie) {
    if (desdePie) return `calc(var(--pie) + ${px(valor)})`; // --pie ya trae la zona segura de abajo
    if (!seguro) return px(valor);
    return `calc(${px(valor)} + env(safe-area-inset-${lado}, 0px))`;
}

// Reglas de un botón. `b` es lo escrito en este perfil; `completo` es el botón con la ancla ya heredada.
function reglasBoton(clave, b, completo, pag) {
    const d = [];
    const lados = LADOS[completo.ancla];
    if (lados) {
        const [h, v] = lados;
        const seguro = completo.seguro !== false;
        const pie = completo.desde === 'pie' && v === 'bottom';
        const cambiaAncla = typeof b.ancla === 'string';
        const imp = IMPORTANTES.has(clave) ? ' !important' : '';
        if ((num(b.x) || cambiaAncla) && num(completo.x)) {
            d.push(`${h}:${medida(completo.x, h, seguro, false)}${imp}`, `${h === 'left' ? 'right' : 'left'}:auto${imp}`);
        }
        if ((num(b.y) || cambiaAncla || typeof b.desde === 'string') && num(completo.y)) {
            d.push(`${v}:${medida(completo.y, v, seguro, pie)}${imp}`, `${v === 'top' ? 'bottom' : 'top'}:auto${imp}`);
        }
        if (TEXTOS_HUD.has(clave) && d.length) d.unshift('position:fixed');
    }
    if (num(b.w)) d.push(`width:${px(b.w)}`);
    if (num(b.h)) d.push(`height:${px(b.h)}`);
    if (num(b.letra)) d.push(`font-size:${b.letra}rem`);
    if (b.oculto === true) d.push('display:none');
    else if (b.oculto === false && completo.oculto !== undefined) d.push(`display:${VISIBLE[clave] || 'flex'}`);
    const BASE = `body.con-tactil.${pag.clase}`;
    const reglas = d.length ? [`${BASE} ${pag.selectores[clave]}{${d.join(';')}}`] : [];
    if (clave === 'joy' && num(b.palanca)) {
        reglas.push(`${BASE} .tactil-joy-palanca{width:${px(b.palanca)};height:${px(b.palanca)};margin:${px(-b.palanca / 2)} 0 0 ${px(-b.palanca / 2)}}`);
    }
    return reglas;
}

function reglasPerfil(perfil, normal, esBaja, pag) {
    const reglas = [];
    const p = perfil || {};
    // En baja la zona segura de abajo no se suma (como en supervivencia.css): si normal fija pie y baja no, baja repite el de normal.
    const pie = num(p.pie) ? p.pie : esBaja && normal && num(normal.pie) ? normal.pie : null;
    if (pie !== null) {
        const seguro = esBaja ? '' : ' + env(safe-area-inset-bottom, 0px)';
        reglas.push(`body.con-tactil.${pag.clase}{--pie:calc(var(--casilla) + ${px(pie)}${seguro})}`);
    }
    const botones = p.botones || {};
    const botonesNormal = (normal && normal.botones) || {};
    for (const clave of Object.keys(pag.selectores)) {
        const b = botones[clave];
        if (!b || typeof b !== 'object') continue;
        const completo = esBaja ? { ...(botonesNormal[clave] || {}), ...b } : b;
        reglas.push(...reglasBoton(clave, b, completo, pag));
    }
    return reglas;
}

// Texto CSS de una página del archivo (datos.supervivencia); '' si no hay nada que escribir.
export function cssLayout(datos, pagina = 'supervivencia') {
    const pant = datos && datos[pagina];
    const pag = PAGINAS_LAYOUT[pagina];
    if (!pag || !pant || typeof pant !== 'object') return '';
    const partes = reglasPerfil(pant.normal, null, false, pag);
    const baja = reglasPerfil(pant.baja, pant.normal, true, pag);
    if (baja.length) partes.push(`@media (max-height:460px){${baja.join('\n')}}`);
    return partes.join('\n');
}

export function aplicarLayout(datos, pagina = 'supervivencia') {
    const pag = PAGINAS_LAYOUT[pagina];
    if (!pag) return;
    let estilo = document.getElementById(pag.estilo);
    const css = cssLayout(datos, pagina);
    if (!css) {
        if (estilo) estilo.remove();
        document.body.classList.remove(pag.clase);
        return;
    }
    if (!estilo) {
        estilo = document.createElement('style');
        estilo.id = pag.estilo;
        document.head.appendChild(estilo);
    }
    estilo.textContent = css;
    document.body.classList.add(pag.clase);
}
