// SessionStart: mete las reglas de ahorro en el contexto de cada sesión (startup, resume, clear, compact).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const aqui = path.dirname(fileURLToPath(import.meta.url));
const texto = fs.readFileSync(path.join(aqui, 'ahorro-reglas.md'), 'utf8').trim();
process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: texto } }));
