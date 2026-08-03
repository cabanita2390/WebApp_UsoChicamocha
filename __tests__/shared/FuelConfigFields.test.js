import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FuelConfigFields from '../../components/shared/FuelConfigFields.svelte';

const FUEL_TYPES = [
  { id: 1, codigo: 'ACPM', nombre: 'ACPM / Diésel', unidadMedida: 'GALON' },
  { id: 4, codigo: 'GAS', nombre: 'Gas natural vehicular', unidadMedida: 'M3' },
];

describe('FuelConfigFields', () => {
  it('empieza sin combustible elegido y con Consumo estándar deshabilitado', () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });

    expect(screen.getByLabelText(/combustible/i).value).toBe('');
    expect(screen.getByLabelText(/consumo estándar/i)).toBeDisabled();
  });

  it('al elegir un combustible de galón, ofrece Km/Gl y Gl/Hr, y sugiere Km/Gl por defecto', async () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });

    const opciones = Array.from(screen.getByLabelText(/^unidad$/i).options).map((o) => o.value);
    expect(opciones.sort()).toEqual(['GAL_POR_HORA', 'KM_POR_GALON']);
    expect(screen.getByLabelText(/^unidad$/i).value).toBe('KM_POR_GALON');
    expect(screen.getByLabelText(/consumo estándar/i)).not.toBeDisabled();
  });

  it('al elegir un combustible de gas (m³), ofrece Km/M3 y M3/Hr', async () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

    const opciones = Array.from(screen.getByLabelText(/^unidad$/i).options).map((o) => o.value);
    expect(opciones.sort()).toEqual(['KM_POR_M3', 'M3_POR_HORA']);
  });

  it('permite elegir manualmente la otra unidad válida (ej. Gl/Hr para un vehículo diésel por horómetro)', async () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });

    await fireEvent.change(screen.getByLabelText(/^unidad$/i), { target: { value: 'GAL_POR_HORA' } });

    expect(screen.getByLabelText(/^unidad$/i).value).toBe('GAL_POR_HORA');
  });

  it('al cambiar a un combustible de otra familia física, resetea la unidad a una válida para la nueva', async () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });
    await fireEvent.change(screen.getByLabelText(/^unidad$/i), { target: { value: 'GAL_POR_HORA' } });

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '4' } });

    expect(screen.getByLabelText(/^unidad$/i).value).toBe('KM_POR_M3');
  });

  it('al quitar el combustible ("— Sin configurar —"), no muestra selector de unidad y deshabilita consumo estándar', async () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });
    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '' } });

    expect(screen.queryByLabelText(/^unidad$/i)).toBeNull();
    expect(screen.getByLabelText(/consumo estándar/i)).toBeDisabled();
  });

  it('permite ingresar la capacidad del tanque', async () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });

    await fireEvent.input(screen.getByLabelText(/capacidad del tanque/i), { target: { value: '18.5' } });

    expect(screen.getByLabelText(/capacidad del tanque/i).value).toBe('18.5');
  });

  it('respeta el prop disabled en todos los campos', () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new', disabled: true } });

    expect(screen.getByLabelText(/combustible/i)).toBeDisabled();
    expect(screen.getByLabelText(/capacidad del tanque/i)).toBeDisabled();
  });

  it('sugiere la unidad "por hora" primero cuando preferPorHora=true (maquinaria)', async () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new', preferPorHora: true } });

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });

    expect(screen.getByLabelText(/^unidad$/i).value).toBe('GAL_POR_HORA');
  });

  it('sugiere la unidad "por distancia" primero cuando preferPorHora=false (vehículo/moto, default)', async () => {
    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });

    await fireEvent.change(screen.getByLabelText(/combustible/i), { target: { value: '1' } });

    expect(screen.getByLabelText(/^unidad$/i).value).toBe('KM_POR_GALON');
  });

  it('usa ids distintos según idPrefix, para poder usarse dos veces en la misma página (crear + editar)', () => {
    const { unmount } = render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'new' } });
    expect(document.getElementById('newFuelType')).toBeTruthy();
    unmount();

    render(FuelConfigFields, { props: { fuelTypes: FUEL_TYPES, idPrefix: 'edit' } });
    expect(document.getElementById('editFuelType')).toBeTruthy();
  });
});
