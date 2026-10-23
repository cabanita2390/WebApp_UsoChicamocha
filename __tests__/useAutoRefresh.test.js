/**
 * @fileoverview Caso 4 de la auditoría de deuda técnica: la guarda de
 * useAutoRefresh.js contra fetches duplicados comprobaba el `isLoading`
 * global, pero desde que dashboard/vehicleInspections/motoInspections/
 * vehicles/motos tienen su propio isLoading por dominio (ver
 * stores/data/core.js), ese global ya no lo tocan — la guarda quedaría
 * siempre en falso (nunca bloquea) si no se actualiza para leer los
 * dominios correctos según la ruta.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockLocation, mockDataStore, mockAuthStore } = vi.hoisted(() => {
  function makeSimpleStore(initialValue) {
    let value = initialValue;
    let listener = null;
    return {
      subscribe(cb) { listener = cb; cb(value); return () => { listener = null; }; },
      set(next) { value = next; if (listener) listener(value); },
    };
  }

  return {
    mockLocation: makeSimpleStore('/'),
    mockDataStore: {
      subscribe: (cb) => { cb(globalThis.__mockDataState); return () => {}; },
      fetchDashboardData: vi.fn().mockResolvedValue(),
      fetchVehicleInspections: vi.fn().mockResolvedValue(),
      fetchMotoInspections: vi.fn().mockResolvedValue(),
      fetchVehicles: vi.fn().mockResolvedValue(),
      fetchMotos: vi.fn().mockResolvedValue(),
    },
    mockAuthStore: {
      subscribe: (cb) => { cb({ isAuthenticated: true }); return () => {}; },
    },
  };
});

vi.mock('svelte-spa-router', () => ({ location: mockLocation }));
vi.mock('../stores/data.js', () => ({ data: mockDataStore }));
vi.mock('../stores/auth.js', () => ({ auth: mockAuthStore }));

import { startAutoRefresh, stopAutoRefresh, isAutoRefreshEnabled } from '../composables/useAutoRefresh.js';

describe('useAutoRefresh — guarda por dominio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    isAutoRefreshEnabled.set(true);
    mockLocation.set('/');
    globalThis.__mockDataState = {
      dashboard: { currentPage: 0, pageSize: 20 },
      vehicleInspections: { currentPage: 0, pageSize: 20 },
      isLoadingDashboard: false,
      isLoadingVehicleInspections: false,
      isLoadingMotoInspections: false,
      isLoadingVehicles: false,
      isLoadingMotos: false,
    };
  });

  afterEach(() => {
    stopAutoRefresh();
    vi.useRealTimers();
    delete globalThis.__mockDataState;
  });

  it('en Dashboard, refresca cuando ningún dominio de dashboard/inspecciones está cargando', async () => {
    startAutoRefresh();
    await vi.advanceTimersByTimeAsync(60000);

    expect(mockDataStore.fetchDashboardData).toHaveBeenCalled();
    expect(mockDataStore.fetchVehicleInspections).toHaveBeenCalled();
    expect(mockDataStore.fetchMotoInspections).toHaveBeenCalled();
  });

  it('en Dashboard, NO refresca si isLoadingVehicleInspections ya está en true', async () => {
    globalThis.__mockDataState.isLoadingVehicleInspections = true;

    startAutoRefresh();
    await vi.advanceTimersByTimeAsync(60000);

    expect(mockDataStore.fetchDashboardData).not.toHaveBeenCalled();
  });

  it('en Dashboard, un isLoadingVehicles=true (dominio no relacionado) NO bloquea el refresco', async () => {
    globalThis.__mockDataState.isLoadingVehicles = true;

    startAutoRefresh();
    await vi.advanceTimersByTimeAsync(60000);

    expect(mockDataStore.fetchDashboardData).toHaveBeenCalled();
  });

  it('en Inventario, NO refresca si isLoadingMotos ya está en true', async () => {
    mockLocation.set('/inventory');
    globalThis.__mockDataState.isLoadingMotos = true;

    startAutoRefresh();
    await vi.advanceTimersByTimeAsync(60000);

    expect(mockDataStore.fetchVehicles).not.toHaveBeenCalled();
    expect(mockDataStore.fetchMotos).not.toHaveBeenCalled();
  });
});
