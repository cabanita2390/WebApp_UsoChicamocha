/**
 * @fileoverview Suite de pruebas para el store de datos (data).
 * @description Verifica el funcionamiento de las funciones para obtener y manipular datos
 * del dashboard, usuarios, órdenes de trabajo e imágenes de inspección.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { data } from '../stores/data.js';

// Mock import.meta.env
vi.mock('import.meta.env', () => ({
  VITE_API_BASE_URL: 'http://localhost:3000',
}), { virtual: true });

// Mock fetchWithAuth
vi.mock('../stores/api.js', () => ({
  default: vi.fn(),
}));

import fetchWithAuth from '../stores/api.js';

/**
 * @description Grupo principal de pruebas para el store de datos.
 */
describe('data store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    data.subscribe(() => {})(); // Trigger reset if needed
  });

  /**
   * @description Pruebas para la función de obtención de datos del dashboard.
   */
  describe('fetchDashboardData', () => {
    /**
     * @test Obtiene datos del dashboard exitosamente.
     */
    it('fetches dashboard data successfully', async () => {
      const mockResponse = {
        content: [{ id: 1, name: 'Inspection 1' }],
        totalPages: 1,
        totalElements: 1,
        number: 0,
        size: 20,
      };
      fetchWithAuth.mockResolvedValue(mockResponse);

      const result = await data.fetchDashboardData(0, 20);

      expect(fetchWithAuth).toHaveBeenCalledWith('inspection?page=0&size=20');
      expect(result).toEqual({
        data: mockResponse.content,
        totalPages: 1,
        totalElements: 1,
        currentPage: 0,
        pageSize: 20,
      });
    });

    /**
     * @test Maneja errores de obtención de datos.
     */
    it('handles fetch error', async () => {
      const errorMessage = 'Network error';
      fetchWithAuth.mockRejectedValue(new Error(errorMessage));

      await expect(data.fetchDashboardData()).rejects.toThrow(errorMessage);
    });
  });

  /**
   * @description Pruebas para la función de obtención de usuarios.
   */
  describe('fetchUsers', () => {
    /**
     * @test Obtiene usuarios exitosamente.
     */
    it('fetches users successfully', async () => {
      const mockUsers = [{ id: 1, name: 'User 1' }];
      fetchWithAuth.mockResolvedValue({ users: mockUsers });

      const result = await data.fetchUsers();

      expect(fetchWithAuth).toHaveBeenCalledWith('user');
      expect(result).toEqual(mockUsers);
    });
  });

  /**
   * @description Pruebas para la función de creación de usuario.
   */
  describe('createUser', () => {
    /**
     * @test Crea usuario y actualiza el store.
     */
    it('creates user and updates store', async () => {
      const newUser = { name: 'New User' };
      const createdUser = { id: 2, name: 'New User' };
      fetchWithAuth.mockResolvedValue(createdUser);

      await data.createUser(newUser);

      expect(fetchWithAuth).toHaveBeenCalledWith('user', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
    });
  });

  /**
   * @description Pruebas para la función de obtención de imágenes de inspección.
   */
  describe('fetchInspectionImages', () => {
    /**
     * @test Obtiene y transforma imágenes.
     */
    it('fetches and transforms images', async () => {
      const mockImages = [
        { id: 1, url: '/images/1.jpg' },
        { id: 2, url: '/images/2.jpg' },
      ];
      fetchWithAuth.mockResolvedValue(mockImages);

      const result = await data.fetchInspectionImages(1);

      expect(fetchWithAuth).toHaveBeenCalledWith('inspection/1/images');
      expect(result).toEqual([
        { id: 1, url: 'https://back-test.usochicamocha.co/images/1.jpg' },
        { id: 2, url: 'https://back-test.usochicamocha.co/images/2.jpg' },
      ]);
    });

    /**
     * @test Retorna arreglo vacío si no hay imágenes.
     */
    it('returns empty array if no images', async () => {
      fetchWithAuth.mockResolvedValue(null);

      const result = await data.fetchInspectionImages(1);

      expect(result).toEqual([]);
    });
  });

  /**
   * @description deleteOil no existía en el store (bug real: el botón "Eliminar"
   * de OilManagement.svelte llamaba a una función inexistente). El backend ya
   * tenía el endpoint DELETE /api/v1/oil/brand/{id} completo.
   */
  describe('deleteOil', () => {
    it('llama al endpoint DELETE y quita el aceite del store', async () => {
      fetchWithAuth.mockResolvedValue(undefined);

      await data.deleteOil(5);

      expect(fetchWithAuth).toHaveBeenCalledWith('oil/brand/5', { method: 'DELETE' });
      expect(get(data).oils.find(o => o.id === 5)).toBeUndefined();
    });
  });

  /**
   * @description Las motos viven en la misma tabla `vehiculos` que los carros — el
   * historial de cambio de aceite lo sirve el mismo endpoint de vehículo para
   * cualquier placa, no hay una ruta separada `/moto/{placa}/oil-change-history`
   * en el backend (confirmado: no existe ningún controller con esa ruta).
   */
  describe('fetchMotoOilHistory', () => {
    it('llama al mismo endpoint de historial de vehículo (las motos comparten tabla vehiculos)', async () => {
      fetchWithAuth.mockResolvedValue([]);

      await data.fetchMotoOilHistory('XMX28F');

      expect(fetchWithAuth).toHaveBeenCalledWith('vehicle/oil-change/history/XMX28F');
    });
  });
});