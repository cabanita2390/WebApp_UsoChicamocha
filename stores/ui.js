import { writable, get } from 'svelte/store';

// --- Stores de Notificaciones (en memoria, no persistir) ---
export const notificationCount = writable(0);
export const notificationMessages = writable([]);

// --- Stores de Alertas Preventivas (en memoria, no persistir) ---
export const preventiveAlertCount = writable(0);
export const preventiveAlerts = writable([]);

// --- Contador visible en el dropdown (después de deduplicación) ---
export const visibleAlertCount = writable(0);

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

// --- Acciones de Alertas Preventivas ---
export function addPreventiveAlert(alert) {
  console.log('📌 [STORE] Intentando agregar alerta al store:', alert);
  const currentAlerts = get(preventiveAlerts);
  console.log('📌 [STORE] Alertas actuales:', currentAlerts);

  // Evitar duplicados basados en placa + tipo de alerta
  const exists = currentAlerts.some(a => a.placa === alert.placa && a.tipoAlerta === alert.tipoAlerta && a.estado === 'ACTIVA');
  if (exists) {
    console.log(`⚠️ [STORE] Alerta preventiva duplicada ignorada: ${alert.placa} - ${alert.tipoAlerta}`);
    return;
  }

  preventiveAlerts.update(alerts => {
    const newAlerts = [alert, ...alerts];
    console.log('✅ [STORE] Alerta agregada. Total:', newAlerts.length);
    return newAlerts;
  });
  preventiveAlertCount.update(n => n + 1);
}

export function removePreventiveAlert(alertId) {
  preventiveAlerts.update(alerts => alerts.filter(a => a.id !== alertId));
  preventiveAlertCount.update(n => (n > 0 ? n - 1 : 0));
}

export function clearPreventiveAlerts() {
  preventiveAlerts.set([]);
  preventiveAlertCount.set(0);
}

// --- Store Principal de UI ---
function createUIStore() {
  const { subscribe, update } = writable({
    // Se lee la vista guardada en localStorage o se usa 'dashboard' por defecto.
    currentView: (typeof localStorage !== 'undefined' && localStorage.getItem('currentView')) || 'dashboard',
    showWorkOrderModal: false,
    selectedRowData: null,
    selectedColumnDef: null,
    showVehicleWorkOrderModal: false,
    selectedVehicleRowData: null,
    selectedVehicleColumnDef: null,
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

    openVehicleWorkOrderModal: (data, columnDef) => update(store => ({
      ...store,
      showVehicleWorkOrderModal: true,
      selectedVehicleRowData: data,
      selectedVehicleColumnDef: columnDef,
    })),

    closeVehicleWorkOrderModal: () => update(store => ({
      ...store,
      showVehicleWorkOrderModal: false,
      selectedVehicleRowData: null,
      selectedVehicleColumnDef: null,
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
