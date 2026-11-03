import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { data } from '../stores/data.js';

vi.mock('../stores/api.js', () => ({
  default: vi.fn(),
  conAccesoArchivo: (url) => url,
}));

import fetchWithAuth from '../stores/api.js';

const PERFIL = { id: 1, nombre: 'Moto', aplicaA: 'MOTOCICLETA', descripcion: null, posiciones: [] };

describe('presión de llantas — store', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    fetchWithAuth.mockResolvedValueOnce([PERFIL]).mockResolvedValueOnce([
      { vehicleId: 30, machineId: null, perfilId: 1 },
      { vehicleId: null, machineId: 8, perfilId: 2 },
    ]);
    await data.fetchTireProfiles();
    await data.fetchTireAssignments();
  });

  it('carga perfiles y asignaciones de /tire', () => {
    expect(fetchWithAuth).toHaveBeenNthCalledWith(1, 'tire/perfiles');
    expect(fetchWithAuth).toHaveBeenNthCalledWith(2, 'tire/asignaciones');
    expect(get(data).tireProfiles).toEqual([PERFIL]);
    expect(get(data).tireAssignments).toHaveLength(2);
  });

  it('crear y editar un perfil actualiza la lista', async () => {
    fetchWithAuth.mockResolvedValueOnce({ ...PERFIL, id: 2, nombre: 'Volqueta' });
    await data.createTireProfile({ nombre: 'Volqueta' });
    expect(fetchWithAuth).toHaveBeenLastCalledWith('tire/perfiles', { method: 'POST', body: JSON.stringify({ nombre: 'Volqueta' }) });

    fetchWithAuth.mockResolvedValueOnce({ ...PERFIL, nombre: 'Moto 2 llantas' });
    await data.updateTireProfile(1, { nombre: 'Moto 2 llantas' });
    expect(get(data).tireProfiles.map((p) => p.nombre)).toEqual(['Moto 2 llantas', 'Volqueta']);

    fetchWithAuth.mockResolvedValueOnce(null);
    await data.deleteTireProfile(2);
    expect(fetchWithAuth).toHaveBeenLastCalledWith('tire/perfiles/2', { method: 'DELETE' });
    expect(get(data).tireProfiles.map((p) => p.id)).toEqual([1]);
  });

  it('asignar reemplaza la asignación del activo y null (204) la quita', async () => {
    fetchWithAuth.mockResolvedValueOnce({ vehicleId: 30, machineId: null, perfilId: 3 });
    await data.assignTireProfileVehicle(30, 3);
    expect(fetchWithAuth).toHaveBeenLastCalledWith('tire/asignaciones/vehicle/30', { method: 'PUT', body: JSON.stringify({ perfilId: 3 }) });
    expect(get(data).tireAssignments.filter((a) => a.vehicleId === 30)).toEqual([{ vehicleId: 30, machineId: null, perfilId: 3 }]);

    fetchWithAuth.mockResolvedValueOnce(null);
    await data.assignTireProfileMachine(8, null);
    expect(fetchWithAuth).toHaveBeenLastCalledWith('tire/asignaciones/machine/8', { method: 'PUT', body: JSON.stringify({ perfilId: null }) });
    expect(get(data).tireAssignments.some((a) => a.machineId === 8)).toBe(false);
  });
});
