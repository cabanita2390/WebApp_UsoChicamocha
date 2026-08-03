import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AssetFuelConfigManagement from '../../components/views/AssetFuelConfigManagement.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchVehicles: vi.fn(),
    fetchMotos: vi.fn(),
    fetchMachines: vi.fn(),
    updateAssetFuelConfigVehicle: vi.fn().mockResolvedValue({ id: 1 }),
    updateAssetFuelConfigMachine: vi.fn().mockResolvedValue({ id: 2 }),
  },
}));

import { data } from '../../stores/data.js';

const VEHICLES = [
  { id: 5, placa: 'ABC123', marca: 'Toyota', modelo: '2020', tipoVehiculo: 'CAMPERO' },
  { id: 6, placa: 'XYZ789', marca: 'Chevrolet', modelo: '2018', tipoVehiculo: 'CAMIONETA' },
];
const MOTOS = [
  { id: 30, placa: 'MOT001', marca: 'Yamaha', modelo: '2019', tipoVehiculo: 'MOTOCICLETA' },
  { id: 31, placa: 'MOT002', marca: 'Honda', modelo: '2021', tipoVehiculo: 'MOTOCICLETA' },
];
const MACHINES = [
  { id: 8, name: 'Excavadora', brand: 'CAT', model: 'X200', numInterIdentification: 'MAQ-08' },
  { id: 9, name: 'Retroexcavadora', brand: 'JCB', model: '3CX', numInterIdentification: 'MAQ-09' },
];
// GET /vehicle en el backend real NO filtra por tipo — trae motos también
// porque viven en la misma tabla vehiculos. Simula ese mismo "vehicles" sucio
// para probar que el frontend sí las excluye al elegir Vehículo.
const VEHICLES_CON_MOTO_MEZCLADA = [...VEHICLES, { id: 40, placa: 'MOT-COLADA', marca: 'Suzuki', tipoVehiculo: 'MOTOCICLETA' }];

function seedStore({ vehicles = VEHICLES, motos = MOTOS, machines = MACHINES } = {}) {
  data.subscribe.mockImplementation((callback) => {
    callback({
      fuelTypes: [
        { id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' },
        { id: 4, codigo: 'GAS', nombre: 'Gas natural vehicular', unidadMedida: 'M3' },
      ],
      vehicles,
      motos,
      machines,
      isLoading: false,
    });
    return () => {};
  });
}

async function elegirTipo(tipo) {
  await fireEvent.change(screen.getByLabelText(/tipo de activo/i), { target: { value: tipo } });
}

// El input del buscador siempre está visible una vez elegido el tipo — se
// "abre" (despliega la lista) al enfocarlo, igual que el mockup de Tanqueo.
async function abrirBuscador(ariaLabelRegex) {
  await fireEvent.focus(screen.getByLabelText(ariaLabelRegex));
}

describe('AssetFuelConfigManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore();
  });

  it('el modal se muestra directo al montar, sin tabla ni botón intermedio', () => {
    render(AssetFuelConfigManagement);
    expect(screen.getByLabelText(/combustible/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /\+ configurar/i })).toBeNull();
    expect(screen.queryByText(/consumo estándar por vehículo\/máquina/i)).toBeNull();
  });

  it('"Tipo de activo" empieza sin preseleccionar nada (opción "Seleccione...")', () => {
    render(AssetFuelConfigManagement);
    expect(screen.getByLabelText(/tipo de activo/i).value).toBe('');
  });

  it('mientras no se elija un tipo de activo, no se muestra ningún buscador de activo', () => {
    render(AssetFuelConfigManagement);
    expect(screen.queryByPlaceholderText(/escribe o haz clic/i)).toBeNull();
  });

  it('al elegir un tipo, el input aparece con placeholder pero sin desplegar la lista todavía', async () => {
    const { container } = render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');

    expect(screen.getByPlaceholderText(/escribe o haz clic para ver opciones/i)).toBeTruthy();
    expect(container.querySelector('.activo-lista')).toBeNull();
  });

  it('al enfocar el input, despliega la lista completa (con scroll) de ese tipo', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);

    expect(screen.getByText('ABC123 — Toyota')).toBeTruthy();
    expect(screen.getByText('XYZ789 — Chevrolet')).toBeTruthy();
  });

  it('filtra por cualquier campo del activo (no solo el que se muestra), ej. por tipoVehiculo', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);

    await fireEvent.input(screen.getByLabelText(/buscar vehículo/i), { target: { value: 'camioneta' } });

    expect(screen.getByText('XYZ789 — Chevrolet')).toBeTruthy();
    expect(screen.queryByText('ABC123 — Toyota')).toBeNull();
  });

  it('al hacer click en un resultado, cierra la lista y deja el activo elegido escrito en el input (sin abrir otro modal)', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);

    await fireEvent.click(screen.getByText('ABC123 — Toyota'));

    expect(screen.getByLabelText(/buscar vehículo/i).value).toBe('ABC123 — Toyota');
    expect(screen.queryByText('XYZ789 — Chevrolet')).toBeNull();
    expect(screen.getAllByRole('dialog').length).toBe(1);
  });

  it('al volver a enfocar el input después de elegir uno, reabre la lista completa para poder cambiarlo', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);
    await fireEvent.click(screen.getByText('ABC123 — Toyota'));

    await abrirBuscador(/buscar vehículo/i);

    expect(screen.getByText('ABC123 — Toyota')).toBeTruthy();
    expect(screen.getByText('XYZ789 — Chevrolet')).toBeTruthy();
  });

  it('un click fuera del buscador lo cierra y el input vuelve a mostrar lo ya elegido (no lo pierde)', async () => {
    const { container } = render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);
    await fireEvent.click(screen.getByText('ABC123 — Toyota'));
    await abrirBuscador(/buscar vehículo/i);
    expect(container.querySelector('.activo-lista')).toBeTruthy();

    await fireEvent.click(screen.getByText(/configurar rendimiento del activo/i));

    expect(container.querySelector('.activo-lista')).toBeNull();
    expect(screen.getByLabelText(/buscar vehículo/i).value).toBe('ABC123 — Toyota');
  });

  it('al cambiar el tipo de activo, limpia la selección anterior y el input queda vacío otra vez', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);
    await fireEvent.click(screen.getByText('ABC123 — Toyota'));

    await elegirTipo('MAQUINA');

    expect(screen.getByLabelText(/buscar máquina/i).value).toBe('');
  });

  it('al elegir Vehículo, excluye las motos que vienen mezcladas en /vehicle (el backend no filtra por tipo ahí)', async () => {
    seedStore({ vehicles: VEHICLES_CON_MOTO_MEZCLADA });
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);

    expect(screen.getByText('ABC123 — Toyota')).toBeTruthy();
    expect(screen.queryByText('MOT-COLADA — Suzuki')).toBeNull();
  });

  it('al elegir Motocicleta, el buscador despliega la lista de motos (no de vehículos)', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('MOTOCICLETA');
    await abrirBuscador(/buscar motocicleta/i);

    expect(screen.getByText('MOT001 — Yamaha')).toBeTruthy();
    expect(screen.queryByText('ABC123 — Toyota')).toBeNull();
  });

  it('al elegir Máquina, el buscador despliega la lista de máquinas y filtra por campos ocultos (numInterIdentification)', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('MAQUINA');
    await abrirBuscador(/buscar máquina/i);

    await fireEvent.input(screen.getByLabelText(/buscar máquina/i), { target: { value: 'maq-09' } });

    expect(screen.getByText('Retroexcavadora — JCB')).toBeTruthy();
    expect(screen.queryByText('Excavadora — CAT')).toBeNull();
  });

  // Nota: no se prueba aquí "no vuelve a pedir si ya está cargado" ni el
  // estado "Cargando..." porque ambos dependen de observar el efecto de
  // onMount, y en este proyecto onMount no es observable de forma confiable
  // en Vitest + @testing-library/svelte (confirmado: ni sync, ni tick(), ni
  // waitFor). El comportamiento (reutilizar arrays ya cargados, guardas por
  // .length) queda documentado en el código; se verificó manualmente.

  describe('unidad de consumo editable', () => {
    it('sugiere la unidad automáticamente pero queda en un <select> editable, no fijo', async () => {
      render(AssetFuelConfigManagement);
      await elegirTipo('VEHICULO');
      await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

      expect(screen.getByLabelText(/unidad de consumo/i).value).toBe('KM_POR_M3');
    });

    it('permite cambiar manualmente la unidad sugerida (ej. máquina trackeada por km/gal en vez de horas)', async () => {
      render(AssetFuelConfigManagement);
      await elegirTipo('MAQUINA');
      await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
      expect(screen.getByLabelText(/unidad de consumo/i).value).toBe('GAL_POR_HORA');

      await fireEvent.change(screen.getByLabelText(/unidad de consumo/i), { target: { value: 'KM_POR_GALON' } });

      expect(screen.getByLabelText(/unidad de consumo/i).value).toBe('KM_POR_GALON');
    });

    it('solo ofrece las 2 unidades válidas para el combustible elegido, no las 4 (evita combinaciones físicamente inválidas)', async () => {
      render(AssetFuelConfigManagement);
      await elegirTipo('VEHICULO');
      await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } }); // ACPM = GALON

      const opciones = Array.from(screen.getByLabelText(/unidad de consumo/i).options).map((o) => o.value);
      expect(opciones.sort()).toEqual(['GAL_POR_HORA', 'KM_POR_GALON']);
    });

    it('la unidad elegida a mano no se pierde al interactuar con otros campos del formulario (ej. vehículo diésel por horómetro)', async () => {
      render(AssetFuelConfigManagement);
      await elegirTipo('VEHICULO');
      await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
      await fireEvent.change(screen.getByLabelText(/unidad de consumo/i), { target: { value: 'GAL_POR_HORA' } });

      await abrirBuscador(/buscar vehículo/i);
      await fireEvent.click(screen.getByText('ABC123 — Toyota'));
      await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '30' } });

      expect(screen.getByLabelText(/unidad de consumo/i).value).toBe('GAL_POR_HORA');
    });

    it('el envío usa la unidad elegida a mano, no la sugerida automáticamente', async () => {
      render(AssetFuelConfigManagement);
      await elegirTipo('VEHICULO');
      await abrirBuscador(/buscar vehículo/i);
      await fireEvent.click(screen.getByText('ABC123 — Toyota'));
      await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
      await fireEvent.change(screen.getByLabelText(/unidad de consumo/i), { target: { value: 'GAL_POR_HORA' } });
      await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '30' } });

      await fireEvent.submit(screen.getByRole('form'));

      expect(data.updateAssetFuelConfigVehicle).toHaveBeenCalledWith(5, {
        fuelTypeDefaultId: 1,
        consumoEstandar: 30,
        unidadConsumo: 'GAL_POR_HORA',
        tanqueCapacidadGal: null,
      });
    });

    it('al cambiar de verdad el combustible (otra familia física), vuelve a sugerir (ya no aplica el override anterior)', async () => {
      render(AssetFuelConfigManagement);
      await elegirTipo('VEHICULO');
      await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
      await fireEvent.change(screen.getByLabelText(/unidad de consumo/i), { target: { value: 'GAL_POR_HORA' } });

      await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

      expect(screen.getByLabelText(/unidad de consumo/i).value).toBe('KM_POR_M3');
    });
  });

  it('calcula la unidad de consumo automáticamente según tipo de activo y combustible (vehículo + gas = KM_POR_M3)', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

    expect(screen.getByLabelText(/unidad de consumo/i).value).toBe('KM_POR_M3');
  });

  it('motocicleta usa la misma unidad que vehículo (moto + gas = KM_POR_M3)', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('MOTOCICLETA');
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

    expect(screen.getByLabelText(/unidad de consumo/i).value).toBe('KM_POR_M3');
  });

  it('calcula la unidad de consumo automáticamente (máquina + gasolina = GAL_POR_HORA)', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('MAQUINA');
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });

    expect(screen.getByLabelText(/unidad de consumo/i).value).toBe('GAL_POR_HORA');
  });

  it('envía la configuración de vehículo seleccionado con la unidad calculada', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);
    await fireEvent.click(screen.getByText('ABC123 — Toyota'));
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

  it('envía la configuración de motocicleta usando el mismo endpoint de vehículo (motos viven en la tabla vehiculos)', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('MOTOCICLETA');
    await abrirBuscador(/buscar motocicleta/i);
    await fireEvent.click(screen.getByText('MOT001 — Yamaha'));
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '25' } });

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.updateAssetFuelConfigVehicle).toHaveBeenCalledWith(30, {
      fuelTypeDefaultId: 1,
      consumoEstandar: 25,
      unidadConsumo: 'KM_POR_GALON',
      tanqueCapacidadGal: null,
    });
    expect(data.updateAssetFuelConfigMachine).not.toHaveBeenCalled();
  });

  it('envía la configuración de máquina seleccionada', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('MAQUINA');
    await abrirBuscador(/buscar máquina/i);
    await fireEvent.click(screen.getByText('Excavadora — CAT'));
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '4.5' } });

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.updateAssetFuelConfigMachine).toHaveBeenCalledWith(8, {
      fuelTypeDefaultId: 1,
      consumoEstandar: 4.5,
      unidadConsumo: 'GAL_POR_HORA',
      tanqueCapacidadGal: null,
    });
  });

  it('no deja enviar el formulario sin elegir un activo de la lista', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '30' } });

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.updateAssetFuelConfigVehicle).not.toHaveBeenCalled();
    expect(screen.getByText(/seleccione vehículo de la lista/i)).toBeTruthy();
  });

  it('no deja enviar el formulario con consumo estándar en 0 o menos', async () => {
    render(AssetFuelConfigManagement);
    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);
    await fireEvent.click(screen.getByText('ABC123 — Toyota'));
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '0' } });

    await fireEvent.submit(screen.getByRole('form'));

    expect(data.updateAssetFuelConfigVehicle).not.toHaveBeenCalled();
    expect(screen.getByText(/consumo estándar debe ser mayor a 0/i)).toBeTruthy();
  });

  it('dispara el evento "close" al cancelar, para que el contenedor oculte el modal', async () => {
    const { component } = render(AssetFuelConfigManagement);
    const onClose = vi.fn();
    component.$on('close', onClose);

    await fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('dispara el evento "close" tras guardar exitosamente', async () => {
    const { component } = render(AssetFuelConfigManagement);
    const onClose = vi.fn();
    component.$on('close', onClose);

    await elegirTipo('VEHICULO');
    await abrirBuscador(/buscar vehículo/i);
    await fireEvent.click(screen.getByText('ABC123 — Toyota'));
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.input(screen.getByLabelText(/consumo estándar/i), { target: { value: '30' } });
    await fireEvent.submit(screen.getByRole('form'));

    expect(onClose).toHaveBeenCalled();
  });
});
