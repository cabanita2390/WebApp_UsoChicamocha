import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

// Las hojas de Estaciones vienen del motor de reportes (GET /reportes), con sus filtros y columnas.
const CATALOGO = [
  { clave: 'estaciones-ejecuciones', titulo: 'Ejecuciones', modulo: 'Estaciones de Bombeo', usaPeriodo: false,
    periodoInicial: 'anio',
    filtros: [
      { clave: 'disciplina', etiqueta: 'Disciplina', tipo: 'DISCIPLINA', obligatorio: false },
      { clave: 'anio', etiqueta: 'Año', tipo: 'ANIO', obligatorio: false },
      { clave: 'mes', etiqueta: 'Mes', tipo: 'MES', obligatorio: false },
      { clave: 'estacionId', etiqueta: 'Estación', tipo: 'ESTACION', obligatorio: false },
    ],
    columnas: [
      { clave: 'fecha', titulo: 'Fecha', porDefecto: true },
      { clave: 'estacion', titulo: 'Estación', porDefecto: true },
      { clave: 'mesSemana', titulo: 'Mes / semana', porDefecto: false },
    ] },
  { clave: 'estaciones-actividades', titulo: 'Resumen por actividad', modulo: 'Estaciones de Bombeo', usaPeriodo: false,
    periodoInicial: 'anio',
    filtros: [
      { clave: 'disciplina', etiqueta: 'Disciplina', tipo: 'DISCIPLINA', obligatorio: false },
      { clave: 'anio', etiqueta: 'Año', tipo: 'ANIO', obligatorio: false },
    ],
    columnas: [{ clave: 'actividad', titulo: 'Actividad', porDefecto: true }] },
];

vi.mock('../../stores/api.js', () => ({
  default: vi.fn((url) => Promise.resolve(
    url === 'reportes' ? CATALOGO : url.startsWith('substation/estaciones') ? [{ id: 4, nombre: 'Ayalas' }] : [])),
  download: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../stores/ui.js', () => ({ addNotification: vi.fn() }));

import DescargaExcel from '../../components/views/subestaciones/DescargaExcel.svelte';
import { download } from '../../stores/api.js';
import { disciplinaFiltro } from '../../stores/subestacionesFilters.js';
import { disciplinas, disciplinasListas } from '../../stores/disciplinas.js';

describe('DescargaExcel (hojas de Estaciones en el botón único)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disciplinas.set([{ codigo: 'ELECTRICO', nombre: 'Eléctrico', orden: 1 }]);
    disciplinasListas.set(true);
    disciplinaFiltro.set('ELECTRICO');
  });

  it('abre con la hoja de la vista, la disciplina filtrada y las columnas por defecto', async () => {
    render(DescargaExcel, { hoja: 'EJECUCIONES', filtros: { anio: 2026, mes: 9 } });
    await fireEvent.click(screen.getByText('Descargar Excel'));

    expect(await screen.findByText('2 de 3')).toBeTruthy();
    expect(screen.getByLabelText('Qué descargar').value).toBe('estaciones-ejecuciones');
    expect(screen.getByLabelText('Disciplina').value).toBe('ELECTRICO');
    expect(screen.getByLabelText('Fecha').checked).toBe(true);
    expect(screen.getByLabelText('Mes / semana').checked).toBe(false);
    expect(screen.queryByRole('radiogroup'), 'Estaciones usa año y mes, no el periodo libre').toBeNull();

    await fireEvent.click(screen.getByLabelText('Mes / semana'));
    await fireEvent.change(screen.getByLabelText('Estación', { selector: 'select' }), { target: { value: '4' } });
    await fireEvent.click(screen.getByText('Descargar'));

    await waitFor(() => expect(download).toHaveBeenCalledWith(
      'reportes/estaciones-ejecuciones?disciplina=ELECTRICO&anio=2026&mes=9&estacionId=4&columnas=fecha%2Cestacion%2CmesSemana',
      'estaciones_ejecuciones.xlsx'));
  });

  it('una hoja sin mes ni estación no los pide ni los envía', async () => {
    render(DescargaExcel, { hoja: 'ACTIVIDADES', filtros: { anio: 2025, mes: 3 } });
    await fireEvent.click(screen.getByText('Descargar Excel'));
    await screen.findByText('1 de 1');

    expect(screen.queryByLabelText('Mes')).toBeNull();
    expect(screen.queryByLabelText('Estación', { selector: 'select' })).toBeNull();
    await fireEvent.click(screen.getByText('Descargar'));
    await waitFor(() => expect(download).toHaveBeenCalledWith(
      'reportes/estaciones-actividades?disciplina=ELECTRICO&anio=2025&columnas=actividad', 'estaciones_actividades.xlsx'));
  });

  it('sin columnas no deja descargar', async () => {
    render(DescargaExcel, { hoja: 'EJECUCIONES' });
    await fireEvent.click(screen.getByText('Descargar Excel'));
    await screen.findByText('2 de 3');

    await fireEvent.click(screen.getByText('Ninguna'));
    expect(screen.getByText('Descargar').disabled).toBe(true);
  });
});
