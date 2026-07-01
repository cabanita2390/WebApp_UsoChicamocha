import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fetchWithAuth from '../stores/api.js';

/**
 * @fileoverview Suite de tests para la función fetchWithAuth.
 * @description Se encarga de verificar que el wrapper de fetch maneje correctamente
 * la autenticación, los headers, las versiones de la API y los diferentes
 * tipos de respuesta (éxito, errores, sin contenido, etc.).
 */

// Mock del módulo de autenticación.
// Se simula la función `checkAuth` para no ejecutar la lógica real de autenticación.
vi.mock('../stores/auth.js', () => ({
  auth: {
    checkAuth: vi.fn(), // vi.fn() crea una función espía para rastrear sus llamadas.
  },
}));

import { auth } from '../stores/auth.js';

// Mock de la función `fetch` global.
// Esto evita que se realicen llamadas de red reales. En su lugar, podemos
// definir qué debe devolver `fetch` en cada test.
global.fetch = vi.fn();

// Mock del `localStorage` del navegador.
// Permite controlar qué token de acceso se "almacena" sin usar el almacenamiento real.
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// describe agrupa un conjunto de tests relacionados.
describe('fetchWithAuth', () => {
  
  // `beforeEach` se ejecuta antes de cada test (`it`).
  // Es útil para limpiar y resetear los mocks, asegurando que cada test
  // comience desde un estado limpio e independiente.
  beforeEach(() => {
    vi.clearAllMocks(); // Limpia el historial de llamadas de todos los mocks.
    // Configuración por defecto para el "camino feliz":
    auth.checkAuth.mockResolvedValue(true); // Simula que la autenticación es exitosa.
    localStorageMock.getItem.mockReturnValue('mockToken'); // Simula que hay un token guardado.
    global.fetch.mockClear(); // Limpia solo el mock de fetch.
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080'); // URL base determinística para los tests.
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // --- Casos de Prueba ---

  /**
   * @test Caso exitoso (Happy Path).
   * @description Verifica que la función construye y ejecuta correctamente una petición
   * autenticada cuando todo está en orden.
   */
  it('makes authenticated request successfully', async () => {
    const mockResponse = { data: 'test' };
    // Se configura `fetch` para que devuelva una respuesta exitosa (200 OK) con un cuerpo JSON.
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    });

    const result = await fetchWithAuth('test/endpoint');

    // Se realizan las aserciones (expect) para verificar que todo ocurrió como se esperaba:
    // Nota: checkAuth ya no se invoca por request; el refresh de token es proactivo (monitor en segundo plano).
    expect(localStorageMock.getItem).toHaveBeenCalledWith('accessToken'); // Se obtuvo el token.
    expect(global.fetch).toHaveBeenCalledWith( // Se llamó a fetch con la URL y headers correctos.
      'http://localhost:8080/api/v1/test/endpoint',
      {
        headers: {
          'Authorization': 'Bearer mockToken',
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }
    );
    expect(result).toEqual(mockResponse); // La función devolvió los datos parseados.
  });

  /**
   * @test Manejo de error 403 (Prohibido).
   * @description Verifica que la función lanza un error específico y amigable
   * cuando la API responde con un estado 403.
   */
  it('handles 403 forbidden error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    });

    // Se espera que la promesa sea rechazada (`rejects`) con un mensaje de error específico.
    await expect(fetchWithAuth('test/endpoint')).rejects.toThrow('No tiene permisos para realizar esta acción.');
  });

  /**
   * @test Manejo de otros errores del servidor.
   * @description Prueba que la función maneja correctamente errores genéricos (ej. 500)
   * y lanza un error con el mensaje devuelto por el servidor.
   */
  it('handles other error responses', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Server error'),
    });

    await expect(fetchWithAuth('test/endpoint')).rejects.toThrow('Server error');
  });

  /**
   * @test Manejo de errores con cuerpo JSON.
   * @description Verifica que si el servidor devuelve un error con un cuerpo JSON
   * (práctica común en APIs REST), se extrae el mensaje de dicho JSON.
   */
  it('handles JSON error responses', async () => {
    const errorResponse = { message: 'Validation error' };
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify(errorResponse)),
    });

    await expect(fetchWithAuth('test/endpoint')).rejects.toThrow('Validation error');
  });

  /**
   * @test Manejo de respuesta 204 (Sin Contenido).
   * @description Asegura que si la API responde con 204, la función devuelve `null`
   * en lugar de intentar parsear un cuerpo vacío, lo cual daría un error.
   */
  it('returns null for 204 no content', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    const result = await fetchWithAuth('test/endpoint');
    expect(result).toBe(null);
  });

  /**
   * @test Manejo de respuesta con JSON inválido.
   * @description Verifica que la función lanza un error claro si la respuesta del servidor
   * es exitosa pero el cuerpo no es un JSON válido.
   */
  it('throws error for invalid JSON response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('invalid json'), // Texto que no es JSON
    });

    await expect(fetchWithAuth('test/endpoint')).rejects.toThrow("La respuesta del servidor no es un JSON válido.");
  });

  /**
   * @test Error cuando no hay token.
   * @description Simula un escenario donde el usuario no está autenticado (no hay token
   * en localStorage) y verifica que se lanza un error antes de hacer la llamada a la API.
   */
  it('throws error if no token', async () => {
    localStorageMock.getItem.mockReturnValue(null); // No hay token

    await expect(fetchWithAuth('test/endpoint')).rejects.toThrow('Sesión no válida. Por favor, inicie sesión de nuevo.');
  });

  /**
   * @test Uso de una versión de API personalizada.
   * @description Verifica que se puede especificar una versión de API diferente a la
   * por defecto ('v1') y que la URL se construye correctamente.
   */
  it('uses custom version', async () => {
    // ... configuración de fetch ...
    global.fetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') });

    await fetchWithAuth('test/endpoint', { version: 'v2' });

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/v2/test/endpoint', expect.any(Object));
  });

  /**
   * @test Uso sin versión de API.
   * @description Comprueba que si `version` se pasa como `null`, la URL se
   * construye sin el prefijo de versión.
   */
  it('uses no version if specified', async () => {
    // ... configuración de fetch ...
     global.fetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') });
    
    await fetchWithAuth('test/endpoint', { version: null });

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/test/endpoint', expect.any(Object));
  });

  /**
   * @test Fusión de headers personalizados.
   * @description Asegura que los headers por defecto (Authorization, Content-Type)
   * se combinan correctamente con cualquier header personalizado que se pase en las opciones.
   */
  it('merges custom headers', async () => {
    // ... configuración de fetch ...
    global.fetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('{}') });

    await fetchWithAuth('test/endpoint', {
      headers: { 'Custom-Header': 'value' },
    });

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/v1/test/endpoint', {
      headers: {
        'Authorization': 'Bearer mockToken',
        'Content-Type': 'application/json; charset=UTF-8',
        'Custom-Header': 'value', // El header personalizado está presente
      },
    });
  });
});