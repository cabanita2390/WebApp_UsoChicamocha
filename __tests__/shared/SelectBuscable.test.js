import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SelectBuscable from '../../components/shared/SelectBuscable.svelte';
import { opcionesActividades, opcionesEstaciones } from '../../utils/opcionesFiltro.js';

const textos = () => screen.queryAllByRole('option').map((o) => o.textContent.trim());

describe('SelectBuscable', () => {
  const actividades = opcionesActividades([
    { id: 2, nombre: 'Revisar tablero', disciplina: 'ELECTRICO', activa: true },
    { id: 1, nombre: 'Pintura muros', disciplina: 'CIVIL', activa: true },
    { id: 3, nombre: 'Limpieza tanque', disciplina: 'CIVIL', activa: false },
  ]);

  it('agrupa por disciplina, ordena por nombre y marca lo inactivo', async () => {
    render(SelectBuscable, { opciones: actividades, ariaLabel: 'Actividad' });
    await fireEvent.click(screen.getByRole('button', { name: 'Actividad' }));

    expect(textos()).toEqual(['Todas', 'Limpieza tanque (inactiva)', 'Pintura muros', 'Revisar tablero']);
    expect(screen.getByText('Civil')).toBeTruthy();
    expect(screen.getByText('Eléctrico')).toBeTruthy();
  });

  it('busca sin importar tildes ni mayúsculas y avisa si nada coincide', async () => {
    render(SelectBuscable, { opciones: actividades, ariaLabel: 'Actividad' });
    await fireEvent.click(screen.getByRole('button', { name: 'Actividad' }));
    const buscar = screen.getByRole('combobox', { name: 'Buscar actividad' });

    await fireEvent.input(buscar, { target: { value: 'PINTÚRA' } });
    expect(textos()).toEqual(['Pintura muros']);

    await fireEvent.input(buscar, { target: { value: 'xyz' } });
    expect(textos()).toEqual([]);
    expect(screen.getByText('Nada coincide con «xyz»')).toBeTruthy();
  });

  it('con el teclado: flechas y Enter eligen; Escape cierra solo la lista', async () => {
    const { component } = render(SelectBuscable, { opciones: actividades, ariaLabel: 'Actividad' });
    const cambio = vi.fn();
    component.$on('change', (e) => cambio(e.detail));
    const fueraDeLaLista = vi.fn();
    window.addEventListener('keydown', fueraDeLaLista);

    await fireEvent.click(screen.getByRole('button', { name: 'Actividad' }));
    const buscar = screen.getByRole('combobox');
    await fireEvent.keyDown(buscar, { key: 'ArrowDown' });
    await fireEvent.keyDown(buscar, { key: 'ArrowDown' });
    await fireEvent.keyDown(buscar, { key: 'Enter' });
    expect(cambio).toHaveBeenCalledWith(1);
    expect(screen.getByRole('button', { name: 'Actividad' }).textContent).toContain('Pintura muros');

    await fireEvent.click(screen.getByRole('button', { name: 'Actividad' }));
    await fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    // El panel de filtros (que escucha Escape en window) no se entera.
    expect(fueraDeLaLista.mock.calls.some(([e]) => e.key === 'Escape')).toBe(false);
    window.removeEventListener('keydown', fueraDeLaLista);
  });

  it('las estaciones inactivas van al final en su propio grupo; "Todas" vuelve a vacío', async () => {
    const opciones = opcionesEstaciones([
      { id: 5, nombre: 'Surba', activa: false },
      { id: 4, nombre: 'Cuche', activa: true },
    ]);
    const { component } = render(SelectBuscable, { opciones, value: 5, ariaLabel: 'Estación' });
    const cambio = vi.fn();
    component.$on('change', (e) => cambio(e.detail));

    await fireEvent.click(screen.getByRole('button', { name: 'Estación' }));
    expect(textos()).toEqual(['Todas', 'Cuche', 'Surba']);
    expect(screen.getByText('Inactivas')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Surba' }).getAttribute('aria-selected')).toBe('true');

    await fireEvent.click(screen.getByRole('option', { name: 'Todas' }));
    expect(cambio).toHaveBeenCalledWith('');
  });
});
