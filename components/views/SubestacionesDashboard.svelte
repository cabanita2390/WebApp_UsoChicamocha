<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import EstacionCumplimientoChart from "./EstacionCumplimientoChart.svelte";
  import { createEstacionesIndicadoresColumns, semaforoCumplimientoColor } from "../../config/table-definitions/substation.js";

  const COLOR_HEX = { green: "#1b5e20", yellow: "#e65100", red: "#c62828" };

  $: isLoading = $data.isLoading;
  $: estaciones = $data.substationIndicadoresPorEstacion ?? [];
  $: columns = createEstacionesIndicadoresColumns();

  $: totalProgramado = estaciones.reduce((acc, e) => acc + (Number(e.programado) || 0), 0);
  $: totalCumple = estaciones.reduce((acc, e) => acc + (Number(e.cumple) || 0), 0);
  $: totalNoProgramadas = estaciones.reduce((acc, e) => acc + (Number(e.ejecutadoNoProgramado) || 0), 0);
  $: pctGlobal = totalProgramado > 0 ? Math.round((totalCumple / totalProgramado) * 1000) / 10 : 0;
  $: colorPctGlobal = COLOR_HEX[semaforoCumplimientoColor(pctGlobal)];

  onMount(() => {
    data.fetchSubstationIndicadoresPorEstacion();
  });
</script>

<div class="dashboard">
  {#if isLoading && !estaciones.length}
    <div class="loader-wrap"><Loader /></div>
  {:else}
    <div class="kpi-card">
      <div class="kpi-section kpi-section--primary">
        <span class="kpi-label">Estaciones activas</span>
        <span class="kpi-value">{estaciones.length}</span>
      </div>
      <div class="kpi-section">
        <span class="kpi-label">% Cumplimiento global</span>
        <span class="kpi-value" style="color: {colorPctGlobal}">{pctGlobal}%</span>
        <span class="kpi-hint">Umbral: &gt;55% verde · 36-55% ámbar · &lt;35% rojo</span>
      </div>
      <div class="kpi-section">
        <span class="kpi-label">Programadas vs. cumplidas</span>
        <span class="kpi-value">{totalProgramado} / {totalCumple}</span>
      </div>
      <div class="kpi-section">
        <span class="kpi-label">Ejecuciones no programadas</span>
        <span class="kpi-value">{totalNoProgramadas}</span>
        <span class="kpi-hint">Trabajo real fuera del cronograma</span>
      </div>
    </div>

    <div class="section-card">
      <div class="section-title">% de cumplimiento por estación</div>
      <EstacionCumplimientoChart {estaciones} />
    </div>

    <div class="section-card table-card">
      <div class="section-title">Estaciones</div>
      {#if !estaciones.length}
        <p class="no-data">Sin estaciones registradas.</p>
      {:else}
        <DataGrid {columns} data={estaciones} totalElements={estaciones.length} showPagination={false} variant="modern" />
      {/if}
    </div>
  {/if}
</div>

<style>
  .dashboard {
    --surface: #ffffff;
    --page: #f7f7f6;
    --ink: #0b0b0b;
    --ink-secondary: #52514e;
    --ink-muted: #898781;
    --border: rgba(11, 11, 11, 0.08);
    --shadow: 0 1px 2px rgba(11, 11, 11, 0.04), 0 4px 12px rgba(11, 11, 11, 0.05);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--page);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .loader-wrap {
    display: flex;
    justify-content: center;
    padding: 40px;
  }
  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: var(--shadow);
    display: flex;
    flex-wrap: wrap;
  }
  .kpi-section {
    flex: 1;
    min-width: 190px;
    padding: 18px 22px;
    border-left: 1px solid #eee;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .kpi-section:first-child {
    border-left: none;
  }
  .kpi-section--primary {
    border-left: 4px solid #2a78d6;
  }
  .kpi-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .kpi-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  .kpi-hint {
    font-size: 10.5px;
    color: var(--ink-muted);
    line-height: 1.3;
  }
  .section-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow);
    padding: 18px 20px;
    min-width: 0;
  }
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 4px;
  }
  .section-sub {
    font-size: 11.5px;
    color: var(--ink-muted);
    margin-bottom: 14px;
  }
  .no-data {
    color: var(--ink-muted);
    font-size: 12px;
    margin: 0;
  }
</style>
