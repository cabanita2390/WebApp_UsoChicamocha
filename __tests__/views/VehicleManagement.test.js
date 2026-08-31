import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import VehicleManagement from '../../components/views/VehicleManagement.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchVehicles: vi.fn(),
    fetchVehicleBrands: vi.fn(),
    fetchVehicleTypes: vi.fn(),
    fetchAreas: vi.fn(),
    fetchLocations: vi.fn(),
    createVehicle: vi.fn(),
    updateVehicle: vi.fn(),
    deleteVehicle: vi.fn(),
    fetchVehicleCurriculum: vi.fn(),
    createVehicleBrand: vi.fn(),
    createCatalogItem: vi.fn(),
    uploadVehicleDocumentFile: vi.fn(),
    updateVehicleDocument: vi.fn(),
    getVehicleDocumentHistory: vi.fn(),
    getVehicleByPlaca: vi.fn(),
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
  vehicleManagementColumns: [
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
  formatVehiclePayload: vi.fn((v) => v),
}));

import { data } from '../../stores/data.js';

describe('VehicleManagement', () => {
  let mockDataStore;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDataStore = {
      vehicles: [],
      vehicleBrands: [],
      vehicleTypes: [],
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

    data.fetchVehicles.mockResolvedValue();
    data.fetchVehicleBrands.mockResolvedValue();
    data.fetchVehicleTypes.mockResolvedValue();
    data.fetchAreas.mockResolvedValue();
    data.fetchLocations.mockResolvedValue();
    data.fetchFuelTypes.mockResolvedValue();
    data.fetchAssetFuelConfig.mockResolvedValue();
    data.updateAssetFuelConfigVehicle.mockResolvedValue({});
  });

  it('muestra el estado de carga cuando está cargando', async () => {
    mockDataStore.isLoading = true;
    mockDataStore.vehicles = [];

    render(VehicleManagement);
    await tick();

    expect(screen.queryByText('Refrescar')).toBeNull();
  });

  it('muestra la interfaz de gestión cuando hay vehículos', async () => {
    mockDataStore.vehicles = [
      { id: 1, placa: 'ABC123', marca: 'Toyota' },
    ];

    render(VehicleManagement);
    await tick();

    expect(screen.getByText('Refrescar')).toBeTruthy();
  });

  it('renderiza el formulario de creación de vehículo', async () => {
    mockDataStore.vehicles = [];

    render(VehicleManagement);
    await tick();

    const placaInput = screen.getByPlaceholderText('Ej: ABC123');
    expect(placaInput).toBeTruthy();
  });

  it('llama fetchVehicles al hacer clic en Refrescar', async () => {
    mockDataStore.vehicles = [{ id: 1, placa: 'ABC123' }];

    render(VehicleManagement);
    await tick();

    await fireEvent.click(screen.getByText('Refrescar'));

    expect(data.fetchVehicles).toHaveBeenCalled();
  });

  it('crea un nuevo vehículo exitosamente', async () => {
    mockDataStore.vehicles = [];
    data.createVehicle.mockResolvedValue({ id: 2, placa: 'XYZ999' });

    const { container } = render(VehicleManagement);
    await tick();

    const placaInput = screen.getByPlaceholderText('Ej: ABC123');
    await fireEvent.input(placaInput, { target: { value: 'XYZ999' } });

    const form = container.querySelector('form.create-form');
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(data.createVehicle).toHaveBeenCalled();
    });
  });

  it('el campo de placa es obligatorio', async () => {
    mockDataStore.vehicles = [];

    render(VehicleManagement);
    await tick();

    const placaInput = screen.getByPlaceholderText('Ej: ABC123');
    expect(placaInput.hasAttribute('required')).toBe(true);
  });

  it('muestra el formulario aunque el store reporte error', async () => {
    mockDataStore.vehicles = [];
    mockDataStore.error = 'No se pudo cargar vehículos';

    render(VehicleManagement);
    await tick();

    expect(screen.getByPlaceholderText('Ej: ABC123')).toBeTruthy();
  });

  it('el formulario de creación incluye Combustible/Consumo estándar/Capacidad del tanque (conectado a asset_fuel_config)', async () => {
    mockDataStore.vehicles = [];

    render(VehicleManagement);
    await tick();

    expect(screen.getByLabelText(/combustible/i)).toBeTruthy();
    expect(screen.getByLabelText(/consumo estándar/i)).toBeTruthy();
    expect(screen.getByLabelText(/capacidad del tanque/i)).toBeTruthy();
  });

  it('al crear un vehículo con combustible + consumo estándar, también guarda el consumo estándar del activo', async () => {
    mockDataStore.vehicles = [];
    data.createVehicle.mockResolvedValue({ id: 2, placa: 'XYZ999' });

    const { container } = render(VehicleManagement);
    await tick();

    await fireEvent.input(screen.getByPlaceholderText('Ej: ABC123'), { target: { value: 'XYZ999' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '30' } });
    await fireEvent.input(screen.getByLabelText(/capacidad del tanque/i), { target: { value: '18.5' } });

    await fireEvent.submit(container.querySelector('form.create-form'));

    await waitFor(() => {
      expect(data.updateAssetFuelConfigVehicle).toHaveBeenCalledWith(2, {
        fuelTypeDefaultId: 1,
        consumoEstandar: 30,
        unidadConsumo: 'KM_POR_GALON',
        tanqueCapacidadGal: 18.5,
      });
    });
  });

  it('si no se elige combustible al crear, NO llama a guardar el consumo estándar (es opcional)', async () => {
    mockDataStore.vehicles = [];
    data.createVehicle.mockResolvedValue({ id: 3, placa: 'NOFUEL1' });

    const { container } = render(VehicleManagement);
    await tick();

    await fireEvent.input(screen.getByPlaceholderText('Ej: ABC123'), { target: { value: 'NOFUEL1' } });
    await fireEvent.submit(container.querySelector('form.create-form'));

    await waitFor(() => {
      expect(data.createVehicle).toHaveBeenCalled();
    });
    expect(data.updateAssetFuelConfigVehicle).not.toHaveBeenCalled();
  });

  it('maneja el fallo en creación de vehículo', async () => {
    mockDataStore.vehicles = [];
    data.createVehicle.mockRejectedValue(new Error('Placa duplicada'));

    const { container } = render(VehicleManagement);
    await tick();

    const placaInput = screen.getByPlaceholderText('Ej: ABC123');
    await fireEvent.input(placaInput, { target: { value: 'DUP001' } });

    const form = container.querySelector('form.create-form');
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(data.createVehicle).toHaveBeenCalled();
    });
  });
});
