import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import FuelHistory from '../../components/views/FuelHistory.svelte';

vi.mock('svelte-spa-router', () => ({
  pop: vi.fn(),
}));

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchRefuelingReport: vi.fn(),
    fetchVehicles: vi.fn(),
    fetchMotos: vi.fn(),
    fetchMachines: vi.fn(),
    updateRefueling: vi.fn().mockResolvedValue({ id: 101 }),
    deleteRefueling: vi.fn().mockResolvedValue(undefined),
    createFuelReintegration: vi.fn().mockResolvedValue({ id: 1 }),
  },
}));

vi.mock('../../stores/auth.js', () => ({
  auth: {
    subscribe: vi.fn((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    }),
  },
}));

vi.mock('../../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

vi.mock('../../stores/api.js', () => ({
  getFileUrl: vi.fn((path) => (path ? `https://api.test${path}` : null)),
  openDocumentSafely: vi.fn(),
}));

vi.mock('../shared/Loader.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';
import { auth } from '../../stores/auth.js';
import { pop } from 'svelte-spa-router';
import { getFileUrl, openDocumentSafely } from '../../stores/api.js';

const VEHICLES = [
  { id: 5, placa: 'ABC123', marca: 'Toyota', tipoVehiculo: 'CAMPERO' },
  { id: 6, placa: 'XYZ789', marca: 'Chevrolet', tipoVehiculo: 'CAMIONETA' },
];
const MOTOS = [{ id: 30, placa: 'MOT001', marca: 'Yamaha', tipoVehiculo: 'MOTOCICLETA' }];
const MACHINES = [{ id: 8, name: 'Excavadora', brand: 'CAT' }];

// vehicleId=5 (ABC123) tiene 2 tanqueos — a diferencia de la tabla resumen de
// Tanqueo y Distribución (que colapsa al más reciente), esta pantalla debe
// mostrar ambos, incluido el más antiguo (id 100, cantidad 25).
const mockRefuelingReport = [
  {
    id: 100, vehicleId: 5, machineId: null, lugar: 'BOMBA', areaCosto: 'DISTRITO', fuelTypeId: 1,
    cantidadGalones: 25, horometroKm: 400, esFull: false, precioUnitario: 9500, descuento: null,
    totalIngresado: 237500, totalCalculado: 237500, discrepanciaValor: false,
    urlFactura: '/uploads/documents/fuel/refueling/100/f.pdf', origen: 'Estación Vieja',
    responsableId: 1, fechaRegistro: '2026-07-05T09:00:00',
  },
  {
    id: 101, vehicleId: 5, machineId: null, lugar: 'BOMBA', areaCosto: 'DISTRITO', fuelTypeId: 1,
    cantidadGalones: 30, horometroKm: 500, esFull: true, precioUnitario: 10000, descuento: null,
    totalIngresado: 300000, totalCalculado: 300000, discrepanciaValor: false,
    urlFactura: '/uploads/documents/fuel/refueling/101/f.pdf', origen: 'Estación Norte',
    responsableId: 1, fechaRegistro: '2026-07-10T09:00:00',
  },
  {
    id: 102, vehicleId: null, machineId: 8, lugar: 'ALMACEN', areaCosto: 'ASOCIACION', fuelTypeId: 1,
    cantidadGalones: 50, horometroKm: 120, esFull: false, precioUnitario: null, descuento: null,
    totalIngresado: null, totalCalculado: null, discrepanciaValor: null,
    urlFactura: null, origen: null, responsableId: 1, fechaRegistro: '2026-07-11T09:00:00',
  },
];

describe('FuelHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelRefuelingReport: mockRefuelingReport,
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        vehicles: VEHICLES,
        motos: MOTOS,
        machines: MACHINES,
        isLoading: false,
      });
      return () => {};
    });
  });

  it('muestra todos los tanqueos del activo, incluida la fila más antigua que la tabla resumen colapsa', () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filas = screen.getAllByRole('row');
    expect(filas.some((r) => r.textContent.includes('25'))).toBe(true);
    expect(filas.some((r) => r.textContent.includes('30'))).toBe(true);
  });

  it('pide el reporte sin rango de fechas — muestra TODO el historial, no solo el filtro activo en Tanqueo y Distribución', () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    expect(data.fetchRefuelingReport).toHaveBeenCalledWith('VEHICULO', 'TODAS');
  });

  it('para una máquina, pide el reporte agrupado MAQUINARIA_MOTO', () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    expect(data.fetchRefuelingReport).toHaveBeenCalledWith('MAQUINARIA_MOTO', 'TODAS');
  });

  it('el botón Volver llama pop() del router', async () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    await fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(pop).toHaveBeenCalled();
  });

  it('click en Editar sobre el registro antiguo precarga sus valores (sin buscador de activo, ya fijo por la ruta)', async () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filaVieja = screen.getAllByRole('row').find((r) => r.textContent.includes('25'));

    await fireEvent.click(within(filaVieja).getByRole('button', { name: /^editar$/i }));

    expect(screen.getByLabelText(/cantidad/i).value).toBe('25');
    expect(screen.queryByLabelText(/buscar/i)).toBeNull();
  });

  it('guardar la edición llama a updateRefueling con el id y el vehicleId fijo en el FormData', async () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filaVieja = screen.getAllByRole('row').find((r) => r.textContent.includes('25'));
    await fireEvent.click(within(filaVieja).getByRole('button', { name: /^editar$/i }));

    await fireEvent.input(screen.getByLabelText(/cantidad/i), { target: { value: '27' } });
    await fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(data.updateRefueling).toHaveBeenCalledTimes(1);
    const [id, formData] = data.updateRefueling.mock.calls[0];
    expect(id).toBe(100);
    expect(formData.get('vehicleId')).toBe('5');
    expect(formData.get('cantidadGalones')).toBe('27');
  });

  it('click en Eliminar muestra confirmación, y confirmar llama a deleteRefueling con el id correcto', async () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filaVieja = screen.getAllByRole('row').find((r) => r.textContent.includes('25'));

    await fireEvent.click(within(filaVieja).getByRole('button', { name: /^eliminar$/i }));
    const dialog = screen.getByRole('dialog', { name: /eliminar tanqueo/i });
    await fireEvent.click(within(dialog).getByRole('button', { name: /^eliminar$/i }));

    expect(data.deleteRefueling).toHaveBeenCalledWith(100);
  });

  it('Editar/Eliminar no se muestran para un rol no ADMIN', () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });

    expect(screen.queryByRole('button', { name: /^editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^eliminar$/i })).toBeNull();
  });

  it('click en "Factura" abre el documento subido de ese tanqueo (visible para cualquier rol)', async () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filaVieja = screen.getAllByRole('row').find((r) => r.textContent.includes('25'));

    await fireEvent.click(within(filaVieja).getByRole('button', { name: /^factura$/i }));

    expect(getFileUrl).toHaveBeenCalledWith('/uploads/documents/fuel/refueling/100/f.pdf');
    expect(openDocumentSafely).toHaveBeenCalledWith('https://api.test/uploads/documents/fuel/refueling/100/f.pdf');
  });

  it('sin factura subida (tanqueo de máquina en ALMACEN), la celda muestra "—"', () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'MAQUINARIA', id: '8' } } });
    const fila = screen.getAllByRole('row').find((r) => r.textContent.includes('50'));

    expect(within(fila).queryByRole('button', { name: /^factura$/i })).toBeNull();
    expect(fila.querySelector('.license-doc-cell__empty')).toBeTruthy();
  });

  it('el modal de edición tiene un enlace "Ver factura actual" cuando el tanqueo ya tiene una', async () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filaVieja = screen.getAllByRole('row').find((r) => r.textContent.includes('25'));
    await fireEvent.click(within(filaVieja).getByRole('button', { name: /^editar$/i }));

    await fireEvent.click(screen.getByRole('link', { name: /ver factura actual/i }));

    expect(openDocumentSafely).toHaveBeenCalledWith('https://api.test/uploads/documents/fuel/refueling/100/f.pdf');
  });

  it('un ADMIN ve "Reintegrar", un OPERARIO no (el backend exige SUPERVISOR_OPERATIVO o ADMIN)', () => {
    const { unmount } = render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filaVieja = screen.getAllByRole('row').find((r) => r.textContent.includes('25'));
    expect(within(filaVieja).getByRole('button', { name: /^reintegrar$/i })).toBeTruthy();
    unmount();

    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Op', role: 'OPERARIO' }, isRefreshing: false });
      return () => {};
    });
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filas = screen.getAllByRole('row').filter((r) => r.textContent.includes('25'));
    filas.forEach((f) => expect(within(f).queryByRole('button', { name: /^reintegrar$/i })).toBeNull());
  });

  it('click en "Reintegrar" y guardar llama a createFuelReintegration con el payload correcto', async () => {
    render(FuelHistory, { props: { params: { tipoElemento: 'VEHICULO', id: '5' } } });
    const filaVieja = screen.getAllByRole('row').find((r) => r.textContent.includes('25'));

    await fireEvent.click(within(filaVieja).getByRole('button', { name: /^reintegrar$/i }));
    const dialog = screen.getByRole('dialog', { name: /reintegrar tanqueo/i });
    await fireEvent.input(within(dialog).getByLabelText(/cantidad a reintegrar/i), { target: { value: '10' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: /^reintegrar$/i }));

    // Motivo sin llenar (opcional) — debe viajar como null, no como cadena vacía.
    expect(data.createFuelReintegration).toHaveBeenCalledWith({ refuelingId: 100, cantidadReintegrada: 10, motivo: null });
    expect(data.fetchRefuelingReport).toHaveBeenCalled();
  });
});
