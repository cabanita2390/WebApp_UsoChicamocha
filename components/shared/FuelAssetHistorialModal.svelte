<script>
  import { createEventDispatcher } from 'svelte';

  export let assetType = '';
  export let assetPlate = '';
  export let logs = [];
  export let loading = false;

  const dispatch = createEventDispatcher();

  function fmtDate(v) {
    if (!v) return '—';
    return new Date(v).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  }
  function fmtNum(v, decimals = 2) {
    if (v == null) return '—';
    return Number(v).toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function fmtCurrency(v) {
    if (v == null) return '—';
    return `$${Number(v).toLocaleString('es-CO')}`;
  }

  $: totalLiters = logs.reduce((s, r) => s + (r.quantityLiters ?? 0), 0);
  $: totalCost = logs.reduce((s, r) => s + (r.totalCostCalculated ?? 0), 0);
  $: avgEfficiency = (() => {
    const valid = logs.filter(r => r.efficiencyValue != null);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + Number(r.efficiencyValue), 0) / valid.length;
  })();
  $: efficiencyUnit = logs.find(r => r.efficiencyUnit)?.efficiencyUnit;
  $: anomalyCount = logs.filter(r => r.isAnomaly).length;
</script>

<style>
  .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.55); display: flex; justify-content: center; align-items: center; z-index: 1100; }
  .modal { background: #e0e0e0; border: 2px outset #c0c0c0; width: 780px; max-width: 96vw; max-height: 88vh; display: flex; flex-direction: column; }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #b0b0b0; flex-shrink: 0; }
  .modal-header h3 { margin: 0; font-size: 13px; }
  .close-btn { background: none; border: none; font-size: 20px; cursor: pointer; line-height: 1; }
  .summary-bar { display: flex; gap: 20px; padding: 8px 14px; background: #d8d8d8; border-bottom: 1px solid #b8b8b8; flex-wrap: wrap; flex-shrink: 0; }
  .summary-item { display: flex; flex-direction: column; font-size: 11px; }
  .summary-item span:first-child { font-weight: bold; color: #555; font-size: 10px; }
  .summary-item span:last-child { font-size: 12px; }
  .table-wrap { flex: 1 1 auto; overflow: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #c0c0c0; border: 1px outset #303030; border-left: none; padding: 5px 8px; text-align: center; white-space: nowrap; font-size: 11px; }
  td { border: 1px solid #c0c0c0; border-left: none; padding: 4px 8px; background: #fff; white-space: nowrap; }
  tr:nth-child(even) td { background: #f4f4f4; }
  .anomaly-row td { background: #fff0e0 !important; }
  .badge-anomaly { color: #c00; font-weight: bold; }
  .empty-msg { text-align: center; padding: 32px; color: #666; font-size: 12px; }
  .loader-msg { text-align: center; padding: 32px; font-size: 12px; }
  .footer { display: flex; justify-content: flex-end; padding: 10px 14px; border-top: 1px solid #b0b0b0; flex-shrink: 0; }
  .btn { padding: 4px 14px; background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%); border: 1px outset #c0c0c0; cursor: pointer; font-size: 11px; font-family: inherit; }
  .btn:hover { background: linear-gradient(to bottom, #fff 0%, #e0e0e0 100%); }
  .btn:active { border-style: inset; }
</style>

<div class="overlay">
  <div class="modal" on:click|stopPropagation>

    <div class="modal-header">
      <h3>Historial de combustible — {assetType} · {assetPlate || 'sin placa'}</h3>
      <button class="close-btn" on:click={() => dispatch('close')}>×</button>
    </div>

    {#if !loading && logs.length > 0}
      <div class="summary-bar">
        <div class="summary-item">
          <span>Registros</span>
          <span>{logs.length}</span>
        </div>
        <div class="summary-item">
          <span>Total litros</span>
          <span>{fmtNum(totalLiters, 3)} L</span>
        </div>
        <div class="summary-item">
          <span>Total costo</span>
          <span>{fmtCurrency(totalCost)}</span>
        </div>
        {#if avgEfficiency != null}
          <div class="summary-item">
            <span>Eficiencia promedio</span>
            <span>{fmtNum(avgEfficiency, 2)} {efficiencyUnit === 'KM_PER_LITER' ? 'km/L' : 'L/h'}</span>
          </div>
        {/if}
        {#if anomalyCount > 0}
          <div class="summary-item">
            <span>Anomalías</span>
            <span class="badge-anomaly">⚠ {anomalyCount}</span>
          </div>
        {/if}
      </div>
    {/if}

    <div class="table-wrap">
      {#if loading}
        <div class="loader-msg">Cargando historial...</div>
      {:else if logs.length === 0}
        <div class="empty-msg">No hay registros de combustible para este activo.</div>
      {:else}
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cantidad</th>
              <th>Litros</th>
              <th>Precio/Ud</th>
              <th>Total</th>
              {#if assetType !== 'MACHINE'}
                <th>Odómetro km</th>
              {:else}
                <th>Horómetro h</th>
              {/if}
              <th>Eficiencia</th>
              <th>Tipo</th>
              <th>Estación</th>
              <th>Llenado</th>
              <th>Anomalía</th>
              <th>Factura</th>
            </tr>
          </thead>
          <tbody>
            {#each logs as r}
              <tr class:anomaly-row={r.isAnomaly}>
                <td>{fmtDate(r.fuelDateTime)}</td>
                <td>{r.quantity != null ? `${fmtNum(r.quantity, 3)} ${r.quantityUnit ?? ''}` : '—'}</td>
                <td>{r.quantityLiters != null ? fmtNum(r.quantityLiters, 3) : '—'}</td>
                <td>{r.pricePerUnit != null ? fmtCurrency(r.pricePerUnit) : '—'}</td>
                <td>{r.totalCostCalculated != null ? fmtCurrency(r.totalCostCalculated) : '—'}</td>
                {#if assetType !== 'MACHINE'}
                  <td>{r.odometerKm ?? '—'}</td>
                {:else}
                  <td>{r.hourMeter ?? '—'}</td>
                {/if}
                <td>
                  {#if r.efficiencyValue != null}
                    {fmtNum(r.efficiencyValue, 2)} {r.efficiencyUnit === 'KM_PER_LITER' ? 'km/L' : 'L/h'}
                  {:else}—{/if}
                </td>
                <td>{r.fuelType ?? '—'}</td>
                <td>{r.serviceStation ?? '—'}</td>
                <td>{r.isFullTank ? 'Sí' : 'No'}</td>
                <td>{r.isAnomaly ? '⚠ Sí' : 'No'}</td>
                <td>{r.invoiceStatus ?? '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

    <div class="footer">
      <button class="btn" on:click={() => dispatch('close')}>Cerrar</button>
    </div>

  </div>
</div>
