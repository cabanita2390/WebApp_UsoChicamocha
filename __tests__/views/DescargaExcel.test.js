import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    hojasExportables: vi.fn(),
    listarEstaciones: vi.fn(),
    exportar: vi.fn(),
  },
}));

import DescargaExcel from '../../components/views/subestaciones/DescargaExcel.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';
import { disciplinaFiltro } from '../../stores/subestacionesFilters.js';

const HOJAS = [
  { clave: 'EJECUCIONES', titulo: 'Ejecuciones', filtros: ['disciplina', 'anio', 'mes', 'estacionId'], columnas: [
    { clave: 'fecha', titulo: 'Fecha', porDefecto: true },
    { clave: 'estacion', titulo: 'Estación', porDefecto: true },
    { clave: 'mesSemana', titulo: 'Mes / semana', porDefecto: false },
  ] },
  { clave: 'ACTIVIDADES', titulo: 'Resumen por actividad', filtros: ['disciplina', 'anio'], columnas: [
    { clave: 'actividad', titulo: 'Actividad', porDefecto: true },
  ] },
];

describe('DescargaExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disciplinaFiltro.set('ELECTRICO');
    substationAdmin.hojasExportables.mockResolvedValue(HOJAS);
    substationAdmin.listarEstaciones.mockResolvedValue([{ id: 4, nombre: 'Ayalas' }]);
    substationAdmin.exportar.mockResolvedValue();
  });

  it('abre con la hoja de la vista, la disciplina filtrada y las columnas por defecto', async () => {
    render(DescargaExcel, { hoja: 'EJECUCIONES', filtros: { anio: 2026, mes: 9 } });
    await fireEvent.click(screen.getByText('Descargar Excel'));

    expect(await screen.findByText('2 de 3')).toBeTruthy();
    expect(screen.getByLabelText('Qué descargar').value).toBe('EJECUCIONES');
    expect(screen.getByLabelText('Disciplina').value).toBe('ELECTRICO');
    expect(screen.getByLabelText('Fecha').checked).toBe(true);
    expect(screen.getByLabelText('Mes / semana').checked).toBe(false);

    await fireEvent.click(screen.getByLabelText('Mes / semana'));
    await fireEvent.change(screen.getByLabelText('Estación', { selector: 'select' }), { target: { value: '4' } });
    await fireEvent.click(screen.getByText('Descargar'));

    await waitFor(() => expect(substationAdmin.exportar).toHaveBeenCalledWith({
      hoja: 'EJECUCIONES', disciplina: 'ELECTRICO', anio: 2026, mes: 9, estacionId: 4,
      columnas: ['fecha', 'estacion', 'mesSemana'],
    }));
  });

  it('una hoja sin mes ni estación no los pide ni los envía', async () => {
    render(DescargaExcel, { hoja: 'ACTIVIDADES', filtros: { anio: 2025, mes: 3 } });
    await fireEvent.click(screen.getByText('Descargar Excel'));
    await screen.findByText('1 de 1');

    expect(screen.queryByLabelText('Mes')).toBeNull();
    expect(screen.queryByLabelText('Estación', { selector: 'select' })).toBeNull();
    await fireEvent.click(screen.getByText('Descargar'));
    await waitFor(() => expect(substationAdmin.exportar).toHaveBeenCalledWith({
      hoja: 'ACTIVIDADES', disciplina: 'ELECTRICO', anio: 2025, mes: undefined, estacionId: undefined,
      columnas: ['actividad'],
    }));
  });

  it('sin columnas no deja descargar', async () => {
    render(DescargaExcel, { hoja: 'EJECUCIONES' });
    await fireEvent.click(screen.getByText('Descargar Excel'));
    await screen.findByText('2 de 3');

    await fireEvent.click(screen.getByText('Ninguna'));
    expect(screen.getByText('Descargar').disabled).toBe(true);
  });
});
