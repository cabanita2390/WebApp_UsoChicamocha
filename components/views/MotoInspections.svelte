<script>
  import { onMount } from 'svelte';
  import { reportMotoColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { ui, addNotification } from '../../stores/ui.js';
  import { download } from '../../stores/api.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  $: inspections = $data.motoInspections.data;
  $: totalPages = $data.motoInspections.totalPages;
  $: currentPage = $data.motoInspections.currentPage;
  $: pageSize = $data.motoInspections.pageSize;
  $: totalElements = $data.motoInspections.totalElements;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;

  let isExporting = false;

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

  async function handleExport() {
    isExporting = true;
    try {
      await download('moto/inspections/export', 'inspecciones_motos.xlsx');
      addNotification({ id: Date.now(), text: 'Inspecciones de motos descargadas.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExporting = false;
    }
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
      <button type="button" class="vehicle-btn vehicle-btn--export" on:click={handleExport} disabled={isExporting}>
        {isExporting ? 'Descargando...' : 'Exportar Excel'}
      </button>
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
