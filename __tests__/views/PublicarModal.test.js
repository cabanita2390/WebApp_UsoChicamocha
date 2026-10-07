import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';

vi.mock('../../stores/substationAdmin.js', () => ({
  substationAdmin: {
    resumenBorrador: vi.fn(),
    publicar: vi.fn(),
  },
}));

import PublicarModal from '../../components/views/subestaciones/cronograma/PublicarModal.svelte';
import { substationAdmin } from '../../stores/substationAdmin.js';

describe('PublicarModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    substationAdmin.resumenBorrador.mockResolvedValue({
      altas: 1, bajas: 0, estacionesAfectadas: 1,
      porEstacion: [{ estacionId: 1, estacionNombre: 'Cuche', cambios: [{ citaId: 9, mes: 11, actividadNombre: 'Muros', tipo: 'ALTA' }] }],
    });
    substationAdmin.publicar.mockReturnValue(new Promise(() => {})); // queda en curso
  });

  it('un doble o triple clic en "Publicar a móvil" publica una sola vez', async () => {
    render(PublicarModal, { props: { anio: 2026, anioActual: 2026 } });
    const boton = await screen.findByRole('button', { name: 'Publicar a móvil' });
    await vi.waitFor(() => expect(boton.disabled).toBe(false));

    boton.click();
    boton.click();
    boton.click();

    expect(substationAdmin.publicar).toHaveBeenCalledTimes(1);
  });
});
