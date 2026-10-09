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

/**
 * Campos de orden en el servidor (`sort` de Spring sobre EjecucionEntity) por columna.
 * La lista es paginada: ordenar en el navegador solo reordenaría la página visible.
 */
export const EJECUCIONES_SORT = {
    ej_fecha: ['fecha'],
    ej_estacion: ['estacion.nombre'],
    // Los registros libres no tienen actividad: se ordenan por su descripción.
    ej_actividad: ['actividad.nombre', 'descripcionLibre'],
    ej_tipomant: ['tipoMantenimiento'],
    ej_tipoact: ['tipoActividad'],
    ej_prog: ['esProgramada'],
    // El código ya va de menos a más grave: CONFORME, CON_HALLAZGOS, REQUIERE_INTERVENCION.
    ej_resultado: ['resultado'],
    ej_responsable: ['usuario.username'],
};

/** SortingState de TanStack → parámetros `sort` ("campo,asc|desc") para el backend. */
export function ejecucionesSortParams(sorting = []) {
    return sorting.flatMap((s) => (EJECUCIONES_SORT[s.id] ?? []).map((campo) => `${campo},${s.desc ? 'desc' : 'asc'}`));
}

/** Pestaña 3 — Ejecuciones y Hallazgos. `onVerDetalle` no se usa acá: la acción
 * se captura vía el evento `action` estándar de DataGrid (type: 'verDetalle'). */
export const createEjecucionesColumns = () => [
    { header: 'Fecha', accessorFn: (r) => formatLocalDate(r.fecha), id: 'ej_fecha', size: 100, sortDescFirst: true },
    { header: 'Estación', accessorKey: 'estacionNombre', id: 'ej_estacion', size: 160 },
    { header: 'Actividad', accessorFn: (r) => r.actividadNombre ?? r.descripcionLibre ?? '—', id: 'ej_actividad', size: 240 },
    { header: 'Tipo de mantenimiento', accessorFn: (r) => tipoMantenimientoLabel(r.tipoMantenimiento), id: 'ej_tipomant', size: 130 },
    { header: 'Tipo de actividad', accessorFn: (r) => tipoActividadLabel(r.tipoActividad), id: 'ej_tipoact', size: 120 },
    // Mismo vocabulario que el resto del módulo: lo del cronograma o un imprevisto (sin cita).
    { header: 'Origen', accessorFn: (r) => (r.esProgramada ? 'Cronograma' : 'Imprevisto'), id: 'ej_prog', size: 110 },
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
        // El conteo de fotos no es una columna de la tabla: no se puede ordenar en el servidor.
        enableSorting: false,
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
