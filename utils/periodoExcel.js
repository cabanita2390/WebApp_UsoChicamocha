/**
 * Periodos de las descargas a Excel: atajos ("Este mes", "Este año"…) del panel de BotonExcel.
 * Se mandan al back como `desde` / `hasta` (aaaa-mm-dd); sin fechas = todo el historial. El nombre
 * del archivo lo pone el back.
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
