<script>
  import { data } from '../../stores/data.js';
  import TabPanel from '../shared/TabPanel.svelte';
  import MachineManagement from './MachineManagement.svelte';
  import VehicleManagement from './VehicleManagement.svelte';
  import MotoManagement from './MotoManagement.svelte';

  const tabs = [
    { id: 'maquinaria', label: 'Maquinaria' },
    { id: 'vehiculos',  label: 'Vehículos'  },
    { id: 'motos',      label: 'Motos'       },
  ];
  let activeTab = 'maquinaria';

  function handleTabChange(event) {
    activeTab = event.detail;
    if (activeTab === 'maquinaria' && $data.machines.length === 0) {
      data.fetchMachines();
    }
    if (activeTab === 'vehiculos' && $data.vehicles.length === 0) {
      data.fetchVehicles();
    }
    if (activeTab === 'motos' && $data.motos.length === 0) {
      data.fetchMotos();
    }
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} {activeTab} on:tabChange={handleTabChange}>
    {#if activeTab === 'maquinaria'}
      <MachineManagement />
    {:else if activeTab === 'vehiculos'}
      <VehicleManagement />
    {:else if activeTab === 'motos'}
      <MotoManagement />
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
