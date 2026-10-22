// PreToolUse(Bash|PowerShell|Write|Edit): regla del dueño (CLAUDE.md «Convenciones», AGENTS.md «Commits y PR»).
// Bloquea la línea «Generated with [Claude Code]», los enlaces de sesión (claude.ai/code/session…) y la línea
// `Claude-Session:` en commits, PRs, comentarios y archivos del repo. La línea Co-Authored-By sí se permite.
// En Bash/PowerShell revisa el comando (incluido el heredoc) y, si usa --body-file / -F <archivo>, ese archivo.
import fs from 'node:fs';
const PROHIBIDO = /Generated with \[?Claude Code\]?\s*\(?https?:|Generated with \[Claude Code\]|claude\.ai\/code\/session|Claude-Session:/i;
let entrada = '';
process.stdin.on('data', d => { entrada += d; });
process.stdin.on('end', () => {
    let e = {};
    try { e = JSON.parse(entrada); } catch (x) { return; }
    const ti = e.tool_input || {}, herramienta = e.tool_name || '';
    const negar = () => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'Regla del dueño: sin «Generated with Claude Code», enlaces de sesión ni «Claude-Session:» en commits, PRs, comentarios ni archivos. Quita esa línea y repite (Co-Authored-By sí se permite).' } }));
    let texto = '';
    if (herramienta === 'Bash' || herramienta === 'PowerShell') {
        const cmd = String(ti.command || '');
        if (!/\b(git|gh)\b/.test(cmd)) return;
        texto = cmd;
        for (const m of cmd.matchAll(/(?:--body-file|--file|-F)\s+("([^"]+)"|'([^']+)'|(\S+))/g)) {
            const ruta = m[2] || m[3] || m[4];
            if (ruta && ruta !== '-') { try { texto += '\n' + fs.readFileSync(ruta.replace(/^\$TEMP/, process.env.TEMP || ''), 'utf8'); } catch (x) { /* no se pudo leer */ } }
        }
    } else if (/(^|[\\/])(CLAUDE|AGENTS)\.md$|sin-atribucion\.mjs$/.test(String(ti.file_path || ''))) return; // citan la regla
    else if (herramienta === 'Write') texto = String(ti.content || '');
    else if (herramienta === 'Edit') texto = String(ti.new_string || '');
    else return;
    if (PROHIBIDO.test(texto)) negar();
});
