// =========================================================
// VENJY · Supervivencia · Código del momento de Salonas (Etapa B4c): las corcheas que suben desde él mientras toca el solo
// (14 notas, una cada 0,5 s, blancas y negras). Marca: empieza (cuándo sale la primera).
// =========================================================
const suaveT = (u, a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
const CORCHEA = ['.....k', '.....k', '....kk', '....k.', '....k.', '.kkk..', 'kkkk..', '.kk...'];

export default function (m) {
    let notas = [];
    return {
        iniciar(api) {
            notas = [];
            for (let i = 0; i < 14; i++) {
                const s = api.sprite(CORCHEA, { k: i % 2 ? '#161616' : '#ffffff' }, 0.45);
                api.pegar(s, null, null, [0, 0, 0]);
                s.visible = false;
                notas.push(s);
            }
        },
        cuadro(api) {
            const t = api.e.t;
            const base = api.posG('n');
            if (!base) return;
            notas.forEach((s, i) => {
                const b = m.empieza + i * 0.5, u = (t - b) / 1.4;
                if (u < 0 || u >= 1) { s.visible = false; return; }
                s.visible = true;
                s.material.opacity = 1 - suaveT(u, 0.6, 1);
                s.position.set(base.x + (i % 2 ? 0.3 : -0.3) * u, base.y + 2.1 + 1.2 * u, base.z);
            });
        }
    };
}
