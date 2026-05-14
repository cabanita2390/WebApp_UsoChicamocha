<script>
  import { vehicleInspectionReportColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { ui, addNotification } from '../../stores/ui.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  $: inspections = $data.vehicleInspections.data;
  $: totalPages = $data.vehicleInspections.totalPages;
  $: currentPage = $data.vehicleInspections.currentPage;
  $: pageSize = $data.vehicleInspections.pageSize;
  $: totalElements = $data.vehicleInspections.totalElements;
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;

  let isExporting = false;

  async function handleRefresh() {
    await data.fetchVehicleInspections(currentPage, pageSize, { reload: true });
  }

  async function handleExport() {
    isExporting = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/vehicle-inspection/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inspecciones_vehiculos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Inspecciones de vehículos descargadas.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }

  async function handlePageChange(event) {
    await data.fetchVehicleInspections(event.detail, pageSize, { reload: false });
  }

  async function handleSizeChange(event) {
    const newSize = event.detail;
    await data.fetchVehicleInspections(0, newSize, { reload: false });
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
          on:cellContextMenu={handleCellContextMenu}
        />
      </div>
    {/if}
  </div>
</div>
