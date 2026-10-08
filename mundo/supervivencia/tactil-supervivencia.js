// =========================================================
// VENJY · Supervivencia · Controles táctiles
// Sobre el joystick y los botones de mundo/tactil.js: ROMPER (mantener; también golpea),
// USAR (poner, comer, abrir, hablar), INVENTARIO y SOLTAR. La barra rápida se toca para elegir.
// =========================================================
const TEXTOS = {
    es: { romper: 'ROMPER', usar: 'USAR', inventario: 'INV', soltar: 'SOLTAR', acariciar: 'ACARICIAR' },
    en: { romper: 'BREAK', usar: 'USE', inventario: 'INV', soltar: 'DROP', acariciar: 'PET' }
};

export function iniciarTactilSupervivencia({ tactil, minado, ventanas, inventario, idioma = 'es', camaras, consola, caricias }) {
    const t = TEXTOS[idioma] || TEXTOS.es;
    const botones = [
        tactil.agregarAccion('sv-romper', t.romper, () => minado.abajo(0), () => minado.arriba(0)),
        tactil.agregarAccion('sv-usar', t.usar, () => minado.abajo(2), () => minado.arriba(2)),
        tactil.agregarAccion('sv-inventario', t.inventario, () => ventanas.abrir('inventario')),
        tactil.agregarAccion('sv-soltar', t.soltar, () => minado.soltarEnMano(false)),
        tactil.agregarAccion('sv-camara', 'CAM', () => camaras && camaras.cambiarVista()),
        tactil.agregarAccion('sv-comando', '/', () => consola && consola.abrir('/'))
    ];
    for (const b of botones) b.hidden = false;
    // ACARICIAR aparece solo junto a una gata (caricias.js avisa cuando hay una al alcance)
    const acariciar = tactil.agregarAccion('sv-acariciar', t.acariciar, () => caricias && caricias.intentar());
    if (caricias) caricias.alCambiarCercania(cerca => { acariciar.hidden = !cerca; });
    document.body.classList.add('con-tactil');
    // Tocar una casilla de la barra rápida la elige
    const barra = document.getElementById('barra-rapida');
    barra.addEventListener('touchstart', e => {
        const c = e.target.closest('.casilla-rapida');
        if (!c) return;
        e.preventDefault();
        inventario.elegida = [...barra.children].indexOf(c);
    }, { passive: false });
    return { botones, acariciar };
}
