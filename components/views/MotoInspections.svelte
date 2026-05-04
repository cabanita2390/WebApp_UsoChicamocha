<script>
  import { reportMotoColumns } from '../../config/table-definitions.js';
  import { data } from '../../stores/data.js';
  import DataGrid from '../shared/DataGrid.svelte';
  import Loader from '../shared/Loader.svelte';

  /** Refuerzo: una fila por placa (más reciente primero), por si el API devolviera duplicados por id vehículo. */
  function latestPerPlaca(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const sorted = [...rows].sort((a, b) => {
      const ta = a?.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
      const tb = b?.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
      return tb - ta;
    });
    const seen = new Set();
    const out = [];
    for (const r of sorted) {
      const raw = r?.placa != null ? String(r.placa).trim() : '';
      const key = raw ? raw.toUpperCase() : `id:${r?.idInspeccion ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }

  $: inspections = latestPerPlaca($data.motoInspections);
  $: isLoading = $data.isLoading;
  $: errorMessage = $data.error;
  $: total = Array.isArray(inspections) ? inspections.length : 0;

  async function handleRefresh() {
    await data.fetchMotoInspections();
  }
</script>

<div class="vehicle-module">
  <div class="vehicle-module-inner">
    <div class="vehicle-toolbar">
      <button type="button" class="vehicle-btn" on:click={handleRefresh}>Refrescar inspecciones</button>
    </div>

    {#if isLoading}
      <div class="vehicle-loader">
        <Loader />
        <p>Cargando inspecciones de motos...</p>
      </div>
    {:else if errorMessage}
      <div class="vehicle-error">
        <p><strong>Error:</strong> {errorMessage}</p>
      </div>
    {:else}
      <div class="vehicle-table-wrap vehicle-table-wrap--inset">
        <DataGrid
          columns={reportMotoColumns}
          data={inspections}
          fixedLayout={false}
          totalElements={total}
          totalPages={1}
          currentPage={0}
          pageSize={Math.max(total, 1)}
          showPagination={false}
        />
      </div>
    {/if}
  </div>
</div>
