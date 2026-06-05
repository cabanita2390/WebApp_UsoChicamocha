<script>
  import { createEventDispatcher } from 'svelte';

  export let assetType = '';
  export let assetPlate = '';
  export let logs = [];
  export let loading = false;
  export let onInvoiceUpload = null;

  const dispatch = createEventDispatcher();

  let pageSize = 10;
  let currentPage = 0;

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

  $: sortedLogs = [...logs].sort((a, b) => new Date(b.fuelDateTime) - new Date(a.fuelDateTime));
  $: totalPages = Math.max(1, Math.ceil(sortedLogs.length / pageSize));
  $: pagedLogs = sortedLogs.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  $: totalLiters = logs.reduce((s, r) => s + (r.quantityLiters ?? 0), 0);
  $: totalCost = logs.reduce((s, r) => s + (r.totalCostCalculated ?? 0), 0);
  $: avgEfficiency = (() => {
    const valid = logs.filter(r => r.efficiencyValue != null);
    if (!valid.length) return null;
    return valid.reduce((s, r) => s + Number(r.efficiencyValue), 0) / valid.length;
  })();
  $: efficiencyUnit = logs.find(r => r.efficiencyUnit)?.efficiencyUnit;
  $: anomalyCount = logs.filter(r => r.isAnomaly).length;

  $: logs, currentPage = 0;

  function getFullAssetLabel() {
    if (!assetType || logs.length === 0) return assetPlate || '';
    const log = logs[0];
    if (assetType === 'MACHINE') {
      return `${assetType} · ${assetPlate}`;
    } else if (assetType === 'VEHICLE' || assetType === 'MOTO') {
      return `${assetType} · ${assetPlate}`;
    }
    return assetPlate || '';
  }
</script>

<style>
  .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.55); display: flex; justify-content: center; align-items: center; z-index: 1100; }
  .modal { background: #e0e0e0; border: 2px outset #c0c0c0; width: 1100px; max-width: 95vw; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 2px solid #b0b0b0; flex-shrink: 0; background: linear-gradient(to bottom, #f0f0f0, #d8d8d8); }
  .modal-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: #333; }
  .close-btn { background: none; border: none; font-size: 22px; cursor: pointer; line-height: 1; color: #666; padding: 2px 8px; }
  .close-btn:hover { color: #000; }
  .summary-bar { display: flex; gap: 24px; padding: 12px 16px; background: linear-gradient(to bottom, #e8e8e8, #d8d8d8); border-bottom: 1px solid #b8b8b8; flex-wrap: wrap; flex-shrink: 0; }
  .summary-item { display: flex; flex-direction: column; font-size: 11px; }
  .summary-item span:first-child { font-weight: 600; color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-item span:last-child { font-size: 13px; font-weight: 500; color: #222; }
  .table-wrap { flex: 1 1 auto; overflow: auto; border: 1px solid #b8b8b8; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: linear-gradient(to bottom, #d8d8d8, #c8c8c8); border: 1px solid #a0a0a0; padding: 7px 10px; text-align: center; white-space: nowrap; font-size: 12px; font-weight: 600; color: #333; }
  td { border: 1px solid #d0d0d0; padding: 6px 10px; background: #fff; white-space: nowrap; }
  tr:nth-child(even) td { background: #f7f7f7; }
  .anomaly-row td { background: #fff5e6 !important; }
  .badge-anomaly { color: #c00; font-weight: bold; }
  .empty-msg { text-align: center; padding: 48px; color: #666; font-size: 13px; }
  .loader-msg { text-align: center; padding: 48px; font-size: 13px; color: #555; }
  .footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 2px solid #b0b0b0; flex-shrink: 0; background: linear-gradient(to bottom, #d8d8d8, #c8c8c8); gap: 8px; }
  .pagination-controls { display: flex; gap: 4px; align-items: center; }
  .btn { padding: 6px 18px; background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%); border: 1px outset #a0a0a0; cursor: pointer; font-size: 12px; font-family: inherit; font-weight: 500; border-radius: 2px; }
  .btn:hover:not(:disabled) { background: linear-gradient(to bottom, #fff 0%, #e0e0e0 100%); border-color: #808080; }
  .btn:active:not(:disabled) { border-style: inset; background: linear-gradient(to bottom, #e0e0e0, #c0c0c0); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

<div class="overlay">
  <div class="modal" on:click|stopPropagation>

    <div class="modal-header">
      <h3>Historial de combustible — {getFullAssetLabel() || 'sin placa'}</h3>
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
              <th>Anomalía</th>
              <th>Factura</th>
            </tr>
          </thead>
          <tbody>
            {#each pagedLogs as r}
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
                <td>{r.isAnomaly ? '⚠ Sí' : 'No'}</td>
                <td style="text-align:center">
                  {#if r.invoicePhotoUrl}
                    <a
                      href={r.invoicePhotoUrl.startsWith('http') ? r.invoicePhotoUrl : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') + '/' + r.invoicePhotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style="color:#0050a0; text-decoration:none; font-weight:500; cursor:pointer;"
                      title="Ver factura"
                    >👁 Ver</a>
                  {:else}
                    <label style="cursor:pointer; color:#666; font-weight:500;">
                      ⬆ Subir
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style="display:none"
                        on:change={e => onInvoiceUpload && onInvoiceUpload(r.id, e)}
                      />
                    </label>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>

    <div class="footer">
      {#if totalPages > 1}
        <div class="pagination-controls">
          <button
            class="btn"
            disabled={currentPage === 0}
            on:click={() => currentPage = 0}
            title="Primera página"
          >«</button>
          <button
            class="btn"
            disabled={currentPage === 0}
            on:click={() => currentPage--}
            title="Página anterior"
          >‹</button>
          <span style="padding: 0 12px; display: flex; align-items: center; font-size: 12px; color: #666;">
            Pág {currentPage + 1} de {totalPages}
          </span>
          <button
            class="btn"
            disabled={currentPage === totalPages - 1}
            on:click={() => currentPage++}
            title="Página siguiente"
          >›</button>
          <button
            class="btn"
            disabled={currentPage === totalPages - 1}
            on:click={() => currentPage = totalPages - 1}
            title="Última página"
          >»</button>
        </div>
      {/if}
      <button class="btn" on:click={() => dispatch('close')}>Cerrar</button>
    </div>

  </div>
</div>
