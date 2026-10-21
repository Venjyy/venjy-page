// PostToolUse(Bash): solo si el comando abrió o fusionó un PR (gh pr create | gh pr merge), recuerda invocar la skill
// traspaso-chat y entregar el prompt en un bloque de código. Filtra aquí porque el `if` del hook no filtraba.
let entrada = '';
process.stdin.on('data', d => { entrada += d; });
process.stdin.on('end', () => {
    let cmd = '';
    try { cmd = String(JSON.parse(entrada).tool_input.command || ''); } catch (e) { return; }
    const m = /(^|[;&|\s])gh\s+pr\s+(create|merge)\b/.exec(cmd);
    if (!m) return;
    const que = m[2] === 'create' ? 'PR abierto' : 'PR fusionado';
    const texto = `${que}: invoca AHORA la skill traspaso-chat (Skill tool) y entrega el prompt de traspaso al siguiente chat en un bloque de código para copiar y pegar, en español, máximo ~10 líneas, antes de terminar el turno. No lo escribas como lista dentro del resumen.`;
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: texto } }));
});
