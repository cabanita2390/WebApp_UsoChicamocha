<script>
  import { maintenanceMotoColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  $: records = $data.vehicleMaintenance;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;

  async function handleRefresh() {
    await data.fetchVehicleMaintenance();
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    <div class="vehicle-toolbar">
      <button type="button" class="vehicle-btn" on:click={handleRefresh}>Refrescar</button>
    </div>

    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando historial...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Error:</strong> {errorMessage}</p>
      </div>
    {:else}
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid
          columns={maintenanceMotoColumns}
          data={records}
          totalElements={records.length}
          totalPages={1}
          currentPage={0}
          pageSize={Math.max(records.length, 1)}
          showPagination={false}
          fixedLayout={false}
        />
      </div>
    {/if}
  </div>
</div>
