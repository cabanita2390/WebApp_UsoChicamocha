import { writable } from 'svelte/store';
import fetchWithAuth from '../stores/api.js';

/**
 * Composable para manejar alertas preventivas
 * Carga alertas del servidor y las sincroniza en tiempo real
 */

// Store para estado de carga
export const alertsLoading = writable(false);
export const alertsError = writable(null);

/**
 * Dispara recálculo de alertas en el servidor (llamar al abrir la página).
 * No bloquea: si falla, simplemente se usan las alertas actuales de BD.
 */
export async function refreshAlertsOnServer() {
  try {
    await fetchWithAuth('alerts/refresh', { method: 'POST' });
    console.log('🔄 Alertas recalculadas en el servidor');
  } catch (error) {
    console.warn('⚠️ No se pudo refrescar alertas en servidor:', error.message);
  }
}

/**
 * Obtener todas las alertas del servidor
 */
export async function fetchAllAlerts(page = 0, size = 20, filters = {}) {
  alertsLoading.set(true);
  alertsError.set(null);

  try {
    const params = new URLSearchParams({
      page,
      size,
      ...(filters.tipo && { tipo: filters.tipo }),
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.placa && { placa: filters.placa })
    });

    const data = await fetchWithAuth(`alerts?${params}`, { method: 'GET' });
    alertsLoading.set(false);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo alertas:', error);
    alertsError.set(error.message);
    alertsLoading.set(false);
    throw error;
  }
}

/**
 * Obtener alertas de una placa específica
 */
export async function fetchAlertsByPlaca(placa) {
  alertsLoading.set(true);
  alertsError.set(null);

  try {
    const data = await fetchWithAuth(`alerts/placa/${placa}`, { method: 'GET' });
    alertsLoading.set(false);
    return data;
  } catch (error) {
    console.error(`❌ Error obteniendo alertas para placa ${placa}:`, error);
    alertsError.set(error.message);
    alertsLoading.set(false);
    throw error;
  }
}

/**
 * Obtener resumen/estadísticas de alertas
 */
export async function fetchAlertsSummary() {
  alertsLoading.set(true);
  alertsError.set(null);

  try {
    const data = await fetchWithAuth('alerts/stats/summary', { method: 'GET' });
    alertsLoading.set(false);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo resumen de alertas:', error);
    alertsError.set(error.message);
    alertsLoading.set(false);
    throw error;
  }
}

/**
 * Obtener alertas críticas (ROJO)
 */
export async function fetchCriticalAlerts() {
  alertsLoading.set(true);
  alertsError.set(null);

  try {
    const data = await fetchWithAuth('alerts/criticas', { method: 'GET' });
    alertsLoading.set(false);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo alertas críticas:', error);
    alertsError.set(error.message);
    alertsLoading.set(false);
    throw error;
  }
}

/**
 * Obtener alertas de advertencia (AMARILLO)
 */
export async function fetchWarningAlerts() {
  alertsLoading.set(true);
  alertsError.set(null);

  try {
    const data = await fetchWithAuth('alerts/warnings', { method: 'GET' });
    alertsLoading.set(false);
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo alertas de advertencia:', error);
    alertsError.set(error.message);
    alertsLoading.set(false);
    throw error;
  }
}

/**
 * Resolver/cerrar una alerta
 */
export async function resolveAlert(alertId) {
  alertsLoading.set(true);
  alertsError.set(null);

  try {
    const data = await fetchWithAuth(`alerts/${alertId}/resolve`, { method: 'PATCH' });
    alertsLoading.set(false);
    return data;
  } catch (error) {
    console.error(`❌ Error resolviendo alerta ${alertId}:`, error);
    alertsError.set(error.message);
    alertsLoading.set(false);
    throw error;
  }
}

/**
 * Eliminar una alerta
 */
export async function deleteAlert(alertId) {
  alertsLoading.set(true);
  alertsError.set(null);

  try {
    await fetchWithAuth(`alerts/${alertId}`, { method: 'DELETE' });
    alertsLoading.set(false);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error eliminando alerta ${alertId}:`, error);
    alertsError.set(error.message);
    alertsLoading.set(false);
    throw error;
  }
}

/**
 * Obtener una alerta por ID
 */
export async function fetchAlertById(alertId) {
  alertsLoading.set(true);
  alertsError.set(null);

  try {
    const data = await fetchWithAuth(`alerts/${alertId}`, { method: 'GET' });
    alertsLoading.set(false);
    return data;
  } catch (error) {
    console.error(`❌ Error obteniendo alerta ${alertId}:`, error);
    alertsError.set(error.message);
    alertsLoading.set(false);
    throw error;
  }
}
