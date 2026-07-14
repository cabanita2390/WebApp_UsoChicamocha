import { writable, get, derived } from 'svelte/store';
import { sortAlertsBySeverity } from '../utils/alertSeverity.js';

// --- Stores de Notificaciones (en memoria, no persistir) ---
export const notificationCount = writable(0);
export const notificationMessages = writable([]);

// --- Stores de Alertas Preventivas (en memoria, no persistir) ---
export const preventiveAlertCount = writable(0);
export const preventiveAlerts = writable([]);

// --- Store derivado: Alertas ordenadas por severidad ---
export const sortedPreventiveAlerts = derived(preventiveAlerts, ($alerts) => {
  return sortAlertsBySeverity($alerts);
});

// --- Contador visible en el dropdown (después de deduplicación) ---
export const visibleAlertCount = writable(0);

// --- Modal global de "documento no disponible" (ver openDocumentSafely en stores/api.js) ---
export const documentErrorVisible = writable(false);

// --- Acciones de Notificaciones ---
export function addNotification(notification) {
  const currentMessages = get(notificationMessages);
  const exists = currentMessages.some(msg => msg.id === notification.id);

  if (exists) {
    console.log(`Notificación duplicada ignorada: ${notification.id}`);
    return;
  }

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
  const currentAlerts = get(preventiveAlerts);

  // El backend avisa así cuando una alerta se resolvió (ej. se subió el documento
  // renovado, se registró el cambio de aceite, o se actualizó el kilometraje): hay
  // que quitarla del store ya mismo, no solo ignorar el mensaje.
  if (alert.estado === 'RESUELTA') {
    const withoutResolved = currentAlerts.filter(
      a => !(a.placa === alert.placa && a.tipoAlerta === alert.tipoAlerta)
    );
    if (withoutResolved.length !== currentAlerts.length) {
      preventiveAlerts.set(withoutResolved);
      preventiveAlertCount.update(n => Math.max(0, n - 1));
    }
    return;
  }

  // Si ya existe una alerta activa para la misma placa+tipo, actualizarla en su lugar
  // (pudo cambiar de color/valor, ej. de AMARILLO a ROJO) en vez de ignorar el mensaje.
  const existingIndex = currentAlerts.findIndex(
    a => a.placa === alert.placa && a.tipoAlerta === alert.tipoAlerta && a.estado === 'ACTIVA'
  );

  if (existingIndex !== -1) {
    preventiveAlerts.update(alerts => {
      const updated = [...alerts];
      updated[existingIndex] = alert;
      return updated;
    });
    return;
  }

  preventiveAlerts.update(alerts => [alert, ...alerts]);
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
