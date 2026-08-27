import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import MotoManagement from '../../components/views/MotoManagement.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchMotos: vi.fn(),
    fetchVehicleBrands: vi.fn(),
    fetchVehicleTypes: vi.fn(),
    fetchAreas: vi.fn(),
    fetchLocations: vi.fn(),
    createMoto: vi.fn(),
    updateMoto: vi.fn(),
    deleteMoto: vi.fn(),
    fetchVehicleCurriculum: vi.fn(),
    createVehicleBrand: vi.fn(),
    createCatalogItem: vi.fn(),
    uploadVehicleDocumentFile: vi.fn(),
    updateVehicleDocument: vi.fn(),
    getVehicleDocumentHistory: vi.fn(),
    getMotoByPlaca: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchAssetFuelConfig: vi.fn(),
    updateAssetFuelConfigVehicle: vi.fn(),
  },
}));

vi.mock('../../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

vi.mock('../../stores/auth.js', () => ({
  auth: {
    subscribe: vi.fn((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    }),
  },
}));

vi.mock('../../config/table-definitions.js', () => ({
  motoInventoryColumns: [
    { accessorKey: 'placa', header: 'Placa' },
    { accessorKey: 'marca', header: 'Marca' },
  ],
  curriculumColumns: [
    { accessorKey: 'descripcion', header: 'Descripción' },
  ],
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

vi.mock('@/lib/textFormat.js', () => ({
  formatMotoVehiclePayload: vi.fn((v) => v),
}));

import { data } from '../../stores/data.js';

describe('MotoManagement', () => {
  let mockDataStore;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataStore = {
      motos: [],
      vehicleBrands: [],
      vehicleTypes: [{ id: 1, name: 'MOTOCICLETA' }],
      areas: [],
      locations: [],
      fuelTypes: [
        { id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' },
        { id: 4, codigo: 'GAS', nombre: 'Gas natural vehicular', unidadMedida: 'M3' },
      ],
      fuelAssetConfig: [],
      isLoading: false,
      error: null,
    };

    data.subscribe.mockImplementation((callback) => {
      callback(mockDataStore);
      return () => {};
    });

    data.fetchMotos.mockResolvedValue();
    data.fetchVehicleBrands.mockResolvedValue();
    data.fetchVehicleTypes.mockResolvedValue();
    data.fetchAreas.mockResolvedValue();
    data.fetchLocations.mockResolvedValue();
    data.fetchFuelTypes.mockResolvedValue();
    data.fetchAssetFuelConfig.mockResolvedValue();
    data.updateAssetFuelConfigVehicle.mockResolvedValue({});
  });

  it('muestra el estado de carga cuando está cargando sin motos', async () => {
    mockDataStore.isLoading = true;
    mockDataStore.motos = [];

    render(MotoManagement);
    await tick();

    expect(screen.queryByText('Refrescar')).toBeNull();
  });

  it('muestra la interfaz de gestión cuando hay motos', async () => {
    mockDataStore.motos = [
      { id: 1, placa: 'MTO001', marca: 'Honda' },
    ];

    render(MotoManagement);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  it('renderiza el formulario de registro de moto', async () => {
    mockDataStore.motos = [];

    render(MotoManagement);
    await tick();

    const placaInput = screen.getByPlaceholderText('Ej: ABC12D');
    expect(placaInput).toBeTruthy();
  });

  it('llama fetchMotos al hacer clic en Refrescar', async () => {
    mockDataStore.motos = [{ id: 1, placa: 'MTO001' }];

    render(MotoManagement);
    await tick();

    await fireEvent.click(screen.getByText('Refrescar'));

    expect(data.fetchMotos).toHaveBeenCalled();
  });

  it('crea una nueva moto exitosamente', async () => {
    mockDataStore.motos = [];
    data.createMoto.mockResolvedValue({ id: 2, placa: 'MTO999' });

    const { container } = render(MotoManagement);
    await tick();

    const placaInput = screen.getByPlaceholderText('Ej: ABC12D');
    await fireEvent.input(placaInput, { target: { value: 'MTO999' } });

    const form = container.querySelector('form.create-form');
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(data.createMoto).toHaveBeenCalled();
    });
  });

  it('al crear una moto con combustible + consumo estándar, también guarda el consumo estándar del activo (mismo endpoint que vehículos)', async () => {
    mockDataStore.motos = [];
    data.createMoto.mockResolvedValue({ id: 2, placa: 'MTO999' });

    const { container } = render(MotoManagement);
    await tick();

    await fireEvent.input(screen.getByPlaceholderText('Ej: ABC12D'), { target: { value: 'MTO999' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '85' } });

    await fireEvent.submit(container.querySelector('form.create-form'));

    await waitFor(() => {
      expect(data.updateAssetFuelConfigVehicle).toHaveBeenCalledWith(2, {
        fuelTypeDefaultId: 1,
        consumoEstandar: 85,
        unidadConsumo: 'KM_POR_GALON',
        tanqueCapacidadGal: null,
      });
    });
  });

  it('si no se elige combustible al crear una moto, NO llama a guardar el consumo estándar', async () => {
    mockDataStore.motos = [];
    data.createMoto.mockResolvedValue({ id: 3, placa: 'NOFUEL2' });

    const { container } = render(MotoManagement);
    await tick();

    await fireEvent.input(screen.getByPlaceholderText('Ej: ABC12D'), { target: { value: 'NOFUEL2' } });
    await fireEvent.submit(container.querySelector('form.create-form'));

    await waitFor(() => {
      expect(data.createMoto).toHaveBeenCalled();
    });
    expect(data.updateAssetFuelConfigVehicle).not.toHaveBeenCalled();
  });

  it('el campo de placa es obligatorio', async () => {
    mockDataStore.motos = [];

    render(MotoManagement);
    await tick();

    const placaInput = screen.getByPlaceholderText('Ej: ABC12D');
    expect(placaInput.hasAttribute('required')).toBe(true);
  });

  it('muestra el formulario aunque el store reporte error', async () => {
    mockDataStore.motos = [];
    mockDataStore.error = 'No se pudo cargar motos';

    render(MotoManagement);
    await tick();

    expect(screen.getByPlaceholderText('Ej: ABC12D')).toBeTruthy();
  });

  it('el botón Exportar Excel está disponible con datos', async () => {
    mockDataStore.motos = [{ id: 1, placa: 'MTO001' }];

    render(MotoManagement);
    await tick();

    expect(screen.getByText('Exportar Excel')).toBeTruthy();
  });
});
