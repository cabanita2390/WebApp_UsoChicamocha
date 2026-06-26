<script>
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import ExecuteOrderModal from '../shared/ExecuteOrderModal.svelte';
  import { vehicleWorkOrderColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { addNotification } from '../../stores/ui.js';

  export let overrideData = null;

  $: workOrderInfo = overrideData ?? $data.vehicleWorkOrders;
  $: isLoading = $data.isLoading;

  let selectedWorkOrder = null;
  let isExporting = false;

  function handlePageChange(event) {
    data.fetchVehicleWorkOrders(event.detail, workOrderInfo.pageSize);
  }

  function handleSizeChange(event) {
    data.fetchVehicleWorkOrders(0, event.detail);
  }

  function handleAction(event) {
    const { type, data: rowData } = event.detail;
    if (type === 'execute') {
      selectedWorkOrder = rowData;
    }
  }

  async function handleExecute(event) {
    try {
      await data.executeVehicleWorkOrder(event.detail);
      const orderNumber = selectedWorkOrder?.order?.consecutive || '?????';
      addNotification({ id: Date.now(), text: `Orden ${orderNumber} ejecutada con éxito.` });
      selectedWorkOrder = null;
    } catch (e) {
      addNotification({ id: Date.now(), text: 'Error al ejecutar orden: ' + (e.message || 'Desconocido') });
    }
  }

  function handleCancelExecute() {
    selectedWorkOrder = null;
  }

  async function handleExport() {
    isExporting = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/order/vehicle/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ordenes_vehiculos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Órdenes de vehículos descargadas.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando órdenes de trabajo...</p>
      </div>
    {:else}
      <div class="vehicle-toolbar">
        <button type="button" class="vehicle-btn" on:click={() => data.fetchVehicleWorkOrders()}>
          Refrescar
        </button>
        <button type="button" class="vehicle-btn vehicle-btn--export" on:click={handleExport} disabled={isExporting}>
          {isExporting ? 'Descargando...' : 'Exportar Excel'}
        </button>
      </div>
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid
          columns={vehicleWorkOrderColumns}
          data={workOrderInfo.data}
          totalElements={workOrderInfo.totalElements}
          totalPages={workOrderInfo.totalPages}
          currentPage={workOrderInfo.currentPage}
          pageSize={workOrderInfo.pageSize}
          fixedLayout={false}
          on:pageChange={handlePageChange}
          on:sizeChange={handleSizeChange}
          on:action={handleAction}
        />
      </div>
    {/if}
  </div>
</div>

{#if selectedWorkOrder}
  <ExecuteOrderModal
    workOrder={selectedWorkOrder}
    on:execute={handleExecute}
    on:cancel={handleCancelExecute}
  />
{/if}
