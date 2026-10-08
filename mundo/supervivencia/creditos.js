// =========================================================
// VENJY · Supervivencia · Créditos
// Al hundir el Caleuche: los amigos que ayudaste, Venjy y un «gracias por jugar» que suben
// lentamente, como el final de Minecraft. Se puede seguir jugando.
// =========================================================
const TXT = {
    es: { titulo: 'El Caleuche se hundió para siempre', sub: 'El mundo de Venjy está a salvo.', amigos: 'Amigos', gracias: 'Gracias por jugar', hecho: 'Hecho bloque por bloque en Chile por Venjy (Benjamín Flores)', seguir: 'Seguir jugando',
        roles: { Pony: 'pescador del muelle', Salonas: 'bajo y amplificador', Lona: 'guardiana de las gatas', Hadad: 'jefe de la fogata', Andy: 'bailes de victoria', Nacho: 'maestro parrillero', 'Moisés': 'arquitecto del iglú', Lalo: 'cazuela del sur', Boris: 'leñador', Lucho: 'puntería', Braulio: 'explorador de la orilla', Conejeros: 'primera fila', 'Mila y Gala': 'supervisoras de todo' } },
    en: { titulo: 'The Caleuche sank forever', sub: "Venjy's world is safe.", amigos: 'Friends', gracias: 'Thanks for playing', hecho: 'Built block by block in Chile by Venjy (Benjamín Flores)', seguir: 'Keep playing',
        roles: { Pony: 'dock fisherman', Salonas: 'bass and amp', Lona: 'keeper of the cats', Hadad: 'campfire chief', Andy: 'victory dances', Nacho: 'grill master', 'Moisés': 'igloo architect', Lalo: 'southern stew', Boris: 'woodcutter', Lucho: 'aim', Braulio: 'shore explorer', Conejeros: 'front row', 'Mila y Gala': 'supervisors of everything' } }
};

export function mostrarCreditos({ idioma = 'es', alCerrar }) {
    const t = TXT[idioma] || TXT.es;
    const el = document.createElement('section');
    el.className = 'creditos';
    const rollo = document.createElement('div');
    rollo.className = 'rollo';
    const h = document.createElement('h1'); h.textContent = t.titulo;
    const p = document.createElement('p'); p.textContent = t.sub;
    const h2 = document.createElement('h2'); h2.textContent = t.amigos;
    const ul = document.createElement('ul');
    for (const [n, r] of Object.entries(t.roles)) { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = n; li.append(b, ' · ' + r); ul.appendChild(li); }
    const g = document.createElement('h2'); g.textContent = t.gracias;
    const f = document.createElement('p'); f.textContent = t.hecho;
    const contenido = document.createElement('div');
    contenido.className = 'contenido';
    contenido.append(h, p, h2, ul, g, f);
    rollo.appendChild(contenido);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'boton'; b.textContent = t.seguir;
    b.addEventListener('click', () => alCerrar && alCerrar());
    el.append(rollo, b);
    return el;
}
