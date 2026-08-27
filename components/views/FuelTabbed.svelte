<script>
  // Rediseño (mockup "Combustibles (sin almacén)"): 3 pestañas, siguiendo el
  // TabPanel + componentes hijos de siempre. Suministro de Almacén y Control de
  // Almacén quedan ocultos aquí (decisión del rediseño, no borrados — sus
  // componentes y rutas de backend siguen intactos por si se retoman). Tanqueo y
  // Distribución se fusionaron en TanqueoDistribucion.svelte.
  import TabPanel from "../shared/TabPanel.svelte";
  import FuelFinancialDashboard from "./FuelFinancialDashboard.svelte";
  import FuelPerformance from "./FuelPerformance.svelte";
  import TanqueoDistribucion from "./TanqueoDistribucion.svelte";
  import { fuelActiveTab } from "../../stores/fuelFilters.js";

  const tabs = [
    { id: "dashboard", label: "Dashboard Financiero" },
    { id: "rendimiento", label: "Rendimiento" },
    { id: "tanqueoDistribucion", label: "Tanqueo y Distribución" },
  ];

  function handleTabChange(event) {
    $fuelActiveTab = event.detail;
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} activeTab={$fuelActiveTab} on:tabChange={handleTabChange}>
    {#if $fuelActiveTab === "dashboard"}
      <FuelFinancialDashboard />
    {:else if $fuelActiveTab === "rendimiento"}
      <FuelPerformance />
    {:else if $fuelActiveTab === "tanqueoDistribucion"}
      <TanqueoDistribucion />
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
