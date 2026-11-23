<script>
  import PeriodoExcelModal from "../shared/PeriodoExcelModal.svelte";
  import { conPeriodo, nombreConPeriodo } from "../../utils/periodoExcel.js";
  import { vehicleInspectionReportColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { ui, addNotification } from '../../stores/ui.js';
  import { download } from '../../stores/api.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  $: inspections = $data.vehicleInspections.data;
  $: totalPages = $data.vehicleInspections.totalPages;
  $: currentPage = $data.vehicleInspections.currentPage;
  $: pageSize = $data.vehicleInspections.pageSize;
  $: totalElements = $data.vehicleInspections.totalElements;
  $: isLoading = $data.isLoadingVehicleInspections;
  $: errorMessage = $data.errorVehicleInspections;

  let isExporting = false;

  async function handleRefresh() {
    await data.fetchVehicleInspections(currentPage, pageSize, { reload: true });
  }

  // El periodo se elige en el panel (atajos o rango); sin fechas trae todo el historial.
  let periodoAbierto = false;
  function handleExport() {
    periodoAbierto = true;
  }

  async function handleExportConPeriodo(periodo) {
    isExporting = true;
    try {
      await download(conPeriodo('vehicle-inspection/export', periodo), nombreConPeriodo('inspecciones_vehiculos', periodo));
      periodoAbierto = false;
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

<PeriodoExcelModal bind:abierto={periodoAbierto} titulo="Inspecciones de vehículos" descargando={isExporting}
  on:descargar={(e) => handleExportConPeriodo(e.detail)} />
