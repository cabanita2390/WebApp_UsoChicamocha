<script>
  import { vehicleInspectionReportColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  $: inspections = $data.vehicleInspections.data;
  $: totalPages = $data.vehicleInspections.totalPages;
  $: currentPage = $data.vehicleInspections.currentPage;
  $: pageSize = $data.vehicleInspections.pageSize;
  $: totalElements = $data.vehicleInspections.totalElements;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;

  async function handleRefresh() {
    await data.fetchVehicleInspections(currentPage, pageSize, { reload: true });
  }

  async function handlePageChange(event) {
    await data.fetchVehicleInspections(event.detail, pageSize, { reload: false });
  }

  async function handleSizeChange(event) {
    const newSize = event.detail;
    await data.fetchVehicleInspections(0, newSize, { reload: false });
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
        <p>Cargando inspecciones...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Error:</strong> {errorMessage}</p>
      </div>
    {:else}
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid
          columns={vehicleInspectionReportColumns}
          data={inspections}
          fixedLayout={false}
          {totalPages}
          {currentPage}
          {pageSize}
          {totalElements}
          on:pageChange={handlePageChange}
          on:sizeChange={handleSizeChange}
        />
      </div>
    {/if}
  </div>
</div>
