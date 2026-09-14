import { writable, get } from 'svelte/store';
import { addNotification } from '../stores/ui.js';

/**
 * Catálogo rápido sin salir de la vista (crear marca/tipo/ubicación al vuelo
 * desde el formulario de alta/edición de un activo). Antes duplicado letra
 * por letra entre VehicleManagement.svelte y MotoManagement.svelte.
 *
 * `kinds`: { [kind]: {
 *   title, placeholder,
 *   create: async (name) => created,
 *   getId: (created) => id,
 *   targetField: string,           // campo a asignar en el objeto destino
 *   successMessage: string,
 *   afterCreate?: async () => void // ej. refrescar el catálogo de ubicaciones
 * } }
 */
export function createQuickCatalog(kinds) {
  const store = writable({ modal: null, name: '', error: '', submitting: false });

  function open(kind) {
    store.update((s) => ({ ...s, modal: kind, name: '', error: '' }));
  }

  function close() {
    store.set({ modal: null, name: '', error: '', submitting: false });
  }

  /**
   * `getTarget` resuelve, en el momento del submit, el objeto reactivo a
   * actualizar con el id recién creado (el registro en edición si hay uno
   * abierto, o el formulario de alta).
   */
  async function submit(getTarget) {
    const current = get(store);

    const name = current.name.trim();
    if (!name) {
      store.update((s) => ({ ...s, error: 'Escriba un nombre.' }));
      return;
    }

    const config = kinds[current.modal];
    store.update((s) => ({ ...s, submitting: true, error: '' }));
    try {
      const created = await config.create(name);
      if (config.afterCreate) await config.afterCreate();
      const id = config.getId(created);
      if (id != null) {
        const target = getTarget();
        if (target) target[config.targetField] = id;
      }
      addNotification({ id: Date.now(), text: config.successMessage });
      close();
    } catch (e) {
      store.update((s) => ({ ...s, error: e.message || 'No se pudo guardar.', submitting: false }));
    }
  }

  return {
    // subscribe/set/update expuestos para poder usar `$quickCatalog` y
    // `bind:value={$quickCatalog.name}` directamente en el template.
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    open,
    close,
    submit,
    titleFor: (kind) => kinds[kind]?.title ?? '',
    placeholderFor: (kind) => kinds[kind]?.placeholder ?? 'Ej: …',
  };
}
