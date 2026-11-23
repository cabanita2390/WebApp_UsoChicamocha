import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import { rangoDePreset, conPeriodo, nombreConPeriodo, nombreConCorte } from '../../utils/periodoExcel.js';
import PeriodoExcelModal from '../../components/shared/PeriodoExcelModal.svelte';

describe('periodos de las descargas a Excel', () => {
  const hoy = new Date(2026, 10, 23); // 23 nov 2026

  it('atajos', () => {
    expect(rangoDePreset('mes', hoy)).toEqual({ desde: '2026-11-01', hasta: '2026-11-30' });
    expect(rangoDePreset('mesAnterior', hoy)).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(rangoDePreset('anio', hoy)).toEqual({ desde: '2026-01-01', hasta: '2026-12-31' });
    expect(rangoDePreset('anioAnterior', hoy)).toEqual({ desde: '2025-01-01', hasta: '2025-12-31' });
    expect(rangoDePreset('ultimos12', hoy)).toEqual({ desde: '2025-12-01', hasta: '2026-11-23' });
    expect(rangoDePreset('mesAnterior', new Date(2026, 0, 15))).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
  });

  it('endpoint y nombre del archivo con el periodo', () => {
    expect(conPeriodo('order/export', {})).toBe('order/export');
    expect(conPeriodo('order/export', { desde: '2026-01-01', hasta: '2026-12-31' }))
      .toBe('order/export?desde=2026-01-01&hasta=2026-12-31');
    expect(conPeriodo('order/vehicle/export?soloMotos=true', { desde: '2026-01-01' }))
      .toBe('order/vehicle/export?soloMotos=true&desde=2026-01-01');
    expect(nombreConPeriodo('ordenes', {})).toBe('ordenes.xlsx');
    expect(nombreConPeriodo('ordenes', { desde: '2026-01-01', hasta: '2026-12-31' })).toBe('ordenes_2026-01-01_a_2026-12-31.xlsx');
    expect(nombreConCorte('consolidado_motos', new Date(2026, 10, 23))).toBe('consolidado_motos_2026-11-23.xlsx');
  });

  it('el panel abre en "Este año", deja elegir un rango y "Todo el historial" no manda fechas', async () => {
    const { component } = render(PeriodoExcelModal, { abierto: true, titulo: 'Órdenes de maquinaria' });
    const eventos = [];
    component.$on('descargar', (e) => eventos.push(e.detail));

    expect(screen.getByRole('radio', { name: 'Este año' }).getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(screen.getByText('Descargar'));
    expect(eventos[0].desde).toMatch(/^\d{4}-01-01$/);

    await fireEvent.click(screen.getByRole('radio', { name: 'Rango a la medida' }));
    await fireEvent.input(screen.getByLabelText('Desde'), { target: { value: '2026-03-10' } });
    await fireEvent.input(screen.getByLabelText('Hasta'), { target: { value: '2026-03-01' } });
    expect(screen.getByRole('alert').textContent).toContain('anterior');
    expect(screen.getByText('Descargar').disabled).toBe(true);
    await fireEvent.input(screen.getByLabelText('Hasta'), { target: { value: '2026-03-31' } });
    await fireEvent.click(screen.getByText('Descargar'));
    expect(eventos[1]).toEqual({ desde: '2026-03-10', hasta: '2026-03-31' });

    await fireEvent.click(screen.getByRole('radio', { name: 'Todo el historial' }));
    await fireEvent.click(screen.getByText('Descargar'));
    expect(eventos[2]).toEqual({});
  });

  it('donde antes se descargaba todo, el panel abre en "Todo el historial"', () => {
    render(PeriodoExcelModal, { abierto: true, presetInicial: 'todo' });
    expect(screen.getByRole('radio', { name: 'Todo el historial' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByLabelText('Desde')).toBeNull();
  });
});
