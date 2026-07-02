import { auth } from './auth';

let isRefreshingToken = false;
let refreshTokenPromise = null;

function getTokenOrThrow() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        throw new Error('Sesión no válida. Por favor, inicie sesión de nuevo.');
    }
    return token;
}

function buildUrl(endpoint, version) {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const apiVersion = version === undefined ? 'v1' : version;
    const path = apiVersion ? `/api/${apiVersion}/${endpoint}` : `/api/${endpoint}`;
    return `${BASE_URL}${path}`;
}

async function refreshTokenOnce() {
    console.warn('⚠️ Token expirado (401) - El monitor no refrescó a tiempo, intentando refrescar ahora...');
    try {
        if (!isRefreshingToken) {
            isRefreshingToken = true;
            refreshTokenPromise = auth.refreshToken();
        }
        const refreshSuccess = await refreshTokenPromise;
        isRefreshingToken = false;
        refreshTokenPromise = null;

        if (!refreshSuccess) {
            throw new Error('No se pudo renovar el token. Inicie sesión de nuevo.');
        }
        console.log('✅ Token refrescado en fallback, reintentando request...');
    } catch (refreshError) {
        console.error('Error al refrescar token:', refreshError);
        throw new Error('Su sesión ha expirado. Por favor, inicie sesión de nuevo.');
    }
}

async function fetchWithAuth(endpoint, options = {}, retryCount = 0) {
    const MAX_RETRIES = 1;
    const token = getTokenOrThrow();

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json; charset=UTF-8' })
    };

    const response = await fetch(buildUrl(endpoint, options.version), {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    });

    if (response.status === 403) {
        throw new Error('No tiene permisos para realizar esta acción.');
    }

    // 🔴 FALLBACK: Si llega un 401 (no debería, pero es failsafe)
    if (response.status === 401 && retryCount < MAX_RETRIES) {
        await refreshTokenOnce();
        return fetchWithAuth(endpoint, options, retryCount + 1);
    }

    const responseText = await response.text();

    if (!response.ok) {
        let message = (responseText && responseText.trim()) || `Error ${response.status}: ${response.statusText}`;
        let body = null;
        if (responseText && responseText.trim()) {
            try {
                const parsed = JSON.parse(responseText);
                if (parsed && typeof parsed === 'object') {
                    body = parsed;
                    if (typeof parsed.message === 'string' && parsed.message.trim()) {
                        message = parsed.message.trim();
                    } else if (typeof parsed.error === 'string' && parsed.error.trim()) {
                        message = parsed.error.trim();
                    }
                }
            } catch {
                message = responseText.trim();
            }
        }
        const err = new Error(message);
        err.status = response.status;
        err.body = body;
        throw err;
    }

    if (response.status === 204 || !responseText) {
        return null;
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error("La respuesta del servidor no es un JSON válido.");
    }
}

/**
 * Descarga un archivo binario (ej. exports a Excel) reutilizando la autenticación,
 * el refresh de token en 401 y el manejo de 403 del resto de la app.
 * @param {string} endpoint - Ruta relativa, misma convención que fetchWithAuth (ej. 'fuel/export').
 * @param {string} filename - Nombre con el que se descarga el archivo en el navegador.
 * @param {object} options - { version, headers, ...resto de opciones de fetch }.
 */
export async function download(endpoint, filename, options = {}, retryCount = 0) {
    const MAX_RETRIES = 1;
    const token = getTokenOrThrow();

    const response = await fetch(buildUrl(endpoint, options.version), {
        method: 'GET',
        ...options,
        headers: { 'Authorization': `Bearer ${token}`, ...options.headers }
    });

    if (response.status === 403) {
        throw new Error('No tiene permisos para realizar esta acción.');
    }

    if (response.status === 401 && retryCount < MAX_RETRIES) {
        await refreshTokenOnce();
        return download(endpoint, filename, options, retryCount + 1);
    }

    if (!response.ok) {
        throw new Error(`Error ${response.status}: no se pudo descargar el archivo.`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function getFileUrl(relativePath) {
    if (!relativePath) return null;
    if (relativePath.startsWith('http')) return relativePath;
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    return `${BASE_URL}/${relativePath}`;
}

export default fetchWithAuth;
