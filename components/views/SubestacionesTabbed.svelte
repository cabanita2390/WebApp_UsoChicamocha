<script>
  import TabPanel from "../shared/TabPanel.svelte";
  import SubestacionesDashboard from "./SubestacionesDashboard.svelte";
  import SubestacionesResumenActividad from "./SubestacionesResumenActividad.svelte";
  import SubestacionesEjecuciones from "./SubestacionesEjecuciones.svelte";
  import { subestacionesActiveTab } from "../../stores/subestacionesFilters.js";

  const tabs = [
    { id: "dashboard", label: "Dashboard de Estaciones" },
    { id: "resumenActividad", label: "Resumen por Actividad" },
    { id: "ejecuciones", label: "Ejecuciones y Hallazgos" },
  ];

  function handleTabChange(event) {
    $subestacionesActiveTab = event.detail;
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} activeTab={$subestacionesActiveTab} on:tabChange={handleTabChange}>
    {#if $subestacionesActiveTab === "dashboard"}
      <SubestacionesDashboard />
    {:else if $subestacionesActiveTab === "resumenActividad"}
      <SubestacionesResumenActividad />
    {:else if $subestacionesActiveTab === "ejecuciones"}
      <SubestacionesEjecuciones />
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
