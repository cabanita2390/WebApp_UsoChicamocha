import fetchWithAuth from './api.js';

/**
 * Escrituras y lecturas "de pantalla" del módulo Subestaciones web v2 (Configuración y
 * Cronograma). No pasan por el store global `data`: cada pantalla guarda su propio estado y
 * vuelve a leer después de escribir. Los errores 400/409 traen el mensaje legible del backend
 * en `err.message`.
 */
const json = (body) => JSON.stringify(body);

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

    // Cronograma
    obtenerCronograma: (anio, disciplina) =>
        fetchWithAuth(`substation/cronograma?anio=${anio}${disciplina ? `&disciplina=${disciplina}` : ''}`),
    copiarAnio: (anioOrigen, anioDestino) =>
        fetchWithAuth('substation/cronograma/copiar', { method: 'POST', body: json({ anioOrigen, anioDestino }) }),
};
