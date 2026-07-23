import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AssetFuelConfigManagement from '../../components/views/AssetFuelConfigManagement.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchAssetFuelConfig: vi.fn(),
    updateAssetFuelConfigVehicle: vi.fn().mockResolvedValue({ id: 1 }),
    updateAssetFuelConfigMachine: vi.fn().mockResolvedValue({ id: 2 }),
  },
}));

vi.mock('../shared/DataGrid.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

vi.mock('../shared/Loader.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';

describe('AssetFuelConfigManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelAssetConfig: [],
        fuelTypes: [
          { id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' },
          { id: 4, codigo: 'GAS', nombre: 'Gas natural vehicular', unidadMedida: 'M3' },
        ],
        isLoading: false,
      });
      return () => {};
    });
  });

  it('el formulario está detrás de un modal, oculto hasta que se pide configurar', () => {
    render(AssetFuelConfigManagement);
    expect(screen.queryByLabelText(/combustible/i)).toBeNull();
    expect(screen.getByRole('button', { name: /\+ configurar/i })).toBeTruthy();
  });

  it('calcula la unidad de consumo automáticamente según tipo de activo y combustible (vehículo + gas = KM_POR_M3)', async () => {
    render(AssetFuelConfigManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ configurar/i }));

    await fireEvent.change(screen.getByLabelText(/tipo de activo/i), { target: { value: 'VEHICULO' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

    expect(screen.getByText(/KM_POR_M3/)).toBeTruthy();
  });

  it('calcula la unidad de consumo automáticamente (máquina + gasolina = GAL_POR_HORA)', async () => {
    render(AssetFuelConfigManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ configurar/i }));

    await fireEvent.change(screen.getByLabelText(/tipo de activo/i), { target: { value: 'MAQUINA' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });

    expect(screen.getByText(/GAL_POR_HORA/)).toBeTruthy();
  });

  it('envía la configuración de vehículo con la unidad calculada', async () => {
    render(AssetFuelConfigManagement);
    await fireEvent.click(screen.getByRole('button', { name: /\+ configurar/i }));

    await fireEvent.change(screen.getByLabelText(/tipo de activo/i), { target: { value: 'VEHICULO' } });
    await fireEvent.input(screen.getByLabelText(/id del activo/i), { target: { value: '5' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '30' } });

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.updateAssetFuelConfigVehicle).toHaveBeenCalledWith(5, {
      fuelTypeDefaultId: 1,
      consumoEstandar: 30,
      unidadConsumo: 'KM_POR_GALON',
      tanqueCapacidadGal: null,
    });
  });
});
