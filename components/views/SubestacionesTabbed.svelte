<script>
  import TabPanel from "../shared/TabPanel.svelte";
  import DashboardEstaciones from "./subestaciones/dashboard/DashboardEstaciones.svelte";
  import ResumenActividad from "./subestaciones/resumen/ResumenActividad.svelte";
  import SubestacionesEjecuciones from "./SubestacionesEjecuciones.svelte";
  import CronogramaAnual from "./subestaciones/cronograma/CronogramaAnual.svelte";
  import { subestacionesActiveTab, pantallaAmpliada } from "../../stores/subestacionesFilters.js";

  const tabs = [
    { id: "dashboard", label: "Dashboard de Estaciones" },
    { id: "resumenActividad", label: "Resumen por Actividad" },
    { id: "ejecuciones", label: "Ejecuciones y Hallazgos" },
    { id: "cronograma", label: "Cronograma Anual" },
  ];

  function handleTabChange(event) {
    $subestacionesActiveTab = event.detail;
  }
</script>

<div class="tabbed-wrap">
  <TabPanel {tabs} activeTab={$subestacionesActiveTab} hideBar={$pantallaAmpliada} on:tabChange={handleTabChange}>
    {#if $subestacionesActiveTab === "dashboard"}
      <DashboardEstaciones />
    {:else if $subestacionesActiveTab === "resumenActividad"}
      <ResumenActividad />
    {:else if $subestacionesActiveTab === "ejecuciones"}
      <SubestacionesEjecuciones />
    {:else if $subestacionesActiveTab === "cronograma"}
      <CronogramaAnual />
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
