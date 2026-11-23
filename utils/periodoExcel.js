/**
 * Periodos de las descargas a Excel: atajos ("Este mes", "Este año"…) y cómo se pasan al back
 * (`desde` / `hasta` en aaaa-mm-dd; sin fechas = todo el historial).
 */

export const PRESETS_PERIODO = [
    { value: 'mes', label: 'Este mes' },
    { value: 'mesAnterior', label: 'Mes anterior' },
    { value: 'anio', label: 'Este año' },
    { value: 'anioAnterior', label: 'Año anterior' },
    { value: 'ultimos12', label: 'Últimos 12 meses' },
    { value: 'rango', label: 'Rango a la medida' },
    { value: 'todo', label: 'Todo el historial' },
];

const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** { desde, hasta } (aaaa-mm-dd) del atajo, contado desde `hoy`. "todo" y "rango" no tienen fechas. */
export function rangoDePreset(preset, hoy = new Date()) {
    const y = hoy.getFullYear();
    const m = hoy.getMonth();
    switch (preset) {
        case 'mes':
            return { desde: iso(new Date(y, m, 1)), hasta: iso(new Date(y, m + 1, 0)) };
        case 'mesAnterior':
            return { desde: iso(new Date(y, m - 1, 1)), hasta: iso(new Date(y, m, 0)) };
        case 'anio':
            return { desde: iso(new Date(y, 0, 1)), hasta: iso(new Date(y, 11, 31)) };
        case 'anioAnterior':
            return { desde: iso(new Date(y - 1, 0, 1)), hasta: iso(new Date(y - 1, 11, 31)) };
        case 'ultimos12':
            return { desde: iso(new Date(y, m - 11, 1)), hasta: iso(hoy) };
        default:
            return { desde: '', hasta: '' };
    }
}

/** El endpoint con el periodo: "order/export" + {desde, hasta} → "order/export?desde=…&hasta=…". */
export function conPeriodo(endpoint, { desde, hasta } = {}) {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const q = params.toString();
    if (!q) return endpoint;
    return endpoint + (endpoint.includes('?') ? '&' : '?') + q;
}

/** "inspecciones_vehiculos" + periodo → "inspecciones_vehiculos_2026-01-01_a_2026-12-31.xlsx" (igual que el back). */
export function nombreConPeriodo(base, { desde, hasta } = {}) {
    if (!desde && !hasta) return `${base}.xlsx`;
    return `${base}_${desde || 'inicio'}_a_${hasta || 'hoy'}.xlsx`;
}

/** Reportes que son una foto de hoy (consolidados): "consolidado_motos" → "consolidado_motos_2026-11-23.xlsx". */
export function nombreConCorte(base, hoy = new Date()) {
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    return `${base}_${iso}.xlsx`;
}
