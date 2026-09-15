/**
 * Módulo de mantenimiento de Subestaciones (MVP: disciplina CIVIL). Reportes de
 * solo lectura — la captura de ejecuciones ocurre desde la app móvil, no aquí
 * (ver docs/design/subestaciones-design-brief.md).
 */
export function createSubstationActions({ fetchWithAuth, fetchAll, fetchPaginated }) {
    return {
        fetchSubstationEstaciones: () => fetchAll('substationEstaciones', 'substation/estaciones'),

        fetchSubstationActividades: (disciplina = 'CIVIL') =>
            fetchAll('substationActividades', `substation/actividades?disciplina=${disciplina}`),

        fetchSubstationIndicadoresPorEstacion: () =>
            fetchAll('substationIndicadoresPorEstacion', 'substation/indicadores/por-estacion'),

        fetchSubstationResumenPorActividad: (disciplina = 'CIVIL') =>
            fetchAll('substationResumenPorActividad', `substation/indicadores/por-actividad?disciplina=${disciplina}`),

        /**
         * Listado paginado de ejecuciones. `filtros` refleja 1:1 los query params
         * opcionales de GET /substation/ejecuciones (ver SubstationController):
         * estacionId, fechaInicio, fechaFin, esProgramada, resultado (array —
         * varios valores posibles, ej. el preset "solo hallazgos"), actividadId,
         * tipoMantenimiento, tipoActividad.
         */
        fetchSubstationEjecuciones: (page = 0, size = 20, filtros = {}) => {
            const params = new URLSearchParams();
            if (filtros.estacionId) params.set('estacionId', filtros.estacionId);
            if (filtros.fechaInicio) params.set('fechaInicio', filtros.fechaInicio);
            if (filtros.fechaFin) params.set('fechaFin', filtros.fechaFin);
            if (filtros.esProgramada != null && filtros.esProgramada !== '') params.set('esProgramada', filtros.esProgramada);
            if (Array.isArray(filtros.resultado) && filtros.resultado.length) params.set('resultado', filtros.resultado.join(','));
            if (filtros.actividadId) params.set('actividadId', filtros.actividadId);
            if (filtros.tipoMantenimiento) params.set('tipoMantenimiento', filtros.tipoMantenimiento);
            if (filtros.tipoActividad) params.set('tipoActividad', filtros.tipoActividad);
            const qs = params.toString();
            return fetchPaginated('substationEjecuciones', 'substation/ejecuciones', page, size, {
                extraQuery: qs ? `&${qs}` : '',
            });
        },

        /** Detalle de una ejecución (para el modal "Ver detalle" de la pantalla de Ejecuciones). */
        fetchSubstationEjecucion: (id) => fetchWithAuth(`substation/ejecuciones/${id}`),
    };
}
