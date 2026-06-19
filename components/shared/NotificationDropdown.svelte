<script>
  import { createEventDispatcher } from 'svelte';
  import { fetchAllAlerts, deleteAlert, alertsLoading, alertsError } from '../../composables/useAlerts.js';
  import { visibleAlertCount } from '../../stores/ui.js';

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

  // Combinar alertas en tiempo real + alertas del servidor (evitar duplicados)
  $: allAlerts = (() => {
    const seen = new Set();
    const combined = [...alerts, ...serverAlerts];
    return combined.filter(alert => {
      const key = `${alert.placa}_${alert.tipoAlerta}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  })();

  // Filtrar notificaciones simples para excluir alertas de documentos
  $: filteredMessages = messages.filter(msg => {
    const text = msg.text?.toLowerCase() || '';
    const docKeywords = ['soat', 'runt', 'seguro', 'technomecánica', 'tecnomecánica', 'licencia'];
    return !docKeywords.some(keyword => text.includes(keyword));
  });

  // Actualizar contador visible en el badge
  $: visibleAlertCount.set(allAlerts.length + filteredMessages.length);

  function deleteNotification(notificationId) {
    dispatch('deleteNotification', notificationId);
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

  function getVehicleTypeEmoji(tipoMaquinaria) {
    switch(tipoMaquinaria) {
      case 'VEHICULO': return '🚗';
      case 'MOTOCICLETA': return '🏍️';
      case 'MAQUINARIA': return '⚙️';
      default: return '📦';
    }
  }

  function getVehicleTypeName(tipoMaquinaria, alert) {
    // Si tipoMaquinaria está lleno, usarlo directamente
    if (tipoMaquinaria && tipoMaquinaria !== 'DOCUMENTO') {
      switch(tipoMaquinaria) {
        case 'VEHICULO': return 'Vehículo';
        case 'MOTOCICLETA': return 'Motocicleta';
        case 'MAQUINARIA': return 'Máquina';
        default: return tipoMaquinaria;
      }
    }

    // Si no está lleno, intentar deducirlo de la descripción
    if (alert && alert.descripcion) {
      const desc = alert.descripcion.toLowerCase();
      if (desc.includes('máquina') || desc.includes('maquina')) return 'Máquina';
      if (desc.includes('motocicleta') || desc.includes('moto')) return 'Motocicleta';
      if (desc.includes('vehículo') || desc.includes('vehiculo')) return 'Vehículo';
    }

    // Última opción: buscar en las alertas de cambio de aceite para ver si la placa aparece ahí
    if (alert && alert.placa && allAlerts) {
      const oilChangeAlerts = allAlerts.filter(a => a.tipoAlerta === 'CAMBIO_ACEITE');
      for (const oilAlert of oilChangeAlerts) {
        if (oilAlert.descripcion && oilAlert.descripcion.includes(alert.placa)) {
          if (oilAlert.descripcion.includes('Máquina') || oilAlert.descripcion.includes('máquina')) return 'Máquina';
          if (oilAlert.descripcion.includes('Motocicleta') || oilAlert.descripcion.includes('motocicleta')) return 'Motocicleta';
          if (oilAlert.descripcion.includes('Vehículo') || oilAlert.descripcion.includes('vehículo')) return 'Vehículo';
        }
      }
    }

    return 'Activo';
  }

  function getAlertSubtitle(alert) {
    // Para alertas de documentos, mostrar de cuál activo es
    if (alert.tipoAlerta.includes('DOCUMENTO')) {
      return `${alert.placa}`;
    }
    return null;
  }

  function getDocumentEmoji(tipoAlerta) {
    if (tipoAlerta.includes('SOAT')) return '🛡️';
    if (tipoAlerta.includes('RUNT')) return '📋';
    if (tipoAlerta.includes('TECHNOMECÁNICA') || tipoAlerta.includes('TECNOMECÁNICA')) return '🔧';
    return '📄';
  }

  function formatDocumentDescription(alert) {
    const emoji = getDocumentEmoji(alert.tipoAlerta);
    const docType = alert.tipoAlerta.replace('DOCUMENTO_', '');
    return `${emoji} ${docType} próximo a vencer`;
  }

  function formatDocumentDate(alert) {
    if (!alert.fechaVencimiento) return '';

    const fecha = new Date(alert.fechaVencimiento);

    // Para extintores, mostrar solo mes/año
    if (alert.tipoAlerta.includes('EXTINTOR')) {
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const año = fecha.getFullYear();
      return `${mes}/${año}`;
    }

    // Para otros documentos, mostrar fecha completa
    return fecha.toLocaleDateString('es-CO');
  }
</script>

<div class="dropdown-container">
  {#if allAlerts.length === 0 && filteredMessages.length === 0}
    <div class="dropdown-item empty">No hay notificaciones ni alertas</div>
  {:else}
    <!-- Sección de Alertas Preventivas -->
    {#if allAlerts.length > 0}
      <div class="dropdown-section-header">🔔 ALERTAS PREVENTIVAS ({allAlerts.length})</div>
      {#each allAlerts as alert, index (`alert_${index}`)}
        <div
          class="dropdown-item alert-item"
          style="background-color: {getAlertBgColor(alert.colorEstado)}; border-left: 4px solid {getAlertColor(alert.colorEstado)}; opacity: {isResolving[alert.id] ? 0.5 : 1};"
        >
          <div class="alert-content">
            {#if alert.tipoAlerta.includes('DOCUMENTO')}
              <div class="alert-title" style="color: #1a1a1a; font-weight: bold;">
                {alert.tipoAlerta}
              </div>
              <div class="alert-subtitle">📍 {alert.placa} ({getVehicleTypeName(alert.tipoMaquinaria, alert)})</div>
              <div class="alert-text">{formatDocumentDescription(alert)}</div>
              {#if alert.fechaVencimiento}
                <div class="alert-date">Vence: {formatDocumentDate(alert)}</div>
              {/if}
            {:else}
              <div class="alert-title" style="color: #000; font-weight: 900;">
                {alert.tipoAlerta}
              </div>
              <div class="alert-text">{alert.descripcion}</div>
              {#if alert.fechaVencimiento}
                <div class="alert-date">Vence: {formatDocumentDate(alert)}</div>
              {/if}
            {/if}
          </div>
          <div class="alert-actions">
            <button
              class="delete-btn"
              on:click|stopPropagation={() => deleteAlertFromServer(alert.id)}
              title="Eliminar alerta"
              disabled={isResolving[alert.id]}
            >
              ✕
            </button>
          </div>
        </div>
      {/each}
      {#if filteredMessages.length > 0}
        <div class="dropdown-divider"></div>
      {/if}
    {/if}

    <!-- Sección de Notificaciones Regulares -->
    {#if filteredMessages.length > 0}
      <div class="dropdown-section-header">📧 NOTIFICACIONES</div>
      {#each filteredMessages as notification, index (`notif_${index}`)}
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
    width: 450px;
    max-height: 580px;
    overflow-y: auto;
    background: linear-gradient(to bottom, #fff 0%, #f9f9f9 100%);
    border: 1px solid #d0d0d0;
    border-top: none;
    border-radius: 0 0 3px 3px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    z-index: 200;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    color: #222;
  }

  .dropdown-section-header {
    padding: 9px 13px;
    background: linear-gradient(to right, #f0f0f0, #e8e8e8);
    font-weight: bold;
    font-size: 11px;
    color: #333;
    border-bottom: 1px solid #d0d0d0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dropdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 13px;
    border-bottom: 1px solid #f0f0f0;
    transition: background-color 0.15s;
  }

  .dropdown-item:hover {
    background-color: #f9f9f9;
  }

  .dropdown-item.alert-item {
    padding: 11px 13px;
    align-items: flex-start;
    gap: 9px;
  }

  .dropdown-item.alert-item:hover {
    background-color: #f9f9f9;
  }

  .alert-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .alert-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    color: #000;
    letter-spacing: 0.2px;
  }

  .alert-subtitle {
    font-size: 12px;
    color: #333;
    font-weight: 700;
    margin-top: 3px;
    margin-bottom: 2px;
  }

  .alert-text {
    font-size: 12px;
    word-wrap: break-word;
    color: #444;
    line-height: 1.35;
  }

  .alert-date {
    font-size: 11px;
    color: #d84444;
    font-weight: 600;
  }

  .dropdown-divider {
    height: 1px;
    background-color: #e0e0e0;
    margin: 2px 0;
  }

  .dropdown-item.empty {
    justify-content: center;
    color: #999;
    padding: 13px 13px;
    font-size: 11px;
  }

  .dropdown-item:last-child {
    border-bottom: none;
  }

  .alert-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .delete-btn {
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    border: 1px solid #d0d0d0;
    color: #666;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    padding: 4px 8px;
    line-height: 1;
    flex-shrink: 0;
    transition: all 0.2s;
    border-radius: 2px;
  }

  .delete-btn:hover:not(:disabled) {
    color: #fff;
    background: linear-gradient(135deg, #ff5555 0%, #ff3333 100%);
    border-color: #ff3333;
    box-shadow: 0 2px 5px rgba(255, 51, 51, 0.25);
  }

  .delete-btn:active:not(:disabled) {
    opacity: 0.9;
  }

  .delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
