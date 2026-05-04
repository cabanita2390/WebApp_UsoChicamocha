<script>
  import { reportMotoColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  $: inspections = $data.motoInspections;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;

  async function handleRefresh() {
    await data.fetchMotoInspections();
  }
</script>

<div class="view-container">
  <div class="refresh-container">
    <button class="btn-refresh" on:click={handleRefresh}>
      Refrescar Inspecciones
    </button>
  </div>

  {#if isLoading}
    <div class="loader-container">
      <Loader />
      <p>Cargando inspecciones de motos...</p>
    </div>
  {:else if errorMessage}
    <div class="error-panel">
      <p><strong>Error:</strong> {errorMessage}</p>
    </div>
  {:else}
    <div class="table-group">
      <DataGrid columns={reportMotoColumns} data={inspections} fixedLayout={false} />
    </div>
  {/if}
</div>

<style>
  .view-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .loader-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 200px;
    gap: 16px;
  }
  .table-group {
    flex: 1;
    min-height: 0;
  }
  .error-panel {
    padding: 16px;
    background-color: #ffdddd;
    border: 1px solid #ff0000;
    color: #8b0000;
  }
  .refresh-container {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }
  .btn-refresh {
    padding: 2px 8px;
    background: linear-gradient(to bottom, #e0e0e0 0%, #c0c0c0 100%);
    border: 1px outset #c0c0c0;
    cursor: pointer;
    font-size: 10px;
    font-family: inherit;
  }
</style>
