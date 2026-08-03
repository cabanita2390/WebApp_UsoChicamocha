import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import TanqueoDistribucion from '../../components/views/TanqueoDistribucion.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchRefuelingReport: vi.fn(),
    fetchVehicles: vi.fn(),
    fetchMotos: vi.fn(),
    fetchMachines: vi.fn(),
    createRefueling: vi.fn().mockResolvedValue({ id: 1 }),
    updateRefueling: vi.fn().mockResolvedValue({ id: 101 }),
    deleteRefueling: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../shared/Loader.svelte', () => ({
  default: vi.fn().mockImplementation(() => ({
    $$: { on_mount: [], on_destroy: [] },
    $set: vi.fn(),
    $destroy: vi.fn(),
  })),
}));

import { data } from '../../stores/data.js';
import { auth } from '../../stores/auth.js';
import { fuelDateRange } from '../../stores/fuelFilters.js';

const VEHICLES = [
  { id: 5, placa: 'ABC123', marca: 'Toyota', tipoVehiculo: 'CAMPERO' },
  { id: 6, placa: 'XYZ789', marca: 'Chevrolet', tipoVehiculo: 'CAMIONETA' },
];
const MOTOS = [{ id: 30, placa: 'MOT001', marca: 'Yamaha', tipoVehiculo: 'MOTOCICLETA' }];
const MACHINES = [
  { id: 8, name: 'Excavadora', brand: 'CAT' },
  { id: 10, name: 'Compactadora', brand: 'Volvo' },
];

// vehicleId=5 (ABC123) tiene 2 tanqueos en el rango — sirve para probar que la
// tabla resumen colapsa a solo el más reciente (id 101, cantidad 30), mientras que
// "Ver historial" debe seguir mostrando el viejo (id 100, cantidad 25). machineId=8
// tiene un solo tanqueo (id 102).
const mockRefuelingReport = [
  {
    id: 100, vehicleId: 5, machineId: null, lugar: 'BOMBA', areaCosto: 'DISTRITO', fuelTypeId: 1,
    cantidadGalones: 25, horometroKm: 400, esFull: false, precioUnitario: 9500, descuento: null,
    totalIngresado: 237500, totalCalculado: 237500, discrepanciaValor: false,
    urlFactura: '/uploads/documents/fuel/refueling/100/f.pdf', origen: 'Estación Vieja',
    responsableId: 1, fechaRegistro: '2026-07-05T09:00:00',
  },
  {
    // capacidadExcedida ya viene calculado del backend (AssetFuelCapacityService,
    // cruce con asset_fuel_config.tanqueCapacidadGal) — el frontend no lo calcula.
    id: 101, vehicleId: 5, machineId: null, lugar: 'BOMBA', areaCosto: 'DISTRITO', fuelTypeId: 1,
    cantidadGalones: 30, horometroKm: 500, esFull: true, precioUnitario: 10000, descuento: null,
    totalIngresado: 300000, totalCalculado: 300000, discrepanciaValor: false, capacidadExcedida: true,
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

function filaCon(texto) {
  return screen.getAllByRole('row').find((r) => r.textContent.includes(texto));
}

describe('TanqueoDistribucion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fuelDateRange.set({ fechaInicio: '', fechaFin: '' });
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Test Admin', role: 'ADMIN' }, isRefreshing: false });
      return () => {};
    });
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelRefuelingReport: mockRefuelingReport,
        fuelTypes: [
          { id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' },
          { id: 4, codigo: 'GAS', nombre: 'Gas natural vehicular', unidadMedida: 'M3' },
        ],
        vehicles: VEHICLES,
        motos: MOTOS,
        machines: MACHINES,
        isLoading: false,
      });
      return () => {};
    });
  });

  it('la tabla resumen colapsa a una sola fila por activo: la más reciente en el rango', () => {
    render(TanqueoDistribucion);
    const filasVehiculo = screen.getAllByRole('row').filter((r) => r.textContent.includes('ABC123'));
    expect(filasVehiculo.length).toBe(1);
    expect(filasVehiculo[0].textContent).toContain('30');
    expect(filasVehiculo[0].textContent).not.toContain('25');
  });

  it('muestra el total correcto de registros en el pie de la tabla resumen (no "de 0")', () => {
    const { container } = render(TanqueoDistribucion);
    expect(container.querySelector('.record-count').textContent).toMatch(/mostrando 2 de 2 registros/i);
  });

  it('la tabla resumen tiene controles de paginación', () => {
    render(TanqueoDistribucion);
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /primero/i })).toBeTruthy();
  });

  it('marca como discrepancia y resalta la fila cuando la cantidad tanqueada excede la capacidad configurada del tanque', () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');
    // "Full" ya es SÍ en esta fila (id 101) — con la discrepancia por capacidad
    // agregada debe haber un segundo "SÍ" (columna Discrepancia).
    expect(within(fila).getAllByText('SÍ').length).toBe(2);
    expect(fila.classList.contains('anomaly-row')).toBe(true);
  });

  it('no marca discrepancia por capacidad cuando el activo no tiene tanqueCapacidadGal configurado', () => {
    render(TanqueoDistribucion);
    const fila = filaCon('Excavadora');
    expect(fila.classList.contains('anomaly-row')).toBe(false);
  });

  it('cambiar de píldora de tipo pide el reporte con el nuevo tipo', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /^almacén/i }));
    expect(data.fetchRefuelingReport).toHaveBeenLastCalledWith('MAQUINARIA_MOTO', 'TODAS', undefined, undefined);
  });

  it('vuelve a pedir el reporte con tipo, área y fechas al filtrar', async () => {
    render(TanqueoDistribucion);

    await fireEvent.change(screen.getByLabelText(/área/i), { target: { value: 'ASOCIACION' } });
    await fireEvent.input(screen.getByLabelText(/fecha inicio/i), { target: { value: '2026-06-01' } });
    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2026-06-30' } });
    await fireEvent.click(screen.getByRole('button', { name: /^filtrar$/i }));

    expect(data.fetchRefuelingReport).toHaveBeenLastCalledWith('VEHICULO', 'ASOCIACION', '2026-06-01', '2026-06-30');
  });

  it('click en "Ver historial" abre el modal con todos los tanqueos del activo en el rango, incluida la fila más antigua', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');

    await fireEvent.click(within(fila).getByRole('button', { name: /ver historial/i }));

    const dialog = screen.getByRole('dialog', { name: /historial de/i });
    const filasDelModal = within(dialog).getAllByRole('row');
    expect(filasDelModal.some((r) => r.textContent.includes('25'))).toBe(true);
    expect(filasDelModal.some((r) => r.textContent.includes('30'))).toBe(true);
  });

  it('"Ver historial" es visible para cualquier rol, a diferencia de Editar/Eliminar que son solo ADMIN', () => {
    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(TanqueoDistribucion);

    expect(screen.getAllByRole('button', { name: /ver historial/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^eliminar$/i })).toBeNull();
  });

  it('un ADMIN ve Editar/Eliminar en la tabla resumen, un SUPERVISOR_OPERATIVO no', () => {
    const { unmount } = render(TanqueoDistribucion);
    expect(screen.getAllByRole('button', { name: /^editar$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^eliminar$/i }).length).toBeGreaterThan(0);
    unmount();

    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    render(TanqueoDistribucion);
    expect(screen.queryByRole('button', { name: /^editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^eliminar$/i })).toBeNull();
  });

  it('click en Editar abre el modal de edición con los campos del tanqueo más reciente precargados', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');

    await fireEvent.click(within(fila).getByRole('button', { name: /^editar$/i }));

    expect(screen.getByText(/editar tanqueo/i)).toBeTruthy();
    expect(screen.getByLabelText(/cantidad/i).value).toBe('30');
  });

  it('guardar la edición llama a updateRefueling con el id y el FormData correctos', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');
    await fireEvent.click(within(fila).getByRole('button', { name: /^editar$/i }));

    await fireEvent.input(screen.getByLabelText(/cantidad/i), { target: { value: '35' } });
    await fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(data.updateRefueling).toHaveBeenCalledTimes(1);
    const [id, formData] = data.updateRefueling.mock.calls[0];
    expect(id).toBe(101);
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('cantidadGalones')).toBe('35');
    expect(formData.get('lugar')).toBe('BOMBA');
  });

  it('click en Eliminar muestra confirmación, y confirmar llama a deleteRefueling con el id correcto', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');

    await fireEvent.click(within(fila).getByRole('button', { name: /^eliminar$/i }));

    const dialog = screen.getByRole('dialog', { name: /eliminar tanqueo/i });
    expect(within(dialog).getByText(/¿está seguro/i)).toBeTruthy();

    await fireEvent.click(within(dialog).getByRole('button', { name: /^eliminar$/i }));

    expect(data.deleteRefueling).toHaveBeenCalledWith(101);
  });

  it('Editar dentro del modal de historial permite corregir un tanqueo antiguo que no aparece en el resumen', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');
    await fireEvent.click(within(fila).getByRole('button', { name: /ver historial/i }));

    const dialog = screen.getByRole('dialog', { name: /historial de/i });
    const filaVieja = within(dialog).getAllByRole('row').find((r) => r.textContent.includes('25'));
    await fireEvent.click(within(filaVieja).getByRole('button', { name: /^editar$/i }));

    expect(screen.getByLabelText(/cantidad/i).value).toBe('25');
  });

  it('el formulario de registro está detrás de un modal, oculto hasta que se pide registrar', () => {
    render(TanqueoDistribucion);
    expect(screen.queryByLabelText(/^lugar$/i)).toBeNull();
    expect(screen.getByRole('button', { name: /\+ registrar tanqueo/i })).toBeTruthy();
  });

  it('oculta precio unitario y factura cuando el lugar es ALMACEN', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/lugar/i), { target: { value: 'ALMACEN' } });

    expect(screen.queryByLabelText(/precio unitario/i)).toBeNull();
    expect(screen.queryByLabelText(/factura/i)).toBeNull();
  });

  it('muestra precio unitario y factura cuando el lugar es BOMBA', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/lugar/i), { target: { value: 'BOMBA' } });

    expect(screen.getByLabelText(/precio unitario/i)).toBeTruthy();
    expect(screen.getByLabelText(/factura/i)).toBeTruthy();
  });

  it('el elemento (Máquina/Vehículo/Motocicleta) es un buscador: despliega la lista real al enfocarlo', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.focus(screen.getByLabelText(/buscar máquina/i));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Excavadora — CAT')).toBeTruthy();
    expect(dialog.getByText('Compactadora — Volvo')).toBeTruthy();
  });

  it('al elegir Vehículo en "Tipo de elemento", el buscador excluye motos (mismo bug que en Configurar rendimiento)', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/tipo de elemento/i), { target: { value: 'VEHICULO' } });
    await fireEvent.focus(screen.getByLabelText(/buscar vehículo/i));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('ABC123 — Toyota')).toBeTruthy();
    expect(dialog.queryByText('MOT001 — Yamaha')).toBeNull();
  });

  it('al elegir Motocicleta, el buscador muestra solo motos', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/tipo de elemento/i), { target: { value: 'MOTOCICLETA' } });
    await fireEvent.focus(screen.getByLabelText(/buscar motocicleta/i));

    expect(screen.getByText('MOT001 — Yamaha')).toBeTruthy();
  });

  it('al seleccionar un elemento de la lista, el input queda con "Tipo #id" (misma convención que la tabla de abajo)', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));
    await fireEvent.focus(screen.getByLabelText(/buscar máquina/i));

    await fireEvent.click(within(screen.getByRole('dialog')).getByText('Excavadora — CAT'));

    expect(screen.getByLabelText(/buscar máquina/i).value).toBe('Máquina #8');
  });

  it('no deja registrar el tanqueo sin elegir un elemento de la lista', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));
    await fireEvent.change(screen.getByLabelText(/lugar/i), { target: { value: 'ALMACEN' } });
    await fireEvent.change(screen.getByLabelText(/área de costo/i), { target: { value: 'DISTRITO' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/cantidad/i), { target: { value: '30' } });
    await fireEvent.input(screen.getByLabelText(/horómetro/i), { target: { value: '500' } });

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.createRefueling).not.toHaveBeenCalled();
    expect(screen.getByText(/seleccione.*de la lista/i)).toBeTruthy();
  });

  it('arma un FormData con las partes que espera el backend al enviar un tanqueo ALMACEN', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/lugar/i), { target: { value: 'ALMACEN' } });
    await fireEvent.change(screen.getByLabelText(/área de costo/i), { target: { value: 'DISTRITO' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/cantidad/i), { target: { value: '30' } });
    await fireEvent.input(screen.getByLabelText(/horómetro/i), { target: { value: '500' } });
    await fireEvent.focus(screen.getByLabelText(/buscar máquina/i));
    await fireEvent.click(within(screen.getByRole('dialog')).getByText('Excavadora — CAT'));

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.createRefueling).toHaveBeenCalledTimes(1);
    const formData = data.createRefueling.mock.calls[0][0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get('lugar')).toBe('ALMACEN');
    expect(formData.get('areaCosto')).toBe('DISTRITO');
    expect(formData.get('fuelTypeId')).toBe('1');
    expect(formData.get('cantidadGalones')).toBe('30');
    expect(formData.get('horometroKm')).toBe('500');
    expect(formData.get('machineId')).toBe('8');
    expect(formData.has('precioUnitario')).toBe(false);
  });

  it('el campo Origen sugiere orígenes ya usados pero permite escribir uno nuevo', async () => {
    const { container } = render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    const origenInput = screen.getByLabelText(/^origen$/i);
    expect(origenInput.getAttribute('list')).toBeTruthy();
    const datalist = container.querySelector(`#${origenInput.getAttribute('list')}`);
    expect(Array.from(datalist.options).some((o) => o.value === 'Estación Norte')).toBe(true);

    await fireEvent.input(origenInput, { target: { value: 'Estación nueva cualquiera' } });
    expect(origenInput.value).toBe('Estación nueva cualquiera');
  });

  it('cambia la etiqueta de cantidad a m³ cuando el combustible seleccionado es gas natural vehicular', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    expect(screen.getByText('Cantidad (galones)')).toBeTruthy();

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

    expect(screen.getByText('Cantidad (m³)')).toBeTruthy();
  });
});
