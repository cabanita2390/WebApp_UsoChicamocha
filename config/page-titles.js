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
    "/inventory": "Inventario — Maquinaria · Vehículos · Motos",
    "/machines": "Gestión de máquinas",
    "/work-orders": "Órdenes de Trabajo",
    "/consolidado": "Consolidado de activos",
    "/oil-management": "Gestión de aceites",
    "/vehicles": "Inventario de vehículos",
    "/moto-inventory": "Inventario de motocicletas",
    "/vehicle-oil-history": "Historial de cambios de aceite — Vehículo",
    "/maintenance": "Historial de mantenimiento — Vehículos · Motos",
    "/fuel": "Módulo de Combustibles",
};

/**
 * @param {string} rawPath Valor de `$location` (svelte-spa-router).
 * @returns {string}
 */
export function getPageTitle(rawPath) {
    const path = normalizeAppPath(rawPath);
    if (ROUTE_TITLES[path]) return ROUTE_TITLES[path];
    // prefix match for routes with dynamic segments (e.g. /vehicle-oil-history/ABC123)
    const prefix = Object.keys(ROUTE_TITLES).find(k => k !== '/' && path.startsWith(k + '/'));
    return prefix ? ROUTE_TITLES[prefix] : "Usochicamocha — Administración";
}
