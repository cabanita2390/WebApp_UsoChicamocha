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

  /**
   * @description Cambiar de "tipo" rápido (pills de Rendimiento / Tanqueo y
   * Distribución) deja dos peticiones en vuelo a la vez. Si la más vieja
   * resuelve después de la más nueva (jitter de red), no debe pisar el store
   * con datos del tipo anterior — antes de este fix, sí lo hacía, y la
   * pantalla parecía "no cargar" hasta volver a cambiar de tipo.
   *
   * Rendimiento ya no pide un tipo a la vez (fetchFuelPerformance) — pide los 3
   * juntos con fetchFuelPerformanceAllTipos, así que cambiar de pill no dispara
   * ninguna petición nueva. La guarda de orden sigue haciendo falta para el caso
   * de doble-click en "Filtrar" (dos llamadas completas, cada una con sus 3
   * peticiones internas, en vuelo a la vez).
   */
  describe('fetchFuelPerformanceAllTipos — orden de respuestas', () => {
    it('descarta una respuesta vieja que resuelve después de una más nueva', async () => {
      const resolvers = [];
      fetchWithAuth.mockImplementation(() => new Promise((res) => { resolvers.push(res); }));

      const oldRequest = data.fetchFuelPerformanceAllTipos('2026-01-01', '2026-01-31');
      const newRequest = data.fetchFuelPerformanceAllTipos('2026-02-01', '2026-02-28');

      // Cada llamada pide los 3 tipos en paralelo: [0-2] = la vieja, [3-5] = la nueva.
      expect(resolvers).toHaveLength(6);

      resolvers[3]([{ id: 'new-maq' }]);
      resolvers[4]([{ id: 'new-veh' }]);
      resolvers[5]([{ id: 'new-moto' }]);
      await newRequest;

      resolvers[0]([{ id: 'old-maq' }]);
      resolvers[1]([{ id: 'old-veh' }]);
      resolvers[2]([{ id: 'old-moto' }]);
      await oldRequest;

      expect(get(data).fuelPerformance).toEqual({
        MAQUINARIA: [{ id: 'new-maq' }],
        VEHICULO: [{ id: 'new-veh' }],
        MOTOCICLETA: [{ id: 'new-moto' }],
      });
    });
  });

  describe('fetchRefuelingReport — orden de respuestas', () => {
    it('descarta una respuesta vieja que resuelve después de una más nueva', async () => {
      let resolveOld, resolveNew;
      fetchWithAuth
        .mockReturnValueOnce(new Promise((res) => { resolveOld = res; }))
        .mockReturnValueOnce(new Promise((res) => { resolveNew = res; }));

      const oldRequest = data.fetchRefuelingReport('MAQUINARIA_MOTO', 'TODAS');
      const newRequest = data.fetchRefuelingReport('VEHICULO', 'TODAS');

      resolveNew([{ id: 2, vehicleId: 10 }]);
      await newRequest;
      resolveOld([{ id: 1, machineId: 5 }]);
      await oldRequest;

      expect(get(data).fuelRefuelingReport).toEqual([{ id: 2, vehicleId: 10 }]);
    });
  });
});