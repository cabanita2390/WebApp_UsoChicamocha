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

  function handleTabChange(event) {
    activeTab = event.detail;
    if (activeTab === 'maquinaria' && $data.workOrders.data.length === 0) {
      data.fetchWorkOrders();
    }
    if (activeTab === 'vehiculos' && $data.vehicleWorkOrders.data.length === 0) {
      data.fetchVehicleWorkOrders(0, 20, false);
    }
    if (activeTab === 'motos' && $data.motoWorkOrders.data.length === 0) {
      data.fetchVehicleWorkOrders(0, 20, true);
    }
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} {activeTab} on:tabChange={handleTabChange}>
    {#if activeTab === 'maquinaria'}
      <WorkOrderManagement />
    {:else if activeTab === 'vehiculos'}
      <VehicleOrderManagement soloMotos={false} />
    {:else if activeTab === 'motos'}
      <VehicleOrderManagement soloMotos={true} />
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
