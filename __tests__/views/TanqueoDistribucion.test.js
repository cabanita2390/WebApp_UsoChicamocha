import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/svelte';
import TanqueoDistribucion from '../../components/views/TanqueoDistribucion.svelte';

vi.mock('svelte-spa-router', () => ({
  push: vi.fn(),
}));

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
import { fuelDateRange } from '../../stores/fuelFilters.js';
import { push } from 'svelte-spa-router';
import { getFileUrl, openDocumentSafely } from '../../stores/api.js';
import { formatCurrency } from '../../config/table-definitions/helpers.js';

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
    capacidadConfiguradaGal: 28,
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
    // "Full" sigue siendo SÍ (columna Full) — la columna Discrepancia ahora
    // lista el motivo puntual, con el valor de referencia contra el que se
    // comparó, en vez de un SÍ genérico.
    expect(within(fila).getAllByText('SÍ').length).toBe(1);
    expect(fila.textContent).toContain('Capacidad excedida (máx. configurado: 28 gal)');
    expect(fila.classList.contains('anomaly-row')).toBe(true);
  });

  it('no marca discrepancia por capacidad cuando el activo no tiene tanqueCapacidadGal configurado', () => {
    render(TanqueoDistribucion);
    const fila = filaCon('Excavadora');
    expect(fila.classList.contains('anomaly-row')).toBe(false);
  });

  it('marca discrepancia y resalta la fila cuando la cantidad está fuera del rango típico para el tipo de activo', () => {
    const filaLimpia = {
      id: 200, vehicleId: null, machineId: 10, lugar: 'ALMACEN', areaCosto: 'DISTRITO', fuelTypeId: 1,
      cantidadGalones: 300, horometroKm: 50, esFull: false, precioUnitario: null, descuento: null,
      totalIngresado: null, totalCalculado: null, discrepanciaValor: false, capacidadExcedida: false,
      cantidadFueraDeRango: true, cantidadMaximaTipica: 200, precioFueraDeRango: false,
      urlFactura: null, origen: null, responsableId: 1, fechaRegistro: '2026-07-12T09:00:00',
    };
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelRefuelingReport: [filaLimpia],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        vehicles: VEHICLES,
        motos: MOTOS,
        machines: MACHINES,
        isLoading: false,
      });
      return () => {};
    });

    render(TanqueoDistribucion);
    const fila = filaCon('Compactadora');

    expect(fila.classList.contains('anomaly-row')).toBe(true);
    expect(fila.textContent).toContain('Cantidad fuera de rango (máx. típico: 200 gal)');
  });

  it('marca discrepancia y resalta la fila cuando el precio unitario está fuera de rango vs el promedio reciente', () => {
    const filaLimpia = {
      id: 201, vehicleId: 5, machineId: null, lugar: 'BOMBA', areaCosto: 'DISTRITO', fuelTypeId: 1,
      cantidadGalones: 20, horometroKm: 500, esFull: false, precioUnitario: 25000, descuento: null,
      totalIngresado: 500000, totalCalculado: 500000, discrepanciaValor: false, capacidadExcedida: false,
      cantidadFueraDeRango: false, precioFueraDeRango: true, precioPromedioReciente: 10000,
      urlFactura: null, origen: null, responsableId: 1, fechaRegistro: '2026-07-12T09:00:00',
    };
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelRefuelingReport: [filaLimpia],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        vehicles: VEHICLES,
        motos: MOTOS,
        machines: MACHINES,
        isLoading: false,
      });
      return () => {};
    });

    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');

    expect(fila.classList.contains('anomaly-row')).toBe(true);
    expect(fila.textContent).toContain(`Precio fuera de rango (promedio reciente: ${formatCurrency(10000)})`);
  });

  it('marca discrepancia y resalta la fila cuando "Full" está declarado pero la cantidad no alcanza para llenar el tanque', () => {
    const filaLimpia = {
      id: 202, vehicleId: null, machineId: 8, lugar: 'ALMACEN', areaCosto: 'DISTRITO', fuelTypeId: 1,
      cantidadGalones: 5, horometroKm: 150, esFull: true, precioUnitario: null, descuento: null,
      totalIngresado: null, totalCalculado: null, discrepanciaValor: false, capacidadExcedida: false,
      cantidadFueraDeRango: false, precioFueraDeRango: false,
      fullInconsistente: true, cantidadEsperadaLlenoGal: 16.5,
      urlFactura: null, origen: null, responsableId: 1, fechaRegistro: '2026-07-12T09:00:00',
    };
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelRefuelingReport: [filaLimpia],
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        vehicles: VEHICLES,
        motos: MOTOS,
        machines: MACHINES,
        isLoading: false,
      });
      return () => {};
    });

    render(TanqueoDistribucion);
    const fila = filaCon('Excavadora');

    expect(fila.classList.contains('anomaly-row')).toBe(true);
    expect(fila.textContent).toContain('Full declarado pero cantidad insuficiente (se esperaban ~16.5 gal)');
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

  it('click en "Ver historial" navega a la pantalla completa de historial del activo (Fase 6: ya no es un modal)', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');

    await fireEvent.click(within(fila).getByRole('button', { name: /ver historial/i }));

    expect(push).toHaveBeenCalledWith('/fuel-history/VEHICULO/5');
  });

  it('click en "Ver historial" de una máquina navega con tipoElemento=MAQUINARIA', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('Excavadora');

    await fireEvent.click(within(fila).getByRole('button', { name: /ver historial/i }));

    expect(push).toHaveBeenCalledWith('/fuel-history/MAQUINARIA/8');
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

  it('click en "Factura" abre el documento subido del tanqueo', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');

    await fireEvent.click(within(fila).getByRole('button', { name: /^factura$/i }));

    expect(getFileUrl).toHaveBeenCalledWith('/uploads/documents/fuel/refueling/101/f.pdf');
    expect(openDocumentSafely).toHaveBeenCalledWith('https://api.test/uploads/documents/fuel/refueling/101/f.pdf');
  });

  it('sin factura subida, la celda muestra "—" en vez de un botón', () => {
    render(TanqueoDistribucion);
    const fila = filaCon('Excavadora');

    expect(within(fila).queryByRole('button', { name: /^factura$/i })).toBeNull();
    expect(fila.querySelector('.license-doc-cell__empty')).toBeTruthy();
  });

  it('el modal de edición tiene un enlace "Ver factura actual" cuando el tanqueo ya tiene una', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');
    await fireEvent.click(within(fila).getByRole('button', { name: /^editar$/i }));

    await fireEvent.click(screen.getByRole('link', { name: /ver factura actual/i }));

    expect(openDocumentSafely).toHaveBeenCalledWith('https://api.test/uploads/documents/fuel/refueling/101/f.pdf');
  });

  it('un ADMIN y un SUPERVISOR_OPERATIVO ven "Reintegrar", un OPERARIO no (el backend exige uno de los dos primeros)', () => {
    const { unmount: unmountAdmin } = render(TanqueoDistribucion);
    expect(within(filaCon('ABC123')).getByRole('button', { name: /^reintegrar$/i })).toBeTruthy();
    unmountAdmin();

    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Sup', role: 'SUPERVISOR_OPERATIVO' }, isRefreshing: false });
      return () => {};
    });
    const { unmount } = render(TanqueoDistribucion);
    expect(within(filaCon('ABC123')).getByRole('button', { name: /^reintegrar$/i })).toBeTruthy();
    unmount();

    auth.subscribe.mockImplementation((callback) => {
      callback({ isAuthenticated: true, currentUser: { name: 'Op', role: 'OPERARIO' }, isRefreshing: false });
      return () => {};
    });
    render(TanqueoDistribucion);
    expect(within(filaCon('ABC123')).queryByRole('button', { name: /^reintegrar$/i })).toBeNull();
  });

  it('click en "Reintegrar" abre el modal con el saldo disponible, y guardar llama a createFuelReintegration con el payload correcto', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('ABC123');

    await fireEvent.click(within(fila).getByRole('button', { name: /^reintegrar$/i }));

    const dialog = screen.getByRole('dialog', { name: /reintegrar tanqueo/i });
    expect(within(dialog).getAllByText('30').length).toBe(2); // Cantidad tanqueada y Saldo disponible (nada reintegrado aún)

    await fireEvent.input(within(dialog).getByLabelText(/cantidad a reintegrar/i), { target: { value: '5' } });
    await fireEvent.input(within(dialog).getByLabelText(/motivo/i), { target: { value: 'Sobró combustible' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: /^reintegrar$/i }));

    expect(data.createFuelReintegration).toHaveBeenCalledWith({ refuelingId: 101, cantidadReintegrada: 5, motivo: 'Sobró combustible' });
    expect(data.fetchRefuelingReport).toHaveBeenCalled();
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

  it('al seleccionar un elemento de la lista, el input queda con "nombre — marca" (misma convención que Configurar rendimiento)', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));
    await fireEvent.focus(screen.getByLabelText(/buscar máquina/i));

    await fireEvent.click(within(screen.getByRole('dialog')).getByText('Excavadora — CAT'));

    expect(screen.getByLabelText(/buscar máquina/i).value).toBe('Excavadora — CAT');
  });

  it('al elegir "Vehículo" en Tipo de elemento, sugiere Lugar = Bomba', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/tipo de elemento/i), { target: { value: 'VEHICULO' } });

    expect(screen.getByLabelText(/^lugar$/i).value).toBe('BOMBA');
  });

  it('al elegir "Motocicleta" o "Máquina" en Tipo de elemento, sugiere Lugar = Almacén, pero sigue siendo editable', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/tipo de elemento/i), { target: { value: 'VEHICULO' } });
    expect(screen.getByLabelText(/^lugar$/i).value).toBe('BOMBA');

    await fireEvent.change(screen.getByLabelText(/tipo de elemento/i), { target: { value: 'MOTOCICLETA' } });
    expect(screen.getByLabelText(/^lugar$/i).value).toBe('ALMACEN');

    // Sigue siendo editable: si esta moto sí se tanqueó en una bomba real, el
    // usuario puede corregirlo a mano sin que quede bloqueado.
    await fireEvent.change(screen.getByLabelText(/^lugar$/i), { target: { value: 'BOMBA' } });
    expect(screen.getByLabelText(/^lugar$/i).value).toBe('BOMBA');
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

  it('registra un tanqueo BOMBA sin adjuntar factura — la factura es opcional', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));

    await fireEvent.change(screen.getByLabelText(/lugar/i), { target: { value: 'BOMBA' } });
    await fireEvent.change(screen.getByLabelText(/área de costo/i), { target: { value: 'DISTRITO' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/cantidad/i), { target: { value: '30' } });
    await fireEvent.input(screen.getByLabelText(/horómetro/i), { target: { value: '500' } });
    await fireEvent.input(screen.getByLabelText(/precio unitario/i), { target: { value: '10000' } });
    await fireEvent.input(screen.getByLabelText(/total pagado/i), { target: { value: '300000' } });
    await fireEvent.focus(screen.getByLabelText(/buscar máquina/i));
    await fireEvent.click(within(screen.getByRole('dialog')).getByText('Excavadora — CAT'));

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.createRefueling).toHaveBeenCalledTimes(1);
    const formData = data.createRefueling.mock.calls[0][0];
    expect(formData.get('lugar')).toBe('BOMBA');
    expect(formData.get('precioUnitario')).toBe('10000');
    expect(formData.has('factura')).toBe(false);
  });

  it('el label de Factura dice "opcional" en el formulario de registro', async () => {
    render(TanqueoDistribucion);
    await fireEvent.click(screen.getByRole('button', { name: /\+ registrar tanqueo/i }));
    await fireEvent.change(screen.getByLabelText(/lugar/i), { target: { value: 'BOMBA' } });

    expect(screen.getByText(/^factura \(opcional\)$/i)).toBeTruthy();
  });

  it('edita un tanqueo de ALMACEN a BOMBA sin adjuntar factura — ya no bloquea el guardado', async () => {
    render(TanqueoDistribucion);
    const fila = filaCon('Excavadora');
    await fireEvent.click(within(fila).getByRole('button', { name: /^editar$/i }));

    await fireEvent.change(screen.getByLabelText(/^lugar$/i), { target: { value: 'BOMBA' } });
    await fireEvent.input(screen.getByLabelText(/precio unitario/i), { target: { value: '10000' } });
    await fireEvent.input(screen.getByLabelText(/total pagado/i), { target: { value: '300000' } });

    await fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(data.updateRefueling).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/se requiere factura/i)).toBeNull();
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
