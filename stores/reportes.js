import fetchWithAuth, { download } from './api.js';

/**
 * Descargas a Excel por el motor único del back (GET /reportes y GET /reportes/{clave}). Cada
 * reporte dice si usa periodo, sus filtros (DISCIPLINA, ESTACION, ANIO, MES los elige el usuario;
 * CONTEXTO los pone la pantalla) y sus columnas. La web no tiene nada de eso escrito: lo lee aquí.
 */

let catalogo = null;
let deSesion = null;

/**
 * Los reportes que puede descargar el usuario. Se lee una vez por sesión (otro usuario puede tener
 * otros reportes); si falla, se puede reintentar.
 */
export function catalogoReportes() {
    const sesion = localStorage.getItem('accessToken');
    if (!catalogo || deSesion !== sesion) {
        deSesion = sesion;
        catalogo = fetchWithAuth('reportes').catch((e) => {
            catalogo = null;
            throw e;
        });
    }
    return catalogo;
}

/** "reportes/ordenes-maquinaria?desde=…&hasta=…&disciplina=…&columnas=a,b". Los vacíos no van. */
export function urlReporte(clave, { desde, hasta, filtros = {}, columnas } = {}) {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    Object.entries(filtros).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    if (columnas?.length) params.set('columnas', columnas.join(','));
    const q = params.toString();
    return `reportes/${clave}${q ? `?${q}` : ''}`;
}

/** Descarga el reporte. El nombre del archivo lo pone el back (con el periodo o la fecha de corte). */
export function descargarReporte(clave, peticion = {}) {
    return download(urlReporte(clave, peticion), `${clave.replace(/-/g, '_')}.xlsx`);
}
