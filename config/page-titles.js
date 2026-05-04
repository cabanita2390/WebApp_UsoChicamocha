/**
 * Normaliza la ruta del router (hash mode, query string, rutas relativas).
 * @param {string} path
 * @returns {string}
 */
export function normalizeAppPath(path) {
    if (path == null || typeof path !== "string") return "/";
    let p = path.trim();
    const hashIdx = p.indexOf("#");
    if (hashIdx !== -1) {
        p = p.slice(hashIdx + 1) || "/";
    }
    if (!p.startsWith("/")) p = `/${p}`;
    const q = p.indexOf("?");
    if (q !== -1) p = p.slice(0, q);
    return p || "/";
}

/** Títulos del encabezado y de la pestaña del navegador por ruta. */
const ROUTE_TITLES = {
    "/": "Panel de Control — Estado de equipos",
    "/users": "Gestión de usuarios",
    "/machines": "Gestión de máquinas",
    "/work-orders": "Gestión de órdenes de trabajo",
    "/consolidado": "Consolidado de maquinaria",
    "/oil-management": "Gestión de aceites",
    "/vehicle-monitoring": "Monitoreo consolidado — Vehículos",
    "/vehicle-inspections": "Inspecciones pre-operativas — Vehículos",
    "/moto-monitoring": "Monitoreo de motocicletas",
    "/moto-inspections": "Inspección diaria motos — último por placa",
    "/moto-maintenance": "Historial de taller — Motos",
    "/vehicles": "Inventario de vehículos",
    "/moto-inventory": "Inventario de motocicletas",
};

/**
 * @param {string} rawPath Valor de `$location` (svelte-spa-router).
 * @returns {string}
 */
export function getPageTitle(rawPath) {
    const path = normalizeAppPath(rawPath);
    return ROUTE_TITLES[path] ?? "Usochicamocha — Administración";
}
