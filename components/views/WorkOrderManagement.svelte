<script>
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import ExecuteOrderModal from '../shared/ExecuteOrderModal.svelte';
  import { workOrderColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import { addNotification } from '../../stores/ui.js';

  $: workOrderInfo = $data.workOrders;
  $: isLoading = $data.isLoading;

  let showExecuteModal = false;
  let orderToExecute = null;
  let isExecuting = false;

  function handlePageChange(event) {
    const newPage = event.detail;
    data.fetchWorkOrders(newPage, workOrderInfo.pageSize);
  }

  function handleSizeChange(event) {
    const newSize = event.detail;
    data.fetchWorkOrders(0, newSize);
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
      addNotification({ id: Date.now(), text: `Orden #${orderToExecute.order.id} ejecutada con éxito.` });
      showExecuteModal = false;
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al ejecutar la orden: ${e.message}` });
    } finally {
      isExecuting = false;
    }
  }

</script>

{#if isLoading}
  <div class="loader-container">
    <Loader />
    <p>Cargando órdenes de trabajo...</p>
  </div>
{:else}
  <div class="refresh-container">
    <button class="btn-refresh" on:click={() => data.fetchWorkOrders()}>
      Refrescar información
    </button>
  </div>
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
{/if}

{#if showExecuteModal}
  <ExecuteOrderModal 
    workOrder={orderToExecute} 
    isSubmitting={isExecuting}
    on:cancel={() => showExecuteModal = false}
    on:execute={handleExecuteOrder}
  />
{/if}

<style>
  .loader-container {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
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
  .btn-refresh:hover {
    background: linear-gradient(to bottom, #f0f0f0 0%, #d0d0d0 100%);
  }
</style>

