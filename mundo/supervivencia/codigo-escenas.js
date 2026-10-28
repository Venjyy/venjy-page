// =========================================================
// VENJY · Supervivencia · Lo de verdad único de una escena, por nombre (Etapa B 3b, estudio/DISENO.md §40, decisión 11)
// Una escena de escenas.json con "codigo": "<nombre>" busca aquí una función que carga su módulo con import() (solo si la
// escena lo pide: no suma nada a la carga). El módulo exporta por defecto (marcas) -> { iniciar?(api), cuadro?(api, dt),
// terminar?(api) }, lo mismo que el `extra` de los guiones de JS. `marcas` son los instantes con nombre de la escena
// ({ llega: 3.2 }), que el dueño mueve en la línea de tiempo: el código no trae números propios.
// Un nombre que no está aquí es error de `node estudio/cli.mjs validar`. B4c llenó los momentos (un módulo por momento en
// codigo-escenas/); B4d sumará lo que falte de los grupos (la nieve de Coyhaique, el plano manual del salto de la atalaya).
//   CODIGO_ESCENAS = { 'nieve-coyhaique': () => import('./codigo-escenas/nieve-coyhaique.js') }
// =========================================================
export const CODIGO_ESCENAS = {
    // Momentos especiales (B4c): lo que se mueve entre manos, crece o lleva textura propia. Las marcas están en escenas.json
    'momento-boris': () => import('./codigo-escenas/momento-boris.js'),
    'momento-braulio': () => import('./codigo-escenas/momento-braulio.js'),
    'momento-conejeros': () => import('./codigo-escenas/momento-conejeros.js'),
    'momento-lalo': () => import('./codigo-escenas/momento-lalo.js'),
    'momento-lona': () => import('./codigo-escenas/momento-lona.js'),
    'momento-lona-pareja': () => import('./codigo-escenas/momento-lona-pareja.js'),
    'momento-moises': () => import('./codigo-escenas/momento-moises.js'),
    'momento-nacho': () => import('./codigo-escenas/momento-nacho.js'),
    'momento-pony': () => import('./codigo-escenas/momento-pony.js'),
    'momento-salonas': () => import('./codigo-escenas/momento-salonas.js'),
    'momento-venjy': () => import('./codigo-escenas/momento-venjy.js'),
    'momento-venjy-pareja': () => import('./codigo-escenas/momento-venjy-pareja.js')
};
