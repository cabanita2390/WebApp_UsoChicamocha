import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/svelte';
import TireProfileManagement from '../../components/views/TireProfileManagement.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchTireProfiles: vi.fn(),
    fetchTireAssignments: vi.fn(),
    fetchMachines: vi.fn(),
    fetchVehicles: vi.fn(),
    fetchMotos: vi.fn(),
    createTireProfile: vi.fn(),
    updateTireProfile: vi.fn(),
    deleteTireProfile: vi.fn(),
    assignTireProfileVehicle: vi.fn(),
    assignTireProfileMachine: vi.fn(),
  },
}));

let role = 'ADMIN';
vi.mock('../../stores/auth.js', () => ({
  auth: {
    subscribe: vi.fn((cb) => {
      cb({ isAuthenticated: true, currentUser: { role } });
      return () => {};
    }),
  },
}));

vi.mock('../../stores/ui.js', () => ({ addNotification: vi.fn() }));

import { data } from '../../stores/data.js';

const pos = (codigo, etiqueta, psiMin, psiMax, orden) => ({ codigo, etiqueta, orden, psiMin, psiObjetivo: null, psiMax });
const PERFILES = [
  { id: 1, nombre: 'Moto 125', aplicaA: 'MOTOCICLETA', descripcion: null, posiciones: [pos('DEL', 'Delantera', 28, 33, 1), pos('TRA', 'Trasera', 30, 36, 2)] },
  {
    id: 2, nombre: 'Camioneta', aplicaA: 'VEHICULO', descripcion: null,
    posiciones: [pos('DI', 'Delantera izquierda', 30, 35, 1), pos('DD', 'Delantera derecha', 30, 35, 2), pos('TI', 'Trasera izquierda', 30, 35, 3), pos('TD', 'Trasera derecha', 30, 35, 4)],
  },
];

function seed() {
  data.subscribe.mockImplementation((cb) => {
    cb({
      tireProfiles: PERFILES,
      tireAssignments: [{ vehicleId: 30, machineId: null, perfilId: 1 }],
      motos: [{ id: 30, placa: 'MOT001' }, { id: 31, placa: 'MOT002' }],
      vehicles: [{ id: 5, placa: 'ABC123', tipoVehiculo: 'CAMIONETA' }, { id: 30, placa: 'MOT001', tipoVehiculo: 'MOTOCICLETA' }],
      machines: [],
    });
    return () => {};
  });
}

// @testing-library/svelte sobre Svelte 4 no ejecuta onMount (ver nota en
// SubestacionesEjecuciones.test.js): la carga se dispara con "Refrescar", que
// llama a la misma función que el montaje.
async function montar() {
  render(TireProfileManagement);
  await fireEvent.click(screen.getByRole('button', { name: 'Refrescar' }));
  await waitFor(() => expect(screen.getByText('Moto 125')).toBeTruthy());
}

const tarjeta = (nombre) => screen.getByText(nombre).closest('article');

describe('TireProfileManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'ADMIN';
    for (const fn of ['fetchTireProfiles', 'fetchTireAssignments', 'fetchMachines', 'fetchVehicles', 'fetchMotos']) {
      data[fn].mockResolvedValue([]);
    }
    data.createTireProfile.mockResolvedValue({ id: 9, nombre: 'Nueva', aplicaA: 'VEHICULO', posiciones: [] });
    data.deleteTireProfile.mockResolvedValue(null);
    data.assignTireProfileVehicle.mockResolvedValue({});
    seed();
  });

  it('muestra cada configuración con sus rangos y dónde se usa', async () => {
    await montar();
    const moto = tarjeta('Moto 125');
    expect(moto.textContent).toContain('Delantera');
    expect(moto.textContent).toContain('28 – 33 PSI');
    expect(moto.textContent).toContain('Se pide en 1 moto: MOT001');
    expect(tarjeta('Camioneta').textContent).toContain('Todas30 – 35 PSI');
    expect(tarjeta('Camioneta').textContent).toContain('Aún no está asignada');
  });

  it('filtra por tipo de activo', async () => {
    await montar();
    await fireEvent.click(screen.getByRole('button', { name: 'Motos (1)' }));
    expect(screen.queryByText('Camioneta')).toBeNull();
    expect(screen.getByText('Moto 125')).toBeTruthy();
  });

  it('crea una configuración "igual para todas" y luego ofrece asignarla', async () => {
    await montar();
    await fireEvent.click(screen.getByRole('button', { name: '+ Nueva configuración' }));
    const dialog = screen.getByRole('dialog', { name: 'Nueva configuración de llantas' });

    await fireEvent.input(within(dialog).getByLabelText('Nombre de la configuración'), { target: { value: 'Volqueta' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: /10 llantas/ }));
    await fireEvent.input(within(dialog).getByLabelText('Todas las llantas — presión mínima'), { target: { value: '90' } });
    await fireEvent.input(within(dialog).getByLabelText('Todas las llantas — presión máxima'), { target: { value: '100' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(data.createTireProfile).toHaveBeenCalled());
    const payload = data.createTireProfile.mock.calls[0][0];
    expect(payload).toMatchObject({ nombre: 'Volqueta', aplicaA: 'VEHICULO' });
    expect(payload.posiciones).toHaveLength(10);
    expect(payload.posiciones.every((p) => p.psiMin === 90 && p.psiMax === 100)).toBe(true);
    // Tras crear se abre "¿Qué vehículos usan…?" para no dejarla sin asignar.
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Asignar Nueva' })).toBeTruthy());
  });

  it('valida antes de enviar y explica qué falta', async () => {
    await montar();
    await fireEvent.click(screen.getByRole('button', { name: '+ Nueva configuración' }));
    const dialog = screen.getByRole('dialog', { name: 'Nueva configuración de llantas' });
    await fireEvent.input(within(dialog).getByLabelText('Nombre de la configuración'), { target: { value: 'X' } });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(within(dialog).getByRole('alert').textContent).toMatch(/falta la presión mínima o la máxima/);
    expect(data.createTireProfile).not.toHaveBeenCalled();
  });

  it('asignar solo envía los cambios: marca uno nuevo y quita el que estaba', async () => {
    await montar();
    await fireEvent.click(within(tarjeta('Moto 125')).getByRole('button', { name: 'Asignar motos' }));
    const dialog = screen.getByRole('dialog', { name: 'Asignar Moto 125' });
    const [mot001, mot002] = within(dialog).getAllByRole('checkbox');
    expect(mot001.checked).toBe(true);
    await fireEvent.click(mot001);
    await fireEvent.click(mot002);
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar 2 cambios' }));

    await waitFor(() => expect(data.assignTireProfileVehicle).toHaveBeenCalledTimes(2));
    expect(data.assignTireProfileVehicle).toHaveBeenCalledWith(31, 1);
    expect(data.assignTireProfileVehicle).toHaveBeenCalledWith(30, null);
  });

  it('un activo eliminado que conserva la asignación aparece en "Asignar" para poder quitarlo', async () => {
    data.subscribe.mockImplementation((cb) => {
      cb({
        tireProfiles: PERFILES,
        tireAssignments: [{ vehicleId: 99, machineId: null, perfilId: 2 }],
        motos: [],
        vehicles: [{ id: 5, placa: 'ABC123', tipoVehiculo: 'CAMIONETA' }],
        machines: [],
      });
      return () => {};
    });
    await montar();
    expect(tarjeta('Camioneta').textContent).toContain('Vehículo #99');
    await fireEvent.click(within(tarjeta('Camioneta')).getByRole('button', { name: 'Asignar vehículos' }));
    const dialog = screen.getByRole('dialog', { name: 'Asignar Camioneta' });
    expect(dialog.textContent).toContain('Ya no está en el inventario');
    const [abc, eliminado] = within(dialog).getAllByRole('checkbox');
    expect(abc.checked).toBe(false);
    await fireEvent.click(eliminado);
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar 1 cambio' }));
    await waitFor(() => expect(data.assignTireProfileVehicle).toHaveBeenCalledWith(99, null));
  });

  it('una configuración en uso no se puede eliminar ni cambiar de tipo', async () => {
    await montar();
    await fireEvent.click(within(tarjeta('Moto 125')).getByRole('button', { name: 'Editar' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar configuración de llantas' });
    expect(within(dialog).queryByRole('button', { name: 'Eliminar' })).toBeNull();
    expect(dialog.textContent).toContain('Está en uso en 1 moto');
    expect(within(dialog).getByRole('button', { name: 'Vehículo' }).disabled).toBe(true);
  });

  it('elimina una configuración sin uso tras confirmar', async () => {
    await montar();
    await fireEvent.click(within(tarjeta('Camioneta')).getByRole('button', { name: 'Editar' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar configuración de llantas' });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Sí, eliminar' }));
    await waitFor(() => expect(data.deleteTireProfile).toHaveBeenCalledWith(2));
  });

  it('quien no administra solo consulta', async () => {
    role = 'OPERARIO';
    await montar();
    expect(screen.queryByRole('button', { name: '+ Nueva configuración' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });
});
