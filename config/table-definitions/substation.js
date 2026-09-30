import { formatLocalDate } from './helpers.js';

const RESULTADO_LABELS = {
    CONFORME: 'Conforme',
    CON_HALLAZGOS: 'Con hallazgos',
    REQUIERE_INTERVENCION: 'Requiere intervención',
};
const RESULTADO_COLORS = {
    CONFORME: 'green',
    CON_HALLAZGOS: 'yellow',
    REQUIERE_INTERVENCION: 'red',
};

export function resultadoBadge(resultado) {
    return {
        label: RESULTADO_LABELS[resultado] ?? resultado ?? '—',
        color: RESULTADO_COLORS[resultado] ?? 'gray',
    };
}

export function tipoMantenimientoLabel(v) {
    const labels = { PREVENTIVO: 'Preventivo', CORRECTIVO: 'Correctivo', PREDICTIVO: 'Predictivo', NO_PROGRAMADO: 'No programado' };
    return labels[v] ?? v ?? '—';
}

export function tipoActividadLabel(v) {
    const labels = { INSPECCION: 'Inspección', MANTENIMIENTO: 'Mantenimiento', NO_PROGRAMADO: 'No programado', OTRO: 'Otro' };
    return labels[v] ?? v ?? '—';
}

export function estacionTipoLabel(v) {
    return v === 'BOMBEO' ? 'Bombeo' : v === 'COMPLEMENTARIA' ? 'Complementaria' : (v ?? '—');
}

/** Pestaña 2 — Resumen por Actividad. Espejo de la hoja RESUMEN_ANUAL. */
export const createResumenActividadColumns = () => [
    { header: 'Actividad', accessorKey: 'actividadNombre', id: 'ract_nombre', size: 280 },
    { header: 'Programado anual', accessorFn: (r) => (r.programadoAnual > 0 ? r.programadoAnual : '—'), id: 'ract_prog', size: 120 },
    { header: 'Ejecutado anual', accessorKey: 'ejecutadoAnual', id: 'ract_ejec', size: 120 },
    { header: 'No programado', accessorKey: 'ejecutadoNoProgramado', id: 'ract_noprog', size: 120 },
    { header: 'Mantenimiento', accessorKey: 'mantenimiento', id: 'ract_mant', size: 110 },
    { header: 'Inspección', accessorKey: 'inspeccion', id: 'ract_insp', size: 100 },
    { header: 'Total', accessorKey: 'ejecutadoTotal', id: 'ract_total', size: 90 },
];

/** Pestaña 3 — Ejecuciones y Hallazgos. `onVerDetalle` no se usa acá: la acción
 * se captura vía el evento `action` estándar de DataGrid (type: 'verDetalle'). */
export const createEjecucionesColumns = () => [
    { header: 'Fecha', accessorFn: (r) => formatLocalDate(r.fecha), id: 'ej_fecha', size: 100 },
    { header: 'Estación', accessorKey: 'estacionNombre', id: 'ej_estacion', size: 160 },
    { header: 'Actividad', accessorFn: (r) => r.actividadNombre ?? r.descripcionLibre ?? '—', id: 'ej_actividad', size: 240 },
    { header: 'Tipo mant.', accessorFn: (r) => tipoMantenimientoLabel(r.tipoMantenimiento), id: 'ej_tipomant', size: 110 },
    { header: 'Tipo act.', accessorFn: (r) => tipoActividadLabel(r.tipoActividad), id: 'ej_tipoact', size: 110 },
    { header: 'Programada', accessorFn: (r) => (r.esProgramada ? 'Sí' : 'No'), id: 'ej_prog', size: 90 },
    {
        header: 'Resultado',
        accessorFn: (r) => resultadoBadge(r.resultado).label,
        id: 'ej_resultado',
        size: 150,
        meta: { isTextBadge: true, getBadge: (row) => resultadoBadge(row.resultado) },
    },
    { header: 'Responsable', accessorKey: 'responsable', id: 'ej_responsable', size: 140 },
    {
        header: 'Evidencia',
        accessorFn: (r) => `${r.evidencias?.length ?? 0} foto(s)`,
        id: 'ej_evidencia',
        size: 110,
        meta: {
            isTextBadge: true,
            // Solo se resalta como badge cuando falta evidencia (evidenciaPendiente,
            // ya calculado por el backend) — el conteo normal se muestra en texto
            // plano, sin badge, para no sobre-usar el semáforo en algo informativo.
            getBadge: (row) => (row.evidenciaPendiente ? { label: 'Sin evidencia', color: 'yellow' } : null),
        },
    },
    { id: 'ej_detalle', header: '', size: 110, meta: { isVerDetalleAction: true } },
];
