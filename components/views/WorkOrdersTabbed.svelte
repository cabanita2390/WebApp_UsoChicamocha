<script>
  import { data } from '../../stores/data.js';
  import TabPanel from '../shared/TabPanel.svelte';
  import WorkOrderManagement from './WorkOrderManagement.svelte';
  import VehicleOrderManagement from './VehicleOrderManagement.svelte';

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
      <VehicleOrderManagement overrideData={vehiculosData} />
    {:else if activeTab === 'motos'}
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
