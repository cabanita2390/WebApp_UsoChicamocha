import { describe, it, expect, vi, afterEach } from 'vitest';
import { ejecucionCambio, alCambiarEjecuciones } from '../stores/subestacionesEventos.js';

describe('stores/subestacionesEventos', () => {
    afterEach(() => {
        vi.useRealTimers();
        ejecucionCambio.set(null);
    });

    it('no dispara con el valor que ya había y agrupa una ráfaga en una sola recarga', async () => {
        vi.useFakeTimers();
        ejecucionCambio.set({ estacionId: 9, recibido: 0 }); // viejo: no debe recargar
        const recargar = vi.fn();
        const cancelar = alCambiarEjecuciones(recargar, 800);

        ejecucionCambio.set({ estacionId: 1, recibido: 1 });
        ejecucionCambio.set({ estacionId: 2, recibido: 2 });
        await vi.advanceTimersByTimeAsync(800);

        expect(recargar).toHaveBeenCalledTimes(1);
        expect(recargar).toHaveBeenCalledWith({ estacionId: 2, recibido: 2 });
        cancelar();
    });

    it('al cancelar (vista destruida) ya no recarga', async () => {
        vi.useFakeTimers();
        const recargar = vi.fn();
        const cancelar = alCambiarEjecuciones(recargar, 800);
        ejecucionCambio.set({ estacionId: 1, recibido: 1 });
        cancelar();
        await vi.advanceTimersByTimeAsync(800);
        expect(recargar).not.toHaveBeenCalled();
    });
});
