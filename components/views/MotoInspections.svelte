<script>
  import BotonExcel from "../shared/BotonExcel.svelte";
  import { onMount } from 'svelte';
  import { reportMotoColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { ui } from '../../stores/ui.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  $: inspections = $data.motoInspections.data;
  $: totalPages = $data.motoInspections.totalPages;
  $: currentPage = $data.motoInspections.currentPage;
  $: pageSize = $data.motoInspections.pageSize;
  $: totalElements = $data.motoInspections.totalElements;
  $: isLoading = $data.isLoadingMotoInspections;
  $: errorMessage = $data.errorMotoInspections;


  onMount(() => {
    if (!$data.motoInspections || !$data.motoInspections.data || $data.motoInspections.data.length === 0) {
      data.fetchMotoInspections(0, 20);
    }
  });

  async function handleRefresh() {
    await data.fetchMotoInspections(currentPage, pageSize, { reload: true });
  }

  async function handlePageChange(event) {
    await data.fetchMotoInspections(event.detail, pageSize, { reload: false });
  }

  async function handleSizeChange(event) {
    await data.fetchMotoInspections(0, event.detail, { reload: false });
  }


  function handleCellContextMenu(event) {
    const { row, columnDef } = event.detail;
    if (columnDef.meta?.isStatus || columnDef.meta?.isDateStatus) {
      ui.openVehicleWorkOrderModal(row, columnDef);
    }
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    <div class="vehicle-toolbar">
      <button type="button" class="vehicle-btn" on:click={handleRefresh}>Refrescar</button>
      <BotonExcel claves="inspecciones-motos" />
    </div>

    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando inspecciones de motos...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Error:</strong> {errorMessage}</p>
      </div>
    {:else}
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid
          columns={reportMotoColumns}
          data={inspections}
          fixedLayout={false}
          totalElements={totalElements}
          totalPages={totalPages}
          currentPage={currentPage}
          pageSize={pageSize}
          on:pageChange={handlePageChange}
          on:sizeChange={handleSizeChange}
          on:cellContextMenu={handleCellContextMenu}
        />
      </div>
    {/if}
  </div>
</div>

