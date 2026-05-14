<script>
  import { data } from '../../stores/data.js';
  import { addNotification } from '../../stores/ui.js';
  import TabPanel from '../shared/TabPanel.svelte';
  import WorkOrderManagement from './WorkOrderManagement.svelte';
  import VehicleOrderManagement from './VehicleOrderManagement.svelte';

  let isExportingVehiculos = false;
  let isExportingMotos = false;

  async function handleExportVehicleOrders(filename) {
    const exporting = filename.includes('moto') ? 'isExportingMotos' : 'isExportingVehiculos';
    if (exporting === 'isExportingMotos') isExportingMotos = true;
    else isExportingVehiculos = true;
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
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification({ id: Date.now(), text: 'Órdenes descargadas.' });
    } catch (e) {
      addNotification({ id: Date.now(), text: `Error al descargar: ${e.message}` });
    } finally {
      isExportingVehiculos = false;
      isExportingMotos = false;
    }
  }

  const tabs = [
    { id: 'maquinaria', label: 'Maquinaria' },
    { id: 'vehiculos',  label: 'Vehículos'  },
    { id: 'motos',      label: 'Motos'       },
  ];
  let activeTab = 'maquinaria';

  $: motoTypeIds = new Set(
    $data.vehicleTypes
      .filter(t => String(t?.name ?? '').toLowerCase().includes('moto'))
      .map(t => t.id)
  );

  function isMoto(row) {
    const v = row?.vehicle;
    if (v?.idTipoVehiculo != null && motoTypeIds.size > 0) {
      return motoTypeIds.has(v.idTipoVehiculo);
    }
    return String(v?.tipoVehiculo ?? '').toLowerCase().includes('moto');
  }

  $: vehicleOrders = $data.vehicleWorkOrders;
  $: vehiculosData = { ...vehicleOrders, data: (vehicleOrders.data ?? []).filter(r => !isMoto(r)) };
  $: motosData     = { ...vehicleOrders, data: (vehicleOrders.data ?? []).filter(r => isMoto(r)) };

  function handleTabChange(event) {
    activeTab = event.detail;
    if (activeTab === 'maquinaria' && $data.workOrders.data.length === 0) {
      data.fetchWorkOrders();
    }
    if ((activeTab === 'vehiculos' || activeTab === 'motos') && vehicleOrders.data.length === 0) {
      data.fetchVehicleWorkOrders();
    }
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} {activeTab} on:tabChange={handleTabChange}>
    {#if activeTab === 'maquinaria'}
      <WorkOrderManagement />
    {:else if activeTab === 'vehiculos'}
      <div class="tab-export-toolbar">
        <button class="vehicle-btn vehicle-btn--export"
          on:click={() => handleExportVehicleOrders('ordenes_vehiculos.xlsx')}
          disabled={isExportingVehiculos}>
          {isExportingVehiculos ? 'Descargando...' : 'Exportar Excel'}
        </button>
      </div>
      <VehicleOrderManagement overrideData={vehiculosData} />
    {:else if activeTab === 'motos'}
      <div class="tab-export-toolbar">
        <button class="vehicle-btn vehicle-btn--export"
          on:click={() => handleExportVehicleOrders('ordenes_motos.xlsx')}
          disabled={isExportingMotos}>
          {isExportingMotos ? 'Descargando...' : 'Exportar Excel'}
        </button>
      </div>
      <VehicleOrderManagement overrideData={motosData} />
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
  .tab-export-toolbar {
    display: flex;
    justify-content: flex-end;
    padding: 4px 8px 0;
  }
</style>
