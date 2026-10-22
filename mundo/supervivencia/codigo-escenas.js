// =========================================================
// VENJY · Supervivencia · Lo de verdad único de una escena, por nombre (Etapa B 3b, estudio/DISENO.md §40, decisión 11)
// Una escena de escenas.json con "codigo": "<nombre>" busca aquí una función que carga su módulo con import() (solo si la
// escena lo pide: no suma nada a la carga). El módulo exporta por defecto (marcas) -> { iniciar?(api), cuadro?(api, dt),
// terminar?(api) }, lo mismo que el `extra` de los guiones de JS. `marcas` son los instantes con nombre de la escena
// ({ llega: 3.2 }), que el dueño mueve en la línea de tiempo: el código no trae números propios.
// Un nombre que no está aquí es error de `node estudio/cli.mjs validar`. Hoy no hay ninguno: los llena B4 (la nieve de
// Coyhaique, el plano manual del salto de la atalaya) cuando migre lo que el catálogo no cubre.
//   CODIGO_ESCENAS = { 'nieve-coyhaique': () => import('./codigo-escenas/nieve-coyhaique.js') }
// =========================================================
export const CODIGO_ESCENAS = {};
