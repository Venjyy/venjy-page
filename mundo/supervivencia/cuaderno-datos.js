// =========================================================
// VENJY · Supervivencia · Cuaderno de los Tomatitos (7f-3, parte 6) · textos y premio
// 12 páginas escondidas por el mapa (mundo/paginas-cuaderno.js decide dónde). El orden NO cambia: la
// página N siempre es la misma, caiga donde caiga. Los chistes salen de lo que ya cuentan los amigos
// en «Hablar» y en las escenas (mundo/DIALOGOS.md); todos en buena onda, sin inventar datos de nadie.
// BORRADOR: el dueño revisa estos textos en el PR (se editan aquí; `revisado` lo pone solo él).
// =========================================================
export const PAGINAS = [
    { t: { es: 'Reglas del cuaderno', en: 'Notebook rules' },
      x: { es: 'Regla 1: lo que se escribe aquí no se borra.\nRegla 2: el Pony no webea en los trabajos.\nRegla 3: ver regla 2.', en: "Rule 1: what is written here is never erased.\nRule 2: Pony does not mess around during group projects.\nRule 3: see rule 2." } },
    { t: { es: 'Acta del informe de la U', en: 'Uni report minutes' },
      x: { es: 'Informe entregado: sí.\nWebeo del Pony: toda la tarde.\nTrabajo de Andy y Nacho: el doble, por si acaso.\nRisa de Nacho: sin registro, no cabe en el acta.', en: 'Report handed in: yes.\nPony messing around: all afternoon.\nAndy and Nacho\'s work: doubled, just in case.\nNacho\'s laughter: not recorded, it does not fit in the minutes.' } },
    { t: { es: 'Estadísticas de Fortnite', en: 'Fortnite stats' },
      x: { es: 'Partidas jugadas: muchas.\nVictorias: pocas.\nBailes de victoria de Andy: los mismos de siempre, y con harta pasión.\nCero rencor.', en: 'Games played: a lot.\nVictories: few.\nAndy\'s victory dances: same as always, with plenty of passion.\nZero hard feelings.' } },
    { t: { es: 'Las papas fritas', en: 'The chips' },
      x: { es: 'Hadad es oficialmente la cara de las papas fritas de bolsa, gracias a una imagen de IA.\nEl Pony la sigue mandando al grupo. Cada semana. Sin falta.', en: 'Hadad is officially the face of bagged chips, thanks to an AI image.\nPony keeps sending it to the group chat. Every week. Without fail.' } },
    { t: { es: 'Doscientos stickers', en: 'Two hundred stickers' },
      x: { es: 'Stickers mandados al grupo hoy: 200.\nCulpable oficial: el Hadad.\nPrueba: todos son de él con papas fritas.', en: 'Stickers sent to the group chat today: 200.\nOfficial culprit: Hadad.\nEvidence: every single one is him with chips.' } },
    { t: { es: 'El caso de la estatura', en: 'The height case' },
      x: { es: 'El Pony dice que es más alto que Braulio.\nBraulio dice que mentira y pide una huincha.\nResultado: pendiente. Se acepta regla de verdad.', en: 'Pony says he is taller than Braulio.\nBraulio says that is false and asks for a tape measure.\nResult: pending. A real ruler is accepted.' } },
    { t: { es: 'El dedo doble', en: 'The double finger' },
      x: { es: 'Braulio lo muestra. Venjy se sorprende como si fuera la primera vez, cada vez.\nNacho no durmió esa noche. Se rió igual.', en: 'Braulio shows it off. Venjy is surprised as if it were the first time, every time.\nNacho did not sleep that night. He laughed anyway.' } },
    { t: { es: 'Tilted', en: 'Tilted' },
      x: { es: 'Nacho cae en Tilted aunque le digan que no.\nRegistro de la caída: se ríe antes, durante y después.', en: 'Nacho lands at Tilted even when told not to.\nLanding log: he laughs before, during and after.' } },
    { t: { es: 'Modo .exe', en: '.exe mode' },
      x: { es: 'Conejeros: modo normal o modo .exe. Por ahora, normal.\nTomás es un tomate, pero con sentimientos.\nSu enemigo oficial es el Pony: se juntan todas las semanas y comparten el queque.', en: 'Conejeros: normal mode or .exe mode. For now, normal.\nTomás is a tomato, but with feelings.\nHis official enemy is Pony: they meet every week and share the cake.' } },
    { t: { es: 'Cosas de la playa', en: 'Beach stuff' },
      x: { es: 'Braulio llega siempre con alguna cosa rara de la playa: huesos, botellas, una concha que suena a mar.\nEs de Arica, aunque nadie le cree por lo blanco.', en: 'Braulio always shows up with some odd thing from the beach: bones, bottles, a shell that sounds like the sea.\nHe is from Arica, though nobody believes it because of how pale he is.' } },
    { t: { es: 'Dormidos en el Discord', en: 'Asleep on Discord' },
      x: { es: 'Discord hasta tarde: todos.\nDormido en la llamada: Nacho.\nImitaciones de sus ronquidos: Andy.\nAplausos: el resto del Discord.', en: 'On Discord until late: everyone.\nAsleep on the call: Nacho.\nImpressions of his snoring: Andy.\nApplause: the rest of the Discord.' } },
    { t: { es: 'Por los Tomatitos', en: 'To the Tomatitos' },
      x: { es: 'Venjy, Pony, Hadad, Andy, Nacho, Braulio y Conejeros.\nNos conocimos en la U, estudiando Informática, y desde ahí somos el grupo de WhatsApp más ruidoso del mundo.\nTomate en alto.', en: 'Venjy, Pony, Hadad, Andy, Nacho, Braulio and Conejeros.\nWe met at uni studying Computer Science, and since then we have been the loudest group chat in the world.\nTomatoes up.' } }
];

// Premio al juntar las 12 (el dueño ajusta cantidades aquí): Tomate con bigote y esmeraldas
export const PREMIO = { tomates: 3, esmeraldas: 4 };

export const TEXTOS = {
    es: {
        titulo: 'Cuaderno de los Tomatitos',
        sub: 'Páginas sueltas de un cuaderno que alguien perdió por el mapa.',
        pagina: n => `Página ${n}`,
        faltante: 'Página sin encontrar',
        cuenta: (n, max) => `${n} de ${max} páginas`,
        encontrada: (n, max, t) => `Página ${n} del cuaderno de los Tomatitos (${max} en total): «${t}»`,
        completo: 'Juntaste las 12 páginas del cuaderno de los Tomatitos. ¡Por los Tomatitos!',
        premio: 'Premio: Tomate con bigote y esmeraldas',
        cerrar: 'Cerrar'
    },
    en: {
        titulo: 'Tomatitos Notebook',
        sub: 'Loose pages from a notebook someone lost around the map.',
        pagina: n => `Page ${n}`,
        faltante: 'Page not found yet',
        cuenta: (n, max) => `${n} of ${max} pages`,
        encontrada: (n, max, t) => `Tomatitos notebook page ${n} (${max} in total): "${t}"`,
        completo: 'You found all 12 pages of the Tomatitos notebook. To the Tomatitos!',
        premio: 'Reward: Mustache Tomato and emeralds',
        cerrar: 'Close'
    }
};
