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

    // Conjuntos y elementos (Eléctrico: "¿Qué se intervino?"). body: { nombre, disciplina }
    listarConjuntos: () => fetchWithAuth('substation/conjuntos?incluirInactivas=true'),
    crearConjunto: (body) => fetchWithAuth('substation/conjuntos', { method: 'POST', body: json(body) }),
    actualizarConjunto: (id, body) => fetchWithAuth(`substation/conjuntos/${id}`, { method: 'PUT', body: json(body) }),
    cambiarEstadoConjunto: (id, activa) =>
        fetchWithAuth(`substation/conjuntos/${id}/estado`, { method: 'PATCH', body: json({ activa }) }),

    listarElementos: () => fetchWithAuth('substation/elementos?incluirInactivas=true'),
    crearElemento: (body) => fetchWithAuth('substation/elementos', { method: 'POST', body: json(body) }),
    actualizarElemento: (id, body) => fetchWithAuth(`substation/elementos/${id}`, { method: 'PUT', body: json(body) }),
    cambiarEstadoElemento: (id, activa) =>
        fetchWithAuth(`substation/elementos/${id}/estado`, { method: 'PATCH', body: json({ activa }) }),

    // Dashboard y Detalle por estación
    /**
     * Sin anio: el año actual del servidor. Sin disciplina: todas. Cada fila trae anio, vencidas,
     * ejecutadasVencidas, conHallazgos, hallazgosAbiertos.
     */
    indicadoresPorEstacion: (anio, disciplina) =>
        fetchWithAuth(`substation/indicadores/por-estacion${query({ anio, disciplina })}`),
    criticidad: (estacionId, disciplina) =>
        fetchWithAuth(`substation/indicadores/criticidad${query({ estacionId, disciplina })}`),
    /** Elementos más intervenidos del año: [{ elementoId, nombre, intervenciones, estaciones }], de más a menos. */
    elementosIntervenidos: (anio, disciplina, estacionId) =>
        fetchWithAuth(`substation/indicadores/elementos${query({ anio, disciplina, estacionId })}`),
    /** Últimas ejecuciones de una estación en el año y la disciplina del detalle (página de Spring). */
    ultimasEjecuciones: (estacionId, anio, disciplina, size = 6) =>
        fetchWithAuth(
            `substation/ejecuciones${query({ estacionId, disciplina, fechaInicio: `${anio}-01-01`, fechaFin: `${anio}-12-31` })}` +
                `&page=0&size=${size}&sort=fecha,desc&sort=id,desc`,
        ),
    obtenerEjecucion: (id) => fetchWithAuth(`substation/ejecuciones/${id}`),
    /** { anioActual, programables: [actual, siguiente], conDatos: [años con citas o registros, desc] } */
    aniosCronograma: () => fetchWithAuth('substation/cronograma/anios'),
    /** El registro con el que se cumplió una cita del cronograma (404 si la cita no se ejecutó). */
    ejecucionDeCita: (programacionId) => fetchWithAuth(`substation/ejecuciones/por-programacion/${programacionId}`),
    /** Registros fuera de cronograma (sin cita) de una estación en el año, del más reciente al más antiguo. */
    noProgramadasDeEstacion: (estacionId, anio, disciplina, size = 50) =>
        fetchWithAuth(
            `substation/ejecuciones${query({ estacionId, disciplina, esProgramada: false, fechaInicio: `${anio}-01-01`, fechaFin: `${anio}-12-31` })}` +
                `&page=0&size=${size}&sort=fecha,desc&sort=id,desc`,
        ),

    // Resumen por actividad
    /** Una fila por actividad activa, con lo publicado y lo ejecutado del año (sin anio: el actual; sin disciplina: todas). */
    resumenPorActividad: (anio, disciplina) =>
        fetchWithAuth(`substation/indicadores/por-actividad${query({ anio, disciplina })}`),
    /** Imprevistos (registros sin cita) de una actividad en el año, del más reciente al más antiguo. */
    noProgramadasDeActividad: (actividadId, anio, size = 50) =>
        fetchWithAuth(
            `substation/ejecuciones?actividadId=${actividadId}&esProgramada=false&fechaInicio=${anio}-01-01` +
                `&fechaFin=${anio}-12-31&page=0&size=${size}&sort=fecha,desc&sort=id,desc`,
        ),
    /** Registros de una actividad en el año, del más reciente al más antiguo (página de Spring). */
    ejecucionesDeActividad: (actividadId, anio, page = 0, size = 20) =>
        fetchWithAuth(
            `substation/ejecuciones?actividadId=${actividadId}&fechaInicio=${anio}-01-01&fechaFin=${anio}-12-31` +
                `&page=${page}&size=${size}&sort=fecha,desc&sort=id,desc`,
        ),

    // Cronograma
    // ---- Hallazgos y órdenes de trabajo (OT-EB) ----
    marcarHallazgoEnProceso: (ejecucionId) => fetchWithAuth(`substation/hallazgos/${ejecucionId}/en-proceso`, { method: 'PUT' }),
    /** { observacionesCierre, resueltoEnEjecucionId?, resueltoMismaVisita? } */
    resolverHallazgo: (ejecucionId, body) =>
        fetchWithAuth(`substation/hallazgos/${ejecucionId}/resolver`, { method: 'PUT', body: json(body) }),
    operarios: () => fetchWithAuth('substation/ordenes/operarios'),
    /** { ejecucionOrigenId, prioridad, fechaLimite, asignadoAId, actividadId, instrucciones } */
    crearOrden: (body) => fetchWithAuth('substation/ordenes', { method: 'POST', body: json(body) }),
    /** filtros: { estado: [], estacionId, prioridad, vencidas, disciplina }; página de Spring. */
    listarOrdenes: ({ estado = [], estacionId, prioridad, vencidas, disciplina } = {}, page = 0, size = 20) =>
        fetchWithAuth(`substation/ordenes${query({ estado: estado.join(','), estacionId, prioridad, vencidas: vencidas || '', disciplina, page, size })}`),
    obtenerOrden: (id) => fetchWithAuth(`substation/ordenes/${id}`),
    editarOrden: (id, body) => fetchWithAuth(`substation/ordenes/${id}`, { method: 'PUT', body: json(body) }),
    anularOrden: (id, comentario) => fetchWithAuth(`substation/ordenes/${id}/anular`, { method: 'PUT', body: json({ comentario }) }),
    cerrarOrden: (id, comentario) => fetchWithAuth(`substation/ordenes/${id}/cerrar`, { method: 'PUT', body: json({ comentario }) }),
    devolverOrden: (id, comentario) => fetchWithAuth(`substation/ordenes/${id}/devolver`, { method: 'PUT', body: json({ comentario }) }),
    /** Visitas de la estación posteriores al hallazgo, para "se resolvió en la visita del…". */
    visitasPosteriores: (estacionId, desde, size = 30) =>
        fetchWithAuth(`substation/ejecuciones${query({ estacionId, fechaInicio: desde })}&size=${size}&sort=fecha,desc`),

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
