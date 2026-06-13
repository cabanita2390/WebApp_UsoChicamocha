<script>
  import { onMount } from 'svelte';
  import { oilChangeAlerts, subscribeToOilChangeAlerts, getAlertTailwindClass, getAlertBadge } from '../../composables/useOilChangeAlerts';
  import { stompClient } from '../../stores/websocket';

  let isConnected = false;
  let filteredAlerts = [];

  onMount(() => {
    // Verificar si STOMP está conectado
    if (stompClient && stompClient.connected) {
      isConnected = true;
      subscribeToOilChangeAlerts((alert) => {
        // Se actualiza automáticamente via store
      });
    }

    // Suscribirse a cambios en el store
    const unsubscribe = oilChangeAlerts.subscribe(alerts => {
      filteredAlerts = Object.values(alerts || {})
        .sort((a, b) => {
          // Ordenar: RED primero, luego YELLOW, BLUE, GREEN
          const priority = { RED: 0, YELLOW: 1, BLUE: 2, GREEN: 3 };
          return (priority[a.alertColor] || 4) - (priority[b.alertColor] || 4);
        });
    });

    return unsubscribe;
  });

  function formatPercentage(value) {
    return value ? value.toFixed(1) : '0';
  }

  function getEmoji(color) {
    return {
      GREEN: '✅',
      BLUE: '🔵',
      YELLOW: '🟡',
      RED: '🔴'
    }[color] || '⚪';
  }
</script>

<div class="oil-change-alerts-widget">
  <!-- Estado de conexión -->
  <div class="connection-status mb-4">
    {#if isConnected}
      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        🟢 Conectado a alertas en tiempo real
      </span>
    {:else}
      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
        ⚪ Desconectado - Recargue la página
      </span>
    {/if}
  </div>

  <!-- Lista de alertas -->
  {#if filteredAlerts.length === 0}
    <div class="empty-state p-6 text-center bg-gray-50 rounded-lg">
      <p class="text-gray-600">✅ No hay alertas activas. Todos los sistemas en verde.</p>
    </div>
  {:else}
    <div class="alerts-list space-y-3">
      {#each filteredAlerts as alert (alert.placa)}
        <div class="alert-item border-l-4 p-4 rounded {getAlertTailwindClass(alert.alertColor)}">
          <!-- Encabezado: Placa y estado -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-xl">{getEmoji(alert.alertColor)}</span>
              <span class="font-bold text-lg">{alert.placa}</span>
              <span class="badge">{getAlertBadge(alert.alertColor)}</span>
            </div>
            <span class="text-sm opacity-75">{alert.tipoMaquinaria}</span>
          </div>

          <!-- Mensaje de alerta -->
          <p class="text-sm mb-3">{alert.alertMessage}</p>

          <!-- Métricas -->
          <div class="metrics grid grid-cols-3 gap-2 text-sm">
            <div>
              <span class="opacity-75">Uso: </span>
              <strong>{formatPercentage(alert.percentageUsed)}%</strong>
            </div>
            <div>
              <span class="opacity-75">Restante: </span>
              <strong>{alert.distanceRemaining} km/hrs</strong>
            </div>
            <div>
              <span class="opacity-75">Hora: </span>
              <strong>{new Date(alert.timestamp).toLocaleTimeString('es-ES')}</strong>
            </div>
          </div>

          <!-- Barra de progreso -->
          <div class="progress-bar mt-3 bg-black bg-opacity-20 rounded-full h-2 overflow-hidden">
            <div
              class="h-full transition-all duration-300"
              style="width: {Math.min(alert.percentageUsed, 100)}%; background-color: inherit;"
            />
          </div>
        </div>
      {/each}
    </div>

    <!-- Resumen -->
    <div class="summary mt-6 text-sm text-gray-600 bg-gray-50 p-3 rounded">
      <p>
        {filteredAlerts.filter(a => a.alertColor === 'RED').length} 🔴 URGENTES |
        {filteredAlerts.filter(a => a.alertColor === 'YELLOW').length} 🟡 PRÓXIMOS |
        {filteredAlerts.filter(a => a.alertColor === 'BLUE').length} 🔵 PROGRAMADOS
      </p>
    </div>
  {/if}
</div>

<style>
  .oil-change-alerts-widget {
    font-family: inherit;
  }

  .alert-item {
    animation: slideIn 0.3s ease-in-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>
