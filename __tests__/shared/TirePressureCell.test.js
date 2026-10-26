import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import DataGrid from '../../components/shared/DataGrid.svelte';

const columns = [
  { accessorKey: 'placa', header: 'Placa' },
  {
    accessorKey: 'presionLlantasEstado',
    header: 'Presión llantas',
    meta: { isTirePressure: true, getTirePressureTitle: (row) => `Presión de llantas — ${row.placa}` },
  },
];

const rows = [
  {
    placa: 'ABC123',
    presionLlantasEstado: 'BAJA',
    presionesLlantas: [
      { codigoPosicion: 'TRA', etiquetaPosicion: 'Trasera', orden: 2, psiMedido: 22, psiMin: 28, psiMax: 33, resultado: 'BAJA' },
      { codigoPosicion: 'DEL', etiquetaPosicion: 'Delantera', orden: 1, psiMedido: 30, psiMin: 28, psiMax: 33, resultado: 'OK' },
    ],
  },
  { placa: 'SIN001', presionLlantasEstado: null, presionesLlantas: [] },
];

describe('DataGrid — celda de presión de llantas', () => {
  it('muestra el semáforo del estado y un guion si la inspección no registró presiones', () => {
    render(DataGrid, { props: { columns, data: rows } });
    const baja = screen.getByRole('button', { name: '1 baja' });
    expect(baja.className).toContain('status-malo');
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('al hacer clic abre el detalle por llanta sin emitir cellContextMenu (no crea orden)', async () => {
    const { component } = render(DataGrid, { props: { columns, data: rows } });
    let contextMenu = 0;
    component.$on('cellContextMenu', () => contextMenu++);

    await fireEvent.click(screen.getByRole('button', { name: '1 baja' }));

    const dialog = screen.getByRole('dialog', { name: 'Presión de llantas — ABC123' });
    const filas = dialog.querySelectorAll('li');
    expect(filas[0].textContent).toContain('Delantera');
    expect(filas[1].textContent).toContain('Trasera');
    expect(filas[1].textContent).toContain('22 PSI');
    expect(filas[1].textContent).toContain('Rango 28 – 33 PSI');
    expect(dialog.textContent).toContain('1 llanta baja: el operario debe calibrarlas.');
    // El dibujo numera las llantas en el mismo orden de la lista.
    expect(dialog.querySelector('svg[role="img"]')).toBeTruthy();
    expect(contextMenu).toBe(0);

    await fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
