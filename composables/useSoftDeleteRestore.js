import { writable, get } from 'svelte/store';
import { addNotification } from '../stores/ui.js';

/**
 * Flujo de "activo eliminado detectado al crear uno nuevo" (409 del backend
 * cuando la placa ya existe soft-deleted) → modal para restaurarlo en vez de
 * quedar bloqueado. Antes duplicado letra por letra entre
 * VehicleManagement.svelte y MotoManagement.svelte.
 *
 * El reseteo de campos del formulario tras restaurar SÍ difiere por entidad
 * (Vehículo tiene campos de documentos que Moto no tiene igual), así que se
 * recibe como callback (`onRestored`) en `confirm()` en vez de vivir aquí.
 */
export function createSoftDeleteRestore({ restore, refetch, entityLabel }) {
  const store = writable({ pending: null, show: false, restoring: false });

  /** Se llama desde el catch del create() cuando el backend responde 409. */
  function trigger(conflictEntity) {
    store.set({ pending: conflictEntity, show: true, restoring: false });
  }

  function cancel() {
    store.set({ pending: null, show: false, restoring: false });
  }

  async function confirm(onRestored) {
    const current = get(store);
    if (!current.pending?.id) return;
    store.update((s) => ({ ...s, restoring: true }));
    try {
      await restore(current.pending.id);
      store.set({ pending: null, show: false, restoring: false });
      if (onRestored) onRestored();
      refetch();
      addNotification({ id: Date.now(), text: `${entityLabel} restaurado exitosamente.` });
    } catch (e) {
      store.update((s) => ({ ...s, restoring: false }));
      throw e; // la vista decide cómo mostrar su propio errorMessage
    }
  }

  return { subscribe: store.subscribe, trigger, cancel, confirm };
}
