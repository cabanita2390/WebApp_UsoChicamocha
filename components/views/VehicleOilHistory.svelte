<script>
  import { pop } from 'svelte-spa-router';
  import { vehicleOilHistoryColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { normalizePlaca } from '@/lib/textFormat.js';

  export let params = {};

  $: placa = normalizePlaca(params.placa ?? '');

  let history = [];
  let isLoading = false;
  let error = null;
  let vehicleInfo = null;

  let _lastPlaca = '';
  $: if (placa && placa !== _lastPlaca) {
    _lastPlaca = placa;
    loadHistory();
  }

  async function loadHistory() {
    if (!placa) { error = 'No se especificó ninguna placa.'; return; }
    isLoading = true;
    error = null;
    try {
      history = await data.fetchVehicleOilHistory(placa);
      if (history.length > 0) {
        const last = history[0];
        vehicleInfo = { kmActual: last.kmAtChange };
      }
    } catch (e) {
      error = e.message || 'Error al cargar el historial.';
    } finally {
      isLoading = false;
    }
  }

  $: totalCambios = history.length;
  $: ultimoCambio = history[0] ?? null;
  $: kmProximoCambio =
    ultimoCambio?.kmAtChange != null && ultimoCambio?.intervalKm != null
      ? ultimoCambio.kmAtChange + ultimoCambio.intervalKm
      : null;

  function formatKm(v) {
    if (v == null) return 'N/A';
    return new Intl.NumberFormat('es-CO').format(v);
  }

  function formatDate(raw) {
    if (!raw) return 'N/A';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString('es-CO');
  }
</script>

<div class="oil-history">
  <div class="oil-history__toolbar">
    <button type="button" class="btn-back" on:click={() => pop()}>← Volver</button>
    <h2 class="oil-history__title">
      Historial de cambios de aceite
      {#if placa}<span class="placa-badge">{placa}</span>{/if}
    </h2>
    <button type="button" class="btn-refresh" on:click={loadHistory} disabled={isLoading}>
      Refrescar
    </button>
  </div>

  {#if placa && !isLoading && !error}
    <div class="oil-history__summary">
      <div class="summary-card">
        <span class="summary-label">Total registros</span>
        <span class="summary-value">{totalCambios}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Último cambio (km)</span>
        <span class="summary-value">{formatKm(ultimoCambio?.kmAtChange)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Próximo cambio (km)</span>
        <span class="summary-value summary-value--highlight">{formatKm(kmProximoCambio)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Último aceite</span>
        <span class="summary-value">
          {[ultimoCambio?.brandName, ultimoCambio?.oilType].filter(Boolean).join(' · ') || 'N/A'}
        </span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Fecha último cambio</span>
        <span class="summary-value">{formatDate(ultimoCambio?.dateStamp)}</span>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <div class="oil-history__loader">
      <Loader />
      <p>Cargando historial...</p>
    </div>
  {:else if error}
    <div class="oil-history__error">
      <strong>Error:</strong> {error}
    </div>
  {:else if history.length === 0}
    <div class="oil-history__empty">
      <p>No se encontraron registros de cambio de aceite para la placa <strong>{placa}</strong>.</p>
    </div>
  {:else}
    <div class="oil-history__table">
      <DataGrid
        columns={vehicleOilHistoryColumns}
        data={history}
        totalElements={history.length}
        totalPages={1}
        currentPage={0}
        pageSize={history.length}
        showPagination={false}
        fixedLayout={false}
      />
    </div>
  {/if}
</div>

<style>
  .oil-history {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    font-family: "MS Sans Serif", "Tahoma", sans-serif;
    font-size: 11px;
    padding: 8px;
    box-sizing: border-box;
    gap: 8px;
  }

  .oil-history__toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #a0a0a0;
  }

  .oil-history__title {
    flex: 1;
    margin: 0;
    font-size: 13px;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .placa-badge {
    display: inline-block;
    background: #1a3a6e;
    color: #fff;
    padding: 2px 10px;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 1px;
    border: 1px solid #0d2550;
  }

  .btn-back {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #d0d0d0;
    padding: 3px 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    white-space: nowrap;
  }

  .btn-back:hover { background: linear-gradient(to bottom, #ececec 0%, #d0d0d0 100%); }

  .btn-refresh {
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #d0d0d0;
    padding: 3px 10px;
    cursor: pointer;
    font-family: inherit;
    font-size: 10px;
  }
  .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

  .oil-history__summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 8px 14px;
    background: #f0f0f0;
    border: 1px inset #c0c0c0;
    min-width: 130px;
  }

  .summary-label {
    font-size: 9px;
    color: #505050;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .summary-value {
    font-size: 13px;
    font-weight: bold;
    color: #202020;
  }

  .summary-value--highlight {
    color: #1a3a6e;
  }

  .oil-history__loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 160px;
    gap: 12px;
    color: #404040;
  }

  .oil-history__error {
    padding: 12px 16px;
    background: #ffdddd;
    border: 1px solid #c00;
    color: #800000;
  }

  .oil-history__empty {
    padding: 20px;
    text-align: center;
    color: #505050;
    background: #f8f8f8;
    border: 1px inset #c0c0c0;
  }

  .oil-history__table {
    flex: 1;
    min-height: 0;
  }
</style>
