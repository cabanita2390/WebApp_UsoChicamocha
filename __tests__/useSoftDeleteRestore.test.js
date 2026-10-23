import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';

vi.mock('../stores/ui.js', () => ({
  addNotification: vi.fn(),
}));

import { addNotification } from '../stores/ui.js';
import { createSoftDeleteRestore } from '../composables/useSoftDeleteRestore.js';

describe('useSoftDeleteRestore', () => {
  let restore, refetch;

  beforeEach(() => {
    vi.clearAllMocks();
    restore = vi.fn().mockResolvedValue({ id: 5 });
    refetch = vi.fn();
  });

  it('trigger() abre el modal con la entidad en conflicto', () => {
    const flow = createSoftDeleteRestore({ restore, refetch, entityLabel: 'Vehículo' });
    flow.trigger({ id: 5, placa: 'ABC123' });
    expect(get(flow)).toEqual({ pending: { id: 5, placa: 'ABC123' }, show: true, restoring: false });
  });

  it('cancel() resetea todo el estado', () => {
    const flow = createSoftDeleteRestore({ restore, refetch, entityLabel: 'Vehículo' });
    flow.trigger({ id: 5 });
    flow.cancel();
    expect(get(flow)).toEqual({ pending: null, show: false, restoring: false });
  });

  it('confirm() sin pending no hace nada', async () => {
    const flow = createSoftDeleteRestore({ restore, refetch, entityLabel: 'Vehículo' });
    await flow.confirm();
    expect(restore).not.toHaveBeenCalled();
  });

  it('confirm() restaura, llama onRestored, refetch y notifica, y cierra el modal', async () => {
    const flow = createSoftDeleteRestore({ restore, refetch, entityLabel: 'Vehículo' });
    flow.trigger({ id: 5, placa: 'ABC123' });
    const onRestored = vi.fn();

    await flow.confirm(onRestored);

    expect(restore).toHaveBeenCalledWith(5);
    expect(onRestored).toHaveBeenCalled();
    expect(refetch).toHaveBeenCalled();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ text: 'Vehículo restaurado exitosamente.' }));
    expect(get(flow)).toEqual({ pending: null, show: false, restoring: false });
  });

  it('confirm() cuando restore() falla deja el modal abierto y relanza el error (la vista decide el mensaje)', async () => {
    restore.mockRejectedValue(new Error('Conflicto de placa'));
    const flow = createSoftDeleteRestore({ restore, refetch, entityLabel: 'Moto' });
    flow.trigger({ id: 9 });

    await expect(flow.confirm()).rejects.toThrow('Conflicto de placa');

    const state = get(flow);
    expect(state.pending).toEqual({ id: 9 });
    expect(state.show).toBe(true);
    expect(state.restoring).toBe(false);
    expect(refetch).not.toHaveBeenCalled();
    expect(addNotification).not.toHaveBeenCalled();
  });
});
