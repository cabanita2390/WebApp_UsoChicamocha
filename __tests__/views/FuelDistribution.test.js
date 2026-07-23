import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelDistribution from '../../components/views/FuelDistribution.svelte';

vi.mock('../../stores/data.js', () => ({
  data: {
    subscribe: vi.fn(),
    fetchFuelTypes: vi.fn(),
    fetchFuelDistribution: vi.fn(),
  },
}));

import { data } from '../../stores/data.js';

const mockDistribution = {
  fechaInicio: '2026-07-01',
  fechaFin: '2026-07-22',
  areaCosto: 'DISTRITO',
  totalGalonesDespachados: 80,
  totalCostoDespachado: 750000,
  filas: [
    {
      refuelingId: 1, fechaRegistro: '2026-07-10T09:00:00', vehicleId: 5, machineId: null,
      responsableId: 1, fuelTypeId: 1, origen: 'Estación Norte', horometroKm: 500,
      cantidadDespachada: 30, valorDespachado: 300000, cantidadReintegrada: null, valorReintegro: null,
    },
    {
      refuelingId: 2, fechaRegistro: '2026-07-11T09:00:00', vehicleId: null, machineId: 8,
      responsableId: 1, fuelTypeId: 1, origen: null, horometroKm: 120,
      cantidadDespachada: 50, valorDespachado: null, cantidadReintegrada: 5, valorReintegro: 45000,
    },
  ],
};

describe('FuelDistribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.subscribe.mockImplementation((callback) => {
      callback({
        fuelDistribution: mockDistribution,
        fuelTypes: [{ id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' }],
        isLoading: false,
      });
      return () => {};
    });
  });

  it('muestra las tarjetas resumen de galones y costo despachado', () => {
    render(FuelDistribution);
    expect(screen.getByText(/80\s?gal/)).toBeTruthy();
    expect(screen.getByText(/\$\s?750\s?k/i)).toBeTruthy();
  });

  it('una fila con valorDespachado=null muestra "—", no "$0" (tanqueo ALMACEN no valorizado)', () => {
    render(FuelDistribution);
    const rows = screen.getAllByRole('row');
    const filaSinValor = rows.find((r) => r.textContent.includes('Máquina #8'));
    expect(filaSinValor.textContent).toContain('—');
    expect(filaSinValor.textContent).not.toContain('$0');
  });

  it('vuelve a pedir la distribución con la nueva área y fechas al filtrar', async () => {
    render(FuelDistribution);

    await fireEvent.change(screen.getByLabelText(/área/i), { target: { value: 'ASOCIACION' } });
    await fireEvent.input(screen.getByLabelText(/fecha inicio/i), { target: { value: '2026-06-01' } });
    await fireEvent.input(screen.getByLabelText(/fecha fin/i), { target: { value: '2026-06-30' } });
    await fireEvent.click(screen.getByRole('button', { name: /filtrar/i }));

    expect(data.fetchFuelDistribution).toHaveBeenLastCalledWith('ASOCIACION', '2026-06-01', '2026-06-30');
  });
});
