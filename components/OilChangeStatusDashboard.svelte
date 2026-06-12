<script>
  import { onDestroy } from 'svelte';
  import { improvedOilChangeStore } from '../stores/improvedOilChange';

  let $vehicleOilChanges;
  let $machineOilChanges;

  const unsubscribeVehicle = improvedOilChangeStore.vehicleOilChanges.subscribe(v => {
    $vehicleOilChanges = v;
  });

  const unsubscribeMachine = improvedOilChangeStore.machineOilChanges.subscribe(v => {
    $machineOilChanges = v;
  });

  onDestroy(() => {
    unsubscribeVehicle();
    unsubscribeMachine();
  });

  function getAlertClass(percentageUsed) {
    if (percentageUsed >= 100) return 'alert-red';
    if (percentageUsed >= 80) return 'alert-yellow';
    if (percentageUsed >= 60) return 'alert-blue';
    return 'alert-green';
  }

  function getAlertLabel(percentageUsed) {
    if (percentageUsed >= 100) return '🔴 VENCIDO';
    if (percentageUsed >= 80) return '🟡 PRÓXIMO';
    if (percentageUsed >= 60) return '🔵 PROGRAMADO';
    return '✅ BUENO';
  }
</script>

<div class="dashboard">
  <h2>📊 Estado de Cambios de Aceite</h2>

  <!-- Vehículos -->
  <section class="section">
    <h3>Vehículos y Motocicletas</h3>
    {#if $vehicleOilChanges && $vehicleOilChanges.length > 0}
      <div class="grid">
        {#each $vehicleOilChanges as change}
          <div class={`card ${getAlertClass(change.percentageUsed)}`}>
            <div class="card-header">
              <h4>{change.placa}</h4>
              <span class="alert-label">{getAlertLabel(change.percentageUsed)}</span>
            </div>

            <div class="card-body">
              <p><strong>Tipo de Aceite:</strong> {change.oilType}</p>
              <p><strong>Marca:</strong> {change.brandName}</p>
              <p><strong>Durabilidad:</strong> {change.oilDurability}</p>

              <div class="progress-bar">
                <div
                  class="progress"
                  style="width: {Math.min(change.percentageUsed, 100)}%"
                ></div>
              </div>
              <p class="progress-text">{change.percentageUsed}% utilizado</p>

              <div class="info-grid">
                <div>
                  <p class="label">Último cambio</p>
                  <p class="value">{change.kmAtChange} km</p>
                </div>
                <div>
                  <p class="label">Próximo cambio</p>
                  <p class="value">{change.nextChangeKm} km</p>
                </div>
                <div>
                  <p class="label">Faltan</p>
                  <p class="value">{Math.max(0, change.nextChangeKm - change.kmAtChange)} km</p>
                </div>
                <div>
                  <p class="label">Cantidad</p>
                  <p class="value">{change.quantity}L</p>
                </div>
              </div>

              {#if change.airFilterChanged}
                <p class="note">ℹ️ Filtro de aire fue cambiado</p>
              {/if}
            </div>

            <div class="card-footer">
              <small>{change.dateStamp}</small>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty">No hay registros de cambios de aceite</p>
    {/if}
  </section>

  <!-- Maquinaria -->
  <section class="section">
    <h3>Maquinaria</h3>
    {#if $machineOilChanges && $machineOilChanges.length > 0}
      <div class="grid">
        {#each $machineOilChanges as change}
          <div class={`card ${getAlertClass(change.percentageUsed)}`}>
            <div class="card-header">
              <h4>Máquina {change.machineId}</h4>
              <span class="alert-label">{getAlertLabel(change.percentageUsed)}</span>
            </div>

            <div class="card-body">
              <p><strong>Tipo:</strong> {change.motorOil ? 'Motor' : 'Hidráulico'}</p>
              <p><strong>Aceite:</strong> {change.oilType}</p>
              <p><strong>Marca:</strong> {change.brandName}</p>
              <p><strong>Durabilidad:</strong> {change.oilDurability}</p>

              <div class="progress-bar">
                <div
                  class="progress"
                  style="width: {Math.min(change.percentageUsed, 100)}%"
                ></div>
              </div>
              <p class="progress-text">{change.percentageUsed}% utilizado</p>

              <div class="info-grid">
                <div>
                  <p class="label">Último cambio</p>
                  <p class="value">{change.hourStamp} hrs</p>
                </div>
                <div>
                  <p class="label">Próximo cambio</p>
                  <p class="value">{change.nextChangeHours} hrs</p>
                </div>
                <div>
                  <p class="label">Faltan</p>
                  <p class="value">{Math.max(0, change.nextChangeHours - change.hourStamp)} hrs</p>
                </div>
                <div>
                  <p class="label">Cantidad</p>
                  <p class="value">{change.quantity}L</p>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <small>{change.dateStamp}</small>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty">No hay registros de cambios de aceite</p>
    {/if}
  </section>
</div>

<style>
  .dashboard {
    padding: 20px;
  }

  h2 {
    color: #333;
    margin-bottom: 24px;
  }

  .section {
    margin-bottom: 32px;
  }

  .section h3 {
    color: #555;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #eee;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 16px;
  }

  .card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-left: 4px solid;
    transition: all 0.2s;
  }

  .card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .card.alert-red {
    border-left-color: #d32f2f;
    background: linear-gradient(to right, rgba(211, 47, 47, 0.05), white);
  }

  .card.alert-yellow {
    border-left-color: #fbc02d;
    background: linear-gradient(to right, rgba(251, 192, 45, 0.05), white);
  }

  .card.alert-blue {
    border-left-color: #1976d2;
    background: linear-gradient(to right, rgba(25, 118, 210, 0.05), white);
  }

  .card.alert-green {
    border-left-color: #388e3c;
    background: linear-gradient(to right, rgba(56, 142, 60, 0.05), white);
  }

  .card-header {
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.02);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
  }

  .card-header h4 {
    margin: 0;
    color: #333;
    font-size: 16px;
  }

  .alert-label {
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.05);
  }

  .card-body {
    padding: 16px;
  }

  .card-body p {
    margin: 8px 0;
    font-size: 14px;
    color: #666;
  }

  .card-body p strong {
    color: #333;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
    margin: 12px 0;
  }

  .progress {
    height: 100%;
    background: linear-gradient(to right, #4caf50, #fbc02d, #f57c00, #d32f2f);
    transition: width 0.3s;
  }

  .progress-text {
    text-align: center;
    font-weight: 500;
    color: #333;
    font-size: 13px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 12px 0;
  }

  .info-grid div {
    background: rgba(0, 0, 0, 0.02);
    padding: 8px;
    border-radius: 4px;
  }

  .label {
    font-size: 12px;
    color: #999;
    margin: 0 0 4px 0;
  }

  .value {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin: 0;
  }

  .note {
    margin-top: 12px;
    padding: 8px;
    background: #e3f2fd;
    border-left: 3px solid #1976d2;
    font-size: 13px;
    color: #1565c0;
  }

  .card-footer {
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.02);
    border-top: 1px solid #eee;
    text-align: right;
  }

  .card-footer small {
    color: #999;
    font-size: 12px;
  }

  .empty {
    padding: 40px;
    text-align: center;
    color: #999;
    background: #f5f5f5;
    border-radius: 8px;
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .info-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
