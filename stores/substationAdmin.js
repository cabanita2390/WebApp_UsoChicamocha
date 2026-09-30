import fetchWithAuth from './api.js';

/**
 * Escrituras y lecturas "de pantalla" del módulo Subestaciones web v2 (Configuración y
 * Cronograma). No pasan por el store global `data`: cada pantalla guarda su propio estado y
 * vuelve a leer después de escribir. Los errores 400/409 traen el mensaje legible del backend
 * en `err.message`.
 */
const json = (body) => JSON.stringify(body);

/** "?a=1&b=2" sin los parámetros vacíos (null, undefined o ""). */
const query = (params) => {
    const q = Object.entries(params)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
    return q ? `?${q}` : '';
};

export const substationAdmin = {
    // Catálogos (Configuración)
    listarEstaciones: () => fetchWithAuth('substation/estaciones?incluirInactivas=true'),
    crearEstacion: (body) => fetchWithAuth('substation/estaciones', { method: 'POST', body: json(body) }),
    actualizarEstacion: (id, body) => fetchWithAuth(`substation/estaciones/${id}`, { method: 'PUT', body: json(body) }),
    cambiarEstadoEstacion: (id, activa) =>
        fetchWithAuth(`substation/estaciones/${id}/estado`, { method: 'PATCH', body: json({ activa }) }),

    listarActividades: () => fetchWithAuth('substation/actividades?incluirInactivas=true'),
    crearActividad: (body) => fetchWithAuth('substation/actividades', { method: 'POST', body: json(body) }),
    actualizarActividad: (id, body) => fetchWithAuth(`substation/actividades/${id}`, { method: 'PUT', body: json(body) }),
    cambiarEstadoActividad: (id, activa) =>
        fetchWithAuth(`substation/actividades/${id}/estado`, { method: 'PATCH', body: json({ activa }) }),

    // Dashboard y Detalle por estación
    /**
     * Sin anio: el año actual del servidor. Sin disciplina: todas. Cada fila trae anio, vencidas,
     * ejecutadasVencidas, conHallazgos, hallazgosAbiertos.
     */
    indicadoresPorEstacion: (anio, disciplina) =>
        fetchWithAuth(`substation/indicadores/por-estacion${query({ anio, disciplina })}`),
    criticidad: (estacionId, disciplina) =>
        fetchWithAuth(`substation/indicadores/criticidad${query({ estacionId, disciplina })}`),
    /** Últimas ejecuciones de una estación (página de Spring: { content, totalElements, ... }). */
    ultimasEjecuciones: (estacionId, size = 6) =>
        fetchWithAuth(`substation/ejecuciones?estacionId=${estacionId}&page=0&size=${size}&sort=fecha,desc&sort=id,desc`),
    obtenerEjecucion: (id) => fetchWithAuth(`substation/ejecuciones/${id}`),

    // Resumen por actividad
    /** Una fila por actividad activa, con lo publicado y lo ejecutado del año (sin anio: el actual; sin disciplina: todas). */
    resumenPorActividad: (anio, disciplina) =>
        fetchWithAuth(`substation/indicadores/por-actividad${query({ anio, disciplina })}`),
    /** Registros de una actividad en el año, del más reciente al más antiguo (página de Spring). */
    ejecucionesDeActividad: (actividadId, anio, page = 0, size = 20) =>
        fetchWithAuth(
            `substation/ejecuciones?actividadId=${actividadId}&fechaInicio=${anio}-01-01&fechaFin=${anio}-12-31` +
                `&page=${page}&size=${size}&sort=fecha,desc&sort=id,desc`,
        ),

    // Cronograma
    obtenerCronograma: (anio, disciplina) =>
        fetchWithAuth(`substation/cronograma?anio=${anio}${disciplina ? `&disciplina=${disciplina}` : ''}`),
    copiarAnio: (anioOrigen, anioDestino) =>
        fetchWithAuth('substation/cronograma/copiar', { method: 'POST', body: json({ anioOrigen, anioDestino }) }),
    /** { anio, actividadId, estacionIds: [], meses: [1..12] } → { creadas, omitidasDuplicadas, omitidasMesCerrado, omitidasEstacionInactiva } */
    asignar: (body) => fetchWithAuth('substation/cronograma/citas', { method: 'POST', body: json(body) }),
    quitar: (citaId) => fetchWithAuth(`substation/cronograma/citas/${citaId}`, { method: 'DELETE' }),
    restaurar: (citaId) => fetchWithAuth(`substation/cronograma/citas/${citaId}/restaurar`, { method: 'POST' }),
    descartarBorrador: (anio) => fetchWithAuth(`substation/cronograma/borrador?anio=${anio}`, { method: 'DELETE' }),
    resumenBorrador: (anio) => fetchWithAuth(`substation/cronograma/borrador/resumen?anio=${anio}`),
    publicar: (anio) => fetchWithAuth(`substation/cronograma/publicar?anio=${anio}`, { method: 'POST' }),
    deshacerPublicacion: (anio) =>
        fetchWithAuth(`substation/cronograma/publicaciones/deshacer?anio=${anio}`, { method: 'POST' }),
};
