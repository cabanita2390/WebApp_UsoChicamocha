/**
 * @fileoverview Suite de pruebas para el store de autenticación (auth).
 * @description Verifica el funcionamiento del login, logout, verificación de autenticación,
 * refresco de tokens y manejo de errores en el sistema de autenticación.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { auth } from '../stores/auth.js';

// Mock jwt-decode
vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

import { jwtDecode } from 'jwt-decode';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

/**
 * @description Grupo principal de pruebas para el store de autenticación.
 */
describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mocks
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    // Reset fetch
    global.fetch.mockClear();
    // Reset jwtDecode
    jwtDecode.mockClear();
  });

  afterEach(() => {
    // Reset store to initial state if possible
    auth.logout();
  });

  /**
   * @description Pruebas para la función de login.
   */
  describe('login', () => {
    /**
     * @test Inicio de sesión exitoso con credenciales válidas y rol permitido.
     */
    it('logs in successfully with valid credentials and allowed role', async () => {
      const mockResponse = {
        status: 'success',
        jwt: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
      };
      const decodedPayload = {
        sub: 'testuser',
        role: 'ROLE_ADMIN',
        exp: Date.now() / 1000 + 3600,
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      jwtDecode.mockReturnValue(decodedPayload);

      const result = await auth.login('testuser', 'password');

      expect(result.success).toBe(true);
      expect(result.error).toBe(null);
      expect(global.fetch).toHaveBeenCalledWith('https://back-test.usochicamocha.co/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'password' }),
      });
      expect(jwtDecode).toHaveBeenCalledWith('mockAccessToken');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'mockAccessToken');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refreshToken', 'mockRefreshToken');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('userName', 'testuser');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('userRole', 'ADMIN');

      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(true);
      expect(storeState.currentUser).toEqual({ name: 'testuser', role: 'ADMIN' });
    });

    /**
     * @test Fallo en el login con credenciales incorrectas.
     */
    it('fails login with incorrect credentials', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const result = await auth.login('wronguser', 'wrongpass');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Incorrect username or password.');
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(false);
    });

    /**
     * @test Fallo en el login con rol no permitido.
     */
    it('fails login with disallowed role', async () => {
      const mockResponse = {
        status: 'success',
        jwt: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
      };
      const decodedPayload = {
        sub: 'testuser',
        role: 'ROLE_USER',
        exp: Date.now() / 1000 + 3600,
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      jwtDecode.mockReturnValue(decodedPayload);

      const result = await auth.login('testuser', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Acceso denegado. Usa la app móvil 📱');
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(false);
    });

    /**
     * @test Manejo de error de red durante el login.
     */
    it('handles network error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const result = await auth.login('testuser', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  /**
   * @description Pruebas para la función de logout.
   */
  describe('logout', () => {
    /**
     * @test Limpia la sesión y resetea el store.
     */
    it('clears session and resets store', () => {
      // Set some initial state
      localStorageMock.setItem('accessToken', 'token');
      localStorageMock.setItem('refreshToken', 'refresh');
      localStorageMock.setItem('userName', 'user');
      localStorageMock.setItem('userRole', 'role');

      auth.logout();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refreshToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userName');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('userRole');

      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(false);
      expect(storeState.currentUser).toBe(null);
    });
  });

  /**
   * @description Pruebas para la función de verificación de autenticación.
   */
  describe('checkAuth', () => {
    /**
     * @test Retorna true con token válido.
     */
    it('returns true with valid token', async () => {
      const decodedPayload = {
        sub: 'testuser',
        exp: Date.now() / 1000 + 3600,
      };
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'validToken';
        if (key === 'userRole') return 'ADMIN';
        return null;
      });
      jwtDecode.mockReturnValue(decodedPayload);

      const result = await auth.checkAuth();

      expect(result).toBe(true);
      expect(jwtDecode).toHaveBeenCalledWith('validToken');
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(true);
      expect(storeState.currentUser).toEqual({ name: 'testuser', role: 'ADMIN' });
    });

    /**
     * @test Refresca el token si está expirado.
     */
    it('refreshes token if expired', async () => {
      const expiredPayload = {
        sub: 'testuser',
        exp: Date.now() / 1000 - 100,
      };
      const newPayload = {
        sub: 'testuser',
        exp: Date.now() / 1000 + 3600,
      };
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'accessToken') return 'expiredToken';
        if (key === 'refreshToken') return 'refreshToken';
        if (key === 'userRole') return 'ADMIN';
        return null;
      });
      jwtDecode.mockReturnValueOnce(expiredPayload).mockReturnValueOnce(newPayload);
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'newToken' }),
      });

      const result = await auth.checkAuth();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('https://back-test.usochicamocha.co/api/v1/auth/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'refreshToken' }),
      });
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(true);
    });

    /**
     * @test Retorna false si no hay token.
     */
    it('returns false if no token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await auth.checkAuth();

      expect(result).toBe(false);
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(false);
    });

    /**
     * @test Retorna false si falla la decodificación del token.
     */
    it('returns false if token decode fails', async () => {
      localStorageMock.getItem.mockReturnValue('invalidToken');
      jwtDecode.mockImplementation(() => { throw new Error('Invalid token'); });

      const result = await auth.checkAuth();

      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(false);
    });
  });

  /**
   * @description Pruebas para la función de refresco de token.
   */
  describe('refreshToken', () => {
    /**
     * @test Refresca el token exitosamente.
     */
    it('refreshes token successfully', async () => {
      const newPayload = {
        sub: 'testuser',
        exp: Date.now() / 1000 + 3600,
      };
      localStorageMock.getItem.mockReturnValue('refreshToken');
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'newToken' }),
      });
      jwtDecode.mockReturnValue(newPayload);

      const result = await auth.refreshToken();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('https://back-test.usochicamocha.co/api/v1/auth/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'refreshToken' }),
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('accessToken', 'newToken');
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(true);
    });

    /**
     * @test Falla el refresco si no hay token de refresco.
     */
    it('fails to refresh if no refresh token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await auth.refreshToken();

      expect(result).toBe(false);
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(false);
    });

    /**
     * @test Falla el refresco en caso de error del servidor.
     */
    it('fails to refresh on server error', async () => {
      localStorageMock.getItem.mockReturnValue('refreshToken');
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid refresh token'),
      });

      const result = await auth.refreshToken();

      expect(result).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('accessToken');
      const storeState = get(auth);
      expect(storeState.isAuthenticated).toBe(false);
    });
  });
});