<script>
  // Ensamblaje incremental (Tasks 18-23) — mismo patrón que WorkOrdersTabbed.svelte:
  // un TabPanel + componentes hijos, sin duplicar markup entre pestañas. Cada Task
  // agrega su pestaña aquí a medida que se construye; Task 24 la deja completa (6).
  import TabPanel from "../shared/TabPanel.svelte";
  import FuelFinancialDashboard from "./FuelFinancialDashboard.svelte";
  import RefuelingManagement from "./RefuelingManagement.svelte";
  import FuelPurchaseManagement from "./FuelPurchaseManagement.svelte";
  import FuelWarehouseControl from "./FuelWarehouseControl.svelte";
  import FuelPerformance from "./FuelPerformance.svelte";
  import FuelDistribution from "./FuelDistribution.svelte";

  const tabs = [
    { id: "dashboard", label: "Dashboard Financiero" },
    { id: "rendimiento", label: "Rendimiento" },
    { id: "distribucion", label: "Distribución" },
    { id: "almacen", label: "Control de Almacén" },
    { id: "suministro", label: "Suministro de Almacén" },
    { id: "tanqueo", label: "Tanqueo" },
  ];
  let activeTab = "dashboard";

  function handleTabChange(event) {
    activeTab = event.detail;
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} {activeTab} on:tabChange={handleTabChange}>
    {#if activeTab === "dashboard"}
      <FuelFinancialDashboard />
    {:else if activeTab === "tanqueo"}
      <RefuelingManagement />
    {:else if activeTab === "almacen"}
      <FuelWarehouseControl />
    {:else if activeTab === "suministro"}
      <FuelPurchaseManagement />
    {:else if activeTab === "rendimiento"}
      <FuelPerformance />
    {:else if activeTab === "distribucion"}
      <FuelDistribution />
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
