<script>
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import ExecuteOrderModal from '../shared/ExecuteOrderModal.svelte';
  import { workOrderColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { addNotification } from '../../stores/ui.js';
  import { download } from '../../stores/api.js';

  $: workOrderInfo = $data.workOrders;
  $: isLoading = $data.isLoading;

  let showExecuteModal = false;
  let orderToExecute = null;
  let isExecuting = false;
  let isExporting = false;

  async function handleExport() {
    isExporting = true;
    try {
      await download('order/export', 'ordenes_maquinaria.xlsx');
      addNotification({ id: Date.now(), text: 'Órdenes de maquinaria descargadas.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExporting = false;
    }
  }

  function handlePageChange(event) {
    data.fetchWorkOrders(event.detail, workOrderInfo.pageSize);
  }

  function handleSizeChange(event) {
    data.fetchWorkOrders(0, event.detail);
  }

  function handleAction(event) {
    const { type, data: orderData } = event.detail;
    if (type === 'execute') {
      orderToExecute = orderData;
      showExecuteModal = true;
    }
  }

  async function handleExecuteOrder(event) {
    isExecuting = true;
    try {
      await data.executeWorkOrder(event.detail);
      const orderNumber = orderToExecute.order.consecutive || '?????';
      addNotification({ id: Date.now(), text: `Orden ${orderNumber} ejecutada con éxito.` });
      showExecuteModal = false;
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al ejecutar la orden: ${e.message}` });
    } finally {
      isExecuting = false;
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
        <button type="button" class="vehicle-btn" on:click={() => data.fetchWorkOrders()}>
          Refrescar
        </button>
        <button type="button" class="vehicle-btn vehicle-btn--export" on:click={handleExport} disabled={isExporting}>
          {isExporting ? 'Descargando...' : 'Exportar Excel'}
        </button>
      </div>
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid
          columns={workOrderColumns}
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

{#if showExecuteModal}
  <ExecuteOrderModal
    workOrder={orderToExecute}
    isSubmitting={isExecuting}
    on:cancel={() => showExecuteModal = false}
    on:execute={handleExecuteOrder}
  />
{/if}
