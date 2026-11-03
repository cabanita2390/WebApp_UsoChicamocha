import { normalizeAppPath } from "./page-titles.js";

/**
 * Rutas que solo ve ADMIN. Ocultarlas en el Sidebar no basta: la URL (#/users) sigue
 * abriendo la página, por ejemplo al iniciar sesión con otro rol después de cerrar
 * sesión en ella. El backend igual responde 403 a sus datos.
 */
export const RUTAS_SOLO_ADMIN = ["/users", "/subestaciones/configuracion"];

/**
 * @param {string} path ruta del router
 * @param {string | null | undefined} role rol del usuario actual (sin "ROLE_")
 * @returns {boolean}
 */
export function puedeVerRuta(path, role) {
    return !RUTAS_SOLO_ADMIN.includes(normalizeAppPath(path)) || role === "ADMIN";
}
