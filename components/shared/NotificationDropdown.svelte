<script>
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { fetchAllAlerts, deleteAlert, alertsLoading, alertsError } from '../../composables/useAlerts.js';
  import { visibleAlertCount } from '../../stores/ui.js';
  import { sortAlertsBySeverity, getSeverityInfo } from '../../utils/alertSeverity.js';

  export let messages = [];
  export let alerts = [];
  export let isOpen = false;

  const dispatch = createEventDispatcher();
  let serverAlerts = [];
  let hasLoadedFromServer = false;
  let isResolving = {};

  // Cargar alertas al montar el componente
  onMount(() => {
    loadServerAlerts();
  });

  // Recargar alertas cuando se abre el dropdown
  $: if (isOpen && hasLoadedFromServer) {
    loadServerAlerts();
  }

  async function loadServerAlerts() {
    hasLoadedFromServer = true;
    try {
      const response = await fetchAllAlerts(0, 100);
      serverAlerts = response.content || [];
      console.log('✅ Alertas cargadas del servidor:', serverAlerts);
    } catch (error) {
      console.error('❌ Error cargando alertas del servidor:', error);
    }
  }

  // Combinar, deduplicar y ordenar alertas por severidad
  $: allAlerts = (() => {
    const seen = new Set();
    const combined = [...alerts, ...serverAlerts];

    const deduped = combined.filter(alert => {
      const key = `${alert.placa}_${alert.tipoAlerta}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return sortAlertsBySeverity(deduped);
  })();

  // Agrupar alertas por severidad
  $: alertsByGroup = (() => {
    const groups = {
      critical: [],
      warning: [],
      info: []
    };

    allAlerts.forEach(alert => {
      const severity = getSeverityInfo(alert.colorEstado);
      if (severity.level === 0) groups.critical.push(alert);
      else if (severity.level === 1) groups.warning.push(alert);
      else groups.info.push(alert);
    });

    return groups;
  })();

  // Filtrar notificaciones para evitar duplicados con alertas
  $: filteredMessages = messages.filter(msg => {
    const text = msg.text?.toLowerCase() || '';
    const isDuplicate = serverAlerts.some(alert => {
      const alertText = (alert.descripcion || '').toLowerCase();
      const alertPlaca = (alert.placa || '').toLowerCase();
      return text.includes(alertPlaca) || text.includes(alertText);
    });
    return !isDuplicate;
  });

  // Actualizar contador visible en el badge
  $: {
    const totalCount = allAlerts.length + filteredMessages.length;
    visibleAlertCount.set(totalCount);
    console.log('📊 Contador actualizado:', { alertas: allAlerts.length, notificaciones: filteredMessages.length, total: totalCount });
  }

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
        return '#ffe0e0';
      case 'AMARILLO':
        return '#fff5e8';
      case 'VERDE':
        return '#e8ffe8';
      default:
        return '#f0f0f0';
    }
  }

  function formatAlertDescription(alert) {
    return alert.descripcion || '';
  }

  function getAlertTitle(alert) {
    const title = alert.tipoAlerta.replace(/_/g, ' ');
    // Si es un documento, extraer el tipo específico (ej: "DOCUMENTO_CAMBIO_ACEITE" → "CAMBIO ACEITE")
    if (alert.tipoAlerta.includes('DOCUMENTO_')) {
      return alert.tipoAlerta.replace('DOCUMENTO_', '').replace(/_/g, ' ');
    }
    return title;
  }

  function buildAlertSubtitle(alert) {
    const emoji = getVehicleTypeEmoji(alert.tipoMaquinaria);
    const typeName = getVehicleTypeName(alert.tipoMaquinaria, alert);
    return `${emoji} ${typeName} — ${alert.placa}`;
  }

  function getVehicleTypeEmoji(tipoMaquinaria) {
    switch(tipoMaquinaria) {
      case 'VEHICULO': return '🚗';
      case 'MOTOCICLETA': return '🏍️';
      case 'MAQUINARIA': return '⚙️';
      case 'USUARIO': return '👤';
      default: return '📦';
    }
  }

  function getVehicleTypeName(tipoMaquinaria, alert) {
    // Usar tipoMaquinaria si existe y es válido
    if (tipoMaquinaria) {
      switch(tipoMaquinaria) {
        case 'VEHICULO': return 'Vehículo';
        case 'MOTOCICLETA': return 'Motocicleta';
        case 'MAQUINARIA': return 'Máquina';
        case 'USUARIO': return 'Usuario';
        default: return tipoMaquinaria;
      }
    }

    // Fallback: deducir de la descripción
    if (alert && alert.descripcion) {
      const desc = alert.descripcion.toLowerCase();
      if (desc.includes('máquina') || desc.includes('maquina')) return 'Máquina';
      if (desc.includes('motocicleta') || desc.includes('moto')) return 'Motocicleta';
      if (desc.includes('vehículo') || desc.includes('vehiculo')) return 'Vehículo';
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
    // Usar la descripción que viene del servidor para mostrar estado actual
    // (puede ser "próximo a vencer" o "VENCIDO")
    if (alert.descripcion) {
      const descripcion = alert.descripcion
        .replace(/^Documento /, '')
        .replace(/^Document /, '');
      return `${emoji} ${descripcion}`;
    }
    // Fallback si no hay descripción
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
    <!-- Alertas Críticas -->
    {#if alertsByGroup.critical.length > 0}
      <div class="dropdown-section-header severity-critical">
        🔴 ALERTAS CRÍTICAS ({alertsByGroup.critical.length})
      </div>
      {#each alertsByGroup.critical as alert (`alert_${alert.id}`)}
        <div
          class="dropdown-item alert-item alert-critical"
          style="background: {getAlertBgColor(alert.colorEstado)} !important; border-left: 4px solid {getAlertColor(alert.colorEstado)}; opacity: {isResolving[alert.id] ? 0.5 : 1};"
        >
          <div class="alert-content">
            {#if alert.tipoAlerta.includes('DOCUMENTO')}
              <div class="alert-title" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#1a1a1a'}; font-weight: bold;">
                {getAlertTitle(alert)}
              </div>
              <div class="alert-subtitle" style="color: {alert.colorEstado === 'ROJO' ? '#d32f2f' : '#333'};">📍 {alert.placa} ({getVehicleTypeName(alert.tipoMaquinaria, alert)})</div>
              <div class="alert-text" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#444'};">{formatDocumentDescription(alert)}</div>
              {#if alert.fechaVencimiento}
                <div class="alert-date" style="color: {alert.colorEstado === 'ROJO' ? '#b71c1c' : '#d84444'};">Vence: {formatDocumentDate(alert)}</div>
              {/if}
            {:else}
              <div class="alert-title" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#000'}; font-weight: 900;">
                {getAlertTitle(alert)}
              </div>
              <div class="alert-subtitle" style="color: {alert.colorEstado === 'ROJO' ? '#d32f2f' : '#333'};">
                {buildAlertSubtitle(alert)}
              </div>
              <div class="alert-text" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#444'};">{formatAlertDescription(alert)}</div>
              {#if alert.fechaVencimiento}
                <div class="alert-date" style="color: {alert.colorEstado === 'ROJO' ? '#b71c1c' : '#d84444'};">Vence: {formatDocumentDate(alert)}</div>
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
      {#if alertsByGroup.warning.length > 0 || alertsByGroup.info.length > 0}
        <div class="dropdown-divider"></div>
      {/if}
    {/if}

    <!-- Alertas de Advertencia -->
    {#if alertsByGroup.warning.length > 0}
      <div class="dropdown-section-header severity-warning">
        🟡 ALERTAS DE ADVERTENCIA ({alertsByGroup.warning.length})
      </div>
      {#each alertsByGroup.warning as alert (`alert_${alert.id}`)}
        <div
          class="dropdown-item alert-item alert-warning"
          style="background: {getAlertBgColor(alert.colorEstado)} !important; border-left: 4px solid {getAlertColor(alert.colorEstado)}; opacity: {isResolving[alert.id] ? 0.5 : 1};"
        >
          <div class="alert-content">
            {#if alert.tipoAlerta.includes('DOCUMENTO')}
              <div class="alert-title" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#1a1a1a'}; font-weight: bold;">
                {getAlertTitle(alert)}
              </div>
              <div class="alert-subtitle" style="color: {alert.colorEstado === 'ROJO' ? '#d32f2f' : '#333'};">📍 {alert.placa} ({getVehicleTypeName(alert.tipoMaquinaria, alert)})</div>
              <div class="alert-text" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#444'};">{formatDocumentDescription(alert)}</div>
              {#if alert.fechaVencimiento}
                <div class="alert-date" style="color: {alert.colorEstado === 'ROJO' ? '#b71c1c' : '#d84444'};">Vence: {formatDocumentDate(alert)}</div>
              {/if}
            {:else}
              <div class="alert-title" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#000'}; font-weight: 900;">
                {getAlertTitle(alert)}
              </div>
              <div class="alert-subtitle" style="color: {alert.colorEstado === 'ROJO' ? '#d32f2f' : '#333'};">
                {buildAlertSubtitle(alert)}
              </div>
              <div class="alert-text" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#444'};">{formatAlertDescription(alert)}</div>
              {#if alert.fechaVencimiento}
                <div class="alert-date" style="color: {alert.colorEstado === 'ROJO' ? '#b71c1c' : '#d84444'};">Vence: {formatDocumentDate(alert)}</div>
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
      {#if alertsByGroup.info.length > 0}
        <div class="dropdown-divider"></div>
      {/if}
    {/if}

    <!-- Alertas Informativas -->
    {#if alertsByGroup.info.length > 0}
      <div class="dropdown-section-header severity-info">
        🟢 ALERTAS INFORMATIVAS ({alertsByGroup.info.length})
      </div>
      {#each alertsByGroup.info as alert (`alert_${alert.id}`)}
        <div
          class="dropdown-item alert-item alert-info"
          style="background: {getAlertBgColor(alert.colorEstado)} !important; border-left: 4px solid {getAlertColor(alert.colorEstado)}; opacity: {isResolving[alert.id] ? 0.5 : 1};"
        >
          <div class="alert-content">
            {#if alert.tipoAlerta.includes('DOCUMENTO')}
              <div class="alert-title" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#1a1a1a'}; font-weight: bold;">
                {getAlertTitle(alert)}
              </div>
              <div class="alert-subtitle" style="color: {alert.colorEstado === 'ROJO' ? '#d32f2f' : '#333'};">📍 {alert.placa} ({getVehicleTypeName(alert.tipoMaquinaria, alert)})</div>
              <div class="alert-text" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#444'};">{formatDocumentDescription(alert)}</div>
              {#if alert.fechaVencimiento}
                <div class="alert-date" style="color: {alert.colorEstado === 'ROJO' ? '#b71c1c' : '#d84444'};">Vence: {formatDocumentDate(alert)}</div>
              {/if}
            {:else}
              <div class="alert-title" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#000'}; font-weight: 900;">
                {getAlertTitle(alert)}
              </div>
              <div class="alert-subtitle" style="color: {alert.colorEstado === 'ROJO' ? '#d32f2f' : '#333'};">
                {buildAlertSubtitle(alert)}
              </div>
              <div class="alert-text" style="color: {alert.colorEstado === 'ROJO' ? '#c62828' : '#444'};">{formatAlertDescription(alert)}</div>
              {#if alert.fechaVencimiento}
                <div class="alert-date" style="color: {alert.colorEstado === 'ROJO' ? '#b71c1c' : '#d84444'};">Vence: {formatDocumentDate(alert)}</div>
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
    {/if}

    {#if filteredMessages.length > 0}
      <div class="dropdown-divider"></div>
    {/if}

    <!-- Notificaciones Regulares -->
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
    background: linear-gradient(to bottom, #fff 0%, #f0f0f0 100%);
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
    background: linear-gradient(to right, #e0e0e0, #c8c8c8);
    font-weight: bold;
    font-size: 11px;
    color: #222;
    border-bottom: 1px solid #b0b0b0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .dropdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 13px;
    border-bottom: 1px solid #e0e0e0;
    transition: background-color 0.15s;
    background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%);
  }

  .dropdown-item:hover {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e8e8e8 100%);
  }

  .dropdown-item.alert-item {
    padding: 11px 13px;
    align-items: flex-start;
    gap: 9px;
  }

  .dropdown-item.alert-item:hover {
    background: linear-gradient(to bottom, #f0f0f0 0%, #e8e8e8 100%);
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

  .dropdown-section-header.severity-critical {
    background: linear-gradient(to right, #ffcccc, #ff9999);
    border-left: 4px solid #d32f2f;
    color: #b71c1c;
    font-weight: bold;
  }

  .dropdown-section-header.severity-warning {
    background: linear-gradient(to right, #fff5cc, #ffe0a1);
    border-left: 4px solid #f57c00;
    color: #e65100;
    font-weight: bold;
  }

  .dropdown-section-header.severity-info {
    background: linear-gradient(to right, #ccffcc, #99ff99);
    border-left: 4px solid #388e3c;
    color: #1b5e20;
    font-weight: bold;
  }

  .alert-item.alert-critical {
    box-shadow: inset -3px 0 0 #d32f2f;
  }

  .alert-item.alert-critical:hover {
    background: #ffe0e0 !important;
  }

  .alert-item.alert-warning {
    box-shadow: inset -3px 0 0 #f57c00;
  }

  .alert-item.alert-warning:hover {
    background: #fff5e8 !important;
  }

  .alert-item.alert-info {
    box-shadow: inset -3px 0 0 #388e3c;
  }

  .alert-item.alert-info:hover {
    background: #e8ffe8 !important;
  }
</style>
