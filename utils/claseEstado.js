/**
 * Color (clase CSS) del estado de una celda: status-optimo (verde), status-regular (amarillo),
 * status-malo (rojo) o status-unknown. Lo usan la tabla y el modal de orden de trabajo, para que
 * los dos pinten igual.
 *
 * En las preguntas Sí/No lo bueno suele ser el "Sí" (sobrio, en condiciones, tiene botiquín…). Si
 * la columna dice `meta.siEsMalo` (p. ej. "Medicamentos": ¿consume alguno que afecte los
 * sentidos?), se invierte: "Sí" en rojo y "No" en verde.
 *
 * @param {unknown} valor texto de la celda
 * @param {{ meta?: { siEsMalo?: boolean } } | null} [columnDef]
 */
export function claseEstado(valor, columnDef = null) {
    const raw = String(valor ?? '').trim();
    if (!raw) return 'status-unknown';
    const s = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const siEsMalo = columnDef?.meta?.siEsMalo === true;

    if (s.includes(',') && /\bsi\b/.test(s) && /\bno\b/.test(s)) return 'status-regular';
    if (s === 'si') return siEsMalo ? 'status-malo' : 'status-optimo';
    if (s === 'no') return siEsMalo ? 'status-optimo' : 'status-malo';
    if (s === 'n/a' || s === 'na') return 'status-unknown';

    if (s.includes('optimo') || s.includes('optima') || s.includes('vigente') || s === 'ok'
        || s.includes('bueno') || s.includes('excelente')) {
        return 'status-optimo';
    }
    if (s.includes('regular') || s.includes('proximo') || s.includes('medio')) return 'status-regular';
    if (s.includes('malo') || s.includes('vencido') || (s.includes('cambio') && !s.includes('sin cambio'))) {
        return 'status-malo';
    }
    return 'status-unknown';
}
