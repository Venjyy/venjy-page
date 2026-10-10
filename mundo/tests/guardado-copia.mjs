// Prueba de «guardar copia con 5 mundos» (bloque 7a, punto 26): node mundo/tests/guardado-copia.mjs
// `guardarCopiaConTope` de supervivencia/guardado.js con un almacén inyectado: con espacio guarda directo;
// lleno pide elegir; reemplazo escribe primero y borra después; si falla la escritura no se borra nada;
// el mundo abierto no se puede elegir; un fallo al borrar no pierde la copia.
const { guardarCopiaConTope, MAX_MUNDOS } = await import('../supervivencia/guardado.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };

// Almacén en memoria con registro de llamadas y fallos programables
function almacenCon(n, { falla = null } = {}) {
    const mundos = new Map();
    for (let i = 1; i <= n; i++) mundos.set('m' + i, { id: 'm' + i, nombre: 'Mundo ' + i, dias: i, actualizado: 1000 + i });
    const registro = [];
    return {
        mundos, registro,
        listar: async () => [...mundos.values()],
        guardar: async m => { registro.push('guardar ' + m.id); if (falla === 'guardar') throw new Error('sin espacio'); mundos.set(m.id, m); },
        borrar: async id => { registro.push('borrar ' + id); if (falla === 'borrar') throw new Error('no se pudo'); mundos.delete(id); }
    };
}
const copia = { id: 'copia', nombre: 'Sala (copia)' };

ok(MAX_MUNDOS === 5, 'el tope sigue en 5');

// 1. Con espacio: igual que hoy (guarda y no borra)
{
    const a = almacenCon(4);
    const r = await guardarCopiaConTope(a, copia);
    ok(r.ok && r.id === 'copia' && r.borrado === null, 'con espacio guarda directo');
    ok(a.mundos.size === 5 && a.registro.join() === 'guardar copia', 'con espacio no borra nada');
}
// 2. Lleno sin elegir: no toca nada y devuelve la lista para el panel
{
    const a = almacenCon(5);
    const r = await guardarCopiaConTope(a, copia);
    ok(!r.ok && r.motivo === 'lleno' && r.lista.length === 5, 'lleno sin elegir: pide elegir con los 5 mundos');
    ok(a.registro.length === 0 && a.mundos.size === 5, 'lleno sin elegir: no escribe ni borra');
}
// 3. Reemplazo: primero escribe, después borra
{
    const a = almacenCon(5);
    const r = await guardarCopiaConTope(a, copia, { reemplazarId: 'm3' });
    ok(r.ok && r.borrado === 'm3' && !r.errorBorrar, 'reemplazo: ok y dice qué borró');
    ok(a.registro.join() === 'guardar copia,borrar m3', 'reemplazo: escribe antes de borrar');
    ok(a.mundos.size === 5 && a.mundos.has('copia') && !a.mundos.has('m3'), 'reemplazo: quedan 5 con la copia y sin el viejo');
}
// 4. Falla la escritura: no se borra nada (la promesa rechaza y el mundo viejo sigue)
{
    const a = almacenCon(5, { falla: 'guardar' });
    let error = null;
    try { await guardarCopiaConTope(a, copia, { reemplazarId: 'm2' }); } catch (e) { error = e; }
    ok(error && /sin espacio/.test(error.message), 'fallo al escribir: el error sale');
    ok(a.mundos.has('m2') && a.mundos.size === 5 && !a.registro.some(x => x.startsWith('borrar')), 'fallo al escribir: no se borra nada');
}
// 5. El mundo abierto no se puede elegir
{
    const a = almacenCon(5);
    const r = await guardarCopiaConTope(a, copia, { reemplazarId: 'm1', abiertoId: 'm1' });
    ok(!r.ok && r.motivo === 'abierto', 'el abierto no se puede reemplazar');
    ok(a.registro.length === 0 && a.mundos.size === 5, 'el abierto: no se escribe ni se borra');
}
// 6. Un id que no existe no borra ni escribe
{
    const a = almacenCon(5);
    const r = await guardarCopiaConTope(a, copia, { reemplazarId: 'fantasma' });
    ok(!r.ok && r.motivo === 'no-existe' && a.registro.length === 0, 'id inexistente: nada');
}
// 7. Falla el borrado: la copia ya está guardada y se avisa
{
    const a = almacenCon(5, { falla: 'borrar' });
    const r = await guardarCopiaConTope(a, copia, { reemplazarId: 'm4' });
    ok(r.ok && r.errorBorrar && a.mundos.has('copia'), 'fallo al borrar: la copia queda guardada y se informa');
}
// 8. Con espacio, reemplazarId se ignora (no se borra un mundo sin necesidad)
{
    const a = almacenCon(3);
    const r = await guardarCopiaConTope(a, copia, { reemplazarId: 'm1' });
    ok(r.ok && r.borrado === null && a.mundos.has('m1'), 'con espacio no borra aunque se pida');
}
// 9. Tope distinto (inyectable)
{
    const a = almacenCon(2);
    const r = await guardarCopiaConTope(a, copia, { max: 2 });
    ok(!r.ok && r.motivo === 'lleno', 'el tope es parámetro');
}

console.log(fallos ? `\n${fallos} de ${pruebas} pruebas fallaron` : `OK · ${pruebas} pruebas`);
process.exit(fallos ? 1 : 0);
