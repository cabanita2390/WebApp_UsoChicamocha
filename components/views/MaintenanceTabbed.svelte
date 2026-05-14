<script>
  import { data } from '../../stores/data.js';
  import { addNotification } from '../../stores/ui.js';
  import TabPanel from '../shared/TabPanel.svelte';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';
  import { maintenanceVehicleColumns, maintenanceMotoColumns } from '../../config/table-definitions.js';
  import { onMount } from 'svelte';

  const tabs = [
    { id: 'vehiculos', label: 'Vehículos' },
    { id: 'motos',     label: 'Motos'     },
  ];
  let activeTab = 'vehiculos';

  $: vehicleData = $data.vehicleMaintenance ?? [];
  $: motoData    = $data.motoMaintenance    ?? [];
  $: isLoading   = $data.isLoading;

  let isExportingVehicles = false;
  let isExportingMotos = false;

  onMount(() => {
    if (vehicleData.length === 0) data.fetchVehicleMaintenance();
  });

  async function handleExportVehicles() {
    isExportingVehicles = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/maintenance/vehicles/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mantenimiento_vehiculos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Mantenimiento de vehículos descargado.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExportingVehicles = false;
    }
  }

  async function handleExportMotos() {
    isExportingMotos = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/maintenance/motos/export`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!response.ok) throw new Error('Error al descargar el archivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mantenimiento_motos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Mantenimiento de motos descargado.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExportingMotos = false;
    }
  }

  function handleTabChange(event) {
    activeTab = event.detail;
    if (activeTab === 'vehiculos' && vehicleData.length === 0) {
      data.fetchVehicleMaintenance();
    }
    if (activeTab === 'motos' && motoData.length === 0) {
      data.fetchMotoMaintenance();
    }
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} {activeTab} on:tabChange={handleTabChange}>
    {#if activeTab === 'vehiculos'}
      <div class="vehicle-module">
        <div class="vehicle-module-inner">
          <div class="vehicle-toolbar">
            <button type="button" class="vehicle-btn" on:click={() => data.fetchVehicleMaintenance()}>
              Refrescar
            </button>
            <button type="button" class="vehicle-btn vehicle-btn--export" on:click={handleExportVehicles} disabled={isExportingVehicles}>
              {isExportingVehicles ? 'Descargando...' : 'Exportar Excel'}
            </button>
          </div>
          {#if isLoading}
            <div class="vehicle-loader">
              <Loader />
              <p>Cargando mantenimiento de vehículos...</p>
            </div>
          {:else if vehicleData.length === 0}
            <div class="vehicle-error">
              <p>No hay registros de mantenimiento de vehículos.</p>
            </div>
          {:else}
            <div class="vehicle-table-wrap vehicle-table-wrap--inset">
              <DataGrid
                columns={maintenanceVehicleColumns}
                data={vehicleData}
                totalElements={vehicleData.length}
                totalPages={1}
                currentPage={0}
                pageSize={Math.max(vehicleData.length, 1)}
                showPagination={false}
                fixedLayout={false}
              />
            </div>
          {/if}
        </div>
      </div>
    {:else if activeTab === 'motos'}
      <div class="vehicle-module">
        <div class="vehicle-module-inner">
          <div class="vehicle-toolbar">
            <button type="button" class="vehicle-btn" on:click={() => data.fetchMotoMaintenance()}>
              Refrescar
            </button>
            <button type="button" class="vehicle-btn vehicle-btn--export" on:click={handleExportMotos} disabled={isExportingMotos}>
              {isExportingMotos ? 'Descargando...' : 'Exportar Excel'}
            </button>
          </div>
          {#if isLoading}
            <div class="vehicle-loader">
              <Loader />
              <p>Cargando mantenimiento de motos...</p>
            </div>
          {:else if motoData.length === 0}
            <div class="vehicle-error">
              <p>No hay registros de mantenimiento de motos.</p>
            </div>
          {:else}
            <div class="vehicle-table-wrap vehicle-table-wrap--inset">
              <DataGrid
                columns={maintenanceMotoColumns}
                data={motoData}
                totalElements={motoData.length}
                totalPages={1}
                currentPage={0}
                pageSize={Math.max(motoData.length, 1)}
                showPagination={false}
                fixedLayout={false}
              />
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </TabPanel>
</div>

<style>
  .tabbed-wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
