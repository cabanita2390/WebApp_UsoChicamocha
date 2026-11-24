import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';

const CATALOGO = [
  { clave: 'consolidado-motos', titulo: 'Consolidado de motos', modulo: 'Flota', usaPeriodo: false,
    periodoInicial: 'anio', filtros: [], columnas: [] },
  { clave: 'ordenes-maquinaria', titulo: 'Órdenes de trabajo · Maquinaria', modulo: 'Flota', usaPeriodo: true,
    periodoInicial: 'anio', filtros: [], columnas: [] },
  { clave: 'rendimiento-historial', titulo: 'Historial de rendimiento de un activo', modulo: 'Combustible',
    usaPeriodo: true, periodoInicial: 'todo', columnas: [],
    filtros: [{ clave: 'tipo', etiqueta: 'Tipo de activo', tipo: 'CONTEXTO', obligatorio: true },
      { clave: 'activoId', etiqueta: 'Activo', tipo: 'CONTEXTO', obligatorio: true }] },
];

vi.mock('../../stores/api.js', () => ({
  default: vi.fn((url) => Promise.resolve(url === 'reportes' ? CATALOGO : [])),
  download: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../stores/ui.js', () => ({ addNotification: vi.fn() }));

import BotonExcel from '../../components/shared/BotonExcel.svelte';
import { download } from '../../stores/api.js';
import { addNotification } from '../../stores/ui.js';
import { urlReporte } from '../../stores/reportes.js';

describe('BotonExcel: el único botón de descargas a Excel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-23T10:00:00'));
  });
  afterEach(() => vi.useRealTimers());

  it('sin nada que elegir (consolidado, hoja de vida) descarga de una', async () => {
    render(BotonExcel, { claves: 'consolidado-motos' });
    await fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => expect(download).toHaveBeenCalledWith('reportes/consolidado-motos', 'consolidado_motos.xlsx'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('con periodo abre el panel en el atajo que dice el back y manda desde / hasta', async () => {
    render(BotonExcel, { claves: 'ordenes-maquinaria' });
    await fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await screen.findByRole('dialog', { name: 'Descargar Excel' });
    expect(screen.getByText('Órdenes de trabajo · Maquinaria')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Este año' }).getAttribute('aria-checked')).toBe('true');
    await fireEvent.click(screen.getByRole('radio', { name: 'Mes anterior' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));

    await waitFor(() => expect(download).toHaveBeenCalledWith(
      'reportes/ordenes-maquinaria?desde=2026-10-01&hasta=2026-10-31', 'ordenes_maquinaria.xlsx'));
  });

  it('"Todo el historial" no manda fechas; un rango al revés no deja descargar', async () => {
    render(BotonExcel, { claves: 'ordenes-maquinaria' });
    await fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await screen.findByRole('dialog');

    await fireEvent.click(screen.getByRole('radio', { name: 'Rango a la medida' }));
    await fireEvent.input(screen.getByLabelText('Desde'), { target: { value: '2026-05-01' } });
    await fireEvent.input(screen.getByLabelText('Hasta'), { target: { value: '2026-04-01' } });
    expect(screen.getByRole('alert').textContent).toContain('anterior');
    expect(screen.getByRole('button', { name: 'Descargar' }).disabled).toBe(true);

    await fireEvent.click(screen.getByRole('radio', { name: 'Todo el historial' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith('reportes/ordenes-maquinaria', 'ordenes_maquinaria.xlsx'));
  });

  it('los filtros de contexto los pone la pantalla y no se muestran', async () => {
    render(BotonExcel, { claves: 'rendimiento-historial', contexto: { tipo: 'VEHICULO', activoId: 12 } });
    await fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await screen.findByRole('dialog');

    expect(screen.getByRole('radio', { name: 'Todo el historial' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByText('Activo')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith(
      'reportes/rendimiento-historial?tipo=VEHICULO&activoId=12', 'rendimiento_historial.xlsx'));
  });

  it('con el periodo fijado por la pantalla no pregunta', async () => {
    render(BotonExcel, { claves: 'ordenes-maquinaria', periodo: { desde: '2026-02-01', hasta: '2026-02-28' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => expect(download).toHaveBeenCalledWith(
      'reportes/ordenes-maquinaria?desde=2026-02-01&hasta=2026-02-28', 'ordenes_maquinaria.xlsx'));
  });

  it('un reporte que no le toca al usuario avisa en vez de descargar', async () => {
    render(BotonExcel, { claves: 'estaciones-ejecuciones' });
    await fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('No tiene permiso') })));
    expect(download).not.toHaveBeenCalled();
  });

  it('si la descarga directa falla, avisa', async () => {
    download.mockRejectedValueOnce(new Error('sin conexión'));
    render(BotonExcel, { claves: 'consolidado-motos' });
    await fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('sin conexión') })));
  });
});

describe('urlReporte', () => {
  it('sin los vacíos y con las columnas separadas por coma', () => {
    expect(urlReporte('tanqueos', { desde: '', hasta: undefined, filtros: { tipo: 'VEHICULO', area: '' } }))
      .toBe('reportes/tanqueos?tipo=VEHICULO');
    expect(urlReporte('estaciones-avance', { filtros: { anio: 2026 }, columnas: ['estacion', 'criticidad'] }))
      .toBe('reportes/estaciones-avance?anio=2026&columnas=estacion%2Ccriticidad');
    expect(urlReporte('consolidado-motos')).toBe('reportes/consolidado-motos');
  });
});
