import { writable, get } from 'svelte/store';

// Helper para crear un store que persiste en sessionStorage
function createPersistedStore(key, startValue) {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
    return writable(startValue);
  }
  const storedValue = sessionStorage.getItem(key);
  const initialValue = storedValue ? JSON.parse(storedValue) : startValue;
  const store = writable(initialValue);
  store.subscribe(value => {
    sessionStorage.setItem(key, JSON.stringify(value));
  });
  return store;
}

// --- Stores de Notificaciones ---
export const notificationCount = createPersistedStore('notificationCount', 0);
export const notificationMessages = createPersistedStore('notificationMessages', []);

// --- Acciones de Notificaciones ---
// CORRECCIÓN: Se usa `get` para una comprobación de duplicados más robusta y sincrónica.

export function addNotification(notification) {
  // Se obtiene el valor actual de la lista de mensajes de forma sincrónica.
  const currentMessages = get(notificationMessages);
  const exists = currentMessages.some(msg => msg.id === notification.id);
  // Si la notificación ya existe en la lista, no se hace nada.
  if (exists) {
    console.log(`Notificación duplicada ignorada: ${notification.id}`);
    return;
  }
  // Si no es un duplicado, se actualizan los stores.
  notificationMessages.update(messages => [notification, ...messages]);
  notificationCount.update(n => n + 1);
}

export function removeNotification(notificationId) {
  notificationMessages.update(messages => messages.filter(msg => msg.id !== notificationId));
  notificationCount.update(n => (n > 0 ? n - 1 : 0));
}

export function clearNotifications() {
  notificationMessages.set([]);
  notificationCount.set(0);
}

// --- Store Principal de UI ---
function createUIStore() {
  const { subscribe, update } = writable({
    // Se lee la vista guardada en localStorage o se usa 'dashboard' por defecto.
    currentView: (typeof localStorage !== 'undefined' && localStorage.getItem('currentView')) || 'dashboard',
    showWorkOrderModal: false,
    selectedRowData: null,
    selectedColumnDef: null,
    isSaving: false,
    // Image Modal State
    showImageModal: false,
    imageModalUrls: [],
    isImageModalLoading: false
  });

  return {
    subscribe,

    setCurrentView: (view) => {
      update(store => ({ ...store, currentView: view }));
      // Se guarda la vista actual en localStorage.
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('currentView', view);
      }
    },

    openWorkOrderModal: (data, columnDef) => update(store => ({
      ...store,
      showWorkOrderModal: true,
      selectedRowData: data,
      selectedColumnDef: columnDef
    })),

    closeWorkOrderModal: () => update(store => ({
      ...store,
      showWorkOrderModal: false,
      selectedRowData: null,
      selectedColumnDef: null
    })),

    setSaving: (isSaving) => update(store => ({ ...store, isSaving })),

    // Image Modal Actions
    openImageModal: () => update(store => ({ ...store, showImageModal: true, imageModalUrls: [], isImageModalLoading: false })),
    closeImageModal: () => update(store => ({ ...store, showImageModal: false, imageModalUrls: [] })),
    setImageModalLoading: (isLoading) => update(store => ({ ...store, isImageModalLoading: isLoading })),
    setImageModalUrls: (urls) => update(store => ({ ...store, imageModalUrls: urls }))
  };
}

export const ui = createUIStore();
