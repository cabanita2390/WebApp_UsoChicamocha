<script>
  import {
    monitoringVehicleDocumentColumns,
    monitoringVehicleOilColumns,
  } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  let activeTab = 'documentos';

  $: vehicles = $data.vehicleMonitoring;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;

  async function handleRefresh() {
    await data.fetchVehicleMonitoring();
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    <div class="vehicle-toolbar">
      <button type="button" class="vehicle-btn" on:click={handleRefresh}>Refrescar</button>
    </div>

    <div class="vehicle-tab-bar" role="tablist">
      <button
        type="button"
        class="vehicle-tab"
        class:active={activeTab === 'documentos'}
        on:click={() => (activeTab = 'documentos')}
        role="tab"
        aria-selected={activeTab === 'documentos'}
      >
        Documentación (Tecno / SOAT)
      </button>
      <button
        type="button"
        class="vehicle-tab"
        class:active={activeTab === 'aceite'}
        on:click={() => (activeTab = 'aceite')}
        role="tab"
        aria-selected={activeTab === 'aceite'}
      >
        Cambio de aceite
      </button>
    </div>

    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando monitoreo...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Error:</strong> {errorMessage}</p>
      </div>
    {:else}
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        {#if activeTab === 'documentos'}
          <DataGrid
            columns={monitoringVehicleDocumentColumns}
            data={vehicles}
            totalElements={vehicles.length}
            totalPages={1}
            currentPage={0}
            pageSize={Math.max(vehicles.length, 1)}
            showPagination={false}
            fixedLayout={false}
          />
        {:else}
          <DataGrid
            columns={monitoringVehicleOilColumns}
            data={vehicles}
            totalElements={vehicles.length}
            totalPages={1}
            currentPage={0}
            pageSize={Math.max(vehicles.length, 1)}
            showPagination={false}
            fixedLayout={false}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>
