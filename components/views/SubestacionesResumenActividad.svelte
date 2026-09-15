<script>
  import { onMount } from "svelte";
  import { data } from "../../stores/data.js";
  import Loader from "../shared/Loader.svelte";
  import DataGrid from "../shared/DataGrid.svelte";
  import { createResumenActividadColumns } from "../../config/table-definitions/substation.js";

  $: isLoading = $data.isLoading;
  $: actividades = $data.substationResumenPorActividad ?? [];
  $: columns = createResumenActividadColumns();

  onMount(() => {
    data.fetchSubstationResumenPorActividad("CIVIL");
  });
</script>

<div class="resumen">
  <div class="filter-row">
    <div class="field">
      <span class="field-lab">Disciplina</span>
      <div class="disc-select">
        <svg class="lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>
        Civil (única habilitada)
      </div>
    </div>
  </div>

  {#if isLoading && !actividades.length}
    <div class="loader-wrap"><Loader /></div>
  {:else}
    <div class="section-card">
      <div class="section-title">Actividades — disciplina Civil</div>
      {#if !actividades.length}
        <p class="no-data">Sin actividades registradas para esta disciplina.</p>
      {:else}
        <DataGrid {columns} data={actividades} totalElements={actividades.length} showPagination={false} variant="modern" />
      {/if}
    </div>
  {/if}
</div>

<style>
  .resumen {
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
  .filter-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field-lab {
    font-weight: 500;
    font-size: 11px;
    color: var(--ink-secondary);
  }
  .disc-select {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border: 1px solid rgba(11, 11, 11, 0.12);
    border-radius: 8px;
    background: #f9fafb;
    font-size: 12px;
    color: var(--ink);
    width: fit-content;
  }
  .lock {
    width: 13px;
    height: 13px;
    color: var(--ink-muted);
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
  }
  .disc-hint {
    font-size: 10.5px;
    color: var(--ink-muted);
  }
  .loader-wrap {
    display: flex;
    justify-content: center;
    padding: 40px;
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
