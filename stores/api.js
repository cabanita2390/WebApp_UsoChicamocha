import { auth } from './auth';

async function fetchWithAuth(endpoint, options = {}) {

    await auth.checkAuth();

    const token = localStorage.getItem('accessToken');

    if (!token) {
        throw new Error('Sesión no válida. Por favor, inicie sesión de nuevo.');
    }

    const defaultHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
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
        try {
            const errorJson = JSON.parse(responseText);
            throw { status: response.status, message: errorJson.message || responseText };
        } catch (e) {
            throw { status: response.status, message: responseText || `Error ${response.status}: ${response.statusText}` };
        }
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

export default fetchWithAuth;
