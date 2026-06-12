import { auth } from './auth';

async function fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        throw new Error('Sesión no válida. Por favor, inicie sesión de nuevo.');
    }

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json; charset=UTF-8' })
    };

    const BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const apiVersion = options.version === undefined ? 'v1' : options.version;
    const path = apiVersion ? `/api/${apiVersion}/${endpoint}` : `/api/${endpoint}`;


    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    });
    

    if (response.status === 403) {

        throw new Error('No tiene permisos para realizar esta acción.');
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
                // Cuerpo plano (p. ej. Spring devuelve texto con el motivo del 400/409)
                message = responseText.trim();
            }
        }
        const err = new Error(message);
        err.status = response.status;
        err.body = body;
        throw err;
    }

    if (response.status === 204 || !responseText) {
        return null; // Maneja respuestas sin contenido
    }

    try {
        return JSON.parse(responseText);
    } catch (e) {
        throw new Error("La respuesta del servidor no es un JSON válido.");
    }
}

export function getFileUrl(relativePath) {
    if (!relativePath) return null;
    if (relativePath.startsWith('http')) return relativePath;
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    return `${BASE_URL}/${relativePath}`;
}

export default fetchWithAuth;
