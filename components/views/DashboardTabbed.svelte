<script>
  import { data } from '../../stores/data.js';
  import TabPanel from '../shared/TabPanel.svelte';
  import Dashboard from './Dashboard.svelte';
  import VehicleInspections from './VehicleInspections.svelte';
  import MotoInspections from './MotoInspections.svelte';

  const tabs = [
    { id: 'maquinaria', label: 'Maquinaria' },
    { id: 'vehiculos',  label: 'Vehículos'  },
    { id: 'motos',      label: 'Motos'       },
  ];
  let activeTab = 'maquinaria';

  function handleTabChange(event) {
    activeTab = event.detail;
    if (activeTab === 'vehiculos') {
      data.fetchVehicleInspections(0, 20, { reload: true });
    }
    if (activeTab === 'motos') {
      data.fetchMotoInspections();
    }
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} {activeTab} on:tabChange={handleTabChange}>
    {#if activeTab === 'maquinaria'}
      <Dashboard />
    {:else if activeTab === 'vehiculos'}
      <VehicleInspections />
    {:else if activeTab === 'motos'}
      <MotoInspections />
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
