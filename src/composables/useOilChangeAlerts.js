/**
 * Composable para escuchar alertas de cambio de aceite en tiempo real.
 * Se integra con la conexión WebSocket existente de useWebSocketNotifications.
 */

import { writable } from 'svelte/store';

// Store para guardar las alertas activas
export const oilChangeAlerts = writable({});

let subscription = null;
let globalStompClient = null;
let onAlertCallback = null;

/**
 * Obtener acceso al cliente STOMP global
 * Se comunica a través de una función que debe ser inicializada por App.svelte
 */
export function setGlobalStompClient(client) {
  globalStompClient = client;
  console.log('✅ Cliente STOMP global configurado para alertas de aceite');
}

/**
 * Suscribirse a alertas de cambio de aceite
 */
export function subscribeToOilChangeAlerts(onNewAlert) {
  if (!globalStompClient) {
    console.warn('⚠️ Cliente STOMP no está disponible');
    return null;
  }

  if (!globalStompClient.connected) {
    console.warn('⚠️ Cliente STOMP no está conectado');
    return null;
  }

  // Guardar el callback para usar cuando lleguen alertas
  onAlertCallback = onNewAlert;

  if (subscription) {
    console.log('ℹ️ Ya hay una suscripción activa a alertas de aceite (callback actualizado)');
    return subscription;
  }

  console.log('🔔 Suscribiendo a /topic/oil-change-alerts...');

  subscription = globalStompClient.subscribe('/topic/oil-change-alerts', (message) => {
    try {
      const alert = JSON.parse(message.body);

      // Guardar en store
      oilChangeAlerts.update(current => ({
        ...current,
        [alert.placa]: alert
      }));

      // Callback para componente
      if (onAlertCallback) {
        onAlertCallback(alert);
      }

      // Log para debugging
      console.log(`🔔 Alerta de aceite: ${alert.placa} | ${alert.alertColor} | ${alert.alertStatus}`);

    } catch (error) {
      console.error('Error procesando alerta de aceite:', error);
    }
  });

  return subscription;
}

/**
 * Desconectar del WebSocket
 */
export function disconnectOilChangeAlerts() {
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
    console.log('🔌 Desconectado de alertas de cambio de aceite');
  }
}

/**
 * Obtener alertas por color
 */
export function getAlertsByColor(color) {
  let alerts = {};
  oilChangeAlerts.subscribe(current => {
    alerts = current;
  })();

  return Object.values(alerts).filter(a => a.alertColor === color);
}

/**
 * Obtener clase Tailwind para una alerta (soporta EN y ES)
 */
export function getAlertTailwindClass(alertColor) {
  const classes = {
    'GREEN': 'bg-green-100 text-green-800 border-green-300',
    'VERDE': 'bg-green-100 text-green-800 border-green-300',
    'BLUE': 'bg-blue-100 text-blue-800 border-blue-300',
    'YELLOW': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'AMARILLO': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'RED': 'bg-red-100 text-red-800 border-red-300',
    'ROJO': 'bg-red-100 text-red-800 border-red-300'
  };
  return classes[alertColor] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Obtener badge de estado (soporta EN y ES)
 */
export function getAlertBadge(alertColor) {
  const badges = {
    'GREEN': '✅ OK',
    'VERDE': '✅ OK',
    'BLUE': '🔵 Programado',
    'YELLOW': '🟡 Próximo',
    'AMARILLO': '🟡 Próximo',
    'RED': '🔴 URGENTE',
    'ROJO': '🔴 URGENTE'
  };
  return badges[alertColor] || '⚪ Desconocido';
}
