import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAssetCrud } from '../stores/data/assetCrud.js';

/** Store en memoria mínima, suficiente para ejercitar update()/get del estado. */
function makeDeps(initialState) {
  let state = initialState;
  const update = vi.fn((fn) => {
    state = fn(state);
  });
  const setLoading = vi.fn((value, key) => {
    state = { ...state, [key]: value };
  });
  const setError = vi.fn((message, { loadingKey, errorKey }) => {
    state = { ...state, [errorKey]: message, [loadingKey]: false };
  });
  const unwrapEntityList = vi.fn((v) => (Array.isArray(v) ? v : v?.content ?? []));
  const enrichVehicleUbicacionRow = vi.fn((row) => ({ ...row, enriched: true }));
  const fetchWithAuth = vi.fn();

  return {
    getState: () => state,
    deps: { update, setLoading, setError, unwrapEntityList, enrichVehicleUbicacionRow, fetchWithAuth },
    fetchWithAuth,
  };
}

describe('createAssetCrud', () => {
  let getState, deps, fetchWithAuth, crud;

  beforeEach(() => {
    ({ getState, deps, fetchWithAuth } = makeDeps({
      vehicles: [],
      isLoadingVehicles: false,
      errorVehicles: null,
      locations: [],
    }));
    crud = createAssetCrud(
      { entity: 'vehicle', endpoint: 'vehicle', loadingKey: 'isLoadingVehicles', errorKey: 'errorVehicles' },
      deps,
    );
  });

  it('fetchAll() pide el endpoint, enriquece la lista y guarda en el estado bajo "vehicles"', async () => {
    fetchWithAuth.mockResolvedValue([{ id: 1, placa: 'ABC123' }]);

    const result = await crud.fetchAll();

    expect(fetchWithAuth).toHaveBeenCalledWith('vehicle');
    expect(result).toEqual([{ id: 1, placa: 'ABC123', enriched: true }]);
    expect(getState().vehicles).toEqual([{ id: 1, placa: 'ABC123', enriched: true }]);
    expect(getState().isLoadingVehicles).toBe(false);
    expect(getState().errorVehicles).toBeNull();
  });

  it('fetchAll() cuando falla deja el error en la clave correcta y relanza', async () => {
    fetchWithAuth.mockRejectedValue(new Error('Network down'));

    await expect(crud.fetchAll()).rejects.toThrow('Network down');
    expect(getState().errorVehicles).toBe('Network down');
    expect(getState().isLoadingVehicles).toBe(false);
  });

  it('create() agrega el registro creado (enriquecido) a la lista', async () => {
    fetchWithAuth.mockResolvedValue({ id: 2, placa: 'XYZ789' });

    const created = await crud.create({ placa: 'XYZ789' });

    expect(fetchWithAuth).toHaveBeenCalledWith('vehicle', { method: 'POST', body: JSON.stringify({ placa: 'XYZ789' }) });
    expect(created).toEqual({ id: 2, placa: 'XYZ789', enriched: true });
    expect(getState().vehicles).toEqual([{ id: 2, placa: 'XYZ789', enriched: true }]);
  });

  it('update() reemplaza solo el registro con ese id', async () => {
    deps.update((s) => ({ ...s, vehicles: [{ id: 1, placa: 'OLD' }, { id: 2, placa: 'KEEP' }] }));
    fetchWithAuth.mockResolvedValue({ id: 1, placa: 'NEW' });

    await crud.update(1, { placa: 'NEW' });

    expect(fetchWithAuth).toHaveBeenCalledWith('vehicle/1', { method: 'PUT', body: JSON.stringify({ placa: 'NEW' }) });
    expect(getState().vehicles).toEqual([
      { id: 1, placa: 'NEW', enriched: true },
      { id: 2, placa: 'KEEP' },
    ]);
  });

  it('remove() llama DELETE y quita el registro de la lista', async () => {
    deps.update((s) => ({ ...s, vehicles: [{ id: 1 }, { id: 2 }] }));
    fetchWithAuth.mockResolvedValue(undefined);

    await crud.remove(1);

    expect(fetchWithAuth).toHaveBeenCalledWith('vehicle/1', { method: 'DELETE' });
    expect(getState().vehicles).toEqual([{ id: 2 }]);
  });

  it('restore() agrega el registro restaurado (enriquecido) a la lista', async () => {
    fetchWithAuth.mockResolvedValue({ id: 3, placa: 'RESTORED' });

    const restored = await crud.restore(3);

    expect(fetchWithAuth).toHaveBeenCalledWith('vehicle/3/restore', { method: 'POST' });
    expect(restored).toEqual({ id: 3, placa: 'RESTORED', enriched: true });
    expect(getState().vehicles).toEqual([{ id: 3, placa: 'RESTORED', enriched: true }]);
  });

  it('funciona igual para otra entidad (moto) con su propio endpoint y claves', async () => {
    ({ getState, deps, fetchWithAuth } = makeDeps({ motos: [], isLoadingMotos: false, errorMotos: null, locations: [] }));
    const motoCrud = createAssetCrud(
      { entity: 'moto', endpoint: 'moto', loadingKey: 'isLoadingMotos', errorKey: 'errorMotos' },
      deps,
    );
    fetchWithAuth.mockResolvedValue([{ id: 9, placa: 'MOT001' }]);

    await motoCrud.fetchAll();

    expect(fetchWithAuth).toHaveBeenCalledWith('moto');
    expect(getState().motos).toEqual([{ id: 9, placa: 'MOT001', enriched: true }]);
    // no debe tocar la clave de vehículos, esa entidad no existe en este estado
    expect(getState().vehicles).toBeUndefined();
  });
});
