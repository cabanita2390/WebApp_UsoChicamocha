import { writable } from 'svelte/store';

/**
 * Último aviso del backend (WebSocket /topic/subestaciones/ejecuciones): una ejecución se
 * registró o se editó. Lo publica useWebSocketNotifications; las vistas de subestaciones lo
 * escuchan con alCambiarEjecuciones para recargar sin que el usuario refresque.
 */
export const ejecucionCambio = writable(null);

/**
 * Llama a `recargar(evento)` cuando llega un aviso nuevo (no con el valor que ya había al
 * suscribirse). Agrupa ráfagas: si llegan varios seguidos (cola offline del móvil sincronizando)
 * recarga una sola vez. Devuelve la función para cancelar (usar en onDestroy).
 */
export function alCambiarEjecuciones(recargar, espera = 800) {
    let primero = true;
    let timer = null;
    const cancelar = ejecucionCambio.subscribe((evento) => {
        if (primero) {
            primero = false;
            return;
        }
        if (!evento) return;
        clearTimeout(timer);
        timer = setTimeout(() => recargar(evento), espera);
    });
    return () => {
        clearTimeout(timer);
        cancelar();
    };
}
