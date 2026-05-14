<script>
  import { push } from 'svelte-spa-router';
  import { data } from '../../stores/data.js';
  import { addNotification } from '../../stores/ui.js';

  let isExportingVehicles = false;
  let isExportingMotos = false;

  async function handleExportVehicles() {
    isExportingVehicles = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/vehicle/monitoring/consolidated/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'consolidado_vehiculos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Consolidado de vehículos descargado.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExportingVehicles = false;
    }
  }

  async function handleExportMotos() {
    isExportingMotos = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/moto/monitoring/consolidated/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'consolidado_motos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Consolidado de motos descargado.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExportingMotos = false;
    }
  }
  import TabPanel from '../shared/TabPanel.svelte';
  import Consolidado from './Consolidado.svelte';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import DocumentUpdateModal from '../shared/DocumentUpdateModal.svelte';
  import { consolidadoVehicleColumns, consolidadoMotoColumns } from '../../config/table-definitions.js';
  import { normalizePlaca } from '@/lib/textFormat.js';

  const tabs = [
    { id: 'maquinaria', label: 'Maquinaria' },
    { id: 'vehiculos',  label: 'Vehículos'  },
    { id: 'motos',      label: 'Motos'       },
  ];
  let activeTab = 'maquinaria';

  $: vehicleData = $data.vehicleMonitoring ?? [];
  $: motoData    = $data.motoMonitoring    ?? [];
  $: isLoading   = $data.isLoading;

  // --- modal state ---
  let docModalOpen = false;
  let actionRow = null;
  let docVehicleId = null;
  let modalSubmitting = false;

  function resetModal() {
    docModalOpen = false;
    actionRow = null;
    docVehicleId = null;
    modalSubmitting = false;
  }

  async function openDocModal(row) {
    actionRow = row;
    try {
      const v = await data.getVehicleByPlaca(row.placa);
      docVehicleId = v?.id ?? null;
      if (docVehicleId == null) throw new Error('No se encontró el vehículo.');
      docModalOpen = true;
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'No se pudo cargar el vehículo.' });
      actionRow = null;
    }
  }

  async function handleDocSubmit(ev) {
    const { tipoDocumento, fechaVencimiento, file } = ev.detail;
    if (!docVehicleId || !fechaVencimiento) return;
    modalSubmitting = true;
    try {
      if (file) {
        await data.uploadVehicleDocumentFile({
          idVehiculo: docVehicleId,
          tipoDocumento,
          fechaVencimiento,
          file,
        });
      } else {
        await data.updateVehicleDocument({ idVehiculo: docVehicleId, tipoDocumento, fechaVencimiento });
      }
      addNotification({ id: Date.now(), text: 'Documentación actualizada.' });
      resetModal();
      if (activeTab === 'vehiculos') await data.fetchVehicleMonitoring();
      else if (activeTab === 'motos') await data.fetchMotoMonitoring();
    } catch (e) {
      addNotification({ id: Date.now(), text: e.message || 'Error al guardar.' });
      modalSubmitting = false;
    }
  }

  function handleGridAction(ev) {
    const { type, data: row } = ev.detail;
    if (type === 'monitoring_update_docs') openDocModal(row);
    else if (type === 'monitoring_oil_history')
      push(`/vehicle-oil-history/${encodeURIComponent(normalizePlaca(row.placa))}`);
  }

  // --- tab switching ---
  function handleTabChange(event) {
    activeTab = event.detail;
    if (activeTab === 'maquinaria' && $data.consolidated.distrito.length === 0 && $data.consolidated.asociacion.length === 0) {
      data.fetchConsolidadoData();
    }
    if (activeTab === 'vehiculos' && vehicleData.length === 0) {
      data.fetchVehicleMonitoring();
    }
    if (activeTab === 'motos' && motoData.length === 0) {
      data.fetchMotoMonitoring();
    }
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} {activeTab} on:tabChange={handleTabChange}>
    {#if activeTab === 'maquinaria'}
      <Consolidado />
    {:else if activeTab === 'vehiculos'}
      <div class="vehicle-module">
        <div class="vehicle-module-inner">
          <div class="vehicle-toolbar">
            <button class="vehicle-btn" on:click={() => data.fetchVehicleMonitoring()}>
              Refrescar
            </button>
            <button class="vehicle-btn vehicle-btn--export" on:click={handleExportVehicles} disabled={isExportingVehicles}>
              {isExportingVehicles ? 'Descargando...' : 'Exportar Excel'}
            </button>
          </div>
          {#if isLoading}
            <div class="vehicle-loader">
              <Loader />
              <p>Cargando consolidado de vehículos...</p>
            </div>
          {:else}
            <div class="vehicle-table-wrap vehicle-table-wrap--inset">
              <DataGrid
                columns={consolidadoVehicleColumns}
                data={vehicleData}
                totalElements={vehicleData.length}
                totalPages={1}
                currentPage={0}
                pageSize={Math.max(vehicleData.length, 1)}
                showPagination={false}
                fixedLayout={false}
                on:action={handleGridAction}
              />
            </div>
          {/if}
        </div>
      </div>
    {:else if activeTab === 'motos'}
      <div class="vehicle-module">
        <div class="vehicle-module-inner">
          <div class="vehicle-toolbar">
            <button class="vehicle-btn" on:click={() => data.fetchMotoMonitoring()}>
              Refrescar
            </button>
            <button class="vehicle-btn vehicle-btn--export" on:click={handleExportMotos} disabled={isExportingMotos}>
              {isExportingMotos ? 'Descargando...' : 'Exportar Excel'}
            </button>
          </div>
          {#if isLoading}
            <div class="vehicle-loader">
              <Loader />
              <p>Cargando consolidado de motos...</p>
            </div>
          {:else}
            <div class="vehicle-table-wrap vehicle-table-wrap--inset">
              <DataGrid
                columns={consolidadoMotoColumns}
                data={motoData}
                totalElements={motoData.length}
                totalPages={1}
                currentPage={0}
                pageSize={Math.max(motoData.length, 1)}
                showPagination={false}
                fixedLayout={false}
                on:action={handleGridAction}
              />
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </TabPanel>
</div>

{#if docModalOpen && actionRow}
  {#key actionRow.placa}
    <DocumentUpdateModal
      placa={actionRow.placa}
      soatVencimiento={actionRow.soat?.fechaVencimiento}
      tecnoVencimiento={actionRow.tecno?.fechaVencimiento}
      isSubmitting={modalSubmitting}
      on:submit={handleDocSubmit}
      on:cancel={resetModal}
    />
  {/key}
{/if}

<style>
  .tabbed-wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
