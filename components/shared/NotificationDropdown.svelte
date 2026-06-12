<script>
  import { createEventDispatcher } from 'svelte';
  import { fetchAllAlerts, resolveAlert, deleteAlert, alertsLoading, alertsError } from '../../composables/useAlerts.js';

  export let messages = [];
  export let alerts = [];
  export let isOpen = false;

  const dispatch = createEventDispatcher();
  let serverAlerts = [];
  let hasLoadedFromServer = false;
  let isResolving = {};

  // Cargar alertas del servidor cuando se abre el dropdown
  $: if (isOpen && !hasLoadedFromServer) {
    loadServerAlerts();
  }

  async function loadServerAlerts() {
    hasLoadedFromServer = true;
    try {
      const response = await fetchAllAlerts(0, 50, { estado: 'ACTIVA' });
      serverAlerts = response.content || [];
      console.log('✅ Alertas cargadas del servidor:', serverAlerts);
    } catch (error) {
      console.error('❌ Error cargando alertas del servidor:', error);
    }
  }

  // Combinar alertas en tiempo real + alertas del servidor
  $: allAlerts = [
    ...alerts,
    ...serverAlerts
  ];

  function deleteNotification(notificationId) {
    dispatch('deleteNotification', notificationId);
  }

  async function resolveAlertFromServer(alertId) {
    isResolving[alertId] = true;
    try {
      await resolveAlert(alertId);
      // Eliminar de la lista local
      serverAlerts = serverAlerts.filter(a => a.id !== alertId);
      dispatch('deleteAlert', alertId);
      console.log('✅ Alerta resuelta:', alertId);
    } catch (error) {
      console.error('❌ Error resolviendo alerta:', error);
    } finally {
      isResolving[alertId] = false;
    }
  }

  async function deleteAlertFromServer(alertId) {
    isResolving[alertId] = true;
    try {
      await deleteAlert(alertId);
      // Eliminar de la lista local
      serverAlerts = serverAlerts.filter(a => a.id !== alertId);
      dispatch('deleteAlert', alertId);
      console.log('✅ Alerta eliminada:', alertId);
    } catch (error) {
      console.error('❌ Error eliminando alerta:', error);
    } finally {
      isResolving[alertId] = false;
    }
  }

  function deleteNotificationLocal(notificationId) {
    dispatch('deleteNotification', notificationId);
  }

  function deleteAlertLocal(alertId) {
    dispatch('deleteAlert', alertId);
  }

  function getAlertColor(colorEstado) {
    switch(colorEstado) {
      case 'ROJO':
        return '#ff4444';
      case 'AMARILLO':
        return '#ffaa00';
      case 'VERDE':
        return '#44cc44';
      default:
        return '#666666';
    }
  }

  function getAlertBgColor(colorEstado) {
    switch(colorEstado) {
      case 'ROJO':
        return '#ffe8e8';
      case 'AMARILLO':
        return '#fff5e8';
      case 'VERDE':
        return '#e8ffe8';
      default:
        return '#f0f0f0';
    }
  }

  function formatAlertDescription(alert) {
    return `[${alert.tipoAlerta}] ${alert.placa} - ${alert.descripcion}`;
  }
</script>

<div class="dropdown-container">
  {#if allAlerts.length === 0 && messages.length === 0}
    <div class="dropdown-item empty">No hay notificaciones ni alertas</div>
  {:else}
    <!-- Sección de Alertas Preventivas -->
    {#if allAlerts.length > 0}
      <div class="dropdown-section-header">🔔 ALERTAS PREVENTIVAS ({allAlerts.length})</div>
      {#each allAlerts as alert, index (`alert_${index}`)}}
        <div
          class="dropdown-item alert-item"
          style="background-color: {getAlertBgColor(alert.colorEstado)}; border-left: 4px solid {getAlertColor(alert.colorEstado)}; opacity: {isResolving[alert.id] ? 0.5 : 1};"
        >
          <div class="alert-content">
            <div class="alert-title" style="color: {getAlertColor(alert.colorEstado)}; font-weight: bold;">
              {alert.tipoAlerta}
            </div>
            <div class="alert-text">{alert.placa} - {alert.descripcion}</div>
            {#if alert.fechaVencimiento}
              <div class="alert-date">Vence: {new Date(alert.fechaVencimiento).toLocaleDateString('es-CO')}</div>
            {/if}
          </div>
          <div class="alert-actions">
            <button
              class="resolve-btn"
              on:click|stopPropagation={() => resolveAlertFromServer(alert.id)}
              title="Marcar como resuelta"
              disabled={isResolving[alert.id]}
            >
              ✓
            </button>
            <button
              class="delete-btn"
              on:click|stopPropagation={() => deleteAlertFromServer(alert.id)}
              title="Eliminar alerta"
              disabled={isResolving[alert.id]}
            >
              &times;
            </button>
          </div>
        </div>
      {/each}
      {#if messages.length > 0}
        <div class="dropdown-divider"></div>
      {/if}
    {/if}

    <!-- Sección de Notificaciones Regulares -->
    {#if messages.length > 0}
      <div class="dropdown-section-header">📧 NOTIFICACIONES</div>
      {#each messages as notification, index (`notif_${index}`)}
        <div class="dropdown-item">
          <span>{notification.text}</span>
          <button
            class="delete-btn"
            on:click|stopPropagation={() => deleteNotificationLocal(notification.id)}
            title="Borrar notificación"
          >
            &times;
          </button>
        </div>
      {/each}
    {/if}
  {/if}
</div>

<style>
  .dropdown-container {
    position: absolute;
    top: 50px;
    right: 10px;
    width: 400px;
    max-height: 500px;
    overflow-y: auto;
    background-color: #f0f0f0;
    border: 1px solid #808080;
    border-top: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 200;
    font-family: 'MS Sans Serif', 'Tahoma', sans-serif;
    font-size: 11px;
    color: #000;
  }

  .dropdown-section-header {
    padding: 8px 12px;
    background-color: #e0e0e0;
    font-weight: bold;
    font-size: 10px;
    color: #333;
    border-bottom: 1px solid #c0c0c0;
    text-transform: uppercase;
  }

  .dropdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #c0c0c0;
    transition: background-color 0.2s;
  }

  .dropdown-item.alert-item {
    padding: 10px 12px;
    align-items: flex-start;
  }

  .alert-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .alert-title {
    font-size: 10px;
    text-transform: uppercase;
  }

  .alert-text {
    font-size: 11px;
    word-wrap: break-word;
  }

  .alert-date {
    font-size: 9px;
    color: #666;
    font-style: italic;
  }

  .dropdown-divider {
    height: 1px;
    background-color: #808080;
    margin: 0;
  }

  .dropdown-item.empty {
    justify-content: center;
    color: #555;
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .alert-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 8px;
  }

  .resolve-btn,
  .delete-btn {
    background: none;
    border: 1px solid transparent;
    color: #808080;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    padding: 0 4px;
    line-height: 1;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .resolve-btn:hover:not(:disabled) {
    color: #44cc44;
    border-color: #44cc44;
  }

  .delete-btn:hover:not(:disabled) {
    color: #ff4444;
    border-color: #ff4444;
  }

  .resolve-btn:disabled,
  .delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
